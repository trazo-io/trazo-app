// Sprint 3 Epic 3.1: Cleaned unused Chakra imports - using StandardComponents only
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle
} from 'react';
import {
  Text,
  useColorModeValue,
  HStack,
  VStack,
  Box,
  SimpleGrid,
  Flex,
  Switch,
  Divider,
  Icon
} from '@chakra-ui/react';
import {
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea,
  StandardAlert,
  SectionHeader,
  SectionBox
} from 'components/Design/StandardComponents';
// Sprint 3 Epic 3.1: Cleaned unused icon imports
import { FaChevronLeft, FaChevronRight, FaSeedling, FaThermometerHalf } from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, array } from 'zod';
import CustomFieldsForm from './CustomFieldsForm';
import { SupervisorSignOff } from 'components/Forms/SupervisorSignOff';
import { ReceiptDocumentSelect } from 'components/Forms/ReceiptDocumentSelect';
import { useIntl } from 'react-intl';
import {
  MANURE_ANIMAL_SOURCES,
  MANURE_APPLICATION_METHODS,
  MANURE_FORMS,
  MANURE_ORIGINS,
  retiredOrganicApprovedLabelKey
} from 'config/events/enums';
// Event Field Registry (Phase 5G — form integration)
import { useFormFields } from 'src/hooks/useFormFields';
import { useDefaultUnits } from 'src/hooks/useMeasurementSystem';
import { RegistryFormField } from 'src/components/Forms/RegistryFormField';
import { BlockIdField } from 'components/Fields/BlockIdField';
import { useParams } from 'react-router-dom';
import { PlanMaterialsQuickPick } from 'components/Forms/PlanMaterialsQuickPick';

// Phase 3: Fuel types with EPA-verified emission factors (matching ProductionTab pattern)
// UPDATED 2026-02-15: All factors corrected to match EPA 40 CFR Part 98 Table C-1
// Labels are message ids resolved at render: a `label:` in a module-scope array is beyond intl
// (src/config/events/ADDING_FIELDS.md), which is how this list stayed English on a Spanish form.
const FUEL_TYPES = [
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

const formSchemaSoilManagement = object({
  // A message KEY, rendered through intl at the field: a schema at module scope cannot call intl.
  type: string().min(1, 'events.soil.validation.typeRequired'),
  // Area is required and > 0 for most soil practices, but NOT for habitat structures (NS) — nesting
  // boxes / perches have no meaningful area. Habitat development (HD) area is optional. Enforced
  // per-subtype in the superRefine below so the base field stays optional.
  area_covered: string().optional(),
  area_unit: string().optional(),
  soil_ph: string().optional(),
  organic_matter_percentage: string().optional(),
  soil_texture: string().optional(),
  // F19: Soil-test lab RESULTS (ST only) — packed into the test_results JSONField on submit.
  lab_name: string().optional(),
  lab_sample_id: string().optional(),
  lab_report_date: string().optional(),
  lab_nitrogen: string().optional(),
  lab_phosphorus: string().optional(),
  lab_potassium: string().optional(),
  lab_cec: string().optional(),
  // §E-2: lab analysis (LA) — what was sampled + the micronutrient results that document a
  // deficiency (7 CFR 205.601(j)(7)). sample_matrix is required for LA via the superRefine below.
  sample_matrix: string().optional(),
  lab_zinc_ppm: string().optional(),
  lab_boron_ppm: string().optional(),
  lab_manganese_ppm: string().optional(),
  lab_iron_ppm: string().optional(),
  // Sprint 2 Epic 2.1.3: Removed soil_moisture (duplicates Weather event)
  depth: string().optional(),
  depth_unit: string().optional(),
  // Standardized fuel consumption fields (matching ProductionEvent pattern)
  name: string().optional(),
  fuel_type: string().optional(), // Phase 3: Fuel type for EPA emission factor selection
  fuel_consumed: string().optional(),
  fuel_unit: string().optional(),
  equipment_hours: string().optional(),
  production_efficiency: string().optional(),
  // Sprint 2 Epic 2.1.3: Removed transportation_distance (duplicates Production event)
  // Tillage-specific fields for carbon calculations
  tillage_type: string().optional(),
  tillage_intensity: string().optional(),
  tillage_direction: string().optional(),
  residue_management: string().optional(),
  equipment_used: string().optional(),
  // Sprint 2 Epic 2.1.3: Removed weather_conditions (duplicates Weather event)
  // ENHANCED: Soil Amendment (PA) fields for IPCC 2006 lime dissolution calculations
  amendment_amount: string().optional(),
  amendment_unit: string().optional(),
  amendment_type: string().optional(),
  amendment_product_name: string().optional(),
  amendment_manufacturer: string().optional(),
  // Amendment purchase traceability — 7 CFR 205.103(b)(1)-(2), added 2026-08-16.
  amendment_supplier_name: string().optional(),
  amendment_purchase_date: string().optional(),
  amendment_purchase_invoice: string().optional(),
  receipt_document: string().optional(),
  amendment_quantity_purchased: string().optional(),
  amendment_quantity_purchased_unit: string().optional(),
  amendment_lot_number: string().optional(),
  // CC subtype — routed into extra_data on submit (NOP §205.203 cover-crop record)
  cover_crop_species: string().optional(),
  animal_type: string().optional(),
  animal_count: string().optional(),
  grazing_duration_days: string().optional(),
  grazing_purpose: string().optional(),
  // Biodiversity / habitat (HD / NS subtypes) — facts only, no score
  habitat_type: string().optional(),
  habitat_structure_count: string().optional(),
  habitat_install_date: string().optional(),
  species_planted: string().optional(),
  wildlife_observed: string().optional(),
  structure_notes: string().optional(),
  // Grazing Summary Mode (GTM-v3): log a whole rotation as one event (mirrors pest scouting)
  is_summary: string().optional(), // "true" | "false" as string for form compatibility
  date_start: string().optional(),
  date_end: string().optional(),
  event_count: string().optional(), // number of grazing passes in the rotation
  total_grazing_days: string().optional(), // summed days across passes
  area_covered_total: string().optional(), // combined area grazed across passes
  amendment_amount_numeric: string().optional(),
  amendment_amount_unit: string().optional(),
  // NOP Compliance fields (7 CFR 205.203)
  amendment_organic_approved: string().optional(),
  amendment_nitrogen_percentage: string().optional(),
  compost_peak_temp_f: string().optional(),
  compost_duration_days_at_temp: string().optional(),
  compost_turning_count: string().optional(),
  compost_method: string().optional(),
  compost_initial_cn_ratio: string().optional(),
  // F24: complete the NOP 5021 compost record — feedstock + temperature-monitoring readings.
  compost_feedstock: string().optional(),
  compost_temperature_log: string().optional(),
  compost_unit_id: string().optional(),
  compost_temp_reading_method: string().optional(),
  manure_harvest_interval: string().optional(),
  manure_application_date: string().optional(),
  manure_harvest_date_planned: string().optional(),
  // NOP 5006 — processed animal manure (interval-exempt when documented)
  manure_treatment: string().optional(),
  manure_application_method: string().optional(),
  manure_animal_source: string().optional(),
  manure_form: string().optional(),
  manure_origin: string().optional(),
  processed_manure_temp_f: string().optional(),
  processed_manure_attestation: string().optional(),
  observation: string().optional(),
  private_note: string().optional(),
  // FSMA PSR § 112.161(b) sign-off. Soil amendments are part-112 records (§ 112.60).
  reviewed: string().optional(), // 'true' / 'false' string for the Switch
  reviewer_name: string().optional(),
  review_date: string().optional(),
  // Phase 2: Universal CommonEvent fields (variety, block_id, growth_stage)
  variety: string().optional(),
  block_id: string().optional(),
  growth_stage: string().optional(),
  custom_fields: array(
    object({
      id: string().optional(),
      label: string(),
      value: string(),
      field_type: string(),
      visibility: string(),
      link_url: string().optional(),
      verification: string().optional(),
      created_at: string().optional(),
      photo_id: string().optional()
    })
  ).optional()
});

/**
 * The stored description when the grower writes no observation (the backend requires one). It
 * names the subtype the grower picked, in the backend's own labels (`SOIL_TYPE_CHOICES`): it was
 * "Soil Testing" whatever the type, so an organic matter record said it was a soil test.
 */
export const SOIL_TYPE_LABELS = {
  ST: 'Soil Test',
  PA: 'pH Adjustment',
  OM: 'Organic Matter Addition',
  CC: 'Cover Crop',
  TI: 'Tillage',
  CO: 'Composting',
  GR: 'Grazing Management',
  HD: 'Habitat Development',
  NS: 'Nesting / Shelter Structures',
  LA: 'Lab Analysis'
};

export const soilDescriptionFallback = (data) =>
  `Soil management event: ${data.name || SOIL_TYPE_LABELS[data.type] || 'Soil Test'}`;

/**
 * Soil subtypes whose record does not need an area.
 *
 * NS (nesting / shelter structures) has no meaningful area and HD (habitat development) area is
 * optional. LA (lab analysis) and ST (soil test) record a SAMPLE: an irrigation-water sample, a
 * leaf sample or a soil core has a lab, a sample ID and results, not acreage. Requiring area > 0
 * forced the grower to type an area nobody measured (Astra activity-capture audit AC-08,
 * 2026-10-26: "an explicit fictional one-acre scope was entered to finish ASTRA Water lab test").
 * The backend already accepts null (SoilManagementEvent.area_covered null=True; clean() rejects
 * only <= 0). An area typed here is still validated as > 0.
 */
export const SOIL_AREA_OPTIONAL_SUBTYPES = ['NS', 'HD', 'LA', 'ST'];

export const soilAreaIsOptional = (type, multiTarget = false) =>
  multiTarget || SOIL_AREA_OPTIONAL_SUBTYPES.includes(type);

/**
 * With several parcels (`multiTarget`) the area is asked on each parcel's card, so the form
 * itself requires none; everything else is the same schema.
 */
export const buildSoilSchema = (multiTarget = false, intl = null) => {
  // Messages through intl when the form passes it (review on #211: an English error on an
  // es-419 form). The English fallback keeps callers without intl working.
  const t = (id, defaultMessage) =>
    intl ? intl.formatMessage({ id, defaultMessage }) : defaultMessage;
  return formSchemaSoilManagement.superRefine((data, ctx) => {
    // An area the grower did type on an area-optional subtype must still be a real area.
    if (
      soilAreaIsOptional(data.type, multiTarget) &&
      !multiTarget &&
      data.area_covered &&
      !(parseFloat(data.area_covered) > 0)
    ) {
      ctx.addIssue({
        path: ['area_covered'],
        code: 'custom',
        message: t('events.chemical.validation.areaPositive', 'Area must be greater than 0')
      });
    }
    if (!soilAreaIsOptional(data.type, multiTarget)) {
      if (!data.area_covered || parseFloat(data.area_covered) <= 0) {
        ctx.addIssue({
          path: ['area_covered'],
          code: 'custom',
          message: t('events.chemical.validation.areaPositive', 'Area must be greater than 0')
        });
      }
      if (!data.area_unit) {
        ctx.addIssue({
          path: ['area_unit'],
          code: 'custom',
          message: t('events.chemical.validation.areaUnitRequired', 'Area unit is required')
        });
      }
    }
    // §E-2: a lab analysis without its matrix cannot support a deficiency claim — a certifier
    // needs to know the deficiency was shown in LEAF tissue or in SOIL. Mirrors the backend
    // SoilManagementEvent.clean() guard so the farmer sees it before the round trip.
    if (data.type === 'LA' && !data.sample_matrix) {
      ctx.addIssue({
        path: ['sample_matrix'],
        code: 'custom',
        message: t(
          'events.soil.validation.sampleMatrixRequired',
          'Select what was sampled (soil, leaf, petiole, hull, compost or water)'
        )
      });
    }
  });
};

// Sprint 2 Epic 2.1.3: Removed soil_moisture, weather_conditions, temperature_range from defaults
// V3 hardening (2026-06): MEASUREMENT fields (soil_ph, organic_matter_percentage, soil_texture)
// carry NO default value. They are lab/field readings the farmer must enter — injecting a number
// fabricates a measurement and previously earned an undeserved +5 carbon-confidence credit and a
// false NOP soil baseline in the audit export. The subtype-switch effect already skips these via
// MEASUREMENT_FIELDS; blanking the literals here is defense-in-depth so they can never reappear.
/**
 * Fields a subtype switch must NEVER inject a value into. They are measurements or facts the
 * farmer observed — area worked, pH, organic matter, texture — and, since 2026-08-21, the working
 * depth: switching to "pH Adjustment" used to prefill 20 cm and "Soil Testing" 30 cm, so a
 * surface-broadcast sulfur the farmer described as "not incorporated" went into the § 205.203
 * Soil Condition table as incorporated to 20 cm, and a soil test carried a 30 cm "working depth"
 * nobody measured. A default may carry a UNIT (cm, acres); it may not carry a NUMBER.
 * Guard: `__tests__/soilSubtypeDefaultsCarryNoMeasurement.test.ts`.
 */
export const SOIL_MEASUREMENT_FIELDS = [
  'area_covered',
  'soil_ph',
  'organic_matter_percentage',
  'soil_texture',
  'depth'
];

export const getSoilManagementDefaults = (soilType) => {
  const defaults = {
    ST: {
      area_covered: '',
      area_unit: 'ha',
      soil_ph: '',
      organic_matter_percentage: '',
      soil_texture: '',
      depth: '',
      depth_unit: 'cm'
    },
    // Sprint 2 Epic 2.1.3: PA (Planting/Amendment) kept but simplified - overlaps with Production "Planting"
    // ENHANCED: Added amendment fields for IPCC 2006 lime dissolution calculations
    PA: {
      area_covered: '',
      area_unit: 'ha',
      soil_ph: '',
      organic_matter_percentage: '',
      soil_texture: '',
      depth: '',
      depth_unit: 'cm',
      // Amendment fields for carbon calculation (IPCC 2006 lime dissolution)
      amendment_amount: '',
      amendment_unit: 'kg',
      amendment_type: ''
    },
    CC: {
      area_covered: '',
      area_unit: 'ha',
      soil_ph: '',
      organic_matter_percentage: '',
      soil_texture: '',
      depth: '',
      depth_unit: 'cm'
    },
    OM: {
      area_covered: '',
      area_unit: 'ha',
      soil_ph: '',
      organic_matter_percentage: '',
      soil_texture: '',
      depth: '',
      depth_unit: 'cm'
    },
    TI: {
      area_covered: '',
      area_unit: 'ha',
      soil_ph: '',
      organic_matter_percentage: '',
      soil_texture: '',
      depth: '',
      depth_unit: 'cm'
    },
    CO: {
      area_covered: '',
      area_unit: 'ha',
      soil_ph: '',
      organic_matter_percentage: '',
      soil_texture: '',
      depth: '',
      depth_unit: 'cm'
    },
    // Biodiversity / habitat — no phantom measurements; the farmer enters real area / counts.
    HD: {
      area_unit: 'ha',
      soil_ph: '',
      organic_matter_percentage: '',
      soil_texture: ''
    },
    NS: {
      area_unit: 'ha',
      soil_ph: '',
      organic_matter_percentage: '',
      soil_texture: ''
    },
    // §E-2 Lab analysis — no depth default. Without an entry here LA fell through to the ST
    // defaults below and every leaf, hull and irrigation-water sample was stamped with a
    // 30 cm "working depth" the farmer never entered, which then rendered in the § 205.203
    // Soil Condition table of the certifier packet. A leaf sample has no working depth; where
    // one does apply (a soil core), the farmer enters the real sampling depth.
    LA: {
      area_unit: 'acres',
      soil_ph: '',
      organic_matter_percentage: '',
      soil_texture: '',
      depth: '',
      depth_unit: 'cm'
    }
  };

  return defaults[soilType] || defaults.ST;
};

const SoilManagementTab = forwardRef(
  (
    {
      onSubmitHandler,
      onDataChange,
      onPrev,
      initialValues = {},
      hideActions = false,
      /**
       * Several parcels: area, section, fuel used, machine hours, the amendment amount and
       * the structure count are asked on each parcel's card below the form, so their inputs
       * are left out here; units stay, because the cards read them. Keys from the server's
       * spec (`multiParcelSpec.json`, type 5).
       */
      multiTarget = false
    },
    ref
  ) => {
    const intl = useIntl();
    const soilSchema = useMemo(() => buildSoilSchema(multiTarget, intl), [multiTarget, intl]);
    // US-first unit defaults. Trazo's crops, emission factors and ICP are United States,
    // but every form defaulted to hectares/litres — so a CA grower converted 42.5 acres
    // to 17.2 ha by hand on every entry. Defaults only; the dropdowns still offer both.
    const defaultUnits = useDefaultUnits();
    const bgPrevButton = useColorModeValue('gray.100', 'gray.100');
    const textColor = useColorModeValue('gray.700', 'white');
    const iconColor = useColorModeValue('gray.300', 'gray.700');
    // Sprint 3 Epic 3.1: Removed progressive disclosure - consolidated sections

    const mapApiTypeToFormType = (apiType) => {
      if (!apiType) return '';

      // Sprint 2 Epic 2.1.3: PA renamed from "Planting/Amendment" to "Soil Amendment" to reduce overlap with Production
      const typeMapping = {
        'event.soil.testing': 'ST',
        'event.soil.planting': 'PA', // Legacy - now "Soil Amendment"
        'event.soil.amendment': 'PA', // New mapping
        'event.soil.tillage': 'TI'
      };

      return typeMapping[apiType] || apiType;
    };

    const formType = mapApiTypeToFormType(initialValues.type);

    // Initialize selectedSoilType from existing event type to prevent
    // phantom defaults from being applied when editing existing events
    const [selectedSoilType, setSelectedSoilType] = useState(formType || '');

    const intelligentDefaults = useMemo(
      () => getSoilManagementDefaults(formType || 'ST'),
      [formType]
    );

    const methods = useForm({
      resolver: zodResolver(soilSchema),
      // CRITICAL FIX: Prevent tillage fields from losing values when conditionally hidden
      // Without this, fields rendered only when type='TI' would be unregistered and their values lost
      shouldUnregister: false,
      defaultValues: {
        type: formType || '',
        // Only use existing values, not intelligent defaults for carbon calculation fields
        area_covered: initialValues.area_covered || '',
        area_unit: initialValues.area_unit || defaultUnits.area,
        soil_ph: initialValues.soil_ph || '',
        organic_matter_percentage: initialValues.organic_matter_percentage || '',
        soil_texture: initialValues.soil_texture || '',
        // F19: soil-test results pre-fill from the stored test_results JSON on edit
        lab_name: initialValues.test_results?.lab_name || '',
        lab_sample_id: initialValues.test_results?.sample_id || '',
        lab_report_date: initialValues.test_results?.report_date || '',
        lab_nitrogen: initialValues.test_results?.nitrogen?.toString?.() || '',
        lab_phosphorus: initialValues.test_results?.phosphorus?.toString?.() || '',
        lab_potassium: initialValues.test_results?.potassium?.toString?.() || '',
        lab_cec: initialValues.test_results?.cec?.toString?.() || '',
        // §E-2
        sample_matrix: initialValues.sample_matrix || '',
        lab_zinc_ppm: initialValues.test_results?.zinc_ppm?.toString?.() || '',
        lab_boron_ppm: initialValues.test_results?.boron_ppm?.toString?.() || '',
        lab_manganese_ppm: initialValues.test_results?.manganese_ppm?.toString?.() || '',
        lab_iron_ppm: initialValues.test_results?.iron_ppm?.toString?.() || '',
        // Sprint 2 Epic 2.1.3: Removed soil_moisture
        depth: initialValues.depth || '',
        depth_unit: initialValues.depth_unit || 'cm',
        // Standardized fuel consumption fields (matching ProductionEvent pattern)
        name: initialValues.name || '',
        fuel_type: initialValues.fuel_type || '', // Phase 3: Fuel type for EPA emission factor selection
        fuel_consumed: initialValues.fuel_consumed || '',
        fuel_unit: initialValues.fuel_unit || defaultUnits.fuel,
        equipment_hours: initialValues.equipment_hours || '',
        production_efficiency: initialValues.production_efficiency || '',
        // Sprint 2 Epic 2.1.3: Removed transportation_distance
        // Tillage-specific fields for carbon calculations
        tillage_type: initialValues.tillage_type || '',
        tillage_intensity: initialValues.tillage_intensity || '',
        tillage_direction: initialValues.tillage_direction || '',
        residue_management: initialValues.residue_management || '',
        equipment_used: initialValues.equipment_used || '',
        // Sprint 2 Epic 2.1.3: Removed weather_conditions, temperature_range
        // ENHANCED: Amendment fields for IPCC 2006 lime dissolution calculations
        amendment_amount: initialValues.amendment_amount || '',
        amendment_unit: initialValues.amendment_unit || 'kg',
        amendment_type: initialValues.amendment_type || '',
        amendment_product_name: initialValues.amendment_product_name || '',
        amendment_manufacturer: initialValues.amendment_manufacturer || '',
        amendment_supplier_name: initialValues.amendment_supplier_name || '',
        amendment_purchase_date: initialValues.amendment_purchase_date || '',
        amendment_purchase_invoice: initialValues.amendment_purchase_invoice || '',
        amendment_quantity_purchased: initialValues.amendment_quantity_purchased?.toString() ?? '',
        amendment_quantity_purchased_unit: initialValues.amendment_quantity_purchased_unit || 'kg',
        amendment_lot_number: initialValues.amendment_lot_number || '',
        // Cover-crop species persists in extra_data, so on EDIT read both the top-level
        // (when the edit path normalized it up) AND the extra_data fallback.
        cover_crop_species:
          initialValues.cover_crop_species || initialValues.extra_data?.cover_crop_species || '',
        animal_type: initialValues.animal_type || '',
        animal_count: initialValues.animal_count || '',
        grazing_duration_days: initialValues.grazing_duration_days || '',
        grazing_purpose: initialValues.grazing_purpose || '',
        // Biodiversity / habitat (HD / NS). Free-text fields persist in extra_data, so read the
        // extra_data fallback on EDIT (same pattern as grazing summary + cover_crop_species).
        habitat_type: initialValues.habitat_type || '',
        habitat_structure_count: initialValues.habitat_structure_count?.toString() || '',
        habitat_install_date: initialValues.habitat_install_date || '',
        species_planted:
          initialValues.species_planted || initialValues.extra_data?.species_planted || '',
        wildlife_observed:
          initialValues.wildlife_observed || initialValues.extra_data?.wildlife_observed || '',
        structure_notes:
          initialValues.structure_notes || initialValues.extra_data?.structure_notes || '',
        // Grazing Summary Mode — summary fields persist in extra_data, so on EDIT read both the
        // top-level (when the edit path normalized them up) AND the extra_data fallback (when it
        // didn't), so the toggle + rotation values are restored either way.
        is_summary:
          initialValues.is_summary === 'true' ||
          initialValues.is_summary === true ||
          initialValues.extra_data?.is_summary === 'true' ||
          initialValues.extra_data?.is_summary === true
            ? 'true'
            : 'false',
        date_start: initialValues.date_start || initialValues.extra_data?.date_start || '',
        date_end: initialValues.date_end || initialValues.extra_data?.date_end || '',
        event_count:
          initialValues.event_count?.toString() ||
          initialValues.extra_data?.event_count?.toString() ||
          '',
        total_grazing_days:
          initialValues.total_grazing_days?.toString() ||
          initialValues.extra_data?.total_grazing_days?.toString() ||
          '',
        area_covered_total:
          initialValues.area_covered_total?.toString() ||
          initialValues.extra_data?.area_covered_total?.toString() ||
          '',
        amendment_amount_numeric: initialValues.amendment_amount_numeric || '',
        amendment_amount_unit: initialValues.amendment_amount_unit || 'kg',
        // NOP Compliance fields (7 CFR 205.203)
        amendment_organic_approved: initialValues.amendment_organic_approved || '',
        amendment_nitrogen_percentage: initialValues.amendment_nitrogen_percentage
          ? String(initialValues.amendment_nitrogen_percentage)
          : '',
        compost_peak_temp_f: initialValues.compost_peak_temp_f || '',
        compost_duration_days_at_temp: initialValues.compost_duration_days_at_temp || '',
        compost_turning_count: initialValues.compost_turning_count || '',
        compost_method: initialValues.compost_method || '',
        compost_initial_cn_ratio: initialValues.compost_initial_cn_ratio || '',
        compost_feedstock: initialValues.compost_feedstock || '',
        compost_temperature_log: initialValues.compost_temperature_log || '',
        compost_unit_id: initialValues.compost_unit_id || '',
        compost_temp_reading_method: initialValues.compost_temp_reading_method || '',
        manure_harvest_interval: initialValues.manure_harvest_interval || '',
        manure_application_date: initialValues.manure_application_date || '',
        manure_harvest_date_planned: initialValues.manure_harvest_date_planned || '',
        manure_treatment: initialValues.manure_treatment || '',
        manure_application_method: initialValues.manure_application_method || '',
        manure_animal_source: initialValues.manure_animal_source || '',
        manure_form: initialValues.manure_form || '',
        manure_origin: initialValues.manure_origin || '',
        processed_manure_temp_f: initialValues.processed_manure_temp_f || '',
        processed_manure_attestation: initialValues.processed_manure_attestation || '',
        observation: initialValues.observation || '',
        private_note: initialValues.private_note || '',
        reviewed:
          initialValues.reviewed === true || initialValues.reviewed === 'true' ? 'true' : 'false',
        reviewer_name: initialValues.reviewer_name || '',
        review_date: initialValues.review_date || '',
        // Phase 2: Universal CommonEvent fields
        variety: initialValues.variety || '',
        block_id: initialValues.block_id || '',
        growth_stage: initialValues.growth_stage || '',
        custom_fields: initialValues.custom_fields || []
      }
    });

    // Ref to always hold the latest submit handler, avoiding stale closures in useImperativeHandle
    const submitHandlerRef = useRef(null);

    // Expose flushData and submitForm methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        flushData: () => {
          if (onDataChange) {
            const currentValues = methods.getValues();
            onDataChange(currentValues);
          }
        },
        submitForm: () =>
          new Promise((resolve, reject) => {
            methods.handleSubmit(
              (data) => {
                submitHandlerRef.current(data);
                resolve();
              },
              (errors) => {
                reject(errors);
              }
            )();
          })
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [onDataChange]
    );

    // Custom fields state for Phase 2.3
    const [customFields, setCustomFields] = useState(initialValues.custom_fields || []);

    const {
      reset,
      handleSubmit,
      formState: { errors },
      register,
      setValue,
      control,
      watch
    } = methods;
    // The farm, for the plan's own Materials List under the product name (route :farmId).
    const { farmId } = useParams();
    // The maker the last plan-materials chip wrote (review of app #419): the next chip replaces it.
    const planChipMakerRef = useRef(null);

    // Watch fields that impact carbon calculations (for carbon API efficiency)
    // Core calculation fields (directly impact emissions):
    const watchedType = watch('type'); // Determines emission factor
    const watchedArea = watch('area_covered'); // Area-based emissions
    const watchedAreaUnit = watch('area_unit'); // Area conversion
    const watchedFuelConsumed = watch('fuel_consumed'); // Direct fuel emissions
    const watchedFuelUnit = watch('fuel_unit'); // Fuel conversion
    const watchedEquipmentHours = watch('equipment_hours'); // Fuel estimation

    // Confidence bonus fields (affect confidence score but not core calculation):
    const watchedSoilPh = watch('soil_ph'); // +5 confidence
    const watchedOrganicMatter = watch('organic_matter_percentage'); // +5 confidence

    // ENHANCED: Amendment fields for IPCC 2006 lime dissolution calculations (PA events)
    const watchedAmendmentAmount = watch('amendment_amount'); // Required for lime CO2 calculation
    const watchedAmendmentUnit = watch('amendment_unit'); // Unit conversion for lime amount
    const watchedAmendmentType = watch('amendment_type'); // Determines emission factor (limestone vs dolomite)

    // Watch non-calculation fields to ensure they get sent to backend (but don't trigger carbon API)
    const watchedName = watch('name'); // For preview card title updates
    const watchedObservation = watch('observation'); // For backend description field
    const watchedDepth = watch('depth'); // For preview display
    const watchedDepthUnit = watch('depth_unit'); // For preview display
    const watchedEquipmentUsed = watch('equipment_used'); // For preview display
    const watchedFuelType = watch('fuel_type'); // For preview display
    const watchedCustomFields = watch('custom_fields'); // For preview display

    // NOP Compliance fields — watch to propagate to preview data
    const watchedAmendmentOrganicApproved = watch('amendment_organic_approved');
    const watchedCompostPeakTemp = watch('compost_peak_temp_f');
    const watchedCompostDurationDays = watch('compost_duration_days_at_temp');
    const watchedCompostTurningCount = watch('compost_turning_count');
    const watchedCompostMethod = watch('compost_method');
    const watchedCompostInitialCnRatio = watch('compost_initial_cn_ratio');
    const watchedManureHarvestInterval = watch('manure_harvest_interval');
    const watchedManureApplicationDate = watch('manure_application_date');
    const watchedManureHarvestDatePlanned = watch('manure_harvest_date_planned');

    // Does the plan clear the interval it declares? Both dates and the interval were on this
    // form already, and nothing compared them: a farmer could select the correct 120 days for
    // a soil-contact crop — clearing the crop-rule check in the certifier packet, which only
    // validates the LABEL — and plan harvest 60 days after application. Catching it here beats
    // catching it in the packet, because here the harvest plan can still move.
    const manureIntervalShortfall = useMemo(() => {
      const days = parseInt(String(watchedManureHarvestInterval || '').split('_')[0], 10);
      if (
        !Number.isFinite(days) ||
        !watchedManureApplicationDate ||
        !watchedManureHarvestDatePlanned
      )
        return null;
      const applied = new Date(watchedManureApplicationDate);
      const planned = new Date(watchedManureHarvestDatePlanned);
      if (Number.isNaN(applied.getTime()) || Number.isNaN(planned.getTime())) return null;
      const gap = Math.round((planned - applied) / 86400000);
      // Reversed dates are a typo, not a short interval. Reporting "planned -30 days after
      // this application, 150 days short" would send the farmer to widen an interval when what
      // is actually wrong is one of the two dates. Same split as the certifier packet's
      // page-2 check, so the two surfaces never disagree about which fault this is.
      if (gap < 0) return { reversed: true, gap: Math.abs(gap) };
      return gap < days ? { gap, required: days, short: days - gap } : null;
    }, [
      watchedManureHarvestInterval,
      watchedManureApplicationDate,
      watchedManureHarvestDatePlanned
    ]);

    // Note: These fields are watched to ensure form data updates
    // but are NOT included in the carbon calculation useEffect dependencies

    // Sync custom fields with form
    useEffect(() => {
      methods.setValue('custom_fields', customFields);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customFields]);

    // Carbon calculation trigger - ONLY for calculation-relevant fields
    useEffect(() => {
      // Only trigger when fields that actually impact carbon calculations change
      const timeoutId = setTimeout(() => {
        if (onDataChange && typeof onDataChange === 'function') {
          const currentValues = methods.getValues();
          console.log(
            'SoilManagementTab carbon calculation triggered for:',
            Object.keys(currentValues)
          );

          // Check if we have calculation-relevant data
          if (
            watchedType ||
            watchedArea ||
            watchedFuelConsumed ||
            watchedEquipmentHours ||
            watchedSoilPh
          ) {
            try {
              onDataChange(currentValues);
              console.log('🌱 SoilManagementTab: ✅ Carbon calculation onDataChange called');
            } catch (error) {
              console.error(
                'SoilManagementTab: ❌ Error in carbon calculation onDataChange:',
                error
              );
            }
          }
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }, [
      // ONLY carbon calculation fields to prevent unnecessary API calls
      watchedType, // Determines emission factor
      watchedArea, // Area-based emissions
      watchedAreaUnit, // Area conversion
      watchedFuelConsumed, // Direct fuel emissions
      watchedFuelUnit, // Fuel conversion
      watchedEquipmentHours, // Fuel estimation
      watchedSoilPh, // +5 confidence
      watchedOrganicMatter, // +5 confidence
      // ENHANCED: Amendment fields for IPCC 2006 lime dissolution calculations
      watchedAmendmentAmount, // Required for lime CO2 calculation
      watchedAmendmentUnit, // Unit conversion
      watchedAmendmentType, // Determines emission factor
      onDataChange
    ]); // OPTIMIZED: Only trigger carbon calculations for relevant field changes

    // Form data completeness - for ALL fields including non-calculation ones
    useEffect(() => {
      // Always update form data to ensure transportation_distance and observation are captured
      const timeoutId = setTimeout(() => {
        if (onDataChange && typeof onDataChange === 'function') {
          const currentValues = methods.getValues();
          console.log('🌱 SoilManagementTab form completeness update for non-calculation fields');

          // Always send complete form data when non-calculation fields change
          try {
            onDataChange(currentValues);
            console.log('🌱 SoilManagementTab: ✅ Form data completeness onDataChange called');
          } catch (error) {
            console.error('SoilManagementTab: ❌ Error in form completeness onDataChange:', error);
          }
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }, [
      // Non-calculation fields to ensure they get captured in form data
      // Sprint 2 Epic 2.1.3: Removed watchedTransportationDistance
      watchedName, // Ensures event name changes update preview card title
      watchedObservation, // Ensures observation gets mapped to description
      watchedDepth, // Ensures working depth appears in preview
      watchedDepthUnit, // Ensures depth unit appears in preview
      watchedEquipmentUsed, // Ensures equipment_used appears in preview
      watchedFuelType, // Ensures fuel type appears in preview
      watchedCustomFields, // Ensures custom fields appear in preview
      watchedAmendmentOrganicApproved, // NOP: organic approval status
      watchedCompostPeakTemp, // NOP: compost peak temperature
      watchedCompostDurationDays, // NOP: compost duration at temp
      watchedCompostTurningCount, // NOP: compost turning count
      watchedCompostMethod, // NOP: compost method (§ 205.203(c)(2))
      watchedCompostInitialCnRatio, // NOP: compost initial C:N ratio (§ 205.203(c)(2))
      watchedManureHarvestInterval, // NOP: manure harvest interval
      watchedManureApplicationDate, // NOP: manure application date
      onDataChange
    ]); // ENSURES: All form data including non-calculation fields gets sent to backend

    useEffect(() => {
      if (watchedType && watchedType !== selectedSoilType && watchedType !== '') {
        setSelectedSoilType(watchedType);

        const newDefaults = getSoilManagementDefaults(watchedType);

        // F04 fix (2026-06): NEVER auto-fill MEASUREMENT fields on subtype switch.
        // soil_ph / organic_matter_percentage / soil_texture are lab or field
        // measurements — injecting a default (e.g. switching to ST pre-filled
        // pH 6.5 / OM 3.5%) submits a reading the farmer never took and previously
        // earned a +5 carbon-confidence credit for invented data. Leave them blank
        // so the farmer enters real values, consistent with the no-phantom policy
        // used for fertilizer NPK and irrigation. Area is already excluded.

        // Only apply defaults for non-measurement, non-critical fields
        Object.keys(newDefaults).forEach((field) => {
          // Skip measurement fields - farmer must provide real readings
          if (SOIL_MEASUREMENT_FIELDS.includes(field)) return;

          const currentValue = watch(field);
          if (!currentValue || currentValue === '' || currentValue === intelligentDefaults[field]) {
            setValue(field, newDefaults[field]);
          }
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [watchedType, selectedSoilType, intelligentDefaults]);

    const handleEnhancedSubmit = (data) => {
      // 🔍 Debug: Check if observation field is being captured
      console.log('🔍 [SoilManagement] Form submission data:', {
        observation: data.observation,
        private_note: data.private_note,
        // Boolean on the model, 'true'/'false' string on the Switch — coerce at the boundary.
        reviewed: data.reviewed === 'true' || data.reviewed === true,
        reviewer_name: data.reviewer_name || null,
        review_date: data.review_date || null,
        observationType: typeof data.observation,
        observationLength: data.observation?.length,
        allKeys: Object.keys(data)
      });

      // 🔍 TILLAGE FIX DEBUG: Check if tillage fields are in form data
      console.log('🌱 [SoilManagement] TILLAGE FIELDS CHECK:', {
        type: data.type,
        tillage_type: data.tillage_type,
        tillage_intensity: data.tillage_intensity,
        tillage_direction: data.tillage_direction,
        residue_management: data.residue_management,
        isTillageEvent: data.type === 'TI'
      });

      // With several parcels the area is on the cards, never back-filled here. A sample (LA, ST)
      // or a habitat record may carry no area at all, and is never given a default one.
      const requiredFields = multiTarget
        ? ['type', 'area_unit']
        : soilAreaIsOptional(data.type)
        ? ['type']
        : ['type', 'area_covered', 'area_unit'];

      const invalidFields = requiredFields.filter((field) => {
        const value = data[field]?.toString().toLowerCase();
        return (
          !value || value === 'unknown' || value === 'n/a' || value === 'na' || value.trim() === ''
        );
      });

      if (invalidFields.length > 0) {
        const defaults = getSoilManagementDefaults(data.type);
        invalidFields.forEach((field) => {
          if (defaults[field]) {
            data[field] = defaults[field];
            setValue(field, defaults[field]);
          }
        });
      }

      // Note: Crop type is inherited from production context via event.history.crop_type.name
      // USDA API mapping happens in backend based on production's crop type

      // Extract tillage fields for extra_data storage
      // ENHANCED: For TI (Tillage) events, map depth → tillage_depth for backend carbon calculation
      const {
        tillage_type,
        tillage_intensity,
        tillage_direction,
        residue_management,
        depth,
        depth_unit,
        ...coreData
      } = data;

      // The model field is `working_depth` (+ `depth_unit`) for EVERY soil subtype.
      //
      // 🔴 2026-08-19: this block renamed the input to `tillage_depth`/`tillage_depth_unit`
      // for TI and sent bare `depth` otherwise — and the serializer accepts neither, so DRF
      // dropped both silently and the grower's depth never reached the record. The packet's
      // Tillage Detail table reads `ev.working_depth` for its "Working Depth" column, i.e.
      // the one number that separates a shallow conservation pass from an inversion pass
      // under § 205.203(a), so that column printed blank for anything entered through the UI.
      // Only seeded rows, which write the column directly, ever had a value.
      //
      // Empty must be null, not '': working_depth is a DecimalField and DRF rejects ''.
      const tillageDepthData = {
        working_depth: depth || null,
        depth_unit: depth_unit || 'cm'
      };

      // Process data for backend compatibility
      // Ensure all numeric fields are strings (not Decimal objects)
      const cleanedCoreData = Object.entries(coreData).reduce((acc, [key, value]) => {
        // Convert any numeric values to strings to avoid Decimal serialization issues.
        //
        // ⚠️ SCALARS ONLY. This ran String() over EVERY key, and `custom_fields` is an ARRAY
        // that rides along in `coreData` — so a farmer's custom field was posted as the
        // literal string "[object Object]", which the backend validator rejects (a 500 until
        // that path was taught to raise a 400), and an empty list was posted as "" and
        // silently dropped. An object or array reaching a JSON body needs no stringifying;
        // only Decimal-ish scalars did.
        if (value === null || value === undefined || typeof value === 'object') {
          acc[key] = value;
        } else {
          acc[key] = String(value);
        }
        return acc;
      }, {});

      // 🔍 Debug: Check observation value before mapping to description
      console.log('🔍 [SoilManagement] Before description mapping:', {
        'cleanedCoreData.observation': cleanedCoreData.observation,
        'observation type': typeof cleanedCoreData.observation,
        'observation length': cleanedCoreData.observation?.length,
        'is falsy?': !cleanedCoreData.observation,
        'fallback name': cleanedCoreData.name
      });

      const processedData = {
        ...cleanedCoreData,
        // FK — an empty select must post null, never "" (DRF PK field 400s on "")
        receipt_document: cleanedCoreData.receipt_document || null,
        // ENHANCED: Include depth data with proper field naming for backend
        ...tillageDepthData,
        // FSMA § 112.161(b) supervisor review. The Switch stores 'true'/'false' strings and the
        // date arrives as '' when untouched, which DRF's DateField rejects outright.
        //
        // 🔴 2026-08-19: this coercion existed in ProductionTab, ChemicalTab and
        // PestManagementTab but NOT here, so EVERY soil event save failed with
        // "review_date: Date has wrong format" unless the grower happened to fill an optional
        // produce-safety field their organic certifier does not even ask for. A soil event is
        // the § 205.203 record — the family this blocked is the one the packet leans on most.
        // The same three lines were present in this file, but inside a console.log() object
        // literal, which is why a grep for `review_date:` looked satisfied.
        reviewed: cleanedCoreData.reviewed === 'true' || cleanedCoreData.reviewed === true,
        reviewer_name: cleanedCoreData.reviewer_name || null,
        review_date: cleanedCoreData.review_date || null,
        // NOP DateField: backend rejects empty strings — convert to null
        manure_application_date: cleanedCoreData.manure_application_date || null,
        manure_harvest_date_planned: cleanedCoreData.manure_harvest_date_planned || null,
        // Nitrogen content of the amendment — drives field N2O and the CA ILRP
        // total-nitrogen-applied figure. Empty must be null, not '' (DecimalField).
        amendment_nitrogen_percentage: cleanedCoreData.amendment_nitrogen_percentage || null,
        // NOP 5006 processed manure — coerce empties to null (DecimalField/choice)
        manure_treatment: cleanedCoreData.manure_treatment || null,
        // USDA form #9 columns. null (not undefined) so a mis-picked value can be cleared,
        // and GR-only fields clear themselves when the subtype rules them out.
        manure_application_method:
          cleanedCoreData.type === 'GR' ? null : cleanedCoreData.manure_application_method || null,
        manure_animal_source: cleanedCoreData.manure_animal_source || null,
        manure_form: cleanedCoreData.type === 'GR' ? null : cleanedCoreData.manure_form || null,
        manure_origin: cleanedCoreData.type === 'GR' ? null : cleanedCoreData.manure_origin || null,
        processed_manure_temp_f: cleanedCoreData.processed_manure_temp_f || null,
        processed_manure_attestation: cleanedCoreData.processed_manure_attestation || null,
        // Map observation field to description (required by backend CommonEvent model)
        // Backend requires non-empty description, so provide fallback if observation is empty
        description: cleanedCoreData.observation || soilDescriptionFallback(cleanedCoreData),
        // Store tillage-specific fields in extra_data for backend compatibility
        // Ensure all values are JSON-serializable (convert any potential Decimal objects to strings)
        extra_data: {
          // 🔴 2026-08-31 — these four were written UNCONDITIONALLY, so every soil event of
          // every subtype carried `tillage_type: ''`, `tillage_intensity: ''`,
          // `tillage_direction: ''` and `residue_management: ''`. Measured on a real compost
          // record: eight empty keys in `extra_data`, four of them from here and the rest from
          // form fields the subtype never rendered (the serializer files unknown top-level keys
          // into extra_data, so anything RHF holds is posted whether or not it was shown).
          //
          // That is the clobber class `.claude/rules/frontend.md` names: "a mutation/form
          // payload sends ONLY fields its UI renders". Empty strings are not harmless here —
          // the backend MERGES extra_data, so a blank from one subtype's form can overwrite a
          // real value stored by another.
          ...(data.type === 'TI'
            ? {
                tillage_type: tillage_type || '',
                tillage_intensity: tillage_intensity || '',
                tillage_direction: tillage_direction || '',
                residue_management: residue_management || ''
              }
            : {}),
          // Include any existing extra data, ensuring JSON serialization
          ...(data.extra_data ? JSON.parse(JSON.stringify(data.extra_data)) : {})
        }
      };

      // F19: pack the soil-test lab RESULTS (ST only) into the reserved test_results JSONField. A
      // soil test that records only pH/OM/texture but no N/P/K/CEC/lab is an incomplete certifier
      // record. Only non-empty values are stored; report_date lives inside the JSON (no DRF 400).
      if (data.type === 'ST' || data.type === 'LA') {
        const tr = {};
        const put = (k, v) => {
          if (v !== undefined && v !== null && String(v).trim() !== '') tr[k] = v;
        };
        put('lab_name', data.lab_name);
        put('sample_id', data.lab_sample_id);
        put('report_date', data.lab_report_date);
        put('nitrogen', data.lab_nitrogen);
        put('phosphorus', data.lab_phosphorus);
        put('potassium', data.lab_potassium);
        put('cec', data.lab_cec);
        // §E-2 micronutrient results: the documented deficiency for § 205.601(j)(7)
        put('zinc_ppm', data.lab_zinc_ppm);
        put('boron_ppm', data.lab_boron_ppm);
        put('manganese_ppm', data.lab_manganese_ppm);
        put('iron_ppm', data.lab_iron_ppm);
        if (Object.keys(tr).length > 0) {
          processedData.test_results = { ...(processedData.test_results || {}), ...tr };
        }
      } else {
        // Re-typing a soil test as, say, Tillage must not leave the lab's N/P/K attached to a
        // tillage pass — that row would then read as a measurement of an operation that never
        // measured anything. This form is the only writer of test_results, so clearing here is
        // the whole story.
        processedData.test_results = null;
      }

      // Grazing Summary Mode: only send summary fields for an active grazing summary; otherwise
      // strip them so non-summary (and non-grazing) soil events don't carry stray rotation fields.
      // Mirrors the pest-tab guard. The backend MERGES extra_data, so to actually clear a stale
      // flag when editing a summary event back to normal, explicitly set is_summary=false (a plain
      // delete would be dropped by the merge and the old "true" would persist).
      const isGrazingSummarySubmit = data.type === 'GR' && data.is_summary === 'true';
      if (!isGrazingSummarySubmit) {
        delete processedData.date_start;
        delete processedData.date_end;
        delete processedData.event_count;
        delete processedData.total_grazing_days;
        delete processedData.area_covered_total;
        processedData.is_summary = false;
        if (processedData.extra_data) {
          processedData.extra_data.is_summary = false;
          delete processedData.extra_data.date_start;
          delete processedData.extra_data.date_end;
          delete processedData.extra_data.event_count;
          delete processedData.extra_data.total_grazing_days;
          delete processedData.extra_data.area_covered_total;
        }
      }

      // Biodiversity / habitat: only send habitat fields for the HD/NS subtypes; otherwise strip them
      // so non-habitat soil events don't carry stray habitat_type / empty species/notes into extra_data.
      const isHabitatSubmit = data.type === 'HD' || data.type === 'NS';
      if (!isHabitatSubmit) {
        delete processedData.habitat_type;
        delete processedData.habitat_structure_count;
        delete processedData.habitat_install_date;
        delete processedData.species_planted;
        delete processedData.wildlife_observed;
        delete processedData.structure_notes;
        if (processedData.extra_data) {
          delete processedData.extra_data.species_planted;
          delete processedData.extra_data.wildlife_observed;
          delete processedData.extra_data.structure_notes;
        }
      }

      // ⚠️ Deleting a key from `processedData` does NOT keep it out of the request.
      //
      // MEASURED 2026-08-31: NewEvent submits `{ ...eventFormData, ...data }`, and
      // `eventFormData` accumulates the entire form state through `onDataChange` — so every key
      // deleted here is put straight back by that spread. The habitat block above has had this
      // shape since it was written and never actually stripped anything on the create path; a
      // compost event still stored `species_planted: ""`, `wildlife_observed: ""` and
      // `structure_notes: ""`.
      //
      // The gate that works is in the serializer, where the value is filed into extra_data
      // (`UpdateSoilManagementEventSerializer.to_internal_value` — empties are skipped on create
      // and still honoured on update, so clearing a stored value keeps working). What this tab
      // CAN do is not fabricate keys in the first place, which is why the tillage fields are
      // built conditionally above rather than deleted here.

      // §E-2: sample_matrix belongs to a lab analysis only. Send null (not a bare delete) for
      // every other subtype so editing an LA event to, say, Tillage actually clears the stored
      // matrix — the backend would keep the old column value if the key were simply absent.
      processedData.sample_matrix = data.type === 'LA' ? data.sample_matrix || null : null;

      console.log('[SoilManagementTab] Submitting with standardized fuel fields:', {
        fuel_consumed: processedData.fuel_consumed,
        fuel_unit: processedData.fuel_unit,
        equipment_hours: processedData.equipment_hours
      });

      // ENHANCED: Log amendment and tillage fields for carbon calculation debugging
      console.log('[SoilManagementTab] Carbon calculation fields:', {
        type: data.type,
        // Amendment fields (PA events - IPCC 2006 lime dissolution)
        amendment_amount: processedData.amendment_amount,
        amendment_unit: processedData.amendment_unit,
        amendment_type: processedData.amendment_type,
        // Tillage depth fields (TI events - soil CO2 flux)
        tillage_depth: processedData.tillage_depth,
        tillage_depth_unit: processedData.tillage_depth_unit,
        depth: processedData.depth,
        depth_unit: processedData.depth_unit
      });

      console.log('[SoilManagementTab] Submitting processed data:', {
        ...processedData,
        extra_data: JSON.stringify(processedData.extra_data, null, 2)
      });
      onSubmitHandler(processedData);
    };

    // Keep ref in sync with latest handler on every render (avoids stale closures)
    submitHandlerRef.current = handleEnhancedSubmit;

    return (
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(handleEnhancedSubmit)} noValidate style={{ width: '100%' }}>
          <Flex direction="column" w="100%">
            {/* Forms are hand-crafted by design: the NOP section grouping below is what
                makes the audit export complete, and the registry renderer flattens it.
                The field registry is the SSOT for DISPLAY surfaces (consumer card, modal,
                timeline) and is enforced here by src/config/events/__tests__/
                formConformance.test.ts, not by a runtime flag. */}
            <>
              {/* Sprint 3 Epic 3.1: consolidated section 1 (merged Info + Area) */}
              <SectionBox>
                {/* Not "Soil Management Details" — EVENT_TYPE_NAMES[5], the retired family
                      name, hardcoded in English. Name, subtype, area and depth. */}
                <SectionHeader
                  icon={FaSeedling}
                  title={intl.formatMessage({ id: 'events.section.activityBasics' })}
                  badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                />

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <StandardField
                    label={intl.formatMessage({ id: 'app.soilManagementType' })}
                    required
                    error={errors.type?.message && intl.formatMessage({ id: errors.type.message })}>
                    <StandardSelect
                      placeholder={intl.formatMessage({
                        id: 'events.soil.placeholders.soilManagementType'
                      })}
                      {...register('type')}>
                      <option value="ST">
                        {intl.formatMessage({ id: 'events.soil.subtypes.soilTest' })}
                      </option>
                      {/* F35 fix (2026-06): backend display for PA is "pH Adjustment"
                            (history/models.py:2181). The form said "Soil Amendment", so
                            consumer/export surfaces showed a different label than the
                            farmer picked. Aligned to the backend display. */}
                      <option value="PA">
                        {intl.formatMessage({ id: 'events.soil.subtypes.phAdjustment' })}
                      </option>
                      <option value="CC">
                        {intl.formatMessage({ id: 'events.soil.subtypes.coverCrop' })}
                      </option>
                      <option value="OM">
                        {intl.formatMessage({ id: 'events.soil.subtypes.organicMatter' })}
                      </option>
                      <option value="TI">
                        {intl.formatMessage({ id: 'events.soil.subtypes.tillage' })}
                      </option>
                      <option value="CO">
                        {intl.formatMessage({ id: 'events.soil.subtypes.composting' })}
                      </option>
                      <option value="GR">
                        {intl.formatMessage({ id: 'events.soil.subtypes.grazing' })}
                      </option>
                      <option value="HD">
                        {intl.formatMessage({ id: 'events.soil.subtypes.habitatDevelopment' })}
                      </option>
                      <option value="NS">
                        {intl.formatMessage({ id: 'events.soil.subtypes.nestingShelter' })}
                      </option>
                      {/* §E-2: one subtype for every sampled matrix (leaf, petiole, hull,
                            compost, water) — what a certifier reads is the same record; only
                            sample_matrix differs. "Soil Testing" (ST) stays for soil. */}
                      <option value="LA">
                        {intl.formatMessage({ id: 'events.soil.options.type.labAnalysis' })}
                      </option>
                    </StandardSelect>
                  </StandardField>

                  <StandardField
                    label={intl.formatMessage({ id: 'app.eventName' })}
                    helpText={intl.formatMessage({ id: 'events.soil.fields.nameHelp' })}>
                    <StandardInput
                      type="text"
                      placeholder={intl.formatMessage({
                        id: 'events.soil.form.placeholder.eGSpringTillageNorthField'
                      })}
                      {...register('name')}
                    />
                  </StandardField>

                  {/* Area is hidden for NS (nesting/shelter structures have no meaningful area)
                        and optional for HD, LA and ST (SOIL_AREA_OPTIONAL_SUBTYPES); required for
                        every other subtype. */}
                  {watch('type') !== 'NS' && (
                    <StandardField
                      label={
                        multiTarget
                          ? intl.formatMessage({ id: 'events.multiParcel.areaUnitLabel' })
                          : soilAreaIsOptional(watch('type'))
                          ? intl.formatMessage({ id: 'events.soil.form.label.areaCoveredOptional' })
                          : intl.formatMessage({ id: 'events.soil.form.label.areaCovered' })
                      }
                      helpText={
                        multiTarget
                          ? intl.formatMessage({ id: 'events.multiParcel.areaUnitHelp' })
                          : undefined
                      }
                      required={!soilAreaIsOptional(watch('type'), multiTarget)}
                      error={errors.area_covered?.message || errors.area_unit?.message}>
                      <HStack spacing={2}>
                        {!multiTarget && (
                          <StandardInput
                            flex={2}
                            type="number"
                            step="0.1"
                            placeholder="2.0"
                            {...register('area_covered')}
                          />
                        )}
                        <StandardSelect flex={1} {...register('area_unit')}>
                          <option value="ha">
                            {intl.formatMessage({ id: 'events.units.hectares' })}
                          </option>
                          <option value="acres">
                            {intl.formatMessage({ id: 'events.units.acres' })}
                          </option>
                        </StandardSelect>
                      </HStack>
                    </StandardField>
                  )}

                  {/* F34 fix (2026-06): hide this common "Working Depth" for the
                        amendment subtypes (PA/OM/CC/CO) — they render their own
                        "Application Depth" field below, also bound to register('depth').
                        Showing both put two inputs on one value (desync/confusion).
                        Each subtype now shows the depth input exactly once.
                        2026-06-20: also hide for grazing (GR) and habitat (HD/NS) — there is no
                        "working depth" for livestock grazing, hedgerows, or nesting boxes. Leaves
                        Working Depth on ST (sampling depth) and TI (tillage depth) only. */}
                  {!['PA', 'OM', 'CC', 'CO', 'GR', 'HD', 'NS'].includes(watch('type')) && (
                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.workingDepth' })}>
                      <HStack spacing={2}>
                        <StandardInput
                          flex={2}
                          type="number"
                          step="1"
                          placeholder="30"
                          {...register('depth')}
                        />
                        <StandardSelect flex={1} {...register('depth_unit')}>
                          <option value="cm">
                            {intl.formatMessage({ id: 'app.centimeters' })}
                          </option>
                          <option value="inches">{intl.formatMessage({ id: 'app.inches' })}</option>
                        </StandardSelect>
                      </HStack>
                    </StandardField>
                  )}
                </SimpleGrid>

                {/* NOP 205.203(c): Manure timing compliance helper — shown full-width below the grid */}
                {(watch('type') === 'CO' || watch('type') === 'OM') && (
                  <Box mt={4}>
                    <StandardAlert
                      status="info"
                      title={intl.formatMessage({ id: 'app.manureTimingTitle' })}
                      description={intl.formatMessage({ id: 'app.manureTimingDescription' })}
                    />
                  </Box>
                )}
              </SectionBox>

              {/* Fuel & Equipment hidden for grazing (GR) — a livestock rotation burns no fuel and
                    uses no equipment, so the whole section is noise there. Kept for HD/NS because
                    planting a hedgerow or mounting nest boxes can use an auger/tractor. */}
              {watch('type') !== 'GR' && (
                <SectionBox>
                  <SectionHeader
                    icon={FaSeedling}
                    title={intl.formatMessage({ id: 'events.section.soil.fuelOperations' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.optionalCarbon' })}
                    description={intl.formatMessage({ id: 'events.section.desc.carbonOptional' })}
                    badgeTone="optional"
                  />{' '}
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {/* Phase 3: Fuel Type Selector */}
                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.fuelType' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.selectAFuelTypeOnlyIf'
                      })}>
                      <StandardSelect
                        placeholder={intl.formatMessage({
                          id: 'events.chemical.form.fuelTypePlaceholder'
                        })}
                        {...register('fuel_type')}>
                        {FUEL_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {intl.formatMessage({ id: type.labelKey })} ({type.factor})
                          </option>
                        ))}
                      </StandardSelect>
                    </StandardField>

                    <StandardField
                      label={
                        multiTarget
                          ? intl.formatMessage({ id: 'events.multiParcel.fuelUnitLabel' })
                          : watch('fuel_type') === 'electric'
                          ? intl.formatMessage({ id: 'events.soil.form.label.energyAmountKwh' })
                          : intl.formatMessage({ id: 'events.soil.form.label.fuelConsumed' })
                      }
                      helpText={
                        multiTarget
                          ? intl.formatMessage({ id: 'events.multiParcel.fuelUnitHelp' })
                          : watch('fuel_type') === 'electric'
                          ? intl.formatMessage({
                              id: 'events.soil.form.help.energyConsumptionForCarbon'
                            })
                          : intl.formatMessage({ id: 'events.soil.form.help.totalFuelUsedForSoil' })
                      }>
                      <HStack spacing={2}>
                        {!multiTarget && (
                          <StandardInput
                            flex={2}
                            type="number"
                            step="0.1"
                            placeholder={
                              watch('fuel_type') === 'electric'
                                ? intl.formatMessage(
                                    { id: 'events.soil.form.example' },
                                    { value: '15 kWh' }
                                  )
                                : '15.5'
                            }
                            {...register('fuel_consumed')}
                          />
                        )}
                        <StandardSelect flex={1} {...register('fuel_unit')}>
                          <option value="L">
                            {intl.formatMessage({ id: 'events.units.liters' })}
                          </option>
                          <option value="gal">
                            {intl.formatMessage({ id: 'events.units.gallons' })}
                          </option>
                          <option value="kg">
                            {intl.formatMessage({ id: 'events.units.kilograms' })}
                          </option>
                          <option value="kWh">
                            {intl.formatMessage({ id: 'events.units.kilowattHours' })}
                          </option>
                        </StandardSelect>
                      </HStack>
                    </StandardField>

                    {!multiTarget && (
                      <StandardField
                        label={intl.formatMessage({ id: 'events.soil.form.label.equipmentHours' })}
                        helpText={intl.formatMessage({
                          id: 'events.soil.form.help.totalEquipmentOperatingTime'
                        })}>
                        <StandardInput
                          type="number"
                          step="0.1"
                          placeholder="3.5"
                          {...register('equipment_hours')}
                        />
                      </StandardField>
                    )}

                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.common.fields.productionEfficiency'
                      })}
                      helpText={intl.formatMessage({ id: 'app.operationEfficiencyHelp' })}>
                      <StandardSelect {...register('production_efficiency')}>
                        <option value="">
                          {intl.formatMessage({ id: 'events.production.help.efficiencyUnset' })}
                        </option>
                        <option value="high">
                          {intl.formatMessage({ id: 'events.productionEfficiency.high' })}
                        </option>
                        <option value="normal">
                          {intl.formatMessage({ id: 'events.productionEfficiency.normal' })}
                        </option>
                        <option value="low">
                          {intl.formatMessage({ id: 'events.productionEfficiency.low' })}
                        </option>
                      </StandardSelect>
                    </StandardField>

                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.equipmentUsed' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.equipmentUsedForThisOperation'
                      })}>
                      <StandardInput
                        type="text"
                        placeholder={intl.formatMessage({
                          id: 'events.soil.form.placeholder.eGTractorWithDiscHarrow'
                        })}
                        {...register('equipment_used')}
                      />
                    </StandardField>
                  </SimpleGrid>
                  {/* Phase 3: Electric Equipment Info Box */}
                  {watch('fuel_type') === 'electric' && (
                    <Box mt={3}>
                      <StandardAlert
                        status="info"
                        title={intl.formatMessage({
                          id: 'events.soil.form.title.electricEquipment'
                        })}
                        description={intl.formatMessage({
                          id: 'events.soil.form.desc.enterEnergyConsumptionInKilowattHours'
                        })}
                      />
                    </Box>
                  )}
                  <Box mt={3}>
                    {/* Title and body described two different things: the body is the
                        carbon-is-optional note, under a heading about consumer trust. */}
                    <StandardAlert
                      status="info"
                      title={intl.formatMessage({ id: 'events.section.badge.optionalCarbon' })}
                      description={intl.formatMessage({ id: 'events.section.desc.carbonOptional' })}
                    />
                  </Box>
                </SectionBox>
              )}

              {/* Soil Amendment fields — PA (pH Adjustment), OM (Organic Matter), CC (Cover Crop), CO (Composting) */}
              {['PA', 'OM', 'CC', 'CO'].includes(watch('type')) && (
                <SectionBox>
                  <SectionHeader
                    icon={FaSeedling}
                    title={intl.formatMessage({ id: 'events.section.soil.amendment' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    description={intl.formatMessage({
                      id: 'events.soil.form.desc.documentLimeOrSoilAmendmentApplication'
                    })}
                  />{' '}
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.amendmentType' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.typeOfSoilAmendmentApplied'
                      })}>
                      <StandardSelect
                        placeholder={intl.formatMessage({
                          id: 'events.soil.placeholders.amendmentType'
                        })}
                        {...register('amendment_type')}>
                        <option value="limestone">
                          {intl.formatMessage({
                            id: 'events.soil.options.amendmentType.limestone'
                          })}
                        </option>
                        <option value="dolomite">
                          {intl.formatMessage({ id: 'events.soil.options.amendmentType.dolomite' })}
                        </option>
                        <option value="calcium_oxide">
                          {intl.formatMessage({
                            id: 'events.soil.options.amendmentType.calciumOxide'
                          })}
                        </option>
                        <option value="calcium_hydroxide">
                          {intl.formatMessage({
                            id: 'events.soil.options.amendmentType.calciumHydroxide'
                          })}
                        </option>
                        <option value="gypsum">
                          {intl.formatMessage({ id: 'events.soil.options.amendmentType.gypsum' })}
                        </option>
                        <option value="sulfur">
                          {intl.formatMessage({ id: 'events.soil.options.amendmentType.sulfur' })}
                        </option>
                        <option value="compost">
                          {intl.formatMessage({ id: 'events.soil.options.amendmentType.compost' })}
                        </option>
                        <option value="manure">
                          {intl.formatMessage({ id: 'events.soil.options.amendmentType.manure' })}
                        </option>
                        <option value="mulch">
                          {intl.formatMessage({ id: 'events.soil.options.amendmentType.mulch' })}
                        </option>
                        <option value="other">
                          {intl.formatMessage({ id: 'events.soil.options.amendmentType.other' })}
                        </option>
                      </StandardSelect>
                    </StandardField>

                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.soil.fields.amendmentProductName',
                        defaultMessage: 'Amendment Product Name'
                      })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.amendmentProductNameHelp',
                        defaultMessage:
                          'Specific product (e.g., Malibu Compost Bu’s Blend) — required for the NOP/CCOF input record'
                      })}>
                      <StandardInput
                        placeholder={intl.formatMessage({
                          id: 'events.soil.amendmentProductNamePlaceholder',
                          defaultMessage: 'e.g., Malibu Compost Bu’s Blend'
                        })}
                        {...register('amendment_product_name')}
                      />
                      {/* The plan's own Materials List (CCOF ORGB41: only listed materials may be
                          used). Fills the name, and the maker while it is blank. */}
                      <PlanMaterialsQuickPick
                        establishmentId={farmId}
                        categories={['fertilizer_amendment']}
                        onPick={(material) => {
                          setValue('amendment_product_name', material.name, { shouldDirty: true });
                          const maker = methods.getValues('amendment_manufacturer') || '';
                          if (material.manufacturer) {
                            setValue('amendment_manufacturer', material.manufacturer, {
                              shouldDirty: true
                            });
                            planChipMakerRef.current = material.manufacturer;
                          } else if (maker && maker === planChipMakerRef.current) {
                            setValue('amendment_manufacturer', '', { shouldDirty: true });
                            planChipMakerRef.current = null;
                          }
                        }}
                      />
                    </StandardField>

                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.soil.fields.amendmentManufacturer',
                        defaultMessage: 'Amendment Manufacturer'
                      })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.amendmentManufacturerHelp',
                        defaultMessage: 'Manufacturer / supplier of the amendment'
                      })}>
                      <StandardInput
                        placeholder={intl.formatMessage({
                          id: 'events.soil.amendmentManufacturerPlaceholder',
                          defaultMessage: 'e.g., Malibu Compost'
                        })}
                        {...register('amendment_manufacturer')}
                      />
                    </StandardField>

                    {/* Cover-crop species — CC subtype only. Persists in extra_data
                          (routed on submit); the audit export reads it for the §205.203
                          cover-crop record. */}
                    {watch('type') === 'CC' && (
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.soil.coverCropSpecies',
                          defaultMessage: 'Cover-Crop Species'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.soil.coverCropSpeciesHelp',
                          defaultMessage:
                            'Species / mix sown (e.g., vetch + bell beans + oats) — for the NOP §205.203 cover-crop record'
                        })}>
                        <StandardInput
                          placeholder={intl.formatMessage({
                            id: 'events.soil.coverCropSpeciesPlaceholder',
                            defaultMessage: 'e.g., Vetch / bell beans / oats'
                          })}
                          {...register('cover_crop_species')}
                        />
                      </StandardField>
                    )}

                    <StandardField
                      label={
                        multiTarget
                          ? intl.formatMessage({ id: 'events.multiParcel.amountUnitLabel' })
                          : intl.formatMessage({ id: 'events.soil.form.label.amendmentAmount' })
                      }
                      helpText={
                        multiTarget
                          ? intl.formatMessage({ id: 'events.multiParcel.amountUnitHelp' })
                          : intl.formatMessage({
                              id: 'events.soil.form.help.totalQuantityOfAmendmentApplied'
                            })
                      }>
                      <HStack spacing={2}>
                        {!multiTarget && (
                          <StandardInput
                            flex={2}
                            type="number"
                            step="0.1"
                            placeholder="500"
                            {...register('amendment_amount')}
                          />
                        )}
                        {/* F11 fix (2026-06): removed "short_tons" — it bridges to the
                              model amendment_amount_unit ChoiceField (kg/lbs/tons/gal),
                              which rejects "short_tons" with a DRF 400 on submit. */}
                        <StandardSelect flex={1} {...register('amendment_unit')}>
                          <option value="kg">
                            {intl.formatMessage({ id: 'events.units.kilograms' })}
                          </option>
                          <option value="tons">
                            {intl.formatMessage({ id: 'app.unit.tons' })}
                          </option>
                          <option value="lbs">
                            {intl.formatMessage({ id: 'events.units.pounds' })}
                          </option>
                        </StandardSelect>
                      </HStack>
                    </StandardField>

                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.applicationDepth' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.depthOfAmendmentIncorporation'
                      })}>
                      <HStack spacing={2}>
                        <StandardInput
                          flex={2}
                          type="number"
                          step="1"
                          placeholder="15"
                          {...register('depth')}
                        />
                        <StandardSelect flex={1} {...register('depth_unit')}>
                          <option value="cm">
                            {intl.formatMessage({ id: 'app.centimeters' })}
                          </option>
                          <option value="inches">{intl.formatMessage({ id: 'app.inches' })}</option>
                        </StandardSelect>
                      </HStack>
                    </StandardField>

                    {/* 🔴 Amendment purchase traceability — 7 CFR 205.103(b)(1)-(2).
                        CCOF's grower checklist asks for receipts for "fertilizer, compost,
                        soil amendments, planting mixes" in one line. The chemical form has
                        had these five inputs since Sprint 3; this one had none, so the
                        largest purchased input on most organic orchards had no paper trail
                        and the packet's mass balance could not reconcile. Blank is fine —
                        on-farm compost is not a purchase. */}
                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.soil.fields.amendmentSupplierName',
                        defaultMessage: 'Bought From (Supplier)'
                      })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.amendmentSupplierNameHelp',
                        defaultMessage:
                          'Who you bought it from — the name on the receipt. Leave blank for on-farm compost.'
                      })}>
                      <StandardInput
                        placeholder={intl.formatMessage({
                          id: 'events.soil.amendmentSupplierNamePlaceholder',
                          defaultMessage: 'e.g., Central Valley Compost Supply'
                        })}
                        {...register('amendment_supplier_name')}
                      />
                    </StandardField>

                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.soil.fields.amendmentPurchaseDate',
                        defaultMessage: 'Purchase Date'
                      })}>
                      <StandardInput type="date" {...register('amendment_purchase_date')} />
                    </StandardField>

                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.soil.fields.amendmentPurchaseInvoice',
                        defaultMessage: 'Invoice / Receipt #'
                      })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.amendmentPurchaseInvoiceHelp',
                        defaultMessage:
                          'Points your inspector at the paper record without you digging for it.'
                      })}>
                      <StandardInput
                        placeholder={intl.formatMessage(
                          { id: 'events.soil.form.example' },
                          { value: 'INV-20614' }
                        )}
                        {...register('amendment_purchase_invoice')}
                      />
                    </StandardField>

                    {/* The FILE behind the number (2026-08-25) — see ChemicalTab. */}
                    <Controller
                      name="receipt_document"
                      control={control}
                      render={({ field }) => (
                        <ReceiptDocumentSelect value={field.value} onChange={field.onChange} />
                      )}
                    />

                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.soil.fields.amendmentQuantityPurchased',
                        defaultMessage: 'Quantity Purchased'
                      })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.amendmentQuantityPurchasedHelp',
                        defaultMessage:
                          'Total amount bought on this invoice. Certifiers reconcile purchased against applied.'
                      })}>
                      <HStack spacing={2}>
                        <StandardInput
                          flex={2}
                          type="number"
                          step="0.01"
                          min={0}
                          placeholder="0.00"
                          {...register('amendment_quantity_purchased')}
                        />
                        {/* MUST stay the backend's UNIT_AMENDMENT list — the applied amount and
                            the purchased amount are the two halves of the mass balance, and the
                            export can only subtract them when the unit strings match. */}
                        <StandardSelect flex={1} {...register('amendment_quantity_purchased_unit')}>
                          <option value="kg">
                            {intl.formatMessage({ id: 'events.units.kilograms' })}
                          </option>
                          <option value="lbs">
                            {intl.formatMessage({ id: 'events.units.pounds' })}
                          </option>
                          <option value="tons">
                            {intl.formatMessage({ id: 'app.unit.tons' })}
                          </option>
                          <option value="gal">
                            {intl.formatMessage({ id: 'events.units.gallons' })}
                          </option>
                        </StandardSelect>
                      </HStack>
                    </StandardField>

                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.soil.fields.amendmentLotNumber',
                        defaultMessage: 'Lot / Batch #'
                      })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.amendmentLotNumberHelp',
                        defaultMessage: 'From the bag, tote or delivery ticket.'
                      })}>
                      <StandardInput
                        placeholder={intl.formatMessage(
                          { id: 'events.soil.form.example' },
                          { value: 'LOT-CVC-8841' }
                        )}
                        {...register('amendment_lot_number')}
                      />
                    </StandardField>
                  </SimpleGrid>
                  <Box mt={3}>
                    <StandardAlert
                      status="info"
                      title={intl.formatMessage({
                        id: 'events.soil.form.title.ipcc2006LimeDissolutionMethodology'
                      })}
                      description={intl.formatMessage({
                        id: 'events.soil.form.desc.carbonEmissionsFromLimeApplicationAre'
                      })}
                    />
                  </Box>
                </SectionBox>
              )}

              {/* NOP Compliance: Amendment Organic Approval — applies to PA, OM, CC, CO.
                    GR (Grazing) is in this gate ONLY so the raw-manure pre-harvest interval
                    block further down is reachable; the amendment-approval control below is
                    excluded for GR, since a grazing pass applies no purchased amendment. */}
              {['PA', 'OM', 'CC', 'CO', 'GR'].includes(watch('type')) && (
                <SectionBox borderColor="green.200">
                  <SectionHeader
                    icon={FaSeedling}
                    title={intl.formatMessage({ id: 'events.section.soil.nopCompliance' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    /* Subtype-aware: a grazing pass shows only the raw-manure interval —
                       no amendment approval, no composting record — so the generic
                       description promised two things that are not on screen. */
                    description={
                      watch('type') === 'GR'
                        ? intl.formatMessage({
                            id: 'events.soil.sections.nopComplianceGrazing',
                            defaultMessage:
                              'Documentation required for USDA organic certification. Livestock deposit raw manure, so record the pre-harvest interval and the date the animals came off this block.'
                          })
                        : intl.formatMessage({
                            id: 'events.soil.sections.nopCompliance',
                            defaultMessage:
                              'Documentation required for USDA organic certification. Track amendment approval status and, for composting, temperature/duration/turning records.'
                          })
                    }
                  />
                  {watch('type') !== 'GR' && (
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.soil.fields.amendmentOrganicApproved'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.soil.fields.amendmentOrganicBasisHelp'
                        })}>
                        <StandardSelect
                          placeholder={intl.formatMessage({
                            id: 'events.chemical.form.organicBasisPlaceholder'
                          })}
                          {...register('amendment_organic_approved')}>
                          {/* 🔴 2026-08-19. This list was the pre-2026-08-15 vocabulary that
                              ChemicalTab retired four days earlier and nobody carried across —
                              a half-fix that left the SOIL record, which is the § 205.203
                              evidence the packet leans on hardest, still offering the two
                              invented bases. "USDA NOP Approved" asserts a federal product
                              approval that does not exist (the NOP publishes a substance list
                              and licenses a seal; it approves no products), and "Organic
                              Equivalent" is a grower-graded self-assessment sitting in the
                              column an inspector reads as a verification basis. USDA's own
                              Input Material Application Record names four bases, verbatim:
                              OMRI or WSDA listing, the NOP seal on the label, or certifier
                              review and approval — and two of the four had no option here,
                              which is why growers reached for the invented ones. */}
                          <option value="omri_listed">
                            {intl.formatMessage({ id: 'events.organicApproved.omriListed' })}
                          </option>
                          <option value="wsda_listed">
                            {intl.formatMessage({ id: 'events.organicApproved.wsdaListed' })}
                          </option>
                          <option value="nop_seal_on_label">
                            {intl.formatMessage({ id: 'events.organicApproved.nopSeal' })}
                          </option>
                          <option value="certifier_approved">
                            {intl.formatMessage({ id: 'events.organicApproved.certifierApproved' })}
                          </option>
                          {/* Run 8 (R8-08): honest when the listing is unknown; never allowed. */}
                          <option value="unverified">
                            {intl.formatMessage({ id: 'events.organicApproved.unverified' })}
                          </option>
                          <option value="not_organic">
                            {intl.formatMessage({ id: 'events.organicApproved.notOrganicOption' })}
                          </option>
                          <option value="transitional">
                            {intl.formatMessage({
                              id: 'events.organicApproved.transitionalOption'
                            })}
                          </option>
                          {/* A <select> bound to a value with no matching <option> shows the
                              placeholder, and the next save writes ''. Retiring an option
                              would therefore have SILENTLY ERASED the § 205.203(b) basis on
                              every older record a grower reopened. Keep the stored answer
                              selectable, marked retired, until they replace it deliberately. */}
                          {retiredOrganicApprovedLabelKey(watchedAmendmentOrganicApproved) && (
                            <option value={watchedAmendmentOrganicApproved}>
                              {intl.formatMessage(
                                { id: 'events.organicApproved.retiredOption' },
                                {
                                  label: intl.formatMessage({
                                    id: retiredOrganicApprovedLabelKey(
                                      watchedAmendmentOrganicApproved
                                    )
                                  })
                                }
                              )}
                            </option>
                          )}
                        </StandardSelect>
                      </StandardField>
                      {/* An amendment saved with no basis prints in the packet as "organic
                          status not recorded" and leaves the parcel's transition undated
                          (overall review 2026-11). Warn, never block. Counted as an input the
                          way the backend counts it: a type or a product name is recorded. */}
                      {!watchedAmendmentOrganicApproved &&
                        Boolean(watchedAmendmentType || watch('amendment_product_name')) && (
                          <Box gridColumn="1 / -1">
                            <StandardAlert
                              status="warning"
                              mb={0}
                              description={intl.formatMessage({
                                id: 'events.soil.fields.amendmentOrganicBlankWarning'
                              })}
                            />
                          </Box>
                        )}
                      {/*
                        Nitrogen content drives TWO things that were both incomplete without
                        it: post-application field N2O (compost is usually the largest N
                        source on an organic orchard, and was counted as zero), and the CA
                        ILRP Irrigation & Nitrogen Management Plan, which reports total
                        nitrogen applied "from all sources" — compost included.
                      */}
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.soil.fields.amendmentNitrogenPercentage',
                          defaultMessage: 'Nitrogen Content (% N, as received)'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.soil.fields.amendmentNitrogenPercentageHelp',
                          defaultMessage:
                            'Use the "as is" column of the supplier analysis - the same wet basis as the tonnage above, NOT the dry-weight column (they differ by roughly 2x). Typical as-received: green-waste compost 0.5-1.2%, manure compost 0.6-1.8%.'
                        })}>
                        <StandardInput
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder={intl.formatMessage(
                            { id: 'events.soil.form.example' },
                            { value: '1.0' }
                          )}
                          {...register('amendment_nitrogen_percentage')}
                        />
                      </StandardField>
                    </SimpleGrid>
                  )}

                  {/* Compost-specific fields (CO only) — 7 CFR 205.203(c)(2) */}
                  {watch('type') === 'CO' && (
                    <>
                      <StandardAlert
                        status="info"
                        title={intl.formatMessage({
                          id: 'events.soil.form.title.compostProcessRequirements7Cfr205'
                        })}
                        description={intl.formatMessage({
                          id: 'events.soil.form.desc.initialCNMustBe25'
                        })}
                      />
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={4}>
                        <StandardField
                          label={intl.formatMessage({ id: 'events.soil.form.label.compostMethod' })}
                          helpText={intl.formatMessage({
                            id: 'events.soil.form.help.determinesRequiredDurationTurnings7Cfr'
                          })}>
                          <StandardSelect
                            placeholder={intl.formatMessage({
                              id: 'events.soil.placeholders.compostMethod'
                            })}
                            {...register('compost_method')}>
                            <option value="windrow">
                              {intl.formatMessage({ id: 'enums.compost_methods.windrow' })}
                            </option>
                            <option value="static_aerated">
                              {intl.formatMessage({ id: 'enums.compost_methods.static_aerated' })}
                            </option>
                            <option value="in_vessel">
                              {intl.formatMessage({ id: 'enums.compost_methods.in_vessel' })}
                            </option>
                          </StandardSelect>
                        </StandardField>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.soil.form.label.initialCNRatio'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.soil.form.help.carbonToNitrogenRatioAtStart'
                          })}>
                          <StandardInput
                            type="number"
                            min="0"
                            max="999"
                            step="0.1"
                            placeholder={intl.formatMessage(
                              { id: 'events.soil.form.example' },
                              { value: '30' }
                            )}
                            {...register('compost_initial_cn_ratio')}
                          />
                        </StandardField>
                      </SimpleGrid>
                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={4}>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.soil.form.label.peakTemperatureF'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.soil.form.help.highestTemperatureReached131170F'
                          })}>
                          <StandardInput
                            type="number"
                            min="0"
                            max="250"
                            step="1"
                            placeholder={intl.formatMessage(
                              { id: 'events.soil.form.example' },
                              { value: '158' }
                            )}
                            {...register('compost_peak_temp_f')}
                          />
                        </StandardField>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.soil.form.label.daysAtTemperature'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.soil.form.help.windrow15StaticInVessel3'
                          })}>
                          <StandardInput
                            type="number"
                            min="0"
                            max="365"
                            step="1"
                            placeholder={intl.formatMessage(
                              { id: 'events.soil.form.example' },
                              { value: '21' }
                            )}
                            {...register('compost_duration_days_at_temp')}
                          />
                        </StandardField>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.soil.form.label.numberOfTurnings'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.soil.form.help.windrowOnly5Turnings'
                          })}>
                          <StandardInput
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            placeholder={intl.formatMessage(
                              { id: 'events.soil.form.example' },
                              { value: '7' }
                            )}
                            {...register('compost_turning_count')}
                          />
                        </StandardField>
                      </SimpleGrid>
                      {/* F24: feedstock + temperature-monitoring readings complete the NOP 5021
                            record (a single peak temp is not a monitoring log). */}
                      {/* Labels were hardcoded English on a translated screen; moved to intl
                            2026-08-11 along with the two batch-identity fields below. */}
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.soil.fields.compostFeedstock',
                          defaultMessage: 'Feedstock'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.soil.fields.compostFeedstockHelp',
                          defaultMessage: 'What the compost is made of — NOP 5021 source record'
                        })}>
                        <StandardInput
                          placeholder={intl.formatMessage({
                            id: 'events.soil.form.placeholder.eGHorseManureStrawGreen'
                          })}
                          {...register('compost_feedstock')}
                        />
                      </StandardField>

                      {/* USDA's Compost Production Record heads each sheet with the batch
                            identity and how the temperature was taken. Without them a
                            § 205.203(c)(2) log is unattributable: two piles and one series, and
                            a reading with no depth or instrument cannot be reproduced. */}
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.soil.fields.compostUnitId',
                          defaultMessage: 'Pile / Windrow ID'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.soil.fields.compostUnitIdHelp',
                          defaultMessage: 'Which pile, windrow or vessel these readings belong to'
                        })}>
                        <StandardInput
                          placeholder={intl.formatMessage({
                            id: 'events.soil.form.placeholder.eGWindrow3'
                          })}
                          {...register('compost_unit_id')}
                        />
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.soil.fields.compostTempReadingMethod',
                          defaultMessage: 'Temperature Reading Location & Method'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.soil.fields.compostTempReadingMethodHelp',
                          defaultMessage:
                            'Where and how you take the reading — a surface reading and a core reading on the same pile disagree'
                        })}>
                        <StandardInput
                          placeholder={intl.formatMessage({
                            id: 'events.soil.form.placeholder.eGProbeAt36In'
                          })}
                          {...register('compost_temp_reading_method')}
                        />
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.soil.fields.compostTemperatureLog',
                          defaultMessage: 'Temperature Monitoring Log'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.soil.fields.compostTemperatureLogHelp',
                          defaultMessage: 'NOP 5021 readings — one per line (date · temp · turned?)'
                        })}>
                        <StandardTextarea
                          rows={4}
                          placeholder={
                            '2026-03-01: 145°F (turned)\n2026-03-05: 152°F\n2026-03-12: 148°F (turned)'
                          }
                          {...register('compost_temperature_log')}
                        />
                      </StandardField>
                    </>
                  )}

                  {/* Manure-specific fields — 7 CFR 205.203(c)(1). */}
                  {/* (c)(1) governs raw manure intervals; composted materials live under (c)(2). */}
                  {/* F35 fix (2026-06): show whenever manure is the amendment, not only
                        for OM. amendment_type="manure" is selectable under PA/CC/CO too, and
                        those farmers must still see the 90/120-day pre-harvest interval. */}
                  {/* 2026-07-31: GR (Grazing Management) added. Livestock turned into a crop
                        production area deposit RAW manure, so the same interval applies as for
                        a spreader pass. Oregon Tilth: "Livestock grazing ... follows the same
                        rules for raw manure. Animals must be removed either 90 or 120 days
                        prior to harvest." Found by logging sheep grazing in a CA organic walnut
                        orchard: the audit packet documented the grazing with NO interval at all,
                        which is the first thing an inspector asks about. For GR, the
                        "application date" is the date the animals came OFF the block. */}
                  {(watch('type') === 'OM' ||
                    watch('type') === 'GR' ||
                    watch('amendment_type') === 'manure') && (
                    <>
                      <StandardAlert
                        status="warning"
                        title={intl.formatMessage({
                          id: 'events.soil.form.title.rawManureHarvestInterval7Cfr'
                        })}
                        description={intl.formatMessage({
                          id: 'events.soil.form.desc.rawManure120DaysPreHarvest'
                        })}
                      />
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={4}>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.soil.form.label.manureHarvestInterval'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.soil.form.help.requiredWaitPeriodBeforeHarvest'
                          })}>
                          <StandardSelect
                            placeholder={intl.formatMessage({
                              id: 'events.soil.placeholders.manureHarvestInterval'
                            })}
                            {...register('manure_harvest_interval')}>
                            <option value="120">
                              {intl.formatMessage({ id: 'enums.manure_harvest_intervals.120' })}
                            </option>
                            <option value="90">
                              {intl.formatMessage({ id: 'enums.manure_harvest_intervals.90' })}
                            </option>
                            <option value="na">
                              {intl.formatMessage({ id: 'enums.manure_harvest_intervals.na' })}
                            </option>
                          </StandardSelect>
                        </StandardField>
                        <StandardField
                          label={
                            watch('type') === 'GR'
                              ? intl.formatMessage({
                                  id: 'events.soil.fields.animalsRemovedDate',
                                  defaultMessage: 'Date Animals Removed'
                                })
                              : intl.formatMessage({
                                  id: 'events.soil.fields.manureApplicationDate',
                                  defaultMessage: 'Manure Application Date'
                                })
                          }
                          helpText={
                            watch('type') === 'GR'
                              ? intl.formatMessage({
                                  id: 'events.soil.fields.animalsRemovedDateHelp',
                                  defaultMessage:
                                    'Last day livestock were on this block — the interval runs from here'
                                })
                              : intl.formatMessage({
                                  id: 'events.soil.fields.manureApplicationDateHelp',
                                  defaultMessage: 'Used to calculate earliest safe harvest date'
                                })
                          }>
                          <StandardInput type="date" {...register('manure_application_date')} />
                        </StandardField>

                        {/* USDA's crop documentation form records the estimated harvest date
                            beside the actual one. The actual date is the harvest event, which
                            already drives the § 205.203(c)(1) validator — this is the estimate,
                            so an inspector can see whether the plan was sound when the manure
                            went on rather than only how it turned out. */}
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.soil.fields.manureHarvestDatePlanned',
                            defaultMessage: 'Planned Harvest Date'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.soil.fields.manureHarvestDatePlannedHelp',
                            defaultMessage:
                              'The harvest date you expect when applying this manure. Recorded alongside the actual harvest so the 90/120-day interval can be checked against your plan.'
                          })}>
                          <StandardInput type="date" {...register('manure_harvest_date_planned')} />
                        </StandardField>
                      </SimpleGrid>

                      {manureIntervalShortfall && (
                        <StandardAlert status="warning" mt={3}>
                          <Text fontSize="sm">
                            {manureIntervalShortfall.reversed
                              ? intl.formatMessage(
                                  { id: 'events.soil.manureDatesReversed' },
                                  { gap: manureIntervalShortfall.gap }
                                )
                              : intl.formatMessage(
                                  { id: 'events.soil.manureIntervalShortfall' },
                                  {
                                    gap: manureIntervalShortfall.gap,
                                    required: manureIntervalShortfall.required,
                                    short: manureIntervalShortfall.short
                                  }
                                )}
                          </Text>
                        </StandardAlert>
                      )}

                      {/* USDA Manure Application / Food Crop Harvest Interval Record asks two
                            columns Trazo had no home for: "How Applied / Incorporated"
                            ("Manure spreader disk in") and "Manure Type, Form and Source"
                            ("Chicken, dry, on farm"). USDA writes the second as one free-text
                            column; three enums store the same thing and stay queryable.

                            The animal is asked for GR too — knowing it was sheep vs cattle is
                            real information. Method, form and origin are OM-only: grazed manure
                            is not "applied", has no chosen form, and is on-farm by definition,
                            so all three would be questions with one possible answer. */}
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={4}>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.soil.fields.manureAnimalSource'
                          })}>
                          <StandardSelect
                            placeholder={intl.formatMessage({ id: 'app.select' })}
                            {...register('manure_animal_source')}>
                            {MANURE_ANIMAL_SOURCES.map((o) => (
                              <option key={o.value} value={o.value}>
                                {intl.formatMessage({ id: o.labelKey })}
                              </option>
                            ))}
                          </StandardSelect>
                        </StandardField>

                        {watch('type') !== 'GR' && (
                          <StandardField
                            label={intl.formatMessage({ id: 'events.soil.fields.manureForm' })}>
                            <StandardSelect
                              placeholder={intl.formatMessage({ id: 'app.select' })}
                              {...register('manure_form')}>
                              {MANURE_FORMS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {intl.formatMessage({ id: o.labelKey })}
                                </option>
                              ))}
                            </StandardSelect>
                          </StandardField>
                        )}
                      </SimpleGrid>

                      {watch('type') !== 'GR' && (
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={4}>
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.soil.fields.manureApplicationMethod'
                            })}>
                            <StandardSelect
                              placeholder={intl.formatMessage({ id: 'app.select' })}
                              {...register('manure_application_method')}>
                              {MANURE_APPLICATION_METHODS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {intl.formatMessage({ id: o.labelKey })}
                                </option>
                              ))}
                            </StandardSelect>
                          </StandardField>

                          <StandardField
                            label={intl.formatMessage({ id: 'events.soil.fields.manureOrigin' })}>
                            <StandardSelect
                              placeholder={intl.formatMessage({ id: 'app.select' })}
                              {...register('manure_origin')}>
                              {MANURE_ORIGINS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {intl.formatMessage({ id: o.labelKey })}
                                </option>
                              ))}
                            </StandardSelect>
                          </StandardField>
                        </SimpleGrid>
                      )}

                      {/* NOP 5006 — processed animal manure. A third class between raw
                            (c)(1) and composted (c)(2): manure processed to reduce pathogens
                            is interval-exempt when documented (temperature and/or attestation).
                            NOT offered for GR: manure deposited by a grazing animal is raw by
                            definition, and both exemptions describe a treatment applied to
                            collected manure. Offering "composted"/"processed" on a grazing
                            record would let a grower mark an interval-exempt status the
                            practice cannot support. */}
                      {watch('type') !== 'GR' && (
                        <>
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.soil.form.label.manureTreatmentNop5006'
                            })}
                            helpText={intl.formatMessage({
                              id: 'events.soil.form.help.rawManureFollowsThe90120'
                            })}
                            mt={4}>
                            <StandardSelect
                              placeholder={intl.formatMessage({
                                id: 'events.soil.placeholders.manureTreatment'
                              })}
                              {...register('manure_treatment')}>
                              <option value="raw">
                                {intl.formatMessage({ id: 'enums.manure_treatments.raw' })}
                              </option>
                              <option value="composted">
                                {intl.formatMessage({ id: 'enums.manure_treatments.composted' })}
                              </option>
                              <option value="processed_5006">
                                {intl.formatMessage({
                                  id: 'enums.manure_treatments.processed_5006'
                                })}
                              </option>
                            </StandardSelect>
                          </StandardField>
                          {watch('manure_treatment') === 'processed_5006' && (
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={4}>
                              <StandardField
                                label={intl.formatMessage({
                                  id: 'events.soil.form.label.processingTemperatureF'
                                })}
                                helpText={intl.formatMessage({
                                  id: 'events.soil.form.help.peakTemperatureReachedForPathogenReduction'
                                })}>
                                <StandardInput
                                  type="number"
                                  step="0.1"
                                  placeholder={intl.formatMessage(
                                    { id: 'events.soil.form.example' },
                                    { value: '150' }
                                  )}
                                  {...register('processed_manure_temp_f')}
                                />
                              </StandardField>
                              <StandardField
                                label={intl.formatMessage({
                                  id: 'events.soil.form.label.processingAttestation'
                                })}
                                helpText={intl.formatMessage({
                                  id: 'events.soil.form.help.omriSupplierDocumentationBasisForThe'
                                })}>
                                <StandardInput
                                  placeholder={intl.formatMessage({
                                    id: 'events.soil.form.placeholder.eGOmriListedHeatProcessed'
                                  })}
                                  {...register('processed_manure_attestation')}
                                />
                              </StandardField>
                            </SimpleGrid>
                          )}
                        </>
                      )}
                    </>
                  )}
                </SectionBox>
              )}

              {/* Soil Properties (pH / OM / texture) are field MEASUREMENTS — only meaningful for
                    soil-working subtypes. Hide for grazing (GR), habitat (HD/NS) and tillage (TI):
                    a sheep rotation, hedgerow, owl box, or a tillage pass doesn't measure soil pH,
                    and showing these empty fields invited fabricated readings. PA/OM/CC/CO keep them
                    (the soil pH / OM reading is the context that justifies the amendment). */}
              {watch('type') && !['GR', 'HD', 'NS', 'TI'].includes(watch('type')) && (
                <SectionBox>
                  <SectionHeader
                    icon={FaThermometerHalf}
                    title={intl.formatMessage({ id: 'events.section.soil.properties' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                  />{' '}
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    {/* With several parcels these are refused (one reading copied onto every
                        parcel), and the shared body drops them, so they are not offered. */}
                    {!multiTarget && (
                      <>
                        <StandardField
                          label={intl.formatMessage({ id: 'app.soilPH' }) || 'Soil pH'}
                          helpText={intl.formatMessage({
                            id: 'events.soil.form.help.phAffectsNutrientAvailability'
                          })}>
                          <StandardInput
                            type="number"
                            min="0"
                            max="14"
                            step="0.1"
                            placeholder="6.5"
                            {...register('soil_ph')}
                          />
                        </StandardField>

                        <StandardField
                          label={
                            intl.formatMessage({ id: 'app.organicMatterPercentage' }) ||
                            'Organic Matter (%)'
                          }
                          helpText={intl.formatMessage({
                            id: 'events.soil.form.help.higherOrganicMatterImprovesSoilCarbon'
                          })}>
                          <StandardInput
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="3.5"
                            {...register('organic_matter_percentage')}
                          />
                        </StandardField>
                      </>
                    )}

                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.soilTexture' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.soilTypeAffectsCarbonRetention'
                      })}>
                      <StandardSelect
                        placeholder={intl.formatMessage({ id: 'app.selectSoilTexture' })}
                        {...register('soil_texture')}>
                        <option value="clay">{intl.formatMessage({ id: 'app.clay' })}</option>
                        <option value="clay_loam">
                          {intl.formatMessage({ id: 'app.clayLoam' })}
                        </option>
                        <option value="loam">{intl.formatMessage({ id: 'app.loam' })}</option>
                        <option value="sandy_loam">
                          {intl.formatMessage({ id: 'app.sandyLoam' })}
                        </option>
                        <option value="sand">{intl.formatMessage({ id: 'app.sand' })}</option>
                        <option value="silt">{intl.formatMessage({ id: 'app.silt' })}</option>
                        <option value="silt_loam">
                          {intl.formatMessage({ id: 'app.siltLoam' })}
                        </option>
                      </StandardSelect>
                    </StandardField>
                  </SimpleGrid>
                </SectionBox>
              )}

              {/* F19: Soil Test Results (ST only) — the lab numbers (N/P/K/CEC) + lab provenance
                    that make a soil test a complete certifier/agronomic record. Packed into the
                    test_results JSONField on submit; pH/OM/texture stay as their own columns above.
                    §E-2: the same block serves Lab Analysis (LA) — an identical record for a leaf,
                    petiole, hull, compost or water sample, plus the micronutrient results that
                    7 CFR 205.601(j)(7) requires before a micronutrient may be applied. */}
              {(watch('type') === 'ST' || watch('type') === 'LA') && (
                <SectionBox>
                  <SectionHeader
                    icon={FaThermometerHalf}
                    title={intl.formatMessage({
                      id:
                        watch('type') === 'LA'
                          ? 'events.section.soil.labResults'
                          : 'events.section.soil.testResults'
                    })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    description={
                      watch('type') === 'LA'
                        ? 'A dated lab report is the deficiency record a certifier looks for before any micronutrient application (7 CFR 205.601(j)(7)). Attach a photo of the report as well.'
                        : undefined
                    }
                  />
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    {watch('type') === 'LA' && (
                      <StandardField
                        label={intl.formatMessage({ id: 'events.soil.form.label.sampleType' })}
                        helpText={intl.formatMessage({
                          id: 'events.soil.form.help.whatWasSentToTheLab'
                        })}
                        required
                        error={errors.sample_matrix?.message}>
                        <StandardSelect
                          placeholder={intl.formatMessage({
                            id: 'events.soil.placeholders.sampleMatrix'
                          })}
                          {...register('sample_matrix')}>
                          <option value="soil">
                            {intl.formatMessage({ id: 'events.soil.options.sampleMatrix.soil' })}
                          </option>
                          <option value="leaf">
                            {intl.formatMessage({ id: 'events.soil.options.sampleMatrix.leaf' })}
                          </option>
                          <option value="petiole">
                            {intl.formatMessage({ id: 'events.soil.options.sampleMatrix.petiole' })}
                          </option>
                          <option value="hull">
                            {intl.formatMessage({ id: 'events.soil.options.sampleMatrix.hull' })}
                          </option>
                          <option value="compost">
                            {intl.formatMessage({ id: 'events.soil.options.sampleMatrix.compost' })}
                          </option>
                          <option value="water">
                            {intl.formatMessage({ id: 'events.soil.options.sampleMatrix.water' })}
                          </option>
                        </StandardSelect>
                      </StandardField>
                    )}
                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.labName' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.testingLaboratory'
                      })}>
                      <StandardInput
                        placeholder={intl.formatMessage(
                          { id: 'events.soil.form.example' },
                          { value: 'A&L Western Labs' }
                        )}
                        {...register('lab_name')}
                      />
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.sampleReportId' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.labSampleOrReport'
                      })}>
                      <StandardInput
                        placeholder={intl.formatMessage(
                          { id: 'events.soil.form.example' },
                          { value: '25-04812' }
                        )}
                        {...register('lab_sample_id')}
                      />
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.reportDate' })}>
                      <StandardInput type="date" {...register('lab_report_date')} />
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.nitrogenPpm' })}
                      helpText={intl.formatMessage({ id: 'events.soil.form.help.availableN' })}>
                      <StandardInput
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder={intl.formatMessage(
                          { id: 'events.soil.form.example' },
                          { value: '18' }
                        )}
                        {...register('lab_nitrogen')}
                      />
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.phosphorusPpm' })}>
                      <StandardInput
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder={intl.formatMessage(
                          { id: 'events.soil.form.example' },
                          { value: '32' }
                        )}
                        {...register('lab_phosphorus')}
                      />
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.potassiumPpm' })}>
                      <StandardInput
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder={intl.formatMessage(
                          { id: 'events.soil.form.example' },
                          { value: '210' }
                        )}
                        {...register('lab_potassium')}
                      />
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.cecMeq100g' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.cationExchangeCapacity'
                      })}>
                      <StandardInput
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder={intl.formatMessage(
                          { id: 'events.soil.form.example' },
                          { value: '14.5' }
                        )}
                        {...register('lab_cec')}
                      />
                    </StandardField>
                  </SimpleGrid>

                  {/* §E-2 micronutrient results. This is the half that makes a micronutrient
                        application defensible: § 205.601(j)(7) permits synthetic micronutrients
                        only where a deficiency is documented, so record the numbers the report
                        actually shows and leave the rest blank. */}
                  <Box mt={5}>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={1}>
                      {intl.formatMessage({ id: 'events.soil.form.text.micronutrientResultsPpm' })}
                    </Text>
                    <Text fontSize="xs" color="gray.500" mb={3}>
                      {intl.formatMessage({ id: 'events.soil.form.text.fillInOnlyWhatTheReport' })}
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({ id: 'events.soil.form.label.zincZn' })}>
                        <StandardInput
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={intl.formatMessage(
                            { id: 'events.soil.form.example' },
                            { value: '0.8' }
                          )}
                          {...register('lab_zinc_ppm')}
                        />
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({ id: 'events.soil.form.label.boronB' })}>
                        <StandardInput
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={intl.formatMessage(
                            { id: 'events.soil.form.example' },
                            { value: '0.4' }
                          )}
                          {...register('lab_boron_ppm')}
                        />
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({ id: 'events.soil.form.label.manganeseMn' })}>
                        <StandardInput
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={intl.formatMessage(
                            { id: 'events.soil.form.example' },
                            { value: '6.5' }
                          )}
                          {...register('lab_manganese_ppm')}
                        />
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({ id: 'events.soil.form.label.ironFe' })}>
                        <StandardInput
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={intl.formatMessage(
                            { id: 'events.soil.form.example' },
                            { value: '12' }
                          )}
                          {...register('lab_iron_ppm')}
                        />
                      </StandardField>
                    </SimpleGrid>
                  </Box>
                </SectionBox>
              )}

              {/* Tillage-Specific Fields - Only for Tillage Operations */}
              {watch('type') === 'TI' && (
                <SectionBox>
                  <SectionHeader
                    icon={FaSeedling}
                    title={intl.formatMessage({ id: 'events.section.soil.tillage' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    description={intl.formatMessage({
                      id: 'events.soil.form.desc.provideSpecificTillageDetailsForAccurate'
                    })}
                  />{' '}
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.tillageType' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.primaryTillageOperationPerformed'
                      })}>
                      <StandardSelect
                        placeholder={intl.formatMessage({ id: 'app.selectTillageType' })}
                        {...register('tillage_type')}>
                        <option value="conventional_plow">
                          {intl.formatMessage({
                            id: 'events.soil.options.tillageType.conventionalPlow'
                          })}
                        </option>
                        <option value="chisel_plow">
                          {intl.formatMessage({ id: 'events.soil.options.tillageType.chiselPlow' })}
                        </option>
                        <option value="disk_harrow">
                          {intl.formatMessage({ id: 'events.soil.options.tillageType.diskHarrow' })}
                        </option>
                        <option value="no_till">
                          {intl.formatMessage({ id: 'events.soil.options.tillageType.noTill' })}
                        </option>
                        <option value="strip_till">
                          {intl.formatMessage({ id: 'events.soil.options.tillageType.stripTill' })}
                        </option>
                        <option value="minimum_till">
                          {intl.formatMessage({
                            id: 'events.soil.options.tillageType.minimumTill'
                          })}
                        </option>
                        <option value="subsoiling">
                          {intl.formatMessage({ id: 'events.soil.options.tillageType.subsoiling' })}
                        </option>
                        <option value="cultivator">
                          {intl.formatMessage({ id: 'events.soil.options.tillageType.cultivator' })}
                        </option>
                      </StandardSelect>
                    </StandardField>

                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.tillageIntensity' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.intensityAffectsCarbonEmissions'
                      })}>
                      <StandardSelect
                        placeholder={intl.formatMessage({ id: 'app.selectIntensity' })}
                        {...register('tillage_intensity')}>
                        <option value="high">
                          {intl.formatMessage({ id: 'events.soil.options.tillageIntensity.high' })}
                        </option>
                        <option value="medium">
                          {intl.formatMessage({
                            id: 'events.soil.options.tillageIntensity.medium'
                          })}
                        </option>
                        <option value="low">
                          {intl.formatMessage({ id: 'events.soil.options.tillageIntensity.low' })}
                        </option>
                        <option value="conservation">
                          {intl.formatMessage({
                            id: 'events.soil.options.tillageIntensity.conservation'
                          })}
                        </option>
                      </StandardSelect>
                    </StandardField>

                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.tillageDirection' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.directionAffectsSoilErosionAndCarbon'
                      })}>
                      <StandardSelect
                        placeholder={intl.formatMessage({ id: 'app.selectDirection' })}
                        {...register('tillage_direction')}>
                        <option value="across_slope">
                          {intl.formatMessage({
                            id: 'events.soil.options.tillageDirection.acrossSlope'
                          })}
                        </option>
                        <option value="up_down_slope">
                          {intl.formatMessage({
                            id: 'events.soil.options.tillageDirection.upDownSlope'
                          })}
                        </option>
                        <option value="contour">
                          {intl.formatMessage({
                            id: 'events.soil.options.tillageDirection.contour'
                          })}
                        </option>
                        <option value="random">
                          {intl.formatMessage({
                            id: 'events.soil.options.tillageDirection.random'
                          })}
                        </option>
                      </StandardSelect>
                    </StandardField>

                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.residueManagement' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.cropResidueHandlingAffectsCarbonSequestration'
                      })}>
                      <StandardSelect
                        placeholder={intl.formatMessage({ id: 'app.selectResidueManagement' })}
                        {...register('residue_management')}>
                        <option value="incorporated">
                          {intl.formatMessage({
                            id: 'events.soil.options.residueManagement.incorporated'
                          })}
                        </option>
                        <option value="surface_left">
                          {intl.formatMessage({
                            id: 'events.soil.options.residueManagement.surfaceLeft'
                          })}
                        </option>
                        <option value="removed">
                          {intl.formatMessage({
                            id: 'events.soil.options.residueManagement.removed'
                          })}
                        </option>
                        <option value="mulched">
                          {intl.formatMessage({
                            id: 'events.soil.options.residueManagement.mulched'
                          })}
                        </option>
                        <option value="partial_removal">
                          {intl.formatMessage({
                            id: 'events.soil.options.residueManagement.partialRemoval'
                          })}
                        </option>
                      </StandardSelect>
                    </StandardField>
                  </SimpleGrid>
                  <Box mt={3}>
                    <StandardAlert
                      status="success"
                      title={intl.formatMessage({ id: 'events.soil.form.title.carbonImpactTip' })}
                      description={intl.formatMessage({
                        id: 'events.soil.form.desc.noTillAndConservationTillagePractices'
                      })}
                    />
                  </Box>
                </SectionBox>
              )}

              {/* Grazing Management Fields - Only for Grazing Management Operations */}
              {watch('type') === 'GR' && (
                <SectionBox borderColor="green.200">
                  <SectionHeader
                    icon={FaSeedling}
                    title={intl.formatMessage({ id: 'events.section.soil.grazing' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    description={intl.formatMessage({
                      id: 'events.soil.form.desc.documentGrazingActivitiesForCoverCrop'
                    })}
                  />

                  {/* Grazing Summary Mode (GTM-v3) — log a whole rotation as one event,
                        mirroring pest scouting summary mode. Blue scheme matches other tabs. */}
                  {(() => {
                    const isGrazingSummary = watch('is_summary') === 'true';
                    return (
                      <>
                        <Box
                          p={4}
                          mb={4}
                          bg={isGrazingSummary ? 'white' : 'gray.50'}
                          borderRadius="md"
                          border="1px solid"
                          borderColor={isGrazingSummary ? 'gray.300' : 'gray.200'}>
                          <HStack justify="space-between" align="center">
                            <VStack align="start" spacing={0}>
                              <HStack>
                                <Text fontWeight="semibold" fontSize="sm">
                                  {intl.formatMessage({ id: 'events.section.soil.grazingSummary' })}
                                </Text>
                              </HStack>
                              <Text fontSize="xs" color="gray.600">
                                {intl.formatMessage({
                                  id: isGrazingSummary
                                    ? 'events.section.soil.grazingSummaryOn'
                                    : 'events.section.soil.grazingSummaryOff'
                                })}
                              </Text>
                            </VStack>
                            <Controller
                              name="is_summary"
                              control={methods.control}
                              render={({ field }) => (
                                <Switch
                                  size="lg"
                                  isChecked={field.value === 'true'}
                                  onChange={(e) =>
                                    field.onChange(e.target.checked ? 'true' : 'false')
                                  }
                                />
                              )}
                            />
                          </HStack>
                        </Box>

                        {isGrazingSummary && (
                          <SectionBox>
                            <Text fontWeight="semibold" color="green.700" mb={3}>
                              <Icon as={FaSeedling} mr={2} />
                              {intl.formatMessage({
                                id: 'events.soil.form.text.grazingRotationPeriod'
                              })}
                            </Text>
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                              <StandardField
                                label={intl.formatMessage({
                                  id: 'events.soil.form.label.periodStartDate'
                                })}
                                helpText={intl.formatMessage({
                                  id: 'events.soil.form.help.whenDidThisRotationBegin'
                                })}>
                                <StandardInput type="date" {...register('date_start')} />
                              </StandardField>
                              <StandardField
                                label={intl.formatMessage({
                                  id: 'events.soil.form.label.periodEndDate'
                                })}
                                helpText={intl.formatMessage({
                                  id: 'events.soil.form.help.whenDidThisRotationEnd'
                                })}>
                                <StandardInput type="date" {...register('date_end')} />
                              </StandardField>
                              <StandardField
                                label={intl.formatMessage({
                                  id: 'events.soil.form.label.numberOfGrazingPasses'
                                })}
                                helpText={intl.formatMessage({
                                  id: 'events.soil.form.help.howManyGrazingPassesPaddocksIn'
                                })}>
                                <StandardInput
                                  type="number"
                                  min="1"
                                  placeholder={intl.formatMessage(
                                    { id: 'events.soil.form.example' },
                                    { value: '4' }
                                  )}
                                  {...register('event_count')}
                                />
                              </StandardField>
                              <StandardField
                                label={intl.formatMessage({
                                  id: 'events.soil.form.label.totalGrazingDays'
                                })}
                                helpText={intl.formatMessage({
                                  id: 'events.soil.form.help.combinedGrazingDaysAcrossAllPasses'
                                })}>
                                <StandardInput
                                  type="number"
                                  min="1"
                                  placeholder={intl.formatMessage(
                                    { id: 'events.soil.form.example' },
                                    { value: '12' }
                                  )}
                                  {...register('total_grazing_days')}
                                />
                              </StandardField>
                              <StandardField
                                label={intl.formatMessage({
                                  id: 'events.soil.form.label.totalAreaGrazed'
                                })}
                                helpText={intl.formatMessage({
                                  id: 'events.soil.form.help.combinedAreaGrazedAcrossAllPasses'
                                })}>
                                <StandardInput
                                  type="number"
                                  placeholder={intl.formatMessage(
                                    { id: 'events.soil.form.example' },
                                    { value: '20' }
                                  )}
                                  {...register('area_covered_total')}
                                />
                              </StandardField>
                            </SimpleGrid>
                          </SectionBox>
                        )}
                      </>
                    );
                  })()}

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.animalType' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.typeOfAnimalUsedForGrazing'
                      })}>
                      <StandardSelect
                        placeholder={intl.formatMessage({
                          id: 'events.soil.placeholders.animalType'
                        })}
                        {...register('animal_type')}>
                        <option value="sheep">
                          {intl.formatMessage({
                            id: 'app.soilManagement.grazing.animalType.sheep'
                          })}
                        </option>
                        <option value="goats">
                          {intl.formatMessage({
                            id: 'app.soilManagement.grazing.animalType.goats'
                          })}
                        </option>
                        <option value="cattle">
                          {intl.formatMessage({
                            id: 'app.soilManagement.grazing.animalType.cattle'
                          })}
                        </option>
                        <option value="poultry">
                          {intl.formatMessage({
                            id: 'app.soilManagement.grazing.animalType.poultry'
                          })}
                        </option>
                        <option value="other">
                          {intl.formatMessage({
                            id: 'app.soilManagement.grazing.animalType.other'
                          })}
                        </option>
                      </StandardSelect>
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.numberOfAnimals' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.howManyAnimalsWereUsed'
                      })}>
                      <StandardInput
                        type="number"
                        placeholder={intl.formatMessage(
                          { id: 'events.soil.form.example' },
                          { value: '50' }
                        )}
                        {...register('animal_count')}
                      />
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.soil.form.label.grazingDurationDays'
                      })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.howManyDaysAnimalsGrazed'
                      })}>
                      <StandardInput
                        type="number"
                        placeholder={intl.formatMessage(
                          { id: 'events.soil.form.example' },
                          { value: '14' }
                        )}
                        {...register('grazing_duration_days')}
                      />
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.grazingPurpose' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.primaryPurposeOfTheGrazingActivity'
                      })}>
                      <StandardSelect
                        placeholder={intl.formatMessage({
                          id: 'events.soil.placeholders.grazingPurpose'
                        })}
                        {...register('grazing_purpose')}>
                        <option value="weed_control">
                          {intl.formatMessage({
                            id: 'app.soilManagement.grazing.purpose.weedControl'
                          })}
                        </option>
                        <option value="cover_crop">
                          {intl.formatMessage({
                            id: 'app.soilManagement.grazing.purpose.coverCrop'
                          })}
                        </option>
                        <option value="soil_health">
                          {intl.formatMessage({
                            id: 'app.soilManagement.grazing.purpose.soilHealth'
                          })}
                        </option>
                        <option value="vegetation_management">
                          {intl.formatMessage({
                            id: 'app.soilManagement.grazing.purpose.vegetationManagement'
                          })}
                        </option>
                      </StandardSelect>
                    </StandardField>
                  </SimpleGrid>
                </SectionBox>
              )}

              {/* Habitat Development (HD) — biodiversity infrastructure. Facts only, no score.
                    The living-floor / bugs / birds proof rides on the event photos. */}
              {watch('type') === 'HD' && (
                <SectionBox borderColor="green.200">
                  <SectionHeader
                    icon={FaSeedling}
                    title={intl.formatMessage({ id: 'events.section.soil.habitat' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    description={intl.formatMessage({
                      id: 'events.soil.form.desc.documentPlantedEstablishedHabitatHedgerowsInsectary'
                    })}
                  />
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.habitatType' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.whatHabitatWasEstablished'
                      })}>
                      <StandardSelect
                        placeholder={intl.formatMessage({
                          id: 'events.soil.placeholders.habitatType'
                        })}
                        {...register('habitat_type')}>
                        <option value="hedgerow">
                          {intl.formatMessage({ id: 'events.soil.options.habitatType.hedgerow' })}
                        </option>
                        <option value="insectary_strip">
                          {intl.formatMessage({
                            id: 'events.soil.options.habitatType.insectaryStrip'
                          })}
                        </option>
                        <option value="native_planting">
                          {intl.formatMessage({
                            id: 'events.soil.options.habitatType.nativePlanting'
                          })}
                        </option>
                        <option value="pollinator_habitat">
                          {intl.formatMessage({
                            id: 'events.soil.options.habitatType.pollinatorHabitat'
                          })}
                        </option>
                        <option value="field_border">
                          {intl.formatMessage({
                            id: 'events.soil.options.habitatType.fieldBorder'
                          })}
                        </option>
                        <option value="riparian_buffer">
                          {intl.formatMessage({
                            id: 'events.soil.options.habitatType.riparianBuffer'
                          })}
                        </option>
                        <option value="living_groundcover_habitat">
                          {intl.formatMessage({
                            id: 'events.soil.options.habitatType.livingGroundcoverHabitat'
                          })}
                        </option>
                        <option value="wildlife_corridor">
                          {intl.formatMessage({
                            id: 'events.soil.options.habitatType.wildlifeCorridor'
                          })}
                        </option>
                      </StandardSelect>
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.speciesPlanted' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.keySpeciesFreeTextOptional'
                      })}>
                      <StandardInput
                        placeholder={intl.formatMessage({
                          id: 'events.soil.form.placeholder.eGNativeCoyoteBrushCeanothus'
                        })}
                        {...register('species_planted')}
                      />
                    </StandardField>
                  </SimpleGrid>
                  <StandardField
                    label={intl.formatMessage({ id: 'events.soil.form.label.establishedOptional' })}
                    helpText={intl.formatMessage({
                      id: 'events.soil.form.help.whenTheHabitatWasFirstPlanted'
                    })}>
                    <StandardInput type="date" {...register('habitat_install_date')} />
                  </StandardField>
                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.soil.form.label.wildlifeObservedOptional'
                    })}
                    helpText={intl.formatMessage({
                      id: 'events.soil.form.help.noteAnyBeneficialInsectsBirdsOr'
                    })}>
                    <StandardTextarea
                      placeholder={intl.formatMessage({
                        id: 'events.soil.form.placeholder.eGAbundantLadyBeetlesAnd'
                      })}
                      {...register('wildlife_observed')}
                    />
                  </StandardField>
                </SectionBox>
              )}

              {/* Nesting / Shelter Structures (NS) — installed wildlife structures. Facts only. */}
              {watch('type') === 'NS' && (
                <SectionBox borderColor="green.200">
                  <SectionHeader
                    icon={FaSeedling}
                    title={intl.formatMessage({ id: 'events.section.soil.nesting' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    description={intl.formatMessage({
                      id: 'events.soil.form.desc.documentInstalledWildlifeStructuresBarnOwl'
                    })}
                  />
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <StandardField
                      label={intl.formatMessage({ id: 'events.soil.form.label.structureType' })}
                      helpText={intl.formatMessage({
                        id: 'events.soil.form.help.whatWasInstalled'
                      })}>
                      <StandardSelect
                        placeholder={intl.formatMessage({
                          id: 'events.soil.placeholders.structureType'
                        })}
                        {...register('habitat_type')}>
                        <option value="barn_owl_box">
                          {intl.formatMessage({ id: 'events.soil.options.habitatType.barnOwlBox' })}
                        </option>
                        <option value="raptor_perch">
                          {intl.formatMessage({
                            id: 'events.soil.options.habitatType.raptorPerch'
                          })}
                        </option>
                        <option value="songbird_box">
                          {intl.formatMessage({
                            id: 'events.soil.options.habitatType.songbirdBox'
                          })}
                        </option>
                        <option value="native_bee_block">
                          {intl.formatMessage({
                            id: 'events.soil.options.habitatType.nativeBeeBlock'
                          })}
                        </option>
                        <option value="bat_box">
                          {intl.formatMessage({ id: 'events.soil.options.habitatType.batBox' })}
                        </option>
                        <option value="insect_hotel">
                          {intl.formatMessage({
                            id: 'events.soil.options.habitatType.insectHotel'
                          })}
                        </option>
                        <option value="beetle_bank">
                          {intl.formatMessage({ id: 'events.soil.options.habitatType.beetleBank' })}
                        </option>
                        <option value="brush_pile_hibernacula">
                          {intl.formatMessage({
                            id: 'events.soil.options.habitatType.brushPileHibernacula'
                          })}
                        </option>
                      </StandardSelect>
                    </StandardField>
                    {!multiTarget && (
                      <StandardField
                        label={intl.formatMessage({ id: 'events.soil.form.label.numberInstalled' })}
                        helpText={intl.formatMessage({
                          id: 'events.soil.form.help.howManyStructures'
                        })}>
                        <StandardInput
                          type="number"
                          min="1"
                          placeholder={intl.formatMessage(
                            { id: 'events.soil.form.example' },
                            { value: '6' }
                          )}
                          {...register('habitat_structure_count')}
                        />
                      </StandardField>
                    )}
                  </SimpleGrid>
                  <StandardField
                    label={intl.formatMessage({ id: 'events.soil.form.label.installedOptional' })}
                    helpText={intl.formatMessage({
                      id: 'events.soil.form.help.whenTheStructuresWereInstalled'
                    })}>
                    <StandardInput type="date" {...register('habitat_install_date')} />
                  </StandardField>
                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.soil.form.label.placementOccupancyNotesOptional'
                    })}
                    helpText={intl.formatMessage({
                      id: 'events.soil.form.help.mountingOrientationOrWhetherOccupied'
                    })}>
                    <StandardInput
                      placeholder={intl.formatMessage({
                        id: 'events.soil.form.placeholder.eG12FtPolesOn'
                      })}
                      {...register('structure_notes')}
                    />
                  </StandardField>
                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.soil.form.label.wildlifeObservedOptional'
                    })}
                    helpText={intl.formatMessage({
                      id: 'events.soil.form.help.noteAnyWildlifeUsingTheStructures'
                    })}>
                    <StandardTextarea
                      placeholder={intl.formatMessage({
                        id: 'events.soil.form.placeholder.eGBarnOwlsNestingReduced'
                      })}
                      {...register('wildlife_observed')}
                    />
                  </StandardField>
                </SectionBox>
              )}

              {/* Sprint 3 Epic 3.1: Removed "Environmental Conditions & Equipment" section - merged into "Fuel & Equipment Operations" above */}

              {/* Phase 2: Universal Field Details - variety, block_id, growth_stage */}
              <SectionBox>
                <SectionHeader
                  icon={FaSeedling}
                  title={intl.formatMessage({ id: 'fieldDetails.title' })}
                  badge={intl.formatMessage({ id: 'fieldDetails.badge' })}
                  description={intl.formatMessage({ id: 'fieldDetails.description' })}
                />
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <StandardField
                    label={intl.formatMessage({ id: 'fieldDetails.variety' })}
                    helpText={intl.formatMessage({ id: 'fieldDetails.varietyHelp' })}>
                    <Controller
                      name="variety"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput
                          {...field}
                          placeholder={intl.formatMessage({
                            id: 'fieldDetails.varietyPlaceholder'
                          })}
                        />
                      )}
                    />
                  </StandardField>

                  {!multiTarget && <BlockIdField control={methods.control} />}

                  <StandardField
                    label={intl.formatMessage({ id: 'fieldDetails.growthStage' })}
                    helpText={intl.formatMessage({ id: 'fieldDetails.growthStageHelp' })}>
                    <Controller
                      name="growth_stage"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardSelect
                          {...field}
                          placeholder={intl.formatMessage({
                            id: 'events.chemical.form.growthStagePlaceholder'
                          })}>
                          <option value="dormant">
                            {intl.formatMessage({ id: 'fieldDetails.growthStage.dormant' })}
                          </option>
                          <option value="budbreak">
                            {intl.formatMessage({ id: 'fieldDetails.growthStage.budbreak' })}
                          </option>
                          <option value="bloom">
                            {intl.formatMessage({ id: 'fieldDetails.growthStage.bloom' })}
                          </option>
                          <option value="fruit_set">
                            {intl.formatMessage({ id: 'fieldDetails.growthStage.fruit_set' })}
                          </option>
                          <option value="vegetative">
                            {intl.formatMessage({ id: 'fieldDetails.growthStage.vegetative' })}
                          </option>
                          <option value="maturation">
                            {intl.formatMessage({ id: 'fieldDetails.growthStage.maturation' })}
                          </option>
                          <option value="harvest_ready">
                            {intl.formatMessage({ id: 'fieldDetails.growthStage.harvest_ready' })}
                          </option>
                          <option value="post_harvest">
                            {intl.formatMessage({ id: 'fieldDetails.growthStage.post_harvest' })}
                          </option>
                        </StandardSelect>
                      )}
                    />
                  </StandardField>
                </SimpleGrid>
              </SectionBox>

              <SectionBox>
                <SectionHeader
                  icon={FaSeedling}
                  title={intl.formatMessage({ id: 'events.section.fieldNotes' })}
                  badge={intl.formatMessage({ id: 'events.section.badge.certifierRecordAndBuyer' })}
                />
                <StandardField
                  label={intl.formatMessage({ id: 'events.soil.form.label.observationsNotes' })}
                  helpText={intl.formatMessage({ id: 'events.common.help.observationAudience' })}>
                  <StandardTextarea
                    placeholder={intl.formatMessage({
                      id: 'events.soil.form.placeholder.optionalDescribeYourSoilManagementApproach'
                    })}
                    rows={4}
                    {...register('observation')}
                  />
                </StandardField>
                <StandardField
                  label={intl.formatMessage({ id: 'events.common.fields.privateNote' })}
                  helpText={intl.formatMessage({ id: 'events.common.help.privateNoteAudience' })}>
                  <StandardTextarea
                    placeholder={intl.formatMessage({
                      id: 'events.common.placeholders.privateNote'
                    })}
                    rows={3}
                    {...register('private_note')}
                  />
                </StandardField>

                <SupervisorSignOff control={methods.control} />
              </SectionBox>
            </>

            {/* Phase 2.3: Custom Fields Section */}
            <CustomFieldsForm
              customFields={customFields}
              onCustomFieldsChange={setCustomFields}
              eventTypeId={5}
              disabled={false}
            />

            {!hideActions && (
              <Box pt={6} mt={4} borderTop="1px" borderColor="gray.200">
                <HStack justify="space-between">
                  <StandardButton
                    variant="outline"
                    onClick={onPrev}
                    leftIcon={<FaChevronLeft />}
                    size="lg">
                    {intl.formatMessage({ id: 'app.previous' }) || 'Previous'}
                  </StandardButton>
                  <StandardButton
                    variant="primary"
                    type="submit"
                    rightIcon={<FaChevronRight />}
                    size="lg">
                    {intl.formatMessage({ id: 'app.continue' }) || 'Continue'}
                  </StandardButton>
                </HStack>
              </Box>
            )}
          </Flex>
        </form>
      </FormProvider>
    );
  }
);

// Add display name for better debugging
SoilManagementTab.displayName = 'SoilManagementTab';

export default SoilManagementTab;
