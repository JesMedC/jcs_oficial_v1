/*
 * p0c — AdminAnalyticsPage tests.
 *
 * Cubre:
 * 1. Renderiza 3 KPI cards con los valores del summary.
 * 2. Renderiza la tabla de top pages.
 * 3. Cambia el selector de días y vuelve a fetchear.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

vi.mock('../../../features/analytics/api', () => ({
  getTopPagesApi: vi.fn(),
  getAnalyticsSummaryApi: vi.fn(),
}));

import {
  getAnalyticsSummaryApi,
  getTopPagesApi,
} from '../../../features/analytics/api';
import { AdminAnalyticsPage } from '../AdminAnalyticsPage';
import type {
  AnalyticsSummaryOut,
  TopPageOut,
} from '../../../features/analytics/types';

const mockedSummary = getAnalyticsSummaryApi as unknown as ReturnType<typeof vi.fn>;
const mockedTop = getTopPagesApi as unknown as ReturnType<typeof vi.fn>;

function buildSummary(): AnalyticsSummaryOut {
  return {
    total_views: 1234,
    unique_users: 56,
    unique_anonymous: 890,
    top_referrer: 'https://google.com',
    days: 30,
  };
}

function buildTopPages(): TopPageOut[] {
  return [
    {
      page_path: '/pricing',
      views_count: 100,
      unique_users_count: 30,
      unique_anonymous_count: 50,
      last_viewed_at: new Date().toISOString(),
    },
    {
      page_path: '/features',
      views_count: 50,
      unique_users_count: 10,
      unique_anonymous_count: 30,
      last_viewed_at: new Date().toISOString(),
    },
  ];
}

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <AdminAnalyticsPage />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminAnalyticsPage', () => {
  it('renders H1 + 3 KPI cards with summary values', async () => {
    mockedSummary.mockResolvedValueOnce(buildSummary());
    mockedTop.mockResolvedValueOnce(buildTopPages());
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Analitica' })).toBeInTheDocument();
    });
    // KPI values — el formateo ``es-ES`` puede variar en jsdom, asi que
    // verificamos que los 3 numeros esten presentes como substrings.
    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('1.234');
    expect(bodyText).toContain('56');
    expect(bodyText).toContain('890');
  });

  it('renders top pages table', async () => {
    mockedSummary.mockResolvedValueOnce(buildSummary());
    mockedTop.mockResolvedValueOnce(buildTopPages());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('/pricing')).toBeInTheDocument();
    });
    expect(screen.getByText('/features')).toBeInTheDocument();
    // ``100`` y ``50`` pueden aparecer en varias celdas (views / users /
    // anon) — basta con que aparezcan al menos una vez.
    expect(screen.getAllByText('100').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('50').length).toBeGreaterThanOrEqual(1);
  });

  it('changing the day selector triggers a new fetch', async () => {
    mockedSummary.mockResolvedValueOnce(buildSummary());
    mockedTop.mockResolvedValueOnce(buildTopPages());
    mockedSummary.mockResolvedValueOnce(buildSummary());
    mockedTop.mockResolvedValueOnce(buildTopPages());
    renderPage();

    await waitFor(() => {
      expect(mockedSummary).toHaveBeenCalledTimes(1);
    });

    const user = userEvent.setup();
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    await user.selectOptions(select, '7');

    await waitFor(() => {
      expect(mockedSummary).toHaveBeenCalledTimes(2);
    });
    expect(mockedSummary).toHaveBeenLastCalledWith({ days: 7 });
  });
});