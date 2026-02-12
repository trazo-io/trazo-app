/**
 * Field Display Utilities
 * Implements the comprehensive field-by-field display matrix for all event types
 * Based on /trazo-back/field_display_matrix.md specifications
 *
 * IMPORTANT: This module expects standardized event data from the normalization layer.
 * All dual field checking patterns have been removed as data is now consistently normalized.
 */

/**
 * Normalize event data to standardized field names expected by field display utilities
 * This fixes the gap between backend API response field names and frontend expectations
 */
function normalizeEventData(event: any): any {
  const normalized = { ...event };

  // Debug logging for chemical events to understand data normalization
  const isChemicalEvent =
    event.description?.includes('fertilizer') ||
    event.description?.includes('Fertilizer') ||
    event.description?.includes('pesticide') ||
    event.description?.includes('herbicide') ||
    event.description?.includes('fungicide') ||
    event.commercial_name?.includes('fertilizer') ||
    event.commercial_name?.includes('Fertilizer') ||
    event.commercial_name?.includes('Miracle') ||
    event.type === 'CHEMICAL' ||
    event.event_type === 'CHEMICAL';

  if (isChemicalEvent) {
    console.log('🔧 CHEMICAL EVENT NORMALIZATION DEBUG:', {
      eventId: event.id,
      eventDescription: event.description,
      originalFields: {
        way_of_application: event.way_of_application,
        application_method: event.application_method,
        application_timing: event.application_timing,
        area_treated: event.area_treated,
        area_unit: event.area_unit,
        volume_applied: event.volume_applied,
        volume_unit: event.volume_unit,
        concentration: event.concentration,
        commercial_name: event.commercial_name,
        target_pest_disease: event.target_pest_disease,
        active_ingredient: event.active_ingredient,
        npk_ratio: event.npk_ratio,
        weather_conditions: event.weather_conditions,
        // *** ADD ACTUAL BACKEND API FIELD NAMES ***
        area: event.area, // Should be "20 ha"
        volume: event.volume, // Should be "10 L"
        type: event.type, // Backend event type
        event_type: event.event_type // Alternative event type field
      },
      extraData: event.extra_data
    });
  }

  // === COMPREHENSIVE FIELD NORMALIZATION FOR CHEMICAL EVENTS ===

  // Application Method Mapping
  if (event.way_of_application && !normalized.application_method) {
    normalized.application_method = event.way_of_application;
    console.log('✅ Mapped way_of_application to application_method:', event.way_of_application);
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
    // Map 'type' to 'operation_type' for field extraction
    if (event.type && !normalized.operation_type) {
      // normalized.operation_type = event.type;
      console.log('✅ Mapped type to operation_type:', event.type);
    }

    // Map 'name' to 'operation_name' for field extraction
    if (event.name && !normalized.operation_name) {
      normalized.operation_name = event.name;
      console.log('✅ Mapped name to operation_name:', event.name);
    }

    // Map equipment_name to structured equipment type if needed
    if (event.equipment_name && !normalized.equipment_type_structured) {
      normalized.equipment_type_structured = event.equipment_name.toLowerCase();
      console.log('✅ Mapped equipment_name to equipment_type_structured:', event.equipment_name);
    }

    // Ensure all numeric fields are properly mapped with units
    if (event.fuel_consumed !== undefined && !normalized.fuel_unit) {
      normalized.fuel_unit = 'L'; // Default unit for fuel
      console.log('✅ Added default fuel_unit: L');
    }

    if (event.area_worked !== undefined && !normalized.area_unit) {
      normalized.area_unit = 'ha'; // Default unit for area
      console.log('✅ Added default area_unit: ha');
    }

    console.log('🎯 FINAL EQUIPMENT NORMALIZED FIELDS:', {
      eventId: event.id,
      operation_type: normalized.operation_type,
      operation_name: normalized.operation_name,
      equipment_type_structured: normalized.equipment_type_structured,
      fuel_consumed: normalized.fuel_consumed,
      fuel_unit: normalized.fuel_unit,
      hours_operated: normalized.hours_operated,
      area_worked: normalized.area_worked,
      area_unit: normalized.area_unit,
      fuel_type: normalized.fuel_type,
      operation_efficiency: normalized.operation_efficiency
    });
  }

  // *** NEW: Handle API response field name differences ***
  // Parse combined area field (e.g., "20 ha" → area_treated: 20, area_unit: "ha")
  if (event.area && typeof event.area === 'string' && !normalized.area_treated) {
    const areaMatch = event.area.match(/^([0-9.]+)\s*(.+)$/);
    if (areaMatch) {
      normalized.area_treated = parseFloat(areaMatch[1]);
      normalized.area_unit = areaMatch[2];
      console.log(
        '✅ Parsed area field:',
        event.area,
        '→',
        normalized.area_treated,
        normalized.area_unit
      );
    }
  }

  // Parse combined volume field (e.g., "10 L" → volume_applied: 10, volume_unit: "L")
  if (event.volume && typeof event.volume === 'string' && !normalized.volume_applied) {
    const volumeMatch = event.volume.match(/^([0-9.]+)\s*(.+)$/);
    if (volumeMatch) {
      normalized.volume_applied = parseFloat(volumeMatch[1]);
      normalized.volume_unit = volumeMatch[2];
      console.log(
        '✅ Parsed volume field:',
        event.volume,
        '→',
        normalized.volume_applied,
        normalized.volume_unit
      );
    }
  }

  // Map concentration field (API uses "concentration", frontend expects "concentration")
  if (event.concentration && !normalized.concentration) {
    // Check if this is actually NPK ratio format (e.g., "10-10-10")
    if (event.concentration.includes('-') && !normalized.npk_ratio) {
      normalized.npk_ratio = event.concentration;
      console.log('✅ Mapped concentration to npk_ratio:', event.concentration);
    } else {
      normalized.concentration = event.concentration;
      console.log('✅ Mapped concentration field:', event.concentration);
    }
  }

  // Area and Coverage Mapping
  if (event.area_treated !== undefined && !normalized.area_treated) {
    normalized.area_treated = event.area_treated;
    console.log('✅ Mapped area_treated field:', event.area_treated);
  }

  if (event.area_unit && !normalized.area_unit) {
    normalized.area_unit = event.area_unit;
    console.log('✅ Mapped area_unit field:', event.area_unit);
  }

  // Volume and Application Details
  if (event.volume_applied !== undefined && !normalized.volume_applied) {
    normalized.volume_applied = event.volume_applied;
    console.log('✅ Mapped volume_applied field:', event.volume_applied);
  }

  if (event.volume_unit && !normalized.volume_unit) {
    normalized.volume_unit = event.volume_unit;
    console.log('✅ Mapped volume_unit field:', event.volume_unit);
  }

  // Concentration Mapping with percentage handling
  if (event.concentration !== undefined && !normalized.concentration) {
    normalized.concentration = event.concentration;
    console.log('✅ Mapped concentration field:', event.concentration);
  }

  // Application Timing Mapping
  if (event.application_timing && !normalized.application_timing) {
    normalized.application_timing = event.application_timing;
    console.log('✅ Mapped application_timing field:', event.application_timing);
  }

  // Product and Chemical Details
  if (event.commercial_name && !normalized.commercial_name) {
    normalized.commercial_name = event.commercial_name;
    console.log('✅ Mapped commercial_name field:', event.commercial_name);
  }

  if (event.target_pest_disease && !normalized.target_pest_disease) {
    normalized.target_pest_disease = event.target_pest_disease;
    console.log('✅ Mapped target_pest_disease field:', event.target_pest_disease);
  }

  if (event.active_ingredient && !normalized.active_ingredient) {
    normalized.active_ingredient = event.active_ingredient;
    console.log('✅ Mapped active_ingredient field:', event.active_ingredient);
  }

  if (event.npk_ratio && !normalized.npk_ratio) {
    normalized.npk_ratio = event.npk_ratio;
    console.log('✅ Mapped npk_ratio field:', event.npk_ratio);
  }

  // Weather Conditions Mapping
  if (event.weather_conditions && !normalized.weather_conditions) {
    normalized.weather_conditions = event.weather_conditions;
    console.log('✅ Mapped weather_conditions field:', event.weather_conditions);
  }

  // Extra Data Fallbacks (for cases where data is nested in extra_data)
  const extraData = event.extra_data || {};
  if (Object.keys(extraData).length > 0) {
    console.log('🔍 Checking extra_data for missing fields:', extraData);

    // Map fields from extra_data if main event fields are missing
    Object.keys(extraData).forEach((key) => {
      if (extraData[key] !== undefined && normalized[key] === undefined) {
        normalized[key] = extraData[key];
        console.log('✅ Mapped from extra_data:', key, '=', extraData[key]);
      }
    });
  }

  // Final debug log to show normalized result
  if (isChemicalEvent) {
    console.log('🎯 FINAL NORMALIZED FIELDS:', {
      eventId: event.id,
      normalizedFields: {
        commercial_name: normalized.commercial_name,
        application_method: normalized.application_method,
        target_pest_disease: normalized.target_pest_disease,
        area_treated: normalized.area_treated,
        area_unit: normalized.area_unit,
        application_timing: normalized.application_timing,
        weather_conditions: normalized.weather_conditions,
        concentration: normalized.concentration,
        volume_applied: normalized.volume_applied,
        volume_unit: normalized.volume_unit,
        active_ingredient: normalized.active_ingredient,
        npk_ratio: normalized.npk_ratio
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
      natural_gas: '🔥 Natural Gas'
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
    operation_efficiency: {
      // 🔧 Added emojis for consumer-friendly display
      high: '✅ High Efficiency',
      normal: '➖ Normal Efficiency',
      low: '⚠️ Low Efficiency'
    },
    weather_conditions: {
      // 🔧 Added weather emojis for consumer-friendly display
      calm_dry: '☀️ Calm & Dry - Ideal conditions',
      light_wind: '🌤️ Light Wind - Suitable conditions',
      humid: '💧 Humid - Acceptable conditions',
      windy: '💨 Windy - Challenging conditions',
      // Legacy mappings for backward compatibility
      calm_wet: '🌧️ Calm, wet conditions',
      windy_dry: '💨 Windy, dry conditions',
      windy_wet: '🌬️ Windy, wet conditions',
      rainy: '🌧️ Rainy conditions',
      sunny: '☀️ Sunny conditions',
      cloudy: '☁️ Cloudy conditions'
    },
    application_timing: {
      // 🔧 Added emojis for consumer-friendly display
      pre_plant: '🌱 Pre-Planting',
      post_emergence: '🌿 Post-Emergence',
      flowering: '🌸 Flowering Stage',
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
      // Legacy/generic mappings
      spray: '💦 Spray Application',
      broadcast: '📡 Broadcast Application',
      drip: '💧 Drip/Irrigation',
      foliar: '🍃 Foliar Application',
      injection: '💉 Soil Injection',
      granular: '⚫ Granular Application'
    },
    // SOIL MANAGEMENT FIELD MAPPINGS (Type 5)
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
      // Production event seed source for transparency
      // Form values from ProductionTab.jsx
      certified_organic: '🌱 Certified Organic Seeds',
      farm_saved: '♻️ Farm-Saved Seeds',
      local: '🏡 Local Nursery/Supplier',
      cooperative: '🤝 Farmer Cooperative',
      commercial: '🏭 Commercial Supplier',
      other: '📝 Other Source',
      // Legacy backend values
      imported: '✈️ Imported',
      certified: '✅ Certified Organic Seeds'
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
      copper_fungicide: '🔶 Copper-Based Fungicide',
      sulfur_fungicide: '🟡 Sulfur-Based Fungicide',
      biological_fungicide: '🌱 Biological Fungicide',
      // Pesticide subtypes (biological = ~70% lower carbon than synthetic)
      synthetic_pesticide: '🏭 Synthetic Pesticide',
      organic_pesticide: '🌿 Organic/Natural Pesticide',
      biological_pesticide: '🌱 Biological Pesticide',
      // Fertilizer subtypes (organic = 83% lower carbon than synthetic)
      synthetic_fertilizer: '🏭 Synthetic Fertilizer',
      organic_fertilizer: '🌱 Organic Fertilizer',
      slow_release_fertilizer: '⏳ Slow-Release Fertilizer'
    }
  };

  return fieldMappings[field]?.[value] || value;
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
  const weatherType = event.weather_type || event.type || extraData.type || '';

  // Weather field processing for frost events and other weather types

  // Frost Events (FR) - also check for type field
  if (description.includes('frost') || description.includes('freeze') || weatherType === 'FR') {
    // Check normalized event first, then fallback to extra_data
    const temperatureValue =
      event.lower_temperature !== undefined ? event.lower_temperature : extraData.lower_temperature;
    if (temperatureValue !== undefined) {
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
    console.log('🔍 HIGH TEMPERATURE DEBUG - Event data:', {
      eventId: event.id,
      description,
      weatherType,
      // Event object fields (where form data is actually stored)
      event_highest_temperature: event.highest_temperature,
      event_start_date: event.start_date,
      event_end_date: event.end_date,
      // ExtraData fields (fallback)
      extraData_highest_temperature: extraData.highest_temperature,
      extraData_start_date: extraData.start_date,
      extraData_end_date: extraData.end_date,
      fullExtraData: extraData,
      fullEvent: event
    });

    // Check event object field first (from form), then fallback to extraData
    const temperatureValue = event.highest_temperature || extraData.highest_temperature;
    if (temperatureValue !== undefined) {
      console.log('✅ Found highest temperature value:', temperatureValue);
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
    } else {
      console.log('❌ No highest temperature value found');
    }

    // Check event object field first (from form), then fallback to extraData
    const startDateValue = event.start_date || extraData.start_date;
    if (startDateValue) {
      console.log('✅ Found start date value:', startDateValue);
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
    } else {
      console.log('❌ No start date value found');
    }

    // Check event object field first (from form), then fallback to extraData
    const endDateValue = event.end_date || extraData.end_date;
    if (endDateValue) {
      console.log('✅ Found end date value:', endDateValue);
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
    } else {
      console.log('❌ No end date value found');
    }

    // Check event object field first (from form), then fallback to extraData
    const protectionValue = event.protection_measures || extraData.protection_measures;
    if (protectionValue) {
      console.log('✅ Found heat protection value:', protectionValue);
      immediate.push({
        label: 'Heat Protection',
        value: protectionValue,
        priority: 'immediate',
        category: 'environmental'
      });
    } else {
      console.log('❌ No heat protection value found');
    }
  }

  // Drought Events (DR)
  if (
    description.includes('drought') ||
    description.includes('water deficit') ||
    weatherType === 'DR'
  ) {
    // Check normalized event first, then fallback to extra_data
    const waterDeficitValue =
      event.water_deficit !== undefined ? event.water_deficit : extraData.water_deficit;
    if (waterDeficitValue !== undefined) {
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
    console.log('🔍 HAILSTORMS DEBUG - Event data:', {
      eventId: event.id,
      description,
      weatherType,
      // Event object fields (where form data is actually stored)
      event_weight: event.weight,
      event_diameter: event.diameter,
      event_duration: event.duration,
      event_way_of_protection: event.way_of_protection,
      // ExtraData fields (fallback)
      extraData_weight: extraData.weight,
      extraData_diameter: extraData.diameter,
      extraData_duration: extraData.duration,
      extraData_way_of_protection: extraData.way_of_protection,
      // Legacy/normalized field names
      average_hailstone_weight: event.average_hailstone_weight,
      average_hailstone_diameter: event.average_hailstone_diameter,
      extraData_average_weight: extraData.average_hailstone_weight,
      extraData_average_diameter: extraData.average_hailstone_diameter,
      fullExtraData: extraData,
      fullEvent: event
    });

    // Check event object fields first (from form), then fallback to extraData and normalized fields
    const hailWeightValue =
      event.weight ||
      extraData.weight ||
      event.average_hailstone_weight ||
      extraData.average_hailstone_weight;
    if (hailWeightValue !== undefined) {
      console.log('✅ Found hail weight value:', hailWeightValue);
      immediate.push({
        label: 'Average Hailstone Weight',
        value: `${hailWeightValue}`,
        priority: 'immediate',
        category: 'measurement'
      });
    } else {
      console.log('❌ No hail weight value found');
    }

    const hailDiameterValue =
      event.diameter ||
      extraData.diameter ||
      event.average_hailstone_diameter ||
      extraData.average_hailstone_diameter;
    if (hailDiameterValue !== undefined) {
      console.log('✅ Found hail diameter value:', hailDiameterValue);
      secondary.push({
        label: 'Average Hailstone Diameter',
        value: `${hailDiameterValue}`,
        priority: 'secondary',
        category: 'measurement'
      });
    } else {
      console.log('❌ No hail diameter value found');
    }

    // 🚨 CRITICAL FIX: Hailstorm duration should be in MINUTES (short events), not hours
    // Check event object field first (from form), then fallback to extraData and normalized fields
    const durationValue = event.duration || extraData.duration;
    if (durationValue !== undefined) {
      console.log('✅ Found duration value:', durationValue);
      secondary.push({
        label: 'Duration',
        value: `${durationValue} minutes`, // 🚨 FIX: Added "minutes" unit for Hailstorm events
        priority: 'secondary',
        category: 'measurement'
      });
    } else {
      console.log('❌ No duration value found');
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
      console.log('✅ Found protection method value:', protectionValue);
      immediate.push({
        label: 'Protection Method', // 🚨 FIX: Single consolidated label
        value: protectionValue,
        priority: 'immediate',
        category: 'environmental'
      });
    } else {
      console.log('❌ No protection method value found');
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
  // 🚨 CRITICAL: Exclude Hailstorm (HL) events - they have their own handler above
  // "Hailstorm" contains "storm" which would cause duplicate fields
  if (
    (description.includes('storm') ||
      description.includes('wind') ||
      weatherType === 'TS' ||
      weatherType === 'HW') &&
    weatherType !== 'HL' &&
    !description.includes('hail')
  ) {
    console.log('🔍 TROPICAL STORM DEBUG - Event data:', {
      eventId: event.id,
      description,
      weatherType,
      // Event object fields (where form data is actually stored)
      event_wind_speed: event.wind_speed,
      event_precipitation_amount: event.precipitation_amount,
      event_duration: event.duration,
      event_damage_assessment: event.damage_assessment,
      // ExtraData fields (fallback)
      extraData_wind_speed: extraData.wind_speed,
      extraData_precipitation_amount: extraData.precipitation_amount,
      extraData_duration: extraData.duration,
      extraData_damage_assessment: extraData.damage_assessment,
      fullExtraData: extraData,
      fullEvent: event
    });

    // Check event object field first (from form), then fallback to extraData
    const windSpeedValue = event.wind_speed || extraData.wind_speed;
    if (windSpeedValue !== undefined) {
      console.log('✅ Found wind speed value:', windSpeedValue);
      immediate.push({
        label: 'Wind Speed',
        value: `${windSpeedValue} km/h`,
        priority: 'immediate',
        category: 'weather'
      });
    } else {
      console.log('❌ No wind speed value found');
    }

    // Check event object field first (from form), then fallback to extraData
    const precipitationValue = event.precipitation_amount || extraData.precipitation_amount;
    if (precipitationValue !== undefined) {
      console.log('✅ Found precipitation amount value:', precipitationValue);
      secondary.push({
        label: 'Rainfall',
        value: `${precipitationValue}mm`,
        priority: 'secondary',
        category: 'measurement'
      });
    } else {
      console.log('❌ No precipitation amount value found');
    }

    // Check event object field first (from form), then fallback to extraData
    const durationValue = event.duration || extraData.duration;
    if (durationValue !== undefined) {
      console.log('✅ Found duration value:', durationValue);
      secondary.push({
        label: 'Duration',
        value: `${durationValue} hours`,
        priority: 'secondary',
        category: 'measurement'
      });
    } else {
      console.log('❌ No duration value found');
    }

    // Check event object field first (from form), then fallback to extraData
    const damageAssessmentValue = event.damage_assessment || extraData.damage_assessment;
    if (damageAssessmentValue) {
      console.log('✅ Found damage assessment value:', damageAssessmentValue);
      immediate.push({
        label: 'Damage Assessment',
        value: damageAssessmentValue,
        priority: 'immediate',
        category: 'environmental'
      });
    } else {
      console.log('❌ No damage assessment value found');
    }
    const protectionValue =
      event.way_of_protection ||
      event.protection_measures ||
      extraData.way_of_protection ||
      extraData.protection_measures;
    if (protectionValue) {
      console.log('✅ Found protection measures value for TS:', protectionValue);
      immediate.push({
        label: 'Protection Measures',
        value: protectionValue,
        priority: 'immediate',
        category: 'environmental'
      });
    } else {
      console.log('❌ No protection measures value found for TS');
    }
  }

  // High Humidity Events (HH) and Low Humidity Events (LH)
  if (description.includes('humidity') || weatherType === 'HH' || weatherType === 'LH') {
    console.log('🌦️ Processing humidity event (HH/LH):', { weatherType, event, extraData });

    const humidityLevelValue = event.humidity_level || extraData.humidity_level;
    if (humidityLevelValue !== undefined) {
      console.log('✅ Found humidity level value for HH/LH:', humidityLevelValue);
      immediate.push({
        label: 'Humidity Level',
        value: `${humidityLevelValue}%`,
        priority: 'immediate',
        category: 'weather'
      });
    } else {
      console.log('❌ No humidity level value found for HH/LH');
    }

    const durationValue = event.duration || extraData.duration;
    if (durationValue !== undefined) {
      console.log('✅ Found duration value for HH/LH:', durationValue);
      secondary.push({
        label: 'Duration',
        value: `${durationValue} hours`,
        priority: 'secondary',
        category: 'measurement'
      });
    } else {
      console.log('❌ No duration value found for HH/LH');
    }

    const cropImpactValue = event.crop_impact || extraData.crop_impact;
    if (cropImpactValue) {
      console.log('✅ Found crop impact value for HH/LH:', cropImpactValue);
      secondary.push({
        label: 'Crop Impact',
        value: cropImpactValue,
        priority: 'secondary',
        category: 'environmental'
      });
    } else {
      console.log('❌ No crop impact value found for HH/LH');
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
    console.log('✅ APPLICATION METHOD FOUND:', event.application_method);
    immediate.push({
      label: 'Application Method',
      value: getReadableFieldValue('application_method', event.application_method),
      priority: 'immediate',
      category: 'application'
    });
  } else {
    console.log('❌ APPLICATION METHOD MISSING:', {
      eventId: event.id,
      hasApplicationMethod: !!event.application_method,
      applicationMethodValue: event.application_method,
      eventKeys: Object.keys(event)
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
  if (event.area_treated !== undefined && event.area_unit) {
    secondary.push({
      label: 'Coverage Area',
      value: `${event.area_treated} ${event.area_unit}`,
      priority: 'secondary',
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

    const formattedConcentration = isNPKRatio
      ? concentrationStr // NPK ratio - no % suffix
      : concentrationStr.includes('%')
      ? concentrationStr
      : `${concentrationStr}%`; // Single concentration value - add % if missing

    details.push({
      label: 'Concentration',
      value: formattedConcentration,
      priority: 'details',
      category: 'application'
    });
  }

  if (event.volume_applied !== undefined && event.volume_unit) {
    details.push({
      label: 'Volume Applied',
      value: `${event.volume_applied} ${event.volume_unit}`,
      priority: 'details',
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

  // NPK percentages for fertilizers
  if (
    event.nitrogen_percentage !== undefined ||
    event.phosphorus_percentage !== undefined ||
    event.potassium_percentage !== undefined
  ) {
    const npk = [];
    if (event.nitrogen_percentage !== undefined) npk.push(`N: ${event.nitrogen_percentage}%`);
    if (event.phosphorus_percentage !== undefined) npk.push(`P: ${event.phosphorus_percentage}%`);
    if (event.potassium_percentage !== undefined) npk.push(`K: ${event.potassium_percentage}%`);

    if (npk.length > 0) {
      details.push({
        label: 'NPK Analysis',
        value: npk.join(', '),
        priority: 'details',
        category: 'application'
      });
    }
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

  // Signal Word - DETAILS for hazard classification
  if (event.signal_word) {
    const signalWordMap: Record<string, string> = {
      caution: '⚠️ CAUTION - Slightly toxic',
      warning: '⚠️ WARNING - Moderately toxic',
      danger: '🚨 DANGER - Highly toxic',
      danger_poison: '☠️ DANGER/POISON - Extremely toxic'
    };
    details.push({
      label: 'EPA Signal Word',
      value: signalWordMap[event.signal_word] || event.signal_word,
      priority: 'details',
      category: 'verification'
    });
  }

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

  // PPE Required - DETAILS for worker safety equipment
  if (event.ppe_required) {
    details.push({
      label: 'Required Safety Equipment',
      value: event.ppe_required,
      priority: 'details',
      category: 'verification'
    });
  }

  // Environmental Hazards - DETAILS for environmental awareness
  if (event.environmental_hazards) {
    details.push({
      label: 'Environmental Precautions',
      value: event.environmental_hazards,
      priority: 'details',
      category: 'environmental'
    });
  }

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
  if (event.area_covered && String(event.area_covered).trim() !== 'null') {
    const areaUnit = event.area_unit || 'ha';
    const areaValue = String(event.area_covered).includes(areaUnit)
      ? event.area_covered
      : `${event.area_covered} ${areaUnit}`;

    immediate.push({
      label: 'Area Covered',
      value: areaValue,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  if (event.yield_quantity && String(event.yield_quantity).trim() !== 'null') {
    const yieldUnit = event.yield_unit || event.quantity_unit || 'kg';
    // 🔧 FIX: Check if value is already formatted (has number + unit pattern)
    const yieldStr = String(event.yield_quantity);
    const isAlreadyFormatted = /\d+(\.\d+)?\s+\w+/.test(yieldStr);
    const yieldValue =
      isAlreadyFormatted || yieldStr.includes(yieldUnit)
        ? event.yield_quantity
        : `${event.yield_quantity} ${yieldUnit}`;

    immediate.push({
      label: 'Quantity',
      value: yieldValue,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // Equipment and fuel information (SECONDARY display)
  if (event.fuel_consumed && String(event.fuel_consumed).trim() !== 'null') {
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

  if (event.equipment_hours && String(event.equipment_hours).trim() !== 'null') {
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
  if (event.transportation_distance && String(event.transportation_distance).trim() !== 'null') {
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

  // Sprint 2: EM (Equipment Maintenance) subtype-specific fields
  // CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model
  // Note: Kept backward compatibility check for 'EQ' in case old data exists
  if (event.production_type === 'EM' || event.production_type === 'EQ') {
    // Equipment Operation Type (IMMEDIATE - primary operation info)
    if (
      event.equipment_operation_type &&
      String(event.equipment_operation_type).trim() !== 'null'
    ) {
      immediate.push({
        label: 'Operation Type',
        value: event.equipment_operation_type,
        priority: 'immediate',
        category: 'operational'
      });
    }

    // Equipment Type (SECONDARY - what equipment was used)
    if (event.equipment_type && String(event.equipment_type).trim() !== 'null') {
      secondary.push({
        label: 'Equipment Type',
        value: event.equipment_type,
        priority: 'secondary',
        category: 'operational'
      });
    }

    // Fuel Type (SECONDARY - fuel used)
    if (event.fuel_type && String(event.fuel_type).trim() !== 'null') {
      secondary.push({
        label: 'Fuel Type',
        value: getReadableFieldValue('fuel_type', event.fuel_type),
        priority: 'secondary',
        category: 'operational'
      });
    }

    // Operation Efficiency (SECONDARY - efficiency level)
    if (event.operation_efficiency && String(event.operation_efficiency).trim() !== 'null') {
      secondary.push({
        label: 'Operation Efficiency',
        value: event.operation_efficiency,
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
  if (description.includes('harvest') && extraData.quantityHarvested !== undefined) {
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
  }

  // Legacy fallback: Irrigation events with waterAmount in extra_data
  if (description.includes('irrigation') && extraData.waterAmount !== undefined) {
    immediate.push({
      label: 'Water Applied',
      value: `${extraData.waterAmount} L`,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // Planting events
  if (description.includes('plant') && extraData.area !== undefined) {
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
  if (description.includes('prun') && extraData.area !== undefined) {
    immediate.push({
      label: 'Pruning Area',
      value: `${extraData.area} hectares`,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  if (extraData.method) {
    secondary.push({
      label: 'Pruning Method',
      value: extraData.method,
      priority: 'secondary',
      category: 'operational'
    });
  }

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

  // Handle basic General event form fields (Activity Type, Activity Name, Duration, People Involved, Activity Notes)
  if (event.activity_type) {
    immediate.push({
      label: 'Activity Type',
      value: event.activity_type,
      priority: 'immediate',
      category: 'operational'
    });
  }

  if (event.activity_name) {
    immediate.push({
      label: 'Activity Name',
      value: event.activity_name,
      priority: 'immediate',
      category: 'operational'
    });
  }

  if (event.duration) {
    secondary.push({
      label: 'Duration',
      value: event.duration,
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

  if (event.activity_notes) {
    details.push({
      label: 'Activity Notes',
      value: event.activity_notes,
      priority: 'details',
      category: 'documentation'
    });
  }

  // Tillage events
  if (description.includes('till')) {
    if (extraData.areaTreated !== undefined) {
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
    if (extraData.fuelAmount !== undefined) {
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
    if (extraData.areaTreated !== undefined) {
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
    if (extraData.energyAmount !== undefined) {
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
    if (extraData.energyCost !== undefined) {
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
    if (extraData.areaTreated !== undefined) {
      immediate.push({
        label: 'Area Established',
        value: `${extraData.areaTreated} hectares`,
        priority: 'immediate',
        category: 'measurement'
      });
    }
    if (extraData.establishmentCost !== undefined) {
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
    if (extraData.sampleCount !== undefined) {
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

  // Operation Efficiency - SECONDARY for consistency with other event types
  if (event.operation_efficiency) {
    secondary.push({
      label: 'Operation Efficiency',
      value: getReadableFieldValue('operation_efficiency', event.operation_efficiency),
      priority: 'secondary',
      category: 'operational'
    });
  }

  if (event.observation) {
    details.push({
      label: 'Operation Notes',
      value: event.observation,
      priority: 'details',
      category: 'documentation'
    });
  }

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

  // Soil Management Type (using actual database field 'type')
  if (event.soil_management_type) {
    const operationTypes: Record<string, string> = {
      'Soil Testing': 'Soil Testing',
      ST: 'Soil Testing',
      PA: 'pH Adjustment',
      OM: 'Organic Matter Addition',
      CC: 'Cover Crop Management',
      TI: 'Tillage Implementation',
      CO: 'Composting Operation'
    };

    const displayValue = operationTypes[event.soil_management_type] || event.type;

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
      value: `${event.area_covered} ${unit}`,
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
  if (event.soil_ph !== undefined && event.soil_ph !== null) {
    immediate.push({
      label: 'Soil pH',
      value: event.soil_ph.toString(),
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // Organic Matter Percentage (from database field) - Move to immediate for better visibility
  if (event.organic_matter_percentage !== undefined && event.organic_matter_percentage !== null) {
    immediate.push({
      label: 'Organic Matter',
      value: `${event.organic_matter_percentage}%`,
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
  if (event.amendment_amount) {
    const unit = event.amendment_unit || 'kg';
    immediate.push({
      label: 'Amendment Amount',
      value: `${event.amendment_amount} ${unit}`,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // ENHANCED: Tillage Depth for Soil CO2 Flux Calculations (TI events)
  // Research-based: shallow=50, medium=150, deep=300 kg CO2e/ha
  if (event.tillage_depth) {
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

  // Production Efficiency (from SoilManagementTab form)
  if (event.production_efficiency) {
    secondary.push({
      label: 'Operation Efficiency',
      value: event.production_efficiency,
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

  if (event.soil_moisture) {
    details.push({
      label: 'Soil Moisture',
      value: event.soil_moisture,
      priority: 'details',
      category: 'environmental'
    });
  }

  // Environmental Conditions (from SoilManagementTab environmental section)
  if (event.weather_conditions) {
    details.push({
      label: 'Weather Conditions',
      value: getReadableFieldValue('weather_conditions', event.weather_conditions),
      priority: 'details',
      category: 'environmental'
    });
  }

  if (event.temperature_range) {
    details.push({
      label: 'Temperature Range',
      value: event.temperature_range,
      priority: 'details',
      category: 'environmental'
    });
  }

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

  // Observations & Notes (from SoilManagementTab additional notes section)
  if (event.soil_management_notes) {
    details.push({
      label: 'Soil Management Notes',
      value: event.soil_management_notes,
      priority: 'details',
      category: 'documentation'
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
  if (event.pest_species) {
    immediate.push({
      label: 'Target Pest Species',
      value: event.pest_species,
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
  if (event.pest_pressure_level && ['SC', 'TM', 'BR', 'PI', 'TA', 'IP'].includes(pestType)) {
    const pressureMap: Record<string, string> = {
      low: 'Low pressure detected',
      medium: 'Medium pressure - monitoring required',
      high: 'High pressure - action needed',
      critical: 'Critical pressure - immediate action'
    };

    immediate.push({
      label: 'Pest Pressure Level',
      value: pressureMap[event.pest_pressure_level] || event.pest_pressure_level,
      priority: 'immediate',
      category: 'environmental'
    });
  }

  // Event type-specific fields (SECONDARY display)

  // SC (Scouting) - Monitoring and assessment fields
  if (pestType === 'SC') {
    if (event.time_spent_hours) {
      secondary.push({
        label: 'Scouting Duration',
        value: `${event.time_spent_hours} hours`,
        priority: 'secondary',
        category: 'operational'
      });
    }

    // Fix: Check both area_covered (standardized) and field_area_hectares (legacy)
    const areaScouted = event.area_covered || event.field_area_hectares;
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

    if (event.time_spent_hours) {
      secondary.push({
        label: 'Monitoring Duration',
        value: `${event.time_spent_hours} hours`,
        priority: 'secondary',
        category: 'operational'
      });
    }
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
      secondary.push({
        label: 'Release Quantity',
        value: event.release_quantity,
        priority: 'secondary',
        category: 'measurement'
      });
    }
  }

  // PI (Pest Identification) - Identification-specific fields
  if (pestType === 'PI') {
    if (event.time_spent_hours) {
      secondary.push({
        label: 'Identification Time',
        value: `${event.time_spent_hours} hours`,
        priority: 'secondary',
        category: 'operational'
      });
    }
  }

  // TA (Threshold Assessment) - Assessment-specific fields
  if (pestType === 'TA') {
    if (event.economic_threshold_met !== undefined) {
      secondary.push({
        label: 'Economic Threshold Status',
        value: event.economic_threshold_met
          ? 'Threshold exceeded - action required'
          : 'Below threshold - continue monitoring',
        priority: 'secondary',
        category: 'measurement'
      });
    }

    if (event.time_spent_hours) {
      secondary.push({
        label: 'Assessment Duration',
        value: `${event.time_spent_hours} hours`,
        priority: 'secondary',
        category: 'operational'
      });
    }
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
      secondary.push({
        label: 'Beneficial Release Quantity',
        value: event.release_quantity,
        priority: 'secondary',
        category: 'measurement'
      });
    }

    if (event.economic_threshold_met !== undefined) {
      secondary.push({
        label: 'Economic Threshold',
        value: event.economic_threshold_met
          ? 'Threshold-driven implementation'
          : 'Preventive implementation',
        priority: 'secondary',
        category: 'measurement'
      });
    }
  }

  // Common operational fields (DETAILS display)
  if (event.field_area_hectares && !['SC'].includes(pestType)) {
    details.push({
      label: 'Field Area',
      value: `${event.field_area_hectares} hectares`,
      priority: 'details',
      category: 'measurement'
    });
  }

  if (event.travel_distance_km) {
    details.push({
      label: 'Travel Distance',
      value: `${event.travel_distance_km} km`,
      priority: 'details',
      category: 'operational'
    });
  }

  if (event.weather_conditions) {
    details.push({
      label: 'Weather Conditions',
      value: event.weather_conditions,
      priority: 'details',
      category: 'environmental'
    });
  }

  if (event.crop_growth_stage) {
    details.push({
      label: 'Crop Growth Stage',
      value: event.crop_growth_stage,
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
  // Fix: Handle both boolean and string values from form data
  if (event.action_threshold_met !== undefined) {
    const thresholdMet = event.action_threshold_met === true || event.action_threshold_met === 'true';
    secondary.push({
      label: 'Action Threshold Met',
      value: thresholdMet ? 'Yes - Action Required' : 'No - Continue Monitoring',
      priority: 'secondary',
      category: 'measurement'
    });
  }

  // IPM Strategy (details display) - show for all types, not just IP
  if (event.imp_strategy) {
    details.push({
      label: 'IPM Strategy',
      value: event.imp_strategy,
      priority: 'details',
      category: 'documentation'
    });
  }

  // Notes/Observations (details display)
  if (event.observation) {
    details.push({
      label: 'Pest Management Notes',
      value: event.observation,
      priority: 'details',
      category: 'documentation'
    });
  }

  // ============================================================
  // Sprint 3 Epic 3.2: Consumer Trust Fields for transparency
  // These fields enhance consumer confidence in sustainable pest management
  // ============================================================

  // Beneficial Insects Used - SECONDARY priority for organic/sustainable transparency
  if (event.beneficial_insects_used) {
    secondary.push({
      label: 'Beneficial Insects',
      value: getReadableFieldValue('beneficial_insects_used', event.beneficial_insects_used),
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
  if (
    event.fuel_consumed &&
    String(event.fuel_consumed).trim() !== 'null' &&
    String(event.fuel_consumed).trim() !== ''
  ) {
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
  // Skip for SC type if time_spent_hours is shown as "Scouting Duration" to avoid duplication
  const hasTypeSpecificDuration = pestType === 'SC' && event.time_spent_hours;
  if (
    event.equipment_hours &&
    String(event.equipment_hours).trim() !== 'null' &&
    String(event.equipment_hours).trim() !== '' &&
    !hasTypeSpecificDuration
  ) {
    operationalTarget.push({
      label: 'Equipment Hours',
      value: `${event.equipment_hours} hours`,
      priority: isScoutingType ? 'details' : 'secondary',
      category: 'measurement',
      tooltip: 'Total hours equipment was operated for this pest management activity'
    });
  }

  // Fuel Type - Always DETAILS (technical information)
  if (
    event.fuel_type &&
    String(event.fuel_type).trim() !== 'null' &&
    String(event.fuel_type).trim() !== ''
  ) {
    details.push({
      label: 'Fuel Type',
      value: getReadableFieldValue('fuel_type', event.fuel_type),
      priority: 'details',
      category: 'operational'
    });
  }

  // Production Efficiency - SECONDARY for operational types, DETAILS for scouting
  if (
    event.production_efficiency &&
    String(event.production_efficiency).trim() !== 'null' &&
    String(event.production_efficiency).trim() !== ''
  ) {
    const efficiencyMap: Record<string, string> = {
      high: '⚡ High Efficiency',
      normal: '✓ Normal Efficiency',
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
      IN: 'Inspection Process'
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
      carbon_neutral: 'Carbon Neutral Certification',
      rainforest_alliance: 'Rainforest Alliance Certified',
      fair_trade: 'Fair Trade Certified',
      regenerative: 'Regenerative Organic Certified',
      sustainable_agriculture: 'Sustainable Agriculture Standard',
      water_stewardship: 'Water Stewardship Certification'
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
  if (event.carbon_credits_earned !== undefined && event.carbon_credits_earned !== null) {
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
    secondary.push({
      label: 'Trust Impact',
      value: event.trust_impact,
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

  // Business Observations & Notes (standardized field name)
  if (event.business_observation) {
    details.push({
      label: 'Business Notes',
      value: event.business_observation,
      priority: 'details',
      category: 'documentation'
    });
  }

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

  // 🚨 CRITICAL DEBUG: Log ALL events to understand why equipment event is not being processed
  console.log('🔍 ALL EVENT PROCESSING DEBUG:', {
    eventId: normalizedEvent.id,
    eventType: normalizedEvent.type,
    eventTypeNumber: normalizedEvent.event_type,
    description: normalizedEvent.description,
    eventTypeLower: eventType,
    descriptionLower: description,
    isFC: normalizedEvent.type === 'FC',
    isEquipmentEventType: normalizedEvent.event_type === 4,
    includesEquipment: description.includes('equipment'),
    includesTractor: description.includes('tractor'),
    includesFuel: description.includes('fuel'),
    detectionArray: ['FC', 'MN', 'RE', 'CA', 'BD', 'EI'].includes(normalizedEvent.type),
    fullEvent: normalizedEvent
  });

  // Debug logging for ALL events to understand the data structure
  if (
    description.includes('hail') ||
    eventType.includes('weather') ||
    normalizedEvent.event_type === 0
  ) {
    console.log('🔍 EVENT FIELD DISPLAY DEBUG - Main function:', {
      eventId: normalizedEvent.id,
      eventType: normalizedEvent.type,
      eventTypeNumber: normalizedEvent.event_type,
      description: normalizedEvent.description,
      weatherType: normalizedEvent.weather_type,
      extraData: normalizedEvent.extra_data,
      fullEvent: normalizedEvent
    });
  }

  // 🚨 CRITICAL DEBUG: Equipment event processing
  if (
    normalizedEvent.type === 'FC' ||
    normalizedEvent.event_type === 4 ||
    description.includes('field plowing') ||
    description.includes('tractor') ||
    description.includes('fuel') ||
    description.includes('equipment') ||
    ['FC', 'MN', 'RE', 'CA', 'BD', 'EI'].includes(normalizedEvent.type)
  ) {
    console.log('🚜 EQUIPMENT EVENT PROCESSING DEBUG - Entry point:', {
      eventId: normalizedEvent.id,
      eventType: normalizedEvent.type,
      eventTypeNumber: normalizedEvent.event_type,
      description: normalizedEvent.description,
      eventTypeLower: eventType,
      descriptionLower: description,
      hasEquipmentFields: {
        fuel_consumed: normalizedEvent.fuel_consumed,
        hours_operated: normalizedEvent.hours_operated,
        area_worked: normalizedEvent.area_worked,
        fuel_type: normalizedEvent.fuel_type,
        operation_efficiency: normalizedEvent.operation_efficiency,
        name: normalizedEvent.name
      },
      extraData: normalizedEvent.extra_data,
      fullNormalizedEvent: normalizedEvent
    });
  }

  // Determine event category and apply appropriate formatter
  // 🚨 CRITICAL FIX: Check event_type NUMBER first before description keywords
  // This prevents false positives where description contains words like "storm" or "frost"
  // Priority: event_type (definitive) > type codes (definitive) > description (fuzzy match)

  // Weather Events (event_type === 0)
  if (normalizedEvent.event_type === 0) {
    console.log('✅ Detected as weather event by event_type, calling getWeatherEventFields');
    const baseFields = getWeatherEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  // Production Events (event_type === 1)
  if (normalizedEvent.event_type === 1) {
    console.log('✅ Detected as production event by event_type, calling getProductionEventFields');
    const baseFields = getProductionEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  // Chemical Events (event_type === 2)
  if (normalizedEvent.event_type === 2) {
    console.log('✅ Detected as chemical event by event_type, calling getChemicalEventFields');
    const baseFields = getChemicalEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  // Fallback: Use type codes and description keywords for events without explicit event_type
  // Weather event codes
  if (['FR', 'DR', 'HL', 'HT', 'TS', 'HW', 'HH', 'LH'].includes(normalizedEvent.type)) {
    console.log('✅ Detected as weather event by type code, calling getWeatherEventFields');
    const baseFields = getWeatherEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  // Production event codes
  if (['PL', 'HA', 'IR', 'PR', 'TR'].includes(normalizedEvent.type)) {
    console.log('✅ Detected as production event by type code, calling getProductionEventFields');
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
    console.log(
      '⚠️ Detected as weather event by description keyword (fallback), calling getWeatherEventFields'
    );
    const baseFields = getWeatherEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  if (
    eventType.includes('chemical') ||
    description.includes('fertilizer') ||
    description.includes('spray') ||
    description.includes('pesticide')
  ) {
    console.log(
      '⚠️ Detected as chemical event by description keyword (fallback), calling getChemicalEventFields'
    );
    const baseFields = getChemicalEventFields(normalizedEvent);
    return mergeCustomFieldsIntoDisplay(baseFields, normalizedEvent);
  }

  if (
    eventType.includes('production') ||
    description.includes('harvest') ||
    description.includes('planting') ||
    description.includes('irrigation')
  ) {
    console.log(
      '⚠️ Detected as production event by description keyword (fallback), calling getProductionEventFields'
    );
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
    console.log('🚜 EQUIPMENT EVENT DETECTED - Routing to getEquipmentEventFields:', {
      eventId: normalizedEvent.id,
      description: description,
      eventType: eventType,
      event_type: normalizedEvent.event_type,
      type: normalizedEvent.type,
      detectionReasons: {
        eventTypeIncludesEquipment: eventType.includes('equipment'),
        descriptionIncludesTractor: description.includes('tractor'),
        descriptionIncludesMachinery: description.includes('machinery'),
        descriptionIncludesFuel: description.includes('fuel'),
        eventTypeEquals4: normalizedEvent.event_type === 4,
        equipmentTypeCode: ['FC', 'MN', 'RE', 'CA', 'BD', 'EI'].includes(normalizedEvent.type),
        equipmentTypeCodeLower: ['fc', 'mn', 're', 'ca', 'bd', 'ei'].includes(eventType)
      }
    });
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
    ['ST', 'PA', 'OM', 'CC', 'TI', 'CO'].includes(normalizedEvent.type)
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

  console.log('✅ [fieldDisplayUtils] Merging custom fields into display:', {
    totalCustomFields: customFields.length,
    visibleCustomFields: visibleFields.length,
    fields: visibleFields.map((f: any) => ({
      label: f.label,
      value: f.value,
      visibility: f.visibility
    })),
    eventId: event.id,
    source: event?.custom_fields ? 'event.custom_fields' : 'event.extra_data.custom_fields'
  });

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
