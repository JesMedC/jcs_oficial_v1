# Spec: workspace-selection

## Purpose

Define the `WorkspaceSelector` widget — a dropdown at the bottom of the portal sidebar that surfaces the active multi-tenant workspace, persists the choice in sessionStorage, and acts as a display reference (no header propagation in this change).

## Requirements

### Requirement: Placement

The `WorkspaceSelector` MUST render as the last item in `PortalSidebar`, immediately after the collapse/expand toggle.

#### Scenario: Renders at sidebar bottom
- GIVEN any `/portal/*` route with sidebar expanded
- WHEN the sidebar renders
- THEN the `WorkspaceSelector` MUST be the bottom-most child above any footer

### Requirement: Dropdown contents

The dropdown MUST list every workspace the user belongs to, where each row shows: workspace name, the user's `role_in_workspace`, and the `plan_tier`.

#### Scenario: Items show full row data
- GIVEN the user belongs to two workspaces
- WHEN the dropdown opens
- THEN each item MUST display name, role, and plan tier

### Requirement: Source of workspaces

The list MUST come from `useAuth().user.workspaces`. The hook MUST be the single source of truth (no parallel local fetch in this change).

#### Scenario: Reads from auth context
- GIVEN the auth context exposes three workspaces
- WHEN the selector reads its data
- THEN it MUST iterate `useAuth().user.workspaces` (no extra network call)

### Requirement: Active workspace persistence

The active `workspace_id` MUST be persisted in `sessionStorage` under key `jcs.active.workspace_id`. Each selection MUST update both the Zustand store and the storage key.

#### Scenario: Selection survives reload
- GIVEN the user selected workspace B
- WHEN the user reloads
- THEN the selector MUST highlight workspace B on mount

#### Scenario: New tab resets
- GIVEN the user selected workspace B
- WHEN the user opens a new tab
- THEN the selector MUST default to the first workspace in the list

### Requirement: Store API

A `useActiveWorkspace` Zustand store MUST expose `{ workspaceId: UUID | null, setWorkspaceId(id): void, clear(): void }` with selectors and TypeScript strict typing.

#### Scenario: setWorkspaceId updates both store and storage
- GIVEN the selector calls `setWorkspaceId('abc')`
- WHEN the action runs
- THEN `workspaceId` MUST equal `'abc'` and `sessionStorage` MUST contain the same value

### Requirement: Display-only semantics

The active workspace is a visual reference only. The backend MUST continue to infer `workspace_id` from the JWT. No `X-Workspace-Id` header SHALL be added in this change.

#### Scenario: No header injection
- GIVEN the user changes workspace in the selector
- WHEN any subsequent request fires
- THEN the request MUST NOT include an `X-Workspace-Id` header (the backend keeps inferring from JWT)

### Requirement: Single-workspace users

If the user belongs to only one workspace, the selector MUST still display it but the dropdown MUST be disabled.

#### Scenario: Disabled when one workspace
- GIVEN the user has exactly one workspace
- WHEN the selector renders
- THEN the dropdown control MUST be disabled and show the single workspace name

### Requirement: Test coverage

Unit tests with vitest MUST cover: persistence round-trip across reload, dropdown open/close, disabled state for single-workspace users, and store API transitions.

#### Scenario: Test asserts persistence
- GIVEN a test changes the active workspace
- WHEN the test reads `sessionStorage['jcs.active.workspace_id']`
- THEN it MUST equal the selected id

## Dependencies

- `zustand-stores`
- Auth context (multi-tenant JWT)

## Out of scope

- `X-Workspace-Id` header propagation (explicitly deferred).
- Server-side workspace listing endpoint.
- Workspace creation / invite flow.
- Real-time workspace switch propagation to other tabs.
