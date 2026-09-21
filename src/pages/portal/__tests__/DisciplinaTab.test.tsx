/*
 * sessions-configurable-cap (Slice B, T-015) — DisciplinaTab RED test.
 *
 * Locks the user-facing contract the Disciplina tab on
 * ConfiguracionPage exposes (REQ-DSC-007):
 *
 *   1. Renders the plan ceiling for the active workspace as
 *      read-only helper text (PRO → 6).
 *   2. Numeric input is bounded ``min=1, max=ceiling`` so the user
 *      cannot raise above the plan cap client-side.
 *   3. Saving a new value PATCHes
 *      ``/api/v1/workspaces/{id}/discipline`` with the payload.
 *   4. A 422 ``DISCIPLINE_CAP_OUT_OF_RANGE`` response renders a
 *      localized error pill that includes the ceiling.
 *
 * RED until T-016 lands the component. The test stubs ``useAuth``
 * via ``vi.spyOn`` (same pattern as the existing auth feature tests)
 * and the API client via ``vi.spyOn`` on ``apiClient.patch``.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { DisciplinaTab } from '../DisciplinaTab';
import * as authModule from '../../../features/auth/useAuth';
import * as apiClient from '../../../lib/api/client';
import type { AuthContextValue } from '../../../features/auth/AuthProvider';
import type { AuthMeOut, WorkspaceOut } from '../../../features/auth/types';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const WORKSPACE_ID = 'ws-1';

const PRO_WORKSPACE: WorkspaceOut = {
  id: WORKSPACE_ID,
  name: 'PRO workspace',
  plan_tier: 'PRO',
  role_in_workspace: 'OWNER',
  created_at: '2026-01-01T00:00:00.000Z',
  session_ops_cap: null,
};

const baseMe: AuthMeOut = {
  user_id: 'u-1',
  email: 'p@d.com',
  first_name: 'Pat',
  last_name: 'Doe',
  phone: '+54',
  role: 'USER',
  workspaces: [PRO_WORKSPACE],
  current_subscription: null,
  timezone: 'UTC',
};

function buildAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: baseMe,
    subscription: null,
    loading: false,
    error: null,
    portal: 'user',
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    setPortal: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DisciplinaTab (sessions-configurable-cap)', () => {
  it('renderiza el techo del plan y los limites del input', () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue(buildAuthValue());

    render(<DisciplinaTab />, { wrapper: makeWrapper() });

    // Helper text surfaces the plan + ceiling.
    expect(screen.getByTestId('disciplina-ceiling')).toHaveTextContent(/PRO/i);
    expect(screen.getByTestId('disciplina-ceiling')).toHaveTextContent(/6/);
    // Numeric input is bounded 1..ceiling (PRO = 6).
    const input = screen.getByTestId('disciplina-cap-input') as HTMLInputElement;
    expect(input.type).toBe('number');
    expect(input.min).toBe('1');
    expect(input.max).toBe('6');
  });

  it('PATCHea session_ops_cap al hacer click en Guardar', async () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue(buildAuthValue());
    const patchSpy = vi
      .spyOn(apiClient.apiClient, 'patch')
      .mockResolvedValue({ data: {} } as Awaited<
        ReturnType<typeof apiClient.apiClient.patch>
      >);

    const user = userEvent.setup();
    render(<DisciplinaTab />, { wrapper: makeWrapper() });

    const input = screen.getByTestId('disciplina-cap-input') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '3');

    await user.click(screen.getByTestId('disciplina-save'));

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith(
        `/workspaces/${WORKSPACE_ID}/discipline`,
        { session_ops_cap: 3 },
      );
    });
  });

  it('muestra el pill de error DISCIPLINE_CAP_OUT_OF_RANGE con el techo en el mensaje', async () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue(buildAuthValue());
    // Mock the mutation to reject with the canonical envelope the
    // backend emits. The DisciplinaTab reads ``error.code`` and
    // ``error.message`` to render the pill.
    const patchSpy = vi.spyOn(apiClient.apiClient, 'patch').mockRejectedValue({
      code: 'DISCIPLINE_CAP_OUT_OF_RANGE',
      message: 'session_ops_cap 7 fuera de rango; techo 6',
      correlation_id: '0'.repeat(36),
    });

    const user = userEvent.setup();
    render(<DisciplinaTab />, { wrapper: makeWrapper() });

    const input = screen.getByTestId('disciplina-cap-input') as HTMLInputElement;
    await user.clear(input);
    // The HTML max=6 client-side guard prevents typing "7", but the
    // mutation can still fail with this code on edge cases
    // (rounding, paste). Force the value via fireEvent to exercise
    // the error path explicitly.
    input.removeAttribute('max');
    await user.type(input, '7');

    await user.click(screen.getByTestId('disciplina-save'));

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalled();
      const pill = screen.getByTestId('disciplina-error');
      expect(pill).toHaveTextContent(/DISCIPLINE_CAP_OUT_OF_RANGE/);
      // The error message from the backend contains the ceiling "6".
      expect(pill).toHaveTextContent(/6/);
    });
  });
});
