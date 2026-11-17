/**
 * WSDA's annotation is a restriction Trazo holds for a WSDA-listed material (2026-11-17).
 *
 * The backend sends it as `wsda_list_restriction` with the product number and the list's edition.
 * The panel shows it as WSDA's words, offers it as the source of a statement (no transcription
 * needed), and counts the material as "wording on file, not answered" until the operator states how
 * it is met. An OMRI material says where its restriction is found, since Trazo holds none.
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
  useRecordRestrictionStatementMutation: () => [recordStatement, { isLoading: false }],
  useWithdrawRestrictionStatementMutation: () => [vi.fn(), { isLoading: false }]
}));

import OSPMaterialRestrictionsPanel, { restrictionStatus } from '../OSPMaterialRestrictionsPanel';

const WSDA_HELD = {
  key: 'wsda:4',
  text: 'Deficiency must be documented.',
  citation: 'WSDA Product #2948',
  edition: '2026-03-06',
  source_url: 'https://cms.agr.wa.gov/x.pdf'
};

const material = (over: Record<string, unknown> = {}) => ({
  material_kind: 'wsda',
  material_id: 4,
  material_name: 'Zinc Sulfate 35.5%',
  regulation_restriction: null,
  wsda_list_restriction: WSDA_HELD,
  statements: [],
  history: [],
  earlier_versions: [],
  printed: '',
  ...over
});

const renderPanel = (materials: any[]) => {
  response = { materials };
  return render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <OSPMaterialRestrictionsPanel companyId="1" farmId="2" osp={{ id: 3, status: 'draft' }} />
      </IntlProvider>
    </ChakraProvider>
  );
};

const openRow = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }));

describe('WSDA annotation in the restrictions panel', () => {
  it('counts as wording on file, not answered', () => {
    expect(restrictionStatus(material() as any)).toBe('held');
    expect(restrictionStatus(material({ wsda_list_restriction: null }) as any)).toBe(
      'not_documented'
    );
    renderPanel([material()]);
    expect(screen.getByText('Wording on file, not answered')).toBeTruthy();
  });

  it("shows WSDA's words with the product number and the list's edition", () => {
    renderPanel([material()]);
    openRow('Zinc Sulfate');
    expect(screen.getByTestId('restriction-wsda-held').textContent).toBe(
      'WSDA annotation, WSDA Product #2948 (Organic Input Material List of 2026-03-06, WSDA\'s words): "Deficiency must be documented." WSDA\'s list says registered products must be used in accordance with all noted annotations.'
    );
  });

  it('records a statement against it with no transcription', async () => {
    recordStatement.mockClear();
    renderPanel([material()]);
    openRow('Zinc Sulfate');
    fireEvent.click(screen.getByRole('button', { name: 'Add a restriction' }));
    fireEvent.change(screen.getByLabelText('Where the restriction comes from'), {
      target: { value: 'wsda_list_annotation' }
    });
    expect(screen.queryByPlaceholderText('The restriction, word for word')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('How you meet this restriction'), {
      target: { value: 'July tissue test, report kept with the record.' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record this statement' }));
    await waitFor(() => expect(recordStatement).toHaveBeenCalledTimes(1));
    const body = recordStatement.mock.calls[0][0].body;
    expect(body).toMatchObject({
      material_kind: 'wsda',
      material_id: 4,
      restriction_source: 'wsda_list_annotation',
      how_met: 'July tissue test, report kept with the record.'
    });
    expect(body).not.toHaveProperty('restriction_text');
  });

  it('offers no WSDA source for a material without a held annotation', () => {
    renderPanel([material({ wsda_list_restriction: null })]);
    openRow('Zinc Sulfate');
    fireEvent.click(screen.getByRole('button', { name: 'Add a restriction' }));
    expect(
      screen
        .getByLabelText('Where the restriction comes from')
        .querySelector('option[value="wsda_list_annotation"]')
    ).toBeNull();
  });

  it('tells an OMRI material where its restriction is found', () => {
    renderPanel([
      material({
        material_kind: 'omri',
        material_id: 7,
        material_name: 'Entrust SC',
        wsda_list_restriction: null
      })
    ]);
    openRow('Entrust SC');
    expect(screen.getByText(/Trazo does not hold OMRI's restrictions/)).toBeTruthy();
    expect(screen.queryByText(/no restrictions/i)).toBeNull();
  });
});
