"""Custom Pydantic email type — acepta dominios ``.local`` / ``.test``.

``email_validator`` rechaza ``.local`` por ser un dominio reservado.
En JCS usamos ``*@jadecapital.local`` para seeds y tests, así que
bypaseamos la validación de email-validator y aplicamos una regex
estricta propia (RFC 5322 simplificado + dominios ``.local`` / ``.test``).
"""
from __future__ import annotations

import re
from typing import Annotated

from pydantic import AfterValidator
from pydantic_core import PydanticCustomError

# Regex pragmática: local@domain.tld. Permite ``.local`` y ``.test``.
_EMAIL_RE = re.compile(
    r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$"
)
_EMAIL_RE_LOCAL = re.compile(
    r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+$"  # sin TLD (jadecapital.local)
)


def _check_email(value: str) -> str:
    if not value or len(value) > 254:
        raise PydanticCustomError(
            "value_error", "Email invalido", {"reason": "longitud fuera de rango"}
        ) from None
    normalised = value.strip().lower()
    if not (_EMAIL_RE.match(normalised) or _EMAIL_RE_LOCAL.match(normalised)):
        raise PydanticCustomError(
            "value_error",
            "Email invalido: {reason}",
            {"reason": "formato incorrecto"},
        ) from None
    return normalised


JcsEmail = Annotated[str, AfterValidator(_check_email)]