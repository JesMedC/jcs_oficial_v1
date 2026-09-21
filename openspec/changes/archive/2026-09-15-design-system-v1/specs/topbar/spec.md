# Delta for topbar

## Purpose

Add an OPTIONAL Periodo split widget to the Topbar slot table without breaking the existing widget order. If the widget ships, it occupies the documented slot between `RiskSemaphore` and the CommandPalette trigger, persists last selection to `sessionStorage`, and ships as a `<PeriodoSplit>` primitive. If it does not ship in this change, no existing requirement is removed.

## ADDED Requirements

### Requirement: Periodo split widget — OPTIONAL slot

The Topbar MAY render a `<PeriodoSplit>` widget. If shipped, it MUST occupy the slot between `RiskSemaphore` and `CommandPaletteTrigger` (i.e. center-cluster order: `RiskSemaphore`, `PeriodoSplit`, `CommandPaletteTrigger`, `+ Nuevo Trade`). If NOT shipped in this change, the slot MUST remain reserved and the widget MUST NOT be referenced from any other location.

#### Scenario: Widget shipped in slot
- GIVEN the change ships `<PeriodoSplit>` and `<Topbar>` is mounted
- WHEN rendered
- THEN the DOM order MUST be `RiskSemaphore` → `PeriodoSplit` → `CommandPaletteTrigger` → `+ Nuevo Trade`

#### Scenario: Widget not shipped — slot reserved
- GIVEN the change does NOT ship `<PeriodoSplit>`
- WHEN `<Topbar>` renders
- THEN the DOM order MUST remain `RiskSemaphore` → `CommandPaletteTrigger` → `+ Nuevo Trade` with no empty wrapper element

### Requirement: PeriodoSplit primitive options

If shipped, `<PeriodoSplit>` MUST accept `value` and `onChange` and render five toggle buttons labeled `1D`, `1W`, `1M`, `YTD`, `ALL`. The active option MUST show `text-primary` and a jade underline (`border-b-2 border-primary`); inactive options MUST use `text-text-secondary`. Keyboard navigation MUST support arrow-key cycling within the group and Enter/Space to commit.

#### Scenario: Active option underline
- GIVEN `value="1M"`
- WHEN rendered
- THEN the `1M` button MUST show the jade underline and `text-primary`

#### Scenario: Arrow keys cycle
- GIVEN the widget focused on `1W`
- WHEN the user presses ArrowRight
- THEN focus MUST move to `1M` and `onChange('1M')` MUST fire

### Requirement: PeriodoSplit persistence

If shipped, `<PeriodoSplit>` MUST persist the last selection in `sessionStorage` under key `jcs.topbar.period`. On mount, the widget MUST read the stored value (if any) and use it as the initial `value`. On change, the widget MUST write the new value before invoking `onChange`.

#### Scenario: Persistence across reload
- GIVEN the user selected `YTD`
- WHEN the page reloads in the same tab
- THEN `<PeriodoSplit>` MUST initialize with `value="YTD"`

#### Scenario: New tab reset
- GIVEN a selection in one tab
- WHEN the user opens a new tab to the same portal URL
- THEN `<PeriodoSplit>` MUST initialize with the default `1D` (sessionStorage scope)

### Requirement: PeriodoSplit has no data binding (yet)

The widget MUST render without binding to any data source. A `TODO: bind to global period filter` comment MUST be present in the source. Real data binding is a future change.

#### Scenario: Widget renders without data
- GIVEN no global period filter is wired
- WHEN `<PeriodoSplit>` mounts
- THEN the component MUST render with the default selection and no fetch SHALL occur

## Dependencies

- `cyber-jade-tokens`
- `primitive-library` (the `<PeriodoSplit>` primitive belongs to `primitive-library`)
- Existing `zustand-stores` (no new store required)

## Out of scope

- Wiring `<PeriodoSplit>` to a global period filter that affects data queries.
- A separate "Periodo" indicator elsewhere on the page.
- Persisting the selection across browser sessions (only `sessionStorage` per this change).
