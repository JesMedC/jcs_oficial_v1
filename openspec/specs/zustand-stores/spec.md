# Spec: zustand-stores

## Purpose

Define the four Zustand stores that hold cross-cutting UI state for the portal: drawer visibility, active workspace, sidebar collapse, and command palette visibility. Each store MUST be a typed, independent slice with strict TypeScript and tested transitions.

## Requirements

### Requirement: Store catalog

The codebase MUST expose four stores, each as an independent slice:

- `useNewTradeDrawer` — `{ isOpen: boolean, open(): void, close(): void, toggle(): void }`
- `useActiveWorkspace` — `{ workspaceId: UUID | null, setWorkspaceId(id): void, clear(): void }` with sessionStorage persistence under `jcs.active.workspace_id`
- `useSidebarCollapsed` — `{ isCollapsed: boolean, toggle(): void, set(v): void }` with sessionStorage persistence under `jcs.portal.sidebar.collapsed` (replaces the current `useState + useEffect` in `PortalShell`)
- `useCommandPalette` — `{ isOpen: boolean, open(): void, close(): void, toggle(): void }`

Each store MUST live in its own file under `src/stores/`.

#### Scenario: All four stores importable
- GIVEN any source file in `src/`
- WHEN it imports one of the four store names
- THEN TypeScript MUST resolve the import without `any`

### Requirement: Strict TypeScript

Every store MUST be typed with `create<T>()(...)` and selectors MUST return strongly typed values. No `any` SHALL leak through the public API.

#### Scenario: Selector returns typed value
- GIVEN a test imports `useSidebarCollapsed`
- WHEN it reads `isCollapsed`
- THEN the inferred type MUST be `boolean`

### Requirement: Persistence for the two relevant stores

`useActiveWorkspace` and `useSidebarCollapsed` MUST persist their state in `sessionStorage`. The other two stores MUST NOT persist (ephemeral UI).

#### Scenario: Workspace persists
- GIVEN `setWorkspaceId('abc')` is called
- WHEN `sessionStorage['jcs.active.workspace_id']` is read
- THEN it MUST equal `'abc'`

#### Scenario: Drawer does not persist
- GIVEN `useNewTradeDrawer.open()` is called
- WHEN `sessionStorage` is read
- THEN no key for the drawer SHALL be written

### Requirement: Devtools in development

Stores MUST be wired to `zustand/middleware/devtools` so the Redux DevTools panel shows transitions in development. In production builds the devtools MUST be tree-shaken away.

#### Scenario: Devtools present in dev
- GIVEN `import.meta.env.MODE === 'development'`
- WHEN DevTools is opened
- THEN the four stores MUST appear with their action names

### Requirement: Test coverage

Unit tests with vitest MUST cover state transitions for each store and the persistence round-trip for `useActiveWorkspace` and `useSidebarCollapsed`.

#### Scenario: Persistence round-trip
- GIVEN a test toggles `useSidebarCollapsed`
- WHEN the store is re-instantiated from a fresh module load (simulated)
- THEN the `isCollapsed` value MUST equal the persisted one

## Dependencies

- `zustand` 4.5.x (to be installed)

## Out of scope

- Cross-tab state synchronization.
- Redux DevTools persistence across reloads.
- Persisting `useNewTradeDrawer` or `useCommandPalette`.
- Any store holding server data (that is TanStack Query's job).
