/**
 * The spray form speaks California only to a California farm, and carbon to nobody's controls.
 *
 * Overall review 2026-11, OV-FJ-C13. A Washington farm's spray form read "Legal spray record"
 * with a "CA pesticide report" badge over its start and stop times, cited "3 CCR 6624(c)(2) /
 * DPR box 17" under them, told the grower that CA-registered adjuvants go on the Pesticide Use
 * Report, explained the product subtype as being "for accurate carbon emission calculations"
 * and labelled every fuel option with a kg CO₂e factor.
 *
 * The sibling guard (caPermitIsStateGated) covers the permit section. This one covers every
 * other California string on the form, for a Washington farm, an Oregon farm and a farm whose
 * state is unknown, and keeps the mirror: a California farm still reads its DPR boxes.
 *
 * Each negative assertion first proves the section that used to carry the wording rendered
 * (its start-time input is on the page), so an empty render cannot pass.
 */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import enUS from '../../../i18n/lang/en-US.json';
import { baseApi } from 'store/api/baseApi';
// @ts-expect-error ChemicalTab-ENHANCED is a .jsx module with no type declarations (same
// suppression as caPermitIsStateGated, which mounts it the same way).
import ChemicalTab from 'views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED';

afterEach(cleanup);

const messages = enUS as unknown as Record<string, string>;

const storeForState = (state: string | null) =>
  configureStore({
    reducer: {
      company: () => ({
        currentCompany: {
          id: 1,
          establishments: [{ id: 1, name: 'Test Farm', state, country: 'US' }]
        }
      }),
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware)
  });

/**
 * An insecticide spray with one tank-mix partner, so the adjuvant row (and its old "DPR box
 * 23 / 24" help) renders too. Spinosad is an everyday organic input in every state.
 */
const SPRAY = {
  type: 'PE',
  chemical_subtype: 'biological_pesticide',
  commercial_name: 'Entrust SC',
  application_method: 'air_blast',
  tank_mix_partners: [
    {
      commercial_name: 'Dyne-Amic',
      manufacturer: 'Helena',
      epa_registration_number: '',
      volume: '2',
      volume_unit: 'pt',
      organic_approved: false
    }
  ]
};

const renderSprayForm = (farmState: string | null, extra: Record<string, unknown> = {}) =>
  render(
    <Provider store={storeForState(farmState)}>
      <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2/event/add']}>
        <Routes>
          <Route
            path="/admin/dashboard/farm/:farmId/parcel/:parcelId/event/add"
            element={
              <ChakraProvider>
                <IntlProvider locale="en" messages={messages} onError={() => undefined}>
                  <ChemicalTab
                    initialValues={{ ...SPRAY, ...extra }}
                    hideActions
                    onSubmitHandler={() => undefined}
                  />
                </IntlProvider>
              </ChakraProvider>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

/** Everything a grower can read on the form: text, option labels and placeholders. */
const readable = (container: HTMLElement) =>
  [
    container.textContent ?? '',
    ...Array.from(container.querySelectorAll('[placeholder]')).map(
      (el) => el.getAttribute('placeholder') ?? ''
    )
  ].join('\n');

/** Waits until the section that carried "Legal spray record" is on the page. */
const renderedSprayRecord = async (farmState: string | null, extra?: Record<string, unknown>) => {
  const { container } = renderSprayForm(farmState, extra);
  await waitFor(() => {
    expect(container.querySelector('[name="commercial_name"]')).not.toBeNull();
    expect(container.querySelector('[name="application_start"]')).not.toBeNull();
    expect(container.querySelector('[name="tank_mix_partners.0.commercial_name"]')).not.toBeNull();
  });
  return container;
};

/** California-only wording: headings, badges, citations, report names and a CA-shaped example. */
const CALIFORNIA_WORDING: RegExp[] = [
  /Legal spray record/i,
  /CA pesticide report/i,
  /\bDPR\b/,
  /3 CCR/,
  /\bPUR\b/,
  /Pesticide Use Report/i,
  /California/,
  /CA-registered/,
  /CA-12345/
];

/** Carbon hints on the controls of a grower's record. */
const CARBON_ON_CONTROLS: RegExp[] = [
  /kg CO₂e/,
  /CO2e/,
  /carbon emission/i,
  /emission factor/i,
  /Carbon Calculation/i
];

describe.each([
  ['a Washington farm', 'WA'],
  ['an Oregon farm', 'OR'],
  ['a farm whose state is unknown', null]
])('the spray form for %s', (_label, farmState) => {
  it('carries no California heading, badge, citation or example', async () => {
    const text = readable(await renderedSprayRecord(farmState));
    const hits = CALIFORNIA_WORDING.filter((re) => re.test(text)).map(String);
    expect(hits, 'California wording on a form that is not a California farm').toEqual([]);
  });

  it('names the same fields in neutral words', async () => {
    const text = readable(await renderedSprayRecord(farmState));
    expect(text).toContain('Application times and other details');
    expect(text).toContain('Date and time the application started');
    expect(text).toContain('Date and time the application finished');
  });

  it('hides the California PUR identifiers when the record holds none', async () => {
    const container = await renderedSprayRecord(farmState);
    expect(container.querySelector('[name="operator_id"]')).toBeNull();
    expect(container.querySelector('[name="site_id"]')).toBeNull();
  });

  it('still shows California PUR identifiers already stored on the record', async () => {
    // Hiding is display only: a value the grower cannot see is one they cannot check or clear.
    const container = await renderedSprayRecord(farmState, { operator_id: '37-1234' });
    const operatorId = container.querySelector('[name="operator_id"]') as HTMLInputElement | null;
    expect(operatorId, 'stored Operator ID hidden from the grower').not.toBeNull();
    expect(operatorId?.value).toBe('37-1234');
  });
});

describe('the spray form for a California farm', () => {
  it('still names the California report, its citations and DPR boxes', async () => {
    // The mirror. Without it, deleting the California wording everywhere would also pass.
    const text = readable(await renderedSprayRecord('CA'));
    expect(text).toContain('Legal spray record');
    expect(text).toContain('CA pesticide report');
    expect(text).toContain('3 CCR 6624(c)(2) / DPR box 17');
    expect(text).toContain('California Pesticide Use Report (PUR)');
    expect(text).toContain('3 CCR 6626(b)');
    expect(text).toContain('DPR box 23');
    expect(text).not.toContain('Application times and other details');
  });
});

describe.each([['WA'], ['CA']])('carbon wording on the controls (%s)', (farmState) => {
  it('is gone from the subtype help and the fuel options', async () => {
    const container = await renderedSprayRecord(farmState);
    const fuel = container.querySelector(
      'select[name="application_fuel_type"]'
    ) as HTMLSelectElement | null;
    expect(fuel, 'the fuel select did not render').not.toBeNull();
    // The options rendered (so the carbon check below read them), whatever their suffix.
    const fuelOptions = Array.from(fuel!.options).map((o) => o.textContent ?? '');
    expect(fuelOptions.some((o) => o.startsWith('Diesel'))).toBe(true);

    const text = readable(container);
    expect(text).toContain('Pick the kind of product the label describes');
    const hits = CARBON_ON_CONTROLS.filter((re) => re.test(text)).map(String);
    expect(hits, 'carbon hints on the controls of the grower record').toEqual([]);
  });
});

describe.each([
  ['FE', 'nitrogen_total_kg'],
  ['FU', 'active_ingredient_total_kg'],
  ['PE', 'active_ingredient_total_kg']
])('carbon wording in summary mode (%s)', (type, totalField) => {
  it('is gone from the totals, the fuel options and the panel', async () => {
    // Summary mode had its own "Carbon Calculation Method" box with formulas and kg CO₂e
    // factors, its own fuel select with factors, and "(for Carbon Calculation)" headings.
    const { container } = renderSprayForm('WA', {
      type,
      chemical_subtype: '',
      tank_mix_partners: [],
      is_summary: 'true'
    });
    await waitFor(() => {
      expect(container.querySelector(`[name="${totalField}"]`)).not.toBeNull();
      expect(container.querySelector('select[name="application_fuel_type"]')).not.toBeNull();
    });
    const text = readable(container);
    const hits = CARBON_ON_CONTROLS.filter((re) => re.test(text)).map(String);
    expect(hits, 'carbon hints in the summary-mode panel').toEqual([]);
    // Word-bounded: the fungicide subtype "Potassium Bicarbonate" is a product, not a hint.
    expect(text).not.toMatch(/\bcarbon\b/i);
  });
});
