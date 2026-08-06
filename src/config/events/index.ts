/**
 * Event Field Registry — Barrel Export + Registry Assembly.
 *
 * This is the entry point for the event field SSOT. Display components
 * should import resolver functions from here (not from resolver.ts directly).
 *
 * Registry population: individual event registries (chemicalEvent.ts,
 * weatherEvent.ts, etc.) export their EventRegistryEntry, which are
 * assembled into the top-level registry here.
 *
 * Import order matters — this file must be imported BEFORE any code
 * that calls resolver functions.
 */

import { businessEventRegistry } from './businessEvent';
import { chemicalEventRegistry } from './chemicalEvent';
import { equipmentEventRegistry } from './equipmentEvent';
import { generalEventRegistry } from './generalEvent';
import { pestEventRegistry } from './pestEvent';
import { productionEventRegistry } from './productionEvent';
import type { EventRegistry } from './registry';
import { _setRegistry } from './resolver';
import { soilEventRegistry } from './soilEvent';
import { weatherEventRegistry } from './weatherEvent';

// ============================================================================
// Re-export public API (types + resolver functions)
// ============================================================================

// Types
export type {
  AnySubtype,
  BusinessSubtype,
  ChemicalSubtype,
  ComputedFieldConfig,
  DisplaySurface,
  EquipmentSubtype,
  EventRegistry,
  EventRegistryEntry,
  EventTypeCode,
  EventTypeName,
  FieldConfig,
  FieldFormatter,
  FieldValueType,
  GeneralSubtype,
  PestManagementSubtype,
  PhotoTier,
  PriorityTier,
  ProductionSubtype,
  ResolvedField,
  ResolvedFieldSet,
  SoilManagementSubtype,
  SubtypeEntry,
  VisibilityPredicate,
  WeatherSubtype
} from './registry';

export { EVENT_TYPE_CODE_TO_NAME, EVENT_TYPE_NAME_TO_CODE } from './registry';

// Resolver API
export {
  eventTypeFromCode,
  formatFieldValue,
  getFieldConfig,
  getFieldNamesForSurface,
  getFieldsForSurface,
  getPhotoTier,
  getRegistryEntry,
  getSubtypes,
  isFieldOnSurface,
  isFieldVisible,
  isRegistryInitialized
} from './resolver';

// Surface rules
export {
  DISPLAY_SURFACE_RULES,
  getSurfaceAllowedTiers,
  getSurfaceMaxFields,
  isConsumerSurface,
  isProducerSurface
} from './surfaces';

// Enum catalog
export type { EnumOption, EnumSourceKey } from './enums';
export { ENUM_OPTIONS, getEnumLabel, getEnumOptions } from './enums';

// Formatters (for use in per-event-type registry files)
export {
  defaultFormatter,
  formatArea,
  formatBoolean,
  formatCO2e,
  formatDate,
  formatDurationDays,
  formatDurationHours,
  formatFuelConsumption,
  formatIrrigationDepth,
  formatNPK,
  formatNumber,
  formatPercentage,
  formatTemperature,
  formatTransportationDistance,
  formatVolume,
  formatYield,
  makeEnumFormatter,
  makeUnitPairFormatter
} from './formatters';

// ============================================================================
// Registry assembly
// ============================================================================

/**
 * Equipment (type 4) was merged into Production subtype 'EM' (Equipment Maintenance), so the
 * UI no longer offers it when creating an event. It is NOT an empty placeholder any more:
 * pre-merge rows are still in the database and still render on the consumer timeline's full
 * record, and an empty `fields: []` made `getFieldsForSurface(4, …)` return nothing, which
 * dropped every one of them onto the legacy English-only display path.
 * See equipmentEvent.ts.
 */

const eventRegistry: EventRegistry = {
  weather: weatherEventRegistry,
  production: productionEventRegistry,
  chemical: chemicalEventRegistry,
  general: generalEventRegistry,
  equipment: equipmentEventRegistry,
  soil_management: soilEventRegistry,
  pest_management: pestEventRegistry,
  business: businessEventRegistry
};

// Initialize the resolver with the assembled registry
_setRegistry(eventRegistry);

/** Public accessor for the full registry (rarely needed — prefer resolver functions) */
export { eventRegistry };
