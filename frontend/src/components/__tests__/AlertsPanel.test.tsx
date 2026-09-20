// Vitest suite for the AlertsPanel row click handler.
//
// Component-level test: the App-level wiring is covered in
// App.test.tsx. This file pins the AlertsPanel contract on its own:
//
// 1. Each row is rendered as a focusable, keyboard-activatable button.
// 2. ``onSelect`` fires with the matching alert on click.
// 3. ``selectedAlertId`` toggles the row's aria-pressed state.

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

import { AlertsPanel } from "../AlertsPanel";
import type { Alert } from "../../types";

// React 18 warns unless we opt in to the act() environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null;
let host: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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

function makeAlert(id: string, symbol: string): Alert {
  return {
    id,
    symbol,
    side: "PUT",
    confidence: 60,
    entry_price: 1.1,
    entry_time: "2026-01-01T12:00:00Z",
    expiry_time: "2026-01-01T12:05:00Z",
    status: "PENDING",
    confirmations: {
      trend_structure: true,
      support_resistance: false,
      stochastic: true,
      ema_interaction: false,
      fibonacci: true,
    },
    confirmations_count: 3,
  };
}

function renderPanel(props: Parameters<typeof AlertsPanel>[0]) {
  act(() => {
    root!.render(<AlertsPanel {...props} />);
  });
}

describe("AlertsPanel row click handler", () => {
  it("renders each row as a focusable button", () => {
    renderPanel({
      alerts: [makeAlert("a", "EUR/USD")],
      pendingCount: 0,
      status: "open",
      onSelect: () => {},
    });
    const row = host!.querySelector("[data-testid='alert-row-a']");
    expect(row).toBeTruthy();
    expect((row as HTMLButtonElement).tagName).toBe("BUTTON");
    expect((row as HTMLButtonElement).type).toBe("button");
  });

  it("invokes onSelect with the matching alert on click", () => {
    const onSelect = vi.fn();
    const alert = makeAlert("a", "GBP/USD");
    renderPanel({
      alerts: [alert],
      pendingCount: 0,
      status: "open",
      onSelect,
    });
    act(() => {
      (host!.querySelector("[data-testid='alert-row-a']") as HTMLButtonElement).click();
    });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(alert);
  });

  it("passes through distinct alerts when multiple rows are clicked", () => {
    const onSelect = vi.fn();
    const a = makeAlert("a", "EUR/USD");
    const b = makeAlert("b", "USD/JPY");
    renderPanel({
      alerts: [a, b],
      pendingCount: 0,
      status: "open",
      onSelect,
    });
    act(() => {
      (host!.querySelector("[data-testid='alert-row-a']") as HTMLButtonElement).click();
    });
    act(() => {
      (host!.querySelector("[data-testid='alert-row-b']") as HTMLButtonElement).click();
    });
    expect(onSelect).toHaveBeenNthCalledWith(1, a);
    expect(onSelect).toHaveBeenNthCalledWith(2, b);
  });

  it("marks the selected row with aria-pressed=true", () => {
    renderPanel({
      alerts: [makeAlert("a", "EUR/USD"), makeAlert("b", "USD/JPY")],
      pendingCount: 0,
      status: "open",
      onSelect: () => {},
      selectedAlertId: "b",
    });
    const a = host!.querySelector(
      "[data-testid='alert-row-a']",
    ) as HTMLButtonElement;
    const b = host!.querySelector(
      "[data-testid='alert-row-b']",
    ) as HTMLButtonElement;
    expect(a.getAttribute("aria-pressed")).toBe("false");
    expect(b.getAttribute("aria-pressed")).toBe("true");
  });

  it("does not crash when onSelect is not provided", () => {
    renderPanel({
      alerts: [makeAlert("a", "EUR/USD")],
      pendingCount: 0,
      status: "open",
    });
    // Clicking without a handler should be a silent no-op.
    expect(() => {
      act(() => {
        (host!.querySelector("[data-testid='alert-row-a']") as HTMLButtonElement).click();
      });
    }).not.toThrow();
  });

  it("renders the empty state when there are no alerts", () => {
    renderPanel({
      alerts: [],
      pendingCount: 0,
      status: "open",
      onSelect: () => {},
    });
    expect(host!.textContent).toContain("Esperando señales...");
  });
});
