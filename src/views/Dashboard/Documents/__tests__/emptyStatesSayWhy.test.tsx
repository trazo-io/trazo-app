/**
 * The Documents page has three empties and must never confuse them. "Nothing on the shelf yet"
 * claims the farm holds no documents; printed under a search with no hits (search is
 * server-side, so the list arrives empty) or under a folder chip that counts 0, it told the
 * operator their records were gone. Found in a local walk-through of the QO-parity release,
 * 2026-11-02: searching "%" on a farm with 26 files showed the first-run empty state.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const { shelf } = vi.hoisted(() => ({ shelf: { docs: [] as unknown[] } }));

const CERTIFICATE = {
  id: 91,
  public_id: 'p',
  folder: 'certifications',
  folder_display: 'Certifications',
  source: 'upload',
  source_display: 'Upload',
  source_kind: '',
  title: 'Organic certificate COC-1463',
  content_type: 'application/pdf',
  size_bytes: 2048,
  linked_section: '',
  parcel: null,
  history: null,
  tags: [],
  is_deletable: true,
  created_by_name: 'E2E Runner',
  created_at: '2026-10-24T19:00:00Z'
};

vi.mock('store/api/documentsApi', () => ({
  // The server narrows by `search` (here: title contains the term, case-insensitive).
  useGetFarmDocumentsQuery: (args: { search?: string }) => ({
    data: args?.search
      ? shelf.docs.filter((d: any) => d.title.toLowerCase().includes(args.search!.toLowerCase()))
      : shelf.docs,
    isLoading: false,
    isUninitialized: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn()
  }),
  useUploadFarmDocumentMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteFarmDocumentMutation: () => [vi.fn(), { isLoading: false }]
}));
vi.mock('store/api/historyApi', () => ({
  useGetFarmProductionsQuery: () => ({ data: [] }),
  useGetHistoryQuery: () => ({ data: undefined })
}));
vi.mock('hooks/useTour', () => ({ useTour: () => undefined }));
vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) => fn({ company: { currentCompany: { id: 17 } } })
}));

import DocumentsPage from '../index';

const messages = enUS as Record<string, string>;

const renderPage = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={messages} onError={() => {}}>
        <MemoryRouter initialEntries={['/admin/dashboard/farm/33/documents']}>
          <Routes>
            <Route path="/admin/dashboard/farm/:farmId/documents" element={<DocumentsPage />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

describe('Documents empty states', () => {
  beforeEach(() => {
    shelf.docs = [CERTIFICATE];
  });

  it('a search with no hits says so and offers to clear it, never "nothing on the shelf"', async () => {
    renderPage();
    const input = screen.getByRole('textbox', { name: messages['documents.searchLabel'] });
    fireEvent.change(input, { target: { value: '%' } });

    expect(await screen.findByText('No documents match “%”')).toBeInTheDocument();
    expect(screen.queryByText(messages['documents.emptyTitle'])).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: messages['documents.clearSearch'] }));
    expect(input).toHaveValue('');
    // Rendered twice (phone cards and desktop table), so any match proves the shelf is back.
    expect(
      (await screen.findAllByText(CERTIFICATE.title, {}, { timeout: 2000 })).length
    ).toBeGreaterThan(0);
  });

  it('an empty folder on a farm with documents names the folder, not the shelf', async () => {
    renderPage();
    // An empty chip is hidden below `md` on purpose (index.tsx), and jsdom renders at phone
    // width, so it is reachable only with `hidden`. On a desktop it is a plain button.
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(messages['documents.folder.exports']),
        hidden: true
      })
    );

    await waitFor(() =>
      expect(screen.getByText(messages['documents.emptyFolderTitle'])).toBeInTheDocument()
    );
    expect(screen.queryByText(messages['documents.emptyTitle'])).not.toBeInTheDocument();
  });

  it('a search that matches only in other folders says so and shows all folders', async () => {
    // Review of #240: the folder chip filters client-side on top of the server's search result,
    // so with "Exports" selected a term that matches the Certifications file left the list empty
    // and the page claimed "No documents match", which was false.
    renderPage();
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(messages['documents.folder.exports']),
        hidden: true
      })
    );
    fireEvent.change(screen.getByRole('textbox', { name: messages['documents.searchLabel'] }), {
      target: { value: 'certificate' }
    });

    expect(
      await screen.findByText('No documents in this folder match “certificate”')
    ).toBeInTheDocument();
    expect(screen.queryByText('No documents match “certificate”')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: messages['documents.showAllFolders'] }));
    expect((await screen.findAllByText(CERTIFICATE.title)).length).toBeGreaterThan(0);
  });

  it('a farm with no documents at all still gets the first-run empty state', () => {
    shelf.docs = [];
    renderPage();
    expect(screen.getByText(messages['documents.emptyTitle'])).toBeInTheDocument();
  });
});
