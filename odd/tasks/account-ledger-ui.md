# Account ledger history UI

## Goal
Connect the account movement history endpoint to the portal with a professional, readable ledger surface.

## Scope
- Add typed movement API and TanStack Query hook.
- Replace the account detail Operations placeholder with a responsive ledger table.
- Show movement type, signed amount, balance transition, and localized UTC timestamp.
- Include loading, empty, and error states without changing account mutations.
- Add focused frontend unit tests for formatting and rendered movement states.

## Non-goals
- No backend changes.
- No trade operations table yet.
- No pagination controls beyond the first bounded page.

## Tasks
- [x] Add movement types, API wrapper, and query hook.
- [x] Build professional account ledger panel.
- [x] Add focused tests and validate.

## Evidence
- Added `AccountMovementOut`/`AccountMovementList`, movement labels, `listAccountMovementsApi`, and `useAccountMovements`.
- Replaced the account detail Operaciones placeholder with a responsive ledger panel including loading, empty, error, signed amount, balance transition, newest-first ordering, and localized timestamps.
- Added focused tests for movement API labels plus account detail rendered rows, empty, and loading states.
- Focused Vitest: 11 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
