/**
 * The operator, not Trazo, decides what a logged name IS (OSP alignment T18, Phase 5 slice 2), in a
 * panel redesigned after the 2026-10-03 browser test: collapsed rows with a status, uses that can be
 * judged, select all, an explicit Exclude, a one-tap suggestion, and undo with a reason.
 * The server enforces every rule; these tests hold the panel to collecting exactly the decision made.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const decide = vi.fn((_args: { body: Record<string, unknown> }) => ({
  unwrap: () => Promise.resolve({})
}));
const withdraw = vi.fn((_args: { body: Record<string, unknown> }) => ({
  unwrap: () => Promise.resolve({})
}));
let response: any;

vi.mock('store/api/ospApi', () => ({
  useGetMaterialIdentitiesQuery: () => ({ data: response }),
  useDecideMaterialIdentityMutation: () => [decide, { isLoading: false }],
  useWithdrawMaterialIdentityMutation: () => [withdraw, { isLoading: false }]
}));

import OSPMaterialIdentityPanel, {
  formulationDiffers,
  identityStatus
} from '../OSPMaterialIdentityPanel';

const LOGGED = "Neptune's Harvest Fish Fertilizer 2-3-1";
const PLANNED = "Neptune's Harvest Organic Fish Fertilizer 2-4-1";
const TARGET = { kind: 'omri', id: 7, name: PLANNED };

const uses = (n: number, state = 'unreviewed') =>
  Array.from({ length: n }, (_, i) => ({
    id: 100 + i,
    date: `2026-05-${String(i + 1).padStart(2, '0')}T09:00:00Z`,
    state,
    parcel: 'Home Field East',
    amount: '37.5 gal',
    as_logged: "Neptune's Harvest · lot NH-25-880"
  }));

const decided = (over: Record<string, unknown> = {}) => ({
  id: 5,
  decision: 'same_as',
  target_kind: 'omri',
  target_id: 7,
  target_name: PLANNED,
  reviewed_event_ids: [100, 101],
  exceptions: [],
  formulation_difference_acknowledged: true,
  formulation_note: 'label edition',
  note: '',
  decided_by_name: 'Laurel',
  decided_at: '2026-10-03T00:00:00Z',
  plan_version: 1,
  supersedes: null,
  superseded_at: null,
  basis: `identified by the operator as ${PLANNED} on 2026-10-03`,
  ...over
});

const identity = (over: Record<string, unknown> = {}) => ({
  source: 'chemical',
  logged_name: LOGGED,
  name_key: LOGGED.toLowerCase(),
  events: uses(2),
  current: null,
  history: [],
  suggestions: [],
  ...over
});

const renderPanel = (items: any[] = [identity()], status = 'active') => {
  response = { identities: items, targets: [TARGET] };
  return render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <OSPMaterialIdentityPanel companyId="1" farmId="2" osp={{ id: 3, status }} />
      </IntlProvider>
    </ChakraProvider>
  );
};

const openRow = (name = LOGGED) =>
  fireEvent.click(
    screen.getByRole('button', { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
  );
const record = () => screen.getByRole('button', { name: 'Record this decision' });

describe('material identity panel', () => {
  it('compares numbers in order', () => {
    expect(formulationDiffers(LOGGED, PLANNED)).toBe(true);
    expect(formulationDiffers('Fish 2-3-1', 'Fish 1-3-2')).toBe(true);
    expect(formulationDiffers('Fish 2-3-1', 'Organic Fish 2-3-1')).toBe(false);
  });

  it('gives each name one status from its uses', () => {
    expect(identityStatus(identity() as any)).toBe('not_reviewed');
    expect(
      identityStatus(identity({ current: decided(), events: uses(2, 'covered') }) as any)
    ).toBe('identified');
    expect(
      identityStatus(
        identity({
          current: decided({ decision: 'different_product' }),
          events: uses(1, 'covered')
        }) as any
      )
    ).toBe('different');
    expect(
      identityStatus(
        identity({
          current: decided(),
          events: [...uses(1, 'covered'), ...uses(1, 'unreviewed')]
        }) as any
      )
    ).toBe('needs_review');
  });

  it('lists names collapsed, with a summary, and opens one on demand', () => {
    renderPanel([
      identity(),
      identity({
        logged_name: 'SaniDate 5.0',
        name_key: 'sanidate',
        current: decided({ decision: 'different_product' }),
        events: uses(1, 'covered')
      })
    ]);
    expect(screen.getByTestId('identity-summary-line').textContent).toBe(
      '2 names · 1 decided · 1 to review'
    );
    expect(screen.queryByLabelText('Decision')).toBeNull();
    expect(screen.queryByText('Not reviewed')).not.toBeNull();
    openRow();
    expect(screen.queryByLabelText('Decision')).not.toBeNull();
  });

  it('shows where, how much and what was logged for each use', () => {
    renderPanel();
    openRow();
    const first = screen.getAllByTestId('identity-use')[0];
    expect(within(first).queryByText('2026-05-01 · Home Field East')).not.toBeNull();
    expect(
      within(first).queryByText("37.5 gal · Neptune's Harvest · lot NH-25-880")
    ).not.toBeNull();
  });

  it('select all ticks every use, and the hint says what is still missing', () => {
    renderPanel([identity({ events: uses(12) })]);
    openRow();
    expect(screen.getByTestId('identity-missing').textContent).toBe('Choose what this name is.');
    fireEvent.change(screen.getByLabelText('Decision'), { target: { value: 'different_product' } });
    expect(screen.getByTestId('identity-missing').textContent).toBe(
      'Tick the uses this decision covers.'
    );
    fireEvent.click(screen.getByText('Select all 12 uses'));
    expect(screen.getAllByTestId('identity-use')).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 12 uses' }));
    const boxes = screen
      .getAllByTestId('identity-use')
      .map((row) => within(row).getByRole('checkbox'));
    expect(boxes).toHaveLength(12);
    expect(boxes.every((b) => (b as HTMLInputElement).checked)).toBe(true);
    expect(screen.queryByTestId('identity-missing')).toBeNull();
    expect((record() as HTMLButtonElement).disabled).toBe(false);
  });

  it('asks for a reason only for a use the operator excludes, and sends only those', async () => {
    decide.mockClear();
    renderPanel();
    openRow();
    fireEvent.change(screen.getByLabelText('Decision'), { target: { value: 'different_product' } });
    fireEvent.click(screen.getByText('Select all 2 uses'));
    expect(screen.queryAllByPlaceholderText('To exclude this event, say why')).toHaveLength(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Exclude' })[1]);
    expect(screen.queryAllByPlaceholderText('To exclude this event, say why')).toHaveLength(1);
    expect(screen.queryByTestId('identity-missing')?.textContent).toBe(
      'Give a reason for each use you exclude.'
    );
    expect((record() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText('To exclude this event, say why'), {
      target: { value: 'Different block' }
    });
    fireEvent.click(record());
    await waitFor(() => expect(decide).toHaveBeenCalledTimes(1));
    expect(decide.mock.calls[0][0].body).toMatchObject({
      decision: 'different_product',
      event_ids: [100, 101],
      exceptions: [{ event_id: 101, reason: 'Different block' }]
    });
  });

  it('a suggestion fills the choice only when the operator taps it, then asks about the numbers', () => {
    renderPanel([
      identity({ suggestions: [{ kind: 'shared_brand', target: TARGET, numbers_differ: true }] })
    ]);
    openRow();
    expect((screen.getByLabelText('Decision') as HTMLSelectElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Use this product' }));
    expect((screen.getByLabelText('Decision') as HTMLSelectElement).value).toBe('same_as');
    expect((screen.getByLabelText('Product on the plan') as HTMLSelectElement).value).toBe(
      'omri:7'
    );
    expect(screen.queryByTestId('formulation-ack')).not.toBeNull();
  });

  it('a plan-answer suggestion names the section and question, never the stored keys', () => {
    renderPanel([
      identity({
        suggestions: [
          {
            kind: 'plan_answer_names',
            module: 'g6_4_handling',
            question: 'water_source_sanitizer',
            module_label: 'G6.4 On-Farm Handling',
            question_label: 'Describe the water and any sanitizer',
            product_name: 'Tsunami 100',
            catalog: 'wsda',
            catalog_id: 3,
            subtype: 'Peracetic Acid',
            approved_substance: ''
          }
        ]
      })
    ]);
    openRow();
    const text = screen.getByTestId('identity-suggestion').textContent || '';
    expect(text).toContain('G6.4 On-Farm Handling: "Describe the water and any sanitizer"');
    expect(text).not.toContain('g6_4_handling');
  });

  it('a decided name shows its decision and coverage, with change and undo instead of a form', () => {
    renderPanel([
      identity({
        current: decided(),
        events: [...uses(2, 'covered'), { ...uses(1, 'excepted')[0], id: 199 }]
      })
    ]);
    openRow();
    expect(screen.getByTestId('identity-summary').textContent).toContain(
      '2 of 3 uses covered, 1 excluded.'
    );
    expect(screen.queryByLabelText('Decision')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Change decision' }));
    expect(screen.queryByLabelText('Decision')).not.toBeNull();
    expect(
      screen.queryByText(
        'This replaces the current decision. The current one stays in the history.'
      )
    ).not.toBeNull();
  });

  it('undo needs a reason and sends the decision and the reason', async () => {
    withdraw.mockClear();
    renderPanel([identity({ current: decided(), events: uses(2, 'covered') })]);
    openRow();
    fireEvent.click(screen.getByRole('button', { name: 'Undo decision' }));
    const confirm = screen.getByRole('button', { name: 'Undo this decision' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText('Why you are undoing it'), {
      target: { value: 'Wrong product' }
    });
    fireEvent.click(confirm);
    await waitFor(() => expect(withdraw).toHaveBeenCalledTimes(1));
    expect(withdraw.mock.calls[0][0].body).toEqual({ withdraw: 5, reason: 'Wrong product' });
  });

  it('a plain-text error body reads as text', async () => {
    decide.mockImplementationOnce(() => ({
      unwrap: () => Promise.reject({ status: 500, data: 'Server Error' })
    }));
    renderPanel();
    openRow();
    fireEvent.change(screen.getByLabelText('Decision'), { target: { value: 'different_product' } });
    fireEvent.click(screen.getByText('Select all 2 uses'));
    fireEvent.click(record());
    await waitFor(() => expect(screen.queryByText('Server Error')).not.toBeNull());
  });

  it('collects nothing on a plan that is not editable', () => {
    renderPanel([identity()], 'submitted');
    openRow();
    expect(screen.queryByLabelText('Decision')).toBeNull();
  });
});

describe('suggestions (slice 3, kept through the redesign)', () => {
  it('a match after a leading brand word never says "starts like"', () => {
    renderPanel([
      identity({
        suggestions: [
          {
            kind: 'shared_brand',
            target: {
              kind: 'omri',
              id: 9,
              name: 'Bayer Serenade Opti A Wettable Powder Biofungicide'
            },
            numbers_differ: false,
            after_prefix: true
          }
        ]
      })
    ]);
    openRow();
    expect(
      screen.queryByText(
        'Shares its product name with "Bayer Serenade Opti A Wettable Powder Biofungicide" on the plan (after that name\'s leading brand word).'
      )
    ).not.toBeNull();
    expect(screen.queryByText(/Starts like "Bayer Serenade/)).toBeNull();
  });

  it('a decided name shows its decision, not suggestions, and nothing is preselected before', () => {
    const suggestions = [{ kind: 'shared_brand', target: TARGET, numbers_differ: true }];
    renderPanel([identity({ suggestions, current: decided(), events: uses(2, 'covered') })]);
    openRow();
    expect(screen.queryByTestId('identity-suggestions')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Change decision' }));
    expect((screen.getByLabelText('Decision') as HTMLSelectElement).value).toBe('');
    for (const box of screen
      .getAllByTestId('identity-use')
      .map((r) => within(r).getByRole('checkbox'))) {
      expect((box as HTMLInputElement).checked).toBe(false);
    }
  });
});

describe('excluding a use is explicit', () => {
  it('a reason typed and then kept is not sent as an exclusion', async () => {
    decide.mockClear();
    renderPanel();
    openRow();
    fireEvent.change(screen.getByLabelText('Decision'), { target: { value: 'different_product' } });
    fireEvent.click(screen.getByText('Select all 2 uses'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Exclude' })[0]);
    fireEvent.change(screen.getByPlaceholderText('To exclude this event, say why'), {
      target: { value: 'Changed my mind' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    fireEvent.click(record());
    await waitFor(() => expect(decide).toHaveBeenCalledTimes(1));
    expect(decide.mock.calls[0][0].body.exceptions).toEqual([]);
  });
});

describe('reads as a to-do list', () => {
  it('lists names still to review before decided ones', () => {
    renderPanel([
      identity({
        logged_name: 'Decided Product',
        name_key: 'decided',
        current: decided(),
        events: uses(1, 'covered')
      }),
      identity({ logged_name: 'Open Product', name_key: 'open' })
    ]);
    const names = screen.getAllByTestId('material-identity-row').map((r) => r.textContent || '');
    expect(names[0].startsWith('Open Product')).toBe(true);
    expect(names[1].startsWith('Decided Product')).toBe(true);
  });

  it('marks a use only when it is covered, excluded or changed, not when merely unreviewed', () => {
    renderPanel([identity({ events: [...uses(1), { ...uses(1, 'stale')[0], id: 300 }] })]);
    openRow();
    const [plain, changed] = screen.getAllByTestId('identity-use');
    expect(plain.querySelector('[data-state]')).toBeNull();
    expect(changed.querySelector('[data-state="stale"]')).not.toBeNull();
  });
});
