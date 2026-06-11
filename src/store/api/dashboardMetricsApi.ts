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
  total_carbon_entries: number;
  total_verified_events: number;
  total_photos: number;
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
  data_completeness: number;
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

export interface FarmDashboardMetrics {
  // Consumer engagement
  consumer_reach: number;
  monthly_scans: number;
  scan_growth_percentage: number;
  // Transparency (PRIMARY)
  transparency_score: number;
  total_documented_events: number;
  // Production counts
  total_productions: number;
  blockchain_verified_count: number;
  // Score-tier label (non-comparative, derived from farm's own score)
  transparency_tier: 'excellent' | 'strong' | 'good' | 'solid' | 'developing';
  // Subscription
  subscription_usage_percentage: number;
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
      providesTags: (result, error, { farmId }) => [
        { type: 'Farm', id: farmId }
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
