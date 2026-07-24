from __future__ import annotations

from datetime import datetime, timedelta

from recovery.agent.conversation import ConversationalAgent
from recovery.domain.enums import SessionStatus
from recovery.domain.models import (
    BehavioralEvent,
    CheckInSession,
    RiskForecast,
    UserProfile,
    utcnow,
)
from recovery.model.personalized import PersonalizedBehavioralModel
from recovery.model.risk import RiskWindowEngine


class OutreachOrchestrator:
    """
    Agentic layer entrypoint: watch risk forecasts and open
    conversational check-ins during predicted high-risk windows.
    """

    def __init__(
        self,
        risk_engine: RiskWindowEngine | None = None,
        agent: ConversationalAgent | None = None,
        *,
        cooldown: timedelta = timedelta(hours=3),
    ) -> None:
        self.risk_engine = risk_engine or RiskWindowEngine()
        self.agent = agent or ConversationalAgent()
        self.cooldown = cooldown
        self._last_outreach: dict[str, datetime] = {}

    def evaluate(
        self,
        user: UserProfile,
        model: PersonalizedBehavioralModel,
        history: list[BehavioralEvent],
        *,
        now: datetime | None = None,
        active_sessions: list[CheckInSession] | None = None,
    ) -> tuple[RiskForecast | None, CheckInSession | None]:
        """
        Returns (top high-risk forecast, new session) if outreach should fire.
        """
        if not user.consent_proactive_outreach:
            return None, None

        now = now or utcnow()
        active_sessions = active_sessions or []
        if any(s.status == SessionStatus.ACTIVE for s in active_sessions):
            return None, None

        last = self._last_outreach.get(user.user_id)
        if last and now - last < self.cooldown:
            return None, None

        windows = self.risk_engine.high_risk_windows(model, history, now=now)
        if not windows:
            return None, None

        # Prefer the soonest high-risk window
        target = min(windows, key=lambda f: f.window_start)
        # Only reach out if the window is imminent (within 2 hours)
        if target.window_start - now > timedelta(hours=2):
            return target, None

        session = self.agent.start_check_in(user, target)
        self._last_outreach[user.user_id] = now
        return target, session
