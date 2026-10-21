/**
 * The general and weather forms with several parcels (`multiTarget`).
 *
 * General: one incident on several parcels shares its cause and corrective action; the area it
 * affected is asked on each parcel's card, so the form leaves that input out.
 * Weather: the conditions are shared. Damage and crop impact describe one place and have no
 * per-parcel card (the server refuses them in a multi-parcel save), so the form says to record
 * them on each parcel's own record after saving instead of offering an input that cannot save.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import baseApi from 'store/api/baseApi';
import enUS from '../../../../../../i18n/lang/en-US.json';

vi.mock('store/api/historyApi', () => ({
  useGetCurrentHistoryQuery: () => ({ data: undefined, isLoading: false }),
  useGetSeedSuppliersQuery: () => ({ data: undefined, isLoading: false }),
  useGetRecentInputsQuery: () => ({ data: undefined, isLoading: false })
}));
vi.mock('store/api/productApi', () => ({
  useGetParcelQuery: () => ({ data: { known_block_ids: [] }, isLoading: false })
}));

// @ts-expect-error GeneralTab is a .jsx module with no type declarations.
import GeneralTab from '../GeneralTab';
// @ts-expect-error WeatherTab is a .jsx module with no type declarations.
import WeatherTab from '../WeatherTab';

const m = enUS as Record<string, string>;

const store = () =>
  configureStore({
    reducer: {
      company: () => ({
        currentCompany: { id: 1, establishments: [{ id: 1, name: 'Farm', state: 'WA' }] }
      }),
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware)
  });

const mount = (
  Tab: React.ComponentType<Record<string, unknown>>,
  initialValues: Record<string, unknown>,
  multiTarget: boolean
) => {
  const { container } = render(
    <Provider store={store()}>
      <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2/event/add']}>
        <Routes>
          <Route
            path="/admin/dashboard/farm/:farmId/parcel/:parcelId/event/add"
            element={
              <ChakraProvider>
                <IntlProvider locale="en" messages={m} onError={() => {}}>
                  <Tab
                    initialValues={initialValues}
                    hideActions
                    onSubmitHandler={() => {}}
                    multiTarget={multiTarget}
                  />
                </IntlProvider>
              </ChakraProvider>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  return (name: string) => !!container.querySelector(`[name="${name}"]`);
};

describe('general with several parcels', () => {
  it('the affected area is on the cards; the cause and corrective action stay shared', () => {
    const incident = { is_contamination_incident: true, contamination_source: 'spray_drift' };
    expect(mount(GeneralTab, incident, false)('contamination_affected_area')).toBe(true);
    const several = mount(GeneralTab, incident, true);
    expect(several('contamination_affected_area')).toBe(false);
    expect(several('corrective_action_taken')).toBe(true);
  });
});

describe('weather with several parcels', () => {
  it('damage is recorded per parcel after saving, never typed once for all', () => {
    expect(mount(WeatherTab, { type: 'TS' }, false)('damage_assessment')).toBe(true);
    const several = mount(WeatherTab, { type: 'TS' }, true);
    expect(several('damage_assessment')).toBe(false);
    expect(screen.getByText(m['events.multiParcel.weatherDamageLater'])).toBeInTheDocument();
  });
});
