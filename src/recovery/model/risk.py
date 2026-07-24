from __future__ import annotations

from datetime import datetime, timedelta

from recovery.domain.enums import RiskLevel
from recovery.domain.models import BehavioralEvent, RiskForecast, utcnow
from recovery.model.personalized import PersonalizedBehavioralModel


def score_to_level(score: float) -> RiskLevel:
    if score >= 0.85:
        return RiskLevel.CRITICAL
    if score >= 0.65:
        return RiskLevel.HIGH
    if score >= 0.4:
        return RiskLevel.MODERATE
    return RiskLevel.LOW


class RiskWindowEngine:
    """
    Scans upcoming hours and emits high-risk windows for the agentic layer.

    Uses the personalized model plus simple circadian priors from learned
    cue affinities / historical craving times when available.
    """

    def __init__(
        self,
        *,
        horizon_hours: int = 12,
        step_hours: int = 1,
        window_hours: int = 2,
        outreach_threshold: float = 0.65,
    ) -> None:
        self.horizon_hours = horizon_hours
        self.step_hours = step_hours
        self.window_hours = window_hours
        self.outreach_threshold = outreach_threshold

    def forecast(
        self,
        model: PersonalizedBehavioralModel,
        history: list[BehavioralEvent],
        *,
        now: datetime | None = None,
    ) -> list[RiskForecast]:
        now = now or utcnow()
        forecasts: list[RiskForecast] = []

        for offset in range(0, self.horizon_hours, self.step_hours):
            window_start = now + timedelta(hours=offset)
            window_end = window_start + timedelta(hours=self.window_hours)
            score, _, drivers = model.predict_from_history(window_start, history)
            # Mild boost when scanning hours that historically had cravings
            score = min(1.0, score + self._temporal_prior(history, window_start))
            forecasts.append(
                RiskForecast(
                    user_id=model.user_id,
                    window_start=window_start,
                    window_end=window_end,
                    risk_score=round(score, 4),
                    risk_level=score_to_level(score),
                    top_drivers=drivers,
                    model_confidence=model.confidence(),
                )
            )
        return forecasts

    def high_risk_windows(
        self,
        model: PersonalizedBehavioralModel,
        history: list[BehavioralEvent],
        *,
        now: datetime | None = None,
    ) -> list[RiskForecast]:
        return [
            f
            for f in self.forecast(model, history, now=now)
            if f.risk_score >= self.outreach_threshold
        ]

    def _temporal_prior(
        self, history: list[BehavioralEvent], at: datetime
    ) -> float:
        craving_hours = [
            e.occurred_at.hour
            for e in history
            if e.signal_type.value == "craving" and e.intensity >= 0.5
        ]
        if len(craving_hours) < 3:
            return 0.0
        # Fraction of historical cravings near this hour (±1h)
        near = sum(1 for h in craving_hours if abs(h - at.hour) <= 1 or abs(h - at.hour) >= 23)
        return 0.08 * (near / len(craving_hours))
