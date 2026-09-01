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
  return upgradeSubscriptionApi({
    tier,
    ...(backUrls ?? {}),
  });
}

export async function cancelSubscription(): Promise<
  Awaited<ReturnType<typeof cancelSubscriptionApi>>
> {
  return cancelSubscriptionApi();
}
