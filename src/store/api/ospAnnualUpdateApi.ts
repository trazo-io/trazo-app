/**
 * RTK Query slice for OSP annual continuation filings (7 CFR 205.406(a)).
 * Nested under /companies/{companyId}/establishments/{farmId}/osp-annual-updates/.
 */
import { OSP_ANNUAL_UPDATE_URL } from 'config';

import baseApi from './baseApi';

/** A file on the farm's Documents shelf that a filing names as support for its (a)(1) summary. */
export interface AnnualUpdateSupportingDocument {
  id: number;
  public_id: string;
  title: string;
  source: string;
  source_display: string;
  content_type: string;
  created_at: string;
}

export interface OSPAnnualUpdate {
  id: number;
  public_id?: string;
  prior_osp: number;
  /** Version number of the plan this filing references — read-only, from the server. */
  prior_osp_version?: number | null;
  new_osp?: number | null;
  /** Version this filing produced. Null is normal: § 205.406 allows a pure "no material
   *  changes" attestation, which creates no new plan version. */
  new_osp_version?: number | null;
  reporting_year: number;
  changes_summary?: string;
  additions?: unknown[];
  deletions?: unknown[];
  sections_unchanged_attestation?: Record<string, boolean>;
  /** § 205.406(a)(3): the changes themselves. "No change" is the attestation above. */
  application_info_changes?: string;
  /** § 205.406(a)(4). `agent_requested_info_none` is true only when the operator says the
   *  agent asked for nothing further; null is unanswered. */
  agent_requested_info?: string;
  agent_requested_info_none?: boolean | null;
  /** The 12 months the operation reports its sales for (ISO dates, both or neither). Each agent's
   *  fee form sets its own; with none stated, 02 counts the prior calendar year. Signed with the
   *  filing. */
  sales_period_start?: string | null;
  sales_period_end?: string | null;
  /** Revision chain. A filed update is never edited; a correction is the next revision. */
  revision_number?: number;
  /** On a correction: what it corrects in the revision before it, in the operator's words. Printed
   *  on the revision's own filed document and signed with it. */
  correction_note?: string;
  corrects?: number | null;
  /** § 205.406(a)(1) "supported by documentation": files from this farm's Documents, in the order
   *  attached. Signed with the filing once any is attached, so a signed filing's list is fixed. */
  supporting_documents?: AnnualUpdateSupportingDocument[];
  /** Write-only: the public ids of the supporting documents. Replaces the whole list. */
  supporting_document_ids?: string[];
  /** The Documents copy of the filed document, set by the server when the filing is recorded.
   *  Null for a draft, and for revisions filed before Trazo filed a copy (never backfilled). */
  filed_document?: number | null;
  /** Set by the server at sign time from the signed-in user, never sent by the client. */
  signer_name?: string;
  signer_title?: string;
  signed_at?: string | null;
  signed_content_sha256?: string;
  /** Set once by the file action. Never sent in an edit: the server refuses it. */
  submitted_at?: string | null;
  filing_method?: FilingMethod | '';
  snapshot_state?: 'frozen_at_filing' | 'legacy_none' | '';
  filed_sha256?: string;
  superseded_at?: string | null;
  withdrawn_at?: string | null;
  withdrawal_reason?: string;
  certifier_acknowledged_at?: string | null;
  /** Signed or filed: content changes only by correction. */
  is_locked?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const FILING_METHODS = [
  'agent_web_form',
  'agent_portal',
  'email',
  'mail',
  'in_person'
] as const;
export type FilingMethod = (typeof FILING_METHODS)[number];

interface Scope {
  companyId: string;
  farmId: string;
}

interface CreateArgs extends Scope {
  data: Partial<OSPAnnualUpdate>;
}

/** Content an edit may carry. Filing, signature and revision state are actions of their own. */
export type OSPAnnualUpdateContent = Pick<
  OSPAnnualUpdate,
  | 'reporting_year'
  | 'changes_summary'
  | 'additions'
  | 'deletions'
  | 'sections_unchanged_attestation'
  | 'application_info_changes'
  | 'agent_requested_info'
  | 'agent_requested_info_none'
  | 'sales_period_start'
  | 'sales_period_end'
  | 'correction_note'
  | 'supporting_document_ids'
>;

interface UpdateArgs extends Scope {
  updateId: string | number;
  data: Partial<OSPAnnualUpdateContent>;
}

interface ActionArgs extends Scope {
  updateId: string | number;
  data?: Record<string, unknown>;
}

const action =
  (name: string) =>
  ({ companyId, farmId, updateId, data }: ActionArgs) => ({
    url: `${OSP_ANNUAL_UPDATE_URL(companyId, farmId, updateId)}${name}/`,
    method: 'POST',
    body: data ?? {},
    credentials: 'include' as const
  });

/** One § 205.401(b) detail as Trazo holds it (`certifications/services/application_info_review.py`). */
export interface CompanyDetail {
  key: string;
  /** English label, the one the filing's change line prints. The screen uses its own i18n label. */
  label: string;
  record: 'company' | 'establishment';
  field: string;
  /** § 205.401(b) asks for it: "correct" over an empty value is refused. */
  required: boolean;
  /** Empty when Trazo holds none. Never filled in from anywhere else. */
  value: string;
  held: boolean;
  /** "record.field" the value was read from, in the packet cover's order. */
  source: string;
  /** False for a viewer, and for a farm manager on the company's own fields. */
  editable: boolean;
}

export interface CompanyDetailsReview {
  filing: number;
  locked: boolean;
  attested_unchanged: boolean;
  application_info_changes: string;
  can_answer: boolean;
  can_edit_company: boolean;
  details: CompanyDetail[];
}

export type CompanyDetailStatus = 'correct' | 'changed';

export interface CompanyDetailAnswer {
  status: CompanyDetailStatus;
  value?: string;
}

interface CompanyDetailsArgs extends Scope {
  updateId: string | number;
}

interface ConfirmCompanyDetailsArgs extends CompanyDetailsArgs {
  /** Every detail, answered. The server refuses a request that leaves one out. */
  answers: Record<string, CompanyDetailAnswer>;
}

const ospAnnualUpdateApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOSPAnnualUpdates: build.query<OSPAnnualUpdate[], Scope>({
      query: ({ companyId, farmId }) => ({
        url: OSP_ANNUAL_UPDATE_URL(companyId, farmId),
        method: 'GET',
        credentials: 'include'
      }),
      transformResponse: (response: OSPAnnualUpdate[] | { results: OSPAnnualUpdate[] }) =>
        Array.isArray(response) ? response : response.results ?? [],
      providesTags: [{ type: 'OSPAnnualUpdate', id: 'LIST' }]
    }),
    createOSPAnnualUpdate: build.mutation<OSPAnnualUpdate, CreateArgs>({
      query: ({ companyId, farmId, data }) => ({
        url: OSP_ANNUAL_UPDATE_URL(companyId, farmId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: [{ type: 'OSPAnnualUpdate', id: 'LIST' }]
    }),
    updateOSPAnnualUpdate: build.mutation<OSPAnnualUpdate, UpdateArgs>({
      query: ({ companyId, farmId, updateId, data }) => ({
        url: OSP_ANNUAL_UPDATE_URL(companyId, farmId, updateId),
        method: 'PATCH',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: [{ type: 'OSPAnnualUpdate', id: 'LIST' }]
    }),
    signOSPAnnualUpdate: build.mutation<OSPAnnualUpdate, ActionArgs>({
      query: action('sign'),
      invalidatesTags: [{ type: 'OSPAnnualUpdate', id: 'LIST' }]
    }),
    fileOSPAnnualUpdate: build.mutation<OSPAnnualUpdate, ActionArgs>({
      query: action('file'),
      // Filing also files the frozen document to the farm's Documents.
      invalidatesTags: (_r, _e, { farmId }) => [
        { type: 'OSPAnnualUpdate', id: 'LIST' },
        { type: 'FarmDocuments', id: farmId }
      ]
    }),
    correctOSPAnnualUpdate: build.mutation<OSPAnnualUpdate, ActionArgs>({
      query: action('correct'),
      invalidatesTags: [{ type: 'OSPAnnualUpdate', id: 'LIST' }]
    }),
    withdrawOSPAnnualUpdate: build.mutation<OSPAnnualUpdate, ActionArgs>({
      query: action('withdraw'),
      invalidatesTags: [{ type: 'OSPAnnualUpdate', id: 'LIST' }]
    }),
    getCompanyDetailsReview: build.query<CompanyDetailsReview, CompanyDetailsArgs>({
      query: ({ companyId, farmId, updateId }) => ({
        url: `${OSP_ANNUAL_UPDATE_URL(companyId, farmId, updateId)}company-details/`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: [{ type: 'OSPAnnualUpdate', id: 'COMPANY_DETAILS' }, 'Farm', 'Company']
    }),
    confirmCompanyDetails: build.mutation<CompanyDetailsReview, ConfirmCompanyDetailsArgs>({
      query: ({ companyId, farmId, updateId, answers }) => ({
        url: `${OSP_ANNUAL_UPDATE_URL(companyId, farmId, updateId)}company-details/`,
        method: 'POST',
        body: { answers },
        credentials: 'include'
      }),
      // A change writes the farm or company record, so the farm profile refetches too.
      invalidatesTags: [
        { type: 'OSPAnnualUpdate', id: 'LIST' },
        { type: 'OSPAnnualUpdate', id: 'COMPANY_DETAILS' },
        'Farm',
        'Company',
        'Establishment'
      ]
    })
  })
});

export const {
  useGetOSPAnnualUpdatesQuery,
  useCreateOSPAnnualUpdateMutation,
  useUpdateOSPAnnualUpdateMutation,
  useSignOSPAnnualUpdateMutation,
  useFileOSPAnnualUpdateMutation,
  useCorrectOSPAnnualUpdateMutation,
  useWithdrawOSPAnnualUpdateMutation,
  useGetCompanyDetailsReviewQuery,
  useConfirmCompanyDetailsMutation
} = ospAnnualUpdateApi;

export default ospAnnualUpdateApi;
