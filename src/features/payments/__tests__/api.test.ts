/*
 * p0c — payments API types tests.
 *
 * Verifica que los tipos exportan las constantes correctas y que
 * ``listPaymentsApi`` envíe los query params esperados.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from '../../../lib/api/client';
import { listPaymentsApi } from '../api';
import { PAYMENT_STATUS_BADGE } from '../types';

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;

describe('payments API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listPaymentsApi serializes status and pagination', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { items: [], total: 0, skip: 0, limit: 25 },
    });
    await listPaymentsApi({ status: 'APPROVED', skip: 10, limit: 25 });
    expect(mockedGet).toHaveBeenCalledWith('/admin/payments', {
      params: { status: 'APPROVED', skip: 10, limit: 25 },
    });
  });

  it('listPaymentsApi omits status when not provided', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { items: [], total: 0, skip: 0, limit: 50 },
    });
    await listPaymentsApi({ skip: 0, limit: 50 });
    expect(mockedGet).toHaveBeenCalledWith('/admin/payments', {
      params: { skip: 0, limit: 50 },
    });
  });

  it('PAYMENT_STATUS_BADGE has 5 status labels', () => {
    expect(Object.keys(PAYMENT_STATUS_BADGE)).toHaveLength(5);
    expect(PAYMENT_STATUS_BADGE.APPROVED.label).toBe('Aprobado');
    expect(PAYMENT_STATUS_BADGE.REJECTED.label).toBe('Rechazado');
    expect(PAYMENT_STATUS_BADGE.CANCELLED.label).toBe('Cancelado');
    expect(PAYMENT_STATUS_BADGE.PENDING.label).toBe('Pendiente');
    expect(PAYMENT_STATUS_BADGE.REFUNDED.label).toBe('Reembolsado');
  });
});