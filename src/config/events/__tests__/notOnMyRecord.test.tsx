/**
 * A spray can say "Not on my record" for its concentration and its clock time (OV-FJ-C12).
 *
 * Pilot rehearsal 2026-10-01, findings 3 and 8: a grower typing a paper spray log into the wizard
 * had a day and a product, often no concentration and no clock time, and the form required both.
 * The only way through was to look up a label or invent a value, and an invented value prints
 * into the certifier packet as if it had been observed.
 *
 * Pinned here: the concentration box clears and disables on the tick and the required check is
 * satisfied; the tick reaches the request as a real bool beside an empty value; the time tick
 * sends the day at the noon placeholder and refuses a CA start/end time beside it; the wizard
 * offers the time tick on input applications only; the copy exists in both catalogues. The
 * server half is trazo-back history/tests/test_spray_not_on_source_record.py.
 */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import { baseApi } from 'store/api/baseApi';
// @ts-expect-error: ChemicalTab-ENHANCED is a .jsx module with no type declarations.
import * as chemicalTabModule from 'views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED';
import { dayWithoutTime, requiredFieldsForSave, withTimeNotRecorded } from '../saveRequiredFields';

const ChemicalTab = chemicalTabModule.default;
const { buildChemicalSchema } = chemicalTabModule;
const messages = enUS as unknown as Record<string, string>;
const FORMS = path.resolve(__dirname, '../../../views/Dashboard/Dashboard/components/forms');
const NEW_EVENT = fs.readFileSync(path.join(FORMS, 'NewEvent.jsx'), 'utf8');
const EM_DASH = '—';

const intl = { formatMessage: ({ id }: { id: string }) => id };

const SPRAY = {
  type: 'FU',
  commercial_name: 'Kocide 3000-O',
  volume_numeric: '8',
  volume_unit: 'lbs',
  area_numeric: '4',
  area_unit: 'acres',
  application_method: 'ground_spray',
  concentration: ''
};

const concentrationIssues = (data: Record<string, string>): string[] => {
  const result = buildChemicalSchema(intl).safeParse(data);
  if (result.success) return [];
  return result.error.issues
    .filter((issue: { path: (string | number)[] }) => issue.path[0] === 'concentration')
    .map((issue: { message: string }) => issue.message);
};

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

const renderTab = (initialValues: Record<string, unknown>, onSubmitHandler = vi.fn()) => {
  const ref = React.createRef<{ submitForm: () => Promise<void> }>();
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

const concentrationInput = (container: HTMLElement) =>
  container.querySelector('input[name="concentration"]') as HTMLInputElement;

describe('"Not on my record" on the concentration', () => {
  it('ticking clears and disables the box; unticking gives it back', async () => {
    const { container } = renderTab({ ...SPRAY, concentration: '46.1%' });
    await waitFor(() => expect(concentrationInput(container)?.value).toBe('46.1%'));

    fireEvent.click(screen.getByText(messages['events.chemical.concentration.notOnMyRecord']));
    await waitFor(() => expect(concentrationInput(container).value).toBe(''));
    expect(concentrationInput(container).disabled).toBe(true);

    fireEvent.click(screen.getByText(messages['events.chemical.concentration.notOnMyRecord']));
    await waitFor(() => expect(concentrationInput(container).disabled).toBe(false));
  });

  it('the tick satisfies the required check, and the request carries it as a bool with no value', async () => {
    const { ref, onSubmitHandler } = renderTab(SPRAY);
    await waitFor(() =>
      expect(screen.getByText(messages['events.chemical.concentration.notOnMyRecord'])).toBeTruthy()
    );
    fireEvent.click(screen.getByText(messages['events.chemical.concentration.notOnMyRecord']));
    await act(async () => {
      await ref.current!.submitForm();
    });
    expect(onSubmitHandler).toHaveBeenCalledTimes(1);
    const payload = onSubmitHandler.mock.calls[0][0];
    expect(payload.concentration_not_recorded).toBe(true);
    // An empty string, never null: the payload builder drops nulls, which would leave an edited
    // record's old value beside the tick.
    expect(payload.concentration).toBe('');
  });

  it('without the tick the form still asks for the concentration', async () => {
    const { ref, onSubmitHandler } = renderTab(SPRAY);
    await waitFor(() =>
      expect(screen.getByText(messages['events.chemical.concentration.notOnMyRecord'])).toBeTruthy()
    );
    await act(async () => {
      await ref.current!.submitForm().catch(() => undefined);
    });
    expect(onSubmitHandler).not.toHaveBeenCalled();
  });

  it('the schema: the tick alone passes, the tick beside a value is refused, neither keeps the error', () => {
    expect(concentrationIssues({ ...SPRAY, concentration_not_recorded: 'true' })).toEqual([]);
    expect(
      concentrationIssues({ ...SPRAY, concentration_not_recorded: 'true', concentration: '46.1%' })
    ).toEqual(['events.chemical.validation.concentrationOrNotOnRecord']);
    expect(concentrationIssues({ ...SPRAY, concentration_not_recorded: 'false' })).toEqual([
      'events.chemical.validation.concentrationRequired'
    ]);
  });

  it("the wizard's save gate agrees", () => {
    expect(requiredFieldsForSave(2, { ...SPRAY, concentration_not_recorded: true })).not.toContain(
      'concentration'
    );
    expect(requiredFieldsForSave(2, SPRAY)).toContain('concentration');
  });
});

describe('"The time is not on my record" on the wizard date', () => {
  it('sends the day at the noon placeholder and the mark as a real bool', () => {
    expect(withTimeNotRecorded({ date: '2026-04-20T09:30', time_not_recorded: true })).toEqual({
      data: { date: '2026-04-20T12:00', time_not_recorded: true },
      conflict: false
    });
    // A day-only value (the date input) gets the same placeholder.
    expect(dayWithoutTime('2026-04-20')).toBe('2026-04-20T12:00');
    expect(dayWithoutTime('')).toBe('');
  });

  it('unticked, the clock is left alone and the mark is sent as false so an edit clears it', () => {
    expect(withTimeNotRecorded({ date: '2026-04-20T09:30' })).toEqual({
      data: { date: '2026-04-20T09:30', time_not_recorded: false },
      conflict: false
    });
  });

  it('a CA start or completion time beside the tick is a conflict', () => {
    expect(
      withTimeNotRecorded({
        date: '2026-04-20',
        time_not_recorded: 'true',
        application_start: '2026-04-20T06:15'
      }).conflict
    ).toBe(true);
  });

  it('is offered on input applications only, clears and disables the time, and is saved', () => {
    // The tick renders only for an input application (the mark is a ChemicalEvent column).
    expect(NEW_EVENT).toMatch(
      /activeEventType === 2 && \(isEdit \|\| typeChooserAnswered\) && \(\s*<Checkbox\s+\/\/[^\n]*\n\s*id="time-not-recorded"/
    );
    // Ticked: a day input and a cleared, disabled time input.
    const flagged = NEW_EVENT.slice(
      NEW_EVENT.indexOf('{step0TimeNotRecorded ? ('),
      NEW_EVENT.indexOf('type="datetime-local"', NEW_EVENT.indexOf('{step0TimeNotRecorded ? ('))
    );
    expect(flagged).toContain('type="date"');
    expect(flagged).toMatch(/type="time"[\s\S]*value=""[\s\S]*isDisabled/);
    // Saved through the shared helper; any other record type drops the key.
    expect(NEW_EVENT).toContain('withTimeNotRecorded(processedEventFormData)');
    expect(NEW_EVENT).toContain('delete processedEventFormData.time_not_recorded;');
  });
});

describe('the copy', () => {
  const KEYS = [
    'events.chemical.concentration.notOnMyRecord',
    'events.chemical.concentration.notOnMyRecordHelp',
    'events.chemical.validation.concentrationOrNotOnRecord',
    'events.chemical.fields.concentrationNotRecorded',
    'events.chemical.fields.timeNotRecorded',
    'events.wizard.timeNotOnMyRecord',
    'events.wizard.timeNotOnMyRecordHelp',
    'events.wizard.timeInput',
    'events.wizard.timeNotRecordedStartEnd',
    'events.time.notOnSourceRecord',
    'events.time.notOnSourceRecordShort',
    'app.pur.flag.time_not_on_source_record'
  ];

  it('every key is in both catalogues, with no em dash', () => {
    const en = enUS as Record<string, string>;
    const es = es419 as Record<string, string>;
    for (const key of KEYS) {
      expect(en[key], key).toBeTruthy();
      expect(es[key], key).toBeTruthy();
      expect(en[key], key).not.toContain(EM_DASH);
      expect(es[key], key).not.toContain(EM_DASH);
    }
  });

  it("the PUR preview labels the server's new flag code instead of printing it raw", () => {
    const modal = fs.readFileSync(
      path.resolve(__dirname, '../../../components/PURExport/PURExportModal.tsx'),
      'utf8'
    );
    expect(modal).toContain("time_not_on_source_record: 'app.pur.flag.time_not_on_source_record'");
  });

  it('the Spanish says "No consta en mi registro" and addresses the grower as tú', () => {
    const es = es419 as Record<string, string>;
    expect(es['events.chemical.concentration.notOnMyRecord']).toBe('No consta en mi registro');
    for (const key of KEYS) {
      expect(es[key], key).not.toMatch(/\b(su|sus|usted)\b/i);
      expect(es[key], key).not.toMatch(/granja/i);
    }
  });
});
