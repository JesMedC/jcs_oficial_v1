/*
 * p0c — subscription feature API surface.
 *
 * The actual HTTP calls live in `features/auth/api.ts` because the
 * auth context already owns `current_subscription` (returned by
 * `/auth/me`). This module re-exports them under feature-scoped
 * names so the subscription components import from a stable path
 * (`features/subscription/api`) and don't depend on the auth file
 * layout.
 */
import { cancelSubscriptionApi, getMySubscriptionApi, upgradeSubscriptionApi } from '../auth/api';

export async function getMySubscription(): Promise<
  Awaited<ReturnType<typeof getMySubscriptionApi>>
> {
  return getMySubscriptionApi();
}

export interface UpgradeSubscriptionBackUrls {
  readonly success: string;
  readonly failure: string;
  readonly pending: string;
}

export async function upgradeSubscription(
  tier: 'PLUS' | 'ELITE',
  backUrls?: UpgradeSubscriptionBackUrls,
): Promise<Awaited<ReturnType<typeof upgradeSubscriptionApi>>> {
  // Wire-format mapping: ``UpgradeSubscriptionBackUrls`` uses short
  // keys (``success`` / ``failure`` / ``pending``) for the
  // feature-scoped contract, but the backend expects
  // ``success_url`` / ``failure_url`` / ``pending_url`` per
  // ``UpgradeIn`` in ``backend/app/schemas/subscription.py``.
  // Forgetting this rename (a previous version spread ``backUrls``
  // verbatim) caused a 422 VALIDATION_ERROR on /pricing checkout.
  return upgradeSubscriptionApi({
    tier,
    ...(backUrls !== undefined && {
      success_url: backUrls.success,
      failure_url: backUrls.failure,
      pending_url: backUrls.pending,
    }),
  });
}

export async function cancelSubscription(): Promise<
  Awaited<ReturnType<typeof cancelSubscriptionApi>>
> {
  return cancelSubscriptionApi();
}
