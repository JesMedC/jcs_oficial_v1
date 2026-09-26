import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from '../../../lib/api/client';
import { listAccountMovementsApi } from '../api';
import {
  ACCOUNT_MOVEMENT_TYPE_LABEL,
  type AccountMovementList,
  type AccountMovementTypeLiteral,
} from '../types';

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockedGet.mockClear();
});

describe('account movements feature surface', () => {
  it('listAccountMovementsApi calls the account movements endpoint with pagination params', async () => {
    const response: AccountMovementList = { items: [], total: 0, skip: 10, limit: 25 };
    mockedGet.mockResolvedValueOnce({ data: response });

    await expect(listAccountMovementsApi('acc-1', { skip: 10, limit: 25 })).resolves.toBe(
      response,
    );

    expect(mockedGet).toHaveBeenCalledWith('/accounts/acc-1/movements', {
      params: { skip: 10, limit: 25 },
    });
  });

  it('exposes Spanish labels for every backend movement type', () => {
    const backendTypes: readonly AccountMovementTypeLiteral[] = [
      'DEPOSIT',
      'WITHDRAWAL',
      'TRADE_MARGIN',
      'TRADE_RETURN',
      'TRADE_PROFIT',
    ];

    expect(Object.keys(ACCOUNT_MOVEMENT_TYPE_LABEL).sort()).toEqual([...backendTypes].sort());
    expect(ACCOUNT_MOVEMENT_TYPE_LABEL.DEPOSIT).toBe('Fondeo');
    expect(ACCOUNT_MOVEMENT_TYPE_LABEL.WITHDRAWAL).toBe('Retiro');
  });
});
