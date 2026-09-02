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
