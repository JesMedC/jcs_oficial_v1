/*
 * jarvis-ui-redesign (T-03) — HudPanel primitive.
 *
 * The JARVIS HUD panel that replaces ad-hoc `<div className="bg-glass
 * border ...">` patterns. Inspired by Iron Man HUD chrome:
 *
 *   - container: rounded-glass border + bg-glass-surface + backdrop-blur
 *     + border cyan rgba
 *   - variants:
 *     - default  : rounded-glass + glow-sm
 *     - elevated : default + shadow-glass-panel (deeper chrome shadow)
 *     - frame    : elevated + corner brackets at all 4 corners (L-shape)
 *                 — used for hero panels (DashboardPage, LoginPage)
 *   - padding scale: none | sm | md | lg
 *
 * Visual contract is pinned by `HudPanel.test.tsx` — every class
 * listed there is the contract. Do not rename without updating the
 * test first (strict TDD per openspec/config.yaml).
 */
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type HudPanelVariant = 'default' | 'elevated' | 'frame';
type HudPanelPadding = 'none' | 'sm' | 'md' | 'lg';

interface HudPanelOwnProps {
  readonly variant?: HudPanelVariant;
  readonly padding?: HudPanelPadding;
  readonly className?: string;
  readonly children: ReactNode;
}

type HudPanelProps<E extends ElementType> = HudPanelOwnProps & {
  readonly as?: E;
} & Omit<ComponentPropsWithoutRef<E>, keyof HudPanelOwnProps | 'as'>;

export type { HudPanelOwnProps, HudPanelPadding, HudPanelProps, HudPanelVariant };

const BASE =
  'relative bg-[var(--glass-surface)] backdrop-blur-glass border border-[var(--color-jade-border-line)]';

// The signature JARVIS glow: `0 0 24px rgba(0,212,216,0.18)` — cyan
// halo behind the panel, low-alpha so it doesn't bleed into surrounding
// content. Same value across all variants so swapping `variant` doesn't
// change the visual weight of the glow.
const GLOW = 'shadow-[0_0_24px_rgba(0,212,216,0.18)]';

const ROUNDED = 'rounded-glass';

const PADDING: Record<HudPanelPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const variantClasses: Record<HudPanelVariant, string> = {
  default: `${BASE} ${ROUNDED} ${GLOW}`,
  elevated: `${BASE} ${ROUNDED} ${GLOW} shadow-glass-panel`,
  frame: `${BASE} ${ROUNDED} ${GLOW} shadow-glass-panel`,
};

// Inline SVG L-shape corner. Sits absolutely-positioned at one of the
// 4 corners; the parent HudPanel must be `position: relative` (BASE).
function HudCorner({
  position,
}: {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}): JSX.Element {
  // Each corner is a 24×24 L bracket rendered as two perpendicular
  // lines. The orientation depends on which corner it sits in.
  const positionClasses: Record<typeof position, string> = {
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0 rotate-90',
    'bottom-left': 'bottom-0 left-0 -rotate-90',
    'bottom-right': 'bottom-0 right-0 rotate-180',
  };

  return (
    <span
      aria-hidden="true"
      data-jarvis-corner={position}
      className={`pointer-events-none absolute ${positionClasses[position]}`}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--jarvis-corner)"
        strokeWidth="1.5"
      >
        <path d="M0 8 V0 H8" />
      </svg>
    </span>
  );
}

export function HudPanel<E extends ElementType = 'div'>(
  props: HudPanelProps<E>,
) {
  const {
    as,
    variant = 'default',
    padding = 'md',
    className = '',
    children,
    ...rest
  } = props as HudPanelProps<ElementType>;

  const Component = (as ?? 'div') as ElementType;
  const classes = [
    variantClasses[variant],
    PADDING[padding],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...rest}>
      {children}
      {variant === 'frame' && (
        <>
          <HudCorner position="top-left" />
          <HudCorner position="top-right" />
          <HudCorner position="bottom-left" />
          <HudCorner position="bottom-right" />
        </>
      )}
    </Component>
  );
}
