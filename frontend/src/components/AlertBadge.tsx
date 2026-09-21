// AlertBadge — small pill that renders CALL/PUT (side) or
// PENDING/WIN/LOSS (status) with a colour tied to meaning.

import type { AlertSide, AlertStatus } from "../types";

import styles from "./AlertBadge.module.css";

type BadgeKind = AlertSide | AlertStatus;

interface AlertBadgeProps {
  kind: BadgeKind;
  label?: string;
}

const KIND_TO_CLASS: Record<BadgeKind, string> = {
  CALL: "badge--call",
  PUT: "badge--put",
  PENDING: "badge--pending",
  WIN: "badge--win",
  LOSS: "badge--loss",
};

export function AlertBadge({ kind, label }: AlertBadgeProps) {
  const cls = KIND_TO_CLASS[kind];
  return (
    <span className={`${styles.badge} ${styles[cls]}`}>{label ?? kind}</span>
  );
}
