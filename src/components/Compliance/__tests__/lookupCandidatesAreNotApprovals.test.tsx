/**
 * A list of catalog matches is a list of OPTIONS, not approvals (2026-11-04).
 *
 * The lookup used to paint every candidate green (green.50 ground, green border, green check)
 * before the grower had picked anything, so "6 products match REGALIA" read as six approvals.
 * And each catalog wore its own colour badge (OMRI purple, WSDA teal, National List blue):
 * colour as decoration, which frontend.md retires. Now a candidate row is neutral, green
 * belongs to the ONE row attached to the record, and every source badge is the neutral one.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../i18n/lang/en-US.json';

const verifyResult: Record<string, unknown> = {};

vi.mock('store/api/ospApi', () => ({
  useLazyVerifyInputQuery: () => [
    () => undefined,
    { data: verifyResult, isFetching: false, isUninitialized: false, error: undefined }
  ]
}));

import InputVerifyHelper from '../InputVerifyHelper';

const candidate = (pk: number, name: string) => ({
  pk,
  omri_id: `pfb-${pk}`,
  product_name: name,
  list_edition_date: '2026-09-26'
});

const SIX = {
  found: true,
  status: 'matched',
  omri_product_pk: 1,
  omri_product_id: 'pfb-1',
  omri_product_name: 'REGALIA Biofungicide',
  omri_candidates: [
    candidate(1, 'REGALIA Biofungicide'),
    candidate(2, 'Regalia Rx Biofungicide'),
    candidate(3, 'REGALIA CG Biofungicide')
  ],
  omri_candidate_count: 3,
  wsda_material_pk: null,
  national_list_substance_pk: null
};

const renderWith = (attachedOmriPk: number | null) => {
  Object.keys(verifyResult).forEach((k) => delete verifyResult[k]);
  Object.assign(verifyResult, SIX);
  return render(
    <ChakraProvider>
      <IntlProvider
        locale="en-US"
        messages={enUS as Record<string, string>}
        onError={() => undefined}>
        <InputVerifyHelper
          name="REGALIA"
          attachedOmriPk={attachedOmriPk}
          onAttachOmri={() => undefined}
        />
      </IntlProvider>
    </ChakraProvider>
  );
};

describe('lookup candidates are options, not approvals', () => {
  it('no row reads as attached until the grower picks one', () => {
    const { container } = renderWith(null);
    expect(container.querySelectorAll('[data-tone]').length).toBe(3);
    expect(container.querySelectorAll('[data-attached]').length).toBe(0);
  });

  it('exactly the attached row is marked, and only that one', () => {
    const { container } = renderWith(2);
    const marked = container.querySelectorAll('[data-attached]');
    expect(marked.length).toBe(1);
    expect(marked[0].textContent).toContain('Regalia Rx Biofungicide');
  });

  it('paints no catalog a colour of its own', () => {
    const src = readFileSync(resolve(__dirname, '..', 'InputVerifyHelper.tsx'), 'utf8');
    // Code only: the component's comments explain the retired colours by name.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/colorScheme=\{?\s*badgeColor|badgeColor=|['"](purple|teal)['"]/);
    expect(code).toMatch(/<Badge variant="neutral"/);
  });
});
