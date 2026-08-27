/**
 * Production Event Registry — Most Complex Event Type.
 *
 * 16 subtypes: PL(Planting), HA(Harvesting), IR(Irrigation), PR(Pruning),
 * TR(Transplanting), EM(Equipment Maintenance), CU(Cultivation), TH(Thinning),
 * PO(Pollination), PH(Post-Harvest), CM(Canopy Management), FP(Frost Protection),
 * MO(Mowing/Orchard-Floor), TP(Transport), BU(Buffer Use), SS(Seed Search).
 *
 * This count is the one `history/models.py` PRODUCTION_EVENTS declares — the two lists are
 * held together by __tests__/productionSubtypeCoverage.test.ts, because the last three were
 * added to the backend and to the form while this file still said eleven.
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
  formatConsumerTemperatureControl,
  formatSeedSearchAttempts,
  formatWaterTestResults
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

/**
 * F5 (2026-08-21) — the USDA grade families, translated for a shopper.
 *
 * The grade column now holds real packing-record grades ("U.S. No. 1", "WA Extra Fancy",
 * "U.S. Commercial") instead of Grade A/B/C. Those must NOT reach a consumer surface as
 * typed: "U.S. No. 2" reads to a shopper as second-rate food, which is the same reason the
 * A/B/C labels above were translated rather than printed. A grade is a size-and-appearance
 * sorting class; it says nothing about how the food eats.
 */
const CONSUMER_GRADE_TOP = 'Top size and appearance grade';
const CONSUMER_GRADE_STANDARD = 'Graded for size and appearance, same quality inside';
const CONSUMER_GRADE_PROCESSING = 'Grown for juice or processing, same quality inside';

const CONSUMER_GRADE_BUCKETS: Record<string, string> = {
  'U.S. Extra Fancy': CONSUMER_GRADE_TOP,
  'U.S. Fancy': CONSUMER_GRADE_TOP,
  'WA Extra Fancy': CONSUMER_GRADE_TOP,
  'WA Fancy': CONSUMER_GRADE_TOP,
  'U.S. Extra No. 1': CONSUMER_GRADE_TOP,
  'U.S. No. 1': CONSUMER_GRADE_TOP,
  'U.S. Extra Fancy Table': CONSUMER_GRADE_TOP,
  'U.S. Fancy Table': CONSUMER_GRADE_TOP,
  'U.S. No. 1 Table': CONSUMER_GRADE_TOP,
  'U.S. Grade A': CONSUMER_GRADE_TOP,
  'U.S. Grade A (Fancy)': CONSUMER_GRADE_TOP,
  'U.S. Utility': CONSUMER_GRADE_STANDARD,
  'U.S. Combination': CONSUMER_GRADE_STANDARD,
  'U.S. Commercial': CONSUMER_GRADE_STANDARD,
  'U.S. No. 1 Institutional': CONSUMER_GRADE_STANDARD,
  'U.S. No. 2': CONSUMER_GRADE_STANDARD,
  'U.S. No. 3': CONSUMER_GRADE_STANDARD,
  'U.S. No. 4': CONSUMER_GRADE_STANDARD,
  'U.S. No. 5': CONSUMER_GRADE_STANDARD,
  'U.S. Grade B': CONSUMER_GRADE_STANDARD,
  'U.S. Grade B (Choice)': CONSUMER_GRADE_STANDARD,
  'U.S. Grade C': CONSUMER_GRADE_STANDARD,
  'U.S. Grade C (Standard)': CONSUMER_GRADE_STANDARD,
  Processing: CONSUMER_GRADE_PROCESSING,
  Juice: CONSUMER_GRADE_PROCESSING,
  'Juice / Processing': CONSUMER_GRADE_PROCESSING,
  Manufacturing: CONSUMER_GRADE_PROCESSING,
  'Oil stock': CONSUMER_GRADE_PROCESSING,
  'U.S. Select Sheller Run': CONSUMER_GRADE_PROCESSING,
  'U.S. Standard Sheller Run': CONSUMER_GRADE_PROCESSING,
  'U.S. Sample grade': CONSUMER_GRADE_PROCESSING
};

// Falls back to a humanized form, never the raw database value — see
// formatters.humanizeEnumFallback. "manual" rendered as a bare slug on live cards.
const lookupLabel = (table: Record<string, string>, v: unknown): string | null =>
  lookupEnumLabel(table, v);

/**
 * A grade reaches a shopper only if we have a neutral sentence for it.
 *
 * Deliberately returns null — hiding the row — for anything unrecognised, instead of falling
 * back to `humanizeEnumFallback` like every other consumer formatter here. The grade column
 * now carries a free-text escape for private buyer grades, and a buyer's own word ("Premium",
 * "Fancy Pack", a packer's house grade) is a marketing claim the moment it appears on a
 * consumer page. The farmer's record keeps it; the shopper is shown nothing rather than an
 * unvetted superlative.
 */
const formatConsumerHarvestGrade = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const raw = v.trim();
  if (!raw) return null;
  return CONSUMER_HARVEST_GRADE_LABELS[raw] ?? CONSUMER_GRADE_BUCKETS[raw] ?? null;
};
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

/**
 * Did this buffer disposition put the crop into someone else's hands?
 *
 * § 205.202(c)'s proof obligation attaches only there. Accepts BOTH the raw enum value and the
 * normalizer's display label — the registry runs after normalization, and a predicate that
 * matched only the enum would silently hide the evidence fields on exactly the events that owe
 * them (see `feedback_visiblewhen_post_normalizer`).
 */
export const BUFFER_ENTERS_COMMERCE = (value: unknown): boolean => {
  const v = String(value || '').toLowerCase();
  return (
    v.includes('sold') ||
    v.includes('conventional') ||
    v.includes('livestock') ||
    v.includes('given away') ||
    v === 'given_away'
  );
};

/**
 * Subtype groups that own a shared block of columns.
 *
 * ⛔ These exist because the FORM and the DISPLAY registry were gating the same columns on
 * different subtype lists, and nothing compared them. `ProductionTab` has collected the seed
 * block for `['PL','TR','SS']` and the lot/buffer/handler blocks for `['HA','TP','BU']` /
 * `['HA','BU']` / `['HA','TP']` since Batch 4 shipped (2026-08-19); every field below stayed
 * on the pre-Batch-4 lists `['PL','TR']` and `['HA']`. The result was a write-only record: a
 * Seed Search event saved eleven § 205.204(a)(1) columns and the detail modal rendered none of
 * them, because the resolver found no field visible for `SS` and returned an empty set. Same
 * for Transport (handler columns) and Buffer Use (disposition columns).
 *
 * Seen 2026-08-22 on a live SS event: title, field note, Performed By, Block — and nothing
 * else. The supplier names, the three documented attempts, the purchase invoice and the
 * non-availability reason were all in the row. The commercial-availability search is the ONLY
 * reason the subtype exists, and it was the part you could not see.
 *
 * `SEED_SOURCED` mirrors `SEED_SOURCED_SUBTYPES` in `common/field_registry.py` — keep them
 * byte-identical. The other three mirror the `RECORDS_*` gates in `ProductionTab`.
 * `subtypeGateParity.test.ts` fails if any of the four drifts from the form.
 */
const SEED_SOURCED: ProductionSubtype[] = ['PL', 'TR', 'SS'];

/**
 * The subtypes for which "area covered" is a real question — field operations.
 * EM (equipment cleaning), PO (a hive placement), TP (a load moving), BU (the
 * disposition of buffer-row crop) and SS (a sourcing-paperwork record) cover no
 * acreage; asking for one writes a value no display surface will ever show, and
 * the backend refuses area <= 0 for exactly these types. Exported so the
 * ProductionTab form and this registry cannot gate the question differently
 * (guard: __tests__/areaGateParity.test.ts).
 */
export const AREA_SUBTYPES: ProductionSubtype[] = [
  'PL',
  'HA',
  'IR',
  'PR',
  'TR',
  'CU',
  'TH',
  'PH',
  'CM',
  'FP',
  'MO'
];
const RECORDS_LOT_DISPOSITION: ProductionSubtype[] = ['HA', 'TP', 'BU'];
const RECORDS_BUFFER: ProductionSubtype[] = ['HA', 'BU'];
const RECORDS_HANDLER: ProductionSubtype[] = ['HA', 'TP'];

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
    // Mirrors ProductionTab's own gate, `!['EM','PO'].includes(productionType)`. Equipment
    // cleaning and pollination are not AREA operations — a hive placement covers no acreage —
    // so declaring area for them put a value on two modals that no input could set or clear.
    name: 'area_covered',
    visibleForSubtypes: AREA_SUBTYPES,
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

  // ---- WS-4 harvest-record completeness (HA) — producer surfaces only.
  // Certifier/audit data (§ 205.103(b)(2); § 205.202(c)); fails the consumer
  // three-question test, so no consumer_card. ----
  {
    // Producer-facing only. The lot code is how a SALE is traced back to a pick
    // (7 CFR 205.103(b)(2)) — it is an internal identifier for the operator and their
    // certifier, and it is not a claim, so it does not go to consumers.
    name: 'harvest_lot_code',
    labelKey: 'events.production.fields.harvestLotCode',
    valueType: 'string',
    visibleForSubtypes: RECORDS_LOT_DISPOSITION,
    surfaces: {
      timeline: 'immediate',
      form: 'immediate',
      modal: 'immediate',
      card: 'secondary'
    }
  },
  {
    name: 'amount_determination',
    labelKey: 'events.production.fields.amountDetermination',
    valueType: 'enum',
    enumSource: 'amount_determinations',
    visibleForSubtypes: RECORDS_LOT_DISPOSITION,
    surfaces: {
      form: 'immediate',
      modal: 'immediate'
    }
  },
  {
    // Where the load started and where it went. Both columns shipped with the TP subtype and
    // were declared on no display surface, so a Transport event — a record whose entire
    // subject is a load moving from one place to another — showed neither place.
    //
    // § 205.272(b)(1) turns on what the load touched between the two, which is why the
    // cleanout reference sits beside them; origin and destination are what identify WHICH
    // movement the cleanout belongs to.
    name: 'transport_origin',
    labelKey: 'events.production.fields.transportOrigin',
    valueType: 'string',
    visibleForSubtypes: ['TP'],
    surfaces: {
      timeline: 'immediate',
      form: 'secondary',
      modal: 'immediate'
    }
  },
  {
    // No consumer_card: a street address is the operation's own logistics, and publishing a
    // handler's address on an anonymous surface is the supplier-chain leak class
    // (`feedback_supplier_chain_leak`) — the same reason `seed_supplier_name` is withheld.
    name: 'transport_destination_address',
    labelKey: 'events.production.fields.transportDestination',
    valueType: 'string',
    visibleForSubtypes: ['TP'],
    surfaces: {
      form: 'secondary',
      modal: 'secondary'
    }
  },
  {
    name: 'harvest_date_end',
    labelKey: 'events.production.fields.harvestDateEnd',
    valueType: 'date',
    visibleForSubtypes: ['HA'],
    surfaces: {
      form: 'secondary',
      modal: 'secondary'
    }
  },
  {
    name: 'harvest_destination',
    labelKey: 'events.production.fields.harvestDestination',
    valueType: 'enum',
    enumSource: 'harvest_destinations',
    visibleForSubtypes: RECORDS_HANDLER,
    surfaces: {
      timeline: 'immediate',
      form: 'immediate',
      modal: 'immediate'
    }
  },

  // ---- Off-farm handling round trip (7 CFR 205.272 · CCOF G6.1) ----
  //
  // CCOF grower checklist item 6 asks four things about crop sent to another certified
  // operation: what you sent, where, when, and what you received back. Trazo could answer only
  // "where". These four answer the rest.
  //
  // Gated on the destination, not just the subtype: a lot stored on farm or sold field-run has
  // no handler round trip, and four permanently-blank inputs on every harvest is how a form
  // teaches growers to skip a section.
  //
  // Certifier + producer surfaces only. Pack-out figures and settlement references are
  // commercial data and fail all three consumer-card questions.
  {
    name: 'sent_to_handler_date',
    labelKey: 'events.production.fields.sentToHandlerDate',
    valueType: 'date',
    visibleForSubtypes: RECORDS_HANDLER,
    visibleWhen: (e) => String(e.harvest_destination || '') === 'handler',
    surfaces: { form: 'secondary', modal: 'secondary' }
  },
  {
    name: 'quantity_sent_to_handler',
    labelKey: 'events.production.fields.quantitySentToHandler',
    valueType: 'number',
    unitField: 'handler_quantity_unit',
    visibleForSubtypes: RECORDS_HANDLER,
    visibleWhen: (e) => String(e.harvest_destination || '') === 'handler',
    surfaces: { form: 'secondary', modal: 'secondary' }
  },
  {
    name: 'quantity_returned_from_handler',
    labelKey: 'events.production.fields.quantityReturnedFromHandler',
    valueType: 'number',
    // A SEPARATE unit from the one sent: hulling changes the unit (in-shell in, shelled out),
    // and reusing one unit field would force a conversion nobody measured.
    unitField: 'handler_return_unit',
    visibleForSubtypes: RECORDS_HANDLER,
    visibleWhen: (e) => String(e.harvest_destination || '') === 'handler',
    surfaces: { form: 'secondary', modal: 'secondary' }
  },
  {
    name: 'handler_document_reference',
    labelKey: 'events.production.fields.handlerDocumentReference',
    valueType: 'string',
    visibleForSubtypes: RECORDS_HANDLER,
    visibleWhen: (e) => String(e.harvest_destination || '') === 'handler',
    surfaces: { form: 'secondary', modal: 'secondary' }
  },
  {
    name: 'buffer_disposition',
    labelKey: 'events.production.fields.bufferDisposition',
    valueType: 'enum',
    enumSource: 'buffer_dispositions',
    visibleForSubtypes: RECORDS_BUFFER,
    surfaces: {
      timeline: 'immediate',
      form: 'secondary',
      modal: 'secondary'
    }
  },
  {
    // USDA's Buffer Crop Disposition Record: "Commercial quantities of crops require more
    // formal documentation (delivery tags and nonorganic sales records) to show that the
    // buffer crop has not been represented as organic." § 205.202(c).
    //
    // Shown only for dispositions that put the crop into someone else's hands. A crop disked
    // under or left in the field cannot be mis-sold, and asking for paperwork there would be
    // Trazo inventing a requirement.
    //
    // The normalizer may have swapped the raw enum for its display label before this runs
    // (see storage_location below), so match on BOTH forms rather than the enum alone.
    name: 'buffer_disposition_quantity',
    labelKey: 'events.production.fields.bufferDispositionQuantity',
    valueType: 'string',
    visibleForSubtypes: RECORDS_BUFFER,
    visibleWhen: (e) => BUFFER_ENTERS_COMMERCE(e.buffer_disposition),
    surfaces: {
      timeline: 'immediate',
      form: 'secondary',
      modal: 'secondary'
    }
  },
  {
    name: 'buffer_disposition_evidence',
    labelKey: 'events.production.fields.bufferDispositionEvidence',
    valueType: 'string',
    visibleForSubtypes: RECORDS_BUFFER,
    visibleWhen: (e) => BUFFER_ENTERS_COMMERCE(e.buffer_disposition),
    surfaces: {
      form: 'secondary',
      modal: 'secondary'
    }
  },
  {
    name: 'storage_location',
    labelKey: 'events.production.fields.storageLocation',
    valueType: 'string',
    visibleForSubtypes: RECORDS_HANDLER,
    // Normalizer may have swapped the raw enum for its display label, so accept both
    // 'stored' and 'Stored on farm'.
    visibleWhen: (e) =>
      String(e.harvest_destination || '')
        .toLowerCase()
        .startsWith('stored'),
    surfaces: {
      form: 'secondary',
      modal: 'secondary'
    }
  },
  {
    name: 'storage_temperature_f',
    labelKey: 'events.production.fields.storageTemperatureF',
    valueType: 'number',
    visibleForSubtypes: RECORDS_HANDLER,
    visibleWhen: (e) =>
      String(e.harvest_destination || '')
        .toLowerCase()
        .startsWith('stored'),
    surfaces: {
      form: 'secondary',
      modal: 'secondary'
    }
  },
  {
    name: 'harvest_contract_number',
    labelKey: 'events.production.fields.harvestContractNumber',
    valueType: 'string',
    visibleForSubtypes: RECORDS_HANDLER,
    surfaces: {
      form: 'secondary',
      modal: 'secondary'
    }
  },
  // Whole-vs-part coverage (§ 205.103(b)(2)) — mirrors ChemicalEvent.applied_scope.
  // (b)(2) is the clause that requires records to be traceable and auditable through the
  // operation; (b)(1) is "adapted to the particular business" and is silent on location.
  {
    name: 'applied_scope',
    labelKey: 'events.production.fields.appliedScope',
    valueType: 'enum',
    enumSource: 'applied_scopes',
    // PL removed 2026-08-15: ProductionTab renders these ONLY inside its `productionType ===
    // 'HA'` block, so declaring PL put a value on the Planting modal that no input could set
    // or clear. `block_id` already answers "which part of the parcel" for a planting, and
    // better. Registry narrowed to match the form, rather than widening the form to match it.
    visibleForSubtypes: ['HA'],
    surfaces: {
      form: 'secondary',
      modal: 'secondary'
    }
  },
  {
    name: 'applied_scope_detail',
    labelKey: 'events.production.fields.appliedScopeDetail',
    valueType: 'string',
    // PL removed 2026-08-15: ProductionTab renders these ONLY inside its `productionType ===
    // 'HA'` block, so declaring PL put a value on the Planting modal that no input could set
    // or clear. `block_id` already answers "which part of the parcel" for a planting, and
    // better. Registry narrowed to match the form, rather than widening the form to match it.
    visibleForSubtypes: ['HA'],
    // Accept the raw value AND its display label (normalizer may rewrite it).
    visibleWhen: (e) => {
      const v = String(e.applied_scope ?? '').toLowerCase();
      return v === 'part' || v.includes('part of');
    },
    surfaces: {
      form: 'secondary',
      modal: 'secondary'
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
    visibleForSubtypes: SEED_SOURCED,
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      quick_form: 'immediate',
      consumer_card: 'immediate'
    }
  },

  // ---- Perennial planting stock (PL/TR) — added 2026-08-15 ----
  //
  // These three had no field anywhere. `rootstock` was written by three seeders into
  // extra_data and sat on the CONSUMER allow-list, so a shopper could be shown a rootstock
  // the grower had no input to enter — and the certifier packet shipped a written disclosure
  // that Trazo "does not yet structure rootstock records". For a California orchard,
  // "40 Hass on Duke 7" is the sentence; only the variety half had a column.
  {
    // 7 CFR 205.105(e) — excluded methods. Producer/certifier only.
    // ⚠️ NO consumer_card, by the same reasoning that withholds `seed_treatment_allowed_basis`:
    // "non-GMO" is a marketing claim and every value here is the grower's own attestation.
    // A self-reported claim of that shape on a public surface is the EU ECGT 2024/825 /
    // FTC 16 CFR 260.6 exposure this codebase has already had six leaks of.
    name: 'seed_non_gmo_status',
    labelKey: 'events.production.fields.seedNonGmoStatus',
    valueType: 'enum',
    enumSource: 'seed_non_gmo_statuses',
    visibleForSubtypes: SEED_SOURCED,
    surfaces: {
      form: 'secondary',
      modal: 'secondary'
    }
  },
  {
    // 7 CFR 205.204(a)(4) — perennial planting stock must be under continuous organic
    // management for a year before its crop sells as organic. Producer/certifier only: it is
    // an input to a compliance computation, not a fact a shopper can act on.
    name: 'stock_organic_management_start',
    labelKey: 'events.production.fields.stockOrganicManagementStart',
    valueType: 'date',
    // SEED_SOURCED, not ['PL','TR']: the form asks for this inside its own
    // `['PL','TR','SS']` seed block. `rootstock` / `plants_established` / `plant_spacing`
    // stay planting-only because the form gates THOSE on ['PL','TR'] — the point is to
    // match the form field-for-field, not to widen the whole file.
    visibleForSubtypes: SEED_SOURCED,
    surfaces: {
      form: 'secondary',
      modal: 'secondary'
    }
  },
  {
    name: 'rootstock',
    labelKey: 'events.production.fields.rootstock',
    valueType: 'string',
    visibleForSubtypes: ['PL', 'TR'],
    // Consumer-facing on purpose: it is a documented fact about what was planted, and the
    // most interesting thing this activity can tell a shopper ("chosen for root-rot
    // resistance"). Not a grade, not a vendor.
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'plants_established',
    labelKey: 'events.production.fields.plantsEstablished',
    valueType: 'number',
    visibleForSubtypes: ['PL', 'TR'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'plant_spacing',
    labelKey: 'events.production.fields.plantSpacing',
    valueType: 'string',
    visibleForSubtypes: ['PL', 'TR'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },

  // ---- NOP Compliance: Seed Commercial Availability Search (NOP 5029) ----
  {
    name: 'seed_search_attempts',
    labelKey: 'events.production.fields.seedSearchAttempts',
    valueType: 'text',
    // Without this the resolver falls through to defaultFormatter's String(value) and the
    // modal prints "[object Object],[object Object]" — this is a JSONField, not text.
    formatter: formatSeedSearchAttempts,
    // TR too: a transplant of non-organic nursery stock carries the same 205.204(a)(1)
    // obligation, and the form has always shown the seed block for both subtypes.
    visibleForSubtypes: SEED_SOURCED,
    // NOP 5029 commercial-availability search log embeds contacted-supplier identities —
    // commercially sensitive, producer/certifier-only. NO consumer_card surface (P0 leak fix,
    // mirrors chemical supplier_name; backend also strips it from the public payload).
    surfaces: {
      timeline: 'immediate',
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
    visibleForSubtypes: SEED_SOURCED,
    // ⚠️ NO consumer_card, removed 2026-08-15. This is a grower DROPDOWN whose values are
    // certification statuses, and on the card it rendered as a bare "Certified Organic" with
    // no self-reported qualifier anywhere near it — a self-assigned certification-mark claim
    // on an anonymous public surface. That is the same shape as `seed_treatment_allowed_basis`
    // (one of whose values is `omri_listed`), which this file already withholds by name for
    // exactly that reason, and the same class as the 2026-08-09 OMRI incident.
    //
    // It had in practice never reached the card — `eventDataNormalizer` was silently dropping
    // it — so removing the declaration changes no pixel today. It is removed rather than left
    // dormant because the normalizer now carries registry fields through automatically, which
    // would have published it on the next render.
    //
    // The certified fact a shopper CAN rely on is the farm's third-party certification, which
    // `transparency_views` publishes from structured USDA-OID-matched records. What was
    // planted (variety, rootstock, count) stays on the card; who certified it does not come
    // from a dropdown.
    surfaces: {
      card: 'secondary',
      modal: 'secondary',
      form: 'immediate'
    }
  },
  {
    name: 'seed_supplier_name',
    labelKey: 'events.production.fields.seedSupplierName',
    valueType: 'text',
    visibleForSubtypes: SEED_SOURCED,
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
    visibleForSubtypes: SEED_SOURCED,
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
    visibleForSubtypes: SEED_SOURCED,
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
    visibleForSubtypes: SEED_SOURCED,
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'seed_treatment',
    labelKey: 'events.production.fields.seedTreatment',
    valueType: 'text',
    visibleForSubtypes: SEED_SOURCED,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    // USDA "Seed Records Part C" pairs every named treatment with a "Documentation of Allowed
    // Status" column. § 205.204(a)(2) permits non-organic seed only on commercial-availability
    // grounds, and any treatment applied must itself be an allowed substance (§ 205.601), so
    // "neem oil coating" alone is unreviewable.
    //
    // ⚠️ NO consumer_card, deliberately. One of the values is `omri_listed`, and this field is
    // a grower DROPDOWN — exactly the shape of the 2026-08-09 leak where an anonymous payload
    // said "OMRI Listed" for an input with no catalog row. `may_claim_input_listing()` exists
    // because a self-reported certification-mark claim must never reach a public surface. The
    // treatment NAME is already consumer-visible above; its allowability basis is a certifier
    // record.
    name: 'seed_treatment_allowed_basis',
    labelKey: 'events.production.fields.seedTreatmentAllowedBasis',
    valueType: 'enum',
    enumSource: 'seed_treatment_bases',
    visibleForSubtypes: SEED_SOURCED,
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    // § 205.204(a)(1) permits non-organic seed only when an equivalent organic variety is not
    // "commercially available", and § 205.2 defines that by FORM, QUALITY or QUANTITY. USDA's
    // Seed Records Part B asks for that reason in those words; `seed_search_attempts` records
    // who was contacted and when, with the outcome as free text — which cannot be reviewed
    // against a three-part statutory test.
    //
    // No consumer_card: the exemption ground is a certifier record, and a shopper cannot act
    // on "insufficient quantity available".
    name: 'seed_nonavailability_reason',
    labelKey: 'events.production.fields.seedNonavailabilityReason',
    valueType: 'enum',
    enumSource: 'seed_nonavailability_reasons',
    visibleForSubtypes: SEED_SOURCED,
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
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
    // Irrigation/well water test — NOT a Part 205 requirement. § 205.670(b)-(c) puts residue testing on the certifying agent; microbial ag-water testing is FSMA PSR 21 CFR 112 and/or a certifier contract term. — CCOF water-quality
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
  {
    // The RESULT half of the water test. `water_test_date` and `water_test_lab` were declared
    // here from the start; the results column — the only one that says whether the water
    // passed — was collected by the form (as `water_test_summary`, parsed into this JSON on
    // save) and declared on no display surface at all. So the modal showed that a test was
    // ordered, from whom and when, and never what it found.
    //
    // JSONField of {parameter, value, unit, result} dicts, so it needs a formatter for the
    // same reason `seed_search_attempts` does: defaultFormatter's String(value) renders
    // "[object Object]".
    name: 'water_test_results',
    labelKey: 'events.production.fields.waterTestResults',
    valueType: 'text',
    formatter: formatWaterTestResults,
    visibleForSubtypes: ['IR'],
    // No consumer_card. A raw coliform count is a certifier record, and a shopper cannot
    // act on "E. coli: <1 MPN/100mL".
    // Modal only, no `form` surface: the form collects this as free-text
    // `water_test_summary` and parses it into this JSON at submit, so ProductionTab never
    // binds an input named `water_test_results`. Declaring `form` here would promise an
    // input that does not exist (`formConformance` fails on exactly that).
    surfaces: {
      modal: 'secondary'
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
    name: 'cleaning_asset_class',
    labelKey: 'events.production.fields.cleaningAssetClass',
    valueType: 'enum',
    enumSource: 'cleaning_asset_classes',
    visibleForSubtypes: ['EM'],
    visibleWhen: (e) => {
      // Same CL/Cleaning normalizer tolerance as the other cleaning_* fields.
      const op = String(e.equipment_operation_type || '').toLowerCase();
      return op === 'cl' || op === 'cleaning';
    },
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
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
    // § 205.272(b)(1) purge: when a shared line is flushed, the first material through it
    // carries the residue and must NOT be sold as organic. The three columns record what was
    // purged, how much, and where it went — the last being the one an inspector actually
    // tests, since "purged" with no end use is an unsupported claim.
    //
    // All three were collected by the form's cleaning block and declared on no display
    // surface, so the evidence that the purge happened was invisible on the record that
    // asserts the line was cleaned. Same gate as the rest of the block (EM + operation CL).
    name: 'purge_material',
    labelKey: 'events.production.fields.purgeMaterial',
    valueType: 'string',
    visibleForSubtypes: ['EM'],
    visibleWhen: (e) => {
      const op = String(e.equipment_operation_type || '').toLowerCase();
      return op === 'cl' || op === 'cleaning';
    },
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'purge_quantity',
    labelKey: 'events.production.fields.purgeQuantity',
    valueType: 'string',
    visibleForSubtypes: ['EM'],
    visibleWhen: (e) => {
      const op = String(e.equipment_operation_type || '').toLowerCase();
      return op === 'cl' || op === 'cleaning';
    },
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    // NO consumer_card. The end use is frequently "sold as conventional" — a fact a certifier
    // must see and a shopper would misread on a page about organic produce.
    name: 'purge_material_end_use',
    labelKey: 'events.production.fields.purgeEndUse',
    valueType: 'string',
    visibleForSubtypes: ['EM'],
    visibleWhen: (e) => {
      const op = String(e.equipment_operation_type || '').toLowerCase();
      return op === 'cl' || op === 'cleaning';
    },
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
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
    // 🔴 2026-08-15: the CL check now applies only to EM.
    //
    // `equipment_operation_type` is an EQUIPMENT field — a post-harvest event never carries
    // one — so requiring `op === 'cl'` made this field unreachable on PH, the subtype whose
    // § 205.605(b) proviso it literally encodes ("followed by a rinse with potable water at
    // or below the [MRDL]"). The two-tier guard still does its real job on EM: keep
    // non-cleaning maintenance events from ✗-spamming the card.
    visibleWhen: (e) => {
      const truthy = e.rinse_step_documented === true || e.rinse_step_documented === 'true';
      if (!truthy) return false;
      const subtype = String((e as any).production_type || e.type || '').toUpperCase();
      if (subtype === 'PH') return true;
      const op = String(e.equipment_operation_type || '').toLowerCase();
      return op === 'cl' || op === 'cleaning';
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

  // ---- extra_data fields that had no registry entry at all (2026-08-22) ----
  //
  // The same write-only defect as the seed block, one layer down. These are collected by
  // ProductionTab and written to `extra_data`, and every one of them was declared on NO
  // display surface — so `EnhancedTimelineRow` (which reads raw keys, not the registry)
  // showed some of them on the feed row while the detail modal, the screen a grower opens to
  // check a record before an inspection, showed none. `placement_date` and `removal_date`
  // rendered nowhere at all.
  //
  // The model-column audit that caught the seed fields could not see these: they are not
  // columns. `resolver.ts` already falls back to `extra_data`, so a plain declaration is all
  // each one needs — no custom formatter, unlike the PH block above which predates that
  // fallback.
  {
    // How many hives, and of what — the two facts an almond or tree-fruit grower is asked for
    // at renewal, since § 205.206(a) counts managed pollinators as a pest/production practice.
    name: 'pollinator_type',
    labelKey: 'production.pollination.pollinatorType',
    valueType: 'string',
    visibleForSubtypes: ['PO'],
    surfaces: { timeline: 'immediate', modal: 'immediate', form: 'immediate' }
  },
  {
    name: 'hive_count',
    labelKey: 'production.pollination.hiveCount',
    valueType: 'number',
    visibleForSubtypes: ['PO'],
    surfaces: { timeline: 'immediate', modal: 'immediate', form: 'immediate' }
  },
  {
    // Placement and removal bound the window the hives were on the block. Without them the
    // event says bees were here and cannot say when they left.
    name: 'placement_date',
    labelKey: 'production.pollination.placementDate',
    valueType: 'date',
    visibleForSubtypes: ['PO'],
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    name: 'removal_date',
    labelKey: 'production.pollination.removalDate',
    valueType: 'date',
    visibleForSubtypes: ['PO'],
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    name: 'canopy_operation',
    labelKey: 'production.canopy.operation',
    valueType: 'string',
    visibleForSubtypes: ['CM'],
    surfaces: { modal: 'immediate', form: 'immediate' }
  },
  {
    name: 'pass_number',
    labelKey: 'production.canopy.passNumber',
    valueType: 'number',
    visibleForSubtypes: ['CM'],
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    // Summary-mode totals. The modal already renders the ROLL-UP header itself (event count
    // and date range, `EventDetailsModal` ~line 866), which made the omission easy to miss:
    // a harvest summary showed "12 events, Aug 3 - Aug 19" and not the yield those 12 events
    // added up to — the only number the summary exists to carry.
    //
    // visibleWhen keeps them off a non-summary record, where the key is absent anyway; being
    // explicit costs nothing and documents the coupling to the summary toggle.
    name: 'pruning_passes',
    labelKey: 'production.pruning.passes',
    valueType: 'number',
    visibleForSubtypes: ['PR'],
    visibleWhen: (e) => Boolean(e.is_summary ?? (e.extra_data as ProductionData)?.is_summary),
    surfaces: { timeline: 'immediate', modal: 'secondary', form: 'secondary' }
  },
  {
    name: 'yield_total',
    labelKey: 'production.field.totalYield',
    valueType: 'number',
    unitField: 'yield_total_unit',
    visibleForSubtypes: ['HA'],
    visibleWhen: (e) => Boolean(e.is_summary ?? (e.extra_data as ProductionData)?.is_summary),
    surfaces: { modal: 'immediate', form: 'immediate' }
  },
  {
    name: 'water_volume_total',
    labelKey: 'production.field.totalWaterVolume',
    valueType: 'number',
    unitField: 'water_volume_unit',
    // Drives the IR carbon number when present (aggregate irrigation path in
    // `calculate_production_event_impact`), so it earns the CO₂ chip the same way
    // `fuel_consumed` does.
    carbonRelevant: true,
    visibleForSubtypes: ['IR'],
    visibleWhen: (e) => Boolean(e.is_summary ?? (e.extra_data as ProductionData)?.is_summary),
    surfaces: { modal: 'immediate', form: 'immediate' }
  },
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
    // PO excluded 2026-08-16 — see `fuel_type`. Same subtype list as the form's fuel section.
    name: 'fuel_consumed',
    visibleForSubtypes: ['PL', 'HA', 'IR', 'PR', 'TR', 'CU', 'TH', 'EM', 'PH', 'CM', 'FP', 'MO'],
    labelKey: 'events.common.fields.fuelConsumed',
    valueType: 'number',
    unitField: 'fuel_unit',
    formatter: formatFuelConsumption,
    carbonRelevant: true,
    surfaces: {
      // NO timeline tier (2026-08-27). Fuel is an INPUT to the carbon calculation, and
      // the card already carries the kg CO2e line — a fuel headline told the carbon
      // story twice while record facts (passes, suppliers, lot codes) sat hidden.
      // Records-first standard: carbonRelevant fields never take a timeline slot.
      modal: 'secondary',
      form: 'secondary',
      quick_form: 'secondary'
    }
  },
  {
    // PO excluded 2026-08-16: ProductionTab's fuel/equipment subtype list omits Pollination
    // entirely. Placing hives burns no implement fuel on the block.
    name: 'fuel_type',
    visibleForSubtypes: ['PL', 'HA', 'IR', 'PR', 'TR', 'CU', 'TH', 'EM', 'PH', 'CM', 'FP', 'MO'],
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
    // PO excluded 2026-08-16 — see `fuel_type`. Hive placement runs no implement.
    name: 'equipment_hours',
    visibleForSubtypes: ['PL', 'HA', 'IR', 'PR', 'TR', 'CU', 'TH', 'EM', 'PH', 'CM', 'FP', 'MO'],
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
    // TP added 2026-08-25: a Transport record is ABOUT the haul, and the form now
    // asks its distance; HA/PH/EM keep their legacy display.
    visibleForSubtypes: ['HA', 'PH', 'EM', 'TP'],
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
    //
    // 🔴 2026-08-15: also gated to HA. ProductionTab renders the input only inside the
    // harvest Transportation section and onSubmit sends `undefined` for every other subtype,
    // so on a Planting event this was a value the modal displayed ("Production Efficiency:
    // Normal") with no control anywhere to change or clear it.
    visibleForSubtypes: ['HA'],
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
    // MO added 2026-08-15: § 205.206(c)(1)(2)(5) name mulching, mowing and flame weeding as
    // the organic weed controls, and a mowing event previously printed a BLANK method cell —
    // `floor_management_type` has no packet consumer and `method` excluded MO.
    // PL added 2026-08-15: the Planting teardown's remaining § 4 gap. COG Pro carries a
    // Planting Method column and their real export in this DB reads "Hand planted"; without
    // it Trazo could not record hand-planting at all, and the carbon path fell back to USDA
    // MECHANICAL averages for an operation done with a shovel.
    visibleForSubtypes: ['PL', 'PR', 'TR', 'CU', 'TH', 'CM', 'MO'],
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
      // `form` declared 2026-08-15. The tab HAS collected this all along, under the input
      // name `production_method` (it lands in `extra_data.method`) — the registry simply
      // never said so, which kept the render-conformance sweep blind to it. Declaring it is
      // what makes the PL gap this same sweep now guards against reappearing.
      form: 'secondary',
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
    // TR and SS added 2026-08-25: the form has always asked variety for both (a
    // transplant's cultivar; the variety a seed search was looking for) — without
    // them here the value was write-only.
    visibleForSubtypes: ['HA', 'PH', 'PL', 'TR', 'SS'],
    surfaces: {
      timeline: 'immediate',
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
    // 🔴 2026-08-15: this had no subtype gate at all, while ProductionTab hides the input for
    // PL, TR and HA ("meaningless at planting", "always harvest_ready at harvest"). The
    // registry therefore declared a `form` surface the form does not render, and a legacy
    // value showed in the modal's Technical Details on a record with no input to change or
    // clear it. The declaration now matches the form.
    visibleForSubtypes: ['IR', 'PR', 'CU', 'TH', 'PH', 'CM', 'FP', 'MO', 'EM'],
    surfaces: { modal: 'details', form: 'secondary' }
  },
  {
    name: 'block_id',
    labelKey: 'events.common.fields.blockId',
    valueType: 'string',
    // `card: 'immediate'` — block is what tells two otherwise-identical records apart.
    //
    // Left at modal/'details' (the "Learn More" expander), an orchard that sprays Block 1 and
    // Block 2 on consecutive days showed two rows with the same product, rate and notes and no
    // visible difference — they read as DUPLICATES. Found exactly that way on the walnut
    // migration: 74 legitimate per-block records, block rendered nowhere on the timeline.
    //
    // It is also the CA PUR box 22 value, so hiding it on the producer surface hides the field
    // the regulator form is keyed on. Consumer surfaces already showed it.
    surfaces: { card: 'immediate', modal: 'details', form: 'details' }
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
    { code: 'MO', labelKey: 'events.production.subtypes.mowing', photoTier: 'optional' },
    // Batch 4 (2026-08-19): shipped to history/models.py and to ProductionTab's select but
    // never here, so for three months `getPhotoTier(1, 'TP')` answered with the type-level
    // default and `getSubtypes(1)` — the list the form's own chooser now renders from —
    // simply did not contain them.
    //
    // Tiers: a load manifest and a seed-availability search are paperwork, so a photo adds
    // nothing an inspector reads. Buffer disposal is the one an inspector DOES want to see —
    // § 205.202(c) turns on the crop not being sold as organic, and a photo of the dumped or
    // separately-stored rows is the only evidence of that outside the operator's own word.
    { code: 'TP', labelKey: 'events.production.subtypes.transport', photoTier: 'optional' },
    { code: 'BU', labelKey: 'events.production.subtypes.bufferUse', photoTier: 'recommended' },
    { code: 'SS', labelKey: 'events.production.subtypes.seedSearch', photoTier: 'optional' }
  ],
  defaultPhotoTier: 'recommended',
  fields: PRODUCTION_FIELDS
};
