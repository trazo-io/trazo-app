/**
 * The soil and pest forms offer their choices in the grower's language (Astra activity-capture
 * audit AC-09, 2026-10-26).
 *
 * Both tabs carried ~166 hardcoded English <option>s (subtypes, units, tillage, habitat, trap
 * types, pressure levels, the fuel list). The three i18n gates read the CATALOGUES, and a string
 * that never entered one is invisible to all of them, so a fully Spanish wizard still asked
 * "Select soil management type" over "Soil Testing / Tillage / Hectares".
 *
 * This renders every subtype of both forms twice, under en-US and es-419, and compares each
 * <option> by (select, value): the Spanish text must differ from the English one. A word that is
 * the same in both languages goes on the allowlist with its reason, never the whole select.
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import baseApi from 'store/api/baseApi';
import enUS from '../../../../../../i18n/lang/en-US.json';
import esLA from '../../../../../../i18n/lang/es-419.json';

vi.mock('store/api/historyApi', () => ({
  useGetCurrentHistoryQuery: () => ({ data: undefined, isLoading: false }),
  useGetSeedSuppliersQuery: () => ({ data: undefined, isLoading: false }),
  useGetRecentInputsQuery: () => ({ data: undefined, isLoading: false }),
  useGetPlanMaterialsQuery: () => ({ data: undefined, isLoading: false })
}));
vi.mock('store/api/productApi', () => ({
  useGetParcelQuery: () => ({ data: { known_block_ids: [] }, isLoading: false })
}));

// @ts-expect-error SoilManagementTab is a .jsx module with no type declarations.
import SoilManagementTab from '../SoilManagementTab';
// @ts-expect-error PestManagementTab is a .jsx module with no type declarations.
import PestManagementTab from '../PestManagementTab';

afterEach(cleanup);

/** `select-name:value` pairs whose text is the same word in both languages. */
const SAME_IN_BOTH: Record<string, string> = {
  'sample_matrix:compost': '"Compost" is the Spanish word too',
  'production_efficiency:normal': '"Normal" is the Spanish word too',
  'area_unit:acres': '"Acres" is the Spanish plural of acre too (events.units.acres)',
  'beneficial_organic_approved:no': '"No" is the Spanish word too (app.no)'
};

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

type Tab = React.ComponentType<Record<string, unknown>>;

/** Every rendered <option>, keyed `select-name:value`. */
const optionsOf = (
  TabComponent: Tab,
  initialValues: Record<string, unknown>,
  locale: 'en' | 'es-419'
): Map<string, string> => {
  const messages = (locale === 'en' ? enUS : esLA) as Record<string, string>;
  const { container, unmount } = render(
    <Provider store={store()}>
      <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2/event/add']}>
        <Routes>
          <Route
            path="/admin/dashboard/farm/:farmId/parcel/:parcelId/event/add"
            element={
              <ChakraProvider>
                <IntlProvider locale={locale} messages={messages} onError={() => {}}>
                  <TabComponent
                    initialValues={initialValues}
                    hideActions
                    onSubmitHandler={() => {}}
                  />
                </IntlProvider>
              </ChakraProvider>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  const out = new Map<string, string>();
  container.querySelectorAll('select').forEach((select) => {
    const name = select.getAttribute('name') || '?';
    select.querySelectorAll('option').forEach((option) => {
      out.set(`${name}:${option.value}`, (option.textContent || '').trim());
    });
  });
  unmount();
  return out;
};

const compare = (TabComponent: Tab, states: Array<Record<string, unknown>>) => {
  const english = new Map<string, string>();
  const spanish = new Map<string, string>();
  for (const state of states) {
    optionsOf(TabComponent, state, 'en').forEach((v, k) => english.set(k, v));
    optionsOf(TabComponent, state, 'es-419').forEach((v, k) => spanish.set(k, v));
  }
  const untranslated: string[] = [];
  english.forEach((en, key) => {
    const es = spanish.get(key);
    if (es === undefined || !en || key in SAME_IN_BOTH) return;
    if (es === en) untranslated.push(`${key} "${en}"`);
  });
  return { english, untranslated };
};

const SOIL_STATES = ['ST', 'PA', 'CC', 'OM', 'TI', 'CO', 'GR', 'HD', 'NS', 'LA']
  .map((type) => ({ type }))
  .concat([{ type: 'GR', is_summary: 'true' } as { type: string }]);

const PEST_STATES = ['SC', 'BR', 'TM', 'PI', 'TA', 'IP', 'CU']
  .map((type) => ({ type }))
  .concat([{ type: 'SC', is_summary: 'true' } as { type: string }]);

describe('soil and pest <option>s are translated', () => {
  it('soil: no option renders its English text on a Spanish form', () => {
    const { english, untranslated } = compare(SoilManagementTab, SOIL_STATES);
    // Prove the comparison read the selects the audit named.
    for (const key of ['type:ST', 'area_unit:acres', 'fuel_type:diesel', 'tillage_type:no_till']) {
      expect(english.has(key), `${key} never rendered`).toBe(true);
    }
    for (const key of ['habitat_type:hedgerow', 'sample_matrix:water', 'animal_type:sheep']) {
      expect(english.has(key), `${key} never rendered`).toBe(true);
    }
    expect(untranslated).toEqual([]);
  });

  it('pest: no option renders its English text on a Spanish form', () => {
    const { english, untranslated } = compare(PestManagementTab, PEST_STATES);
    for (const key of [
      'area_unit:ha',
      'fuel_type:none',
      'trap_type:sticky',
      'average_pest_pressure:severe',
      'identified_by:lab'
    ]) {
      expect(english.has(key), `${key} never rendered`).toBe(true);
    }
    expect(untranslated).toEqual([]);
  });
});
