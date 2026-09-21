"""Shared pytest fixtures.

Provides synthetic OHLCV frames for indicator + engine tests. We avoid
any network calls — tests must run hermetically.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
import pytest


def make_ohlcv(
    n: int = 250,
    *,
    start: datetime | None = None,
    freq: str = "5min",
    base_price: float = 1.1500,
    drift: float = 0.0,
    volatility: float = 0.0005,
    seed: int = 7,
) -> pd.DataFrame:
    """Build a deterministic synthetic OHLCV frame.

    Uses geometric Brownian motion so the candle structure is realistic
    enough to exercise the indicator stack.
    """
    rng = np.random.default_rng(seed)
    start = start or datetime(2026, 1, 1, tzinfo=timezone.utc)
    idx = pd.date_range(start=start, periods=n, freq=freq, tz="UTC")

    returns = rng.normal(loc=drift, scale=volatility, size=n)
    closes = base_price * np.exp(np.cumsum(returns))
    highs = closes * (1 + np.abs(rng.normal(0, volatility / 2, size=n)))
    lows = closes * (1 - np.abs(rng.normal(0, volatility / 2, size=n)))
    opens = np.concatenate([[closes[0]], closes[:-1]])
    volumes = rng.uniform(100, 1000, size=n)

    return pd.DataFrame(
        {
            "open": opens,
            "high": highs,
            "low": lows,
            "close": closes,
            "volume": volumes,
        },
        index=idx,
    )


@pytest.fixture
def ohlcv() -> pd.DataFrame:
    """Default 250-bar synthetic OHLCV."""
    return make_ohlcv()


@pytest.fixture
def trending_up_ohlcv() -> pd.DataFrame:
    """Strongly trending upward series for Fibonacci / S/R tests."""
    return make_ohlcv(n=300, drift=0.0008, volatility=0.0003, seed=42)


@pytest.fixture
def trending_down_ohlcv() -> pd.DataFrame:
    """Strongly trending downward series for bearish-structure tests."""
    return make_ohlcv(n=300, drift=-0.0008, volatility=0.0003, seed=99)
