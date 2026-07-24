from __future__ import annotations

from enum import Enum


class SignalType(str, Enum):
    """Observable signals in the cue → craving → reward loop."""

    CUE = "cue"
    CRAVING = "craving"
    REWARD = "reward"
    COPE = "cope"  # protective / alternate behavior
    MOOD = "mood"
    CONTEXT = "context"


class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class InterventionType(str, Enum):
    URGE_SURFING = "urge_surfing"
    COGNITIVE_REFRAME = "cognitive_reframe"
    GROUNDING = "grounding"
    VALUES_REMINDER = "values_reminder"
    SAFETY_PLAN = "safety_plan"


class EscalationReason(str, Enum):
    HIGH_RISK_WINDOW = "high_risk_window"
    DISTRESS_SIGNALS = "distress_signals"
    USER_REQUEST = "user_request"
    NON_RESPONSE = "non_response"
    SAFETY_CONCERN = "safety_concern"


class SessionStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    ESCALATED = "escalated"
    ABANDONED = "abandoned"
