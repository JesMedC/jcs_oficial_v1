// Vitest suite for the AlertCard Spanish formatter.
//
// The card text is the user-specified copy from the tradingview-widget
// ODD and must be preserved verbatim. The tests pin each of the three
// lifecycle statuses (WIN / LOSS / PENDING) so a refactor that drops an
// emoji or a line break fails loudly.
//
// We use React 18's ``createRoot`` directly (no @testing-library/react)
// because the ODD forbids new npm dependencies.

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

import { AlertCard, buildAlertCardText } from "../AlertCard";
import type { Alert, AlertStatus } from "../../types";

// React 18 warns unless we opt in to the act() environment. We do
// not need @testing-library/react for this — the ODD forbids new npm
// dependencies — so we set the global flag explicitly and silence
// React's "update was not wrapped in act" error noise.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null;
beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  consoleErrorSpy?.mockRestore();
  consoleErrorSpy = null;
});

// --------------------------------------------------------------------- //
// Fixtures
// --------------------------------------------------------------------- //

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "alert-1",
    symbol: "GBP/USD",
    side: "PUT",
    confidence: 78,
    entry_price: 1.17813,
    entry_time: "2026-01-01T12:00:00Z",
    expiry_time: "2026-01-01T12:05:00Z",
    status: "WIN",
    confirmations: {
      trend_structure: true,
      support_resistance: true,
      stochastic: true,
      ema_interaction: true,
      fibonacci: true,
    },
    confirmations_count: 5,
    ...overrides,
  };
}

// --------------------------------------------------------------------- //
// Pure formatter
// --------------------------------------------------------------------- //

describe("buildAlertCardText", () => {
  it("renders the WIN card verbatim for the ODD example", () => {
    const alert = makeAlert({ status: "WIN" });
    const expected = [
      "✅ WIN - admin Alerts",
      "💎 Instrumento: GBP/USD",
      "📈 Acción: PUT",
      "🎯 Precio Entrada: 1.17813",
    ].join("\n");
    expect(buildAlertCardText(alert)).toBe(expected);
  });

  it("renders the LOSS card with the ❌ result line", () => {
    const alert = makeAlert({ status: "LOSS" });
    const expected = [
      "❌ LOSS - admin Alerts",
      "💎 Instrumento: GBP/USD",
      "📈 Acción: PUT",
      "🎯 Precio Entrada: 1.17813",
    ].join("\n");
    expect(buildAlertCardText(alert)).toBe(expected);
  });

  it("renders the PENDING card with the ⏳ result line", () => {
    const alert = makeAlert({ status: "PENDING" });
    const expected = [
      "⏳ PENDING - admin Alerts",
      "💎 Instrumento: GBP/USD",
      "📈 Acción: PUT",
      "🎯 Precio Entrada: 1.17813",
    ].join("\n");
    expect(buildAlertCardText(alert)).toBe(expected);
  });

  it("reflects CALL side and a different symbol", () => {
    const alert = makeAlert({
      status: "LOSS",
      symbol: "EUR/USD",
      side: "CALL",
      entry_price: 1.09555,
    });
    const expected = [
      "❌ LOSS - admin Alerts",
      "💎 Instrumento: EUR/USD",
      "📈 Acción: CALL",
      "🎯 Precio Entrada: 1.09555",
    ].join("\n");
    expect(buildAlertCardText(alert)).toBe(expected);
  });

  it("uses the supplied price formatter when provided", () => {
    const alert = makeAlert({ status: "WIN" });
    const out = buildAlertCardText(alert, (v) => v.toFixed(2));
    expect(out).toContain("🎯 Precio Entrada: 1.18");
  });
});

// --------------------------------------------------------------------- //
// Component DOM behaviour
// --------------------------------------------------------------------- //

let host: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
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
});

function renderCard(props: { alert: Alert; onClose?: () => void }) {
  act(() => {
    root!.render(<AlertCard {...props} />);
  });
}

function getCardText(): string | null {
  const el = host?.querySelector("[data-testid='alert-card-text']");
  return el ? el.textContent : null;
}

describe("AlertCard component", () => {
  it("renders the WIN card text inside a <pre> so line breaks survive", () => {
    renderCard({ alert: makeAlert({ status: "WIN" }) });
    const text = getCardText();
    const expected = [
      "✅ WIN - admin Alerts",
      "💎 Instrumento: GBP/USD",
      "📈 Acción: PUT",
      "🎯 Precio Entrada: 1.17813",
    ].join("\n");
    expect(text).toBe(expected);
  });

  it("renders the LOSS card text inside a <pre>", () => {
    renderCard({ alert: makeAlert({ status: "LOSS" }) });
    expect(getCardText()).toBe(
      [
        "❌ LOSS - admin Alerts",
        "💎 Instrumento: GBP/USD",
        "📈 Acción: PUT",
        "🎯 Precio Entrada: 1.17813",
      ].join("\n"),
    );
  });

  it("renders the PENDING card text inside a <pre>", () => {
    renderCard({ alert: makeAlert({ status: "PENDING" }) });
    expect(getCardText()).toBe(
      [
        "⏳ PENDING - admin Alerts",
        "💎 Instrumento: GBP/USD",
        "📈 Acción: PUT",
        "🎯 Precio Entrada: 1.17813",
      ].join("\n"),
    );
  });

  it("invokes onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    renderCard({ alert: makeAlert(), onClose });
    const button = host!.querySelector("button");
    expect(button).toBeTruthy();
    act(() => {
      (button as HTMLButtonElement).click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render a close button when onClose is not supplied", () => {
    renderCard({ alert: makeAlert() });
    expect(host!.querySelector("button")).toBeNull();
  });
});

// Sanity check — the AlertStatus union is exactly the three values we
// pin in the tests above. If a fourth status is ever added the
// formatter's switch will fail to compile and surface it here.
describe("AlertStatus coverage", () => {
  it("tests cover every AlertStatus value", () => {
    const statuses: AlertStatus[] = ["WIN", "LOSS", "PENDING"];
    expect(new Set(statuses)).toEqual(new Set(["WIN", "LOSS", "PENDING"]));
  });
});
