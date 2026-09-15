# Spec: session-classification

## Purpose

Authoritative 4-band trading-session model shared by backend discipline rules and frontend display. Replaces legacy `ASIA | EUROPA | NY_AMERICA | NY_PM` with `ASIA | LONDON | NEW_YORK | SYDNEY` over the existing UTC windows (`00–07`, `07–12`, `12–17`, `17–24`). Backend `Band` `Literal` in `backend/app/services/session_service.py` is the single source of truth; frontend consumes through one shared module at `src/features/sessions/index.ts`.

## Requirements

### Requirement: REQ-SES-001 — Backend band literals

The `Band` type SHALL export exactly `Literal["ASIA", "LONDON", "NEW_YORK", "SYDNEY"]`. The literals `EUROPA`, `NY_AMERICA`, `NY_PM` SHALL NOT appear under `backend/app/`.

#### Scenario: Literal set is the four real names

- GIVEN `session_service.py`
- WHEN a test imports `Band`
- THEN `Band` MUST equal `Literal["ASIA", "LONDON", "NEW_YORK", "SYDNEY"]`

#### Scenario: Legacy literals removed

- GIVEN the repo at merge commit
- WHEN `git grep -nE "EUROPA|NY_AMERICA|NY_PM" backend/app/ src/` runs
- THEN it MUST return zero matches

### Requirement: REQ-SES-002 — UTC window mapping

Each band maps to a fixed UTC window, end-exclusive: `ASIA=[0,7)`, `LONDON=[7,12)`, `NEW_YORK=[12,17)`, `SYDNEY=[17,24)`. Windows are contiguous and cover the full 24-hour range.

#### Scenario: ASIA owns hour 06, SYDNEY owns hour 23

- GIVEN `datetime(2026, 9, 4, 6, 30, tzinfo=UTC)` and `tz="UTC"`
- WHEN the resolver runs
- THEN it MUST return `"ASIA"`

- GIVEN `datetime(2026, 9, 4, 23, 30, tzinfo=UTC)` and `tz="UTC"`
- WHEN the resolver runs
- THEN it MUST return `"SYDNEY"`

### Requirement: REQ-SES-003 — TZ-aware local-hour bucketing

`session_for_timestamp(ts, tz)` SHALL localize `ts` to IANA `tz` first, then look up the LOCAL hour. Naive timestamps are treated as UTC. Unknown IANA names raise `ZoneInfoNotFoundError`; the API boundary translates to `ErrorCode.INVALID_TIMEZONE` (422).

#### Scenario: UTC 02:00 in America/Buenos_Aires lands in SYDNEY

- GIVEN `datetime(2026, 6, 15, 2, 0, tzinfo=UTC)` and `tz="America/Buenos_Aires"`
- WHEN the resolver runs (local hour 23 prior day)
- THEN it MUST return `"SYDNEY"`

#### Scenario: Unknown tz name raises canonical envelope

- GIVEN `tz="Atlantis/Avalon"`
- WHEN the route layer catches the error
- THEN response MUST be 422 with `code=INVALID_TIMEZONE`

### Requirement: REQ-SES-004 — Window-ordering invariant

`_UTC_WINDOWS` is ordered by `start` ascending. The matcher picks the FIRST band whose window contains the local hour — pinning the contiguous end-exclusive invariant.

#### Scenario: Hour 12 belongs to NEW_YORK, not LONDON

- GIVEN `datetime(2026, 9, 4, 12, 0, tzinfo=UTC)` and `tz="UTC"`
- WHEN the resolver runs
- THEN it MUST return `"NEW_YORK"` (`[7,12)` is end-exclusive at 12)

### Requirement: REQ-SES-005 — Frontend localized labels

Frontend renders the four bands with Spanish labels: `Asia / Londres / Nueva York / Sídney`. The label map lives in `src/features/sessions/index.ts`. Legacy literals `NYSE`, `LONDRES`, `SIDNEY` SHALL NOT appear under `src/`.

#### Scenario: All four bands have a Spanish label

- GIVEN `src/features/sessions/index.ts`
- WHEN a test imports `SESSION_LABELS`
- THEN it MUST contain `ASIA→"Asia"`, `LONDON→"Londres"`, `NEW_YORK→"Nueva York"`, `SYDNEY→"Sídney"`

### Requirement: REQ-SES-006 — Single shared frontend module

The two frontend classifiers SHALL collapse into ONE shared module. `src/features/trades/sessions.ts` SHALL be removed. `src/features/dashboard/hooks.ts` SHALL import `SessionBand` from `@/features/sessions`.

#### Scenario: Shared module exports the type

- GIVEN `src/features/sessions/index.ts`
- WHEN `import { type SessionBand } from '@/features/sessions'` is evaluated
- THEN `SessionBand` MUST equal `'ASIA' | 'LONDON' | 'NEW_YORK' | 'SYDNEY'`

#### Scenario: Legacy 3-class file removed

- GIVEN the merge commit
- WHEN the tree is inspected
- THEN `src/features/trades/sessions.ts` SHALL NOT exist

### Requirement: REQ-SES-007 — Wire payload uses new band names

JSON endpoints SHALL serialize the new band names. An `EnvFlag=JCS_SESSION_NAMES_LEGACY=1` MAY temporarily alias legacy literals; off by default.

#### Scenario: Session-stats JSON uses new band names

- GIVEN a workspace with trades across all bands
- WHEN `GET /api/v1/trades/session-stats` resolves
- THEN `body.sessions` MUST have keys `ASIA`, `LONDON`, `NEW_YORK`, `SYDNEY`

## Dependencies

- `app.services.session_service` (Band + `_UTC_WINDOWS`)
- `ErrorCode.INVALID_TIMEZONE`
- Frontend: `src/features/sessions/index.ts`

## Out of scope

- Historical backfill of `Trade.band_at_open` for legacy-named trades.
- `users.timezone` column migration.
- `trade_service.py:1319 _SESSION_BANDS` rename (covered by this change).