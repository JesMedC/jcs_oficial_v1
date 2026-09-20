"""Market data provider abstract interface.

A provider is responsible for one thing: turning a forex pair into a
``pandas.DataFrame`` of OHLCV candles with a UTC ``DatetimeIndex``.
Everything else (indicator math, scanner logic, WebSocket broadcasting)
lives downstream of this contract.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

import pandas as pd


# Valid offer-side labels exposed to the rest of the app. Providers may map
# these to whatever their source uses (e.g. dukascopy-python uses ints).
OfferSide = Literal["bid", "ask"]


@dataclass(frozen=True, slots=True)
class Candle:
    """Single OHLCV bar in UTC."""

    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float

    def to_dict(self) -> dict[str, float | str]:
        """Serialize for JSON over WebSocket."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "open": self.open,
            "high": self.high,
            "low": self.low,
            "close": self.close,
            "volume": self.volume,
        }


class MarketDataProvider(ABC):
    """Abstract base for forex market data providers.

    Implementations must:

    1. Return a UTC-indexed OHLCV ``DataFrame`` from :meth:`fetch_candles`.
    2. Be safe to call from a single asyncio task (no internal threading).
    3. Map a slash-notation symbol (``"EUR/USD"``) to whatever their
       upstream requires.
    """

    #: Human-readable provider name (used in ``/healthz``).
    name: str = "abstract"

    @abstractmethod
    def fetch_candles(
        self,
        symbol: str,
        *,
        interval_minutes: int,
        start: datetime,
        end: datetime,
        offer_side: OfferSide = "bid",
    ) -> pd.DataFrame:
        """Fetch historical OHLCV candles.

        Args:
            symbol: Forex pair in slash notation, e.g. ``"EUR/USD"``.
            interval_minutes: Candle width. Must be one of the values the
                provider supports (typically 1, 5, 15, 30, 60, ...).
            start: Inclusive UTC start.
            end: Inclusive UTC end.
            offer_side: ``"bid"`` (default) or ``"ask"``.

        Returns:
            ``pandas.DataFrame`` indexed by ``DatetimeIndex`` in UTC with
            columns ``["open", "high", "low", "close", "volume"]``.

        Raises:
            ValueError: If ``symbol`` is unsupported.
            RuntimeError: If the upstream call fails.
        """
        raise NotImplementedError

    @abstractmethod
    def supported_intervals(self) -> tuple[int, ...]:
        """Return the candle intervals (in minutes) this provider supports."""
        raise NotImplementedError

    def validate_symbol(self, symbol: str) -> None:
        """Raise ``ValueError`` if ``symbol`` is not in the known map."""
        if not symbol or "/" not in symbol:
            raise ValueError(
                f"symbol must be in slash notation like 'EUR/USD', got {symbol!r}"
            )
