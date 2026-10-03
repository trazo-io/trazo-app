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

describe('review of app #68', () => {
  it('a second decision never reuses the first acknowledgment', async () => {
    decide.mockClear();
    renderPanel();
    fireEvent.change(screen.getByLabelText('Decision'), { target: { value: 'same_as' } });
    fireEvent.change(screen.getByLabelText('Product on the plan'), { target: { value: 'omri:7' } });
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByText('I understand the difference and these are the same product'));
    fireEvent.change(screen.getByPlaceholderText('Why they are the same product'), {
      target: { value: 'Label analysis updated' }
    });
    fireEvent.click(record());
    await waitFor(() => expect(decide).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByLabelText('Decision')).toHaveValue(''));
    fireEvent.change(screen.getByLabelText('Decision'), { target: { value: 'same_as' } });
    fireEvent.change(screen.getByLabelText('Product on the plan'), { target: { value: 'omri:7' } });
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(
      screen.getByRole('checkbox', {
        name: 'I understand the difference and these are the same product'
      })
    ).not.toBeChecked();
    expect(screen.getByPlaceholderText('Why they are the same product')).toHaveValue('');
    expect(record()).toBeDisabled();
  });

  it('a plain-text error body reads as text', async () => {
    decide.mockImplementationOnce(() => ({
      unwrap: () => Promise.reject({ status: 500, data: 'Server Error' })
    }));
    renderPanel();
    fireEvent.change(screen.getByLabelText('Decision'), { target: { value: 'different_product' } });
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(record());
    await waitFor(() => expect(screen.queryByText('Server Error')).toBeInTheDocument());
    expect(screen.queryByText('S e r v e r   E r r o r')).toBeNull();
  });

  it('uses the theme amber, never Chakra orange', async () => {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const src = readFileSync(join(__dirname, '../OSPMaterialIdentityPanel.tsx'), 'utf8');
    expect(src).not.toMatch(/orange/);
  });
});

describe('review suggestions (Phase 5 slice 3)', () => {
  const suggestions = [
    { kind: 'shared_brand', target: { kind: 'omri', id: 7, name: PLANNED }, numbers_differ: true },
    {
      kind: 'plan_answer_names',
      module: 'g6_4_handling',
      question: 'water_source_sanitizer',
      product_name: 'Tsunami 100',
      catalog: 'wsda',
      catalog_id: 3,
      subtype: 'Peracetic Acid',
      approved_substance: 'Peracetic acid'
    },
    { kind: 'suggested_substance_on_plan', substance_id: 4, substance_name: 'Lime sulfur' }
  ];

  it('lists each suggestion as a prompt and fills in nothing', () => {
    renderPanel({ suggestions });
    expect(screen.queryByTestId('identity-suggestions')).not.toBeNull();
    expect(
      screen.queryByText('Worth a look. Suggestions decide nothing and clear nothing.')
    ).not.toBeNull();
    expect(
      screen.queryByText(`Starts like "${PLANNED}" on the plan, with different numbers.`)
    ).not.toBeNull();
    expect(
      screen.queryByText(
        'Your plan answer (g6_4_handling / water_source_sanitizer) names "Tsunami 100", which WSDA lists under Peracetic acid, a substance this plan approves.'
      )
    ).not.toBeNull();
    expect(
      screen.queryByText(
        'Part of the name matches Lime sulfur, which this plan approves. This is not a classification.'
      )
    ).not.toBeNull();
    expect((screen.getByLabelText('Decision') as HTMLSelectElement).value).toBe('');
    expect(screen.queryByLabelText('Product on the plan')).toBeNull();
    for (const box of screen.getAllByRole('checkbox')) expect(box).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Record this decision' })).toBeDisabled();
  });

  it('a decided name shows its decision, not suggestions', () => {
    renderPanel({
      suggestions,
      current: {
        id: 5,
        decision: 'different_product',
        target_kind: '',
        target_id: null,
        target_name: '',
        reviewed_event_ids: [11],
        exceptions: [],
        formulation_difference_acknowledged: false,
        formulation_note: '',
        note: '',
        decided_by_name: 'Laurel',
        decided_at: '2026-10-02T00:00:00Z',
        plan_version: 1,
        supersedes: null,
        superseded_at: null,
        basis: 'identified by the operator as a different product on 2026-10-02'
      }
    });
    expect(screen.queryByTestId('identity-suggestions')).toBeNull();
  });
});
