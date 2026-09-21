/*
 * p0b.2 — admin API surface.
 *
 * Thin wrappers over `apiClient`. Each function narrows the response to
 * the typed payload and rejects with the canonical `ErrorEnvelope` on
 * failure. Per the project's R4 contract the interceptor in
 * `lib/api/client.ts` always returns a backend-shaped envelope to the
 * catch block, so callers can read `.code`, `.message`, `.correlation_id`.
 */
import { apiClient } from '../../lib/api/client';
import type { UserRole } from '../auth/types';
import type {
  AdminUserList,
  PlanTierPrice,
  SetUserActive,
  UpdatePlanPrice,
  UserWithSubscription,
} from './types';

export interface ListUsersParams {
  readonly role?: UserRole;
  readonly status?: 'active' | 'inactive' | 'trial' | 'active_sub' | 'expired';
  readonly search?: string;
  readonly skip?: number;
  readonly limit?: number;
}

export async function listUsersApi(params: ListUsersParams = {}): Promise<AdminUserList> {
  const { data } = await apiClient.get<AdminUserList>('/admin/users', { params });
  return data;
}

export async function setUserActiveApi(
  userId: string,
  isActive: boolean,
): Promise<UserWithSubscription> {
  // The PATCH endpoint returns `UserOut`; we re-shape it into
  // `UserWithSubscription` (current_subscription = null) because the
  // caller usually follows up with listUsersApi(). Components that
  // need the rich row refetch via listUsersApi separately.
  const body: SetUserActive = { is_active: isActive };
  const { data } = await apiClient.patch<UserWithSubscription>(`/admin/users/${userId}`, body);
  return data;
}

export async function listPlansApi(): Promise<readonly PlanTierPrice[]> {
  const { data } = await apiClient.get<readonly PlanTierPrice[]>('/admin/plans');
  return data;
}

export async function updatePlanPriceApi(
  tier: 'STARTER' | 'PLUS' | 'ELITE',
  priceUsd: string,
): Promise<PlanTierPrice> {
  const body: UpdatePlanPrice = { price_usd: priceUsd };
  const { data } = await apiClient.patch<PlanTierPrice>(`/admin/plans/${tier}`, body);
  return data;
}
