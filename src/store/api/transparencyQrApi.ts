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
  transparency_score: {
    percentage: number;
    message: string;
    status: 'excellent' | 'certification' | 'good' | 'minimum' | 'below_minimum';
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
  benchmark_comparison: {
    benchmark_level: 'excellent' | 'certification' | 'good' | 'minimum' | 'below_minimum';
    message: string;
    benchmarks: {
      industry_minimum: number;
      good_practice: number;
      excellent_practice: number;
      certification_standard: number;
    };
    current_score: number;
    next_target: {
      target_score: number;
      target_name: string;
      points_needed: number;
    };
  };
  improvement_suggestions: object;
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

// Lightweight mobile summary for ultra-fast loading
export interface TransparencySummary {
  farm_name: string;
  product_name: string;
  transparency: {
    percentage: number;
    message: string;
    level: 'excellent' | 'good' | 'basic';
  };
  carbon: {
    kg_per_kg: number;
  };
  scan_timestamp: string;
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
    // Ultra-fast mobile summary (< 1 second target)
    getTransparencySummary: build.query<TransparencySummary, string>({
      query: (productionId) => ({
        url: `/transparency/${productionId}/summary/`,
        method: 'GET'
      }),
      providesTags: (result, error, id) => [{ type: 'TransparencySummary', id }]
    }),

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
      invalidatesTags: (result, error, { production_id }) => [
        { type: 'TransparencySummary', id: production_id },
        { type: 'TransparencyDetails', id: production_id }
      ]
    })
  })
});

// Export hooks following Trazo conventions
export const {
  useGetTransparencySummaryQuery,
  useGetTransparencyDetailsQuery,
  useGetTransparencyExplanationQuery,
  useVerifyBlockchainIntegrityQuery,
  useRecordTransparencyScanMutation
} = transparencyQrApi;

export default transparencyQrApi;

// Utility functions for transparency display

/**
 * Get Trazo-branded transparency badge color following design system
 */
export const getTransparencyBadgeColor = (percentage: number): string => {
  if (percentage >= 90) return 'green.500'; // Excellent - Trazo primary green
  if (percentage >= 70) return 'green.400'; // Good - Lighter green
  if (percentage >= 50) return 'yellow.500'; // Basic - Warning yellow
  return 'gray.500'; // Limited - Neutral gray
};

/**
 * Get consumer-friendly transparency message following Trazo voice
 */
export const getTransparencyMessage = (percentage: number): string => {
  if (percentage >= 95) return 'Complete farm transparency ✨';
  if (percentage >= 85) return 'Comprehensive farm record 🌟';
  if (percentage >= 70) return 'Good record keeping 📋';
  if (percentage >= 50) return 'Basic farm information 📝';
  return 'Limited information available ❓';
};

/**
 * Get trust indicator emoji following Trazo visual language
 */
export const getTransparencyTrustIcon = (status: string): string => {
  switch (status) {
    case 'excellent':
      return '🏆';
    case 'certification':
      return '✅';
    case 'good':
      return '👍';
    case 'minimum':
      return '📋';
    default:
      return '❓';
  }
};

/**
 * Format carbon score for consumer display (Trazo standard)
 */
export const formatCarbonScore = (kgPerKg: number): string => {
  return `${kgPerKg.toFixed(2)} kg CO₂ per kg`;
};

/**
 * Check if farm qualifies for Trazo Transparency Certification
 */
export const isTrazoTransparencyCertified = (percentage: number): boolean => {
  return percentage >= 80; // Trazo transparency certification threshold
};
