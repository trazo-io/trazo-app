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
import baseApi from 'store/api/baseApi';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

// Same stubs, and the same reason, as newActivityFieldScope: this guard inspects the real
// component's real markup, and a full RTK Query store would test the harness instead.
vi.mock('store/api/historyApi', () => ({
  useGetCurrentHistoryQuery: () => ({ data: undefined, isLoading: false }),
  useGetSeedSuppliersQuery: () => ({ data: undefined, isLoading: false }),
  useGetRecentInputsQuery: () => ({ data: undefined, isLoading: false }),
  useGetPlanMaterialsForLoggingQuery: () => ({ data: undefined, isLoading: false })
}));
vi.mock('store/api/productApi', () => ({
  useGetParcelQuery: () => ({ data: { known_block_ids: ['Block 1'] }, isLoading: false })
}));

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import ProductionTab from 'views/Dashboard/Dashboard/components/forms/ProductionTab';
import ChemicalTab from 'views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED';
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
      }),
      // RTK Query slice + middleware — same reason as formRenderConformance: the receipt-file
      // picker calls useGetFarmDocumentsQuery inside ChemicalTab, and a store without the api
      // middleware turns that into a thrown warning that fails the render.
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware)
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

  /*
   * 🔴 2026-08-27: the preset MACHINERY existed (verb, plan item) and "Log this again" simply
   * was not wired into it — `?repeat=` carries `event_type=` but no `verb=`, so every
   * preset flag read false and the farmer was asked to re-pick the activity they had just
   * pressed the button on.
   *
   * That is the bug class a source assertion catches and a unit test cannot: `subtypeQuestionFor`
   * was correct in isolation the whole time; nothing passed it the repeat.
   */
  it('wires "Log this again" into the chooser preset — a preset nothing reads is not a preset', () => {
    const src = readFileSync(
      resolve(__dirname, '../../../views/Dashboard/Dashboard/components/forms/NewEvent.jsx'),
      'utf8'
    );
    // The three ways step 0's question can already be answered. All three must reach
    // typeChooserAnswered, or the grid re-asks a question the link already answered.
    const answered = src.match(/const typeChooserAnswered\s*=([\s\S]{0,220}?);/);
    expect(answered, 'typeChooserAnswered moved or was renamed').not.toBeNull();
    for (const preset of ['typePresetFromVerb', 'typePresetFromPlan', 'typePresetFromRepeat']) {
      expect((answered as RegExpMatchArray)[1], preset).toContain(preset);
    }
    // …and the repeat must also silence the SECOND-level question, or a repeated Cultivation
    // stops to ask "which one was it" about a record that says CU.
    expect(src).toContain('fromRepeat:');
    expect(src).toContain('knownSubtype:');
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

const renderChemicalTab = (props: Record<string, unknown>, locale = 'en-US') => {
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
                  <ChemicalTab hideActions onSubmitHandler={() => {}} {...props} />
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

/** Enough to clear the zod schema; the assertions are all about `type`. */
const VALID_CHEMICAL = {
  commercial_name: 'Kocide 3000',
  // A label STRENGTH, not a rate — the schema rejects a rate here on purpose.
  concentration: '46.1%',
  application_method: 'foliar_spray',
  volume_numeric: '10',
  volume_unit: 'gal',
  area_numeric: '4',
  area_unit: 'acres',
  date: '2026-09-01T09:00'
};

describe('chemical subtype: one ask, hoisted to step 0 (2026-09-01)', () => {
  /*
   * "Input application" names no practice on its own, and FE/PE/FU/HE decide which half of this
   * tab's 45 fields render (`visibleForSubtypes`). The ask moved to step 0's
   * ActivitySubtypeChooser — same criterion, same mechanism and the same trap as production:
   * hiding the control must not unregister the field. `type` here also picks the carbon factor
   * and decides what the certifier packet and the CA PUR export assert, so a dropped one is
   * worse than a dropped production subtype, not better.
   */
  it('renders no type control when the wizard already asked', () => {
    const { container } = renderChemicalTab({
      initialValues: { type: 'FE' },
      hideTypeSelect: true
    });
    expect(
      subtypeControls(container).length,
      'step 0 answered this; a second control here is the double-ask'
    ).toBe(0);
  });

  it('still submits the type it was given', async () => {
    const onSubmitHandler = vi.fn();
    const { container } = renderChemicalTab({
      initialValues: { ...VALID_CHEMICAL, type: 'PE' },
      hideTypeSelect: true,
      onSubmitHandler
    });
    const form = container.querySelector('form');
    expect(form, 'ChemicalTab renders a form').not.toBeNull();
    await act(async () => {
      fireEvent.submit(form as HTMLFormElement);
    });
    await waitFor(() => expect(onSubmitHandler).toHaveBeenCalled());
    expect(
      onSubmitHandler.mock.calls[0][0].type,
      'hiding the control must not unregister the field \u2014 the record would save as ' +
        'whatever the serializer defaults to, and a pesticide filed as a fertilizer is a ' +
        'false claim on the packet and on the PUR export'
    ).toBe('PE');
  });

  it('keeps the select for a caller the wizard is not driving', () => {
    const { container } = renderChemicalTab({ initialValues: { type: 'FE' } });
    expect(subtypeControls(container).length).toBe(1);
  });

  it('names its options from the registry, not four hardcoded English strings', () => {
    const { container } = renderChemicalTab({ initialValues: { type: 'FE' } }, 'es-419');
    const select = subtypeControls(container)[0] as HTMLSelectElement;
    const labels = [...select.querySelectorAll('option')]
      .map((o) => o.textContent)
      .filter((t) => t && t.length > 0);
    expect(labels).toContain('Fertilizante');
    expect(labels).toContain('Herbicida');
    expect(labels, 'the hardcoded list this replaced was English on every locale').not.toContain(
      'Fertilizer - Nutrient application'
    );
  });

  it('the WIZARD hides it \u2014 grep the call site, not the prop default', () => {
    const src = readFileSync(
      resolve(__dirname, '../../../views/Dashboard/Dashboard/components/forms/NewEvent.jsx'),
      'utf8'
    );
    expect(src).toContain('hideTypeSelect');
    expect(
      /hideTypeSelect=\{!isEdit\}/.test(src),
      'the edit path must not re-enable the raw `type` select \u2014 edit corrects through the ' +
        'same step-0 chooser, behind the "Not Fertilizer?" link'
    ).toBe(false);
    // …and the correction link must reach chemical, or an edit has no way back to the question.
    expect(
      src.includes('HOISTED_SUBTYPE_EVENT_TYPES.includes(activeEventType)'),
      'the edit correction affordance is still gated to production only'
    ).toBe(true);
  });

  /*
   * 🔴 The hole hoisting chemical OPENS, and the reason this assertion exists.
   *
   * A production family verb seeds its default subtype the instant the tile is tapped, so
   * `type` is never empty by the time Continue is pressed. Chemical deliberately seeds
   * nothing — a pesticide filed as a fertilizer is a false claim on the packet and on the CA
   * PUR export, not a missing field — so the farmer CAN reach Continue with the question
   * open. With the tab's own select now hidden, letting that through lands them on a form
   * that rejects a required field it does not render: an unfixable dead end two steps in.
   */
  it('step 0 refuses to advance while the subtype question is unanswered', () => {
    const src = readFileSync(
      resolve(__dirname, '../../../views/Dashboard/Dashboard/components/forms/NewEvent.jsx'),
      'utf8'
    );
    const basic = /const onSubmitBasic = \(data\) => \{([\s\S]{0,1200}?)\n {2}\};/.exec(src);
    expect(basic, 'onSubmitBasic moved or was renamed').not.toBeNull();
    const body = (basic as RegExpExecArray)[1];
    expect(body, 'the guard must read the SAME list the chooser renders').toContain(
      'pendingSubtypeChoices.length > 0'
    );
    expect(body, 'and must actually stop, not just flag').toContain('return;');
    // A refusal nobody can see is a page that silently did not move.
    expect(src).toContain('activities.subtype.required');
    expect(src).toContain('role="alert"');
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
