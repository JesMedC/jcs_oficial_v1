# Design: dashboard-jarvis-fidelity

**Change**: `dashboard-jarvis-fidelity`
**Reads**: `proposal.md` + `specs/*/spec.md`
**Status**: design draft
**Inspiration**: `/tmp/pi-clipboard-43991fa0-9d55-4b16-8359-905abb6978af.png` ("JADE CAPITAL SUITE — CORE INTERFACE", JARVIS-style HUD)

## Technical approach

This is a **visual fidelity polish** layered on top of `core-interface-redesign`'s cyan token pivot + dashboard skeleton. The token ladder (`--color-jade: #00D4D8` cyan) is **frozen** — we do NOT re-pivot, do NOT add new tokens, do NOT touch `src/styles/themes.css`. The work is mechanical class-swap + primitive-reuse + chart-theme CSS-var routing, all within existing files.

The 20 exploration items cluster into **2 slices** per the parent-orchestrator brief:

- **Slice A — High-severity chrome + decor defaults (~150 LOC)**: touches the portal shell (sidebar glass, brand visibility, logout button), the dashboard chrome (`+ Nuevo trade`, watermark, AccountSelector caption), and the decor primitives (NeuralNetwork + DotGrid defaults + dashboard density).
- **Slice B — Sessions ring + right-rail MES + chart markers (~300 LOC)**: touches the dashboard sub-components (WinrateBySessionCard ring, GENERAL double-ring, MES progress bars, sparkline reposition, balance tone, H1 size, RecentActivityFeed timestamp + pair chip) and the chart layer (CURVE_THEME hex → vars, last-point badges, deposit/withdraw markers).

The pre-proposal handoff is explicit: this is **inspiration-aligned, not pixel-perfect**. We adopt the visual language (cyan, glass, rings, watermark, chip, badge) at the dashboard's surface; we do NOT chase exact pixel positions or 1:1 reference copy.

## Slice decomposition

| Slice | Title | Files | LOC est. | Risk | PR type |
|---|---|---|---|---|---|
| **A** | High-severity chrome + decor defaults | `PortalSidebar.tsx`, `SidebarHeader.tsx`, `SidebarFooter.tsx`, `DashboardPage.tsx` (watermark mount + CTA + DotGrid density), `AccountSelector.tsx`, `NeuralNetwork.tsx`, `DotGrid.tsx`, new `<CoreInterfaceWatermark>` | ~150 | Low | single |
| **B** | Sessions ring + right-rail MES + chart markers | `WinrateBySessionCard.tsx`, `DashboardKPIsGrid.tsx`, `DashboardSummaryStrip.tsx`, `DashboardPage.tsx` (H1 only), `PerformanceCurveChart.tsx`, `CapitalCurveChart.tsx`, `RecentActivityFeed.tsx`, `curveChartTheme.ts` | ~300 | Med | single |
| **Total** | | | **~450** | | 2 PRs |

Total ~450 LOC across 2 PRs (each well below the 400-line review budget). Chained via `stacked-to-main`.

## Slice A — High-severity chrome + decor defaults

### Edit surface
- `src/components/portal/PortalSidebar.tsx` (line 46)
- `src/components/portal/SidebarHeader.tsx` (line 23)
- `src/components/portal/SidebarFooter.tsx` (line 139)
- `src/pages/portal/DashboardPage.tsx` (lines 186-193 CTA + new `<CoreInterfaceWatermark>` mount + line 158 DotGrid density props)
- `src/components/dashboard/AccountSelector.tsx` (lines 93-95)
- `src/components/decor/NeuralNetwork.tsx` (line 94)
- `src/components/decor/DotGrid.tsx` (line 73)
- `src/components/dashboard/CoreInterfaceWatermark.tsx` (NEW, ~30 LOC)

### Approach

**Sidebar glass (`REQ-CWM-001`)** — `PortalSidebar.tsx` line 46:
```tsx
// Before
'bg-[var(--color-bg)]',
// After
'bg-surface/40 backdrop-blur-md border-r border-[var(--glass-border)]',
```
The right border keeps the existing `border-r border-[var(--color-jade-border)]` removed in favor of `glass-border` (per spec — glass surface implies glass border). The `<Scanline>` overlay stays as the last child.

**Sidebar brand row visible (`REQ-CWM-002`)** — `SidebarHeader.tsx` line 23:
```tsx
// Before
<span className="font-display uppercase tracking-[0.2em] text-white text-xs truncate">
// After
<span
  className="font-display uppercase tracking-[0.2em] text-text-primary text-xs truncate"
  style={{ textShadow: '0 0 8px rgba(0,212,216,0.35)' }}
>
```

**`<CoreInterfaceWatermark>` (`REQ-CWM-003`)** — new ~30 LOC component:
```tsx
export function CoreInterfaceWatermark() {
  return (
    <div
      aria-hidden="true"
      data-testid="core-interface-watermark"
      className="pointer-events-none absolute inset-0 z-0"
    >
      <span className="absolute top-4 left-4 font-display uppercase tracking-widest text-[10px] text-text-muted opacity-10">
        Jade Capital Suite · Core Interface
      </span>
      <span className="absolute bottom-4 left-4 font-display uppercase tracking-widest text-[10px] text-text-muted opacity-10">
        Jarvis
      </span>
      <span className="absolute bottom-4 right-4 font-display uppercase tracking-widest text-[10px] text-text-muted opacity-10">
        Jarvis
      </span>
    </div>
  );
}
```
Mounted inside `DashboardPage.tsx` chrome layer alongside `<DotGrid>` + `<NeuralNetwork>`.

**`+ Nuevo trade` outlined (`REQ-CWM-004`)** — `DashboardPage.tsx` lines 186-193:
```tsx
// Before
className="px-3 py-1.5 rounded-md bg-primary text-bg font-display uppercase tracking-wide text-xs hover:shadow-glow-cyan transition-shadow"
// After
className="px-3 py-1.5 rounded-md border border-primary text-primary bg-transparent font-display uppercase tracking-wide text-xs hover:bg-primary/10 hover:shadow-glow-cyan transition-colors"
```

**`Cerrar sesión` outlined (`REQ-CWM-005`)** — `SidebarFooter.tsx` line 139:
```tsx
// Before
className="btn-cyber-jade px-2 py-1 rounded-md text-xs flex items-center gap-1.5 shrink-0 bg-primary/15"
// After
className="btn-cyber-jade px-2 py-1 rounded-md text-xs flex items-center gap-1.5 shrink-0"
```
(`btn-cyber-jade` is a custom class defined in `src/styles` — check whether it already adds a fill before deciding. If yes, leave `bg-primary/15` removal in place only.)

**AccountSelector caption drop (`REQ-CWM-006`)** — `AccountSelector.tsx` lines 93-95: delete the trailing `<span>...{selectedLabel}</span>` entirely.

**Decor defaults (`REQ-DCF-001`)** — `NeuralNetwork.tsx:94` + `DotGrid.tsx:73`:
```tsx
// Before
const DEFAULT_COLOR = '#00FF9D';
// After (preferred — CSS var on the SVG element, resolves at paint)
const DEFAULT_COLOR = 'var(--color-jade)';
// After (fallback — read at mount, immutable)
const DEFAULT_COLOR = (() => {
  if (typeof window === 'undefined') return '#00D4D8';
  return getComputedStyle(document.documentElement).getPropertyValue('--color-jade').trim() || '#00D4D8';
})();
```
Preferred approach: `'var(--color-jade)'` — SVG `stroke` / `fill` accepts CSS var strings and auto-resolves per-theme. Fallback: `getComputedStyle` at mount if any browser fails visual review.

**Dashboard DotGrid density (`REQ-DCF-002`)** — `DashboardPage.tsx` line 158:
```tsx
// Before
<DotGrid />
// After
<DotGrid spacing={20} opacity={0.05} />
```

### Strict TDD per item
- **RED**: extend `PortalShell.test.tsx` to assert `bg-surface/40` + `backdrop-blur-md` on the sidebar; add `SidebarHeader.test.tsx` (new file or existing) assertion for `text-text-primary` + textShadow; add `CoreInterfaceWatermark.test.tsx` for 3-span mount + `pointer-events-none`; add `SidebarFooter.test.tsx` assertion that `bg-primary/15` is absent; extend `AccountSelector.test.tsx` to assert no trailing caption; extend `NeuralNetwork.test.tsx` to assert no `#00FF9D` literal in the rendered output (read SVG attribute); extend `DotGrid.test.tsx` similarly.
- **GREEN**: apply class swaps + new component mount + decor defaults.
- **TRIANGULATE**: assert on collapsed sidebar (64px) vs expanded (288px) that the glass stays; assert on light-mode theme that the decor primitives paint per-theme cyan.
- **REFACTOR**: extract a shared `<BrandRow>` if SidebarHeader + Topbar reuse the pattern.

### Risks
- Glass sidebar over the dashboard's chrome layer can wash out the brand row in some themes. Mitigation: explicit `text-text-primary` + cyan textShadow.
- `<CoreInterfaceWatermark>` z-index collision with chrome. Mitigation: z-0 inside the existing chrome layer (decor is `-z-10`; content is `z-10`).

### Rollback
`git revert <sha>`. Sidebar reverts to opaque black; brand row back to `text-white`; watermark removed; CTA solid; logout filled; AccountSelector caption returns; decor reverts to jade.

## Slice B — Sessions ring + right-rail MES + chart markers

### Edit surface
- `src/components/dashboard/WinrateBySessionCard.tsx` (lines 60-98: `Tile` + `GeneralTile` bodies)
- `src/features/trades/DashboardKPIsGrid.tsx` (lines 198-271: MES row)
- `src/components/dashboard/DashboardSummaryStrip.tsx` (line 118: sparkline reposition; line 111: balance tone)
- `src/pages/portal/DashboardPage.tsx` (line 171: H1 size)
- `src/components/dashboard/curveChartTheme.ts` (lines 38-46)
- `src/components/dashboard/PerformanceCurveChart.tsx` (last-point badge + markers)
- `src/components/dashboard/CapitalCurveChart.tsx` (last-point badge)
- `src/components/dashboard/RecentActivityFeed.tsx` (lines 121 + new timestamp helper)

### Approach

**Sessions ring (`REQ-DHF-001`)** — replace the flat integer body in `WinrateBySessionCard.tsx` `Tile` (lines 60-78) with a `flex flex-row items-center justify-between` wrapper:
```tsx
// Before (line 60-78)
<div data-testid={...} className="rounded-lg border border-primary/20 ...">
  <div className="text-[10px] ...">{SESSION_LABELS[band]}</div>
  <div className={...}>{empty ? '—' : `${tile.winrate_pct}%`}</div>
  <div className="text-[11px] ...">...</div>
</div>

// After
<div data-testid={...} className="rounded-lg border border-primary/20 ... flex flex-row items-center justify-between gap-2">
  <div className="min-w-0">
    <div className="text-[10px] ...">{SESSION_LABELS[band]}</div>
    <div className={...}>{empty ? '—' : `${tile.winrate_pct}%`}</div>
    <div className="text-[11px] ...">...</div>
  </div>
  <HudRing value={tile.winrate_pct} max={100} unit="%" size="sm" />
</div>
```

**GENERAL tile double-ring (`REQ-DHF-002`)** — `WinrateBySessionCard.tsx` `GeneralTile` (lines 80-98) gets the same `flex-row` + an outer halo `<div className="relative">` wrapping two `<HudRing>` instances (one outer at `opacity={0.4}` no unit, one inner at `opacity={1.0}` with `unit="%"`). The grid wrapper (line 183) gets the GENERAL tile's `col-span` changed to `md:col-span-2` via inline `className` override.

**MES progress bars (`REQ-DHF-003`)** — author a tiny `<HudProgressBar>` (≈ 25 LOC) inline at the bottom of `DashboardKPIsGrid.tsx`. It uses the cyan-tinted track + `--color-jade-profit` fill. The MES grid (lines 199-270) keeps 2 stat cards (`Risk/Reward`, `P&L Acumulado`) and adds 3 progress rows (`Win Rate Mensual`, `R/R exposure`, `Mejor trade`). The Win Rate progress = `(winRatePct / 100) * 95`% width (capped at 95% per spec). The R/R exposure = `(riskReward / 3) * 95`% width. The Mejor trade = `(best / (best + worst loss absolute)) * 95`% width.

**Sparkline reposition (`REQ-DHF-004`)** — `DashboardSummaryStrip.tsx` line 118: drop `rightAdornment={<SparklineIcon />}` and add a new `<div className="mx-auto -my-1">{<SparklineIcon />}</div>` inside the card body after the value `<span>` and before the sub `<span>`.

**Balance tone (`REQ-DHF-006`)** — `DashboardSummaryStrip.tsx` line 111 is already `balanceTotal > 0 ? 'profit' : 'muted'` per the existing code — confirmed at handoff. Tests assert the existing branch.

**H1 greeting size (`REQ-DHF-005`)** — `DashboardPage.tsx` line 171: `text-2xl md:text-3xl` → `text-3xl md:text-4xl`. One-line class swap.

**CURVE_THEME hex literals (`REQ-DCF-003`)** — `curveChartTheme.ts:38-46`:
```tsx
// Before
perf: '#00E676',
balance: '#00B8FF',
volume: 'rgba(0, 230, 118, 0.30)',
background: 'rgba(13, 21, 30, 0.7)',
border: 'rgba(0, 255, 157, 0.18)',
grid: 'rgba(0, 255, 157, 0.10)',
axisText: 'rgba(255, 255, 255, 0.45)',
// After
perf: 'var(--color-jade-profit)',     // cyan-green
balance: 'var(--color-jade-info)',     // cyan
volume: 'rgba(60, 224, 184, 0.30)',    // jade-profit at 30%
background: 'rgba(13, 21, 30, 0.7)',   // unchanged
border: 'rgba(0, 212, 216, 0.18)',     // cyan at 18%
grid: 'rgba(0, 212, 216, 0.10)',       // cyan at 10%
axisText: 'rgba(255, 255, 255, 0.45)', // unchanged
```

**Chart tooltip badges (`REQ-DCF-004`)** — append a `<div>` to each chart card header:
```tsx
<div className="absolute top-3 right-3 font-mono text-[10px] text-text-secondary bg-surface/60 backdrop-blur-sm px-2 py-1 rounded">
  {lastValue} · {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%
</div>
```
Same shape in `CapitalCurveChart.tsx`. The badge `data-testid` is `dash-performance-lastpoint` / `dash-capital-lastpoint`.

**Deposit / withdraw markers (`REQ-DCF-005`)** — `PerformanceCurveChart.tsx`:
```tsx
import { createSeriesMarkers, type ISeriesMarkersPluginApi } from 'lightweight-charts';

// inside the chart mount effect
const markersPlugin = createSeriesMarkers(perfSeries, []);
// store ref
markersPluginRef.current = markersPlugin;

// in the data push effect
const markers = points
  .filter((p) => p.capital_volume !== 0)
  .map((p) => ({
    time: toChartTime(p.date),
    position: p.capital_volume > 0 ? 'aboveBar' : 'belowBar',
    color: p.capital_volume > 0 ? 'var(--color-jade-profit)' : 'var(--color-jade-loss)',
    shape: p.capital_volume > 0 ? 'arrowUp' : 'arrowDown',
    text: `$${Math.abs(p.capital_volume).toFixed(0)}`,
  }));
markersPluginRef.current?.setMarkers(markers);
```
Cleanup in the mount return: `markersPluginRef.current = null` (the plugin detaches when the series is removed).

**RecentActivityFeed timestamp (`REQ-DCF-006`)** — add at the top of `RecentActivityFeed.tsx`:
```tsx
function formatHour(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}
```
Use per row: `<span>{formatHour(t.closed_at ?? t.opened_at)} hrs</span>`.

**Pair-avatar chip (`REQ-DCF-007`)** — `RecentActivityFeed.tsx` line 121:
```tsx
// Before
<div className="text-xl leading-none">{pairFlag(t.instrument)}</div>
// After
<span className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 inline-flex items-center justify-center text-xs shrink-0">
  <span className="leading-none">{pairFlag(t.instrument)}</span>
</span>
```

### Strict TDD per item
- **RED**: extend `WinrateBySessionCard.test.tsx` to assert `<HudRing>` mounts inside each session tile; add `DashboardKPIsGrid.test.tsx` assertion for progress bar count; add `DashboardSummaryStrip.test.tsx` assertion that `data-testid="summary-sparkline"` is inside the card body + balance tone branch; add `DashboardPage.test.tsx` assertion for H1 size; add `curveChartTheme.test.ts` to assert var strings; add `PerformanceCurveChart.test.tsx` assertions for `dash-performance-lastpoint` + marker count per scenario; add `CapitalCurveChart.test.tsx` for `dash-capital-lastpoint`; extend `RecentActivityFeed.test.tsx` for timestamp format + chip class.
- **GREEN**: apply class swaps + HudRing mounts + chart theme + markers + helper.
- **TRIANGULATE**: assert for empty session (ring at 0%), 100% session (ring full), MES with 0 closed trades (bars empty), 0 markers (all points `capital_volume: 0`), 1 deposit, 1 withdraw, mixed days, points with no `closed_at`.
- **REFACTOR**: extract a shared `<SessionTile>` component if `Tile` + `GeneralTile` diverge too much; extract `<PairAvatar>` primitive if RecentActivityFeed + TradeRow both render flags.

### Risks
- `<HudRing>` clip inside narrow session tile (tile ~140px on `md+`, HudRing `sm` = 96px). Mitigation: visual review at Slice B boundary.
- `createSeriesMarkers` re-creation cost. Mitigation: cache `markersPluginRef` and only call `setMarkers` when `points.length` changes.
- `var()` in SVG `stroke` / `fill` browser compat. Mitigation: visual review at Slice B boundary; fallback to Option B (read via `getComputedStyle` at mount) if any browser fails.

### Rollback
`git revert <sha>`. Sessions revert to flat integer tiles; GENERAL loses double-ring; MES reverts to 5 stat cards; sparkline back in `rightAdornment` slot; H1 back to `text-2xl md:text-3xl`; CURVE_THEME reverts to hardcoded hex; markers disappear; timestamp + chip revert.

## Dependencies between slices

```
S1 (Slice A) ──→ S2 (Slice B)
```

S1 (chrome + decor) is independent (touches only shell chrome + decor primitives). S2 (dashboard primitives + charts) is also independent (touches only dashboard sub-components + charts). They CAN land in parallel; ordering A → B is purely conventional (lower-risk first). Both land via `stacked-to-main` (each PR targets `main` in sequence; no stacked branches).

No slice depends on the other's work — there is no cross-slice gate because there is no new ESLint rule or CI guard introduced here.

## Review and judgment risks

### High
- **None.** Total LOC ~450 across 2 PRs, each PR well below 400.

### Medium
- **Slice B `createSeriesMarkers` re-creation cost**: lightweight-charts v5 expects marker re-creation to be cheap. Mitigation: cache `markersPluginRef` and only call `setMarkers` when `points.length` changes. Visual review at Slice B boundary.
- **Slice B `var()` in SVG `stroke` / `fill` browser compat**: some older Safari versions don't resolve CSS vars inside SVG attributes. Mitigation: visual review at Slice B boundary; fallback to Option B (read via `getComputedStyle` at mount) if any browser fails.
- **Slice B `<HudRing>` clip inside narrow session tile**: tile is ~140px wide on `md+`, HudRing `sm` is 96px — fits with label width ≥ 40px. Visual review confirms no overflow on `sm` viewports.

### Low
- **Slice A `<CoreInterfaceWatermark>` z-index**: it must sit above decor but below content. Mitigation: z-0 inside the existing chrome layer (decor is `-z-10`; content is `z-10` from the dashboard `<div>`).

## Cross-cutting concerns

### TDD discipline
Strict TDD active for every item. Every slice follows RED → GREEN → TRIANGULATE → REFACTOR. Tests written first; implementation second.

### Commit hygiene
- Conventional commits. NO `Co-Authored-By` trailer. NO emojis.
- Slice-level commits where possible; sub-task commits when slice is too large.
- Commit messages reference the slice number and the affected spec REQ ID.

### PR strategy
- Slice A: single PR.
- Slice B: single PR.
- All PRs ≤ 400 LOC. `size:exception` not needed.

### Review budget
- `delivery_strategy: auto-chain` confirmed.
- `chain_strategy: stacked-to-main` (each PR targets `main`; no stacked branches).
- `review_budget: 400` enforced per PR.

## Anti-patterns to avoid

- Adding new tokens to `themes.css` (frozen).
- Re-pivoting primary color (already cyan; frozen).
- Pixel-perfect positioning of watermark text (use percentages + `top-4 left-4` anchors; accept visual variance).
- Forcing the `it.todo` drift assertions live (Slice 5 of `core-interface-redesign` responsibility).
- Touching `/backend/**` (frozen).
- Touching `openspec/changes/core-interface-redesign/` (frozen historical record).
- Removing any existing `data-testid`.

## Verification plan

Per slice:
- `pnpm test` — must stay green or grow (baseline 795 tests).
- `pnpm typecheck` — must pass.
- `pnpm lint` — must pass.
- `pnpm build` — must succeed.

At archive time:
- `verify-report.md` confirms all 6 spec REQ IDs met per cluster.
- `sync-report.md` confirms the 3 NEW specs land in `openspec/specs/` if the parent orchestrator chose `global-sync` mode, OR remain change-local if `change-local`.
- `archive-report.md` documents final state + follow-ups.

## Open questions

None at design time. The pre-proposal handoff is locked; parent orchestrator owns the preflight authority.