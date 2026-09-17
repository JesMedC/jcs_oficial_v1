/*
 * jarvis-ui-redesign (T-06) — JarvisWatermark primitive.
 *
 * The "JARVIS" wordmark in outline typography, mounted at one of the
 * four corners of a chrome surface (portal shell, landing hero).
 * Iron Man HUD convention — the AI's name etched in the corners.
 *
 * Visual contract pinned by `JarvisWatermark.test.tsx`:
 *   - word "JARVIS" (uppercase, letter-spaced)
 *   - color reads from --jarvis-watermark (0.13 alpha cyan)
 *   - webkit-text-stroke makes the letters outline-only (transparent
 *     fill, cyan stroke) so the wordmark reads as etched chrome.
 *   - aria-hidden + pointer-events-none — purely decorative.
 *   - position prop maps to absolute corner classes.
 */
type JarvisWatermarkPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

interface JarvisWatermarkProps {
  readonly position: JarvisWatermarkPosition;
  readonly opacity?: number;
}

const POSITION_CLASSES: Record<JarvisWatermarkPosition, string> = {
  'top-left': 'top-0 left-0',
  'top-right': 'top-0 right-0',
  'bottom-left': 'bottom-0 left-0',
  'bottom-right': 'bottom-0 right-0',
};

const OPACITY_DEFAULT = 0.13;

/**
 * Render an outline JARVIS wordmark. The text uses the display font
 * (Orbitron/Rajdhani) at a tight tracking so the letters space evenly
 * across the corner. Outline is achieved via webkit-text-stroke so the
 * fill is transparent — letting the underlying chrome show through.
 */
export function JarvisWatermark({
  position,
  opacity = OPACITY_DEFAULT,
}: JarvisWatermarkProps): JSX.Element {
  const opacityClass = `opacity-[${opacity}]`;
  const positionClass = POSITION_CLASSES[position];

  return (
    <span
      aria-hidden="true"
      data-jarvis-watermark={position}
      className={`pointer-events-none absolute ${positionClass} ${opacityClass} font-display uppercase tracking-[0.5em] text-[var(--jarvis-watermark)] select-none`}
      style={{
        // Make the letters outline-only. -webkit-text-stroke-width in px,
        // -webkit-text-stroke-color reads from --jarvis-watermark.
        WebkitTextStrokeWidth: '1px',
        WebkitTextStrokeColor: 'var(--jarvis-watermark)',
        color: 'transparent',
      }}
    >
      JARVIS
    </span>
  );
}

export type { JarvisWatermarkPosition, JarvisWatermarkProps };
