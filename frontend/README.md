# Trading Scanner — Frontend

5-minute forex signal scanner UI. Vite + React 18 + TypeScript +
TradingView [lightweight-charts](https://github.com/tradingview/lightweight-charts) v4.

## Architecture

```
src/
  main.tsx               React entry point
  App.tsx                Top-level layout (Header + SplitScreen)
  types.ts               Shared TS types: Candle, Alert, WSMessage union
  utils/format.ts        Display formatting helpers
  hooks/
    useCandles.ts        WS subscriber + candles buffer + indicator series
    useAlerts.ts         WS subscriber + alerts list (newest first)
    useBackendHealth.ts  Polls /healthz for provider + symbol
  components/
    Header.tsx           Symbol, last close, connection dot
    SplitScreen.tsx      70/30 flex layout
    Chart.tsx            lightweight-charts wrapper (candles + 6 overlays)
    AlertsPanel.tsx      Alerts table with badges
    AlertBadge.tsx       CALL / PUT / PENDING / WIN / LOSS badges
    ConnectionDot.tsx    Tiny status pill
```

## Backend contract

The FastAPI backend exposes:

- `GET /healthz` — `{status, provider, symbol}`
- `GET /api/candles?limit=500` — full OHLCV buffer (used to seed the chart)
- `GET /api/alerts` — pending + recent alerts (newest first)
- `WS /ws` — streams `hello`, `candle`, `alert_new`, `alert_update`

The `candle` payload carries EMA 50/100/200 and Bollinger (20, 2σ) values
alongside each tick so the frontend never has to recompute indicators.

See `../backend/README.md` for the backend details.

## Development

```bash
# 1. Boot the backend on :8000 (see ../backend/README.md)
cd ../backend && .venv/bin/uvicorn app.main:app --port 8000

# 2. Install dependencies and start the dev server
cd ../frontend
npm install
npm run dev          # http://localhost:5173
```

The Vite dev server proxies `/api`, `/ws`, and `/healthz` to
`http://localhost:8000` so the React app uses relative URLs everywhere.

## Production build

```bash
npm run build        # tsc --noEmit + vite build → dist/
npm run preview      # serve dist/ on :4173 for a smoke test
```

## Tests

```bash
npm test             # one-shot Vitest run
npm run test:watch   # watch mode
```

The default test suite covers the WS message handling reducer in
`src/hooks/useCandles.ts` — the heart of the live update logic.
