# Spec: dashboard-density (NEW)

**Change**: `core-interface-redesign`
**Domain**: dashboard-density
**Status**: new spec

## Purpose

Define the higher-density dashboard layout that matches the reference screenshot — session winrate cards with circular progress rings, a 4-up KPI strip with embedded sparklines, a recent-ops right rail, and dual cyan curve charts.

## Requirements

### REQ-DD-001 — Session winrate cards (MUST)
The dashboard MUST render a row of session winrate cards: ASIA, LONDON, NEW_YORK, SYDNEY (each with a small circular progress ring + numeric winrate), followed by a wider GENERAL card with the combined progress ring.

### REQ-DD-002 — KPI strip (MUST)
The dashboard MUST render a 4-up KPI strip BELOW the session winrate cards: BALANCE TOTAL, OPERACIONES, P&L NETO, WIN RATE. Each card MUST contain a numeric value (`font-mono`, `tabular-nums`) and a sub-label. The OPERACIONES card MUST include a tiny inline sparkline.

### REQ-DD-003 — Recent ops rail (MUST)
The dashboard MUST render a right-rail list (≥ 5 rows) of recent operations. Each row MUST show: pair (e.g., `EUR/USD`), side tag (`CALL` / `PUT`), P&L USD value (color-coded by profit/loss), and a timestamp.

### REQ-DD-004 — Dual curve charts (MUST)
The dashboard MUST render two stacked charts: Curva de Rendimiento (top) and Curva de Capital (bottom). Both MUST use the cyan accent ladder from `core-interface-tokens`. Triangular markers MUST flag deposit/withdrawal events on the capital curve.

### REQ-DD-005 — Responsive collapse (MUST)
- On viewports `< md`: KPI strip collapses to `grid-cols-1`; recent-ops rail hides; dual charts stack vertically.
- On `md ≤ viewport < lg`: KPI strip `grid-cols-2`; recent-ops rail hides; charts side-by-side.
- On `lg ≤ viewport < xl`: KPI strip `grid-cols-4`; session cards `grid-cols-2 + GENERAL full-width`; recent-ops rail shows below `xl`.
- On `xl+`: full layout per the reference.

### REQ-DD-006 — Section header style (MUST)
Section headers MUST use uppercase, wide letter-spacing, cyan accent bullet (e.g., `• WINRATE POR SESIÓN`), and the existing `Orbitron`/`Rajdhani` display stack. The section header MUST be visually distinct from the KPI card labels.

### REQ-DD-007 — Background decor (MUST)
The dashboard chrome (NOT the financial tables) MUST mount `<DotGrid>` and `<NeuralNetwork>` decor primitives. Density MUST be subtle (≤ 6% opacity for `DotGrid`, ≤ 8% opacity for `NeuralNetwork`) so the data remains the focus.

## Scenarios

### Scenario DD-S1 — Full layout at xl
**Given** the viewport is `≥ xl` (1280px)
**When** the dashboard renders
**Then** all four sections are visible side-by-side or stacked per the reference layout
**And** no horizontal scroll appears.

### Scenario DD-S2 — KPI strip collapse
**Given** the viewport is `< md` (768px)
**When** the dashboard renders
**Then** the KPI strip shows one card per row
**And** the recent-ops rail is hidden.

### Scenario DD-S3 — Recent ops row
**Given** the dashboard has ≥ 5 closed trades in scope
**When** the right rail renders
**Then** it shows 5 rows, each with pair, side, P&L, and timestamp
**And** profit P&L values use `--color-profit` and loss P&L values use `--color-loss`.

### Scenario DD-S4 — Cyan curve markers
**Given** the user has deposits or withdrawals in the active scope
**When** the Curva de Capital renders
**Then** triangular markers appear at the corresponding timestamps
**And** a hover tooltip shows the deposit/withdrawal amount.

## Anti-patterns

- Mounting `<DotGrid>` or `<NeuralNetwork>` over the recent-ops rail or the KPI cards (decor is chrome-only).
- Using `font-mono` for section headers (reserves monospace for numeric data only).
- Embedding decorative keyframes (e.g., `animate-hud-scanline`) on financial cards (scanlines are restricted to chrome per DS-v1).

## Verification

- Visual review against the reference screenshot (inspiration-aligned, not pixel-perfect).
- `pnpm test` green; `src/pages/portal/__tests__/DashboardPage.test.tsx` updated for the new sub-components.
- Playwright e2e (`tests/e2e/dashboard-density.spec.ts` if added) verifies the responsive collapse.
