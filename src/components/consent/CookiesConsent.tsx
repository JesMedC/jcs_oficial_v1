import { useEffect, useState } from 'react';

/*
 * p1c — Cookies consent overlay.
 *
 * Renders only when `localStorage['jcs.cookies.consent']` is unset.
 * On either button click: persists the choice ('essential' | 'all')
 * and unmounts. Purely UX — no real analytics wired in this slice
 * (and no 3rd-party CDN per design constraints). The flag exists
 * so future analytics can read it without a tracking prompt.
 */
const STORAGE_KEY = 'jcs.cookies.consent';
type Consent = 'essential' | 'all';

function readConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'essential' || raw === 'all') return raw;
    return null;
  } catch {
    return null;
  }
}

function writeConsent(value: Consent): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // localStorage may be unavailable (private mode, quota); we accept
    // the silent failure here because consent is a soft UX signal, not
    // a security gate.
  }
}

export function CookiesConsent() {
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    setOpen(readConsent() === null);
  }, []);

  if (!open) return null;

  const choose = (value: Consent) => {
    writeConsent(value);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="jcs-cookies-title"
      aria-describedby="jcs-cookies-desc"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 md:p-6 bg-bg/80 backdrop-blur-2xl"
    >
      <div className="w-full max-w-md bg-surface-el/95 border border-primary/30 rounded-2xl p-6 md:p-7 shadow-elevated backdrop-blur-2xl">
        <h2
          id="jcs-cookies-title"
          className="font-display uppercase tracking-wide text-primary text-xl md:text-2xl"
        >
          Tu privacidad importa
        </h2>
        <p
          id="jcs-cookies-desc"
          className="text-text-secondary font-body text-sm md:text-base mt-3"
        >
          Usamos cookies esenciales para que la plataforma funcione. Con tu permiso, tambien usamos
          cookies analiticas para entender como mejorarla. Mas info en nuestra politica de cookies.
        </p>
        <div className="flex flex-wrap items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => choose('essential')}
            className="inline-flex border-2 border-primary text-primary font-display uppercase tracking-wide px-4 py-2.5 rounded-lg hover:bg-primary hover:text-bg transition-colors text-sm"
          >
            Solo esenciales
          </button>
          <button
            type="button"
            onClick={() => choose('all')}
            className="inline-flex bg-primary text-bg font-display uppercase tracking-wide px-4 py-2.5 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm"
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  );
}
