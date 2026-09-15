# Init: core-interface-redesign

**Change**: `core-interface-redesign`
**Project**: `jcs_oficial` (JadeCapitalSuite — frontend-only SPA)
**Mode**: openspec
**Created**: 2026-09-15
**Init agent**: orchestrator-issued (parent dispatched the init artifact inline because `subagent_run` cannot bind a non-session worktree to the SDD dispatch boundary; the SDD methodology, contracts, and artifacts remain authoritative)

## Project context

### Stack
- **Frontend**: React 18.3 + Vite 5.4 + TypeScript 5.5 + Tailwind 3.4
- **State**: Zustand 4.5 (stores under `src/stores/`) + TanStack Query 5.59
- **Forms**: react-hook-form 7.53 + zod 3.23
- **Routing**: react-router-dom 6.26 (lazy-loaded portal + admin + marketing routes)
- **UI**: 10 primitives under `src/components/ui/` (Button, Input, Select, Textarea, Badge, StatusDot, DataTable, Tabs, EmptyState, Skeleton, Toast) + decor primitives under `src/components/decor/` (DotGrid, NeuralNetwork, HudRing, RadarSweep, Scanline)
- **Charts**: TradingView Lightweight Charts (used in EquityCurveChart equivalents: `CapitalCurveChart`, `PerformanceCurveChart`)
- **HTTP**: axios 1.7 with auth interceptor
- **Test**: Vitest 2.1 + Testing Library + Playwright 1.62 (e2e)
- **Lint**: ESLint 9 with `--max-warnings 0`
- **Backend**: FastAPI under `backend/` — **OUT OF SCOPE for this change**, preserved untouched

### Scripts
- `pnpm test` — Vitest unit tests
- `pnpm typecheck` — `tsc -b`
- `pnpm lint` — ESLint with `--max-warnings 0`
- `pnpm build` — `tsc -b && vite build`
- `pnpm format` / `pnpm format:check` — Prettier

### Recent project state (binding)
- `design-system-v1` is **ARCHIVED** at `openspec/changes/archive/2026-09-15-design-system-v1/` with `archive-report.md`. The Cyber-Jade design language is closed.
- `sessions-configurable-cap` is **ARCHIVED** at `openspec/changes/archive/2026-09-15-sessions-configurable-cap/`.
- `portal-fase0a-base` remains **OPEN** and is out of scope for this change.
- Backend WIP preserved in `git stash`: `stash@{0}: WIP: backend changes pre-UI-redesign (2026-09-15)`. Preserved untouched, not this change's scope.
- Specs promoted in `openspec/specs/` (global library): `cyber-jade-tokens`, `primitive-library`, `decorative-system`, `styleguide-jade`, `style-enforcement`, `color-system`, `portal-shell`, `topbar`, `session-classification`, `workspace-discipline-cap`, `trade-ingestion`.
- Last commits on `main` (this session, 8 commits): wave-5 themes refactor `676b834`, hud decor + glass polish `c24cce9`, dashboard Core Interface layout `8a3de35`, page migrations + tests + e2e `17e9ac4`, portal chrome + theme store `8918431`, Scanner page slice 1 `386d100`, sessions archive sync `401f0a2`, DS-v1 archive `9ec7e5d`. Working tree clean except dev screenshots (`dash-*.png`, `diario-*.png`, `operaciones-*.png`).

### Strict TDD
Active. Every implementation task follows RED → GREEN → TRIANGULATE → REFACTOR. Test runner is `pnpm test`. Coverage thresholds (80/75/80/80) maintained.

### Commit conventions
Conventional commits. **NO** `Co-Authored-By` trailer. **NO** emojis in titles. PRs ≤ 400 lines per the review budget; chained PRs above the budget.

## Change scope (one-paragraph)

`core-interface-redesign` pivots the Jade Capital Suite frontend's primary accent from jade-green (`#00FF9D`) to cyan accents to match a new JARVIS-style HUD reference screenshot (`/tmp/pi-clipboard-43991fa0-9d55-4b16-8359-905abb6978af.png`). Wave 5 themes refactor (just shipped) moved all brand tokens to CSS vars (`var(--color-jade)`, `var(--color-bg)`, etc.) in `src/styles/themes.css`, so the primary color swap is a one-file change; per-page layout adjustments follow. The dashboard structure (`DashboardSummaryStrip`, `RecentActivityFeed`, `CapitalCurveChart`, `PerformanceCurveChart`, `DayDetailPanel`) was already restructured in commit `8a3de35` to match the reference layout; cyan pivot is now a downstream restyle on top of the prepared layout. Inspiration-aligned, not pixel-perfect; existing functionality, screens, and tests are preserved.

## SDD artifact list for this change

| Artifact | Path | Phase |
|---|---|---|
| `init.md` | `openspec/changes/core-interface-redesign/init.md` | sdd-init (this file) |
| `proposal.md` | `openspec/changes/core-interface-redesign/proposal.md` | sdd-proposal |
| `specs/<domain>/spec.md` | `openspec/changes/core-interface-redesign/specs/<domain>/spec.md` | sdd-spec |
| `design.md` | `openspec/changes/core-interface-redesign/design.md` | sdd-design |
| `tasks.md` | `openspec/changes/core-interface-redesign/tasks.md` | sdd-tasks |
| `apply-progress.md` | `openspec/changes/core-interface-redesign/apply-progress.md` | sdd-apply |
| `verify-report.md` | `openspec/changes/core-interface-redesign/verify-report.md` | sdd-verify |
| `sync-report.md` | `openspec/changes/core-interface-redesign/sync-report.md` | sdd-sync |
| `archive-report.md` | `openspec/changes/archive/2026-09-15-core-interface-redesign/archive-report.md` | sdd-archive |

## Next phase

`sdd-proposal` — write `proposal.md` describing the cyan pivot, layout per-page adjustments, glow + glass rebalance for cyan, anti-patterns to avoid, success criteria, and the sliceable delivery plan (token pivot → dashboard layout polish → sidebar/header polish → per-page migration).
