/**
 * Quick Event Type-Aware Field Configuration
 *
 * ALIGNED WITH MANUAL FORM (ProductionTab.jsx & ChemicalTab-ENHANCED.jsx)
 * This configuration mirrors the exact fields from the Manual Add Event flow
 * to ensure consistent carbon calculations and data collection.
 *
 * Each field configuration includes:
 * - name: Backend field name (snake_case for API compatibility)
 * - type: Input type (select, number, text, textarea)
 * - labelKey: i18n translation key for the label
 * - helpKey: i18n translation key for help text
 * - default: Default value for Quick Create
 * - required: Whether the field is required
 * - unit: Unit for numeric fields (uses translation key)
 * - options: Array of options for select fields (with translation keys)
 * - showIf: Conditional display based on other field values
 */

export interface FieldOption {
  value: string;
  labelKey: string;
}

export interface QuickEventField {
  name: string;
  type: 'select' | 'number' | 'text' | 'textarea';
  labelKey: string;
  helpKey?: string;
  placeholderKey?: string;
  default?: string | number;
  required?: boolean;
  unit?: string;
  unitKey?: string;
  options?: FieldOption[];
  showIf?: (values: Record<string, unknown>) => boolean;
  min?: number;
  max?: number;
  step?: number;
  // For fields with unit dropdowns
  hasUnitDropdown?: boolean;
  unitFieldName?: string;
  unitOptions?: FieldOption[];
  // For fields with special validation (e.g., concentration for NPK/percentage validation)
  validationType?: 'concentration';
  // For concentration fields: the chemical type field name for context-aware validation
  chemicalTypeFieldName?: string;
}

export interface QuickEventTypeConfig {
  templateId: string;
  eventType: string; // Backend event_type code
  quickFields: QuickEventField[];
  excludeFromCarbonCalculation?: boolean;
}

// ============================================================================
// PRODUCTION EVENT TYPES (from ProductionTab.jsx)
// ============================================================================

// Irrigation Event (Production Type: IR)
// Aligned with ProductionTab.jsx lines 950-1027
export const irrigationFields: QuickEventTypeConfig = {
  templateId: 'irrigation',
  eventType: 'IR',
  quickFields: [
    // Area Covered with Unit dropdown (required for all production events)
    {
      name: 'area_covered',
      type: 'number',
      labelKey: 'quickAdd.fields.areaCovered',
      helpKey: 'quickAdd.fields.areaCoveredHelp',
      default: 1,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' },
        { value: 'km2', labelKey: 'quickAdd.fields.units.km2' }
      ]
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.areaUnit',
      default: 'ha',
      options: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' },
        { value: 'km2', labelKey: 'quickAdd.fields.units.km2' }
      ]
    },
    // Equipment Operating Hours
    {
      name: 'equipment_hours',
      type: 'number',
      labelKey: 'quickAdd.fields.equipmentHours',
      helpKey: 'quickAdd.fields.equipmentHoursHelp',
      default: 2, // Smart default: typical irrigation equipment operation time
      min: 0,
      step: 0.1
    },
    // Fuel Type (EPA-verified emission factors)
    {
      name: 'fuel_type',
      type: 'select',
      labelKey: 'quickAdd.fields.fuelType',
      helpKey: 'quickAdd.fields.fuelTypeHelp',
      default: 'diesel',
      options: [
        { value: 'diesel', labelKey: 'quickAdd.fields.fuelType.diesel' },
        { value: 'gasoline', labelKey: 'quickAdd.fields.fuelType.gasoline' },
        { value: 'natural_gas', labelKey: 'quickAdd.fields.fuelType.naturalGas' },
        { value: 'lpg', labelKey: 'quickAdd.fields.fuelType.lpg' },
        { value: 'electric', labelKey: 'quickAdd.fields.fuelType.electric' }
      ]
    },
    // Fuel Consumed with Unit dropdown
    {
      name: 'fuel_consumed',
      type: 'number',
      labelKey: 'quickAdd.fields.fuelConsumed',
      helpKey: 'quickAdd.fields.fuelConsumedHelp',
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'fuel_unit',
      unitOptions: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    },
    {
      name: 'fuel_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.fuelUnit',
      default: 'L',
      options: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    },
    // Water Source (Consumer Trust field)
    {
      name: 'water_source',
      type: 'select',
      labelKey: 'quickAdd.fields.waterSource',
      helpKey: 'quickAdd.fields.waterSourceHelp',
      default: 'well_groundwater',
      options: [
        { value: 'well_groundwater', labelKey: 'quickAdd.fields.waterSource.wellGroundwater' },
        { value: 'municipal', labelKey: 'quickAdd.fields.waterSource.municipal' },
        { value: 'rainwater_harvesting', labelKey: 'quickAdd.fields.waterSource.rainwaterHarvesting' },
        { value: 'irrigation_canal', labelKey: 'quickAdd.fields.waterSource.irrigationCanal' },
        { value: 'river_stream', labelKey: 'quickAdd.fields.waterSource.riverStream' },
        { value: 'pond_reservoir', labelKey: 'quickAdd.fields.waterSource.pondReservoir' },
        { value: 'recycled_water', labelKey: 'quickAdd.fields.waterSource.recycledWater' },
        { value: 'other', labelKey: 'quickAdd.fields.waterSource.other' }
      ]
    },
    // Irrigation Method (USDA NASS 2023)
    {
      name: 'irrigation_method',
      type: 'select',
      labelKey: 'quickAdd.fields.irrigationMethod',
      helpKey: 'quickAdd.fields.irrigationMethodHelp',
      default: 'drip',
      required: true,
      options: [
        { value: 'drip', labelKey: 'quickAdd.fields.irrigationMethod.drip' },
        { value: 'sprinkler', labelKey: 'quickAdd.fields.irrigationMethod.sprinkler' },
        { value: 'center_pivot', labelKey: 'quickAdd.fields.irrigationMethod.centerPivot' },
        { value: 'flood', labelKey: 'quickAdd.fields.irrigationMethod.flood' },
        { value: 'subsurface', labelKey: 'quickAdd.fields.irrigationMethod.subsurface' },
        { value: 'hand_watering', labelKey: 'quickAdd.fields.irrigationMethod.handWatering' },
        { value: 'other', labelKey: 'quickAdd.fields.irrigationMethod.other' }
      ]
    },
    // Irrigation Depth with Unit (USDA: 27,154 gal/acre per inch)
    {
      name: 'irrigation_depth',
      type: 'number',
      labelKey: 'quickAdd.fields.irrigationDepth',
      helpKey: 'quickAdd.fields.irrigationDepthHelp',
      default: 1,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'irrigation_depth_unit',
      unitOptions: [
        { value: 'inches', labelKey: 'quickAdd.fields.units.inches' },
        { value: 'cm', labelKey: 'quickAdd.fields.units.cm' }
      ]
    },
    {
      name: 'irrigation_depth_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.irrigationDepthUnit',
      default: 'inches',
      options: [
        { value: 'inches', labelKey: 'quickAdd.fields.units.inches' },
        { value: 'cm', labelKey: 'quickAdd.fields.units.cm' }
      ]
    },
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Harvesting Event (Production Type: HA)
// Aligned with ProductionTab.jsx lines 642-914
export const harvestFields: QuickEventTypeConfig = {
  templateId: 'harvest',
  eventType: 'HA',
  quickFields: [
    // Area Covered with Unit dropdown
    {
      name: 'area_covered',
      type: 'number',
      labelKey: 'quickAdd.fields.areaCovered',
      helpKey: 'quickAdd.fields.areaCoveredHelp',
      default: 1,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' },
        { value: 'km2', labelKey: 'quickAdd.fields.units.km2' }
      ]
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.areaUnit',
      default: 'ha',
      options: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' },
        { value: 'km2', labelKey: 'quickAdd.fields.units.km2' }
      ]
    },
    // Yield Quantity with Unit dropdown
    {
      name: 'yield_quantity',
      type: 'number',
      labelKey: 'quickAdd.fields.yieldQuantity',
      helpKey: 'quickAdd.fields.yieldQuantityHelp',
      required: true,
      default: 100, // Smart default: typical harvest quantity in kg
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'yield_unit',
      unitOptions: [
        { value: 'kg', labelKey: 'quickAdd.fields.yieldUnit.kg' },
        { value: 'tons', labelKey: 'quickAdd.fields.yieldUnit.tons' },
        { value: 'lbs', labelKey: 'quickAdd.fields.yieldUnit.lbs' },
        { value: 'boxes', labelKey: 'quickAdd.fields.yieldUnit.boxes' },
        { value: 'plants', labelKey: 'quickAdd.fields.yieldUnit.plants' },
        { value: 'seeds', labelKey: 'quickAdd.fields.yieldUnit.seeds' }
      ]
    },
    {
      name: 'yield_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.yieldUnit',
      default: 'kg',
      options: [
        { value: 'kg', labelKey: 'quickAdd.fields.yieldUnit.kg' },
        { value: 'tons', labelKey: 'quickAdd.fields.yieldUnit.tons' },
        { value: 'lbs', labelKey: 'quickAdd.fields.yieldUnit.lbs' },
        { value: 'boxes', labelKey: 'quickAdd.fields.yieldUnit.boxes' },
        { value: 'plants', labelKey: 'quickAdd.fields.yieldUnit.plants' },
        { value: 'seeds', labelKey: 'quickAdd.fields.yieldUnit.seeds' }
      ]
    },
    // Fuel Type (EPA-verified emission factors)
    {
      name: 'fuel_type',
      type: 'select',
      labelKey: 'quickAdd.fields.fuelType',
      helpKey: 'quickAdd.fields.fuelTypeHelp',
      default: 'diesel',
      options: [
        { value: 'diesel', labelKey: 'quickAdd.fields.fuelType.diesel' },
        { value: 'gasoline', labelKey: 'quickAdd.fields.fuelType.gasoline' },
        { value: 'natural_gas', labelKey: 'quickAdd.fields.fuelType.naturalGas' },
        { value: 'lpg', labelKey: 'quickAdd.fields.fuelType.lpg' },
        { value: 'electric', labelKey: 'quickAdd.fields.fuelType.electric' }
      ]
    },
    // Fuel Consumed with Unit dropdown
    {
      name: 'fuel_consumed',
      type: 'number',
      labelKey: 'quickAdd.fields.fuelConsumed',
      helpKey: 'quickAdd.fields.fuelConsumedHelp',
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'fuel_unit',
      unitOptions: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    },
    {
      name: 'fuel_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.fuelUnit',
      default: 'L',
      options: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    },
    // Equipment Operating Hours
    {
      name: 'equipment_hours',
      type: 'number',
      labelKey: 'quickAdd.fields.equipmentHours',
      helpKey: 'quickAdd.fields.equipmentHoursHelp',
      default: 4, // Smart default: typical harvest equipment operation time
      min: 0,
      step: 0.1
    },
    // Transportation Distance with Unit dropdown
    {
      name: 'transportation_distance',
      type: 'number',
      labelKey: 'quickAdd.fields.transportationDistance',
      helpKey: 'quickAdd.fields.transportationDistanceHelp',
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'transportation_unit',
      unitOptions: [
        { value: 'km', labelKey: 'quickAdd.fields.units.km' },
        { value: 'miles', labelKey: 'quickAdd.fields.units.miles' },
        { value: 'm', labelKey: 'quickAdd.fields.units.m' }
      ]
    },
    {
      name: 'transportation_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.transportationUnit',
      default: 'km',
      options: [
        { value: 'km', labelKey: 'quickAdd.fields.units.km' },
        { value: 'miles', labelKey: 'quickAdd.fields.units.miles' },
        { value: 'm', labelKey: 'quickAdd.fields.units.m' }
      ]
    },
    // Production Efficiency
    {
      name: 'production_efficiency',
      type: 'select',
      labelKey: 'quickAdd.fields.productionEfficiency',
      helpKey: 'quickAdd.fields.productionEfficiencyHelp',
      default: 'normal',
      options: [
        { value: 'high', labelKey: 'quickAdd.fields.productionEfficiency.high' },
        { value: 'normal', labelKey: 'quickAdd.fields.productionEfficiency.normal' },
        { value: 'low', labelKey: 'quickAdd.fields.productionEfficiency.low' }
      ]
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Planting Event (Production Type: PL)
// Aligned with ProductionTab.jsx
export const plantingFields: QuickEventTypeConfig = {
  templateId: 'planting',
  eventType: 'PL',
  quickFields: [
    // Area Covered with Unit dropdown
    {
      name: 'area_covered',
      type: 'number',
      labelKey: 'quickAdd.fields.areaCovered',
      helpKey: 'quickAdd.fields.areaCoveredHelp',
      default: 1,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' },
        { value: 'km2', labelKey: 'quickAdd.fields.units.km2' }
      ]
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.areaUnit',
      default: 'ha',
      options: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' },
        { value: 'km2', labelKey: 'quickAdd.fields.units.km2' }
      ]
    },
    // Seeds Source (Consumer Trust field)
    {
      name: 'seeds_source',
      type: 'select',
      labelKey: 'quickAdd.fields.seedsSource',
      helpKey: 'quickAdd.fields.seedsSourceHelp',
      default: 'commercial',
      required: true,
      options: [
        { value: 'certified_organic', labelKey: 'quickAdd.fields.seedsSource.certifiedOrganic' },
        { value: 'farm_saved', labelKey: 'quickAdd.fields.seedsSource.farmSaved' },
        { value: 'local', labelKey: 'quickAdd.fields.seedsSource.local' },
        { value: 'cooperative', labelKey: 'quickAdd.fields.seedsSource.cooperative' },
        { value: 'commercial', labelKey: 'quickAdd.fields.seedsSource.commercial' },
        { value: 'other', labelKey: 'quickAdd.fields.seedsSource.other' }
      ]
    },
    // Yield Quantity with Unit dropdown (Quantity Planted)
    {
      name: 'yield_quantity',
      type: 'number',
      labelKey: 'quickAdd.fields.quantityPlanted',
      helpKey: 'quickAdd.fields.quantityPlantedHelp',
      min: 0,
      step: 1,
      hasUnitDropdown: true,
      unitFieldName: 'yield_unit',
      unitOptions: [
        { value: 'plants', labelKey: 'quickAdd.fields.yieldUnit.plants' },
        { value: 'seeds', labelKey: 'quickAdd.fields.yieldUnit.seeds' },
        { value: 'kg', labelKey: 'quickAdd.fields.yieldUnit.kg' },
        { value: 'lbs', labelKey: 'quickAdd.fields.yieldUnit.lbs' }
      ]
    },
    {
      name: 'yield_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.yieldUnit',
      default: 'plants',
      options: [
        { value: 'plants', labelKey: 'quickAdd.fields.yieldUnit.plants' },
        { value: 'seeds', labelKey: 'quickAdd.fields.yieldUnit.seeds' },
        { value: 'kg', labelKey: 'quickAdd.fields.yieldUnit.kg' },
        { value: 'lbs', labelKey: 'quickAdd.fields.yieldUnit.lbs' }
      ]
    },
    // Fuel Type (EPA-verified emission factors)
    {
      name: 'fuel_type',
      type: 'select',
      labelKey: 'quickAdd.fields.fuelType',
      helpKey: 'quickAdd.fields.fuelTypeHelp',
      default: 'diesel',
      options: [
        { value: 'diesel', labelKey: 'quickAdd.fields.fuelType.diesel' },
        { value: 'gasoline', labelKey: 'quickAdd.fields.fuelType.gasoline' },
        { value: 'natural_gas', labelKey: 'quickAdd.fields.fuelType.naturalGas' },
        { value: 'lpg', labelKey: 'quickAdd.fields.fuelType.lpg' },
        { value: 'electric', labelKey: 'quickAdd.fields.fuelType.electric' }
      ]
    },
    // Fuel Consumed with Unit dropdown
    {
      name: 'fuel_consumed',
      type: 'number',
      labelKey: 'quickAdd.fields.fuelConsumed',
      helpKey: 'quickAdd.fields.fuelConsumedHelp',
      default: 2,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'fuel_unit',
      unitOptions: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    },
    {
      name: 'fuel_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.fuelUnit',
      default: 'L',
      options: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    },
    // Equipment Operating Hours
    {
      name: 'equipment_hours',
      type: 'number',
      labelKey: 'quickAdd.fields.equipmentHours',
      helpKey: 'quickAdd.fields.equipmentHoursHelp',
      default: 3, // Smart default: typical planting equipment operation time
      min: 0,
      step: 0.1
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Pruning Event (Production Type: PR)
// Aligned with ProductionTab.jsx
export const pruningFields: QuickEventTypeConfig = {
  templateId: 'pruning',
  eventType: 'PR',
  quickFields: [
    // Area Covered with Unit dropdown
    {
      name: 'area_covered',
      type: 'number',
      labelKey: 'quickAdd.fields.areaCovered',
      helpKey: 'quickAdd.fields.areaCoveredHelp',
      default: 0.5,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' },
        { value: 'km2', labelKey: 'quickAdd.fields.units.km2' }
      ]
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.areaUnit',
      default: 'ha',
      options: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' },
        { value: 'km2', labelKey: 'quickAdd.fields.units.km2' }
      ]
    },
    // Equipment Operating Hours
    {
      name: 'equipment_hours',
      type: 'number',
      labelKey: 'quickAdd.fields.equipmentHours',
      helpKey: 'quickAdd.fields.equipmentHoursHelp',
      default: 4,
      min: 0,
      step: 0.1
    },
    // Fuel Type (EPA-verified emission factors) - only for non-manual equipment
    {
      name: 'fuel_type',
      type: 'select',
      labelKey: 'quickAdd.fields.fuelType',
      helpKey: 'quickAdd.fields.fuelTypeHelp',
      default: 'gasoline',
      options: [
        { value: 'diesel', labelKey: 'quickAdd.fields.fuelType.diesel' },
        { value: 'gasoline', labelKey: 'quickAdd.fields.fuelType.gasoline' },
        { value: 'natural_gas', labelKey: 'quickAdd.fields.fuelType.naturalGas' },
        { value: 'lpg', labelKey: 'quickAdd.fields.fuelType.lpg' },
        { value: 'electric', labelKey: 'quickAdd.fields.fuelType.electric' }
      ]
    },
    // Fuel Consumed with Unit dropdown
    {
      name: 'fuel_consumed',
      type: 'number',
      labelKey: 'quickAdd.fields.fuelConsumed',
      helpKey: 'quickAdd.fields.fuelConsumedHelp',
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'fuel_unit',
      unitOptions: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    },
    {
      name: 'fuel_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.fuelUnit',
      default: 'L',
      options: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Transplanting Event (Production Type: TR)
// Aligned with ProductionTab.jsx - Similar to Planting but for plant relocation
export const transplantingFields: QuickEventTypeConfig = {
  templateId: 'transplanting',
  eventType: 'TR',
  quickFields: [
    // Area Covered with Unit dropdown
    {
      name: 'area_covered',
      type: 'number',
      labelKey: 'quickAdd.fields.areaCovered',
      helpKey: 'quickAdd.fields.areaCoveredHelp',
      default: 1,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' },
        { value: 'km2', labelKey: 'quickAdd.fields.units.km2' }
      ]
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.areaUnit',
      default: 'ha',
      options: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' },
        { value: 'km2', labelKey: 'quickAdd.fields.units.km2' }
      ]
    },
    // Seeds Source (Consumer Trust field - same as Planting)
    {
      name: 'seeds_source',
      type: 'select',
      labelKey: 'quickAdd.fields.seedsSource',
      helpKey: 'quickAdd.fields.seedsSourceHelp',
      default: 'commercial',
      options: [
        { value: 'certified_organic', labelKey: 'quickAdd.fields.seedsSource.certifiedOrganic' },
        { value: 'farm_saved', labelKey: 'quickAdd.fields.seedsSource.farmSaved' },
        { value: 'local', labelKey: 'quickAdd.fields.seedsSource.local' },
        { value: 'cooperative', labelKey: 'quickAdd.fields.seedsSource.cooperative' },
        { value: 'commercial', labelKey: 'quickAdd.fields.seedsSource.commercial' },
        { value: 'other', labelKey: 'quickAdd.fields.seedsSource.other' }
      ]
    },
    // Yield Quantity with Unit dropdown (Quantity Transplanted)
    {
      name: 'yield_quantity',
      type: 'number',
      labelKey: 'quickAdd.fields.quantityTransplanted',
      helpKey: 'quickAdd.fields.quantityTransplantedHelp',
      min: 0,
      step: 1,
      hasUnitDropdown: true,
      unitFieldName: 'yield_unit',
      unitOptions: [
        { value: 'plants', labelKey: 'quickAdd.fields.yieldUnit.plants' },
        { value: 'seedlings', labelKey: 'quickAdd.fields.yieldUnit.seedlings' },
        { value: 'kg', labelKey: 'quickAdd.fields.yieldUnit.kg' },
        { value: 'lbs', labelKey: 'quickAdd.fields.yieldUnit.lbs' }
      ]
    },
    {
      name: 'yield_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.yieldUnit',
      default: 'plants',
      options: [
        { value: 'plants', labelKey: 'quickAdd.fields.yieldUnit.plants' },
        { value: 'seedlings', labelKey: 'quickAdd.fields.yieldUnit.seedlings' },
        { value: 'kg', labelKey: 'quickAdd.fields.yieldUnit.kg' },
        { value: 'lbs', labelKey: 'quickAdd.fields.yieldUnit.lbs' }
      ]
    },
    // Fuel Type (EPA-verified emission factors)
    {
      name: 'fuel_type',
      type: 'select',
      labelKey: 'quickAdd.fields.fuelType',
      helpKey: 'quickAdd.fields.fuelTypeHelp',
      default: 'diesel',
      options: [
        { value: 'diesel', labelKey: 'quickAdd.fields.fuelType.diesel' },
        { value: 'gasoline', labelKey: 'quickAdd.fields.fuelType.gasoline' },
        { value: 'natural_gas', labelKey: 'quickAdd.fields.fuelType.naturalGas' },
        { value: 'lpg', labelKey: 'quickAdd.fields.fuelType.lpg' },
        { value: 'electric', labelKey: 'quickAdd.fields.fuelType.electric' }
      ]
    },
    // Fuel Consumed with Unit dropdown
    {
      name: 'fuel_consumed',
      type: 'number',
      labelKey: 'quickAdd.fields.fuelConsumed',
      helpKey: 'quickAdd.fields.fuelConsumedHelp',
      default: 2.4,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'fuel_unit',
      unitOptions: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    },
    {
      name: 'fuel_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.fuelUnit',
      default: 'L',
      options: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    },
    // Equipment Operating Hours
    {
      name: 'equipment_hours',
      type: 'number',
      labelKey: 'quickAdd.fields.equipmentHours',
      helpKey: 'quickAdd.fields.equipmentHoursHelp',
      default: 4, // Smart default: typical transplanting equipment operation time
      min: 0,
      step: 0.1
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Cultivation Event (Production Type: CU)
// Aligned with ProductionTab.jsx - Soil cultivation & weed control
export const cultivationFields: QuickEventTypeConfig = {
  templateId: 'cultivation',
  eventType: 'CU',
  quickFields: [
    // Area Covered with Unit dropdown
    {
      name: 'area_covered',
      type: 'number',
      labelKey: 'quickAdd.fields.areaCovered',
      helpKey: 'quickAdd.fields.areaCoveredHelp',
      default: 1,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' },
        { value: 'km2', labelKey: 'quickAdd.fields.units.km2' }
      ]
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.areaUnit',
      default: 'ha',
      options: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' },
        { value: 'km2', labelKey: 'quickAdd.fields.units.km2' }
      ]
    },
    // Equipment Operating Hours
    {
      name: 'equipment_hours',
      type: 'number',
      labelKey: 'quickAdd.fields.equipmentHours',
      helpKey: 'quickAdd.fields.equipmentHoursHelp',
      default: 3,
      min: 0,
      step: 0.1
    },
    // Fuel Type (EPA-verified emission factors)
    {
      name: 'fuel_type',
      type: 'select',
      labelKey: 'quickAdd.fields.fuelType',
      helpKey: 'quickAdd.fields.fuelTypeHelp',
      default: 'diesel',
      options: [
        { value: 'diesel', labelKey: 'quickAdd.fields.fuelType.diesel' },
        { value: 'gasoline', labelKey: 'quickAdd.fields.fuelType.gasoline' },
        { value: 'natural_gas', labelKey: 'quickAdd.fields.fuelType.naturalGas' },
        { value: 'lpg', labelKey: 'quickAdd.fields.fuelType.lpg' },
        { value: 'electric', labelKey: 'quickAdd.fields.fuelType.electric' }
      ]
    },
    // Fuel Consumed with Unit dropdown
    {
      name: 'fuel_consumed',
      type: 'number',
      labelKey: 'quickAdd.fields.fuelConsumed',
      helpKey: 'quickAdd.fields.fuelConsumedHelp',
      default: 3,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'fuel_unit',
      unitOptions: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    },
    {
      name: 'fuel_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.fuelUnit',
      default: 'L',
      options: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Thinning Event (Production Type: TH)
// Aligned with ProductionTab.jsx - Plant spacing optimization
export const thinningFields: QuickEventTypeConfig = {
  templateId: 'thinning',
  eventType: 'TH',
  quickFields: [
    // Area Covered with Unit dropdown
    {
      name: 'area_covered',
      type: 'number',
      labelKey: 'quickAdd.fields.areaCovered',
      helpKey: 'quickAdd.fields.areaCoveredHelp',
      default: 0.5,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' },
        { value: 'km2', labelKey: 'quickAdd.fields.units.km2' }
      ]
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.areaUnit',
      default: 'ha',
      options: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' },
        { value: 'km2', labelKey: 'quickAdd.fields.units.km2' }
      ]
    },
    // Equipment Operating Hours
    {
      name: 'equipment_hours',
      type: 'number',
      labelKey: 'quickAdd.fields.equipmentHours',
      helpKey: 'quickAdd.fields.equipmentHoursHelp',
      default: 4,
      min: 0,
      step: 0.1
    },
    // Fuel Type (EPA-verified emission factors)
    {
      name: 'fuel_type',
      type: 'select',
      labelKey: 'quickAdd.fields.fuelType',
      helpKey: 'quickAdd.fields.fuelTypeHelp',
      default: 'gasoline',
      options: [
        { value: 'diesel', labelKey: 'quickAdd.fields.fuelType.diesel' },
        { value: 'gasoline', labelKey: 'quickAdd.fields.fuelType.gasoline' },
        { value: 'natural_gas', labelKey: 'quickAdd.fields.fuelType.naturalGas' },
        { value: 'lpg', labelKey: 'quickAdd.fields.fuelType.lpg' },
        { value: 'electric', labelKey: 'quickAdd.fields.fuelType.electric' }
      ]
    },
    // Fuel Consumed with Unit dropdown
    {
      name: 'fuel_consumed',
      type: 'number',
      labelKey: 'quickAdd.fields.fuelConsumed',
      helpKey: 'quickAdd.fields.fuelConsumedHelp',
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'fuel_unit',
      unitOptions: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    },
    {
      name: 'fuel_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.fuelUnit',
      default: 'L',
      options: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Equipment Maintenance Event (Production Type: EM)
// Aligned with ProductionTab.jsx - Equipment usage & maintenance
// Sprint 2 Epic 2.1: Equipment merged into Production as "Equipment Maintenance" subtype
export const equipmentMaintenanceFields: QuickEventTypeConfig = {
  templateId: 'equipment_maintenance',
  eventType: 'EM',
  quickFields: [
    // Equipment Type
    {
      name: 'equipment_type',
      type: 'select',
      labelKey: 'quickAdd.fields.equipmentType',
      helpKey: 'quickAdd.fields.equipmentTypeHelp',
      default: 'tractor',
      required: true,
      options: [
        { value: 'tractor', labelKey: 'quickAdd.fields.equipmentType.tractor' },
        { value: 'harvester', labelKey: 'quickAdd.fields.equipmentType.harvester' },
        { value: 'sprayer', labelKey: 'quickAdd.fields.equipmentType.sprayer' },
        { value: 'irrigation_pump', labelKey: 'quickAdd.fields.equipmentType.irrigationPump' },
        { value: 'tillage', labelKey: 'quickAdd.fields.equipmentType.tillage' },
        { value: 'other', labelKey: 'quickAdd.fields.equipmentType.other' }
      ]
    },
    // Equipment Operation Type
    {
      name: 'equipment_operation_type',
      type: 'select',
      labelKey: 'quickAdd.fields.equipmentOperationType',
      helpKey: 'quickAdd.fields.equipmentOperationTypeHelp',
      default: 'routine_maintenance',
      required: true,
      options: [
        { value: 'routine_maintenance', labelKey: 'quickAdd.fields.equipmentOperationType.routineMaintenance' },
        { value: 'repair', labelKey: 'quickAdd.fields.equipmentOperationType.repair' },
        { value: 'calibration', labelKey: 'quickAdd.fields.equipmentOperationType.calibration' },
        { value: 'cleaning', labelKey: 'quickAdd.fields.equipmentOperationType.cleaning' },
        { value: 'inspection', labelKey: 'quickAdd.fields.equipmentOperationType.inspection' }
      ]
    },
    // Equipment Operating Hours
    {
      name: 'equipment_hours',
      type: 'number',
      labelKey: 'quickAdd.fields.equipmentHours',
      helpKey: 'quickAdd.fields.equipmentHoursHelp',
      default: 2,
      min: 0,
      step: 0.1
    },
    // Fuel Type (EPA-verified emission factors)
    {
      name: 'fuel_type',
      type: 'select',
      labelKey: 'quickAdd.fields.fuelType',
      helpKey: 'quickAdd.fields.fuelTypeHelp',
      default: 'diesel',
      options: [
        { value: 'diesel', labelKey: 'quickAdd.fields.fuelType.diesel' },
        { value: 'gasoline', labelKey: 'quickAdd.fields.fuelType.gasoline' },
        { value: 'natural_gas', labelKey: 'quickAdd.fields.fuelType.naturalGas' },
        { value: 'lpg', labelKey: 'quickAdd.fields.fuelType.lpg' },
        { value: 'electric', labelKey: 'quickAdd.fields.fuelType.electric' }
      ]
    },
    // Fuel Consumed with Unit dropdown
    {
      name: 'fuel_consumed',
      type: 'number',
      labelKey: 'quickAdd.fields.fuelConsumed',
      helpKey: 'quickAdd.fields.fuelConsumedHelp',
      required: true,
      default: 5, // Smart default: typical maintenance fuel consumption (L)
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'fuel_unit',
      unitOptions: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    },
    {
      name: 'fuel_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.fuelUnit',
      default: 'L',
      options: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    },
    // Operation Efficiency
    {
      name: 'operation_efficiency',
      type: 'select',
      labelKey: 'quickAdd.fields.operationEfficiency',
      helpKey: 'quickAdd.fields.operationEfficiencyHelp',
      default: 'normal',
      options: [
        { value: 'high', labelKey: 'quickAdd.fields.operationEfficiency.high' },
        { value: 'normal', labelKey: 'quickAdd.fields.operationEfficiency.normal' },
        { value: 'low', labelKey: 'quickAdd.fields.operationEfficiency.low' }
      ]
    },
    // Area Covered (Optional for Equipment Maintenance)
    {
      name: 'area_covered',
      type: 'number',
      labelKey: 'quickAdd.fields.areaCovered',
      helpKey: 'quickAdd.fields.areaCoveredHelpOptional',
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' },
        { value: 'km2', labelKey: 'quickAdd.fields.units.km2' }
      ]
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.areaUnit',
      default: 'ha',
      options: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' },
        { value: 'km2', labelKey: 'quickAdd.fields.units.km2' }
      ]
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// ============================================================================
// CHEMICAL EVENT TYPES (from ChemicalTab-ENHANCED.jsx)
// ============================================================================

// Fertilization Event (Chemical Type: FE)
// Aligned with ChemicalTab-ENHANCED.jsx
export const fertilizationFields: QuickEventTypeConfig = {
  templateId: 'fertilization',
  eventType: 'FE',
  quickFields: [
    // Chemical Subtype (critical for emission factor selection - 21x variance!)
    {
      name: 'chemical_subtype',
      type: 'select',
      labelKey: 'quickAdd.fields.chemicalSubtype',
      helpKey: 'quickAdd.fields.chemicalSubtypeHelp',
      default: 'synthetic_fertilizer',
      required: true,
      options: [
        { value: 'synthetic_fertilizer', labelKey: 'quickAdd.fields.chemicalSubtype.syntheticFertilizer' },
        { value: 'organic_fertilizer', labelKey: 'quickAdd.fields.chemicalSubtype.organicFertilizer' },
        { value: 'slow_release_fertilizer', labelKey: 'quickAdd.fields.chemicalSubtype.slowReleaseFertilizer' }
      ]
    },
    // Commercial Name
    {
      name: 'commercial_name',
      type: 'text',
      labelKey: 'quickAdd.fields.commercialName',
      helpKey: 'quickAdd.fields.commercialNameHelp',
      placeholderKey: 'quickAdd.fields.commercialNamePlaceholder',
      required: true
    },
    // Active Ingredient
    {
      name: 'active_ingredient',
      type: 'text',
      labelKey: 'quickAdd.fields.activeIngredient',
      helpKey: 'quickAdd.fields.activeIngredientHelp',
      placeholderKey: 'quickAdd.fields.activeIngredientPlaceholder'
    },
    // Concentration (NPK Ratio for fertilizers) - with validation
    {
      name: 'concentration',
      type: 'text',
      labelKey: 'quickAdd.fields.concentration',
      helpKey: 'quickAdd.fields.concentrationHelpFertilizer',
      placeholderKey: 'quickAdd.fields.concentrationPlaceholderNPK',
      required: true,
      validationType: 'concentration',
      default: '10-10-10' // Smart default: balanced NPK for general-purpose fertilization
    },
    // Volume Applied with Unit dropdown
    {
      name: 'volume_applied',
      type: 'number',
      labelKey: 'quickAdd.fields.volumeApplied',
      helpKey: 'quickAdd.fields.volumeAppliedHelp',
      default: 100,
      required: true,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'volume_unit',
      unitOptions: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'lb', labelKey: 'quickAdd.fields.units.lb' }
      ]
    },
    {
      name: 'volume_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.volumeUnit',
      default: 'kg',
      options: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'lb', labelKey: 'quickAdd.fields.units.lb' }
      ]
    },
    // Area Treated with Unit dropdown
    {
      name: 'area_treated',
      type: 'number',
      labelKey: 'quickAdd.fields.areaTreated',
      helpKey: 'quickAdd.fields.areaTreatedHelp',
      default: 1,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' }
      ]
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.areaUnit',
      default: 'ha',
      options: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' }
      ]
    },
    // Application Method (USDA NRCS Standard Methods for Fertilizer)
    {
      name: 'application_method',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationMethod',
      helpKey: 'quickAdd.fields.applicationMethodHelp',
      default: 'broadcast',
      required: true,
      options: [
        { value: 'broadcast', labelKey: 'quickAdd.fields.applicationMethod.broadcast' },
        { value: 'banded', labelKey: 'quickAdd.fields.applicationMethod.banded' },
        { value: 'subsurface', labelKey: 'quickAdd.fields.applicationMethod.subsurface' },
        { value: 'fertigation', labelKey: 'quickAdd.fields.applicationMethod.fertigation' },
        { value: 'foliar', labelKey: 'quickAdd.fields.applicationMethod.foliar' }
      ]
    },
    // Weather Conditions
    {
      name: 'weather_conditions',
      type: 'select',
      labelKey: 'quickAdd.fields.weatherConditions',
      helpKey: 'quickAdd.fields.weatherConditionsHelp',
      options: [
        { value: 'calm_dry', labelKey: 'quickAdd.fields.weatherConditions.calmDry' },
        { value: 'light_wind', labelKey: 'quickAdd.fields.weatherConditions.lightWind' },
        { value: 'humid', labelKey: 'quickAdd.fields.weatherConditions.humid' },
        { value: 'windy', labelKey: 'quickAdd.fields.weatherConditions.windy' }
      ]
    },
    // Application Timing
    {
      name: 'application_timing',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationTiming',
      helpKey: 'quickAdd.fields.applicationTimingHelp',
      options: [
        { value: 'pre_plant', labelKey: 'quickAdd.fields.applicationTiming.prePlant' },
        { value: 'post_emergence', labelKey: 'quickAdd.fields.applicationTiming.postEmergence' },
        { value: 'flowering', labelKey: 'quickAdd.fields.applicationTiming.flowering' },
        { value: 'fruit_development', labelKey: 'quickAdd.fields.applicationTiming.fruitDevelopment' },
        { value: 'harvest', labelKey: 'quickAdd.fields.applicationTiming.harvest' }
      ]
    },
    // Application Fuel Type (for application equipment)
    {
      name: 'application_fuel_type',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationFuelType',
      helpKey: 'quickAdd.fields.applicationFuelTypeHelp',
      options: [
        { value: 'diesel', labelKey: 'quickAdd.fields.fuelType.diesel' },
        { value: 'gasoline', labelKey: 'quickAdd.fields.fuelType.gasoline' },
        { value: 'natural_gas', labelKey: 'quickAdd.fields.fuelType.naturalGas' },
        { value: 'lpg', labelKey: 'quickAdd.fields.fuelType.lpg' },
        { value: 'electric', labelKey: 'quickAdd.fields.fuelType.electric' }
      ]
    },
    // Application Fuel Consumed with Unit dropdown
    {
      name: 'application_fuel_consumed',
      type: 'number',
      labelKey: 'quickAdd.fields.applicationFuelConsumed',
      helpKey: 'quickAdd.fields.applicationFuelConsumedHelp',
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'application_fuel_unit',
      unitOptions: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    },
    {
      name: 'application_fuel_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationFuelUnit',
      default: 'gal',
      options: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Pest Control Event (Chemical Type: PE)
// Aligned with ChemicalTab-ENHANCED.jsx
export const pestControlFields: QuickEventTypeConfig = {
  templateId: 'pest_control',
  eventType: 'PE',
  quickFields: [
    // Chemical Subtype
    {
      name: 'chemical_subtype',
      type: 'select',
      labelKey: 'quickAdd.fields.chemicalSubtype',
      helpKey: 'quickAdd.fields.chemicalSubtypeHelp',
      default: 'synthetic_pesticide',
      required: true,
      options: [
        { value: 'synthetic_pesticide', labelKey: 'quickAdd.fields.chemicalSubtype.syntheticPesticide' },
        { value: 'organic_pesticide', labelKey: 'quickAdd.fields.chemicalSubtype.organicPesticide' },
        { value: 'biological_pesticide', labelKey: 'quickAdd.fields.chemicalSubtype.biologicalPesticide' }
      ]
    },
    // Commercial Name
    {
      name: 'commercial_name',
      type: 'text',
      labelKey: 'quickAdd.fields.commercialName',
      helpKey: 'quickAdd.fields.commercialNameHelp',
      placeholderKey: 'quickAdd.fields.commercialNamePlaceholder',
      required: true
    },
    // Active Ingredient
    {
      name: 'active_ingredient',
      type: 'text',
      labelKey: 'quickAdd.fields.activeIngredient',
      helpKey: 'quickAdd.fields.activeIngredientHelp',
      placeholderKey: 'quickAdd.fields.activeIngredientPlaceholder'
    },
    // Concentration (percentage for pesticides) - with validation
    {
      name: 'concentration',
      type: 'text',
      labelKey: 'quickAdd.fields.concentration',
      helpKey: 'quickAdd.fields.concentrationHelpPesticide',
      placeholderKey: 'quickAdd.fields.concentrationPlaceholderPercent',
      required: true,
      validationType: 'concentration',
      default: '50%' // Smart default: typical pesticide active ingredient concentration
    },
    // Volume Applied with Unit dropdown
    {
      name: 'volume_applied',
      type: 'number',
      labelKey: 'quickAdd.fields.volumeApplied',
      helpKey: 'quickAdd.fields.volumeAppliedHelp',
      default: 50,
      required: true,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'volume_unit',
      unitOptions: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'lb', labelKey: 'quickAdd.fields.units.lb' }
      ]
    },
    {
      name: 'volume_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.volumeUnit',
      default: 'L',
      options: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'lb', labelKey: 'quickAdd.fields.units.lb' }
      ]
    },
    // Area Treated with Unit dropdown
    {
      name: 'area_treated',
      type: 'number',
      labelKey: 'quickAdd.fields.areaTreated',
      helpKey: 'quickAdd.fields.areaTreatedHelp',
      default: 1,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' }
      ]
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.areaUnit',
      default: 'ha',
      options: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' }
      ]
    },
    // Application Method (EPA Standard Methods for Pesticide)
    {
      name: 'application_method',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationMethod',
      helpKey: 'quickAdd.fields.applicationMethodHelp',
      default: 'ground_spray',
      required: true,
      options: [
        { value: 'ground_spray', labelKey: 'quickAdd.fields.applicationMethod.groundSpray' },
        { value: 'chemigation', labelKey: 'quickAdd.fields.applicationMethod.chemigation' },
        { value: 'seed_treatment', labelKey: 'quickAdd.fields.applicationMethod.seedTreatment' },
        { value: 'soil_incorporation', labelKey: 'quickAdd.fields.applicationMethod.soilIncorporation' }
      ]
    },
    // Target Pest/Disease
    {
      name: 'target_pest_disease',
      type: 'text',
      labelKey: 'quickAdd.fields.targetPestDisease',
      helpKey: 'quickAdd.fields.targetPestDiseaseHelp',
      placeholderKey: 'quickAdd.fields.targetPestDiseasePlaceholder'
    },
    // Weather Conditions
    {
      name: 'weather_conditions',
      type: 'select',
      labelKey: 'quickAdd.fields.weatherConditions',
      helpKey: 'quickAdd.fields.weatherConditionsHelp',
      options: [
        { value: 'calm_dry', labelKey: 'quickAdd.fields.weatherConditions.calmDry' },
        { value: 'light_wind', labelKey: 'quickAdd.fields.weatherConditions.lightWind' },
        { value: 'humid', labelKey: 'quickAdd.fields.weatherConditions.humid' },
        { value: 'windy', labelKey: 'quickAdd.fields.weatherConditions.windy' }
      ]
    },
    // Application Timing
    {
      name: 'application_timing',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationTiming',
      helpKey: 'quickAdd.fields.applicationTimingHelp',
      options: [
        { value: 'pre_plant', labelKey: 'quickAdd.fields.applicationTiming.prePlant' },
        { value: 'post_emergence', labelKey: 'quickAdd.fields.applicationTiming.postEmergence' },
        { value: 'flowering', labelKey: 'quickAdd.fields.applicationTiming.flowering' },
        { value: 'fruit_development', labelKey: 'quickAdd.fields.applicationTiming.fruitDevelopment' },
        { value: 'harvest', labelKey: 'quickAdd.fields.applicationTiming.harvest' }
      ]
    },
    // Organic Approved (Consumer Trust)
    {
      name: 'organic_approved',
      type: 'select',
      labelKey: 'quickAdd.fields.organicApproved',
      helpKey: 'quickAdd.fields.organicApprovedHelp',
      options: [
        { value: 'omri_listed', labelKey: 'quickAdd.fields.organicApproved.omriListed' },
        { value: 'usda_nop_approved', labelKey: 'quickAdd.fields.organicApproved.usdaNopApproved' },
        { value: 'organic_equivalent', labelKey: 'quickAdd.fields.organicApproved.organicEquivalent' },
        { value: 'not_organic', labelKey: 'quickAdd.fields.organicApproved.notOrganic' },
        { value: 'transitional', labelKey: 'quickAdd.fields.organicApproved.transitional' }
      ]
    },
    // Buffer Zone
    {
      name: 'buffer_zone_meters',
      type: 'number',
      labelKey: 'quickAdd.fields.bufferZone',
      helpKey: 'quickAdd.fields.bufferZoneHelp',
      min: 0,
      step: 1,
      unitKey: 'quickAdd.fields.units.meters'
    },
    // EPA WPS Compliance Fields
    {
      name: 'applicator_name',
      type: 'text',
      labelKey: 'quickAdd.fields.applicatorName',
      helpKey: 'quickAdd.fields.applicatorNameHelp',
      placeholderKey: 'quickAdd.fields.applicatorNamePlaceholder'
    },
    {
      name: 'epa_registration_number',
      type: 'text',
      labelKey: 'quickAdd.fields.epaRegistrationNumber',
      helpKey: 'quickAdd.fields.epaRegistrationNumberHelp',
      placeholderKey: 'quickAdd.fields.epaRegistrationNumberPlaceholder'
    },
    {
      name: 'rei_hours',
      type: 'number',
      labelKey: 'quickAdd.fields.reiHours',
      helpKey: 'quickAdd.fields.reiHoursHelp',
      min: 0,
      step: 1,
      unitKey: 'quickAdd.fields.units.hours'
    },
    {
      name: 'phi_days',
      type: 'number',
      labelKey: 'quickAdd.fields.phiDays',
      helpKey: 'quickAdd.fields.phiDaysHelp',
      min: 0,
      step: 1,
      unitKey: 'quickAdd.fields.units.days'
    },
    // Application Fuel
    {
      name: 'application_fuel_type',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationFuelType',
      helpKey: 'quickAdd.fields.applicationFuelTypeHelp',
      options: [
        { value: 'diesel', labelKey: 'quickAdd.fields.fuelType.diesel' },
        { value: 'gasoline', labelKey: 'quickAdd.fields.fuelType.gasoline' },
        { value: 'natural_gas', labelKey: 'quickAdd.fields.fuelType.naturalGas' },
        { value: 'lpg', labelKey: 'quickAdd.fields.fuelType.lpg' },
        { value: 'electric', labelKey: 'quickAdd.fields.fuelType.electric' }
      ]
    },
    {
      name: 'application_fuel_consumed',
      type: 'number',
      labelKey: 'quickAdd.fields.applicationFuelConsumed',
      helpKey: 'quickAdd.fields.applicationFuelConsumedHelp',
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'application_fuel_unit',
      unitOptions: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    },
    {
      name: 'application_fuel_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationFuelUnit',
      default: 'gal',
      options: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Herbicide Event (Chemical Type: HE)
// Aligned with ChemicalTab-ENHANCED.jsx
export const herbicideFields: QuickEventTypeConfig = {
  templateId: 'herbicide',
  eventType: 'HE',
  quickFields: [
    // Chemical Subtype
    {
      name: 'chemical_subtype',
      type: 'select',
      labelKey: 'quickAdd.fields.chemicalSubtype',
      helpKey: 'quickAdd.fields.chemicalSubtypeHelp',
      default: 'synthetic_herbicide',
      required: true,
      options: [
        { value: 'synthetic_herbicide', labelKey: 'quickAdd.fields.chemicalSubtype.syntheticHerbicide' },
        { value: 'organic_herbicide', labelKey: 'quickAdd.fields.chemicalSubtype.organicHerbicide' }
      ]
    },
    // Commercial Name
    {
      name: 'commercial_name',
      type: 'text',
      labelKey: 'quickAdd.fields.commercialName',
      helpKey: 'quickAdd.fields.commercialNameHelp',
      placeholderKey: 'quickAdd.fields.commercialNamePlaceholder',
      required: true
    },
    // Active Ingredient
    {
      name: 'active_ingredient',
      type: 'text',
      labelKey: 'quickAdd.fields.activeIngredient',
      helpKey: 'quickAdd.fields.activeIngredientHelp',
      placeholderKey: 'quickAdd.fields.activeIngredientPlaceholder'
    },
    // Concentration (percentage for herbicides) - with validation
    {
      name: 'concentration',
      type: 'text',
      labelKey: 'quickAdd.fields.concentration',
      helpKey: 'quickAdd.fields.concentrationHelpHerbicide',
      placeholderKey: 'quickAdd.fields.concentrationPlaceholderPercent',
      required: true,
      validationType: 'concentration',
      default: '50%' // Smart default: typical herbicide active ingredient concentration
    },
    // Volume Applied with Unit dropdown
    {
      name: 'volume_applied',
      type: 'number',
      labelKey: 'quickAdd.fields.volumeApplied',
      helpKey: 'quickAdd.fields.volumeAppliedHelp',
      default: 50,
      required: true,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'volume_unit',
      unitOptions: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'lb', labelKey: 'quickAdd.fields.units.lb' }
      ]
    },
    {
      name: 'volume_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.volumeUnit',
      default: 'L',
      options: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'lb', labelKey: 'quickAdd.fields.units.lb' }
      ]
    },
    // Area Treated with Unit dropdown
    {
      name: 'area_treated',
      type: 'number',
      labelKey: 'quickAdd.fields.areaTreated',
      helpKey: 'quickAdd.fields.areaTreatedHelp',
      default: 1,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' }
      ]
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.areaUnit',
      default: 'ha',
      options: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' }
      ]
    },
    // Application Method (EPA Standard Methods for Herbicide)
    {
      name: 'application_method',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationMethod',
      helpKey: 'quickAdd.fields.applicationMethodHelp',
      default: 'ground_spray',
      required: true,
      options: [
        { value: 'ground_spray', labelKey: 'quickAdd.fields.applicationMethod.groundSpray' },
        { value: 'chemigation', labelKey: 'quickAdd.fields.applicationMethod.chemigation' },
        { value: 'seed_treatment', labelKey: 'quickAdd.fields.applicationMethod.seedTreatment' },
        { value: 'soil_incorporation', labelKey: 'quickAdd.fields.applicationMethod.soilIncorporation' }
      ]
    },
    // Target Pest/Disease (for weed identification)
    {
      name: 'target_pest_disease',
      type: 'text',
      labelKey: 'quickAdd.fields.targetPestDisease',
      helpKey: 'quickAdd.fields.targetPestDiseaseHelpWeed',
      placeholderKey: 'quickAdd.fields.targetPestDiseasePlaceholderWeed'
    },
    // Weather Conditions
    {
      name: 'weather_conditions',
      type: 'select',
      labelKey: 'quickAdd.fields.weatherConditions',
      helpKey: 'quickAdd.fields.weatherConditionsHelp',
      options: [
        { value: 'calm_dry', labelKey: 'quickAdd.fields.weatherConditions.calmDry' },
        { value: 'light_wind', labelKey: 'quickAdd.fields.weatherConditions.lightWind' },
        { value: 'humid', labelKey: 'quickAdd.fields.weatherConditions.humid' },
        { value: 'windy', labelKey: 'quickAdd.fields.weatherConditions.windy' }
      ]
    },
    // Application Timing
    {
      name: 'application_timing',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationTiming',
      helpKey: 'quickAdd.fields.applicationTimingHelp',
      options: [
        { value: 'pre_plant', labelKey: 'quickAdd.fields.applicationTiming.prePlant' },
        { value: 'post_emergence', labelKey: 'quickAdd.fields.applicationTiming.postEmergence' },
        { value: 'flowering', labelKey: 'quickAdd.fields.applicationTiming.flowering' },
        { value: 'fruit_development', labelKey: 'quickAdd.fields.applicationTiming.fruitDevelopment' },
        { value: 'harvest', labelKey: 'quickAdd.fields.applicationTiming.harvest' }
      ]
    },
    // Organic Approved (Consumer Trust)
    {
      name: 'organic_approved',
      type: 'select',
      labelKey: 'quickAdd.fields.organicApproved',
      helpKey: 'quickAdd.fields.organicApprovedHelp',
      options: [
        { value: 'omri_listed', labelKey: 'quickAdd.fields.organicApproved.omriListed' },
        { value: 'usda_nop_approved', labelKey: 'quickAdd.fields.organicApproved.usdaNopApproved' },
        { value: 'organic_equivalent', labelKey: 'quickAdd.fields.organicApproved.organicEquivalent' },
        { value: 'not_organic', labelKey: 'quickAdd.fields.organicApproved.notOrganic' },
        { value: 'transitional', labelKey: 'quickAdd.fields.organicApproved.transitional' }
      ]
    },
    // Buffer Zone
    {
      name: 'buffer_zone_meters',
      type: 'number',
      labelKey: 'quickAdd.fields.bufferZone',
      helpKey: 'quickAdd.fields.bufferZoneHelp',
      min: 0,
      step: 1,
      unitKey: 'quickAdd.fields.units.meters'
    },
    // EPA WPS Compliance Fields
    {
      name: 'applicator_name',
      type: 'text',
      labelKey: 'quickAdd.fields.applicatorName',
      helpKey: 'quickAdd.fields.applicatorNameHelp',
      placeholderKey: 'quickAdd.fields.applicatorNamePlaceholder'
    },
    {
      name: 'epa_registration_number',
      type: 'text',
      labelKey: 'quickAdd.fields.epaRegistrationNumber',
      helpKey: 'quickAdd.fields.epaRegistrationNumberHelp',
      placeholderKey: 'quickAdd.fields.epaRegistrationNumberPlaceholder'
    },
    {
      name: 'rei_hours',
      type: 'number',
      labelKey: 'quickAdd.fields.reiHours',
      helpKey: 'quickAdd.fields.reiHoursHelp',
      min: 0,
      step: 1,
      unitKey: 'quickAdd.fields.units.hours'
    },
    {
      name: 'phi_days',
      type: 'number',
      labelKey: 'quickAdd.fields.phiDays',
      helpKey: 'quickAdd.fields.phiDaysHelp',
      min: 0,
      step: 1,
      unitKey: 'quickAdd.fields.units.days'
    },
    // Application Fuel
    {
      name: 'application_fuel_type',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationFuelType',
      helpKey: 'quickAdd.fields.applicationFuelTypeHelp',
      options: [
        { value: 'diesel', labelKey: 'quickAdd.fields.fuelType.diesel' },
        { value: 'gasoline', labelKey: 'quickAdd.fields.fuelType.gasoline' },
        { value: 'natural_gas', labelKey: 'quickAdd.fields.fuelType.naturalGas' },
        { value: 'lpg', labelKey: 'quickAdd.fields.fuelType.lpg' },
        { value: 'electric', labelKey: 'quickAdd.fields.fuelType.electric' }
      ]
    },
    {
      name: 'application_fuel_consumed',
      type: 'number',
      labelKey: 'quickAdd.fields.applicationFuelConsumed',
      helpKey: 'quickAdd.fields.applicationFuelConsumedHelp',
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'application_fuel_unit',
      unitOptions: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    },
    {
      name: 'application_fuel_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationFuelUnit',
      default: 'gal',
      options: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Fungicide Event (Chemical Type: FU)
// Aligned with ChemicalTab-ENHANCED.jsx
export const fungicideFields: QuickEventTypeConfig = {
  templateId: 'fungicide',
  eventType: 'FU',
  quickFields: [
    // Chemical Subtype
    {
      name: 'chemical_subtype',
      type: 'select',
      labelKey: 'quickAdd.fields.chemicalSubtype',
      helpKey: 'quickAdd.fields.chemicalSubtypeHelp',
      default: 'synthetic_fungicide',
      required: true,
      options: [
        { value: 'synthetic_fungicide', labelKey: 'quickAdd.fields.chemicalSubtype.syntheticFungicide' },
        { value: 'copper_fungicide', labelKey: 'quickAdd.fields.chemicalSubtype.copperFungicide' },
        { value: 'sulfur_fungicide', labelKey: 'quickAdd.fields.chemicalSubtype.sulfurFungicide' },
        { value: 'biological_fungicide', labelKey: 'quickAdd.fields.chemicalSubtype.biologicalFungicide' }
      ]
    },
    // Commercial Name
    {
      name: 'commercial_name',
      type: 'text',
      labelKey: 'quickAdd.fields.commercialName',
      helpKey: 'quickAdd.fields.commercialNameHelp',
      placeholderKey: 'quickAdd.fields.commercialNamePlaceholder',
      required: true
    },
    // Active Ingredient
    {
      name: 'active_ingredient',
      type: 'text',
      labelKey: 'quickAdd.fields.activeIngredient',
      helpKey: 'quickAdd.fields.activeIngredientHelp',
      placeholderKey: 'quickAdd.fields.activeIngredientPlaceholder'
    },
    // Concentration (percentage for fungicides) - with validation
    {
      name: 'concentration',
      type: 'text',
      labelKey: 'quickAdd.fields.concentration',
      helpKey: 'quickAdd.fields.concentrationHelpFungicide',
      placeholderKey: 'quickAdd.fields.concentrationPlaceholderPercent',
      required: true,
      validationType: 'concentration',
      default: '50%' // Smart default: typical fungicide active ingredient concentration
    },
    // Volume Applied with Unit dropdown
    {
      name: 'volume_applied',
      type: 'number',
      labelKey: 'quickAdd.fields.volumeApplied',
      helpKey: 'quickAdd.fields.volumeAppliedHelp',
      default: 30,
      required: true,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'volume_unit',
      unitOptions: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'lb', labelKey: 'quickAdd.fields.units.lb' }
      ]
    },
    {
      name: 'volume_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.volumeUnit',
      default: 'L',
      options: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'lb', labelKey: 'quickAdd.fields.units.lb' }
      ]
    },
    // Area Treated with Unit dropdown
    {
      name: 'area_treated',
      type: 'number',
      labelKey: 'quickAdd.fields.areaTreated',
      helpKey: 'quickAdd.fields.areaTreatedHelp',
      default: 1,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' }
      ]
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.areaUnit',
      default: 'ha',
      options: [
        { value: 'ha', labelKey: 'quickAdd.fields.units.ha' },
        { value: 'acres', labelKey: 'quickAdd.fields.units.acres' },
        { value: 'm2', labelKey: 'quickAdd.fields.units.m2' }
      ]
    },
    // Application Method (EPA Standard Methods for Fungicide)
    {
      name: 'application_method',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationMethod',
      helpKey: 'quickAdd.fields.applicationMethodHelp',
      default: 'ground_spray',
      required: true,
      options: [
        { value: 'ground_spray', labelKey: 'quickAdd.fields.applicationMethod.groundSpray' },
        { value: 'chemigation', labelKey: 'quickAdd.fields.applicationMethod.chemigation' },
        { value: 'seed_treatment', labelKey: 'quickAdd.fields.applicationMethod.seedTreatment' },
        { value: 'soil_incorporation', labelKey: 'quickAdd.fields.applicationMethod.soilIncorporation' }
      ]
    },
    // Target Pest/Disease
    {
      name: 'target_pest_disease',
      type: 'text',
      labelKey: 'quickAdd.fields.targetPestDisease',
      helpKey: 'quickAdd.fields.targetPestDiseaseHelpFungus',
      placeholderKey: 'quickAdd.fields.targetPestDiseasePlaceholderFungus'
    },
    // Weather Conditions
    {
      name: 'weather_conditions',
      type: 'select',
      labelKey: 'quickAdd.fields.weatherConditions',
      helpKey: 'quickAdd.fields.weatherConditionsHelp',
      options: [
        { value: 'calm_dry', labelKey: 'quickAdd.fields.weatherConditions.calmDry' },
        { value: 'light_wind', labelKey: 'quickAdd.fields.weatherConditions.lightWind' },
        { value: 'humid', labelKey: 'quickAdd.fields.weatherConditions.humid' },
        { value: 'windy', labelKey: 'quickAdd.fields.weatherConditions.windy' }
      ]
    },
    // Application Timing
    {
      name: 'application_timing',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationTiming',
      helpKey: 'quickAdd.fields.applicationTimingHelp',
      options: [
        { value: 'pre_plant', labelKey: 'quickAdd.fields.applicationTiming.prePlant' },
        { value: 'post_emergence', labelKey: 'quickAdd.fields.applicationTiming.postEmergence' },
        { value: 'flowering', labelKey: 'quickAdd.fields.applicationTiming.flowering' },
        { value: 'fruit_development', labelKey: 'quickAdd.fields.applicationTiming.fruitDevelopment' },
        { value: 'harvest', labelKey: 'quickAdd.fields.applicationTiming.harvest' }
      ]
    },
    // Organic Approved (Consumer Trust)
    {
      name: 'organic_approved',
      type: 'select',
      labelKey: 'quickAdd.fields.organicApproved',
      helpKey: 'quickAdd.fields.organicApprovedHelp',
      options: [
        { value: 'omri_listed', labelKey: 'quickAdd.fields.organicApproved.omriListed' },
        { value: 'usda_nop_approved', labelKey: 'quickAdd.fields.organicApproved.usdaNopApproved' },
        { value: 'organic_equivalent', labelKey: 'quickAdd.fields.organicApproved.organicEquivalent' },
        { value: 'not_organic', labelKey: 'quickAdd.fields.organicApproved.notOrganic' },
        { value: 'transitional', labelKey: 'quickAdd.fields.organicApproved.transitional' }
      ]
    },
    // Buffer Zone
    {
      name: 'buffer_zone_meters',
      type: 'number',
      labelKey: 'quickAdd.fields.bufferZone',
      helpKey: 'quickAdd.fields.bufferZoneHelp',
      min: 0,
      step: 1,
      unitKey: 'quickAdd.fields.units.meters'
    },
    // EPA WPS Compliance Fields
    {
      name: 'applicator_name',
      type: 'text',
      labelKey: 'quickAdd.fields.applicatorName',
      helpKey: 'quickAdd.fields.applicatorNameHelp',
      placeholderKey: 'quickAdd.fields.applicatorNamePlaceholder'
    },
    {
      name: 'epa_registration_number',
      type: 'text',
      labelKey: 'quickAdd.fields.epaRegistrationNumber',
      helpKey: 'quickAdd.fields.epaRegistrationNumberHelp',
      placeholderKey: 'quickAdd.fields.epaRegistrationNumberPlaceholder'
    },
    {
      name: 'rei_hours',
      type: 'number',
      labelKey: 'quickAdd.fields.reiHours',
      helpKey: 'quickAdd.fields.reiHoursHelp',
      min: 0,
      step: 1,
      unitKey: 'quickAdd.fields.units.hours'
    },
    {
      name: 'phi_days',
      type: 'number',
      labelKey: 'quickAdd.fields.phiDays',
      helpKey: 'quickAdd.fields.phiDaysHelp',
      min: 0,
      step: 1,
      unitKey: 'quickAdd.fields.units.days'
    },
    // Application Fuel
    {
      name: 'application_fuel_type',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationFuelType',
      helpKey: 'quickAdd.fields.applicationFuelTypeHelp',
      options: [
        { value: 'diesel', labelKey: 'quickAdd.fields.fuelType.diesel' },
        { value: 'gasoline', labelKey: 'quickAdd.fields.fuelType.gasoline' },
        { value: 'natural_gas', labelKey: 'quickAdd.fields.fuelType.naturalGas' },
        { value: 'lpg', labelKey: 'quickAdd.fields.fuelType.lpg' },
        { value: 'electric', labelKey: 'quickAdd.fields.fuelType.electric' }
      ]
    },
    {
      name: 'application_fuel_consumed',
      type: 'number',
      labelKey: 'quickAdd.fields.applicationFuelConsumed',
      helpKey: 'quickAdd.fields.applicationFuelConsumedHelp',
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'application_fuel_unit',
      unitOptions: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    },
    {
      name: 'application_fuel_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationFuelUnit',
      default: 'gal',
      options: [
        { value: 'L', labelKey: 'quickAdd.fields.units.L' },
        { value: 'gal', labelKey: 'quickAdd.fields.units.gal' },
        { value: 'kg', labelKey: 'quickAdd.fields.units.kg' },
        { value: 'kWh', labelKey: 'quickAdd.fields.units.kWh' }
      ]
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// ============================================================================
// GENERAL EVENT TYPE
// ============================================================================

// General Documentation Event (No Carbon Impact)
export const generalDocumentationFields: QuickEventTypeConfig = {
  templateId: 'general_documentation',
  eventType: 'GE', // General event type
  excludeFromCarbonCalculation: true,
  quickFields: [
    {
      name: 'activity_type',
      type: 'select',
      labelKey: 'quickAdd.fields.activityType',
      helpKey: 'quickAdd.fields.activityTypeHelp',
      default: 'inspection',
      options: [
        { value: 'inspection', labelKey: 'quickAdd.fields.activityType.inspection' },
        { value: 'certification', labelKey: 'quickAdd.fields.activityType.certification' },
        { value: 'training', labelKey: 'quickAdd.fields.activityType.training' },
        { value: 'maintenance', labelKey: 'quickAdd.fields.activityType.maintenance' },
        { value: 'other', labelKey: 'quickAdd.fields.activityType.other' }
      ]
    },
    {
      name: 'notes',
      type: 'textarea',
      labelKey: 'quickAdd.fields.notes',
      helpKey: 'quickAdd.fields.notesHelp',
      placeholderKey: 'quickAdd.fields.notesPlaceholder'
    }
  ]
};

// ============================================================================
// MAP AND UTILITY FUNCTIONS
// ============================================================================

// Map of all event type configurations
export const quickEventFieldsMap: Record<string, QuickEventTypeConfig> = {
  // Production event types (8 total)
  irrigation: irrigationFields,
  harvest: harvestFields,
  planting: plantingFields,
  pruning: pruningFields,
  transplanting: transplantingFields,
  cultivation: cultivationFields,
  thinning: thinningFields,
  equipment_maintenance: equipmentMaintenanceFields,
  // Chemical event types (4 total)
  fertilization: fertilizationFields,
  pest_control: pestControlFields,
  herbicide: herbicideFields,
  fungicide: fungicideFields,
  // General event type
  general_documentation: generalDocumentationFields,
  // Alias for bloom nutrition (same as fertilization)
  bloom_nutrition: {
    ...fertilizationFields,
    templateId: 'bloom_nutrition'
  }
};

/**
 * Get field configuration for a specific template ID
 */
export function getQuickEventFields(templateId: string): QuickEventTypeConfig | null {
  // Handle database templates (prefixed with 'db-')
  if (templateId.startsWith('db-')) {
    // Database templates use their event_type to determine fields
    // This will be handled by the component based on the template's type property
    return null;
  }

  return quickEventFieldsMap[templateId] || null;
}

/**
 * Get default values for a specific template
 */
export function getDefaultFieldValues(templateId: string): Record<string, unknown> {
  const config = getQuickEventFields(templateId);
  if (!config) return {};

  return config.quickFields.reduce(
    (acc, field) => {
      if (field.default !== undefined) {
        acc[field.name] = field.default;
      }
      return acc;
    },
    {} as Record<string, unknown>
  );
}

/**
 * Field name mapping from frontend form fields to backend model fields
 * This ensures carbon-critical data is sent with the correct field names
 */
const fieldNameMapping: Record<string, string> = {
  // Chemical event fields - map to backend model field names
  volume_applied: 'volume',
  area_treated: 'area',
  application_method: 'way_of_application',
  target_pest_disease: 'target_pest_disease',
  // Production event fields stay the same (match backend model)
  area_covered: 'area_covered',
  irrigation_method: 'irrigation_method',
  irrigation_depth: 'irrigation_depth',
  irrigation_depth_unit: 'irrigation_depth_unit',
  water_source: 'water_source',
  equipment_type: 'equipment_type',
  equipment_hours: 'equipment_hours',
  fuel_consumed: 'fuel_consumed',
  fuel_type: 'fuel_type',
  fuel_unit: 'fuel_unit',
  yield_quantity: 'yield_quantity',
  yield_unit: 'yield_unit',
  transportation_distance: 'transportation_distance',
  transportation_unit: 'transportation_unit',
  production_efficiency: 'production_efficiency',
  seeds_source: 'seeds_source',
  // Equipment maintenance specific fields
  equipment_operation_type: 'equipment_operation_type',
  operation_efficiency: 'operation_efficiency',
  // Carbon-critical fields stay the same
  chemical_subtype: 'chemical_subtype',
  commercial_name: 'commercial_name',
  active_ingredient: 'active_ingredient',
  concentration: 'concentration',
  volume_unit: 'volume_unit',
  area_unit: 'area_unit',
  // Application fuel fields
  application_fuel_type: 'application_fuel_type',
  application_fuel_consumed: 'application_fuel_consumed',
  application_fuel_unit: 'application_fuel_unit',
  // EPA WPS compliance fields
  applicator_name: 'applicator_name',
  epa_registration_number: 'epa_registration_number',
  rei_hours: 'rei_hours',
  phi_days: 'phi_days',
  // Environmental and transparency fields
  weather_conditions: 'weather_conditions',
  application_timing: 'application_timing',
  organic_approved: 'organic_approved',
  buffer_zone_meters: 'buffer_zone_meters'
  // Note: observation field is handled separately by QuickAddEvent.tsx
};

/**
 * Get fields to include in the backend event payload
 * Maps frontend field names to backend field names and includes event type
 */
export function getFieldsForBackend(
  templateId: string,
  formValues: Record<string, unknown>
): Record<string, unknown> {
  const config = getQuickEventFields(templateId);
  if (!config) return {};

  const result: Record<string, unknown> = {};

  // Add the event subtype (e.g., 'FE' for fertilizer, 'IR' for irrigation)
  if (config.eventType) {
    result.type = config.eventType;
  }

  config.quickFields.forEach((field) => {
    const value = formValues[field.name];

    // Skip if showIf condition is not met
    if (field.showIf && !field.showIf(formValues)) {
      return;
    }

    // Include the field if it has a value
    if (value !== undefined && value !== null && value !== '') {
      // Map field name to backend field name, or use original if no mapping exists
      const backendFieldName = fieldNameMapping[field.name] || field.name;
      result[backendFieldName] = value;
    }
  });

  return result;
}
