/*
 * design-system-v1 — Button primitive (Wave 4a, T4a.1).
 *
 * Foundational chrome button for the Cyber-Jade design system.
 * Variant × size × state matrix ships in four commit-aligned commits
 * (T4a.1/T4a.2/T4a.3/T4a.4) and the barrel in `src/components/ui/`.
 *
 * Composition (per `design.md` §4.1):
 *   - base: `inline-flex items-center justify-center gap-2 rounded-lg
 *     font-display uppercase tracking-wider transition-shadow
 *     focus-visible:outline-none focus-visible:ring-2
 *     focus-visible:ring-primary`
 *   - variant primary: `border border-primary text-primary
 *     hover:bg-primary hover:text-primary-fg hover:shadow-glow-jade-sm`
 *   - variant ghost:   `text-primary hover:bg-primary/10`
 *   - variant danger:  `border border-loss text-loss hover:bg-loss
 *     hover:text-primary-fg hover:shadow-glow-jade-sm`
 *   - variant icon:    `p-2 hover:bg-primary/10` (size ignored — the
 *     inner glyph determines the box)
 *   - sizes: sm `px-3 py-1 text-sm`, md `px-4 py-2 text-base`,
 *     lg `px-6 py-3 text-lg`
 *
 * Behaviour:
 *   - `loading=true` sets `aria-busy`, swaps the leftIcon slot for a
 *     jade spinner (the StatusDot primitive ships in T4.6 — until then
 *     the spinner is a thin ring rendered inline), and short-circuits
 *     click handling by setting `disabled={true}`.
 *   - `disabled` (or loading) adds `opacity-50 cursor-not-allowed` +
 *     `aria-disabled="true"` and short-circuits click handling.
 *   - `forwardRef<HTMLButtonElement>` so React Hook Form's
 *     `register('fieldName')` can target the button.
 *
 * Why no `clsx`: Wave 1's install plan was deferred per the
 * orchestrator's read-only mandate, so class composition is a
 * `[...].filter(Boolean).join(' ')` chain. Behavioural outcomes
 * (disabled, aria-busy, click suppression) are pinned by the test
 * file, not by the className join.
 */
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly loading?: boolean;
  readonly leftIcon?: ReactNode;
  readonly rightIcon?: ReactNode;
  readonly children?: ReactNode;
}

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-lg font-display uppercase tracking-wider transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'border border-primary text-primary hover:bg-primary hover:text-primary-fg hover:shadow-glow-jade-sm',
  ghost: 'text-primary hover:bg-primary/10',
  danger:
    'border border-loss text-loss hover:bg-loss hover:text-primary-fg hover:shadow-glow-jade-sm',
  icon: 'p-2 hover:bg-primary/10',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

/**
 * Spinner glyph rendered in place of the leftIcon slot while loading.
 * Inline at this stage because the StatusDot primitive (T4.6) is not
 * yet shipped; the ring uses the current-color trick so it inherits
 * the button's text colour and stays visible on every variant.
 */
function Spinner(): JSX.Element {
  return (
    <span
      aria-hidden="true"
      data-testid="button-spinner"
      className="inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin"
    />
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  props,
  ref,
) {
  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    type = 'button',
    children,
    ...rest
  } = props;

  const isInactive = disabled || loading;
  const sizeClasses = variant === 'icon' ? '' : SIZE_CLASSES[size];

  const classes = [
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    sizeClasses,
    isInactive ? 'opacity-50 cursor-not-allowed' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      disabled={isInactive}
      aria-busy={loading || undefined}
      aria-disabled={isInactive || undefined}
      data-loading={loading || undefined}
      data-variant={variant}
      className={classes}
      {...rest}
    >
      {loading ? <Spinner /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});