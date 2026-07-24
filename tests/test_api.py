from fastapi.testclient import TestClient

from recovery.api import main as main
from recovery.services.recovery_service import RecoveryService


def setup_function():
    main.service = RecoveryService()


def test_health():
    client = TestClient(main.app)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_user_event_forecast_outreach_flow():
    from recovery.api import main as main

    main.service = RecoveryService()
    client = TestClient(main.app)

    reg = client.post(
        "/users",
        json={
            "display_name": "Riley",
            "known_cues": ["payday"],
            "counselor_id": "c-9",
        },
    )
    assert reg.status_code == 200
    user_id = reg.json()["user_id"]

    for _ in range(4):
        ev = client.post(
            f"/users/{user_id}/events",
            json={
                "signal_type": "cue",
                "label": "payday",
                "intensity": 0.8,
            },
        )
        assert ev.status_code == 200
        ev = client.post(
            f"/users/{user_id}/events",
            json={
                "signal_type": "craving",
                "label": "urge",
                "intensity": 0.85,
                "label_high_risk": True,
            },
        )
        assert ev.status_code == 200

    insights = client.get(f"/users/{user_id}/insights")
    assert insights.status_code == 200
    assert insights.json()["observations"] >= 8

    # Force high baseline for outreach determinism
    main.service.store.get_model(user_id).weights[-1] = 3.0

    forecast = client.get(f"/users/{user_id}/forecast")
    assert forecast.status_code == 200
    assert len(forecast.json()) > 0

    outreach = client.post(f"/users/{user_id}/outreach")
    assert outreach.status_code == 200
    body = outreach.json()
    assert body["outreach_triggered"] is True
    session_id = body["session"]["session_id"]

    reply = client.post(
        f"/sessions/{session_id}/reply",
        json={"message": "Please get my counselor"},
    )
    assert reply.status_code == 200
    assert reply.json()["escalation"] is not None
    assert reply.json()["session"]["status"] == "escalated"
