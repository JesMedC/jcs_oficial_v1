"""WebSocket broadcaster.

Single producer pattern:

- :class:`WebSocketBroadcaster` runs an asyncio task that ticks every
  ``scanner_tick_interval_ms`` milliseconds.
- On each tick it pulls the latest forming candle + buffer snapshot from
  the :class:`CandleBuffer` and pushes a ``{"type": "candle", ...}``
  message to every connected client.
- The :class:`AlertStore` is the source of truth for alerts; each client
  has its own bounded queue and is drained as part of every broadcast
  loop. Alert events are emitted as ``alert_new`` (PENDING) and
  ``alert_update`` (WIN/LOSS).

Connection lifecycle:

1. Client opens ``ws://host/ws``.
2. Server sends a one-shot ``{"type": "hello", ...}`` snapshot so the
   frontend can hydrate immediately.
3. Client receives continuous ``candle`` / ``alert_*`` events until it
   disconnects.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import suppress
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.engine.alerts import AlertStore
from app.engine.models import Alert


logger = logging.getLogger(__name__)

router = APIRouter(tags=["ws"])


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
        return {
            "type": "hello",
            "symbol": settings.scanner_symbol,
            "interval_minutes": settings.candle_interval_minutes,
            "candles": [c.to_dict() for c in candles],
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
        last = candles[-1] if candles else None
        return {
            "type": "candle",
            "symbol": settings.scanner_symbol,
            "interval_minutes": settings.candle_interval_minutes,
            "ts": last.timestamp.isoformat() if last else None,
            "candle": last.to_dict() if last else None,
            "buffer": [c.to_dict() for c in candles],
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
