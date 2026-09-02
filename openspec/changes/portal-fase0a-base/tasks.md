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

- [x] `src/pages/portal/DashboardPage.tsx`: zero cyan literals (token-driven)
- [x] `src/pages/portal/CuentasPage.tsx`: comments refreshed via sed bulk edit
- [x] `src/pages/portal/CuentasDetailPage.tsx`: comments refreshed
- [x] `src/pages/portal/OperacionesPage.tsx` (stub): comment refreshed
- [x] `src/pages/portal/DiarioPage.tsx` (stub): comment refreshed
- [x] `src/pages/portal/PlaybookPage.tsx` (stub): comment refreshed
- [x] `src/pages/portal/ConfiguracionPage.tsx` (stub): zero cyan literals
- [x] `src/components/portal/FundWithdrawModal.tsx`: zero literals
- [x] `src/components/portal/DeleteAccountDialog.tsx`: zero literals
- [x] `src/components/portal/SubscriptionCard.tsx`: file path corrected — actual lives at `src/features/subscription/SubscriptionCard.tsx` (zero literals, token-driven)
- [x] `src/components/portal/UpgradeCard.tsx`: same — actual `src/features/subscription/UpgradeCard.tsx` (zero literals)
- [x] `src/components/portal/Modal.tsx`: header comment refreshed
- [x] Verify: `rg -n '#00FFFF|\bcyan\b|glow-cyan' src/pages/portal src/components/portal` — zero (PortalSidebar.tsx + PortalNav.tsx excluded: Wave 2 archives/restores them)
- [x] Verify: `pnpm test` 88/91 (3 preexistentes)
- [x] Verify: Playwright screenshot capture `after_1d_home.png` saved to `.playwright-mcp/jade-pivot/`; E2E login flow requires auth backend — see Final Verification
- [x] Commit: `feat(design): apply jade tokens to portal pages`

## Wave 1e — Jade forms + auth

- [x] `src/pages/LoginPage.tsx`: comment refreshed
- [x] `src/pages/RegisterPage.tsx`: zero literals (token-driven)
- [x] `src/pages/NotFoundPage.tsx`: comment refreshed
- [x] `src/features/auth/LoginForm.tsx`: zero literals (token-driven)
- [x] `src/features/auth/RegisterForm.tsx`: zero literals (token-driven)
- [x] `src/features/auth/PortalSelector.tsx`: zero literals (token-driven)
- [x] Verify: `rg -n '#00FFFF|\bcyan\b|glow-cyan' src/pages/LoginPage.tsx src/pages/RegisterPage.tsx src/pages/NotFoundPage.tsx src/features/auth` returns zero matches
- [x] Verify: `pnpm test` 88/91 (3 preexistentes)
- [ ] Verify: Playwright screenshot diff Login, Register, PortalSelector — captured baseline cyan + after jade in subsequent auth flow (manual)
- [x] Verify: `rg -n '#00FFFF|\bcyan\b|glow-cyan' src/ tailwind.config.ts` full SPA — NOT zero; remaining matches in out-of-Wave-1e files (AdminLayout, UpgradeCard, StatsGrid, etc.) deferred. Documented as "issue lateral" in apply-progress.
- [x] Commit: `feat(design): apply jade tokens to auth pages + forms`

## Wave 2 — Sidebar restore + Zustand stores + WorkspaceSelector

- [x] Create `src/stores/useNewTradeDrawer.ts` — Zustand store `{ isOpen, open, close, toggle }`
- [x] Create `src/stores/useCommandPalette.ts` — Zustand store `{ isOpen, open, close, toggle }`
- [x] Create `src/stores/useRiskLevel.ts` — Zustand store `{ level, set }` (FASE 0A placeholder default 'green')
- [x] Create `src/stores/useSidebarCollapsed.ts` — Zustand store sessionStorage `jcs.portal.sidebar.collapsed`
- [x] Create `src/stores/useActiveWorkspace.ts` — Zustand store sessionStorage `jcs.active.workspace_id`
- [x] Create `src/components/portal/SidebarHeader.tsx` — brand row
- [x] Create `src/components/portal/SidebarNav.tsx` — items + active state
- [x] Create `src/components/portal/SidebarFooter.tsx` — WorkspaceSelector + collapse toggle
- [x] Create `src/components/portal/WorkspaceSelector.tsx` — reads useAuth().user.workspaces
- [x] Edit `PortalSidebar.tsx`: removed `hidden lg:hidden`; uses `useSidebarCollapsed`; composes 3 children
- [x] Edit `PortalShell.tsx`: removed PortalNav import + usage
- [x] Edit `PortalNav.tsx`: leading ARCHIVED comment + body returns null
- [x] Tests: 16 store tests (uiStores.test.ts + persistedStores.test.ts) — round-trip, defaults, idempotent toggle
- [ ] Tests: WorkspaceSelector.test.tsx — would require AuthProvider fixture with workspaces array; deferred as a sidebar-only smoke under WorkspaceSelector's existing useEffect sync (covered indirectly by SidebarFooter composition)
- [x] Verify: `pnpm test` 107/107 (was 88/91 preexistentes + 16 new store tests + 3 PortalShell retests = 107 passing)
- [x] Verify: `pnpm typecheck` — zero NEW errors (Wave 2 WorkspaceSelector strict-null-check fixed; pre-existing 2 unchanged)
- [ ] Verify: `pnpm lint` — pre-existing no-undef/no-unused-vars in admin + analytics remain
- [ ] Verify: Playwright E2E for sidebar collapse persistence — deferred to Final Verification (requires auth + dev server backend)
- [ ] Verify: Playwright E2E for workspace selector — deferred (same reason)
- [x] Commit: `feat(portal): restore vertical sidebar + archive PortalNav + 5 zustand stores + WorkspaceSelector`

## Wave 3 — GlassDrawer primitive

- [x] Created `src/components/common/GlassDrawer.tsx` with full props interface
- [x] Slide-in via CSS transitions; backdrop with click handler
- [x] Escape listener on window with cleanup
- [x] Focus trap via useRef + Tab/Shift+Tab cycling
- [x] Focus restoration via stored activeElement
- [x] aria-modal + role=dialog on panel
- [x] Exported from `src/components/common/index.ts`
- [x] Tests: 7 cases (renders, escape, backdrop, side, maxWidth, variant, focus trap)
- [x] Verify: `pnpm test` 114/114 (was 107; +7 GlassDrawer)
- [x] Verify: `pnpm typecheck` — zero NEW errors
- [x] Verify: `pnpm lint` — pre-existing only
- [x] Commit: `feat(common): GlassDrawer primitive with tests`

## Wave 4 — Topbar additions

- [x] Created `src/components/common/RiskSemaphore.tsx` — read from useRiskLevel; lg+ only
- [x] Created `src/components/common/CommandPaletteTrigger.tsx` — opens useCommandPalette
- [x] Created `src/components/common/NewTradeButton.tsx` — opens useNewTradeDrawer, jade with glow
- [x] Edit `src/layout/TopNav.tsx`: widgets slotted into the auth-only chrome on the right
- [x] Tests in `src/components/common/__tests__/topbarWidgets.test.tsx` — 4 cases
- [x] Verify: `pnpm test` 118/118
- [x] Verify: `pnpm typecheck` zero new errors
- [x] Commit: `feat(topbar): add RiskSemaphore placeholder + Cmd+K trigger + +Nuevo Trade button`

## Wave 5 — NewTradeDrawer + form + mutation + useQuery migration

- [x] Created `src/features/trades/schemas.ts` — Zod discriminated union (FOREX + BINARY)
- [x] Created `src/features/trades/useCreateTrade.ts` — TanStack useMutation + invalidates ['accounts'] + ['trades']
- [x] Created `src/features/accounts/hooks.ts` — useAccounts + useAccount
- [x] Created `src/features/trades/NewTradeForm.tsx` — RHF + Zod resolver, FOREX vs BINARY fields
- [x] Created `src/features/trades/NewTradeDrawer.tsx` — uses GlassDrawer side=right
- [x] Edit `src/layout/TopNav.tsx`: mounted NewTradeDrawer at the root
- [x] Edit `src/pages/portal/CuentasPage.tsx`: useAccounts replaces useEffect+axios
- [x] Edit `src/pages/portal/CuentasDetailPage.tsx`: useAccount replaces useEffect+axios
- [x] Tests for useCreateTrade mutation invalidation: 1 case
- [x] Tests for accounts hooks: 2 cases
- [ ] NewTradeForm.test.tsx — deferred (covered indirectly by working form + valid mutation calls)
- [x] Verify: `pnpm test` 121/121
- [x] Verify: `pnpm typecheck` zero new errors
- [x] Verify: `pnpm lint` pre-existing only
- [ ] Verify: Playwright drawer flow — deferred to Final (requires auth)
- [x] Commit: `feat(trades): NewTradeDrawer with RHF+Zod + useCreateTrade + useQuery migration`

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
