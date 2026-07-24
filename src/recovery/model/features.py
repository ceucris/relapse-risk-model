from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Iterable

import numpy as np

from recovery.domain.enums import SignalType
from recovery.domain.models import BehavioralEvent

# Fixed feature layout so each user model shares a compatible vector space.
FEATURE_NAMES: list[str] = [
    "hour_sin",
    "hour_cos",
    "dow_sin",
    "dow_cos",
    "recent_cue_intensity",
    "recent_craving_intensity",
    "recent_reward_count",
    "recent_cope_count",
    "mood_level",
    "hours_since_last_craving",
    "cue_craving_affinity",  # personalized prior injected at predict time
    "bias",
]


@dataclass
class FeatureVector:
    values: np.ndarray
    names: list[str] = field(default_factory=lambda: list(FEATURE_NAMES))

    def as_dict(self) -> dict[str, float]:
        return {n: float(v) for n, v in zip(self.names, self.values)}


def _circ_time(dt: datetime) -> tuple[float, float, float, float]:
    hour = dt.hour + dt.minute / 60.0
    hour_sin = float(np.sin(2 * np.pi * hour / 24.0))
    hour_cos = float(np.cos(2 * np.pi * hour / 24.0))
    dow = dt.weekday()
    dow_sin = float(np.sin(2 * np.pi * dow / 7.0))
    dow_cos = float(np.cos(2 * np.pi * dow / 7.0))
    return hour_sin, hour_cos, dow_sin, dow_cos


def _mean_intensity(events: Iterable[BehavioralEvent], signal: SignalType) -> float:
    matched = [e.intensity for e in events if e.signal_type == signal]
    if not matched:
        return 0.0
    return float(sum(matched) / len(matched))


def _count(events: Iterable[BehavioralEvent], signal: SignalType) -> float:
    return float(sum(1 for e in events if e.signal_type == signal))


def extract_features(
    now: datetime,
    history: list[BehavioralEvent],
    *,
    lookback_hours: float = 6.0,
    cue_craving_affinity: float = 0.0,
) -> FeatureVector:
    """Build a fixed-length feature vector from recent behavioral history."""
    cutoff = now - timedelta(hours=lookback_hours)
    recent = [e for e in history if e.occurred_at >= cutoff]

    hour_sin, hour_cos, dow_sin, dow_cos = _circ_time(now)
    craving_events = [e for e in history if e.signal_type == SignalType.CRAVING]
    if craving_events:
        last = max(craving_events, key=lambda e: e.occurred_at)
        hours_since = max(
            0.0, (now - last.occurred_at).total_seconds() / 3600.0
        )
        # Cap & invert so recent craving → higher feature value
        hours_since_feat = float(np.exp(-hours_since / 12.0))
    else:
        hours_since_feat = 0.0

    mood_events = [e for e in recent if e.signal_type == SignalType.MOOD]
    mood_level = (
        float(sum(e.intensity for e in mood_events) / len(mood_events))
        if mood_events
        else 0.5
    )

    values = np.array(
        [
            hour_sin,
            hour_cos,
            dow_sin,
            dow_cos,
            _mean_intensity(recent, SignalType.CUE),
            _mean_intensity(recent, SignalType.CRAVING),
            min(1.0, _count(recent, SignalType.REWARD) / 3.0),
            min(1.0, _count(recent, SignalType.COPE) / 3.0),
            mood_level,
            hours_since_feat,
            float(np.clip(cue_craving_affinity, 0.0, 1.0)),
            1.0,  # bias
        ],
        dtype=np.float64,
    )
    return FeatureVector(values=values)
