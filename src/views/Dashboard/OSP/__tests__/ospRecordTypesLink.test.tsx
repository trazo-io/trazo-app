/**
 * How a record the operation keeps outside Trazo links to the next and previous one (2026-11-16).
 *
 * OTCO C12 12.2-6 asks, per document, the "Linking element to next and previous document in chain".
 * Trazo states it for the records it holds; for a weigh ticket, a delivery slip or the operation's own
 * form only the operator can. The panel asks it once that record is confirmed, saves it on blur, and
 * never offers it on a record Trazo links itself or on one not confirmed (the server refuses both).
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

import enUS from '../../../../i18n/lang/en-US.json';

const setLink = vi.fn((_args: Record<string, unknown>) => ({
  unwrap: () => Promise.resolve({}) as Promise<unknown>
}));
const confirmTypes = vi.fn((_args: Record<string, unknown>) => ({
  unwrap: () => Promise.resolve({})
}));

vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) =>
    fn({
      company: {
        currentCompany: {
          subscription: { status: 'active', effective_limits: { compliance_exports: true } }
        }
      }
    })
}));

const base = {
  group: 'What types of records do you maintain for organic crop production?',
  cfr_cite: '7 CFR 205.103(b)(2)',
  status: 'not_evidenced_in_trazo',
  count: 0,
  basis: '',
  external_by_design: false,
  free_text: false,
  custom_label: null,
  suggested: false,
  confirmed_at: '2026-11-01T10:00:00Z',
  confirmed_by: 1,
  carried_from_version: null,
  linking_element: ''
};

const ROWS = [
  {
    ...base,
    key: 'weigh_tickets',
    label: 'Weigh tickets',
    confirmed: true,
    operator_states_link: true
  },
  {
    ...base,
    key: 'delivery_slips',
    label: 'Delivery slips',
    confirmed: true,
    operator_states_link: true,
    linking_element: 'Slip number on the sales record'
  },
  {
    ...base,
    key: 'packing_slips',
    label: 'Packing slips',
    confirmed: false,
    operator_states_link: true
  },
  {
    ...base,
    key: 'harvest_records',
    label: 'Harvest records',
    confirmed: true,
    operator_states_link: false
  }
];

vi.mock('store/api/ospApi', () => ({
  useGetOSPRecordTypesQuery: () => ({
    data: {
      summary: {
        total: 4,
        evidenced: 0,
        confirmed: 3,
        awaiting_confirmation: 0,
        external_by_design: 0,
        evidence_check_failed: 0
      },
      record_types: ROWS
    },
    isLoading: false,
    isError: false
  }),
  useConfirmOSPRecordTypesMutation: () => [confirmTypes, { isLoading: false }],
  useMarkOSPRecordTypeNotKeptMutation: () => [vi.fn(), { isLoading: false }],
  useSetOSPRecordTypeLinkMutation: () => [setLink, { isLoading: false }],
  useGetOSPAttachmentsQuery: () => ({ data: { workbooks: [] }, isLoading: false })
}));

const { default: OSPRecordTypesPanel } = await import('../OSPRecordTypesPanel');

const panel = (status = 'draft') => (
  <ChakraProvider>
    <MemoryRouter>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <OSPRecordTypesPanel
          companyId="7"
          farmId="3"
          osp={{ id: '11', status, version_number: 1 } as never}
          onNavigateAway={() => Promise.resolve(true)}
        />
      </IntlProvider>
    </MemoryRouter>
  </ChakraProvider>
);
const renderPanel = (status = 'draft') => render(panel(status));

describe('the linking element of a record kept outside Trazo', () => {
  it('is asked only on a confirmed record whose link only the operator can state', () => {
    renderPanel();
    expect(screen.getByTestId('record-link-weigh_tickets')).toBeInTheDocument();
    expect(screen.getByTestId('record-link-delivery_slips')).toBeInTheDocument();
    expect(screen.queryByTestId('record-link-packing_slips')).toBeNull();
    expect(screen.queryByTestId('record-link-harvest_records')).toBeNull();
    const kept = screen.getByLabelText(
      'How Delivery slips links to the next and previous record'
    ) as HTMLInputElement;
    expect(kept.value).toBe('Slip number on the sales record');
  });

  it('saves on blur, trimmed, and sends nothing when unchanged', async () => {
    setLink.mockClear();
    renderPanel();
    const input = screen.getByLabelText('How Weigh tickets links to the next and previous record');
    await act(async () => {
      fireEvent.change(input, { target: { value: '  Ticket number on the bin tag  ' } });
      fireEvent.blur(input);
    });
    expect(setLink).toHaveBeenCalledTimes(1);
    expect(setLink.mock.calls[0][0]).toMatchObject({
      ospId: '11',
      key: 'weigh_tickets',
      linkingElement: 'Ticket number on the bin tag'
    });
    await act(async () => {
      fireEvent.blur(
        screen.getByLabelText('How Delivery slips links to the next and previous record')
      );
    });
    expect(setLink).toHaveBeenCalledTimes(1);
  });

  it('is read, not edited, on a plan that can no longer change', () => {
    renderPanel('submitted');
    expect(screen.queryByTestId('record-link-weigh_tickets')).toBeNull();
    expect(screen.getByText('Links by: Slip number on the sales record')).toBeInTheDocument();
  });

  it('goes as soon as the row is unticked on screen (review of app #406)', () => {
    renderPanel();
    expect(screen.getByTestId('record-link-weigh_tickets')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Weigh tickets'));
    expect(screen.queryByTestId('record-link-weigh_tickets')).toBeNull();
  });

  it('puts the saved text back when a save fails, and a refetch never overwrites typing', async () => {
    setLink.mockClear();
    setLink.mockImplementationOnce(() => ({ unwrap: () => Promise.reject(new Error('400')) }));
    const view = renderPanel();
    const field = () =>
      screen.getByLabelText(
        'How Delivery slips links to the next and previous record'
      ) as HTMLInputElement;
    await act(async () => {
      fireEvent.focus(field());
      fireEvent.change(field(), { target: { value: 'Slip number and date' } });
      fireEvent.blur(field());
    });
    expect(setLink).toHaveBeenCalledTimes(1);
    expect(field().value).toBe('Slip number on the sales record');

    // A save that succeeds keeps the new text on screen until the refetch brings it back as saved.
    await act(async () => {
      fireEvent.focus(field());
      fireEvent.change(field(), { target: { value: 'Slip number and date' } });
      fireEvent.blur(field());
    });
    expect(setLink).toHaveBeenCalledTimes(2);
    expect(field().value).toBe('Slip number and date');

    // While the operator types, a refetch carrying a new saved value leaves the draft alone (a row
    // with no save in flight, so the field being edited is the only thing holding it).
    const weigh = () =>
      screen.getByLabelText(
        'How Weigh tickets links to the next and previous record'
      ) as HTMLInputElement;
    fireEvent.focus(weigh());
    fireEvent.change(weigh(), { target: { value: 'Ticket number, typed' } });
    const row = ROWS[0] as { linking_element: string };
    const before = row.linking_element;
    row.linking_element = 'Changed elsewhere';
    view.rerender(panel());
    expect(weigh().value).toBe('Ticket number, typed');
    row.linking_element = before;
  });
});
