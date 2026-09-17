# Tasks: dashboard-jarvis-fidelity

**Change**: `dashboard-jarvis-fidelity`
**Reads**: `proposal.md` + `specs/*/spec.md` + `design.md`
**Status**: tasks draft
**Strict TDD**: enabled — RED → GREEN → TRIANGULATE → REFACTOR per task

> **HARD rule**: every task is a markdown checkbox (`- [ ]`). The native SDD dispatcher tracks completion via `- [x]` / `[ ]`. `sdd-continue` refuses to launch `apply` if any task lacks a checkbox.

## Task ID convention

Continuing from `core-interface-redesign` (T-024..T-029 used there; T-030 was reserved for decor mount on DashboardPage and is now closed — but we re-use the T-030+ namespace for this change per the parent-orchestrator brief). New tasks for `dashboard-jarvis-fidelity` use **T-030..T-049**.

## Slice A — High-severity chrome + decor defaults

- [x] T-030 — Sidebar glass surface in `PortalSidebar.tsx` [RED → GREEN → TRIANGULATE → REFACTOR]
  - **RED**: extend `src/components/portal/__tests__/PortalShell.test.tsx` asserting the `<aside>` rendered by `PortalSidebar` applies `bg-surface/40 backdrop-blur-md border-r` and uses `var(--glass-border)` (read via `getComputedStyle`).
  - **GREEN**: swap `PortalSidebar.tsx:46` `bg-[var(--color-bg)]` → `bg-surface/40 backdrop-blur-md border-r border-[var(--glass-border)]`.
  - **TRIANGULATE**: assert Scanline overlay still mounts as the last child; assert width transition (`w-16 ↔ w-72`) is unaffected.
  - **REFACTOR**: extract a shared `SIDEBAR_CHROME` class constant if Sidebar + AdminSidebar diverge.
  - **LOC est.**: ~10
  - **Acceptance**: `pnpm test` green; visual review confirms glass surface reads against dashboard chrome.

- [x] T-031 — Sidebar brand row visibility in `SidebarHeader.tsx` [RED → GREEN → TRIANGULATE → REFACTOR]
  - **RED**: add or extend `src/components/portal/__tests__/SidebarHeader.test.tsx` asserting the brand `<span>` uses `text-text-primary` + inline `textShadow` of `0 0 8px rgba(0,212,216,0.35)`.
  - **GREEN**: swap `SidebarHeader.tsx:23` `text-white` → `text-text-primary` and add the `style={{ textShadow: '0 0 8px rgba(0,212,216,0.35)' }}` prop.
  - **TRIANGULATE**: assert the sub-label (`USUARIO`) remains `text-text-muted`; assert the brand row is hidden in collapsed mode.
  - **REFACTOR**: extract a shared `BRAND_TEXT_SHADOW` constant if other chrome text uses the same glow.
  - **LOC est.**: ~8
  - **Acceptance**: `pnpm test` green; brand row visibly readable on dark bg.

- [x] T-032 — `<CoreInterfaceWatermark>` new component (REQ-CWM-003) [RED → GREEN → TRIANGULATE → REFACTOR]
  - **RED**: write `src/components/dashboard/__tests__/CoreInterfaceWatermark.test.tsx` asserting: (a) the root `<div>` has `data-testid="core-interface-watermark"` + `pointer-events-none` + `aria-hidden="true"`, (b) it contains 3 child `<span>` elements, (c) the first starts with `JADE CAPITAL SUITE`, (d) the second + third equal `JARVIS`.
  - **GREEN**: author `src/components/dashboard/CoreInterfaceWatermark.tsx` (~30 LOC) per design.md.
  - **TRIANGULATE**: assert opacity is `opacity-10` on every span; assert classes include `font-display uppercase tracking-widest text-[10px] text-text-muted`.
  - **REFACTOR**: accept a `corners` prop if future pages need a different layout.
  - **LOC est.**: ~40
  - **Acceptance**: `pnpm test` green; visual review confirms watermarks are subtle (~10% opacity) and never intercept clicks.

- [x] T-033 — Mount `<CoreInterfaceWatermark>` in `DashboardPage.tsx` [GREEN]
  - Add the import + `<CoreInterfaceWatermark />` mount inside the existing chrome layer (`data-testid="dash-decor-layer"`) at `DashboardPage.tsx`.
  - No RED step — covered by T-032's component test.
  - **LOC est.**: ~5
  - **Acceptance**: `pnpm test` green; manual visual review confirms 3 watermarks visible at 10% opacity.

- [x] T-034 — `+ Nuevo trade` outlined pill in `DashboardPage.tsx` [RED → GREEN → TRIANGULATE → REFACTOR]
  - **RED**: extend `src/pages/portal/__tests__/DashboardPage.test.tsx` asserting the CTA (`data-testid="dash-new-trade"`) has `border border-primary text-primary bg-transparent` and hover state adds `bg-primary/10`.
  - **GREEN**: swap `DashboardPage.tsx:190` className per design.md.
  - **TRIANGULATE**: assert `hover:shadow-glow-cyan` is preserved; assert clicking the CTA still calls `openDrawer()`.
  - **REFACTOR**: extract a shared `<OutlinedCta>` if more pills land.
  - **LOC est.**: ~8
  - **Acceptance**: `pnpm test` green; CTA is outlined cyan with cyan glow on hover.

- [x] T-035 — `Cerrar sesión` outlined button in `SidebarFooter.tsx` [RED → GREEN → TRIANGULATE → REFACTOR]
  - **RED**: add or extend `src/components/portal/__tests__/SidebarFooter.test.tsx` asserting the logout button (`data-testid="sidebar-logout"`) does NOT contain `bg-primary/15`.
  - **GREEN**: remove `bg-primary/15` from `SidebarFooter.tsx:139` className.
  - **TRIANGULATE**: assert clicking still triggers `handleLogout`; assert icon + label are unchanged.
  - **REFACTOR**: consolidate logout button styling into a shared `<LogoutPill>` if reused on topbar.
  - **LOC est.**: ~5
  - **Acceptance**: `pnpm test` green; logout button is outlined.

- [x] T-036 — `AccountSelector` trailing caption drop in `AccountSelector.tsx` [RED → GREEN → TRIANGULATE → REFACTOR]
  - **RED**: extend `src/components/dashboard/__tests__/AccountSelector.test.tsx` asserting the rendered output contains exactly ONE `<select>` and ZERO trailing `<span className="font-mono text-[11px]">` elements.
  - **GREEN**: delete `AccountSelector.tsx:93-95` trailing `<span>`.
  - **TRIANGULATE**: assert the `selectedLabel` variable is removed if unused; assert the `<option>` still renders the same labels.
  - **REFACTOR**: clean up unused `selectedLabel` const.
  - **LOC est.**: ~5
  - **Acceptance**: `pnpm test` green; AccountSelector renders only the label + select.

- [x] T-037 — Decor primitives (NeuralNetwork + DotGrid) default to cyan CSS var (REQ-DCF-001) [RED → GREEN → TRIANGULATE → REFACTOR]
  - **RED**: extend `src/components/decor/__tests__/NeuralNetwork.test.tsx` + `DotGrid.test.tsx` asserting the rendered SVG `stroke` or `fill` attribute does NOT contain the literal string `#00FF9D`.
  - **GREEN**: change `NeuralNetwork.tsx:94` + `DotGrid.tsx:73` `DEFAULT_COLOR = '#00FF9D'` → `DEFAULT_COLOR = 'var(--color-jade)'`. SVG attributes accept CSS var strings natively.
  - **TRIANGULATE**: assert the SVG element style resolves to cyan in dark mode AND to the light-mode variant when `data-theme="light"` (read via `getComputedStyle`).
  - **REFACTOR**: extract a shared `CYAN_DECOR_VAR` constant if other primitives need it.
  - **LOC est.**: ~10
  - **Acceptance**: `pnpm test` green; visual review confirms decor paints cyan in both dark and light themes.

- [x] T-038 — Dashboard `<DotGrid>` density override in `DashboardPage.tsx` (REQ-DCF-002) [GREEN]
  - Change `DashboardPage.tsx:158` `<DotGrid />` → `<DotGrid spacing={20} opacity={0.05} />`.
  - No RED step — props change only, no behavior change.
  - **LOC est.**: ~3
  - **Acceptance**: `pnpm test` green; DotGrid is visibly denser on the dashboard.

**Slice A total**: T-030..T-038 (9 tasks), ~94 LOC. Within the ~150 LOC budget.

## Slice B — Sessions ring + right-rail MES + chart markers

- [x] T-039 — Sessions ring progress in `WinrateBySessionCard.tsx` (REQ-DHF-001) [RED → GREEN → TRIANGULATE → REFACTOR]
  - **RED**: extend `src/components/dashboard/__tests__/WinrateBySessionCard.test.tsx` asserting each session tile (`session-tile-{band}`) contains a `<HudRing>` instance (read via `data-testid` or component name in render output).
  - **GREEN**: rewrite `WinrateBySessionCard.tsx:60-78` `Tile` body to `flex-row` + `<HudRing value={tile.winrate_pct} max={100} unit="%" size="sm" />` at right.
  - **TRIANGULATE**: assert empty session (trades: 0) shows `<HudRing value={0}>` + muted `—`; assert 100% winrate shows full ring; assert GENERAL tile still uses the existing `session-tile-general` testid.
  - **REFACTOR**: extract a shared `<SessionTile>` component if `Tile` + `GeneralTile` converge.
  - **LOC est.**: ~30
  - **Acceptance**: `pnpm test` green; sessions render a ring on every tile.

- [x] T-040 — GENERAL tile double-ring in `WinrateBySessionCard.tsx` (REQ-DHF-002) [RED → GREEN → TRIANGULATE → REFACTOR]
  - **RED**: extend the same test asserting `data-testid="session-tile-general"` spans `md:col-span-2` and contains TWO `<HudRing>` instances (inner + outer halo).
  - **GREEN**: rewrite `WinrateBySessionCard.tsx:80-98` `GeneralTile` body to `flex-row` + two nested `<HudRing>` (outer `opacity-40`, inner `opacity-100`).
  - **TRIANGULATE**: assert `md:col-span-2` only applies at `md+` (use `grid` querySelector and check inline class).
  - **REFACTOR**: extract `<DoubleHudRing>` primitive if used elsewhere.
  - **LOC est.**: ~25
  - **Acceptance**: `pnpm test` green; GENERAL tile visibly larger with double ring.

- [x] T-041 — MES row progress bars in `DashboardKPIsGrid.tsx` (REQ-DHF-003) [RED → GREEN → TRIANGULATE → REFACTOR]
  - **RED**: write or extend `src/features/trades/__tests__/DashboardKPIsGrid.test.tsx` asserting the MES section renders 2 stat cards + 3 progress bars (each with `data-testid="hud-progress-bar-{label}"`) when `layout="vertical"` and `tradesForKpis` has ≥ 1 closed trade.
  - **GREEN**: author `<HudProgressBar>` (~25 LOC) at the bottom of `DashboardKPIsGrid.tsx`. Replace 3 of the 5 stat cards (`Win Rate Mensual`, `R/R exposure`, `Mejor trade`) with progress bars. Keep `Risk/Reward` + `P&L Acumulado` as stat cards.
  - **TRIANGULATE**: assert empty MES (no closed trades) renders 3 empty progress bars at 0% width; assert cap at 95% width for max value.
  - **REFACTOR**: extract `<HudProgressBar>` to a top-level `decor/` primitive if reused outside this component.
  - **LOC est.**: ~50
  - **Acceptance**: `pnpm test` green; MES row reads as 2 stat + 3 progress bars.

- [x] T-042 — Sparkline reposition in `DashboardSummaryStrip.tsx` (REQ-DHF-004) [RED → GREEN → TRIANGULATE → REFACTOR]
  - **RED**: extend `src/components/dashboard/__tests__/DashboardSummaryStrip.test.tsx` asserting `data-testid="summary-sparkline"` is inside the card body (sibling of the value `<span>`), NOT inside the label row.
  - **GREEN**: drop `rightAdornment={<SparklineIcon />}` prop at line 118. Add `<div className="mx-auto -my-1">{<SparklineIcon />}</div>` inside the card body.
  - **TRIANGULATE**: assert Operations card value still renders; assert sparkline SVG still has the cyan stroke.
  - **REFACTOR**: extract a `<Sparkline>` primitive if used in other summary strips.
  - **LOC est.**: ~10
  - **Acceptance**: `pnpm test` green; sparkline visible inside card body.

- [x] T-043 — H1 greeting size + balance tone in `DashboardPage.tsx` + `DashboardSummaryStrip.tsx` (REQ-DHF-005 + REQ-DHF-006) [RED → GREEN → TRIANGULATE → REFACTOR]
  - **RED**: extend `DashboardPage.test.tsx` asserting the H1 has classes `text-3xl md:text-4xl`. Extend `DashboardSummaryStrip.test.tsx` asserting Balance Total card uses `text-profit` when `balanceTotal > 0` and `text-text-muted` when `balanceTotal === 0`.
  - **GREEN**: swap `DashboardPage.tsx:171` `text-2xl md:text-3xl` → `text-3xl md:text-4xl`. Confirm `DashboardSummaryStrip.tsx:111` already uses the correct tone branch.
  - **TRIANGULATE**: assert textShadow unchanged on H1; assert P&L card still uses profit/loss tone correctly.
  - **REFACTOR**: extract a shared `<GreetingTitle>` component if H1 styling is reused on other pages.
  - **LOC est.**: ~5
  - **Acceptance**: `pnpm test` green; H1 visibly larger; balance tone rule confirmed.

- [x] T-044 — `CURVE_THEME` hex → CSS vars in `curveChartTheme.ts` (REQ-DCF-003) [RED → GREEN → TRIANGULATE → REFACTOR]
  - **RED**: write `src/components/dashboard/__tests__/curveChartTheme.test.ts` asserting `CURVE_THEME.perf === 'var(--color-jade-profit)'`, `CURVE_THEME.balance === 'var(--color-jade-info)'`, `CURVE_THEME.border === 'rgba(0, 212, 216, 0.18)'`, `CURVE_THEME.grid === 'rgba(0, 212, 216, 0.10)'`.
  - **GREEN**: swap hex literals at `curveChartTheme.ts:38-46` per design.md.
  - **TRIANGULATE**: assert `background` + `axisText` rgba unchanged.
  - **REFACTOR**: extract a shared `CYAN_RGBA` constant if other chart themes use the same values.
  - **LOC est.**: ~12
  - **Acceptance**: `pnpm test` green; chart theme resolves cyan.

- [x] T-045 — Chart tooltip badges in `PerformanceCurveChart.tsx` + `CapitalCurveChart.tsx` (REQ-DCF-004) [RED → GREEN → TRIANGULATE → REFACTOR]
  - **RED**: extend `src/components/dashboard/__tests__/PerformanceCurveChart.test.tsx` asserting `data-testid="dash-performance-lastpoint"` exists with the formatted `+$X.XX` text. Same for `CapitalCurveChart.test.tsx` → `dash-capital-lastpoint`.
  - **GREEN**: append the absolute-positioned badge `<div>` per design.md to both chart card headers. Compute the `deltaPct` from first/last point.
  - **TRIANGULATE**: assert badge is hidden when `points.length === 0`; assert absolute positioning `top-3 right-3`; assert glass backdrop blur.
  - **REFACTOR**: extract a `<ChartLastPointBadge>` primitive if reused in other chart cards.
  - **LOC est.**: ~30
  - **Acceptance**: `pnpm test` green; badge visible top-right of both charts.

- [x] T-046 — Deposit / withdraw markers in `PerformanceCurveChart.tsx` (REQ-DCF-005) [RED → GREEN → TRIANGULATE → REFACTOR]
  - **RED**: extend `PerformanceCurveChart.test.tsx` asserting:
    - A point with `capital_volume: 500` produces an `arrowUp` marker at the corresponding time with cyan color.
    - A point with `capital_volume: -200` produces an `arrowDown` marker with red color.
    - A point with `capital_volume: 0` produces NO marker.
  - **GREEN**: import `createSeriesMarkers` + `ISeriesMarkersPluginApi` from `lightweight-charts`. Add `markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)`. Create the plugin in the mount effect; call `setMarkers([...])` in the data push effect per design.md.
  - **TRIANGULATE**: assert markers are NOT re-created on every render (use `markersPluginRef.current` across renders); assert cleanup detaches the plugin on unmount.
  - **REFACTOR**: extract `<SeriesMarkers>` hook if reused for `CapitalCurveChart` later.
  - **LOC est.**: ~45
  - **Acceptance**: `pnpm test` green; deposit/withdraw triangles visible on Performance curve.

- [x] T-047 — `RecentActivityFeed` timestamp helper + pair chip (REQ-DCF-006 + REQ-DCF-007) [RED → GREEN → TRIANGULATE → REFACTOR]
  - **RED**: extend `src/components/dashboard/__tests__/RecentActivityFeed.test.tsx` asserting:
    - Each row shows a `<span>` with text matching `/^\d{2}:\d{2} hrs$/`.
    - Closed trade uses `t.closed_at`; OPEN trade falls back to `t.opened_at`.
    - The pair flag wrapper has classes `w-7 h-7 rounded-full bg-primary/15 border border-primary/30`.
  - **GREEN**: add `formatHour()` helper using `Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })`. Render per row. Wrap the emoji `pairFlag(t.instrument)` in the chip `<span>` per design.md.
  - **TRIANGULATE**: assert ISO strings with `Z` suffix parse correctly; assert fallback uses `opened_at` when `closed_at` is `null`.
  - **REFACTOR**: extract `<PairAvatar>` primitive if `TradeRow` also renders flags.
  - **LOC est.**: ~25
  - **Acceptance**: `pnpm test` green; rows show "HH:MM hrs" + cyan chip avatar.

**Slice B total**: T-039..T-047 (9 tasks), ~232 LOC. Within the ~300 LOC budget.

## Reserved slots

- [ ] T-048 — (RESERVED) Follow-up cleanup [GREEN]
  - Slot reserved for any cleanup discovered during apply (e.g., `pnpm lint` allowlist updates, doc string refresh, dead code removal). Default action if unused: skipped.
  - **LOC est.**: ≤ 20

- [ ] T-049 — (RESERVED) Apply-phase verification polish [GREEN]
  - Slot reserved for verification polish (visual screenshot, light-mode contrast check, `apply-progress.md` evidence). Default action if unused: skipped.
  - **LOC est.**: ≤ 20

## Task rollup

| Slice | Task IDs | LOC est. total |
|---|---|---|
| S1 | T-030..T-038 | ~94 |
| S2 | T-039..T-047 | ~232 |
| Reserved | T-048..T-049 | ≤ 40 (optional) |
| **Total** | **18 tasks** | **~366** (≤ 406 with reserved) |

## Review Workload Forecast (REQUIRED by sdd-tasks)

```
Review Workload Forecast:
- Total tasks: 18 (T-030..T-047 active + T-048..T-049 reserved)
- Total LOC est.: ~366 (active) / ~406 (with reserved)
- Slices S1, S2: single PR each (≤ 232 LOC)
- 400-line budget risk: LOW per PR (Slice A is 94 LOC, Slice B is 232 LOC)
- Chained PRs recommended: YES for Slice A → Slice B
- Decision needed before apply: NO (delivery_strategy: auto-chain, chain_strategy: stacked-to-main)
```

## Acceptance gates

Each task requires:
- `pnpm test` green (test count grows or stays equal; baseline 795).
- `pnpm typecheck` pass.
- `pnpm lint` pass (allow-list updated if needed for any new hex literals).
- `pnpm build` succeed.
- No `data-testid` removed (preserve `dash-summary-strip`, `dash-recent-activity`, `session-tile-{band}`, `dash-performance-curve`, `dash-capital-curve`, `dash-new-trade`, `dash-account-selector`, `dash-decor-layer`, `dash-kpis-section`, `dash-winrate-section`, etc.).
- Conventional commit message. NO `Co-Authored-By` trailer. NO emojis in titles.

Each slice requires:
- All tasks complete.
- Slice-level visual review (manual, screenshot to `openspec/changes/dashboard-jarvis-fidelity/apply-progress.md`).
- `apply-progress.md` updated with slice evidence.

## Next Step

`sdd-apply` — for each task T-030..T-047, follow strict TDD (RED → GREEN → TRIANGULATE → REFACTOR), commit with conventional message + NO `Co-Authored-By` trailer + NO emojis. Slice-by-slice delivery with `apply-progress.md` evidence at each slice boundary.