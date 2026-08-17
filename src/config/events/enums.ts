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

/** Volume units — liquid/solid chemicals, fertilizers */
export const VOLUME_UNITS: readonly EnumOption[] = [
  { value: 'L', labelKey: 'events.units.volume.liters' },
  { value: 'gal', labelKey: 'events.units.volume.gallons' },
  { value: 'mL', labelKey: 'events.units.volume.milliliters' },
  { value: 'oz', labelKey: 'events.units.volume.ounces' },
  { value: 'kg', labelKey: 'events.units.volume.kilograms' },
  { value: 'lbs', labelKey: 'events.units.volume.pounds' }
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
    { value: 'soil_incorporation', labelKey: 'events.applicationMethods.soilIncorporation' }
  ],
  HE: [
    { value: 'ground_spray', labelKey: 'events.applicationMethods.groundSpray' },
    { value: 'air_blast', labelKey: 'events.applicationMethods.airBlast' },
    { value: 'aerial', labelKey: 'events.applicationMethods.aerial' },
    { value: 'chemigation', labelKey: 'events.applicationMethods.chemigation' },
    { value: 'seed_treatment', labelKey: 'events.applicationMethods.seedTreatment' },
    { value: 'soil_incorporation', labelKey: 'events.applicationMethods.soilIncorporation' }
  ],
  FU: [
    { value: 'ground_spray', labelKey: 'events.applicationMethods.groundSpray' },
    { value: 'air_blast', labelKey: 'events.applicationMethods.airBlast' },
    { value: 'aerial', labelKey: 'events.applicationMethods.aerial' },
    { value: 'chemigation', labelKey: 'events.applicationMethods.chemigation' },
    { value: 'seed_treatment', labelKey: 'events.applicationMethods.seedTreatment' },
    { value: 'soil_incorporation', labelKey: 'events.applicationMethods.soilIncorporation' }
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
  { value: 'transport_vehicle', labelKey: 'events.cleaningAssetClass.transportVehicle' }
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
