/*
 * p0e.5 — trades feature API surface.
 *
 * Thin wrappers over `apiClient`. Each function narrows the response
 * and rejects with the canonical `ErrorEnvelope` on failure (the
 * interceptor in `lib/api/client.ts` always returns a backend-shaped
 * envelope to the catch block).
 *
 * Endpoints (mirror of `backend/app/api/trades.py`, p0e.4):
 *   - GET    /trades           — listTradesApi
 *   - GET    /trades/{id}      — getTradeByIdApi
 *   - POST   /trades           — openTradeApi
 *   - POST   /trades/{id}/close — closeTradeApi
 *
 * The frontend pages that consume these land in later tasks
 * (``OperacionesPage``, ``NewTradePage``, ``TradeDetailPage``); this
 * module is the only place that knows the URL shapes, so all future
 * renames stay scoped here.
 */
import { apiClient } from '../../lib/api/client';

import type {
  CloseTradePayload,
  CreateTradePayload,
  ListTradesParams,
  RiskSummary,
  TradeList,
  TradeOut,
} from './types';

/**
 * Fetch a paginated list of trades. All params are optional — empty
 * object defaults to the backend's "no filter, skip 0, limit 50".
 */
export async function listTradesApi(params: ListTradesParams = {}): Promise<TradeList> {
  const { data } = await apiClient.get<TradeList>('/trades', { params });
  return data;
}

/**
 * Fetch a single trade by id. Used by the (future) TradeDetailPage
 * for direct-link navigation and post-mutation refresh.
 */
export async function getTradeByIdApi(id: string): Promise<TradeOut> {
  const { data } = await apiClient.get<TradeOut>(`/trades/${id}`);
  return data;
}

/**
 * Open a new trade. Payload is the discriminated union — the backend
 * narrows on ``type`` to pick FOREX or BINARY validation.
 */
export async function openTradeApi(payload: CreateTradePayload): Promise<TradeOut> {
  const { data } = await apiClient.post<TradeOut>('/trades', payload);
  return data;
}

/**
 * Close an existing trade. Payload is the discriminated union —
 * FOREX needs ``exit_price``, BINARY needs ``outcome``.
 */
export async function closeTradeApi(id: string, payload: CloseTradePayload): Promise<TradeOut> {
  const { data } = await apiClient.post<TradeOut>(`/trades/${id}/close`, payload);
  return data;
}

/**
 * Aggregated risk snapshot for the active session — drives the
 * topbar semaphore and dashboard guard rails. Added in FASE 4A
 * alongside the ``/trades/risk-summary`` endpoint.
 */
export async function getRiskSummaryApi(): Promise<RiskSummary> {
  const { data } = await apiClient.get<RiskSummary>('/trades/risk-summary');
  return data;
}
