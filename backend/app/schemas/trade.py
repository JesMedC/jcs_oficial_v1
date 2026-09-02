"""Trade schemas — request/response.

p0e.4: ``TradeCreateIn`` y ``TradeCloseIn`` son discriminados por el
``type`` del trade (FOREX vs BINARY). Se modelan como UN solo schema
cada uno con campos opcionales + ``model_validator`` que enforza la
presencia de los campos correctos según ``type`` — la razón es que
la documentación OpenAPI queda en UN solo endpoint y el cliente
sabe qué mandar mirando ``type``. La alternativa (discriminated
union con dos modelos) duplica el endpoint en Swagger y complica la
generación de tipos TS en el frontend.

``ForexTradeFields`` y ``BinaryTradeFields`` se exponen igual como
schemas independientes para que el frontend los pueda importar y
reusar (y para que la doc de Pydantic tenga un resumen claro de
"campos FOREX" vs "campos BINARY").

``TradeOut`` aplana todos los campos type-specific como opcionales:
es responsabilidad del cliente saber que ``lot_size`` solo viene
cuando ``type=FOREX``. Esto evita un Union gigante en la respuesta
mantiene la respuesta estable a través de refreshes.
"""
from __future__ import annotations

import uuid
from datetime import date as date_type
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.trade import (
    BinaryDirection,
    ForexDirection,
    TradeStatus,
    TradeType,
)

# ---- canonical re-exports for swagger clarity ----
__all__ = [
    "ForexTradeFields",
    "BinaryTradeFields",
    "TradeCreateIn",
    "TradeCloseIn",
    "TradeOut",
    "TradeListOut",
    "RiskSummaryOut",
    "EquityPoint",
    "MetricsOut",
]


# ---- submodels (documentación + reuso frontend) ----
class ForexTradeFields(BaseModel):
    """Campos requeridos/opcionales para trades ``type=FOREX``.

    Documenta la forma esperada del subset FOREX; el mismo modelo
    vive dentro de ``TradeCreateIn`` con todos los campos como
    opcionales y un validator que enforza la presencia.
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    pair: str = Field(min_length=3, max_length=20)
    lot_size: Decimal = Field(gt=Decimal("0"), max_digits=10, decimal_places=4)
    direction: ForexDirection
    entry_price: Decimal = Field(gt=Decimal("0"), max_digits=20, decimal_places=8)
    stop_loss: Decimal | None = Field(
        default=None, gt=Decimal("0"), max_digits=20, decimal_places=8
    )
    take_profit: Decimal | None = Field(
        default=None, gt=Decimal("0"), max_digits=20, decimal_places=8
    )


class BinaryTradeFields(BaseModel):
    """Campos requeridos para trades ``type=BINARY``.

    ``payout_pct`` acepta ``70 ≤ x ≤ 100`` — es el rango típico de
    brokers OTC. El service layer lo re-valida pero la regla vive
    acá para que Swagger lo muestre.
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    investment_usd: Decimal = Field(
        gt=Decimal("0"), max_digits=10, decimal_places=2
    )
    payout_pct: Decimal = Field(
        ge=Decimal("70"),
        le=Decimal("100"),
        max_digits=5,
        decimal_places=2,
    )
    expiration_seconds: int = Field(ge=1, le=86400)
    direction: BinaryDirection


# ---- create ----
class TradeCreateIn(BaseModel):
    """Body para ``POST /api/v1/trades``.

    Validación de campos por tipo (``FOREX`` / ``BINARY``) se hace en
    el service (``trade_service.open_trade``), no en Pydantic — la
    razón es que un ``model_validator`` que levanta ``ValueError``
    mete el objeto excepción en ``ctx``, que rompe la serialización
    JSON del envelope de error de FastAPI. Mantener la validación
    acá preserva el patrón existente: el módulo ``trading_account``
    también hace validaciones de shape en su service y traduce a
    ``VALIDATION_ERROR``.
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    account_id: uuid.UUID
    instrument: str = Field(min_length=1, max_length=50)
    type: Literal["FOREX", "BINARY"]

    # common journal (opcionales en cualquier tipo)
    strategy_id: uuid.UUID | None = None
    emotional_tags: list[Literal["FOMO", "REVENGE", "PATIENCE", "DISCIPLINE", "OTHER"]] | None = None
    pre_trade_notes: str | None = Field(default=None, max_length=4000)
    screenshots: list[str] | None = None

    # FOREX-specific (opcionales acá; ``open_trade`` los enforza)
    pair: str | None = Field(default=None, min_length=3, max_length=20)
    lot_size: Decimal | None = Field(
        default=None, gt=Decimal("0"), max_digits=10, decimal_places=4
    )
    direction: str | None = None  # validado per-type en el service
    entry_price: Decimal | None = Field(
        default=None, gt=Decimal("0"), max_digits=20, decimal_places=8
    )
    stop_loss: Decimal | None = Field(
        default=None, gt=Decimal("0"), max_digits=20, decimal_places=8
    )
    take_profit: Decimal | None = Field(
        default=None, gt=Decimal("0"), max_digits=20, decimal_places=8
    )

    # BINARY-specific (opcionales acá; ``open_trade`` los enforza)
    investment_usd: Decimal | None = Field(
        default=None, gt=Decimal("0"), max_digits=10, decimal_places=2
    )
    payout_pct: Decimal | None = Field(
        default=None,
        ge=Decimal("70"),
        le=Decimal("100"),
        max_digits=5,
        decimal_places=2,
    )
    expiration_seconds: int | None = Field(default=None, ge=1, le=86400)


# ---- close ----
class TradeCloseIn(BaseModel):
    """Body para ``POST /api/v1/trades/{id}/close``.

    El discriminador entre FOREX/BINARY es el ``type`` del trade
    existente (la ruta ya lo cargó antes de invocar este schema).
    El body lleva sólo el campo que aplique:

    - FOREX → ``exit_price`` (Decimal > 0)
    - BINARY → ``outcome`` (Literal "WIN" | "LOSS" | "BREAK")

    ``BREAK`` (p0e.4 hardening) representa el cierre "sin ganancia ni
    pérdida" del broker OTC (ej. precio de cierre igual al de apertura
    por un spike): el service retorna al balance exactamente la
    ``investment_usd`` reservada al abrir, dejando ``pnl_usd = 0``.

    El service layer se encarga de rechazar el campo que no aplica
    (Pydantic lo deja opcional acá porque no sabe el type antes).
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    exit_price: Decimal | None = Field(
        default=None, gt=Decimal("0"), max_digits=20, decimal_places=8
    )
    outcome: Literal["WIN", "LOSS", "BREAK"] | None = None

    post_trade_notes: str | None = Field(default=None, max_length=4000)
    followed_plan: bool | None = None
    mistakes: str | None = Field(default=None, max_length=4000)


# ---- read ----
class TradeOut(BaseModel):
    """Fila de ``trades`` tal como la devuelve la API.

    Todos los campos type-specific son nullable. Los FOREX-específicos
    sólo traen valor cuando ``type=FOREX``; los BINARY-específicos
    sólo cuando ``type=BINARY``. El cliente es quien decide cuál
    consumir mirando ``type``.

    ``workspace_id`` (p0f.1, multi-tenant): añadido como opcional al
    output por la misma razón que ``TradingAccountOut.workspace_id``
    — el modelo es NOT NULL en runtime; el default ``None`` permite
    que clientes legacy que no esperan el campo sigan funcionando.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    account_id: uuid.UUID
    workspace_id: uuid.UUID | None = None
    instrument: str
    type: TradeType
    status: TradeStatus
    opened_at: datetime
    closed_at: datetime | None = None

    strategy_id: uuid.UUID | None = None
    emotional_tags: list[str] | None = None
    pre_trade_notes: str | None = None
    post_trade_notes: str | None = None
    followed_plan: bool | None = None
    mistakes: str | None = None
    screenshots: list[str] | None = None

    # FOREX-specific
    pair: str | None = None
    lot_size: Decimal | None = None
    direction: str | None = None
    entry_price: Decimal | None = None
    stop_loss: Decimal | None = None
    take_profit: Decimal | None = None
    exit_price: Decimal | None = None
    pnl_usd: Decimal | None = None
    risk_amount_usd: Decimal | None = None
    risk_pct: Decimal | None = None
    r_multiple: Decimal | None = None

    # BINARY-specific
    investment_usd: Decimal | None = None
    payout_pct: Decimal | None = None
    expiration_seconds: int | None = None


class TradeListOut(BaseModel):
    """Envelope paginado para ``GET /api/v1/trades``."""

    items: list[TradeOut]
    total: int
    skip: int
    limit: int


class RiskSummaryOut(BaseModel):
    """Estado de riesgo del workspace activo del usuario.

    Consumido por el widget ``RiskSemaphore`` del Topbar. La semántica
    del campo ``level`` es decisión de presentación: el backend lo
    deriva de umbrales fijos (FASE 4A) para que el frontend solo pinte.

    - ``green``: P&L diario ≥ 0 y ≤ 5 trades abiertas.
    - ``yellow``: P&L diario < 0, ó > 5 trades abiertas.
    - ``red``: P&L diario < -50 USD (umbral duro provisional).

    ``win_rate_today`` es ``0.0`` cuando no hubo trades cerradas hoy;
    un valor ``None`` se serializa como ``0.0`` por la regla de
    default del service (``wins/closed_today`` ⇒ división por cero).
    """

    level: Literal["green", "yellow", "red"]
    daily_pnl_usd: Decimal
    open_trades_count: int
    win_rate_today: float
    message: str


# ---- metrics (FASE 6A) ----
class EquityPoint(BaseModel):
    """Un punto de la equity curve — un dia calendario CON actividad.

    ``balance`` es el P&L acumulado desde el inicio del rango (arranca
    en ``0``), NO el ``balance_usd`` de la ``TradingAccount``. La razon
    es que el rango es filtrable (``from``/``to``): un balance absoluto
    obligaria a reconstruir el saldo historico previo al rango, que hoy
    no esta persistido en ningun snapshot. Para el widget de equity lo
    que importa es la FORMA de la curva, y el P&L acumulado la preserva
    exactamente.

    Los dias sin trades cerrados NO aparecen en la serie: la curva es
    sparse. El frontend decide si interpolar (step chart) o no.
    """

    date: date_type
    balance: Decimal
    daily_pnl: Decimal


class MetricsOut(BaseModel):
    """KPIs de trading + equity curve del workspace activo.

    Todos los agregados se computan SOLO sobre trades cerrados
    (``status != OPEN``) del workspace activo. Los trades ``OPEN`` no
    tienen ``pnl_usd`` todavia, asi que contarlos distorsionaria cada
    metrica.

    Campos que pueden venir ``null`` y por que (el frontend debe
    renderizar "N/A", no ``0``):

    - ``profit_factor``: ``gross_loss == 0``. La division seria
      infinita; devolver un numero gigante mentiria sobre la calidad
      de la estrategia.
    - ``sharpe_ratio``: menos de 2 retornos diarios, o desvio estandar
      ``0``. Sin dispersion el ratio no esta definido.

    ``win_rate`` es ``0.0`` (no ``null``) cuando no hay cerradas —
    misma convencion que ``RiskSummaryOut.win_rate_today``.
    """

    account_id: uuid.UUID | None = None
    from_date: date_type | None = None
    to_date: date_type | None = None

    total_trades: int
    wins: int
    losses: int
    breaks: int

    win_rate: float
    profit_factor: float | None = None
    expectancy_usd: Decimal
    sharpe_ratio: float | None = None

    gross_profit_usd: Decimal
    gross_loss_usd: Decimal  # negativo o cero
    avg_win_usd: Decimal
    avg_loss_usd: Decimal  # negativo o cero

    equity_curve: list[EquityPoint]
