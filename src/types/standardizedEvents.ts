/**
 * Standardized Event Data Types
 *
 * This file defines the standardized data structures for all 8 event types
 * used throughout the Trazo application. These interfaces ensure consistent
 * field naming and data structure between different data sources (form data,
 * backend API, etc.).
 */

/**
 * Base interface containing fields common to all event types
 */
export interface StandardizedEventBase {
  // Core identification
  id: string;
  /**
   * Event FAMILY name — 'chemical' | 'production' | 'soil_management' | … (see
   * EVENT_TYPE_MAP). NOT the two-letter sub-type code. Consumers of this field include
   * the timeline's chapter routing and the field-registry bridge, both of which key on
   * the family. To branch on a sub-type (FE, HA, SC, …) use `subtype` below.
   */
  type: string;
  /**
   * Two-letter sub-type code — 'FE' | 'HA' | 'SC' | 'GR' | … — normalized from whichever
   * per-family key the backend sent (`chemical_type`, `production_type`, …).
   *
   * Exists because `type` is overwritten with the family name during normalization, which
   * silently killed every `event.type === 'FE'` style comparison downstream (aggregate
   * summary totals rendered a header and no body). Branch on this, never on `type`.
   */
  subtype?: string;
  title: string; // 🚨 CRITICAL FIX: Add title field for preview-display consistency
  name?: string;
  description: string;
  date: string;
  observation?: string;

  // Event type classification
  event_type?: number; // 0-7 numeric event type identifier

  // Verification and trust indicators
  certified?: boolean;
  blockchain_verified?: boolean;
  blockchain_transaction?: string;
  blockchain_block_number?: number;
  blockchain_explorer_url?: string;
  blockchain_network?: string;
  verification_confidence?: number;
  verification_timestamp?: string;
  data_integrity_score?: number;
  usda_factors_used?: boolean;

  // MVP Photo Verification: Tiered verification levels
  verification_level?:
    | 'self_reported'
    | 'photo_documented'
    | 'photo_verified'
    | 'data_verified'
    | 'certified';
  photo_verified_count?: number;

  // Carbon calculation
  carbon_impact?: number;

  // Photo/media data
  album?: {
    id: string;
    images: Array<{
      id: string;
      image: string;
      caption?: string;
      created_at?: string;
    }>;
  };

  // Additional structured data
  extra_data?: {
    [key: string]: any;
  };

  // Sprint 5.1 — OSP ↔ events drift detector finding. Null / undefined when
  // the input used on this event matches the establishment's active OSP
  // approved_inputs. Populated by a post_save signal on the backend —
  // never mutated by the frontend.
  drift_warning?: DriftWarning | null;
}

/**
 * Drift detector finding — 7 CFR 205.400(f)(1).
 * Shape must match backend certifications.services.drift_detector.build_drift_warning.
 */
export interface DriftWarning {
  detected_at: string;
  osp_id: number;
  osp_version: number;
  input_label: string;
  reason: string;
  /**
   * Stable machine code + params for localized rendering (2026-08-25). The
   * English `reason` prose remains the packet text and the UI fallback for
   * findings stamped by older detector builds (both fields absent there).
   */
  reason_code?: string | null;
  reason_params?: Record<string, unknown> | null;
  resolved_via:
    | 'omri'
    | 'national_list'
    | 'wsda'
    | 'unresolved'
    // Phase 2 — seed source findings (§ 205.204 / NOP 5029).
    | 'seed_certification_missing'
    | 'seed_search_incomplete'
    | 'seed_treated_prohibited';
  resolved_id?: number | null;
  resolved_name?: string | null;
  cfr_reference: string;
  // Phase 1 additive fields — optional for backward compatibility with events
  // stamped by older drift detector builds.
  cdfa_oim_status?: DriftCDFAStatus | null;
  // P0-3 — CA-only DPR restricted-materials permit status. Populated on
  // events whose input matches a CA-restricted keyword list (copper, sulfur,
  // pyrethrin, spinosad, rotenone) for California establishments.
  ca_dpr_permit_status?: DriftCADPRPermitStatus | null;
  omri_search_url?: string | null;
}

/**
 * CA-only CDFA OIM (Organic Input Material) registration status.
 * Independent of OSP approval — a product can be OSP-approved but CDFA-
 * unregistered, which is itself a California state-law violation for CA farms.
 */
export interface DriftCDFAStatus {
  status: 'registered' | 'missing';
  cdfa_oim_reg_number?: string | null;
}

/**
 * CA-only DPR (Department of Pesticide Regulation) Restricted Materials
 * Permit status. Required for county-restricted materials (copper hydroxide,
 * sulfur, pyrethrin, spinosad, rotenone) under 3 CCR 6400 et seq. — issued
 * by the county Ag Commissioner, orthogonal to NOP § 205.601 approval.
 */
export interface DriftCADPRPermitStatus {
  status: 'present' | 'missing' | 'expired';
  permit_number?: string | null;
  county?: string | null;
  expires?: string | null;
}

/**
 * Weather Event (Type 0)
 * Supports all weather subtypes: FR, DR, HL, HT, TS, HW, HH, LH
 */
export interface StandardizedWeatherEvent extends StandardizedEventBase {
  // Weather subtype (FR=frost, DR=drought, HL=hail, etc.)
  weather_type?: string;

  // Temperature events (FR - Frost, HT - High Temperature)
  lower_temperature?: number | string;
  highest_temperature?: number | string;

  // Protection and mitigation
  way_of_protection?: string;
  protection_measures?: string;

  // Environmental measurements
  water_deficit?: number;
  weight?: number; // Hail weight (legacy field)
  diameter?: number; // Hail diameter (legacy field)
  average_hailstone_weight?: string | number; // Specific hail weight with units
  average_hailstone_diameter?: string | number; // Specific hail diameter with units
  duration?: number; // Event duration in hours/minutes
  wind_speed?: number;
  precipitation_amount?: number;
  humidity_level?: number;

  // Impact assessment
  damage_assessment?: string;
  crop_impact?: string;

  // Event timing
  start_date?: string;
  end_date?: string;
}

/**
 * Production Event (Type 1)
 * Supports: PL=Planting, HA=Harvesting, IR=Irrigation, PR=Pruning, TR=Transportation
 */
export interface StandardizedProductionEvent extends StandardizedEventBase {
  production_name?: string;
  production_type?: string; // PL, HA, IR, PR, TR

  // Core measurements - formatted with units
  area_covered?: string;
  yield_quantity?: string;
  fuel_consumed?: string;
  equipment_hours?: string;
  transportation_distance?: string; // HA - Harvesting only

  // Raw numeric values for calculations
  area_covered_raw?: number;
  yield_quantity_raw?: number;
  fuel_consumed_raw?: number;
  equipment_hours_raw?: number;
  transportation_distance_raw?: number;

  // Unit specifications
  area_unit?: string;
  yield_unit?: string;
  fuel_unit?: string;
  transportation_unit?: string;

  // Legacy compatibility fields
  volume?: string;
  area?: string;

  // NOP 7 CFR 205.204 — Seed Traceability (PL subtype only)
  seeds_source?: string;
  seed_supplier_name?: string;
  seed_purchase_date?: string;
  seed_purchase_invoice?: string;
  seed_lot_number?: string;
  seed_certification_status?: string;
  seed_treatment?: string;
  seed_search_attempts?: Array<{
    supplier_name: string;
    date_contacted: string;
    result: string;
    notes?: string;
  }>;
}

/**
 * Chemical Event (Type 2)
 * Supports: FE=Fertilizer, PE=Pesticide, FU=Fungicide, HE=Herbicide
 */
export interface StandardizedChemicalEvent extends StandardizedEventBase {
  chemical_type?: string; // FE, PE, FU, HE

  // Product identification (immediate priority)
  commercial_name?: string;
  active_ingredient?: string;

  // Application details (immediate priority)
  application_method?: string; // Standardized field name
  target_pest_disease?: string;

  // Area and volume measurements (secondary priority)
  area_treated?: number;
  area_unit?: string;
  volume_applied?: number;
  volume_unit?: string;

  // Technical specifications (details priority)
  concentration?: string;
  npk_ratio?: string;

  // NPK percentages for fertilizers
  nitrogen_percentage?: number;
  phosphorus_percentage?: number;
  potassium_percentage?: number;

  // Environmental and timing (secondary priority)
  application_timing?: string;
  weather_conditions?: string;

  // Organic certification status
  organic_approved?: string; // omri_listed, usda_nop_approved, organic_equivalent, transitional, not_organic
  chemical_subtype?: string; // organic_fertilizer, synthetic_pesticide, etc.

  // Legacy compatibility fields
  volume?: string;
  area?: string;
}

/**
 * General Event (Type 3)
 * Multi-purpose events for activities not covered by other types
 */
export interface StandardizedGeneralEvent extends StandardizedEventBase {
  // Basic activity information (immediate priority)
  activity_type?: string;
  activity_name?: string;

  // Operational measurements (secondary priority)
  duration?: string;
  duration_raw?: number;
  people_involved?: number;

  // Documentation (details priority)
  activity_notes?: string;

  // Tillage-specific fields
  area_treated?: number;
  tillage_method?: string;
  equipment_name?: string;
  fuel_amount?: number;

  // Cover crop fields
  cover_crop_species?: string;
  cover_crop_activity?: string;
  seeding_rate?: string;

  // Energy fields
  energy_type?: string;
  energy_amount?: number;
  facility_name?: string;
  energy_cost?: number;

  // Conservation fields
  practice_type?: string;
  establishment_cost?: number;
  expected_lifespan?: string;

  // Verification fields
  verification_type?: string;
  verifier_name?: string;
  sample_count?: number;
  verification_protocol?: string;
}

/**
 * Equipment Event (Type 4)
 * Equipment operations and maintenance activities
 */
export interface StandardizedEquipmentEvent extends StandardizedEventBase {
  // Operation information (immediate priority)
  operation_type?: string;
  operation_name?: string;
  equipment_type?: string;

  // Measurements (secondary priority)
  fuel_consumed?: number;
  fuel_type?: string;
  fuel_unit?: string; // Unit for fuel consumption (e.g., L, gal)
  hours_operated?: number;
  area_worked?: number;
  area_unit?: string; // Unit for area worked (e.g., hectares, acres)

  // Performance (details priority)
  operation_efficiency?: string;
  operation_notes?: string;
}

/**
 * Soil Management Event (Type 5)
 * Supports: ST=Soil Testing, PA=pH Adjustment, OM=Organic Matter, CC=Cover Crop, TI=Tillage, CO=Composting
 */
export interface StandardizedSoilManagementEvent extends StandardizedEventBase {
  // Basic information (immediate priority)
  soil_management_type?: string; // ST, PA, OM, CC, TI, CO
  soil_management_name?: string;

  // Area information (immediate priority)
  area_managed?: number;
  area_unit?: string;
  working_depth?: number;
  depth_unit?: string;

  // Operational data (secondary priority)
  area_covered?: number;
  fuel_consumed?: number;
  fuel_unit?: string;
  equipment_hours?: number;
  production_efficiency?: string;
  transportation_distance?: number;
  transportation_unit?: string;

  // Soil properties (details priority)
  soil_ph?: number;
  organic_matter?: number;
  soil_texture?: string;
  soil_moisture?: string;

  // Environmental conditions (details priority)
  weather_conditions?: string;
  temperature_range?: string;
  equipment_used?: string;

  // Tillage-specific details (secondary/details priority)
  tillage_type?: string;
  tillage_intensity?: string;
  tillage_direction?: string;
  residue_management?: string;
  tillage_depth?: number | string;
  tillage_depth_unit?: string;

  // Amendment details (organic matter / compost applications)
  amendment_type?: string;
  amendment_amount?: number | string;
  amendment_unit?: string;
  amendment_amount_numeric?: number | string;
  amendment_amount_unit?: string;

  // NOP Compliance (7 CFR 205.203) — Amendment approval + Compost tracking + Manure timing
  amendment_organic_approved?: string;
  compost_peak_temp_f?: number | string;
  compost_duration_days_at_temp?: number | string;
  compost_turning_count?: number | string;
  compost_method?: 'windrow' | 'static_aerated' | 'in_vessel' | '';
  compost_initial_cn_ratio?: number | string;
  manure_harvest_interval?: string;
  manure_application_date?: string;

  // Documentation (details priority)
  soil_management_notes?: string;
}

/**
 * Pest Management Event (Type 6)
 * Supports: SC=Scouting, TM=Trap Monitoring, BR=Beneficial Release, PI=Pest ID, TA=Threshold Assessment, IP=IPM Implementation
 */
export interface StandardizedPestManagementEvent extends StandardizedEventBase {
  // Basic information (immediate priority)
  pest_management_type?: string; // SC, TM, BR, PI, TA, IP
  pest_management_name?: string;

  // Pest context (immediate priority)
  pest_species?: string;
  damage_percentage?: number;
  pest_pressure_level?: string;

  // Type-specific measurements (secondary priority)
  time_spent_hours?: number;
  field_area_hectares?: number;
  trap_count?: number;
  beneficial_species?: string;
  release_quantity?: number;
  economic_threshold_met?: boolean;
  action_threshold_met?: boolean;

  // Environmental context (details priority)
  travel_distance_km?: number;
  weather_conditions?: string;
  crop_growth_stage?: string;
  action_recommended?: string;

  // IPM strategy and documentation (details priority)
  ipm_strategy?: string;
  pest_management_notes?: string;
}

/**
 * Business Event (Type 7)
 * Supports: CE=Certification, CM=Compliance, IN=Inspection
 */
export interface StandardizedBusinessEvent extends StandardizedEventBase {
  // Basic information (immediate priority)
  business_event_type?: string; // CE, CM, IN
  business_event_name?: string;
  business_activity_type?: string;

  // Certification details (secondary priority)
  certification_type?: string;

  // Carbon credits (secondary priority)
  carbon_credits_earned?: number;
  carbon_credits_unit?: string;

  // Verification and compliance (details priority)
  verification_status?: string;
  sustainability_practice?: string;

  // Trust and transparency (secondary priority)

  // Documentation (details priority)
  business_observation?: string;
}

/**
 * Union type for all standardized events
 */
export type StandardizedEvent =
  | StandardizedWeatherEvent
  | StandardizedProductionEvent
  | StandardizedChemicalEvent
  | StandardizedGeneralEvent
  | StandardizedEquipmentEvent
  | StandardizedSoilManagementEvent
  | StandardizedPestManagementEvent
  | StandardizedBusinessEvent;

/**
 * Type guard functions to check event types
 */
export const isWeatherEvent = (event: StandardizedEvent): event is StandardizedWeatherEvent =>
  event.event_type === 0;

export const isProductionEvent = (event: StandardizedEvent): event is StandardizedProductionEvent =>
  event.event_type === 1;

export const isChemicalEvent = (event: StandardizedEvent): event is StandardizedChemicalEvent =>
  event.event_type === 2;

export const isGeneralEvent = (event: StandardizedEvent): event is StandardizedGeneralEvent =>
  event.event_type === 3;

export const isEquipmentEvent = (event: StandardizedEvent): event is StandardizedEquipmentEvent =>
  event.event_type === 4;

export const isSoilManagementEvent = (
  event: StandardizedEvent
): event is StandardizedSoilManagementEvent => event.event_type === 5;

export const isPestManagementEvent = (
  event: StandardizedEvent
): event is StandardizedPestManagementEvent => event.event_type === 6;

export const isBusinessEvent = (event: StandardizedEvent): event is StandardizedBusinessEvent =>
  event.event_type === 7;

/**
 * Event type mapping constants
 */
export const EVENT_TYPE_MAP = {
  0: 'weather',
  1: 'production',
  2: 'chemical',
  3: 'general',
  4: 'equipment',
  5: 'soil_management',
  6: 'pest_management', // ✅ FIXED: PEST_MANAGEMENT_EVENT_TYPE = 6
  7: 'business' // ✅ FIXED: BUSINESS_EVENT_TYPE = 7
} as const;

export const EVENT_TYPE_NAMES = {
  0: 'Weather Event',
  1: 'Production Activity',
  2: 'Chemical Application',
  3: 'General Activity',
  4: 'Equipment Operation',
  5: 'Soil Management',
  6: 'Pest Management',
  7: 'Business Activity'
} as const;
