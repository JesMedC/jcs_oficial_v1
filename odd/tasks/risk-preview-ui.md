# Risk preview in new trade flow

## Goal
Give the trader a professional pre-trade risk readout before submitting a trade, using the existing account balance and deterministic client-side mirrors of backend formulas.

## Scope
- Add a pure `RiskPreview` component for BINARY and FOREX forms.
- Show balance, planned exposure, estimated risk, post-open available balance, and a clear status.
- Handle missing/low balance and incomplete FOREX stop-loss inputs without inventing values.
- Integrate into `NewTradeForm` without changing submission payloads or backend contracts.
- Add unit/component tests for binary, forex, incomplete, and insufficient cases.

## Non-goals
- No new backend risk rules or persistence yet.
- No risk configuration UI.
- No changes to trade calculations or submit gates.

## Tasks
- [x] Add pure risk preview component and calculations.
- [x] Integrate professional risk panel into new trade drawer.
- [x] Add focused tests and validate.

## Evidence
- `pnpm exec vitest run src/features/trades/__tests__/RiskPreview.test.tsx` — passed (4 tests).
- `pnpm typecheck` — passed.
- `pnpm lint` — passed after removing non-component export from `RiskPreview.tsx`.
- Regression note updated: `pnpm exec vitest run src/features/trades/__tests__/NewTradeForm.discipline.test.tsx` now passes (15 tests) after aligning the stale $5000 investment assertion to the documented $5 tier rule and making DVC-02 timing deterministic without fake polling timers.
