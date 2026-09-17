# Spec delta: style-enforcement (MODIFIED)

**Change**: `core-interface-redesign`
**Domain**: style-enforcement
**Status**: modified — appends to `openspec/specs/style-enforcement/spec.md` at sync time

## Delta scope

The `no-cyaan-literals` ESLint rule (specified in DS-v1 Wave 7 but not implemented) is promoted to an actual rule here. CI grep guard is extended with cyan hex check. `docs/design-system.md` is created.

## New / modified requirements

### REQ-SE-005 — ESLint rule no-cyaan-literals (MUST, promoted from DS-v1 Wave 7)
`eslint.config.js` MUST define a `no-cyaan-literals` custom rule that fires on:
- Hex literals matching `/^#0[0-9A-Fa-f]{5}$/` (cyan range `#00XXXX`–`#0FXXXX` excluding jade `#00FF9D`–`#00FFBE`).
- `rgba(...)` calls with first three channels in the cyan family (`r ≤ 50`, `g ≥ 150`, `b ≥ 150`).

Allow-list paths (where the rule is suppressed):
- `tailwind.config.ts`
- `src/styles/themes.css`
- `src/components/dashboard/CapitalCurveChart.tsx`
- `src/components/dashboard/PerformanceCurveChart.tsx`
- `src/test/setup.ts`

### REQ-SE-006 — CI grep guard (MUST, new)
`scripts/verify-cyan-drift.sh` MUST exit 0 if `rg "rgba\((0|1?\d),1[5-9]\d|2[0-4]\d,` src/` returns no production matches outside the allow-list (the pattern matches cyan-family rgba).

### REQ-SE-007 — docs/design-system.md (MUST, new)
`docs/design-system.md` MUST exist and document:
- The cyan decision (primary `#00D4D8`, accent ladder, glow + glass alphas).
- The "inspiration-aligned, not pixel-perfect" language from `design-system-v1`.
- The cyan-drift guard (ESLint rule + CI grep) and how to extend the allow-list.

### REQ-SE-008 — CI integration (MUST, new)
`pnpm lint:design` MUST run ESLint with the new rule. A separate script MUST run the CI grep guard. Both MUST be wired into the existing CI pipeline.

## New / modified scenarios

### Scenario SE-S4 — Rule fires on inline literal
**Given** a developer adds `#00D4D8` to a component file
**When** `pnpm lint` runs
**Then** `no-cyaan-literals` reports the violation with a file:line citation.

### Scenario SE-S5 — Allow-list honored
**Given** `tailwind.config.ts` contains cyan hex literals
**When** `pnpm lint` runs
**Then** no violation is reported for the allow-listed file.

### Scenario SE-S6 — CI guard exits clean
**Given** the codebase has no production cyan literals outside the allow-list
**When** `bash scripts/verify-cyan-drift.sh` runs
**Then** it exits 0.

## Marking

Append this delta to `openspec/specs/style-enforcement/spec.md` under the marker:

```text
## Modified by core-interface-redesign on 2026-09-15

(see openspec/changes/core-interface-redesign/specs/style-enforcement/spec.md for delta)
```
