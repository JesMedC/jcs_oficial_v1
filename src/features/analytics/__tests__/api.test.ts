/*
 * p0c — analytics API tests.
 *
 * Verifica que ``getTopPagesApi`` y ``getAnalyticsSummaryApi``
 * serialicen los query params correctamente.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from '../../../lib/api/client';
import { getAnalyticsSummaryApi, getTopPagesApi } from '../api';

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;

describe('analytics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getTopPagesApi sends days and limit', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await getTopPagesApi({ days: 7, limit: 10 });
    expect(mockedGet).toHaveBeenCalledWith('/admin/analytics/top-pages', {
      params: { days: 7, limit: 10 },
    });
  });

  it('getAnalyticsSummaryApi sends days', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        total_views: 0,
        unique_users: 0,
        unique_anonymous: 0,
        top_referrer: null,
        days: 90,
      },
    });
    await getAnalyticsSummaryApi({ days: 90 });
    expect(mockedGet).toHaveBeenCalledWith('/admin/analytics/summary', {
      params: { days: 90 },
    });
  });
});