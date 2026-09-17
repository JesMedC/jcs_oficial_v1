/*
 * jarvis-ui-redesign (T-10, T-11) — PortalHeader primitive.
 *
 * The persistent JARVIS status bar that sits at the top of the
 * authenticated portal main area. The HUD equivalent of the
 * reference image's top-of-page brand row:
 *
 *   "JARDE CAPITAL SUITE"            ● SESIÓN ACTIVA
 *   "CORE INTERFACE"                 online indicator
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │ JARDE CAPITAL SUITE              ● SESIÓN ACTIVA        │
 *   │ CORE INTERFACE                                          │
 *   ├─────────────────────────────────────────────────────────┤
 *
 * Visual contract pinned by `PortalHeader.test.tsx`.
 */
import { OnlineIndicator } from '../ui/OnlineIndicator';

export function PortalHeader(): JSX.Element {
  return (
    <header
      data-jarvis-portal-header
      className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 md:px-6 py-3 bg-[var(--glass-surface)] backdrop-blur-glass border-b border-[var(--color-jade-border-line)]"
    >
      {/* Brand block */}
      <div className="flex flex-col leading-tight min-w-0">
        <span
          className="font-display uppercase tracking-[0.25em] text-text-primary text-xs md:text-sm"
          style={{ textShadow: '0 0 12px rgba(0,212,216,0.35)' }}
        >
          JARDE CAPITAL SUITE
        </span>
        <span className="font-display uppercase tracking-[0.4em] text-text-muted text-[9px] md:text-[10px] mt-0.5">
          CORE INTERFACE
        </span>
      </div>

      {/* Status pill: online indicator + session label */}
      <OnlineIndicator label="SESIÓN ACTIVA" ariaLabel="Sesión activa" />
    </header>
  );
}
