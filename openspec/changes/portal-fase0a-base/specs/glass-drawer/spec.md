# Spec: glass-drawer

## Purpose

Define the `GlassDrawer` primitive: a right-side slide-in panel that mirrors the API surface of `GlassModal` but anchors to a viewport edge. Used by `NewTradeDrawer` and future drawers.

## Requirements

### Requirement: Side and width configuration

`GlassDrawer` MUST default to `side="right"` and `maxWidth="md"`. Both MUST be overridable via props to `"left"` or to Tailwind sizes (`sm`, `md`, `lg`, `xl`, `2xl`, full).

#### Scenario: Default right-side drawer
- GIVEN `<GlassDrawer open />`
- WHEN it mounts
- THEN the panel MUST slide in from the right edge at `max-w-md`

#### Scenario: Left-side override
- GIVEN `<GlassDrawer open side="left" maxWidth="lg" />`
- WHEN it mounts
- THEN the panel MUST slide in from the left at `max-w-lg`

### Requirement: Slide-in animation

The drawer MUST animate via a CSS transition (preferred over JS animation libraries). Open: panel slides from edge + fades in. Close: reverse, after which the node MUST unmount.

#### Scenario: Open animates
- GIVEN the drawer is closed
- WHEN `open` flips to `true`
- THEN the panel MUST transition from `translate-x-full` (right) or `-translate-x-full` (left) to `translate-x-0`

### Requirement: Backdrop closes drawer

A backdrop element with `bg-black/60` MUST render behind the drawer. Clicking the backdrop MUST invoke the `onClose` callback.

#### Scenario: Backdrop click closes
- GIVEN the drawer is open
- WHEN the user clicks the backdrop
- THEN `onClose` MUST fire and `open` SHOULD become `false`

### Requirement: Escape key closes drawer

Pressing `Escape` while the drawer is open MUST invoke `onClose`. The handler MUST be removed on unmount.

#### Scenario: Escape closes
- GIVEN the drawer is open and focused
- WHEN the user presses `Escape`
- THEN `onClose` MUST fire

### Requirement: Focus trap when open

While open, keyboard tabbing MUST cycle within the drawer. Tab on the last focusable element MUST move focus to the first; Shift+Tab on the first MUST move to the last. On close, focus MUST return to the invoking element.

#### Scenario: Tab cycles forward
- GIVEN the drawer is open and the last focusable child is focused
- WHEN the user presses Tab
- THEN focus MUST move to the first focusable child inside the drawer

#### Scenario: Focus restores on close
- GIVEN the drawer was opened from a Topbar button
- WHEN the drawer closes
- THEN focus MUST return to that Topbar button

### Requirement: Variants

The drawer MUST accept a `variant` prop with values `subtle | default | strong`, matching the language used by `GlassPanel`.

#### Scenario: Variant changes opacity
- GIVEN `<GlassDrawer open variant="strong" />`
- WHEN it renders
- THEN the panel background MUST be more opaque than the `default` variant

### Requirement: Test coverage

Unit tests with vitest + Testing Library MUST cover: open/close via prop, Escape, backdrop click, and focus trap.

#### Scenario: Test asserts close on backdrop
- GIVEN the test mounts an open drawer
- WHEN the test fires a click on the backdrop
- THEN the `onClose` mock MUST have been called exactly once

## Dependencies

- `GlassPanel` (for variant styling parity)

## Out of scope

- Nested drawers.
- Bottom / top anchored variants (only left/right for FASE 0A).
- Swipe-to-close gesture.
