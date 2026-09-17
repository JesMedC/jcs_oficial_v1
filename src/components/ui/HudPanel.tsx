/*
 * HudPanel — JARVIS HUD card chrome.
 *
 * Presentational wrapper that paints the angular "chamfered hex" frame
 * used across the dashboard:
 *   - top-right + bottom-left corners are 16px chamfers (clip-path)
 *   - glass background (`rgba(10, 25, 47, 0.6)` per spec)
 *   - backdrop blur for the layered HUD feel
 *   - thin cyan border (`rgba(0, 229, 255, 0.3)` per spec)
 *   - box-shadow on hover/active for the lit-up LED feel
 *
 * The default padding / radius match the spec; consumers can override
 * via `className`. Two layout variants:
 *   - <HudPanel>         → glass + clip-path hex (default, used for
 *                          session tiles, KPI cards, charts, Recent Ops)
 *   - <HudPanel as="aside"> → still glass + hex, but renders as `<aside>`
 *
 * The corner chamfers are a `clip-path: polygon(...)` on the OUTER div,
 * which avoids any `overflow: hidden` layout shift and lets the
 * `box-shadow` still bleed past the chamfer edge if needed.
 *
 * Why clip-path and not border-radius?  `border-radius` can only round
 * a single corner at a time and a 16px cut would leave the opposite
 * diagonal sharp. `clip-path` is the only CSS primitive that gives us
 * the asymmetric chamfer without a wrapper + mask hack.
 */
import type { CSSProperties, ElementType, ReactNode } from 'react';

export interface HudPanelProps {
  readonly children: ReactNode;
  /** Optional extra classes appended to the chrome (padding, gap, etc.). */
  readonly className?: string;
  /** Optional inline style overrides — applied AFTER the chrome style
   *  so consumers can tweak shadow / border colour without losing the
   *  clip-path polygon. */
  readonly style?: CSSProperties;
  /** Tag to render. Default `div`. Use `aside` for sidebar cards. */
  readonly as?: ElementType;
  /** Size of the chamfer (px). Default 16. */
  readonly cornerSize?: number;
  /** data-testid for pin-test stability. Forwarded to the rendered tag. */
  readonly 'data-testid'?: string;
  /** Optional aria-label / aria-* forwarded to the rendered tag. */
  readonly 'aria-label'?: string;
}

/**
 * clip-path polygon for the chamfered hex corners (top-right + bottom-left).
 *
 *   0,0
 *   ┌──────────────╲ <- top-right chamfer at (100% - cornerSize)
 *   │               │
 *   │               │
 *   │               │
 *   ╲───────────────┘ <- bottom-left chamfer at cornerSize
 *   0,(100% - cornerSize)
 */
function hexClipPath(cornerSize: number): string {
  const c = `${cornerSize}px`;
  const inv = `calc(100% - ${cornerSize}px)`;
  return `polygon(0 0, ${inv} 0, 100% ${c}, 100% 100%, ${c} 100%, 0 calc(100% - ${c}))`;
}

const DEFAULT_CHROME: CSSProperties = {
  background: 'rgba(10, 25, 47, 0.6)',
  border: '1px solid rgba(0, 229, 255, 0.3)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  // The polygon is applied via `style` so the cornerSize prop wins; we
  // store it on a CSS var and read it from the wrapper className for any
  // hover/active overrides.
  ['--hud-panel-corner' as string]: '16px',
};

export function HudPanel({
  children,
  className = '',
  style,
  as: Tag = 'div',
  cornerSize = 16,
  'data-testid': testId,
  'aria-label': ariaLabel,
}: HudPanelProps) {
  const mergedStyle: CSSProperties = {
    ...DEFAULT_CHROME,
    clipPath: hexClipPath(cornerSize),
    WebkitClipPath: hexClipPath(cornerSize),
    ...style,
  };
  const mergedClassName = `hud-panel ${className}`.trim();
  const Component = Tag as ElementType;
  return (
    <Component
      className={mergedClassName}
      style={mergedStyle}
      data-testid={testId}
      aria-label={ariaLabel}
    >
      {children}
    </Component>
  );
}