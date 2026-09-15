# Spec: core-interface-tokens (NEW)

**Change**: `core-interface-redesign`
**Domain**: core-interface-tokens
**Status**: new spec

## Purpose

Define the cyan "Core Interface" accent ladder in both dark and light modes, with glow + glass retunes for the cyan perceptual brightness, so every existing consumer repaints by editing `src/styles/themes.css` only.

## Requirements

### REQ-CIT-001 — Primary accent pivot (MUST)
The primary accent token `--color-jade` (preserved name; semantics now cyan) MUST equal `#00D4D8` in dark mode and a WCAG-AA-compliant cyan variant in light mode. The light-mode variant MUST be approved by `verify-report.md` Slice 5 contrast checks.

### REQ-CIT-002 — Accent ladder (MUST)
The accent ladder MUST include `--color-jade` (`#00D4D8`), `--color-jade-dk` (`#00A8B8`), `--color-jade-light` (`#7CE8EC`), and `--color-jade-glow` (`#00D4D8`). All four MUST be defined in dark mode; light-mode variants MUST be a darker variant of `#00D4D8` that meets body-text contrast against `#FFFFFF` / `--color-bg` light variant.

### REQ-CIT-003 — Glow alpha retune (MUST)
`tailwind.config.ts` `glow-jade` MUST use rgba alpha `0.25` and `glow-jade-sm` MUST use `0.16` (down from `0.30` and `0.20`). A new `glow-cyan` utility MUST be an alias of `glow-jade`.

### REQ-CIT-004 — Glass retune (MUST)
Glassmorphism alphas MUST be `glass.subtle: rgb(255 255 255 / 0.05)`, `glass.DEFAULT: 0.08`, `glass.strong: 0.13`. Border alphas MUST be `glass.border.subtle: 0.06`, `glass.border.DEFAULT: 0.12`, `glass.border.strong: 0.20`.

### REQ-CIT-005 — Profit / loss / info / warning separation (MUST)
Profit, loss, info, and warning tokens MUST remain visually distinct from cyan primary. Profit MUST shift from `#35D07F` to `#3CE0B8` (cyan-green). Loss MUST shift from `#FF2A55` to `#FF3D5F` (slight lift for dark-bg contrast). Info (`#00B8FF`) and warning (`#F3B94E`) MUST remain unchanged.

### REQ-CIT-006 — Single source of truth (MUST)
`src/styles/themes.css` MUST remain the only file that defines the cyan hex literals. All consumers MUST continue to reference the tokens (`bg-jade`, `text-jade`, `border-borderJade`, etc.) — no component MAY inline a cyan hex literal.

### REQ-CIT-007 — Token name preservation (SHOULD)
The `--color-jade-*` naming MUST remain unchanged for backward compatibility (121 components reference these names). A follow-up rename is out of scope for this change.

## Scenarios

### Scenario CIT-S1 — Dark mode repaint
**Given** the user is in dark mode
**And** all consumers reference `--color-jade*` tokens
**When** `src/styles/themes.css` is updated with the cyan ladder
**Then** every consumer repaints to cyan without any consumer code change
**And** `pnpm test` and `pnpm build` pass without changes elsewhere.

### Scenario CIT-S2 — Light mode contrast
**Given** the user toggles to light mode via `useThemeStore`
**And** a body-text element uses `--color-jade` on `--color-bg` (light)
**When** the contrast ratio is measured
**Then** the ratio MUST be ≥ 4.5 (WCAG AA body-text).

### Scenario CIT-S3 — Glow retune visible
**Given** the dashboard renders a `<Button variant="primary">` in dark mode
**When** the user hovers over it
**Then** the cyan glow is visible but not blooming (no halo blowout).

### Scenario CIT-S4 — Glass surface over cyan bg
**Given** a `<GlassCard>` is rendered over the dashboard
**When** the cyan border is visible at the glass boundary
**Then** the border alpha reads as "elevated" without obscuring the underlying decor.

## Anti-patterns

- Inline cyan hex literals (`#00D4D8`, `rgba(0,212,216,*)`) in any file other than `themes.css`, `tailwind.config.ts`, and the allow-listed chart files.
- Renaming `--color-jade*` to `--color-cyan*` (out of scope; deferred to a future rename change).
- Adding new accent colors that compete with cyan for visual primacy.

## Verification

- `pnpm typecheck` passes.
- `pnpm lint` passes (after `no-cyaan-literals` rule lands in Slice 5).
- `scripts/verify-cyan-drift.sh` exits 0.
- Light-mode contrast verified for `--color-jade` × `--color-bg` (light), `--color-jade-fg` × `--color-jade`, and `--color-jade-border-line` × `--color-bg` (light).
