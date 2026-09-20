// Vitest suite for the TradingViewChart embed behaviour.
//
// These tests pin two contracts:
//
// 1. The Advanced Chart embed script is injected with the expected
//    options (mapped through tvSymbolFromDukascopy).
// 2. Changing the ``symbol`` prop tears down the previous embed and
//    re-injects — the only documented way to switch the widget's
//    symbol without a page reload (per the Dynamic Symbols tutorial).
//
// We never reach into the iframe the loader creates — that would be a
// cross-origin touch. We only assert on the script tag the component
// itself owns.
//
// We use React 18's ``createRoot`` directly (no @testing-library/react)
// because the ODD forbids new npm dependencies.

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TradingViewChart } from "../TradingViewChart";

// React 18 warns unless we opt in to the act() environment. We do
// not need @testing-library/react for this — the ODD forbids new npm
// dependencies — so we set the global flag explicitly and silence
// React's "update was not wrapped in act" error noise that does not
// affect correctness here.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null;
beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  consoleErrorSpy?.mockRestore();
  consoleErrorSpy = null;
});

const TV_ADVANCED_CHART_SRC =
  "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

let host: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  if (root) {
    root.unmount();
    root = null;
  }
  if (host && host.parentNode) {
    host.parentNode.removeChild(host);
  }
  host = null;
});

/**
 * The component renders its own outer div with ``data-testid``;
 * query through that to find the injected embed script.
 */
function findEmbedScript(): HTMLScriptElement | null {
  const root = host?.querySelector(
    "[data-testid='tradingview-chart']",
  ) as HTMLElement | null;
  if (!root) return null;
  const scripts = Array.from(root.querySelectorAll("script"));
  for (const s of scripts) {
    if ((s as HTMLScriptElement).src === TV_ADVANCED_CHART_SRC) {
      return s as HTMLScriptElement;
    }
  }
  return null;
}

function renderAt(rootRef: Root, element: React.ReactElement) {
  // ``act`` flushes the useEffect that injects the embed script so it
  // is observable in the same tick.
  act(() => {
    rootRef.render(element);
  });
}

describe("TradingViewChart", () => {
  it("mounts a host element with the embed script", () => {
    renderAt(root!, <TradingViewChart symbol="EUR/USD" />);
    expect(host!.querySelector("[data-testid='tradingview-chart']")).toBeTruthy();
    expect(findEmbedScript()).toBeTruthy();
    // ``host`` is captured by the helper; reference it so ``noUnusedLocals``
    // does not flag it.
    expect(host).toBeTruthy();
  });

  it("maps the Dukascopy symbol to a TradingView symbol in the embed options", () => {
    renderAt(root!, <TradingViewChart symbol="EUR/USD" />);
    const embedScript = findEmbedScript();
    expect(embedScript).toBeTruthy();
    // The loader parses the script body as JSON. Confirm the Dukascopy
    // slash-notation symbol got translated to ``FX:EURUSD``.
    expect(embedScript!.text).toContain('"symbol":"FX:EURUSD"');
  });

  it("locks allow_symbol_change to false so the widget picker stays disabled", () => {
    renderAt(root!, <TradingViewChart symbol="EUR/USD" />);
    const embedScript = findEmbedScript();
    expect(embedScript).toBeTruthy();
    expect(embedScript!.text).toContain('"allow_symbol_change":false');
  });

  it("uses the dark theme to match the rest of the app", () => {
    renderAt(root!, <TradingViewChart symbol="EUR/USD" />);
    const embedScript = findEmbedScript();
    expect(embedScript).toBeTruthy();
    expect(embedScript!.text).toContain('"theme":"dark"');
  });

  it("tears down and re-embeds when the symbol prop changes", () => {
    renderAt(root!, <TradingViewChart symbol="EUR/USD" />);
    const firstScript = findEmbedScript();
    expect(firstScript).toBeTruthy();

    renderAt(root!, <TradingViewChart symbol="GBP/USD" />);

    const gbpScript = findEmbedScript();
    expect(gbpScript).toBeTruthy();
    expect(gbpScript).not.toBe(firstScript);
    // The new script body should reference the new symbol.
    expect(gbpScript!.text).toContain('"symbol":"FX:GBPUSD"');
  });

  it("tears down the embed on unmount", () => {
    renderAt(root!, <TradingViewChart symbol="EUR/USD" />);
    expect(findEmbedScript()).toBeTruthy();
    act(() => {
      root!.unmount();
    });
    expect(findEmbedScript()).toBeNull();
  });
});
