/*
 * PerformanceCurveChart — Curva de Rendimiento.
 *
 * Per-day histogram of trading P&L. Each bar = one day:
 *   - Positive day → jade bar above zero
 *   - Negative day → red bar below zero
 *   - Quiet day    → no bar (zero-height row)
 *
 * Companion to ``CapitalCurveChart``: the histogram tells the
 * "skill story" (how the user traded each day), while the capital
 * curve tells the "money story" (how the account balance evolved
 * after capital movements too).
 *
 * Pure skill metric: cashflow in/out is NOT reflected on these
 * bars, so a flat chart means "neither won nor lost on the
 * markets", regardless of how much capital moved.
 *
 * The legend chip in the header reports the CUMULATIVE trading
 * P&L (Σ daily bars, e.g. +$9.20 for a user who started the window
 * flat and closed it +$9.20) — this matches what the user expects
 * to see as "their edge" without the initial-fund amount baked in.
 *
 * Two series on the same canvas:
 *   - HistogramSeries for ``daily_pnl`` (jade on +days, red on
 *     −days) on the right price scale.
 *   - HistogramSeries for ``capital_volume`` (FUND/WITHDRAW, jade
 *     low-opacity / red low-opacity) on a dedicated ``volume``
 *     scale pinned to the bottom strip.
 *
 * Resize-aware via ResizeObserver; crosshair enabled.
 */
import { useEffect, useMemo, useRef } from 'react';
import {
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';

import {
  CURVE_CARD_BORDER_STYLE,
  CURVE_CARD_CLASS,
  CURVE_THEME,
  toChartTime,
} from './curveChartTheme';

interface EquityPoint {
  readonly date: string;
  /** Real broker balance (includes deposits / withdrawals). */
  readonly account_balance: number;
  /** Cumulative trading P&L above the initial fund (= Σ daily_pnl). */
  readonly cumulative_net_pnl: number;
  /** Net trading P&L on this day only — drives the histogram bar. */
  readonly daily_pnl: number;
  /** Net capital volume for the day (FUND − WITHDRAW). */
  readonly capital_volume: number;
  readonly trades: number;
}

interface Props {
  readonly points: ReadonlyArray<EquityPoint>;
  /** Optional chart height override (default 320). */
  readonly height?: number;
  /** Optional scope caption rendered next to the title. */
  readonly scopeLabel?: string | null;
  /** Optional subtitle shown under the title. */
  readonly headerSubtitle?: string | undefined;
}

export function PerformanceCurveChart({
  points,
  height = 320,
  scopeLabel = null,
  headerSubtitle,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const perfSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  /* ---- mount + theme + series ---- */
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: CURVE_THEME.background },
        textColor: CURVE_THEME.axisText,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: CURVE_THEME.grid, style: 2 /* dotted */ },
        horzLines: { color: CURVE_THEME.grid, style: 2 },
      },
      rightPriceScale: {
        borderColor: CURVE_THEME.border,
        scaleMargins: { top: 0.12, bottom: 0.22 },
      },
      leftPriceScale: { visible: false },
      timeScale: {
        borderColor: CURVE_THEME.border,
        timeVisible: false,
        secondsVisible: false,
        rightOffset: 4,
        barSpacing: 6,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: CURVE_THEME.perf,
          width: 1,
          style: 2,
          labelBackgroundColor: CURVE_THEME.perf,
        },
        horzLine: {
          color: CURVE_THEME.perf,
          width: 1,
          style: 2,
          labelBackgroundColor: CURVE_THEME.perf,
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    // PRIMARY — per-day trading P&L as a histogram.
    // jade for +days, red for −days. The Y-axis on the right reads
    // directly in USD so the user sees "+$9.20" or "-$2.00" on each
    // bar without translation.
    const perfSeries = chart.addSeries(HistogramSeries, {
      color: CURVE_THEME.perf,
      priceScaleId: 'right',
      lastValueVisible: true,
      priceLineVisible: false,
    });

    // SECONDARY — FUND / WITHDRAW volume bars on a dedicated scale
    // pinned to the bottom 20% so the daily-P&L histogram owns the
    // visual real estate above.
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      color: CURVE_THEME.volume,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.80, bottom: 0 },
    });

    chartRef.current = chart;
    perfSeriesRef.current = perfSeries;
    volumeSeriesRef.current = volumeSeries;

    const ro = new ResizeObserver(() => {
      if (chartRef.current !== null && container !== null) {
        chartRef.current.applyOptions({
          width: container.clientWidth,
          height,
        });
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      perfSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height]);

  /* ---- push data ---- */
  useEffect(() => {
    const perfSeries = perfSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    if (perfSeries === null || volumeSeries === null) return;

    // Per-day trading P&L — jade for green days, red for losing
    // days. Zero-height rows (quiet days) are omitted entirely so
    // the histogram reads as "the days that actually had trades".
    const perfData = points
      .filter((p) => p.daily_pnl !== 0)
      .map((p) => ({
        time: toChartTime(p.date),
        value: p.daily_pnl,
        color:
          p.daily_pnl > 0
            ? 'rgba(0, 230, 118, 0.85)'
            : 'rgba(244, 67, 54, 0.85)',
      }));
    const volumeData = points
      .filter((p) => p.capital_volume !== 0)
      .map((p) => ({
        time: toChartTime(p.date),
        value: p.capital_volume,
        color:
          p.capital_volume > 0
            ? 'rgba(0, 230, 118, 0.55)'
            : 'rgba(244, 67, 54, 0.55)',
      }));

    perfSeries.setData(perfData);
    volumeSeries.setData(volumeData);

    chartRef.current?.timeScale().fitContent();
  }, [points]);

  /* ---- header cumulative chip ---- */
  const headerLabel = useMemo(() => {
    if (points.length === 0) return null;
    const last = points[points.length - 1]!;
    // ``cumulative_net_pnl`` is already the cumulative trading
    // profit (no firstFund baked in) — same number the Y axis
    // would read at the rightmost bar's height.
    return { delta: last.cumulative_net_pnl };
  }, [points]);

  return (
    <div
      data-testid="dash-performance-curve"
      className={CURVE_CARD_CLASS}
      style={CURVE_CARD_BORDER_STYLE}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-[#00E676]"
            style={{ boxShadow: '0 0 6px #00E676' }}
            aria-hidden="true"
          />
          <div className="flex flex-col min-w-0">
            <h3 className="font-display uppercase tracking-widest text-xs md:text-sm text-text-primary">
              Curva de Rendimiento
            </h3>
            {headerSubtitle !== undefined ? (
              <span
                data-testid="dash-performance-subtitle"
                className="font-mono text-[10px] text-text-secondary truncate"
              >
                {headerSubtitle}
              </span>
            ) : (
              <span className="font-mono text-[10px] text-text-muted truncate">
                P&amp;L diario · +US$ verde · −US$ rojo
              </span>
            )}
          </div>
        </div>
        {scopeLabel !== null ? (
          <span
            data-testid="dash-performance-scope"
            className="font-display uppercase tracking-wider text-[9px] text-text-secondary"
          >
            · {scopeLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-4 flex-wrap font-mono text-[10px] text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ background: 'rgba(0, 230, 118, 0.85)' }}
          />
          <span className="text-text-secondary">Σ Trading P&amp;L</span>
          {headerLabel !== null ? (
            <span
              data-testid="dash-performance-delta"
              className={
                headerLabel.delta >= 0
                  ? 'text-profit font-semibold'
                  : 'text-loss font-semibold'
              }
            >
              {headerLabel.delta >= 0 ? '+' : ''}
              ${headerLabel.delta.toFixed(2)}
            </span>
          ) : null}
        </span>
        <span className="inline-flex items-center gap-1.5 ml-auto text-[9px]">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ background: 'rgba(0, 230, 118, 0.55)' }}
          />
          <span>Depósito</span>
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ background: 'rgba(244, 67, 54, 0.55)' }}
          />
          <span>Retiro</span>
        </span>
      </div>

      <div
        ref={containerRef}
        className="mt-3 -mx-2"
        data-testid="dash-performance-curve-canvas"
        style={{ width: 'calc(100% + 1rem)' }}
      />
    </div>
  );
}
