/*
 * design-system-v1 — Badge primitive (Wave 4b, T4.5).
 *
 * Semantic colour-tagged label for inline use across the Cyber-Jade
 * design system. Replaces 7 inline copies (`SubscriptionCard.tsx`,
 * `UserRow.tsx`, `PaymentRow.tsx`, `TopPageRow.tsx`, `PlanRow.tsx`,
 * `PlanHistoryRow.tsx`, `TradeStatusBadge.tsx`) with a single
 * primitive. The Wave 5 migration commits (T5.1–T5.3) will replace
 * the inline copies one by one; this primitive is the shared target.
 *
 * Composition (per orchestrator brief + design.md §4.5):
 *   - container: `inline-flex items-center gap-1 rounded-md
 *     font-display uppercase tracking-wide`
 *   - variant map: solid bg at `/15` opacity, solid text colour,
 *     `border-{variant}/30` for chrome; `neutral` uses `bg-white/5
 *     text-text-secondary border-white/10` for low-emphasis chips
 *   - sizes: sm (text-[10px] px-1.5 py-0) | md (text-xs px-2 py-0.5)
 *   - NO glow on profit / loss / danger — cyber-jade-tokens
 *     numeric-context rule (P&L surfaces stay clean)
 *   - `data-variant={variant}` exposes the variant for row-level
 *     selectors (the Wave 5 migration keeps the existing
 *     data-testid contracts intact)
 *
 * Why no `clsx`: Wave 1's install plan was deferred per the
 * orchestrator's read-only mandate, so class composition is a
 * `[...].filter(Boolean).join(' ')` chain. Behavioural outcomes
 * (variant classes, icon slot, size) are pinned by the test file,
 * not by the className join.
 */
import type { ReactNode } from 'react';

export type BadgeVariant =
  | 'profit'
  | 'loss'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'primary'
  | 'danger';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  readonly variant?: BadgeVariant;
  readonly size?: BadgeSize;
  readonly children: ReactNode;
  readonly icon?: ReactNode;
  readonly className?: string;
}

const BASE_CLASSES =
  'inline-flex items-center gap-1 rounded-md font-display uppercase tracking-wide border';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  profit: 'bg-profit/15 text-profit border-profit/30',
  loss: 'bg-loss/15 text-loss border-loss/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  info: 'bg-info/15 text-info border-info/30',
  neutral: 'bg-white/5 text-text-secondary border-white/10',
  primary: 'bg-primary/15 text-primary border-primary/30',
  // `danger` is an alias of `loss` per the orchestrator's brief
  // (destructive action labels use the same red surface as a
  // negative P&L number — the cyber-jade-tokens rule that forbids
  // glow on these surfaces applies to both).
  danger: 'bg-loss/15 text-loss border-loss/30',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0',
  md: 'text-xs px-2 py-0.5',
};

export function Badge({
  variant = 'info',
  size = 'md',
  children,
  icon,
  className,
}: BadgeProps): JSX.Element {
  const classes = [
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} data-variant={variant}>
      {icon}
      {children}
    </span>
  );
}
