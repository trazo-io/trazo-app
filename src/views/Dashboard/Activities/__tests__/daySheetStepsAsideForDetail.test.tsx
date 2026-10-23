/**
 * Opening an activity from the day sheet must not stack the detail modal on top of the sheet.
 *
 * Reproduced 2026-10-23: a day with four activities, "+1 more", click one, and the detail
 * modal opened but its body would not scroll. Chakra 2.x gives the scroll lock only to the
 * bottom modal of a stack (`enabled: index === 1` in modal-focus), and react-remove-scroll lets
 * the wheel through only inside that modal's own DOM node. The detail modal is portalled to a
 * different node, so with the day sheet underneath, every wheel event on it was cancelled.
 *
 * jsdom has no wheel scrolling to assert on, so this pins the mechanism instead: while an
 * activity is open the day sheet is closed, and closing the activity brings the same day back.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChakraProvider } from '@chakra-ui/react';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import enUS from '../../../../i18n/lang/en-US.json';

// Hoisted: vi.mock factories run before the module body, so the rows must exist by then.
const { rows } = vi.hoisted(() => {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-04`;
  return {
    rows: ['Cleanout', 'Harvest', 'Amendment', 'Spray'].map((name, i) => ({
      event_type: 1,
      event_id: 100 + i,
      subtype: null,
      name,
      date: iso,
      description: '',
      parcel_id: 311,
      parcel_name: 'Home Field East',
      history_id: 9,
      production_finished: false,
      performed_by: ''
    }))
  };
});

vi.mock('store/api/activityFeedApi', () => ({
  useGetActivityFeedQuery: () => ({
    data: { activities: rows, truncated: false },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn()
  })
}));
// The real detail modal is a 1,400-line component; only whether it is open matters here.
vi.mock('components/Modals/EventDetailsModal', () => ({
  EventDetailsModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="event-detail">
        <button type="button" onClick={onClose}>
          close detail
        </button>
      </div>
    ) : null
}));
vi.mock('store/api/historyApi', async () => ({
  ...((await vi.importActual('store/api/historyApi')) as object),
  useGetEventQuery: () => ({ data: { id: 101 }, isFetching: false, isUninitialized: false })
}));
vi.mock('store/api/parcelGeometryApi', () => ({
  useGetParcelGeometryQuery: () => ({ data: undefined })
}));
vi.mock('store/api/productApi', () => ({
  useCreateParcelMutation: () => [vi.fn(), { isLoading: false }]
}));

import Activities from '../index';

function renderActivities() {
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
      <IntlProvider locale="en-US" messages={enUS as any}>
        <ChakraProvider>
          <MemoryRouter initialEntries={['/admin/dashboard/farm/21/activities']}>
            <Routes>
              <Route path="/admin/dashboard/farm/:farmId/activities" element={<Activities />} />
            </Routes>
          </MemoryRouter>
        </ChakraProvider>
      </IntlProvider>
    </Provider>
  );
}

const daySheet = () => screen.queryByText('4 activities');

describe('Day sheet and activity detail', () => {
  it('closes the day sheet while an activity is open, and brings the same day back after', async () => {
    renderActivities();
    fireEvent.click(screen.getAllByRole('button', { name: /Show all 4 activities on/ })[0]);
    const sheet = screen.getByRole('dialog');
    expect(daySheet()).toBeTruthy();

    // The sheet's rows are buttons (ActivityListItem `as="button"`); the close button is not
    // one of the four, so take the rows by position after it.
    const rowButtons = within(sheet)
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-label') !== 'Close');
    expect(rowButtons).toHaveLength(4);
    fireEvent.click(rowButtons[1]);
    expect(screen.getByTestId('event-detail')).toBeTruthy();
    // Stacked, the sheet would hold the only scroll lock and swallow the detail's wheel.
    await waitFor(() => expect(daySheet()).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'close detail' }));
    expect(screen.queryByTestId('event-detail')).toBeNull();
    await waitFor(() => expect(daySheet()).toBeTruthy());
  });
});
