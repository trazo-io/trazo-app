/**
 * The Materials List editor exists because three of its columns had no control anywhere.
 *
 * A catalog listing says a product is ALLOWED. It cannot say this operation uses it, or why. So
 * the Materials List attachment printed "Manufacturer", "Reason for use", "In use" and "Intended
 * for use" empty on every catalog-sourced row, the § 11 attachments panel counted them as "cells
 * to fill in Trazo", and Trazo had nowhere to fill them.
 *
 * What is pinned here is the pair of rules the panel must not lose:
 *   1. NOTHING is prefilled from a guess — a material with no stated use leaves both USDA
 *      checkboxes empty, because "in use" and "intended for use" are different claims.
 *   2. Typing is not a save. A keystroke-per-request editor on a 19-row regulatory list is both
 *      a write storm and a half-typed reason landing in a certifier packet.
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';

type AnswerArgs = {
  companyId: string;
  farmId: string;
  ospId: string;
  body: Record<string, string>;
};

// Typed, so `mock.calls[0][0].body` below is checked rather than inferred as an empty tuple —
// an untyped `vi.fn` makes the assertions that matter most here invisible to the compiler.
const answerMaterial = vi.fn<[AnswerArgs], { unwrap: () => Promise<unknown> }>(() => ({
  unwrap: () => Promise.resolve({})
}));

const MATERIALS = [
  {
    name: 'Serenade ASO',
    manufacturer: 'Bayer',
    reason: '',
    status: '',
    in_use: false,
    intended_for_use: false,
    source: 'plan',
    listing: 'OMRI #bay-1234',
    entry_id: null
  },
  {
    name: 'Rexius Organic Compost',
    manufacturer: '',
    reason: 'Soil amendment',
    status: 'in_use',
    in_use: true,
    intended_for_use: false,
    source: 'records',
    listing: '',
    entry_id: null
  }
];

vi.mock('store/api/ospApi', () => ({
  useGetOSPMaterialsListQuery: () => ({ data: { materials: MATERIALS }, isLoading: false }),
  useAnswerOSPMaterialMutation: () => [answerMaterial, { isLoading: false }]
}));

const { default: OSPMaterialsListPanel } = await import('../OSPMaterialsListPanel');

const renderPanel = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <OSPMaterialsListPanel companyId="7" farmId="3" osp={{ id: '11', status: 'draft' }} />
      </IntlProvider>
    </ChakraProvider>
  );

describe('OSP Materials List editor', () => {
  beforeEach(() => {
    answerMaterial.mockClear();
  });

  it('leaves both USDA use columns unstated until the operator picks one', () => {
    renderPanel();
    const select = screen.getByLabelText('How Serenade ASO is used') as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(screen.getByText('1 material has no use stated yet')).toBeInTheDocument();
  });

  it('records the use the operator picks, and only that', async () => {
    renderPanel();
    const select = screen.getByLabelText('How Serenade ASO is used');
    await act(async () => {
      fireEvent.change(select, { target: { value: 'in_use' } });
    });
    expect(answerMaterial).toHaveBeenCalledTimes(1);
    expect(answerMaterial.mock.calls[0][0].body).toEqual({
      name: 'Serenade ASO',
      status: 'in_use'
    });
  });

  it('does not save a reason on every keystroke', async () => {
    renderPanel();
    const input = screen.getByLabelText('Reason Serenade ASO is used');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Fire bl' } });
      fireEvent.change(input, { target: { value: 'Fire blight' } });
    });
    expect(answerMaterial).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.blur(input);
    });
    expect(answerMaterial).toHaveBeenCalledTimes(1);
    expect(answerMaterial.mock.calls[0][0].body).toEqual({
      name: 'Serenade ASO',
      reason_for_use: 'Fire blight'
    });
  });

  it('does not write back a value nobody changed', async () => {
    renderPanel();
    // Leaving a field the operator only tabbed through must not author anything: the reason
    // shown may be one Trazo DERIVED from the event type, and saving it on a blur would turn a
    // derivation into the operator's own words without them typing a character.
    const input = screen.getByLabelText('Reason Rexius Organic Compost is used');
    await act(async () => {
      fireEvent.blur(input);
    });
    expect(answerMaterial).not.toHaveBeenCalled();
  });

  it('says which materials are in the records but not yet on the plan', () => {
    renderPanel();
    expect(screen.getByText('In your records, not yet on the plan')).toBeInTheDocument();
    expect(screen.getByText('On the plan')).toBeInTheDocument();
  });
});
