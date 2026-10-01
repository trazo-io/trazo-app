/**
 * The revision actions on the annual update card, as the review of app #57 found them.
 *
 * Each case below failed before its fix:
 *  - a correction draft could never be saved: the duplicate-year check counted the revision it
 *    corrects as a clash;
 *  - Create correction fired on one click, with no confirmation, unlike every other action;
 *  - a withdrawal reason typed on one row and cancelled was still there on the next row's panel;
 *  - "Record as filed" could be confirmed with the date cleared;
 *  - a signed revision that already has a correction still offered Record filing;
 *  - Filed, Corrected and Withdrawn all rendered as the same grey badge.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const ok = () => ({ unwrap: () => Promise.resolve({}) });
const updateUpdate = vi.fn((_args: { data: Record<string, unknown> }) => ok());
const correctUpdate = vi.fn((_args: Record<string, unknown>) => ok());

const base = { additions: [], deletions: [], prior_osp: 59, prior_osp_version: 1 };
const filedA = {
  ...base,
  id: 1,
  reporting_year: 2026,
  revision_number: 1,
  changes_summary: 'Row A filed.',
  signed_at: '2026-08-20T10:00:00Z',
  submitted_at: '2026-08-21T12:00:00Z',
  is_locked: true
};
const correctionOfA = {
  ...base,
  id: 2,
  reporting_year: 2026,
  revision_number: 2,
  corrects: 1,
  changes_summary: 'Row A corrected.',
  submitted_at: null,
  signed_at: null,
  is_locked: false
};
const filedB = {
  ...base,
  id: 3,
  reporting_year: 2025,
  revision_number: 1,
  changes_summary: 'Row B filed.',
  signed_at: '2025-02-01T10:00:00Z',
  submitted_at: '2025-02-02T12:00:00Z',
  is_locked: true
};
const signedC = {
  ...base,
  id: 4,
  reporting_year: 2024,
  revision_number: 1,
  changes_summary: 'Row C signed.',
  signed_at: '2024-02-01T10:00:00Z',
  submitted_at: null,
  is_locked: true
};

vi.mock('store/api/ospAnnualUpdateApi', () => ({
  useGetOSPAnnualUpdatesQuery: () => ({ data: [filedA, correctionOfA, filedB, signedC] }),
  useCreateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOSPAnnualUpdateMutation: () => [updateUpdate, { isLoading: false }],
  useSignOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useFileOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useCorrectOSPAnnualUpdateMutation: () => [correctUpdate, { isLoading: false }],
  useWithdrawOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  FILING_METHODS: ['agent_web_form', 'agent_portal', 'email', 'mail', 'in_person']
}));

import OSPAnnualUpdateCard, { STATE_BADGE } from '../OSPAnnualUpdateCard';

const renderCard = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <OSPAnnualUpdateCard
          companyId="1"
          farmId="2"
          planOnFile={{ id: 61, version_number: 3, status: 'active' } as any}
          currentYear={2027}
        />
      </IntlProvider>
    </ChakraProvider>
  );

const row = (text: RegExp) =>
  screen.getByText(text).closest('div[class]')!.parentElement!.parentElement!;

describe('annual update revision actions', () => {
  it('saves a correction draft that shares its year with the revision it corrects', async () => {
    updateUpdate.mockClear();
    renderCard();
    fireEvent.click(within(row(/Row A corrected\./)).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText(/Summary of Changes/i), {
      target: { value: 'Row A corrected, again.' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Update Filing/i }));
    await Promise.resolve();
    expect(updateUpdate).toHaveBeenCalledTimes(1);
  });

  it('asks before opening a correction', () => {
    correctUpdate.mockClear();
    renderCard();
    fireEvent.click(
      within(row(/Row B filed\./)).getByRole('button', { name: 'Create correction' })
    );
    expect(correctUpdate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Open a correction' })).toBeInTheDocument();
  });

  it('starts every action panel empty, whatever was typed and cancelled before', () => {
    renderCard();
    fireEvent.click(within(row(/Row A filed\./)).getByRole('button', { name: 'Withdraw' }));
    fireEvent.change(screen.getByLabelText(/Why is this filing withdrawn/), {
      target: { value: 'Sent to the wrong agent.' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(within(row(/Row B filed\./)).getByRole('button', { name: 'Withdraw' }));
    expect(
      (screen.getByLabelText(/Why is this filing withdrawn/) as HTMLTextAreaElement).value
    ).toBe('');
    expect(screen.getByRole('button', { name: 'Withdraw filing' })).toBeDisabled();
  });

  it('cannot record a filing with no date', () => {
    renderCard();
    fireEvent.click(within(row(/Row C signed\./)).getByRole('button', { name: 'Record filing' }));
    fireEvent.change(screen.getByLabelText(/Date filed with your certifier/), {
      target: { value: '' }
    });
    expect(screen.getByRole('button', { name: 'Record as filed' })).toBeDisabled();
  });

  it('offers no second correction on a revision that has one; a signed revision offers both actions', () => {
    renderCard();
    const a = row(/Row A filed\./);
    expect(within(a).queryByRole('button', { name: 'Create correction' })).toBeNull();
    const c = row(/Row C signed\./);
    expect(within(c).getByRole('button', { name: 'Record filing' })).toBeInTheDocument();
    expect(within(c).getByRole('button', { name: 'Create correction' })).toBeInTheDocument();
  });

  it('colours each state by its meaning', () => {
    expect(STATE_BADGE.filed).toBe('subtle');
    expect(STATE_BADGE.withdrawn).toBe('danger');
    expect(STATE_BADGE.draft).toBe('warning');
    expect(new Set(Object.values(STATE_BADGE)).size).toBeGreaterThanOrEqual(4);
  });
});
