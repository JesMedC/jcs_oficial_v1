# Spec: command-palette

## Purpose

Define the global Cmd+K / Ctrl+K command palette that exposes navigation, drawer-opening, and logout actions from any portal route, using glassmorphism styling consistent with the rest of the chrome.

## Requirements

### Requirement: Global keyboard listener

The application MUST register a global `keydown` listener that opens the palette when the user presses `Meta+K` (macOS) or `Ctrl+K` (other OS). The listener MUST ignore key presses originating inside form inputs whose default behavior should be preserved.

#### Scenario: Cmd+K opens palette
- GIVEN the user is on any `/portal/*` route
- WHEN the user presses `Meta+K`
- THEN `useCommandPalette().isOpen` MUST become `true` and the palette MUST render

#### Scenario: Ctrl+K opens palette
- GIVEN the user is on any `/portal/*` route
- WHEN the user presses `Ctrl+K`
- THEN `useCommandPalette().isOpen` MUST become `true`

### Requirement: Action registry

The palette MUST expose at minimum the following actions: navigate to `/portal/dashboard`, `/portal/cuentas`, `/portal/operaciones`, `/portal/diario`, `/portal/playbook`, `/portal/configuracion`; open `NewTradeDrawer`; and trigger logout. Each action MUST have a stable `id`, a label, and an optional keyboard shortcut hint.

#### Scenario: Navigation actions listed
- GIVEN the palette is open
- WHEN the user reads the list
- THEN entries for the six portal routes MUST be visible

#### Scenario: Open-drawer action visible
- GIVEN the palette is open
- WHEN the user reads the list
- THEN an `Abrir Nuevo Trade` action MUST be visible

### Requirement: Keyboard navigation within palette

While the palette is open: `ArrowDown` / `ArrowUp` MUST move the highlighted action; `Enter` MUST execute the highlighted action; `Escape` MUST close the palette.

#### Scenario: ArrowDown moves selection
- GIVEN the palette is open with the first action highlighted
- WHEN the user presses `ArrowDown`
- THEN the highlighted index MUST increment by 1 (wrapping at the end)

#### Scenario: Enter executes action
- GIVEN the palette is open and an action is highlighted
- WHEN the user presses `Enter`
- THEN that action's handler MUST run and the palette MUST close

### Requirement: Open-drawer action wiring

The `Abrir Nuevo Trade` action MUST call `useNewTradeDrawer().open()`. The palette MUST close after invoking it.

#### Scenario: Action opens drawer
- GIVEN the palette is open
- WHEN the user selects `Abrir Nuevo Trade`
- THEN `useNewTradeDrawer().isOpen` MUST become `true` and the palette MUST close

### Requirement: Visual style

The palette MUST render using glassmorphism (use `GlassPanel` or a custom variant) so it is visually consistent with the rest of the chrome.

#### Scenario: Glass surface
- GIVEN the palette is open
- WHEN it renders
- THEN its background MUST be a translucent blurred layer with a jade border, matching the rest of the portal

### Requirement: Library choice

The implementation SHOULD use the `cmdk` package (lightweight, widely tested). If `cmdk` is rejected, the rejection rationale MUST be documented in the design doc.

#### Scenario: cmdk adoption
- GIVEN the design phase begins
- WHEN selecting a command-palette library
- THEN `cmdk` MUST be the default choice unless documented otherwise

### Requirement: Test coverage

Unit tests with vitest + Testing Library MUST cover: keyboard listener triggering open, ArrowDown/ArrowUp selection, Enter execution, Escape close, and dispatch of the open-drawer action.

#### Scenario: Test asserts action dispatch
- GIVEN a test mounts the palette with a mocked router and drawer store
- WHEN the test fires Enter on the open-drawer action
- THEN the drawer store mock MUST have been called and the palette MUST be closed

## Dependencies

- `zustand-stores` (for `useCommandPalette`, `useNewTradeDrawer`)
- `glass-drawer` (palette modal host)
- React Router (for navigation actions)

## Out of scope

- Fuzzy search across workspace data.
- Admin / destructive actions (deferred to FASE 2+).
- Per-user recent items.
