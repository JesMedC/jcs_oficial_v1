/*
 * sessions-configurable-cap (Slice B, T-017) — workspace keys factory.
 *
 * Co-located with the mutation that owns the
 * ``['workspace', wsId, 'discipline']`` cache slot. Keeping the
 * queryKey factory next to the mutation guarantees invalidations
 * land on the same shape (a typo in either side would silently
 * break the cache).
 *
 * Future read hooks (workspace detail, audit log, etc.) should
 * add their own sub-factories to this object so the whole
 * workspace cache tree stays greppable.
 */
export const workspaceKeys = {
  all: ['workspace'] as const,
  detail: (workspaceId: string) =>
    [...workspaceKeys.all, workspaceId, 'detail'] as const,
  discipline: (workspaceId: string) =>
    [...workspaceKeys.all, workspaceId, 'discipline'] as const,
};
