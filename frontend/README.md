# Trading Scanner — Frontend

5-minute forex signal scanner UI. Vite + React 18 + TypeScript +
TradingView's free [Advanced Chart widget](https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart)
(iframe embed) for the chart and the scanner's own Dukascopy pipeline
for alerts and indicators.

## Architecture

```
src/
  main.tsx               React entry point
  App.tsx                Top-level layout (Header + SplitScreen);
                         lifts chartSymbol + selectedAlert state so
                         AlertsPanel row clicks drive both the chart
                         and the Spanish AlertCard.
  types.ts               Shared TS types: Candle, Alert, WSMessage union
  utils/
    format.ts            Display formatting helpers
    tvSymbol.ts          Dukascopy <-> TradingView symbol mapping
                         (EUR/USD <-> FX:EURUSD)
  hooks/
    useCandles.ts        WS subscriber + candles buffer + indicator series
    useAlerts.ts         WS subscriber + alerts list (newest first)
    useBackendHealth.ts  Polls /healthz for provider + symbol
  components/
    Header.tsx           Symbol, last close, connection dot
    SplitScreen.tsx      70/30 flex layout
    TradingViewChart.tsx iframe embed of the free TradingView Advanced
                         Chart widget (re-embeds on symbol change).
    Chart.tsx            LEGACY lightweight-charts canvas, kept on disk
                         for one-import rollback. Not mounted.
    AlertsPanel.tsx      Alerts table with badges; rows are focusable
                         buttons that fire onSelect(alert).
    AlertCard.tsx        Spanish detail card with the user-specified
                         WIN / LOSS / PENDING copy.
    AlertBadge.tsx       CALL / PUT / PENDING / WIN / LOSS badges
    ConnectionDot.tsx    Tiny status pill
```

## Data contract (honest — read this first)

The chart and the alerts use two independent data sources. The mismatch
is real, documented, and intentional.

| Channel | Source | Cadence | Authoritative for |
| --- | --- | --- | --- |
| Chart pixels | TradingView widget (Advanced Chart, free, iframe) | TradingView's own feed. Per [Widget Data FAQ](https://www.tradingview.com/widget-docs/faq/data): **"Forex and crypto data is real-time."** | What the user sees on the chart |
| Scanner candle buffer + indicators | Dukascopy public bi5 (via the FastAPI backend) | Polling pull at `scanner_tick_interval_ms`; institutional quality but **delayed by design** | Indicators, alert decisions, WIN/LOSS resolution |
| Alerts | Engine over Dukascopy buffer | Same as buffer | UI alert list, Spanish card |

The widget is a self-contained iframe. **There is no API to feed Dukascopy data into it.** Per the Widget Data FAQ: *"Widgets can only display data provided by TradingView, and we don't have an API for feeding your own data into them."*

### What this means in practice

- The widget will tick on TradingView's real-time forex stream.
- The scanner engine (candles, indicators, alerts) will tick on Dukascopy's delayed pull.
- The alert entry price (Dukascopy) may sit a few pips from the live price shown in the widget.
- The user-facing alert card and the WIN/LOSS decision use **Dukascopy** values; the widget is decorative for the chart and authoritative only for "what the user is looking at right now".

This is documented, not hidden.

## Why the widget, not `lightweight-charts`

| Product | Data source | Bring your own data? | Free? | Used here? |
| --- | --- | --- | --- | --- |
| TradingView Free Widget (Advanced Chart at `/widget-docs/widgets/charts/advanced-chart`) | TradingView's own feed | NO | Yes | **Yes — this is the target** |
| TradingView Advanced Charts library (paid) | You | YES | No (licensed) | No |
| TradingView Pro subscription | TradingView | n/a | No (subscription) | No |
| TradingView Lightweight Charts (open source) | You | YES | Yes | No (replaced by the widget; `lightweight-charts` stays in `package.json` until end-to-end verification) |

Only the free widget combines "TradingView data" with "free". The Advanced Charts library would let us feed Dukascopy candles, but it is paid and requires its own licensing.

## Symbol switching on alert click

- The widget's `symbol` option uses `{EXCHANGE}:{NAME}` notation.
- Dukascopy uses slash notation (`EUR/USD`); the widget uses `FX:EURUSD`.
  The mapping lives in `src/utils/tvSymbol.ts` (with `EUR/USD ↔ FX:EURUSD`
  pinned as a fixture).
- Single-symbol widgets (Advanced Chart included) cannot swap symbols
  without a full iframe re-embed. `TradingViewChart.tsx` tears down the
  embed container + script on every `symbol` change and re-injects the
  embed with the new options — this is the documented pattern from the
  [Dynamic Symbols tutorial](https://www.tradingview.com/widget-docs/tutorials/iframe/build-page/dynamic-symbols).
- The widget's built-in symbol search dialog is **disabled**
  (`allow_symbol_change: false`) so the symbol stays under scanner
  control, not under the widget's own picker.
- Attribution (`Charts by TradingView`) is rendered by the widget itself
  and must remain visible (TradingView's free widget terms require it).

## Spanish alert card

The card renders the user-specified Spanish copy verbatim when an alert
row is clicked (the same click that switches the chart):

```
✅ WIN - admin Alerts
💎 Instrumento: GBP/USD
📈 Acción: PUT
🎯 Precio Entrada: 1.17813
```

`LOSS` uses `❌` and `PENDING` uses `⏳`. The exact string is pinned in
`src/components/__tests__/AlertCard.test.tsx` — a refactor that drops an
emoji or a line break fails loudly. The card includes an explicit
`Cerrar` button so keyboard users can dismiss it without depending on
the row-click toggle.

## Backend contract

The FastAPI backend exposes:

- `GET /healthz` — `{status, provider, symbol}`
- `GET /api/candles?limit=500` — full OHLCV buffer (used to seed the scanner state, not the chart)
- `GET /api/alerts` — pending + recent alerts (newest first)
- `WS /ws` — streams `hello`, `candle`, `alert_new`, `alert_update`

The `candle` payload carries EMA 50/100/200 and Bollinger (20, 2σ) values
alongside each tick. The frontend keeps the buffer around for the
header's last-close + change-% display; the chart itself shows
TradingView's own data.

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
npm test             # one-shot Vitest run (vitest, jsdom)
npm run test:watch   # watch mode
```

The default test suite covers:

- `src/hooks/__tests__/useCandles.test.ts` — pure WS message reducers.
- `src/utils/__tests__/tvSymbol.test.ts` — Dukascopy ↔ TradingView symbol mapping, with the `FX:EURUSD` fixture pinned.
- `src/components/__tests__/TradingViewChart.test.tsx` — embed-script injection, dark theme, `allow_symbol_change: false`, re-embed on symbol change.
- `src/components/__tests__/AlertCard.test.tsx` — verbatim Spanish copy for WIN / LOSS / PENDING.
- `src/components/__tests__/AlertsPanel.test.tsx` — button-semantics row, `onSelect` invocation, `aria-pressed`.
- `src/__tests__/App.test.tsx` — composition + click wiring (chart is mocked so jsdom never loads the remote iframe).

The TradingView widget itself is verified by the unit tests asserting on
its embed `<script>` options; the live iframe is intentionally never
loaded inside jsdom.
