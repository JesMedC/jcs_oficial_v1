"""Auth schemas — request/response + validadores R1."""
from __future__ import annotations

import re
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic_core import PydanticCustomError

from app.models import UserRole
from app.schemas.email import JcsEmail
from app.schemas.subscription import SubscriptionOut
from app.schemas.workspace import WorkspaceOut


# --- Password rules (R1) ---
def _validate_password(value: str) -> str:
    if len(value) < 8:
        raise PydanticCustomError(
            "value_error",
            "La contraseña debe tener al menos 8 caracteres",
        ) from None
    if not any(c.isalpha() for c in value):
        raise PydanticCustomError(
            "value_error",
            "La contraseña debe contener al menos una letra",
        ) from None
    if not any(c.isdigit() for c in value):
        raise PydanticCustomError(
            "value_error",
            "La contraseña debe contener al menos un digito",
        ) from None
    return value


def _validate_name(value: str, field_label: str) -> str:
    stripped = value.strip()
    if len(stripped) < 2 or len(stripped) > 80:
        raise PydanticCustomError(
            "value_error",
            f"{field_label} debe tener entre 2 y 80 caracteres",
        ) from None
    return stripped


# --- Phone rules (R1) ---
_PHONE_RE = re.compile(r"^\+?[0-9\s\-\(\)]{7,20}$")


def _validate_phone(value: str) -> str:
    stripped = value.strip()
    if not _PHONE_RE.match(stripped):
        raise PydanticCustomError(
            "value_error",
            "Telefono invalido",
            {"reason": "formato incorrecto"},
        ) from None
    return stripped


# --- Requests ---
class RegisterIn(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: JcsEmail
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=2, max_length=80)
    last_name: str = Field(min_length=0, max_length=80)
    phone: str = Field(min_length=7, max_length=20)

    @field_validator("password")
    @classmethod
    def _password_rules(cls, v: str) -> str:
        return _validate_password(v)

    @field_validator("first_name")
    @classmethod
    def _first_name_rules(cls, v: str) -> str:
        return _validate_name(v, "El nombre")

    @field_validator("last_name")
    @classmethod
    def _last_name_rules(cls, v: str) -> str:
        stripped = v.strip()
        if len(stripped) > 80:
            raise PydanticCustomError(
                "value_error",
                "El apellido debe tener entre 0 y 80 caracteres",
            ) from None
        return stripped

    @field_validator("phone")
    @classmethod
    def _phone_rules(cls, v: str) -> str:
        return _validate_phone(v)


class LoginIn(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: JcsEmail
    password: str = Field(min_length=1, max_length=128)


class RefreshIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    refresh_token: str = Field(min_length=10, max_length=4096)


class LogoutIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    refresh_token: str = Field(min_length=10, max_length=4096)


# --- Responses ---
class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class AuthMeOut(BaseModel):
    user_id: uuid.UUID
    email: JcsEmail
    first_name: str
    last_name: str
    phone: str
    role: UserRole
    workspaces: list[WorkspaceOut]
    current_subscription: SubscriptionOut | None = None


class MessageOut(BaseModel):
    message: str
