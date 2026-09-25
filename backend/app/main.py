"""FastAPI application entry point for the JadeCapitalSuite portal backend.

Run with:

    uvicorn app.main:app --reload --port 8000

Mounts the v1 API aggregator and exposes ``/health`` + ``/health/ready``
via the health router. CORS is configured from the ``CORS_ALLOW_ORIGINS``
env var (CSV).
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.api.v1.health import router as health_router
from app.config import get_settings


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="JadeCapitalSuite API",
        description=(
            "Public portal backend: auth, workspaces, trades, calendar, "
            "subscriptions, payments, and admin."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)
    app.include_router(health_router)
    return app


app = create_app()
