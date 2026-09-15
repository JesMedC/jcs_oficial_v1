/*
 * sessions-configurable-cap (Slice B, T-017) — useUpdateSessionCap.
 *
 * TanStack ``useMutation`` wrapper around the
 * ``PATCH /api/v1/workspaces/{id}/discipline`` endpoint Slice A
 * landed in ``backend/app/api/v1/workspace_discipline.py``.
 *
 * On success the mutation invalidates:
 *   - ``workspaceKeys.discipline(workspaceId)`` — so any future
 *     workspace-detail read hook re-fetches.
 *   - ``['auth', 'me']`` — because ``/auth/me`` returns the
 *     ``workspaces[].session_ops_cap`` field; the DisciplinaTab
 *     relies on this for the read-only helper text and the input's
 *     initial value. Without this invalidation the tab would
 *     render stale data after a save.
 *
 * Errors propagate as the canonical ``ErrorEnvelope`` shape — the
 * axios interceptor in ``lib/api/client.ts`` normalizes any 4xx /
 * 5xx response into that envelope before rejecting. The Disciplina
 * tab reads ``error.code`` to detect ``DISCIPLINE_CAP_OUT_OF_RANGE``
 * and render the localized pill.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../../lib/api/client';
import type { ErrorEnvelope } from '../auth/types';
import { workspaceKeys } from './keys';

export interface UpdateSessionCapInput {
  readonly workspaceId: string;
  readonly session_ops_cap: number | null;
}

export interface UpdateSessionCapOutput {
  readonly workspace_id: string;
  readonly plan_tier: string;
  readonly session_ops_cap: number | null;
  readonly ceiling: number;
}

export function updateSessionCapApi(
  input: UpdateSessionCapInput,
): Promise<UpdateSessionCapOutput> {
  return apiClient
    .patch<UpdateSessionCapOutput>(
      `/workspaces/${input.workspaceId}/discipline`,
      { session_ops_cap: input.session_ops_cap },
    )
    .then((res) => res.data);
}

/**
 * TanStack mutation hook. The hook is called per-component so it
 * grabs the live QueryClient via ``useQueryClient`` — callers do
 * NOT need to thread the client through props.
 *
 * Mutation key: ``['workspace', 'discipline', 'update']``. We don't
 * pin a static mutationKey because there's only one mutation shape
 * (workspace-id is a payload field, not a key), but if a future
 * read-side mutation appears (e.g. reset-to-ceiling) it should
 * split out a sub-factory in ``workspaceKeys`` for consistency.
 */
export function useUpdateSessionCap() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateSessionCapOutput,
    ErrorEnvelope,
    UpdateSessionCapInput
  >({
    mutationFn: updateSessionCapApi,
    onSuccess: (_data, variables) => {
      // Invalidate the discipline cache slot so a future read
      // hook sees the new value on next render.
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.discipline(variables.workspaceId),
      });
      // Invalidate /auth/me so the workspace's
      // ``session_ops_cap`` reflects the new value (this is what
      // DisciplinaTab reads on mount and on subsequent visits).
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
