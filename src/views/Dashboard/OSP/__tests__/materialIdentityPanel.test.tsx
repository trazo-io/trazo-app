/**
 * The operator, not Trazo, decides what a logged name IS (OSP alignment T18, Phase 5 slice 2).
 * The server enforces every rule; these tests hold the panel to collecting exactly the decision made.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const decide = vi.fn((_args: { body: Record<string, unknown> }) => ({
  unwrap: () => Promise.resolve({})
}));
let response: any;

vi.mock('store/api/ospApi', () => ({
  useGetMaterialIdentitiesQuery: () => ({ data: response }),
  useDecideMaterialIdentityMutation: () => [decide, { isLoading: false }]
}));

import OSPMaterialIdentityPanel, { formulationDiffers } from '../OSPMaterialIdentityPanel';

const LOGGED = "Neptune's Harvest Fish Fertilizer 2-3-1";
const PLANNED = "Neptune's Harvest Organic Fish Fertilizer 2-4-1";

const identity = (over: Record<string, unknown> = {}) => ({
  source: 'chemical',
  logged_name: LOGGED,
  name_key: LOGGED.toLowerCase(),
  events: [
    { id: 11, date: '2026-05-01', state: 'unreviewed' },
    { id: 12, date: '2026-05-08', state: 'stale' }
  ],
  current: null,
  history: [],
  ...over
});

const renderPanel = (over = {}) => {
  response = { identities: [identity(over)], targets: [{ kind: 'omri', id: 7, name: PLANNED }] };
  return render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <OSPMaterialIdentityPanel companyId="1" farmId="2" osp={{ id: 3, status: 'active' }} />
      </IntlProvider>
    </ChakraProvider>
  );
};

const record = () => screen.getByRole('button', { name: 'Record this decision' });

describe('material identity panel', () => {
  it('compares numbers in order', () => {
    expect(formulationDiffers(LOGGED, PLANNED)).toBe(true);
    expect(formulationDiffers('Fish 2-3-1', 'Fish 1-3-2')).toBe(true);
    expect(formulationDiffers('Fish 2-3-1', 'Organic Fish 2-3-1')).toBe(false);
  });

  it('says an unidentified name is unidentified and shows each event state', () => {
    renderPanel();
    expect(screen.queryByText('Not on the plan, and not identified yet.')).toBeInTheDocument();
    expect(screen.queryByText('Not reviewed')).toBeInTheDocument();
    expect(screen.queryByText('Changed since review')).toBeInTheDocument();
  });

  it('records only the events reviewed, with exclusions, and asks to acknowledge different numbers', async () => {
    decide.mockClear();
    renderPanel();
    expect(record()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Decision'), { target: { value: 'same_as' } });
    fireEvent.change(screen.getByLabelText('Product on the plan'), { target: { value: 'omri:7' } });
    const [first, second] = screen.getAllByRole('checkbox');
    fireEvent.click(first);
    fireEvent.click(second);
    fireEvent.change(screen.getAllByPlaceholderText('To exclude this event, say why')[1], {
      target: { value: 'Wrong block' }
    });
    expect(screen.queryByTestId('formulation-ack')).toBeInTheDocument();
    expect(record()).toBeDisabled();
    fireEvent.click(screen.getByText('I understand the difference and these are the same product'));
    fireEvent.change(screen.getByPlaceholderText('Why they are the same product'), {
      target: { value: 'Label analysis updated' }
    });
    expect(record()).not.toBeDisabled();
    fireEvent.click(record());
    await waitFor(() => expect(decide).toHaveBeenCalledTimes(1));
    const body = decide.mock.calls[0]?.[0].body ?? {};
    expect(body.event_ids).toEqual([11, 12]);
    expect(body.exceptions).toEqual([{ event_id: 12, reason: 'Wrong block' }]);
    expect(body).toMatchObject({
      decision: 'same_as',
      target_kind: 'omri',
      target_id: 7,
      formulation_difference_acknowledged: true,
      formulation_note: 'Label analysis updated'
    });
    expect(body).not.toHaveProperty('supersedes');
  });

  it('a new decision names the one it replaces', async () => {
    decide.mockClear();
    renderPanel({
      current: {
        id: 41,
        decision: 'different_product',
        basis: 'identified by the operator as a different product'
      },
      history: [
        { id: 41, basis: 'identified by the operator as a different product', superseded_at: null }
      ]
    });
    expect(screen.queryByText(/replaces the current decision/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Decision'), { target: { value: 'different_product' } });
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(record());
    await waitFor(() => expect(decide).toHaveBeenCalledTimes(1));
    expect(decide.mock.calls[0]?.[0].body).toMatchObject({ supersedes: 41, event_ids: [11] });
  });
});
