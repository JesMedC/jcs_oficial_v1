# Proposal: design-system-v1 — Adopt "Cyber-Jade" design language

> Change: `design-system-v1`
> Project: `jcs_oficial` (JadeCapitalSuite — frontend-only SPA in this change)
> Mode: openspec
> Inspiration source: two user-provided screenshots of a futuristic cyberpunk trading UI ("Cyber-Jade" reference); adoption is **inspiration-aligned**, not pixel-perfect
> Date: 2026-09-02

## Why

The user shared two inspiration screenshots of a futuristic trading UI and asked that the JCS Portal "look as similar as possible to that design, but keep what's already built, apply this UI style, and everything new that gets created should maintain it." Three pressures justify formalizing this as a change:

1. **Hex drift**: `tailwind.config.ts` already carries a jade palette (`#2EDC8C`) committed during `portal-fase0a-base`, but the inspiration screenshots call for a more saturated, neon-jade `#00FF9D` plus deeper abyssal bg `#060B10`. The current tokens are *close but not right*.
2. **Inconsistency**: ~25 files still reference cyan literals (`rgba(0,255,255,...)`, `stroke="#00FFFF"`, `pulse-cyan` keyframe) from the pre-jade era. The brand pivot is incomplete.
3. **No primitive library**: 10+ UI primitives (Button, Input, Select, Badge, StatusDot, DataTable, Tabs, EmptyState, Skeleton, Toast) do not exist; their Tailwind class strings are duplicated across 30+ call sites. Every new screen reinvents the chrome, which is exactly what the user's "everything new should maintain it" requirement is asking us to prevent.

We treat the screenshots as **inspiration**, not a pixel-perfect spec. We honor existing functionality, screens, and tests; we restyle chrome, primitives, and decorative VFX to match the Cyber-Jade language.

## What Changes

**A. Token alignment** — pivot hex values in `tailwind.config.ts` and `src/styles/index.css`:
- `primary.DEFAULT` `#2EDC8C` → `#00FF9D`; `primary.dk` `#25B070` → `#00CC7E`; `primary.light` `#7FE9B5` → `#5CFFBE`; `primary.glow` → `#00FF9D`
- `bg` `#080D12` → `#060B10`; `surface` `#0D141B` → `#0D151E`
- `text.primary` `#E9F1F7` → `#E0E6ED`; `text.secondary` `#8FA1B2` → `#8A9BA8`
- `loss` `#FF5C5C` → `#FF2A55` (with neon glow variant)
- `info` `#4DA3FF` → `#00B8FF` (secondary cyan / AI-viz color)
- `primary-fg` `#080D12` → `#060B10`
- Add token `input` = `#0A1017`
- Add utility `border-jade` = `1px solid rgba(0,255,157,0.2)`

**B. Font additions** — install `@fontsource/rajdhani` and `@fontsource/space-grotesk`; wire into `tailwind.config.ts fontFamily.display` as a stack (`Orbitron`, `Rajdhani`, `Space Grotesk`, fallback). Update `src/main.tsx` font imports.

**C. Drift cleanup** — replace cyan literals in 25 files: `tailwind.config.ts` (backgroundImage, `pulse-cyan` keyframe → `pulse-jade`), `src/styles/index.css` (`::selection`, `auth-spinner`), `src/layout/AuroraBackground.tsx`, `src/layout/TopNavMobileDrawer.tsx`, `src/components/portal/SidebarNav.tsx`, `src/components/portal/FundWithdrawModal.tsx`, `src/components/GlassCard.tsx`, `src/components/admin/AdminSidebar.tsx`, `src/components/home/{PricingTier,ComparisonTable,FeatureCard,BillingCycleToggle,UpgradeCard}.tsx`, `src/pages/{PricingPage,RegisterPage,DashboardPage,UpgradePage,PortalSelector}.tsx`, `src/pages/portal/{DiarioPage,PlaybookPage}.tsx`, `src/components/RouteFallback.tsx`.

**D. Primitive component library** — create in `src/components/ui/`:
- `Button` (variants: `primary` transparent-with-jade-border that fills on hover, `ghost`, `danger`, `icon`; sizes `sm`/`md`/`lg`; loading + disabled states)
- `Input`, `Select`, `Textarea` (bg `#0A1017`, jade focus ring + glow)
- `Badge` (semantic colors via `variant` prop; replaces 7 inline copies)
- `StatusDot` (pulsing jade/cyan/red/amber dot)
- `DataTable` (sticky header, minimal `1px solid rgba(255,255,255,0.05)` separators; replaces 7 native `<table>` instances)
- `Tabs` / `TabBar` (jade underline on active)
- `EmptyState` (icon + title + CTA slot)
- `Skeleton` (jade shimmer)
- `Toast` (top-right slide-in, 3 severities; thin wrapper around a new `useToast` Zustand slice)

Each primitive gets a `.test.tsx` colocated. Behavioral contracts live in specs, not in this proposal.

**E. Migration of duplicated call sites** — refactor consumers to import primitives: 20+ jade-button duplicates → `<Button variant="primary">`; 8+ form duplicates → `<Input>` / `<Select>` / `<Textarea>`; 7 badge duplicates → `<Badge>`; 7 table duplicates → `<DataTable>`.

**F. Decorative system** — add `src/components/decor/`:
- `DotGrid.tsx` — SVG dot-grid background at 3-5% opacity
- `NeuralNetwork.tsx` — SVG node-link graphic for AI modules
- `statusDotPulse` keyframe + utility in tailwind config

**G. Styleguide expansion** — extend existing `src/styleguide/GlassShowcase.tsx` (route `/styleguide/glass`) into `/styleguide/jade` covering every primitive, token swatch, font sample, and decorative VFX with live controls.

**H. Stub pages refresh** — re-skin `/portal/diario`, `/portal/playbook`, `/portal/configuracion` in Cyber-Jade chrome (content stays "Próximamente").

**I. Sidebar active line + topbar widgets polish** — verify the existing `PortalSidebar` + `SidebarNav.tsx` active-state (`border-l-4 border-primary shadow-glow-jade`) matches the spec luminous-vertical-line; tighten glow if needed. Optionally add a "Periodo split" widget in Topbar (decision deferred to `sdd-design`).

**J. Style enforcement for new code** — define a drift-prevention strategy. Recommended: a custom ESLint rule `no-cyaan-literals` + a stylelint config banning raw `rgba(0,255,255,*)` outside `tailwind.config.ts`, plus a `docs/design-system.md` convention doc. Start as documentation + CI check (warning), promote to error after one release cycle.

## Scope

### In Scope (frontend only)
- Items A–J above.
- New dependencies: `@fontsource/rajdhani`, `@fontsource/space-grotesk` (dev), optionally `stylelint` if chosen for style enforcement.

### Out of Scope
- Backend (FastAPI under `/backend`) — preserved as-is. The uncommitted `multitenant-trading-account-trade-workspace-id` diff must remain untouched.
- `portal-fase0a-base` remediation (build verify pending) — separate workstream.
- Pixel-perfect reproduction of the inspiration screenshots — we ship inspiration-aligned, not 1:1.
- New product features beyond re-skin (Diario/Playbook/Configuracion stay "Próximamente" in this change).
- E2E tests beyond what already exists; visual regression via Playwright is optional and deferred.
- `RiskSemaphore` real data binding (deferred per `topbar` spec).
- Style-enforcement rule promoted to hard error (deferred — doc + warning first).

### New Capabilities
- `cyber-jade-tokens`: full Cyber-Jade color + typography + glow token system, including `input` background and `border-jade` utility.
- `primitive-library`: 10 UI primitives with behavioral contracts (Button, Input, Select, Textarea, Badge, StatusDot, DataTable, Tabs, EmptyState, Skeleton, Toast).
- `decorative-system`: DotGrid SVG, NeuralNetwork SVG, statusDotPulse animation.
- `styleguide-jade`: `/styleguide/jade` showcase route.
- `style-enforcement`: ESLint + stylelint config + `docs/design-system.md` to prevent drift regression.

### Modified Capabilities
- `color-system`: hex values pivot to Cyber-Jade spec; `glow` restricted to chrome only (already in current spec, reaffirm).
- `portal-shell`: add explicit requirement for luminous vertical-line active state on sidebar nav items.
- `topbar`: add the "Periodo split" widget as an optional Topbar slot (decision deferred to `sdd-design`).

## Approach

Sequenced in 7 waves so each leaves the app buildable and tests green. Wave order is a guideline; `sdd-tasks` refines per the 400-line review budget.

| Wave | Scope | Review size |
|------|-------|-------------|
| 1 | Fonts install + token hex pivots (A, B) | small |
| 2 | Cyan drift cleanup in tailwind config + global CSS (C-config) | small |
| 3 | Cyan drift cleanup across the 25 listed files (C-rest) | large — split per area |
| 4 | Primitive components (D) — each primitive + test in its own commit | small each |
| 5 | Migration of duplicated call sites (E) | medium per file |
| 6 | Decorative system + styleguide expansion (F, G) | medium |
| 7 | Style enforcement + docs (J) + stub pages refresh (H) + sidebar/topbar polish (I) | medium |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `tailwind.config.ts` | Modified | Hex pivots (A), font stack (B), cyan keyframe rename (C) |
| `src/styles/index.css` | Modified | `::selection`, `auth-spinner` cyan → jade (C) |
| `src/main.tsx` | Modified | Add Rajdhani + Space Grotesk font imports (B) |
| 20+ jade-button call sites | Modified | Consume `<Button>` (E) |
| 8+ form call sites | Modified | Consume `<Input>` / `<Select>` / `<Textarea>` (E) |
| 7 badge call sites | Modified | Consume `<Badge>` (E) |
| 7 table call sites | Modified | Consume `<DataTable>` (E) |
| 23 cyan-drift files | Modified | Replace cyan literals (C) |
| `src/components/ui/*` | New | 10 primitives (D) |
| `src/components/decor/*` | New | DotGrid, NeuralNetwork (F) |
| `src/styleguide/JadeShowcase.tsx` | New | `/styleguide/jade` (G) |
| `src/pages/portal/{Diario,Playbook,Configuracion}.tsx` | Modified | Re-skin in Cyber-Jade (H) |
| `src/components/portal/SidebarNav.tsx` | Modified | Verify + tighten active line (I) |
| `src/components/common/TopNav.tsx` | Possibly | Periodo split widget (I, conditional) |
| `eslint.config.js` / `.stylelintrc.json` | New/Modified | Style enforcement (J) |
| `docs/design-system.md` | New | Convention doc (J) |
| `/backend/**` | **Untouched** | Preserved (multitenant diff in flight) |
| `openspec/changes/portal-fase0a-base/**` | **Untouched** | Separate workstream |

## Risks & Trade-offs

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Hex pivot visually breaks pages tuned to softer `#2EDC8C` | High | Wave 1 ships tokens + screenshots review before any migration; keep a revert commit; visual diff with Playwright optional |
| Building 10 primitives touches 30+ files; review budget overrun | High | One primitive per commit; each PR ≤ 400 lines per chained-PR rule |
| Inspiration alignment vs pixel-perfect — false expectation | Medium | Decision Summary makes the trade-off binding; docs/design-system.md states "inspiration-aligned, not pixel-perfect" |
| Style-enforcement rule adds dev-time burden and false positives | Medium | Ship as docs + warning in CI first; promote to error only after one release cycle |
| Existing `pulse-cyan` rename breaks `RouteFallback` test snapshots | Low | Update snapshot in same commit; rerun vitest |
| `Rajdhani` / `Space Grotesk` font load cost on first paint | Low | `@fontsource` self-hosted with `display: swap`; subset to Latin |
| Drift cleanup misses a file not in the 25 listed | Medium | Add a grep guard in CI: `rg "rgba\(0,255,255|#00FFFF\|stroke=\"#00FFFF" src/` must return 0 |
| Periodo split widget expands scope creep | Medium | Decision deferred to `sdd-design`; only commit if backed by a real use case |

## Rollback Plan

- Each wave is its own commit. Revert any wave independently.
- Hex pivots revert cleanly with `git revert` of Wave 1; cyc tests stay green.
- Primitive additions are additive — delete `src/components/ui/*` + remove imports; no functional regression.
- Drift cleanup per file is its own commit — `git revert` the offending commit.
- Font installs are additive npm packages; `pnpm remove` reverts.
- Style enforcement is opt-in (warning only); removing the lint rule config reverts to current behavior.

## Dependencies

- `@fontsource/rajdhani` ^5.x — dev/font dependency
- `@fontsource/space-grotesk` ^5.x — dev/font dependency
- Existing stack (Tailwind 3.4, React 18.3, Zustand 4, TanStack Query 5) — no version bumps
- No backend dependency.

## Success Criteria

- [ ] All hex values in `tailwind.config.ts` match the Cyber-Jade spec exactly (primary `#00FF9D`, bg `#060B10`, surface `#0D151E`, loss `#FF2A55`, info `#00B8FF`, text.primary `#E0E6ED`, text.secondary `#8A9BA8`, primary-fg `#060B10`, new `input` `#0A1017`).
- [ ] Zero `rgba(0,255,255,...)`, `#00FFFF`, `stroke="#00FFFF"`, or `pulse-cyan` references outside `tailwind.config.ts` and design-system docs.
- [ ] `Rajdhani` and `Space Grotesk` are imported, in the display stack, and rendered in the styleguide.
- [ ] 10 primitive components exist in `src/components/ui/` with colocated `.test.tsx` files.
- [ ] At least 30 duplicated jade-button / form-input / badge / table class strings are removed from call sites and replaced by primitives.
- [ ] `/styleguide/jade` route renders every primitive + token swatch + decorative VFX.
- [ ] Stub pages `/portal/diario`, `/portal/playbook`, `/portal/configuracion` use Cyber-Jade chrome.
- [ ] `SidebarNav` active item shows the spec-defined luminous vertical-line + glow.
- [ ] `docs/design-system.md` exists; ESLint + stylelint config exists and runs in CI as warning (not error yet).
- [ ] `pnpm test` green; no regression vs. baseline (23 files / 91 tests); coverage thresholds (80/75/80/80) maintained.
- [ ] `pnpm typecheck`, `pnpm lint` pass with no new errors.
- [ ] No `Co-Authored-By` trailers; conventional-commit messages; backend and `portal-fase0a-base/` untouched.

## Decision Summary (binding)

- **Language**: adopt "Cyber-Jade" design language — inspiration-aligned, not pixel-perfect.
- **Preserve**: keep everything already built (functionality, screens, tests, backend).
- **Tokens**: pivot to Cyber-Jade hex values exactly as listed in A.
- **Fonts**: add `Rajdhani` + `Space Grotesk` to the display stack; keep `Orbitron` first.
- **Drift**: zero cyan literals in `src/` after Wave 3; CI grep guard enforces it.
- **Primitives**: ship 10 primitives in `src/components/ui/` with tests; consumers migrate in Wave 5.
- **Style enforcement**: docs + ESLint/stylelint warning first; promotion to error deferred.
- **Scope**: frontend only. Backend and `portal-fase0a-base/` untouched.

## Next Step

Ready for `sdd-spec` — materializar las 5 nuevas specs (`cyber-jade-tokens`, `primitive-library`, `decorative-system`, `styleguide-jade`, `style-enforcement`) y los 3 deltas (`color-system`, `portal-shell`, `topbar`) en `openspec/changes/design-system-v1/specs/<name>/spec.md`.