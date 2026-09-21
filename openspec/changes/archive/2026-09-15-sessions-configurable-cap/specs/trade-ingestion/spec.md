# Delta for trade-ingestion

## Purpose

`trade-ingestion` covers the surface that gates a trade from opening: client validation, server submission, and the discipline rules invoked inside `trade_service.open_trade`. This delta modifies **only** the session ops-cap rule (REQ-DISC-008). Every other discipline rule and every drawer/form requirement is unchanged.

## MODIFIED Requirements

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

## Dependencies

- `app.services.discipline_engine.validate_open_trade` (modified)
- `app.services.workspace_service.get_session_ops_cap` (new)
- `app.models.Workspace.session_ops_cap` (new column)
- Existing `SESSION_CAP_EXCEEDED` envelope code (unchanged)
- Renamed `Band` literal (per `session-classification` spec)

## Out of scope

- REQ-DISC-005 / REQ-DISC-006 / REQ-DISC-007 / REQ-DISC-010 — unchanged.
- `NewTradeDrawer` form fields, Zod schema, optimistic update, error envelope display — unchanged.
- Historical trades backfilled under the old `4` cap — not retroactively re-capped.
- Per-account overrides of `session_ops_cap`.