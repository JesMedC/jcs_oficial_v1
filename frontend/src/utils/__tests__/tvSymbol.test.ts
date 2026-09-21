// Vitest suite for the Dukascopy ↔ TradingView symbol mapping.
//
// These helpers are the single seam where the scanner's slash-notation
// symbols meet the widget's ``{EXCHANGE}:{NAME}`` notation, so the
// fixtures here pin the current TradingView forex prefix (``FX``) as
// documented. If TradingView ever changes the prefix, the failing
// assertion will point at exactly this file.

import { describe, expect, it } from "vitest";

import {
  TV_FOREX_EXCHANGE_PREFIX,
  dukascopyFromTvSymbol,
  tvSymbolFromDukascopy,
} from "../tvSymbol";

describe("TV_FOREX_EXCHANGE_PREFIX", () => {
  it("pins the TradingView forex prefix to 'FX'", () => {
    // TradingView uses the literal "FX" exchange prefix for forex
    // pairs in the Advanced Chart widget's ``symbol`` option. Pinned
    // here so the rest of the codebase can rely on a named constant.
    expect(TV_FOREX_EXCHANGE_PREFIX).toBe("FX");
  });
});

describe("tvSymbolFromDukascopy", () => {
  it("maps EUR/USD to FX:EURUSD", () => {
    expect(tvSymbolFromDukascopy("EUR/USD")).toBe("FX:EURUSD");
  });

  it("maps GBP/USD to FX:GBPUSD", () => {
    expect(tvSymbolFromDukascopy("GBP/USD")).toBe("FX:GBPUSD");
  });

  it("upper-cases lower-case input", () => {
    expect(tvSymbolFromDukascopy("eur/usd")).toBe("FX:EURUSD");
  });

  it("trims surrounding whitespace", () => {
    expect(tvSymbolFromDukascopy("  EUR/USD  ")).toBe("FX:EURUSD");
  });

  it("passes through values that already look like TradingView symbols", () => {
    expect(tvSymbolFromDukascopy("FX:EURUSD")).toBe("FX:EURUSD");
    expect(tvSymbolFromDukascopy("BINANCE:BTCUSDT")).toBe("BINANCE:BTCUSDT");
  });

  it("returns the bare prefix for empty input (caller can decide)", () => {
    expect(tvSymbolFromDukascopy("")).toBe("FX:");
    expect(tvSymbolFromDukascopy("   ")).toBe("FX:");
  });

  it("round-trips through dukascopyFromTvSymbol for known forex pairs", () => {
    const pairs = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"];
    for (const pair of pairs) {
      expect(dukascopyFromTvSymbol(tvSymbolFromDukascopy(pair))).toBe(pair);
    }
  });
});

describe("dukascopyFromTvSymbol", () => {
  it("maps FX:EURUSD to EUR/USD", () => {
    expect(dukascopyFromTvSymbol("FX:EURUSD")).toBe("EUR/USD");
  });

  it("maps FX:GBPUSD to GBP/USD", () => {
    expect(dukascopyFromTvSymbol("FX:GBPUSD")).toBe("GBP/USD");
  });

  it("is case-insensitive on the prefix", () => {
    expect(dukascopyFromTvSymbol("fx:eurusd")).toBe("EUR/USD");
  });

  it("returns non-forex TradingView symbols unchanged", () => {
    // Crypto / equity symbols do not have a Dukascopy slash form;
    // pass them through verbatim so the caller can route differently.
    expect(dukascopyFromTvSymbol("BINANCE:BTCUSDT")).toBe("BINANCE:BTCUSDT");
    expect(dukascopyFromTvSymbol("NASDAQ:AAPL")).toBe("NASDAQ:AAPL");
  });

  it("returns empty string for empty input", () => {
    expect(dukascopyFromTvSymbol("")).toBe("");
    expect(dukascopyFromTvSymbol("   ")).toBe("");
  });

  it("returns the input unchanged when there is no colon", () => {
    expect(dukascopyFromTvSymbol("EURUSD")).toBe("EURUSD");
  });
});
