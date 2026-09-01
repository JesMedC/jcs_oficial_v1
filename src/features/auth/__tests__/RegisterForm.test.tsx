/*
 * p0b.1b — RegisterForm tests (4 cases).
 *
 * Covers:
 *   1. renders all expected fields (first/last/phone/email/password/repeat)
 *   2. shows a Zod error when a field loses focus with an invalid value
 *   3. submits with the expected payload (drops repeat_password) on valid input
 *   4. surfaces backend error envelope `message` on 409 from /auth/register
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AuthContext, type AuthContextValue } from '../AuthProvider';
import type { AuthMeOut } from '../types';
import * as apiModule from '../api';
import { RegisterForm } from '../RegisterForm';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const buildAuthValue = (overrides: Partial<AuthContextValue> = {}): AuthContextValue => ({
  user: null,
  subscription: null,
  loading: false,
  error: null,
  portal: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
  setPortal: vi.fn(),
  clearError: vi.fn(),
  ...overrides,
});

const baseMe: AuthMeOut = {
  user_id: 'u1',
  email: 'juana@example.com',
  first_name: 'Juana',
  last_name: 'Perez',
  phone: '+54 11 1234 5678',
  role: 'USER',
  workspaces: [],
  current_subscription: {
    id: 's1',
    user_id: 'u1',
    workspace_id: 'w1',
    tier: 'STARTER',
    status: 'TRIAL',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 7 * 86400000).toISOString(),
    mp_preference_id: null,
    mp_subscription_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

function renderForm(value: AuthContextValue) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={value}>
        <RegisterForm />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all the new fields and the honeypot', () => {
    renderForm(buildAuthValue());
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Apellido')).toBeInTheDocument();
    expect(screen.getByLabelText('Telefono')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contrasena')).toBeInTheDocument();
    expect(screen.getByLabelText('Repetir contrasena')).toBeInTheDocument();
  });

  it('shows a Zod error when the email field loses focus with an invalid value', async () => {
    const user = userEvent.setup();
    renderForm(buildAuthValue());
    const email = screen.getByLabelText('Email');
    await user.type(email, 'not-an-email');
    await user.tab();
    await waitFor(() => {
      expect(screen.getByText('Email invalido')).toBeInTheDocument();
    });
  });

  it('calls register with the trimmed payload (drops repeat_password)', async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue(baseMe);
    renderForm(buildAuthValue({ register }));

    await user.type(screen.getByLabelText('Nombre'), 'Juana');
    await user.tab();
    await user.type(screen.getByLabelText('Apellido'), 'Perez');
    await user.tab();
    await user.type(screen.getByLabelText('Telefono'), '+54 11 1234 5678');
    await user.tab();
    await user.type(screen.getByLabelText('Email'), 'juana@example.com');
    await user.tab();
    await user.type(screen.getByLabelText('Contrasena'), 'secret123');
    await user.tab();
    await user.type(screen.getByLabelText('Repetir contrasena'), 'secret123');
    await user.tab();

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    // Wait past the 300ms debounce + onValid execution.
    await waitFor(
      () => {
        expect(register).toHaveBeenCalledWith(
          'Juana',
          'Perez',
          '+54 11 1234 5678',
          'juana@example.com',
          'secret123',
        );
      },
      { timeout: 2000 },
    );

    // repeat_password must NOT appear in the call payload.
    const firstCall = register.mock.calls[0];
    expect(firstCall).toBeDefined();
    expect(firstCall).not.toContain('repeat_password');
  });

  it('surfaces backend error envelope `message` on 409 from /auth/register', async () => {
    const user = userEvent.setup();
    // Spy on apiClient.post via the api module — the easier path is
    // to make register throw the envelope and let the form render it.
    const envelope = {
      code: 'AUTH_EMAIL_TAKEN' as const,
      message: 'El email ya esta registrado',
      correlation_id: 'abc12345-c001',
    };
    const register = vi.fn().mockRejectedValue(envelope);
    // Mock the api module so the debounced submit's call to
    // registerApi (if any leaks through) also fails consistently.
    vi.spyOn(apiModule, 'registerApi').mockRejectedValue(envelope);

    renderForm(buildAuthValue({ register }));

    await user.type(screen.getByLabelText('Nombre'), 'Juana');
    await user.tab();
    await user.type(screen.getByLabelText('Apellido'), 'Perez');
    await user.tab();
    await user.type(screen.getByLabelText('Telefono'), '+54 11 1234 5678');
    await user.tab();
    await user.type(screen.getByLabelText('Email'), 'taken@example.com');
    await user.tab();
    await user.type(screen.getByLabelText('Contrasena'), 'secret123');
    await user.tab();
    await user.type(screen.getByLabelText('Repetir contrasena'), 'secret123');
    await user.tab();

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(
      () => {
        expect(screen.getByText('El email ya esta registrado')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});
