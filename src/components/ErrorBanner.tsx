/*
 * p0a.2 — error banner for backend envelopes.
 *
 * Renders the Spanish `message` from the backend envelope (which is
 * always user-friendly per the backend's policy) and a small
 * `Codigo: <code>` line for support. The correlation_id is logged
 * via console.warn so it lands in dev tools but doesn't pollute the
 * UI for end users.
 */
import { useEffect } from 'react';

import { GlassCard } from './GlassCard';
import type { ErrorEnvelope } from '../features/auth/types';

interface ErrorBannerProps {
  readonly error: ErrorEnvelope | null;
  readonly onDismiss?: () => void;
  readonly className?: string;
}

export function ErrorBanner({ error, onDismiss, className = '' }: ErrorBannerProps) {
  useEffect(() => {
    if (error !== null) {
      console.warn('[jcs] error envelope', {
        code: error.code,
        correlation_id: error.correlation_id,
      });
    }
  }, [error]);

  if (error === null) return null;

  return (
    <GlassCard
      variant="elevated"
      role="alert"
      aria-live="assertive"
      className={`border-loss/40 bg-loss/10 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-text-primary font-body text-sm md:text-base">{error.message}</p>
          <p className="text-text-muted font-mono text-xs mt-2">
            Codigo: {error.code} · Ref: {error.correlation_id.slice(0, 8)}
          </p>
        </div>
        {onDismiss !== undefined ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-text-muted hover:text-text-primary text-sm"
            aria-label="Cerrar mensaje de error"
          >
            ×
          </button>
        ) : null}
      </div>
    </GlassCard>
  );
}
