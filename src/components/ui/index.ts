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
 * Each subsequent Wave 4 commit (EmptyState, Skeleton, Toast,
 * [optional] PeriodoSplit) adds its primitive to this barrel in its
 * own commit so the barrel grows one export at a time and each
 * commit is a reviewable unit (per `tasks.md` T4.* acceptance).
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
