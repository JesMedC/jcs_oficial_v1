/*
 * p0a.2 — register form.
 *
 * Uses RHF + zodResolver with `registerSchema`. Includes a honeypot
 * (`HoneypotField`) that must remain empty — any non-empty value
 * fails zod validation with `spam_detected` and the submit aborts
 * before any HTTP request fires.
 *
 * Successful registration mirrors login: navigates to the portal
 * selector for BOTH role, dashboard for USER/ADMIN.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { registerSchema, type RegisterFormValues } from '../../forms/auth/register/schema';
import { useAuth } from './useAuth';
import { useDebouncedSubmit } from '../../hooks/useDebouncedSubmit';
import { tokenStore } from '../../lib/api/client';
import { GlassCard } from '../../components/GlassCard';
import { ErrorBanner } from '../../components/ErrorBanner';
import { HoneypotField } from '../../components/forms/HoneypotField';

export function RegisterForm() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const methods = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: { name: '', email: '', password: '', website: '' },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = methods;

  const { submit, isSubmitting, isDebouncing, error, reset } =
    useDebouncedSubmit<RegisterFormValues>({
      onValid: async (values) => {
        // Spam guard — zod should have already rejected this but we
        // double-check before minting tokens.
        if (values.website !== undefined && values.website.length > 0) {
          return;
        }
        const me = await registerUser(values.email, values.password, values.name);
        const intended = tokenStore.getIntendedUrl();
        tokenStore.clearIntendedUrl();
        if (me.role === 'BOTH') {
          navigate('/portal-select', { replace: true });
          return;
        }
        navigate(intended ?? '/dashboard', { replace: true });
      },
      errorMessageFor: (env) => env.message,
    });

  return (
    <FormProvider {...methods}>
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
            <label htmlFor="name" className="block text-text-secondary text-sm mb-1 font-body">
              Nombre
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              aria-invalid={errors.name !== undefined}
              aria-describedby={errors.name !== undefined ? 'name-error' : undefined}
              {...register('name')}
              className="w-full bg-surface-el/50 border border-primary/30 rounded-lg px-3 py-2 text-text-primary font-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {errors.name !== undefined ? (
              <p id="name-error" className="text-loss text-xs mt-1 font-body">
                {errors.name.message}
              </p>
            ) : null}
          </div>

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
              autoComplete="new-password"
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
            <p className="text-text-muted text-xs mt-1 font-body">
              Minimo 8 caracteres, al menos una letra y un digito.
            </p>
          </div>

          <HoneypotField />

          <ErrorBanner error={error} onDismiss={reset} />

          <button
            type="submit"
            disabled={!isValid || isSubmitting || isDebouncing}
            className="bg-primary text-bg font-display uppercase tracking-wide px-4 py-3 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          <p className="text-text-secondary text-sm text-center font-body">
            Ya tenes cuenta?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Iniciar sesion
            </Link>
          </p>
        </form>
      </GlassCard>
    </FormProvider>
  );
}
