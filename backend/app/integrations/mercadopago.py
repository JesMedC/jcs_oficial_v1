"""MercadoPago SDK client wrapper.

p0c: real MercadoPago integration replacing the placeholder checkout URLs.

The client is intentionally narrow — only the three operations the
backend needs:

- ``create_preference`` — POST a preference (item + back_urls +
  external_reference + payer) and return ``{preference_id, init_point}``.
- ``verify_webhook_signature`` — accept/reject a webhook based on the
  ``x-signature`` + ``x-request-id`` headers. In development (no
  ``mercadopago_webhook_secret`` configured), accepts all.
- ``get_payment`` — fetch the canonical payment payload from MP so we
  can inspect ``status`` and ``external_reference``.

We pin ``mercadopago==2.4.0`` in ``pyproject.toml`` — no caret ranges.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
from decimal import Decimal
from typing import Any, Mapping

import mercadopago
from pydantic import AnyHttpUrl

from app.config import Settings

log = logging.getLogger(__name__)


class MercadoPagoConfigError(Exception):
    """Raised when MERCADOPAGO_ACCESS_TOKEN is empty at runtime.

    Routes translate this into a clear error envelope (no placeholder
    URLs).
    """


class MercadoPagoClient:
    """Thin wrapper over the MercadoPago SDK.

    The SDK is instantiated once per client. The ``Settings`` are read
    on construction so the caller can pass a stub during tests.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        token = settings.mercadopago_access_token
        if token == "":
            self._sdk: mercadopago.SDK | None = None
        else:
            self._sdk = mercadopago.SDK(token)

    @property
    def configured(self) -> bool:
        """True when the SDK was initialised with a non-empty access token."""
        return self._sdk is not None

    @property
    def sandbox(self) -> bool:
        """Use sandbox_init_point when in development, init_point otherwise."""
        return self._settings.environment != "production"

    # ---- create preference ----
    async def create_preference(
        self,
        *,
        title: str,
        price_usd: Decimal,
        success_url: AnyHttpUrl,
        failure_url: AnyHttpUrl,
        pending_url: AnyHttpUrl,
        external_reference: str,
        payer_email: str,
    ) -> dict[str, str]:
        """Create a Checkout Pro preference.

        Returns ``{preference_id, init_point, sandbox_init_point}``.

        MercadoPago takes USD as a regular currency code; the SDK expects
        ``transaction_amount`` as a float. We round to 2 decimals to keep
        the JSON tidy.

        Raises ``MercadoPagoConfigError`` when the SDK is not configured
        (no access token in env) — the caller MUST surface a clear error
        envelope to the client; never return a placeholder URL.
        """
        if self._sdk is None:
            raise MercadoPagoConfigError(
                "MERCADOPAGO_ACCESS_TOKEN no esta configurado. "
                "Agregalo al .env para activar pagos reales."
            )

        preference_data: dict[str, Any] = {
            "items": [
                {
                    "title": title,
                    "quantity": 1,
                    "unit_price": float(round(price_usd, 2)),
                    "currency_id": "USD",
                }
            ],
            "payer": {"email": payer_email},
            "back_urls": {
                "success": str(success_url),
                "failure": str(failure_url),
                "pending": str(pending_url),
            },
            "auto_return": "approved",
            "external_reference": external_reference,
        }

        result = self._sdk.preference().create(preference_data)
        # The SDK returns ``{"status": <http_code>, "response": {...}}``.
        # ``response`` contains ``id`` + ``init_point`` + ``sandbox_init_point``.
        if not isinstance(result, Mapping):
            raise MercadoPagoConfigError(
                f"MercadoPago devolvio una respuesta inesperada: {result!r}"
            )
        status_code = result.get("status")
        if status_code is None or not (200 <= int(status_code) < 300):
            raise MercadoPagoConfigError(
                f"MercadoPago rechazo la preference (status={status_code}): "
                f"{result.get('response')}"
            )

        response = result.get("response") or {}
        return {
            "preference_id": str(response.get("id") or ""),
            "init_point": str(response.get("init_point") or ""),
            "sandbox_init_point": str(response.get("sandbox_init_point") or ""),
        }

    # ---- webhook signature ----
    def verify_webhook_signature(
        self,
        *,
        data_id: str,
        signature_header: str | None,
        request_id_header: str | None,
    ) -> bool:
        """Verify the ``x-signature`` header against the configured secret.

        The MP webhook spec is:

        ```
        x-signature: ts=<unix_ts>,v1=<hex_hmac_sha256>
        x-request-id: <request_uuid>
        ```

        Where the HMAC is computed over the string
        ``id=<data_id>;request-id=<request_id>;ts=<ts>``.

        If ``mercadopago_webhook_secret`` is empty (dev), accept all
        webhooks — the developer is responsible for not exposing the
        webhook endpoint to the public internet in that mode.
        """
        secret = self._settings.mercadopago_webhook_secret
        if secret == "":
            log.warning(
                "mp_webhook.dev_mode",
                extra={"event": "mercadopago.webhook", "dev_accepted": True},
            )
            return True

        if signature_header is None or request_id_header is None:
            return False

        try:
            # Parse "ts=...,v1=...".
            parts = dict(
                piece.split("=", 1)
                for piece in signature_header.split(",")
                if "=" in piece
            )
            ts = parts.get("ts", "")
            v1 = parts.get("v1", "")
        except (ValueError, AttributeError):
            return False

        if ts == "" or v1 == "":
            return False

        manifest = f"id={data_id};request-id={request_id_header};ts={ts}"
        digest = hmac.new(
            secret.encode("utf-8"),
            manifest.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(digest, v1)

    # ---- fetch payment ----
    async def get_payment(self, payment_id: str) -> dict[str, Any]:
        """Fetch the canonical payment record from MercadoPago.

        Returns the raw ``response`` payload — caller picks the fields it
        needs (``status``, ``external_reference``, ``transaction_amount``,
        ``payer.email``, ``date_created``).

        Raises ``MercadoPagoConfigError`` when the SDK is not configured.
        """
        if self._sdk is None:
            raise MercadoPagoConfigError(
                "MERCADOPAGO_ACCESS_TOKEN no esta configurado."
            )

        result = self._sdk.payment().get(payment_id)
        if not isinstance(result, Mapping):
            raise MercadoPagoConfigError(
                f"MercadoPago devolvio una respuesta inesperada: {result!r}"
            )
        status_code = result.get("status")
        if status_code is None or not (200 <= int(status_code) < 300):
            raise MercadoPagoConfigError(
                f"MercadoPago no encontro el pago {payment_id} "
                f"(status={status_code}): {result.get('response')}"
            )

        response = result.get("response") or {}
        if not isinstance(response, Mapping):
            return {}
        return dict(response)


__all__ = ["MercadoPagoClient", "MercadoPagoConfigError"]