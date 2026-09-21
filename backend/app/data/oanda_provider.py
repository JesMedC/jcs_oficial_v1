"""OANDA v20 REST provider — STUB.

This module exists so that flipping ``SCANNER_PROVIDER=oanda`` plus setting
``OANDA_API_TOKEN`` is a one-env-var change. The actual REST + streaming
implementation is intentionally NOT shipped in this milestone; the stub
raises :class:`NotImplementedError` so the failure mode is loud and
actionable rather than silently returning empty data.

When implementing: see https://developer.oanda.com/rest-live-v20/introduction
- v3/instruments/{instrument}/candles for historical OHLCV
- v3/accounts/{accountID}/pricing/stream for live ticks
"""

from __future__ import annotations

from datetime import datetime

import pandas as pd

from app.core.config import Settings
from app.data.provider import MarketDataProvider, OfferSide


class OandaProvider(MarketDataProvider):
    """Stub. Activated by setting ``OANDA_API_TOKEN``."""

    name = "oanda"

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def _ensure_token(self) -> None:
        if not self._settings.oanda_api_token:
            raise NotImplementedError(
                "OandaProvider is a stub. Set OANDA_API_TOKEN (and "
                "OANDA_ACCOUNT_ID) and implement the REST + streaming "
                "call in app/data/oanda_provider.py."
            )

    def supported_intervals(self) -> tuple[int, ...]:
        # OANDA supports M1, M5, M15, M30, H1, H4, D, W, M at the time of
        # writing; the stub exposes this contract so callers can introspect
        # without instantiating the HTTP client.
        return (1, 5, 15, 30, 60, 240, 1440)

    def fetch_candles(
        self,
        symbol: str,
        *,
        interval_minutes: int,
        start: datetime,
        end: datetime,
        offer_side: OfferSide = "bid",
    ) -> pd.DataFrame:
        self.validate_symbol(symbol)
        self._ensure_token()

        # Intentionally unreachable until the REST call is implemented.
        raise NotImplementedError(
            "OandaProvider.fetch_candles is not implemented in this "
            "milestone. Use DukascopyProvider (the default)."
        )
