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
    entry_id: null,
    category: '',
    agent_review: '',
    agent_review_date: '',
    agent_review_reference: '',
    agent_review_use: '',
    agent_review_statement: '',
    label_document: null as number | null,
    label_document_title: '',
    needs_label: false
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
    entry_id: null,
    category: 'fertilizer_amendment',
    agent_review: 'approved',
    agent_review_date: '2026-03-15',
    agent_review_reference: 'WSDA approval email',
    agent_review_use: '',
    agent_review_statement:
      "on WSDA's approved materials list dated 2026-03-15 (WSDA approval email), as recorded by the operator",
    label_document: null as number | null,
    label_document_title: '',
    needs_label: true
  },
  {
    name: 'Terro ant bait',
    manufacturer: 'Terro',
    reason: 'Ants in the packing shed',
    status: 'in_use',
    in_use: true,
    intended_for_use: false,
    source: 'both',
    listing: '',
    entry_id: 9,
    category: 'facility_pest',
    agent_review: '',
    agent_review_date: '',
    agent_review_reference: '',
    agent_review_use: '',
    agent_review_statement: '',
    label_document: null as number | null,
    label_document_title: '',
    needs_label: false,
    facility_material_type: '',
    where_used: '',
    applied_by_fumigation: null as boolean | null
  }
];

const uploadDocument = vi.fn<[Record<string, unknown>], { unwrap: () => Promise<{ id: number }> }>(
  () => ({ unwrap: () => Promise.resolve({ id: 41 }) })
);

vi.mock('store/api/documentsApi', () => ({
  useUploadFarmDocumentMutation: () => [uploadDocument, { isLoading: false }]
}));

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
    uploadDocument.mockClear();
  });

  it('asks for a label only on a row the agent asks one for', () => {
    renderPanel();
    expect(screen.getAllByTestId('materials-label-asked')).toHaveLength(1);
    expect(
      screen.getByText(
        'Your certifier asks for the label of a product that is not OMRI or WSDA listed, or a photo of its container.'
      )
    ).toBeInTheDocument();
  });

  it('files the label in Documents first, then names it on the material', async () => {
    renderPanel();
    const file = new File(['label'], 'compost.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(
        screen.getByLabelText('Label or container photo for Rexius Organic Compost'),
        {
          target: { files: [file] }
        }
      );
    });
    expect(uploadDocument).toHaveBeenCalledTimes(1);
    expect(uploadDocument.mock.calls[0][0]).toMatchObject({
      companyId: '7',
      farmId: '3',
      file,
      folder: 'uploads',
      title: 'Label of Rexius Organic Compost'
    });
    expect(answerMaterial).toHaveBeenCalledTimes(1);
    expect(answerMaterial.mock.calls[0][0].body).toEqual({
      name: 'Rexius Organic Compost',
      label_document: '41'
    });
  });

  it('names a label on file and removes it from the material, not from Documents', async () => {
    const compost = MATERIALS[1];
    const stored = { ...compost };
    Object.assign(compost, {
      label_document: 41,
      label_document_title: 'Label of Rexius Organic Compost'
    });
    try {
      renderPanel();
      expect(screen.getByTestId('materials-label-on-file')).toHaveTextContent(
        'Label on file in Documents'
      );
      expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute(
        'href',
        expect.stringContaining('/companies/7/establishments/3/documents/41/download/')
      );
      expect(screen.queryByTestId('materials-label-asked')).not.toBeInTheDocument();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Remove label' }));
      });
      expect(answerMaterial.mock.calls[0][0].body).toEqual({
        name: 'Rexius Organic Compost',
        label_document: ''
      });
      expect(uploadDocument).not.toHaveBeenCalled();
    } finally {
      Object.assign(compost, stored);
    }
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

  it('sets the section on the form and a material no longer used', async () => {
    renderPanel();
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Section of Serenade ASO on the form'), {
        target: { value: 'pest_disease_weed' }
      });
    });
    expect(answerMaterial.mock.calls[0][0].body).toEqual({
      name: 'Serenade ASO',
      category: 'pest_disease_weed'
    });
    await act(async () => {
      fireEvent.change(screen.getByLabelText('How Serenade ASO is used'), {
        target: { value: 'discontinued' }
      });
    });
    expect(answerMaterial.mock.calls[1][0].body).toEqual({
      name: 'Serenade ASO',
      status: 'discontinued'
    });
  });

  it("holds an agent's approval until its list, letter or date is given, then sends them together", async () => {
    renderPanel();
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Your certifying agent's review of Serenade ASO"), {
        target: { value: 'approved' }
      });
    });
    expect(answerMaterial).not.toHaveBeenCalled();
    expect(screen.getByTestId('materials-review-needs-evidence')).toBeInTheDocument();
    const reference = screen.getByLabelText("The agent's list or letter for Serenade ASO");
    await act(async () => {
      fireEvent.change(reference, { target: { value: 'CCOF OSP Materials List' } });
      fireEvent.blur(reference);
    });
    expect(answerMaterial).toHaveBeenCalledTimes(1);
    expect(answerMaterial.mock.calls[0][0].body).toEqual({
      name: 'Serenade ASO',
      agent_review_reference: 'CCOF OSP Materials List',
      agent_review: 'approved'
    });
    // The save has resolved but the list has not refetched yet: the decision and its inputs stay
    // on screen rather than snapping back to the stored row while the grower is still typing.
    expect(screen.getByLabelText("Your certifying agent's review of Serenade ASO")).toHaveValue(
      'approved'
    );
    expect(
      screen.getByLabelText("The agent's list or letter for Serenade ASO")
    ).toBeInTheDocument();
  });

  it('lets go of a held approval once the refetched row carries it', async () => {
    const { rerender } = renderPanel();
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Your certifying agent's review of Serenade ASO"), {
        target: { value: 'approved' }
      });
    });
    const serenade = MATERIALS[0];
    const stored = { ...serenade };
    Object.assign(serenade, {
      agent_review: 'approved',
      agent_review_reference: 'CCOF OSP Materials List',
      agent_review_statement:
        "on CCOF's approved materials list (CCOF OSP Materials List), as recorded by the operator"
    });
    try {
      await act(async () => {
        rerender(
          <ChakraProvider>
            <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
              <OSPMaterialsListPanel companyId="7" farmId="3" osp={{ id: '11', status: 'draft' }} />
            </IntlProvider>
          </ChakraProvider>
        );
      });
      expect(screen.queryByTestId('materials-review-needs-evidence')).not.toBeInTheDocument();
      expect(
        screen.getByText(
          "Your packet prints: on CCOF's approved materials list (CCOF OSP Materials List), as recorded by the operator."
        )
      ).toBeInTheDocument();
    } finally {
      Object.assign(serenade, stored);
    }
  });

  it('records a request for review at once, and shows what the packet prints', async () => {
    renderPanel();
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Your certifying agent's review of Serenade ASO"), {
        target: { value: 'requested' }
      });
    });
    expect(answerMaterial.mock.calls[0][0].body).toEqual({
      name: 'Serenade ASO',
      agent_review: 'requested'
    });
    expect(
      screen.getByText(
        "Your packet prints: on WSDA's approved materials list dated 2026-03-15 (WSDA approval email), as recorded by the operator."
      )
    ).toBeInTheDocument();
  });

  it("asks CCOF's three facility pest columns only on a facility pest row, and saves each", async () => {
    renderPanel();
    // One row is filed under facility pest control; only it carries the block.
    expect(screen.getAllByTestId('materials-facility-pest')).toHaveLength(1);
    await act(async () => {
      fireEvent.change(screen.getByLabelText('National List type of Terro ant bait'), {
        target: { value: 'boric_acid' }
      });
    });
    expect(answerMaterial.mock.calls[0][0].body).toEqual({
      name: 'Terro ant bait',
      facility_material_type: 'boric_acid'
    });
    await act(async () => {
      fireEvent.change(
        screen.getByLabelText('Whether Terro ant bait is applied by fumigation or fogging'),
        { target: { value: 'false' } }
      );
    });
    expect(answerMaterial.mock.calls[1][0].body).toEqual({
      name: 'Terro ant bait',
      applied_by_fumigation: 'false'
    });
    const where = screen.getByLabelText('Where Terro ant bait is used');
    fireEvent.change(where, { target: { value: 'Packing shed' } });
    await act(async () => {
      fireEvent.blur(where);
    });
    expect(answerMaterial.mock.calls[2][0].body).toEqual({ name: 'Terro ant bait', where_used: 'Packing shed' });
  });
});
