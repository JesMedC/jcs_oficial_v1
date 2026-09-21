# Spec: workspace-discipline-cap

## Purpose

Workspace-level session ops-cap setting that lets users tighten (never loosen) the discipline engine's per-session trade limit within a plan-tier ceiling. Stored as nullable `workspaces.session_ops_cap`; NULL falls back to the plan ceiling. Server-side validation blocks raises above the ceiling. Frontend `ConfiguracionPage → Disciplina` tab surfaces the ceiling and exposes a bounded numeric input.

## Requirements

### Requirement: REQ-DSC-001 — Workspace column

`workspaces` SHALL expose a nullable `session_ops_cap SMALLINT` column with `CHECK (session_ops_cap IS NULL OR (session_ops_cap BETWEEN 1 AND 10))`. Alembic `0013_session_ops_cap` SHALL add the column and backfill existing workspaces to their tier ceiling.

#### Scenario: Column exists, nullable, CHECK enforced

- GIVEN `0013_session_ops_cap.py` applied
- WHEN a test inserts `session_ops_cap=0` or `=20`
- THEN the DB MUST reject the insert with a CHECK violation

### Requirement: REQ-DSC-002 — Per-plan ceiling

Ceiling SHALL be `STARTER=4`, `PRO=6`, `PRO_PLUS=6`, `ELITE=10`. The constant `_PLAN_CEILING_BY_TIER` SHALL live in one module and be imported by migration, engine, and API.

#### Scenario: STARTER, ELITE, PRO_PLUS ceilings

- GIVEN `_PLAN_CEILING_BY_TIER`
- WHEN reading `STARTER`, `ELITE`, `PRO_PLUS`
- THEN values MUST equal 4, 10, 6

### Requirement: REQ-DSC-003 — NULL falls back to ceiling

The engine SHALL resolve the effective cap as `workspace.session_ops_cap or _PLAN_CEILING_BY_TIER[workspace.plan_tier]`. NULL behaves identically to the column being set to the ceiling.

#### Scenario: NULL behaves like ceiling

- GIVEN a `PRO` workspace with `session_ops_cap IS NULL`
- WHEN the session-cap rule runs
- THEN the effective cap MUST equal 6

### Requirement: REQ-DSC-004 — PATCH endpoint

`PATCH /api/v1/workspaces/{workspace_id}/settings` SHALL accept `{ "session_ops_cap": int }`, validate `1 ≤ value ≤ plan_ceiling`, persist, and return the updated workspace. Caller MUST be a workspace member.

#### Scenario: Valid value persists

- GIVEN an authenticated member of a `PRO` workspace
- WHEN they PATCH `{ "session_ops_cap": 5 }`
- THEN response MUST be 200 with the updated workspace

### Requirement: REQ-DSC-005 — Out-of-range validation

PATCH values `< 1` or `> plan_ceiling` SHALL return 422 with `ErrorCode.DISCIPLINE_CAP_OUT_OF_RANGE`. The `message` SHALL include the active ceiling. The new literal SHALL be added to `ErrorCode`.

#### Scenario: Value above ceiling rejected

- GIVEN a `PRO` workspace (ceiling 6)
- WHEN they PATCH `{ "session_ops_cap": 7 }`
- THEN response MUST be 422 with `code=DISCIPLINE_CAP_OUT_OF_RANGE` and message mentions "6"

### Requirement: REQ-DSC-006 — Discipline engine reads workspace setting

`validate_open_trade` SHALL read `account.workspace.session_ops_cap` (with the plan ceiling as fallback) when applying REQ-DISC-008. The engine SHALL NOT consume a hardcoded session-cap from `_plan_caps`.

#### Scenario: Engine honors workspace column over tier default

- GIVEN a `PRO` workspace with `session_ops_cap=5`
- WHEN `validate_open_trade` runs the session-cap rule
- THEN it MUST cap at 5 ops per `(local_day, band)` — NOT the PRO tier's 6

#### Scenario: Engine rejects 6th op when cap=5

- GIVEN 5 trades in `(local_day, LONDON)` and `session_ops_cap=5`
- WHEN the 6th trade attempts to open
- THEN it MUST raise `DisciplineError(code="SESSION_CAP_EXCEEDED")`

### Requirement: REQ-DSC-007 — Frontend Disciplina tab

`ConfiguracionPage` SHALL add a `"Disciplina"` tab with a numeric input for `session_ops_cap` bound by `min=1`, `max=plan_ceiling`. The ceiling SHALL be displayed as helper text. After a successful PATCH, the TanStack Query cache MUST invalidate the workspace detail and session-stats keys.

#### Scenario: Lowering the cap persists via PATCH

- GIVEN a `PRO` workspace with `session_ops_cap=6`
- WHEN the user sets the input to 4 and clicks Save
- THEN the page MUST `PATCH /api/v1/workspaces/{id}/settings` with `{ session_ops_cap: 4 }`

#### Scenario: Raising above ceiling blocked client-side

- GIVEN a `PRO` workspace (ceiling 6)
- WHEN the Disciplina tab renders
- THEN the input's `max` attribute MUST equal 6

## Dependencies

- `Workspace` model + Alembic `0013_session_ops_cap`
- `ErrorCode` enum (new `DISCIPLINE_CAP_OUT_OF_RANGE`)
- `WorkspaceOut` / new `WorkspaceSettingsOut` schema
- Backend `PATCH /api/v1/workspaces/{workspace_id}/settings` (new router)
- Frontend: `ConfiguracionPage`, new `useUpdateSessionCap` mutation

## Out of scope

- Lowering the plan ceiling itself.
- Audit log of cap changes.
- Per-account overrides (workspace-level only).
- Historical analytics recomputation when the cap is lowered.