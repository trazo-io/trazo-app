/**
 * CorrectRecordModal — the only way to fix a value on a FILED record.
 *
 * Events on a finished production are locked (the API answers 423), because the certifier
 * packet is built from them. This modal is the escape hatch that keeps "locked" from
 * meaning "wrong forever". Two things therefore matter more than usual:
 *
 *   1. It must not let a farmer write a correction that is missing its REASON. The reason
 *      is what an inspector reads; a correction without one raises the question it was
 *      meant to answer. The backend enforces this, and so must the button.
 *   2. It must not blank a value by accident. "What it should be" is marked required with
 *      an asterisk — `isRequired` on a Chakra FormControl renders that asterisk and
 *      enforces NOTHING, so the disabled state has to be asserted, not assumed.
 *
 * The field list is asserted too: a harvest event carries ~79 correctable columns and a
 * real record fills a handful, so the primary dropdown shows only what is ON the record.
 * Regressing that back to a flat list turns a 30-second fix into a search.
 */
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import theme from '../../../theme/theme';
import enMessages from '../../../i18n/lang/en-US.json';
import esMessages from '../../../i18n/lang/es-419.json';

const amendMock = vi.fn();
const queryState: { data: any; isLoading: boolean } = { data: undefined, isLoading: false };
const amendSeasonMock = vi.fn();
const seasonQueryState: { data: any; isLoading: boolean } = { data: undefined, isLoading: false };

vi.mock('store/api/amendmentsApi', () => ({
  useGetEventAmendmentsQuery: () => queryState,
  useAmendEventMutation: () => [amendMock, { isLoading: false }],
  // F7 (2026-08-21) — the same modal corrects the SEASON HEADER when given `productionId`
  // instead of an event. Both hooks are called on every render (React rules), so a mock that
  // omits them throws before a single assertion runs.
  useGetSeasonAmendmentsQuery: () => seasonQueryState,
  useAmendSeasonMutation: () => [amendSeasonMock, { isLoading: false }]
}));

import { CorrectRecordModal } from '../CorrectRecordModal';

const FIELDS_ON_RECORD = [
  { name: 'performed_by', label: 'performed by', current_value: 'Paula Rivas' },
  { name: 'yield_quantity', label: 'yield quantity', current_value: 200 }
];
const FIELDS_NOT_RECORDED = [
  { name: 'storage_location', label: 'storage location', current_value: null },
  { name: 'rootstock', label: 'rootstock', current_value: null }
];

const renderModal = (locale: 'en-US' | 'es-419' = 'en-US') =>
  render(
    <ChakraProvider theme={theme}>
      <IntlProvider
        locale={locale}
        messages={locale === 'en-US' ? enMessages : (esMessages as any)}>
        <CorrectRecordModal isOpen onClose={vi.fn()} eventId={423} eventType={7} />
      </IntlProvider>
    </ChakraProvider>
  );

describe('CorrectRecordModal', () => {
  beforeEach(() => {
    amendMock.mockReset();
    amendSeasonMock.mockReset();
    amendSeasonMock.mockReturnValue({ unwrap: () => Promise.resolve({ id: 9 }) });
    seasonQueryState.data = {
      is_finished: true,
      fields: [
        { name: 'production_amount', label: 'Production amount', current_value: 2150 },
        { name: 'lot_id', label: 'Lot ID', current_value: 'CBF-25-HFE' }
      ],
      amendments: []
    };
    seasonQueryState.isLoading = false;
    amendMock.mockReturnValue({ unwrap: () => Promise.resolve({ id: 1 }) });
    queryState.data = {
      event_type: 7,
      fields: FIELDS_ON_RECORD,
      blank_fields: FIELDS_NOT_RECORDED,
      amendments: []
    };
    queryState.isLoading = false;
  });

  it('offers only the fields the record actually carries', () => {
    renderModal();
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toContain('performed by');
    expect(options).toContain('yield quantity');
    // The ~79-column tail stays behind the toggle.
    expect(options).not.toContain('storage location');
    expect(options).not.toContain('rootstock');
  });

  it('reveals the remaining fields on request, and says how many', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /show all 2 fields/i }));

    const options = Array.from(screen.getByRole('combobox').querySelectorAll('option')).map(
      (o) => o.textContent
    );
    expect(options).toContain('storage location');
    expect(options).toContain('performed by');
  });

  it('exposes the reveal as a real button, not an anchor without an href', () => {
    renderModal();
    // A Chakra <Link> with no href renders an <a> that keyboard users cannot reach.
    const reveal = screen.getByRole('button', { name: /show all 2 fields/i });
    expect(reveal.tagName).toBe('BUTTON');
  });

  it('shows the current value read-only rather than pre-filling it', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.selectOptions(screen.getByRole('combobox'), 'performed_by');

    expect(screen.getByText('Paula Rivas')).toBeInTheDocument();
    // Pre-filling invites editing a character instead of re-entering the measured value.
    expect(screen.getByRole('textbox', { name: /what it should be/i })).toHaveValue('');
  });

  it('will not submit without a reason', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.selectOptions(screen.getByRole('combobox'), 'performed_by');
    await user.type(screen.getByRole('textbox', { name: /what it should be/i }), 'P. Rivas-Mendez');

    expect(screen.getByRole('button', { name: /save correction/i })).toBeDisabled();
    expect(amendMock).not.toHaveBeenCalled();
  });

  it('will not submit on whitespace masquerading as a reason', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.selectOptions(screen.getByRole('combobox'), 'performed_by');
    await user.type(screen.getByRole('textbox', { name: /what it should be/i }), 'P. Rivas-Mendez');
    await user.type(screen.getByRole('textbox', { name: /why is it being corrected/i }), '   ');

    expect(screen.getByRole('button', { name: /save correction/i })).toBeDisabled();
  });

  it('will not blank a value: the new value is enforced, not just asterisked', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.selectOptions(screen.getByRole('combobox'), 'performed_by');
    await user.type(
      screen.getByRole('textbox', { name: /why is it being corrected/i }),
      'Recorded in error.'
    );

    // isRequired on a Chakra FormControl renders an asterisk and enforces nothing.
    expect(screen.getByRole('button', { name: /save correction/i })).toBeDisabled();
    expect(amendMock).not.toHaveBeenCalled();
  });

  it('submits field, value and trimmed reason once all three are present', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.selectOptions(screen.getByRole('combobox'), 'performed_by');
    await user.type(screen.getByRole('textbox', { name: /what it should be/i }), 'P. Rivas-Mendez');
    await user.type(
      screen.getByRole('textbox', { name: /why is it being corrected/i }),
      '  Matches the signed weigh ticket.  '
    );

    await user.click(screen.getByRole('button', { name: /save correction/i }));

    await waitFor(() => expect(amendMock).toHaveBeenCalledTimes(1));
    expect(amendMock).toHaveBeenCalledWith({
      eventId: 423,
      eventType: 7,
      field_name: 'performed_by',
      new_value: 'P. Rivas-Mendez',
      reason: 'Matches the signed weigh ticket.'
    });
  });

  it('lists corrections already on the record, both values and the reason', () => {
    queryState.data = {
      ...queryState.data,
      amendments: [
        {
          id: 9,
          field_name: 'yield_quantity',
          field_label: 'yield quantity',
          original_value: '200',
          corrected_value: '2000',
          reason: 'Transcription error.',
          amended_by: 'packet@test.com',
          created_at: '2026-08-18T10:00:00Z'
        }
      ]
    };
    renderModal();
    expect(screen.getByText(/200\s*→\s*2000/)).toBeInTheDocument();
    expect(screen.getByText(/Transcription error/)).toBeInTheDocument();
  });

  it('tells the farmer why the reason matters, in both locales', () => {
    const { unmount } = renderModal('en-US');
    expect(screen.getByText(/Your inspector reads this/i)).toBeInTheDocument();
    unmount();

    renderModal('es-419');
    expect(screen.getByText(/Tu inspector lee esto/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------------------
  // F7 (2026-08-21) — the same sheet, pointed at the SEASON HEADER.
  //
  // The lot header (`production_amount`, `lot_id`, `quality_grade`, `harvest_method`) is
  // frozen once a season is finished and had NO correction path at all, while every event
  // under it did: a farmer who finished with the wrong yield could neither edit it (423) nor
  // amend it, and the only repair was a developer with ORM access.
  // ---------------------------------------------------------------------------------------
  describe('season-header mode', () => {
    const renderHeader = () =>
      render(
        <ChakraProvider theme={theme}>
          <IntlProvider locale="en-US" messages={enMessages}>
            <CorrectRecordModal isOpen onClose={vi.fn()} productionId="uuid-695" />
          </IntlProvider>
        </ChakraProvider>
      );

    it('offers the lot-header fields and none of the event ones', () => {
      renderHeader();
      const select = screen.getByRole('combobox');
      const options = within(select)
        .getAllByRole('option')
        .map((o) => o.textContent);
      expect(options).toContain('Production amount');
      expect(options).toContain('Lot ID');
      // The event sheet's fields must not leak in — the two modes share a component, and a
      // header sheet offering `performed_by` would be correcting a record it is not showing.
      expect(options).not.toContain('performed by');
    });

    it('has no "show all" toggle — the header is five fields and hiding one hides the wrong one', () => {
      renderHeader();
      expect(screen.queryByText(/show/i)).toBeNull();
    });

    it('submits through the SEASON endpoint, not the event one', async () => {
      renderHeader();
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'production_amount' } });
      const boxes = screen.getAllByRole('textbox');
      fireEvent.change(boxes[0], { target: { value: '118750' } });
      fireEvent.change(boxes[boxes.length - 1], {
        target: { value: '  Header was filled from the buffer-row pick.  ' }
      });
      fireEvent.click(screen.getByRole('button', { name: /save correction/i }));

      await waitFor(() => expect(amendSeasonMock).toHaveBeenCalledTimes(1));
      expect(amendMock).not.toHaveBeenCalled();
      expect(amendSeasonMock).toHaveBeenCalledWith({
        productionId: 'uuid-695',
        field_name: 'production_amount',
        new_value: '118750',
        // Trimmed, like the event path: leading whitespace in a reason an inspector reads is
        // noise, and an all-whitespace reason is no reason.
        reason: 'Header was filled from the buffer-row pick.'
      });
    });
  });
});
