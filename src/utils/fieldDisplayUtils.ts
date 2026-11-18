/**
 * ⚠️ THIS FILE NO LONGER SELECTS FIELDS FOR DISPLAY. The registry does (src/config/events/).
 *
 * Nine hand-rolled extractors lived here — one per event family plus the `getEventFieldDisplay`
 * dispatcher — and they were deleted on 2026-08-19 along with the last two call sites. They had
 * been superseded for months: `VITE_USE_FIELD_REGISTRY` is `true` in every env file, so both
 * live callers took the registry branch and the legacy branch was dead in production while
 * still costing a full extraction pass on every ConsumerEventCard render.
 *
 * Two things had to be true before removing them, and both were established rather than
 * assumed:
 *   1. the fallback was not load-bearing — `registryCoversEveryEventType.test.ts` pins that
 *      every event type declares at least one consumer_card field, so "registry resolved
 *      nothing" now means the EVENT is empty, not that coverage is missing;
 *   2. nothing else imported them — verified per symbol before deletion.
 *
 * What REMAINS here is value formatting, which the registry calls into and does not duplicate:
 * `getReadableFieldValue`, `localizeFieldValue`, `mergeCustomFieldsIntoDisplay`, and the
 * `FieldDisplayItem` / `EventFieldDisplay` shapes the card still renders through.
 */
/**
 * Field Display Utilities
 * Implements the comprehensive field-by-field display matrix for all event types
 * Based on /trazo-back/field_display_matrix.md specifications
 *
 * IMPORTANT: This module expects standardized event data from the normalization layer.
 * All dual field checking patterns have been removed as data is now consistently normalized.
 */

import { FIELD_VALUE_ES } from './fieldValues.es';

/**
 * Checks if a value is present and valid for display.
 * Handles: undefined, null, empty string, and the string literal "null"
 * that can come from backend serialization.
 */
function isValidValue(val: any): boolean {
  if (val === undefined || val === null) return false;
  const str = String(val).trim();
  return str !== '' && str !== 'null';
}

/**
 * Format a numeric value with locale separators (e.g. 50000 → "50,000")
 * Returns the original string if not a parseable number.
 */
function formatNumber(val: any): string {
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return String(val);
  return num.toLocaleString();
}

/**
 * Normalize event data to standardized field names expected by field display utilities
 * This fixes the gap between backend API response field names and frontend expectations
 */
function normalizeEventData(event: any): any {
  const normalized = { ...event };

  // === COMPREHENSIVE FIELD NORMALIZATION FOR CHEMICAL EVENTS ===

  // Application Method Mapping
  if (event.way_of_application && !normalized.application_method) {
    normalized.application_method = event.way_of_application;
  }

  // === COMPREHENSIVE FIELD NORMALIZATION FOR EQUIPMENT EVENTS ===
  const isEquipmentEvent =
    event.event_type === 4 ||
    ['FC', 'MN', 'RE', 'CA', 'BD', 'EI'].includes(event.type) ||
    event.description?.toLowerCase().includes('tractor') ||
    event.description?.toLowerCase().includes('equipment') ||
    event.description?.toLowerCase().includes('fuel') ||
    event.description?.toLowerCase().includes('field plowing');

  if (isEquipmentEvent) {
    // Map 'name' to 'operation_name' for field extraction
    if (event.name && !normalized.operation_name) {
      normalized.operation_name = event.name;
    }

    // Map equipment_name to structured equipment type if needed
    if (event.equipment_name && !normalized.equipment_type_structured) {
      normalized.equipment_type_structured = event.equipment_name.toLowerCase();
    }

    // Ensure all numeric fields are properly mapped with units
    if (event.fuel_consumed !== undefined && !normalized.fuel_unit) {
      normalized.fuel_unit = 'L'; // Default unit for fuel
    }

    if (event.area_worked !== undefined && !normalized.area_unit) {
      normalized.area_unit = 'ha'; // Default unit for area
    }
  }

  // *** NEW: Handle API response field name differences ***
  // Parse combined area field (e.g., "20 ha" → area_treated: 20, area_unit: "ha")
  if (event.area && typeof event.area === 'string' && !normalized.area_treated) {
    const areaMatch = event.area.match(/^([0-9.]+)\s*(.+)$/);
    if (areaMatch) {
      normalized.area_treated = parseFloat(areaMatch[1]);
      normalized.area_unit = areaMatch[2];
    }
  }

  // Parse combined volume field (e.g., "10 L" → volume_applied: 10, volume_unit: "L")
  if (event.volume && typeof event.volume === 'string' && !normalized.volume_applied) {
    const volumeMatch = event.volume.match(/^([0-9.]+)\s*(.+)$/);
    if (volumeMatch) {
      normalized.volume_applied = parseFloat(volumeMatch[1]);
      normalized.volume_unit = volumeMatch[2];
    }
  }

  // Map concentration field (API uses "concentration", frontend expects "concentration")
  if (event.concentration && !normalized.concentration) {
    // Check if this is actually NPK ratio format (e.g., "10-10-10")
    if (event.concentration.includes('-') && !normalized.npk_ratio) {
      normalized.npk_ratio = event.concentration;
    } else {
      normalized.concentration = event.concentration;
    }
  }

  // Area and Coverage Mapping
  if (event.area_treated !== undefined && !normalized.area_treated) {
    normalized.area_treated = event.area_treated;
  }

  if (event.area_unit && !normalized.area_unit) {
    normalized.area_unit = event.area_unit;
  }

  // Volume and Application Details
  if (event.volume_applied !== undefined && !normalized.volume_applied) {
    normalized.volume_applied = event.volume_applied;
  }

  if (event.volume_unit && !normalized.volume_unit) {
    normalized.volume_unit = event.volume_unit;
  }

  // Concentration Mapping with percentage handling
  if (event.concentration !== undefined && !normalized.concentration) {
    normalized.concentration = event.concentration;
  }

  // Application Timing Mapping
  if (event.application_timing && !normalized.application_timing) {
    normalized.application_timing = event.application_timing;
  }

  // Product and Chemical Details
  if (event.commercial_name && !normalized.commercial_name) {
    normalized.commercial_name = event.commercial_name;
  }

  if (event.target_pest_disease && !normalized.target_pest_disease) {
    normalized.target_pest_disease = event.target_pest_disease;
  }

  if (event.active_ingredient && !normalized.active_ingredient) {
    normalized.active_ingredient = event.active_ingredient;
  }

  if (event.npk_ratio && !normalized.npk_ratio) {
    normalized.npk_ratio = event.npk_ratio;
  }

  // Weather Conditions Mapping
  if (event.weather_conditions && !normalized.weather_conditions) {
    normalized.weather_conditions = event.weather_conditions;
  }

  // Extra Data Fallbacks (for cases where data is nested in extra_data)
  const extraData = event.extra_data || {};
  if (Object.keys(extraData).length > 0) {
    // Map fields from extra_data if main event fields are missing
    Object.keys(extraData).forEach((key) => {
      if (extraData[key] !== undefined && normalized[key] === undefined) {
        normalized[key] = extraData[key];
      }
    });
  }

  return normalized;
}

/**
 * Get the appropriate label for fuel/energy consumption based on fuel type
 * Electric equipment uses "Energy Consumed" (icon provided by component)
 * Fuel-based equipment uses "Fuel Consumed" (icon provided by component)
 *
 * NOTE: Emoji icons are now provided by the component's getCategoryIcon() function
 * to avoid duplicate icons in the display.
 */
function getFuelConsumptionLabel(fuelType?: string): string {
  if (!fuelType) {
    return 'Fuel Consumed';
  }

  const normalizedFuelType = fuelType.toLowerCase();
  return normalizedFuelType === 'electric' ? 'Energy Consumed' : 'Fuel Consumed';
}

/**
 * Convert technical field values to consumer-friendly labels
 */
export function getReadableFieldValue(field: string, value: string): string {
  const fieldMappings: Record<string, Record<string, string>> = {
    fuel_type: {
      // 🔧 Added emojis for consistency with other categorical fields (seeds_source, water_source, equipment_type)
      diesel: 'Diesel',
      gasoline: 'Gasoline',
      biodiesel: 'Biodiesel',
      electric: 'Electric',
      natural_gas: 'Natural Gas',
      propane: 'LPG / Propane',
      none: 'No Fuel / Manual'
    },
    equipment_type: {
      // Generic equipment types
      tractor: 'Tractor',
      harvester: 'Harvester/Combine',
      sprayer: 'Sprayer',
      cultivator: 'Cultivator',
      transport: 'Transport Vehicle',
      irrigation_pump: 'Irrigation Pump',
      truck: 'Truck/Transport',
      generator: 'Generator',
      pump: 'Irrigation Pump',
      other: 'Other Equipment',
      // Specific tractor sizes
      tractor_small: 'Small Tractor (25-75 HP)',
      tractor_medium: 'Medium Tractor (75-150 HP)',
      tractor_large: 'Large Tractor (150+ HP)'
    },
    equipment_operation_type: {
      FC: 'Fuel Consumption',
      MN: 'Maintenance',
      RE: 'Repair',
      CA: 'Calibration',
      BD: 'Breakdown',
      EI: 'Inspection',
      CL: 'Cleaning'
    },
    operation_efficiency: {
      // 🔧 Added emojis for consumer-friendly display
      high: 'High Efficiency',
      normal: 'Normal Efficiency',
      low: 'Low Efficiency'
    },
    weather_conditions: {
      // 🔧 Added weather emojis for consumer-friendly display
      calm_dry: 'Calm & Dry - Ideal conditions',
      clear_calm: 'Clear & Calm - Ideal conditions',
      light_wind: 'Light Wind - Suitable conditions',
      humid: 'Humid - Acceptable conditions',
      windy: 'Windy - Challenging conditions',
      // Legacy mappings for backward compatibility
      calm_wet: 'Calm, wet conditions',
      windy_dry: 'Windy, dry conditions',
      windy_wet: 'Windy, wet conditions',
      rainy: 'Rainy conditions',
      sunny: 'Sunny conditions',
      cloudy: 'Cloudy conditions',
      partly_cloudy: 'Partly Cloudy - Good conditions',
      overcast: 'Overcast conditions',
      overcast_humid: 'Overcast & Humid'
    },
    application_timing: {
      // 🔧 Added emojis for consumer-friendly display
      pre_plant: 'Pre-Planting',
      post_emergence: 'Post-Emergence',
      flowering: 'Flowering Stage',
      pre_bloom: 'Pre-Bloom Stage',
      fruit_set: 'Fruit Set Stage',
      post_bloom: 'Post-Bloom Stage',
      fruit_development: 'Fruit Development',
      harvest: 'Pre-Harvest',
      // Legacy mappings for backward compatibility
      at_plant: 'At planting',
      post_plant: 'After planting',
      pre_harvest: 'Before harvest',
      post_harvest: 'After harvest',
      early_season: 'Early season',
      mid_season: 'Mid season',
      late_season: 'Late season',
      dormant: 'Dormant period',
      active_growth: 'Active growth period'
    },
    way_of_application: {
      spray: 'Spray application',
      drip: 'Drip irrigation',
      broadcast: 'Broadcast application',
      injection: 'Soil injection',
      foliar: 'Foliar spray',
      granular: 'Granular application',
      liquid: 'Liquid application',
      powder: 'Powder application'
    },
    application_method: {
      // Fertilizer methods
      broadcast_surface: 'Broadcast Surface - Uniform spreading',
      broadcast_incorporated: 'Broadcast Incorporated - Mixed into soil',
      band_placement: 'Band Placement - Precise placement',
      side_dress: 'Side Dress - Growing season application',
      fertigation: 'Fertigation - Through irrigation',
      foliar_feed: 'Foliar Feed - Leaf application',
      soil_injection: 'Soil Injection - Liquid fertilizer',
      granular_spreader: 'Granular Spreader - Mechanical application',
      // EPA Standard Methods (Sprint 6 - 2025-12-23)
      ground_spray: 'Ground Spray - Spray application to crops/soil',
      chemigation: 'Chemigation - Through irrigation system',
      aerial_spray: 'Aerial Spray - Aircraft application',
      // Pesticide methods
      broadcast_spray: 'Broadcast Spray - Full field coverage',
      band_spray: 'Band Spray - Row treatment',
      soil_incorporation: 'Soil Incorporation - Mixed into soil',
      granular_preemergent: 'Granular Pre-Emergent - Soil surface',
      // Fungicide methods
      foliar_spray: 'Foliar Spray - Leaf surface treatment',
      air_blast_sprayer: 'Air Blast Sprayer - Orchard/vineyard coverage',
      soil_drench: 'Soil Drench - Root zone treatment',
      seed_treatment: 'Seed Treatment - Preventive coating',
      trunk_injection: 'Trunk Injection - Tree treatment',
      dusting: 'Dusting - Powder application',
      // Herbicide methods
      pre_plant_incorporated: 'Pre-Plant Incorporated - Soil preparation',
      pre_emergence: 'Pre-Emergence - Before sprouting',
      post_emergence_directed: 'Post-Emergence Directed - Targeted application',
      post_emergence_over_top: 'Post-Emergence Over-Top - Full coverage',
      spot_treatment: 'Spot Treatment - Localized application',
      // Form dropdown values (Sprint 2 Epic 2.2 standardized methods)
      banded: 'Banded - Precise row/band placement',
      subsurface: 'Subsurface - Below soil surface injection',
      // Legacy/generic mappings
      spray: 'Spray Application',
      broadcast: 'Broadcast Application',
      broadcast_spreader: 'Broadcast Spreader - Uniform spreading',
      drip: 'Drip/Irrigation',
      foliar: 'Foliar Application',
      injection: 'Soil Injection',
      granular: 'Granular Application'
    },
    // SOIL MANAGEMENT FIELD MAPPINGS (Type 5)
    soil_moisture: {
      dry: 'Dry',
      moderate: 'Moderate',
      moist: 'Moist',
      wet: 'Wet'
    },
    soil_texture: {
      // Primary soil textures - using contextual emojis
      sandy: 'Sandy',
      sandy_loam: 'Sandy Loam',
      loam: 'Loam',
      clay_loam: 'Clay Loam',
      clay: 'Clay',
      silt: 'Silt',
      silt_loam: 'Silt Loam',
      silty_clay: 'Silty Clay',
      silty_clay_loam: 'Silty Clay Loam',
      sandy_clay: 'Sandy Clay',
      sandy_clay_loam: 'Sandy Clay Loam',
      // Additional soil type variations
      coarse_sandy: 'Coarse Sandy',
      fine_sandy: 'Fine Sandy',
      very_fine_sandy_loam: 'Very Fine Sandy Loam',
      organic: 'Organic Soil',
      peat: 'Peat Soil',
      muck: 'Muck Soil'
    },
    equipment_used: {
      // Soil management specific equipment
      plow: 'Plow',
      disk_harrow: 'Disk Harrow',
      field_cultivator: 'Field Cultivator',
      chisel_plow: 'Chisel Plow',
      subsoiler: 'Subsoiler',
      rototiller: 'Rototiller',
      moldboard_plow: 'Moldboard Plow',
      offset_disk: 'Offset Disk',
      tandem_disk: 'Tandem Disk',
      spring_tooth_harrow: 'Spring Tooth Harrow',
      spike_tooth_harrow: 'Spike Tooth Harrow',
      roller: 'Roller/Compactor',
      leveler: 'Land Leveler',
      soil_sampler: 'Soil Sampler',
      ph_meter: 'pH Meter',
      soil_probe: 'Soil Probe',
      drainage_plow: 'Drainage Plow',
      terracing_equipment: 'Terracing Equipment',
      // General equipment that might be used
      tractor: 'Tractor',
      hand_tools: 'Hand Tools',
      no_till_drill: 'No-Till Drill',
      seeder: 'Seeder',
      broadcast_spreader: 'Broadcast Spreader'
    },
    soil_management_activity: {
      // Common soil management practices - with contextual emojis
      tillage: 'Tillage Operation',
      cultivation: 'Cultivation',
      soil_testing: 'Soil Testing',
      soil_amendment: 'Soil Amendment Application',
      drainage_installation: 'Drainage Installation',
      terracing: 'Terracing/Erosion Control',
      compaction_relief: 'Compaction Relief',
      organic_matter_addition: 'Organic Matter Addition',
      ph_adjustment: 'pH Adjustment',
      nutrient_management: 'Nutrient Management',
      cover_crop_termination: 'Cover Crop Termination',
      residue_management: 'Crop Residue Management',
      soil_conservation: 'Soil Conservation Practice',
      moisture_management: 'Soil Moisture Management',
      structure_improvement: 'Soil Structure Improvement'
    },
    // ============================================================
    // Sprint 3 Epic 3.2: Consumer Trust Field Mappings
    // These provide consumer-friendly labels for trust-building fields
    // ============================================================
    organic_approved: {
      // Chemical event organic certification status
      // Run 8b (8b-06): "(Organic Certified)" said a listing certifies something; it does not.
      omri: 'OMRI Listed',
      omri_listed: 'OMRI Listed',
      wsda_listed: 'WSDA Listed',
      nop_seal_on_label: 'NOP seal on label',
      certifier_approved: 'Certifier-approved',
      usda_nop_approved: 'USDA NOP basis',
      organic_equivalent: 'Organic Equivalent',
      not_organic: 'Conventional (Not Organic)',
      transitional: 'Transitional (In Certification)',
      // Legacy backend values
      yes: 'Organic basis recorded',
      no: 'No organic basis',
      not_applicable: 'N/A'
    },
    seeds_source: {
      // Production event seed SOURCE for transparency — where the seed came from
      // (For regulatory classification, use seed_certification_status)
      farm_saved: 'Farm-Saved Seeds',
      local: 'Local Nursery/Supplier',
      cooperative: 'Farmer Cooperative',
      commercial: 'Commercial Supplier',
      other: 'Other Source',
      // Legacy backend values (migrated in 0152)
      certified_organic: 'Certified Organic Seeds',
      imported: 'Imported',
      certified: 'Certified Organic Seeds'
    },
    seed_certification_status: {
      // NOP 7 CFR 205.204 regulatory classification
      certified_organic: 'Certified Organic',
      transitional: 'Transitional',
      non_organic_untreated: 'Non-organic (Untreated)',
      non_organic_treated: 'Non-organic (Treated)'
    },
    water_source: {
      // Production event water source for transparency
      // Form values from ProductionTab.jsx
      well_groundwater: 'Well/Groundwater',
      municipal: 'Municipal Water Supply',
      rainwater_harvesting: 'Rainwater Harvesting',
      irrigation_canal: 'Irrigation Canal/District',
      river_stream: 'River/Stream',
      pond_reservoir: 'Pond/Reservoir',
      recycled_water: 'Recycled/Reclaimed Water',
      other: 'Other Source',
      // Legacy backend values
      well: 'Well Water',
      rainwater: 'Rainwater Harvesting',
      river: 'River/Stream',
      recycled: 'Recycled Water'
    },
    beneficial_insects_used: {
      // Pest management biological control indicator
      yes: 'Using Beneficial Insects',
      no: 'Not Using Beneficial Insects',
      planning: 'Planning to Implement'
    },
    // Phase 3: Electricity source for irrigation pump power
    electricity_source: {
      grid: 'Grid Electricity',
      solar: 'Solar',
      wind: 'Wind',
      diesel_generator: 'Diesel Generator',
      mixed: 'Mixed Sources'
    },
    // ============================================================
    // Chemical Subtype Mappings for Accurate Carbon Calculations
    // Added 2025-01-21: Provides consumer-friendly labels for chemical subtypes
    // These subtypes have significantly different carbon emission factors
    // ============================================================
    chemical_subtype: {
      // Herbicide subtypes (organic = 78% lower carbon than synthetic)
      synthetic_herbicide: 'Synthetic Herbicide',
      organic_herbicide: 'Organic/Natural Herbicide',
      // Fungicide subtypes (biological = 56% lower carbon than synthetic)
      synthetic_fungicide: 'Synthetic Fungicide',
      organic_fungicide: 'Organic/Natural Fungicide',
      copper_fungicide: 'Copper-Based Fungicide',
      sulfur_fungicide: 'Sulfur-Based Fungicide',
      biological_fungicide: 'Biological Fungicide',
      // Pesticide subtypes (biological = ~70% lower carbon than synthetic)
      synthetic_pesticide: 'Synthetic Pesticide',
      organic_pesticide: 'Organic/Natural Pesticide',
      biological_pesticide: 'Biological Pesticide',
      neonicotinoid: 'Neonicotinoid Insecticide',
      // Fertilizer subtypes (organic = 83% lower carbon than synthetic)
      synthetic_fertilizer: 'Synthetic Fertilizer',
      organic_fertilizer: 'Organic Fertilizer',
      // No emoji. One of the thirteen carried an hourglass, so the detail modal read
      // "⏳ Slow-Release Fertilizer" while the consumer card read "Slow-Release Fertilizer" —
      // and the ES map is keyed by the exact English string, which is why localizeFieldValue
      // needs its leading-emoji strip at all. Caught by chemicalSubtypeLabels.test.ts.
      slow_release_fertilizer: 'Slow-Release Fertilizer',
      // Generic/short-form subtypes (backend may send without type suffix)
      synthetic: 'Synthetic Chemical',
      organic: 'Organic/Natural',
      biological: 'Biological'
    },
    crop_growth_stage: {
      seedling: 'Seedling Stage',
      vegetative: 'Vegetative Growth',
      flowering: 'Flowering',
      pre_bloom: 'Pre-Bloom',
      bloom: 'Bloom',
      post_bloom: 'Post-Bloom',
      fruit_set: 'Fruit Set',
      fruit_development: 'Fruit Development',
      maturation: 'Maturation',
      harvest: 'Harvest Ready',
      dormant: 'Dormant',
      post_harvest: 'Post-Harvest'
    },
    // ============================================================
    // Growth Stage display map — used for variety/block_id/growth_stage universal fields
    // ============================================================
    growth_stage: {
      seedling: 'Seedling',
      vegetative: 'Vegetative',
      flowering: 'Flowering',
      pre_bloom: 'Pre-Bloom',
      bloom: 'Bloom',
      post_bloom: 'Post-Bloom',
      fruit_set: 'Fruit Set',
      fruit_development: 'Fruit Development',
      maturation: 'Maturation',
      harvest_ready: 'Harvest Ready',
      dormant: 'Dormant',
      post_harvest: 'Post-Harvest'
    },
    // ============================================================
    // Pollination subtype field mappings (PO events)
    // ============================================================
    pollinator_type: {
      honeybee: 'Honeybee',
      bumblebee: 'Bumblebee',
      mason_bee: 'Mason Bee',
      leafcutter_bee: 'Leafcutter Bee',
      wild_bee: 'Wild Bee',
      butterfly: 'Butterfly',
      moth: 'Moth',
      natural: 'Natural Pollinators',
      managed: 'Managed Hive',
      other: 'Other Pollinator'
    },
    // ============================================================
    // Post-Harvest Processing subtype field mappings (PH events)
    // ============================================================
    processing_type: {
      washing: 'Washing & Cleaning',
      sorting: 'Sorting & Grading',
      packing: 'Packing & Packaging',
      cooling: 'Pre-Cooling',
      drying: 'Drying',
      waxing: 'Waxing & Coating',
      trimming: 'Trimming & Cleaning',
      juicing: 'Juice Processing',
      dehydration: 'Dehydration',
      freezing: 'Freezing',
      other: 'Other Processing'
    },
    // ============================================================
    // Canopy Management subtype field mappings (CM events)
    // ============================================================
    canopy_operation: {
      pruning: 'Pruning',
      hedging: 'Hedging',
      topping: 'Topping',
      skirting: 'Skirting',
      thinning: 'Thinning',
      leaf_pulling: 'Leaf Pulling',
      shoot_positioning: 'Shoot Positioning',
      leaf_removal: 'Leaf Removal',
      defoliation: 'Defoliation',
      tucking: 'Tucking',
      suckering: 'Suckering',
      training: 'Training',
      other: 'Other Canopy Work'
    },
    // Frost Protection (FP) + Mowing/Orchard-Floor (MO) — Batch 3 (2026-06)
    protection_method: {
      wind_machine: 'Wind Machine',
      orchard_heater: 'Orchard Heater(s)',
      under_tree_sprinkler: 'Under-Tree Sprinklers',
      other: 'Other Frost Protection'
    },
    // `flame_weed` added 2026-07; `herbicide_strip` dropped from the FORM picker but kept
    // here so already-saved events still render a label instead of the raw slug. See
    // FLOOR_MANAGEMENT_LABELS in src/config/events/productionEvent.ts for the rationale
    // (organic ICP; a synthetic herbicide strip is prohibited under 7 CFR 205.105).
    floor_management_type: {
      mow: 'Mow',
      mulch: 'Mulch',
      cover_crop_mgmt: 'Cover-Crop Management',
      flame_weed: 'Flame Weeding',
      herbicide_strip: 'Herbicide Strip' // legacy value — no longer offered in the form
    },
    // Organic compliance fields (NOP record-keeping)
    treated_or_untreated: {
      untreated: 'Untreated',
      organically_treated: 'Organically Treated'
    },
    previous_use: {
      organic: 'Organic Production Only',
      conventional: 'Conventional Production',
      mixed: 'Mixed (Organic & Conventional)',
      unknown: 'Unknown'
    },
    cleaning_protocol: {
      water_rinse: 'Water Rinse',
      detergent: 'Detergent Wash',
      triple_rinse: 'Triple Rinse',
      steam: 'Steam Cleaning',
      other: 'Other Method'
    },
    compost_temperature_reached_131f: {
      yes: 'Yes (NOP Compliant)',
      no: 'No',
      not_measured: 'Not Measured'
    }
  };

  return fieldMappings[field]?.[value] || value;
}

/** English short month (what the registry formatters print) -> its Spanish abbreviation. */
const ES_MONTHS_SHORT: Record<string, string> = {
  Jan: 'ene',
  Feb: 'feb',
  Mar: 'mar',
  Apr: 'abr',
  May: 'may',
  Jun: 'jun',
  Jul: 'jul',
  Aug: 'ago',
  Sep: 'sep',
  Oct: 'oct',
  Nov: 'nov',
  Dec: 'dic'
};

/**
 * R2 (2026-06-14): localize a consumer-facing enum field VALUE to es-419.
 * Field labels localize via the registry labelKey→i18n; the values are raw enum
 * display strings (e.g. "Soil Testing", "Diesel"). Maps by exact string via
 * FIELD_VALUE_ES when locale is es-*. Strips a leading emoji/symbol run before
 * lookup so legacy formatter outputs ("⛽ Diesel") resolve to the same key, then
 * re-prepends it. Unknown values (numbers, units, farmer free-text, cert program
 * names) pass through unchanged.
 */
export function localizeFieldValue(
  value: string | number | null | undefined,
  locale?: string
): string {
  const str = value == null ? '' : String(value);
  if (!str || !locale || !locale.toLowerCase().startsWith('es')) return str;
  const exact = FIELD_VALUE_ES[str];
  if (exact) return exact;
  // Leading emoji/symbol prefix (e.g. "⛽ Diesel") → translate the text remainder.
  const m = str.match(/^([^\p{L}\p{N}(]+\s*)(.+)$/u);
  if (m) {
    const tr = FIELD_VALUE_ES[m[2]];
    if (tr) return m[1] + tr;
  }
  // "MMM YYYY" date label (e.g. habitat install date "Feb 2019"). The registry formatter is
  // locale-blind (the resolver passes no intl), so the English month token leaks onto the es
  // page; the dynamic year can't be a FIELD_VALUE_ES key, so translate the month here.
  const md = str.match(/^([A-Z][a-z]{2}) (\d{4})$/);
  if (md) {
    const mo = ES_MONTHS_SHORT[md[1]];
    if (mo) return `${mo} ${md[2]}`;
  }
  // "MMM D, YYYY" (formatDate's day form, e.g. a planned harvest "Jun 20, 2027") reads "20 jun
  // 2027" in Spanish, the order the rest of the page uses (VID-07).
  const mdy = str.match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/);
  if (mdy) {
    const mo = ES_MONTHS_SHORT[mdy[1]];
    if (mo) return `${mdy[2]} ${mo} ${mdy[3]}`;
  }
  // "<number> <unit>" technical counts (e.g. monitoring "5 per leaf") — translate a KNOWN unit
  // suffix; unknown suffixes (farmer free-text like "5000 eggs/acre") pass through unchanged.
  // Thousands separators too ("1,250 gallons"), which the formatters print for large quantities.
  const um = str.match(/^(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s+(.+)$/);
  if (um) {
    const unitEs = FIELD_VALUE_ES[um[2]];
    if (unitEs) return `${um[1]} ${unitEs}`;
  }
  return str;
}

export interface FieldDisplayItem {
  label: string;
  value: string;
  priority: 'immediate' | 'secondary' | 'details';
  category:
    | 'weather'
    | 'application'
    | 'measurement'
    | 'verification'
    | 'environmental'
    | 'operational'
    | 'documentation';
  icon?: string;
  tooltip?: string;
}

export interface EventFieldDisplay {
  immediate: FieldDisplayItem[];
  secondary: FieldDisplayItem[];
  details: FieldDisplayItem[];
}

/**
 * 🚨 CRITICAL: Merge custom fields into field display arrays
 *
 * Custom fields must appear seamlessly integrated with standard fields.
 * This ensures EventPreviewModal and ConsumerEventCard show identical content.
 *
 * @param fieldDisplay Base field display from standard fields
 * @param event Event object containing custom_fields
 * @returns Field display with custom fields merged into secondary array
 */
/**
 * Append the farmer's consumer-visible custom fields to a resolved field display.
 *
 * Exported (2026-07) because ConsumerEventCard also needs it on the FIELD-REGISTRY path.
 * Previously this ran only inside `getEventFieldDisplay()`, the legacy path — so with
 * `VITE_USE_FIELD_REGISTRY=true` (the default in every env file) any event that resolved
 * at least one registry field returned early and the farmer's custom fields silently
 * vanished from the consumer card. A farmer could add a field, mark it consumer-visible,
 * see it in the producer preview, and have it never appear on the public page.
 */
export function mergeCustomFieldsIntoDisplay(
  fieldDisplay: EventFieldDisplay,
  event: any
): EventFieldDisplay {
  // 🚨 CRITICAL FIX: Access custom fields from BOTH locations for preview-display consistency
  // - eventDataNormalizer saves to event.custom_fields (for preview)
  // - Backend data may have event.extra_data.custom_fields (for ProductDetail)
  const customFields = event?.custom_fields || event?.extra_data?.custom_fields;

  if (!customFields || !Array.isArray(customFields) || customFields.length === 0) {
    return fieldDisplay;
  }

  // Filter for consumer-visible, non-empty custom fields
  const visibleFields = customFields.filter(
    (field: any) =>
      field.visibility === 'consumer' &&
      field.value !== null &&
      field.value !== undefined &&
      String(field.value).trim() !== ''
  );

  if (visibleFields.length === 0) {
    return fieldDisplay;
  }

  // Convert custom fields to FieldDisplayItem format
  // Display ALL custom fields as-is - farmer is responsible for avoiding duplicates during event creation
  const customFieldItems: FieldDisplayItem[] = visibleFields.map((field: any) => {
    let displayValue = String(field.value);

    // Apply type-specific formatting (matches customFieldsUtils.ts logic)
    switch (field.field_type) {
      case 'number':
        const num = parseFloat(displayValue);
        displayValue = !isNaN(num) ? num.toLocaleString() : displayValue;
        break;
      case 'link':
        if (field.link_url) {
          displayValue = `${displayValue} 🔗`;
        }
        break;
      case 'photo_ref':
        displayValue = `${displayValue} 📷`;
        break;
    }

    // Add verification indicator if third-party verified
    if (field.verification === 'third_party') {
      displayValue = `${displayValue} ✓`;
    }

    return {
      label: field.label,
      value: displayValue,
      priority: 'secondary', // Custom fields appear in secondary section
      // `category` is required by FieldDisplayItem and was omitted here. Farmer-authored
      // fields are documentation — they are not measurements or verifications, and mislabelling
      // them would put them in the wrong group wherever a surface sorts by category.
      category: 'documentation' as const
    };
  });

  // Merge custom fields into secondary array (appears after standard fields)
  return {
    ...fieldDisplay,
    secondary: [...fieldDisplay.secondary, ...customFieldItems]
  };
}
