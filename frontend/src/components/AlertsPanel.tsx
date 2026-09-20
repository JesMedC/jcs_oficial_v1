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
}

export function AlertsPanel({ alerts, pendingCount, status }: AlertsPanelProps) {
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
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td className={styles.cell__time}>
                    {formatTime(alert.entry_time)}
                  </td>
                  <td className={styles.cell__symbol}>{alert.symbol}</td>
                  <td>
                    <AlertBadge kind={alert.side} />
                  </td>
                  <td className={styles.cell__confidence}>
                    {formatConfidence(alert.confidence)}
                  </td>
                  <td className={styles.cell__price}>
                    {formatPrice(alert.entry_price)}
                  </td>
                  <td>
                    <AlertBadge kind={alert.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
