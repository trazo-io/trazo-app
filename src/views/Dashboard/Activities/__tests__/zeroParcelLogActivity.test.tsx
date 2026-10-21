/**
 * "Log activity" on a farm with no block must not end in an empty sheet.
 *
 * Reproduced 2026-10-19 on a virgin Starter account, signed up through the real form: Activities,
 * "Log activity", "Input application", and the "Which parcel?" sheet opened with a heading, a close
 * button and nothing else. That is where someone who came to log a spray goes first, and it is the
 * state the first inbound grower was in (a farm, zero parcels) when they left.
 *
 * The sheet now names the farm, says it has no block, and opens the two-field quick-add. The
 * server's refusal of an event without a parcel is unchanged; this only makes the next step
 * visible. Since 2026-10-21 the sheet asks for the parcels BEFORE the activity, so this is the
 * first thing "Log activity" shows on such a farm, one tap earlier than before.
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
import es419 from '../../../../i18n/lang/es-419.json';

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
// The detail modal is never opened here; stub only what renders, keep the rest real.
vi.mock('components/Modals/EventDetailsModal', () => ({ EventDetailsModal: () => null }));
vi.mock('store/api/historyApi', async () => ({
  ...((await vi.importActual('store/api/historyApi')) as object),
  useGetEventQuery: () => ({ data: undefined, isFetching: false, isUninitialized: true })
}));
vi.mock('store/api/parcelGeometryApi', () => ({
  useGetParcelGeometryQuery: () => ({ data: undefined })
}));
vi.mock('store/api/productApi', () => ({
  useCreateParcelMutation: () => [vi.fn(), { isLoading: false }]
}));

import Activities from '../index';

function renderActivities(parcels: Array<{ id: number; name: string }>, locale = 'en-US') {
  const store = configureStore({
    reducer: {
      userState: () => ({ user: { id: 1 } }),
      company: () => ({
        currentCompany: { id: 18, establishments: [{ id: 21, name: '1060', parcels }] }
      })
    }
  });
  return render(
    <Provider store={store}>
      <IntlProvider locale={locale} messages={(locale === 'en-US' ? enUS : es419) as any}>
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

/** Log activity: the sheet opens on the parcels. */
function openLogActivity(messages: Record<string, string> = enUS as any) {
  fireEvent.click(screen.getByRole('button', { name: messages['activities.log'] }));
  return screen.getByRole('dialog');
}

describe('Log activity on a farm with no block', () => {
  beforeEach(() => mocks.navigate.mockClear());

  it('names the farm and says it has no block, instead of an empty "Which parcel?" sheet', () => {
    renderActivities([]);
    const sheet = openLogActivity();
    expect(within(sheet).getByText(enUS['activities.pickParcels'])).toBeTruthy();
    expect(within(sheet).getByText('1060 has no parcels yet')).toBeTruthy();
  });

  it('opens the quick-add from the sheet, so the next step is one tap', () => {
    renderActivities([]);
    const sheet = openLogActivity();
    fireEvent.click(within(sheet).getByRole('button', { name: enUS['parcel.addABlock'] }));
    // The mechanism, not the words: the two-field quick-add dialog is what opens, not a route.
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(enUS['parcel.quickAdd.title'])).toBeTruthy();
    expect(
      within(dialog).getByRole('button', { name: enUS['parcel.quickAdd.create'] })
    ).toBeTruthy();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("speaks the reader's language in es-419", () => {
    renderActivities([], 'es-419');
    const sheet = openLogActivity(es419 as any);
    expect(within(sheet).getByText('1060 todavía no tiene parcelas')).toBeTruthy();
    expect(within(sheet).getByRole('button', { name: es419['parcel.addABlock'] })).toBeTruthy();
  });

  it('keeps the parcel choice when the farm has blocks', () => {
    // The new branch must not swallow the ordinary case.
    renderActivities([
      { id: 311, name: 'Block A' },
      { id: 312, name: 'Block B' }
    ]);
    const sheet = openLogActivity();
    expect(within(sheet).getByRole('checkbox', { name: /Block A/ })).toBeTruthy();
    expect(within(sheet).queryByText(/has no parcels yet/)).toBeNull();
  });
});
