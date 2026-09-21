/*
 * sessions-configurable-cap (Slice B, T-012 + T-014) — shared sessions module.
 *
 * Single 4-band label/order/type module for the frontend
 * (REQ-SES-006). Backend keeps the bucketing
 * (``backend/app/services/session_service.py`` -> ``Band``) and
 * returns the band name on each trade; the frontend just renders
 * Spanish labels + ordered tiles.
 *
 * Why one module (not per-consumer maps): the previous layout had
 * two classifier files
 * (``features/dashboard/hooks.ts`` + ``features/trades/sessions.ts``)
 * with overlapping literal sets that drifted (legacy EUROPA /
 * NY_AMERICA / NY_PM vs. real LONDON / NEW_YORK / SYDNEY). Slice B
 * collapses them: consumers import the type, label map, order, AND
 * the UTC-hour classifier from here; renaming a band is one edit.
 *
 * The ``PLAN_CEILING`` map is intentionally not exported from this
 * file — it lives in ``src/features/sessions/plan.ts`` so the
 * single-responsibility surface here is "display labels". The PATCH
 * mutation (T-017) and the DisciplinaTab (T-016) import PLAN_CEILING
 * from the sibling file.
 */
export type SessionBand = 'ASIA' | 'LONDON' | 'NEW_YORK' | 'SYDNEY';

/**
 * Chronological UTC sequence (00–07 / 07–12 / 12–17 / 17–24). The
 * dashboard card and the day-detail panel iterate this order so the
 * tile columns always start in the same place. Mirrors
 * ``backend/app/services/session_service.py::_UTC_WINDOWS``.
 */
export const SESSION_ORDER: ReadonlyArray<SessionBand> = [
  'ASIA',
  'LONDON',
  'NEW_YORK',
  'SYDNEY',
];

/**
 * Spanish display labels (REQ-SES-005). Keys are exactly the four
 * ``SessionBand`` literals — the type annotation below pins the
 * map so a typo in a value or a missing key fails the build.
 */
export const SESSION_LABELS: Record<SessionBand, string> = {
  ASIA: 'Asia',
  LONDON: 'Londres',
  NEW_YORK: 'Nueva York',
  SYDNEY: 'Sídney',
};

/**
 * Client-side UTC-hour → ``SessionBand`` resolver.
 *
 * Mirrors the backend ``session_for_timestamp`` UTC windows but
 * operates client-side for the operations table session badge
 * (the backend ``TradeOut`` payload doesn't carry a ``session``
 * field — the resolver would need a profile-aware IANA TZ to
 * match the backend, and the badge is purely visual).
 *
 * Returns ``null`` when ``openedAt`` is invalid OR when the hour
 * falls in a gap (the previous classifier returned null for hours
 * outside any window). UI consumers render an em-dash placeholder.
 *
 * Window mapping (UTC, end-exclusive):
 *   ASIA      [00–07)
 *   LONDON    [07–12)
 *   NEW_YORK  [12–17)
 *   SYDNEY    [17–24)
 *
 * ``openedAt`` is treated as UTC; the backend serializes every
 * ``Trade.opened_at`` with an explicit "Z" suffix so
 * ``Date#getUTCHours`` is the correct accessor regardless of the
 * viewer's local timezone.
 */
export function sessionForTimestamp(
  openedAt: string | Date,
): SessionBand | null {
  const d = typeof openedAt === 'string' ? new Date(openedAt) : openedAt;
  if (Number.isNaN(d.getTime())) return null;
  const hour = d.getUTCHours();
  if (hour < 7) return 'ASIA';
  if (hour < 12) return 'LONDON';
  if (hour < 17) return 'NEW_YORK';
  return 'SYDNEY';
}
