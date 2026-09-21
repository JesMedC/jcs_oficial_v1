"""Bollinger Bands (20, 2 sigma by default)."""

from __future__ import annotations

import pandas as pd
import pandas_ta_classic as ta


def compute_bollinger(
    df: pd.DataFrame,
    *,
    length: int,
    std: float,
) -> pd.DataFrame:
    """Return ``["bb_lower", "bb_middle", "bb_upper"]`` for the given params.

    Args:
        df: OHLCV frame (only ``close`` is needed).
        length: SMA length for the middle band (default 20).
        std: Standard deviation multiplier (default 2.0).

    Returns:
        ``DataFrame`` with the same index as ``df``. The first ``length - 1``
        rows are ``NaN`` by construction.

    Raises:
        ValueError: If ``df`` is missing a ``close`` column.
    """
    if "close" not in df.columns:
        raise ValueError("compute_bollinger requires a 'close' column")

    bands = ta.bbands(df["close"], length=length, std=std)
    if bands is None or bands.empty:
        # Series too short to compute a window.
        return pd.DataFrame(
            {
                "bb_lower": pd.Series(float("nan"), index=df.index),
                "bb_middle": pd.Series(float("nan"), index=df.index),
                "bb_upper": pd.Series(float("nan"), index=df.index),
            }
        )

    # pandas-ta-classic column names are e.g. BBL_20_2.0 / BBM_20_2.0 /
    # BBU_20_2.0. We map by prefix to stay robust to std formatting.
    lower_col = next(c for c in bands.columns if c.startswith("BBL_"))
    middle_col = next(c for c in bands.columns if c.startswith("BBM_"))
    upper_col = next(c for c in bands.columns if c.startswith("BBU_"))

    out = pd.DataFrame(
        {
            "bb_lower": bands[lower_col],
            "bb_middle": bands[middle_col],
            "bb_upper": bands[upper_col],
        },
        index=df.index,
    )
    return out
