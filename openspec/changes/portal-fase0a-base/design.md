# Design: portal-fase0a-base — Adapt JCS Portal to Mega-Prompt FASE 0A

## 1. Architecture overview

The change layers five cohesive subsystems onto the existing portal chrome: a **jade color system** (token pivot), a **vertical collapsible portal shell** (sidebar + topbar), a **right-side glass drawer** (primitive), a **Cmd+K command palette** (built on `cmdk`), and the **TanStack Query + Zustand** state plane. The mega-prompt's chrome already exists in ~60% — we replace cyan with jade, restore the desktop sidebar, and add the missing Cmd+K / +Nuevo Trade / RiskSemaphore / WorkspaceSelector pieces. The 9 specs define WHAT; this document defines HOW.

```
AppShell (root, public + portal aware)
├── TopNav                  (src/layout/TopNav.tsx — modified: insert Cmd+K, RiskSemaphore, +Nuevo Trade)
├── PortalShell             (src/components/portal/PortalShell.tsx — modified: drop PortalNav)
│   ├── PortalSidebar       (src/components/portal/PortalSidebar.tsx — modified: remove hidden lg:hidden, slot WorkspaceSelector)
│   │   ├── SidebarHeader   (new — extracted brand row)
│   │   ├── SidebarNav      (new — items + active state)
│   │   └── SidebarFooter   (new — WorkspaceSelector + CollapseToggle)
│   └── main > <Outlet />
├── GlassDrawer             (new primitive — common/GlassDrawer.tsx)
│   └── NewTradeDrawer      (new — features/trades/NewTradeDrawer.tsx)
└── CommandPalette          (new — common/CommandPalette.tsx)
```

## 2. Architecture decisions (gaps closed)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Cmd+K library | **`cmdk`** (~5KB, 0 deps, MIT) | Fuzzy match + a11y (↑↓ Enter Esc) + empty/loading states built-in; saves ~150 LOC of keyboard plumbing; default per spec. |
| 2 | Wave 1 (jade pivot) split | **5 sub-PRs (1a–1e) ≤400 LOC each** | `tokens` (~50) → `primitives` (~150) → `public pages` (~300) → `portal pages` (~200) → `forms/auth` (~150). Each carries a Playwright screenshot baseline. |
| 3 | `PortalNav` | **Archive** (return `null`, leading comment, drop import) | Per spec; history preserved. File not deleted so commit archaeology remains intact for FASE rollback. |
| 4 | Store boundaries | **Zustand = UI/transient + 2 persisted; TanStack = all server-state** | No store holds server data (per `zustand-stores` spec). See table below. |
| 5 | GlassDrawer animation | **CSS transitions only** (`transition-transform duration-200 ease-out` + `translate-x-full`/`translate-x-0`) | Project ships zero animation deps; framer-motion would add ~30KB; `prefers-reduced-motion` already honored globally in `index.css`. |
| 6 | RiskSemaphore data source | **Placeholder FASE 0A** — local Zustand `useRiskLevel` defaults `'green'`, TODO `// FASE 4: bind to /api/v1/trades/risk-summary` | Backend endpoint not in spec scope; wire deferred to FASE 4+ to avoid scope creep. |

## 3. Store boundaries

| Concern | Owner | Storage |
|---|---|---|
| Account list / detail | `useQuery(['accounts', wsId])`, `useQuery(['account', id])` | TanStack |
| Workspace list of accounts / mutations | TanStack `useMutation` (invalidates `['accounts']`, `['trades']`) | TanStack |
| Trade create mutation | `useMutation` + `openTradeApi` | TanStack |
| Active workspace | `useActiveWorkspace` | Zustand + sessionStorage `jcs.active.workspace_id` |
| Sidebar collapsed | `useSidebarCollapsed` | Zustand + sessionStorage `jcs.portal.sidebar.collapsed` |
| Drawer open (`+ Nuevo Trade`) | `useNewTradeDrawer` | Zustand ephemeral |
| CommandPalette open | `useCommandPalette` | Zustand ephemeral |
| Risk level (FASE 0A) | `useRiskLevel` (local) | Zustand ephemeral (defaults `'green'`) |

All four required stores live in `src/stores/*.ts`, typed via `create<T>()(devtools(...))`. Devtools middleware wrapped in `if (import.meta.env.DEV)` so it tree-shakes in prod.

## 4. Color system (jade pivot)

**Tokens** — extend `tailwind.config.ts`:

```ts
colors: {
  primary: { DEFAULT: '#2EDC8C', dk: '#25B070', light: '#7FE9B5', glow: '#2EDC8C' },
  'primary-fg': '#080D12',  // text on primary
  // bg/surface/profit/loss unchanged
}
```

**Glow rules** — `glow-primary` and `text-gradient-primary` opt-in only via `[data-glow-primary]` on `.brand`, `h1`, `h2`. Numeric data: `font-mono` + solid `text-profit`/`text-loss`, no glow.

**Refactor waves 1a–1e** — see §7.

## 5. PortalShell + Sidebar restore

**Files**

- Modified `src/components/portal/PortalShell.tsx`: drop `<PortalNav />` import, drop local `useState + sessionStorage` (replaced by `useSidebarCollapsed`).
- Modified `src/components/portal/PortalSidebar.tsx`: remove `hidden lg:hidden` from root `<aside>`; add `WorkspaceSelector` slot at footer; mobile (<lg) renders as left-side drawer overlay controlled by Topbar burger.
- New `src/components/portal/SidebarHeader.tsx`, `SidebarNav.tsx`, `SidebarFooter.tsx` (extracted; same DOM contract).
- New `src/components/portal/WorkspaceSelector.tsx`: reads `useAuth().user.workspaces`; calls `useActiveWorkspace().setWorkspaceId(id)`; disabled when count === 1 with tooltip "Solo tenés un workspace".

**`PortalNav` archive** — file kept at `src/components/portal/PortalNav.tsx` with leading comment `// ARCHIVED por portal-fase0a-base — see proposal.md`; body `return null`. `PortalShell.tsx` stops importing it.

## 6. GlassDrawer primitive

**File**: `src/components/common/GlassDrawer.tsx` (+ `GlassDrawer.test.tsx`). **API parity** with `GlassModal` but anchor-based.

```ts
interface GlassDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly side?: 'right' | 'left';      // default 'right'
  readonly maxWidth?: 'sm'|'md'|'lg'|'xl'|'2xl'|'full'; // default 'md'
  readonly variant?: GlassVariant;        // mirrors GlassPanel
  readonly closeOnBackdropClick?: boolean; // default true
  readonly closeOnEscape?: boolean;        // default true
  readonly title?: ReactNode;
  readonly footer?: ReactNode;
  readonly panelClassName?: string;
  readonly children: ReactNode;
}
```

**Implementation**: standalone (does NOT compose `Modal.tsx` — that's centered). Backdrop `z-40` (`bg-black/60`); panel `z-50`; slide-in via `transition-transform duration-200 ease-out`; focus trap via `useRef` + `useEffect` (no library); restore focus to invoker on close. Esc handler removed on unmount.

## 7. CommandPalette

**Library**: `cmdk` (`npm i cmdk@^0.2`). Wrapper at `src/components/common/CommandPalette.tsx` uses `Command`, `Command.Input`, `Command.List`, `Command.Item`, `Command.Empty`. Lazy-imported via `React.lazy` to keep initial bundle clean.

**Action registry** (declarative, in `src/components/common/commandActions.ts`):

```ts
export const COMMAND_ACTIONS: readonly CommandAction[] = [
  { id: 'nav.dashboard', label: 'Ir a Dashboard', shortcut: 'G D', run: (api) => api.navigate('/portal/dashboard') },
  // 5 more nav.*
  { id: 'trade.new', label: 'Abrir Nuevo Trade', shortcut: '⌘ N', run: (api) => api.openTradeDrawer() },
  { id: 'auth.logout', label: 'Cerrar sesión', run: (api) => api.logout() },
];
```

**Global listener** at `src/hooks/useCommandPaletteHotkey.ts` registers `keydown` on `window`; ignores presses where `event.target` is `<input>`/`<textarea>`/`[contenteditable]`.

## 8. NewTradeDrawer

**Files**

- New `src/features/trades/NewTradeDrawer.tsx` (uses `GlassDrawer`).
- New `src/features/trades/NewTradeForm.tsx` (RHF + Zod).
- New `src/features/trades/useCreateTrade.ts` (`useMutation`).
- New `src/features/trades/schemas.ts` (Zod discriminated union — mirror of `CreateTradePayload`).
- Existing `src/features/trades/api.ts` (`openTradeApi`) consumed via `useMutation`.

**Zod schema** (mirrors backend `CreateTradePayload` from `src/features/trades/types.ts`):

```ts
const ForexSchema = z.object({
  account_id: z.string().uuid(),
  type: z.literal('FOREX'),
  pair: z.string().min(1),
  direction: z.enum(['LONG', 'SHORT']),
  entry_price: z.coerce.number().positive(),
  lot_size: z.coerce.number().positive().max(100),
  stop_loss: z.coerce.number().positive().optional(),
  take_profit: z.coerce.number().positive().optional(),
  pre_trade_notes: z.string().max(2000).optional(),
});

const BinarySchema = z.object({
  account_id: z.string().uuid(),
  type: z.literal('BINARY'),
  investment_usd: z.coerce.number().positive().max(10000),
  expiration_seconds: z.number().int().positive().max(86400),
  payout_pct: z.coerce.number().min(70).max(1000),
  direction: z.enum(['CALL', 'PUT']),
});

export const TradeSchema = z.discriminatedUnion('type', [ForexSchema, BinarySchema]);
```

Wire format uses strings (backend `Decimal`); the form coerces to number for validation and back to string before submit (via `transform`).

**Mutation flow**: submit → RHF validates → Zod parses → `useCreateTrade.mutate(payload)` → `POST /trades` → onSuccess: invalidate `['accounts']`, `['trades']`, close drawer, toast. onError: render envelope `{code, message, fields}` in glass alert; keep drawer open.

## 9. RiskSemaphore (FASE 0A placeholder)

`src/components/common/RiskSemaphore.tsx` reads `useRiskLevel(s => s.level)` (default `'green'`), renders a dot + `aria-label="Riesgo: ${level}"`. Carries `// TODO (FASE 4): bind to /api/v1/trades/risk-summary`. Renders in `TopNav` between brand and Cmd+K trigger on `lg+` only.

## 10. Wave split (11 sub-PRs)

| Wave | Scope | LOC | Files (primary) |
|---|---|---|---|
| **0** | `npm i zustand@^4.5 cmdk@^0.2` + `src/lib/queryClient.ts` defaults + remove `enabled:false` in `main.tsx` | ~80 | `package.json`, `src/lib/queryClient.ts`, `src/main.tsx` |
| **1a** | Jade tokens (`tailwind.config.ts`, `src/styles/index.css`) | ~50 | config + CSS vars |
| **1b** | Jade primitives (`Glass{Panel,Card,Modal}`) | ~150 | common primitives |
| **1c** | Jade public pages (Home, Pricing, Features, About, Contact) | ~300 | `src/components/home/*`, `pricing/*`, `features/*`, `about/*`, `home/Contact*` |
| **1d** | Jade portal pages (`DashboardPage`, `CuentasPage`, stubs) | ~200 | `src/pages/*` |
| **1e** | Jade forms + auth (Login, Register, auth components) | ~150 | `src/features/auth/*`, auth pages |
| **2** | Sidebar restore + `PortalNav` archive + `WorkspaceSelector` mount + 4 stores | ~250 | `PortalSidebar.tsx`, `PortalShell.tsx`, `src/stores/*`, `WorkspaceSelector.tsx` |
| **3** | `GlassDrawer` primitive + tests | ~150 | `src/components/common/GlassDrawer.tsx` |
| **4** | Topbar additions: `RiskSemaphore` + Cmd+K trigger + `+ Nuevo Trade` | ~250 | `src/layout/TopNav.tsx`, `RiskSemaphore.tsx`, `commandActions.ts` |
| **5** | `NewTradeDrawer` + form + mutation (`useQuery` migration of Cuentas pages) | ~350 | `src/features/trades/*`, `CuentasPage.tsx`, `CuentasDetailPage.tsx`, `src/features/accounts/hooks.ts` |
| **6** | `CommandPalette` + `cmdk` + hotkey listener + tests | ~200 | `CommandPalette.tsx`, `useCommandPaletteHotkey.ts` |

Total ~2130 LOC across 11 sub-PRs, none >400 LOC.

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Jade pivot regresses visual consistency | Per sub-PR Playwright screenshot diff (baseline + after; fail if >5% pixels). |
| `cmdk` bundle size | Lazy-import `CommandPalette`; only loads when palette opens. |
| TanStack Query cache stale | Defaults: `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`; documented in `src/lib/queryClient.ts`. |
| WorkspaceSelector with 1 workspace | Disabled dropdown + tooltip "Solo tenés un workspace". |
| RiskSemaphore scope creep | FASE 0A = placeholder green only; TODO explicitly references FASE 4 spec. |
| Zod coerce on Decimal-as-string fields | `z.coerce.number()` for validation; transform back to string at submit via `.transform(v => String(v))`. |
| NewTradeDrawer leaves stale form on error | Form state preserved in drawer; user retries. |

## 12. Migration / Rollout

No DB migration. Each wave is a self-contained commit; mem #70 cyan tokens can be re-applied via `git revert`. Removing `<QueryClientProvider>` reverts to current `useEffect + axios` behavior (queries would be no-ops since none are wired yet beyond waves 5+).

## 13. Out of scope

Backend changes (none — all APIs exist); auth refactor; mobile app; i18n system; full Playwright E2E (unit + integration only); server-side hydration; cross-tab state sync; `X-Workspace-Id` header (deferred per `workspace-selection` spec).

## Open questions

None blocking. Non-blocking: `payout_pct` upper bound (1000 vs realistic 95) is defensive ceiling, not a product decision.