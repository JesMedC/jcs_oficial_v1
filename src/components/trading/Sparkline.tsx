/*
 * Cyber-Jade — Sparkline.
 *
 * Mini line chart rendered as inline SVG. Used inline next to balance
 * cells in the accounts list to give an at-a-glance "this account is
 * trending up/down" signal. Pure SVG (no chart lib) so it stays <1kB
 * and inherits the jade accent from the design system.
 *
 * Props:
 *   - points: ordered numeric series. The component normalizes them
 *     to fit the viewport (height / width) automatically.
 *   - width / height (default 80x24) — keep them small so the chart
 *     sits inline with the JetBrains Mono balance number.
 *   - trend (optional): "up" | "down" | "flat". When omitted the
 *     component derives the trend from the first vs. last point.
 *   - accent: jade | profit | loss | muted — picks the stroke colour.
 *
 * Deterministic visual: we don't generate points in this file (the
 * caller decides what data to feed). When the caller has no real
 * series yet (e.g. backend doesn't return one), they can pass a
 * derived deterministic array from the balance so the chart is at
 * least directionally consistent with the displayed number.
 */
import { useMemo, type CSSProperties } from 'react';

export type SparklineTrend = 'up' | 'down' | 'flat';
export type SparklineAccent = 'jade' | 'profit' | 'loss' | 'muted';

export interface SparklineProps {
  readonly points: ReadonlyArray<number>;
  readonly width?: number;
  readonly height?: number;
  readonly trend?: SparklineTrend;
  readonly accent?: SparklineAccent;
  readonly className?: string;
  readonly style?: CSSProperties;
}

const STROKE: Record<SparklineAccent, string> = {
  jade: '#00FF9D',
  profit: '#35D07F',
  loss: '#FF2A55',
  muted: '#8A9BA8',
};

function deriveTrend(points: ReadonlyArray<number>): SparklineTrend {
  if (points.length < 2) return 'flat';
  const first = points[0] ?? 0;
  const last = points[points.length - 1] ?? 0;
  const delta = last - first;
  const range = Math.max(...points) - Math.min(...points);
  // Treat tiny moves (<5% of range) as flat so we don't flicker on
  // noise-driven balance samples.
  if (range === 0) return 'flat';
  if (Math.abs(delta) / range < 0.05) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

export function Sparkline({
  points,
  width = 80,
  height = 24,
  trend,
  accent = 'jade',
  className,
  style,
}: SparklineProps) {
  const path = useMemo(() => {
    if (points.length === 0) return '';
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const stepX = points.length > 1 ? width / (points.length - 1) : 0;
    return points
      .map((p, i) => {
        const x = i * stepX;
        const y = height - ((p - min) / range) * height;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }, [points, width, height]);

  const resolvedTrend = trend ?? deriveTrend(points);
  const stroke = STROKE[accent];

  // The trend accent overrides the requested colour for profit/loss
  // unless the caller explicitly picked muted/jade.
  const finalStroke =
    accent === 'jade' || accent === 'muted'
      ? stroke
      : resolvedTrend === 'up'
        ? STROKE.profit
        : resolvedTrend === 'down'
          ? STROKE.loss
          : stroke;

  // Inset so the stroke doesn't get clipped at the edges.
  const PAD = 1;
  const innerW = width - PAD * 2;
  const innerH = height - PAD * 2;

  return (
    <svg
      role="img"
      aria-label={`Evolución: ${resolvedTrend === 'up' ? 'sube' : resolvedTrend === 'down' ? 'baja' : 'estable'}`}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      className={className}
      style={style}
    >
      {/* subtle baseline */}
      <line
        x1={0}
        x2={width}
        y1={height - 0.5}
        y2={height - 0.5}
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={1}
      />
      <g transform={`translate(${PAD} ${PAD})`}>
        <path
          d={path.replace(/[\d.]+ [\d.]+/g, (match) => {
            const [x, y] = match.split(' ');
            return `${(Number(x) - PAD).toFixed(2)} ${(Number(y) - PAD).toFixed(2)}`;
          })}
          fill="none"
          stroke={finalStroke}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 4px ${finalStroke})` }}
        />
        {/* last-point dot */}
        {points.length > 0 ? (
          <circle
            cx={innerW}
            cy={(() => {
              const min = Math.min(...points);
              const max = Math.max(...points);
              const range = max - min || 1;
              const last = points[points.length - 1] ?? min;
              return innerH - ((last - min) / range) * innerH;
            })()}
            r={1.8}
            fill={finalStroke}
            style={{ filter: `drop-shadow(0 0 4px ${finalStroke})` }}
          />
        ) : null}
      </g>
    </svg>
  );
}
