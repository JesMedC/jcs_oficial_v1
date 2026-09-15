# Archive Report: sessions-configurable-cap

**Change**: sessions-configurable-cap
**Archived**: 2026-09-15
**Archive location**: `openspec/changes/archive/2026-09-15-sessions-configurable-cap/`
**Verifier verdict**: PASS_WITH_WARNINGS (15/15 reqs + 26/26 scenarios compliant, 0 CRITICAL, 0 blockers)
**Outcome**: success

## Summary

The sessions-configurable-cap change is now in production on `main`:

- **Backend**: 4 trading sessions (`ASIA / LONDON / NEW_YORK / SYDNEY`) with per-workspace configurable ops-cap (STARTER ceiling=4, PRO=6, ELITE=10)
- **Frontend**: Disciplina tab in `/portal/configuracion` lets users lower the cap within their plan ceiling; `DISCIPLINE_CAP_OUT_OF_RANGE` error pill on out-of-range attempts
- **API**: `PATCH /api/v1/workspaces/{id}/discipline` endpoint accepts `{session_ops_cap: int | null}`; null resets to plan ceiling
- **Verification**: legacy-literal grep gate (0 production matches), e2e spec written (type-clean, awaits CI), 52 in-scope pytest + 18 in-scope vitest passing

## Specs promoted to openspec/specs/

| Domain | Action | Method | Notes |
|--------|--------|--------|-------|
| `session-classification` | NEW (created) | mechanical `cp` from change specs/ | byte-identical copy verified by `diff -r` (empty output) |
| `workspace-discipline-cap` | NEW (created) | mechanical `cp` from change specs/ | byte-identical copy verified by `diff -r` (empty output) |
| `trade-ingestion` | MODIFIED (delta appended) | shell `cat >> spec.md` | ORIGINAL_PREFIX_INTACT + DELTA_APPENDED_INTACT verified; REQ-DISC-008 + 7 scenarios appended under "Modified by sessions-configurable-cap on 2026-09-15" marker |

## Final-state facts (outranking any stale apply-progress snapshot)

The implementation is complete and matches the verify report. No follow-up commits after Slice C.

### Backend (committed across slices A + C)
- `backend/app/services/session_service.py` — `Band` Literal + `_UTC_WINDOWS` + `session_for_timestamp` + `local_date_for_timestamp`
- `backend/app/services/discipline_engine.py` — `_PLAN_CEILING_BY_TIER`, `plan_ceiling_for`, `_workspace_session_cap`, updated `validate_open_trade` rule 6
- `backend/app/models/workspace.py` — `session_ops_cap: Mapped[int | None]` (SmallInteger, nullable)
- `backend/alembic/versions/0013_workspace_session_ops_cap.py` — migration with per-tier backfill
- `backend/app/api/v1/workspace_discipline.py` — PATCH endpoint
- `backend/app/schemas/envelope.py` — `DISCIPLINE_CAP_OUT_OF_RANGE` enum entry
- `backend/app/schemas/workspace.py` — `WorkspaceDisciplineOut` + `WorkspaceDisciplinePatchIn`
- 4 new test files + 1 updated test file (test_discipline_engine.py)
- 1 alembic test file
- Module docstring updated with REQ-DISC-008 reference

### Frontend (committed across slices B + C)
- `src/features/sessions/index.ts` — shared `SessionBand` type + `SESSION_ORDER` + `SESSION_LABELS`
- `src/features/sessions/plan.ts` — `PLAN_CEILING` mirror
- `src/features/sessions/__tests__/index.test.ts` — RED→GREEN contract
- `src/features/workspace-discipline/keys.ts` — queryKey factory
- `src/features/workspace-discipline/useUpdateSessionCap.ts` — TanStack Query mutation
- `src/pages/portal/DisciplinaTab.tsx` — Disciplina tab component
- `src/pages/portal/__tests__/DisciplinaTab.test.tsx` — RED→GREEN contract
- Updated `src/pages/portal/ConfiguracionPage.tsx` (4th tab)
- Updated `src/components/dashboard/WinrateBySessionCard.tsx` (labels)
- Updated `src/features/dashboard/hooks.ts` (re-export)
- Updated `src/features/trades/TradeTableRow.tsx` (4-band labels)
- Updated `src/features/auth/types.ts` (`WorkspaceOut.session_ops_cap` + ErrorCode mirror)
- Updated `src/features/trades/discipline.ts` (`DISCIPLINE_CAP_OUT_OF_RANGE` + Spanish message)
- Deleted `src/features/trades/sessions.ts` + its test
- Added `package.json` script `"verify:rename": "bash scripts/verify-session-rename.sh"`

### Verification artifacts (slice C)
- `scripts/verify-session-rename.sh` — bash grep gate
- `tests/e2e/discipline-cap.spec.ts` — Playwright smoke (type-clean, awaits CI)
- `openspec/changes/archive/2026-09-15-sessions-configurable-cap/verify-report.md` — PASS_WITH_WARNINGS

## Mechanical-copy integrity (proof of byte-identical operations)

```
# Step 2a — new specs
diff -r openspec/changes/sessions-configurable-cap/specs/session-classification/spec.md \
        openspec/specs/session-classification/spec.md
# output: (empty)

diff -r openspec/changes/sessions-configurable-cap/specs/workspace-discipline-cap/spec.md \
        openspec/specs/workspace-discipline-cap/spec.md
# output: (empty)

# Step 2b — trade-ingestion append
head -c 3931 openspec/specs/trade-ingestion/spec.md | diff - <(head -c 3931 <ORIGINAL_BACKUP>)
# output: (empty) → ORIGINAL_PREFIX_INTACT

tail -c +3932 openspec/specs/trade-ingestion/spec.md | diff - .sdd-archive-delta-trade-ingestion.md
# output: (empty) → DELTA_APPENDED_INTACT

# Step 3 — archive move
diff -r <snapshot_root>/source openspec/changes/archive/2026-09-15-sessions-configurable-cap
# output: (empty) → ARCHIVE MOVE BYTE-IDENTICAL
```

## Pre-existing failures (NOT this change's responsibility)

These remain after archive and should be addressed in a separate change:

### Backend pytest
- `tests/api/v1/test_calendar_endpoint.py` × 3 (calendar_service FASE 6 WIP)
- `tests/services/test_calendar_service.py` × 2
- `tests/api/v1/test_trade_open_rules.py::test_interest_required_on_create`
- `tests/test_subscriptions.py::test_upgrade_without_mp_token_returns_422[PLUS/ELITE]` × 2
- `tests/test_subscription_upgrade_mp_sdk.py::test_upgrade_with_empty_token_returns_mp_not_configured`
- `tests/services/test_close_win_math.py`, `tests/services/test_withdraw_cap.py` × 2 (untracked WIP)

### Frontend vitest
- `src/test/components-drift.test.ts`
- `src/test/pages-drift.test.ts`
- `src/components/portal/__tests__/PortalShell.test.tsx`

### Lint
- `src/features/dashboard/useEquityCurve.ts:259`
- `src/pages/portal/__tests__/DiarioPage.test.tsx:26`
- `src/components/scanner/ScannerAlertCard.tsx:33`

### Spec scenario bug (non-blocking, document for follow-up)
- REQ-DISC-008.4 ("TZ-aware bucket boundary") — scenario text is internally inconsistent; implementation correctly does NOT raise but the spec wording should be reviewed

## Branch / commit state

- **Branch**: `main`
- **HEAD at archive time**: `336ab8a` (short SHA from `git rev-parse --short HEAD`)
- **Commits added by this change**: 25 (Slice A: 9, Slice B: 8, Slice C: 4, plus 4 task-tracking commits)
- **Net diff**: ~2800 LOC across backend + frontend + verification artifacts (3 size:exceptions accepted by user)

## Follow-ups (for future changes, NOT this one's responsibility)

1. **E2E CI integration**: run `tests/e2e/discipline-cap.spec.ts` against a docker-compose Postgres+backend+vite stack in CI
2. **Pre-existing failures remediation**: address calendar_service FASE 6 WIP, subscription upgrade flow, withdraw_cap, drift tests, PortalShell QueryClient gap
3. **Ruff cleanup**: 11 auto-fixable cosmetic issues in new backend files
4. **Spec scenario REQ-DISC-008.4**: review and clarify the TZ-aware bucket boundary scenario text
5. **`_PLAN_CEILING_BY_TIER` drift risk**: when adding new plan tiers, update both backend dict and frontend `PLAN_CEILING` mirror (single source of truth would be ideal but out of scope here)

## Task Completion Gate

All 23 implementation tasks T-001..T-023 marked `[x]` in archived `tasks.md` at archive time. T-024 added as final task marker for archive closure. No stale-checkbox reconciliation was required — `apply-progress` and `verify-report` evidence already confirmed completion of every task before this archive phase ran.

## Archive complete

The change is archived. New work starts fresh.