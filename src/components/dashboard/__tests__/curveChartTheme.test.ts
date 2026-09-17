/*
 * dashboard-jarvis-fidelity (Slice B, T-044, REQ-DCF-003) +
 * dashboard-jarvis-fidelity-v2 (REQ-DCF-JV2-009) — curveChartTheme
 * constants tests.
 *
 * Pins the v2 spline pivot:
 *   - The chart palette unified to a single `primary` token
 *     (var(--color-jade)) so the area-fill + line stroke share the
 *     same color (was perf = jade-profit / balance = jade-info in
 *     Slice B, unified in v2 because the two charts now share a
 *     single visual language).
 *   - The border rgba migrated from (0,212,216) → (0,229,255) so
 *     the chart cards line up with the new JARVIS palette.
 *   - New `CURVE_AREA_TOP` / `CURVE_AREA_BOTTOM` exports pin the
 *     gradient stops used by the spline area fill.
 */
import { describe, expect, it } from 'vitest';

import {
  CURVE_AREA_BOTTOM,
  CURVE_AREA_TOP,
  CURVE_THEME,
} from '../curveChartTheme';

describe('CURVE_THEME (v2, REQ-DCF-JV2-009)', () => {
  it('primary unifica las dos charts al cyan CSS var (single visual language)', () => {
    // v2 dropped the perf/balance split — both charts now read as
    // a single cyan spline.
    expect(CURVE_THEME.primary).toBe('var(--color-jade)');
  });

  it('border + grid usan la familia rgba(0, 229, 255) del cyan v2', () => {
    expect(CURVE_THEME.border).toBe('rgba(0, 229, 255, 0.18)');
    expect(CURVE_THEME.grid).toBe('rgba(0, 229, 255, 0.10)');
  });

  it('background + axisText quedan sin cambios (sin token equivalente)', () => {
    expect(CURVE_THEME.background).toBe('rgba(13, 21, 30, 0.7)');
    expect(CURVE_THEME.axisText).toBe('rgba(255, 255, 255, 0.45)');
  });

  it('CURVE_AREA_TOP / CURVE_AREA_BOTTOM exponen los stops del gradient fill', () => {
    // The spline area-fill uses a top-to-bottom transparent fade so
    // the chart reads as a "lit curve" instead of a flat block.
    expect(CURVE_AREA_TOP).toBe('rgba(0, 229, 255, 0.30)');
    expect(CURVE_AREA_BOTTOM).toBe('rgba(0, 229, 255, 0)');
  });

  it('ninguna paleta del theme contiene el literal "#00E676" (jade legacy)', () => {
    // The legacy jade hex is banned from the chart palette — it
    // would re-introduce the OLD color in any theme that misses
    // the new CSS var.
    const dump = JSON.stringify(CURVE_THEME);
    expect(dump).not.toContain('#00E676');
  });

  it('ninguna paleta del theme contiene el rgba legacy (0, 212, 216) del Slice B', () => {
    // v2 pinned the new rgba family — a regression that re-introduces
    // the Slice B cyan is loud.
    const dump = JSON.stringify(CURVE_THEME);
    expect(dump).not.toContain('0, 212, 216');
  });
});