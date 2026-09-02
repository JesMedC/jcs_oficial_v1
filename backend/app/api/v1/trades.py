"""Trades endpoints — ``/api/v1/trades`` (open / list / get / close).

p0e.4: 4 endpoints, todos requieren auth (Bearer JWT). Las
mutaciones son ``open`` y ``close``. ``close`` es la única que toca
el ``balance_usd`` de la ``TradingAccount`` — el flujo se valida
contra ``account.balance_usd += pnl_usd`` (fórmula del servicio).

Los errores del service (``TradeError``) se traducen a
``ErrorEnvelope`` en ``_raise_trade_error``. Las reglas canónicas:

- ``NOT_FOUND`` → 404 (ownership fail o cuenta/trade inexistente).
- ``TRADE_CLOSED`` → 422 (re-cerrar un trade cerrado).
- ``VALIDATION_ERROR`` → 422 (forma inconsistente FOREX/BINARY).
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Request, status

from app.api.deps import CurrentUser, DbSession
from app.models.trade import TradeStatus, TradeType
from app.schemas.envelope import ErrorCode
from app.schemas.trade import (
    TradeCloseIn,
    TradeCreateIn,
    TradeListOut,
    TradeOut,
)
from app.services.trade_service import (
    TradeError,
    close_trade,
    get_trade,
    list_trades,
    open_trade,
)

router = APIRouter(prefix="/trades", tags=["trades"])


def _correlation_id(request: Request) -> str | None:
    return getattr(request.state, "correlation_id", None)


def _raise_trade_error(exc: TradeError) -> None:
    """Traduce ``TradeError`` a ``HTTPException`` con envelope.

    Misma política que ``_raise_trading_account_error`` del módulo
    ``accounts``:

    1. Si ``exc.code`` matchea un ``ErrorCode`` conocido, se usa ese.
    2. Fallback por ``status``: 404→``NOT_FOUND``, 422→``VALIDATION_ERROR``,
       409→``IDEMPOTENCY_CONFLICT``, 500→``INTERNAL_ERROR``.
    3. Status desconocido → ``VALIDATION_ERROR``.
    """
    from fastapi import HTTPException

    code_map: dict[int, ErrorCode] = {
        404: ErrorCode.NOT_FOUND,
        422: ErrorCode.VALIDATION_ERROR,
        409: ErrorCode.IDEMPOTENCY_CONFLICT,
        500: ErrorCode.INTERNAL_ERROR,
    }
    try:
        envelope_code = ErrorCode(exc.code)
    except ValueError:
        envelope_code = code_map.get(exc.status, ErrorCode.VALIDATION_ERROR)
    raise HTTPException(
        status_code=exc.status,
        detail={
            "code": envelope_code.value,
            "message": exc.message,
            "correlation_id": "0" * 36,
        },
    )


@router.get("", response_model=TradeListOut)
async def list_trades_endpoint(
    user: CurrentUser,
    db: DbSession,
    account_id: Annotated[uuid.UUID | None, Query()] = None,
    status_filter: Annotated[TradeStatus | None, Query(alias="status")] = None,
    type_filter: Annotated[TradeType | None, Query(alias="type")] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> TradeListOut:
    """Lista paginada de trades del usuario autenticado.

    Query params opcionales: ``account_id``, ``status``, ``type``.
    Devuelve ordenados por ``opened_at`` desc (lo más reciente
    primero).
    """
    rows, total = await list_trades(
        db,
        user_id=user.id,
        jwt_workspace_ids=user.workspace_ids,
        account_id=account_id,
        status=status_filter,
        type=type_filter,
        skip=skip,
        limit=limit,
    )
    return TradeListOut(
        items=[TradeOut.model_validate(r) for r in rows],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post(
    "",
    response_model=TradeOut,
    status_code=status.HTTP_201_CREATED,
)
async def open_trade_endpoint(
    payload: TradeCreateIn,
    user: CurrentUser,
    db: DbSession,
    request: Request,
) -> TradeOut:
    """Abre un trade del usuario en estado ``OPEN``.

    Delega al service ``open_trade``: valida ownership de la cuenta,
    consistencia FOREX/BINARY, y computa ``risk_amount_usd`` /
    ``risk_pct`` (sólo FOREX). No muta el saldo de la cuenta — eso
    pasa en ``close``.
    """
    try:
        trade = await open_trade(
            db,
            user=user,
            account_id=payload.account_id,
            type=TradeType(payload.type),
            instrument=payload.instrument,
            pair=payload.pair,
            lot_size=payload.lot_size,
            direction=payload.direction,
            entry_price=payload.entry_price,
            stop_loss=payload.stop_loss,
            take_profit=payload.take_profit,
            investment_usd=payload.investment_usd,
            payout_pct=payload.payout_pct,
            expiration_seconds=payload.expiration_seconds,
            strategy_id=payload.strategy_id,
            emotional_tags=payload.emotional_tags,
            pre_trade_notes=payload.pre_trade_notes,
            screenshots=payload.screenshots,
            jwt_workspace_ids=user.workspace_ids,
            correlation_id=_correlation_id(request),
        )
    except TradeError as exc:
        _raise_trade_error(exc)
    return TradeOut.model_validate(trade)


@router.get("/{trade_id}", response_model=TradeOut)
async def get_trade_endpoint(
    trade_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
) -> TradeOut:
    """Devuelve un trade del usuario. 404 si es de otro o no existe."""
    try:
        trade = await get_trade(
            db,
            user_id=user.id,
            trade_id=trade_id,
            jwt_workspace_ids=user.workspace_ids,
        )
    except TradeError as exc:
        _raise_trade_error(exc)
    return TradeOut.model_validate(trade)


@router.post("/{trade_id}/close", response_model=TradeOut)
async def close_trade_endpoint(
    trade_id: uuid.UUID,
    payload: TradeCloseIn,
    user: CurrentUser,
    db: DbSession,
    request: Request,
) -> TradeOut:
    """Cierra un trade ``OPEN``: computa ``pnl_usd`` y muta el saldo.

    El campo de cierre (``exit_price`` para FOREX, ``outcome`` para
    BINARY) lo elige el service según ``trade.type``. Si el trade
    ya está cerrado → 422 ``TRADE_CLOSED``. Si no es del user →
    404 ``NOT_FOUND``.
    """
    # Cargamos antes para conocer ``type`` antes de pasar al service
    # (el discriminador del body depende del tipo del trade).
    try:
        trade = await get_trade(
            db,
            user_id=user.id,
            trade_id=trade_id,
            jwt_workspace_ids=user.workspace_ids,
        )
    except TradeError as exc:
        _raise_trade_error(exc)

    try:
        updated = await close_trade(
            db,
            user=user,
            trade_id=trade.id,
            type=trade.type,
            exit_price=payload.exit_price,
            outcome=payload.outcome,
            post_trade_notes=payload.post_trade_notes,
            followed_plan=payload.followed_plan,
            mistakes=payload.mistakes,
            correlation_id=_correlation_id(request),
        )
    except TradeError as exc:
        _raise_trade_error(exc)
    return TradeOut.model_validate(updated)
