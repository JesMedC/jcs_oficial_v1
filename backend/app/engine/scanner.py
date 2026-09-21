"""5-point confirmation engine.

Inputs:

- ``df``: rolling OHLCV buffer (UTC-indexed). Must contain enough bars for
  the slowest indicator (200 EMA -> 200+ rows).
- ``forming_candle``: the most recent bar. Used as the "price right now"
  reference. When the bar is closed (its timestamp is older than
  ``scanner_tick``) we evaluate against its close; otherwise we evaluate
  against its high/low to capture the in-progress move.

Outputs:

- :class:`ScannerResult` containing the per-check boolean verdict, the
  computed trend, the candidate ``Alert`` (if any), and a list of human
  notes for debugging.

The engine is pure: it does not mutate the input frame and it does not
talk to the network. This makes it trivially testable.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

import pandas as pd

from app.core.config import Settings
from app.engine.models import Alert, ConfirmationKey
from app.indicators.bollinger import compute_bollinger
from app.indicators.ema import compute_emas, nearest_ema
from app.indicators.fibonacci import (
    FibonacciRetracement,
    confluence_count,
    detect_retracements,
    nearest_retracement,
)
from app.indicators.stochastic import compute_stochastic
from app.indicators.support_resistance import (
    PivotLevel,
    detect_levels,
    nearest_resistance,
    nearest_support,
)
from app.indicators.trend import TrendDirection, detect_trend


Side = Literal["CALL", "PUT"]

# Per-confirmation confidence bonuses (added to the 60% base).
_BONUS_STOCH_EXTREME = 5.0
_BONUS_SR_TOUCH = 5.0
_BONUS_EMA_FAST = 5.0   # EMA 50
_BONUS_EMA_MID = 10.0    # EMA 100
_BONUS_EMA_SLOW = 15.0   # EMA 200
_BONUS_FIB_CONFLUENCE_PER_EXTRA = 3.0
_BONUS_FIB_BASE = 3.0
_BASE_CONFIDENCE = 60.0


@dataclass
class ScannerResult:
    """Outcome of one scanner evaluation."""

    trend: TrendDirection
    side: Side | None
    confirmations: dict[ConfirmationKey, bool]
    confidence: float
    notes: list[str] = field(default_factory=list)
    alert: Alert | None = None

    @property
    def fired(self) -> bool:
        return self.alert is not None

    @property
    def confirmations_count(self) -> int:
        return int(sum(self.confirmations.values()))


class Scanner:
    """Stateless confirmation engine. Construct once, call repeatedly."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def evaluate(
        self,
        df: pd.DataFrame,
        *,
        symbol: str,
        current_time: datetime,
    ) -> ScannerResult:
        """Run the 5-point check on ``df`` and the latest forming candle.

        The last row of ``df`` is treated as the "current" candle.
        """
        notes: list[str] = []
        if df.empty or len(df) < 2:
            notes.append("not enough data to evaluate")
            return ScannerResult(
                trend=TrendDirection.FLAT,
                side=None,
                confirmations={k: False for k in _CONFIRMATION_KEYS},
                confidence=0.0,
                notes=notes,
            )

        # -- Indicators ------------------------------------------------- #
        emas = compute_emas(
            df,
            fast=self._settings.ema_fast,
            mid=self._settings.ema_mid,
            slow=self._settings.ema_slow,
        )
        bb = compute_bollinger(
            df,
            length=self._settings.bollinger_length,
            std=self._settings.bollinger_std,
        )
        stoch = compute_stochastic(
            df,
            k=self._settings.stoch_k,
            d=self._settings.stoch_d,
            smooth=self._settings.stoch_smooth,
        )

        enriched = pd.concat([df, emas, bb, stoch], axis=1)
        enriched = enriched.dropna(subset=["close"]).copy()

        if enriched.empty:
            notes.append("all indicators NaN after warm-up")
            return ScannerResult(
                trend=TrendDirection.FLAT,
                side=None,
                confirmations={k: False for k in _CONFIRMATION_KEYS},
                confidence=0.0,
                notes=notes,
            )

        last = enriched.iloc[-1]
        prev = enriched.iloc[-2]
        price = float(last["close"])

        # -- Trend ------------------------------------------------------ #
        trend = detect_trend(
            enriched,
            lookback=self._settings.trend_lookback,
            pivot_window=self._settings.trend_pivot_window,
        )
        if trend is TrendDirection.FLAT:
            notes.append("trend is FLAT — refusing to emit alert")
            return ScannerResult(
                trend=TrendDirection.FLAT,
                side=None,
                confirmations={k: False for k in _CONFIRMATION_KEYS},
                confidence=0.0,
                notes=notes,
            )

        side: Side = "CALL" if trend is TrendDirection.BULLISH else "PUT"

        # -- 1. Trend & structure -------------------------------------- #
        c1 = (
            (trend is TrendDirection.BULLISH and price > float(last["ema_fast"]))
            or (trend is TrendDirection.BEARISH and price < float(last["ema_fast"]))
        )
        if c1:
            notes.append(
                f"trend_structure: {trend.value} & price vs EMA{self._settings.ema_fast} aligned"
            )
        else:
            notes.append(
                f"trend_structure: {trend.value} but price on wrong side of EMA{self._settings.ema_fast}"
            )

        # -- 2. Support / resistance ----------------------------------- #
        levels = detect_levels(
            enriched,
            pivot_window=self._settings.sr_pivot_window,
            min_touches=self._settings.sr_min_touches,
            tolerance_pct=self._settings.sr_tolerance_pct,
        )
        c2 = False
        sr_bonus = 0.0
        if side == "CALL":
            ref_price = float(last["low"])
            lv = nearest_support(
                levels, ref_price, tolerance_pct=self._settings.sr_tolerance_pct
            )
            if lv is not None:
                c2 = True
                sr_bonus = _BONUS_SR_TOUCH
                notes.append(
                    f"support_resistance: low touching support @ {lv.price:.5f} (touches={lv.touches})"
                )
        else:  # PUT
            ref_price = float(last["high"])
            lv = nearest_resistance(
                levels, ref_price, tolerance_pct=self._settings.sr_tolerance_pct
            )
            if lv is not None:
                c2 = True
                sr_bonus = _BONUS_SR_TOUCH
                notes.append(
                    f"support_resistance: high touching resistance @ {lv.price:.5f} (touches={lv.touches})"
                )
        if not c2:
            notes.append("support_resistance: no qualifying level touch")

        # -- 3. Stochastic in zone ------------------------------------- #
        stoch_k = float(last["stoch_k"])
        stoch_d = float(last["stoch_d"])
        stoch_prev_k = float(prev["stoch_k"])
        stoch_zone_ok = (
            (stoch_k < self._settings.stoch_oversold and trend is TrendDirection.BULLISH)
            or (
                stoch_k > self._settings.stoch_overbought
                and trend is TrendDirection.BEARISH
            )
        )
        # Require a cross of %K through %D in the right direction to make
        # the signal less spammy. Bullish oversold -> %K crosses above %D.
        # Bearish overbought -> %K crosses below %D.
        if trend is TrendDirection.BULLISH:
            cross_ok = (stoch_prev_k <= stoch_d) and (stoch_k > stoch_d)
        else:
            cross_ok = (stoch_prev_k >= stoch_d) and (stoch_k < stoch_d)
        c3 = bool(stoch_zone_ok and cross_ok)
        stoch_bonus = _BONUS_STOCH_EXTREME if c3 else 0.0
        if c3:
            notes.append(
                f"stochastic: %K={stoch_k:.2f} in zone + crossed %D={stoch_d:.2f}"
            )
        else:
            notes.append(
                f"stochastic: zone_ok={stoch_zone_ok} cross_ok={cross_ok} "
                f"(K={stoch_k:.2f}, D={stoch_d:.2f})"
            )

        # -- 4. EMA interaction (hierarchy-aware) ---------------------- #
        ema_hit = nearest_ema(
            enriched, price=price, tol_pct=self._settings.ema_tolerance_pct
        )
        c4 = ema_hit is not None
        ema_bonus = 0.0
        if ema_hit is not None:
            name, _value = ema_hit
            if name == "ema_slow":
                ema_bonus = _BONUS_EMA_SLOW
            elif name == "ema_mid":
                ema_bonus = _BONUS_EMA_MID
            else:
                ema_bonus = _BONUS_EMA_FAST
            notes.append(f"ema_interaction: price touching {name} (bonus={ema_bonus})")
        else:
            notes.append(
                f"ema_interaction: no EMA within {self._settings.ema_tolerance_pct}%"
            )

        # -- 5. Fibonacci at key level --------------------------------- #
        fibs = detect_retracements(
            enriched,
            lookback=50,
            levels_pct=tuple(self._settings.fib_levels),
        )
        fib_ref_price = float(last["low"]) if side == "CALL" else float(last["high"])
        fib_hit = nearest_retracement(
            fibs, fib_ref_price, tolerance_pct=self._settings.fib_tolerance_pct
        )
        c5 = fib_hit is not None
        fib_bonus = 0.0
        if fib_hit is not None:
            conf = confluence_count(fibs, tolerance_pct=self._settings.fib_tolerance_pct)
            fib_bonus = _BONUS_FIB_BASE + max(0, conf - 1) * _BONUS_FIB_CONFLUENCE_PER_EXTRA
            notes.append(
                f"fibonacci: hit {fib_hit.level_pct}% @ {fib_hit.price:.5f} "
                f"(confluence={conf}, bonus={fib_bonus})"
            )
        else:
            notes.append("fibonacci: price not at a 50/61.8/78.6 retrace")

        confirmations: dict[ConfirmationKey, bool] = {
            "trend_structure": bool(c1),
            "support_resistance": bool(c2),
            "stochastic": bool(c3),
            "ema_interaction": bool(c4),
            "fibonacci": bool(c5),
        }
        count = int(sum(confirmations.values()))

        if count < self._settings.min_confirmations:
            notes.append(
                f"only {count}/{self._settings.min_confirmations} confirmations — no alert"
            )
            return ScannerResult(
                trend=trend,
                side=side,
                confirmations=confirmations,
                confidence=0.0,
                notes=notes,
            )

        confidence = _BASE_CONFIDENCE + sr_bonus + stoch_bonus + ema_bonus + fib_bonus
        confidence = min(confidence, 100.0)

        # The entry timestamp is the close time of the forming candle
        # (we evaluate at candle-close so the signal is reproducible).
        entry_time = _ensure_utc(enriched.index[-1]).to_pydatetime()
        if entry_time.tzinfo is None:
            from datetime import timezone
            entry_time = entry_time.replace(tzinfo=timezone.utc)

        alert = Alert.build(
            symbol=symbol,
            side=side,
            entry_price=price,
            entry_time=entry_time,
            expiry_minutes=self._settings.trade_expiry_minutes,
            confirmations=confirmations,
            confidence=confidence,
            notes=notes,
        )

        return ScannerResult(
            trend=trend,
            side=side,
            confirmations=confirmations,
            confidence=confidence,
            notes=notes,
            alert=alert,
        )


_CONFIRMATION_KEYS: tuple[ConfirmationKey, ...] = (
    "trend_structure",
    "support_resistance",
    "stochastic",
    "ema_interaction",
    "fibonacci",
)


def _ensure_utc(idx_value) -> object:
    """Coerce a pandas Timestamp (possibly tz-naive) to UTC."""
    ts = pd.Timestamp(idx_value)
    if ts.tz is None:
        ts = ts.tz_localize("UTC")
    else:
        ts = ts.tz_convert("UTC")
    return ts
