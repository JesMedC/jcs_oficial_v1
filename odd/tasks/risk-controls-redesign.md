# Risk controls and journal redesign

- [x] Make operation limits configurable from Risk management, not hidden in configuration.
- [x] Add daily, weekly, and monthly loss-percentage controls with server persistence and enforcement.
- [x] Make risk mode mutually exclusive: operation quantity OR percentage loss, never both.
- [x] Redesign Risk page with control form, exposure metrics, and professional hierarchy.
- [x] Redesign Diario page with professional calendar, KPI, and selected-day detail surfaces.
- [x] Validate complete production flow with Playwright and deployment.
- [x] Fix session-cap off-by-one: move `validate_open_trade` before `db.add/flush` in `trade_service.open_trade` so the new trade does not count itself.
- [x] Move risk-control settings (risk_control_mode, session_ops_cap, daily_loss_pct, weekly_loss_pct, monthly_loss_pct) from `Workspace` to `TradingAccount` (REQ-RISK-PER-ACCOUNT) so each account can run independent discipline. RiesgoPage adds an AccountSelector; the discipline endpoint moved from `/workspaces/{id}/discipline` to `/accounts/{id}/discipline` and `useRiskControls(accountId)` plus `useRiskSummary` follow the new shape.

Evidence:
- Work-unit commits:
  - `f3f5344 feat(risk): configure workspace loss controls`
  - `2105e2c docs(odd): record risk controls validation`
  - `d88513d fix(trades): validate session cap before persisting trade`
  - `c1610bd feat(risk): persist workspace risk-control mode in schema and engine`
  - `04935f0 feat(risk): make RiesgoPage expose mutually exclusive control modes`
  - `813c77d docs(odd): record session-cap off-by-one fix as evidence`
- Backend validation:
  - Ruff on `account_discipline.py`, `me.py`, `discipline_engine.py`, `trade_service.py`, `trading_account.py`, `workspace.py`, schemas, migration 0022: all passed.
  - Alembic head `0022_account_risk_control` after migration apply; workspace columns dropped, account columns backfilled from prior workspace settings.
  - Production Playwright spec (during this session) confirms: per-account settings persisted, mode flipping works, cross-field 422 (`DISCIPLINE_MODE_CONFLICT`), per-account isolation (second account does not inherit first account's percentages), session cap off-by-one (4 trades OK, 5th rejected).
- Frontend validation:
  - `pnpm typecheck` and `pnpm lint` clean.
  - `pnpm vitest run` on RiesgoPage (4 tests), DiarioPage (3 tests), DisciplinaTab (3 tests) — 10/10 passed.
