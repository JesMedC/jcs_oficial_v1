/*
 * one-by-one-thousand-discipline (PR-2) — client-side discipline math.
 *
 * Mirrors the backend helpers in
 * ``backend/app/services/discipline.py`` + ``discipline_engine.py``
 * so the form can show a "Sugerido: $X" preview and HARD-block the
 * submit button when the user types a value the server will
 * certainly reject (predictive validation — REQ-DISC-004 / 005).
 *
 * The server is always the source of truth: these helpers are a UX
 * shortcut, not a security boundary. When the backend caps change
 * the constants here must change too — keep them in sync.
 *
 * Kept in `discipline.ts` (not `money.ts`) because the helpers are
 * specific to the 1×1000 discipline engine, not general money math.
 */

const BROKER_CAP_USD = 404;
const CAPITAL_INICIAL_PCT = 0.0025;
const MIN_BALANCE_FOR_DISCIPLINE = 1000;

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
 * Preview the suggested ``importe`` for the round-up badge
 * (REQ-DISC-002/003). Mirrors the backend engine's
 * ``ceil_to_next_dollar(capital_inicial * 0.0025)``.
 *
 * Below the discipline threshold ($1000 capital-inicial proxy) the
 * engine defers to the legacy balance gate, so the suggestion is
 * ``null`` — we don't preview a number that the backend would not
 * enforce anyway.
 */
export function suggestedImporteUsd(capitalInicialUsd: number): number | null {
  if (!Number.isFinite(capitalInicialUsd) || capitalInicialUsd < MIN_BALANCE_FOR_DISCIPLINE) {
    return null;
  }
  return ceilToNextDollar(capitalInicialUsd * CAPITAL_INICIAL_PCT);
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
 */
export function isHardBlockedByDiscipline(
  deductUsd: number,
  capitalInicialUsd: number,
): boolean {
  if (!Number.isFinite(deductUsd) || deductUsd <= 0) return false;
  // Rule 3 — broker cap (404 USD).
  if (deductUsd > BROKER_CAP_USD) return true;
  // Rule 4 — 0.25% capital-inicial cap (only enforced above the
  // threshold; below it the legacy balance gate owns the rejection
  // and there's no "definitely blocked" verdict to show).
  if (capitalInicialUsd >= MIN_BALANCE_FOR_DISCIPLINE) {
    const ceiling = ceilToNextDollar(capitalInicialUsd * CAPITAL_INICIAL_PCT);
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
  INTEREST_REQUIRED: 'INTEREST_REQUIRED',
  INTEREST_INVALID: 'INTEREST_INVALID',
  PAYOUT_OUT_OF_RANGE: 'PAYOUT_OUT_OF_RANGE',
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
  INTEREST_REQUIRED: 'Elegí el interés (FOMO, Plan, Venganza o Impulso).',
  INTEREST_INVALID: 'Interés inválido.',
  PAYOUT_OUT_OF_RANGE: 'Payout fuera de rango (70..99).',
};