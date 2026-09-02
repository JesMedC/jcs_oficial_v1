"""TradingAccount schemas — request/response.

p0d.1: ``TradingAccountIn`` NO incluye ``balance_usd`` — siempre arranca
en 0 al crear (el default vive en la DB). ``TradingAccountOut`` lo
expone para que el cliente sepa el estado actual.

p0e.2: ``FundIn`` y ``WithdrawIn`` validan ``amount`` con la misma
precisión que la columna (``Numeric(10, 2)``) y exigen ``> 0``.
``DeleteIn`` exige una palabra de confirmación explícita (``"ELIMINAR"``)
para que el frontend no pueda borrar cuentas con un click perdido.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.trading_account import TradingAccountType


class TradingAccountIn(BaseModel):
    """Body para ``POST /api/v1/accounts``.

    ``balance_usd`` no se acepta — el service lo deja en 0 (default DB).
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    broker_name: str = Field(min_length=1, max_length=100)
    type: Literal["BINARY", "FOREX"]
    name: str = Field(min_length=1, max_length=100)


class TradingAccountOut(BaseModel):
    """Fila de ``trading_accounts`` tal como la devuelve la API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    broker_name: str
    type: TradingAccountType
    name: str
    balance_usd: Decimal
    created_at: datetime
    updated_at: datetime


class TradingAccountListOut(BaseModel):
    """Envelope paginado para ``GET /api/v1/accounts``."""

    items: list[TradingAccountOut]
    total: int
    skip: int
    limit: int


class FundIn(BaseModel):
    """Body para ``POST /api/v1/accounts/{id}/fund``.

    ``amount`` > 0 con la misma precisión que la columna
    (``Numeric(10, 2)``). Rechaza montos negativos o cero desde la capa
    de validación — el service no necesita repetir la comprobación.
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    amount: Decimal = Field(
        gt=Decimal("0"),
        max_digits=10,
        decimal_places=2,
    )


class WithdrawIn(BaseModel):
    """Body para ``POST /api/v1/accounts/{id}/withdraw``.

    Mismas reglas que ``FundIn`` (``amount > 0``, ``Numeric(10, 2)``).
    El check ``amount <= balance_usd`` lo hace el service, no Pydantic,
    porque depende del estado actual del row.
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    amount: Decimal = Field(
        gt=Decimal("0"),
        max_digits=10,
        decimal_places=2,
    )


class DeleteIn(BaseModel):
    """Body para ``DELETE /api/v1/accounts/{id}``.

    ``confirmation`` debe valer exactamente ``"ELIMINAR"`` (case
    sensitive) — el service lo valida y devuelve ``CONFIRMATION_REQUIRED``
    si no coincide. Acá sólo garantizamos que el string llegue no vacío
    y acotado (un body gigante no tiene sentido).
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    confirmation: str = Field(min_length=1, max_length=50)


__all__ = [
    "TradingAccountIn",
    "TradingAccountOut",
    "TradingAccountListOut",
    "FundIn",
    "WithdrawIn",
    "DeleteIn",
]
