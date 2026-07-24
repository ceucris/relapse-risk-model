from __future__ import annotations

from recovery.domain.models import (
    BehavioralEvent,
    CheckInSession,
    CounselorEscalation,
    UserProfile,
)
from recovery.model.personalized import PersonalizedBehavioralModel


class InMemoryStore:
    """Simple process-local store for architecture demos and tests."""

    def __init__(self) -> None:
        self.users: dict[str, UserProfile] = {}
        self.events: dict[str, list[BehavioralEvent]] = {}
        self.models: dict[str, PersonalizedBehavioralModel] = {}
        self.sessions: dict[str, CheckInSession] = {}
        self.escalations: dict[str, CounselorEscalation] = {}

    def upsert_user(self, user: UserProfile) -> UserProfile:
        self.users[user.user_id] = user
        self.events.setdefault(user.user_id, [])
        if user.user_id not in self.models:
            self.models[user.user_id] = PersonalizedBehavioralModel(
                user_id=user.user_id
            )
        return user

    def get_user(self, user_id: str) -> UserProfile:
        if user_id not in self.users:
            raise KeyError(f"Unknown user_id={user_id}")
        return self.users[user_id]

    def add_event(self, event: BehavioralEvent) -> BehavioralEvent:
        self.events.setdefault(event.user_id, []).append(event)
        self.events[event.user_id].sort(key=lambda e: e.occurred_at)
        return event

    def list_events(self, user_id: str) -> list[BehavioralEvent]:
        return list(self.events.get(user_id, []))

    def get_model(self, user_id: str) -> PersonalizedBehavioralModel:
        if user_id not in self.models:
            self.models[user_id] = PersonalizedBehavioralModel(user_id=user_id)
        return self.models[user_id]

    def save_session(self, session: CheckInSession) -> CheckInSession:
        self.sessions[session.session_id] = session
        return session

    def get_session(self, session_id: str) -> CheckInSession:
        if session_id not in self.sessions:
            raise KeyError(f"Unknown session_id={session_id}")
        return self.sessions[session_id]

    def list_sessions(self, user_id: str) -> list[CheckInSession]:
        return [s for s in self.sessions.values() if s.user_id == user_id]

    def save_escalation(
        self, escalation: CounselorEscalation
    ) -> CounselorEscalation:
        self.escalations[escalation.escalation_id] = escalation
        return escalation

    def list_escalations(self, user_id: str | None = None) -> list[CounselorEscalation]:
        items = list(self.escalations.values())
        if user_id is not None:
            items = [e for e in items if e.user_id == user_id]
        return sorted(items, key=lambda e: e.created_at, reverse=True)
