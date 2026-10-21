/**
 * "Also applied to" and the per-block amounts (one spray, several blocks).
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
import { AlsoAppliedTo, PerParcelAmounts, type FarmParcel } from '../MultiParcel';
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
    const origin = screen.getByRole('checkbox', { name: /Block A \(this block\)/ });
    expect(origin).toBeChecked();
    expect(origin).toHaveAttribute('readonly');
  });

  it('refuses blocks the server would refuse, and says why beside them', () => {
    wrap(<Picker />);
    expect(screen.getByRole('checkbox', { name: /Block C/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Block D/ })).toBeDisabled();
    expect(screen.getByText(/No open production on this block/)).toBeInTheDocument();
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

const Cards = ({
  initial,
  rate = '2',
  showIssues = false
}: {
  initial: ParcelTarget[];
  rate?: string;
  showIssues?: boolean;
}) => {
  const [targets, setTargets] = useState(initial);
  return (
    <PerParcelAmounts
      targets={targets}
      onChange={setTargets}
      inputs={{ rate, rateUnit: 'gal_ac', volumeUnit: 'gal', areaUnit: 'acres' }}
      showIssues={showIssues}
    />
  );
};

describe('PerParcelAmounts', () => {
  const blockA = newTarget({ id: 1, name: 'Block A', area: 5.0181 });

  it('asks whole or part with neither chosen, and no amount until it is answered', () => {
    wrap(<Cards initial={[blockA]} />);
    expect(screen.getByRole('button', { name: /Whole block \(12\.4 ac\)/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.queryByText(/Product applied/)).not.toBeInTheDocument();
  });

  it('whole block: shows the derivation and offers it as the amount', () => {
    wrap(<Cards initial={[blockA]} />);
    fireEvent.click(screen.getByRole('button', { name: /Whole block/ }));
    expect(screen.getByText('2 gal/ac × 12.4 ac = 24.8 gal')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('24.8')).toHaveValue(null);
  });

  it('says when it cannot derive, instead of guessing', () => {
    wrap(<Cards initial={[{ ...blockA, scope: 'all' }]} rate="" />);
    expect(screen.getByText(/It is not calculated/)).toBeInTheDocument();
  });

  it('after a refused Continue, marks what each block is missing', () => {
    wrap(
      <Cards
        initial={[blockA, { ...newTarget({ id: 2, name: 'Block B', area: 1 }), scope: 'part' }]}
        showIssues
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Choose whole block or part.');
    expect(screen.getByText('Enter the area treated.')).toBeInTheDocument();
  });
});
