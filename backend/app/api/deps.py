"""Common FastAPI dependencies — auth, db, workspace membership."""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security.jwt import (
    TokenExpiredError,
    TokenInvalidError,
    decode_access_token,
)
from app.db.session import get_async_session
from app.models import User, UserRole, WorkspaceMemberRole
from app.schemas.envelope import ErrorCode
from app.services.user_service import get_user_by_id, get_user_workspaces

# Scheme HTTP Bearer — sólo authentication header; no forzamos auto_error=True.
_bearer = HTTPBearer(auto_error=False)


def _envelope(*, status: int, code: ErrorCode, message: str) -> HTTPException:
    return HTTPException(
        status_code=status,
        detail={
            "code": code.value,
            "message": message,
            "correlation_id": "0" * 36,  # lo sobreescribe el ErrorEnvelopeMiddleware
        },
    )


async def get_db() -> AsyncSession:
    """Re-export para que las rutas hagan ``Depends(get_db)``."""
    async for session in get_async_session():
        yield session


DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    db: DbSession,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    """Decodifica el JWT, carga el usuario activo. 401 si algo falla."""
    if creds is None or not creds.credentials:
        raise _envelope(
            status=401,
            code=ErrorCode.AUTH_TOKEN_MISSING,
            message="Falta token de autenticacion",
        )
    try:
        claims = decode_access_token(creds.credentials)
    except TokenExpiredError as exc:
        raise _envelope(
            status=401,
            code=ErrorCode.AUTH_TOKEN_EXPIRED,
            message=str(exc),
        ) from exc
    except TokenInvalidError as exc:
        raise _envelope(
            status=401,
            code=ErrorCode.AUTH_TOKEN_INVALID,
            message=str(exc),
        ) from exc

    try:
        user_id = uuid.UUID(claims["sub"])
    except (KeyError, ValueError) as exc:
        raise _envelope(
            status=401,
            code=ErrorCode.AUTH_TOKEN_INVALID,
            message="Subject invalido",
        ) from exc

    user = await get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        raise _envelope(
            status=401,
            code=ErrorCode.AUTH_USER_INACTIVE,
            message="Usuario no encontrado o inactivo",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_workspace_member(
    user: CurrentUser,
    db: DbSession,
    workspace_id: uuid.UUID,
) -> WorkspaceMemberRole:
    """Dependency: garantiza que el usuario pertenece al workspace."""
    workspaces = await get_user_workspaces(db, user.id)
    for ws, role in workspaces:
        if ws.id == workspace_id:
            return role
    raise _envelope(
        status=403,
        code=ErrorCode.WORKSPACE_ACCESS_DENIED,
        message="No tienes acceso a este workspace",
    )


def require_role(*allowed: UserRole):
    """Factory de dependencia: limita por rol (USER | ADMIN | BOTH)."""

    async def _checker(user: CurrentUser) -> User:
        if user.role not in allowed:
            raise _envelope(
                status=403,
                code=ErrorCode.WORKSPACE_ACCESS_DENIED,
                message="Permisos insuficientes",
            )
        return user

    return _checker