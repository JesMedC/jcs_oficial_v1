"""Application settings loaded from environment variables.

Single source of truth for runtime configuration. All values flow through
``Settings`` so the rest of the codebase never reads ``os.environ`` directly.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the scanner service."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Provider selection
    scanner_provider: str = Field(
        default="dukascopy",
        description="Market data provider: dukascopy | oanda",
    )
    scanner_symbol: str = Field(
        default="EUR/USD",
        description="Forex pair in Dukascopy slash notation, e.g. EUR/USD",
    )
    scanner_history_days: int = Field(
        default=3,
        ge=1,
        le=30,
        description="Days of historical 5m candles fetched at startup",
    )
    scanner_buffer_size: int = Field(
        default=500,
        description="Rolling window of 5-minute candles kept in memory",
    )
    scanner_tick_interval_ms: int = Field(
        default=1000,
        description="WebSocket tick interval in milliseconds",
    )

    # OANDA (only consulted if scanner_provider == 'oanda')
    oanda_api_token: str = Field(default="", alias="OANDA_API_TOKEN")
    oanda_account_id: str = Field(default="", alias="OANDA_ACCOUNT_ID")
    oanda_environment: str = Field(
        default="practice",
        alias="OANDA_ENVIRONMENT",
        description="practice | live",
    )

    # Strategy constants (exposed so the engine is testable + tunable)
    candle_interval_minutes: int = 5
    trade_expiry_minutes: int = 5
    position_size_pct: float = 1.0
    min_confirmations: int = 4

    # Stochastic 5-5-3
    stoch_k: int = 5
    stoch_d: int = 5
    stoch_smooth: int = 3
    stoch_overbought: float = 85.0
    stoch_oversold: float = 15.0

    # EMA hierarchy
    ema_fast: int = 50
    ema_mid: int = 100
    ema_slow: int = 200

    # Bollinger
    bollinger_length: int = 20
    bollinger_std: float = 2.0

    # Fibonacci levels (percent)
    fib_levels: tuple[float, ...] = (50.0, 61.8, 78.6)

    # Support / resistance
    sr_min_touches: int = 2
    sr_pivot_window: int = 10


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor."""
    return Settings()
