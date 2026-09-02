/*
 * portal-fase0a-base — accounts hooks smoke tests.
 *
 * Validates that useAccounts and useAccount call the right API
 * functions and surface data/error from TanStack. The handler-level
 * behavior is library-tested; we just confirm our wiring.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../api', () => ({
  listAccountsApi: vi.fn(async () => ({
    items: [
      {
        id: 'a-1',
        user_id: 'u-1',
        broker_name: 'Test',
        type: 'FOREX',
        name: 'Cuenta 1',
        balance_usd: '100',
        created_at: '2026-09-02T15:00:00Z',
        updated_at: '2026-09-02T15:00:00Z',
      },
    ],
    total: 1,
    skip: 0,
    limit: 50,
  })),
  getAccountById: vi.fn(async (id: string) => ({
    id,
    user_id: 'u-1',
    broker_name: 'Test',
    type: 'BINARY',
    name: 'Detail',
    balance_usd: '250',
    created_at: '2026-09-02T15:00:00Z',
    updated_at: '2026-09-02T15:00:00Z',
  })),
  fundAccountApi: vi.fn(),
  withdrawAccountApi: vi.fn(),
  deleteAccountApi: vi.fn(),
  createAccountApi: vi.fn(),
}));

import { listAccountsApi, getAccountById } from '../api';
import { useAccounts, useAccount } from '../hooks';

const mockedList = listAccountsApi as unknown as ReturnType<typeof vi.fn>;
const mockedGet = getAccountById as unknown as ReturnType<typeof vi.fn>;

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  mockedList.mockClear();
  mockedGet.mockClear();
});

describe('useAccounts', () => {
  it('returns the mocked account list', async () => {
    const { result } = renderHook(() => useAccounts(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.data?.items.length).toBe(1);
    });
    expect(result.current.data?.items[0]?.broker_name).toBe('Test');
  });
});

describe('useAccount', () => {
  it('returns the mocked account by id', async () => {
    const { result } = renderHook(() => useAccount('a-99'), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.data?.id).toBe('a-99');
    });
    expect(result.current.data?.type).toBe('BINARY');
  });
});
