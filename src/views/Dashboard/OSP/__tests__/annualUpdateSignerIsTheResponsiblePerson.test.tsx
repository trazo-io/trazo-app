/**
 * The sign box names the operation's responsible person as the signer and the account as the
 * recorder (recordkeeping review S7, F-23, 2026-10-07). The name is read from the farm profile
 * and never typed into the payload; the sign action sends the title only. Red on the old card.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const signUpdate = vi.fn((_args: { data: Record<string, unknown> }) => ({
  unwrap: () => Promise.resolve({})
}));

const draft = {
  id: 7,
  reporting_year: 2027,
  revision_number: 1,
  changes_summary: 'Hedgerow extended.',
  additions: [],
  deletions: [],
  prior_osp: 61,
  prior_osp_version: 3,
  submitted_at: null,
  signed_at: null,
  is_locked: false
};

vi.mock('store/api/ospAnnualUpdateApi', () => ({
  useGetOSPAnnualUpdatesQuery: () => ({ data: [draft] }),
  useCreateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useSignOSPAnnualUpdateMutation: () => [signUpdate, { isLoading: false }],
  useFileOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useCorrectOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useWithdrawOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  FILING_METHODS: ['agent_web_form', 'agent_portal', 'email', 'mail', 'in_person']
}));

import OSPAnnualUpdateCard from '../OSPAnnualUpdateCard';

const renderCard = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <OSPAnnualUpdateCard
          companyId="1"
          farmId="2"
          planOnFile={{ id: 61, version_number: 3, status: 'active' } as any}
          currentYear={2027}
          signer={{ responsiblePerson: 'Laurel Brandt', account: 'Pass Owner' }}
        />
      </IntlProvider>
    </ChakraProvider>
  );

const row = (text: RegExp) =>
  screen.getByText(text).closest('div[class]')!.parentElement!.parentElement!;

describe('the annual update signer', () => {
  it('is the responsible person, read-only, with the account named as the recorder', async () => {
    signUpdate.mockClear();
    renderCard();
    fireEvent.click(within(row(/Hedgerow extended\./)).getByRole('button', { name: 'Sign' }));
    const signer = screen.getByLabelText(
      /Signed by \(the responsible person\)/
    ) as HTMLInputElement;
    expect(signer.value).toBe('Laurel Brandt');
    expect(signer).toHaveAttribute('readonly');
    expect(screen.getByText(/Recorded in Trazo by Pass Owner/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Title \(optional\)/), { target: { value: 'Owner' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign this update|Confirm/i }));
    await Promise.resolve();
    expect(signUpdate).toHaveBeenCalledTimes(1);
    expect(signUpdate.mock.calls[0]?.[0].data).toEqual({ signer_title: 'Owner' });
  });

  it('defaults the continuation year to the next unfiled year', () => {
    renderCard();
    expect((screen.getByLabelText(/Continuation year/i) as HTMLInputElement).value).toBe('2028');
  });
});
