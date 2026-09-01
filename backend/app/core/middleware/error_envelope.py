"""Error envelope middleware — convierte cualquier error en ``ErrorEnvelope``.

Orden de instalación: este middleware debe envolverse ALREDEDOR de
CorrelationId e Idempotency para poder capturar excepciones de ellos.
Se monta último (``add_middleware`` apila en orden LIFO).
"""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from structlog.contextvars import bind_contextvars

from app.observability.logging import get_logger
from app.schemas.envelope import ErrorCode, ErrorEnvelope

log = get_logger(__name__)


_HTTP_STATUS_TO_CODE: dict[int, ErrorCode] = {
    400: ErrorCode.VALIDATION_ERROR,
    401: ErrorCode.AUTH_TOKEN_MISSING,
    403: ErrorCode.WORKSPACE_ACCESS_DENIED,
    404: ErrorCode.NOT_FOUND,
    409: ErrorCode.IDEMPOTENCY_CONFLICT,
    422: ErrorCode.VALIDATION_ERROR,
    429: ErrorCode.RATE_LIMIT_EXCEEDED,
}


def _correlation_id(request: Request) -> str:
    return getattr(request.state, "correlation_id", "0" * 36) or "0" * 36


def _envelope(
    request: Request,
    code: ErrorCode,
    message: str,
    status_code: int,
    details: dict | None = None,
) -> JSONResponse:
    cid = _correlation_id(request)
    # Reforzamos el binding por si el log se emite desde fuera del span.
    bind_contextvars(correlation_id=cid)
    body = ErrorEnvelope(
        code=code,
        message=message,
        correlation_id=cid,
        details=details,
    ).model_dump(mode="json")
    return JSONResponse(status_code=status_code, content=body)


class ErrorEnvelopeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        try:
            response: Response = await call_next(request)
        except HTTPException as exc:
            # Si el handler ya construyó un envelope, lo respetamos.
            if isinstance(exc.detail, dict) and exc.detail.get("code"):
                cid = _correlation_id(request)
                payload = dict(exc.detail)
                payload.setdefault("correlation_id", cid)
                return JSONResponse(status_code=exc.status_code, content=payload)
            code = _HTTP_STATUS_TO_CODE.get(exc.status_code, ErrorCode.INTERNAL_ERROR)
            return _envelope(
                request,
                code=code,
                message=str(exc.detail) if exc.detail else code.value,
                status_code=exc.status_code,
            )
        except RequestValidationError as exc:
            return _envelope(
                request,
                code=ErrorCode.VALIDATION_ERROR,
                message="Datos de entrada invalidos",
                status_code=422,
                details={"errors": _flatten_validation_errors(exc.errors())},
            )
        except Exception as exc:  # noqa: BLE001 — último recurso
            log.error(
                "unhandled_exception",
                path=request.url.path,
                method=request.method,
                error_type=type(exc).__name__,
                error_message=str(exc)[:500],
            )
            return _envelope(
                request,
                code=ErrorCode.INTERNAL_ERROR,
                message="Error interno del servidor",
                status_code=500,
            )
        return response


def _flatten_validation_errors(errors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Pydantic v2 -> lista plana ``[{field, message, type}, ...]``."""
    flat: list[dict[str, Any]] = []
    for err in errors:
        loc = [str(x) for x in err.get("loc", [])]
        flat.append(
            {
                "field": ".".join(loc[1:]) if loc and loc[0] == "body" else ".".join(loc),
                "message": err.get("msg"),
                "type": err.get("type"),
            }
        )
    return flat