"""Uniform error envelope + canonical error codes (R4 Resilience)."""
from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class ErrorCode(str, Enum):
    """Códigos canónicos de error.

    El cliente los mapea a i18n; el backend nunca devuelve strings
    sueltos como ``"unauthorized"``.
    """

    # Auth
    AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS"
    AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED"
    AUTH_TOKEN_INVALID = "AUTH_TOKEN_INVALID"
    AUTH_TOKEN_REVOKED = "AUTH_TOKEN_REVOKED"
    AUTH_TOKEN_MISSING = "AUTH_TOKEN_MISSING"
    AUTH_EMAIL_TAKEN = "AUTH_EMAIL_TAKEN"
    AUTH_WEAK_PASSWORD = "AUTH_WEAK_PASSWORD"
    AUTH_USER_INACTIVE = "AUTH_USER_INACTIVE"

    # Validation
    VALIDATION_ERROR = "VALIDATION_ERROR"

    # Idempotency
    IDEMPOTENCY_KEY_REQUIRED = "IDEMPOTENCY_KEY_REQUIRED"
    IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT"

    # TradingAccount (p0e.2) — confirman la traducción 1-a-1 con
    # ``TradingAccountError.code`` y permiten al frontend mapear
    # cada causa a i18n sin inferir por status code.
    INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE"
    CONFIRMATION_REQUIRED = "CONFIRMATION_REQUIRED"

    # Trade (p0e.4) — la state-machine OPEN → CLOSED_* usa códigos
    # específicos para que el cliente pueda mostrar un mensaje exacto
    # ("este trade ya está cerrado") en lugar de un genérico
    # ``VALIDATION_ERROR``.
    TRADE_CLOSED = "TRADE_CLOSED"

    # Workspace
    WORKSPACE_ACCESS_DENIED = "WORKSPACE_ACCESS_DENIED"
    WORKSPACE_NOT_FOUND = "WORKSPACE_NOT_FOUND"
    # El usuario autenticado no tiene ningún workspace resoluble
    # (JWT vacío y 0 memberships en la DB). El cliente lo distingue de
    # ``WORKSPACE_ACCESS_DENIED`` porque la causa es la ausencia de
    # contexto, no un permiso denegado.
    WORKSPACE_REQUIRED = "WORKSPACE_REQUIRED"

    # Discipline (one-by-one-thousand-discipline PR-1)
    INVALID_TIMEZONE = "INVALID_TIMEZONE"
    BROKER_CAP_EXCEEDED = "BROKER_CAP_EXCEEDED"
    CAPITAL_INICIAL_CAP_EXCEEDED = "CAPITAL_INICIAL_CAP_EXCEEDED"
    DAILY_CAP_EXCEEDED = "DAILY_CAP_EXCEEDED"
    SESSION_CAP_EXCEEDED = "SESSION_CAP_EXCEEDED"
    INTEREST_REQUIRED = "INTEREST_REQUIRED"
    INTEREST_INVALID = "INTEREST_INVALID"
    PAYOUT_OUT_OF_RANGE = "PAYOUT_OUT_OF_RANGE"

    # Admin (p0b.2)
    FORBIDDEN_NOT_ADMIN = "FORBIDDEN_NOT_ADMIN"
    ADMINAC_CANNOT_DEACTIVATE_SELF = "ADMINAC_CANNOT_DEACTIVATE_SELF"
    ADMINAC_INVALID_PRICE = "ADMINAC_INVALID_PRICE"

    # Rate limiting (futuro)
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"

    # Catch-all
    INTERNAL_ERROR = "INTERNAL_ERROR"
    NOT_FOUND = "NOT_FOUND"


class ErrorEnvelope(BaseModel):
    """Forma uniforme de TODA respuesta de error."""

    code: ErrorCode
    message: str
    # correlation_id es uuid4 (36 chars) en producción, pero permitimos
    # cualquier string 8-64 chars para no romper tests que pasan valores
    # cortos o mocks.
    correlation_id: str = Field(min_length=8, max_length=64)
    details: dict | None = None