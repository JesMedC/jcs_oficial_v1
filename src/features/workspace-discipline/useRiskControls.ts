import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../../lib/api/client';
import type { ErrorEnvelope, RiskControlMode, WorkspacePlanTier } from '../auth/types';
import { accountKeys } from './keys';

export interface RiskControls {
  readonly workspace_id: string;
  readonly plan_tier: WorkspacePlanTier;
  readonly risk_control_mode: RiskControlMode;
  readonly session_ops_cap: number | null;
  readonly daily_loss_pct: string | null;
  readonly weekly_loss_pct: string | null;
  readonly monthly_loss_pct: string | null;
  readonly ceiling: number;
}

export interface UpdateRiskControlsInput {
  readonly accountId: string;
  readonly risk_control_mode?: RiskControlMode;
  readonly session_ops_cap?: number | null;
  readonly daily_loss_pct?: string | null;
  readonly weekly_loss_pct?: string | null;
  readonly monthly_loss_pct?: string | null;
}

export type UpdateRiskControlsOutput = RiskControls;

export function getRiskControlsApi(accountId: string): Promise<RiskControls> {
  return apiClient
    .get<RiskControls>(`/accounts/${accountId}/discipline`)
    .then((res) => res.data);
}

export function updateRiskControlsApi(
  input: UpdateRiskControlsInput,
): Promise<UpdateRiskControlsOutput> {
  const { accountId, ...payload } = input;
  return apiClient
    .patch<UpdateRiskControlsOutput>(
      `/accounts/${accountId}/discipline`,
      payload,
    )
    .then((res) => res.data);
}

export function useRiskControls(accountId: string | undefined) {
  return useQuery<RiskControls, ErrorEnvelope>({
    queryKey: accountId
      ? accountKeys.discipline(accountId)
      : accountKeys.discipline('noop'),
    queryFn: () => getRiskControlsApi(accountId!),
    enabled: Boolean(accountId),
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
        queryKey: accountKeys.discipline(variables.accountId),
      });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
