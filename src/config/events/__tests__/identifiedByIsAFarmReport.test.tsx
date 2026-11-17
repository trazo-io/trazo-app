/**
 * Astra activity-capture follow-up, 2026-10-28 (Part B2).
 *
 * Picking "Agrónomo" on the Spanish pest form saved the value `agronomist`, and the detail and
 * the buyer preview then read it back as "Agrónomo matriculado" / "Licensed Agronomist". The form
 * offered a role; the output claimed a licence. Two label sets had drifted apart: the form's
 * `events.pest.options.identifiedBy.*` and the readback's hardcoded English map plus
 * `enums.identified_by.*`.
 *
 * Now there is ONE set (`enums.identified_by.*`), every label is the farm's own report of a role,
 * and the field is a producer and certifier field that never reaches the buyer card (Oscar's
 * decision, same day).
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import baseApi from 'store/api/baseApi';
import { getFieldsForSurface } from '../index';
import type { ResolvedFieldSet } from '../index';
import { IDENTIFIED_BY } from '../enums';
import { buyerVisibleFieldNames } from '../../../utils/buyerPageVisibility';
import {
  CERTIFIER_ONLY_EVENT_FIELDS,
  toConsumerVisibleEvent
} from '../../../utils/consumerDisplay';
import enUSJson from '../../../i18n/lang/en-US.json';
import es419Json from '../../../i18n/lang/es-419.json';

vi.mock('store/api/historyApi', () => ({
  useGetCurrentHistoryQuery: () => ({ data: undefined, isLoading: false }),
  useGetSeedSuppliersQuery: () => ({ data: undefined, isLoading: false }),
  useGetRecentInputsQuery: () => ({ data: undefined, isLoading: false }),
  useGetPlanMaterialsQuery: () => ({ data: undefined, isLoading: false })
}));
vi.mock('store/api/productApi', () => ({
  useGetParcelQuery: () => ({ data: { known_block_ids: [] }, isLoading: false })
}));

// @ts-expect-error PestManagementTab is a .jsx module with no type declarations.
import PestManagementTab from '../../../views/Dashboard/Dashboard/components/forms/PestManagementTab';

afterEach(cleanup);

const CATALOGUES = {
  'en-US': enUSJson as Record<string, string>,
  'es-419': es419Json as Record<string, string>
} as const;
type Locale = keyof typeof CATALOGUES;
const LOCALES = Object.keys(CATALOGUES) as Locale[];

/** A licence, certification or credential word, in either language. */
const CREDENTIAL_WORD =
  /licen[cs]|matricul|credential|credencial|certified|certificad|accredit|acredit|verified|verificad/i;

const translatorFor = (locale: Locale) => (id: string) => CATALOGUES[locale][id] ?? null;

const allFields = (result: ResolvedFieldSet) => [
  ...result.hero,
  ...result.immediate,
  ...result.secondary,
  ...result.details
];

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

/** The <option>s of the identified_by select on the real pest form, value -> visible text. */
const formOptions = (locale: Locale): Map<string, string> => {
  const { container, unmount } = render(
    <Provider store={store()}>
      <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2/event/add']}>
        <Routes>
          <Route
            path="/admin/dashboard/farm/:farmId/parcel/:parcelId/event/add"
            element={
              <ChakraProvider>
                <IntlProvider
                  locale={locale === 'en-US' ? 'en' : locale}
                  messages={CATALOGUES[locale]}
                  onError={() => {}}>
                  <PestManagementTab
                    initialValues={{ type: 'PI' }}
                    hideActions
                    onSubmitHandler={() => {}}
                  />
                </IntlProvider>
              </ChakraProvider>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  const out = new Map<string, string>();
  const select = container.querySelector('select[name="identified_by"]');
  expect(select, 'the identified_by select never rendered').not.toBeNull();
  select!.querySelectorAll('option').forEach((o) => {
    if (o.value) out.set(o.value, (o.textContent || '').trim());
  });
  const label = container.querySelector('label[for]')
    ? Array.from(container.querySelectorAll('label')).find((l) =>
        (l.textContent || '').includes(CATALOGUES[locale]['events.pest.fields.identifiedBy'])
      )
    : undefined;
  expect(label, 'the field label is not the shared identified_by label').toBeTruthy();
  const help = container.textContent || '';
  expect(help).toContain(CATALOGUES[locale]['events.pest.fields.identifiedByHelp']);
  unmount();
  return out;
};

const readback = (locale: Locale, value: string): string | undefined => {
  const result = getFieldsForSurface(
    'pest_management',
    'PI',
    'modal',
    { event_type: 6, pest_management_type: 'PI', identified_by: value },
    translatorFor(locale)
  );
  return allFields(result).find((f) => f.name === 'identified_by')?.formattedValue ?? undefined;
};

describe('the identifier is a farm-reported role, never a credential', () => {
  it.each(LOCALES)('%s: no readback label carries a licence or credential word', (locale) => {
    for (const option of IDENTIFIED_BY) {
      const shown = readback(locale, option.value);
      expect(shown, `${locale} ${option.value}`).toBeTruthy();
      expect(shown, `${locale} ${option.value}`).not.toMatch(CREDENTIAL_WORD);
    }
  });

  it.each(LOCALES)('%s: no form option carries a licence or credential word', (locale) => {
    const options = formOptions(locale);
    expect([...options.keys()].sort()).toEqual(IDENTIFIED_BY.map((o) => o.value).sort());
    options.forEach((text, value) => {
      expect(text, `${locale} ${value}`).not.toMatch(CREDENTIAL_WORD);
    });
  });

  it.each(LOCALES)('%s: the form and the readback print the same words', (locale) => {
    const options = formOptions(locale);
    for (const option of IDENTIFIED_BY) {
      expect(options.get(option.value), `${locale} ${option.value}`).toBe(
        readback(locale, option.value)
      );
    }
  });

  it('the readback never prints the retired English map', () => {
    // Without a translator the resolver used to fall through to a hardcoded English map that
    // said "Licensed Agronomist". Whatever it prints now, it prints no licence.
    const result = getFieldsForSurface('pest_management', 'PI', 'modal', {
      event_type: 6,
      pest_management_type: 'PI',
      identified_by: 'agronomist'
    });
    const shown = allFields(result).find((f) => f.name === 'identified_by')?.formattedValue;
    expect(shown).not.toMatch(CREDENTIAL_WORD);
  });

  it.each(LOCALES)('%s: the catalogue values for the six roles are credential-free', (locale) => {
    for (const option of IDENTIFIED_BY) {
      expect(CATALOGUES[locale][option.labelKey]).not.toMatch(CREDENTIAL_WORD);
    }
    expect(CATALOGUES[locale]['events.pest.fields.identifiedBy']).not.toMatch(CREDENTIAL_WORD);
  });

  it('the neutral wording the brief names, in both languages', () => {
    expect(CATALOGUES['en-US']['enums.identified_by.agronomist']).toBe('Agronomist');
    expect(CATALOGUES['es-419']['enums.identified_by.agronomist']).toBe('Agrónomo(a)');
    expect(CATALOGUES['en-US']['events.pest.fields.identifiedBy']).toBe(
      'Identification reported by'
    );
    expect(CATALOGUES['es-419']['events.pest.fields.identifiedBy']).toBe(
      'Identificación reportada por'
    );
    // The help says whose statement this is and that Trazo checks nothing.
    expect(CATALOGUES['en-US']['events.pest.fields.identifiedByHelp']).toMatch(
      /your statement; Trazo does not verify credentials/
    );
    expect(CATALOGUES['es-419']['events.pest.fields.identifiedByHelp']).toMatch(
      /tu declaración; Trazo no verifica sus credenciales/
    );
  });
});

describe('the identifier stays off the buyer card', () => {
  const event = {
    event_type: 6,
    pest_management_type: 'PI',
    identified_by: 'agronomist',
    identification_method: 'Visual inspection'
  };

  it('the consumer_card surface does not resolve identified_by', () => {
    const result = getFieldsForSurface(
      'pest_management',
      'PI',
      'consumer_card',
      event,
      translatorFor('en-US')
    );
    expect(allFields(result).map((f) => f.name)).not.toContain('identified_by');
  });

  it('it is in the certifier-only list, as a literal the backend parity test can parse', () => {
    expect(CERTIFIER_ONLY_EVENT_FIELDS).toContain('identified_by');
  });

  it('the producer detail does not mark it "on your buyer page"', () => {
    expect(buyerVisibleFieldNames(6, 'PI', event).has('identified_by')).toBe(false);
  });

  it('the preview strips it the way the public payload does', () => {
    const stripped = toConsumerVisibleEvent({
      ...event,
      extra_data: { identified_by: 'agronomist' }
    });
    expect(stripped).not.toHaveProperty('identified_by');
    expect((stripped.extra_data as Record<string, unknown>).identified_by).toBeUndefined();
  });

  it('the producer modal still shows it (a farm and certifier field)', () => {
    const result = getFieldsForSurface(
      'pest_management',
      'PI',
      'modal',
      event,
      translatorFor('en-US')
    );
    expect(allFields(result).map((f) => f.name)).toContain('identified_by');
  });
});
