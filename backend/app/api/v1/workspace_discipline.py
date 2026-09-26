"""Workspaces API — workspace-level settings.

Slice A of ``sessions-configurable-cap`` lands ONE endpoint here:

    PATCH /api/v1/workspaces/{workspace_id}/discipline

Lets a workspace member tighten (never loosen) the discipline
engine's per-session ops cap within the plan-tier ceiling. The
endpoint is the single source of truth for cap mutation; the engine
reads ``workspace.session_ops_cap`` at trade-open time
(REQ-DISC-008).

Resource-scoped path (``/workspaces/{id}/discipline``) — workspaces
are first-class entities in the multi-tenant model and this mirrors
``workspace_service.py`` conventions.

Errors:
- 422 ``DISCIPLINE_CAP_OUT_OF_RANGE`` when ``session_ops_cap`` is
  outside ``[1, plan_ceiling]``; the message includes the ceiling
  so the client can render a localized "tope N" pill.
- 403 ``WORKSPACE_ACCESS_DENIED`` when the caller is not a member.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models import Workspace
from app.schemas.envelope import ErrorCode
from app.schemas.workspace import (
    WorkspaceDisciplineOut,
    WorkspaceDisciplinePatchIn,
)
from app.services.discipline_engine import plan_ceiling_for
from app.services.workspace_service import get_user_workspace_role

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _discipline_out(ws: Workspace, *, ceiling: int) -> WorkspaceDisciplineOut:
    return WorkspaceDisciplineOut(
        workspace_id=ws.id,
        plan_tier=ws.plan_tier,
        session_ops_cap=ws.session_ops_cap,
        daily_loss_pct=ws.daily_loss_pct,
        weekly_loss_pct=ws.weekly_loss_pct,
        monthly_loss_pct=ws.monthly_loss_pct,
        ceiling=ceiling,
    )


async def _get_member_workspace(
    db: DbSession,
    *,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
) -> Workspace:
    role = await get_user_workspace_role(db, user_id, workspace_id)
    if role is None:
        raise HTTPException(
            status_code=403,
            detail={
                "code": ErrorCode.WORKSPACE_ACCESS_DENIED.value,
                "message": "No tienes acceso a este workspace",
                "correlation_id": "0" * 36,
            },
        )

    ws = await db.scalar(
        select(Workspace).where(Workspace.id == workspace_id)
    )
    if ws is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": ErrorCode.NOT_FOUND.value,
                "message": "workspace no encontrado",
                "correlation_id": "0" * 36,
            },
        )
    return ws


@router.get(
    "/{workspace_id}/discipline",
    response_model=WorkspaceDisciplineOut,
)
async def get_workspace_discipline(
    workspace_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
) -> WorkspaceDisciplineOut:
    """Read workspace discipline/risk-control settings."""
    ws = await _get_member_workspace(
        db, user_id=user.id, workspace_id=workspace_id
    )
    return _discipline_out(ws, ceiling=plan_ceiling_for(ws.plan_tier))


@router.patch(
    "/{workspace_id}/discipline",
    response_model=WorkspaceDisciplineOut,
)
async def patch_workspace_discipline(
    workspace_id: uuid.UUID,
    payload: WorkspaceDisciplinePatchIn,
    user: CurrentUser,
    db: DbSession,
) -> WorkspaceDisciplineOut:
    """Update ``workspace.session_ops_cap`` (REQ-DSC-004 + REQ-DSC-005).

    Rules:
    - Caller MUST be a workspace member (403 otherwise).
    - ``session_ops_cap=None`` resets to the plan-tier ceiling
      (REQ-DSC-003).
    - Otherwise ``1 <= value <= plan_ceiling_for(workspace.plan_tier)``
      is enforced. Out-of-range returns 422 with code
      ``DISCIPLINE_CAP_OUT_OF_RANGE`` and a message that includes
      the ceiling so the frontend can show a localized "tope N"
      pill without a follow-up query.
    """
    ws = await _get_member_workspace(
        db, user_id=user.id, workspace_id=workspace_id
    )
    ceiling = plan_ceiling_for(ws.plan_tier)

    if payload.session_ops_cap is not None and not (
        1 <= payload.session_ops_cap <= ceiling
    ):
        raise HTTPException(
            status_code=422,
            detail={
                "code": ErrorCode.DISCIPLINE_CAP_OUT_OF_RANGE.value,
                "message": (
                    f"session_ops_cap {payload.session_ops_cap} fuera de "
                    f"rango; techo {ceiling}"
                ),
                "correlation_id": "0" * 36,
                "details": {
                    "field": "session_ops_cap",
                    "min": 1,
                    "max": ceiling,
                    "submitted": payload.session_ops_cap,
                },
            },
        )

    fields = payload.model_fields_set
    if "session_ops_cap" in fields:
        ws.session_ops_cap = payload.session_ops_cap
    if "daily_loss_pct" in fields:
        ws.daily_loss_pct = payload.daily_loss_pct
    if "weekly_loss_pct" in fields:
        ws.weekly_loss_pct = payload.weekly_loss_pct
    if "monthly_loss_pct" in fields:
        ws.monthly_loss_pct = payload.monthly_loss_pct
    db.add(ws)
    await db.commit()
    await db.refresh(ws)

    return _discipline_out(ws, ceiling=ceiling)


__all__ = ["router"]
