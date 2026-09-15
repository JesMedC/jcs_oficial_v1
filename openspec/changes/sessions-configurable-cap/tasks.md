# Tasks: sessions-configurable-cap

> ~905 LOC across 3 chained slices (A backend / B frontend / C verify). Each slice ≤400 LOC, independent revert. Strategy: stacked-to-main. Strict TDD: every prod task has paired RED test. No `Co-Authored-By`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~905 LOC across 3 slices |
| Per-slice ceiling | 400 LOC |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR #A → PR #B → PR #C |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| A | Backend foundation: Band rename + column + migration + discipline read switch + PATCH endpoint + ErrorCode | PR #A | `pytest tests/services/test_session_service.py tests/services/test_discipline_engine.py tests/api/test_workspace_discipline.py tests/alembic/test_migration_0013.py` | alembic upgrade + uvicorn dev | revert `session_service.py` + downgrade `0013` |
| B | Frontend wiring: shared sessions module + DisciplinaTab + consumer migrations + delete legacy module + types | PR #B | `pnpm test src/features/sessions src/features/dashboard src/features/trades src/pages/portal` | vitest + RTL | revert slice B files; restore legacy `sessions.ts` |
| C | Verification + cleanup: legacy grep, e2e smoke, docstring, full CI gate | PR #C | `pnpm test:e2e -- discipline-cap.spec.ts` + legacy-literal grep | Playwright dev + auth | revert single docstring commit |

## TDD Ordering Rule

Strict TDD ACTIVE. Order per task: **RED** (failing test first) → **GREEN** (minimum prod change) → **REFACTOR** (no new behaviour). No production code lands without a failing test. `_PLAN_CEILING_BY_TIER` is the single source of truth — migration + engine + API all import it; a backend test pins dict equality.

---

## Slice A — Backend foundation (~405 LOC)

> Capabilities: REQ-SES-001..004, REQ-SES-007, REQ-DSC-001..006, REQ-DISC-008.
> Base: `main`. PR #A merges to `main` first.

- [ ] T-001 **[RED]** Add `backend/tests/services/test_session_classification.py` — assert `Band` literal set + `_UTC_WINDOWS` ordering `[ASIA,LONDON,NEW_YORK,SYDNEY]` + hour 06→ASIA, 23→SYDNEY, 12→NEW_YORK, BA UTC 02:00→SYDNEY. ~40 LOC. *Fails on legacy literals.*
- [ ] T-002 **[GREEN]** Edit `backend/app/services/session_service.py` — rename `Band` Literal union + `_UTC_WINDOWS` entries; update header docstring. Edit `backend/app/services/trade_service.py:1319` `_SESSION_BANDS` keys. ~20 LOC. *T-001 passes.*
- [ ] T-003 **[RED]** Add `backend/tests/alembic/test_migration_0013.py` — seed STARTER/PRO/ELITE workspaces; post-upgrade assert `session_ops_cap` = 4/6/10 and NONE=NULL. ~30 LOC. *Fails before migration exists.*
- [ ] T-004 **[GREEN]** Create `backend/alembic/versions/0013_workspace_session_ops_cap.py` — `down_revision="0012_add_fund_withdraw"`; `add_column SmallInteger nullable`; loop `_PLAN_CEILING_BY_TIER` for backfill `UPDATE`; `downgrade` drops column. ~25 LOC. *T-003 passes.*
- [ ] T-005 **[RED]** Create `backend/tests/api/test_workspace_discipline.py` — seed PRO workspace; PATCH `{"session_ops_cap":5}` → 200 `{workspace_id, plan_tier:"PRO", session_ops_cap:5, ceiling:6}`; PATCH `{"session_ops_cap":7}` → 422 `DISCIPLINE_CAP_OUT_OF_RANGE` message contains "6"; non-member → 403 `WORKSPACE_ACCESS_DENIED`. ~80 LOC.
- [ ] T-006 **[GREEN]** Edit `backend/app/models/workspace.py` — add `session_ops_cap: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)`. ~5 LOC.
- [ ] T-007 **[GREEN]** Edit `backend/app/services/discipline_engine.py` — add `_PLAN_CEILING_BY_TIER: dict[WorkspacePlanTier, int] = {STARTER:4, PRO:6, ELITE:10}` + `_PLAN_CEILING_FALLBACK=4` + `plan_ceiling_for(tier)`. ~10 LOC.
- [ ] T-008 **[GREEN]** Create `backend/app/api/v1/workspaces.py` — `@router.patch("/{workspace_id}/discipline", response_model=WorkspaceDisciplineOut)`; validate `1 <= value <= plan_ceiling_for(ws.plan_tier)` else HTTPException 422 `DISCIPLINE_CAP_OUT_OF_RANGE`; commit + return. Create `backend/app/schemas/workspace.py` `WorkspaceDisciplineOut`. Edit `backend/app/schemas/envelope.py` — append `DISCIPLINE_CAP_OUT_OF_RANGE` to `ErrorCode`. Register router in `backend/app/api/v1/__init__.py`. ~120 LOC. *T-005 passes.*
- [ ] T-009 **[GREEN]** Edit `backend/app/services/discipline_engine.py` — drop `4` literal from `_plan_caps`; refactor rule 6 to call `_workspace_session_cap(account.workspace)` returning `workspace.session_ops_cap or plan_ceiling_for(workspace.plan_tier)`. Update `test_discipline_engine.py` fixtures + add REQ-DISC-008 scenarios (PRO NULL=6; PRO NULL+6 trades → 7th raises; cap=4 overrides ceiling; TZ bucket; distinct bands; capital-movement excluded; rule order broker-before-session). ~80 LOC. *All tests pass.*
- [ ] T-010 **[REFACTOR]** Tidy `backend/app/services/discipline_engine.py` — dedupe imports, drop commented legacy literals. `git grep -nE "EUROPA|NY_AMERICA|NY_PM" backend/app/` → 0. ~15 LOC.

### Slice A Acceptance

- `cd backend && pytest tests/services/test_session_service.py tests/services/test_discipline_engine.py tests/api/test_workspace_discipline.py tests/alembic/test_migration_0013.py` — green.
- `cd backend && pytest` — full suite green.
- `cd backend && mypy app` + `ruff check` — clean.
- `git grep -nE "EUROPA|NY_AMERICA|NY_PM" backend/app/` — 0 (excluding tasks.md, design.md).
- `alembic upgrade head` and `downgrade -1` clean.

---

## Slice B — Frontend wiring (~340 LOC net)

> Capabilities: REQ-SES-005..007 frontend, REQ-DSC-007 frontend.
> Base: `main` AFTER Slice A merged.

- [ ] T-011 **[RED]** Create `src/features/sessions/__tests__/index.test.ts` — assert `SESSION_LABELS` (ASIA→"Asia", LONDON→"Londres", NEW_YORK→"Nueva York", SYDNEY→"Sídney"), `SESSION_ORDER` order, `SessionBand` type. ~30 LOC. *Module missing.*
- [ ] T-012 **[GREEN]** Create `src/features/sessions/index.ts` — export `SessionBand`, `SESSION_ORDER`, `SESSION_LABELS` per design §4.1. ~30 LOC. *T-011 passes.*
- [ ] T-013 **[GREEN]** Edit `src/features/dashboard/hooks.ts` line 24 — `import type { SessionBand } from '@/features/sessions'`. Edit `src/components/dashboard/WinrateBySessionCard.tsx` — drop local `SESSION_LABEL`, import `SESSION_LABELS`; map Asia→jade, London→info, New York→profit, Sídney→warning. Update `useSessionStats.test.tsx` + `WinrateBySessionCard.test.tsx` fixtures (`NY_AMERICA`→`NEW_YORK`, etc.). ~40 LOC. *Tests pass.*
- [ ] T-014 **[GREEN]** Edit `src/features/trades/TradeTableRow.tsx` — drop `getTradeSession`, consume `trade.session` from wire JSON with `SESSION_LABELS[b]`. Edit `TradeTable.tsx`, `NewTradeForm.tsx`, `DiarioPage.tsx` to import `SessionBand` from `@/features/sessions`. Update `TradeTableRow.test.tsx` fixtures. ~80 LOC. *Tests pass; typecheck clean.*
- [ ] T-015 **[RED]** Create `src/pages/portal/__tests__/DisciplinaTab.test.tsx` — render with workspace `{plan_tier:"PRO", session_ops_cap:6}`; input `max=6`; lower to 4 + click Save → `PATCH /api/v1/workspaces/{id}/discipline` with `{session_ops_cap:4}`; on 422 `DISCIPLINE_CAP_OUT_OF_RANGE` show error pill with "6". ~80 LOC.
- [ ] T-016 **[GREEN]** Create `src/pages/portal/DisciplinaTab.tsx` — `data-testid="tab-disciplina"`, ceiling helper, numeric `input min={1} max={ceiling}`, Save, 422 pill. Create `src/features/sessions/plan.ts` — `PLAN_CEILING: Record<WorkspacePlanTier, number>`. Edit `src/pages/portal/ConfiguracionPage.tsx` — wire as 4th tab between Activos and Preferencias. ~120 LOC. *T-015 passes.*
- [ ] T-017 **[GREEN]** Create `src/features/workspace/useUpdateSessionCap.ts` — TanStack `useMutation` PATCHing discipline endpoint; on success invalidate `['workspace', id, 'discipline']` + `['session-stats', workspaceId]`. Wire `DisciplinaTab` to use it. ~40 LOC.
- [ ] T-018 **[GREEN/DELETE]** Delete `src/features/trades/sessions.ts` + `src/features/trades/__tests__/sessions.test.ts`. `pnpm typecheck` MUST be clean (no `getTradeSession`/`NYSE`/`LONDRES`/`SIDNEY` references). Net ~-100 LOC.
- [ ] T-019 **[GREEN]** Edit `src/features/accounts/types.ts` + `src/features/auth/types.ts` — extend `Workspace` type with `session_ops_cap: number | null`; mirror `ErrorCodeValues` with `'DISCIPLINE_CAP_OUT_OF_RANGE'`. ~20 LOC.

### Slice B Acceptance

- `pnpm test src/features/sessions src/features/dashboard src/features/trades src/pages/portal` — green.
- `pnpm test` + `pnpm typecheck` + `pnpm lint` — clean.
- `git grep -nE "NYSE|LONDRES|SIDNEY" src/` — 0 in non-test files.
- Visual: 4 Spanish-labeled tiles in `WinrateBySessionCard`; bounded input in `DisciplinaTab`.

---

## Slice C — Verification + cleanup (~140 LOC)

> Base: `main` AFTER Slice B merged. All VERIFY/DOCS — no prod behaviour.

- [x] T-020 **[VERIFY]** Create `tests/scripts/check_no_legacy_session_literals.sh` — `git grep -nE "EUROPA|NY_AMERICA|NY_PM" backend/app/ src/` excluding `node_modules/`, `dist/`, `.venv/`, `__pycache__/`, `openspec/`, `.playwright-mcp/`; exit 1 on non-test-comment match. Wire as required CI check. ~20 LOC.
- [x] T-021 **[VERIFY]** Create `tests/e2e/discipline-cap.spec.ts` — log in as PRO workspace owner; open `ConfiguracionPage → DisciplinaTab`; lower cap 6→3, save; attempt 4th trade in `(local_day, LONDON)`; expect 422 `SESSION_CAP_EXCEEDED`; raise cap to 6; expect next trade succeeds. ~80 LOC.
- [x] T-022 **[DOCS]** Edit `backend/app/services/discipline_engine.py` module docstring — document workspace-driven cap (REQ-DSC-006) and link to spec; note single-source `_PLAN_CEILING_BY_TIER` discipline. ~30 LOC.
- [x] T-023 **[VERIFY / CI gate]** Run `pytest`, `mypy app`, `ruff check`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `bash tests/scripts/check_no_legacy_session_literals.sh`, `pnpm test:e2e -- discipline-cap.spec.ts` — all green. Document any deferreds in `openspec/changes/sessions-configurable-cap/verify-report.md`. ~10 LOC.

### Slice C Acceptance

- All gates in T-023 green on CI.
- `verify-report.md` maps every REQ (REQ-SES-001..007, REQ-DSC-001..007, REQ-DISC-008 scenarios) to its test file.
- `EUROPA / NY_AMERICA / NY_PM` → 0 matches in merged tree.
- Rollback rehearsal: `alembic downgrade -1` on fresh DB restores pre-change state cleanly.

---

## Cross-slice dependency map

```
Slice A: T-001→T-002 · T-003→T-004 · T-005→T-006,T-007→T-008 · T-009 · T-010
   ↓ (merge A → main)
Slice B: T-011→T-012 · T-013 · T-014 · T-015→T-016→T-017 · T-018 · T-019
   ↓ (merge B → main)
Slice C: T-020 · T-021 · T-022 · T-023
```

## Out-of-scope guards (do NOT add tasks)

- Daily P&L cap, broker $404, capital-inicial 0.25% — unchanged.
- Per-account `session_ops_cap` overrides — out per REQ-DSC-007.
- Historical `Trade.band_at_open` backfill — out per REQ-SES-007.
- Audit log of cap changes — out per REQ-DSC-007.
- Plan ceiling lowering — out per REQ-DSC-007.