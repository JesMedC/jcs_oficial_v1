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
---

## Modified by sessions-configurable-cap on 2026-09-15

### Requirement: REQ-DISC-008 — Session ops-cap is workspace-bounded

`validate_open_trade` SHALL enforce a per-`(local_day, band)` trade count cap equal to `workspace.session_ops_cap` when set, otherwise the plan ceiling (`STARTER=4`, `PRO|PRO_PLUS=6`, `ELITE=10`). The (n+1)th trade attempt in the same `(local_day, band)` SHALL raise `DisciplineError(code="SESSION_CAP_EXCEEDED", status=422)`. REQ-DISC-005 (broker), REQ-DISC-006 (capital-inicial), REQ-DISC-007 (daily), and REQ-DISC-010 (rule order) are unchanged.

(Previously: hardcoded `4 ops/session` for every workspace regardless of plan tier — uncapped against the tier ceiling, causing PRO/PLUS to exceed the intended limit.)

#### Scenario: PRO with NULL column caps at 6

- GIVEN a `PRO` workspace with `session_ops_cap IS NULL`
- AND 5 trades in `(2026-09-15, NEW_YORK)`
- WHEN the 6th trade opens in that bucket
- THEN `validate_open_trade` MUST NOT raise (5 < 6)

#### Scenario: PRO with NULL column blocks 7th op

- GIVEN a `PRO` workspace with `session_ops_cap IS NULL`
- AND 6 trades in `(2026-09-15, NEW_YORK)`
- WHEN the 7th trade attempts to open
- THEN `validate_open_trade` MUST raise `SESSION_CAP_EXCEEDED`

#### Scenario: Workspace cap of 4 overrides PRO ceiling

- GIVEN a `PRO` workspace with `session_ops_cap=4`
- AND 4 trades in `(2026-09-15, LONDON)`
- WHEN the 5th trade attempts to open
- THEN `validate_open_trade` MUST raise `SESSION_CAP_EXCEEDED`

#### Scenario: TZ-aware bucket boundary

- GIVEN `timezone="America/Buenos_Aires"`
- AND 4 trades in `(2026-09-15 local, ASIA)`
- WHEN a 5th trade at UTC `2026-09-16 06:30` (= local `2026-09-15 23:30`, SYDNEY) attempts to open
- THEN `validate_open_trade` MUST raise `SESSION_CAP_EXCEEDED` (bucket counted on local day)

#### Scenario: Distinct bands do not share a counter

- GIVEN a `PRO` workspace with `session_ops_cap IS NULL` and 6 trades in `(2026-09-15, NEW_YORK)`
- WHEN the next trade opens in `(2026-09-15, LONDON)` at UTC 09:00
- THEN `validate_open_trade` MUST NOT raise

#### Scenario: Capital-movement rows do not count

- GIVEN a `PRO` workspace with `session_ops_cap IS NULL`
- AND 4 FOREX/BINARY trades + 8 FUND + 8 WITHDRAW in `(2026-09-15, NEW_YORK)`
- WHEN the 5th FOREX trade attempts to open
- THEN `validate_open_trade` MUST raise `SESSION_CAP_EXCEEDED`

#### Scenario: Rule order preserved

- GIVEN `balance_usd=2000`, `deduct=Decimal("600")` (broker-cap-violating)
- AND `session_ops_cap=3` with 3 trades in the bucket
- WHEN `validate_open_trade` runs
- THEN it MUST raise `BROKER_CAP_EXCEEDED` (rule 3) before `SESSION_CAP_EXCEEDED` (rule 6)