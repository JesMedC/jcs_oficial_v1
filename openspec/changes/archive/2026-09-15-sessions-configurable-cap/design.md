# Design: sessions-configurable-cap — Real session names + per-workspace ops cap

## 1. Goals & Non-Goals

**Goals**

1. Rename bands `ASIA | EUROPA | NY_AMERICA | NY_PM` → `ASIA | LONDON | NEW_YORK | SYDNEY` on backend (`Band`) and frontend (one shared module). UTC windows stay `[0,7) [7,12) [12,17) [17,24)`.
2. Replace the universal hardcoded `4 ops/session/local-day` cap with a per-workspace `session_ops_cap` (1..plan_ceiling, NULL = ceiling). Ceilings: `STARTER=4`, `PRO=6`, `ELITE=10` (`PRO` covers the pricing-page "PLUS" tier — no new enum value).
3. Expose the setting via `PATCH /api/v1/workspaces/{id}/discipline` and a `Disciplina` tab on `ConfiguracionPage`.
4. Single source of truth: `_PLAN_CEILING_BY_TIER` shared by migration backfill, engine, and PATCH.

**Non-Goals**: daily P&L, broker $404, capital-inicial 0.25% caps (unchanged); per-account overrides; historical backfill; legacy env flag deferred per proposal.

## 2. Architecture Overview

```
┌──────────────────────┐         ┌────────────────────────────────────┐
│ ConfiguracionPage    │         │ backend/app/services/              │
│   DisciplinaTab      │  PATCH  │   discipline_engine.py             │
│   (TanStack Query    │ ──────► │     _workspace_session_cap() ───┐  │
│    useUpdateSessionCap)        │            │                   │  │
└──────────┬───────────┘         │            ▼                   │  │
           │ invalidate          │   ┌─────────────────────┐      │  │
           │ ['workspace', wsId, │   │ workspaces row      │      │  │
           │  'discipline']      │   │  .session_ops_cap ──┼──┐   │  │
           ▼                      │   └─────────────────────┘  │   │  │
┌──────────────────────┐         │   ┌─────────────────────┐  │   │  │
│  sessions/index.ts   │  read   │   │ _PLAN_CEILING_BY_   │  │   │  │
│  SESSION_LABELS      │ ◄────── │   │ TIER (single dict)  │◄─┘   │  │
│  SESSION_ORDER       │         │   └─────────────────────┘      │  │
│  SessionBand type    │         └────────────────────────────────┘  │
└──────────────────────┘                                               │
           ▲                                                           │
           │ session label from wire JSON                             │
           │                                                           │
┌──────────────────────┐  validates ┌──────────────────────────────┐  │
│ WinrateBySessionCard │            │ PATCH /api/v1/workspaces/     │  │
│ TradeTableRow        │            │   me/discipline               │  │
│ (consume new labels) │            │  → 200 / 422 DISCIPLINE_CAP_  │  │
└──────────────────────┘            │    OUT_OF_RANGE               │  │
                                    └──────────────────────────────┘  │
```

## 3. Backend Design

### 3.1 `_PLAN_CEILING_BY_TIER` — `backend/app/services/discipline_engine.py`

Single source of truth. Migration (`0013`) imports it for backfill; PATCH imports it for validation. Adding a tier is one dict edit.

```python
_PLAN_CEILING_BY_TIER: dict[WorkspacePlanTier, int] = {
    WorkspacePlanTier.STARTER: 4,
    WorkspacePlanTier.PRO: 6,
    WorkspacePlanTier.ELITE: 10,
}
_PLAN_CEILING_FALLBACK = 4  # NONE / unknown

def _workspace_session_cap(workspace: Workspace) -> int:
    return workspace.session_ops_cap or plan_ceiling_for(workspace.plan_tier)
```

### 3.2 `Band` rename — `backend/app/services/session_service.py`

Atomically replace the literal union and `_UTC_WINDOWS` tuple entries. Function names stay (internal API). `trade_service.py:1319 _SESSION_BANDS` and the `buckets: dict[Band, ...]` builder rename in the same commit. Wire JSON keys flip atomically.

```python
Band = Literal["ASIA", "LONDON", "NEW_YORK", "SYDNEY"]
_UTC_WINDOWS: tuple[tuple[Band, int, int], ...] = (
    ("ASIA", 0, 7), ("LONDON", 7, 12),
    ("NEW_YORK", 12, 17), ("SYDNEY", 17, 24),
)
```

### 3.3 `Workspace` model — `backend/app/models/workspace.py`

Add nullable `SMALLINT` column. No default; backfill happens in the migration so SQLAlchemy stays out of the backfill business.

```python
session_ops_cap: Mapped[int | None] = mapped_column(
    SmallInteger, nullable=True
)
```

### 3.4 Migration `backend/alembic/versions/0013_workspace_session_ops_cap.py`

`down_revision = "0012_add_fund_withdraw"`. Two operations: `add_column` (nullable, no default, no CHECK — see §7) + `op.execute("UPDATE workspaces SET session_ops_cap = ...")` per tier using the constant. `downgrade` drops the column. The migration `import`s `_PLAN_CEILING_BY_TIER` from `app.services.discipline_engine` — single dict keeps backfill and runtime in lockstep.

### 3.5 PATCH endpoint — `backend/app/api/v1/workspaces.py` (new file)

Registered in `app/api/v1/__init__.py`. Path `/workspaces/{workspace_id}/discipline` (resource-scoped — workspaces are first-class, mirrors `workspace_service.py` patterns).

```python
@router.patch("/{workspace_id}/discipline", response_model=WorkspaceDisciplineOut)
async def patch_discipline(workspace_id, payload, user: CurrentUser, db: DbSession):
    role = await get_user_workspace_role(db, user.id, workspace_id)
    if role is None: raise HTTPException(403, _env(WORKSPACE_ACCESS_DENIED, ...))
    ws = await db.scalar(select(Workspace).where(Workspace.id == workspace_id))
    ceiling = plan_ceiling_for(ws.plan_tier)
    if not (1 <= payload.session_ops_cap <= ceiling):
        raise HTTPException(422, _env(DISCIPLINE_CAP_OUT_OF_RANGE,
            f"session_ops_cap {payload.session_ops_cap} fuera de rango; techo {ceiling}"))
    ws.session_ops_cap = payload.session_ops_cap
    await db.commit()
    return WorkspaceDisciplineOut(ws.id, ws.plan_tier, ws.session_ops_cap, ceiling)
```

### 3.6 Engine update — `backend/app/services/discipline_engine.py`

`_plan_caps` returns only `daily_pct`. Rule 6 reads `_workspace_session_cap(account.workspace)`. Rules 3–5 unchanged. `_SESSION_OPS_CAP_FALLBACK` stays for the workspace-not-resolved race window.

### 3.7 `ErrorCode` — `backend/app/schemas/envelope.py`

Append `DISCIPLINE_CAP_OUT_OF_RANGE = "DISCIPLINE_CAP_OUT_OF_RANGE"` after `SESSION_CAP_EXCEEDED`. Frontend mirrors in `features/auth/types.ts` `ErrorCodeValues`.

## 4. Frontend Design

### 4.1 New shared module `src/features/sessions/index.ts`

Single 4-band label/order/type module. Backend keeps the bucketing — frontend just renders.

```ts
export type SessionBand = 'ASIA' | 'LONDON' | 'NEW_YORK' | 'SYDNEY';
export const SESSION_ORDER: readonly SessionBand[] =
  ['ASIA', 'LONDON', 'NEW_YORK', 'SYDNEY'];
export const SESSION_LABELS: Record<SessionBand, string> = {
  ASIA: 'Asia',
  LONDON: 'Londres',
  NEW_YORK: 'Nueva York',
  SYDNEY: 'Sídney',
};
```

### 4.2 Deletions + consumer migration

- **Delete** `src/features/trades/sessions.ts` + its test. Three-band classifier (`NYSE | LONDRES | SIDNEY`) collapses; `getTradeSession()` is removed (the API now returns the session).
- **`TradeTableRow.tsx`**: replace `getTradeSession` with `trade.session` (from wire JSON). Pill colors map 1:1 to the new labels (Asia→jade, London→info, New York→profit, Sídney→warning).
- **`WinrateBySessionCard.tsx`**: import `SessionBand`/`SESSION_LABELS`/`SESSION_ORDER` from `@/features/sessions`; drop the local `SESSION_LABEL` map.
- **`dashboard/hooks.ts`**: `SessionBand` becomes `import type { SessionBand } from '@/features/sessions'`.
- **`WinrateBySessionCard.test.tsx`** + **`useSessionStats.test.tsx`**: update mock fixtures (`NY_AMERICA` → `NEW_YORK`, etc.).

### 4.3 `DisciplinaTab` — `src/pages/portal/ConfiguracionPage.tsx`

New component, 4th tab between "Activos" and "Preferencias". Reads workspace via `useAuth().workspaces[0]`; renders ceiling + numeric input `[1..ceiling]` + Save. `useUpdateSessionCap` mutation PATCHes; on success invalidates `['workspace', id, 'discipline']` + dashboard session-stats keys.

```tsx
function DisciplinaTab() {
  const ws = useAuth().workspaces[0];
  const ceiling = PLAN_CEILING[ws.plan_tier];
  const [value, setValue] = useState<number>(ws.session_ops_cap ?? ceiling);
  const mutation = useUpdateSessionCap();
  return (
    <div data-testid="tab-disciplina">
      <div>Plan actual: {ws.plan_tier} — techo {ceiling} ops/sesión/día</div>
      <input type="number" min={1} max={ceiling} value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        data-testid="disciplina-cap-input" />
      <button onClick={() => mutation.mutate({ workspaceId: ws.id, value })}
        disabled={mutation.isPending}
        data-testid="disciplina-save">Guardar</button>
      {mutation.error?.code === 'DISCIPLINE_CAP_OUT_OF_RANGE' &&
        <p className="text-loss">Valor fuera de rango (techo {ceiling}).</p>}
    </div>
  );
}
```

### 4.4 `PlanCeiling` map — `src/features/sessions/plan.ts` (new, tiny)

Mirrors `_PLAN_CEILING_BY_TIER` for the input's `max`. Same single-source discipline: a tier change is one edit per side.

## 5. Data Model

| Column | Type | Nullable | Default | Backfill |
|---|---|---|---|---|
| `workspaces.session_ops_cap` | `SMALLINT` | YES | NULL | STARTER→4, PRO→6, ELITE→10, NONE→NULL (uses fallback) |

No DB-level CHECK (see §7). NULL means "use ceiling" — `validate_open_trade` short-circuits to `plan_ceiling_for(workspace.plan_tier)`. Migration runs one `UPDATE` per tier in a single transaction.

## 6. API Contract

**Request** — `PATCH /api/v1/workspaces/{workspace_id}/discipline`:

```json
{ "session_ops_cap": 5 }
```

**200 Response**:

```json
{ "workspace_id": "uuid", "plan_tier": "PRO",
  "session_ops_cap": 5, "ceiling": 6 }
```

**422 `DISCIPLINE_CAP_OUT_OF_RANGE`**:

```json
{ "code": "DISCIPLINE_CAP_OUT_OF_RANGE",
  "message": "session_ops_cap 7 fuera de rango; techo 6",
  "correlation_id": "<uuid4>",
  "details": { "field": "session_ops_cap", "min": 1, "max": 6, "submitted": 7 } }
```

403 `WORKSPACE_ACCESS_DENIED` if caller is not a member.

## 7. Migration Plan — `0013_workspace_session_ops_cap.py`

```python
revision = "0013_workspace_session_ops_cap"
down_revision = "0012_add_fund_withdraw"

def upgrade():
    op.add_column("workspaces", sa.Column("session_ops_cap", sa.SmallInteger(), nullable=True))
    for tier, cap in _PLAN_CEILING_BY_TIER.items():
        op.execute(f"UPDATE workspaces SET session_ops_cap = {cap} WHERE plan_tier = '{tier.value}'")

def downgrade():
    op.drop_column("workspaces", "session_ops_cap")
```

**No DB-level CHECK.** The cap is plan-tier-aware; the DB can't express `value <= plan_ceiling` without a trigger. A flat `BETWEEN 1 AND 10` would reject `ELITE=10`. App enforces `1 <= value <= plan_ceiling`.

## 8. Test Strategy (TDD, RED → GREEN → REFACTOR)

| # | Test file | RED expectation | GREEN fix |
|---|---|---|---|
| 1 | `test_session_service.py` | `LONDON/NEW_YORK/SYDNEY` assertions fail | Rename `Band` |
| 2 | `test_discipline_engine.py` | `session_ops_cap=5` overrides tier ceiling (6th op raises) | Add `_workspace_session_cap`; drop session cap from `_plan_caps` |
| 3 | `test_workspace_discipline.py` (new) | PATCH above ceiling → 422 `DISCIPLINE_CAP_OUT_OF_RANGE` | New endpoint + ErrorCode |
| 4 | `test_session_stats_endpoint.py` | Session JSON keys are new names | Rename `_SESSION_BANDS` in `trade_service.py:1319` |
| 5 | `features/sessions/__tests__/index.test.ts` (new) | `SESSION_LABELS` has all four; no `NYSE/LONDRES` | New shared module |
| 6 | `useSessionStats.test.tsx` | Mock returns new names; render OK | Update fixtures |
| 7 | `WinrateBySessionCard.test.tsx` | Renders `Nueva York` tile label | Update component + fixture |
| 8 | `TradeTableRow.test.tsx` | Trade with `session='NEW_YORK'` renders pill | Drop `getTradeSession`, use wire field |
| 9 | `DisciplinaTab.test.tsx` (new) | Lowering cap → 200; saving 7 on PRO → 422 pill | New mutation + tab |
| 10 | DELETE `src/features/trades/__tests__/sessions.test.ts` | (last — consumer migration is upstream) | rm |

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Legacy `EUROPA / NY_AMERICA / NY_PM` literals hide in caches | CI grep `git grep -nE "EUROPA\|NY_AMERICA\|NY_PM" backend/app/ src/` returns 0 (already in proposal §success criteria) |
| `_PLAN_CEILING_BY_TIER` drifts between migration / engine / API | All three import from `app.services.discipline_engine`; backend test pins dict equality |
| PRO workspaces lose 6-op headroom if migration backfill is missed | Migration ships in the same commit as the engine change; test seeds a PRO workspace pre-migration and asserts post-migration value |
| `TradeTableRow` consumers still expect `getTradeSession` | TS compile error (`getTradeSession` removed) catches it — `pnpm typecheck` gate |
| Badge color regression on SYDNEY rename | Preserve amber `bg-warning` token; visual diff in `WinrateBySessionCard` snapshot |

## 10. Rollback Plan

1. **DB**: `alembic downgrade -1` drops `session_ops_cap`. Engine reads `None` → falls back to `_PLAN_CEILING_BY_TIER` (no data loss).
2. **Code**: revert `Band` rename + `_SESSION_BANDS` rename + `WinrateBySessionCard` labels + `DisciplinaTab` removal. Single `git revert` of the merge commit.
3. **Frontend**: `git checkout HEAD~1 -- src/features/trades/sessions.ts src/features/trades/__tests__/sessions.test.ts`. Consumers re-import from history.
4. **State**: `ErrorCode.DISCIPLINE_CAP_OUT_OF_RANGE` removal is non-breaking (frontend gates on `code === ...`).

Total LOC: ~210 backend + ~180 frontend. No new dependencies.
