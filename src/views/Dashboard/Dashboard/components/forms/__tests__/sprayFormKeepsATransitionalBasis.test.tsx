/**
 * The spray form no longer offers "Transitional - in certification process" as an organic basis,
 * and a record that already holds it opens and saves with it untouched (M7-I1, 2026-11-24).
 *
 * The option named the FARM's status, not the input's, and stored it is a prohibited-substance
 * answer: one pick restarted a certified parcel's 36-month clock. The API now refuses it on a new
 * write. A <select> bound to a value with no matching <option> shows the placeholder and the next
 * save writes '', so a record already holding it must still show it (as retired) and send it back
 * as it was, which the API accepts. Pairs with trazo-back product/tests/test_transition_status.py.
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import enUS from '../../../../../../i18n/lang/en-US.json';
import { baseApi } from 'store/api/baseApi';
// @ts-expect-error: ChemicalTab-ENHANCED is a .jsx module with no type declarations.
import ChemicalTab from '../ChemicalTab-ENHANCED';

afterEach(cleanup);

const messages = enUS as unknown as Record<string, string>;

const SPRAY = {
  type: 'FE',
  commercial_name: "Neptune's Harvest Organic Fish Fertilizer 2-4-1",
  concentration: '2-4-1',
  volume_numeric: '5',
  volume_unit: 'gal',
  area_numeric: '4',
  area_unit: 'acres',
  application_method: 'fertigation'
};

const store = () =>
  configureStore({
    reducer: {
      company: () => ({
        currentCompany: {
          id: 1,
          establishments: [{ id: 1, name: 'Farm', state: 'OR', country: 'US' }]
        }
      }),
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware)
  });

const renderTab = (initialValues: Record<string, unknown>) => {
  const ref = React.createRef<{ submitForm: () => Promise<void> }>();
  const onSubmitHandler = vi.fn();
  const utils = render(
    <Provider store={store()}>
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
    expect(container.querySelector('select[name="organic_approved"]')).not.toBeNull()
  );
  return container.querySelector('select[name="organic_approved"]') as HTMLSelectElement;
};

const optionValues = (select: HTMLSelectElement) => Array.from(select.options).map((o) => o.value);

describe('the spray form organic basis', () => {
  it('a new record is not offered "Transitional"', async () => {
    const { container } = renderTab({ ...SPRAY, organic_approved: '' });
    const select = await basisSelect(container);
    // Proves the list rendered before the negative assertion.
    expect(optionValues(select)).toEqual(expect.arrayContaining(['omri_listed', 'not_organic']));
    expect(optionValues(select)).not.toContain('transitional');
    expect(select.textContent).not.toContain(messages['events.organicApproved.transitionalOption']);
  });

  it('a record holding it opens with it shown as retired, never the placeholder', async () => {
    const { container } = renderTab({ ...SPRAY, organic_approved: 'transitional' });
    const select = await basisSelect(container);
    await waitFor(() => expect(select.value).toBe('transitional'));
    const shown = select.options[select.selectedIndex].textContent ?? '';
    expect(shown).toContain(messages['events.organicApproved.transitionalOption']);
    expect(shown).toContain('retired, please choose a current basis');
  });

  it('saving that record without touching the basis sends it back as it was', async () => {
    const { container, ref, onSubmitHandler } = renderTab({
      ...SPRAY,
      organic_approved: 'transitional'
    });
    await basisSelect(container);
    await act(async () => {
      await ref.current!.submitForm().catch(() => undefined);
    });
    expect(onSubmitHandler).toHaveBeenCalledTimes(1);
    expect(onSubmitHandler.mock.calls[0][0].organic_approved).toBe('transitional');
  });
});
