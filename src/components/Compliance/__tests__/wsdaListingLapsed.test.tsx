/**
 * A WSDA listing that lapsed is said, never hidden (overall review 2026-11, OV-MT-C04, WSDA half).
 *
 * WSDA rows now carry the edition date of the first WSDA list that no longer carried the product, as
 * OMRI rows already did. The lookup says so on the WSDA row, keeps WSDA's annotation beside it, and
 * the drift row renders the new "wsda_listing_lapsed" issue. Neither says "prohibited".
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
      originalArgs: { name: 'dropped kelp' }
    }
  ]
}));

import InputVerifyHelper from '../InputVerifyHelper';
import DriftFindingsBanner from '../DriftFindingsBanner';

const WSDA = {
  found: true,
  status: 'matched',
  omri_product_pk: null,
  national_list_substance_pk: null,
  wsda_material_pk: 4,
  wsda_material_id: '3001',
  wsda_material_name: 'Dropped Kelp 0-0-1',
  wsda_list_effective_date: '2026-03-06',
  wsda_material_delisted_on: '2026-10-02'
};

const lookup = (result: Record<string, unknown>, locale: 'en-US' | 'es-419' = 'en-US') => {
  Object.keys(verifyResult).forEach((k) => delete verifyResult[k]);
  Object.assign(verifyResult, result);
  return render(
    <ChakraProvider>
      <IntlProvider
        locale={locale}
        messages={(locale === 'en-US' ? enUS : esES) as Record<string, string>}
        onError={() => undefined}>
        <InputVerifyHelper name="dropped kelp" />
      </IntlProvider>
    </ChakraProvider>
  );
};

describe('the lookup says when WSDA dropped a product', () => {
  it('names the date on the WSDA row and marks it conditional', () => {
    const { container } = lookup(WSDA);
    expect(
      screen.getByText(
        "WSDA's list of Oct 2, 2026 no longer carries this product. That does not make it prohibited; check its status with your certifier before you use it."
      )
    ).toBeTruthy();
    expect(container.querySelector('[data-tone="restricted"]')).not.toBeNull();
    expect(container.querySelector('[data-tone="prohibited"]')).toBeNull();
  });

  it("keeps WSDA's annotation beside the lapse", () => {
    lookup({ ...WSDA, wsda_material_annotation: 'Deficiency must be documented.' });
    expect(
      screen.getByText(
        /no longer carries this product\..*WSDA's annotation \(list of 2026-03-06\): Deficiency must be documented\./
      )
    ).toBeTruthy();
  });

  it('adds nothing for a listed product', () => {
    const { container } = lookup({ ...WSDA, wsda_material_delisted_on: null });
    expect(screen.queryByText(/no longer carries/)).toBeNull();
    expect(container.querySelector('[data-tone="restricted"]')).toBeNull();
  });

  it('says it in Spanish', () => {
    lookup(WSDA, 'es-419');
    expect(screen.getByText(/La lista de WSDA del .* ya no incluye este producto/)).toBeTruthy();
  });
});

describe('the drift row says a lapsed WSDA listing in words', () => {
  it('renders the issue with both dates', () => {
    render(
      <ChakraProvider>
        <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
          <MemoryRouter>
            <DriftFindingsBanner
              events={[
                {
                  id: 5,
                  date: '2026-10-06T09:00:00Z',
                  drift_warning: {
                    detected_at: '2026-11-18T12:00:00Z',
                    osp_id: 1,
                    osp_version: 1,
                    input_label: 'Dropped Kelp 0-0-1',
                    reason: 'stored prose',
                    reason_code: 'approved_with_issues',
                    reason_params: {
                      input: 'Dropped Kelp 0-0-1',
                      resolvedName: 'Dropped Kelp 0-0-1',
                      issues: ['wsda_listing_lapsed'],
                      wsdaDelistedOn: '2026-10-02',
                      appliedOn: '2026-10-06'
                    },
                    provisional: false,
                    resolved_via: 'wsda',
                    resolved_id: 4,
                    resolved_name: 'Dropped Kelp 0-0-1',
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
        /WSDA's published list stopped carrying this product as of 2026-10-02, and this application is dated 2026-10-06/
      )
    ).toBeTruthy();
    expect(screen.queryByText(/wsda_listing_lapsed/)).toBeNull();
  });
});
