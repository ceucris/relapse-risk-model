from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

import numpy as np

from recovery.domain.enums import SignalType
from recovery.domain.models import BehavioralEvent
from recovery.model.features import FEATURE_NAMES, FeatureVector, extract_features


def _sigmoid(x: float) -> float:
    # Numerically stable sigmoid
    if x >= 0:
        z = np.exp(-x)
        return float(1.0 / (1.0 + z))
    z = np.exp(x)
    return float(z / (1.0 + z))


@dataclass
class PersonalizedBehavioralModel:
    """
    Per-user online logistic model of relapse / high-craving risk.

    Learns two layers of personalization:
    1. Cue→craving affinity table (associative strengths from co-occurrence)
    2. Linear weights over contextual features (time, recent intensity, mood, etc.)

    Designed to improve with every labeled observation (online SGD).
    """

    user_id: str
    learning_rate: float = 0.08
    l2: float = 0.001
    weights: np.ndarray = field(
        default_factory=lambda: np.zeros(len(FEATURE_NAMES), dtype=np.float64)
    )
    cue_craving: dict[str, float] = field(default_factory=dict)
    craving_reward: dict[str, float] = field(default_factory=dict)
    cue_counts: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    observations: int = 0
    version: int = 0
    # Running calibration of prediction error (lower = more accurate historically)
    mean_abs_error: float = 0.5

    def affinity_for_cues(self, cues: list[str]) -> float:
        if not cues:
            return 0.0
        scores = [self.cue_craving.get(c.lower(), 0.2) for c in cues]
        return float(sum(scores) / len(scores))

    def _update_associations(self, history: list[BehavioralEvent], event: BehavioralEvent) -> None:
        """Update cue–craving–reward co-occurrence strengths."""
        window = timedelta(hours=2)
        recent = [
            e
            for e in history
            if e.occurred_at <= event.occurred_at
            and event.occurred_at - e.occurred_at <= window
        ]

        if event.signal_type == SignalType.CRAVING:
            for cue in recent:
                if cue.signal_type != SignalType.CUE:
                    continue
                key = cue.label.lower()
                self.cue_counts[key] = self.cue_counts.get(key, 0) + 1
                # Intensity-weighted associative update
                prev = self.cue_craving.get(key, 0.2)
                target = max(prev, event.intensity)
                self.cue_craving[key] = float(
                    prev + 0.25 * (target - prev) * (0.5 + cue.intensity / 2.0)
                )

        if event.signal_type == SignalType.REWARD:
            for craving in recent:
                if craving.signal_type != SignalType.CRAVING:
                    continue
                key = craving.label.lower()
                prev = self.craving_reward.get(key, 0.2)
                self.craving_reward[key] = float(
                    prev + 0.3 * (event.intensity - prev)
                )

        if event.signal_type == SignalType.COPE:
            # Protective behaviors slightly decay cue affinities for nearby cues
            for cue in recent:
                if cue.signal_type != SignalType.CUE:
                    continue
                key = cue.label.lower()
                if key in self.cue_craving:
                    self.cue_craving[key] = float(
                        max(0.05, self.cue_craving[key] * 0.97)
                    )

    def observe(
        self,
        event: BehavioralEvent,
        history: list[BehavioralEvent],
        *,
        label_high_risk: bool | None = None,
    ) -> dict[str, Any]:
        """
        Ingest one behavioral event and optionally update risk weights.

        If label_high_risk is None, a proxy label is derived:
        strong craving or reward after cue → positive; cope after cue → negative.
        """
        self._update_associations(history, event)

        cues = [
            e.label
            for e in history[-20:]
            if e.signal_type == SignalType.CUE
        ]
        affinity = self.affinity_for_cues(cues)
        features = extract_features(
            event.occurred_at,
            history + [event],
            cue_craving_affinity=affinity,
        )

        if label_high_risk is None:
            label_high_risk = self._proxy_label(event, history)

        pred = self.predict_proba(features)
        y = 1.0 if label_high_risk else 0.0
        error = pred - y

        # Online logistic regression with L2
        grad = error * features.values + self.l2 * self.weights
        self.weights -= self.learning_rate * grad
        self.observations += 1
        self.version += 1

        # Exponential moving average of absolute error → confidence signal
        self.mean_abs_error = 0.9 * self.mean_abs_error + 0.1 * abs(error)

        return {
            "prediction": pred,
            "label": y,
            "error": abs(error),
            "observations": self.observations,
            "version": self.version,
            "top_cues": self.top_risk_cues(5),
        }

    def _proxy_label(
        self, event: BehavioralEvent, history: list[BehavioralEvent]
    ) -> bool:
        if event.signal_type == SignalType.CRAVING and event.intensity >= 0.65:
            return True
        if event.signal_type == SignalType.REWARD and event.intensity >= 0.5:
            return True
        if event.signal_type == SignalType.COPE:
            return False
        # Cue alone: look ahead isn't available; use affinity prior
        if event.signal_type == SignalType.CUE:
            return self.cue_craving.get(event.label.lower(), 0.2) >= 0.6
        return False

    def predict_proba(self, features: FeatureVector) -> float:
        logit = float(np.dot(self.weights, features.values))
        return _sigmoid(logit)

    def predict_from_history(
        self, now: datetime, history: list[BehavioralEvent]
    ) -> tuple[float, FeatureVector, list[str]]:
        recent_cues = [
            e.label
            for e in history
            if e.signal_type == SignalType.CUE
            and now - e.occurred_at <= timedelta(hours=6)
        ]
        affinity = self.affinity_for_cues(recent_cues)
        features = extract_features(
            now, history, cue_craving_affinity=affinity
        )
        score = self.predict_proba(features)
        drivers = self.explain(features, recent_cues)
        return score, features, drivers

    def explain(
        self, features: FeatureVector, recent_cues: list[str]
    ) -> list[str]:
        labels = {
            "hour_sin": "time of day",
            "hour_cos": "time of day",
            "dow_sin": "day of week",
            "dow_cos": "day of week",
            "recent_cue_intensity": "recent triggers",
            "recent_craving_intensity": "recent craving intensity",
            "recent_reward_count": "recent use/reward",
            "recent_cope_count": "recent coping",
            "mood_level": "mood",
            "hours_since_last_craving": "craving recency",
            "cue_craving_affinity": "personal cue patterns",
            "bias": "baseline risk",
        }
        contributions = features.values * self.weights
        ranked = sorted(
            zip(FEATURE_NAMES, contributions),
            key=lambda x: abs(x[1]),
            reverse=True,
        )
        drivers: list[str] = []
        seen: set[str] = set()
        for name, contrib in ranked[:6]:
            if abs(contrib) < 0.02 and name != "cue_craving_affinity":
                continue
            label = labels.get(name, name)
            if label in seen:
                continue
            seen.add(label)
            direction = "elevates" if contrib > 0 else "reduces"
            drivers.append(f"{label} {direction} risk")
        for cue in recent_cues[:3]:
            aff = self.cue_craving.get(cue.lower(), 0.0)
            if aff >= 0.4:
                drivers.append(f"personal cue '{cue}' (affinity={aff:.2f})")
        return drivers[:6]

    def top_risk_cues(self, n: int = 5) -> list[dict[str, float | str]]:
        items = sorted(
            self.cue_craving.items(), key=lambda kv: kv[1], reverse=True
        )
        return [{"cue": k, "affinity": round(v, 3)} for k, v in items[:n]]

    def confidence(self) -> float:
        """Higher with more observations and lower recent error."""
        data_factor = 1.0 - np.exp(-self.observations / 25.0)
        accuracy_factor = 1.0 - min(1.0, self.mean_abs_error)
        return float(np.clip(0.55 * data_factor + 0.45 * accuracy_factor, 0.0, 1.0))

    def to_state(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "learning_rate": self.learning_rate,
            "l2": self.l2,
            "weights": self.weights.tolist(),
            "cue_craving": dict(self.cue_craving),
            "craving_reward": dict(self.craving_reward),
            "cue_counts": dict(self.cue_counts),
            "observations": self.observations,
            "version": self.version,
            "mean_abs_error": self.mean_abs_error,
        }

    @classmethod
    def from_state(cls, state: dict[str, Any]) -> PersonalizedBehavioralModel:
        model = cls(
            user_id=state["user_id"],
            learning_rate=state.get("learning_rate", 0.08),
            l2=state.get("l2", 0.001),
        )
        model.weights = np.array(state["weights"], dtype=np.float64)
        model.cue_craving = dict(state.get("cue_craving", {}))
        model.craving_reward = dict(state.get("craving_reward", {}))
        model.cue_counts = defaultdict(int, state.get("cue_counts", {}))
        model.observations = int(state.get("observations", 0))
        model.version = int(state.get("version", 0))
        model.mean_abs_error = float(state.get("mean_abs_error", 0.5))
        return model
