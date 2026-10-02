/**
 * Restriction statements (OSP alignment T18, Phase 5 slice 2b). The server enforces every rule; these
 * tests hold the panel to saying what Trazo holds and collecting exactly what the operator states.
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
let response: any;

vi.mock('store/api/ospApi', () => ({
  useGetMaterialRestrictionsQuery: () => ({ data: response }),
  useRecordRestrictionStatementMutation: () => [recordStatement, { isLoading: false }]
}));

import OSPMaterialRestrictionsPanel from '../OSPMaterialRestrictionsPanel';

const material = (over: Record<string, unknown> = {}) => ({
  material_kind: 'omri',
  material_id: 7,
  material_name: 'Entrust SC',
  regulation_restriction: null,
  statements: [],
  history: [],
  printed: 'Restriction not documented in Trazo.',
  ...over
});

const statement = (over: Record<string, unknown> = {}) => ({
  id: 41,
  material_kind: 'omri',
  material_id: 7,
  material_name: 'Entrust SC',
  restriction_source: 'operator_transcribed',
  restriction_text: 'Max 3 applications per crop.',
  citation: '',
  source_type: 'product_label',
  source_identifier: 'Label 2025',
  source_locator: 'p. 2',
  source_reference: '',
  attachment: null,
  how_met: 'Logged per block.',
  stated_by_name: 'Ana',
  stated_at: '2026-10-02T00:00:00Z',
  plan_version: 1,
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

const recordButton = () => screen.getByRole('button', { name: 'Record this statement' });

describe('material restrictions panel', () => {
  it('says a missing restriction is not documented, never that there is none', () => {
    renderPanel([material()]);
    expect(screen.queryByText('Restriction not documented in Trazo.')).toBeInTheDocument();
    expect(screen.queryByText(/no restrictions/i)).toBeNull();
  });

  it('offers regulation wording only where Trazo holds it, with its applicability caveat', () => {
    renderPanel([material()]);
    const select = screen.getByLabelText('Where the restriction comes from');
    expect(select.querySelector('option[value="regulation"]')).toBeNull();
  });

  it('shows held regulation wording without claiming it applies', () => {
    renderPanel([
      material({
        material_kind: 'national_list',
        regulation_restriction: { key: 'nl:1', text: 'Foliar only.', citation: '§ 205.602(c)' }
      })
    ]);
    expect(
      screen.queryByText(
        '§ 205.602(c) (regulation wording held by Trazo): "Foliar only." Whether it applies to this material and use is not established by Trazo.'
      )
    ).toBeInTheDocument();
    const select = screen.getByLabelText('Where the restriction comes from');
    expect(select.querySelector('option[value="regulation"]')).not.toBeNull();
  });

  it('records a transcription with its source and the operator statement', async () => {
    recordStatement.mockClear();
    renderPanel([material()]);
    expect(recordButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Where the restriction comes from'), {
      target: { value: 'operator_transcribed' }
    });
    fireEvent.change(screen.getByPlaceholderText('The restriction, word for word'), {
      target: { value: 'Max 3 applications per crop.' }
    });
    expect(
      screen.queryByText('Printed as transcribed by you and not independently verified by Trazo.')
    ).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('How you meet this restriction'), {
      target: { value: 'Logged per block.' }
    });
    expect(recordButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Kind of source'), {
      target: { value: 'product_label' }
    });
    fireEvent.change(screen.getByPlaceholderText('Page or section (optional)'), {
      target: { value: 'p. 2' }
    });
    fireEvent.click(recordButton());
    await waitFor(() => expect(recordStatement).toHaveBeenCalledTimes(1));
    const body = recordStatement.mock.calls[0][0].body;
    expect(body).toMatchObject({
      material_kind: 'omri',
      material_id: 7,
      restriction_source: 'operator_transcribed',
      restriction_text: 'Max 3 applications per crop.',
      source_type: 'product_label',
      source_locator: 'p. 2',
      how_met: 'Logged per block.'
    });
    expect(body).not.toHaveProperty('supersedes');
    await waitFor(() =>
      expect(screen.getByLabelText('Where the restriction comes from')).toHaveValue('')
    );
    expect(screen.queryByPlaceholderText('The restriction, word for word')).toBeNull();
  });

  it('a replacement names the statement it supersedes and asks for a fresh statement', async () => {
    recordStatement.mockClear();
    renderPanel([material({ statements: [statement()], history: [statement()] })]);
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    expect(screen.getByPlaceholderText('How you meet this restriction')).toHaveValue('');
    fireEvent.change(screen.getByPlaceholderText('How you meet this restriction'), {
      target: { value: 'New method.' }
    });
    fireEvent.click(recordButton());
    await waitFor(() => expect(recordStatement).toHaveBeenCalledTimes(1));
    expect(recordStatement.mock.calls[0][0].body).toMatchObject({
      supersedes: 41,
      restriction_text: 'Max 3 applications per crop.',
      how_met: 'New method.'
    });
  });

  it('flags a statement whose material, restriction or plan changed', () => {
    renderPanel([
      material({ statements: [statement({ state: 'needs_review' })], history: [statement()] })
    ]);
    expect(screen.queryByText('Changed since stated: review')).toBeInTheDocument();
  });

  it('collects nothing on a plan that is not editable', () => {
    renderPanel([material()], 'submitted');
    expect(screen.queryByLabelText('Where the restriction comes from')).toBeNull();
  });
});

describe('badge contrast (review of app #69)', () => {
  it('needs-attention badges use the warning variant, never an amber tint', async () => {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    for (const file of ['OSPMaterialRestrictionsPanel.tsx', 'OSPMaterialIdentityPanel.tsx']) {
      const src = readFileSync(join(__dirname, '..', file), 'utf8');
      expect(src, file).not.toMatch(/colorScheme="amber"|:\s*'amber'/);
      expect(src, file).toMatch(/variant[=:]\s*["']warning["']/);
    }
  });
});
