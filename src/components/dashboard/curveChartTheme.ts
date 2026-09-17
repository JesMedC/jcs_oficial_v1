/*
 * Shared theme + card chrome for the dashboard curve charts.
 *
 * dashboard-jarvis-fidelity-v2 (REQ-DCF-JV2-009) — spline + area
 * fill pivot. Both `PerformanceCurveChart` (cyan-shaded area on the
 * cumulative_net_pnl curve) and `CapitalCurveChart` (cyan spline on
 * the account_balance) now render as a smooth Lightweight-Charts
 * LineSeries with the JARVIS gradient fill. The previous histogram +
 * volume bars on the performance chart are removed — the per-day
 * P&L story is told by the area fill's height instead.
 *
 * Centralising the palette keeps the two cards visually aligned side
 * by side without forcing each component to redeclare tokens.
 */
import type { CSSProperties } from 'react';
import type { Time } from 'lightweight-charts';

export interface CurveChartTheme {
  /** Primary cyan — used by both the performance area + capital line. */
  readonly primary: string;
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
  // v2 — primary unified to the JARVIS cyan CSS-var so the spline +
  // gradient fill share the same token. The previous split between
  // perf (jade-profit) + balance (info) was right when the two
  // charts told different stories; with the spline pivot they share
  // a single visual language.
  primary: 'var(--color-jade)',
  background: 'rgba(13, 21, 30, 0.7)',
  // v2 — cyan border now reads as the JARVIS chromatic halo
  // (rgba 0,229,255 at 0.18) so the cards line up with the HudPanel
  // glass border instead of feeling like a different chrome.
  border: 'rgba(0, 229, 255, 0.18)',
  grid: 'rgba(0, 229, 255, 0.10)',
  axisText: 'rgba(255, 255, 255, 0.45)',
} as const;

/*
 * Gradient stops for the area-fill on the spline curve. Lightweight-
 * Charts consumes `topColor` + `bottomColor` for `AreaSeries.setData`;
 * for the v2 spline we still want the gradient feel on the line's
 * underlay, so the chart components paint a parallel AreaSeries
 * with these stops.
 */
export const CURVE_AREA_TOP = 'rgba(0, 229, 255, 0.30)';
export const CURVE_AREA_BOTTOM = 'rgba(0, 229, 255, 0)';

/**
 * Card chrome — the rounded "frame" + glass background + cyan border.
 * Kept as a Tailwind class string so consumers compose it with
 * layout utilities (padding, gap, etc.).
 */
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