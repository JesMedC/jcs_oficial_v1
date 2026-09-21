/*
 * sessions-configurable-cap (Slice B, T-016) — per-plan ceiling map.
 *
 * Mirrors ``backend/app/services/discipline_engine.py::_PLAN_CEILING_BY_TIER``
 * (Slice A). Same single-source-of-truth discipline: a tier change
 * is one edit on each side, and the migration backfill + engine +
 * PATCH validation all import the backend dict while the Disciplina
 * tab imports this frontend dict for its ``max={ceiling}`` input
 * bound.
 *
 * Lives in its own file (vs. ``index.ts``) so the shared sessions
 * module stays a single-responsibility surface of "display labels
 * + the UTC resolver". The mutation hook (T-017) does NOT use this
 * map — the backend ``plan_ceiling_for()`` is the validation source
 * of truth, and the PATCH endpoint already returns ``ceiling`` in
 * the 200 response so the tab can use that as the authoritative
 * value after the first save.
 */
import type { WorkspacePlanTier } from '../auth/types';

/**
 * Maximum operations per `(local_day, band)` for each paid tier.
 * ``PRO`` covers the pricing-page "PLUS" tier — there's no separate
 * ``WorkspacePlanTier.PRO_PLUS`` value; backend groups both pricing
 * surfaces under the same engine ceiling.
 */
export const PLAN_CEILING: Readonly<Record<WorkspacePlanTier, number>> = {
  NONE: 4,
  STARTER: 4,
  PRO: 6,
  ELITE: 10,
};

/**
 * Resolve the per-tier ceiling with a safe fallback for unrecognised
 * tier values (the backend falls back to STARTER's strict ceiling
 * via ``_PLAN_CEILING_FALLBACK``). Keeps the Disciplina tab render
 * pure — it never crashes on a missing tier.
 */
export function ceilingFor(tier: WorkspacePlanTier | string | null | undefined): number {
  if (tier === 'STARTER' || tier === 'PRO' || tier === 'ELITE' || tier === 'NONE') {
    return PLAN_CEILING[tier];
  }
  return PLAN_CEILING.NONE;
}
