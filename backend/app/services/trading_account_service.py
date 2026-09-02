"""TradingAccount service — create + list para ``GET/POST /accounts``.

p0d.1: las cuentas de trading viven a nivel ``User``. El service hace:

- ``create_trading_account`` — inserta una fila con ``balance_usd=0``
  (no lo pasamos: el ``server_default`` de la DB lo deja en 0). Emite
  ``AuditLog`` con la metadata mínima.
- ``list_user_accounts`` — pagina las cuentas NO soft-deleted del usuario.

Toda mutación pasa por este módulo (R3 Reliability). Las rutas sólo
validan con Pydantic y llaman al service.
"""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AuditLog,
    TradingAccount,
    TradingAccountType,
    User,
)
from app.observability.logging import get_logger

log = get_logger(__name__)


class TradingAccountError(Exception):
    """Error de trading account traducible a ``ErrorEnvelope``.

    ``status`` lo traduce la ruta a un código HTTP. ``code`` es el
    código canónico (``VALIDATION_ERROR``, ``NOT_FOUND``, etc.) que el
    frontend mapea a i18n.
    """

    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


# ---------- emit helper ----------
async def _emit_audit(
    db: AsyncSession,
    *,
    actor_user_id: uuid.UUID,
    action: str,
    entity_id: str,
    previous: dict[str, Any] | None,
    new: dict[str, Any] | None,
    correlation_id: str | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            entity_type="TradingAccount",
            entity_id=entity_id,
            previous_value=previous,
            new_value=new,
            correlation_id=correlation_id,
        )
    )
    await db.flush()


# ---------- mutations ----------
async def create_trading_account(
    db: AsyncSession,
    *,
    user: User,
    broker_name: str,
    type: TradingAccountType,
    name: str,
    correlation_id: str | None = None,
) -> TradingAccount:
    """Inserta una ``TradingAccount`` del usuario con ``balance_usd=0``.

    El ``balance_usd`` no se pasa al constructor: el default Python-side
    (``Decimal("0")``) más el ``server_default=0`` de la tabla lo dejan
    en 0. Si el caller lo seteara explícitamente, lo podría pisar — pero
    ``TradingAccountIn`` no lo expone, así que el cliente no puede.
    """
    account = TradingAccount(
        user_id=user.id,
        broker_name=broker_name,
        type=type,
        name=name,
    )
    db.add(account)
    try:
        await db.flush()
    except IntegrityError as exc:
        # La única FK es ``user_id`` — si llega a fallar es porque el
        # user no existe o fue borrado en paralelo. Traducimos a 404
        # con código canónico ``NOT_FOUND``.
        await db.rollback()
        raise TradingAccountError(
            code="NOT_FOUND",
            message=f"user {user.id} no existe o fue borrado",
            status=404,
        ) from exc

    await _emit_audit(
        db,
        actor_user_id=user.id,
        action="trading_account.create",
        entity_id=str(account.id),
        previous=None,
        new={
            "broker_name": broker_name,
            "type": type.value,
            "name": name,
        },
        correlation_id=correlation_id,
    )
    await db.commit()
    await db.refresh(account)
    return account


# ---------- queries ----------
async def list_user_accounts(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[TradingAccount], int]:
    """Lista paginada de cuentas no soft-deleted del usuario + total."""
    base = (
        select(TradingAccount)
        .where(
            TradingAccount.user_id == user_id,
            TradingAccount.deleted_at.is_(None),
        )
        .order_by(TradingAccount.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    count_stmt = (
        select(func.count())
        .select_from(TradingAccount)
        .where(
            TradingAccount.user_id == user_id,
            TradingAccount.deleted_at.is_(None),
        )
    )
    rows = list((await db.execute(base)).scalars().all())
    total = await db.scalar(count_stmt) or 0
    return rows, int(total)


__all__ = [
    "TradingAccountError",
    "create_trading_account",
    "list_user_accounts",
]
