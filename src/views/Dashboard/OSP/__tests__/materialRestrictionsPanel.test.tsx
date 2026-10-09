/**
 * Restriction statements (OSP alignment T18, Phase 5 slice 2b), in the panel redesigned after the
 * 2026-10-03 browser test: collapsed rows with a status, "Add a restriction", "Update how you meet
 * it", and withdraw with a reason. The server enforces every rule; these tests hold the panel to
 * saying what Trazo holds and collecting exactly what the operator states.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const recordStatement = vi.fn((_args: { body: Record<string, unknown> }) => ({
  unwrap: () => Promise.resolve({})
}));
const withdrawStatement = vi.fn((_args: { body: Record<string, unknown> }) => ({
  unwrap: () => Promise.resolve({})
}));
let response: any;

vi.mock('store/api/ospApi', () => ({
  useGetMaterialRestrictionsQuery: () => ({ data: response }),
  useRecordRestrictionStatementMutation: () => [recordStatement, { isLoading: false }],
  useWithdrawRestrictionStatementMutation: () => [withdrawStatement, { isLoading: false }]
}));

import OSPMaterialRestrictionsPanel, { restrictionStatus } from '../OSPMaterialRestrictionsPanel';

const material = (over: Record<string, unknown> = {}) => ({
  material_kind: 'omri',
  material_id: 7,
  material_name: 'Entrust SC',
  regulation_restriction: null,
  statements: [],
  history: [],
  earlier_versions: [],
  printed: 'Restriction not documented in Trazo.',
  ...over
});

const statement = (over: Record<string, unknown> = {}) => ({
  id: 41,
  material_kind: 'omri',
  material_id: 7,
  material_name: 'Entrust SC',
  restriction_source: 'operator_transcribed',
  restriction_text: 'Max 6 applications per crop.',
  citation: '',
  source_type: 'product_label',
  source_identifier: 'Label 2025',
  source_locator: 'p. 3',
  source_reference: '',
  attachment: null,
  how_met: 'Logged per block.',
  stated_by_name: 'Ana',
  stated_at: '2026-10-03T00:00:00Z',
  plan_version: 1,
  plan_id: 3,
  supersedes: null,
  superseded_at: null,
  state: 'current',
  printed: ['Restriction from Product label ...', 'How it is met, as stated by Ana ...'],
  ...over
});

const renderPanel = (materials: any[], status = 'active') => {
  response = { materials };
  return render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <OSPMaterialRestrictionsPanel companyId="1" farmId="2" osp={{ id: 3, status }} />
      </IntlProvider>
    </ChakraProvider>
  );
};

const openRow = (name = 'Entrust SC') =>
  fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }));
const recordButton = () => screen.getByRole('button', { name: 'Record this statement' });

describe('material restrictions panel', () => {
  it('gives each material one status', () => {
    expect(restrictionStatus(material() as any)).toBe('not_documented');
    expect(restrictionStatus(material({ statements: [statement()] }) as any)).toBe('recorded');
    expect(
      restrictionStatus(material({ statements: [statement({ state: 'needs_review' })] }) as any)
    ).toBe('needs_review');
    expect(restrictionStatus(material({ earlier_versions: [statement()] }) as any)).toBe(
      'earlier_version'
    );
    expect(
      restrictionStatus(
        material({
          regulation_restriction: { key: 'nl:1', text: 'Foliar only.', citation: '§ 205.602(c)' }
        }) as any
      )
    ).toBe('held');
  });

  it('lists materials collapsed with a summary, and never says there are no restrictions', () => {
    renderPanel([
      material(),
      material({ material_id: 8, material_name: 'Grandevo', statements: [statement()] })
    ]);
    expect(screen.getByTestId('restriction-summary-line').textContent).toBe(
      '2 plan materials · 1 with a restriction recorded'
    );
    expect(screen.queryByText('1 restriction recorded')).not.toBeNull();
    expect(screen.queryByLabelText('Where the restriction comes from')).toBeNull();
    openRow();
    expect(screen.queryByText(/^Restriction not documented in Trazo\./)).not.toBeNull();
    expect(screen.queryByText(/no restrictions/i)).toBeNull();
  });

  it('the form opens on "Add a restriction" and records a transcription with its source', async () => {
    recordStatement.mockClear();
    renderPanel([material()]);
    openRow();
    expect(screen.queryByTestId('restriction-form')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add a restriction' }));
    fireEvent.change(screen.getByLabelText('Where the restriction comes from'), {
      target: { value: 'operator_transcribed' }
    });
    expect(
      screen
        .getByLabelText('Where the restriction comes from')
        .querySelector('option[value="regulation"]')
    ).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('The restriction, word for word'), {
      target: { value: 'Max 6 applications per crop.' }
    });
    fireEvent.change(screen.getByPlaceholderText('How you meet this restriction'), {
      target: { value: 'Logged per block.' }
    });
    expect((recordButton() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Kind of source'), {
      target: { value: 'product_label' }
    });
    fireEvent.click(recordButton());
    await waitFor(() => expect(recordStatement).toHaveBeenCalledTimes(1));
    expect(recordStatement.mock.calls[0][0].body).toMatchObject({
      material_kind: 'omri',
      material_id: 7,
      restriction_source: 'operator_transcribed',
      restriction_text: 'Max 6 applications per crop.',
      source_type: 'product_label',
      how_met: 'Logged per block.'
    });
    expect(recordStatement.mock.calls[0][0].body).not.toHaveProperty('supersedes');
    await waitFor(() => expect(screen.queryByTestId('restriction-form')).toBeNull());
  });

  it('shows held regulation wording without claiming it applies', () => {
    renderPanel([
      material({
        material_kind: 'national_list',
        regulation_restriction: { key: 'nl:1', text: 'Foliar only.', citation: '§ 205.602(c)' }
      })
    ]);
    openRow();
    expect(
      screen.queryByText(
        '§ 205.602(c) (regulation wording held by Trazo): "Foliar only." Whether it applies to this material and use is not established by Trazo.'
      )
    ).not.toBeNull();
  });

  it('updating keeps the restriction, explains why, and supersedes the current statement', async () => {
    recordStatement.mockClear();
    renderPanel([material({ statements: [statement()], history: [statement()] })]);
    openRow();
    fireEvent.click(screen.getByRole('button', { name: 'Update how you meet it' }));
    expect(
      (screen.getByPlaceholderText('The restriction, word for word') as HTMLTextAreaElement)
        .disabled
    ).toBe(true);
    expect(
      screen.queryByText(
        'The restriction stays as recorded. If it was copied wrongly, withdraw the statement and add it again.'
      )
    ).not.toBeNull();
    expect(
      (screen.getByPlaceholderText('How you meet this restriction') as HTMLTextAreaElement).value
    ).toBe('');
    fireEvent.change(screen.getByPlaceholderText('How you meet this restriction'), {
      target: { value: 'New method.' }
    });
    fireEvent.click(recordButton());
    await waitFor(() => expect(recordStatement).toHaveBeenCalledTimes(1));
    expect(recordStatement.mock.calls[0][0].body).toMatchObject({
      supersedes: 41,
      how_met: 'New method.'
    });
  });

  it('withdraw needs a reason and sends the statement and the reason', async () => {
    withdrawStatement.mockClear();
    renderPanel([material({ statements: [statement()], history: [statement()] })]);
    openRow();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
    const confirm = screen.getByRole('button', { name: 'Withdraw this statement' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText('Why you are withdrawing it'), {
      target: { value: 'Mistyped the limit' }
    });
    fireEvent.click(confirm);
    await waitFor(() => expect(withdrawStatement).toHaveBeenCalledTimes(1));
    expect(withdrawStatement.mock.calls[0][0].body).toEqual({
      withdraw: 41,
      reason: 'Mistyped the limit'
    });
  });

  it('a withdrawn statement reads as withdrawn in the history, with who and why', () => {
    renderPanel([
      material({
        history: [
          statement({
            superseded_at: '2026-10-03T10:00:00Z',
            withdrawn_at: '2026-10-03T10:00:00Z',
            withdrawn_by_name: 'Ana',
            withdrawal_reason: 'Mistyped the limit',
            state: 'withdrawn'
          })
        ]
      })
    ]);
    openRow();
    fireEvent.click(screen.getByRole('button', { name: 'History (1)' }));
    expect(screen.getByTestId('restriction-history-entry').textContent).toContain(
      '(withdrawn on 2026-10-03 by Ana: Mistyped the limit)'
    );
  });

  it('another version is listed apart and restating copies the restriction, not the answer', async () => {
    recordStatement.mockClear();
    renderPanel([
      material({
        earlier_versions: [statement({ plan_version: 1, plan_id: 9, state: 'needs_review' })]
      })
    ]);
    openRow();
    expect(screen.queryByTestId('restriction-earlier')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Start from this restriction' }));
    expect(
      (screen.getByPlaceholderText('The restriction, word for word') as HTMLTextAreaElement).value
    ).toBe('Max 6 applications per crop.');
    expect(
      (screen.getByPlaceholderText('How you meet this restriction') as HTMLTextAreaElement).value
    ).toBe('');
    fireEvent.change(screen.getByPlaceholderText('How you meet this restriction'), {
      target: { value: 'Restated.' }
    });
    fireEvent.click(recordButton());
    await waitFor(() => expect(recordStatement).toHaveBeenCalledTimes(1));
    expect(recordStatement.mock.calls[0][0].body).not.toHaveProperty('supersedes');
  });

  it('collects nothing on a plan that is not editable', () => {
    renderPanel([material({ statements: [statement()] })], 'submitted');
    openRow();
    expect(screen.queryByRole('button', { name: /Add (a|another) restriction/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Withdraw' })).toBeNull();
  });
});

describe('badge contrast (review of app #69)', () => {
  it('needs-attention badges use the warning variant, never an amber tint', async () => {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    for (const file of ['OSPMaterialRestrictionsPanel.tsx', 'OSPMaterialIdentityPanel.tsx']) {
      const src = readFileSync(join(__dirname, '..', file), 'utf8');
      expect(src, file).not.toMatch(/colorScheme="amber"|colorScheme: 'amber'|:\s*'amber'/);
      expect(src, file).toMatch(/variant[=:]\s*["']warning["']/);
    }
  });
});

describe('review of app #74', () => {
  it('cancelling a withdrawal drops the reason typed for it', () => {
    renderPanel([material({ statements: [statement()], history: [statement()] })]);
    openRow();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
    fireEvent.change(screen.getByPlaceholderText('Why you are withdrawing it'), {
      target: { value: 'Abandoned' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
    expect(
      (screen.getByPlaceholderText('Why you are withdrawing it') as HTMLInputElement).value
    ).toBe('');
  });
});
