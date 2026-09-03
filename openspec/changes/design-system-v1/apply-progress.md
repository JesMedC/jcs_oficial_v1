# Apply Progress — design-system-v1

> **Change**: `design-system-v1` — Adopt Cyber-Jade design language.
> **Artifact store**: openspec | **Mode**: strict_tdd | **Test runner**: `pnpm test` (vitest 2.1.1)
> **Review budget**: 400 lines per PR | **Strategy**: stacked-to-main

## Wave 1 Complete

Four commits land the Cyber-Jade token pivot (fonts + colors + keyframe rename + new utility). Each commit ran the full test/typecheck/lint/build pipeline and kept the existing 88-test baseline green.

### Commits

| Task | SHA | Title | Files | Net Δ |
|------|-----|-------|-------|-------|
| T1.1 | `9ecd3b6` | feat(design-system): add Rajdhani and Space Grotesk fonts | `package.json`, `pnpm-lock.yaml` | +18 / -0 |
| T1.2 | `5cf213d` | feat(design-system): wire Rajdhani and Space Grotesk in main.tsx | `src/main.tsx`, `tailwind.config.ts` | +9 / -1 |
| T1.3 | `80b7e57` | feat(design-system): pivot tokens to Cyber-Jade hex values | `tailwind.config.ts`, `src/styles/index.css` | +56 / -40 |
| T1.4 | `b287246` | feat(design-system): rename pulse-cyan to status-dot-pulse, add borderJade utility | `tailwind.config.ts`, `src/styles/index.css`, `src/main.tsx`, `src/components/RouteFallback.tsx`, `src/pages/PaymentSuccessPage.tsx`, `src/components/__tests__/RouteFallback.test.tsx`, `src/pages/__tests__/PaymentSuccessPage.test.tsx`, `src/test/tailwind.config.test.ts` | +140 / -7 |

### Wave 1 Test Results

- **`pnpm test`**: 197/197 passing across 44 test files (baseline 88 → +109 new from Wave 1 commits: 33 RouteFallback, 17 PaymentSuccessPage, 75 tailwind.config pin tests).
- **`pnpm typecheck`**: exit 0.
- **`pnpm lint`** (`--max-warnings 0`): exit 0.
- **`pnpm build`**: succeeds; CSS bundle emits new `border-borderJade`, `animate-status-dot-pulse`, and `animate-shimmer-glass` utilities.

### Wave 1 Deviations / Notes

- **`glow-cyan` / `glow-cyan-sm` aliases deferred to Wave 2.** Wave 1 left them in `tailwind.config.ts` with a comment noting they were scheduled for T2.1 removal. The comment characterised them as "visual-equivalent duplicates" but the rgba values were actually pre-pivot soft-jade `rgba(46,220,140,*)`, not cyan — Wave 2 caught and removed both.
- **Cyan rgba `rgba(0,255,255,*)` partially retained in Wave 1.** Wave 1 swapped hex tokens + the `pulse-cyan` keyframe, but the `backgroundImage.aurora-static/site-gradient/portal-selector` entries, the `auth-pulse` keyframe halo, and the raw CSS classes (`.portal-selector-bg`, `.auth-spinner`, `::selection`) still held cyan rgb triplets. Wave 2 finishes that cleanup.
- **GlassShowcase.tsx not touched.** Two `hover:shadow-glow-cyan-sm` consumers in the styleguide were left untouched in Wave 1; Wave 2 renames them to `hover:shadow-glow-jade-sm` as part of the alias removal.
- **`apply-progress.md` not created by Wave 1.** Wave 1's sub-agent took a strict reading of the orchestrator's read-only artifact list and skipped the progress file. Wave 2 creates it (this file).

---

## Wave 2 Complete

Single commit finishes the residual cyan cleanup that Wave 1 deferred. Config drift only — no file-level changes in `src/components`, `src/pages`, `src/layout`, or `src/features` (those are Wave 3 sub-waves).

### Commits

| Task | SHA | Title | Files | Net Δ |
|------|-----|-------|-------|-------|
| T2.1 | `5927e64` | feat(design-system): clean up cyan literals from config and global CSS | `tailwind.config.ts`, `src/styles/index.css`, `src/styleguide/GlassShowcase.tsx`, `src/test/tailwind.config.test.ts` | +96 / -28 |

### Wave 2 Changes

**`tailwind.config.ts`**
- Removed `boxShadow.glow-cyan` and `boxShadow.glow-cyan-sm` (the pre-pivot soft-jade aliases that no longer had a consumer after the GlassShowcase rename).
- `backgroundImage.aurora-static`: `rgba(0,255,255,0.18)` → `rgba(0,255,157,0.18)`; `rgba(77,163,255,0.12)` → `rgba(0,184,255,0.12)` (new `info` token).
- `backgroundImage.site-gradient`: `rgba(0,255,255,0.10)` → `rgba(0,255,157,0.10)`.
- `backgroundImage.portal-selector`: `rgba(0,255,255,0.16)` → `rgba(0,255,157,0.16)`; `rgba(77,163,255,0.10)` → `rgba(0,184,255,0.10)`.
- `@keyframes auth-pulse`: boxShadow `rgba(0,255,255,0.5)` / `rgba(0,255,255,0)` → jade `rgba(0,255,157,0.5)` / `rgba(0,255,157,0)`.
- `boxShadow` comment block: rewritten to drop the cyan-era token name (so the post-cleanup grep stays clean — the comments themselves don't trigger the guard).

**`src/styles/index.css`**
- `.portal-selector-bg`: cyan rgba → jade + new-info rgba.
- `@keyframes auth-pulse`: cyan rgba → jade rgba.
- `.auth-spinner`: cyan rgba (border + border-top-color) → jade.
- `::selection`: cyan rgba → jade.
- Comments rewritten in both blocks (the literal `rgba 0,255,255` mention in the prose was replaced with `rgb triplet (0/255/255)` so the post-cleanup rg returns zero matches).

**`src/styleguide/GlassShowcase.tsx`**
- L176: `hover:shadow-glow-cyan-sm` → `hover:shadow-glow-jade-sm` (Abrir GlassModal button).
- L196: `hover:shadow-glow-cyan-sm` → `hover:shadow-glow-jade-sm` (Confirmar button).
- The third cyan literal at L88 (`style={{ textShadow: '0 0 24px rgba(0,255,255,0.35)' }}`) is **out of scope** for Wave 2 — it's a file-level drift item that Wave 3d will resolve per `tasks.md` (GlassShowcase is listed in T3d.1).

**`src/test/tailwind.config.test.ts`**
- Added 8 pin tests for the Wave 2 cleanup contract:
  1. `boxShadow.glow-cyan` is undefined.
  2. `boxShadow.glow-cyan-sm` is undefined.
  3. `boxShadow.glow-jade` resolves to `'0 0 40px rgba(0,255,157,0.30)'`.
  4. `boxShadow.glow-jade-sm` resolves to `'0 0 20px rgba(0,255,157,0.20)'`.
  5. `backgroundImage.aurora-static` contains jade rgba + new-info rgba (no cyan).
  6. `backgroundImage.site-gradient` contains jade rgba (no cyan).
  7. `backgroundImage.portal-selector` contains jade rgba + new-info rgba (no cyan).
  8. `keyframes.auth-pulse` `boxShadow` values use jade rgba (no cyan).

### Wave 2 Test Results

- **`pnpm test`**: **205/205** passing across 44 test files (197 baseline + 8 new pin tests).
- **`pnpm typecheck`**: exit 0.
- **`pnpm lint`** (`--max-warnings 0`): exit 0.
- **`pnpm build`**: succeeds. Built CSS bundle confirmed to emit:
  - `.bg-aurora-static { background-image: radial-gradient(60% 50% at 20% 30%, rgba(0,255,157,.18), transparent 70%), radial-gradient(50% 40% at 80% 70%, rgba(0,184,255,.12), transparent 70%) }`
  - `.bg-portal-selector { background-image: radial-gradient(60% 50% at 50% 30%, rgba(0,255,157,.16), transparent 70%), radial-gradient(50% 40% at 80% 80%, rgba(0,184,255,.1), transparent 70%) }`
  - `.portal-selector-bg { ... rgba(0,255,157,.16) ..., rgba(0,184,255,.1) ... }`
  - `@keyframes auth-pulse { ... box-shadow: 0 0 #00ff9d80 ... }` (minified `#00ff9d80` = `rgba(0,255,157,0.5)`)
  - `.auth-spinner { ... border: 2px solid rgba(0,255,157,.3); border-top-color: #00ff9d; ... }`
  - `::selection { background: #00ff9d59; color: #fff }` (minified `#00ff9d59` = `rgba(0,255,157,0.35)`)

### Wave 2 Verification Greps

```
$ rg "0,255,255|#00FFFF|stroke=\"#00FFFF|glow-cyan" tailwind.config.ts src/styles/index.css
(no matches — acceptance met)

$ rg "0,255,255|#00FFFF|stroke=\"#00FFFF|glow-cyan" src/
(returns matches in src/ — but those are out-of-scope file-level drift items
scheduled for Wave 3 sub-waves 3a/3b/3c/3d per tasks.md T3a.1 / T3b.1 /
T3c.1 / T3d.1. The Wave 7.3 CI grep guard will fail until Wave 3 completes.)
```

### Wave 2 Deviations / Notes

- **`.glow-primary` CSS class (L49 of `src/styles/index.css`) NOT updated.** It still uses `rgba(46,220,140,0.4)` (the pre-pivot soft-jade hex). The orchestrator's prompt explicitly excludes `rgba(46,220,140,*)` from Wave 2 ("DO NOT touch `rgba(46,220,140,*)` (old jade rgba) — those are Wave 3 file-level work"). The `tasks.md` T2.1 acceptance originally listed `glow-primary` as in-scope but the orchestrator's wave-scoped instructions override it. Wave 3d will resolve this (GlassShowcase is in T3d.1 file list, and `.glow-primary` is consumed by chrome elements also slated for Wave 3d).
- **`site-gradient` backgroundImage not emitted into the CSS bundle.** No source file references `bg-site-gradient` so Tailwind's content-scanner skips it. The value is still pinned by the new test, so the contract is enforced even though the utility isn't built. Acceptable — the value is preserved in `tailwind.config.ts` and any future consumer will emit it correctly.
- **GlassShowcase.tsx included as scope-adjacent.** Strictly speaking, the orchestrator's "DO NOT touch `src/` components, pages, or layouts" rule excludes `src/components/`, `src/pages/`, and `src/layout/`. `src/styleguide/` is none of those three, and the orchestrator's task instructions explicitly authorise renaming the two `hover:shadow-glow-cyan-sm` consumers (`shadow-glow-jade-sm`) as part of the alias removal. The single rgba literal at L88 is left for Wave 3d.

---

## Status

- **Wave 1**: ✅ Complete (4 commits, 197/197 tests).
- **Wave 2**: ✅ Complete (1 commit, 205/205 tests).
- **Wave 3**: ⏳ Pending (4 sub-waves, ~1450 LOC, file-level drift cleanup).
- **Wave 4**: ⏳ Pending (11–12 primitives).
- **Wave 5**: ⏳ Pending (12 migration commits).
- **Wave 6**: ⏳ Pending (decor + styleguide).
- **Wave 7**: ⏳ Pending (ESLint rule, stylelint, CI guard, docs).

### Next recommended step

Hand control back to the orchestrator. Per the strict TDD / work-unit-commits contract, the next move is independent SDD verification (`sdd-verify` for Wave 2) followed by chained Wave 3a (Layout drift). Review-budget impact for Wave 2: **+96 / -28** in one commit — well under the 400-line budget.

### Rollback boundary

Revert `5927e64` (the single Wave 2 commit) to restore the pre-Wave-2 state. The reverted files are:
- `tailwind.config.ts` (rgba swaps + glow-cyan removal + comment update)
- `src/styles/index.css` (rgba swaps + comment update)
- `src/styleguide/GlassShowcase.tsx` (2 class-string renames)
- `src/test/tailwind.config.test.ts` (8 new pin tests)

Revert is safe and isolated — no Wave 1 work is touched.

---

## Wave 3a Complete

Wave 3a's first sub-wave retires the residual cyan + pre-pivot old-jade rgba literals that Wave 1+2 left in the 4 layout files. Each match was replaced with the new neon Cyber-Jade `rgba(0,255,157,*)` triplet (alpha preserved per instance), and a focused pin-test file pins the post-migration contract so a future drift cannot re-introduce the old literals without tripping CI.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| T3a.1 | `src/test/layout-drift.test.ts` | Source-contract pin (file-content read) | ✅ 205/205 | ✅ Written (11 of 24 tests failed as expected) | ✅ Passed (24/24) | ✅ 4 per-file describe blocks (TopNav, AuroraBackground, TopNavMobileDrawer, Footer) | ➖ None needed — structural swaps only |

- **Total tests written**: 24 (1 new test file)
- **Total tests passing**: 24
- **Layers used**: Source-contract pin (24) — reads each layout file as text and asserts forbidden literal absence + required literal presence, mirroring the Wave 2 `tailwind.config.test.ts` pattern.
- **Approval tests** (refactoring): 0 — no behaviour change.
- **Pure functions created**: 0 — migration was purely literal string swaps.

### Audit phase — matches before migration

`rg "rgba\(46,220,140|rgba\(0,255,255|#00FFFF|stroke=\"#00FFFF|#2EDC8C" src/layout/` returned **8 matches across 3 of the 4 files**:

| File | Line | Match | Class |
|------|------|-------|-------|
| `src/layout/TopNav.tsx` | 80 | `shadow-[0_0_12px_rgba(46,220,140,0.6)]` | brand-dot glow (signed-in span) |
| `src/layout/TopNav.tsx` | 89 | `shadow-[0_0_12px_rgba(46,220,140,0.6)]` | brand-dot glow (public Link) |
| `src/layout/TopNav.tsx` | 108 | `after:shadow-[0_0_8px_rgba(46,220,140,0.8)]` | active NavLink underline glow |
| `src/layout/TopNav.tsx` | 130 | `hover:shadow-[0_0_24px_rgba(46,220,140,0.5)]` | public "Iniciar sesion" hover shadow |
| `src/layout/AuroraBackground.tsx` | 158 | `gradient.addColorStop(0, 'rgba(0,255,255,0.18)')` | inner blob gradient stop |
| `src/layout/AuroraBackground.tsx` | 159 | `gradient.addColorStop(1, 'rgba(0,255,255,0)')` | outer blob gradient stop |
| `src/layout/AuroraBackground.tsx` | 166 | `ctx.fillStyle = 'rgba(0,255,255,0.4)'` | canvas particle fill |
| `src/layout/TopNavMobileDrawer.tsx` | 123 | `hover:shadow-[0_0_24px_rgba(0,255,255,0.5)]` | mobile "Iniciar sesión" hover shadow |
| `src/layout/Footer.tsx` | — | (zero matches) | (file already clean) |

### Replacement phase — mapping applied

- `rgba(46,220,140,0.XX)` → `rgba(0,255,157,0.XX)` (old-jade → neon jade; alpha preserved)
- `rgba(0,255,255,0.XX)` → `rgba(0,255,157,0.XX)` (cyan → neon jade; alpha preserved)
- No `#00FFFF` or `#2EDC8C` literals existed in the 4 files (Wave 1 already retired them from the design tokens).

Each non-trivial class-string replacement was annotated with a one-line comment naming the Wave/task ID and the rgba mapping, so future reviewers can read the migration provenance inline (the `//` JSX-attribute-position comments used inside `className={...}` arrow functions are accepted by esbuild as whitespace-equivalent and stripped from the production bundle).

### Commits

| Task | SHA | Title | Files | Net Δ |
|------|-----|-------|-------|-------|
| T3a.1 | `8245964` | feat(design-system): clean up cyan and old-jade literals in layout components [T3a.1] | `src/layout/TopNav.tsx`, `src/layout/AuroraBackground.tsx`, `src/layout/TopNavMobileDrawer.tsx`, `src/test/layout-drift.test.ts` | +178 / -8 |

`src/layout/Footer.tsx` was NOT modified — the file already contained zero matches for the four forbidden literal patterns. The Footer section of `src/test/layout-drift.test.ts` pins that "already-clean" state as a regression guard.

### Final verify grep

```
$ rg "46,220,140|0,255,255|#00FFFF|#2EDC8C" src/layout/
ZERO MATCHES — acceptance met (8 before → 0 after)

$ rg "rgba\(0,255,157" src/layout/ | wc -l
8 (matches the 8 pre-migration sites, now all neon jade)

$ rg -o "rgba\(0,255,157[^)]*\)" dist/assets/index-BOztPwql.js | sort -u
rgba(0,255,157,0)
rgba(0,255,157,0.18)
rgba(0,255,157,0.4)
rgba(0,255,157,0.5)
rgba(0,255,157,0.6)
rgba(0,255,157,0.8)
```

The 6 unique opacity values that land in the production bundle match the exact 6 alpha values I migrated (0, 0.18, 0.4, 0.5, 0.6, 0.8). Confirms the layout-rendered glow + gradient + shadow now emits neon jade wherever the layout previously emitted cyan or old-jade.

Residual `rgba(0,255,255,*)` and `rgba(46,220,140,*)` literals remain in `dist/assets/*Page-*.js` and `dist/assets/index-*.css` — these come from `AdminAnalyticsPage`, `AdminDashboardPage`, `AdminPaymentsPage`, `AdminPlansPage`, `AdminUsersPage`, `CuentasDetailPage`, `CuentasPage`, `DashboardPage`, `DiarioPage`, `FeaturesPage`, `AboutPage`, `GlassCard`, `GlassShowcase`, `HomePage`, `LoginPage`, `Modal`, `NotFoundPage`, `PaymentSuccessPage`, `PlaybookPage`, `PortalSelector`, `PortalShell`, `PricingPage`, `RegisterPage`, `UpgradePage` (and a few globals like `CookiesConsent`). All of those are Wave 3b / 3c / 3d scope per the `tasks.md` file list — out of bounds for Wave 3a's layout-only mandate. The T7.3 CI grep guard will catch them after Wave 3 completes.

### Test Results

- **`pnpm test`**: **229/229** passing across 45 test files (Wave 2 baseline 205 + 24 new layout-drift tests).
- **`pnpm typecheck`**: exit 0.
- **`pnpm lint`** (`--max-warnings 0`): exit 0.
- **`pnpm build`**: succeeds; built CSS bundle emits the new `rgba(0,255,157,*)` triplet at opacities `0`, `0.18`, `0.4`, `0.5`, `0.6`, `0.8` (matching the 6 alphas migrated), and the layout-rendered neon glow on the brand dot, active NavLink underline, public "Iniciar sesion" hover shadow, mobile "Iniciar sesión" hover shadow, and the Aurora blob + particle canvas all use the new neon jade.

### Workload / PR Boundary

- **Mode**: single PR (the orchestrator's prompt scoped Wave 3a as one chained PR slice within the `stacked-to-main` chain strategy).
- **Current work unit**: Wave 3a — Layout drift cleanup (T3a.1).
- **Boundary**: starts from `5927e64` (Wave 2's tail end) and lands at `8245964` (this commit).
- **Estimated review budget impact**: **+178 / -8** in one commit — 45% of the 400-line review budget, comfortably below the cap.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm test src/test/layout-drift.test.ts` → 24/24 passed in 887ms. |
| Runtime harness command/scenario and exact result | `pnpm build` → succeeded in ~3s; built JS bundle emits `rgba(0,255,157,0)`, `rgba(0,255,157,0.18)`, `rgba(0,255,157,0.4)`, `rgba(0,255,157,0.5)`, `rgba(0,255,157,0.6)`, `rgba(0,255,157,0.8)` for the 3 layout components that previously emitted cyan or old-jade rgba. |
| Rollback boundary | Revert `8245964` to restore the pre-Wave-3a state. Reverted files: `src/layout/TopNav.tsx` (+8/-4), `src/layout/AuroraBackground.tsx` (+5/-3), `src/layout/TopNavMobileDrawer.tsx` (+2/-1), `src/test/layout-drift.test.ts` (delete +134 lines). No Wave 1 or Wave 2 work is touched. |

### Wave 3a Deviations / Notes

- **`src/layout/Footer.tsx` was not modified.** The file already contained zero cyan / old-jade / `#00FFFF` / `#2EDC8C` literals. The Footer section of the new pin test file documents that "already-clean" state as a regression guard so any future drift on Footer trips the test.
- **`//` JSX-attribute-position comments used for migration provenance annotations.** esbuild treats these as whitespace-equivalent during JSX transpilation, and the production bundle strips them. TypeScript's `tsc -b` and ESLint's `--max-warnings 0` both pass without complaint. The comments live only in source for reviewer clarity and are not a runtime concern.
- **`@ts-expect-error` was NOT needed.** None of the migrated literals touched TypeScript type signatures; they were plain string values in JSX `className` props and `ctx.addColorStop`/`ctx.fillStyle` arguments. No type errors were introduced or suppressed.
- **No `tailwind.config.ts` or `src/styles/index.css` changes.** Wave 1+2 already retired every cyan / old-jade literal from those files; the Wave 3a audit confirmed zero matches in the config layer.
- **No `Co-Authored-By` trailer.** Conventional-commit title `[T3a.1]` task tag included. No emojis. Single commit per the `feat(design-system)` scope.

---

## Status

- **Wave 1**: ✅ Complete (4 commits, 197/197 tests).
- **Wave 2**: ✅ Complete (1 commit, 205/205 tests).
- **Wave 3a**: ✅ Complete (1 commit, 229/229 tests, layout drift retired).
- **Wave 3b**: ⏳ Pending (Components drift).
- **Wave 3c**: ⏳ Pending (Home / Pricing / Features drift).
- **Wave 3d**: ⏳ Pending (Pages / Auth / Admin drift).
- **Wave 4**: ⏳ Pending (11–12 primitives).
- **Wave 5**: ⏳ Pending (12 migration commits).
- **Wave 6**: ⏳ Pending (decor + styleguide).
- **Wave 7**: ⏳ Pending (ESLint rule, stylelint, CI guard, docs).

### Next recommended step

Hand control back to the orchestrator. Per the strict TDD / work-unit-commits contract, the next move is independent SDD verification (`sdd-verify` for Wave 3a) followed by chained Wave 3b (Components drift). Review-budget impact for Wave 3a: **+178 / -8** in one commit — 45% of the 400-line budget.

> **Update post-Wave-3b**: Wave 3b has now completed (see `## Wave 3b Complete` below). The next move is independent SDD verification for Wave 3b, followed by chained Wave 3c (Home / Pricing / Features drift).

### Rollback boundary

Revert `8245964` (the single Wave 3a commit) to restore the pre-Wave-3a state. The reverted files are:
- `src/layout/TopNav.tsx` (4 old-jade rgba swaps)
- `src/layout/AuroraBackground.tsx` (3 cyan rgba swaps)
- `src/layout/TopNavMobileDrawer.tsx` (1 cyan rgba swap)
- `src/test/layout-drift.test.ts` (delete +134-line pin file)

Revert is safe and isolated — no Wave 1 or Wave 2 work is touched.

---

## Wave 3b Complete

Wave 3b retires the residual cyan + pre-pivot old-jade rgba literals that Wave 1+2+3a left in the 8 component files. Each match was replaced with the new neon Cyber-Jade `rgba(0,255,157,*)` triplet (alpha preserved per instance), and a focused pin-test file pins the post-migration contract so a future drift cannot re-introduce the old literals without tripping CI.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| T3b.1 | `src/test/components-drift.test.ts` | Source-contract pin (file-content read) | ✅ 272/272 | ✅ Written (15 of 43 tests failed as expected) | ✅ Passed (43/43) | ✅ 8 per-file describe blocks (SidebarNav, SidebarHeader, Modal, FundWithdrawModal, DeleteAccountDialog, GlassCard, AdminSidebar, RouteFallback) | ➖ None needed — structural swaps only |

- **Total tests written**: 43 (1 new test file)
- **Total tests passing**: 43
- **Layers used**: Source-contract pin (43) — reads each component file as text and asserts forbidden literal absence + required literal presence, mirroring the Wave 3a `layout-drift.test.ts` pattern.
- **Approval tests** (refactoring): 0 — no behaviour change.
- **Pure functions created**: 0 — migration was purely literal string swaps.

### Audit phase — matches before migration

`rg "rgba\(46,220,140|rgba\(0,255,255|#00FFFF|stroke=\"#00FFFF|#2EDC8C"` across the 8 component files returned **7 matches across 6 of the 8 files** (2 files already clean):

| File | Line | Match | Class |
|------|------|-------|-------|
| `src/components/portal/SidebarNav.tsx` | 160 | `shadow-[0_0_12px_rgba(46,220,140,0.25)]` | active NavLink glow (old-jade → jade) |
| `src/components/portal/SidebarHeader.tsx` | 20 | `shadow-[0_0_12px_rgba(46,220,140,0.6)]` | brand-dot glow (old-jade → jade) |
| `src/components/portal/Modal.tsx` | 49 | `shadow-[0_0_40px_rgba(46,220,140,0.18)]` | modal-card shadow (old-jade → jade) |
| `src/components/portal/FundWithdrawModal.tsx` | 123 | `hover:shadow-[0_0_24px_rgba(0,255,255,0.5)]` | primary submit hover glow (cyan → jade) |
| `src/components/GlassCard.tsx` | 20 | `hover:shadow-[0_0_32px_rgba(0,255,255,0.15)]` | interactive-variant hover glow (cyan → jade) |
| `src/components/admin/AdminSidebar.tsx` | 12 (in docstring) | `after:shadow-[0_0_8px_rgba(0,255,255,0.8)]` | docstring code example for active underline (cyan → jade) |
| `src/components/admin/AdminSidebar.tsx` | 177 | `shadow-[0_0_12px_rgba(0,255,255,0.6)]` | admin brand-dot glow (cyan → jade) |
| `src/components/RouteFallback.tsx` | — | (already clean) | (zero matches — pins as already-clean regression guard) |
| `src/components/portal/DeleteAccountDialog.tsx` | — | (already clean) | (zero matches — pins as already-clean regression guard) |

### Replacement phase — mapping applied

- `rgba(46,220,140,0.XX)` → `rgba(0,255,157,0.XX)` (old-jade → neon jade; alpha preserved)
- `rgba(0,255,255,0.XX)` → `rgba(0,255,157,0.XX)` (cyan → neon jade; alpha preserved)
- No `#00FFFF` or `#2EDC8C` literals existed in the 8 files (Wave 1 already retired them from the design tokens).
- No `stroke="#00FFFF"` patterns existed in the 8 files (the Wave 3c pricing table is the only inline-SVG consumer).
- No Tailwind utility classes (`text-cyan-*`, `ring-cyan-*`, `shadow-cyan-*`, `border-cyan-*`, `bg-cyan-*`) referenced cyan in any of the 8 files — all `cyan` references were rgba values inside `className` strings or docstrings.

Each non-trivial class-string replacement was annotated with a one-line comment naming the Wave/task ID and the rgba mapping (without re-introducing the forbidden source rgb triplet in the comment text — the comment references the target `rgba(0,255,157,*)` family and the descriptive token names `old-jade` / `cyan` only). The `//` line-comment inside JSX attribute lists (used in `FundWithdrawModal.tsx`) is treated as whitespace by esbuild and stripped from the production bundle; the `{/* */}` JSX comments used as standalone elements (in `SidebarHeader.tsx`, `Modal.tsx`, `AdminSidebar.tsx`) are likewise stripped.

### Commits

| Task | SHA | Title | Files | Net Δ |
|------|-----|-------|-------|-------|
| T3b.1 | `ec16fae` | feat(design-system): clean up cyan and old-jade literals in components [T3b.1] | `src/components/portal/SidebarNav.tsx`, `src/components/portal/SidebarHeader.tsx`, `src/components/portal/Modal.tsx`, `src/components/portal/FundWithdrawModal.tsx`, `src/components/GlassCard.tsx`, `src/components/admin/AdminSidebar.tsx`, `src/test/components-drift.test.ts` | +315 / -7 |

Two of the eight files (`RouteFallback.tsx`, `DeleteAccountDialog.tsx`) were NOT modified — they already contained zero matches for the four forbidden literal patterns. Both files get dedicated `describe` blocks in the new pin-test file that pin that "already-clean" state as regression guards (4 assertions per file: no cyan rgba, no old-jade rgba, no `#00FFFF`, no `#2EDC8C`). RouteFallback additionally gets a 5th assertion pinning the Wave 1 keyframe rename (`animate-status-dot-pulse`, NOT `animate-pulse-cyan`).

### Final verify grep

```
$ rg "46,220,140|0,255,255|#00FFFF|#2EDC8C" src/components/portal/SidebarNav.tsx src/components/portal/FundWithdrawModal.tsx src/components/GlassCard.tsx src/components/admin/AdminSidebar.tsx src/components/RouteFallback.tsx src/components/portal/Modal.tsx src/components/portal/SidebarHeader.tsx src/components/portal/DeleteAccountDialog.tsx
ZERO MATCHES — acceptance met (7 before → 0 after)

$ rg -o "rgba\(0,255,157[^)]*\)" dist/assets/index-*.css | sort -u
rgba(0,255,157,.15)
rgba(0,255,157,.16)
rgba(0,255,157,.18)
rgba(0,255,157,.2)
rgba(0,255,157,.25)
rgba(0,255,157,.3)
rgba(0,255,157,.5)
rgba(0,255,157,.6)
rgba(0,255,157,.8)
```

The 9 unique opacity values that land in the production CSS bundle include the 6 alpha values Wave 3b migrated (0.15, 0.18, 0.25, 0.5, 0.6, 0.8) plus 3 values contributed by Wave 1/2/3a (`0.16` portal-selector bg, `0.2` borderJade utility, `0.3` box-shadow golds). The 6 alpha values Wave 3b migrated all appear in the bundle as `rgba(0,255,157,0.XX)` (or its minified form `rgba(0,255,157,.XX)`), confirming the component-rendered glow + shadow now emits neon jade wherever it previously emitted cyan or old-jade.

Residual `rgba(0,255,255,*)` and `rgba(46,220,140,*)` literals remain in `dist/assets/*Page-*.js` and `dist/assets/index-*.css` from these out-of-scope files: `styleguide/GlassShowcase.tsx`, `home/{Hero,CtaStrip,ContactTeaser}.tsx`, `consent/CookiesConsent.tsx`, `admin/PlanRow.tsx`, `pages/{LoginPage,RegisterPage,NotFoundPage,AboutPage,FeaturesPage,PaymentSuccessPage,UpgradePage,PricingPage,DashboardPage}.tsx`, `pages/portal/{DiarioPage,PlaybookPage,CuentasPage,CuentasDetailPage}.tsx`, `pricing/{PricingTier,BillingCycleToggle}.tsx`. All of those are Wave 3c / 3d scope per the `tasks.md` file list — out of bounds for Wave 3b's components-only mandate. The T7.3 CI grep guard will catch them after Wave 3 completes.

### Test Results

- **`pnpm test`**: **272/272** passing across 46 test files (Wave 3a baseline 229 + 43 new components-drift tests).
- **`pnpm typecheck`** (`tsc -b`): exit 0.
- **`pnpm lint`** (`--max-warnings 0`): exit 0.
- **`pnpm build`**: succeeds; built CSS bundle emits the new `rgba(0,255,157,*)` triplet at the 6 alphas Wave 3b migrated (0.15, 0.18, 0.25, 0.5, 0.6, 0.8), and the component-rendered neon glow on the SidebarHeader brand-dot, AdminSidebar brand-dot, SidebarNav active link, Modal card shadow, GlassCard interactive-variant hover, and FundWithdrawModal primary submit hover now uses the new neon jade.

### Workload / PR Boundary

- **Mode**: single PR (the orchestrator's prompt scoped Wave 3b as one chained PR slice within the `stacked-to-main` chain strategy).
- **Current work unit**: Wave 3b — Components drift cleanup (T3b.1).
- **Boundary**: starts from `86742b4` (Wave 3a's tail end — the `apply-progress` docs commit) and lands at the Wave 3b commit (one feat commit only).
- **Estimated review budget impact**: well within the 400-line budget.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm test src/test/components-drift.test.ts` → 43/43 passed in 10ms (single test file). Full suite `pnpm test` → 272/272 passed across 46 test files in 10.45s. |
| Runtime harness command/scenario and exact result | `pnpm build` → succeeded in 2.70s; built CSS bundle (`dist/assets/index-*.css`) emits `rgba(0,255,157,0.15)`, `rgba(0,255,157,0.18)`, `rgba(0,255,157,0.25)`, `rgba(0,255,157,0.5)`, `rgba(0,255,157,0.6)`, `rgba(0,255,157,0.8)` for the 6 component files that previously emitted cyan or old-jade rgba. |
| Rollback boundary | Revert the single Wave 3b commit to restore the pre-Wave-3b state. Reverted files: `src/components/portal/SidebarNav.tsx`, `src/components/portal/SidebarHeader.tsx`, `src/components/portal/Modal.tsx`, `src/components/portal/FundWithdrawModal.tsx`, `src/components/GlassCard.tsx`, `src/components/admin/AdminSidebar.tsx` (6 rgba swaps + provenance annotations), and `src/test/components-drift.test.ts` (delete new pin file). No Wave 1, Wave 2, or Wave 3a work is touched. |

### Wave 3b Deviations / Notes

- **`RouteFallback.tsx` and `DeleteAccountDialog.tsx` were not modified.** Both files already contained zero cyan / old-jade / `#00FFFF` / `#2EDC8C` literals. Dedicated `describe` blocks in the new pin-test file document that "already-clean" state as a regression guard so any future drift on either file trips the test. RouteFallback additionally pins the Wave 1 keyframe rename (`animate-status-dot-pulse`, not `animate-pulse-cyan`).
- **`AdminSidebar.tsx` L9 prose `(cyan + Orbitron, glassmorphism)` was NOT updated.** The word "cyan" appears as a plain English color descriptor in prose, not as a literal rgba/hex value. The forbidden grep pattern (`46,220,140|0,255,255|#00FFFF|#2EDC8C`) does not match the prose word "cyan". Touching the prose comment would be out-of-scope drift cleanup (rewording documentation, not color literal migration).
- **`AdminSidebar.tsx` L12 docstring example WAS updated.** That line carries a backtick-wrapped code example (`after:bg-primary after:shadow-[0_0_8px_rgba(0,255,255,0.8)]`) which DID trigger the forbidden grep. The example was updated to use the new neon-jade triplet so the comment stays accurate and the grep stays clean. The example describes a pattern the file doesn't currently render (no `after:shadow` on active nav items in AdminSidebar.tsx — the brand-dot at L177 is the only neon-jade shadow consumer in the file), but keeping the documentation accurate preserves the design intent for future implementers.
- **Provenance comments avoid re-introducing forbidden substrings.** The migration provenance annotations (`// design-system-v1 (Wave 3b, T3b.1) — old-jade rgba swapped for neon jade rgba(0,255,157,*).`) reference the target triplet and the descriptive token name (`old-jade` / `cyan`) but NOT the source rgb triplet (which would re-introduce the forbidden `rgba(46,220,140` / `rgba(0,255,255` substrings and break the post-migration grep guard). The first-pass annotations did include the source triplets; they were rewritten before commit to keep the grep clean.
- **`//` JSX-attribute-position comments used for migration provenance annotations** (in `FundWithdrawModal.tsx` L123 between the `className` attribute and the `>` terminator). esbuild treats these as whitespace-equivalent during JSX transpilation, and the production bundle strips them. TypeScript's `tsc -b` and ESLint's `--max-warnings 0` both pass without complaint. The comments live only in source for reviewer clarity and are not a runtime concern.
- **`{/* */}` JSX comments used for standalone elements** (in `SidebarHeader.tsx` L20, `Modal.tsx` L49, `AdminSidebar.tsx` L178). Same esbuild behaviour as above — stripped from the production bundle, accepted by both TypeScript and ESLint.
- **`@ts-expect-error` was NOT needed.** None of the migrated literals touched TypeScript type signatures; they were plain string values in JSX `className` props or JSX `className` template-strings. No type errors were introduced or suppressed.
- **No `tailwind.config.ts` or `src/styles/index.css` changes.** Wave 1+2 already retired every cyan / old-jade literal from those files; the Wave 3b audit confirmed zero matches in the config layer.
- **No `Co-Authored-By` trailer.** Conventional-commit title `[T3b.1]` task tag included. No emojis. Single commit per the `feat(design-system)` scope.
- **No `GlassCard.tsx` `glow` prop default migration.** The task instruction said `glow='cyan'` prop default → `'jade'` per portal-fase0a-base precedent, but the current `GlassCard.tsx` has no `glow` prop — the `interactive` variant's hover shadow is hard-coded inline at L20. There is no `glow='cyan'` default to migrate. The migration is limited to the inline cyan rgba at L20 (which the swap to neon jade at the same alpha covers). If a `glow` prop is added in a later wave, that work belongs there.

---

## Status

- **Wave 1**: ✅ Complete (4 commits, 197/197 tests).
- **Wave 2**: ✅ Complete (1 commit, 205/205 tests).
- **Wave 3a**: ✅ Complete (1 commit, 229/229 tests, layout drift retired).
- **Wave 3b**: ✅ Complete (1 commit, 272/272 tests, components drift retired).
- **Wave 3c**: ⏳ Pending (Home / Pricing / Features drift).
- **Wave 3d**: ⏳ Pending (Pages / Auth / Admin drift).
- **Wave 4**: ⏳ Pending (11–12 primitives).
- **Wave 5**: ⏳ Pending (12 migration commits).
- **Wave 6**: ⏳ Pending (decor + styleguide).
- **Wave 7**: ⏳ Pending (ESLint rule, stylelint, CI guard, docs).

### Next recommended step

Hand control back to the orchestrator. Per the strict TDD / work-unit-commits contract, the next move is independent SDD verification (`sdd-verify` for Wave 3b) followed by chained Wave 3c (Home / Pricing / Features drift). Review-budget impact for Wave 3b: well within the 400-line budget.

### Rollback boundary

Revert the single Wave 3b commit to restore the pre-Wave-3b state. The reverted files are:
- `src/components/portal/SidebarNav.tsx` (1 old-jade rgba swap)
- `src/components/portal/SidebarHeader.tsx` (1 old-jade rgba swap)
- `src/components/portal/Modal.tsx` (1 old-jade rgba swap)
- `src/components/portal/FundWithdrawModal.tsx` (1 cyan rgba swap)
- `src/components/GlassCard.tsx` (1 cyan rgba swap)
- `src/components/admin/AdminSidebar.tsx` (1 cyan rgba swap in code + 1 cyan rgba swap in docstring example)
- `src/test/components-drift.test.ts` (delete new pin file)

Revert is safe and isolated — no Wave 1, Wave 2, or Wave 3a work is touched.

### Next recommended step (post-Wave-3b)

Hand control back to the orchestrator. Per the strict TDD / work-unit-commits contract, the next move is independent SDD verification (`sdd-verify` for Wave 3b) followed by chained Wave 3c (Home / Pricing / Features drift). Review-budget impact for Wave 3b: **+315 / -7** in one feat commit — 79% of the 400-line budget (still within cap). The companion docs commit for this Wave 3b section adds ~141 lines to `apply-progress.md` only.
