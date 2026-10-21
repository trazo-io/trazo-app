/**
 * Shared Enum Options Catalog — frontend counterpart to
 * trazo-back/common/field_registry.py.
 *
 * Every enum option (value + i18n labelKey) used across event forms and
 * displays lives here. Replaces 4x duplicated FUEL_TYPES arrays in the
 * *Tab.jsx files, duplicated unit arrays, etc.
 *
 * IMPORTANT: The VALUE strings must exactly match the backend model's
 * choices=(...) tuples. Use `npm run typegen` to regenerate api.generated.ts
 * and verify these values against backend types.
 */

/** Single enum option (value + i18n key for label) */
export interface EnumOption {
  value: string;
  labelKey: string;
  /** Optional description for help text */
  descKey?: string;
  /** Optional emoji/icon identifier */
  iconKey?: string;
  /**
   * A stored value kept so historical records still render, but never offered for a new
   * choice: a select shows it only when the record already holds it.
   */
  legacyOnly?: boolean;
}

// ============================================================================
// UNIT ENUMS
// ============================================================================

/** Area units — ProductionEvent, ChemicalEvent, SoilManagementEvent, etc. */
export const AREA_UNITS: readonly EnumOption[] = [
  { value: 'ha', labelKey: 'events.units.area.hectares' },
  { value: 'acres', labelKey: 'events.units.area.acres' },
  { value: 'm2', labelKey: 'events.units.area.squareMeters' },
  { value: 'km2', labelKey: 'events.units.area.squareKilometers' }
] as const;

/**
 * Application-rate units — a quantity PER unit of land.
 *
 * ⛔ Mirrors `UNIT_APPLICATION_RATE` in `trazo-back/common/field_registry.py`. The value strings
 * are the model's `choices`, so a value here that is not there is rejected on save.
 *
 * The labels are SYMBOLS, and identical in both locales on purpose: "fl oz/ac" is how the
 * product label prints it in English and in Spanish, and a translated unit ("onzas líquidas por
 * acre") is longer, less recognisable to the person holding the jug, and a new way for the two
 * locales to disagree about what a number means.
 */
export const APPLICATION_RATE_UNITS: readonly EnumOption[] = [
  { value: 'fl_oz_ac', labelKey: 'events.units.rate.flOzPerAcre' },
  { value: 'pt_ac', labelKey: 'events.units.rate.ptPerAcre' },
  { value: 'qt_ac', labelKey: 'events.units.rate.qtPerAcre' },
  { value: 'gal_ac', labelKey: 'events.units.rate.galPerAcre' },
  { value: 'oz_ac', labelKey: 'events.units.rate.ozPerAcre' },
  { value: 'lb_ac', labelKey: 'events.units.rate.lbPerAcre' },
  { value: 'ton_ac', labelKey: 'events.units.rate.tonPerAcre' },
  { value: 'mL_ha', labelKey: 'events.units.rate.mlPerHectare' },
  { value: 'L_ha', labelKey: 'events.units.rate.lPerHectare' },
  { value: 'g_ha', labelKey: 'events.units.rate.gPerHectare' },
  { value: 'kg_ha', labelKey: 'events.units.rate.kgPerHectare' },
  { value: 't_ha', labelKey: 'events.units.rate.tPerHectare' }
] as const;

/**
 * The printed form of each rate unit, for read-only surfaces.
 *
 * Display surfaces resolve values through formatters, which have no `intl` — the same reason
 * MICRONUTRIENT_LABELS and FLOOR_MANAGEMENT_LABELS exist as plain maps beside their formatter.
 * These are symbols, so there is nothing to localise and no es-419 twin is needed.
 */
export const APPLICATION_RATE_UNIT_SYMBOLS: Record<string, string> = {
  fl_oz_ac: 'fl oz/ac',
  pt_ac: 'pt/ac',
  qt_ac: 'qt/ac',
  gal_ac: 'gal/ac',
  oz_ac: 'oz/ac',
  lb_ac: 'lb/ac',
  ton_ac: 'ton/ac',
  mL_ha: 'mL/ha',
  L_ha: 'L/ha',
  g_ha: 'g/ha',
  kg_ha: 'kg/ha',
  t_ha: 't/ha'
};

/**
 * Volume units for liquid and solid chemicals and fertilizers. Mirrors UNIT_VOLUME (common/field_registry).
 *
 * Fluid and weight ounces are separate units (2026-10-17, pilot rehearsal: "36 oz" printed beside
 * a "6 fl oz/acre" rate). The old single `oz` stays for records that hold it and is never offered
 * for a new one: it does not say which ounce it means.
 */
export const VOLUME_UNITS: readonly EnumOption[] = [
  { value: 'L', labelKey: 'events.units.volume.liters' },
  { value: 'gal', labelKey: 'events.units.volume.gallons' },
  { value: 'mL', labelKey: 'events.units.volume.milliliters' },
  { value: 'fl_oz', labelKey: 'events.units.volume.fluidOunces' },
  { value: 'oz_wt', labelKey: 'events.units.volume.ouncesWeight' },
  { value: 'oz', labelKey: 'events.units.volume.ounces', legacyOnly: true },
  { value: 'kg', labelKey: 'events.units.volume.kilograms' },
  { value: 'lbs', labelKey: 'events.units.volume.pounds' },
  // A COUNT, not a measure (2026-10-20): mating-disruption dispensers are hung by hand, a few
  // hundred per acre. Mirrors UNIT_VOLUME `dispensers`; the backend never converts it to kg or L.
  { value: 'dispensers', labelKey: 'events.units.volume.dispensers' }
] as const;

/** Fuel units — diesel, gasoline, electricity */
// Gas units are NOT optional extras. The EPA natural-gas factor is per standard
// cubic foot, so a dryer or huller running on gas cannot be recorded at all with
// only litres/gallons/kg — the backend refuses a liquid unit for a gas rather than
// emit a fabricated near-zero figure. therm/ccf are what US gas bills are printed in.
export const FUEL_UNITS: readonly EnumOption[] = [
  { value: 'L', labelKey: 'events.units.fuel.liters' },
  { value: 'gal', labelKey: 'events.units.fuel.gallons' },
  { value: 'kg', labelKey: 'events.units.fuel.kilograms' },
  { value: 'kWh', labelKey: 'events.units.fuel.kilowattHours' },
  { value: 'therm', labelKey: 'events.units.fuel.therms' },
  { value: 'ccf', labelKey: 'events.units.fuel.ccf' },
  { value: 'm3', labelKey: 'events.units.fuel.cubicMeters' },
  { value: 'MMBtu', labelKey: 'events.units.fuel.mmbtu' }
] as const;

/** Yield units — harvest quantities */
export const YIELD_UNITS: readonly EnumOption[] = [
  { value: 'kg', labelKey: 'events.units.yield.kilograms' },
  { value: 'tons', labelKey: 'events.units.yield.tonnes' },
  { value: 'lbs', labelKey: 'events.units.yield.pounds' },
  { value: 'boxes', labelKey: 'events.units.yield.boxes' },
  { value: 'bins', labelKey: 'events.units.yield.bins' },
  { value: 'plants', labelKey: 'events.units.yield.plants' },
  { value: 'seeds', labelKey: 'events.units.yield.seeds' }
] as const;

/** Distance units — transportation */
export const DISTANCE_UNITS: readonly EnumOption[] = [
  { value: 'km', labelKey: 'events.units.distance.kilometers' },
  { value: 'miles', labelKey: 'events.units.distance.miles' },
  { value: 'm', labelKey: 'events.units.distance.meters' }
] as const;

/** Depth units — irrigation, tillage */
export const DEPTH_UNITS: readonly EnumOption[] = [
  { value: 'inches', labelKey: 'events.units.depth.inches' },
  { value: 'cm', labelKey: 'events.units.depth.centimeters' }
] as const;

// ============================================================================
// FUEL TYPES (replaces 4 duplicated arrays in *Tab.jsx files)
// ============================================================================

/**
 * EPA-verified fuel types. SSOT for:
 * - ChemicalTab-ENHANCED.jsx:62 (previously local copy)
 * - ProductionTab.jsx:72 (previously local copy)
 * - PestManagementTab.jsx:46 (previously local copy)
 * - SoilManagementTab.jsx:30 (previously local copy)
 *
 * Backend: trazo-back/carbon/choices.py FUEL_TYPES
 */
export const FUEL_TYPES: readonly EnumOption[] = [
  { value: 'diesel', labelKey: 'events.fuelTypes.diesel', iconKey: 'diesel' },
  { value: 'gasoline', labelKey: 'events.fuelTypes.gasoline', iconKey: 'gasoline' },
  { value: 'electric', labelKey: 'events.fuelTypes.electric', iconKey: 'electric' },
  { value: 'propane', labelKey: 'events.fuelTypes.propane', iconKey: 'propane' },
  { value: 'natural_gas', labelKey: 'events.fuelTypes.naturalGas', iconKey: 'naturalGas' },
  { value: 'biodiesel', labelKey: 'events.fuelTypes.biodiesel', iconKey: 'biodiesel' },
  { value: 'none', labelKey: 'events.fuelTypes.none', iconKey: 'none' }
] as const;

// ============================================================================
// APPLICATION METHODS
// ============================================================================

/** Chemical application method */
export const APPLICATION_METHODS: readonly EnumOption[] = [
  { value: 'broadcast', labelKey: 'events.applicationMethods.broadcast' },
  { value: 'injection', labelKey: 'events.applicationMethods.injection' },
  { value: 'foliar', labelKey: 'events.applicationMethods.foliar' },
  { value: 'drip', labelKey: 'events.applicationMethods.drip' },
  { value: 'banding', labelKey: 'events.applicationMethods.banding' }
] as const;

/**
 * Hand-placed pheromone dispensers (mating disruption). Mirrors APPLICATION_METHOD
 * `hand_dispenser` in common/field_registry. The one method for which the chemical form does not
 * require a concentration: a dispenser is counted and hung, never mixed into a tank.
 */
export const HAND_DISPENSER_METHOD = 'hand_dispenser';

/**
 * True for a pesticide applied as hand-placed dispensers: the one record for which the form
 * waives concentration and accepts the `dispensers` count unit. Checks the TYPE too, because
 * switching the type away from PE leaves the stored method behind (review on app#166).
 */
export const isDispenserRecord = (type: unknown, method: unknown): boolean =>
  type === 'PE' && method === HAND_DISPENSER_METHOD;

/** Application methods filtered by chemical main type (FE/PE/FU/HE) */
export const APPLICATION_METHODS_BY_CHEMICAL_TYPE: Record<string, readonly EnumOption[]> = {
  FE: [
    { value: 'broadcast', labelKey: 'events.applicationMethods.broadcast' },
    { value: 'banded', labelKey: 'events.applicationMethods.banded' },
    { value: 'subsurface', labelKey: 'events.applicationMethods.subsurface' },
    { value: 'fertigation', labelKey: 'events.applicationMethods.fertigation' },
    { value: 'foliar', labelKey: 'events.applicationMethods.foliar' }
  ],
  PE: [
    { value: 'ground_spray', labelKey: 'events.applicationMethods.groundSpray' },
    // air_blast/aerial were absent from every spray subtype, so an orchard airblast
    // application fell through to the raw key and rendered "air_blast" to a shopper.
    { value: 'air_blast', labelKey: 'events.applicationMethods.airBlast' },
    { value: 'aerial', labelKey: 'events.applicationMethods.aerial' },
    { value: 'chemigation', labelKey: 'events.applicationMethods.chemigation' },
    { value: 'seed_treatment', labelKey: 'events.applicationMethods.seedTreatment' },
    { value: 'soil_incorporation', labelKey: 'events.applicationMethods.soilIncorporation' },
    // Fumigation was in the backend choices and in the PUR exporter (box 21 "Fume" + the
    // FFM-code requirement) but in no form list, so the FFM input — rendered only when the
    // method is fumigation — could never appear and box 21a was dead code (2026-09-05).
    { value: 'fumigation', labelKey: 'events.applicationMethods.fumigation' },
    // Pheromone dispensers for mating disruption (2026-10-20). Without it the grower picked a
    // spray method and the record printed into the packet as a spray. Insecticide only.
    { value: 'hand_dispenser', labelKey: 'events.applicationMethods.handDispenser' }
  ],
  HE: [
    { value: 'ground_spray', labelKey: 'events.applicationMethods.groundSpray' },
    { value: 'air_blast', labelKey: 'events.applicationMethods.airBlast' },
    { value: 'aerial', labelKey: 'events.applicationMethods.aerial' },
    { value: 'chemigation', labelKey: 'events.applicationMethods.chemigation' },
    { value: 'seed_treatment', labelKey: 'events.applicationMethods.seedTreatment' },
    { value: 'soil_incorporation', labelKey: 'events.applicationMethods.soilIncorporation' },
    // Fumigation was in the backend choices and in the PUR exporter (box 21 "Fume" + the
    // FFM-code requirement) but in no form list, so the FFM input — rendered only when the
    // method is fumigation — could never appear and box 21a was dead code (2026-09-05).
    { value: 'fumigation', labelKey: 'events.applicationMethods.fumigation' }
  ],
  FU: [
    { value: 'ground_spray', labelKey: 'events.applicationMethods.groundSpray' },
    { value: 'air_blast', labelKey: 'events.applicationMethods.airBlast' },
    { value: 'aerial', labelKey: 'events.applicationMethods.aerial' },
    { value: 'chemigation', labelKey: 'events.applicationMethods.chemigation' },
    { value: 'seed_treatment', labelKey: 'events.applicationMethods.seedTreatment' },
    { value: 'soil_incorporation', labelKey: 'events.applicationMethods.soilIncorporation' },
    // Fumigation was in the backend choices and in the PUR exporter (box 21 "Fume" + the
    // FFM-code requirement) but in no form list, so the FFM input — rendered only when the
    // method is fumigation — could never appear and box 21a was dead code (2026-09-05).
    { value: 'fumigation', labelKey: 'events.applicationMethods.fumigation' }
  ]
} as const;

/** USDA NASS 2023 irrigation methods */
export const IRRIGATION_METHODS: readonly EnumOption[] = [
  { value: 'flood', labelKey: 'events.irrigationMethods.flood' },
  { value: 'furrow', labelKey: 'events.irrigationMethods.furrow' },
  { value: 'drip', labelKey: 'events.irrigationMethods.drip' },
  { value: 'sprinkler', labelKey: 'events.irrigationMethods.sprinkler' },
  { value: 'center_pivot', labelKey: 'events.irrigationMethods.centerPivot' },
  { value: 'sub_irrigation', labelKey: 'events.irrigationMethods.subIrrigation' },
  { value: 'micro_sprinkler', labelKey: 'events.irrigationMethods.microSprinkler' },
  { value: 'hand_watering', labelKey: 'events.irrigationMethods.handWatering' },
  { value: 'rain_fed', labelKey: 'events.irrigationMethods.rainFed' }
] as const;

// ============================================================================
// SOURCE ENUMS
// ============================================================================

/**
 * Seed/seedling SOURCE — where the seed came from. (Backend: SEEDS_SOURCE)
 * Note: 'certified_organic' was removed in 2026-04-13 (migration 0152) — it is a
 * regulatory status, not a source. Use SEED_CERTIFICATION_STATUSES below.
 */
export const SEEDS_SOURCES: readonly EnumOption[] = [
  { value: 'farm_saved', labelKey: 'events.seedsSources.farmSaved' },
  { value: 'local', labelKey: 'events.seedsSources.local' },
  { value: 'cooperative', labelKey: 'events.seedsSources.cooperative' },
  { value: 'commercial', labelKey: 'events.seedsSources.commercial' },
  { value: 'other', labelKey: 'events.seedsSources.other' }
] as const;

/**
 * Seed regulatory classification — NOP 7 CFR 205.204.
 * Backend: SEED_CERTIFICATION_STATUS (common/field_registry.py).
 * 'non_organic_treated' (with prohibited substances) disqualifies the crop.
 */
export const SEED_CERTIFICATION_STATUSES: readonly EnumOption[] = [
  { value: 'certified_organic', labelKey: 'events.seedCertificationStatus.certifiedOrganic' },
  { value: 'transitional', labelKey: 'events.seedCertificationStatus.transitional' },
  {
    value: 'non_organic_untreated',
    labelKey: 'events.seedCertificationStatus.nonOrganicUntreated'
  },
  {
    value: 'non_organic_treated',
    labelKey: 'events.seedCertificationStatus.nonOrganicTreated'
  }
] as const;

export const WATER_SOURCES: readonly EnumOption[] = [
  { value: 'well_groundwater', labelKey: 'events.waterSources.wellGroundwater' },
  { value: 'municipal', labelKey: 'events.waterSources.municipal' },
  { value: 'rainwater_harvesting', labelKey: 'events.waterSources.rainwaterHarvesting' },
  { value: 'irrigation_canal', labelKey: 'events.waterSources.irrigationCanal' },
  { value: 'river_stream', labelKey: 'events.waterSources.riverStream' },
  { value: 'pond_reservoir', labelKey: 'events.waterSources.pondReservoir' },
  { value: 'recycled_water', labelKey: 'events.waterSources.recycledWater' },
  { value: 'other', labelKey: 'events.waterSources.other' }
] as const;

export const ELECTRICITY_SOURCES: readonly EnumOption[] = [
  { value: 'grid', labelKey: 'events.electricitySources.grid' },
  { value: 'solar', labelKey: 'events.electricitySources.solar' },
  { value: 'wind', labelKey: 'events.electricitySources.wind' },
  { value: 'diesel_generator', labelKey: 'events.electricitySources.dieselGenerator' },
  { value: 'mixed', labelKey: 'events.electricitySources.mixed' }
] as const;

// ============================================================================
// EFFICIENCY / GRADES
// ============================================================================

export const PRODUCTION_EFFICIENCY: readonly EnumOption[] = [
  { value: 'high', labelKey: 'events.productionEfficiency.high' },
  { value: 'normal', labelKey: 'events.productionEfficiency.normal' },
  { value: 'low', labelKey: 'events.productionEfficiency.low' }
] as const;

/**
 * ⛔ LEGACY DISPLAY ONLY (F5, 2026-08-21). Not a picker any more.
 *
 * These six were the harvest EVENT's grade list while the season HEADER offered a different
 * five — two vocabularies for one fact, neither of them a grade a US packing record uses. The
 * live vocabulary is crop-aware and lives in `config/harvestGrades.ts`; both forms render it.
 *
 * This list survives so a record written before the change still resolves its i18n label on a
 * card or a detail modal (`resolver.ts` → `getEnumLabel`). A real grade needs no entry: it is
 * its own label and the resolver falls through to the raw string, which is the point —
 * "U.S. No. 1" is what the packing record says and what the packet prints.
 */
export const HARVEST_QUALITY_GRADES: readonly EnumOption[] = [
  { value: 'export_quality', labelKey: 'events.harvestQuality.export' },
  { value: 'grade_a', labelKey: 'events.harvestQuality.gradeA' },
  { value: 'grade_b', labelKey: 'events.harvestQuality.gradeB' },
  { value: 'grade_c', labelKey: 'events.harvestQuality.gradeC' },
  { value: 'domestic', labelKey: 'events.harvestQuality.domestic' },
  { value: 'processing', labelKey: 'events.harvestQuality.processing' }
] as const;

// WS-4 (2026-08) — harvest-record completeness (§ 205.103(b)(2); § 205.202(c))
export const AMOUNT_DETERMINATIONS: readonly EnumOption[] = [
  { value: 'estimated', labelKey: 'events.amountDetermination.estimated' },
  { value: 'scale_verified', labelKey: 'events.amountDetermination.scaleVerified' }
] as const;

export const HARVEST_DESTINATIONS: readonly EnumOption[] = [
  { value: 'stored', labelKey: 'events.harvestDestination.stored' },
  { value: 'sold_direct', labelKey: 'events.harvestDestination.soldDirect' },
  // CCOF grower checklist item 6. Sending a lot to a custom huller is not a sale — title does
  // not change — and with no option for it a grower would enter the handler as a BUYER on a
  // sales record, putting a non-sale into the § 205.307 sales table and breaking mass balance.
  // MUST stay identical to HARVEST_DESTINATION in common/field_registry.py.
  { value: 'handler', labelKey: 'events.harvestDestination.handler' },
  { value: 'livestock_feed', labelKey: 'events.harvestDestination.livestockFeed' },
  { value: 'other', labelKey: 'events.harvestDestination.other' }
] as const;

export const BUFFER_DISPOSITIONS: readonly EnumOption[] = [
  { value: 'not_harvested', labelKey: 'events.bufferDisposition.notHarvested' },
  { value: 'left_in_field', labelKey: 'events.bufferDisposition.leftInField' },
  { value: 'sold_conventional', labelKey: 'events.bufferDisposition.soldConventional' },
  {
    value: 'fed_nonorganic_livestock',
    labelKey: 'events.bufferDisposition.fedNonorganicLivestock'
  },
  { value: 'disposed', labelKey: 'events.bufferDisposition.disposed' },
  { value: 'given_away', labelKey: 'events.bufferDisposition.givenAway' },
  // Legacy value — superseded by sold_conventional but kept so stored rows render.
  { value: 'harvested_conventional', labelKey: 'events.bufferDisposition.harvestedConventional' }
] as const;

export const APPLIED_SCOPES: readonly EnumOption[] = [
  { value: 'all', labelKey: 'events.appliedScope.all' },
  { value: 'part', labelKey: 'events.appliedScope.part' }
] as const;

/** What a cleanout event cleaned (§ 205.272(a) commingling prevention). */
export const CLEANING_ASSET_CLASSES: readonly EnumOption[] = [
  { value: 'equipment', labelKey: 'events.cleaningAssetClass.equipment' },
  { value: 'harvest_bins', labelKey: 'events.cleaningAssetClass.harvestBins' },
  { value: 'storage', labelKey: 'events.cleaningAssetClass.storage' },
  { value: 'transport_vehicle', labelKey: 'events.cleaningAssetClass.transportVehicle' },
  // Added for Quick Organics parity (2026-08-19). ⚠️ This vocabulary exists in THREE places —
  // here, the <option> list in ProductionTab.jsx, and CLEANING_ASSET_CLASS in the backend's
  // common/field_registry.py. Updating only the backend is what shipped a migration whose new
  // choices no farmer could select. `cleaningAssetClassParity.test.ts` now fails when they drift.
  { value: 'processing_line', labelKey: 'events.cleaningAssetClass.processingLine' },
  { value: 'livestock_housing', labelKey: 'events.cleaningAssetClass.livestockHousing' },
  { value: 'other', labelKey: 'events.cleaningAssetClass.other' }
] as const;

// ============================================================================
// AGRONOMIC / CROP
// ============================================================================

/** Growth stages (CommonEvent.growth_stage on ALL event types) */
export const GROWTH_STAGES: readonly EnumOption[] = [
  { value: 'dormant', labelKey: 'events.growthStage.dormant' },
  { value: 'budbreak', labelKey: 'events.growthStage.budbreak' },
  { value: 'bloom', labelKey: 'events.growthStage.bloom' },
  { value: 'fruit_set', labelKey: 'events.growthStage.fruitSet' },
  { value: 'vegetative', labelKey: 'events.growthStage.vegetative' },
  { value: 'maturation', labelKey: 'events.growthStage.maturation' },
  { value: 'harvest_ready', labelKey: 'events.growthStage.harvestReady' },
  { value: 'post_harvest', labelKey: 'events.growthStage.postHarvest' }
] as const;

// ============================================================================
// COMPLIANCE / CERTIFICATION
// ============================================================================

export const ORGANIC_APPROVED: readonly EnumOption[] = [
  { value: 'omri_listed', labelKey: 'events.organicApproved.omriListed' },
  { value: 'wsda_listed', labelKey: 'events.organicApproved.wsdaListed' },
  { value: 'nop_seal_on_label', labelKey: 'events.organicApproved.nopSeal' },
  { value: 'certifier_approved', labelKey: 'events.organicApproved.certifierApproved' },
  // Legacy values — retired from the picker 2026-08-15 (see common/field_registry.py), kept
  // here so previously-saved rows render a label instead of a raw slug.
  { value: 'usda_nop_approved', labelKey: 'events.organicApproved.usdaNop' },
  { value: 'organic_equivalent', labelKey: 'events.organicApproved.organicEquivalent' },
  { value: 'not_organic', labelKey: 'events.organicApproved.notOrganic' },
  { value: 'transitional', labelKey: 'events.organicApproved.transitional' }
] as const;

/**
 * The verification bases a form may OFFER today. USDA's Input Material Application Record
 * names exactly four, verbatim: OMRI or WSDA listing, the NOP seal on the label, or certifier
 * review and approval — plus the two negative answers a grower still needs.
 */
export const ORGANIC_APPROVED_OFFERED: readonly string[] = [
  'omri_listed',
  'wsda_listed',
  'nop_seal_on_label',
  'certifier_approved',
  'not_organic',
  'transitional'
];

/**
 * Label key for a value the picker no longer offers but a saved row may still hold.
 *
 * 🔴 Why this exists (2026-08-19): a `<select>` bound to a value with no matching `<option>`
 * shows the placeholder, and the next save writes `''`. Retiring `usda_nop_approved` and
 * `organic_equivalent` from the picker therefore SILENTLY ERASED the recorded § 205.203(b) /
 * § 205.601 verification basis of every older record a grower happened to reopen — on records
 * already filed with a certifier. Retiring an option from the picker must never delete the
 * answer someone already gave; the form keeps it selectable, marked as retired, until the
 * grower deliberately replaces it.
 *
 * Returns null when the value is one the picker still offers (or is empty).
 */
export const retiredOrganicApprovedLabelKey = (value?: string | null): string | null => {
  if (!value || ORGANIC_APPROVED_OFFERED.includes(value)) return null;
  const keys: Record<string, string> = {
    usda_nop_approved: 'events.organicApproved.usdaNop',
    organic_equivalent: 'events.organicApproved.organicEquivalent',
    yes: 'quickAdd.fields.organicApproved.legacyYes',
    no: 'quickAdd.fields.organicApproved.legacyNo',
    not_applicable: 'events.organicApproved.notApplicable'
  };
  return keys[value] ?? null;
};

/**
 * The i18n key for one application-method VALUE, across every subtype's list.
 *
 * Needed because the voice panel echoes the method back to the farmer, and since 2026-09-03 the
 * parser answers with the catalogue CODE rather than the farmer's own word — so a Spanish
 * grower who said "nebulizadora" was shown a chip reading **air_blast**. A raw enum key in the
 * UI is the `waste_reduction` failure again: the value is correct and the presentation is not
 * language at all.
 *
 * Returns null for anything not in the catalogue — legacy free text, which is the farmer's own
 * wording and should be shown exactly as it is.
 */
const APPLICATION_METHOD_LABEL_KEYS: Record<string, string> = [
  ...APPLICATION_METHODS,
  ...Object.values(APPLICATION_METHODS_BY_CHEMICAL_TYPE).flat()
].reduce((acc, option) => {
  acc[option.value] = option.labelKey;
  return acc;
}, {} as Record<string, string>);

export function applicationMethodLabelKey(value: string | null | undefined): string | null {
  if (!value) return null;
  return APPLICATION_METHOD_LABEL_KEYS[value] ?? null;
}

// ============================================================================
// EQUIPMENT
// ============================================================================

export const EQUIPMENT_TYPES: readonly EnumOption[] = [
  { value: 'tractor', labelKey: 'events.equipmentTypes.tractor' },
  { value: 'harvester', labelKey: 'events.equipmentTypes.harvester' },
  { value: 'sprayer', labelKey: 'events.equipmentTypes.sprayer' },
  { value: 'truck', labelKey: 'events.equipmentTypes.truck' },
  { value: 'generator', labelKey: 'events.equipmentTypes.generator' },
  { value: 'pump', labelKey: 'events.equipmentTypes.pump' },
  { value: 'other', labelKey: 'events.equipmentTypes.other' }
] as const;

// ============================================================================
// CHEMICAL SUBTYPES
// ============================================================================

export const CHEMICAL_SUBTYPES_BY_MAIN_TYPE: Record<string, readonly EnumOption[]> = {
  FE: [
    { value: 'synthetic_fertilizer', labelKey: 'events.chemicalSubtypes.syntheticFertilizer' },
    { value: 'organic_fertilizer', labelKey: 'events.chemicalSubtypes.organicFertilizer' },
    { value: 'slow_release_fertilizer', labelKey: 'events.chemicalSubtypes.slowRelease' }
  ],
  PE: [
    { value: 'synthetic_pesticide', labelKey: 'events.chemicalSubtypes.syntheticPesticide' },
    { value: 'organic_pesticide', labelKey: 'events.chemicalSubtypes.organicPesticide' },
    { value: 'biological_pesticide', labelKey: 'events.chemicalSubtypes.biologicalPesticide' }
  ],
  FU: [
    { value: 'synthetic_fungicide', labelKey: 'events.chemicalSubtypes.syntheticFungicide' },
    { value: 'organic_fungicide', labelKey: 'events.chemicalSubtypes.organicFungicide' },
    { value: 'copper_fungicide', labelKey: 'events.chemicalSubtypes.copperFungicide' },
    { value: 'sulfur_fungicide', labelKey: 'events.chemicalSubtypes.sulfurFungicide' },
    { value: 'biological_fungicide', labelKey: 'events.chemicalSubtypes.biologicalFungicide' }
  ],
  HE: [
    { value: 'synthetic_herbicide', labelKey: 'events.chemicalSubtypes.syntheticHerbicide' },
    { value: 'organic_herbicide', labelKey: 'events.chemicalSubtypes.organicHerbicide' }
  ]
} as const;

// ============================================================================
// GENERAL ACTIVITY TYPES
// ============================================================================

/** Activity types for General events (free-form farm activities) */
export const GENERAL_ACTIVITY_TYPES: readonly EnumOption[] = [
  { value: 'maintenance', labelKey: 'events.general.activityTypes.maintenance' },
  { value: 'planning', labelKey: 'events.general.activityTypes.planning' },
  { value: 'training', labelKey: 'events.general.activityTypes.training' },
  { value: 'documentation', labelKey: 'events.general.activityTypes.documentation' },
  { value: 'inspection', labelKey: 'events.general.activityTypes.inspection' },
  { value: 'meeting', labelKey: 'events.general.activityTypes.meeting' },
  { value: 'community', labelKey: 'events.general.activityTypes.community' },
  { value: 'precision_ag', labelKey: 'events.general.activityTypes.precisionAg' },
  { value: 'emergency', labelKey: 'events.general.activityTypes.emergency' },
  { value: 'other', labelKey: 'events.general.activityTypes.other' }
] as const;

// ============================================================================
// NOP COMPLIANCE ENUMS
// ============================================================================

/** Pest identification source — PestManagementEvent (7 CFR 205.206) */
export const IDENTIFIED_BY: readonly EnumOption[] = [
  { value: 'farmer', labelKey: 'enums.identified_by.farmer' },
  { value: 'agronomist', labelKey: 'enums.identified_by.agronomist' },
  { value: 'entomologist', labelKey: 'enums.identified_by.entomologist' },
  { value: 'extension_service', labelKey: 'enums.identified_by.extension_service' },
  { value: 'crop_consultant', labelKey: 'enums.identified_by.crop_consultant' },
  { value: 'lab', labelKey: 'enums.identified_by.lab' }
] as const;

/** Manure harvest interval — SoilManagementEvent (7 CFR 205.203(c)(1)) */
export const MANURE_HARVEST_INTERVALS: readonly EnumOption[] = [
  { value: '120', labelKey: 'enums.manure_harvest_intervals.120' },
  { value: '90', labelKey: 'enums.manure_harvest_intervals.90' },
  { value: 'na', labelKey: 'enums.manure_harvest_intervals.na' }
] as const;

/** Manure treatment class — SoilManagementEvent (NOP 5006 / 7 CFR 205.203(c)) */
export const MANURE_TREATMENTS: readonly EnumOption[] = [
  { value: 'raw', labelKey: 'enums.manure_treatments.raw' },
  { value: 'composted', labelKey: 'enums.manure_treatments.composted' },
  { value: 'processed_5006', labelKey: 'enums.manure_treatments.processed_5006' }
] as const;

/** USDA manure form #9 "How Applied / Incorporated" — SoilManagementEvent (OM) */
export const MANURE_APPLICATION_METHODS: readonly EnumOption[] = [
  {
    value: 'broadcast_incorporated',
    labelKey: 'enums.manure_application_methods.broadcast_incorporated'
  },
  { value: 'broadcast_surface', labelKey: 'enums.manure_application_methods.broadcast_surface' },
  { value: 'injected', labelKey: 'enums.manure_application_methods.injected' },
  { value: 'banded', labelKey: 'enums.manure_application_methods.banded' },
  { value: 'fertigation', labelKey: 'enums.manure_application_methods.fertigation' },
  { value: 'top_dressed', labelKey: 'enums.manure_application_methods.top_dressed' },
  { value: 'other', labelKey: 'enums.manure_application_methods.other' }
] as const;

/** USDA manure form #9 "Manure Type ... " — the animal in "Chicken, dry, on farm" */
export const MANURE_ANIMAL_SOURCES: readonly EnumOption[] = [
  { value: 'poultry', labelKey: 'enums.manure_animal_sources.poultry' },
  { value: 'cattle', labelKey: 'enums.manure_animal_sources.cattle' },
  { value: 'horse', labelKey: 'enums.manure_animal_sources.horse' },
  { value: 'sheep_goat', labelKey: 'enums.manure_animal_sources.sheep_goat' },
  { value: 'swine', labelKey: 'enums.manure_animal_sources.swine' },
  { value: 'rabbit', labelKey: 'enums.manure_animal_sources.rabbit' },
  { value: 'mixed', labelKey: 'enums.manure_animal_sources.mixed' },
  { value: 'other', labelKey: 'enums.manure_animal_sources.other' }
] as const;

/** USDA manure form #9 "... Form ..." — the "dry" in "Chicken, dry, on farm" */
export const MANURE_FORMS: readonly EnumOption[] = [
  { value: 'dry', labelKey: 'enums.manure_forms.dry' },
  { value: 'bedded_pack', labelKey: 'enums.manure_forms.bedded_pack' },
  { value: 'slurry', labelKey: 'enums.manure_forms.slurry' },
  { value: 'liquid', labelKey: 'enums.manure_forms.liquid' },
  { value: 'pelletized', labelKey: 'enums.manure_forms.pelletized' }
] as const;

/** USDA manure form #9 "... and Source" — the "on farm" in "Chicken, dry, on farm" */
export const MANURE_ORIGINS: readonly EnumOption[] = [
  { value: 'on_farm', labelKey: 'enums.manure_origins.on_farm' },
  { value: 'off_farm', labelKey: 'enums.manure_origins.off_farm' }
] as const;

/** Fertilizer nitrogen source — ChemicalEvent (NOP 5012 / 7 CFR 205.105(a)) */
export const NITROGEN_SOURCES: readonly EnumOption[] = [
  { value: 'organic', labelKey: 'enums.nitrogen_sources.organic' },
  { value: 'mined_natural', labelKey: 'enums.nitrogen_sources.mined_natural' },
  { value: 'synthetic_prohibited', labelKey: 'enums.nitrogen_sources.synthetic_prohibited' },
  { value: 'unknown', labelKey: 'enums.nitrogen_sources.unknown' }
] as const;

/**
 * Why an input was applied — ChemicalEvent.
 *
 * USDA's Input Material Application Record has a "Purpose / Reason for Use" column, and its
 * footnote 5 says why it matters: "Some materials, for example, are allowed for pest management
 * but not as a soil amendment." § 205.601 lists synthetics BY USE, so purpose is part of the
 * allowability record rather than a nicety.
 */
export const APPLICATION_PURPOSES: readonly EnumOption[] = [
  { value: 'soil_fertility', labelKey: 'enums.application_purposes.soil_fertility' },
  {
    value: 'micronutrient_deficiency',
    labelKey: 'enums.application_purposes.micronutrient_deficiency'
  },
  { value: 'soil_amendment', labelKey: 'enums.application_purposes.soil_amendment' },
  { value: 'ph_adjustment', labelKey: 'enums.application_purposes.ph_adjustment' },
  { value: 'pest_management', labelKey: 'enums.application_purposes.pest_management' },
  { value: 'disease_management', labelKey: 'enums.application_purposes.disease_management' },
  { value: 'weed_management', labelKey: 'enums.application_purposes.weed_management' },
  { value: 'plant_growth', labelKey: 'enums.application_purposes.plant_growth' },
  { value: 'other', labelKey: 'enums.application_purposes.other' }
] as const;

/**
 * Why a seed treatment is permitted — ProductionEvent.
 *
 * USDA's "Seed Records Part C" pairs every named treatment with a "Documentation of Allowed
 * Status" column. Naming the treatment without its basis is the same "named but unjustified"
 * shape as the 2026-08-09 OMRI leak. § 205.204(a)(2) + § 205.601.
 */
export const SEED_TREATMENT_BASES: readonly EnumOption[] = [
  { value: 'untreated', labelKey: 'enums.seed_treatment_bases.untreated' },
  { value: 'omri_listed', labelKey: 'enums.seed_treatment_bases.omri_listed' },
  { value: 'national_list', labelKey: 'enums.seed_treatment_bases.national_list' },
  { value: 'certifier_approved', labelKey: 'enums.seed_treatment_bases.certifier_approved' },
  { value: 'organic_seed', labelKey: 'enums.seed_treatment_bases.organic_seed' },
  { value: 'not_documented', labelKey: 'enums.seed_treatment_bases.not_documented' }
] as const;

/**
 * How exclusion of GMO / excluded methods was established — ProductionEvent.
 *
 * The third leg of USDA Form 11's allowed-status triple: (a) on an allowed list,
 * (b) no prohibited treatments, (c) non-GMO. 7 CFR 205.105(e) prohibits excluded methods
 * outright — it is the one of the three that is unconditional rather than conditional.
 *
 * NOT a boolean. "Not asked" and "checked and could not verify" are different records, and a
 * boolean collapses them into `false`, which reads on a certifier packet as a negative
 * finding against a grower who was never asked.
 *
 * ⚠️ Producer/certifier surface only — never a consumer_card. "Non-GMO" is a marketing claim
 * and every value here is self-reported.
 */
export const SEED_NON_GMO_STATUSES: readonly EnumOption[] = [
  { value: 'supplier_attested', labelKey: 'enums.seed_non_gmo_statuses.supplier_attested' },
  { value: 'seed_label', labelKey: 'enums.seed_non_gmo_statuses.seed_label' },
  { value: 'organic_certified', labelKey: 'enums.seed_non_gmo_statuses.organic_certified' },
  { value: 'not_verified', labelKey: 'enums.seed_non_gmo_statuses.not_verified' }
] as const;

/**
 * Statutory ground for using non-organic seed — ProductionEvent.
 *
 * § 205.204(a)(1) permits non-organic seed only when an equivalent organic variety is not
 * "commercially available", and § 205.2 defines that by three axes: appropriate FORM, QUALITY,
 * or QUANTITY. USDA's "Seed Records Part B" asks for exactly those words. Free text cannot be
 * reviewed against a three-part statutory test.
 */
export const SEED_NONAVAILABILITY_REASONS: readonly EnumOption[] = [
  { value: 'none_offered', labelKey: 'enums.seed_nonavailability_reasons.none_offered' },
  { value: 'form', labelKey: 'enums.seed_nonavailability_reasons.form' },
  { value: 'quality', labelKey: 'enums.seed_nonavailability_reasons.quality' },
  { value: 'quantity', labelKey: 'enums.seed_nonavailability_reasons.quantity' },
  { value: 'other', labelKey: 'enums.seed_nonavailability_reasons.other' }
] as const;

/** Contamination source — GeneralEvent (7 CFR 205.201(b)) */
export const CONTAMINATION_SOURCES: readonly EnumOption[] = [
  { value: 'spray_drift', labelKey: 'enums.contamination_sources.spray_drift' },
  { value: 'equipment', labelKey: 'enums.contamination_sources.equipment' },
  { value: 'storage', labelKey: 'enums.contamination_sources.storage' },
  { value: 'water', labelKey: 'enums.contamination_sources.water' },
  { value: 'soil', labelKey: 'enums.contamination_sources.soil' },
  { value: 'other', labelKey: 'enums.contamination_sources.other' }
] as const;

/**
 * ChemicalEvent.chemical_subtype — the product's COMPOSITION, which is what decides the
 * manufacturing emission factor (organic fertilizer is ~83% below synthetic;
 * carbon/services/verified_emission_factors.py holds the numbers).
 *
 * 🔴 2026-09-02: `chemicalEvent.ts` declared `enumSource: 'chemical_subtypes_by_main_type'`
 * and NO such key existed — `enumSource?: string` was untyped, so it compiled, `getEnumLabel`
 * returned null, and the resolver fell through to its de-underscore-and-capitalise fallback.
 * That produced "Copper Fungicide" where the authored label said "Copper-Based Fungicide",
 * and since `FIELD_VALUE_ES` is an EXACT-STRING map keyed to the authored labels, six of the
 * thirteen values rendered in English on the Spanish consumer card. Two parallel label maps
 * (utils/fieldDisplayUtils VALUE_MAPPINGS and utils/fieldValues.es) and neither was the one
 * the display path actually read.
 *
 * Values mirror CHEMICAL_SUBTYPE in common/field_registry.py, which IS the column's
 * `choices` (history/models.py ChemicalEvent.chemical_subtype). The four per-type
 * `*_SUBTYPE_CHOICES` lists beside it use SHORT forms ("copper", "organic") and do not feed
 * this column; `neonicotinoid` is read by eventDescriptions but is not a model choice, so it
 * is not offered here.
 */
export const CHEMICAL_SUBTYPES: readonly EnumOption[] = [
  // Fertilizer
  { value: 'synthetic_fertilizer', labelKey: 'enums.chemical_subtypes.synthetic_fertilizer' },
  { value: 'organic_fertilizer', labelKey: 'enums.chemical_subtypes.organic_fertilizer' },
  { value: 'slow_release_fertilizer', labelKey: 'enums.chemical_subtypes.slow_release_fertilizer' },
  // Pesticide
  { value: 'synthetic_pesticide', labelKey: 'enums.chemical_subtypes.synthetic_pesticide' },
  { value: 'organic_pesticide', labelKey: 'enums.chemical_subtypes.organic_pesticide' },
  { value: 'biological_pesticide', labelKey: 'enums.chemical_subtypes.biological_pesticide' },
  // Herbicide
  { value: 'synthetic_herbicide', labelKey: 'enums.chemical_subtypes.synthetic_herbicide' },
  { value: 'organic_herbicide', labelKey: 'enums.chemical_subtypes.organic_herbicide' },
  // Fungicide
  { value: 'synthetic_fungicide', labelKey: 'enums.chemical_subtypes.synthetic_fungicide' },
  { value: 'organic_fungicide', labelKey: 'enums.chemical_subtypes.organic_fungicide' },
  { value: 'copper_fungicide', labelKey: 'enums.chemical_subtypes.copper_fungicide' },
  { value: 'sulfur_fungicide', labelKey: 'enums.chemical_subtypes.sulfur_fungicide' },
  { value: 'biological_fungicide', labelKey: 'enums.chemical_subtypes.biological_fungicide' }
] as const;

/**
 * SoilEvent.compost_method — 7 CFR 205.203(c)(2).
 *
 * Second dangling `enumSource` found in the same 2026-09-02 sweep (`'compost_methods'`).
 * Harmless in DISPLAY, because the field also declares a bespoke `formatter` and the
 * resolver prefers it — but a dangling key makes `RegistryFormField` render an EMPTY
 * `<select>`, so it was one registry-driven form away from a field with no options.
 */
export const COMPOST_METHODS: readonly EnumOption[] = [
  { value: 'windrow', labelKey: 'enums.compost_methods.windrow' },
  { value: 'static_aerated', labelKey: 'enums.compost_methods.static_aerated' },
  { value: 'in_vessel', labelKey: 'enums.compost_methods.in_vessel' }
] as const;

// ============================================================================
// ENUM REGISTRY (keyed access for FieldConfig.enumSource)
// ============================================================================

/**
 * Central registry of all enum options. Field configs reference by key
 * via the `enumSource` property. Keeps TypeScript types in sync with
 * the enum options catalog.
 */
export const ENUM_OPTIONS = {
  // Units
  area_units: AREA_UNITS,
  volume_units: VOLUME_UNITS,
  application_rate_units: APPLICATION_RATE_UNITS,
  fuel_units: FUEL_UNITS,
  yield_units: YIELD_UNITS,
  distance_units: DISTANCE_UNITS,
  depth_units: DEPTH_UNITS,
  // Fuel
  fuel_types: FUEL_TYPES,
  // Methods
  application_methods: APPLICATION_METHODS,
  irrigation_methods: IRRIGATION_METHODS,
  // Sources
  seeds_sources: SEEDS_SOURCES,
  seed_certification_statuses: SEED_CERTIFICATION_STATUSES,
  water_sources: WATER_SOURCES,
  electricity_sources: ELECTRICITY_SOURCES,
  // Efficiency
  production_efficiency: PRODUCTION_EFFICIENCY,
  harvest_quality_grades: HARVEST_QUALITY_GRADES,
  // WS-4 harvest-record completeness + input scope
  amount_determinations: AMOUNT_DETERMINATIONS,
  harvest_destinations: HARVEST_DESTINATIONS,
  buffer_dispositions: BUFFER_DISPOSITIONS,
  applied_scopes: APPLIED_SCOPES,
  cleaning_asset_classes: CLEANING_ASSET_CLASSES,
  // Agronomic
  growth_stages: GROWTH_STAGES,
  // Compliance
  organic_approved: ORGANIC_APPROVED,
  // Equipment
  equipment_types: EQUIPMENT_TYPES,
  // General
  general_activity_types: GENERAL_ACTIVITY_TYPES,
  // NOP Compliance
  identified_by: IDENTIFIED_BY,
  contamination_sources: CONTAMINATION_SOURCES,
  manure_harvest_intervals: MANURE_HARVEST_INTERVALS,
  manure_treatments: MANURE_TREATMENTS,
  manure_application_methods: MANURE_APPLICATION_METHODS,
  manure_animal_sources: MANURE_ANIMAL_SOURCES,
  manure_forms: MANURE_FORMS,
  manure_origins: MANURE_ORIGINS,
  nitrogen_sources: NITROGEN_SOURCES,
  chemical_subtypes: CHEMICAL_SUBTYPES,
  compost_methods: COMPOST_METHODS,
  application_purposes: APPLICATION_PURPOSES,
  seed_treatment_bases: SEED_TREATMENT_BASES,
  seed_nonavailability_reasons: SEED_NONAVAILABILITY_REASONS,
  seed_non_gmo_statuses: SEED_NON_GMO_STATUSES
} as const;

export type EnumSourceKey = keyof typeof ENUM_OPTIONS;

/** Retrieve enum options by key (for FieldConfig.enumSource lookup) */
export function getEnumOptions(key: EnumSourceKey): readonly EnumOption[] {
  return ENUM_OPTIONS[key];
}

/**
 * Look up the i18n label key for a given enum value.
 *
 * Returns null — never throws — when the enumSource is not in ENUM_OPTIONS. Several field
 * configs declare an `enumSource` whose catalogue lives elsewhere (chemical's
 * subtype-conditional maps, for instance), and until 2026-08-15 nothing called this from the
 * resolver, so an unknown key was harmless. Now that every enum on every display surface goes
 * through here, an unindexed key would throw `Cannot read properties of undefined` while
 * rendering an event card — a blank screen instead of a mislabelled value.
 */
export function getEnumLabel(key: EnumSourceKey, value: string): string | null {
  const options = ENUM_OPTIONS[key] as readonly EnumOption[] | undefined;
  if (!options) return null;
  const opt = options.find((o) => o.value === value);
  return opt ? opt.labelKey : null;
}
