import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../../lib/api/client';
import type { ErrorEnvelope, WorkspacePlanTier } from '../auth/types';
import { workspaceKeys } from './keys';

export interface RiskControls {
  readonly workspace_id: string;
  readonly plan_tier: WorkspacePlanTier;
  readonly session_ops_cap: number | null;
  readonly daily_loss_pct: string | null;
  readonly weekly_loss_pct: string | null;
  readonly monthly_loss_pct: string | null;
  readonly ceiling: number;
}

export interface UpdateRiskControlsInput {
  readonly workspaceId: string;
  readonly session_ops_cap?: number | null;
  readonly daily_loss_pct?: string | null;
  readonly weekly_loss_pct?: string | null;
  readonly monthly_loss_pct?: string | null;
}

export type UpdateRiskControlsOutput = RiskControls;

export function getRiskControlsApi(workspaceId: string): Promise<RiskControls> {
  return apiClient
    .get<RiskControls>(`/workspaces/${workspaceId}/discipline`)
    .then((res) => res.data);
}

export function updateRiskControlsApi(
  input: UpdateRiskControlsInput,
): Promise<UpdateRiskControlsOutput> {
  const { workspaceId, ...payload } = input;
  return apiClient
    .patch<UpdateRiskControlsOutput>(`/workspaces/${workspaceId}/discipline`, payload)
    .then((res) => res.data);
}

export function useRiskControls(workspaceId: string | undefined) {
  return useQuery<RiskControls, ErrorEnvelope>({
    queryKey: workspaceId
      ? workspaceKeys.discipline(workspaceId)
      : workspaceKeys.discipline('noop'),
    queryFn: () => getRiskControlsApi(workspaceId!),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  });
}

export function useUpdateRiskControls() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateRiskControlsOutput,
    ErrorEnvelope,
    UpdateRiskControlsInput
  >({
    mutationFn: updateRiskControlsApi,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.discipline(variables.workspaceId),
      });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
