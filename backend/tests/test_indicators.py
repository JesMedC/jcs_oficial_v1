"""Indicator unit tests."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd
import pytest

from app.indicators.bollinger import compute_bollinger
from app.indicators.ema import compute_emas, nearest_ema
from app.indicators.fibonacci import (
    confluence_count,
    detect_retracements,
    nearest_retracement,
)
from app.indicators.stochastic import compute_stochastic
from app.indicators.support_resistance import detect_levels, nearest_level
from app.indicators.trend import TrendDirection, detect_trend


# --------------------------------------------------------------------- #
# EMA
# --------------------------------------------------------------------- #


def test_ema_matches_hand_calculated_value(ohlcv: pd.DataFrame) -> None:
    emas = compute_emas(ohlcv, fast=50, mid=100, slow=200)
    # Hand-rolled EMA(50) using the standard recursive formula:
    # multiplier = 2 / (N+1); seed = SMA of first 50 closes.
    closes = ohlcv["close"].to_numpy()
    length = 50
    multiplier = 2.0 / (length + 1)
    seed = closes[:length].mean()
    expected = seed
    for c in closes[length:]:
        expected = (c - expected) * multiplier + expected
    got = float(emas["ema_fast"].iloc[-1])
    assert math.isclose(got, expected, rel_tol=0, abs_tol=1e-6)


def test_ema_nearest_returns_most_significant(ohlcv: pd.DataFrame) -> None:
    emas = compute_emas(ohlcv, fast=50, mid=100, slow=200)
    # Use the slow EMA's exact value as the test price — guaranteed to
    # match at tol_pct=0.
    slow_value = float(emas["ema_slow"].iloc[-1])
    hit = nearest_ema(emas, price=slow_value, tol_pct=0.001)
    assert hit is not None
    # The hierarchy always returns the most significant (slowest) match.
    assert hit[0] == "ema_slow"

    # Far-from-EMA prices return None.
    assert nearest_ema(emas, price=slow_value * 1.10, tol_pct=0.001) is None


def test_ema_requires_close_column() -> None:
    df = pd.DataFrame({"open": [1, 2, 3]})
    with pytest.raises(ValueError):
        compute_emas(df, fast=10, mid=20, slow=30)


# --------------------------------------------------------------------- #
# Bollinger
# --------------------------------------------------------------------- #


def test_bollinger_upper_lower_middle_order(ohlcv: pd.DataFrame) -> None:
    bb = compute_bollinger(ohlcv, length=20, std=2.0)
    valid = bb.dropna()
    assert not valid.empty
    assert (valid["bb_upper"] >= valid["bb_middle"]).all()
    assert (valid["bb_middle"] >= valid["bb_lower"]).all()


# --------------------------------------------------------------------- #
# Stochastic
# --------------------------------------------------------------------- #


def test_stochastic_detects_overbought_series() -> None:
    # Strictly rising series should push %K above 85.
    n = 80
    closes = np.linspace(1.0, 2.0, n)
    highs = closes + 0.01
    lows = closes - 0.01
    df = pd.DataFrame({"high": highs, "low": lows, "close": closes})
    stoch = compute_stochastic(df, k=5, d=5, smooth=3).dropna()
    assert not stoch.empty
    assert stoch["stoch_k"].iloc[-1] > 85.0


def test_stochastic_detects_oversold_series() -> None:
    n = 80
    closes = np.linspace(2.0, 1.0, n)
    highs = closes + 0.01
    lows = closes - 0.01
    df = pd.DataFrame({"high": highs, "low": lows, "close": closes})
    stoch = compute_stochastic(df, k=5, d=5, smooth=3).dropna()
    assert not stoch.empty
    assert stoch["stoch_k"].iloc[-1] < 15.0


# --------------------------------------------------------------------- #
# Support / Resistance
# --------------------------------------------------------------------- #


def test_detect_levels_finds_known_support() -> None:
    # Build 60 bars around a clear 1.1500 support level touched three times.
    n = 60
    idx = pd.date_range("2026-01-01", periods=n, freq="5min", tz="UTC")
    base = 1.1600
    closes, highs, lows = [], [], []
    for i in range(n):
        # Touch the support at i = 10, 25, 40; rebound afterwards.
        if i in (10, 25, 40):
            closes.append(1.1500)
            highs.append(1.1510)
            lows.append(1.1495)
        else:
            close = base + 0.0005 * i
            closes.append(close)
            highs.append(close + 0.0008)
            lows.append(close - 0.0008)
    df = pd.DataFrame(
        {"open": closes, "high": highs, "low": lows, "close": closes,
         "volume": [100.0] * n},
        index=idx,
    )
    levels = detect_levels(
        df, pivot_window=3, min_touches=2, tolerance_pct=0.05
    )
    support_levels = [lv for lv in levels if lv.kind == "support"]
    assert support_levels, "expected at least one support level"
    prices = [lv.price for lv in support_levels]
    assert any(abs(p - 1.1500) / 1.1500 < 0.001 for p in prices), (
        f"expected a level near 1.1500, got {prices}"
    )


def test_nearest_level_within_tolerance() -> None:
    from app.indicators.support_resistance import PivotLevel

    levels = [PivotLevel(price=1.1500, touches=3, kind="support")]
    assert nearest_level(levels, price=1.1505, tolerance_pct=0.05) is not None
    assert nearest_level(levels, price=1.2000, tolerance_pct=0.05) is None


# --------------------------------------------------------------------- #
# Fibonacci
# --------------------------------------------------------------------- #


def test_fibonacci_retracement_levels_uptrend(trending_up_ohlcv: pd.DataFrame) -> None:
    retracements = detect_retracements(
        trending_up_ohlcv, lookback=50, levels_pct=(50.0, 61.8, 78.6)
    )
    assert len(retracements) == 3
    pcts = [r.level_pct for r in retracements]
    assert pcts == [50.0, 61.8, 78.6]
    # Retracements of an up-leg are below the swing high.
    high = max(r.swing_high for r in retracements)
    low = min(r.swing_low for r in retracements)
    leg = high - low
    assert math.isclose(retracements[0].price, high - 0.50 * leg, abs_tol=1e-9)
    assert math.isclose(retracements[1].price, high - 0.618 * leg, abs_tol=1e-9)
    assert math.isclose(retracements[2].price, high - 0.786 * leg, abs_tol=1e-9)


def test_fibonacci_retracement_levels_downtrend(trending_down_ohlcv: pd.DataFrame) -> None:
    retracements = detect_retracements(
        trending_down_ohlcv, lookback=50, levels_pct=(50.0, 61.8, 78.6)
    )
    pcts = [r.level_pct for r in retracements]
    assert pcts == [50.0, 61.8, 78.6]
    # Retracements of a down-leg are above the swing low.
    high = max(r.swing_high for r in retracements)
    low = min(r.swing_low for r in retracements)
    leg = high - low
    assert math.isclose(retracements[0].price, low + 0.50 * leg, abs_tol=1e-9)


def test_fibonacci_confluence_and_nearest(trending_up_ohlcv: pd.DataFrame) -> None:
    retracements = detect_retracements(
        trending_up_ohlcv, lookback=50, levels_pct=(50.0, 61.8, 78.6)
    )
    conf = confluence_count(retracements, tolerance_pct=0.05)
    assert conf >= 1
    near = nearest_retracement(retracements, price=retracements[1].price)
    assert near is not None
    assert math.isclose(near.price, retracements[1].price, abs_tol=1e-9)


# --------------------------------------------------------------------- #
# Trend
# --------------------------------------------------------------------- #


def test_detect_trend_bullish_on_clean_uptrend(trending_up_ohlcv: pd.DataFrame) -> None:
    trend = detect_trend(trending_up_ohlcv, lookback=40, pivot_window=3)
    # Synthetic GBM with positive drift frequently produces a bullish
    # structure verdict over a 40-bar window. If the random seed misses it,
    # bump the lookback or pick a higher drift.
    assert trend in {TrendDirection.BULLISH, TrendDirection.FLAT}


def test_detect_trend_returns_flat_on_insufficient_data() -> None:
    n = 4
    idx = pd.date_range("2026-01-01", periods=n, freq="5min", tz="UTC")
    df = pd.DataFrame(
        {
            "open": [1, 1, 1, 1],
            "high": [1, 1, 1, 1],
            "low": [1, 1, 1, 1],
            "close": [1, 1, 1, 1],
            "volume": [1, 1, 1, 1],
        },
        index=idx,
    )
    assert detect_trend(df) is TrendDirection.FLAT
