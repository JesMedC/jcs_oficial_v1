/*
 * p0d.3 / p0e.3 — accounts API tests.
 *
 * Verifica que ``listAccountsApi`` envíe los query params esperados y
 * que ``createAccountApi`` postee la shape correcta. El ``apiClient``
 * se mockea vía ``vi.mock`` siguiendo el patrón de
 * ``src/features/payments/__tests__/api.test.ts``.
 *
 * p0e.3 adds coverage for the per-account write wrappers
 * (``getAccountById``, ``fundAccountApi``, ``withdrawAccountApi``,
 * ``deleteAccountApi``) — they hit ``GET /{id}``,
 * ``POST /{id}/fund``, ``POST /{id}/withdraw`` and
 * ``DELETE /{id}`` respectively, and ``delete`` must send the
 * confirmation body as ``data`` (axios quirk).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from '../../../lib/api/client';
import {
  createAccountApi,
  deleteAccountApi,
  fundAccountApi,
  getAccountById,
  listAccountsApi,
  withdrawAccountApi,
} from '../api';
import { ACCOUNT_TYPE_BADGE } from '../types';

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;
const mockedPost = apiClient.post as unknown as ReturnType<typeof vi.fn>;
const mockedDelete = apiClient.delete as unknown as ReturnType<typeof vi.fn>;

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

  it('getAccountById hits GET /accounts/{id}', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        id: 'acc-1',
        user_id: 'u-1',
        broker_name: 'Pocket Option',
        type: 'BINARY',
        name: 'Cuenta principal',
        balance_usd: '100.00',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
    await getAccountById('acc-1');
    expect(mockedGet).toHaveBeenCalledWith('/accounts/acc-1');
  });

  it('fundAccountApi posts the amount to /accounts/{id}/fund', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        id: 'acc-1',
        user_id: 'u-1',
        broker_name: 'Pocket Option',
        type: 'BINARY',
        name: 'Cuenta principal',
        balance_usd: '150.00',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
    await fundAccountApi('acc-1', 50);
    expect(mockedPost).toHaveBeenCalledWith('/accounts/acc-1/fund', { amount: 50 });
  });

  it('withdrawAccountApi posts the amount to /accounts/{id}/withdraw', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        id: 'acc-1',
        user_id: 'u-1',
        broker_name: 'Pocket Option',
        type: 'BINARY',
        name: 'Cuenta principal',
        balance_usd: '70.00',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
    await withdrawAccountApi('acc-1', 30);
    expect(mockedPost).toHaveBeenCalledWith('/accounts/acc-1/withdraw', { amount: 30 });
  });

  it('deleteAccountApi sends the confirmation body via DELETE', async () => {
    mockedDelete.mockResolvedValueOnce({ data: null });
    await deleteAccountApi('acc-1', 'ELIMINAR');
    expect(mockedDelete).toHaveBeenCalledWith('/accounts/acc-1', {
      data: { confirmation: 'ELIMINAR' },
    });
  });
});
