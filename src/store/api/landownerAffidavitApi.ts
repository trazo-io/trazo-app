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
}

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
