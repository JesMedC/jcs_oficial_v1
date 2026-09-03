/*
 * design-system-v1 — EmptyState primitive (Wave 4c, T4.7).
 *
 * Centered "nothing here yet" surface used by DataTable's empty
 * branch, accounts without trades, search results with no hits,
 * and similar empty-collection surfaces. Replaces the 4 inline
 * empty-state patterns in `TradeTable.tsx`, `AdminUsersPage.tsx`,
 * `CuentasPage.tsx`, and `PricingTier.tsx` (Wave 5 owns the
 * migration commits).
 *
 * Composition (per orchestrator brief + design.md §4.9 +
 * `specs/primitive-library/spec.md` Requirement: EmptyState):
 *   - container: `<div role="status">` with `flex flex-col
 *     items-center justify-center py-12 px-6 text-center`
 *   - icon slot: optional, wrapped in `<div className="mb-4
 *     text-primary/60">` so the icon dims into the background
 *     hierarchy (per orchestrator brief — slightly more vibrant
 *     than the design.md `text-text-muted` default to keep the
 *     icon visible against the `bg` surface)
 *   - title: `<h3>` with `text-xl font-display uppercase
 *     tracking-wide text-text-primary mb-2` (h3 so consumers can
 *     override the heading hierarchy with their own h2/h1 when
 *     nesting inside a section)
 *   - description: optional `<p>` with `text-text-secondary
 *     text-sm max-w-md mb-6` (max-w-md caps the line length for
 *     readability per WCAG 2.1)
 *   - CTA slot: optional `<div className="mt-2">` wrapper — the
 *     consumer passes a `<Button>` (or any interactive element)
 *     and the wrapper centers it under the description
 *
 * Accessibility:
 *   - `role="status"` on the container so screen readers announce
 *     the empty state when it mounts (matches the existing inline
 *     `data-testid="trade-table-empty"` pattern but at the a11y
 *     layer instead of the testid layer)
 *   - `<h3>` title exposes a heading to the screen reader so the
 *     empty state can be navigated to via heading-level jumps
 *
 * Why no `clsx`: same Wave 1 read-only rule. Class composition is
 * a `[...].filter(Boolean).join(' ')` chain.
 */
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /**
   * Optional decorative icon (typically an inline SVG). Rendered
   * inside a wrapper div that applies the `text-primary/60` color
   * so the icon dims into the visual hierarchy.
   */
  readonly icon?: ReactNode;
  /** Required heading text (rendered as `<h3>`). */
  readonly title: string;
  /** Optional supporting paragraph below the title. */
  readonly description?: string;
  /** Optional call-to-action slot (typically a `<Button>`). */
  readonly cta?: ReactNode;
  /** Optional className appended to the container. */
  readonly className?: string;
}

const CONTAINER_BASE_CLASSES =
  'flex flex-col items-center justify-center py-12 px-6 text-center';

const TITLE_CLASSES =
  'text-xl font-display uppercase tracking-wide text-text-primary mb-2';

const DESCRIPTION_CLASSES = 'text-text-secondary text-sm max-w-md mb-6';

const ICON_WRAPPER_CLASSES = 'mb-4 text-primary/60';

const CTA_WRAPPER_CLASSES = 'mt-2';

export function EmptyState({
  icon,
  title,
  description,
  cta,
  className,
}: EmptyStateProps): JSX.Element {
  const containerClasses = [CONTAINER_BASE_CLASSES, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div role="status" className={containerClasses}>
      {icon !== undefined && (
        <div className={ICON_WRAPPER_CLASSES} aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className={TITLE_CLASSES}>{title}</h3>
      {description !== undefined && (
        <p className={DESCRIPTION_CLASSES}>{description}</p>
      )}
      {cta !== undefined && <div className={CTA_WRAPPER_CLASSES}>{cta}</div>}
    </div>
  );
}
