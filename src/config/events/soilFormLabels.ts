/**
 * The label the soil form shows for each field, so a refused save names the field as the grower
 * saw it on screen (review of app #435: the form said "Cantidad instalada" while the toast, which
 * read the event registry's label, said "Estructuras instaladas").
 *
 * The registry's `labelKey` is the record's label (the detail modal, the packet). The form words
 * some fields for the moment of entry ("Nitrogen (ppm)" where the record shows "N / P / K (lab)",
 * "Structure Type" for a nesting box), so it is not reused there. NewEvent asks this first, then
 * the registry. Guard: `soilFormLabelsMatchTheForm.test.ts` reads the form and fails if a label
 * here is not the one the form renders for that field.
 */

const K = (name: string) => `events.soil.form.label.${name}`;

/** One field, one label, whatever the subtype. */
export const SOIL_FORM_LABEL_KEYS: Readonly<Record<string, string>> = {
  area_covered: K('areaCovered'),
  depth: K('workingDepth'),
  fuel_type: K('fuelType'),
  fuel_consumed: K('fuelConsumed'),
  equipment_hours: K('equipmentHours'),
  equipment_used: K('equipmentUsed'),
  amendment_type: K('amendmentType'),
  amendment_amount: K('amendmentAmount'),
  compost_method: K('compostMethod'),
  soil_texture: K('soilTexture'),
  sample_matrix: K('sampleType'),
  lab_name: K('labName'),
  lab_sample_id: K('sampleReportId'),
  lab_report_date: K('reportDate'),
  lab_nitrogen: K('nitrogenPpm'),
  lab_phosphorus: K('phosphorusPpm'),
  lab_potassium: K('potassiumPpm'),
  lab_cec: K('cecMeq100g'),
  lab_zinc_ppm: K('zincZn'),
  lab_boron_ppm: K('boronB'),
  lab_manganese_ppm: K('manganeseMn'),
  lab_iron_ppm: K('ironFe'),
  tillage_type: K('tillageType'),
  tillage_intensity: K('tillageIntensity'),
  tillage_direction: K('tillageDirection'),
  residue_management: K('residueManagement'),
  animal_type: K('animalType'),
  animal_count: K('numberOfAnimals'),
  grazing_purpose: K('grazingPurpose'),
  habitat_type: K('habitatType'),
  species_planted: K('speciesPlanted'),
  habitat_install_date: K('establishedOptional'),
  habitat_structure_count: K('numberInstalled'),
  observation: K('observationsNotes')
};

/** Fields the form labels differently by subtype. */
const BY_SUBTYPE: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  // The amendment subtypes render "Application Depth" on the same `depth` input.
  depth: {
    PA: K('applicationDepth'),
    OM: K('applicationDepth'),
    CC: K('applicationDepth'),
    CO: K('applicationDepth')
  },
  // Nesting and shelter structures reuse the habitat fields under their own words.
  habitat_type: { NS: K('structureType') },
  habitat_install_date: { NS: K('installedOptional') }
};

/** The form's label key for `field` on this subtype, or null when the form has none. */
export const soilFormLabelKey = (field: string, subtype?: string | null): string | null =>
  (subtype ? BY_SUBTYPE[field]?.[subtype] : undefined) ?? SOIL_FORM_LABEL_KEYS[field] ?? null;
