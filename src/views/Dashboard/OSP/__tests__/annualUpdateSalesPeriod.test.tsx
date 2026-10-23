/**
 * The annual update states the 12 months the operation reports its sales for.
 *
 * Oregon Tilth's OSP Update Step 6 asks for a full 12-month period kept the same year to year; the
 * packet printed a calendar-year subtotal beside it. The operator now states the period here and
 * document 02 counts sales inside it. Half a period is refused before a round trip, an empty one
 * is sent as null ("not stated"), and last year's period is shown as a hint, never filled in.
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

const lastYear = {
  id: 5,
  reporting_year: 2026,
  revision_number: 2,
  changes_summary: 'Codling moth traps moved.',
  additions: [],
  deletions: [],
  prior_osp: 59,
  prior_osp_version: 2,
  sales_period_start: '2024-10-01',
  sales_period_end: '2025-09-30',
  submitted_at: '2025-11-03T00:00:00Z',
  signed_at: '2025-11-03T00:00:00Z',
  is_locked: true
};
// Revision 1 of 2026 stated the calendar year; the agent wanted Oct-Sep, so revision 2 corrected it
// and revision 1 was superseded. Listed first, as a server may return it.
const supersededLastYear = {
  ...lastYear,
  id: 4,
  revision_number: 1,
  sales_period_start: '2024-01-01',
  sales_period_end: '2024-12-31',
  superseded_at: '2025-11-10T00:00:00Z'
};
const draft = {
  id: 7,
  reporting_year: 2027,
  revision_number: 1,
  changes_summary: 'Hedgerow extended.',
  additions: [],
  deletions: [],
  prior_osp: 61,
  prior_osp_version: 3,
  sales_period_start: null,
  sales_period_end: null,
  submitted_at: null,
  signed_at: null,
  is_locked: false
};

vi.mock('store/api/ospAnnualUpdateApi', () => ({
  useGetOSPAnnualUpdatesQuery: () => ({ data: [supersededLastYear, lastYear, draft] }),
  useCreateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOSPAnnualUpdateMutation: () => [updateUpdate, { isLoading: false }],
  useSignOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useFileOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useCorrectOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useWithdrawOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  FILING_METHODS: ['agent_web_form', 'agent_portal', 'email', 'mail', 'in_person']
}));

import OSPAnnualUpdateCard from '../OSPAnnualUpdateCard';

// jsdom has no layout; the card scrolls the first field error into view.
Element.prototype.scrollIntoView = vi.fn();

const renderCard = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS}>
        <OSPAnnualUpdateCard
          companyId="1"
          farmId="2"
          planOnFile={{ id: 61, version_number: 3, status: 'active' } as any}
          currentYear={2027}
        />
      </IntlProvider>
    </ChakraProvider>
  );

const rowFor = (text: RegExp) => screen.getByText(text).closest('div[class]')!.parentElement!;

const editDraft = () => {
  renderCard();
  fireEvent.click(within(rowFor(/Hedgerow extended\./)).getByRole('button', { name: 'Edit' }));
};

const save = async () => {
  fireEvent.click(screen.getByRole('button', { name: /Update Filing/i }));
  await Promise.resolve();
};

describe('the sales period on the annual update', () => {
  it('sends both dates the operator states', async () => {
    updateUpdate.mockClear();
    editDraft();
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2025-10-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-30' } });
    await save();
    expect(updateUpdate).toHaveBeenCalledTimes(1);
    const data = updateUpdate.mock.calls[0]?.[0].data;
    expect(data.sales_period_start).toBe('2025-10-01');
    expect(data.sales_period_end).toBe('2026-09-30');
  });

  it('refuses half a period before the round trip', async () => {
    updateUpdate.mockClear();
    editDraft();
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2025-10-01' } });
    await save();
    expect(updateUpdate).not.toHaveBeenCalled();
    expect(screen.getByText(/State both ends of the sales period/)).toBeInTheDocument();
  });

  it('sends an empty period as null, never as an empty string', async () => {
    updateUpdate.mockClear();
    editDraft();
    await save();
    const data = updateUpdate.mock.calls[0]?.[0].data;
    expect(data.sales_period_start).toBeNull();
    expect(data.sales_period_end).toBeNull();
  });

  it("shows last year's period as a hint, on the calendar dates stored, and fills nothing in", () => {
    editDraft();
    // formatDateOnly: 2024-10-01 is 1 October in every timezone, not 30 September.
    expect(
      screen.getByText(/Your 2026 update used Oct 1, 2024 to Sep 30, 2025/)
    ).toBeInTheDocument();
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('');
  });

  it('takes the hint from the revision the year stands on, never a superseded one', () => {
    editDraft();
    expect(screen.queryByText(/Jan 1, 2024 to Dec 31, 2024/)).toBeNull();
  });
});
