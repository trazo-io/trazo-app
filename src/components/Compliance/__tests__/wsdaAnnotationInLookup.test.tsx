/**
 * The lookup shows WSDA's own annotation for a WSDA-listed product (2026-11-17).
 *
 * WSDA's list prints an Annotation column ("Deficiency must be documented.", "Preventative
 * practices must be implemented prior to use.") and states that registered products must be used
 * in accordance with all noted annotations. Trazo now holds it (back, same slice); until then an
 * annotated product read here as plainly listed. WSDA's NONE adds nothing, and is never "no
 * restrictions". OMRI's restrictions are not held at all, so an OMRI row says where to find them.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

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
      originalArgs: { name: 'zinc sulfate' }
    }
  ]
}));

import InputVerifyHelper from '../InputVerifyHelper';

const WSDA_ROW = {
  found: true,
  status: 'matched',
  omri_product_pk: null,
  national_list_substance_pk: null,
  wsda_material_pk: 4,
  wsda_material_id: '2948',
  wsda_material_name: 'Zinc Sulfate 35.5%',
  wsda_material_category: 'fertilizer-and-soil-amendment',
  wsda_list_effective_date: '2026-03-06'
};

const renderWith = (result: Record<string, unknown>, locale: 'en-US' | 'es-419' = 'en-US') => {
  Object.keys(verifyResult).forEach((k) => delete verifyResult[k]);
  Object.assign(verifyResult, result);
  return render(
    <ChakraProvider>
      <IntlProvider
        locale={locale}
        messages={(locale === 'en-US' ? enUS : esES) as Record<string, string>}
        onError={() => undefined}>
        <InputVerifyHelper name="zinc sulfate" />
      </IntlProvider>
    </ChakraProvider>
  );
};

describe('InputVerifyHelper shows WSDA annotations', () => {
  it("prints WSDA's annotation with the list's date and marks the row as conditional", () => {
    const { container } = renderWith({
      ...WSDA_ROW,
      wsda_material_annotation: 'Deficiency must be documented.'
    });
    expect(
      screen.getByText(
        "WSDA's annotation (list of 2026-03-06): Deficiency must be documented. WSDA requires use in accordance with it."
      )
    ).toBeTruthy();
    expect(container.querySelector('[data-tone="restricted"]')).not.toBeNull();
  });

  it('says it in Spanish, keeping WSDA’s words as WSDA wrote them', () => {
    renderWith(
      { ...WSDA_ROW, wsda_material_annotation: 'Deficiency must be documented.' },
      'es-419'
    );
    expect(
      screen.getByText(
        'Anotación de WSDA (lista del 2026-03-06): Deficiency must be documented. WSDA exige usarlo conforme a ella.'
      )
    ).toBeTruthy();
  });

  it("adds nothing for WSDA's NONE or an untranscribed row, and never says there are no restrictions", () => {
    for (const annotation of ['', null]) {
      const { container, unmount } = renderWith({
        ...WSDA_ROW,
        wsda_material_annotation: annotation
      });
      expect(screen.queryByText(/WSDA's annotation/)).toBeNull();
      expect(screen.queryByText(/no restriction/i)).toBeNull();
      expect(container.querySelector('[data-tone="restricted"]')).toBeNull();
      unmount();
    }
  });

  it('points to the OMRI listing for restrictions, and only when an OMRI row is shown', () => {
    renderWith(WSDA_ROW);
    expect(screen.queryByTestId('omri-restriction-pointer')).toBeNull();
  });

  it('shows the OMRI pointer under an OMRI match', () => {
    renderWith({
      found: true,
      status: 'matched',
      omri_product_pk: 7,
      omri_product_id: 'dow-2900',
      omri_product_name: 'Entrust SC',
      omri_candidates: [{ pk: 7, omri_id: 'dow-2900', product_name: 'Entrust SC' }],
      wsda_material_pk: null,
      national_list_substance_pk: null
    });
    expect(screen.getByTestId('omri-restriction-pointer').textContent).toContain(
      "Trazo does not hold OMRI's restrictions"
    );
  });
});
