// Header — top bar showing the current symbol, latest price + change,
// and the connection dot for the live data stream.
//
// The percentage change is computed in the parent (App) where the full
// candles buffer is in scope; the Header only displays it.

import { ConnectionDot } from "./ConnectionDot";
import {
  formatPercent,
  formatPrice,
} from "../utils/format";
import type { BackendHealth } from "../hooks/useBackendHealth";
import type { ConnectionStatus } from "../types";

import styles from "./Header.module.css";

interface HeaderProps {
  health: BackendHealth;
  wsStatus: ConnectionStatus;
  lastClose: number | null;
  changePct: number | null;
  symbolOverride?: string;
}

export function Header({
  health,
  wsStatus,
  lastClose,
  changePct,
  symbolOverride,
}: HeaderProps) {
  const symbol = symbolOverride ?? health.symbol ?? "EUR/USD";

  const changeClass =
    changePct === null
      ? styles["price__change--flat"]
      : changePct > 0
        ? styles["price__change--up"]
        : changePct < 0
          ? styles["price__change--down"]
          : styles["price__change--flat"];

  return (
    <header className={styles.header}>
      <div className={styles.symbol}>
        <span className={styles.symbol__name}>{symbol}</span>
        {health.provider && (
          <span className={styles.symbol__provider}>
            via {health.provider}
          </span>
        )}
      </div>

      <div className={styles.price}>
        <span className={styles.price__label}>Last close</span>
        <span className={styles.price__value}>
          {formatPrice(lastClose)}
        </span>
        <span className={changeClass}>{formatPercent(changePct)}</span>
      </div>

      <ConnectionDot status={wsStatus} />
    </header>
  );
}
