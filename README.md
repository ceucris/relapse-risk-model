# Relapse Risk Model

Personalized neural-behavioral relapse-risk architecture with an **agentic conversational layer**.

> **Disclaimer:** Research / engineering prototype only. Not a medical device, not clinical treatment, and not a substitute for professional care. Crisis language routes to counselor escalation stubs — production systems must integrate licensed clinical workflows and local emergency resources.

## What this is

Each user gets a private model that learns *their* cue → craving → reward patterns over time. A risk engine forecasts high-risk windows. Instead of a mute push notification, an agent opens a real check-in, runs an intervention, and escalates to a human counselor when signals are bad enough.

```
┌─────────────┐     events      ┌──────────────────────────┐
│  Client /   │ ──────────────► │  RecoveryService         │
│  sensors    │                 │  - ingest + online learn │
└─────────────┘                 └────────────┬─────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    ▼                        ▼                        ▼
         ┌──────────────────┐    ┌───────────────────┐    ┌────────────────────┐
         │ Personalized     │    │ RiskWindowEngine  │    │ OutreachOrchestr.  │
         │ BehavioralModel  │───►│ (horizon forecast)│───►│ (proactive agent)  │
         │ cue↔craving table│    └───────────────────┘    └─────────┬──────────┘
         │ online logistic  │                                       │
         └──────────────────┘                                       ▼
                                                         ┌────────────────────┐
                                                         │ ConversationalAgent│
                                                         │ + InterventionEngine│
                                                         └─────────┬──────────┘
                                                                   │ bad signals
                                                                   ▼
                                                         ┌────────────────────┐
                                                         │ EscalationService  │
                                                         │ → human counselor  │
                                                         └────────────────────┘
```

## Core ideas

| Layer | Role |
|---|---|
| **Domain events** | Cue, craving, reward, cope, mood, context — the behavioral loop |
| **Personalized model** | Per-user associative strengths + online logistic weights; confidence rises with observations |
| **Risk windows** | Rolling horizon scores; outreach when imminent & above threshold |
| **Agent** | Conversational check-in + scripted interventions (urge surfing, grounding, etc.) |
| **Escalation** | Distress / safety / user-request → structured counselor handoff packet |

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# End-to-end narrative demo
recovery-demo

# API
recovery-api
# → http://localhost:8000/docs
```

## API surface

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/users` | Register user + empty personal model |
| `POST` | `/users/{id}/events` | Log cue/craving/reward/… and update model |
| `GET` | `/users/{id}/forecast` | Near-term risk windows |
| `GET` | `/users/{id}/insights` | Top personal cues, confidence, model stats |
| `POST` | `/users/{id}/outreach` | Run agentic outreach cycle |
| `POST` | `/sessions/{id}/reply` | Continue check-in conversation |
| `GET` | `/users/{id}/escalations` | Counselor handoff packets |

## Package layout

```
src/recovery/
  domain/          # enums + pydantic models
  model/           # features, personalized learner, risk windows
  agent/           # outreach, conversation, interventions, escalation
  services/        # application wiring
  storage/         # in-memory store (swap for Postgres/Redis later)
  api/             # FastAPI
  demo.py          # scripted walkthrough
```

## How the personal model learns

1. **Associative layer** — when a craving follows a cue inside a 2h window, raise that cue’s affinity; rewards strengthen craving→reward links; coping slightly decays nearby cue affinities.
2. **Contextual layer** — online logistic regression over time-of-day, recent intensities, mood, hours-since-craving, and the affinity prior.
3. **Confidence** — grows with observation count and shrinks with recent absolute error, so the agent can know when the model is still cold-starting.

## Agentic check-in flow

1. `RiskWindowEngine` flags windows with score ≥ threshold (default `0.65`).
2. `OutreachOrchestrator` opens a session only if consent is on, no active session, cooldown elapsed, and the window is imminent (≤ 2h).
3. `ConversationalAgent` greets with personalized drivers and starts an intervention.
4. User replies update craving/distress heuristics.
5. `EscalationService` hands off on safety language, high distress, extreme craving, or explicit counselor request.

## Tests

```bash
pytest -q
```

## Production next steps (not in this skeleton)

- Persist events/models (Postgres + feature store); encrypt PHI at rest
- Replace heuristic dialogue with a constrained clinical LLM + tool calls
- Real-time channels (WebSocket / SMS) instead of request/response outreach polling
- Counselor console + on-call routing, audit logs, consent versioning
- Calibrated offline evaluation (Brier / PR-AUC) per user cohort before enabling outreach
- Clear crisis SOP with local emergency resources — never rely on the model alone
