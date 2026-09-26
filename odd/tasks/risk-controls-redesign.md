# Risk controls and journal redesign

- [x] Make operation limits configurable from Risk management, not hidden in configuration.
- [x] Add daily, weekly, and monthly loss-percentage controls with server persistence and enforcement.
- [x] Redesign Risk page with control form, exposure metrics, and professional hierarchy.
- [x] Redesign Diario page with professional calendar, KPI, and selected-day detail surfaces.
- [ ] Validate complete production flow with Playwright and deployment.

Evidence:
- Work-unit commit: `f3f5344 feat(risk): configure workspace loss controls`
- Frontend typecheck, lint, build: passed.
- Focused Risk/Diario tests: 6 passed.
- Backend Ruff and Alembic heads: passed.
- Full frontend suite: 99 passed, 8 pre-existing/unrelated failures remain.
- Backend discipline suite: blocked by missing `db_session` fixture in repository test setup.
