/*
 * design-system-v1 — DotGrid decor primitive (Wave 6, T6.1).
 *
 * Jade dot-grid background — a square SVG `<pattern>` of tiny circles
 * at low opacity, used as a decorative backdrop on public landing
 * pages, the styleguide route, and any other chrome surface that
 * wants the "cyberpunk technical drawing" feel without competing
 * with data.
 *
 * Contract (per `specs/decorative-system/spec.md` Requirement:
 * DotGrid component + design.md §5.1):
 *   - container: `<div className="pointer-events-none -z-10">`
 *     - `pointer-events-none` ensures the decorative backdrop never
 *       intercepts clicks on the underlying app
 *     - `-z-10` (negative z-index) parks the backdrop behind any
 *       sibling content; consumers that need it on top of a hero
 *       surface should mount it inside an `absolute inset-0`
 *       wrapper
 *   - inline `<svg>` is sized to fill its parent; the parent must
 *     provide a positioning context (`relative`, `absolute`, or
 *     `fixed`) and a size, otherwise the SVG renders zero-height
 *   - the `<pattern>` id is generated per-instance via `useId()`
 *     so two `<DotGrid>` mounts on the same page never collide on
 *     the `url(#pattern)` reference
 *   - the circle's `fill-opacity` is the configured opacity; the
 *     `<rect>` itself carries no opacity modifier (so the pattern
 *     can be re-tinted at the consumer level without conflict)
 *
 * The component is presentational only — no `useEffect`, no state,
 * no side effects. Renders the same output on the server and the
 * client (the `useId()` call is the only React hook used and is
 * SSR-safe).
 */
import { useId } from 'react';

export interface DotGridProps {
  /**
   * Distance between dot centres in pixels (also the tile size of
   * the SVG `<pattern>`). Default 24 — matches the spec's "subtle
   * technical drawing" density.
   */
  readonly spacing?: number;
  /**
   * Radius of each dot in pixels. Default 1.5 — small enough to
   * read as texture at 4% opacity, large enough to render
   * crisply on a 1x display.
   */
  readonly dotRadius?: number;
  /**
   * Circle fill-opacity (0–1). Default 0.04 — sits inside the
   * decorative 3–5% range from `decorative-system/spec.md`.
   */
  readonly opacity?: number;
  /**
   * Circle fill color. Default `#00FF9D` (jade neon). Consumers
   * that want a different accent should pass the hex literal
   * directly; the design system intentionally does NOT route this
   * through the Tailwind config because the decor layer is the
   * ONE place inline hex literals are sanctioned (the alternative
   * — a `decor-color` token — would add a one-off color to the
   * palette for a single decorative consumer).
   */
  readonly color?: string;
  /**
   * Extra classes merged onto the wrapping `<div>`.
   */
  readonly className?: string;
}

const DEFAULT_SPACING = 24;
const DEFAULT_DOT_RADIUS = 1.5;
const DEFAULT_OPACITY = 0.04;
const DEFAULT_COLOR = '#00FF9D';

export function DotGrid({
  spacing = DEFAULT_SPACING,
  dotRadius = DEFAULT_DOT_RADIUS,
  opacity = DEFAULT_OPACITY,
  color = DEFAULT_COLOR,
  className,
}: DotGridProps): JSX.Element {
  // useId() generates a stable, unique id per DotGrid instance so
  // multiple DotGrids on the same page never collide on the same
  // pattern reference. The generated id is prefixed with a colon
  // (e.g. ":r0:") which is a valid SVG id per the HTML5 spec
  // (colons are reserved-but-allowed in id values).
  const patternId = useId();

  const cx = spacing / 2;
  const cy = spacing / 2;

  const wrapperClasses = [
    'pointer-events-none',
    '-z-10',
    'absolute inset-0',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses} aria-hidden="true" data-testid="dot-grid">
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        data-testid="dot-grid-svg"
      >
        <defs>
          <pattern
            id={patternId}
            width={spacing}
            height={spacing}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={cx}
              cy={cy}
              r={dotRadius}
              fill={color}
              fillOpacity={opacity}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}