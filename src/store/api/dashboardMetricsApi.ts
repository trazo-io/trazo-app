import baseApi from './baseApi';

// TypeScript interface matching Django serializer
export interface EstablishmentDashboardMetrics {
  // Consumer engagement metrics
  consumer_reach: number;           // Unique consumers reached this month
  monthly_scans: number;           // Total QR scans this month  
  scan_growth_percentage: number;  // Month-over-month scan growth
  
  // Trust and verification metrics
  trust_score: number;             // Average confidence score (0-100%)
  verified_productions: number;    // Productions with carbon verification
  total_productions: number;       // Total productions in establishment
  
  // Performance metrics
  industry_percentile: number;     // Industry ranking percentile
  carbon_score: number;           // Average carbon score (1-5 stars)
  
  // Business impact metrics
  revenue_potential: number;       // Monthly carbon credit potential revenue
  
  // Subscription context
  subscription_usage_percentage: number; // Subscription limits usage %
  is_premium: boolean;            // Premium subscription status
}

export interface DashboardMetricsResponse {
  success: boolean;
  establishment_id: number;
  establishment_name: string;
  metrics: EstablishmentDashboardMetrics;
  calculated_at: string;
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
    })
  }),
  overrideExisting: false
});

export const {
  useGetEstablishmentDashboardMetricsQuery
} = dashboardMetricsApi;

export default dashboardMetricsApi;