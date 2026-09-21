"""Smoke tests para los endpoints de health."""
from __future__ import annotations


async def test_health_returns_ok(client) -> None:
    resp = await client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "version" in body


async def test_health_ready_reports_db(client) -> None:
    resp = await client.get("/health/ready")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] in {"ok", "degraded"}
    assert "db" in body


async def test_health_response_sets_correlation_header(client) -> None:
    headers = {"X-Correlation-Id": "abc-correlation-123456789012345678"}
    # X-Correlation-Id se valida sólo en logs; pasamos un valor cualquiera.
    resp = await client.get("/health", headers=headers)
    assert resp.status_code == 200
    assert "X-Correlation-Id" in resp.headers
    assert resp.headers["X-Correlation-Id"] == "abc-correlation-123456789012345678"