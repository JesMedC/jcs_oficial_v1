"""Exponential moving averages (50, 100, 200) using pandas-ta-classic."""

from __future__ import annotations

import pandas as pd
import pandas_ta_classic as ta


def compute_emas(
    df: pd.DataFrame,
    *,
    fast: int,
    mid: int,
    slow: int,
) -> pd.DataFrame:
    """Return a frame with columns ``ema_<n>`` for each requested length.

    The EMA hierarchy (200 dominant, then 100, then 50) is encoded in the
    column ordering and used by the confirmation engine to weight
    "price interacting with EMA" confidence bonuses.

    Args:
        df: OHLCV frame (only ``close`` is needed).
        fast: Fast EMA length (default 50).
        mid: Mid EMA length (default 100).
        slow: Slow EMA length (default 200).

    Returns:
        ``DataFrame`` with the same index as ``df`` and columns
        ``["ema_fast", "ema_mid", "ema_slow"]``. The first
        ``max(fast, mid, slow) - 1`` rows are ``NaN`` by construction.
    """
    if "close" not in df.columns:
        raise ValueError("compute_emas requires a 'close' column")

    out = pd.DataFrame(index=df.index)
    for length, name in ((fast, "ema_fast"), (mid, "ema_mid"), (slow, "ema_slow")):
        series = ta.ema(df["close"], length=length)
        if series is None:
            # Defensive: ta.ema may return None if the series is too short.
            out[name] = float("nan")
            continue
        # pandas-ta names it "EMA_<length>". Rename so the caller does not
        # have to know about upstream naming changes.
        if hasattr(series, "name") and series.name:
            series = series.rename(name)
        else:
            series.name = name
        out[name] = series
    return out


def nearest_ema(
    df: pd.DataFrame,
    *,
    price: float,
    tol_pct: float = 0.1,
) -> tuple[str, float] | None:
    """Return ``(ema_name, ema_value)`` for the most-significant EMA within
    ``tol_pct`` of ``price``, or ``None``.

    "Most significant" follows the hierarchy: ``ema_slow`` (200) > ``ema_mid``
    (100) > ``ema_fast`` (50). If two EMAs are equidistant, the slower wins.
    ``tol_pct`` is expressed as a percentage (e.g. ``0.1`` means 0.1%).
    """
    if tol_pct <= 0:
        raise ValueError("tol_pct must be positive")

    order = ("ema_slow", "ema_mid", "ema_fast")
    last = df.iloc[-1]
    for name in order:
        if name not in last:
            continue
        value = float(last[name])
        if value != value:  # NaN
            continue
        diff_pct = abs(value - price) / price * 100.0
        if diff_pct <= tol_pct:
            return name, value
    return None
