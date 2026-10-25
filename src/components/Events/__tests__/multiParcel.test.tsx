/**
 * "Also applied to" and the per-parcel cards (one activity, several parcels).
 *
 * The picker must never let a block be ticked that the server would refuse (no open season, two
 * open seasons), and must SAY why next to it. The cards must not claim "whole block" before the
 * grower answers, and must show the derivation behind any amount they suggest.
 */
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';

import enUS from '../../../i18n/lang/en-US.json';
import { AlsoAppliedTo, PerParcelCards, type FarmParcel } from '../MultiParcel';
import { specRulesFor, type MultiParcelRules } from '../../../config/events/multiParcel';
import { newTarget, type ParcelTarget } from '../../../utils/multiParcel';

const wrap = (ui: React.ReactElement) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS}>
        {ui}
      </IntlProvider>
    </ChakraProvider>
  );

const PARCELS: FarmParcel[] = [
  { id: 1, name: 'Block A', area: 5.0181, open_season_count: 1 },
  { id: 2, name: 'Block B', area: 2.4281, open_season_count: 1 },
  { id: 3, name: 'Block C', area: 1, open_season_count: 0 },
  { id: 4, name: 'Block D', area: 1, open_season_count: 2 },
  { id: 5, name: 'Block E', area: 1, open_season_count: null }
];

const Picker = ({ onIds }: { onIds?: (ids: number[]) => void }) => {
  const [ids, setIds] = useState<number[]>([]);
  return (
    <AlsoAppliedTo
      parcels={PARCELS}
      originParcelId={1}
      selectedIds={ids}
      onChange={(next) => {
        setIds(next);
        onIds?.(next);
      }}
    />
  );
};

describe('AlsoAppliedTo', () => {
  it('shows the origin block ticked and locked, and names it', () => {
    wrap(<Picker />);
    const origin = screen.getByRole('checkbox', { name: /Block A \(this parcel\)/ });
    expect(origin).toBeChecked();
    expect(origin).toHaveAttribute('readonly');
  });

  it('refuses blocks the server would refuse, and says why beside them', () => {
    wrap(<Picker />);
    expect(screen.getByRole('checkbox', { name: /Block C/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Block D/ })).toBeDisabled();
    expect(screen.getByText(/No open production on this parcel/)).toBeInTheDocument();
    expect(screen.getByText(/two open productions/)).toBeInTheDocument();
    // Not counted is not "none": the server decides, so the block stays pickable.
    expect(screen.getByRole('checkbox', { name: /Block E/ })).not.toBeDisabled();
  });

  it('select all picks every pickable block, never the origin twice or a refused block', () => {
    let last: number[] = [];
    wrap(<Picker onIds={(ids) => (last = ids)} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
    expect(last.sort()).toEqual([2, 5]);
  });

  it('shows each block size in the form unit', () => {
    wrap(<Picker />);
    expect(screen.getByText('12.4 ac')).toBeInTheDocument();
  });
});

const chemical = specRulesFor(2, 'FU') as MultiParcelRules;
const mowing = specRulesFor(1, 'MO') as MultiParcelRules;
const galPerAcre = {
  application_rate: '2',
  application_rate_unit: 'gal_ac',
  volume_unit: 'gal',
  area_unit: 'acres'
};

const Cards = ({
  initial,
  rules = chemical,
  form = galPerAcre,
  sections = {},
  showIssues = false
}: {
  initial: ParcelTarget[];
  rules?: MultiParcelRules;
  form?: Record<string, unknown>;
  sections?: Record<number, string[]>;
  showIssues?: boolean;
}) => {
  const [targets, setTargets] = useState(initial);
  return (
    <PerParcelCards
      targets={targets}
      onChange={setTargets}
      rules={rules}
      form={form}
      sectionsByParcel={sections}
      showIssues={showIssues}
    />
  );
};

describe('PerParcelCards', () => {
  const blockA = newTarget({ id: 1, name: 'Block A', area: 5.0181 });

  it('asks whole or part with neither chosen, and nothing else until it is answered', () => {
    wrap(<Cards initial={[blockA]} />);
    expect(screen.getByRole('button', { name: /Whole parcel \(12\.4 ac\)/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.queryByText(/Product applied/)).not.toBeInTheDocument();
  });

  it('whole parcel: shows the derivation and offers it as the amount', () => {
    wrap(<Cards initial={[blockA]} />);
    fireEvent.click(screen.getByRole('button', { name: /Whole parcel/ }));
    expect(screen.getByText('2 gal/ac × 12.4 ac = 24.8 gal')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('24.8')).toHaveValue(null);
  });

  it('a parcel with no size on record asks for it under "whole parcel"', () => {
    wrap(<Cards initial={[newTarget({ id: 9, name: 'New block', area: 0 })]} showIssues />);
    fireEvent.click(screen.getByRole('button', { name: 'Whole parcel' }));
    expect(screen.getByLabelText(/Parcel size \(ac\)/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Parcel size \(ac\)/), { target: { value: '8' } });
    expect(screen.getByText('2 gal/ac × 8 ac = 16 gal')).toBeInTheDocument();
  });

  it('says when it cannot derive, instead of guessing', () => {
    wrap(
      <Cards
        initial={[{ ...blockA, scope: 'all' }]}
        form={{ ...galPerAcre, application_rate: '' }}
      />
    );
    expect(screen.getByText(/It is not calculated/)).toBeInTheDocument();
  });

  it("offers THIS parcel's own sections as chips, and a tap fills the section", () => {
    wrap(
      <Cards
        initial={[
          { ...blockA, scope: 'all' },
          { ...newTarget({ id: 2, name: 'Block B', area: 1 }), scope: 'all' }
        ]}
        sections={{ 1: ['Rows 1-12'], 2: ['East half'] }}
      />
    );
    const chip = screen.getByRole('button', { name: 'Rows 1-12' });
    expect(screen.getByRole('button', { name: 'East half' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Rows 1-12|East half/ })).toHaveLength(2);
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  it('another activity asks its own fields: mowing asks fuel and hours, no product', () => {
    wrap(
      <Cards
        initial={[{ ...blockA, scope: 'all' }]}
        rules={mowing}
        form={{ area_unit: 'acres', fuel_unit: 'gal' }}
      />
    );
    expect(screen.getByText('Fuel used (gal)')).toBeInTheDocument();
    expect(screen.getByText('Machine hours')).toBeInTheDocument();
    expect(screen.queryByText(/Product applied/)).not.toBeInTheDocument();
  });

  it('the hint names only what these cards ask: no area or label rate on a weather record', () => {
    const weather = specRulesFor(0, null) as MultiParcelRules;
    const { unmount } = wrap(<Cards initial={[blockA]} rules={weather} form={{}} />);
    expect(screen.getByText('One record per parcel.')).toBeInTheDocument();
    unmount();

    wrap(<Cards initial={[blockA]} />);
    expect(
      screen.getByText(
        'One record per parcel. Say how much of each parcel the work covered. Fill in what ' +
          'differs. An amount that follows from a label rate is suggested, and you can change it.'
      )
    ).toBeInTheDocument();
  });

  it('writes the depth unit as a symbol, never the stored word', () => {
    const irrigation = specRulesFor(1, 'IR') as MultiParcelRules;
    wrap(
      <Cards
        initial={[{ ...blockA, scope: 'all' }]}
        rules={irrigation}
        form={{ area_unit: 'acres', irrigation_depth_unit: 'inches' }}
      />
    );
    expect(screen.getByText(/\(in\)/)).toBeInTheDocument();
    expect(screen.queryByText(/\(inches\)/)).not.toBeInTheDocument();
  });

  it('refuses more decimals than the server keeps, on the field, before the save', () => {
    const irrigation = specRulesFor(1, 'IR') as MultiParcelRules;
    wrap(
      <Cards
        initial={[{ ...blockA, scope: 'all', values: { irrigation_depth: '0.125' } }]}
        rules={irrigation}
        form={{ area_unit: 'acres', irrigation_depth_unit: 'inches' }}
        showIssues
      />
    );
    expect(screen.getByText('Use at most 2 decimals.')).toBeInTheDocument();
  });

  it('after a refused Continue, marks what each parcel is missing', () => {
    wrap(
      <Cards
        initial={[blockA, { ...newTarget({ id: 2, name: 'Block B', area: 1 }), scope: 'part' }]}
        showIssues
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Choose whole parcel or part.');
    expect(screen.getByText('Enter the area treated.')).toBeInTheDocument();
  });
});
