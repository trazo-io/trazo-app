/**
 * The farm's own record of its certifier's inspections and the items the agent sent.
 *
 * Mirrors `CertifierInspection` / `CertifierNotice` in trazo-back `certifications/models.py`.
 * 7 CFR 205.662(a)(3): a notice of noncompliance sets the date by which the operation must rebut or
 * correct and submit supporting documentation; (b) is the agent's written resolution. Anything else
 * the agent sends is an `other_item` under the agent's own word, never a category Trazo names.
 *
 * `status` is derived on the server (`services/certifier_notices.notice_status`) and never sent:
 * only an attached resolution notice reads `resolved`.
 */
import { CERTIFIER_INSPECTION_URL, CERTIFIER_NOTICE_URL } from 'config/backend';
import { baseApi } from './baseApi';

interface Scope {
  companyId: string;
  farmId: string;
}

/** Mirrors CertifierInspection.KIND_CHOICES; blank is "not stated". */
export type InspectionKind = '' | 'annual' | 'additional' | 'unannounced';
export const INSPECTION_KINDS: InspectionKind[] = ['', 'annual', 'additional', 'unannounced'];

/** Mirrors CertifierNotice.KIND_CHOICES. */
export type NoticeKind = 'notice_of_noncompliance' | 'other_item';
export const NOTICE_KINDS: NoticeKind[] = ['notice_of_noncompliance', 'other_item'];

/** Mirrors CertifierNotice.RESPONSE_KIND_CHOICES: the two answers 205.662(a)(3) allows. */
export type NoticeResponseKind = '' | 'corrected' | 'rebutted';
export const NOTICE_RESPONSE_KINDS: NoticeResponseKind[] = ['', 'corrected', 'rebutted'];

/** Mirrors services/certifier_notices.STATUSES. */
export type NoticeStatus =
  | 'resolved'
  | 'resolution_stated_no_copy'
  | 'respond_by_passed_no_response'
  | 'response_sent'
  | 'open';
export const NOTICE_STATUSES: NoticeStatus[] = [
  'resolved',
  'resolution_stated_no_copy',
  'respond_by_passed_no_response',
  'response_sent',
  'open'
];

export interface CertifierInspection {
  id: number;
  public_id: string;
  inspected_on: string;
  certifying_agent: string;
  inspector_name: string;
  inspection_kind: InspectionKind;
  inspection_kind_display: string;
  report_document: number | null;
  report_document_title: string | null;
  notes: string;
  notice_count: number;
  created_at: string;
  updated_at: string;
}

/** What the inspection form renders, and nothing else (the mutation sends only these). */
export interface CertifierInspectionInput {
  inspected_on: string;
  certifying_agent: string;
  inspector_name: string;
  inspection_kind: InspectionKind;
  report_document: number | null;
}

export interface CertifierNotice {
  id: number;
  public_id: string;
  inspection: number | null;
  kind: NoticeKind;
  kind_display: string;
  agent_label: string;
  received_on: string | null;
  description: string;
  notice_document: number | null;
  notice_document_title: string | null;
  respond_by: string | null;
  response_kind: NoticeResponseKind;
  response_kind_display: string;
  response_text: string;
  response_sent_on: string | null;
  response_documents: { id: number; title: string }[];
  resolution_received_on: string | null;
  resolution_document: number | null;
  resolution_document_title: string | null;
  status: NoticeStatus;
  created_at: string;
  updated_at: string;
}

/** What the notice form renders, and nothing else. */
export interface CertifierNoticeInput {
  inspection: number | null;
  kind: NoticeKind;
  agent_label: string;
  received_on: string | null;
  description: string;
  notice_document: number | null;
  respond_by: string | null;
  response_kind: NoticeResponseKind;
  response_text: string;
  response_sent_on: string | null;
  response_document_ids: number[];
  resolution_received_on: string | null;
  resolution_document: number | null;
}

// The viewsets are unpaginated; tolerate either shape rather than render "none recorded".
const asList = <T>(response: T[] | { results: T[] }): T[] =>
  Array.isArray(response) ? response : response?.results ?? [];

const certifierInspectionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCertifierInspections: build.query<CertifierInspection[], Scope>({
      query: ({ companyId, farmId }) => ({
        url: CERTIFIER_INSPECTION_URL(companyId, farmId),
        method: 'GET',
        credentials: 'include'
      }),
      transformResponse: asList,
      providesTags: ['CertifierInspection']
    }),
    addCertifierInspection: build.mutation<
      CertifierInspection,
      Scope & { data: CertifierInspectionInput }
    >({
      query: ({ companyId, farmId, data }) => ({
        url: CERTIFIER_INSPECTION_URL(companyId, farmId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['CertifierInspection']
    }),
    updateCertifierInspection: build.mutation<
      CertifierInspection,
      Scope & { inspectionId: number; data: CertifierInspectionInput }
    >({
      query: ({ companyId, farmId, inspectionId, data }) => ({
        url: CERTIFIER_INSPECTION_URL(companyId, farmId, inspectionId),
        method: 'PATCH',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['CertifierInspection']
    }),
    deleteCertifierInspection: build.mutation<void, Scope & { inspectionId: number }>({
      query: ({ companyId, farmId, inspectionId }) => ({
        url: CERTIFIER_INSPECTION_URL(companyId, farmId, inspectionId),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: ['CertifierInspection']
    }),

    getCertifierNotices: build.query<CertifierNotice[], Scope>({
      query: ({ companyId, farmId }) => ({
        url: CERTIFIER_NOTICE_URL(companyId, farmId),
        method: 'GET',
        credentials: 'include'
      }),
      transformResponse: asList,
      providesTags: ['CertifierNotice']
    }),
    addCertifierNotice: build.mutation<CertifierNotice, Scope & { data: CertifierNoticeInput }>({
      query: ({ companyId, farmId, data }) => ({
        url: CERTIFIER_NOTICE_URL(companyId, farmId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      // An inspection's notice_count changes with its items.
      invalidatesTags: ['CertifierNotice', 'CertifierInspection']
    }),
    updateCertifierNotice: build.mutation<
      CertifierNotice,
      Scope & { noticeId: number; data: CertifierNoticeInput }
    >({
      query: ({ companyId, farmId, noticeId, data }) => ({
        url: CERTIFIER_NOTICE_URL(companyId, farmId, noticeId),
        method: 'PATCH',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['CertifierNotice', 'CertifierInspection']
    }),
    deleteCertifierNotice: build.mutation<void, Scope & { noticeId: number }>({
      query: ({ companyId, farmId, noticeId }) => ({
        url: CERTIFIER_NOTICE_URL(companyId, farmId, noticeId),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: ['CertifierNotice', 'CertifierInspection']
    })
  })
});

export const {
  useGetCertifierInspectionsQuery,
  useAddCertifierInspectionMutation,
  useUpdateCertifierInspectionMutation,
  useDeleteCertifierInspectionMutation,
  useGetCertifierNoticesQuery,
  useAddCertifierNoticeMutation,
  useUpdateCertifierNoticeMutation,
  useDeleteCertifierNoticeMutation
} = certifierInspectionApi;
