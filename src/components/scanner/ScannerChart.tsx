/*
 * ScannerChart — right-column TradingView chart for the Scanner page.
 *
 * Three sections stacked vertically inside one lightweight-charts
 * canvas:
 *
 *   1. Main pane (~72% of canvas height): candlestick series + EMA 200
 *      overlay (jade LineSeries).
 *   2. Sub-pane (~28% of canvas height, separate ``osc`` price scale):
 *      Stochastic %K + %D lines + flat reference markers at
 *      10/20/80/90 so the overbought/oversold zones are visible.
 *
 * Both panes have explicit heights so the chart doesn't leave an
 * empty strip between them (the previous version called setHeight
 * only on the osc pane, which left the candle pane at its default
 * height and produced a large gap in the middle of the canvas).
 *
 * Pair selector: a glass dropdown anchored above the canvas. The
 * universe comes from a hardcoded constant that mirrors the scanner
 * backend's UNIVERSE list.
 *
 * Resize-aware via ResizeObserver; chart instance + series are torn
 * down on unmount.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';

import { fetchChart, type ChartPayload } from '../../features/scanner/scannerApi';

interface ScannerChartProps {
  /** Initial pair to render. Defaults to 'EUR/USD'. */
  readonly defaultPair?: string;
}

const PAIR_UNIVERSE: ReadonlyArray<string> = [
  'EUR/USD',
  'USD/JPY',
  'GBP/USD',
  'USD/CHF',
  'AUD/USD',
  'USD/CAD',
  'NZD/USD',
  'EUR/GBP',
  'EUR/JPY',
  'EUR/AUD',
  'GBP/JPY',
  'AUD/CAD',
  'AUD/NZD',
  'CAD/CHF',
  'NZD/JPY',
];

// Theme tokens — match curveChartTheme.ts so the visuals stay aligned.
const CHART_BACKGROUND = 'rgba(13, 21, 30, 0.7)';
const CHART_BORDER = 'rgba(0, 255, 157, 0.18)';
const CHART_BORDER_STRONG = 'rgba(0, 255, 157, 0.45)';
const CHART_GRID = 'rgba(0, 255, 157, 0.08)';
const CHART_AXIS_TEXT = 'rgba(255, 255, 255, 0.55)';
const JADE = '#00E676';
const JADE_SOFT = 'rgba(0, 230, 118, 0.55)';
const JADE_FAINT = 'rgba(0, 230, 118, 0.15)';
const CYAN = '#00B8FF';
const LOSS = '#f44336';

/** Convert an ISO ``...Z`` string to a UTCTimestamp (seconds since epoch). */
function isoToUnixSec(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

function candleTime(iso: string): UTCTimestamp {
  return isoToUnixSec(iso) as UTCTimestamp;
}

export function ScannerChart({ defaultPair = 'EUR/USD' }: ScannerChartProps): JSX.Element {
  const [pair, setPair] = useState<string>(defaultPair);
  const [payload, setPayload] = useState<ChartPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const kSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const dSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const refLinesRef = useRef<ReadonlyArray<ISeriesApi<'Line'>>>([]);

  /* ---- fetch when pair changes ---- */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchChart(pair)
      .then((data) => {
        if (cancelled) return;
        setPayload(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'No se pudo cargar el chart';
        setError(msg);
        setPayload(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pair]);

  /* ---- chart mount + theme + series wiring ---- */
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;

    const chart = createChart(container, {
      width: w,
      height: h,
      layout: {
        background: { type: ColorType.Solid, color: CHART_BACKGROUND },
        textColor: CHART_AXIS_TEXT,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: CHART_GRID, style: 2 },
        horzLines: { color: CHART_GRID, style: 2 },
      },
      // Minimize the inner padding so candles fill ~all of the candle
      // pane (the previous top: 0.05 / bottom: 0.32 left a fat empty
      // strip below the candles which was the dominant visual bug).
      rightPriceScale: {
        borderColor: CHART_BORDER,
        scaleMargins: { top: 0.02, bottom: 0.02 },
      },
      leftPriceScale: { visible: false },
      timeScale: {
        borderColor: CHART_BORDER_STRONG,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 4,
        barSpacing: 6,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: JADE_SOFT,
          width: 1,
          style: 2,
          labelBackgroundColor: JADE,
        },
        horzLine: {
          color: JADE_SOFT,
          width: 1,
          style: 2,
          labelBackgroundColor: JADE,
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

    // --- MAIN PANE (candles + EMA 200) ------------------------------
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: JADE,
      downColor: LOSS,
      borderUpColor: JADE,
      borderDownColor: LOSS,
      wickUpColor: JADE,
      wickDownColor: LOSS,
    });
    const emaSeries = chart.addSeries(LineSeries, {
      color: JADE,
      lineWidth: 2,
      priceScaleId: 'right',
      lastValueVisible: true,
      priceLineVisible: false,
      title: 'EMA 200',
    });

    // --- SUB-PANE (stochastic oscillator) ----------------------------
    // Set HEIGHTS on BOTH panes so the chart doesn't leave a gap in
    // the middle. Proportions: 72% candles / 28% oscillator.
    const paneMain = chart.panes()[0];
    const oscPane = chart.addPane();
    const paneMainHeight = Math.round(h * 0.72);
    const oscPaneHeight = h - paneMainHeight;
    paneMain?.setHeight(paneMainHeight);
    oscPane.setHeight(oscPaneHeight);

    const kSeries = chart.addSeries(
      LineSeries,
      {
        color: JADE,
        lineWidth: 2,
        priceScaleId: 'osc',
        lastValueVisible: true,
        priceLineVisible: false,
        title: '%K',
      },
      1,
    );
    const dSeries = chart.addSeries(
      LineSeries,
      {
        color: CYAN,
        lineWidth: 1,
        priceScaleId: 'osc',
        lastValueVisible: true,
        priceLineVisible: false,
        title: '%D',
      },
      1,
    );

    // Pane-scoped scale options. Without ``paneIndex: 1`` v5 searches
    // pane 0 where 'osc' doesn't exist and throws.
    chart.priceScale('osc', 1).applyOptions({
      borderColor: CHART_BORDER_STRONG,
      scaleMargins: { top: 0.05, bottom: 0.05 },
      // Pin 0-100 since Stochastic is bounded — keeps %K/%D lines
      // visually stable across the whole session.
      autoScale: false,
    });
    // After autoScale:false set the visible range manually so the
    // oscillator stays anchored to 0..100.
    try {
      chart.priceScale('osc', 1).setVisibleRange?.({ from: 0, to: 100 } as never);
    } catch {
      // setVisibleRange may not exist in all builds — autoScale:false
      // alone is enough for our purposes.
    }

    // Reference markers at 10/20/80/90 to anchor the OB/OS zones.
    // Two flat line series per marker; 90/10 are stronger (more
    // opaque) than 80/20 because they mark the actual extremes.
    const marker20 = chart.addSeries(
      LineSeries,
      { color: JADE_FAINT, lineWidth: 1, lineStyle: 2, priceScaleId: 'osc', title: '20' },
      1,
    );
    const marker80 = chart.addSeries(
      LineSeries,
      { color: JADE_FAINT, lineWidth: 1, lineStyle: 2, priceScaleId: 'osc', title: '80' },
      1,
    );
    const marker10 = chart.addSeries(
      LineSeries,
      { color: JADE_SOFT, lineWidth: 1, priceScaleId: 'osc', title: '10' },
      1,
    );
    const marker90 = chart.addSeries(
      LineSeries,
      { color: JADE_SOFT, lineWidth: 1, priceScaleId: 'osc', title: '90' },
      1,
    );

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    emaSeriesRef.current = emaSeries;
    kSeriesRef.current = kSeries;
    dSeriesRef.current = dSeries;
    refLinesRef.current = [marker20, marker80, marker10, marker90];

    const ro = new ResizeObserver(() => {
      if (chartRef.current !== null && container !== null) {
        const newW = container.clientWidth;
        const newH = container.clientHeight;
        if (newW === 0 || newH === 0) return;
        chartRef.current.applyOptions({ width: newW, height: newH });
        const newMainH = Math.round(newH * 0.72);
        paneMain?.setHeight(newMainH);
        oscPane.setHeight(newH - newMainH);
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      emaSeriesRef.current = null;
      kSeriesRef.current = null;
      dSeriesRef.current = null;
      refLinesRef.current = [];
    };
  }, []);

  /* ---- push data ---- */
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const emaSeries = emaSeriesRef.current;
    const kSeries = kSeriesRef.current;
    const dSeries = dSeriesRef.current;
    const refLines = refLinesRef.current;
    if (
      candleSeries === null ||
      emaSeries === null ||
      kSeries === null ||
      dSeries === null ||
      refLines.length !== 4 ||
      payload === null
    ) {
      return;
    }

    const candleData = payload.candles.map((c) => ({
      time: candleTime(c.time),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeries.setData(candleData as never);

    const emaData = payload.ema.values
      .filter((p) => Number.isFinite(p.value))
      .map((p) => ({ time: candleTime(p.time), value: p.value }));
    emaSeries.setData(emaData as never);

    const kData = payload.stochastic.k
      .filter((p) => Number.isFinite(p.value))
      .map((p) => ({ time: candleTime(p.time), value: p.value }));
    kSeries.setData(kData as never);

    const dData = payload.stochastic.d
      .filter((p) => Number.isFinite(p.value))
      .map((p) => ({ time: candleTime(p.time), value: p.value }));
    dSeries.setData(dData as never);

    // Flat reference lines across the visible candles (one per
    // candle timestamp so the marker spans the whole series).
    const mkFlat = (y: number) =>
      candleData.map((c, i) => ({
        time: candleData[i]?.time ?? c.time,
        value: y,
      }));
    refLines[0]?.setData(mkFlat(20) as never);
    refLines[1]?.setData(mkFlat(80) as never);
    refLines[2]?.setData(mkFlat(10) as never);
    refLines[3]?.setData(mkFlat(90) as never);

    chartRef.current?.timeScale().fitContent();
  }, [payload]);

  const lastCandleTime = useMemo<string | null>(() => {
    if (payload === null || payload.candles.length === 0) return null;
    const last = payload.candles[payload.candles.length - 1];
    return last?.time ?? null;
  }, [payload]);

  return (
    <section
      data-testid="scanner-chart"
      className="rounded-xl border border-primary/20 bg-[rgba(13,21,30,0.7)] backdrop-blur-md p-4 flex flex-col gap-3 min-h-[560px]"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="font-display uppercase tracking-wide text-sm text-text-primary">
            Analizador de mercado · M5
          </h2>
          {lastCandleTime !== null ? (
            <span
              data-testid="scanner-chart-last-bar"
              className="font-mono text-[10px] uppercase tracking-widest text-text-muted"
            >
              Última barra: {lastCandleTime}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="scanner-chart-pair-select"
            className="font-display uppercase tracking-wide text-[10px] text-text-muted"
          >
            Par
          </label>
          <select
            id="scanner-chart-pair-select"
            data-testid="scanner-chart-pair-select"
            value={pair}
            onChange={(e) => setPair(e.target.value)}
            className="px-3 py-1.5 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {PAIR_UNIVERSE.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </header>

      {error !== null ? (
        <div
          role="alert"
          data-testid="scanner-chart-error"
          className="px-3 py-2 bg-loss/15 border border-loss/40 rounded-lg text-loss font-body text-sm"
        >
          {error}
        </div>
      ) : null}
      {loading && payload === null ? (
        <div
          data-testid="scanner-chart-loading"
          className="flex-1 flex items-center justify-center text-text-muted font-body text-sm"
        >
          Cargando velas e indicadores…
        </div>
      ) : null}

      <div
        ref={containerRef}
        className="flex-1 min-h-[480px] w-full"
        data-testid="scanner-chart-canvas"
      />
    </section>
  );
}
