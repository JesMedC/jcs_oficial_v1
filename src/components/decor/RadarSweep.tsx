/*
 * design-system-v1 (Wave 5) — RadarSweep decorative primitive.
 *
 * Círculo con un cono de barrido que rota 360° en loop infinito.
 * Inspirado en los radares/scanners de JARVIS.
 *
 * Pensado para backgrounds de hero panels — efecto "live monitoring"
 * sin distraer del contenido (el sweep es translúcido y suave).
 *
 * Color: usa CSS vars del theme. El cono usa un gradient desde
 * ``--color-jade-glow`` (full opacity) hasta transparente, para que
 * el "frente" del barrido sea más brillante.
 *
 * Props:
 *   - size: 'sm' | 'md' | 'lg' (default 'md')
 *   - duration: segundos por revolución completa (default 6s)
 *   - className: posicionamiento extra
 */
export type RadarSweepSize = 'sm' | 'md' | 'lg';

interface RadarSweepProps {
  readonly size?: RadarSweepSize;
  readonly duration?: number;
  readonly className?: string;
}

const SIZE_PX: Record<RadarSweepSize, number> = {
  sm: 120,
  md: 200,
  lg: 320,
};

export function RadarSweep({
  size = 'md',
  duration = 6,
  className = '',
}: RadarSweepProps) {
  const px = SIZE_PX[size];

  return (
    <div
      className={`relative ${className}`}
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      {/* Concentric circles (target rings) */}
      <svg viewBox={`0 0 ${px} ${px}`} className="absolute inset-0">
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <circle
            key={r}
            cx={px / 2}
            cy={px / 2}
            r={(px / 2) * r}
            fill="none"
            stroke="var(--hud-ring-track)"
            strokeWidth="1"
            strokeDasharray={r === 1 ? 'none' : '2 4'}
            opacity={0.5}
          />
        ))}
        {/* Crosshair lines */}
        <line x1={px / 2} y1="0" x2={px / 2} y2={px} stroke="var(--hud-ring-track)" strokeWidth="1" opacity={0.4} />
        <line x1="0" y1={px / 2} x2={px} y2={px / 2} stroke="var(--hud-ring-track)" strokeWidth="1" opacity={0.4} />
      </svg>

      {/* Sweep cone — rotates infinitely */}
      <div
        className="absolute inset-0 animate-[hud-rotate_var(--sweep-duration)_linear_infinite]"
        style={{ '--sweep-duration': `${duration}s` } as unknown as Record<string, string>}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 origin-bottom"
          style={{
            width: 0,
            height: 0,
            borderLeft: `${px / 2}px solid transparent`,
            borderRight: `${px / 2}px solid transparent`,
            borderTop: `${px / 2}px solid var(--hud-ring-value)`,
            opacity: 0.25,
            filter: 'blur(8px)',
          }}
        />
        {/* Bright leading edge */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 origin-bottom"
          style={{
            width: 0,
            height: 0,
            borderLeft: `${px / 2}px solid transparent`,
            borderRight: `${px / 2}px solid transparent`,
            borderTop: `1px solid var(--color-jade-glow)`,
            opacity: 0.6,
            boxShadow: '0 0 8px var(--hud-ring-value)',
          }}
        />
      </div>

      {/* Center dot */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--color-jade)] animate-status-dot-pulse"
        style={{ boxShadow: '0 0 12px var(--color-jade-glow)' }}
      />
    </div>
  );
}
