"""Idempotency middleware.

Para ``POST/PUT/PATCH`` con header ``Idempotency-Key``:
1. Calcula un hash estable de (path, método, body, key).
2. Si hay respuesta cacheada para esa clave (ventana 24h), la devuelve
   sin ejecutar el handler.
3. Si no, ejecuta el handler y cachea la respuesta.

Si el header está ausente, el middleware es no-op (degradación elegante:
los endpoints funcionan aunque el cliente no envíe la clave).
"""
from __future__ import annotations

import hashlib
import json
import time
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_TTL_SECONDS = 60 * 60 * 24  # 24h
_METHODS = {"POST", "PUT", "PATCH"}


class _CacheEntry:
    __slots__ = ("response_body", "status_code", "headers", "expires_at")

    def __init__(self, body: bytes, status: int, headers: list[tuple[str, str]], ttl: int) -> None:
        self.response_body = body
        self.status_code = status
        self.headers = headers
        self.expires_at = time.monotonic() + ttl


class IdempotencyMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, *, max_entries: int = 1024) -> None:
        super().__init__(app)
        self._store: dict[str, _CacheEntry] = {}
        self._max = max_entries

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        if request.method not in _METHODS:
            return await call_next(request)

        key = request.headers.get("Idempotency-Key")
        if not key:
            return await call_next(request)

        body_bytes = await request.body()
        cache_key = self._fingerprint(request, key, body_bytes)

        entry = self._store.get(cache_key)
        if entry and entry.expires_at > time.monotonic():
            return Response(
                content=entry.response_body,
                status_code=entry.status_code,
                headers=dict(entry.headers),
                media_type="application/json",
            )

        response: Response = await call_next(request)

        # Reconstruimos el body para cachearlo (consume el stream).
        resp_body = b""
        async for chunk in response.body_iterator:
            resp_body += chunk if isinstance(chunk, bytes) else chunk.encode()

        # Limpiamos entradas vencidas si estamos cerca del límite.
        if len(self._store) >= self._max:
            self._evict()

        self._store[cache_key] = _CacheEntry(
            body=resp_body,
            status=response.status_code,
            headers=list(response.headers.items()),
            ttl=_TTL_SECONDS,
        )

        # Re-emitimos el body (ya consumido) en una Response nueva.
        # Para 204 / 304 no debe haber body ni media_type (HTTP spec).
        if response.status_code in (204, 304):
            return Response(
                status_code=response.status_code,
                headers=dict(response.headers),
            )
        return Response(
            content=resp_body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type,
        )

    @staticmethod
    def _fingerprint(request: Request, key: str, body: bytes) -> str:
        payload = json.dumps(
            {
                "method": request.method,
                "path": request.url.path,
                "query": str(request.url.query),
                "key": key,
                "body_sha256": hashlib.sha256(body).hexdigest(),
            },
            sort_keys=True,
        )
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def _evict(self) -> None:
        now = time.monotonic()
        expired = [k for k, v in self._store.items() if v.expires_at <= now]
        for k in expired:
            self._store.pop(k, None)
        # Si siguen siendo muchas, eviction LRU-light: borrar las más viejas.
        if len(self._store) >= self._max:
            oldest = sorted(self._store.items(), key=lambda kv: kv[1].expires_at)
            for k, _ in oldest[: max(1, self._max // 4)]:
                self._store.pop(k, None)