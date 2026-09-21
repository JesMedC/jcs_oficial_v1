// TradingViewChart — embeds the free TradingView Advanced Chart widget.
//
// The widget is rendered via the iframe format documented at
// https://www.tradingview.com/widget-docs/tutorials/iframe/build-page/widget-integration
// — a remote ``<script>`` from ``s3.tradingview.com`` injects an
// iframe inside the ``.tradingview-widget-container__widget`` div and
// reads its constructor options from the JSON literal in the script's
// body text.
//
// Lifecycle:
//
// 1. On mount we create a fresh container div, append it to the
//    ``hostRef``, and inject the embed script. The widget fetches
//    its own real-time forex feed; we never touch the DOM inside the
//    resulting iframe.
// 2. Whenever the ``symbol`` prop changes we remove the previous
//    container + script and re-inject. This is the only documented
//    way to switch symbols without a page reload (per the Dynamic
//    Symbols tutorial). It is a full reload of the iframe each time
//    — known cost of the iframe format.
// 3. On unmount we tear down both the container and the script tag
//    so HMR / route changes do not leak resources.
//
// The component never receives the Dukascopy candle buffer. The
// scanner backend keeps emitting Dukascopy data; the widget displays
// TradingView data. The two are independent and the mismatch is
// documented in the frontend README.

import { useEffect, useRef } from "react";

import { tvSymbolFromDukascopy } from "../utils/tvSymbol";

import styles from "./TradingViewChart.module.css";

/** Stable embed URL — pinned so the test suite can grep for it. */
const TV_ADVANCED_CHART_EMBED_SRC =
  "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" as const;

interface TradingViewChartProps {
  /** Dukascopy slash-notation symbol (e.g. ``EUR/USD``). */
  symbol: string;
}

/**
 * Build the JSON config object the TradingView loader expects in the
 * body of its embed script. Kept in one place so any future option
 * tweak happens in a single, greppable spot.
 */
function buildWidgetOptions(symbol: string) {
  return {
    autosize: true,
    symbol: tvSymbolFromDukascopy(symbol),
    interval: "5",
    timezone: "Etc/UTC",
    theme: "dark",
    style: "1",
    locale: "en",
    // Keep the symbol under scanner control — disable the widget's
    // built-in search dialog.
    allow_symbol_change: false,
    calendar: false,
    support_host: "https://www.tradingview.com",
  };
}

export function TradingViewChart({ symbol }: TradingViewChartProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // 1. Tear down the previous widget container + embed script so the
    //    new ``symbol`` takes effect. We never modify the iframe the
    //    loader creates — the only public API is full re-embed.
    host.replaceChildren();

    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    container.style.height = "100%";
    container.style.width = "100%";

    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.height = "calc(100% - 32px)";
    inner.style.width = "100%";

    container.appendChild(inner);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = TV_ADVANCED_CHART_EMBED_SRC;
    script.async = true;
    // The loader reads its constructor from the script body's text
    // content — JSON.stringify gives us valid JS literal syntax.
    script.text = JSON.stringify(buildWidgetOptions(symbol));

    container.appendChild(script);
    host.appendChild(container);

    return () => {
      // 2. Teardown: drop the container (and its descendants) so the
      //    next mount or symbol change starts from a clean DOM.
      host.replaceChildren();
    };
  }, [symbol]);

  return (
    <div className={styles.tradingview} data-testid="tradingview-chart">
      <div ref={hostRef} className={styles.tradingview__host} />
    </div>
  );
}
