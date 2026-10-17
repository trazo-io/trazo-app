/**
 * The Documents page: a file can be filed against one activity record, and an upload is labelled
 * by who uploaded it (pilot rehearsal 2026-10, findings 4 and 5).
 *
 * Finding 4: the May 15 Entrust SC spray had a supplier invoice, and the filing dialog could
 * point it at the season and no finer. Finding 5: the operator's upload read "Farmer upload".
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const upload = vi.fn((_args: Record<string, unknown>) => ({ unwrap: () => Promise.resolve({}) }));
let docs: Record<string, unknown>[] = [];
const historyQuery = vi.fn();

vi.mock('store/api/documentsApi', () => ({
  useGetFarmDocumentsQuery: () => ({
    data: docs,
    isLoading: false,
    isUninitialized: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn()
  }),
  useUploadFarmDocumentMutation: () => [upload, { isLoading: false }],
  useDeleteFarmDocumentMutation: () => [vi.fn(), { isLoading: false }]
}));
vi.mock('store/api/historyApi', () => ({
  useGetFarmProductionsQuery: () => ({ data: [{ id: 5, name: 'Bartlett pears 2026' }] }),
  useGetHistoryQuery: (...args: unknown[]) => historyQuery(...args)
}));
vi.mock('hooks/useTour', () => ({ useTour: () => undefined }));
vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) => fn({ company: { currentCompany: { id: 17 } } })
}));

import DocumentsPage from '../index';

const renderPage = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>} onError={() => {}}>
        <MemoryRouter initialEntries={['/admin/dashboard/farm/33/documents']}>
          <Routes>
            <Route path="/admin/dashboard/farm/:farmId/documents" element={<DocumentsPage />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

describe('filing a document against one record', () => {
  it('offers the chosen production records and sends the record with the upload', async () => {
    docs = [];
    upload.mockClear();
    historyQuery.mockImplementation((id: string, opts: { skip?: boolean }) => ({
      data:
        opts?.skip || !id
          ? undefined
          : {
              events: [
                {
                  id: 801,
                  event_type: 2,
                  type: 'PE',
                  name: 'Entrust SC, codling moth',
                  date: '2026-05-15T08:00:00Z'
                }
              ]
            }
    }));
    const { container } = renderPage();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['%PDF'], 'invoice.pdf', { type: 'application/pdf' })] }
    });

    const production = await screen.findByLabelText(enUS['documents.filing.field.production']);
    expect(screen.queryByLabelText(enUS['documents.filing.field.record'])).toBeNull();
    fireEvent.change(production, { target: { value: '5' } });

    await waitFor(() =>
      expect(
        screen.queryByLabelText(enUS['documents.filing.field.record']),
        'no record picker once a production is chosen'
      ).not.toBeNull()
    );
    const record = screen.getByLabelText(enUS['documents.filing.field.record']);
    const option = screen.getByRole('option', { name: /Entrust SC, codling moth/ });
    expect(option.textContent).toContain('May 15, 2026');
    fireEvent.change(record, { target: { value: '2:801' } });

    fireEvent.click(screen.getByRole('button', { name: enUS['documents.filing.confirm'] }));
    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(upload.mock.calls[0]?.[0]).toMatchObject({
      companyId: '17',
      farmId: '33',
      history: 5,
      eventType: 2,
      eventId: 801
    });
  });

  it('sends no record when none is chosen', async () => {
    docs = [];
    upload.mockClear();
    historyQuery.mockReturnValue({ data: undefined });
    const { container } = renderPage();
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(['%PDF'], 'receipt.pdf', { type: 'application/pdf' })] }
    });
    fireEvent.click(await screen.findByRole('button', { name: enUS['documents.filing.confirm'] }));
    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(upload.mock.calls[0]?.[0]).not.toHaveProperty('eventId');
  });
});

describe('who an upload came from', () => {
  it('names the uploader and never claims farmer authorship', () => {
    historyQuery.mockReturnValue({ data: undefined });
    docs = [
      {
        id: 9,
        public_id: 'x',
        folder: 'uploads',
        folder_display: 'Uploads',
        source: 'upload',
        source_display: 'Farmer upload',
        title: 'Spray log scan',
        content_type: 'application/pdf',
        size_bytes: 2048,
        linked_section: '',
        parcel: null,
        history: null,
        tags: [],
        is_deletable: true,
        created_by_name: 'Pilot Operator',
        created_at: '2026-10-15T10:00:00Z'
      }
    ];
    renderPage();
    expect(screen.queryAllByText('Uploaded by Pilot Operator').length).toBeGreaterThan(0);
    expect(screen.queryByText('Farmer upload')).toBeNull();
  });
});
