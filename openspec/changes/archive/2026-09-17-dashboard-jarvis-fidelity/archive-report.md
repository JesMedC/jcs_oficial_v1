# Archive Report: dashboard-jarvis-fidelity

**Change**: `dashboard-jarvis-fidelity` (JARVIS-style HUD visual polish)
**Archived**: 2026-09-17
**Archive location**: `openspec/changes/archive/2026-09-17-dashboard-jarvis-fidelity/`
**Verifier verdict**: PASS WITH WARNINGS (867/867 tests + 32 todo; 0 CRITICAL / 1 WARNING / 2 SUGGESTIONS)
**Outcome**: success

## Summary

The `dashboard-jarvis-fidelity` change is closed and archived. All 18 active implementation tasks (`T-030..T-047`) are committed, all 19 spec requirements (`REQ-DHF-001..006` + `REQ-CWM-001..006` + `REQ-DCF-001..007`) have matching implementation + covering tests, and the 4 verification gates (`pnpm test` / `typecheck` / `lint` / `build`) are green. The dashboard now reads as the inspiration-aligned JARVIS-style HUD: sidebar glass surface, visible brand row with cyan textShadow, 3-corner `<CoreInterfaceWatermark>` chrome, outlined `+ Nuevo trade` and `Cerrar sesión` pills, decor primitives painted from a cyan CSS var, sessions rendered as `<HudRing>` tiles (GENERAL with double-ring + `md:col-span-2`), MES row as 2 stat + 3 progress bars, sparkline moved into the summary card body, H1 lifted to `text-3xl md:text-4xl`, balance tone confirmed (`>0` → profit / `=0` → muted), chart `CURVE_THEME` reading from CSS vars, last-point badges on both curves, deposit/withdraw triangular markers via `createSeriesMarkers`, and `RecentActivityFeed` rendering `HH:MM hrs` timestamps with a cyan circular pair chip.

| Metric | Value |
|---|---|
| Specs synced to `openspec/specs/` | **3 NEW** (`dashboard-hud-fidelity`, `chrome-watermarks`, `decor-and-charts-fidelity`) |
| Spec REQs covered | **19 / 19** |
| Implementation tasks complete | **18 / 18 active** (T-030..T-047); T-048 + T-049 are RESERVED slots intentionally unchecked (default action: skipped) |
| Gap-matrix items addressed | **19 / 19 enumerated** (proposal header counts "20" — see WARNING below) |
| Net tests added | **+72** (795 baseline → 867 passed + 32 todo) |
| Files changed | **32** (+2581 / −74 across Slice A + Slice B) |
| Slice commits | **20** (Slice A: 10 incl. fixup + Slice B evidence; Slice B: 10 incl. evidence) |
| `pnpm typecheck` | clean |
| `pnpm lint` | clean (`--max-warnings 0`) |
| `pnpm build` | succeed (~2.47s, no new chunks) |
| Non-goal violations | 0 (themes.css frozen, no `data-testid` removed, no backend touched, no `Co-Authored-By` trailers) |
| Archive folder | `openspec/changes/archive/2026-09-17-dashboard-jarvis-fidelity/` |

## Specs promoted to `openspec/specs/`

The change spec folder was promoted 1:1 into the global spec library at change close. All copies are byte-identical (verified by `diff -r` returning empty in both the per-spec copy step and the final cross-check below).

| Spec | Action | Method |
|------|--------|--------|
| `dashboard-hud-fidelity` | NEW (created) | mechanical `cp` from `openspec/changes/dashboard-jarvis-fidelity/specs/dashboard-hud-fidelity/spec.md` (5401 bytes) |
| `chrome-watermarks` | NEW (created) | mechanical `cp` from `openspec/changes/dashboard-jarvis-fidelity/specs/chrome-watermarks/spec.md` (5248 bytes) |
| `decor-and-charts-fidelity` | NEW (created) | mechanical `cp` from `openspec/changes/dashboard-jarvis-fidelity/specs/decor-and-charts-fidelity/spec.md` (7009 bytes) |

No existing spec was modified — this change introduced no delta edits to `color-system`, `glass-drawer`, `portal-shell`, `topbar`, or any other prior spec.

## Verification outcome

`PASS WITH WARNINGS` per `verify-report.md` (HEAD `bd4d698`).

- **0 CRITICAL** — all spec scenarios have a passing covering test; all implementation files are present; the 4 verification gates are green.
- **1 WARNING** — `proposal.md:11` claims "20 fidelity gaps" but only enumerates 19 items (6 + 6 + 7). The spec files carry 19 REQ IDs matching the enumeration; the "20" is a header miscount. **No fix required before archive** — the proposal body, specs, design, tasks, and verify-report are all mutually consistent at 19.
- **2 SUGGESTIONS (out of scope)** —
  - residual `#00FF9D` / `#00E676` / `#00B8FF` jade hex literals in `AccountSelector.tsx`, `WinrateBySessionCard.tsx`, `RecentActivityFeed.tsx`, `PerformanceCurveChart.tsx`, `CapitalCurveChart.tsx`, plus broader use in `MarketDistribution.tsx`, `PnLPanel.tsx`, `WinRateGauge.tsx`, `ProfitFactorDisplay.tsx`, `DisciplineScore.tsx`, `Sparkline.tsx`, `TopPairsList.tsx`, `CashflowPanel.tsx`, `PnLHeatmap.tsx`, `NeuralMesh.tsx`, `CyberGlobe.tsx`, `BullBearMesh.tsx`. `git diff 92abe56..e96d229 -- src/components/dashboard/AccountSelector.tsx` confirms these are **pre-existing** — outside the proposal's scoped drift gap (`NeuralNetwork.tsx:94` + `DotGrid.tsx:73` only).
  - JSDoc comments in `DotGrid.tsx` and `NeuralNetwork.tsx` still reference `#00FF9D` historically; the actual `DEFAULT_COLOR` constants are correctly swapped. Comments don't pollute runtime; the regression guards in `__tests__/` verify the rendered output is hex-free.

## Slices delivered

### Slice A — High-severity chrome + decor defaults (~94 LOC production)

`T-030..T-038` (9 task commits + 1 fixup + 1 evidence commit = 11 commits):

- `T-030` Sidebar glass surface (`PortalSidebar.tsx`)
- `T-031` Sidebar brand row visibility (`SidebarHeader.tsx`)
- `T-032` + `T-033` New `<CoreInterfaceWatermark>` chrome component (3 absolute corners, 10% opacity, `pointer-events-none aria-hidden`)
- `T-034` `+ Nuevo trade` outlined CTA (`DashboardPage.tsx`)
- `T-035` `Cerrar sesión` outlined button (`SidebarFooter.tsx`)
- `T-036` `AccountSelector` trailing caption drop
- `T-037` Decor primitives (`NeuralNetwork.tsx` + `DotGrid.tsx`) → `DEFAULT_COLOR = 'var(--color-jade)'`
- `T-038` Dashboard `<DotGrid spacing={20} opacity={0.05} />`

### Slice B — Dashboard primitives + chart fidelity (~421 LOC production)

`T-039..T-047` (9 task commits + 2 evidence commits = 11 commits):

- `T-039` + `T-040` Sessions ring (`<HudRing size="sm">`) + GENERAL double-ring + `md:col-span-2`
- `T-041` MES row = 2 stat cards (`Risk/Reward`, `P&L Acumulado`) + 3 `<HudProgressBar>` rows (`Win Rate Mensual`, `R/R exposure`, `Mejor trade`)
- `T-042` Sparkline reposition (out of `rightAdornment` slot, into card body)
- `T-043` H1 greeting `text-3xl md:text-4xl` + balance tone confirmation
- `T-044` `CURVE_THEME` hex → CSS vars (`var(--color-jade-profit)`, `var(--color-jade-info)`, cyan rgba)
- `T-045` Last-point tooltip badges on `PerformanceCurveChart` + `CapitalCurveChart`
- `T-046` Deposit/withdraw markers via `createSeriesMarkers` (cached `markersPluginRef`; `setMarkers` only when `points.length` changes)
- `T-047` `RecentActivityFeed` `formatHour` helper (`Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })`) + cyan circular pair chip

## Mechanical-copy integrity (proof of byte-identical operations)

```
# Step 2 — spec sync (NEW specs, mechanical cp)
diff -r openspec/changes/dashboard-jarvis-fidelity/specs/dashboard-hud-fidelity/spec.md \
        openspec/specs/dashboard-hud-fidelity/spec.md
# output: (empty) → BYTE-IDENTICAL

diff -r openspec/changes/dashboard-jarvis-fidelity/specs/chrome-watermarks/spec.md \
        openspec/specs/chrome-watermarks/spec.md
# output: (empty) → BYTE-IDENTICAL

diff -r openspec/changes/dashboard-jarvis-fidelity/specs/decor-and-charts-fidelity/spec.md \
        openspec/specs/decor-and-charts-fidelity/spec.md
# output: (empty) → BYTE-IDENTICAL

# Step 3 — archive move (git mv with plain mv fallback for untracked files)
diff -r <snapshot_root>/openspec/changes/dashboard-jarvis-fidelity \
        openspec/changes/archive/2026-09-17-dashboard-jarvis-fidelity
# output: (empty) → ARCHIVE MOVE BYTE-IDENTICAL
```

The `archive-report.md` is excluded from the destination-vs-source comparison because it did not exist in the source snapshot — it was written into the change folder after the snapshot was taken, per the archive workflow's additive-only convention.

## Final-state facts (outranking any stale apply-progress snapshot)

The implementation is complete and matches the verify report. No follow-up commits are pending inside this change's scope. The 20 slice commits (`8748b8e`..`bd4d698`) plus this archive commit are the canonical audit trail.

### Slice A commits

| SHA | Subject |
|-----|---------|
| `8748b8e` | `feat(dashboard-jarvis-fidelity): T-030 sidebar glass surface` |
| `f8c5157` | `feat(dashboard-jarvis-fidelity): T-031 sidebar brand row visibility` |
| `acf9acd` | `feat(dashboard-jarvis-fidelity): T-032 CoreInterfaceWatermark chrome component` |
| `c8031b7` | `feat(dashboard-jarvis-fidelity): T-033 mount CoreInterfaceWatermark in dashboard chrome` |
| `41884f1` | `feat(dashboard-jarvis-fidelity): T-034 outlined + Nuevo trade CTA` |
| `be79cdc` | `test(dashboard-jarvis-fidelity): T-035 logout pill regression guard` |
| `e6788f5` | `feat(dashboard-jarvis-fidelity): T-036 drop AccountSelector trailing caption` |
| `f7cfd86` | `feat(dashboard-jarvis-fidelity): T-037 decor primitives default to cyan CSS var` |
| `25012cd` | `feat(dashboard-jarvis-fidelity): T-038 dashboard DotGrid density override` |
| `fe3d250` | `fix(dashboard-jarvis-fidelity): typecheck + lint cleanups after Slice A` |
| `e01694c` | `docs(dashboard-jarvis-fidelity): slice A apply-progress evidence + tasks marked [x]` |

### Slice B commits

| SHA | Subject |
|-----|---------|
| `4271337` | `feat(dashboard-jarvis-fidelity): T-039 HudRing on sessions` |
| `24b0fef` | `feat(dashboard-jarvis-fidelity): T-040 GENERAL tile double-ring + col-span-2` |
| `06edd59` | `feat(dashboard-jarvis-fidelity): T-041 MES row progress bars` |
| `4635325` | `feat(dashboard-jarvis-fidelity): T-042 sparkline reposition + T-043 balance tone` |
| `6ef1597` | `feat(dashboard-jarvis-fidelity): T-043 H1 greeting size bump` |
| `148d4d5` | `feat(dashboard-jarvis-fidelity): T-044 CURVE_THEME hex to CSS vars` |
| `7000d4b` | `feat(dashboard-jarvis-fidelity): T-045 chart badges + T-046 deposit markers` |
| `61a5ee1` | `feat(dashboard-jarvis-fidelity): T-047 RecentActivityFeed timestamp + pair chip` |
| `e96d229` | `docs(dashboard-jarvis-fidelity): slice B apply-progress evidence + tasks marked [x]` |
| `bd4d698` | `docs(dashboard-jarvis-fidelity): verify-report PASS WITH WARNINGS` |

### Implementation summary (32 files, +2581 / −74 LOC)

**Production** — `PortalSidebar.tsx`, `SidebarHeader.tsx`, `SidebarFooter.tsx`, new `CoreInterfaceWatermark.tsx`, `AccountSelector.tsx`, `NeuralNetwork.tsx`, `DotGrid.tsx`, `DashboardPage.tsx`, `WinrateBySessionCard.tsx`, `DashboardKPIsGrid.tsx` (+ inline `HudProgressBar`), `DashboardSummaryStrip.tsx`, `PerformanceCurveChart.tsx`, `CapitalCurveChart.tsx`, `RecentActivityFeed.tsx`, new `formatHour.ts`, `curveChartTheme.ts`.

**Tests** — `PortalShell.test.tsx` (extended), new `CoreInterfaceWatermark.test.tsx`, `AccountSelector.test.tsx` (new), `NeuralNetwork.test.tsx` (extended), `DotGrid.test.tsx` (extended), `DashboardPage.test.tsx` (extended), `WinrateBySessionCard.test.tsx` (extended), new `DashboardKPIsGrid.test.tsx`, `DashboardSummaryStrip.test.tsx` (extended), new `curveChartTheme.test.ts`, `PerformanceCurveChart.test.tsx` (extended), `CapitalCurveChart.test.tsx` (extended), `RecentActivityFeed.test.tsx` (extended), new `formatHour.test.ts`.

## Branch / commit state

- **Branch**: `feat/dashboard-jarvis-fidelity-slice-b`
- **Base (pre-change)**: `92abe56` (`feat(trades): expose Commodities under FOREX-style pricing`)
- **HEAD at archive time**: this archive commit
- **Commits added by this change (cumulative)**: 22 (20 slice commits + Slice A fixup + this archive commit; T-043 H1 + T-043 balance tone paired, T-045 + T-046 paired in single commits, T-035 paired with regression test in single commit — `apply-progress.md` line 27–75 enumerates the actual commit count per slice)

## Lock context (reused from prior changes, NOT modified here)

- **Cyan token ladder** (`core-interface-redesign` Slice 1): `--color-jade: #00D4D8`, `--color-jade-profit`, `--color-jade-info`, `--color-jade-loss`, `--color-jade-border`, `--color-jade-border-line`, `--glass-border`. All 5 chrome + decor defaults in this change resolve through these vars.
- **`<HudRing>` primitive** (`core-interface-redesign` Wave 6 retro): reused in `WinrateBySessionCard` (sessions + GENERAL double-ring) and as the visual model for `HudProgressBar` tracks.
- **Decor primitives** (`design-system-v1` Wave 6): `DotGrid`, `NeuralNetwork`, `Scanline`, `HudRing`, `Sparkline`, `HudProgressBar` (new inline this change) — no new decor primitives introduced.

## Task Completion Gate

All 18 active tasks (`T-030..T-047`) are marked `[x]` in `tasks.md`. The 2 RESERVED slots (`T-048`, `T-049`) are intentionally unchecked per `tasks.md:170-176` ("Default action if unused: skipped"); they were not used during apply. No stale-checkbox reconciliation was required — `apply-progress.md` Slice A and Slice B sections plus `verify-report.md` all confirm completion of every active task before this archive phase ran.

## Follow-ups (for future changes, NOT this one's responsibility)

1. **`DASHBOARD-DRIFT-CLEANUP`** — residual jade hex literals in dashboard chrome primitives (`AccountSelector`, `WinrateBySessionCard`, `RecentActivityFeed`, `PerformanceCurveChart`, `CapitalCurveChart`, `MarketDistribution`, `PnLPanel`, `WinRateGauge`, `ProfitFactorDisplay`, `DisciplineScore`, `Sparkline`, `TopPairsList`, `CashflowPanel`, `PnLHeatmap`, `NeuralMesh`, `CyberGlobe`, `BullBearMesh`) and JSDoc comments in `DotGrid.tsx` + `NeuralNetwork.tsx`. Out of scope for this change (proposal §Out-of-scope: "No new tokens; no themes.css cyan-ladder edits"); the proposal's drift gap was scoped to `NeuralNetwork.tsx:94` + `DotGrid.tsx:73` only (REQ-DCF-001). This is **change 2 of 2** in the verify report's two SUGGESTIONS.
2. **`core-interface-redesign` Slice 5 (drift guard + light audit)** — independent change, can be picked up separately. Out of scope here; the proposal explicitly excludes ESLint `no-jade-literals` rules and Stylelint enforcement.
3. **`pages-drift.test.ts` refactor** — pre-existing flake on TZ-bucket scenario assertion, unrelated to this change (see `design-system-v1` archive's pre-existing failures list).
4. **Proposal header count drift** (the 1 WARNING) — cosmetic; `proposal.md:11` claims "20 fidelity gaps" but enumerates 19 (6 + 6 + 7). Can be fixed in a follow-up `proposal.md` revision if the maintainer prefers numeric consistency; does not affect the audit trail.

## Archive complete

The change is archived. New work starts fresh.
