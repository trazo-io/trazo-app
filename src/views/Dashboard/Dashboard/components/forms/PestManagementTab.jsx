// Sprint 3 Epic 3.1: Cleaned unused Chakra imports - using StandardComponents only
// Switch and Badge re-added for summary mode toggle (consistent with ProductionTab/ChemicalTab)
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
  VStack,
  HStack,
  useColorModeValue,
  Text,
  Icon,
  SimpleGrid,
  Box,
  Divider,
  Switch
} from '@chakra-ui/react';
import {
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea,
  SectionHeader,
  SectionBox,
  GuidanceNote
} from 'components/Design/StandardComponents';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, array } from 'zod';
import CustomFieldsForm from './CustomFieldsForm';
import { SupervisorSignOff } from 'components/Forms/SupervisorSignOff';
import {
  FaChevronLeft,
  FaChevronRight,
  FaBug,
  FaRulerHorizontal,
  FaCloudSun,
  FaEye,
  FaSeedling,
  FaCheckCircle,
  FaCalendarAlt,
  FaLeaf
} from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { IDENTIFIED_BY } from 'config/events/enums';
// Event Field Registry (Phase 5G — form integration)
import { useFormFields } from 'src/hooks/useFormFields';
import { useDefaultUnits } from 'src/hooks/useMeasurementSystem';
import { RegistryFormField } from 'src/components/Forms/RegistryFormField';
import { BlockIdField } from 'components/Fields/BlockIdField';

// Sprint 3 Epic 3.1: Fuel types with EPA-verified emission factors (aligned with Production/Soil forms)
// UPDATED 2026-02-15: All factors corrected to match EPA 40 CFR Part 98 Table C-1
/**
 * Pest scouting stage → CommonEvent.growth_stage (common/field_registry.py GROWTH_STAGE).
 * The form's annual-crop vocabulary maps onto the column's orchard one where a stage means the
 * same thing; a stage with no equivalent is kept in extra_data.crop_growth_stage only.
 */
const CROP_STAGE_TO_COMMON = {
  vegetative: 'vegetative',
  flowering: 'bloom',
  fruit_development: 'fruit_set',
  maturity: 'maturation',
  harvest: 'harvest_ready'
};

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

const pestSchema = object({
  type: string().min(1, 'Pest management event type is required'),
  name: string().min(1, 'Event name is required'),
  // Sprint 5: Aggregate Pest Scouting Support - log multiple scouting trips as one summary
  is_summary: string().optional(), // "true" or "false" as string for form compatibility
  date_start: string().optional(), // Period start date for aggregate events
  date_end: string().optional(), // Period end date for aggregate events
  event_count: string().optional(), // Number of scouting trips in the period
  // Aggregate totals for pest scouting
  area_covered_total: string().optional(), // Combined area scouted across all trips
  fuel_consumed_total: string().optional(), // Combined fuel consumed across all trips (aligned with other forms)
  pest_species_observed: string().optional(), // Comma-separated list of pest species observed
  average_pest_pressure: string().optional(), // Overall pest pressure during the period
  observations_summary: string().optional(), // Summary of scouting findings for the period
  // Agricultural context fields (critical for carbon calculations)
  // Standardized: Using fuel_consumed like Chemical, Soil, Production forms (not travel_distance)
  area_covered: string().optional(),
  area_unit: string().optional(), // 'ha' | 'acres'
  // Sprint 3 Epic 3.1: Fuel & Equipment fields (aligned with Production/Soil forms)
  fuel_type: string().optional(), // EPA emission factor selection
  fuel_consumed: string().optional(), // Fuel used for equipment operation (aligned with other forms)
  fuel_unit: string().optional(), // 'L' | 'gal' | 'kg' | 'kWh'
  equipment_hours: string().optional(), // Equipment operating hours for carbon calculation
  production_efficiency: string().optional(), // Equipment efficiency rating
  // Agricultural decision fields
  crop_growth_stage: string().optional(),
  weather_conditions: string().optional(),
  action_recommended: string().optional(),
  // Existing pest management fields
  pest_species: string().optional(),
  // §E-4 — required for the CU subtype via the superRefine below (mirrors the backend clean()).
  cultural_practice: string().optional(),
  pest_pressure_level: string().optional(),
  // F44: quantitative UC-IPM monitoring count (e.g. 5 mites/leaf) + its unit.
  monitoring_count: string().optional(),
  monitoring_unit: string().optional(),
  beneficial_species: string().optional(),
  release_quantity: string().optional(),
  beneficial_supplier: string().optional(),
  beneficial_lot_number: string().optional(),
  beneficial_organic_approved: string().optional(),
  trap_count: string().optional(),
  trap_type: string().optional(),
  pest_catch_count: string().optional(),
  damage_percentage: string().optional(),
  action_threshold_met: string().optional(), // Changed to string for StandardSelect
  ipm_strategy: string().optional(),
  observation: string().optional(),
  private_note: string().optional(),
  // FSMA PSR § 112.161(b) sign-off. Harvest/packing (§ 112.140) and animal-intrusion
  // monitoring (§ 112.83) are part-112 records. `reviewed` rides the `...data` spread as a
  // 'true'/'false' STRING, so it is coerced to a real boolean just below.
  reviewed: string().optional(),
  reviewer_name: string().optional(),
  review_date: string().optional(),
  // Sprint 3 Epic 3.2: Consumer Trust Fields for transparency
  beneficial_insects_used: string().optional(), // Whether beneficial insects are being used
  chemical_free_period_days: string().optional(), // Days since last chemical application
  // NOP Compliance: Pest ID verification + Threshold rationale (7 CFR 205.206)
  threshold_rationale: string().optional(), // Why action threshold was/wasn't met
  identified_by: string().optional(), // Who identified the pest species
  identification_method: string().optional(), // How the pest was identified
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
}).superRefine((data, ctx) => {
  // §E-4 — mirrors PestManagementEvent.clean(): § 205.206(a) is documented by the SPECIFIC
  // preventive practice, not by the category, so the farmer sees this before the round trip.
  if (data.type === 'CU' && !data.cultural_practice) {
    ctx.addIssue({
      path: ['cultural_practice'],
      code: 'custom',
      message: 'Select the preventive practice performed'
    });
  }
  // A scouting summary's period asterisks were decorative — enforced by nothing, so a
  // summary could save with no period at all.
  if (data.type === 'SC' && data.is_summary === 'true') {
    const req = (path, message) => {
      if (!data[path]) ctx.addIssue({ code: 'custom', path: [path], message });
    };
    req('date_start', 'A summary needs the period start date');
    req('date_end', 'A summary needs the period end date');
    req('event_count', 'How many scouting trips does this summary cover?');
  }
});

// The default record name per subtype, in the farmer's language: the same labels the subtype
// select shows. Pilot rehearsal 2026-10, finding 2: this tab never named a record, so switching to
// Trap Monitoring left the required name blank and Continue refused with nothing on screen.
const PEST_TYPE_NAME_KEYS = {
  SC: 'app.scouting',
  BR: 'app.beneficialRelease',
  TM: 'app.trapMonitoring',
  PI: 'app.pestIdentification',
  TA: 'app.thresholdAssessment',
  IP: 'app.impImplementation',
  CU: 'events.pest.subtypes.culturalControl'
};

const PestManagementTab = forwardRef(
  (
    {
      onSubmitHandler,
      onDataChange,
      onPrev,
      initialValues = {},
      hideActions = false,
      // Who wrote the name ('auto' | 'operator' | 'unknown'), held by NewEvent. Same contract as
      // ProductionTab (Run 8b R4): regenerate only while the name is the tab's own.
      nameOrigin = 'auto',
      onNameEdited,
      /**
       * Several parcels (releases, cultural control): area, section, fuel used, machine hours
       * and the release quantity are asked on each parcel's card below the form, so their
       * inputs are left out here; units stay, because the cards read them. Keys from the
       * server's spec (`multiParcelSpec.json`, type 6).
       */
      multiTarget = false
    },
    ref
  ) => {
    const intl = useIntl();
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    // Soil, Chemical and Production forms all resolve their unit defaults from the farm's
    // measurement system; Pest was the one that never got wired up and kept a hardcoded
    // metric default. On a US farm that meant a grower typing "38.6" into Area Covered
    // recorded 38.6 HECTARES — 95 acres, a 2.47x overstatement of monitored/treated area
    // feeding the carbon calculation and the certifier export.
    const defaultUnits = useDefaultUnits();

    // INFINITE LOOP FIX: Track last sent values to prevent duplicate onDataChange calls
    const lastSentValuesRef = useRef(null);

    const methods = useForm({
      resolver: zodResolver(pestSchema),
      defaultValues: {
        type: initialValues.type || 'SC',
        cultural_practice: initialValues.cultural_practice || '',
        name: initialValues.name || '',
        // Sprint 5: Aggregate Pest Scouting Support
        is_summary:
          initialValues.is_summary === 'true' || initialValues.is_summary === true
            ? 'true'
            : 'false',
        date_start: initialValues.date_start || '',
        date_end: initialValues.date_end || '',
        event_count: initialValues.event_count?.toString() || '',
        area_covered_total: initialValues.area_covered_total?.toString() || '',
        fuel_consumed_total: initialValues.fuel_consumed_total?.toString() || '',
        pest_species_observed: initialValues.pest_species_observed || '',
        average_pest_pressure: initialValues.average_pest_pressure || '',
        observations_summary: initialValues.observations_summary || '',
        // Agricultural context fields - require user input for accurate carbon calculations
        // Standardized: Using fuel_consumed like other forms (Chemical, Soil, Production)
        area_covered: initialValues.area_covered || initialValues.field_area || '',
        area_unit: initialValues.area_unit || defaultUnits.area,
        // Sprint 3 Epic 3.1: Fuel & Equipment fields (aligned with Production/Soil forms)
        fuel_type: initialValues.fuel_type || '', // EPA emission factor selection
        fuel_consumed: initialValues.fuel_consumed || '',
        fuel_unit: initialValues.fuel_unit || defaultUnits.fuel,
        equipment_hours: initialValues.equipment_hours?.toString() || '',
        production_efficiency: initialValues.production_efficiency || '',
        // Agricultural decision fields
        crop_growth_stage: initialValues.crop_growth_stage || '',
        weather_conditions: initialValues.weather_conditions || '',
        action_recommended: initialValues.action_recommended || '',
        // Existing pest management fields
        pest_species: initialValues.pest_species || '',
        pest_pressure_level: (initialValues.pest_pressure_level || '').toLowerCase(), // F37: lowercased so legacy Capitalized values match the now-lowercase options on edit
        monitoring_count: initialValues.monitoring_count?.toString() || '',
        monitoring_unit: initialValues.monitoring_unit || '',
        beneficial_species: initialValues.beneficial_species || '',
        release_quantity: initialValues.release_quantity || '',
        beneficial_supplier: initialValues.beneficial_supplier || '',
        beneficial_lot_number: initialValues.beneficial_lot_number || '',
        beneficial_organic_approved: initialValues.beneficial_organic_approved || '',
        trap_count: initialValues.trap_count?.toString() || '',
        trap_type: initialValues.trap_type || '',
        pest_catch_count: initialValues.pest_catch_count?.toString() || '',
        damage_percentage: initialValues.damage_percentage?.toString() || '',
        action_threshold_met:
          initialValues.action_threshold_met?.toString() ||
          initialValues.economic_threshold_met?.toString() ||
          initialValues.extra_data?.economic_threshold_met?.toString() ||
          '',
        ipm_strategy: initialValues.ipm_strategy || '',
        observation: initialValues.observation || '',
        private_note: initialValues.private_note || '',
        reviewed:
          initialValues.reviewed === true || initialValues.reviewed === 'true' ? 'true' : 'false',
        reviewer_name: initialValues.reviewer_name || '',
        review_date: initialValues.review_date || '',
        // Sprint 3 Epic 3.2: Consumer Trust Fields
        beneficial_insects_used: initialValues.beneficial_insects_used || '',
        chemical_free_period_days: initialValues.chemical_free_period_days?.toString() || '',
        // NOP Compliance: Pest ID verification + Threshold rationale (7 CFR 205.206)
        threshold_rationale: initialValues.threshold_rationale || '',
        identified_by: initialValues.identified_by || '',
        identification_method: initialValues.identification_method || '',
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

    // Update form values when initialValues change
    useEffect(() => {
      if (Object.keys(initialValues).length > 0) {
        methods.reset({
          type: initialValues.type || 'SC',
          cultural_practice: initialValues.cultural_practice || '',
          name: initialValues.name || '',
          // Sprint 5: Aggregate Pest Scouting Support
          is_summary:
            initialValues.is_summary === 'true' || initialValues.is_summary === true
              ? 'true'
              : 'false',
          date_start: initialValues.date_start || '',
          date_end: initialValues.date_end || '',
          event_count: initialValues.event_count?.toString() || '',
          area_covered_total: initialValues.area_covered_total?.toString() || '',
          fuel_consumed_total: initialValues.fuel_consumed_total?.toString() || '',
          pest_species_observed: initialValues.pest_species_observed || '',
          average_pest_pressure: initialValues.average_pest_pressure || '',
          observations_summary: initialValues.observations_summary || '',
          // Agricultural context fields
          // Standardized: Using fuel_consumed like other forms (Chemical, Soil, Production)
          area_covered: initialValues.area_covered || initialValues.field_area || '',
          area_unit: initialValues.area_unit || defaultUnits.area,
          // Sprint 3 Epic 3.1: Fuel & Equipment fields (aligned with Production/Soil forms)
          fuel_type: initialValues.fuel_type || '',
          fuel_consumed: initialValues.fuel_consumed || '',
          fuel_unit: initialValues.fuel_unit || defaultUnits.fuel,
          equipment_hours: initialValues.equipment_hours?.toString() || '',
          production_efficiency: initialValues.production_efficiency || '',
          // Agricultural decision fields
          crop_growth_stage: initialValues.crop_growth_stage || '',
          weather_conditions: initialValues.weather_conditions || '',
          action_recommended: initialValues.action_recommended || '',
          // Existing pest management fields
          pest_species: initialValues.pest_species || '',
          pest_pressure_level: (initialValues.pest_pressure_level || '').toLowerCase(), // F37: lowercased so legacy Capitalized values match the now-lowercase options on edit
          monitoring_count: initialValues.monitoring_count?.toString() || '',
          monitoring_unit: initialValues.monitoring_unit || '',
          beneficial_species: initialValues.beneficial_species || '',
          release_quantity: initialValues.release_quantity || '',
          trap_count: initialValues.trap_count?.toString() || '',
          damage_percentage: initialValues.damage_percentage?.toString() || '',
          action_threshold_met:
            initialValues.action_threshold_met?.toString() ||
            initialValues.economic_threshold_met?.toString() ||
            initialValues.extra_data?.economic_threshold_met?.toString() ||
            '',
          ipm_strategy: initialValues.ipm_strategy || '',
          observation: initialValues.observation || '',
          private_note: initialValues.private_note || '',
          reviewed:
            initialValues.reviewed === true || initialValues.reviewed === 'true' ? 'true' : 'false',
          reviewer_name: initialValues.reviewer_name || '',
          review_date: initialValues.review_date || '',
          // Sprint 3 Epic 3.2: Consumer Trust Fields
          beneficial_insects_used: initialValues.beneficial_insects_used || '',
          chemical_free_period_days: initialValues.chemical_free_period_days?.toString() || '',
          // NOP Compliance: Pest ID verification + Threshold rationale (7 CFR 205.206)
          threshold_rationale: initialValues.threshold_rationale || '',
          identified_by: initialValues.identified_by || '',
          identification_method: initialValues.identification_method || '',
          // Phase 2: Universal CommonEvent fields
          variety: initialValues.variety || '',
          block_id: initialValues.block_id || '',
          growth_stage: initialValues.growth_stage || '',
          custom_fields: initialValues.custom_fields || []
        });
      }
    }, [initialValues, methods]);

    // Sync custom fields with form
    useEffect(() => {
      methods.setValue('custom_fields', customFields);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customFields]);

    const {
      watch,
      handleSubmit,
      formState: { errors }
    } = methods;
    const pestType = watch('type');

    // Default name from the subtype, while the name is the tab's own ('auto') or blank and nobody
    // typed it. An operator-touched name is theirs even when blank (clearing to retype is an
    // edit); an unknown origin (edit, repeat, restored draft) keeps a non-blank name as it is.
    const pestTypeNameKey = PEST_TYPE_NAME_KEYS[pestType];
    const pestTypeName = pestTypeNameKey ? intl.formatMessage({ id: pestTypeNameKey }) : '';
    useEffect(() => {
      if (!pestTypeName) return;
      const currentName = methods.getValues('name');
      const isBlank = !currentName || !String(currentName).trim();
      if (nameOrigin === 'auto' || (isBlank && nameOrigin !== 'operator')) {
        methods.setValue('name', pestTypeName, { shouldDirty: false, shouldValidate: isBlank });
      }
    }, [pestTypeName, nameOrigin, methods]);
    const nameField = methods.register('name');

    // Sprint 5: Watch for summary mode toggle (Aggregate Pest Scouting Support)
    const isSummaryMode = watch('is_summary') === 'true';

    // Watch ALL fields for real-time preview updates and carbon calculation
    // FIX: Previously only carbon fields were watched, causing stale preview data
    // for pest scouting, IPM, and observation fields
    const watchedFields = watch([
      'type',
      'name',
      'is_summary',
      'area_covered',
      'area_unit',
      'fuel_type',
      'fuel_consumed',
      'fuel_unit',
      'equipment_hours',
      'production_efficiency',
      'pest_pressure_level',
      'damage_percentage',
      'release_quantity',
      'trap_count',
      'observation',
      'private_note',
      'pest_species',
      'crop_growth_stage',
      'action_recommended',
      'action_threshold_met',
      'beneficial_species',
      'ipm_strategy',
      'beneficial_insects_used',
      'chemical_free_period_days',
      'threshold_rationale',
      'identified_by',
      'identification_method',
      'date_start',
      'date_end',
      'custom_fields'
    ]);

    // Real-time field watching for carbon calculation updates
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        if (onDataChange && typeof onDataChange === 'function') {
          const currentValues = methods.getValues();

          // INFINITE LOOP FIX: Check if values have actually changed
          const currentValuesString = JSON.stringify(currentValues);
          if (lastSentValuesRef.current === currentValuesString) {
            console.log('[PestManagementTab]: Values unchanged, skipping onDataChange');
            return;
          }

          // Always sync form data for preview card updates (name, type, is_summary, etc.)
          // Carbon calculation on the backend handles its own validation for incomplete data
          const hasValidType = currentValues.type && currentValues.type !== '';

          if (hasValidType) {
            try {
              onDataChange(currentValues);
              lastSentValuesRef.current = currentValuesString; // Store sent values
            } catch (error) {
              console.error('[PestManagementTab]: Error calling onDataChange:', error);
            }
          } else {
            console.log('[PestManagementTab]: No valid type, skipping onDataChange');
          }
        } else {
          console.log('[PestManagementTab]: onDataChange not available');
        }
      }, 500); // Debounced to prevent excessive API calls

      return () => clearTimeout(timeoutId);
    }, [watchedFields]); // FIXED: Removed onDataChange to prevent infinite loop

    const onSubmit = (data) => {
      // Sprint 5: Check for aggregate mode
      const isSummaryEvent = data.is_summary === 'true';

      // Convert string numbers to proper format
      const processedData = {
        ...data,
        // The Switch stores 'true'/'false' strings; the model field is a BooleanField.
        // Coerced explicitly rather than trusting DRF's string parsing, and to match the
        // Chemical and Soil tabs.
        reviewed: data.reviewed === 'true' || data.reviewed === true,
        reviewer_name: data.reviewer_name || null,
        review_date: data.review_date || null,
        // REMOVED: observation → description mapping now handled universally in cleanEventData
        trap_count: data.trap_count ? parseInt(data.trap_count) : null,
        pest_catch_count: data.pest_catch_count ? parseInt(data.pest_catch_count) : null,
        damage_percentage: data.damage_percentage ? parseFloat(data.damage_percentage) : null,
        // F44: quantitative monitoring count + unit
        monitoring_count: data.monitoring_count ? parseFloat(data.monitoring_count) : null,
        monitoring_unit: data.monitoring_unit || null,
        // NOP Compliance: Model fields — empty string → null for backend CharField/TextField
        threshold_rationale: data.threshold_rationale || null,
        // BR/TM traceability — empty string → null so blanks don't persist as ""
        beneficial_supplier: data.beneficial_supplier || null,
        beneficial_lot_number: data.beneficial_lot_number || null,
        beneficial_organic_approved: data.beneficial_organic_approved || null,
        trap_type: data.trap_type || null,
        // §E-4 — a cultural practice belongs to a CU event only. Send null for other subtypes so
        // re-typing a sanitation pass as Scouting actually clears it rather than leaving a
        // practice attached to an event that never performed one.
        cultural_practice: data.type === 'CU' ? data.cultural_practice || null : null,
        identified_by: data.identified_by || null,
        identification_method: data.identification_method || null,
        // The stage is a CommonEvent column. It was written ONLY to extra_data.crop_growth_stage
        // (kept below for the packet's legacy fallback), so the registry's `growth_stage` entry
        // — which reads the column — rendered nothing on the producer's own record (2026-09-06).
        // The column's vocabulary is the orchard one (common/field_registry.py GROWTH_STAGE);
        // this form speaks the annual-crop one. Translate where a stage has an equivalent and
        // leave the column empty where it does not — "seedling" has none, and posting it raised
        // a 400. The original word always stays in extra_data.crop_growth_stage.
        growth_stage: CROP_STAGE_TO_COMMON[data.crop_growth_stage] || null,
        // Sprint 5: Aggregate Pest Scouting Support
        extra_data: {
          // Existing extra_data fields (if any)
          ...(data.extra_data || {}),
          // FIX: PestManagementEvent has no `name` model field - persist in extra_data
          ...(data.name && { name: data.name }),
          // Agricultural context fields (no model columns - persist in extra_data)
          ...(data.crop_growth_stage && { crop_growth_stage: data.crop_growth_stage }),
          ...(data.action_recommended && { action_recommended: data.action_recommended }),
          // Sprint 5: Aggregate Pest Scouting Support
          ...(isSummaryEvent && {
            is_summary: true,
            date_start: data.date_start || null,
            date_end: data.date_end || null,
            event_count: data.event_count ? parseInt(data.event_count, 10) : null,
            // Aggregate area and fuel totals (standardized with other forms)
            area_covered_total: data.area_covered_total
              ? parseFloat(data.area_covered_total)
              : null,
            area_unit: data.area_unit || defaultUnits.area,
            // Sprint 3 Epic 3.1: Fuel & Equipment fields (aligned with Production/Soil forms)
            fuel_type: data.fuel_type || null,
            fuel_consumed_total: data.fuel_consumed_total
              ? parseFloat(data.fuel_consumed_total)
              : null,
            fuel_unit: data.fuel_unit || defaultUnits.fuel,
            equipment_hours: data.equipment_hours ? parseFloat(data.equipment_hours) : null,
            production_efficiency: data.production_efficiency || null,
            // Pest observations summary
            pest_species_observed: data.pest_species_observed || null,
            average_pest_pressure: data.average_pest_pressure || null,
            // Auto-populate from Farmer's Field Notes (observation field) to avoid redundant input
            observations_summary: data.observations_summary || data.observation || null
          })
        }
      };

      console.log('[PestManagementTab] Submitting with processed data:', processedData);
      onSubmitHandler(processedData);
    };

    // Keep ref in sync with latest handler on every render (avoids stale closures)
    submitHandlerRef.current = onSubmit;

    return (
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ width: '100%' }}>
          <VStack spacing={6} align="stretch">
            {/* Forms are hand-crafted by design: the NOP section grouping below is what
                makes the audit export complete, and the registry renderer flattens it.
                The field registry is the SSOT for DISPLAY surfaces (consumer card, modal,
                timeline) and is enforced here by src/config/events/__tests__/
                formConformance.test.ts, not by a runtime flag. */}
            <>
              {/* Basic Event Information */}
              <SectionBox>
                {/* Not "Pest Management Event Information" — EVENT_TYPE_NAMES[6] plus the
                      backend model's word, in hardcoded English. Same key as the first
                      heading in ProductionTab and SoilManagementTab: all three hold the
                      activity's name and subtype, so all three say the same thing. */}
                <SectionHeader
                  icon={FaBug}
                  title={intl.formatMessage({ id: 'events.section.activityBasics' })}
                  badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                />{' '}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  {/* FIRST: Event Type (standardized order - matches other forms) */}
                  <StandardField
                    label={
                      intl.formatMessage({ id: 'app.pestManagementEventType' }) ||
                      'Pest Management Event Type'
                    }
                    required
                    error={errors.type?.message}>
                    <StandardSelect {...methods.register('type')}>
                      <option value="SC">
                        {intl.formatMessage({ id: 'app.scouting' }) || 'Scouting'}
                      </option>
                      <option value="BR">
                        {intl.formatMessage({ id: 'app.beneficialRelease' }) ||
                          'Beneficial Release'}
                      </option>
                      <option value="TM">
                        {intl.formatMessage({ id: 'app.trapMonitoring' }) || 'Trap Monitoring'}
                      </option>
                      <option value="PI">
                        {intl.formatMessage({ id: 'app.pestIdentification' }) ||
                          'Pest Identification'}
                      </option>
                      <option value="TA">
                        {intl.formatMessage({ id: 'app.thresholdAssessment' }) ||
                          'Threshold Assessment'}
                      </option>
                      <option value="IP">
                        {intl.formatMessage({ id: 'app.impImplementation' }) ||
                          'IPM Implementation'}
                      </option>
                      {/* §E-4: winter sanitation and other § 205.206(a) preventive practices */}
                      <option value="CU">
                        {intl.formatMessage({
                          id: 'events.pest.subtypes.culturalControl',
                          defaultMessage: 'Cultural / Sanitation Control'
                        })}
                      </option>
                    </StandardSelect>
                  </StandardField>

                  {/* SECOND: Event Name (standardized order - matches other forms) */}
                  <StandardField
                    label={intl.formatMessage({ id: 'app.eventName' }) || 'Event Name'}
                    required
                    error={errors.name?.message}>
                    <StandardInput
                      {...nameField}
                      onChange={(event) => {
                        onNameEdited?.();
                        return nameField.onChange(event);
                      }}
                      placeholder="e.g., Pest Scouting, Beneficial Release"
                    />
                  </StandardField>
                </SimpleGrid>
              </SectionBox>

              {/* §E-4 Cultural / sanitation control (7 CFR 205.206(a)). The preventive practice
                    an organic orchard performs INSTEAD of spraying — winter mummy removal is the
                    navel-orangeworm control in a California almond block, and it had nowhere to
                    be recorded. § 205.206(e) later justifies a substance only once practices like
                    these are documented and shown insufficient. */}
              {pestType === 'CU' && (
                <SectionBox>
                  <SectionHeader
                    icon={FaLeaf}
                    title={intl.formatMessage({
                      id: 'events.pest.sections.culturalControl',
                      defaultMessage: 'Preventive Cultural Practice'
                    })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    description={intl.formatMessage({
                      id: 'events.pest.sections.culturalControlHelp',
                      defaultMessage:
                        'Non-chemical prevention performed in the field. This is the record that supports any later substance application.'
                    })}
                  />
                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.pest.fields.culturalPractice',
                      defaultMessage: 'Practice Performed'
                    })}
                    required
                    error={errors.cultural_practice?.message}
                    helpText={intl.formatMessage({
                      id: 'events.pest.fields.culturalPracticeHelp',
                      defaultMessage:
                        'The specific practice — "cultural control" on its own supports nothing at inspection.'
                    })}>
                    <StandardSelect
                      placeholder={intl.formatMessage({
                        id: 'events.pest.fields.culturalPracticePlaceholder',
                        defaultMessage: 'Select the practice performed'
                      })}
                      {...methods.register('cultural_practice')}>
                      <option value="mummy_removal">
                        {intl.formatMessage({
                          id: 'events.pest.options.culturalPractice.mummyRemoval'
                        })}
                      </option>
                      <option value="sanitation_shake">
                        {intl.formatMessage({
                          id: 'events.pest.options.culturalPractice.sanitationShake'
                        })}
                      </option>
                      <option value="brush_shred">
                        {intl.formatMessage({
                          id: 'events.pest.options.culturalPractice.brushShred'
                        })}
                      </option>
                      <option value="pruning_removal">
                        {intl.formatMessage({
                          id: 'events.pest.options.culturalPractice.pruningRemoval'
                        })}
                      </option>
                      <option value="field_sanitation">
                        {intl.formatMessage({
                          id: 'events.pest.options.culturalPractice.fieldSanitation'
                        })}
                      </option>
                      <option value="trap_crop">
                        {intl.formatMessage({
                          id: 'events.pest.options.culturalPractice.trapCrop'
                        })}
                      </option>
                    </StandardSelect>
                  </StandardField>
                </SectionBox>
              )}

              {/* Sprint 5: Aggregate Pest Scouting Support - Summary Mode Toggle */}
              {/* Neutral like the other summary-mode panels (2026-11-04): a mode is not a status. */}
              {pestType === 'SC' && (
                <Box
                  p={4}
                  bg={isSummaryMode ? 'white' : 'gray.50'}
                  borderRadius="md"
                  border="1px solid"
                  borderColor={isSummaryMode ? 'gray.300' : 'gray.200'}
                  mb={4}>
                  <HStack justify="space-between" align="center">
                    <VStack align="start" spacing={0}>
                      <HStack>
                        <Text fontWeight="semibold" fontSize="sm">
                          {intl.formatMessage({ id: 'events.section.pest.scoutingSummary' })}
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="gray.600">
                        {intl.formatMessage({
                          id: isSummaryMode
                            ? 'events.section.pest.scoutingSummaryOn'
                            : 'events.section.pest.scoutingSummaryOff'
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
                          onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                        />
                      )}
                    />
                  </HStack>

                  {/* A "benefits" box was here: "Save time" with a green check, and "Zero Carbon
                      Impact - Scouting is observational" with a leaf, in hardcoded English. The eco
                      line is the claim removed from the shopper card in #265; deleted 2026-11-04. */}
                </Box>
              )}

              {/* Sprint 5: Aggregate Pest Scouting Fields (shown when summary mode is active for SC) */}
              {isSummaryMode && pestType === 'SC' && (
                <Box
                  p={4}
                  bg="white"
                  borderRadius="md"
                  border="1px solid"
                  borderColor="green.200"
                  mb={4}>
                  <Text fontWeight="semibold" color="green.700" mb={4}>
                    <Icon as={FaCalendarAlt} mr={2} />
                    Aggregate Scouting Period
                  </Text>

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                    <StandardField
                      label="Period Start Date"
                      helpText="When did this scouting period begin?"
                      required>
                      <StandardInput type="date" {...methods.register('date_start')} />
                    </StandardField>

                    <StandardField
                      label="Period End Date"
                      helpText="When did this scouting period end?"
                      required>
                      <StandardInput type="date" {...methods.register('date_end')} />
                    </StandardField>
                  </SimpleGrid>

                  <StandardField
                    label="Number of Scouting Trips"
                    helpText="Total scouting trips during this period"
                    required>
                    <Controller
                      name="event_count"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput {...field} type="number" placeholder="e.g., 24" min="1" />
                      )}
                    />
                  </StandardField>

                  <Divider my={4} />

                  <Text fontWeight="semibold" color="green.700" mb={3}>
                    <Icon as={FaRulerHorizontal} mr={2} />
                    Aggregate Area & Distance
                  </Text>

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                    <StandardField
                      label="Total Field Area Covered"
                      helpText="Combined area scouted across all trips">
                      <HStack spacing={2}>
                        <Controller
                          name="area_covered_total"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              flex={2}
                              type="number"
                              step="0.01"
                              placeholder="e.g., 120"
                            />
                          )}
                        />
                        <Controller
                          name="area_unit"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect {...field} flex={1}>
                              <option value="ha">
                                {intl.formatMessage({ id: 'events.units.hectares' })}
                              </option>
                              <option value="acres">
                                {intl.formatMessage({ id: 'events.units.acres' })}
                              </option>
                            </StandardSelect>
                          )}
                        />
                      </HStack>
                    </StandardField>

                    {/* Standardized: Using fuel_consumed_total like other forms */}
                    <StandardField
                      label="Total Fuel Consumed"
                      helpText="Combined fuel consumed across all trips">
                      <HStack spacing={2}>
                        <Controller
                          name="fuel_consumed_total"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              flex={2}
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="e.g., 5.5"
                            />
                          )}
                        />
                        <Controller
                          name="fuel_unit"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect {...field} flex={1}>
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
                          )}
                        />
                      </HStack>
                    </StandardField>
                  </SimpleGrid>

                  <Divider my={4} />

                  <Text fontWeight="semibold" color="green.700" mb={3}>
                    <Icon as={FaBug} mr={2} />
                    Pest Observations Summary
                  </Text>

                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.pest.fields.pestSpeciesObservedPeriod'
                    })}
                    helpText="List all pest species observed during the scouting period (comma-separated)">
                    <Controller
                      name="pest_species_observed"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput
                          {...field}
                          placeholder="e.g., aphids, whitefly, thrips, spider mites"
                        />
                      )}
                    />
                  </StandardField>

                  <StandardField
                    label="Average Pest Pressure Level"
                    helpText="Overall pest pressure during the scouting period">
                    <Controller
                      name="average_pest_pressure"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardSelect {...field}>
                          <option value="">
                            {intl.formatMessage({ id: 'events.pest.options.selectPressureLevel' })}
                          </option>
                          <option value="none">
                            {intl.formatMessage({
                              id: 'events.pest.options.averagePestPressure.none'
                            })}
                          </option>
                          <option value="low">
                            {intl.formatMessage({
                              id: 'events.pest.options.averagePestPressure.low'
                            })}
                          </option>
                          <option value="moderate">
                            {intl.formatMessage({
                              id: 'events.pest.options.averagePestPressure.moderate'
                            })}
                          </option>
                          <option value="high">
                            {intl.formatMessage({
                              id: 'events.pest.options.averagePestPressure.high'
                            })}
                          </option>
                          <option value="severe">
                            {intl.formatMessage({
                              id: 'events.pest.options.averagePestPressure.severe'
                            })}
                          </option>
                        </StandardSelect>
                      )}
                    />
                  </StandardField>

                  {/* Removed: observations_summary textarea - redundant with "Farmer's Field Notes" section
                   which is now always visible (matching ChemicalTab pattern where aggregate sections
                   only contain quantitative fields). The observation field maps to description and
                   is auto-copied to observations_summary in onSubmit for ConsumerEventCard display. */}

                  {/* Was a teal box with a leaf headed "Zero Carbon Impact", in hardcoded English: an
                      eco badge on an observation. The reason scouting matters is the § 205.206(e)
                      point, so that leads; the emissions fact is a plain clause (2026-11-04). */}
                  <Box mt={4}>
                    <GuidanceNote>
                      {intl.formatMessage({ id: 'events.pest.scoutingNote.body' })}
                    </GuidanceNote>
                  </Box>
                </Box>
              )}

              {/* Agricultural Context Section - Critical for Carbon Calculations */}
              {/* Sprint 5: Hide individual fields when in Summary Mode for Scouting - aggregate fields replace them */}
              {!(isSummaryMode && pestType === 'SC') && (
                <SectionBox borderColor="green.200">
                  <SectionHeader
                    icon={FaRulerHorizontal}
                    title={intl.formatMessage({ id: 'events.section.pest.fieldArea' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                  />

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {/* Sprint 2 Epic 2.2: Flexible units - user can select hectares or acres */}
                    <StandardField
                      label={
                        multiTarget
                          ? intl.formatMessage({ id: 'events.multiParcel.areaUnitLabel' })
                          : 'Area Covered'
                      }
                      helpText={
                        multiTarget
                          ? intl.formatMessage({ id: 'events.multiParcel.areaUnitHelp' })
                          : 'The area you covered. Your certifier checks this against the block acreage; it is one of the fields § 205.103(b)(2) completeness looks for.'
                      }>
                      <HStack spacing={2}>
                        {!multiTarget && (
                          <StandardInput
                            flex={2}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="2.5"
                            {...methods.register('area_covered')}
                          />
                        )}
                        <StandardSelect flex={1} {...methods.register('area_unit')}>
                          <option value="ha">
                            {intl.formatMessage({ id: 'events.units.hectares' })}
                          </option>
                          <option value="acres">
                            {intl.formatMessage({ id: 'events.units.acres' })}
                          </option>
                        </StandardSelect>
                      </HStack>
                    </StandardField>
                  </SimpleGrid>
                </SectionBox>
              )}

              {/* Sprint 3 Epic 3.1: Fuel & Equipment Operations Section (aligned with Production/Soil forms) */}
              {!(isSummaryMode && pestType === 'SC') && (
                <SectionBox>
                  <SectionHeader
                    icon={FaSeedling}
                    title={intl.formatMessage({ id: 'events.section.fuelEquipment' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.optionalCarbon' })}
                    description={intl.formatMessage({ id: 'events.section.desc.carbonOptional' })}
                    badgeTone="optional"
                  />{' '}
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {/* Fuel Type Selector - for accurate EPA emission factor calculation */}
                    <StandardField
                      label="Fuel Type"
                      helpText="Select a fuel type only if powered equipment was used. Leave blank for hand/manual operations.">
                      <StandardSelect
                        placeholder={intl.formatMessage({
                          id: 'events.chemical.form.fuelTypePlaceholder'
                        })}
                        {...methods.register('fuel_type')}>
                        {FUEL_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {intl.formatMessage({ id: type.labelKey })} ({type.factor})
                          </option>
                        ))}
                      </StandardSelect>
                    </StandardField>

                    {/* Dynamic Fuel Consumed label based on fuel type */}
                    <StandardField
                      label={
                        multiTarget
                          ? intl.formatMessage({ id: 'events.multiParcel.fuelUnitLabel' })
                          : watch('fuel_type') === 'electric'
                          ? 'Energy Amount (kWh)'
                          : 'Fuel Consumed'
                      }
                      helpText={
                        multiTarget
                          ? intl.formatMessage({ id: 'events.multiParcel.fuelUnitHelp' })
                          : watch('fuel_type') === 'electric'
                          ? 'Energy consumption for carbon emission calculation'
                          : 'Fuel consumption for carbon emission calculation'
                      }>
                      <HStack spacing={2}>
                        {!multiTarget && (
                          <StandardInput
                            flex={2}
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder={
                              watch('fuel_type') === 'electric' ? 'e.g., 15 kWh' : 'e.g., 15.5'
                            }
                            {...methods.register('fuel_consumed')}
                          />
                        )}
                        <StandardSelect flex={1} {...methods.register('fuel_unit')}>
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

                    {/* Equipment Operating Hours */}
                    {!multiTarget && (
                      <StandardField
                        label="Equipment Operating Hours"
                        helpText="Used for calculating fuel efficiency and carbon per hour">
                        <StandardInput
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="e.g., 3.5"
                          {...methods.register('equipment_hours')}
                        />
                      </StandardField>
                    )}

                    {/* Production Efficiency */}
                    <StandardField
                      label="Production Efficiency"
                      helpText="Optional. Your own read on how the operation went — used only in the carbon estimate, never in your certifier record.">
                      <StandardSelect {...methods.register('production_efficiency')}>
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
                  </SimpleGrid>
                </SectionBox>
              )}

              {/* Agricultural Decision Context */}
              <SectionBox>
                <SectionHeader
                  icon={FaCloudSun}
                  title={intl.formatMessage({ id: 'events.section.pest.conditions' })}
                  badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                />

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  {/* Was hardcoded English ("Crop Growth Stage"), so the Spanish form showed it in
                      English. The registry's own label key, like every other field here. */}
                  <StandardField
                    label={intl.formatMessage({ id: 'events.common.fields.growthStage' })}
                    helpText={intl.formatMessage({ id: 'events.pest.fields.cropGrowthStageHelp' })}>
                    <StandardSelect {...methods.register('crop_growth_stage')}>
                      <option value="">
                        {intl.formatMessage({ id: 'events.pest.options.selectGrowthStage' })}
                      </option>
                      <option value="seedling">
                        {intl.formatMessage({ id: 'events.pest.options.cropGrowthStage.seedling' })}
                      </option>
                      <option value="vegetative">
                        {intl.formatMessage({
                          id: 'events.pest.options.cropGrowthStage.vegetative'
                        })}
                      </option>
                      <option value="flowering">
                        {intl.formatMessage({
                          id: 'events.pest.options.cropGrowthStage.flowering'
                        })}
                      </option>
                      <option value="fruit_development">
                        {intl.formatMessage({
                          id: 'events.pest.options.cropGrowthStage.fruitDevelopment'
                        })}
                      </option>
                      <option value="maturity">
                        {intl.formatMessage({ id: 'events.pest.options.cropGrowthStage.maturity' })}
                      </option>
                      <option value="harvest">
                        {intl.formatMessage({ id: 'events.pest.options.cropGrowthStage.harvest' })}
                      </option>
                    </StandardSelect>
                  </StandardField>

                  {/* Sprint 2 Epic 2.2: Removed weather_conditions field - duplicates Weather event
                  Pest pressure is tracked via pest_pressure_level dropdown in the assessment section */}

                  {/* "Economic Threshold Status" used to sit here — a second yes/no for the same
                      fact as "Action Threshold Met" below (both asked whether the economic
                      threshold was reached; only `action_threshold_met` reaches the registry, the
                      buyer card and the certifier packet, and this one was written to extra_data
                      and read by nothing). Removed 2026-09-06; a legacy answer is folded into
                      action_threshold_met when the record is opened for edit. */}

                  <StandardField
                    label="Action Recommended"
                    helpText="Next steps from this IPM activity">
                    <StandardInput
                      {...methods.register('action_recommended')}
                      placeholder="e.g., continue monitoring, apply treatment"
                    />
                  </StandardField>
                </SimpleGrid>
              </SectionBox>

              {/* Pest-Specific Details Section */}
              {/* In summary mode for Scouting, pest species and pressure are already captured
                in the Pest Observations Summary section above - hide to avoid redundancy */}
              {!(isSummaryMode && pestType === 'SC') && (
                <SectionBox>
                  {/* Not "Pest Management Details". The section holds trap and monitoring
                      counts, species, pressure level, damage percentage and whether the
                      action threshold was met — observations and thresholds, which is what
                      § 205.206 asks the grower to record before any control. */}
                  <SectionHeader
                    icon={FaEye}
                    title={intl.formatMessage({ id: 'events.section.pest.observations' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                  />

                  {/* Universal Pest Context Fields - All Types */}
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={6}>
                    <StandardField
                      label={intl.formatMessage({ id: 'app.pestSpecies' }) || 'Pest Species'}
                      helpText="Name the pest as precisely as you can. § 205.206(e) requires the pest to be identified before a National List substance is applied.">
                      <StandardInput
                        {...methods.register('pest_species')}
                        placeholder="e.g., Aphids, Spider mites, Thrips"
                      />
                    </StandardField>

                    {/* With several parcels crop damage and pressure are refused (they describe
                        one place), and the shared body drops them, so they are not offered. */}
                    {!multiTarget && (
                      <StandardField
                        label={
                          intl.formatMessage({ id: 'app.damagePercentage' }) ||
                          'Crop Impact Level (%)'
                        }
                        helpText="Percentage of crop damage observed (for transparency)">
                        <StandardInput
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          {...methods.register('damage_percentage')}
                          placeholder="0.0"
                        />
                      </StandardField>
                    )}
                  </SimpleGrid>

                  {/* Pest Pressure Assessment - Most Types */}
                  {!multiTarget &&
                    (pestType === 'SC' ||
                      pestType === 'PI' ||
                      pestType === 'TA' ||
                      pestType === 'TM' ||
                      pestType === 'BR' ||
                      pestType === 'IP') && (
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={6}>
                        <StandardField
                          label={
                            intl.formatMessage({ id: 'app.pestPressureLevel' }) ||
                            'Pest Pressure Level'
                          }
                          helpText={
                            pestType === 'TM'
                              ? 'Pressure level detected through monitoring'
                              : pestType === 'BR'
                              ? 'Pressure level that prompted beneficial release'
                              : pestType === 'IP'
                              ? 'Pressure level that triggered IPM implementation'
                              : 'Current pest population assessment'
                          }>
                          {/* F37 fix (2026-06): lowercase values to match the scouting
                              `average_pest_pressure` field and the registry/tests
                              (pestEvent.ts, pestEvent.test.ts use 'low'/'moderate').
                              Previously Capitalized ("Low"/"Critical"), giving two
                              casings for one concept and risking visibleWhen/normalizer
                              mismatches. Labels (i18n) unchanged; formatPestPressure
                              already lowercases on lookup so display is unaffected. */}
                          <StandardSelect {...methods.register('pest_pressure_level')}>
                            <option value="">
                              {intl.formatMessage({
                                id: 'events.pest.options.selectPressureLevel'
                              })}
                            </option>
                            <option value="low">
                              {intl.formatMessage({ id: 'app.low' }) || 'Low'}
                            </option>
                            <option value="medium">
                              {intl.formatMessage({ id: 'app.medium' }) || 'Medium'}
                            </option>
                            <option value="high">
                              {intl.formatMessage({ id: 'app.high' }) || 'High'}
                            </option>
                            <option value="critical">
                              {intl.formatMessage({ id: 'app.critical' }) || 'Critical'}
                            </option>
                          </StandardSelect>
                        </StandardField>

                        {/* Economic Threshold Assessment - SC, TA, IP Types (NOP 7 CFR 205.206(e)) */}
                        {(pestType === 'SC' || pestType === 'TA' || pestType === 'IP') && (
                          <StandardField
                            label="Action Threshold Met"
                            helpText={
                              pestType === 'SC'
                                ? 'Was the economic action threshold met during scouting?'
                                : pestType === 'TA'
                                ? 'Main threshold assessment decision'
                                : 'Was IPM triggered by reaching economic threshold?'
                            }>
                            <StandardSelect {...methods.register('action_threshold_met')}>
                              <option value="">
                                {intl.formatMessage({ id: 'events.pest.options.selectStatus' })}
                              </option>
                              <option value="true">
                                {intl.formatMessage({ id: 'app.actionThresholdMet' }) ||
                                  'Yes - Economic threshold met, action required'}
                              </option>
                              <option value="false">
                                {intl.formatMessage({
                                  id: 'events.pest.options.actionThresholdMet.false'
                                })}
                              </option>
                            </StandardSelect>
                          </StandardField>
                        )}
                      </SimpleGrid>
                    )}

                  {/* F44: quantitative UC-IPM monitoring count — the measured number behind the
                        scouting/trap decision (e.g. 5 mites/leaf, 12% fruit infested). */}
                  {(pestType === 'SC' || pestType === 'TM' || pestType === 'PI') && (
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={6}>
                      <StandardField
                        label={
                          intl.formatMessage({ id: 'events.pest.fields.monitoringCount' }) ||
                          'Monitoring Count'
                        }
                        helpText="Measured count (e.g. 5 mites per leaf, 12% fruit infested)">
                        <StandardInput
                          type="number"
                          min="0"
                          step="0.1"
                          {...methods.register('monitoring_count')}
                          placeholder="e.g., 5"
                        />
                      </StandardField>
                      <StandardField
                        label={
                          intl.formatMessage({ id: 'events.pest.fields.monitoringUnit' }) ||
                          'Count Unit'
                        }
                        helpText="UC IPM monitoring unit">
                        <StandardSelect {...methods.register('monitoring_unit')}>
                          <option value="">
                            {intl.formatMessage({ id: 'events.pest.options.selectUnit' })}
                          </option>
                          <option value="per_leaf">
                            {intl.formatMessage({
                              id: 'events.pest.options.monitoringUnit.perLeaf'
                            })}
                          </option>
                          <option value="per_trap">
                            {intl.formatMessage({
                              id: 'events.pest.options.monitoringUnit.perTrap'
                            })}
                          </option>
                          <option value="per_tree">
                            {intl.formatMessage({
                              id: 'events.pest.options.monitoringUnit.perTree'
                            })}
                          </option>
                          <option value="per_100_fruit">
                            {intl.formatMessage({
                              id: 'events.pest.options.monitoringUnit.per100Fruit'
                            })}
                          </option>
                          <option value="percent_infested">
                            {intl.formatMessage({
                              id: 'events.pest.options.monitoringUnit.percentInfested'
                            })}
                          </option>
                          <option value="per_sample">
                            {intl.formatMessage({
                              id: 'events.pest.options.monitoringUnit.perSample'
                            })}
                          </option>
                        </StandardSelect>
                      </StandardField>
                    </SimpleGrid>
                  )}

                  {/* Type-Specific Implementation Details */}

                  {/* Beneficial Release Details */}
                  {(pestType === 'BR' || pestType === 'IP') && (
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={6}>
                      <StandardField
                        label={
                          intl.formatMessage({ id: 'app.beneficialSpecies' }) ||
                          'Beneficial Species'
                        }
                        helpText={
                          pestType === 'BR'
                            ? 'Natural pest control organisms released'
                            : 'Beneficial species used in IPM strategy (if applicable)'
                        }>
                        <StandardInput
                          {...methods.register('beneficial_species')}
                          placeholder="e.g., Ladybugs, Lacewings, Predatory mites"
                        />
                      </StandardField>

                      {!multiTarget && (
                        <StandardField
                          label={
                            intl.formatMessage({ id: 'app.releaseQuantity' }) || 'Release Quantity'
                          }
                          helpText={
                            pestType === 'BR'
                              ? 'Number and density of beneficials released'
                              : 'Quantity of beneficial organisms used (if applicable)'
                          }>
                          <StandardInput
                            {...methods.register('release_quantity')}
                            placeholder="e.g., 1000 individuals per hectare"
                          />
                        </StandardField>
                      )}
                    </SimpleGrid>
                  )}

                  {/* Beneficial-Release Traceability (BR) — NOP 7 CFR 205.206 source documentation.
                        BR only (not IP): a certifier needs the SOURCE of any introduced biological control. */}
                  {pestType === 'BR' && (
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
                      <StandardField
                        label={
                          intl.formatMessage({ id: 'events.pest.fields.beneficialSupplier' }) ||
                          'Beneficial Supplier'
                        }
                        helpText="Insectary / supplier the beneficials came from (NOP traceability)">
                        <StandardInput
                          {...methods.register('beneficial_supplier')}
                          placeholder="e.g., Rincon-Vitova Insectaries"
                        />
                      </StandardField>
                      <StandardField
                        label={
                          intl.formatMessage({ id: 'events.pest.fields.beneficialLotNumber' }) ||
                          'Lot / Batch #'
                        }
                        helpText="Supplier lot or batch number">
                        <StandardInput
                          {...methods.register('beneficial_lot_number')}
                          placeholder="e.g., LOT-2026-0412"
                        />
                      </StandardField>
                      <StandardField
                        label={
                          intl.formatMessage({
                            id: 'events.pest.fields.beneficialOrganicApproved'
                          }) || 'Organic basis'
                        }
                        helpText={intl.formatMessage({
                          id: 'events.pest.fields.beneficialOrganicBasisHelp'
                        })}>
                        <StandardSelect {...methods.register('beneficial_organic_approved')}>
                          <option value="">
                            {intl.formatMessage({ id: 'events.pest.options.select' })}
                          </option>
                          <option value="yes">
                            {intl.formatMessage({ id: 'app.yes' }) || 'Yes'}
                          </option>
                          <option value="no">{intl.formatMessage({ id: 'app.no' }) || 'No'}</option>
                          <option value="unknown">
                            {intl.formatMessage({ id: 'app.unknown' }) || 'Unknown'}
                          </option>
                        </StandardSelect>
                      </StandardField>
                    </SimpleGrid>
                  )}

                  {/* Trap Monitoring Details */}
                  {pestType === 'TM' && (
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={6}>
                      <StandardField
                        label={intl.formatMessage({ id: 'app.trapCount' }) || 'Number of Traps'}
                        helpText="Monitoring traps deployed for pest detection">
                        <StandardInput
                          type="number"
                          min="0"
                          {...methods.register('trap_count')}
                          placeholder="0"
                        />
                      </StandardField>
                      <StandardField
                        label={
                          intl.formatMessage({ id: 'events.pest.fields.trapType' }) || 'Trap Type'
                        }
                        helpText="Kind of trap deployed">
                        <StandardSelect {...methods.register('trap_type')}>
                          <option value="">
                            {intl.formatMessage({ id: 'events.pest.options.select' })}
                          </option>
                          <option value="sticky">
                            {intl.formatMessage({ id: 'events.pest.options.trapType.sticky' })}
                          </option>
                          <option value="pheromone">
                            {intl.formatMessage({ id: 'events.pest.options.trapType.pheromone' })}
                          </option>
                          <option value="delta">
                            {intl.formatMessage({ id: 'events.pest.options.trapType.delta' })}
                          </option>
                          <option value="bucket_funnel">
                            {intl.formatMessage({
                              id: 'events.pest.options.trapType.bucketFunnel'
                            })}
                          </option>
                          {/* Vertebrate traps (§E-7): UC Davis organic-almond practice is
                              gopher traps 2x/yr and ground-squirrel traps 6x/yr. */}
                          <option value="gopher_trap">
                            {intl.formatMessage({ id: 'events.pest.options.trapType.gopherTrap' })}
                          </option>
                          <option value="ground_squirrel_trap">
                            {intl.formatMessage({
                              id: 'events.pest.options.trapType.groundSquirrelTrap'
                            })}
                          </option>
                          <option value="other">{intl.formatMessage({ id: 'app.other' })}</option>
                        </StandardSelect>
                      </StandardField>
                      <StandardField
                        label={
                          intl.formatMessage({ id: 'events.pest.fields.pestCatchCount' }) ||
                          'Insects Caught'
                        }
                        helpText="Total insects caught — not the number of traps">
                        <StandardInput
                          type="number"
                          min="0"
                          {...methods.register('pest_catch_count')}
                          placeholder="0"
                        />
                      </StandardField>
                    </SimpleGrid>
                  )}
                </SectionBox>
              )}

              {/* IPM Strategy Implementation — EVERY pest event, no subtype and no summary-mode
                  gate. The audit export runs its § 205.206(a) check over all pest events and
                  prints "0/N have IPM strategy — fill before inspection" on page 1 of the
                  certifier dossier. Gating the only input on pestType === 'IP' made that finding
                  unclearable for the two events an organic orchard logs most — trap monitoring
                  and beneficial release — which ARE the § 205.206(b)-(d) practices the rule asks
                  about. It lives outside the block above because that block is hidden for an
                  aggregate scouting event (isSummaryMode && SC), which would have left the same
                  finding unclearable for a whole season rolled into one record. */}
              <SectionBox>
                <SectionHeader
                  icon={FaCheckCircle}
                  title={intl.formatMessage({ id: 'events.section.pest.ipm' })}
                  badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                  description="The certifier export checks these two records on every pest event, whatever its type."
                />
                <StandardField
                  label={
                    intl.formatMessage({ id: 'app.impStrategy' }) || 'IPM Strategy Description'
                  }
                  helpText="Describe the comprehensive integrated pest management approach implemented (NOP 7 CFR 205.206(a) — required on every pest event in the certifier export)">
                  <StandardTextarea
                    {...methods.register('ipm_strategy')}
                    placeholder={
                      intl.formatMessage({ id: 'app.enterImpStrategy' }) ||
                      'Describe your integrated pest management strategy: cultural practices, biological controls, targeted treatments, monitoring methods, prevention measures...'
                    }
                    rows={4}
                  />
                </StandardField>

                {/* Threshold Rationale — also every subtype, for the same reason and now with
                    a sharper one. "Economic Threshold Status" renders on ALL pest subtypes and
                    its answer is now promoted onto the action_threshold_met column, so the
                    export's § 205.206(e) check ("threshold met but no rationale") can finally
                    fire on a trap-monitoring or beneficial-release event. Leaving this field
                    gated to SC/TA/IP would have made THAT finding the next unclearable one. */}
                <StandardField
                  label="Threshold Rationale"
                  helpText="Explain why the action threshold was or was not met (NOP 7 CFR 205.206(e)) — required by the certifier export whenever you answer that the threshold WAS met">
                  <StandardTextarea
                    {...methods.register('threshold_rationale')}
                    placeholder="e.g., 28 navel orangeworm across 8 traps (3.5/trap), below our 5/trap treatment threshold — no material applied..."
                    rows={3}
                  />
                </StandardField>
              </SectionBox>

              {/* § 205.206(b) biological control + § 205.202(b) chemical-free interval */}
              <SectionBox>
                <SectionHeader
                  icon={FaSeedling}
                  title={intl.formatMessage({ id: 'events.section.bioControl.title' })}
                  badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                  description={intl.formatMessage({ id: 'events.section.bioControl.desc' })}
                />{' '}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <StandardField
                    label="Beneficial Insects Used"
                    helpText="Are you using beneficial insects as part of your IPM strategy?">
                    <StandardSelect {...methods.register('beneficial_insects_used')}>
                      <option value="">
                        {intl.formatMessage({ id: 'events.pest.options.selectStatus' })}
                      </option>
                      <option value="yes">
                        {intl.formatMessage({
                          id: 'events.pest.options.beneficialInsectsUsed.yes'
                        })}
                      </option>
                      <option value="no">
                        {intl.formatMessage({ id: 'events.pest.options.beneficialInsectsUsed.no' })}
                      </option>
                      <option value="planning">
                        {intl.formatMessage({
                          id: 'events.pest.options.beneficialInsectsUsed.planning'
                        })}
                      </option>
                    </StandardSelect>
                  </StandardField>

                  <StandardField
                    label="Chemical-Free Period (Days)"
                    helpText="Days since the last synthetic application on this ground. Your certifier reads it against the § 205.202(b) 36-month requirement.">
                    <StandardInput
                      type="number"
                      min="0"
                      step="1"
                      {...methods.register('chemical_free_period_days')}
                      placeholder="e.g., 30"
                    />
                  </StandardField>
                </SimpleGrid>
              </SectionBox>

              {/* NOP Compliance: Pest ID & Threshold Documentation (7 CFR 205.206).
                  'TM' included: the certifier export prints an "Identified By" column for
                  every pest row, and a trap count is a pest identification — the reader of
                  the traps is exactly who § 205.206 wants named. Without TM here the column
                  was permanently "—" on the monitoring events that drive the whole record. */}
              {(pestType === 'SC' ||
                pestType === 'PI' ||
                pestType === 'TA' ||
                pestType === 'TM' ||
                pestType === 'IP') && (
                <SectionBox borderColor="green.200">
                  <SectionHeader
                    icon={FaCheckCircle}
                    title={intl.formatMessage({ id: 'events.section.pest.identification' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    description="Required documentation for NOP organic certification: pest identification verification and action threshold rationale (7 CFR 205.206)."
                  />

                  {/* Identified By — PI, SC, TA, TM subtypes */}
                  {(pestType === 'PI' ||
                    pestType === 'SC' ||
                    pestType === 'TA' ||
                    pestType === 'TM') && (
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                      {/* One label set: the options render the same `enums.identified_by.*` keys
                          the detail view reads back, and the label says whose statement it is.
                          Trazo does not check who identified a pest, so nothing here may read as
                          a licence or a verification. */}
                      <StandardField
                        label={intl.formatMessage({ id: 'events.pest.fields.identifiedBy' })}
                        helpText={intl.formatMessage({
                          id: 'events.pest.fields.identifiedByHelp'
                        })}>
                        <StandardSelect {...methods.register('identified_by')}>
                          <option value="">
                            {intl.formatMessage({ id: 'events.pest.options.selectIdentifier' })}
                          </option>
                          {IDENTIFIED_BY.map((option) => (
                            <option key={option.value} value={option.value}>
                              {intl.formatMessage({ id: option.labelKey })}
                            </option>
                          ))}
                        </StandardSelect>
                      </StandardField>

                      {/* Identification Method — PI, SC subtypes */}
                      {(pestType === 'PI' || pestType === 'SC') && (
                        <StandardField
                          label="Identification Method"
                          helpText="How the pest was identified (NOP documentation)">
                          <StandardInput
                            {...methods.register('identification_method')}
                            placeholder="e.g., Visual inspection using 10x hand lens, UC Davis IPM field guide"
                          />
                        </StandardField>
                      )}
                    </SimpleGrid>
                  )}

                  {/* Threshold Rationale moved OUT of this subtype-gated box — see the
                      "IPM Documentation (7 CFR 205.206)" section above. Registering it here as
                      well would mount the same react-hook-form field twice for SC/TA/IP. */}
                </SectionBox>
              )}

              {/* Phase 2: Universal Field Details - variety, block_id for traceability */}
              {/* NOTE: growth_stage omitted here — PestManagement already has crop_growth_stage */}
              {/* in "Agricultural Context & Conditions" with IPM-specific stage choices */}
              <SectionBox>
                <SectionHeader
                  icon={FaSeedling}
                  title={intl.formatMessage({ id: 'fieldDetails.title' })}
                  badge={intl.formatMessage({ id: 'fieldDetails.badge' })}
                  description={intl.formatMessage({ id: 'fieldDetails.description' })}
                />
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
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
                </SimpleGrid>
              </SectionBox>

              {/* Transparency Notes & Observations */}
              {/* Standardized: Always visible (matches ChemicalTab pattern - observations section stays visible in summary mode) */}
              <SectionBox>
                <SectionHeader
                  icon={FaSeedling}
                  title={intl.formatMessage({ id: 'events.section.fieldNotes' })}
                  badge={intl.formatMessage({ id: 'events.section.badge.certifierRecordAndBuyer' })}
                />

                <StandardField
                  label={intl.formatMessage({ id: 'app.observations' }) || 'Observations & Notes'}
                  helpText={intl.formatMessage({ id: 'events.common.help.observationAudience' })}>
                  <StandardTextarea
                    {...methods.register('observation')}
                    placeholder="Optional: Describe your IPM approach, beneficial insect populations observed, organic methods used, sustainability goals, etc. These details help consumers understand your natural pest management methods."
                    rows={4}
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
                    {...methods.register('private_note')}
                  />
                </StandardField>

                <SupervisorSignOff control={methods.control} />
              </SectionBox>
            </>

            {/* Phase 2.3: Custom Fields Section */}
            <CustomFieldsForm
              customFields={customFields}
              onCustomFieldsChange={setCustomFields}
              eventTypeId={6}
              disabled={false}
            />

            {/* Action Buttons */}
            {!hideActions && (
              <HStack
                justify="space-between"
                pt={6}
                mt={4}
                borderTop="1px"
                borderColor={borderColor}>
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
            )}
          </VStack>
        </form>
      </FormProvider>
    );
  }
);

// Add display name for better debugging
PestManagementTab.displayName = 'PestManagementTab';

export default PestManagementTab;
