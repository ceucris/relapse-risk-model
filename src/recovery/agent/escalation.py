from __future__ import annotations

from recovery.domain.enums import EscalationReason, RiskLevel
from recovery.domain.models import (
    CheckInSession,
    CounselorEscalation,
    UserProfile,
)


class EscalationService:
    """
    Decides when the agent must hand off to a human counselor
    and builds a structured escalation packet.
    """

    def __init__(
        self,
        *,
        distress_threshold: float = 0.8,
        craving_threshold: float = 0.85,
    ) -> None:
        self.distress_threshold = distress_threshold
        self.craving_threshold = craving_threshold

    def should_escalate(
        self,
        *,
        distress: float,
        craving: float | None,
        risk_level: RiskLevel,
        user_requested: bool = False,
    ) -> tuple[bool, EscalationReason | None]:
        if user_requested:
            return True, EscalationReason.USER_REQUEST
        if distress >= self.distress_threshold:
            return True, EscalationReason.DISTRESS_SIGNALS
        if craving is not None and craving >= self.craving_threshold:
            return True, EscalationReason.HIGH_RISK_WINDOW
        if risk_level == RiskLevel.CRITICAL and distress >= 0.6:
            return True, EscalationReason.HIGH_RISK_WINDOW
        return False, None

    def create(
        self,
        *,
        user: UserProfile,
        session: CheckInSession,
        reason: EscalationReason,
        risk_level: RiskLevel,
        summary: str,
    ) -> CounselorEscalation:
        recent = [
            f"{t.role}: {t.content[:120]}"
            for t in session.turns[-6:]
        ]
        urgency = {
            RiskLevel.CRITICAL: 1.0,
            RiskLevel.HIGH: 0.8,
            RiskLevel.MODERATE: 0.55,
            RiskLevel.LOW: 0.3,
        }[risk_level]
        if reason == EscalationReason.SAFETY_CONCERN:
            urgency = 1.0

        return CounselorEscalation(
            user_id=user.user_id,
            session_id=session.session_id,
            counselor_id=user.counselor_id,
            reason=reason,
            risk_level=risk_level,
            summary=summary,
            recent_signals=recent,
            urgency=urgency,
        )
