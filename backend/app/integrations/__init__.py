"""External integrations (payment gateways, analytics providers, etc.).

p0c adds the MercadoPago SDK wrapper used by the subscription flow.
"""
from app.integrations.mercadopago import MercadoPagoClient, MercadoPagoConfigError

__all__ = ["MercadoPagoClient", "MercadoPagoConfigError"]