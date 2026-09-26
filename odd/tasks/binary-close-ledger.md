# Binary trade close ledger settlement

## Goal
Record binary trade settlement in the immutable ledger when an open trade closes, matching the platform specification.

## Scope
- Add positive `TRADE_RETURN` and `TRADE_PROFIT` movement types.
- Update the signed-amount constraint/migration.
- On binary WIN: record return of investment plus profit.
- On binary BREAK: record return of investment only.
- On binary LOSS: record no return/profit movement; the prior margin remains consumed.
- Keep close trade, balance mutation, movement rows, audit, and commit atomic.
- Add focused unit tests for WIN, BREAK, LOSS, and no movement on invalid close.

## Non-goals
- No forex settlement movements yet.
- No frontend changes.
- No risk-rule changes.

## Tasks
- [x] Extend movement types and migration.
- [x] Integrate binary settlement movements into close_trade.
- [x] Add focused tests and validate.

## Evidence
- Added `TRADE_RETURN` and `TRADE_PROFIT` with migration `0017_add_binary_settlement_movements`.
- Binary WIN records return then profit; BREAK records return only; LOSS records neither.
- Combined ledger/trade regression run: 12 tests passed.
- Scoped Ruff passed for all changed files.
- Existing Python 3.14/pytest-asyncio deprecation warnings remain non-blocking.
