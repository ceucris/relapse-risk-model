# Architecture notes

## Design goals

1. **Personalization first** — one model instance per user; no shared weights that wash out individual cue maps.
2. **Online learning** — every logged event updates associations and risk weights without batch retrain.
3. **Agent ≠ notification** — high-risk predictions open a dialogue with measurable intervention steps.
4. **Human in the loop** — explicit escalation paths with structured context for counselors.
5. **Swappable infrastructure** — in-memory store and scripted dialogue are stubs behind stable service interfaces.

## Data flow

```
BehavioralEvent
    → PersonalizedBehavioralModel.observe()
        → update cue_craving / craving_reward tables
        → SGD update on feature weights
    → RiskWindowEngine.forecast()
        → RiskForecast[] over horizon
    → OutreachOrchestrator.evaluate()
        → CheckInSession (conversational)
            → InterventionEngine scripts
            → EscalationService → CounselorEscalation
```

## Model details

Feature vector (fixed layout in `model/features.py`):

- Cyclic hour / day-of-week
- Recent cue & craving intensity
- Recent reward / cope counts
- Mood level
- Recency of last craving
- Personalized cue–craving affinity prior
- Bias

The logistic head is intentionally small so it can train from sparse early data. The associative tables carry most of the “this user + this cue” specificity.

## Agent policy

| Signal | Action |
|---|---|
| Risk ≥ 0.65, window ≤ 2h | Start check-in |
| Craving self-report ≥ ~0.7 | Prefer urge-surfing |
| Distress ≥ 0.8 or CRITICAL | Safety-plan intervention |
| Safety language | Immediate counselor escalation (urgency 1.0) |
| “counselor” / “human” | User-requested escalation |
| Intervention script exhausted | Complete session; feed outcomes back later |

## Extension points

| Stub today | Production replacement |
|---|---|
| `InMemoryStore` | Postgres events + model state blobs / Redis session |
| Scripted `ConversationalAgent` | LLM with tool schema + safety classifier |
| Polling `POST /outreach` | Scheduler worker + push/WebSocket channel |
| `CounselorEscalation` record | EHR / on-call pager / secure messaging |
| Proxy labels from events | Clinician-confirmed outcomes + delayed rewards |

## Safety constraints for implementers

- Treat all content as sensitive health data (HIPAA/GDPR as applicable).
- Never present model scores as diagnosis.
- Keep a kill-switch for proactive outreach per user and globally.
- Log escalations immutably; require human acknowledgment SLA.
