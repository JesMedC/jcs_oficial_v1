# Ledger for account funding and withdrawals

## Goal
Implement the first vertical slice of the financial core described in `plataforma SaS`: immutable account ledger entries for deposits and withdrawals, while preserving the existing account balance API.

## Scope
- Restore a canonical account movement/ledger model with account, type, signed amount, previous balance, post balance, and UTC timestamp.
- Add an Alembic migration and register the model.
- Write a ledger entry for successful fund and withdraw operations in the same database transaction as the balance mutation.
- Add focused backend unit/integration tests for happy paths, insufficient balance, and no ledger row on rejected withdrawal.

## Non-goals
- No trade margin/profit ledger entries yet.
- No account replication yet.
- No frontend changes.
- No concurrency redesign beyond preserving the current service transaction boundary.

## Tasks
- [x] Add ledger model, enum, and migration.
- [x] Integrate fund/withdraw service writes atomically.
- [x] Add focused tests and run backend validation.

## Evidence
- Added `AccountMovement`/`AccountMovementType`, model export, and Alembic revision `0015_create_account_movements`.
- Fund and withdraw now flush an account movement row in the same transaction as the balance update and audit row.
- Added focused ledger tests.
- `cd backend && pytest tests/test_account_ledger.py` could not run because `pytest` is not installed in the active Python environment.
- `cd backend && python -m pytest tests/test_account_ledger.py` could not run because `pytest` is not installed.
- `cd backend && python -m ruff check ...` could not run because `ruff` is not installed.
- AST/compile validation passed for changed Python files.
- Installed the backend test tooling and compatible Python 3.14 runtime packages; focused tests and ruff now pass.
