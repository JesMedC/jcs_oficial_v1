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

/**
 * TWR-06 / USC — TZ-aware ``(local_day, band)`` bucketer.
 *
 * Frontend mirror of the backend pair
 * (``backend/app/services/session_service.py`` ::
 * ``local_date_for_timestamp`` + ``session_for_timestamp``). Returns
 * a tuple the NewTradeForm pre-flight can compare directly with the
 * bucket rows the backend returns, so the frontend pill and the
 * wire verdict agree byte-for-byte on which ``(local_day, band)`` a
 * trade belongs to.
 *
 * Why we can't reuse ``sessionForTimestamp``: that helper resolves
 * the band from the UTC hour (it predates the TZ-aware admission
 * gate and is still used by the TradeTableRow session badge, where
 * the backend serializes ``opened_at`` with an explicit "Z" suffix
 * and the absolute UTC hour is the right unit). The session gate,
 * by contrast, must bucket by the USER's local day + local hour so
 * a CLOSED_LOSS in a different local day does not wrongly lock the
 * form (the UTC-only mirror triggered a false positive when a LOSS
 * happened to share the UTC band with "now" but lived on a
 * different local day).
 *
 * Behaviour:
 *   - ``day`` is the ISO ``YYYY-MM-DD`` of the timestamp after
 *     conversion to ``tz`` (NOT the UTC date — that's the whole
 *     point).
 *   - ``band`` follows the same four-window table as
 *     ``sessionForTimestamp`` but on the LOCAL hour.
 *   - Returns ``null`` for garbage ISO strings OR for invalid IANA
 *     timezone names (``Intl.DateTimeFormat`` throws
 *     ``RangeError`` for unknown zones — we catch and return null
 *     so callers don't need a try/catch).
 *
 * @param iso - UTC ISO 8601 timestamp (the wire shape for
 *   ``Trade.opened_at``).
 * @param tz - IANA timezone name (e.g. ``"America/Santiago"``,
 *   ``"UTC"``). Caller should fall back to ``"UTC"`` when the
 *   user profile has no timezone set.
 */
export function localBucketForTimestamp(
  iso: string,
  tz: string,
): { day: string; band: SessionBand } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  // Single ``Intl.DateTimeFormat`` call to keep the conversion
  // atomic — splitting day + hour into two formatters risks drift
  // if a DST boundary lands between the two calls. ``en-CA``
  // formats the date as ``YYYY-MM-DD`` so we can read the day
  // verbatim. ``hour12: false`` + ``hourCycle: 'h23'`` forces a
  // 0–23 range across all engines (some legacy locales render
  // midnight as "24"; the hourCycle flag kills that).
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    }).formatToParts(d);
  } catch {
    // RangeError for unknown IANA names — translate to the canonical
    // null return so callers don't need their own try/catch.
    return null;
  }

  let year: string | null = null;
  let month: string | null = null;
  let dayPart: string | null = null;
  let hour: number | null = null;
  for (const part of parts) {
    if (part.type === 'year') year = part.value;
    else if (part.type === 'month') month = part.value;
    else if (part.type === 'day') dayPart = part.value;
    else if (part.type === 'hour') {
      const h = Number(part.value);
      // Normalize midnight (some engines return "24" instead of "00"
      // without hourCycle; defensive modulo for any leftover).
      hour = ((h % 24) + 24) % 24;
    }
  }
  if (
    year === null ||
    month === null ||
    dayPart === null ||
    hour === null ||
    !Number.isFinite(hour)
  ) {
    return null;
  }
  const day = `${year}-${month}-${dayPart}`;

  let band: SessionBand;
  if (hour < 7) band = 'ASIA';
  else if (hour < 12) band = 'LONDON';
  else if (hour < 17) band = 'NEW_YORK';
  else band = 'SYDNEY';

  return { day, band };
}
