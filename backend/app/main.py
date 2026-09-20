"""FastAPI application entry point.

Run with:
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hooks.

    Will eventually bootstrap the data provider, indicator engine, scanner
    loop, and WebSocket broadcaster. For T01 it stays empty.
    """
    settings = get_settings()
    app.state.settings = settings
    yield


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

    return app


app = create_app()
