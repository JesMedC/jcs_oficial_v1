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
    # Membership gate first — non-members get 403 even if the
    # payload would otherwise be valid.
    role = await get_user_workspace_role(db, user.id, workspace_id)
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
        # The membership check above already returned 403 for any
        # caller that doesn't see this workspace, so reaching this
        # branch implies the workspace was deleted between the
        # membership lookup and now. Surface as NOT_FOUND rather
        # than a silent success.
        raise HTTPException(
            status_code=404,
            detail={
                "code": ErrorCode.NOT_FOUND.value,
                "message": "workspace no encontrado",
                "correlation_id": "0" * 36,
            },
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

    ws.session_ops_cap = payload.session_ops_cap
    db.add(ws)
    await db.commit()
    await db.refresh(ws)

    return WorkspaceDisciplineOut(
        workspace_id=ws.id,
        plan_tier=ws.plan_tier,
        session_ops_cap=ws.session_ops_cap,
        ceiling=ceiling,
    )


__all__ = ["router"]