/**
 * A filed § 205.406(a) update is never edited from this card, and an edit never re-sends the
 * plan it continues or a filing date.
 *
 * WHY THIS EXISTS
 * ---------------
 * OSP alignment audit 2026-10, T20. Until 2026-10-01 the card offered Edit on every filing
 * the certifier had not acknowledged, and every save PATCHed `prior_osp: <plan on file today>`
 * and, with the box ticked, `submitted_at: new Date()`. Editing last year's filing therefore
 * re-pointed it at this year's plan, and re-saving a filed one sent a new filing date that the
 * server then refused. The server now refuses edits to a signed or filed revision (409) and
 * refuses `submitted_at` in any edit; this file holds the card to the same rule from its side.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const updateUpdate = vi.fn((_args: { data: Record<string, unknown> }) => ({
  unwrap: () => Promise.resolve({})
}));
const correctUpdate = vi.fn((_args: Record<string, unknown>) => ({
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
const filed = {
  id: 5,
  reporting_year: 2026,
  revision_number: 1,
  changes_summary: 'Grandevo added in February.',
  additions: [],
  deletions: [],
  prior_osp: 59,
  prior_osp_version: 1,
  signed_at: '2026-08-20T10:00:00Z',
  submitted_at: '2026-08-21T11:37:30Z',
  filing_method: 'agent_web_form',
  is_locked: true
};

vi.mock('store/api/ospAnnualUpdateApi', () => ({
  useGetOSPAnnualUpdatesQuery: () => ({ data: [draft, filed] }),
  useCreateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOSPAnnualUpdateMutation: () => [updateUpdate, { isLoading: false }],
  useSignOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useFileOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useCorrectOSPAnnualUpdateMutation: () => [correctUpdate, { isLoading: false }],
  useWithdrawOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useGetCompanyDetailsReviewQuery: () => ({ data: undefined, isLoading: false }),
  useConfirmCompanyDetailsMutation: () => [vi.fn(), { isLoading: false }],
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
          planOnFile={{ id: 65, version_number: 4, status: 'active' } as any}
          currentYear={2027}
        />
      </IntlProvider>
    </ChakraProvider>
  );

const rowFor = (text: RegExp) => screen.getByText(text).closest('div[class]')!.parentElement!;

describe('annual update revisions are not edited', () => {
  it('an edit sends content only: never prior_osp, never submitted_at', async () => {
    updateUpdate.mockClear();
    renderCard();
    fireEvent.click(within(rowFor(/Hedgerow extended\./)).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText(/Summary of Changes/i), {
      target: { value: 'Hedgerow extended to the east line.' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Update Filing/i }));
    await Promise.resolve();
    expect(updateUpdate).toHaveBeenCalledTimes(1);
    const data = updateUpdate.mock.calls[0]?.[0].data ?? {};
    expect(data).not.toHaveProperty('prior_osp');
    expect(data).not.toHaveProperty('submitted_at');
    expect(data.changes_summary).toBe('Hedgerow extended to the east line.');
  });

  it('a filed revision offers a correction and no Edit', () => {
    renderCard();
    const row = rowFor(/Grandevo added in February\./);
    expect(within(row).queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(within(row).getByRole('button', { name: 'Create correction' })).toBeInTheDocument();
    expect(within(row).getByText('Filed')).toBeInTheDocument();
  });

  it('a draft offers Edit and Sign, and no correction', () => {
    renderCard();
    const row = rowFor(/Hedgerow extended\./);
    expect(within(row).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Sign' })).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Create correction' })).toBeNull();
  });

  it('there is no "filed with my certifier" box that stamps a date on save', () => {
    renderCard();
    expect(screen.queryByText(/Filed with my certifier/)).toBeNull();
  });
});
