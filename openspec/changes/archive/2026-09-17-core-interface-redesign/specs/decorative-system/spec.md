# Spec delta: decorative-system (MODIFIED)

**Change**: `core-interface-redesign`
**Domain**: decorative-system
**Status**: modified — appends to `openspec/specs/decorative-system/spec.md` at sync time

## Delta scope

The dashboard now mounts `<DotGrid>` and `<NeuralNetwork>` decor primitives BY DEFAULT (was opt-in per DS-v1). Density caps per `dashboard-density` REQ-DD-007. Decor remains chrome-only; financial tables and the recent-ops rail are NEVER under decor.

## New / modified requirements

### REQ-DEC-006 — Dashboard default mount (MUST, new)
`DashboardPage` MUST mount `<DotGrid>` and `<NeuralNetwork>` decor primitives at the chrome layer. Density caps MUST be respected (≤ 6% for DotGrid, ≤ 8% for NeuralNetwork).

### REQ-DEC-007 — Decor scope restriction (UNCHANGED, restated)
Decor primitives MUST NOT be mounted over financial tables, the recent-ops rail, or any data-dense surface. The financial tables remain on plain glass surfaces without decorative overlays.

### REQ-DEC-008 — Scanline opt-in (UNCHANGED, restated)
`<Scanline>` and the `animate-hud-scanline` keyframe remain opt-in per DS-v1. They are not mounted on the dashboard by default; consumers opt in via the `<Scanline>` wrapper.

## New / modified scenarios

### Scenario DEC-S5 — Dashboard decor default
**Given** the user is at `/portal/dashboard`
**When** the page renders
**Then** `<DotGrid>` is visible at ≤ 6% opacity
**And** `<NeuralNetwork>` is visible at ≤ 8% opacity
**And** financial tables and the recent-ops rail are not under decor.

## Marking

Append this delta to `openspec/specs/decorative-system/spec.md` under the marker:

```text
## Modified by core-interface-redesign on 2026-09-15

(see openspec/changes/core-interface-redesign/specs/decorative-system/spec.md for delta)
```
