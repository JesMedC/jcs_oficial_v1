"""Rolling candle buffer + scanner loop wired into the FastAPI app.

The :class:`CandleBuffer` owns the in-memory OHLCV history for the
configured symbol. The :class:`ScannerLoop` periodically polls the
provider, runs the confirmation engine, and pushes new alerts to the
:class:`AlertStore`. Both objects live on ``app.state`` so the API
routes can read from them.

The scanner loop is started in the FastAPI ``lifespan`` hook and is
cancellable cleanly on shutdown.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import suppress
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

import pandas as pd

from app.core.config import Settings
from app.data.factory import build_provider
from app.data.provider import Candle, MarketDataProvider, OfferSide
from app.engine.alerts import AlertStore
from app.engine.models import Alert
from app.engine.scanner import Scanner, ScannerResult
from app.indicators.trend import TrendDirection


logger = logging.getLogger(__name__)


@dataclass
class _SymbolState:
    """Per-symbol buffer + latest forming candle."""

    df: pd.DataFrame
    last_close_timestamp: datetime | None
    last_alert: Alert | None


class CandleBuffer:
    """Rolling OHLCV buffer keyed by (symbol, offer_side).

    The buffer keeps the last ``settings.scanner_buffer_size`` rows per
    (symbol, offer_side) pair. The scanner reads the buffer once per
    tick; the API endpoint reads it for chart hydration.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._lock = asyncio.Lock()
        self._frames: dict[tuple[str, OfferSide], _SymbolState] = {}

    async def prime(
        self,
        provider: MarketDataProvider,
        *,
        symbol: str,
        offer_side: OfferSide,
    ) -> pd.DataFrame:
        """Fetch the initial backfill and store it.

        Returns the backfilled frame so the caller (the scanner loop) can
        do a first evaluation without waiting for the next tick.
        """
        end = datetime.now(timezone.utc).replace(second=0, microsecond=0)
        start = end - timedelta(days=self._settings.scanner_history_days)
        loop = asyncio.get_running_loop()
        df = await loop.run_in_executor(
            None,
            lambda: provider.fetch_candles(
                symbol,
                interval_minutes=self._settings.candle_interval_minutes,
                start=start,
                end=end,
                offer_side=offer_side,
            ),
        )
        df = self._normalize(df)
        async with self._lock:
            self._frames[(symbol, offer_side)] = _SymbolState(
                df=df,
                last_close_timestamp=(
                    df.index[-1].to_pydatetime() if not df.empty else None
                ),
                last_alert=None,
            )
        logger.info(
            "primed buffer for %s (%s): %d rows", symbol, offer_side, len(df)
        )
        return df

    async def update(
        self,
        provider: MarketDataProvider,
        *,
        symbol: str,
        offer_side: OfferSide,
    ) -> pd.DataFrame:
        """Refresh the buffer with the latest candles.

        Returns the latest dataframe (same shape as :meth:`tail`).
        """
        async with self._lock:
            state = self._frames.get((symbol, offer_side))
            start = (
                state.last_close_timestamp + timedelta(minutes=self._settings.candle_interval_minutes)
                if state and state.last_close_timestamp is not None
                else datetime.now(timezone.utc)
                - timedelta(days=self._settings.scanner_history_days)
            )

        end = datetime.now(timezone.utc)
        loop = asyncio.get_running_loop()
        df = await loop.run_in_executor(
            None,
            lambda: provider.fetch_candles(
                symbol,
                interval_minutes=self._settings.candle_interval_minutes,
                start=start,
                end=end,
                offer_side=offer_side,
            ),
        )
        df = self._normalize(df)
        if df.empty:
            async with self._lock:
                return self._frames[(symbol, offer_side)].df.copy()

        async with self._lock:
            state = self._frames.get((symbol, offer_side))
            if state is None:
                state = _SymbolState(
                    df=df,
                    last_close_timestamp=df.index[-1].to_pydatetime(),
                    last_alert=None,
                )
                self._frames[(symbol, offer_side)] = state
            else:
                combined = pd.concat([state.df, df])
                combined = combined[~combined.index.duplicated(keep="last")]
                combined = combined.sort_index()
                if len(combined) > self._settings.scanner_buffer_size:
                    combined = combined.iloc[-self._settings.scanner_buffer_size :]
                state.df = combined
                state.last_close_timestamp = combined.index[-1].to_pydatetime()
            return state.df.copy()

    async def mark_last_alert(self, *, symbol: str, offer_side: OfferSide, alert: Alert) -> None:
        async with self._lock:
            state = self._frames.get((symbol, offer_side))
            if state is not None:
                state.last_alert = alert

    async def last_alert(
        self, *, symbol: str, offer_side: OfferSide
    ) -> Alert | None:
        async with self._lock:
            state = self._frames.get((symbol, offer_side))
            return state.last_alert if state else None

    def snapshot(
        self,
        *,
        symbol: str,
        offer_side: OfferSide,
    ) -> pd.DataFrame:
        """Return a defensive copy of the buffer for ``symbol``."""
        state = self._frames.get((symbol, offer_side))
        if state is None:
            return pd.DataFrame(
                columns=["open", "high", "low", "close", "volume"]
            )
        return state.df.copy()

    def tail(
        self,
        n: int,
        *,
        symbol: str,
        offer_side: OfferSide,
    ) -> list[Candle]:
        """Return the last ``n`` candles as :class:`Candle` records."""
        df = self.snapshot(symbol=symbol, offer_side=offer_side)
        if df.empty:
            return []
        df = df.iloc[-n:]
        candles: list[Candle] = []
        for ts, row in df.iterrows():
            ts_dt = ts.to_pydatetime() if hasattr(ts, "to_pydatetime") else ts
            if ts_dt.tzinfo is None:
                ts_dt = ts_dt.replace(tzinfo=timezone.utc)
            candles.append(
                Candle(
                    timestamp=ts_dt,
                    open=float(row["open"]),
                    high=float(row["high"]),
                    low=float(row["low"]),
                    close=float(row["close"]),
                    volume=float(row["volume"]),
                )
            )
        return candles

    @staticmethod
    def _normalize(df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df
        if df.index.tz is None:
            df.index = df.index.tz_localize("UTC")
        else:
            df.index = df.index.tz_convert("UTC")
        df = df.sort_index()
        df = df[~df.index.duplicated(keep="last")]
        return df


# ---------------------------------------------------------------------- #
# Scanner loop
# ---------------------------------------------------------------------- #


class ScannerLoop:
    """Background task that ticks the confirmation engine."""

    def __init__(
        self,
        *,
        settings: Settings,
        provider: MarketDataProvider,
        buffer: CandleBuffer,
        alert_store: AlertStore,
        scanner: Scanner,
        on_alert,
    ) -> None:
        self._settings = settings
        self._provider = provider
        self._buffer = buffer
        self._store = alert_store
        self._scanner = scanner
        self._on_alert = on_alert  # callable(Alert) -> None
        self._task: Optional[asyncio.Task[None]] = None
        self._stop_event = asyncio.Event()

    async def start(self) -> None:
        if self._task is not None:
            return
        self._stop_event.clear()
        self._task = asyncio.create_task(self._run(), name="scanner-loop")

    async def stop(self) -> None:
        self._stop_event.set()
        if self._task is not None:
            self._task.cancel()
            with suppress(asyncio.CancelledError):
                await self._task
            self._task = None

    async def _run(self) -> None:
        tick = max(self._settings.scanner_tick_interval_ms, 250) / 1000.0
        symbol = self._settings.scanner_symbol
        offer_side: OfferSide = "bid"
        logger.info("scanner loop started; tick=%.3fs symbol=%s", tick, symbol)

        while not self._stop_event.is_set():
            try:
                await self._tick(symbol=symbol, offer_side=offer_side)
                # Resolve any alerts whose 5-minute expiry has passed.
                await self._resolve_due(symbol=symbol, offer_side=offer_side)
            except Exception as exc:  # noqa: BLE001
                logger.exception("scanner tick failed: %s", exc)
            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=tick)
            except asyncio.TimeoutError:
                continue
        logger.info("scanner loop stopped")

    async def _tick(self, *, symbol: str, offer_side: OfferSide) -> None:
        df = await self._buffer.update(
            self._provider, symbol=symbol, offer_side=offer_side
        )
        if df.empty or len(df) < self._settings.ema_slow + 5:
            return
        # Evaluate in a worker thread (pandas-ta + dataframe math).
        loop = asyncio.get_running_loop()
        result: ScannerResult = await loop.run_in_executor(
            None,
            lambda: self._scanner.evaluate(
                df, symbol=symbol, current_time=df.index[-1].to_pydatetime()
            ),
        )
        if result.alert is not None:
            # Suppress duplicate alerts at the same timestamp (the loop
            # may tick several times within the same candle).
            await self._maybe_publish(result)

    async def _maybe_publish(self, result: ScannerResult) -> None:
        assert result.alert is not None
        alert = result.alert
        snapshot = self._buffer.snapshot(
            symbol=alert.symbol, offer_side="bid"
        )
        if snapshot.empty:
            return
        last_alert = await self._buffer.last_alert(
            symbol=alert.symbol, offer_side="bid"
        )
        if last_alert is not None and last_alert.entry_time == alert.entry_time:
            return  # already published for this candle

        await self._buffer.mark_last_alert(
            symbol=alert.symbol, offer_side="bid", alert=alert
        )
        await self._store.add(alert)
        logger.info(
            "alert %s %s @ %.5f confidence=%.1f",
            alert.side,
            alert.symbol,
            alert.entry_price,
            alert.confidence,
        )
        if self._on_alert is not None:
            try:
                self._on_alert(alert)
            except Exception as exc:  # noqa: BLE001
                logger.exception("on_alert callback failed: %s", exc)

    async def _resolve_due(self, *, symbol: str, offer_side: OfferSide) -> None:
        snapshot = self._buffer.snapshot(symbol=symbol, offer_side=offer_side)
        if snapshot.empty:
            return
        now = datetime.now(timezone.utc)

        def price_lookup(expiry: datetime) -> float | None:
            # Find the candle whose timestamp == expiry (or the next one).
            try:
                idx = snapshot.index.get_indexer([expiry], method="nearest")[0]
            except Exception:
                return None
            if idx == -1:
                return None
            return float(snapshot.iloc[idx]["close"])

        changed = await self._store.resolve_due(now=now, price_lookup=price_lookup)
        for alert in changed:
            logger.info(
                "alert %s -> %s (entry=%.5f expiry=%.5f)",
                alert.id[:8],
                alert.status.value,
                alert.entry_price,
                alert.expiry_time.timestamp(),
            )

