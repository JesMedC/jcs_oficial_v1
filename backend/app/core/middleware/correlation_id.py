"""CorrelationId middleware.

- Lee ``X-Correlation-Id`` del request, o genera uuid4.
- Lo expone en ``request.state.correlation_id``.
- Lo bindea a ``structlog.contextvars`` para que TODOS los logs de la
  request lo incluyan.
- Lo refleja en el header ``X-Correlation-Id`` de la response.
"""
from __future__ import annotations

import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from structlog.contextvars import bind_contextvars, clear_contextvars

_HEADER = "X-Correlation-Id"


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        cid = request.headers.get(_HEADER) or str(uuid.uuid4())
        request.state.correlation_id = cid
        bind_contextvars(correlation_id=cid)
        try:
            response: Response = await call_next(request)
        finally:
            clear_contextvars()
        response.headers[_HEADER] = cid
        return response