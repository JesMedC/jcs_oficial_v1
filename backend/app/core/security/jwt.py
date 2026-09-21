"""JWT (access + refresh) y helpers.

``create_refresh_token`` genera un JWT de refresh y devuelve:
- el token crudo (para devolver al cliente una sola vez),
- el hash sha256 hex (para almacenar en DB).

``decode_access_token`` valida firma + ``exp`` y devuelve los claims.
Los errores se mapean a ``TokenExpiredError`` / ``TokenInvalidError`` que
la capa de auth traduce al ``ErrorCode`` apropiado.
"""
from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, ExpiredSignatureError, jwt

from app.config import get_settings
from app.models import UserRole


class TokenExpiredError(Exception):
    """JWT expirado."""


class TokenInvalidError(Exception):
    """Firma inválida, claims faltantes, etc."""


def _settings():
    return get_settings()


# ---------- access token ----------
def create_access_token(
    user_id: uuid.UUID,
    role: UserRole,
    workspace_ids: list[uuid.UUID] | None = None,
) -> tuple[str, int]:
    """Crea el access token (15 min por defecto) y devuelve (token, expires_in)."""
    settings = _settings()
    ttl = settings.jwt_access_ttl_min
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=ttl)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role.value,
        "workspace_ids": [str(w) for w in (workspace_ids or [])],
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, ttl * 60


def decode_access_token(token: str) -> dict[str, Any]:
    """Decodifica + valida un access token. Lanza ``TokenExpiredError`` / ``TokenInvalidError``."""
    settings = _settings()
    try:
        claims = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except ExpiredSignatureError as exc:
        raise TokenExpiredError("Token expirado") from exc
    except JWTError as exc:
        raise TokenInvalidError("Token invalido") from exc
    if claims.get("type") != "access":
        raise TokenInvalidError("Tipo de token incorrecto")
    if "sub" not in claims:
        raise TokenInvalidError("Claims incompletos")
    return claims


# ---------- refresh token ----------
def create_refresh_token() -> tuple[str, str, datetime]:
    """Genera un refresh token JWT + su hash sha256 + su fecha de expiración."""
    settings = _settings()
    ttl_days = settings.jwt_refresh_ttl_days
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=ttl_days)
    payload = {
        "sub": "refresh",
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "jti": str(uuid.uuid4()),
    }
    raw = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return raw, hash_refresh_token(raw), exp


def hash_refresh_token(raw: str) -> str:
    """Hash sha256 hex del token crudo. Lo que va a la DB."""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()