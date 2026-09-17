/*
 * CapitalCurveChart — Curva de Capital (v2 spline pivot).
 *
 * dashboard-jarvis-fidelity-v2 (REQ-DCF-JV2-009) — the chart now
 * renders a smooth Lightweight-Charts LineSeries on the user's
 * account_balance, with a parallel AreaSeries providing the cyan
 * gradient fill. The previous dashed-step line style stays, but
 * the curve is now `lineType: Curved` so the eye reads the
 * capital trajectory as a smooth flow rather than a stepped
 * chart. The two charts on the same column (performance + capital)
 * now share the same spline visual language.
 *
 * Single-axis chart that tracks the user's *account balance* over
 * time (the broker-reported figure: Σ deposits − Σ withdrawals
 * + Σ closed trade P&L). Includes cashflow — this is the
 * "real money in the account" view, not the trading skill view.
 *
 * No volume bars here — cashflow is already summarised on the
 * performance card via the deposit/withdraw markers.
 *
 * Resize-aware via ResizeObserver; crosshair enabled; price-line
 * off (the right-side value badge shows the latest balance).
 */
import { useEffect, useMemo, useRef } from 'react';
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  LineStyle,
  LineType,
  createChart,
  type IChartApi,
  type ISeriesApi,
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
  /** Operations-only performance (first fund + Σ trading P&L). */
  readonly cumulative_net_pnl: number;
  /** Net capital volume for the day (FUND − WITHDRAW). */
  readonly capital_volume: number;
  readonly trades: number;
}

interface Props {
  readonly points: ReadonlyArray<EquityPoint>;
  /** Optional chart height override (default 220 — sits below the
   *  taller PerformanceCurveChart in the same column). */
  readonly height?: number;
  /** Optional scope caption rendered next to the title. */
  readonly scopeLabel?: string | null;
  /** Optional subtitle shown under the title. */
  readonly headerSubtitle?: string | undefined;
}

export function CapitalCurveChart({
  points,
  height = 220,
  scopeLabel = null,
  headerSubtitle,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const balanceSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  // v2 — parallel area fill on the capital curve.
  const balanceAreaRef = useRef<ISeriesApi<'Area'> | null>(null);

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
        scaleMargins: { top: 0.20, bottom: 0.15 },
      },
      leftPriceScale: { visible: false },
      timeScale: {
        borderColor: CURVE_THEME.border,
        timeVisible: false,
        secondsVisible: false,
        rightOffset: 4,
        barSpacing: 8,
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

    // PRIMARY — the balance spline. v2 keeps the dashed style so
    // the eye still distinguishes it from the performance spline
    // on the card above (different visual rhythm) but renders the
    // line itself as a smooth curve instead of a step.
    const balanceSeries = chart.addSeries(LineSeries, {
      color: CURVE_THEME.primary,
      lineWidth: 2,
      lineType: LineType.Curved,
      lineStyle: LineStyle.Dashed,
      priceScaleId: 'right',
      lastValueVisible: true,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
      crosshairMarkerBorderColor: CURVE_THEME.primary,
      crosshairMarkerBackgroundColor: CURVE_THEME.primary,
    });

    // SECONDARY — area fill mirroring the balance spline with a
    // softer gradient so the "money in the account" reads as a
    // gentle cyan wash instead of a flat block.
    const balanceArea = chart.addSeries(AreaSeries, {
      priceScaleId: 'right',
      lineColor: CURVE_THEME.primary,
      topColor: CURVE_AREA_TOP,
      bottomColor: CURVE_AREA_BOTTOM,
      lineWidth: 1,
      lineType: LineType.Curved,
      lineStyle: LineStyle.Dashed,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    balanceSeriesRef.current = balanceSeries;
    balanceAreaRef.current = balanceArea;

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
      balanceSeriesRef.current = null;
      balanceAreaRef.current = null;
    };
  }, [height]);

  /* ---- push data ---- */
  useEffect(() => {
    const balanceSeries = balanceSeriesRef.current;
    const balanceArea = balanceAreaRef.current;
    if (balanceSeries === null || balanceArea === null) return;

    const balanceData = points.map((p) => ({
      time: toChartTime(p.date),
      value: p.account_balance,
    }));

    balanceSeries.setData(balanceData);
    balanceArea.setData(balanceData);
    chartRef.current?.timeScale().fitContent();
  }, [points]);

  /* ---- header delta chip ---- */
  const headerLabel = useMemo(() => {
    if (points.length === 0) return null;
    const first = points[0]!;
    const last = points[points.length - 1]!;
    return { delta: last.account_balance - first.account_balance };
  }, [points]);

  /*
   * Slice B (T-045, REQ-DCF-004) — Last-point tooltip badge.
   * Same shape as the Performance badge: absolute `+$X.XX`
   * (window delta) + a `+Y.Y%` relative delta.
   */
  const lastPointBadge = useMemo(() => {
    if (points.length === 0) return null;
    const first = points[0]!;
    const last = points[points.length - 1]!;
    const base = first.account_balance;
    const lastBal = last.account_balance;
    const deltaBal = lastBal - base;
    const deltaPct =
      base === 0
        ? lastBal > 0
          ? 9999
          : lastBal < 0
            ? -9999
            : 0
        : Math.max(-9999, Math.min(9999, (deltaBal / Math.abs(base)) * 100));
    return {
      absText: `${deltaBal >= 0 ? '+' : '-'}$${Math.abs(deltaBal).toFixed(2)}`,
      pctText: `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%`,
    };
  }, [points]);

  return (
    <div
      data-testid="dash-capital-curve"
      className={`${CURVE_CARD_CLASS} relative`}
      style={CURVE_CARD_BORDER_STYLE}
    >
      {lastPointBadge !== null ? (
        <div
          data-testid="dash-capital-lastpoint"
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
              Curva de Capital
            </h3>
            {headerSubtitle !== undefined ? (
              <span
                data-testid="dash-capital-subtitle"
                className="font-mono text-[10px] text-text-secondary truncate"
              >
                {headerSubtitle}
              </span>
            ) : (
              <span className="font-mono text-[10px] text-text-muted truncate">
                Balance total de la cuenta
              </span>
            )}
          </div>
        </div>
        {scopeLabel !== null ? (
          <span
            data-testid="dash-capital-scope"
            className="font-display uppercase tracking-wider text-[9px] text-text-secondary"
          >
            · {scopeLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-4 flex-wrap font-mono text-[10px] text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-3 border-t border-dashed"
            style={{ borderColor: CURVE_THEME.primary }}
          />
          <span className="text-text-secondary">Total Balance</span>
          {headerLabel !== null ? (
            <span
              data-testid="dash-capital-delta"
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
      </div>

      <div
        ref={containerRef}
        className="mt-3 -mx-2"
        data-testid="dash-capital-curve-canvas"
        style={{ width: 'calc(100% + 1rem)' }}
      />
    </div>
  );
}