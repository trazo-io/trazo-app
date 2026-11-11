/**
 * RTK Query slice for landowner / prior-manager affidavits (3-year transition proof,
 * 7 CFR 205.202(b)). Nested under the establishment; filtered to a parcel via ?parcel=.
 */
import { LANDOWNER_AFFIDAVIT_URL } from 'config';

import baseApi from './baseApi';

export interface YearHistoryRow {
  year?: number | string;
  land_use?: string;
  inputs?: string;
  applied_by?: string;
  /** USDA Land Use History Verification asks Material / Manufacturer / Date Applied as
   *  separate columns. `inputs` answers neither of the last two, and a 36-month eligibility
   *  determination turns on the date. Optional: rows already on file predate them. */
  manufacturer?: string;
  date_applied?: string;
  /** CCOF ORGB49 Affidavit D "Type" (fertilizer, pest_disease_control, herbicide, compost_manure,
   *  seed_treatment, adjuvant, other); "" is not stated. */
  material_type?: string;
  /** WSDA AGR 2262 ref 7: months produced ("YYYY-MM") and acreage of the use on this row. */
  period_from?: string;
  period_to?: string;
  acres?: string;
}

export const AFFIDAVIT_MATERIAL_TYPES = [
  'fertilizer',
  'pest_disease_control',
  'herbicide',
  'compost_manure',
  'seed_treatment',
  'adjuvant',
  'other'
] as const;

export interface LandownerAffidavit {
  id: number;
  public_id?: string;
  parcel: number;
  osp?: number | null;
  farm_name?: string | null;
  field_name?: string | null;
  field_acres?: number | null;
  previous_manager_name?: string;
  previous_manager_address?: string | null;
  previous_manager_phone?: string | null;
  landowner_name?: string | null;
  landowner_address?: string | null;
  landowner_phone?: string | null;
  yearly_history?: YearHistoryRow[];
  last_prohibited_date?: string | null;
  attestation_text?: string;
  attestation_default?: string;
  previous_manager_signed_date?: string | null;
  landowner_signed_date?: string | null;
  notes?: string | null;
  /** USDA's "☐ No materials applied" checkbox. TRI-STATE and deliberately nullable:
   *  true = the signer declared none, false = materials are listed, null/undefined = never
   *  answered. An empty `yearly_history` is the third case, NOT the first — rendering it as
   *  a declaration would manufacture the § 205.202(b) attestation eligibility rests on. */
  no_materials_applied?: boolean | null;
  management_period_start?: string | null;
  management_period_end?: string | null;
  parcel_legal_description?: string | null;
  /** CCOF Affidavit B: owned / managed / other ("" not stated), with the description of "other". */
  signer_basis?: '' | 'owned' | 'managed' | 'other';
  signer_basis_other?: string;
  /** CCOF Affidavit C signature block; WSDA AGR 2262 attestation (email). */
  signer_title?: string;
  signer_company?: string;
  signer_email?: string;
  /** WSDA AGR 2262 5a(i), 5b, 6, 6a. */
  last_inspection_date?: string | null;
  portion_remains?: '' | 'yes' | 'no';
  acres_remaining?: string | null;
  treated_seed_planted?: '' | 'yes' | 'no';
  treated_seed_detail?: string;
}

interface Scope {
  companyId: string;
  farmId: string;
  parcelId: number | string;
}
interface CreateArgs {
  companyId: string;
  farmId: string;
  data: Partial<LandownerAffidavit>;
}
interface UpdateArgs {
  companyId: string;
  farmId: string;
  affidavitId: number | string;
  data: Partial<LandownerAffidavit>;
}
interface DeleteArgs {
  companyId: string;
  farmId: string;
  affidavitId: number | string;
}

const landownerAffidavitApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getLandownerAffidavits: build.query<LandownerAffidavit[], Scope>({
      query: ({ companyId, farmId, parcelId }) => ({
        url: LANDOWNER_AFFIDAVIT_URL(companyId, farmId),
        method: 'GET',
        params: { parcel: parcelId },
        credentials: 'include'
      }),
      transformResponse: (r: LandownerAffidavit[] | { results: LandownerAffidavit[] }) =>
        Array.isArray(r) ? r : r.results ?? [],
      providesTags: [{ type: 'LandownerAffidavit', id: 'LIST' }]
    }),
    createLandownerAffidavit: build.mutation<LandownerAffidavit, CreateArgs>({
      query: ({ companyId, farmId, data }) => ({
        url: LANDOWNER_AFFIDAVIT_URL(companyId, farmId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: [{ type: 'LandownerAffidavit', id: 'LIST' }]
    }),
    updateLandownerAffidavit: build.mutation<LandownerAffidavit, UpdateArgs>({
      query: ({ companyId, farmId, affidavitId, data }) => ({
        url: LANDOWNER_AFFIDAVIT_URL(companyId, farmId, affidavitId),
        method: 'PATCH',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: [{ type: 'LandownerAffidavit', id: 'LIST' }]
    }),
    deleteLandownerAffidavit: build.mutation<void, DeleteArgs>({
      query: ({ companyId, farmId, affidavitId }) => ({
        url: LANDOWNER_AFFIDAVIT_URL(companyId, farmId, affidavitId),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: [{ type: 'LandownerAffidavit', id: 'LIST' }]
    })
  })
});

export const {
  useGetLandownerAffidavitsQuery,
  useCreateLandownerAffidavitMutation,
  useUpdateLandownerAffidavitMutation,
  useDeleteLandownerAffidavitMutation
} = landownerAffidavitApi;

export default landownerAffidavitApi;
