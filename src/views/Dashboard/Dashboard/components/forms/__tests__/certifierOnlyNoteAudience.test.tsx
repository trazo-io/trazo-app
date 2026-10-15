/**
 * The notes box tells the truth about who reads it (Run 8b, finding 8b-04).
 *
 * Buffer use (BU), seed search (SS), equipment cleanout (EM) and transport (TP) are withheld
 * WHOLE from every public serializer (trazo-back claim_authority
 * `_CONSUMER_WITHHELD_PRODUCTION_SUBTYPES`, mirrored in utils/consumerDisplay.ts). Their
 * `observation` reaches no buyer page. The form's certifier-only notice already said so, but the
 * notes section below it still read "Certifier record + buyer page", "Public note" and "This box
 * is shown on your buyer page". Two statements on one screen, one of them false.
 *
 * Rendered, not grepped: the badge, label, helper and placeholder are chosen at render time
 * from the selected subtype, so only the markup shows which variant a farmer sees.
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import baseApi from 'store/api/baseApi';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

// Same stubs as subtypeAskedOnce: the guard inspects the real component's markup.
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
import { CONSUMER_WITHHELD_PRODUCTION_SUBTYPES } from 'utils/consumerDisplay';

type Messages = Record<string, string>;

const testStore = () =>
  configureStore({
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

const renderTab = (type: string, messages: Messages, locale: string) => {
  const result = render(
    <Provider store={testStore()}>
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
                    initialValues={{ type }}
                  />
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

const notesBox = (container: HTMLElement) =>
  container.querySelector('textarea[name="observation"]') as HTMLTextAreaElement | null;

// The field-notes section itself: the nearest ancestor of the notes box that carries either
// section title (public or certifier-only). Assertions are scoped to it because the
// certifier-only notice at the top of the form shares words with the new badge in Spanish
// ("Registro solo para el certificador").
const NOTES_HEADINGS = ['events.section.fieldNotes', 'events.section.fieldNotesCertifierOnly'];
const notesSection = (container: HTMLElement, m: Messages): string => {
  let node: HTMLElement | null = notesBox(container);
  while (node && !NOTES_HEADINGS.some((k) => (node?.textContent ?? '').includes(m[k]))) {
    node = node.parentElement;
  }
  expect(node, 'field-notes section found').not.toBeNull();
  return node?.textContent ?? '';
};

const LOCALES: Array<[string, Messages]> = [
  ['en-US', enUS as unknown as Messages],
  ['es-419', es419 as unknown as Messages]
];

// Read from the mirror, so a subtype added to the withheld set is covered without editing this.
const WITHHELD = Object.keys(CONSUMER_WITHHELD_PRODUCTION_SUBTYPES);

describe('withheld production subtypes: the notes box never promises the buyer page', () => {
  it('covers the four subtypes the backend withholds', () => {
    expect([...WITHHELD].sort()).toEqual(['BU', 'EM', 'SS', 'TP']);
  });

  for (const [locale, m] of LOCALES) {
    for (const code of WITHHELD) {
      it(`${code} (${locale}) renders the certifier-only notes variant`, () => {
        const { container } = renderTab(code, m, locale);
        const whole = container.textContent ?? '';
        expect(notesBox(container), 'the notes box still renders').not.toBeNull();
        const text = notesSection(container, m);

        expect(whole, 'public-note helper anywhere on the form').not.toContain(
          m['events.common.help.observationAudience']
        );
        expect(whole, 'buyer-page badge anywhere on the form').not.toContain(
          m['events.section.badge.certifierRecordAndBuyer']
        );
        expect(text, 'public-note helper on a withheld record').not.toContain(
          m['events.common.help.observationAudience']
        );
        expect(text, 'buyer-page badge on a withheld record').not.toContain(
          m['events.section.badge.certifierRecordAndBuyer']
        );
        expect(text, '"Public note" label on a withheld record').not.toContain(
          m['events.common.fields.observation']
        );
        expect(text).toContain(m['events.common.help.observationCertifierOnly']);
        expect(text).toContain(m['events.section.badge.certifierRecordOnly']);
        // Run 8b R2: the heading said "Farmer's Field Notes & Consumer Transparency" above a
        // badge that said "Certifier record only".
        expect(text, 'buyer-facing heading on a withheld record').not.toMatch(
          /Consumer Transparency|transparencia para el consumidor/i
        );
        expect(text, 'public heading on a withheld record').not.toContain(
          m['events.section.fieldNotes']
        );
        expect(text).toContain(m['events.section.fieldNotesCertifierOnly']);
        expect(notesBox(container)?.placeholder).toBe(
          m['events.common.placeholders.observationCertifierOnly']
        );
      });
    }

    it(`HA (${locale}) keeps the public-note variant: harvest is on the buyer page`, () => {
      const { container } = renderTab('HA', m, locale);
      const text = notesSection(container, m);

      expect(text).toContain(m['events.section.fieldNotes']);
      expect(text).not.toContain(m['events.section.fieldNotesCertifierOnly']);
      expect(text).toContain(m['events.common.help.observationAudience']);
      expect(text).toContain(m['events.section.badge.certifierRecordAndBuyer']);
      expect(text).toContain(m['events.common.fields.observation']);
      expect(text).not.toContain(m['events.common.help.observationCertifierOnly']);
      expect(notesBox(container)?.placeholder).toBe(
        m['events.common.placeholders.observationPublic']
      );
    });
  }

  it('the certifier-only heading names the certifier, not the buyer, in both languages', () => {
    expect(enUS['events.section.fieldNotesCertifierOnly']).toBe('Field notes for your certifier');
    expect(es419['events.section.fieldNotesCertifierOnly']).toBe(
      'Notas de campo para tu certificadora'
    );
  });
});

/**
 * The input-source section used to end in a hard-coded English tip, "Why This Matters to
 * Consumers ... your commitment to sustainable, transparent farming practices": untranslated,
 * and a general-benefit virtue sentence (16 CFR 260.4). Removed in Run 8b R2; the badge and
 * helper already say who sees the record.
 */
describe('the production form carries no consumer-virtue tip', () => {
  // The input-source section renders for planting (PL), transplanting (TR) and irrigation (IR),
  // the three subtypes that showed the tip.
  for (const [locale, m] of LOCALES) {
    for (const code of ['PL', 'TR', 'IR']) {
      it(`${code} (${locale}) renders no "Why This Matters to Consumers" tip`, () => {
        const { container } = renderTab(code, m, locale);
        expect(container.textContent ?? '').not.toMatch(
          /Why This Matters to Consumers|sustainable, transparent farming/
        );
      });
    }
  }
});
