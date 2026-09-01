"""Workspace operations — creación de workspaces default + lookups de rol."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    User,
    Workspace,
    WorkspaceMember,
    WorkspaceMemberRole,
    WorkspacePlanTier,
)


async def create_default_workspace_for_user(
    db: AsyncSession, user: User
) -> Workspace:
    """Crea el workspace personal del usuario y lo marca como OWNER.

    Llamado por ``auth_service.register_user`` justo después del flush del
    usuario. Asume que ``user.id`` ya está asignado.
    """
    workspace = Workspace(
        name=f"Workspace de {user.name}",
        owner_user_id=user.id,
        plan_tier=WorkspacePlanTier.NONE,
    )
    db.add(workspace)
    await db.flush()

    db.add(
        WorkspaceMember(
            workspace_id=workspace.id,
            user_id=user.id,
            role=WorkspaceMemberRole.OWNER,
        )
    )
    await db.flush()
    return workspace


async def get_user_workspace_role(
    db: AsyncSession,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
) -> WorkspaceMemberRole | None:
    stmt = select(WorkspaceMember).where(
        WorkspaceMember.user_id == user_id,
        WorkspaceMember.workspace_id == workspace_id,
    )
    membership = await db.scalar(stmt)
    return membership.role if membership else None