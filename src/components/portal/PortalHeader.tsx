/*
 * jarvis-ui-redesign (T-10 / T-11 refactor, post-deploy polish) —
 * PortalHeader with the centered JARDE brand block + marquee.
 *
 * The reference image shows the brand centered at the top with a
 * tiny uppercase sub-header that marquees "DATA HIERARCHY · DATA
 * HIERARCHY" so it reads as a moving ticker. We keep the online
 * status pill on the right edge so the chrome still surfaces the
 * session state.
 */
import { OnlineIndicator } from '../ui/OnlineIndicator';

const MARQUEE_TEXT =
  'JARDE CAPITAL SUITE  ·  CORE INTERFACE  ·  DATA HIERARCHY  ·  DATA HIERARCHY  ·  DATA HIERARCHY  ·  ';

export function PortalHeader(): JSX.Element {
  return (
    <header
      data-jarvis-portal-header
      className="sticky top-0 z-30 px-3 sm:px-4 lg:px-6 py-2.5 bg-[var(--glass-surface)] backdrop-blur-glass border-b border-[var(--portal-border)] shadow-[0_12px_34px_rgba(0,0,0,0.22)]"
    >
      <div className="relative flex items-center justify-between gap-3 min-h-[3rem] rounded-xl border border-[var(--portal-border)] bg-[var(--portal-surface-strong)] px-3 sm:px-4 shadow-[var(--portal-glow)]">
        <div className="hidden md:flex items-center gap-2 min-w-[10rem]">
          <OnlineIndicator size="sm" ariaLabel="Sesión activa" />
          <span className="font-display uppercase tracking-[0.2em] text-[10px] md:text-xs text-text-secondary">
            SESIÓN ACTIVA
          </span>
        </div>

        <div className="flex flex-col items-center leading-tight w-full max-w-2xl mx-auto min-w-0">
          <h1
            className="font-display uppercase tracking-[0.25em] text-text-primary text-[0.7rem] sm:text-sm md:text-lg xl:text-xl text-center truncate max-w-full"
            style={{ textShadow: '0 0 14px var(--jarvis-h1-glow)' }}
          >
            JARDE CAPITAL SUITE <span className="text-primary">-</span> CORE INTERFACE
          </h1>
          <div aria-hidden="true" className="relative mt-1 w-full overflow-hidden h-3">
            <div
              className="absolute inset-y-0 left-0 flex items-center gap-6 whitespace-nowrap font-display uppercase tracking-[0.4em] text-[8px] md:text-[9px] text-text-muted animate-jarvis-marquee"
              style={{ width: '200%' }}
            >
              <span>{MARQUEE_TEXT.repeat(2)}</span>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-end gap-2 min-w-[10rem]">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_14px_var(--color-jade-glow)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
            Mercado · live
          </span>
        </div>
      </div>
    </header>
  );
}
