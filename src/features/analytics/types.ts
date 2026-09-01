/*
 * p0c — analytics feature types.
 *
 * Mirror of `backend/app/schemas/page_view.py`. Keep field names in
 * sync with the backend Pydantic models.
 */

export interface TopPageOut {
  readonly page_path: string;
  readonly views_count: number;
  readonly unique_users_count: number;
  readonly unique_anonymous_count: number;
  readonly last_viewed_at: string;
}

export interface AnalyticsSummaryOut {
  readonly total_views: number;
  readonly unique_users: number;
  readonly unique_anonymous: number;
  readonly top_referrer: string | null;
  readonly days: number;
}
