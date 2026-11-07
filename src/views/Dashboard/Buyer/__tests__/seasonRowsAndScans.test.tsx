/**
 * The Buyer page lists seasons and scans as rows (2026-11-07).
 *
 * The seasons table carried three bordered buttons per season beside the publish switch, and on
 * a phone the switch and every button sat off the right edge behind a sideways scroll. The scans
 * table printed raw UTC strings ("2026-10-08 21:48") and a Location column that read "—" on
 * every row. Pinned here: every season row has its switch, labelled in words, and one Print
 * menu; Open page only where there is a page to open; scan times are localized; a place shows
 * only where a scan has one.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const SEASONS = [
  {
    id: 1,
    public_id: 'a',
    name: 'Duke 2026 — Home Field East',
    product: { name: 'Blueberries' },
    parcel: { name: 'Home Field East' },
    start_date: '2026-03-01T00:00:00Z',
    finish_date: '2026-07-12T00:00:00Z',
    published: true
  },
  {
    id: 2,
    public_id: 'b',
    name: 'Carrots 2026 — Bottom Ground B',
    product: { name: 'Carrots' },
    parcel: { name: 'Bottom Ground B' },
    start_date: '2026-04-08T00:00:00Z',
    finish_date: null,
    published: false
  },
  {
    // A legacy row with no start date (review of #307: it printed "null – Aug 13, 2025").
    id: 3,
    public_id: 'c',
    name: 'Liberty 2025 — River Block',
    product: { name: 'Blueberries' },
    parcel: { name: 'River Block' },
    start_date: null,
    finish_date: '2025-08-13T00:00:00Z',
    published: false
  }
];

const SCANS = {
  count: 2,
  results: [
    {
      id: 10,
      date: '2026-10-08 21:48:00',
      product: 'Blueberries',
      parcel: 'Home Field East',
      production: 'Duke 2026 — Home Field East',
      location: '-'
    },
    {
      id: 11,
      date: '2026-10-07 12:00:00',
      product: 'Blueberries',
      parcel: 'Home Field East',
      production: 'Duke 2026 — Home Field East',
      location: 'Portland, US'
    }
  ]
};

vi.mock('store/api/buyerPageApi', () => ({
  useGetBuyerFarmProductionsQuery: () => ({
    data: SEASONS,
    isLoading: false,
    isUninitialized: false
  }),
  useGetBuyerPageDocRequestsQuery: () => ({ data: [] }),
  useSetBuyerDocRequestStatusMutation: () => [vi.fn()],
  useSetProductionPublishedMutation: () => [vi.fn(), { isLoading: false }]
}));
vi.mock('store/api/historyApi', () => ({
  useGetFarmScansPaginatedQuery: () => ({ data: SCANS })
}));
vi.mock('components/Certifications/BuyerReviewLinkCard', () => ({ default: () => null }));
vi.mock('hooks/useTour', () => ({ useTour: () => undefined }));
vi.mock('hooks/useUserRole', () => ({ useUserRole: () => ({ canWrite: true }) }));
vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) => fn({ company: { currentCompany: { id: 17 } } })
}));

import BuyerPage from '../index';

const renderPage = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>} onError={() => {}}>
        <MemoryRouter initialEntries={['/admin/dashboard/farm/33/buyer']}>
          <Routes>
            <Route path="/admin/dashboard/farm/:farmId/buyer" element={<BuyerPage />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

describe('Buyer page rows', () => {
  it('every season row has its switch and one Print menu; no table', () => {
    const { container } = renderPage();
    expect(container.querySelector('table')).toBeNull();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getAllByText('Not public')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Print for Duke 2026 — Home Field East' }));
    expect(screen.getByRole('button', { name: 'Print for Carrots 2026 — Bottom Ground B' }));
  });

  it('offers Open page only for a published season', () => {
    renderPage();
    expect(screen.getAllByRole('link', { name: /Open page/ })).toHaveLength(1);
  });

  it('dates read as dates, not ISO strings', () => {
    const { container } = renderPage();
    expect(screen.getByText(/Mar 1, 2026 – Jul 12, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/since Apr 8, 2026/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('a season with no start date never prints "null"', () => {
    const { container } = renderPage();
    expect(container.textContent).not.toMatch(/null/);
    expect(screen.getByText('River Block · Aug 13, 2025')).toBeInTheDocument();
  });

  it('names a place only where a scan has one', () => {
    renderPage();
    expect(screen.getByText(/Portland, US/)).toBeInTheDocument();
    expect(screen.queryByText('—')).toBeNull();
    const rows = screen.getAllByText('Duke 2026 — Home Field East');
    expect(rows.length).toBeGreaterThan(0);
    expect(within(document.body).queryByText('Location')).toBeNull();
  });
});
