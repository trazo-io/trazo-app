/**
 * Farm home (2026-11-05): the header states counts in one line, and the seasons list names each
 * season underway with the two things to do with it.
 *
 * Replaced the Farm Profile card and the "Records and buyer page" card. The counts are the
 * producer-dashboard set (seasons, activities, photos, QR scans): no percentage, no grade.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

import enUS from '../../../../../../i18n/lang/en-US.json';

let metrics: Record<string, unknown> | undefined;
let seasons: Array<Record<string, unknown>> = [];
let seasonsState: Record<string, boolean> = {};
vi.mock('store/api/dashboardMetricsApi', () => ({
  useGetFarmDashboardMetricsQuery: () => ({ data: metrics ? { metrics } : undefined })
}));
vi.mock('store/api/historyApi', () => ({
  useGetFarmProductionsQuery: () => ({
    data: seasonsState.isError || seasonsState.isUninitialized ? undefined : seasons,
    isLoading: false,
    isUninitialized: false,
    isError: false,
    ...seasonsState
  })
}));

import FarmHomeHeader from '../FarmHomeHeader';
import SeasonsUnderwayCard from '../SeasonsUnderwayCard';

const wrap = (ui: React.ReactElement) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <MemoryRouter>{ui}</MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

describe('farm home header', () => {
  beforeEach(() => {
    metrics = {
      productions_in_progress: 3,
      scored_productions: 9,
      total_documented_events: 513,
      photo_count: 0,
      monthly_scans: 14,
      consumer_reach: 1,
      // A stale server still sending a retired field must not reach the page.
      scan_growth_percentage: 367
    };
  });

  it('states every count in one line, with the QR window', () => {
    wrap(
      <FarmHomeHeader companyId={1} farmId={2} name="Calapooia Bend Farm" location="Tangent, OR" />
    );
    const line = screen.getByText(/seasons underway/).textContent ?? '';
    expect(line).toBe(
      '3 seasons underway · 9 finished · 513 activities · 0 photos · 14 QR scans in the last 30 days'
    );
  });

  it('prints no percentage and no grade', () => {
    const { container } = wrap(
      <FarmHomeHeader companyId={1} farmId={2} name="Calapooia Bend Farm" />
    );
    expect(container.textContent).not.toMatch(/%|score|grade/i);
  });

  it('leaves a count out when the server did not send it, never prints a zero for it', () => {
    metrics = { ...metrics, photo_count: undefined };
    wrap(<FarmHomeHeader companyId={1} farmId={2} name="Calapooia Bend Farm" />);
    expect(screen.getByText(/seasons underway/).textContent).not.toMatch(/photo/);
  });

  it('reaches the farm profile: a link on a phone, an outlined button from md', () => {
    wrap(<FarmHomeHeader companyId={1} farmId={2} name="Calapooia Bend Farm" />);
    // jsdom renders the base breakpoint, so the md button is present but hidden.
    const link = screen.getByRole('link', { name: /Farm profile/ });
    expect(link.getAttribute('href')).toBe('/admin/dashboard/farm/2/profile');
    expect(screen.getByRole('button', { name: /Farm profile/, hidden: true })).toBeTruthy();
  });
});

describe('seasons underway', () => {
  beforeEach(() => {
    seasonsState = {};
    seasons = [
      {
        id: 7,
        name: 'Onions 2026 — Upper Terrace',
        parcel: 'Upper Terrace',
        start_date: '2026-03-31',
        finish_date: null,
        events_count: 21,
        crop_type: { name: 'Onions' }
      },
      {
        id: 8,
        name: 'Walnuts 2025',
        parcel: 'River Block',
        start_date: '2025-03-01',
        finish_date: '2025-10-30',
        events_count: 40
      },
      {
        id: 9,
        name: 'Carrots 2026',
        parcel: 'Bottom Ground B',
        start_date: '2026-04-07',
        finish_date: null,
        events_count: 19,
        crop_type: { name: 'Carrots' }
      }
    ];
  });

  const parcels = [
    { id: 11, name: 'Upper Terrace' },
    { id: 12, name: 'Bottom Ground B' }
  ];

  it('lists only seasons with no finish date, oldest first', () => {
    wrap(<SeasonsUnderwayCard farmId={2} parcels={parcels} />);
    const rows = screen.getAllByTestId('season-underway-row');
    expect(rows.map((r) => r.querySelector('p')?.textContent)).toEqual([
      'Onions 2026 — Upper Terrace',
      'Carrots 2026'
    ]);
  });

  it('links each row to the season and to finishing it', () => {
    wrap(<SeasonsUnderwayCard farmId={2} parcels={parcels} />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/admin/dashboard/farm/2/parcel/11/production/7');
    expect(hrefs).toContain('/admin/dashboard/farm/2/parcel/11/production/7/finish');
    expect(hrefs).toContain('/admin/dashboard/farm/2/parcel/12/production/9/finish');
  });

  it('does not repeat the parcel or crop the season name already says', () => {
    wrap(<SeasonsUnderwayCard farmId={2} parcels={parcels} />);
    const [onions, carrots] = screen.getAllByTestId('season-underway-row');
    expect(onions.textContent).not.toMatch(/Upper Terrace ·/);
    expect(onions.textContent).not.toMatch(/Onions ·/);
    expect(carrots.textContent).toMatch(/Bottom Ground B ·/);
  });

  it('says so when nothing is underway', () => {
    seasons = [];
    wrap(<SeasonsUnderwayCard farmId={2} parcels={parcels} />);
    expect(screen.getByText(/No season underway/)).toBeTruthy();
  });

  it('says the load failed, never "no season underway", when the request fails', () => {
    seasonsState = { isError: true };
    wrap(<SeasonsUnderwayCard farmId={2} parcels={parcels} />);
    expect(screen.queryByText(/No season underway/)).toBeNull();
    expect(screen.queryByTestId('seasons-load-failed')).not.toBeNull();
  });

  it('shows loading, not the empty state, for a query that has not run', () => {
    seasonsState = { isUninitialized: true };
    wrap(<SeasonsUnderwayCard farmId={2} parcels={parcels} />);
    expect(screen.queryByText(/No season underway/)).toBeNull();
  });

  it('prefers the parcel id the API sends, and never leaves a row without a way in', () => {
    seasons = [
      { id: 7, name: 'Onions 2026', parcel: 'Renamed Terrace', parcel_id: 11, finish_date: null },
      { id: 9, name: 'Carrots 2026', parcel: 'Unknown Block', finish_date: null }
    ];
    wrap(<SeasonsUnderwayCard farmId={2} parcels={parcels} />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/admin/dashboard/farm/2/parcel/11/production/7/finish');
    const [, carrots] = screen.getAllByTestId('season-underway-row');
    const link = carrots.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/admin/dashboard/farm/2/activities');
  });
});
