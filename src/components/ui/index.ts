/*
 * design-system-v1 — barrel re-export for the Wave 4a primitives.
 *
 * Wave 4a ships four foundational form primitives:
 *   - Button   (T4a.1)
 *   - Input    (T4a.2)
 *   - Select   (T4a.3)
 *   - Textarea (T4a.4)
 *
 * Each subsequent Wave 4 commit (Badge, StatusDot, EmptyState,
 * Skeleton, Tabs, DataTable, Toast, [optional] PeriodoSplit) adds
 * its primitive to this barrel in its own commit so the barrel
 * grows one export at a time and each commit is a reviewable
 * unit (per `tasks.md` T4.* acceptance).
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