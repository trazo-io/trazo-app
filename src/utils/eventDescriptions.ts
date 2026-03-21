// Event descriptions and transparency details for consumer-facing displays

export interface EventDescriptionData {
  title: string;
  description: string;
  shortDescription: string;
  icon: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  consumerMessage: string;
  consumerImpact: string;
  sustainabilityBenefit: string;
}

/**
 * Event descriptions mapped to consumer-friendly explanations
 */
export const eventDescriptions: Record<string, string> = {
  'fertilizer application': 'Applied nutrients to support healthy plant growth and soil fertility',
  'pesticide application': 'Applied targeted pest control to protect plants from harmful insects',
  'fungicide application':
    'Applied disease prevention treatment to protect plants from fungal infections',
  'herbicide application':
    'Applied weed control to manage competing vegetation and protect crop health',
  'chemical application':
    'Applied agricultural treatment as part of integrated crop management program',

  // Pest Management Event Types
  'pest scouting':
    'Monitored crops for pest populations and damage levels to inform management decisions',
  'trap monitoring':
    'Checked monitoring traps to track pest populations and identify early warning signs',
  'beneficial release':
    'Released beneficial insects to naturally control pest populations using biological methods',
  'pest identification': 'Identified pest species to develop targeted management strategies',
  'threshold assessment':
    'Evaluated pest population levels against economic thresholds to determine treatment needs',
  'ipm implementation':
    'Applied integrated pest management strategy combining multiple sustainable control methods',
  irrigation: 'Provided water to ensure optimal plant growth and health',
  planting: 'Planted seeds or seedlings to establish the crop',
  harvesting: 'Harvested mature crops at optimal quality and freshness',
  'soil preparation': 'Prepared soil for optimal growing conditions',
  'weather monitoring': 'Monitored weather conditions to inform farming decisions',
  'equipment maintenance': 'Maintained farming equipment for efficient operations',
  'pest monitoring': 'Monitored for pests to inform protection strategies',
  'farm maintenance': 'Maintained farm infrastructure and equipment for optimal operations',
  'equipment setup': 'Configured and prepared equipment for farming activities',
  'infrastructure work': 'Improved farm infrastructure and facility maintenance',
  'planning activity': 'Planned and organized farming activities for optimal productivity',
  documentation: 'Documented farming practices for transparency and compliance',
  training: 'Conducted training activities to improve farming knowledge and skills',
  'safety inspection': 'Inspected farm facilities and equipment for safety compliance',
  'general maintenance': 'Performed general maintenance activities to ensure farm operations',
  default: 'Completed agricultural activity as part of sustainable farming practices'
};

/**
 * Get real transparency details from actual event data based on the production API
 */
export function getRealTransparencyDetails(event: any): string {
  const details: string[] = [];

  // Handle weather events (event_type: 0) - check extra_data for weather fields
  if (event.event_type === 0) {
    const extraData = event.extra_data || {};

    // Weather event type from weather_type field or type field (FR, DR, HL, etc.)
    const weatherTypeValue = event.weather_type || event.type;
    if (weatherTypeValue && weatherTypeValue !== 'weather') {
      const weatherTypes: Record<string, string> = {
        FR: 'Frost event',
        DR: 'Drought conditions',
        HL: 'Hail damage',
        HT: 'Heat stress',
        TS: 'Storm/Wind',
        HW: 'Heavy rainfall',
        HH: 'High humidity',
        LH: 'Low humidity'
      };
      const weatherType = weatherTypes[weatherTypeValue] || weatherTypeValue;
      // Technical details now shown in Key Details section - removed from description to avoid duplication
      // details.push(`Type: ${weatherType}`);
    }

    // Temperature data from event object or extra_data
    const lowerTempValue =
      event.lower_temperature !== undefined ? event.lower_temperature : extraData.lower_temperature;
    if (lowerTempValue !== undefined) {
      let tempDisplay = '';
      const tempValue = lowerTempValue;

      if (typeof tempValue === 'string') {
        if (tempValue.includes('°C') || tempValue.includes('°F')) {
          tempDisplay = tempValue;
        } else {
          const numTemp = parseFloat(tempValue);
          if (!isNaN(numTemp)) {
            tempDisplay = `${tempValue}°C`;
          } else {
            tempDisplay = tempValue;
          }
        }
      } else if (typeof tempValue === 'number') {
        tempDisplay = `${tempValue}°C`;
      } else {
        tempDisplay = String(tempValue);
      }

      // Technical details now shown in Key Details section - removed from description to avoid duplication
      // details.push(`Min temp: ${tempDisplay}`);
    }

    const highestTempValue =
      event.highest_temperature !== undefined
        ? event.highest_temperature
        : extraData.highest_temperature;
    if (highestTempValue !== undefined) {
      let tempDisplay = '';
      const tempValue = highestTempValue;

      if (typeof tempValue === 'string') {
        if (tempValue.includes('°C') || tempValue.includes('°F')) {
          tempDisplay = tempValue;
        } else {
          const numTemp = parseFloat(tempValue);
          if (!isNaN(numTemp)) {
            tempDisplay = `${tempValue}°C`;
          } else {
            tempDisplay = tempValue;
          }
        }
      } else if (typeof tempValue === 'number') {
        tempDisplay = `${tempValue}°C`;
      } else {
        tempDisplay = String(tempValue);
      }

      // Technical details now shown in Key Details section - removed from description to avoid duplication
      // details.push(`Max temp: ${tempDisplay}`);
    }

    // Protection measures from event object or extra_data
    const protectionValue = event.way_of_protection || extraData.way_of_protection;
    if (protectionValue && String(protectionValue).trim()) {
      // Technical details now shown in Key Details section - removed from description to avoid duplication
      // details.push(`Protection: ${protectionValue}`);
    }

    // Technical details now shown in Key Details section - removed from description to avoid duplication

    // Drought-specific fields
    const waterDeficitValue =
      event.water_deficit !== undefined ? event.water_deficit : extraData.water_deficit;
    if (waterDeficitValue !== undefined && String(waterDeficitValue).trim()) {
      // details.push(`Water deficit: ${waterDeficitValue}`);
    }

    // Hailstorm-specific fields
    const weightValue = event.weight !== undefined ? event.weight : extraData.weight;
    if (weightValue !== undefined && String(weightValue).trim()) {
      // details.push(`Hail weight: ${weightValue}g`);
    }
    const diameterValue = event.diameter !== undefined ? event.diameter : extraData.diameter;
    if (diameterValue !== undefined && String(diameterValue).trim()) {
      // details.push(`Hail size: ${diameterValue}cm`);
    }

    // Date range for high temperature events
    const startDateValue = event.start_date || extraData.start_date;
    if (startDateValue && String(startDateValue).trim()) {
      // details.push(`Start: ${new Date(startDateValue).toLocaleDateString()}`);
    }
    const endDateValue = event.end_date || extraData.end_date;
    if (endDateValue && String(endDateValue).trim()) {
      // details.push(`End: ${new Date(endDateValue).toLocaleDateString()}`);
    }

    // Storm damage assessment
    const damageValue = event.damage_assessment || extraData.damage_assessment;
    if (damageValue && String(damageValue).trim()) {
      // details.push(`Damage: ${damageValue}`);
    }

    // High winds protection measures
    const measuresValue = event.protection_measures || extraData.protection_measures;
    if (measuresValue && String(measuresValue).trim()) {
      // details.push(`Measures: ${measuresValue}`);
    }

    // Humidity crop impact
    const cropImpactValue = event.crop_impact || extraData.crop_impact;
    if (cropImpactValue && String(cropImpactValue).trim()) {
      // details.push(`Impact: ${cropImpactValue}`);
    }

    // Weather conditions
    const weatherConditionsValue = event.weather_conditions || extraData.weather_conditions;
    if (weatherConditionsValue && String(weatherConditionsValue).trim()) {
      // details.push(`Conditions: ${weatherConditionsValue}`);
    }

    // Duration if available (multiple event types use this)
    const durationValue = event.duration !== undefined ? event.duration : extraData.duration;
    if (durationValue !== undefined && String(durationValue).trim()) {
      const duration = durationValue;
      // Handle both string and number formats
      if (typeof duration === 'number') {
        // details.push(`Duration: ${duration}h`);
      } else {
        // details.push(`Duration: ${duration}`);
      }
    }

    // Wind speed for storm events
    if (extraData.wind_speed !== undefined && String(extraData.wind_speed).trim()) {
      // details.push(`Wind: ${extraData.wind_speed}km/h`);
    }

    // Precipitation amount
    if (
      extraData.precipitation_amount !== undefined &&
      String(extraData.precipitation_amount).trim()
    ) {
      // details.push(`Rainfall: ${extraData.precipitation_amount}mm`);
    }

    // Humidity level
    if (extraData.humidity_level !== undefined && String(extraData.humidity_level).trim()) {
      // details.push(`Humidity: ${extraData.humidity_level}%`);
    }

    // Damage assessment for storms/hail
    if (extraData.damage_assessment !== undefined && String(extraData.damage_assessment).trim()) {
      // details.push(`Damage: ${extraData.damage_assessment}`);
    }

    // Protection measures for high winds/frost
    if (
      extraData.protection_measures !== undefined &&
      String(extraData.protection_measures).trim()
    ) {
      // details.push(`Protection: ${extraData.protection_measures}`);
    }

    // Crop impact for humidity events
    if (extraData.crop_impact !== undefined && String(extraData.crop_impact).trim()) {
      // details.push(`Crop impact: ${extraData.crop_impact}`);
    }

    const result = details.length > 0 ? ` • ${details.join(' • ')}` : '';
    return result;
  }

  // Handle production events (event_type: 1) differently
  if (event.event_type === 1) {
    // Area covered - most important for transparency
    if (event.area_covered && event.area_covered > 0) {
      const areaUnit = event.area_unit === 'ha' ? 'hectares' : event.area_unit || 'hectares';
      details.push(`Area: ${event.area_covered} ${areaUnit}`);
    }

    // Quantity for planting/harvesting
    if (event.yield_quantity && event.yield_quantity > 0) {
      const unit = event.yield_unit || 'units';
      const quantity = parseFloat(event.yield_quantity);
      const formattedQuantity =
        quantity >= 1000 ? `${(quantity / 1000).toFixed(0)}K` : quantity.toLocaleString();
      details.push(`Quantity: ${formattedQuantity} ${unit}`);
    }

    // Fuel consumption
    if (event.fuel_consumed && event.fuel_consumed > 0) {
      const fuelUnit = event.fuel_unit || 'L';
      details.push(`Fuel: ${event.fuel_consumed} ${fuelUnit}`);
    }

    // Equipment hours
    if (event.equipment_hours && event.equipment_hours > 0) {
      details.push(`Equipment: ${event.equipment_hours} hours`);
    }

    return details.length > 0 ? ` • ${details.join(' • ')}` : '';
  }

  // Handle general events (event_type: 3) - show activity details
  if (event.event_type === 3) {
    // Activity type and name
    if (event.activity_type && String(event.activity_type).trim()) {
      const activityDisplay =
        event.activity_name && String(event.activity_name).trim()
          ? `${event.activity_type}: ${event.activity_name}`
          : event.activity_type;
      details.push(`Activity: ${activityDisplay}`);
    } else if (event.activity_name && String(event.activity_name).trim()) {
      details.push(`Activity: ${event.activity_name}`);
    }

    // Duration
    if (
      event.duration &&
      String(event.duration).trim() &&
      String(event.duration).trim() !== 'null'
    ) {
      details.push(`Duration: ${event.duration}`);
    } else if (event.duration_raw && event.duration_raw > 0) {
      details.push(`Duration: ${event.duration_raw} hours`);
    }

    // People involved
    if (event.people_involved && event.people_involved > 0) {
      const peopleText = event.people_involved === 1 ? 'person' : 'people';
      details.push(`People: ${event.people_involved} ${peopleText}`);
    }

    // Activity notes (brief excerpt for transparency)
    if (
      event.activity_notes &&
      String(event.activity_notes).trim() &&
      String(event.activity_notes).trim() !== 'null'
    ) {
      const notes = String(event.activity_notes).trim();
      const briefNotes = notes.length > 50 ? `${notes.substring(0, 50)}...` : notes;
      details.push(`Notes: ${briefNotes}`);
    }

    return details.length > 0 ? ` • ${details.join(' • ')}` : '';
  }

  // Handle equipment events (event_type: 3) - show operation details
  if (event.event_type === 3) {
    const details: string[] = [];

    // Operation type and name
    if (event.operation_type && String(event.operation_type).trim()) {
      const operationDisplay =
        event.operation_name && String(event.operation_name).trim()
          ? `${event.operation_type}: ${event.operation_name}`
          : event.operation_type;
      details.push(`Operation: ${operationDisplay}`);
    } else if (event.operation_name && String(event.operation_name).trim()) {
      details.push(`Operation: ${event.operation_name}`);
    }

    // Equipment type
    if (event.equipment_type && String(event.equipment_type).trim()) {
      details.push(`Equipment: ${event.equipment_type}`);
    }

    // Fuel consumption
    if (event.fuel_consumed && event.fuel_consumed > 0) {
      details.push(`Fuel: ${event.fuel_consumed}L`);
    }

    // Fuel type
    if (event.fuel_type && String(event.fuel_type).trim()) {
      details.push(`Fuel type: ${event.fuel_type}`);
    }

    // Hours operated
    if (event.hours_operated && event.hours_operated > 0) {
      details.push(`Hours: ${event.hours_operated}h`);
    }

    // Area worked
    if (event.area_worked && event.area_worked > 0) {
      details.push(`Area: ${event.area_worked} ha`);
    }

    // Operation efficiency
    if (event.operation_efficiency && String(event.operation_efficiency).trim()) {
      details.push(`Efficiency: ${event.operation_efficiency}`);
    }

    // Operation notes (brief excerpt for transparency)
    if (
      event.operation_notes &&
      String(event.operation_notes).trim() &&
      String(event.operation_notes).trim() !== 'null'
    ) {
      const notes = String(event.operation_notes).trim();
      const briefNotes = notes.length > 50 ? `${notes.substring(0, 50)}...` : notes;
      details.push(`Notes: ${briefNotes}`);
    }

    return details.length > 0 ? ` • ${details.join(' • ')}` : '';
  }

  // Handle business events (event_type: 7) - show business activity details
  if (event.event_type === 7) {
    const details: string[] = [];

    // Business event type and name
    if (event.business_event_type && String(event.business_event_type).trim()) {
      const businessEventTypes: Record<string, string> = {
        CE: 'Certification Event',
        CM: 'Compliance Activity',
        IN: 'Inspection Process'
      };

      const eventTypeDisplay =
        businessEventTypes[event.business_event_type] || event.business_event_type;
      const eventNameDisplay =
        event.business_event_name && String(event.business_event_name).trim()
          ? `${eventTypeDisplay}: ${event.business_event_name}`
          : eventTypeDisplay;
      details.push(`Type: ${eventNameDisplay}`);
    } else if (event.business_event_name && String(event.business_event_name).trim()) {
      details.push(`Name: ${event.business_event_name}`);
    }

    // Business activity type
    if (event.business_activity_type && String(event.business_activity_type).trim()) {
      const businessActivityTypes: Record<string, string> = {
        certification: 'Certification Event',
        carbon_credits: 'Carbon Credits Transaction',
        sustainability_audit: 'Sustainability Audit',
        verification: 'Third-Party Verification',
        compliance: 'Regulatory Compliance',
        transparency: 'Consumer Transparency Initiative'
      };

      const activityDisplay =
        businessActivityTypes[event.business_activity_type] || event.business_activity_type;
      details.push(`Activity: ${activityDisplay}`);
    }

    // Certification details
    if (event.certification_type && String(event.certification_type).trim()) {
      const certificationTypes: Record<string, string> = {
        organic_usda: 'USDA Organic',
        carbon_neutral: 'Carbon Neutral',
        rainforest_alliance: 'Rainforest Alliance',
        fair_trade: 'Fair Trade',
        regenerative: 'Regenerative Organic',
        sustainable_agriculture: 'Sustainable Agriculture',
        water_stewardship: 'Water Stewardship'
      };

      const certDisplay = certificationTypes[event.certification_type] || event.certification_type;
      details.push(`Certification: ${certDisplay}`);
    }

    // Carbon credits information
    if (event.carbon_credits_earned && event.carbon_credits_earned > 0) {
      const unit = event.carbon_credits_unit || 'credits';
      details.push(`Carbon Credits: ${event.carbon_credits_earned} ${unit}`);
    }

    // Verification status
    if (event.verification_status && String(event.verification_status).trim()) {
      details.push(`Status: ${event.verification_status}`);
    }

    // Sustainability practice
    if (event.sustainability_practice && String(event.sustainability_practice).trim()) {
      details.push(`Practice: ${event.sustainability_practice}`);
    }

    // Business observation notes
    if (event.business_observation && String(event.business_observation).trim()) {
      const notes = String(event.business_observation).trim();
      const briefNotes = notes.length > 50 ? `${notes.substring(0, 50)}...` : notes;
      details.push(`Notes: ${briefNotes}`);
    }

    return details.length > 0 ? ` • ${details.join(' • ')}` : '';
  }

  // Volume with proper units from backend
  if (event.volume && String(event.volume).trim() && String(event.volume).trim() !== 'null') {
    // Always default to 'L' for volume display since chemical applications are typically in liters
    const volumeUnit = event.volume_unit || 'L';
    details.push(`Applied: ${event.volume} ${volumeUnit}`);
  }

  // Area
  if (event.area && String(event.area).trim() && String(event.area).trim() !== 'null') {
    const areaUnit = event.area_unit || event.extra_data?.area_unit || 'acres';
    const areaUnitLabel = areaUnit === 'ha' ? 'hectares' : areaUnit === 'm2' ? 'm²' : areaUnit;
    details.push(`Area: ${event.area} ${areaUnitLabel}`);
  }

  // Concentration
  if (
    event.concentration &&
    String(event.concentration).trim() &&
    String(event.concentration).trim() !== 'null'
  ) {
    const concentration = String(event.concentration).trim();
    // Handle if concentration already includes % or not
    const displayConcentration = concentration.includes('%') ? concentration : `${concentration}%`;
    details.push(`Concentration: ${displayConcentration}`);
  }

  // NPK Ratio for fertilizers - from multiple sources
  if (
    event.npk_ratio &&
    String(event.npk_ratio).trim() &&
    String(event.npk_ratio).trim() !== 'null'
  ) {
    details.push(`NPK: ${event.npk_ratio}`);
  } else if (event.extra_data?.carbon_calculation?.breakdown?.npk_content) {
    // Extract NPK from extra_data carbon calculation
    const npk = event.extra_data.carbon_calculation.breakdown.npk_content;
    if (npk.N !== undefined && npk.P !== undefined && npk.K !== undefined) {
      details.push(`NPK: ${npk.N}-${npk.P}-${npk.K}`);
    }
  }

  // Active ingredient information
  if (
    event.active_ingredient &&
    String(event.active_ingredient).trim() &&
    String(event.active_ingredient).trim() !== 'null'
  ) {
    details.push(`Active ingredient: ${event.active_ingredient}`);
  }

  // Application method from multiple sources: way_of_application, application_method, or extra_data
  let applicationMethod = null;

  // Priority 1: application_method field
  if (event.application_method && String(event.application_method).trim()) {
    applicationMethod = event.application_method;
  }
  // Priority 2: way_of_application field (from backend ChemicalEvent model)
  else if (event.way_of_application && String(event.way_of_application).trim()) {
    applicationMethod = event.way_of_application;
  }
  // Priority 3: extra_data carbon calculation
  else if (event.extra_data?.carbon_calculation?.breakdown?.application_method) {
    applicationMethod = event.extra_data.carbon_calculation.breakdown.application_method;
  }

  if (applicationMethod) {
    const methodMap: Record<string, string> = {
      spray: 'Spray application',
      foliar: 'Foliar spray treatment',
      drip: 'Drip irrigation',
      broadcast: 'Broadcast application',
      injection: 'Soil injection'
    };
    const friendlyMethod = methodMap[applicationMethod] || applicationMethod.replace(/_/g, ' ');
    details.push(`Method: ${friendlyMethod}`);
  }

  // Target pest/disease/need
  const targetField = event.target_pest_disease || event.target_pest_disease_need;
  if (targetField && String(targetField).trim()) {
    details.push(`Target: ${targetField}`);
  }

  // Weather conditions
  if (
    event.weather_conditions &&
    String(event.weather_conditions).trim() &&
    event.weather_conditions !== 'Select conditions...'
  ) {
    details.push(`Weather: ${event.weather_conditions}`);
  }

  // Application timing - from multiple sources
  if (
    event.application_timing &&
    String(event.application_timing).trim() &&
    event.application_timing !== 'Select timing...'
  ) {
    details.push(`Timing: ${event.application_timing}`);
  } else if (
    event.time_period &&
    String(event.time_period).trim() &&
    event.time_period !== 'Select timing...'
  ) {
    details.push(`Timing: ${event.time_period}`);
  }

  // Additional transparency data from carbon calculation
  if (event.extra_data?.carbon_calculation?.breakdown) {
    const breakdown = event.extra_data.carbon_calculation.breakdown;

    // Fuel usage for application (if available and significant)
    if (breakdown.application_fuel_liters && breakdown.application_fuel_liters > 0) {
      details.push(`Fuel used: ${breakdown.application_fuel_liters.toFixed(1)}L diesel`);
    }

    // Total fertilizer mass if different from volume
    if (
      breakdown.fertilizer_mass_kg &&
      breakdown.fertilizer_mass_kg > 0 &&
      breakdown.volume_applied_liters
    ) {
      const massPerLiter = breakdown.fertilizer_mass_kg / breakdown.volume_applied_liters;
      if (massPerLiter > 1.2) {
        // If significantly denser than water
        details.push(`Total mass: ${breakdown.fertilizer_mass_kg.toFixed(1)}kg`);
      }
    }
  }

  // Photo verification - handle both old album and new albums structure
  let photoCount = 0;
  if (event.albums && Array.isArray(event.albums) && event.albums.length > 0) {
    // New albums array structure - with proper null checking for album objects
    photoCount = event.albums.reduce(
      (total: number, album: any) => total + ((album && album.images?.length) || 0),
      0
    );
  } else if (event.album?.images?.length > 0) {
    // Legacy album structure
    photoCount = event.album.images?.length || 0;
  }

  if (photoCount > 0) {
    details.push(`${photoCount} photo${photoCount > 1 ? 's' : ''} documented`);
  }

  if (details.length > 0) {
    const result = ` - ${details.join(', ')}`;
    return result;
  }

  return '';
}

/**
 * Get consumer-friendly description for an event with real data integration
 * This function handles the mapping from raw event data to consumer-facing descriptions
 */
export function getConsumerEventDescription(
  eventDescription: string,
  event?: any
): EventDescriptionData {
  const lowerDesc = eventDescription.toLowerCase();

  // For production events (event_type: 1), create specific descriptions based on production data
  if (event && (event.event_type === 1 || event.type?.includes('production'))) {
    let icon = '🌱';
    let impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

    // Map production type to consumer-friendly titles
    const typeMap: Record<string, { title: string; icon: string; description: string }> = {
      'event.production.planting': {
        title: 'Planting',
        icon: '🌱',
        description: 'Seeds planted to establish healthy crop growth'
      },
      planting: {
        title: 'Planting',
        icon: '🌱',
        description: 'Seeds planted to establish healthy crop growth'
      },
      PL: {
        title: 'Planting',
        icon: '🌱',
        description: 'Seeds or seedlings planted with precision for optimal growth conditions'
      },
      'production.general': {
        title: 'General Farm Operation',
        icon: '🚜',
        description: 'General agricultural activity completed as part of farm operations'
      },
      production: {
        title: 'Farm Operation',
        icon: '🚜',
        description: 'Agricultural activity completed as part of sustainable farming'
      },
      'production.planting': {
        title: 'Planting',
        icon: '🌱',
        description: 'Seeds planted to establish healthy crop growth'
      },
      'production.harvesting': {
        title: 'Harvest Operation',
        icon: '🌾',
        description: 'Crops harvested at optimal ripeness and quality'
      },
      'production.irrigation': {
        title: 'Irrigation Operation',
        icon: '💧',
        description: 'Water applied to support healthy plant growth'
      },
      'production.pruning': {
        title: 'Pruning Operation',
        icon: '✂️',
        description: 'Plants pruned to optimize growth and fruit quality'
      },
      'production.transplanting': {
        title: 'Transplanting Operation',
        icon: '🌱',
        description: 'Transplanting seedlings or plants to their permanent growing location'
      },
      'production.TR': {
        title: 'Transplanting Operation',
        icon: '🌱',
        description: 'Transplanting seedlings or plants to their permanent growing location'
      },
      'production.operation': {
        title: 'Farm Operation',
        icon: '🚜',
        description: 'Agricultural operation completed on the farm'
      },
      'event.production.harvesting': {
        title: 'Harvest Operation',
        icon: '🌾',
        description: 'Crops harvested at optimal ripeness and quality'
      },
      harvesting: {
        title: 'Harvest Operation',
        icon: '🌾',
        description: 'Crops harvested at optimal ripeness and quality'
      },
      HA: {
        title: 'Harvest Operation',
        icon: '🌾',
        description: 'Crops harvested at peak ripeness for maximum quality and nutrition'
      },
      'event.production.irrigation': {
        title: 'Irrigation Event',
        icon: '💧',
        description: 'Water applied to support healthy plant growth'
      },
      irrigation: {
        title: 'Irrigation Event',
        icon: '💧',
        description: 'Water applied to support healthy plant growth'
      },
      IR: {
        title: 'Irrigation Event',
        icon: '💧',
        description: 'Water applied to support healthy plant growth and optimal soil moisture'
      },
      'event.production.pruning': {
        title: 'Pruning Operation',
        icon: '✂️',
        description: 'Plants pruned to optimize growth and fruit quality'
      },
      pruning: {
        title: 'Pruning Operation',
        icon: '✂️',
        description: 'Plants pruned to optimize growth and fruit quality'
      },
      transplanting: {
        title: 'Transplanting Operation',
        icon: '🌱',
        description: 'Transplanting seedlings or plants to their permanent growing location'
      },
      TR: {
        title: 'Transplanting Operation',
        icon: '🌱',
        description: 'Transplanting seedlings or plants to their permanent growing location'
      },
      PR: {
        title: 'Pruning Operation',
        icon: '✂️',
        description: 'Strategic pruning to improve plant health, air circulation, and fruit quality'
      },
      // CRITICAL FIX (2025-12-11): Added CU (Cultivation) - Sprint 2 production subtype
      CU: {
        title: 'Cultivation',
        icon: '🚜',
        description:
          'Mechanical cultivation for weed control and soil aeration to optimize crop growth'
      },
      // CRITICAL FIX (2025-12-11): Added TH (Thinning) - Sprint 2 production subtype
      TH: {
        title: 'Thinning',
        icon: '🌿',
        description: 'Fruit or plant thinning to improve size, quality, and overall crop health'
      },
      // CRITICAL FIX (2025-01-21): Added EM (Equipment Maintenance) - correct Production subtype
      EM: {
        title: 'Equipment Maintenance',
        icon: '🔧',
        description: 'Farm equipment used and maintained for optimal performance and efficiency'
      },
      // Sprint 2: EQ (Equipment Operations) subtype - LEGACY, kept for backward compatibility
      EQ: {
        title: 'Equipment Operations (Legacy)',
        icon: '🔧',
        description:
          'Farm equipment used and maintained for optimal performance (Legacy: use EM for new events)'
      },
      equipment: {
        title: 'Equipment Operations',
        icon: '🔧',
        description: 'Farm equipment used and maintained for optimal performance'
      },
      // CRITICAL FIX (2025-12-11): Added CU (Cultivation) entries
      'production.CU': {
        title: 'Cultivation',
        icon: '🚜',
        description: 'Mechanical cultivation for weed control and soil aeration'
      },
      'production.cultivation': {
        title: 'Cultivation',
        icon: '🚜',
        description: 'Mechanical cultivation for weed control and soil aeration'
      },
      'event.production.cultivation': {
        title: 'Cultivation',
        icon: '🚜',
        description: 'Mechanical cultivation for weed control and soil aeration'
      },
      // CRITICAL FIX (2025-12-11): Added TH (Thinning) entries
      'production.TH': {
        title: 'Thinning',
        icon: '🌿',
        description: 'Fruit or plant thinning to improve size and quality'
      },
      'production.thinning': {
        title: 'Thinning',
        icon: '🌿',
        description: 'Fruit or plant thinning to improve size and quality'
      },
      'event.production.thinning': {
        title: 'Thinning',
        icon: '🌿',
        description: 'Fruit or plant thinning to improve size and quality'
      },
      // CRITICAL FIX (2025-01-21): Added EM (Equipment Maintenance) entries
      'production.EM': {
        title: 'Equipment Maintenance',
        icon: '🔧',
        description: 'Farm equipment used and maintained for optimal performance'
      },
      'production.EQ': {
        title: 'Equipment Operations (Legacy)',
        icon: '🔧',
        description: 'Farm equipment used and maintained for optimal performance (Legacy: use EM)'
      },
      'production.equipment': {
        title: 'Equipment Operations',
        icon: '🔧',
        description: 'Farm equipment used and maintained for optimal performance'
      },
      'event.production.equipment': {
        title: 'Equipment Operations',
        icon: '🔧',
        description: 'Farm equipment used and maintained for optimal performance'
      },
      // PO (Pollination)
      PO: {
        title: 'Pollination',
        icon: '🐝',
        description: 'Managed pollinators placed to support crop growth — a natural, zero-emission process'
      },
      'production.PO': {
        title: 'Pollination',
        icon: '🐝',
        description: 'Managed pollinators placed to support crop growth — a natural, zero-emission process'
      },
      'event.production.pollination': {
        title: 'Pollination',
        icon: '🐝',
        description: 'Managed pollinators placed to support crop growth — a natural, zero-emission process'
      },
      pollination: {
        title: 'Pollination',
        icon: '🐝',
        description: 'Managed pollinators placed to support crop growth — a natural, zero-emission process'
      },
      // PH (Post-Harvest Processing)
      PH: {
        title: 'Post-Harvest Processing',
        icon: '📦',
        description: 'Carefully processed after harvest to ensure quality and freshness'
      },
      'production.PH': {
        title: 'Post-Harvest Processing',
        icon: '📦',
        description: 'Carefully processed after harvest to ensure quality and freshness'
      },
      'event.production.post_harvest': {
        title: 'Post-Harvest Processing',
        icon: '📦',
        description: 'Carefully processed after harvest to ensure quality and freshness'
      },
      post_harvest: {
        title: 'Post-Harvest Processing',
        icon: '📦',
        description: 'Carefully processed after harvest to ensure quality and freshness'
      },
      // CM (Canopy Management)
      CM: {
        title: 'Canopy Management',
        icon: '✂️',
        description: 'Vine or tree canopy shaped for optimal fruit development and quality'
      },
      'production.CM': {
        title: 'Canopy Management',
        icon: '✂️',
        description: 'Vine or tree canopy shaped for optimal fruit development and quality'
      },
      'event.production.canopy_management': {
        title: 'Canopy Management',
        icon: '✂️',
        description: 'Vine or tree canopy shaped for optimal fruit development and quality'
      },
      canopy_management: {
        title: 'Canopy Management',
        icon: '✂️',
        description: 'Vine or tree canopy shaped for optimal fruit development and quality'
      }
    };

    // Get production type from event data
    const eventType = event.production_type || event.type || 'Agricultural Activity';
    const typeInfo = typeMap[eventType] || {
      title: 'Agricultural Activity',
      icon: '🌱',
      description: 'Agricultural practice completed as part of sustainable farming'
    };

    icon = typeInfo.icon;

    // Build transparency details from production data
    const productionDetails: string[] = [];

    if (event.area_covered && event.area_covered > 0) {
      const areaUnit = event.area_unit === 'ha' ? 'hectares' : event.area_unit || 'hectares';
      productionDetails.push(`${event.area_covered} ${areaUnit}`);
    }

    if (event.yield_quantity && event.yield_quantity > 0) {
      const unit = event.yield_unit || 'units';
      const quantity = parseFloat(event.yield_quantity);
      const formattedQuantity =
        quantity >= 1000 ? `${(quantity / 1000).toFixed(0)}K` : quantity.toLocaleString();
      productionDetails.push(`${formattedQuantity} ${unit}`);
    }

    if (event.fuel_consumed && event.fuel_consumed > 0) {
      const fuelUnit = event.fuel_unit || 'L';
      productionDetails.push(`${event.fuel_consumed} ${fuelUnit} fuel used`);
    }

    if (event.equipment_hours && event.equipment_hours > 0) {
      productionDetails.push(`${event.equipment_hours} hours equipment operation`);
    }

    // Consumer-relevant: variety and growth stage when present
    if (event.variety && String(event.variety).trim()) {
      productionDetails.push(`Variety: ${event.variety}`);
    }

    if (event.growth_stage && String(event.growth_stage).trim()) {
      productionDetails.push(`Growth stage: ${event.growth_stage.replace(/_/g, ' ')}`);
    }

    // Enhanced description building based on actual event data
    const buildProductionDescription = (
      event: any,
      typeInfo: any,
      productionDetails: string[]
    ): string => {
      let description = typeInfo.description;

      // Add specific details based on event type and available data
      if (event.type === 'IR' && event.area_covered) {
        description += ` covering ${event.area_covered} ${event.area_unit || 'hectares'}`;
        if (event.equipment_hours) {
          description += ` over ${event.equipment_hours} hours`;
        }
        // Phase 3: Add electricity source detail for IR events
        const electricitySrcValue = event.electricity_source ?? event.extra_data?.electricity_source;
        if (electricitySrcValue === 'solar' || electricitySrcValue === 'wind') {
          description += ` using ${electricitySrcValue}-powered pump (near-zero pump emissions)`;
        } else if (electricitySrcValue) {
          const srcLabels: Record<string, string> = {
            grid: 'grid electricity',
            diesel_generator: 'diesel generator',
            mixed: 'mixed power sources'
          };
          description += ` powered by ${srcLabels[electricitySrcValue] || electricitySrcValue}`;
        }
        // Phase 3: Add pump depth for IR events
        const pumpDepthVal = event.pump_depth_ft ?? event.extra_data?.pump_depth_ft;
        if (pumpDepthVal) {
          description += ` (${pumpDepthVal} ft well depth)`;
        }
      } else if (event.type === 'HA' && event.yield_quantity) {
        description += ` yielding ${event.yield_quantity} ${event.yield_unit || 'units'}`;
        if (event.area_covered) {
          description += ` from ${event.area_covered} ${event.area_unit || 'hectares'}`;
        }
      } else if (event.type === 'PL') {
        if (event.yield_quantity) {
          const seedInfo =
            event.yield_quantity >= 1000
              ? `${(event.yield_quantity / 1000).toFixed(1)} thousand`
              : event.yield_quantity.toLocaleString();
          description += ` with ${seedInfo} ${event.yield_unit || 'seeds'}`;
        }
        if (event.area_covered) {
          description += ` across ${event.area_covered} ${event.area_unit || 'hectares'}`;
        }
      } else if (event.type === 'PR' && event.area_covered) {
        description += ` across ${event.area_covered} ${event.area_unit || 'hectares'}`;
        if (event.equipment_hours) {
          description += ` over ${event.equipment_hours} hours of careful work`;
        }
      }

      // Add general production details if available
      const detailsText = productionDetails.length > 0 ? ` • ${productionDetails.join(' • ')}` : '';

      return description + detailsText;
    };

    const fullDescription = buildProductionDescription(event, typeInfo, productionDetails);

    // 🌱 TRANSPARENCY-FIRST: Create personalized consumer messages based on actual event data
    let consumerImpact =
      'This agricultural practice follows sustainable farming methods to ensure high-quality food production.';
    let sustainabilityBenefit =
      'Part of responsible farming practices that support environmental stewardship and long-term agricultural sustainability.';

    if (eventType.includes('planting') || eventType === 'PL') {
      // Personalize based on actual data
      // 🔧 FIX: Use raw values when available to avoid unit duplication
      // event.yield_quantity may already be formatted as "500 seeds" from preview
      const yieldRaw = (event as any).yield_quantity_raw || event.yield_quantity;
      const yieldIsFormatted =
        typeof event.yield_quantity === 'string' && /\d+\s+\w+/.test(event.yield_quantity);
      const seedInfo = yieldIsFormatted
        ? event.yield_quantity // Already formatted like "500 seeds"
        : yieldRaw
        ? `${
            Number(yieldRaw) >= 1000
              ? `${(Number(yieldRaw) / 1000).toFixed(1)} million`
              : Number(yieldRaw).toLocaleString()
          } ${event.yield_unit || 'seeds'}`
        : 'seeds';

      // 🔧 FIX: Use raw values when available to avoid unit duplication
      const areaRaw = (event as any).area_covered_raw || event.area_covered;
      const areaIsFormatted =
        typeof event.area_covered === 'string' && /\d+\s+\w+/.test(event.area_covered);
      const areaInfo = areaIsFormatted
        ? `across ${event.area_covered}` // Already formatted like "2.5 hectares"
        : areaRaw
        ? `across ${areaRaw} ${event.area_unit || 'hectares'}`
        : '';

      consumerImpact = `${seedInfo} planted ${areaInfo} ensures optimal plant spacing for healthy growth and maximum yield quality.`;
      sustainabilityBenefit = `Precision planting with documented seed rates optimizes resource use while providing transparency into farming practices.`;
    } else if (eventType.includes('harvest') || eventType === 'HA') {
      // Personalize based on harvest data
      // 🔧 FIX: Check if value is already formatted to avoid unit duplication
      const yieldIsFormatted =
        typeof event.yield_quantity === 'string' && /\d+\s+\w+/.test(event.yield_quantity);
      const yieldInfo = yieldIsFormatted
        ? event.yield_quantity // Already formatted like "500 tons"
        : event.yield_quantity
        ? `${event.yield_quantity} ${event.yield_unit || 'tons'}`
        : 'crops';

      const areaIsFormatted =
        typeof event.area_covered === 'string' && /\d+\s+\w+/.test(event.area_covered);
      const areaInfo = areaIsFormatted
        ? ` from ${event.area_covered}` // Already formatted
        : event.area_covered
        ? ` from ${event.area_covered} ${event.area_unit || 'hectares'}`
        : '';

      // Enhanced with harvest quality grade transparency
      const qualityInfo = event.harvest_quality_grade
        ? ` Graded as ${event.harvest_quality_grade.replace(/_/g, ' ')} for export and quality standards.`
        : '';

      consumerImpact = `${yieldInfo} harvested${areaInfo} at peak ripeness ensures maximum nutritional value and freshness.${qualityInfo}`;
      sustainabilityBenefit = `Documented harvest timing, yield tracking, and quality grading demonstrates responsible farming and rigorous quality control practices.`;
    } else if (eventType.includes('irrigation') || eventType === 'IR') {
      // Personalize based on irrigation data
      // 🔧 FIX: Check if value is already formatted to avoid unit duplication
      const areaIsFormatted =
        typeof event.area_covered === 'string' && /\d+\s+\w+/.test(event.area_covered);
      const areaInfo = areaIsFormatted
        ? event.area_covered // Already formatted
        : event.area_covered
        ? `${event.area_covered} ${event.area_unit || 'hectares'}`
        : 'crops';

      const fuelIsFormatted =
        typeof event.fuel_consumed === 'string' && /\d+\s+\w+/.test(event.fuel_consumed);
      const fuelInfo = fuelIsFormatted
        ? ` using ${event.fuel_consumed} of fuel` // Already formatted
        : event.fuel_consumed
        ? ` using ${event.fuel_consumed} ${event.fuel_unit || 'L'} of fuel`
        : '';

      consumerImpact = `Targeted irrigation across ${areaInfo} provides optimal water levels for healthy plant growth${
        fuelInfo ? ' with documented resource usage' : ''
      }.`;
      sustainabilityBenefit = `Precision irrigation with complete documentation conserves water resources while maintaining optimal growing conditions.`;
    } else if (eventType.includes('pruning') || eventType === 'PR') {
      // Personalize based on pruning data
      // 🔧 FIX: Check if value is already formatted to avoid unit duplication
      const areaIsFormatted =
        typeof event.area_covered === 'string' && /\d+\s+\w+/.test(event.area_covered);
      const areaInfo = areaIsFormatted
        ? `across ${event.area_covered}` // Already formatted
        : event.area_covered
        ? `across ${event.area_covered} ${event.area_unit || 'hectares'}`
        : '';

      const hoursIsFormatted =
        typeof event.equipment_hours === 'string' && /\d+\s+\w+/.test(event.equipment_hours);
      const hoursInfo = hoursIsFormatted
        ? ` over ${event.equipment_hours}` // Already formatted
        : event.equipment_hours
        ? ` over ${event.equipment_hours} hours`
        : '';

      consumerImpact = `Strategic pruning ${areaInfo}${hoursInfo} improves plant health, air circulation, and fruit quality for better produce.`;
      sustainabilityBenefit = `Documented pruning practices reduce disease pressure and optimize plant productivity through transparency.`;
    } else if (eventType.includes('cultivation') || eventType === 'CU') {
      // CRITICAL FIX (2025-12-11): Added cultivation consumer impact
      // 🔧 FIX: Check if value is already formatted to avoid unit duplication
      const areaIsFormatted =
        typeof event.area_covered === 'string' && /\d+\s+\w+/.test(event.area_covered);
      const areaInfo = areaIsFormatted
        ? `across ${event.area_covered}` // Already formatted
        : event.area_covered
        ? `across ${event.area_covered} ${event.area_unit || 'hectares'}`
        : '';

      const fuelIsFormatted =
        typeof event.fuel_consumed === 'string' && /\d+\s+\w+/.test(event.fuel_consumed);
      const fuelInfo = fuelIsFormatted
        ? ` using ${event.fuel_consumed} of fuel` // Already formatted
        : event.fuel_consumed
        ? ` using ${event.fuel_consumed} ${event.fuel_unit || 'L'} of fuel`
        : '';

      consumerImpact = `Mechanical cultivation ${areaInfo} controls weeds naturally and improves soil aeration for healthier plant roots${
        fuelInfo ? ' with documented resource usage' : ''
      }.`;
      sustainabilityBenefit = `Documented cultivation practices demonstrate sustainable weed management and soil health maintenance.`;
    } else if (eventType.includes('thinning') || eventType === 'TH') {
      // CRITICAL FIX (2025-12-11): Added thinning consumer impact
      // 🔧 FIX: Check if value is already formatted to avoid unit duplication
      const areaIsFormatted =
        typeof event.area_covered === 'string' && /\d+\s+\w+/.test(event.area_covered);
      const areaInfo = areaIsFormatted
        ? `across ${event.area_covered}` // Already formatted
        : event.area_covered
        ? `across ${event.area_covered} ${event.area_unit || 'hectares'}`
        : '';

      const hoursIsFormatted =
        typeof event.equipment_hours === 'string' && /\d+\s+\w+/.test(event.equipment_hours);
      const hoursInfo = hoursIsFormatted
        ? ` over ${event.equipment_hours}` // Already formatted
        : event.equipment_hours
        ? ` over ${event.equipment_hours} hours`
        : '';

      consumerImpact = `Fruit thinning ${areaInfo}${hoursInfo} improves individual fruit size, quality, and sugar content by reducing competition for nutrients.`;
      sustainabilityBenefit = `Documented thinning practices optimize resource allocation and demonstrate commitment to premium quality produce.`;
    }

    // 🌱 TRANSPARENCY-FIRST: Enhanced consumer title resolution
    const getConsumerTitle = (event: any, typeInfo: any): string => {
      // Priority 1: Farmer's custom production name
      if (event.production_name && event.production_name.trim()) {
        return event.production_name;
      }

      // Priority 2: General event name field
      if (event.name && event.name.trim()) {
        return event.name;
      }

      // Priority 3: Commercial name (for chemical events that might be misclassified)
      if (event.commercial_name && event.commercial_name.trim()) {
        return event.commercial_name;
      }

      // Priority 4: Generate descriptive titles from event data
      // Use production_type (normalized) or type (raw API) for subtype detection
      const prodType = event.production_type || event.type;
      if (prodType) {
        const desc = (event.description || '').toLowerCase();

        // For harvests - differentiate by quality grade or description
        if (prodType === 'HA') {
          if (event.harvest_quality_grade) {
            const gradeLabels: Record<string, string> = {
              export_quality: 'Harvest - Export Quality',
              grade_a: 'Harvest - Grade A',
              grade_b: 'Harvest - Grade B',
              grade_c: 'Harvest - Grade C',
              domestic: 'Harvest - Domestic Market',
              processing: 'Harvest - Processing Grade'
            };
            return gradeLabels[event.harvest_quality_grade] || 'Harvest Operation';
          }
          if (desc.includes('export')) return 'Harvest - Export Quality';
          if (desc.includes('processing') || desc.includes('juice')) return 'Harvest - Processing Grade';
          if (desc.includes('first') || desc.includes('main') || desc.includes('premium'))
            return 'Main Harvest';
          if (desc.includes('second')) return 'Second Harvest';
          if (desc.includes('third') || desc.includes('final')) return 'Final Harvest';
          return 'Harvest Operation';
        }

        // For irrigation - differentiate by season/phase
        if (prodType === 'IR') {
          if (desc.includes('bloom')) return 'Irrigation - Bloom Phase';
          if (desc.includes('fruit development') || desc.includes('fruit swell'))
            return 'Irrigation - Fruit Development';
          if (desc.includes('summer')) return 'Summer Irrigation';
          if (desc.includes('winter') || desc.includes('dormant')) return 'Winter Irrigation';
          if (desc.includes('establishment') || desc.includes('young'))
            return 'Establishment Irrigation';
          return 'Irrigation Operation';
        }

        // For pruning - differentiate by purpose
        if (prodType === 'PR') {
          if (desc.includes('structural')) return 'Structural Pruning';
          if (desc.includes('maintenance')) return 'Maintenance Pruning';
          if (desc.includes('winter')) return 'Winter Pruning';
          if (desc.includes('summer')) return 'Summer Pruning';
          if (desc.includes('formative') || desc.includes('shaping')) return 'Formative Pruning';
          if (desc.includes('dead') || desc.includes('sanitary')) return 'Sanitary Pruning';
          return 'Pruning Operation';
        }

        // Default code-to-title map for other production types
        const codeToTitle: Record<string, string> = {
          PL: 'Planting',
          TR: 'Transplanting Operation',
          CU: 'Cultivation',
          TH: 'Thinning',
          EM: 'Equipment Maintenance',
          EQ: 'Equipment Operations (Legacy)',
          SO: 'Soil Operation',
          FE: 'Fertilizer Operation',
          WE: 'Weather Monitoring'
        };
        if (codeToTitle[prodType]) {
          return codeToTitle[prodType];
        }
      }

      // Priority 5: Use typeInfo from mapping
      return typeInfo.title;
    };

    const transparencyTitle = getConsumerTitle(event, typeInfo);

    return {
      title: transparencyTitle,
      description: fullDescription,
      shortDescription: typeInfo.description,
      icon,
      impact: impactLevel,
      consumerMessage: 'Sustainable agricultural practice following industry best practices',
      consumerImpact,
      sustainabilityBenefit
    };
  }

  // For weather events (event_type: 0), create specific descriptions based on weather type
  // IMPROVED: More flexible weather event detection
  const isWeatherEvent = event && event.event_type === 0;
  const hasSpecificWeatherType =
    (event.weather_type && event.weather_type !== 'weather') ||
    (event.type && event.type !== 'weather') ||
    // Check for temperature data as indicator of weather event
    event.lower_temperature !== undefined ||
    event.upper_temperature !== undefined ||
    event.highest_temperature !== undefined ||
    // Check for weather-specific fields
    event.way_of_protection !== undefined;

  if (
    isWeatherEvent &&
    (hasSpecificWeatherType ||
      eventDescription.toLowerCase().includes('weather') ||
      eventDescription.toLowerCase().includes('frost') ||
      eventDescription.toLowerCase().includes('temperature'))
  ) {
    // Weather event type mapping
    const weatherTypeMap: Record<
      string,
      { title: string; icon: string; description: string; impact: 'HIGH' | 'MEDIUM' | 'LOW' }
    > = {
      FR: {
        title: 'Frost Event',
        icon: '❄️',
        description:
          'Frost conditions monitored and documented to assess impact on crop health and implement protective measures',
        impact: 'LOW'
      },
      DR: {
        title: 'Drought Monitoring',
        icon: '☀️',
        description:
          'Drought conditions tracked to optimize water management and assess crop water stress levels',
        impact: 'MEDIUM'
      },
      HL: {
        title: 'Hail Damage Assessment',
        icon: '🌨️',
        description:
          'Hail event documented with damage assessment to inform crop protection and recovery strategies',
        impact: 'HIGH'
      },
      HT: {
        title: 'Heat Stress Monitoring',
        icon: '🌡️',
        description:
          'High temperature conditions monitored to protect crops and implement cooling strategies',
        impact: 'MEDIUM'
      },
      TS: {
        title: 'Storm & Wind Event',
        icon: '🌪️',
        description:
          'Storm conditions and wind damage assessed to evaluate crop impact and recovery needs',
        impact: 'HIGH'
      },
      HW: {
        title: 'High Winds Event',
        icon: '💨',
        description:
          'High wind conditions monitored and documented to assess crop damage and implement protective measures',
        impact: 'MEDIUM'
      },
      HH: {
        title: 'High Humidity Monitoring',
        icon: '💧',
        description:
          'High humidity conditions tracked to prevent disease development and optimize growing conditions',
        impact: 'LOW'
      },
      LH: {
        title: 'Low Humidity Monitoring',
        icon: '🏜️',
        description:
          'Low humidity conditions monitored to assess plant stress and adjust irrigation strategies',
        impact: 'LOW'
      }
    };

    // Get the weather type from available fields, with better fallback
    const weatherTypeCode = event.weather_type || event.type;

    // IMPROVED: Better fallback logic for weather events without specific type
    let weatherInfo = weatherTypeMap[weatherTypeCode];

    if (!weatherInfo) {
      // Try to infer weather type from event data
      if (event.lower_temperature !== undefined && event.lower_temperature < 35) {
        weatherInfo = weatherTypeMap['FR']; // Frost
      } else if (
        event.way_of_protection &&
        event.way_of_protection.toLowerCase().includes('cover')
      ) {
        weatherInfo = weatherTypeMap['FR']; // Frost protection
      } else if (eventDescription.toLowerCase().includes('frost')) {
        weatherInfo = weatherTypeMap['FR'];
      } else if (eventDescription.toLowerCase().includes('drought')) {
        weatherInfo = weatherTypeMap['DR'];
      } else if (eventDescription.toLowerCase().includes('temperature')) {
        weatherInfo = weatherTypeMap['HT']; // Heat
      } else {
        // Generic weather fallback
        weatherInfo = {
          title: 'Weather Monitoring',
          icon: '🌤️',
          description:
            'Weather conditions monitored to assess environmental impact on crop growth and development',
          impact: 'LOW' as const
        };
      }
    }

    // Get detailed weather information from transparency details
    const realDetails = getRealTransparencyDetails(event);

    // Create consumer impact and sustainability benefit messages based on weather type
    let consumerImpact =
      'Environmental conditions are closely monitored to ensure optimal crop management and food quality.';
    let sustainabilityBenefit =
      'Weather monitoring enables precise agricultural decisions that optimize resource use and minimize environmental impact.';

    if (weatherTypeCode === 'FR') {
      consumerImpact =
        'Frost protection measures help preserve crop quality and prevent damage that could affect harvest yields.';
      sustainabilityBenefit =
        'Proactive frost monitoring reduces crop losses and food waste, supporting efficient resource utilization.';
    } else if (weatherTypeCode === 'DR') {
      consumerImpact =
        'Drought monitoring ensures water resources are used efficiently while maintaining crop health and quality.';
      sustainabilityBenefit =
        'Water-smart farming practices during drought conditions help conserve this precious resource for future generations.';
    } else if (weatherTypeCode === 'HL') {
      consumerImpact =
        'Rapid damage assessment after hail events helps farmers implement recovery strategies to maintain crop quality.';
      sustainabilityBenefit =
        'Quick response to hail damage minimizes crop losses and reduces the need for replanting, saving resources.';
    } else if (weatherTypeCode === 'HT') {
      consumerImpact =
        'Heat stress management protects crops during extreme temperatures to maintain fruit quality and nutritional value.';
      sustainabilityBenefit =
        'Climate-adaptive farming practices help crops thrive despite changing weather patterns.';
    } else if (weatherTypeCode === 'TS') {
      consumerImpact =
        'Storm damage assessment ensures only healthy, undamaged produce reaches consumers.';
      sustainabilityBenefit =
        'Resilient farming practices help minimize weather-related crop losses and maintain food security.';
    } else if (weatherTypeCode === 'HW') {
      consumerImpact =
        'High wind monitoring helps assess crop damage and implement protective measures to maintain harvest quality.';
      sustainabilityBenefit =
        'Wind damage assessment enables quick response to protect crops and minimize agricultural losses.';
    } else if (weatherTypeCode === 'HH') {
      consumerImpact =
        'Humidity monitoring helps prevent fungal diseases that could compromise crop health and safety.';
      sustainabilityBenefit =
        'Disease prevention through environmental monitoring reduces the need for chemical treatments.';
    } else if (weatherTypeCode === 'LH') {
      consumerImpact =
        'Low humidity management ensures crops receive adequate moisture for optimal growth and quality.';
      sustainabilityBenefit =
        'Efficient water management during dry conditions helps conserve water resources.';
    }

    // For weather events, use the standardized description without prepending user observations
    // User observations are displayed separately in "Farmer's Field Notes" section
    let description = weatherInfo.description;
    description += realDetails;

    // Use farmer's event name as title when available (consistent with all other event types),
    // falling back to the standardized weatherTypeMap title
    const weatherTitle = (event.name && event.name.trim()) ? event.name : weatherInfo.title;

    return {
      title: weatherTitle,
      description: description,
      shortDescription: description, // Use the same concatenated description for both fields
      icon: weatherInfo.icon,
      impact: weatherInfo.impact,
      consumerMessage:
        'Environmental monitoring practice following sustainable agriculture principles',
      consumerImpact,
      sustainabilityBenefit
    };
  }

  // For chemical events, create specific descriptions based on chemical type and product used
  if (
    event &&
    (event.event_type === 2 ||
      event.type === 'chemical' ||
      event.type?.includes('chemical') ||
      ['FE', 'PE', 'FU', 'HE'].includes(event.type)) &&
    (event.commercial_name || event.equipment)
  ) {
    const productName = event.commercial_name || event.equipment;

    // Determine chemical type - PRIORITY: Use form field type (FE, PE, FU, HE) over product name detection
    let chemicalType = 'chemical application';
    let impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    let icon = '🧪';
    // PRIMARY: Check explicit chemical type from form (FE, PE, FU, HE) or serialized format
    const specificType = event.chemical_type || event.type;

    // Helper function to extract chemical type from serialized format
    const extractChemicalType = (type: string): string | null => {
      if (!type) return null;
      // Handle raw codes (FE, PE, FU, HE)
      if (['FE', 'PE', 'FU', 'HE'].includes(type)) return type;
      // Handle serialized format (event.chemical.fertilizer → FE)
      if (type.includes('event.chemical.fertilizer')) return 'FE';
      if (type.includes('event.chemical.pesticide')) return 'PE';
      if (type.includes('event.chemical.fungicide')) return 'FU';
      if (type.includes('event.chemical.herbicide')) return 'HE';
      return null;
    };

    const normalizedType = extractChemicalType(specificType);
    if (normalizedType === 'FE') {
      chemicalType = 'fertilizer application';
      icon = '🌱';
      impactLevel = 'MEDIUM';
    } else if (normalizedType === 'PE') {
      chemicalType = 'pesticide application';
      icon = '🐛';
      // Check for high-concern pesticides (neonicotinoids, restricted use)
      const extraData = event.extra_data || {};
      const lowerProduct = productName.toLowerCase();
      const isNeonicotinoid =
        (extraData.chemical_subtype || '').toLowerCase() === 'neonicotinoid' ||
        lowerProduct.includes('imidacloprid') ||
        lowerProduct.includes('clothianidin') ||
        lowerProduct.includes('thiamethoxam') ||
        lowerProduct.includes('acetamiprid') ||
        lowerProduct.includes('dinotefuran');
      const isRestrictedUse = extraData.restricted_use_pesticide === true;
      impactLevel = isNeonicotinoid || isRestrictedUse ? 'HIGH' : 'MEDIUM';
    } else if (normalizedType === 'FU') {
      chemicalType = 'fungicide application';
      icon = '🛡️';
      impactLevel = 'MEDIUM';
    } else if (normalizedType === 'HE') {
      chemicalType = 'herbicide application';
      icon = '🌾';
      impactLevel = 'MEDIUM';
    }
    // FALLBACK: Detect from product name (for legacy data or incomplete forms)
    else if (
      productName.toLowerCase().includes('fertilizer') ||
      productName.toLowerCase().includes('miracle-gro') ||
      productName.toLowerCase().includes('nutrient') ||
      productName.toLowerCase().includes('plant food') ||
      productName.toLowerCase().includes('citrus') ||
      (event.npk_ratio && event.npk_ratio !== '')
    ) {
      chemicalType = 'fertilizer application';
      icon = '🌱';
      impactLevel = 'MEDIUM';
    }
    // Neem oil products - organic pest control
    else if (productName.toLowerCase().includes('neem')) {
      chemicalType = 'pesticide application';
      icon = '🌿';
      impactLevel = 'LOW';
    }
    // Copper fungicides
    else if (productName.toLowerCase().includes('copper')) {
      chemicalType = 'fungicide application';
      icon = '🛡️';
      impactLevel = 'MEDIUM';
    }
    // Glyphosate/Roundup herbicides
    else if (
      productName.toLowerCase().includes('roundup') ||
      productName.toLowerCase().includes('glyphosate')
    ) {
      chemicalType = 'herbicide application';
      icon = '🌾';
      impactLevel = 'MEDIUM';
    }

    let baseDescription =
      eventDescriptions[chemicalType] || eventDescriptions['chemical application'];
    const realDetails = getRealTransparencyDetails(event);

    // Create consumer impact and sustainability benefit messages based on chemical type
    let consumerImpact =
      'This professional agricultural treatment follows industry best practices to ensure food safety and quality.';
    let sustainabilityBenefit =
      'Part of integrated farming approach that balances productivity with environmental responsibility.';

    if (chemicalType === 'fertilizer application') {
      consumerImpact =
        'Targeted fertilizer application provides essential nutrients for healthy plant growth and optimal fruit quality.';
      // Phase 3: Fertigation note
      const isFertigationFlag =
        event.is_fertigation === true ||
        event.is_fertigation === 'true' ||
        event.extra_data?.is_fertigation === true ||
        event.extra_data?.is_fertigation === 'true';
      sustainabilityBenefit = isFertigationFlag
        ? 'Fertigation (fertilizer through irrigation) maximizes nutrient uptake efficiency and reduces runoff. Application fuel excluded from carbon calculation to avoid double-counting with irrigation events.'
        : 'Precision nutrient management reduces waste and environmental impact while ensuring healthy crops.';
    } else if (chemicalType === 'pesticide application') {
      // Check chemical_subtype FIRST before product name detection
      // This ensures user's explicit selection takes precedence over product name inference
      const chemicalSubtype = (event?.chemical_subtype || '').toLowerCase();
      const isSyntheticBySubtype =
        chemicalSubtype.includes('synthetic') || chemicalSubtype.includes('conventional');
      const isOrganicBySubtype =
        chemicalSubtype.includes('organic') ||
        chemicalSubtype.includes('natural') ||
        chemicalSubtype.includes('biological');

      // Use subtype if specified, otherwise fall back to product name detection
      const isOrganic =
        isOrganicBySubtype || (!isSyntheticBySubtype && productName.toLowerCase().includes('neem'));

      if (isOrganic) {
        baseDescription = 'Applied organic pest control to naturally protect plants from harmful insects';
        consumerImpact =
          'Organic pest control provides natural protection without synthetic chemicals, supporting healthier food production.';
        sustainabilityBenefit =
          'Natural pest control reduces reliance on synthetic pesticides, promoting biodiversity and soil health.';
      } else {
        baseDescription = 'Applied professional pest control to protect plants from harmful insects';
        consumerImpact =
          'Professional pesticide application protects crops from harmful pests while following strict safety protocols.';
        sustainabilityBenefit =
          'Targeted pest control prevents crop losses and reduces need for repeated treatments.';
      }
    } else if (chemicalType === 'fungicide application') {
      // Special case for copper-based organic fungicides
      if (productName.toLowerCase().includes('copper')) {
        consumerImpact =
          'Copper fungicide prevents plant diseases that could affect crop quality and yield, ensuring healthy produce.';
        sustainabilityBenefit =
          'Disease prevention reduces crop losses and food waste, contributing to more efficient resource use.';
      } else {
        consumerImpact =
          'Fungicide treatment prevents plant diseases that could compromise food quality and safety.';
        sustainabilityBenefit =
          'Disease prevention protects crop yields and reduces agricultural waste.';
      }
    } else if (chemicalType === 'herbicide application') {
      // Special case for glyphosate products
      if (
        productName.toLowerCase().includes('roundup') ||
        productName.toLowerCase().includes('glyphosate')
      ) {
        consumerImpact =
          'Herbicide application controls weeds that compete with crops for nutrients and water, improving harvest quality.';
        sustainabilityBenefit =
          'Targeted weed management reduces the need for tillage, helping preserve soil structure and reduce erosion.';
      } else {
        consumerImpact =
          'Herbicide treatment manages weeds that compete with crops for essential resources.';
        sustainabilityBenefit =
          'Effective weed control supports healthy crop growth and optimal resource utilization.';
      }
    }

    // Enhance title with NPK ratio or active ingredient if available
    let enhancedTitle = productName;

    // *** CRITICAL FIX: Prioritize NPK ratio from concentration field (matches preview behavior) ***
    if (
      event.concentration &&
      String(event.concentration).trim() &&
      String(event.concentration).trim() !== 'null' &&
      String(event.concentration).includes('-') // NPK ratio format like "10-10-10"
    ) {
      enhancedTitle = `${productName} (NPK ${event.concentration})`;
    }
    // Fallback to active ingredient if no NPK ratio
    else if (
      event.active_ingredient &&
      String(event.active_ingredient).trim() &&
      String(event.active_ingredient).trim() !== 'null' &&
      String(event.active_ingredient).trim() !== productName
    ) {
      // Check if the commercial name already contains the active ingredient(s)
      // e.g. "Chateau WDG (flumioxazin) + Alion (indaziflam)" already has "Flumioxazin + Indaziflam"
      const aiParts = String(event.active_ingredient).split(/[+,&]/).map(s => s.trim().toLowerCase());
      const nameLower = productName.toLowerCase();
      const alreadyContained = aiParts.every(part => part && nameLower.includes(part));
      if (!alreadyContained) {
        enhancedTitle = `${productName} (${event.active_ingredient})`;
      }
    }

    return {
      title: enhancedTitle,
      description: baseDescription + realDetails,
      shortDescription: baseDescription,
      icon,
      impact: impactLevel,
      consumerMessage: `Professional agricultural treatment applied according to sustainable farming practices`,
      consumerImpact,
      sustainabilityBenefit
    };
  }

  // For soil management events (event_type: 5), create specific descriptions based on soil operation data
  if (event && (event.event_type === 5 || event.type === 'soil_management')) {
    let icon = '🌱';
    let impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

    // Map soil management types to consumer-friendly descriptions
    const soilTypeMap: Record<
      string,
      { title: string; icon: string; description: string; impact: 'HIGH' | 'MEDIUM' | 'LOW' }
    > = {
      'Soil Testing': {
        title: 'Soil Testing & Analysis',
        icon: '🧪',
        description:
          'Comprehensive soil analysis to optimize growing conditions and ensure healthy crop development',
        impact: 'LOW'
      },
      ST: {
        title: 'Soil Testing & Analysis',
        icon: '🧪',
        description:
          'Comprehensive soil analysis to optimize growing conditions and ensure healthy crop development',
        impact: 'LOW'
      },
      PA: {
        title: 'pH Adjustment',
        icon: '⚖️',
        description:
          'Soil pH optimization to improve nutrient availability and support healthy plant growth',
        impact: 'MEDIUM'
      },
      OM: {
        title: 'Organic Matter Addition',
        icon: '🍂',
        description:
          'Enhanced soil health through organic matter incorporation for improved fertility and structure',
        impact: 'HIGH'
      },
      CC: {
        title: 'Cover Crop Management',
        icon: '🌿',
        description:
          'Cover crop implementation to protect soil, prevent erosion, and enhance soil organic matter',
        impact: 'HIGH'
      },
      TI: {
        title: 'Tillage Implementation',
        icon: '🚜',
        description:
          'Strategic soil cultivation for optimal seed bed preparation and crop establishment',
        impact: 'MEDIUM'
      },
      CO: {
        title: 'Composting Operation',
        icon: '♻️',
        description:
          'Sustainable compost application to enrich soil fertility and promote beneficial microbial activity',
        impact: 'HIGH'
      }
    };

    // Determine soil management type from various possible fields
    const soilType = event.soil_management_type || event.type || 'Soil Management';
    const typeInfo = soilTypeMap[soilType] || {
      title: 'Soil Management Operation',
      icon: '🌱',
      description:
        'Soil management activity supporting healthy growing conditions and sustainable farming practices',
      impact: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW'
    };

    icon = typeInfo.icon;
    impactLevel = typeInfo.impact;

    // Build detailed soil management information
    const soilDetails: string[] = [];

    if (event.soil_management_name || event.name) {
      soilDetails.push(`Operation: ${event.soil_management_name || event.name}`);
    }

    if (event.area_managed || event.area) {
      const area = event.area_managed || event.area;
      const unit = event.area_unit || 'hectares';
      soilDetails.push(`Area: ${area} ${unit}`);
    }

    if (event.working_depth) {
      const unit = event.depth_unit || 'cm';
      soilDetails.push(`Depth: ${event.working_depth} ${unit}`);
    }

    if (event.soil_ph !== undefined && event.soil_ph !== null) {
      soilDetails.push(`pH: ${event.soil_ph}`);
    }

    if (event.organic_matter !== undefined && event.organic_matter !== null) {
      soilDetails.push(`Organic Matter: ${event.organic_matter}%`);
    }

    if (event.soil_texture) {
      soilDetails.push(`Texture: ${event.soil_texture}`);
    }

    if (event.equipment_used) {
      soilDetails.push(`Equipment: ${event.equipment_used}`);
    }

    // Create detailed description
    const detailsText = soilDetails.length > 0 ? ` • ${soilDetails.join(' • ')}` : '';

    const fullDescription = typeInfo.description + detailsText;

    // Create personalized consumer messages based on soil management type
    let consumerImpact =
      'This soil management practice supports healthy growing conditions and sustainable farming.';
    let sustainabilityBenefit =
      'Documented soil management demonstrates commitment to soil health and environmental stewardship.';

    // Specific messages for each soil management type
    if (soilType === 'ST' || soilType.includes('Testing')) {
      const areaInfo = event.area_managed
        ? ` across ${event.area_managed} ${event.area_unit || 'hectares'}`
        : '';
      const phInfo = event.soil_ph ? ` (pH: ${event.soil_ph})` : '';

      consumerImpact = `Soil testing and analysis${areaInfo}${phInfo} ensures optimal growing conditions and informed farming decisions.`;
      sustainabilityBenefit =
        'Scientific soil analysis enables precision agriculture and reduces unnecessary inputs through data-driven decisions.';
    } else if (soilType === 'PA' || soilType.includes('pH')) {
      const areaInfo = event.area_managed
        ? ` across ${event.area_managed} ${event.area_unit || 'hectares'}`
        : '';
      const phInfo = event.soil_ph ? ` to achieve optimal pH of ${event.soil_ph}` : '';

      consumerImpact = `Soil pH adjustment${areaInfo}${phInfo} optimizes nutrient availability for healthy crop development.`;
      sustainabilityBenefit =
        'pH optimization improves nutrient uptake efficiency, reducing fertilizer requirements and environmental impact.';
    } else if (soilType === 'OM' || soilType.includes('Organic')) {
      const areaInfo = event.area_managed
        ? ` across ${event.area_managed} ${event.area_unit || 'hectares'}`
        : '';
      const omInfo = event.organic_matter ? ` (${event.organic_matter}% organic matter)` : '';

      consumerImpact = `Organic matter enhancement${areaInfo}${omInfo} builds soil fertility and supports beneficial microbial activity.`;
      sustainabilityBenefit =
        'Organic matter addition improves soil structure, water retention, and long-term soil health naturally.';
    } else if (soilType === 'CC' || soilType.includes('Cover')) {
      const areaInfo = event.area_managed
        ? ` across ${event.area_managed} ${event.area_unit || 'hectares'}`
        : '';

      consumerImpact = `Cover crop management${areaInfo} protects soil from erosion and enhances soil organic matter naturally.`;
      sustainabilityBenefit =
        'Cover crops prevent soil erosion, suppress weeds, and improve soil structure while reducing input requirements.';
    } else if (soilType === 'TI' || soilType.includes('Tillage')) {
      const areaInfo = event.area_managed
        ? ` across ${event.area_managed} ${event.area_unit || 'hectares'}`
        : '';
      const depthInfo = event.working_depth
        ? ` at ${event.working_depth} ${event.depth_unit || 'cm'} depth`
        : '';

      consumerImpact = `Strategic tillage implementation${areaInfo}${depthInfo} prepares optimal seedbed conditions for healthy crop establishment.`;
      sustainabilityBenefit =
        'Precision tillage minimizes soil disturbance while ensuring proper seedbed preparation and crop establishment.';
    } else if (soilType === 'CO' || soilType.includes('Compost')) {
      const areaInfo = event.area_managed
        ? ` across ${event.area_managed} ${event.area_unit || 'hectares'}`
        : '';

      consumerImpact = `Compost application${areaInfo} enriches soil naturally and promotes beneficial microbial diversity.`;
      sustainabilityBenefit =
        'Composting recycles organic materials, reduces waste, and builds soil fertility through sustainable practices.';
    }

    // Enhanced title resolution for soil management events
    const getSoilManagementTitle = (event: any, typeInfo: any): string => {
      // 🚨 CRITICAL FIX: Priority 0 - Use normalized title from backend if available
      if (event.title && event.title.trim()) {
        return event.title;
      }

      // Priority 1: Soil management name from form
      if (event.soil_management_name && event.soil_management_name.trim()) {
        return event.soil_management_name;
      }

      // Priority 2: General event name field
      if (event.name && event.name.trim()) {
        return event.name;
      }

      // Priority 3: Use typeInfo.title (consumer-friendly mapped name from soilTypeMap)
      if (event.soil_management_type && event.soil_management_type.trim()) {
        return typeInfo.title;
      }

      // Priority 4: Area context
      if (event.area_managed) {
        const unit = event.area_unit || 'hectares';
        return `${typeInfo.title} - ${event.area_managed} ${unit}`;
      }

      // Fallback to typeInfo title
      return typeInfo.title;
    };

    const soilTitle = getSoilManagementTitle(event, typeInfo);

    return {
      title: soilTitle,
      description: fullDescription,
      shortDescription: typeInfo.description,
      icon,
      impact: impactLevel,
      consumerMessage: 'Soil management supporting sustainable farming practices',
      consumerImpact,
      sustainabilityBenefit
    };
  }

  // For pest management events, create specific descriptions based on IPM type
  if (
    event &&
    (event.event_type === 6 ||
      event.type === 'pest_management' ||
      event.type?.includes('pest') ||
      ['SC', 'TM', 'BR', 'PI', 'TA', 'IP'].includes(event.type))
  ) {
    // Determine pest management type and impact level
    let impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    let icon = '🐛';

    // Map pest management types to consumer-friendly descriptions
    const pestTypeMap: Record<
      string,
      { title: string; icon: string; description: string; impact: 'HIGH' | 'MEDIUM' | 'LOW' }
    > = {
      SC: {
        title: 'Pest Scouting',
        icon: '🔍',
        description:
          'Monitored crops for pest populations and damage levels to inform management decisions',
        impact: 'LOW'
      },
      TM: {
        title: 'Trap Monitoring',
        icon: '🪤',
        description:
          'Checked monitoring traps to track pest populations and identify early warning signs',
        impact: 'LOW'
      },
      BR: {
        title: 'Beneficial Release',
        icon: '🐞',
        description:
          'Released beneficial insects to naturally control pest populations using biological methods',
        impact: 'HIGH'
      },
      PI: {
        title: 'Pest Identification',
        icon: '🔬',
        description: 'Identified pest species to develop targeted management strategies',
        impact: 'MEDIUM'
      },
      TA: {
        title: 'Threshold Assessment',
        icon: '📊',
        description:
          'Evaluated pest population levels against economic thresholds to determine treatment needs',
        impact: 'MEDIUM'
      },
      IP: {
        title: 'IPM Implementation',
        icon: '🌱',
        description:
          'Applied integrated pest management strategy combining multiple sustainable control methods',
        impact: 'HIGH'
      },
      scouting: {
        title: 'Pest Scouting',
        icon: '🔍',
        description:
          'Monitored crops for pest populations and damage levels to inform management decisions',
        impact: 'LOW'
      },
      beneficial_release: {
        title: 'Beneficial Release',
        icon: '🐞',
        description:
          'Released beneficial insects to naturally control pest populations using biological methods',
        impact: 'HIGH'
      },
      trap_monitoring: {
        title: 'Trap Monitoring',
        icon: '🪤',
        description:
          'Checked monitoring traps to track pest populations and identify early warning signs',
        impact: 'LOW'
      },
      pest_identification: {
        title: 'Pest Identification',
        icon: '🔬',
        description: 'Identified pest species to develop targeted management strategies',
        impact: 'MEDIUM'
      },
      threshold_assessment: {
        title: 'Threshold Assessment',
        icon: '📊',
        description:
          'Evaluated pest population levels against economic thresholds to determine treatment needs',
        impact: 'MEDIUM'
      },
      ipm_implementation: {
        title: 'IPM Implementation',
        icon: '🌱',
        description:
          'Applied integrated pest management strategy combining multiple sustainable control methods',
        impact: 'HIGH'
      }
    };

    // Get pest management type from event data
    const eventPestType = event.pest_management_type || event.pest_type || event.type || 'SC';
    const typeInfo = pestTypeMap[eventPestType] || {
      title: 'Pest Management Activity',
      icon: '🐛',
      description: 'Applied sustainable pest management practices to protect crop health',
      impact: 'MEDIUM' as 'MEDIUM'
    };

    icon = typeInfo.icon;
    impactLevel = typeInfo.impact;

    // Build transparency details from pest management data
    const pestDetails: string[] = [];

    if (event.pest_species) {
      pestDetails.push(`Target: ${event.pest_species}`);
    }

    if (event.pest_pressure_level) {
      pestDetails.push(`Pressure: ${event.pest_pressure_level}`);
    }

    if (event.damage_percentage) {
      pestDetails.push(`Crop impact: ${event.damage_percentage}%`);
    }

    if (event.beneficial_species) {
      pestDetails.push(`Beneficial: ${event.beneficial_species}`);
    }

    if (event.release_quantity) {
      pestDetails.push(`Quantity: ${event.release_quantity}`);
    }

    if (event.trap_count) {
      pestDetails.push(`Traps: ${event.trap_count}`);
    }

    if (event.field_area_hectares) {
      pestDetails.push(`Area: ${event.field_area_hectares} hectares`);
    }

    if (event.time_spent_hours) {
      pestDetails.push(`Duration: ${event.time_spent_hours} hours`);
    }

    // Create detailed description
    const detailsText = pestDetails.length > 0 ? ` (${pestDetails.join(' • ')})` : '';

    const fullDescription = typeInfo.description + detailsText;

    // Create personalized consumer messages based on pest management type
    let consumerImpact =
      'This sustainable pest management practice supports healthy crop production while protecting the environment.';
    let sustainabilityBenefit =
      'Part of integrated pest management approach that reduces reliance on synthetic pesticides and promotes ecological balance.';

    if (eventPestType === 'SC' || eventPestType === 'scouting') {
      consumerImpact =
        'Regular pest monitoring helps detect issues early, preventing damage and reducing the need for chemical interventions.';
      sustainabilityBenefit =
        'Proactive scouting prevents pest outbreaks and supports precision agriculture practices that minimize environmental impact.';
    } else if (eventPestType === 'TM' || eventPestType === 'trap_monitoring') {
      consumerImpact =
        'Monitoring traps provide early warning of pest populations, enabling targeted responses that protect crop quality.';
      sustainabilityBenefit =
        'Trap monitoring reduces pesticide applications by providing precise timing for control measures only when needed.';
    } else if (eventPestType === 'BR' || eventPestType === 'beneficial_release') {
      const beneficialInfo = event.beneficial_species
        ? event.beneficial_species
        : 'beneficial insects';
      const releaseInfo = event.release_quantity ? `${event.release_quantity} ` : '';

      consumerImpact = `Released ${releaseInfo}${beneficialInfo} to naturally control pests, creating a healthy ecosystem that protects crops without chemicals.`;
      sustainabilityBenefit =
        'Biological pest control builds sustainable farming systems that work with nature to maintain crop health and biodiversity.';
    } else if (eventPestType === 'PI' || eventPestType === 'pest_identification') {
      const pestInfo = event.pest_species ? event.pest_species : 'pest species';

      consumerImpact = `Accurate identification of ${pestInfo} enables precise, targeted management that protects crops while minimizing environmental impact.`;
      sustainabilityBenefit =
        'Species-specific pest management reduces unnecessary treatments and supports integrated approaches that preserve beneficial organisms.';
    } else if (eventPestType === 'TA' || eventPestType === 'threshold_assessment') {
      const damageInfo = event.damage_percentage
        ? `${event.damage_percentage}% crop damage`
        : 'pest pressure levels';

      consumerImpact = `Scientific assessment of ${damageInfo} ensures treatments are only applied when economically necessary, protecting crop quality.`;
      sustainabilityBenefit =
        'Economic threshold-based decisions prevent overtreatment, reducing environmental impact while maintaining profitable farming.';
    } else if (eventPestType === 'IP' || eventPestType === 'ipm_implementation') {
      const strategyInfo = event.imp_strategy ? 'comprehensive strategy' : 'integrated approach';

      consumerImpact = `Implemented ${strategyInfo} combining multiple sustainable methods to manage pests while protecting crop health and quality.`;
      sustainabilityBenefit =
        'Integrated pest management reduces chemical dependency through biological controls, monitoring, and targeted interventions.';
    }

    // Use farmer's actual event name when available
    const transparencyTitle = event.name || event.commercial_name || typeInfo.title;

    return {
      title: transparencyTitle,
      description: fullDescription,
      shortDescription: typeInfo.description,
      icon,
      impact: impactLevel,
      consumerMessage:
        'Sustainable pest management practice following integrated pest management principles',
      consumerImpact,
      sustainabilityBenefit
    };
  }

  // For general events (event_type: 3), create specific descriptions based on activity type
  if (event && (event.event_type === 3 || event.type === 'general')) {
    let icon = '🔧';
    let impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

    // Map activity types to consumer-friendly descriptions
    const activityTypeMap: Record<
      string,
      { title: string; icon: string; description: string; impact: 'HIGH' | 'MEDIUM' | 'LOW' }
    > = {
      maintenance: {
        title: 'Farm Maintenance Activity',
        icon: '🔧',
        description: 'Maintained farm infrastructure and equipment for optimal operations',
        impact: 'LOW'
      },
      planning: {
        title: 'Farm Planning',
        icon: '📋',
        description: 'Planned and organized farming activities for optimal productivity',
        impact: 'LOW'
      },
      training: {
        title: 'Training Activity',
        icon: '🎓',
        description: 'Conducted training activities to improve farming knowledge and skills',
        impact: 'MEDIUM'
      },
      documentation: {
        title: 'Farm Documentation',
        icon: '📝',
        description: 'Documented farming practices for transparency and compliance',
        impact: 'LOW'
      },
      inspection: {
        title: 'Safety Inspection',
        icon: '🛡️',
        description: 'Inspected farm facilities and equipment for safety compliance',
        impact: 'HIGH'
      },
      meeting: {
        title: 'Team Meeting',
        icon: '👥',
        description: 'Coordinated team activities and planning sessions',
        impact: 'LOW'
      },
      community: {
        title: 'Community Engagement',
        icon: '🤝',
        description: 'Engaged with the community through farm tours and outreach',
        impact: 'LOW'
      },
      precision_ag: {
        title: 'Precision Agriculture',
        icon: '🛰️',
        description: 'Conducted precision agriculture activities for data-driven farming',
        impact: 'LOW'
      },
      emergency: {
        title: 'Emergency/Storm Response',
        icon: '⚠️',
        description: 'Responded to emergency conditions with cleanup and damage repair',
        impact: 'MEDIUM'
      },
      other: {
        title: 'General Farm Activity',
        icon: '🔧',
        description: 'Completed general farming activity as part of farm operations',
        impact: 'LOW'
      }
    };

    // Get activity type from event data
    const eventActivityType = event.activity_type || 'maintenance';
    const typeInfo = activityTypeMap[eventActivityType] || {
      title: 'General Farm Activity',
      icon: '🔧',
      description: 'Completed general farming activity as part of farm operations',
      impact: 'LOW' as const
    };

    icon = typeInfo.icon;
    impactLevel = typeInfo.impact;

    // Build transparency details from general event data
    const generalDetails: string[] = [];

    const activityTypeLabels: Record<string, string> = {
      maintenance: 'Maintenance',
      planning: 'Planning',
      training: 'Training',
      documentation: 'Documentation',
      inspection: 'Inspection',
      meeting: 'Team Meeting',
      community: 'Community Engagement',
      precision_ag: 'Precision Agriculture',
      emergency: 'Emergency Response',
      other: 'Other Activity'
    };
    if (event.activity_type && event.activity_name) {
      const typeLabel = activityTypeLabels[event.activity_type] || event.activity_type;
      generalDetails.push(`${typeLabel}: ${event.activity_name}`);
    } else if (event.activity_name) {
      generalDetails.push(`Activity: ${event.activity_name}`);
    }

    if (event.duration || event.duration_raw) {
      const duration = event.duration || `${event.duration_raw} hours`;
      generalDetails.push(`Duration: ${duration}`);
    }

    if (event.people_involved && event.people_involved > 0) {
      const peopleText = event.people_involved === 1 ? 'person' : 'people';
      generalDetails.push(`${event.people_involved} ${peopleText} involved`);
    }

    // Create detailed description
    const detailsText = generalDetails.length > 0 ? ` • ${generalDetails.join(' • ')}` : '';

    const fullDescription = typeInfo.description + detailsText;

    // Create personalized consumer messages based on activity type
    let consumerImpact =
      'This farm management activity supports efficient operations and sustainable farming practices.';
    let sustainabilityBenefit =
      'Part of comprehensive farm management that ensures operational efficiency and environmental responsibility.';

    if (eventActivityType === 'maintenance') {
      const durationInfo = event.duration ? ` over ${event.duration} hours` : '';
      const peopleInfo = event.people_involved ? ` with ${event.people_involved} team members` : '';

      consumerImpact = `Regular farm maintenance${durationInfo}${peopleInfo} ensures equipment operates efficiently and safely for quality food production.`;
      sustainabilityBenefit =
        'Preventive maintenance reduces equipment breakdowns, extends machinery life, and minimizes environmental impact from repairs.';
    } else if (eventActivityType === 'planning') {
      consumerImpact =
        'Strategic farm planning optimizes resource allocation and ensures efficient crop management throughout the season.';
      sustainabilityBenefit =
        'Comprehensive planning reduces waste, optimizes inputs, and supports sustainable farming decision-making.';
    } else if (eventActivityType === 'training') {
      const peopleInfo = event.people_involved ? ` for ${event.people_involved} team members` : '';

      consumerImpact = `Professional training${peopleInfo} ensures best practices are followed for safe, high-quality food production.`;
      sustainabilityBenefit =
        'Ongoing education promotes adoption of sustainable techniques and improves overall farming practices.';
    } else if (eventActivityType === 'documentation') {
      consumerImpact =
        'Detailed farm documentation provides transparency and traceability that builds consumer trust in food production.';
      sustainabilityBenefit =
        'Thorough record-keeping enables continuous improvement and demonstrates commitment to sustainable practices.';
    } else if (eventActivityType === 'inspection') {
      consumerImpact =
        'Regular safety inspections ensure farm operations meet high standards for worker safety and food quality.';
      sustainabilityBenefit =
        'Safety protocols protect workers and the environment while maintaining sustainable operational standards.';
    } else if (eventActivityType === 'emergency') {
      const peopleInfo = event.people_involved ? ` with ${event.people_involved} team members` : '';

      consumerImpact = `Rapid emergency response${peopleInfo} protects crops and farm infrastructure, ensuring continued quality production.`;
      sustainabilityBenefit =
        'Prompt damage repair minimizes crop loss and maintains farm resilience against weather events.';
    } else if (eventActivityType === 'precision_ag') {
      consumerImpact =
        'Precision agriculture technology enables data-driven decisions that optimize resource use and improve crop quality.';
      sustainabilityBenefit =
        'Data-driven farming reduces input waste, targets treatments precisely, and supports sustainable resource management.';
    } else if (eventActivityType === 'community') {
      consumerImpact =
        'Community engagement builds connections between farmers and consumers, strengthening local food systems.';
      sustainabilityBenefit =
        'Agricultural outreach promotes understanding of sustainable farming and supports local community resilience.';
    } else if (eventActivityType === 'meeting') {
      consumerImpact =
        'Team coordination ensures all farm operations are well-planned and executed with attention to quality.';
      sustainabilityBenefit =
        'Collaborative planning promotes best practices and continuous improvement in farming operations.';
    }

    // Enhanced title resolution for general events
    const getGeneralTitle = (event: any, typeInfo: any): string => {
      // Priority 1: Event name (primary title set by farmer in the form)
      if (event.name && event.name.trim()) {
        return event.name;
      }

      // Priority 2: Activity name (descriptive subtitle)
      if (event.activity_name && event.activity_name.trim()) {
        return event.activity_name;
      }

      // Priority 3: Activity type
      if (event.activity_type && event.activity_type.trim()) {
        return event.activity_type;
      }

      // Priority 4: Use typeInfo from mapping
      return typeInfo.title;
    };

    const transparencyTitle = getGeneralTitle(event, typeInfo);

    return {
      title: transparencyTitle,
      description: fullDescription,
      shortDescription: typeInfo.description,
      icon,
      impact: impactLevel,
      consumerMessage: 'Farm management activity following operational best practices',
      consumerImpact,
      sustainabilityBenefit
    };
  }

  // For equipment events (event_type: 4), create specific descriptions based on operation data
  if (event && event.event_type === 4) {
    // Since Equipment-specific fields are not being serialized from backend,
    // provide fallback messages based on available event data
    const equipmentName = event.name || 'Equipment Operation';
    const operationDescription = eventDescription || 'equipment operation';

    // Check if we have Equipment-specific data fields
    if (!event.operation_type && !event.equipment_type && !event.fuel_consumed) {
      // Fallback Equipment handling when specific fields are undefined
      return {
        title: equipmentName,
        description: `This ${operationDescription.toLowerCase()} demonstrates efficient farm equipment management, showing how modern agricultural practices optimize resource use while maintaining food quality.`,
        shortDescription: 'Equipment operation completed as part of farm activities',
        icon: '🚜',
        impact: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW',
        consumerMessage: 'Farm equipment operation following best practices',
        consumerImpact: `This ${operationDescription.toLowerCase()} demonstrates efficient farm equipment management, showing how modern agricultural practices optimize resource use while maintaining food quality.`,
        sustainabilityBenefit: `Documented equipment operations like this ${operationDescription.toLowerCase()} help build consumer trust through operational transparency and support sustainable farming through efficient resource management.`
      };
    }

    let icon = '🚜';
    let impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

    // Map operation types to consumer-friendly descriptions
    // CRITICAL: Must include actual operation type codes from EquipmentTab.jsx
    const operationTypeMap: Record<
      string,
      { title: string; icon: string; description: string; impact: 'HIGH' | 'MEDIUM' | 'LOW' }
    > = {
      // FIXED: Match actual EQUIPMENT_OPERATION_TYPES from EquipmentTab.jsx
      FC: {
        title: 'Fuel Consumption', // 🚨 CRITICAL FIX: Use exact same name as eventPreviewUtils
        icon: '⛽',
        description:
          'Documented fuel consumption for field operations with transparent tracking of equipment efficiency',
        impact: 'MEDIUM'
      },
      MN: {
        title: 'Maintenance', // 🚨 CRITICAL FIX: Use exact same name as eventPreviewUtils
        icon: '🔧',
        description:
          'Preventive maintenance activities to ensure optimal equipment performance and longevity',
        impact: 'LOW'
      },
      RE: {
        title: 'Repair', // 🚨 CRITICAL FIX: Use exact same name as eventPreviewUtils
        icon: '🛠️',
        description:
          'Equipment repair operations to restore functionality and maintain operational efficiency',
        impact: 'MEDIUM'
      },
      CA: {
        title: 'Calibration', // 🚨 CRITICAL FIX: Use exact same name as eventPreviewUtils
        icon: '⚙️',
        description:
          'Precision calibration activities to ensure accurate equipment operation and optimal performance',
        impact: 'LOW'
      },
      BD: {
        title: 'Breakdown', // 🚨 CRITICAL FIX: Use exact same name as eventPreviewUtils
        icon: '🚨',
        description:
          'Emergency breakdown response and troubleshooting to restore equipment functionality',
        impact: 'HIGH'
      },
      EI: {
        title: 'Inspection', // 🚨 CRITICAL FIX: Use exact same name as eventPreviewUtils
        icon: '🔍',
        description:
          'Systematic equipment inspection to ensure safety standards and operational readiness',
        impact: 'LOW'
      },
      // Legacy full text versions (for backward compatibility)
      'Fuel Consumption - Field Operations': {
        title: 'Fuel Consumption - Field Operations',
        icon: '⛽',
        description:
          'Documented fuel consumption for field operations with transparent tracking of equipment efficiency',
        impact: 'MEDIUM'
      },
      'Maintenance & Service': {
        title: 'Maintenance & Service',
        icon: '🔧',
        description:
          'Equipment maintenance and service activities to ensure optimal operational efficiency',
        impact: 'LOW'
      },
      'Transportation & Logistics': {
        title: 'Transportation & Logistics',
        icon: '🚛',
        description:
          'Transportation and logistics operations with documented fuel usage and efficiency tracking',
        impact: 'MEDIUM'
      },
      'Storage & Handling': {
        title: 'Storage & Handling',
        icon: '📦',
        description:
          'Storage and handling operations with complete documentation of equipment usage',
        impact: 'LOW'
      }
    };

    // Determine operation type from various possible fields
    const operationType = event.operation_type || event.type || 'Equipment Operation';
    const typeInfo = operationTypeMap[operationType] || {
      title: 'Equipment Operation',
      icon: '🚜',
      description: 'Agricultural equipment operation with transparent operational tracking',
      impact: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW'
    };

    icon = typeInfo.icon;
    impactLevel = typeInfo.impact;

    // Build detailed operation information
    const equipmentDetails: string[] = [];

    if (event.operation_name || event.name) {
      equipmentDetails.push(`Operation: ${event.operation_name || event.name}`);
    }

    if (event.equipment_type) {
      equipmentDetails.push(`Equipment: ${event.equipment_type}`);
    }

    if (event.fuel_consumed && event.fuel_consumed > 0) {
      equipmentDetails.push(`Fuel: ${event.fuel_consumed} L`);
    }

    if (event.hours_operated && event.hours_operated > 0) {
      equipmentDetails.push(`Hours: ${event.hours_operated}h`);
    }

    if (event.area_worked && event.area_worked > 0) {
      equipmentDetails.push(`Area: ${event.area_worked} ha`);
    }

    if (event.operation_efficiency) {
      equipmentDetails.push(`Efficiency: ${event.operation_efficiency}`);
    }

    // Create detailed description
    const detailsText = equipmentDetails.length > 0 ? ` • ${equipmentDetails.join(' • ')}` : '';

    const fullDescription = typeInfo.description + detailsText;

    // Create personalized consumer messages based on operation type
    let consumerImpact =
      'This equipment operation supports efficient and sustainable farming practices.';
    let sustainabilityBenefit =
      'Documented equipment operations demonstrate transparent farming practices and operational efficiency.';

    // FIXED: Specific messages for each operation type code matching EquipmentTab.jsx
    if (operationType === 'FC' || operationType.includes('Fuel Consumption')) {
      const fuelInfo = event.fuel_consumed ? ` consuming ${event.fuel_consumed}L of fuel` : '';
      const hoursInfo = event.hours_operated ? ` over ${event.hours_operated} hours` : '';
      const areaInfo = event.area_worked ? ` across ${event.area_worked} hectares` : '';
      const equipmentInfo = event.equipment_type ? ` using ${event.equipment_type}` : '';

      consumerImpact = `Field equipment operation${equipmentInfo}${fuelInfo}${hoursInfo}${areaInfo} with complete fuel consumption documentation for transparency.`;
      sustainabilityBenefit =
        'Precise fuel consumption tracking enables equipment efficiency optimization and environmental impact reduction.';
    } else if (operationType === 'MN' || operationType.includes('Maintenance')) {
      const equipmentInfo = event.equipment_type ? ` for ${event.equipment_type}` : '';
      const hoursInfo = event.hours_operated ? ` over ${event.hours_operated} hours` : '';

      consumerImpact = `Equipment maintenance${equipmentInfo}${hoursInfo} ensures optimal performance and reduces environmental impact from inefficient operations.`;
      sustainabilityBenefit =
        'Preventive maintenance extends equipment life, reduces fuel consumption, and minimizes operational carbon footprint.';
    } else if (operationType === 'RE' || operationType.includes('Repair')) {
      const equipmentInfo = event.equipment_type ? ` for ${event.equipment_type}` : '';
      const hoursInfo = event.hours_operated ? ` over ${event.hours_operated} hours` : '';

      consumerImpact = `Equipment repair${equipmentInfo}${hoursInfo} restores functionality and maintains operational efficiency for sustainable farming.`;
      sustainabilityBenefit =
        'Timely equipment repairs prevent breakdowns, reduce waste from damaged equipment, and maintain operational efficiency.';
    } else if (operationType === 'CA' || operationType.includes('Calibration')) {
      const equipmentInfo = event.equipment_type ? ` for ${event.equipment_type}` : '';
      const hoursInfo = event.hours_operated ? ` over ${event.hours_operated} hours` : '';

      consumerImpact = `Equipment calibration${equipmentInfo}${hoursInfo} ensures precise operations and optimal resource usage for quality production.`;
      sustainabilityBenefit =
        'Regular calibration improves precision, reduces resource waste, and optimizes equipment efficiency for environmental benefits.';
    } else if (operationType === 'BD' || operationType.includes('Breakdown')) {
      const equipmentInfo = event.equipment_type ? ` for ${event.equipment_type}` : '';
      const hoursInfo = event.hours_operated ? ` over ${event.hours_operated} hours` : '';

      consumerImpact = `Equipment breakdown response${equipmentInfo}${hoursInfo} ensures quick restoration of operations and minimal impact on production.`;
      sustainabilityBenefit =
        'Rapid breakdown response minimizes operational delays and prevents resource waste from extended equipment downtime.';
    } else if (operationType === 'EI' || operationType.includes('Inspection')) {
      const equipmentInfo = event.equipment_type ? ` for ${event.equipment_type}` : '';
      const hoursInfo = event.hours_operated ? ` over ${event.hours_operated} hours` : '';

      consumerImpact = `Equipment inspection${equipmentInfo}${hoursInfo} ensures safety standards and optimal performance for reliable farming operations.`;
      sustainabilityBenefit =
        'Regular inspections prevent equipment failures, extend machinery life, and maintain optimal efficiency for sustainability.';
    }

    // Enhanced title resolution for equipment events
    const getEquipmentTitle = (event: any, typeInfo: any): string => {
      // Priority 1: Operation name from form
      if (event.operation_name && event.operation_name.trim()) {
        return event.operation_name;
      }

      // Priority 2: Equipment event name field
      if (event.name && event.name.trim()) {
        return event.name;
      }

      // Priority 3: Operation type
      if (event.operation_type && event.operation_type.trim()) {
        return event.operation_type;
      }

      // Priority 4: Equipment type with operation context
      if (event.equipment_type && event.equipment_type.trim()) {
        return `${event.equipment_type} Operation`;
      }

      // Fallback to typeInfo title
      return typeInfo.title;
    };

    const equipmentTitle = getEquipmentTitle(event, typeInfo);

    return {
      title: equipmentTitle,
      description: fullDescription,
      shortDescription: typeInfo.description,
      icon,
      impact: impactLevel,
      consumerMessage: 'Equipment operation following sustainable farming practices',
      consumerImpact,
      sustainabilityBenefit
    };
  }

  // For business events (event_type: 7), create specific descriptions based on business activity data
  if (event && (event.event_type === 7 || event.type === 'business')) {
    let icon = '📋';
    let impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

    // Map business activity types to consumer-friendly descriptions
    const businessTypeMap: Record<
      string,
      { title: string; icon: string; description: string; impact: 'HIGH' | 'MEDIUM' | 'LOW' }
    > = {
      certification: {
        title: 'Certification Achievement',
        icon: '🏆',
        description:
          'Third-party certification validating sustainable farming practices and product quality',
        impact: 'HIGH'
      },
      carbon_credits: {
        title: 'Carbon Credits Transaction',
        icon: '🌱',
        description:
          'Carbon credit generation and transaction supporting environmental sustainability',
        impact: 'HIGH'
      },
      sustainability_audit: {
        title: 'Sustainability Assessment',
        icon: '📊',
        description:
          'Comprehensive audit ensuring environmental and social sustainability standards',
        impact: 'MEDIUM'
      },
      verification: {
        title: 'Third-Party Verification',
        icon: '✅',
        description:
          'Independent verification of sustainable farming practices and transparency claims',
        impact: 'MEDIUM'
      },
      compliance: {
        title: 'Regulatory Compliance',
        icon: '📜',
        description: 'Compliance with environmental regulations and agricultural safety standards',
        impact: 'MEDIUM'
      },
      transparency: {
        title: 'Transparency Initiative',
        icon: '👁️',
        description:
          'Consumer transparency initiative providing visibility into agricultural practices',
        impact: 'LOW'
      }
    };

    // Determine business activity type from various possible fields
    const businessType = event.business_activity_type || event.business_type || 'business';
    const typeInfo = businessTypeMap[businessType] || {
      title: 'Business Activity',
      icon: '📋',
      description: 'Business activity supporting sustainable agricultural operations',
      impact: 'LOW' as 'HIGH' | 'MEDIUM' | 'LOW'
    };

    icon = typeInfo.icon;
    impactLevel = typeInfo.impact;

    // Build detailed description based on business event fields
    let fullDescription = typeInfo.description;

    // Add certificate number for traceability and transparency
    if (event.certificate_number && String(event.certificate_number).trim()) {
      fullDescription += ` Certificate number ${event.certificate_number} provides verifiable proof and traceability.`;
    }

    // Add certification details with consumer-friendly explanations
    if (event.certification_type) {
      const certificationTypes: Record<string, string> = {
        organic_usda:
          'USDA Organic certification ensuring chemical-free farming practices and natural soil health',
        global_gap:
          'GlobalG.A.P. certification ensuring Good Agricultural Practices for food safety, sustainability, and worker welfare',
        carbon_neutral:
          'Carbon neutral certification demonstrating climate-positive environmental responsibility',
        rainforest_alliance:
          'Rainforest Alliance certification protecting biodiversity and forest conservation',
        fair_trade:
          'Fair Trade certification ensuring ethical labor practices and fair wages for farmers',
        regenerative:
          'Regenerative Organic certification promoting soil health and ecosystem restoration',
        cng:
          'Certified Naturally Grown certification for farms using natural growing practices',
        non_gmo:
          'Non-GMO Project Verified certification ensuring products are free from genetic modification',
        sustainable_agriculture:
          'Sustainable agriculture certification for eco-friendly farming practices and resource conservation',
        water_stewardship:
          'Water stewardship certification promoting efficient water use and conservation'
      };

      const certDesc =
        certificationTypes[event.certification_type] ||
        `${event.certification_type.replace(
          /_/g,
          ' '
        )} certification validating sustainable practices`;
      fullDescription = certDesc;
    }

    // Add carbon credits details with consumer context
    if (event.carbon_credits_earned) {
      const unit = event.carbon_credits_unit || 'credits';
      const amount = parseFloat(event.carbon_credits_earned);
      const formattedAmount = amount >= 1 ? amount.toFixed(1) : amount.toFixed(2);
      fullDescription += `. Generated ${formattedAmount} ${unit} through documented sustainable farming practices`;
    }

    // Add verification status with consumer-friendly messaging
    if (event.verification_status && event.verification_status !== 'pending') {
      const statusMessages: Record<string, string> = {
        verified: 'Successfully verified by independent third-party auditor',
        in_progress: 'Currently undergoing verification process',
        failed: 'Verification process identified areas for improvement',
        not_applicable: 'Verification not required for this activity'
      };
      const statusMsg =
        statusMessages[event.verification_status] ||
        `Verification status: ${event.verification_status}`;
      fullDescription += `. ${statusMsg}`;
    }

    // Add sustainability practice details with consumer-friendly explanations
    if (event.sustainability_practice) {
      const practiceDescriptions: Record<string, string> = {
        cover_cropping: 'Cover cropping protects soil health and reduces erosion naturally',
        no_till: 'No-till farming preserves soil structure and captures carbon underground',
        integrated_pest:
          'Integrated pest management reduces chemical use through natural pest control',
        water_conservation:
          'Water conservation measures protect this precious resource for future generations',
        renewable_energy:
          'Renewable energy installation reduces farm carbon footprint and operational costs',
        composting: 'On-farm composting turns organic waste into natural fertilizer',
        biodiversity: 'Biodiversity conservation protects native species and ecosystem health',
        soil_health: 'Soil health improvement enhances crop quality and carbon capture'
      };
      const practiceDesc =
        practiceDescriptions[event.sustainability_practice] ||
        `${event.sustainability_practice.replace(
          /_/g,
          ' '
        )} practice supporting environmental sustainability`;
      fullDescription += `. ${practiceDesc}`;
    }

    // Consumer impact messaging - Enhanced with certificate transparency
    const certificateRef = event.certificate_number
      ? ` with verifiable certificate ${event.certificate_number}`
      : '';
    let consumerImpact = `Supporting agricultural transparency and sustainability${certificateRef}`;
    if (businessType === 'certification') {
      consumerImpact = `Certified products ensuring quality and environmental standards${certificateRef}`;
    } else if (businessType === 'carbon_credits') {
      consumerImpact = `Contributing to carbon offset programs and climate action${certificateRef}`;
    } else if (businessType === 'verification') {
      consumerImpact = `Documented practices providing trust and transparency${certificateRef}`;
    } else if (businessType === 'transparency') {
      consumerImpact = `Enhanced visibility into how your food is grown${certificateRef}`;
    }

    // Sustainability benefit - Enhanced with certificate transparency
    let sustainabilityBenefit =
      'Contributing to sustainable agriculture and environmental stewardship';
    if (businessType === 'certification') {
      sustainabilityBenefit =
        'Third-party validation of sustainable farming practices ensuring environmental protection with documented certification proof';
    } else if (businessType === 'carbon_credits') {
      sustainabilityBenefit =
        'Active participation in carbon reduction programs supporting climate goals with transparent verification';
    } else if (businessType === 'verification') {
      sustainabilityBenefit =
        'Independent verification building consumer trust in sustainable practices with traceable documentation';
    }

    // Enhanced title resolution for business events
    const getBusinessTitle = (event: any, typeInfo: any): string => {
      // Priority 1: Event name from form (highest priority - farmer's custom name)
      if (event.business_event_name && event.business_event_name.trim()) {
        return event.business_event_name;
      }

      // Priority 2: Name field from form
      if (event.name && event.name.trim()) {
        return event.name;
      }

      // Priority 3: Build specific title from business_type + certification/credit/practice details
      const businessType = event.business_activity_type || event.business_type;

      // Certification events - use certification type for specific title
      // Check certification_type directly (don't require businessType === 'certification')
      // because field mapping normalization may not preserve businessType correctly
      if (event.certification_type) {
        const certTypes: Record<string, string> = {
          organic_usda: 'USDA Organic Certification',
          global_gap: 'GlobalG.A.P. Certification',
          carbon_neutral: 'Carbon Neutral Certification',
          rainforest_alliance: 'Rainforest Alliance Certification',
          fair_trade: 'Fair Trade Certification',
          regenerative: 'Regenerative Organic Certification',
          cng: 'Certified Naturally Grown',
          non_gmo: 'Non-GMO Project Verified',
          sustainable_agriculture: 'Sustainable Agriculture Certification',
          water_stewardship: 'Water Stewardship Certification'
        };
        const certTitle =
          certTypes[event.certification_type] || `${event.certification_type} Certification`;
        return certTitle;
      }

      // Carbon credit events - show amount earned
      if (businessType === 'carbon_credits' && event.carbon_credits_earned) {
        return `Carbon Credits Transaction - ${event.carbon_credits_earned} ${
          event.carbon_credits_unit || 'credits'
        }`;
      }

      // Sustainability audit with practice details
      if (businessType === 'sustainability_audit' && event.sustainability_practice) {
        const practiceNames: Record<string, string> = {
          cover_cropping: 'Cover Cropping Assessment',
          no_till: 'No-Till Farming Audit',
          integrated_pest: 'Integrated Pest Management Audit',
          water_conservation: 'Water Conservation Audit',
          renewable_energy: 'Renewable Energy Assessment',
          composting: 'Composting Program Audit',
          biodiversity: 'Biodiversity Conservation Audit',
          soil_health: 'Soil Health Assessment'
        };
        return (
          practiceNames[event.sustainability_practice] || `${event.sustainability_practice} Audit`
        );
      }

      // Verification events - add verification status if definitive
      if (
        businessType === 'verification' &&
        event.verification_status &&
        event.verification_status !== 'pending'
      ) {
        const statusText =
          event.verification_status === 'verified'
            ? 'Verified'
            : event.verification_status === 'failed'
            ? 'Failed'
            : event.verification_status;
        return `Third-Party Verification - ${statusText}`;
      }

      // Compliance events with sustainability practice
      if (businessType === 'compliance' && event.sustainability_practice) {
        return `Compliance: ${event.sustainability_practice.replace(/_/g, ' ')}`;
      }

      // Transparency events with sustainability practice
      if (businessType === 'transparency' && event.sustainability_practice) {
        return `Transparency Initiative: ${event.sustainability_practice.replace(/_/g, ' ')}`;
      }

      // Priority 4: Map business event type codes (CE, CM, IN) to specific titles
      if (event.type) {
        const codeToTitle: Record<string, string> = {
          CE: 'Certification Event',
          CM: 'Compliance Activity',
          IN: 'Inspection Process'
        };
        if (codeToTitle[event.type]) {
          // If we have business_type, combine them for more specific title
          if (businessType && businessType !== 'business') {
            const typeNames: Record<string, string> = {
              certification: 'Certification',
              carbon_credits: 'Carbon Credits',
              sustainability_audit: 'Sustainability Audit',
              verification: 'Third-Party Verification',
              compliance: 'Compliance',
              transparency: 'Transparency'
            };
            const typeName = typeNames[businessType] || businessType;
            return `${codeToTitle[event.type]}: ${typeName}`;
          }
          return codeToTitle[event.type];
        }
      }

      // Fallback to typeInfo title
      return typeInfo.title;
    };

    const businessTitle = getBusinessTitle(event, typeInfo);

    return {
      title: businessTitle,
      description: fullDescription,
      shortDescription: typeInfo.description,
      icon,
      impact: impactLevel,
      consumerMessage: 'Business activity enhancing agricultural transparency and sustainability',
      consumerImpact,
      sustainabilityBenefit
    };
  }

  // Default mapping for other event types
  let mappedDescription = eventDescriptions['default'];
  let icon = '🌱';
  let impact: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

  // Map based on description content
  if (lowerDesc.includes('fertilizer') || lowerDesc.includes('nutrient')) {
    mappedDescription = eventDescriptions['fertilizer application'];
    icon = '🌱';
    impact = 'MEDIUM';
  } else if (lowerDesc.includes('pesticide') || lowerDesc.includes('pest')) {
    mappedDescription = eventDescriptions['pesticide application'];
    icon = '🛡️';
    impact = 'MEDIUM';
  } else if (lowerDesc.includes('fungicide') || lowerDesc.includes('disease')) {
    mappedDescription = eventDescriptions['fungicide application'];
    icon = '🛡️';
    impact = 'MEDIUM';
  } else if (lowerDesc.includes('herbicide') || lowerDesc.includes('weed')) {
    mappedDescription = eventDescriptions['herbicide application'];
    icon = '🌾';
    impact = 'MEDIUM';
  } else if (lowerDesc.includes('scout') || lowerDesc.includes('monitoring')) {
    mappedDescription = eventDescriptions['pest scouting'];
    icon = '🔍';
    impact = 'LOW';
  } else if (lowerDesc.includes('trap')) {
    mappedDescription = eventDescriptions['trap monitoring'];
    icon = '🪤';
    impact = 'LOW';
  } else if (lowerDesc.includes('beneficial') || lowerDesc.includes('release')) {
    mappedDescription = eventDescriptions['beneficial release'];
    icon = '🐞';
    impact = 'HIGH';
  } else if (lowerDesc.includes('identification')) {
    mappedDescription = eventDescriptions['pest identification'];
    icon = '🔬';
    impact = 'MEDIUM';
  } else if (lowerDesc.includes('threshold')) {
    mappedDescription = eventDescriptions['threshold assessment'];
    icon = '📊';
    impact = 'MEDIUM';
  } else if (lowerDesc.includes('ipm') || lowerDesc.includes('integrated')) {
    mappedDescription = eventDescriptions['ipm implementation'];
    icon = '🌱';
    impact = 'HIGH';
  } else if (lowerDesc.includes('irrigation') || lowerDesc.includes('water')) {
    mappedDescription = eventDescriptions['irrigation'];
    icon = '💧';
    impact = 'LOW';
  } else if (lowerDesc.includes('harvest')) {
    mappedDescription = eventDescriptions['harvesting'];
    icon = '🌾';
    impact = 'LOW';
  } else if (lowerDesc.includes('plant')) {
    mappedDescription = eventDescriptions['planting'];
    icon = '🌱';
    impact = 'LOW';
  }

  // Add real details if event data is available
  const realDetails = event ? getRealTransparencyDetails(event) : '';

  // Backend now provides proper titles via TimelineService - use them directly
  let title = 'Agricultural Activity';
  if (event) {
    // Priority 1: Backend-provided commercial_name (for chemical events)
    if (event.commercial_name) {
      title = event.commercial_name;
    }
    // Priority 2: Backend-provided equipment name
    else if (event.equipment) {
      title = event.equipment;
    }
    // Priority 3: Specific activity type based on backend event type
    else if (event.type?.includes('fertilizer')) {
      title = 'Fertilizer Application';
    } else if (event.type?.includes('pesticide')) {
      title = 'Pesticide Application';
    } else if (event.type?.includes('fungicide')) {
      title = 'Fungicide Application';
    } else if (event.type?.includes('herbicide')) {
      title = 'Herbicide Application';
    } else if (event.type?.includes('irrigation')) {
      title = 'Irrigation';
    } else if (event.type?.includes('harvest')) {
      title = 'Harvest';
    } else if (event.type?.includes('plant')) {
      title = 'Planting';
    }
  }

  return {
    title,
    description: mappedDescription + realDetails,
    shortDescription: mappedDescription,
    icon,
    impact,
    consumerMessage: 'Sustainable farming practice following industry best practices',
    consumerImpact:
      'This farming practice contributes to sustainable agriculture and food quality.',
    sustainabilityBenefit:
      'Part of responsible farming practices that support environmental stewardship and long-term agricultural sustainability.'
  };
}

/**
 * Map event types to consumer-friendly categories
 */
export function getEventCategory(eventType: string): string {
  const categoryMap: Record<string, string> = {
    fertilizer: 'Soil Nutrition',
    pesticide: 'Plant Protection',
    fungicide: 'Disease Prevention',
    herbicide: 'Weed Management',
    chemical: 'Crop Treatment',
    irrigation: 'Water Management',
    planting: 'Crop Establishment',
    harvesting: 'Harvest Operations',
    equipment: 'Farm Operations',
    weather: 'Environmental Monitoring',
    soil: 'Soil Management',
    pest: 'Pest Management',
    business: 'Farm Management',
    general: 'Farm Operations'
  };

  return categoryMap[eventType.toLowerCase()] || 'Farm Activity';
}

/**
 * Get impact level based on event type and data
 */
export function getImpactLevel(event: any): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (!event) return 'LOW';

  // Chemical events - assess based on product type and application rate
  if (event.type === 'chemical') {
    const productName = event.equipment?.toLowerCase() || '';

    // Organic treatments
    if (productName.includes('neem') || productName.includes('organic')) {
      return 'LOW';
    }

    // Synthetic herbicides
    if (productName.includes('roundup') || productName.includes('glyphosate')) {
      return 'MEDIUM';
    }

    // Other synthetic chemicals
    return 'MEDIUM';
  }

  // Irrigation and maintenance
  if (['irrigation', 'equipment', 'weather'].includes(event.type)) {
    return 'LOW';
  }

  return 'LOW';
}

/**
 * Format event date for consumer display
 */
export function formatEventDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Get sustainability impact level for an event.
 * Impact semantics: HIGH = high environmental concern, MEDIUM = moderate, LOW = low concern (good).
 * When carbon_impact (CO₂e) is available, uses CO₂e-based thresholds consistent with
 * CarbonImpactPreview badges. Falls back to type-based heuristics when CO₂e is unavailable.
 */
export function getSustainabilityImpact(
  description: string,
  event?: any
): 'high' | 'medium' | 'low' {
  // CO₂e-based classification: use actual carbon data when available
  // Thresholds align with CarbonImpactPreview: >60=Very High, >15=Moderate/High, ≤15=Low/Very Low
  const carbonImpact = typeof event?.carbon_impact === 'number' ? event.carbon_impact : null;
  if (carbonImpact !== null && carbonImpact > 0) {
    if (carbonImpact > 60) return 'high';
    if (carbonImpact > 15) return 'medium';
    return 'low';
  }

  // Chemical events: delegate to getConsumerEventDescription for nuanced impact
  if (event && (event.event_type === 2 || event.type === 'chemical' || event.chemical_type)) {
    const eventInfo = getConsumerEventDescription(description, event);
    if (eventInfo.impact === 'HIGH') return 'high';
    if (eventInfo.impact === 'MEDIUM') return 'medium';
    if (eventInfo.impact === 'LOW') return 'low';
  }

  // Production events: classify by activity type
  if (event && (event.event_type === 1 || event.type?.includes('production'))) {
    const prodType = event.production_type || '';
    // Harvesting/planting are significant operations
    if (prodType === 'HA' || prodType === 'PL' || prodType === 'TR') return 'medium';
    // Irrigation, pruning, equipment maintenance are routine low-impact activities
    if (prodType === 'IR' || prodType === 'PR' || prodType === 'EM') return 'low';
    // For other types, use fuel consumption as indicator
    const fuelConsumed = parseFloat(event.fuel_consumed) || 0;
    const areaCovered = parseFloat(event.area_covered) || 0;
    const fuelPerHa = areaCovered > 0 ? fuelConsumed / areaCovered : fuelConsumed;
    if (fuelPerHa > 20) return 'high';
    if (fuelPerHa > 5) return 'medium';
    return 'low';
  }

  // Soil management: generally beneficial/low-impact practices
  if (event && event.type === 'soil_management') {
    const soilType = event.soil_management_type || '';
    if (soilType === 'CC' || soilType === 'TI' || soilType === 'ST' || soilType === 'CO') return 'low';
    return 'low';
  }

  // Pest management: monitoring and biological control are low-impact
  if (event && event.type === 'pest_management') {
    const pestType = event.pest_management_type || '';
    if (pestType === 'BR' || pestType === 'SC' || pestType === 'IP') return 'low';
    return 'medium';
  }

  // Weather and business events: monitoring/administrative
  if (event && (event.type === 'weather' || event.type === 'business')) {
    return 'low';
  }

  // Fallback: description-based
  return 'low';
}

/**
 * Get trust indicators for an event
 */
export function getEventTrustIndicators(event: any): string[] {
  const indicators: string[] = [];

  // Photo documented - handle both album and albums structures
  let hasPhotos = false;

  // Primary: Check event.album (singular) structure from backend
  if (
    event.album &&
    event.album.images &&
    Array.isArray(event.album.images) &&
    event.album.images.length > 0
  ) {
    hasPhotos = true;
  }
  // Secondary: Check legacy event.albums (plural) structure
  else if (event.albums && Array.isArray(event.albums) && event.albums.length > 0) {
    hasPhotos = event.albums.some((album: any) => {
      if (!album) return false;
      // Case 1: Nested structure with images array
      if (album.images && album.images.length > 0) return true;
      // Case 2: Direct image properties
      if (album.image_url || album.image) return true;
      return false;
    });
  }

  // USDA verified
  if (event.usda_factors_used) {
    indicators.push('USDA Standards');
  }

  // Modern farming practices (based on product types)
  if (event.equipment) {
    const equipment = event.equipment.toLowerCase();
    if (
      equipment.includes('professional') ||
      equipment.includes('precision') ||
      equipment.includes('modern')
    ) {
      indicators.push('Modern Farming');
    }
    if (
      equipment.includes('organic') ||
      equipment.includes('natural') ||
      equipment.includes('neem')
    ) {
      indicators.push('Natural Methods');
    }
  }

  return indicators;
}

/**
 * Get timeline event title matching consumer card naming conventions.
 * Used by the parcel dashboard timeline to ensure consistent naming
 * with consumer-facing cards from getConsumerEventDescription().
 */
export function getTimelineEventTitle(event: any, intl?: any): string {
  // 1. For chemical events with commercial_name: return the commercial name
  if (event.commercial_name) {
    const isChemicalEvent =
      event.event_type === 2 ||
      event.type?.includes('chemical') ||
      (event.type && ['FE', 'PE', 'FU', 'HE'].includes(event.type));
    if (isChemicalEvent) {
      return event.commercial_name;
    }
  }

  // 2. For general events (event_type 3): use event name or activity name
  if (event.event_type === 3) {
    return event.name || event.activity_name || 'Farm Activity';
  }

  // 3. Farmer's custom name takes priority (matches consumer card title resolution)
  // Consumer cards check event.name/soil_management_name/title BEFORE type-mapped names
  if (event.event_type === 5) {
    // Soil: getSoilManagementTitle() checks title → soil_management_name → name → typeInfo
    const soilName = event.title || event.soil_management_name || event.name;
    if (soilName && soilName.trim()) return soilName;
  } else if (event.event_type === 0) {
    // Weather: checks name → weatherInfo.title
    if (event.name && event.name.trim()) return event.name;
  } else if (event.event_type === 6) {
    // Pest: checks name → commercial_name → typeInfo.title
    if (event.name && event.name.trim()) return event.name;
  } else if (event.event_type === 7) {
    // Business: checks name → various fields → typeInfo.title
    if (event.name && event.name.trim()) return event.name;
  } else if (event.event_type === 1) {
    // Production: checks production_name → name → typeInfo.title
    const prodName = event.production_name || event.name;
    if (prodName && prodName.trim()) return prodName;
  } else if (event.event_type === 4) {
    // Equipment: checks name → typeInfo.title
    if (event.name && event.name.trim()) return event.name;
  }

  // 4. Lookup map matching consumer card titles from getConsumerEventDescription()
  const titleMap: Record<string, string> = {
    // Production
    PL: 'Planting',
    'event.production.planting': 'Planting',
    HA: 'Harvest Operation',
    'event.production.harvesting': 'Harvest Operation',
    IR: 'Irrigation Event',
    'event.production.irrigation': 'Irrigation Event',
    PR: 'Pruning Operation',
    'event.production.pruning': 'Pruning Operation',
    TR: 'Transplanting Operation',
    'event.production.transplanting': 'Transplanting Operation',
    CU: 'Cultivation',
    'event.production.cultivation/weed_control': 'Cultivation',
    TH: 'Thinning',
    'event.production.thinning': 'Thinning',
    EM: 'Equipment Maintenance',
    'event.production.equipment_maintenance': 'Equipment Maintenance',

    // Chemical
    FE: 'Fertilizer Application',
    'event.chemical.fertilizer': 'Fertilizer Application',
    PE: 'Pesticide Application',
    'event.chemical.pesticide': 'Pesticide Application',
    FU: 'Fungicide Application',
    'event.chemical.fungicide': 'Fungicide Application',
    HE: 'Herbicide Application',
    'event.chemical.herbicide': 'Herbicide Application',

    // Weather
    FR: 'Frost Event',
    'event.weather.frost': 'Frost Event',
    DR: 'Drought Monitoring',
    'event.weather.drought': 'Drought Monitoring',
    HL: 'Hail Damage Assessment',
    'event.weather.hailstorm': 'Hail Damage Assessment',
    HT: 'Heat Stress Monitoring',
    'event.weather.high_temperature': 'Heat Stress Monitoring',
    TS: 'Storm & Wind Event',
    'event.weather.tropical_storm': 'Storm & Wind Event',
    HW: 'High Winds Event',
    'event.weather.high_winds': 'High Winds Event',
    HH: 'High Humidity',
    'event.weather.high_humidity': 'High Humidity',
    LH: 'Low Humidity',
    'event.weather.low_humidity': 'Low Humidity',

    // Pest Management
    SC: 'Pest Scouting',
    'event.pest.scouting': 'Pest Scouting',
    BR: 'Beneficial Insect Release',
    'event.pest.beneficial_release': 'Beneficial Insect Release',
    TM: 'Trap Monitoring',
    'event.pest.trap_monitoring': 'Trap Monitoring',
    PI: 'Pest Identification',
    'event.pest.pest_identification': 'Pest Identification',
    TA: 'Threshold Assessment',
    'event.pest.threshold_assessment': 'Threshold Assessment',
    IP: 'IPM Implementation',
    'event.pest.ipm_implementation': 'IPM Implementation',

    // Soil
    ST: 'Soil Testing',
    'event.soil.soil_test': 'Soil Testing',
    PA: 'pH Adjustment',
    'event.soil.ph_adjustment': 'pH Adjustment',
    TI: 'Tillage',
    'event.soil.tillage': 'Tillage',
    SP: 'Soil Preparation',
    'event.soil.preparation': 'Soil Preparation',
    SA: 'Soil Amendment',
    'event.soil.amendment': 'Soil Amendment',
    SM: 'Soil Management',
    'event.soil.management': 'Soil Management',

    // Business
    CE: 'Certification',
    'event.business.certification': 'Certification',
    CM: 'Compliance Review',
    CO: 'Compliance Review',
    'event.business.compliance': 'Compliance Review',
    IN: 'Business Inspection',
    BI: 'Business Inspection',
    'event.business.inspection': 'Business Inspection'
  };

  if (event.type && titleMap[event.type]) {
    return titleMap[event.type];
  }

  // 5. Fall back to i18n translation
  if (intl && event.type) {
    try {
      const translated = intl.formatMessage({ id: event.type });
      if (translated && translated !== event.type) {
        return translated;
      }
    } catch {
      // Ignore translation errors
    }
  }

  // 6. Category defaults
  const categoryDefaults: Record<number, string> = {
    0: 'Weather Event',
    1: 'Farm Activity',
    2: 'Chemical Application',
    4: 'Equipment Operation',
    5: 'Soil Management',
    6: 'Pest Management',
    7: 'Business Activity'
  };

  return event.name || categoryDefaults[event.event_type] || 'Farm Activity';
}

export default {
  eventDescriptions,
  getRealTransparencyDetails,
  getConsumerEventDescription,
  getTimelineEventTitle,
  getEventCategory,
  getImpactLevel,
  formatEventDate,
  getSustainabilityImpact,
  getEventTrustIndicators
};
