/**
 * The soil and pest forms with several parcels (`multiTarget`).
 *
 * What differs per parcel is asked on each parcel's card below the form, so the form leaves
 * those inputs out (entered here they would be one value for every parcel, which the server
 * refuses as "copied"); the units stay, because the cards label their amounts with them.
 * Checked against the real components, both ways round.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

// @ts-expect-error SoilManagementTab is a .jsx module with no type declarations.
import SoilManagementTab from '../SoilManagementTab';
// @ts-expect-error PestManagementTab is a .jsx module with no type declarations.
import PestManagementTab from '../PestManagementTab';

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
  type: string,
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
                <IntlProvider
                  locale="en"
                  messages={enUS as Record<string, string>}
                  onError={() => {}}>
                  <Tab
                    initialValues={{ type }}
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

describe('soil with several parcels', () => {
  it('amendment: area, amount, fuel, hours on the cards; their units stay', () => {
    const one = mount(SoilManagementTab, 'PA', false);
    for (const key of ['area_covered', 'amendment_amount', 'fuel_consumed', 'equipment_hours']) {
      expect(one(key), key).toBe(true);
    }
    const several = mount(SoilManagementTab, 'PA', true);
    for (const key of ['area_covered', 'amendment_amount', 'fuel_consumed', 'equipment_hours']) {
      expect(several(key), key).toBe(false);
    }
    for (const key of ['area_unit', 'amendment_unit', 'fuel_unit']) {
      expect(several(key), key).toBe(true);
    }
  });

  it('nesting structures: the count is on the cards', () => {
    expect(mount(SoilManagementTab, 'NS', false)('habitat_structure_count')).toBe(true);
    expect(mount(SoilManagementTab, 'NS', true)('habitat_structure_count')).toBe(false);
  });
});

describe('pest with several parcels', () => {
  it('release: quantity, area, fuel, hours on the cards; the species stays shared', () => {
    const one = mount(PestManagementTab, 'BR', false);
    for (const key of ['release_quantity', 'area_covered', 'fuel_consumed', 'equipment_hours']) {
      expect(one(key), key).toBe(true);
    }
    const several = mount(PestManagementTab, 'BR', true);
    for (const key of ['release_quantity', 'area_covered', 'fuel_consumed', 'equipment_hours']) {
      expect(several(key), key).toBe(false);
    }
    expect(several('beneficial_species')).toBe(true);
    expect(several('area_unit')).toBe(true);
  });

  it('the fuel box says it is a unit, not an amount, on both forms', () => {
    // The amount is on the cards; a "Fuel Consumed" label over a unit select reads as a
    // place to type the fuel.
    for (const [Tab, type] of [
      [SoilManagementTab, 'TI'],
      [PestManagementTab, 'BR']
    ] as const) {
      mount(Tab, type, true);
      expect(screen.getAllByText('Fuel unit').length).toBeGreaterThan(0);
      expect(screen.queryByText('Fuel Consumed')).toBeNull();
      cleanup();
    }
  });
});
