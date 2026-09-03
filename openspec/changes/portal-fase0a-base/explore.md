# Exploration: portal-fase0a-base — Adapt JCS Portal to Mega-Prompt FASE 0A

> Change: `portal-fase0a-base`
> Project: `jcs_oficial` (JadeCapitalSuite — frontend-only SPA in this change)
> Phase: explore (read-only)
> Mode: hybrid (Engram + OpenSpec)
> Date: 2026-09-02
> Source artifact: Engram memory_id `128` (topic_key `sdd/portal-fase0a-base/explore`)
> Migrated by: sdd-explore migration to OpenSpec on 2026-09-02

## Cambios del codebase contra el mega-prompt

Cambio `portal-fase0a-base` (kebab-case normalizado del mega-prompt "# MASTER PROMPT — JADECAPITALSUITE"). FASE 0A = Layout base: Sidebar + Topbar con Cmd+K + Semáforo + "+ Nuevo Trade" + Drawer lateral derecho + selector de Tenant.

Sub-agente `sdd-explore` investigó el codebase contra el mega-prompt del roadmap FASE 0A. Reporte completo guardado como artifact `explore` del change `portal-fase0a-base`.

## A) Inventario del portal autenticado actual

El portal `/portal/*` ya tiene ~60% del chrome que pide el mega-prompt.

### A.1 — Componentes que YA EXISTEN

- `TopNav` con brand "JadeCapitalSuite" + `${first_name} ${last_name}` + "Cerrar sesión" (commit `7517afd`). Sticky, backdrop-blur, border-b primary.
- `PortalNav` horizontal sticky bajo `TopNav` con los 6 items (Dashboard, Cuentas, Operaciones, Diario, Playbook, Configuracion). Visible solo en desktop.
- `PortalSidebar` colapsable (240/64) + sessionStorage persistence. Items coinciden con `PortalNav`.
- `PortalShell` wrapper para `/portal/*` con `TopNav` heredado + `PortalNav` + main `Outlet`.
- Glassmorphism primitives: `GlassPanel`, `GlassCard`, `GlassModal` (este último es **modal centrado**, NO drawer).
- Auth context + multi-tenant wireado en backend (commit `1951888`: `workspace_id` FK, JWT `workspace_ids`, `infer_workspace_id`).
- 3 páginas reales: `Dashboard`, `Cuentas` (lista + create), `CuentasDetail` (tabs Resumen/Saldo/Operaciones/Zona peligro + `FundWithdrawModal` + `DeleteAccountDialog`).
- 4 STUBS: `Operaciones`, `Diario`, `Playbook`, `Configuracion`.
- 103 backend tests + 91 frontend tests, todos verdes.
- Tokens `bg #080D12` y `surface #0D141B` ✔️ matchean el mega-prompt.

### A.2 — Componentes que FALTAN

1. **Búsqueda Cmd+K** — no existe ningún command palette ni listener de teclado para search.
2. **Semáforo de Riesgo** — no existe ningún indicador de riesgo diario en UI.
3. **Botón "+ Nuevo Trade"** — no existe. Único botón similar es "Cancelar suscripcion" en Dashboard.
4. **Drawer lateral derecho** — no existe. `GlassModal` es modal CENTRADO. `TopNavMobileDrawer` es para chrome público mobile. Hay que crear `GlassDrawer` primitive.
5. **Selector de Tenant/Workspace** — backend ya tiene `workspace_id` y JWT lo popula; falta UI para elegir workspace activo.

## B) Mapeo mega-prompt vs. codebase (FASE 0A)

| Elemento del mega-prompt | Estado actual | Gap |
|---|---|---|
| Brand "JadeCapitalSuite" en TopNav | ✅ Existe (`TopNav.tsx`) | Ninguno |
| Topbar sticky + glass | ✅ Existe (commit `7517afd`) | Ninguno |
| Cmd+K command palette | ❌ No existe | Crear `CommandPalette.tsx` + listener |
| Semáforo de Riesgo (Topbar) | ❌ No existe | Crear `RiskSemaphore.tsx` (placeholder FASE 0A) |
| Botón "+ Nuevo Trade" en TopNav | ❌ No existe | Crear `NewTradeButton` + drawer |
| Drawer lateral derecho | ❌ No existe | Crear `GlassDrawer` primitive |
| Selector de Tenant/Workspace | ❌ No existe UI; backend ya wireado | Crear `WorkspaceSelector` |
| Sidebar colapsable en desktop | ⚠️ Existe `PortalSidebar` pero `hidden lg:hidden` (mobile-only desde `7517afd`) | Revertir a desktop vertical |
| Nav horizontal de items | ⚠️ Existe `PortalNav` horizontal en desktop | Decidir si se elimina o se coexiste con sidebar |
| Color jade `#2EDC8C` | ❌ Codebase consolidado en cyan `#00FFFF` (mem #70) | Pivot cyan → jade |
| Tokens `bg #080D12` / `surface #0D141B` | ✅ Ya correctos | Ninguno |
| TanStack Query para estado async | ⚠️ Instalado (`@tanstack/react-query@5.59.16`) pero NO usado activamente | Montar `QueryClientProvider` + migrar páginas |
| Zustand para estado global | ❌ No instalado | `npm i zustand` 4.5.x + stores |
| Multi-tenant inferido en backend | ✅ Shipped (commits `544ac1d` → `1951888` → `4b37be0`) | Solo falta UI selector |

## C) Stack conformity check

Comparación contra el stack declarado en `openspec/changes/phase-0-foundation/exploration.md`:

| Capa | Stack declarado | Estado actual | Conformidad |
|---|---|---|---|
| Frontend framework | React 18 + Vite + TS | React 18 + Vite + TS | ✅ |
| Styling | Tailwind v3.4 + tokens Dark Fintech | Tailwind + tokens | ✅ |
| Router | React Router 6 (data router) | React Router 6 | ✅ |
| Server state | TanStack Query 5.x | Instalado, NO montado | ⚠️ Provider ausente |
| Client state | Zustand o `useState` local | Solo `useState` local | ⚠️ Zustand ausente |
| Validation | Zod (mirror de Pydantic) | Zod instalado | ✅ |
| Forms | react-hook-form | Instalado | ✅ |
| Tests | vitest + Testing Library | vitest + Testing Library (91 tests verdes) | ✅ |
| Backend | FastAPI + SQLAlchemy 2.x async + PostgreSQL 16 | Igual | ✅ (no es alcance de este change) |

## D) Routing structure

```
/portal                          → PortalShell (TopNav + Sidebar + Outlet)
  ├─ /portal/dashboard           → DashboardPage (real)
  ├─ /portal/cuentas             → CuentasPage (real — lista + create)
  ├─ /portal/cuentas/:id         → CuentasDetailPage (real — tabs + modals)
  ├─ /portal/operaciones         → OperacionesPage (STUB — FASE 4 dense tables)
  ├─ /portal/diario              → DiarioPage (STUB — FASE 5 timeline)
  ├─ /portal/playbook            → PlaybookPage (STUB — FASE 3 strategies)
  └─ /portal/configuracion       → ConfiguracionPage (STUB — FASE 1+ settings)
```

Decisión de routing para FASE 0A: mantener la estructura. Las features nuevas (Cmd+K, +Nuevo Trade drawer) son chrome que se monta sobre rutas existentes.

## E) Componentes a construir / adaptar para FASE 0A

### E.1 — Nuevos

- `src/components/common/GlassDrawer.tsx` — primitive drawer derecho, slide-in, backdrop, Esc, click-outside, focus trap. API parity con `GlassModal.tsx`.
- `src/components/common/CommandPalette.tsx` — modal Cmd+K, lista de acciones (navigate, open drawer).
- `src/components/common/RiskSemaphore.tsx` — widget 3 estados en Topbar (FASE 0A: placeholder verde + `aria-label="Sin datos de hoy"`).
- `src/components/trades/NewTradeDrawer.tsx` — form right-side via `GlassDrawer`; campos account/instrument/direction/stake/expiry; `POST /api/v1/trades`; TanStack Query mutation.
- `src/components/portal/WorkspaceSelector.tsx` — dropdown al pie del Sidebar; lista de workspaces del user; persist active id en sessionStorage.
- `src/stores/useNewTradeDrawer.ts` — Zustand store.
- `src/stores/useActiveWorkspace.ts` — Zustand store + sessionStorage sync.
- `src/stores/useSidebarCollapsed.ts` — Zustand store (migrar lógica actual de sessionStorage a store).
- `src/stores/useCommandPalette.ts` — Zustand store para `isOpen`.
- `src/hooks/useCommandPalette.ts` — listener global `metaKey+K` / `ctrlKey+K`.
- `src/lib/queryClient.ts` — TanStack Query defaults (`staleTime: 30_000`, `retry: 1`).

### E.2 — Modificados

- `tailwind.config.ts` — Primary color cyan → jade `#2EDC8C`.
- `src/styles/index.css:7-9` — Remove mem #70 cyan override comment; jade tokens.
- `src/components/portal/PortalSidebar.tsx` — Quitar `hidden lg:hidden`; agregar slot `<WorkspaceSelector />` al pie.
- `src/components/portal/PortalShell.tsx` — Wire Sidebar vertical + Topbar (sin `PortalNav`).
- `src/components/common/TopNav.tsx` — Insert Cmd+K trigger + RiskSemaphore + +Nuevo Trade button.
- `src/main.tsx` o `RootShell.tsx` — Montar `<QueryClientProvider>`.
- `src/pages/CuentasPage.tsx` — Migrar de `useEffect + axios` a `useQuery`.
- `src/pages/CuentasDetailPage.tsx` — Idem.
- 100+ archivos con `text-primary` / `bg-primary` / `border-primary` / `glow-cyan` — Pivot jade.

### E.3 — Eliminados / Archivados

- `src/components/portal/PortalNav.tsx` — Decidir: archivo (mem #93 history preserved) o mantener coexistencia con Sidebar en desktop.

## F) Gaps priorizados

1. **Color decision (BLOQUEANTE)** — ¿se mantiene cyan o pivotamos a jade? Sin decisión, no se puede planificar el alcance del refactor de tokens.
2. **Sidebar vs PortalNav en desktop (BLOQUEANTE)** — ¿revertir el cleanup del `7517afd`? ¿Se funden o se ocultan mutuamente?
3. **Zustand + TanStack QueryProvider (BLOQUEANTE)** — sin esto, los stores y migraciones no tienen base. Depende de las decisiones 1 y 2.
4. **CommandPalette Cmd+K** (impacto ALTO, complejidad 4) — depende de Zustand + drawer primitive.
5. **GlassDrawer primitive** (impacto ALTO, complejidad 2) — base para `NewTradeDrawer` y futuro `RiskDrawer`.
6. **NewTradeButton + NewTradeDrawer** (impacto ALTO, complejidad 3) — depende de GlassDrawer + QueryClient + mutation.
7. **WorkspaceSelector + `useActiveWorkspace` hook** (impacto ALTO, complejidad 3) — depende de Zustand; backend ya provee `workspace_ids` en JWT.
8. **RiskSemaphore** (impacto MEDIO, complejidad 3-4) — riesgo de scope creep si se intenta wire a `/api/v1/trades/risk-summary` antes de que exista; placeholder OK para FASE 0A.
9. **TanStack QueryProvider + migración de páginas** (impacto MEDIO, complejidad 3) — base para queries reactivas; Cuentas y CuentasDetail son candidatas directas.

## G) Riesgos / incompatibilidades

### G.1 — Color cyan vs jade (impacto ALTO, complejidad 5)

- Codebase consolidado en `cyan #00FFFF` per mem #70 ("jarvis-hrz visual override").
- CSS `src/styles/index.css:7-9` comenta literal: "VALUES are cyan per mem #70 (jarvis-hrz visual override), NOT jade".
- Mega-prompt pide jade `#2EDC8C` como primary.
- Pivotar a jade = refactor 100+ archivos con literales cyan/primary.
- **Decisión de producto necesaria**: ¿se mantiene cyan o pivotamos a jade?

### G.2 — Sidebar vertical en desktop (impacto ALTO, complejidad 3)

- Mega-prompt: "Sidebar contraíble en desktop".
- Codebase: `PortalNav` horizontal en desktop + `PortalSidebar` mobile-only (`hidden lg:hidden` desde commit `7517afd`).
- **Decisión necesaria**: ¿revertir el cleanup del 7517afd y poner sidebar vertical en desktop? ¿Se funde con `PortalNav` o se ocultan mutuamente?

### G.3 — Stack missing (impacto MEDIO, complejidad 2-3)

- Mega-prompt pide Zustand o Redux para estado global + React Query (TanStack Query) activo.
- Codebase: TanStack Query instalado pero NO usado activamente (las páginas hacen `useEffect + useState + axios` manual).
- Zustand/Redux NO instalado.
- **Decisión necesaria**: ¿sumamos Zustand ahora + montamos QueryClientProvider? ¿O más adelante?

### G.4 — Sin tests para primitives de glass existentes

- `Modal.tsx` y `GlassModal.tsx` NO tienen tests. Si creamos `GlassDrawer`, **forzar tests desde día 1** para no propagar la deuda.

### G.5 — `RiskSemaphore` sin data source

- No existe `/api/v1/trades/risk-summary`. Scope creep si se intenta wire; placeholder green + `aria-label="Sin datos de hoy"` es la salida segura para FASE 0A.

## Recomendación al orquestador

- **NO lanzar `sdd-propose`** hasta resolver las 3 decisiones de scope. Sin esas respuestas, la propuesta queda con assumptions riesgosas.
- Una vez resueltas, `sdd-propose` debe:
  - Capturar las decisiones en la sección `## Decision summary`.
  - Mantener el orden de olas: install providers → pivot tokens → shell restore → drawer primitive → topbar additions → trade drawer → command palette.
  - Dividir olas grandes (pivot jade: tokens → primitives → public pages → portal pages) para mantener PRs < 400 líneas.
- Aprendido:
  1. El codebase está más cerca del mega-prompt de lo que parece — la mayoría del chrome existe, solo falta adaptar/agregar lo explícito del roadmap.
  2. El "selector de tenant" del mega-prompt NO es el `PortalSelector` que ya existe (ese es para user-vs-admin). Es el workspace picker multi-tenant que falta.
  3. El portal actual está visualmente coherente (cyan + glass + monospace + tokens Dark Fintech). Pivotar a jade sería una reescritura de brand, no un cambio técnico.
  4. Los primitives de glass son el patrón a extender (no reescribir). Si creamos `GlassDrawer`, sigue la API de `GlassModal`.
  5. Tests existentes NO cubren `Modal.tsx` ni `GlassModal.tsx`. Si creamos `GlassDrawer`, **forzar tests desde día 1**.

## Ready for Proposal

**Yes** (condicional) — Las decisiones de scope (cyan vs jade, sidebar vs PortalNav, Zustand ahora vs después) deben ser capturadas por el orchestrator del usuario antes de `sdd-propose`. Una vez confirmadas, `sdd-propose` puede generar el `proposal.md` siguiendo las 6 olas de implementación sugeridas.
