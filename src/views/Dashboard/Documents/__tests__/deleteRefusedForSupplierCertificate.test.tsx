/**
 * Deleting a file a supplier's certificate copy still uses is refused by the server, before the
 * stored file is touched (back documents/views.py). The refusal carries a stable code so the page
 * says why in the reader's language; the server's own sentence is English.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const SERVER_SENTENCE =
  "This file is a supplier's organic certificate copy. Remove it from the supplier first.";

const { remove } = vi.hoisted(() => ({
  remove: vi.fn(() => ({
    unwrap: () =>
      Promise.reject({
        status: 400,
        data: {
          detail:
            "This file is a supplier's organic certificate copy. Remove it from the supplier first.",
          code: 'supplier_certificate_in_use'
        }
      })
  }))
}));

vi.mock('store/api/documentsApi', () => ({
  useGetFarmDocumentsQuery: () => ({
    data: [
      {
        id: 91,
        public_id: 'p',
        folder: 'certifications',
        folder_display: 'Certifications',
        source: 'upload',
        source_display: 'Upload',
        title: 'Columbia Nursery organic certificate, issued 2025-02-10',
        content_type: 'application/pdf',
        size_bytes: 2048,
        linked_section: '',
        parcel: null,
        history: null,
        tags: [],
        is_deletable: true,
        created_by_name: 'E2E Runner',
        created_at: '2026-10-24T19:00:00Z'
      }
    ],
    isLoading: false,
    isUninitialized: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn()
  }),
  useUploadFarmDocumentMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteFarmDocumentMutation: () => [remove, { isLoading: false }]
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

describe("deleting a supplier certificate's file", () => {
  it('says why in the reader’s language, not the server’s English', async () => {
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
    fireEvent.click(screen.getAllByRole('button', { name: messages['documents.delete'] })[0]);
    expect(
      await screen.findByText(messages['documents.deleteBlocked.supplierCertificate'])
    ).toBeTruthy();
    expect(screen.queryByText(SERVER_SENTENCE)).toBeNull();
  });
});
