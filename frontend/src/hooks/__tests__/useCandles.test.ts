// Vitest suite for the WS message handling logic in useCandles.
//
// The reducers in useCandles.ts are pure functions so the live update
// semantics can be tested without spinning up a real WebSocket. These
// tests pin down the contract the chart relies on.

import { describe, expect, it } from "vitest";

import {
  BUFFER_CAP,
  applyCandleTick,
  applyCandlesSeed,
  applyHello,
  capCandles,
  initialCandlesState,
} from "../useCandles";
import type {
  Candle,
  CandleMessage,
  HelloMessage,
  IndicatorsPayload,
} from "../../types";

// --------------------------------------------------------------------- //
// Helpers
// --------------------------------------------------------------------- //

function makeCandle(timestamp: string, close: number): Candle {
  return {
    timestamp,
    open: close,
    high: close,
    low: close,
    close,
    volume: 0,
  };
}

function makeIndicators(): IndicatorsPayload {
  return {
    series: {
      ema_fast: [{ time: 1737158400, value: 1.15 }],
      ema_mid: [{ time: 1737158400, value: 1.14 }],
      ema_slow: [{ time: 1737158400, value: 1.13 }],
      bb_upper: [{ time: 1737158400, value: 1.16 }],
      bb_middle: [{ time: 1737158400, value: 1.15 }],
      bb_lower: [{ time: 1737158400, value: 1.14 }],
    },
    latest: {
      ema_fast: 1.15,
      ema_mid: 1.14,
      ema_slow: 1.13,
      bb_upper: 1.16,
      bb_middle: 1.15,
      bb_lower: 1.14,
    },
  };
}

function makeHello(candles: Candle[]): HelloMessage {
  return {
    type: "hello",
    symbol: "EUR/USD",
    interval_minutes: 5,
    candles,
    indicators: makeIndicators(),
    alerts: [],
    server_time: "2026-01-01T00:00:00Z",
  };
}

function makeCandleMessage(buffer: Candle[]): CandleMessage {
  const last = buffer[buffer.length - 1] ?? null;
  return {
    type: "candle",
    symbol: "EUR/USD",
    interval_minutes: 5,
    ts: last?.timestamp ?? null,
    candle: last,
    buffer,
    indicators: makeIndicators(),
  };
}

// --------------------------------------------------------------------- //
// Tests
// --------------------------------------------------------------------- //

describe("initialCandlesState", () => {
  it("starts empty", () => {
    expect(initialCandlesState.candles).toEqual([]);
    expect(initialCandlesState.indicators).toBeNull();
  });
});

describe("capCandles", () => {
  it("returns input unchanged when within cap", () => {
    const input = [makeCandle("2026-01-01T00:00:00Z", 1.15)];
    expect(capCandles(input)).toBe(input);
  });

  it("drops oldest when over the cap", () => {
    const input = Array.from({ length: BUFFER_CAP + 10 }, (_, i) =>
      makeCandle(
        new Date(Date.UTC(2026, 0, 1, 0, i * 5)).toISOString(),
        1.15 + i * 0.0001,
      ),
    );
    const capped = capCandles(input);
    expect(capped).toHaveLength(BUFFER_CAP);
    // The oldest 10 must be dropped; the first retained is the 11th input.
    expect(capped[0].close).toBeCloseTo(1.15 + 10 * 0.0001, 5);
  });
});

describe("applyHello", () => {
  it("replaces state with the hello snapshot", () => {
    const candles = [makeCandle("2026-01-01T00:00:00Z", 1.15)];
    const indicators = makeIndicators();
    const next = applyHello(makeHello(candles));
    expect(next.candles).toEqual(candles);
    expect(next.indicators).toEqual(indicators);
  });

  it("caps the snapshot buffer at BUFFER_CAP", () => {
    const candles = Array.from({ length: BUFFER_CAP + 25 }, (_, i) =>
      makeCandle(`2026-01-01T00:${i}:00Z`, 1.15),
    );
    const next = applyHello(makeHello(candles));
    expect(next.candles).toHaveLength(BUFFER_CAP);
  });
});

describe("applyCandleTick", () => {
  it("replaces the buffer with msg.buffer and updates indicators", () => {
    const buffer = [
      makeCandle("2026-01-01T00:00:00Z", 1.15),
      makeCandle("2026-01-01T00:05:00Z", 1.16),
    ];
    const next = applyCandleTick(makeCandleMessage(buffer));
    expect(next.candles).toEqual(buffer);
    expect(next.indicators?.latest.bb_middle).toBeCloseTo(1.15);
  });

  it("keeps only the latest BUFFER_CAP candles", () => {
    const buffer = Array.from({ length: BUFFER_CAP + 5 }, (_, i) =>
      makeCandle(`2026-01-01T00:${i}:00Z`, 1.0),
    );
    const next = applyCandleTick(makeCandleMessage(buffer));
    expect(next.candles).toHaveLength(BUFFER_CAP);
  });
});

describe("applyCandlesSeed", () => {
  it("seeds candles without touching indicators", () => {
    const seeded = applyCandlesSeed(initialCandlesState, [
      makeCandle("2026-01-01T00:00:00Z", 1.15),
    ]);
    expect(seeded.candles).toHaveLength(1);
    // Indicators stay null until the WS hello arrives.
    expect(seeded.indicators).toBeNull();
  });

  it("caps the seed buffer at BUFFER_CAP", () => {
    const candles = Array.from({ length: BUFFER_CAP + 50 }, (_, i) =>
      makeCandle(`2026-01-01T00:${i}:00Z`, 1.0),
    );
    const next = applyCandlesSeed(initialCandlesState, candles);
    expect(next.candles).toHaveLength(BUFFER_CAP);
  });
});
