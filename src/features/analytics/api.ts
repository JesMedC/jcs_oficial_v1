/*
 * p0c — analytics feature API surface (admin only).
 *
 * The public POST /analytics/pageview is called directly from
 * `lib/analytics/pageview.ts` (no API wrapper needed — it's a fetch
 * call, not an Axios one).
 */
import { apiClient } from '../../lib/api/client';

import type { AnalyticsSummaryOut, TopPageOut } from './types';

export interface GetTopPagesParams {
  readonly days?: number;
  readonly limit?: number;
}

export async function getTopPagesApi(
  params: GetTopPagesParams = {},
): Promise<readonly TopPageOut[]> {
  const { data } = await apiClient.get<readonly TopPageOut[]>('/admin/analytics/top-pages', {
    params,
  });
  return data;
}

export interface GetAnalyticsSummaryParams {
  readonly days?: number;
}

export async function getAnalyticsSummaryApi(
  params: GetAnalyticsSummaryParams = {},
): Promise<AnalyticsSummaryOut> {
  const { data } = await apiClient.get<AnalyticsSummaryOut>('/admin/analytics/summary', { params });
  return data;
}
