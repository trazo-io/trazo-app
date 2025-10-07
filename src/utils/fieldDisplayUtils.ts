/**
 * Field Display Utilities
 * Implements the comprehensive field-by-field display matrix for all event types
 * Based on /trazo-back/field_display_matrix.md specifications
 */

/**
 * Convert technical field values to consumer-friendly labels
 */
function getReadableFieldValue(field: string, value: string): string {
  const fieldMappings: Record<string, Record<string, string>> = {
    weather_conditions: {
      'calm_dry': 'Calm, dry conditions',
      'calm_wet': 'Calm, wet conditions',
      'windy_dry': 'Windy, dry conditions',
      'windy_wet': 'Windy, wet conditions',
      'rainy': 'Rainy conditions',
      'sunny': 'Sunny conditions',
      'cloudy': 'Cloudy conditions',
      'humid': 'Humid conditions'
    },
    application_timing: {
      'pre_plant': 'Before planting',
      'at_plant': 'At planting',
      'post_plant': 'After planting',
      'pre_harvest': 'Before harvest',
      'post_harvest': 'After harvest',
      'early_season': 'Early season',
      'mid_season': 'Mid season',
      'late_season': 'Late season',
      'dormant': 'Dormant period',
      'active_growth': 'Active growth period'
    },
    way_of_application: {
      'spray': 'Spray application',
      'drip': 'Drip irrigation',
      'broadcast': 'Broadcast application',
      'injection': 'Soil injection',
      'foliar': 'Foliar spray',
      'granular': 'Granular application',
      'liquid': 'Liquid application',
      'powder': 'Powder application'
    }
  };

  return fieldMappings[field]?.[value] || value;
}

export interface FieldDisplayItem {
  label: string;
  value: string;
  priority: 'immediate' | 'secondary' | 'details';
  category: 'weather' | 'application' | 'measurement' | 'verification' | 'environmental' | 'operational' | 'documentation';
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

  // Frost Events (FR)
  if (description.includes('frost') || description.includes('freeze')) {
    if (extraData.lower_temperature !== undefined) {
      immediate.push({
        label: 'Minimum Temperature',
        value: `${extraData.lower_temperature}°C (${(extraData.lower_temperature * 9/5 + 32).toFixed(1)}°F)`,
        priority: 'immediate',
        category: 'weather'
      });
    }
    if (extraData.way_of_protection || extraData.protection_measures) {
      immediate.push({
        label: 'Protection Measures',
        value: extraData.way_of_protection || extraData.protection_measures,
        priority: 'immediate',
        category: 'environmental'
      });
    }
    if (extraData.duration) {
      secondary.push({
        label: 'Duration',
        value: `${extraData.duration} hours`,
        priority: 'secondary',
        category: 'measurement'
      });
    }
  }

  // High Temperature Events (HT)
  if (description.includes('high temperature') || description.includes('heat')) {
    if (extraData.highest_temperature !== undefined) {
      immediate.push({
        label: 'Peak Temperature',
        value: `${extraData.highest_temperature}°C (${(extraData.highest_temperature * 9/5 + 32).toFixed(1)}°F)`,
        priority: 'immediate',
        category: 'weather'
      });
    }
    if (extraData.protection_measures) {
      immediate.push({
        label: 'Heat Protection',
        value: extraData.protection_measures,
        priority: 'immediate',
        category: 'environmental'
      });
    }
  }

  // Drought Events (DR)
  if (description.includes('drought') || description.includes('water deficit')) {
    if (extraData.water_deficit !== undefined) {
      immediate.push({
        label: 'Water Deficit',
        value: `${extraData.water_deficit}mm`,
        priority: 'immediate',
        category: 'measurement'
      });
    }
    if (extraData.crop_impact) {
      secondary.push({
        label: 'Crop Impact',
        value: extraData.crop_impact,
        priority: 'secondary',
        category: 'environmental'
      });
    }
  }

  // Hailstorm Events (HL)
  if (description.includes('hail')) {
    if (extraData.weight !== undefined) {
      immediate.push({
        label: 'Hail Weight',
        value: `${extraData.weight}g`,
        priority: 'immediate',
        category: 'measurement'
      });
    }
    if (extraData.diameter !== undefined) {
      secondary.push({
        label: 'Hail Diameter',
        value: `${extraData.diameter}mm`,
        priority: 'secondary',
        category: 'measurement'
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

  // Tropical Storm/High Winds (TS/HW)
  if (description.includes('storm') || description.includes('wind')) {
    if (extraData.wind_speed !== undefined) {
      immediate.push({
        label: 'Wind Speed',
        value: `${extraData.wind_speed} mph`,
        priority: 'immediate',
        category: 'weather'
      });
    }
    if (extraData.precipitation_amount !== undefined) {
      secondary.push({
        label: 'Rainfall',
        value: `${extraData.precipitation_amount}mm`,
        priority: 'secondary',
        category: 'measurement'
      });
    }
  }

  // Common weather fields
  if (extraData.start_date && extraData.end_date) {
    secondary.push({
      label: 'Event Period',
      value: `${new Date(extraData.start_date).toLocaleDateString()} to ${new Date(extraData.end_date).toLocaleDateString()}`,
      priority: 'secondary',
      category: 'operational'
    });
  }

  if (extraData.humidity_level !== undefined) {
    details.push({
      label: 'Humidity Level',
      value: `${extraData.humidity_level}%`,
      priority: 'details',
      category: 'weather'
    });
  }

  return { immediate, secondary, details };
}

/**
 * Extract and format chemical event fields according to display matrix
 */
export function getChemicalEventFields(event: any): EventFieldDisplay {
  const immediate: FieldDisplayItem[] = [];
  const secondary: FieldDisplayItem[] = [];
  const details: FieldDisplayItem[] = [];

  const extraData = event.extra_data || {};

  // Required fields - IMMEDIATE display
  if (extraData.commercial_name || event.commercial_name) {
    immediate.push({
      label: 'Product Name',
      value: extraData.commercial_name || event.commercial_name,
      priority: 'immediate',
      category: 'application'
    });
  }

  if (extraData.application_method || extraData.way_of_application || event.way_of_application) {
    const rawValue = extraData.application_method || extraData.way_of_application || event.way_of_application;
    immediate.push({
      label: 'Application Method',
      value: getReadableFieldValue('way_of_application', rawValue),
      priority: 'immediate',
      category: 'application'
    });
  }

  if (extraData.target_pest_disease || event.target_pest_disease) {
    immediate.push({
      label: 'Target',
      value: extraData.target_pest_disease || event.target_pest_disease,
      priority: 'immediate',
      category: 'application'
    });
  }

  // Area and timing - SECONDARY display
  if (extraData.area_treated !== undefined && extraData.area_unit) {
    secondary.push({
      label: 'Coverage Area',
      value: `${extraData.area_treated} ${extraData.area_unit}`,
      priority: 'secondary',
      category: 'measurement'
    });
  } else if (event.area) {
    secondary.push({
      label: 'Coverage Area',
      value: `${event.area} hectares`,
      priority: 'secondary',
      category: 'measurement'
    });
  }

  if (extraData.application_timing || event.application_timing) {
    const rawValue = extraData.application_timing || event.application_timing;
    secondary.push({
      label: 'Application Timing',
      value: getReadableFieldValue('application_timing', rawValue),
      priority: 'secondary',
      category: 'operational'
    });
  }

  if (extraData.weather_conditions || event.weather_conditions) {
    const rawValue = extraData.weather_conditions || event.weather_conditions;
    secondary.push({
      label: 'Weather Conditions',
      value: getReadableFieldValue('weather_conditions', rawValue),
      priority: 'secondary',
      category: 'environmental'
    });
  }

  // Technical details - DETAILS section
  if (extraData.concentration || event.concentration) {
    const concentration = extraData.concentration || event.concentration;
    const formattedConcentration = String(concentration).includes('%') ? concentration : `${concentration}%`;
    details.push({
      label: 'Concentration',
      value: formattedConcentration,
      priority: 'details',
      category: 'application'
    });
  }

  if ((extraData.volume_applied !== undefined && extraData.volume_unit) || event.volume) {
    const volume = extraData.volume_applied || event.volume;
    const unit = extraData.volume_unit || 'L'; // Default to liters for direct event volume
    details.push({
      label: 'Volume Applied',
      value: `${volume} ${unit}`,
      priority: 'details',
      category: 'measurement'
    });
  }

  if (extraData.active_ingredient || event.active_ingredient) {
    details.push({
      label: 'Active Ingredient',
      value: extraData.active_ingredient || event.active_ingredient,
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
  if (extraData.nitrogenPercentage !== undefined || extraData.phosphorusPercentage !== undefined || extraData.potassiumPercentage !== undefined) {
    const npk = [];
    if (extraData.nitrogenPercentage !== undefined) npk.push(`N: ${extraData.nitrogenPercentage}%`);
    if (extraData.phosphorusPercentage !== undefined) npk.push(`P: ${extraData.phosphorusPercentage}%`);
    if (extraData.potassiumPercentage !== undefined) npk.push(`K: ${extraData.potassiumPercentage}%`);
    
    details.push({
      label: 'NPK Analysis',
      value: npk.join(', '),
      priority: 'details',
      category: 'application'
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
  if (event.area_covered && String(event.area_covered).trim() !== 'null') {
    immediate.push({
      label: 'Area Covered',
      value: event.area_covered, // Already formatted with units
      priority: 'immediate',
      category: 'measurement'
    });
  }

  if (event.yield_quantity && String(event.yield_quantity).trim() !== 'null') {
    immediate.push({
      label: 'Quantity',
      value: event.yield_quantity, // Already formatted with units
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // Equipment and fuel information (SECONDARY display)
  if (event.fuel_consumed && String(event.fuel_consumed).trim() !== 'null') {
    secondary.push({
      label: 'Fuel Consumed',
      value: event.fuel_consumed, // Already formatted with units
      priority: 'secondary',
      category: 'operational'
    });
  }

  if (event.equipment_hours && String(event.equipment_hours).trim() !== 'null') {
    secondary.push({
      label: 'Equipment Hours',
      value: event.equipment_hours, // Already formatted with units
      priority: 'secondary',
      category: 'operational'
    });
  }

  // Production type for better context (DETAILS display)
  if (event.production_type) {
    const typeMapping: Record<string, string> = {
      'PL': 'Planting',
      'HA': 'Harvesting', 
      'IR': 'Irrigation',
      'PR': 'Pruning'
    };
    
    details.push({
      label: 'Production Type',
      value: typeMapping[event.production_type] || event.production_type,
      priority: 'details',
      category: 'operational'
    });
  }

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

  // Irrigation events
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

  return { immediate, secondary, details };
}

/**
 * Extract and format equipment event fields according to display matrix
 */
export function getEquipmentEventFields(event: any): EventFieldDisplay {
  const immediate: FieldDisplayItem[] = [];
  const secondary: FieldDisplayItem[] = [];
  const details: FieldDisplayItem[] = [];

  const extraData = event.extra_data || {};

  if (extraData.equipmentName) {
    immediate.push({
      label: 'Equipment',
      value: extraData.equipmentName,
      priority: 'immediate',
      category: 'operational'
    });
  }

  if (extraData.hoursUsed !== undefined) {
    immediate.push({
      label: 'Operating Hours',
      value: `${extraData.hoursUsed} hours`,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  if (extraData.fuelAmount !== undefined) {
    secondary.push({
      label: 'Fuel Consumption',
      value: `${extraData.fuelAmount} L`,
      priority: 'secondary',
      category: 'measurement'
    });
  }

  if (extraData.fuelType) {
    details.push({
      label: 'Fuel Type',
      value: extraData.fuelType,
      priority: 'details',
      category: 'operational'
    });
  }

  return { immediate, secondary, details };
}

/**
 * Extract and format soil management event fields according to display matrix
 */
export function getSoilManagementEventFields(event: any): EventFieldDisplay {
  const immediate: FieldDisplayItem[] = [];
  const secondary: FieldDisplayItem[] = [];
  const details: FieldDisplayItem[] = [];

  const extraData = event.extra_data || {};
  const description = event.description?.toLowerCase() || '';

  // All soil management activities show immediately
  if (extraData.type) {
    immediate.push({
      label: 'Soil Activity',
      value: extraData.type,
      priority: 'immediate',
      category: 'environmental'
    });
  }

  // pH adjustment events
  if (description.includes('ph') || description.includes('lime')) {
    if (extraData.limeApplicationRate) {
      secondary.push({
        label: 'Lime Application Rate',
        value: extraData.limeApplicationRate,
        priority: 'secondary',
        category: 'measurement'
      });
    }
    if (extraData.limeMethod) {
      details.push({
        label: 'Application Method',
        value: extraData.limeMethod,
        priority: 'details',
        category: 'operational'
      });
    }
  }

  // Organic matter events
  if (description.includes('organic') || description.includes('compost') || description.includes('manure')) {
    if (extraData.organicApplicationRate) {
      secondary.push({
        label: 'Application Rate',
        value: extraData.organicApplicationRate,
        priority: 'secondary',
        category: 'measurement'
      });
    }
    if (extraData.organicCoverage) {
      details.push({
        label: 'Coverage Area',
        value: `${extraData.organicCoverage} hectares`,
        priority: 'details',
        category: 'measurement'
      });
    }
  }

  return { immediate, secondary, details };
}

/**
 * Extract and format pest management event fields according to display matrix
 */
export function getPestManagementEventFields(event: any): EventFieldDisplay {
  const immediate: FieldDisplayItem[] = [];
  const secondary: FieldDisplayItem[] = [];
  const details: FieldDisplayItem[] = [];

  const extraData = event.extra_data || {};
  const description = event.description?.toLowerCase() || '';

  // All IPM activities show immediately
  if (extraData.type) {
    immediate.push({
      label: 'IPM Activity',
      value: extraData.type,
      priority: 'immediate',
      category: 'environmental'
    });
  }

  // Beneficial release events
  if (description.includes('beneficial') || description.includes('release')) {
    if (extraData.beneficialSpecies) {
      immediate.push({
        label: 'Beneficial Species',
        value: extraData.beneficialSpecies,
        priority: 'immediate',
        category: 'environmental'
      });
    }
    if (extraData.releaseRate) {
      secondary.push({
        label: 'Release Rate',
        value: extraData.releaseRate,
        priority: 'secondary',
        category: 'measurement'
      });
    }
  }

  // Monitoring activities
  if (description.includes('scout') || description.includes('monitor')) {
    if (extraData.pestPressure) {
      immediate.push({
        label: 'Pest Pressure',
        value: extraData.pestPressure,
        priority: 'immediate',
        category: 'environmental'
      });
    }
    if (extraData.monitoringMethod) {
      secondary.push({
        label: 'Monitoring Method',
        value: extraData.monitoringMethod,
        priority: 'secondary',
        category: 'operational'
      });
    }
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

  const extraData = event.extra_data || {};
  const description = event.description?.toLowerCase() || '';

  // Show only consumer-relevant business activities
  if (description.includes('certification') || description.includes('audit')) {
    if (extraData.certificationType) {
      immediate.push({
        label: 'Certification Type',
        value: extraData.certificationType,
        priority: 'immediate',
        category: 'verification'
      });
    }
    if (extraData.auditResults) {
      secondary.push({
        label: 'Audit Results',
        value: extraData.auditResults,
        priority: 'secondary',
        category: 'verification'
      });
    }
  }

  if (description.includes('training') || description.includes('education')) {
    if (extraData.trainingTopic) {
      immediate.push({
        label: 'Training Topic',
        value: extraData.trainingTopic,
        priority: 'immediate',
        category: 'operational'
      });
    }
  }

  return { immediate, secondary, details };
}

/**
 * Main function to get formatted field display for any event type
 */
export function getEventFieldDisplay(event: any): EventFieldDisplay {
  const eventType = event.type?.toLowerCase() || '';
  const description = event.description?.toLowerCase() || '';

  // Determine event category and apply appropriate formatter
  if (eventType.includes('weather') || description.includes('weather') || 
      description.includes('frost') || description.includes('drought') || 
      description.includes('hail') || description.includes('storm')) {
    return getWeatherEventFields(event);
  }
  
  if (eventType.includes('chemical') || description.includes('fertilizer') || 
      description.includes('spray') || description.includes('pesticide')) {
    return getChemicalEventFields(event);
  }
  
  if (eventType.includes('production') || description.includes('harvest') || 
      description.includes('planting') || description.includes('irrigation')) {
    return getProductionEventFields(event);
  }
  
  if (eventType.includes('equipment') || description.includes('tractor') || 
      description.includes('machinery') || description.includes('fuel')) {
    return getEquipmentEventFields(event);
  }
  
  if (eventType.includes('soil') || description.includes('soil') || 
      description.includes('organic matter') || description.includes('ph')) {
    return getSoilManagementEventFields(event);
  }
  
  if (eventType.includes('pest') || description.includes('pest') || 
      description.includes('beneficial') || description.includes('ipm')) {
    return getPestManagementEventFields(event);
  }
  
  if (eventType.includes('business') || description.includes('certification') || 
      description.includes('audit') || description.includes('training')) {
    return getBusinessEventFields(event);
  }
  
  // Default to general event handling
  return getGeneralEventFields(event);
}