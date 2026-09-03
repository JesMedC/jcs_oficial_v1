/*
 * design-system-v1 — barrel re-export for the Wave 4 primitives.
 *
 * Wave 4a shipped four foundational form primitives:
 *   - Button   (T4a.1)
 *   - Input    (T4a.2)
 *   - Select   (T4a.3)
 *   - Textarea (T4a.4)
 *
 * Wave 4b shipped four composite primitives:
 *   - Badge    (T4.5)
 *   - StatusDot (T4.6)
 *   - DataTable (T4.10)
 *   - Tabs     (T4.9)
 *
 * Wave 4c ships the three peripheral primitives:
 *   - EmptyState (T4.7)
 *   - Skeleton   (T4.8)
 *   - Toast      (T4.11 — presentational only)
 *
 * NOT exported here (intentional — see commit notes for each):
 *   - ToastContainer (T4.11-container) — mounted separately in
 *     `AppShell` / `PortalShell` during Wave 7; consumers import
 *     it directly from `src/components/ui/ToastContainer`.
 *   - `useToastStore` (T4.11-store) — lives in `src/stores/` and
 *     is imported directly by consumers because it carries
 *     Zustand state, not UI chrome.
 *   - PeriodoSplit (T4.12, optional) — not shipped (out of scope
 *     per orchestrator brief).
 */
export { Button } from './Button';
export type {
  ButtonProps,
  ButtonSize,
  ButtonVariant,
} from './Button';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Select } from './Select';
export type { SelectOption, SelectProps } from './Select';

export { Textarea } from './Textarea';
export type { TextareaProps } from './Textarea';

export { Badge } from './Badge';
export type { BadgeProps, BadgeSize, BadgeVariant } from './Badge';

export { StatusDot } from './StatusDot';
export type { StatusDotProps, StatusSize, StatusVariant } from './StatusDot';

export { DataTable } from './DataTable';
export type {
  ColumnAlign,
  ColumnDef,
  DataTableComponent,
  DataTableProps,
  SortDirection,
} from './DataTable';

export { Tabs } from './Tabs';
export type { TabItem, TabsProps } from './Tabs';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { Skeleton } from './Skeleton';
export type { SkeletonProps, SkeletonVariant } from './Skeleton';

export { Toast } from './Toast';
export type { ToastProps } from './Toast';
