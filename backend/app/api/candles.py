"""REST endpoint: ``GET /api/candles``.

Returns the current rolling buffer for the configured symbol as a JSON
array of OHLCV records (oldest first). Useful for initial chart load.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

from app.data.provider import OfferSide


router = APIRouter(prefix="/api", tags=["candles"])


@router.get("/candles")
async def get_candles(
    request: Request,
    symbol: str | None = Query(default=None, description="Forex pair e.g. EUR/USD"),
    limit: int = Query(default=500, ge=1, le=2000),
    offer_side: OfferSide = Query(default="bid"),
) -> dict[str, object]:
    """Return the latest ``limit`` candles for ``symbol``.

    The ``symbol`` query param is optional; if omitted the configured
    ``scanner_symbol`` is used. The response is structured as
    ``{"symbol": ..., "candles": [...]}`` so the frontend can hydrate
    ``lightweight-charts`` directly.
    """
    state = request.app.state
    buffer = getattr(state, "candle_buffer", None)
    settings = state.settings
    if buffer is None:
        raise HTTPException(status_code=503, detail="scanner not initialized")

    target_symbol = (symbol or settings.scanner_symbol).upper().strip()
    candles = buffer.tail(limit, symbol=target_symbol, offer_side=offer_side)

    return {
        "symbol": target_symbol,
        "offer_side": offer_side,
        "interval_minutes": settings.candle_interval_minutes,
        "count": len(candles),
        "candles": [c.to_dict() for c in candles],
    }
