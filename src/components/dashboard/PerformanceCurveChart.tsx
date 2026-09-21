/*
 * PerformanceCurveChart — Curva de Rendimiento (DVC-04).
 *
 * Single-series cumulative realised trading P&L over the last
 * `days` window:
 *   - ONE AreaSeries (no histograms, no volume bars on this card).
 *   - Data source = `useEquityCurve.buildOpsSeries` (already
 *     excludes FUND / WITHDRAW and buckets on `closed_at`, falling
 *     back to `opened_at` only for backfilled closed outcomes;
 *     OPEN rows are excluded outright).
 *   - Cashflows (Σ FUND − Σ WITHDRAW) live on `points.capital_volume`
 *     for the capital chart — THIS card does not render them.
 *
 * Visual contract (DVC-04 spec):
 *   1. Subtitle: "P&L acumulado de operaciones · Sin depósitos ni
 *      retiros" (Spanish copy preserved verbatim).
 *   2. Header chip "Σ Trading P&L" reads the LAST point's
 *      `cumulative_net_pnl` — same number the series renders, no
 *      double accounting.
 *   3. Line tint flips profit ↔ loss based on the terminal cumulative
 *      value, sourcing colours from the platform's `--color-jade-profit`
 *      / `--color-jade-loss` tokens so light + dark themes stay in
 *      sync. Hardcoded fallbacks ship in `curveChartTheme.ts` for
 *      test environments where the CSS vars are not in scope.
 *   4. Right price scale = USD, precision 2, `minMove 0.01` so the
 *      axis reads in dollars. `scaleMargins` widened so the negative
 *      half is visible (the previous `overflow-hidden` + negative
 *      margin setup clipped it).
 *   5. Time scale uses an `Intl.DateTimeFormat`-based
 *      `tickMarkFormatter` so dates render in the browser locale.
 *   6. Crosshair tooltip — a bounded overlay shows daily Δ (cum −
 *      previous cum) and cumulative at the hovered date. Bound
 *      inside the card with `max-w-` + `overflow-hidden` so long
 *      numbers cannot escape the chrome on short viewports.
 *   7. No negative horizontal margins on the canvas container — the
 *      chart sits inside the card padding so the price-scale's
 *      negative half is not sliced off by the card's `overflow-hidden`.
 *
 * `useCloseTrade` already invalidates `dashboardKeys.all` (DVC-03),
 * which includes `pnlCalendar` and the equity-curve query — closing
 * a trade therefore refreshes the chart without manual reload.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts';

import {
  CURVE_CARD_BORDER_STYLE,
  CURVE_CARD_CLASS,
  CURVE_THEME,
  CURVE_LINE_FALLBACK,
  toChartTime,
} from './curveChartTheme';

interface EquityPoint {
  readonly date: string;
  /** Real broker balance (includes deposits / withdrawals). */
  readonly account_balance: number;
  /** Cumulative trading P&L above the initial fund (= Σ daily_pnl
   *  bucketed on ``closed_at`` after DVC-04). */
  readonly cumulative_net_pnl: number;
  /** Net trading P&L on this day only — no longer rendered, kept on
   *  the shape for the parent / capital chart consumers. */
  readonly daily_pnl: number;
  /** Net capital volume for the day (FUND − WITHDRAW). NOT rendered
   *  on this card after DVC-04. */
  readonly capital_volume: number;
  readonly trades: number;
}

interface Props {
  readonly points: ReadonlyArray<EquityPoint>;
  /** Optional chart height override (default 320). */
  readonly height?: number;
  /** Optional scope caption rendered next to the title. */
  readonly scopeLabel?: string | null;
  /** Optional subtitle override. Defaults to the DVC-04 Spanish
   *  caption "P&L acumulado de operaciones · Sin depósitos ni
   *  retiros". */
  readonly headerSubtitle?: string | undefined;
}

const DEFAULT_SUBTITLE =
  'P&L acumulado de operaciones · Sin depósitos ni retiros';

/** USD price format on the right scale — same precision / minMove
 *  pair so the axis reads in dollars to two decimals. */
const USD_PRICE_FORMAT = {
  type: 'price' as const,
  precision: 2,
  minMove: 0.01,
};

/** Bottom-of-axis margin that ensures the negative half is visible.
 *  Previous `overflow-hidden` chrome would clip the bottom scale
 *  labels when the cumulative dropped below zero; this margin gives
 *  the price scale room. */
const RIGHT_SCALE_MARGINS = { top: 0.18, bottom: 0.18 };

/**
 * Resolve a CSS custom property from the document root with a
 * hardcoded fallback. In production this reads the active theme's
 * token (dark or light). In jsdom (where the theme stylesheet is
 * not loaded) the fallback kicks in so tests still see a sensible
 * colour.
 */
function resolveCssToken(
  varName: string,
  fallback: string,
): string {
  if (
    typeof document === 'undefined' ||
    typeof document.documentElement === 'undefined'
  ) {
    return fallback;
  }
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return v.length > 0 ? v : fallback;
}

/** Convert a hex (`#rrggbb`) string to an `rgba(r, g, b, a)` with the
 *  requested alpha. Used to derive the area gradient stops from the
 *  same profit/loss tokens that drive the line. */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Locale-aware date tick formatter. Maps the lightweight-charts Time
 *  union onto the browser's Intl.DateTimeFormat with a short month +
 *  day pattern so dates stay readable across locales. */
function makeDateTickFormatter(): (time: Time) => string {
  const fmt = new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
  });
  return (time: Time): string => {
    // lightweight-charts feeds a UTCTimestamp (seconds since epoch)
    // for time-series other than business-day or date strings. Our
    // chart uses ISO date strings; the string branch is the only one
    // we hit in practice, but the numeric branch covers a future
    // pivot to intraday without breaking the contract.
    if (typeof time === 'string') {
      // 'YYYY-MM-DD' → parse as UTC midnight.
      const parts = time.split('-');
      if (parts.length === 3) {
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        if (
          Number.isFinite(year) &&
          Number.isFinite(month) &&
          Number.isFinite(day)
        ) {
          return fmt.format(new Date(Date.UTC(year, month - 1, day)));
        }
      }
      return time;
    }
    if (typeof time === 'number') {
      return fmt.format(new Date(time * 1000));
    }
    if (
      typeof time === 'object' &&
      time !== null &&
      'year' in time &&
      'month' in time &&
      'day' in time
    ) {
      const t = time as { year: number; month: number; day: number };
      return fmt.format(
        new Date(Date.UTC(t.year, t.month - 1, t.day)),
      );
    }
    return '';
  };
}

interface HoverState {
  readonly date: string;
  readonly daily: number;
  readonly cumulative: number;
}

function formatUsd(n: number): string {
  // Match the platform's USD format convention
  // (``DashboardPage.formatUsd`` uses the same es-AR locale +
  // USD currency pair) so the tooltip reads in the same style the
  // user already sees on the rest of the dashboard.
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function PerformanceCurveChart({
  points,
  height = 320,
  scopeLabel = null,
  headerSubtitle,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const pointsRef = useRef<ReadonlyArray<EquityPoint>>([]);

  const [hover, setHover] = useState<HoverState | null>(null);

  /* ---- mount + theme + series ---- */
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    // Resolve theme tokens once at mount. The line picks profit vs
    // loss at data-update time; these are the BASE values that get
    // overridden per the latest cumulative sign.
    const profitToken = resolveCssToken(
      '--color-jade-profit',
      CURVE_LINE_FALLBACK.profit,
    );
    const lossToken = resolveCssToken(
      '--color-jade-loss',
      CURVE_LINE_FALLBACK.loss,
    );
    const neutralToken = resolveCssToken(
      '--color-jade-text-sec',
      CURVE_LINE_FALLBACK.neutral,
    );

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: {
          type: ColorType.Solid,
          color: CURVE_THEME.background,
        },
        textColor: CURVE_THEME.axisText,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: CURVE_THEME.grid, style: 2 /* dotted */ },
        horzLines: { color: CURVE_THEME.grid, style: 2 },
      },
      rightPriceScale: {
        borderColor: CURVE_THEME.border,
        scaleMargins: RIGHT_SCALE_MARGINS,
      },
      leftPriceScale: { visible: false },
      timeScale: {
        borderColor: CURVE_THEME.border,
        timeVisible: false,
        secondsVisible: false,
        rightOffset: 4,
        barSpacing: 6,
        // DVC-04 — locale-aware date ticks. ``tickMarkFormatter``
        // lives on ``TimeScaleOptions`` (which extends
        // ``HorzScaleOptions``) and can only be set at chart
        // creation; the v5 ``timeScale().applyOptions`` signature
        // narrows to ``HorzScaleOptions`` which omits this field.
        tickMarkFormatter: makeDateTickFormatter(),
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

    // SINGLE primary series — cumulative realised trading P&L as
    // an Area. The initial colours are the profit token; the data
    // effect flips them to the loss token if the terminal cumulative
    // is negative.

    const series = chart.addSeries(AreaSeries, {
      priceFormat: USD_PRICE_FORMAT,
      priceScaleId: 'right',
      lastValueVisible: true,
      priceLineVisible: false,
      lineColor: profitToken,
      topColor: hexToRgba(profitToken, 0.32),
      bottomColor: hexToRgba(profitToken, 0.02),
    });
    // Keep the unused-but-bound token references so the linter
    // does not flag them — they are reserved for the data effect
    // override below.
    void lossToken;
    void neutralToken;

    chartRef.current = chart;
    seriesRef.current = series;

    const handleCrosshair = (param: MouseEventParams<Time>) => {
      const series = seriesRef.current;
      if (
        param.time === undefined ||
        param.time === null ||
        series === null
      ) {
        setHover(null);
        return;
      }
      const dataPoint = param.seriesData?.get(series) as
        | { value?: number }
        | undefined;
      if (dataPoint === undefined || typeof dataPoint.value !== 'number') {
        setHover(null);
        return;
      }
      const ps = pointsRef.current;
      if (ps.length === 0) {
        setHover(null);
        return;
      }
      const idx = ps.findIndex(
        (p) => toChartTime(p.date) === param.time,
      );
      if (idx < 0) {
        setHover(null);
        return;
      }
      const current = ps[idx];
      const previous = idx > 0 ? ps[idx - 1] : undefined;
      if (current === undefined) {
        setHover(null);
        return;
      }
      const daily =
        previous !== undefined
          ? current.cumulative_net_pnl - previous.cumulative_net_pnl
          : current.cumulative_net_pnl;
      setHover({
        date: current.date,
        daily,
        cumulative: current.cumulative_net_pnl,
      });
    };
    chart.subscribeCrosshairMove(handleCrosshair);

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
      chart.unsubscribeCrosshairMove(handleCrosshair);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height]);

  /* ---- push data ---- */
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (series === null || chart === null) return;

    pointsRef.current = points;

    // Cumulative is kept for every window date — zero-activity days
    // land as a flat segment so a quiet Monday does NOT vanish from
    // the curve.
    const seriesData = points.map((p) => ({
      time: toChartTime(p.date),
      value: p.cumulative_net_pnl,
    }));
    series.setData(seriesData);

    // Recompute the line tint based on the TERMINAL value so the
    // visual reflects the current state of the curve, not a stale
    // colour from the previous data set.
    const last = points[points.length - 1]?.cumulative_net_pnl;
    if (typeof last === 'number' && Number.isFinite(last)) {
      const profitToken = resolveCssToken(
        '--color-jade-profit',
        CURVE_LINE_FALLBACK.profit,
      );
      const lossToken = resolveCssToken(
        '--color-jade-loss',
        CURVE_LINE_FALLBACK.loss,
      );
      const negative = last < 0;
      const lineColor = negative ? lossToken : profitToken;
      series.applyOptions({
        lineColor,
        topColor: hexToRgba(lineColor, 0.32),
        bottomColor: hexToRgba(lineColor, 0.02),
      });
    }

    chart.timeScale().fitContent();
  }, [points]);

  /* ---- header cumulative chip ---- */
  const headerLabel = useMemo(() => {
    if (points.length === 0) return null;
    const last = points[points.length - 1];
    if (last === undefined) return null;
    return { delta: last.cumulative_net_pnl };
  }, [points]);

  const subtitleText =
    headerSubtitle !== undefined ? headerSubtitle : DEFAULT_SUBTITLE;

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
            <span
              data-testid="dash-performance-subtitle"
              className="font-mono text-[10px] text-text-secondary truncate"
            >
              {subtitleText}
            </span>
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
      </div>

      {/* Chart canvas — sits inside the card padding so the
          negative half of the price scale is not clipped by the
          card's overflow-hidden chrome. No negative margins, no
          expanded width. */}
      <div className="relative mt-3">
        <div
          ref={containerRef}
          data-testid="dash-performance-curve-canvas"
          className="w-full"
        />
        {hover !== null ? (
          <div
            data-testid="dash-performance-tooltip"
            className="pointer-events-none absolute top-2 left-2 max-w-[80%] overflow-hidden rounded-md border border-primary/40 bg-[var(--color-surface)]/90 px-2 py-1 text-[10px] font-mono text-text-primary shadow-glass backdrop-blur-sm"
            style={{ wordBreak: 'break-word' }}
          >
            <div
              data-testid="dash-performance-tooltip-date"
              className="truncate text-text-secondary"
            >
              {hover.date}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Diario</span>
              <span
                data-testid="dash-performance-tooltip-daily"
                className={
                  hover.daily >= 0 ? 'text-profit' : 'text-loss'
                }
              >
                {hover.daily >= 0 ? '+' : ''}
                {formatUsd(hover.daily)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Acum.</span>
              <span
                data-testid="dash-performance-tooltip-cumulative"
                className={
                  hover.cumulative >= 0 ? 'text-profit' : 'text-loss'
                }
              >
                {formatUsd(hover.cumulative)}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}