"""Workspace operations — creación de workspaces default + lookups de rol.

p0f.1 (multi-tenant pivot): ``TradingAccount`` y ``Trade`` dejaron de
ser ``User``-level; ahora viven a nivel ``Workspace``. La regla de
resolución del ``workspace_id`` activo del usuario es centralizada en
``infer_workspace_id`` para que ``trading_account_service``,
``trade_service`` y futuros módulos no repitan la lógica.
"""
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
from app.schemas.envelope import ErrorCode


class WorkspaceRequiredError(Exception):
    """El usuario autenticado no tiene un workspace resoluble.

    Se traduce a ``ErrorCode.WORKSPACE_REQUIRED`` (HTTP 422). Se
    diferencia de ``WORKSPACE_ACCESS_DENIED`` (403) porque la causa es
    ausencia de contexto (0 memberships + JWT vacío), no un permiso
    denegado a un workspace existente.
    """

    def __init__(self, message: str = "no hay workspace resoluble") -> None:
        self.code = ErrorCode.WORKSPACE_REQUIRED
        self.message = message
        super().__init__(message)


async def create_default_workspace_for_user(
    db: AsyncSession, user: User
) -> Workspace:
    """Crea el workspace personal del usuario y lo marca como OWNER.

    Llamado por ``auth_service.register_user`` justo después del flush del
    usuario. Asume que ``user.id`` ya está asignado.
    """
    display_name = (
        f"{user.first_name} {user.last_name}".strip() or user.email.split("@")[0]
    )
    workspace = Workspace(
        name=f"Workspace de {display_name}",
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


async def get_user_workspace_ids(
    db: AsyncSession, user_id: uuid.UUID
) -> list[uuid.UUID]:
    """Devuelve los ``workspace_id`` donde el user es miembro.

    Orden estable por ``created_at ASC, workspace_id ASC`` (mismo
    criterio que ``infer_workspace_id``) — así el primer elemento
    de la lista siempre es el workspace "más antiguo" del user, que
    es el que ``infer_workspace_id`` elige por default si el JWT no
    trae el claim populado.
    """
    stmt = (
        select(WorkspaceMember.workspace_id)
        .where(WorkspaceMember.user_id == user_id)
        .order_by(
            WorkspaceMember.created_at.asc(),
            WorkspaceMember.workspace_id.asc(),
        )
    )
    rows = (await db.execute(stmt)).all()
    return [row[0] for row in rows]


async def infer_workspace_id(
    db: AsyncSession,
    user_id: uuid.UUID,
    jwt_workspace_ids: list[uuid.UUID] | None = None,
) -> uuid.UUID:
    """Resuelve el ``workspace_id`` activo para el usuario autenticado.

    Estrategia (de más barato a más caro):

    1. Si el JWT (decodificado en ``get_current_user``) trae
       ``workspace_ids`` no vacía, devolvemos el primero. Esto evita un
       round-trip a la DB cuando el contexto ya está en el token.
    2. Si el JWT viene vacío, consultamos ``workspace_members``
       ``WHERE user_id = :user_id AND role='OWNER'`` y elegimos la fila
       más antigua (``ORDER BY created_at ASC, workspace_id ASC``).
       El tiebreak es **idéntico** al que usa la migración ``0009``
       (backfill de ``workspace_id`` a filas pre-existentes) — si un
       usuario tiene varios OWNER workspaces, ganamos el mismo que
       ganó el backfill, evitando inconsistencias entre el histórico
       y las filas nuevas.
    3. Si no hay memberships OWNER, levantamos ``WorkspaceRequiredError``
       (HTTP 422 ``WORKSPACE_REQUIRED``).

    Parámetros:
    - ``db``: sesión async activa.
    - ``user_id``: el del usuario autenticado (viene del JWT ``sub``).
    - ``jwt_workspace_ids``: lista cruda del claim ``workspace_ids`` del
      JWT. ``None`` o lista vacía ⇒ fallback al lookup DB.
    """
    # Paso 1: claim del JWT.
    if jwt_workspace_ids:
        return jwt_workspace_ids[0]

    # Paso 2: lookup DB — el más antiguo de los OWNER del user.
    stmt = (
        select(WorkspaceMember.workspace_id)
        .where(
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.role == WorkspaceMemberRole.OWNER,
        )
        .order_by(
            WorkspaceMember.created_at.asc(),
            WorkspaceMember.workspace_id.asc(),
        )
        .limit(1)
    )
    workspace_id = await db.scalar(stmt)

    # Paso 3: cero memberships ⇒ el usuario no tiene contexto.
    if workspace_id is None:
        raise WorkspaceRequiredError(
            f"user {user_id} no pertenece a ningun workspace"
        )
    return workspace_id


__all__ = [
    "create_default_workspace_for_user",
    "get_user_workspace_role",
    "get_user_workspace_ids",
    "infer_workspace_id",
    "WorkspaceRequiredError",
]
