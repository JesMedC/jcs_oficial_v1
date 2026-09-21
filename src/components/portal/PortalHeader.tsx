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

const MARQUEE_TEXT = 'JARDE CAPITAL SUITE  ·  CORE INTERFACE  ·  DATA HIERARCHY  ·  DATA HIERARCHY  ·  DATA HIERARCHY  ·  ';

export function PortalHeader(): JSX.Element {
  return (
    <header
      data-jarvis-portal-header
      className="sticky top-0 z-30 px-4 md:px-6 py-3 bg-[var(--glass-surface)] backdrop-blur-glass border-b border-[var(--color-jade-border-line)]"
    >
      {/* Brand block centered */}
      <div className="flex items-center justify-center gap-4 min-h-[2.5rem]">
        {/* Left status pill — sits at the far left of the chrome */}
        <div className="absolute left-4 md:left-6 hidden md:flex items-center gap-2">
          <OnlineIndicator size="sm" ariaLabel="Sesión activa" />
          <span className="font-display uppercase tracking-[0.2em] text-[10px] md:text-xs text-text-secondary">
            SESIÓN ACTIVA
          </span>
        </div>

        {/* Centered brand + marquee */}
        <div className="flex flex-col items-center leading-tight w-full max-w-2xl mx-auto">
          <h1
            className="font-display uppercase tracking-[0.25em] text-text-primary text-base md:text-xl"
            style={{ textShadow: '0 0 14px var(--jarvis-h1-glow)' }}
          >
            JARDE CAPITAL SUITE <span className="text-primary">-</span> CORE INTERFACE
          </h1>
          {/* Marquee sub-header — duplicates the string so the
              translateX(-50%) loop is seamless. */}
          <div
            aria-hidden="true"
            className="relative mt-1 w-full overflow-hidden h-3"
          >
            <div
              className="absolute inset-y-0 left-0 flex items-center gap-6 whitespace-nowrap font-display uppercase tracking-[0.4em] text-[8px] md:text-[9px] text-text-muted animate-jarvis-marquee"
              style={{ width: '200%' }}
            >
              <span>{MARQUEE_TEXT.repeat(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
