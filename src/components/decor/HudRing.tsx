/*
 * design-system-v1 (Wave 5) — HudRing decorative primitive.
 *
 * Anillo HUD concéntrico con valor numérico en el centro. Pensado para
 * reemplazar los "big number" planos del Dashboard hero (P&L del día,
 * winrate, profit factor, etc.) — el valor se muestra en JetBrains
 * Mono grande con un anillo animado alrededor que da el vibe
 * "scanner de JARVIS".
 *
 * Animaciones:
 *   - Anillo externo: rotación lenta (24s) via CSS animation
 *   - Anillo medio: pulsación de opacidad (status-dot-pulse ya existe)
 *   - Tick marks en el perímetro (12 segmentos, rotan con el anillo
 *     externo) — efecto "instrumento de medición"
 *   - Valor central: glow sutil del primary
 *
 * Tokens: usa ``var(--hud-ring-track)`` y ``var(--hud-ring-value)``
 * para que funcione en dark y light automáticamente. El glow del valor
 * central usa el color primario del modo activo.
 *
 * Props:
 *   - value: número a mostrar (0..max)
 *   - max: máximo de la escala (default 100)
 *   - unit: string opcional ("%" / "$" / "x" / etc.) que se renderiza
 *     a la derecha del valor
 *   - label: string opcional que se renderiza debajo del valor
 *   - size: 'sm' | 'md' | 'lg' (default 'md'). Cambia el tamaño del
 *     SVG y del número.
 *
 * Accesibilidad: el número se renderiza con role="text" para que
 * screen readers lo lean correctamente (los círculos son puramente
 * decorativos).
 */
import { useId } from 'react';

export type HudRingSize = 'sm' | 'md' | 'lg';

interface HudRingProps {
  readonly value: number;
  readonly max?: number;
  readonly unit?: string;
  readonly label?: string;
  readonly size?: HudRingSize;
  readonly className?: string;
}

const SIZE_PX: Record<HudRingSize, number> = {
  sm: 96,
  md: 128,
  lg: 168,
};

const FONT_PX: Record<HudRingSize, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
};

export function HudRing({
  value,
  max = 100,
  unit,
  label,
  size = 'md',
  className = '',
}: HudRingProps) {
  const px = SIZE_PX[size];
  const radius = px / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(max, value));
  const filledFraction = clamped / max;
  const strokeDashoffset = circumference * (1 - filledFraction);
  const reactId = useId();
  const gradId = `hud-grad-${reactId.replace(/:/g, '')}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: px, height: px }}
      role="group"
      aria-label={label ?? `${clamped} de ${max}`}
    >
      <svg
        viewBox={`0 0 ${px} ${px}`}
        className="absolute inset-0 -rotate-90 animate-[hud-rotate_24s_linear_infinite]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-jade)" />
            <stop offset="100%" stopColor="var(--color-jade-light)" />
          </linearGradient>
        </defs>
        {/* Track ring */}
        <circle
          cx={px / 2}
          cy={px / 2}
          r={radius}
          fill="none"
          stroke="var(--hud-ring-track)"
          strokeWidth="2"
        />
        {/* Value ring — uses the gradient; the offset animates the fill. */}
        <circle
          cx={px / 2}
          cy={px / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ filter: 'drop-shadow(0 0 6px var(--hud-ring-value))' }}
        />
        {/* Tick marks — 12 segmentos en el perímetro */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const x1 = px / 2 + Math.cos(angle) * (radius - 4);
          const y1 = px / 2 + Math.sin(angle) * (radius - 4);
          const x2 = px / 2 + Math.cos(angle) * (radius + 1);
          const y2 = px / 2 + Math.sin(angle) * (radius + 1);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--hud-ring-track)"
              strokeWidth="1.5"
              opacity={0.7}
            />
          );
        })}
      </svg>
      {/* Inner pulsing ring */}
      <div
        className="absolute inset-2 rounded-full border border-[var(--hud-ring-value)] opacity-40 animate-status-dot-pulse"
        aria-hidden="true"
      />
      {/* Center value */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <span
          className={`font-mono ${FONT_PX[size]} font-semibold text-[var(--color-jade)] tabular-nums leading-none`}
          role="text"
          style={{ textShadow: '0 0 8px var(--hud-ring-value)' }}
        >
          {Math.round(clamped)}
          {unit ? (
            <span className="ml-1 text-xs text-[var(--color-jade-text-mut)]">
              {unit}
            </span>
          ) : null}
        </span>
        {label ? (
          <span className="mt-1 font-display uppercase tracking-[0.18em] text-[10px] text-[var(--color-jade-text-mut)]">
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}
