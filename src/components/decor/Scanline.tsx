/*
 * design-system-v1 (Wave 5) — Scanline decorative primitive.
 *
 * Línea horizontal animada que cruza el contenedor de arriba a abajo
 * en loop. Inspirado en los "scanner lines" del HUD de JARVIS.
 *
 * Uso típico:
 *   - Overlay sobre una tarjeta de métrica (efecto "live data")
 *   - Overlay sobre el sidebar (sensación de "active monitoring")
 *
 * El scanline es puramente decorativo (``aria-hidden``) y se renderiza
 * con ``pointer-events: none`` para no interceptar clicks del
 * contenedor padre.
 *
 * Color: usa ``var(--scanline-color)`` para que se adapte al modo
 * activo (jade neón translúcido en dark, jade medio translúcido en
 * light). El glow del primary refuerza la sensación "data is live".
 *
 * Props:
 *   - duration: segundos que tarda en cruzar (default 4s)
 *   - className: para posicionar (``absolute inset-0`` por defecto)
 */
interface ScanlineProps {
  readonly duration?: number;
  readonly className?: string;
}

export function Scanline({ duration = 4, className = 'absolute inset-0 overflow-hidden pointer-events-none' }: ScanlineProps) {
  return (
    <div className={className} aria-hidden="true">
      <div
        className="absolute left-0 right-0 h-px animate-[hud-scanline_var(--scan-duration)_linear_infinite]"
        style={
          {
            background:
              'linear-gradient(90deg, transparent 0%, var(--scanline-color) 50%, transparent 100%)',
            boxShadow: '0 0 12px var(--scanline-color)',
            '--scan-duration': `${duration}s`,
          } as unknown as Record<string, string>
        }
      />
    </div>
  );
}
