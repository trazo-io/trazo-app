/**
 * RTK Query slice for neighbour-signed adjoining-land attestations
 * (USDA form #25, 7 CFR 205.202(c)). Nested under the establishment; filtered to a parcel
 * via ?parcel=.
 *
 * Deliberately separate from `landownerAffidavitApi` and from the parcel's `buffer_zones`,
 * because the three have different authors:
 *
 *   buffer_zones           what the OPERATOR says about the boundary
 *   LandownerAffidavit     what the PRIOR MANAGER signs about the land's history
 *   AdjoiningLandAffidavit what the NEIGHBOUR signs about their own practices
 *
 * Merging any of them would let one party's statement render as another's attestation.
 */
import { ADJOINING_LAND_URL } from 'config';

import baseApi from './baseApi';

/** Codes mirror AdjoiningLandAffidavit.MATERIAL_CHOICES on the backend, which REJECTS
 *  anything outside this set at the write boundary. */
export type AdjoiningMaterialCode =
  | 'synthetic_fertilizers'
  | 'herbicides'
  | 'insecticides'
  | 'fungicides'
  | 'treated_wood'
  | 'other';

export interface AdjoiningLandAffidavit {
  id: number;
  public_id?: string;
  parcel: number;
  neighbor_name: string;
  neighbor_farm_name?: string;
  neighbor_address?: string;
  neighbor_phone?: string;
  border_side?: string;
  /** TRI-STATE. null = the neighbour never answered, which is NOT "they are not organic".
   *  Same rule as the landowner affidavit's no_materials_applied. */
  neighbor_is_certified_organic?: boolean | null;
  neighbor_certifier_name?: string;
  /** Empty array = unanswered. An affirmative "none of the above" lives in
   *  `declares_no_materials`, and the backend rejects setting both. */
  materials_used?: AdjoiningMaterialCode[];
  declares_no_materials?: boolean | null;
  not_used_on_adjoining_fields?: boolean | null;
  /** FEET — USDA's unit. `buffer_zones.buffer_width_m` is metres; never mix them. */
  distance_to_organic_property_ft?: number | null;
  agrees_to_notify?: boolean | null;
  neighbor_signed_date?: string | null;
  signed_document?: string | null;
  notes?: string;
  /** Read-only mirrors of the model helpers, so the UI and the certifier packet cannot
   *  drift into two different renderings of the same three-state logic. */
  materials_display?: string;
  is_signed?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Scope {
  companyId: string;
  farmId: string;
  parcelId: number | string;
}
interface CreateArgs {
  companyId: string;
  farmId: string;
  data: Partial<AdjoiningLandAffidavit>;
}
interface UpdateArgs {
  companyId: string;
  farmId: string;
  affidavitId: number | string;
  data: Partial<AdjoiningLandAffidavit>;
}
interface DeleteArgs {
  companyId: string;
  farmId: string;
  affidavitId: number | string;
}

const adjoiningLandApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdjoiningLandAffidavits: build.query<AdjoiningLandAffidavit[], Scope>({
      query: ({ companyId, farmId, parcelId }) => ({
        url: ADJOINING_LAND_URL(companyId, farmId),
        method: 'GET',
        params: { parcel: parcelId },
        credentials: 'include'
      }),
      transformResponse: (r: AdjoiningLandAffidavit[] | { results: AdjoiningLandAffidavit[] }) =>
        Array.isArray(r) ? r : r.results ?? [],
      providesTags: [{ type: 'AdjoiningLandAffidavit', id: 'LIST' }]
    }),
    createAdjoiningLandAffidavit: build.mutation<AdjoiningLandAffidavit, CreateArgs>({
      query: ({ companyId, farmId, data }) => ({
        url: ADJOINING_LAND_URL(companyId, farmId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: [{ type: 'AdjoiningLandAffidavit', id: 'LIST' }]
    }),
    updateAdjoiningLandAffidavit: build.mutation<AdjoiningLandAffidavit, UpdateArgs>({
      query: ({ companyId, farmId, affidavitId, data }) => ({
        url: ADJOINING_LAND_URL(companyId, farmId, affidavitId),
        method: 'PATCH',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: [{ type: 'AdjoiningLandAffidavit', id: 'LIST' }]
    }),
    deleteAdjoiningLandAffidavit: build.mutation<void, DeleteArgs>({
      query: ({ companyId, farmId, affidavitId }) => ({
        url: ADJOINING_LAND_URL(companyId, farmId, affidavitId),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: [{ type: 'AdjoiningLandAffidavit', id: 'LIST' }]
    })
  })
});

export const {
  useGetAdjoiningLandAffidavitsQuery,
  useCreateAdjoiningLandAffidavitMutation,
  useUpdateAdjoiningLandAffidavitMutation,
  useDeleteAdjoiningLandAffidavitMutation
} = adjoiningLandApi;

export default adjoiningLandApi;
