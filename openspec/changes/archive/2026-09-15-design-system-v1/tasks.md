# Tasks: design-system-v1 — Adopt Cyber-Jade design language

> **Change**: `design-system-v1`
> **Date**: 2026-09-02
> **References**: `proposal.md`, `design.md`, `specs/{cyber-jade-tokens,primitive-library,decorative-system,styleguide-jade,style-enforcement,color-system,portal-shell,topbar}/spec.md`
> **Mode**: openspec | **Delivery strategy**: ask-on-risk | **Pace**: auto
> **Strict TDD**: TRUE | **Test runner**: `pnpm test` (vitest 2.1.1) | **Coverage**: 80/75/80/80 lines/branches/funcs/stmts

## Summary

- **Total tasks**: 39 (38 if PeriodoSplit deferred)
- **Total estimated lines**: ~6165 (source + tests, additive)
- **Total estimated commits**: 39
- **Largest single commit**: T4.10 DataTable ~320 lines (within 400-line budget)
- **Sub-PRs at the 400-line edge**: T3c (~400), T3d (~400) — split per design §11.3

## Conventions

- **Task ID**: `T{wave}.{n}` or `T{wave}{letter}.{n}` for Wave 3 sub-waves (e.g. `T3a.1`).
- **One task = one commit** (`feat/fix/refactor/chore(scope): msg [T{id}]`).
- **Each task ≤ 400 lines** per the 400-line review budget (cumulative diff).
- **strict_tdd=TRUE**: any task that adds behavior ships its colocated `__tests__/*.test.tsx` FIRST (RED) in the same commit, with the impl (GREEN) and any refactor (REFACTOR) following.
- **Files convention**: paths use repo-relative form starting with `src/`, `tailwind.config.ts`, `openspec/`, etc.
- **Test paths**: `src/components/ui/__tests__/<Primitive>.test.tsx` matching project convention (mirrors `src/components/common/__tests__/topbarWidgets.test.tsx`).
- **No emojis**. **No `Co-Authored-By` trailers**. **Conventional commits only**.
- **Spanish copy** in user-facing strings; **English** in code, comments, commit bodies.

## Review Workload Forecast

| Wave | Tasks | Lines est. | Sub-PRs | Risk |
|------|-------|-----------|---------|------|
| 1 | 4 | ~135 | 1 | Low |
| 2 | 1 | ~30 | 1 | Low |
| 3a | 1 | ~280 | 1 | Low |
| 3b | 1 | ~370 | 1 | Medium |
| 3c | 1 | ~400 | 1 | Medium (edge) |
| 3d | 1 | ~400 | 1 | Medium (edge) |
| 4 | 11–12 | ~2050 | 11–12 | Medium |
| 5 | 12 | ~1500 | 12 | Medium |
| 6 | 3 | ~540 | 3 | Low |
| 7 | 4 | ~460 | 4 | Low |
| **Total** | **38–39** | **~6165** | **38–39** | **High (volume)** |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

> **Reasoning**: ~6165 lines across 38–39 commits, multiple commits at the 400-line edge (T3c, T3d). Per `ask-on-risk` strategy, the orchestrator must pause and ask the user to choose between `stacked-to-main`, `feature-branch-chain`, or `size:exception` before invoking `sdd-apply`.

### Suggested Work Units (PR split)

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Fonts + tokens + keyframes (Wave 1) | PR #1 | `pnpm test` (91/91) + visual smoke | manual browser @ 1440×900 | revert `tailwind.config.ts` + `src/styles/index.css` + `src/main.tsx` |
| 2 | Config drift cleanup (Wave 2) | PR #2 | `pnpm test` + visual spot HomePage | manual browser | revert `tailwind.config.ts` backgroundImage + glow rgba |
| 3a | Layout drift (3a) | PR #3 | `pnpm test` | manual browser TopNav/Footer | revert AuroraBackground/TopNavMobileDrawer/TopNav/Footer |
| 3b | Components drift (3b) | PR #4 | `pnpm test` | manual browser portal sidebar | revert portal/admin component files |
| 3c | Home/Pricing/Features drift (3c) | PR #5 | `pnpm test` | manual browser home + pricing | revert pricing/home/features/about components |
| 3d | Pages/Auth/Admin drift (3d) | PR #6 | `pnpm test` + CI grep guard | manual browser all pages | revert all pages + admin + auth feature files |
| 4.1–4.11 | 11 primitives (Button → Toast) | PR #7–#17 | `pnpm test` per primitive | vitest | delete `src/components/ui/<Primitive>.tsx` + tests |
| 4.12 | PeriodoSplit (OPTIONAL) | PR #18 (or omit) | `pnpm test` | vitest | delete primitive + test |
| 5.1–5.12 | 12 migration commits | PR #19–#30 | `pnpm test` per commit | vitest + manual | revert consumer file |
| 6.1–6.3 | Decor + styleguide | PR #31–#33 | `pnpm test` + visual `/styleguide/jade` | manual browser | delete decor file + unregister route |
| 7.1–7.4 | Enforcement + docs + stubs | PR #34–#37 | `pnpm lint:design` + `pnpm test` | CI grep guard | revert lint config / docs / stub pages |

---

## Wave 1 — Fonts + tokens

- [ ] T1.1
- [ ] T1.2
- [ ] T1.3
- [ ] T1.4

### T1.1: Install font + clsx dependencies
- **Files**: `package.json`, `pnpm-lock.yaml`
- **Estimate**: ~10 lines (deps + lock churn)
- **Dependencies**: none
- **Acceptance**:
  - [ ] `clsx ^2.1.1`, `@fontsource/rajdhani@5.1.0`, `@fontsource/space-grotesk@5.1.0` added as devDependencies
  - [ ] `pnpm install` completes without peer-dep errors
- **Test**: N/A (config only — no behavior)
- **Notes**: align versions with existing `@fontsource/orbitron@5.1.0` pin.

### T1.2: tailwind.config.ts token pivots + keyframes
- **Files**: `tailwind.config.ts`
- **Estimate**: ~60 lines (hex swaps, new tokens, 3 new keyframes)
- **Dependencies**: T1.1
- **Acceptance**:
  - [ ] `primary.DEFAULT` `#2EDC8C` → `#00FF9D`; `primary.dk` `#25B070` → `#00CC7E`; `primary.light` `#7FE9B5` → `#5CFFBE`; `primary.glow` `#2EDC8C` → `#00FF9D`; `'primary-fg'` `#080D12` → `#060B10`
  - [ ] `bg` `#080D12` → `#060B10`; `surface` `#0D141B` → `#0D151E`
  - [ ] `loss` `#FF5C5C` → `#FF2A55`; `info` `#4DA3FF` → `#00B8FF`; `text.primary` `#E9F1F7` → `#E0E6ED`; `text.secondary` `#8FA1B2` → `#8A9BA8`
  - [ ] Add `input` = `#0A1017`; add `borderJade` = `rgba(0,255,157,0.2)` (per design §9.8, utility name is `border-borderJade`)
  - [ ] Add keyframes: `status-dot-pulse` (0.5→1.0 opacity, 1.5s ease-in-out infinite), `neural-drift` (12s ±4px translate), `shimmer-jade` (background-position 0%→200%, 2s linear infinite)
  - [ ] Add `animation.status-dot-pulse` utility
- **Test**: N/A (token config — visual smoke at runtime)
- **Notes**: design §9.8 picks `borderJade` (camelCase) over `border-jade` (hyphen) to avoid Tailwind 3 nested-key trap. Document utility name as `border-borderJade` in T7.3.

### T1.3: src/styles/index.css rgba pivot + keyframe rename
- **Files**: `src/styles/index.css`
- **Estimate**: ~50 lines
- **Dependencies**: T1.2
- **Acceptance**:
  - [ ] `::selection` cyan → jade rgba
  - [ ] `.auth-spinner` cyan → jade rgba
  - [ ] `@keyframes pulse-cyan` renamed to `@keyframes status-dot-pulse` (timing + opacity updated per design §2.4: 1.5s, 0.5→1.0)
  - [ ] Portal-selector radial gradients cyan rgba → jade rgba
- **Test**: N/A (CSS only)
- **Notes**: the rename matches `RouteFallback.tsx` L13 and `PaymentSuccessPage.tsx` L100 — handled in Wave 3c/3d (do not refactor those call sites here; just rename the keyframe).

### T1.4: main.tsx font imports + tailwind fontFamily.display
- **Files**: `src/main.tsx`, `tailwind.config.ts`
- **Estimate**: ~15 lines
- **Dependencies**: T1.1
- **Acceptance**:
  - [ ] `import '@fontsource/rajdhani/{500,600,700}.css'` added
  - [ ] `import '@fontsource/space-grotesk/{400,500,700}.css'` added
  - [ ] `tailwind.config.ts` `fontFamily.display` updated to `['Orbitron', 'Rajdhani', 'Space Grotesk', 'ui-monospace', 'monospace']`
- **Test**: N/A (wire-up)
- **Notes**: `@fontsource` defaults `font-display: swap`; no explicit override needed.

---

## Wave 2 — Config drift cleanup

### T2.1: tailwind backgroundImage + glow rgba cleanup
- **Files**: `tailwind.config.ts`
- **Estimate**: ~30 lines
- **Dependencies**: T1.2
- **Acceptance**:
  - [ ] `backgroundImage.aurora-static` cyan rgba → jade rgba
  - [ ] `backgroundImage.site-gradient` cyan rgba → jade rgba
  - [ ] `backgroundImage.portal-selector` cyan rgba → jade rgba
  - [ ] `boxShadow.glow-jade` + `glow-jade-sm` rgba updated `rgba(46,220,140,*)` → `rgba(0,255,157,*)`
  - [ ] `boxShadow.glow-cyan` + `glow-cyan-sm` aliases REMOVED (per design §2.5 step 3)
  - [ ] `glow-primary` CSS class rgba updated to jade
- **Test**: N/A (token config — visual smoke HomePage at runtime)
- **Notes**: the legacy comment at L129 says "slated for Wave 1c/1d removal" — that's this task.

---

## Wave 3 — File drift cleanup (4 sub-waves, 4 chained PRs)

Wave 3 is split because the 30+ file drift list exceeds 400 lines per sub-PR budget. Each sub-wave is a chained PR. Run `rg "rgba\(46,220,140|rgba\(0,255,255|#00FFFF|stroke=\"#00FFFF\"|animate-pulse-cyan" src/` at the END of each sub-wave; expect zero matches in the sub-wave's scope.

### T3a.1: Layout drift (TopNav, AuroraBackground, TopNavMobileDrawer, Footer)
- **Files**: `src/layout/TopNav.tsx`, `src/layout/AuroraBackground.tsx`, `src/layout/TopNavMobileDrawer.tsx`, `src/layout/Footer.tsx`
- **Estimate**: ~280 lines
- **Dependencies**: T2.1
- **Acceptance**:
  - [ ] `TopNav.tsx` L80/L89/L108/L130 `rgba(46,220,140,*)` → jade rgba
  - [ ] `AuroraBackground.tsx` L158/L159/L166 cyan rgba → jade rgba
  - [ ] `TopNavMobileDrawer.tsx` L123 cyan shadow → jade shadow
  - [ ] `Footer.tsx` visual review — replace any inline rgba with token
  - [ ] `pnpm test` green (91/91 baseline)
  - [ ] `pnpm typecheck` zero new errors
- **Test**: indirect — existing tests in `src/components/common/__tests__/` must remain green
- **Notes**: `TopNav` also has jade-button duplicates → migrates to `<Button>` in Wave 5.9.

### T3b.1: Components drift (portal sidebar/header/modal, GlassCard, AdminSidebar, dialogs)
- **Files**: `src/components/portal/SidebarNav.tsx`, `src/components/portal/SidebarHeader.tsx`, `src/components/portal/Modal.tsx`, `src/components/portal/FundWithdrawModal.tsx`, `src/components/portal/DeleteAccountDialog.tsx`, `src/components/GlassCard.tsx`, `src/components/admin/AdminSidebar.tsx`
- **Estimate**: ~370 lines
- **Dependencies**: T3a.1
- **Acceptance**:
  - [ ] `SidebarNav.tsx` L160 OLD-jade rgba → jade rgba; verify `border-l-4 border-l-primary` (NOT `border-primary` — design §11.2)
  - [ ] `SidebarHeader.tsx` L20 OLD-jade rgba → jade rgba
  - [ ] `Modal.tsx` L49 OLD-jade rgba → jade rgba
  - [ ] `FundWithdrawModal.tsx` L123 cyan shadow → jade shadow
  - [ ] `DeleteAccountDialog.tsx` visual review
  - [ ] `GlassCard.tsx` L20 cyan shadow → jade shadow (`glow='cyan'` prop default → `'jade'` per portal-fase0a-base precedent)
  - [ ] `AdminSidebar.tsx` L12 comment + L177 cyan shadows → jade
- **Test**: existing `GlassCard.test.tsx` must pass; no new tests in this commit (migration in Wave 5)
- **Notes**: `AdminAuthGuard.tsx` L82 cyan shadow discovered during design audit — added to T3d.1, NOT this sub-wave.

### T3c.1: Home / Pricing / Features / About drift
- **Files**: `src/components/pricing/PricingTier.tsx`, `src/components/pricing/ComparisonTable.tsx`, `src/components/pricing/BillingCycleToggle.tsx`, `src/components/features/FeatureCard.tsx`, `src/features/subscription/UpgradeCard.tsx`, `src/components/about/MissionSection.tsx`, `src/components/consent/CookiesConsent.tsx`, `src/components/home/{Hero,FeaturesGrid,CtaStrip,ContactTeaser,DashboardPreview}.tsx`
- **Estimate**: ~400 lines
- **Dependencies**: T3b.1
- **Acceptance**:
  - [ ] `PricingTier.tsx` L48/L61/L96/L114 cyan refs → jade
  - [ ] `ComparisonTable.tsx` L126/L145 cyan strokes `stroke="#00FFFF"` → jade (note: this is the pricing grid, NOT a data table — do NOT migrate to `<DataTable>`; only swap strokes per design §11.4)
  - [ ] `BillingCycleToggle.tsx` L58 cyan shadow → jade
  - [ ] `FeatureCard.tsx` L24 cyan stroke → jade
  - [ ] `UpgradeCard.tsx` L41/L76/L91 cyan refs → jade
  - [ ] `MissionSection.tsx` L50/L60/L61/L67/L75/L76 OLD-jade hex strokes → new jade hex
  - [ ] `CookiesConsent.tsx` L84 cyan shadow → jade
  - [ ] `Hero.tsx`, `FeaturesGrid.tsx`, `CtaStrip.tsx`, `ContactTeaser.tsx`, `DashboardPreview.tsx` — OLD-jade rgba + 2 OLD-jade hex strokes → new jade
  - [ ] `pnpm test` green
- **Test**: existing tests must remain green; no new tests in this commit (migration in Wave 5)
- **Notes**: keep `PricingTier` jade-button classes for now — Wave 5.7 migrates to `<Button>`.

### T3d.1: Pages / Auth / Admin drift
- **Files**: `src/pages/PricingPage.tsx`, `src/pages/RegisterPage.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/UpgradePage.tsx`, `src/pages/NotFoundPage.tsx`, `src/pages/LoginPage.tsx`, `src/pages/FeaturesPage.tsx`, `src/pages/PaymentSuccessPage.tsx`, `src/pages/AboutPage.tsx`, `src/pages/admin/AdminPlansPage.tsx`, `src/pages/admin/AdminDashboardPage.tsx`, `src/pages/admin/AdminUsersPage.tsx`, `src/pages/admin/AdminPaymentsPage.tsx`, `src/pages/admin/AdminAnalyticsPage.tsx`, `src/features/auth/PortalSelector.tsx`, `src/features/auth/LoginForm.tsx`, `src/features/auth/RegisterForm.tsx`, `src/features/auth/AdminRoute.tsx`, `src/features/admin/AdminAuthGuard.tsx`, `src/pages/portal/PlaybookPage.tsx`, `src/pages/portal/CuentasPage.tsx`, `src/pages/portal/CuentasDetailPage.tsx`, `src/pages/portal/DiarioPage.tsx`, `src/components/admin/PlanRow.tsx`, `src/components/admin/UserRow.tsx`, `src/components/admin/PaymentRow.tsx`, `src/styleguide/GlassShowcase.tsx`
- **Estimate**: ~400 lines
- **Dependencies**: T3c.1
- **Acceptance**:
  - [ ] All listed files have cyan/OLD-jade literals replaced with jade tokens
  - [ ] `AdminAuthGuard.tsx` L82 cyan shadow → jade (design §11.6 finding)
  - [ ] `PaymentSuccessPage.tsx` L100 `animate-[pulse-cyan_1.2s_ease-in-out_infinite]` → `animate-status-dot-pulse`
  - [ ] `CuentasDetailPage.tsx` L324 OLD-jade rgba → jade rgba
  - [ ] `pnpm test` green (91/91 baseline; pre-existing 3 broken left for Wave 7 cleanup per portal-fase0a-base verify report)
  - [ ] `pnpm typecheck` zero new errors
  - [ ] CI grep guard `rg "rgba\(0,255,255|#00FFFF|stroke=\"#00FFFF" src/` returns 0 (extend guard to OLD-jade rgba in T7.3)
- **Test**: indirect — existing 91 baseline tests must remain green
- **Notes**: `TradeTable.tsx` and `<table>` consumers keep their tables — Wave 5.10–5.12 migrates to `<DataTable>`.

---

## Wave 4 — Primitive components (11–12 commits, 1 primitive per commit)

Each task ships RED test → GREEN impl → REFACTOR in one commit. Update `src/components/ui/index.ts` barrel in each commit.

### T4.1: Button primitive
- **Files**: `src/components/ui/Button.tsx`, `src/components/ui/__tests__/Button.test.tsx`, `src/components/ui/index.ts`
- **Estimate**: ~170 lines
- **Dependencies**: T2.1
- **Acceptance**:
  - [ ] `forwardRef<HTMLButtonElement>` exported; variants `primary | ghost | danger | icon`; sizes `sm | md | lg`; `loading` + `disabled` props
  - [ ] Primary: transparent bg, `border-borderJade`, `text-primary`; on hover `bg-primary text-primary-fg shadow-glow-jade-md`
  - [ ] Loading state: `aria-busy={true}`, replaces leftIcon/rightIcon with `<StatusDot color="jade" pulse aria-label="Cargando" />` — but only if `<StatusDot>` already exists; otherwise inline the pulse span
  - [ ] clsx composition for className; `font-display uppercase tracking-wider`
- **Test**:
  - [ ] `Button.test.tsx`: 4 variants × 3 sizes render correct classes; loading disables onClick (`fireEvent.click` does not call `onClick` while loading); `aria-busy`/`aria-disabled` set; ref forwarded
- **Notes**: design §4.1 references `<StatusDot>` but StatusDot ships in T4.6 — T4.1 may inline a pulse span until T4.6 lands.

### T4.2: FieldShell + Input primitive
- **Files**: `src/components/ui/FieldShell.tsx`, `src/components/ui/Input.tsx`, `src/components/ui/focusGlow.ts`, `src/components/ui/__tests__/Input.test.tsx`
- **Estimate**: ~150 lines
- **Dependencies**: T4.1 (clsx composition pattern)
- **Acceptance**:
  - [ ] `focusGlow.ts` exports `'focus:border-primary focus:shadow-[0_0_5px_rgba(0,255,157,0.5)] focus:outline-none'`
  - [ ] `FieldShell.tsx` shared label/error/hint chrome
  - [ ] `Input.tsx` `forwardRef`, `aria-invalid` derived from `error !== undefined`, `aria-describedby` references `${id}-error` / `${id}-hint`
  - [ ] `bg-input border border-borderJade rounded-lg px-3 py-2 text-text-primary font-body` base
- **Test**:
  - [ ] `Input.test.tsx`: focus shows jade glow; error sets `aria-invalid`; hint renders via `aria-describedby`; ref forwarded; placeholder passes through
- **Notes**: shared `focusGlow` constant prevents divergence between Input/Select/Textarea.

### T4.3: Select primitive
- **Files**: `src/components/ui/Select.tsx`, `src/components/ui/__tests__/Select.test.tsx`
- **Estimate**: ~170 lines
- **Dependencies**: T4.2 (FieldShell shared)
- **Acceptance**:
  - [ ] Native `<select>` wrapped in `<div>` for chevron styling
  - [ ] Same FieldShell + focusGlow as Input
  - [ ] `forwardRef`, `aria-invalid`, `aria-describedby` consistent with Input
- **Test**:
  - [ ] `Select.test.tsx`: options render; Enter-to-commit on `<select>` (native); error/hint passthrough
- **Notes**: custom listbox is OUT OF SCOPE per spec.

### T4.4: Textarea primitive
- **Files**: `src/components/ui/Textarea.tsx`, `src/components/ui/__tests__/Textarea.test.tsx`
- **Estimate**: ~130 lines
- **Dependencies**: T4.2
- **Acceptance**:
  - [ ] `forwardRef`, FieldShell + focusGlow, multi-line native `<textarea>`
- **Test**:
  - [ ] `Textarea.test.tsx`: rows prop passes through; focus glow; error/hint; ref forwarded
- **Notes**: smallest form primitive.

### T4.5: Badge primitive
- **Files**: `src/components/ui/Badge.tsx`, `src/components/ui/__tests__/Badge.test.tsx`
- **Estimate**: ~110 lines
- **Dependencies**: T4.1
- **Acceptance**:
  - [ ] Variants `primary | info | profit | loss | warning | neutral | danger`
  - [ ] Variant map: solid bg at `/15` opacity, solid text color, `border-{variant}/40`; NO glow on profit/loss/danger
  - [ ] `data-variant={variant}` attribute
- **Test**:
  - [ ] `Badge.test.tsx`: 7 variants render with correct text color; profit/loss/danger have NO shadow/glow classes
- **Notes**: replaces 7 inline copies in Wave 5.1–5.3.

### T4.6: StatusDot primitive
- **Files**: `src/components/ui/StatusDot.tsx`, `src/components/ui/__tests__/StatusDot.test.tsx`
- **Estimate**: ~110 lines
- **Dependencies**: T4.1
- **Acceptance**:
  - [ ] Colors `jade | cyan | amber | red`; sizes `sm | md`; `pulse?: boolean`; `label?: string`
  - [ ] When `pulse`: `animate-status-dot-pulse` class + color-tinted halo `shadow-[0_0_8px_rgba(R,G,B,0.6)]`
  - [ ] Color-to-RGB map: jade=(0,255,157), cyan=(0,184,255), amber=(243,185,78), red=(255,42,85)
- **Test**:
  - [ ] `StatusDot.test.tsx`: pulse mounts keyframe class; aria-label passes through; color maps to correct bg class; `prefers-reduced-motion` honored (className assertion)
- **Notes**: halo shadow color parameterized per design §4.6.

### T4.7: EmptyState primitive
- **Files**: `src/components/ui/EmptyState.tsx`, `src/components/ui/__tests__/EmptyState.test.tsx`
- **Estimate**: ~90 lines
- **Dependencies**: T4.1
- **Acceptance**:
  - [ ] Props `icon?, title, description?, action?`; layout `flex flex-col items-center text-center py-12 px-4`
  - [ ] Icon at `text-text-muted`; action at `mt-4`
- **Test**:
  - [ ] `EmptyState.test.tsx`: action slot renders below description; missing description omits `<p>`; missing icon shows no icon
- **Notes**: trivial primitive.

### T4.8: Skeleton primitive
- **Files**: `src/components/ui/Skeleton.tsx`, `src/components/ui/__tests__/Skeleton.test.tsx`
- **Estimate**: ~130 lines
- **Dependencies**: T4.1
- **Acceptance**:
  - [ ] Variants `text | circle | rect | card`; `width?, height?` props
  - [ ] Animation: `bg-[linear-gradient(90deg,rgba(0,255,157,0.04),rgba(0,255,157,0.16),rgba(0,255,157,0.04))] bg-[length:200%_100%] animate-shimmer-jade`
  - [ ] `aria-busy="true"` on root
- **Test**:
  - [ ] `Skeleton.test.tsx`: variant renders correct shape; width/height passthrough; aria-busy on root
- **Notes**: relies on `shimmer-jade` keyframe from T1.2 + reduced-motion override in `index.css`.

### T4.9: Tabs primitive
- **Files**: `src/components/ui/Tabs.tsx`, `src/components/ui/__tests__/Tabs.test.tsx`
- **Estimate**: ~150 lines
- **Dependencies**: T4.1
- **Acceptance**:
  - [ ] Props `items: TabItem[]`, `value`, `onChange`, `ariaLabel?`
  - [ ] Active: `border-b-2 border-primary text-primary`; inactive: `text-text-secondary hover:text-primary`
  - [ ] Keyboard: ArrowLeft/Right cycle, Home/End jump, Enter/Space commit
  - [ ] ARIA: `role="tablist"` + `aria-selected` per tab
- **Test**:
  - [ ] `Tabs.test.tsx`: ArrowLeft/Right with focus tracking; click-to-commit; disabled tab non-focusable; ARIA roles
- **Notes**: NO URL persistence (consumer concern per design §4.8).

### T4.10: DataTable primitive (largest)
- **Files**: `src/components/ui/DataTable.tsx`, `src/components/ui/__tests__/DataTable.test.tsx`
- **Estimate**: ~320 lines
- **Dependencies**: T4.1, T4.7, T4.8
- **Acceptance**:
  - [ ] Generic `<DataTable<T>>` with `Column<T>[]`; `rowKey`; `loading?`, `emptyState?`, `skeletonRows?`; `onSort?`; `currentPage?`, `pageSize?`, `totalRows?`, `onPageChange?`
  - [ ] Sticky `<thead>`: `sticky top-0 bg-surface/95 backdrop-blur-sm z-10`
  - [ ] Row separator: `border-b border-white/[0.05]` (per design §4.7, this is the spec's white/[0.05] NOT a jade value)
  - [ ] NO auto-apply `font-mono` to columns (caller responsibility per design §9.10)
  - [ ] Loading: renders `skeletonRows` placeholder rows via `<Skeleton variant="text">`
  - [ ] Empty: `emptyState` prop or default `<EmptyState title="Sin datos" />`
- **Test**:
  - [ ] `DataTable.test.tsx`: sticky header renders with correct bg class; sort callback fires with correct args; row key uniqueness; numeric column does NOT auto-apply font-mono; empty/loading state
- **Notes**: preserves existing `data-testid` contracts (`trade-table`, `trade-table-loading`, `trade-table-empty`, `trade-table-error`) — Wave 5.10 must keep these testids for backward compat per design §10.3.

### T4.11: Toast + ToastContainer + useToastStore
- **Files**: `src/components/ui/Toast.tsx`, `src/components/ui/ToastContainer.tsx`, `src/components/ui/__tests__/Toast.test.tsx`, `src/components/ui/__tests__/ToastContainer.test.tsx`, `src/stores/useToastStore.ts`, `src/stores/__tests__/useToastStore.test.ts`
- **Estimate**: ~290 lines
- **Dependencies**: T4.6 (StatusDot halo)
- **Acceptance**:
  - [ ] `useToastStore`: `queue: ToastItem[]`, `push`, `dismiss`, `clear`; default durations: info 4000ms, success 3000ms, warning 4000ms, danger 6000ms
  - [ ] `<Toast>`: glassmorphic panel `bg-surface/90 backdrop-blur-md border-borderJade`; slide-in via `translate-x-full → translate-x-0` 200ms
  - [ ] ARIA: `aria-live="polite"` for info/success/warning, `aria-live="assertive"` for danger; `role="alert"` for danger, `role="status"` otherwise
  - [ ] `<ToastContainer>` renders `role="region" aria-label="Notificaciones"`; ESC dismisses focused toast
- **Test**:
  - [ ] `useToastStore.test.ts`: push appends; auto-dismiss fires via `vi.useFakeTimers()` + `vi.advanceTimersByTime(4000)`
  - [ ] `Toast.test.tsx`: severity-specific aria-live; renders message; action slot renders
  - [ ] `ToastContainer.test.tsx`: ESC dismisses focused
- **Notes**: 3 files in one commit because the test imports all three (per design §10.2).

### T4.12: PeriodoSplit primitive (OPTIONAL)
- **Files**: `src/components/ui/PeriodoSplit.tsx`, `src/components/ui/__tests__/PeriodoSplit.test.tsx`
- **Estimate**: ~130 lines
- **Dependencies**: T4.1
- **Acceptance**:
  - [ ] Props `value: '1D' | '1W' | '1M' | 'YTD' | 'ALL'`, `onChange`; renders 5 toggle buttons
  - [ ] Active: `text-primary border-b-2 border-primary`; inactive: `text-text-secondary`
  - [ ] Keyboard: ArrowLeft/Right cycles, Enter/Space commits
  - [ ] sessionStorage `jcs.topbar.period` read on mount, written on change
  - [ ] `// TODO: bind to global period filter` comment present
- **Test**:
  - [ ] `PeriodoSplit.test.tsx`: active option shows underline + text-primary; arrow keys cycle + onChange fires; persistence round-trip via sessionStorage
- **Notes**: do NOT mount in `<Topbar>` until DashboardPage consumes it (per design §9.3). Defer if team rejects optional widget — skip this task entirely.

---

## Wave 5 — Migration of duplicated call sites (12 commits)

Each commit must keep baseline 91 tests green. Mechanical class-string replacement for most; only `TradeTable` (5.10) and admin tables (5.11) require preserving pagination logic.

### T5.1: SubscriptionCard local Badge → `<Badge>`
- **Files**: `src/features/subscription/SubscriptionCard.tsx`
- **Estimate**: ~30 lines

### T5.2: Inline badges → `<Badge>` (5 files)
- **Files**: `src/components/admin/UserRow.tsx`, `src/components/admin/PaymentRow.tsx`, `src/components/admin/PlanRow.tsx` + 2 more (TopPageRow.tsx, PlanHistoryRow.tsx)
- **Estimate**: ~120 lines

### T5.3: TradeStatusBadge → `<Badge variant>`
- **Files**: `src/features/trades/TradeStatusBadge.tsx`, `src/features/trades/types.ts`
- **Estimate**: ~40 lines
- **Notes**: 2-step in ONE commit — update `TRADE_STATUS_BADGE` map to use variant keys + update `TradeStatusBadge.tsx` (per design §10.9).

### T5.4: LoginForm + RegisterForm Inputs → `<Input>`
- **Files**: `src/features/auth/LoginForm.tsx`, `src/features/auth/RegisterForm.tsx`
- **Estimate**: ~80 lines

### T5.5: Trade form modals Inputs/Selects → primitives
- **Files**: `src/features/trades/NewTradeForm.tsx`, `src/features/trades/CloseTradeModal.tsx`, `src/components/portal/DeleteAccountDialog.tsx`, `src/components/portal/FundWithdrawModal.tsx`
- **Estimate**: ~150 lines

### T5.6: UpgradeCard + PlanRow + AdminPlansPage Buttons → `<Button>`
- **Files**: `src/features/subscription/UpgradeCard.tsx`, `src/components/admin/PlanRow.tsx`, `src/pages/admin/AdminPlansPage.tsx`
- **Estimate**: ~80 lines

### T5.7: 15 page-level jade buttons → `<Button>`
- **Files**: `src/components/pricing/PricingTier.tsx`, `src/components/pricing/ComparisonTable.tsx`, `src/components/pricing/BillingCycleToggle.tsx`, `src/components/home/{CtaStrip,ContactTeaser,Hero}.tsx`, `src/pages/{PricingPage,RegisterPage,DashboardPage,UpgradePage,NotFoundPage,LoginPage,FeaturesPage,PaymentSuccessPage}.tsx`, all `src/pages/admin/*Page.tsx`
- **Estimate**: ~280 lines
- **Notes**: mechanical replacement; preserve any `data-testid` attributes.

### T5.8: 4 chrome Buttons → `<Button>`
- **Files**: `src/components/consent/CookiesConsent.tsx`, `src/layout/TopNavMobileDrawer.tsx`, `src/features/auth/AdminRoute.tsx`, `src/features/admin/AdminAuthGuard.tsx`
- **Estimate**: ~80 lines

### T5.9: TopNav Buttons → `<Button>`
- **Files**: `src/layout/TopNav.tsx`
- **Estimate**: ~80 lines

### T5.10: TradeTable native `<table>` → `<DataTable>`
- **Files**: `src/features/trades/TradeTable.tsx`, `src/features/trades/TradeTableRow.tsx`
- **Estimate**: ~180 lines
- **Notes**: 11-column dense grid + `TradeTableRow` cell-renderer map (per design §11.5). Preserve `data-testid` contracts.

### T5.11: Admin tables → `<DataTable>`
- **Files**: `src/pages/admin/AdminUsersPage.tsx`, `src/pages/admin/AdminPlansPage.tsx`, `src/pages/admin/AdminPaymentsPage.tsx`, `src/pages/admin/AdminAnalyticsPage.tsx`
- **Estimate**: ~240 lines
- **Notes**: preserve pagination hooks from existing TanStack Query usage.

### T5.12: CuentasPage + pricing ComparisonTable
- **Files**: `src/pages/portal/CuentasPage.tsx`, `src/components/pricing/ComparisonTable.tsx`
- **Estimate**: ~140 lines
- **Notes**: SKIP `ComparisonTable.tsx` per design §11.4 — it's a feature-vs-feature grid, not a row-based table. Only migrate `CuentasPage.tsx` (which has actual row data).

---

## Wave 6 — Decorative + styleguide (3 commits)

### T6.1: DotGrid SVG component
- **Files**: `src/components/decor/DotGrid.tsx`, `src/components/decor/__tests__/DotGrid.test.tsx`
- **Estimate**: ~110 lines
- **Acceptance**:
  - [ ] Inline SVG with `<defs><pattern>` + `<rect fill="url(#dg)" />`; defaults `spacing=24`, `dotRadius=1.5`, `opacity=0.04`
  - [ ] `useId()` for pattern id collision safety; no `useEffect`
- **Test**:
  - [ ] `DotGrid.test.tsx`: defaults applied; custom opacity passes through to `fill-opacity`; SSR-safe (no `useEffect`)

### T6.2: NeuralNetwork SVG component
- **Files**: `src/components/decor/NeuralNetwork.tsx`, `src/components/decor/__tests__/NeuralNetwork.test.tsx`
- **Estimate**: ~150 lines
- **Acceptance**:
  - [ ] Seeded RNG (mulberry32, seed `0xC0FFEE`) for deterministic node placement
  - [ ] Edge count bounded: `Math.round(nodes * (nodes-1) / 2 * density)`
  - [ ] Edges: `<line stroke="#00FF9D" stroke-opacity="0.03">`
  - [ ] When `animate="drift"` AND no reduced-motion: `animate-neural-drift` (±4px translate, 12s ease-in-out infinite)
  - [ ] Reduced-motion forces `animate="static"` regardless of prop
- **Test**:
  - [ ] `NeuralNetwork.test.tsx`: edge count cap; reduced-motion forces static; deterministic node placement (snapshot test)

### T6.3: JadeShowcase + route registration
- **Files**: `src/styleguide/JadeShowcase.tsx`, `src/router/config.tsx`
- **Estimate**: ~280 lines
- **Acceptance**:
  - [ ] Route `/styleguide/jade` registered (lazy chunk); auth-gated in PROD, open in DEV
  - [ ] Six sections in order: Color tokens swatch grid, Typography stack samples, Glow + glass demo, Every primitive from `primitive-library`, Decor VFX, Anti-patterns (3 forbidden examples with `data-state="forbidden"`)
  - [ ] Each section has `aria-labelledby` heading
  - [ ] `<html>` carries `data-theme="dark"` while mounted; NO theme toggle
  - [ ] Live controls: DotGrid opacity (0.01→0.10), NeuralNetwork nodes (6→24)
- **Test**: indirect — existing styleguide tests + route registration smoke test
- **Notes**: single-file style (mirrors `GlassShowcase.tsx`).

---

## Wave 7 — Enforcement + docs + stub pages (4 commits)

### T7.1: ESLint `no-cyaan-literals` rule
- **Files**: `eslint.config.js`
- **Estimate**: ~40 lines
- **Acceptance**:
  - [ ] `no-restricted-syntax` rules added with selectors matching `cyan`, `#00FFFF`, `rgba\(0,\s*255,\s*255`, `stroke="#00FFFF"`, `pulse-cyan`
  - [ ] Severity: `warn` (per spec)
  - [ ] Allow-list: `tailwind.config.ts`, `docs/design-system.md`, `openspec/changes/design-system-v1/specs/**`
  - [ ] Add `pnpm lint:design` script that runs WITHOUT `--max-warnings 0` (per design §9.12 — split-script approach)
- **Test**: indirect — `pnpm lint:design` returns 0 violations against post-Wave-3 source
- **Notes**: design §11.1 contradicts `--max-warnings 0` in default `pnpm lint`; resolution = split script.

### T7.2: Stylelint config
- **Files**: `.stylelintrc.json`, `package.json`
- **Estimate**: ~20 lines
- **Acceptance**:
  - [ ] `color-no-hex: true` for `.tsx` style blocks
  - [ ] `declaration-property-value-disallowed-list` blocking `rgba\(0,\s*255,\s*255` on color properties
  - [ ] `ignoreFiles`: `src/components/ui/**`, `src/components/decor/**`, `tailwind.config.ts`, `**/__tests__/**`
  - [ ] Add `stylelint` devDep; add `pnpm stylelint` script
- **Test**: N/A (config only)
- **Notes**: adds ~80MB dev dep. If team rejects, drop this task and rely on ESLint + CI grep (per design §10.5).

### T7.3: CI grep guard + docs/design-system.md
- **Files**: `.github/workflows/ci.yml` (or equivalent), `docs/design-system.md`
- **Estimate**: ~120 lines
- **Acceptance**:
  - [ ] CI grep guard: `! rg -l 'rgba\(0,\s*255,\s*255|#00FFFF|stroke="#00FFFF"|animate-pulse-cyan' src/ --glob '!tailwind.config.ts' --glob '!**/__tests__/**'`
  - [ ] Extend guard to OLD-jade rgba: `rgba\(46,\s*220,\s*140` (per design §11.3)
  - [ ] `docs/design-system.md` sections in order: Color, Typography, Glow + Glass, Components, Decor, Anti-patterns; utility name `border-borderJade` documented (per design §11.7); Anti-patterns lists glow on numeric cells + cyan literals + hardcoded `#00FF9D`
- **Test**: N/A (docs + CI config)
- **Notes**: `docs/design-system.md` has 7 required headings per spec.

### T7.4: Stub pages re-skin + SidebarNav active-line verify + Topbar polish
- **Files**: `src/pages/portal/DiarioPage.tsx`, `src/pages/portal/PlaybookPage.tsx`, `src/pages/portal/ConfiguracionPage.tsx`, `src/components/portal/SidebarNav.tsx`, `src/layout/TopNav.tsx`
- **Estimate**: ~280 lines
- **Acceptance**:
  - [ ] Three stub pages render Cyber-Jade chrome with "Próximamente" content
  - [ ] `SidebarNav.tsx` active line `border-l-4 border-l-primary` + `shadow-glow-jade-md` verified (per design §11.2 NOT `border-primary`); tighten glow if visually subtle
  - [ ] `Topbar.tsx` polish: brand dot, `Iniciar sesión`, `Cerrar sesión` buttons migrated to `<Button>` (already done in 5.9; verify alignment)
- **Test**: existing stub-page tests remain green
- **Notes**: if PeriodoSplit was shipped in T4.12, mount it between `RiskSemaphore` and `CommandPaletteTrigger`; otherwise leave slot empty.

---

## Dependency graph

```
T1.1 → T1.2 → T1.3 → T2.1 → T3a.1 → T3b.1 → T3c.1 → T3d.1
                    ↘ T1.4
T2.1 → T4.1 → T4.2 → T4.3 / T4.4
       ↓      ↓
       T4.5   T4.7 → T4.10 (DataTable)
       T4.6   T4.8 ↗
       T4.9
       T4.11 (depends on T4.6 StatusDot halo)
       T4.12 (optional, parallel to T4.5–T4.11)
T4.* complete → T5.1–T5.12 can start in any order
T4.* + T3d.1 complete → T6.1 → T6.2 → T6.3
T6.3 + T4.* complete → T7.1, T7.2 (parallel)
T7.1 + T7.2 complete → T7.3 → T7.4
```

Per-wave dependencies:

- **Wave 1 sequential** (T1.1 → T1.2 → T1.3 → T1.4)
- **Wave 2** depends on T1.2 (token values needed)
- **Wave 3 sub-waves** depend on prior sub-wave + Wave 2 (3a → 3b → 3c → 3d)
- **Wave 4** can start after T2.1 (need tokens); primitives depend on clsx + token values
- **Wave 5** depends on Wave 4 (consumers need primitives to import)
- **Wave 6** depends on Wave 4 (consumes primitives in styleguide) + Wave 3 (cyan literals must be gone)
- **Wave 7** depends on Wave 6 (styleguide proves the system) + Wave 3 complete (grep guard passes)

---

## Risk register

| Task | Risk | Mitigation |
|------|------|-----------|
| T1.2 (hex pivot) | Visual breakage on pages tuned to softer `#2EDC8C` | Wave 1 ships tokens + manual visual review; revert `tailwind.config.ts` cleanly via `git revert` |
| T1.3 (keyframe rename) | `RouteFallback` + `PaymentSuccessPage` snapshots break | Update snapshot / replace `animate-[pulse-cyan_*]` with `animate-status-dot-pulse` in T3c/T3d |
| T1.4 (font load) | First-paint cost on Rajdhani + Space Grotesk | `@fontsource` self-hosted with `display: swap` (default); subset to Latin |
| T2.1 (glow-cyan removal) | Hidden usage breaks at runtime | CI grep guard catches any leftover; `pnpm test` + visual smoke |
| T3a–T3d (drift) | File scope creep beyond 30+ files | Each sub-wave is one PR; extend CI grep to OLD-jade rgba in T7.3 |
| T4.1 (Button loading) | Depends on StatusDot | Inline pulse span until T4.6 ships; refactor in T4.6 commit |
| T4.10 (DataTable) | Largest primitive (~320 lines), generic API surface | RED test first; preserve existing `data-testid` contracts |
| T4.11 (Toast) | 3 files in one commit | Required (test imports all three); comprehensive store test |
| T5.3 (TradeStatusBadge) | 2-step refactor split risk | One commit per design §10.9 — update `TRADE_STATUS_BADGE` map + component together |
| T5.10 (TradeTable) | 11-column dense grid + row renderer | Keep old `data-testid` for backward compat (per design §10.3) |
| T5.11 (Admin tables) | Pagination hooks coupling | Preserve existing TanStack Query usage; parent-driven pagination |
| T5.12 (ComparisonTable skip) | Drift to `<DataTable>` would be semantically wrong | SKIP per design §11.4 — only swap strokes, leave `<table>` as feature grid |
| T6.3 (JadeShowcase) | Auth gate conflicts in DEV vs PROD | `import.meta.env.DEV` flag bypasses gate in dev only |
| T7.1 (ESLint warn vs `--max-warnings 0`) | `pnpm lint` fails on any warn | Split script: `pnpm lint:design` runs without `--max-warnings 0` (per design §9.12) |
| T7.2 (Stylelint) | ~80MB dev dep | Optional; drop task if team rejects — ESLint + CI grep cover the rule |
| T7.3 (CI grep) | False positives in test fixtures | `--glob '!**/__tests__/**'` + allow-list |
| T7.4 (Topbar mount PeriodoSplit) | Slot reserved but no consumer | Mount ONLY if T4.12 ships AND DashboardPage consumes it |

---

## Spec contradictions requiring resolution before apply

These MUST be resolved by the user/orchestrator BEFORE `sdd-apply` starts:

1. **ESLint `--max-warnings 0` vs `warn` severity** (design §11.1): default `pnpm lint` runs `eslint . --max-warnings 0` (verified in `package.json` L13). A `warn`-severity rule will fail CI on any match. **Resolution adopted**: split-script approach (`pnpm lint:design` without `--max-warnings 0`). Confirm with user.
2. **`border-l-4 border-primary` shorthand vs existing code** (design §11.2): existing `SidebarNav.tsx` uses `border-l-4 border-l-primary` (border-left-color only). The spec's `border-primary` would set ALL four borders. **Resolution adopted**: keep existing pattern (`border-l-4 border-l-primary`); spec wording is shorthand. No code change in T3b.1; clarification only.
3. **Wave 3 file count 25 vs 30+** (design §11.3): audit found additional OLD-jade rgba files (TopNav, SidebarHeader, Modal, Hero, FeaturesGrid, CtaStrip, ContactTeaser, DashboardPreview, LoginPage, CuentasPage, CuentasDetailPage, FeaturesPage, NotFoundPage, MissionSection, DeleteAccountDialog, Footer). **Resolution adopted**: all 16 added to Wave 3 sub-waves per task list above. CI grep guard in T7.3 extended to `rgba(46,220,140,*)`.
4. **`pricing/ComparisonTable.tsx` is a feature-vs-feature grid** (design §11.4): NOT a row-based data table. **Resolution adopted**: SKIP `<DataTable>` migration in T5.12; only swap cyan strokes to jade in T3c.1.
5. **`TradeTable.tsx` row component owns data formatting** (design §11.5): `TradeTableRow.tsx` applies `font-mono`/`text-profit`/`text-loss` + badge. **Resolution adopted**: T5.10 includes `TradeTableRow.tsx` (cell-renderer map) in the same commit; preserve `data-testid` contracts.
6. **`AdminAuthGuard.tsx` cyan shadow** (design §11.6): L82 cyan shadow not in original 25-file list. **Resolution adopted**: added to T3d.1.
7. **`border-jade` hyphen vs camelCase utility** (design §11.7): Tailwind 3 can't emit flat hyphen keys. **Resolution adopted**: use `borderJade` key + `border-borderJade` utility name (per design §9.8); documented in T7.3 `docs/design-system.md`.
