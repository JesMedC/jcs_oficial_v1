"""Accounts endpoints — ``GET /api/v1/accounts`` y ``POST /api/v1/accounts``.

p0d.1: ambas rutas requieren auth (Bearer JWT). El listado pagina las
cuentas del usuario autenticado; el POST crea una nueva con
``balance_usd=0`` (el cliente nunca lo puede setear — ver
``TradingAccountIn``).

Los errores de ``trading_account_service`` se traducen a
``ErrorEnvelope`` en el helper ``_raise_trading_account_error``.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query, Request, status

from app.api.deps import CurrentUser, DbSession
from app.models.trading_account import TradingAccountType
from app.schemas.trading_account import (
    TradingAccountIn,
    TradingAccountListOut,
    TradingAccountOut,
)
from app.services.trading_account_service import (
    TradingAccountError,
    create_trading_account,
    list_user_accounts,
)

router = APIRouter(prefix="/accounts", tags=["accounts"])


def _correlation_id(request: Request) -> str | None:
    return getattr(request.state, "correlation_id", None)


def _raise_trading_account_error(exc: TradingAccountError) -> None:
    """Traduce ``TradingAccountError`` a ``HTTPException`` con envelope.

    Mapea ``status`` directamente:
    - 404 → NOT_FOUND
    - 422 → VALIDATION_ERROR
    - 409 → IDEMPOTENCY_CONFLICT (genérico — reusamos el código canónico)
    - 500+ → INTERNAL_ERROR
    - default 400 → VALIDATION_ERROR
    """
    from fastapi import HTTPException

    from app.schemas.envelope import ErrorCode

    code_map: dict[int, ErrorCode] = {
        404: ErrorCode.NOT_FOUND,
        422: ErrorCode.VALIDATION_ERROR,
        409: ErrorCode.IDEMPOTENCY_CONFLICT,
        500: ErrorCode.INTERNAL_ERROR,
    }
    envelope_code = code_map.get(exc.status, ErrorCode.VALIDATION_ERROR)
    raise HTTPException(
        status_code=exc.status,
        detail={
            "code": envelope_code.value,
            "message": exc.message,
            "correlation_id": "0" * 36,
        },
    )


@router.get("", response_model=TradingAccountListOut)
async def list_accounts(
    user: CurrentUser,
    db: DbSession,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> TradingAccountListOut:
    """Lista paginada de las cuentas de trading del usuario autenticado."""
    rows, total = await list_user_accounts(db, user_id=user.id, skip=skip, limit=limit)
    return TradingAccountListOut(
        items=[TradingAccountOut.model_validate(r) for r in rows],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post(
    "",
    response_model=TradingAccountOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_account(
    payload: TradingAccountIn,
    user: CurrentUser,
    db: DbSession,
    request: Request,
) -> TradingAccountOut:
    """Crea una cuenta de trading para el usuario autenticado.

    ``balance_usd`` siempre queda en 0 — el service no acepta el campo
    y la DB tiene ``server_default=0``.
    """
    try:
        account = await create_trading_account(
            db,
            user=user,
            broker_name=payload.broker_name,
            type=TradingAccountType(payload.type),
            name=payload.name,
            correlation_id=_correlation_id(request),
        )
    except TradingAccountError as exc:
        _raise_trading_account_error(exc)
    return TradingAccountOut.model_validate(account)
