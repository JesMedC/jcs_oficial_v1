# Spec: trade-ingestion

## Purpose

Define the `NewTradeDrawer` — a right-side slide-in form for quickly ingesting a trade — including client-side validation, server submission via TanStack Query mutation, optimistic cache updates, and error envelope handling.

## Requirements

### Requirement: Drawer host

`NewTradeDrawer` MUST render inside `GlassDrawer` with `side="right"` and the standard portal glassmorphism styling.

#### Scenario: Opens from Topbar
- GIVEN the user clicks `+ Nuevo Trade`
- WHEN the drawer opens
- THEN it MUST render as a right-side drawer, not as a centered modal

### Requirement: Form fields

The form MUST collect at minimum: `account_id` (select of available accounts), `instrument`, `direction` (LONG/SHORT for FOREX; CALL/PUT for BINARY), `entry_price`, and either `lot_size` (FOREX) or `investment_usd` (BINARY).

#### Scenario: FOREX fields render
- GIVEN a FOREX account is selected
- WHEN the form renders
- THEN `direction` MUST show LONG/SHORT and `lot_size` MUST be visible

#### Scenario: BINARY fields render
- GIVEN a BINARY account is selected
- WHEN the form renders
- THEN `direction` MUST show CALL/PUT and `investment_usd` MUST be visible

### Requirement: Client validation

The form MUST use React Hook Form with a Zod schema. Invalid submissions MUST block submit and surface field-level errors.

#### Scenario: Missing account blocks submit
- GIVEN the user clears the account selector
- WHEN they click Submit
- THEN the form MUST NOT submit and MUST display an inline error on the account field

### Requirement: Server submission

Submit MUST call `POST /api/v1/trades` via a TanStack Query mutation hook.

#### Scenario: Happy POST
- GIVEN a valid form
- WHEN the user submits
- THEN the mutation MUST `POST` to `/api/v1/trades` with the Zod-validated payload

### Requirement: Optimistic update

On mutation success, the TanStack Query cache for the workspace's trade list MUST be updated optimistically (or invalidated) so the new trade appears without a full refetch.

#### Scenario: Cache reflects new trade
- GIVEN a successful POST
- WHEN the mutation's `onSuccess` runs
- THEN the `['trades', workspaceId]` query cache MUST be invalidated or updated with the new trade

### Requirement: Error envelope

On mutation error, the drawer MUST display the error `code` and `message` in a glass-styled alert. The drawer MUST stay open so the user can retry.

#### Scenario: Validation error envelope shown
- GIVEN the backend returns 422 with `{ code, message, fields }`
- WHEN the mutation fails
- THEN the alert MUST render `code` + `message` and the form fields MUST be marked with the matching `fields` errors

### Requirement: Loading state

While the mutation is pending, the submit button MUST be disabled and show a spinner.

#### Scenario: Submit disabled during request
- GIVEN the user clicks Submit with a valid form
- WHILE the network request is in flight
- THEN the submit button MUST be disabled and show a loading indicator

### Requirement: Drawer close behavior

The drawer MUST close on mutation success. On error it MUST stay open.

#### Scenario: Success closes drawer
- GIVEN a successful POST
- WHEN the response resolves
- THEN `useNewTradeDrawer().close()` MUST run

### Requirement: Test coverage

Unit tests with vitest MUST cover: client validation errors, successful submit + cache update, server error envelope display, and drawer-close behavior.

#### Scenario: Test asserts validation block
- GIVEN a test renders the form with an empty required field
- WHEN the test submits
- THEN the mutation hook MUST NOT have been called and an inline error MUST be present

## Dependencies

- `glass-drawer`
- `zustand-stores` (for `useNewTradeDrawer`)
- `tanstack-query-adoption`
- Backend `POST /api/v1/trades`

## Out of scope

- Editing or deleting trades from the drawer.
- Bulk import.
- CSV ingest (FASE 7).
- Trade notes / screenshots.
