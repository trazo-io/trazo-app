/**
 * § 205.406(a)(1) asks for the summary of changes "supported by documentation". The card names
 * files from the farm's Documents, sends the whole list on every save, and shows each revision's
 * list on its row (on a signed revision that list is the signed one).
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const updateUpdate = vi.fn((_args: { data: Record<string, unknown> }) => ({
  unwrap: () => Promise.resolve({})
}));
const uploadDoc = vi.fn((_args: Record<string, unknown>) => ({
  unwrap: () =>
    Promise.resolve({ id: 33, public_id: 'pid-new', title: 'Soil lab report', source: 'upload' })
}));

const draft = {
  id: 7,
  reporting_year: 2027,
  revision_number: 1,
  changes_summary: 'Hedgerow extended.',
  additions: [],
  deletions: [],
  prior_osp: 61,
  prior_osp_version: 3,
  submitted_at: null,
  signed_at: null,
  is_locked: false,
  supporting_documents: [
    {
      id: 11,
      public_id: 'pid-map',
      title: 'North line map',
      source: 'upload',
      source_display: 'Upload',
      content_type: 'application/pdf',
      created_at: '2026-10-01T00:00:00Z'
    }
  ]
};

vi.mock('store/api/ospAnnualUpdateApi', () => ({
  useGetOSPAnnualUpdatesQuery: () => ({ data: [draft] }),
  useCreateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOSPAnnualUpdateMutation: () => [updateUpdate, { isLoading: false }],
  useSignOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useFileOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useCorrectOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useWithdrawOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  FILING_METHODS: ['agent_web_form', 'agent_portal', 'email', 'mail', 'in_person']
}));

vi.mock('store/api/documentsApi', () => ({
  useGetFarmDocumentsQuery: () => ({
    data: [
      { id: 11, public_id: 'pid-map', title: 'North line map', source: 'upload' },
      { id: 12, public_id: 'pid-invoice', title: 'Hedgerow invoice', source: 'upload' },
      {
        id: 13,
        public_id: 'pid-filed',
        title: 'Annual update 2026, revision 1',
        source: 'annual_update'
      }
    ]
  }),
  useUploadFarmDocumentMutation: () => [uploadDoc, { isLoading: false }]
}));

import OSPAnnualUpdateCard from '../OSPAnnualUpdateCard';

const renderCard = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <OSPAnnualUpdateCard
          companyId="1"
          farmId="2"
          planOnFile={{ id: 65, version_number: 4, status: 'active' } as any}
          currentYear={2027}
        />
      </IntlProvider>
    </ChakraProvider>
  );

const rowFor = (text: RegExp) => screen.getByText(text).closest('div[class]')!.parentElement!;

const editDraft = () =>
  fireEvent.click(within(rowFor(/Hedgerow extended\./)).getByRole('button', { name: 'Edit' }));

const save = async () => {
  fireEvent.click(screen.getByRole('button', { name: /Update Filing/i }));
  await Promise.resolve();
};

describe('supporting documents on the annual update', () => {
  it("shows the revision's list on its row", () => {
    renderCard();
    expect(screen.getByTestId('annual-row-supporting')).toHaveTextContent(
      'Supporting documents: North line map'
    );
  });

  it('adds a file from Documents and sends the whole list', async () => {
    updateUpdate.mockClear();
    renderCard();
    editDraft();
    fireEvent.click(screen.getByTestId('annual-supporting-open'));
    const pick = screen.getByTestId('annual-supporting-pick') as HTMLSelectElement;
    const offered = Array.from(pick.options).map((o) => o.value);
    // Already attached, and the filing's own Documents copy, are not offered.
    expect(offered).toContain('pid-invoice');
    expect(offered).not.toContain('pid-map');
    expect(offered).not.toContain('pid-filed');
    fireEvent.change(pick, { target: { value: 'pid-invoice' } });
    await save();
    expect(updateUpdate).toHaveBeenCalledTimes(1);
    expect(updateUpdate.mock.calls[0]?.[0].data.supporting_document_ids).toEqual([
      'pid-map',
      'pid-invoice'
    ]);
  });

  it('removing every file sends an empty list', async () => {
    updateUpdate.mockClear();
    renderCard();
    editDraft();
    fireEvent.click(screen.getByRole('button', { name: 'Remove North line map' }));
    expect(
      within(screen.getByTestId('annual-supporting-documents')).getByText('No documents attached.')
    ).toBeInTheDocument();
    await save();
    expect(updateUpdate.mock.calls[0]?.[0].data.supporting_document_ids).toEqual([]);
  });

  it('uploads a new file to the plan folder and attaches it', async () => {
    uploadDoc.mockClear();
    renderCard();
    editDraft();
    fireEvent.click(screen.getByTestId('annual-supporting-open'));
    const file = new File(['%PDF'], 'lab.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('annual-supporting-upload-input'), {
      target: { files: [file] }
    });
    await waitFor(() => expect(screen.getByText('Soil lab report')).toBeInTheDocument());
    expect(uploadDoc.mock.calls[0]?.[0]).toMatchObject({
      companyId: '1',
      farmId: '2',
      folder: 'organic_system_plan',
      file
    });
  });
});
