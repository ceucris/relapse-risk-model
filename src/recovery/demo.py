#!/usr/bin/env python3
"""End-to-end demo: learn personal patterns → predict risk → conversational check-in."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from recovery.domain.enums import SignalType
from recovery.services.recovery_service import RecoveryService


def _ts(day_offset: int, hour: int, minute: int = 0) -> datetime:
    base = datetime(2026, 7, 13, tzinfo=timezone.utc)
    return base + timedelta(days=day_offset, hours=hour, minutes=minute)


def main() -> None:
    svc = RecoveryService()
    user = svc.register_user(
        "Alex",
        substances_or_behaviors=["alcohol"],
        known_cues=["after work stress", "walking past bar", "lonely evening"],
        protective_factors=["call sponsor", "gym", "journaling"],
        counselor_id="counselor-jordan",
    )
    print(f"Registered user {user.display_name} ({user.user_id})\n")

    # Two weeks of personal cue–craving–reward history.
    # High-risk evenings teach the model; coping days teach protective contrast.
    for day in range(10):
        # After-work stress → craving → use (high risk label)
        svc.log_event(
            user.user_id,
            SignalType.CUE,
            "after work stress",
            intensity=0.75 + (day % 3) * 0.05,
            occurred_at=_ts(day, 18, 0),
            label_high_risk=True,
        )
        svc.log_event(
            user.user_id,
            SignalType.CRAVING,
            "drink urge",
            intensity=0.8 + (day % 2) * 0.1,
            occurred_at=_ts(day, 18, 25),
            label_high_risk=True,
        )
        if day % 3 == 0:
            svc.log_event(
                user.user_id,
                SignalType.REWARD,
                "alcohol",
                intensity=0.85,
                occurred_at=_ts(day, 19, 0),
                label_high_risk=True,
            )
        else:
            svc.log_event(
                user.user_id,
                SignalType.COPE,
                "call sponsor",
                intensity=0.8,
                occurred_at=_ts(day, 18, 50),
                label_high_risk=False,
            )

        # Lonely late evenings also map to craving
        svc.log_event(
            user.user_id,
            SignalType.CUE,
            "lonely evening",
            intensity=0.7,
            occurred_at=_ts(day, 21, 0),
            label_high_risk=True,
        )
        svc.log_event(
            user.user_id,
            SignalType.CRAVING,
            "drink urge",
            intensity=0.75,
            occurred_at=_ts(day, 21, 20),
            label_high_risk=True,
        )

    # Midday bar cue usually followed by protective behavior
    for day in (2, 5, 8):
        svc.log_event(
            user.user_id,
            SignalType.CUE,
            "walking past bar",
            intensity=0.45,
            occurred_at=_ts(day, 12, 0),
            label_high_risk=False,
        )
        svc.log_event(
            user.user_id,
            SignalType.COPE,
            "gym",
            intensity=0.7,
            occurred_at=_ts(day, 12, 30),
            label_high_risk=False,
        )

    insights = svc.model_insights(user.user_id)
    print("=== Personalized model insights ===")
    print(
        f"observations={insights['observations']}  "
        f"confidence={insights['confidence']}  "
        f"mae={insights['mean_abs_error']}"
    )
    print("top risk cues:")
    for item in insights["top_risk_cues"]:
        print(f"  - {item['cue']}: {item['affinity']}")
    print()

    # Imminent high-risk context: after-work hour + strong personal cue + craving
    now = _ts(11, 17, 50)
    svc.log_event(
        user.user_id,
        SignalType.MOOD,
        "anxious",
        intensity=0.8,
        occurred_at=now,
    )
    svc.log_event(
        user.user_id,
        SignalType.CUE,
        "after work stress",
        intensity=0.95,
        occurred_at=now + timedelta(minutes=5),
        label_high_risk=True,
    )
    svc.log_event(
        user.user_id,
        SignalType.CRAVING,
        "drink urge",
        intensity=0.9,
        occurred_at=now + timedelta(minutes=12),
        label_high_risk=True,
    )

    check_at = now + timedelta(minutes=15)
    forecasts = svc.forecast(user.user_id, now=check_at)
    print("=== Near-term risk forecast ===")
    for f in forecasts[:4]:
        print(
            f"  {f.window_start.strftime('%a %H:%M')}  "
            f"score={f.risk_score:.2f}  level={f.risk_level.value}"
        )
        if f.top_drivers:
            print(f"    drivers: {', '.join(f.top_drivers[:3])}")
    print()

    result = svc.run_outreach_cycle(user.user_id, now=check_at)
    print("=== Agentic outreach ===")
    print(f"triggered={result['outreach_triggered']}")
    if not result["session"]:
        print("No session opened (risk below threshold or cooldown).")
        return

    session = result["session"]
    for turn in session.turns:
        print(f"[agent] {turn.content}")
    print()

    replies = [
        "Yeah, it's been a rough day. Craving is about an 8.",
        "I keep thinking one drink would fix it.",
        "Can I talk to my counselor?",
    ]
    print("=== Conversation ===")
    for msg in replies:
        print(f"[user] {msg}")
        session, escalation = svc.reply(session.session_id, msg)
        last_agent = next(
            t.content for t in reversed(session.turns) if t.role == "agent"
        )
        print(f"[agent] {last_agent}")
        if escalation:
            print()
            print("=== Escalation to human counselor ===")
            print(f"reason={escalation.reason.value}")
            print(f"urgency={escalation.urgency}")
            print(f"counselor_id={escalation.counselor_id}")
            print(f"summary={escalation.summary}")
            break
    print()
    print("Demo complete.")


if __name__ == "__main__":
    main()
