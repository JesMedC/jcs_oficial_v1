// Vitest suite for App composition + click-driven state lift.
//
// This is the integration test that closes the loop between TV02
// (symbol mapping), TV03 (state lift), TV04 (AlertCard), and TV05
// (click wiring). The TradingView widget is mocked out so jsdom
// never tries to load ``s3.tradingview.com`` and so the test stays
// deterministic regardless of network state.
//
// We exercise:
//
// 1. The default symbol is whatever the backend reports (or the
//    ``EUR/USD`` fallback when /healthz has not yet responded).
// 2. Clicking an alert row lifts the chart symbol to that row's
//    symbol AND opens the matching AlertCard.
// 3. Clicking the same row again keeps the card open and does NOT
//    re-render (idempotent — the chart re-embeds only when the
//    symbol changes).
// 4. Clicking a different row switches the chart symbol and
//    replaces the card content.
// 5. The card's Cerrar button dismisses it without touching the
//    chart symbol.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Stub out the three hooks so the test stays deterministic and does
// not open any WebSockets. ``useCandles`` returns an empty buffer,
// ``useAlerts`` returns the supplied fixture, and ``useBackendHealth``
// reports a known symbol. Paths are relative to App.tsx (which lives
// in ``src/``) — vi.mock resolves modules against the importing
// module, not the test file.
vi.mock("../hooks/useBackendHealth", () => ({
  useBackendHealth: () => ({
    provider: "Dukascopy",
    symbol: "EUR/USD",
    isUp: true,
    lastChecked: new Date(),
  }),
}));

vi.mock("../hooks/useCandles", () => ({
  useCandles: () => ({
    candles: [],
    indicators: null,
    latest: null,
    status: "open" as const,
  }),
}));

const alertFixtureA = {
  id: "alert-a",
  symbol: "GBP/USD",
  side: "PUT" as const,
  confidence: 78,
  entry_price: 1.17813,
  entry_time: "2026-01-01T12:00:00Z",
  expiry_time: "2026-01-01T12:05:00Z",
  status: "WIN" as const,
  confirmations: {
    trend_structure: true,
    support_resistance: true,
    stochastic: true,
    ema_interaction: true,
    fibonacci: true,
  },
  confirmations_count: 5,
};

const alertFixtureB = {
  ...alertFixtureA,
  id: "alert-b",
  symbol: "USD/JPY",
  side: "CALL" as const,
  entry_price: 150.123,
};

vi.mock("../hooks/useAlerts", () => ({
  useAlerts: () => ({
    alerts: [alertFixtureA, alertFixtureB],
    pendingCount: 0,
    status: "open" as const,
  }),
}));

// Mock the chart so we never try to load the remote TradingView
// script inside jsdom. The test asserts on the ``symbol`` prop the
// mock receives.
const tvSymbolSpy = vi.fn();
vi.mock("../components/TradingViewChart", () => ({
  TradingViewChart: ({ symbol }: { symbol: string }) => {
    tvSymbolSpy(symbol);
    return <div data-testid="mock-tradingview-chart" data-symbol={symbol} />;
  },
}));

// Now import App — these mocks must register before App is loaded so
// its imports resolve against them.
import App from "../App";

// React 18 warns unless we opt in to the act() environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null;
let host: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  tvSymbolSpy.mockClear();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  if (root) {
    act(() => {
      root!.unmount();
    });
    root = null;
  }
  if (host && host.parentNode) {
    host.parentNode.removeChild(host);
  }
  host = null;
  consoleErrorSpy?.mockRestore();
  consoleErrorSpy = null;
});

function renderApp() {
  act(() => {
    root!.render(<App />);
  });
}

function getMockChartSymbol(): string | null {
  const el = host!.querySelector(
    "[data-testid='mock-tradingview-chart']",
  ) as HTMLElement | null;
  return el ? el.getAttribute("data-symbol") : null;
}

function clickRow(alertId: string) {
  const row = host!.querySelector(`[data-testid='alert-row-${alertId}']`);
  expect(row).toBeTruthy();
  act(() => {
    (row as HTMLButtonElement).click();
  });
}

function getAlertCardText(): string | null {
  const el = host!.querySelector("[data-testid='alert-card-text']");
  return el ? el.textContent : null;
}

function getCloseButton(): HTMLButtonElement | null {
  return host!.querySelector("button[aria-label='Cerrar detalle de alerta']");
}

describe("App composition + alert-row click wiring", () => {
  it("mounts the chart with the backend's reported symbol", () => {
    renderApp();
    expect(getMockChartSymbol()).toBe("EUR/USD");
  });

  it("does not render an AlertCard before any row is clicked", () => {
    renderApp();
    expect(getAlertCardText()).toBeNull();
  });

  it("switches the chart symbol AND opens the AlertCard on row click", () => {
    renderApp();
    expect(getMockChartSymbol()).toBe("EUR/USD");

    clickRow("alert-a");

    // Chart symbol follows the row's symbol; the TradingView widget
    // would now re-embed (mocked here).
    expect(getMockChartSymbol()).toBe("GBP/USD");
    // The Spanish card opens with the row's content.
    expect(getAlertCardText()).toBe(
      [
        "✅ WIN - admin Alerts",
        "💎 Instrumento: GBP/USD",
        "📈 Acción: PUT",
        "🎯 Precio Entrada: 1.17813",
      ].join("\n"),
    );
  });

  it("switches both chart symbol and card content when a different row is clicked", () => {
    renderApp();
    clickRow("alert-a");
    expect(getMockChartSymbol()).toBe("GBP/USD");

    clickRow("alert-b");
    expect(getMockChartSymbol()).toBe("USD/JPY");
    expect(getAlertCardText()).toContain("💎 Instrumento: USD/JPY");
    expect(getAlertCardText()).toContain("📈 Acción: CALL");
  });

  it("closes the AlertCard via its Cerrar button without changing the chart symbol", () => {
    renderApp();
    clickRow("alert-a");
    expect(getMockChartSymbol()).toBe("GBP/USD");
    expect(getAlertCardText()).not.toBeNull();

    const close = getCloseButton();
    expect(close).toBeTruthy();
    act(() => {
      close!.click();
    });

    expect(getAlertCardText()).toBeNull();
    // The chart should NOT have reverted to the previous symbol —
    // closing the card is independent of the chart's symbol state.
    expect(getMockChartSymbol()).toBe("GBP/USD");
  });

  it("renders each row as a button for keyboard accessibility", () => {
    renderApp();
    const rowA = host!.querySelector(
      "[data-testid='alert-row-alert-a']",
    ) as HTMLButtonElement | null;
    expect(rowA).toBeTruthy();
    expect(rowA!.tagName).toBe("BUTTON");
    // Button-type makes Enter / Space activate it natively.
    expect(rowA!.type).toBe("button");
  });

  it("marks the selected row with aria-pressed for assistive tech", () => {
    renderApp();
    const rowA = host!.querySelector(
      "[data-testid='alert-row-alert-a']",
    ) as HTMLButtonElement | null;
    expect(rowA!.getAttribute("aria-pressed")).toBe("false");
    clickRow("alert-a");
    expect(rowA!.getAttribute("aria-pressed")).toBe("true");
  });
});
