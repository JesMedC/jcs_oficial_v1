/*
 * design-system-v1 (Wave 5) — Theme toggle button.
 *
 * Botón sol/luna con animación cross-fade entre los dos glyphs. El
 * glyph visible sigue el ``mode`` del ``useThemeStore``. El fondo y
 * el border usan CSS vars (``var(--glass-surface)``,
 * ``var(--color-jade-border)``) para que funcione en ambos modos sin
 * lógica condicional.
 *
 * Ubicado en el chrome del portal (PortalShell sidebar / topbar). El
 * consumidor decide dónde renderizarlo — este componente sólo aporta
 * la UI y la acción.
 *
 * Accesibilidad: ``aria-label`` cambia entre "Cambiar a modo claro" /
 * "Cambiar a modo oscuro" según el estado actual (mejor que un label
 * fijo porque el botón anuncia la ACCIÓN, no el estado).
 */
import { useThemeStore } from '../../stores/useThemeStore';

export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = mode === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-pressed={!isDark}
      data-theme-toggle
      data-mode={mode}
      className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg border border-[var(--color-jade-border)] bg-[var(--glass-surface)] backdrop-blur-[12px] transition-all duration-200 hover:border-[var(--color-jade-border-line)] hover:shadow-[0_0_12px_rgba(0,255,157,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-jade)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
    >
      {/* Sun (light mode glyph) — visible when isDark, hidden when light. */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`absolute h-4 w-4 text-[var(--color-jade)] transition-all duration-300 ${
          isDark
            ? 'opacity-100 rotate-0 scale-100'
            : 'opacity-0 -rotate-90 scale-50'
        }`}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      {/* Moon (dark mode glyph) — visible when light, hidden when dark. */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`absolute h-4 w-4 text-[var(--color-jade)] transition-all duration-300 ${
          isDark
            ? 'opacity-0 rotate-90 scale-50'
            : 'opacity-100 rotate-0 scale-100'
        }`}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
