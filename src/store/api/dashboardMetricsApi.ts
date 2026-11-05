import baseApi from './baseApi';

// TypeScript interfaces for comprehensive transparency dashboard
export interface FarmInfo {
  id: number;
  name: string;
  total_area_hectares: number;
  city: string;
  state: string;
  country: string;
  company?: {
    id: number;
    name: string;
    sustainability_commitments?: string;
  };
}

export interface TransparencyMetrics {
  overall_transparency_score: number;
  total_productions: number;
  transparency_breakdown: {
    [category: string]: {
      actual_count: number;
      photo_verified_count: number;
      photo_verification_rate: number;
      completeness_percentage: number;
      status: string;
      requires_photos: boolean;
    };
  };
  consumer_friendly_categories: {
    [category: string]: {
      consumer_name: string;
      transparency_level: string;
      photo_trust_message: string;
      verification_strength: string;
    };
  };
}

export interface ComprehensiveData {
  total_productions: number;
  // Corrected 2026-08-04 to match `company/views.py::_calculate_comprehensive_metrics()`, the
  // function that actually builds this object. It was missing 4 fields the establishment
  // dashboard reads off this exact interface (`total_events`, `active_productions`,
  // `completed_productions`, `transparency_percentage`) — TypeScript had nothing to check
  // those call sites against, so a backend rename here would have failed silently at runtime
  // (reading `undefined`, coerced to 0/[]) with zero compile-time warning.
  active_productions: number;
  completed_productions: number;
  total_carbon_entries: number;
  total_verified_events: number;
  total_photos: number;
  total_events: number;
  transparency_percentage: number;
  activity_breakdown: Record<string, number>;
  verification_status: {
    usda_factors_used: number;
    blockchain_verified: number;
    photo_verified: number;
  };
  missing_data_opportunities: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
    potential_improvement: string;
  }>;
  seasonal_patterns: Record<string, unknown>;
  data_completeness: number;
  carbon_intensity_per_hectare: number;
  trust_indicators_count: number;
}

export interface CarbonSummary {
  total_emissions: number;
  total_offsets: number;
  net_carbon: number;
  per_hectare: number;
  per_production: number;
  carbon_intensity_trend: number;
}

export interface CertifierReadinessFinding {
  label: string;
  // Stable key of the row (run 8, R8-27), so the card can name it in the reader's language.
  row_key?: string | null;
  // The sentence `detail` says, as a code, and the data behind it, so the card can write the
  // sentence in the reader's language (recordkeeping review F-01; every REVIEW/FAIL row since
  // 2026-10-08). `detail` stays the packet's English.
  detail_code?: string | null;
  params?: Record<string, unknown> | null;
  // REVIEW = the record exists but needs attention. FAIL = a required record appears missing.
  // Both describe the RECORD in Trazo — the certifying agent makes the compliance decision.
  status: 'REVIEW' | 'FAIL';
  detail: string;
  // Which section of the audit export carries the full evidence, when the row is not PASS.
  section_hint: string | null;
}

export interface CertifierReadiness {
  establishment_id: number;
  // null when the farm has no productions at all.
  production: {
    id: number;
    name: string | null;
    finish_date: string | null;
    is_finished: boolean;
    // The season's parcel, so a row can link to the production page holding the record.
    parcel_id?: number | null;
  } | null;
  findings: CertifierReadinessFinding[];
  outstanding_count: number;
  // How many compliance rows were evaluated (findings are the non-PASS subset).
  checked_count: number;
}

export interface FarmDashboardMetrics {
  // QR page, rolling last 30 days. `consumer_reach` is null when scans carry no session or IP
  // fingerprint: the visitor count is unknown and is never estimated (2026-11-05).
  consumer_reach: number | null;
  monthly_scans: number;
  // Finished seasons, published or not: a COUNT. The farm-level `transparency_score` average and
  // its `transparency_tier` label left this payload on 2026-09-05 (nothing rendered them).
  scored_productions: number;
  total_documented_events: number;
  // Images in the albums of those activities (season albums excluded).
  photo_count?: number;
  total_productions: number;
  // Seasons with no finish date yet.
  productions_in_progress: number;
  // Removed 2026-11-05 with the farm-home card rebuild: scan_growth_percentage,
  // blockchain_verified_count, subscription_usage_percentage.
}

export interface DashboardMetricsResponse {
  success: boolean;
  establishment_id: number;
  establishment_name: string;
  metrics: FarmDashboardMetrics;
  calculated_at: string;
}

// Actual nested response structure (matches API response)
export interface ComprehensiveDashboardResponse {
  establishment: FarmInfo;
  transparency_metrics: TransparencyMetrics;
  comprehensive_data: ComprehensiveData;
  carbon_summary?: CarbonSummary;
  optimization_metadata?: {
    query_count: number;
    load_time_ms: number;
    data_completeness_percentage: number;
    cache_enabled: boolean;
    indexes_used: string[];
  };
}

const dashboardMetricsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getFarmDashboardMetrics: build.query<
      DashboardMetricsResponse,
      { companyId: number; farmId: number }
    >({
      query: ({ companyId, farmId }) => ({
        url: `/companies/${companyId}/establishments/${farmId}/dashboard_metrics/`,
        method: 'GET',
        credentials: 'include'
      }),
      // Also History and Event: finishing a season or logging an activity invalidates those (not
      // Farm), and the farm-home header's counts sit right above a seasons list that does refetch
      // on them. Without these the two disagree until the next poll (review of #286).
      providesTags: (result, error, { farmId }) => [
        { type: 'Farm', id: farmId },
        'History',
        'Event'
      ]
    }),
    getFarmComprehensiveDashboard: build.query<
      ComprehensiveDashboardResponse,
      { companyId: number; farmId: number }
    >({
      query: ({ companyId, farmId }) => ({
        url: `/companies/${companyId}/establishments/${farmId}/dashboard_comprehensive/`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, { farmId }) => [
        { type: 'Farm', id: farmId },
        { type: 'TransparencyData', id: farmId }
      ]
    }),
    // Phase 4 — farmer ROI card: scans trend, engagement, reviews, cert views.
    getFarmRoiSummary: build.query<RoiSummary, { farmId: number }>({
      query: ({ farmId }) => ({
        url: `/public_scans/roi_summary/?establishment_id=${farmId}`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, { farmId }) => [{ type: 'Farm', id: farmId }]
    }),
    // Outstanding items a certifier would query, for the farm's most recent season.
    // Same rows page 1 of the NOP audit PDF prints, so the dashboard and the certifier packet
    // cannot disagree. Tag id is namespaced so routine `Farm` invalidation does not evict it.
    getCertifierReadiness: build.query<
      CertifierReadiness,
      { companyId: number | string; farmId: number }
    >({
      query: ({ companyId, farmId }) => ({
        url: `/companies/${companyId}/establishments/${farmId}/certifier-readiness/`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, { farmId }) => [{ type: 'Farm', id: `certifier-${farmId}` }]
    }),
    // Phase 4 — buyer documentation requests (leads) for the dashboard.
    getBuyerDocRequests: build.query<BuyerDocRequestLead[], { farmId: number }>({
      query: ({ farmId }) => ({
        url: `/buyer_doc_requests/?establishment_id=${farmId}`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, { farmId }) => [{ type: 'Farm', id: `leads-${farmId}` }]
    }),
    updateBuyerDocRequestStatus: build.mutation<
      BuyerDocRequestLead,
      { leadId: number; status: 'new' | 'contacted' | 'closed'; farmId: number }
    >({
      query: ({ leadId, status }) => ({
        url: `/buyer_doc_requests/${leadId}/`,
        method: 'PATCH',
        credentials: 'include',
        body: { status }
      }),
      invalidatesTags: (result, error, { farmId }) => [{ type: 'Farm', id: `leads-${farmId}` }]
    })
  }),
  overrideExisting: false
});

export interface RoiSummary {
  scans_30d: number;
  scans_prev_30d: number;
  mom_change_pct: number | null;
  engaged_rate_pct: number;
  reviews_count: number;
  reviews_30d: number;
  average_rating: number | null;
  has_verified_certification: boolean;
  certification_views_30d: number;
  total_scans_all_time: number;
  generated_at: string;
}

export interface BuyerDocRequestLead {
  id: number;
  production_public_id: string;
  production_name: string;
  product_name: string | null;
  lot_id: string | null;
  requester_name: string;
  requester_email: string;
  organization: string;
  message: string;
  status: 'new' | 'contacted' | 'closed';
  created_at: string;
}

export const {
  useGetFarmDashboardMetricsQuery,
  useGetFarmComprehensiveDashboardQuery,
  useGetCertifierReadinessQuery,
  useGetFarmRoiSummaryQuery,
  useGetBuyerDocRequestsQuery,
  useUpdateBuyerDocRequestStatusMutation
} = dashboardMetricsApi;

// Backward-compat aliases for renamed hooks
/** @deprecated Use useGetFarmDashboardMetricsQuery instead */
export const useGetEstablishmentDashboardMetricsQuery = useGetFarmDashboardMetricsQuery;
/** @deprecated Use useGetFarmComprehensiveDashboardQuery instead */
export const useGetEstablishmentComprehensiveDashboardQuery = useGetFarmComprehensiveDashboardQuery;

// Backward-compat type aliases
/** @deprecated Use FarmInfo instead */
export type EstablishmentInfo = FarmInfo;
/** @deprecated Use FarmDashboardMetrics instead */
export type EstablishmentDashboardMetrics = FarmDashboardMetrics;

export default dashboardMetricsApi;
