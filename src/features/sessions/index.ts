/*
 * sessions-configurable-cap (Slice B, T-012) — shared sessions module.
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
 * collapses them: consumers import the type, label map, and order
 * from here; renaming a band is one edit.
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
