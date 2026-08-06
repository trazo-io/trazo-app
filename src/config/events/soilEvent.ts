/**
 * Soil Management Event Registry.
 *
 * 8 subtypes: ST(Soil Test), PA(pH Adjustment), OM(Organic Matter),
 * CC(Cover Crop), TI(Tillage), CO(Composting), GR(Grazing), LA(Lab Analysis).
 *
 * GR (Grazing) has unique fields: animal_type, animal_count, grazing_duration_days.
 * TI (Tillage) has unique fields: working_depth, depth_unit.
 * LA (Lab Analysis) has sample_matrix + the lab_* results, which the backend flattens out of
 * the test_results JSONField so the resolver can reach them; ST shares the lab_* block.
 *
 * HD (Habitat Development) and NS (Nesting / Shelter) exist on the backend but are not yet
 * registered here — see D4.
 */

import type { EventRegistryEntry, FieldConfig, SoilManagementSubtype } from './registry';
import {
  formatArea,
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
  compost: 'Compost',
  manure: 'Manure',
  other: 'Other Amendment'
};

const formatAmendmentType = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return AMENDMENT_TYPE_LABELS[v] ?? v;
};

// Soil texture labels — match SoilManagementTab.jsx dropdown
const SOIL_TEXTURE_LABELS: Record<string, string> = {
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
    name: 'area_covered',
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
  // Micronutrient results — the documented deficiency that 7 CFR 205.601(j)(6) requires
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
    name: 'soil_ph',
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
    name: 'organic_matter_percentage',
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

  // ---- NOP Compliance: Amendment organic approval (7 CFR 205.203(b)) ----
  {
    name: 'amendment_organic_approved',
    labelKey: 'events.soil.fields.amendmentOrganicApproved',
    valueType: 'enum',
    enumSource: 'organic_approved',
    formatter: formatOrganicApproved,
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
  {
    name: 'soil_texture',
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
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
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
    surfaces: { modal: 'details', form: 'secondary' }
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
    labelKey: 'fieldDetails.blockId',
    valueType: 'string',
    surfaces: {
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
