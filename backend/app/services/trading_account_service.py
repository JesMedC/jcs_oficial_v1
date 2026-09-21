"""TradingAccount service — CRUD + saldo para ``/accounts``.

p0d.1: las cuentas de trading viven a nivel ``User``. El service hace:

- ``create_trading_account`` — inserta una fila con ``balance_usd=0``
  (no lo pasamos: el ``server_default`` de la DB lo deja en 0). Emite
  ``AuditLog`` con la metadata mínima.
- ``list_user_accounts`` — pagina las cuentas NO soft-deleted del usuario.

p0e.2 extiende con ``fund_account`` / ``withdraw_account`` /
``delete_account``. La mutación de saldo es aditiva (``+= amount`` /
``-= amount``) para no perder precisión cuando hay concurrencia; el
delete es soft (``deleted_at = now()``) para conservar historial de
auditoría — la fila queda, pero ``list_user_accounts`` ya no la ve.

Toda mutación pasa por este módulo (R3 Reliability). Las rutas sólo
validan con Pydantic y llaman al service.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AuditLog,
    Trade,
    TradeStatus,
    TradeType,
    TradingAccount,
    TradingAccountType,
    User,
)
from app.models.trade import TradeStatus as _TradeStatus  # noqa: F401
from app.observability.logging import get_logger
from app.services.workspace_service import (
    WorkspaceRequiredError,
    infer_workspace_id,
)

log = get_logger(__name__)


class TradingAccountError(Exception):
    """Error de trading account traducible a ``ErrorEnvelope``.

    ``status`` lo traduce la ruta a un código HTTP. ``code`` es el
    código canónico (``VALIDATION_ERROR``, ``NOT_FOUND``,
    ``INSUFFICIENT_BALANCE``, ``CONFIRMATION_REQUIRED``) que el frontend
    mapea a i18n. La ruta intenta preservar ``code`` literal cuando
    coincide con un ``ErrorCode`` conocido; si no, usa el mapping por
    ``status``.
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


# ---------- internal fetch helper ----------
async def _get_owned_active_account(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
) -> TradingAccount:
    """Trae la cuenta del usuario, NO soft-deleted. 404 si no se cumple
    alguna de las dos condiciones (no leak de existencia entre users)."""
    stmt = (
        select(TradingAccount)
        .where(
            TradingAccount.id == account_id,
            TradingAccount.user_id == user_id,
            TradingAccount.deleted_at.is_(None),
        )
    )
    account = (await db.execute(stmt)).scalar_one_or_none()
    if account is None:
        raise TradingAccountError(
            code="NOT_FOUND",
            message=f"trading account {account_id} no encontrada",
            status=404,
        )
    return account


# ---------- mutations ----------
async def create_trading_account(
    db: AsyncSession,
    *,
    user: User,
    broker_name: str,
    type: TradingAccountType,
    name: str,
    jwt_workspace_ids: list[uuid.UUID] | None = None,
    correlation_id: str | None = None,
) -> TradingAccount:
    """Inserta una ``TradingAccount`` del usuario con ``balance_usd=0``.

    El ``balance_usd`` no se pasa al constructor: el default Python-side
    (``Decimal("0")``) más el ``server_default=0`` de la tabla lo dejan
    en 0. Si el caller lo seteara explícitamente, lo podría pisar — pero
    ``TradingAccountIn`` no lo expone, así que el cliente no puede.

    p0f.1 (multi-tenant): el ``workspace_id`` se infiere del JWT del
    usuario (claim ``workspace_ids``) o, si el JWT no trae el claim,
    de la membership OWNER más antigua. El cliente no lo manda en el
    body — el contrato público se preserva.
    """
    try:
        workspace_id = await infer_workspace_id(
            db, user.id, jwt_workspace_ids=jwt_workspace_ids
        )
    except WorkspaceRequiredError as exc:
        # El usuario autenticado no tiene un workspace resoluble.
        # Mapeamos a 422 con código canónico ``WORKSPACE_REQUIRED``.
        raise TradingAccountError(
            code="WORKSPACE_REQUIRED",
            message=str(exc),
            status=422,
        ) from exc
    account = TradingAccount(
        user_id=user.id,
        workspace_id=workspace_id,
        broker_name=broker_name,
        type=type,
        name=name,
    )
    db.add(account)
    try:
        await db.flush()
    except IntegrityError as exc:
        # Hardening: si el ``IntegrityError`` vino de un lazy load
        # fuera del greenlet, el ``rollback`` mismo puede tirar otro
        # ``MissingGreenlet``. Comemos cualquier excepción del rollback
        # porque ya estamos en path de error — lo que importa es no
        # propagar ruido encima del ``TradingAccountError``.
        try:
            await db.rollback()
        except Exception:  # pragma: no cover — path defensivo
            log.warning("rollback after IntegrityError raised", exc_info=True)
        # Traducimos a 404 — la única FK rota realista es ``user_id``
        # (workspace_id fue inferido contra la DB, así que está OK).
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
            "workspace_id": str(workspace_id),
        },
        correlation_id=correlation_id,
    )
    await db.commit()
    await db.refresh(account)
    return account


async def fund_account(
    db: AsyncSession,
    *,
    user: User,
    account_id: uuid.UUID,
    amount: Decimal,
    correlation_id: str | None = None,
) -> TradingAccount:
    """Incrementa ``balance_usd`` en ``amount`` y emite ``account.fund``.

    El caller (ruta + Pydantic) ya validó ``amount > 0`` y precisión
    ``Numeric(10, 2)``. Acá sólo garantizamos ownership + no soft-
    deleted y auditamos.
    """
    account = await _get_owned_active_account(
        db, user_id=user.id, account_id=account_id
    )
    previous_balance = account.balance_usd
    account.balance_usd = previous_balance + amount
    new_balance = account.balance_usd
    await _emit_audit(
        db,
        actor_user_id=user.id,
        action="account.fund",
        entity_id=str(account.id),
        previous={"balance_usd": str(previous_balance)},
        new={
            "amount": str(amount),
            "new_balance": str(new_balance),
        },
        correlation_id=correlation_id,
    )
    await db.commit()
    await db.refresh(account)
    return account


async def withdraw_account(
    db: AsyncSession,
    *,
    user: User,
    account_id: uuid.UUID,
    amount: Decimal,
    correlation_id: str | None = None,
) -> TradingAccount:
    """Decrementa ``balance_usd`` en ``amount`` y emite ``account.withdraw``.

    Falla con ``INSUFFICIENT_BALANCE`` (422) si ``amount > balance_usd``.
    Pydantic ya validó ``amount > 0`` y precisión. El chequeo ocurre
    ANTES de cualquier mutate, así que ``raise`` no necesita rollback.
    """
    account = await _get_owned_active_account(
        db, user_id=user.id, account_id=account_id
    )
    if amount > account.balance_usd:
        raise TradingAccountError(
            code="INSUFFICIENT_BALANCE",
            message=(
                f"saldo insuficiente: pedido {amount}, "
                f"disponible {account.balance_usd}"
            ),
            status=422,
        )
    previous_balance = account.balance_usd
    account.balance_usd = previous_balance - amount
    new_balance = account.balance_usd
    await _emit_audit(
        db,
        actor_user_id=user.id,
        action="account.withdraw",
        entity_id=str(account.id),
        previous={"balance_usd": str(previous_balance)},
        new={
            "amount": str(amount),
            "new_balance": str(new_balance),
        },
        correlation_id=correlation_id,
    )
    await db.commit()
    await db.refresh(account)
    return account


async def delete_account(
    db: AsyncSession,
    *,
    user: User,
    account_id: uuid.UUID,
    confirmation: str,
    correlation_id: str | None = None,
) -> None:
    """Soft delete + ``account.delete`` audit. NO toca ``balance_usd``.

    ``confirmation`` debe ser exactamente ``"ELIMINAR"`` (case
    sensitive). El set soft-delete es por ``deleted_at = now()`` para
    conservar la fila en ``audit_logs``/FKs futuras; ``list_user_accounts``
    ya la filtra.

    Cascade soft-delete: también marca ``deleted_at`` en TODOS los
    ``Trade`` de la cuenta (OPEN + CLOSED_*) en una sola UPDATE. Esto
    preserva el audit trail (las filas siguen en la DB para futuros
    ``trade.history`` / reportes) pero los esconde de ``list_trades``
    (que filtra por ``deleted_at IS NULL``). El P&L ya fue computado
    al cerrar cada trade, así que no se pierde info contable — sólo
    dejamos de mostrarlos en el listado de operaciones del usuario.
    """
    if confirmation != "ELIMINAR":
        raise TradingAccountError(
            code="CONFIRMATION_REQUIRED",
            message='confirmacion debe ser exactamente "ELIMINAR"',
            status=400,
        )
    account = await _get_owned_active_account(
        db, user_id=user.id, account_id=account_id
    )
    last_balance = account.balance_usd
    broker_name = account.broker_name
    name = account.name
    # Cascade: marcar todos los trades de la cuenta como soft-deleted
    # ANTES de marcar la cuenta. Una sola UPDATE masiva evita N round-
    # trips por trade (importante cuando una cuenta tiene cientos de
    # operaciones).
    cascade_deleted_at = datetime.now(timezone.utc)
    cascade_result = await db.execute(
        update(Trade)
        .where(
            Trade.account_id == account_id,
            Trade.deleted_at.is_(None),
        )
        .values(deleted_at=cascade_deleted_at)
    )
    cascaded_trades = cascade_result.rowcount or 0
    # Log estructurado del cascade para trazabilidad operacional —
    # el audit de ``account.delete`` mantiene su shape estable (no
    # se agrega un campo ``trades_cascaded`` para no romper callers
    # downstream que assertan el dict exacto).
    log.info(
        "account.delete cascade",
        account_id=str(account_id),
        user_id=str(user.id),
        cascaded_trades=cascaded_trades,
    )
    account.deleted_at = cascade_deleted_at
    await _emit_audit(
        db,
        actor_user_id=user.id,
        action="account.delete",
        entity_id=str(account.id),
        previous={
            "broker_name": broker_name,
            "name": name,
            "last_balance": str(last_balance),
        },
        new={"deleted_at": account.deleted_at.isoformat()},
        correlation_id=correlation_id,
    )
    await db.commit()


# ---------- queries ----------
async def list_user_accounts(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    jwt_workspace_ids: list[uuid.UUID] | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[TradingAccount], int]:
    """Lista paginada de cuentas no soft-deleted del usuario + total.

    p0f.1 (multi-tenant): además de filtrar por ``user_id``, filtramos
    por ``workspace_id`` (inferido del JWT o, en fallback, del lookup
    DB de la membership OWNER más antigua). Esto aísla un workspace
    de otro: un user que pertenece a 2 workspaces ve las cuentas de
    UNO solo (el "activo" del JWT o, en su defecto, el más antiguo).
    El listado multi-workspace simultáneo es otra iteración.
    """
    try:
        workspace_id = await infer_workspace_id(
            db, user_id, jwt_workspace_ids=jwt_workspace_ids
        )
    except WorkspaceRequiredError as exc:
        raise TradingAccountError(
            code="WORKSPACE_REQUIRED",
            message=str(exc),
            status=422,
        ) from exc
    base = (
        select(TradingAccount)
        .where(
            TradingAccount.user_id == user_id,
            TradingAccount.workspace_id == workspace_id,
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
            TradingAccount.workspace_id == workspace_id,
            TradingAccount.deleted_at.is_(None),
        )
    )
    rows = list((await db.execute(base)).scalars().all())
    total = await db.scalar(count_stmt) or 0
    return rows, int(total)


__all__ = [
    "TradingAccountError",
    "create_trading_account",
    "fund_account",
    "withdraw_account",
    "delete_account",
    "list_user_accounts",
]
