"""Accounts endpoints — ``/api/v1/accounts`` (CRUD + saldo).

p0d.1: ``GET`` y ``POST /accounts`` requieren auth (Bearer JWT). El
listado pagina las cuentas del usuario autenticado; el POST crea una
nueva con ``balance_usd=0`` (el cliente nunca lo puede setear — ver
``TradingAccountIn``).

p0e.2: ``POST /{id}/fund`` y ``POST /{id}/withdraw`` mutan el saldo;
``DELETE /{id}`` hace soft-delete con confirmación explícita. Los 3
garantizan ownership vía el service (404 si la cuenta no es del user
— no leak de existencia).

Los errores de ``trading_account_service`` se traducen a
``ErrorEnvelope`` en el helper ``_raise_trading_account_error``.
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Request, status
from fastapi.responses import Response

from app.api.deps import CurrentUser, DbSession
from app.models.trading_account import TradingAccountType
from app.schemas.envelope import ErrorCode
from app.schemas.trading_account import (
    DeleteIn,
    FundIn,
    TradingAccountIn,
    TradingAccountListOut,
    TradingAccountOut,
    WithdrawIn,
)
from app.services.trading_account_service import (
    TradingAccountError,
    create_trading_account,
    delete_account,
    fund_account,
    list_user_accounts,
    withdraw_account,
)

router = APIRouter(prefix="/accounts", tags=["accounts"])


def _correlation_id(request: Request) -> str | None:
    return getattr(request.state, "correlation_id", None)


def _raise_trading_account_error(exc: TradingAccountError) -> None:
    """Traduce ``TradingAccountError`` a ``HTTPException`` con envelope.

    Reglas (en orden):
    1. Si ``exc.code`` matchea un ``ErrorCode`` conocido (p.ej.
       ``NOT_FOUND``, ``INSUFFICIENT_BALANCE``, ``CONFIRMATION_REQUIRED``)
       se usa ese — preserva la semántica específica del error.
    2. Si no, fallback por ``status``:
       404 → NOT_FOUND, 422 → VALIDATION_ERROR,
       409 → IDEMPOTENCY_CONFLICT, 500 → INTERNAL_ERROR.
    3. Status desconocido → VALIDATION_ERROR (default 400).
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


@router.get("", response_model=TradingAccountListOut)
async def list_accounts(
    user: CurrentUser,
    db: DbSession,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> TradingAccountListOut:
    """Lista paginada de las cuentas de trading del usuario autenticado.

    p0f.1 (multi-tenant): filtra por el ``workspace_id`` activo del
    usuario (derivado del JWT — ver ``infer_workspace_id``).
    """
    rows, total = await list_user_accounts(
        db,
        user_id=user.id,
        jwt_workspace_ids=user.workspace_ids,
        skip=skip,
        limit=limit,
    )
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

    p0f.1 (multi-tenant): el ``workspace_id`` se infiere del JWT (no
    viene en el body — el contrato público se preserva).
    """
    try:
        account = await create_trading_account(
            db,
            user=user,
            broker_name=payload.broker_name,
            type=TradingAccountType(payload.type),
            name=payload.name,
            jwt_workspace_ids=user.workspace_ids,
            correlation_id=_correlation_id(request),
        )
    except TradingAccountError as exc:
        _raise_trading_account_error(exc)
    return TradingAccountOut.model_validate(account)


@router.post(
    "/{account_id}/fund",
    response_model=TradingAccountOut,
)
async def fund_account_endpoint(
    account_id: uuid.UUID,
    payload: FundIn,
    user: CurrentUser,
    db: DbSession,
    request: Request,
) -> TradingAccountOut:
    """Suma ``payload.amount`` al ``balance_usd`` de la cuenta.

    Devuelve la fila actualizada. 404 si la cuenta no es del user o
    fue borrada (mismo envelope que ``create``).
    """
    try:
        account = await fund_account(
            db,
            user=user,
            account_id=account_id,
            amount=payload.amount,
            correlation_id=_correlation_id(request),
        )
    except TradingAccountError as exc:
        _raise_trading_account_error(exc)
    return TradingAccountOut.model_validate(account)


@router.post(
    "/{account_id}/withdraw",
    response_model=TradingAccountOut,
)
async def withdraw_account_endpoint(
    account_id: uuid.UUID,
    payload: WithdrawIn,
    user: CurrentUser,
    db: DbSession,
    request: Request,
) -> TradingAccountOut:
    """Resta ``payload.amount`` del ``balance_usd`` de la cuenta.

    422 con código ``INSUFFICIENT_BALANCE`` si el monto excede el
    saldo actual. 404 si la cuenta no es del user.
    """
    try:
        account = await withdraw_account(
            db,
            user=user,
            account_id=account_id,
            amount=payload.amount,
            correlation_id=_correlation_id(request),
        )
    except TradingAccountError as exc:
        _raise_trading_account_error(exc)
    return TradingAccountOut.model_validate(account)


@router.delete(
    "/{account_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
)
async def delete_account_endpoint(
    account_id: uuid.UUID,
    payload: DeleteIn,
    user: CurrentUser,
    db: DbSession,
    request: Request,
) -> None:
    """Soft delete de la cuenta. Pide ``confirmation == "ELIMINAR"``.

    400 con ``CONFIRMATION_REQUIRED`` si el string no coincide. 404 si
    la cuenta no es del user (no leak de existencia). El row queda en
    la DB con ``deleted_at`` populado — ``GET /accounts`` ya no lo
    incluye pero el audit log persiste.

    Devuelve ``None`` (``response_model=None``) para que FastAPI aplique
    el ``status_code=204`` del decorador y no agregue body.
    """
    try:
        await delete_account(
            db,
            user=user,
            account_id=account_id,
            confirmation=payload.confirmation,
            correlation_id=_correlation_id(request),
        )
    except TradingAccountError as exc:
        _raise_trading_account_error(exc)
    return None
