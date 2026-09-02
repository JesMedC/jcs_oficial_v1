/*
 * p0ui.1 — GlassCard primitive.
 *
 * Compositional layer over GlassPanel: adds padding and an optional
 * cyan hover-glow. Use this for *content* surfaces inside the portal
 * (account cards, dashboard widgets, topbar, side panels). Use raw
 * GlassPanel only for full-bleed chrome (sidebar rails, modals).
 *
 * Padding comes from the `padding` prop (`sm` → p-4, `md` → p-6,
 * `lg` → p-8). Glow is opt-in because not every card needs to react
 * on hover — overusing it makes everything feel "active" and dilutes
 * the moments that actually are.
 */
import { forwardRef, type ElementType, type ReactNode } from 'react';

import { GlassPanel, type GlassBlur, type GlassVariant } from './GlassPanel';

export type GlassCardPadding = 'sm' | 'md' | 'lg';
export type GlassCardGlow = 'cyan' | 'none';

interface GlassCardOwnProps {
  /** Element rendered as the card. Defaults to a `div`. */
  readonly as?: ElementType;
  /** Background opacity tier. */
  readonly variant?: GlassVariant;
  /** Backdrop-blur strength. */
  readonly blur?: GlassBlur;
  /** Render the 1px top-edge light highlight (default: true). */
  readonly highlight?: boolean;
  /** Padding tier — `sm` p-4, `md` p-6, `lg` p-8. */
  readonly padding?: GlassCardPadding;
  /** Hover-glow recipe. `cyan` adds `hover:shadow-glow-cyan-sm`. */
  readonly glow?: GlassCardGlow;
  /** Extra classes merged onto the panel. */
  readonly className?: string;
  /** Card content. */
  readonly children: ReactNode;
}

export type GlassCardProps = GlassCardOwnProps;

const PADDING_CLASS: Record<GlassCardPadding, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const GLOW_HOVER: Record<GlassCardGlow, string> = {
  cyan: 'hover:shadow-glow-cyan-sm transition-shadow duration-300',
  none: '',
};

/**
 * GlassCard — translucent content card.
 *
 * Composition: GlassPanel + padding + optional cyan hover-glow. Never
 * apply glass to financial data surfaces (trade tables, P&L
 * calendars, charts, scanner alerts).
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  props,
  ref,
) {
  const {
    as,
    variant,
    blur,
    highlight,
    padding = 'md',
    glow = 'none',
    className,
    children,
    ...rest
  } = props;

  const composedClassName = [
    PADDING_CLASS[padding],
    GLOW_HOVER[glow],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <GlassPanel
      as={as}
      variant={variant}
      blur={blur}
      highlight={highlight}
      className={composedClassName}
      ref={ref}
      {...rest}
    >
      {children}
    </GlassPanel>
  );
});
