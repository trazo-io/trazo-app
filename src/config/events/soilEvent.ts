/**
 * Soil Management Event Registry.
 *
 * 8 subtypes: ST(Soil Test), PA(pH Adjustment), OM(Organic Matter),
 * CC(Cover Crop), TI(Tillage), CO(Composting), GR(Grazing), LA(Lab Analysis).
 *
 * GR (Grazing) has unique fields: animal_type, animal_count, grazing_duration_days.
 * TI (Tillage) has unique fields: working_depth, depth_unit, tillage_type, tillage_intensity,
 * tillage_direction, residue_management. The last four persist in extra_data, not as columns.
 * LA (Lab Analysis) has sample_matrix + the lab_* results, which the backend flattens out of
 * the test_results JSONField so the resolver can reach them; ST shares the lab_* block.
 *
 * HD (Habitat Development) and NS (Nesting / Shelter) exist on the backend but are not yet
 * registered here — see D4.
 */

import type {
  EventRegistryEntry,
  FieldConfig,
  FieldFormatter,
  SoilManagementSubtype
} from './registry';
import {
  formatArea,
  formatBoolean,
  formatConsumerOrganicStatus,
  formatDate,
  lookupEnumLabel,
  formatDurationDays,
  formatDurationHours,
  formatFuelConsumption,
  formatNumber,
  formatPercentage,
  makeUnitPairFormatter
} from './formatters';

// Temperature (°F) formatter — strips trailing zeros and appends unit.
// Used by NOP compost peak temperature (7 CFR 205.203(c)(1)) where the
// field label already says "(°F)" but users still need the unit near the value.
const formatTemperatureF = (v: unknown): string | null => {
  if (v == null || v === '') return null;
  const num = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  if (Number.isNaN(num)) return null;
  return `${num.toLocaleString(undefined, { maximumFractionDigits: 1 })} °F`;
};

type SoilData = Record<string, unknown>;

/** Summary-mode flag — a STRING from the form and from extra_data ("true"), a boolean on the wire. */
const isSummaryRecord = (e: Record<string, unknown>): boolean => {
  const raw = e.is_summary ?? (e.extra_data as Record<string, unknown> | undefined)?.is_summary;
  return raw === true || raw === 'true';
};

// Hoisted: building this inside the field formatter re-created it on every render of every
// amendment row.
const formatAmendmentAmountPair = makeUnitPairFormatter('amendment_amount_unit');

// §E-2 — lab analysis. English labels here + es-419 in utils/fieldValues.es.ts, matching every
// other enum in this file: getFieldsForSurface() has no `intl`, so a formatter returning an i18n
// key would render the raw key. localizeFieldValue() maps the English string downstream.
const SAMPLE_MATRIX_LABELS: Record<string, string> = {
  soil: 'Soil',
  leaf: 'Leaf tissue',
  petiole: 'Petiole',
  hull: 'Hull',
  compost: 'Compost',
  water: 'Irrigation water'
};

const formatSampleMatrix = (v: unknown): string | null => {
  if (v == null || v === '') return null;
  const key = String(v);
  return SAMPLE_MATRIX_LABELS[key] ?? key;
};

// Parts per million — the unit micronutrient results are reported in.
const formatPpm = (v: unknown): string | null => {
  if (v == null || v === '') return null;
  const num = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  if (Number.isNaN(num)) return null;
  return `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })} ppm`;
};

// Lab N/P/K rendered atomically, so a report showing only N doesn't imply P and K were 0.
const formatLabNpk = (_v: unknown, event?: SoilData): string | null => {
  const read = (k: string): number | null => {
    const raw = event?.[k];
    if (raw == null || raw === '') return null;
    const num = typeof raw === 'string' ? parseFloat(raw) : typeof raw === 'number' ? raw : NaN;
    return Number.isNaN(num) ? null : num;
  };
  const parts = [read('lab_nitrogen'), read('lab_phosphorus'), read('lab_potassium')];
  if (parts.every((p) => p === null)) return null;
  return parts
    .map((p) => (p === null ? '—' : p.toLocaleString(undefined, { maximumFractionDigits: 2 })))
    .join(' / ');
};

// Organic approval labels — acronyms must be properly capitalized (OMRI, USDA, NOP)
const ORGANIC_APPROVED_LABELS: Record<string, string> = {
  omri_listed: 'OMRI Listed',
  wsda_listed: 'WSDA Listed',
  nop_seal_on_label: 'NOP seal on label',
  certifier_approved: 'Certifier-approved',
  unverified: 'Not yet confirmed',
  usda_nop_approved: 'USDA NOP Approved',
  organic_equivalent: 'Organic Equivalent',
  not_organic: 'Not Organic',
  transitional: 'Transitional',
  not_applicable: 'Not Applicable'
};

const formatOrganicApproved = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return ORGANIC_APPROVED_LABELS[v] ?? v;
};

// Weather conditions labels — shared with chemicalEvent.ts
const WEATHER_CONDITIONS_LABELS: Record<string, string> = {
  calm_dry: 'Calm & Dry',
  overcast_humid: 'Overcast & Humid',
  light_wind: 'Light Wind',
  humid: 'Humid',
  windy: 'Windy'
};

const formatWeatherConditions = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return WEATHER_CONDITIONS_LABELS[v] ?? v;
};

// Amendment type labels — match SoilManagementTab.jsx dropdown (sans chemical formula detail)
const AMENDMENT_TYPE_LABELS: Record<string, string> = {
  limestone: 'Limestone',
  dolomite: 'Dolomite',
  calcium_oxide: 'Quick Lime',
  calcium_hydroxide: 'Hydrated Lime',
  gypsum: 'Gypsum',
  // sulfur + mulch added 2026-08-25: elemental sulfur is THE pH-down amendment and
  // mulch is a routine OM material — both were seedable but absent from this map AND
  // the form's option list, so a stored "sulfur" rendered as its raw enum value.
  sulfur: 'Elemental Sulfur',
  compost: 'Compost',
  manure: 'Manure',
  mulch: 'Mulch',
  other: 'Other Amendment'
};

const formatAmendmentType = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return AMENDMENT_TYPE_LABELS[v] ?? v;
};

// Soil texture labels — match SoilManagementTab.jsx dropdown
export const SOIL_TEXTURE_LABELS: Record<string, string> = {
  clay: 'Clay',
  clay_loam: 'Clay Loam',
  loam: 'Loam',
  sandy_loam: 'Sandy Loam',
  sand: 'Sand',
  silt: 'Silt',
  silt_loam: 'Silt Loam'
};

const formatSoilTexture = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return SOIL_TEXTURE_LABELS[v] ?? v;
};

// Soil moisture labels — form removed (Sprint 2 Epic 2.1.3) but modal still renders old data
const SOIL_MOISTURE_LABELS: Record<string, string> = {
  dry: 'Dry',
  moderate: 'Moderate',
  moist: 'Moist',
  wet: 'Wet'
};

const formatSoilMoisture = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return SOIL_MOISTURE_LABELS[v] ?? v;
};

// ---- Tillage practice labels (TI) -------------------------------------------------------
//
// 🔴 2026-09-06. These four fields were collected by SoilManagementTab, written to
// `extra_data` by NewEvent, printed in the certifier packet and read by the carbon
// calculator — and declared NOWHERE in this registry, so the producer detail modal and the
// buyer card both rendered a tillage pass as a date, a label and an acreage. The farmer
// answered "Minimum till / residue incorporated" and the only two screens that quote the
// record back showed neither.
//
// The registry is the sole gate on the display surfaces: resolver.ts falls back to
// `extra_data` only for fields it already knows, so an undeclared key renders nowhere and
// says nothing while it does. Same shape as `soil_moisture` above, inverted.
//
// LABELS ARE THE BACKEND'S, not the form's. SoilManagementTab's <option> text carries a
// benefit half — "Minimum Till - Conservation", "Surface Left - Protective cover",
// "Across Slope - Erosion control". audit_export_service.TILLAGE_PRACTICE_LABELS already
// strips those for the certifier packet, and the same reason applies harder to a shopper:
// "Conservation" is a self-assigned environmental verdict on the grower's own pass, which is
// the FTC 16 CFR 260.6 / EU ECGT 2024-825 class. Keep these two maps byte-aligned with
// `TILLAGE_PRACTICE_LABELS` in trazo-back/history/services/audit_export_service.py.
export const TILLAGE_TYPE_LABELS: Record<string, string> = {
  conventional_plow: 'Conventional plow',
  chisel_plow: 'Chisel plow',
  disk_harrow: 'Disk harrow',
  no_till: 'No-till',
  strip_till: 'Strip till',
  minimum_till: 'Minimum till',
  subsoiling: 'Subsoiling',
  cultivator: 'Cultivator'
};

const formatTillageType = (v: unknown): string | null => lookupEnumLabel(TILLAGE_TYPE_LABELS, v);

// PRODUCER/CERTIFIER ONLY — see the `tillage_intensity` field config for why this one has no
// consumer surface and is off the anonymous wire.
const TILLAGE_INTENSITY_LABELS: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  conservation: 'Conservation'
};

const formatTillageIntensity = (v: unknown): string | null =>
  lookupEnumLabel(TILLAGE_INTENSITY_LABELS, v);

// PRODUCER/CERTIFIER ONLY — see the `tillage_direction` field config.
const TILLAGE_DIRECTION_LABELS: Record<string, string> = {
  across_slope: 'Across slope',
  up_down_slope: 'Up/down slope',
  contour: 'Contour',
  random: 'Random'
};

const formatTillageDirection = (v: unknown): string | null =>
  lookupEnumLabel(TILLAGE_DIRECTION_LABELS, v);

export const RESIDUE_MANAGEMENT_LABELS: Record<string, string> = {
  incorporated: 'Incorporated into soil',
  surface_left: 'Left on surface',
  removed: 'Removed',
  mulched: 'Mulched in place',
  partial_removal: 'Partially removed'
};

const formatResidueManagement = (v: unknown): string | null =>
  lookupEnumLabel(RESIDUE_MANAGEMENT_LABELS, v);

// Shopper voicing of the same five values. "Residue" is the grower's and the inspector's
// word; a person holding the bag is being told what happened to last crop's plant material,
// which is the one thing in this event they can actually picture. Facts only — no version of
// these says the choice was good.
const RESIDUE_MANAGEMENT_CONSUMER_LABELS: Record<string, string> = {
  incorporated: 'Mixed back into the soil',
  surface_left: 'Left on the surface',
  removed: 'Taken off the field',
  mulched: 'Chopped and left in place',
  partial_removal: 'Partly taken off the field'
};

const formatResidueManagementForConsumer = (v: unknown): string | null =>
  lookupEnumLabel(RESIDUE_MANAGEMENT_CONSUMER_LABELS, v);

// Animal type labels — match SoilManagementTab.jsx GR (Grazing) dropdown
const ANIMAL_TYPE_LABELS: Record<string, string> = {
  sheep: 'Sheep',
  goats: 'Goats',
  cattle: 'Cattle',
  poultry: 'Poultry',
  other: 'Other'
};

const formatAnimalType = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return ANIMAL_TYPE_LABELS[v] ?? v;
};

// Grazing purpose labels — match SoilManagementTab.jsx GR dropdown
const GRAZING_PURPOSE_LABELS: Record<string, string> = {
  weed_control: 'Weed Control',
  cover_crop: 'Cover Crop Termination',
  soil_health: 'Soil Health',
  vegetation_management: 'Vegetation Management'
};

const formatGrazingPurpose = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return GRAZING_PURPOSE_LABELS[v] ?? v;
};

// Biodiversity / habitat labels (HD + NS subtypes) — match SoilManagementTab.jsx dropdowns and the
// backend HABITAT_TYPE_LABELS (audit_export_service.py). Facts only, no score.
const HABITAT_TYPE_LABELS: Record<string, string> = {
  // HD — Habitat Development
  hedgerow: 'Hedgerow',
  insectary_strip: 'Insectary / Beneficial-Insect Strip',
  native_planting: 'Native Planting',
  pollinator_habitat: 'Pollinator Habitat',
  field_border: 'Field Border',
  riparian_buffer: 'Riparian Buffer',
  living_groundcover_habitat: 'Living Groundcover Habitat',
  wildlife_corridor: 'Wildlife Corridor',
  // NS — Nesting / Shelter
  barn_owl_box: 'Barn-Owl Box',
  raptor_perch: 'Raptor Perch',
  songbird_box: 'Songbird Box',
  native_bee_block: 'Native-Bee Nest Block',
  bat_box: 'Bat Box',
  insect_hotel: 'Insect Hotel',
  beetle_bank: 'Beetle Bank',
  brush_pile_hibernacula: 'Brush Pile / Hibernacula'
};

const formatHabitatType = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return HABITAT_TYPE_LABELS[v] ?? v;
};

// Raw manure harvest interval labels — match SoilManagementTab.jsx OM dropdown
// (7 CFR 205.203(c)(1)). Default enum resolver would render bare "120"/"90"/"Na"
// — we inject the NOP context so the consumer card + farmer modal stay readable.
const MANURE_HARVEST_INTERVAL_LABELS: Record<string, string> = {
  '120': '120 days (crop contacts soil)',
  '90': '90 days (crop elevated)',
  na: 'N/A (composted or none)'
};

const formatManureHarvestInterval = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return MANURE_HARVEST_INTERVAL_LABELS[v] ?? v;
};

// Compost method labels — match SoilManagementTab.jsx CO dropdown (7 CFR 205.203(c)(2)).
// Default split/capitalize mangles "in_vessel" → "In Vessel" (missing hyphen).
const COMPOST_METHOD_LABELS: Record<string, string> = {
  windrow: 'Windrow',
  static_aerated: 'Static Aerated Pile',
  in_vessel: 'In-Vessel'
};

const formatCompostMethod = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return COMPOST_METHOD_LABELS[v] ?? v;
};

const SOIL_SUBTYPE_LABELS: Record<string, string> = {
  ST: 'Soil Testing',
  PA: 'Soil Amendment',
  CC: 'Cover Crop Management',
  OM: 'Organic Matter Addition',
  TI: 'Tillage',
  CO: 'Composting Operation',
  GR: 'Grazing Management',
  HD: 'Habitat Development',
  NS: 'Nesting / Shelter Structures'
};

// `LA` (lab analysis) was missing from the map, so the consumer card printed the raw
// two-letter code. lookupEnumLabel drops unknown short codes rather than showing them.
const formatSoilSubtype = (value: unknown, _event: SoilData): string | null =>
  lookupEnumLabel(SOIL_SUBTYPE_LABELS, value);

const SOIL_FIELDS: readonly FieldConfig<unknown, SoilData>[] = [
  // ---- Core (ALL subtypes) ----
  {
    name: 'name',
    labelKey: 'events.soil.fields.name',
    valueType: 'string',
    surfaces: {
      timeline: 'hero',
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      preview: 'hero',
      consumer_card: 'hero',
      consumer_timeline: 'hero'
    }
  },
  {
    name: 'soil_management_type',
    labelKey: 'events.soil.fields.soilManagementType',
    valueType: 'enum',
    formatter: formatSoilSubtype,
    // NO consumer_card: this duplicates the card TITLE on every soil card
    // ("Soil Testing & Analysis" heading + "Soil Management Type: Soil Testing" row).
    surfaces: {
      modal: 'immediate'
    }
  },
  {
    // NS excluded 2026-08-16: SoilManagementTab gates area behind `watch('type') !== 'NS'`.
    // A nesting shelter is a box on a post — it covers no acreage. (HD keeps it, labelled
    // "optional", because a hedgerow does have a length/area.)
    name: 'area_covered',
    visibleForSubtypes: ['ST', 'PA', 'CC', 'OM', 'CO', 'LA', 'TI', 'GR', 'HD'],
    labelKey: 'events.common.fields.areaCovered',
    valueType: 'number',
    unitField: 'area_unit',
    formatter: formatArea,
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate',
      consumer_timeline: 'immediate'
    }
  },

  // ---- Lab analysis (ST + LA) — §E-2 ----------------------------------------------------
  // These values have always been collected by the soil form and written into the
  // `test_results` JSONField, but nothing read them back: the resolver looks at the top level
  // and at extra_data only, so every lab result was write-only. The read serializer now
  // flattens the JSON into `lab_*` fields, which is what these configs bind to.
  //
  // Only `sample_matrix` and the lab's identity reach the consumer: an outside lab is genuine
  // third-party evidence, whereas N/P/K and CEC numbers are the jargon class
  // transparency-first.md keeps off consumer surfaces.
  {
    name: 'sample_matrix',
    labelKey: 'events.soil.fields.sampleMatrix',
    valueType: 'enum',
    formatter: formatSampleMatrix,
    visibleForSubtypes: ['LA'],
    surfaces: {
      timeline: 'immediate',
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      consumer_card: 'immediate',
      consumer_timeline: 'immediate'
    }
  },
  {
    name: 'lab_name',
    labelKey: 'events.soil.fields.labName',
    valueType: 'string',
    visibleForSubtypes: ['ST', 'LA'],
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'lab_report_date',
    labelKey: 'events.soil.fields.labReportDate',
    valueType: 'date',
    // Every other `date` field in the registry pairs with formatDate; without it the raw
    // "2026-07-18" from the test_results JSON would render verbatim. formatDate also parses a
    // bare YYYY-MM-DD as LOCAL midnight, so the date does not slip a day west of UTC.
    formatter: formatDate,
    visibleForSubtypes: ['ST', 'LA'],
    surfaces: {
      modal: 'secondary',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'lab_sample_id',
    labelKey: 'events.soil.fields.labSampleId',
    valueType: 'string',
    visibleForSubtypes: ['ST', 'LA'],
    surfaces: { modal: 'secondary', form: 'immediate' }
  },
  {
    // N/P/K render as one atomic group, like the chemical-event NPK trio.
    name: 'lab_nitrogen',
    labelKey: 'events.soil.fields.labNpk',
    valueType: 'number',
    formatter: formatLabNpk,
    groupWith: ['lab_phosphorus', 'lab_potassium'],
    visibleForSubtypes: ['ST', 'LA'],
    surfaces: { modal: 'secondary', form: 'immediate' }
  },
  {
    name: 'lab_phosphorus',
    labelKey: 'events.soil.fields.labPhosphorus',
    valueType: 'number',
    formatter: formatNumber,
    visibleForSubtypes: ['ST', 'LA'],
    surfaces: { form: 'immediate' }
  },
  {
    name: 'lab_potassium',
    labelKey: 'events.soil.fields.labPotassium',
    valueType: 'number',
    formatter: formatNumber,
    visibleForSubtypes: ['ST', 'LA'],
    surfaces: { form: 'immediate' }
  },
  {
    name: 'lab_cec',
    labelKey: 'events.soil.fields.labCec',
    valueType: 'number',
    formatter: formatNumber,
    visibleForSubtypes: ['ST', 'LA'],
    surfaces: { modal: 'secondary', form: 'immediate' }
  },
  // Micronutrient results — the documented deficiency that 7 CFR 205.601(j)(7) requires
  // before a micronutrient may be applied (see chemicalEvent.ts micronutrient_type).
  {
    name: 'lab_zinc_ppm',
    labelKey: 'events.soil.fields.labZincPpm',
    valueType: 'number',
    formatter: formatPpm,
    visibleForSubtypes: ['ST', 'LA'],
    surfaces: { modal: 'secondary', form: 'immediate' }
  },
  {
    name: 'lab_boron_ppm',
    labelKey: 'events.soil.fields.labBoronPpm',
    valueType: 'number',
    formatter: formatPpm,
    visibleForSubtypes: ['ST', 'LA'],
    surfaces: { modal: 'secondary', form: 'immediate' }
  },
  {
    name: 'lab_manganese_ppm',
    labelKey: 'events.soil.fields.labManganesePpm',
    valueType: 'number',
    formatter: formatPpm,
    visibleForSubtypes: ['ST', 'LA'],
    surfaces: { modal: 'secondary', form: 'immediate' }
  },
  {
    name: 'lab_iron_ppm',
    labelKey: 'events.soil.fields.labIronPpm',
    valueType: 'number',
    formatter: formatPpm,
    visibleForSubtypes: ['ST', 'LA'],
    surfaces: { modal: 'secondary', form: 'immediate' }
  },

  // ---- Soil properties (all subtypes — form shows these for any selected type) ----
  {
    // MEASURED subtypes only. SoilManagementTab gates these behind
    // `!['GR','HD','NS','TI'].includes(type)` and that exclusion is deliberate: a sheep
    // rotation, a tillage pass, a hedgerow planting or a nesting shelter does not measure soil
    // pH, and rendering an empty reading field invites a fabricated one. Declaring them for
    // ALL subtypes put values on four modals that no input could set or clear.
    name: 'soil_ph',
    visibleForSubtypes: ['ST', 'PA', 'CC', 'OM', 'CO', 'LA'],
    labelKey: 'events.soil.fields.soilPh',
    valueType: 'number',
    formatter: formatNumber,
    surfaces: {
      timeline: 'immediate',
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      consumer_timeline: 'immediate'
    }
  },
  {
    // MEASURED subtypes only. SoilManagementTab gates these behind
    // `!['GR','HD','NS','TI'].includes(type)` and that exclusion is deliberate: a sheep
    // rotation, a tillage pass, a hedgerow planting or a nesting shelter does not measure soil
    // pH, and rendering an empty reading field invites a fabricated one. Declaring them for
    // ALL subtypes put values on four modals that no input could set or clear.
    name: 'organic_matter_percentage',
    visibleForSubtypes: ['ST', 'PA', 'CC', 'OM', 'CO', 'LA'],
    labelKey: 'events.soil.fields.organicMatterPercentage',
    valueType: 'number',
    formatter: formatPercentage,
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },

  // ---- Amendment fields (PA, OM, CC, CO) ----
  {
    name: 'amendment_type',
    labelKey: 'events.soil.fields.amendmentType',
    valueType: 'enum',
    formatter: formatAmendmentType,
    visibleForSubtypes: ['PA', 'OM', 'CC', 'CO'],
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    // Specific product identity + manufacturer for the NOP/CCOF input record
    // (7 CFR 205.203). Certifier/producer-only (modal + form), mirroring chemical
    // supplier_name — NO consumer surface. The generic amendment_type already serves
    // the consumer; the specific product/manufacturer is a certifier detail and the
    // backend keeps them out of the public payload.
    name: 'amendment_product_name',
    labelKey: 'events.soil.fields.amendmentProductName',
    valueType: 'string',
    visibleForSubtypes: ['PA', 'OM', 'CC', 'CO'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate'
    }
  },
  {
    name: 'amendment_manufacturer',
    labelKey: 'events.soil.fields.amendmentManufacturer',
    valueType: 'string',
    visibleForSubtypes: ['PA', 'OM', 'CC', 'CO'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    // D5 — one concept, two storage columns. `amendment_amount` is a legacy CharField that the
    // form still writes; `amendment_amount_numeric` + `amendment_amount_unit` are the structured
    // pair. Displaying only the numeric pair meant every amendment a farmer entered through the
    // form rendered blank on the card, while the PDF showed it — because
    // audit_export_service.py already falls back to the legacy column. This mirrors that
    // fallback so one amendment reads the same everywhere, with no rename and no migration.
    name: 'amendment_amount_numeric',
    labelKey: 'events.soil.fields.amendmentAmount',
    valueType: 'number',
    unitField: 'amendment_amount_unit',
    visibleForSubtypes: ['PA', 'OM', 'CC', 'CO'],
    formatter: (value, event) => {
      const structured = formatAmendmentAmountPair(value as never, event);
      if (structured) return structured;
      const legacy = event?.amendment_amount;
      if (legacy == null || legacy === '') return null;
      const unit = typeof event?.amendment_unit === 'string' ? event.amendment_unit : '';
      return unit ? `${legacy} ${unit}`.trim() : String(legacy);
    },
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'amendment_amount_unit',
    labelKey: 'events.soil.fields.amendmentAmountUnit',
    valueType: 'enum',
    visibleForSubtypes: ['PA', 'OM', 'CC', 'CO'],
    surfaces: { form: 'immediate' }
  },

  // ---- Amendment purchase traceability (7 CFR 205.103(b)(1)-(2)) ----
  //
  // 🔴 2026-08-16, CCOF grower-checklist audit. CCOF item 1 asks for receipts for
  // "fertilizer, compost, soil amendments, planting mixes"; ChemicalEvent had supplier /
  // purchase date / invoice / quantity / lot and this model had none of them, so the largest
  // purchased input on a typical organic orchard was the one with no paper trail.
  //
  // Certifier and producer surfaces ONLY — no `consumer_card`. Who a farm buys from and what
  // it paid is commercially sensitive, and it fails all three consumer-card questions. Same
  // policy as ChemicalEvent.supplier_name, which the backend also strips from the public
  // payload (see feedback_supplier_chain_leak).
  {
    name: 'amendment_supplier_name',
    labelKey: 'events.soil.fields.amendmentSupplierName',
    valueType: 'string',
    visibleForSubtypes: ['PA', 'OM', 'CC', 'CO'],
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    name: 'amendment_purchase_date',
    labelKey: 'events.soil.fields.amendmentPurchaseDate',
    valueType: 'date',
    visibleForSubtypes: ['PA', 'OM', 'CC', 'CO'],
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    name: 'amendment_purchase_invoice',
    labelKey: 'events.soil.fields.amendmentPurchaseInvoice',
    valueType: 'string',
    visibleForSubtypes: ['PA', 'OM', 'CC', 'CO'],
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    // The uploaded FILE behind the invoice number (2026-08-25). Modal-only:
    // supplier-chain identity never reaches consumer surfaces, and the packet
    // carries the file itself in receipts/.
    name: 'receipt_document_title',
    labelKey: 'events.receipt.label',
    valueType: 'string',
    surfaces: {
      modal: 'secondary'
    }
  },
  {
    // The mass-balance input leg for amendments. Without it the packet cannot reconcile
    // purchased against applied and prints a [REVIEW] block the operation cannot clear.
    name: 'amendment_quantity_purchased',
    labelKey: 'events.soil.fields.amendmentQuantityPurchased',
    valueType: 'number',
    unitField: 'amendment_quantity_purchased_unit',
    visibleForSubtypes: ['PA', 'OM', 'CC', 'CO'],
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    name: 'amendment_quantity_purchased_unit',
    labelKey: 'events.soil.fields.amendmentQuantityPurchasedUnit',
    valueType: 'enum',
    visibleForSubtypes: ['PA', 'OM', 'CC', 'CO'],
    surfaces: { form: 'secondary' }
  },
  {
    name: 'amendment_lot_number',
    labelKey: 'events.soil.fields.amendmentLotNumber',
    valueType: 'string',
    visibleForSubtypes: ['PA', 'OM', 'CC', 'CO'],
    surfaces: { modal: 'secondary', form: 'secondary' }
  },

  // ---- NOP Compliance: Amendment organic approval (7 CFR 205.203(b)) ----
  {
    name: 'amendment_organic_approved',
    labelKey: 'events.soil.fields.amendmentOrganicApproved',
    valueType: 'enum',
    enumSource: 'organic_approved',
    formatter: formatOrganicApproved,
    // The producer surfaces may say "OMRI Listed" — that is the grower reading back their own
    // record. A shopper cannot tell a self-report from a listing, so the consumer wording
    // attributes it. See formatConsumerOrganicStatus.
    consumerFormatter: formatConsumerOrganicStatus,
    visibleForSubtypes: ['PA', 'OM', 'CC', 'CO'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },

  // ---- NOP Compliance: Compost temperature tracking (7 CFR 205.203(c)(2)) ----
  {
    name: 'compost_peak_temp_f',
    labelKey: 'events.soil.fields.compostPeakTemp',
    placeholderKey: 'events.soil.fields.compostPeakTempPlaceholder',
    valueType: 'number',
    formatter: formatTemperatureF,
    visibleForSubtypes: ['CO'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'compost_duration_days_at_temp',
    labelKey: 'events.soil.fields.compostDurationDays',
    placeholderKey: 'events.soil.fields.compostDurationDaysPlaceholder',
    valueType: 'number',
    visibleForSubtypes: ['CO'],
    formatter: formatNumber,
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'compost_turning_count',
    labelKey: 'events.soil.fields.compostTurningCount',
    placeholderKey: 'events.soil.fields.compostTurningCountPlaceholder',
    valueType: 'number',
    visibleForSubtypes: ['CO'],
    formatter: formatNumber,
    surfaces: {
      modal: 'secondary',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  // 🔴 2026-08-31 — the § 205.203(c)(2) / NOP 5021 EVIDENCE was absent from the registry
  // entirely, so it could not render on any surface. The form collects all five, the model
  // stores them, and the certifier packet prints the temperature log in its own table — but
  // the grower's own record view showed a compost event with its peak temperature and turning
  // count and NONE of the things that make those numbers attributable: which pile they came
  // from, how the reading was taken, what the pile was made of.
  //
  // `compost_feedstock` matters twice over: it is the NOP 5021 source record, and it is the
  // field that tells a reader whether the compost was made here or bought in — the same
  // distinction `_compost_was_bought_in` uses server-side to decide whether the buyer page may
  // say "On-farm compost".
  //
  // Modal + form only, deliberately. A shopper already gets the outcome (peak temp, days at
  // temp, turnings, method, C:N); a raw reading log, a pile ID and an instrument description
  // are operator data of exactly the class the 2026-07-31 consumer-card review swept out.
  {
    name: 'compost_feedstock',
    labelKey: 'events.soil.fields.compostFeedstock',
    helpKey: 'events.soil.fields.compostFeedstockHelp',
    valueType: 'string',
    visibleForSubtypes: ['CO'],
    surfaces: {
      modal: 'secondary',
      form: 'immediate'
    }
  },
  {
    name: 'compost_unit_id',
    labelKey: 'events.soil.fields.compostUnitId',
    helpKey: 'events.soil.fields.compostUnitIdHelp',
    valueType: 'string',
    visibleForSubtypes: ['CO'],
    surfaces: {
      modal: 'secondary',
      form: 'immediate'
    }
  },
  {
    name: 'compost_temp_reading_method',
    labelKey: 'events.soil.fields.compostTempReadingMethod',
    helpKey: 'events.soil.fields.compostTempReadingMethodHelp',
    valueType: 'string',
    visibleForSubtypes: ['CO'],
    surfaces: {
      modal: 'secondary',
      form: 'immediate'
    }
  },
  {
    name: 'compost_temperature_log',
    labelKey: 'events.soil.fields.compostTemperatureLog',
    helpKey: 'events.soil.fields.compostTemperatureLogHelp',
    valueType: 'text',
    visibleForSubtypes: ['CO'],
    surfaces: {
      modal: 'secondary',
      form: 'immediate'
    }
  },
  {
    // The amendment's own nitrogen content, on the wet basis the tonnage uses. Grouped with the
    // other amendment-purchase facts rather than the compost-process ones, hence the wider gate.
    name: 'amendment_nitrogen_percentage',
    labelKey: 'events.soil.fields.amendmentNitrogenPercentage',
    helpKey: 'events.soil.fields.amendmentNitrogenPercentageHelp',
    valueType: 'number',
    visibleForSubtypes: ['PA', 'OM', 'CC', 'CO'],
    formatter: formatPercentage,
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'compost_method',
    labelKey: 'events.soil.fields.compostMethod',
    valueType: 'enum',
    enumSource: 'compost_methods',
    formatter: formatCompostMethod,
    visibleForSubtypes: ['CO'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'compost_initial_cn_ratio',
    labelKey: 'events.soil.fields.compostInitialCnRatio',
    placeholderKey: 'events.soil.fields.compostInitialCnRatioPlaceholder',
    valueType: 'number',
    visibleForSubtypes: ['CO'],
    formatter: formatNumber,
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },

  // ---- NOP Compliance: Raw manure harvest interval (7 CFR 205.203(c)(1)) ----
  // GR (Grazing Management) is included deliberately. Livestock turned into a crop
  // production area deposit RAW manure, so the same 90/120-day pre-harvest interval
  // applies as for a spreader pass — 120 days where the edible portion contacts the
  // soil, 90 days where it does not (7 CFR 205.203(c)(1)(ii)-(iii)). Oregon Tilth
  // states it directly: "Livestock grazing ... follows the same rules for raw manure.
  // Animals must be removed either 90 or 120 days prior to harvest." AMS's own manure
  // guidance illustrates the risk with a photo of sheep grazing a walnut orchard.
  // Until now these fields rendered for OM only, so a grower logging sheep in an
  // orchard produced an audit packet with no interval documented at all — the first
  // thing an inspector asks about when they see livestock in a crop field.
  {
    name: 'manure_harvest_interval',
    labelKey: 'events.soil.fields.manureHarvestInterval',
    valueType: 'enum',
    enumSource: 'manure_harvest_intervals',
    formatter: formatManureHarvestInterval,
    visibleForSubtypes: ['OM', 'GR'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    // USDA's crop documentation form records "Date of Harvest — Estimated" beside
    // "Date of Harvest — Actual". The actual date is the harvest event itself, and
    // `_validate_raw_manure_harvest_interval` already enforces § 205.203(c)(1) against it.
    // What was missing is the ESTIMATE: the plan the grower held when the manure went on.
    // Without it, a harvest that slipped and a plan that was never sound look identical.
    name: 'manure_harvest_date_planned',
    labelKey: 'events.soil.fields.manureHarvestDatePlanned',
    valueType: 'date',
    formatter: formatDate,
    visibleForSubtypes: ['OM', 'GR'],
    surfaces: {
      modal: 'secondary',
      form: 'immediate'
      // No consumer_card: a shopper cannot act on the grower's planning date, and it fails
      // all three questions in ADDING_FIELDS.md.
    }
  },
  {
    name: 'manure_application_date',
    // For GR this is the date the animals came OFF the block: the interval runs from
    // the last day of grazing, not the first.
    labelKey: 'events.soil.fields.manureApplicationDate',
    valueType: 'date',
    // Raw ISO otherwise — see the note on corrective_action_date in generalEvent.ts.
    formatter: formatDate,
    visibleForSubtypes: ['OM', 'GR'],
    surfaces: {
      modal: 'secondary',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },

  // ---- USDA manure form #9: the two columns Trazo had no home for ----
  // "How Applied / Incorporated" and "Manure Type, Form and Source" ("Chicken, dry, on farm").
  //
  // Subtype scoping is deliberate. GR (grazing) gets ONLY the animal: grazed manure has no
  // application method, no chosen form, and is on-farm by definition — asking would be three
  // questions with one possible answer each. OM (organic matter) gets all four.
  {
    name: 'manure_application_method',
    labelKey: 'events.soil.fields.manureApplicationMethod',
    valueType: 'enum',
    enumSource: 'manure_application_methods',
    visibleForSubtypes: ['OM'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'manure_animal_source',
    labelKey: 'events.soil.fields.manureAnimalSource',
    valueType: 'enum',
    enumSource: 'manure_animal_sources',
    visibleForSubtypes: ['OM', 'GR'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'manure_form',
    labelKey: 'events.soil.fields.manureForm',
    valueType: 'enum',
    enumSource: 'manure_forms',
    visibleForSubtypes: ['OM'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'manure_origin',
    labelKey: 'events.soil.fields.manureOrigin',
    valueType: 'enum',
    enumSource: 'manure_origins',
    visibleForSubtypes: ['OM'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },

  // ---- NOP 5006: Processed animal manure (interval-exempt when documented) ----
  // Certifier-facing compliance detail — not shown on the consumer QR card.
  {
    name: 'manure_treatment',
    labelKey: 'events.soil.fields.manureTreatment',
    valueType: 'enum',
    enumSource: 'manure_treatments',
    visibleForSubtypes: ['OM'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate'
    }
  },
  {
    name: 'processed_manure_temp_f',
    labelKey: 'events.soil.fields.processedManureTemp',
    placeholderKey: 'events.soil.fields.processedManureTempPlaceholder',
    valueType: 'number',
    formatter: formatNumber,
    visibleForSubtypes: ['OM'],
    // Accept both the raw enum value and the post-normalizer display label
    // (the registry normalizer may resolve enum → label before this runs).
    visibleWhen: (event) => {
      const v = String((event as Record<string, unknown>).manure_treatment ?? '').toLowerCase();
      return v === 'processed_5006' || v.includes('5006') || v.includes('processed');
    },
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'processed_manure_attestation',
    labelKey: 'events.soil.fields.processedManureAttestation',
    placeholderKey: 'events.soil.fields.processedManureAttestationPlaceholder',
    valueType: 'text',
    visibleForSubtypes: ['OM'],
    // Accept both the raw enum value and the post-normalizer display label
    // (the registry normalizer may resolve enum → label before this runs).
    visibleWhen: (event) => {
      const v = String((event as Record<string, unknown>).manure_treatment ?? '').toLowerCase();
      return v === 'processed_5006' || v.includes('5006') || v.includes('processed');
    },
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },

  // ---- Working depth (all except GR — grazing has no depth concept) ----
  {
    name: 'working_depth',
    labelKey: 'events.soil.fields.workingDepth',
    valueType: 'number',
    unitField: 'depth_unit',
    formatter: makeUnitPairFormatter('depth_unit'),
    visibleForSubtypes: ['TI', 'ST', 'CC', 'PA', 'OM', 'CO'],
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate'
    }
  },

  // ---- Tillage practice (TI) — the four facts that make a pass THIS pass ----------------
  // See TILLAGE_TYPE_LABELS at the top of this file for why all four were invisible until
  // 2026-09-06 and why the labels are the packet's, not the form's.
  //
  // The consumer split is deliberate and is the whole decision here:
  //
  //   tillage_type       → shopper YES. "No-till" / "Minimum till" / "Conventional plow" is a
  //                        named practice class, checkable against the same season's other
  //                        records, and it is the answer to the question the card's own
  //                        description raises ("the ground was worked" — how?).
  //   residue_management → shopper YES. What happened to last crop's plant material. Plain,
  //                        physical, and the fact the grower's own field notes lead with.
  //   tillage_intensity  → shopper NO. High/Medium/Low/Conservation is a grower-assigned
  //                        RATING of their own soil disturbance against no published
  //                        criteria — the `production_efficiency` shape this registry already
  //                        withholds from the card, and "Conservation" as a self-awarded grade
  //                        is the EU ECGT 2024/825 self-created-label risk exactly.
  //   tillage_direction  → shopper NO. "Across slope" is meaningless without the block's slope,
  //                        which the buyer page does not publish, and its form label sells the
  //                        benefit ("Erosion control") rather than stating the fact.
  //
  // The two withheld from the card are ALSO off the anonymous payload as of the same change
  // (ALLOWED_EXTRA_DATA_KEYS in trazo-back/history/serializers.py). The project's rule from
  // transparency_views is that "the key name travels on the wire and is scrapable whatever the
  // UI renders, so it is the claim" — the same rule that removed storage_location (2026-08-09)
  // and block_id/growth_stage (2026-08-15). Withholding a field from the card while still
  // publishing it is not a withholding.
  {
    name: 'tillage_type',
    labelKey: 'events.soil.fields.tillageType',
    consumerLabelKey: 'events.consumer.fields.tillageType',
    valueType: 'enum',
    formatter: formatTillageType,
    visibleForSubtypes: ['TI'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'residue_management',
    labelKey: 'events.soil.fields.residueManagement',
    consumerLabelKey: 'events.consumer.fields.residueManagement',
    valueType: 'enum',
    formatter: formatResidueManagement,
    consumerFormatter: formatResidueManagementForConsumer,
    visibleForSubtypes: ['TI'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'tillage_intensity',
    labelKey: 'events.soil.fields.tillageIntensity',
    valueType: 'enum',
    formatter: formatTillageIntensity,
    visibleForSubtypes: ['TI'],
    // NO consumer_card — grower-assigned rating, see the block comment above.
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'tillage_direction',
    labelKey: 'events.soil.fields.tillageDirection',
    valueType: 'enum',
    formatter: formatTillageDirection,
    visibleForSubtypes: ['TI'],
    // NO consumer_card — unreadable without slope, benefit-framed label. See above.
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    // MEASURED subtypes only. SoilManagementTab gates these behind
    // `!['GR','HD','NS','TI'].includes(type)` and that exclusion is deliberate: a sheep
    // rotation, a tillage pass, a hedgerow planting or a nesting shelter does not measure soil
    // pH, and rendering an empty reading field invites a fabricated one. Declaring them for
    // ALL subtypes put values on four modals that no input could set or clear.
    name: 'soil_texture',
    visibleForSubtypes: ['ST', 'PA', 'CC', 'OM', 'CO', 'LA'],
    labelKey: 'events.soil.fields.soilTexture',
    valueType: 'enum',
    formatter: formatSoilTexture,
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'soil_moisture',
    labelKey: 'events.soil.fields.soilMoisture',
    valueType: 'enum',
    formatter: formatSoilMoisture,
    // 🔴 `form` surface removed 2026-08-15. The input was deleted from
    // SoilManagementTab in Sprint 2 Epic 2.1.3, but this declaration stayed — so the
    // registry promised a form field that does not exist, and the conformance guard
    // could not see it because the only mention left in the tab was the COMMENT
    // recording the removal. `modal` is kept so previously-saved values still render.
    surfaces: {
      modal: 'secondary'
    }
  },

  // ---- Grazing (GR) ----
  {
    name: 'animal_type',
    labelKey: 'events.soil.fields.animalType',
    valueType: 'enum',
    formatter: formatAnimalType,
    visibleForSubtypes: ['GR'],
    surfaces: {
      timeline: 'immediate',
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      consumer_card: 'hero',
      consumer_timeline: 'immediate'
    }
  },
  {
    name: 'animal_count',
    labelKey: 'events.soil.fields.animalCount',
    valueType: 'number',
    visibleForSubtypes: ['GR'],
    formatter: formatNumber,
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'grazing_duration_days',
    labelKey: 'events.soil.fields.grazingDuration',
    valueType: 'number',
    visibleForSubtypes: ['GR'],
    formatter: formatDurationDays,
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'grazing_purpose',
    labelKey: 'events.soil.fields.grazingPurpose',
    valueType: 'enum',
    formatter: formatGrazingPurpose,
    visibleForSubtypes: ['GR'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },

  // ---- Grazing summary mode (GR, is_summary) — season totals the tab collects ----------
  // Declared 2026-09-06; until then a grower who logged a season of grazing passes as one record
  // saw neither total on any surface. Producer surfaces only — the buyer card's aggregate tile
  // already reads area_covered_total.
  {
    name: 'total_grazing_days',
    labelKey: 'events.soil.fields.totalGrazingDays',
    valueType: 'number',
    formatter: formatDurationDays as FieldFormatter<unknown, SoilData>,
    visibleForSubtypes: ['GR'],
    visibleWhen: isSummaryRecord,
    surfaces: { modal: 'immediate', form: 'immediate' }
  },
  {
    name: 'area_covered_total',
    labelKey: 'events.soil.fields.areaCoveredTotal',
    valueType: 'number',
    unitField: 'area_unit',
    formatter: formatArea as FieldFormatter<unknown, SoilData>,
    visibleForSubtypes: ['GR'],
    visibleWhen: isSummaryRecord,
    surfaces: { modal: 'immediate', form: 'immediate' }
  },

  // ---- Biodiversity / Habitat (HD = developed habitat, NS = nesting/shelter) ----
  // Facts only — never a biodiversity score. The living-floor / bugs / birds proof rides on photos.
  {
    name: 'habitat_type',
    labelKey: 'events.soil.fields.habitatType',
    valueType: 'enum',
    formatter: formatHabitatType,
    visibleForSubtypes: ['HD', 'NS'],
    surfaces: {
      timeline: 'immediate',
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      consumer_card: 'hero',
      consumer_timeline: 'immediate'
    }
  },
  {
    name: 'habitat_structure_count',
    labelKey: 'events.soil.fields.habitatStructureCount',
    valueType: 'number',
    formatter: formatNumber,
    visibleForSubtypes: ['NS'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    // habitat maturity — an established hedgerow / long-standing owl box is a stronger signal, so
    // "Established 2019" belongs in Key Details (immediate), not the collapsed Additional section.
    name: 'habitat_install_date',
    labelKey: 'events.soil.fields.habitatInstallDate',
    valueType: 'string',
    visibleForSubtypes: ['HD', 'NS'],
    formatter: (v) => {
      if (typeof v !== 'string' || !v) return null;
      // date-only ("YYYY-MM-DD") must parse as LOCAL — `new Date("YYYY-MM-DD")` is UTC midnight,
      // which renders as the PREVIOUS month in negative-offset zones (e.g. "2020-01-01" -> "Dec 2019").
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
      const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(v);
      if (isNaN(d.getTime())) return v;
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    },
    surfaces: {
      modal: 'immediate',
      form: 'secondary',
      consumer_card: 'immediate',
      consumer_timeline: 'secondary'
    }
  },
  {
    name: 'species_planted',
    labelKey: 'events.soil.fields.speciesPlanted',
    valueType: 'string',
    visibleForSubtypes: ['HD'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'structure_notes',
    labelKey: 'events.soil.fields.structureNotes',
    valueType: 'string',
    visibleForSubtypes: ['NS'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    // CC subtype cover-crop species (extra_data; NOP §205.203). A documented regen
    // practice — consumer-safe fact, so it carries a consumer_card surface.
    name: 'cover_crop_species',
    labelKey: 'events.soil.coverCropSpecies',
    valueType: 'string',
    visibleForSubtypes: ['CC'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'wildlife_observed',
    labelKey: 'events.soil.fields.wildlifeObserved',
    valueType: 'string',
    visibleForSubtypes: ['HD', 'NS'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },

  // ---- Carbon/fuel (ALL subtypes, carbon-relevant) ----
  {
    name: 'fuel_consumed',
    labelKey: 'events.common.fields.fuelConsumed',
    valueType: 'number',
    unitField: 'fuel_unit',
    formatter: formatFuelConsumption,
    carbonRelevant: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
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
      form: 'secondary'
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
    name: 'carbon_sequestration_potential',
    labelKey: 'events.soil.fields.carbonSequestration',
    valueType: 'number',
    carbonRelevant: true,
    formatter: formatNumber,
    surfaces: {
      modal: 'secondary'
    }
  },

  // ---- Context ----
  {
    name: 'weather_conditions',
    labelKey: 'events.common.fields.weatherConditions',
    valueType: 'enum',
    formatter: formatWeatherConditions,
    // 🔴 `form` surface removed 2026-08-15. The input was deleted from
    // SoilManagementTab in Sprint 2 Epic 2.1.3, but this declaration stayed — so the
    // registry promised a form field that does not exist, and the conformance guard
    // could not see it because the only mention left in the tab was the COMMENT
    // recording the removal. `modal` is kept so previously-saved values still render.
    surfaces: { modal: 'details' }
  },
  {
    // See weatherEvent.ts for the full rationale: modal surface omitted so
    // the Field Notes top card isn't duplicated in the Detailed Information grid.
    name: 'observation',
    labelKey: 'events.common.fields.observation',
    valueType: 'text',
    surfaces: {
      form: 'details',
      consumer_card: 'secondary'
    }
  },
  {
    // The PRIVATE half of the note pair. `observation` above publishes in the grower's own words;
    // this is the box for everything they need recorded and no buyer should read.
    //
    // ⛔ No `preview`, no `consumer_card`, no `timeline`:
    //   - `consumer_card` would publish it, the one thing it must never do (the server also
    //     strips it — `PublicHistorySerializer._CERTIFIER_ONLY_EVENT_FIELDS`).
    //   - `preview` is the "how consumers will see this event" card built from RAW WIZARD DATA,
    //     so showing it there would tell the grower a shopper is about to read it.
    name: 'private_note',
    labelKey: 'events.common.fields.privateNote',
    helpKey: 'events.common.help.privateNoteAudience',
    valueType: 'text',
    surfaces: {
      form: 'immediate',
      modal: 'secondary'
    }
  },
  // ---- FSMA § 112.161(b) supervisor sign-off (CommonEvent, ALL subtypes) ----
  //
  // 🔴 2026-08-31 — declared in chemicalEvent.ts and NOWHERE else, while this family's form
  // collects it on every subtype. A grower ticked "Supervisor review", named the reviewer and
  // dated it; the record saved all three and the modal showed none of them. The certifier
  // packet prints the sign-off in its attestation section, so the only reader who could not
  // see it was the operation itself.
  //
  // Producer/certifier surfaces only: who countersigned a farm record is not a shopper's fact.
  {
    name: 'reviewed',
    labelKey: 'events.common.fields.reviewed',
    valueType: 'boolean',
    formatter: formatBoolean,
    // Only when true — BooleanField(default=False) would otherwise print "Supervisor
    // reviewed: ✗" on every unreviewed record. Bug Pattern #6.
    visibleWhen: (e) => e.reviewed === true || e.reviewed === 'true',
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    name: 'reviewer_name',
    labelKey: 'events.common.fields.reviewerName',
    valueType: 'string',
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    name: 'review_date',
    labelKey: 'events.common.fields.reviewDate',
    valueType: 'date',
    formatter: formatDate,
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    name: 'performed_by',
    labelKey: 'events.common.fields.performedBy',
    valueType: 'string',
    surfaces: { modal: 'details', form: 'details' }
  },
  {
    name: 'growth_stage',
    labelKey: 'events.common.fields.growthStage',
    valueType: 'enum',
    enumSource: 'growth_stages',
    surfaces: { modal: 'details', form: 'details' }
  },
  {
    name: 'production_efficiency',
    labelKey: 'events.common.fields.productionEfficiency',
    valueType: 'enum',
    enumSource: 'production_efficiency',
    surfaces: { modal: 'details', form: 'secondary' }
  },
  {
    name: 'equipment_used',
    labelKey: 'events.common.fields.equipmentUsed',
    valueType: 'string',
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },

  // ---- NOP Audit Traceability Fields ----
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
    surfaces: {
      card: 'immediate',
      modal: 'details',
      form: 'secondary'
    }
  },
  {
    name: 'variety',
    labelKey: 'fieldDetails.variety',
    valueType: 'string',
    surfaces: {
      modal: 'details',
      form: 'secondary'
    }
  }
];

export const soilEventRegistry: EventRegistryEntry<SoilManagementSubtype, SoilData> = {
  eventType: 5,
  eventTypeName: 'soil_management',
  labelKey: 'events.types.soilManagement',
  subtypes: [
    { code: 'ST', labelKey: 'events.soil.subtypes.soilTest', photoTier: 'recommended' },
    { code: 'PA', labelKey: 'events.soil.subtypes.phAdjustment', photoTier: 'optional' },
    { code: 'OM', labelKey: 'events.soil.subtypes.organicMatter', photoTier: 'recommended' },
    { code: 'CC', labelKey: 'events.soil.subtypes.coverCrop', photoTier: 'essential' },
    { code: 'TI', labelKey: 'events.soil.subtypes.tillage', photoTier: 'optional' },
    { code: 'CO', labelKey: 'events.soil.subtypes.composting', photoTier: 'recommended' },
    { code: 'GR', labelKey: 'events.soil.subtypes.grazing', photoTier: 'recommended' },
    // §E-2 — matches ST's tier: the typed results are the record, a photo of the lab report
    // corroborates it. Mirrors PHOTO_TIER_RECOMMENDED in transparency_calculator.py.
    { code: 'LA', labelKey: 'events.soil.subtypes.labAnalysis', photoTier: 'recommended' },
    // D4 — HD and NS existed on the backend and in this form but were absent from the registry,
    // so nothing here described them. `photoTier` MIRRORS the backend: neither code appears in
    // PHOTO_TIER_ESSENTIAL or PHOTO_TIER_RECOMMENDED, so no photo penalty applies and claiming
    // a stricter tier here would misstate the score a farmer is about to receive.
    { code: 'HD', labelKey: 'events.soil.subtypes.habitatDevelopment', photoTier: 'optional' },
    { code: 'NS', labelKey: 'events.soil.subtypes.nestingShelter', photoTier: 'optional' }
  ],
  defaultPhotoTier: 'optional',
  fields: SOIL_FIELDS
};
