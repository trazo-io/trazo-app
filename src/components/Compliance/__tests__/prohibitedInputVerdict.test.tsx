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
