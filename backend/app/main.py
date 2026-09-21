"""FastAPI application entry point.

Run with:
    uvicorn app.main:app --reload --port 8000

The lifespan hook bootstraps:

1. A market data provider (default: ``DukascopyProvider``).
2. A :class:`CandleBuffer` primed with ``scanner_history_days`` of bars.
3. The :class:`ScannerLoop` background task.
4. The :class:`WebSocketBroadcaster` background task.

All four are wired into ``app.state`` so the REST + WebSocket routes
can read from them. The ``/healthz`` endpoint exposes provider + symbol.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import WebSocketBroadcaster, alerts_router, candles_router
from app.core.config import get_settings
from app.data.factory import build_provider
from app.data.provider import OfferSide
from app.engine import AlertStore, CandleBuffer, Scanner, ScannerLoop


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings

    provider = build_provider(settings)
    app.state.provider = provider

    buffer = CandleBuffer(settings)
    alert_store = AlertStore()
    scanner = Scanner(settings)
    app.state.candle_buffer = buffer
    app.state.alert_store = alert_store
    app.state.scanner = scanner

    # WebSocket broadcaster publishes candle + alert events.
    broadcaster = WebSocketBroadcaster(
        tick_interval_ms=settings.scanner_tick_interval_ms,
        candle_buffer=buffer,
        alert_store=alert_store,
        get_settings=get_settings,
    )
    app.state.broadcaster = broadcaster

    # Scanner loop ticks the confirmation engine.
    scanner_loop = ScannerLoop(
        settings=settings,
        provider=provider,
        buffer=buffer,
        alert_store=alert_store,
        scanner=scanner,
        on_alert=None,
    )
    app.state.scanner_loop = scanner_loop

    # Prime the buffer with historical data, then start the loops.
    try:
        await buffer.prime(
            provider,
            symbol=settings.scanner_symbol,
            offer_side="bid",
        )
    except Exception as exc:  # noqa: BLE001
        # Network blips should not crash startup; the loop retries on each
        # tick. Log and continue.
        logger.exception("failed to prime candle buffer: %s", exc)

    await broadcaster.start()
    await scanner_loop.start()

    try:
        yield
    finally:
        await scanner_loop.stop()
        await broadcaster.stop()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Trading Scanner",
        description="5-minute forex signal engine with split-screen UI.",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Permissive CORS for local frontend dev (Vite on 5173).
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/healthz")
    async def healthz() -> dict[str, str]:
        return {
            "status": "ok",
            "provider": app.state.settings.scanner_provider,
            "symbol": app.state.settings.scanner_symbol,
        }

    app.include_router(candles_router)
    app.include_router(alerts_router)
    from app.api.ws import router as ws_router

    app.include_router(ws_router)

    return app


app = create_app()
