import baseApi from './baseApi';

// TypeScript interfaces for comprehensive transparency dashboard
export interface EstablishmentInfo {
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

export interface EstablishmentDashboardMetrics {
  // Legacy interface for basic metrics compatibility
  consumer_reach: number;
  monthly_scans: number;
  scan_growth_percentage: number;
  transparency_score: number;
  trust_score: number;
  verified_productions: number;
  total_productions: number;
  carbon_intensity: number;
  carbon_reduction_trend: number;
}

export interface DashboardMetricsResponse {
  success: boolean;
  establishment_id: number;
  establishment_name: string;
  metrics: EstablishmentDashboardMetrics;
  calculated_at: string;
}

// Actual nested response structure (matches API response)
export interface ComprehensiveDashboardResponse {
  establishment: EstablishmentInfo;
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
    getEstablishmentDashboardMetrics: build.query<
      DashboardMetricsResponse,
      { companyId: number; establishmentId: number }
    >({
      query: ({ companyId, establishmentId }) => ({
        url: `/companies/${companyId}/establishments/${establishmentId}/dashboard_metrics/`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, { establishmentId }) => [
        { type: 'Establishment', id: establishmentId }
      ]
    }),
    getEstablishmentComprehensiveDashboard: build.query<
      ComprehensiveDashboardResponse,
      { companyId: number; establishmentId: number }
    >({
      query: ({ companyId, establishmentId }) => ({
        url: `/companies/${companyId}/establishments/${establishmentId}/dashboard_comprehensive/`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, { establishmentId }) => [
        { type: 'Establishment', id: establishmentId },
        { type: 'TransparencyData', id: establishmentId }
      ]
    })
  }),
  overrideExisting: false
});

export const {
  useGetEstablishmentDashboardMetricsQuery,
  useGetEstablishmentComprehensiveDashboardQuery
} = dashboardMetricsApi;

export default dashboardMetricsApi;
