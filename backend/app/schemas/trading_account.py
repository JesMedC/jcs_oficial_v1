"""TradingAccount schemas — request/response.

p0d.1: ``TradingAccountIn`` NO incluye ``balance_usd`` — siempre arranca
en 0 al crear (el default vive en la DB). ``TradingAccountOut`` lo
expone para que el cliente sepa el estado actual.
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


__all__ = [
    "TradingAccountIn",
    "TradingAccountOut",
    "TradingAccountListOut",
]
