"""WebSocket broadcaster.

Single producer pattern:

- :class:`WebSocketBroadcaster` runs an asyncio task that ticks every
  ``scanner_tick_interval_ms`` milliseconds.
- On each tick it pulls the latest forming candle + buffer snapshot from
  the :class:`CandleBuffer`, computes the EMA / Bollinger overlays once
  for the whole buffer, and pushes a ``{"type": "candle", ...}`` message
  to every connected client.
- The :class:`AlertStore` is the source of truth for alerts; each client
  has its own bounded queue and is drained as part of every broadcast
  loop. Alert events are emitted as ``alert_new`` (PENDING) and
  ``alert_update`` (WIN/LOSS).

Connection lifecycle:

1. Client opens ``ws://host/ws``.
2. Server sends a one-shot ``{"type": "hello", ...}`` snapshot so the
   frontend can hydrate immediately. The snapshot includes the full
   indicator series so the chart can draw EMA / Bollinger overlays
   without any client-side recompute.
3. Client receives continuous ``candle`` / ``alert_*`` events until it
   disconnects. Each ``candle`` event carries the latest indicator
   values (one float per series) so the chart's last point can be
   updated incrementally.

Indicator payload contract
--------------------------

Both ``hello`` and ``candle`` payloads include an ``indicators`` field:

```
{
  "series": {
    "ema_fast":  [{"time": 1737158400, "value": 1.14523}, ...],
    "ema_mid":   [...],
    "ema_slow":  [...],
    "bb_upper":  [...],
    "bb_middle": [...],
    "bb_lower":  [...]
  },
  "latest": {
    "ema_fast": 1.14523,
    "ema_mid":  1.14480,
    ...
  }
}
```

Times are unix seconds (UTC) so the frontend can drop them straight
into lightweight-charts without any timezone juggling. ``series`` is
emitted in full on ``hello``; on ``candle`` ticks we still emit it but
it is identical between ticks until a new candle closes, so the
frontend can replace the cached series wholesale.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import suppress
from datetime import datetime, timezone
from typing import Any

import pandas as pd
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.engine.alerts import AlertStore
from app.engine.models import Alert
from app.indicators.bollinger import compute_bollinger
from app.indicators.ema import compute_emas


logger = logging.getLogger(__name__)

router = APIRouter(tags=["ws"])

# Indicator series names — kept in a single tuple so both the snapshot
# and the tick payload build the dict in the same order.
_INDICATOR_COLUMNS: tuple[tuple[str, str], ...] = (
    ("ema_fast", "ema_fast"),
    ("ema_mid", "ema_mid"),
    ("ema_slow", "ema_slow"),
    ("bb_upper", "bb_upper"),
    ("bb_middle", "bb_middle"),
    ("bb_lower", "bb_lower"),
)


def _build_indicator_payload(
    df: pd.DataFrame, *, ema_fast: int, ema_mid: int, ema_slow: int,
    bb_length: int, bb_std: float,
) -> dict[str, Any]:
    """Compute EMA + Bollinger overlays for ``df`` and serialise them.

    Returns a dict with two keys:

    - ``series``: a per-indicator list of ``{time, value}`` points
      aligned to the candle buffer index. ``time`` is unix seconds
      (UTC) and ``value`` is a float. NaN rows (indicator warm-up) are
      dropped.
    - ``latest``: a per-indicator dict of the most recent non-NaN value.

    On an empty / too-short frame both fields are empty dicts so the
    frontend can render the empty state without crashing.
    """
    if df.empty or len(df) < 2:
        return {"series": {}, "latest": {}}

    emas = compute_emas(df, fast=ema_fast, mid=ema_mid, slow=ema_slow)
    bb = compute_bollinger(df, length=bb_length, std=bb_std)
    enriched = pd.concat([df[["close"]], emas, bb], axis=1)

    series: dict[str, list[dict[str, float | int]]] = {}
    latest: dict[str, float] = {}

    for key, col_name in _INDICATOR_COLUMNS:
        col = enriched[col_name]
        points: list[dict[str, float | int]] = []
        last_val: float | None = None
        for ts, val in col.items():
            if val != val:  # NaN guard — pandas-ta emits NaN during warm-up
                continue
            ts_dt = ts.to_pydatetime() if hasattr(ts, "to_pydatetime") else ts
            if ts_dt.tzinfo is None:
                ts_dt = ts_dt.replace(tzinfo=timezone.utc)
            else:
                ts_dt = ts_dt.astimezone(timezone.utc)
            points.append({"time": int(ts_dt.timestamp()), "value": float(val)})
            last_val = float(val)
        series[key] = points
        if last_val is not None:
            latest[key] = last_val

    return {"series": series, "latest": latest}


class WebSocketBroadcaster:
    """Async fan-out of candle + alert events to all connected clients."""

    def __init__(
        self,
        *,
        tick_interval_ms: int,
        candle_buffer: "object",  # CandleBuffer — defined in app.main
        alert_store: AlertStore,
        get_settings,
    ) -> None:
        self._tick_seconds = max(tick_interval_ms, 100) / 1000.0
        self._buffer = candle_buffer
        self._store = alert_store
        self._get_settings = get_settings
        self._clients: set[WebSocket] = set()
        self._task: asyncio.Task[None] | None = None
        self._stop_event = asyncio.Event()

    # ------------------------------------------------------------------ #
    # Connection management
    # ------------------------------------------------------------------ #

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._clients.add(ws)
        # Push a hello snapshot so the UI can hydrate immediately.
        await self._safe_send(
            ws,
            self._snapshot_payload(),
        )
        logger.info("ws connected; total clients=%d", len(self._clients))

    def disconnect(self, ws: WebSocket) -> None:
        self._clients.discard(ws)
        logger.info("ws disconnected; total clients=%d", len(self._clients))

    # ------------------------------------------------------------------ #
    # Lifecycle
    # ------------------------------------------------------------------ #

    async def start(self) -> None:
        if self._task is not None:
            return
        self._stop_event.clear()
        self._task = asyncio.create_task(self._run(), name="ws-broadcaster")

    async def stop(self) -> None:
        self._stop_event.set()
        if self._task is not None:
            self._task.cancel()
            with suppress(asyncio.CancelledError):
                await self._task
            self._task = None
        # Close any lingering connections.
        for ws in list(self._clients):
            with suppress(Exception):
                await ws.close()
        self._clients.clear()

    # ------------------------------------------------------------------ #
    # Background loop
    # ------------------------------------------------------------------ #

    async def _run(self) -> None:
        logger.info(
            "ws broadcaster started; tick_interval=%.3fs", self._tick_seconds
        )
        while not self._stop_event.is_set():
            try:
                await self._broadcast_tick()
            except Exception as exc:  # noqa: BLE001
                logger.exception("ws broadcaster tick failed: %s", exc)
            try:
                await asyncio.wait_for(
                    self._stop_event.wait(), timeout=self._tick_seconds
                )
            except asyncio.TimeoutError:
                continue
        logger.info("ws broadcaster stopped")

    async def _broadcast_tick(self) -> None:
        if not self._clients:
            return
        payload = self._candle_payload()
        await self._broadcast(payload)

        # Drain any alerts accumulated since the last tick.
        # Per-client queues live in the store; we pop them in lockstep.
        for ws in list(self._clients):
            queue = self._client_queue(ws)
            while True:
                try:
                    alert = queue.get_nowait()
                except asyncio.QueueEmpty:
                    break
                event_type = (
                    "alert_new" if alert.status.value == "PENDING" else "alert_update"
                )
                await self._safe_send(
                    ws,
                    {
                        "type": event_type,
                        "alert": alert.model_dump(mode="json"),
                    },
                )

    # ------------------------------------------------------------------ #
    # Payload helpers
    # ------------------------------------------------------------------ #

    def _snapshot_payload(self) -> dict[str, Any]:
        settings = self._get_settings()
        candles = self._buffer.tail(
            settings.scanner_buffer_size,
            symbol=settings.scanner_symbol,
            offer_side="bid",
        )
        df = self._buffer.snapshot(
            symbol=settings.scanner_symbol, offer_side="bid"
        )
        indicators = _build_indicator_payload(
            df,
            ema_fast=settings.ema_fast,
            ema_mid=settings.ema_mid,
            ema_slow=settings.ema_slow,
            bb_length=settings.bollinger_length,
            bb_std=settings.bollinger_std,
        )
        return {
            "type": "hello",
            "symbol": settings.scanner_symbol,
            "interval_minutes": settings.candle_interval_minutes,
            "candles": [c.to_dict() for c in candles],
            "indicators": indicators,
            "alerts": [
                a.model_dump(mode="json") for a in self._store.all()[:50]
            ],
            "server_time": datetime.now(timezone.utc).isoformat(),
        }

    def _candle_payload(self) -> dict[str, Any]:
        settings = self._get_settings()
        candles = self._buffer.tail(
            settings.scanner_buffer_size,
            symbol=settings.scanner_symbol,
            offer_side="bid",
        )
        df = self._buffer.snapshot(
            symbol=settings.scanner_symbol, offer_side="bid"
        )
        indicators = _build_indicator_payload(
            df,
            ema_fast=settings.ema_fast,
            ema_mid=settings.ema_mid,
            ema_slow=settings.ema_slow,
            bb_length=settings.bollinger_length,
            bb_std=settings.bollinger_std,
        )
        last = candles[-1] if candles else None
        return {
            "type": "candle",
            "symbol": settings.scanner_symbol,
            "interval_minutes": settings.candle_interval_minutes,
            "ts": last.timestamp.isoformat() if last else None,
            "candle": last.to_dict() if last else None,
            "buffer": [c.to_dict() for c in candles],
            "indicators": indicators,
        }

    def _client_queue(self, ws: WebSocket) -> "asyncio.Queue[Alert]":
        # Each client gets one queue, stored as an attribute on the
        # WebSocket to avoid a side-table.
        q = getattr(ws, "_alert_queue", None)
        if q is None:
            q = self._store.subscribe()
            ws._alert_queue = q  # type: ignore[attr-defined]
        return q

    # ------------------------------------------------------------------ #
    # Fan-out helpers
    # ------------------------------------------------------------------ #

    async def _broadcast(self, payload: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for ws in list(self._clients):
            ok = await self._safe_send(ws, payload)
            if not ok:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def _safe_send(self, ws: WebSocket, payload: dict[str, Any]) -> bool:
        try:
            await ws.send_json(payload)
            return True
        except WebSocketDisconnect:
            self.disconnect(ws)
            return False
        except Exception as exc:  # noqa: BLE001
            logger.warning("ws send failed (%s); closing client", exc)
            self.disconnect(ws)
            with suppress(Exception):
                await ws.close()
            return False


# ---------------------------------------------------------------------- #
# WebSocket route
# ---------------------------------------------------------------------- #


@router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket) -> None:
    """WebSocket endpoint. Delegates lifecycle to the broadcaster."""
    broadcaster: WebSocketBroadcaster | None = getattr(
        websocket.app.state, "broadcaster", None
    )
    if broadcaster is None:
        await websocket.close(code=1011, reason="scanner not initialized")
        return
    await broadcaster.connect(websocket)
    try:
        # We don't expect inbound messages, but consume them so the
        # disconnect is detected promptly.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        broadcaster.disconnect(websocket)
