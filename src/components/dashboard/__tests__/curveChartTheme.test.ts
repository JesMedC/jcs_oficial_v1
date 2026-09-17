/*
 * dashboard-jarvis-fidelity (Slice B, T-044, REQ-DCF-003) —
 * curveChartTheme constants tests.
 *
 * Pins the CSS-var swap:
 *   - perf   → var(--color-jade-profit)
 *   - balance → var(--color-jade-info)
 *   - border → rgba(0, 212, 216, 0.18)
 *   - grid   → rgba(0, 212, 216, 0.10)
 *   - background + axisText + volume stay unchanged
 *     (no token equivalent exists for them yet).
 */
import { describe, expect, it } from 'vitest';

import { CURVE_THEME } from '../curveChartTheme';

describe('CURVE_THEME (T-044)', () => {
  it('perf + balance resuelven a CSS vars de jade-profit / jade-info', () => {
    expect(CURVE_THEME.perf).toBe('var(--color-jade-profit)');
    expect(CURVE_THEME.balance).toBe('var(--color-jade-info)');
  });

  it('border + grid son rgba cian (cyan ladder 0x00D4D8)', () => {
    expect(CURVE_THEME.border).toBe('rgba(0, 212, 216, 0.18)');
    expect(CURVE_THEME.grid).toBe('rgba(0, 212, 216, 0.10)');
  });

  it('background + axisText quedan sin cambios (sin token equivalente)', () => {
    expect(CURVE_THEME.background).toBe('rgba(13, 21, 30, 0.7)');
    expect(CURVE_THEME.axisText).toBe('rgba(255, 255, 255, 0.45)');
  });

  it('T-044 (triangulate): ninguna paleta del theme contiene el literal "#00E676" (jade legacy)', () => {
    // The legacy jade hex is banned from the chart palette — it
    // would re-introduce the OLD color in any theme that misses
    // the new CSS var.
    const dump = JSON.stringify(CURVE_THEME);
    expect(dump).not.toContain('#00E676');
  });
});
