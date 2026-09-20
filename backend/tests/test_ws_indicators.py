"""WebSocket broadcaster indicator payload contract.

The frontend renders EMA 50/100/200 and Bollinger Bands as line series
on the candlestick chart. Keeping the indicator computation in the
backend (one place, one source of truth) means the broadcaster must
ship indicator values over the wire alongside every candle.

These tests lock the ``indicators`` payload shape so the frontend can
rely on:

- ``series``: a dict keyed by indicator name, each value a list of
  ``{time, value}`` objects in ascending time order.
- ``latest``: a dict keyed by indicator name, each value the most recent
  non-NaN float.

Times are unix seconds (UTC) so the frontend can drop them into
lightweight-charts without any timezone conversion.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
import pytest

from app.api.ws import _INDICATOR_COLUMNS, _build_indicator_payload


# --------------------------------------------------------------------- #
# Fixtures
# --------------------------------------------------------------------- #


@pytest.fixture
def trending_frame() -> pd.DataFrame:
    """260-bar deterministic uptrending frame (5m intervals, UTC)."""
    n = 260
    idx = pd.date_range("2026-01-01", periods=n, freq="5min", tz="UTC")
    rng = np.random.default_rng(11)
    drift = 0.0006
    vol = 0.0003
    rets = rng.normal(loc=drift, scale=vol, size=n)
    close = 1.1500 * np.exp(np.cumsum(rets))
    high = close * (1 + np.abs(rng.normal(0, vol / 2, size=n)))
    low = close * (1 - np.abs(rng.normal(0, vol / 2, size=n)))
    open_ = np.concatenate([[close[0]], close[:-1]])
    return pd.DataFrame(
        {"open": open_, "high": high, "low": low, "close": close,
         "volume": rng.uniform(100, 1000, size=n)},
        index=idx,
    )


# --------------------------------------------------------------------- #
# Tests
# --------------------------------------------------------------------- #


def test_indicator_payload_shape(trending_frame: pd.DataFrame) -> None:
    """The payload exposes the 6 expected series and the latest dict."""
    payload = _build_indicator_payload(
        trending_frame, ema_fast=50, ema_mid=100, ema_slow=200,
        bb_length=20, bb_std=2.0,
    )
    assert set(payload.keys()) == {"series", "latest"}

    expected_keys = {name for name, _ in _INDICATOR_COLUMNS}
    assert set(payload["series"].keys()) == expected_keys
    assert set(payload["latest"].keys()) == expected_keys


def test_indicator_series_are_time_aligned_to_candles(trending_frame: pd.DataFrame) -> None:
    """Each indicator's first point should map to a candle timestamp
    once the warm-up window is satisfied."""
    payload = _build_indicator_payload(
        trending_frame, ema_fast=50, ema_mid=100, ema_slow=200,
        bb_length=20, bb_std=2.0,
    )

    # BB (length=20) warms up after 19 rows; the first valid point sits
    # on the 20th candle, not the very first one.
    bb_warmup_idx = 20 - 1  # = 19
    expected_bb_first_time = int(
        trending_frame.index[bb_warmup_idx].to_pydatetime()
        .astimezone(timezone.utc).timestamp()
    )

    bb_first = payload["series"]["bb_middle"][0]
    assert bb_first["time"] == expected_bb_first_time
    assert isinstance(bb_first["value"], float)

    # EMA 200 should not have a point at the very first candle.
    first_ts = int(trending_frame.index[0].timestamp())
    ema_slow_times = [p["time"] for p in payload["series"]["ema_slow"]]
    assert first_ts not in ema_slow_times, "EMA 200 should be NaN at first candle"

    # Every indicator point should fall on a 5-minute boundary.
    for key, points in payload["series"].items():
        for p in points:
            recovered = datetime.fromtimestamp(p["time"], tz=timezone.utc)
            assert recovered.minute % 5 == 0, f"{key} point not on 5-min boundary"


def test_indicator_payload_drops_nan_warmup(trending_frame: pd.DataFrame) -> None:
    """EMA 200 omits the first 199 rows; verify no NaN sneaks through."""
    payload = _build_indicator_payload(
        trending_frame, ema_fast=50, ema_mid=100, ema_slow=200,
        bb_length=20, bb_std=2.0,
    )
    for key, points in payload["series"].items():
        for p in points:
            # NaN serialises through json as NaN — never let it reach the wire.
            assert p["value"] == p["value"], f"{key} leaked a NaN"
            assert isinstance(p["time"], int)


def test_indicator_latest_matches_last_series_point(trending_frame: pd.DataFrame) -> None:
    """The ``latest`` dict must equal the last point of each series."""
    payload = _build_indicator_payload(
        trending_frame, ema_fast=50, ema_mid=100, ema_slow=200,
        bb_length=20, bb_std=2.0,
    )
    for key, _ in _INDICATOR_COLUMNS:
        series = payload["series"][key]
        assert series, f"expected series for {key}"
        assert payload["latest"][key] == pytest.approx(series[-1]["value"])


def test_indicator_payload_handles_empty_frame() -> None:
    """An empty buffer must not crash the broadcaster."""
    df = pd.DataFrame(columns=["open", "high", "low", "close", "volume"])
    payload = _build_indicator_payload(
        df, ema_fast=50, ema_mid=100, ema_slow=200,
        bb_length=20, bb_std=2.0,
    )
    assert payload == {"series": {}, "latest": {}}


def test_indicator_payload_handles_short_frame() -> None:
    """A frame shorter than the slowest indicator returns empty fields."""
    n = 30
    idx = pd.date_range("2026-01-01", periods=n, freq="5min", tz="UTC")
    df = pd.DataFrame(
        {
            "open": np.full(n, 1.15),
            "high": np.full(n, 1.16),
            "low": np.full(n, 1.14),
            "close": np.full(n, 1.15),
            "volume": np.full(n, 100.0),
        },
        index=idx,
    )
    payload = _build_indicator_payload(
        df, ema_fast=50, ema_mid=100, ema_slow=200,
        bb_length=20, bb_std=2.0,
    )
    # Only BB (length 20) has enough warm-up. EMAs all NaN.
    assert payload["series"]["bb_middle"], "BB should have data"
    assert payload["series"]["ema_fast"] == []
    assert payload["series"]["ema_mid"] == []
    assert payload["series"]["ema_slow"] == []
    assert "bb_middle" in payload["latest"]
    for ema in ("ema_fast", "ema_mid", "ema_slow"):
        assert ema not in payload["latest"]


def test_indicator_times_are_unix_seconds(trending_frame: pd.DataFrame) -> None:
    """The frontend uses lightweight-charts UTCTimestamp = unix seconds."""
    payload = _build_indicator_payload(
        trending_frame, ema_fast=50, ema_mid=100, ema_slow=200,
        bb_length=20, bb_std=2.0,
    )
    first_point = payload["series"]["bb_upper"][0]
    # Sanity check: the seconds value should round-trip back to a 2026 datetime.
    recovered = datetime.fromtimestamp(first_point["time"], tz=timezone.utc)
    assert recovered.year == 2026
    assert recovered.minute in (0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)
