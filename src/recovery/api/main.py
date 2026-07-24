from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from recovery import __version__
from recovery.api.schemas import LogEventRequest, RegisterUserRequest, ReplyRequest
from recovery.services.recovery_service import RecoveryService

service = RecoveryService()

app = FastAPI(
    title="Relapse Risk Model API",
    description=(
        "Personalized neural-behavioral relapse risk modeling with an "
        "agentic conversational intervention layer. "
        "Prototype / research architecture — not a clinical medical device."
    ),
    version=__version__,
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__}


@app.post("/users")
def register_user(body: RegisterUserRequest):
    user = service.register_user(
        body.display_name,
        substances_or_behaviors=body.substances_or_behaviors,
        known_cues=body.known_cues,
        protective_factors=body.protective_factors,
        counselor_id=body.counselor_id,
        timezone=body.timezone,
    )
    return user.model_dump(mode="json")


@app.get("/users/{user_id}")
def get_user(user_id: str):
    try:
        return service.store.get_user(user_id).model_dump(mode="json")
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/users/{user_id}/events")
def log_event(user_id: str, body: LogEventRequest):
    try:
        result = service.log_event(
            user_id,
            body.signal_type,
            body.label,
            intensity=body.intensity,
            occurred_at=body.occurred_at,
            context=body.context,
            related_event_id=body.related_event_id,
            label_high_risk=body.label_high_risk,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "event": result["event"].model_dump(mode="json"),
        "learning": result["learning"],
    }


@app.get("/users/{user_id}/forecast")
def forecast(user_id: str):
    try:
        service.store.get_user(user_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    windows = service.forecast(user_id)
    return [f.model_dump(mode="json") for f in windows]


@app.get("/users/{user_id}/insights")
def insights(user_id: str):
    try:
        return service.model_insights(user_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/users/{user_id}/outreach")
def outreach(user_id: str):
    try:
        result = service.run_outreach_cycle(user_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {
        "outreach_triggered": result["outreach_triggered"],
        "forecast": result["forecast"].model_dump(mode="json")
        if result["forecast"]
        else None,
        "session": result["session"].model_dump(mode="json")
        if result["session"]
        else None,
    }


@app.post("/sessions/{session_id}/reply")
def reply(session_id: str, body: ReplyRequest):
    try:
        session, escalation = service.reply(session_id, body.message)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {
        "session": session.model_dump(mode="json"),
        "escalation": escalation.model_dump(mode="json") if escalation else None,
    }


@app.get("/users/{user_id}/escalations")
def escalations(user_id: str):
    try:
        service.store.get_user(user_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return [
        e.model_dump(mode="json")
        for e in service.store.list_escalations(user_id)
    ]


@app.exception_handler(Exception)
async def unhandled(_request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"internal error: {exc.__class__.__name__}"},
    )


def run() -> None:
    import uvicorn

    uvicorn.run("recovery.api.main:app", host="0.0.0.0", port=8000, reload=False)


if __name__ == "__main__":
    run()
