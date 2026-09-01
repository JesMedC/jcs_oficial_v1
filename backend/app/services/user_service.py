"""User queries — sin lógica de negocio, solo lecturas tipadas."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import User, Workspace, WorkspaceMember, WorkspaceMemberRole


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    return await db.scalar(select(User).where(User.email == email.strip().lower()))


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await db.get(User, user_id)


async def get_user_workspaces(
    db: AsyncSession, user_id: uuid.UUID
) -> list[tuple[Workspace, WorkspaceMemberRole]]:
    """Devuelve los workspaces del usuario con el rol que tiene en ellos."""
    stmt = (
        select(WorkspaceMember, Workspace)
        .join(Workspace, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == user_id)
        .options(selectinload(WorkspaceMember.workspace))
    )
    rows = (await db.execute(stmt)).all()
    result: list[tuple[Workspace, WorkspaceMemberRole]] = []
    for membership, workspace in rows:
        result.append((workspace, membership.role))
    return result