/*
 * sessions-configurable-cap (Slice B, T-017) — account discipline keys.
 *
 * Co-located with the mutation that owns the
 * ``['account', accountId, 'discipline']`` cache slot. Keeping the
 * queryKey factory next to the mutation guarantees invalidations
 * land on the same shape (a typo in either side would silently
 * break the cache).
 *
 * Future read hooks (account detail, audit log, etc.) should
 * add their own sub-factories to this object so the whole account
 * cache tree stays greppable.
 */
export const accountKeys = {
  all: ['account'] as const,
  detail: (accountId: string) =>
    [...accountKeys.all, accountId, 'detail'] as const,
  discipline: (accountId: string) =>
    [...accountKeys.all, accountId, 'discipline'] as const,
};
