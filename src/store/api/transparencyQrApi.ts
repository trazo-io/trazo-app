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

// IMMEDIATE LOAD (2 seconds) - Most critical consumer info
export interface TransparencyQuickView {
  // Owner-only: stripped entirely for anonymous callers (claim safety), so treat as optional.
  transparency_score?: {
    percentage: number;
    message: string;
    // `status` removed 2026-08-02 — it carried the invented benchmark level
    // ("certification"/"minimum"/"below_minimum"). Nothing rendered it.
  };
}

// STANDARD LOAD (10 seconds) - Core transparency details
export interface TransparencyStandardView {
  transparency_details: {
    completeness_score: number;
    actual_events: number;
    expected_events: number;
    farming_approach: 'organic' | 'conventional' | 'biodynamic';
    category_breakdown: {
      [category: string]: {
        actual_count: number;
        expected_count: number;
        completeness_percentage: number;
        status: 'excellent' | 'good' | 'partial' | 'limited';
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

// DETAILED LOAD (30+ seconds) - Deep insights for engaged consumers
export interface TransparencyDetailedView {
  transparency_insights: {
    current_score: number;
    recommendations: string[];
    missing_categories: Array<{
      category: string;
      status: string;
      suggestion: string;
    }>;
    strong_categories: string[];
  };
  // Replaced `benchmark_comparison` / `improvement_suggestions` (2026-08-02). Those described
  // hardcoded "industry_minimum 60 / certification_standard 90" thresholds that Trazo invented;
  // progress is now measured only against the farm's own previous finished seasons.
  // Owner-only — the backend computes it just for the owner and drops the whole detailed_view
  // for anonymous callers, so it is absent on a consumer scan.
  own_history_comparison?: {
    current_score: number;
    previous_best: number | null;
    previous_seasons_scored: number;
    delta_vs_previous_best: number | null;
    is_personal_best: boolean;
  } | null;
  verification_status: {
    organic_certified: boolean;
    third_party_audited: boolean;
    blockchain_verified: boolean;
    transparency_verified: boolean;
  };
  data_quality_indicators: {
    last_updated?: string;
    data_freshness: 'very_fresh' | 'fresh' | 'recent' | 'archived' | 'ongoing';
    completeness_trend: string;
  };
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
  detailed_view: TransparencyDetailedView;
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

// Consumer education content
export interface TransparencyExplanation {
  title: string;
  overview: string;
  scoring_levels: {
    [key: string]: {
      range: string;
      description: string;
      consumer_message: string;
    };
  };
  why_transparency_matters: string[];
  what_we_track: string[];
  carbon_vs_transparency: {
    carbon_score: string;
    transparency_score: string;
    together: string;
  };
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
    getTransparencyDetails: build.query<TransparencyResponse, string>({
      query: (productionId) => ({
        url: `/transparency/${productionId}/`,
        method: 'GET'
      }),
      providesTags: (result, error, id) => [{ type: 'TransparencyDetails', id }]
    }),

    // Consumer education about transparency scoring
    getTransparencyExplanation: build.query<TransparencyExplanation, void>({
      query: () => ({
        url: `/transparency/explanation/`,
        method: 'GET'
      }),
      providesTags: [{ type: 'TransparencyExplanation', id: 'explanation' }]
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
      invalidatesTags: (result, error, { production_id }) => [{ type: 'TransparencyDetails', id: production_id }]
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
  useGetTransparencyExplanationQuery,
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
// The score is a producer-dashboard metric only. It lives at /admin/dashboard/farm/:id/transparency.
// Consumers get facts: documented-practice counts, photos, third-party certifications, timeline.
// Do not reintroduce a grade, badge, tier, or threshold on any consumer path.
//
// `formatCarbonScore` went with them (also unused; carbon is formatted at each render site).
