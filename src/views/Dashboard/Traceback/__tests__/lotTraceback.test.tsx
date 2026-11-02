/**
 * The traceback from a harvest lot (product in storage) and the per-location reading beside it.
 *
 * Backend contract: trazo-back history/tests/test_lot_traceback.py. Here: the page never picks one
 * of several picks for the operator, a pick reads forward to the sales that name it, and the
 * per-location figure is labelled as recorded harvested minus recorded sold, never a count of what
 * is in storage, with no number where the units do not allow one.
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state: { lotSearch: any; lotTrace: any; saleArgs: any[] } = {
  lotSearch: undefined,
  lotTrace: undefined,
  saleArgs: []
};

vi.mock('store/api/historyApi', () => ({
  useSearchTracebackSalesQuery: () => ({
    currentData: undefined,
    isFetching: false,
    isError: false,
    refetch: () => undefined
  }),
  useGetSaleTracebackQuery: (args: unknown, opts: { skip?: boolean }) => {
    if (!opts?.skip) state.saleArgs.push(args);
    return { currentData: undefined, isFetching: false, isError: false, refetch: () => undefined };
  },
  useSearchTracebackLotsQuery: (_args: unknown, opts: { skip?: boolean }) => ({
    currentData: opts?.skip ? undefined : state.lotSearch,
    fulfilledTimeStamp: opts?.skip ? undefined : 1,
    isFetching: false,
    isError: false,
    refetch: () => undefined
  }),
  useGetLotTracebackQuery: (_args: unknown, opts: { skip?: boolean }) => ({
    currentData: opts?.skip ? undefined : state.lotTrace,
    isFetching: false,
    isError: false,
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

const Where = () => {
  const loc = useLocation();
  return <span data-testid="where">{loc.search}</span>;
};

const renderAt = (url: string) =>
  render(
    <Provider
      store={configureStore({ reducer: { company: () => ({ currentCompany: { id: 9 } }) } })}>
      <ChakraProvider>
        <IntlProvider locale="en-US" messages={messages}>
          <MemoryRouter initialEntries={[url]}>
            <Routes>
              <Route
                path="/admin/dashboard/farm/:farmId/traceback"
                element={
                  <>
                    <TracebackPage />
                    <Where />
                  </>
                }
              />
              <Route path="*" element={<Landed />} />
            </Routes>
          </MemoryRouter>
        </IntlProvider>
      </ChakraProvider>
    </Provider>
  );

const SALE = (id: number, picks: number) => ({
  sale_id: id,
  date: '2026-09-27',
  buyer: `Buyer ${id}`,
  quantity: '20 bins',
  invoice: `INV-${id}`,
  bol: '',
  organic_on_invoice: true,
  picks_named: picks
});

const LOT_TRACE = {
  anchor: 'pick',
  picks: [
    {
      id: 31,
      lot_code: '',
      date: '2026-09-26',
      block: 'NB2',
      quantity: '41 bins',
      storage: 'CA Room 4',
      documents: []
    }
  ],
  sales: [SALE(7, 1), SALE(8, 3)],
  sales_naming_no_pick: [SALE(9, 0)],
  season: {
    id: 55,
    public_id: 'abc',
    name: 'Honeycrisp 2026',
    crop: 'Honeycrisp',
    parcel: 'North Bench',
    parcel_id: 3,
    establishment_id: 1,
    company_id: 9,
    lot_id: 'CRO-HON-2026'
  },
  inputs: [],
  balance: { harvested: '', sold: '', packed_out: '', difference: '', not_computed: true },
  on_hand: {
    season_open: false,
    locations: [
      {
        location: 'CA Room 4',
        location_recorded: true,
        pick_count: 2,
        sale_count: 1,
        harvested: '82 bins',
        packed_out: '',
        sold: '20 bins',
        difference: '62 bins',
        not_computed: false,
        not_computed_code: '',
        units: [],
        sold_not_organic_count: 0,
        sold_not_organic: ''
      },
      {
        location: 'Cooler 1',
        location_recorded: true,
        pick_count: 2,
        sale_count: 0,
        harvested: '',
        packed_out: '',
        sold: '',
        difference: '',
        not_computed: true,
        not_computed_code: 'harvest_units_mixed',
        units: ['bins', 'lb'],
        sold_not_organic_count: 0,
        sold_not_organic: ''
      },
      {
        location: '',
        location_recorded: false,
        pick_count: 1,
        sale_count: 0,
        harvested: '10 bins',
        packed_out: '',
        sold: '0 bins',
        difference: '10 bins',
        not_computed: false,
        not_computed_code: '',
        units: [],
        sold_not_organic_count: 0,
        sold_not_organic: ''
      }
    ],
    unallocated_sales: [
      {
        sale_id: 8,
        date: '2026-09-28',
        buyer: 'Buyer 8',
        quantity: '30 bins',
        invoice: 'INV-8',
        reason: 'several_locations',
        locations: ['', 'CA Room 4']
      },
      {
        sale_id: 9,
        date: '2026-09-29',
        buyer: 'Buyer 9',
        quantity: '5 bins',
        invoice: 'INV-9',
        reason: 'names_no_pick',
        locations: []
      }
    ]
  },
  gaps: [
    { hop: 'picks', code: 'pick_without_lot_code', field: 'harvest_lot_code', ref: 31, kind: '' }
  ]
};

describe('Traceback from a harvest lot', () => {
  beforeEach(() => {
    state.lotSearch = undefined;
    state.lotTrace = undefined;
    state.saleArgs = [];
  });

  it('lists several matching picks as a choice and opens none of them', () => {
    state.lotSearch = {
      truncated: false,
      results: [1, 2].map((id) => ({
        pick_id: id,
        date: `2026-09-2${id}`,
        lot_code: 'SHARED',
        quantity: '41 bins',
        storage: 'CA Room 4',
        crop: 'Honeycrisp',
        parcel: 'North Bench',
        season: `${2024 + id}`,
        matched_on: 'pick_lot_code'
      }))
    };
    renderAt('/admin/dashboard/farm/1/traceback');
    fireEvent.click(screen.getByRole('button', { name: messages['traceback.mode.lot'] }));
    // The random draw is a sale's; product in storage is pointed at.
    expect(screen.queryByRole('button', { name: messages['traceback.search.random'] })).toBeNull();
    fireEvent.change(screen.getByPlaceholderText(messages['traceback.lot.search.placeholder']), {
      target: { value: 'SHARED' }
    });
    fireEvent.click(screen.getByRole('button', { name: messages['traceback.search.submit'] }));
    expect(screen.getByText('2 harvest picks match')).toBeTruthy();
    expect(
      screen.getAllByRole('button', { name: messages['traceback.lot.matches.trace'] })
    ).toHaveLength(2);
    expect(screen.getByTestId('where').textContent).toBe('');
    fireEvent.click(
      screen.getAllByRole('button', { name: messages['traceback.lot.matches.trace'] })[1]
    );
    expect(screen.getByTestId('where').textContent).toBe('?pick=2');
  });

  it('reads the lot both directions: back to its season, forward to the sales that name it', () => {
    state.lotTrace = LOT_TRACE;
    renderAt('/admin/dashboard/farm/1/traceback?pick=31');
    expect(screen.getByText(messages['traceback.hop.lot'])).toBeTruthy();
    expect(screen.getByText(messages['traceback.hop.lotSales'])).toBeTruthy();
    expect(screen.getByText('2026-09-27 · Buyer 7 · 20 bins · INV-7')).toBeTruthy();
    // A load that combines picks says so; its quantity is not this pick's.
    expect(screen.getByText(/also names 2 other picks/)).toBeTruthy();
    expect(screen.getByText(messages['traceback.lotSales.unlinkedTitle'])).toBeTruthy();
    expect(screen.getByText(messages['traceback.hop.season'])).toBeTruthy();
    // No sale card on a lot trace.
    expect(screen.queryByText(messages['traceback.hop.sale'])).toBeNull();
    // A sale that names the pick opens its own trace.
    fireEvent.click(
      screen.getAllByRole('button', { name: messages['traceback.matches.trace'] })[0]
    );
    expect(screen.getByTestId('where').textContent).toBe('?sale=7');
  });

  it('a pick no sale names says so, as a fact', () => {
    state.lotTrace = { ...LOT_TRACE, sales: [], sales_naming_no_pick: [] };
    renderAt('/admin/dashboard/farm/1/traceback?pick=31');
    expect(screen.getByText(messages['traceback.lotSales.none'])).toBeTruthy();
    expect(screen.queryByText(messages['traceback.lotSales.unlinkedTitle'])).toBeNull();
  });

  it('a fix from a lot trace returns to the lot', () => {
    state.lotTrace = LOT_TRACE;
    renderAt('/admin/dashboard/farm/1/traceback?pick=31');
    const text = messages['traceback.gap.pick_without_lot_code'].replace(
      '{input}',
      '2026-09-26 · section NB2 · 41 bins'
    );
    const gap = screen.getByText(text).closest('[role="alert"]');
    fireEvent.click(
      within(gap as HTMLElement).getByRole('button', { name: messages['traceback.gap.fix'] })
    );
    const landed = screen.getByTestId('landed').textContent || '';
    expect(landed).toContain('/admin/dashboard/farm/1/parcel/3/event/31/change');
    expect(new URLSearchParams(landed.split('?')[1]).get('next')).toBe(
      '/admin/dashboard/farm/1/traceback?pick=31'
    );
  });

  it('labels each location as recorded harvested minus recorded sold, with no number where units differ', () => {
    state.lotTrace = LOT_TRACE;
    renderAt('/admin/dashboard/farm/1/traceback?pick=31');
    expect(screen.getByText(messages['traceback.onHand.title'])).toBeTruthy();
    const rows = screen.getAllByTestId('on-hand-location');
    expect(rows).toHaveLength(3);
    const [room, cooler, blank] = rows;
    expect(within(room).getByText('CA Room 4')).toBeTruthy();
    expect(within(room).getByText(`${messages['traceback.onHand.difference']}:`)).toBeTruthy();
    expect(within(room).getByText('62 bins')).toBeTruthy();
    // Mixed units: the reason, with the units, and no figure.
    expect(
      within(cooler).getByText(
        messages['traceback.onHand.notComputed.harvest_units_mixed'].replace('{units}', 'bins, lb')
      )
    ).toBeTruthy();
    expect(within(cooler).queryByText(`${messages['traceback.onHand.difference']}:`)).toBeNull();
    expect(within(blank).getByText(messages['traceback.onHand.notRecorded'])).toBeTruthy();
    // A multi-location sale is named with its locations, never split.
    const unallocated = screen.getByTestId('on-hand-unallocated');
    expect(
      within(unallocated).getByText(
        new RegExp(
          messages['traceback.onHand.unallocated.several_locations']
            .replace('{locations}', `${messages['traceback.onHand.notRecorded']}, CA Room 4`)
            .replace(/[()]/g, '\\$&')
        )
      )
    ).toBeTruthy();
    expect(
      within(unallocated).getByText(
        new RegExp(messages['traceback.onHand.unallocated.names_no_pick'])
      )
    ).toBeTruthy();
  });

  it('never reads as inventory, a total or a percentage', () => {
    state.lotTrace = LOT_TRACE;
    const { container } = renderAt('/admin/dashboard/farm/1/traceback?pick=31');
    const text = container.textContent || '';
    expect(text).toContain(messages['traceback.onHand.title']);
    expect(text).not.toMatch(/%/);
    expect(text.toLowerCase()).not.toMatch(/\binventory\b|\bon hand\b/);
  });
});
