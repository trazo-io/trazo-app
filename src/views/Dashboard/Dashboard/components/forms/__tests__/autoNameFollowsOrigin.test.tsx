/**
 * The record name follows WHO wrote it, not what it says (Run 8b R4, 2026-10-15).
 *
 * ProductionTab used to decide whether a name was its own by comparing the text with every
 * default label in the CURRENT language. Two failures followed:
 *   - an English auto-name ("Equipment cleanout") became "typed by the operator" after a switch
 *     to Spanish, so the name froze in English on a Spanish form;
 *   - a name the operator typed that happened to equal some default ("Harvesting") was treated
 *     as an auto-name and overwritten on the next remount or locale switch.
 *
 * The wizard now records the origin ('auto' | 'operator' | 'unknown') and the tab regenerates
 * only while it is 'auto'. Rendered, with a real locale switch, because the bug lived in an
 * effect that runs on `intl` changes.
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, act, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import baseApi from 'store/api/baseApi';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

// Same stubs as certifierOnlyNoteAudience: the guard inspects the real component's markup.
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
// @ts-expect-error ProductionTab is a .jsx module with no type declarations.
import ProductionTab from '../ProductionTab';

type Messages = Record<string, string>;
const EN = enUS as unknown as Messages;
const ES = es419 as unknown as Messages;

const store = configureStore({
  reducer: {
    company: () => ({
      currentCompany: {
        id: 1,
        establishments: [{ id: 1, name: 'Test Farm', state: 'CA', country: 'US' }]
      }
    }),
    [baseApi.reducerPath]: baseApi.reducer
  },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware)
});

const tree = (
  locale: string,
  messages: Messages,
  props: Record<string, unknown>
): React.ReactElement => (
  <Provider store={store}>
    <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2/event/add']}>
      <Routes>
        <Route
          path="/admin/dashboard/farm/:farmId/parcel/:parcelId/event/add"
          element={
            <ChakraProvider>
              <IntlProvider locale={locale} messages={messages} onError={() => {}}>
                <ProductionTab
                  hideActions
                  hideSubtypeSelect
                  onSubmitHandler={() => {}}
                  {...props}
                />
              </IntlProvider>
            </ChakraProvider>
          }
        />
      </Routes>
    </MemoryRouter>
  </Provider>
);

const nameInput = (container: HTMLElement) =>
  container.querySelector('input[name="name"]') as HTMLInputElement;

const CLEANOUT = { type: 'EM', equipment_operation_type: 'CL' };

describe('auto-name while the operator has not touched it', () => {
  it('follows a locale switch (English cleanout name becomes the Spanish one)', () => {
    const props = { initialValues: { ...CLEANOUT }, nameOrigin: 'auto' };
    const { container, rerender } = render(tree('en-US', EN, props));
    act(() => {});
    expect(nameInput(container).value).toBe(EN['activities.verb.cleanout']);

    rerender(tree('es-419', ES, props));
    act(() => {});
    expect(
      nameInput(container).value,
      'an untouched auto-name froze in English after the switch to Spanish'
    ).toBe(ES['activities.verb.cleanout']);

    rerender(tree('en-US', EN, props));
    act(() => {});
    expect(nameInput(container).value).toBe(EN['activities.verb.cleanout']);
  });
});

describe('a name the operator typed is theirs', () => {
  it('typing reports the edit to the wizard', () => {
    const onNameEdited = vi.fn();
    const { container } = render(
      tree('en-US', EN, { initialValues: { ...CLEANOUT }, nameOrigin: 'auto', onNameEdited })
    );
    act(() => {});
    fireEvent.change(nameInput(container), { target: { value: 'Bin trailer rinse' } });
    expect(onNameEdited).toHaveBeenCalled();
    expect(nameInput(container).value).toBe('Bin trailer rinse');
  });

  it('a typed name equal to a default survives a remount (template) and a locale switch', () => {
    // "Harvesting" is ProductionTab's own default for HA. Typed by the operator on a cleanout
    // record, it is a name, not an auto-name. A template remounts the tab with the form values.
    const props = {
      initialValues: { ...CLEANOUT, name: 'Harvesting' },
      nameOrigin: 'operator'
    };
    const { container, rerender } = render(tree('en-US', EN, props));
    act(() => {});
    expect(nameInput(container).value, 'overwritten on remount').toBe('Harvesting');

    rerender(tree('es-419', ES, props));
    act(() => {});
    expect(nameInput(container).value, 'overwritten on locale switch').toBe('Harvesting');
  });

  it('an operator name equal to the current default survives the switch too', () => {
    const props = {
      initialValues: { ...CLEANOUT, name: EN['activities.verb.cleanout'] },
      nameOrigin: 'operator'
    };
    const { container, rerender } = render(tree('en-US', EN, props));
    act(() => {});
    rerender(tree('es-419', ES, props));
    act(() => {});
    expect(nameInput(container).value).toBe(EN['activities.verb.cleanout']);
  });

  it('an unknown origin (edit, repeat, restored draft) preserves the name', () => {
    const props = { initialValues: { ...CLEANOUT, name: 'Harvesting' }, nameOrigin: 'unknown' };
    const { container, rerender } = render(tree('en-US', EN, props));
    act(() => {});
    rerender(tree('es-419', ES, props));
    act(() => {});
    expect(nameInput(container).value).toBe('Harvesting');
  });
});

describe('the wizard records the origin', () => {
  const wizard = readFileSync(resolve(__dirname, '../NewEvent.jsx'), 'utf8');

  it('starts auto on create and unknown on edit or repeat', () => {
    expect(wizard).toMatch(/useState\(isEdit \|\| isRepeat \? 'unknown' : 'auto'\)/);
  });

  it('marks a restored draft unknown', () => {
    const restore = wizard.slice(wizard.indexOf('const handleRestoreDraft'));
    expect(restore.slice(0, 600)).toMatch(/setNameOrigin\('unknown'\)/);
  });

  it('passes the origin and the edit callback to ProductionTab', () => {
    const tab = wizard.slice(wizard.indexOf('<ProductionTab'));
    const props = tab.slice(0, tab.indexOf('/>'));
    expect(props).toMatch(/nameOrigin=\{nameOrigin\}/);
    expect(props).toMatch(/onNameEdited=\{\(\) => setNameOrigin\('operator'\)\}/);
  });
});
