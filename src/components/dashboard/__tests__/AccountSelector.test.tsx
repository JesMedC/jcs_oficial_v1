/*
 * dashboard-jarvis-fidelity (Slice A, T-036, REQ-CWM-006) —
 * AccountSelector trailing-caption drop tests.
 *
 * The original AccountSelector rendered THREE pieces (label,
 * select, and a trailing `<span className="font-mono text-[11px]">`
 * caption duplicating the selected option). The caption was
 * redundant: the `<select>` already displays the chosen label
 * and the user already has the chrome label "Alcance" + the
 * dropdown chevron to anchor it.
 *
 * The contract under test: AccountSelector renders the
 * `<select>` and the chrome label "Alcance", and renders ZERO
 * trailing captions. The `selectedLabel` variable + its trailing
 * `<span>` are removed in the same commit (also picked up by
 * the dashboard test that asserts AccountSelector is mounted
 * without that caption).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { findByRole, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import * as accountsApi from '../../../features/accounts/api';
import type { AccountList, AccountOut } from '../../../features/accounts/types';
import { AccountSelector } from '../AccountSelector';

function mockAccounts(items: readonly AccountOut[]) {
  return vi.spyOn(accountsApi, 'listAccountsApi').mockResolvedValue({
    items,
    total: items.length,
    skip: 0,
    limit: 100,
  } satisfies AccountList);
}

const fakeAccount: AccountOut = {
  id: 'a1',
  user_id: 'u1',
  workspace_id: 'ws-1',
  broker_name: 'Test Broker',
  name: 'Test Account',
  type: 'FOREX',
  balance_usd: '1000.00',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AccountSelector', () => {
  it('renders exactly one <select> and the chrome label "Alcance"', async () => {
    mockAccounts([fakeAccount, { ...fakeAccount, id: 'a2', name: 'Second' }]);
    render(<AccountSelector value={null} onChange={() => {}} />, { wrapper: makeWrapper() });

    // Wait for the query to resolve so <option>s are rendered.
    await findByRole(screen.getByTestId('dash-account-selector'), 'combobox');
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(screen.getByText('Alcance')).toBeInTheDocument();
  });

  it('renders ZERO trailing <span className="font-mono text-[11px]"> captions (T-036 REQ-CWM-006)', () => {
    mockAccounts([fakeAccount, { ...fakeAccount, id: 'a2', name: 'Second' }]);
    const { container } = render(<AccountSelector value={null} onChange={() => {}} />, {
      wrapper: makeWrapper(),
    });

    // Any trailing font-mono 11px caption is forbidden. Use a tokenised
    // class check so the regex doesn't trip on a stray <span> with the
    // same classes but a different role.
    const captions = Array.from(container.querySelectorAll('span')).filter((span) => {
      const tokens = (span.className ?? '').split(/\s+/);
      return tokens.includes('font-mono') && tokens.includes('text-[11px]');
    });
    expect(captions).toHaveLength(0);
  });

  it('renders the same <option> labels (Todas las cuentas + every account name)', async () => {
    mockAccounts([
      fakeAccount,
      { ...fakeAccount, id: 'a2', name: 'Second', type: 'BINARY' },
    ]);
    render(<AccountSelector value={null} onChange={() => {}} />, { wrapper: makeWrapper() });

    // The query is async; wait for the first <option> to appear so the
    // rest of the list has been committed to the DOM.
    const todas = await screen.findByRole('option', { name: /Todas las cuentas/ });
    expect(todas).toBeInTheDocument();
    // Each account label is preserved in its <option>.
    expect(screen.getByRole('option', { name: /Test Account/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Second/ })).toBeInTheDocument();
  });
});
