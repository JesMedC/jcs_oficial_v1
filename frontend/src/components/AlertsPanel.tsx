// AlertsPanel — right-side table showing the most recent alerts with
// CALL/PUT and PENDING/WIN/LOSS badges. New alerts trigger a fade-in
// animation via CSS; we don't need any per-row state.
//
// Columns:
//
// - Hora      entry_time formatted as HH:MM:SS local
// - Activo    alert symbol
// - Tipo      CALL or PUT badge
// - Confianza confidence as percentage
// - Resultado PENDING / WIN / LOSS badge
//
// Row interaction:
//
// Each row is a focusable, keyboard-activatable button that fires the
// supplied ``onSelect`` callback. The button semantics matter: a
// ``<tr>`` is not keyboard accessible by default; wrapping each row's
// content in a ``<button>`` restores Tab + Enter / Space activation
// and screen-reader announcements. The cursor stays a pointer so the
// mouse affordance is unchanged.
//
// The empty state pulses gently so the user knows the connection is
// live and waiting for the next signal.

import { AlertBadge } from "./AlertBadge";
import {
  formatConfidence,
  formatPrice,
  formatTime,
} from "../utils/format";
import type { Alert, ConnectionStatus } from "../types";

import styles from "./AlertsPanel.module.css";

interface AlertsPanelProps {
  alerts: Alert[];
  pendingCount: number;
  status: ConnectionStatus;
  /**
   * Fired when the user activates an alert row (click, Enter, or
   * Space). The parent uses this to drive the chart's symbol and to
   * surface the matching AlertCard detail view.
   */
  onSelect?: (alert: Alert) => void;
  /** ID of the currently selected alert — used to highlight the row. */
  selectedAlertId?: string | null;
}

export function AlertsPanel({
  alerts,
  pendingCount,
  status,
  onSelect,
  selectedAlertId,
}: AlertsPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.panel__header}>
        <div className={styles.panel__title}>
          <span className={styles.panel__title_text}>Alerts</span>
          {pendingCount > 0 && (
            <span className={styles.panel__pending}>
              {pendingCount} pending
            </span>
          )}
        </div>
      </div>

      <div className={styles.panel__body}>
        {alerts.length === 0 ? (
          <div className={styles.empty}>
            {status === "open"
              ? "Esperando señales..."
              : status === "connecting"
                ? "Conectando al backend..."
                : "Sin conexión"}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Activo</th>
                <th>Tipo</th>
                <th style={{ textAlign: "right" }}>Confianza</th>
                <th style={{ textAlign: "right" }}>Entrada</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => {
                const isSelected = alert.id === selectedAlertId;
                const rowClass = isSelected
                  ? `${styles.table__row} ${styles["table__row--selected"]}`
                  : styles.table__row;
                return (
                  <tr key={alert.id} className={rowClass}>
                    <td colSpan={6} className={styles.table__cell_button}>
                      <button
                        type="button"
                        className={styles.row__button}
                        onClick={() => onSelect?.(alert)}
                        aria-label={`Ver detalle de alerta ${alert.symbol} ${alert.side}`}
                        aria-pressed={isSelected}
                        data-testid={`alert-row-${alert.id}`}
                      >
                        <span className={styles.cell__time}>
                          {formatTime(alert.entry_time)}
                        </span>
                        <span className={styles.cell__symbol}>
                          {alert.symbol}
                        </span>
                        <span>
                          <AlertBadge kind={alert.side} />
                        </span>
                        <span className={styles.cell__confidence}>
                          {formatConfidence(alert.confidence)}
                        </span>
                        <span className={styles.cell__price}>
                          {formatPrice(alert.entry_price)}
                        </span>
                        <span>
                          <AlertBadge kind={alert.status} />
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
