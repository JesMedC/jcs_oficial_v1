"""Dukascopy Bank public-data provider.

Uses the ``dukascopy-python`` library to pull bi5 tick data and aggregate
into OHLCV at a fixed interval. Free, no token, no rate-limiting, public
CDN. This is the default provider.

The bi5 stream publishes tick data; this module calls ``fetch`` which
does the server-side aggregation for us. The resulting ``DataFrame`` is
UTC-indexed and matches the contract documented on
:class:`MarketDataProvider`.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import pandas as pd

from app.data.provider import MarketDataProvider, OfferSide


# Map of slash notation -> dukascopy-python instrument constant. We import
# lazily inside :func:`_resolve_instrument` so the rest of the app does not
# pay the import cost and so a missing dependency surfaces with a clear
# error pointing at the offending symbol.
_INSTRUMENT_MAP: dict[str, str] = {
    "EUR/USD": "INSTRUMENT_FX_MAJORS_EUR_USD",
    "GBP/USD": "INSTRUMENT_FX_MAJORS_GBP_USD",
    "USD/JPY": "INSTRUMENT_FX_MAJORS_USD_JPY",
    "AUD/USD": "INSTRUMENT_FX_MAJORS_AUD_USD",
    "USD/CAD": "INSTRUMENT_FX_MAJORS_USD_CAD",
    "USD/CHF": "INSTRUMENT_FX_MAJORS_USD_CHF",
    "NZD/USD": "INSTRUMENT_FX_MAJORS_NZD_USD",
}


# dukascopy-python uses int codes for intervals; these are the ones we
# actually need (5-minute is fixed by the strategy spec but we keep the
# mapping so callers can audit what is supported).
_INTERVAL_MAP: dict[int, str] = {
    1: "INTERVAL_MIN_1",
    5: "INTERVAL_MIN_5",
    15: "INTERVAL_MIN_15",
    30: "INTERVAL_MIN_30",
    60: "INTERVAL_HOUR",
    240: "INTERVAL_HOUR_4",
    1440: "INTERVAL_DAY",
}

_OFFER_SIDE_MAP: dict[OfferSide, str] = {
    "bid": "OFFER_SIDE_BID",
    "ask": "OFFER_SIDE_ASK",
}


def _resolve_instrument(symbol: str) -> Any:
    """Resolve ``"EUR/USD"`` -> the actual dukascopy-python constant.

    Raises:
        ValueError: if the symbol is not in the known map and the generic
            fallback would produce a name that does not exist in the
            upstream library.
    """
    import dukascopy_python.instruments as instruments  # local import

    attr = _INSTRUMENT_MAP.get(symbol)
    if attr is None:
        # Generic fallback: "EUR/USD" -> INSTRUMENT_FX_MAJORS_EUR_USD
        base, quote = symbol.split("/", 1)
        attr = f"INSTRUMENT_FX_MAJORS_{base}_{quote}"
    try:
        return getattr(instruments, attr)
    except AttributeError as exc:
        raise ValueError(
            f"Unknown Dukascopy instrument for symbol {symbol!r} "
            f"(looked for attribute {attr!r})"
        ) from exc


class DukascopyProvider(MarketDataProvider):
    """Default provider. No token required."""

    name = "dukascopy"

    def supported_intervals(self) -> tuple[int, ...]:
        return tuple(sorted(_INTERVAL_MAP.keys()))

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

        if interval_minutes not in _INTERVAL_MAP:
            raise ValueError(
                f"DukascopyProvider does not support interval "
                f"{interval_minutes}m (supported: {self.supported_intervals()})"
            )

        # Local imports so the package loads even if dukascopy-python is
        # not installed (e.g. for type-checking or CI without the C lib).
        from dukascopy_python import fetch  # noqa: WPS433

        instrument = _resolve_instrument(symbol)
        interval = getattr(
            __import__("dukascopy_python", fromlist=[_INTERVAL_MAP[interval_minutes]]),
            _INTERVAL_MAP[interval_minutes],
        )
        side = getattr(
            __import__("dukascopy_python", fromlist=[_OFFER_SIDE_MAP[offer_side]]),
            _OFFER_SIDE_MAP[offer_side],
        )

        df = fetch(
            instrument=instrument,
            interval=interval,
            offer_side=side,
            start=start,
            end=end,
        )

        if df is None or df.empty:
            # Return an empty frame with the expected schema so callers can
            # rely on column access without special-casing.
            return pd.DataFrame(
                columns=["open", "high", "low", "close", "volume"],
            ).astype(
                {
                    "open": "float64",
                    "high": "float64",
                    "low": "float64",
                    "close": "float64",
                    "volume": "float64",
                }
            )

        # Defensive: ensure UTC-aware index even if upstream ever changes.
        if df.index.tz is None:
            df.index = df.index.tz_localize("UTC")
        else:
            df.index = df.index.tz_convert("UTC")

        return df
