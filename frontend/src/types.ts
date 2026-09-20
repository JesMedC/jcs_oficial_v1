// Shared TypeScript types for the trading scanner frontend.
//
// The contract mirrors the FastAPI backend's Pydantic models. Anywhere
// the backend emits an alert or a candle we use these types so the UI
// can rely on the shape being stable across WS messages.

/** OHLCV candle from the backend. ``timestamp`` is ISO-8601 with offset. */
export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Indicator series point — unix seconds + float. */
export interface IndicatorPoint {
  time: number;
  value: number;
}

/** Indicator payload shared by the ``hello`` and ``candle`` WS messages. */
export interface IndicatorsPayload {
  series: {
    ema_fast: IndicatorPoint[];
    ema_mid: IndicatorPoint[];
    ema_slow: IndicatorPoint[];
    bb_upper: IndicatorPoint[];
    bb_middle: IndicatorPoint[];
    bb_lower: IndicatorPoint[];
  };
  latest: Partial<{
    ema_fast: number;
    ema_mid: number;
    ema_slow: number;
    bb_upper: number;
    bb_middle: number;
    bb_lower: number;
  }>;
}

/** Side of an alert — long / short call. */
export type AlertSide = "CALL" | "PUT";

/** Lifecycle status. */
export type AlertStatus = "PENDING" | "WIN" | "LOSS";

/** Which of the 5 confirmation checks fired (per backend ``models.ConfirmationKey``). */
export interface AlertConfirmations {
  trend_structure: boolean;
  support_resistance: boolean;
  stochastic: boolean;
  ema_interaction: boolean;
  fibonacci: boolean;
}

/** Single alert emitted by the scanner engine. */
export interface Alert {
  id: string;
  symbol: string;
  side: AlertSide;
  confidence: number;
  entry_price: number;
  entry_time: string;
  expiry_time: string;
  status: AlertStatus;
  confirmations: AlertConfirmations;
  confirmations_count: number;
  notes?: string[];
}

// ---------------------------------------------------------------- //
// WebSocket message union
// ---------------------------------------------------------------- //

interface BaseWSMessage {
  type: string;
  symbol?: string;
  interval_minutes?: number;
}

/** Snapshot payload pushed once on connection. */
export interface HelloMessage extends BaseWSMessage {
  type: "hello";
  symbol: string;
  interval_minutes: number;
  candles: Candle[];
  indicators: IndicatorsPayload;
  alerts: Alert[];
  server_time: string;
}

/** Tick payload pushed every scanner tick. */
export interface CandleMessage extends BaseWSMessage {
  type: "candle";
  symbol: string;
  interval_minutes: number;
  ts: string | null;
  candle: Candle | null;
  buffer: Candle[];
  indicators: IndicatorsPayload;
}

/** New PENDING alert. */
export interface AlertNewMessage extends BaseWSMessage {
  type: "alert_new";
  alert: Alert;
}

/** Alert transitioned PENDING -> WIN/LOSS. */
export interface AlertUpdateMessage extends BaseWSMessage {
  type: "alert_update";
  alert: Alert;
}

export type WSMessage = HelloMessage | CandleMessage | AlertNewMessage | AlertUpdateMessage;

// ---------------------------------------------------------------- //
// REST responses
// ---------------------------------------------------------------- //

export interface CandlesResponse {
  symbol: string;
  offer_side: "bid" | "ask";
  interval_minutes: number;
  count: number;
  candles: Candle[];
}

export interface AlertsResponse {
  count: number;
  pending_count: number;
  alerts: Alert[];
}

export interface HealthResponse {
  status: "ok";
  provider: string;
  symbol: string;
}

// ---------------------------------------------------------------- //
// Hook return shapes
// ---------------------------------------------------------------- //

export type ConnectionStatus = "connecting" | "open" | "closed";

export interface UseCandlesResult {
  candles: Candle[];
  indicators: IndicatorsPayload | null;
  latest: Candle | null;
  status: ConnectionStatus;
}

export interface UseAlertsResult {
  alerts: Alert[];
  pendingCount: number;
  status: ConnectionStatus;
}
