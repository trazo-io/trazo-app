/**
 * Activities (2026-11-06): the list is the same month timeline as the parcel page, with the
 * parcel in the line under each title; and a calendar month with nothing in it says so and
 * offers the latest month instead of reading as "nothing was logged".
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChakraProvider } from '@chakra-ui/react';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import enUS from '../../../../i18n/lang/en-US.json';

const row = (id: number, date: string, parcel: string, event_type = 1) => ({
  event_type,
  event_id: id,
  subtype: null,
  name: `Activity ${id}`,
  date,
  description: `Note ${id}`,
  parcel_id: 311,
  parcel_name: parcel,
  history_id: 9,
  production_finished: false,
  performed_by: ''
});

const state = vi.hoisted(() => ({ windowed: [] as unknown[], latest: [] as unknown[] }));

vi.mock('store/api/activityFeedApi', () => ({
  // A windowed query (calendar month or list range) gets `windowed`; the unwindowed "latest"
  // query the empty month asks for gets `latest`.
  useGetActivityFeedQuery: (args: { start?: string }, opts?: { skip?: boolean }) =>
    opts?.skip
      ? { data: undefined, isLoading: false, isFetching: false, refetch: vi.fn() }
      : {
          data: { activities: args.start ? state.windowed : state.latest, truncated: false },
          isLoading: false,
          isFetching: false,
          refetch: vi.fn()
        }
}));
vi.mock('components/Modals/EventDetailsModal', () => ({ EventDetailsModal: () => null }));
vi.mock('store/api/parcelGeometryApi', () => ({
  useGetParcelGeometryQuery: () => ({ data: undefined })
}));
vi.mock('store/api/productApi', () => ({
  useCreateParcelMutation: () => [vi.fn(), { isLoading: false }]
}));

import Activities from '../index';

function renderActivities(path = '/admin/dashboard/farm/21/activities') {
  const store = configureStore({
    reducer: {
      userState: () => ({ user: { id: 1 } }),
      company: () => ({
        currentCompany: {
          id: 18,
          establishments: [{ id: 21, name: 'Calapooia Bend', parcels: [{ id: 311, name: 'A' }] }]
        }
      })
    }
  });
  return render(
    <Provider store={store}>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <ChakraProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/admin/dashboard/farm/:farmId/activities" element={<Activities />} />
            </Routes>
          </MemoryRouter>
        </ChakraProvider>
      </IntlProvider>
    </Provider>
  );
}

describe('Activities list', () => {
  beforeEach(() => {
    state.windowed = [
      row(1, '2026-08-31T17:00:00Z', 'Home Field West'),
      row(2, '2026-07-24T07:00:00Z', 'Bottom Ground A', 6)
    ];
    state.latest = [];
  });

  it('groups by month and carries the parcel in the line under each title', () => {
    renderActivities('/admin/dashboard/farm/21/activities?view=list&from=2026-01-01');
    const months = screen.getAllByTestId('activity-timeline-month');
    expect(months.map((m) => m.querySelector('p')?.textContent)).toEqual([
      'August 2026',
      'July 2026'
    ]);
    const first = within(months[0]).getByTestId('activity-timeline-row');
    expect(first.textContent).toContain('Home Field West');
    expect(first.textContent).toContain('Aug 31');
    expect(first.textContent).not.toContain('2026-08-31');
  });
});

describe('Activities calendar, empty month', () => {
  beforeEach(() => {
    state.windowed = [];
    state.latest = [row(9, '2026-08-31T17:00:00Z', 'River Block')];
  });

  it('says the month is empty and offers the latest activity month', () => {
    renderActivities();
    const note = screen.queryByTestId('calendar-empty-month');
    expect(note, 'an empty month reads as nothing logged').not.toBeNull();
    if (!note) return;
    expect(note.textContent).toMatch(/Nothing logged in .* The latest activity is Aug 31, 2026\./);
    fireEvent.click(within(note).getByRole('button', { name: /Go to August 2026/ }));
    expect(screen.getByText('August 2026')).toBeTruthy();
  });

  it('says nothing extra when the farm has no activity at all', () => {
    state.latest = [];
    renderActivities();
    expect(screen.queryByTestId('calendar-empty-month')).toBeNull();
  });
});
