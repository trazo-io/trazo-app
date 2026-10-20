/**
 * The traceback drill must never decide which lot the operator meant, and must never grade them.
 *
 * Backend contract: history/tests/test_sale_traceback.py. Here: several matches render as a
 * choice (no trace), each gap code renders its own message, and nothing on the page reads as a
 * score, a percentage or a verification.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state: { search: any; trace: any; staleTrace: any; traceError: any } = {
  search: undefined,
  trace: undefined,
  staleTrace: undefined,
  traceError: undefined
};

// Mirrors RTK's two fields: `data` keeps the last success for ANY args, `currentData` only the
// current args'. The page must read `currentData`; `staleTrace` is what `data` would still hold.
vi.mock('store/api/historyApi', () => ({
  useSearchTracebackSalesQuery: (_args: unknown, opts: { skip?: boolean }) => ({
    currentData: opts?.skip ? undefined : state.search,
    data: state.search,
    fulfilledTimeStamp: opts?.skip ? undefined : 1,
    isFetching: false,
    isError: false,
    refetch: () => undefined
  }),
  useGetSaleTracebackQuery: (_args: unknown, opts: { skip?: boolean }) => ({
    currentData: opts?.skip || state.traceError ? undefined : state.trace,
    data: state.traceError ? state.staleTrace : state.trace,
    error: state.traceError,
    isFetching: false,
    isError: Boolean(state.traceError),
    refetch: () => undefined
  })
}));

import enUS from '../../../../i18n/lang/en-US.json';
import TracebackPage from '..';

const messages = enUS as unknown as Record<string, string>;

const renderAt = (url: string) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={messages}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/admin/dashboard/farm/:farmId/traceback" element={<TracebackPage />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

const GAP_CODES = [
  ['sale', 'no_sale_document', '', 7, ''],
  ['sale', 'label_category_not_recorded', '', 7, ''],
  ['picks', 'sale_not_linked_to_pick', 'harvest_events', 7, ''],
  ['picks', 'pick_without_lot_code', 'harvest_lot_code', 31, ''],
  ['season', 'season_without_lot_id', 'lot_id', null, ''],
  ['inputs', 'input_without_supplier', 'supplier', 44, 'chemical'],
  ['inputs', 'input_without_invoice', 'invoice', 44, 'chemical'],
  ['inputs', 'input_without_lot', 'lot', 44, 'chemical']
] as const;

const TRACE = {
  sale: {
    id: 7,
    date: '2026-08-25',
    buyer: 'OGC',
    quantity: '13,400 lb',
    invoice: '',
    bol: '',
    organic_on_invoice: true,
    label_category: ''
  },
  picks_linked: false,
  picks: [{ id: 31, lot_code: '', date: '2026-08-01', block: 'UT', quantity: '13,400 lb' }],
  season: {
    public_id: 'abc',
    name: '2026',
    crop: 'Blueberries',
    parcel: 'Upper',
    parcel_id: 3,
    establishment_id: 1,
    lot_id: ''
  },
  inputs: [
    {
      kind: 'chemical',
      event_id: 44,
      date: '2026-05-02',
      product: 'X',
      block: 'UT',
      supplier: '',
      invoice: '',
      lot: '',
      listing: 'not_classified',
      other_block: false
    }
  ],
  balance: {
    harvested: '13,400 lb',
    sold: '13,400 lb',
    packed_out: '',
    difference: '0 lb',
    not_computed: false
  },
  gaps: GAP_CODES.map(([hop, code, field, ref, kind]) => ({ hop, code, field, ref, kind }))
};

describe('TracebackPage', () => {
  beforeEach(() => {
    state.search = undefined;
    state.trace = undefined;
    state.staleTrace = undefined;
    state.traceError = undefined;
  });

  it('lists several matches as a choice and traces none of them', () => {
    state.search = {
      truncated: false,
      results: [
        {
          sale_id: 1,
          date: '2025-08-01',
          buyer: 'A',
          invoice: 'I1',
          crop: 'B',
          parcel: 'P',
          season: '2025',
          matched_on: 'pick_lot_code'
        },
        {
          sale_id: 2,
          date: '2026-08-01',
          buyer: 'B',
          invoice: 'I2',
          crop: 'B',
          parcel: 'P',
          season: '2026',
          matched_on: 'pick_lot_code'
        }
      ]
    };
    state.trace = TRACE;
    renderAt('/admin/dashboard/farm/1/traceback');
    fireEvent.change(screen.getByPlaceholderText(messages['traceback.search.placeholder']), {
      target: { value: 'SHARED-1' }
    });
    fireEvent.click(screen.getByRole('button', { name: messages['traceback.search.submit'] }));
    // Read something first: the choice rendered, both sales on it.
    expect(screen.getByText('2 sales match')).toBeTruthy();
    expect(
      screen.getAllByRole('button', { name: messages['traceback.matches.trace'] })
    ).toHaveLength(2);
    // ...and no trace, because no `?sale=` was chosen.
    expect(screen.queryByText(messages['traceback.hop.sale'])).toBeNull();
  });

  it("a 404 never shows the previous sale's chain under the new URL", () => {
    state.staleTrace = TRACE;
    state.traceError = { status: 404 };
    renderAt('/admin/dashboard/farm/1/traceback?sale=99');
    expect(screen.getByText(messages['traceback.notFound'])).toBeTruthy();
    expect(screen.queryByText(messages['traceback.hop.sale'])).toBeNull();
  });

  it('a server error is not reported as "not found"', () => {
    state.traceError = { status: 500 };
    renderAt('/admin/dashboard/farm/1/traceback?sale=7');
    expect(screen.queryByText(messages['traceback.notFound'])).toBeNull();
  });

  it('one match with no sale open shows a one-row list, never a blank page', () => {
    state.search = {
      truncated: true,
      results: [
        {
          sale_id: 1,
          date: '2025-08-01',
          buyer: 'A',
          invoice: 'I1',
          crop: 'B',
          parcel: 'P',
          season: '2025',
          matched_on: 'pick_lot_code_season'
        }
      ]
    };
    renderAt('/admin/dashboard/farm/1/traceback');
    fireEvent.change(screen.getByPlaceholderText(messages['traceback.search.placeholder']), {
      target: { value: 'CHA-1' }
    });
    const submit = () =>
      fireEvent.click(screen.getByRole('button', { name: messages['traceback.search.submit'] }));
    // First answer: the single sale opens by itself (?sale=1).
    submit();
    expect(screen.queryByText('1 sale matches')).toBeNull();
    // Same code again: the cached answer comes back unchanged, so nothing re-opens it. Before the
    // fix this rendered nothing at all (neither the list, which needed >1, nor the empty state).
    submit();
    expect(screen.getByText('1 sale matches')).toBeTruthy();
    expect(screen.getByText(messages['traceback.matches.truncated'])).toBeTruthy();
    expect(screen.getByText(/the sale names no pick/)).toBeTruthy();
  });

  it('is a drill-down: it has a Back button', () => {
    renderAt('/admin/dashboard/farm/1/traceback');
    expect(screen.getByRole('button', { name: messages['common.back'] })).toBeTruthy();
  });

  it('states sales not invoiced as organic beside the balance, never drops them', () => {
    state.trace = {
      ...TRACE,
      balance: { ...TRACE.balance, sold_not_organic: '400 lb', sold_not_organic_count: 1 }
    };
    renderAt('/admin/dashboard/farm/1/traceback?sale=7');
    expect(screen.getByText(/counted apart: 400 lb in 1 sale\./)).toBeTruthy();
  });

  it('renders every gap code with its own message', () => {
    state.trace = TRACE;
    renderAt('/admin/dashboard/farm/1/traceback?sale=7');
    // Read something first: the chain rendered.
    expect(screen.getByText(messages['traceback.hop.sale'])).toBeTruthy();
    for (const [, code] of GAP_CODES) {
      // An input gap names WHICH input (date · product), not "an input".
      const text = messages[`traceback.gap.${code}`].replace('{input}', '2026-05-02 · X');
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    // The connector must not claim a link the sale does not have.
    expect(screen.getByText(messages['traceback.link.saleToPickMissing'])).toBeTruthy();
    expect(screen.queryByText(messages['traceback.link.saleToPick'])).toBeNull();
    expect(screen.getByText(/Not classified/)).toBeTruthy();
  });

  it('says no score, percentage or verification anywhere', () => {
    state.trace = TRACE;
    const { container } = renderAt('/admin/dashboard/farm/1/traceback?sale=7');
    const text = container.textContent || '';
    expect(text).toContain(messages['traceback.hop.inputs']);
    expect(text).not.toMatch(/%|score|verified|pass(ed)?\b/i);
  });
});
