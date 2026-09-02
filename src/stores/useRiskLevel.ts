/*
 * portal-fase0a-base — store: useRiskLevel.
 *
 * Phase 0A: placeholders only. The real risk summary is a FASE 4
 * endpoint (/api/v1/trades/risk-summary) that aggregates daily P&L
 * against the user's loss limit. Wiring that is out of scope per the
 * `topbar` spec; for FASE 0A the semaphore stays green forever and
 * the badge reads "Sin datos de hoy".
 *
 * Holding the placeholder in a Zustand store (rather than a constant)
 * keeps the consumer's API uniform with the eventual real source —
 * TopNav just calls `useRiskLevel((s) => s.level)`, and when the
 * real fetcher lands we only change the store, not the consumer.
 */
import { create } from 'zustand';

export type RiskLevel = 'green' | 'yellow' | 'red';

interface RiskLevelState {
  readonly level: RiskLevel;
  readonly set: (next: RiskLevel) => void;
}

export const useRiskLevel = create<RiskLevelState>((set) => ({
  // TODO (FASE 4): wire to /api/v1/trades/risk-summary so the
  // semaphore reflects daily P&L against the user's loss limit.
  // Until then we stay at "green" and the badge tooltip is "Sin
  // datos de hoy".
  level: 'green',
  set: (next) => {
    set({ level: next });
  },
}));
