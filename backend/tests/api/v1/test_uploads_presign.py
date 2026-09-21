"""POST /uploads/presign — S3-style presigned upload (REQ-TI-ADD-002/004)."""
from __future__ import annotations


async def _register(client, payload):
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_presign_returns_url_fields_public(
    client, valid_register_payload
) -> None:
    """Valid body → 200 with url, fields, public_url keys."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    resp = await client.post(
        "/api/v1/uploads/presign",
        headers=headers,
        json={
            "file_name": "analysis.png",
            "content_type": "image/png",
            "key_prefix": "trades",
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "url" in body
    assert "fields" in body
    assert "public_url" in body
    assert body["fields"]["key"].startswith("trades/")


async def test_presign_mock_when_no_s3_env(
    client, valid_register_payload, monkeypatch
) -> None:
    """When no ``S3_BUCKET`` env is set, the URL is a deterministic mock."""
    monkeypatch.delenv("S3_BUCKET", raising=False)
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    resp = await client.post(
        "/api/v1/uploads/presign",
        headers=headers,
        json={"file_name": "close.png"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # Mock URLs are under ``mock-cdn.local`` per the stub.
    assert "mock-cdn.local" in body["public_url"]


async def test_presign_unauthenticated(client) -> None:
    """No Bearer → 401."""
    resp = await client.post(
        "/api/v1/uploads/presign",
        json={"file_name": "x.png"},
    )
    assert resp.status_code == 401, resp.text


async def test_presign_rejects_extra_fields(client, valid_register_payload) -> None:
    """Unknown body fields → 422 (Pydantic extra=forbid)."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    resp = await client.post(
        "/api/v1/uploads/presign",
        headers=headers,
        json={
            "file_name": "x.png",
            "evil_field": "leak",
        },
    )
    assert resp.status_code == 422, resp.text
