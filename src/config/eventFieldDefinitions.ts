/**
 * Shared Event Field Definitions
 *
 * This configuration provides a single source of truth for field definitions
 * that can be used by both Quick Event and Manual Event forms.
 *
 * Key Principles:
 * - DRY: Define field metadata once
 * - Type Safety: Full TypeScript interfaces
 * - Consistency: Same validation rules across forms
 * - Flexibility: Quick Event uses smart defaults, Manual Event uses full validation
 *
 * Usage:
 * - Quick Event: Uses quickEventFields.ts which references these definitions
 * - Manual Event: Can use getFieldsForEventType() for consistent field rendering
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type FieldInputType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'select'
  | 'datetime-local'
  | 'checkbox';

export interface FieldOption {
  value: string;
  labelKey: string;
  descriptionKey?: string;
}

export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
}

export interface UnitConfiguration {
  hasUnitDropdown: true;
  unitFieldName: string;
  unitOptions: FieldOption[];
  defaultUnit?: string;
}

export interface SharedFieldDefinition {
  // Core field properties
  name: string;
  type: FieldInputType;

  // Display properties (i18n keys)
  labelKey: string;
  helpKey?: string;
  placeholderKey?: string;
  tooltipKey?: string;

  // Validation
  validation?: FieldValidation;

  // Units (for numeric fields with unit dropdowns)
  unitConfig?: UnitConfiguration;

  // Options (for select fields)
  options?: FieldOption[];

  // Special field types
  validationType?: 'concentration' | 'npk' | 'percentage';

  // Section grouping for Manual Event form
  sectionKey?: string;

  // Quick Event visibility and ordering
  quickEventVisible?: boolean;
  quickEventOrder?: number;
}

// ============================================================================
// UNIT OPTIONS (Reusable across multiple fields)
// ============================================================================

export const AREA_UNIT_OPTIONS: FieldOption[] = [
  { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
  { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
  { value: 'm2', labelKey: 'quickAdd.fields.units.m2' },
  { value: 'km2', labelKey: 'quickAdd.fields.units.km2' }
];

export const VOLUME_UNIT_OPTIONS: FieldOption[] = [
  { value: 'L', labelKey: 'quickAdd.fields.units.L' },
  { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
  { value: 'mL', labelKey: 'quickAdd.fields.units.mL' },
  { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
  { value: 'lb', labelKey: 'quickAdd.fields.units.lb' }
];

export const FUEL_UNIT_OPTIONS: FieldOption[] = [
  { value: 'L', labelKey: 'quickAdd.fields.units.L' },
  { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
  { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
  { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
];

export const YIELD_UNIT_OPTIONS: FieldOption[] = [
  { value: 'kg', labelKey: 'quickAdd.fields.yieldUnit.kg' },
  { value: 'tons', labelKey: 'quickAdd.fields.yieldUnit.tons' },
  { value: 'lbs', labelKey: 'quickAdd.fields.yieldUnit.lbs' },
  { value: 'boxes', labelKey: 'quickAdd.fields.yieldUnit.boxes' },
  { value: 'plants', labelKey: 'quickAdd.fields.yieldUnit.plants' },
  { value: 'seeds', labelKey: 'quickAdd.fields.yieldUnit.seeds' }
];

export const DISTANCE_UNIT_OPTIONS: FieldOption[] = [
  { value: 'km', labelKey: 'quickAdd.fields.units.km' },
  { value: 'miles', labelKey: 'quickAdd.fields.units.miles' },
  { value: 'm', labelKey: 'quickAdd.fields.units.m' }
];

// ============================================================================
// SELECT OPTIONS (Reusable across multiple fields)
// ============================================================================

export const FUEL_TYPE_OPTIONS: FieldOption[] = [
  { value: 'diesel', labelKey: 'quickAdd.fields.fuelType.diesel' },
  { value: 'gasoline', labelKey: 'quickAdd.fields.fuelType.gasoline' },
  { value: 'natural_gas', labelKey: 'quickAdd.fields.fuelType.naturalGas' },
  { value: 'lpg', labelKey: 'quickAdd.fields.fuelType.lpg' },
  { value: 'electric', labelKey: 'quickAdd.fields.fuelType.electric' }
];

// Generic application methods (fallback)
export const APPLICATION_METHOD_OPTIONS: FieldOption[] = [
  { value: 'broadcast', labelKey: 'quickAdd.fields.applicationMethod.broadcast' },
  { value: 'ground_spray', labelKey: 'quickAdd.fields.applicationMethod.groundSpray' },
  { value: 'chemigation', labelKey: 'quickAdd.fields.applicationMethod.chemigation' },
  { value: 'foliar', labelKey: 'quickAdd.fields.applicationMethod.foliar' },
  { value: 'soil_incorporation', labelKey: 'quickAdd.fields.applicationMethod.soilIncorporation' }
];

// Context-aware application methods per chemical type (from ChemicalTab-ENHANCED.jsx)
// These match exactly the Manual Event form's EPA/USDA standard methods
export const APPLICATION_METHOD_OPTIONS_BY_TYPE: Record<string, FieldOption[]> = {
  // USDA NRCS Standard Methods for Fertilizer (5 methods)
  fertilizer: [
    { value: 'broadcast', labelKey: 'quickAdd.fields.applicationMethod.broadcast' },
    { value: 'banded', labelKey: 'quickAdd.fields.applicationMethod.banded' },
    { value: 'subsurface', labelKey: 'quickAdd.fields.applicationMethod.subsurface' },
    { value: 'fertigation', labelKey: 'quickAdd.fields.applicationMethod.fertigation' },
    { value: 'foliar', labelKey: 'quickAdd.fields.applicationMethod.foliar' }
  ],
  // EPA Standard Methods for Pesticide (4 methods)
  pesticide: [
    { value: 'ground_spray', labelKey: 'quickAdd.fields.applicationMethod.groundSpray' },
    { value: 'chemigation', labelKey: 'quickAdd.fields.applicationMethod.chemigation' },
    { value: 'seed_treatment', labelKey: 'quickAdd.fields.applicationMethod.seedTreatment' },
    { value: 'soil_incorporation', labelKey: 'quickAdd.fields.applicationMethod.soilIncorporation' }
  ],
  // EPA Standard Methods for Herbicide (4 methods)
  herbicide: [
    { value: 'ground_spray', labelKey: 'quickAdd.fields.applicationMethod.groundSpray' },
    { value: 'chemigation', labelKey: 'quickAdd.fields.applicationMethod.chemigation' },
    { value: 'seed_treatment', labelKey: 'quickAdd.fields.applicationMethod.seedTreatment' },
    { value: 'soil_incorporation', labelKey: 'quickAdd.fields.applicationMethod.soilIncorporation' }
  ],
  // EPA Standard Methods for Fungicide (4 methods)
  fungicide: [
    { value: 'ground_spray', labelKey: 'quickAdd.fields.applicationMethod.groundSpray' },
    { value: 'chemigation', labelKey: 'quickAdd.fields.applicationMethod.chemigation' },
    { value: 'seed_treatment', labelKey: 'quickAdd.fields.applicationMethod.seedTreatment' },
    { value: 'soil_incorporation', labelKey: 'quickAdd.fields.applicationMethod.soilIncorporation' }
  ]
};

// Complete irrigation method options (combined from Quick Event and Manual Event)
export const IRRIGATION_METHOD_OPTIONS: FieldOption[] = [
  { value: 'drip', labelKey: 'quickAdd.fields.irrigationMethod.drip' },
  { value: 'sprinkler', labelKey: 'quickAdd.fields.irrigationMethod.sprinkler' },
  { value: 'center_pivot', labelKey: 'quickAdd.fields.irrigationMethod.centerPivot' },
  { value: 'flood', labelKey: 'quickAdd.fields.irrigationMethod.flood' },
  { value: 'furrow', labelKey: 'quickAdd.fields.irrigationMethod.furrow' },
  { value: 'subsurface', labelKey: 'quickAdd.fields.irrigationMethod.subsurface' },
  { value: 'micro_sprinkler', labelKey: 'quickAdd.fields.irrigationMethod.microSprinkler' },
  { value: 'hand_watering', labelKey: 'quickAdd.fields.irrigationMethod.handWatering' },
  { value: 'other', labelKey: 'quickAdd.fields.irrigationMethod.other' }
];

// Complete water source options (combined from Quick Event and Manual Event)
export const WATER_SOURCE_OPTIONS: FieldOption[] = [
  { value: 'well_groundwater', labelKey: 'quickAdd.fields.waterSource.wellGroundwater' },
  { value: 'municipal', labelKey: 'quickAdd.fields.waterSource.municipal' },
  { value: 'rainwater_harvesting', labelKey: 'quickAdd.fields.waterSource.rainwaterHarvesting' },
  { value: 'irrigation_canal', labelKey: 'quickAdd.fields.waterSource.irrigationCanal' },
  { value: 'river_stream', labelKey: 'quickAdd.fields.waterSource.riverStream' },
  { value: 'pond_reservoir', labelKey: 'quickAdd.fields.waterSource.pondReservoir' },
  { value: 'recycled_water', labelKey: 'quickAdd.fields.waterSource.recycledWater' },
  { value: 'other', labelKey: 'quickAdd.fields.waterSource.other' }
];

export const SEEDS_SOURCE_OPTIONS: FieldOption[] = [
  { value: 'certified_organic', labelKey: 'quickAdd.fields.seedsSource.certifiedOrganic' },
  { value: 'farm_saved', labelKey: 'quickAdd.fields.seedsSource.farmSaved' },
  { value: 'local', labelKey: 'quickAdd.fields.seedsSource.local' },
  { value: 'cooperative', labelKey: 'quickAdd.fields.seedsSource.cooperative' },
  { value: 'commercial', labelKey: 'quickAdd.fields.seedsSource.commercial' },
  { value: 'other', labelKey: 'quickAdd.fields.seedsSource.other' }
];

// Weather conditions options for chemical applications
// SSOT: Aligned with ChemicalTab-ENHANCED.jsx (Manual Event) - these are the authoritative options
export const WEATHER_CONDITIONS_OPTIONS: FieldOption[] = [
  { value: 'calm_dry', labelKey: 'app.weatherConditions.calmDry' },      // ☀️ Calm & Dry - Ideal conditions
  { value: 'light_wind', labelKey: 'app.weatherConditions.lightWind' },  // 🌬️ Light Wind - Suitable conditions
  { value: 'humid', labelKey: 'app.weatherConditions.humid' },           // 💨 Humid - Acceptable conditions
  { value: 'windy', labelKey: 'app.weatherConditions.windy' }            // 🌪️ Windy - Challenging conditions
];

// Application timing options for chemical applications
// SSOT: Aligned with ChemicalTab-ENHANCED.jsx (Manual Event) - these are the authoritative options
export const APPLICATION_TIMING_OPTIONS: FieldOption[] = [
  { value: 'pre_plant', labelKey: 'app.applicationTiming.prePlant' },           // 🌱 Pre-Planting
  { value: 'post_emergence', labelKey: 'app.applicationTiming.postEmergence' }, // 🌿 Post-Emergence
  { value: 'flowering', labelKey: 'app.applicationTiming.flowering' },          // 🌸 Flowering Stage
  { value: 'fruit_development', labelKey: 'app.applicationTiming.fruitDevelopment' }, // 🍎 Fruit Development
  { value: 'harvest', labelKey: 'app.applicationTiming.harvest' }               // 🚜 Pre-Harvest
];

// Organic approved options (Yes/No dropdown matching Manual Event)
export const ORGANIC_APPROVED_OPTIONS: FieldOption[] = [
  { value: 'true', labelKey: 'common.yes' },
  { value: 'false', labelKey: 'common.no' }
];

// Restricted Use Pesticide options (EPA compliance)
export const RESTRICTED_USE_PESTICIDE_OPTIONS: FieldOption[] = [
  { value: 'true', labelKey: 'common.yes' },
  { value: 'false', labelKey: 'common.no' }
];

export const PRODUCTION_EFFICIENCY_OPTIONS: FieldOption[] = [
  { value: 'high', labelKey: 'quickAdd.fields.productionEfficiency.high' },
  { value: 'normal', labelKey: 'quickAdd.fields.productionEfficiency.normal' },
  { value: 'low', labelKey: 'quickAdd.fields.productionEfficiency.low' }
];

// Activity type options for general documentation events
export const ACTIVITY_TYPE_OPTIONS: FieldOption[] = [
  { value: 'inspection', labelKey: 'app.activityType.inspection' },
  { value: 'certification', labelKey: 'app.activityType.certification' },
  { value: 'training', labelKey: 'app.activityType.training' },
  { value: 'maintenance', labelKey: 'app.activityType.maintenance' },
  { value: 'other', labelKey: 'app.activityType.other' }
];

export const CHEMICAL_SUBTYPE_OPTIONS = {
  fertilizer: [
    { value: 'synthetic_fertilizer', labelKey: 'quickAdd.fields.chemicalSubtype.syntheticFertilizer' },
    { value: 'organic_fertilizer', labelKey: 'quickAdd.fields.chemicalSubtype.organicFertilizer' },
    { value: 'slow_release_fertilizer', labelKey: 'quickAdd.fields.chemicalSubtype.slowReleaseFertilizer' }
  ],
  pesticide: [
    { value: 'synthetic_pesticide', labelKey: 'quickAdd.fields.chemicalSubtype.syntheticPesticide' },
    { value: 'organic_pesticide', labelKey: 'quickAdd.fields.chemicalSubtype.organicPesticide' },
    { value: 'biological_pesticide', labelKey: 'quickAdd.fields.chemicalSubtype.biologicalPesticide' }
  ],
  herbicide: [
    { value: 'synthetic_herbicide', labelKey: 'quickAdd.fields.chemicalSubtype.syntheticHerbicide' },
    { value: 'organic_herbicide', labelKey: 'quickAdd.fields.chemicalSubtype.organicHerbicide' },
    { value: 'glyphosate', labelKey: 'quickAdd.fields.chemicalSubtype.glyphosate' }
  ],
  fungicide: [
    { value: 'synthetic_fungicide', labelKey: 'quickAdd.fields.chemicalSubtype.syntheticFungicide' },
    { value: 'copper_fungicide', labelKey: 'quickAdd.fields.chemicalSubtype.copperFungicide' },
    { value: 'sulfur_fungicide', labelKey: 'quickAdd.fields.chemicalSubtype.sulfurFungicide' },
    { value: 'biological_fungicide', labelKey: 'quickAdd.fields.chemicalSubtype.biologicalFungicide' }
  ]
};

// ============================================================================
// UNIVERSAL FIELDS (All Event Types)
// ============================================================================

export const universalFields: Record<string, SharedFieldDefinition> = {
  date: {
    name: 'date',
    type: 'datetime-local',
    labelKey: 'app.eventDateTime',
    helpKey: 'app.eventDateTimeHelp',
    validation: { required: true },
    quickEventVisible: true,
    quickEventOrder: 1
  },

  performed_by: {
    name: 'performed_by',
    type: 'text',
    labelKey: 'app.performedBy',
    helpKey: 'app.performedByHelp',
    placeholderKey: 'app.performedByPlaceholder',
    tooltipKey: 'app.performedByTooltip',
    validation: {
      required: true, // Required for USDA GAP traceability (non-weather events)
      maxLength: 100
    },
    quickEventVisible: true,
    quickEventOrder: 2
  },

  observation: {
    name: 'observation',
    type: 'textarea',
    labelKey: 'app.observations',
    helpKey: 'app.observationsHelp',
    placeholderKey: 'app.observationsPlaceholder',
    validation: {
      maxLength: 2000
    },
    quickEventVisible: true,
    quickEventOrder: 100 // Always last
  }
};

// ============================================================================
// PRODUCTION EVENT FIELDS
// ============================================================================

export const productionFields: Record<string, SharedFieldDefinition> = {
  area_covered: {
    name: 'area_covered',
    type: 'number',
    labelKey: 'quickAdd.fields.areaCovered',
    helpKey: 'quickAdd.fields.areaCoveredHelp',
    validation: {
      required: true,
      min: 0,
      step: 0.01
    },
    unitConfig: {
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: AREA_UNIT_OPTIONS,
      defaultUnit: 'ha'
    },
    sectionKey: 'production.basics',
    quickEventVisible: true,
    quickEventOrder: 10
  },

  fuel_type: {
    name: 'fuel_type',
    type: 'select',
    labelKey: 'quickAdd.fields.fuelType',
    helpKey: 'quickAdd.fields.fuelTypeHelp',
    tooltipKey: 'quickAdd.fields.fuelTypeTooltip',
    options: FUEL_TYPE_OPTIONS,
    sectionKey: 'production.fuel',
    quickEventVisible: true,
    quickEventOrder: 20
  },

  fuel_consumed: {
    name: 'fuel_consumed',
    type: 'number',
    labelKey: 'quickAdd.fields.fuelConsumed',
    helpKey: 'quickAdd.fields.fuelConsumedHelp',
    validation: {
      min: 0,
      step: 0.1
    },
    unitConfig: {
      hasUnitDropdown: true,
      unitFieldName: 'fuel_unit',
      unitOptions: FUEL_UNIT_OPTIONS,
      defaultUnit: 'L'
    },
    sectionKey: 'production.fuel',
    quickEventVisible: true,
    quickEventOrder: 21
  },

  equipment_hours: {
    name: 'equipment_hours',
    type: 'number',
    labelKey: 'quickAdd.fields.equipmentHours',
    helpKey: 'quickAdd.fields.equipmentHoursHelp',
    validation: {
      min: 0,
      step: 0.1
    },
    sectionKey: 'production.equipment',
    quickEventVisible: true,
    quickEventOrder: 30
  },

  yield_quantity: {
    name: 'yield_quantity',
    type: 'number',
    labelKey: 'quickAdd.fields.yieldQuantity',
    helpKey: 'quickAdd.fields.yieldQuantityHelp',
    validation: {
      required: true,
      min: 0,
      step: 0.1
    },
    unitConfig: {
      hasUnitDropdown: true,
      unitFieldName: 'yield_unit',
      unitOptions: YIELD_UNIT_OPTIONS,
      defaultUnit: 'kg'
    },
    sectionKey: 'production.yield',
    quickEventVisible: true,
    quickEventOrder: 15
  },

  transportation_distance: {
    name: 'transportation_distance',
    type: 'number',
    labelKey: 'quickAdd.fields.transportationDistance',
    helpKey: 'quickAdd.fields.transportationDistanceHelp',
    validation: {
      min: 0,
      step: 0.1
    },
    unitConfig: {
      hasUnitDropdown: true,
      unitFieldName: 'transportation_unit',
      unitOptions: DISTANCE_UNIT_OPTIONS,
      defaultUnit: 'km'
    },
    sectionKey: 'production.transportation',
    quickEventVisible: true,
    quickEventOrder: 40
  },

  production_efficiency: {
    name: 'production_efficiency',
    type: 'select',
    labelKey: 'quickAdd.fields.productionEfficiency',
    helpKey: 'quickAdd.fields.productionEfficiencyHelp',
    options: PRODUCTION_EFFICIENCY_OPTIONS,
    sectionKey: 'production.efficiency',
    quickEventVisible: true,
    quickEventOrder: 50
  },

  seeds_source: {
    name: 'seeds_source',
    type: 'select',
    labelKey: 'quickAdd.fields.seedsSource',
    helpKey: 'quickAdd.fields.seedsSourceHelp',
    options: SEEDS_SOURCE_OPTIONS,
    sectionKey: 'production.seeds',
    quickEventVisible: true,
    quickEventOrder: 12
  },

  water_source: {
    name: 'water_source',
    type: 'select',
    labelKey: 'quickAdd.fields.waterSource',
    helpKey: 'quickAdd.fields.waterSourceHelp',
    options: WATER_SOURCE_OPTIONS,
    sectionKey: 'production.irrigation',
    quickEventVisible: true,
    quickEventOrder: 13
  },

  irrigation_method: {
    name: 'irrigation_method',
    type: 'select',
    labelKey: 'quickAdd.fields.irrigationMethod',
    helpKey: 'quickAdd.fields.irrigationMethodHelp',
    options: IRRIGATION_METHOD_OPTIONS,
    sectionKey: 'production.irrigation',
    quickEventVisible: true,
    quickEventOrder: 14
  },

  water_volume: {
    name: 'water_volume',
    type: 'number',
    labelKey: 'quickAdd.fields.waterVolume',
    helpKey: 'quickAdd.fields.waterVolumeHelp',
    validation: {
      min: 0,
      step: 1
    },
    unitConfig: {
      hasUnitDropdown: true,
      unitFieldName: 'water_unit',
      unitOptions: [
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'm3', labelKey: 'quickAdd.fields.units.m3' }
      ],
      defaultUnit: 'gal'
    },
    sectionKey: 'production.irrigation',
    quickEventVisible: true,
    quickEventOrder: 16
  }
};

// ============================================================================
// CHEMICAL EVENT FIELDS
// ============================================================================

export const chemicalFields: Record<string, SharedFieldDefinition> = {
  commercial_name: {
    name: 'commercial_name',
    type: 'text',
    labelKey: 'app.commercialName',
    helpKey: 'app.commercialNameHelp',
    placeholderKey: 'app.commercialNamePlaceholder',
    validation: {
      required: true,
      minLength: 2,
      maxLength: 100
    },
    sectionKey: 'chemical.basic',
    quickEventVisible: true,
    quickEventOrder: 10
  },

  active_ingredient: {
    name: 'active_ingredient',
    type: 'text',
    labelKey: 'app.activeIngredient',
    helpKey: 'app.activeIngredientHelp',
    validation: {
      maxLength: 200
    },
    sectionKey: 'chemical.basic',
    quickEventVisible: true,
    quickEventOrder: 11
  },

  concentration: {
    name: 'concentration',
    type: 'text',
    labelKey: 'app.concentration',
    helpKey: 'app.concentrationHelp',
    placeholderKey: 'app.concentrationPlaceholder',
    validation: {
      required: true
    },
    validationType: 'concentration',
    sectionKey: 'chemical.basic',
    quickEventVisible: true,
    quickEventOrder: 12
  },

  volume_applied: {
    name: 'volume_applied',
    type: 'number',
    labelKey: 'app.volumeApplied',
    helpKey: 'app.volumeAppliedHelp',
    validation: {
      required: true,
      min: 0,
      step: 0.1
    },
    unitConfig: {
      hasUnitDropdown: true,
      unitFieldName: 'volume_unit',
      unitOptions: VOLUME_UNIT_OPTIONS,
      defaultUnit: 'L'
    },
    sectionKey: 'chemical.application',
    quickEventVisible: true,
    quickEventOrder: 20
  },

  area_treated: {
    name: 'area_treated',
    type: 'number',
    labelKey: 'app.areaTreated',
    helpKey: 'app.areaTreatedHelp',
    validation: {
      required: true,
      min: 0,
      step: 0.01
    },
    unitConfig: {
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: AREA_UNIT_OPTIONS,
      defaultUnit: 'ha'
    },
    sectionKey: 'chemical.application',
    quickEventVisible: true,
    quickEventOrder: 21
  },

  application_method: {
    name: 'application_method',
    type: 'select',
    labelKey: 'app.applicationMethod',
    helpKey: 'app.applicationMethodHelp',
    validation: {
      required: true
    },
    options: APPLICATION_METHOD_OPTIONS,
    sectionKey: 'chemical.application',
    quickEventVisible: true,
    quickEventOrder: 22
  },

  target_pest_disease: {
    name: 'target_pest_disease',
    type: 'text',
    labelKey: 'app.targetPestDisease',
    helpKey: 'app.targetPestDiseaseHelp',
    placeholderKey: 'app.targetPestDiseasePlaceholder',
    sectionKey: 'chemical.target',
    quickEventVisible: true,
    quickEventOrder: 25
  },

  weather_conditions: {
    name: 'weather_conditions',
    type: 'text',
    labelKey: 'app.weatherConditions',
    helpKey: 'app.weatherConditionsHelp',
    sectionKey: 'chemical.conditions',
    quickEventVisible: false,
    quickEventOrder: 30
  },

  application_fuel_type: {
    name: 'application_fuel_type',
    type: 'select',
    labelKey: 'quickAdd.fields.applicationFuelType',
    helpKey: 'quickAdd.fields.applicationFuelTypeHelp',
    options: FUEL_TYPE_OPTIONS,
    sectionKey: 'chemical.fuel',
    quickEventVisible: true,
    quickEventOrder: 35
  },

  application_fuel_consumed: {
    name: 'application_fuel_consumed',
    type: 'number',
    labelKey: 'quickAdd.fields.applicationFuelConsumed',
    helpKey: 'quickAdd.fields.applicationFuelConsumedHelp',
    validation: {
      min: 0,
      step: 0.1
    },
    unitConfig: {
      hasUnitDropdown: true,
      unitFieldName: 'application_fuel_unit',
      unitOptions: FUEL_UNIT_OPTIONS,
      defaultUnit: 'L'
    },
    sectionKey: 'chemical.fuel',
    quickEventVisible: true,
    quickEventOrder: 36
  },

  // Essential fields for EPA compliance and Manual Event parity
  application_details: {
    name: 'application_details',
    type: 'textarea',
    labelKey: 'app.applicationDetails',
    helpKey: 'app.applicationDetailsHelp',
    placeholderKey: 'app.applicationDetailsPlaceholder',
    validation: {
      maxLength: 500
    },
    sectionKey: 'chemical.application',
    quickEventVisible: true,
    quickEventOrder: 23
  },

  restricted_use_pesticide: {
    name: 'restricted_use_pesticide',
    type: 'select',
    labelKey: 'app.restrictedUsePesticide',
    helpKey: 'app.restrictedUsePesticideHelp',
    options: RESTRICTED_USE_PESTICIDE_OPTIONS,
    sectionKey: 'chemical.compliance',
    quickEventVisible: true,
    quickEventOrder: 26
  },

  organic_approved: {
    name: 'organic_approved',
    type: 'select',
    labelKey: 'app.organicApproved',
    helpKey: 'app.organicApprovedHelp',
    options: ORGANIC_APPROVED_OPTIONS,
    sectionKey: 'chemical.compliance',
    quickEventVisible: true,
    quickEventOrder: 27
  },

  // EPA compliance fields
  applicator_name: {
    name: 'applicator_name',
    type: 'text',
    labelKey: 'app.applicatorName',
    helpKey: 'app.applicatorNameHelp',
    placeholderKey: 'app.applicatorNamePlaceholder',
    validation: {
      maxLength: 100
    },
    sectionKey: 'chemical.compliance',
    quickEventVisible: true,
    quickEventOrder: 28
  },

  rei_hours: {
    name: 'rei_hours',
    type: 'number',
    labelKey: 'app.reiHours',
    helpKey: 'app.reiHoursHelp',
    validation: {
      min: 0,
      step: 1
    },
    sectionKey: 'chemical.safety',
    quickEventVisible: true,
    quickEventOrder: 29
  },

  phi_days: {
    name: 'phi_days',
    type: 'number',
    labelKey: 'app.phiDays',
    helpKey: 'app.phiDaysHelp',
    validation: {
      min: 0,
      step: 1
    },
    sectionKey: 'chemical.safety',
    quickEventVisible: true,
    quickEventOrder: 30
  }
};

// ============================================================================
// EVENT TYPE FIELD GROUPS
// ============================================================================

export const eventTypeFieldGroups = {
  production: {
    irrigation: [
      'area_covered',
      'water_source',
      'irrigation_method',
      'water_volume',
      'equipment_hours',
      'fuel_type',
      'fuel_consumed'
    ],
    harvest: [
      'area_covered',
      'yield_quantity',
      'equipment_hours',
      'fuel_type',
      'fuel_consumed',
      'transportation_distance',
      'production_efficiency'
    ],
    planting: [
      'area_covered',
      'seeds_source',
      'yield_quantity',
      'equipment_hours',
      'fuel_type',
      'fuel_consumed'
    ],
    pruning: [
      'area_covered',
      'equipment_hours',
      'fuel_type',
      'fuel_consumed'
    ],
    transplanting: [
      'area_covered',
      'yield_quantity',
      'equipment_hours',
      'fuel_type',
      'fuel_consumed'
    ],
    cultivation: [
      'area_covered',
      'equipment_hours',
      'fuel_type',
      'fuel_consumed'
    ],
    thinning: [
      'area_covered',
      'equipment_hours',
      'fuel_type',
      'fuel_consumed'
    ],
    equipment_maintenance: ['equipment_hours', 'fuel_type', 'fuel_consumed']
  },
  chemical: {
    fertilizer: [
      'commercial_name',
      'active_ingredient',
      'concentration',
      'volume_applied',
      'area_treated',
      'application_method',
      'application_details',
      'organic_approved',
      'application_fuel_type',
      'application_fuel_consumed'
    ],
    pesticide: [
      'commercial_name',
      'active_ingredient',
      'concentration',
      'volume_applied',
      'area_treated',
      'application_method',
      'application_details',
      'target_pest_disease',
      'restricted_use_pesticide',
      'organic_approved',
      'applicator_name',
      'rei_hours',
      'phi_days',
      'application_fuel_type',
      'application_fuel_consumed'
    ],
    herbicide: [
      'commercial_name',
      'active_ingredient',
      'concentration',
      'volume_applied',
      'area_treated',
      'application_method',
      'application_details',
      'restricted_use_pesticide',
      'organic_approved',
      'applicator_name',
      'rei_hours',
      'phi_days',
      'application_fuel_type',
      'application_fuel_consumed'
    ],
    fungicide: [
      'commercial_name',
      'active_ingredient',
      'concentration',
      'volume_applied',
      'area_treated',
      'application_method',
      'application_details',
      'target_pest_disease',
      'restricted_use_pesticide',
      'organic_approved',
      'applicator_name',
      'rei_hours',
      'phi_days',
      'application_fuel_type',
      'application_fuel_consumed'
    ]
  }
};

// ============================================================================
// SMART DEFAULTS BY EVENT TYPE
// Quick Event uses these to pre-populate forms with sensible values
// ============================================================================

export const smartDefaults = {
  // Production Events
  irrigation: {
    area_covered: 1,
    area_unit: 'ha',
    water_source: 'well_groundwater',
    irrigation_method: 'drip',
    water_volume: 10000,
    water_unit: 'gal',
    equipment_hours: 2,
    fuel_type: 'diesel',
    fuel_consumed: 2,
    fuel_unit: 'L'
  },
  harvest: {
    area_covered: 1,
    area_unit: 'ha',
    yield_quantity: 100,
    yield_unit: 'kg',
    equipment_hours: 4,
    fuel_type: 'diesel',
    fuel_consumed: 5,
    fuel_unit: 'L',
    production_efficiency: 'normal'
  },
  planting: {
    area_covered: 1,
    area_unit: 'ha',
    seeds_source: 'commercial',
    equipment_hours: 3,
    fuel_type: 'diesel',
    fuel_consumed: 2,
    fuel_unit: 'L'
  },
  pruning: {
    area_covered: 0.5,
    area_unit: 'ha',
    equipment_type: 'manual',
    equipment_hours: 4,
    fuel_type: 'diesel',
    fuel_consumed: 0.5,
    fuel_unit: 'L'
  },
  transplanting: {
    area_covered: 0.5,
    area_unit: 'ha',
    equipment_hours: 4,
    fuel_type: 'diesel',
    fuel_consumed: 2.4,
    fuel_unit: 'L'
  },
  cultivation: {
    area_covered: 1,
    area_unit: 'ha',
    cultivation_method: 'mechanical',
    equipment_hours: 3,
    fuel_type: 'diesel',
    fuel_consumed: 3,
    fuel_unit: 'L'
  },
  thinning: {
    area_covered: 0.5,
    area_unit: 'ha',
    equipment_type: 'manual',
    equipment_hours: 4,
    fuel_type: 'diesel',
    fuel_consumed: 0.5,
    fuel_unit: 'L'
  },
  equipment_maintenance: {
    equipment_type: 'tractor',
    equipment_operation_type: 'routine_maintenance',
    equipment_hours: 2,
    fuel_type: 'diesel',
    fuel_consumed: 5,
    fuel_unit: 'L'
  },

  // Chemical Events
  fertilization: {
    chemical_subtype: 'synthetic_fertilizer',
    concentration: '10-10-10',
    volume_applied: 100,
    volume_unit: 'kg',
    area_treated: 1,
    area_unit: 'ha',
    application_method: 'broadcast',
    application_fuel_type: 'diesel',
    application_fuel_consumed: 1,
    application_fuel_unit: 'L'
  },
  pest_control: {
    chemical_subtype: 'synthetic_pesticide',
    concentration: '50%',
    volume_applied: 50,
    volume_unit: 'L',
    area_treated: 1,
    area_unit: 'ha',
    application_method: 'foliar_spray',
    application_fuel_type: 'diesel',
    application_fuel_consumed: 0.5,
    application_fuel_unit: 'L'
  },
  herbicide: {
    chemical_subtype: 'synthetic_herbicide',
    concentration: '50%',
    volume_applied: 50,
    volume_unit: 'L',
    area_treated: 1,
    area_unit: 'ha',
    application_method: 'foliar_spray',
    application_fuel_type: 'diesel',
    application_fuel_consumed: 0.5,
    application_fuel_unit: 'L'
  },
  fungicide: {
    chemical_subtype: 'synthetic_fungicide',
    concentration: '50%',
    volume_applied: 30,
    volume_unit: 'L',
    area_treated: 1,
    area_unit: 'ha',
    application_method: 'foliar_spray',
    application_fuel_type: 'diesel',
    application_fuel_consumed: 0.5,
    application_fuel_unit: 'L'
  },

  // General
  general_documentation: {
    activity_type: 'inspection'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all fields for a specific event type and subtype
 */
export function getFieldsForEventType(
  eventType: 'production' | 'chemical' | 'general',
  subtype?: string
): SharedFieldDefinition[] {
  const baseFields = [universalFields.date, universalFields.performed_by];

  if (eventType === 'production' && subtype) {
    const subtypeFields =
      eventTypeFieldGroups.production[
        subtype as keyof typeof eventTypeFieldGroups.production
      ] || [];
    const fieldDefs = subtypeFields
      .map((fieldName) => productionFields[fieldName])
      .filter(Boolean);
    return [...baseFields, ...fieldDefs, universalFields.observation];
  }

  if (eventType === 'chemical' && subtype) {
    const subtypeFields =
      eventTypeFieldGroups.chemical[
        subtype as keyof typeof eventTypeFieldGroups.chemical
      ] || [];
    const fieldDefs = subtypeFields
      .map((fieldName) => chemicalFields[fieldName])
      .filter(Boolean);
    return [...baseFields, ...fieldDefs, universalFields.observation];
  }

  return [...baseFields, universalFields.observation];
}

/**
 * Get Quick Event fields (only fields with quickEventVisible: true)
 */
export function getQuickEventFields(
  eventType: 'production' | 'chemical' | 'general',
  subtype?: string
): SharedFieldDefinition[] {
  const allFields = getFieldsForEventType(eventType, subtype);
  return allFields
    .filter((field) => field.quickEventVisible)
    .sort((a, b) => (a.quickEventOrder || 0) - (b.quickEventOrder || 0));
}

/**
 * Get smart defaults for a specific event template
 */
export function getSmartDefaults(templateId: string): Record<string, unknown> {
  return smartDefaults[templateId as keyof typeof smartDefaults] || {};
}

/**
 * Validate concentration format based on chemical type
 */
export function validateConcentration(
  value: string,
  chemicalType: string
): { isValid: boolean; error?: string } {
  if (!value) {
    return { isValid: false, error: 'Concentration is required' };
  }

  // NPK format for fertilizers: "10-10-10"
  if (chemicalType === 'FE' || chemicalType === 'fertilizer') {
    const npkPattern = /^\d{1,3}-\d{1,3}-\d{1,3}$/;
    if (!npkPattern.test(value)) {
      return { isValid: false, error: 'Use NPK format (e.g., 10-10-10)' };
    }
    return { isValid: true };
  }

  // Percentage format for other chemicals: "20%" or "20"
  const percentagePattern = /^\d{1,3}\.?\d{0,2}%?$/;
  if (!percentagePattern.test(value)) {
    return {
      isValid: false,
      error: 'Use percentage format (e.g., 20% or 20)'
    };
  }

  return { isValid: true };
}
