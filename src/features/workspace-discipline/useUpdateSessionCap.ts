/*
 * sessions-configurable-cap (Slice B, T-017) — useUpdateSessionCap.
 *
 * Compatibility wrapper around the broader account discipline mutation.
 * Risk controls now share PATCH /accounts/{id}/discipline for session
 * operation caps plus daily/weekly/monthly loss limits.
 *
 * After the per-account move, the Disciplina tab on /portal/configuracion
 * is the only caller left, and it picks the first active account of the
 * user. Both the account id and the cap value flow through this wrapper so
 * the legacy contract stays intact.
 */
import {
  updateRiskControlsApi,
  useUpdateRiskControls,
  type RiskControls,
  type UpdateRiskControlsOutput,
} from './useRiskControls';

export interface UpdateSessionCapInput {
  readonly accountId: string;
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
