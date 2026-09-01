"""Webhook handlers — público (sin auth) + verificación por firma.

p0c: ``POST /api/v1/webhooks/mercadopago``.

MP nos manda dos headers:

- ``x-signature``: ``ts=<unix>,v1=<hex_hmac_sha256>``
- ``x-request-id``: uuid por request

La verificación se hace contra ``Settings.mercadopago_webhook_secret``.
Si está vacío, se aceptan todos los webhooks (modo dev). En producción
DEBE estar configurado.

El body es el formato MP estándar:

```json
{
  "type": "payment",
  "data_id": "1234567890",
  "action": "payment.created",
  "api_version": "v1",
  "data": {"id": "1234567890"},
  ...
}
```

El handler llama a ``subscription_service.process_mp_webhook`` que
decide si la preference es nuestra (por el ``external_reference``) y
actualiza la ``Subscription`` + ``Payment`` correspondientes.

El endpoint es idempotente: el mismo ``data_id`` procesado dos veces
no causa daño.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field

from app.config import get_settings
from app.integrations import MercadoPagoClient
from app.observability.logging import get_logger
from app.services.subscription_service import (
    SubscriptionError,
    process_mp_webhook,
)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

log = get_logger(__name__)


class MercadoPagoWebhookIn(BaseModel):
    """Body del webhook de MercadoPago.

    Sólo los campos que usamos. El resto (api_version, live_mode, etc.)
    se ignoran.
    """

    model_config = ConfigDict(extra="ignore")

    type: str = Field(min_length=1, max_length=80)
    data_id: str | None = Field(default=None, max_length=80)
    action: str | None = Field(default=None, max_length=80)
    data: dict[str, Any] | None = None


class WebhookAckOut(BaseModel):
    received: bool = True


def _correlation_id(request: Request) -> str | None:
    return getattr(request.state, "correlation_id", None)


@router.post(
    "/mercadopago",
    response_model=WebhookAckOut,
    status_code=status.HTTP_200_OK,
)
async def mercadopago_webhook(
    payload: MercadoPagoWebhookIn,
    request: Request,
    x_signature: str | None = Header(default=None, alias="x-signature"),
    x_request_id: str | None = Header(default=None, alias="x-request-id"),
) -> WebhookAckOut:
    """Recibe el webhook de MercadoPago.

    Pasos:
    1. Verifica la firma (si hay secret configurado).
    2. Extrae el ``data_id`` (puede venir en ``data_id`` o ``data.id``).
    3. Llama a ``MercadoPagoClient.get_payment`` para obtener el
       payload canónico (incluye ``status`` + ``external_reference``).
    4. Delega en ``subscription_service.process_mp_webhook``.
    5. Devuelve 200 ``{received: true}`` siempre que el webhook sea
       parseable, incluso si la preference no es nuestra (MP reintenta
       si no recibe 200).
    """
    # 1. data_id puede estar en ``data_id`` (top-level) o ``data.id``.
    data_id = payload.data_id or (payload.data or {}).get("id") or ""
    if not isinstance(data_id, str) or data_id == "":
        raise HTTPException(
            status_code=400,
            detail={
                "code": "MP_BAD_WEBHOOK",
                "message": "Webhook sin data_id",
                "correlation_id": "0" * 36,
            },
        )

    settings = get_settings()
    mp = MercadoPagoClient(settings)

    # 2. Verificación de firma.
    if not mp.verify_webhook_signature(
        data_id=data_id,
        signature_header=x_signature,
        request_id_header=x_request_id,
    ):
        raise HTTPException(
            status_code=401,
            detail={
                "code": "MP_BAD_SIGNATURE",
                "message": "Firma del webhook invalida",
                "correlation_id": "0" * 36,
            },
        )

    # 3. Fetch del pago desde MP. Si falla (no configurado, 404), lo
    # logueamos pero devolvemos 200 — MP reintentaría indefinidamente
    # si devolvemos 4xx por errores transitorios de configuración.
    if not mp.configured:
        log.warning(
            "mp_webhook.no_sdk",
            extra={"data_id": data_id},
        )
        return WebhookAckOut()

    try:
        payment_payload = await mp.get_payment(data_id)
    except Exception as exc:  # MercadoPagoConfigError or HTTP error
        log.warning(
            "mp_webhook.fetch_failed",
            extra={"data_id": data_id, "error": str(exc)},
        )
        # Devolvemos 200 igualmente — el próximo retry traerá el
        # payload si fue un blip de red.
        return WebhookAckOut()

    # 4. Procesamos el pago (idempotente).
    from app.db.session import make_session_factory

    factory = make_session_factory()
    async with factory() as session:
        try:
            await process_mp_webhook(
                session,
                payment_payload=payment_payload,
                correlation_id=_correlation_id(request),
            )
            await session.commit()
        except SubscriptionError:
            await session.rollback()
            # 400 sólo si el external_reference es estructuralmente
            # inválido — MP no debería reintentar, pero tampoco
            # queremos un loop infinito.
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "MP_BAD_EXTERNAL_REFERENCE",
                    "message": "external_reference no es una preference nuestra",
                    "correlation_id": "0" * 36,
                },
            )
        except Exception:
            await session.rollback()
            log.exception(
                "mp_webhook.unhandled",
                extra={"data_id": data_id},
            )
            # 200 igualmente — MP reintentará si devolvemos 5xx y eso
            # nos lleva a un loop. Mejor "received: true" y procesamos
            # en background si es necesario en el futuro.
            return WebhookAckOut()

    return WebhookAckOut()


__all__ = ["router"]