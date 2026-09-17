# Tasks: core-interface-redesign

**Change**: `core-interface-redesign`
**Reads**: `proposal.md` + `specs/*/spec.md` + `design.md`
**Status**: tasks draft
**Strict TDD**: enabled — RED → GREEN → TRIANGULATE → REFACTOR per task

## Task ID convention

Continuing from `sessions-configurable-cap` (T-001..T-023) and `design-system-v1` (T6.1, T6.2, T6.3, T6.4). New tasks for `core-interface-redesign` use **T-024+**.

## Slice 1 — Token pivot

### T-024 — Cyan ladder in `src/styles/themes.css` [RED → GREEN → TRIANGULATE → REFACTOR]
- **RED**: write `src/styles/__tests__/themes.test.ts` asserting that `--color-jade` equals `#00D4D8` in dark mode and the light-mode variant resolves.
- **GREEN**: update `themes.css` with the cyan ladder.
- **TRIANGULATE**: add assertions for `--color-jade-dk`, `--color-jade-light`, `--color-jade-glow`, profit, loss, info, warning.
- **REFACTOR**: ensure consistent ordering + comments referencing `core-interface-tokens` REQ-CIT-001.
- **LOC est.**: ~30
- **Acceptance**: `pnpm test` green; light-mode contrast pre-check passes (manual).

### T-025 — Glow + glass alpha retune in `tailwind.config.ts` [RED → GREEN → TRIANGULATE → REFACTOR]
- **RED**: extend `src/test/tailwind.config.test.ts` to assert `glow-jade` alpha is `0.25`, `glow-jade-sm` is `0.16`, and `glow-cyan` is defined as alias.
- **GREEN**: update `tailwind.config.ts` glow + glass alphas.
- **TRIANGULATE**: assert `glass.DEFAULT` is `0.08`, `glass.strong` is `0.13`, `glass.border.DEFAULT` is `0.12`.
- **REFACTOR**: consolidate comments referencing `core-interface-tokens` REQ-CIT-003 + REQ-CIT-004.
- **LOC est.**: ~25
- **Acceptance**: `pnpm test` green; `pnpm build` succeeds.

## Slice 2 — Dashboard density

### T-026 — `SessionWinrateCard` component [RED → GREEN → TRIANGULATE → REFACTOR]
- **RED**: write `src/components/dashboard/__tests__/SessionWinrateCard.test.tsx` asserting: (a) progress ring renders at correct percentage, (b) tone class maps winrate → tone, (c) sub-label fallback when closed count is 0.
- **GREEN**: implement `SessionWinrateCard.tsx` with `<HudRing>` primitive + tone classes.
- **TRIANGULATE**: add tests for zero trades, mix wins/losses, all wins, all losses.
- **REFACTOR**: extract shared progress-ring rendering if `<HudRing>` proves clunky.
- **LOC est.**: ~80
- **Acceptance**: `pnpm test` green; `pnpm lint` clean.

### T-027 — `KPIStrip` component (with sparklines) [RED → GREEN → TRIANGULATE → REFACTOR]
- **RED**: write `src/components/dashboard/__tests__/KPIStrip.test.tsx` asserting: (a) 4 cards render in order, (b) sparkline present on OPERACIONES card, (c) tone classes match `dashboard-density` REQ-DD-002.
- **GREEN**: implement `KPIStrip.tsx` using the existing `DashboardSummaryStrip` patterns + sparkline SVG.
- **TRIANGULATE**: tests for zero balance, positive/negative P&L, winrate edge cases.
- **REFACTOR**: extract sparkline primitive if the inline SVG duplicates across cards.
- **LOC est.**: ~70
- **Acceptance**: `pnpm test` green; `DashboardSummaryStrip` test still green (legacy marker added).

### T-028 — `RecentOpsRail` component [RED → GREEN → TRIANGULATE → REFACTOR]
- **RED**: write `src/components/dashboard/__tests__/RecentOpsRail.test.tsx` asserting: (a) 5 rows render from the trades list, (b) profit/loss tone maps correctly, (c) side tag renders `CALL` / `PUT`.
- **GREEN**: implement `RecentOpsRail.tsx` using `<TradeRow>` (existing primitive) + tone classes.
- **TRIANGULATE**: empty list, 1 trade, 10 trades (cap at 5), mixed sides.
- **REFACTOR**: ensure component is reusable outside the dashboard for future reuse.
- **LOC est.**: ~50
- **Acceptance**: `pnpm test` green.

### T-029 — `DashboardPage` layout restructure [RED → GREEN → TRIANGULATE → REFACTOR]
- **RED**: update `src/pages/portal/__tests__/DashboardPage.test.tsx` to assert the new layout: session cards row → KPI strip → recent ops rail → dual charts → decor.
- **GREEN**: restructure `DashboardPage.tsx` per `dashboard-density` REQ-DD-001..REQ-DD-005.
- **TRIANGULATE**: add responsive collapse tests at `md`, `lg`, `xl` viewports (Playwright e2e if not yet covered).
- **REFACTOR**: extract layout primitives if pattern repeats.
- **LOC est.**: ~50
- **Acceptance**: `pnpm test` green; `pnpm build` succeeds; manual visual review.

### T-030 — Decor mount on DashboardPage [GREEN]
- Mount `<DotGrid>` + `<NeuralNetwork>` per REQ-DD-007 + REQ-DEC-006.
- No RED step — decor is chrome, no behavior change. Add a `data-testid` for e2e visibility if useful.
- **LOC est.**: ~10
- **Acceptance**: `pnpm test` green; visual review confirms opacity caps.

## Slice 3 — Shell chrome

### T-031 — Sidebar widening [GREEN]
- `PortalSidebar.tsx`: `w-64` → `w-72` per REQ-PS-010.
- Adjust `SidebarHeader.tsx` + `SidebarFooter.tsx` for new width.
- `md` viewport collapse to `w-16` icon rail (existing pattern).
- No new tests — class swap.
- **LOC est.**: ~10
- **Acceptance**: `pnpm test` green; visual review at `lg+` and `md`.

### T-032 — Active-state cyan glow [RED → GREEN → TRIANGULATE → REFACTOR]
- **RED**: update `src/components/portal/__tests__/SidebarNav.test.tsx` to assert the active item has the cyan left border + glow.
- **GREEN**: update `SidebarNav.tsx` active-state per REQ-PS-011.
- **TRIANGULATE**: tests for cyan glow presence vs absence on inactive items.
- **REFACTOR**: extract active-state class string for reuse.
- **LOC est.**: ~20
- **Acceptance**: `pnpm test` green; visual review confirms glow is visible but not blooming.

### T-033 — Topbar language + account-scope selector [RED → GREEN → TRIANGULATE → REFACTOR]
- **RED**: update `src/components/common/__tests__/TopNav.test.tsx` to assert the mount order per REQ-TB-005.
- **GREEN**: update `TopNav.tsx` mount order.
- **TRIANGULATE**: tests for language toggle, account-scope selection.
- **REFACTOR**: ensure selector components are reusable.
- **LOC est.**: ~50
- **Acceptance**: `pnpm test` green; visual review confirms mount order.

### T-034 — Topbar `+Nuevo Trade` CTA [RED → GREEN → TRIANGULATE → REFACTOR]
- **RED**: update `TopNav.test.tsx` to assert the CTA opens the trade drawer (with and without Scanner prefill).
- **GREEN**: implement CTA per REQ-PS-013 + REQ-TB-005.
- **TRIANGULATE**: tests for empty drawer vs prefilled drawer.
- **REFACTOR**: ensure prefill wire is reusable outside Topbar (Scanner).
- **LOC est.**: ~30
- **Acceptance**: `pnpm test` green; manual click test confirms drawer opens.

### T-035 — (OPTIONAL) `useCoreInterfacePrefs` store [RED → GREEN → TRIANGULATE → REFACTOR]
- **RED**: write `src/stores/__tests__/useCoreInterfacePrefs.test.ts` asserting default value, persistence, setter.
- **GREEN**: implement store per REQ-CIP-001 + REQ-CIP-003.
- **TRIANGULATE**: tests for SSR safety, hydration, concurrent updates.
- **REFACTOR**: extract localStorage adapter for testability.
- **LOC est.**: ~50
- **Acceptance**: `pnpm test` green; manual reload test confirms persistence.
- **NOTE**: If Slice 2 doesn't adopt `core-interface-prefs`, drop T-035 entirely.

## Slice 4 — Per-page migration (5 chained PRs, one per page)

### T-036 — CuentasPage chrome migration [RED → GREEN → TRIANGULATE → REFACTOR]
- **RED**: update `src/pages/portal/__tests__/CuentasPage.test.tsx` to assert section headers, card backgrounds, button variants per `portal-shell` + `dashboard-density` patterns.
- **GREEN**: apply chrome changes to `CuentasPage.tsx`.
- **TRIANGULATE**: tests for at least 3 chrome element types.
- **REFACTOR**: extract `<CoreInterfaceChrome>` if duplication > 3 pages.
- **LOC est.**: ~80
- **Acceptance**: `pnpm test` green; `pnpm build` succeeds; visual review.

### T-037 — CuentasDetailPage chrome migration
- Same shape as T-036. ~70 LOC.
- **Acceptance**: tests green; visual review.

### T-038 — DiarioPage chrome migration
- Same shape. ~80 LOC.
- **Acceptance**: tests green; visual review.

### T-039 — OperacionesPage chrome migration
- Same shape. ~80 LOC.
- **Acceptance**: tests green; visual review.

### T-040 — PlaybookPage chrome migration
- Same shape. ~70 LOC.
- **Acceptance**: tests green; visual review.

### T-041 — (Conditional) ConfiguracionPage chrome migration
- Same shape. ~70 LOC. Skipped if the page already meets the chrome (verify in T-031 first).
- **Acceptance**: tests green; visual review.

## Slice 5 — Drift guard + light-mode audit

### T-042 — ESLint rule `no-cyaan-literals` [RED → GREEN → TRIANGULATE → REFACTOR]
- **RED**: write `eslint.config.js` test or `eslint-plugin-jcs/no-cyaan-literals.test.mjs` asserting rule fires on inline cyan hex + rgba.
- **GREEN**: implement the rule per REQ-SE-005.
- **TRIANGULATE**: tests for allow-list paths (no false positives).
- **REFACTOR**: extract rule config to a shared module.
- **LOC est.**: ~80
- **Acceptance**: rule fires on synthetic violation; no false positives on `tailwind.config.ts` + allow-list.

### T-043 — CI grep guard `scripts/verify-cyan-drift.sh` [GREEN]
- Implement bash script per REQ-SE-006.
- No RED step — script is shell, not unit-tested.
- **LOC est.**: ~20
- **Acceptance**: script exits 0 on current `main`; exits 1 on synthetic violation.

### T-044 — `docs/design-system.md` [GREEN]
- Author the doc per REQ-SE-007.
- Cite `core-interface-tokens` REQ-CIT-001..REQ-CIT-007.
- Cross-link to `design-system-v1` archive report for the jade-to-cyan decision history.
- **LOC est.**: ~80
- **Acceptance**: doc exists; covers cyan decision + guard + extension path.

### T-045 — Light-mode contrast audit [MANUAL]
- Run contrast check on every consumer that uses `--color-jade` on `--color-bg` (light).
- Use WebAIM Contrast Checker or equivalent.
- Record results in `verify-report.md` (REQ-SE-005 + REQ-CIT-001 light variant).
- **LOC est.**: ~30 (verify-report entries).
- **Acceptance**: every consumer ≥ WCAG AA body-text contrast.

### T-046 — CI integration [GREEN]
- Add `pnpm lint:design` script in `package.json`.
- Wire `lint:design` + `verify-cyan-drift.sh` into CI pipeline (`.github/workflows/ci.yml` or equivalent).
- **LOC est.**: ~20
- **Acceptance**: CI runs both; both exit 0 on `main`.

## Task rollup

| Slice | Task IDs | LOC est. total |
|---|---|---|
| S1 | T-024..T-025 | ~55 |
| S2 | T-026..T-030 | ~260 |
| S3 | T-031..T-035 | ~110 (T-035 optional) |
| S4 | T-036..T-041 | ~370 (5-6 PRs, each ≤ 80) |
| S5 | T-042..T-046 | ~230 |
| **Total** | **23 tasks** | **~1025** |

## Review Workload Forecast (REQUIRED by sdd-tasks)

```
Review Workload Forecast:
- Total tasks: 23 (T-024..T-046)
- Total LOC est.: ~1025 (across 9-10 PRs)
- Slices S1, S2, S3, S5: single PR each (≤ 260 LOC)
- Slice S4: chained PRs (5-6 PRs, each ≤ 80 LOC)
- 400-line budget risk: LOW per PR (chain_strategy handles S4)
- Chained PRs recommended: YES for Slice S4
- Decision needed before apply: NO (delivery_strategy: auto-chain, chain_strategy: stacked-to-main)
```

## Acceptance gates

Each task requires:
- `pnpm test` green (test count grows or stays equal).
- `pnpm typecheck` pass.
- `pnpm lint` pass (allow-list updated if needed for new hex literals).
- `pnpm build` succeed.
- Coverage thresholds (80/75/80/80) maintained.

Each slice requires:
- All tasks complete.
- Slice-level visual review (manual, screenshot to `openspec/changes/core-interface-redesign/apply-progress.md`).
- `apply-progress.md` updated with slice evidence.

## Next Step

`sdd-apply` — for each task T-024..T-046, follow strict TDD (RED → GREEN → TRIANGULATE → REFACTOR), commit with conventional message + NO `Co-Authored-By` trailer + NO emojis. Slice-by-slice delivery with `apply-progress.md` evidence at each slice boundary.
