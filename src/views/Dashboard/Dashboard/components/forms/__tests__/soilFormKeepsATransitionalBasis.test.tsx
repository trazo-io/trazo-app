/**
 * The soil amendment form no longer offers "Transitional - in certification process" as an
 * organic basis, and a record that already holds it opens and saves with it untouched (M7-I1,
 * 2026-11-24). Same contract as sprayFormKeepsATransitionalBasis.test.tsx; this select is an
 * uncontrolled `register`, so it is driven through the form's own `submitForm` handle.
 */
import React, { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
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
  useGetRecentInputsQuery: () => ({ data: undefined, isLoading: false }),
  useGetPlanMaterialsForLoggingQuery: () => ({ data: undefined, isLoading: false })
}));
vi.mock('store/api/productApi', () => ({
  useGetParcelQuery: () => ({ data: { known_block_ids: [] }, isLoading: false })
}));

// @ts-expect-error SoilManagementTab is a .jsx module with no type declarations.
import SoilManagementTab from '../SoilManagementTab';

afterEach(cleanup);

const messages = enUS as Record<string, string>;

const AMENDMENT = {
  type: 'OM',
  amendment_type: 'Feather meal 12-0-0',
  amendment_amount: '500',
  amendment_amount_unit: 'lbs',
  area_covered: '2',
  area_unit: 'acres'
};

const store = () =>
  configureStore({
    reducer: {
      company: () => ({
        currentCompany: { id: 1, establishments: [{ id: 1, name: 'Farm', state: 'OR' }] }
      }),
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware)
  });

type Handle = { submitForm: () => Promise<void> };

const mount = (initialValues: Record<string, unknown>) => {
  const ref = createRef<Handle>();
  const onSubmitHandler = vi.fn();
  const utils = render(
    <Provider store={store()}>
      <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2/event/add']}>
        <Routes>
          <Route
            path="/admin/dashboard/farm/:farmId/parcel/:parcelId/event/add"
            element={
              <ChakraProvider>
                <IntlProvider locale="en" messages={messages} onError={() => {}}>
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
  return { ...utils, ref, onSubmitHandler };
};

const basisSelect = async (container: HTMLElement) => {
  await waitFor(() =>
    expect(container.querySelector('select[name="amendment_organic_approved"]')).not.toBeNull()
  );
  return container.querySelector('select[name="amendment_organic_approved"]') as HTMLSelectElement;
};

const optionValues = (select: HTMLSelectElement) => Array.from(select.options).map((o) => o.value);

describe('the soil amendment organic basis', () => {
  it('a new record is not offered "Transitional"', async () => {
    const { container } = mount({ ...AMENDMENT, amendment_organic_approved: '' });
    const select = await basisSelect(container);
    expect(optionValues(select)).toEqual(expect.arrayContaining(['omri_listed', 'not_organic']));
    expect(optionValues(select)).not.toContain('transitional');
  });

  it('a record holding it opens with it shown as retired and saves it back as it was', async () => {
    const { container, ref, onSubmitHandler } = mount({
      ...AMENDMENT,
      amendment_organic_approved: 'transitional'
    });
    const select = await basisSelect(container);
    await waitFor(() => expect(select.value).toBe('transitional'));
    const shown = select.options[select.selectedIndex].textContent ?? '';
    expect(shown).toContain(messages['events.organicApproved.transitionalOption']);
    expect(shown).toContain('retired, please choose a current basis');

    await act(async () => {
      await ref.current!.submitForm().catch(() => undefined);
    });
    expect(onSubmitHandler).toHaveBeenCalledTimes(1);
    expect(onSubmitHandler.mock.calls[0][0].amendment_organic_approved).toBe('transitional');
  });
});
