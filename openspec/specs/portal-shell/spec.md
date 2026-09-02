# Spec: portal-shell

## Purpose

Define the chrome of the authenticated portal at `/portal/*`: a vertical collapsible sidebar (with mobile drawer overlay), a topbar, and a main content outlet — replacing the current horizontal `PortalNav` pattern.

## Requirements

### Requirement: Vertical collapsible sidebar

The portal SHALL render a vertical `PortalSidebar` on every breakpoint. Width MUST be 240px when expanded and 64px when collapsed. On viewports below `lg` it SHALL render as a drawer overlay triggered from the Topbar.

#### Scenario: Desktop sidebar expanded
- GIVEN viewport width ≥ 1024px and user not collapsed
- WHEN the portal route mounts
- THEN `PortalSidebar` MUST render at 240px width beside the main outlet

#### Scenario: Desktop sidebar collapsed
- GIVEN viewport width ≥ 1024px and user clicked the collapse toggle
- WHEN the next render fires
- THEN `PortalSidebar` MUST render at 64px width with icons only

#### Scenario: Mobile sidebar opens as drawer
- GIVEN viewport width < 1024px
- WHEN the user taps the Topbar menu trigger
- THEN the same `PortalSidebar` content MUST appear as a left-side drawer overlay with backdrop

### Requirement: Collapse state persistence

Collapse state MUST persist across reloads within the same browser session via `sessionStorage` under key `jcs.portal.sidebar.collapsed`.

#### Scenario: State survives reload
- GIVEN user collapsed the sidebar
- WHEN the user reloads the page
- THEN the sidebar MUST remain collapsed on mount

#### Scenario: New tab resets to expanded
- GIVEN user collapsed the sidebar
- WHEN the user opens a new tab to the same portal URL
- THEN the sidebar MUST render expanded (sessionStorage scope)

### Requirement: PortalNav archival

The horizontal `PortalNav` component MUST be removed from the render tree. Its source file MUST remain on disk with a leading comment `// ARCHIVED por portal-fase0a-base — ver proposal.md` and not be imported.

#### Scenario: PortalNav absent from tree
- GIVEN any `/portal/*` route
- WHEN React DevTools inspects the tree
- THEN no `PortalNav` element SHALL be present

#### Scenario: PortalNav source preserved
- GIVEN `src/components/portal/PortalNav.tsx`
- WHEN read
- THEN its first lines SHALL contain the archive comment and it SHALL not be referenced from `PortalShell`

### Requirement: PortalShell composition

`PortalShell` MUST compose `PortalSidebar` (left) + `<Outlet />` (main) and inherit the existing TopNav. It MUST NOT render the aurora background on portal pages.

#### Scenario: Layout composes correctly
- GIVEN a `/portal/*` route
- WHEN `PortalShell` renders
- THEN DOM order SHALL be `TopNav` (sticky) → `PortalSidebar` → `<main><Outlet /></main>`

#### Scenario: No aurora on portal pages
- GIVEN any portal route
- WHEN the page mounts
- THEN no aurora background layer SHALL appear (portal pages are data-dense)

## Dependencies

- `zustand-stores` (for `useSidebarCollapsed`)
- `topbar`
- `workspace-selection`

## Out of scope

- New topbar widgets (covered by `topbar`).
- Workspace selector behavior (covered by `workspace-selection`).
- Per-route layout overrides (e.g. full-bleed wizard pages).
