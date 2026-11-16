/**
 * A National List hit is not automatically good news.
 *
 * 🔴 2026-08-28 — `InputVerifyHelper` sits under the Commercial Name field on the activity
 * form, and it rendered EVERY catalog match in one green card: FaCheckCircle, green.50 ground,
 * green border. The National List holds § 205.601 allowed substances and § 205.602 PROHIBITED
 * ones in the same table (64 allowed / 33 prohibited as seeded), and both answer the same
 * search — "manure" returns "Ash from manure burning". The verdict a grower read off that card,
 * standing in the orchard about to apply the thing, was a green tick with the word "prohibited"
 * in a grey 12px subtitle underneath.
 *
 * The server-side half — refusing to attach a prohibited substance to an OSP — is pinned in
 * `certifications/tests/test_prohibited_input_refused.py`. There is no server backstop for what
 * this component SAYS, which is why it is pinned here.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../i18n/lang/en-US.json';

const verifyResult: Record<string, unknown> = {};

vi.mock('store/api/ospApi', () => ({
  useLazyVerifyInputQuery: () => [
    () => undefined,
    {
      data: verifyResult,
      isFetching: false,
      isUninitialized: false,
      error: undefined,
      // The result belongs to the name it was looked up for (run 8, R8-08).
      originalArgs: { name: 'ash from manure burning' }
    }
  ]
}));

// eslint-disable-next-line import/first
import InputVerifyHelper from '../InputVerifyHelper';

const PROHIBITED = {
  found: true,
  status: 'matched',
  omri_product_pk: null,
  wsda_material_pk: null,
  national_list_substance_pk: 9,
  national_list_substance_name: 'Ash from manure burning',
  national_list_cfr_section: '205.602',
  national_list_status: 'prohibited'
};

const ALLOWED = {
  ...PROHIBITED,
  national_list_substance_name: 'Elemental sulfur',
  national_list_cfr_section: '205.601',
  national_list_status: 'allowed'
};

const renderWith = (result: Record<string, unknown>) => {
  Object.keys(verifyResult).forEach((k) => delete verifyResult[k]);
  Object.assign(verifyResult, result);
  return render(
    <ChakraProvider>
      <IntlProvider
        locale="en-US"
        messages={enUS as Record<string, string>}
        onError={() => undefined}>
        <InputVerifyHelper name="ash from manure burning" />
      </IntlProvider>
    </ChakraProvider>
  );
};

describe('InputVerifyHelper — a § 205.602 match reads as prohibited, not as verified', () => {
  it('states the verdict in words, not only in a status subtitle', () => {
    renderWith(PROHIBITED);
    expect(screen.getByText(/Prohibited in organic crop production/i)).toBeTruthy();
    expect(screen.getByText(/is on the National List as prohibited/i)).toBeTruthy();
  });

  it('names the substance and its citation', () => {
    renderWith(PROHIBITED);
    const body = screen.getByText(/is on the National List as prohibited/i).textContent || '';
    expect(body).toContain('Ash from manure burning');
    expect(body).toContain('205.602');
  });

  it('does not render the success row for a prohibited substance', () => {
    // The regression this exists to catch: the row keeps its green tick and the only thing
    // separating "allowed" from "prohibited" is a word in a grey subtitle. Chakra compiles
    // `bg="green.50"` into an emotion class, so the ground colour is invisible to the DOM —
    // the row carries `data-tone` for exactly this assertion.
    const { container } = renderWith(PROHIBITED);
    const rows = container.querySelectorAll('[data-tone]');
    expect(rows.length).toBe(1);
    expect(rows[0].getAttribute('data-tone')).toBe('prohibited');
  });

  it('still reads as a clean match for an allowed substance', () => {
    // Anti-overreach: the warning must not fire on every National List hit.
    const { container } = renderWith(ALLOWED);
    expect(screen.queryByText(/Prohibited in organic crop production/i)).toBeNull();
    expect(screen.getByText('Elemental sulfur')).toBeTruthy();
    const rows = container.querySelectorAll('[data-tone]');
    expect(rows.length).toBe(1);
    expect(rows[0].getAttribute('data-tone')).toBe('allowed');
  });
});

describe('InputVerifyHelper — a § 205.602 row allowed for one use reads as that use, not a violation', () => {
  // 2026-11-06: calcium chloride, sprayed on Honeycrisp for bitter pit, read as "a violation your
  // certifier must be told about". § 205.602(c) allows it as a foliar spray for a calcium-uptake
  // disorder; the server types the row (`national_list_conditional`).
  const CALCIUM = {
    ...PROHIBITED,
    national_list_substance_name: 'Calcium chloride (brine process)',
    national_list_citation: '\u00a7 205.602(c)',
    national_list_subsection: 'c',
    national_list_conditional: true
  };

  it('states the condition and never the violation', () => {
    const { container } = renderWith(CALCIUM);
    expect(screen.queryByText(/Prohibited in organic crop production/i)).toBeNull();
    expect(screen.queryByText(/violation/i)).toBeNull();
    expect(screen.getByText(/Allowed only for the use the rule names/i)).toBeTruthy();
    const body = container.querySelector('[data-verdict="restricted"]')?.textContent || '';
    expect(body).toContain('Calcium chloride (brine process)');
    expect(body).toContain('\u00a7 205.602(c)');
    expect(body).toContain(
      'only as a foliar spray to treat a physiological disorder associated with calcium uptake'
    );
    const rows = container.querySelectorAll('[data-tone]');
    expect(rows.length).toBe(1);
    expect(rows[0].getAttribute('data-tone')).toBe('restricted');
  });

  it('keeps the violation for a prohibited row the server did not type as conditional', () => {
    // A note alone softens nothing: only the typed flag does.
    renderWith({ ...CALCIUM, national_list_conditional: false });
    expect(screen.getByText(/Prohibited in organic crop production/i)).toBeTruthy();
    expect(screen.queryByText(/Allowed only for the use the rule names/i)).toBeNull();
  });
});

describe('InputVerifyHelper: a § 205.601 row allowed only under a condition says so', () => {
  // 2026-11-16, overall review OV-MT-C01: every § 205.601 hit read "allowed". Zinc and boron need a
  // deficiency documented by soil or tissue testing ((j)(7)); boric acid is for structural pest
  // control with no contact with crops ((e)(3)). The server types the row
  // (`national_list_allowed_with_condition`) and sends the rule's words verbatim.
  const J7 =
    'Micronutrients—not to be used as a defoliant, herbicide, or desiccant. Those made from nitrates or chlorides are not allowed. Micronutrient deficiency must be documented by soil or tissue testing or other documented and verifiable method as approved by the certifying agent.';
  const E3 = 'Boric acid—structural pest control, no direct contact with organic food or crops.';
  const ZINC = {
    ...ALLOWED,
    national_list_substance_name:
      'Zinc/copper/iron/manganese/molybdenum/selenium/cobalt (sulfates, carbonates, oxides, silicates)',
    national_list_citation: '§ 205.601(j)',
    national_list_allowed_with_condition: true,
    national_list_rule_paragraph: '(j)(7)',
    national_list_rule_words: J7
  };
  const BORIC = {
    ...ALLOWED,
    national_list_substance_name: 'Boric acid',
    national_list_citation: '§ 205.601(e)',
    national_list_allowed_with_condition: true,
    national_list_rule_paragraph: '(e)(3)',
    national_list_rule_words: E3
  };

  it.each([
    ['zinc', ZINC, '(j)(7)', J7],
    ['boric acid', BORIC, '(e)(3)', E3]
  ])(
    '%s: the condition in the rule’s words, never plain "allowed"',
    (_n, result, paragraph, words) => {
      const { container } = renderWith(result);
      expect(screen.getByText('Allowed only under the condition the rule states')).toBeTruthy();
      const block = container.querySelector('[data-verdict="condition"]')?.textContent || '';
      expect(block).toContain(`§ 205.601${paragraph}`);
      expect(block).toContain('your certifier checks each application against this condition');
      expect(screen.getByTestId('nl-rule-words').textContent).toBe(words);
      const rows = container.querySelectorAll('[data-tone]');
      expect(rows.length).toBe(1);
      expect(rows[0].getAttribute('data-tone')).toBe('restricted');
      expect(rows[0].textContent).toContain('allowed with a condition');
      expect(screen.queryByText(/Prohibited in organic crop production/i)).toBeNull();
    }
  );

  it('lime sulfur: its words are shown and it stays allowed', () => {
    // "including calcium polysulfide" says what the substance is, not how it may be used.
    const { container } = renderWith({
      ...ALLOWED,
      national_list_substance_name: 'Lime sulfur',
      national_list_allowed_with_condition: false,
      national_list_rule_paragraph: '(e)(6)',
      national_list_rule_words: 'Lime sulfur—including calcium polysulfide.'
    });
    expect(container.querySelector('[data-verdict="condition"]')).toBeNull();
    expect(container.querySelector('[data-tone]')?.getAttribute('data-tone')).toBe('allowed');
    expect(screen.getByTestId('nl-rule-words').textContent).toBe(
      "The rule's words (§ 205.601(e)(6)): Lime sulfur—including calcium polysulfide."
    );
  });

  it('a flagged row with no paragraph or section still cites § 205.601, never § 205.602', () => {
    // Review of app #403: the general fallback ends at § 205.602, the prohibited section.
    const { container } = renderWith({
      ...ZINC,
      national_list_citation: null,
      national_list_cfr_section: null,
      national_list_rule_paragraph: null
    });
    const block = container.querySelector('[data-verdict="condition"]')?.textContent || '';
    expect(block).toContain('\u00a7 205.601 allows it');
    expect(block).not.toContain('205.602');
  });

  it('a row the server did not flag is never turned into a condition by its words', () => {
    // The flag decides, never the prose: words with no flag stay "allowed".
    const { container } = renderWith({ ...ZINC, national_list_allowed_with_condition: false });
    expect(container.querySelector('[data-verdict="condition"]')).toBeNull();
    expect(container.querySelector('[data-tone]')?.getAttribute('data-tone')).toBe('allowed');
  });

  it('in Spanish the frame is translated and the rule stays the rule’s English', async () => {
    const es419 = (await import('../../../i18n/lang/es-419.json')).default as Record<
      string,
      string
    >;
    Object.keys(verifyResult).forEach((k) => delete verifyResult[k]);
    Object.assign(verifyResult, ZINC);
    const { container } = render(
      <ChakraProvider>
        <IntlProvider locale="es-419" messages={es419} onError={() => undefined}>
          <InputVerifyHelper name="ash from manure burning" />
        </IntlProvider>
      </ChakraProvider>
    );
    expect(screen.getByText('Permitido solo con la condición que fija la norma')).toBeTruthy();
    expect(container.querySelector('[data-verdict="condition"]')?.textContent).toContain(
      'Texto de la norma, en inglés:'
    );
    const quote = screen.getByTestId('nl-rule-words');
    expect(quote.textContent).toBe(J7);
    expect(quote.getAttribute('lang')).toBe('en');
    expect(container.querySelector('[data-tone]')?.textContent).toContain(
      'permitido con una condición'
    );
  });
});
