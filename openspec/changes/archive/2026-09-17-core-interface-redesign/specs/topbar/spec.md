# Spec delta: topbar (MODIFIED)

**Change**: `core-interface-redesign`
**Domain**: topbar
**Status**: modified — appends to `openspec/specs/topbar/spec.md` at sync time

## Delta scope

Topbar gains the chrome specified in `portal-shell` REQ-PS-012 + REQ-PS-013 (language selector + account-scope selector + `+Nuevo Trade` CTA). Periodo split widget decision remains deferred per DS-v1 (`T4.12` skipped). New topbar mount order is documented.

## New / modified requirements

### REQ-TB-005 — Mount order (MUST, new)
The Topbar MUST render in this order, left to right:
1. Language selector (`ES` / `EN` toggle) — width `w-20`
2. Account-scope selector (`Todas las cuentas` / specific account) — width `min-w-48`
3. Page title (h1) — flex-1
4. `+Nuevo Trade` CTA — width auto, primary variant, right-aligned

### REQ-TB-006 — Periodo split widget (UNCHANGED)
The Periodo split widget (REQ-TB-004 from DS-v1) remains deferred. Decision is captured in `core-interface-redesign/proposal.md` as "out of scope" — no consumer exists in the current change.

## New / modified scenarios

### Scenario TB-S4 — Mount order at xl
**Given** the user is at `/portal/dashboard`
**When** the Topbar renders
**Then** the elements appear in the order: language → account-scope → page title → `+Nuevo Trade`.

### Scenario TB-S5 — CTA keyboard accessible
**Given** the user uses keyboard navigation
**When** they `Tab` to the `+Nuevo Trade` CTA
**Then** the CTA receives focus with a visible cyan ring at `0.32` alpha (per REQ-CS-008 ladder).

## Marking

Append this delta to `openspec/specs/topbar/spec.md` under the marker:

```text
## Modified by core-interface-redesign on 2026-09-15

(see openspec/changes/core-interface-redesign/specs/topbar/spec.md for delta)
```
