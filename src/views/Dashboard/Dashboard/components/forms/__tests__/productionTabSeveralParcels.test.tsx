/**
 * The production form with several parcels (`multiTarget`).
 *
 * What differs per parcel (area, scope, section, fuel used, machine hours, irrigation depth,
 * plants, hives) is asked on each parcel's card below the form, so the form leaves those inputs
 * out: entered here they would be one value for every parcel, which the server refuses as
 * "copied". The UNITS stay, because the cards label their amounts with them and the save sends
 * them beside each amount. Summary mode is off: a summary is many applications, not one.
 *
 * Checked against the real component's markup, both ways round, so a gate that hides too much
 * (single parcel) fails as loudly as one that hides too little.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import baseApi from 'store/api/baseApi';
import enUS from '../../../../../../i18n/lang/en-US.json';
import { MULTI_PARCEL_SPEC, specRulesFor } from 'config/events/multiParcel';

vi.mock('store/api/historyApi', () => ({
  useGetCurrentHistoryQuery: () => ({ data: undefined, isLoading: false }),
  useGetSeedSuppliersQuery: () => ({ data: undefined, isLoading: false }),
  useGetRecentInputsQuery: () => ({ data: undefined, isLoading: false }),
  useGetPlanMaterialsQuery: () => ({ data: undefined, isLoading: false })
}));
vi.mock('store/api/productApi', () => ({
  useGetParcelQuery: () => ({ data: { known_block_ids: [] }, isLoading: false })
}));

// @ts-expect-error ProductionTab is a .jsx module with no type declarations.
import ProductionTab, { productionAsksPerParcel } from '../ProductionTab';

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
  type: string,
  multiTarget: boolean,
  extra: Record<string, unknown> = {},
  onSubmitHandler: (data: Record<string, unknown>) => void = () => {}
) => {
  const ref = React.createRef<{ submitForm: () => Promise<void> }>();
  const { container } = render(
    <Provider store={store()}>
      <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2/event/add']}>
        <Routes>
          <Route
            path="/admin/dashboard/farm/:farmId/parcel/:parcelId/event/add"
            element={
              <ChakraProvider>
                <IntlProvider locale="en" messages={m} onError={() => {}}>
                  <ProductionTab
                    ref={ref}
                    initialValues={{ type, ...extra }}
                    hideActions
                    hideSubtypeSelect
                    onSubmitHandler={onSubmitHandler}
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
  const text = container.textContent ?? '';
  return {
    submit: () => act(() => ref.current!.submitForm()),
    has: (name: string) => !!container.querySelector(`[name="${name}"]`),
    // Chakra number inputs render no `name`; the fuel input carries a fixed id instead.
    hasFuelAmount: () => !!container.querySelector('#production-fuel-consumed'),
    says: (key: string) => text.includes(m[key])
  };
};

describe('ProductionTab with several parcels', () => {
  it('irrigation: depth, area and hours on the cards; their units stay', () => {
    const one = mount('IR', false);
    expect(one.has('irrigation_depth')).toBe(true);
    expect(one.says('events.common.fields.areaCovered')).toBe(true);
    expect(one.says('events.common.fields.equipmentHours')).toBe(true);

    const several = mount('IR', true);
    expect(several.has('irrigation_depth')).toBe(false);
    expect(several.has('irrigation_depth_unit')).toBe(true);
    expect(several.says('events.multiParcel.depthUnitLabel')).toBe(true);
    expect(several.says('events.common.fields.areaCovered')).toBe(false);
    expect(several.has('area_unit')).toBe(true);
    expect(several.says('events.common.fields.equipmentHours')).toBe(false);
    // An electric pump (the default) asks no fuel: its energy comes from the water.
    expect(several.has('fuel_unit')).toBe(false);
    expect(productionAsksPerParcel('IR', '')).toEqual({ fuel: false, hours: true });
    // No summary toggle: a summary is many irrigations, not one on several parcels.
    expect(several.has('is_summary')).toBe(false);
  });

  it('a diesel pump: fuel used on the cards, its unit in the form', () => {
    expect(mount('IR', false, { fuel_type: 'diesel' }).hasFuelAmount()).toBe(true);
    const several = mount('IR', true, { fuel_type: 'diesel' });
    expect(several.hasFuelAmount()).toBe(false);
    expect(several.has('fuel_unit')).toBe(true);
    expect(productionAsksPerParcel('IR', 'diesel')).toEqual({ fuel: true, hours: true });
  });

  it('planting: plants and whole-or-part on the cards', () => {
    const one = mount('PL', false);
    expect(one.has('applied_scope')).toBe(true);
    expect(one.says('events.production.fields.plantsEstablished')).toBe(true);

    const several = mount('PL', true);
    expect(several.has('applied_scope')).toBe(false);
    expect(several.says('events.production.fields.plantsEstablished')).toBe(false);
    // Shared facts stay: the same stock went in on every parcel.
    expect(several.has('plant_spacing')).toBe(true);
  });

  it('pollination: hives on the cards, and no fuel or hours anywhere', () => {
    expect(productionAsksPerParcel('PO', 'diesel')).toEqual({ fuel: false, hours: false });
    expect(mount('PO', false).says('events.common.fields.equipmentHours')).toBe(false);
    expect(mount('PO', false).says('production.pollination.hiveCount')).toBe(true);
    expect(mount('PO', true).says('production.pollination.hiveCount')).toBe(false);
  });

  it('pruning: no summary section with several parcels', () => {
    expect(mount('PR', false).says('production.pruning.summaryTitle')).toBe(true);
    expect(mount('PR', true).says('production.pruning.summaryTitle')).toBe(false);
  });

  it('the save keeps the units though the amounts are on the cards', async () => {
    // Reproduced in the browser 2026-10-21: a two-parcel irrigation in cm with diesel in litres
    // saved as inches and gallons, because the form's payload gate drops a unit beside a blank
    // amount, and with several parcels the amount is always blank here.
    let sent: Record<string, unknown> = {};
    const values = { fuel_type: 'diesel', fuel_unit: 'L', irrigation_depth_unit: 'cm' };
    await mount('IR', true, values, (data) => (sent = data)).submit();
    expect(sent).toMatchObject({ fuel_unit: 'L', irrigation_depth_unit: 'cm' });

    // Any other activity: no depth anywhere, so no depth unit either (it carries a default).
    await mount('PR', true, values, (data) => (sent = data)).submit();
    expect(sent.irrigation_depth_unit).toBeUndefined();

    // One parcel, nothing entered: the gate still drops a unit with no amount.
    await mount('IR', false, values, (data) => (sent = data)).submit();
    expect(sent.fuel_unit).toBeUndefined();
    expect(sent.irrigation_depth_unit).toBeUndefined();
  });
});

describe('no shared control for a key the spec takes per parcel or refuses', () => {
  // See soilPestSeveralParcels: the body builder drops these keys from the shared body.
  for (const subtype of MULTI_PARCEL_SPEC.types['1'].subtypes ?? []) {
    it(subtype, () => {
      const { has } = mount(subtype, true);
      const offered = [...specRulesFor(1, subtype)!.hiddenKeys].filter((key) => has(key));
      expect(offered).toEqual([]);
      cleanup();
    });
  }
});
