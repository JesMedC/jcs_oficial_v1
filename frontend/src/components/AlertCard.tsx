// AlertCard — expanded view of a single alert with the user-specified
// Spanish copy. Renders inline under the alerts table when a row is
// clicked, and exposes an explicit close button so keyboard users can
// dismiss it without depending on the row-click toggle.
//
// The text is the exact wording the user asked for in the tradingview-
// widget ODD — any change to it is a user-facing copy change. The
// snapshot tests pin the rendered string so a refactor that drops an
// emoji or a line break fails loudly.
//
// ``priceFormatter`` defaults to ``formatPrice`` so the user sees the
// same five-decimal precision the alerts table shows, but callers can
// override (e.g. to switch to a different decimal count for a specific
// instrument) without forking the component.

import { formatPrice } from "../utils/format";
import type { Alert, AlertStatus } from "../types";

import styles from "./AlertCard.module.css";

/**
 * Map an alert lifecycle status to the result-line emoji prefix. The
 * three cases cover the full ``AlertStatus`` union, so the switch is
 * exhaustive and a future new status will be caught by the compiler.
 */
function statusEmoji(status: AlertStatus): string {
  switch (status) {
    case "WIN":
      return "✅ WIN";
    case "LOSS":
      return "❌ LOSS";
    case "PENDING":
      return "⏳ PENDING";
  }
}

interface AlertCardProps {
  alert: Alert;
  /** Optional click handler for the close button. */
  onClose?: () => void;
  /** Optional price formatter override (defaults to ``formatPrice``). */
  priceFormatter?: (value: number) => string;
}

/**
 * Build the user-facing Spanish card text. Extracted as a pure
 * function so the test suite can snapshot the exact bytes the user
 * will see on screen without mounting React.
 */
export function buildAlertCardText(
  alert: Alert,
  formatPriceFn: (value: number) => string = formatPrice,
): string {
  const resultLine = `${statusEmoji(alert.status)} - admin Alerts`;
  const instrumentLine = `💎 Instrumento: ${alert.symbol}`;
  const actionLine = `📈 Acción: ${alert.side}`;
  const entryPriceLine = `🎯 Precio Entrada: ${formatPriceFn(alert.entry_price)}`;
  return [resultLine, instrumentLine, actionLine, entryPriceLine].join("\n");
}

export function AlertCard({
  alert,
  onClose,
  priceFormatter,
}: AlertCardProps) {
  const text = buildAlertCardText(alert, priceFormatter);

  return (
    <div className={styles.card} role="region" aria-label="Detalle de alerta">
      <pre className={styles.card__pre} data-testid="alert-card-text">
        {text}
      </pre>
      {onClose && (
        <button
          type="button"
          className={styles.card__close}
          onClick={onClose}
          aria-label="Cerrar detalle de alerta"
        >
          Cerrar
        </button>
      )}
    </div>
  );
}
