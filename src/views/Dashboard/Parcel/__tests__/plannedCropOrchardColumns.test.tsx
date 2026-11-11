/**
 * An orchard row on the parcel's crop table is one block: block name, rootstock, year planted and
 * bearing status beside crop, variety, harvest and acres (overall review 2026-11, OV-FJ-C06).
 *
 * The inputs render and save through the planned-crop route; a row shows the four only when a row on
 * the parcel states one (the parcel PDF's rule); and a blank bearing status reads "Not stated", never
 * "Not yet bearing".
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';
import type { PlannedCrop } from 'store/api/parcelApplicationApi';

const add = vi.fn();
const update = vi.fn();

vi.mock('store/api/parcelApplicationApi', () => ({
  useAddPlannedCropMutation: () => [add, { isLoading: false }],
  useUpdatePlannedCropMutation: () => [update, { isLoading: false }],
  useDeletePlannedCropMutation: () => [vi.fn(), { isLoading: false }]
}));

import PlannedCropRows, { statesOrchardFields, yearPlantedIsValid } from '../PlannedCropRows';

const row = (over: Partial<PlannedCrop>): PlannedCrop => ({
  id: 1,
  crop: 'Apples',
  variety: '',
  expected_harvest: null,
  acres: null,
  block_name: '',
  rootstock: '',
  year_planted: null,
  bearing_status: '',
  ...over
});

const renderRows = (crops: PlannedCrop[]) =>
  render(
    <ChakraProvider>
      <IntlProvider
        locale="en-US"
        messages={enUS as Record<string, string>}
        onError={() => undefined}>
        <PlannedCropRows
          crops={crops}
          openSeasonCrops={[]}
          canWrite
          companyId="1"
          farmId="2"
          parcelId="3"
        />
      </IntlProvider>
    </ChakraProvider>
  );

const ok = () => ({ unwrap: () => Promise.resolve({}) });

beforeEach(() => {
  add.mockReset().mockImplementation(ok);
  update.mockReset().mockImplementation(ok);
});

describe('planned-crop orchard columns', () => {
  it('shows the orchard line on every row once one row states a column, blanks as Not stated', () => {
    renderRows([
      row({
        id: 1,
        block_name: 'Block 3',
        rootstock: 'M.9',
        year_planted: 2015,
        bearing_status: 'bearing'
      }),
      row({ id: 2, crop: 'Pears' })
    ]);
    expect(screen.getByTestId('planned-crop-orchard-1').textContent).toBe(
      'Section / rows: Block 3 · Rootstock: M.9 · Year planted: 2015 · Bearing status: Bearing'
    );
    const blank = screen.getByTestId('planned-crop-orchard-2').textContent;
    expect(blank).toBe(
      'Section / rows: Not stated · Rootstock: Not stated · Year planted: Not stated · Bearing status: Not stated'
    );
    expect(blank).not.toContain('Not yet bearing');
  });

  it('leaves a parcel with no orchard column as it was', () => {
    renderRows([row({ id: 1, crop: 'Carrots', variety: 'Nantes', acres: '2.00' })]);
    expect(screen.queryByTestId('planned-crop-orchard-1')).toBeNull();
    expect(statesOrchardFields(row({}))).toBe(false);
    expect(statesOrchardFields(row({ bearing_status: 'non_bearing' }))).toBe(true);
  });

  it('saves a new block with its rootstock, year planted and bearing status', async () => {
    renderRows([]);
    fireEvent.click(screen.getByRole('button', { name: 'Add a crop' }));
    fireEvent.change(screen.getByLabelText(/^Crop/), { target: { value: 'Apples' } });
    fireEvent.change(screen.getByLabelText(/^Section \/ rows/), {
      target: { value: 'Block 3' }
    });
    fireEvent.change(screen.getByLabelText(/^Rootstock/), { target: { value: 'Geneva 41' } });
    fireEvent.change(screen.getByLabelText(/^Year planted/), { target: { value: '2015' } });
    fireEvent.change(screen.getByLabelText(/^Bearing status/), {
      target: { value: 'non_bearing' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save crop' }));
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    expect(add.mock.calls[0][0]).toEqual({
      companyId: '1',
      farmId: '2',
      parcelId: '3',
      data: {
        crop: 'Apples',
        variety: '',
        expected_harvest: null,
        acres: null,
        block_name: 'Block 3',
        rootstock: 'Geneva 41',
        year_planted: 2015,
        bearing_status: 'non_bearing'
      }
    });
  });

  it('refuses a future year in the form, in words, without calling the server', async () => {
    // Found rendering the form (2026-11-11): the server's refusal reached a Spanish-reading grower as
    // "year_planted: Year planted must be from 1900 to 2026", in English with the field key.
    renderRows([]);
    fireEvent.click(screen.getByRole('button', { name: 'Add a crop' }));
    fireEvent.change(screen.getByLabelText(/^Crop/), { target: { value: 'Apples' } });
    const next = new Date().getFullYear() + 1;
    fireEvent.change(screen.getByLabelText(/^Year planted/), { target: { value: String(next) } });
    expect(
      screen.getByText(new RegExp(`Enter a year from 1900 to ${next - 1}`))
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save crop' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(add).not.toHaveBeenCalled();
  });

  it('accepts a blank year or a whole year from 1900 to this year, and nothing else', () => {
    expect(yearPlantedIsValid('', 2026)).toBe(true);
    expect(yearPlantedIsValid('  ', 2026)).toBe(true);
    expect(yearPlantedIsValid('1900', 2026)).toBe(true);
    expect(yearPlantedIsValid('2026', 2026)).toBe(true);
    expect(yearPlantedIsValid('2027', 2026)).toBe(false);
    expect(yearPlantedIsValid('1899', 2026)).toBe(false);
    expect(yearPlantedIsValid('15', 2026)).toBe(false);
    expect(yearPlantedIsValid('2015.5', 2026)).toBe(false);
  });

  it('edits a row back to not stated: blank year is null, blank bearing is empty', async () => {
    renderRows([
      row({ id: 7, block_name: 'Block 3', year_planted: 2015, bearing_status: 'bearing' })
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect((screen.getByLabelText(/^Section \/ rows/) as HTMLInputElement).value).toBe('Block 3');
    expect((screen.getByLabelText(/^Bearing status/) as HTMLSelectElement).value).toBe('bearing');
    fireEvent.change(screen.getByLabelText(/^Year planted/), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/^Bearing status/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save crop' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][0]).toMatchObject({
      cropId: 7,
      data: { block_name: 'Block 3', year_planted: null, bearing_status: '' }
    });
  });
});
