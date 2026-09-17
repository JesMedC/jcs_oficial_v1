# Spec: dashboard-hud-fidelity (NEW)

**Change**: `dashboard-jarvis-fidelity`
**Domain**: dashboard-hud-fidelity
**Status**: new spec

## Purpose

Apply JARVIS HUD-style visual fidelity polish to the dashboard's KPI surface: replace flat session-tile integers with the existing `<HudRing>` primitive, swap the MES stat cards for horizontal `<HudProgressBar>` rows, lift the H1 greeting, and tighten the KPI-strip sparkline placement. Reuses the `HudRing` + `glass-surface` primitives already shipped by `design-system-v1` Wave 6 + `core-interface-redesign` Slice 1; no new tokens.

## Requirements

### REQ-DHF-001 — Session tiles use `<HudRing>` (MUST)
Each session tile (`WinrateBySessionCard.tsx` lines 60-78 `Tile` body) MUST render a `<HudRing size="sm">` at the right with `value={tile.winrate_pct}` `max={100}` `unit="%"`. The label + numeric value MUST remain on the left in a `flex-row` layout. The `data-testid="session-tile-{band}"` MUST stay attached to the outer wrapper.

#### Scenario: ASIA tile renders ring
- GIVEN `sessions.asia = { trades: 10, wins: 6, winrate_pct: 60 }`
- WHEN the dashboard renders
- THEN `data-testid="session-tile-asia"` MUST exist
- AND the inner SVG `circle` MUST have `stroke-dashoffset` corresponding to 60% of the circumference

#### Scenario: Empty session renders muted ring
- GIVEN `sessions.london = { trades: 0, wins: 0, winrate_pct: 0 }`
- WHEN the dashboard renders
- THEN `data-testid="session-tile-london"` MUST show `<HudRing value={0}>`
- AND the numeric label MUST be `—` (muted)

### REQ-DHF-002 — GENERAL tile double-ring (MUST)
The GENERAL tile (`WinrateBySessionCard.tsx` lines 80-98 `GeneralTile`) MUST render `<HudRing size="md">` with a doubled visual effect (concentric outer ring at 0.4 opacity + inner ring at 1.0). The tile MUST span 2 columns (`md:col-span-2`) inside the parent `grid-cols-5` so it reads as the headline tile.

#### Scenario: GENERAL tile renders wide
- GIVEN `general = { trades: 50, wins: 28, winrate_pct: 56 }`
- WHEN the dashboard renders on `md+`
- THEN `data-testid="session-tile-general"` MUST span 2 columns
- AND the inner SVG MUST contain TWO `<circle stroke="url(#...)">` rings (inner + outer halo)

### REQ-DHF-003 — MES row uses progress bars (MUST)
The MES row inside `DashboardKPIsGrid.tsx` (lines 198-271) MUST replace the 5 stat cards with: **2 stat cards** (Risk/Reward, P&L Acumulado) + **3 horizontal `<HudProgressBar>` rows** (Win Rate Mensual, R/R exposure, Mejor trade). The `<HudProgressBar>` MUST use cyan fill at 0.4 opacity for the track + `--color-jade-profit` for the filled portion, capped at 95% width.

#### Scenario: MES row renders 5 items
- GIVEN the dashboard has ≥ 1 closed trade in the active scope
- WHEN `DashboardKPIsGrid` renders with `layout="vertical"`
- THEN the MES section MUST contain 5 children: 2 stat cards + 3 progress bars
- AND each progress bar MUST render with a `<div data-testid="hud-progress-bar-{label}">` wrapper

#### Scenario: Progress bar 0% renders empty
- GIVEN `monthlyKpis.winRatePct = 0`
- WHEN the MES row renders
- THEN the Win Rate Mensual `<HudProgressBar>` MUST show a 0% filled track
- AND the label MUST read "0%" in `text-text-muted`

### REQ-DHF-004 — Sparkline moves into card body (MUST)
The `DashboardSummaryStrip` Operaciones card (`SparklineIcon`) MUST be moved from the `rightAdornment` slot into the card body (between the value and the sub-label), centered with `mx-auto`. The sparkline MUST remain visible at the `md+` 25% right rail width without horizontal clipping.

#### Scenario: Sparkline renders inside body
- GIVEN the dashboard renders
- WHEN `DashboardSummaryStrip` mounts
- THEN `data-testid="summary-sparkline"` MUST exist
- AND its parent MUST be the card body (NOT the label row)

### REQ-DHF-005 — H1 greeting size (MUST)
The H1 greeting on `DashboardPage.tsx` line 171 MUST be `text-3xl md:text-4xl` (was `text-2xl md:text-3xl`). The cyan textShadow at `rgba(0,212,216,0.35)` MUST remain unchanged.

#### Scenario: H1 size at lg viewport
- GIVEN viewport width ≥ 1024px
- WHEN the dashboard renders
- THEN the H1 `<h1>` MUST apply the `md:text-4xl` class
- AND `textShadow` MUST equal `0 0 20px rgba(0,212,216,0.35)`

### REQ-DHF-006 — Balance Total tone rule (MUST)
`DashboardSummaryStrip.tsx` line 111 MUST use `tone="profit"` when `balanceTotal > 0` AND `tone="muted"` otherwise. The `tone="primary"` branch MUST NOT be used for Balance Total (only P&L and Win Rate may use primary via profit/loss semantics).

#### Scenario: Positive balance uses profit
- GIVEN `balanceTotal = 1250.50`
- WHEN the Balance Total card renders
- THEN its className MUST include `text-profit`

#### Scenario: Zero balance uses muted
- GIVEN `balanceTotal = 0`
- WHEN the Balance Total card renders
- THEN its className MUST include `text-text-muted`

## Dependencies

- `HudRing` primitive at `src/components/decor/HudRing.tsx` (existing)
- `glass-surface` CSS var (existing, defined in `themes.css`)
- `--color-jade` + `--color-jade-profit` + `--color-jade-loss` tokens (existing, cyan pivot from `core-interface-redesign` Slice 1)

## Out of scope

- New decor primitives (no new `<HudProgressBar>` library — authored inline within `DashboardKPIsGrid`)
- Layout restructure beyond MES row swap (covered by `chrome-watermarks`)
- Sparkline visual redesign (only repositioned)
- New tokens or token rebalance