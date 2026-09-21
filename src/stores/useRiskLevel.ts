/*
 * portal-fase0a-base — store: useRiskLevel.
 *
 * Phase 0A placeholder kept around as a no-op state slot. The
 * real risk summary is now sourced from
 * ``GET /api/v1/trades/risk-summary`` via ``useRiskSummary()`` (see
 * ``src/features/trades/hooks.ts``); ``RiskSemaphore`` reads from
 * that hook directly. This store is kept so legacy imports stay
 * resolvable until the admin pages (p2a) drop their own references.
 */
import { create } from 'zustand';

export type RiskLevel = 'green' | 'yellow' | 'red';

interface RiskLevelState {
  readonly level: RiskLevel;
  readonly set: (next: RiskLevel) => void;
}

export const useRiskLevel = create<RiskLevelState>((set) => ({
  level: 'green',
  set: (next) => {
    set({ level: next });
  },
}));
