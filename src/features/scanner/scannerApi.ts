/*
 * scannerApi — typed REST client for ``GET /api/v1/scanner/chart/{pair}``.
 *
 * Lives next to ``useScannerAlerts`` (the WS hook) so the scanner
 * surface stays co-located. The chart payload shape mirrors
 * ``backend/app/services/scanner/schemas.py:ChartPayload`` verbatim;
 * renaming a field on the backend without updating this type will
 * break the chart silently (the rendered series will simply have
 * no data).
 *
 * Auth: the shared ``apiClient`` (see ``src/lib/api/client.ts``)
 * already attaches the access token via its request interceptor, so
 * we just call ``apiClient.get(...)`` here. Errors bubble up as
 * typed axios errors — ``ScannerChart`` converts them into a
 * graceful empty-state rather than crashing the page.
 */
import { apiClient } from '../../lib/api/client';

export interface ChartCandle {
  readonly time: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
}

export interface ChartPoint {
  readonly time: string;
  readonly value: number;
}

export interface ChartEma {
  readonly period: number;
  readonly values: ReadonlyArray<ChartPoint>;
}

export interface ChartStochastic {
  readonly k: ReadonlyArray<ChartPoint>;
  readonly d: ReadonlyArray<ChartPoint>;
  readonly overbought: number;
  readonly oversold: number;
}

export interface ChartPayload {
  readonly pair: string;
  readonly timeframe: string;
  readonly candles: ReadonlyArray<ChartCandle>;
  readonly ema: ChartEma;
  readonly stochastic: ChartStochastic;
}

function normalizePair(pair: string): string {
  // The endpoint accepts slashes in the URL path but axios / the
  // path won't double-encode them — we still defensively encode the
  // pair here so exotic inputs ("EUR USD" with whitespace) don't
  // crash the request.
  return encodeURIComponent(pair.trim());
}

/**
 * Fetch the last ~210 closed 5m candles for ``pair`` plus EMA 200
 * and Stochastic (5, 3, 3) series for the same window.
 *
 * Throws on transport / 4xx / 5xx — callers should catch axios
 * errors and degrade to an empty chart rather than propagating.
 */
export async function fetchChart(pair: string): Promise<ChartPayload> {
  const response = await apiClient.get<ChartPayload>(
    `/scanner/chart/${normalizePair(pair)}`,
  );
  return response.data;
}
