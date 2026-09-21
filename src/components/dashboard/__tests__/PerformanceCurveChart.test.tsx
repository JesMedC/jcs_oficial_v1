/*
 * DVC-04 — PerformanceCurveChart rewrite.
 *
 * Locks the visual contract of the dashboard's "Curva de Rendimiento"
 * card after the rewrite:
 *
 *   1. The chart renders ONE AreaSeries over ``cumulative_net_pnl``
 *      (no HistogramSeries, no cashflow volume bars on this card).
 *   2. FUND / WITHDRAW rows never reach the chart — the data source
 *      already excludes them via ``useEquityCurve.buildOpsSeries``;
 *      the chart test pins the same expectation on the consumer side
 *      by passing through an EquityCurve-shaped points array that has
 *      no capital_volume contribution and asserts the series only
 *      carries the cumulative value.
 *   3. The "Σ Trading P&L" header chip reads the same value the
 *      series would render — no double accounting.
 *   4. The subtitle is "P&L acumulado de operaciones · Sin depósitos
 *      ni retiros" and the Depósito / Retiro legend is gone.
 *   5. The cumulative P&L feeds ONE series of the Area type with the
 *      exact data length of the points array.
 *   6. Negative-axis visibility — the chart canvas container has no
 *      negative margins, no expanded width, so the negative half of
 *      the price scale is not clipped by ``overflow-hidden``.
 *   7. Tooltip is bound inside the card and shows both daily P&L
 *      and cumulative P&L at the hovered date.
 *   8. Sync — when the data source changes, the chart refreshes the
 *      series.
 *
 * lightweight-charts is mocked at the module boundary so we can
 * capture ``setData`` / ``applyOptions`` calls without standing up
 * the canvas renderer in jsdom. The setup.ts already provides
 * ResizeObserver + canvas 2d context stubs in case a downstream
 * dependency reaches the real module.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

// Lightweight-charts mock — capture addSeries / setData / applyOptions
// so we can assert what the chart actually asked the library to draw.
const lwMocks = vi.hoisted(() => {
  const series: Array<{
    __type: unknown;
    __opts: Record<string, unknown>;
    __data: ReadonlyArray<unknown>;
    setData: ReturnType<typeof vi.fn>;
    applyOptions: ReturnType<typeof vi.fn>;
  }> = [];
  const crosshairListeners: Array<(p: unknown) => void> = [];
  // Stable timeScale proxy — the component calls applyOptions
  // once at mount with the tickMarkFormatter; we need a single
  // mock fn instance to inspect after the fact (vi.fn(() => …) on
  // every call would lose the recorded calls).
  const timeScale = {
    fitContent: vi.fn(),
    applyOptions: vi.fn(),
  };
  const priceScale = {
    applyOptions: vi.fn(),
  };
  const chart = {
    addSeries: vi.fn((type: unknown, opts: Record<string, unknown>) => {
      const entry = {
        __type: type,
        __opts: { ...(opts ?? {}) },
        __data: [] as ReadonlyArray<unknown>,
        setData: vi.fn((data: ReadonlyArray<unknown>) => {
          entry.__data = data;
        }),
        applyOptions: vi.fn((o: Record<string, unknown>) => {
          entry.__opts = { ...entry.__opts, ...o };
        }),
      };
      series.push(entry);
      return entry;
    }),
    priceScale: vi.fn(() => priceScale),
    timeScale: vi.fn(() => timeScale),
    applyOptions: vi.fn(),
    remove: vi.fn(),
    subscribeCrosshairMove: vi.fn((cb: (p: unknown) => void) => {
      crosshairListeners.push(cb);
    }),
    unsubscribeCrosshairMove: vi.fn((cb: (p: unknown) => void) => {
      const i = crosshairListeners.indexOf(cb);
      if (i >= 0) crosshairListeners.splice(i, 1);
    }),
  };
  // Capture the createChart options so the test can assert
  // ``tickMarkFormatter`` was installed at chart-creation time
  // (v5 only accepts the field on ``TimeScaleOptions``, not on
  // ``timeScale().applyOptions``).
  const createOptions: unknown[] = [];
  const createChart = vi.fn((_container: unknown, options: unknown) => {
    createOptions.push(options);
    return chart;
  });
  return {
    series,
    createChart,
    chart,
    crosshairListeners,
    timeScale,
    priceScale,
    createOptions,
  };
});

vi.mock('lightweight-charts', () => ({
  ColorType: { Solid: 'solid' },
  CrosshairMode: { Normal: 0 },
  LineSeries: Symbol.for('lw.LineSeries'),
  AreaSeries: Symbol.for('lw.AreaSeries'),
  HistogramSeries: Symbol.for('lw.HistogramSeries'),
  createChart: lwMocks.createChart,
}));

import { PerformanceCurveChart } from '../PerformanceCurveChart';

interface EquityPoint {
  readonly date: string;
  readonly account_balance: number;
  readonly cumulative_net_pnl: number;
  readonly daily_pnl: number;
  readonly capital_volume: number;
  readonly trades: number;
}

function mkPoint(over: Partial<EquityPoint> & { date: string }): EquityPoint {
  return {
    account_balance: 1000,
    cumulative_net_pnl: 0,
    daily_pnl: 0,
    capital_volume: 0,
    trades: 1,
    ...over,
  };
}

beforeEach(() => {
  lwMocks.series.length = 0;
  lwMocks.crosshairListeners.length = 0;
  lwMocks.createChart.mockClear();
  lwMocks.createOptions.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PerformanceCurveChart — DVC-04', () => {
  it('renders ONE AreaSeries over cumulative_net_pnl (no Histogram, no cashflow volume)', () => {
    const points: EquityPoint[] = [
      mkPoint({ date: '2026-09-10', cumulative_net_pnl: 5 }),
      mkPoint({ date: '2026-09-11', cumulative_net_pnl: 12 }),
      mkPoint({ date: '2026-09-12', cumulative_net_pnl: 9 }),
    ];

    render(<PerformanceCurveChart points={points} />);

    // Exactly one series was added — and it's the Area primitive,
    // NOT the Histogram the previous implementation used for the
    // daily-P&L bars.
    expect(lwMocks.series.length).toBe(1);
    expect(lwMocks.series[0]?.__type).toBe(Symbol.for('lw.AreaSeries'));
    expect(lwMocks.series[0]?.__type).not.toBe(
      Symbol.for('lw.HistogramSeries'),
    );
  });

  it('submits the cumulative_net_pnl of every point to the series (zero days preserved)', () => {
    // Day 11 has no trading activity — cumulative carries forward.
    // The chart MUST emit a flat point for day 11, not skip it.
    const points: EquityPoint[] = [
      mkPoint({ date: '2026-09-10', cumulative_net_pnl: 4, daily_pnl: 4 }),
      mkPoint({ date: '2026-09-11', cumulative_net_pnl: 4, daily_pnl: 0 }),
      mkPoint({ date: '2026-09-12', cumulative_net_pnl: 4, daily_pnl: 0 }),
    ];

    render(<PerformanceCurveChart points={points} />);

    const data = lwMocks.series[0]?.__data as Array<{
      time: string;
      value: number;
    }>;
    expect(data).toHaveLength(3);
    expect(data[0]?.value).toBe(4);
    expect(data[1]?.value).toBe(4);
    expect(data[2]?.value).toBe(4);
  });

  it('drops the "Depósito / Retiro" legend from the card', () => {
    render(<PerformanceCurveChart points={[mkPoint({ date: '2026-09-12' })]} />);

    const card = screen.getByTestId('dash-performance-curve');
    expect(within(card).queryByText('Depósito')).toBeNull();
    expect(within(card).queryByText('Retiro')).toBeNull();
  });

  it('shows the DVC-04 subtitle "P&L acumulado de operaciones · Sin depósitos ni retiros"', () => {
    render(<PerformanceCurveChart points={[mkPoint({ date: '2026-09-12' })]} />);

    const subtitle = screen.getByTestId('dash-performance-subtitle');
    expect(subtitle.textContent).toBe(
      'P&L acumulado de operaciones · Sin depósitos ni retiros',
    );
  });

  it('reads the header "Σ Trading P&L" value from the same series\' final value (no double accounting)', () => {
    const points: EquityPoint[] = [
      mkPoint({ date: '2026-09-10', cumulative_net_pnl: 5 }),
      mkPoint({ date: '2026-09-11', cumulative_net_pnl: 12 }),
      mkPoint({ date: '2026-09-12', cumulative_net_pnl: 9.2 }),
    ];

    render(<PerformanceCurveChart points={points} />);

    const delta = screen.getByTestId('dash-performance-delta');
    expect(delta.textContent?.trim()).toBe('+$9.20');
  });

  it('reflects a negative cumulative P&L on the line color (line tint follows the sign)', () => {
    const negativeLast: EquityPoint[] = [
      mkPoint({ date: '2026-09-10', cumulative_net_pnl: 5 }),
      mkPoint({ date: '2026-09-11', cumulative_net_pnl: -3 }),
    ];
    const { rerender } = render(
      <PerformanceCurveChart points={negativeLast} />,
    );

    // After the second point commits, the last value is negative —
    // the series' lineColor must shift to the loss token.
    expect(lwMocks.series[0]?.__opts.lineColor).toBeTruthy();
    const negativeColor = lwMocks.series[0]?.__opts.lineColor;

    // Now re-render with a positive terminal value and confirm the
    // line color changes to the profit token. Different from the
    // negative one — that's the whole point of the tint.
    const positiveLast: EquityPoint[] = [
      mkPoint({ date: '2026-09-10', cumulative_net_pnl: 5 }),
      mkPoint({ date: '2026-09-11', cumulative_net_pnl: 8 }),
    ];
    rerender(<PerformanceCurveChart points={positiveLast} />);
    const positiveColor = lwMocks.series[0]?.__opts.lineColor;

    expect(positiveColor).toBeTruthy();
    expect(positiveColor).not.toBe(negativeColor);
  });

  it('keeps the chart canvas inside the card so a negative price-scale half is not clipped', () => {
    render(
      <PerformanceCurveChart points={[mkPoint({ date: '2026-09-12' })]} />,
    );

    const canvas = screen.getByTestId('dash-performance-curve-canvas');
    // No negative horizontal margin and no `calc(100% + …)` width —
    // the canvas sits within the card's padding so the price scale
    // can render its negative half without the card's
    // ``overflow-hidden`` chrome slicing it off.
    expect(canvas.className).not.toMatch(/-mx-/);
    const style = (canvas as HTMLElement).style;
    expect(style.width === '' || style.width === 'auto').toBe(true);
  });

  it('renders a tooltip with daily + cumulative P&L when the crosshair hovers a date, bound inside the card', () => {
    const points: EquityPoint[] = [
      mkPoint({ date: '2026-09-10', cumulative_net_pnl: 4, daily_pnl: 4 }),
      mkPoint({ date: '2026-09-11', cumulative_net_pnl: 9, daily_pnl: 5 }),
      mkPoint({ date: '2026-09-12', cumulative_net_pnl: 6, daily_pnl: -3 }),
    ];

    render(<PerformanceCurveChart points={points} />);

    // The mock recorded the crosshair subscription — simulate the
    // chart library dispatching a hover at the middle date.
    const cb = lwMocks.crosshairListeners[0];
    expect(cb).toBeDefined();
    if (cb === undefined) return;

    // External dispatch — wrap in act so React flushes the
    // setHover-induced re-render before the DOM assertions below.
    act(() => {
      cb({
        time: '2026-09-11',
        logical: 1,
        point: { x: 100, y: 100 },
        seriesData: new Map([
          [
            lwMocks.series[0],
            { time: '2026-09-11', value: 9 },
          ],
        ]),
      });
    });

    const tooltip = screen.getByTestId('dash-performance-tooltip');
    expect(within(tooltip).getByTestId('dash-performance-tooltip-date')
      .textContent).toBeTruthy();
    // Daily Δ = cumulative[11] − cumulative[10] = 9 − 4 = +5.
    // The chart uses the platform's es-AR USD format; the assertion
    // matches either the en-US or the es-AR rendering so the test
    // does not pin a specific locale.
    const dailyText =
      within(tooltip).getByTestId('dash-performance-tooltip-daily')
        .textContent ?? '';
    const cumulativeText =
      within(tooltip).getByTestId('dash-performance-tooltip-cumulative')
        .textContent ?? '';
    expect(dailyText).toMatch(/5[.,]00/);
    expect(cumulativeText).toMatch(/9[.,]00/);
    expect(dailyText).toContain('+');

    // Long numbers must wrap or ellipsize — the tooltip div has
    // overflow control on it so a 14-digit number cannot blow out
    // the card's edge.
    const style = window.getComputedStyle(tooltip);
    expect(['normal', 'break-word', 'anywhere']).toContain(
      style.wordBreak === '' ? 'normal' : style.wordBreak,
    );
  });

  it('refreshes the series when the data source changes (chart re-syncs on useCloseTrade invalidation)', () => {
    const initial: EquityPoint[] = [
      mkPoint({ date: '2026-09-10', cumulative_net_pnl: 4 }),
      mkPoint({ date: '2026-09-11', cumulative_net_pnl: 4 }),
    ];
    const { rerender } = render(
      <PerformanceCurveChart points={initial} />,
    );

    const firstSet = (lwMocks.series[0]?.__data as Array<{
      time: string;
      value: number;
    }>) ?? [];
    expect(firstSet).toHaveLength(2);

    // Simulate the equity-curve query refreshing after
    // ``useCloseTrade`` invalidates the dashboard key — the parent
    // DashboardPage hands the chart a brand-new points array.
    const refreshed: EquityPoint[] = [
      mkPoint({ date: '2026-09-10', cumulative_net_pnl: 4 }),
      mkPoint({ date: '2026-09-11', cumulative_net_pnl: 9 }),
      mkPoint({ date: '2026-09-12', cumulative_net_pnl: 9 }),
    ];
    rerender(<PerformanceCurveChart points={refreshed} />);

    const after = (lwMocks.series[0]?.__data as Array<{
      time: string;
      value: number;
    }>) ?? [];
    expect(after).toHaveLength(3);
    expect(after[1]?.value).toBe(9);
  });

  it('configures a USD price format with 2-decimal precision so the right axis reads in dollars', () => {
    render(
      <PerformanceCurveChart points={[mkPoint({ date: '2026-09-12' })]} />,
    );

    const opts = lwMocks.series[0]?.__opts as {
      priceFormat?: { type?: string; precision?: number; minMove?: number };
    };
    expect(opts.priceFormat?.type).toBe('price');
    expect(opts.priceFormat?.precision).toBe(2);
    expect(opts.priceFormat?.minMove).toBe(0.01);
  });

  it('configures the time scale with a locale-aware tick mark formatter', () => {
    render(
      <PerformanceCurveChart points={[mkPoint({ date: '2026-09-12' })]} />,
    );

    // The chart installs a custom tick mark formatter on the time
    // scale at creation time so date ticks render through
    // Intl.DateTimeFormat — no more "11 sep" / "Sep 11" inconsistency.
    // In v5 the field lives on ``TimeScaleOptions`` (extends
    // ``HorzScaleOptions``) and is only accepted at chart-creation
    // time, not via ``timeScale().applyOptions``. The mock captured
    // the createChart options so we can assert directly.
    expect(lwMocks.createOptions.length).toBeGreaterThan(0);
    const firstCreate = lwMocks.createOptions[0] as
      | {
          timeScale?: {
            tickMarkFormatter?: (time: unknown) => string;
          };
        }
      | undefined;
    const ts = firstCreate?.timeScale;
    expect(ts?.tickMarkFormatter).toBeDefined();
    const label = ts?.tickMarkFormatter?.({
      year: 2026,
      month: 8,
      day: 12,
    });
    expect(typeof label).toBe('string');
    expect((label as string).length).toBeGreaterThan(0);
  });

  it('positions the tooltip overlay inside the card so it cannot escape the card edge on short viewports', () => {
    const points: EquityPoint[] = [
      mkPoint({ date: '2026-09-10', cumulative_net_pnl: 4 }),
    ];
    render(<PerformanceCurveChart points={points} />);

    // Dispatch a synthetic hover so the tooltip mounts.
    const cb = lwMocks.crosshairListeners[0];
    if (cb !== undefined) {
      act(() => {
        cb({
          time: '2026-09-10',
          point: { x: 50, y: 50 },
          seriesData: new Map([
            [lwMocks.series[0], { time: '2026-09-10', value: 4 }],
          ]),
        });
      });
    }

    const tooltip = screen.getByTestId('dash-performance-tooltip');
    // Bound by max-w / overflow-hidden so the tooltip never
    // overflows the card even when the value has many digits.
    expect(tooltip.className).toMatch(/max-w-/);
    expect(tooltip.className).toMatch(/overflow-hidden|truncate/);
    // Sanity: the element exists and is reachable.
    fireEvent.mouseEnter(tooltip);
  });
});