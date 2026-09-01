"""Password hashing (bcrypt cost 12)."""
from __future__ import annotations

import bcrypt

# Cost factor 12 — alineado con la política del proyecto (R2 Risk).
_BCRYPT_ROUNDS = 12


class WeakPasswordError(ValueError):
    """Lanzada por ``validate_password_strength`` cuando no cumple R1."""


def _to_bytes(value: str) -> bytes:
    return value.encode("utf-8")


def hash_password(plain: str) -> str:
    """Hashea con bcrypt cost 12."""
    salt = bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)
    return bcrypt.hashpw(_to_bytes(plain), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verifica en tiempo constante. ``False`` ante cualquier error."""
    try:
        return bcrypt.checkpw(_to_bytes(plain), _to_bytes(hashed))
    except (ValueError, TypeError):
        return False


def validate_password_strength(plain: str) -> None:
    """Aplica reglas R1: mínimo 8, al menos una letra y un dígito."""
    if len(plain) < 8:
        raise WeakPasswordError("La contraseña debe tener al menos 8 caracteres")
    if not any(c.isalpha() for c in plain):
        raise WeakPasswordError("La contraseña debe contener al menos una letra")
    if not any(c.isdigit() for c in plain):
        raise WeakPasswordError("La contraseña debe contener al menos un digito")