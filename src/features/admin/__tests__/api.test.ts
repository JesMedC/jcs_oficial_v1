/*
 * p0b.2 — admin API tests (4 cases).
 *
 * Covers the three listUsersApi + setUserActiveApi paths through the
 * apiClient interceptor. We mock apiClient directly so we don't need
 * a running backend.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listPlansApi, listUsersApi, setUserActiveApi, updatePlanPriceApi } from '../api';
import type { AdminUserList, PlanTierPrice, UserWithSubscription } from '../types';

vi.mock('../../../lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

import { apiClient } from '../../../lib/api/client';

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;
const mockedPatch = apiClient.patch as unknown as ReturnType<typeof vi.fn>;

afterEach(() => {
  vi.clearAllMocks();
});

const sampleUser: UserWithSubscription = {
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
};

const sampleList: AdminUserList = {
  items: [sampleUser],
  total: 1,
  skip: 0,
  limit: 50,
};

const samplePlans: PlanTierPrice[] = [
  {
    id: 'p1',
    tier: 'STARTER',
    price_usd: '0.00',
    billing_period_days: 30,
    is_active: true,
    effective_from: '2026-08-31T00:00:00Z',
    effective_until: null,
    created_at: '2026-08-31T00:00:00Z',
  },
  {
    id: 'p2',
    tier: 'PLUS',
    price_usd: '9.99',
    billing_period_days: 30,
    is_active: true,
    effective_from: '2026-08-31T00:00:00Z',
    effective_until: null,
    created_at: '2026-08-31T00:00:00Z',
  },
  {
    id: 'p3',
    tier: 'ELITE',
    price_usd: '29.99',
    billing_period_days: 30,
    is_active: true,
    effective_from: '2026-08-31T00:00:00Z',
    effective_until: null,
    created_at: '2026-08-31T00:00:00Z',
  },
];

describe('admin api — listUsersApi', () => {
  it('hits GET /admin/users with the provided params and returns the typed envelope', async () => {
    mockedGet.mockResolvedValueOnce({ data: sampleList });

    const result = await listUsersApi({ role: 'USER', search: 'demo', skip: 0, limit: 25 });

    expect(mockedGet).toHaveBeenCalledWith('/admin/users', {
      params: { role: 'USER', search: 'demo', skip: 0, limit: 25 },
    });
    expect(result.total).toBe(1);
    const first = result.items[0];
    expect(first).toBeDefined();
    if (first !== undefined) {
      expect(first.email).toBe('demo@jadecapital.local');
    }
  });

  it('omits empty filters from the request params (default skip=0, limit=50)', async () => {
    mockedGet.mockResolvedValueOnce({ data: sampleList });
    await listUsersApi();
    const call = mockedGet.mock.calls[0];
    expect(call).toBeDefined();
    if (call !== undefined) {
      expect(call[0]).toBe('/admin/users');
      const opts = call[1] as { params?: Record<string, unknown> } | undefined;
      // Default args: no filters, but the AdminUsersPage always
      // passes skip/limit explicitly. The api function itself uses
      // an empty default when called with no args.
      expect(opts?.params).toEqual({});
    }
  });
});

describe('admin api — setUserActiveApi', () => {
  it('PATCHes /admin/users/:id with the boolean body', async () => {
    mockedPatch.mockResolvedValueOnce({ data: { ...sampleUser, is_active: false } });

    const result = await setUserActiveApi('u1', false);

    expect(mockedPatch).toHaveBeenCalledWith('/admin/users/u1', { is_active: false });
    expect(result.is_active).toBe(false);
  });

  it('propagates the envelope rejection when the backend rejects with ADMINAC_CANNOT_DEACTIVATE_SELF', async () => {
    const envelope = {
      code: 'ADMINAC_CANNOT_DEACTIVATE_SELF' as const,
      message: 'No puedes desactivarte a ti mismo',
      correlation_id: 'cid-test-12345678',
    };
    mockedPatch.mockRejectedValueOnce(envelope);

    await expect(setUserActiveApi('u1', false)).rejects.toMatchObject({
      code: 'ADMINAC_CANNOT_DEACTIVATE_SELF',
      message: 'No puedes desactivarte a ti mismo',
    });
  });
});

describe('admin api — plan endpoints', () => {
  it('listPlansApi calls GET /admin/plans', async () => {
    mockedGet.mockResolvedValueOnce({ data: samplePlans });
    const result = await listPlansApi();
    expect(mockedGet).toHaveBeenCalledWith('/admin/plans');
    expect(result.length).toBe(3);
  });

  it('updatePlanPriceApi PATCHes /admin/plans/:tier with the price payload', async () => {
    const base = samplePlans[1];
    if (base === undefined) throw new Error('test fixture missing PLUS plan');
    const newRow: PlanTierPrice = {
      id: 'p-new',
      tier: base.tier,
      price_usd: '12.99',
      billing_period_days: base.billing_period_days,
      is_active: true,
      effective_from: '2026-09-01T03:00:00Z',
      effective_until: null,
      created_at: base.created_at,
    };
    mockedPatch.mockResolvedValueOnce({ data: newRow });
    const result = await updatePlanPriceApi('PLUS', '12.99');
    expect(mockedPatch).toHaveBeenCalledWith('/admin/plans/PLUS', { price_usd: '12.99' });
    expect(result.price_usd).toBe('12.99');
  });
});
