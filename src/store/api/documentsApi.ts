/**
 * Documents / DMS RTK Query endpoints — WS-3.
 *
 * List/filter, multipart upload, label edits (title + tags only), and delete
 * (server refuses anything the system generated — only farmer uploads delete).
 * Downloads go through DOCUMENT_DOWNLOAD_URL with cookies, not raw storage URLs.
 */

import { DOCUMENTS_URL } from 'config';
import baseApi from './baseApi';

export interface FarmDocument {
  id: number;
  public_id: string;
  folder: string;
  folder_display: string;
  source: string;
  source_display: string;
  title: string;
  content_type: string;
  size_bytes: number;
  linked_section: string;
  parcel: number | null;
  history: number | null;
  tags: string[];
  is_deletable: boolean;
  created_by_name: string | null;
  created_at: string;
}

interface DocScope {
  companyId: string;
  farmId: string;
}

interface DocFilters extends DocScope {
  folder?: string;
  search?: string;
  /** OSP module key — how a module's own attachments are found (documents/views.py filters it). */
  linkedSection?: string;
}

const documentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getFarmDocuments: build.query<FarmDocument[], DocFilters>({
      query: ({ companyId, farmId, folder, search, linkedSection }) => {
        const params = new URLSearchParams();
        if (folder) params.set('folder', folder);
        if (search) params.set('search', search);
        if (linkedSection) params.set('linked_section', linkedSection);
        const qs = params.toString();
        return {
          url: DOCUMENTS_URL(companyId, farmId) + (qs ? `?${qs}` : ''),
          method: 'GET',
          credentials: 'include'
        };
      },
      providesTags: (_r, _e, { farmId }) => [{ type: 'FarmDocuments', id: farmId }]
    }),

    uploadFarmDocument: build.mutation<
      FarmDocument,
      DocScope & {
        file: File;
        title?: string;
        folder?: string;
        tags?: string[];
        /**
         * Production this document belongs to. CCOF's grower checklist asks for receipts,
         * handler certificates and delivery documents PER LOT, and until 2026-08-16 the
         * upload sent none of these — every file landed unattached in "uploads" and no
         * export could find it.
         */
        history?: number | null;
        parcel?: number | null;
        /** OSP module key this attachment answers (e.g. `g3_1_seedlings`). */
        linkedSection?: string;
      }
    >({
      query: ({ companyId, farmId, file, title, folder, tags, history, parcel, linkedSection }) => {
        const body = new FormData();
        body.append('file', file);
        if (title) body.append('title', title);
        if (folder) body.append('folder', folder);
        if (history) body.append('history', String(history));
        if (parcel) body.append('parcel', String(parcel));
        if (linkedSection) body.append('linked_section', linkedSection);
        (tags ?? []).forEach((t) => body.append('tags', t));
        return {
          url: DOCUMENTS_URL(companyId, farmId),
          method: 'POST',
          credentials: 'include',
          body
        };
      },
      invalidatesTags: (_r, _e, { farmId }) => [{ type: 'FarmDocuments', id: farmId }]
    }),

    deleteFarmDocument: build.mutation<void, DocScope & { docId: number }>({
      query: ({ companyId, farmId, docId }) => ({
        url: DOCUMENTS_URL(companyId, farmId, docId),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: (_r, _e, { farmId }) => [{ type: 'FarmDocuments', id: farmId }]
    })
  })
});

export const {
  useGetFarmDocumentsQuery,
  useUploadFarmDocumentMutation,
  useDeleteFarmDocumentMutation
} = documentsApi;

export default documentsApi;
