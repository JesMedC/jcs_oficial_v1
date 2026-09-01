"""``GET /api/v1/auth/me`` — usuario actual + workspaces."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.auth import AuthMeOut
from app.schemas.workspace import WorkspaceOut
from app.services.user_service import get_user_workspaces

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=AuthMeOut)
async def me(user: CurrentUser, db: DbSession) -> AuthMeOut:
    workspaces = await get_user_workspaces(db, user.id)
    workspace_outs = [
        WorkspaceOut(
            id=ws.id,
            name=ws.name,
            plan_tier=ws.plan_tier,
            role_in_workspace=role,
            created_at=ws.created_at,
        )
        for ws, role in workspaces
    ]
    return AuthMeOut(
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        workspaces=workspace_outs,
    )