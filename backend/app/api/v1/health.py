"""Health endpoints — liveness + readiness (chequea DB)."""
from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import DbSession
from app.schemas.health import HealthResponse, ReadyResponse

# Sin prefix — se monta al top-level en main.py.
router = APIRouter(tags=["health"])

_VERSION = "0.1.0"


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version=_VERSION)


@router.get("/health/ready", response_model=ReadyResponse)
async def ready(db: DbSession) -> ReadyResponse:
    try:
        await db.execute(text("SELECT 1"))
        return ReadyResponse(status="ok", db="ok")
    except Exception:  # noqa: BLE001 — el envelope lo formatea
        return ReadyResponse(status="degraded", db="error")