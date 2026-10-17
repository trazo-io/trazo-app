/**
 * The record's detail view shows its own paper trail (pilot rehearsal 2026-10).
 *
 * Findings 1 and 4: after a closed-season correction (50 -> 45, reason, John Doe) the detail view
 * showed 45 and nothing else, though the certifier packet printed the whole correction; and a
 * document could not be tied to one record. These tests render the real EventDetailsModal with
 * the two API reads answered, and read the text a person would see.
 */
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import theme from '../../../theme/theme';
import enMessages from '../../../i18n/lang/en-US.json';
import { EventDetailsModal } from '../EventDetailsModal';

const amendmentsQuery = vi.fn();
const documentsQuery = vi.fn();
let canWrite = true;

vi.mock('store/api/historyApi', () => ({
  useDeleteEventMutation: () => [vi.fn(), { isLoading: false }]
}));
vi.mock('store/api/amendmentsApi', () => ({
  useGetEventAmendmentsQuery: (...args: unknown[]) => amendmentsQuery(...args),
  useAmendEventMutation: () => [vi.fn(), { isLoading: false }],
  useGetSeasonAmendmentsQuery: () => ({ data: undefined, isLoading: false }),
  useAmendSeasonMutation: () => [vi.fn(), { isLoading: false }]
}));
vi.mock('store/api/documentsApi', () => ({
  useGetFarmDocumentsQuery: (...args: unknown[]) => documentsQuery(...args)
}));
vi.mock('hooks/useUserRole', () => ({ useUserRole: () => ({ canWrite }) }));
vi.mock('store/api/crewNoteApi', () => ({
  useGetCrewNoteQuery: () => ({ data: { crew_note: null } })
}));
vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) => fn({ company: { currentCompany: { id: 17 } } })
}));

const SPRAY = {
  id: 501,
  type: 'PE',
  event_type: 2,
  name: 'Surround WP',
  description: 'Kaolin for sunburn and pear psylla.',
  date: '2026-04-25T00:00:00Z',
  created_by: 7
};

const AMENDMENT = {
  id: 9,
  field_name: 'concentration',
  field_label: 'Rate',
  original_value: '50.000',
  corrected_value: '45',
  reason: 'Rate typed from the wrong row of the spray log.',
  amended_by: 'John Doe',
  created_at: '2026-10-16T15:30:00Z'
};

function renderModal(props: Record<string, unknown> = {}) {
  return render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale="en-US" messages={enMessages as Record<string, string>}>
        <MemoryRouter>
          <EventDetailsModal
            isOpen
            onClose={vi.fn()}
            event={SPRAY as never}
            members={[]}
            farmId="33"
            parcelId="2"
            isProductionFinished
            {...props}
          />
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );
}

beforeEach(() => {
  canWrite = true;
  amendmentsQuery.mockReset();
  documentsQuery.mockReset();
  amendmentsQuery.mockReturnValue({ data: { amendments: [AMENDMENT] } });
  documentsQuery.mockReturnValue({ data: [] });
});

describe('corrections on a record', () => {
  it('shows the original and corrected values, the reason, who and when', () => {
    renderModal();
    const block = screen.queryByTestId('event-corrections');
    expect(block, 'the record shows no Corrections block').not.toBeNull();
    const text = block?.textContent ?? '';
    expect(text).toContain('Corrections');
    expect(text).toContain('Rate');
    expect(text).toContain('50.000');
    expect(text).toContain('45');
    expect(text).toContain('Rate typed from the wrong row of the spray log.');
    expect(text).toContain('John Doe');
    expect(text).toContain('Oct 16, 2026');
  });

  it('asks for the corrections of THIS record', () => {
    renderModal();
    expect(amendmentsQuery).toHaveBeenCalledWith(
      { eventId: 501, eventType: 2 },
      expect.objectContaining({ skip: false })
    );
  });

  it('shows nothing when the record was never corrected', () => {
    amendmentsQuery.mockReturnValue({ data: { amendments: [] } });
    renderModal();
    expect(screen.queryByTestId('event-corrections')).toBeNull();
  });

  it('shows no trail on a rolled-up summary row (flag carried in extra_data)', () => {
    renderModal({
      event: { ...SPRAY, event_type: 6, type: 'SC', extra_data: { is_summary: 'true' } }
    });
    expect(screen.queryByTestId('event-corrections')).toBeNull();
    expect(screen.queryByTestId('event-documents')).toBeNull();
  });

  it('does not request the list for a viewer (the server answers 403 to viewers)', () => {
    canWrite = false;
    renderModal();
    expect(amendmentsQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ skip: true })
    );
    expect(screen.queryByTestId('event-corrections')).toBeNull();
  });
});

describe('documents filed against a record', () => {
  it('lists them with an authenticated download link and a neutral source', () => {
    documentsQuery.mockReturnValue({
      data: [
        {
          id: 71,
          title: 'Supplier invoice ASTRA-INV-2605-01',
          source: 'upload',
          source_display: 'Upload',
          created_by_name: 'Pilot Operator',
          created_at: '2026-05-16T12:00:00Z'
        }
      ]
    });
    renderModal();
    expect(documentsQuery).toHaveBeenCalledWith(
      { companyId: '17', farmId: '33', eventType: 2, eventId: 501 },
      expect.objectContaining({ skip: false })
    );
    const block = screen.queryByTestId('event-documents') as HTMLElement;
    expect(block, 'the record lists no documents').not.toBeNull();
    expect(block.textContent).toContain('Supplier invoice ASTRA-INV-2605-01');
    expect(block.textContent).toContain('Uploaded by Pilot Operator');
    expect(block.textContent).not.toMatch(/farmer/i);
    const link = within(block).getByRole('link', {
      name: 'Download Supplier invoice ASTRA-INV-2605-01'
    });
    // The download route, never a storage URL.
    expect(link.getAttribute('href')).toMatch(
      /companies\/17\/establishments\/33\/documents\/71\/download\/$/
    );
  });
});
