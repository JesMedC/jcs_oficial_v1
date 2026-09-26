/*
 * sessions-configurable-cap (Slice B, T-017) — useUpdateSessionCap.
 *
 * Compatibility wrapper around the broader workspace discipline mutation.
 * Risk controls now share PATCH /workspaces/{id}/discipline for session
 * operation caps plus daily/weekly/monthly loss limits.
 */
import {
  updateRiskControlsApi,
  useUpdateRiskControls,
  type RiskControls,
  type UpdateRiskControlsOutput,
} from './useRiskControls';

export interface UpdateSessionCapInput {
  readonly workspaceId: string;
  readonly session_ops_cap: number | null;
}

export type { RiskControls };

export type UpdateSessionCapOutput = UpdateRiskControlsOutput;

export function updateSessionCapApi(
  input: UpdateSessionCapInput,
): Promise<UpdateSessionCapOutput> {
  return updateRiskControlsApi(input);
}

export function useUpdateSessionCap() {
  return useUpdateRiskControls();
}
