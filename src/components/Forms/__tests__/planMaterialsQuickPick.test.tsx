/**
 * The plan's own Materials List beside a product name field (CCOF ORGB41: "Only materials included in
 * your OSP Materials List may be used", 2026-11-17).
 *
 * Pinned: a chip fills nothing by itself (it calls back with the material the grower tapped); a record
 * of one type is offered the plan's materials of that section, plus the ones the operator has not
 * sorted; and an empty list renders nothing at all.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../i18n/lang/en-US.json';

let MATERIALS: Array<Record<string, string>> = [];

vi.mock('store/api/historyApi', () => ({
  useGetPlanMaterialsForLoggingQuery: () => ({
    data: { osp_id: 11, osp_status: 'active', materials: MATERIALS }
  })
}));

const { PlanMaterialsQuickPick, categoriesForChemicalType } = await import(
  '../PlanMaterialsQuickPick'
);

const renderPick = (categories: string[] | null, onPick = vi.fn()) => {
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <PlanMaterialsQuickPick establishmentId="3" categories={categories} onPick={onPick} />
      </IntlProvider>
    </ChakraProvider>
  );
  return onPick;
};

const material = (name: string, category: string, manufacturer = '') => ({
  name,
  manufacturer,
  category,
  status: 'in_use',
  source: 'OMRI'
});

describe('PlanMaterialsQuickPick', () => {
  it("offers a pest record the plan's pest materials and the unsorted ones, never its fertilizers", () => {
    MATERIALS = [
      material('Entrust SC', 'pest_disease_weed', 'Corteva'),
      material('Pacific Gro', 'fertilizer_amendment'),
      material('Kocide 3000-O', '')
    ];
    renderPick(categoriesForChemicalType('PE'));
    expect(screen.getByText('On your materials list')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrust SC' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kocide 3000-O' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pacific Gro' })).toBeNull();
  });

  it('hands back the material tapped and saves nothing itself', () => {
    MATERIALS = [material('Entrust SC', 'pest_disease_weed', 'Corteva')];
    const onPick = renderPick(null);
    fireEvent.click(screen.getByRole('button', { name: 'Entrust SC' }));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0][0]).toMatchObject({ name: 'Entrust SC', manufacturer: 'Corteva' });
  });

  it('renders nothing when the plan lists nothing for this record', () => {
    MATERIALS = [material('Pacific Gro', 'fertilizer_amendment')];
    renderPick(['pest_disease_weed']);
    expect(screen.queryByTestId('plan-materials-quick-pick')).toBeNull();
  });

  it('maps a record type to its plan section, and an unknown type to every row', () => {
    expect(categoriesForChemicalType('FE')).toEqual(['fertilizer_amendment']);
    expect(categoriesForChemicalType('HE')).toEqual(['pest_disease_weed']);
    expect(categoriesForChemicalType('')).toBeNull();
  });
});
