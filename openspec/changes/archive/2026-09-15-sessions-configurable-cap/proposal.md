# Proposal: sessions-configurable-cap — Real session names + per-workspace ops cap

> Change: `sessions-configurable-cap` · Project: `jcs_oficial` · Mode: openspec · Strict TDD: ACTIVE

## Intent

Discipline engine hardcodes 4-ops/session across ALL plan tiers — user reports PRO/PLUS hit 7 ops in one session (cap failed). Labels use legacy codes (`ASIA / EUROPA / NY_AMERICA / NY_PM`) that don't match trading reality and disagree with frontend. Fix: rename to `ASIA / LONDON / NEW_YORK / SYDNEY`; make cap a per-workspace setting bounded by plan ceiling (`STARTER=4 / PRO+PLUS=6 / ELITE=10`).

## Scope

**In**: rename `Band` literals; add `workspaces.session_ops_cap` + Alembic migration; `PATCH /workspaces/{id}/settings`; discipline reads setting with ceiling fallback; collapse frontend 3-session + dashboard 4-band into ONE shared module; new `Disciplina` tab on `ConfiguracionPage`.

**Out**: daily P&L cap, broker $404 cap, capital-inicial 0.25% cap — leave as-is; historical label migration.

## Capabilities

### New

- `session-classification`: 4-session model `ASIA | LONDON | NEW_YORK | SYDNEY`, same UTC windows (`00–07`, `07–12`, `12–17`, `17–24`). Single source: backend `Band` Literal + frontend `src/features/sessions/index.ts`.
- `workspace-discipline-cap`: workspace `session_ops_cap` (int 1..ceiling). Ceiling `STARTER=4 / PRO=PRO_PLUS=6 / ELITE=10`. Default = ceiling.

### Modified

- `trade-ingestion`: REQ-DISC-008 (4-ops/session cap) changes from universal hardcoded 4 to workspace setting bounded by ceiling. Rejection code `SESSION_CAP_EXCEEDED` unchanged.

## Approach

1. Atomic rename (`Band` + `_SESSION_BANDS` + `SessionStatsOut` docstring + frontend `SessionBand`) + Alembic `0013` adding `workspaces.session_ops_cap SMALLINT NOT NULL DEFAULT 4 CHECK (session_ops_cap BETWEEN 1 AND 10)` with per-plan backfill.
2. Discipline engine: `_plan_caps` → `_plan_ceiling`; new `workspace_service.get_session_ops_cap`; new `PATCH /api/v1/workspaces/{id}/settings`.
3. Frontend `src/features/sessions/index.ts` shared module (`Asia / Londres / New York / Sídney`); remove `features/trades/sessions.ts`. Update `WinrateBySessionCard`, `TradeTableRow`, `useSessionStats`, `ConfiguracionPage → Disciplina` with `useUpdateSessionCap` mutation.

## Affected Areas

| Layer | Files |
|-------|-------|
| Backend service | `session_service.py`, `trade_service.py:1319`, `discipline_engine.py`, `workspace_service.py` (new) |
| Backend model/schema | `models/workspace.py`, `models/user.py:58`, `schemas/workspace.py` (new), `schemas/trade.py:374` |
| Backend API + migration | `api/v1/workspaces.py` (new), `api/v1/__init__.py`, `alembic/versions/0013_*` (new) |
| Backend tests | `test_discipline_engine.py`, `test_session_service.py`, `test_session_stats_endpoint.py`, `test_calendar_endpoint.py` (+ frontend: `useSessionStats.test.tsx`, `WinrateBySessionCard.test.tsx`, `TradeTableRow.test.tsx`) |
| Frontend shared | `features/sessions/index.ts` (new), `features/trades/sessions.ts` + test (removed), `features/sessions/__tests__/index.test.ts` (new), `features/workspace/api.ts` (new) |
| Frontend consumers | `features/dashboard/hooks.ts:24`, `components/dashboard/WinrateBySessionCard.tsx`, `features/trades/TradeTableRow.tsx`, `pages/portal/ConfiguracionPage.tsx` |

## Risks

| Risk | Mitigation |
|------|-----------|
| Old literals in cached JSON | UI label map + cache invalidation |
| Missed rename location | Pre-merge `git grep -E "EUROPA\|NY_AMERICA\|NY_PM\|NYSE\|LONDRES\|SIDNEY"` returns 0 |
| `_plan_caps` ceiling drift | Single `_PLAN_CEILING_BY_TIER` dict imported by migration + engine + UI |
| PATCH above ceiling | Server enforces `SESSION_CAP_OUT_OF_RANGE` 422; tests pin 200 + 422 |
| Badge color regression | Preserve `SIDNEY→Sídney` color; visual diff test |

## Rollback Plan

`alembic downgrade -1` drops column (engine falls back to ceiling). Env flag `JCS_SESSION_NAMES_LEGACY=1` restores old aliases. Revert `_plan_caps` to `(daily_pct, 4)` — single flip. Disciplina tab is additive; remove file + entry. Migration is additive; no destructive rollback.

## Dependencies

Alembic 1.13 + `workspaces` table + `WorkspacePlanTier` enum (present). Existing `CurrentUser`/`DbSession` deps.

## Success Criteria

- [ ] 4 new labels in `WinrateBySessionCard`, `TradeTableRow`, `SessionStatsOut` JSON.
- [ ] Discipline reads `workspace.session_ops_cap`; falls back to `_plan_ceiling`; PATCH > ceiling → 422 `SESSION_CAP_OUT_OF_RANGE`.
- [ ] `ConfiguracionPage → Disciplina` lowers cap within ceiling; PATCH persists.
- [ ] Backend + frontend tests green (`test_discipline_engine`, `test_session_service`, `test_session_stats_endpoint`, `test_calendar_endpoint`, `sessions/index.test.ts`, `useSessionStats`, `WinrateBySessionCard`, `TradeTableRow`).
- [ ] `pnpm typecheck`, `pnpm lint`, `ruff check`, `mypy app` clean; `git grep -E "EUROPA|NY_AMERICA|NY_PM"` returns 0 in `src/` and `backend/app/`.
