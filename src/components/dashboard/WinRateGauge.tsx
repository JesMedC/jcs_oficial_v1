/*
 * WinRateGauge — Módulo 1 / Termómetro de Precisión.
 *
 * Circular SVG gauge. The arc fills clockwise from 0° to
 * ``winRate * 3.6`` degrees. Color thresholds:
 *
 *   - ≥ 60% → jade (`#00FF9D`)
 *   - 50..59% → amber (`#F3B94E`)
 *   - < 50% → loss (`#FF2A55`)
 *
 * The center shows the percentage in Orbitron-style (JetBrains Mono)
 * with the glow matching the arc colour. Below the gauge the
 * "W / L" counts sit as compact monospace chips so the trader sees
 * the absolute count behind the ratio at a glance.
 */
interface Props {
  readonly winRate: number; // 0..100
  readonly wins: number;
  readonly losses: number;
}

const SIZE = 168;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

function colorFor(rate: number): string {
  if (rate >= 60) return '#00FF9D';
  if (rate >= 50) return '#F3B94E';
  return '#FF2A55';
}

export function WinRateGauge({ winRate, wins, losses }: Props) {
  const safe = Math.max(0, Math.min(100, winRate));
  const offset = CIRC * (1 - safe / 100);
  const stroke = colorFor(safe);

  return (
    <div
      data-testid="dash-winrate"
      className="relative rounded-xl border border-[rgba(0,255,157,0.18)] bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] p-5 md:p-6 flex flex-col items-center"
    >
      <div className="self-start font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
        Winrate
      </div>

      <div className="relative mt-2" style={{ width: SIZE, height: SIZE }}>
        {/* Outer faint track */}
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(0,255,157,0.10)"
            strokeWidth={STROKE}
          />
        </svg>
        {/* Active arc */}
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="absolute inset-0 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={stroke}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1.2s ease-out, stroke 0.6s',
              filter: `drop-shadow(0 0 8px ${stroke})`,
            }}
          />
        </svg>
        {/* Centre percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-3xl md:text-4xl font-semibold"
            style={{ color: stroke, textShadow: `0 0 10px ${stroke}` }}
            data-testid="dash-winrate-value"
          >
            {safe.toFixed(1)}%
          </span>
          <span className="font-display uppercase tracking-widest text-[10px] text-text-muted mt-1">
            Aciertos
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span
          className="font-mono text-xs px-2 py-0.5 rounded-full border border-[rgba(53,208,127,0.35)] text-[#35D07F]"
          style={{ textShadow: '0 0 4px rgba(53,208,127,0.6)' }}
        >
          {wins} W
        </span>
        <span
          className="font-mono text-xs px-2 py-0.5 rounded-full border border-[rgba(255,42,85,0.35)] text-[#FF2A55]"
          style={{ textShadow: '0 0 4px rgba(255,42,85,0.6)' }}
        >
          {losses} L
        </span>
      </div>
    </div>
  );
}
