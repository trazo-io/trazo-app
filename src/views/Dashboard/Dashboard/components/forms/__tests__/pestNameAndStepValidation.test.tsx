/**
 * Pest form: a record is named for its subtype, and a blank required field is never silent.
 *
 * Pilot rehearsal 2026-10, finding 2. Log activity > Pest & scouting > Trap Monitoring >
 * Continue: the required name was blank (this tab, unlike Production, Weather and Business, never
 * named a record), and Continue did nothing visible, because the wizard looked for the invalid
 * field before React had marked it invalid. Rendered with the real tab and real locale files.
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, act, fireEvent, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import baseApi from 'store/api/baseApi';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

vi.mock('store/api/historyApi', () => ({
  useGetCurrentHistoryQuery: () => ({ data: undefined, isLoading: false }),
  useGetSeedSuppliersQuery: () => ({ data: undefined, isLoading: false }),
  useGetRecentInputsQuery: () => ({ data: undefined, isLoading: false })
}));
vi.mock('store/api/productApi', () => ({
  useGetParcelQuery: () => ({ data: { known_block_ids: ['Block 1'] }, isLoading: false })
}));

import enUS from '../../../../../../i18n/lang/en-US.json';
import es419 from '../../../../../../i18n/lang/es-419.json';
// @ts-expect-error PestManagementTab is a .jsx module with no type declarations.
import PestManagementTab from '../PestManagementTab';
import { revealFirstFormError } from 'utils/revealFirstFormError';

type Messages = Record<string, string>;
const EN = enUS as unknown as Messages;
const ES = es419 as unknown as Messages;

const store = configureStore({
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

const tree = (
  locale: string,
  messages: Messages,
  props: Record<string, unknown>,
  ref?: React.Ref<unknown>
): React.ReactElement => (
  <Provider store={store}>
    <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2/event/add']}>
      <Routes>
        <Route
          path="/admin/dashboard/farm/:farmId/parcel/:parcelId/event/add"
          element={
            <ChakraProvider>
              <IntlProvider locale={locale} messages={messages} onError={() => {}}>
                <PestManagementTab ref={ref} hideActions onSubmitHandler={() => {}} {...props} />
              </IntlProvider>
            </ChakraProvider>
          }
        />
      </Routes>
    </MemoryRouter>
  </Provider>
);

const nameInput = (c: HTMLElement) => c.querySelector('input[name="name"]') as HTMLInputElement;
const typeSelect = (c: HTMLElement) => c.querySelector('select[name="type"]') as HTMLSelectElement;

describe('a pest record is named for its subtype', () => {
  it('switching to Trap Monitoring names the record Trap Monitoring', () => {
    const { container } = render(tree('en-US', EN, { initialValues: {}, nameOrigin: 'auto' }));
    act(() => {});
    expect(nameInput(container).value).toBe(EN['app.scouting']);
    act(() => {
      fireEvent.change(typeSelect(container), { target: { value: 'TM' } });
    });
    expect(nameInput(container).value).toBe(EN['app.trapMonitoring']);
  });

  it('names it in the operator language', () => {
    const { container } = render(
      tree('es-419', ES, { initialValues: { type: 'TM' }, nameOrigin: 'auto' })
    );
    act(() => {});
    expect(nameInput(container).value).toBe(ES['app.trapMonitoring']);
  });

  it('never overwrites a name the operator typed', () => {
    const { container } = render(
      tree('en-US', EN, { initialValues: {}, nameOrigin: 'operator', onNameEdited: () => {} })
    );
    act(() => {});
    act(() => {
      fireEvent.change(nameInput(container), { target: { value: 'Codling moth traps, block 3' } });
    });
    act(() => {
      fireEvent.change(typeSelect(container), { target: { value: 'TM' } });
    });
    expect(nameInput(container).value).toBe('Codling moth traps, block 3');
  });

  it('keeps the name of an edited or repeated record (unknown origin)', () => {
    const { container } = render(
      tree('en-US', EN, {
        initialValues: { type: 'SC', name: 'June trap check' },
        nameOrigin: 'unknown'
      })
    );
    act(() => {});
    act(() => {
      fireEvent.change(typeSelect(container), { target: { value: 'TM' } });
    });
    expect(nameInput(container).value).toBe('June trap check');
  });
});

describe('a blank required field blocks the step visibly', () => {
  it('shows the error, focuses the field and names it', async () => {
    const ref = React.createRef<{ submitForm: () => Promise<void> }>();
    const { container } = render(
      tree('en-US', EN, { initialValues: {}, nameOrigin: 'operator', onNameEdited: () => {} }, ref)
    );
    act(() => {});
    act(() => {
      fireEvent.change(nameInput(container), { target: { value: '' } });
    });

    // Exactly the wizard's sequence: the reveal runs straight from the rejected submit, with no
    // test-side act() flushing the re-render in between. That gap is the original bug: the old
    // helper queried for the invalid field before React had marked it.
    let errors: unknown = null;
    let revealed: Awaited<ReturnType<typeof revealFirstFormError>> | null = null;
    try {
      await ref.current!.submitForm();
    } catch (e) {
      errors = e;
      revealed = await revealFirstFormError(e as Record<string, unknown>);
    }
    expect(errors, 'a blank name must refuse the step').not.toBeNull();
    const input = nameInput(container);
    expect(document.activeElement, 'the blank field was not focused').toBe(input);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(revealed!.label).toBe(EN['app.eventName']);
    expect(screen.getByText('Event name is required')).toBeTruthy();
  });
});

describe('the wizard wiring', () => {
  const wizard = readFileSync(resolve(__dirname, '../NewEvent.jsx'), 'utf8');

  it('passes the name origin and the edit callback to the pest tab', () => {
    const tab = wizard.slice(wizard.indexOf('<PestManagementTab'));
    const props = tab.slice(0, tab.indexOf('/>'));
    expect(props).toMatch(/nameOrigin=\{nameOrigin\}/);
    expect(props).toMatch(/onNameEdited=\{\(\) => setNameOrigin\('operator'\)\}/);
  });

  it('Continue reveals the failing field and names it, for every tab', () => {
    const cont = wizard.slice(wizard.indexOf('await currentTabRef.current.submitForm();'));
    const handler = cont.slice(0, 1500);
    expect(handler).toMatch(/await revealFirstFormError\(errors\)/);
    expect(handler).toMatch(/events\.form\.validationFailedField/);
  });
});
