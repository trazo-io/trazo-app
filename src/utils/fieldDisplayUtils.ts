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
      diesel: '⛽ Diesel',
      gasoline: '⛽ Gasoline',
      biodiesel: '🌿 Biodiesel',
      electric: '⚡ Electric',
      natural_gas: '💨 Natural Gas',
      propane: '🔥 LPG / Propane',
      none: '🔧 No Fuel / Manual'
    },
    equipment_type: {
      // Generic equipment types
      tractor: '🚜 Tractor',
      harvester: '🌾 Harvester/Combine',
      sprayer: '💨 Sprayer',
      cultivator: '🔨 Cultivator',
      transport: '🚛 Transport Vehicle',
      irrigation_pump: '💧 Irrigation Pump',
      truck: '🚛 Truck/Transport',
      generator: '⚡ Generator',
      pump: '💧 Irrigation Pump',
      other: '🔧 Other Equipment',
      // Specific tractor sizes
      tractor_small: '🚜 Small Tractor (25-75 HP)',
      tractor_medium: '🚜 Medium Tractor (75-150 HP)',
      tractor_large: '🚜 Large Tractor (150+ HP)'
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
      high: '✅ High Efficiency',
      normal: '➖ Normal Efficiency',
      low: '⚠️ Low Efficiency'
    },
    weather_conditions: {
      // 🔧 Added weather emojis for consumer-friendly display
      calm_dry: '☀️ Calm & Dry - Ideal conditions',
      clear_calm: '☀️ Clear & Calm - Ideal conditions',
      light_wind: '🌤️ Light Wind - Suitable conditions',
      humid: '💧 Humid - Acceptable conditions',
      windy: '💨 Windy - Challenging conditions',
      // Legacy mappings for backward compatibility
      calm_wet: '🌧️ Calm, wet conditions',
      windy_dry: '💨 Windy, dry conditions',
      windy_wet: '🌬️ Windy, wet conditions',
      rainy: '🌧️ Rainy conditions',
      sunny: '☀️ Sunny conditions',
      cloudy: '☁️ Cloudy conditions',
      partly_cloudy: '⛅ Partly Cloudy - Good conditions',
      overcast: '☁️ Overcast conditions',
      overcast_humid: '☁️💧 Overcast & Humid'
    },
    application_timing: {
      // 🔧 Added emojis for consumer-friendly display
      pre_plant: '🌱 Pre-Planting',
      post_emergence: '🌿 Post-Emergence',
      flowering: '🌸 Flowering Stage',
      pre_bloom: '🌸 Pre-Bloom Stage',
      fruit_set: '🍊 Fruit Set Stage',
      post_bloom: '🍊 Post-Bloom Stage',
      fruit_development: '🍎 Fruit Development',
      harvest: '🌾 Pre-Harvest',
      // Legacy mappings for backward compatibility
      at_plant: '🌱 At planting',
      post_plant: '🌿 After planting',
      pre_harvest: '🌾 Before harvest',
      post_harvest: '📦 After harvest',
      early_season: '🌱 Early season',
      mid_season: '🌿 Mid season',
      late_season: '🍂 Late season',
      dormant: '❄️ Dormant period',
      active_growth: '🌱 Active growth period'
    },
    way_of_application: {
      spray: '💦 Spray application',
      drip: '💧 Drip irrigation',
      broadcast: '📡 Broadcast application',
      injection: '💉 Soil injection',
      foliar: '🍃 Foliar spray',
      granular: '⚫ Granular application',
      liquid: '💧 Liquid application',
      powder: '🔵 Powder application'
    },
    application_method: {
      // Fertilizer methods
      broadcast_surface: '📡 Broadcast Surface - Uniform spreading',
      broadcast_incorporated: '🔄 Broadcast Incorporated - Mixed into soil',
      band_placement: '📏 Band Placement - Precise placement',
      side_dress: '🌱 Side Dress - Growing season application',
      fertigation: '💧 Fertigation - Through irrigation',
      foliar_feed: '🍃 Foliar Feed - Leaf application',
      soil_injection: '💉 Soil Injection - Liquid fertilizer',
      granular_spreader: '⚙️ Granular Spreader - Mechanical application',
      // EPA Standard Methods (Sprint 6 - 2025-12-23)
      ground_spray: '🌊 Ground Spray - Spray application to crops/soil',
      chemigation: '💧 Chemigation - Through irrigation system',
      aerial_spray: '✈️ Aerial Spray - Aircraft application',
      // Pesticide methods
      broadcast_spray: '💦 Broadcast Spray - Full field coverage',
      band_spray: '🎯 Band Spray - Row treatment',
      soil_incorporation: '🔄 Soil Incorporation - Mixed into soil',
      granular_preemergent: '⚫ Granular Pre-Emergent - Soil surface',
      // Fungicide methods
      foliar_spray: '🍃 Foliar Spray - Leaf surface treatment',
      air_blast_sprayer: '🌬️ Air Blast Sprayer - Orchard/vineyard coverage',
      soil_drench: '🌊 Soil Drench - Root zone treatment',
      seed_treatment: '🌰 Seed Treatment - Preventive coating',
      trunk_injection: '🌳 Trunk Injection - Tree treatment',
      dusting: '🔵 Dusting - Powder application',
      // Herbicide methods
      pre_plant_incorporated: '🔄 Pre-Plant Incorporated - Soil preparation',
      pre_emergence: '🌱 Pre-Emergence - Before sprouting',
      post_emergence_directed: '🎯 Post-Emergence Directed - Targeted application',
      post_emergence_over_top: '📡 Post-Emergence Over-Top - Full coverage',
      spot_treatment: '📍 Spot Treatment - Localized application',
      // Form dropdown values (Sprint 2 Epic 2.2 standardized methods)
      banded: '📏 Banded - Precise row/band placement',
      subsurface: '💉 Subsurface - Below soil surface injection',
      // Legacy/generic mappings
      spray: '💦 Spray Application',
      broadcast: '📡 Broadcast Application',
      broadcast_spreader: '📡 Broadcast Spreader - Uniform spreading',
      drip: '💧 Drip/Irrigation',
      foliar: '🍃 Foliar Application',
      injection: '💉 Soil Injection',
      granular: '⚫ Granular Application'
    },
    // SOIL MANAGEMENT FIELD MAPPINGS (Type 5)
    soil_moisture: {
      dry: '🏜️ Dry',
      moderate: '🌱 Moderate',
      moist: '💧 Moist',
      wet: '🌊 Wet'
    },
    soil_texture: {
      // Primary soil textures - using contextual emojis
      sandy: '🏖️ Sandy',
      sandy_loam: '🏖️ Sandy Loam',
      loam: '🌱 Loam',
      clay_loam: '🧱 Clay Loam',
      clay: '🧱 Clay',
      silt: '💨 Silt',
      silt_loam: '💨 Silt Loam',
      silty_clay: '💨 Silty Clay',
      silty_clay_loam: '💨 Silty Clay Loam',
      sandy_clay: '🏖️ Sandy Clay',
      sandy_clay_loam: '🏖️ Sandy Clay Loam',
      // Additional soil type variations
      coarse_sandy: '🏖️ Coarse Sandy',
      fine_sandy: '🏖️ Fine Sandy',
      very_fine_sandy_loam: '🏖️ Very Fine Sandy Loam',
      organic: '🌿 Organic Soil',
      peat: '🌿 Peat Soil',
      muck: '🌿 Muck Soil'
    },
    equipment_used: {
      // Soil management specific equipment
      plow: '🚜 Plow',
      disk_harrow: '🚜 Disk Harrow',
      field_cultivator: '🚜 Field Cultivator',
      chisel_plow: '🚜 Chisel Plow',
      subsoiler: '🚜 Subsoiler',
      rototiller: '🚜 Rototiller',
      moldboard_plow: '🚜 Moldboard Plow',
      offset_disk: '🚜 Offset Disk',
      tandem_disk: '🚜 Tandem Disk',
      spring_tooth_harrow: '🚜 Spring Tooth Harrow',
      spike_tooth_harrow: '🚜 Spike Tooth Harrow',
      roller: '🚜 Roller/Compactor',
      leveler: '🚜 Land Leveler',
      soil_sampler: '🔬 Soil Sampler',
      ph_meter: '📊 pH Meter',
      soil_probe: '🔬 Soil Probe',
      drainage_plow: '🚜 Drainage Plow',
      terracing_equipment: '🚜 Terracing Equipment',
      // General equipment that might be used
      tractor: '🚜 Tractor',
      hand_tools: '🔧 Hand Tools',
      no_till_drill: '🚜 No-Till Drill',
      seeder: '🚜 Seeder',
      broadcast_spreader: '🚜 Broadcast Spreader'
    },
    soil_management_activity: {
      // Common soil management practices - with contextual emojis
      tillage: '🚜 Tillage Operation',
      cultivation: '🌱 Cultivation',
      soil_testing: '🔬 Soil Testing',
      soil_amendment: '🧪 Soil Amendment Application',
      drainage_installation: '💧 Drainage Installation',
      terracing: '🏔️ Terracing/Erosion Control',
      compaction_relief: '⚒️ Compaction Relief',
      organic_matter_addition: '🌿 Organic Matter Addition',
      ph_adjustment: '⚖️ pH Adjustment',
      nutrient_management: '🧬 Nutrient Management',
      cover_crop_termination: '🌾 Cover Crop Termination',
      residue_management: '♻️ Crop Residue Management',
      soil_conservation: '🛡️ Soil Conservation Practice',
      moisture_management: '💦 Soil Moisture Management',
      structure_improvement: '🔧 Soil Structure Improvement'
    },
    // ============================================================
    // Sprint 3 Epic 3.2: Consumer Trust Field Mappings
    // These provide consumer-friendly labels for trust-building fields
    // ============================================================
    organic_approved: {
      // Chemical event organic certification status
      omri: '✅ OMRI Listed (Organic Certified)',
      omri_listed: '✅ OMRI Listed (Organic Certified)',
      usda_nop_approved: '🌱 USDA NOP Approved',
      organic_equivalent: '🌿 Organic Equivalent',
      not_organic: '⚠️ Conventional (Not Organic)',
      transitional: '🔄 Transitional (In Certification)',
      // Legacy backend values
      yes: '✅ Organic Approved',
      no: '❌ Not Organic Approved',
      not_applicable: 'N/A'
    },
    seeds_source: {
      // Production event seed SOURCE for transparency — where the seed came from
      // (For regulatory classification, use seed_certification_status)
      farm_saved: '♻️ Farm-Saved Seeds',
      local: '🏡 Local Nursery/Supplier',
      cooperative: '🤝 Farmer Cooperative',
      commercial: '🏭 Commercial Supplier',
      other: '📝 Other Source',
      // Legacy backend values (migrated in 0152)
      certified_organic: '🌱 Certified Organic Seeds',
      imported: '✈️ Imported',
      certified: '✅ Certified Organic Seeds'
    },
    seed_certification_status: {
      // NOP 7 CFR 205.204 regulatory classification
      certified_organic: '🌱 Certified Organic',
      transitional: '🔄 Transitional',
      non_organic_untreated: '⚪ Non-organic (Untreated)',
      non_organic_treated: '⚠️ Non-organic (Treated)'
    },
    water_source: {
      // Production event water source for transparency
      // Form values from ProductionTab.jsx
      well_groundwater: '💧 Well/Groundwater',
      municipal: '🏢 Municipal Water Supply',
      rainwater_harvesting: '🌧️ Rainwater Harvesting',
      irrigation_canal: '🚿 Irrigation Canal/District',
      river_stream: '🏞️ River/Stream',
      pond_reservoir: '🌊 Pond/Reservoir',
      recycled_water: '♻️ Recycled/Reclaimed Water',
      other: '📝 Other Source',
      // Legacy backend values
      well: '💧 Well Water',
      rainwater: '🌧️ Rainwater Harvesting',
      river: '🏞️ River/Stream',
      recycled: '♻️ Recycled Water'
    },
    beneficial_insects_used: {
      // Pest management biological control indicator
      yes: '🐞 Using Beneficial Insects',
      no: 'Not Using Beneficial Insects',
      planning: '📋 Planning to Implement'
    },
    // Phase 3: Electricity source for irrigation pump power
    electricity_source: {
      grid: '⚡ Grid Electricity',
      solar: '☀️ Solar',
      wind: '💨 Wind',
      diesel_generator: '⛽ Diesel Generator',
      mixed: '🔀 Mixed Sources'
    },
    // ============================================================
    // Chemical Subtype Mappings for Accurate Carbon Calculations
    // Added 2025-01-21: Provides consumer-friendly labels for chemical subtypes
    // These subtypes have significantly different carbon emission factors
    // ============================================================
    chemical_subtype: {
      // Herbicide subtypes (organic = 78% lower carbon than synthetic)
      synthetic_herbicide: '🏭 Synthetic Herbicide',
      organic_herbicide: '🌿 Organic/Natural Herbicide',
      // Fungicide subtypes (biological = 56% lower carbon than synthetic)
      synthetic_fungicide: '🏭 Synthetic Fungicide',
      organic_fungicide: '🌿 Organic/Natural Fungicide',
      copper_fungicide: '🔶 Copper-Based Fungicide',
      sulfur_fungicide: '🟡 Sulfur-Based Fungicide',
      biological_fungicide: '🌱 Biological Fungicide',
      // Pesticide subtypes (biological = ~70% lower carbon than synthetic)
      synthetic_pesticide: '🏭 Synthetic Pesticide',
      organic_pesticide: '🌿 Organic/Natural Pesticide',
      biological_pesticide: '🌱 Biological Pesticide',
      neonicotinoid: '🏭 Neonicotinoid Insecticide',
      // Fertilizer subtypes (organic = 83% lower carbon than synthetic)
      synthetic_fertilizer: '🏭 Synthetic Fertilizer',
      organic_fertilizer: '🌱 Organic Fertilizer',
      slow_release_fertilizer: '⏳ Slow-Release Fertilizer',
      // Generic/short-form subtypes (backend may send without type suffix)
      synthetic: '🏭 Synthetic Chemical',
      organic: '🌿 Organic/Natural',
      biological: '🌱 Biological'
    },
    crop_growth_stage: {
      seedling: '🌱 Seedling Stage',
      vegetative: '🌿 Vegetative Growth',
      flowering: '🌸 Flowering',
      pre_bloom: '🌸 Pre-Bloom',
      bloom: '🌸 Bloom',
      post_bloom: '🍊 Post-Bloom',
      fruit_set: '🍊 Fruit Set',
      fruit_development: '🍎 Fruit Development',
      maturation: '🍊 Maturation',
      harvest: '🌾 Harvest Ready',
      dormant: '❄️ Dormant',
      post_harvest: '📦 Post-Harvest'
    },
    // ============================================================
    // Growth Stage display map — used for variety/block_id/growth_stage universal fields
    // ============================================================
    growth_stage: {
      seedling: '🌱 Seedling',
      vegetative: '🌿 Vegetative',
      flowering: '🌸 Flowering',
      pre_bloom: '🌸 Pre-Bloom',
      bloom: '🌸 Bloom',
      post_bloom: '🍊 Post-Bloom',
      fruit_set: '🍊 Fruit Set',
      fruit_development: '🍎 Fruit Development',
      maturation: '🍊 Maturation',
      harvest_ready: '🌾 Harvest Ready',
      dormant: '❄️ Dormant',
      post_harvest: '📦 Post-Harvest'
    },
    // ============================================================
    // Pollination subtype field mappings (PO events)
    // ============================================================
    pollinator_type: {
      honeybee: '🐝 Honeybee',
      bumblebee: '🐝 Bumblebee',
      mason_bee: '🐝 Mason Bee',
      leafcutter_bee: '🐝 Leafcutter Bee',
      wild_bee: '🐝 Wild Bee',
      butterfly: '🦋 Butterfly',
      moth: '🦋 Moth',
      natural: '🌿 Natural Pollinators',
      managed: '🐝 Managed Hive',
      other: '🐝 Other Pollinator'
    },
    // ============================================================
    // Post-Harvest Processing subtype field mappings (PH events)
    // ============================================================
    processing_type: {
      washing: '💧 Washing & Cleaning',
      sorting: '📦 Sorting & Grading',
      packing: '📦 Packing & Packaging',
      cooling: '❄️ Pre-Cooling',
      drying: '☀️ Drying',
      waxing: '✨ Waxing & Coating',
      trimming: '✂️ Trimming & Cleaning',
      juicing: '🧃 Juice Processing',
      dehydration: '🌬️ Dehydration',
      freezing: '❄️ Freezing',
      other: '📦 Other Processing'
    },
    // ============================================================
    // Canopy Management subtype field mappings (CM events)
    // ============================================================
    canopy_operation: {
      pruning: '✂️ Pruning',
      hedging: '🌳 Hedging',
      topping: '✂️ Topping',
      skirting: '✂️ Skirting',
      thinning: '🪚 Thinning',
      leaf_pulling: '🍃 Leaf Pulling',
      shoot_positioning: '🌱 Shoot Positioning',
      leaf_removal: '🍃 Leaf Removal',
      defoliation: '🍂 Defoliation',
      tucking: '🤲 Tucking',
      suckering: '🌿 Suckering',
      training: '🪴 Training',
      other: '✂️ Other Canopy Work'
    },
    // Frost Protection (FP) + Mowing/Orchard-Floor (MO) — Batch 3 (2026-06)
    protection_method: {
      wind_machine: '🌀 Wind Machine',
      orchard_heater: '🔥 Orchard Heater(s)',
      under_tree_sprinkler: '💧 Under-Tree Sprinklers',
      other: '❄️ Other Frost Protection'
    },
    floor_management_type: {
      mow: '🌱 Mow',
      mulch: '🍂 Mulch',
      cover_crop_mgmt: '🌿 Cover-Crop Management',
      herbicide_strip: '🚿 Herbicide Strip'
    },
    // Organic compliance fields (NOP record-keeping)
    treated_or_untreated: {
      untreated: 'Untreated',
      organically_treated: 'Organically Treated'
    },
    previous_use: {
      organic: '🌱 Organic Production Only',
      conventional: '🏭 Conventional Production',
      mixed: '🔀 Mixed (Organic & Conventional)',
      unknown: '❓ Unknown'
    },
    cleaning_protocol: {
      water_rinse: '💧 Water Rinse',
      detergent: '🧴 Detergent Wash',
      triple_rinse: '💧💧💧 Triple Rinse',
      steam: '♨️ Steam Cleaning',
      other: 'Other Method'
    },
    compost_temperature_reached_131f: {
      yes: '✅ Yes (NOP Compliant)',
      no: '❌ No',
      not_measured: '❓ Not Measured'
    }
  };

  return fieldMappings[field]?.[value] || value;
}

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
 * Extract and format weather event fields according to display matrix
 */
export function getWeatherEventFields(event: any): EventFieldDisplay {
  const immediate: FieldDisplayItem[] = [];
  const secondary: FieldDisplayItem[] = [];
  const details: FieldDisplayItem[] = [];

  // Weather event subtype detection
  const description = event.description?.toLowerCase() || '';
  const extraData = event.extra_data || {};

  // Detect weather event type from form data type field as well
  // Normalize: serializer returns "event.weather.frost" but code checks 2-letter codes like 'FR'
  const rawWeatherType = event.weather_type || event.type || extraData.type || '';
  const serializedTypeMap: Record<string, string> = {
    'event.weather.frost': 'FR',
    'event.weather.drought': 'DR',
    'event.weather.hailstorm': 'HL',
    'event.weather.high_temperature': 'HT',
    'event.weather.tropical_storm': 'TS',
    'event.weather.high_winds': 'HW',
    'event.weather.high_humidity': 'HH',
    'event.weather.low_humidity': 'LH'
  };
  const weatherType = serializedTypeMap[rawWeatherType] || rawWeatherType;

  // Weather field processing for frost events and other weather types

  // Frost Events (FR) - also check for type field
  if (description.includes('frost') || description.includes('freeze') || weatherType === 'FR') {
    // Check normalized event first, then fallback to extra_data
    const temperatureValue = isValidValue(event.lower_temperature)
      ? event.lower_temperature
      : extraData.lower_temperature;
    if (isValidValue(temperatureValue)) {
      // Handle both string (e.g., "-2°C") and number (e.g., -2) formats
      let tempDisplay = '';
      const tempValue = temperatureValue;

      if (typeof tempValue === 'string') {
        // If it's already formatted with units, use as-is
        if (tempValue.includes('°C') || tempValue.includes('°F')) {
          tempDisplay = tempValue;
        } else {
          // If it's a string number, parse and format
          const numTemp = parseFloat(tempValue);
          if (!isNaN(numTemp)) {
            tempDisplay = `${numTemp}°C (${((numTemp * 9) / 5 + 32).toFixed(1)}°F)`;
          } else {
            tempDisplay = tempValue; // Use as-is if can't parse
          }
        }
      } else if (typeof tempValue === 'number') {
        // If it's a number, format with conversions
        tempDisplay = `${tempValue}°C (${((tempValue * 9) / 5 + 32).toFixed(1)}°F)`;
      } else {
        tempDisplay = String(tempValue);
      }

      immediate.push({
        label: 'Minimum Temperature',
        value: tempDisplay,
        priority: 'immediate',
        category: 'weather'
      });
    }

    // Check normalized event first, then fallback to extra_data
    const protectionValue =
      event.way_of_protection ||
      event.protection_measures ||
      extraData.way_of_protection ||
      extraData.protection_measures;
    if (protectionValue) {
      immediate.push({
        label: 'Protection Measures',
        value: protectionValue,
        priority: 'immediate',
        category: 'environmental'
      });
    }
    // Check normalized event first, then fallback to extra_data
    const durationValue = event.duration !== undefined ? event.duration : extraData.duration;
    if (durationValue) {
      secondary.push({
        label: 'Duration',
        value: `${durationValue} hours`,
        priority: 'secondary',
        category: 'measurement'
      });
    }
  }

  // High Temperature Events (HT)
  if (
    description.includes('high temperature') ||
    description.includes('heat') ||
    weatherType === 'HT'
  ) {
    // Check event object field first (from form), then fallback to extraData
    const temperatureValue = event.highest_temperature || extraData.highest_temperature;
    if (isValidValue(temperatureValue)) {
      // Parse temperature value - handle both numeric and string values (e.g., "44°C")
      const tempValue =
        typeof temperatureValue === 'string'
          ? parseFloat(temperatureValue.replace(/[°C°F]/g, ''))
          : temperatureValue;

      let tempDisplay;
      if (!isNaN(tempValue) && typeof tempValue === 'number') {
        // If it's a valid number, format with conversions
        tempDisplay = `${tempValue}°C (${((tempValue * 9) / 5 + 32).toFixed(1)}°F)`;
      } else {
        // If we can't parse it as a number, display as-is
        tempDisplay = String(temperatureValue);
      }

      immediate.push({
        label: 'Peak Temperature',
        value: tempDisplay,
        priority: 'immediate',
        category: 'weather'
      });
    }

    // Check event object field first (from form), then fallback to extraData
    const startDateValue = event.start_date || extraData.start_date;
    if (startDateValue) {
      // Format the date to be human-readable
      const formattedStartDate = new Date(startDateValue).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      secondary.push({
        label: 'Start Date',
        value: formattedStartDate,
        priority: 'secondary',
        category: 'timing'
      });
    }

    // Check event object field first (from form), then fallback to extraData
    const endDateValue = event.end_date || extraData.end_date;
    if (endDateValue) {
      // Format the date to be human-readable
      const formattedEndDate = new Date(endDateValue).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      secondary.push({
        label: 'End Date',
        value: formattedEndDate,
        priority: 'secondary',
        category: 'timing'
      });
    }

    // Check event object field first (from form), then fallback to extraData
    const protectionValue = event.protection_measures || extraData.protection_measures;
    if (protectionValue) {
      immediate.push({
        label: 'Heat Protection',
        value: protectionValue,
        priority: 'immediate',
        category: 'environmental'
      });
    }
  }

  // Drought Events (DR)
  if (
    description.includes('drought') ||
    description.includes('water deficit') ||
    weatherType === 'DR'
  ) {
    // Check normalized event first, then fallback to extra_data
    const waterDeficitValue = isValidValue(event.water_deficit)
      ? event.water_deficit
      : extraData.water_deficit;
    if (isValidValue(waterDeficitValue)) {
      immediate.push({
        label: 'Water Deficit',
        value: `${waterDeficitValue}mm`,
        priority: 'immediate',
        category: 'measurement'
      });
    }

    // Check normalized event first, then fallback to extra_data
    const cropImpactValue = event.crop_impact || extraData.crop_impact;
    if (cropImpactValue) {
      secondary.push({
        label: 'Crop Impact',
        value: cropImpactValue,
        priority: 'secondary',
        category: 'environmental'
      });
    }
  }

  // Hailstorm Events (HL)
  if (description.includes('hail') || weatherType === 'HL') {
    // Sprint 2 Epic 2.1.3: Removed weight and diameter fields (excessive detail, removed from form)

    // 🚨 CRITICAL FIX: Hailstorm duration should be in MINUTES (short events), not hours
    // Check event object field first (from form), then fallback to extraData and normalized fields
    const durationValue = event.duration || extraData.duration;
    if (isValidValue(durationValue)) {
      secondary.push({
        label: 'Duration',
        value: `${durationValue} minutes`, // 🚨 FIX: Added "minutes" unit for Hailstorm events
        priority: 'secondary',
        category: 'measurement'
      });
    }

    // 🚨 CRITICAL FIX: Consolidate protection fields to prevent duplicates
    // Check event object field first (from form), then fallback to extraData and normalized fields
    // ONLY check way_of_protection and protection_measures ONCE, not separately
    const protectionValue =
      event.way_of_protection ||
      event.protection_measures ||
      extraData.way_of_protection ||
      extraData.protection_measures;
    if (protectionValue) {
      immediate.push({
        label: 'Protection Method', // 🚨 FIX: Single consolidated label
        value: protectionValue,
        priority: 'immediate',
        category: 'environmental'
      });
    }

    if (extraData.damage_assessment) {
      immediate.push({
        label: 'Damage Assessment',
        value: extraData.damage_assessment,
        priority: 'immediate',
        category: 'environmental'
      });
    }
  }

  // Tropical Storm Events (TS) and High Winds Events (HW)
  // CRITICAL: Exclude other weather types that have their own handlers above
  // to prevent duplicate "Protection Measures" fields
  const handledWeatherTypes = ['FR', 'HL', 'HT', 'DR', 'HH', 'LH'];
  if (
    (description.includes('storm') ||
      description.includes('wind') ||
      weatherType === 'TS' ||
      weatherType === 'HW') &&
    !handledWeatherTypes.includes(weatherType) &&
    !description.includes('hail')
  ) {
    // Check event object field first (from form), then fallback to extraData
    const windSpeedValue = event.wind_speed || extraData.wind_speed;
    if (isValidValue(windSpeedValue)) {
      immediate.push({
        label: 'Wind Speed',
        value: `${windSpeedValue} km/h`,
        priority: 'immediate',
        category: 'weather'
      });
    }

    // Check event object field first (from form), then fallback to extraData
    const precipitationValue = event.precipitation_amount || extraData.precipitation_amount;
    if (isValidValue(precipitationValue)) {
      secondary.push({
        label: 'Rainfall',
        value: `${precipitationValue}mm`,
        priority: 'secondary',
        category: 'measurement'
      });
    }

    // Check event object field first (from form), then fallback to extraData
    const durationValue = event.duration || extraData.duration;
    if (isValidValue(durationValue)) {
      secondary.push({
        label: 'Duration',
        value: `${durationValue} hours`,
        priority: 'secondary',
        category: 'measurement'
      });
    }

    // Check event object field first (from form), then fallback to extraData
    const damageAssessmentValue = event.damage_assessment || extraData.damage_assessment;
    if (damageAssessmentValue) {
      immediate.push({
        label: 'Damage Assessment',
        value: damageAssessmentValue,
        priority: 'immediate',
        category: 'environmental'
      });
    }
    const protectionValue =
      event.way_of_protection ||
      event.protection_measures ||
      extraData.way_of_protection ||
      extraData.protection_measures;
    if (protectionValue) {
      immediate.push({
        label: 'Protection Measures',
        value: protectionValue,
        priority: 'immediate',
        category: 'environmental'
      });
    }
  }

  // High Humidity Events (HH) and Low Humidity Events (LH)
  if (description.includes('humidity') || weatherType === 'HH' || weatherType === 'LH') {
    const humidityLevelValue = event.humidity_level || extraData.humidity_level;
    if (isValidValue(humidityLevelValue)) {
      immediate.push({
        label: 'Humidity Level',
        value: `${humidityLevelValue}%`,
        priority: 'immediate',
        category: 'weather'
      });
    }

    const durationValue = event.duration || extraData.duration;
    if (isValidValue(durationValue)) {
      secondary.push({
        label: 'Duration',
        value: `${durationValue} hours`,
        priority: 'secondary',
        category: 'measurement'
      });
    }

    const cropImpactValue = event.crop_impact || extraData.crop_impact;
    if (cropImpactValue) {
      secondary.push({
        label: 'Crop Impact',
        value: cropImpactValue,
        priority: 'secondary',
        category: 'environmental'
      });
    }
  }

  // Removed: Event Period field was redundant since we now show Start Date and End Date separately
  // in the High Temperature (HT) event section above

  // Removed legacy humidity level fallback - humidity fields should only appear for humidity-specific events

  return { immediate, secondary, details };
}

/**
 * Extract and format chemical event fields according to display matrix
 * Expects standardized event data from normalization layer
 */
export function getChemicalEventFields(event: any): EventFieldDisplay {
  const immediate: FieldDisplayItem[] = [];
  const secondary: FieldDisplayItem[] = [];
  const details: FieldDisplayItem[] = [];

  // Required fields - IMMEDIATE display
  // All fields now use standardized names after normalization
  if (event.commercial_name) {
    immediate.push({
      label: 'Product Name',
      value: event.commercial_name,
      priority: 'immediate',
      category: 'application'
    });
  }

  if (event.application_method) {
    immediate.push({
      label: 'Application Method',
      value: getReadableFieldValue('application_method', event.application_method),
      priority: 'immediate',
      category: 'application'
    });
  }

  if (event.target_pest_disease) {
    immediate.push({
      label: 'Target',
      value: event.target_pest_disease,
      priority: 'immediate',
      category: 'application'
    });
  }

  // Chemical Subtype - SECONDARY priority for transparency and carbon accuracy
  // Added 2025-01-21: Shows consumers whether organic/biological/synthetic chemicals were used
  // This is a key trust indicator since organic/biological options have significantly lower carbon footprints
  if (event.chemical_subtype) {
    secondary.push({
      label: 'Chemical Type',
      value: getReadableFieldValue('chemical_subtype', event.chemical_subtype),
      priority: 'secondary',
      category: 'verification',
      tooltip:
        'Type of chemical used - organic and biological options have significantly lower environmental impact'
    });
  }

  // Area and timing - SECONDARY display
  // Phase 3: Prefer area_numeric (new field) over legacy area_treated for display
  const areaNumericValue = isValidValue(event.area_numeric) ? event.area_numeric : null;
  const areaTreatedValue = isValidValue(event.area_treated) ? event.area_treated : null;
  const displayArea = areaNumericValue !== null ? areaNumericValue : areaTreatedValue;
  if (displayArea !== null && event.area_unit) {
    immediate.push({
      label: 'Area Treated',
      value: `${formatNumber(displayArea)} ${event.area_unit}`,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  if (event.application_timing) {
    secondary.push({
      label: 'Application Timing',
      value: getReadableFieldValue('application_timing', event.application_timing),
      priority: 'secondary',
      category: 'operational'
    });
  }

  if (event.weather_conditions) {
    secondary.push({
      label: 'Weather Conditions',
      value: getReadableFieldValue('weather_conditions', event.weather_conditions),
      priority: 'secondary',
      category: 'environmental'
    });
  }

  // Technical details - DETAILS section
  if (event.concentration) {
    const concentrationStr = String(event.concentration);
    // Check if this is an NPK ratio format (e.g., "5-1-1" or "10-10-10")
    // NPK ratios should NOT have a % suffix on the whole ratio
    const isNPKRatio = /^\d+-\d+-\d+$/.test(concentrationStr);

    // NPK format is displayed under "NPK Ratio" below — skip duplicate "Concentration" display
    if (!isNPKRatio) {
      const formattedConcentration = concentrationStr.includes('%')
        ? concentrationStr
        : `${concentrationStr}%`; // Single concentration value - add % if missing

      details.push({
        label: 'Concentration',
        value: formattedConcentration,
        priority: 'details',
        category: 'application'
      });
    }
  }

  // Phase 3: Prefer volume_numeric (new field) over legacy volume_applied for display
  const volumeNumericValue = isValidValue(event.volume_numeric) ? event.volume_numeric : null;
  const volumeAppliedValue = isValidValue(event.volume_applied) ? event.volume_applied : null;
  const displayVolume = volumeNumericValue !== null ? volumeNumericValue : volumeAppliedValue;
  if (displayVolume !== null && event.volume_unit) {
    const isMassUnit = ['kg', 'lbs', 'oz'].includes(event.volume_unit);
    immediate.push({
      label: isMassUnit ? 'Amount Applied' : 'Volume Applied',
      value: `${formatNumber(displayVolume)} ${event.volume_unit}`,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  if (event.active_ingredient) {
    details.push({
      label: 'Active Ingredient',
      value: event.active_ingredient,
      priority: 'details',
      category: 'application'
    });
  }

  // NPK ratio for fertilizers
  if (event.npk_ratio) {
    details.push({
      label: 'NPK Ratio',
      value: event.npk_ratio,
      priority: 'details',
      category: 'application'
    });
  }

  // Ghost field cleanup: Removed nitrogen_percentage/phosphorus_percentage/potassium_percentage
  // (never in form schema — form uses nitrogen_total_kg etc. for aggregate totals instead)

  // NPK total kg applied (from form's nitrogen_total_kg, phosphorus_total_kg, potassium_total_kg)
  if (
    isValidValue(event.nitrogen_total_kg) ||
    isValidValue(event.phosphorus_total_kg) ||
    isValidValue(event.potassium_total_kg)
  ) {
    const npkParts = [];
    if (isValidValue(event.nitrogen_total_kg)) npkParts.push(`N: ${event.nitrogen_total_kg} kg`);
    if (isValidValue(event.phosphorus_total_kg))
      npkParts.push(`P: ${event.phosphorus_total_kg} kg`);
    if (isValidValue(event.potassium_total_kg)) npkParts.push(`K: ${event.potassium_total_kg} kg`);

    if (npkParts.length > 0) {
      details.push({
        label: 'NPK Applied',
        value: npkParts.join(', '),
        priority: 'details',
        category: 'application'
      });
    }
  }

  // Phase 3: Fertigation indicator — only display when true (secondary trust indicator)
  const isfertigationTrue =
    event.is_fertigation === true ||
    event.is_fertigation === 'true' ||
    event.extra_data?.is_fertigation === true ||
    event.extra_data?.is_fertigation === 'true';
  if (isfertigationTrue) {
    secondary.push({
      label: 'Fertigation',
      value: 'Yes — fertilizer injected through irrigation',
      priority: 'secondary',
      category: 'application'
    });
  }

  // ============================================================
  // Sprint 1 Epic 1.1: EPA WPS Compliance Fields
  // These fields ensure worker and consumer safety transparency
  // ============================================================

  // REI (Restricted Entry Interval) - SECONDARY priority for worker safety
  if (event.rei_hours !== undefined && event.rei_hours !== null && event.rei_hours !== '') {
    secondary.push({
      label: 'Worker Re-Entry Interval',
      value: `${event.rei_hours} hours`,
      priority: 'secondary',
      category: 'verification',
      tooltip: 'Time workers must wait before re-entering treated area (EPA WPS requirement)'
    });
  }

  // PHI (Pre-Harvest Interval) - SECONDARY priority for consumer safety
  if (event.phi_days !== undefined && event.phi_days !== null && event.phi_days !== '') {
    secondary.push({
      label: 'Pre-Harvest Interval',
      value: `${event.phi_days} days`,
      priority: 'secondary',
      category: 'verification',
      tooltip: 'Minimum days between application and harvest (EPA food safety requirement)'
    });
  }

  // Sprint 6 (2025-12-23): Restricted Use Pesticide - SECONDARY priority for safety warning
  // Handle multiple value formats: boolean true, string 'true', string 'yes', or any truthy value
  const restrictedUseValue = event.restricted_use_pesticide;
  const isRestrictedUse =
    restrictedUseValue === true ||
    restrictedUseValue === 'true' ||
    restrictedUseValue === 'yes' ||
    restrictedUseValue === 'Yes' ||
    restrictedUseValue === '1' ||
    (typeof restrictedUseValue === 'string' && restrictedUseValue.toLowerCase() === 'true');

  if (isRestrictedUse) {
    secondary.push({
      label: 'Restricted Use Pesticide',
      value: '⚠️ Restricted Use - Certified applicator required',
      priority: 'secondary',
      category: 'verification',
      tooltip: 'This product is classified as Restricted Use and requires EPA-certified applicator'
    });
  }

  // Sprint 6 (2025-12-23): Applicator Name - DETAILS for accountability/transparency
  if (event.applicator_name) {
    details.push({
      label: 'Certified Applicator',
      value: event.applicator_name,
      priority: 'details',
      category: 'verification',
      tooltip: 'Name of the certified applicator who performed this application'
    });
  }

  // Applicator Certification - DETAILS for verification transparency
  const applicatorCert =
    event.applicator_certification || event.extra_data?.applicator_certification;
  if (isValidValue(applicatorCert)) {
    details.push({
      label: 'Applicator Certification',
      value: applicatorCert,
      priority: 'details',
      category: 'verification',
      tooltip: 'Certification ID of the licensed applicator'
    });
  }

  // Sprint 6 (2025-12-23): Application Details - DETAILS for transparency
  if (event.application_details) {
    details.push({
      label: 'Application Notes',
      value: event.application_details,
      priority: 'details',
      category: 'application',
      tooltip: 'Additional details about the application method and coverage'
    });
  }

  // Ghost field cleanup: Removed signal_word (never in form schema)

  // EPA Registration Number - DETAILS for regulatory traceability
  if (event.epa_registration_number) {
    details.push({
      label: 'EPA Registration #',
      value: event.epa_registration_number,
      priority: 'details',
      category: 'verification',
      tooltip: 'EPA product registration number for regulatory compliance'
    });
  }

  // Ghost field cleanup: Removed ppe_required and environmental_hazards (never in form schema)

  // ============================================================
  // Sprint 3 Epic 3.2: Consumer Trust Fields for transparency
  // These fields enhance consumer confidence in agricultural practices
  // ============================================================

  // Organic Approved Status - SECONDARY priority for consumer trust
  if (event.organic_approved) {
    secondary.push({
      label: 'Organic Certification',
      value: getReadableFieldValue('organic_approved', event.organic_approved),
      priority: 'secondary',
      category: 'verification',
      tooltip: 'Organic certification status for this product (builds consumer trust)'
    });
  }

  // Buffer Zone Distance - SECONDARY priority for environmental protection transparency
  if (
    event.buffer_zone_meters !== undefined &&
    event.buffer_zone_meters !== null &&
    event.buffer_zone_meters !== ''
  ) {
    secondary.push({
      label: 'Buffer Zone from Sensitive Areas',
      value: `${event.buffer_zone_meters} meters`,
      priority: 'secondary',
      category: 'environmental',
      tooltip:
        'Distance from sensitive areas like water sources, schools, homes (environmental protection)'
    });
  }

  // ============================================================
  // Sprint 3 Epic 3.3: Application Fuel Consumption Fields
  // These fields show the fuel used to apply the chemical (for carbon transparency)
  // ============================================================

  // Application Fuel Type - DETAILS priority (technical carbon data)
  if (event.application_fuel_type) {
    details.push({
      label: 'Application Equipment Fuel Type',
      value: getReadableFieldValue('fuel_type', event.application_fuel_type),
      priority: 'details',
      category: 'operational',
      tooltip: 'Type of fuel used by application equipment (for carbon footprint calculation)'
    });
  }

  // Application Fuel Consumed - DETAILS priority (technical carbon data)
  if (
    event.application_fuel_consumed !== undefined &&
    event.application_fuel_consumed !== null &&
    event.application_fuel_consumed !== ''
  ) {
    const fuelUnit = event.application_fuel_unit || event.fuel_unit || 'L';
    const fuelStr = String(event.application_fuel_consumed);
    const fuelIsFormatted = /\d+(\.\d+)?\s+\w+/.test(fuelStr);
    const fuelValue =
      fuelIsFormatted || fuelStr.includes(fuelUnit)
        ? event.application_fuel_consumed
        : `${event.application_fuel_consumed} ${fuelUnit}`;

    details.push({
      label: getFuelConsumptionLabel(event.application_fuel_type),
      value: fuelValue,
      priority: 'details',
      category: 'operational',
      tooltip: 'Fuel consumed by application equipment (contributes to total carbon footprint)'
    });
  }

  // Universal fields: variety, block_id, growth_stage (chemical events)
  if (isValidValue(event.variety)) {
    secondary.push({
      label: 'Variety',
      value: event.variety,
      priority: 'secondary',
      category: 'operational'
    });
  }

  if (isValidValue(event.block_id)) {
    secondary.push({
      label: 'Block/Section',
      value: event.block_id,
      priority: 'secondary',
      category: 'operational'
    });
  }

  if (isValidValue(event.growth_stage)) {
    secondary.push({
      label: 'Growth Stage',
      value: getReadableFieldValue('growth_stage', event.growth_stage),
      priority: 'secondary',
      category: 'operational'
    });
  }

  return { immediate, secondary, details };
}

/**
 * Extract and format production event fields according to display matrix
 * Updated to use actual transparency fields from TimelineService
 */
export function getProductionEventFields(event: any): EventFieldDisplay {
  const immediate: FieldDisplayItem[] = [];
  const secondary: FieldDisplayItem[] = [];
  const details: FieldDisplayItem[] = [];

  const extraData = event.extra_data || {};
  const description = event.description?.toLowerCase() || '';
  const eventType = event.type?.toLowerCase() || '';

  // Core transparency fields from TimelineService (IMMEDIATE display)
  // 🚨 CRITICAL FIX: Values need to be combined with their unit fields
  // Skip "Area Covered: 0 ha" for EM events — not meaningful for equipment maintenance
  const isEMEvent = event.production_type === 'EM' || event.production_type === 'EQ';
  if (isValidValue(event.area_covered) && !(isEMEvent && parseFloat(event.area_covered) === 0)) {
    const areaUnit = event.area_unit || 'ha';
    const areaValue = String(event.area_covered).includes(areaUnit)
      ? event.area_covered
      : `${formatNumber(event.area_covered)} ${areaUnit}`;

    immediate.push({
      label: 'Area Covered',
      value: areaValue,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  if (isValidValue(event.yield_quantity)) {
    const yieldUnit = event.yield_unit || event.quantity_unit || 'kg';
    // Check if value is already formatted (has number + unit pattern)
    const yieldStr = String(event.yield_quantity);
    const isAlreadyFormatted = /\d+(\.\d+)?\s+\w+/.test(yieldStr);
    const yieldValue =
      isAlreadyFormatted || yieldStr.includes(yieldUnit)
        ? event.yield_quantity
        : `${formatNumber(event.yield_quantity)} ${yieldUnit}`;

    immediate.push({
      label: 'Quantity',
      value: yieldValue,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // Equipment and fuel information (SECONDARY display)
  if (isValidValue(event.fuel_consumed)) {
    const fuelUnit = event.fuel_unit || extraData.fuel_unit || 'L';
    // 🔧 FIX: Check if value is already formatted (has number + unit pattern)
    const fuelStr = String(event.fuel_consumed);
    const fuelIsFormatted = /\d+(\.\d+)?\s+\w+/.test(fuelStr);
    const fuelValue =
      fuelIsFormatted || fuelStr.includes(fuelUnit)
        ? event.fuel_consumed
        : `${event.fuel_consumed} ${fuelUnit}`;

    // 🔧 FIX: Check fuel_type at top level AND in extra_data for electric equipment label
    const fuelType = event.fuel_type || extraData.fuel_type;

    secondary.push({
      label: getFuelConsumptionLabel(fuelType),
      value: fuelValue,
      priority: 'secondary',
      category: 'operational'
    });
  }

  if (isValidValue(event.equipment_hours)) {
    // 🔧 FIX: Check if value is already formatted (has number + unit pattern)
    const hoursStr = String(event.equipment_hours);
    const hoursIsFormatted = /\d+(\.\d+)?\s+\w+/.test(hoursStr);
    const hoursValue =
      hoursIsFormatted || hoursStr.toLowerCase().includes('hour')
        ? event.equipment_hours
        : `${event.equipment_hours} hours`;

    secondary.push({
      label: 'Equipment Hours',
      value: hoursValue,
      priority: 'secondary',
      category: 'operational'
    });
  }

  // Transportation (HA - Harvesting events only, SECONDARY display)
  if (isValidValue(event.transportation_distance)) {
    const transportUnit = event.transportation_unit || event.distance_unit || 'km';
    const transportValue =
      String(event.transportation_distance).toLowerCase().includes('km') ||
      String(event.transportation_distance).toLowerCase().includes('mi')
        ? event.transportation_distance
        : `${event.transportation_distance} ${transportUnit}`;

    secondary.push({
      label: 'Transportation Distance',
      value: transportValue,
      priority: 'secondary',
      category: 'operational'
    });
  }

  // Harvest Quality Grade (HA - Harvesting events, IMMEDIATE display)
  // Added Phase 2: Premium fruit operations (CA citrus, Uruguay exports)
  if (isValidValue(event.harvest_quality_grade)) {
    const qualityGradeMap: Record<string, string> = {
      export_quality: 'Export Quality',
      grade_a: 'Grade A',
      grade_b: 'Grade B',
      grade_c: 'Grade C',
      domestic: 'Domestic Market',
      processing: 'Processing/Juice'
    };

    immediate.push({
      label: 'Harvest Quality Grade',
      value: qualityGradeMap[event.harvest_quality_grade] || event.harvest_quality_grade,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // Grain Moisture at Harvest (HA - Harvesting events, SECONDARY display)
  // Added Phase 2: Midwest corn/soy operations
  if (isValidValue(event.grain_moisture)) {
    secondary.push({
      label: 'Grain Moisture',
      value: `${event.grain_moisture}%`,
      priority: 'secondary',
      category: 'measurement'
    });
  }

  // Sprint 2: EM (Equipment Maintenance) subtype-specific fields
  // CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model
  // Note: Kept backward compatibility check for 'EQ' in case old data exists
  if (event.production_type === 'EM' || event.production_type === 'EQ') {
    // Equipment Operation Type (IMMEDIATE - primary operation info)
    if (isValidValue(event.equipment_operation_type)) {
      immediate.push({
        label: 'Operation Type',
        value: getReadableFieldValue('equipment_operation_type', event.equipment_operation_type),
        priority: 'immediate',
        category: 'operational'
      });
    }

    // Equipment Type (SECONDARY - what equipment was used)
    if (isValidValue(event.equipment_type)) {
      secondary.push({
        label: 'Equipment Type',
        value: getReadableFieldValue('equipment_type', event.equipment_type),
        priority: 'secondary',
        category: 'operational'
      });
    }

    // Fuel Type (SECONDARY - fuel used)
    if (isValidValue(event.fuel_type)) {
      secondary.push({
        label: 'Fuel Type',
        value: getReadableFieldValue('fuel_type', event.fuel_type),
        priority: 'secondary',
        category: 'operational'
      });
    }

    // Operation Efficiency (SECONDARY - efficiency level) — skip "normal"
    // Case-insensitive check: normalizer may capitalize "normal" → "Normal"
    if (
      isValidValue(event.operation_efficiency) &&
      event.operation_efficiency.toLowerCase() !== 'normal'
    ) {
      secondary.push({
        label: 'Operation Efficiency',
        value: getReadableFieldValue(
          'operation_efficiency',
          event.operation_efficiency.toLowerCase()
        ),
        priority: 'secondary',
        category: 'operational'
      });
    }
  }

  // Fuel Type for non-EM production events (IR, HA, PR, PL, TR, CU, TH)
  // EM events already handle fuel_type above in their specific block
  if (event.production_type !== 'EM' && event.production_type !== 'EQ') {
    const fuelType = event.fuel_type || extraData.fuel_type;
    if (isValidValue(fuelType)) {
      secondary.push({
        label: 'Fuel Type',
        value: getReadableFieldValue('fuel_type', fuelType),
        priority: 'secondary',
        category: 'operational'
      });
    }
  }

  // 🚨 REMOVED: Operation Category (production_type) - Internal metadata, not consumer-facing
  // Production type (PL, HA, IR, TR, etc.) is for backend routing and should never
  // be displayed to consumers in event previews or ProductDetail cards.
  // The event title already communicates the operation type in consumer-friendly language.

  // Legacy fallback support for existing extra_data structure
  // Harvesting events
  if (description.includes('harvest') && isValidValue(extraData.quantityHarvested)) {
    immediate.push({
      label: 'Quantity Harvested',
      value: `${extraData.quantityHarvested} kg`,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // ENHANCED: USDA NASS 2023 Irrigation Fields (IR events)
  // Water estimation: 27,154 gallons per acre per 1-inch irrigation depth
  if (event.production_type === 'IR' || description.includes('irrigation')) {
    // Irrigation Method (IMMEDIATE - primary operation info)
    if (event.irrigation_method) {
      const irrigationMethodMap: Record<string, string> = {
        flood: 'Flood Irrigation - Surface flooding',
        furrow: 'Furrow Irrigation - Channel-based',
        drip: 'Drip Irrigation - Targeted delivery',
        sprinkler: 'Sprinkler Irrigation - Overhead spray',
        center_pivot: 'Center Pivot - Rotational coverage',
        sub_irrigation: 'Sub-surface Irrigation - Underground delivery',
        micro_sprinkler: 'Micro-sprinkler - Low-volume spray',
        hand_watering: 'Hand Watering - Manual application',
        rain_fed: 'Rain-fed - Natural precipitation only'
      };

      immediate.push({
        label: 'Irrigation Method',
        value: irrigationMethodMap[event.irrigation_method] || event.irrigation_method,
        priority: 'immediate',
        category: 'operational'
      });
    }

    // Irrigation Depth with USDA NASS water estimation context
    if (event.irrigation_depth) {
      const unit = event.irrigation_depth_unit || 'inches';
      const depthValue = parseFloat(event.irrigation_depth);

      // Calculate approximate water used based on USDA NASS 2023
      // 27,154 gallons per acre per 1-inch depth
      let waterEstimate = '';
      if (unit === 'inches' && depthValue > 0) {
        const gallonsPerAcre = Math.round(depthValue * 27154);
        waterEstimate = ` (~${gallonsPerAcre.toLocaleString()} gal/acre)`;
      }

      immediate.push({
        label: 'Irrigation Depth',
        value: `${event.irrigation_depth} ${unit}${waterEstimate}`,
        priority: 'immediate',
        category: 'measurement'
      });
    }

    // Sprint 4: Aggregate Irrigation - Total Water Volume (replaces per-event water estimate)
    if (event.water_volume_total) {
      const waterUnit = event.water_volume_unit || 'gallons';
      const waterValue =
        typeof event.water_volume_total === 'string'
          ? event.water_volume_total
          : `${event.water_volume_total.toLocaleString()} ${waterUnit}`;
      immediate.push({
        label: 'Total Water Volume',
        value: waterValue,
        priority: 'immediate',
        category: 'measurement'
      });
    }

    // Phase 3: Well pump depth — secondary transparency field for IR events
    const pumpDepthValue = event.pump_depth_ft ?? event.extra_data?.pump_depth_ft;
    if (isValidValue(pumpDepthValue)) {
      secondary.push({
        label: 'Well Depth',
        value: `${formatNumber(pumpDepthValue)} ft`,
        priority: 'secondary',
        category: 'measurement'
      });
    }

    // Phase 3: Electricity source — secondary trust indicator for IR events
    const electricitySourceValue = event.electricity_source ?? event.extra_data?.electricity_source;
    if (isValidValue(electricitySourceValue)) {
      const electricitySourceLabels: Record<string, string> = {
        grid: 'Grid Electricity',
        solar: 'Solar',
        wind: 'Wind',
        diesel_generator: 'Diesel Generator',
        mixed: 'Mixed Sources'
      };
      secondary.push({
        label: 'Pump Power Source',
        value: electricitySourceLabels[electricitySourceValue] || electricitySourceValue,
        priority: 'secondary',
        category: 'environmental'
      });
    }
  }

  // Legacy fallback: Irrigation events with waterAmount in extra_data
  if (description.includes('irrigation') && isValidValue(extraData.waterAmount)) {
    immediate.push({
      label: 'Water Applied',
      value: `${extraData.waterAmount} L`,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // Planting events
  if (description.includes('plant') && isValidValue(extraData.area)) {
    immediate.push({
      label: 'Planting Area',
      value: `${extraData.area} hectares`,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  if (extraData.seedDetails) {
    secondary.push({
      label: 'Seed Details',
      value: extraData.seedDetails,
      priority: 'secondary',
      category: 'operational'
    });
  }

  // Pruning events
  if (description.includes('prun') && isValidValue(extraData.area)) {
    immediate.push({
      label: 'Pruning Area',
      value: `${extraData.area} hectares`,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // Operation method (Hand thinning, Pruning shears, Mechanical harvester, etc.)
  // Farmer-documented method enables Trazo's Direct Operational Emissions routing
  // (manual keyword → 0.1 kg CO2e/acre instead of USDA mechanical averages).
  // Elevated to immediate priority — hand labor is a key transparency signal for
  // organic/specialty farming (thinning, pruning, cultivation, transplanting, canopy mgmt).
  //
  // HA (Harvesting) is intentionally EXCLUDED — it already has a dedicated
  // harvest_method render below (line ~1750) which handles the structured choice
  // field. Including HA here would produce a duplicate "Harvest Method" row.
  // HA's production_method still flows to the backend carbon calc via event_data.
  if (extraData.method && event.production_type !== 'HA') {
    const subtypeMethodLabels: Record<string, string> = {
      TH: 'Thinning Method',
      PR: 'Pruning Method',
      CU: 'Cultivation Method',
      TR: 'Transplanting Method',
      CM: 'Canopy Management Method'
    };
    const methodLabel = subtypeMethodLabels[event.production_type as string] || 'Operation Method';
    immediate.push({
      label: methodLabel,
      value: extraData.method,
      priority: 'immediate',
      category: 'operational'
    });
  }

  // ============================================================
  // P1 FIX: Extract high-value extra_data fields for consumer display
  // These fields contain the most compelling transparency data but were
  // previously invisible because they live in extra_data, not top-level
  // ============================================================

  // Harvest extra_data: quality grade, harvest method, brix levels, yield amount
  if (event.type === 'HA' || event.production_type === 'HA' || description.includes('harvest')) {
    // Quality grade from extra_data (fallback for harvest_quality_grade)
    if (!event.harvest_quality_grade && isValidValue(extraData.quality_grade)) {
      immediate.push({
        label: 'Harvest Quality',
        value: extraData.quality_grade,
        priority: 'immediate',
        category: 'measurement'
      });
    }

    // Harvest method (e.g. "selective hand picking")
    const harvestMethod = event.harvest_method || extraData.harvest_method;
    if (isValidValue(harvestMethod)) {
      const harvestMethodMap: Record<string, string> = {
        hand_picking: 'Hand Picking',
        selective_hand_picking: 'Selective Hand Picking',
        mechanical: 'Mechanical Harvester',
        shake_and_catch: 'Shake and Catch',
        strip_picking: 'Strip Picking',
        manual: 'Manual Harvest',
        mixed: 'Mixed (Manual + Mechanical)'
      };
      immediate.push({
        label: 'Harvest Method',
        value: harvestMethodMap[harvestMethod] || harvestMethod,
        priority: 'immediate',
        category: 'operational'
      });
    }

    // Brix level: prefer model-level field (brix_level), then legacy extra_data paths
    const brixLevelModel = event.brix_level;
    const brixLevels = isValidValue(brixLevelModel)
      ? brixLevelModel
      : event.brix_levels || extraData.brix_levels || extraData.brix_level;
    if (isValidValue(brixLevels)) {
      immediate.push({
        label: 'Brix Level',
        value: `${brixLevels}`,
        priority: 'immediate',
        category: 'measurement',
        tooltip: 'Sugar content measurement - higher brix means sweeter, more flavorful fruit'
      });
    }

    // Yield amount from extra_data when yield_quantity is not set
    if (!event.yield_quantity && isValidValue(extraData.amount)) {
      const unit = extraData.unit || event.yield_unit || 'kg';
      immediate.push({
        label: 'Yield',
        value: `${Number(extraData.amount).toLocaleString()} ${unit}`,
        priority: 'immediate',
        category: 'measurement'
      });
    }

    // Harvest Summary: Total Yield from summary aggregation
    const yieldTotal = event.yield_total || extraData.yield_total;
    if (isValidValue(yieldTotal)) {
      const yieldUnit = event.yield_total_unit || extraData.yield_total_unit || 'lbs';
      immediate.push({
        label: 'Total Yield',
        value: `${Number(yieldTotal).toLocaleString()} ${yieldUnit}`,
        priority: 'immediate',
        category: 'measurement'
      });
    }
  }

  // Ghost field cleanup: Removed native_species_planted and habitat_area_hectares
  // (never in Production form — only existed in seed data extra_data)

  // ============================================================
  // Sprint 3 Epic 3.2: Consumer Trust Fields for Production Events
  // These fields enhance consumer confidence in agricultural practices
  // ============================================================

  // Seeds Source - SECONDARY priority for transparency about inputs (Planting/Transplanting)
  if (event.seeds_source) {
    secondary.push({
      label: 'Seeds/Seedlings Source',
      value: getReadableFieldValue('seeds_source', event.seeds_source),
      priority: 'secondary',
      category: 'verification',
      tooltip: 'Source of seeds or seedlings used (builds consumer trust in agricultural inputs)'
    });
  }

  // NOP 7 CFR 205.204 — Seed Certification Status (planting subtype)
  if (event.seed_certification_status) {
    secondary.push({
      label: 'Seed Certification Status',
      value: getReadableFieldValue('seed_certification_status', event.seed_certification_status),
      priority: 'secondary',
      category: 'verification',
      tooltip: 'Regulatory classification of seed used (NOP 7 CFR 205.204)'
    });
  }

  // NOP 7 CFR 205.204 — Seed vendor/purchase chain (seed_supplier_name,
  // seed_purchase_date, seed_purchase_invoice) is commercially sensitive
  // producer/certifier-only data and is INTENTIONALLY NOT rendered here.
  // getEventFieldDisplay() feeds the consumer ConsumerEventCard (legacy +
  // registry-fallback path), so surfacing these would leak the farm's nursery
  // identity and seed invoice on the public QR page. Same policy and class as
  // the chemical supplier_name/purchase_* fields removed from
  // getChemicalEventFields() (P0 leak fix, Standard Fix #5 / Bug Pattern #17).
  // The backend PublicHistorySerializer also strips them from the public
  // payload; this is the matching frontend defense-in-depth. seed_certification_status,
  // seed_treatment, seed_variety, and seed_lot_number below are legitimate
  // consumer transparency (what was planted, not who sold it) and remain.

  // NOP 7 CFR 205.204 — Seed Treatment (top-level model field, distinct from legacy treated_or_untreated)
  if (event.seed_treatment) {
    secondary.push({
      label: 'Seed Treatment',
      value: event.seed_treatment,
      priority: 'secondary',
      category: 'verification',
      tooltip: 'Coatings, inoculants, or pelleting applied to the seed'
    });
  }

  // Water Source - SECONDARY priority for transparency about water usage (Irrigation)
  if (event.water_source) {
    secondary.push({
      label: 'Water Source',
      value: getReadableFieldValue('water_source', event.water_source),
      priority: 'secondary',
      category: 'environmental',
      tooltip: 'Source of water for irrigation (environmental transparency)'
    });
  }

  // ============================================================
  // Organic Compliance Fields (from extra_data)
  // NOP record-keeping support — displays seed sourcing, amendment,
  // and equipment cleaning details for organic transparency
  // ============================================================

  // Seed sourcing details (NOP 205.204). Seed supplier identity (event.seed_supplier /
  // extra_data.seed_supplier) is commercially sensitive and INTENTIONALLY NOT rendered
  // on the consumer card — same P0 leak fix as the top-level seed_supplier_name block
  // above and the chemical supplier_name removal (Standard Fix #5 / Bug Pattern #17).
  // Seed variety + lot number are legitimate consumer transparency and remain.
  const seedVariety = event.seed_variety || extraData.seed_variety;
  if (isValidValue(seedVariety)) {
    secondary.push({
      label: 'Seed Variety',
      value: seedVariety,
      priority: 'secondary',
      category: 'operational'
    });
  }

  const seedLotNumber = event.seed_lot_number || extraData.seed_lot_number;
  if (isValidValue(seedLotNumber)) {
    details.push({
      label: 'Seed Lot Number',
      value: seedLotNumber,
      priority: 'details',
      category: 'verification',
      tooltip: 'Lot number for seed traceability'
    });
  }

  const organicCertNumber =
    event.organic_certificate_number || extraData.organic_certificate_number;
  if (isValidValue(organicCertNumber)) {
    secondary.push({
      label: 'Supplier Organic Certificate',
      value: organicCertNumber,
      priority: 'secondary',
      category: 'verification',
      tooltip: 'Organic certificate number from seed supplier'
    });
  }

  const seedTreatment = event.treated_or_untreated || extraData.treated_or_untreated;
  if (isValidValue(seedTreatment)) {
    secondary.push({
      label: 'Seed Treatment',
      value: getReadableFieldValue('treated_or_untreated', seedTreatment),
      priority: 'secondary',
      category: 'verification'
    });
  }

  // Amendment/compost details (NOP 205.203)
  const amendmentSupplier = event.amendment_source_supplier || extraData.amendment_source_supplier;
  if (isValidValue(amendmentSupplier)) {
    secondary.push({
      label: 'Amendment Supplier',
      value: amendmentSupplier,
      priority: 'secondary',
      category: 'verification'
    });
  }

  const cToNRatio = event.c_to_n_ratio || extraData.c_to_n_ratio;
  if (isValidValue(cToNRatio)) {
    secondary.push({
      label: 'C:N Ratio',
      value: cToNRatio,
      priority: 'secondary',
      category: 'measurement',
      tooltip: 'Carbon-to-nitrogen ratio of compost (NOP requires documentation)'
    });
  }

  const compostTemp =
    event.compost_temperature_reached_131f || extraData.compost_temperature_reached_131f;
  if (isValidValue(compostTemp)) {
    secondary.push({
      label: 'Compost Reached 131\u00b0F',
      value: getReadableFieldValue('compost_temperature_reached_131f', compostTemp),
      priority: 'secondary',
      category: 'verification',
      tooltip:
        'NOP requires compost to reach 131\u00b0F for 3+ days (in-vessel) or 15 days (windrow)'
    });
  }

  // Equipment cleaning details (NOP 205.272)
  const previousUse = event.previous_use || extraData.previous_use;
  if (isValidValue(previousUse)) {
    secondary.push({
      label: 'Previous Equipment Use',
      value: getReadableFieldValue('previous_use', previousUse),
      priority: 'secondary',
      category: 'verification',
      tooltip: 'Equipment use before cleaning — required for organic compliance (NOP 205.272)'
    });
  }

  const cleaningProtocol = event.cleaning_protocol || extraData.cleaning_protocol;
  if (isValidValue(cleaningProtocol)) {
    secondary.push({
      label: 'Cleaning Protocol',
      value: getReadableFieldValue('cleaning_protocol', cleaningProtocol),
      priority: 'secondary',
      category: 'verification'
    });
  }

  const inspectedBy = event.inspected_by || extraData.inspected_by;
  if (isValidValue(inspectedBy)) {
    details.push({
      label: 'Cleaning Inspected By',
      value: inspectedBy,
      priority: 'details',
      category: 'verification'
    });
  }

  // ============================================================
  // PO (Pollination) subtype-specific fields
  // ============================================================
  if (event.production_type === 'PO' || eventType === 'po') {
    const pollinatorType = event.pollinator_type || extraData.pollinator_type;
    if (isValidValue(pollinatorType)) {
      immediate.push({
        label: 'Pollinator Type',
        value: getReadableFieldValue('pollinator_type', pollinatorType),
        priority: 'immediate',
        category: 'operational'
      });
    }

    const hiveCount = event.hive_count !== undefined ? event.hive_count : extraData.hive_count;
    if (isValidValue(hiveCount)) {
      immediate.push({
        label: 'Hive Count',
        value: `${hiveCount} hives`,
        priority: 'immediate',
        category: 'measurement'
      });
    }

    const placementDate = event.placement_date || extraData.placement_date;
    if (isValidValue(placementDate)) {
      secondary.push({
        label: 'Hive Placement Date',
        value: new Date(placementDate + 'T12:00:00').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        priority: 'secondary',
        category: 'operational'
      });
    }

    const removalDate = event.removal_date || extraData.removal_date;
    if (isValidValue(removalDate)) {
      secondary.push({
        label: 'Hive Removal Date',
        value: new Date(removalDate + 'T12:00:00').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        priority: 'secondary',
        category: 'operational'
      });
    }
  }

  // ============================================================
  // PH (Post-Harvest Processing) subtype-specific fields
  // ============================================================
  if (event.production_type === 'PH' || eventType === 'ph') {
    const processingType = event.processing_type || extraData.processing_type;
    if (isValidValue(processingType)) {
      immediate.push({
        label: 'Processing Type',
        value: getReadableFieldValue('processing_type', processingType),
        priority: 'immediate',
        category: 'operational'
      });
    }

    const processingDuration =
      event.processing_duration_hours !== undefined
        ? event.processing_duration_hours
        : extraData.processing_duration_hours;
    if (isValidValue(processingDuration)) {
      immediate.push({
        label: 'Processing Duration',
        value: `${processingDuration} hours`,
        priority: 'immediate',
        category: 'measurement'
      });
    }

    const temperatureControl = event.temperature_control || extraData.temperature_control;
    if (isValidValue(temperatureControl)) {
      secondary.push({
        label: 'Temperature Control',
        value:
          temperatureControl === true || temperatureControl === 'true'
            ? 'Yes — Temperature Controlled'
            : 'No',
        priority: 'secondary',
        category: 'operational'
      });
    }
  }

  // ============================================================
  // CM (Canopy Management) subtype-specific fields
  // ============================================================
  if (event.production_type === 'CM' || eventType === 'cm') {
    const canopyOperation = event.canopy_operation || extraData.canopy_operation;
    if (isValidValue(canopyOperation)) {
      immediate.push({
        label: 'Canopy Operation',
        value: getReadableFieldValue('canopy_operation', canopyOperation),
        priority: 'immediate',
        category: 'operational'
      });
    }

    const passNumber = event.pass_number !== undefined ? event.pass_number : extraData.pass_number;
    if (isValidValue(passNumber)) {
      immediate.push({
        label: 'Pass Number',
        value: `${passNumber}`,
        priority: 'immediate',
        category: 'measurement'
      });
    }
  }

  // FP (Frost Protection) — Batch 3 (2026-06). Legacy fallback for when the field
  // registry is disabled; mirrors the registry FieldConfigs in productionEvent.ts.
  if (event.production_type === 'FP' || eventType === 'fp') {
    const protectionMethod = event.protection_method || extraData.protection_method;
    if (isValidValue(protectionMethod)) {
      immediate.push({
        label: 'Protection Method',
        value: getReadableFieldValue('protection_method', protectionMethod),
        priority: 'immediate',
        category: 'operational'
      });
    }
    const lowTemp =
      event.low_temperature !== undefined ? event.low_temperature : extraData.low_temperature;
    if (isValidValue(lowTemp)) {
      secondary.push({
        label: 'Low Temperature',
        value: `${lowTemp} °C`,
        priority: 'secondary',
        category: 'measurement'
      });
    }
  }

  // MO (Mowing / Orchard-Floor) — Batch 3 (2026-06)
  if (event.production_type === 'MO' || eventType === 'mo') {
    const floorType = event.floor_management_type || extraData.floor_management_type;
    if (isValidValue(floorType)) {
      immediate.push({
        label: 'Floor Management',
        value: getReadableFieldValue('floor_management_type', floorType),
        priority: 'immediate',
        category: 'operational'
      });
    }
  }

  // ============================================================
  // Universal fields: variety, block_id, growth_stage
  // These are top-level model fields present on all production subtypes
  // ============================================================
  if (isValidValue(event.variety)) {
    secondary.push({
      label: 'Variety',
      value: event.variety,
      priority: 'secondary',
      category: 'operational'
    });
  }

  if (isValidValue(event.block_id)) {
    secondary.push({
      label: 'Block/Section',
      value: event.block_id,
      priority: 'secondary',
      category: 'operational'
    });
  }

  if (isValidValue(event.growth_stage)) {
    secondary.push({
      label: 'Growth Stage',
      value: getReadableFieldValue('growth_stage', event.growth_stage),
      priority: 'secondary',
      category: 'operational'
    });
  }

  return { immediate, secondary, details };
}

/**
 * Extract and format general event fields according to display matrix
 */
export function getGeneralEventFields(event: any): EventFieldDisplay {
  const immediate: FieldDisplayItem[] = [];
  const secondary: FieldDisplayItem[] = [];
  const details: FieldDisplayItem[] = [];

  const extraData = event.extra_data || {};
  const description = event.description?.toLowerCase() || '';

  // Handle basic General event form fields
  // Note: Activity Type is NOT shown as a badge — it's a technical classification
  // that doesn't add consumer value (e.g., "Other Activity" isn't informative).
  // The title already describes the activity via getGeneralTitle().
  // Note: Activity Name is NOT shown here — it's already used as the card title
  // via getConsumerEventDescription() → getGeneralTitle()

  if (event.duration) {
    // Duration may be stored as just a number (e.g., "3") or with units ("3 hours")
    const durationStr = String(event.duration);
    const durationValue = /^\d+(\.\d+)?$/.test(durationStr.trim())
      ? `${durationStr} hours`
      : durationStr;
    secondary.push({
      label: 'Duration',
      value: durationValue,
      priority: 'secondary',
      category: 'measurement'
    });
  }

  if (event.people_involved !== undefined && event.people_involved > 0) {
    secondary.push({
      label: 'People Involved',
      value: `${event.people_involved} people`,
      priority: 'secondary',
      category: 'operational'
    });
  }

  // Note: Activity Notes NOT shown here — same content is already displayed
  // as "Farmer's Field Notes" via event.observation in ConsumerEventCard

  // Tillage events
  if (description.includes('till')) {
    if (isValidValue(extraData.areaTreated)) {
      immediate.push({
        label: 'Area Treated',
        value: `${extraData.areaTreated} hectares`,
        priority: 'immediate',
        category: 'measurement'
      });
    }
    if (extraData.tillageMethod) {
      immediate.push({
        label: 'Tillage Method',
        value: extraData.tillageMethod,
        priority: 'immediate',
        category: 'operational'
      });
    }
    if (extraData.equipmentName) {
      secondary.push({
        label: 'Equipment Used',
        value: extraData.equipmentName,
        priority: 'secondary',
        category: 'operational'
      });
    }
    if (isValidValue(extraData.fuelAmount)) {
      details.push({
        label: 'Fuel Consumption',
        value: `${extraData.fuelAmount} L`,
        priority: 'details',
        category: 'measurement'
      });
    }
  }

  // Cover crop events
  if (description.includes('cover crop')) {
    if (extraData.coverCropSpecies) {
      immediate.push({
        label: 'Cover Crop Species',
        value: extraData.coverCropSpecies,
        priority: 'immediate',
        category: 'operational'
      });
    }
    if (extraData.coverCropActivity) {
      immediate.push({
        label: 'Activity',
        value: extraData.coverCropActivity,
        priority: 'immediate',
        category: 'operational'
      });
    }
    if (isValidValue(extraData.areaTreated)) {
      secondary.push({
        label: 'Area Covered',
        value: `${extraData.areaTreated} hectares`,
        priority: 'secondary',
        category: 'measurement'
      });
    }
    if (extraData.seedingRate) {
      details.push({
        label: 'Seeding Rate',
        value: extraData.seedingRate,
        priority: 'details',
        category: 'measurement'
      });
    }
  }

  // Energy events
  if (description.includes('energy')) {
    if (extraData.energyType) {
      immediate.push({
        label: 'Energy Type',
        value: extraData.energyType,
        priority: 'immediate',
        category: 'operational'
      });
    }
    if (isValidValue(extraData.energyAmount)) {
      immediate.push({
        label: 'Energy Amount',
        value: `${extraData.energyAmount} kWh`,
        priority: 'immediate',
        category: 'measurement'
      });
    }
    if (extraData.facilityName) {
      secondary.push({
        label: 'Facility',
        value: extraData.facilityName,
        priority: 'secondary',
        category: 'operational'
      });
    }
    if (isValidValue(extraData.energyCost)) {
      details.push({
        label: 'Energy Cost',
        value: `$${extraData.energyCost}`,
        priority: 'details',
        category: 'measurement'
      });
    }
  }

  // Conservation events
  if (description.includes('conservation')) {
    if (extraData.practiceType) {
      immediate.push({
        label: 'Practice Type',
        value: extraData.practiceType,
        priority: 'immediate',
        category: 'environmental'
      });
    }
    if (isValidValue(extraData.areaTreated)) {
      immediate.push({
        label: 'Area Established',
        value: `${extraData.areaTreated} hectares`,
        priority: 'immediate',
        category: 'measurement'
      });
    }
    if (isValidValue(extraData.establishmentCost)) {
      secondary.push({
        label: 'Investment',
        value: `$${extraData.establishmentCost}`,
        priority: 'secondary',
        category: 'measurement'
      });
    }
    if (extraData.expectedLifespan) {
      details.push({
        label: 'Expected Lifespan',
        value: extraData.expectedLifespan,
        priority: 'details',
        category: 'operational'
      });
    }
  }

  // Verification events
  if (description.includes('verification') || description.includes('testing')) {
    if (extraData.verificationType) {
      immediate.push({
        label: 'Verification Type',
        value: extraData.verificationType,
        priority: 'immediate',
        category: 'verification'
      });
    }
    if (extraData.verifierName) {
      secondary.push({
        label: 'Verified By',
        value: extraData.verifierName,
        priority: 'secondary',
        category: 'verification'
      });
    }
    if (isValidValue(extraData.sampleCount)) {
      details.push({
        label: 'Sample Count',
        value: `${extraData.sampleCount} samples`,
        priority: 'details',
        category: 'measurement'
      });
    }
    if (extraData.verificationProtocol) {
      details.push({
        label: 'Protocol',
        value: extraData.verificationProtocol,
        priority: 'details',
        category: 'verification'
      });
    }
  }

  // ============================================================
  // Sprint 3 Epic 3.2: Consumer Trust Fields for transparency
  // These fields enhance consumer confidence in agricultural practices
  // ============================================================

  // Seeds Source - SECONDARY priority for transparency about inputs
  if (event.seeds_source) {
    secondary.push({
      label: 'Seeds/Seedlings Source',
      value: getReadableFieldValue('seeds_source', event.seeds_source),
      priority: 'secondary',
      category: 'verification',
      tooltip: 'Source of seeds or seedlings used (builds consumer trust in agricultural inputs)'
    });
  }

  // Water Source - SECONDARY priority for transparency about water usage
  if (event.water_source) {
    secondary.push({
      label: 'Water Source',
      value: getReadableFieldValue('water_source', event.water_source),
      priority: 'secondary',
      category: 'environmental',
      tooltip: 'Source of water for irrigation (environmental transparency)'
    });
  }

  return { immediate, secondary, details };
}

/**
 * Extract and format equipment event fields according to display matrix
 * Expects standardized event data from normalization layer
 */
export function getEquipmentEventFields(event: any): EventFieldDisplay {
  const immediate: FieldDisplayItem[] = [];
  const secondary: FieldDisplayItem[] = [];
  const details: FieldDisplayItem[] = [];

  const extraData = event.extra_data || {};

  // Use normalized operation_type field (mapped from backend 'type')
  if (event.operation_type) {
    const operationTypeMap: Record<string, string> = {
      FC: 'Fuel Consumption - Field Operations',
      MN: 'Maintenance',
      RE: 'Repair',
      CA: 'Calibration',
      BD: 'Breakdown',
      EI: 'Inspection'
    };

    const displayValue = operationTypeMap[event.operation_type] || event.operation_type;

    immediate.push({
      label: 'Operation Type',
      value: displayValue,
      priority: 'immediate',
      category: 'operational'
    });
  }

  // Use normalized operation_name field (mapped from backend 'name')
  if (event.operation_name) {
    immediate.push({
      label: 'Operation Name',
      value: event.operation_name,
      priority: 'immediate',
      category: 'operational'
    });
  }

  // Equipment Type - check structured field first, then fallback
  if (event.equipment_type || event.equipment_type_structured) {
    immediate.push({
      label: 'Equipment Type',
      value: getReadableFieldValue(
        'equipment_type',
        event.equipment_type || event.equipment_type_structured
      ),
      priority: 'immediate',
      category: 'operational'
    });
  }

  // Use normalized fields with proper units
  if (
    event.fuel_consumed !== undefined &&
    event.fuel_consumed !== '' &&
    event.fuel_consumed !== null
  ) {
    const unit = event.fuel_unit || extraData.fuel_unit || 'L';
    // 🔧 FIX: Check fuel_type at top level AND in extra_data for electric equipment label
    const fuelType = event.fuel_type || extraData.fuel_type;
    secondary.push({
      label: getFuelConsumptionLabel(fuelType),
      value: `${event.fuel_consumed} ${unit}`,
      priority: 'secondary',
      category: 'measurement'
    });
  }

  if (
    event.hours_operated !== undefined &&
    event.hours_operated !== '' &&
    event.hours_operated !== null
  ) {
    secondary.push({
      label: 'Hours Operated',
      value: `${event.hours_operated} hours`,
      priority: 'secondary',
      category: 'measurement'
    });
  }

  if (event.area_worked !== undefined && event.area_worked !== '' && event.area_worked !== null) {
    const unit = event.area_unit || 'ha';
    secondary.push({
      label: 'Area Worked',
      value: `${event.area_worked} ${unit}`,
      priority: 'secondary',
      category: 'measurement'
    });
  }

  // Detail fields
  if (event.fuel_type) {
    details.push({
      label: 'Fuel Type',
      value: getReadableFieldValue('fuel_type', event.fuel_type),
      priority: 'details',
      category: 'operational'
    });
  }

  // Operation Efficiency - SECONDARY for consistency with other event types — skip "normal"
  if (event.operation_efficiency && event.operation_efficiency !== 'normal') {
    secondary.push({
      label: 'Operation Efficiency',
      value: getReadableFieldValue('operation_efficiency', event.operation_efficiency),
      priority: 'secondary',
      category: 'operational'
    });
  }

  // Note: event.observation is already shown as "Farmer's Field Notes" in the card body.
  // Do NOT duplicate it here in Technical Details.

  return { immediate, secondary, details };
}

/**
 * Extract and format soil management event fields according to display matrix
 * Updated to show all farmer-filled information from SoilManagementTab form
 * Following the same comprehensive standard as Chemical and Production events
 */
export function getSoilManagementEventFields(event: any): EventFieldDisplay {
  const immediate: FieldDisplayItem[] = [];
  const secondary: FieldDisplayItem[] = [];
  const details: FieldDisplayItem[] = [];

  const extraData = event.extra_data || {};

  // IMMEDIATE DISPLAY - Key soil management details that farmers fill in forms

  const operationTypes: Record<string, string> = {
    'Soil Testing': 'Soil Testing',
    ST: 'Soil Testing',
    PA: 'pH Adjustment',
    OM: 'Organic Matter Addition',
    CC: 'Cover Crop Management',
    TI: 'Tillage Implementation',
    CO: 'Composting Operation',
    GR: 'Grazing Management'
  };

  // Soil Management Type (using actual database field 'type')
  if (event.soil_management_type) {
    const displayValue =
      operationTypes[event.soil_management_type] ||
      operationTypes[event.type] ||
      event.soil_management_type;

    immediate.push({
      label: 'Soil Management Type',
      value: displayValue,
      priority: 'immediate',
      category: 'environmental'
    });
  }

  // Soil Management Name (using actual database field 'name')
  // if (event.name) {
  //   immediate.push({
  //     label: 'Operation Name',
  //     value: event.name,
  //     priority: 'immediate',
  //     category: 'operational'
  //   });
  // }

  if (event.working_depth) {
    const unit = event.depth_unit || 'cm';
    immediate.push({
      label: 'Working Depth',
      value: `${event.working_depth} ${unit}`,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // Area Covered (from database field)
  if (event.area_covered) {
    const unit = event.area_unit || 'ha'; // Consistent with other event types
    immediate.push({
      label: 'Area Covered',
      value: `${formatNumber(event.area_covered)} ${unit}`,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // Fuel Consumed (from database field) - SECONDARY for consistency with other event types
  if (event.fuel_consumed) {
    const unit = event.fuel_unit || extraData.fuel_unit || 'L';
    // 🔧 FIX: Check fuel_type at top level AND in extra_data for electric equipment label
    const fuelType = event.fuel_type || extraData.fuel_type;
    secondary.push({
      label: getFuelConsumptionLabel(fuelType),
      value: `${event.fuel_consumed} ${unit}`,
      priority: 'secondary',
      category: 'operational'
    });
  }

  // Equipment Hours (from database field) - SECONDARY for consistency with other event types
  if (event.equipment_hours) {
    secondary.push({
      label: 'Equipment Hours',
      value: `${event.equipment_hours} hours`,
      priority: 'secondary',
      category: 'operational'
    });
  }

  // Event Name already handled above as 'Operation Name' - no need to duplicate

  // Soil pH (from database field) - Move to immediate for better visibility
  if (
    event.soil_ph !== undefined &&
    event.soil_ph !== null &&
    event.soil_ph !== '' &&
    !isNaN(Number(event.soil_ph))
  ) {
    immediate.push({
      label: 'Soil pH',
      value: event.soil_ph.toString(),
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // Organic Matter Percentage (from database field) - Move to immediate for better visibility
  // P1 FIX: Also check 'organic_matter' (without _percentage) as fallback since
  // eventFieldMapping.ts may remap the field name in some flows
  const organicMatter = event.organic_matter_percentage ?? event.organic_matter;
  if (organicMatter !== undefined && organicMatter !== null && organicMatter !== '') {
    immediate.push({
      label: 'Organic Matter',
      value: `${organicMatter}%`,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // ENHANCED: IPCC 2006 Lime Dissolution Fields (PA - Soil Amendment events)
  // Amendment Type with CO2 emission factor display for consumer transparency
  if (event.amendment_type) {
    const amendmentTypeMap: Record<string, string> = {
      limestone: 'Limestone (CaCO3) - 0.44 kg CO2/kg',
      dolomite: 'Dolomite (CaMg(CO3)2) - 0.477 kg CO2/kg',
      calcium_oxide: 'Calcium Oxide (CaO) - 0.785 kg CO2/kg',
      calcium_hydroxide: 'Calcium Hydroxide (Ca(OH)2) - 0.594 kg CO2/kg',
      calcium_silicate: 'Calcium Silicate Slag - 0.22 kg CO2/kg',
      calcium_sulfate: 'Calcium Sulfate (Gypsum) - No CO2 emissions',
      calcium_ammonium_nitrate: 'Calcium Ammonium Nitrate - 2.8 kg CO2e/kg'
    };

    immediate.push({
      label: 'Amendment Type',
      value: amendmentTypeMap[event.amendment_type] || event.amendment_type,
      priority: 'immediate',
      category: 'application'
    });
  }

  // Amendment Amount with unit (IPCC 2006 compliance)
  // P1 FIX: Check if value already contains unit text to avoid double-appending
  // Accept both legacy string field (amendment_amount) and registry/backend numeric field (amendment_amount_numeric)
  const amendmentAmountValue = event.amendment_amount ?? (event as any).amendment_amount_numeric;
  if (
    amendmentAmountValue !== undefined &&
    amendmentAmountValue !== null &&
    amendmentAmountValue !== ''
  ) {
    const unit = event.amendment_unit || (event as any).amendment_amount_unit || 'kg';
    const amountStr = String(amendmentAmountValue);
    const alreadyHasUnit = /[a-zA-Z]/.test(amountStr);
    immediate.push({
      label: 'Amendment Amount',
      value: alreadyHasUnit ? amountStr : `${amountStr} ${unit}`,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // NOP Compliance: Amendment Organic Approval (7 CFR 205.203(b))
  if (event.amendment_organic_approved) {
    const organicApprovalMap: Record<string, string> = {
      omri_listed: 'OMRI Listed',
      usda_nop_approved: 'USDA NOP Approved',
      organic_equivalent: 'Organic Equivalent',
      transitional: 'Transitional',
      not_organic: 'Not Organic Approved',
      not_applicable: 'Not Applicable',
      yes: 'Yes — Organic Approved',
      no: 'No — Not Organic'
    };
    immediate.push({
      label: 'Organic Approval',
      value:
        organicApprovalMap[event.amendment_organic_approved] || event.amendment_organic_approved,
      priority: 'immediate',
      category: 'certification'
    });
  }

  // NOP Compliance: Compost Tracking (CO subtype, 7 CFR 205.203(c)(1))
  if (
    event.compost_peak_temp_f !== undefined &&
    event.compost_peak_temp_f !== null &&
    event.compost_peak_temp_f !== ''
  ) {
    immediate.push({
      label: 'Compost Peak Temperature',
      value: `${event.compost_peak_temp_f} °F`,
      priority: 'immediate',
      category: 'measurement'
    });
  }
  if (
    event.compost_duration_days_at_temp !== undefined &&
    event.compost_duration_days_at_temp !== null &&
    event.compost_duration_days_at_temp !== ''
  ) {
    immediate.push({
      label: 'Days at Temperature',
      value: `${event.compost_duration_days_at_temp} days`,
      priority: 'immediate',
      category: 'measurement'
    });
  }
  if (
    event.compost_turning_count !== undefined &&
    event.compost_turning_count !== null &&
    event.compost_turning_count !== ''
  ) {
    immediate.push({
      label: 'Compost Turnings',
      value: String(event.compost_turning_count),
      priority: 'immediate',
      category: 'measurement'
    });
  }
  if (event.compost_method) {
    const methodMap: Record<string, string> = {
      windrow: 'Windrow (turned, open air)',
      static_aerated: 'Static Aerated Pile',
      in_vessel: 'In-Vessel'
    };
    immediate.push({
      label: 'Compost Method',
      value: methodMap[String(event.compost_method)] || String(event.compost_method),
      priority: 'immediate',
      category: 'certification'
    });
  }
  if (
    event.compost_initial_cn_ratio !== undefined &&
    event.compost_initial_cn_ratio !== null &&
    event.compost_initial_cn_ratio !== ''
  ) {
    immediate.push({
      label: 'Initial C:N Ratio',
      value: `${event.compost_initial_cn_ratio}:1`,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // NOP Compliance: Raw Manure Timing (OM subtype, 7 CFR 205.203(c)(1))
  if (event.manure_harvest_interval) {
    const manureIntervalMap: Record<string, string> = {
      '120': '120 days (edible portion contacts soil)',
      '90': '90 days (edible portion does not contact soil)',
      na: 'N/A — composted or no manure applied'
    };
    immediate.push({
      label: 'Manure Harvest Interval',
      value:
        manureIntervalMap[String(event.manure_harvest_interval)] ||
        String(event.manure_harvest_interval),
      priority: 'immediate',
      category: 'certification'
    });
  }
  if (event.manure_application_date) {
    details.push({
      label: 'Manure Application Date',
      value: String(event.manure_application_date),
      priority: 'details',
      category: 'traceability'
    });
  }

  // ENHANCED: Tillage Depth for Soil CO2 Flux Calculations (TI events ONLY)
  // Research-based: shallow=50, medium=150, deep=300 kg CO2e/ha
  const soilType = event.soil_management_type || event.type || '';
  if (event.tillage_depth && (soilType === 'TI' || soilType === 'Tillage Implementation')) {
    const unit = event.tillage_depth_unit || 'cm';
    const depthValue = parseFloat(event.tillage_depth);
    let depthCategory = '';

    // Categorize depth for consumer understanding
    if (depthValue <= 10) {
      depthCategory = ' (Shallow - minimal soil disturbance)';
    } else if (depthValue <= 25) {
      depthCategory = ' (Medium - moderate soil disturbance)';
    } else {
      depthCategory = ' (Deep - significant soil disturbance)';
    }

    immediate.push({
      label: 'Tillage Depth',
      value: `${event.tillage_depth} ${unit}${depthCategory}`,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // SECONDARY DISPLAY - Operational details from SoilManagementTab form

  // Production Efficiency (from SoilManagementTab form) — skip "normal" (adds no value)
  if (event.production_efficiency && event.production_efficiency !== 'normal') {
    secondary.push({
      label: 'Operation Efficiency',
      value: getReadableFieldValue('operation_efficiency', event.production_efficiency),
      priority: 'secondary',
      category: 'operational'
    });
  }

  // Transportation Distance (from SoilManagementTab form)
  if (event.transportation_distance) {
    const unit = event.transportation_unit || 'km';
    secondary.push({
      label: 'Transportation Distance',
      value: `${event.transportation_distance} ${unit}`,
      priority: 'secondary',
      category: 'measurement'
    });
  }

  // DETAILS DISPLAY - Soil Properties and Environmental Details from SoilManagementTab form

  // Soil Properties (from SoilManagementTab soil properties section)
  // Note: soil_ph moved to immediate display for better visibility

  // Organic matter moved to immediate display above

  if (event.soil_texture) {
    details.push({
      label: 'Soil Texture',
      value: getReadableFieldValue('soil_texture', event.soil_texture),
      priority: 'details',
      category: 'environmental'
    });
  }

  // NOP Audit Fields — important for organic inspection traceability
  // Check both direct fields and extra_data (form data often stored there)
  const soilPh = event.soil_ph ?? extraData.soil_ph;
  if (soilPh !== undefined && soilPh !== null && soilPh !== '' && !isNaN(Number(soilPh))) {
    details.push({
      label: 'Soil pH',
      value: String(soilPh),
      priority: 'details',
      category: 'environmental'
    });
  }

  const organicMatterDetail =
    event.organic_matter_percentage ??
    event.organic_matter ??
    extraData.organic_matter_percentage ??
    extraData.organic_matter;
  if (
    organicMatterDetail !== undefined &&
    organicMatterDetail !== null &&
    organicMatterDetail !== ''
  ) {
    details.push({
      label: 'Organic Matter',
      value: `${organicMatterDetail}%`,
      priority: 'details',
      category: 'environmental'
    });
  }

  const workingDepth =
    event.working_depth ??
    event.depth ??
    event.tillage_depth ??
    extraData.working_depth ??
    extraData.depth;
  const depthUnit = event.depth_unit ?? extraData.depth_unit ?? 'cm';
  if (workingDepth !== undefined && workingDepth !== null && workingDepth !== '') {
    details.push({
      label: 'Working Depth',
      value: `${workingDepth} ${depthUnit}`,
      priority: 'details',
      category: 'operational'
    });
  }

  const blockId = event.block_id ?? extraData.block_id;
  if (blockId && String(blockId).trim()) {
    details.push({
      label: 'Block / Section',
      value: String(blockId),
      priority: 'details',
      category: 'traceability'
    });
  }

  const cropVariety = event.variety ?? extraData.variety;
  if (cropVariety && String(cropVariety).trim()) {
    details.push({
      label: 'Crop Variety',
      value: String(cropVariety),
      priority: 'details',
      category: 'traceability'
    });
  }

  // soil_moisture removed from display — field was removed from form (Sprint 2 Epic 2.1.3)
  // because it duplicates Weather event data. Real events will never have this value.

  // weather_conditions removed from display — field was removed from form (Sprint 2 Epic 2.1.3)
  // for the same reason. Environmental conditions are tracked via Weather events.

  // Ghost field cleanup: Removed temperature_range — removed from form (Sprint 2 Epic 2.1.3)

  if (event.equipment_used) {
    details.push({
      label: 'Equipment Used',
      value: getReadableFieldValue('equipment_used', event.equipment_used),
      priority: 'details',
      category: 'operational'
    });
  }

  // Tillage-specific Details (if applicable) - Consumer-friendly mapping
  // CRITICAL FIX: Check both event-level and extra_data for tillage fields
  // Tillage fields are stored in extra_data when event subtype is 'TI'
  const tillageType = event.tillage_type || extraData.tillage_type;
  const tillageIntensity = event.tillage_intensity || extraData.tillage_intensity;
  const tillageDirection = event.tillage_direction || extraData.tillage_direction;
  const residueManagement = event.residue_management || extraData.residue_management;

  if (tillageType) {
    const tillageTypeMap: Record<string, string> = {
      conventional_plow: '🚜 Conventional Plow - Deep inversion',
      chisel_plow: '⚡ Chisel Plow - Reduced tillage',
      disk_harrow: '💿 Disk Harrow - Surface cultivation',
      no_till: '🌱 No-Till - Direct seeding',
      strip_till: '📏 Strip Till - Zonal tillage',
      minimum_till: '🔄 Minimum Till - Conservation tillage',
      subsoiling: '🔧 Subsoiling - Deep loosening',
      cultivator: '🌾 Cultivator - Shallow cultivation',
      ridge_till: 'Ridge Till - Row-based system'
    };

    secondary.push({
      label: 'Tillage Type',
      value: tillageTypeMap[tillageType] || tillageType,
      priority: 'secondary',
      category: 'operational'
    });
  }

  if (tillageIntensity) {
    const tillageIntensityMap: Record<string, string> = {
      high: 'High - Heavy disturbance',
      medium: 'Medium - Moderate disturbance',
      low: 'Low - Minimal disturbance',
      conservation: 'Conservation - Protective tillage'
    };

    secondary.push({
      label: 'Tillage Intensity',
      value: tillageIntensityMap[tillageIntensity] || tillageIntensity,
      priority: 'secondary',
      category: 'operational'
    });
  }

  if (tillageDirection) {
    const tillageDirectionMap: Record<string, string> = {
      across_slope: '🏔️ Across Slope - Erosion control',
      up_down_slope: '⬇️ Up/Down Slope - Standard',
      contour: '🌀 Contour - Following natural lines',
      random: '🔀 Random - Variable direction'
    };

    details.push({
      label: 'Tillage Direction',
      value: tillageDirectionMap[tillageDirection] || tillageDirection,
      priority: 'details',
      category: 'operational'
    });
  }

  if (residueManagement) {
    const residueManagementMap: Record<string, string> = {
      incorporated: '♻️ Incorporated - Mixed into soil',
      surface_left: '🌾 Surface Left - Protective cover',
      removed: '🚛 Removed - Harvested/burned',
      mulched: '🍂 Mulched - Chopped in place',
      partial_removal: '📏 Partial Removal - Mixed approach'
    };

    details.push({
      label: 'Residue Management',
      value: residueManagementMap[residueManagement] || residueManagement,
      priority: 'details',
      category: 'operational'
    });
  }

  // Grazing Management fields (GR subtype)
  const operationType = operationTypes[soilType] || soilType;
  if (soilType === 'GR' || operationType === 'Grazing Management') {
    if (normalizedEvent.animal_type) {
      details.push({
        label: 'Animal Type',
        value:
          normalizedEvent.animal_type.charAt(0).toUpperCase() +
          normalizedEvent.animal_type.slice(1),
        priority: 'details',
        category: 'grazing'
      });
    }
    if (normalizedEvent.animal_count) {
      details.push({
        label: 'Number of Animals',
        value: String(normalizedEvent.animal_count),
        priority: 'details',
        category: 'grazing'
      });
    }
    if (normalizedEvent.grazing_duration_days) {
      details.push({
        label: 'Grazing Duration',
        value: `${normalizedEvent.grazing_duration_days} days`,
        priority: 'details',
        category: 'grazing'
      });
    }
    if (normalizedEvent.grazing_purpose) {
      const purposeLabels: Record<string, string> = {
        weed_control: 'Weed Control',
        cover_crop: 'Cover Crop Termination',
        soil_health: 'Soil Health',
        vegetation_management: 'Vegetation Management'
      };
      details.push({
        label: 'Purpose',
        value: purposeLabels[normalizedEvent.grazing_purpose] || normalizedEvent.grazing_purpose,
        priority: 'details',
        category: 'grazing'
      });
    }
  }

  // Note: soil_management_notes removed from Technical Details because
  // the same observation text is already shown in Farmer's Field Notes

  // Universal fields: variety, block_id, growth_stage (soil management events)
  if (isValidValue(event.variety)) {
    secondary.push({
      label: 'Variety',
      value: event.variety,
      priority: 'secondary',
      category: 'operational'
    });
  }

  if (isValidValue(event.block_id)) {
    secondary.push({
      label: 'Block/Section',
      value: event.block_id,
      priority: 'secondary',
      category: 'operational'
    });
  }

  if (isValidValue(event.growth_stage)) {
    secondary.push({
      label: 'Growth Stage',
      value: getReadableFieldValue('growth_stage', event.growth_stage),
      priority: 'secondary',
      category: 'operational'
    });
  }

  // Organic Compliance Fields for Soil Management (NOP 205.203)
  const amendmentSupplier = event.amendment_source_supplier || extraData.amendment_source_supplier;
  if (isValidValue(amendmentSupplier)) {
    secondary.push({
      label: 'Amendment Supplier',
      value: amendmentSupplier,
      priority: 'secondary',
      category: 'verification'
    });
  }

  const cToNRatio = event.c_to_n_ratio || extraData.c_to_n_ratio;
  if (isValidValue(cToNRatio)) {
    secondary.push({
      label: 'C:N Ratio',
      value: cToNRatio,
      priority: 'secondary',
      category: 'measurement',
      tooltip: 'Carbon-to-nitrogen ratio of compost (NOP requires documentation)'
    });
  }

  const compostTemp =
    event.compost_temperature_reached_131f || extraData.compost_temperature_reached_131f;
  if (isValidValue(compostTemp)) {
    secondary.push({
      label: 'Compost Reached 131\u00b0F',
      value: getReadableFieldValue('compost_temperature_reached_131f', compostTemp),
      priority: 'secondary',
      category: 'verification',
      tooltip:
        'NOP requires compost to reach 131\u00b0F for 3+ days (in-vessel) or 15 days (windrow)'
    });
  }

  return { immediate, secondary, details };
}

/**
 * Extract and format pest management event fields according to display matrix
 * Enhanced to support all 6 pest management event types with comprehensive field display
 */
export function getPestManagementEventFields(event: any): EventFieldDisplay {
  const immediate: FieldDisplayItem[] = [];
  const secondary: FieldDisplayItem[] = [];
  const details: FieldDisplayItem[] = [];

  const extraData = event.extra_data || {};
  const description = event.description?.toLowerCase() || '';

  // Determine pest management type (standardized)
  const pestType = event.pest_management_type || 'SC';

  // Pest Management Type (standardized field name)
  if (event.pest_management_type) {
    const pestManagementTypes: Record<string, string> = {
      SC: 'Scouting & Monitoring',
      TM: 'Trap Monitoring',
      BR: 'Beneficial Release',
      PI: 'Pest Identification',
      TA: 'Threshold Assessment',
      IP: 'IPM Implementation'
    };

    const displayValue =
      pestManagementTypes[event.pest_management_type] || event.pest_management_type;

    immediate.push({
      label: 'Pest Management Type',
      value: displayValue,
      priority: 'immediate',
      category: 'operational'
    });
  }

  // Universal pest context fields (IMMEDIATE display) - All event types
  // Check both individual field (pest_species) and summary field (pest_species_observed)
  const pestSpeciesValue =
    event.pest_species || event.pest_species_observed || extraData.pest_species_observed;
  if (pestSpeciesValue) {
    const isSummaryEvent =
      event.is_summary === true ||
      event.is_summary === 'true' ||
      extraData.is_summary === true ||
      extraData.is_summary === 'true';

    immediate.push({
      label: isSummaryEvent ? 'Pest Species Observed' : 'Target Pest Species',
      value: pestSpeciesValue,
      priority: 'immediate',
      category: 'environmental'
    });
  }

  if (event.damage_percentage) {
    immediate.push({
      label: 'Crop Impact Level',
      value: `${event.damage_percentage}%`,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // Pest pressure level (IMMEDIATE for applicable types)
  // Check both individual field (pest_pressure_level) and summary field (average_pest_pressure)
  const pressureLevel =
    event.pest_pressure_level || event.average_pest_pressure || extraData.average_pest_pressure;
  if (pressureLevel && ['SC', 'TM', 'BR', 'PI', 'TA', 'IP'].includes(pestType)) {
    const pressureMap: Record<string, string> = {
      none: 'None - No pests observed',
      low: 'Low pressure detected',
      medium: 'Medium pressure - monitoring required',
      moderate: 'Moderate - At treatment threshold',
      high: 'High pressure - action needed',
      severe: 'Severe - Immediate action required',
      critical: 'Critical pressure - immediate action'
    };

    const isSummaryEvent =
      event.is_summary === true ||
      event.is_summary === 'true' ||
      extraData.is_summary === true ||
      extraData.is_summary === 'true';

    immediate.push({
      label: isSummaryEvent ? 'Average Pest Pressure' : 'Pest Pressure Level',
      value: pressureMap[pressureLevel] || pressureLevel,
      priority: 'immediate',
      category: 'environmental'
    });
  }

  // NOP Compliance — 7 CFR 205.206 monitoring documentation.
  // identified_by: who confirmed the pest ID (farmer-self, agronomist, lab, etc.)
  // threshold_rationale: why action threshold was/wasn't met — required for IPM
  // justification. PDF mass-balance reconciliation uses get_identified_by_display();
  // we must mirror those labels here so consumer card matches certifier-facing PDF.
  const identifiedBy = event.identified_by || extraData.identified_by;
  if (identifiedBy) {
    const identifiedByLabels: Record<string, string> = {
      farmer: 'Farmer / Farm Staff',
      agronomist: 'Licensed Agronomist',
      entomologist: 'Entomologist',
      extension_service: 'Extension Service Agent',
      crop_consultant: 'Crop Consultant',
      lab: 'Laboratory Analysis'
    };
    details.push({
      label: 'Pest Identified By',
      value: identifiedByLabels[identifiedBy] || identifiedBy,
      priority: 'details',
      category: 'verification'
    });
  }

  const thresholdRationale = event.threshold_rationale || extraData.threshold_rationale;
  if (thresholdRationale) {
    secondary.push({
      label: 'Action Threshold Rationale',
      value: thresholdRationale,
      priority: 'secondary',
      category: 'documentation'
    });
  }

  // Event type-specific fields (SECONDARY display)

  // SC (Scouting) - Monitoring and assessment fields
  if (pestType === 'SC') {
    const isSummary =
      event.is_summary === true ||
      event.is_summary === 'true' ||
      extraData.is_summary === true ||
      extraData.is_summary === 'true';

    if (isSummary) {
      // Summary/Aggregate scouting fields

      // Total area scouted (form sends area_covered_total, normalizer maps to field_area_total)
      const totalArea =
        event.field_area_total ||
        event.area_covered_total ||
        extraData.field_area_total ||
        extraData.area_covered_total;
      if (totalArea) {
        const areaUnit = event.area_unit || extraData.area_unit || 'ha';
        secondary.push({
          label: 'Total Area Scouted',
          value: `${totalArea} ${areaUnit}`,
          priority: 'secondary',
          category: 'measurement'
        });
      }

      // Total fuel consumed (aggregate)
      const totalFuel = event.fuel_consumed_total || extraData.fuel_consumed_total;
      if (totalFuel) {
        const fuelUnit = event.fuel_unit || extraData.fuel_unit || 'L';
        secondary.push({
          label: 'Total Fuel Consumed',
          value: `${totalFuel} ${fuelUnit}`,
          priority: 'secondary',
          category: 'operational'
        });
      }
    } else {
      // Individual scouting event fields
      // Ghost field cleanup: Removed time_spent_hours (never in form)

      const areaScouted = event.area_covered;
      if (areaScouted) {
        const areaUnit = event.area_unit || 'ha';
        secondary.push({
          label: 'Area Scouted',
          value: `${areaScouted} ${areaUnit}`,
          priority: 'secondary',
          category: 'measurement'
        });
      }
    }
  }

  // TM (Trap Monitoring) - Trap-specific fields
  if (pestType === 'TM') {
    if (event.trap_count) {
      secondary.push({
        label: 'Number of Traps',
        value: `${event.trap_count} traps monitored`,
        priority: 'secondary',
        category: 'measurement'
      });
    }

    // Ghost field cleanup: Removed time_spent_hours (never in form)
  }

  // BR (Beneficial Release) - Biological control fields
  if (pestType === 'BR') {
    if (event.beneficial_species) {
      secondary.push({
        label: 'Beneficial Species Released',
        value: event.beneficial_species,
        priority: 'secondary',
        category: 'environmental'
      });
    }

    if (event.release_quantity) {
      const qty = event.release_quantity;
      const numQty = typeof qty === 'number' ? qty : Number(qty);
      const formattedQty = !isNaN(numQty) ? numQty.toLocaleString() : String(qty);
      secondary.push({
        label: 'Release Quantity',
        value: formattedQty,
        priority: 'secondary',
        category: 'measurement'
      });
    }
  }

  // PI (Pest Identification) - Ghost field cleanup: Removed time_spent_hours (never in form)

  // TA (Threshold Assessment) - Assessment-specific fields
  if (pestType === 'TA') {
    if (event.economic_threshold_met != null && event.economic_threshold_met !== '') {
      secondary.push({
        label: 'Economic Threshold Status',
        value:
          event.economic_threshold_met === true || event.economic_threshold_met === 'true'
            ? 'Threshold exceeded - action required'
            : 'Below threshold - continue monitoring',
        priority: 'secondary',
        category: 'measurement'
      });
    }

    // Ghost field cleanup: Removed time_spent_hours (never in form)
  }

  // IP (IPM Implementation) - Comprehensive IPM fields
  if (pestType === 'IP') {
    if (event.beneficial_species) {
      secondary.push({
        label: 'Beneficial Species Used',
        value: event.beneficial_species,
        priority: 'secondary',
        category: 'environmental'
      });
    }

    if (event.release_quantity) {
      const qty = event.release_quantity;
      const numQty = typeof qty === 'number' ? qty : Number(qty);
      const formattedQty = !isNaN(numQty) ? numQty.toLocaleString() : String(qty);
      secondary.push({
        label: 'Beneficial Release Quantity',
        value: formattedQty,
        priority: 'secondary',
        category: 'measurement'
      });
    }

    if (event.economic_threshold_met != null && event.economic_threshold_met !== '') {
      secondary.push({
        label: 'Economic Threshold',
        value:
          event.economic_threshold_met === true || event.economic_threshold_met === 'true'
            ? 'Threshold-driven implementation'
            : 'Preventive implementation',
        priority: 'secondary',
        category: 'measurement'
      });
    }
  }

  // Ghost field cleanup: Removed field_area_hectares (form uses area_covered) and
  // travel_distance_km (never in form — form uses fuel_consumed for carbon calculations)

  if (event.weather_conditions) {
    details.push({
      label: 'Weather Conditions',
      value: getReadableFieldValue('weather_conditions', event.weather_conditions),
      priority: 'details',
      category: 'environmental'
    });
  }

  if (event.crop_growth_stage) {
    details.push({
      label: 'Crop Growth Stage',
      value: getReadableFieldValue('crop_growth_stage', event.crop_growth_stage),
      priority: 'details',
      category: 'environmental'
    });
  }

  if (event.action_recommended) {
    details.push({
      label: 'Recommended Action',
      value: event.action_recommended.replace(/_/g, ' '),
      priority: 'details',
      category: 'operational'
    });
  }

  // IPM Strategy will be handled at the end for all types

  // Legacy support for existing extraData structure
  if (extraData.type && !immediate.find((item) => item.label === 'IPM Activity')) {
    immediate.push({
      label: 'IPM Activity',
      value: extraData.type,
      priority: 'immediate',
      category: 'environmental'
    });
  }

  // Legacy beneficial release support
  if (description.includes('beneficial') || description.includes('release')) {
    if (
      extraData.beneficialSpecies &&
      !secondary.find((item) => item.label.includes('Beneficial'))
    ) {
      secondary.push({
        label: 'Beneficial Species',
        value: extraData.beneficialSpecies,
        priority: 'secondary',
        category: 'environmental'
      });
    }
    if (extraData.releaseRate && !secondary.find((item) => item.label.includes('Release'))) {
      secondary.push({
        label: 'Release Rate',
        value: extraData.releaseRate,
        priority: 'secondary',
        category: 'measurement'
      });
    }
  }

  // Legacy monitoring support
  if (description.includes('scout') || description.includes('monitor')) {
    if (extraData.pestPressure && !immediate.find((item) => item.label.includes('Pressure'))) {
      immediate.push({
        label: 'Pest Pressure',
        value: extraData.pestPressure,
        priority: 'immediate',
        category: 'environmental'
      });
    }
    if (extraData.monitoringMethod) {
      details.push({
        label: 'Monitoring Method',
        value: extraData.monitoringMethod,
        priority: 'details',
        category: 'operational'
      });
    }
  }

  // Additional important fields that might be missing

  // Action Threshold Met (secondary display) - important operational decision indicator
  // Only show when explicitly true — model defaults to false for all events,
  // so false/'' is indistinguishable from "farmer never set this field"
  if (event.action_threshold_met === true || event.action_threshold_met === 'true') {
    secondary.push({
      label: 'Action Threshold Met',
      value: 'Yes - Action Required',
      priority: 'secondary',
      category: 'measurement'
    });
  }

  // IPM Strategy (details display) - show for all types, not just IP
  if (event.ipm_strategy) {
    details.push({
      label: 'IPM Strategy',
      value: event.ipm_strategy,
      priority: 'details',
      category: 'documentation'
    });
  }

  // Note: event.observation is already shown as "Farmer's Field Notes" in the card body.
  // Do NOT duplicate it here in Technical Details.

  // ============================================================
  // Sprint 3 Epic 3.2: Consumer Trust Fields for transparency
  // These fields enhance consumer confidence in sustainable pest management
  // ============================================================

  // Beneficial Insects Used - SECONDARY priority for organic/sustainable transparency
  if (event.beneficial_insects_used) {
    // Normalize boolean/string true/false to "yes"/"no" for mapping lookup
    const rawInsects = event.beneficial_insects_used;
    const insectsValue =
      rawInsects === true || String(rawInsects).toLowerCase() === 'true'
        ? 'yes'
        : rawInsects === false || String(rawInsects).toLowerCase() === 'false'
        ? 'no'
        : rawInsects;
    secondary.push({
      label: 'Beneficial Insects',
      value: getReadableFieldValue('beneficial_insects_used', insectsValue),
      priority: 'secondary',
      category: 'environmental',
      tooltip:
        'Use of beneficial insects as part of sustainable IPM strategy (builds consumer trust)'
    });
  }

  // Chemical-Free Period - SECONDARY priority for organic/sustainable transparency
  if (
    event.chemical_free_period_days !== undefined &&
    event.chemical_free_period_days !== null &&
    event.chemical_free_period_days !== ''
  ) {
    const days = parseInt(String(event.chemical_free_period_days), 10);
    let displayValue = `${days} days since last chemical application`;
    if (days > 365) {
      displayValue = `Over 1 year chemical-free (${days} days)`;
    } else if (days > 90) {
      displayValue = `${days} days chemical-free`;
    }
    secondary.push({
      label: 'Chemical-Free Period',
      value: displayValue,
      priority: 'secondary',
      category: 'verification',
      tooltip: 'Days since last synthetic chemical application (consumer food safety transparency)'
    });
  }

  // ============================================================
  // Sprint 3 Epic 3.1: Fuel & Equipment Fields (context-aware placement)
  // For Scouting (SC): Move to DETAILS (observation-only, fuel data irrelevant to consumers)
  // For other types (IP, TM, BR, PI): Keep in SECONDARY (actual equipment work)
  // ============================================================

  // Scouting is observation-only - operational data belongs in Technical Details
  const isScoutingType = pestType === 'SC';
  const operationalTarget = isScoutingType ? details : secondary;

  // Fuel Consumed - SECONDARY for operational types, DETAILS for scouting
  if (isValidValue(event.fuel_consumed)) {
    const fuelUnit = event.fuel_unit || extraData.fuel_unit || 'L';
    const fuelType = event.fuel_type || extraData.fuel_type;

    operationalTarget.push({
      label: getFuelConsumptionLabel(fuelType),
      value: `${event.fuel_consumed} ${fuelUnit}`,
      priority: isScoutingType ? 'details' : 'secondary',
      category: 'operational',
      tooltip:
        fuelType === 'electric'
          ? 'Electrical energy used for pest management equipment (kWh)'
          : 'Fuel used for pest management equipment and transportation'
    });
  }

  // Equipment Hours - SECONDARY for operational types, DETAILS for scouting
  if (isValidValue(event.equipment_hours)) {
    operationalTarget.push({
      label: 'Equipment Hours',
      value: `${event.equipment_hours} hours`,
      priority: isScoutingType ? 'details' : 'secondary',
      category: 'measurement',
      tooltip: 'Total hours equipment was operated for this pest management activity'
    });
  }

  // Fuel Type - Always DETAILS (technical information)
  if (isValidValue(event.fuel_type)) {
    details.push({
      label: 'Fuel Type',
      value: getReadableFieldValue('fuel_type', event.fuel_type),
      priority: 'details',
      category: 'operational'
    });
  }

  // Production Efficiency - SECONDARY for operational types, DETAILS for scouting
  // Skip "normal" — it adds no informational value to consumers
  if (isValidValue(event.production_efficiency) && event.production_efficiency !== 'normal') {
    const efficiencyMap: Record<string, string> = {
      high: '⚡ High Efficiency',
      low: '⚠️ Low Efficiency'
    };

    operationalTarget.push({
      label: 'Operation Efficiency',
      value: efficiencyMap[event.production_efficiency] || event.production_efficiency,
      priority: isScoutingType ? 'details' : 'secondary',
      category: 'operational',
      tooltip: 'Equipment operation efficiency rating for carbon calculation accuracy'
    });
  }

  // Universal fields: variety, block_id, growth_stage (pest management events)
  if (isValidValue(event.variety)) {
    secondary.push({
      label: 'Variety',
      value: event.variety,
      priority: 'secondary',
      category: 'operational'
    });
  }

  if (isValidValue(event.block_id)) {
    secondary.push({
      label: 'Block/Section',
      value: event.block_id,
      priority: 'secondary',
      category: 'operational'
    });
  }

  if (isValidValue(event.growth_stage)) {
    secondary.push({
      label: 'Growth Stage',
      value: getReadableFieldValue('growth_stage', event.growth_stage),
      priority: 'secondary',
      category: 'operational'
    });
  }

  return { immediate, secondary, details };
}

/**
 * Extract and format business event fields according to display matrix
 */
export function getBusinessEventFields(event: any): EventFieldDisplay {
  const immediate: FieldDisplayItem[] = [];
  const secondary: FieldDisplayItem[] = [];
  const details: FieldDisplayItem[] = [];

  // const extraData = event.extra_data || {};

  // Business Event Type (standardized field name)
  if (event.business_event_type) {
    const businessEventTypes: Record<string, string> = {
      CE: 'Certification Event',
      CM: 'Compliance Activity',
      IN: 'Inspection Process',
      'event.business.certification': 'Certification Event',
      'event.business.compliance': 'Compliance Activity',
      'event.business.inspection': 'Inspection Process',
      'business.certification': 'Certification Event',
      'business.compliance': 'Compliance Activity',
      'business.inspection': 'Inspection Process',
      certification: 'Certification Event',
      compliance: 'Compliance Activity',
      inspection: 'Inspection Process'
    };

    const displayValue = businessEventTypes[event.business_event_type] || event.business_event_type;

    immediate.push({
      label: 'Business Event Type',
      value: displayValue,
      priority: 'immediate',
      category: 'operational'
    });
  }

  // Event Name (standardized field name)
  if (event.business_event_name) {
    immediate.push({
      label: 'Event Name',
      value: event.business_event_name,
      priority: 'immediate',
      category: 'operational'
    });
  }

  // Business Activity Type (standardized field name)
  if (event.business_activity_type) {
    const businessActivityTypes: Record<string, string> = {
      certification: 'Certification Achievement',
      carbon_credits: 'Carbon Credits Transaction',
      sustainability_audit: 'Sustainability Assessment',
      verification: 'Third-Party Verification',
      compliance: 'Regulatory Compliance',
      transparency: 'Transparency Initiative'
    };

    const displayValue =
      businessActivityTypes[event.business_activity_type] || event.business_activity_type;

    immediate.push({
      label: 'Business Activity Type',
      value: displayValue,
      priority: 'immediate',
      category: 'verification'
    });
  }

  // Certification Details (secondary display fields)
  if (event.certification_type) {
    const certificationTypes: Record<string, string> = {
      organic_usda: 'USDA Organic Certification',
      global_gap: 'GlobalG.A.P. Certification',
      carbon_neutral: 'Carbon Neutral Certification',
      rainforest_alliance: 'Rainforest Alliance Certified',
      fair_trade: 'Fair Trade Certified',
      regenerative: 'Regenerative Organic Certified',
      sustainable_agriculture: 'Sustainable Agriculture Standard',
      water_stewardship: 'Water Stewardship Certification',
      phytosanitary: 'Phytosanitary Certificate',
      haccp: 'HACCP Food Safety',
      iso_14001: 'ISO 14001 Environmental Management'
    };

    const displayValue = certificationTypes[event.certification_type] || event.certification_type;

    secondary.push({
      label: 'Certification Type',
      value: displayValue,
      priority: 'secondary',
      category: 'verification'
    });
  }

  // Carbon Credits Information (secondary display fields)
  // Only display when a meaningful positive value exists (not empty, 0, or NaN)
  if (isValidValue(event.carbon_credits_earned) && parseFloat(event.carbon_credits_earned) > 0) {
    const unit = event.carbon_credits_unit || 'credits';
    secondary.push({
      label: 'Carbon Credits Earned',
      value: `${event.carbon_credits_earned} ${unit}`,
      priority: 'secondary',
      category: 'measurement'
    });
  }

  // Verification Status (details display fields)
  if (event.verification_status) {
    const verificationStatuses: Record<string, string> = {
      pending: 'Pending Verification',
      verified: 'Verified',
      in_progress: 'Verification In Progress',
      failed: 'Verification Failed',
      not_applicable: 'Not Applicable',
      blockchain_verified: 'Blockchain Verified'
    };

    const displayValue =
      verificationStatuses[event.verification_status] || event.verification_status;

    details.push({
      label: 'Verification Status',
      value: displayValue,
      priority: 'details',
      category: 'verification'
    });
  }

  // Sustainability Practice (details display fields)
  if (event.sustainability_practice) {
    const sustainabilityPractices: Record<string, string> = {
      cover_cropping: 'Cover Cropping Implementation',
      no_till: 'No-Till Farming Adoption',
      integrated_pest: 'Integrated Pest Management',
      water_conservation: 'Water Conservation Measures',
      renewable_energy: 'Renewable Energy Installation',
      composting: 'On-Farm Composting Program',
      biodiversity: 'Biodiversity Conservation',
      soil_health: 'Soil Health Improvement',
      'regenerative agriculture': 'Regenerative Agriculture Practices'
    };

    const displayValue =
      sustainabilityPractices[event.sustainability_practice] || event.sustainability_practice;

    details.push({
      label: 'Sustainability Practice',
      value: displayValue,
      priority: 'details',
      category: 'environmental'
    });
  }

  // Trust Impact (secondary display fields)
  if (event.trust_impact) {
    const trustImpactLevels: Record<string, string> = {
      high: 'High Consumer Trust Impact',
      medium: 'Moderate Consumer Trust Impact',
      low: 'Baseline Trust Impact'
    };
    secondary.push({
      label: 'Trust Impact',
      value: trustImpactLevels[event.trust_impact] || event.trust_impact,
      priority: 'secondary',
      category: 'verification'
    });
  }

  // Transparency Benefit (secondary display fields)
  if (event.transparency_benefit) {
    secondary.push({
      label: 'Transparency Benefit',
      value: event.transparency_benefit,
      priority: 'secondary',
      category: 'verification'
    });
  }

  // Business Observations & Notes — REMOVED from field display
  // The observation text already appears in "Farmer's Field Notes" (rendered by the card component).
  // Displaying it again here as "Business Notes" causes duplication.

  // ============================================================
  // Sprint 3 Epic 3.2: Consumer Trust Fields for transparency
  // These fields enhance consumer confidence in certifications
  // ============================================================

  // Verified Certifier Name - SECONDARY priority for certification transparency
  if (event.verified_certifier_name) {
    secondary.push({
      label: 'Certifying Organization',
      value: event.verified_certifier_name,
      priority: 'secondary',
      category: 'verification',
      tooltip: 'Name of the organization that certified this achievement (builds consumer trust)'
    });
  }

  // Certificate Number - SECONDARY priority for export/compliance traceability
  if (isValidValue(event.certificate_number)) {
    secondary.push({
      label: 'Certificate Number',
      value: event.certificate_number,
      priority: 'secondary',
      category: 'verification'
    });
  }

  // Legacy support is no longer needed - all data is now standardized

  return { immediate, secondary, details };
}

/**
 * Main function to get formatted field display for any event type
 */
export function getEventFieldDisplay(event: any): EventFieldDisplay {
  // Normalize event data before processing to ensure field name consistency
  const normalizedEvent = normalizeEventData(event);

  const eventType = normalizedEvent.type?.toLowerCase() || '';
  const description = normalizedEvent.description?.toLowerCase() || '';

  // Determine event category and apply appropriate formatter
  // 🚨 CRITICAL FIX: Check event_type NUMBER first before description keywords
  // This prevents false positives where description contains words like "storm" or "frost"
  // Priority: event_type (definitive) > type codes (definitive) > description (fuzzy match)

  // Weather Events (event_type === 0)
  if (normalizedEvent.event_type === 0) {
    const baseFields = getWeatherEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  // Production Events (event_type === 1)
  if (normalizedEvent.event_type === 1) {
    const baseFields = getProductionEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  // Chemical Events (event_type === 2)
  if (normalizedEvent.event_type === 2) {
    const baseFields = getChemicalEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  // General Events (event_type === 3)
  if (normalizedEvent.event_type === 3 || normalizedEvent.type === 'general') {
    const baseFields = getGeneralEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  // Soil Management Events (event_type === 5)
  if (normalizedEvent.event_type === 5) {
    const baseFields = getSoilManagementEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  // Pest Management Events (event_type === 6)
  if (normalizedEvent.event_type === 6) {
    const baseFields = getPestManagementEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  // Business Events (event_type === 7)
  if (normalizedEvent.event_type === 7) {
    const baseFields = getBusinessEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  // Fallback: Use type codes and description keywords for events without explicit event_type
  // Weather event codes
  if (['FR', 'DR', 'HL', 'HT', 'TS', 'HW', 'HH', 'LH'].includes(normalizedEvent.type)) {
    const baseFields = getWeatherEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  // Production event codes
  if (['PL', 'HA', 'IR', 'PR', 'TR'].includes(normalizedEvent.type)) {
    const baseFields = getProductionEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  // Description-based detection (last resort, prone to false positives)
  if (
    eventType.includes('weather') ||
    description.includes('weather') ||
    description.includes('frost') ||
    description.includes('drought') ||
    description.includes('hail') ||
    description.includes('storm')
  ) {
    const baseFields = getWeatherEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  if (
    eventType.includes('chemical') ||
    description.includes('fertilizer') ||
    description.includes('spray') ||
    description.includes('pesticide')
  ) {
    const baseFields = getChemicalEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  if (
    eventType.includes('production') ||
    description.includes('harvest') ||
    description.includes('planting') ||
    description.includes('irrigation')
  ) {
    const baseFields = getProductionEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  if (
    eventType.includes('equipment') ||
    description.includes('tractor') ||
    description.includes('machinery') ||
    description.includes('fuel') ||
    normalizedEvent.event_type === 4 ||
    // Equipment event type codes from EquipmentEvent model
    ['FC', 'MN', 'RE', 'CA', 'BD', 'EI'].includes(normalizedEvent.type) ||
    ['fc', 'mn', 're', 'ca', 'bd', 'ei'].includes(eventType)
  ) {
    const baseFields = getEquipmentEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  if (
    eventType.includes('soil') ||
    description.includes('soil') ||
    description.includes('organic matter') ||
    description.includes(' ph ') ||
    description.includes('ph level') ||
    description.includes('ph test') ||
    normalizedEvent.event_type === 5 ||
    ['ST', 'PA', 'OM', 'CC', 'TI', 'CO', 'GR'].includes(normalizedEvent.type)
  ) {
    const baseFields = getSoilManagementEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  if (
    eventType.includes('pest') ||
    description.includes('pest') ||
    description.includes('beneficial') ||
    description.includes('ipm') ||
    description.includes('scout') ||
    description.includes('trap') ||
    description.includes('identification') ||
    description.includes('threshold') ||
    normalizedEvent.event_type === 6 ||
    ['SC', 'TM', 'BR', 'PI', 'TA', 'IP'].includes(normalizedEvent.type)
  ) {
    const baseFields = getPestManagementEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  if (
    eventType.includes('business') ||
    description.includes('certification') ||
    description.includes('audit') ||
    description.includes('training') ||
    normalizedEvent.event_type === 7 ||
    ['CE', 'CM', 'IN'].includes(normalizedEvent.type)
  ) {
    const baseFields = getBusinessEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  // Default to general event handling
  const baseFields = getGeneralEventFields(normalizedEvent);
  return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
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
function mergeCustomFieldsIntoDisplay(
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
      priority: 'secondary' // Custom fields appear in secondary section
    };
  });

  // Merge custom fields into secondary array (appears after standard fields)
  return {
    ...fieldDisplay,
    secondary: [...fieldDisplay.secondary, ...customFieldItems]
  };
}
