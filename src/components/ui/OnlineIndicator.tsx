/*
 * jarvis-ui-redesign (T-11) — OnlineIndicator primitive.
 *
 * Reusable cyan-green dot + optional label, mounted wherever the
 * HUD needs to surface a live "online" or "active session" state:
 *
 *   - PortalHeader       : top-right of the chrome ("SESIÓN ACTIVA")
 *   - SidebarFooter      : next to the avatar in the user identity row
 *
 * Color reads from --jarvis-online (cyan-green #3CE0B8 in dark
 * mode, deeper #1F8A8A in light). Halo glow mirrors the dot color.
 *
 * Visual contract pinned by `OnlineIndicator.test.tsx`.
 */

type OnlineIndicatorSize = 'sm' | 'md' | 'lg';

interface OnlineIndicatorProps {
  readonly size?: OnlineIndicatorSize;
  readonly label?: string;
  readonly ariaLabel?: string;
  readonly className?: string;
}

const SIZE_CLASSES: Record<OnlineIndicatorSize, string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-3 h-3',
};

export function OnlineIndicator({
  size = 'md',
  label,
  ariaLabel = 'En línea',
  className = '',
}: OnlineIndicatorProps): JSX.Element {
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <span
        data-jarvis-online-dot
        aria-hidden="true"
        className={`inline-block rounded-full bg-[var(--jarvis-online)] shadow-[0_0_10px_var(--jarvis-online)] animate-status-dot-pulse ${SIZE_CLASSES[size]}`}
      />
      {label ? (
        <span
          aria-hidden="true"
          className="font-display uppercase tracking-wide text-[10px] md:text-xs text-text-secondary"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}

export type { OnlineIndicatorProps, OnlineIndicatorSize };
