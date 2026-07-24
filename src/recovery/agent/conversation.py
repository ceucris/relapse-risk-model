from __future__ import annotations

import re
from typing import Any

from recovery.agent.escalation import EscalationService
from recovery.agent.interventions import InterventionEngine
from recovery.domain.enums import (
    EscalationReason,
    RiskLevel,
    SessionStatus,
)
from recovery.domain.models import (
    CheckInSession,
    ConversationTurn,
    CounselorEscalation,
    RiskForecast,
    UserProfile,
    utcnow,
)

# Heuristic distress / safety language — escalate when matched.
_DISTRESS_PATTERNS = [
    r"\b(i can't|cant) (do this|take it|go on)\b",
    r"\b(relapse|using|about to use|going to use)\b",
    r"\b(hopeless|give up|what's the point)\b",
]
_SAFETY_PATTERNS = [
    r"\b(kill myself|suicide|end my life|want to die|hurt myself)\b",
    r"\b(no reason to live)\b",
]


def _parse_intensity(text: str) -> float | None:
    """Extract 0–10 or 0–1 self-report if present."""
    m = re.search(r"\b(10|[0-9])\b", text)
    if m:
        return min(1.0, int(m.group(1)) / 10.0)
    m = re.search(r"\b(0?\.\d+|1\.0)\b", text)
    if m:
        return float(m.group(1))
    return None


def _matches(patterns: list[str], text: str) -> bool:
    lower = text.lower()
    return any(re.search(p, lower) for p in patterns)


class ConversationalAgent:
    """
    Proactive check-in agent: not a dumb push notification.

    Opens a dialogue, runs an intervention script, tracks distress/craving,
    and escalates to a human counselor when signals are bad enough.
    """

    def __init__(
        self,
        interventions: InterventionEngine | None = None,
        escalation: EscalationService | None = None,
    ) -> None:
        self.interventions = interventions or InterventionEngine()
        self.escalation = escalation or EscalationService()

    def start_check_in(
        self,
        user: UserProfile,
        forecast: RiskForecast,
    ) -> CheckInSession:
        intervention = self.interventions.select(
            forecast.risk_level, craving=None, distress=forecast.risk_score
        )
        opening = self.interventions.opening(intervention)
        drivers = ", ".join(forecast.top_drivers[:2]) or "patterns we've learned"
        greeting = (
            f"Hey {user.display_name} — I'm checking in because the next couple of hours "
            f"look higher-risk for you (score {forecast.risk_score:.0%}). "
            f"Drivers I'm seeing: {drivers}."
        )
        session = CheckInSession(
            user_id=user.user_id,
            forecast_id=forecast.forecast_id,
            status=SessionStatus.ACTIVE,
            intervention=intervention,
            started_at=utcnow(),
            distress_score=forecast.risk_score * 0.6,
            turns=[
                ConversationTurn(role="agent", content=greeting),
                ConversationTurn(
                    role="agent",
                    content=opening,
                    metadata={"intervention_step": 0},
                ),
            ],
        )
        return session

    def respond(
        self,
        session: CheckInSession,
        user: UserProfile,
        user_message: str,
        *,
        risk_level: RiskLevel = RiskLevel.HIGH,
    ) -> tuple[CheckInSession, CounselorEscalation | None]:
        session.turns.append(
            ConversationTurn(role="user", content=user_message)
        )

        intensity = _parse_intensity(user_message)
        if intensity is not None:
            session.craving_self_report = intensity
            session.distress_score = max(session.distress_score, intensity)

        if _matches(_SAFETY_PATTERNS, user_message):
            session.distress_score = 1.0
            esc = self.escalation.create(
                user=user,
                session=session,
                reason=EscalationReason.SAFETY_CONCERN,
                risk_level=RiskLevel.CRITICAL,
                summary="User language suggested possible self-harm risk during check-in.",
            )
            session.status = SessionStatus.ESCALATED
            session.escalation_id = esc.escalation_id
            session.turns.append(
                ConversationTurn(
                    role="agent",
                    content=(
                        "I'm really glad you told me. Your safety matters most. "
                        "I'm connecting you with your counselor now. "
                        "If you're in immediate danger, please contact local emergency services "
                        "or a crisis line right away."
                    ),
                    metadata={"escalated": True},
                )
            )
            return session, esc

        if _matches(_DISTRESS_PATTERNS, user_message):
            session.distress_score = min(1.0, session.distress_score + 0.25)

        # Decide escalation from cumulative signals
        should_escalate, reason = self.escalation.should_escalate(
            distress=session.distress_score,
            craving=session.craving_self_report,
            risk_level=risk_level,
            user_requested="counselor" in user_message.lower()
            or "human" in user_message.lower(),
        )
        if should_escalate and reason is not None:
            esc = self.escalation.create(
                user=user,
                session=session,
                reason=reason,
                risk_level=risk_level
                if risk_level != RiskLevel.LOW
                else RiskLevel.HIGH,
                summary=self._summary(session),
            )
            session.status = SessionStatus.ESCALATED
            session.escalation_id = esc.escalation_id
            session.turns.append(
                ConversationTurn(
                    role="agent",
                    content=(
                        "I think it would help to bring your counselor in. "
                        "I've sent them a brief update so you don't have to retell everything. "
                        "I'm still here with you in the meantime."
                    ),
                    metadata={"escalated": True, "reason": reason.value},
                )
            )
            return session, esc

        step = sum(
            1
            for t in session.turns
            if t.role == "agent" and "intervention_step" in t.metadata
        )
        assert session.intervention is not None
        nxt = self.interventions.next_prompt(session.intervention, step)
        if nxt is None:
            session.status = SessionStatus.COMPLETED
            session.completed_at = utcnow()
            after = session.craving_self_report
            closing = (
                "You made it through this check-in. That counts. "
                "I'll keep watching for the next risky window — reach out anytime."
            )
            if after is not None:
                closing = (
                    f"Thanks for sticking with this. You reported craving at "
                    f"{after:.0%}. {closing}"
                )
            session.turns.append(ConversationTurn(role="agent", content=closing))
            return session, None

        session.turns.append(
            ConversationTurn(
                role="agent",
                content=nxt,
                metadata={"intervention_step": step},
            )
        )
        return session, None

    def _summary(self, session: CheckInSession) -> str:
        craving = (
            f"{session.craving_self_report:.0%}"
            if session.craving_self_report is not None
            else "unreported"
        )
        last_user = next(
            (t.content for t in reversed(session.turns) if t.role == "user"),
            "",
        )
        return (
            f"Check-in session {session.session_id}: intervention="
            f"{session.intervention}, distress={session.distress_score:.2f}, "
            f"craving={craving}. Last user message: {last_user[:200]}"
        )

    def session_snapshot(self, session: CheckInSession) -> dict[str, Any]:
        return {
            "session_id": session.session_id,
            "status": session.status.value,
            "intervention": session.intervention.value
            if session.intervention
            else None,
            "distress_score": session.distress_score,
            "craving_self_report": session.craving_self_report,
            "turns": [
                {"role": t.role, "content": t.content} for t in session.turns
            ],
            "escalation_id": session.escalation_id,
        }
