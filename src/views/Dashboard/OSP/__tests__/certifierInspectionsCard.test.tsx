/**
 * The farm's own record of its certifier's inspections and the items the agent sent (2026-11-08).
 *
 * The card shows the server's derived status in words about the RECORD, never a verdict; a failed
 * load is never "nothing recorded"; a viewer hears why they cannot see it; files are uploaded to
 * Documents first and linked by id, and a retry never uploads a file twice; a saved form sends only
 * the fields it renders.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';
import CertifierInspectionsCard, {
  inspectionDraft,
  noticeDraft
} from '../CertifierInspectionsCard';

let inspections: Record<string, unknown> = {};
let notices: Record<string, unknown> = {};
const addInspection = vi.fn();
const updateInspection = vi.fn();
const addNotice = vi.fn();
const updateNotice = vi.fn();
const upload = vi.fn();
const resolving = (fn: ReturnType<typeof vi.fn>, value: unknown) =>
  fn.mockImplementation(() => ({ unwrap: () => Promise.resolve(value) }));
const rejecting = (fn: ReturnType<typeof vi.fn>, error: unknown) =>
  fn.mockImplementation(() => ({ unwrap: () => Promise.reject(error) }));

vi.mock('store/api/certifierInspectionApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('store/api/certifierInspectionApi')>()),
  useGetCertifierInspectionsQuery: () => inspections,
  useGetCertifierNoticesQuery: () => notices,
  useAddCertifierInspectionMutation: () => [addInspection, { isLoading: false }],
  useUpdateCertifierInspectionMutation: () => [updateInspection, { isLoading: false }],
  useAddCertifierNoticeMutation: () => [addNotice, { isLoading: false }],
  useUpdateCertifierNoticeMutation: () => [updateNotice, { isLoading: false }]
}));
vi.mock('store/api/documentsApi', () => ({
  useUploadFarmDocumentMutation: () => [upload, { isLoading: false }]
}));
// The agent picker fetches the agent list; a plain input stands in for it here.
vi.mock('components/Certifications/CertifyingAgentPicker', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="agent" value={value} onChange={(e) => onChange(e.target.value)} />
  )
}));

const inspectionRow = (over: Record<string, unknown> = {}) => ({
  id: 4,
  public_id: 'i-4',
  inspected_on: '2026-07-14',
  certifying_agent: 'CCOF Certification Services, LLC',
  inspector_name: 'Dana Ruiz',
  inspection_kind: 'annual',
  inspection_kind_display: 'Annual inspection',
  report_document: 31,
  report_document_title: 'Inspection report 2026',
  notes: 'kept by the admin only',
  notice_count: 1,
  created_at: '',
  updated_at: '',
  ...over
});

const noticeRow = (over: Record<string, unknown> = {}) => ({
  id: 9,
  public_id: 'n-9',
  inspection: 4,
  kind: 'notice_of_noncompliance',
  kind_display: 'Notice of noncompliance',
  agent_label: '',
  received_on: '2026-08-01',
  description: 'Buffer records missing for block 4',
  notice_document: 32,
  notice_document_title: 'Notice letter',
  respond_by: '2026-09-01',
  response_kind: 'corrected',
  response_kind_display: 'Corrected',
  response_text: 'Buffer log filed',
  response_sent_on: '2026-08-20',
  response_documents: [{ id: 33, title: 'Buffer log' }],
  resolution_received_on: null,
  resolution_document: null,
  resolution_document_title: null,
  status: 'response_sent',
  created_at: '',
  updated_at: '',
  ...over
});

const loaded = (data: unknown[]) => ({ data, isLoading: false, isError: false });

const renderCard = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <CertifierInspectionsCard companyId="3" farmId="1" state="WA" />
      </IntlProvider>
    </ChakraProvider>
  );

const en = enUS as Record<string, string>;

describe('CertifierInspectionsCard', () => {
  beforeEach(() => {
    inspections = loaded([]);
    notices = loaded([]);
    [addInspection, updateInspection, addNotice, updateNotice, upload].forEach((f) =>
      f.mockReset()
    );
  });

  it('says nothing is recorded only when both lists loaded empty', () => {
    renderCard();
    expect(screen.getByText(en['osp.inspections.emptyInspections'])).toBeTruthy();
    expect(screen.getByText(en['osp.inspections.emptyNotices'])).toBeTruthy();
  });

  it('a failed load is not an empty record', () => {
    notices = { data: undefined, isLoading: false, isError: true, error: { status: 500 } };
    renderCard();
    expect(screen.getByText(en['osp.inspections.loadFailed'])).toBeTruthy();
    expect(screen.queryByText(en['osp.inspections.emptyNotices'])).toBeNull();
  });

  it('a viewer hears who can see the record', () => {
    inspections = { data: undefined, isLoading: false, isError: true, error: { status: 403 } };
    renderCard();
    expect(screen.getByText(en['osp.inspections.forbidden'])).toBeTruthy();
  });

  it('shows each status in the words for the record, never a verdict', () => {
    inspections = loaded([inspectionRow()]);
    notices = loaded([
      noticeRow(),
      noticeRow({ id: 10, status: 'resolution_stated_no_copy' }),
      noticeRow({ id: 11, status: 'resolved' })
    ]);
    renderCard();
    const words = screen.getAllByTestId('notice-status').map((n) => n.textContent);
    expect(words).toEqual([
      en['osp.inspections.status.responseSent'],
      en['osp.inspections.status.resolutionStatedNoCopy'],
      en['osp.inspections.status.resolved']
    ]);
    for (const w of words) expect(w).not.toMatch(/compliant|fixed|closed/i);
  });

  it("an other item is named by the agent's own word", () => {
    notices = loaded([noticeRow({ kind: 'other_item', agent_label: 'Issue of concern' })]);
    renderCard();
    const row = screen.getByTestId('notice-row');
    expect(within(row).getByText(/Issue of concern/)).toBeTruthy();
    expect(within(row).queryByText(/Notice of noncompliance/)).toBeNull();
  });

  it('the drafts carry only the fields the forms render', () => {
    expect(Object.keys(inspectionDraft(inspectionRow() as never)).sort()).toEqual([
      'certifying_agent',
      'inspected_on',
      'inspection_kind',
      'inspector_name',
      'report_document'
    ]);
    const draft = noticeDraft(noticeRow() as never);
    expect(draft.response_document_ids).toEqual([33]);
    expect(Object.keys(draft)).not.toContain('status');
  });

  it('uploads the report to Documents, links it by id, and never uploads it twice', async () => {
    resolving(upload, { id: 77 });
    rejecting(addInspection, { status: 500, data: { detail: 'boom' } });
    renderCard();
    fireEvent.click(screen.getByText(en['osp.inspections.addInspection']));
    const form = screen.getByTestId('inspection-form');
    const date = form.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(date, { target: { value: '2026-07-14' } });
    const file = new File(['%PDF'], 'report.pdf', { type: 'application/pdf' });
    fireEvent.change(form.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] }
    });
    fireEvent.click(within(form).getByText(en['osp.inspections.save']));
    await waitFor(() => expect(addInspection).toHaveBeenCalledTimes(1));
    expect(upload.mock.calls[0][0]).toMatchObject({ folder: 'certifications', file });
    expect(addInspection.mock.calls[0][0].data).toEqual({
      inspected_on: '2026-07-14',
      certifying_agent: '',
      inspector_name: '',
      inspection_kind: '',
      report_document: 77
    });

    // The save failed; the retry links the same file instead of uploading a second copy.
    resolving(addInspection, inspectionRow({ id: 5 }));
    fireEvent.click(
      within(screen.getByTestId('inspection-form')).getByText(en['osp.inspections.save'])
    );
    await waitFor(() => expect(addInspection).toHaveBeenCalledTimes(2));
    expect(upload).toHaveBeenCalledTimes(1);
    expect(addInspection.mock.calls[1][0].data.report_document).toBe(77);
  });

  it('a linked file can be removed from the record without deleting it', async () => {
    inspections = loaded([inspectionRow()]);
    notices = loaded([noticeRow()]);
    resolving(updateNotice, noticeRow());
    renderCard();
    fireEvent.click(within(screen.getByTestId('notice-row')).getByText(en['osp.inspections.edit']));
    const form = screen.getByTestId('notice-form');
    const lines = within(form).getAllByTestId('attached-file');
    const buffer = lines.find((l) => l.textContent?.includes('Buffer log')) as HTMLElement;
    fireEvent.click(within(buffer).getByText(en['osp.inspections.unlink']));
    fireEvent.click(within(form).getByText(en['osp.inspections.save']));
    await waitFor(() => expect(updateNotice).toHaveBeenCalledTimes(1));
    const sent = updateNotice.mock.calls[0][0];
    expect(sent.noticeId).toBe(9);
    expect(sent.data.response_document_ids).toEqual([]);
    expect(sent.data.notice_document).toBe(32);
    expect(Object.keys(sent.data)).not.toContain('status');
  });
});
