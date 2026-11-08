/**
 * The words the input-application form (`ChemicalTab-ENHANCED.jsx`) uses for its codes, so
 * anything that names those codes elsewhere names them the same way (2026-11-08).
 *
 * The carbon box first resolved "ground_spray" and "synthetic_pesticide" through the generic
 * catalog in `enums.ts`, whose labels differ from the form's: the box beside the select said
 * "Aspersión terrestre" while the select said "Pulverización terrestre" and named the crop or
 * soil it lands on (review of app #327). The form wording also depends on the product type:
 * ground spray reads differently for an insecticide, a herbicide and a fungicide.
 *
 * FUEL_TYPES is the form's own list (it imports it from here). The method and product-type
 * tables mirror options the form writes inline in JSX; `chemicalFormOptionsParity.test.ts`
 * reads the form and fails if the two drift.
 */

/** Fuel for the application equipment. `factor` is notation, not copy. */
export const CHEMICAL_FUEL_TYPES = [
  { value: 'diesel', labelKey: 'events.chemical.fuelTypes.diesel', factor: '2.70 kg CO₂e/L' },
  { value: 'gasoline', labelKey: 'events.chemical.fuelTypes.gasoline', factor: '2.32 kg CO₂e/L' },
  {
    value: 'natural_gas',
    labelKey: 'events.chemical.fuelTypes.naturalGas',
    factor: '1.92 kg CO₂e/m³'
  },
  { value: 'propane', labelKey: 'events.chemical.fuelTypes.propane', factor: '1.51 kg CO₂e/L' },
  {
    value: 'electric',
    labelKey: 'events.chemical.fuelTypes.electric',
    factor: '0.365 kg CO₂e/kWh'
  },
  { value: 'biodiesel', labelKey: 'events.chemical.fuelTypes.biodiesel', factor: '2.31 kg CO₂e/L' },
  { value: 'none', labelKey: 'events.chemical.fuelTypes.none', factor: '0 kg CO₂e' }
];

const M = 'events.chemical.methods.';

/** Application methods per product type, as the form's select offers them. */
export const CHEMICAL_METHOD_KEYS: Record<string, Record<string, string>> = {
  FE: {
    broadcast: `${M}broadcastIncorporated`,
    banded: `${M}banded`,
    subsurface: `${M}subsurface`,
    fertigation: `${M}fertigation`,
    foliar: `${M}foliarSurface`
  },
  PE: {
    ground_spray: `${M}groundSprayCropsSoil`,
    chemigation: `${M}chemigationSystem`,
    seed_treatment: `${M}seedTreatmentCoating`,
    soil_incorporation: `${M}soilIncorporationMixed`,
    hand_dispenser: `${M}handDispenser`
  },
  HE: {
    ground_spray: `${M}groundSprayEmergent`,
    chemigation: `${M}chemigationSystem`,
    seed_treatment: `${M}seedTreatmentPrePlant`,
    soil_incorporation: `${M}soilIncorporationMixed`
  },
  FU: {
    ground_spray: `${M}groundSprayFoliarSoil`,
    chemigation: `${M}chemigationSystem`,
    seed_treatment: `${M}seedTreatmentPreventive`,
    soil_incorporation: `${M}soilIncorporationDrench`
  },
  /** Before a product type is chosen. */
  '': {
    broadcast: `${M}broadcastSurface`,
    ground_spray: `${M}groundSpray`,
    chemigation: `${M}chemigation`,
    foliar: `${M}foliar`,
    soil_incorporation: `${M}soilIncorporationMixed`
  }
};

/** Offered for every spray product type (PE, HE, FU) after its own list. */
export const CHEMICAL_SPRAY_METHOD_KEYS: Record<string, string> = {
  air_blast: `${M}airBlast`,
  aerial: `${M}aerial`,
  fumigation: `${M}fumigation`
};

const S = 'events.chemical.subtypeOptions.';

/** Product subtypes, as the form's select names them. Codes are unique across types. */
export const CHEMICAL_SUBTYPE_KEYS: Record<string, string> = {
  synthetic_fertilizer: `${S}syntheticFertilizer`,
  organic_fertilizer: `${S}organicFertilizer`,
  slow_release_fertilizer: `${S}slowRelease`,
  synthetic_pesticide: `${S}syntheticPesticide`,
  organic_pesticide: `${S}organicPesticide`,
  biological_pesticide: `${S}biologicalPesticide`,
  synthetic_herbicide: `${S}syntheticHerbicide`,
  organic_herbicide: `${S}organicHerbicide`,
  synthetic_fungicide: `${S}syntheticFungicide`,
  organic_fungicide: `${S}organicFungicide`,
  copper_fungicide: `${S}copperFungicide`,
  sulfur_fungicide: `${S}sulfurFungicide`,
  biological_fungicide: `${S}biologicalFungicide`
};

/** The label key the form shows for an application method under a product type, if any. */
export const chemicalMethodKey = (chemicalType: string | undefined, method: string) => {
  const type = chemicalType || '';
  return (
    CHEMICAL_METHOD_KEYS[type]?.[method] ??
    (['PE', 'HE', 'FU'].includes(type) ? CHEMICAL_SPRAY_METHOD_KEYS[method] : undefined)
  );
};
