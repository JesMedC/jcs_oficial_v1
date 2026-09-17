/*
 * PerformanceCurveChart — Curva de Rendimiento (v2 spline pivot).
 *
 * dashboard-jarvis-fidelity-v2 (REQ-DCF-JV2-009) — the chart now
 * renders a smooth Lightweight-Charts LineSeries on the cumulative
 * net P&L, with a parallel AreaSeries providing the cyan gradient
 * fill (CURVE_AREA_TOP → CURVE_AREA_BOTTOM). The pre-Slice-B
 * histogram bars + secondary volume histogram are gone — the
 * curve's slope tells the per-day P&L story directly.
 *
 * The capital movements (FUND / WITHDRAW) still surface as
 * triangular markers (`createSeriesMarkers`) on the spline series
 * so the user can see when money moved in/out without losing the
 * cumulative-P&L curve.
 *
 * Visual contract:
 *   - Spline (lineType: 2 — Curved) in JARVIS cyan
 *   - Gradient area fill above the spline (top 0.30 alpha → bottom
 *     0 alpha)
 *   - Deposit markers: cyan ▲ aboveBar; withdraw markers: red ▼
 *     belowBar. Both bound to the spline series.
 *   - Dotted grid + JetBrains Mono axis labels (per Slice B).
 *
 * Resize-aware via ResizeObserver; crosshair enabled; price-line off
 * (the right-side badge shows the latest cumulative P&L).
 */
import { useEffect, useMemo, useRef } from 'react';
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  LineType,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
} from 'lightweight-charts';

import {
  CURVE_AREA_BOTTOM,
  CURVE_AREA_TOP,
  CURVE_CARD_BORDER_STYLE,
  CURVE_CARD_CLASS,
  CURVE_THEME,
  toChartTime,
} from './curveChartTheme';

interface EquityPoint {
  readonly date: string;
  /** Real broker balance (includes deposits / withdrawals). */
  readonly account_balance: number;
  /** Cumulative trading P&L above the initial fund (= Σ daily_pnl).
   *  v2 — drives the SPLINE on the performance chart (was the
   *  per-day histogram of `daily_pnl` in pre-Slice-B). */
  readonly cumulative_net_pnl: number;
  /** Per-day net P&L (kept on the type for caller compatibility;
   *  v2 uses it only to compute the trend, not to render bars). */
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
  // v2 — the spline series is the chart's PRIMARY visual element.
  const perfSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  // v2 — the area fill sits as a sibling series below the spline
  // so it never crosses the line (lightweight-charts renders the
  // lower-priority series behind higher-priority ones when both
  // share the same price scale).
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  // Slice B (T-046) — Cached series-markers plugin ref. Created
  // once per mount and only mutated via `setMarkers()` on data
  // changes. The plugin is now attached to the SPLINE series (was
  // the histogram in Slice B).
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

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
        scaleMargins: { top: 0.12, bottom: 0.18 },
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
          color: CURVE_THEME.primary,
          width: 1,
          style: 2,
          labelBackgroundColor: CURVE_THEME.primary,
        },
        horzLine: {
          color: CURVE_THEME.primary,
          width: 1,
          style: 2,
          labelBackgroundColor: CURVE_THEME.primary,
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

    // PRIMARY — cumulative P&L as a smooth cyan spline (v2).
    // The slope of the line tells the per-day P&L story; the area
    // fill below paints the "lit" JARVIS look.
    const perfSeries = chart.addSeries(LineSeries, {
      color: CURVE_THEME.primary,
      lineWidth: 2,
      lineType: LineType.Curved,
      priceScaleId: 'right',
      lastValueVisible: true,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
      crosshairMarkerBorderColor: CURVE_THEME.primary,
      crosshairMarkerBackgroundColor: CURVE_THEME.primary,
    });

    // SECONDARY — area fill under the spline. Same scale + the
    // gradient stops exported from curveChartTheme so the chart
    // reads as a "powered" cyan beam.
    const areaSeries = chart.addSeries(AreaSeries, {
      priceScaleId: 'right',
      lineColor: CURVE_THEME.primary,
      topColor: CURVE_AREA_TOP,
      bottomColor: CURVE_AREA_BOTTOM,
      lineWidth: 2,
      lineType: LineType.Curved,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    perfSeriesRef.current = perfSeries;
    areaSeriesRef.current = areaSeries;

    // Attach the markers plugin to the SPLINE series so deposit /
    // withdraw triangles ride on top of the curve.
    const markersPlugin = createSeriesMarkers(perfSeries, []);
    markersPluginRef.current = markersPlugin;

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
      areaSeriesRef.current = null;
      markersPluginRef.current = null;
    };
  }, [height]);

  /* ---- push data ---- */
  useEffect(() => {
    const perfSeries = perfSeriesRef.current;
    const areaSeries = areaSeriesRef.current;
    if (perfSeries === null || areaSeries === null) return;

    // v2 — the spline + area series both consume cumulative_net_pnl
    // so the line and the gradient fill match exactly. We skip
    // zero-trade days (no cumulative movement = no point on the
    // curve), but the cumulative figure carries the running sum
    // across quiet days so the slope is preserved.
    const seriesData = points.map((p) => ({
      time: toChartTime(p.date),
      value: p.cumulative_net_pnl,
    }));
    perfSeries.setData(seriesData);
    areaSeries.setData(seriesData);

    // Deposit / withdraw triangles for days with non-zero capital
    // volume. Cyan ▲ for deposits, red ▼ for withdraws. The plugin
    // ref caches the instance so we never re-create it on data
    // pushes.
    const depositMarkers: SeriesMarker<Time>[] = points
      .filter((p) => p.capital_volume !== 0)
      .map((p) => ({
        time: toChartTime(p.date),
        position: p.capital_volume > 0 ? 'aboveBar' : 'belowBar',
        color:
          p.capital_volume > 0
            ? 'var(--color-jade-profit)'
            : 'var(--color-jade-loss)',
        shape: p.capital_volume > 0 ? 'arrowUp' : 'arrowDown',
        text: `$${Math.abs(p.capital_volume).toFixed(0)}`,
      }));
    markersPluginRef.current?.setMarkers(depositMarkers);

    chartRef.current?.timeScale().fitContent();
  }, [points]);

  /* ---- header cumulative chip ---- */
  const headerLabel = useMemo(() => {
    if (points.length === 0) return null;
    const last = points[points.length - 1]!;
    // ``cumulative_net_pnl`` is the running trading profit. Same
    // number the Y axis reads at the spline's rightmost point.
    return { delta: last.cumulative_net_pnl };
  }, [points]);

  /*
   * Slice B (T-045, REQ-DCF-004) — Last-point tooltip badge.
   * Renders the absolute `+$X.XX` (cumulative trading P&L) and
   * the relative `+Y.Y%` (delta vs the window's first point).
   */
  const lastPointBadge = useMemo(() => {
    if (points.length === 0) return null;
    const first = points[0]!;
    const last = points[points.length - 1]!;
    const base = first.cumulative_net_pnl;
    const lastPnl = last.cumulative_net_pnl;
    const deltaPnl = lastPnl - base;
    const deltaPct =
      base === 0
        ? lastPnl > 0
          ? 9999
          : lastPnl < 0
            ? -9999
            : 0
        : Math.max(-9999, Math.min(9999, (deltaPnl / Math.abs(base)) * 100));
    return {
      absText: `${lastPnl >= 0 ? '+' : '-'}$${Math.abs(lastPnl).toFixed(2)}`,
      pctText: `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%`,
    };
  }, [points]);

  return (
    <div
      data-testid="dash-performance-curve"
      className={`${CURVE_CARD_CLASS} relative`}
      style={CURVE_CARD_BORDER_STYLE}
    >
      {lastPointBadge !== null ? (
        <div
          data-testid="dash-performance-lastpoint"
          className="absolute top-3 right-3 font-mono text-[10px] text-text-secondary bg-surface/60 backdrop-blur-sm px-2 py-1 rounded"
        >
          {lastPointBadge.absText} · {lastPointBadge.pctText}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-[#00E5FF]"
            style={{ boxShadow: '0 0 6px #00E5FF' }}
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
                P&amp;L acumulado · curva cyan
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
            style={{ background: CURVE_THEME.primary }}
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
            style={{ background: 'var(--color-jade-profit)' }}
          />
          <span>Depósito</span>
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ background: 'var(--color-jade-loss)' }}
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