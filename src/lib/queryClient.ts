/*
 * portal-fase0a-base — single shared TanStack QueryClient.
 *
 * Mounted once near the React root in src/main.tsx via
 * <QueryClientProvider client={queryClient}>. Page- and feature-scoped
 * hooks (useAccounts, useAccount, useCreateTrade, ...) consume this
 * client to read cached server-state and invalidate after mutations.
 *
 * Defaults are picked to match the change brief and kept conservative
 * — the portal shows user-specific snapshots of trading-account state
 * that are not real-time, so we trade freshness for fewer requests:
 *
 * - staleTime: 30s — accounts/trades may go up to 30s before a manual
 *   refetch; mutations still invalidate immediately.
 * - retry: 1 — one retry is enough for transient 5xx/network blips;
 *   the second pass usually surfaces a real error.
 * - refetchOnWindowFocus: false — focus-return refetches on a portal
 *   that is mostly read-only waste bandwith without changing what
 *   the user sees (mutation invalidation already keeps lists fresh).
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
