"""FastAPI application factory.

Orquesta:
- lifespan (engine + structlog),
- middleware (ErrorEnvelope outermost, CorrelationId, Idempotency),
- CORS por lista blanca,
- routers /api/v1 + health,
- excepción handlers como red de seguridad (el middleware ya cubre
  la mayoría; estos handlers cubren el caso ``HTTPException`` cuando se
  lanza SIN que el middleware alcance a procesarla, p.ej. después de
  que la response ya empezó).
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app import __version__
from app.api.v1 import api_router
from app.api.v1.health import router as health_router
from app.config import get_settings
from app.core.middleware import (
    CorrelationIdMiddleware,
    ErrorEnvelopeMiddleware,
    IdempotencyMiddleware,
)
from app.db.session import dispose_engine, make_engine
from app.observability.logging import configure_logging
from app.schemas.envelope import ErrorCode, ErrorEnvelope


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(settings)
    make_engine(str(settings.database_url))
    try:
        yield
    finally:
        await dispose_engine()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="JadeCapitalSuite API",
        version=__version__,
        lifespan=lifespan,
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url=None,
    )

    # CORS — primero (outermost). Lista blanca configurable.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Correlation-Id"],
    )

    # R4 — middleware de resiliencia. Orden de add (LIFO):
    # 1) Idempotency (inner) — corre justo afuera de la ruta.
    # 2) CorrelationId (middle) — bindea contextvars antes que Idempotency.
    # 3) ErrorEnvelope (outer) — captura cualquier excepción de los dos.
    app.add_middleware(IdempotencyMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(ErrorEnvelopeMiddleware)

    # Routers — health al top-level, el resto bajo /api/v1.
    app.include_router(health_router)
    app.include_router(api_router)

    # --- exception handlers (red de seguridad final) ---
    @app.exception_handler(StarletteHTTPException)
    async def _http_exc_handler(request, exc):  # type: ignore[no-untyped-def]
        # Si ya viene con forma de envelope, lo respetamos.
        if isinstance(exc.detail, dict) and "code" in exc.detail:
            payload = dict(exc.detail)
            payload["correlation_id"] = getattr(
                request.state, "correlation_id", "0" * 36
            )
            from fastapi.responses import JSONResponse

            return JSONResponse(status_code=exc.status_code, content=payload)
        cid = getattr(request.state, "correlation_id", "0" * 36)
        envelope = ErrorEnvelope(
            code=ErrorCode.INTERNAL_ERROR
            if exc.status_code >= 500
            else ErrorCode.VALIDATION_ERROR,
            message=str(exc.detail) if exc.detail else "Error",
            correlation_id=cid,
        )
        from fastapi.responses import JSONResponse

        return JSONResponse(
            status_code=exc.status_code,
            content=envelope.model_dump(mode="json"),
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_handler(request, exc):  # type: ignore[no-untyped-def]
        cid = getattr(request.state, "correlation_id", "0" * 36)
        envelope = ErrorEnvelope(
            code=ErrorCode.VALIDATION_ERROR,
            message="Datos de entrada invalidos",
            correlation_id=cid,
            details={"errors": exc.errors()},
        )
        from fastapi.responses import JSONResponse

        return JSONResponse(
            status_code=422, content=envelope.model_dump(mode="json")
        )

    return app


# Para ``uvicorn app.main:app``.
app = create_app()