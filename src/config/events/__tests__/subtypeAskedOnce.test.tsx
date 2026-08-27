/**
 * The subtype is asked ONCE, and hiding the ask does not drop the answer.
 *
 * Until 2026-08-22 a farmer who tapped the "Harvest" tile was asked again inside the form —
 * "Production Type: Harvesting - Crop collection & transport", a select over all sixteen
 * codes, in English regardless of locale — while the page header stayed "Log activity —
 * Harvest" whatever they chose. Two controls, one fact, and the header was the one that lied.
 *
 * The create path now hides that select (`hideSubtypeSelect`). The dangerous way to implement
 * that is to stop registering the field, which would quietly strip `type` from the payload and
 * from every `.includes(data.type)` gate in onSubmit — a form that saves a Harvest as whatever
 * the serializer defaults to. So this asserts BOTH halves: the control is gone AND the value
 * still reaches the submitted data.
 *
 * Rendered, not grepped. A `hideSubtypeSelect &&` that never evaluates, or a second select
 * somewhere further down the tab, both read as fixed in the source.
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, act, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

// Same stubs, and the same reason, as newActivityFieldScope: this guard inspects the real
// component's real markup, and a full RTK Query store would test the harness instead.
vi.mock('store/api/historyApi', () => ({
  useGetCurrentHistoryQuery: () => ({ data: undefined, isLoading: false }),
  useGetSeedSuppliersQuery: () => ({ data: undefined, isLoading: false }),
  useGetRecentInputsQuery: () => ({ data: undefined, isLoading: false })
}));
vi.mock('store/api/productApi', () => ({
  useGetParcelQuery: () => ({ data: { known_block_ids: ['Block 1'] }, isLoading: false })
}));

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import ProductionTab from 'views/Dashboard/Dashboard/components/forms/ProductionTab';
import { ActivitySubtypeChooser } from 'components/Events/ActivitySubtypeChooser';
import { subtypeChoicesFor, verbForEvent, verbForKey } from '../../activityVerbs';

const testStore = () =>
  configureStore({
    reducer: {
      company: () => ({
        currentCompany: {
          id: 1,
          establishments: [{ id: 1, name: 'Test Farm', state: 'CA', country: 'US' }]
        }
      })
    }
  });

const renderTab = (props: Record<string, unknown>, locale = 'en-US') => {
  const messages = (locale === 'en-US' ? enUS : es419) as unknown as Record<string, string>;
  const result = render(
    <Provider store={testStore()}>
      <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2/event/add']}>
        <Routes>
          <Route
            path="/admin/dashboard/farm/:farmId/parcel/:parcelId/event/add"
            element={
              <ChakraProvider>
                <IntlProvider locale={locale} messages={messages} onError={() => {}}>
                  <ProductionTab hideActions onSubmitHandler={() => {}} {...props} />
                </IntlProvider>
              </ChakraProvider>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  act(() => {});
  return result;
};

const subtypeControls = (container: HTMLElement): Element[] =>
  [...container.querySelectorAll('select')].filter((el) => el.getAttribute('name') === 'type');

describe('production subtype: one ask on the create path', () => {
  it('renders no subtype control when the wizard already asked', () => {
    const { container } = renderTab({ initialValues: { type: 'HA' }, hideSubtypeSelect: true });
    expect(
      subtypeControls(container).length,
      'the verb tile answered this; a second control here is the double-ask'
    ).toBe(0);
  });

  it('still submits the subtype it was given', async () => {
    const onSubmitHandler = vi.fn();
    const { container } = renderTab({
      initialValues: { type: 'HA', date: '2026-08-22T09:00', area_covered: '5' },
      hideSubtypeSelect: true,
      onSubmitHandler
    });
    const form = container.querySelector('form');
    expect(form, 'ProductionTab renders a form').not.toBeNull();
    await act(async () => {
      fireEvent.submit(form as HTMLFormElement);
    });
    await waitFor(() => expect(onSubmitHandler).toHaveBeenCalled());
    expect(
      onSubmitHandler.mock.calls[0][0].type,
      'hiding the control must not unregister the field — the record would save with the ' +
        'serializer default instead of the activity the farmer picked'
    ).toBe('HA');
  });

  /*
   * 2026-08-27: these two used to assert the OPPOSITE — "keeps the select in edit mode, where
   * changing it is a correction". Correcting a saved subtype IS legitimate; asking for it in a
   * second place, in a second vocabulary, was not.
   *
   * With the create path converted to verbs and edit's step 0 restating the activity
   * ("Edit activity — Seed search", beside a notice that the record category is fixed), the
   * select in step 2 made one wizard contradict itself: the notice said the record type was
   * settled and a control two steps below changed it, under the header "Production type" —
   * a phrase from the backend, not from the farmer who tapped a tile. The correction moved to
   * step 0's ActivitySubtypeChooser, opt-in behind "Not Harvest? Correct the activity".
   */
  it('renders no subtype control in edit mode either — the ask moved to step 0', () => {
    const { container } = renderTab({ initialValues: { type: 'HA' }, hideSubtypeSelect: false });
    expect(
      subtypeControls(container).length,
      'ProductionTab may still honour hideSubtypeSelect={false} for a non-wizard caller, but ' +
        'NewEvent now passes it on BOTH paths — see the wizard assertion below'
    ).toBe(1);
  });

  it('the WIZARD hides it on both paths — grep the call site, not the prop default', () => {
    // The prop default is the trap: `hideSubtypeSelect = false` in ProductionTab reads like
    // "the select is normally shown", and it is — to nobody, because its only caller opts out
    // unconditionally. Asserting the default would pass while the wizard regressed.
    const src = readFileSync(
      resolve(__dirname, '../../../views/Dashboard/Dashboard/components/forms/NewEvent.jsx'),
      'utf8'
    );
    expect(src).toContain('hideSubtypeSelect');
    expect(
      /hideSubtypeSelect=\{!isEdit\}/.test(src),
      'the edit path must not re-enable ProductionTab\u2019s raw `type` select'
    ).toBe(false);
  });
});

describe('ActivitySubtypeChooser', () => {
  it('names its options from the registry, in the active locale', () => {
    const { getByText } = render(
      <ChakraProvider>
        <IntlProvider
          locale="es-419"
          messages={es419 as unknown as Record<string, string>}
          onError={() => {}}>
          <ActivitySubtypeChooser
            eventType={1}
            choices={['CU', 'TH', 'MO']}
            value="CU"
            onChange={() => {}}
          />
        </IntlProvider>
      </ChakraProvider>
    );
    expect(getByText('Cultivo')).toBeTruthy();
    expect(getByText('Raleo')).toBeTruthy();
  });

  it('marks the selected option with aria-pressed, not colour alone', () => {
    const { container } = render(
      <ChakraProvider>
        <IntlProvider
          locale="en-US"
          messages={enUS as unknown as Record<string, string>}
          onError={() => {}}>
          <ActivitySubtypeChooser
            eventType={1}
            choices={['HA', 'PH']}
            value="PH"
            onChange={() => {}}
          />
        </IntlProvider>
      </ChakraProvider>
    );
    const pressed = [...container.querySelectorAll('[aria-pressed="true"]')];
    expect(pressed.length).toBe(1);
    expect(pressed[0].textContent).toBe('Post-Harvest');
  });
});

describe('a planned practice still finds its tile', () => {
  it('resolves a family verb for a non-default subtype', () => {
    // "Log this" on a planned Transplanting or Canopy Management used to fall through to the
    // verb grid, because only a verb whose OWN subtype matched counted as a hit.
    expect(verbForEvent(1, 'TR')?.key).toBe('planting');
    expect(verbForEvent(1, 'CM')?.key).toBe('pruning');
    expect(verbForEvent(1, 'PH')?.key).toBe('harvest');
  });

  it('asks nothing more for a tile that already pinned its subtype', () => {
    expect(subtypeChoicesFor(verbForKey('irrigation'))).toEqual([]);
    expect(subtypeChoicesFor(verbForKey('pollination'))).toEqual([]);
    expect(subtypeChoicesFor(verbForKey('field_work'))).toEqual(['CU', 'TH', 'MO']);
  });
});
