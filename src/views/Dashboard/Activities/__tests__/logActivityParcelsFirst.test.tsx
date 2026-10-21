/**
 * "Log activity" asks for the parcels first, then the activity (owner decision 2026-10-21).
 *
 * A grower thinks "I sprayed these three parcels", so the sheet opens on the List | Map picker.
 * With one parcel picked every activity is offered. With several, an activity logged one parcel
 * at a time stays on the grid, greyed with its reason, and cannot be opened; one that can cover
 * several opens the form on one parcel and passes the rest as `&also=`.
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

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('react-router-dom', async () => {
  const actual: any = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});
vi.mock('store/api/activityFeedApi', () => ({
  useGetActivityFeedQuery: () => ({
    data: { activities: [], truncated: false },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn()
  })
}));
vi.mock('components/Modals/EventDetailsModal', () => ({ EventDetailsModal: () => null }));
vi.mock('store/api/historyApi', async () => ({
  ...((await vi.importActual('store/api/historyApi')) as object),
  useGetEventQuery: () => ({ data: undefined, isFetching: false, isUninitialized: true })
}));
vi.mock('store/api/productApi', () => ({
  useCreateParcelMutation: () => [vi.fn(), { isLoading: false }]
}));
// No outlines: the List is the whole picker here (the Map has its own test).
vi.mock('store/api/parcelGeometryApi', () => ({
  useGetParcelGeometryQuery: () => ({ data: undefined })
}));

import Activities from '../index';

const m = enUS as Record<string, string>;

type P = { id: number; name: string; area?: number; open_season_count?: number | null };

const NORTH: P = { id: 311, name: 'North', area: 2, open_season_count: 1 };
const SOUTH: P = { id: 312, name: 'South', area: 3, open_season_count: 1 };
const FALLOW: P = { id: 313, name: 'Fallow', area: 1, open_season_count: 0 };

function renderActivities(parcels: P[]) {
  const store = configureStore({
    reducer: {
      userState: () => ({ user: { id: 1 } }),
      company: () => ({
        currentCompany: { id: 18, establishments: [{ id: 21, name: 'Farm', parcels }] }
      })
    }
  });
  render(
    <Provider store={store}>
      <IntlProvider locale="en-US" messages={m as any}>
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
  fireEvent.click(screen.getByRole('button', { name: m['activities.log'] }));
  return screen.getByRole('dialog');
}

const tick = (sheet: HTMLElement, name: string) =>
  fireEvent.click(within(sheet).getByRole('checkbox', { name: new RegExp(name) }));
const continueButton = (sheet: HTMLElement) =>
  within(sheet).getByRole('button', { name: /^Continue/ });
const tile = (sheet: HTMLElement, verbKey: string) =>
  within(sheet).getByRole('button', { name: new RegExp(m[`activities.verb.${verbKey}`]) });

describe('Log activity: parcels first, then the activity', () => {
  beforeEach(() => mocks.navigate.mockClear());

  it('opens on the parcels, and Continue waits for at least one', () => {
    const sheet = renderActivities([NORTH, SOUTH]);
    expect(within(sheet).getByText(m['activities.pickParcels'])).toBeTruthy();
    expect(within(sheet).queryByText(m['activities.verb.harvest'])).toBeNull();
    expect(continueButton(sheet)).toBeDisabled();

    tick(sheet, 'North');
    tick(sheet, 'South');
    expect(continueButton(sheet)).toHaveTextContent('Continue with 2 parcels');
  });

  it('several parcels: a spray opens the form on one and passes the rest', () => {
    const sheet = renderActivities([NORTH, SOUTH]);
    tick(sheet, 'North');
    tick(sheet, 'South');
    fireEvent.click(continueButton(sheet));

    expect(within(sheet).getByText('On 2 parcels: North, South')).toBeTruthy();
    fireEvent.click(tile(sheet, 'input_application'));
    expect(mocks.navigate).toHaveBeenCalledWith(
      '/admin/dashboard/farm/21/parcel/311/event/add?event_type=2&verb=input_application&also=312'
    );
  });

  it('several parcels: harvest stays visible, greyed with its reason, and opens nothing', () => {
    const sheet = renderActivities([NORTH, SOUTH]);
    tick(sheet, 'North');
    tick(sheet, 'South');
    fireEvent.click(continueButton(sheet));

    const harvest = tile(sheet, 'harvest');
    expect(harvest).toHaveAttribute('aria-disabled', 'true');
    expect(harvest).toHaveTextContent(m['activities.verbOneParcelOnly']);
    fireEvent.click(harvest);
    expect(mocks.navigate).not.toHaveBeenCalled();
    // A tile that can cover several is not greyed.
    expect(tile(sheet, 'input_application')).not.toHaveAttribute('aria-disabled');
  });

  it('one parcel: every activity is offered, and no `also` is sent', () => {
    const sheet = renderActivities([NORTH, SOUTH]);
    tick(sheet, 'South');
    fireEvent.click(continueButton(sheet));

    const harvest = tile(sheet, 'harvest');
    expect(harvest).not.toHaveAttribute('aria-disabled');
    fireEvent.click(harvest);
    expect(mocks.navigate).toHaveBeenCalledWith(
      '/admin/dashboard/farm/21/parcel/312/event/add?event_type=1&verb=harvest'
    );
  });

  it('a parcel with no open production stays pickable (it can still log post-harvest work)', () => {
    const sheet = renderActivities([NORTH, FALLOW]);
    const fallow = within(sheet).getByRole('checkbox', { name: /Fallow/ });
    expect(fallow).not.toBeDisabled();
  });

  it('opens the form on a parcel that can share the record, whatever the order of picking', () => {
    const sheet = renderActivities([NORTH, FALLOW]);
    tick(sheet, 'Fallow');
    tick(sheet, 'North');
    fireEvent.click(continueButton(sheet));
    fireEvent.click(tile(sheet, 'input_application'));
    // On Fallow the form could not add parcels at all; on North it adds Fallow or names why not.
    expect(mocks.navigate).toHaveBeenCalledWith(
      '/admin/dashboard/farm/21/parcel/311/event/add?event_type=2&verb=input_application&also=313'
    );
  });

  it('Change parcels goes back with the selection kept', () => {
    const sheet = renderActivities([NORTH, SOUTH]);
    tick(sheet, 'North');
    fireEvent.click(continueButton(sheet));
    fireEvent.click(within(sheet).getByRole('button', { name: m['activities.changeParcels'] }));
    expect(within(sheet).getByRole('checkbox', { name: /North/ })).toBeChecked();
  });

  it('a farm with one parcel goes straight to the activities, as before', () => {
    const sheet = renderActivities([NORTH]);
    expect(within(sheet).getByText(m['activities.pickVerb'])).toBeTruthy();
    fireEvent.click(tile(sheet, 'harvest'));
    expect(mocks.navigate).toHaveBeenCalledWith(
      '/admin/dashboard/farm/21/parcel/311/event/add?event_type=1&verb=harvest'
    );
  });
});
