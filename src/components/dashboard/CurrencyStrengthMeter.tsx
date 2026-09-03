/*
 * CurrencyStrengthMeter — Módulo 3 / Medidor de Fuerza de Divisas.
 *
 * Cyberpunk radar / equalizer: 8 currencies arranged around an
 * octagonal grid (USD, EUR, GBP, JPY, AUD, NZD, CAD, CHF). Each
 * spoke length encodes relative strength (0..100). Stronger
 * currencies lean toward jade; weaker toward loss-red.
 *
 * Drawn as inline SVG so the radial layout, gradient fills, and
 * glow drop-shadows all sit in one coordinate space.
 */
import type { CurrencyStrength } from '../../features/dashboard/types';

interface Props {
  readonly currencies: ReadonlyArray<CurrencyStrength>;
}

const SIZE = 280;
const CENTER = SIZE / 2;
const MAX_RADIUS = 110;

function strengthColor(value: number): string {
  if (value >= 70) return '#00FF9D';
  if (value >= 40) return '#00B8FF';
  if (value >= 25) return '#F3B94E';
  return '#FF2A55';
}

export function CurrencyStrengthMeter({ currencies }: Props) {
  const n = Math.max(currencies.length, 3);
  const angleStep = (Math.PI * 2) / n;

  return (
    <div
      data-testid="dash-currency-strength"
      className="rounded-xl border border-[rgba(0,255,157,0.18)] bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] p-5 md:p-6"
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FF9D]"
          style={{ boxShadow: '0 0 6px #00FF9D' }}
          aria-hidden="true"
        />
        <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
          Fuerza de divisas
        </span>
      </div>

      <div className="mt-4 flex justify-center">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Medidor de fuerza de las 8 divisas mayores"
        >
          <defs>
            <radialGradient id="cs-fade" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="rgba(0,255,157,0)" />
              <stop offset="100%" stopColor="rgba(0,255,157,0.18)" />
            </radialGradient>
          </defs>

          {/* Concentric rings */}
          {[0.33, 0.66, 1].map((r, idx) => (
            <circle
              key={`r-${idx}`}
              cx={CENTER}
              cy={CENTER}
              r={MAX_RADIUS * r}
              fill="none"
              stroke="rgba(0,255,157,0.15)"
              strokeDasharray="2 4"
            />
          ))}

          {/* Spokes */}
          {currencies.map((c, idx) => {
            const angle = -Math.PI / 2 + idx * angleStep;
            const x = CENTER + Math.cos(angle) * MAX_RADIUS;
            const y = CENTER + Math.sin(angle) * MAX_RADIUS;
            return (
              <line
                key={`spoke-${idx}`}
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                stroke="rgba(0,255,157,0.10)"
              />
            );
          })}

          {/* Strength polygon (fill) */}
          <polygon
            points={currencies
              .map((c, idx) => {
                const angle = -Math.PI / 2 + idx * angleStep;
                const r = (c.strength / 100) * MAX_RADIUS;
                const x = CENTER + Math.cos(angle) * r;
                const y = CENTER + Math.sin(angle) * r;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(' ')}
            fill="url(#cs-fade)"
            stroke="#00FF9D"
            strokeWidth={1.5}
            style={{ filter: 'drop-shadow(0 0 8px #00FF9D)' }}
          />

          {/* Vertex dots + labels */}
          {currencies.map((c, idx) => {
            const angle = -Math.PI / 2 + idx * angleStep;
            const r = (c.strength / 100) * MAX_RADIUS;
            const vx = CENTER + Math.cos(angle) * r;
            const vy = CENTER + Math.sin(angle) * r;
            // Label position outside the outer ring.
            const lx = CENTER + Math.cos(angle) * (MAX_RADIUS + 18);
            const ly = CENTER + Math.sin(angle) * (MAX_RADIUS + 18);
            const color = strengthColor(c.strength);
            return (
              <g key={`v-${idx}`}>
                <circle
                  cx={vx}
                  cy={vy}
                  r={4}
                  fill={color}
                  style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                />
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="'Orbitron', monospace"
                  fontSize={11}
                  fill="rgba(255,255,255,0.9)"
                  style={{ letterSpacing: '0.04em' }}
                >
                  {c.currency}
                </text>
                <text
                  x={lx}
                  y={ly + 12}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="'JetBrains Mono', ui-monospace, monospace"
                  fontSize={10}
                  fill={color}
                  style={{
                    textShadow: `0 0 4px ${color}`,
                  }}
                >
                  {c.strength}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
