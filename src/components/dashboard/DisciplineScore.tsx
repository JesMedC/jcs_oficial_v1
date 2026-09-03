/*
 * DisciplineScore — Módulo 4 / Métrica 6.
 *
 * Circular 0..100 score. Tier colour: 0..49 red, 50..69 amber,
 * 70..100 jade. Below the gauge the label flips between
 * "Disciplina solida" / "Cuidado: revenge trading" / "Fuera de control"
 * depending on the tier.
 */
interface Props {
  readonly score: number;
}

const SIZE = 152;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

function tierFor(score: number): {
  color: string;
  label: string;
} {
  if (score >= 70) return { color: '#00FF9D', label: 'Disciplina solida' };
  if (score >= 50) return { color: '#F3B94E', label: 'Cuidado con revenge trading' };
  return { color: '#FF2A55', label: 'Fuera de control' };
}

export function DisciplineScore({ score }: Props) {
  const safe = Math.max(0, Math.min(100, score));
  const offset = CIRC * (1 - safe / 100);
  const t = tierFor(safe);

  return (
    <div
      data-testid="dash-discipline"
      className="rounded-xl border border-[rgba(0,255,157,0.18)] bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] p-5 md:p-6 flex flex-col items-center"
    >
      <div className="self-start font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
        Disciplina
      </div>

      <div className="relative mt-2" style={{ width: SIZE, height: SIZE }}>
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
            stroke={t.color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1.2s ease-out',
              filter: `drop-shadow(0 0 8px ${t.color})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-3xl font-semibold"
            style={{ color: t.color, textShadow: `0 0 8px ${t.color}` }}
          >
            {Math.round(safe)}
          </span>
          <span className="font-display uppercase tracking-widest text-[9px] text-text-muted mt-0.5">
            / 100
          </span>
        </div>
      </div>

      <p
        className="mt-3 font-display uppercase tracking-wide text-[10px] md:text-xs text-center"
        style={{ color: t.color, textShadow: `0 0 6px ${t.color}` }}
      >
        {t.label}
      </p>
    </div>
  );
}
