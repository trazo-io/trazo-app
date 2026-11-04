/**
 * The readiness card leads with what is worst (2026-11-04).
 *
 * The server emits season rows in CHECK order, so a "Missing" row sat under a "Needs attention"
 * one on the farm home. And the corner tally was a single orange "2 open items" whether one of
 * them was missing or not. Both are read before any row is, so both have to carry severity.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

import enUS from '../../../../../../i18n/lang/en-US.json';
import esES from '../../../../../../i18n/lang/es-419.json';

vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) => fn({ company: { currentCompany: null } })
}));

vi.mock('store/api/dashboardMetricsApi', () => ({
  useGetCertifierReadinessQuery: () => ({
    data: {
      establishment_id: 2,
      production: {
        id: 23,
        name: 'Liberty 2026',
        finish_date: null,
        is_finished: false,
        parcel_id: 12
      },
      findings: [
        {
          label: 'Land requirements (§ 205.202)',
          row_key: 'land_requirements',
          status: 'REVIEW',
          detail: 'field history',
          section_hint: null
        },
        {
          label: 'Input traceability (§ 205.103)',
          row_key: 'input_traceability',
          status: 'FAIL',
          detail: '3/5 inputs have supplier on file',
          section_hint: null
        },
        {
          label: 'Seed sourcing (§ 205.204)',
          row_key: 'seed_sourcing',
          status: 'REVIEW',
          detail: 'search record missing',
          section_hint: null
        }
      ],
      outstanding_count: 3,
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

const renderCard = (locale: 'en-US' | 'es-419' = 'en-US') =>
  render(
    <MemoryRouter>
      <ChakraProvider>
        <IntlProvider
          locale={locale}
          messages={(locale === 'en-US' ? enUS : esES) as Record<string, string>}>
          <CertifierReadinessCard companyId={1} farmId={2} />
        </IntlProvider>
      </ChakraProvider>
    </MemoryRouter>
  );

describe('readiness card, most serious first', () => {
  it('puts the Missing row above the Needs attention rows, keeping server order within each', () => {
    renderCard();
    const links = screen
      .getAllByTestId(/^readiness-row-link-/)
      .map((a) => a.getAttribute('data-testid'));
    expect(links).toEqual([
      'readiness-row-link-input_traceability',
      'readiness-row-link-land_requirements',
      'readiness-row-link-seed_sourcing'
    ]);
  });

  it('splits the tally into missing and needs attention', () => {
    renderCard();
    const tally = screen.getByTestId('readiness-tally');
    expect(within(tally).getByText('3')).toBeTruthy();
    expect(within(tally).getByText('1 missing')).toBeTruthy();
    expect(within(tally).getByText('2 need attention')).toBeTruthy();
    expect(within(tally).queryByText(/open item/)).toBeNull();
  });

  it('says it in Spanish', () => {
    renderCard('es-419');
    const tally = screen.getByTestId('readiness-tally');
    expect(within(tally).getByText('1 falta')).toBeTruthy();
    expect(within(tally).getByText('2 requieren atención')).toBeTruthy();
  });
});
