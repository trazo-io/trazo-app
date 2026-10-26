/**
 * A sale can be recorded while the season is still open (2026-10-26).
 *
 * The production page rendered the sales editor only inside `{historyData?.finish_date && ...}`.
 * The API never refused an open-season sale, but with no form a grower who picks and sells all
 * summer (berries: a grower on an Oregon Tilth Jan 1 renewal asked exactly this) could log July's
 * picks and not one of July's sales until the season closed.
 *
 * Open season, three things have to hold:
 *  - the page renders the sales section without a finish date;
 *  - the form links a sale to picks already logged, with the same checkboxes as a closed season;
 *  - the sale unit defaults to the picks' unit. There is no season header unit yet
 *    (`production_unit` is written at finish), and a sale in a unit other than the harvest's
 *    silently drops the Balance line and the oversold flag from the certifier packet.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const PICKS = [
  {
    id: 11,
    lot_code: 'BLK-NORTH-20270712',
    date: '2027-07-12',
    yield_quantity: '310.00',
    yield_unit: 'lbs'
  },
  {
    id: 12,
    lot_code: 'BLK-NORTH-20270719',
    date: '2027-07-19',
    yield_quantity: '280.00',
    yield_unit: 'lbs'
  }
];

const create = vi.fn((_payload: Record<string, unknown>) => ({
  unwrap: () => Promise.resolve({})
}));

vi.mock('store/api/historyApi', () => ({
  useGetSalesRecordsQuery: () => ({ data: [] }),
  useGetHarvestLotsQuery: () => ({ data: PICKS }),
  useCreateSalesRecordMutation: () => [create, { isLoading: false }],
  useDeleteSalesRecordMutation: () => [vi.fn(), { isLoading: false }],
  useVoidSalesRecordMutation: () => [vi.fn(), { isLoading: false }]
}));

// The farm default is metric on purpose: if the picks' unit were ignored, the form would
// offer kg against a harvest recorded in pounds.
vi.mock('hooks/useMeasurementSystem', () => ({
  useDefaultUnits: () => ({ mass: 'kg' })
}));

vi.mock('../SaleSourceDocuments', () => ({ default: () => null }));

import { SalesRecordsSection, singlePickUnit } from '../SalesRecordsSection';

const renderOpenSeason = (harvestUnit: string | null = null) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <MemoryRouter>
          <SalesRecordsSection
            productionId="uuid-open-season"
            canWrite
            establishmentId={3}
            harvestUnit={harvestUnit}
            isFinished={false}
            companyId={1}
            historyId={686}
          />
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

describe('sales while the season is open', () => {
  it('the production page does not gate the sales section on finish_date', () => {
    const src = readFileSync(resolve(__dirname, '../ProfileProduction.tsx'), 'utf8');
    const at = src.indexOf('<SalesRecordsSection');
    expect(at).toBeGreaterThan(-1);
    // The JSX condition that opens the block holding the section.
    const opener = src.slice(0, at).lastIndexOf('&& (');
    const condition = src.slice(src.lastIndexOf('{', opener), opener);
    expect(condition).not.toMatch(/finish_date/);
  });

  it('links a sale to picks already logged and posts it in the picks’ unit', async () => {
    create.mockClear();
    renderOpenSeason();

    fireEvent.change(screen.getByLabelText(/Sale date/), { target: { value: '2027-07-20' } });
    fireEvent.change(screen.getByLabelText(/Buyer \/ recipient/), {
      target: { value: 'Willamette Valley Co-op' }
    });
    fireEvent.change(screen.getByLabelText(/^Quantity/), { target: { value: '300' } });
    fireEvent.click(screen.getByText('BLK-NORTH-20270712'));

    expect(screen.getByText(/Matches this lot’s harvest unit/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save sale' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      production_id: 'uuid-open-season',
      harvest_events: [11],
      quantity_unit: 'lb'
    });
  });

  it('an open-season sale is corrected by Delete, not Void', () => {
    // Server side (`assert_child_record_deletable`) the retention floor applies only once the
    // season is finished; the editor offers the matching control.
    const src = readFileSync(resolve(__dirname, '../ProfileProduction.tsx'), 'utf8');
    expect(src).toMatch(/isFinished=\{Boolean\(historyData\?\.finish_date\)\}/);
  });

  it('a stored header unit off the dropdown still reads as differing, never as matching', () => {
    // Legacy rows can carry a production_unit the sale dropdown does not offer. The picks agree
    // on lb, but the lot's own unit is what the grower is told about.
    renderOpenSeason('pallets');
    expect(screen.getByText(/This lot was harvested in pallets/)).toBeInTheDocument();
    expect(screen.queryByText(/Matches this lot’s harvest unit/)).toBeNull();
  });

  it('takes the picks’ unit only when they agree on one', () => {
    expect(singlePickUnit(PICKS)).toBe('lb');
    expect(
      singlePickUnit([...PICKS, { id: 13, lot_code: 'X', yield_quantity: '4', yield_unit: 'bins' }])
    ).toBeNull();
    expect(
      singlePickUnit([{ id: 14, lot_code: 'Y', yield_quantity: null, yield_unit: 'lbs' }])
    ).toBeNull();
    expect(singlePickUnit([])).toBeNull();
  });
});
