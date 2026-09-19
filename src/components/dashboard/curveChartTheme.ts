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
  perf: '#00E676',
  balance: '#00B8FF',
  volume: 'rgba(0, 230, 118, 0.30)',
  background: 'rgba(13, 21, 30, 0.7)',
  border: 'rgba(0, 212, 216, 1.0)',
  grid: 'rgba(0, 212, 216, 0.10)',
  axisText: 'rgba(255, 255, 255, 0.45)',
} as const;

export const CURVE_CARD_CLASS =
  'rounded-xl border border-primary bg-[var(--color-jade-border)]/40 backdrop-blur-md p-5 md:p-6 overflow-hidden shadow-[0_0_24px_rgba(0,212,216,0.55)]';

export const CURVE_CARD_BORDER_STYLE: CSSProperties = {
  borderColor: CURVE_THEME.border,
};

/**
 * DVC-04 — hardcoded fallback colours for the chart line tint.
 *
 * These mirror the platform's profit / loss CSS tokens
 * (``--color-jade-profit`` / ``--color-jade-loss`` in dark mode),
 * which the chart resolves at mount via ``getComputedStyle``. When
 * the theme stylesheet is not loaded (the jsdom test environment),
 * the CSS vars resolve to an empty string and these fallbacks keep
 * the line tinted correctly. Light theme switches via the same
 * ``getComputedStyle`` path so a single source of truth flows through
 * the theme tokens.
 */
export const CURVE_LINE_FALLBACK = {
  /** Matches --color-jade-profit (dark) — cyan-green #3CE0B8. */
  profit: '#3CE0B8',
  /** Matches --color-jade-loss (dark) — pink-red #FF3D5F. */
  loss: '#FF3D5F',
  /** Neutral axis text for the "no points" edge case. */
  neutral: '#8a9ba8',
} as const;

/**
 * Coerce an ISO date string into the ``Time`` union that
 * lightweight-charts accepts. We use the date string directly
 * because every chart is keyed on a daily bucket (``YYYY-MM-DD``)
 * and lightweight-charts supports ISO date strings out of the box.
 */
export function toChartTime(iso: string): Time {
  return iso as Time;
}
