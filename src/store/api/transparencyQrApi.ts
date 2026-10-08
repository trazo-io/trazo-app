/**
 * Trazo Transparency-First QR API
 *
 * NEW: Eliminates competitive carbon ranking to solve farmer incentive problems
 * Focuses on transparency percentage and authentic farm stories
 *
 * Progressive loading: 2s → 10s → 30s+ disclosure pattern
 * Following Trazo's modern, clean, minimalist design standards
 */
import { baseApi } from './baseApi';

// IMMEDIATE LOAD (2 seconds). The self-graded `transparency_score` left this block for EVERY
// caller on 2026-09-05 (owner included — no producer surface rendered it). Kept as an empty
// object on the wire for compatibility.
export type TransparencyQuickView = Record<string, never>;

// STANDARD LOAD (10 seconds) - Core transparency details
export interface TransparencyStandardView {
  /**
   * FACTS about the farm and nothing Trazo authored to measure it against. `completeness_score`,
   * `expected_events`, and the per-category `expected_count` / `completeness_percentage` /
   * `status` were removed from the public payload on 2026-08-11 (a numerator with its
   * denominator republishes the grade EU ECGT 2024/825 bans) and from the OWNER payload on
   * 2026-09-05 (no producer surface rendered them). Every caller now gets the same shape.
   */
  transparency_details: {
    actual_events: number;
    farming_approach: 'organic' | 'conventional' | 'biodynamic';
    category_breakdown: {
      [category: string]: {
        actual_count: number;
        /** Farmer-uploaded photographs. "Documented", never "verified" — nobody checked them. */
        photo_documented_count?: number;
        photo_documentation_rate?: number;
      };
    };
  };
  // Sprint 5A — populated by the public transparency endpoint when the
  // production has an organic claim and/or certification records. Optional
  // to keep this interface non-breaking for older fixtures. Consumers should
  // tolerate either being absent. See `types/certification.ts` for the
  // shared shape — re-imported as a type-only import to avoid coupling.
  organic_claim?: import('../../types/certification').OrganicClaim | null;
  certifications?: import('../../types/certification').ConsumerCertification[];
  organic_summary?: string;
}

// Timeline event structure for photo display
export interface TimelineEvent {
  id: string;
  event_type: string;
  date: string;
  description: string;
  hasAlbum: boolean;
  album?: {
    id: number;
    images: Array<{
      id: number;
      image: string;
      thumbnail?: string;
    }>;
  };
  // NEW ACTIVITY FIELDS for complete transparency
  activity_type?: string;
  activity_name?: string;
  duration?: string;
  people_involved?: number;
}

// Complete response structure
export interface TransparencyResponse {
  quick_view: TransparencyQuickView;
  standard_view: TransparencyStandardView;
  timeline?: TimelineEvent[]; // Production events for journey display
  images?: string[]; // Production images from farmer's finish production form
  carbon_impact: {
    // Added carbon_impact to match API response
    kg_per_kg: number;
    total_emissions: number;
    total_offsets: number;
    net_impact: number;
    unit: string;
    calculation_method: string;
  };
  api_version: string;
  response_timestamp: string;
}

// Buyer/retailer documentation request (public endpoint, no auth)
export interface BuyerDocRequestPayload {
  production_id: string; // production public UUID
  requester_name: string;
  requester_email: string;
  organization?: string;
  message?: string;
}

export interface BuyerDocRequestResponse {
  id: number;
  // true (HTTP 200) when the same email already requested docs for this
  // production within 24h — treated as success by the UI (idempotent UX)
  duplicate: boolean;
}

// Blockchain integrity verification response
export interface BlockchainIntegrityResponse {
  status: 'verified' | 'submitted' | 'tampered' | 'pending';
  data_integrity: 'intact' | 'tampered' | 'no_hash' | 'check_failed';
  data_integrity_detail: string;
  tx_hash?: string;
  verified?: boolean;
  block_number?: number;
  submitted_at?: string;
  finalization_hash?: string;
  finalization_event_count?: number;
  network?: string;
  explorer_url?: string;
  message?: string;
}

// NEW Transparency-First QR API
const transparencyQrApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Complete transparency data with progressive loading structure
    getTransparencyDetails: build.query<
      TransparencyResponse,
      string | { productionId: string; reviewToken?: string | null; publicView?: boolean }
    >({
      // Accepts a bare id (every pre-2026-08-25 caller) or {productionId, reviewToken}.
      // `review_token` lets a BUYER review link open an unpublished, in-season
      // production — the payload itself is unchanged (same claim-safe serializers);
      // the token only changes which productions resolve.
      // `publicView` (2026-10-08) sends `public_view=1`, which drops the backend's owner
      // exemption: the consumer page sets it so a signed-in grower gets the same 404 a
      // shopper gets for an unpublished lot. Dashboard callers pass a bare id and keep
      // their preview of in-season and unpublished lots.
      query: (arg) => {
        const productionId = typeof arg === 'string' ? arg : arg.productionId;
        const reviewToken = typeof arg === 'string' ? null : arg.reviewToken;
        const publicView = typeof arg === 'string' ? false : Boolean(arg.publicView);
        const params = new URLSearchParams();
        if (reviewToken) params.set('review_token', reviewToken);
        if (publicView) params.set('public_view', '1');
        const qs = params.toString();
        return {
          url: `/transparency/${productionId}/${qs ? `?${qs}` : ''}`,
          method: 'GET'
        };
      },
      providesTags: (result, error, arg) => [
        { type: 'TransparencyDetails', id: typeof arg === 'string' ? arg : arg.productionId }
      ]
    }),

    // Blockchain integrity verification
    verifyBlockchainIntegrity: build.query<BlockchainIntegrityResponse, string>({
      query: (productionId) => ({
        url: `/transparency/${productionId}/verify-blockchain/`,
        method: 'GET'
      })
    }),

    // Legacy scan tracking (enhanced for transparency)
    recordTransparencyScan: build.mutation<any, { production_id: string; comment?: string }>({
      query: (scanData) => ({
        url: `/history/public_scans/`,
        method: 'POST',
        body: {
          ...scanData,
          scan_type: 'transparency_qr' // Track as transparency-focused scan
        }
      }),
      invalidatesTags: (result, error, { production_id }) => [
        { type: 'TransparencyDetails', id: production_id }
      ]
    }),

    // Buyer/retailer supplier documentation request (public, no auth)
    createBuyerDocRequest: build.mutation<BuyerDocRequestResponse, BuyerDocRequestPayload>({
      query: (requestData) => ({
        url: `/buyer_doc_requests/`,
        method: 'POST',
        body: requestData
      })
    })
  })
});

// Export hooks following Trazo conventions
export const {
  useGetTransparencyDetailsQuery,
  useVerifyBlockchainIntegrityQuery,
  useRecordTransparencyScanMutation,
  useCreateBuyerDocRequestMutation
} = transparencyQrApi;

export default transparencyQrApi;

// REMOVED 2026-08-04 — a self-created sustainability label, sitting in the CONSUMER API module.
//
// This file exported a complete grade ladder for consumer display: `getTransparencyBadgeColor`
// (90/70/50 colour bands), `getTransparencyMessage` ("Complete farm transparency ✨" …
// "Limited information available ❓"), `getTransparencyTrustIcon` (🏆/✅/👍/📋), and
// `isTrazoTransparencyCertified` — which returned true at >= 80 and called it a
// "Trazo transparency certification threshold".
//
// A score Trazo computes against a baseline Trazo invented, rendered to shoppers as a badge and
// the word "certified", is exactly the self-created sustainability label banned by EU ECGT
// 2024/825 (live 2026-09-27) and a general-benefit claim under FTC 16 CFR 260.6. The score was
// gated out of every consumer surface in June 2026 (see the producer-only strip in
// `history/transparency_views.py`), but these helpers survived here with zero call sites — one
// import away from putting it back. Dead code in the consumer module is not harmless.
//
// The score is a backend metric only. It had no producer screen even when this note claimed one
// (/admin/dashboard/farm/:id/transparency was always a redirect), and as of 2026-08-11 it has no
// producer surface at all — the last two, the parcel card's "avg score" and per-season "%", were
// retired with that page.
// Consumers get facts: documented-practice counts, photos, third-party certifications, timeline.
// Do not reintroduce a grade, badge, tier, or threshold on any consumer path.
//
// `formatCarbonScore` went with them (also unused; carbon is formatted at each render site).
