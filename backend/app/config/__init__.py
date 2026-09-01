"""Application settings — pydantic-settings.

Todas las variables se leen del entorno (con fallback a ``.env``). El
acceso global usa ``get_settings()`` cacheado por ``lru_cache`` para evitar
re-parseo en cada llamada.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Backend configuration loaded from environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: PostgresDsn
    database_url_sync: PostgresDsn

    # JWT
    jwt_secret: str = Field(min_length=32)
    jwt_algorithm: Literal["HS256"] = "HS256"
    jwt_access_ttl_min: int = 15
    jwt_refresh_ttl_days: int = 14

    # CORS — string CSV en .env; lo partimos en ``_split_origins``.
    cors_allow_origins: str = ""

    @field_validator("cors_allow_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        """Pydantic-settings JSON-decodifica listas complejas; declaramos
        el campo como ``str`` y partimos por comas en este hook.
        """
        if isinstance(value, str):
            return value
        return value

    @property
    def cors_origins_list(self) -> list[str]:
        return [v.strip() for v in self.cors_allow_origins.split(",") if v.strip()]

    # Environment
    environment: Literal["development", "staging", "production"] = "development"
    log_level: str = "INFO"
    log_format: Literal["json", "console"] = "console"

    # MercadoPago — p0c activa la integración real.
    mercadopago_access_token: str = ""
    mercadopago_public_key: str = ""
    mercadopago_webhook_url: str = ""
    # p0c: secret para verificar la firma del webhook. Si está vacío, el
    # backend acepta todos los webhooks (modo dev — NO exponer a internet).
    mercadopago_webhook_secret: str = ""

    # Frontend — p0c lo usa ``upgrade_subscription`` para construir las
    # back_urls por defecto cuando el cliente no las pasa.
    frontend_base_url: str = "http://localhost:5173"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Singleton accessor — reusar entre llamadas para no re-parsear."""
    return Settings()  # type: ignore[call-arg]