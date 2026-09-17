# Spec: core-interface-prefs (NEW — OPTIONAL)

**Change**: `core-interface-redesign`
**Domain**: core-interface-prefs
**Status**: new spec — OPTIONAL; can be dropped if Slice 2 doesn't adopt it

## Purpose

Define an optional per-user density preference (`comfortable` / `compact`) for the dashboard, so users on small screens or with dense trading styles can opt into a tighter layout.

## Requirements

### REQ-CIP-001 — Preference store (MUST, if implemented)
`src/stores/useCoreInterfacePrefs.ts` MUST expose a Zustand store with a `density: 'comfortable' | 'compact'` field, a `setDensity()` action, and `localStorage` persistence under the key `jcs.coreInterfacePrefs.v1`.

### REQ-CIP-002 — Density application (SHOULD, if implemented)
The dashboard MUST apply `gap-3` + `p-4` for `compact` and `gap-4` + `p-6` for `comfortable` to the KPI strip and the session cards when the preference is `compact`. No other page SHOULD consume this preference (out of scope).

### REQ-CIP-003 — Default value (MUST)
The default MUST be `'comfortable'` for users who have not set a preference. The default MUST persist on first render.

### REQ-CIP-004 — Settings UI (SHOULD)
A toggle in `/portal/configuracion` SHOULD let users switch between `comfortable` and `compact`. The toggle MUST be a `<SegmentedControl>` (or equivalent) primitive and persist immediately.

## Scenarios

### Scenario CIP-S1 — Compact default override
**Given** the user has set `density: 'compact'`
**When** the dashboard renders
**Then** the KPI strip uses `gap-3` and `p-4` instead of the comfortable defaults.

### Scenario CIP-S2 — Persistence across reloads
**Given** the user has set `density: 'compact'`
**When** the page reloads
**Then** the dashboard renders in compact mode without flicker.

## Anti-patterns

- Persisting density to the backend (out of scope; local-only).
- Reading density from URL params (out of scope).
- Consuming density outside the dashboard (out of scope).

## Verification

- `pnpm test` green; `useCoreInterfacePrefs.test.ts` covers the persistence + default behavior.
- Manual visual review of `comfortable` vs `compact` dashboard.

## Out of scope (if dropped)

If `useCoreInterfacePrefs` is not adopted in Slice 2, this entire spec is removed from the change and the preference UI does not ship.
