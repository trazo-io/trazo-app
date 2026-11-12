/**
 * The spray form asks the state application facts a Washington record holds (OV-FJ-C11).
 *
 * WAC 16-228-1320(1) asks every person applying pesticides to more than one acre of
 * agricultural land for, among others: (e) the wind direction and speed in mph and the
 * temperature in degrees Fahrenheit, (h) the carrier volume, (k) the apparatus license plate,
 * (l) the applicator's address and phone and (n) a commercial firm's address. The form had a
 * five-option weather select and nothing else. Pairs with trazo-back
 * history/tests/test_spray_state_application_fields.py, which holds the server side.
 *
 * Each "is not on the page" assertion first proves the section rendered, so an empty render
 * cannot pass.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import { baseApi } from 'store/api/baseApi';
import { CERTIFIER_ONLY_EVENT_FIELDS, toConsumerVisibleEvent } from 'utils/consumerDisplay';
import { feetToMetres, metresToFeet } from 'utils/bufferZoneFeet';
import { chemicalEventRegistry } from '../chemicalEvent';
import { CARRIER_VOLUME_UNITS, WIND_FROM_OPTIONS } from '../enums';
import { specRulesFor } from '../multiParcel';
// @ts-expect-error: ChemicalTab-ENHANCED is a .jsx module with no type declarations.
import ChemicalTab from 'views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED';

afterEach(cleanup);

const messages = enUS as unknown as Record<string, string>;

const NEW_FIELDS = [
  'wind_from',
  'wind_speed_mph',
  'air_temperature_f',
  'carrier_volume',
  'carrier_volume_unit',
  'apparatus_license_plate',
  'applicator_address',
  'applicator_phone',
  'commercial_firm_address'
];

const SPRAY = {
  type: 'PE',
  commercial_name: 'Entrust SC',
  concentration: '22.5%',
  volume_numeric: '24',
  volume_unit: 'fl_oz',
  area_numeric: '4',
  area_unit: 'acres',
  application_method: 'air_blast'
};

const store = (state: string | null) =>
  configureStore({
    reducer: {
      company: () => ({
        currentCompany: {
          id: 1,
          establishments: [{ id: 1, name: 'Farm', state, country: state ? 'US' : null }]
        }
      }),
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware)
  });

const renderTab = (
  initialValues: Record<string, unknown>,
  { state = 'WA', multiTarget = false }: { state?: string | null; multiTarget?: boolean } = {}
) => {
  const ref = React.createRef<{ submitForm: () => Promise<void> }>();
  const onSubmitHandler = vi.fn();
  const utils = render(
    <Provider store={store(state)}>
      <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2/event/add']}>
        <Routes>
          <Route
            path="/admin/dashboard/farm/:farmId/parcel/:parcelId/event/add"
            element={
              <ChakraProvider>
                <IntlProvider locale="en" messages={messages} onError={() => undefined}>
                  <ChemicalTab
                    ref={ref}
                    initialValues={initialValues}
                    hideActions
                    hideTypeSelect
                    multiTarget={multiTarget}
                    onSubmitHandler={onSubmitHandler}
                  />
                </IntlProvider>
              </ChakraProvider>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  return { ...utils, ref, onSubmitHandler };
};

const input = (container: HTMLElement, name: string) =>
  container.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null;

const type = (container: HTMLElement, name: string, value: string) =>
  fireEvent.change(input(container, name)!, { target: { value } });

const sectionRendered = async (container: HTMLElement) =>
  waitFor(() => {
    expect(container.querySelector('[data-testid="spray-conditions"]')).not.toBeNull();
    expect(input(container, 'application_start')).not.toBeNull();
  });

const submit = async (ref: React.RefObject<{ submitForm: () => Promise<void> }>) => {
  await act(async () => {
    await ref.current!.submitForm().catch(() => undefined);
  });
};

describe('the new inputs render and save', () => {
  it.each([['WA'], ['OR'], ['CA'], [null]])(
    'every state (%s) is asked the wind, temperature, carrier, plate and applicator contact',
    async (state) => {
      const { container } = renderTab(SPRAY, { state });
      await sectionRendered(container);
      for (const name of [
        'wind_from',
        'wind_speed_mph',
        'air_temperature_f',
        'carrier_volume',
        'carrier_volume_unit',
        'apparatus_license_plate',
        'applicator_address',
        'applicator_phone'
      ]) {
        expect(input(container, name), name).not.toBeNull();
      }
      // Units ride in the labels.
      expect(container.textContent).toContain('Wind speed (mph)');
      expect(container.textContent).toContain('Air temperature (°F)');
    }
  );

  it('the firm address is asked only for an application made by a business', async () => {
    const own = renderTab(SPRAY);
    await sectionRendered(own.container);
    expect(input(own.container, 'commercial_firm_address')).toBeNull();
    cleanup();
    const hired = renderTab({ ...SPRAY, applied_by_pcb: true, pcb_name: 'Valley Ag Spray' });
    await sectionRendered(hired.container);
    expect(input(hired.container, 'commercial_firm_address')).not.toBeNull();
  });

  it('what the grower types is what the request carries', async () => {
    const { container, ref, onSubmitHandler } = renderTab({
      ...SPRAY,
      applied_by_pcb: true,
      pcb_name: 'Valley Ag Spray'
    });
    await sectionRendered(container);
    type(container, 'wind_from', 'NW');
    type(container, 'wind_speed_mph', '4');
    type(container, 'air_temperature_f', '62');
    type(container, 'carrier_volume', '100');
    type(container, 'carrier_volume_unit', 'gal_per_acre');
    type(container, 'apparatus_license_plate', 'C12345X');
    type(container, 'applicator_address', '12 Orchard Lane, Wenatchee, WA 98801');
    type(container, 'applicator_phone', '509-555-0142');
    type(container, 'commercial_firm_address', '400 Valley Road, Yakima, WA 98901');
    await submit(ref);
    expect(onSubmitHandler).toHaveBeenCalledTimes(1);
    expect(onSubmitHandler.mock.calls[0][0]).toMatchObject({
      wind_from: 'NW',
      wind_speed_mph: '4',
      air_temperature_f: '62',
      carrier_volume: '100',
      carrier_volume_unit: 'gal_per_acre',
      apparatus_license_plate: 'C12345X',
      applicator_address: '12 Orchard Lane, Wenatchee, WA 98801',
      applicator_phone: '509-555-0142',
      commercial_firm_address: '400 Valley Road, Yakima, WA 98901'
    });
  });

  it('an edit opens with the stored values in the inputs', async () => {
    const { container } = renderTab({
      ...SPRAY,
      wind_from: 'SW',
      wind_speed_mph: 3.5,
      air_temperature_f: 0,
      carrier_volume: '935.00',
      carrier_volume_unit: 'l_per_ha',
      applicator_phone: '541-555-0110'
    });
    await sectionRendered(container);
    await waitFor(() => expect(input(container, 'wind_from')!.value).toBe('SW'));
    expect(input(container, 'wind_speed_mph')!.value).toBe('3.5');
    // Zero degrees is a reading, not a blank.
    expect(input(container, 'air_temperature_f')!.value).toBe('0');
    expect(input(container, 'carrier_volume_unit')!.value).toBe('l_per_ha');
    expect(input(container, 'applicator_phone')!.value).toBe('541-555-0110');
  });

  it('a carrier volume without its unit is refused before the request', async () => {
    const { container, ref, onSubmitHandler } = renderTab(SPRAY);
    await sectionRendered(container);
    type(container, 'carrier_volume', '100');
    await submit(ref);
    expect(onSubmitHandler).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(container.textContent).toContain(
        messages['events.chemical.validation.carrierUnitRequired']
      )
    );
  });

  it('a unit with no volume is dropped, never sent alone', async () => {
    const { container, ref, onSubmitHandler } = renderTab(SPRAY);
    await sectionRendered(container);
    type(container, 'carrier_volume_unit', 'gal_per_acre');
    await submit(ref);
    expect(onSubmitHandler).toHaveBeenCalledTimes(1);
    const payload = onSubmitHandler.mock.calls[0][0];
    expect(payload.carrier_volume).toBe('');
    expect(payload.carrier_volume_unit).toBe('');
  });

  it('an out-of-range reading is refused with its own message', async () => {
    const { container, ref, onSubmitHandler } = renderTab(SPRAY);
    await sectionRendered(container);
    type(container, 'wind_speed_mph', '151');
    type(container, 'air_temperature_f', '-41');
    await submit(ref);
    expect(onSubmitHandler).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(container.textContent).toContain(
        messages['events.chemical.validation.windSpeedRange']
      );
      expect(container.textContent).toContain(
        messages['events.chemical.validation.airTemperatureRange']
      );
    });
  });
});

describe('wind and temperature are not asked for a drip or subsurface application', () => {
  it('a subsurface application hides the two readings and says why', async () => {
    const { container } = renderTab({
      ...SPRAY,
      type: 'FE',
      concentration: '4-1-1',
      application_method: 'subsurface'
    });
    await sectionRendered(container);
    expect(
      container.querySelector('[data-testid="spray-conditions-not-applicable"]')
    ).not.toBeNull();
    expect(container.textContent).toContain(messages['events.chemical.conditions.notApplicable']);
    expect(input(container, 'wind_from')).toBeNull();
    expect(input(container, 'air_temperature_f')).toBeNull();
    // The rest of the block still asks its questions.
    expect(input(container, 'carrier_volume')).not.toBeNull();
  });

  it('a spray method asks them, with no not-applicable line', async () => {
    const { container } = renderTab(SPRAY);
    await sectionRendered(container);
    expect(container.querySelector('[data-testid="spray-conditions-not-applicable"]')).toBeNull();
    expect(input(container, 'wind_from')).not.toBeNull();
  });

  it('a stored reading on an exempt method stays on screen, so nothing typed is hidden', async () => {
    const { container } = renderTab({
      ...SPRAY,
      type: 'FE',
      concentration: '4-1-1',
      application_method: 'drip',
      wind_from: 'calm'
    });
    await sectionRendered(container);
    expect(
      container.querySelector('[data-testid="spray-conditions-not-applicable"]')
    ).not.toBeNull();
    await waitFor(() => expect(input(container, 'wind_from')!.value).toBe('calm'));
  });
});

describe('buffer zone in feet for a US farm, metres in the record', () => {
  it('converts both ways, whole feet reading back as typed', () => {
    expect(feetToMetres('50')).toBe('15.2');
    expect(metresToFeet('15.2')).toBe('50');
    for (const feet of ['1', '10', '33', '100', '250']) {
      expect(metresToFeet(feetToMetres(feet))).toBe(feet);
    }
    expect(feetToMetres('')).toBe('');
    expect(metresToFeet(null)).toBe('');
  });

  it('an untouched record keeps its stored metres to the decimal', async () => {
    const { container, ref, onSubmitHandler } = renderTab({ ...SPRAY, buffer_zone_meters: 15.0 });
    await sectionRendered(container);
    await waitFor(() => expect(input(container, 'buffer_zone_feet')!.value).toBe('49'));
    expect(container.textContent).toContain('Buffer Zone (feet)');
    await submit(ref);
    const payload = onSubmitHandler.mock.calls[0][0];
    expect(payload.buffer_zone_meters).toBe('15');
    expect(payload.buffer_zone_feet).toBeUndefined();
  });

  it('typed feet are sent as metres', async () => {
    const { container, ref, onSubmitHandler } = renderTab(SPRAY);
    await sectionRendered(container);
    type(container, 'buffer_zone_feet', '100');
    await submit(ref);
    expect(onSubmitHandler.mock.calls[0][0].buffer_zone_meters).toBe('30.5');
  });

  it('a farm with no US state keeps the metres input', async () => {
    const { container } = renderTab({ ...SPRAY, buffer_zone_meters: 15.0 }, { state: null });
    await sectionRendered(container);
    expect(input(container, 'buffer_zone_feet')).toBeNull();
    await waitFor(() => expect(input(container, 'buffer_zone_meters')!.value).toBe('15'));
  });
});

describe('one tank on several parcels', () => {
  it('the form does not offer a tank total, which the server refuses on several parcels', async () => {
    expect(specRulesFor(2, null)!.refusedValues.carrier_volume_unit.has('gal_total')).toBe(true);
    const { container } = renderTab(SPRAY, { multiTarget: true });
    await sectionRendered(container);
    const values = Array.from(
      (input(container, 'carrier_volume_unit') as HTMLSelectElement).options
    ).map((o) => o.value);
    expect(values).toEqual(['', 'gal_per_acre', 'l_per_ha']);
  });

  it('every new field is a shared fact (not per parcel, not refused)', () => {
    const rules = specRulesFor(2, 'PE')!;
    for (const name of NEW_FIELDS) {
      expect(rules.perTargetKeys.has(name), name).toBe(false);
      expect(rules.refusedKeys.has(name), name).toBe(false);
    }
  });
});

describe('"Log again" on a spray', () => {
  it('starts the wind and temperature blank: an old reading is not a new observation', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../views/Dashboard/Dashboard/components/forms/NewEvent.jsx'),
      'utf8'
    );
    const repeatBlock = source.slice(
      source.indexOf('// Repeat mode copies VALUES'),
      source.indexOf('date: eventDate,', source.indexOf('// Repeat mode copies VALUES'))
    );
    expect(repeatBlock.length).toBeGreaterThan(0);
    expect(repeatBlock).toMatch(
      /isRepeat \? \{ wind_from: '', wind_speed_mph: '', air_temperature_f: '' \}/
    );
  });
});

describe('display registry, buyer page and catalogues', () => {
  it('every new field is declared for the producer and kept off consumer surfaces', () => {
    const byName = Object.fromEntries(chemicalEventRegistry.fields.map((f) => [f.name, f]));
    for (const name of NEW_FIELDS.filter((n) => n !== 'carrier_volume_unit')) {
      const field = byName[name];
      expect(field, name).toBeDefined();
      expect(field.surfaces.modal, name).toBeDefined();
      expect(field.surfaces.form, name).toBeDefined();
      expect((field.surfaces as Record<string, unknown>).consumer_card, name).toBeUndefined();
      expect((field.surfaces as Record<string, unknown>).preview, name).toBeUndefined();
    }
  });

  it("the producer's buyer-page preview strips every new field", () => {
    const event = Object.fromEntries(NEW_FIELDS.map((name) => [name, 'present']));
    const stripped = toConsumerVisibleEvent({ ...event, description: 'kept' });
    for (const name of NEW_FIELDS) {
      expect(CERTIFIER_ONLY_EVENT_FIELDS).toContain(name);
      expect(stripped).not.toHaveProperty(name);
    }
  });

  it('every option label exists in both languages', () => {
    for (const option of [...WIND_FROM_OPTIONS, ...CARRIER_VOLUME_UNITS]) {
      expect((enUS as Record<string, string>)[option.labelKey], option.labelKey).toBeDefined();
      expect((es419 as Record<string, string>)[option.labelKey], option.labelKey).toBeDefined();
    }
  });
});
