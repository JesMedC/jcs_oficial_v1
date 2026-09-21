"""Alert domain models.

Pydantic models for the API/WS contract; dataclasses for internal state
inside :class:`app.engine.alerts.AlertStore`.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field


class AlertStatus(str, Enum):
    """Lifecycle of a single alert."""

    PENDING = "PENDING"
    WIN = "WIN"
    LOSS = "LOSS"


Side = Literal["CALL", "PUT"]
ConfirmationKey = Literal[
    "trend_structure",
    "support_resistance",
    "stochastic",
    "ema_interaction",
    "fibonacci",
]


class Alert(BaseModel):
    """Single trading signal emitted by the scanner.

    ``confirmations`` reports which of the 5 binary checks fired. The
    scanner only emits when ``sum(confirmations.values()) >= min_confirmations``
    AND the trend is unambiguous (not FLAT).
    """

    id: str = Field(default_factory=lambda: uuid4().hex)
    symbol: str
    side: Side
    confidence: float = Field(ge=0.0, le=100.0)
    entry_price: float
    entry_time: datetime
    expiry_time: datetime
    status: AlertStatus = AlertStatus.PENDING
    confirmations: dict[ConfirmationKey, bool]
    confirmations_count: int = Field(ge=0, le=5)
    notes: list[str] = Field(default_factory=list)

    @classmethod
    def build(
        cls,
        *,
        symbol: str,
        side: Side,
        entry_price: float,
        entry_time: datetime,
        expiry_minutes: int,
        confirmations: dict[ConfirmationKey, bool],
        confidence: float,
        notes: list[str] | None = None,
    ) -> "Alert":
        """Construct with derived fields populated."""
        if entry_time.tzinfo is None:
            entry_time = entry_time.replace(tzinfo=timezone.utc)
        expiry = entry_time + _minutes(expiry_minutes)
        return cls(
            symbol=symbol,
            side=side,
            entry_price=entry_price,
            entry_time=entry_time,
            expiry_time=expiry,
            confirmations=confirmations,
            confirmations_count=int(sum(confirmations.values())),
            confidence=round(confidence, 2),
            notes=notes or [],
        )


def _minutes(m: int) -> "datetime.timedelta":  # local import to keep top-level clean
    from datetime import timedelta

    return timedelta(minutes=m)
