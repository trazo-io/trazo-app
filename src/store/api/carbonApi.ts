import { baseApi } from './baseApi';

export interface CarbonSummary {
  establishment_id?: string;
  year?: number;
  total_emissions: number;
  total_offsets: number;
  net_carbon: number;
  // No carbon_score: the backend stops serving it (trazo-back, retire carbon score on live
  // endpoints) and nothing here read it.
  entries_count?: {
    emissions: number;
    offsets: number;
    total: number;
  };
  has_data?: boolean;
  recent_entries?: Array<{
    id: number;
    type: 'emission' | 'offset';
    amount: number;
    source: string;
    date: string;
  }>;
  calculated_at?: string;
  data_source?: string;
  // Emissions breakdown data
  emissionsByCategory?: Record<string, number>;
  emissionsBySource?: Record<string, number>;
  offsetsByAction?: Record<string, number>;
  // Legacy camelCase fields for backward compatibility
  totalEmissions?: number;
  totalOffsets?: number;
  netFootprint?: number;
  carbonScore?: number;
  badges?: Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
    isVerified: boolean;
  }>;
}

export interface CarbonBenchmark {
  cropType: string;
  benchmarkValue: number; // kg CO2e/kg
  source: string;
  year: number;
}

export interface CarbonRecommendation {
  id: string;
  title: string;
  description: string;
  potentialSavings: number;
  implementationCost: number;
  paybackPeriod: number; // in months
  category: 'energy' | 'water' | 'waste' | 'soil' | 'equipment';
}

export interface CarbonEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'planting' | 'harvesting' | 'weather' | 'chemical' | 'general';
  carbonImpact: number;
  photos?: string[];
}

export interface EventApproval {
  data_point_id: number;
  event_data: {
    type: 'emission' | 'offset';
    source: string;
    amount: number;
    description: string;
  };
}

export interface EventRejection {
  data_point_id: number;
  reason?: string;
}

export interface CarbonCalculationResult {
  co2e: number;
  efficiency_score: number;
  usda_factors_used: boolean;
  calculation_method: string;
  event_type:
    | 'chemical'
    | 'production'
    | 'weather'
    | 'general'
    | 'equipment'
    | 'soil_management'
    | 'business'
    | 'pest_management';
  timestamp: string;
  breakdown?: {
    // Chemical application fields
    nitrogen_emissions?: number;
    phosphorus_emissions?: number;
    potassium_emissions?: number;
    application_efficiency?: number;
    volume_applied_liters?: number;
    area_treated_hectares?: number;
    application_method?: string;
    manufacturing_emissions_kg_co2e?: number;
    application_emissions_kg_co2e?: number;
    npk_content?: {
      N?: number;
      P?: number;
      K?: number;
    };
    nitrogen_kg?: number;
    phosphorus_kg?: number;
    potassium_kg?: number;

    // Production event fields (diesel-based: planting, harvesting, etc.)
    production_activity?: string;
    area_covered_acres?: number;
    area_covered_hectares?: number;
    diesel_emission_factor_kg_per_gallon?: number;
    usda_planting_factor_gallons_per_hectare?: number;
    calculation_basis?: string;
    confidence_level?: number;
    actual_fuel_consumed_gallons?: number;
    equipment_hours?: number;

    // Irrigation event fields (electricity-based)
    water_volume_gallons?: number;
    kwh_consumed?: number;
    electricity_emission_factor_kg_per_kwh?: number;
    pump_efficiency_kwh_per_1000_gallons?: number;

    // Legacy fields for backward compatibility
    volume_liters?: number;
    area_hectares?: number;
    fuel_amount?: number;
    fuel_type?: string;
    equipment_type?: string;
    carbon_sequestration?: number;
    carbon_release?: number;
    soil_ph?: number;
    organic_matter?: number;
    transport_emissions?: number;
    carbon_credits?: number;
    revenue_impact?: number;
    chemical_avoidance?: number;
    monitoring_emissions?: number;
    pest_pressure?: string;
  };
  cost_analysis?: {
    estimated_cost: number;
    cost_per_co2e: number;
  };
  recommendations?: Array<{
    type: string;
    title: string;
    description: string;
    potential_savings: number;
    carbon_reduction: number;
  }>;
  error?: string;
  warning?: string;
}

export interface EventCarbonCalculationRequest {
  event_type:
    | 'chemical'
    | 'production'
    | 'weather'
    | 'general'
    | 'equipment'
    | 'soil_management'
    | 'business'
    | 'pest_management';
  event_data: Record<string, any>;
}

// Phase 2 Optimization: Unified Complete Summary Interface
export interface CompleteSummary {
  // Essential product info
  product: {
    id: string;
    name: string;
    reputation: number;
  };

  // Production dates
  start_date?: string;
  finish_date?: string;

  // Harvest details for consumer display
  harvestDetails?: {
    amount?: number;
    unit?: string;
    lot_number?: string;
    quality_grade?: string;
    harvest_method?: string;
  };

  // Carbon metrics
  carbonScore: number;
  totalEmissions: number;
  totalOffsets: number;
  netFootprint: number;
  relatableFootprint: string;
  industryPercentile: number;
  industryAverage: number;
  isUsdaVerified: boolean;
  cropType: string;
  benchmarkSource: string;

  // Emissions breakdown
  emissionsByCategory: Record<string, number>;
  emissionsBySource: Record<string, number>;
  offsetsByAction: Record<string, number>;

  // Production timeline (combined events)
  timeline: Array<{
    id: string;
    type: string;
    description: string;
    observation: string;
    date: string;
    certified: boolean;
    // MVP Photo Verification: Tiered verification levels
    verification_level?:
      | 'self_reported'
      | 'photo_documented'
      | 'photo_verified'
      | 'data_verified'
      | 'certified';
    photo_verified_count?: number;
    index: number;
    volume?: number;
    concentration?: number;
    area?: number;
    equipment?: string;
    // Transparency fields for production events (formatted strings with units)
    area_covered?: string;
    yield_quantity?: string;
    fuel_consumed?: string;
    equipment_hours?: string;
    // Raw numeric values for calculations
    area_covered_numeric?: number;
    yield_quantity_numeric?: number;
    fuel_consumed_numeric?: number;
    equipment_hours_numeric?: number;
    // Production-specific fields
    operation_type?: string;
    production_type?: string;
    production_name?: string;
    // Chemical-specific fields
    commercial_name?: string;
    chemical_name?: string;
    npk_n_percentage?: number;
    npk_p_percentage?: number;
    npk_k_percentage?: number;
    npk_ratio?: string;
    // Additional transparency fields
    weather_conditions?: string;
    application_timing?: string;
    target_pest_disease?: string;
    application_method?: string;
    active_ingredient?: string;
    area_unit?: string;
    yield_unit?: string;
    fuel_unit?: string;
    volume_unit?: string;
    // Image albums
    albums?: Array<{
      id: number;
      title: string;
      image_url: string;
    }>;
  }>;
  production_events: Array<any>; // Alias for compatibility
  events: Array<any>; // Alias for compatibility

  // Establishment info (from history data)
  farmer: {
    id: string;
    name: string;
    description: string;
    location: string;
    photo?: string;
    certifications: string[];
    email: string;
    phone: string;
  };
  establishment: any; // Alias for history API compatibility

  // Map data (from history API)
  parcel: {
    id: string;
    name: string;
    area?: number;
    polygon: any;
    map_metadata: any;
    agricultural_details?: Record<string, any>; // Agricultural data from parcel form
    establishment?: {
      id: string;
      name: string;
      description: string;
      location: string;
      photo?: string;
    };
  } | null;

  // Images
  images?: Array<{
    id: string;
    image: string;
    name: string;
  }>;

  // Similar products
  similar_products: Array<{
    id: string;
    product: { name: string };
    reputation: number;
    image?: string;
  }>;
  similar_histories: Array<any>; // Alias for history API compatibility

  // Scan tracking
  history_scan: string;

  // Sustainability features
  recommendations: string[];
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    color?: string;
  }>;
  reports?: Array<{
    id: string;
    period_start: string;
    period_end: string;
    total_emissions: number;
    total_offsets: number;
    net_footprint: number;
    document: string | null;
    report_type: string;
  }>;
  blockchainVerification: {
    verified: boolean;
    transaction_hash?: string;
    verification_date: string;
    certifying_body: string;
    error?: string;
  };
  socialProof: {
    totalScans: number;
    reviewsCount: number;
    totalOffsets: number;
    totalUsers: number;
    averageRating: number;
    companyScans: number;
  };

  // Metadata
  verificationDate: string;
  cache_hit: boolean;
  timestamp: string;
  api_version: string;
}

export interface CropTemplate {
  id: string;
  template_id?: number; // New field for actual template ID
  name: string;
  crop_type: string;
  crop_type_name?: string; // New field for display name
  description: string;
  events_count: number;
  carbon_potential: number;
  usage_count: number;
  carbon_benchmark: {
    emissions_range: string;
    industry_average: number;
    best_practice: number;
  };
  events_preview: Array<{
    name: string;
    type: string;
    timing: string;
    carbon_impact: number;
  }>;
  sustainability_practices: string[];
  // `avg_revenue`, `roi_projection` and `is_verified` were removed from the payload on
  // 2026-08-19: hardcoded literals ("10-25%" premium pricing, revenue identical for every
  // crop) and a boolean named "verified" derived from `usda_reviewed`. Nothing rendered
  // them, nothing could have measured them, and .claude/rules/compliance.md rules out both
  // pricing promises and "USDA Verified".
  system_type?: string;
  management_intensity?: string;
  source?: string;
}

export interface CropTemplatesResponse {
  templates: CropTemplate[];
  total_count: number;
  categories: string[];
  metadata: {
    generated_at?: string;
    version: string;
    source: string;
  };
}

export interface CompanyCropOption {
  id: string;
  name: string;
  description: string;
  region: string;
  carbon_benchmark: string;
  carbon_per_hectare: number;
  season_length: string;
  market_demand: 'High' | 'Medium' | 'Low';
  transparency_ready: boolean;
  usda_factors_used: boolean;
  avg_revenue: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  common_events: string[];
}

export interface CompanyCropOptionsResponse {
  crops: CompanyCropOption[];
  smart_benefits: string[];
  metadata: {
    source: string;
    mvp_ready: boolean;
    last_updated: string;
    version: string;
  };
}

export interface CropTemplateDetail {
  id: string;
  template_id?: number; // New field for actual template ID
  name: string;
  description: string;
  crop_type: string;
  crop_type_name?: string; // New field for display name
  events: Array<{
    id?: number; // New field for event ID
    name: string;
    event_type?: string; // More specific field name
    type: string;
    timing: string;
    frequency?: string;
    carbon_sources: string[];
    typical_amount: number | any; // Can be object
    carbon_impact: number;
    cost_estimate: number;
    labor_hours?: number; // New field
    efficiency_tips: string;
    order_sequence?: number; // New field
    usda_practice_code?: string; // New field
    is_required?: boolean; // New field
    /** Catalogue field values. Read by isProhibitedSuggestion; prefill is built server-side. */
    backend_event_fields?: Record<string, any>;
  }>;
  carbon_sources: Array<{
    id: number;
    name: string;
    category: string;
    emission_factor: number;
    unit: string;
  }>;
  benchmark?: {
    crop_type: string;
    region: string;
    average_emissions: number;
    percentile_25: number;
    percentile_75: number;
    usda_factors_used: boolean;
  };
  carbon_credit_potential: number;
  sustainability_opportunities: string[];
  efficiency_tips: string[];
  source?: string;
  // Removed from the payload 2026-08-19 — see the note on CropTemplate above:
  // estimated_revenue, typical_costs, premium_pricing_potential, target_yield,
  // labor_hours_per_acre, sustainability_score, is_verified, roi_analysis.
  // New fields from database
  system_type?: string;
  management_intensity?: string;
  irrigation_system?: string;
  fertility_program?: string;
  pest_management?: string;
}

// The education/* response types (USDAMethodologyContent, CarbonImpactData, TrustComparisonData,
// RegionalFarmingPractices, EducationContent) were deleted 2026-11-05 with their endpoints
// (trazo-back: carbon/tests/test_retired_claim_routes_stay_retired.py).

// `getEventTemplatesByCropType` (GET /carbon/event-templates/by_crop_type/) and its
// EventTemplateFromDB / EventTemplatesResponse types were deleted on 2026-08-19: the hook
// had ZERO consumers. It shipped a raw catalogue of template rows to the browser, which is
// the shape the season-plan refactor deliberately moved server-side — the plan is built
// from carbon.EventTemplate by history/services/season_plan_service.py, so nothing needs
// the catalogue client-side any more.

export const carbonApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Producer endpoints
    getFarmCarbonSummary: builder.query<CarbonSummary, string>({
      query: (farmId) => ({
        url: `carbon/establishments/${farmId}/summary/`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, farmId) => [
        { type: 'CarbonSummary', id: farmId },
        'CarbonSummary'
      ]
    }),

    getProductionCarbonSummary: builder.query<CarbonSummary, string>({
      query: (productionId) => ({
        url: `carbon/productions/${productionId}/summary/`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: ['CarbonSummary']
    }),

    getCarbonBenchmarks: builder.query<CarbonBenchmark[], void>({
      query: () => ({
        url: 'carbon/benchmarks/',
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: ['CarbonBenchmarks']
    }),

    getPublicCarbonSummary: builder.query<CarbonSummary, string>({
      query: (productionId) => ({
        url: `carbon/public/productions/${productionId}/summary/`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: ['CarbonSummary']
    }),

    getProductionTimeline: builder.query<CarbonEvent[], string>({
      query: (productionId) => ({
        url: `carbon/productions/${productionId}/timeline/`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: ['CarbonSummary']
    }),

    // Offset endpoints
    createOffset: builder.mutation<
      { success: boolean; transactionId: string },
      {
        production: string; // Changed from productionId to production to match backend expectations
        amount: number;
        source_id: string;
        type: string;
        year: number;
      }
    >({
      query: (data) => ({
        url: 'carbon/offsets/',
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['CarbonSummary']
    }),

    // Real-time event carbon calculation - High-performance endpoint
    calculateEventCarbonImpact: builder.mutation<
      CarbonCalculationResult,
      EventCarbonCalculationRequest
    >({
      query: (data) => ({
        url: 'carbon/calculate-event-carbon/',
        method: 'POST',
        body: data,
        credentials: 'include'
      })
    }),

    // Phase 2 Optimization: Unified Complete Summary Endpoint
    getCompleteSummary: builder.query<CompleteSummary, string>({
      query: (productionId) => ({
        url: `carbon/public/productions/${productionId}/complete/`,
        method: 'GET',
        credentials: 'include'
      }),
      transformResponse: (response: any) => {
        return response;
      },
      providesTags: ['CarbonSummary']
    }),

    getCropTemplates: builder.query<CropTemplatesResponse, { crop_type?: string } | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.crop_type) {
          searchParams.append('crop_type', params.crop_type);
        }

        return {
          url: `/carbon/crop-templates/${
            searchParams.toString() ? `?${searchParams.toString()}` : ''
          }`,
          method: 'GET',
          credentials: 'include'
        };
      },
      providesTags: ['CropTemplate']
    }),

    getCompanyCropOptions: builder.query<CompanyCropOptionsResponse, void>({
      query: () => {
        return {
          url: '/carbon/company-crop-options/',
          method: 'GET',
          credentials: 'include'
        };
      },
      providesTags: ['CropTemplate']
    }),

    getCropTemplateDetail: builder.query<CropTemplateDetail, string>({
      query: (templateId) => ({
        url: `/carbon/crop-templates/${templateId}/`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, templateId) => [{ type: 'CropTemplate', id: templateId }]
    }),

    // NEW: Get event templates by crop type
    // USDA Government Data Integration
    getUSDAEmissionFactors: builder.query<
      {
        success: boolean;
        crop_type: string;
        state: string;
        api_status: {
          nass_configured: boolean;
          ers_configured: boolean;
          data_source: string;
        };
        emission_factors: Record<string, any>;
        benchmark_data: {
          regional_yield: number;
          unit: string;
          kg_per_hectare: number;
        };
        carbon_calculation: Record<string, any>;
        usda_credibility: Record<string, any>;
        api_attribution: string;
        timestamp: string;
        real_data: boolean;
      },
      { crop_type?: string; state?: string }
    >({
      query: ({ crop_type = 'corn', state = 'IA' }) => {
        const params = new URLSearchParams();
        params.append('crop_type', crop_type);
        params.append('state', state);

        return {
          url: `carbon/usda/real-factors/?${params.toString()}`,
          method: 'GET',
          credentials: 'include'
        };
      },
      providesTags: ['USDA'],
      // Cache for 10 minutes to reduce API calls
      keepUnusedDataFor: 600
    }),

    validateUSDACompliance: builder.mutation<
      {
        status: string;
        validation_result: Record<string, any>;
        timestamp: string;
      },
      {
        crop_type: string;
        state: string;
        co2e: number;
        area_hectares: number;
        usda_factors_based?: boolean;
        method?: string;
      }
    >({
      query: (data) => ({
        url: 'carbon/usda/validate-compliance/',
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['USDA']
    }),

    getUSDABenchmarkComparison: builder.query<
      {
        farm_carbon_intensity: number;
        crop_type: string;
        state: string;
        benchmark_comparison: Record<string, any>;
        timestamp: string;
      },
      {
        carbon_intensity: number;
        crop_type?: string;
        state?: string;
      }
    >({
      query: ({ carbon_intensity, crop_type = 'corn', state = 'CA' }) => {
        const params = new URLSearchParams();
        params.append('carbon_intensity', carbon_intensity.toString());
        params.append('crop_type', crop_type);
        params.append('state', state);

        return {
          url: `carbon/usda/benchmark-comparison/?${params.toString()}`,
          method: 'GET',
          credentials: 'include'
        };
      },
      providesTags: ['USDA']
    }),

    // Voice Configuration & Deepgram Token Endpoints
    // `language_mode` is absent on a backend older than 2026-09-10; the client treats that as
    // 'locale' (pinned), so the two can deploy in either order.
    getVoiceConfig: builder.query<
      { provider: 'deepgram' | 'web_speech_api'; language_mode?: 'multi' | 'locale' },
      void
    >({
      query: () => ({
        url: 'carbon/voice-config/',
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: ['VoiceConfig']
    }),

    getDeepgramToken: builder.mutation<{ token: string; expires_in: number }, void>({
      query: () => ({
        url: 'carbon/deepgram-token/',
        method: 'POST',
        credentials: 'include'
      })
    }),

    // Voice Processing Endpoints
    processVoiceEventWithAI: builder.mutation<
      {
        type: string;
        description: string;
        detected_amounts: Array<{ value: number; unit: string; category: string } | string>;
        detected_products: string[];
        detected_systems?: string[];
        confidence: number;
        // Structured fields for direct form mapping
        npk_ratio?: string | null;
        concentration?: string | null;
        commercial_name?: string | null;
        application_method?: string | null;
        water_source?: string | null;
        area_covered?: { value: number; unit: string } | string | null;
        duration?: { value: number; unit: string } | string | null;
        fuel_amount?: { value: number; unit: string } | null;
        /**
         * True when the parser could not name an activity from the words and fell back to the
         * one the farmer chose in step 1. NOT a detection — the panel says so rather than
         * printing "Sounds like: X" over it.
         */
        activity_from_context?: boolean;
        /** Per-activity values, keyed by form field name — the answer to `requested_fields`. */
        activity_fields?: Record<string, unknown>;
        // Metadata
        processing_time?: number;
        source?: string;
        model_used?: string;
        original_transcript?: string;
      },
      {
        transcript: string;
        crop_type: string;
        /**
         * VOICE_TYPE_MAP slug for the activity the farmer already chose at step 1. Context for
         * the extraction prompt — the response still carries the model's own `type`, so a
         * mismatch stays visible. See voiceTypeForActivity / shouldOfferActivitySwitch.
         */
        known_activity?: string;
        /**
         * The fields that activity records, from the display registry. Sent so the prompt can
         * ask for what this form actually holds instead of one generic set for all seventeen
         * activities; echoed back through `activity_fields` and validated against this list
         * before anything reaches a form.
         */
        requested_fields?: Array<{
          name: string;
          label: string;
          type: 'number' | 'text' | 'enum';
          options?: string[];
        }>;
        language?: string;
        /**
         * The crew note being parsed, by its public id. The server keeps its own reading of the
         * note so a confirmation can be compared with what the machine offered rather than with
         * the app's account of it (OSP alignment audit T29, review of back #88).
         */
        field_note?: string;
        timestamp?: string;
      }
    >({
      query: (data) => ({
        url: 'carbon/process-voice-event/',
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['Event', 'CarbonSummary']
    }),

    // AI-Powered Smart Event Suggestions
    getAIEventSuggestions: builder.query<
      {
        suggestions: Array<{
          id: string;
          name: string;
          description: string;
          reasoning: string;
          carbon_impact: number;
          priority: 'high' | 'medium' | 'low';
          confidence: number;
          timing_relevance: string;
          efficiency_tips: string[];
          estimated_duration: string;
          category:
            | 'fertilization'
            | 'irrigation'
            | 'pest_control'
            | 'harvest'
            | 'equipment'
            | 'soil_management';
          seasonal_relevance: number;
          best_practices: string[];
        }>;
        reasoning: string;
        context: {
          season: string;
          crop_type: string;
          location?: string;
          current_month: number;
        };
        ai_confidence: number;
        generated_at: string;
      },
      {
        crop_type: string;
        location?: string;
        season?: string;
        recent_events?: string[]; // Optional - backend fetches from database automatically
        farm_context?: Record<string, any>;
      }
    >({
      query: ({ crop_type, location, season, recent_events, farm_context }) => {
        const params = new URLSearchParams();
        params.append('crop_type', crop_type);
        if (location) params.append('location', location);
        if (season) params.append('season', season);
        // recent_events parameter still supported but backend will fetch from database
        if (recent_events) params.append('recent_events', JSON.stringify(recent_events));
        if (farm_context) params.append('farm_context', JSON.stringify(farm_context));

        return {
          url: `carbon/ai-event-suggestions/?${params.toString()}`,
          method: 'GET',
          credentials: 'include'
        };
      },
      providesTags: ['Event', 'CarbonSummary'],
      // Cache for 15 minutes since suggestions are context-dependent
      keepUnusedDataFor: 900
    }),

    // Paginated Carbon Entries - Following Trazo pagination pattern like Scans
    getFarmCarbonEntriesPaginated: builder.query<
      {
        results: Array<{
          id: number;
          type: 'emission' | 'offset';
          amount: number;
          effective_amount?: number;
          source?: {
            name: string;
            category: string;
          };
          verification_status: 'verified' | 'pending' | 'rejected';
          verification_level?: 'self_reported' | 'community_verified' | 'certified_project';
          trust_score?: number;
          created_at: string;
          timestamp?: string;
        }>;
        count: number;
        next?: string;
        previous?: string;
      },
      {
        farm_id: string;
        page?: number;
        page_size?: number;
        type?: string;
        category?: string;
        verified_only?: boolean;
        search?: string;
        date_from?: string;
        date_to?: string;
      }
    >({
      query: ({ farm_id, page = 1, page_size = 10, ...filters }) => {
        const params = new URLSearchParams({
          establishment_id: farm_id,
          page: page.toString(),
          page_size: page_size.toString(),
          ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v != null))
        });
        return {
          url: `carbon/establishments/${farm_id}/entries/paginated/?${params}`,
          method: 'GET',
          credentials: 'include'
        };
      },
      providesTags: (result, error, { farm_id }) => [
        { type: 'CarbonSummary', id: farm_id },
        'CarbonSummary'
      ]
    }),

    // Enhanced Security Endpoints

    validateFileUploadSecurity: builder.mutation<
      { is_valid: boolean; validation_result: any; security_score: number },
      { file_data: FormData; carbon_entry_id?: number }
    >({
      query: (data) => ({
        url: 'carbon/secure/validate-file-upload/',
        method: 'POST',
        body: data.file_data,
        credentials: 'include'
      }),
      invalidatesTags: ['SecurityStatus']
    }),

    getUserSecurityStatus: builder.query<
      {
        trust_metrics: any;
        gaming_detection: any;
        rate_limiting_status: any;
        security_flags: any[];
        overall_trust_score: number;
      },
      void
    >({
      query: () => ({
        url: 'carbon/secure/user-security-status/',
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: ['SecurityStatus']
    }),

    // Enhanced Photo Evidence Endpoints
    uploadEvidencePhoto: builder.mutation<
      {
        success: boolean;
        photo_id: string;
        photo_url: string;
        metadata: any;
        validation_status: string;
      },
      {
        carbon_entry_id: number;
        photo: File;
        description?: string;
        metadata?: any;
      }
    >({
      query: ({ carbon_entry_id, photo, description, metadata }) => {
        const formData = new FormData();
        formData.append('carbon_entry_id', carbon_entry_id.toString());
        formData.append('photo', photo);
        if (description) formData.append('description', description);
        if (metadata) formData.append('metadata', JSON.stringify(metadata));

        return {
          url: 'carbon/evidence/upload/',
          method: 'POST',
          body: formData,
          credentials: 'include'
        };
      },
      invalidatesTags: ['EvidencePhotos', 'CarbonSummary']
    }),

    getEvidencePhotos: builder.query<
      {
        photos: Array<{
          id: string;
          photo_url: string;
          description: string;
          metadata: any;
          upload_date: string;
          validation_status: string;
        }>;
        total_count: number;
        validation_summary: any;
      },
      number
    >({
      query: (carbonEntryId) => ({
        url: `carbon/evidence/${carbonEntryId}/photos/`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: ['EvidencePhotos']
    }),

    validatePhotoEvidence: builder.mutation<
      { validation_result: any; is_valid: boolean },
      { carbon_entry_id: number }
    >({
      query: (data) => ({
        url: 'carbon/evidence/validate/',
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['EvidencePhotos', 'CarbonSummary']
    }),

    // ⛔ 2026-09-08 — `estimateGasCosts` and `optimizeTransactionGas` removed with their
    // backend routes (`carbon/blockchain/gas-estimate/`, `carbon/blockchain/optimize-transaction/`).
    // Polygon gas estimation for a chain this product no longer writes to: the blockchain
    // add-on was withdrawn 2026-08-03 and BLOCKCHAIN_ENABLED has defaulted False since
    // 2026-08-06. Both hooks were exported and had zero call sites in the entire app.
    // Guard: trazo-back `carbon/tests/test_retired_claim_routes_stay_retired.py`.

    // Phase 3: Enhanced Dashboard Endpoints
    getDashboardComprehensive: builder.query<
      {
        establishment_id: string;
        transparency_metrics: {
          overall_score: number;
          event_count: number;
          verification_percentage: number;
          trust_indicators: {
            blockchain_verified: boolean;
            photo_evidence_count: number;
            third_party_verified: boolean;
          };
        };
        carbon_summary: {
          total_emissions: number;
          total_offsets: number;
          net_carbon: number;
          carbon_intensity: number;
        };
        recent_activity: Array<{
          id: number;
          type: string;
          description: string;
          date: string;
          carbon_impact: number;
        }>;
        performance_trends: {
          transparency_trend: 'up' | 'down' | 'stable';
          carbon_trend: 'up' | 'down' | 'stable';
          engagement_trend: 'up' | 'down' | 'stable';
        };
        generated_at: string;
      },
      { companyId: string; farmId: string }
    >({
      query: ({ companyId, farmId }) => ({
        url: `companies/${companyId}/establishments/${farmId}/dashboard_comprehensive/`,
        method: 'GET',
        credentials: 'include'
      }),
      keepUnusedDataFor: 300, // Cache for 5 minutes
      providesTags: (result, error, { farmId }) => [
        { type: 'DashboardComprehensive', id: farmId },
        'CarbonSummary'
      ]
    })

    // getCarbonScopeBreakdown removed 2026-09-30. It had zero call sites, and the endpoint
    // it named returns HTTP 500 for any farm with carbon data: every method
    // EstablishmentViewSet.carbon_scope_breakdown calls on EnhancedCarbonCalculator was
    // renamed to a private one and no longer exists.
    //
    // NEVER restore this response type from the shape below. It was written against an
    // endpoint that never produced it, and it declared claims the backend has no source for:
    // carbon_intensity_metrics.industry_comparison.percentile (a benchmark Trazo would be
    // computing about itself) and improvement_opportunities[].roi_estimate (a return-on-
    // investment figure, which compliance.md puts in the UNSAFE column with every other
    // pricing-outcome claim).
  })
});

export const {
  useGetFarmCarbonSummaryQuery,
  useGetProductionCarbonSummaryQuery,
  useGetCarbonBenchmarksQuery,
  useGetPublicCarbonSummaryQuery,
  useGetProductionTimelineQuery,
  useCreateOffsetMutation,
  useCalculateEventCarbonImpactMutation,
  // Phase 2 Optimization: Unified Complete Summary
  useGetCompleteSummaryQuery,
  useGetCropTemplatesQuery,
  useGetCompanyCropOptionsQuery,
  useGetCropTemplateDetailQuery,
  // Educational Content hooks
  // NEW: Get event templates by crop type
  // USDA Government Data Integration hooks
  useGetUSDAEmissionFactorsQuery,
  useValidateUSDAComplianceMutation,
  useGetUSDABenchmarkComparisonQuery,
  // Voice Configuration hooks
  useGetVoiceConfigQuery,
  useGetDeepgramTokenMutation,
  // Voice Processing hooks
  useProcessVoiceEventWithAIMutation,
  // AI Smart Suggestions hook
  useGetAIEventSuggestionsQuery,
  // Paginated Carbon Entries hook
  useGetFarmCarbonEntriesPaginatedQuery,
  // Enhanced Security hooks
  useValidateFileUploadSecurityMutation,
  useGetUserSecurityStatusQuery,
  // Photo Evidence hooks
  useUploadEvidencePhotoMutation,
  useGetEvidencePhotosQuery,
  useValidatePhotoEvidenceMutation,
  // Gas Optimization hooks
  // Phase 6: Advanced Analytics hook
  // Phase 3: Enhanced Dashboard hooks
  useGetDashboardComprehensiveQuery
} = carbonApi;

// Backward-compat aliases for renamed hooks
//
// useGetEstablishmentCarbonSummaryQuery removed 2026-09-30. It had zero call sites and was
// an alias onto useGetFarmCarbonSummaryQuery, which hits establishments/<id>/summary/ and
// NOT establishments/<id>/carbon-summary/. The name made the second route look wired while
// nothing called it, which is how a carbon-credit revenue estimate survived two claim
// sweeps server-side. See carbon/tests/test_retired_claim_routes_stay_retired.py.
/** @deprecated Use useGetFarmCarbonEntriesPaginatedQuery instead */
export const useGetEstablishmentCarbonEntriesPaginatedQuery = useGetFarmCarbonEntriesPaginatedQuery;

// Debug logging
console.log('carbonApi hooks exported:', {
  useGetCompanyCropOptionsQuery: !!useGetCompanyCropOptionsQuery,
  carbonApi: !!carbonApi
});
