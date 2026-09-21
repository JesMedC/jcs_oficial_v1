"""Tests del upgrade con MercadoPago SDK mockeado — p0c.

- Happy path: con un MERCADOPAGO_ACCESS_TOKEN configurado + SDK
  mockeado, ``POST /subscriptions/upgrade`` devuelve una URL real de
  MercadoPago (no placeholder).
- Sad path: con MERCADOPAGO_ACCESS_TOKEN vacío, devuelve 422
  ``MP_NOT_CONFIGURED`` (no placeholder URL).

El happy path usa ``unittest.mock.patch`` sobre ``MercadoPagoClient``
para no pegarle a la API real.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.models import PlanTierPrice, SubscriptionTier


async def _register(client, payload: dict) -> dict:
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _payload(unique_email: str) -> dict:
    return {
        "email": unique_email,
        "password": "Mp12345!",
        "first_name": "Mp",
        "last_name": "User",
        "phone": "+34612345678",
    }


async def _seed_plan_prices(db_session) -> None:
    """Sembramos un precio activo para cada tier (PLUS, ELITE)."""
    for tier in (SubscriptionTier.PLUS, SubscriptionTier.ELITE):
        existing = await db_session.scalar(
            select(PlanTierPrice).where(
                PlanTierPrice.tier == tier,
                PlanTierPrice.is_active.is_(True),
            )
        )
        if existing is None:
            row = PlanTierPrice(
                tier=tier,
                price_usd=Decimal("9.99") if tier == SubscriptionTier.PLUS else Decimal("29.99"),
                billing_period_days=30,
                is_active=True,
                effective_from=datetime.now(timezone.utc),
                effective_until=None,
            )
            db_session.add(row)
    await db_session.commit()


async def test_upgrade_calls_mp_sdk_and_returns_real_url(
    client, unique_email: str, monkeypatch, db_session
) -> None:
    """Happy path: SDK mockeado devuelve ``init_point`` real → URL en la respuesta."""
    # Activamos el SDK con un token fake (no le pegamos a MP gracias al mock).
    from app.config import get_settings as _gs

    monkeypatch.setenv("MERCADOPAGO_ACCESS_TOKEN", "TEST_FAKE_TOKEN_FOR_UPGRADE")
    _gs.cache_clear()

    try:
        # Sembramos precios para que el upgrade no falle con PRICE_NOT_CONFIGURED.
        await _seed_plan_prices(db_session)

        # Mockeamos ``MercadoPagoClient.create_preference``.
        from unittest.mock import patch
        from app.integrations.mercadopago import MercadoPagoClient

        async def fake_create_preference(self, **kwargs):
            return {
                "preference_id": "pref-test-123456",
                "init_point": "https://www.mercadopago.com/checkout/v1/redirect?pref_id=pref-test-123456",
                "sandbox_init_point": "https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=pref-test-123456",
            }

        with patch.object(
            MercadoPagoClient, "create_preference", new=fake_create_preference
        ):
            reg = await _register(client, _payload(unique_email))
            resp = await client.post(
                "/api/v1/subscriptions/upgrade",
                json={
                    "tier": "PLUS",
                    "success_url": "https://example.com/payment/success",
                    "failure_url": "https://example.com/payment/failure",
                    "pending_url": "https://example.com/payment/pending",
                },
                headers={"Authorization": f"Bearer {reg['access_token']}"},
            )

        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "checkout_url" in body
        assert "mp_preference_id" in body
        # NO es un placeholder.
        assert "PLACEHOLDER" not in body["checkout_url"]
        # Es una URL de MP (sandbox porque environment=development).
        assert "mercadopago.com" in body["checkout_url"]
        assert body["mp_preference_id"] == "pref-test-123456"
    finally:
        _gs.cache_clear()


async def test_upgrade_with_empty_token_returns_mp_not_configured(
    client, unique_email: str, monkeypatch, db_session
) -> None:
    """Sin MERCADOPAGO_ACCESS_TOKEN → 422 ``MP_NOT_CONFIGURED`` (no placeholder)."""
    from app.config import get_settings as _gs

    monkeypatch.setenv("MERCADOPAGO_ACCESS_TOKEN", "")
    _gs.cache_clear()

    try:
        # Sembramos precios también — el chequeo de MP_NOT_CONFIGURED
        # corre ANTES del lookup de precio.
        await _seed_plan_prices(db_session)

        reg = await _register(client, _payload(unique_email))
        resp = await client.post(
            "/api/v1/subscriptions/upgrade",
            json={"tier": "PLUS"},
            headers={"Authorization": f"Bearer {reg['access_token']}"},
        )

        assert resp.status_code == 422, resp.text
        body = resp.json()
        assert body["code"] == "MP_NOT_CONFIGURED"
        # Crítico: NO devolver un URL placeholder.
        assert "PLACEHOLDER" not in resp.text
        assert "mercadopago.com/checkout/v1/redirect" not in resp.text
    finally:
        _gs.cache_clear()