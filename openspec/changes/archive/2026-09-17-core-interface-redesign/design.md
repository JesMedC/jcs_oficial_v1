# Design: core-interface-redesign

**Change**: `core-interface-redesign`
**Reads**: `proposal.md` + `specs/*/spec.md`
**Status**: design draft

## Technical approach

The cyan pivot is **mechanically simple** thanks to Wave 5 of `design-system-v1` (commit `676b834`), which moved all brand tokens to CSS vars in `src/styles/themes.css`. The primary color swap is a one-file edit. The non-trivial work is in three places:

1. **Glow + glass alpha retune** for cyan perceptual brightness (cyan reads brighter than jade at equal alpha; tightening prevents halo blowout).
2. **Dashboard density polish** — the dashboard skeleton was already restructured in commit `8a3de35`; this change adds the session winrate cards row, the recent-ops rail, and dual cyan curve chart theming.
3. **Shell widening + Topbar CTA** — sidebar `w-64 → w-72`, active-state cyan glow, Topbar language + account-scope selector + `+Nuevo Trade` CTA.

The per-page migration (Cuentas, Diario, Operaciones, Playbook, Configuración) is **chained** so each page is its own PR ≤ 80 LOC. The drift guard (ESLint rule + CI grep + `docs/design-system.md`) lands in Slice 5 BEFORE any Slice 4 per-page PR merges to `main`.

## Slice decomposition (binding)

| Slice | Title | Files | LOC est. | Risk | PR type |
|---|---|---|---|---|---|
| **S1** | Token pivot | `src/styles/themes.css`, `tailwind.config.ts` | ~80 | Low | single |
| **S2** | Dashboard density | `DashboardPage.tsx` + 3 new sub-components + `__tests__` | ~250 | Medium | single |
| **S3** | Shell chrome | `PortalSidebar*`, `SidebarNav`, `TopNav` | ~200 | Medium | single |
| **S4** | Per-page migration | 5 pages × ~80 LOC + tests | ~400 total | High | chained (5 PRs) |
| **S5** | Drift guard + light-mode audit | `eslint.config.js`, `scripts/verify-cyan-drift.sh`, `docs/design-system.md`, `verify-report.md` | ~150 | Low | single |

Slice ordering is intentional: token pivot first so every later slice lands on the right palette; dashboard density second so the highest-visibility page is polished first; shell third so all pages inherit the new chrome; per-page fourth; guard + audit fifth.

## Slice 1 — Token pivot

### Edit surface
- `src/styles/themes.css` — cyan hex literals in dark + light `--color-jade*` vars
- `tailwind.config.ts` — `glow-jade`, `glow-jade-sm`, new `glow-cyan` alias; `glass.*` alphas

### Approach
Replace hex values in `themes.css` per `core-interface-tokens` REQ-CIT-001 + REQ-CIT-002. Update `tailwind.config.ts` glow alphas (0.30 → 0.25, 0.20 → 0.16). Add `glow-cyan` utility as alias of `glow-jade`. Retune `glass.*` alphas (0.06/0.10/0.16 → 0.05/0.08/0.13).

### Tests
- `pnpm test` — must stay 801/801.
- `pnpm typecheck` — must pass.
- `pnpm lint` — must pass (allow-list updated if needed for any new hex literals).
- `pnpm build` — must succeed.

### Rollback
`git revert <sha>`. Two-line diff in `themes.css` + `tailwind.config.ts`. No consumer code touched.

## Slice 2 — Dashboard density

### Edit surface
- `src/pages/portal/DashboardPage.tsx` — restructure layout
- `src/components/dashboard/SessionWinrateCard.tsx` — NEW (5 instances: 4 sessions + GENERAL)
- `src/components/dashboard/KPIStrip.tsx` — NEW (replaces direct `DashboardSummaryStrip` mounting; adds sparkline variants)
- `src/components/dashboard/RecentOpsRail.tsx` — NEW
- `src/components/dashboard/__tests__/SessionWinrateCard.test.tsx`, `KPIStrip.test.tsx`, `RecentOpsRail.test.tsx` — NEW
- `src/pages/portal/__tests__/DashboardPage.test.tsx` — UPDATE for new layout
- `src/components/dashboard/DashboardSummaryStrip.tsx` — KEEP (used by OperacionesPage); mark legacy

### Approach
Each new sub-component takes the data + tone palette and renders a focused card. The DashboardPage composes them in the reference layout:
1. Session winrate row (5 cards, 4 small + 1 wide GENERAL)
2. KPI strip (4 cards, sparklines embedded)
3. Recent ops rail (5 rows, right side on `xl+`)
4. Dual curve charts (stacked on `lg-`, side-by-side on `xl+`)
5. `<DotGrid>` + `<NeuralNetwork>` decor mount at the chrome layer

### Strict TDD
- RED: write `SessionWinrateCard.test.tsx` first (progress ring rendering, tone mapping, sub-label fallback).
- GREEN: implement `SessionWinrateCard.tsx`.
- TRIANGULATE: add tests for 3+ input combinations (zero trades, mix, all wins).
- REFACTOR: extract shared progress-ring primitive if pattern repeats.

### Risks
- Layout collapse at `lg` — handled by responsive grid per REQ-DD-005.
- Decor obscuring data — opacity caps enforced (REQ-DD-007 + REQ-DEC-006).
- Existing `DashboardSummaryStrip` test failures — keep both, mark `DashboardSummaryStrip` as legacy, deprecate later.

### Rollback
Revert Slice 2 commit. The dashboard reverts to the post-DS-v1 layout (commit `8a3de35` state). Token pivot (Slice 1) stays.

## Slice 3 — Shell chrome

### Edit surface
- `src/components/portal/PortalSidebar.tsx` — widen `w-64 → w-72`
- `src/components/portal/SidebarHeader.tsx`, `SidebarFooter.tsx` — adjust for new width
- `src/components/portal/SidebarNav.tsx` — active-state cyan glow (per REQ-PS-011)
- `src/components/common/TopNav.tsx` — mount order per REQ-TB-005
- `src/stores/useCoreInterfacePrefs.ts` — NEW (optional; only if Slice 2 adopts it)

### Approach
Width change is one Tailwind class swap. Active-state glow requires updating `SidebarNav.tsx`'s `border-l-4 border-l-primary` to also include `shadow-[0_0_24px_var(--color-jade-glow)]` at the retuned `0.25` alpha.

Topbar mount order: language selector → account-scope selector → page title → `+Nuevo Trade` CTA. The language + account-scope selectors are existing components reused.

### Tests
- `pnpm test` — sidebar widening is a class change, no test impact.
- `src/components/portal/__tests__/PortalShell.test.tsx` — UPDATE for new mount order.

### Rollback
Revert Slice 3 commit. Sidebar + Topbar revert to post-DS-v1 chrome.

## Slice 4 — Per-page migration

### Edit surface
Per page, ~80 LOC + tests:
- `src/pages/portal/CuentasPage.tsx` + `__tests__/CuentasPage.test.tsx`
- `src/pages/portal/CuentasDetailPage.tsx` + `__tests__/CuentasDetailPage.test.tsx`
- `src/pages/portal/DiarioPage.tsx` + `__tests__/DiarioPage.test.tsx`
- `src/pages/portal/OperacionesPage.tsx` + `__tests__/OperacionesPage.test.tsx`
- `src/pages/portal/PlaybookPage.tsx` + `__tests__/PlaybookPage.test.tsx`
- `src/pages/portal/ConfiguracionPage.tsx` + `__tests__/ConfiguracionPage.test.tsx` (if needed)

### Approach
Each page swap is mechanical:
1. Section headers → uppercase + wide tracking + cyan accent bullet
2. Card backgrounds → glass with cyan border
3. Primary buttons → cyan border, cyan fill on hover, cyan glow
4. Inputs → cyan focus ring at `0.32` alpha

Each page is its own PR. The drift guard (Slice 5) lands BEFORE any Slice 4 PR merges to `main`.

### Chain strategy
`stacked-to-main`: each PR targets `main` in sequence (no stacked branches). Reviewer sees one page at a time. Reverts are isolated.

### Strict TDD per page
- RED: update the page's existing test to assert the new chrome (section headers, card backgrounds, button variants).
- GREEN: apply the chrome changes.
- TRIANGULATE: add visual snapshot via Playwright (optional; light visual regression).
- REFACTOR: extract repeated chrome patterns into a `<CoreInterfaceChrome>` wrapper if the duplication > 3 pages.

### Rollback
Each page PR is independent. `git revert <page-sha>` restores that page only.

## Slice 5 — Drift guard + light-mode audit

### Edit surface
- `eslint.config.js` — `no-cyaan-literals` rule definition
- `eslint.runtime-guard.config.mjs` — runtime guard config for the new rule
- `scripts/verify-cyan-drift.sh` — NEW; CI grep guard
- `docs/design-system.md` — NEW; documents the cyan decision
- `package.json` — add `lint:design` script
- `.github/workflows/ci.yml` (or equivalent) — wire `lint:design` + `verify-cyan-drift.sh`
- `openspec/changes/core-interface-redesign/verify-report.md` — NEW; light-mode contrast audit

### Approach
The ESLint rule is a custom rule defined in `eslint.config.js` per the new `no-cyaan-literals` config. The allow-list paths are documented in REQ-SE-005.

The CI grep guard is a bash script that runs `rg` against `src/` and exits non-zero on cyan-family rgba matches outside the allow-list.

`docs/design-system.md` is a one-shot document — no generation step.

The light-mode contrast audit is a manual step using a contrast checker (e.g., WebAIM Contrast Checker) for each consumer that uses `--color-jade` on `--color-bg` (light). Results recorded in `verify-report.md`.

### Tests
- ESLint rule itself: unit test in `eslint-plugin-jcs/no-cyaan-literals.test.mjs`.
- CI grep guard: tested manually against a synthetic file with a cyan literal.

### Rollback
Remove `eslint.config.js` entries, delete `scripts/verify-cyan-drift.sh` + `docs/design-system.md`, remove `lint:design` script. CI pipeline unaffected.

## Dependencies between slices

```
S1 ──→ S2 ──→ S3 ──→ S4 ──→ S5
                          ↑
                          └── S5 must land BEFORE any S4 PR merges to main
```

S1 is the foundation (everyone needs cyan tokens). S2 + S3 can land in parallel (different file scopes). S4 is gated on S5 for the drift guard. S5 is gated on S1 (the rule needs to know the cyan values to lint).

## Review and judgment risks

### High
- **Slice 4 (per-page migration)**: 5 pages × 80 LOC = 400 LOC across 5 PRs. Each is small but the cumulative surface is large. Mitigation: chain the PRs, one per page, each independent.
- **Slice 5 light-mode audit**: requires manual visual verification. Mitigation: explicit `verify-report.md` checklist.

### Medium
- **Slice 2 (dashboard density)**: layout change on the highest-visibility page. Mitigation: skeleton already in place; skeleton tests exist from commit `8a3de35`.
- **Slice 3 (shell chrome)**: shell touches 30+ files via Sidebar/Topbar reuse. Mitigation: focused edit surface (4-5 files), rest are downstream consumers.

### Low
- **Slice 1 (token pivot)**: one-file change, low blast radius. Mitigation: revertible in seconds.
- **Slice 5 ESLint rule**: additive, no consumer impact at merge time. Mitigation: allow-list documented.

## Cross-cutting concerns

### TDD discipline
Strict TDD active. Every slice follows RED → GREEN → TRIANGULATE → REFACTOR. Tests written first; implementation second. Coverage thresholds (80/75/80/80) maintained at every slice boundary.

### Commit hygiene
- Conventional commits. NO `Co-Authored-By` trailer. NO emojis in titles.
- Slice-level commits where possible; sub-task commits when slice is too large.
- Each commit message references the slice number and the affected spec.

### PR strategy
- S1, S2, S3, S5: single PR each.
- S4: 5 chained PRs (one per page).
- All PRs ≤ 400 LOC. `size:exception` allowed for Slice 5 if the ESLint rule + CI grep + docs exceed 400 LOC collectively (acceptable per the workflow).

### Review budget
- `delivery_strategy: auto-chain` confirmed.
- `chain_strategy: stacked-to-main` (each PR targets `main`; no stacked branches).
- `review_budget: 400` enforced per PR.

## Anti-patterns to avoid

- Inline cyan hex literals in components (enforced by Slice 5 ESLint rule).
- Renaming `--color-jade*` to `--color-cyan*` (out of scope; deferred).
- Decor primitives over financial tables (enforced by REQ-DEC-007).
- Animations on financial cards (scanlines restricted to chrome per DS-v1).
- Megapatch PRs that bundle multiple slices.

## Verification plan

Per slice:
- `pnpm test` — must stay green or grow.
- `pnpm typecheck` — must pass.
- `pnpm lint` — must pass (allow-list updates if needed).
- `pnpm build` — must succeed.

At archive time:
- `verify-report.md` confirms all spec requirements met.
- `sync-report.md` confirms all 5 spec deltas appended to global specs.
- `archive-report.md` documents final state + follow-ups.

## Open questions

None at design time. The proposal was approved with no outstanding questions. If questions arise during implementation, they are resolved per the SDD workflow (parent orchestrator gates each phase).
