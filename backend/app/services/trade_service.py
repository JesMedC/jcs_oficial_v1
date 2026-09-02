"""Trade service — open / close / list / get.

p0e.4: ``Trade`` es la operación atómica que dispara la mutación
del saldo de ``TradingAccount``. Esta capa aplica las 4 reglas que
el cliente nunca debe poder romper:

1. **Ownership**: el trade es del usuario autenticado; la cuenta
   sobre la que se abre también.
2. **Account activo**: la cuenta no está soft-deleted.
3. **State machine**: sólo se puede cerrar un trade en estado
   ``OPEN``. Re-cerrar un trade cerrado devuelve ``422 TRADE_CLOSED``.
4. **P&L determinístico**: ``pnl_usd`` se calcula a partir de
   fórmulas fijas (FOREX/BINARY) que viven sólo acá — los tests y
   el cliente lo validan contra el output, no contra una rama
   alternativa.

Fórmulas (verbatim del spec de p0e.4):

  FOREX ``risk_amount`` = ``|entry - stop_loss| × lot_size × 100``
  FOREX ``risk_pct``    = ``risk_amount / account.balance × 100``
  FOREX ``pnl_usd``     = ``(exit - entry) × sign(direction) × lot × 100``
  FOREX ``r_multiple``  = ``pnl_usd / risk_amount_usd``
  FOREX status          = ``pnl > 0 ? WIN : pnl < 0 ? LOSS : BREAK``

  BINARY ``pnl_usd``    = ``outcome==WIN ? investment × payout / 100 :
                           -investment``
  BINARY status         = mismo criterio que FOREX.

La mutación de ``account.balance_usd`` es aditiva (``+= pnl_usd``)
para no perder precisión ante concurrencia — igual que ``fund_account``
y ``withdraw_account``.

Cada mutación emite un ``AuditLog`` propio (``trade.open`` o
``trade.close``) con el delta de P&L y el nuevo saldo.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    AuditLog,
    BinaryDirection,
    ForexDirection,
    Trade,
    TradeStatus,
    TradeType,
    TradingAccount,
    User,
)
from app.schemas.trade import RiskSummaryOut
from app.services.workspace_service import (
    WorkspaceRequiredError,
    infer_workspace_id,
)

# Cuantificadores baratos para evitar "magic numbers" dispersos:
_ZERO = Decimal("0")
_ONE = Decimal("1")
_HUNDRED = Decimal("100")


class TradeError(Exception):
    """Error de trade traducible a ``ErrorEnvelope``.

    Mismo contrato que ``TradingAccountError`` — ``status`` define el
    HTTP code, ``code`` el canonical string que el frontend mapea a
    i18n. La ruta intenta preservar ``code`` literal cuando matchea
    un ``ErrorCode`` conocido.
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
            entity_type="Trade",
            entity_id=entity_id,
            previous_value=previous,
            new_value=new,
            correlation_id=correlation_id,
        )
    )
    await db.flush()


# ---------- helpers ----------
async def _get_owned_account(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
) -> TradingAccount:
    """Trae la cuenta del usuario, NO soft-deleted.

    404 si no existe o no es del user. Misma política que
    ``_get_owned_active_account`` de ``TradingAccount`` — no leak de
    existencia entre users.
    """
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
        raise TradeError(
            code="NOT_FOUND",
            message=f"trading account {account_id} no encontrada",
            status=404,
        )
    return account


def _sign(direction: str) -> Decimal:
    """``LONG`` → +1, ``SHORT`` → −1. Para FOREX."""
    return _ONE if direction == ForexDirection.LONG.value else -_ONE


def _validate_open_payload(
    *,
    type: TradeType,
    pair: str | None,
    lot_size: Decimal | None,
    direction: str | None,
    entry_price: Decimal | None,
    stop_loss: Decimal | None,
    take_profit: Decimal | None,
    investment_usd: Decimal | None,
    payout_pct: Decimal | None,
    expiration_seconds: int | None,
) -> None:
    """Enforce consistencia FOREX vs BINARY antes de INSERT.

    Pydantic ya validó tipos (Decimal, int, str) y per-field
    constraints (gt, le). Acá validamos presencia + valores de
    ``direction`` (que el spec divide entre tipos). Cualquier
    inconsistencia levanta ``TradeError(VALIDATION_ERROR, 422)``.
    """
    if type == TradeType.FOREX:
        missing = [
            name
            for name in ("pair", "lot_size", "direction", "entry_price")
            if locals()[name] is None
        ]
        if missing:
            raise TradeError(
                code="VALIDATION_ERROR",
                message=(
                    f"FOREX trade requiere: {', '.join(missing)}"
                ),
                status=422,
            )
        if direction not in (
            ForexDirection.LONG.value,
            ForexDirection.SHORT.value,
        ):
            raise TradeError(
                code="VALIDATION_ERROR",
                message="FOREX direction debe ser LONG o SHORT",
                status=422,
            )
        forbidden = [
            name
            for name in (
                "investment_usd",
                "payout_pct",
                "expiration_seconds",
            )
            if locals()[name] is not None
        ]
        if forbidden:
            raise TradeError(
                code="VALIDATION_ERROR",
                message=(
                    f"FOREX trade no admite: {', '.join(forbidden)}"
                ),
                status=422,
            )
    else:  # BINARY
        missing = [
            name
            for name in (
                "investment_usd",
                "payout_pct",
                "expiration_seconds",
                "direction",
            )
            if locals()[name] is None
        ]
        if missing:
            raise TradeError(
                code="VALIDATION_ERROR",
                message=(
                    f"BINARY trade requiere: {', '.join(missing)}"
                ),
                status=422,
            )
        if direction not in (
            BinaryDirection.CALL.value,
            BinaryDirection.PUT.value,
        ):
            raise TradeError(
                code="VALIDATION_ERROR",
                message="BINARY direction debe ser CALL o PUT",
                status=422,
            )
        forbidden = [
            name
            for name in (
                "pair",
                "lot_size",
                "entry_price",
                "stop_loss",
                "take_profit",
            )
            if locals()[name] is not None
        ]
        if forbidden:
            raise TradeError(
                code="VALIDATION_ERROR",
                message=(
                    f"BINARY trade no admite: {', '.join(forbidden)}"
                ),
                status=422,
            )


# ---------- mutations ----------
async def open_trade(
    db: AsyncSession,
    *,
    user: User,
    account_id: uuid.UUID,
    type: TradeType,
    instrument: str,
    # FOREX
    pair: str | None = None,
    lot_size: Decimal | None = None,
    direction: str | None = None,
    entry_price: Decimal | None = None,
    stop_loss: Decimal | None = None,
    take_profit: Decimal | None = None,
    # BINARY
    investment_usd: Decimal | None = None,
    payout_pct: Decimal | None = None,
    expiration_seconds: int | None = None,
    # common journal (opcionales)
    strategy_id: uuid.UUID | None = None,
    emotional_tags: list[str] | None = None,
    pre_trade_notes: str | None = None,
    screenshots: list[str] | None = None,
    # multi-tenant
    jwt_workspace_ids: list[uuid.UUID] | None = None,
    correlation_id: str | None = None,
) -> Trade:
    """Crea un Trade en estado ``OPEN`` sobre una cuenta del usuario.

    ``TradeCreateIn`` ya validó shape por ``type`` (campos obligatorios
    + valores de ``direction``). Acá validamos consistencia fina
    FOREX (``stop_loss`` debe estar seteado para computar risk) y
    BINARY (``payout_pct`` 70-100).

    Para FOREX computamos ``risk_amount_usd`` y ``risk_pct`` en el
    open. NO mutamos ``balance_usd`` de la cuenta — eso pasa en
    ``close_trade``.

    Devuelve el Trade con ``status=OPEN``.

    p0f.1 (multi-tenant): el ``workspace_id`` se infiere del JWT del
    usuario, igual que en ``create_trading_account``. La cuenta debe
    pertenecer al MISMO workspace (chequeo de coherencia multi-tenant).
    """
    # Shape check FOREX/BINARY antes de tocar DB. Mismo envelope que
    # Pydantic 422 (VALIDATION_ERROR) — el cliente lo mapea igual.
    _validate_open_payload(
        type=type,
        pair=pair,
        lot_size=lot_size,
        direction=direction,
        entry_price=entry_price,
        stop_loss=stop_loss,
        take_profit=take_profit,
        investment_usd=investment_usd,
        payout_pct=payout_pct,
        expiration_seconds=expiration_seconds,
    )

    account = await _get_owned_account(
        db, user_id=user.id, account_id=account_id
    )

    # p0f.1: resolver el workspace activo del usuario + validar que la
    # cuenta vive en ese mismo workspace. Esto cierra el cross-workspace
    # data leak: un user no puede abrir un trade sobre una cuenta de
    # un workspace al que pertenece por membership pero que NO es su
    # workspace activo del JWT.
    try:
        workspace_id = await infer_workspace_id(
            db, user.id, jwt_workspace_ids=jwt_workspace_ids
        )
    except WorkspaceRequiredError as exc:
        raise TradeError(
            code="WORKSPACE_REQUIRED",
            message=str(exc),
            status=422,
        ) from exc
    if account.workspace_id != workspace_id:
        raise TradeError(
            code="NOT_FOUND",
            message=(
                f"trading account {account_id} no encontrada en el "
                f"workspace activo"
            ),
            status=404,
        )

    # ---- FOREX: computar risk_amount + risk_pct ----
    risk_amount_usd: Decimal | None = None
    risk_pct: Decimal | None = None
    if type == TradeType.FOREX:
        # Pydantic ya validó ``lot_size > 0`` y ``entry_price > 0``.
        # Falta ``stop_loss`` para computar riesgo — si lo dejan
        # opcional y no lo mandan, dejamos risk_* en NULL.
        if (
            entry_price is not None
            and stop_loss is not None
            and lot_size is not None
        ):
            risk_amount_usd = (
                abs(entry_price - stop_loss) * lot_size * _HUNDRED
            ).quantize(Decimal("0.01"))
            if account.balance_usd > _ZERO:
                risk_pct = (
                    (risk_amount_usd / account.balance_usd) * _HUNDRED
                ).quantize(Decimal("0.01"))
            else:
                risk_pct = None  # 0/0 indefinido — registramos NULL
        # Sanity: ``take_profit`` sin ``stop_loss`` no es útil — el
        # spec lo deja permitido pero igual lo aceptamos.
    elif type == TradeType.BINARY:
        # ``payout_pct`` ya fue validado por Pydantic (70 ≤ x ≤ 100).
        # Doble-check por defensa: la regla también vive acá para
        # evitar bypass del schema desde tests futuros.
        if payout_pct is not None and not (
            Decimal("70") <= payout_pct <= Decimal("100")
        ):
            raise TradeError(
                code="VALIDATION_ERROR",
                message="payout_pct debe estar entre 70 y 100",
                status=422,
            )

    trade = Trade(
        user_id=user.id,
        workspace_id=workspace_id,
        account_id=account.id,
        instrument=instrument,
        type=type,
        status=TradeStatus.OPEN,
        strategy_id=strategy_id,
        emotional_tags=emotional_tags,
        pre_trade_notes=pre_trade_notes,
        screenshots=screenshots,
        # FOREX
        pair=pair,
        lot_size=lot_size,
        direction=direction,
        entry_price=entry_price,
        stop_loss=stop_loss,
        take_profit=take_profit,
        risk_amount_usd=risk_amount_usd,
        risk_pct=risk_pct,
        # BINARY
        investment_usd=investment_usd,
        payout_pct=payout_pct,
        expiration_seconds=expiration_seconds,
    )
    db.add(trade)
    try:
        await db.flush()
    except IntegrityError as exc:
        # Hardening: si el ``IntegrityError`` vino de un lazy load
        # fuera del greenlet, el ``rollback`` mismo puede tirar otro
        # ``MissingGreenlet``. Comemos cualquier excepción del rollback
        # para no propagar ruido encima del ``TradeError``.
        try:
            await db.rollback()
        except Exception:  # pragma: no cover — path defensivo
            pass
        raise TradeError(
            code="NOT_FOUND",
            message=(
                f"user {user.id} o account {account.id} no existen "
                f"o fueron borrados"
            ),
            status=404,
        ) from exc

    # Snapshot para audit (sin enviar Decimal raw — str() para JSON).
    new_snapshot: dict[str, Any] = {
        "type": type.value,
        "instrument": instrument,
        "status": TradeStatus.OPEN.value,
    }
    if pair is not None:
        new_snapshot["pair"] = pair
    if direction is not None:
        new_snapshot["direction"] = direction
    if risk_amount_usd is not None:
        new_snapshot["risk_amount_usd"] = str(risk_amount_usd)
    if risk_pct is not None:
        new_snapshot["risk_pct"] = str(risk_pct)
    if investment_usd is not None:
        new_snapshot["investment_usd"] = str(investment_usd)
    await _emit_audit(
        db,
        actor_user_id=user.id,
        action="trade.open",
        entity_id=str(trade.id),
        previous=None,
        new=new_snapshot,
        correlation_id=correlation_id,
    )
    await db.commit()
    await db.refresh(trade)
    return trade


async def close_trade(
    db: AsyncSession,
    *,
    user: User,
    trade_id: uuid.UUID,
    type: TradeType,  # informational; coincide con trade.type en runtime
    exit_price: Decimal | None = None,
    outcome: str | None = None,
    post_trade_notes: str | None = None,
    followed_plan: bool | None = None,
    mistakes: str | None = None,
    correlation_id: str | None = None,
) -> Trade:
    """Cierra un Trade ``OPEN``: computa ``pnl_usd``, muta el saldo,
    emite ``trade.close``.

    Pre-condiciones (todas devuelven ``TradeError``):
    - El trade existe y es del usuario → si no, ``404 NOT_FOUND``.
    - El trade está ``OPEN`` → si no, ``422 TRADE_CLOSED``.
    - El campo de cierre coincide con ``type`` (FOREX →
      ``exit_price``, BINARY → ``outcome``) → si no, ``422``.

    Efectos:
    - Actualiza ``status``, ``closed_at``, ``pnl_usd``, ``r_multiple``
      (FOREX), ``exit_price`` (FOREX), ``post_trade_notes``,
      ``followed_plan``, ``mistakes``.
    - ``account.balance_usd += pnl_usd`` (positivo o negativo).
    - Audit ``trade.close`` con ``{pnl, new_balance}`` y previous
      ``{balance}``.
    """
    # Cargamos el trade + su cuenta en un solo round-trip (selectinload)
    # para evitar el lazy-load del relationship cuando mutamos
    # ``account.balance_usd``. Sin esto, ``trade.account.balance_usd``
    # intenta IO fuera del greenlet y SQLAlchemy tira ``MissingGreenlet``.
    stmt = (
        select(Trade)
        .where(
            Trade.id == trade_id,
            Trade.user_id == user.id,
            Trade.deleted_at.is_(None),
        )
        .options(selectinload(Trade.account))
    )
    trade = (await db.execute(stmt)).scalar_one_or_none()
    if trade is None:
        raise TradeError(
            code="NOT_FOUND",
            message=f"trade {trade_id} no encontrado",
            status=404,
        )

    # Locking-style: el trade NO debe estar ya cerrado.
    if trade.status != TradeStatus.OPEN:
        raise TradeError(
            code="TRADE_CLOSED",
            message=(
                f"trade {trade_id} ya esta cerrado "
                f"(status={trade.status.value})"
            ),
            status=422,
        )

    # Dispatch FOREX/BINARY con validación del campo que corresponde.
    pnl_usd: Decimal
    r_multiple: Decimal | None = None
    if trade.type == TradeType.FOREX:
        if exit_price is None:
            raise TradeError(
                code="VALIDATION_ERROR",
                message="FOREX close requiere exit_price",
                status=422,
            )
        if trade.entry_price is None or trade.direction is None or trade.lot_size is None:
            # No debería ocurrir — el open ya validó — pero defensa.
            raise TradeError(
                code="VALIDATION_ERROR",
                message=(
                    "trade FOREX sin entry/direction/lot_size — "
                    "estado inconsistente"
                ),
                status=422,
            )
        sign = _sign(trade.direction)
        pnl_raw = (
            (exit_price - trade.entry_price) * sign * trade.lot_size * _HUNDRED
        )
        pnl_usd = pnl_raw.quantize(Decimal("0.01"))
        trade.exit_price = exit_price
        # r_multiple: si había risk_amount_usd, computamos.
        if trade.risk_amount_usd and trade.risk_amount_usd > _ZERO:
            r_multiple = (
                pnl_usd / trade.risk_amount_usd
            ).quantize(Decimal("0.01"))
    else:  # BINARY
        if outcome is None:
            raise TradeError(
                code="VALIDATION_ERROR",
                message="BINARY close requiere outcome (WIN | LOSS)",
                status=422,
            )
        if (
            trade.investment_usd is None
            or trade.payout_pct is None
        ):
            raise TradeError(
                code="VALIDATION_ERROR",
                message=(
                    "trade BINARY sin investment_usd / payout_pct — "
                    "estado inconsistente"
                ),
                status=422,
            )
        if outcome == "WIN":
            pnl_raw = (
                trade.investment_usd * trade.payout_pct / _HUNDRED
            )
        else:  # LOSS
            pnl_raw = -trade.investment_usd
        pnl_usd = pnl_raw.quantize(Decimal("0.01"))

    # Status según signo del P&L.
    if pnl_usd > _ZERO:
        new_status = TradeStatus.CLOSED_WIN
    elif pnl_usd < _ZERO:
        new_status = TradeStatus.CLOSED_LOSS
    else:
        new_status = TradeStatus.CLOSED_BREAK

    # Snapshot pre-mutación para audit.
    previous = {
        "status": trade.status.value,
        "pnl_usd": None,
    }
    previous_balance = trade.account.balance_usd
    previous_balance_snapshot = str(previous_balance)

    # Mutamos el trade.
    trade.status = new_status
    trade.pnl_usd = pnl_usd
    trade.closed_at = datetime.now(timezone.utc)
    if r_multiple is not None:
        trade.r_multiple = r_multiple
    if post_trade_notes is not None:
        trade.post_trade_notes = post_trade_notes
    if followed_plan is not None:
        trade.followed_plan = followed_plan
    if mistakes is not None:
        trade.mistakes = mistakes

    # Mutamos el saldo de la cuenta (aditiva). Cargamos la cuenta
    # vía relationship para que SQLAlchemy haga el UPDATE.
    trade.account.balance_usd = previous_balance + pnl_usd
    new_balance = trade.account.balance_usd

    await _emit_audit(
        db,
        actor_user_id=user.id,
        action="trade.close",
        entity_id=str(trade.id),
        previous={
            **previous,
            "balance_usd": previous_balance_snapshot,
        },
        new={
            "pnl_usd": str(pnl_usd),
            "new_balance": str(new_balance),
            "status": new_status.value,
        },
        correlation_id=correlation_id,
    )
    await db.commit()
    await db.refresh(trade)
    return trade


# ---------- queries ----------
async def list_trades(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    jwt_workspace_ids: list[uuid.UUID] | None = None,
    account_id: uuid.UUID | None = None,
    status: TradeStatus | None = None,
    type: TradeType | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Trade], int]:
    """Lista paginada de trades del usuario + total.

    Filtros opcionales:
    - ``account_id``: trades sobre una cuenta específica.
    - ``status``: ej. ``OPEN`` para "posiciones abiertas".
    - ``type``: ``FOREX`` o ``BINARY``.

    Excluye soft-deleted (que en p0e.4 nadie borra pero la regla
    queda por simetría con el módulo ``TradingAccount``).

    p0f.1 (multi-tenant): filtra también por el ``workspace_id``
    activo del usuario (derivado del JWT o, en fallback, del lookup
    DB de la membership OWNER más antigua). Esto aísla los trades
    por workspace.
    """
    try:
        workspace_id = await infer_workspace_id(
            db, user_id, jwt_workspace_ids=jwt_workspace_ids
        )
    except WorkspaceRequiredError as exc:
        raise TradeError(
            code="WORKSPACE_REQUIRED",
            message=str(exc),
            status=422,
        ) from exc
    base_where = [
        Trade.user_id == user_id,
        Trade.workspace_id == workspace_id,
        Trade.deleted_at.is_(None),
    ]
    if account_id is not None:
        base_where.append(Trade.account_id == account_id)
    if status is not None:
        base_where.append(Trade.status == status)
    if type is not None:
        base_where.append(Trade.type == type)

    base = (
        select(Trade)
        .where(*base_where)
        .order_by(Trade.opened_at.desc())
        .offset(skip)
        .limit(limit)
    )
    count_stmt = select(func.count()).select_from(Trade).where(*base_where)
    rows = list((await db.execute(base)).scalars().all())
    total = await db.scalar(count_stmt) or 0
    return rows, int(total)


async def get_trade(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    trade_id: uuid.UUID,
    jwt_workspace_ids: list[uuid.UUID] | None = None,
) -> Trade:
    """Trae un trade del usuario. 404 si no existe o es de otro.

    p0f.1 (multi-tenant): filtra también por ``workspace_id`` para
    mantener el aislamiento entre workspaces.
    """
    try:
        workspace_id = await infer_workspace_id(
            db, user_id, jwt_workspace_ids=jwt_workspace_ids
        )
    except WorkspaceRequiredError as exc:
        raise TradeError(
            code="WORKSPACE_REQUIRED",
            message=str(exc),
            status=422,
        ) from exc
    stmt = select(Trade).where(
        Trade.id == trade_id,
        Trade.user_id == user_id,
        Trade.workspace_id == workspace_id,
        Trade.deleted_at.is_(None),
    )
    trade = (await db.execute(stmt)).scalar_one_or_none()
    if trade is None:
        raise TradeError(
            code="NOT_FOUND",
            message=f"trade {trade_id} no encontrado",
            status=404,
        )
    return trade


# ---------- risk summary (Topbar RiskSemaphore) ----------
# Umbrales del semáforo (FASE 4A, provisionales). Vivir como constantes
# a nivel de módulo permite que un test los reemplace por monkeypatch
# si en FASE 4B se quiere parametrizar por config del workspace.
_RED_DAILY_PNL_USD = Decimal("-50")
_YELLOW_OPEN_TRADES = 5


async def get_risk_summary(
    db: AsyncSession,
    *,
    user: User,
    jwt_workspace_ids: list[uuid.UUID] | None = None,
) -> RiskSummaryOut:
    """Compute risk level + daily aggregates for the active workspace.

    Una sola query agregada (4 columnas) sobre ``trades`` filtrada por
    ``workspace_id`` del JWT o fallback DB. Cero round-trips extras —
    el endpoint ``GET /trades/risk-summary`` es consumido por el
    ``RiskSemaphore`` del Topbar con polling de ~10s, así que el costo
    debe ser O(1) sobre la tabla.

    Reglas del semáforo (FASE 4A, simplificadas):

    - ``red``    : ``daily_pnl < -50 USD`` (umbral duro provisional).
    - ``yellow`` : ``daily_pnl < 0`` ó ``open_count > 5``.
    - ``green``  : resto.

    El rango "hoy" es UTC. La simplificación acepta que el P&L diario
    se corte a las 00:00 UTC sin importar el timezone del broker — el
    semáforo es una guía, no un signal de stop-out.
    """
    workspace_id = await infer_workspace_id(
        db, user.id, jwt_workspace_ids=jwt_workspace_ids
    )

    today_start = datetime.combine(
        date.today(), time.min, tzinfo=timezone.utc
    )

    # Una sola round-trip: open_count + daily_pnl + wins_today +
    # closed_today. ``filtered aggregates`` evitan el doble COUNT+SUM
    # sobre subsets distintos de filas.
    stmt = select(
        func.count()
        .filter(Trade.status == TradeStatus.OPEN)
        .label("open_count"),
        func.coalesce(
            func.sum(Trade.pnl_usd).filter(Trade.closed_at >= today_start),
            0,
        ).label("daily_pnl"),
        func.count()
        .filter(
            and_(
                Trade.closed_at >= today_start,
                Trade.status == TradeStatus.CLOSED_WIN,
            )
        )
        .label("wins_today"),
        func.count()
        .filter(
            and_(
                Trade.closed_at >= today_start,
                Trade.status.in_(
                    [TradeStatus.CLOSED_WIN, TradeStatus.CLOSED_LOSS]
                ),
            )
        )
        .label("closed_today"),
    ).where(Trade.workspace_id == workspace_id)

    row = (await db.execute(stmt)).one()
    open_count = row.open_count or 0
    daily_pnl = Decimal(str(row.daily_pnl or 0))
    closed_today = row.closed_today or 0
    wins_today = row.wins_today or 0
    win_rate = (
        wins_today / closed_today if closed_today > 0 else None
    )

    # Semáforo (orden importa: red > yellow > green).
    if daily_pnl < _RED_DAILY_PNL_USD:
        level = "red"
        message = f"Pérdida diaria crítica: ${daily_pnl}"
    elif daily_pnl < 0 or open_count > _YELLOW_OPEN_TRADES:
        level = "yellow"
        message = (
            f"Atención: P&L diario ${daily_pnl}, "
            f"{open_count} abiertas"
        )
    else:
        level = "green"
        message = "Operando dentro de parámetros normales"

    return RiskSummaryOut(
        level=level,
        daily_pnl_usd=daily_pnl,
        open_trades_count=open_count,
        # ``win_rate`` puede ser None cuando no hubo cerradas hoy;
        # el campo del schema es ``float`` (no Optional), así que
        # default a 0.0 — el widget lo interpreta igual: "no data".
        win_rate_today=win_rate if win_rate is not None else 0.0,
        message=message,
    )


__all__ = [
    "TradeError",
    "open_trade",
    "close_trade",
    "list_trades",
    "get_trade",
    "get_risk_summary",
]
