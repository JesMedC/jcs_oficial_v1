/*
 * p0a.2 — Login page.
 *
 * Real page (replaces the p1e stub in `_stub.tsx`). H1 Orbitron jade
 * + LoginForm + a small aside with the security story (JWT + PBKDF2
 * + 14-day trial). `noindex` is set because the page is behind an
 * auth boundary — search engines should not index it.
 *
 * OAuth callback handling: when the SPA is loaded with a `?token=...`
 * (and optional `?refresh=...`) querystring — produced by
 * ``GET /api/v1/auth/google/callback`` after the Google OAuth dance —
 * we persist the tokens in the same store the password login uses,
 * strip the querystring so the URL stays clean, and forward to the
 * intended URL (defaults to ``/portal/dashboard``).
 */
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { SeoHead } from '../components/SeoHead';
import { AuthValuePanel } from '../components/home/AuthValuePanel';
import { LoginForm } from '../features/auth/LoginForm';
import { tokenStore } from '../lib/api/client';

export function LoginPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const consumed = useRef(false);

  // Google OAuth callback: persist tokens, then forward to the SPA.
  useEffect(() => {
    if (consumed.current) return;
    const token = searchParams.get('token');
    if (!token) return;
    consumed.current = true;

    const refresh = searchParams.get('refresh') ?? undefined;
    const expiresInRaw = searchParams.get('expires_in');
    const expiresIn = expiresInRaw ? Number.parseInt(expiresInRaw, 10) : undefined;
    const returnTo = searchParams.get('return_to') ?? '/portal/dashboard';

    tokenStore.setTokens({
      accessToken: token,
      ...(refresh !== undefined ? { refreshToken: refresh } : {}),
      ...(expiresIn !== undefined ? { expiresIn } : {}),
    });

    // Strip the one-shot tokens from the URL so a refresh doesn't try
    // to replay the OAuth handshake. Use replace so the history entry
    // doesn't carry the sensitive querystring either.
    searchParams.delete('token');
    searchParams.delete('refresh');
    searchParams.delete('expires_in');
    searchParams.delete('provider');
    setSearchParams(searchParams, { replace: true });

    // Force a full reload so AuthProvider re-mounts and picks up the
    // new tokens from storage on its initial /me call.
    window.location.assign(returnTo);
  }, [searchParams, setSearchParams]);

  // Google consent denied: surface a friendly inline message via
  // querystring flag (?oauth_error=denied). The form re-renders with
  // a soft banner; we keep the rest of the page as-is.
  const oauthError = searchParams.get('oauth_error');

  return (
    <>
      <SeoHead
        title="Iniciar sesion"
        description="Accede a tu portal de JadeCapitalSuite. Sesion segura con JWT + PBKDF2 y 7 dias gratis."
        canonicalPath="/login"
        noindex
      />
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <AuthValuePanel
          eyebrow="Acceso seguro"
          title="Bienvenido de nuevo"
          description="Iniciá sesión para registrar operaciones, controlar cuentas y revisar tus métricas."
          panelTitle="Tu sesión está protegida"
          benefits={[
            'Contraseñas hasheadas con PBKDF2 + sal por usuario.',
            'Tokens de acceso JWT firmados y rotación automática.',
            '7 días gratis sin tarjeta. Cancelá cuando quieras.',
          ]}
          footerText="¿Aún no tenés cuenta?"
          footerLinkLabel="Crear cuenta gratis"
          footerTo="/register"
        />

        <div>
          {oauthError === 'denied' ? (
            <div
              role="status"
              className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-warning text-sm font-body"
              data-testid="oauth-error-banner"
            >
              Cancelaste el inicio de sesion con Google. Podes volver a intentar o usar email y contrasena.
            </div>
          ) : null}
          <LoginForm />
        </div>
      </div>
    </>
  );
}
