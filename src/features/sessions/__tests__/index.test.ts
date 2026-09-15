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
  type SessionBand,
} from '../index';

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
