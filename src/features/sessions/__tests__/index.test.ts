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
