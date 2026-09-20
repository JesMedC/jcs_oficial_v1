// Display formatting helpers.
//
// Pure functions — no React, no DOM, fully testable. Time formatting
// follows the convention "HH:MM:SS" in the user's local timezone
// (browser default) which is what a trader staring at the panel expects.

/**
 * Format an ISO-8601 timestamp as ``HH:MM:SS`` in the browser's local
 * timezone. Returns ``"--:--:--"`` on parse failure so the UI never
 * crashes on malformed data.
 */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "--:--:--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Format a forex price to the standard 5-decimal precision. Accepts
 * an explicit decimals argument for assets that trade differently.
 */
export function formatPrice(
  value: number | null | undefined,
  decimals: number = 5,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return value.toFixed(decimals);
}

/**
 * Format a percentage with a sign. ``0.42`` -> ``"+0.42%"``,
 * ``-0.42`` -> ``"-0.42%"``.
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format a 0..100 confidence value as a percentage string.
 */
export function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${Math.round(value)}%`;
}

/**
 * Compute a percentage change from the previous close to the latest
 * close. Returns ``null`` when either input is missing or zero.
 */
export function computeChangePct(
  previous: number | null | undefined,
  current: number | null | undefined,
): number | null {
  if (
    previous === null ||
    previous === undefined ||
    current === null ||
    current === undefined ||
    previous === 0
  ) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}
