/*
 * portal-fase0a-base — TanStack Query hooks for the accounts feature.
 *
 * Replaces the per-component ``useEffect + axios`` pattern in
 * CuentasPage / CuentasDetailPage. The QueryClient is shared (see
 * src/lib/queryClient.ts) so subsequent pages can read from the same
 * cache without re-fetching.
 *
 * Query keys follow the spec at
 * openspec/changes/portal-fase0a-base/specs/tanstack-query-adoption:
 *   - ['accounts']                for the list (CuentasPage)
 *   - ['account', id]             for the detail (CuentasDetailPage)
 *   - ['accountMovements', id]    for the detail ledger tab
 *
 * Mutations that need to invalidate these are colocated in the
 * trades module (useCreateTrade invalidates both lists).
 */
import { useQuery } from '@tanstack/react-query';

import { getAccountById, listAccountMovementsApi, listAccountsApi } from './api';

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => listAccountsApi({ limit: 100 }),
    staleTime: 30_000,
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: ['account', id],
    queryFn: () => getAccountById(id),
    enabled: id.length > 0,
    staleTime: 30_000,
  });
}

export function useAccountMovements(id: string) {
  return useQuery({
    queryKey: ['accountMovements', id],
    queryFn: () => listAccountMovementsApi(id, { limit: 50 }),
    enabled: id.length > 0,
    staleTime: 15_000,
  });
}
