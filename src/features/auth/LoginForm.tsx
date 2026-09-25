/*
 * p0a.2 — login form.
 *
 * Uses RHF + zodResolver with `loginSchema`. Submits through
 * `useDebouncedSubmit` which handles the 300ms debounce + abort
 * guard. On success, navigates to either the portal selector
 * (BOTH role) or the dashboard (USER/ADMIN). On error, surfaces
 * the backend envelope via `ErrorBanner`.
 *
 * No honeypot here — login forms are open to all returning users
 * and the cost of a fake submit is small. Honeypot lives on the
 * register form where the abuse vector is bot-driven signups.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { loginSchema, type LoginFormValues } from '../../forms/auth/login/schema';
import { useAuth } from './useAuth';
import { useDebouncedSubmit } from '../../hooks/useDebouncedSubmit';
import { tokenStore } from '../../lib/api/client';
import { GlassCard } from '../../components/GlassCard';
import { ErrorBanner } from '../../components/ErrorBanner';

interface LoginFormState {
  readonly intendedUrl?: string;
}

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const { submit, isSubmitting, isDebouncing, error, reset } = useDebouncedSubmit<LoginFormValues>({
    onValid: async (values) => {
      const me = await login(values.email, values.password);
      const intended = tokenStore.getIntendedUrl();
      tokenStore.clearIntendedUrl();
      if (me.role === 'BOTH') {
        navigate('/portal-select', { replace: true });
        return;
      }
      const state = location.state as LoginFormState | null;
      const target = intended ?? state?.intendedUrl ?? '/portal/dashboard';
      navigate(target, { replace: true });
    },
    errorMessageFor: (env) => env.message,
  });

  return (
    <GlassCard variant="elevated" className="p-8 md:p-10">
      <form
        noValidate
        onSubmit={handleSubmit((values) => {
          reset();
          submit(values);
        })}
        className="flex flex-col gap-4"
        aria-busy={isSubmitting || isDebouncing}
      >
        <div>
          <label htmlFor="email" className="block text-text-secondary text-sm mb-1 font-body">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={errors.email !== undefined}
            aria-describedby={errors.email !== undefined ? 'email-error' : undefined}
            {...register('email')}
            className="w-full bg-surface-el/50 border border-primary/30 rounded-lg px-3 py-2 text-text-primary font-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {errors.email !== undefined ? (
            <p id="email-error" className="text-loss text-xs mt-1 font-body">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="password" className="block text-text-secondary text-sm mb-1 font-body">
            Contrasena
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password !== undefined}
            aria-describedby={errors.password !== undefined ? 'password-error' : undefined}
            {...register('password')}
            className="w-full bg-surface-el/50 border border-primary/30 rounded-lg px-3 py-2 text-text-primary font-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {errors.password !== undefined ? (
            <p id="password-error" className="text-loss text-xs mt-1 font-body">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <ErrorBanner error={error} onDismiss={reset} />

        <button
          type="submit"
          disabled={!isValid || isSubmitting || isDebouncing}
          className="bg-primary text-bg font-display uppercase tracking-wide px-3 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Ingresando...' : 'Iniciar sesion'}
        </button>

        <div className="flex items-center gap-3 my-1" aria-hidden="true">
          <div className="flex-1 h-px bg-border/60" />
          <span className="text-text-secondary text-xs uppercase tracking-wide font-body">
            o
          </span>
          <div className="flex-1 h-px bg-border/60" />
        </div>

        <a
          href={`/api/v1/auth/google/login?return_to=${encodeURIComponent(
            tokenStore.getIntendedUrl() ??
              ((location.state as LoginFormState | null)?.intendedUrl ??
                '/portal/dashboard'),
          )}`}
          className="flex items-center justify-center gap-2 border border-primary/40 text-text-primary font-display uppercase tracking-wide px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors text-sm"
          data-testid="login-with-google"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09a6.61 6.61 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
            />
          </svg>
          Iniciar sesion con Google
        </a>

        <p className="text-text-secondary text-sm text-center font-body">
          Aun no tenes cuenta?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Crear cuenta
          </Link>
        </p>
      </form>
    </GlassCard>
  );
}
