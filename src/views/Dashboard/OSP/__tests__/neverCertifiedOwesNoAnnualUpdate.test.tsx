/**
 * An operation that was never certified is not asked for the § 205.406(a) annual update
 * (walkthrough 2026-11-20, W4).
 *
 * The OSP page of a farm with no certificate showed "OSP Annual Continuation (7 CFR 205.406) Each
 * year, a certified operation must file an update ... This filing continues OSP v1" and "No annual
 * update recorded for 2026", while the packet cover for the same farm said no annual update
 * applies and the plan supports a first application under § 205.401. The plan list now carries the
 * cover's own test (`never_certified`), and the page reads it.
 */
import React from 'react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';
import es419 from 'i18n/lang/es-419.json';

const filedUpdate = {
  id: 7,
  reporting_year: 2026,
  revision_number: 1,
  changes_summary: '',
  additions: [],
  deletions: [],
  prior_osp: 61,
  prior_osp_version: 1,
  signed_at: null,
  submitted_at: null,
  is_locked: false
};
const query = vi.fn((_args: unknown, _opts: { skip?: boolean }) => ({ data: [] as unknown[] }));

vi.mock('store/api/ospAnnualUpdateApi', () => ({
  useGetOSPAnnualUpdatesQuery: (args: unknown, opts: { skip?: boolean }) => query(args, opts),
  useCreateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useSignOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useFileOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useCorrectOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useWithdrawOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useGetCompanyDetailsReviewQuery: () => ({ data: undefined, isLoading: false }),
  useConfirmCompanyDetailsMutation: () => [vi.fn(), { isLoading: false }],
  FILING_METHODS: ['agent_web_form', 'agent_portal', 'email', 'mail', 'in_person']
}));

import { OSPRenewalSummary } from '../OSPAnnualUpdateCard';

const renderSummary = (firstApplication: boolean, locale = 'en-US') =>
  render(
    <ChakraProvider>
      <IntlProvider
        locale={locale}
        messages={(locale === 'en-US' ? enUS : es419) as Record<string, string>}>
        <OSPRenewalSummary
          companyId="1"
          farmId="2"
          currentYear={2026}
          firstApplication={firstApplication}
        />
      </IntlProvider>
    </ChakraProvider>
  );

describe('the renewal line above the plan', () => {
  it('a never-certified operation reads that no annual update applies, and how one would', () => {
    renderSummary(true);
    const text = screen.getByTestId('osp-renewal-summary').textContent!;
    expect(text).toContain('so no annual update (§ 205.406(a)) applies');
    expect(text).toContain('A first application is made under § 205.401');
    expect(text).toContain('add its certificate to the farm profile');
    expect(text).not.toContain('No annual update recorded');
  });

  it('does not ask the server for filings it will not show', () => {
    query.mockClear();
    renderSummary(true);
    expect(query.mock.calls.every(([, opts]) => opts.skip === true)).toBe(true);
  });

  it('reads in Spanish', () => {
    renderSummary(true, 'es-419');
    expect(screen.getByTestId('osp-renewal-summary').textContent).toContain(
      'no corresponde la actualización anual (§ 205.406(a))'
    );
  });

  it('an operation that holds a certificate keeps the annual update line', () => {
    query.mockReturnValue({ data: [] });
    renderSummary(false);
    expect(screen.getByTestId('osp-renewal-summary').textContent).toBe(
      'No annual update recorded for 2026. It is below the plan.'
    );
  });

  it('a filing already on record is still shown when the flag is off', () => {
    query.mockReturnValue({ data: [filedUpdate] });
    renderSummary(false);
    expect(screen.getByTestId('osp-renewal-summary').textContent).toContain('Annual update 2026');
  });
});

describe('the OSP page', () => {
  // Read from source: mounting OSPView needs a dozen queries, and the rule is one guard.
  const src = readFileSync(resolve(__dirname, '../OSPView.tsx'), 'utf8');

  it("reads the plan list's never_certified, the packet cover's own test", () => {
    expect(src).toMatch(/const firstApplication = annualUpdateTarget\?\.never_certified === true;/);
    expect(src).toMatch(/firstApplication=\{firstApplication\}/);
  });

  it('leaves the annual update card out for a never-certified operation', () => {
    expect(src).toMatch(/\{companyId && farmId && !firstApplication && \(\s*<OSPAnnualUpdateCard/);
  });
});
