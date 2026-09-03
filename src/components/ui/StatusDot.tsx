/*
 * design-system-v1 — StatusDot primitive (Wave 4b, T4.6).
 *
 * Small semantic indicator dot for status rows (online, syncing,
 * risk levels, etc.). Replaces the inline `<span>` rendered by the
 * pre-existing `RiskSemaphore` and the cyan-pulse `auth-spinner`
 * pattern. Wave 5 will migrate the existing consumers; this primitive
 * is the shared target.
 *
 * Composition (per orchestrator brief + design.md §4.6 +
 * `specs/decorative-system/spec.md`):
 *   - container: `<span>` with `inline-block rounded-full`
 *   - sizes: sm (w-1.5 h-1.5), md (w-2 h-2), lg (w-3 h-3)
 *   - variants: jade (bg-primary), cyan (bg-info), amber (bg-warning),
 *     red (bg-loss)
 *   - pulse: applies `animate-status-dot-pulse` (the renamed
 *     keyframe from Wave 1, T1.4 — opacity 0.5 → 1.0 → 0.5 in a
 *     1.5s ease-in-out infinite loop)
 *   - default pulse: jade=true, others=false. Caller can override
 *     with the explicit `pulse` prop.
 *   - reduced-motion: queryMedia("(prefers-reduced-motion: reduce)")
 *     on every render; when matched, the animation class is NOT
 *     applied (the reduced-motion global in `src/styles/index.css`
 *     additionally collapses the keyframe timing, but the class is
 *     omitted here so the static dot reads correctly even in
 *     jsdom-based tests)
 *
 * Accessibility:
 *   - `role="status"` so screen readers announce the state when the
 *     label changes
 *   - `aria-label` is always set (default: "Status", override via
 *     the `label` prop)
 *   - `title` mirrors the `label` for sighted hover tooltips
 *
 * Why no `clsx`: same Wave 1 read-only rule. Class composition is
 * a `[...].filter(Boolean).join(' ')` chain.
 */
import type { HTMLAttributes } from 'react';

export type StatusVariant = 'jade' | 'cyan' | 'amber' | 'red';

export type StatusSize = 'sm' | 'md' | 'lg';

export interface StatusDotProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  readonly variant?: StatusVariant;
  readonly size?: StatusSize;
  /**
   * Whether the dot should animate via `animate-status-dot-pulse`.
   * Defaults to `true` for `variant="jade"` (the positive status
   * signal), `false` for other variants. Overridden by
   * `prefers-reduced-motion` at render time (the animation class
   * is omitted regardless of this prop when the user prefers
   * reduced motion).
   */
  readonly pulse?: boolean;
  /**
   * Accessible label and hover tooltip. Required for screen readers;
   * defaults to "Status" so the dot is never silent.
   */
  readonly label?: string;
}

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  jade: 'bg-primary',
  cyan: 'bg-info',
  amber: 'bg-warning',
  red: 'bg-loss',
};

const SIZE_CLASSES: Record<StatusSize, string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-3 h-3',
};

const BASE_CLASSES = 'inline-block rounded-full';

const DEFAULT_PULSE: Record<StatusVariant, boolean> = {
  jade: true,
  cyan: false,
  amber: false,
  red: false,
};

/**
 * Read the prefers-reduced-motion media query at render time.
 * jsdom does not implement `window.matchMedia` natively — the test
 * setup stubs one with `matches: false` (motion enabled by default),
 * and the StatusDot test suite overrides it per case to assert the
 * reduced-motion branch.
 */
function prefersReducedMotion(): boolean {
  if (typeof globalThis.matchMedia !== 'function') return false;
  return globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function StatusDot({
  variant = 'jade',
  size = 'md',
  pulse,
  label = 'Status',
  className,
  ...rest
}: StatusDotProps): JSX.Element {
  // pulse defaults to the variant map when not provided.
  // pulse is suppressed entirely when the user prefers reduced motion.
  const reducedMotion = prefersReducedMotion();
  const effectivePulse = !reducedMotion && (pulse ?? DEFAULT_PULSE[variant]);

  const classes = [
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    effectivePulse ? 'animate-status-dot-pulse' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      data-variant={variant}
      className={classes}
      {...rest}
    />
  );
}
