/*
 * p0c — payments feature API surface.
 *
 * Thin wrappers over `apiClient`. Each function narrows the response
 * and rejects with the canonical `ErrorEnvelope` on failure (the
 * interceptor in `lib/api/client.ts` always returns a backend-shaped
 * envelope to the catch block).
 */
import { apiClient } from '../../lib/api/client';

import type { PaymentList, PaymentStatusLiteral } from './types';

export interface ListPaymentsParams {
  readonly status?: PaymentStatusLiteral;
  readonly skip?: number;
  readonly limit?: number;
}

export async function listPaymentsApi(params: ListPaymentsParams = {}): Promise<PaymentList> {
  const { data } = await apiClient.get<PaymentList>('/admin/payments', { params });
  return data;
}
