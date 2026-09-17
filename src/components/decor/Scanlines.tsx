/*
 * Scanlines — global JARVIS HUD overlay.
 *
 * Mounted once at the dashboard root, this fixed-position overlay paints
 * a barely-visible repeating-line gradient on top of every chrome layer
 * to give the page the CRT/HUD scanline feel. The opacity is locked at
 * 0.02 (per the dashboard-jarvis-fidelity-v2 spec) so the lines are felt
 * rather than read — a heavier alpha would compete with the data.
 *
 * Why a fixed overlay instead of a CSS background on the body?
 *   - The lines need to sit ABOVE the decor (DotGrid / NeuralNetwork) and
 *     BELOW the actual content cards. A `fixed inset-0` with
 *     `pointer-events-none` and the right z-index works without any
 *     layout interaction.
 *   - Cards have their own clip-path chamfer — adding a scanline bg to
 *     the body would not bleed into the cards' fill area, leaving a
 *     visible seam. A top-level overlay covers everything uniformly.
 *
 * Implementation: a single `<div>` with a `repeating-linear-gradient`
 * background painted via inline style (so it ships without a Tailwind
 * arbitrary-class string and stays portable).
 */
import type { CSSProperties } from 'react';

export interface ScanlinesProps {
  /** Pixel height of each line cycle. Default 4 (2 line + 2 gap). */
  readonly spacing?: number;
  /** Line color. Default cyan rgba(0, 229, 255, 0.02). */
  readonly color?: string;
  /** Overall opacity. Default 0.02 (per JARVIS spec). */
  readonly opacity?: number;
  /** Optional z-index override. Default 50. */
  readonly zIndex?: number;
  /** Forward a data-testid for pin-test stability. */
  readonly 'data-testid'?: string;
}

export function Scanlines({
  spacing = 4,
  color = 'rgba(0, 229, 255, 0.02)',
  opacity = 0.02,
  zIndex = 50,
  'data-testid': testId,
}: ScanlinesProps) {
  const style: CSSProperties = {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex,
    opacity,
    // Repeat horizontally — the gradient itself repeats vertically, so
    // there is no need for a `background-repeat` directive.
    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent ${spacing / 2}px, ${color} ${spacing / 2}px, ${color} ${spacing}px)`,
  };
  return (
    <div
      aria-hidden="true"
      data-testid={testId ?? 'scanlines-overlay'}
      className="jarvis-scanlines"
      style={style}
    />
  );
}