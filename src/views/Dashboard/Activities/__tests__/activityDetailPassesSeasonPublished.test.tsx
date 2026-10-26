/**
 * AC-15 wiring (review on #210): the buyer-page hint reads "appears on your buyer page" only when
 * the season is published. `TrackList` reads `current_history`, which only ever points at an open
 * season, so the published case can only come from the page that holds the season
 * (ProfileProduction) through ActivityDetailModal. A modal-level test that passes the prop
 * directly cannot see a caller that never sends it, so this pins both hops.
 */
import { readFileSync } from 'fs';
import path from 'path';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const received: Array<Record<string, unknown>> = [];

vi.mock('components/Modals/EventDetailsModal', () => ({
  EventDetailsModal: (props: Record<string, unknown>) => {
    received.push(props);
    return null;
  }
}));
vi.mock('store/api/historyApi', () => ({
  useGetEventQuery: () => ({
    data: { id: 7, name: 'Gala record' },
    isFetching: false,
    isUninitialized: false,
    isError: false
  })
}));
vi.mock('react-redux', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useSelector: (fn: (s: unknown) => unknown) => fn({ company: { currentCompany: { id: 17 } } })
}));
vi.mock('react-intl', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id, locale: 'en-US' })
}));

vi.mock('components/Design/ResponsiveModal', () => ({
  ResponsiveModal: ({ children }: { children?: React.ReactNode }) => <>{children}</>
}));

import { ActivityDetailModal } from '../ActivityDetailModal';

const row = {
  event_id: 7,
  event_type: 'production',
  parcel_id: 49,
  parcel_name: 'South Block',
  production_finished: true
} as never;

describe('ActivityDetailModal forwards the season publish state', () => {
  it.each([true, false, undefined])('isSeasonPublished=%s reaches EventDetailsModal', (value) => {
    received.length = 0;
    render(
      <ActivityDetailModal row={row} onClose={() => {}} farmId="20" isSeasonPublished={value} />
    );
    expect(received.at(-1)?.isSeasonPublished).toBe(value);
  });

  it('ProfileProduction, which holds the season, sends it', () => {
    const src = readFileSync(
      path.resolve(__dirname, '../../Dashboard/Production/ProfileProduction.tsx'),
      'utf8'
    );
    const mount = src.slice(
      src.indexOf('<ActivityDetailModal'),
      src.indexOf('/>', src.indexOf('<ActivityDetailModal'))
    );
    expect(mount).toMatch(/isSeasonPublished=\{!!historyData\?\.published\}/);
  });
});
