/*
 * p0d.3 — accounts API tests.
 *
 * Verifica que ``listAccountsApi`` envíe los query params esperados y
 * que ``createAccountApi`` postee la shape correcta. El ``apiClient``
 * se mockea vía ``vi.mock`` siguiendo el patrón de
 * ``src/features/payments/__tests__/api.test.ts``.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { apiClient } from '../../../lib/api/client';
import { createAccountApi, listAccountsApi } from '../api';
import { ACCOUNT_TYPE_BADGE } from '../types';

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;
const mockedPost = apiClient.post as unknown as ReturnType<typeof vi.fn>;

describe('accounts API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listAccountsApi serializes pagination params', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { items: [], total: 0, skip: 10, limit: 25 },
    });
    await listAccountsApi({ skip: 10, limit: 25 });
    expect(mockedGet).toHaveBeenCalledWith('/accounts', {
      params: { skip: 10, limit: 25 },
    });
  });

  it('listAccountsApi works without params', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { items: [], total: 0, skip: 0, limit: 50 },
    });
    await listAccountsApi();
    expect(mockedGet).toHaveBeenCalledWith('/accounts', {
      params: {},
    });
  });

  it('createAccountApi posts the expected payload shape', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        id: 'acc-1',
        user_id: 'u-1',
        broker_name: 'Pocket Option',
        type: 'BINARY',
        name: 'Cuenta principal',
        balance_usd: '0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
    await createAccountApi({
      broker_name: 'Pocket Option',
      type: 'BINARY',
      name: 'Cuenta principal',
    });
    expect(mockedPost).toHaveBeenCalledWith('/accounts', {
      broker_name: 'Pocket Option',
      type: 'BINARY',
      name: 'Cuenta principal',
    });
  });

  it('ACCOUNT_TYPE_BADGE exposes BINARY + FOREX labels', () => {
    expect(Object.keys(ACCOUNT_TYPE_BADGE)).toHaveLength(2);
    expect(ACCOUNT_TYPE_BADGE.BINARY.label).toBe('Binary');
    expect(ACCOUNT_TYPE_BADGE.FOREX.label).toBe('Forex');
  });
});