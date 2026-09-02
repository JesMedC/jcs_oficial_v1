# Spec: topbar

## Purpose

Define the sticky topbar of the authenticated portal: brand on the left, RiskSemaphore + Cmd+K trigger + "+ Nuevo Trade" button in the center/right cluster, and user name + logout on the far right.

## Requirements

### Requirement: Sticky topbar shell

The Topbar MUST be `sticky top-0 z-40` with `bg-surface/40 backdrop-blur-xl` and a `border-b` separator. It MUST span full width above `PortalShell` content.

#### Scenario: Topbar sticks on scroll
- GIVEN a long portal page
- WHEN the user scrolls vertically
- THEN the Topbar MUST remain pinned to the viewport top

### Requirement: Brand block (left)

The Topbar MUST display the literal string `JadeCapitalSuite` on the left as plain text (no link) when the user is authenticated. The mobile menu trigger MAY appear next to it below `lg`.

#### Scenario: Brand renders as text
- GIVEN an authenticated user
- WHEN the Topbar mounts
- THEN the left slot MUST show `JadeCapitalSuite` as plain text

### Requirement: RiskSemaphore widget

The Topbar MUST render `RiskSemaphore` as a placeholder widget with three states (green/amber/red). For FASE 0A the widget MUST render green by default and expose `aria-label="Sin datos de hoy"`. Real data binding to `/api/v1/trades/risk-summary` is deferred.

#### Scenario: Placeholder renders green
- GIVEN no data source wired
- WHEN the Topbar mounts
- THEN `RiskSemaphore` MUST show a green indicator with the documented aria-label

#### Scenario: Future binding hook is documented
- GIVEN a developer reads the component source
- WHEN searching for the data binding TODO
- THEN a `TODO: bind to /api/v1/trades/risk-summary` comment SHALL be present

### Requirement: Cmd+K trigger button

The Topbar MUST render a button or input labeled `Buscar · ⌘K` that opens the CommandPalette via `useCommandPalette().open()`.

#### Scenario: Trigger opens palette
- GIVEN the Topbar is mounted
- WHEN the user clicks the `Buscar · ⌘K` control
- THEN `useCommandPalette().isOpen` MUST become `true`

### Requirement: "+ Nuevo Trade" primary action

The Topbar MUST render a primary-colored button labeled `+ Nuevo Trade` with a subtle jade glow. It MUST call `useNewTradeDrawer().open()` on click.

#### Scenario: Click opens drawer
- GIVEN the Topbar is mounted
- WHEN the user clicks `+ Nuevo Trade`
- THEN `useNewTradeDrawer().isOpen` MUST become `true`

### Requirement: User block (right)

The Topbar MUST render `${first_name} ${last_name}` and a `Cerrar sesión` button on the far right. Logout MUST call the existing auth logout action.

#### Scenario: User identity renders
- GIVEN an authenticated user with first/last name
- WHEN the Topbar mounts
- THEN the right cluster MUST show both names and the logout button

#### Scenario: Logout clears session
- GIVEN the user clicks `Cerrar sesión`
- WHEN the handler runs
- THEN the auth context MUST clear and redirect to the public landing page

## Dependencies

- `zustand-stores` (for `useNewTradeDrawer`, `useCommandPalette`)
- `command-palette`
- `trade-ingestion`

## Out of scope

- Notifications dropdown.
- Theme switcher.
- Avatar / profile menu.
