# Spec delta: portal-shell (MODIFIED)

**Change**: `core-interface-redesign`
**Domain**: portal-shell
**Status**: modified — appends to `openspec/specs/portal-shell/spec.md` at sync time

## Delta scope

Sidebar widens to `w-72` and gains cyan glow on the active nav item's left border. Topbar gains a language + account-scope selector on the left and a `+Nuevo Trade` CTA on the right. Per DS-v1's existing portal-shell contract, all changes are chrome-only — no functional behavior changes.

## New / modified requirements

### REQ-PS-010 — Sidebar widening (MUST, new)
`PortalSidebar` MUST render at `w-72` (288px) on `lg+` viewports. On `md` viewports, the sidebar MUST collapse to an icon-only rail at `w-16`. Below `md`, the sidebar MUST slide in as a drawer (existing pattern).

### REQ-PS-011 — Active-state cyan glow (MUST, modifies REQ-PS-003 active-state)
The active nav item MUST have a `border-l-4 border-l-primary` (cyan, `--color-jade`) plus a `shadow-[0_0_24px_var(--color-jade-glow)]` glow at `0.25` alpha. The previous jade glow alpha (`0.30`) MUST be reduced to `0.25` for the cyan rebalance.

### REQ-PS-012 — Language + account-scope selector (MUST, new)
The Topbar MUST render a language selector (`ES` / `EN` toggle) and an account-scope selector (`Todas las cuentas` / specific account) on the LEFT side, before the page title.

### REQ-PS-013 — +Nuevo Trade CTA (MUST, new)
The Topbar MUST render a `+Nuevo Trade` CTA button on the RIGHT side, using the primary `Button` variant. The CTA MUST open the trade drawer via `useNewTradeDrawer.open()`. If a `prefill` is available from the Scanner alerts, the CTA MUST call `useNewTradeDrawer.openWithPrefill(prefill)` instead.

### REQ-PS-014 — Section header style (MUST, new)
Section headers MUST use uppercase + wide letter-spacing + cyan accent bullet (`• SECTION NAME`). The bullet color MUST be `--color-jade` at `0.6` alpha for hierarchy.

## New / modified scenarios

### Scenario PS-S6 — Sidebar widening at xl
**Given** the viewport is `≥ xl`
**When** the portal renders
**Then** the sidebar is `w-72` and the main content area adjusts to the new width.

### Scenario PS-S7 — Active item cyan glow
**Given** the user is on `/portal/dashboard`
**When** the sidebar renders
**Then** the Dashboard nav item has the cyan left border + glow
**And** no other item has the active state.

### Scenario PS-S8 — +Nuevo Trade opens drawer
**Given** the Topbar renders
**When** the user clicks `+Nuevo Trade`
**Then** the trade drawer opens with an empty form.

### Scenario PS-S9 — Scanner prefill wired
**Given** a Scanner alert is in scope with a `prefill` payload
**When** the user clicks `+Nuevo Trade` from the Topbar
**Then** the drawer opens with the pair + direction prefilled.

## Marking

Append this delta to `openspec/specs/portal-shell/spec.md` under the marker:

```text
## Modified by core-interface-redesign on 2026-09-15

(see openspec/changes/core-interface-redesign/specs/portal-shell/spec.md for delta)
```
