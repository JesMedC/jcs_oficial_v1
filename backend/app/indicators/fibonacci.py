"""Fibonacci retracement detector.

The implementation:

1. Finds the most recent swing high and swing low over the lookback.
2. Computes retracement levels (50%, 61.8%, 78.6% by default) on the
   impulse leg.
3. Counts "confluence" — how many of the requested levels fall within a
   tolerance band of the same price cluster (used as a confidence bonus).

The scanner queries :func:`detect_retracements` once per tick and asks:

- Is price currently at any retracement level (within tolerance)?
- If yes, how many retracements overlap? Boost confidence by that count.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass(frozen=True, slots=True)
class FibonacciRetracement:
    """A single Fibonacci retracement level."""

    level_pct: float
    price: float
    leg_direction: str  # "up" if retracing an up-leg, "down" otherwise
    swing_high: float
    swing_low: float

    def to_dict(self) -> dict[str, float | str]:
        return {
            "level_pct": self.level_pct,
            "price": self.price,
            "leg_direction": self.leg_direction,
        }


def _find_swing_extrema(
    df: pd.DataFrame,
    *,
    lookback: int,
) -> tuple[float, float]:
    """Return ``(high_price, low_price)`` over the most recent ``lookback`` candles.

    We do not need the index itself; the caller derives direction via
    positional ``argmax/argmin`` on the same window.
    """
    if len(df) < 2:
        raise ValueError("need at least 2 candles for Fibonacci")

    window = df.iloc[-lookback:]
    high_price = float(window["high"].max())
    low_price = float(window["low"].min())
    return high_price, low_price


def detect_retracements(
    df: pd.DataFrame,
    *,
    lookback: int = 50,
    levels_pct: tuple[float, ...] = (50.0, 61.8, 78.6),
) -> list[FibonacciRetracement]:
    """Return retracement levels for the most recent impulse leg.

    Direction is inferred from which extreme came first:

    - low then high  -> up-leg, retracement is a pullback
    - high then low  -> down-leg, retracement is a bounce

    Args:
        df: OHLCV frame.
        lookback: window of recent candles to scan for the impulse leg.
        levels_pct: Fibonacci ratios in percent. Default ``(50, 61.8, 78.6)``.

    Returns:
        List of :class:`FibonacciRetracement`, one per requested level.
    """
    for col in ("high", "low"):
        if col not in df.columns:
            raise ValueError(f"detect_retracements requires '{col}' column")

    if len(df) < 2:
        return []

    effective_lookback = min(lookback, len(df))
    high_price, low_price = _find_swing_extrema(df, lookback=effective_lookback)

    # Direction is fixed by which extreme came first in the window.
    window = df.iloc[-effective_lookback:]
    high_pos = int(window["high"].values.argmax())
    low_pos = int(window["low"].values.argmin())

    leg_range = abs(high_price - low_price)
    if leg_range == 0:
        return []

    if high_pos >= low_pos:
        # Up-leg: low first, then high. Retracement drops from the high.
        leg_direction = "up"
        anchor = high_price
        retracements = [
            anchor - leg_range * (pct / 100.0) for pct in levels_pct
        ]
    else:
        # Down-leg: high first, then low. Retracement rises from the low.
        leg_direction = "down"
        anchor = low_price
        retracements = [
            anchor + leg_range * (pct / 100.0) for pct in levels_pct
        ]

    return [
        FibonacciRetracement(
            level_pct=pct,
            price=float(price),
            leg_direction=leg_direction,
            swing_high=high_price,
            swing_low=low_price,
        )
        for pct, price in zip(levels_pct, retracements)
    ]


def confluence_count(
    retracements: list[FibonacciRetracement],
    *,
    tolerance_pct: float = 0.05,
) -> int:
    """How many retracement levels cluster together within the tolerance.

    Returns the maximum cluster size. Used as a confidence bonus — when
    multiple Fibonacci traces coincide the signal is stronger.
    """
    if len(retracements) < 2:
        return 1 if retracements else 0

    prices = np.array(sorted(r.price for r in retracements))
    best = 1
    current = 1
    for i in range(1, len(prices)):
        diff_pct = abs(prices[i] - prices[i - 1]) / prices[i - 1] * 100.0
        if diff_pct <= tolerance_pct:
            current += 1
            best = max(best, current)
        else:
            current = 1
    return best


def nearest_retracement(
    retracements: list[FibonacciRetracement],
    price: float,
    *,
    tolerance_pct: float = 0.05,
) -> FibonacciRetracement | None:
    """Return the retracement closest to ``price`` within tolerance, or
    ``None``. Used by the confirmation engine to ask "is price at a fib
    level right now?".
    """
    best: FibonacciRetracement | None = None
    best_dist = float("inf")
    for r in retracements:
        dist_pct = abs(r.price - price) / price * 100.0
        if dist_pct <= tolerance_pct and dist_pct < best_dist:
            best = r
            best_dist = dist_pct
    return best
