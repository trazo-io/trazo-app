/**
 * Off-farm post-harvest handlers: CCOF G6.1 / 7 CFR 205.100(a), subject to § 205.101.
 *
 * When a lot leaves the farm for a huller, dryer, cold store or packer, that facility must be
 * a certified organic handler (unless a § 205.101 exemption applies) and its current organic
 * certificate has to travel with the lot.
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
import type { FacilityProduct } from './facilityProductApi';

export type PostHarvestFacilityType =
  | 'huller'
  | 'dryer'
  | 'cold_storage'
  | 'dry_storage'
  | 'packer'
  | 'custom';

/**
 * Who runs the facility. The operation's own shed or cooler is `this_operation`: covered by the
 * operation's own certificate, so it has no certificate of its own and never shows a certificate
 * state (OTCO C7 7.1, 7.2-1 and 7.7-2 OWN; CCOF G6.4 A1).
 */
export type PostHarvestFacilityOperatedBy = 'another_operation' | 'this_operation';

/**
 * What the facility DOES for this operation — a different axis from what it IS. CCOF asks about
 * handling on G6.1 §C and storage on G6.2 §A; WSDA splits them again across sections K and L. A
 * cold store can be either, and without this axis one record answers both questions or neither.
 */
// `''` is a real, expected value, not a placeholder: the backend field is `blank=True` with an
// empty default so a facility nobody has been asked about prints in the plan as unstated rather
// than as a role the operator never chose. Leaving it out of the union forces every caller to
// launder the empty string, which is how the honest state gets quietly replaced by a guess.
export type PostHarvestFacilityRole = '' | 'handling' | 'storage' | 'both';

export interface PostHarvestFacility {
  id: number;
  public_id: string;
  name: string;
  facility_type: PostHarvestFacilityType;
  facility_type_display: string;
  role: PostHarvestFacilityRole;
  role_display: string;
  operated_by: PostHarvestFacilityOperatedBy;
  is_own: boolean;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string;
  country?: string;
  /** Signed URL of the layout of an own facility, or null. */
  layout_document?: string | null;
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
  /** Products it handles or stores, with detail and packaging form, as the operation describes them. */
  products_detail?: string;
  /** The facility's product rows (CCOF G6.1 C2, OTCO C7 7.10-2); written through `facilityProductApi`. */
  products?: FacilityProduct[];
  /** The crops on the production records linked to this facility, by season year; read-only. */
  crops_recorded?: { crop: string; years: number[] }[];
  /** WSDA AGR 2519's activities at this facility, by key (`config/facilityActivities`). */
  activities?: string[];
  /** How an uncertified third party is exempt from certification (§ 205.101); another operation's only. */
  exemption_basis?: string;
}

export type PostHarvestFacilityInput = Partial<
  Pick<
    PostHarvestFacility,
    | 'name'
    | 'facility_type'
    | 'role'
    | 'operated_by'
    | 'address'
    | 'city'
    | 'state'
    | 'postal_code'
    | 'country'
    | 'certification_number'
    | 'certifier_name'
    | 'effective_date'
    | 'expiry_date'
    | 'notes'
    | 'products_detail'
    | 'activities'
    | 'exemption_basis'
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
  /** The operation's own facility: no certificate of its own, so no certificate badge. */
  is_own?: boolean;
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

    // The layout of an own facility (OTCO C7 7.2-1). Multipart, so it is its own call: the JSON
    // edits above stay JSON.
    uploadFacilityLayout: build.mutation<
      PostHarvestFacility,
      Scope & { facilityId: number; file: File }
    >({
      query: ({ companyId, farmId, facilityId, file }) => {
        const body = new FormData();
        body.append('layout_document', file);
        return {
          url: POST_HARVEST_FACILITY_URL(companyId, farmId, facilityId),
          method: 'PATCH',
          body,
          credentials: 'include'
        };
      },
      invalidatesTags: ['PostHarvestFacility']
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
  useUploadFacilityLayoutMutation,
  useDeletePostHarvestFacilityMutation,
  useVerifyPostHarvestFacilityMutation
} = postHarvestFacilityApi;

export default postHarvestFacilityApi;
