/*
 * FASE 4A — trade display formatters.
 *
 * Pure helpers used by the trades table + detail views. Numbers come
 * from the backend as JSON strings (Decimal precision), so every
 * helper accepts `string | number | null | undefined` and coerces
 * lazily — never throw on a missing column.
 *
 * Locale is locked to ``es-AR`` (comma decimal separator, dot
 * thousands) because every currency or ratio in the trade log is
 * surfaced to an es-AR audience; mixing locales mid-table would make
 * the dense grid unreadable.
 *
 * Colors map to existing design tokens — no hex literals leak into
 * the component layer so theming stays centralised in
 * ``tailwind.config.ts``.
 */

/**
 * es-AR currency formatter. USD is the only currency the platform
 * tracks; if a future market needs another one, swap the literal
 * here and add a second formatter rather than threading options.
 */
const moneyFmt = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

/**
 * Percent formatter for ratios in ``[0, 1]`` (win rate, risk %).
 * Two fraction digits keeps ``50,0%`` vs ``50,00%`` consistent so the
 * table doesn't wobble horizontally when one trade hits exactly
 * half.
 */
const pctFmt = new Intl.NumberFormat('es-AR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

/**
 * Generic number formatter for prices, lots and r-multiples. Two to
 * four fraction digits covers both FX (1,0850) and binary lots
 * (0,0010) without forcing the user to read trailing zeros.
 */
const numberFmt = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/**
 * Format a money value with an explicit ``+`` / ``-`` sign so the
 * dense table stays scannable. Negative numbers print the absolute
 * value with a manual ``-`` prefix because Intl only emits the sign
 * for the accounting style — and es-AR's accounting style wraps the
 * value in parens, which would break column alignment.
 *
 * Returns ``—`` for null/undefined/NaN so the row stays dense
 * instead of collapsing the column on missing data.
 */
export function formatMoney(
  value: string | number | null | undefined,
  opts?: { signed?: boolean },
): string {
  if (value === null || value === undefined) return '—';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(n)) return '—';
  const formatted = moneyFmt.format(Math.abs(n));
  if (opts?.signed === false) return formatted;
  if (n > 0) return `+${formatted}`;
  if (n < 0) return `-${formatted}`;
  return formatted;
}

/**
 * Format a ratio in ``[0, 1]`` as a localised percent string. Use
 * this for win-rate, risk %, exposure %, never for already-scaled
 * percentages (e.g. payout_pct is already 0-100 — convert first).
 */
export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return pctFmt.format(value);
}

/**
 * Format a generic number (prices, lots, r-multiples). Accepts
 * string-numerics because the backend serialises Decimals as JSON
 * strings to keep precision — parsing here is the only place the
 * conversion happens in the UI layer.
 */
export function formatNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(n)) return '—';
  return numberFmt.format(n);
}

/**
 * Resolve a P&L value to the Tailwind text-color token that should
 * paint it. The return type is the literal union so consumers can't
 * drift into arbitrary palette classes — the badge row above
 * guarantees the three values are the only sanctioned options.
 */
export function pnlColor(
  value: string | number | null | undefined,
): 'text-profit' | 'text-loss' | 'text-text-secondary' {
  if (value === null || value === undefined) return 'text-text-secondary';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(n)) return 'text-text-secondary';
  if (n > 0) return 'text-profit';
  if (n < 0) return 'text-loss';
  return 'text-text-secondary';
}
