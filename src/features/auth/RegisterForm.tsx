/*
 * p0b.1b — register form.
 *
 * Uses RHF + zodResolver with `registerSchema`. The new schema adds
 * `first_name` + `last_name` + `phone` + `repeat_password` (and keeps
 * `email` + `password` + the honeypot `website`). All validation is
 * client-side; the server enforces the same constraints on
 * `RegisterIn` and returns 422 + Spanish error envelope if the body
 * ever bypasses the resolver.
 *
 * Honeypot (`HoneypotField`) must remain empty — any non-empty value
 * fails zod validation with `spam_detected` and the submit aborts
 * before any HTTP request fires (R2 Risk).
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
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      password: '',
      repeat_password: '',
      website: '',
    },
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
        const me = await registerUser(
          values.first_name,
          values.last_name,
          values.phone,
          values.email,
          values.password,
        );
        const intended = tokenStore.getIntendedUrl();
        tokenStore.clearIntendedUrl();
        if (me.role === 'BOTH') {
          navigate('/portal-select', { replace: true });
          return;
        }
        navigate(intended ?? '/portal/dashboard', { replace: true });
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              id="first_name"
              label="Nombre"
              autoComplete="given-name"
              error={errors.first_name?.message}
              register={register('first_name')}
            />
            <Field
              id="last_name"
              label="Apellido"
              autoComplete="family-name"
              error={errors.last_name?.message}
              register={register('last_name')}
            />
          </div>

          <Field
            id="phone"
            label="Telefono"
            type="tel"
            autoComplete="tel"
            placeholder="+54 11 1234 5678"
            error={errors.phone?.message}
            register={register('phone')}
          />

          <Field
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            register={register('email')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              id="password"
              label="Contrasena"
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              register={register('password')}
              hint="Minimo 8 caracteres, al menos una letra y un digito."
            />
            <Field
              id="repeat_password"
              label="Repetir contrasena"
              type="password"
              autoComplete="new-password"
              error={errors.repeat_password?.message}
              register={register('repeat_password')}
            />
          </div>

          <HoneypotField />

          <ErrorBanner error={error} onDismiss={reset} />

          <button
            type="submit"
            disabled={!isValid || isSubmitting || isDebouncing}
            className="bg-primary text-bg font-display uppercase tracking-wide px-3 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

interface FieldProps {
  readonly id: string;
  readonly label: string;
  readonly type?: string;
  readonly autoComplete?: string;
  readonly placeholder?: string;
  readonly error: string | undefined;
  readonly hint?: string;
  readonly register: ReturnType<ReturnType<typeof useForm<RegisterFormValues>>['register']>;
}

function Field({
  id,
  label,
  type = 'text',
  autoComplete,
  placeholder,
  error,
  hint,
  register,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-text-secondary text-sm mb-1 font-body">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error !== undefined}
        aria-describedby={error !== undefined ? `${id}-error` : undefined}
        {...register}
        className="w-full bg-surface-el/50 border border-primary/30 rounded-lg px-3 py-2 text-text-primary font-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      {error !== undefined ? (
        <p id={`${id}-error`} className="text-loss text-xs mt-1 font-body">
          {error}
        </p>
      ) : hint !== undefined ? (
        <p className="text-text-muted text-xs mt-1 font-body">{hint}</p>
      ) : null}
    </div>
  );
}
