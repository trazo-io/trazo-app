/**
 * The line under the folder filters counts documents, and stored files only when they differ.
 *
 * It read "18 files stored" under "All 12", which looked like a mismatch (the chips count
 * documents, the line counted every stored version). The first fix said "12 files with earlier
 * versions" even on a farm where nothing had been regenerated (review of #307): a number on
 * screen is a claim, so the file count appears only when there are earlier versions.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const { shelf } = vi.hoisted(() => ({ shelf: { docs: [] as unknown[] } }));

const doc = (id: number, title: string, extra: object = {}) => ({
  id,
  public_id: `p${id}`,
  folder: 'exports',
  folder_display: 'Exports',
  source: 'generated',
  source_display: 'Audit dossier',
  source_kind: 'audit_dossier',
  title,
  content_type: 'application/pdf',
  size_bytes: 1024,
  linked_section: '',
  parcel: null,
  history: null,
  tags: [],
  is_deletable: false,
  created_by_name: '',
  created_at: '2026-10-24T19:00:00Z',
  ...extra
});

vi.mock('store/api/documentsApi', () => ({
  useGetFarmDocumentsQuery: () => ({
    data: shelf.docs,
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

describe('Documents summary line', () => {
  it('no earlier versions: documents only, no file count', () => {
    shelf.docs = [doc(1, 'Audit dossier A'), doc(2, 'Audit dossier B')];
    renderPage();
    expect(screen.getByText(/^2 documents · 2 KB on this farm/)).toBeInTheDocument();
    expect(screen.queryByText(/earlier versions/)).toBeNull();
  });
});
