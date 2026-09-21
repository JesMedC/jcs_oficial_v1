# Spec delta: color-system (MODIFIED)

**Change**: `core-interface-redesign`
**Domain**: color-system
**Status**: modified — appends to `openspec/specs/color-system/spec.md` at sync time

## Delta scope

This change pivots the primary accent ladder from jade-green (`#00FF9D`) to cyan (`#00D4D8`). Profit/loss/info/warning tokens are retuned for separation from cyan. Glow + glass alphas are retuned for cyan perceptual brightness. Token NAMES (`--color-jade*`) are preserved for backward compatibility; only the VALUES change.

## New / modified requirements

### REQ-CS-007 — Primary accent pivot (MUST, replaces REQ-CS-001 hex)
`--color-jade` MUST equal `#00D4D8` (cyan) in dark mode. Light mode MUST use a WCAG-AA-compliant cyan variant documented in `verify-report.md` Slice 5.

### REQ-CS-008 — Accent ladder (MUST, modifies REQ-CS-002)
The cyan ladder MUST be `--color-jade: #00D4D8`, `--color-jade-dk: #00A8B8`, `--color-jade-light: #7CE8EC`, `--color-jade-glow: #00D4D8`.

### REQ-CS-009 — Profit shift (MUST, replaces REQ-CS-005 profit hex)
`--color-jade-profit` MUST equal `#3CE0B8` (cyan-green) to remain distinct from primary cyan.

### REQ-CS-010 — Loss shift (MUST, replaces REQ-CS-006 loss hex)
`--color-jade-loss` MUST equal `#FF3D5F` (slight lift over `#FF2A55`) for dark-mode contrast against cyan primary.

### REQ-CS-011 — Glow alpha retune (MUST, new)
`tailwind.config.ts` `glow-jade` alpha MUST be `0.25` and `glow-jade-sm` alpha MUST be `0.16`. New `glow-cyan` utility MUST be an alias of `glow-jade`.

### REQ-CS-012 — Glass alpha retune (MUST, new)
Glassmorphism alphas MUST be `glass.subtle: 0.05`, `glass.DEFAULT: 0.08`, `glass.strong: 0.13`. Border alphas MUST be `glass.border.subtle: 0.06`, `glass.border.DEFAULT: 0.12`, `glass.border.strong: 0.20`.

### REQ-CS-013 — Token name preservation (SHOULD, new)
The `--color-jade*` naming MUST remain unchanged for backward compatibility. The cyan VALUES are the only thing that changes.

## New / modified scenarios

### Scenario CS-S6 — Cyan repaint
**Given** all consumers reference `--color-jade*` tokens
**When** `src/styles/themes.css` updates the hex values to cyan
**Then** every consumer repaints to cyan without any consumer code change.

### Scenario CS-S7 — Light mode contrast (cyan)
**Given** the user toggles to light mode
**When** body text is rendered with `--color-jade` on `--color-bg` (light)
**Then** the contrast ratio MUST be ≥ 4.5 (WCAG AA body-text).

### Scenario CS-S8 — Glow retune no halo blowout
**Given** a primary `<Button>` in dark mode
**When** the user hovers
**Then** the cyan glow is visible but does not bloom beyond the button boundary.

## Marking

Append this delta to `openspec/specs/color-system/spec.md` under the marker:

```text
## Modified by core-interface-redesign on 2026-09-15

(see openspec/changes/core-interface-redesign/specs/color-system/spec.md for delta)
```

sdd-sync verifies `ORIGINAL_PREFIX_INTACT` and `DELTA_APPENDED_INTACT`.
