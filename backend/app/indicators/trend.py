"""Trend & market structure detector.

Approach:

- Take the most recent ``lookback`` candles (default 20).
- Identify swing highs and swing lows using a small ``pivot_window``.
- Bullish structure: last swing high > previous swing high AND last
  swing low > previous swing low (higher-high, higher-low).
- Bearish structure: inverse (lower-high, lower-low).
- Anything else is FLAT and the scanner refuses to emit an alert.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

import pandas as pd


class TrendDirection(str, Enum):
    """Market structure verdict."""

    BULLISH = "bullish"
    BEARISH = "bearish"
    FLAT = "flat"


@dataclass(frozen=True, slots=True)
class StructurePoint:
    """A single swing extreme used to derive the trend."""

    index: int
    price: float


def _find_swings(
    series: pd.Series,
    *,
    window: int,
    kind: str = "high",
) -> list[StructurePoint]:
    """Local extrema of ``series`` with ``window`` bars on each side.

    Args:
        series: ``high`` or ``low`` price series.
        window: bars on each side.
        kind: ``"high"`` returns local maxima, ``"low"`` returns local
            minima. The caller passes the appropriate kind so that a
            rising "low" series is not mistaken for a swing high.
    """
    if kind not in ("high", "low"):
        raise ValueError("kind must be 'high' or 'low'")

    arr = series.to_numpy()
    n = len(series)
    points: list[StructurePoint] = []
    for i in range(window, n - window):
        slice_ = arr[i - window : i + window + 1]
        if kind == "high" and arr[i] == slice_.max():
            points.append(StructurePoint(index=i, price=float(arr[i])))
        elif kind == "low" and arr[i] == slice_.min():
            points.append(StructurePoint(index=i, price=float(arr[i])))
    return points


def detect_trend(
    df: pd.DataFrame,
    *,
    lookback: int = 20,
    pivot_window: int = 3,
) -> TrendDirection:
    """Return the trend verdict over the most recent ``lookback`` candles.

    Args:
        df: OHLCV frame.
        lookback: number of most-recent candles to consider.
        pivot_window: bars on each side for the swing high/low test.

    Returns:
        :class:`TrendDirection` — ``BULLISH``, ``BEARISH`` or ``FLAT``.
    """
    for col in ("high", "low"):
        if col not in df.columns:
            raise ValueError(f"detect_trend requires '{col}' column")

    if len(df) < 2 * pivot_window + 3:
        return TrendDirection.FLAT

    window = df.iloc[-lookback:]
    high_swings = _find_swings(window["high"], window=pivot_window, kind="high")
    low_swings = _find_swings(window["low"], window=pivot_window, kind="low")

    if len(high_swings) < 2 or len(low_swings) < 2:
        return TrendDirection.FLAT

    # Take the last two distinct swings (some pivots are co-located with
    # the same bar; we deduplicate by index).
    last_high = high_swings[-1]
    prev_high = high_swings[-2]
    last_low = low_swings[-1]
    prev_low = low_swings[-2]

    higher_high = last_high.price > prev_high.price
    higher_low = last_low.price > prev_low.price
    lower_high = last_high.price < prev_high.price
    lower_low = last_low.price < prev_low.price

    if higher_high and higher_low:
        return TrendDirection.BULLISH
    if lower_high and lower_low:
        return TrendDirection.BEARISH
    return TrendDirection.FLAT
