# Proposal: portal-fase0a-base — Adapt JCS Portal to Mega-Prompt FASE 0A

> Change: `portal-fase0a-base`
> Project: `jcs_oficial` (JadeCapitalSuite — frontend-only SPA in this change)
> Mode: hybrid (Engram + OpenSpec)
> Source artifact: Engram memory_id `129` (topic_key `sdd/portal-fase0a-base/proposal`)
> Supersedes: Engram memory_id `96` (p0e.1 portal sidebar restructure shipped) and `93` (p0d.2 portal shell shipped)
> Plan.md mapping: mega-prompt "# MASTER PROMPT — JADECAPITALSUITE" — FASE 0A (Layout base)
> Date: 2026-09-02
> Migrated by: sdd-propose migration to OpenSpec on 2026-09-02

## Intent

The JCS portal already has ~60% of the FASE 0A chrome — `TopNav` sticky, glass primitives, `PortalShell`, multi-tenant JWT, 3 real pages, 91 green frontend tests. Three blockers prevent FASE 0A feature delivery and require explicit decisions captured by the user:

1. **Brand mismatch**: codebase consolidated on cyan `#00FFFF` (per mem #70 "jarvis-hrz visual override"), but the mega-prompt mandates jade `#2EDC8C` as primary. User decision: **pivot to jade**.
2. **Wrong layout on desktop**: commit `7517afd` made `PortalSidebar` `hidden lg:hidden` and shipped a horizontal `PortalNav`. Mega-prompt requires a vertical collapsible sidebar in desktop. User decision: **revert and unify on vertical sidebar**.
3. **Stack gap**: TanStack Query installed but unused; Zustand absent. User decision: **wire both now** before FASE 0A features.

This change closes all three, then adds the chrome pieces missing for FASE 0A — Cmd+K palette, +Nuevo Trade drawer, RiskSemaphore, WorkspaceSelector.

## Scope

### In Scope (FASE 0A)

1. **Jade pivot**: cyan → jade `#2EDC8C` across `tailwind.config.ts`, `src/styles/index.css`, all components using `text-primary`, `border-primary`, `bg-primary`, `glow-cyan`, etc.
2. **Sidebar restore**: revert `hidden lg:hidden` on `PortalSidebar`; remove or archive `PortalNav`; mobile drawer overlay for the same sidebar.
3. **Zustand**: `npm i zustand` (4.5.x). Stores: `useNewTradeDrawer`, `useActiveWorkspace`, `useSidebarCollapsed`, `useCommandPalette`.
4. **TanStack QueryProvider**: mount `<QueryClientProvider>` in `main.tsx` / `RootShell`; defaults `staleTime 30s, retry 1`; migrate `CuentasPage` + `CuentasDetailPage` to `useQuery`.
5. **GlassDrawer primitive**: `src/components/common/GlassDrawer.tsx` + test. Side=right, slide-in, backdrop, Esc, click-outside, focus trap.
6. **CommandPalette (Cmd+K)**: `src/components/common/CommandPalette.tsx` + `useCommandPalette.ts` hook + test. Listener `metaKey+K` / `ctrlKey+K`. Actions: navigate to Dashboard/Cuentas/Operaciones/Diario/Playbook/Configuracion, open `NewTradeDrawer`.
7. **RiskSemaphore**: 3-state widget in Topbar. FASE 0A placeholder (green by default + `aria-label="Sin datos de hoy"`); TODO for `/api/v1/trades/risk-summary`.
8. **+ Nuevo Trade button**: in TopNav; wired to `useNewTradeDrawer`.
9. **NewTradeDrawer**: right-side form via `GlassDrawer`; fields account/instrument/direction/stake/expiry; `POST /api/v1/trades`; TanStack Query mutation.
10. **WorkspaceSelector**: at bottom of Sidebar; dropdown of user workspaces; persist active id in `sessionStorage`. **Display-only** (backend infers `workspace_id` from JWT).
11. **Verify tokens**: bg `#080D12`, surface `#0D141B` (already correct).

### Out of Scope (FASE 1+)

Dense trade tables (FASE 4), equity curve / heatmap (FASE 6), strategies/checklists (FASE 3), diario timeline (FASE 5), CSV ingest (FASE 7), full E2E suite (unit + integration only for FASE 0A).

### New Capabilities

- `color-system`: jade tokens + applicability rules (glow only for logo/headings; tabular data uses solid red/green + monospace, no glow).
- `portal-shell`: vertical collapsible sidebar (240/64), mobile drawer overlay, workspace selector slot at bottom.
- `topbar`: sticky brand + Cmd+K trigger + RiskSemaphore + +Nuevo Trade + user name + logout.
- `glass-drawer`: right-side slide-in primitive; backdrop, Esc, focus trap.
- `command-palette`: Cmd+K modal with navigation + open-drawer actions.
- `trade-ingestion`: NewTradeDrawer form + TanStack Query mutation + optimistic update.
- `workspace-selection`: WorkspaceSelector + `useActiveWorkspace` store + sessionStorage persistence.
- `tanstack-query-adoption`: queryClient defaults + migration patterns.
- `zustand-stores`: boundaries, slices, devtools wiring.

### Modified Capabilities

None — no existing spec-level contracts change (`PortalShell` / `TopNav` have no OpenSpec specs yet).

## Approach

Implement as 6 stacked waves so each PR stays under the 400-line review budget:

| Wave | Scope | PR size |
|------|-------|---------|
| 0 | Zustand install + TanStack `QueryClientProvider` (no feature change) | small |
| 1 | Jade color pivot | large — split if > 800 lines (tokens → primitives → public pages → portal pages) |
| 2 | Sidebar restore + `PortalNav` archive + WorkspaceSelector mount | medium |
| 3 | `GlassDrawer` primitive + test | small |
| 4 | Topbar additions: RiskSemaphore placeholder, Cmd+K trigger, +Nuevo Trade button | medium |
| 5 | `NewTradeDrawer` form + mutation wiring | medium |
| 6 | CommandPalette actions + react-router integration | medium |

Wave order is a guideline; `sdd-tasks` will refine and split for review budget.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `tailwind.config.ts` | Modified | Primary color cyan → jade |
| `src/styles/index.css:7-9` | Modified | Remove mem #70 cyan override comment; jade tokens |
| `src/components/common/GlassModal.tsx` | Unchanged | Reference for `GlassDrawer` API parity |
| `src/components/portal/PortalSidebar.tsx` | Modified | Remove `hidden lg:hidden`; `WorkspaceSelector` slot |
| `src/components/portal/PortalNav.tsx` | Removed / Archived | Mega-prompt says drop horizontal nav |
| `src/components/portal/PortalShell.tsx` | Modified | Wire Sidebar + Topbar (no `PortalNav`) |
| `src/components/common/TopNav.tsx` | Modified | Insert Cmd+K trigger, RiskSemaphore, +Nuevo Trade |
| `src/components/common/GlassDrawer.tsx` | New | Side=right slide-in primitive |
| `src/components/common/CommandPalette.tsx` | New | Cmd+K modal |
| `src/components/common/RiskSemaphore.tsx` | New | Topbar widget |
| `src/components/portal/WorkspaceSelector.tsx` | New | Bottom-of-sidebar dropdown |
| `src/components/trades/NewTradeDrawer.tsx` | New | Right-side ingest form |
| `src/stores/*.ts` | New | Zustand slices |
| `src/hooks/useCommandPalette.ts` | New | Global key listener |
| `src/lib/queryClient.ts` | New | TanStack defaults |
| `src/main.tsx` or `RootShell.tsx` | Modified | Mount `QueryClientProvider` |
| `src/pages/CuentasPage.tsx`, `src/pages/CuentasDetailPage.tsx` | Modified | Migrate to `useQuery` |
| 100+ files with `text-primary` / `bg-primary` / `glow-cyan` | Modified | Jade pivot |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Jade pivot regresses visual consistency across 100+ files | High | Single pivot PR on branch; visual review of all pages; optional Playwright screenshot diff for primary color |
| `RiskSemaphore` data source undefined — scope creep or wrong KPI | Medium | Ship as placeholder FASE 0A; explicit TODO; defer binding to `/api/v1/trades/risk-summary` until spec'd |
| Workspace selector scope ambiguity (display-only vs header propagation) | Medium | Confirmed display-only: backend infers `workspace_id` from JWT; do not add `X-Workspace-Id` header in this change |
| Cmd+K actions scope (navigation-only vs admin actions) | Low | Start navigation + open drawer; defer admin actions to FASE 2+ |
| Drawer vs page for +Nuevo Trade (mega-prompt says drawer) | Low | Drawer for quick ingest; full table on `OperacionesPage` (STUB now, FASE 4 later) |
| Wave 1 PR exceeds 400-line budget | High | Split by area tokens/primitives/public/portal per chained-PR rule |

### Open Questions Surfaced (not auto-resolved)

- Visual regression guard: Playwright screenshot diff for jade pivot — yes/no from user.
- `RiskSemaphore` metric definition (max daily loss? 2% rule? max drawdown?) — deferred to FASE 0A+ spec.
- Cmd+K fuzzy search library — confirm `cmdk` package vs hand-rolled list. Recommendation: `cmdk` (lightweight, well-tested).
- `NewTradeDrawer` validation: react-hook-form + zod (already installed) or TanStack Query mutation `onError` only? Recommendation: rhf + zod for client rules + TanStack for server errors.
- Workspace selector real-time: live list from `/api/v1/workspaces` (TanStack Query) or static from JWT claims? Recommendation: live fetch.

## Rollback Plan

- Each wave is its own commit / feature flag; revert any wave independently.
- Jade pivot: `git revert` the pivot commit; `tailwind.config.ts` + `src/styles/index.css` revert cleanly; mem #70 cyan tokens reapply.
- Sidebar restore: revert the sidebar-restore commit; `PortalNav` commit history is preserved for fast re-apply.
- Zustand / TanStack: provider mount is additive; removing `<QueryClientProvider>` reverts to current `useEffect + axios` behavior. Zustand stores can be removed without touching page logic until migration lands.
- `GlassDrawer` + `CommandPalette` + `NewTradeDrawer`: pure additions, delete file + remove imports.

## Dependencies

- `zustand` 4.5.x — additive npm install.
- `@tanstack/react-query` 5.59.16 — already installed; needs provider.
- Backend `workspace_id` filtering — already shipped (commits `544ac1d` → `1951888` → `4b37be0`).
- `openTradeApi` endpoint — already exists (`POST /api/v1/trades`); verify during wave 5.

## Success Criteria

- [ ] Primary color is jade `#2EDC8C` across the whole SPA (chrome bg, glow, focus borders, buttons, headings).
- [ ] Vertical collapsible Sidebar visible on desktop and mobile (mobile as drawer overlay).
- [ ] `PortalNav` horizontal is removed or archived.
- [ ] Zustand installed; stores `useNewTradeDrawer`, `useActiveWorkspace`, `useSidebarCollapsed`, `useCommandPalette` functional.
- [ ] `QueryClientProvider` mounted; `CuentasPage` + `CuentasDetailPage` migrated to `useQuery`.
- [ ] Cmd+K (or Ctrl+K) opens `CommandPalette` from any portal route.
- [ ] +Nuevo Trade opens `NewTradeDrawer` right-side (not a centered modal).
- [ ] `RiskSemaphore` renders in Topbar (placeholder acceptable for FASE 0A).
- [ ] `WorkspaceSelector` in Sidebar bottom; active workspace persisted in sessionStorage.
- [ ] 91/91 existing frontend tests still green; new tests for `GlassDrawer`, `CommandPalette`, `NewTradeDrawer`, `RiskSemaphore`, `WorkspaceSelector`.
- [ ] `pnpm typecheck` and `pnpm lint` pass with no new errors.
- [ ] Git log shows conventional-commit messages; no `Co-Authored-By` trailers.

## Specs necesarias (para `sdd-spec`)

1. `color-system` — jade tokens + applicability (glow for chrome, solid for data).
2. `portal-shell` — vertical collapsible sidebar + mobile drawer overlay.
3. `topbar` — sticky chrome with Cmd+K + RiskSemaphore + +Nuevo Trade + user.
4. `glass-drawer` — right-side slide-in primitive.
5. `command-palette` — Cmd+K modal with navigation + open-drawer actions.
6. `trade-ingestion` — `NewTradeDrawer` + mutation + optimistic update.
7. `workspace-selection` — `WorkspaceSelector` + `useActiveWorkspace` + sessionStorage.
8. `tanstack-query-adoption` — queryClient defaults + migration patterns.
9. `zustand-stores` — Zustand store boundaries + devtools wiring.

## Decision Summary (binding)

- **Color**: pivot cyan `#00FFFF` → jade `#2EDC8C` across the SPA.
- **Sidebar**: solo vertical colapsable en desktop (`PortalNav` horizontal desaparece o queda archivado).
- **Stack**: Zustand 4.5.x + TanStack `QueryClientProvider` ahora (antes de FASE 0A features).
- **`RiskSemaphore`**: placeholder FASE 0A (green + `aria-label="Sin datos de hoy"`); binding a data source queda para FASE 0A+ spec.
- **`WorkspaceSelector`**: display-only; no header `X-Workspace-Id` en este change.
- **+Nuevo Trade**: drawer lateral derecho, no modal centrado ni página dedicada.
- **Cmd+K actions**: navegación + abrir drawer; admin actions quedan para FASE 2+.

## Next Step

Ready for `sdd-spec` — usar las 9 specs listadas arriba. Cada spec se materializa como `openspec/changes/portal-fase0a-base/specs/<name>/spec.md` (delta spec) y se archiva como `openspec/specs/<name>/spec.md` al cierre.
