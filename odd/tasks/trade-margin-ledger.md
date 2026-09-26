# Trade margin ledger entry on open

## Goal
Extend the financial ledger so every successfully opened trade records the capital reserved from the account as an immutable `TRADE_MARGIN` movement.

## Scope
- Add `TRADE_MARGIN` to the account movement type.
- Update the ledger database constraint/migration safely.
- Write one negative ledger movement when `open_trade` deducts binary investment or forex notional.
- Keep the movement and trade/balance mutation in the same transaction.
- Add focused unit tests for binary and forex margin amounts plus insufficient-balance rejection.

## Non-goals
- No margin return or profit/loss movements on close yet.
- No frontend changes.
- No risk-rule changes.

## Tasks
- [x] Extend movement type and migration.
- [x] Integrate margin movement into trade opening.
- [x] Add focused tests and validate.

## Evidence
- Added `TRADE_MARGIN` and updated the signed amount constraint through migration `0016_add_trade_margin_movement`.
- `open_trade` now records the negative binary investment or forex notional in the same transaction as the trade and balance update.
- Focused regression run (`test_trade_margin_ledger.py`, `test_account_ledger.py`, `test_account_ledger_history.py`): 8 passed.
- Ruff passed for all changed files in this slice.
- Full-repo Ruff remains red on 261 unrelated pre-existing errors outside this task scope.
