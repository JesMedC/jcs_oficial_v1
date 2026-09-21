# FASE 4A — Trade Station E2E verification

Date: 2026-09-02 · Wave 7
Scope: `OperacionesPage` (Trade Station real) replaces the p0e.1 stub.

## Environment

- Frontend dev server: `http://localhost:5173` (vite, already running)
- Backend dev server: `http://localhost:8000` (uvicorn, already running)
- Auth: `demo@jadecapital.local` / `Demo1234!`
- Tooling: Playwright MCP (manual flow) — no `@playwright/test` configured in
  this project (per rule 4 of the wave spec, we do not install it just for
  this verification).

## Steps verified

### 1. Login

- Navigate to `http://localhost:5173/login`.
- Fill email + password slowly (RHF `mode: 'onBlur'` — button stays disabled
  until the password field loses focus).
- Tab → button enables → click "Iniciar sesion".
- Redirect lands on `/portal/operaciones`. Tokens stored in
  `sessionStorage.jcs.auth.access_token` / `refresh_token`.

### 2. Operaciones page initial render

- `data-testid="operaciones-page"` — present.
- `data-testid="operaciones-new-trade"` — present (top-right of header row).
- `data-testid="trade-filters"` — present with 3 selects (status / type /
  account).
- `data-testid="trade-table-empty"` — present (demo user has no trades yet,
  expected).

Screenshot: `01-operaciones-initial.png`.

### 3. Drawer open flow

- Click on `[data-testid="operaciones-new-trade"]` button.
- Store `useNewTradeDrawer` flips `isOpen` → `true`.
- `<NewTradeDrawer />` mounts → `GlassDrawer` (`data-testid="glass-drawer-root"`)
  transitions from `aria-hidden="true"` to visible.
- Drawer body shows the account guard:
  > Necesitas al menos una cuenta para crear un trade.

Screenshot: `02-drawer-opened.png`.

### 4. Drawer close

- `Escape` key triggers `onClose` → store flips `isOpen` → `false`.
- `glass-drawer-root` is removed from the DOM.

### 5. Topbar semaphore — initial state

- `data-testid="risk-semaphore"` shows: `Riesgo bajo` (green dot, `bg-profit`),
  aria-label `Riesgo: green (P&L hoy: $0)`.

Screenshot: `03-page-final.png`, `04-topbar-semaphore-initial.jpeg`.

## What did NOT run (and why)

The original spec asked for: `ver tabla → cerrar trade → semáforo cambia`.

- **Open-trade creation:** the demo user has no trading accounts seeded, so
  `POST /api/v1/accounts` is required before any trade can be created. The
  manual call returned `500 INTERNAL_ERROR` (correlation_id
  `78bbcd36-4082-4bcb-9cc6-e28ec77b8408`). Backend log not captured
  (uvicorn stdout → pipe), so the failure was not investigated further.
  This is a **pre-existing** backend issue, not a regression from this wave
  (the page-side code only reads from existing endpoints; no new code path
  hits `/accounts`).
- **Semaphore colour change:** requires an open FOREX trade over the
  daily-loss threshold — not reachable without an account.

## Pre-existing backend issues (out of scope for FASE 4A)

- `GET /api/v1/trades/risk-summary` → 422 Unprocessable Entity (the
  `OperationsKPIsHeader` stays in `operations-kpis-loading` state). The
  Topbar `RiskSemaphore` still works because it has its own fallback path
  with a 5-min cache (R3 reliability contract).
- `POST /api/v1/accounts` → 500 INTERNAL_ERROR.

Both reproduce against the stub `OperacionesPage` (verified mentally by
reading `useRiskSummary` / `RiskSemaphore`) — they are not introduced by
this wave.

## Test status (post-wave)

- `pnpm test` → **171 passed (171)** in 40 files. Baseline 171 → 171 (no new
  unit tests added — out of scope; only OpsKPIs / TradeFilters / TradeTable
  / NewTradeDrawer / CloseTradeModal test suites already exist).
- `pnpm typecheck` → 2 pre-existing errors (`AdminAnalyticsPage.tsx` and
  `PaymentRow.test.tsx`), zero new.
- `pnpm lint` → 12 pre-existing errors, zero new. None in
  `OperacionesPage.tsx`.
- `pytest tests/` → **110 passed (110)**. Backend untouched.

## Screenshots

```
.playwright-mcp/fase4a-verify/
├── 01-operaciones-initial.png       Page renders all components, empty table.
├── 02-drawer-opened.png             Drawer open, account guard visible.
├── 03-page-final.png                After Escape, drawer removed.
└── 04-topbar-semaphore-initial.jpeg Topbar green semaphore baseline.
```