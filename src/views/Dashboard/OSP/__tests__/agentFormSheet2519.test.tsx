/**
 * WSDA's Additional Facilities and Third-Parties (AGR 2519) on the copy sheet: one block per facility
 * another operation runs, with the values Trazo holds, the responsibility statement the record points
 * to (never ticked), and what the record leaves empty.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';
import esLA from 'i18n/lang/es-419.json';

const facilitiesRow = {
  step: '2519',
  item: 'facilities_2519',
  kind: 'value',
  source: 'facilities',
  extra: {
    business_name: 'Ridge Orchards LLC',
    cert_no: '',
    own_facilities: ['Home packing shed']
  },
  value: [
    {
      facility_id: 11,
      name: 'Valley Cold Storage',
      address: '400 Cold Storage Rd',
      city: 'Wenatchee',
      state: 'WA',
      postal_code: '98801',
      activities: ['presizing_sorting_hydrocooling', 'bulk_storage'],
      products_detail: 'Honeycrisp, bulk bins',
      crops: [{ crop: 'Apple', years: [2026] }],
      responsibility: 'certified_third_party',
      certificate: { number: 'WSDA-1234', certifier: 'WSDA', copy_on_file: false },
      exemption_basis: '',
      missing: []
    },
    {
      facility_id: 12,
      name: 'Harbor Brokers',
      address: '',
      city: 'Seattle',
      state: 'WA',
      postal_code: '',
      activities: [],
      products_detail: '',
      crops: [],
      responsibility: 'uncertified_third_party',
      certificate: null,
      exemption_basis: '',
      missing: ['address', 'postal_code', 'activities', 'description', 'exemption_basis']
    }
  ]
};

const sheetWith = (rows: unknown[]) => ({
  agent: 'wsda',
  agent_name: 'Washington State Department of Agriculture',
  form: {
    title: 'Renewal Fee Form',
    document_id: 'AGR 2521',
    revision: '',
    url: 'https://agr.wa.gov/'
  },
  forms: [
    {
      title: 'Additional Facilities and Third-Parties',
      document_id: 'AGR 2519',
      revision: 'R 01/24',
      url: 'https://agr.wa.gov/',
      stem: '2519-additional-facilities'
    }
  ],
  plan_version: 2,
  filing_id: 9,
  rows
});

let result: { data?: unknown } = { data: sheetWith([facilitiesRow]) };
vi.mock('store/api/ospApi', () => ({ useGetAgentFormSheetQuery: () => result }));
vi.mock('store/api/companyApi', () => ({
  useEditFarmMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateCompanyMutation: () => [vi.fn(), { isLoading: false }]
}));
vi.mock('hooks/useUserRole', () => ({
  useUserRole: () => ({ canWrite: true, canManageCompany: true })
}));

import AgentFormCopySheet from '../AgentFormCopySheet';

const renderSheet = (locale = 'en-US', messages: Record<string, string> = enUS) =>
  render(
    <ChakraProvider>
      <IntlProvider locale={locale} messages={messages}>
        <AgentFormCopySheet companyId="1" farmId="2" ospId={4} />
      </IntlProvider>
    </ChakraProvider>
  );

describe('AGR 2519 on the copy sheet', () => {
  it('gives each facility its values and the statement its record points to', () => {
    result = { data: sheetWith([facilitiesRow]) };
    renderSheet();
    expect(
      screen.getByText('Additional Facilities and Third-Parties (AGR 2519), one per facility')
    ).toBeInTheDocument();
    const cold = screen.getByTestId('sheet-2519-11');
    expect(cold).toHaveTextContent('Address: 400 Cold Storage Rd, Wenatchee, WA, 98801');
    expect(cold).toHaveTextContent(
      'Activities: Pre-sizing, sorting, hydrocooling crops; Storage of bulk, unpackaged organic products'
    );
    expect(cold).toHaveTextContent('the statement for a certified third party fits');
    expect(cold).toHaveTextContent('No copy of the certificate is on file in Trazo.');
    expect(cold).not.toHaveTextContent('Not recorded');
  });

  it('names what an uncertified third party record leaves empty', () => {
    result = { data: sheetWith([facilitiesRow]) };
    renderSheet();
    const broker = screen.getByTestId('sheet-2519-12');
    expect(broker).toHaveTextContent('the statement for a third party that is not certified fits');
    expect(broker).toHaveTextContent(
      'Not recorded: street address, zip code, activities, products or crops, how it is exempt.'
    );
  });

  it('leaves the statement to the grower and names own facilities for them to decide', () => {
    result = { data: sheetWith([facilitiesRow]) };
    renderSheet();
    const row = screen.getByTestId('agent-sheet-facilities_2519');
    expect(row).toHaveTextContent(
      'You tick the responsibility statement on the form; Trazo does not.'
    );
    expect(row).toHaveTextContent('Your own facilities (Home packing shed) need this form only if');
  });

  it('says when no facility run by another operation is on file', () => {
    result = {
      data: sheetWith([
        {
          step: '2519',
          item: 'facilities_2519',
          kind: 'note',
          value: null,
          source: '',
          extra: { reason: 'none_on_file', own_facilities: [] }
        }
      ])
    };
    renderSheet();
    expect(screen.getByTestId('agent-sheet-facilities_2519')).toHaveTextContent(
      'No facility run by another operation is on file.'
    );
  });

  // OV-PK-W04: a buyer that takes title on delivery is named, never offered the form, and the
  // "fits" sentence appears only on a facility the plan says handles the crop while the grower owns it.
  it('lists only what stores or handles the crop while the grower owns it, and names the buyers', () => {
    const cold = { ...facilitiesRow.value[0], basis: ['K 1'] };
    result = {
      data: sheetWith([
        {
          ...facilitiesRow,
          value: [cold],
          extra: {
            ...facilitiesRow.extra,
            not_on_behalf: ['Marion Bend Fruit Co.'],
            not_stated: []
          }
        }
      ])
    };
    renderSheet();
    const row = screen.getByTestId('agent-sheet-facilities_2519');
    expect(screen.getByTestId('sheet-2519-11')).toHaveTextContent(
      "On this form because, by your plan's answers, another operation stores your crop while you own it (K 1)."
    );
    expect(screen.getByTestId('sheet-2519-11')).toHaveTextContent(
      'the statement for a certified third party fits'
    );
    expect(screen.getByTestId('sheet-2519-not-on-behalf')).toHaveTextContent(
      "Not on this form: Marion Bend Fruit Co.. Your plan's answers say they do not store or handle your crop while you still own it"
    );
    // The buyer gets no block of its own, so no responsibility statement is said to fit it.
    const blocks = Array.from(row.querySelectorAll('[data-testid^="sheet-2519-"]')).filter((el) =>
      /^sheet-2519-\d+$/.test(el.getAttribute('data-testid') || '')
    );
    expect(blocks.map((el) => el.getAttribute('data-testid'))).toEqual(['sheet-2519-11']);
  });

  const noteRow = (extra: Record<string, unknown>) => ({
    step: '2519',
    item: 'facilities_2519',
    kind: 'note',
    value: null,
    source: '',
    extra: { own_facilities: [], not_on_behalf: [], not_stated: [], ...extra }
  });

  it('says when the plan sends the crop straight to the buyer', () => {
    result = {
      data: sheetWith([
        noteRow({
          reason: 'none_on_behalf',
          not_on_behalf: ['Cascade Organic Distributors', 'Marion Bend Fruit Co.']
        })
      ])
    };
    renderSheet();
    const row = screen.getByTestId('agent-sheet-facilities_2519');
    expect(row).toHaveTextContent(
      "By your plan's answers, no facility run by another operation stores or handles your crop while you still own it."
    );
    expect(row).not.toHaveTextContent('fits');
    expect(screen.getByTestId('sheet-2519-not-on-behalf')).toHaveTextContent(
      'Cascade Organic Distributors, Marion Bend Fruit Co.'
    );
  });

  it('claims no "none" while the plan does not say, and names what to answer', () => {
    result = {
      data: sheetWith([noteRow({ reason: 'none_stated', not_stated: ['Valley Cold Storage'] })])
    };
    renderSheet();
    const row = screen.getByTestId('agent-sheet-facilities_2519');
    expect(row).not.toHaveTextContent('no facility run by another operation');
    expect(row).not.toHaveTextContent('No facility run by another operation is on file.');
    expect(screen.getByTestId('sheet-2519-not-stated')).toHaveTextContent(
      'Your plan does not yet say whether Valley Cold Storage store or handle your crop'
    );
  });

  it('speaks Spanish', () => {
    result = { data: sheetWith([facilitiesRow]) };
    renderSheet('es-419', esLA);
    expect(
      screen.getByText('Instalaciones adicionales y terceros (AGR 2519), uno por instalación')
    ).toBeInTheDocument();
    expect(screen.getByTestId('sheet-2519-11')).toHaveTextContent(
      'Precalibrado, clasificación e hidroenfriado de cultivos'
    );
  });
});
