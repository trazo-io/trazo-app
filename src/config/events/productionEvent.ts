/**
 * Production Event Registry — Most Complex Event Type.
 *
 * 11 subtypes: PL(Planting), HA(Harvesting), IR(Irrigation), PR(Pruning),
 * TR(Transplanting), EM(Equipment Maintenance), CU(Cultivation), TH(Thinning),
 * PO(Pollination), PH(Post-Harvest), CM(Canopy Management).
 *
 * Highly subtype-conditional:
 * - IR: irrigation_method, irrigation_depth, pump_depth_ft, electricity_source, water_source
 * - HA/PH: harvest_quality_grade, brix_level, grain_moisture, yield_quantity/unit
 * - EM: equipment_type, equipment_operation_type (merged from deprecated EquipmentEvent)
 * - PL: seeds_source
 * - ALL: area_covered, fuel_consumed, fuel_unit, observation
 */

import type { EventRegistryEntry, FieldConfig, ProductionSubtype } from './registry';
import {
  formatArea,
  formatBoolean,
  formatDate,
  humanizeEnumFallback,
  lookupEnumLabel,
  formatDurationHours,
  formatFuelConsumption,
  formatIrrigationDepth,
  formatNumber,
  formatPercentage,
  formatTransportationDistance,
  formatYield,
  formatConsumerTemperatureControl
} from './formatters';

type ProductionData = Record<string, unknown>;

// Direct value→label maps so consumer-facing surfaces show proper labels
// (e.g. "Well/Groundwater", not the resolver's naive "Well Groundwater" humanization)
// and full method names (e.g. "Drip Irrigation") instead of raw enum codes.
const WATER_SOURCE_LABELS: Record<string, string> = {
  well_groundwater: 'Well/Groundwater',
  municipal: 'Municipal Water Supply',
  rainwater_harvesting: 'Rainwater Harvesting',
  irrigation_canal: 'Irrigation Canal/District',
  river_stream: 'River/Stream',
  pond_reservoir: 'Pond/Reservoir',
  recycled_water: 'Recycled/Reclaimed Water',
  other: 'Other'
};

const IRRIGATION_METHOD_LABELS: Record<string, string> = {
  drip: 'Drip Irrigation',
  micro_sprinkler: 'Micro-sprinkler',
  sprinkler: 'Sprinkler System',
  center_pivot: 'Center Pivot',
  flood: 'Flood/Furrow',
  furrow: 'Furrow',
  subsurface: 'Subsurface Drip',
  sub_irrigation: 'Subsurface Drip',
  hand_watering: 'Hand Watering',
  rain_fed: 'Rain-fed',
  other: 'Other'
};

const ELECTRICITY_SOURCE_LABELS: Record<string, string> = {
  grid: 'Grid Electricity',
  solar: 'Solar',
  wind: 'Wind',
  diesel_generator: 'Diesel Generator',
  mixed: 'Mixed Sources'
};

const EQUIPMENT_OPERATION_TYPE_LABELS: Record<string, string> = {
  FC: 'Fuel Consumption',
  MN: 'Maintenance',
  RE: 'Repair',
  CA: 'Calibration',
  BD: 'Breakdown',
  EI: 'Inspection',
  CL: 'Cleaning'
};

// Equipment type labels — match ProductionTab.jsx EQUIPMENT_TYPES (sans emoji).
// Default split-capitalize loses preferred labels: "harvester" → "Harvester" OK,
// but "other" → "Other" alone is uninformative; map to "Other Equipment".
const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  tractor: 'Tractor',
  harvester: 'Harvester / Combine',
  sprayer: 'Sprayer',
  truck: 'Truck / Transport',
  generator: 'Generator',
  pump: 'Irrigation Pump',
  other: 'Other Equipment'
};

const GROWTH_STAGE_LABELS: Record<string, string> = {
  dormant: 'Dormant',
  budbreak: 'Bud Break',
  bloom: 'Bloom / Flowering',
  fruit_set: 'Fruit Set',
  vegetative: 'Vegetative Growth',
  maturation: 'Maturation / Ripening',
  harvest_ready: 'Harvest Ready',
  post_harvest: 'Post Harvest'
};

// Structured harvest method dropdown (HA subtype). ProductionTab.jsx stores this
// as `harvest_method`; eventDataNormalizer mirrors it to both top-level
// `harvest_method` and `extra_data.harvest_method`. It is conceptually distinct
// from `method` (free-text `production_method`, used for manual-operation carbon
// detection via keyword match) — both can coexist on the same event.
const HARVEST_METHOD_LABELS: Record<string, string> = {
  hand_picking: 'Hand Picking',
  selective_hand_picking: 'Selective Hand Picking',
  mechanical: 'Mechanical Harvester',
  shake_and_catch: 'Shake and Catch',
  strip_picking: 'Strip Picking',
  manual: 'Manual Harvest',
  mixed: 'Mixed (Manual + Mechanical)'
};

// Post-Harvest processing type dropdown (PH subtype).
// Mirrors ProductionTab.jsx:1854-1887 options (emojis stripped for consumer display).
const PROCESSING_TYPE_LABELS: Record<string, string> = {
  washing: 'Washing',
  cooling: 'Cooling / Pre-cooling',
  drying: 'Drying',
  sorting: 'Sorting',
  grading: 'Grading',
  packing: 'Packing',
  hulling: 'Hulling',
  shelling: 'Shelling',
  pressing: 'Pressing',
  milling: 'Milling',
  smoking: 'Smoking'
};

// Harvest grade, in a SHOPPER's words. To a grower and a buyer "Grade B" is a precise
// size/appearance sorting class; on a consumer card it reads as "this food is second-rate",
// which is untrue and damaging to the farmer whose page it is. Producer surfaces keep the
// trade term via the shared `formatter`; only consumer surfaces get these.
// English by design (the resolver has no `intl`); es lives in utils/fieldValues.es.ts.
const CONSUMER_HARVEST_GRADE_LABELS: Record<string, string> = {
  export_quality: 'Meets export size and appearance standards',
  grade_a: 'Top grade, best size and appearance',
  grade_b: 'Sold for juice or processing, same quality inside',
  grade_c: 'Sold for processing, same quality inside',
  processing: 'Grown for juice or processing',
  organic_premium: 'Organic premium grade'
};

// Falls back to a humanized form, never the raw database value — see
// formatters.humanizeEnumFallback. "manual" rendered as a bare slug on live cards.
const lookupLabel = (table: Record<string, string>, v: unknown): string | null =>
  lookupEnumLabel(table, v);

const formatConsumerHarvestGrade = (v: unknown): string | null =>
  lookupLabel(CONSUMER_HARVEST_GRADE_LABELS, v);
const formatWaterSource = (v: unknown): string | null => lookupLabel(WATER_SOURCE_LABELS, v);
const formatIrrigationMethod = (v: unknown): string | null =>
  lookupLabel(IRRIGATION_METHOD_LABELS, v);
const formatElectricitySource = (v: unknown): string | null =>
  lookupLabel(ELECTRICITY_SOURCE_LABELS, v);
const formatEquipmentOperationType = (v: unknown): string | null =>
  lookupLabel(EQUIPMENT_OPERATION_TYPE_LABELS, v);
const formatEquipmentType = (v: unknown): string | null => lookupLabel(EQUIPMENT_TYPE_LABELS, v);
const formatGrowthStage = (v: unknown): string | null => lookupLabel(GROWTH_STAGE_LABELS, v);
const formatHarvestMethod = (v: unknown): string | null => lookupLabel(HARVEST_METHOD_LABELS, v);
const formatProcessingType = (v: unknown): string | null => lookupLabel(PROCESSING_TYPE_LABELS, v);

// Batch 3 (2026-06): Frost Protection (FP) method + Mowing (MO) floor-management
// type dropdowns. Mirror ProductionTab.jsx option values.
const PROTECTION_METHOD_LABELS: Record<string, string> = {
  wind_machine: 'Wind machine',
  orchard_heater: 'Orchard heater(s)',
  under_tree_sprinkler: 'Under-tree sprinklers',
  other: 'Other'
};
// Orchard-floor operations. `flame_weed` added 2026-07: propane flame weeding of tree rows
// is a core organic weed-control practice — the UC Davis 2024 organic-almond cost study
// budgets six passes a year — and it had nowhere to be logged.
//
// `herbicide_strip` was removed from the FORM picker at the same time: Trazo's ICP is
// certified organic orchards, where a synthetic herbicide strip is prohibited under
// 7 CFR 205.105, so offering it is a wrong answer a grower could pick and then have to
// explain to their certifier. It stays in THIS map on purpose — display labels must keep
// covering values that already exist in the database, or previously-saved events render
// the raw slug "herbicide_strip" on the consumer card and in the audit modal.
const FLOOR_MANAGEMENT_LABELS: Record<string, string> = {
  mow: 'Mow',
  mulch: 'Mulch',
  cover_crop_mgmt: 'Cover-crop management',
  flame_weed: 'Flame weeding',
  herbicide_strip: 'Herbicide strip' // legacy value — no longer offered in the form
};
const formatProtectionMethod = (v: unknown): string | null =>
  lookupLabel(PROTECTION_METHOD_LABELS, v);
const formatFloorManagementType = (v: unknown): string | null =>
  lookupLabel(FLOOR_MANAGEMENT_LABELS, v);

const PRODUCTION_FIELDS: readonly FieldConfig<unknown, ProductionData>[] = [
  // ---- Core identity (ALL subtypes) ----
  {
    name: 'name',
    labelKey: 'events.production.fields.name',
    valueType: 'string',
    surfaces: {
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      preview: 'hero',
      consumer_card: 'hero'
    }
  },
  {
    name: 'area_covered',
    labelKey: 'events.common.fields.areaCovered',
    valueType: 'number',
    unitField: 'area_unit',
    formatter: formatArea,
    surfaces: {
      timeline: 'hero',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      quick_form: 'immediate',
      preview: 'immediate',
      consumer_card: 'immediate',
      consumer_timeline: 'immediate'
    }
  },

  // ---- Yield (HA, PH, PL) ----
  {
    name: 'yield_quantity',
    labelKey: 'events.production.fields.yieldQuantity',
    valueType: 'number',
    unitField: 'yield_unit',
    formatter: formatYield,
    visibleForSubtypes: ['HA', 'PH', 'PL'],
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      quick_form: 'immediate',
      consumer_card: 'immediate',
      consumer_timeline: 'immediate'
    }
  },

  // ---- Harvest quality (HA, PH) ----
  {
    name: 'harvest_quality_grade',
    labelKey: 'events.production.fields.harvestQuality',
    // "Quality Grade: Grade B" reads to a shopper as "this food is second-rate". It is a
    // size/appearance sorting class, not a judgement about the food. See the value labels
    // in enums.ts (events.consumer.harvestQuality.*).
    consumerLabelKey: 'events.consumer.fields.harvestQuality',
    consumerFormatter: formatConsumerHarvestGrade,
    valueType: 'enum',
    enumSource: 'harvest_quality_grades',
    visibleForSubtypes: ['HA', 'PH'],
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  // Structured harvest method (hand_picking, mechanical, etc.) — distinct from
  // the `method` field defined later in this registry, which stores the free-text
  // `production_method`. Before this entry, the HA dropdown value never reached
  // the registry-driven preview/modal — only legacy fieldDisplayUtils rendered
  // it. Consumers saw `method` ("Operation Method") but not the structured
  // harvest_method.
  {
    name: 'harvest_method',
    labelKey: 'events.production.fields.harvestMethod',
    valueType: 'enum',
    formatter: formatHarvestMethod,
    visibleForSubtypes: ['HA'],
    surfaces: {
      modal: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    // Brix only makes sense when farmer actually measured it. Hide when null/0
    // so it doesn't clutter previews for crops where Brix is irrelevant
    // (e.g. avocado — dry matter % is the relevant ripeness metric, not Brix).
    name: 'brix_level',
    labelKey: 'events.production.fields.brixLevel',
    // Brix is standard trade vocabulary for a grower and a buyer, and jargon to a shopper —
    // it is simply sugar content.
    consumerLabelKey: 'events.consumer.fields.brixLevel',
    valueType: 'number',
    visibleForSubtypes: ['HA', 'PH'],
    formatter: (v) => {
      if (v == null || v === '') return null;
      const num = typeof v === 'number' ? v : parseFloat(String(v));
      if (!isFinite(num) || num <= 0) return null;
      return `${num}° Brix`;
    },
    // Relabelling alone left "Sugar content: 12.5° Brix" — half-translated, with the jargon
    // still in the value. Degrees Brix ≈ % sugar by weight, which is the form a shopper can
    // actually use.
    consumerFormatter: (v) => {
      if (v == null || v === '') return null;
      const num = typeof v === 'number' ? v : parseFloat(String(v));
      if (!isFinite(num) || num <= 0) return null;
      return `${num}%`;
    },
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    // F43: dry-matter % — the maturity metric for avocado & nuts (the CA orchard ICP). Hidden when
    // null/0 (registry can't read crop metadata), so citrus/grain harvests don't show an empty row.
    name: 'dry_matter_percentage',
    labelKey: 'events.production.fields.dryMatterPercentage',
    valueType: 'number',
    visibleForSubtypes: ['HA', 'PH'],
    formatter: (v) => {
      if (v == null || v === '') return null;
      const num = typeof v === 'number' ? v : parseFloat(String(v));
      if (!isFinite(num) || num <= 0) return null;
      return `${num}%`;
    },
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    // Grain moisture is only relevant for grain crops (corn, wheat, rice,
    // soybean, etc.). Fruit/vegetable/nut harvests should NOT display this.
    // Since the registry can't access crop metadata, hide when null/0 — that
    // covers the typical "AI/template autofill for non-grain crop" noise case.
    // Farmers entering a real grain moisture value (>0) will still display it.
    name: 'grain_moisture',
    labelKey: 'events.production.fields.grainMoisture',
    valueType: 'number',
    visibleForSubtypes: ['HA'],
    formatter: (v) => {
      if (v == null || v === '') return null;
      const num = typeof v === 'number' ? v : parseFloat(String(v));
      if (!isFinite(num) || num <= 0) return null;
      return `${num}%`;
    },
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },

  // ---- Planting (PL) ----
  {
    name: 'seeds_source',
    labelKey: 'events.production.fields.seedsSource',
    valueType: 'enum',
    enumSource: 'seeds_sources',
    visibleForSubtypes: ['PL'],
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      quick_form: 'immediate',
      consumer_card: 'immediate'
    }
  },

  // ---- NOP Compliance: Seed Commercial Availability Search (NOP 5029) ----
  {
    name: 'seed_search_attempts',
    labelKey: 'events.production.fields.seedSearchAttempts',
    valueType: 'text',
    visibleForSubtypes: ['PL'],
    // NOP 5029 commercial-availability search log embeds contacted-supplier identities —
    // commercially sensitive, producer/certifier-only. NO consumer_card surface (P0 leak fix,
    // mirrors chemical supplier_name; backend also strips it from the public payload).
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },

  // ---- NOP 7 CFR 205.204 — Seed Traceability (planting subtype) ----
  {
    name: 'seed_certification_status',
    labelKey: 'events.production.fields.seedCertificationStatus',
    valueType: 'enum',
    enumSource: 'seed_certification_statuses',
    visibleForSubtypes: ['PL'],
    surfaces: {
      card: 'secondary',
      modal: 'secondary',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'seed_supplier_name',
    labelKey: 'events.production.fields.seedSupplierName',
    valueType: 'text',
    visibleForSubtypes: ['PL'],
    // Seed vendor identity — producer/certifier-only. NO consumer_card surface (P0 leak fix).
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'seed_purchase_date',
    labelKey: 'events.production.fields.seedPurchaseDate',
    valueType: 'date',
    visibleForSubtypes: ['PL'],
    // Seed purchase record — producer/certifier-only. NO consumer_card surface (P0 leak fix).
    surfaces: {
      modal: 'details',
      form: 'secondary'
    }
  },
  {
    name: 'seed_purchase_invoice',
    labelKey: 'events.production.fields.seedPurchaseInvoice',
    valueType: 'text',
    visibleForSubtypes: ['PL'],
    // Seed invoice number — producer/certifier-only. NO consumer_card surface (P0 leak fix).
    surfaces: {
      modal: 'details',
      form: 'secondary'
    }
  },
  {
    name: 'seed_lot_number',
    labelKey: 'events.production.fields.seedLotNumber',
    valueType: 'text',
    visibleForSubtypes: ['PL'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'seed_treatment',
    labelKey: 'events.production.fields.seedTreatment',
    valueType: 'text',
    visibleForSubtypes: ['PL'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },

  // ---- Irrigation (IR) ----
  {
    name: 'water_source',
    labelKey: 'events.production.fields.waterSource',
    valueType: 'enum',
    enumSource: 'water_sources',
    formatter: formatWaterSource,
    visibleForSubtypes: ['IR'],
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      quick_form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'irrigation_method',
    labelKey: 'events.production.fields.irrigationMethod',
    valueType: 'enum',
    enumSource: 'irrigation_methods',
    formatter: formatIrrigationMethod,
    visibleForSubtypes: ['IR'],
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      quick_form: 'immediate',
      consumer_card: 'immediate',
      consumer_timeline: 'immediate'
    }
  },
  {
    name: 'irrigation_depth',
    labelKey: 'events.production.fields.irrigationDepth',
    valueType: 'number',
    unitField: 'irrigation_depth_unit',
    formatter: formatIrrigationDepth,
    visibleForSubtypes: ['IR'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      quick_form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'pump_depth_ft',
    labelKey: 'events.production.fields.pumpDepth',
    valueType: 'number',
    visibleForSubtypes: ['IR'],
    formatter: (v) => (v != null ? `${v} ft` : null),
    carbonRelevant: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'electricity_source',
    labelKey: 'events.production.fields.electricitySource',
    valueType: 'enum',
    enumSource: 'electricity_sources',
    formatter: formatElectricitySource,
    visibleForSubtypes: ['IR'],
    carbonRelevant: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    // NOP irrigation/well water test (7 CFR 205.272 / 205.671) — CCOF water-quality
    // record. Producer/certifier-only; NO consumer_card surface (backend keeps it out
    // of the public payload).
    name: 'water_test_date',
    labelKey: 'events.production.fields.waterTestDate',
    valueType: 'date',
    visibleForSubtypes: ['IR'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'water_test_lab',
    labelKey: 'events.production.fields.waterTestLab',
    valueType: 'string',
    visibleForSubtypes: ['IR'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },

  // ---- Equipment Maintenance (EM — merged from deprecated EquipmentEvent type 4) ----
  {
    name: 'equipment_type',
    labelKey: 'events.production.fields.equipmentType',
    valueType: 'enum',
    enumSource: 'equipment_types',
    formatter: formatEquipmentType,
    visibleForSubtypes: ['EM'],
    surfaces: {
      timeline: 'immediate',
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'equipment_operation_type',
    labelKey: 'events.production.fields.equipmentOperationType',
    valueType: 'enum',
    formatter: formatEquipmentOperationType,
    visibleForSubtypes: ['EM'],
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },

  // ---- NOP Compliance: Equipment Cleaning Logs (7 CFR 205.272) ----
  // Two-tier subtype gating: EM is the model-level subtype; equipment_operation_type
  // is a second-tier discriminator. Cleaning fields apply ONLY when the EM event is
  // a Cleaning operation (CL), not Fuel Consumption (FC) / Maintenance (MN) / Repair
  // (RE) / Calibration (CA) / Breakdown (BD) / Equipment Inspection (EI). Without
  // visibleWhen, every EM event would render empty cleaning rows on the consumer card
  // and modal — Bug Pattern #6 territory for the boolean default=False shared field.
  // Form keeps the cleaning section gated by ProductionTab.jsx on the same predicate.
  {
    name: 'cleaning_date',
    labelKey: 'events.production.fields.cleaningDate',
    valueType: 'date',
    // Rendered as the raw ISO "2026-02-26" on the live consumer card until 2026-07-31.
    formatter: formatDate,
    visibleForSubtypes: ['EM'],
    visibleWhen: (e) => {
      // The normalizer converts equipment_operation_type from raw "CL" to display
      // "Cleaning" before the resolver runs, so accept both forms.
      const op = String(e.equipment_operation_type || '').toLowerCase();
      return op === 'cl' || op === 'cleaning';
    },
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'cleaning_method',
    labelKey: 'events.production.fields.cleaningMethod',
    placeholderKey: 'events.production.fields.cleaningMethodPlaceholder',
    valueType: 'string',
    visibleForSubtypes: ['EM'],
    visibleWhen: (e) => {
      // The normalizer converts equipment_operation_type from raw "CL" to display
      // "Cleaning" before the resolver runs, so accept both forms.
      const op = String(e.equipment_operation_type || '').toLowerCase();
      return op === 'cl' || op === 'cleaning';
    },
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'cleaning_materials_used',
    labelKey: 'events.production.fields.cleaningMaterialsUsed',
    placeholderKey: 'events.production.fields.cleaningMaterialsPlaceholder',
    valueType: 'string',
    visibleForSubtypes: ['EM'],
    visibleWhen: (e) => {
      // The normalizer converts equipment_operation_type from raw "CL" to display
      // "Cleaning" before the resolver runs, so accept both forms.
      const op = String(e.equipment_operation_type || '').toLowerCase();
      return op === 'cl' || op === 'cleaning';
    },
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'cleaned_by',
    labelKey: 'events.production.fields.cleanedBy',
    valueType: 'string',
    visibleForSubtypes: ['EM'],
    visibleWhen: (e) => {
      // The normalizer converts equipment_operation_type from raw "CL" to display
      // "Cleaning" before the resolver runs, so accept both forms.
      const op = String(e.equipment_operation_type || '').toLowerCase();
      return op === 'cl' || op === 'cleaning';
    },
    // NO consumer_card: this is free text naming a real person ("Miguel Ramirez
    // (Farm Manager)" in live data) and it rendered on the public product page until
    // 2026-07-31. `performed_by` is masked to initials and `applicator_name` is stripped
    // for exactly this reason. Also stripped server-side (PublicHistorySerializer).
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    // Bug Pattern #6 — BooleanField(default=False) renders ✗ on every EM event
    // without visibleWhen. Surface only when the event IS a cleaning op AND the
    // value is truthy (positive transparency signal: "this equipment was shared
    // with a conventional operation, here's our cleaning evidence"). The OR-clause
    // covers legacy data that may have flagged shared without yet setting CL.
    name: 'shared_with_conventional',
    labelKey: 'events.production.fields.sharedWithConventional',
    valueType: 'boolean',
    visibleForSubtypes: ['EM'],
    visibleWhen: (e) => {
      // shared_with_conventional is a BooleanField(default=False) — only render
      // when truthy. Bug Pattern #6.
      return e.shared_with_conventional === true || e.shared_with_conventional === 'true';
    },
    formatter: formatBoolean,
    // A bare "✓" for what is arguably the strongest integrity disclosure on the page.
    // `visibleWhen` already restricts this to the TRUE case, so the consumer form can be a
    // plain sentence — and saying it outright is better for the farmer than a tick a shopper
    // has to decode.
    consumerFormatter: () => 'Yes — and it was cleaned before use here',
    requiresVerificationBadge: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    // §E-5 — a custom operator's equipment arrives from another farm, which is precisely the
    // § 205.272 commingling exposure. NOT gated to EM: the flag belongs on the OPERATION that
    // was custom-hired (harvest, mowing, shredding), not on the cleaning record.
    // Bug Pattern #6 — BooleanField(default=False) never returns null, so gate on truthy or
    // every self-performed pass would print "Custom Operator: No" as negative noise.
    name: 'operator_is_custom',
    labelKey: 'events.production.fields.operatorIsCustom',
    helpKey: 'events.production.fields.operatorIsCustomHelp',
    valueType: 'boolean',
    visibleWhen: (e) => e.operator_is_custom === true || e.operator_is_custom === 'true',
    formatter: formatBoolean,
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'cleaning_protocol_reference',
    labelKey: 'events.production.fields.cleaningProtocolReference',
    valueType: 'string',
    visibleForSubtypes: ['EM'],
    visibleWhen: (e) => {
      // The normalizer converts equipment_operation_type from raw "CL" to display
      // "Cleaning" before the resolver runs, so accept both forms.
      const op = String(e.equipment_operation_type || '').toLowerCase();
      return op === 'cl' || op === 'cleaning';
    },
    placeholderKey: 'events.production.fields.cleaningProtocolReferencePlaceholder',
    // NO consumer_card: an internal SOP identifier ("SOP-CLEAN-001 (NOP 205.272
    // Compliance)") is an operator document reference, meaningless to a shopper.
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },

  // ---- Post-Harvest Sanitizer detail (EM subtype, 7 CFR 205.272 + § 205.605) ----
  {
    name: 'sanitizer_name',
    labelKey: 'events.production.fields.sanitizerName',
    valueType: 'string',
    // "Chlorine (sodium hypochlorite)" rendered bare on a certified-organic avocado card.
    // It is accurate AND permitted — NOP § 205.605 lists chlorine materials for post-harvest
    // water — but with no context it reads as contamination. Withholding it would be worse
    // (a shopper deserves to know what touched the food), so explain it instead.
    consumerFormatter: (v) => {
      if (typeof v !== 'string' || !v.trim()) return null;
      if (/chlorine|hypochlorite/i.test(v)) {
        return 'Chlorine — the same treatment used in drinking water, and permitted for washing organic produce';
      }
      if (/peroxyacetic|peracetic|hydrogen peroxide/i.test(v)) {
        return `${v.trim()} — a peroxide-based wash that breaks down into water and oxygen`;
      }
      return v.trim();
    },
    visibleForSubtypes: ['EM', 'PH'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'sanitizer_ppm',
    labelKey: 'events.production.fields.sanitizerPpm',
    valueType: 'number',
    visibleForSubtypes: ['EM', 'PH'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    // NOP 5026 — residual chlorine at discharge vs SDWA MRDL (certifier detail).
    name: 'sanitizer_residual_ppm_at_discharge',
    labelKey: 'events.production.fields.sanitizerResidualPpm',
    placeholderKey: 'events.production.fields.sanitizerResidualPpmPlaceholder',
    valueType: 'number',
    visibleForSubtypes: ['EM', 'PH'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'rinse_step_documented',
    labelKey: 'events.production.fields.rinseStepDocumented',
    valueType: 'boolean',
    visibleForSubtypes: ['EM', 'PH'],
    // Bug Pattern #6 — BooleanField(default=False); gate on truthy + cleaning op.
    // Two-tier predicate (CL operation AND rinse_step_documented=true) so non-cleaning
    // EM events don't pollute, and Cleaning events without the rinse step don't ✗-spam.
    visibleWhen: (e) => {
      const op = String(e.equipment_operation_type || '').toLowerCase();
      const isCleaning = op === 'cl' || op === 'cleaning';
      const truthy = e.rinse_step_documented === true || e.rinse_step_documented === 'true';
      return isCleaning && truthy;
    },
    formatter: formatBoolean,
    consumerFormatter: () => 'Yes — equipment was rinsed after sanitising',
    requiresVerificationBadge: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'sanitizer_nop_reference',
    labelKey: 'events.production.fields.sanitizerNopReference',
    valueType: 'string',
    visibleForSubtypes: ['EM', 'PH'],
    // NO consumer_card: the value is a raw CFR citation ("§ 205.605(b) - Sodium
    // hypochlorite"). transparency-first.md bans raw regulatory citations on consumer
    // surfaces — it is the certifier's vocabulary, not a shopper's. The substance itself
    // (sanitizer_name / sanitizer_ppm) still shows; only the citation is withheld.
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },

  // ---- Post-Harvest Processing (PH subtype) ----
  // Form-captured fields that were missing from the registry — restricted to PH
  // so they don't bleed into other production previews. Backend stores these
  // in `extra_data`; formatters fall back there so the Event Details Modal
  // (which reads raw API data without normalizer) also renders them.
  {
    name: 'processing_type',
    labelKey: 'events.production.fields.processingType',
    valueType: 'enum',
    formatter: (v, event) => {
      const raw =
        (typeof v === 'string' && v) || ((event as any)?.extra_data?.processing_type ?? null);
      return formatProcessingType(raw);
    },
    visibleForSubtypes: ['PH'],
    surfaces: {
      timeline: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate',
      consumer_timeline: 'immediate'
    }
  },
  {
    name: 'processing_duration_hours',
    labelKey: 'events.production.fields.processingDurationHours',
    valueType: 'number',
    formatter: (v, event) => {
      const raw = v ?? (event as any)?.extra_data?.processing_duration_hours ?? null;
      return formatDurationHours(raw as number | string);
    },
    visibleForSubtypes: ['PH'],
    surfaces: {
      timeline: 'immediate',
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary',
      consumer_timeline: 'immediate'
    }
  },
  {
    // Bug Pattern #6 — BooleanField(default=False). PH events that don't use
    // temperature control (sorting, grading, drying) shouldn't render "Temperature
    // Control: ✗" as noise. Only surface when truthy (positive transparency:
    // "cold-chain maintained at 40°F"). Predicate handles top-level + extra_data
    // fallback to mirror the formatter.
    name: 'temperature_control',
    labelKey: 'events.production.fields.temperatureControl',
    // "✓" told a shopper nothing; cold chain is one of the few post-harvest facts they can
    // actually use.
    consumerLabelKey: 'events.consumer.fields.temperatureControl',
    consumerFormatter: formatConsumerTemperatureControl,
    valueType: 'boolean',
    formatter: (v, event) => {
      const raw =
        v != null && v !== '' ? v : (event as any)?.extra_data?.temperature_control ?? null;
      return formatBoolean(raw as boolean | string);
    },
    visibleForSubtypes: ['PH'],
    visibleWhen: (e) => {
      const top = e.temperature_control;
      const ed = (e.extra_data as Record<string, unknown> | undefined)?.temperature_control;
      const truthy = (v: unknown) => v === true || v === 'true';
      return truthy(top) || truthy(ed);
    },
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },

  // ---- Frost Protection (FP) + Mowing/Orchard-Floor (MO) — Batch 3 (2026-06) ----
  // Backend stores these in extra_data; formatters fall back there so the Event
  // Details Modal (raw API data, no normalizer) also renders them. These are
  // consumer-relevant practice signals (transparency-first), so they surface on
  // the consumer card too.
  {
    name: 'protection_method',
    labelKey: 'events.production.fields.protectionMethod',
    valueType: 'enum',
    formatter: (v, event) => {
      const raw =
        (typeof v === 'string' && v) || ((event as any)?.extra_data?.protection_method ?? null);
      return formatProtectionMethod(raw);
    },
    visibleForSubtypes: ['FP'],
    surfaces: {
      timeline: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate',
      consumer_timeline: 'immediate'
    }
  },
  {
    name: 'low_temperature',
    labelKey: 'events.production.fields.lowTemperature',
    valueType: 'number',
    formatter: (v, event) => {
      const raw = v ?? (event as any)?.extra_data?.low_temperature ?? null;
      if (raw === null || raw === '' || isNaN(Number(raw))) return null;
      return `${Number(raw)} °C`;
    },
    visibleForSubtypes: ['FP'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'floor_management_type',
    labelKey: 'events.production.fields.floorManagementType',
    valueType: 'enum',
    formatter: (v, event) => {
      const raw =
        (typeof v === 'string' && v) || ((event as any)?.extra_data?.floor_management_type ?? null);
      return formatFloorManagementType(raw);
    },
    visibleForSubtypes: ['MO'],
    surfaces: {
      timeline: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate',
      consumer_timeline: 'immediate'
    }
  },

  // ---- Fuel & carbon (ALL subtypes, carbon-relevant) ----
  {
    name: 'fuel_consumed',
    labelKey: 'events.common.fields.fuelConsumed',
    valueType: 'number',
    unitField: 'fuel_unit',
    formatter: formatFuelConsumption,
    carbonRelevant: true,
    surfaces: {
      timeline: 'immediate',
      modal: 'secondary',
      form: 'secondary',
      quick_form: 'secondary'
    }
  },
  {
    name: 'fuel_type',
    labelKey: 'events.common.fields.fuelType',
    valueType: 'enum',
    enumSource: 'fuel_types',
    carbonRelevant: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      quick_form: 'secondary'
    }
  },
  {
    name: 'equipment_hours',
    labelKey: 'events.common.fields.equipmentHours',
    valueType: 'number',
    formatter: formatDurationHours,
    carbonRelevant: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    // Transportation distance is only meaningful for subtypes that actually
    // involve moving crop off-parcel: Harvest (HA, bin → shed), Post-Harvest
    // processing (PH, shed → packing), and Equipment Maintenance (EM, shop
    // round trips). Restricting visibility prevents the field from appearing
    // on Planting/Irrigation/Pruning previews where it's not applicable.
    name: 'transportation_distance',
    labelKey: 'events.production.fields.transportationDistance',
    valueType: 'number',
    unitField: 'transportation_unit',
    formatter: formatTransportationDistance,
    visibleForSubtypes: ['HA', 'PH', 'EM'],
    carbonRelevant: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },

  // ---- Efficiency & context ----
  {
    name: 'production_efficiency',
    labelKey: 'events.common.fields.productionEfficiency',
    valueType: 'enum',
    enumSource: 'production_efficiency',
    // NO consumer_card. This rendered as "Efficiency: High" / "Efficiency: Normal" on the
    // live card — a grade the farmer awards their own operation, with no scale, no basis and
    // no meaning to a shopper. It fails all three consumer-card questions, and a self-assigned
    // rating on a consumer surface is the category the 2026-06 score demotion removed
    // (EU ECGT 2024/825 / FTC 16 CFR 260.6). It stays on modal/form as a producer's own note.
    // equipmentEvent.ts already excluded its twin `operation_efficiency` for this reason.
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    // See weatherEvent.ts for the full rationale: modal surface omitted so
    // the Field Notes top card isn't duplicated in the Detailed Information grid.
    name: 'observation',
    labelKey: 'events.common.fields.observation',
    valueType: 'text',
    surfaces: {
      form: 'details',
      preview: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'performed_by',
    labelKey: 'events.common.fields.performedBy',
    valueType: 'string',
    surfaces: { modal: 'details', form: 'details' }
  },
  // Operation method (e.g. "Hand thinning", "Pruning shears", "Mechanical harvester").
  // Stored as extra_data.method on the backend; normalizer (eventDataNormalizer.ts)
  // bridges the form field `production_method` → `extra_data.method` so this entry
  // matches both paths. This field is a key transparency signal: hand labor triggers
  // the manual-operation carbon calculator (~0.1 kg CO₂e/acre) instead of USDA
  // mechanical averages, so it deserves immediate visibility for manual-capable subtypes.
  {
    name: 'method',
    labelKey: 'events.production.fields.operationMethod',
    valueType: 'string',
    // HA removed 2026-08-01: harvest cards already carry the STRUCTURED
    // `harvest_method` ("Hand Picking"), so this rendered a second, vaguer row
    // ("Operation Method: manual") saying the same thing.
    visibleForSubtypes: ['PR', 'TR', 'CU', 'TH', 'CM'],
    // Backend stores operation method in `extra_data.method`. The form-preview
    // path mirrors it to top-level via eventDataNormalizer, but the Event Details
    // modal reads raw API data (no normalizer in that path). Fall back to
    // extra_data.method so the field renders in both paths.
    formatter: (v, event) => {
      const topLevel = typeof v === 'string' && v.trim() ? v : null;
      const extra = (event as any)?.extra_data?.method;
      const fallback = typeof extra === 'string' && extra.trim() ? extra : null;
      // Humanize: this is free text, and the raw value "manual" rendered lowercase next to
      // Title Case labels. Because a formatter EXISTS, the resolver's own auto-capitalize
      // branch never runs — the formatter has to do it.
      return humanizeEnumFallback(topLevel ?? fallback);
    },
    surfaces: {
      modal: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    // Variety (e.g. "Hass" for avocado) is a harvest-level attribute. It makes
    // sense for Harvest (HA), Post-Harvest processing (PH), and Planting (PL,
    // farmer is declaring the variety being planted). Restricting prevents it
    // from bleeding into IR/PR/CU/TH previews where it adds noise.
    name: 'variety',
    labelKey: 'events.common.fields.variety',
    valueType: 'string',
    visibleForSubtypes: ['HA', 'PH', 'PL'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'growth_stage',
    labelKey: 'events.common.fields.growthStage',
    valueType: 'enum',
    enumSource: 'growth_stages',
    formatter: formatGrowthStage,
    surfaces: { modal: 'details', form: 'secondary' }
  },
  {
    name: 'block_id',
    labelKey: 'events.common.fields.blockId',
    valueType: 'string',
    surfaces: { modal: 'details', form: 'details' }
  }
];

export const productionEventRegistry: EventRegistryEntry<ProductionSubtype, ProductionData> = {
  eventType: 1,
  eventTypeName: 'production',
  labelKey: 'events.types.production',
  subtypes: [
    { code: 'PL', labelKey: 'events.production.subtypes.planting', photoTier: 'essential' },
    { code: 'HA', labelKey: 'events.production.subtypes.harvesting', photoTier: 'essential' },
    { code: 'IR', labelKey: 'events.production.subtypes.irrigation', photoTier: 'optional' },
    { code: 'PR', labelKey: 'events.production.subtypes.pruning', photoTier: 'recommended' },
    { code: 'TR', labelKey: 'events.production.subtypes.transplanting', photoTier: 'recommended' },
    {
      code: 'EM',
      labelKey: 'events.production.subtypes.equipmentMaintenance',
      photoTier: 'optional'
    },
    { code: 'CU', labelKey: 'events.production.subtypes.cultivation', photoTier: 'recommended' },
    { code: 'TH', labelKey: 'events.production.subtypes.thinning', photoTier: 'optional' },
    { code: 'PO', labelKey: 'events.production.subtypes.pollination', photoTier: 'optional' },
    { code: 'PH', labelKey: 'events.production.subtypes.postHarvest', photoTier: 'optional' },
    { code: 'CM', labelKey: 'events.production.subtypes.canopyManagement', photoTier: 'optional' },
    // Batch 3 (2026-06): Scope-1 fuel ops
    { code: 'FP', labelKey: 'events.production.subtypes.frostProtection', photoTier: 'optional' },
    { code: 'MO', labelKey: 'events.production.subtypes.mowing', photoTier: 'optional' }
  ],
  defaultPhotoTier: 'recommended',
  fields: PRODUCTION_FIELDS
};
