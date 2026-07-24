from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field

from recovery.domain.enums import (
    EscalationReason,
    InterventionType,
    RiskLevel,
    SessionStatus,
    SignalType,
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid4())


class UserProfile(BaseModel):
    """Per-user recovery profile and model metadata."""

    user_id: str = Field(default_factory=new_id)
    display_name: str
    timezone: str = "UTC"
    substances_or_behaviors: list[str] = Field(default_factory=list)
    known_cues: list[str] = Field(default_factory=list)
    protective_factors: list[str] = Field(default_factory=list)
    counselor_id: str | None = None
    consent_proactive_outreach: bool = True
    created_at: datetime = Field(default_factory=utcnow)
    model_observations: int = 0
    model_version: int = 0


class BehavioralEvent(BaseModel):
    """A single observation in the cue–craving–reward loop."""

    event_id: str = Field(default_factory=new_id)
    user_id: str
    signal_type: SignalType
    label: str
    intensity: float = Field(ge=0.0, le=1.0, default=0.5)
    occurred_at: datetime = Field(default_factory=utcnow)
    context: dict[str, Any] = Field(default_factory=dict)
    # Optional linkage: craving that followed a cue, reward that followed craving, etc.
    related_event_id: str | None = None


class RiskForecast(BaseModel):
    """Predicted risk for a future window."""

    forecast_id: str = Field(default_factory=new_id)
    user_id: str
    window_start: datetime
    window_end: datetime
    risk_score: float = Field(ge=0.0, le=1.0)
    risk_level: RiskLevel
    top_drivers: list[str] = Field(default_factory=list)
    model_confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    generated_at: datetime = Field(default_factory=utcnow)


class ConversationTurn(BaseModel):
    role: str  # "agent" | "user" | "system"
    content: str
    timestamp: datetime = Field(default_factory=utcnow)
    metadata: dict[str, Any] = Field(default_factory=dict)


class CheckInSession(BaseModel):
    """Conversational agent check-in during a high-risk window."""

    session_id: str = Field(default_factory=new_id)
    user_id: str
    forecast_id: str | None = None
    status: SessionStatus = SessionStatus.PENDING
    intervention: InterventionType | None = None
    turns: list[ConversationTurn] = Field(default_factory=list)
    distress_score: float = Field(ge=0.0, le=1.0, default=0.0)
    craving_self_report: float | None = Field(default=None, ge=0.0, le=1.0)
    started_at: datetime | None = None
    completed_at: datetime | None = None
    escalation_id: str | None = None


class InterventionOutcome(BaseModel):
    session_id: str
    user_id: str
    intervention: InterventionType
    completed: bool
    craving_before: float | None = None
    craving_after: float | None = None
    helpful: bool | None = None
    notes: str = ""


class CounselorEscalation(BaseModel):
    """Handoff packet for a human counselor."""

    escalation_id: str = Field(default_factory=new_id)
    user_id: str
    session_id: str | None = None
    counselor_id: str | None = None
    reason: EscalationReason
    risk_level: RiskLevel
    summary: str
    recent_signals: list[str] = Field(default_factory=list)
    urgency: float = Field(ge=0.0, le=1.0)
    created_at: datetime = Field(default_factory=utcnow)
    acknowledged: bool = False
