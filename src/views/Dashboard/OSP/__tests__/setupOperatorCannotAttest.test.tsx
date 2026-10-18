/**
 * The pilot setup account enters a grower's records; it never signs or submits for the grower.
 *
 * The server refuses both from an account whose membership carries `is_setup_operator`
 * (trazo-back `test_setup_operator_cannot_attest`). Here: the app reads the flag, and the annual
 * update card says the grower signs instead of offering a Sign button that would only collect a
 * 403. Before this the operator could sign, and the signature recorded the GROWER's name.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';
import es419 from 'i18n/lang/es-419.json';
import { useUserRole } from 'hooks/useUserRole';

const draft = {
  id: 7,
  reporting_year: 2027,
  revision_number: 1,
  changes_summary: 'Hedgerow planted.',
  additions: [],
  deletions: [],
  prior_osp: 61,
  prior_osp_version: 3,
  signed_at: null,
  submitted_at: null,
  is_locked: false
};

vi.mock('store/api/ospAnnualUpdateApi', () => ({
  useGetOSPAnnualUpdatesQuery: () => ({ data: [draft] }),
  useCreateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useSignOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useFileOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useCorrectOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useWithdrawOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  FILING_METHODS: ['agent_web_form', 'agent_portal', 'email', 'mail', 'in_person']
}));

import OSPAnnualUpdateCard, { OSPRenewalSummary } from '../OSPAnnualUpdateCard';

const renderCard = (isSetupOperator: boolean, locale = 'en-US', messages: object = enUS) =>
  render(
    <ChakraProvider>
      <IntlProvider locale={locale} messages={messages as Record<string, string>}>
        <OSPAnnualUpdateCard
          companyId="1"
          farmId="2"
          planOnFile={{ id: 61, version_number: 3, status: 'active' } as any}
          currentYear={2027}
          isSetupOperator={isSetupOperator}
        />
      </IntlProvider>
    </ChakraProvider>
  );

describe('the setup account and the Sign button', () => {
  it('the grower gets the Sign button', () => {
    renderCard(false);
    expect(screen.getByRole('button', { name: 'Sign' })).toBeInTheDocument();
    expect(screen.queryByTestId('annual-sign-is-the-growers')).toBeNull();
  });

  it('the setup account gets a note saying the grower signs, and no button', () => {
    renderCard(true);
    expect(screen.queryByRole('button', { name: 'Sign' })).toBeNull();
    expect(screen.getByTestId('annual-sign-is-the-growers').textContent).toBe(
      'The grower signs from their own account. This setup account cannot.'
    );
  });

  it('says it in Spanish', () => {
    renderCard(true, 'es-419', es419);
    expect(screen.getByTestId('annual-sign-is-the-growers').textContent).toBe(
      'El productor firma desde su propia cuenta. Esta cuenta de configuración no puede hacerlo.'
    );
  });
});

describe('nothing else on the page tells the setup account to sign (review of app #143)', () => {
  const renderSummary = (isSetupOperator: boolean) =>
    render(
      <ChakraProvider>
        <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
          <OSPRenewalSummary
            companyId="1"
            farmId="2"
            currentYear={2027}
            isSetupOperator={isSetupOperator}
          />
        </IntlProvider>
      </ChakraProvider>
    );

  it('the renewal summary names the grower as the signer', () => {
    renderSummary(true);
    const text = screen.getByTestId('osp-renewal-summary').textContent!;
    expect(text).toContain('Next: the grower signs it from their own account');
    expect(text).not.toContain('Next: sign it');
  });

  it('the grower still reads "Next: sign it"', () => {
    renderSummary(false);
    expect(screen.getByTestId('osp-renewal-summary').textContent).toContain(
      'Next: sign it, then record when it was filed.'
    );
  });

  it('the edit form says the grower signs', () => {
    renderCard(true);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const help = screen.getByTestId('annual-sign-then-file-help').textContent!;
    expect(help).toContain('The grower then signs it from their own account');
    expect(help).not.toContain('then sign it');
  });
});

describe('useUserRole reads the membership flag', () => {
  const roleFor = (user: unknown) => {
    const store = configureStore({ reducer: { userState: () => ({ user }) } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    return renderHook(() => useUserRole(), { wrapper }).result.current;
  };

  it('is true only when the active membership carries the flag', () => {
    expect(
      roleFor({ companies: [{ role: 'Company Admin', is_setup_operator: true }] }).isSetupOperator
    ).toBe(true);
    expect(
      roleFor({ companies: [{ role: 'Company Admin', is_setup_operator: false }] }).isSetupOperator
    ).toBe(false);
    // The name suffix alone is not the signal (an attached account does not carry it).
    expect(
      roleFor({ last_name: 'Munoz (Trazo setup)', companies: [{ role: 'Company Admin' }] })
        .isSetupOperator
    ).toBe(false);
  });
});
