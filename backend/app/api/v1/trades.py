"""Trades endpoints — ``/api/v1/trades`` (open / list / get / close / risk).

p0e.4: endpoints CRUD + lifecycle, todos requieren auth (Bearer JWT).
Las mutaciones son ``open`` y ``close``. ``close`` es la única que
toca el ``balance_usd`` de la ``TradingAccount`` — el flujo se valida
contra ``account.balance_usd += pnl_usd`` (fórmula del servicio).

FASE 4A: ``GET /risk-summary`` agrega métricas diarias (P&L, open
count, win rate, semáforo) para el widget ``RiskSemaphore`` del
Topbar.

FASE 6A: ``GET /metrics`` agrega los KPIs históricos (win rate,
profit factor, expectancy, Sharpe) + la equity curve del workspace.

``/risk-summary`` y ``/metrics`` son las dos únicas rutas de lectura
que NO devuelven ``TradeOut``, y ambas deben declararse ANTES de
``/{trade_id}`` (ver docstring de cada handler).

Los errores del service (``TradeError``) se traducen a
``ErrorEnvelope`` en ``_raise_trade_error``. Las reglas canónicas:

- ``NOT_FOUND`` → 404 (ownership fail o cuenta/trade inexistente).
- ``TRADE_CLOSED`` → 422 (re-cerrar un trade cerrado).
- ``VALIDATION_ERROR`` → 422 (forma inconsistente FOREX/BINARY).
"""
from __future__ import annotations

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, Request, status

from app.api.deps import CurrentUser, DbSession
from app.models.trade import TradeStatus, TradeType
from app.schemas.envelope import ErrorCode
from app.schemas.trade import (
    MetricsOut,
    RiskSummaryOut,
    SessionStatsOut,
    TradeCloseIn,
    TradeCreateIn,
    TradeListOut,
    TradeOut,
)
from app.services.trade_service import (
    TradeError,
    close_trade,
    get_metrics,
    get_risk_summary,
    get_session_stats,
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
    limit: Annotated[int, Query(ge=1, le=500)] = 50,
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
            interest=payload.interest,
            analysis_image_url=payload.analysis_image_url,
            jwt_workspace_ids=user.workspace_ids,
            correlation_id=_correlation_id(request),
        )
    except TradeError as exc:
        _raise_trade_error(exc)
    return TradeOut.model_validate(trade)


@router.get("/risk-summary", response_model=RiskSummaryOut)
async def get_risk_summary_endpoint(
    user: CurrentUser,
    db: DbSession,
) -> RiskSummaryOut:
    """Estado de riesgo del workspace activo del usuario.

    Consumido por el ``RiskSemaphore`` del Topbar. Una sola query
    agregada (sin N+1) — pensado para polling liviano.

    Multi-tenant: el ``workspace_id`` se resuelve del JWT (o fallback
    DB) en el service, igual que el resto de ``/trades``.

    Se registra ANTES de ``/{trade_id}`` porque FastAPI matchea
    rutas en orden de declaración: si ``risk-summary`` cayera
    después, sería capturado como ``trade_id="risk-summary"`` y
    reventaría en el parsing de UUID.

    FASE 4B hardening: el service ahora puede levantar
    ``TradeError(WORKSPACE_REQUIRED, 422)`` cuando el user no
    tiene workspace resoluble. Lo traducimos al envelope estándar
    acá (mismo patrón que el resto de los handlers de /trades).
    """
    try:
        return await get_risk_summary(
            db,
            user=user,
            jwt_workspace_ids=user.workspace_ids,
        )
    except TradeError as exc:
        _raise_trade_error(exc)


@router.get("/metrics", response_model=MetricsOut)
async def get_metrics_endpoint(
    user: CurrentUser,
    db: DbSession,
    account_id: Annotated[uuid.UUID | None, Query()] = None,
    from_date: Annotated[date | None, Query(alias="from")] = None,
    to_date: Annotated[date | None, Query(alias="to")] = None,
) -> MetricsOut:
    """KPIs de trading + equity curve del workspace activo.

    ``GET /api/v1/trades/metrics?account_id=&from=&to=``

    Los query params de fecha se exponen como ``from`` y ``to`` (el
    contrato publico) pero se reciben como ``from_date`` / ``to_date``
    porque ``from`` es palabra reservada de Python. Mismo truco de
    ``alias`` que ``status_filter`` / ``type_filter`` en ``list_trades``.
    Formato: ``YYYY-MM-DD``, inclusivos ambos extremos.

    Sin ``account_id`` agrega TODAS las cuentas del workspace activo.

    Se registra ANTES de ``/{trade_id}`` por la misma razon que
    ``/risk-summary``: FastAPI matchea en orden de declaracion y si
    cayera despues seria capturado como ``trade_id="metrics"``,
    reventando en el parsing de UUID.
    """
    try:
        return await get_metrics(
            db,
            user=user,
            account_id=account_id,
            from_date=from_date,
            to_date=to_date,
            jwt_workspace_ids=user.workspace_ids,
        )
    except TradeError as exc:
        _raise_trade_error(exc)


@router.get("/session-stats", response_model=SessionStatsOut)
async def get_session_stats_endpoint(
    user: CurrentUser,
    db: DbSession,
    workspace_id: Annotated[uuid.UUID, Query()],
    date_from: Annotated[date, Query()],
    date_to: Annotated[date, Query()],
    account_id: Annotated[uuid.UUID | None, Query()] = None,
) -> SessionStatsOut:
    """Per-session winrate tiles + general tile.

    ``GET /api/v1/trades/session-stats?workspace_id=&date_from=&date_to=``

    Counts trades by 4-band session (REQ-WRS-001..005). Excludes
    ``outcome=BREAK`` from the denominator and ignores
    ``AccountMovement`` rows (the query only reads from ``Trade``).
    ``date_from`` / ``date_to`` are interpreted in the user's
    ``timezone`` from ``users.timezone`` (REQ-DISC-001).

    Se registra ANTES de ``/{trade_id}`` por la misma razon que
    ``/risk-summary`` y ``/metrics``: FastAPI matchea en orden de
    declaracion y si cayera despues seria capturado como
    ``trade_id="session-stats"``.
    """
    try:
        return await get_session_stats(
            db,
            user=user,
            workspace_id=workspace_id,
            date_from=date_from,
            date_to=date_to,
            account_id=account_id,
            jwt_workspace_ids=user.workspace_ids,
        )
    except TradeError as exc:
        _raise_trade_error(exc)


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
            close_image_url=payload.close_image_url,
            correlation_id=_correlation_id(request),
        )
    except TradeError as exc:
        _raise_trade_error(exc)
    return TradeOut.model_validate(updated)
