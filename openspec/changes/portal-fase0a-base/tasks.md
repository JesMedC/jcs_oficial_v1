# Tasks: portal-fase0a-base

> Total estimated: ~2130 LOC across **11 stacked sub-PRs** (each ≤400 LOC, independent revert boundary).
> Strategy: stacked-to-main. Each wave = 1 commit, conventional commit, no `Co-Authored-By`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2130 LOC across 11 sub-PRs |
| Per-PR ceiling | 400 LOC (each sub-PR is well below) |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | PR #1 → #11 (wave 0, 1a–1e, 2–6) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 0 | Provider plumbing (Zustand + QueryClient) | PR #1 | `pnpm test` (91/91) | N/A (no new feature, additive provider) | revert commit; behavior unchanged |
| 1a | Jade tokens (config + CSS vars) | PR #2 | `pnpm test` + Playwright screenshot baseline | Playwright dev server 1440×900 | revert `tailwind.config.ts` + `src/styles/index.css` |
| 1b | Glass primitives jade | PR #3 | `pnpm test` + Playwright diff primitives | Playwright dev server | revert `Glass{Panel,Card,Modal}.tsx` |
| 1c | Public pages jade | PR #4 | `pnpm test` + Playwright diff public pages | Playwright dev server | revert public-page files |
| 1d | Portal pages jade | PR #5 | `pnpm test` + Playwright diff portal pages | Playwright dev server | revert portal-page files |
| 1e | Forms + auth jade | PR #6 | `pnpm test` + Playwright diff auth | Playwright dev server | revert auth files |
| 2 | Sidebar restore + Zustand stores + WorkspaceSelector | PR #7 | `pnpm test` + Playwright E2E login→sidebar persist | Playwright dev server + vitest | revert `PortalShell.tsx` + `PortalSidebar.tsx` + stores |
| 3 | GlassDrawer primitive | PR #8 | `pnpm test` | vitest + RTL | delete `GlassDrawer.tsx` + imports |
| 4 | Topbar additions (RiskSemaphore + Cmd+K trigger + +Nuevo Trade) | PR #9 | `pnpm test` + Playwright topbar render | Playwright dev server | revert `src/layout/TopNav.tsx` + new widgets |
| 5 | NewTradeDrawer + RHF+Zod + useCreateTrade + useQuery migration | PR #10 | `pnpm test` + Playwright drawer flow | Playwright dev server | delete `src/features/trades/*` + revert pages |
| 6 | CommandPalette + cmdk + global hotkey | PR #11 | `pnpm test` + Playwright Cmd+K + Ctrl+K | Playwright dev server | delete `CommandPalette.tsx` + hotkey hook |

## Wave 0 — Foundation: Zustand + TanStack QueryProvider

- [x] Add `zustand@^4.5.5` to `package.json` dependencies
- [x] Add `cmdk@^0.2` to `package.json` dependencies
- [x] `pnpm install` completes without peer-dep errors
- [x] Create `src/lib/queryClient.ts` exporting a `QueryClient` with `defaultOptions.queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false }`
- [x] Export `queryClient` as named export and use `import.meta.env.DEV` to wrap devtools only in dev
- [x] In `src/main.tsx`: remove the `<QueryClientProvider enabled={false}>` guard and mount `<QueryClientProvider client={queryClient}>` wrapping `<RouterProvider>`/`<App/>`
- [x] Verify: `pnpm test` reports 88/91 passing preexistentes (no regression — Wave 2 arregla los 3 rotos laterales)
- [x] Verify: `pnpm typecheck` zero NEW errors (3 preexistentes: AdminAnalyticsPage PaymentRow PortalNav)
- [x] Verify: `pnpm lint` zero NEW errors (pre-existing no-undef + unused vars)
- [x] Commit: `feat(frontend): add zustand + cmdk + tanstack queryclient foundation`

## Wave 1a — Jade tokens

- [x] Edit `tailwind.config.ts`: set `colors.primary.DEFAULT` from `#00FFFF` to `#2EDC8C`
- [x] Edit `tailwind.config.ts`: set `colors.primary.dk` `#25B070`, `colors.primary.light` `#7FE9B5`, `colors.primary.glow` `#2EDC8C`
- [x] Edit `tailwind.config.ts`: add `'primary-fg': '#080D12'` (foreground on primary surfaces)
- [x] Edit `src/styles/index.css`: replace CSS vars `--color-primary` and friends with jade values; update comment to "VALUES are jade per portal-fase0a-base"
- [x] Edit `src/styles/index.css`: add `.text-financial { font-family: 'JetBrains Mono', monospace }` utility (no glow)
- [x] Edit `src/styles/index.css`: add `.glow-primary { text-shadow: 0 0 20px rgba(46, 220, 140, 0.4) }` — usage restricted via linter comment or design review to `.brand`, `h1`, `h2`, `[data-glow-primary]`
- [x] Generate baseline screenshots at `.playwright-mcp/jade-pivot/baseline_home.png`, `baseline_pricing.png`, `baseline_login.png` — viewport 1440×900, no cache (public pages only; Wave 1d captures portal baselines after auth)
- [x] Verify: `pnpm test` 88/91 (3 preexistentes intactos)
- [x] Verify: `pnpm typecheck` zero new errors
- [x] Verify: `pnpm lint` zero new errors
- [x] Verify: `rg -n 'cyan|#00FFFF|glow-cyan' src/ tailwind.config.ts` still matches (this wave only changes tokens, not usages)
- [x] Commit: `feat(design): pivot primary color tokens cyan → jade (#2EDC8C)`

## Wave 1b — Jade primitives

- [x] `src/components/common/GlassPanel.tsx`: replace cyan literals with jade tokens (verify none remain)
- [x] `src/components/common/GlassCard.tsx`: replace cyan literals with jade tokens (prop `glow='cyan'` -> `'jade'`, className `glow-cyan-sm` -> `glow-jade-sm`)
- [x] `src/components/common/GlassModal.tsx`: replace cyan literals with jade tokens (comment only)
- [x] If any primitive hardcodes `#00FFFF` / `cyan`, refactor to `text-primary` / `bg-primary` / `border-primary` tokens
- [x] Verify: `rg -n '#00FFFF|\bcyan\b' src/components/common/` returns zero matches
- [x] Verify: `pnpm test` 88/91 (3 preexistentes intactos)
- [x] Verify: Playwright screenshot diff skipped — primitives no son visibles sin consumidores públicos/portal; Wave 1c/1d cubren las páginas
- [x] Commit: `feat(design): apply jade tokens to glass primitives`

## Wave 1c — Jade public pages

- [x] `src/pages/HomePage.tsx`: replace cyan literals with jade tokens (zero literals — file already token-driven)
- [x] `src/pages/PricingPage.tsx`: replace cyan literals (zero — token-driven)
- [x] `src/pages/FeaturesPage.tsx`: replace cyan literals (comment updated)
- [x] `src/pages/AboutPage.tsx`: replace cyan literals (zero — token-driven)
- [x] `src/pages/_stub.tsx` (ContactPage): replace cyan literals (zero — token-driven)
- [x] `src/components/home/Hero.tsx`: replace cyan literals (comments refreshed)
- [x] `src/components/home/AboutTeaser.tsx`: replace cyan literals (zero — token-driven)
- [x] `src/components/home/CtaStrip.tsx`: replace cyan literals (comment updated)
- [x] `src/components/home/ContactTeaser.tsx`: replace cyan literals (zero — token-driven)
- [x] `src/components/about/MissionSection.tsx` (path corrected): pivot hex `#00FFFF` -> `#2EDC8C` for chart stroke / circles; `cyanFill` gradient id -> `jadeFill`
- [x] `src/components/home/FeaturesGrid.tsx` (extra, in src/components/home/): pivot hex `#00FFFF` -> `#2EDC8C` for SVG stroke
- [x] `src/components/home/DashboardPreview.tsx` (extra): pivot hex `#00FFFF` -> `#2EDC8C` for chart-line stroke
- [x] Verify: `rg -n '#00FFFF|\bcyan\b|glow-cyan' src/pages src/components/home` for Wave 1c scope files only — zero. Other matches remain for Wave 1d (portal) + Wave 1e (auth) scope.
- [x] Verify: `pnpm test` 88/91 (3 preexistentes intactos)
- [x] Verify: Playwright screenshot diff manual (re-captures in Wave 1d/1e)
- [x] Commit: `feat(design): apply jade tokens to public pages`

## Wave 1d — Jade portal pages

- [ ] `src/pages/portal/DashboardPage.tsx`: replace cyan literals
- [ ] `src/pages/portal/CuentasPage.tsx`: replace cyan literals
- [ ] `src/pages/portal/CuentasDetailPage.tsx`: replace cyan literals
- [ ] `src/pages/portal/OperacionesPage.tsx` (stub): replace cyan literals
- [ ] `src/pages/portal/DiarioPage.tsx` (stub): replace cyan literals
- [ ] `src/pages/portal/PlaybookPage.tsx` (stub): replace cyan literals
- [ ] `src/pages/portal/ConfiguracionPage.tsx` (stub): replace cyan literals
- [ ] `src/components/portal/FundWithdrawModal.tsx`: replace cyan literals
- [ ] `src/components/portal/DeleteAccountDialog.tsx`: replace cyan literals
- [ ] `src/components/portal/SubscriptionCard.tsx`: replace cyan literals
- [ ] `src/components/portal/UpgradeCard.tsx`: replace cyan literals
- [ ] `src/components/portal/Modal.tsx`: replace cyan literals
- [ ] Verify: `rg -n '#00FFFF|\bcyan\b|glow-cyan' src/pages/portal src/components/portal` returns zero matches
- [ ] Verify: `pnpm test` 91/91
- [ ] Verify: Playwright E2E login → /portal/dashboard → /portal/cuentas → /portal/cuentas/:id — screenshot diff <5%
- [ ] Commit: `feat(design): apply jade tokens to portal pages`

## Wave 1e — Jade forms + auth

- [ ] `src/pages/LoginPage.tsx`: replace cyan literals
- [ ] `src/pages/RegisterPage.tsx`: replace cyan literals
- [ ] `src/pages/NotFoundPage.tsx`: replace cyan literals
- [ ] `src/features/auth/LoginForm.tsx`: replace cyan literals
- [ ] `src/features/auth/RegisterForm.tsx`: replace cyan literals
- [ ] `src/features/auth/PortalSelector.tsx`: replace cyan literals
- [ ] Verify: `rg -n '#00FFFF|\bcyan\b|glow-cyan' src/pages/LoginPage.tsx src/pages/RegisterPage.tsx src/pages/NotFoundPage.tsx src/features/auth` returns zero matches
- [ ] Verify: `pnpm test` 91/91
- [ ] Verify: Playwright screenshot diff Login, Register, PortalSelector pages — diff <5%
- [ ] Verify: `rg -n '#00FFFF|\bcyan\b|glow-cyan' src/ tailwind.config.ts` returns zero matches (full SPA pivot complete)
- [ ] Commit: `feat(design): apply jade tokens to auth pages + forms`

## Wave 2 — Sidebar restore + Zustand stores + WorkspaceSelector

- [ ] Create `src/stores/useNewTradeDrawer.ts` — Zustand store `{ isOpen: boolean, open, close, toggle }`
- [ ] Create `src/stores/useCommandPalette.ts` — Zustand store `{ isOpen: boolean, open, close, toggle }`
- [ ] Create `src/stores/useRiskLevel.ts` — Zustand store `{ level: 'green'|'yellow'|'red', set }` (FASE 0A placeholder defaults `green`)
- [ ] Create `src/stores/useSidebarCollapsed.ts` — Zustand store with sessionStorage sync key `jcs.portal.sidebar.collapsed`; API `{ isCollapsed, toggle, set }`
- [ ] Create `src/stores/useActiveWorkspace.ts` — Zustand store with sessionStorage sync key `jcs.active.workspace_id`; API `{ workspaceId, setWorkspaceId, clear }` per `workspace-selection` spec
- [ ] Create `src/components/portal/SidebarHeader.tsx` — extract brand row from current `PortalSidebar`
- [ ] Create `src/components/portal/SidebarNav.tsx` — extract items + active state
- [ ] Create `src/components/portal/SidebarFooter.tsx` — extract footer with WorkspaceSelector slot + collapse toggle
- [ ] Create `src/components/portal/WorkspaceSelector.tsx` — reads `useAuth().user.workspaces`; calls `useActiveWorkspace().setWorkspaceId`; disabled with tooltip "Solo tenés un workspace" when count === 1
- [ ] Edit `src/components/portal/PortalSidebar.tsx`: remove `hidden lg:hidden` from root `<aside>`; replace local `useState` with `useSidebarCollapsed`; mount `<WorkspaceSelector />` at footer; compose `SidebarHeader` + `SidebarNav` + `SidebarFooter`
- [ ] Edit `src/components/portal/PortalShell.tsx`: remove `import PortalNav`; remove `<PortalNav />` usage; keep Sidebar + Topbar wiring
- [ ] Edit `src/components/portal/PortalNav.tsx`: add leading comment `// ARCHIVED por portal-fase0a-base — see proposal.md`; replace body with `return null`
- [ ] Tests in `src/stores/*.test.ts`: round-trip persistence, default values, `setWorkspaceId` writes sessionStorage, single-workspace disabled, drawer toggle idempotent
- [ ] Tests in `src/components/portal/WorkspaceSelector.test.tsx`: dropdown open/close, role + plan_tier row content, disabled state for single-workspace users
- [ ] Verify: `pnpm test` 91/91 + new tests passing
- [ ] Verify: `pnpm typecheck` clean
- [ ] Verify: `pnpm lint` clean
- [ ] Verify: Playwright E2E login → /portal/dashboard → sidebar visible desktop ≥1024px → toggle collapse → reload (persists) → toggle expand → reload (persists)
- [ ] Verify: Playwright E2E workspace selector dropdown opens, item click updates store + sessionStorage
- [ ] Commit: `feat(portal): restore vertical sidebar + archive PortalNav + 4 zustand stores + WorkspaceSelector`

## Wave 3 — GlassDrawer primitive

- [ ] Create `src/components/common/GlassDrawer.tsx` with props interface: `open`, `onClose`, `side?='right'|'left'`, `maxWidth?='sm'|'md'|'lg'|'xl'|'2xl'|'full'`, `variant?: 'subtle'|'default'|'strong'`, `closeOnBackdropClick?=true`, `closeOnEscape?=true`, `title?`, `footer?`, `panelClassName?`, `children`, `ariaLabel?`
- [ ] Implement slide-in via CSS `transition-transform duration-200 ease-out` with `translate-x-full` ↔ `translate-x-0` (right) or `-translate-x-full` ↔ `translate-x-0` (left)
- [ ] Implement backdrop `bg-black/60` z-40 with click → `onClose` (when `closeOnBackdropClick`)
- [ ] Implement `Escape` keydown listener registered on `window` with cleanup on unmount (when `closeOnEscape`)
- [ ] Implement focus trap via `useRef` + `useEffect`: capture first/last focusable, cycle Tab/Shift+Tab within drawer
- [ ] Implement focus restoration: on close, return focus to the element that had focus before opening
- [ ] Use `aria-modal="true"` and `role="dialog"` on panel; backdrop is `aria-hidden="true"`
- [ ] Export from `src/components/common/index.ts`
- [ ] Create `src/components/common/GlassDrawer.test.tsx` (vitest + RTL):
  - [ ] renders when `open=true`
  - [ ] does not render when `open=false`
  - [ ] backdrop click calls `onClose` exactly once
  - [ ] `Escape` calls `onClose` exactly once
  - [ ] `side='left'` positions panel on the left (CSS class assertion)
  - [ ] `maxWidth='lg'` applies `max-w-lg` class
  - [ ] `variant='strong'` applies stronger opacity class
  - [ ] Tab on last focusable wraps to first; Shift+Tab on first wraps to last
  - [ ] focus restores to invoker after close
- [ ] Verify: `pnpm test` all green (91 + GlassDrawer tests)
- [ ] Verify: `pnpm typecheck` clean
- [ ] Verify: `pnpm lint` clean
- [ ] Commit: `feat(common): GlassDrawer primitive with tests`

## Wave 4 — Topbar additions

- [ ] Create `src/components/common/RiskSemaphore.tsx` — renders dot + label from `useRiskLevel(s => s.level)`; `aria-label="Riesgo: ${level}"`; carries a `// TODO` comment referencing the future `risk-summary` backend endpoint; visible only on `lg+`
- [ ] Create `src/components/common/CommandPaletteTrigger.tsx` — button styled per topbar with text "Buscar · ⌘K" (cross-platform shows "Ctrl+K" on non-Mac)
- [ ] Create `src/components/common/NewTradeButton.tsx` — jade button with `glow-primary`, label "+ Nuevo Trade", wires to `useNewTradeDrawer.open()`
- [ ] Edit `src/layout/TopNav.tsx`: render `<RiskSemaphore />` after brand; `<CommandPaletteTrigger />` after semaphore; `<NewTradeButton />` after command trigger; keep user name + logout on the right
- [ ] Create `src/components/common/RiskSemaphore.test.tsx`: renders green by default; reads `useRiskLevel.level` after `set('red')`
- [ ] Create `src/components/common/CommandPaletteTrigger.test.tsx`: click invokes `useCommandPalette.open()`
- [ ] Create `src/components/common/NewTradeButton.test.tsx`: click invokes `useNewTradeDrawer.open()`
- [ ] Verify: `pnpm test` all green
- [ ] Verify: `pnpm typecheck` clean
- [ ] Verify: `pnpm lint` clean
- [ ] Verify: Playwright topbar shows all three widgets on the dashboard route (≥1024px); click `+ Nuevo Trade` opens drawer (drawer is empty until Wave 5 — `GlassDrawer` renders without content)
- [ ] Commit: `feat(topbar): add RiskSemaphore placeholder + Cmd+K trigger + +Nuevo Trade button`

## Wave 5 — NewTradeDrawer + form + mutation + useQuery migration

- [ ] Create `src/features/trades/schemas.ts` with `ForexTradeSchema` and `BinaryTradeSchema` Zod discriminated union per design §8 (uuid `account_id`, numeric coercion for decimals, max bounds, transforms back to string at submit)
- [ ] Create `src/features/trades/useCreateTrade.ts` — TanStack `useMutation` calling `openTradeApi`; `onSuccess` invalidates `['accounts']` and `['trades']` and calls `useNewTradeDrawer.close()` + toast
- [ ] Create `src/features/accounts/hooks.ts` — exports `useAccounts()` (`useQuery(['accounts'])`) and `useAccount(id)` (`useQuery(['account', id])`)
- [ ] Create `src/features/trades/NewTradeForm.tsx` — RHF + `zodResolver`; renders FOREX vs BINARY fields based on selected account type; field-level errors from Zod
- [ ] Create `src/features/trades/NewTradeDrawer.tsx` — uses `GlassDrawer` (side=right); hosts `<NewTradeForm />`; shows loading spinner during mutation; renders glass alert `{ code, message }` on error; keeps drawer open on error
- [ ] Edit `src/layout/TopNav.tsx`: render `<NewTradeDrawer />` portal-level (mounted once near root)
- [ ] Edit `src/pages/portal/CuentasPage.tsx`: replace `useEffect + axios` with `useAccounts()`; show loading/error states
- [ ] Edit `src/pages/portal/CuentasDetailPage.tsx`: replace `useEffect + axios` with `useAccount(id)`
- [ ] Create `src/features/trades/NewTradeForm.test.tsx`: required `account_id` blocks submit; FOREX `lot_size > 100` shows inline error; BINARY `investment_usd > 10000` shows inline error; valid FOREX payload calls mutation hook
- [ ] Create `src/features/trades/useCreateTrade.test.tsx` (with msw or vi.mock): success invalidates `['accounts']` + `['trades']`; error envelope surfaces code/message
- [ ] Create `src/features/accounts/hooks.test.ts`: `useAccounts` returns mocked list; `useAccount(id)` returns mocked detail
- [ ] Verify: `pnpm test` all green
- [ ] Verify: `pnpm typecheck` clean
- [ ] Verify: `pnpm lint` clean
- [ ] Verify: Playwright: click `+ Nuevo Trade` → drawer opens → fill FOREX fields → submit → success closes drawer; refresh the cuentas list page shows updated account
- [ ] Verify: Playwright: invalid `lot_size = 999` → inline error blocks submit, drawer stays open
- [ ] Commit: `feat(trades): NewTradeDrawer with RHF+Zod + useCreateTrade + useQuery migration`

## Wave 6 — CommandPalette

- [ ] Create `src/hooks/useCommandPaletteHotkey.ts` — registers `window.keydown` listener; opens palette on `(metaKey || ctrlKey) && key === 'k'`; ignores events where `target` is `<input>`/`<textarea>`/`[contenteditable]`
- [ ] Create `src/components/common/commandActions.ts` — exports `COMMAND_ACTIONS` readonly array: 6 `nav.*` (dashboard/cuentas/operaciones/diario/playbook/configuracion), 1 `trade.new` (opens drawer via `useNewTradeDrawer.open()`), 1 `auth.logout`
- [ ] Create `src/components/common/CommandPalette.tsx` — wraps `cmdk`'s `Command`, `Command.Input`, `Command.List`, `Command.Item`, `Command.Empty`; renders via `createPortal` at `document.body`; styled with jade border + glass background; subscribes to `useCommandPalette.isOpen`
- [ ] Lazy-import `CommandPalette` from `src/layout/TopNav.tsx` via `React.lazy` + `<Suspense>` to keep initial bundle clean
- [ ] Mount `<CommandPalette />` portal-level inside `TopNav` so it overlays any route
- [ ] Create `src/components/common/CommandPalette.test.tsx` (vitest + RTL + cmdk testing patterns):
  - [ ] open via `useCommandPalette.open()` renders list
  - [ ] ArrowDown moves highlighted index; ArrowUp moves it back; index wraps at ends
  - [ ] Enter on highlighted action dispatches its `run(api)`; palette closes
  - [ ] Escape closes the palette
  - [ ] `Abrir Nuevo Trade` action calls `useNewTradeDrawer.open()`
  - [ ] six navigation actions are visible when palette opens
- [ ] Create `src/hooks/useCommandPaletteHotkey.test.ts`: dispatch `KeyboardEvent` with `metaKey=true key='k'` opens palette; `ctrlKey=true key='k'` opens palette; typing inside `<input>` does not open palette
- [ ] Verify: `pnpm test` all green
- [ ] Verify: `pnpm typecheck` clean
- [ ] Verify: `pnpm lint` clean
- [ ] Verify: Playwright on the dashboard route: press `Meta+K` → palette opens → fuzzy search "cuen" → Enter → navigates to the cuentas list route → palette closes
- [ ] Verify: Playwright on Linux/Windows profile: press `Control+K` → palette opens
- [ ] Verify: Playwright: in `Abrir Nuevo Trade` action → Enter → drawer opens + palette closes
- [ ] Commit: `feat(nav): CommandPalette with cmdk + global hotkey + tests`

## Final — Full-stack verification

- [ ] `pnpm test` — all green (91 existing + new tests for stores, drawer, topbar, trades, palette)
- [ ] `pnpm typecheck` — zero new errors
- [ ] `pnpm lint` — zero new errors
- [ ] `cd backend && pyenv which pytest 2>/dev/null || command -v pytest` — 103/103 green (no backend changes expected; sanity check)
- [ ] `rg -n '#00FFFF|\bcyan\b|glow-cyan' src/ tailwind.config.ts` — zero matches
- [ ] `git log --oneline | head -20` — 11 conventional commits, no `Co-Authored-By:` trailers
- [ ] `git status` — working tree clean
- [ ] Manual smoke on `localhost:5173` (Ctrl+Shift+R hard reload):
  - [ ] portal route shows vertical collapsible sidebar on desktop (≥1024px); persist on reload
  - [ ] mobile (<1024px) renders sidebar as drawer overlay
  - [ ] Cmd+K (macOS) / Ctrl+K (others) opens CommandPalette; Esc closes
  - [ ] `+ Nuevo Trade` opens right-side drawer; submits create-trade via `useMutation`; closes on success
  - [ ] `WorkspaceSelector` dropdown lists user workspaces; selection persists in sessionStorage
  - [ ] `RiskSemaphore` placeholder visible with green dot and `aria-label="Riesgo: green"` on `lg+`
  - [ ] jade `#2EDC8C` visible across all pages (home, pricing, login, dashboard, cuentas)
  - [ ] no console errors on any portal route
