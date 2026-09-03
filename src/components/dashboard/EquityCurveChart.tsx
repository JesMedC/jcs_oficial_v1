/*
 * EquityCurveChart — Módulo 2 / Curva Evolutiva de Balance.
 *
 * Area chart drawn as inline SVG. The stroke is cyan-blue
 * (#00B8FF) with a soft glow, the fill is a jade→abyssal gradient
 * so the curve reads as "growth over abyssal background". Triangular
 * markers flag days with deposits/withdrawals so the user can tell
 * organic growth from injected capital at a glance.
 *
 * Axis labels: dates on X (rotated -35°), USD on Y. The chart
 * auto-fits the data range with a 12% padding top and bottom.
 */
import { useMemo } from 'react';

import type { PnlPoint } from '../../features/dashboard/types';

interface Props {
  readonly points: ReadonlyArray<PnlPoint>;
  /** Days flagged as deposit/withdrawal (synthetic injection markers). */
  readonly injectionDates?: ReadonlyArray<string>;
}

const WIDTH = 720;
const HEIGHT = 240;
const PAD_X = 36;
const PAD_Y = 24;

function formatAxisDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function formatUsdShort(n: number): string {
  if (Math.abs(n) >= 1000) {
    return `$${(n / 1000).toFixed(1)}k`;
  }
  return `$${n.toFixed(0)}`;
}

export function EquityCurveChart({ points, injectionDates = [] }: Props) {
  const layout = useMemo(() => {
    if (points.length === 0) return null;
    const ys = points.map((p) => p.pnl);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, 0);
    const rangeY = maxY - minY || 1;
    const padding = rangeY * 0.18;
    const yMin = minY - padding;
    const yMax = maxY + padding;
    const stepX = points.length > 1 ? (WIDTH - PAD_X * 2) / (points.length - 1) : 0;

    const coords = points.map((p, i) => ({
      x: PAD_X + i * stepX,
      y: HEIGHT - PAD_Y - ((p.pnl - yMin) / (yMax - yMin)) * (HEIGHT - PAD_Y * 2),
      point: p,
    }));

    // Build a smooth bezier path.
    let d = `M ${coords[0]!.x.toFixed(1)} ${coords[0]!.y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i += 1) {
      const p0 = coords[i - 1]!;
      const p1 = coords[i]!;
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx.toFixed(1)} ${p0.y.toFixed(1)}, ${cx.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    const areaPath = `${d} L ${PAD_X + (coords.length - 1) * stepX} ${HEIGHT - PAD_Y} L ${PAD_X} ${HEIGHT - PAD_Y} Z`;

    // Y-axis ticks (4 labels).
    const yTicks = [0, 0.33, 0.66, 1].map((t) => {
      const yVal = yMin + (yMax - yMin) * (1 - t);
      return { y: PAD_Y + (HEIGHT - PAD_Y * 2) * t, label: formatUsdShort(yVal) };
    });

    // X-axis ticks: roughly every 7 points.
    const xTickInterval = Math.max(1, Math.floor(points.length / 8));
    const xTicks = coords
      .map((c, i) => ({ c, i }))
      .filter(({ i }) => i % xTickInterval === 0 || i === coords.length - 1);

    const injectionSet = new Set(injectionDates);

    return { coords, d, areaPath, yTicks, xTicks, injectionSet };
  }, [points, injectionDates]);

  if (!layout || !layout.coords.length) {
    return null;
  }

  return (
    <div
      data-testid="dash-equity-curve"
      className="rounded-xl border border-[rgba(0,255,157,0.18)] bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] p-5 md:p-6 overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-[#00B8FF]"
            style={{ boxShadow: '0 0 6px #00B8FF' }}
            aria-hidden="true"
          />
          <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
            Curva de balance
          </span>
        </div>
        <div className="font-display uppercase tracking-wider text-[9px] text-text-muted flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2 rotate-45 bg-[#00B8FF]" />
            Balance
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2 rotate-45 bg-[#F3B94E]" />
            Inyeccion
          </span>
        </div>
      </div>

      <div className="mt-4 -mx-2 overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ minWidth: 480 }}
          role="img"
          aria-label="Curva de evolucion del balance"
        >
          <defs>
            <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,255,157,0.45)" />
              <stop offset="55%" stopColor="rgba(0,184,255,0.18)" />
              <stop offset="100%" stopColor="rgba(6,11,16,0)" />
            </linearGradient>
          </defs>

          {/* Y axis grid */}
          {layout.yTicks.map((t, idx) => (
            <g key={`y-${idx}`}>
              <line
                x1={PAD_X}
                y1={t.y}
                x2={WIDTH - PAD_X}
                y2={t.y}
                stroke="rgba(0,255,157,0.10)"
                strokeDasharray="3 4"
              />
              <text
                x={PAD_X - 6}
                y={t.y + 4}
                textAnchor="end"
                fontFamily="'JetBrains Mono', ui-monospace, monospace"
                fontSize={10}
                fill="rgba(255,255,255,0.45)"
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* Area + line */}
          <path d={layout.areaPath} fill="url(#equity-fill)" />
          <path
            d={layout.d}
            fill="none"
            stroke="#00B8FF"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter:
                'drop-shadow(0 0 6px rgba(0,184,255,0.7)) drop-shadow(0 0 2px rgba(0,184,255,0.9))',
            }}
          />

          {/* Injection markers (diamonds) */}
          {layout.coords.map((c) => {
            if (!layout.injectionSet.has(c.point.date)) return null;
            return (
              <g key={`inj-${c.point.date}`}>
                <rect
                  x={c.x - 4}
                  y={c.y - 4}
                  width={8}
                  height={8}
                  transform={`rotate(45 ${c.x} ${c.y})`}
                  fill="#F3B94E"
                  style={{ filter: 'drop-shadow(0 0 4px #F3B94E)' }}
                />
              </g>
            );
          })}

          {/* Last point pulse */}
          <circle
            cx={layout.coords[layout.coords.length - 1]!.x}
            cy={layout.coords[layout.coords.length - 1]!.y}
            r={4}
            fill="#00B8FF"
            style={{ filter: 'drop-shadow(0 0 6px #00B8FF)' }}
          />

          {/* X axis tick labels */}
          {layout.xTicks.map(({ c, i }) => (
            <text
              key={`x-${i}`}
              x={c.x}
              y={HEIGHT - 6}
              textAnchor="middle"
              fontFamily="'JetBrains Mono', ui-monospace, monospace"
              fontSize={9}
              fill="rgba(255,255,255,0.45)"
              transform={`rotate(-35 ${c.x} ${HEIGHT - 6})`}
            >
              {formatAxisDate(c.point.date)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
