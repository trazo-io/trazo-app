/**
 * The traceback drill must never decide which lot the operator meant, and must never grade them.
 *
 * Backend contract: history/tests/test_sale_traceback.py. Here: several matches render as a
 * choice (no trace), each gap code renders its own message, and nothing on the page reads as a
 * score, a percentage or a verification.
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
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

const Landed = () => {
  const loc = useLocation();
  return <span data-testid="landed">{loc.pathname + loc.search}</span>;
};

const renderAt = (url: string) =>
  render(
    // A company in the store: file links are built on the company-scoped documents route.
    <Provider
      store={configureStore({ reducer: { company: () => ({ currentCompany: { id: 77 } }) } })}>
      <ChakraProvider>
        <IntlProvider locale="en-US" messages={messages}>
          <MemoryRouter initialEntries={[url]}>
            <Routes>
              <Route path="/admin/dashboard/farm/:farmId/traceback" element={<TracebackPage />} />
              <Route path="*" element={<Landed />} />
            </Routes>
          </MemoryRouter>
        </IntlProvider>
      </ChakraProvider>
    </Provider>
  );

const GAP_CODES = [
  ['sale', 'no_sale_document', '', 7, ''],
  ['sale', 'label_category_not_recorded', '', 7, ''],
  ['picks', 'sale_not_linked_to_pick', 'harvest_events', 7, ''],
  ['picks', 'pick_without_lot_code', 'harvest_lot_code', 31, ''],
  ['season', 'season_without_lot_id', 'lot_id', null, ''],
  ['inputs', 'input_without_supplier', 'supplier', 44, 'chemical'],
  ['inputs', 'input_without_invoice', 'invoice', 44, 'chemical'],
  ['inputs', 'input_without_lot', 'lot', 44, 'chemical'],
  ['sale', 'sale_without_document', 'source_documents', 7, ''],
  ['inputs', 'input_without_document', 'receipt_document', 44, 'chemical']
] as const;

const PICK_GAP = (enUS as unknown as Record<string, string>)[
  'traceback.gap.pick_without_lot_code'
].replace('{input}', '2026-08-01 · section UT · 13,400 lb');

const TRACE = {
  sale: {
    id: 7,
    date: '2026-08-25',
    buyer: 'OGC',
    quantity: '13,400 lb',
    invoice: '',
    bol: '',
    organic_on_invoice: true,
    label_category: '',
    documents: [] as { id: number; title: string; kind: string }[]
  },
  picks_linked: false,
  picks: [{ id: 31, lot_code: '', date: '2026-08-01', block: 'UT', quantity: '13,400 lb' }],
  season: {
    id: 55,
    public_id: 'abc',
    name: '2026',
    crop: 'Blueberries',
    parcel: 'Upper',
    parcel_id: 3,
    establishment_id: 1,
    company_id: 9,
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
      other_block: false,
      documents: [] as { id: number; title: string; kind: string }[]
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

  it('a recall search lists who got how much, each match with its quantity', () => {
    state.search = {
      truncated: false,
      results: ['A', 'B'].map((buyer, i) => ({
        sale_id: i + 1,
        date: '2026-08-0' + (i + 1),
        buyer,
        quantity: `${(i + 1) * 1000} lb`,
        invoice: `I${i}`,
        crop: 'Apples',
        parcel: 'P',
        season: '2026',
        matched_on: 'input_lot'
      }))
    };
    renderAt('/admin/dashboard/farm/1/traceback');
    fireEvent.change(screen.getByPlaceholderText(messages['traceback.search.placeholder']), {
      target: { value: 'CMP-4471' }
    });
    fireEvent.click(screen.getByRole('button', { name: messages['traceback.search.submit'] }));
    expect(screen.getByText('2026-08-01 · A · 1000 lb · I0')).toBeTruthy();
    expect(screen.getByText(messages['traceback.matches.subtitleRecall'])).toBeTruthy();
    expect(
      screen.getAllByText(
        new RegExp(messages['traceback.matchedOn.input_lot'].replace(/[()]/g, '\\$&'))
      )
    ).toHaveLength(2);
  });

  it('puts the days to the next pick beside the recorded PHI, and flags a pick inside it', () => {
    state.trace = {
      ...TRACE,
      inputs: [
        { ...TRACE.inputs[0], event_id: 44, days_to_pick: 3, phi_days: '7', inside_phi: true },
        { ...TRACE.inputs[0], event_id: 45, days_to_pick: 1, phi_days: '', inside_phi: false },
        {
          ...TRACE.inputs[0],
          kind: 'amendment',
          event_id: 46,
          days_to_pick: null,
          inside_phi: false
        }
      ]
    };
    renderAt('/admin/dashboard/farm/1/traceback?sale=7');
    expect(screen.getByText('3 days before the next pick · PHI recorded: 7 days')).toBeTruthy();
    expect(screen.getByText('1 day before the next pick · no PHI recorded')).toBeTruthy();
    expect(screen.getAllByText(messages['traceback.input.insidePhi'])).toHaveLength(1);
  });

  it('a 0 or 1-day PHI is recorded, singular where it is one (review of #170)', () => {
    state.trace = {
      ...TRACE,
      inputs: [
        { ...TRACE.inputs[0], event_id: 44, days_to_pick: 5, phi_days: '0', inside_phi: false },
        { ...TRACE.inputs[0], event_id: 45, days_to_pick: 5, phi_days: '1', inside_phi: false }
      ]
    };
    renderAt('/admin/dashboard/farm/1/traceback?sale=7');
    expect(screen.getByText('5 days before the next pick · PHI recorded: 0 days')).toBeTruthy();
    expect(screen.getByText('5 days before the next pick · PHI recorded: 1 day')).toBeTruthy();
  });

  it('a capped recall list never claims to be the whole list (review of #170)', () => {
    state.search = {
      truncated: true,
      results: [1, 2].map((id) => ({
        sale_id: id,
        date: '2026-08-01',
        buyer: 'A',
        quantity: '10 bins',
        invoice: `I${id}`,
        crop: 'Apples',
        parcel: 'P',
        season: '2026',
        matched_on: 'input_invoice'
      }))
    };
    renderAt('/admin/dashboard/farm/1/traceback');
    fireEvent.change(screen.getByPlaceholderText(messages['traceback.search.placeholder']), {
      target: { value: 'WE-1' }
    });
    fireEvent.click(screen.getByRole('button', { name: messages['traceback.search.submit'] }));
    expect(screen.getByText(messages['traceback.matches.truncatedRecall'])).toBeTruthy();
    expect(screen.getByText(messages['traceback.matches.subtitleRecallPartial'])).toBeTruthy();
    expect(screen.queryByText(messages['traceback.matches.subtitleRecall'])).toBeNull();
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

  it('opens each file through the company-scoped documents route, labelled by kind', () => {
    state.trace = {
      ...TRACE,
      sale: {
        ...TRACE.sale,
        documents: [{ id: 501, title: 'BR-5602.pdf', kind: 'bill_of_lading' }]
      },
      inputs: [
        { ...TRACE.inputs[0], documents: [{ id: 502, title: 'VAS-0520.pdf', kind: 'receipt' }] }
      ]
    };
    renderAt('/admin/dashboard/farm/1/traceback?sale=7');
    const bol = screen.getByRole('link', { name: /Bill of lading: BR-5602\.pdf/ });
    // The FULL path, company from the trace (the store holds a different one): the first browser
    // run caught `/companies//establishments/...`, which an end-anchored match let through.
    expect(bol.getAttribute('href')).toMatch(
      /\/api\/companies\/9\/establishments\/1\/documents\/501\/download\/$/
    );
    const receipt = screen.getByRole('link', { name: /Purchase receipt: VAS-0520\.pdf/ });
    expect(receipt.getAttribute('href')).toMatch(/documents\/502\/download\/$/);
  });

  it('a fix on a record carries the way back to this trace', () => {
    state.trace = TRACE;
    renderAt('/admin/dashboard/farm/1/traceback?sale=7');
    // The pick-lot fix opens the harvest record; after saving NewEvent returns to `next`.
    const gap = screen.getByText(PICK_GAP).closest('[role="alert"]');
    fireEvent.click(
      within(gap as HTMLElement).getByRole('button', { name: messages['traceback.gap.fix'] })
    );
    const landed = screen.getByTestId('landed').textContent || '';
    expect(landed).toContain('/admin/dashboard/farm/1/parcel/3/event/31/change');
    expect(new URLSearchParams(landed.split('?')[1]).get('next')).toBe(
      '/admin/dashboard/farm/1/traceback?sale=7'
    );
  });

  it('a missing receipt is filed from Documents, pre-filed to the record, then back here', () => {
    state.trace = TRACE;
    renderAt('/admin/dashboard/farm/1/traceback?sale=7');
    const text = messages['traceback.gap.input_without_document'].replace(
      '{input}',
      '2026-05-02 · X'
    );
    const gap = screen.getByText(text).closest('[role="alert"]');
    fireEvent.click(
      within(gap as HTMLElement).getByRole('button', { name: messages['traceback.gap.fix'] })
    );
    const landed = screen.getByTestId('landed').textContent || '';
    expect(landed.split('?')[0]).toBe('/admin/dashboard/farm/1/documents');
    const q = new URLSearchParams(landed.split('?')[1]);
    // A correction cannot set a file link on a finished season; filing from Documents can.
    expect([q.get('production'), q.get('record'), q.get('next')]).toEqual([
      '55',
      '2:44',
      '/admin/dashboard/farm/1/traceback?sale=7'
    ]);
  });

  it('renders every gap code with its own message', () => {
    state.trace = TRACE;
    renderAt('/admin/dashboard/farm/1/traceback?sale=7');
    // Read something first: the chain rendered.
    expect(screen.getByText(messages['traceback.hop.sale'])).toBeTruthy();
    for (const [, code] of GAP_CODES) {
      // An input gap names WHICH input (date · product), not "an input".
      // Each gap names its record: an input by date and product, a pick by date, block, quantity.
      const text = messages[`traceback.gap.${code}`].replace(
        '{input}',
        code === 'pick_without_lot_code' ? '2026-08-01 · section UT · 13,400 lb' : '2026-05-02 · X'
      );
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
      // ...and says HOW to close it: a sale cannot be edited, so "Fix" alone was a dead end.
      expect(screen.getAllByText(messages[`traceback.gapHow.${code}`]).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(`${GAP_CODES.length} missing links to fix in this chain`)).toBeTruthy();
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
