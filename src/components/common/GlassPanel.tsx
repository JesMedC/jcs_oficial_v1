/*
 * p0ui.1 — GlassPanel primitive.
 *
 * Lowest-level chrome surface for the glassmorphism system. Renders a
 * translucent panel with backdrop blur, soft border, top-edge highlight
 * (the characteristic light streak along the upper edge that makes
 * glass read as glass), and a soft inset+drop shadow.
 *
 * Intentionally minimal — no padding (composers add it), no glow on
 * hover (composers add it via `glow` on GlassCard). Three opacity
 * variants share the same shadow so they stack visually coherently;
 * blur is independent of opacity so we can tune depth separately.
 *
 * Composition:
 *   bg-glass-{variant}      → white tint, 6/10/16 % opacity
 *   backdrop-blur-{blur}    → 8/16/24/40 px
 *   border-glass-border-{variant}
 *   rounded-glass-lg        → 1.25rem
 *   shadow-glass-panel      → drop + 1px inset top highlight
 *   relative overflow-hidden → clips the absolute top-edge highlight
 *
 * The top-edge highlight (`highlight` prop, default on) is an absolute
 * 1px gradient that visually sells the "edge catches the light"
 * quality of real glass. Pointer-events: none so it never blocks
 * clicks.
 *
 * Polimorphic via `as` (default 'div'). Ref is typed as
 * HTMLDivElement because the spec promises "standard div props";
 * callers passing a non-div element get an HTMLElement-shaped handle
 * via runtime, which is the standard escape hatch.
 */
import { forwardRef, type ElementType, type HTMLAttributes, type ReactNode, type Ref } from 'react';

export type GlassVariant = 'subtle' | 'default' | 'strong';
export type GlassBlur = 'sm' | 'default' | 'lg' | 'xl';

interface GlassPanelOwnProps {
  /**
   * Element rendered as the panel. Defaults to a `div`. Types
   * explicitly include `undefined` (despite
   * `exactOptionalPropertyTypes: true`) so destructuring with
   * defaults in wrapper components like GlassCard compiles without
   * `as any` escape hatches.
   */
  readonly as?: ElementType | undefined;
  /** Background opacity tier. Mirrors the `colors.glass` tokens. */
  readonly variant?: GlassVariant | undefined;
  /** Backdrop-blur strength. Independent of `variant`. */
  readonly blur?: GlassBlur | undefined;
  /** Render the 1px top-edge light highlight (default: true). */
  readonly highlight?: boolean | undefined;
}

export type GlassPanelProps = GlassPanelOwnProps &
  Omit<HTMLAttributes<HTMLDivElement>, keyof GlassPanelOwnProps> & {
    /** Extra classes merged onto the panel. */
    readonly className?: string;
    /** Panel content. */
    readonly children: ReactNode;
  };

const VARIANT_BG: Record<GlassVariant, string> = {
  subtle: 'bg-glass-subtle',
  default: 'bg-glass',
  strong: 'bg-glass-strong',
};

const VARIANT_BORDER: Record<GlassVariant, string> = {
  subtle: 'border-glass-border-subtle',
  default: 'border-glass-border',
  strong: 'border-glass-border-strong',
};

const BLUR_CLASS: Record<GlassBlur, string> = {
  sm: 'backdrop-blur-glass-sm',
  default: 'backdrop-blur-glass',
  lg: 'backdrop-blur-glass-lg',
  xl: 'backdrop-blur-glass-xl',
};

/**
 * GlassPanel — translucent chrome surface primitive.
 *
 * See file header for the composition contract. p0ui.2 will compose
 * this into PortalSidebar, account cards, topbar, dashboard widgets,
 * and the portal shell. Financial tables, P&L calendars, charts, and
 * scanner alerts MUST NOT use this primitive.
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(function GlassPanel(
  props,
  ref,
) {
  const {
    as,
    variant = 'default',
    blur = 'default',
    highlight = true,
    className,
    children,
    ...rest
  } = props;

  const Component = (as ?? 'div') as ElementType;

  const classes = [
    VARIANT_BG[variant],
    BLUR_CLASS[blur],
    VARIANT_BORDER[variant],
    'rounded-glass-lg',
    'shadow-glass-panel',
    'relative overflow-hidden',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // When `as` resolves to a non-div element (rare — currently only
  // GlassPanel consumers expect a div), React still forwards the ref
  // through; the typing assumes HTMLDivElement which matches the
  // default-element path.
  const divRef = ref as unknown as Ref<typeof Component>;

  return (
    <Component ref={divRef} className={classes} {...rest}>
      {highlight ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />
      ) : null}
      {children}
    </Component>
  );
});
