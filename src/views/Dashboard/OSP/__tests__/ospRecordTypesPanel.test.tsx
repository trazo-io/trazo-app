/**
 * The § 11 registry panel, rendered — the boundary is a UI rule as much as a server rule.
 *
 * Two things a farmer can do on this panel would put a statement in front of a certifier that
 * they never made, and neither is visible in the server tests:
 *
 *   1. A "confirm everything suggested" control. The server accepts many keys in one request
 *      because the panel BATCHES ticks; a single button that ticks rows nobody read would use
 *      the same endpoint and be indistinguishable in the packet.
 *   2. Confirming the free-text "Other" row with no name — a tick with nothing under it. The
 *      server refuses it, so offering the control at all is offering a rejection.
 *
 * The batching itself is asserted too: ticking three rows in a row is ONE request, and the
 * checkbox answers the tap before that request goes.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';

const confirmRecordTypes = vi.fn();

const row = (over: Record<string, unknown>) => ({
  key: 'harvest_records',
  label: 'Harvest records',
  group: 'What types of records do you maintain for organic crop production?',
  cfr_cite: '7 CFR 205.103(b)(2)',
  status: 'evidenced_in_trazo',
  count: 34,
  basis: '34 harvest events logged',
  external_by_design: false,
  free_text: false,
  custom_label: null,
  suggested: true,
  confirmed: false,
  confirmed_at: null,
  confirmed_by: null,
  ...over
});

const ROWS = [
  row({}),
  row({
    key: 'planting_records',
    label: 'Planting records',
    count: 7,
    basis: '7 planting events logged'
  }),
  row({ key: 'tillage', label: 'Tillage', count: 6, basis: '6 tillage events logged' }),
  row({
    key: 'other_records',
    label: 'Other records maintained (describe)',
    group: 'What types of general production and management records do you maintain?',
    status: 'not_evidenced_in_trazo',
    count: 0,
    basis: '',
    external_by_design: true,
    free_text: true,
    suggested: false
  })
];

vi.mock('store/api/ospApi', () => ({
  useGetOSPRecordTypesQuery: () => ({
    data: {
      summary: {
        total: 4,
        evidenced: 3,
        confirmed: 0,
        awaiting_confirmation: 3,
        external_by_design: 1,
        evidence_check_failed: 0
      },
      record_types: ROWS
    },
    isLoading: false,
    isError: false
  }),
  useConfirmOSPRecordTypesMutation: () => [confirmRecordTypes, { isLoading: false }],
  // Attachments are RENDERED here on purpose. Their row label is the most intricate ICU string
  // in the panel — nested plurals with a `select` separator and a zero-case — and nothing
  // exercised it, so a malformed message would have thrown at runtime in front of a farmer and
  // passed every test.
  useGetOSPAttachmentsQuery: () => ({
    data: {
      workbooks: [
        {
          key: 'field_and_crop_information',
          title: 'Field and Crop Information Form',
          rows: 6,
          blank_cells: 6,
          missing_from_records: 6,
          needs_your_answer: 0,
          optional_blanks: 0,
          error: false
        },
        {
          key: 'crop_livestock_product_list',
          title: 'Crop/Livestock Product List',
          rows: 4,
          blank_cells: 0,
          missing_from_records: 0,
          needs_your_answer: 0,
          optional_blanks: 36,
          error: false
        },
        {
          key: 'supplier_list',
          title: 'Supplier List',
          rows: 16,
          blank_cells: 17,
          missing_from_records: 1,
          needs_your_answer: 16,
          optional_blanks: 32,
          error: false
        }
      ]
    }
  })
}));

const { default: OSPRecordTypesPanel } = await import('../OSPRecordTypesPanel');

const renderPanel = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <OSPRecordTypesPanel
          companyId="7"
          farmId="3"
          osp={{ id: '11', status: 'draft', version_number: 1 } as never}
        />
      </IntlProvider>
    </ChakraProvider>
  );

describe('OSP § 11 registry panel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    confirmRecordTypes.mockReset();
    confirmRecordTypes.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('offers no way to confirm rows in bulk', () => {
    renderPanel();
    const bulk = screen
      .getAllByRole('button')
      .map((b) => b.textContent?.toLowerCase() ?? '')
      .filter((text) => /all|todos|everything/.test(text));
    expect(bulk).toEqual([]);
  });

  it('renders an evidenced-but-unconfirmed row unticked', () => {
    renderPanel();
    expect(screen.getByLabelText(/Harvest records/i)).not.toBeChecked();
  });

  it('sends one request for a run of ticks, and ticks the box before it goes', async () => {
    renderPanel();
    fireEvent.click(screen.getByLabelText(/Harvest records/i));
    fireEvent.click(screen.getByLabelText(/Planting records/i));
    fireEvent.click(screen.getByLabelText(/Tillage/i));

    // The tick is visible immediately — the operator is not waiting on the network.
    expect(screen.getByLabelText(/Harvest records/i)).toBeChecked();
    expect(confirmRecordTypes).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    expect(confirmRecordTypes).toHaveBeenCalledTimes(1);
    expect(confirmRecordTypes.mock.calls[0][0]).toMatchObject({
      keys: ['harvest_records', 'planting_records', 'tillage'],
      confirmed: true
    });
  });

  it('counts only work that is actually work', () => {
    renderPanel();
    // 36 optional blanks — the export-equivalency columns a domestic grower opts out of on the
    // sheet's own declaration, plus Comments. Reporting them as homework is what made this
    // panel read as noise.
    expect(screen.getByText('4 rows · nothing left to fill')).toBeInTheDocument();
    expect(screen.getByText('6 rows · 6 cells to fill in Trazo')).toBeInTheDocument();
    expect(
      screen.getByText('16 rows · 1 cell to fill in Trazo · 16 cells only you can answer')
    ).toBeInTheDocument();
  });

  it('will not confirm the free-text row until the operator names it', async () => {
    renderPanel();
    const input = screen.getByPlaceholderText(/Name the record type/i);
    // Identified by BEHAVIOUR, not by position: the free-text row's Confirm is the only one on
    // the panel that starts disabled, because it is the only one that needs a value first.
    const disabledConfirms = () =>
      screen.getAllByRole('button', { name: 'Confirm' }).filter((b) => b.hasAttribute('disabled'));
    expect(disabledConfirms()).toHaveLength(1);
    const confirmButton = disabledConfirms()[0];

    fireEvent.change(input, { target: { value: 'Pool closings from the huller' } });
    expect(disabledConfirms()).toHaveLength(0);

    await act(async () => {
      fireEvent.click(confirmButton);
    });
    expect(confirmRecordTypes).toHaveBeenCalledWith(
      expect.objectContaining({
        keys: ['other_records'],
        confirmed: true,
        label: 'Pool closings from the huller'
      })
    );
  });
});
