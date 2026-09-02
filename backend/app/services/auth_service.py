"""Auth service — register / authenticate / rotate / logout.

Ningún importe desde ``app.api``. Esta capa es la ÚNICA autorizada a:
- crear usuarios,
- emitir/revocar refresh tokens,
- escribir ``AuditLog`` para acciones de auth,
- crear la subscripción de trial (STARTER / 7 días).

p0b.1a: ``register_user`` ahora toma ``first_name``, ``last_name`` y
``phone``. Después de crear el Workspace default, llama a
``subscription_service.create_trial`` para materializar el trial.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security.jwt import (
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
)
from app.core.security.password import (
    WeakPasswordError,
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.models import AuditLog, RefreshToken, User, UserRole, WorkspaceMemberRole
from app.schemas.envelope import ErrorCode
from app.services.subscription_service import create_trial
from app.services.workspace_service import (
    create_default_workspace_for_user,
    get_user_workspace_ids,
)


class AuthError(Exception):
    """Error de auth traducible a ``ErrorEnvelope``."""

    def __init__(self, code: ErrorCode, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


# ---------- emit helpers ----------
async def _emit_audit(
    db: AsyncSession,
    *,
    actor_user_id: uuid.UUID | None,
    action: str,
    entity_type: str,
    entity_id: str,
    previous: dict[str, Any] | None = None,
    new: dict[str, Any] | None = None,
    correlation_id: str | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            previous_value=previous,
            new_value=new,
            correlation_id=correlation_id,
        )
    )
    await db.flush()


async def _store_refresh_token(
    db: AsyncSession,
    user_id: uuid.UUID,
    raw: str,
    expires_at: datetime,
) -> RefreshToken:
    entry = RefreshToken(
        user_id=user_id,
        token_hash=hash_refresh_token(raw),
        expires_at=expires_at,
    )
    db.add(entry)
    await db.flush()
    return entry


async def _resolve_workspace_ids_for_jwt(
    db: AsyncSession, user: User
) -> list[uuid.UUID]:
    """Lee los ``workspace_ids`` del user, priorizando el transient.

    FASE 4B hardening: ``register_user``, ``authenticate_user`` y
    ``rotate_refresh_token`` ahora stashean ``user.workspace_ids``
    en la misma transacción que crea/carga al user, garantizando
    visibilidad inmediata (evita el bug de ``workspace_ids=[]`` en
    el JWT que aparecía después de uptime largo en producción).
    Como red de seguridad, si el transient no está seteado, caemos
    al lookup DB.
    """
    cached = getattr(user, "workspace_ids", None)
    if cached:
        return list(cached)
    return await get_user_workspace_ids(db, user.id)


async def _issue_tokens(
    db: AsyncSession,
    user: User,
) -> tuple[str, str, int]:
    """Emite access + refresh + ``expires_in``. Persiste el refresh.

    p0f.1 (multi-tenant): el access token ahora viaja con el claim
    ``workspace_ids`` poblado de las memberships reales del user.
    Los services (trading_account, trade) lo leen de ahí para
    resolver el ``workspace_id`` activo sin un round-trip extra a la
    DB.

    FASE 4B hardening: prefiere ``user.workspace_ids`` (seteado por
    el caller en la misma transacción) sobre un lookup DB. Esto
    garantiza que el JWT emitido en el request de register/login
    lleve la lista correcta incluso si el connection pool del
    worker tiene alguna rareza con visibilidad de filas recién
    commiteadas.
    """
    workspace_ids = await _resolve_workspace_ids_for_jwt(db, user)
    access, expires_in = create_access_token(
        user.id, user.role, workspace_ids
    )
    raw_refresh, _, expires_at = create_refresh_token()
    await _store_refresh_token(db, user.id, raw_refresh, expires_at)
    return access, raw_refresh, expires_in


# ---------- public API ----------
async def register_user(
    db: AsyncSession,
    *,
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    phone: str,
    correlation_id: str | None = None,
) -> User:
    """Crea el usuario + su workspace default + subscripción de trial + audit log.

    p0b.1a: ya no emite tokens. ``issue_tokens_for_user`` se invoca desde
    la capa de routing para poder mapear errores uniformemente.
    """
    # Normalizamos email a minúsculas (canonical).
    email_normalized = email.strip().lower()

    # R1 — fuerza de contraseña.
    try:
        validate_password_strength(password)
    except WeakPasswordError as exc:
        raise AuthError(ErrorCode.AUTH_WEAK_PASSWORD, str(exc)) from exc

    existing = await db.scalar(select(User).where(User.email == email_normalized))
    if existing is not None:
        raise AuthError(ErrorCode.AUTH_EMAIL_TAKEN, "El email ya esta registrado")

    user = User(
        email=email_normalized,
        password_hash=hash_password(password),
        first_name=first_name.strip(),
        last_name=last_name.strip(),
        phone=phone.strip(),
        role=UserRole.USER,
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise AuthError(ErrorCode.AUTH_EMAIL_TAKEN, "El email ya esta registrado") from exc

    workspace = await create_default_workspace_for_user(db, user)
    await create_trial(
        db, user=user, workspace=workspace, correlation_id=correlation_id
    )

    # FASE 4B hardening: capturamos ``workspace_ids`` ANTES del
    # ``commit()`` mientras la conexión todavía ve la fila de
    # ``WorkspaceMember`` que acabamos de flushear. Esto evita el
    # bug donde el JWT emitido por ``_issue_tokens`` quedaba con
    # ``workspace_ids=[]`` por una race del connection pool del
    # worker (la fila era visible en la DB pero no en la
    # transacción que el pool le entregaba a la siguiente query).
    user.workspace_ids = await get_user_workspace_ids(db, user.id)

    await _emit_audit(
        db,
        actor_user_id=user.id,
        action="user.register",
        entity_type="User",
        entity_id=str(user.id),
        new={
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "role": user.role.value,
        },
        correlation_id=correlation_id,
    )
    await db.commit()
    await db.refresh(user)
    # ``db.refresh`` puede expirar atributos transitorios; los
    # re-seteamos por seguridad (los services los leen vía
    # ``getattr`` en ``_issue_tokens``).
    if not getattr(user, "workspace_ids", None):
        user.workspace_ids = await get_user_workspace_ids(db, user.id)
    return user


async def issue_tokens_for_user(
    db: AsyncSession,
    user: User,
) -> tuple[str, str, int]:
    """Emite tokens nuevos para un usuario ya cargado. Para register + login."""
    access, raw_refresh, expires_in = await _issue_tokens(db, user)
    await db.commit()
    return access, raw_refresh, expires_in


async def authenticate_user(
    db: AsyncSession,
    *,
    email: str,
    password: str,
    correlation_id: str | None = None,
) -> User:
    """Valida credenciales. Devuelve ``User`` o lanza ``AuthError``."""
    user = await db.scalar(select(User).where(User.email == email.strip().lower()))
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        # Log de intento fallido — sin persistir el password.
        await _emit_audit(
            db,
            actor_user_id=user.id if user else None,
            action="user.login.failed",
            entity_type="User",
            entity_id=str(user.id) if user else email,
            new={"email": email},
            correlation_id=correlation_id,
        )
        await db.commit()
        raise AuthError(
            ErrorCode.AUTH_INVALID_CREDENTIALS, "Credenciales invalidas"
        )

    await _emit_audit(
        db,
        actor_user_id=user.id,
        action="user.login.success",
        entity_type="User",
        entity_id=str(user.id),
        correlation_id=correlation_id,
    )
    await db.commit()
    # FASE 4B hardening: stash ``workspace_ids`` para que
    # ``_issue_tokens`` los reuse en lugar de pegarle a la DB
    # otra vez (y quedar vulnerable a la misma rareza del
    # connection pool que vimos en register).
    user.workspace_ids = await get_user_workspace_ids(db, user.id)
    return user


async def rotate_refresh_token(
    db: AsyncSession,
    *,
    raw_refresh_token: str,
    correlation_id: str | None = None,
) -> tuple[User, str, str, int]:
    """Valida el refresh, lo revoca y emite un par nuevo encadenado.
    Devuelve ``(user, access, new_refresh, expires_in)``.
    """
    token_hash = hash_refresh_token(raw_refresh_token)
    entry = await db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    now = datetime.now(timezone.utc)

    if entry is None:
        raise AuthError(ErrorCode.AUTH_TOKEN_INVALID, "Refresh token invalido")
    if entry.revoked_at is not None:
        raise AuthError(ErrorCode.AUTH_TOKEN_REVOKED, "Refresh token revocado")
    # Normalizamos: SQLite devuelve naive; Postgres devuelve aware. Comparamos en UTC.
    expires_at = entry.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        raise AuthError(ErrorCode.AUTH_TOKEN_EXPIRED, "Refresh token expirado")

    user = await db.get(User, entry.user_id)
    if user is None or not user.is_active:
        raise AuthError(ErrorCode.AUTH_USER_INACTIVE, "Usuario inactivo")

    # Rotación: revocamos el viejo y creamos el nuevo, encadenado.
    entry.revoked_at = now
    new_raw, _, new_exp = create_refresh_token()
    new_entry = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(new_raw),
        expires_at=new_exp,
    )
    db.add(new_entry)
    await db.flush()
    entry.replaced_by_id = new_entry.id

    # p0f.1 (multi-tenant): refrescamos las memberships del user para
    # emitir el access token con el claim ``workspace_ids`` correcto.
    # Si el user fue invitado/removido de workspaces entre el login
    # y este refresh, el nuevo access token refleja el estado actual.
    # FASE 4B hardening: stash en ``user.workspace_ids`` antes de
    # emitir el access token — el helper ``_issue_tokens`` los lee
    # del transient y se ahorra un round-trip + evita la rareza del
    # connection pool.
    user.workspace_ids = await get_user_workspace_ids(db, user.id)
    workspace_ids = user.workspace_ids
    access, expires_in = create_access_token(
        user.id, user.role, workspace_ids
    )

    await _emit_audit(
        db,
        actor_user_id=user.id,
        action="user.token.refresh",
        entity_type="User",
        entity_id=str(user.id),
        previous={"refresh_token_id": str(entry.id)},
        new={"refresh_token_id": str(new_entry.id)},
        correlation_id=correlation_id,
    )
    await db.commit()
    return user, access, new_raw, expires_in


async def logout_user(
    db: AsyncSession,
    *,
    raw_refresh_token: str,
    correlation_id: str | None = None,
) -> None:
    """Revoca el refresh token; idempotente (revocar dos veces no es error)."""
    token_hash = hash_refresh_token(raw_refresh_token)
    entry = await db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if entry is None or entry.revoked_at is not None:
        await db.commit()
        return
    entry.revoked_at = datetime.now(timezone.utc)
    await _emit_audit(
        db,
        actor_user_id=entry.user_id,
        action="user.logout",
        entity_type="User",
        entity_id=str(entry.user_id),
        previous={"refresh_token_id": str(entry.id)},
        correlation_id=correlation_id,
    )
    await db.commit()


# Re-export para no romper imports de otros servicios que ya lo usaban.
__all__ = [
    "AuthError",
    "register_user",
    "issue_tokens_for_user",
    "authenticate_user",
    "rotate_refresh_token",
    "logout_user",
    "WorkspaceMemberRole",
]
