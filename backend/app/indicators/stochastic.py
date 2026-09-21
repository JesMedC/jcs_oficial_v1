"""Stochastic oscillator (5-5-3 by default)."""

from __future__ import annotations

import pandas as pd
import pandas_ta_classic as ta


def compute_stochastic(
    df: pd.DataFrame,
    *,
    k: int,
    d: int,
    smooth: int,
) -> pd.DataFrame:
    """Return ``["stoch_k", "stoch_d"]`` for the 5-5-3 (or otherwise) setup.

    Args:
        df: OHLCV frame requiring ``high``, ``low`` and ``close``.
        k: %K lookback (default 5).
        d: %D SMA of %K (default 5).
        smooth: smoothing applied to %K before %D is computed (default 3).

    Returns:
        ``DataFrame`` with the same index as ``df``. Columns ``"stoch_k"``
        and ``"stoch_d"``.

    Raises:
        ValueError: If required columns are missing.
    """
    for col in ("high", "low", "close"):
        if col not in df.columns:
            raise ValueError(f"compute_stochastic requires '{col}' column")

    # pandas-ta-classic names the result STOCHk_<k>_<d>_<smooth> and
    # STOCHd_<k>_<d>_<smooth>. We expose those names as plain stoch_k/d.
    out_df = ta.stoch(
        high=df["high"],
        low=df["low"],
        close=df["close"],
        k=k,
        d=d,
        smooth_k=smooth,
    )
    if out_df is None or out_df.empty:
        return pd.DataFrame(
            {
                "stoch_k": pd.Series(float("nan"), index=df.index),
                "stoch_d": pd.Series(float("nan"), index=df.index),
            }
        )

    k_col = next(c for c in out_df.columns if c.startswith("STOCHk_"))
    d_col = next(c for c in out_df.columns if c.startswith("STOCHd_"))

    return pd.DataFrame(
        {
            "stoch_k": out_df[k_col],
            "stoch_d": out_df[d_col],
        },
        index=df.index,
    )
