/**
 * Consumer-specific API endpoints for dynamic dashboard data
 */
import { baseApi } from './baseApi';

// Types for consumer API responses
export interface UserImpactSummary {
  total_scans: number;
  total_reviews: number;
  total_carbon_offset_kg: number;
  miles_driving_offset: number;
  trees_equivalent: number;
  sustainable_farms_found: number;
  local_farms_found: number;
  better_choices_made: number;
  achievements_earned: string[];
  current_level: number;
  points_earned: number;
  first_scan_date?: string;
  last_scan_date?: string;
}

export interface EnhancedScan {
  id: number;
  production_id: number; // History.id for navigation links (not HistoryScan.id)
  product_name: string;
  farm_name: string;
  location: string;
  // Transparency-first fields
  transparency_score?: number;
  events_viewed?: number;
  // Carbon fields (secondary). `carbon_score` (an A+-to-F grade) was removed from the API on
  // 2026-08-04 — a self-created sustainability label, with thresholds attributed to the USDA.
  // `carbon_footprint` is the measured amount, e.g. "1.23 kg CO₂e" (NOT per kg — see
  // backend/constants.format_carbon_amount).
  carbon_footprint: string;
  carbon_saved: string;
  sustainability_practices: string[];
  is_verified: boolean;
  is_favorite: boolean;
  date: string;
  comment?: string;
}

export interface ProductComparison {
  /** The API identifies productions by public_id; the internal pk is not exposed. */
  public_id: string;
  name: string;
  farm: string;
  location: string;
  /** Formatted measurement, e.g. "1.23 kg CO₂e". */
  carbon_footprint: string;
  /** The raw number the comparison ranks on; null when the production has no carbon entry. */
  carbon_kg_co2e: number | null;
  farming_method: string;
  certifications: string[];
  // Removed with the backend fields that never existed in the response: carbon_score (A+-to-F
  // grade), price, distance, sustainability_rating.
}

export interface UserFavorite {
  id: number;
  production_id: number;
  product_name: string;
  farm_name: string;
  location: string;
  carbon_footprint: string;
  created_at: string;
}

export interface ShoppingGoal {
  id: number;
  goal_type: string;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  unit: string;
  start_date: string;
  target_date: string;
  status: string;
  progress_percentage: number;
  is_completed: boolean;
  days_remaining: number;
}

export interface ImpactDashboardResponse {
  impact_metrics: UserImpactSummary;
  recent_scans: EnhancedScan[];
  quick_stats: {
    better_choices: number;
    local_farms: number;
    favorite_count: number;
  };
  recommendations: Array<{
    name: string;
    description: string;
    sustainability_focus: string;
  }>;
  achievements: Array<{
    title: string;
    description: string;
    icon: string;
    earned_date: string;
  }>;
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

export interface ProductComparisonResponse {
  comparison_id?: number;
  products: ProductComparison[];
  comparison_summary: {
    /** Lowest recorded CO₂e across the compared productions; null when none have carbon data. */
    lowest_carbon_kg_co2e: number | null;
    lowest_carbon_footprint: string | null;
    total_products: number;
    epa_usda_sourced_products: number;
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
        is_favorite?: boolean;
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

    // Product Comparison
    compareProducts: builder.mutation<
      ProductComparisonResponse,
      {
        products: number[];
      }
    >({
      query: (data) => ({
        url: 'consumer/dashboard/compare_products/',
        method: 'POST',
        body: data
      })
    }),

    // User Favorites
    getUserFavorites: builder.query<UserFavorite[], void>({
      query: () => ({
        url: 'consumer/favorites/',
        method: 'GET'
      }),
      providesTags: ['UserFavorites']
    }),

    addFavorite: builder.mutation<UserFavorite, { production_id: number }>({
      query: (data) => ({
        url: 'consumer/favorites/',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['UserFavorites', 'ConsumerHistory']
    }),

    toggleFavorite: builder.mutation<
      {
        is_favorite: boolean;
        message: string;
      },
      { production_id: number }
    >({
      query: (data) => ({
        url: 'consumer/favorites/toggle_favorite/',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['UserFavorites', 'ConsumerHistory']
    }),

    removeFavorite: builder.mutation<void, number>({
      query: (id) => ({
        url: `consumer/favorites/${id}/`,
        method: 'DELETE'
      }),
      invalidatesTags: ['UserFavorites', 'ConsumerHistory']
    }),

    // Shopping Goals
    getShoppingGoals: builder.query<ShoppingGoal[], void>({
      query: () => ({
        url: 'consumer/goals/',
        method: 'GET'
      }),
      providesTags: ['ShoppingGoals']
    }),

    createShoppingGoal: builder.mutation<ShoppingGoal, Partial<ShoppingGoal>>({
      query: (data) => ({
        url: 'consumer/goals/',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['ShoppingGoals']
    }),

    updateShoppingGoal: builder.mutation<
      ShoppingGoal,
      {
        id: number;
        data: Partial<ShoppingGoal>;
      }
    >({
      query: ({ id, data }) => ({
        url: `consumer/goals/${id}/`,
        method: 'PATCH',
        body: data
      }),
      invalidatesTags: ['ShoppingGoals']
    }),

    deleteShoppingGoal: builder.mutation<void, number>({
      query: (id) => ({
        url: `consumer/goals/${id}/`,
        method: 'DELETE'
      }),
      invalidatesTags: ['ShoppingGoals']
    }),

    // Enhanced existing APIs for consumer use
    getUserProductionScansEnhanced: builder.query<
      EnhancedScan[],
      {
        include_carbon_data?: boolean;
        include_farmer_info?: boolean;
        include_favorites?: boolean;
        limit?: number;
      }
    >({
      query: (params) => ({
        url: 'histories/my_scans/',
        method: 'GET',
        params: {
          include_carbon_data: true,
          include_farmer_info: true,
          include_favorites: true,
          ...params
        }
      }),
      providesTags: ['UserScans']
    }),

    // Update user impact (called after scans)
    updateUserImpact: builder.mutation<
      UserImpactSummary,
      {
        carbon_saved_kg: number;
        is_better_choice?: boolean;
        is_local?: boolean;
      }
    >({
      query: (data) => ({
        url: 'consumer/dashboard/update_impact/',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['ConsumerImpact']
    }),

    // Get personalized recommendations
    getPersonalizedRecommendations: builder.query<
      Array<{
        type: string;
        title: string;
        description: string;
        products?: ProductComparison[];
      }>,
      void
    >({
      query: () => ({
        url: 'consumer/dashboard/recommendations/',
        method: 'GET'
      }),
      providesTags: ['ConsumerRecommendations']
    }),

    // Analytics for insights
    getConsumerAnalytics: builder.query<
      {
        weekly_scans: number[];
        monthly_carbon_saved: number[];
        top_categories: Array<{ name: string; count: number }>;
        sustainability_trends: Array<{ date: string; score: number }>;
      },
      {
        period?: 'week' | 'month' | 'year';
      }
    >({
      query: (params) => ({
        url: 'consumer/dashboard/analytics/',
        method: 'GET',
        params: params
      }),
      providesTags: ['ConsumerAnalytics']
    })
  })
});

// Export hooks for components
export const {
  useGetImpactDashboardQuery,
  useGetShoppingHistoryQuery,
  useCompareProductsMutation,
  useGetUserFavoritesQuery,
  useAddFavoriteMutation,
  useToggleFavoriteMutation,
  useRemoveFavoriteMutation,
  useGetShoppingGoalsQuery,
  useCreateShoppingGoalMutation,
  useUpdateShoppingGoalMutation,
  useDeleteShoppingGoalMutation,
  useGetUserProductionScansEnhancedQuery,
  useUpdateUserImpactMutation,
  useGetPersonalizedRecommendationsQuery,
  useGetConsumerAnalyticsQuery
} = consumerApi;
