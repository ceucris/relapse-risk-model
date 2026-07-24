from datetime import datetime, timedelta, timezone

from recovery.agent.conversation import ConversationalAgent
from recovery.agent.outreach import OutreachOrchestrator
from recovery.domain.enums import EscalationReason, RiskLevel, SessionStatus
from recovery.domain.models import RiskForecast, UserProfile
from recovery.model.personalized import PersonalizedBehavioralModel
from recovery.services.recovery_service import RecoveryService
from recovery.domain.enums import SignalType


def _user() -> UserProfile:
    return UserProfile(
        display_name="Sam",
        counselor_id="c-1",
        known_cues=["Friday night"],
    )


def _forecast(user_id: str, score: float = 0.8) -> RiskForecast:
    now = datetime(2026, 7, 24, 20, 0, tzinfo=timezone.utc)
    return RiskForecast(
        user_id=user_id,
        window_start=now,
        window_end=now + timedelta(hours=2),
        risk_score=score,
        risk_level=RiskLevel.HIGH if score < 0.85 else RiskLevel.CRITICAL,
        top_drivers=["recent_craving_intensity elevates risk"],
        model_confidence=0.6,
    )


def test_check_in_runs_intervention_and_completes():
    agent = ConversationalAgent()
    user = _user()
    session = agent.start_check_in(user, _forecast(user.user_id))
    assert session.status == SessionStatus.ACTIVE
    assert session.intervention is not None
    assert len(session.turns) >= 2

    # Walk through script with moderate replies
    for msg in ["ok", "I see a lamp, couch, window, plant, mug", "craving is 3"]:
        session, esc = agent.respond(session, user, msg, risk_level=RiskLevel.MODERATE)
        assert esc is None
        if session.status == SessionStatus.COMPLETED:
            break
    assert session.status in {SessionStatus.COMPLETED, SessionStatus.ACTIVE}


def test_escalates_on_counselor_request():
    agent = ConversationalAgent()
    user = _user()
    session = agent.start_check_in(user, _forecast(user.user_id, 0.7))
    session, esc = agent.respond(
        session, user, "I need a human counselor please", risk_level=RiskLevel.HIGH
    )
    assert esc is not None
    assert esc.reason == EscalationReason.USER_REQUEST
    assert session.status == SessionStatus.ESCALATED
    assert esc.counselor_id == "c-1"


def test_escalates_on_safety_language():
    agent = ConversationalAgent()
    user = _user()
    session = agent.start_check_in(user, _forecast(user.user_id, 0.9))
    session, esc = agent.respond(
        session, user, "I want to die", risk_level=RiskLevel.CRITICAL
    )
    assert esc is not None
    assert esc.reason == EscalationReason.SAFETY_CONCERN
    assert esc.urgency == 1.0


def test_outreach_triggers_for_imminent_high_risk():
    svc = RecoveryService()
    user = svc.register_user("Sam", counselor_id="c-1")
    now = datetime(2026, 7, 24, 18, 0, tzinfo=timezone.utc)

    # Push model weights high and add a cue
    model = svc.store.get_model(user.user_id)
    model.weights[:] = 0.0
    model.weights[-1] = 3.0
    svc.log_event(
        user.user_id,
        SignalType.CUE,
        "Friday night",
        intensity=0.9,
        occurred_at=now,
    )

    result = svc.run_outreach_cycle(user.user_id, now=now)
    assert result["outreach_triggered"] is True
    assert result["session"] is not None
    assert result["session"].turns[0].role == "agent"

    # Cooldown prevents immediate re-trigger
    result2 = svc.run_outreach_cycle(user.user_id, now=now + timedelta(minutes=5))
    assert result2["outreach_triggered"] is False


def test_outreach_respects_consent():
    orch = OutreachOrchestrator()
    user = _user()
    user.consent_proactive_outreach = False
    model = PersonalizedBehavioralModel(user_id=user.user_id)
    model.weights[-1] = 3.0
    forecast, session = orch.evaluate(user, model, [])
    assert forecast is None and session is None
