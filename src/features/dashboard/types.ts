/*
 * dashboard/types.ts — Shared types for the analytics dashboard.
 *
 * Mirrors the structure we'll eventually pull from `/analytics/*`
 * endpoints on the backend. Until those ship, `seedDashboard.ts`
 * produces deterministic synthetic data from the active account id
 * so the components always have something to render.
 */

import type { TradeType } from '../trades/types';

/**
 * Alias kept for semantic clarity inside the dashboard — the only
 * slices we currently aggregate into a "market distribution" are
 * BINARY / FOREX, but the underlying trade type union now also
 * includes FUND / WITHDRAW so we forward the full alias.
 */
export type MarketKind = TradeType;

export interface PnlPoint {
  /** ISO date — day bucket. */
  readonly date: string;
  /** Net P&L for the day, in USD. */
  readonly pnl: number;
  /** Trade count for the day. */
  readonly trades: number;
}

export interface CashflowSummary {
  /** Current balance (sum across active accounts). */
  readonly balance: number;
  /** Lifetime deposits (fund operations), USD. */
  readonly totalDeposits: number;
  /** Lifetime withdrawals, USD. */
  readonly totalWithdrawals: number;
  /** Gross profit on closed WIN trades, USD. */
  readonly grossProfit: number;
  /** Gross loss on closed LOSS trades (positive number). */
  readonly grossLoss: number;
}

export interface MarketSlice {
  readonly kind: MarketKind;
  readonly volume: number;
  readonly pnl: number;
  readonly trades: number;
}

export interface PairStat {
  readonly pair: string;
  readonly kind: MarketKind;
  readonly trades: number;
  readonly winRate: number;
  readonly pnl: number;
  /** Higher rank — better performer. */
  readonly rank: number;
}

export interface CurrencyStrength {
  readonly currency: string;
  /** 0..100 — relative strength over the rolling window. */
  readonly strength: number;
}

export interface HeatmapCell {
  /** -1..1 — relative intensity. */
  readonly intensity: number;
  /** Trades closed in this cell. */
  readonly trades: number;
  readonly pnl: number;
}

export interface AdvancedMetrics {
  readonly profitFactor: number;
  readonly maxDrawdownPct: number;
  readonly avgTradeDurationSec: number;
  readonly disciplineScore: number;
}
