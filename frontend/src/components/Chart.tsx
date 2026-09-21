// Chart — TradingView lightweight-charts wrapper.
//
// Lifecycle:
//
// 1. On mount, ``createChart`` paints a dark-themed chart onto the
//    container ref and registers seven series:
//    - 1 candlestick series for OHLCV.
//    - 3 line series for EMA 50 / 100 / 200 overlays.
//    - 3 line series for Bollinger upper / middle / lower.
//
// 2. Whenever ``candles`` or ``indicators`` change we feed the series
//    with ``setData``. Set-data is fine here: lightweight-charts
//    diffs internally and the buffer is bounded at 500 bars.
//
// 3. A ``ResizeObserver`` keeps the chart filling its parent. Without
//    it the canvas would not respond to split-screen resizes.
//
// 4. The chart is fully torn down on unmount so HMR + test isolation
//    do not leak resources.
//
// Empty buffer handling: we still create the chart (so the user sees
// the dark canvas and not a flash of nothing), but we skip ``setData``
// calls until at least one candle arrives. This matches the spec
// "the chart must handle the buffer arriving empty without crashing".

import { useEffect, useRef } from "react";
import {
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
} from "lightweight-charts";

import type { Candle, IndicatorsPayload } from "../types";

import styles from "./Chart.module.css";

interface ChartProps {
  candles: Candle[];
  indicators: IndicatorsPayload | null;
}

// Visual palette — keep in sync with index.css tokens.
const COLORS = {
  emaFast: "#f59e0b", // amber
  emaMid: "#3b82f6", // blue
  emaSlow: "#ef4444", // red (most important)
  bb: "#6b7280", // gray-500
} as const;

function candleToCandlestick(c: Candle): CandlestickData {
  return {
    time: toUtc(c.timestamp),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  };
}

function toUtc(iso: string): UTCTimestamp {
  return Math.floor(new Date(iso).getTime() / 1000) as UTCTimestamp;
}

export function Chart({ candles, indicators }: ChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const emaFastSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emaMidSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emaSlowSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbMidSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  // 1. Chart + series creation (once per mount).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "#0a0e1a" },
        textColor: "#e5e7eb",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#374151" },
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: false, // we manage sizing manually via ResizeObserver
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    const emaFastSeries = chart.addLineSeries({
      color: COLORS.emaFast,
      lineWidth: 1,
      title: "EMA 50",
    });
    const emaMidSeries = chart.addLineSeries({
      color: COLORS.emaMid,
      lineWidth: 1,
      title: "EMA 100",
    });
    const emaSlowSeries = chart.addLineSeries({
      color: COLORS.emaSlow,
      lineWidth: 2,
      title: "EMA 200",
    });

    const bbUpperSeries = chart.addLineSeries({
      color: COLORS.bb,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      title: "BB upper",
    });
    const bbMidSeries = chart.addLineSeries({
      color: COLORS.bb,
      lineWidth: 1,
      title: "BB middle",
    });
    const bbLowerSeries = chart.addLineSeries({
      color: COLORS.bb,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      title: "BB lower",
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    emaFastSeriesRef.current = emaFastSeries;
    emaMidSeriesRef.current = emaMidSeries;
    emaSlowSeriesRef.current = emaSlowSeries;
    bbUpperSeriesRef.current = bbUpperSeries;
    bbMidSeriesRef.current = bbMidSeries;
    bbLowerSeriesRef.current = bbLowerSeries;

    // Resize handling — the split-screen can resize the panel when the
    // user drags its edge or when the browser window changes.
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          chart.applyOptions({ width, height });
        }
      }
    });
    resizeObserver.observe(container);

    // Initial sizing — defer one frame so the container has dimensions.
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      chart.applyOptions({ width: rect.width, height: rect.height });
    }

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      emaFastSeriesRef.current = null;
      emaMidSeriesRef.current = null;
      emaSlowSeriesRef.current = null;
      bbUpperSeriesRef.current = null;
      bbMidSeriesRef.current = null;
      bbLowerSeriesRef.current = null;
    };
  }, []);

  // 2. Push candles whenever the buffer changes.
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    if (candles.length === 0) {
      series.setData([]);
      return;
    }
    series.setData(candles.map(candleToCandlestick));
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // 3. Push indicator series whenever the payload changes.
  useEffect(() => {
    if (!indicators) return;
    const {
      emaFastSeriesRef: ef,
      emaMidSeriesRef: em,
      emaSlowSeriesRef: es,
      bbUpperSeriesRef: bu,
      bbMidSeriesRef: bm,
      bbLowerSeriesRef: bl,
    } = {
      emaFastSeriesRef,
      emaMidSeriesRef,
      emaSlowSeriesRef,
      bbUpperSeriesRef,
      bbMidSeriesRef,
      bbLowerSeriesRef,
    };
    ef.current?.setData(indicators.series.ema_fast as LineData[]);
    em.current?.setData(indicators.series.ema_mid as LineData[]);
    es.current?.setData(indicators.series.ema_slow as LineData[]);
    bu.current?.setData(indicators.series.bb_upper as LineData[]);
    bm.current?.setData(indicators.series.bb_middle as LineData[]);
    bl.current?.setData(indicators.series.bb_lower as LineData[]);
  }, [indicators]);

  const isEmpty = candles.length === 0;

  return (
    <div className={styles.chart}>
      <div ref={containerRef} className={styles.chart__canvas} />
      {isEmpty && (
        <div className={styles.chart__empty}>
          Waiting for first candle…
        </div>
      )}
    </div>
  );
}
