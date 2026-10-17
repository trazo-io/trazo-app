/**
 * A prefilled number keeps its source's unit.
 *
 * 🔴 Pilot rehearsal, 2026-10-17. The harvest was recorded as 40 BINS. The Finish production form
 * prefilled "40" from it, but its unit list had no "bins", so the unit select showed the farm's
 * default (kg) and the season was saved in a unit nobody measured. The sale seeds its unit from
 * the season, so it followed: harvest, season and sale could not share one unit, and the
 * certifier packet could not reconcile them.
 *
 * Pinned here: the form offers every unit the harvest form offers, opens on the harvest's unit,
 * and when it cannot show the source's unit it opens on NO unit rather than a different one.
 */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import theme from '../../../theme/theme';
import enMessages from '../../../i18n/lang/en-US.json';
import { baseApi } from 'store/api/baseApi';
import { computeHarvestPrefill, EVENT_UNIT_TO_FORM_UNIT } from 'utils/harvestPrefill';
import { YIELD_UNITS } from 'config/events/enums';
import * as FinishForm from '../StandardFinishProductionForm';

const { StandardFinishProductionForm } = FinishForm;

/** The finish form's unit values, read from its source (the same list the backend guard reads). */
function finishFormUnits(): string[] {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../StandardFinishProductionForm.tsx'),
    'utf8'
  );
  const start = source.indexOf('const UNIT_OPTIONS = [');
  expect(start).toBeGreaterThan(-1);
  const block = source.slice(start, source.indexOf('\n];', start));
  return [...block.matchAll(/value:\s*'([^']+)'/g)].map((m) => m[1]);
}
const FORM_UNITS = finishFormUnits();

/** Looked up, not imported by name, so a tree without it fails as an assertion. */
function initialProductionUnit(...args: Parameters<typeof FinishForm.initialProductionUnit>) {
  expect(typeof (FinishForm as Record<string, unknown>).initialProductionUnit).toBe('function');
  return FinishForm.initialProductionUnit(...args);
}
const toFormUnit = (unit: string) => EVENT_UNIT_TO_FORM_UNIT[unit] ?? unit;

/** The `<option value>`s of the harvest form's yield_unit select (ProductionTab). */
function harvestFormYieldUnits(): string[] {
  const file = path.resolve(
    __dirname,
    '../../../views/Dashboard/Dashboard/components/forms/ProductionTab.jsx'
  );
  const source = fs.readFileSync(file, 'utf8');
  const start = source.indexOf('name="yield_unit"');
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf('</StandardSelect>', start);
  return [...source.slice(start, end).matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
}

const testStore = () =>
  configureStore({
    reducer: {
      company: () => ({
        currentCompany: {
          id: 1,
          establishments: [{ id: 1, name: 'Test Farm', state: 'WA', country: 'US' }]
        }
      }),
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware)
  });

const renderForm = (initialData: Record<string, unknown>) =>
  render(
    <Provider store={testStore()}>
      <ChakraProvider theme={theme}>
        <IntlProvider locale="en-US" messages={enMessages as any} onError={() => undefined}>
          <StandardFinishProductionForm
            onSubmit={() => undefined}
            onCancel={() => undefined}
            initialData={initialData as never}
          />
        </IntlProvider>
      </ChakraProvider>
    </Provider>
  );

describe('Finish production keeps the harvest unit', () => {
  it('offers every unit the harvest form records in', () => {
    const harvestUnits = harvestFormYieldUnits();
    expect(harvestUnits).toContain('bins');
    for (const unit of harvestUnits) {
      expect(FORM_UNITS).toContain(toFormUnit(unit));
    }
  });

  it('offers every unit of the yield enum the record views read', () => {
    expect(YIELD_UNITS.map((u) => u.value)).toContain('bins');
    for (const { value } of YIELD_UNITS) {
      expect(FORM_UNITS).toContain(toFormUnit(value));
    }
  });

  it('prefills a bin harvest as bins', () => {
    const prefill = computeHarvestPrefill([
      { type: 'event.production.harvesting', yield_quantity: '40', yield_unit: 'bins' }
    ]);
    expect(prefill).toMatchObject({ production_amount: '40', production_unit: 'bins' });
    expect(initialProductionUnit(prefill, 'kg')).toBe('bins');
  });

  it('opens a prefilled amount with no unit rather than a different one', () => {
    expect(
      initialProductionUnit({ production_amount: '40', production_unit: 'pallets' }, 'kg')
    ).toBe('');
    expect(initialProductionUnit({ production_amount: '40' }, 'lb')).toBe('');
    // Nothing prefilled: the farm's default is a suggestion for a number the operator will type.
    expect(initialProductionUnit(undefined, 'lb')).toBe('lb');
  });

  it('renders the harvest unit selected, not the farm default', () => {
    renderForm({ production_amount: '40', production_unit: 'bins' });
    const select = screen.queryByDisplayValue('Bins') as HTMLSelectElement | null;
    expect(select).not.toBeNull();
    expect(select!.value).toBe('bins');
    expect(screen.queryByDisplayValue('Kilograms')).toBeNull();
  });
});
