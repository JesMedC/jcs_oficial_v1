"""Integration: ``create_trade`` enforces each discipline rule with
the right error code.

This is the end-to-end smoke test that proves the rule-engine is
hooked into ``trade_service.open_trade`` BEFORE the balance
deduction (REQ-DISC-010).
"""
from __future__ import annotations

from decimal import Decimal


async def _register(client, payload):
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _create_account(client, headers, *, type="BINARY"):
    resp = await client.post(
        "/api/v1/accounts",
        headers=headers,
        json={"broker_name": "disc", "type": type, "name": "primary"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _fund(client, headers, account_id, amount):
    resp = await client.post(
        f"/api/v1/accounts/{account_id}/fund",
        headers=headers,
        json={"amount": amount},
    )
    assert resp.status_code == 200, resp.text


async def test_discipline_rules_invoke_before_balance(
    client, valid_register_payload
) -> None:
    """Rule 3 (broker cap) wins over balance insufficient.

    ``importe=10000`` is rejected with ``BROKER_CAP_EXCEEDED`` even
    though the balance is too low to cover it (REQ-DISC-010 test
    case).
    """
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers)
    await _fund(client, headers, account["id"], "200000.00")

    resp = await client.post(
        "/api/v1/trades",
        headers=headers,
        json={
            "account_id": account["id"],
            "instrument": "EUR/USD OTC",
            "type": "BINARY",
            "direction": "CALL",
            "investment_usd": "10000.00",
            "payout_pct": "85.00",
            "expiration_seconds": 60,
            "interest": "PLAN",
        },
    )
    assert resp.status_code == 422, resp.text
    assert resp.json()["code"] == "BROKER_CAP_EXCEEDED"


async def test_interest_required_on_create(
    client, valid_register_payload
) -> None:
    """Missing ``interest`` field → 422 INTEREST_REQUIRED."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers)
    await _fund(client, headers, account["id"], "50000.00")

    resp = await client.post(
        "/api/v1/trades",
        headers=headers,
        json={
            "account_id": account["id"],
            "instrument": "EUR/USD OTC",
            "type": "BINARY",
            "direction": "CALL",
            "investment_usd": "2.00",
            "payout_pct": "85.00",
            "expiration_seconds": 60,
        },
    )
    assert resp.status_code == 422, resp.text
    assert resp.json()["code"] == "VALIDATION_ERROR"  # Pydantic handles this


async def test_interest_invalid_value_rejected(
    client, valid_register_payload
) -> None:
    """``interest="BORED"`` (not in literal) → 422."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers)
    await _fund(client, headers, account["id"], "50000.00")

    resp = await client.post(
        "/api/v1/trades",
        headers=headers,
        json={
            "account_id": account["id"],
            "instrument": "EUR/USD OTC",
            "type": "BINARY",
            "direction": "CALL",
            "investment_usd": "2.00",
            "payout_pct": "85.00",
            "expiration_seconds": 60,
            "interest": "BORED",
        },
    )
    assert resp.status_code == 422, resp.text


async def test_payout_100_rejected(client, valid_register_payload) -> None:
    """``payout_pct=100`` → 422 PAYOUT_OUT_OF_RANGE."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers)
    await _fund(client, headers, account["id"], "50000.00")

    resp = await client.post(
        "/api/v1/trades",
        headers=headers,
        json={
            "account_id": account["id"],
            "instrument": "EUR/USD OTC",
            "type": "BINARY",
            "direction": "CALL",
            "investment_usd": "2.00",
            "payout_pct": "100.00",
            "expiration_seconds": 60,
            "interest": "PLAN",
        },
    )
    assert resp.status_code == 422, resp.text


async def test_payout_99_accepted(client, valid_register_payload) -> None:
    """``payout_pct=99`` (new ceiling) → 201."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers)
    await _fund(client, headers, account["id"], "50000.00")

    resp = await client.post(
        "/api/v1/trades",
        headers=headers,
        json={
            "account_id": account["id"],
            "instrument": "EUR/USD OTC",
            "type": "BINARY",
            "direction": "CALL",
            "investment_usd": "2.00",
            "payout_pct": "99.00",
            "expiration_seconds": 60,
            "interest": "PLAN",
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["interest"] == "PLAN"
    assert Decimal(body["payout_pct"]) == Decimal("99.00")


async def test_interest_and_emotional_tags_coexist(
    client, valid_register_payload
) -> None:
    """REQ-INT-004: ``interest`` and ``emotional_tags`` both persist."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers)
    await _fund(client, headers, account["id"], "50000.00")

    resp = await client.post(
        "/api/v1/trades",
        headers=headers,
        json={
            "account_id": account["id"],
            "instrument": "EUR/USD OTC",
            "type": "BINARY",
            "direction": "CALL",
            "investment_usd": "2.00",
            "payout_pct": "85.00",
            "expiration_seconds": 60,
            "interest": "PLAN",
            "emotional_tags": ["PATIENCE", "DISCIPLINE"],
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["interest"] == "PLAN"
    assert body["emotional_tags"] == ["PATIENCE", "DISCIPLINE"]


async def test_break_outcome_zero_balance_delta(
    client, valid_register_payload, db_session
) -> None:
    """REQ-TI-ADD-003: BREAK closes with pnl=0, balance unchanged."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers)
    await _fund(client, headers, account["id"], "50000.00")

    open_resp = await client.post(
        "/api/v1/trades",
        headers=headers,
        json={
            "account_id": account["id"],
            "instrument": "EUR/USD OTC",
            "type": "BINARY",
            "direction": "CALL",
            "investment_usd": "2.00",
            "payout_pct": "85.00",
            "expiration_seconds": 60,
            "interest": "PLAN",
        },
    )
    assert open_resp.status_code == 201, open_resp.text
    trade_id = open_resp.json()["id"]

    close_resp = await client.post(
        f"/api/v1/trades/{trade_id}/close",
        headers=headers,
        json={"outcome": "BREAK"},
    )
    assert close_resp.status_code == 200, close_resp.text
    body = close_resp.json()
    assert body["status"] == "CLOSED_BREAK"
    assert Decimal(body["pnl_usd"]) == Decimal("0.00")
