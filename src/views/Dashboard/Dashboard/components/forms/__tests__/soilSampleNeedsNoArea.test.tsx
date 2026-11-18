/**
 * A lab sample or a soil test is recorded without an area (Astra activity-capture audit AC-08,
 * 2026-10-26).
 *
 * The auditor logged an irrigation-water sample (lab analysis, boron 0.2 ppm) and could not
 * continue until "Area Covered" was above 0, so a fictional one-acre scope went on the record.
 * A sample has a lab, a sample ID and results, not acreage. These tests drive the real form
 * through its `submitForm` handle, both ways round: LA and ST save with no area and get no
 * default one, and tillage still requires it.
 */
import React, { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import baseApi from 'store/api/baseApi';
import enUS from '../../../../../../i18n/lang/en-US.json';
import esLAForSchema from '../../../../../../i18n/lang/es-419.json';

vi.mock('store/api/historyApi', () => ({
  useGetCurrentHistoryQuery: () => ({ data: undefined, isLoading: false }),
  useGetSeedSuppliersQuery: () => ({ data: undefined, isLoading: false }),
  useGetRecentInputsQuery: () => ({ data: undefined, isLoading: false }),
  useGetPlanMaterialsForLoggingQuery: () => ({ data: undefined, isLoading: false })
}));
vi.mock('store/api/productApi', () => ({
  useGetParcelQuery: () => ({ data: { known_block_ids: [] }, isLoading: false })
}));

// @ts-expect-error SoilManagementTab is a .jsx module with no type declarations.
import SoilManagementTab, {
  SOIL_AREA_OPTIONAL_SUBTYPES,
  buildSoilSchema
} from '../SoilManagementTab';

afterEach(cleanup);

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

type Handle = { submitForm: () => Promise<void> };

const mount = (initialValues: Record<string, unknown>) => {
  const ref = createRef<Handle>();
  const onSubmitHandler = vi.fn();
  render(
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
                  <SoilManagementTab
                    ref={ref}
                    initialValues={initialValues}
                    hideActions
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
  return { ref, onSubmitHandler };
};

type Outcome = { ok: true } | { ok: false; errors: Record<string, unknown> };

const submit = async (ref: React.RefObject<Handle>): Promise<Outcome> => {
  let outcome = { ok: true } as Outcome;
  await act(async () => {
    try {
      await ref.current!.submitForm();
    } catch (errors) {
      outcome = { ok: false, errors: errors as Record<string, unknown> };
    }
  });
  return outcome;
};

describe('a sample record needs no area', () => {
  it('lab analysis and soil test are area-optional subtypes', () => {
    expect(SOIL_AREA_OPTIONAL_SUBTYPES).toEqual(expect.arrayContaining(['LA', 'ST']));
  });

  it('an irrigation-water lab analysis saves with no area, and none is invented', async () => {
    const { ref, onSubmitHandler } = mount({
      type: 'LA',
      sample_matrix: 'water',
      lab_name: 'ASTRA Lab',
      lab_sample_id: 'W-001',
      lab_boron_ppm: '0.2'
    });
    const outcome = await submit(ref);
    expect(outcome).toEqual({ ok: true });
    expect(onSubmitHandler).toHaveBeenCalledTimes(1);
    const payload = onSubmitHandler.mock.calls[0][0];
    expect(payload.type).toBe('LA');
    expect(['', null, undefined]).toContain(payload.area_covered);
  });

  it('a soil test saves with no area, and none is invented', async () => {
    const { ref, onSubmitHandler } = mount({ type: 'ST' });
    const outcome = await submit(ref);
    expect(outcome).toEqual({ ok: true });
    const payload = onSubmitHandler.mock.calls[0][0];
    expect(['', null, undefined]).toContain(payload.area_covered);
  });

  it('a typed area on a sample must still be a real area', async () => {
    const { ref, onSubmitHandler } = mount({
      type: 'LA',
      sample_matrix: 'water',
      area_covered: '0'
    });
    const outcome = await submit(ref);
    expect(outcome.ok).toBe(false);
    expect(onSubmitHandler).not.toHaveBeenCalled();
  });

  it('tillage still requires an area (the negative case reads the same gate)', async () => {
    const { ref, onSubmitHandler } = mount({ type: 'TI' });
    const outcome = await submit(ref);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.errors).toHaveProperty('area_covered');
    expect(onSubmitHandler).not.toHaveBeenCalled();
  });
});

describe('soil area errors speak the form language (review on #211)', () => {
  it('a zero area on a sample is refused in Spanish under es-419', () => {
    const es = esLAForSchema as Record<string, string>;
    const intl = { formatMessage: ({ id }: { id: string }) => es[id] ?? id };
    const result = buildSoilSchema(false, intl).safeParse({
      type: 'LA',
      area_covered: '0',
      sample_matrix: 'water'
    });
    expect(result.success).toBe(false);
    const messages = result.success
      ? []
      : result.error.issues.map((i: { message: string }) => i.message);
    expect(messages).toContain(es['events.chemical.validation.areaPositive']);
    expect(messages).not.toContain('Area must be greater than 0');
  });
});
