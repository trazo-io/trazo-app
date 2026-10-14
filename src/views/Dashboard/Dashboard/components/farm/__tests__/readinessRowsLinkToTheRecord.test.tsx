/**
 * Each season row on the readiness card links to the page that holds the record to fix.
 *
 * Oscar, 2026-10-07, on the farm-home card: "is there a way to add direct links here to be
 * easier to go completing the warnings and the missings". The server names each row by a
 * stable `row_key` and the season's parcel; the card maps the key to the production page, the
 * plan's identity panel, the parcel application or the narratives. A key with no route keeps
 * only the audit-export hint. Red on the old card.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

import enUS from '../../../../../../i18n/lang/en-US.json';

// The card reads the company for the plan's access notice (Run 8b). No company loaded here, so
// no notice: these tests are about the findings.
vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) => fn({ company: { currentCompany: null } })
}));

vi.mock('store/api/dashboardMetricsApi', () => ({
  useGetCertifierReadinessQuery: () => ({
    data: {
      establishment_id: 2,
      production: {
        id: 23,
        name: 'Onions 2026',
        finish_date: null,
        is_finished: false,
        parcel_id: 12
      },
      findings: [
        {
          label: 'Input traceability (§ 205.103)',
          row_key: 'input_traceability',
          status: 'FAIL',
          detail: '3/5 inputs have supplier on file',
          section_hint: 'Input Material Application Records section'
        },
        {
          label: "Inputs not confirmed against the plan's inputs list (§ 205.400(f)(2))",
          row_key: 'inputs_not_confirmed_against_the_plan_s_inputs_list',
          status: 'REVIEW',
          detail: '6 input record(s) not confirmed',
          section_hint: null
        },
        {
          label: 'Land requirements (§ 205.202)',
          row_key: 'land_requirements',
          status: 'REVIEW',
          detail: 'field history',
          section_hint: null
        },
        {
          label: 'Something new (§ 205.999)',
          row_key: 'something_new',
          status: 'REVIEW',
          detail: 'no route for this one',
          section_hint: 'Somewhere section'
        }
      ],
      outstanding_count: 4,
      checked_count: 16
    },
    isLoading: false,
    isUninitialized: false,
    isError: false
  })
}));

vi.mock('store/api/certifierLinkApi', () => ({
  useGetOperationReadinessQuery: () => ({
    data: { items: [], blockers: [], warnings: [] },
    isLoading: false
  })
}));

const { default: CertifierReadinessCard } = await import('../CertifierReadinessCard');

describe('readiness rows link to the record', () => {
  it('maps each known row key to the page holding the record', () => {
    render(
      <MemoryRouter>
        <ChakraProvider>
          <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
            <CertifierReadinessCard companyId={1} farmId={2} />
          </IntlProvider>
        </ChakraProvider>
      </MemoryRouter>
    );
    expect(screen.getByTestId('readiness-row-link-input_traceability').getAttribute('href')).toBe(
      '/admin/dashboard/farm/2/parcel/12/production/23'
    );
    expect(
      screen
        .getByTestId('readiness-row-link-inputs_not_confirmed_against_the_plan_s_inputs_list')
        .getAttribute('href')
    ).toBe('/admin/dashboard/farm/2/osp/module/materials_application#logged-names');
    expect(screen.getByTestId('readiness-row-link-land_requirements').getAttribute('href')).toBe(
      '/admin/dashboard/farm/2/parcel/12/application'
    );
    expect(screen.queryByTestId('readiness-row-link-something_new')).toBeNull();
    expect(screen.getAllByText(/Open the record/).length).toBe(3);
  });
});
