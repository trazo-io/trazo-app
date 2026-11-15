/**
 * Consumer-specific API endpoints for dynamic dashboard data.
 *
 * Favorites, shopping goals and compare_products left with their backend routes and models
 * (trazo-back history 0254, 2026-11-09); no screen called them. update_impact, recommendations
 * and analytics were removed with them: the backend never had those routes.
 *
 * The impact dashboard is counted live since 2026-11-10 (trazo-back history 0256 retires
 * UserImpactSummary). Its offset, miles, trees, points, level and achievements fields, and the
 * response's `recommendations` and `achievements`, left the payload; no screen rendered them.
 */
import { baseApi } from './baseApi';

// Types for consumer API responses
/** The signed-in shopper's own counts. Never a verdict on a farm. */
export interface ConsumerImpactMetrics {
  total_scans: number;
  verified_farms_scanned: number;
  farming_events_viewed: number;
  /** Distinct scanned productions with at least one recorded activity a shopper is served. */
  documented_products: number;
}

export interface EnhancedScan {
  id: number;
  production_public_id: string; // History.public_id, for the consumer page link
  product_name: string;
  farm_name: string;
  location: string;
  // Transparency-first fields.
  // `transparency_score` was removed from this type on 2026-08-06. The score is retired as a
  // concept; typing it here is what let the consumer Discover page render it as a hero metric
  // ("Avg Transparency Score") and the journey list render it as a percentage badge — the
  // self-created sustainability label ECGT 2024/825 bans (live 2026-09-27). Consumer surfaces
  // carry documented COUNTS, not a number Trazo assigned to a farm. Do not re-add it; the
  // guard in views/Scan/__tests__/noScoreOnConsumer.test.ts now covers these screens.
  events_viewed: number;
  // Carbon fields (secondary). `carbon_score` (an A+-to-F grade) was removed from the API on
  // 2026-08-04 — a self-created sustainability label, with thresholds attributed to the USDA.
  // `carbon_footprint` is the measured amount, e.g. "1.23 kg CO₂e" (NOT per kg — see
  // backend/constants.format_carbon_amount).
  carbon_footprint: string;
  carbon_saved: string;
  sustainability_practices: string[];
  is_verified: boolean;
  date: string;
  comment?: string;
}

export interface ImpactDashboardResponse {
  impact_metrics: ConsumerImpactMetrics;
  recent_scans: EnhancedScan[];
  quick_stats: {
    documented_products: number;
  };
}

export interface ShoppingHistoryResponse {
  scans: EnhancedScan[];
  pagination: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
  };
  summary: {
    total_scans: number;
    date_range: {
      earliest: string;
      latest: string;
    };
    farms_scanned: number;
  };
}

// Consumer API endpoints
export const consumerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Impact Dashboard
    getImpactDashboard: builder.query<ImpactDashboardResponse, void>({
      query: () => ({
        url: 'consumer/dashboard/impact_dashboard/',
        method: 'GET'
      }),
      providesTags: ['ConsumerImpact']
    }),

    // Shopping History with filtering
    getShoppingHistory: builder.query<
      ShoppingHistoryResponse,
      {
        date_from?: string;
        date_to?: string;
        page?: number;
        page_size?: number;
      }
    >({
      query: (params) => ({
        url: 'consumer/dashboard/shopping_history/',
        method: 'GET',
        params: params
      }),
      providesTags: ['ConsumerHistory']
    }),

    // Enhanced existing APIs for consumer use
    getUserProductionScansEnhanced: builder.query<
      EnhancedScan[],
      {
        include_carbon_data?: boolean;
        include_farmer_info?: boolean;
        limit?: number;
      }
    >({
      query: (params) => ({
        url: 'productions/my_scans/',
        method: 'GET',
        params: {
          include_carbon_data: true,
          include_farmer_info: true,
          ...params
        }
      }),
      providesTags: ['UserScans']
    })
  })
});

// Export hooks for components
export const {
  useGetImpactDashboardQuery,
  useGetShoppingHistoryQuery,
  useGetUserProductionScansEnhancedQuery
} = consumerApi;
