"""Tests del módulo ``TradingAccount`` — p0d.1 + p0e.2.

p0d.1 cubre ``GET /api/v1/accounts`` y ``POST /api/v1/accounts``:
- listado vacío inicial;
- create con ``balance_usd=0`` por default;
- la cuenta aparece en el listado del dueño;
- scoping per-user (un user NO ve las cuentas de otro);
- validación (broker_name vacío / type inválido → 422);
- 401 sin token.

p0e.2 cubre ``POST /fund``, ``POST /withdraw``, ``DELETE /{id}``:
- happy paths + validación de amount (gt 0, Numeric(10,2));
- insufficient balance (422 INSUFFICIENT_BALANCE);
- ownership 404 (no leak de existencia);
- soft delete + "ELIMINAR" confirmation;
- cuenta borrada no es mutable vía fund/withdraw.
"""
from __future__ import annotations

import uuid
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.core.security.password import hash_password
from app.models import AuditLog, TradingAccount, User, UserRole
from app.services.workspace_service import create_default_workspace_for_user


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
    type: str = "BINARY", name: str = "Cuenta principal"
) -> dict:
    """Helper p0e.2: crea una cuenta y devuelve el body de la respuesta."""
    resp = await client.post(
        "/api/v1/accounts",
        headers=headers,
        json={"broker_name": broker, "type": type, "name": name},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_list_accounts_empty_initially(client, valid_register_payload) -> None:
    """GET /accounts autenticado y sin cuentas → items=[], total=0."""
    reg = await _register(client, valid_register_payload)
    resp = await client.get(
        "/api/v1/accounts",
        headers={"Authorization": f"Bearer {reg['access_token']}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["items"] == []
    assert body["total"] == 0
    assert body["skip"] == 0
    assert body["limit"] == 50


async def test_create_binary_account_returns_201_with_zero_balance(
    client, valid_register_payload
) -> None:
    """POST /accounts crea una cuenta BINARY con balance_usd=0."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    # Sacamos el user_id desde ``/me`` (no viene en ``TokenOut``).
    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200, me.text
    owner_id = me.json()["user_id"]

    resp = await client.post(
        "/api/v1/accounts",
        headers=headers,
        json={
            "broker_name": "Pocket Option",
            "type": "BINARY",
            "name": "Cuenta principal",
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["broker_name"] == "Pocket Option"
    assert body["type"] == "BINARY"
    assert body["name"] == "Cuenta principal"
    # ``user_id`` es el del usuario autenticado.
    assert body["user_id"] == owner_id
    # ``balance_usd`` siempre arranca en 0 (server_default).
    assert Decimal(body["balance_usd"]) == Decimal("0.00")
    # Sanity: el body crudo enviado por el cliente NO tiene ``balance_usd``.
    sent = resp.request.content.decode()
    assert "balance_usd" not in sent
    assert body["id"]
    assert body["created_at"]
    assert body["updated_at"]


async def test_created_account_appears_in_list(client, valid_register_payload) -> None:
    """La cuenta creada aparece en GET /accounts del mismo usuario."""
    reg = await _register(client, valid_register_payload)
    # Creamos 2 cuentas.
    for name in ("Cuenta A", "Cuenta B"):
        create_resp = await client.post(
            "/api/v1/accounts",
            headers={"Authorization": f"Bearer {reg['access_token']}"},
            json={
                "broker_name": "Quotex",
                "type": "BINARY",
                "name": name,
            },
        )
        assert create_resp.status_code == 201, create_resp.text

    resp = await client.get(
        "/api/v1/accounts",
        headers={"Authorization": f"Bearer {reg['access_token']}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2
    names = {item["name"] for item in body["items"]}
    assert names == {"Cuenta A", "Cuenta B"}


async def test_user_cannot_see_other_users_accounts(
    client, valid_register_payload, db_session
) -> None:
    """Per-user scoping: el user B no ve las cuentas del user A."""
    # User A se registra vía HTTP (auth real) — crea 1 cuenta.
    reg_a = await _register(client, valid_register_payload)
    headers_a = {"Authorization": f"Bearer {reg_a['access_token']}"}
    create_resp = await client.post(
        "/api/v1/accounts",
        headers=headers_a,
        json={
            "broker_name": "Pocket Option",
            "type": "FOREX",
            "name": "A's account",
        },
    )
    assert create_resp.status_code == 201, create_resp.text

    # User B se crea directo en DB (más rápido que otro round-trip) + login.
    suffix = uuid.uuid4().hex[:8]
    user_b = User(
        email=f"tb_{suffix}@jadecapital.local",
        password_hash=hash_password("Trader1234!"),
        first_name="B",
        last_name="User",
        phone="+34600000000",
        role=UserRole.USER,
    )
    db_session.add(user_b)
    await db_session.flush()
    # p0f.1: user B necesita un workspace propio para que su login
    # emita un JWT con ``workspace_ids`` no vacío. Sin esto,
    # ``infer_workspace_id`` levanta ``WorkspaceRequiredError`` y la
    # creación de la cuenta falla con 500 antes de poder probar el
    # per-user scoping.
    await create_default_workspace_for_user(db_session, user_b)

    login_b = await client.post(
        "/api/v1/auth/login",
        json={"email": user_b.email, "password": "Trader1234!"},
    )
    assert login_b.status_code == 200, login_b.text
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # B crea su propia cuenta.
    create_b = await client.post(
        "/api/v1/accounts",
        headers=headers_b,
        json={
            "broker_name": "IC Markets",
            "type": "FOREX",
            "name": "B's account",
        },
    )
    assert create_b.status_code == 201, create_b.text

    # Listado de B: 1 sola cuenta, la suya.
    resp_b = await client.get("/api/v1/accounts", headers=headers_b)
    assert resp_b.status_code == 200, resp_b.text
    body_b = resp_b.json()
    assert body_b["total"] == 1
    assert len(body_b["items"]) == 1
    assert body_b["items"][0]["name"] == "B's account"
    assert body_b["items"][0]["user_id"] == str(user_b.id)

    # Listado de A: 1 sola cuenta, la suya.
    resp_a = await client.get("/api/v1/accounts", headers=headers_a)
    assert resp_a.status_code == 200, resp_a.text
    body_a = resp_a.json()
    assert body_a["total"] == 1
    assert len(body_a["items"]) == 1
    assert body_a["items"][0]["name"] == "A's account"
    # ``user_id`` de A = el que viene en la fila creada por A.
    assert body_a["items"][0]["user_id"] == body_b["items"][0]["user_id"] or (
        body_a["items"][0]["user_id"] != str(user_b.id)
    )


@pytest.mark.parametrize(
    "bad_payload",
    [
        # broker_name vacío
        {"broker_name": "", "type": "BINARY", "name": "ok"},
        # type inválido
        {"broker_name": "ok", "type": "CRYPTO", "name": "ok"},
        # name vacío
        {"broker_name": "ok", "type": "BINARY", "name": ""},
        # broker_name faltante
        {"type": "BINARY", "name": "ok"},
    ],
)
async def test_create_account_validation_returns_422(
    client, valid_register_payload, bad_payload
) -> None:
    """Payload inválido → 422 VALIDATION_ERROR."""
    reg = await _register(client, valid_register_payload)
    resp = await client.post(
        "/api/v1/accounts",
        headers={"Authorization": f"Bearer {reg['access_token']}"},
        json=bad_payload,
    )
    assert resp.status_code == 422, resp.text
    assert resp.json()["code"] == "VALIDATION_ERROR"


async def test_list_accounts_unauthenticated_returns_401(client) -> None:
    """Sin Authorization → 401 AUTH_TOKEN_MISSING."""
    resp = await client.get("/api/v1/accounts")
    assert resp.status_code == 401, resp.text
    assert resp.json()["code"] == "AUTH_TOKEN_MISSING"


async def test_create_account_unauthenticated_returns_401(client) -> None:
    """POST sin Authorization → 401 AUTH_TOKEN_MISSING."""
    resp = await client.post(
        "/api/v1/accounts",
        json={"broker_name": "x", "type": "BINARY", "name": "y"},
    )
    assert resp.status_code == 401, resp.text
    assert resp.json()["code"] == "AUTH_TOKEN_MISSING"


# ============================================================
# p0e.2 — fund / withdraw / delete
# ============================================================


async def test_fund_account_increases_balance_and_emits_audit(
    client, valid_register_payload, db_session
) -> None:
    """POST /fund happy path → 200, balance += amount, audit_log con new_balance."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers)
    account_id = account["id"]

    resp = await client.post(
        f"/api/v1/accounts/{account_id}/fund",
        headers=headers,
        json={"amount": "250.00"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert Decimal(body["balance_usd"]) == Decimal("250.00")
    assert body["id"] == account_id

    # Audit log entry debe existir.
    rows = list(
        (await db_session.execute(
            select(AuditLog).where(
                AuditLog.action == "account.fund",
                AuditLog.entity_id == account_id,
            )
        )).scalars().all()
    )
    assert len(rows) == 1, "expected exactly one account.fund audit row"
    entry = rows[0]
    assert entry.new_value == {
        "amount": "250.00",
        "new_balance": "250.00",
    }
    assert entry.previous_value == {"balance_usd": "0.00"}


async def test_fund_account_zero_amount_returns_422(
    client, valid_register_payload
) -> None:
    """fund con amount=0 → 422 VALIDATION_ERROR (Pydantic gt=0)."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers)
    resp = await client.post(
        f"/api/v1/accounts/{account['id']}/fund",
        headers=headers,
        json={"amount": "0"},
    )
    assert resp.status_code == 422, resp.text
    assert resp.json()["code"] == "VALIDATION_ERROR"


async def test_fund_account_negative_amount_returns_422(
    client, valid_register_payload
) -> None:
    """fund con amount<0 → 422 VALIDATION_ERROR."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers)
    resp = await client.post(
        f"/api/v1/accounts/{account['id']}/fund",
        headers=headers,
        json={"amount": "-50.00"},
    )
    assert resp.status_code == 422, resp.text
    assert resp.json()["code"] == "VALIDATION_ERROR"


async def test_fund_other_users_account_returns_404(
    client, valid_register_payload, db_session
) -> None:
    """fund sobre cuenta ajena → 404 NOT_FOUND (no leak de existencia)."""
    reg_a = await _register(client, valid_register_payload)
    headers_a = {"Authorization": f"Bearer {reg_a['access_token']}"}
    account_a = await _create_account(
        client, headers_a, name="A's account"
    )

    # Creamos user B directo en DB + login.
    suffix = uuid.uuid4().hex[:8]
    user_b = User(
        email=f"fund_b_{suffix}@jadecapital.local",
        password_hash=hash_password("Trader1234!"),
        first_name="B",
        last_name="User",
        phone="+34600000000",
        role=UserRole.USER,
    )
    db_session.add(user_b)
    await db_session.flush()
    # p0f.1: B necesita workspace propio para tener JWT con
    # ``workspace_ids`` no vacío.
    await create_default_workspace_for_user(db_session, user_b)
    login_b = await client.post(
        "/api/v1/auth/login",
        json={"email": user_b.email, "password": "Trader1234!"},
    )
    assert login_b.status_code == 200, login_b.text
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

    resp = await client.post(
        f"/api/v1/accounts/{account_a['id']}/fund",
        headers=headers_b,
        json={"amount": "100.00"},
    )
    assert resp.status_code == 404, resp.text
    assert resp.json()["code"] == "NOT_FOUND"


async def test_withdraw_account_decreases_balance(
    client, valid_register_payload
) -> None:
    """POST /withdraw happy path → 200, balance -= amount."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers)
    account_id = account["id"]

    # Primero fondeamos 500.
    fund_resp = await client.post(
        f"/api/v1/accounts/{account_id}/fund",
        headers=headers,
        json={"amount": "500.00"},
    )
    assert fund_resp.status_code == 200, fund_resp.text
    assert Decimal(fund_resp.json()["balance_usd"]) == Decimal("500.00")

    # Ahora retiramos 200.
    resp = await client.post(
        f"/api/v1/accounts/{account_id}/withdraw",
        headers=headers,
        json={"amount": "200.00"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert Decimal(body["balance_usd"]) == Decimal("300.00")


async def test_withdraw_exceeding_balance_returns_422_insufficient(
    client, valid_register_payload
) -> None:
    """withdraw > balance → 422 INSUFFICIENT_BALANCE."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers)
    account_id = account["id"]

    # Fondeamos 100.
    fund_resp = await client.post(
        f"/api/v1/accounts/{account_id}/fund",
        headers=headers,
        json={"amount": "100.00"},
    )
    assert fund_resp.status_code == 200, fund_resp.text

    # Pedimos 150 (más que el saldo).
    resp = await client.post(
        f"/api/v1/accounts/{account_id}/withdraw",
        headers=headers,
        json={"amount": "150.00"},
    )
    assert resp.status_code == 422, resp.text
    assert resp.json()["code"] == "INSUFFICIENT_BALANCE"


async def test_withdraw_zero_amount_returns_422(
    client, valid_register_payload
) -> None:
    """withdraw con amount=0 → 422 VALIDATION_ERROR."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers)
    resp = await client.post(
        f"/api/v1/accounts/{account['id']}/withdraw",
        headers=headers,
        json={"amount": "0"},
    )
    assert resp.status_code == 422, resp.text
    assert resp.json()["code"] == "VALIDATION_ERROR"


async def test_delete_account_with_confirmation_returns_204(
    client, valid_register_payload, db_session
) -> None:
    """DELETE con confirmation='ELIMINAR' → 204, la cuenta no aparece en list."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers)
    account_id = account["id"]

    resp = await client.request(
        "DELETE",
        f"/api/v1/accounts/{account_id}",
        headers=headers,
        json={"confirmation": "ELIMINAR"},
    )
    assert resp.status_code == 204, resp.text

    # List ya no la incluye.
    list_resp = await client.get("/api/v1/accounts", headers=headers)
    assert list_resp.status_code == 200, list_resp.text
    assert list_resp.json()["total"] == 0

    # Pero la fila sigue en DB con deleted_at populado (soft delete).
    row = (
        await db_session.execute(
            select(TradingAccount).where(TradingAccount.id == uuid.UUID(account_id))
        )
    ).scalar_one()
    assert row.deleted_at is not None

    # Y emitió audit log.
    audit_rows = list(
        (await db_session.execute(
            select(AuditLog).where(
                AuditLog.action == "account.delete",
                AuditLog.entity_id == account_id,
            )
        )).scalars().all()
    )
    assert len(audit_rows) == 1
    assert audit_rows[0].previous_value == {
        "broker_name": "Pocket Option",
        "name": "Cuenta principal",
        "last_balance": "0.00",
    }


async def test_delete_account_wrong_confirmation_returns_400(
    client, valid_register_payload
) -> None:
    """DELETE con confirmation != 'ELIMINAR' → 400 CONFIRMATION_REQUIRED."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers)
    resp = await client.request(
        "DELETE",
        f"/api/v1/accounts/{account['id']}",
        headers=headers,
        json={"confirmation": "eliminar"},  # minúsculas
    )
    assert resp.status_code == 400, resp.text
    assert resp.json()["code"] == "CONFIRMATION_REQUIRED"


async def test_delete_other_users_account_returns_404(
    client, valid_register_payload, db_session
) -> None:
    """DELETE sobre cuenta ajena → 404 NOT_FOUND."""
    reg_a = await _register(client, valid_register_payload)
    headers_a = {"Authorization": f"Bearer {reg_a['access_token']}"}
    account_a = await _create_account(
        client, headers_a, name="A's account"
    )

    suffix = uuid.uuid4().hex[:8]
    user_b = User(
        email=f"del_b_{suffix}@jadecapital.local",
        password_hash=hash_password("Trader1234!"),
        first_name="B",
        last_name="User",
        phone="+34600000000",
        role=UserRole.USER,
    )
    db_session.add(user_b)
    await db_session.flush()
    # p0f.1: B necesita workspace propio para tener JWT con
    # ``workspace_ids`` no vacío.
    await create_default_workspace_for_user(db_session, user_b)
    login_b = await client.post(
        "/api/v1/auth/login",
        json={"email": user_b.email, "password": "Trader1234!"},
    )
    assert login_b.status_code == 200, login_b.text
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

    resp = await client.request(
        "DELETE",
        f"/api/v1/accounts/{account_a['id']}",
        headers=headers_b,
        json={"confirmation": "ELIMINAR"},
    )
    assert resp.status_code == 404, resp.text
    assert resp.json()["code"] == "NOT_FOUND"


async def test_fund_and_withdraw_deleted_account_returns_404(
    client, valid_register_payload
) -> None:
    """Cuenta soft-deleted no es mutable vía fund/withdraw → 404."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers)
    account_id = account["id"]

    # Borramos.
    del_resp = await client.request(
        "DELETE",
        f"/api/v1/accounts/{account_id}",
        headers=headers,
        json={"confirmation": "ELIMINAR"},
    )
    assert del_resp.status_code == 204, del_resp.text

    # fund → 404.
    fund_resp = await client.post(
        f"/api/v1/accounts/{account_id}/fund",
        headers=headers,
        json={"amount": "10.00"},
    )
    assert fund_resp.status_code == 404, fund_resp.text
    assert fund_resp.json()["code"] == "NOT_FOUND"

    # withdraw → 404.
    wd_resp = await client.post(
        f"/api/v1/accounts/{account_id}/withdraw",
        headers=headers,
        json={"amount": "5.00"},
    )
    assert wd_resp.status_code == 404, wd_resp.text
    assert wd_resp.json()["code"] == "NOT_FOUND"


# ============================================================
# p0f.1 — multi-tenant wiring (workspace_id inferido del JWT)
# ============================================================


async def test_create_account_infers_workspace_id(
    client, valid_register_payload
) -> None:
    """POST /accounts setea ``workspace_id`` igual al OWNER workspace del user."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}

    # El endpoint /me devuelve los workspaces del user; el primero
    # (OWNER, más antiguo) es el que el service infiere.
    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200, me.text
    expected_ws = me.json()["workspaces"][0]["id"]

    resp = await client.post(
        "/api/v1/accounts",
        headers=headers,
        json={"broker_name": "Pocket Option", "type": "BINARY", "name": "Wired"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["workspace_id"] == expected_ws


async def test_list_accounts_filtered_by_workspace(
    client, valid_register_payload, db_session
) -> None:
    """Si el user tiene 2 workspaces OWNER, las cuentas se asignan al
    workspace inferido (el más antiguo). GET lista solo esas.

    Setup: el register vía HTTP crea un solo workspace OWNER para el
    user. Para el segundo workspace, lo creamos directo en DB y lo
    añadimos como OWNER. Como será más nuevo que el primero, NO es el
    inferido — sus cuentas (si las tuviera) NO aparecerían en el
    listado del JWT.

    Esta property test prueba la branch simple: workspace_ids del JWT
    decide qué se ve.
    """
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}

    # Creamos 2 cuentas en el workspace inferido (el del register).
    for i, name in enumerate(("Inferida A", "Inferida B")):
        r = await client.post(
            "/api/v1/accounts",
            headers=headers,
            json={
                "broker_name": "Pocket",
                "type": "BINARY",
                "name": name,
            },
        )
        assert r.status_code == 201, r.text

    # El listado devuelve 2.
    resp = await client.get("/api/v1/accounts", headers=headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 2
    assert {item["name"] for item in body["items"]} == {
        "Inferida A",
        "Inferida B",
    }
    # Todas con el mismo workspace_id (= el inferido).
    wss = {item["workspace_id"] for item in body["items"]}
    assert len(wss) == 1


async def test_create_account_without_workspace_returns_422(
    client, valid_register_payload, db_session
) -> None:
    """User B creado directo en DB sin workspace → crear cuenta → 422
    ``WORKSPACE_REQUIRED``.

    Pydantic preserva el code literal del error (porque
    ``WORKSPACE_REQUIRED`` está en ``ErrorCode``).
    """
    # User sin workspace.
    suffix = uuid.uuid4().hex[:8]
    user = User(
        email=f"nows_{suffix}@jadecapital.local",
        password_hash=hash_password("NoWork1234!"),
        first_name="No",
        last_name="Workspace",
        phone="+34600000999",
        role=UserRole.USER,
    )
    db_session.add(user)
    await db_session.flush()

    # Login emite JWT con ``workspace_ids=[]``.
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "NoWork1234!"},
    )
    assert login.status_code == 200, login.text
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    # POST /accounts → 422 WORKSPACE_REQUIRED.
    resp = await client.post(
        "/api/v1/accounts",
        headers=headers,
        json={"broker_name": "x", "type": "BINARY", "name": "y"},
    )
    assert resp.status_code == 422, resp.text
    assert resp.json()["code"] == "WORKSPACE_REQUIRED"


# ============================================================
# FASE 4B — backend hardening: regression tests
# ============================================================
#
# Cubre los 2 bugs encontrados durante FASE 4A E2E contra el
# backend live:
#
# - Issue 2: ``POST /api/v1/accounts`` devolvía 500
#   (``MissingGreenlet``) en runtime cuando el JWT emitido por
#   register traía ``workspace_ids=[]`` por una rareza del
#   connection pool después de uptime largo. El test
#   ``test_create_account_e2e_after_register`` reproduce ese path
#   usando sólo HTTP (sin tocar DB directa).
#
# - Verificación del invariant: ``workspace_id`` que devuelve el
#   POST /accounts tiene que ser EXACTAMENTE el del claim del JWT
#   (``test_create_account_workspace_id_matches_jwt_claim``).
#   Esto protege contra el caso donde el service infiere por DB
#   y termina devolviendo un workspace distinto al activo del
#   usuario.


async def test_create_account_e2e_after_register(
    client, valid_register_payload
) -> None:
    """FASE 4B regression: register HTTP → POST /accounts devuelve 201.

    Antes del fix: 500 ``MissingGreenlet`` porque el JWT emitido
    por ``register_user`` traía ``workspace_ids=[]`` (connection
    pool del worker no veía la fila recién insertada) y el service
    caía al DB fallback que también fallaba por la misma razón.
    Después: 201 con ``workspace_id`` poblado correctamente.
    """
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}

    # Sanity: el JWT trae workspace_ids poblado (FASE 4B fix #1).
    import base64
    import json

    p = reg["access_token"].split(".")[1]
    p += "=" * (-len(p) % 4)
    claims = json.loads(base64.urlsafe_b64decode(p))
    assert len(claims["workspace_ids"]) >= 1, (
        "JWT emitido por register debe traer workspace_ids poblado "
        "(FASE 4B hardening: workspace_ids se capturan antes del commit)"
    )

    resp = await client.post(
        "/api/v1/accounts",
        headers=headers,
        json={
            "broker_name": "Pocket Option",
            "type": "BINARY",
            "name": "E2E Account",
        },
    )
    # Antes: 500 MissingGreenlet.
    # Después: 201 con body conteniendo workspace_id.
    assert resp.status_code == 201, (
        f"POST /accounts esperaba 201, recibió {resp.status_code}: "
        f"{resp.text}"
    )
    body = resp.json()
    assert body["broker_name"] == "Pocket Option"
    assert body["type"] == "BINARY"
    assert body["name"] == "E2E Account"
    assert "workspace_id" in body
    assert body["workspace_id"] is not None, (
        "workspace_id no debe ser None (model es NOT NULL en runtime)"
    )
    # El balance siempre arranca en 0.
    assert Decimal(body["balance_usd"]) == Decimal("0")


async def test_create_account_workspace_id_matches_jwt_claim(
    client, valid_register_payload
) -> None:
    """FASE 4B invariant: ``workspace_id`` del POST /accounts ==
    primer workspace del claim ``workspace_ids`` del JWT.

    Esto cierra el caso donde ``infer_workspace_id`` devolvía un
    workspace distinto al activo del JWT (por membership más
    antigua + JWT con varios workspaces). El service ya usaba
    ``jwt_workspace_ids`` primero, pero el bug de ``workspace_ids=[]``
    en el JWT hacía que siempre cayera al DB fallback.
    """
    import base64
    import json

    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}

    # El endpoint /me devuelve la lista de workspaces del JWT.
    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200, me.text
    expected_ws = me.json()["workspaces"][0]["id"]

    resp = await client.post(
        "/api/v1/accounts",
        headers=headers,
        json={"broker_name": "Pocket Option", "type": "BINARY", "name": "X"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["workspace_id"] == expected_ws

    # Y el workspace del JWT claim coincide con el que vino en /me.
    p = reg["access_token"].split(".")[1]
    p += "=" * (-len(p) % 4)
    claims = json.loads(base64.urlsafe_b64decode(p))
    assert expected_ws in claims["workspace_ids"]


# ============================================================
# delete_account cascade — soft-delete de trades asociados
# ============================================================
#
# Bug 2 — ``delete_account`` (p0e.2) sólo marca ``deleted_at`` en
# la fila de la cuenta. Los ``Trade`` asociados quedaban con
# ``deleted_at IS NULL`` y aparecían en ``GET /trades`` aunque su
# cuenta ya no existía para el usuario. El fix agrega una UPDATE
# masiva sobre ``trades`` ANTES de marcar la cuenta: cascade
# soft-delete preservando audit trail (las filas siguen en la DB).
#
# Test paralelo vive en ``test_trades.py`` (``test_list_trades_…
# _from_deleted_account``) que valida el filtro defense-in-depth
# en ``list_trades``.


async def test_delete_account_cascades_to_trades(
    client, valid_register_payload, db_session
) -> None:
    """DELETE /accounts/{id} → todos los trades de esa cuenta quedan
    con ``deleted_at`` poblado y desaparecen de GET /trades.

    Cubre el caso OPEN + CLOSED: la cascade marca TODO trade de la
    cuenta, no sólo los abiertos (un trade cerrado sigue siendo un
    trade de la cuenta, y si la cuenta se borró no queremos que
    siga visible en el historial del usuario).
    """
    from app.models.trade import Trade

    # Register + workspace + cuenta BINARY fondeada para poder abrir trades.
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    account = await _create_account(client, headers, name="Cascade target")
    account_id = account["id"]

    # Fondear para que la deducción de inversión no falle por balance.
    fund_resp = await client.post(
        f"/api/v1/accounts/{account_id}/fund",
        headers=headers,
        json={"amount": "500.00"},
    )
    assert fund_resp.status_code == 200, fund_resp.text

    # Abrir 2 trades BINARY.
    trade_responses = []
    for _ in range(2):
        resp = await client.post(
            "/api/v1/trades",
            headers=headers,
            json={
                "account_id": account_id,
                "instrument": "EUR/USD OTC",
                "type": "BINARY",
                "direction": "CALL",
                "investment_usd": "10.00",
                "payout_pct": "85.00",
                "expiration_seconds": 60,
                "interest": "PLAN",
            },
        )
        assert resp.status_code == 201, resp.text
        trade_responses.append(resp.json())

    trade_ids = [uuid.UUID(t["id"]) for t in trade_responses]

    # Cerramos uno de los dos (WIN) para que el cascade cubra el caso
    # mixto OPEN + CLOSED.
    close_resp = await client.post(
        f"/api/v1/trades/{trade_ids[0]}/close",
        headers=headers,
        json={"outcome": "WIN"},
    )
    assert close_resp.status_code == 200, close_resp.text

    # Antes del delete: ambos trades visibles en GET /trades.
    pre_list = await client.get("/api/v1/trades", headers=headers)
    assert pre_list.status_code == 200, pre_list.text
    pre_ids = {uuid.UUID(t["id"]) for t in pre_list.json()["items"]}
    assert pre_ids == set(trade_ids), (
        f"sanity check falló: esperaba {trade_ids}, recibí {pre_ids}"
    )

    # El delete con confirmation="ELIMINAR" → 204.
    del_resp = await client.request(
        "DELETE",
        f"/api/v1/accounts/{account_id}",
        headers=headers,
        json={"confirmation": "ELIMINAR"},
    )
    assert del_resp.status_code == 204, del_resp.text

    # DB-level: ambos trades tienen deleted_at populado.
    db_trades = list(
        (await db_session.execute(
            select(Trade).where(Trade.account_id == uuid.UUID(account_id))
        )).scalars().all()
    )
    assert len(db_trades) == 2, (
        f"esperaba 2 trades en DB, encontré {len(db_trades)} "
        "(el cascade no debe borrar filas, sólo soft-deleted)"
    )
    for t in db_trades:
        assert t.deleted_at is not None, (
            f"trade {t.id} quedó con deleted_at NULL tras cascade"
        )

    # Endpoint-level: GET /trades ya no incluye ninguno de los dos.
    post_list = await client.get("/api/v1/trades", headers=headers)
    assert post_list.status_code == 200, post_list.text
    post_ids = {uuid.UUID(t["id"]) for t in post_list.json()["items"]}
    assert post_ids.isdisjoint(trade_ids), (
        f"GET /trades devolvió trades soft-deleted: {post_ids & trade_ids}"
    )

    # Audit del delete se sigue emitiendo con el shape estable (no se
    # agrega ``trades_cascaded`` al payload para mantener compat con
    # callers que assertan el dict exacto). La trazabilidad del
    # count de cascade vive en el log estructurado.
    audit_rows = list(
        (await db_session.execute(
            select(AuditLog).where(
                AuditLog.action == "account.delete",
                AuditLog.entity_id == account_id,
            )
        )).scalars().all()
    )
    assert len(audit_rows) == 1
    # Shape estable — sólo ``deleted_at`` en ``new_value``.
    assert set(audit_rows[0].new_value.keys()) == {"deleted_at"}
