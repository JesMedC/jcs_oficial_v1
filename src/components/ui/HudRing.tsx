/*
 * jarvis-ui-redesign (T-04) — HudRing primitive.
 *
 * The double-track HUD progress ring that drives the dashboard
 * winrate tiles + KPI rings. Visual reference (Iron Man HUD):
 * an outer ring at higher opacity with the percentage value arc,
 * and an inner ring at lower opacity for the depth effect.
 *
 *   - value 0..100 (clamped)
 *   - size sm | md | lg (outer ring radius in px)
 *   - tone primary | profit | loss | warning (drives the value stroke)
 *   - showInner (default true) — renders the second concentric ring
 *   - role=progressbar + aria-valuenow for a11y
 *
 * Math: arc length is `2 * PI * r`. We use stroke-dasharray = C and
 * stroke-dashoffset = C - (value / 100) * C to draw the filled arc.
 * -r trick on the SVG transform rotates the arc 90deg CCW so the
 * progress starts at 12 o'clock (Iron Man HUD convention).
 */
import type { ReactNode } from 'react';

type HudRingSize = 'sm' | 'md' | 'lg';
type HudRingTone = 'primary' | 'profit' | 'loss' | 'warning';

interface HudRingProps {
  /** 0..100 percentage; values outside this range are clamped. */
  readonly value: number;
  readonly size?: HudRingSize;
  readonly tone?: HudRingTone;
  readonly showInner?: boolean;
  readonly className?: string;
  readonly children?: ReactNode;
}

export type { HudRingProps, HudRingSize, HudRingTone };

/**
 * Outer-ring radius by size. We render the SVG inside a fixed-size
 * container so the inner content (label, value) is centered by flex.
 * Stroke width is constant across sizes for visual consistency.
 */
const SIZES: Record<HudRingSize, { outerR: number; innerR: number; box: number }> = {
  sm: { outerR: 18, innerR: 13, box: 56 },
  md: { outerR: 28, innerR: 21, box: 84 },
  lg: { outerR: 40, innerR: 30, box: 120 },
};

const STROKE_WIDTH = 3;

const TONE_STROKE: Record<HudRingTone, string> = {
  primary: 'var(--jarvis-progress-value)',
  profit: 'var(--color-jade-profit)',
  loss: 'var(--color-jade-loss)',
  warning: 'var(--color-jade-warning)',
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function circumference(radius: number): number {
  return 2 * Math.PI * radius;
}

export function HudRing({
  value,
  size = 'md',
  tone = 'primary',
  showInner = true,
  className = '',
  children,
}: HudRingProps) {
  const { outerR, innerR, box } = SIZES[size];
  const safeValue = clamp(value, 0, 100);

  // Outer ring math.
  const outerC = circumference(outerR);
  const outerOffset = outerC - (safeValue / 100) * outerC;

  // Inner ring math (slightly dimmer; mirrors the outer but at half
  // amplitude so the double-ring effect reads as depth, not duplicate).
  const innerC = circumference(innerR);
  const innerOffset = innerC - (safeValue / 100) * innerC;

  const labelId = `hud-ring-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(safeValue)}
      aria-valuemin={0}
      aria-valuemax={100}
      data-jarvis-ring={`${size}`}
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: `${box}px`, height: `${box}px` }}
    >
      <svg
        // -90deg rotation: arc starts at 12 o'clock (top center).
        style={{ transform: 'rotate(-90deg)' }}
        width={box}
        height={box}
        viewBox={`0 0 ${box} ${box}`}
        aria-hidden="true"
      >
        {/* outer track */}
        <circle
          data-ring-role="outer-track"
          cx={box / 2}
          cy={box / 2}
          r={outerR}
          fill="none"
          stroke="var(--jarvis-progress-track)"
          strokeWidth={STROKE_WIDTH}
        />
        {/* outer value arc */}
        <circle
          data-ring-role="outer-value"
          cx={box / 2}
          cy={box / 2}
          r={outerR}
          fill="none"
          stroke={TONE_STROKE[tone]}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={outerC}
          strokeDashoffset={outerOffset}
        />
        {/* inner ring (optional) */}
        {showInner && (
          <>
            <circle
              data-ring-role="inner-track"
              cx={box / 2}
              cy={box / 2}
              r={innerR}
              fill="none"
              stroke="var(--jarvis-progress-track-inner)"
              strokeWidth={1.5}
            />
            <circle
              data-ring-role="inner-value"
              cx={box / 2}
              cy={box / 2}
              r={innerR}
              fill="none"
              stroke="var(--jarvis-progress-value-inner)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray={innerC}
              strokeDashoffset={innerOffset}
            />
          </>
        )}
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-labelledby={labelId}
      >
        {children}
      </div>
    </div>
  );
}
