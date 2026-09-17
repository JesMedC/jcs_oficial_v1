# Spec: decor-and-charts-fidelity (NEW)

**Change**: `dashboard-jarvis-fidelity`
**Domain**: decor-and-charts-fidelity
**Status**: new spec

## Purpose

Close the remaining 10 visual items in the decor + chart layer: switch the decor primitive defaults to the cyan CSS var (so light-mode is safe), retune the `CURVE_THEME` hex literals to CSS vars, add last-point tooltip badges + deposit/withdraw triangular markers to both curve charts, and tighten the `RecentActivityFeed` timestamp + pair-avatar chrome.

## Requirements

### REQ-DCF-001 — Decor primitives read cyan CSS var (MUST)
`NeuralNetwork.tsx:94` + `DotGrid.tsx:73` MUST replace `DEFAULT_COLOR = '#00FF9D'` with a value that resolves to `--color-jade` at runtime. Implementation: change `DEFAULT_COLOR` to `'var(--color-jade)'` (SVG `stroke` / `fill` accepts CSS var strings) OR read via `getComputedStyle(document.documentElement).getPropertyValue('--color-jade')` inside a memo at mount time.

#### Scenario: NeuralNetwork paints cyan in dark mode
- GIVEN `data-theme="dark"` (or no theme attribute)
- WHEN `<NeuralNetwork>` renders on the dashboard
- THEN the SVG `<line>` and `<circle>` elements MUST inherit cyan from `--color-jade`
- AND light-mode MUST swap to the light-mode variant of `--color-jade` automatically

#### Scenario: DotGrid paints cyan
- GIVEN `data-theme="dark"`
- WHEN `<DotGrid>` renders on the dashboard
- THEN the SVG `<pattern>` circles MUST inherit cyan from `--color-jade`
- AND no jade `#00FF9D` literal MAY appear in the rendered output

### REQ-DCF-002 — Dashboard DotGrid density (MUST)
The `<DotGrid>` mounted on `DashboardPage.tsx` line 158 MUST use `spacing={20}` and `opacity={0.05}` (was the global default of `spacing={24}` + `opacity={0.04}`). The wrapping `<div>` opacity cap MUST remain `0.06` to satisfy REQ-DEC-006.

#### Scenario: Dashboard DotGrid denser
- GIVEN the dashboard renders
- WHEN the chrome layer mounts
- THEN the `<DotGrid>` MUST receive `spacing={20}` + `opacity={0.05}` props
- AND the wrapper opacity MUST stay ≤ 0.06

### REQ-DCF-003 — CURVE_THEME uses CSS vars (MUST)
`curveChartTheme.ts:38-46` MUST replace the hardcoded `#00E676`, `#00B8FF`, `rgba(0, 255, 157, 0.18)`, `rgba(0, 255, 157, 0.10)` literals with `var(--color-jade-profit)`, `var(--color-jade-info)`, and cyan-tinted rgba. The `background` + `axisText` rgba literals MAY stay as-is (no token equivalent exists).

#### Scenario: Curve theme resolves cyan
- GIVEN a chart renders in dark mode
- WHEN `lightweight-charts` reads `CURVE_THEME.perf`
- THEN the value MUST equal `var(--color-jade-profit)`
- AND `CURVE_THEME.balance` MUST equal `var(--color-jade-info)`

### REQ-DCF-004 — Chart tooltip badges (MUST)
Both `PerformanceCurveChart.tsx` and `CapitalCurveChart.tsx` MUST render a `absolute top-3 right-3` mini panel showing the last-point value + delta (e.g., `+$9.20 · +12%`). The panel MUST use `font-mono text-[10px] text-text-secondary bg-surface/60 backdrop-blur-sm px-2 py-1 rounded` and MUST be positioned via absolute relative to the chart card.

#### Scenario: Performance curve shows badge
- GIVEN `points` ends with `cumulative_net_pnl = 9.20`
- WHEN `PerformanceCurveChart` renders
- THEN a `<div data-testid="dash-performance-lastpoint">` MUST exist
- AND its text MUST include `+$9.20`

#### Scenario: Capital curve shows badge
- GIVEN `points` ends with `account_balance = 1250.50` and the first point is `1000.00`
- WHEN `CapitalCurveChart` renders
- THEN a `<div data-testid="dash-capital-lastpoint">` MUST exist
- AND its text MUST include `+$250.50`

### REQ-DCF-005 — Deposit / withdraw markers (MUST)
`PerformanceCurveChart.tsx` MUST call `createSeriesMarkers(perfSeries, [...])` (lightweight-charts v5 API) on every `points` update, rendering cyan ▲ (`var(--color-jade-profit)`) for days with `capital_volume > 0` and red ▼ (`var(--color-jade-loss)`) for days with `capital_volume < 0`. Markers MUST be cached via `useRef` and only re-created when `points` length changes.

#### Scenario: Deposit day shows cyan triangle
- GIVEN a point `{ capital_volume: 500, daily_pnl: 0 }`
- WHEN `PerformanceCurveChart` re-renders
- THEN a marker MUST exist at the corresponding `time`
- AND its position MUST be `'aboveBar'` with `color: var(--color-jade-profit)` + `shape: 'arrowUp'`

#### Scenario: Withdraw day shows red triangle
- GIVEN a point `{ capital_volume: -200, daily_pnl: 0 }`
- WHEN `PerformanceCurveChart` re-renders
- THEN a marker MUST exist at the corresponding `time`
- AND its position MUST be `'belowBar'` with `color: var(--color-jade-loss)` + `shape: 'arrowDown'`

#### Scenario: Zero volume day shows no marker
- GIVEN a point `{ capital_volume: 0, daily_pnl: 5 }`
- WHEN `PerformanceCurveChart` re-renders
- THEN NO marker MUST be created for that day

### REQ-DCF-006 — RecentActivityFeed timestamp format (MUST)
`RecentActivityFeed.tsx` MUST add a `formatHour(iso: string)` helper that returns `HH:MM hrs` (e.g., `14:32 hrs`) via `Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })`. The helper MUST be called per row using `t.closed_at ?? t.opened_at` and rendered as a third line in the row body.

#### Scenario: Closed trade shows close hour
- GIVEN a trade with `closed_at = '2026-09-15T14:32:00Z'` and `opened_at = '2026-09-15T13:00:00Z'`
- WHEN the row renders
- THEN the timestamp line MUST show `14:32 hrs`

#### Scenario: Open trade shows open hour
- GIVEN an OPEN trade with `closed_at = null` and `opened_at = '2026-09-15T09:00:00Z'`
- WHEN the row renders
- THEN the timestamp line MUST show `09:00 hrs`

### REQ-DCF-007 — Pair-avatar cyan chip (MUST)
`RecentActivityFeed.tsx` line 121 MUST wrap the emoji `pairFlag(t.instrument)` in a `<span className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 inline-flex items-center justify-center text-xs">` chip. The emoji MUST remain inside; only the wrapper changes.

#### Scenario: Pair flag wrapped in chip
- GIVEN a trade with `instrument = 'EURUSD'`
- WHEN the row renders
- THEN the flag `<span>` MUST have `w-7 h-7 rounded-full bg-primary/15 border border-primary/30` classes
- AND the inner emoji MUST remain a `text-xl` element

## Dependencies

- `lightweight-charts` v5+ `createSeriesMarkers` API (public export of the library)
- `core-interface-redesign` Slice 1 cyan tokens (`--color-jade`, `--color-jade-profit`, `--color-jade-loss`, `--color-jade-info`)
- `intl` DateTimeFormat browser API (universal availability, no polyfill needed)

## Out of scope

- Replacing `lightweight-charts` with another library
- New markers on `CapitalCurveChart` (deposit markers live only on `PerformanceCurveChart` per the reference — `CapitalCurveChart` already shows cashflow via its header delta)
- Sparkline repaint on `DashboardSummaryStrip` reposition (covered by `dashboard-hud-fidelity` REQ-DHF-004)
- New chart types (heatmap, gantt, etc.)
- New decor primitives beyond the existing `DotGrid` + `NeuralNetwork` + `Scanline` + `HudRing` set
---

## v2 note (dashboard-jarvis-fidelity-v2, 2026-09-17)

The chart palette referenced in this spec (`rgba(0,212,216,*)` /
`#00D4D8`) was deepened to the JARVIS HUD ladder by the v2 polishing
pass:

- Primary cyan: `#00D4D8` → `#00E5FF` (rgba `0,229,255`).
- v2 also pivoted the PerformanceCurveChart from a histogram +
  volume bars to a smooth `LineSeries` (cumulative_net_pnl) +
  parallel `AreaSeries` providing the cyan gradient fill (top
  `rgba(0,229,255,0.30)` → bottom `rgba(0,229,255,0)`). The deposit
  / withdraw markers contract from T-046 is preserved.
- The CapitalCurveChart stays dashed + now renders as a smooth
  curved spline with the same gradient area fill.
