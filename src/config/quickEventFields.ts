/**
 * Quick Event Type-Aware Field Configuration
 *
 * ALIGNED WITH MANUAL FORM (ProductionTab.jsx & ChemicalTab-ENHANCED.jsx)
 * This configuration mirrors the exact fields from the Manual Add Event flow
 * to ensure consistent carbon calculations and data collection.
 *
 * SSOT INTEGRATION: Field options are imported from eventFieldDefinitions.ts
 * to ensure consistency between Quick Event and Manual Event forms.
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

// Import shared field options from Single Source of Truth (SSOT)
import {
  // Unit options
  AREA_UNIT_OPTIONS,
  VOLUME_UNIT_OPTIONS,
  FUEL_UNIT_OPTIONS,
  YIELD_UNIT_OPTIONS,
  DISTANCE_UNIT_OPTIONS,
  // Select options
  FUEL_TYPE_OPTIONS,
  WATER_SOURCE_OPTIONS,
  IRRIGATION_METHOD_OPTIONS,
  SEEDS_SOURCE_OPTIONS,
  PRODUCTION_EFFICIENCY_OPTIONS,
  APPLICATION_METHOD_OPTIONS_BY_TYPE,
  ORGANIC_APPROVED_OPTIONS,
  RESTRICTED_USE_PESTICIDE_OPTIONS,
  CHEMICAL_SUBTYPE_OPTIONS,
  ACTIVITY_TYPE_OPTIONS,
  // Environmental context options (aligned with ChemicalTab-ENHANCED.jsx)
  WEATHER_CONDITIONS_OPTIONS,
  APPLICATION_TIMING_OPTIONS
} from './eventFieldDefinitions';

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
// SSOT: Uses imported options from eventFieldDefinitions.ts
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
      unitOptions: AREA_UNIT_OPTIONS // SSOT import
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.areaUnit',
      default: 'ha',
      options: AREA_UNIT_OPTIONS // SSOT import
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
      options: FUEL_TYPE_OPTIONS // SSOT import
    },
    // Fuel Consumed with Unit dropdown
    {
      name: 'fuel_consumed',
      type: 'number',
      labelKey: 'quickAdd.fields.fuelConsumed',
      helpKey: 'quickAdd.fields.fuelConsumedHelp',
      default: 2, // Smart default: typical irrigation pump fuel consumption (L)
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'fuel_unit',
      unitOptions: FUEL_UNIT_OPTIONS // SSOT import
    },
    {
      name: 'fuel_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.fuelUnit',
      default: 'L',
      options: FUEL_UNIT_OPTIONS // SSOT import
    },
    // Water Source (Consumer Trust field)
    {
      name: 'water_source',
      type: 'select',
      labelKey: 'quickAdd.fields.waterSource',
      helpKey: 'quickAdd.fields.waterSourceHelp',
      default: 'well_groundwater',
      options: WATER_SOURCE_OPTIONS // SSOT import
    },
    // Irrigation Method (USDA NASS 2023)
    {
      name: 'irrigation_method',
      type: 'select',
      labelKey: 'quickAdd.fields.irrigationMethod',
      helpKey: 'quickAdd.fields.irrigationMethodHelp',
      default: 'drip',
      required: true,
      options: IRRIGATION_METHOD_OPTIONS // SSOT import
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
// Aligned with ProductionTab.jsx - Uses SSOT imports
export const harvestFields: QuickEventTypeConfig = {
  templateId: 'harvest',
  eventType: 'HA',
  quickFields: [
    // Area Covered with Unit dropdown - SSOT import
    {
      name: 'area_covered',
      type: 'number',
      labelKey: 'app.areaCovered',
      helpKey: 'app.areaCoveredHelp',
      default: 1,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: AREA_UNIT_OPTIONS
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'app.areaUnit',
      default: 'ha',
      options: AREA_UNIT_OPTIONS
    },
    // Yield Quantity with Unit dropdown - SSOT import
    {
      name: 'yield_quantity',
      type: 'number',
      labelKey: 'app.yieldQuantity',
      helpKey: 'app.yieldQuantityHelp',
      required: true,
      default: 100,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'yield_unit',
      unitOptions: YIELD_UNIT_OPTIONS
    },
    {
      name: 'yield_unit',
      type: 'select',
      labelKey: 'app.yieldUnit',
      default: 'kg',
      options: YIELD_UNIT_OPTIONS
    },
    // Fuel Type - SSOT import (EPA-verified emission factors)
    {
      name: 'fuel_type',
      type: 'select',
      labelKey: 'app.fuelType',
      helpKey: 'app.fuelTypeHelp',
      default: 'diesel',
      options: FUEL_TYPE_OPTIONS
    },
    // Fuel Consumed with Unit dropdown - SSOT import
    {
      name: 'fuel_consumed',
      type: 'number',
      labelKey: 'app.fuelConsumed',
      helpKey: 'app.fuelConsumedHelp',
      default: 5,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'fuel_unit',
      unitOptions: FUEL_UNIT_OPTIONS
    },
    {
      name: 'fuel_unit',
      type: 'select',
      labelKey: 'app.fuelUnit',
      default: 'L',
      options: FUEL_UNIT_OPTIONS
    },
    // Equipment Operating Hours
    {
      name: 'equipment_hours',
      type: 'number',
      labelKey: 'app.equipmentHours',
      helpKey: 'app.equipmentHoursHelp',
      default: 4,
      min: 0,
      step: 0.1
    },
    // Transportation Distance with Unit dropdown - SSOT import
    {
      name: 'transportation_distance',
      type: 'number',
      labelKey: 'app.transportationDistance',
      helpKey: 'app.transportationDistanceHelp',
      default: 5,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'transportation_unit',
      unitOptions: DISTANCE_UNIT_OPTIONS
    },
    {
      name: 'transportation_unit',
      type: 'select',
      labelKey: 'app.transportationUnit',
      default: 'km',
      options: DISTANCE_UNIT_OPTIONS
    },
    // Production Efficiency - SSOT import
    {
      name: 'production_efficiency',
      type: 'select',
      labelKey: 'app.productionEfficiency',
      helpKey: 'app.productionEfficiencyHelp',
      default: 'normal',
      options: PRODUCTION_EFFICIENCY_OPTIONS
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Planting Event (Production Type: PL)
// Aligned with ProductionTab.jsx - Uses SSOT imports
export const plantingFields: QuickEventTypeConfig = {
  templateId: 'planting',
  eventType: 'PL',
  quickFields: [
    // Area Covered with Unit dropdown - SSOT import
    {
      name: 'area_covered',
      type: 'number',
      labelKey: 'app.areaCovered',
      helpKey: 'app.areaCoveredHelp',
      default: 1,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: AREA_UNIT_OPTIONS
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'app.areaUnit',
      default: 'ha',
      options: AREA_UNIT_OPTIONS
    },
    // Seeds Source - SSOT import (Consumer Trust field)
    {
      name: 'seeds_source',
      type: 'select',
      labelKey: 'app.seedsSource',
      helpKey: 'app.seedsSourceHelp',
      default: 'commercial',
      required: true,
      options: SEEDS_SOURCE_OPTIONS
    },
    // Yield Quantity with Unit dropdown (Quantity Planted) - SSOT import
    {
      name: 'yield_quantity',
      type: 'number',
      labelKey: 'app.quantityPlanted',
      helpKey: 'app.quantityPlantedHelp',
      min: 0,
      step: 1,
      hasUnitDropdown: true,
      unitFieldName: 'yield_unit',
      unitOptions: YIELD_UNIT_OPTIONS
    },
    {
      name: 'yield_unit',
      type: 'select',
      labelKey: 'app.yieldUnit',
      default: 'plants',
      options: YIELD_UNIT_OPTIONS
    },
    // Fuel Type - SSOT import (EPA-verified emission factors)
    {
      name: 'fuel_type',
      type: 'select',
      labelKey: 'app.fuelType',
      helpKey: 'app.fuelTypeHelp',
      default: 'diesel',
      options: FUEL_TYPE_OPTIONS
    },
    // Fuel Consumed with Unit dropdown - SSOT import
    {
      name: 'fuel_consumed',
      type: 'number',
      labelKey: 'app.fuelConsumed',
      helpKey: 'app.fuelConsumedHelp',
      default: 2,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'fuel_unit',
      unitOptions: FUEL_UNIT_OPTIONS
    },
    {
      name: 'fuel_unit',
      type: 'select',
      labelKey: 'app.fuelUnit',
      default: 'L',
      options: FUEL_UNIT_OPTIONS
    },
    // Equipment Operating Hours
    {
      name: 'equipment_hours',
      type: 'number',
      labelKey: 'app.equipmentHours',
      helpKey: 'app.equipmentHoursHelp',
      default: 3,
      min: 0,
      step: 0.1
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Pruning Event (Production Type: PR)
// Aligned with ProductionTab.jsx - Uses SSOT imports
export const pruningFields: QuickEventTypeConfig = {
  templateId: 'pruning',
  eventType: 'PR',
  quickFields: [
    // Area Covered with Unit dropdown - SSOT import
    {
      name: 'area_covered',
      type: 'number',
      labelKey: 'app.areaCovered',
      helpKey: 'app.areaCoveredHelp',
      default: 0.5,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: AREA_UNIT_OPTIONS
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'app.areaUnit',
      default: 'ha',
      options: AREA_UNIT_OPTIONS
    },
    // Equipment Operating Hours
    {
      name: 'equipment_hours',
      type: 'number',
      labelKey: 'app.equipmentHours',
      helpKey: 'app.equipmentHoursHelp',
      default: 4,
      min: 0,
      step: 0.1
    },
    // Fuel Type - SSOT import (EPA-verified emission factors)
    {
      name: 'fuel_type',
      type: 'select',
      labelKey: 'app.fuelType',
      helpKey: 'app.fuelTypeHelp',
      default: 'gasoline',
      options: FUEL_TYPE_OPTIONS
    },
    // Fuel Consumed with Unit dropdown - SSOT import
    {
      name: 'fuel_consumed',
      type: 'number',
      labelKey: 'app.fuelConsumed',
      helpKey: 'app.fuelConsumedHelp',
      default: 0.5,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'fuel_unit',
      unitOptions: FUEL_UNIT_OPTIONS
    },
    {
      name: 'fuel_unit',
      type: 'select',
      labelKey: 'app.fuelUnit',
      default: 'L',
      options: FUEL_UNIT_OPTIONS
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Transplanting Event (Production Type: TR)
// Aligned with ProductionTab.jsx - Uses SSOT imports
export const transplantingFields: QuickEventTypeConfig = {
  templateId: 'transplanting',
  eventType: 'TR',
  quickFields: [
    // Area Covered with Unit dropdown - SSOT import
    {
      name: 'area_covered',
      type: 'number',
      labelKey: 'app.areaCovered',
      helpKey: 'app.areaCoveredHelp',
      default: 1,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: AREA_UNIT_OPTIONS
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'app.areaUnit',
      default: 'ha',
      options: AREA_UNIT_OPTIONS
    },
    // Seeds Source - SSOT import (Consumer Trust field)
    {
      name: 'seeds_source',
      type: 'select',
      labelKey: 'app.seedsSource',
      helpKey: 'app.seedsSourceHelp',
      default: 'commercial',
      options: SEEDS_SOURCE_OPTIONS
    },
    // Yield Quantity with Unit dropdown (Quantity Transplanted) - SSOT import
    {
      name: 'yield_quantity',
      type: 'number',
      labelKey: 'app.quantityTransplanted',
      helpKey: 'app.quantityTransplantedHelp',
      min: 0,
      step: 1,
      hasUnitDropdown: true,
      unitFieldName: 'yield_unit',
      unitOptions: YIELD_UNIT_OPTIONS
    },
    {
      name: 'yield_unit',
      type: 'select',
      labelKey: 'app.yieldUnit',
      default: 'plants',
      options: YIELD_UNIT_OPTIONS
    },
    // Fuel Type - SSOT import (EPA-verified emission factors)
    {
      name: 'fuel_type',
      type: 'select',
      labelKey: 'app.fuelType',
      helpKey: 'app.fuelTypeHelp',
      default: 'diesel',
      options: FUEL_TYPE_OPTIONS
    },
    // Fuel Consumed with Unit dropdown - SSOT import
    {
      name: 'fuel_consumed',
      type: 'number',
      labelKey: 'app.fuelConsumed',
      helpKey: 'app.fuelConsumedHelp',
      default: 2.4,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'fuel_unit',
      unitOptions: FUEL_UNIT_OPTIONS
    },
    {
      name: 'fuel_unit',
      type: 'select',
      labelKey: 'app.fuelUnit',
      default: 'L',
      options: FUEL_UNIT_OPTIONS
    },
    // Equipment Operating Hours
    {
      name: 'equipment_hours',
      type: 'number',
      labelKey: 'app.equipmentHours',
      helpKey: 'app.equipmentHoursHelp',
      default: 4,
      min: 0,
      step: 0.1
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Cultivation Event (Production Type: CU)
// Aligned with ProductionTab.jsx - Uses SSOT imports
export const cultivationFields: QuickEventTypeConfig = {
  templateId: 'cultivation',
  eventType: 'CU',
  quickFields: [
    // Area Covered with Unit dropdown - SSOT import
    {
      name: 'area_covered',
      type: 'number',
      labelKey: 'app.areaCovered',
      helpKey: 'app.areaCoveredHelp',
      default: 1,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: AREA_UNIT_OPTIONS
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'app.areaUnit',
      default: 'ha',
      options: AREA_UNIT_OPTIONS
    },
    // Equipment Operating Hours
    {
      name: 'equipment_hours',
      type: 'number',
      labelKey: 'app.equipmentHours',
      helpKey: 'app.equipmentHoursHelp',
      default: 3,
      min: 0,
      step: 0.1
    },
    // Fuel Type - SSOT import (EPA-verified emission factors)
    {
      name: 'fuel_type',
      type: 'select',
      labelKey: 'app.fuelType',
      helpKey: 'app.fuelTypeHelp',
      default: 'diesel',
      options: FUEL_TYPE_OPTIONS
    },
    // Fuel Consumed with Unit dropdown - SSOT import
    {
      name: 'fuel_consumed',
      type: 'number',
      labelKey: 'app.fuelConsumed',
      helpKey: 'app.fuelConsumedHelp',
      default: 3,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'fuel_unit',
      unitOptions: FUEL_UNIT_OPTIONS
    },
    {
      name: 'fuel_unit',
      type: 'select',
      labelKey: 'app.fuelUnit',
      default: 'L',
      options: FUEL_UNIT_OPTIONS
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Thinning Event (Production Type: TH)
// Aligned with ProductionTab.jsx - Uses SSOT imports
export const thinningFields: QuickEventTypeConfig = {
  templateId: 'thinning',
  eventType: 'TH',
  quickFields: [
    // Area Covered with Unit dropdown - SSOT import
    {
      name: 'area_covered',
      type: 'number',
      labelKey: 'app.areaCovered',
      helpKey: 'app.areaCoveredHelp',
      default: 0.5,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: AREA_UNIT_OPTIONS
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'app.areaUnit',
      default: 'ha',
      options: AREA_UNIT_OPTIONS
    },
    // Equipment Operating Hours
    {
      name: 'equipment_hours',
      type: 'number',
      labelKey: 'app.equipmentHours',
      helpKey: 'app.equipmentHoursHelp',
      default: 4,
      min: 0,
      step: 0.1
    },
    // Fuel Type - SSOT import (EPA-verified emission factors)
    {
      name: 'fuel_type',
      type: 'select',
      labelKey: 'app.fuelType',
      helpKey: 'app.fuelTypeHelp',
      default: 'gasoline',
      options: FUEL_TYPE_OPTIONS
    },
    // Fuel Consumed with Unit dropdown - SSOT import
    {
      name: 'fuel_consumed',
      type: 'number',
      labelKey: 'app.fuelConsumed',
      helpKey: 'app.fuelConsumedHelp',
      default: 0.5,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'fuel_unit',
      unitOptions: FUEL_UNIT_OPTIONS
    },
    {
      name: 'fuel_unit',
      type: 'select',
      labelKey: 'app.fuelUnit',
      default: 'L',
      options: FUEL_UNIT_OPTIONS
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Equipment Maintenance Event (Production Type: EM)
// Aligned with ProductionTab.jsx - Uses SSOT imports
export const equipmentMaintenanceFields: QuickEventTypeConfig = {
  templateId: 'equipment_maintenance',
  eventType: 'EM',
  quickFields: [
    // Equipment Type
    {
      name: 'equipment_type',
      type: 'select',
      labelKey: 'app.equipmentType',
      helpKey: 'app.equipmentTypeHelp',
      default: 'tractor',
      required: true,
      options: [
        { value: 'tractor', labelKey: 'app.equipmentType.tractor' },
        { value: 'harvester', labelKey: 'app.equipmentType.harvester' },
        { value: 'sprayer', labelKey: 'app.equipmentType.sprayer' },
        { value: 'irrigation_pump', labelKey: 'app.equipmentType.irrigationPump' },
        { value: 'tillage', labelKey: 'app.equipmentType.tillage' },
        { value: 'other', labelKey: 'app.equipmentType.other' }
      ]
    },
    // Equipment Operation Type
    {
      name: 'equipment_operation_type',
      type: 'select',
      labelKey: 'app.equipmentOperationType',
      helpKey: 'app.equipmentOperationTypeHelp',
      default: 'routine_maintenance',
      required: true,
      options: [
        { value: 'routine_maintenance', labelKey: 'app.equipmentOperationType.routineMaintenance' },
        { value: 'repair', labelKey: 'app.equipmentOperationType.repair' },
        { value: 'calibration', labelKey: 'app.equipmentOperationType.calibration' },
        { value: 'cleaning', labelKey: 'app.equipmentOperationType.cleaning' },
        { value: 'inspection', labelKey: 'app.equipmentOperationType.inspection' }
      ]
    },
    // Equipment Operating Hours
    {
      name: 'equipment_hours',
      type: 'number',
      labelKey: 'app.equipmentHours',
      helpKey: 'app.equipmentHoursHelp',
      default: 2,
      min: 0,
      step: 0.1
    },
    // Fuel Type - SSOT import (EPA-verified emission factors)
    {
      name: 'fuel_type',
      type: 'select',
      labelKey: 'app.fuelType',
      helpKey: 'app.fuelTypeHelp',
      default: 'diesel',
      options: FUEL_TYPE_OPTIONS
    },
    // Fuel Consumed with Unit dropdown - SSOT import
    {
      name: 'fuel_consumed',
      type: 'number',
      labelKey: 'app.fuelConsumed',
      helpKey: 'app.fuelConsumedHelp',
      required: true,
      default: 5,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'fuel_unit',
      unitOptions: FUEL_UNIT_OPTIONS
    },
    {
      name: 'fuel_unit',
      type: 'select',
      labelKey: 'app.fuelUnit',
      default: 'L',
      options: FUEL_UNIT_OPTIONS
    },
    // Operation Efficiency - SSOT import
    {
      name: 'operation_efficiency',
      type: 'select',
      labelKey: 'app.operationEfficiency',
      helpKey: 'app.operationEfficiencyHelp',
      default: 'normal',
      options: PRODUCTION_EFFICIENCY_OPTIONS
    },
    // Area Covered (Optional for Equipment Maintenance) - SSOT import
    {
      name: 'area_covered',
      type: 'number',
      labelKey: 'app.areaCovered',
      helpKey: 'app.areaCoveredHelpOptional',
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: AREA_UNIT_OPTIONS
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'app.areaUnit',
      default: 'ha',
      options: AREA_UNIT_OPTIONS
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// ============================================================================
// CHEMICAL EVENT TYPES (from ChemicalTab-ENHANCED.jsx)
// ============================================================================

// Fertilization Event (Chemical Type: FE)
// Aligned with ChemicalTab-ENHANCED.jsx - Uses SSOT imports
export const fertilizationFields: QuickEventTypeConfig = {
  templateId: 'fertilization',
  eventType: 'FE',
  quickFields: [
    // Chemical Subtype - SSOT import (critical for emission factor selection - 21x variance!)
    {
      name: 'chemical_subtype',
      type: 'select',
      labelKey: 'app.chemicalSubtype',
      helpKey: 'app.chemicalSubtypeHelp',
      default: 'synthetic_fertilizer',
      required: true,
      options: CHEMICAL_SUBTYPE_OPTIONS.fertilizer
    },
    // Commercial Name / Product - Matches Manual Event label
    {
      name: 'commercial_name',
      type: 'text',
      labelKey: 'app.commercialName',
      helpKey: 'app.commercialNameHelp',
      placeholderKey: 'app.commercialNamePlaceholder',
      required: true
    },
    // Active Ingredient (Optional) - Matches Manual Event label
    {
      name: 'active_ingredient',
      type: 'text',
      labelKey: 'app.activeIngredient',
      helpKey: 'app.activeIngredientHelp',
      placeholderKey: 'app.activeIngredientPlaceholder'
    },
    // Concentration (NPK Ratio for fertilizers) - with validation
    {
      name: 'concentration',
      type: 'text',
      labelKey: 'app.fertilizerConcentration', // Context-aware label - matches Manual Event
      helpKey: 'app.concentrationHelpFertilizer',
      placeholderKey: 'app.concentrationPlaceholderNPK',
      required: true,
      validationType: 'concentration',
      default: '10-10-10'
    },
    // Volume Applied with Unit dropdown - SSOT import
    {
      name: 'volume_applied',
      type: 'number',
      labelKey: 'app.volumeApplied',
      helpKey: 'app.volumeAppliedHelp',
      default: 100,
      required: true,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'volume_unit',
      unitOptions: VOLUME_UNIT_OPTIONS
    },
    {
      name: 'volume_unit',
      type: 'select',
      labelKey: 'app.volumeUnit',
      default: 'kg',
      options: VOLUME_UNIT_OPTIONS
    },
    // Area Treated with Unit dropdown - SSOT import
    {
      name: 'area_treated',
      type: 'number',
      labelKey: 'app.areaTreated',
      helpKey: 'app.areaTreatedHelp',
      default: 1,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: AREA_UNIT_OPTIONS
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'app.areaUnit',
      default: 'ha',
      options: AREA_UNIT_OPTIONS
    },
    // Application Method - SSOT import (USDA NRCS Standard Methods for Fertilizer)
    {
      name: 'application_method',
      type: 'select',
      labelKey: 'app.applicationMethod',
      helpKey: 'app.applicationMethodHelp',
      default: 'broadcast',
      required: true,
      options: APPLICATION_METHOD_OPTIONS_BY_TYPE.fertilizer
    },
    // Application Details - Text field for method specifics (Manual Event parity)
    {
      name: 'application_details',
      type: 'textarea',
      labelKey: 'app.applicationDetails',
      helpKey: 'app.applicationDetailsHelp',
      placeholderKey: 'app.applicationDetailsPlaceholder'
    },
    // Weather Conditions
    {
      name: 'weather_conditions',
      type: 'select',
      labelKey: 'app.weatherConditions',
      helpKey: 'app.weatherConditionsHelp',
      options: [
        { value: 'calm_dry', labelKey: 'app.weatherConditions.calmDry' },
        { value: 'light_wind', labelKey: 'app.weatherConditions.lightWind' },
        { value: 'humid', labelKey: 'app.weatherConditions.humid' },
        { value: 'windy', labelKey: 'app.weatherConditions.windy' }
      ]
    },
    // Application Timing
    {
      name: 'application_timing',
      type: 'select',
      labelKey: 'app.applicationTiming',
      helpKey: 'app.applicationTimingHelp',
      options: [
        { value: 'pre_plant', labelKey: 'app.applicationTiming.prePlant' },
        { value: 'post_emergence', labelKey: 'app.applicationTiming.postEmergence' },
        { value: 'flowering', labelKey: 'app.applicationTiming.flowering' },
        { value: 'fruit_development', labelKey: 'app.applicationTiming.fruitDevelopment' },
        { value: 'harvest', labelKey: 'app.applicationTiming.harvest' }
      ]
    },
    // Organic Approved - SSOT import
    {
      name: 'organic_approved',
      type: 'select',
      labelKey: 'app.organicApproved',
      helpKey: 'app.organicApprovedHelp',
      default: 'false',
      options: ORGANIC_APPROVED_OPTIONS
    },
    // Application Fuel Type - SSOT import
    {
      name: 'application_fuel_type',
      type: 'select',
      labelKey: 'app.applicationEquipmentFuelType',
      helpKey: 'app.applicationFuelTypeHelp',
      default: 'diesel',
      options: FUEL_TYPE_OPTIONS
    },
    // Application Fuel Consumed with Unit dropdown - SSOT import
    {
      name: 'application_fuel_consumed',
      type: 'number',
      labelKey: 'app.fuelConsumed',
      helpKey: 'app.applicationFuelConsumedHelp',
      default: 2,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'application_fuel_unit',
      unitOptions: FUEL_UNIT_OPTIONS
    },
    {
      name: 'application_fuel_unit',
      type: 'select',
      labelKey: 'app.applicationFuelUnit',
      default: 'gal',
      options: FUEL_UNIT_OPTIONS
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Pest Control Event (Chemical Type: PE)
// Aligned with ChemicalTab-ENHANCED.jsx
// SSOT: Uses imported options from eventFieldDefinitions.ts
export const pestControlFields: QuickEventTypeConfig = {
  templateId: 'pest_control',
  eventType: 'PE',
  quickFields: [
    // Chemical Subtype - SSOT import
    {
      name: 'chemical_subtype',
      type: 'select',
      labelKey: 'quickAdd.fields.chemicalSubtype',
      helpKey: 'quickAdd.fields.chemicalSubtypeHelp',
      default: 'synthetic_pesticide',
      required: true,
      options: CHEMICAL_SUBTYPE_OPTIONS.pesticide // SSOT import
    },
    // Commercial Name / Product (label matches Manual Event)
    {
      name: 'commercial_name',
      type: 'text',
      labelKey: 'app.commercialName', // Standardized label key
      helpKey: 'quickAdd.fields.commercialNameHelp',
      placeholderKey: 'quickAdd.fields.commercialNamePlaceholder',
      required: true
    },
    // Active Ingredient (Optional) - label matches Manual Event
    {
      name: 'active_ingredient',
      type: 'text',
      labelKey: 'app.activeIngredient', // Standardized label key
      helpKey: 'quickAdd.fields.activeIngredientHelp',
      placeholderKey: 'quickAdd.fields.activeIngredientPlaceholder'
    },
    // Concentration (percentage for pesticides) - with validation
    {
      name: 'concentration',
      type: 'text',
      labelKey: 'app.pesticideConcentration', // Context-aware label - matches Manual Event
      helpKey: 'quickAdd.fields.concentrationHelpPesticide',
      placeholderKey: 'quickAdd.fields.concentrationPlaceholderPercent',
      required: true,
      validationType: 'concentration',
      default: '50%' // Smart default: typical pesticide active ingredient concentration
    },
    // Volume Applied with Unit dropdown - SSOT import
    {
      name: 'volume_applied',
      type: 'number',
      labelKey: 'app.volumeApplied', // Standardized label key
      helpKey: 'quickAdd.fields.volumeAppliedHelp',
      default: 50,
      required: true,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'volume_unit',
      unitOptions: VOLUME_UNIT_OPTIONS // SSOT import
    },
    {
      name: 'volume_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.volumeUnit',
      default: 'L',
      options: VOLUME_UNIT_OPTIONS // SSOT import
    },
    // Area Treated with Unit dropdown - SSOT import
    {
      name: 'area_treated',
      type: 'number',
      labelKey: 'app.areaTreated', // Standardized label key
      helpKey: 'quickAdd.fields.areaTreatedHelp',
      default: 1,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: AREA_UNIT_OPTIONS // SSOT import
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.areaUnit',
      default: 'ha',
      options: AREA_UNIT_OPTIONS // SSOT import
    },
    // Application Method (EPA Standard Methods for Pesticide) - SSOT import
    {
      name: 'application_method',
      type: 'select',
      labelKey: 'app.applicationMethod', // Standardized label key
      helpKey: 'quickAdd.fields.applicationMethodHelp',
      default: 'ground_spray',
      required: true,
      options: APPLICATION_METHOD_OPTIONS_BY_TYPE.pesticide // SSOT import - context-aware
    },
    // Application Details (NEW - from Manual Event for method specifics)
    {
      name: 'application_details',
      type: 'textarea',
      labelKey: 'app.applicationDetails',
      helpKey: 'app.applicationDetailsHelp',
      placeholderKey: 'app.applicationDetailsPlaceholder'
    },
    // Weather Conditions (NEW - from ChemicalTab-ENHANCED.jsx for transparency) - SSOT import
    {
      name: 'weather_conditions',
      type: 'select',
      labelKey: 'app.weatherConditions',
      helpKey: 'app.weatherConditionsHelp',
      default: 'calm_dry',
      options: WEATHER_CONDITIONS_OPTIONS // SSOT import - aligned with Manual Event
    },
    // Application Timing (NEW - from ChemicalTab-ENHANCED.jsx for transparency) - SSOT import
    {
      name: 'application_timing',
      type: 'select',
      labelKey: 'app.applicationTiming',
      helpKey: 'app.applicationTimingHelp',
      default: 'post_emergence',
      options: APPLICATION_TIMING_OPTIONS // SSOT import - aligned with Manual Event
    },
    // Target Pest/Disease/Need (label matches Manual Event)
    {
      name: 'target_pest_disease',
      type: 'text',
      labelKey: 'app.targetPestDisease', // Standardized label key
      helpKey: 'quickAdd.fields.targetPestDiseaseHelp',
      placeholderKey: 'quickAdd.fields.targetPestDiseasePlaceholder'
    },
    // Restricted Use Pesticide (NEW - EPA compliance from Manual Event)
    {
      name: 'restricted_use_pesticide',
      type: 'select',
      labelKey: 'app.restrictedUsePesticide',
      helpKey: 'app.restrictedUsePesticideHelp',
      default: 'false',
      options: RESTRICTED_USE_PESTICIDE_OPTIONS // SSOT import
    },
    // Organic Approved (label matches Manual Event) - SSOT import
    {
      name: 'organic_approved',
      type: 'select',
      labelKey: 'app.organicApproved', // Standardized label key
      helpKey: 'quickAdd.fields.organicApprovedHelp',
      default: 'false',
      options: ORGANIC_APPROVED_OPTIONS // SSOT import
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
      labelKey: 'app.applicatorName', // Standardized label key
      helpKey: 'quickAdd.fields.applicatorNameHelp',
      placeholderKey: 'quickAdd.fields.applicatorNamePlaceholder'
    },
    // Applicator Certification (NEW - from ChemicalTab-ENHANCED.jsx for EPA WPS compliance)
    // Required when restricted_use_pesticide is true - matches conditional behavior in Manual Event
    {
      name: 'applicator_certification',
      type: 'text',
      labelKey: 'app.applicatorCertification',
      helpKey: 'quickAdd.fields.applicatorCertificationHelp',
      placeholderKey: 'quickAdd.fields.applicatorCertificationPlaceholder'
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
      labelKey: 'app.reiHours', // Standardized label key
      helpKey: 'quickAdd.fields.reiHoursHelp',
      min: 0,
      step: 1,
      unitKey: 'quickAdd.fields.units.hours'
    },
    {
      name: 'phi_days',
      type: 'number',
      labelKey: 'app.phiDays', // Standardized label key
      helpKey: 'quickAdd.fields.phiDaysHelp',
      min: 0,
      step: 1,
      unitKey: 'quickAdd.fields.units.days'
    },
    // Application Fuel - SSOT imports
    {
      name: 'application_fuel_type',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationFuelType',
      helpKey: 'quickAdd.fields.applicationFuelTypeHelp',
      default: 'diesel', // Smart default: diesel is most common for agricultural application equipment
      options: FUEL_TYPE_OPTIONS // SSOT import
    },
    {
      name: 'application_fuel_consumed',
      type: 'number',
      labelKey: 'quickAdd.fields.applicationFuelConsumed',
      helpKey: 'quickAdd.fields.applicationFuelConsumedHelp',
      default: 2, // Smart default: typical fuel consumption for application equipment (gal)
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'application_fuel_unit',
      unitOptions: FUEL_UNIT_OPTIONS // SSOT import
    },
    {
      name: 'application_fuel_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationFuelUnit',
      default: 'gal',
      options: FUEL_UNIT_OPTIONS // SSOT import
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Herbicide Event (Chemical Type: HE)
// Aligned with ChemicalTab-ENHANCED.jsx
// SSOT: Uses imported options from eventFieldDefinitions.ts
export const herbicideFields: QuickEventTypeConfig = {
  templateId: 'herbicide',
  eventType: 'HE',
  quickFields: [
    // Chemical Subtype - SSOT import
    {
      name: 'chemical_subtype',
      type: 'select',
      labelKey: 'quickAdd.fields.chemicalSubtype',
      helpKey: 'quickAdd.fields.chemicalSubtypeHelp',
      default: 'synthetic_herbicide',
      required: true,
      options: CHEMICAL_SUBTYPE_OPTIONS.herbicide // SSOT import
    },
    // Commercial Name / Product (label matches Manual Event)
    {
      name: 'commercial_name',
      type: 'text',
      labelKey: 'app.commercialName', // Standardized label key
      helpKey: 'quickAdd.fields.commercialNameHelp',
      placeholderKey: 'quickAdd.fields.commercialNamePlaceholder',
      required: true
    },
    // Active Ingredient (Optional) - label matches Manual Event
    {
      name: 'active_ingredient',
      type: 'text',
      labelKey: 'app.activeIngredient', // Standardized label key
      helpKey: 'quickAdd.fields.activeIngredientHelp',
      placeholderKey: 'quickAdd.fields.activeIngredientPlaceholder'
    },
    // Concentration (percentage for herbicides) - with validation
    {
      name: 'concentration',
      type: 'text',
      labelKey: 'app.herbicideConcentration', // Context-aware label - matches Manual Event
      helpKey: 'quickAdd.fields.concentrationHelpHerbicide',
      placeholderKey: 'quickAdd.fields.concentrationPlaceholderPercent',
      required: true,
      validationType: 'concentration',
      default: '50%' // Smart default: typical herbicide active ingredient concentration
    },
    // Volume Applied with Unit dropdown - SSOT import
    {
      name: 'volume_applied',
      type: 'number',
      labelKey: 'app.volumeApplied', // Standardized label key
      helpKey: 'quickAdd.fields.volumeAppliedHelp',
      default: 50,
      required: true,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'volume_unit',
      unitOptions: VOLUME_UNIT_OPTIONS // SSOT import
    },
    {
      name: 'volume_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.volumeUnit',
      default: 'L',
      options: VOLUME_UNIT_OPTIONS // SSOT import
    },
    // Area Treated with Unit dropdown - SSOT import
    {
      name: 'area_treated',
      type: 'number',
      labelKey: 'app.areaTreated', // Standardized label key
      helpKey: 'quickAdd.fields.areaTreatedHelp',
      default: 1,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: AREA_UNIT_OPTIONS // SSOT import
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.areaUnit',
      default: 'ha',
      options: AREA_UNIT_OPTIONS // SSOT import
    },
    // Application Method (EPA Standard Methods for Herbicide) - SSOT import
    {
      name: 'application_method',
      type: 'select',
      labelKey: 'app.applicationMethod', // Standardized label key
      helpKey: 'quickAdd.fields.applicationMethodHelp',
      default: 'ground_spray',
      required: true,
      options: APPLICATION_METHOD_OPTIONS_BY_TYPE.herbicide // SSOT import - context-aware
    },
    // Application Details (NEW - from Manual Event for method specifics)
    {
      name: 'application_details',
      type: 'textarea',
      labelKey: 'app.applicationDetails',
      helpKey: 'app.applicationDetailsHelp',
      placeholderKey: 'app.applicationDetailsPlaceholder'
    },
    // Weather Conditions (NEW - from ChemicalTab-ENHANCED.jsx for transparency) - SSOT import
    {
      name: 'weather_conditions',
      type: 'select',
      labelKey: 'app.weatherConditions',
      helpKey: 'app.weatherConditionsHelp',
      default: 'calm_dry',
      options: WEATHER_CONDITIONS_OPTIONS // SSOT import - aligned with Manual Event
    },
    // Application Timing (NEW - from ChemicalTab-ENHANCED.jsx for transparency) - SSOT import
    {
      name: 'application_timing',
      type: 'select',
      labelKey: 'app.applicationTiming',
      helpKey: 'app.applicationTimingHelp',
      default: 'post_emergence',
      options: APPLICATION_TIMING_OPTIONS // SSOT import - aligned with Manual Event
    },
    // Target Pest/Disease/Need (for weed identification)
    {
      name: 'target_pest_disease',
      type: 'text',
      labelKey: 'app.targetPestDisease', // Standardized label key
      helpKey: 'quickAdd.fields.targetPestDiseaseHelpWeed',
      placeholderKey: 'quickAdd.fields.targetPestDiseasePlaceholderWeed'
    },
    // Restricted Use Pesticide (NEW - EPA compliance from Manual Event)
    {
      name: 'restricted_use_pesticide',
      type: 'select',
      labelKey: 'app.restrictedUsePesticide',
      helpKey: 'app.restrictedUsePesticideHelp',
      default: 'false',
      options: RESTRICTED_USE_PESTICIDE_OPTIONS // SSOT import
    },
    // Organic Approved (label matches Manual Event) - SSOT import
    {
      name: 'organic_approved',
      type: 'select',
      labelKey: 'app.organicApproved', // Standardized label key
      helpKey: 'quickAdd.fields.organicApprovedHelp',
      default: 'false',
      options: ORGANIC_APPROVED_OPTIONS // SSOT import
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
      labelKey: 'app.applicatorName', // Standardized label key
      helpKey: 'quickAdd.fields.applicatorNameHelp',
      placeholderKey: 'quickAdd.fields.applicatorNamePlaceholder'
    },
    // Applicator Certification (NEW - from ChemicalTab-ENHANCED.jsx for EPA WPS compliance)
    // Required when restricted_use_pesticide is true - matches conditional behavior in Manual Event
    {
      name: 'applicator_certification',
      type: 'text',
      labelKey: 'app.applicatorCertification',
      helpKey: 'quickAdd.fields.applicatorCertificationHelp',
      placeholderKey: 'quickAdd.fields.applicatorCertificationPlaceholder'
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
      labelKey: 'app.reiHours', // Standardized label key
      helpKey: 'quickAdd.fields.reiHoursHelp',
      min: 0,
      step: 1,
      unitKey: 'quickAdd.fields.units.hours'
    },
    {
      name: 'phi_days',
      type: 'number',
      labelKey: 'app.phiDays', // Standardized label key
      helpKey: 'quickAdd.fields.phiDaysHelp',
      min: 0,
      step: 1,
      unitKey: 'quickAdd.fields.units.days'
    },
    // Application Fuel - SSOT imports
    {
      name: 'application_fuel_type',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationFuelType',
      helpKey: 'quickAdd.fields.applicationFuelTypeHelp',
      default: 'diesel', // Smart default: diesel is most common for agricultural application equipment
      options: FUEL_TYPE_OPTIONS // SSOT import
    },
    {
      name: 'application_fuel_consumed',
      type: 'number',
      labelKey: 'quickAdd.fields.applicationFuelConsumed',
      helpKey: 'quickAdd.fields.applicationFuelConsumedHelp',
      default: 2, // Smart default: typical fuel consumption for application equipment (gal)
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'application_fuel_unit',
      unitOptions: FUEL_UNIT_OPTIONS // SSOT import
    },
    {
      name: 'application_fuel_unit',
      type: 'select',
      labelKey: 'quickAdd.fields.applicationFuelUnit',
      default: 'gal',
      options: FUEL_UNIT_OPTIONS // SSOT import
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// Fungicide Event (Chemical Type: FU)
// Aligned with ChemicalTab-ENHANCED.jsx - Uses SSOT imports
export const fungicideFields: QuickEventTypeConfig = {
  templateId: 'fungicide',
  eventType: 'FU',
  quickFields: [
    // Chemical Subtype - SSOT import
    {
      name: 'chemical_subtype',
      type: 'select',
      labelKey: 'app.chemicalSubtype',
      helpKey: 'app.chemicalSubtypeHelp',
      default: 'synthetic_fungicide',
      required: true,
      options: CHEMICAL_SUBTYPE_OPTIONS.fungicide
    },
    // Commercial Name / Product - Matches Manual Event label
    {
      name: 'commercial_name',
      type: 'text',
      labelKey: 'app.commercialName',
      helpKey: 'app.commercialNameHelp',
      placeholderKey: 'app.commercialNamePlaceholder',
      required: true
    },
    // Active Ingredient (Optional) - Matches Manual Event label
    {
      name: 'active_ingredient',
      type: 'text',
      labelKey: 'app.activeIngredient',
      helpKey: 'app.activeIngredientHelp',
      placeholderKey: 'app.activeIngredientPlaceholder'
    },
    // Concentration (percentage for fungicides) - with validation
    {
      name: 'concentration',
      type: 'text',
      labelKey: 'app.fungicideConcentration', // Context-aware label - matches Manual Event
      helpKey: 'app.concentrationHelpFungicide',
      placeholderKey: 'app.concentrationPlaceholderPercent',
      required: true,
      validationType: 'concentration',
      default: '50%'
    },
    // Volume Applied with Unit dropdown - SSOT import
    {
      name: 'volume_applied',
      type: 'number',
      labelKey: 'app.volumeApplied',
      helpKey: 'app.volumeAppliedHelp',
      default: 30,
      required: true,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'volume_unit',
      unitOptions: VOLUME_UNIT_OPTIONS
    },
    {
      name: 'volume_unit',
      type: 'select',
      labelKey: 'app.volumeUnit',
      default: 'L',
      options: VOLUME_UNIT_OPTIONS
    },
    // Area Treated with Unit dropdown - SSOT import
    {
      name: 'area_treated',
      type: 'number',
      labelKey: 'app.areaTreated',
      helpKey: 'app.areaTreatedHelp',
      default: 1,
      required: true,
      min: 0,
      step: 0.01,
      hasUnitDropdown: true,
      unitFieldName: 'area_unit',
      unitOptions: AREA_UNIT_OPTIONS
    },
    {
      name: 'area_unit',
      type: 'select',
      labelKey: 'app.areaUnit',
      default: 'ha',
      options: AREA_UNIT_OPTIONS
    },
    // Application Method - SSOT import (context-aware for fungicide)
    {
      name: 'application_method',
      type: 'select',
      labelKey: 'app.applicationMethod',
      helpKey: 'app.applicationMethodHelp',
      default: 'ground_spray',
      required: true,
      options: APPLICATION_METHOD_OPTIONS_BY_TYPE.fungicide
    },
    // Application Details - Text field for method specifics (Manual Event parity)
    {
      name: 'application_details',
      type: 'textarea',
      labelKey: 'app.applicationDetails',
      helpKey: 'app.applicationDetailsHelp',
      placeholderKey: 'app.applicationDetailsPlaceholder'
    },
    // Weather Conditions (NEW - from ChemicalTab-ENHANCED.jsx for transparency) - SSOT import
    {
      name: 'weather_conditions',
      type: 'select',
      labelKey: 'app.weatherConditions',
      helpKey: 'app.weatherConditionsHelp',
      default: 'calm_dry',
      options: WEATHER_CONDITIONS_OPTIONS // SSOT import - aligned with Manual Event
    },
    // Application Timing (NEW - from ChemicalTab-ENHANCED.jsx for transparency) - SSOT import
    {
      name: 'application_timing',
      type: 'select',
      labelKey: 'app.applicationTiming',
      helpKey: 'app.applicationTimingHelp',
      default: 'flowering', // Fungicides often applied during flowering
      options: APPLICATION_TIMING_OPTIONS // SSOT import - aligned with Manual Event
    },
    // Target Pest/Disease/Need - Matches Manual Event label
    {
      name: 'target_pest_disease',
      type: 'text',
      labelKey: 'app.targetPestDiseaseNeed',
      helpKey: 'app.targetPestDiseaseHelpFungus',
      placeholderKey: 'app.targetPestDiseasePlaceholderFungus'
    },
    // Restricted Use Pesticide - EPA compliance (SSOT import)
    {
      name: 'restricted_use_pesticide',
      type: 'select',
      labelKey: 'app.restrictedUsePesticide',
      helpKey: 'app.restrictedUsePesticideHelp',
      default: 'false',
      options: RESTRICTED_USE_PESTICIDE_OPTIONS
    },
    // Organic Approved - SSOT import
    {
      name: 'organic_approved',
      type: 'select',
      labelKey: 'app.organicApproved',
      helpKey: 'app.organicApprovedHelp',
      default: 'false',
      options: ORGANIC_APPROVED_OPTIONS
    },
    // Buffer Zone
    {
      name: 'buffer_zone_meters',
      type: 'number',
      labelKey: 'app.bufferZone',
      helpKey: 'app.bufferZoneHelp',
      min: 0,
      step: 1,
      unitKey: 'app.units.meters'
    },
    // EPA WPS Compliance Fields
    {
      name: 'applicator_name',
      type: 'text',
      labelKey: 'app.applicatorName',
      helpKey: 'app.applicatorNameHelp',
      placeholderKey: 'app.applicatorNamePlaceholder'
    },
    // Applicator Certification (from ChemicalTab-ENHANCED.jsx for EPA WPS compliance)
    // Required when restricted_use_pesticide is true - matches conditional behavior in Manual Event
    {
      name: 'applicator_certification',
      type: 'text',
      labelKey: 'app.applicatorCertification',
      helpKey: 'quickAdd.fields.applicatorCertificationHelp',
      placeholderKey: 'quickAdd.fields.applicatorCertificationPlaceholder'
    },
    {
      name: 'epa_registration_number',
      type: 'text',
      labelKey: 'app.epaRegistrationNumber',
      helpKey: 'app.epaRegistrationNumberHelp',
      placeholderKey: 'app.epaRegistrationNumberPlaceholder'
    },
    {
      name: 'rei_hours',
      type: 'number',
      labelKey: 'app.reiHours',
      helpKey: 'app.reiHoursHelp',
      min: 0,
      step: 1,
      unitKey: 'app.units.hours'
    },
    {
      name: 'phi_days',
      type: 'number',
      labelKey: 'app.phiDays',
      helpKey: 'app.phiDaysHelp',
      min: 0,
      step: 1,
      unitKey: 'app.units.days'
    },
    // Application Fuel - SSOT imports
    {
      name: 'application_fuel_type',
      type: 'select',
      labelKey: 'app.applicationEquipmentFuelType',
      helpKey: 'app.applicationFuelTypeHelp',
      default: 'diesel',
      options: FUEL_TYPE_OPTIONS
    },
    {
      name: 'application_fuel_consumed',
      type: 'number',
      labelKey: 'app.fuelConsumed',
      helpKey: 'app.applicationFuelConsumedHelp',
      default: 2,
      min: 0,
      step: 0.1,
      hasUnitDropdown: true,
      unitFieldName: 'application_fuel_unit',
      unitOptions: FUEL_UNIT_OPTIONS
    },
    {
      name: 'application_fuel_unit',
      type: 'select',
      labelKey: 'app.applicationFuelUnit',
      default: 'gal',
      options: FUEL_UNIT_OPTIONS
    }
    // Note: Observation field is handled by QuickAddEvent.tsx "Additional Observations" section
  ]
};

// ============================================================================
// GENERAL EVENT TYPE
// ============================================================================

// General Documentation Event (No Carbon Impact)
// SSOT: Uses imported options from eventFieldDefinitions.ts
export const generalDocumentationFields: QuickEventTypeConfig = {
  templateId: 'general_documentation',
  eventType: 'GE', // General event type
  excludeFromCarbonCalculation: true,
  quickFields: [
    // Activity Type - SSOT import
    {
      name: 'activity_type',
      type: 'select',
      labelKey: 'app.activityType', // Standardized label key
      helpKey: 'app.activityTypeHelp',
      default: 'inspection',
      options: ACTIVITY_TYPE_OPTIONS // SSOT import
    },
    // Notes / Observations
    {
      name: 'notes',
      type: 'textarea',
      labelKey: 'app.notes', // Standardized label key
      helpKey: 'app.notesHelp',
      placeholderKey: 'app.notesPlaceholder'
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
