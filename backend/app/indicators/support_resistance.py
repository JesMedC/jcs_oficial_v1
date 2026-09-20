"""Support / resistance detection via pivot clustering.

Algorithm:

1. Detect local pivots using a sliding window of ``pivot_window`` bars on
   each side (configurable).
2. Cluster pivots that fall within ``tolerance_pct`` of each other using
   a greedy 1-D pass (price-ordered merge).
3. Score each cluster by the number of unique candles that touched it
   (high >= level and low <= level counts as a touch; equality also
   counts).
4. Keep clusters with ``touches >= min_touches``.

The output is a list of :class:`PivotLevel` records sorted by descending
touch count. The scanner uses this list to ask "is the current candle
interacting with any level?".
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable

import pandas as pd


@dataclass(frozen=True, slots=True)
class PivotLevel:
    """A clustered S/R level."""

    price: float
    touches: int
    kind: str  # "support" | "resistance"
    members: tuple[float, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, object]:
        return {
            "price": self.price,
            "touches": self.touches,
            "kind": self.kind,
        }


def _find_pivots(
    df: pd.DataFrame,
    *,
    window: int,
) -> tuple[list[tuple[int, float]], list[tuple[int, float]]]:
    """Return ``(high_pivots, low_pivots)`` as ``(index, price)`` pairs.

    A high pivot at index ``i`` means ``df['high'][i]`` is the highest
    high in ``[i - window, i + window]``. Symmetric for lows.
    """
    if window < 1:
        raise ValueError("window must be >= 1")

    highs = df["high"].to_numpy()
    lows = df["low"].to_numpy()
    n = len(df)

    high_pivots: list[tuple[int, float]] = []
    low_pivots: list[tuple[int, float]] = []

    for i in range(window, n - window):
        window_slice_h = highs[i - window : i + window + 1]
        if highs[i] == window_slice_h.max():
            high_pivots.append((i, float(highs[i])))
        window_slice_l = lows[i - window : i + window + 1]
        if lows[i] == window_slice_l.min():
            low_pivots.append((i, float(lows[i])))

    return high_pivots, low_pivots


def _cluster_pivots(
    pivots: Iterable[tuple[int, float]],
    df: pd.DataFrame,
    *,
    tolerance_pct: float,
) -> list[list[tuple[int, float]]]:
    """Greedy 1-D clustering by price tolerance."""
    sorted_pivots = sorted(pivots, key=lambda x: x[1])
    clusters: list[list[tuple[int, float]]] = []
    for entry in sorted_pivots:
        _, price = entry
        if not clusters:
            clusters.append([entry])
            continue
        last_cluster = clusters[-1]
        anchor = sum(p for _, p in last_cluster) / len(last_cluster)
        if abs(price - anchor) / anchor * 100.0 <= tolerance_pct:
            last_cluster.append(entry)
        else:
            clusters.append([entry])
    return clusters


def _touch_count(
    cluster_indices: Iterable[int],
    df: pd.DataFrame,
    level: float,
    *,
    tolerance_pct: float,
) -> int:
    """Count unique candles whose range (low..high) covers ``level``."""
    band = level * tolerance_pct / 100.0
    touches = 0
    seen: set[int] = set()
    for idx in cluster_indices:
        if idx in seen:
            continue
        seen.add(idx)
        row = df.iloc[idx]
        if (row["low"] - band) <= level <= (row["high"] + band):
            touches += 1
    return touches


def detect_levels(
    df: pd.DataFrame,
    *,
    pivot_window: int,
    min_touches: int,
    tolerance_pct: float = 0.05,
) -> list[PivotLevel]:
    """Return clustered pivot levels with ``touches >= min_touches``.

    Args:
        df: OHLCV frame.
        pivot_window: bars on each side for the local pivot test.
        min_touches: drop clusters whose candle-touch count is below this.
        tolerance_pct: merge tolerance and touch band, in percent of price.

    Returns:
        Sorted list of :class:`PivotLevel` (most-touched first).
    """
    for col in ("high", "low"):
        if col not in df.columns:
            raise ValueError(f"detect_levels requires '{col}' column")

    if len(df) < 2 * pivot_window + 1:
        # Not enough data to find any pivots.
        return []

    high_pivots, low_pivots = _find_pivots(df, window=pivot_window)
    levels: list[PivotLevel] = []

    for kind, pivots in (("resistance", high_pivots), ("support", low_pivots)):
        clusters = _cluster_pivots(pivots, df, tolerance_pct=tolerance_pct)
        for cluster in clusters:
            indices = [i for i, _ in cluster]
            avg_price = sum(p for _, p in cluster) / len(cluster)
            touches = _touch_count(
                indices,
                df,
                avg_price,
                tolerance_pct=tolerance_pct,
            )
            if touches >= min_touches:
                levels.append(
                    PivotLevel(
                        price=avg_price,
                        touches=touches,
                        kind=kind,
                        members=tuple(p for _, p in cluster),
                    )
                )

    levels.sort(key=lambda lv: lv.touches, reverse=True)
    return levels


def nearest_level(
    levels: list[PivotLevel],
    price: float,
    *,
    tolerance_pct: float,
) -> PivotLevel | None:
    """Return the nearest level to ``price`` within the tolerance band, or
    ``None``. Support and resistance are treated equally; the caller
    decides how to map ``price`` (low/high/close) onto a side check.
    """
    best: PivotLevel | None = None
    best_dist = float("inf")
    for lv in levels:
        dist_pct = abs(lv.price - price) / price * 100.0
        if dist_pct <= tolerance_pct and dist_pct < best_dist:
            best = lv
            best_dist = dist_pct
    return best


def nearest_support(
    levels: list[PivotLevel],
    price: float,
    *,
    tolerance_pct: float,
) -> PivotLevel | None:
    """Return the nearest SUPPORT level within tolerance, or ``None``."""
    best: PivotLevel | None = None
    best_dist = float("inf")
    for lv in levels:
        if lv.kind != "support":
            continue
        dist_pct = abs(lv.price - price) / price * 100.0
        if dist_pct <= tolerance_pct and dist_pct < best_dist:
            best = lv
            best_dist = dist_pct
    return best


def nearest_resistance(
    levels: list[PivotLevel],
    price: float,
    *,
    tolerance_pct: float,
) -> PivotLevel | None:
    """Return the nearest RESISTANCE level within tolerance, or ``None``."""
    best: PivotLevel | None = None
    best_dist = float("inf")
    for lv in levels:
        if lv.kind != "resistance":
            continue
        dist_pct = abs(lv.price - price) / price * 100.0
        if dist_pct <= tolerance_pct and dist_pct < best_dist:
            best = lv
            best_dist = dist_pct
    return best
