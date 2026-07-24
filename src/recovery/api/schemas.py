from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class RegisterUserRequest(BaseModel):
    display_name: str
    substances_or_behaviors: list[str] = Field(default_factory=list)
    known_cues: list[str] = Field(default_factory=list)
    protective_factors: list[str] = Field(default_factory=list)
    counselor_id: str | None = None
    timezone: str = "UTC"


class LogEventRequest(BaseModel):
    signal_type: str
    label: str
    intensity: float = Field(default=0.5, ge=0.0, le=1.0)
    occurred_at: datetime | None = None
    context: dict[str, Any] = Field(default_factory=dict)
    related_event_id: str | None = None
    label_high_risk: bool | None = None


class ReplyRequest(BaseModel):
    message: str
