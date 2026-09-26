# Risk controls and journal redesign

- [x] Make operation limits configurable from Risk management, not hidden in configuration.
- [x] Add daily, weekly, and monthly loss-percentage controls with server persistence and enforcement.
- [x] Make risk mode mutually exclusive: operation quantity OR percentage loss, never both.
- [x] Redesign Risk page with control form, exposure metrics, and professional hierarchy.
- [x] Redesign Diario page with professional calendar, KPI, and selected-day detail surfaces.
- [x] Validate complete production flow with Playwright and deployment.

Evidence:
- Work-unit commit: `f3f5344 feat(risk): configure workspace loss controls`
- Frontend typecheck, lint, build: passed.
- Focused Risk/Diario tests: 6 passed.
- Backend Ruff and Alembic heads: passed.
- Full frontend suite: 99 passed, 8 pre-existing/unrelated failures remain.
- Backend discipline suite: blocked by missing `db_session` fixture in repository test setup.
- Mutually exclusive risk mode validation: `pnpm typecheck`, `pnpm lint`, `pnpm build`, focused Riesgo/Diario/Disciplina tests (9 passed), backend Ruff, Alembic head `0021_workspace_risk_control_mode`, production migration, and production Playwright smoke passed.
- Session cap off-by-one: backend `open_trade` flushed the new Trade before running `validate_open_trade`, so the just-submitted trade was counted against its own session cap. With `session_ops_cap=4` the user could only open 3 trades. Fix moves the discipline engine pre-flight before the `db.add/flush`. Re-verified in production with both the one-shot script (trades 1–4 OK, 5th rejected with `SESSION_CAP_EXCEEDED`) and a Playwright spec (`session cap allows 4 ops and rejects the 5th`, 1 test passed).
