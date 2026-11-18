/**
 * A plan-materials chip on the input form (review of app #419, 2026-11-17).
 *
 * Pinned: a chip's new name keeps no old listing's claim (the organic basis an OMRI attach gave is taken back,
 * through the same path that gave it); the next chip replaces the maker the last one wrote; a chip with no maker
 * takes back the one a chip wrote, and leaves one the grower typed.
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import enUS from '../../../../../../i18n/lang/en-US.json';
import { baseApi } from 'store/api/baseApi';

vi.mock('store/api/historyApi', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useGetPlanMaterialsForLoggingQuery: () => ({
    data: {
      osp_id: 11,
      osp_status: 'active',
      materials: [
        {
          name: 'Kocide 3000-O',
          manufacturer: 'Certis',
          category: '',
          status: 'in_use',
          source: 'OMRI'
        },
        {
          name: 'Entrust SC',
          manufacturer: 'Corteva',
          category: '',
          status: 'in_use',
          source: 'OMRI'
        },
        {
          name: 'Neem Concentrate',
          manufacturer: '',
          category: '',
          status: 'planned',
          source: 'Operator'
        }
      ]
    }
  })
}));

const { default: ChemicalTab } = await import('../ChemicalTab-ENHANCED');

afterEach(cleanup);

const messages = enUS as unknown as Record<string, string>;

const store = () =>
  configureStore({
    reducer: {
      company: () => ({
        currentCompany: {
          id: 1,
          establishments: [{ id: 1, name: 'Test Orchard', state: 'WA', country: 'US' }]
        }
      }),
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware)
  });

const mount = (initial: Record<string, unknown>) =>
  render(
    <Provider store={store()}>
      <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2/event/add']}>
        <Routes>
          <Route
            path="/admin/dashboard/farm/:farmId/parcel/:parcelId/event/add"
            element={
              <ChakraProvider>
                <IntlProvider locale="en" messages={messages} onError={() => undefined}>
                  <ChemicalTab
                    initialValues={{ type: 'PE', application_method: 'air_blast', ...initial }}
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

const field = (container: HTMLElement, name: string) =>
  container.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null;

const tap = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('a plan-materials chip on the input form', () => {
  it('takes back the listing basis an attach gave when the name changes', () => {
    const { container } = mount({
      commercial_name: 'Grandevo',
      omri_product: 5,
      organic_approved: 'omri_listed'
    });
    expect(field(container, 'organic_approved')?.value).toBe('omri_listed');
    tap('Kocide 3000-O');
    expect(field(container, 'commercial_name')?.value).toBe('Kocide 3000-O');
    expect(field(container, 'organic_approved')?.value).toBe('');
  });

  it('replaces the maker the last chip wrote, and takes it back for a chip with none', () => {
    const { container } = mount({ commercial_name: '' });
    tap('Kocide 3000-O');
    expect(field(container, 'manufacturer')?.value).toBe('Certis');
    tap('Entrust SC');
    expect(field(container, 'manufacturer')?.value).toBe('Corteva');
    tap('Neem Concentrate');
    expect(field(container, 'manufacturer')?.value).toBe('');
  });

  it('leaves a maker the grower typed when the chip names none', () => {
    const { container } = mount({ commercial_name: '', manufacturer: 'Dyna-Gro' });
    tap('Neem Concentrate');
    expect(field(container, 'manufacturer')?.value).toBe('Dyna-Gro');
  });
});
