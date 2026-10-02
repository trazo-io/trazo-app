/**
 * A correction says what it corrects, and only a correction is asked to.
 *
 * Run 3 of the OSP alignment audit (2026-10-02): a corrected filing that does not say what it
 * corrects leaves a reader to diff two PDFs. The backend prints `correction_note` on the revision's
 * own filed document and signs it with the rest; this card is where the operator writes it.
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

const firstDraft = {
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
const correction = {
  id: 9,
  reporting_year: 2026,
  revision_number: 3,
  corrects: 8,
  changes_summary: 'Grandevo added in February.',
  correction_note: '',
  additions: [],
  deletions: [],
  prior_osp: 59,
  prior_osp_version: 1,
  submitted_at: null,
  signed_at: null,
  is_locked: false
};

vi.mock('store/api/ospAnnualUpdateApi', () => ({
  useGetOSPAnnualUpdatesQuery: () => ({ data: [firstDraft, correction] }),
  useCreateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOSPAnnualUpdateMutation: () => [updateUpdate, { isLoading: false }],
  useSignOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
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
          planOnFile={{ id: 65, version_number: 4, status: 'active' } as any}
          currentYear={2027}
        />
      </IntlProvider>
    </ChakraProvider>
  );

const rowFor = (text: RegExp) => screen.getByText(text).closest('div[class]')!.parentElement!;

const save = async () => {
  fireEvent.click(screen.getByRole('button', { name: /Update Filing/i }));
  await Promise.resolve();
};

describe('a correction says what it corrects', () => {
  it('editing a correction asks for the note and sends it', async () => {
    updateUpdate.mockClear();
    renderCard();
    fireEvent.click(
      within(rowFor(/Grandevo added in February\./)).getByRole('button', { name: 'Edit' })
    );
    const note = screen.queryByTestId('annual-update-correction-note');
    expect(note).toBeInTheDocument();
    fireEvent.change(note!, {
      target: { value: 'Revision 2 said no split production; there is.' }
    });
    await save();
    expect(updateUpdate).toHaveBeenCalledTimes(1);
    expect(updateUpdate.mock.calls[0]?.[0].data.correction_note).toBe(
      'Revision 2 said no split production; there is.'
    );
  });

  it('a first revision is never asked what it corrects, and sends no note', async () => {
    updateUpdate.mockClear();
    renderCard();
    fireEvent.click(within(rowFor(/Hedgerow extended\./)).getByRole('button', { name: 'Edit' }));
    expect(screen.queryByTestId('annual-update-correction-note')).toBeNull();
    await save();
    expect(updateUpdate).toHaveBeenCalledTimes(1);
    expect(updateUpdate.mock.calls[0]?.[0].data).not.toHaveProperty('correction_note');
  });
});
