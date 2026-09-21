// ConnectionDot — renders the small coloured dot + label that signals
// WebSocket state. Colours come from design tokens so the rest of the
// app stays consistent without re-importing the CSS module.

import type { ConnectionStatus } from "../types";

import styles from "./ConnectionDot.module.css";

interface ConnectionDotProps {
  status: ConnectionStatus;
  label?: string;
}

export function ConnectionDot({ status, label }: ConnectionDotProps) {
  const indicatorClass =
    status === "open"
      ? styles["dot__indicator--ok"]
      : status === "connecting"
        ? styles["dot__indicator--connecting"]
        : styles["dot__indicator--down"];

  const text =
    label ??
    (status === "open" ? "Live" : status === "connecting" ? "Connecting" : "Offline");

  return (
    <span className={styles.dot} title={`WebSocket: ${status}`}>
      <span
        className={`${styles.dot__indicator} ${indicatorClass}`}
        aria-hidden="true"
      />
      <span>{text}</span>
    </span>
  );
}
