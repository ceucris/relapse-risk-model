from datetime import datetime, timedelta, timezone

from recovery.domain.enums import SignalType
from recovery.domain.models import BehavioralEvent
from recovery.model.personalized import PersonalizedBehavioralModel
from recovery.model.risk import RiskWindowEngine, score_to_level


def _e(
    hours_ago: float,
    signal: SignalType,
    label: str,
    intensity: float,
    user_id: str = "u1",
) -> BehavioralEvent:
    now = datetime(2026, 7, 24, 18, 0, tzinfo=timezone.utc)
    return BehavioralEvent(
        user_id=user_id,
        signal_type=signal,
        label=label,
        intensity=intensity,
        occurred_at=now - timedelta(hours=hours_ago),
    )


def test_cue_craving_affinity_learns_from_cooccurrence():
    model = PersonalizedBehavioralModel(user_id="u1")
    history: list[BehavioralEvent] = []
    events = [
        _e(3, SignalType.CUE, "bar", 0.8),
        _e(2.8, SignalType.CRAVING, "urge", 0.9),
        _e(2, SignalType.CUE, "bar", 0.7),
        _e(1.8, SignalType.CRAVING, "urge", 0.85),
        _e(1, SignalType.CUE, "gym invitation", 0.4),
        _e(0.9, SignalType.COPE, "workout", 0.8),
    ]
    for event in events:
        model.observe(event, history)
        history.append(event)

    assert model.cue_craving.get("bar", 0) > model.cue_craving.get(
        "gym invitation", 0
    )
    assert model.observations == len(events)
    assert model.confidence() > 0.0


def test_prediction_moves_with_risk_context():
    model = PersonalizedBehavioralModel(user_id="u1")
    history: list[BehavioralEvent] = []
    # Train on several high-risk sequences
    for day in range(5):
        base = 24 * (5 - day)
        seq = [
            _e(base + 2, SignalType.CUE, "stress", 0.8),
            _e(base + 1.5, SignalType.CRAVING, "urge", 0.9),
            _e(base + 1, SignalType.REWARD, "use", 0.9),
        ]
        for event in seq:
            # shift timestamps uniquely via label only — recreate with day offset
            event.occurred_at = datetime(
                2026, 7, 20 + day, 18, int((base % 1) * 60), tzinfo=timezone.utc
            )
            model.observe(event, history, label_high_risk=True)
            history.append(event)

    now = datetime(2026, 7, 25, 18, 0, tzinfo=timezone.utc)
    risky_history = history + [
        BehavioralEvent(
            user_id="u1",
            signal_type=SignalType.CUE,
            label="stress",
            intensity=0.95,
            occurred_at=now - timedelta(minutes=10),
        ),
        BehavioralEvent(
            user_id="u1",
            signal_type=SignalType.CRAVING,
            label="urge",
            intensity=0.9,
            occurred_at=now - timedelta(minutes=5),
        ),
    ]
    score_high, _, _ = model.predict_from_history(now, risky_history)

    calm_history = history + [
        BehavioralEvent(
            user_id="u1",
            signal_type=SignalType.COPE,
            label="walk",
            intensity=0.8,
            occurred_at=now - timedelta(minutes=5),
        )
    ]
    score_low, _, _ = model.predict_from_history(now, calm_history)
    assert score_high > score_low


def test_risk_window_engine_flags_high_scores():
    model = PersonalizedBehavioralModel(user_id="u1")
    # Bias model toward high risk via weight on bias + craving features
    model.weights[:] = 0.0
    model.weights[-1] = 2.0  # bias → high baseline
    engine = RiskWindowEngine(outreach_threshold=0.65)
    windows = engine.high_risk_windows(model, [])
    assert windows
    assert all(w.risk_score >= 0.65 for w in windows)
    assert score_to_level(0.9).value == "critical"
