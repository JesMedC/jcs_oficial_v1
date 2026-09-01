"""Auth schemas — request/response + validadores R1."""
from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic_core import PydanticCustomError

from app.models import UserRole
from app.schemas.email import JcsEmail
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


def _validate_name(value: str) -> str:
    stripped = value.strip()
    if len(stripped) < 2 or len(stripped) > 80:
        raise PydanticCustomError(
            "value_error",
            "El nombre debe tener entre 2 y 80 caracteres",
        ) from None
    return stripped


# --- Requests ---
class RegisterIn(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: JcsEmail
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=80)

    @field_validator("password")
    @classmethod
    def _password_rules(cls, v: str) -> str:
        return _validate_password(v)

    @field_validator("name")
    @classmethod
    def _name_rules(cls, v: str) -> str:
        return _validate_name(v)


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
    name: str
    role: UserRole
    workspaces: list[WorkspaceOut]


class MessageOut(BaseModel):
    message: str