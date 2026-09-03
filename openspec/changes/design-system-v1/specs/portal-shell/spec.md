# Delta for portal-shell

## Purpose

Extend the `portal-shell` spec to require the Cyber-Jade luminous vertical-line active state on sidebar nav items, and to bind the sidebar background to a glassmorphism surface. The base shell layout (sticky Topbar, sidebar + outlet, mobile drawer) is preserved unchanged.

## ADDED Requirements

### Requirement: Sidebar nav active state — luminous vertical line

The `SidebarNav` active item MUST render with a 4px jade left border (`border-l-4 border-primary`) and a jade glow shadow (`shadow-glow-jade-md` or equivalent). The active label MUST use `text-primary` at 100% opacity; inactive items MUST use `text-text-secondary` at lower opacity.

#### Scenario: Active item shows vertical line + glow
- GIVEN a sidebar item whose `to` matches the current route
- WHEN rendered
- THEN the item MUST have a `border-l-4 border-primary` and a jade glow shadow

#### Scenario: Inactive item muted
- GIVEN a sidebar item whose `to` does NOT match the current route
- WHEN rendered
- THEN the label MUST use `text-text-secondary` and MUST NOT show the left border or glow

### Requirement: Sidebar background — glassmorphism

`PortalSidebar` MUST render with a translucent glassmorphism surface (`bg-surface/80` with `backdrop-blur-glass`) when expanded. When collapsed (64px), the same surface treatment MUST persist. The mobile drawer variant MUST inherit the same treatment.

#### Scenario: Desktop glass surface
- GIVEN an expanded sidebar on desktop
- WHEN rendered
- THEN the computed `background-color` MUST equal `rgba(13,21,30,0.8)` and `backdrop-filter` MUST include `blur(...)`

#### Scenario: Collapsed retains glass
- GIVEN a collapsed sidebar (64px)
- WHEN rendered
- THEN glassmorphism MUST remain (background translucent, backdrop blur active)

#### Scenario: Mobile drawer inherits glass
- GIVEN a mobile drawer opened via Topbar trigger
- WHEN rendered
- THEN it MUST use the same glassmorphism surface as the desktop sidebar

### Requirement: Sidebar chamfered corners (optional polish)

The expanded sidebar MAY apply a chamfered-corner `clip-path` to its top-right and bottom-right corners. If shipped, it MUST NOT clip the focus ring of any focusable child.

#### Scenario: Chamfer does not clip focus ring
- GIVEN a sidebar with chamfered corners and a focused nav item
- WHEN keyboard focus lands on the item
- THEN the focus ring MUST remain fully visible (no clipping by the sidebar's `clip-path`)

## Dependencies

- `cyber-jade-tokens` (for `shadow-glow-jade-*` and `bg-surface/80` values)
- `color-system` (post-archive)
- `topbar` (mobile drawer trigger)
- `zustand-stores` (for `useSidebarCollapsed`)

## Out of scope

- Per-route sidebar variants (workspace selector remains the only conditional).
- Sidebar resize handle (drag-to-resize) — deferred.
- Sidebar search/filter input — deferred.
