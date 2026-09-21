# Proposal: core-interface-redesign — Pivot to cyan "Core Interface" aesthetic

> **Change**: `core-interface-redesign`
> **Project**: `jcs_oficial` (JadeCapitalSuite — frontend-only SPA in this change)
> **Mode**: openspec
> **Inspiration source**: user-provided reference screenshot at `/tmp/pi-clipboard-43991fa0-9d55-4b16-8359-905abb6978af.png` ("Jade Capital Suite - Core Interface", JARVIS-style HUD)
> **Date**: 2026-09-15
> **Supersedes**: design-system-v1's jade-green primary decision (archived). This change is a brand-direction pivot, not a violation of DS-v1.

## Why

The user shared a new JARVIS-style HUD reference screenshot and asked for the Jade Capital Suite portal to adopt it as the next iteration of the design language. Three pressures justify formalizing this as a change rather than a one-off tweak:

1. **Brand direction pivot**: `design-system-v1` established neon-jade (`#00FF9D`) as the primary accent after a deliberate rejection of cyan-era drift literals. The new reference points back toward cyan (`#00D4D8`-ish). This is a binding direction change, not a color tweak — it affects every consumer via the CSS-var indirection.
2. **Layout density**: the reference screenshot packs significantly more information per viewport than the current jade dashboard — session winrate cards with progress rings, a 4-up KPI strip with sparklines, a "Operaciones Recientes" right rail, and a wider left sidebar with active-state styling. The dashboard skeleton was already restructured in commit `8a3de35` to match; this change re-skins it in cyan and polishes the gaps.
3. **One-file pivot feasibility**: Wave 5 of DS-v1 (shipped in commit `676b834`) moved all brand tokens to CSS vars in `src/styles/themes.css`. The primary color swap is therefore a one-line change. The risk is concentrated in: (a) glow + glass rebalance for cyan vs jade (different perceptual brightness), (b) anti-pattern drift back into the codebase, (c) light-mode contrast regression.

We treat the reference screenshot as **inspiration**, not a pixel-perfect spec. The decision-summary language from `design-system-v1` carries forward verbatim: "inspiration-aligned, not pixel-perfect". We preserve existing functionality, screens, and tests.

## What Changes

### A. Token pivot — `src/styles/themes.css`
Swap the primary accent ladder from jade to cyan in both dark + light modes. All hex literals already live in CSS vars; this is one file.

| Token | Current (jade) | New (cyan) | Notes |
|---|---|---|---|
| `--color-jade` | `#00FF9D` | `#00D4D8` | Primary accent |
| `--color-jade-dk` | `#00CC7E` | `#00A8B8` | Mid-tone (buttons pressed) |
| `--color-jade-light` | `#5CFFBE` | `#7CE8EC` | Highlight (focus rings, hover) |
| `--color-jade-glow` | `#00FF9D` | `#00D4D8` | Glow shadow rgba seed |
| `--color-jade-fg` | `#060B10` | `#060B10` | Foreground ON primary surfaces — unchanged (dark on cyan is fine) |
| `--color-jade-profit` | `#35D07F` | `#3CE0B8` | Profit/success (shifted toward cyan-green for separation from primary) |
| `--color-jade-loss` | `#FF2A55` | `#FF3D5F` | Loss (slight lift in dark mode for cyan-bg contrast) |
| `--color-jade-info` | `#00B8FF` | `#00B8FF` | Info/AI accent — unchanged (cyan cousin) |
| `--color-jade-warning` | `#F3B94E` | `#F3B94E` | Warning — unchanged |

The `--color-jade-*` naming is **preserved** for backward compatibility (121 components reference these names). A follow-up rename is out of scope here.

### B. Glow rebalance — `tailwind.config.ts` + CSS var updates
- `glow-jade` shadow alpha drops from `0.30` → `0.25` (cyan reads brighter than jade at equal alpha; tighten to avoid halo blowout)
- `glow-jade-sm` from `0.20` → `0.16`
- New `glow-cyan` utility as alias of `glow-jade` (semantic rename; old name kept for one release cycle)
- Glassmorphism rgba alphas retuned: `glass.DEFAULT` from `0.10` → `0.08`, `glass.strong` from `0.16` → `0.13` (cyan over dark needs less surface opacity to read as "elevated")

### C. Dashboard layout polish — `src/pages/portal/DashboardPage.tsx`
The dashboard skeleton is already in place (commit `8a3de35`). This slice polishes:
- **Session winrate cards**: a row of 4 horizontal cards (ASIA / LONDON / NEW YORK / SYDNEY) + 1 wider GENERAL card with circular progress rings, separated from the 4-up KPI strip below.
- **KPI strip**: 4 cards (Balance Total, Operaciones, P&L Neto, Win Rate) with mini sparklines inside each, per the reference.
- **Operaciones Recientes**: a right-rail list (5 rows) with avatar dot, pair, side tag, P&L USD value, and timestamp.
- **Charts**: two stacked charts (Curva de Rendimiento, Curva de Capital) with cyan-stroked lines + cyan-tinted area gradients + triangular markers for deposits/withdrawals.
- **Background**: subtle `DotGrid` + `NeuralNetwork` decor primitives, restricted to the dashboard chrome (NOT to financial tables per DS-v1 spec).

### D. Sidebar widening + header chrome — `src/components/portal/*`
- Left sidebar widens from `w-64` → `w-72` and gains an active-state cyan glow on the active item's left border.
- Topbar gains a language + account-scope selector on the left and a `+Nuevo Trade` CTA on the right (the reference's top-right blue-cyan CTA).

### E. Per-page migration (Cuentas / Diario / Operaciones / Playbook / Configuración)
All pages stay functionally identical. Chrome + chrome density per the reference:
- Section headers: `J.A.R.V.I.S.`-style ("WINRATE POR SESIÓN", "BALANCE TOTAL", "OPERACIONES") — uppercase, wide tracking, cyan accent for the section bullet.
- Card backgrounds: glass surfaces with cyan-tinted borders, slightly stronger glow on hover.
- Buttons: primary `Button` variant retuned — cyan border, cyan fill on hover, cyan glow.
- Inputs: cyan focus ring at `0.32` alpha.

### F. Anti-pattern drift guard
- New ESLint rule `no-cyaan-literals` (already scoped in `style-enforcement` spec from DS-v1; promoted to actual rule here).
- Stylelint config banning raw cyan `rgba(...)` outside `tailwind.config.ts` and `themes.css`.
- CI grep guard (already implemented as `scripts/verify-rename.sh` analog — extend with cyan hex check).
- `docs/design-system.md` updated to document the cyan decision and the inspiration-aligned (not pixel-perfect) language.

### G. Light-mode contrast regression check
The reference is dark-only. Light-mode contrast needs explicit verification:
- `--color-jade` on `--color-bg` (light) must remain WCAG AA at body-text size.
- Glass surface over light background: retest with cyan border (alpha may need lift from `0.28` → `0.36`).
- Document the contrast checks in `verify-report.md`.

## Scope

### In Scope
- Items A–G above.
- New spec domains: `core-interface-tokens` (new), `dashboard-density` (new).
- Modified spec domains: `color-system`, `portal-shell`, `topbar`, `decorative-system`, `style-enforcement`.
- One optional new `useCoreInterfacePrefs` Zustand store for per-user dashboard density (`comfortable` / `compact`) — scoped to the dashboard only.
- New ESLint rule `no-cyaan-literals` (Wave 7 of DS-v1, promoted here).

### Out of Scope
- Backend (`/backend/**`) — preserved as-is. The stashed `WIP: backend changes pre-UI-redesign (2026-09-15)` must remain untouched.
- `portal-fase0a-base` — separate workstream.
- Pixel-perfect reproduction of the reference screenshot — inspiration-aligned.
- New product features beyond re-skin and density tuning.
- `core-interface-v2` or any future brand-direction change (out of scope; single pivot here).
- Marketing pages (`/`, `/pricing`, `/features`, etc.) — restyled as a derivative of the portal chrome but no per-section copy/layout changes.

### New Capabilities
- `core-interface-tokens`: cyan accent ladder in both dark + light modes; per-mode contrast verified.
- `dashboard-density`: 4-up session winrate cards with progress rings, KPI strip with sparklines, recent-ops right rail, dual cyan curve charts.
- `core-interface-prefs` (optional): per-user density preference, stored in `localStorage`.

### Modified Capabilities
- `color-system`: primary accent pivots from jade `#00FF9D` to cyan `#00D4D8`; profit/loss/info/warning tokens retuned for separation.
- `portal-shell`: sidebar widens to `w-72`; active-state cyan glow.
- `topbar`: language + account-scope selector on the left; `+Nuevo Trade` CTA on the right.
- `decorative-system`: `DotGrid` + `NeuralNetwork` enabled by default on the dashboard (was opt-in).
- `style-enforcement`: `no-cyaan-literals` ESLint rule promoted from spec to actual rule; CI grep guard extended.

## Approach

Sequenced in **5 slices** (each ≤ 400 LOC, each independently reviewable and revertible):

| Slice | Scope | Risk | Review size |
|---|---|---|---|
| **Slice 1 — Token pivot** | Item A + B (one-file CSS var + tailwind config alpha retune) | Low: cyan over jade on the same dark bg, types unchanged | small (~80 LOC) |
| **Slice 2 — Dashboard density** | Item C (DashboardPage + KPI strip density + recent-ops right rail + dual chart polish) | Medium: layout change, but skeleton already in place | medium (~250 LOC) |
| **Slice 3 — Shell chrome** | Item D (sidebar widening + header CTA + language selector) | Medium: shell touches 30+ files via Sidebar/Topbar reuse | medium (~200 LOC) |
| **Slice 4 — Per-page migration** | Item E (Cuentas / Diario / Operaciones / Playbook / Configuración re-skin in cyan chrome) | High: 5 pages + tests, each ≤ 80 LOC | chained (5 PRs) |
| **Slice 5 — Drift guard + light-mode audit** | Item F + G (ESLint rule + CI grep + docs + light-mode contrast verify) | Low: additive guard + verification step | small (~150 LOC) |

Each slice leaves the app buildable, tests green, and the portal navigable. Slice ordering is intentional: token pivot first so every later slice lands on the right palette; dashboard density second so the highest-visibility page is polished first; shell third so all pages inherit the new chrome; per-page fourth; guard + audit fifth.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/styles/themes.css` | Modified | Cyan pivot (A) |
| `tailwind.config.ts` | Modified | Glow + glass alpha retune (B) |
| `src/pages/portal/DashboardPage.tsx` | Modified | Session cards row + recent-ops rail + dual chart polish (C) |
| `src/components/dashboard/{SessionWinrateCard,KPIStrip,RecentOpsRail}.tsx` | New | New dashboard sub-components (C) |
| `src/components/portal/Sidebar*` | Modified | Sidebar widening + cyan active glow (D) |
| `src/components/common/TopNav.tsx` | Modified | Language + account-scope + `+Nuevo Trade` CTA (D) |
| `src/pages/portal/{Cuentas,Diario,Operaciones,Playbook,Configuracion}Page.tsx` | Modified | Cyan chrome migration (E) |
| `src/stores/useCoreInterfacePrefs.ts` (optional) | New | Density preference store (G) |
| `eslint.config.js` | Modified | `no-cyaan-literals` rule (F) |
| `scripts/verify-cyan-drift.sh` | New | CI grep guard (F) |
| `docs/design-system.md` | New | Cyan decision + inspiration-aligned language (F) |
| `/backend/**` | **Untouched** | Preserved (WIP stash) |
| `openspec/changes/portal-fase0a-base/**` | **Untouched** | Separate workstream |
| `openspec/changes/archive/2026-09-15-design-system-v1/**` | **Untouched** | Archived; spec deltas only |

## Risks & Trade-offs

| Risk | Likelihood | Mitigation |
|---|---|---|
| Cyan over jade changes the brand recognition built by DS-v1 | Medium | Wave 5 CSS-var indirection keeps the swap to one file; rollback is `git revert` of Slice 1. The cyan direction is explicitly user-requested. |
| Cyan reads brighter than jade at equal glow alpha — halo blowout | Medium | Slice 1 retunes glow alphas (`0.30 → 0.25`); manual visual check on Dashboard + dark-mode styleguide before Slice 2. |
| Light-mode contrast regression (cyan on light bg) | High | Slice 5 includes a contrast check on every consumer; light-mode toggle is opt-in (`data-theme=light`) so dark-mode users see no regression. |
| Dashboard density overloads the viewport on small screens | Medium | KPI strip collapses to `grid-cols-2` on `lg` and `grid-cols-1` on `md` per existing patterns in `DashboardSummaryStrip`; recent-ops rail hides below `xl`. |
| ESLint rule `no-cyaan-literals` fires on legitimate uses (e.g., chart colors) | Low | Allow-list path: `tailwind.config.ts` + `themes.css` + `src/components/dashboard/{CapitalCurveChart,PerformanceCurveChart}.tsx` + `src/test/setup.ts`. |
| Per-page migration touches 5 pages + tests in Slice 4 | High | One PR per page (5 chained PRs); each PR ≤ 80 LOC; revertible independently. |
| Inspiration alignment interpreted as pixel-perfect by reviewers | Medium | `docs/design-system.md` repeats the "inspiration-aligned, not pixel-perfect" line from DS-v1; PR descriptions cite it. |
| Wave 7 enforcement landed late, missing the cyan guard at merge time | Medium | Slice 5 lands before Slice 4 merge to `main` so the guard is enforced when per-page PRs land. |
| `useCoreInterfacePrefs` adds scope creep | Low | Optional; if not adopted in Slice 2, dropped entirely. Density tuning handled by Tailwind classes only. |
| Dashboard dual-chart overflows on `xl` viewports | Low | Charts share a `flex-col gap-4` stack on `lg-` and side-by-side on `xl+` per `DashboardPage` existing pattern. |

## Rollback Plan

- **Slice 1**: `git revert <sha>` restores jade. Two-line diff in `themes.css` + `tailwind.config.ts`. No consumer code touched.
- **Slice 2**: revert the dashboard density commit. Existing `DashboardPage` skeleton (commit `8a3de35`) stays valid; cyan on jade still readable.
- **Slice 3**: revert shell commit. Sidebar width + Topbar CTA revert cleanly.
- **Slice 4**: revert any of the 5 per-page commits independently.
- **Slice 5**: remove ESLint rule + CI script + docs; safe.
- Cross-slice: revert in reverse order (`Slice 5 → Slice 4 → Slice 3 → Slice 2 → Slice 1`).

## Dependencies

- Existing stack — no version bumps.
- `src/styles/themes.css` must remain the single source of color truth (preserved from DS-v1 Wave 5).
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` must remain green at every slice boundary.

## Success Criteria

- [ ] `src/styles/themes.css` `--color-jade*` ladder uses cyan (`#00D4D8` / `#00A8B8` / `#7CE8EC` / `#00D4D8`) in both dark + light modes.
- [ ] `tailwind.config.ts` `glow-jade` / `glow-jade-sm` alphas retuned to `0.25` / `0.16`; new `glow-cyan` alias exists.
- [ ] DashboardPage renders session winrate cards (ASIA/LONDON/NEW_YORK/SYDNEY + GENERAL), 4-up KPI strip with sparklines, recent-ops right rail, and dual cyan curve charts.
- [ ] Sidebar widens to `w-72`; active item has cyan glow on the left border.
- [ ] Topbar shows language + account-scope selector on the left and `+Nuevo Trade` CTA on the right.
- [ ] Cuentas, Diario, Operaciones, Playbook, Configuración pages use the cyan chrome (section headers uppercase, cyan accent bullet, glass surface with cyan border).
- [ ] ESLint rule `no-cyaan-literals` passes in CI on `main` (after Slice 5).
- [ ] `scripts/verify-cyan-drift.sh` exits 0 on `main` (after Slice 5).
- [ ] `docs/design-system.md` exists and documents the cyan decision + inspiration-aligned language.
- [ ] Light-mode contrast verified WCAG AA at body-text size on every consumer (verify-report).
- [ ] `pnpm test` green (801/801 baseline maintained or grew); no regression vs. DS-v1 close.
- [ ] `pnpm typecheck`, `pnpm lint` pass with no new errors.
- [ ] Coverage thresholds (80/75/80/80) maintained.
- [ ] No `Co-Authored-By` trailers; conventional-commit messages; backend and archived DS-v1 untouched.

## Decision Summary (binding)

- **Language**: adopt "Core Interface" cyan JARVIS aesthetic — inspiration-aligned, not pixel-perfect.
- **Preserve**: keep everything already built (functionality, screens, tests, backend, DS-v1 chrome).
- **Tokens**: pivot primary from jade `#00FF9D` to cyan `#00D4D8`; retune glow + glass alphas for cyan perceptual brightness.
- **Layout**: dashboard density matches the reference (session cards + KPI strip + recent-ops rail + dual charts); sidebar widens; Topbar gains `+Nuevo Trade` CTA.
- **Per-page migration**: chained PRs (one per page) so the reviewer never sees a multi-area mega-PR.
- **Drift guard**: ESLint rule + CI grep + `docs/design-system.md` are all shipped in Slice 5 BEFORE any Slice 4 per-page PR merges to `main`.
- **Light-mode contrast**: explicit verify step in Slice 5; opt-in toggle so dark-mode users see no regression.
- **Scope**: frontend only. Backend, `portal-fase0a-base`, and archived DS-v1 untouched.

## Next Step

`sdd-spec` — materialize the new specs (`core-interface-tokens`, `dashboard-density`, `core-interface-prefs`) and the modified spec deltas (`color-system`, `portal-shell`, `topbar`, `decorative-system`, `style-enforcement`) under `openspec/changes/core-interface-redesign/specs/<domain>/spec.md`.
