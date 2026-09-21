"""REST endpoint: ``GET /api/alerts``.

Returns the current pending alerts plus the most recent resolved ones.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

from app.engine.models import Alert


router = APIRouter(prefix="/api", tags=["alerts"])


@router.get("/alerts")
async def get_alerts(
    request: Request,
    limit: int = Query(default=50, ge=1, le=500),
) -> dict[str, object]:
    """Return pending + recent alerts (most recent first)."""
    store = getattr(request.app.state, "alert_store", None)
    if store is None:
        raise HTTPException(status_code=503, detail="scanner not initialized")

    pending = store.pending()
    recent = store.recent(limit=limit)
    all_alerts: list[Alert] = sorted(
        pending + recent, key=lambda a: a.entry_time, reverse=True
    )[:limit]

    return {
        "count": len(all_alerts),
        "pending_count": len(pending),
        "alerts": [a.model_dump(mode="json") for a in all_alerts],
    }
