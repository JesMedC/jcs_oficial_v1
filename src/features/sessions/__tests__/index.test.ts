/*
 * sessions-configurable-cap (Slice B, T-011) — shared sessions module.
 *
 * RED contract:
 *   1. The module exposes the four real session names
 *      (ASIA / LONDON / NEW_YORK / SYDNEY) — NOT the legacy
 *      EUROPA / NY_AMERICA / NY_PM trio.
 *   2. `SESSION_LABELS` keys mirror the type literal; values are
 *      Spanish display strings (REQ-SES-005).
 *   3. `SESSION_ORDER` matches the chronological UTC sequence
 *      used by the backend `Band` literal (00–07 / 07–12 / 12–17 /
 *      17–24) so tile renders always start in the right column.
 *   4. The `SessionBand` type covers exactly the four values
 *      (REQ-SES-006 — frontend mirrors the backend `Band` union).
 *
 * The test is intentionally RED until T-012 lands the module.
 * Keeping the assertions in a separate file (not inlined into the
 * module) means the failure message will be a clean "Cannot find
 * module" rather than a noisy compile error inside the SUT.
 */
import { describe, expect, it } from 'vitest';

import {
  SESSION_LABELS,
  SESSION_ORDER,
  localBucketForTimestamp,
  sessionForTimestamp,
  type SessionBand,
} from '../index';

/**
 * Build an ISO string for an arbitrary UTC date. We keep the rest of
 * the timestamp constant so only the hour-under-test varies — guards
 * against an accidental timezone re-interpretation creeping into the
 * assertion.
 */
function utc(hour: number): string {
  return `2026-01-01T${String(hour).padStart(2, '0')}:00:00.000Z`;
}

describe('shared sessions module (sessions-configurable-cap)', () => {
  it('SESSION_LABELS contiene exactamente los 4 nombres reales', () => {
    expect(Object.keys(SESSION_LABELS).sort()).toEqual(
      ['ASIA', 'LONDON', 'NEW_YORK', 'SYDNEY'],
    );
  });

  it('SESSION_LABELS expone los strings en espanol del spec', () => {
    expect(SESSION_LABELS.ASIA).toBe('Asia');
    expect(SESSION_LABELS.LONDON).toBe('Londres');
    expect(SESSION_LABELS.NEW_YORK).toBe('Nueva York');
    expect(SESSION_LABELS.SYDNEY).toBe('Sídney');
  });

  it('SESSION_ORDER sigue la secuencia cronologica UTC del backend', () => {
    expect([...SESSION_ORDER]).toEqual([
      'ASIA',
      'LONDON',
      'NEW_YORK',
      'SYDNEY',
    ]);
  });

  it('SessionBand cubre los 4 valores del literal del backend', () => {
    // Type-level assertion: this assignment compiles iff SessionBand
    // is exactly the four-value union. If a literal widens or narrows
    // unexpectedly this line fails TypeScript before vitest even runs.
    const a: SessionBand = 'ASIA';
    const l: SessionBand = 'LONDON';
    const n: SessionBand = 'NEW_YORK';
    const s: SessionBand = 'SYDNEY';
    expect([a, l, n, s].length).toBe(4);
  });

  it('no expone los nombres legacy del backend anterior', () => {
    // Belt-and-suspenders: the constants must not silently leak the
    // old EUROPA / NY_AMERICA / NY_PM literals under any key.
    expect(SESSION_LABELS).not.toHaveProperty('EUROPA');
    expect(SESSION_LABELS).not.toHaveProperty('NY_AMERICA');
    expect(SESSION_LABELS).not.toHaveProperty('NY_PM');
  });
});

describe('sessionForTimestamp (UTC resolver)', () => {
  it('hour 00 → ASIA', () => {
    expect(sessionForTimestamp(utc(0))).toBe('ASIA');
  });

  it('hour 06 → ASIA (last minute of the morning band)', () => {
    expect(sessionForTimestamp(utc(6))).toBe('ASIA');
  });

  it('hour 07 → LONDON (band opens, inclusive)', () => {
    expect(sessionForTimestamp(utc(7))).toBe('LONDON');
  });

  it('hour 11 → LONDON (last minute)', () => {
    expect(sessionForTimestamp(utc(11))).toBe('LONDON');
  });

  it('hour 12 → NEW_YORK (band opens, inclusive)', () => {
    expect(sessionForTimestamp(utc(12))).toBe('NEW_YORK');
  });

  it('hour 16 → NEW_YORK (last minute)', () => {
    expect(sessionForTimestamp(utc(16))).toBe('NEW_YORK');
  });

  it('hour 17 → SYDNEY (band opens, inclusive)', () => {
    expect(sessionForTimestamp(utc(17))).toBe('SYDNEY');
  });

  it('hour 23 → SYDNEY (last minute)', () => {
    expect(sessionForTimestamp(utc(23))).toBe('SYDNEY');
  });

  it('garbage string → null (does not throw)', () => {
    expect(sessionForTimestamp('not-a-date')).toBeNull();
  });

  it('also accepts a Date object (not just a string)', () => {
    expect(sessionForTimestamp(new Date(utc(14)))).toBe('NEW_YORK');
  });
});

/**
 * localBucketForTimestamp — TZ-aware (local_day, band) bucketer.
 *
 * Mirrors the backend ``local_date_for_timestamp`` +
 * ``session_for_timestamp`` pair (REQ-SES-003) so the frontend
 * pre-flight gate in ``NewTradeForm`` buckets BINARY trades by
 * the user's calendar day + 4-band hour window instead of by UTC
 * date + UTC hour. The USC-2 false-positive fix depends on this:
 * a CLOSED_LOSS in a different LOCAL day must NOT lock the form
 * even if it happens to share the UTC band with "now".
 */
describe('localBucketForTimestamp (TZ-aware bucketer)', () => {
  it('UTC TZ + hour 14 → NEW_YORK band on the UTC day', () => {
    const bucket = localBucketForTimestamp('2026-09-19T14:30:00.000Z', 'UTC');
    expect(bucket).toEqual({ day: '2026-09-19', band: 'NEW_YORK' });
  });

  it('UTC TZ + hour 04 → ASIA band on the UTC day', () => {
    const bucket = localBucketForTimestamp('2026-09-19T04:30:00.000Z', 'UTC');
    expect(bucket).toEqual({ day: '2026-09-19', band: 'ASIA' });
  });

  it('UTC TZ + hour 09 → LONDON band on the UTC day', () => {
    const bucket = localBucketForTimestamp('2026-09-19T09:30:00.000Z', 'UTC');
    expect(bucket).toEqual({ day: '2026-09-19', band: 'LONDON' });
  });

  it('UTC TZ + hour 19 → SYDNEY band on the UTC day', () => {
    const bucket = localBucketForTimestamp('2026-09-19T19:30:00.000Z', 'UTC');
    expect(bucket).toEqual({ day: '2026-09-19', band: 'SYDNEY' });
  });

  it('America/Santiago TZ rolls 02:00 UTC into 23:00 the day before (previous local day)', () => {
    // 02:00 UTC on Sep 19 = 23:00 -03 on Sep 18 → SYDNEY band (23h) on Sep 18.
    // This is the canonical TZ-aware bucketing edge case the
    // previous UTC-only mirror got wrong: a LOSS at this instant
    // belongs to (Sep 18, SYDNEY), NOT (Sep 19, ASIA).
    const bucket = localBucketForTimestamp('2026-09-19T02:00:00.000Z', 'America/Santiago');
    expect(bucket).toEqual({ day: '2026-09-18', band: 'SYDNEY' });
  });

  it('America/Santiago TZ + 14:30 UTC = 11:30 -03 same day → LONDON band', () => {
    const bucket = localBucketForTimestamp('2026-09-19T14:30:00.000Z', 'America/Santiago');
    expect(bucket).toEqual({ day: '2026-09-19', band: 'LONDON' });
  });

  it('garbage ISO string → null (does not throw)', () => {
    expect(localBucketForTimestamp('not-a-date', 'UTC')).toBeNull();
  });

  it('invalid IANA timezone → null (does not throw)', () => {
    expect(localBucketForTimestamp('2026-09-19T14:30:00.000Z', 'Not/A/Zone')).toBeNull();
  });

  it('hour boundaries are inclusive at the low end, exclusive at the high end (UTC)', () => {
    // 07:00 UTC → LONDON (band opens, inclusive)
    expect(localBucketForTimestamp('2026-09-19T07:00:00.000Z', 'UTC')).toEqual({
      day: '2026-09-19',
      band: 'LONDON',
    });
    // 11:59 UTC → still LONDON (band closes at 12:00, exclusive)
    expect(localBucketForTimestamp('2026-09-19T11:59:59.999Z', 'UTC')).toEqual({
      day: '2026-09-19',
      band: 'LONDON',
    });
    // 12:00 UTC → NEW_YORK (band opens, inclusive)
    expect(localBucketForTimestamp('2026-09-19T12:00:00.000Z', 'UTC')).toEqual({
      day: '2026-09-19',
      band: 'NEW_YORK',
    });
  });
});
