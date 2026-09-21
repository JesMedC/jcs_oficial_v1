# Apply Progress: dashboard-jarvis-fidelity

**Change**: `dashboard-jarvis-fidelity`
**Phase**: sdd-apply (Slice A complete)
**Started**: 2026-09-17

## Status

- **Slice A** (chrome + decor defaults): ✅ Complete — 9/9 tasks (`8748b8e` ... `fe3d250`)
- **Slice B** (sessions ring + right-rail MES + chart markers): ⏳ Pending (`T-039..T-047`)

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

⏳ Pending (will land after user review of Slice A visuals).
