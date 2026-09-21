# Jarvis UI Redesign — feature doc

**Feature**: jarvis-ui-redesign
**Branch**: `feat/jarvis-ui-redesign`
**Created**: 2026-09-17
**Author**: el Gentleman (Pi orchestrator)
**Strict TDD**: enabled (`openspec/config.yaml` mandates it)

## Goal

Rehacer la UI completa de JadeCapitalSuite con estética JARVIS (Iron Man HUD) según la imagen de referencia entregada por el usuario (`/tmp/pi-clipboard-6b834fad-3bf1-4ce3-850a-3a3ac71d9715.png`):

- Fondo oscuro `#060B10` con imagen sutil de servidor/sala de cómputo (radial gradient + opcional foto)
- Acento cyan brillante `#00E5FF` con glow neón
- Tipografía HUD: Orbitron/Rajdhani para títulos, JetBrains Mono para números, Inter para body
- Paneles con bordes cyan brillantes y cristal esmerilado (`HudPanel`)
- Anillos de progreso con doble track (HUD rings)
- Scanlines sutiles y decor DotGrid/NeuralNetwork (ya existentes)
- Header persistente con brand "JARDE CAPITAL SUITE · CORE INTERFACE"
- Watermark "JARVIS" en esquinas
- Indicador online en sidebar (punto verde)
- Layout denso: 4 KPIs en línea + sesión cards + curvas + feed

## Alcance

- **Portal autenticado** (9 páginas): `/dashboard`, `/cuentas`, `/cuentas/:id`, `/diario`, `/disciplina`, `/operaciones`, `/playbook`, `/scanner`, `/configuracion`
- **Landing pública** (4+ páginas): `/`, `/pricing`, `/features`, `/about`
- **Auth** (login, register, forgot, etc.): mismas reglas visuales

## No-goals

- No tocar backend (`backend/`).
- No tocar lógica de stores Zustand ni queries TanStack.
- No agregar features nuevas (el rediseño es cosmético).
- No cambiar endpoints ni contratos de API.
- No romper tests existentes (836 passing + 32 todo).
- No eliminar componentes — solo refactorizar capas visuales.

## Estrategia

1. **Theme tokens primero**: extender `themes.css` + `tailwind.config.ts` con tokens JARVIS nuevos (HUD ring doble, scanlines, watermark, gradient fondo, jarvis corners).
2. **Primitives nuevos** (componentes UI sin lógica): `HudPanel`, `HudRing`, `HudCorner`, `JarvisWatermark`, `ServerRoomBackground`, `HudButton`, `HudDivider`.
3. **Shell unificado**: refactor de `PortalShell` (header + sidebar compacto + footer con watermark + grid background).
4. **Dashboard piloto**: aplicar todo el sistema nuevo.
5. **Iterar página por página** (8 restantes del portal).
6. **Landing pública** (4 páginas + auth).
7. **Verificación**: typecheck + test + lint + build + screenshots + README.

## Tasks

(Ver todo list del orquestador para el detalle actual.)

| ID | Task | Estado | LOC est. |
|---|---|---|---|
| T-01 | Setup: feature doc + memoria + todo list | in_progress | — |
| T-02 | Theme tokens JARVIS (themes.css + tailwind) | pending | ~80 |
| T-03 | Primitive `HudPanel` (panel con border cyan + glow) | pending | ~60 |
| T-04 | Primitive `HudRing` (anillo progreso con doble track) | pending | ~80 |
| T-05 | Primitive `HudCorner` (marca de esquina estilo HUD) | pending | ~40 |
| T-06 | Primitive `JarvisWatermark` (logo JARVIS en esquinas) | pending | ~50 |
| T-07 | Primitive `ServerRoomBackground` (gradient + opcional imagen) | pending | ~50 |
| T-08 | Primitive `HudButton` (botón outlined cyan + glow) | pending | ~40 |
| T-09 | Primitive `HudDivider` (separador con notches HUD) | pending | ~30 |
| T-10 | Refactor `PortalShell` (header unificado + grid bg) | pending | ~80 |
| T-11 | Refactor `PortalSidebar` (compacto + iconos + online indicator) | pending | ~80 |
| T-12 | Refactor `DashboardPage` (layout nuevo) | pending | ~150 |
| T-13 | Refactor `CuentasPage` | pending | ~80 |
| T-14 | Refactor `CuentasDetailPage` | pending | ~80 |
| T-15 | Refactor `DiarioPage` | pending | ~80 |
| T-16 | Refactor `OperacionesPage` | pending | ~80 |
| T-17 | Refactor `PlaybookPage` | pending | ~60 |
| T-18 | Refactor `ScannerPage` | pending | ~60 |
| T-19 | Refactor `DisciplinaTab` | pending | ~60 |
| T-20 | Refactor `ConfiguracionPage` | pending | ~60 |
| T-21 | Refactor Landing home `/` | pending | ~120 |
| T-22 | Refactor Landing `/pricing` | pending | ~80 |
| T-23 | Refactor Landing `/features` | pending | ~60 |
| T-24 | Refactor Landing `/about` | pending | ~60 |
| T-25 | Refactor Auth pages (login, register, forgot) | pending | ~100 |
| T-26 | Verificación final (test + lint + build + screenshots) | pending | — |
| T-27 | Docs README + screenshots | pending | ~60 |

**Total LOC est.**: ~1900

## Review workload forecast

- 27 tasks
- ~1900 LOC total
- Average ~70 LOC/task → cada commit revisable individualmente
- Chained PRs recomendadas por slice:
  - PR 1: T-02 a T-09 (Sistema + primitives, ~430 LOC)
  - PR 2: T-10 a T-12 (Shell + Dashboard piloto, ~310 LOC)
  - PR 3: T-13 a T-20 (Resto portal, ~560 LOC)
  - PR 4: T-21 a T-25 (Landing + auth, ~420 LOC)
  - PR 5: T-26 a T-27 (Verificación + docs, ~60 LOC)

## Acceptance gates (per task)

- `pnpm test` verde (test count crece o se mantiene).
- `pnpm typecheck` clean.
- `pnpm lint` clean (allow-list actualizada si hay nuevos hex literales).
- `pnpm build` succeeded.
- Coverage thresholds (80/75/80/80) mantenidas.
- Screenshot de la página refactorizada (cuando aplique).
- Conventional Commits + NO `Co-Authored-By` trailer + NO emojis.

## Notas para retomar

- **Backup rama vieja**: `archive/dashboard-jarvis-fidelity-2026-09-17` (178 commits).
- **OpenSpec anterior archivado**: `openspec/changes/archive/2026-09-17-core-interface-redesign/`.
- **Tests baseline**: 836 passing + 32 todo.
- **Working copy**: stash con `useCountUp.test.ts` modificado.
- **Imagen de referencia**: `/tmp/pi-clipboard-6b834fad-3bf1-4ce3-850a-3a3ac71d9715.png`.

## Próximo paso

Empezar por T-02 (theme tokens) y primitives (T-03 a T-09) antes de tocar páginas. Esto da base sólida para iterar.
