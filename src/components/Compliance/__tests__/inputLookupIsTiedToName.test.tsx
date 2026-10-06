/**
 * Run 8 (R8-08, Astra 2026-10-05): on the pesticide form, searching "Arsenic" gave a strong,
 * correct prohibited warning. Changing the name to an unlisted product left that verdict on
 * screen until another lookup; and for an unknown name the card said "This is allowed", which
 * a grower reads as permission to apply it. A verdict belongs to the name it was looked up for,
 * and "no match" never reads as allowed.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const state: Record<string, unknown> = {};

vi.mock('store/api/ospApi', () => ({
  useLazyVerifyInputQuery: () => [() => undefined, state]
}));

// eslint-disable-next-line import/first
import InputVerifyHelper from '../InputVerifyHelper';

const ARSENIC = {
  found: true,
  status: 'matched',
  omri_product_pk: null,
  wsda_material_pk: null,
  national_list_substance_pk: 3,
  national_list_substance_name: 'Arsenic',
  national_list_cfr_section: '205.602',
  national_list_status: 'prohibited'
};

const renderFor = (typed: string, lookedUp: string) => {
  Object.assign(state, {
    data: ARSENIC,
    isFetching: false,
    isUninitialized: false,
    error: undefined,
    originalArgs: { name: lookedUp }
  });
  return render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>} onError={() => undefined}>
        <InputVerifyHelper name={typed} />
      </IntlProvider>
    </ChakraProvider>
  );
};

describe('a lookup verdict belongs to the name it was looked up for', () => {
  it('shows the verdict for the name that was looked up', () => {
    renderFor('Arsenic', 'Arsenic');
    expect(screen.queryByText(/Prohibited in organic crop production/i)).not.toBeNull();
  });

  it('hides it once the name is edited, and asks for a new lookup', () => {
    renderFor('ASTRA unlisted spray', 'Arsenic');
    expect(screen.queryByText(/Prohibited in organic crop production/i)).toBeNull();
    expect(screen.queryByText(/The name changed/i)).not.toBeNull();
  });
});

describe('"no match" never reads as allowed', () => {
  it.each([
    ['en-US', enUS],
    ['es-419', es419]
  ])('%s', (_locale, catalog) => {
    const text = (catalog as Record<string, string>)['inputVerify.noMatch'];
    expect(text).not.toMatch(/this is allowed|esto está permitido/i);
    expect(text).toMatch(/does not mean the input is allowed|no significa que el insumo esté permitido/i);
  });
});
