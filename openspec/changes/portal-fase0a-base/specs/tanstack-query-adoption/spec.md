# Spec: tanstack-query-adoption

## Purpose

Adopt TanStack Query as the canonical async data layer for the portal by mounting the `QueryClientProvider`, defining safe defaults, and migrating `CuentasPage` + `CuentasDetailPage` from `useEffect + axios` to `useQuery`-backed hooks.

## Requirements

### Requirement: Provider mount

A `<QueryClientProvider>` MUST be mounted in `main.tsx` (or `RootShell`) wrapping the entire React tree so every page can call query hooks.

#### Scenario: Hooks usable globally
- GIVEN any page renders
- WHEN it calls a `useQuery` hook
- THEN it MUST receive the shared `QueryClient` instance without manual provider duplication

### Requirement: Client defaults

The shared `queryClient` MUST be configured with `staleTime: 30_000`, `retry: 1`, and `refetchOnWindowFocus: false`. Any deviation MUST be justified in the design doc.

#### Scenario: Defaults applied
- GIVEN a developer inspects `src/lib/queryClient.ts`
- WHEN reading the configuration
- THEN `staleTime`, `retry`, and `refetchOnWindowFocus` MUST match the documented values

### Requirement: CuentasPage migration

`CuentasPage` MUST be migrated to `useQuery` for the workspace account list, replacing the existing `useEffect + axios` pattern.

#### Scenario: List query active
- GIVEN the page mounts
- WHEN the user navigates to `/portal/cuentas`
- THEN a `useQuery` keyed on `['accounts', workspaceId]` MUST fire and render loading / success / error states

### Requirement: CuentasDetailPage migration

`CuentasDetailPage` MUST be migrated to `useQuery` for the account detail and each tab's data source.

#### Scenario: Detail query active
- GIVEN the page mounts at `/portal/cuentas/:id`
- WHEN data loads
- THEN `useQuery` keyed on `['account', id]` MUST drive the render

### Requirement: Custom hook layer

Shared query logic MUST live in `src/features/accounts/hooks.ts` exporting at least `useAccounts()` and `useAccount(id)`. Pages MUST call the hooks, not the query client directly.

#### Scenario: Page uses hook
- GIVEN `CuentasPage` renders
- WHEN inspecting its imports
- THEN it MUST import from `src/features/accounts/hooks` and MUST NOT call `useQuery` inline

### Requirement: Test coverage

Tests with vitest MUST use MSW (Mock Service Worker) or axios mocks to verify query success, error, and loading states for `useAccounts` and `useAccount`.

#### Scenario: Mocked error path
- GIVEN MSW returns 500 for the accounts endpoint
- WHEN the test renders `CuentasPage`
- THEN it MUST render the error state and NOT throw

## Dependencies

- `@tanstack/react-query` (already installed at 5.59.16)
- Backend account endpoints

## Out of scope

- Migrating every page to TanStack Query in this change (only Cuentas pages).
- Persistence / offline cache.
- Devtools panel UI (optional, separate spec if added).
- Server-side hydration patterns.
