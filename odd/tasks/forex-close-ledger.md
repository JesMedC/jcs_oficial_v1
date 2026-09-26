# Forex trade close ledger settlement

## Goal
Represent the exact FOREX close balance transition in the immutable ledger.

## Scope
- Allow `TRADE_PROFIT` to carry a signed non-zero P&L amount (positive profit or negative loss).
- Update the ledger constraint/migration safely.
- On FOREX close, record positive `TRADE_RETURN` for the reserved notional.
- Record signed `TRADE_PROFIT` when FOREX P&L is non-zero.
- Preserve existing balance/P&L formulas and atomic close behavior.
- Add focused tests for forex win, loss, break settlement, and invalid close/no movement.

## Non-goals
- No new risk rules.
- No frontend changes.
- No changes to binary settlement semantics.

## Tasks
- [x] Update profit movement constraint and migration.
- [x] Integrate forex settlement movements into close_trade.
- [x] Add focused tests and validate.

## Evidence
- Updated `AccountMovement` signed-amount check and Alembic migration 0018 so `TRADE_PROFIT` is non-zero signed while deposit/return stay positive and withdrawal/margin stay negative.
- `close_trade` now records FOREX settlement movements in balance order: notional `TRADE_RETURN`, then signed non-zero `TRADE_PROFIT`.
- Focused regression run across all ledger slices: 16 tests passed.
- Scoped Ruff passed for the changed model, service, migration, and FOREX tests.
- Existing Python 3.14/pytest-asyncio deprecation warnings remain non-blocking.
