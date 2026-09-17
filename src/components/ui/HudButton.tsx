/*
 * jarvis-ui-redesign (T-08) — HudButton primitive.
 *
 * The JARVIS outlined CTA button — hero CTA + sidebar action pattern.
 * Distinct from the existing `Button` primitive: `HudButton` is the
 * chrome-strong variant used for the "+ NUEVO TRADE" CTA and the
 * active sidebar items' CTA buttons.
 *
 * Default look:
 *   - outlined: border + transparent bg
 *   - uppercase + display font + tracking-wide
 *   - hover: subtle bg fill + cyan glow halo
 *   - focus-visible: same glow for keyboard nav
 *
 * Visual contract pinned by `HudButton.test.tsx`.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type HudButtonSize = 'sm' | 'md' | 'lg';
type HudButtonVariant = 'primary' | 'ghost' | 'danger';

interface HudButtonOwnProps {
  readonly size?: HudButtonSize;
  readonly variant?: HudButtonVariant;
  readonly children: ReactNode;
}

type HudButtonProps = HudButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof HudButtonOwnProps>;

const BASE =
  'inline-flex items-center justify-center gap-2 border bg-transparent font-display uppercase tracking-wide transition-all duration-150 rounded-md disabled:opacity-50 disabled:cursor-not-allowed';

const HOVER = 'hover:bg-primary/10 hover:shadow-glow-cyan focus-visible:bg-primary/10 focus-visible:shadow-glow-cyan';

const SIZE_CLASSES: Record<HudButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-6 py-3',
};

const VARIANT_CLASSES: Record<HudButtonVariant, string> = {
  primary: 'border-primary text-primary',
  ghost: 'border-border text-text-secondary',
  danger: 'border-loss text-loss',
};

export function HudButton({
  size = 'md',
  variant = 'primary',
  className = '',
  children,
  type = 'button',
  ...rest
}: HudButtonProps) {
  const classes = [
    BASE,
    HOVER,
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} data-jarvis-hud-btn {...rest}>
      {children}
    </button>
  );
}

export type { HudButtonProps, HudButtonSize, HudButtonVariant };
