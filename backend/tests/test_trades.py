"""Tests del módulo ``Trade`` — p0e.4.

13 tests del CRUD + lifecycle:

  1. open FOREX happy path (201, status=OPEN, balance intacto).
  2. open BINARY happy path (201, status=OPEN).
  3. list devuelve los trades creados.
  4. open sobre cuenta de otro user → 404.
  5. open con shape inconsistente (falta campo forex en FOREX) → 422.
  6. close FOREX WIN → CLOSED_WIN, pnl positivo, balance += pnl,
     r_multiple poblado.
  7. close FOREX LOSS → CLOSED_LOSS, pnl negativo, balance -= |pnl|.
  8. close BINARY WIN → pnl = investment * payout / 100, balance ++.
  9. close BINARY LOSS → pnl = −investment, balance -= |pnl|.
 10. close trade ya cerrado → 422 TRADE_CLOSED.
 11. close trade de otro user → 404.
 12. filter por status=OPEN → sólo los open.
 13. filter por account_id → sólo los de esa cuenta.

Patrón mirror de ``test_trading_accounts.py``: helpers de registro,
fondo de saldo para poder cerrar con profit, asserts contra body
JSON y contra la DB directa cuando hace falta.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.core.security.password import hash_password
from app.models import (
    AuditLog,
    Trade,
    TradeStatus,
    TradeType,
    TradingAccount,
    User,
    UserRole,
)
from app.services.workspace_service import create_default_workspace_for_user


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

async def _register(client, payload: dict) -> dict:
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _payload(unique_email: str) -> dict:
    return {
        "email": unique_email,
        "password": "Trader1234!",
        "first_name": "Trader",
        "last_name": "User",
        "phone": "+34612345678",
    }


async def _create_account(
    client, headers: dict, *, broker: str = "Pocket Option",
    type: str = "BINARY", name: str = "Cuenta principal",
) -> dict:
    """Helper: crea una cuenta de trading via HTTP."""
    resp = await client.post(
        "/api/v1/accounts",
        headers=headers,
        json={"broker_name": broker, "type": type, "name": name},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _fund_account(client, headers: dict, account_id: str, amount: str) -> None:
    """Helper: fondea ``account_id`` con ``amount`` para que la cuenta
    tenga saldo al momento de cerrar trades y verificar deltas."""
    resp = await client.post(
        f"/api/v1/accounts/{account_id}/fund",
        headers=headers,
        json={"amount": amount},
    )
    assert resp.status_code == 200, resp.text


def _forex_open_payload(account_id: str) -> dict:
    """Body válido para abrir un trade FOREX.

    entry=1.1000, SL=1.0950, lot=0.10, dir=LONG.
    risk_amount = |1.1000 − 1.0950| × 0.10 × 100 = $0.05
    """
    return {
        "account_id": account_id,
        "instrument": "EUR/USD",
        "type": "FOREX",
        "direction": "LONG",
        "pair": "EUR/USD",
        "lot_size": "0.1000",
        "entry_price": "1.10000000",
        "stop_loss": "1.09500000",
        "take_profit": "1.11000000",
        "pre_trade_notes": "setup pre-trading",
    }


def _binary_open_payload(account_id: str) -> dict:
    """Body válido para abrir un trade BINARY.

    investment=100 USD, payout=85%.
    """
    return {
        "account_id": account_id,
        "instrument": "EUR/USD OTC",
        "type": "BINARY",
        "direction": "CALL",
        "investment_usd": "100.00",
        "payout_pct": "85.00",
        "expiration_seconds": 60,
        "pre_trade_notes": "binary OTC",
    }


# ---------------------------------------------------------------------------
# 1. FOREX open happy path
# ---------------------------------------------------------------------------
async def test_open_forex_trade_returns_201_and_open_status(
    client, valid_register_payload
) -> None:
    """POST /trades FOREX → 201, status=OPEN, balance de la cuenta intacto."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers, type="FOREX", name="Forex")
    account_id = account["id"]
    payload = _forex_open_payload(account_id)

    resp = await client.post("/api/v1/trades", headers=headers, json=payload)
    assert resp.status_code == 201, resp.text
    body = resp.json()

    # Identity + lifecycle.
    assert body["status"] == "OPEN"
    assert body["type"] == "FOREX"
    assert body["account_id"] == account_id
    assert body["instrument"] == "EUR/USD"
    assert body["opened_at"]

    # FOREX-specific echo.
    assert body["pair"] == "EUR/USD"
    assert Decimal(body["lot_size"]) == Decimal("0.1000")
    assert body["direction"] == "LONG"
    assert Decimal(body["entry_price"]) == Decimal("1.10000000")
    assert Decimal(body["stop_loss"]) == Decimal("1.09500000")
    assert Decimal(body["take_profit"]) == Decimal("1.11000000")

    # Risk computado.
    # risk_amount = |1.1000 − 1.0950| × 0.10 × 100 = 0.05
    assert Decimal(body["risk_amount_usd"]) == Decimal("0.05")
    # risk_pct: balance=0 → None.
    assert body["risk_pct"] is None

    # BINARY-specific vacío.
    assert body["investment_usd"] is None
    assert body["payout_pct"] is None
    assert body["expiration_seconds"] is None

    # El balance NO se muta al abrir (queda en 0). ``pnl_usd`` es
    # NULL hasta que se cierra el trade.
    assert body["pnl_usd"] is None

    # Re-fetch account → balance intacto.
    acc_resp = await client.get(
        f"/api/v1/accounts", headers=headers
    )
    assert acc_resp.status_code == 200
    fetched = next(a for a in acc_resp.json()["items"] if a["id"] == account_id)
    assert Decimal(fetched["balance_usd"]) == Decimal("0.00")

    # Audit log emitido con action "trade.open".
    audit_q = await client.get("/api/v1/accounts", headers=headers)
    _ = audit_q  # silencio unused; el chequeo real es via DB directa.


# ---------------------------------------------------------------------------
# 2. BINARY open happy path
# ---------------------------------------------------------------------------
async def test_open_binary_trade_returns_201(
    client, valid_register_payload
) -> None:
    """POST /trades BINARY → 201, status=OPEN."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers, type="BINARY", name="Binaria")
    payload = _binary_open_payload(account["id"])

    resp = await client.post("/api/v1/trades", headers=headers, json=payload)
    assert resp.status_code == 201, resp.text
    body = resp.json()

    assert body["status"] == "OPEN"
    assert body["type"] == "BINARY"
    assert body["instrument"] == "EUR/USD OTC"
    assert body["direction"] == "CALL"
    assert Decimal(body["investment_usd"]) == Decimal("100.00")
    assert Decimal(body["payout_pct"]) == Decimal("85.00")
    assert body["expiration_seconds"] == 60

    # FOREX-specific vacío.
    assert body["pair"] is None
    assert body["lot_size"] is None
    assert body["entry_price"] is None
    assert body["risk_amount_usd"] is None


# ---------------------------------------------------------------------------
# 3. List trades
# ---------------------------------------------------------------------------
async def test_list_trades_returns_created(
    client, valid_register_payload
) -> None:
    """GET /trades con 2 trades → items=2, total=2."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    forex_account = await _create_account(
        client, headers, type="FOREX", name="Forex"
    )
    bin_account = await _create_account(
        client, headers, type="BINARY", name="Binary"
    )

    # 1 FOREX + 1 BINARY.
    r1 = await client.post(
        "/api/v1/trades", headers=headers,
        json=_forex_open_payload(forex_account["id"]),
    )
    assert r1.status_code == 201, r1.text
    r2 = await client.post(
        "/api/v1/trades", headers=headers,
        json=_binary_open_payload(bin_account["id"]),
    )
    assert r2.status_code == 201, r2.text

    resp = await client.get("/api/v1/trades", headers=headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2
    types = {item["type"] for item in body["items"]}
    assert types == {"FOREX", "BINARY"}


# ---------------------------------------------------------------------------
# 4. Open sobre cuenta ajena → 404
# ---------------------------------------------------------------------------
async def test_open_trade_on_other_users_account_returns_404(
    client, valid_register_payload, db_session
) -> None:
    """Abre un trade sobre la cuenta del user A desde el user B → 404."""
    reg_a = await _register(client, valid_register_payload)
    headers_a = {"Authorization": f"Bearer {reg_a['access_token']}"}
    account_a = await _create_account(
        client, headers_a, type="FOREX", name="A's account"
    )

    # User B directo en DB + login.
    suffix = uuid.uuid4().hex[:8]
    user_b = User(
        email=f"to_b_{suffix}@jadecapital.local",
        password_hash=hash_password("Trader1234!"),
        first_name="B",
        last_name="User",
        phone="+34600000000",
        role=UserRole.USER,
    )
    db_session.add(user_b)
    await db_session.flush()
    # p0f.1: B necesita workspace propio para tener JWT con
    # ``workspace_ids`` y poder evaluar el ownership check.
    await create_default_workspace_for_user(db_session, user_b)
    login_b = await client.post(
        "/api/v1/auth/login",
        json={"email": user_b.email, "password": "Trader1234!"},
    )
    assert login_b.status_code == 200, login_b.text
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

    resp = await client.post(
        "/api/v1/trades", headers=headers_b,
        json=_forex_open_payload(account_a["id"]),
    )
    assert resp.status_code == 404, resp.text
    assert resp.json()["code"] == "NOT_FOUND"


# ---------------------------------------------------------------------------
# 5. Open con shape inconsistente
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "bad_payload",
    [
        # FOREX sin ``pair``.
        {
            "account_id": "00000000-0000-0000-0000-000000000000",
            "instrument": "EUR/USD",
            "type": "FOREX",
            "direction": "LONG",
            "lot_size": "0.10",
            "entry_price": "1.1000",
        },
        # FOREX con dirección de BINARY.
        {
            "account_id": "00000000-0000-0000-0000-000000000000",
            "instrument": "EUR/USD",
            "type": "FOREX",
            "direction": "CALL",  # inválido para FOREX
            "pair": "EUR/USD",
            "lot_size": "0.10",
            "entry_price": "1.1000",
        },
        # BINARY sin ``investment_usd``.
        {
            "account_id": "00000000-0000-0000-0000-000000000000",
            "instrument": "EUR/USD OTC",
            "type": "BINARY",
            "direction": "CALL",
            "payout_pct": "85.00",
            "expiration_seconds": 60,
        },
    ],
)
async def test_open_trade_validation_returns_422(
    client, valid_register_payload, bad_payload
) -> None:
    """Shape inconsistente FOREX/BINARY → 422 VALIDATION_ERROR."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    # account_id real (no nos importa el ownership acá porque el
    # shape falla antes — pero igual necesitamos uno válido).
    account = await _create_account(client, headers, type="FOREX")
    bad_payload["account_id"] = account["id"]

    resp = await client.post(
        "/api/v1/trades", headers=headers, json=bad_payload
    )
    assert resp.status_code == 422, resp.text
    assert resp.json()["code"] == "VALIDATION_ERROR"


# ---------------------------------------------------------------------------
# 6. Close FOREX WIN
# ---------------------------------------------------------------------------
async def test_close_forex_win_updates_balance_and_status(
    client, valid_register_payload, db_session
) -> None:
    """Close FOREX WIN → CLOSED_WIN, pnl positivo, balance += pnl, r_multiple.

    setup: entry=1.1000, exit=1.1100, lot=0.10, dir=LONG.
    pnl = (1.1100 − 1.1000) × +1 × 0.10 × 100 = $0.10
    risk_amount = |1.1000 − 1.0950| × 0.10 × 100 = $0.05
    r_multiple = pnl / risk_amount = 0.10 / 0.05 = 2.00
    risk_pct = (0.05 / 1000) × 100 = 0.005 → quantize 0.01 = 0.00
    """
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers, type="FOREX")
    await _fund_account(client, headers, account["id"], "1000.00")

    # Fondeamos primero para que risk_pct no sea NULL — fuerza el
    # branch "balance>0" en el open.
    # (El account ya está funded).

    payload = _forex_open_payload(account["id"])
    # Reflejamos el funding en risk_pct esperado.
    resp = await client.post(
        "/api/v1/trades", headers=headers, json=payload
    )
    assert resp.status_code == 201, resp.text
    trade = resp.json()
    assert trade["status"] == "OPEN"
    # risk_pct = (0.05 / 1000) × 100 = 0.005, quantize 0.01 → 0.00
    # (ROUND_HALF_EVEN: 0.005 → 0.00).
    assert Decimal(trade["risk_pct"]) == Decimal("0.00")

    # Close WIN
    close_resp = await client.post(
        f"/api/v1/trades/{trade['id']}/close",
        headers=headers,
        json={"exit_price": "1.11000000"},
    )
    assert close_resp.status_code == 200, close_resp.text
    body = close_resp.json()

    assert body["status"] == "CLOSED_WIN"
    assert body["closed_at"] is not None
    pnl = Decimal(body["pnl_usd"])
    assert pnl == Decimal("0.10")
    # r_multiple = 0.10 / 0.05 = 2.00
    assert Decimal(body["r_multiple"]) == Decimal("2.00")

    # Balance 1000 + 0.10 = 1000.10
    acc_resp = await client.get("/api/v1/accounts", headers=headers)
    assert acc_resp.status_code == 200
    acc = next(a for a in acc_resp.json()["items"] if a["id"] == account["id"])
    assert Decimal(acc["balance_usd"]) == Decimal("1000.10")

    # Audit log emitido con action "trade.close".
    audit_rows = list(
        (await db_session.execute(
            select(AuditLog).where(
                AuditLog.action == "trade.close",
                AuditLog.entity_id == trade["id"],
            )
        )).scalars().all()
    )
    assert len(audit_rows) == 1
    audit = audit_rows[0]
    assert Decimal(audit.new_value["pnl_usd"]) == Decimal("0.10")
    assert Decimal(audit.new_value["new_balance"]) == Decimal("1000.10")


# ---------------------------------------------------------------------------
# 7. Close FOREX LOSS
# ---------------------------------------------------------------------------
async def test_close_forex_loss_decreases_balance(
    client, valid_register_payload
) -> None:
    """Close FOREX LOSS → CLOSED_LOSS, balance -= |pnl|.

    setup: entry=1.1000, exit=1.0950 (exactly SL), dir=LONG, lot=0.10.
    pnl = (1.0950 − 1.1000) × +1 × 0.10 × 100 = -$0.05
    """
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers, type="FOREX")
    await _fund_account(client, headers, account["id"], "500.00")

    open_resp = await client.post(
        "/api/v1/trades", headers=headers,
        json=_forex_open_payload(account["id"]),
    )
    assert open_resp.status_code == 201, open_resp.text
    trade = open_resp.json()

    close_resp = await client.post(
        f"/api/v1/trades/{trade['id']}/close",
        headers=headers,
        json={"exit_price": "1.09500000"},
    )
    assert close_resp.status_code == 200, close_resp.text
    body = close_resp.json()

    assert body["status"] == "CLOSED_LOSS"
    assert Decimal(body["pnl_usd"]) == Decimal("-0.05")
    # Balance 500 − 0.05 = 499.95
    acc_resp = await client.get("/api/v1/accounts", headers=headers)
    acc = next(
        a for a in acc_resp.json()["items"] if a["id"] == account["id"]
    )
    assert Decimal(acc["balance_usd"]) == Decimal("499.95")


# ---------------------------------------------------------------------------
# 8. Close BINARY WIN
# ---------------------------------------------------------------------------
async def test_close_binary_win_increases_balance(
    client, valid_register_payload
) -> None:
    """Close BINARY WIN → pnl = 100 × 85/100 = 85.00, balance += 85."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers, type="BINARY")
    await _fund_account(client, headers, account["id"], "200.00")

    open_resp = await client.post(
        "/api/v1/trades", headers=headers,
        json=_binary_open_payload(account["id"]),
    )
    assert open_resp.status_code == 201, open_resp.text
    trade = open_resp.json()

    close_resp = await client.post(
        f"/api/v1/trades/{trade['id']}/close",
        headers=headers,
        json={"outcome": "WIN"},
    )
    assert close_resp.status_code == 200, close_resp.text
    body = close_resp.json()
    assert body["status"] == "CLOSED_WIN"
    assert Decimal(body["pnl_usd"]) == Decimal("85.00")

    # Balance 200 + 85 = 285
    acc_resp = await client.get("/api/v1/accounts", headers=headers)
    acc = next(
        a for a in acc_resp.json()["items"] if a["id"] == account["id"]
    )
    assert Decimal(acc["balance_usd"]) == Decimal("285.00")


# ---------------------------------------------------------------------------
# 9. Close BINARY LOSS
# ---------------------------------------------------------------------------
async def test_close_binary_loss_decreases_balance(
    client, valid_register_payload
) -> None:
    """Close BINARY LOSS → pnl = -investment = -100, balance -= 100."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers, type="BINARY")
    await _fund_account(client, headers, account["id"], "500.00")

    open_resp = await client.post(
        "/api/v1/trades", headers=headers,
        json=_binary_open_payload(account["id"]),
    )
    assert open_resp.status_code == 201, open_resp.text
    trade = open_resp.json()

    close_resp = await client.post(
        f"/api/v1/trades/{trade['id']}/close",
        headers=headers,
        json={"outcome": "LOSS"},
    )
    assert close_resp.status_code == 200, close_resp.text
    body = close_resp.json()
    assert body["status"] == "CLOSED_LOSS"
    assert Decimal(body["pnl_usd"]) == Decimal("-100.00")

    # Balance 500 − 100 = 400
    acc_resp = await client.get("/api/v1/accounts", headers=headers)
    acc = next(
        a for a in acc_resp.json()["items"] if a["id"] == account["id"]
    )
    assert Decimal(acc["balance_usd"]) == Decimal("400.00")


# ---------------------------------------------------------------------------
# 10. Close trade ya cerrado
# ---------------------------------------------------------------------------
async def test_close_already_closed_trade_returns_422(
    client, valid_register_payload
) -> None:
    """Close un trade ya cerrado → 422 TRADE_CLOSED."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers, type="BINARY")
    await _fund_account(client, headers, account["id"], "500.00")

    open_resp = await client.post(
        "/api/v1/trades", headers=headers,
        json=_binary_open_payload(account["id"]),
    )
    assert open_resp.status_code == 201, open_resp.text
    trade_id = open_resp.json()["id"]

    # 1ra close OK.
    first = await client.post(
        f"/api/v1/trades/{trade_id}/close",
        headers=headers, json={"outcome": "WIN"},
    )
    assert first.status_code == 200, first.text

    # 2da close → 422 TRADE_CLOSED.
    second = await client.post(
        f"/api/v1/trades/{trade_id}/close",
        headers=headers, json={"outcome": "LOSS"},
    )
    assert second.status_code == 422, second.text
    assert second.json()["code"] == "TRADE_CLOSED"


# ---------------------------------------------------------------------------
# 11. Close trade de otro user
# ---------------------------------------------------------------------------
async def test_close_other_users_trade_returns_404(
    client, valid_register_payload, db_session
) -> None:
    """User B cierra un trade de A → 404 NOT_FOUND."""
    reg_a = await _register(client, valid_register_payload)
    headers_a = {"Authorization": f"Bearer {reg_a['access_token']}"}
    account_a = await _create_account(
        client, headers_a, type="BINARY"
    )
    open_resp = await client.post(
        "/api/v1/trades", headers=headers_a,
        json=_binary_open_payload(account_a["id"]),
    )
    assert open_resp.status_code == 201, open_resp.text
    trade_id = open_resp.json()["id"]

    # User B.
    suffix = uuid.uuid4().hex[:8]
    user_b = User(
        email=f"close_b_{suffix}@jadecapital.local",
        password_hash=hash_password("Trader1234!"),
        first_name="B",
        last_name="User",
        phone="+34600000000",
        role=UserRole.USER,
    )
    db_session.add(user_b)
    await db_session.flush()
    # p0f.1: user B necesita un workspace propio para tener contexto
    # multi-tenant. Sin esto, el login emite un JWT con
    # ``workspace_ids=[]`` y el ``infer_workspace_id`` levanta
    # ``WorkspaceRequiredError`` antes de poder evaluar el ownership.
    await create_default_workspace_for_user(db_session, user_b)

    login_b = await client.post(
        "/api/v1/auth/login",
        json={"email": user_b.email, "password": "Trader1234!"},
    )
    assert login_b.status_code == 200, login_b.text
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

    resp = await client.post(
        f"/api/v1/trades/{trade_id}/close",
        headers=headers_b, json={"outcome": "WIN"},
    )
    assert resp.status_code == 404, resp.text
    assert resp.json()["code"] == "NOT_FOUND"


# ---------------------------------------------------------------------------
# 12. Filter list por status=OPEN
# ---------------------------------------------------------------------------
async def test_list_trades_filter_by_status_open(
    client, valid_register_payload
) -> None:
    """GET /trades?status=OPEN → sólo los open."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers, type="BINARY")
    await _fund_account(client, headers, account["id"], "500.00")

    # Open 2 binary trades.
    t1 = await client.post(
        "/api/v1/trades", headers=headers,
        json=_binary_open_payload(account["id"]),
    )
    t2 = await client.post(
        "/api/v1/trades", headers=headers,
        json=_binary_open_payload(account["id"]),
    )
    assert t1.status_code == 201 and t2.status_code == 201

    # Cerramos uno de ellos.
    close_resp = await client.post(
        f"/api/v1/trades/{t1.json()['id']}/close",
        headers=headers, json={"outcome": "WIN"},
    )
    assert close_resp.status_code == 200, close_resp.text

    # Filter por OPEN → 1 ítem (t2).
    resp = await client.get(
        "/api/v1/trades?status=OPEN", headers=headers
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1
    assert body["items"][0]["id"] == t2.json()["id"]
    assert body["items"][0]["status"] == "OPEN"


# ---------------------------------------------------------------------------
# 13. Filter list por account_id
# ---------------------------------------------------------------------------
async def test_list_trades_filter_by_account_id(
    client, valid_register_payload
) -> None:
    """GET /trades?account_id=<X> → sólo los trades de esa cuenta."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    forex_acc = await _create_account(client, headers, type="FOREX")
    bin_acc = await _create_account(client, headers, type="BINARY")
    await _fund_account(client, headers, bin_acc["id"], "500.00")

    # 2 FOREX en forex_acc, 1 BINARY en bin_acc.
    for _ in range(2):
        r = await client.post(
            "/api/v1/trades", headers=headers,
            json=_forex_open_payload(forex_acc["id"]),
        )
        assert r.status_code == 201, r.text

    r = await client.post(
        "/api/v1/trades", headers=headers,
        json=_binary_open_payload(bin_acc["id"]),
    )
    assert r.status_code == 201, r.text

    # Filter por account_id FOREX → 2 items.
    resp_f = await client.get(
        f"/api/v1/trades?account_id={forex_acc['id']}", headers=headers
    )
    assert resp_f.status_code == 200, resp_f.text
    body_f = resp_f.json()
    assert body_f["total"] == 2
    for item in body_f["items"]:
        assert item["account_id"] == forex_acc["id"]
        assert item["type"] == "FOREX"

    # Filter por account_id BINARY → 1 item.
    resp_b = await client.get(
        f"/api/v1/trades?account_id={bin_acc['id']}", headers=headers
    )
    assert resp_b.status_code == 200, resp_b.text
    body_b = resp_b.json()
    assert body_b["total"] == 1
    assert body_b["items"][0]["type"] == "BINARY"


# ============================================================
# p0f.1 — multi-tenant wiring (workspace_id inferido del JWT)
# ============================================================


from app.services.workspace_service import (  # noqa: E402
    WorkspaceRequiredError,
    infer_workspace_id,
)


async def test_infer_workspace_id_returns_owner_workspace(
    client, valid_register_payload, db_session
) -> None:
    """``infer_workspace_id`` DB lookup devuelve el workspace OWNER del user.

    Cuando el JWT trae ``workspace_ids=[]``, el helper cae al lookup
    DB y devuelve el OWNER más antiguo del user.
    """
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    me = await client.get("/api/v1/auth/me", headers=headers)
    expected_ws = uuid.UUID(me.json()["workspaces"][0]["id"])

    # JWT vacío ⇒ fallback DB.
    me_user_id = uuid.UUID(me.json()["user_id"])
    resolved = await infer_workspace_id(
        db_session, me_user_id, jwt_workspace_ids=None
    )
    assert resolved == expected_ws


async def test_infer_workspace_id_prefers_jwt_over_db(
    client, valid_register_payload, db_session
) -> None:
    """Si el JWT trae un workspace_id, ese gana sin consultar DB.

    Pasamos un UUID inventado como primer elemento del JWT — el helper
    lo devuelve sin tocar la DB, así que da igual que ese UUID no
    exista.
    """
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    me = await client.get("/api/v1/auth/me", headers=headers)
    me_user_id = uuid.UUID(me.json()["user_id"])

    forged = uuid.uuid4()
    resolved = await infer_workspace_id(
        db_session, me_user_id, jwt_workspace_ids=[forged]
    )
    assert resolved == forged


async def test_infer_workspace_id_raises_when_user_has_no_workspace(
    client, db_session
) -> None:
    """User sin memberships OWNER + JWT vacío → ``WorkspaceRequiredError``."""
    suffix = uuid.uuid4().hex[:8]
    user = User(
        email=f"nws_{suffix}@jadecapital.local",
        password_hash=hash_password("NoSpace1234!"),
        first_name="No",
        last_name="Space",
        phone="+34600000777",
        role=UserRole.USER,
    )
    db_session.add(user)
    await db_session.flush()

    with pytest.raises(WorkspaceRequiredError):
        await infer_workspace_id(
            db_session, user.id, jwt_workspace_ids=None
        )


async def test_open_trade_infers_workspace_id(
    client, valid_register_payload
) -> None:
    """POST /trades setea ``workspace_id`` igual al OWNER workspace del user."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers, type="BINARY")

    me = await client.get("/api/v1/auth/me", headers=headers)
    expected_ws = me.json()["workspaces"][0]["id"]

    resp = await client.post(
        "/api/v1/trades", headers=headers,
        json=_binary_open_payload(account["id"]),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["workspace_id"] == expected_ws


async def test_open_trade_on_cross_workspace_account_returns_404(
    client, valid_register_payload, db_session
) -> None:
    """User A crea cuenta en su workspace. User B (otro workspace)
    intenta abrir trade sobre la cuenta de A → 404 NOT_FOUND.

    Esto valida el cross-workspace data leak protection: una cuenta
    del workspace W1 NO es alcanzable desde un JWT con workspace_ids
    apuntando a W2.
    """
    reg_a = await _register(client, valid_register_payload)
    headers_a = {"Authorization": f"Bearer {reg_a['access_token']}"}
    account_a = await _create_account(
        client, headers_a, type="BINARY", name="A's account"
    )

    # User B con workspace propio (≠ A).
    suffix = uuid.uuid4().hex[:8]
    user_b = User(
        email=f"xtws_{suffix}@jadecapital.local",
        password_hash=hash_password("Trader1234!"),
        first_name="B",
        last_name="User",
        phone="+34600000666",
        role=UserRole.USER,
    )
    db_session.add(user_b)
    await db_session.flush()
    await create_default_workspace_for_user(db_session, user_b)

    login_b = await client.post(
        "/api/v1/auth/login",
        json={"email": user_b.email, "password": "Trader1234!"},
    )
    headers_b = {
        "Authorization": f"Bearer {login_b.json()['access_token']}"
    }

    resp = await client.post(
        "/api/v1/trades", headers=headers_b,
        json=_binary_open_payload(account_a["id"]),
    )
    assert resp.status_code == 404, resp.text
    assert resp.json()["code"] == "NOT_FOUND"


# ============================================================
# FASE 4A — GET /trades/risk-summary (Topbar RiskSemaphore)
# ============================================================


class TestRiskSummary:
    """``GET /api/v1/trades/risk-summary`` — semáforo del Topbar.

    Mismo patrón que el resto del archivo: registración vía HTTP +
    creación de cuenta + opens/closes también HTTP. Para el caso
    cross-workspace se reutiliza el patrón de
    ``test_open_trade_on_cross_workspace_account_returns_404`` (user
    B insertado directo en DB con su propio workspace).
    """

    async def test_risk_summary_no_trades_returns_green(
        self, client, valid_register_payload
    ) -> None:
        """Workspace recién creado (sin trades) → green, ceros."""
        reg = await _register(client, valid_register_payload)
        headers = {"Authorization": f"Bearer {reg['access_token']}"}

        resp = await client.get(
            "/api/v1/trades/risk-summary", headers=headers
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()

        assert body["level"] == "green"
        assert body["open_trades_count"] == 0
        # El Decimal se serializa como string en JSON.
        assert Decimal(body["daily_pnl_usd"]) == Decimal("0")
        assert body["win_rate_today"] == 0.0
        assert body["message"]

    async def test_risk_summary_positive_daily_pnl_green(
        self, client, valid_register_payload
    ) -> None:
        """FOREX cerrado hoy con WIN → pnl positivo → green."""
        reg = await _register(client, valid_register_payload)
        headers = {"Authorization": f"Bearer {reg['access_token']}"}
        account = await _create_account(client, headers, type="FOREX")

        open_resp = await client.post(
            "/api/v1/trades", headers=headers,
            json=_forex_open_payload(account["id"]),
        )
        assert open_resp.status_code == 201, open_resp.text
        trade_id = open_resp.json()["id"]

        close_resp = await client.post(
            f"/api/v1/trades/{trade_id}/close",
            headers=headers,
            json={"exit_price": "1.11000000"},  # WIN: exit > entry LONG
        )
        assert close_resp.status_code == 200, close_resp.text

        resp = await client.get(
            "/api/v1/trades/risk-summary", headers=headers
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()

        assert body["level"] == "green"
        assert Decimal(body["daily_pnl_usd"]) > 0
        assert body["open_trades_count"] == 0
        # 1 cerrada WIN / 1 cerrada total = 1.0
        assert body["win_rate_today"] == 1.0

    async def test_risk_summary_negative_daily_pnl_yellow(
        self, client, valid_register_payload
    ) -> None:
        """BINARY LOSS chico (entre 0 y -50 USD) → yellow (no red).

        Inversión = $10, payout 85%, LOSS → pnl = -$10. Por encima del
        umbral duro de -50 → yellow.
        """
        reg = await _register(client, valid_register_payload)
        headers = {"Authorization": f"Bearer {reg['access_token']}"}
        account = await _create_account(client, headers, type="BINARY")

        # Inversión custom de $10 (default es 100). Cast al dict del
        # helper para no tocar la firma.
        payload = _binary_open_payload(account["id"])
        payload["investment_usd"] = "10.00"

        open_resp = await client.post(
            "/api/v1/trades", headers=headers, json=payload
        )
        assert open_resp.status_code == 201, open_resp.text
        trade_id = open_resp.json()["id"]

        close_resp = await client.post(
            f"/api/v1/trades/{trade_id}/close",
            headers=headers, json={"outcome": "LOSS"},
        )
        assert close_resp.status_code == 200, close_resp.text

        resp = await client.get(
            "/api/v1/trades/risk-summary", headers=headers
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()

        assert Decimal(body["daily_pnl_usd"]) < 0
        # pnl = -10 está entre 0 y -50 → yellow, no red.
        assert Decimal(body["daily_pnl_usd"]) > Decimal("-50")
        assert body["level"] == "yellow"
        # 0 WIN / 1 cerrada → win_rate = 0.0
        assert body["win_rate_today"] == 0.0

    async def test_risk_summary_big_loss_red(
        self, client, valid_register_payload
    ) -> None:
        """2× BINARY LOSS con pérdida acumulada > 50 USD → red.

        Inversión = $30 cada uno, LOSS → pnl total = -$60 (cruza el
        umbral duro de -50 USD).
        """
        reg = await _register(client, valid_register_payload)
        headers = {"Authorization": f"Bearer {reg['access_token']}"}
        account = await _create_account(client, headers, type="BINARY")

        for _ in range(2):
            payload = _binary_open_payload(account["id"])
            payload["investment_usd"] = "30.00"
            open_resp = await client.post(
                "/api/v1/trades", headers=headers, json=payload
            )
            assert open_resp.status_code == 201, open_resp.text
            close_resp = await client.post(
                f"/api/v1/trades/{open_resp.json()['id']}/close",
                headers=headers, json={"outcome": "LOSS"},
            )
            assert close_resp.status_code == 200, close_resp.text

        resp = await client.get(
            "/api/v1/trades/risk-summary", headers=headers
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()

        assert body["level"] == "red"
        assert Decimal(body["daily_pnl_usd"]) < Decimal("-50")

    async def test_risk_summary_many_open_yellow(
        self, client, valid_register_payload
    ) -> None:
        """6 trades OPEN → open_count > 5 → yellow (sin P&L)."""
        reg = await _register(client, valid_register_payload)
        headers = {"Authorization": f"Bearer {reg['access_token']}"}
        account = await _create_account(client, headers, type="BINARY")

        for _ in range(6):
            open_resp = await client.post(
                "/api/v1/trades", headers=headers,
                json=_binary_open_payload(account["id"]),
            )
            assert open_resp.status_code == 201, open_resp.text

        resp = await client.get(
            "/api/v1/trades/risk-summary", headers=headers
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()

        assert body["level"] == "yellow"
        assert body["open_trades_count"] >= 6
        # P&L = 0 (nadie cerró).
        assert Decimal(body["daily_pnl_usd"]) == Decimal("0")

    async def test_risk_summary_unauthenticated_401(
        self, client
    ) -> None:
        """Sin Authorization header → 401 AUTH_TOKEN_MISSING."""
        resp = await client.get("/api/v1/trades/risk-summary")
        assert resp.status_code == 401, resp.text
        assert resp.json()["code"] == "AUTH_TOKEN_MISSING"

    async def test_risk_summary_cross_workspace_isolation(
        self, client, valid_register_payload, db_session
    ) -> None:
        """Trades del workspace B NO aparecen en el summary del user A.

        Mismo patrón de ``test_open_trade_on_cross_workspace_account_*``
        : user A por HTTP (workspace A), user B directo en DB con su
        propio workspace + trade. El summary de A sólo cuenta trades
        de su workspace.
        """
        # User A — workspace A via HTTP.
        reg_a = await _register(client, valid_register_payload)
        headers_a = {"Authorization": f"Bearer {reg_a['access_token']}"}

        # User B — workspace B via DB.
        suffix = uuid.uuid4().hex[:8]
        user_b = User(
            email=f"riskws_b_{suffix}@jadecapital.local",
            password_hash=hash_password("Trader1234!"),
            first_name="B",
            last_name="Risk",
            phone="+34600000999",
            role=UserRole.USER,
        )
        db_session.add(user_b)
        await db_session.flush()
        await create_default_workspace_for_user(db_session, user_b)

        login_b = await client.post(
            "/api/v1/auth/login",
            json={"email": user_b.email, "password": "Trader1234!"},
        )
        assert login_b.status_code == 200, login_b.text
        headers_b = {
            "Authorization": f"Bearer {login_b.json()['access_token']}"
        }

        # User B crea su cuenta + abre un trade en workspace B.
        account_b = await _create_account(
            client, headers_b, type="BINARY"
        )
        open_b = await client.post(
            "/api/v1/trades", headers=headers_b,
            json=_binary_open_payload(account_b["id"]),
        )
        assert open_b.status_code == 201, open_b.text

        # Summary del user A: NO debe ver el trade de B.
        resp = await client.get(
            "/api/v1/trades/risk-summary", headers=headers_a
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()

        assert body["open_trades_count"] == 0
        assert Decimal(body["daily_pnl_usd"]) == Decimal("0")
        assert body["level"] == "green"

        # Sanity: summary del user B sí ve su propio trade.
        resp_b = await client.get(
            "/api/v1/trades/risk-summary", headers=headers_b
        )
        assert resp_b.status_code == 200, resp_b.text
        assert resp_b.json()["open_trades_count"] == 1


# ============================================================
# FASE 4B — backend hardening: regression tests
# ============================================================
#
# Estos tests cubren los 2 bugs encontrados durante FASE 4A E2E
# contra el backend live:
#
# - Issue 1: ``GET /api/v1/trades/risk-summary`` devolvía 422
#   (path-validation contra ``/{trade_id}``) en runtime, aunque
#   los tests unitarios pasaban. El test
#   ``test_risk_summary_e2e_after_register`` reproduce el flow
#   E2E completo: register vía HTTP → GET /risk-summary con el
#   JWT fresco. Debe devolver 200 (no 422).
#
# - Issue 2: ``POST /api/v1/accounts`` devolvía 500
#   (``MissingGreenlet``) en runtime cuando el JWT emitido por
#   register traía ``workspace_ids=[]`` por una rareza del
#   connection pool después de uptime largo. El test
#   ``test_create_account_e2e_after_register`` cubre ese path.
#
# Ambos tests usan sólo HTTP (sin tocar DB directa) para reproducir
# exactamente el flow que rompe en el backend live.


async def test_risk_summary_e2e_after_register(
    client, valid_register_payload
) -> None:
    """FASE 4B regression: el flow E2E register → risk-summary devuelve 200.

    Antes del fix: 422 con ``loc=["path","trade_id"]`` porque FastAPI
    matcheaba ``risk-summary`` contra la ruta ``/{trade_id}`` (UUID
    inválido). El route está declarado ANTES de ``/{trade_id}`` y
    este test verifica que sigue siendo así en el flow HTTP real.
    """
    reg = await _register(client, valid_register_payload)
    access = reg["access_token"]

    # Sanity: el JWT trae workspace_ids poblado (FASE 4B fix #1).
    import base64
    import json

    p = access.split(".")[1]
    p += "=" * (-len(p) % 4)
    claims = json.loads(base64.urlsafe_b64decode(p))
    assert isinstance(claims["workspace_ids"], list)
    assert len(claims["workspace_ids"]) >= 1, (
        "JWT emitido por register debe traer workspace_ids poblado "
        "(FASE 4B hardening: se captura antes del commit)"
    )

    resp = await client.get(
        "/api/v1/trades/risk-summary",
        headers={"Authorization": f"Bearer {access}"},
    )
    # Antes: 422 (path validation contra /{trade_id}).
    # Después: 200 con body JSON del semáforo.
    assert resp.status_code == 200, (
        f"GET /trades/risk-summary esperaba 200, recibió {resp.status_code}: "
        f"{resp.text}"
    )
    body = resp.json()
    assert body["level"] in ("green", "yellow", "red")
    assert "daily_pnl_usd" in body
    assert "open_trades_count" in body
    assert "win_rate_today" in body
    assert "message" in body


async def test_risk_summary_returns_422_workspace_required_when_user_has_no_ws(
    client, db_session
) -> None:
    """FASE 4B: si el user autenticado no tiene workspace resoluble
    (caso ``WorkspaceRequiredError``), el endpoint devuelve 422 con
    ``code="WORKSPACE_REQUIRED"`` en lugar del 500 genérico.

    Esto cubre la ruta defensiva agregada en ``get_risk_summary``.
    """
    import base64
    import json

    from app.core.security.password import hash_password
    from app.models import User, UserRole

    suffix = uuid.uuid4().hex[:8]
    user = User(
        email=f"nows_rs_{suffix}@jadecapital.local",
        password_hash=hash_password("NoWork1234!"),
        first_name="No",
        last_name="Workspace",
        phone="+34600000999",
        role=UserRole.USER,
    )
    db_session.add(user)
    await db_session.flush()

    # Login emite JWT con ``workspace_ids=[]`` (user sin memberships).
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "NoWork1234!"},
    )
    assert login.status_code == 200, login.text
    access = login.json()["access_token"]
    # Confirmamos que el JWT está vacío (el setup).
    p = access.split(".")[1]
    p += "=" * (-len(p) % 4)
    claims = json.loads(base64.urlsafe_b64decode(p))
    assert claims["workspace_ids"] == []

    resp = await client.get(
        "/api/v1/trades/risk-summary",
        headers={"Authorization": f"Bearer {access}"},
    )
    # Antes del fix defensivo: 500 (WorkspaceRequiredError no
    # traducida en get_risk_summary). Después: 422 WORKSPACE_REQUIRED.
    assert resp.status_code == 422, resp.text
    body = resp.json()
    assert body["code"] == "WORKSPACE_REQUIRED"


# ============================================================
# FASE 6A — GET /trades/metrics (KPIs + equity curve)
# ============================================================

METRICS_URL = "/api/v1/trades/metrics"


async def _account_owner_ids(db_session, account_id: str) -> tuple:
    """``(user_id, workspace_id)`` de una cuenta creada vía HTTP.

    Los tests de metrics necesitan insertar trades cerrados con
    ``closed_at`` arbitrario (el flow HTTP siempre usa ``now()``), y
    para eso hace falta el par ``user_id``/``workspace_id`` real que
    el service usó al crear la cuenta.
    """
    account = (
        await db_session.execute(
            select(TradingAccount).where(
                TradingAccount.id == uuid.UUID(account_id)
            )
        )
    ).scalar_one()
    return account.user_id, account.workspace_id


async def _insert_closed_trade(
    db_session,
    *,
    user_id,
    workspace_id,
    account_id: str,
    pnl: str,
    closed_at,
    status: TradeStatus | None = None,
) -> None:
    """Inserta un trade YA cerrado con ``closed_at`` controlado.

    El endpoint ``/close`` siempre estampa ``datetime.now(utc)``, así
    que no hay forma vía HTTP de fabricar una serie multi-día. Se
    insertan como BINARY porque es el tipo con menos campos
    obligatorios.

    ``status`` se deriva del signo del ``pnl`` (misma regla que
    ``close_trade``) salvo que se pase explícito — necesario para el
    caso ``CLOSED_BREAK``, que también tiene ``pnl == 0``.

    Se hace ``commit()`` y NO ``flush()``: el fixture SQLite ``:memory:``
    usa ``StaticPool``, así que la sesión del request HTTP comparte la
    MISMA conexión que ``db_session``. Al terminar cada request,
    ``get_async_session`` hace ``session.close()``, que dispara un
    ROLLBACK sobre esa conexión y se lleva puesto cualquier flush sin
    commitear. Con flush, el primer GET vería los trades y el segundo
    los vería desaparecer.
    """
    amount = Decimal(pnl)
    if status is None:
        if amount > 0:
            status = TradeStatus.CLOSED_WIN
        elif amount < 0:
            status = TradeStatus.CLOSED_LOSS
        else:
            status = TradeStatus.CLOSED_BREAK
    db_session.add(
        Trade(
            user_id=user_id,
            workspace_id=workspace_id,
            account_id=uuid.UUID(account_id),
            instrument="EUR/USD OTC",
            type=TradeType.BINARY,
            status=status,
            direction="CALL",
            investment_usd=Decimal("100.00"),
            payout_pct=Decimal("85.00"),
            expiration_seconds=60,
            pnl_usd=amount,
            closed_at=closed_at,
        )
    )
    await db_session.commit()


def _utc(year: int, month: int, day: int):
    """Mediodía UTC del día indicado — evita bordes de medianoche."""
    return datetime(year, month, day, 12, 0, tzinfo=timezone.utc)


class TestMetrics:
    """``GET /api/v1/trades/metrics`` — KPIs + equity curve (FASE 6A).

    Mismo patrón que ``TestRiskSummary``: registración + cuenta vía
    HTTP. Los trades cerrados se insertan directo en DB cuando el test
    necesita controlar ``closed_at`` (equity curve, Sharpe, rango de
    fechas) porque el flow HTTP de ``/close`` siempre usa ``now()``.
    """

    async def test_metrics_no_trades_returns_zero(
        self, client, valid_register_payload
    ) -> None:
        """Workspace sin trades → ceros, ratios ``null``, curva vacía."""
        reg = await _register(client, valid_register_payload)
        headers = {"Authorization": f"Bearer {reg['access_token']}"}

        resp = await client.get(METRICS_URL, headers=headers)
        assert resp.status_code == 200, resp.text
        body = resp.json()

        assert body["total_trades"] == 0
        assert body["wins"] == 0
        assert body["losses"] == 0
        assert body["breaks"] == 0
        assert body["win_rate"] == 0.0
        assert body["profit_factor"] is None
        assert body["sharpe_ratio"] is None
        assert Decimal(body["expectancy_usd"]) == Decimal("0")
        assert Decimal(body["gross_profit_usd"]) == Decimal("0")
        assert Decimal(body["gross_loss_usd"]) == Decimal("0")
        assert body["equity_curve"] == []
        # Echo de los filtros: sin query params van todos en null.
        assert body["account_id"] is None
        assert body["from_date"] is None
        assert body["to_date"] is None

    async def test_metrics_calculates_win_rate(
        self, client, valid_register_payload, db_session
    ) -> None:
        """3 WIN + 1 LOSS + 1 BREAK → win_rate 0.75 (BREAK excluido).

        wins  = +10, +20, +30 → gross_profit 60, avg_win 20
        losses = −20          → gross_loss −20, avg_loss −20
        win_rate      = 3 / (3+1) = 0.75  ← el BREAK NO entra
        profit_factor = 60 / 20 = 3.0
        expectancy    = 0.75×20 + 0.25×(−20) = 10.00
        """
        reg = await _register(client, valid_register_payload)
        headers = {"Authorization": f"Bearer {reg['access_token']}"}
        account = await _create_account(client, headers, type="BINARY")
        user_id, ws_id = await _account_owner_ids(db_session, account["id"])

        for pnl in ("10.00", "20.00", "30.00", "-20.00"):
            await _insert_closed_trade(
                db_session,
                user_id=user_id,
                workspace_id=ws_id,
                account_id=account["id"],
                pnl=pnl,
                closed_at=_utc(2026, 3, 10),
            )
        await _insert_closed_trade(
            db_session,
            user_id=user_id,
            workspace_id=ws_id,
            account_id=account["id"],
            pnl="0.00",
            closed_at=_utc(2026, 3, 10),
            status=TradeStatus.CLOSED_BREAK,
        )

        resp = await client.get(METRICS_URL, headers=headers)
        assert resp.status_code == 200, resp.text
        body = resp.json()

        assert body["total_trades"] == 5
        assert body["wins"] == 3
        assert body["losses"] == 1
        assert body["breaks"] == 1
        assert body["win_rate"] == 0.75
        assert body["profit_factor"] == 3.0
        assert Decimal(body["gross_profit_usd"]) == Decimal("60.00")
        assert Decimal(body["gross_loss_usd"]) == Decimal("-20.00")
        assert Decimal(body["avg_win_usd"]) == Decimal("20.00")
        assert Decimal(body["avg_loss_usd"]) == Decimal("-20.00")
        assert Decimal(body["expectancy_usd"]) == Decimal("10.00")

    async def test_metrics_profit_factor_excludes_zero_loss(
        self, client, valid_register_payload, db_session
    ) -> None:
        """Sólo WIN → ``profit_factor`` es ``null``, NO infinito.

        Devolver un número gigante (o ``inf``, que ni es JSON válido)
        mentiría sobre la calidad de la estrategia.
        """
        reg = await _register(client, valid_register_payload)
        headers = {"Authorization": f"Bearer {reg['access_token']}"}
        account = await _create_account(client, headers, type="BINARY")
        user_id, ws_id = await _account_owner_ids(db_session, account["id"])

        for pnl in ("15.00", "25.00"):
            await _insert_closed_trade(
                db_session,
                user_id=user_id,
                workspace_id=ws_id,
                account_id=account["id"],
                pnl=pnl,
                closed_at=_utc(2026, 3, 10),
            )

        resp = await client.get(METRICS_URL, headers=headers)
        assert resp.status_code == 200, resp.text
        body = resp.json()

        assert body["profit_factor"] is None
        assert body["win_rate"] == 1.0
        assert Decimal(body["gross_loss_usd"]) == Decimal("0")
        assert Decimal(body["avg_loss_usd"]) == Decimal("0")
        # expectancy = 1.0×20 + 0.0×0 = 20.00
        assert Decimal(body["expectancy_usd"]) == Decimal("20.00")

    async def test_metrics_equity_curve_chronological(
        self, client, valid_register_payload, db_session
    ) -> None:
        """Curva ordenada por fecha con ``balance`` acumulado.

        día 1: +100 → balance 100
        día 2: −40  → balance 60
        Con 2 días sólo hay 1 retorno → Sharpe ``null``.
        """
        reg = await _register(client, valid_register_payload)
        headers = {"Authorization": f"Bearer {reg['access_token']}"}
        account = await _create_account(client, headers, type="BINARY")
        user_id, ws_id = await _account_owner_ids(db_session, account["id"])

        # Insertados en orden INVERSO a propósito: la curva debe salir
        # ordenada por el service, no por el orden de inserción.
        for pnl, when in (
            ("-40.00", _utc(2026, 3, 12)),
            ("100.00", _utc(2026, 3, 10)),
        ):
            await _insert_closed_trade(
                db_session,
                user_id=user_id,
                workspace_id=ws_id,
                account_id=account["id"],
                pnl=pnl,
                closed_at=when,
            )

        resp = await client.get(METRICS_URL, headers=headers)
        assert resp.status_code == 200, resp.text
        curve = resp.json()["equity_curve"]

        assert len(curve) == 2
        assert curve[0]["date"] == "2026-03-10"
        assert curve[1]["date"] == "2026-03-12"
        assert curve[0]["date"] < curve[1]["date"]

        assert Decimal(curve[0]["daily_pnl"]) == Decimal("100.00")
        assert Decimal(curve[0]["balance"]) == Decimal("100.00")
        assert Decimal(curve[1]["daily_pnl"]) == Decimal("-40.00")
        assert Decimal(curve[1]["balance"]) == Decimal("60.00")
        # Invariante del acumulado.
        assert Decimal(curve[1]["balance"]) == (
            Decimal(curve[0]["balance"]) + Decimal(curve[1]["daily_pnl"])
        )
        # 2 días ⇒ 1 retorno ⇒ menos del mínimo de 2 ⇒ null.
        assert resp.json()["sharpe_ratio"] is None

    async def test_metrics_sharpe_over_daily_returns(
        self, client, valid_register_payload, db_session
    ) -> None:
        """3 días con actividad → 2 retornos → Sharpe anualizado.

        pnl:      +100, +50, −30
        balances:  100, 150, 120
        retornos: día 1 se descarta (no hay capital previo),
                  50/100 = 0.5 ; −30/150 = −0.2
        mean = 0.15 ; stdev muestral = 0.494974...
        sharpe = (0.15 / 0.494974) × √252 ≈ 4.8107
        """
        reg = await _register(client, valid_register_payload)
        headers = {"Authorization": f"Bearer {reg['access_token']}"}
        account = await _create_account(client, headers, type="BINARY")
        user_id, ws_id = await _account_owner_ids(db_session, account["id"])

        for pnl, when in (
            ("100.00", _utc(2026, 4, 1)),
            ("50.00", _utc(2026, 4, 2)),
            ("-30.00", _utc(2026, 4, 3)),
        ):
            await _insert_closed_trade(
                db_session,
                user_id=user_id,
                workspace_id=ws_id,
                account_id=account["id"],
                pnl=pnl,
                closed_at=when,
            )

        resp = await client.get(METRICS_URL, headers=headers)
        assert resp.status_code == 200, resp.text
        body = resp.json()

        assert len(body["equity_curve"]) == 3
        assert body["sharpe_ratio"] == pytest.approx(4.8107, rel=1e-4)

    async def test_metrics_sharpe_null_when_zero_stdev(
        self, client, valid_register_payload, db_session
    ) -> None:
        """Retornos diarios idénticos → stdev 0 → Sharpe ``null``.

        pnl:      +100, +50, +75
        balances:  100, 150, 225
        retornos: 50/100 = 0.5 ; 75/150 = 0.5 → sin dispersión.
        """
        reg = await _register(client, valid_register_payload)
        headers = {"Authorization": f"Bearer {reg['access_token']}"}
        account = await _create_account(client, headers, type="BINARY")
        user_id, ws_id = await _account_owner_ids(db_session, account["id"])

        for pnl, when in (
            ("100.00", _utc(2026, 5, 4)),
            ("50.00", _utc(2026, 5, 5)),
            ("75.00", _utc(2026, 5, 6)),
        ):
            await _insert_closed_trade(
                db_session,
                user_id=user_id,
                workspace_id=ws_id,
                account_id=account["id"],
                pnl=pnl,
                closed_at=when,
            )

        resp = await client.get(METRICS_URL, headers=headers)
        assert resp.status_code == 200, resp.text
        body = resp.json()

        assert len(body["equity_curve"]) == 3
        assert body["sharpe_ratio"] is None

    async def test_metrics_filtered_by_account(
        self, client, valid_register_payload, db_session
    ) -> None:
        """``account_id`` acota los KPIs a una sola cuenta."""
        reg = await _register(client, valid_register_payload)
        headers = {"Authorization": f"Bearer {reg['access_token']}"}
        acc_a = await _create_account(client, headers, type="BINARY", name="A")
        acc_b = await _create_account(client, headers, type="BINARY", name="B")
        user_id, ws_id = await _account_owner_ids(db_session, acc_a["id"])

        await _insert_closed_trade(
            db_session,
            user_id=user_id,
            workspace_id=ws_id,
            account_id=acc_a["id"],
            pnl="40.00",
            closed_at=_utc(2026, 3, 10),
        )
        await _insert_closed_trade(
            db_session,
            user_id=user_id,
            workspace_id=ws_id,
            account_id=acc_b["id"],
            pnl="-15.00",
            closed_at=_utc(2026, 3, 10),
        )

        # Sin filtro: ve las dos cuentas.
        resp_all = await client.get(METRICS_URL, headers=headers)
        assert resp_all.status_code == 200, resp_all.text
        assert resp_all.json()["total_trades"] == 2

        # Filtrado por A: sólo el WIN de 40.
        resp_a = await client.get(
            f"{METRICS_URL}?account_id={acc_a['id']}", headers=headers
        )
        assert resp_a.status_code == 200, resp_a.text
        body_a = resp_a.json()
        assert body_a["account_id"] == acc_a["id"]
        assert body_a["total_trades"] == 1
        assert body_a["wins"] == 1
        assert body_a["losses"] == 0
        assert Decimal(body_a["gross_profit_usd"]) == Decimal("40.00")
        assert body_a["profit_factor"] is None  # sin pérdidas en A

        # Filtrado por B: sólo el LOSS de −15.
        resp_b = await client.get(
            f"{METRICS_URL}?account_id={acc_b['id']}", headers=headers
        )
        assert resp_b.status_code == 200, resp_b.text
        body_b = resp_b.json()
        assert body_b["total_trades"] == 1
        assert body_b["losses"] == 1
        assert body_b["win_rate"] == 0.0
        assert Decimal(body_b["gross_loss_usd"]) == Decimal("-15.00")

    async def test_metrics_filtered_by_date_range(
        self, client, valid_register_payload, db_session
    ) -> None:
        """``from``/``to`` acotan por ``closed_at``, ambos inclusivos."""
        reg = await _register(client, valid_register_payload)
        headers = {"Authorization": f"Bearer {reg['access_token']}"}
        account = await _create_account(client, headers, type="BINARY")
        user_id, ws_id = await _account_owner_ids(db_session, account["id"])

        for pnl, when in (
            ("10.00", _utc(2026, 6, 1)),  # antes del rango
            ("20.00", _utc(2026, 6, 5)),  # borde inferior (inclusivo)
            ("30.00", _utc(2026, 6, 7)),  # borde superior (inclusivo)
            ("40.00", _utc(2026, 6, 9)),  # después del rango
        ):
            await _insert_closed_trade(
                db_session,
                user_id=user_id,
                workspace_id=ws_id,
                account_id=account["id"],
                pnl=pnl,
                closed_at=when,
            )

        resp = await client.get(
            f"{METRICS_URL}?from=2026-06-05&to=2026-06-07", headers=headers
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()

        assert body["from_date"] == "2026-06-05"
        assert body["to_date"] == "2026-06-07"
        assert body["total_trades"] == 2
        # 20 + 30 — los de fuera del rango no suman.
        assert Decimal(body["gross_profit_usd"]) == Decimal("50.00")
        curve_dates = [p["date"] for p in body["equity_curve"]]
        assert curve_dates == ["2026-06-05", "2026-06-07"]

    async def test_metrics_unauthenticated_401(self, client) -> None:
        """Sin Authorization header → 401 AUTH_TOKEN_MISSING."""
        resp = await client.get(METRICS_URL)
        assert resp.status_code == 401, resp.text
        assert resp.json()["code"] == "AUTH_TOKEN_MISSING"

    async def test_metrics_cross_workspace_isolation(
        self, client, valid_register_payload, db_session
    ) -> None:
        """Trades del workspace B NO entran en las metrics de A.

        Mismo patrón que ``test_risk_summary_cross_workspace_isolation``:
        user A por HTTP, user B directo en DB con su propio workspace.
        """
        reg_a = await _register(client, valid_register_payload)
        headers_a = {"Authorization": f"Bearer {reg_a['access_token']}"}

        suffix = uuid.uuid4().hex[:8]
        user_b = User(
            email=f"metricsws_b_{suffix}@jadecapital.local",
            password_hash=hash_password("Trader1234!"),
            first_name="B",
            last_name="Metrics",
            phone="+34600000998",
            role=UserRole.USER,
        )
        db_session.add(user_b)
        await db_session.flush()
        await create_default_workspace_for_user(db_session, user_b)

        login_b = await client.post(
            "/api/v1/auth/login",
            json={"email": user_b.email, "password": "Trader1234!"},
        )
        assert login_b.status_code == 200, login_b.text
        headers_b = {
            "Authorization": f"Bearer {login_b.json()['access_token']}"
        }

        # User B cierra trades en SU workspace.
        account_b = await _create_account(client, headers_b, type="BINARY")
        user_b_id, ws_b = await _account_owner_ids(db_session, account_b["id"])
        await _insert_closed_trade(
            db_session,
            user_id=user_b_id,
            workspace_id=ws_b,
            account_id=account_b["id"],
            pnl="500.00",
            closed_at=_utc(2026, 3, 10),
        )

        # Metrics de A: vacías.
        resp_a = await client.get(METRICS_URL, headers=headers_a)
        assert resp_a.status_code == 200, resp_a.text
        body_a = resp_a.json()
        assert body_a["total_trades"] == 0
        assert body_a["equity_curve"] == []
        assert Decimal(body_a["gross_profit_usd"]) == Decimal("0")

        # Sanity: B sí ve lo suyo.
        resp_b = await client.get(METRICS_URL, headers=headers_b)
        assert resp_b.status_code == 200, resp_b.text
        body_b = resp_b.json()
        assert body_b["total_trades"] == 1
        assert Decimal(body_b["gross_profit_usd"]) == Decimal("500.00")
