/**
 * The spray form's "Fill in from a saved applicator" (WAC 16-228-1320(1)(l), 2026-11-12).
 *
 * Picking a saved applicator COPIES four values into the record's own inputs: full name to
 * applicator_name, license number to applicator_certification, address to applicator_address and
 * phone to applicator_phone. The record carries the text and never a link to the saved row, so a
 * later edit of the saved applicator cannot rewrite it. Pairs with trazo-back
 * company/tests/test_applicators.py, which holds the server side.
 *
 * Rendered through the real ChemicalTab, with only the applicator list mocked, so the copy is
 * proven where a grower sees it and in the request the form sends.
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import enUS from '../../../i18n/lang/en-US.json';
import { baseApi } from 'store/api/baseApi';
import { useGetApplicatorsQuery } from 'store/api/applicatorApi';
import { APPLICATORS_PAGE } from '../ApplicatorPicker';
// @ts-expect-error: ChemicalTab-ENHANCED is a .jsx module with no type declarations.
import ChemicalTab from 'views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED';

vi.mock('store/api/applicatorApi', () => ({ useGetApplicatorsQuery: vi.fn() }));

const messages = enUS as unknown as Record<string, string>;

const ROSA = {
  id: 7,
  full_name: 'Rosa Delgado',
  license_number: 'WA-58213',
  license_state: 'WA',
  address: '12 Orchard Lane, Wenatchee, WA 98801',
  phone: '509-555-0142',
  is_active: true,
  created_at: '2026-11-12T10:00:00Z',
  updated_at: '2026-11-12T10:00:00Z'
};
const BETO = {
  ...ROSA,
  id: 8,
  full_name: 'Beto Ruiz',
  license_number: '',
  license_state: '',
  address: '3 River Road, Yakima, WA 98901',
  phone: '509-555-0177'
};

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

const COPIED = [
  'applicator_name',
  'applicator_certification',
  'applicator_address',
  'applicator_phone'
];

const listReturns = (data: unknown[] | undefined, extra: Record<string, unknown> = {}) =>
  vi.mocked(useGetApplicatorsQuery).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    ...extra
  } as unknown as ReturnType<typeof useGetApplicatorsQuery>);

const store = () =>
  configureStore({
    reducer: {
      company: () => ({
        currentCompany: {
          id: 1,
          establishments: [{ id: 1, name: 'Farm', state: 'WA', country: 'US' }]
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

const field = (container: HTMLElement, name: string) =>
  container.querySelector(`[name="${name}"]`) as HTMLInputElement | null;

const picker = (container: HTMLElement) =>
  container.querySelector('[data-testid="applicator-picker"]') as HTMLSelectElement | null;

/** The applicator section is on the page: proves an absence below is not an empty render. */
const sectionRendered = async (container: HTMLElement) =>
  waitFor(() => expect(field(container, 'applicator_phone')).not.toBeNull());

const values = (container: HTMLElement) =>
  Object.fromEntries(COPIED.map((name) => [name, field(container, name)!.value]));

beforeEach(() => {
  vi.mocked(useGetApplicatorsQuery).mockReset();
});
afterEach(cleanup);

describe('picking a saved applicator', () => {
  it('copies the name, license, address and phone into the record, and the request carries them', async () => {
    listReturns([ROSA, BETO]);
    const { container, ref, onSubmitHandler } = renderTab(SPRAY);
    await sectionRendered(container);
    expect(values(container)).toEqual({
      applicator_name: '',
      applicator_certification: '',
      applicator_address: '',
      applicator_phone: ''
    });

    fireEvent.change(picker(container)!, { target: { value: String(ROSA.id) } });
    await waitFor(() =>
      expect(values(container)).toEqual({
        applicator_name: ROSA.full_name,
        applicator_certification: ROSA.license_number,
        applicator_address: ROSA.address,
        applicator_phone: ROSA.phone
      })
    );

    // Still ordinary inputs: the copy can be corrected before saving.
    fireEvent.change(field(container, 'applicator_phone')!, { target: { value: '509-555-0100' } });

    await act(async () => {
      await ref.current!.submitForm().catch(() => undefined);
    });
    expect(onSubmitHandler).toHaveBeenCalledTimes(1);
    const payload = onSubmitHandler.mock.calls[0][0];
    expect(payload).toMatchObject({
      applicator_name: ROSA.full_name,
      applicator_certification: ROSA.license_number,
      applicator_address: ROSA.address,
      applicator_phone: '509-555-0100'
    });
    // Text copies only: nothing on the request points at the saved applicator.
    expect(JSON.stringify(payload)).not.toMatch(/"applicator(_id|_profile)?":/);
  });

  it('a second pick replaces all four, blanks included, so one record never mixes two people', async () => {
    listReturns([ROSA, BETO]);
    const { container } = renderTab(SPRAY);
    await sectionRendered(container);
    fireEvent.change(picker(container)!, { target: { value: String(ROSA.id) } });
    await waitFor(() => expect(field(container, 'applicator_name')!.value).toBe(ROSA.full_name));
    fireEvent.change(picker(container)!, { target: { value: String(BETO.id) } });
    await waitFor(() =>
      expect(values(container)).toEqual({
        applicator_name: BETO.full_name,
        applicator_certification: '',
        applicator_address: BETO.address,
        applicator_phone: BETO.phone
      })
    );
  });

  it('asks only for the active applicators of the current company', async () => {
    listReturns([ROSA]);
    const { container } = renderTab(SPRAY);
    await sectionRendered(container);
    expect(vi.mocked(useGetApplicatorsQuery).mock.calls[0][0]).toEqual({
      companyId: 1,
      active: true
    });
  });
});

describe('editing a record', () => {
  it('never refills it on its own: the stored values stay until someone picks', async () => {
    listReturns([ROSA]);
    const stored = {
      ...SPRAY,
      applicator_name: 'J. Smith',
      applicator_certification: 'WA-11111',
      applicator_address: '1 Old Road, Wenatchee, WA 98801',
      applicator_phone: '509-555-0111'
    };
    const { container } = renderTab(stored);
    await sectionRendered(container);
    await waitFor(() => expect(field(container, 'applicator_name')!.value).toBe('J. Smith'));
    expect(picker(container)!.value).toBe('');
    expect(values(container)).toEqual({
      applicator_name: 'J. Smith',
      applicator_certification: 'WA-11111',
      applicator_address: '1 Old Road, Wenatchee, WA 98801',
      applicator_phone: '509-555-0111'
    });
  });
});

describe('with no saved applicators', () => {
  it('shows a one-line link to the list instead of an empty select', async () => {
    listReturns([]);
    const { container } = renderTab(SPRAY);
    await sectionRendered(container);
    expect(picker(container)).toBeNull();
    const line = container.querySelector('[data-testid="applicator-picker-empty"]');
    expect(line?.textContent).toContain(messages['events.chemical.applicatorPicker.none']);
    const link = container.querySelector(
      '[data-testid="applicator-manage-link"]'
    ) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe(APPLICATORS_PAGE);
    // A new tab: the half-filled record stays where it is.
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('says nothing while the list is loading or could not be read', async () => {
    for (const state of [{ isLoading: true }, { isError: true }]) {
      listReturns(undefined, state);
      const { container } = renderTab(SPRAY);
      await sectionRendered(container);
      expect(picker(container)).toBeNull();
      expect(container.querySelector('[data-testid="applicator-picker-empty"]')).toBeNull();
      cleanup();
    }
  });
});
