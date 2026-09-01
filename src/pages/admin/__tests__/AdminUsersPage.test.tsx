/*
 * p0b.2 — AdminUsersPage tests (3 cases).
 *
 *   1. renders the table with a row per user.
 *   2. applying a filter changes the request params and the table
 *      contents.
 *   3. clicking the "Desactivar" button calls setUserActiveApi with
 *      `is_active: false` and refetches the list.
 *
 * The component is data-driven so we mock both listUsersApi and
 * setUserActiveApi and verify the wiring.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

vi.mock('../../../features/admin/api', () => ({
  listUsersApi: vi.fn(),
  setUserActiveApi: vi.fn(),
  listPlansApi: vi.fn(),
  updatePlanPriceApi: vi.fn(),
}));

import { listUsersApi, setUserActiveApi } from '../../../features/admin/api';
import { AuthContext, type AuthContextValue } from '../../../features/auth/AuthProvider';
import { AdminUsersPage } from '../AdminUsersPage';
import type { AdminUserList, UserWithSubscription } from '../../../features/admin/types';
import type { AuthMeOut } from '../../../features/auth/types';

const mockedList = listUsersApi as unknown as ReturnType<typeof vi.fn>;
const mockedToggle = setUserActiveApi as unknown as ReturnType<typeof vi.fn>;

function buildAuthValue(): AuthContextValue {
  const me: AuthMeOut = {
    user_id: 'admin-1',
    email: 'admin@jadecapital.local',
    first_name: 'Admin',
    last_name: 'Test',
    phone: '+34600000000',
    role: 'ADMIN',
    workspaces: [],
    current_subscription: null,
  };
  return {
    user: me,
    subscription: null,
    loading: false,
    error: null,
    portal: 'admin',
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    setPortal: vi.fn(),
    clearError: vi.fn(),
  };
}

function buildUser(overrides: Partial<UserWithSubscription>): UserWithSubscription {
  return {
    id: 'u1',
    email: 'demo@jadecapital.local',
    first_name: 'Demo',
    last_name: 'User',
    phone: '+54 11 1234 5678',
    role: 'USER',
    is_active: true,
    email_verified_at: null,
    created_at: new Date().toISOString(),
    current_subscription: null,
    ...overrides,
  };
}

function buildList(items: UserWithSubscription[]): AdminUserList {
  return { items, total: items.length, skip: 0, limit: 50 };
}

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  const value = buildAuthValue();
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <AuthContext.Provider value={value}>
          <AdminUsersPage />
        </AuthContext.Provider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe('AdminUsersPage', () => {
  it('renders the table with one row per user', async () => {
    mockedList.mockResolvedValueOnce(
      buildList([
        buildUser({ id: 'u1', email: 'a@x.com' }),
        buildUser({ id: 'u2', email: 'b@x.com' }),
      ]),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('a@x.com')).toBeInTheDocument();
    });
    expect(screen.getByText('b@x.com')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Usuarios' })).toBeInTheDocument();
  });

  it('applies role + status filters to the next request', async () => {
    mockedList.mockResolvedValue(buildList([buildUser({ id: 'u1' })]));

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(mockedList).toHaveBeenCalled();
    });

    // Set role=ADMIN and status=active.
    const roleSelect = screen.getByLabelText('Rol');
    const statusSelect = screen.getByLabelText('Estado');
    await user.selectOptions(roleSelect, 'ADMIN');
    await user.selectOptions(statusSelect, 'active');

    await waitFor(() => {
      const calls = mockedList.mock.calls;
      const lastCall = calls[calls.length - 1];
      const params = (lastCall?.[0] ?? {}) as { role?: string; status?: string };
      expect(params.role).toBe('ADMIN');
      expect(params.status).toBe('active');
    });
  });

  it('calls setUserActiveApi(false) when the row Desactivar button is clicked and refetches', async () => {
    const initial = buildList([buildUser({ id: 'u1', email: 'target@x.com', is_active: true })]);
    const after = buildList([buildUser({ id: 'u1', email: 'target@x.com', is_active: false })]);
    mockedList.mockResolvedValueOnce(initial).mockResolvedValueOnce(after);
    mockedToggle.mockResolvedValueOnce({ ...initial.items[0], is_active: false });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('target@x.com')).toBeInTheDocument();
    });

    const toggleButton = await screen.findByRole('button', { name: 'Desactivar' });
    await user.click(toggleButton);

    await waitFor(() => {
      expect(mockedToggle).toHaveBeenCalledWith('u1', false);
    });
    // Refetch was issued after the toggle.
    await waitFor(() => {
      expect(mockedList.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
