/**
 * An OMRI listing that lapsed is said, never hidden (overall review 2026-11, OV-MT-C04).
 *
 * OMRI drops products between editions. The lookup offered a dropped one as an ordinary listing,
 * and a spray applied after the drop read as plainly OMRI-listed and plan-approved. The backend now
 * sends the edition date of the first list that no longer carried it (lookup) and an
 * "omri_listing_lapsed" issue on a record applied on or after it (drift). Neither says "prohibited":
 * OMRI stopped vouching, which is not a finding about the material.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

import enUS from '../../../i18n/lang/en-US.json';
import esES from '../../../i18n/lang/es-419.json';

const verifyResult: Record<string, unknown> = {};

vi.mock('store/api/ospApi', () => ({
  useLazyVerifyInputQuery: () => [
    () => undefined,
    {
      data: verifyResult,
      isFetching: false,
      isUninitialized: false,
      error: undefined,
      originalArgs: { name: 'dropped fish' }
    }
  ]
}));

import InputVerifyHelper from '../InputVerifyHelper';
import DriftFindingsBanner from '../DriftFindingsBanner';

const candidate = (over: Record<string, unknown> = {}) => ({
  pk: 7,
  omri_id: 'tst-1001',
  product_name: 'Dropped Fish 2-4-1',
  list_edition_date: '2026-09-05',
  delisted_on: '2026-09-26',
  ...over
});

const lookup = (result: Record<string, unknown>, locale: 'en-US' | 'es-419' = 'en-US') => {
  Object.keys(verifyResult).forEach((k) => delete verifyResult[k]);
  Object.assign(verifyResult, result);
  return render(
    <ChakraProvider>
      <IntlProvider
        locale={locale}
        messages={(locale === 'en-US' ? enUS : esES) as Record<string, string>}
        onError={() => undefined}>
        <InputVerifyHelper name="dropped fish" />
      </IntlProvider>
    </ChakraProvider>
  );
};

const SINGLE = {
  found: true,
  status: 'matched',
  omri_product_pk: 7,
  omri_product_id: 'tst-1001',
  omri_product_name: 'Dropped Fish 2-4-1',
  omri_product_delisted_on: '2026-09-26',
  omri_candidates: [candidate()],
  wsda_material_pk: null,
  national_list_substance_pk: null
};

describe('the lookup says when OMRI dropped a product', () => {
  it('names the date on the matched row, marks it conditional, and never says prohibited', () => {
    const { container } = lookup(SINGLE);
    expect(
      screen.getByText(
        "OMRI's list of Sep 26, 2026 no longer carries this product. That does not make it prohibited; check its status with your certifier before you use it."
      )
    ).toBeTruthy();
    expect(container.querySelector('[data-tone="restricted"]')).not.toBeNull();
    expect(container.querySelector('[data-tone="prohibited"]')).toBeNull();
  });

  it('marks only the dropped row in a list of candidates', () => {
    const { container } = lookup({
      ...SINGLE,
      omri_candidates: [
        candidate(),
        candidate({ pk: 8, omri_id: 'tst-1002', product_name: 'Listed Fish', delisted_on: null })
      ]
    });
    expect(container.querySelectorAll('[data-tone="restricted"]')).toHaveLength(1);
    expect(screen.getAllByText(/no longer carries this product/)).toHaveLength(1);
  });

  it('adds nothing for a listed product', () => {
    lookup({
      ...SINGLE,
      omri_product_delisted_on: null,
      omri_candidates: [candidate({ delisted_on: null })]
    });
    expect(screen.queryByText(/no longer carries/)).toBeNull();
  });

  it('says it in Spanish', () => {
    lookup(SINGLE, 'es-419');
    expect(
      screen.getByText(/ya no incluye este producto\. Eso no lo vuelve prohibido/)
    ).toBeTruthy();
  });
});

describe('the drift row says a lapsed listing in words', () => {
  it('renders the issue with both dates', () => {
    render(
      <ChakraProvider>
        <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
          <MemoryRouter>
            <DriftFindingsBanner
              events={[
                {
                  id: 3,
                  date: '2026-10-01T09:00:00Z',
                  drift_warning: {
                    detected_at: '2026-11-17T12:00:00Z',
                    osp_id: 1,
                    osp_version: 1,
                    input_label: 'Dropped Fish 2-4-1',
                    reason: 'stored prose',
                    reason_code: 'approved_with_issues',
                    reason_params: {
                      input: 'Dropped Fish 2-4-1',
                      resolvedName: 'Dropped Fish 2-4-1',
                      issues: ['omri_listing_lapsed'],
                      omriDelistedOn: '2026-09-26',
                      appliedOn: '2026-10-01'
                    },
                    provisional: false,
                    resolved_via: 'omri',
                    resolved_id: 7,
                    resolved_name: 'Dropped Fish 2-4-1',
                    cfr_reference: '7 CFR 205.400(f)(2)'
                  } as any
                }
              ]}
            />
          </MemoryRouter>
        </IntlProvider>
      </ChakraProvider>
    );
    fireEvent.click(screen.getByText('Show details'));
    expect(
      screen.getByText(
        /OMRI's published list stopped carrying this product as of 2026-09-26, and this application is dated 2026-10-01\. That does not make it prohibited/
      )
    ).toBeTruthy();
    expect(screen.queryByText(/omri_listing_lapsed/)).toBeNull();
  });
});
