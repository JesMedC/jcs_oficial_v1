/*
 * jarvis-ui-redesign (T-14 polish) — Sparkline primitive.
 *
 * Tiny SVG line chart used in the dashboard KPI cards. Takes a
 * series of numbers and renders a single stroke + optional
 * filled gradient underneath. Renders as a horizontal strip with
 * a fixed viewBox so it scales to whatever container width.
 *
 * Props:
 *   - data: ReadonlyArray<number> — the values to plot (left to right).
 *   - width / height — the SVG viewport. The line scales to fit.
 *   - tone: profit | loss | primary — drives the stroke color.
 *   - filled: when true, draws a gradient area under the line.
 *   - className: extra Tailwind classes for the wrapper.
 */
import { useMemo } from 'react';

type SparklineTone = 'profit' | 'loss' | 'primary';

interface SparklineProps {
  readonly data: ReadonlyArray<number>;
  readonly width?: number;
  readonly height?: number;
  readonly tone?: SparklineTone;
  readonly filled?: boolean;
  readonly className?: string;
}

const TONE_STROKE: Record<SparklineTone, string> = {
  profit: 'var(--color-jade-profit)',
  loss: 'var(--color-jade-loss)',
  primary: 'var(--color-jade)',
};

const TONE_FILL: Record<SparklineTone, string> = {
  profit: 'rgba(60, 224, 184, 0.18)',
  loss: 'rgba(255, 61, 95, 0.18)',
  primary: 'rgba(0, 212, 216, 0.18)',
};

const STROKE_WIDTH = 1.6;
const PADDING = 2;

export function Sparkline({
  data,
  width = 80,
  height = 24,
  tone = 'profit',
  filled = true,
  className = '',
}: SparklineProps) {
  const { path, area, lastX, lastY } = useMemo(() => {
    if (data.length === 0) {
      return { path: '', area: '', lastX: 0, lastY: height / 2 };
    }
    if (data.length === 1) {
      const y = height / 2;
      return { path: `M${PADDING},${y} L${width - PADDING},${y}`, area: '', lastX: width - PADDING, lastY: y };
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = (width - 2 * PADDING) / (data.length - 1);
    const points = data.map((v, i) => {
      const x = PADDING + i * stepX;
      const y = PADDING + (height - 2 * PADDING) * (1 - (v - min) / range);
      return { x, y };
    });
    const path = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' ');
    const area = filled
      ? `M${points[0]!.x.toFixed(2)},${height} ` +
        points.map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') +
        ` L${points[points.length - 1]!.x.toFixed(2)},${height} Z`
      : '';
    return {
      path,
      area,
      lastX: points[points.length - 1]!.x,
      lastY: points[points.length - 1]!.y,
    };
  }, [data, width, height, filled]);

  if (data.length === 0) {
    return null;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {filled ? (
        <path d={area} fill={TONE_FILL[tone]} />
      ) : null}
      <path
        d={path}
        stroke={TONE_STROKE[tone]}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle
        cx={lastX}
        cy={lastY}
        r={1.6}
        fill={TONE_STROKE[tone]}
      />
    </svg>
  );
}
