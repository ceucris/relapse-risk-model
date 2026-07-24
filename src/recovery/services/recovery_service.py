from __future__ import annotations

from datetime import datetime
from typing import Any

from recovery.agent.conversation import ConversationalAgent
from recovery.agent.outreach import OutreachOrchestrator
from recovery.domain.enums import SignalType
from recovery.domain.models import (
    BehavioralEvent,
    CheckInSession,
    CounselorEscalation,
    RiskForecast,
    UserProfile,
    utcnow,
)
from recovery.model.risk import RiskWindowEngine
from recovery.storage.memory import InMemoryStore


class RecoveryService:
    """Application service wiring model learning ↔ agentic outreach."""

    def __init__(self, store: InMemoryStore | None = None) -> None:
        self.store = store or InMemoryStore()
        self.risk_engine = RiskWindowEngine()
        self.agent = ConversationalAgent()
        self.outreach = OutreachOrchestrator(
            risk_engine=self.risk_engine, agent=self.agent
        )

    def register_user(
        self,
        display_name: str,
        *,
        substances_or_behaviors: list[str] | None = None,
        known_cues: list[str] | None = None,
        protective_factors: list[str] | None = None,
        counselor_id: str | None = None,
        timezone: str = "UTC",
    ) -> UserProfile:
        user = UserProfile(
            display_name=display_name,
            substances_or_behaviors=substances_or_behaviors or [],
            known_cues=known_cues or [],
            protective_factors=protective_factors or [],
            counselor_id=counselor_id,
            timezone=timezone,
        )
        return self.store.upsert_user(user)

    def log_event(
        self,
        user_id: str,
        signal_type: SignalType | str,
        label: str,
        *,
        intensity: float = 0.5,
        occurred_at: datetime | None = None,
        context: dict[str, Any] | None = None,
        related_event_id: str | None = None,
        label_high_risk: bool | None = None,
    ) -> dict[str, Any]:
        user = self.store.get_user(user_id)
        if isinstance(signal_type, str):
            signal_type = SignalType(signal_type)

        event = BehavioralEvent(
            user_id=user_id,
            signal_type=signal_type,
            label=label,
            intensity=intensity,
            occurred_at=occurred_at or utcnow(),
            context=context or {},
            related_event_id=related_event_id,
        )
        history = self.store.list_events(user_id)
        model = self.store.get_model(user_id)
        learn_stats = model.observe(
            event, history, label_high_risk=label_high_risk
        )
        self.store.add_event(event)

        user.model_observations = model.observations
        user.model_version = model.version
        self.store.upsert_user(user)

        return {"event": event, "learning": learn_stats}

    def forecast(
        self, user_id: str, *, now: datetime | None = None
    ) -> list[RiskForecast]:
        model = self.store.get_model(user_id)
        history = self.store.list_events(user_id)
        return self.risk_engine.forecast(model, history, now=now)

    def run_outreach_cycle(
        self, user_id: str, *, now: datetime | None = None
    ) -> dict[str, Any]:
        user = self.store.get_user(user_id)
        model = self.store.get_model(user_id)
        history = self.store.list_events(user_id)
        active = [
            s
            for s in self.store.list_sessions(user_id)
            if s.status.value == "active"
        ]
        forecast, session = self.outreach.evaluate(
            user, model, history, now=now, active_sessions=active
        )
        if session is not None:
            self.store.save_session(session)
        return {
            "forecast": forecast,
            "session": session,
            "outreach_triggered": session is not None,
        }

    def reply(
        self, session_id: str, message: str
    ) -> tuple[CheckInSession, CounselorEscalation | None]:
        session = self.store.get_session(session_id)
        user = self.store.get_user(session.user_id)
        risk_level = self._current_risk_level(user.user_id)
        session, escalation = self.agent.respond(
            session, user, message, risk_level=risk_level
        )
        self.store.save_session(session)
        if escalation is not None:
            self.store.save_escalation(escalation)
        return session, escalation

    def model_insights(self, user_id: str) -> dict[str, Any]:
        model = self.store.get_model(user_id)
        user = self.store.get_user(user_id)
        return {
            "user_id": user_id,
            "display_name": user.display_name,
            "observations": model.observations,
            "version": model.version,
            "confidence": round(model.confidence(), 3),
            "mean_abs_error": round(model.mean_abs_error, 3),
            "top_risk_cues": model.top_risk_cues(8),
            "craving_reward_links": [
                {"craving": k, "reward_strength": round(v, 3)}
                for k, v in sorted(
                    model.craving_reward.items(),
                    key=lambda kv: kv[1],
                    reverse=True,
                )[:8]
            ],
        }

    def _current_risk_level(self, user_id: str):
        forecasts = self.forecast(user_id)
        if not forecasts:
            from recovery.domain.enums import RiskLevel

            return RiskLevel.MODERATE
        return max(forecasts[:3], key=lambda f: f.risk_score).risk_level
