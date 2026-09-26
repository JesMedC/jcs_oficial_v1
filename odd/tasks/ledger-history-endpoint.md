# Read-only account ledger history

## Goal
Expose the immutable account movement history to the authenticated portal without changing balance mutations.

## Scope
- Add response schemas for one movement and a paginated movement list.
- Add a service query that scopes by account ownership and excludes no ledger rows for soft-deleted accounts only when the account is not owned/accessible.
- Add `GET /api/v1/accounts/{account_id}/movements` with bounded pagination and newest-first ordering.
- Add focused unit tests for ordering, pagination parameters, and ownership/not-found behavior.

## Non-goals
- No frontend changes.
- No trade ledger entries.
- No mutation or balance logic changes.

## Tasks
- [x] Add movement response schemas and service query.
- [x] Add authenticated read-only endpoint.
- [x] Add focused tests and validate.

## Evidence
- Added `AccountMovementOut` and paginated response schema.
- Added ownership-scoped newest-first `list_account_movements` service query.
- Added `GET /api/v1/accounts/{account_id}/movements` with bounded pagination.
- `python3 -m pytest tests/test_account_ledger.py tests/test_account_ledger_history.py -q` — 5 passed; only existing Python 3.14/pytest-asyncio deprecation warnings.
- Ruff passed for all changed backend files.
