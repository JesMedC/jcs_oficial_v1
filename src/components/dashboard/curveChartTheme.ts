/*
 * Shared theme + card chrome for the dashboard curve charts.
 *
 * Both ``PerformanceCurveChart`` (jade area + deposit/withdraw
 * histogram) and ``CapitalCurveChart`` (cyan dashed balance line)
 * render on the same TradingView lightweight-charts canvas with the
 * same dark glass background, the same grid colour and the same
 * JetBrains-Mono axis label stack. Centralising the palette keeps
 * the two cards visually aligned side by side without forcing each
 * component to redeclare tokens.
 *
 * Kept intentionally tiny: just constants + a single helper. The
 * chart-mount boilerplate (createChart, ResizeObserver, cleanup) is
 * duplicated between the two components on purpose — each component
 * wires a different set of series, and inlining the mount keeps
 * each file easy to scan top-to-bottom.
 */
import type { CSSProperties } from 'react';
import type { Time } from 'lightweight-charts';

export interface CurveChartTheme {
  /** Primary jade neon — used by the performance area. */
  readonly perf: string;
  /** Cool cyan — used by the capital/balance line. */
  readonly balance: string;
  /** Jade at low opacity — volume bars. */
  readonly volume: string;
  /** Glass panel background. */
  readonly background: string;
  /** Glass border + grid stroke. */
  readonly border: string;
  /** Lighter grid line stroke. */
  readonly grid: string;
  /** Axis label text. */
  readonly axisText: string;
}

export const CURVE_THEME: CurveChartTheme = {
  // Slice B (T-044, REQ-DCF-003): pivot from hardcoded jade hex
  // to the cyan CSS-var ladder so the chart palette honours the
  // theme. The `rgba(13, 21, 30, 0.7)` background + the muted
  // `rgba(255, 255, 255, 0.45)` axis text stay as-is — no token
  // equivalent exists for them in `themes.css`.
  perf: 'var(--color-jade-profit)',
  balance: 'var(--color-jade-info)',
  volume: 'rgba(60, 224, 184, 0.30)',
  background: 'rgba(13, 21, 30, 0.7)',
  border: 'rgba(0, 212, 216, 0.18)',
  grid: 'rgba(0, 212, 216, 0.10)',
  axisText: 'rgba(255, 255, 255, 0.45)',
} as const;

export const CURVE_CARD_CLASS =
  'rounded-xl border bg-[rgba(13,21,30,0.7)] backdrop-blur-md p-5 md:p-6 overflow-hidden';

export const CURVE_CARD_BORDER_STYLE: CSSProperties = {
  borderColor: CURVE_THEME.border,
};

/**
 * Coerce an ISO date string into the ``Time`` union that
 * lightweight-charts accepts. We use the date string directly
 * because every chart is keyed on a daily bucket (``YYYY-MM-DD``)
 * and lightweight-charts supports ISO date strings out of the box.
 */
export function toChartTime(iso: string): Time {
  return iso as Time;
}
