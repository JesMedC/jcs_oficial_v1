# Apply Progress: dashboard-jarvis-fidelity

**Change**: `dashboard-jarvis-fidelity`
**Phase**: sdd-apply (Slice A + Slice B complete)
**Started**: 2026-09-17

## Status

- **Slice A** (chrome + decor defaults): ✅ Complete — 9/9 tasks (`8748b8e` ... `fe3d250`)
- **Slice B** (sessions ring + right-rail MES + chart markers): ✅ Complete — 9/9 tasks (`4271337` ... `61a5ee1`)
- **Slice C / reserved (T-048, T-049)**: ⏳ Pending (cleanup + verify polish, default action if unused: skipped)

## Slice A — Chrome + decor defaults

**Commits** (10 total: 9 task commits + 1 fixup)
- `8748b8e` — `feat(dashboard-jarvis-fidelity): T-030 sidebar glass surface`
- `f8c5157` — `feat(dashboard-jarvis-fidelity): T-031 sidebar brand row visibility`
- `acf9acd` — `feat(dashboard-jarvis-fidelity): T-032 CoreInterfaceWatermark chrome component`
- `c8031b7` — `feat(dashboard-jarvis-fidelity): T-033 mount CoreInterfaceWatermark in dashboard chrome`
- `41884f1` — `feat(dashboard-jarvis-fidelity): T-034 outlined + Nuevo trade CTA`
- `be79cdc` — `test(dashboard-jarvis-fidelity): T-035 logout pill regression guard`
- `e6788f5` — `feat(dashboard-jarvis-fidelity): T-036 drop AccountSelector trailing caption`
- `f7cfd86` — `feat(dashboard-jarvis-fidelity): T-037 decor primitives default to cyan CSS var`
- `25012cd` — `feat(dashboard-jarvis-fidelity): T-038 dashboard DotGrid density override`
- `fe3d250` — `fix(dashboard-jarvis-fidelity): typecheck + lint cleanups after Slice A`

**Tasks (9/9 complete)**
- **T-030 ✅** Sidebar glass surface (REQ-CWM-001)
  - RED: extended `PortalShell.test.tsx` asserting `bg-surface/40`, `backdrop-blur-md`, `border-[var(--glass-border)]` on the `<aside>`. RED verified (1 failed / 5 passed).
  - GREEN: swapped `PortalSidebar.tsx` chrome to glass surface + glass border.
  - TRIANGULATE: added width-transition test (w-72 ↔ w-16) + opaque-fill regression guard (`bg-[var(--color-bg)]` and `border-[var(--color-jade-border)]` are gone).
  - REFACTOR: skipped (Sidebar + AdminSidebar are separate concerns — premature extraction).
  - LOC: ~11 production / ~30 tests.
- **T-031 ✅** Sidebar brand row visibility (REQ-CWM-002)
  - RED: extended `PortalShell.test.tsx` asserting `text-text-primary` + `textShadow: 0 0 8px rgba(0,212,216,0.35)` on the brand `<span>`. RED verified (1 failed / 7 passed).
  - GREEN: swapped `SidebarHeader.tsx:23` `text-white` → `text-text-primary` + inline cyan textShadow.
  - TRIANGULATE: confirmed `USUARIO` sub-label stays `text-text-muted`; added collapsed-mode test (w-16 hides brand row + USUARIO sub-label).
  - REFACTOR: skipped (`BRAND_TEXT_SHADOW` constant is overkill for one site; revisit if Topbar ever adds the same chrome).
  - LOC: ~12 production / ~30 tests.
- **T-032 ✅** `<CoreInterfaceWatermark>` new component (REQ-CWM-003)
  - RED: created `src/components/dashboard/__tests__/CoreInterfaceWatermark.test.tsx` with 6 cases (root testid + classes, 3-span mount, brand line, "Jarvis" labels, opacity-10 + typography utilities, corner anchors). RED verified by deleting the component briefly (test load failed).
  - GREEN: authored `src/components/dashboard/CoreInterfaceWatermark.tsx` (~34 LOC) per design.md §5.3 (3 absolute-positioned `<span>`s at top-left, bottom-left, bottom-right).
  - TRIANGULATE: covered by the 6 cases (each contract boundary pinned).
  - REFACTOR: skipped (component is intentionally minimal; future `corners` prop is the only anticipated growth vector and not needed yet).
  - LOC: ~34 production / ~94 tests.
- **T-033 ✅** Mount `<CoreInterfaceWatermark>` in `DashboardPage.tsx` (no RED — covered by T-032 component test)
  - GREEN: imported + mounted inside the existing `data-testid="dash-decor-layer"` chrome layer.
  - LOC: ~10 production / 0 tests.
- **T-034 ✅** `+ Nuevo trade` outlined CTA (REQ-CWM-004)
  - RED: extended `DashboardPage.test.tsx` asserting `border border-primary text-primary bg-transparent` + `hover:shadow-glow-cyan hover:bg-primary/10` on `[data-testid="dash-new-trade"]`. RED verified (2 failed / 1 passed).
  - GREEN: swapped `DashboardPage.tsx` CTA className to outlined variant + hover-fill-10.
  - TRIANGULATE: added legacy `bg-primary` + `text-bg` regression guard (tokenized split to avoid colliding with `hover:bg-primary/10`); added click-handler regression that asserts `useNewTradeDrawer.open` is still invoked.
  - REFACTOR: skipped (one site — premature extraction).
  - LOC: ~1 production / ~48 tests.
- **T-035 ✅** `Cerrar sesión` outlined button (REQ-CWM-005)
  - RED: added regression-guard test asserting the logout pill (`[data-testid="sidebar-logout"]`) does NOT carry standalone `bg-primary/15`. RED verified (test passes by accident because the class was already removed in a prior commit — Slice 3 of `core-interface-redesign`). Pinning the contract serves as a guard against future regressions + explicitly tested the click-handler wire-through.
  - GREEN: no production change needed (the className already matches the contract).
  - TRIANGULATE: added click-handler test asserting `useAuth().logout` is called when the pill is clicked.
  - REFACTOR: skipped (single site).
  - LOC: 0 production / ~30 tests.
- **T-036 ✅** AccountSelector trailing caption drop (REQ-CWM-006)
  - RED: created `src/components/dashboard/__tests__/AccountSelector.test.tsx` with 3 cases: (a) exactly one `<select>` + chrome label "Alcance", (b) ZERO trailing `<span className="font-mono text-[11px]">` captions, (c) same `<option>` labels preserved. RED verified (1 failed / 2 passed — caption test caught the live `<span>`).
  - GREEN: deleted `AccountSelector.tsx:93-95` trailing `<span>` + the unused `selectedLabel` variable.
  - TRIANGULATE: the 3 cases cover: chrome label, select count, trailing caption absence, option-label preservation, account-types boundary.
  - REFACTOR: dead `selectedLabel` removed as part of GREEN.
  - LOC: ~6 production / ~102 tests (with imports + boilerplate).
- **T-037 ✅** Decor primitives default to cyan CSS var (REQ-DCF-001)
  - RED: updated existing default-color assertions in `NeuralNetwork.test.tsx` + `DotGrid.test.tsx` to expect `var(--color-jade)`; added a `container.innerHTML` regression guard against the literal `#00FF9D` hex. RED verified (4 failed / 29 passed across both files).
  - GREEN: swapped `DEFAULT_COLOR = '#00FF9D'` → `DEFAULT_COLOR = 'var(--color-jade)'` in both `NeuralNetwork.tsx:94` and `DotGrid.tsx:73`. SVG `stroke` / `fill` accept CSS vars natively and resolve at paint time.
  - TRIANGULATE: added consistency guard (line stroke + circle fill use the SAME cyan var) + `startsWith('var(')` contract guard (catches future hex drift regardless of token rename).
  - REFACTOR: skipped extracting `CYAN_DECOR_VAR` (premature — only 2 sites, self-documenting literal).
  - LOC: ~14 production / ~58 tests.
- **T-038 ✅** Dashboard `<DotGrid>` density override (REQ-DCF-002)
  - GREEN: `<DotGrid />` → `<DotGrid spacing={20} opacity={0.05} />` in `DashboardPage.tsx` (dashboard mount only).
  - LOC: ~7 production / 0 tests (props-only change; behavior covered by existing `DotGrid.test.tsx` prop-pass-through cases).

**Verification gates**
- `pnpm test` → **836 passed** + 32 todo (was 811 + 32; **+25 new tests from Slice A**, no regressions). ✅
  - Baseline delta: 836 - 811 = +25 tests across the 5 modified test files.
- `pnpm typecheck` → clean. ✅
- `pnpm lint` → clean (passes `--max-warnings 0`). ✅
- `pnpm build` → succeeded in 2.95s. ✅

**Edit surface** (vs `92abe56` pre-Slice-A)
- `src/components/dashboard/AccountSelector.tsx` (+7 / −8 — caption + selectedLabel removal)
- `src/components/dashboard/CoreInterfaceWatermark.tsx` (NEW, +34)
- `src/components/dashboard/__tests__/AccountSelector.test.tsx` (NEW, +102)
- `src/components/dashboard/__tests__/CoreInterfaceWatermark.test.tsx` (NEW, +94)
- `src/components/decor/DotGrid.tsx` (+3 / −4 — DEFAULT_COLOR swap)
- `src/components/decor/NeuralNetwork.tsx` (+3 / −4 — DEFAULT_COLOR swap)
- `src/components/decor/__tests__/DotGrid.test.tsx` (+18 / −7 — defaults update + regression guard)
- `src/components/decor/__tests__/NeuralNetwork.test.tsx` (+26 / −7 — defaults update + regression guard)
- `src/components/portal/PortalSidebar.tsx` (+5 / −6 — glass surface + glass border)
- `src/components/portal/SidebarHeader.tsx` (+8 / −4 — text-text-primary + cyan textShadow)
- `src/components/portal/__tests__/PortalShell.test.tsx` (+83 / −34 — T-030 + T-031 + T-035 extensions)
- `src/pages/portal/DashboardPage.tsx` (+14 / −6 — CoreInterfaceWatermark mount + outlined CTA + DotGrid density)
- `src/pages/portal/__tests__/DashboardPage.test.tsx` (+48 / 0 — T-034 extensions)
- **Total: +501 / −24 = +477 net LOC** across 13 files (10 prod files + 3 new test files).

**LOC budget deviation — `size:exception` recommendation**
- Design forecast: Slice A = ~94 LOC (per `design.md` table).
- Actual: +501 / −24 = **+477 net LOC**, of which ~106 production code and ~371 test code.
- Reason: strict TDD with RED → GREEN → TRIANGULATE per task added multiple boundary cases (collapsed mode, token collisions, regression guards, contract stability). Tests grow faster than production because every contract gets pinned from 2-3 angles.
- The budget is the WRAPPING (PR slice), not the work. Per `work-unit-commits` skill: "Never delete comments, blank lines, docs, or tests, and never compress or restyle code, to fit under the review budget."
- **Recommendation**: keep Slice A as a single PR at +477 net LOC; flag `size:exception` at PR-open time. The 9 commits are independently revertible and tell a coherent story (chrome → brand → watermark → CTA → logout → selector → decor → density).
- Alternative (not recommended): split into chained PRs (chrome-first at ~200 LOC, decor-second at ~280 LOC) — but this duplicates the dashboard page touchpoints and complicates the rollback path.

**Risks encountered (mitigated)**
- `bg-primary/10` in the outlined CTA collides with a naive `/\bbg-primary\b/` regression regex. Mitigation: switched the regression guard to a tokenized class split (`tokens.includes('bg-primary')`) which only catches the standalone class, not the hover variant.
- The `<option>` labels in `AccountSelector.test.tsx` are async — the React Query hook resolves after the initial render. Mitigation: `await screen.findByRole('option', ...)` before asserting the full option list.
- `useNewTradeDrawer` is a Zustand store that holds a global `open` reference. Switching from a per-test `vi.fn()` to `useNewTradeDrawer.setState({ open: drawerOpen })` before each render keeps the spy consistent across `DashboardPage` re-renders.
- `AccountTypeLiteral` is `'BINARY' | 'FOREX'` (no `'CRYPTO'`). The triangle test originally used `'CRYPTO'` and tripped typecheck. Mitigation: switched to `'BINARY'`.

**Out-of-scope actions taken** (none)
- No token change in `src/styles/themes.css` (cyan ladder frozen).
- No `data-testid` removed — every consumer testid (`dash-account-selector`, `dash-new-trade`, `dash-decor-layer`, `dash-summary-section`, `dash-winrate-section`, `dash-equity-curve-section`, `sidebar-logout`) preserved.
- No backend touched.
- No archived change touched (`core-interface-redesign`, `design-system-v1`, `sessions-configurable-cap`).
- No chart library swap (lightweight-charts stays).
- No `src/components/decor/HudRing.tsx` consumed yet (deferred to Slice B).

**Review risk**
- LOW per commit (9 atomic work units, each < 100 LOC).
- MEDIUM at PR level (~477 net LOC vs 400 budget) — flagged for `size:exception`.
- Visual review recommended before Slice B lands: spin up `pnpm dev`, navigate to `/portal/dashboard`, confirm the JARVIS chrome (glass sidebar + cyan brand row + outlined CTA + 3 watermarks + denser DotGrid) reads as one cohesive shell. If the watermark is too noisy, drop opacity from `10` to `5`. If the DotGrid density change reads as too busy, revert spacing to 24.

## Slice B — Sessions ring + right-rail MES + chart markers

**Commits** (8 total — 7 task commits + 1 fixup where T-042/T-043 + T-045/T-046 were paired)
- `4271337` — `feat(dashboard-jarvis-fidelity): T-039 HudRing on sessions`
- `24b0fef` — `feat(dashboard-jarvis-fidelity): T-040 GENERAL tile double-ring + col-span-2`
- `06edd59` — `feat(dashboard-jarvis-fidelity): T-041 MES row progress bars`
- `4635325` — `feat(dashboard-jarvis-fidelity): T-042 sparkline reposition + T-043 balance tone`
- `6ef1597` — `feat(dashboard-jarvis-fidelity): T-043 H1 greeting size bump`
- `148d4d5` — `feat(dashboard-jarvis-fidelity): T-044 CURVE_THEME hex to CSS vars`
- `7000d4b` — `feat(dashboard-jarvis-fidelity): T-045 chart badges + T-046 deposit markers`
- `61a5ee1` — `feat(dashboard-jarvis-fidelity): T-047 RecentActivityFeed timestamp + pair chip`

**Tasks (9/9 complete)**

- **T-039 ✅** HudRing on session tiles (REQ-DHF-001)
  - RED: extended `WinrateBySessionCard.test.tsx` (3 new cases) asserting each `session-tile-{band}` mounts a `<HudRing>` (verified via SVG `<circle>` `stroke-dashoffset`).
  - GREEN: `Tile` body rewritten to `flex flex-row items-center justify-between` + `<HudRing value={tile.winrate_pct} max={100} unit="%" size="sm" />` at right.
  - TRIANGULATE: empty session (trades: 0) keeps ring mounted at 0% with muted `—`; 100% winrate shows `stroke-dashoffset="0"`; testid round-trips preserved for ASIA / LONDON / NEW_YORK / SYDNEY / general.
  - REFACTOR: skipped — `Tile` + `GeneralTile` are still 90 % identical, but the second pass (T-040) splits them; no shared `<SessionTile>` yet.
  - LOC: ~14 production / ~127 tests.

- **T-040 ✅** GENERAL tile double-ring + col-span-2 (REQ-DHF-002)
  - RED: 2 new cases in `WinrateBySessionCard.test.tsx` asserting `md:col-span-2` on `session-tile-general` + ≥ 2 SVG mounts (one per HudRing instance).
  - GREEN: `GeneralTile` rewritten to `md:col-span-2 flex flex-row items-center justify-between gap-3` + outer halo (HudRing at `opacity-40`) wrapping inner ring (HudRing at `opacity-100`). Class swap only — both rings share the same primitive.
  - TRIANGULATE: empty GENERAL still mounts both rings + keeps `md:col-span-2`; glass chrome (`backdrop-blur-md`) preserved.
  - REFACTOR: skipped — outer halo is an absolutely-positioned `<div>` around the inner HudRing so the visual double-ring needs no new primitive. Extracting a `<DoubleHudRing>` would only have one consumer (here).
  - LOC: ~22 production / ~50 tests.

- **T-041 ✅** MES row progress bars (REQ-DHF-003)
  - RED: created `src/features/trades/__tests__/DashboardKPIsGrid.test.tsx` (3 cases) asserting 2 stat cards + 3 progress bars when ≥ 1 closed trade, plus 0% fill on empty data, plus 95% cap on 100% winrate.
  - GREEN: authored `<HudProgressBar>` inline at the bottom of `DashboardKPIsGrid.tsx` (~70 LOC). Replaced `Win Rate Mensual` + `R/R exposure` + `Mejor trade` stat cards with progress bars. `Risk/Reward` + `P&L Acumulado` stay as stat cards. `Profit Factor` math retained as `_pfDisplay`/`_pfTone` (no consumer yet) to avoid a refetch on future use.
  - TRIANGULATE: 0% empty MES → 3 progress bars with `width: 0%`; 10 wins / 0 losses → Win Rate fill capped at 95% per spec.
  - REFACTOR: skipped extracting `<HudProgressBar>` to `src/components/decor/` — only one consumer; YAGNI. The 95% cap is the right default (always leaves a sliver of track visible at the ceiling).
  - LOC: ~125 production / ~195 tests.

- **T-042 ✅** Sparkline reposition (REQ-DHF-004)
  - RED: created `src/components/dashboard/__tests__/DashboardSummaryStrip.test.tsx` (4 cases). The sparkline position check uses `parent.contains(sparkline)` + `firstChild.contains(sparkline) === false` so the assertion stays valid across the layout swap.
  - GREEN: `SummaryCard` swapped `rightAdornment` slot for an `adornment` slot rendered inside the card body (sibling of value + sub). Sparkline moves into a `<div className="mx-auto -my-1">` wrapper so the negative margin eats the vertical gap rather than adding it.
  - TRIANGULATE: Operations card value still renders, all 4 card testids preserved, 25% right rail layout unaffected.
  - REFACTOR: skipped extracting a `<Sparkline>` primitive — same SVG already lives inline in 1 site.
  - LOC: ~5 production / ~90 tests.

- **T-043 ✅** H1 greeting size + balance tone rule (REQ-DHF-005 + REQ-DHF-006)
  - RED: 2 commits (one for the DashboardPage H1 assertion, one for the SummaryStrip balance tone assertion).
  - GREEN: `DashboardPage.tsx:187` swap `text-2xl md:text-3xl` → `text-3xl md:text-4xl`. Cyan textShadow preserved. Balance tone rule on `DashboardSummaryStrip.tsx:111` was already correct per the spec — covered by the new `DashboardSummaryStrip.test.tsx` test.
  - TRIANGULATE: tokenized class split (`tokens.includes('text-3xl')`) avoids a naive substring on `text-3xl`. Old `text-2xl` / `md:text-3xl` confirmed absent. P&L card tone logic untouched (regression guarded by pre-existing tests).
  - REFACTOR: skipped — no other page needs the bump yet.
  - LOC: ~1 production / ~22 tests.

- **T-044 ✅** `CURVE_THEME` hex → CSS vars (REQ-DCF-003)
  - RED: created `src/components/dashboard/__tests__/curveChartTheme.test.ts` (4 cases) asserting `perf = var(--color-jade-profit)`, `balance = var(--color-jade-info)`, `border = rgba(0,212,216,0.18)`, `grid = rgba(0,212,216,0.10)`. Regression guard: `JSON.stringify(CURVE_THEME)` must NOT contain `#00E676` (legacy jade hex).
  - GREEN: swapped `curveChartTheme.ts:38-46` literals per design.md. `volume` rgba updated to `rgba(60,224,184,0.30)` (jade-profit at 30%) per spec.
  - TRIANGULATE: `background` (`rgba(13,21,30,0.7)`) + `axisText` (`rgba(255,255,255,0.45)`) preserved unchanged (no token equivalent exists).
  - REFACTOR: skipped extracting `CYAN_RGBA` — only 2 sites and the literal is self-documenting.
  - LOC: ~9 production / ~40 tests.

- **T-045 ✅** Chart tooltip badges (REQ-DCF-004)
  - RED: created `PerformanceCurveChart.test.tsx` (6 cases) + `CapitalCurveChart.test.tsx` (3 cases) asserting `dash-performance-lastpoint` + `dash-capital-lastpoint` badges, absolute positioning, glass backdrop blur, and badge hidden when `points.length === 0`.
  - GREEN: appended an `absolute top-3 right-3` `<div>` to both chart card headers (parent gets `relative` so the badge anchors top-right). Both badges compute the delta P&L `last - first` and the relative `deltaPct` with a 9999% cap on zero-base.
  - TRIANGULATE: zero-point data hides the badge entirely; Performance badge on real fixture shows `+$9.20 · +153.3%`; Capital badge on `(1000 → 1250.5)` shows `+$250.50`; negative delta `(1000 → 800)` shows `-$200.00`.
  - REFACTOR: skipped extracting `<ChartLastPointBadge>` — only 2 sites (performance + capital); inlined twice keeps the cards' header layout self-contained.
  - LOC: ~38 production / ~342 tests.

- **T-046 ✅** Deposit / withdraw markers (REQ-DCF-005)
  - RED: 4 of the 6 `PerformanceCurveChart.test.tsx` cases cover the marker contract — deposit (`capital_volume: 500` → `arrowUp aboveBar var(--color-jade-profit)`), withdraw (`-200` → `arrowDown belowBar var(--color-jade-loss)`), zero-volume (no marker), mixed days (only non-zero days produce markers).
  - GREEN: imported `createSeriesMarkers` + `ISeriesMarkersPluginApi` + `SeriesMarker` from `lightweight-charts`. Added `markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)`. Plugin created ONCE per mount; subsequent updates call `setMarkers()` only.
  - TRIANGULATE: `setMarkers` mock captured per call → the count of markers matches `points.filter(p => p.capital_volume !== 0).length`. Plugin cleanup nulls the ref on unmount (chart.remove() detaches the plugin automatically).
  - REFACTOR: skipped extracting a `<SeriesMarkers>` hook — only 1 chart uses it; revisit if CapitalCurveChart ever needs fund-flow markers.
  - LOC: ~40 production / covered by T-045 tests.

- **T-047 ✅** RecentActivityFeed timestamp + pair chip (REQ-DCF-006 + REQ-DCF-007)
  - RED: 3 new cases in `RecentActivityFeed.test.tsx` + a dedicated `formatHour.test.ts` (2 cases) for the helper itself.
  - GREEN: extracted `formatHour(iso)` to `src/features/trades/formatHour.ts` (own module to keep `react-refresh/only-export-components` happy). Renders per row via `<span data-testid="dash-recent-activity-hour">`. Pair flag emoji now wrapped in `<span className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 inline-flex items-center justify-center text-xs shrink-0">`.
  - TRIANGULATE: closed trade uses `t.closed_at`; OPEN trade falls back to `t.opened_at`. Helper test confirms `HH:MM hrs` shape regardless of timezone (we only assert the format, not the absolute value).
  - REFACTOR: extracted `formatHour` (extracted, not just inlined) — the helper is useful for any future surface that wants the same `HH:MM hrs` chip, and putting it next to `format.ts` keeps related helpers co-located.
  - LOC: ~45 production (incl. new file) / ~114 tests.

**Verification gates**
- `pnpm test` → **867 passed** + 32 todo (was 836 + 32 post-Slice-A; **+31 new tests from Slice B**, no regressions). ✅
  - New tests added: 5 (T-039+T-040) + 3 (T-041) + 4 (T-042+T-043) + 4 (T-044) + 9 (T-045+T-046) + 5 (T-047) + 1 (T-043 H1) = 31 new test cases.
- `pnpm typecheck` → clean. ✅
- `pnpm lint` → clean (passes `--max-warnings 0`). ✅
- `pnpm build` → succeeded in 2.12s (DashboardPage bundle: 32.26 kB / 9.09 kB gzipped — no new chunks added). ✅

**Edit surface** (vs `e01694c` post-Slice-A)
- `src/components/dashboard/WinrateBySessionCard.tsx` (+38 / −11 — HudRing mount + flex-row + GENERAL double-ring)
- `src/components/dashboard/__tests__/WinrateBySessionCard.test.tsx` (+177 / −5 — T-039 + T-040 cases)
- `src/components/dashboard/DashboardSummaryStrip.tsx` (+5 / −9 — adornment prop swap + body mount)
- `src/components/dashboard/__tests__/DashboardSummaryStrip.test.tsx` (NEW, +90)
- `src/components/dashboard/PerformanceCurveChart.tsx` (+71 / −12 — badge + markersPluginRef + setMarkers)
- `src/components/dashboard/__tests__/PerformanceCurveChart.test.tsx` (NEW, +231)
- `src/components/dashboard/CapitalCurveChart.tsx` (+36 / −2 — badge)
- `src/components/dashboard/__tests__/CapitalCurveChart.test.tsx` (NEW, +111)
- `src/components/dashboard/RecentActivityFeed.tsx` (+24 / −1 — chip + timestamp)
- `src/components/dashboard/__tests__/RecentActivityFeed.test.tsx` (+97 / 0 — T-047 cases)
- `src/components/dashboard/curveChartTheme.ts` (+9 / −6 — CSS-var swap)
- `src/components/dashboard/__tests__/curveChartTheme.test.ts` (NEW, +40)
- `src/features/trades/DashboardKPIsGrid.tsx` (+148 / −25 — HudProgressBar primitive + MES swap)
- `src/features/trades/__tests__/DashboardKPIsGrid.test.tsx` (NEW, +195)
- `src/features/trades/formatHour.ts` (NEW, +21)
- `src/features/trades/__tests__/formatHour.test.ts` (NEW, +17)
- `src/pages/portal/DashboardPage.tsx` (+1 / −1 — H1 size class swap)
- `src/pages/portal/__tests__/DashboardPage.test.tsx` (+22 / 0 — T-043 H1 assertion)
- **Total: +1243 / −82 = +1161 net LOC** across 18 files (10 prod files + 5 new test files + 3 modified tests).

**LOC budget deviation — `size:exception` recommendation**
- Design forecast: Slice B = ~232 LOC active.
- Actual: +1243 / −82 = **+1161 net LOC**, of which ~421 production and ~740 test code.
- Reason: same as Slice A — strict TDD with RED → GREEN → TRIANGULATE per task multiplied the test surface (boundary cases: empty data, 100% cap, timezone-stable timestamps, marker plugin lifecycle, regression guards on preserved contracts). Production grew at design rate; tests grew 2x production because every contract gets pinned from 3 angles (happy / edge / regression).
- **Recommendation**: keep Slice B as a single PR at +1161 net LOC; flag `size:exception` at PR-open time. The 8 commits are independently revertible (each commit ≤ 500 LOC, all single-purpose). The chart tests alone account for +342 LOC (T-045) — without those, the slice would land at +819 net.
- Alternative (not recommended): split into chained PRs (sessions/balance+H1 at ~300 LOC, MES at ~200 LOC, charts at ~660 LOC) — but the chart tests are inherently coupled to the badge contract, so splitting would duplicate fixtures.

**Risks encountered (mitigated)**
- `useSessionStats` mock had to wrap the FULL `ReturnType` (not just the consumed fields) because the production code reads `data?.sessions` and `data?.general` separately. Without `isError: false` + `error: null` on the mock, TypeScript refused to accept the cast. Mitigation: typed the mock as `unknown as ReturnType<...>`.
- `eslint react-refresh/only-export-components` fired when exporting `formatHour` alongside `RecentActivityFeed`. Mitigation: extracted `formatHour` to `src/features/trades/formatHour.ts` — now both files only export components / utilities respectively.
- Tokenised `className.split(/\s+/)` for the H1 size test — naive `className.includes('text-3xl')` would also match `md:text-3xl`. Same trick used in the Slice A CTA regression guard.
- `lightweight-charts` v5 `createSeriesMarkers` had to be MOCKED in the PerformanceCurveChart test (no real canvas in jsdom). The test stubs `createChart` to return a no-op API surface and stubs `createSeriesMarkers` to capture `setMarkers` calls. The contract assertion reads the captured calls directly so no canvas paint is required.
- `intl DateTimeFormat` hour/minute rendering is timezone-dependent. The test asserts only the `HH:MM hrs` SHAPE, not the absolute hour — robust to UTC vs America/Argentina/Buenos_Aires drift.
- 95% cap on the HudProgressBar fill is intentional. A `width: 100%` bar would read as "the entire track is the fill" — no visual cue that the value is at the ceiling. The sliver of remaining track tells the user "I'm at the max, not over it".
- The `ChartLastPointBadge` was originally extracted as a shared primitive — abandoned because both charts (Performance + Capital) have different "first/last" semantics (P&L vs balance) and a shared primitive would force a callback prop, increasing the call-site noise.

**Out-of-scope actions taken** (none)
- No token change in `src/styles/themes.css` (cyan ladder frozen).
- No `data-testid` removed — every consumer testid (`session-tile-{band}`, `summary-sparkline`, `summary-balance`, `summary-operations`, `summary-pnl`, `summary-winrate`, `dash-performance-curve`, `dash-capital-curve`, `dash-performance-lastpoint`, `dash-capital-lastpoint`, `dash-recent-activity-row-{id}`, `dash-recent-close-{id}`, `dash-recent-activity-hour`, `dash-recent-activity-pair-chip`, `hud-progress-bar-{label}`, `dash-kpis-section`, `dash-new-trade`, `dash-decor-layer`) preserved.
- No backend touched.
- No archived change touched (`core-interface-redesign`, `design-system-v1`, `sessions-configurable-cap`).
- No chart library swap (lightweight-charts v5 stays; `createSeriesMarkers` is its public API).
- No Slice A file touched except `DashboardPage.tsx` (single-line H1 size swap, in scope for T-043).

**Review risk**
- LOW per commit (8 atomic work units, each < 500 LOC).
- MEDIUM at PR level (~1161 net LOC vs 400 budget) — flagged for `size:exception`. The reviewer's cognitive load is bounded by the commit-level scope; reading commits in order (sessions → general ring → MES → sparkline → H1 → theme → chart badges/markers → activity feed) tells a coherent story.
- Visual review recommended at PR-open time: spin up `pnpm dev`, navigate to `/portal/dashboard`, confirm the JARVIS dashboard reads as one cohesive surface (rings on every session tile, double-ring GENERAL, MES as 2 stat + 3 progress bars, sparkline in the Operaciones body, bigger H1, chart badges top-right, deposit/withdraw triangles on the Performance curve, "HH:MM hrs" + cyan chip on every Recent Activity row). If the markers feel noisy on the Performance curve, drop the `text: $X` label from `SeriesMarker.text`. If the badge text wraps, bump the badge `px-2` to `px-3`.

**Combined Slice A + Slice B summary**
- 17 task commits + 1 fixup = 18 commits.
- Net LOC: +501 (Slice A) + +1161 (Slice B) = **+1662 net** across 25 files (12 prod + 6 new test + 7 modified test).
- Test count: 836 → 867 (+31 new from Slice B).
- All gates green at every slice boundary.
