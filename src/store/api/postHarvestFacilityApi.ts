/**
 * Off-farm post-harvest handlers — CCOF G6.1 / 7 CFR 205.272.
 *
 * When a lot leaves the farm for a huller, dryer, cold store or packer, that facility must be
 * a certified organic handler and its current organic certificate has to travel with the lot.
 * The certifier packet prints that certificate; until 2026-08-16 nothing in the app could
 * record it, so the packet printed the ask on every export instead.
 *
 * `cert_is_current` is TRI-STATE and must be rendered as three states, never two:
 *   true  — certificate on file and inside the ~15-month window
 *   false — expired or older than 15 months (a real gap)
 *   null  — no effective date recorded, so nothing is known (an ask, NOT a pass or a fail)
 */
import {
  POST_HARVEST_FACILITY_URL,
  POST_HARVEST_FACILITY_VERIFY_URL,
  PRODUCTION_HANDLER_URL
} from 'config';
import baseApi from './baseApi';

export type PostHarvestFacilityType = 'huller' | 'dryer' | 'cold_storage' | 'packer' | 'custom';

export interface PostHarvestFacility {
  id: number;
  public_id: string;
  name: string;
  facility_type: PostHarvestFacilityType;
  facility_type_display: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  certification_number?: string | null;
  certifier_name?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  cert_document?: string | null;
  verification_status: string;
  verification_status_display: string;
  is_verified: boolean;
  /** Tri-state — see the module note. */
  cert_is_current: boolean | null;
  last_verified_at?: string | null;
  notes?: string | null;
}

export type PostHarvestFacilityInput = Partial<
  Pick<
    PostHarvestFacility,
    | 'name'
    | 'facility_type'
    | 'address'
    | 'city'
    | 'state'
    | 'certification_number'
    | 'certifier_name'
    | 'effective_date'
    | 'expiry_date'
    | 'notes'
  >
>;

interface Scope {
  companyId: string;
  farmId: string;
}

export interface ProductionHandlerDetail {
  id: number;
  name: string;
  facility_type: PostHarvestFacilityType;
  facility_type_display: string;
  certification_number?: string | null;
  certifier_name?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  verification_status: string;
  cert_is_current: boolean | null;
}

/**
 * The handlers ONE production was sent to, as returned by the owner-side link endpoint.
 *
 * 🔴 2026-08-21 — plural. This was `post_harvest_facility: number | null` plus one `detail`,
 * because the link was a single ForeignKey. A lot with a fresh grade and a process grade goes
 * to TWO certified operations (Calapooia Bend: Organically Grown Company fresh, Willamette
 * Valley Fruit process), so the operator could record only half of § 205.272 — and the packet's
 * "no handler certificate on file" warning cleared as soon as one was linked.
 */
export interface ProductionHandlerLink {
  post_harvest_facilities: number[];
  details: ProductionHandlerDetail[];
}

const postHarvestFacilityApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPostHarvestFacilities: build.query<PostHarvestFacility[], Scope>({
      query: ({ companyId, farmId }) => ({
        url: POST_HARVEST_FACILITY_URL(companyId, farmId),
        method: 'GET',
        credentials: 'include'
      }),
      // The viewset is unpaginated today; tolerate either shape rather than rendering an
      // empty picker if pagination is switched on later.
      transformResponse: (response: PostHarvestFacility[] | { results: PostHarvestFacility[] }) =>
        Array.isArray(response) ? response : response?.results ?? [],
      providesTags: ['PostHarvestFacility']
    }),

    getProductionHandler: build.query<ProductionHandlerLink, string>({
      query: (productionId) => ({
        url: PRODUCTION_HANDLER_URL(productionId),
        method: 'GET',
        credentials: 'include'
      }),
      // 'History' too: linking is a PATCH on the production, and updateProduction invalidates
      // 'History' — without it the card kept showing the old handler until a reload.
      providesTags: ['PostHarvestFacility', 'History']
    }),

    addPostHarvestFacility: build.mutation<
      PostHarvestFacility,
      Scope & { data: PostHarvestFacilityInput }
    >({
      query: ({ companyId, farmId, data }) => ({
        url: POST_HARVEST_FACILITY_URL(companyId, farmId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['PostHarvestFacility']
    }),

    updatePostHarvestFacility: build.mutation<
      PostHarvestFacility,
      Scope & { facilityId: number; data: PostHarvestFacilityInput }
    >({
      query: ({ companyId, farmId, facilityId, data }) => ({
        url: POST_HARVEST_FACILITY_URL(companyId, farmId, facilityId),
        method: 'PATCH',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['PostHarvestFacility', 'History']
    }),

    deletePostHarvestFacility: build.mutation<void, Scope & { facilityId: number }>({
      query: ({ companyId, farmId, facilityId }) => ({
        url: POST_HARVEST_FACILITY_URL(companyId, farmId, facilityId),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: ['PostHarvestFacility', 'History']
    }),

    verifyPostHarvestFacility: build.mutation<
      { status: string; facility_id: number },
      Scope & { facilityId: number }
    >({
      query: ({ companyId, farmId, facilityId }) => ({
        url: POST_HARVEST_FACILITY_VERIFY_URL(companyId, farmId, facilityId),
        method: 'POST',
        credentials: 'include'
      }),
      invalidatesTags: ['PostHarvestFacility']
    })
  })
});

export const {
  useGetPostHarvestFacilitiesQuery,
  useGetProductionHandlerQuery,
  useAddPostHarvestFacilityMutation,
  useUpdatePostHarvestFacilityMutation,
  useDeletePostHarvestFacilityMutation,
  useVerifyPostHarvestFacilityMutation
} = postHarvestFacilityApi;

export default postHarvestFacilityApi;
