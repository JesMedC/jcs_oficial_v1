/*
 * one-by-one-thousand-discipline (PR-2) — client-side discipline math.
 *
 * Mirrors the backend helpers in
 * ``backend/app/services/discipline.py`` + ``discipline_engine.py``
 * so the form can show the calculated investment amount and HARD-block
 * the submit button when the user types a value the server will
 * certainly reject (predictive validation — REQ-DISC-004 / 005).
 *
 * The server is always the source of truth: these helpers are a UX
 * shortcut, not a security boundary. When the backend caps change
 * the constants here must change too — keep them in sync.
 *
 * Kept in `discipline.ts` (not `money.ts`) because the helpers are
 * specific to the 1×1000 discipline engine, not general money math.
 */

/**
 * Broker ceiling for a single BINARY trade (REQ-DISC-002).
 * Exported so other modules (settings page, future risk dashboard)
 * can read the canonical cap without re-declaring the constant.
 */
export const BROKER_CAP_USD = 404;

/** Floor for the calculated investment — never returns below $1. */
const FLOOR_USD = 1;

/**
 * Three-tier cap rules for BINARY investment (PR-4):
 *
 *   balance <  $400                       → $1 (fixed; first tier floor)
 *   $400 ≤ balance ≤ $1000               → ceil(balance × 0.0025)
 *   balance >  $1000                     → ceil(balance × 0.001)
 *
 * The middle tier is the original "1×1000" rule (0.25% with
 * round-up). The high-balance tier is intentionally tighter
 * (0.10%) so users with larger accounts don't accidentally over-
 * trade. Both are bounded by `BROKER_CAP_USD` and `FLOOR_USD`.
 */
const TIER_LOW_BALANCE_MAX_USD = 400;
const TIER_MID_BALANCE_MAX_USD = 1000;
const TIER_MID_PCT = 0.0025;
const TIER_HIGH_PCT = 0.001;

/**
 * Minimum valid balance for the calculator. Anything below this
 * returns `null` so the form can hide the calculated display
 * rather than showing a misleading "$1" against a $0.50 balance.
 */
const MIN_BALANCE_FOR_CALC = 1;

/**
 * Mirror of backend ``ceil_to_next_dollar`` (REQ-DISC-004). Rounds
 * a positive number up to the next whole USD. Anything ≤ 0 returns
 * 0 (engine treats it as "no trade").
 *
 * Whole-dollar inputs return themselves; ``1.01`` snaps to ``2``.
 */
export function ceilToNextDollar(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value);
}

/**
 * Compute the canonical BINARY investment for an account balance.
 * Mirrors the backend engine's three-tier rule:
 *
 *   balance <  $400   → $1
 *   $400 ≤ balance ≤ $1000  → ceil(balance × 0.0025)
 *   balance >  $1000      → ceil(balance × 0.001)
 *
 * The result is capped at `BROKER_CAP_USD` ($404) and floored at
 * `FLOOR_USD` ($1) regardless of the tier's raw output.
 *
 * Returns ``null`` when the balance is non-finite or below $1 so
 * the form can render a placeholder ("—") instead of a misleading
 * number. The form also disables submit in that case.
 */
export function montoCalculadoParaBalance(balanceUsd: number): number | null {
  if (!Number.isFinite(balanceUsd) || balanceUsd < MIN_BALANCE_FOR_CALC) {
    return null;
  }
  let raw: number;
  if (balanceUsd < TIER_LOW_BALANCE_MAX_USD) {
    // First tier: floor. Below $400 we always allow the minimum
    // ($1) regardless of the strict 0.25% math — keeps small
    // accounts tradeable.
    raw = FLOOR_USD;
  } else if (balanceUsd <= TIER_MID_BALANCE_MAX_USD) {
    // Middle tier: 0.25% round-up. Includes the $400 boundary
    // (ceil(400 × 0.0025) = ceil(1.0) = 1, which equals the floor).
    raw = Math.ceil(balanceUsd * TIER_MID_PCT);
  } else {
    // High tier: 0.10% round-up (stricter for large accounts).
    raw = Math.ceil(balanceUsd * TIER_HIGH_PCT);
  }
  return Math.min(BROKER_CAP_USD, Math.max(FLOOR_USD, raw));
}

/**
 * Predictive hard-block: returns ``true`` when the proposed
 * ``importe`` is GUARANTEED to fail the broker cap or the
 * capital-inicial 0.25% cap, regardless of any daily / session /
 * per-trade history. Mirrors backend rules 3 + 4 in
 * ``discipline_engine.validate_open_trade``.
 *
 * Returns ``false`` when the engine might still accept (no
 * predictive verdict). The form then lets the submit through and
 * lets the server return the actual error code — surfaced as a
 * soft-block pill (REQ-DISC-005/006).
 *
 * NOTE (PR-4): for BINARY trades the investment is computed by
 * ``montoCalculadoParaBalance`` (read-only), so this gate is
 * effectively a no-op there — the calculated value always lands
 * inside the discipline envelope. The gate still applies to FOREX
 * positions where ``deduct = lot × entry × 100`` can exceed the
 * 0.25% ceiling.
 */
export function isHardBlockedByDiscipline(
  deductUsd: number,
  capitalInicialUsd: number,
  _type?: unknown,
): boolean {
  if (!Number.isFinite(deductUsd) || deductUsd <= 0) return false;
  // Rule 3 — broker cap (404 USD).
  if (deductUsd > BROKER_CAP_USD) return true;
  // Rule 4 — 0.25% capital-inicial cap. Applies at ALL balance
  // levels >= $1 (the previous $1000 gate was removed — the rule
  // now scales linearly from the very first dollar).
  if (capitalInicialUsd >= MIN_BALANCE_FOR_CALC) {
    const ceiling = ceilToNextDollar(capitalInicialUsd * TIER_MID_PCT);
    if (ceilToNextDollar(deductUsd) > ceiling) return true;
  }
  return false;
}

/**
 * Discipline error codes the backend emits (REQ-DISC-005..008 +
 * REQ-INT-005). Frontend maps them to localized messages on the
 * soft-block pill in NewTradeForm. Keep in sync with
 * backend/app/schemas/envelope.py ErrorCode additions.
 */
export const DISCIPLINE_ERROR_CODES = {
  BROKER_CAP_EXCEEDED: 'BROKER_CAP_EXCEEDED',
  CAPITAL_INICIAL_CAP_EXCEEDED: 'CAPITAL_INICIAL_CAP_EXCEEDED',
  DAILY_CAP_EXCEEDED: 'DAILY_CAP_EXCEEDED',
  SESSION_CAP_EXCEEDED: 'SESSION_CAP_EXCEEDED',
  INTEREST_INVALID: 'INTEREST_INVALID',
  PAYOUT_OUT_OF_RANGE: 'PAYOUT_OUT_OF_RANGE',
  // Client-side evaluator can flag the form when a session already
  // contains a LOSS; this code is purely UX — the server still
  // enforces the underlying discipline rules.
  LOSS_IN_SESSION: 'LOSS_IN_SESSION',
  // REQ-DSC-005: PATCH /workspaces/{id}/discipline rejected because
  // the submitted value is outside ``[1, plan_ceiling]``. Added by
  // sessions-configurable-cap Slice A; mirrored here for the
  // Disciplina tab's error pill (Slice B T-016).
  DISCIPLINE_CAP_OUT_OF_RANGE: 'DISCIPLINE_CAP_OUT_OF_RANGE',
} as const;

export type DisciplineErrorCode =
  (typeof DISCIPLINE_ERROR_CODES)[keyof typeof DISCIPLINE_ERROR_CODES];

/**
 * Localized messages for the discipline error pill. Per #68 the
 * fallback is Spanish; codes are shown alongside for support
 * correlation. Keep these short — the pill is a single line.
 */
export const DISCIPLINE_ERROR_MESSAGE: Record<DisciplineErrorCode, string> = {
  BROKER_CAP_EXCEEDED: 'Importe excede el techo del broker (US$404).',
  CAPITAL_INICIAL_CAP_EXCEEDED: 'Importe excede el 0.25% del capital inicial.',
  DAILY_CAP_EXCEEDED: 'Excediste el 0.10% diario del capital inicial.',
  SESSION_CAP_EXCEEDED: 'Ya tenés 4 operaciones en esta sesión.',
  INTEREST_INVALID: 'Interés inválido.',
  PAYOUT_OUT_OF_RANGE: 'Payout fuera de rango (70..99).',
  LOSS_IN_SESSION:
    'La sesión ya tiene una LOSS; esperá a que cierre como WIN.',
  // Slice B T-019: message for the DisciplinaTab out-of-range pill.
  // The backend also includes the ceiling in the envelope message
  // (``session_ops_cap X fuera de rango; techo Y``); we render the
  // localized line so non-error-state copy stays consistent.
  DISCIPLINE_CAP_OUT_OF_RANGE:
    'El tope de operaciones por sesión excede el máximo de tu plan.',
};

/**
 * Stub of ``evaluateBinarySession`` — the canonical implementation lived
 * in this file pre-scanner-merge and was lost. The form's preview still
 * expects an object with ``ok``, ``reason``, ``stats`` (wins/losses/pnlUsd)
 * and ``cap`` keys, so we keep a minimal client-side stub that returns a
 * neutral verdict. The server is the source of truth (see module-level
 * docstring) — every gate still runs in the backend trade-open endpoint.
 *
 * TODO: port the canonical evaluator from
 * ``backend/app/services/discipline_engine.py`` and delete this stub.
 */
export interface BinarySessionTradeSummary {
  wins: number;
  losses: number;
  pnlUsd: number;
}

export interface BinarySessionResult {
  ok: boolean;
  reason?: DisciplineErrorCode;
  stats: BinarySessionTradeSummary;
  cap: number;
}

export function evaluateBinarySession(
  bucket: ReadonlyArray<{ result?: string | null; pnl_usd?: string | number | null }>,
  cap: number,
): BinarySessionResult {
  // Stub: never hard-block on the client; the backend enforces the cap.
  let wins = 0;
  let losses = 0;
  let pnlUsd = 0;
  for (const t of bucket) {
    if (t.result === 'WIN') wins += 1;
    else if (t.result === 'LOSS') losses += 1;
    pnlUsd += Number(t.pnl_usd ?? 0);
  }
  return {
    ok: true,
    stats: { wins, losses, pnlUsd },
    cap,
  };
}
