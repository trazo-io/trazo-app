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
  Switch,
  Badge
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
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, array } from 'zod';
import CustomFieldsForm from './CustomFieldsForm';
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
// Event Field Registry (Phase 5G — form integration)
import { useFormFields } from 'src/hooks/useFormFields';
import { RegistryFormField } from 'src/components/Forms/RegistryFormField';
import { RegistryFormSections } from 'src/components/Forms/RegistryFormSections';

// Forms keep their rich hand-crafted rendering. Registry drives display surfaces only.
const USE_FIELD_REGISTRY = false;

// Sprint 3 Epic 3.1: Fuel types with EPA-verified emission factors (aligned with Production/Soil forms)
// UPDATED 2026-02-15: All factors corrected to match EPA 40 CFR Part 98 Table C-1
const FUEL_TYPES = [
  { value: 'diesel', label: '⛽ Diesel', factor: '2.70 kg CO₂e/L' },
  { value: 'gasoline', label: '⛽ Gasoline', factor: '2.32 kg CO₂e/L' },
  { value: 'natural_gas', label: '💨 Natural Gas', factor: '1.92 kg CO₂e/m³' },
  { value: 'propane', label: '🔥 LPG / Propane', factor: '1.51 kg CO₂e/L' },
  { value: 'electric', label: '⚡ Electric', factor: '0.39 kg CO₂e/kWh' },
  { value: 'biodiesel', label: '🌿 Biodiesel', factor: '2.31 kg CO₂e/L' },
  { value: 'none', label: '🔧 No Fuel / Manual', factor: '0 kg CO₂e' }
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
  economic_threshold_met: string().optional(), // Changed to string for StandardSelect
  action_recommended: string().optional(),
  // Existing pest management fields
  pest_species: string().optional(),
  pest_pressure_level: string().optional(),
  beneficial_species: string().optional(),
  release_quantity: string().optional(),
  trap_count: string().optional(),
  damage_percentage: string().optional(),
  action_threshold_met: string().optional(), // Changed to string for StandardSelect
  ipm_strategy: string().optional(),
  observation: string().optional(),
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
});

const PestManagementTab = forwardRef(
  ({ onSubmitHandler, onDataChange, onPrev, initialValues = {}, hideActions = false }, ref) => {
    const intl = useIntl();
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    // INFINITE LOOP FIX: Track last sent values to prevent duplicate onDataChange calls
    const lastSentValuesRef = useRef(null);

    const methods = useForm({
      resolver: zodResolver(pestSchema),
      defaultValues: {
        type: initialValues.type || 'SC',
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
        area_unit: initialValues.area_unit || 'ha', // Metric default for consistency
        // Sprint 3 Epic 3.1: Fuel & Equipment fields (aligned with Production/Soil forms)
        fuel_type: initialValues.fuel_type || '', // EPA emission factor selection
        fuel_consumed: initialValues.fuel_consumed || '',
        fuel_unit: initialValues.fuel_unit || 'L', // Aligned with other forms (L, gal, kg, kWh)
        equipment_hours: initialValues.equipment_hours?.toString() || '',
        production_efficiency: initialValues.production_efficiency || '',
        // Agricultural decision fields
        crop_growth_stage: initialValues.crop_growth_stage || '',
        weather_conditions: initialValues.weather_conditions || '',
        economic_threshold_met: initialValues.economic_threshold_met?.toString() || '',
        action_recommended: initialValues.action_recommended || '',
        // Existing pest management fields
        pest_species: initialValues.pest_species || '',
        pest_pressure_level: (initialValues.pest_pressure_level || '').toLowerCase(), // F37: lowercased so legacy Capitalized values match the now-lowercase options on edit
        beneficial_species: initialValues.beneficial_species || '',
        release_quantity: initialValues.release_quantity || '',
        trap_count: initialValues.trap_count?.toString() || '',
        damage_percentage: initialValues.damage_percentage?.toString() || '',
        action_threshold_met: initialValues.action_threshold_met?.toString() || '',
        ipm_strategy: initialValues.ipm_strategy || '',
        observation: initialValues.observation || '',
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
          area_unit: initialValues.area_unit || 'ha',
          // Sprint 3 Epic 3.1: Fuel & Equipment fields (aligned with Production/Soil forms)
          fuel_type: initialValues.fuel_type || '',
          fuel_consumed: initialValues.fuel_consumed || '',
          fuel_unit: initialValues.fuel_unit || 'L',
          equipment_hours: initialValues.equipment_hours?.toString() || '',
          production_efficiency: initialValues.production_efficiency || '',
          // Agricultural decision fields
          crop_growth_stage: initialValues.crop_growth_stage || '',
          weather_conditions: initialValues.weather_conditions || '',
          economic_threshold_met: initialValues.economic_threshold_met?.toString() || '',
          action_recommended: initialValues.action_recommended || '',
          // Existing pest management fields
          pest_species: initialValues.pest_species || '',
          pest_pressure_level: (initialValues.pest_pressure_level || '').toLowerCase(), // F37: lowercased so legacy Capitalized values match the now-lowercase options on edit
          beneficial_species: initialValues.beneficial_species || '',
          release_quantity: initialValues.release_quantity || '',
          trap_count: initialValues.trap_count?.toString() || '',
          damage_percentage: initialValues.damage_percentage?.toString() || '',
          action_threshold_met: initialValues.action_threshold_met?.toString() || '',
          ipm_strategy: initialValues.ipm_strategy || '',
          observation: initialValues.observation || '',
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
      'pest_species',
      'crop_growth_stage',
      'economic_threshold_met',
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
        // REMOVED: observation → description mapping now handled universally in cleanEventData
        trap_count: data.trap_count ? parseInt(data.trap_count) : null,
        damage_percentage: data.damage_percentage ? parseFloat(data.damage_percentage) : null,
        // NOP Compliance: Model fields — empty string → null for backend CharField/TextField
        threshold_rationale: data.threshold_rationale || null,
        identified_by: data.identified_by || null,
        identification_method: data.identification_method || null,
        // Sprint 5: Aggregate Pest Scouting Support
        extra_data: {
          // Existing extra_data fields (if any)
          ...(data.extra_data || {}),
          // FIX: PestManagementEvent has no `name` model field - persist in extra_data
          ...(data.name && { name: data.name }),
          // Agricultural context fields (no model columns - persist in extra_data)
          ...(data.crop_growth_stage && { crop_growth_stage: data.crop_growth_stage }),
          ...(data.economic_threshold_met && {
            economic_threshold_met: data.economic_threshold_met
          }),
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
            area_unit: data.area_unit || 'ha',
            // Sprint 3 Epic 3.1: Fuel & Equipment fields (aligned with Production/Soil forms)
            fuel_type: data.fuel_type || null,
            fuel_consumed_total: data.fuel_consumed_total
              ? parseFloat(data.fuel_consumed_total)
              : null,
            fuel_unit: data.fuel_unit || 'L',
            equipment_hours: data.equipment_hours ? parseFloat(data.equipment_hours) : null,
            production_efficiency: data.production_efficiency || null,
            // Pest observations summary
            pest_species_observed: data.pest_species_observed || null,
            average_pest_pressure: data.average_pest_pressure || null,
            // Auto-populate from Farmer's Field Notes (observation field) to avoid redundant input
            observations_summary: data.observations_summary || data.observation || null,
            // Zero carbon marker for pest scouting
            carbon_impact: 'zero',
            carbon_notes: 'Pest scouting is observational and does not directly produce emissions'
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
            {/* Transparency Focus Alert */}
            <StandardAlert status="info" title="Pest Management & Transparency Documentation">
              <HStack spacing={2} mb={2}>
                <Icon as={FaBug} color="green.500" />
                <Text fontSize="sm" fontWeight="bold">
                  Integrated Pest Management Transparency
                </Text>
              </HStack>
              <Text fontSize="sm">
                Document your IPM practices to build consumer trust through transparent sustainable
                pest management. This helps consumers understand your commitment to environmentally
                responsible farming methods.
              </Text>
            </StandardAlert>

            {USE_FIELD_REGISTRY ? (
              <RegistryFormSections
                eventType="pest_management"
                subtype={watch('type')}
                control={methods.control}
                eventData={methods.getValues()}
                errors={errors}
              />
            ) : (
              <>
                {/* Basic Event Information */}
                <SectionBox variant="default">
                  <SectionHeader
                    icon={FaBug}
                    iconColor="green.600"
                    title="Pest Management Event Information"
                    badge="Transparency Tracking"
                    badgeColorScheme="green"
                  />

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {/* FIRST: Event Type (standardized order - matches other forms) */}
                    <StandardField
                      label={
                        intl.formatMessage({ id: 'app.pestManagementEventType' }) ||
                        'Pest Management Event Type'
                      }
                      required
                      error={errors.type?.message}
                    >
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
                      </StandardSelect>
                    </StandardField>

                    {/* SECOND: Event Name (standardized order - matches other forms) */}
                    <StandardField
                      label={intl.formatMessage({ id: 'app.eventName' }) || 'Event Name'}
                      required
                      error={errors.name?.message}
                    >
                      <StandardInput
                        {...methods.register('name')}
                        placeholder="e.g., Pest Scouting, Beneficial Release"
                      />
                    </StandardField>
                  </SimpleGrid>
                </SectionBox>

                {/* Sprint 5: Aggregate Pest Scouting Support - Summary Mode Toggle */}
                {/* Standardized: blue color scheme for toggle (matches Production/Chemical summary mode pattern) */}
                {pestType === 'SC' && (
                  <Box
                    p={4}
                    bg={isSummaryMode ? 'blue.50' : 'gray.50'}
                    borderRadius="md"
                    border="1px solid"
                    borderColor={isSummaryMode ? 'blue.200' : 'gray.200'}
                    mb={4}
                  >
                    <HStack justify="space-between" align="center">
                      <VStack align="start" spacing={0}>
                        <HStack>
                          <Text fontWeight="semibold" fontSize="sm">
                            📊 Scouting Summary Mode
                          </Text>
                          {isSummaryMode && (
                            <Badge colorScheme="blue" size="sm">
                              Active
                            </Badge>
                          )}
                        </HStack>
                        <Text fontSize="xs" color="gray.600">
                          {isSummaryMode
                            ? 'Log multiple scouting trips as one summary (e.g., "24 weekly scouting trips")'
                            : 'Enable to log multiple scouting trips at once'}
                        </Text>
                      </VStack>
                      <Controller
                        name="is_summary"
                        control={methods.control}
                        render={({ field }) => (
                          <Switch
                            colorScheme="blue"
                            size="lg"
                            isChecked={field.value === 'true'}
                            onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                          />
                        )}
                      />
                    </HStack>

                    {/* Benefits of Summary Mode - Standardized: blue color scheme (matches Chemical pattern) */}
                    {isSummaryMode && (
                      <Box mt={3} p={2} bg="blue.100" borderRadius="md">
                        <Text fontSize="xs" color="blue.700">
                          <Icon as={FaCheckCircle} mr={1} />
                          {/* F38 fix (2026-06): removed unsourced "93% time savings" stat (compliance: no fabricated statistics). */}
                          <strong>Save time:</strong> Log multiple scouting trips with one entry.
                        </Text>
                        <Text fontSize="xs" color="blue.600" mt={1}>
                          <Icon as={FaLeaf} mr={1} />
                          Zero Carbon Impact - Scouting is observational
                        </Text>
                      </Box>
                    )}
                  </Box>
                )}

                {/* Sprint 5: Aggregate Pest Scouting Fields (shown when summary mode is active for SC) */}
                {isSummaryMode && pestType === 'SC' && (
                  <Box
                    p={4}
                    bg="green.50"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="green.200"
                    mb={4}
                  >
                    <Text fontWeight="semibold" color="green.700" mb={4}>
                      <Icon as={FaCalendarAlt} mr={2} />
                      Aggregate Scouting Period
                    </Text>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                      <StandardField
                        label="Period Start Date"
                        helpText="When did this scouting period begin?"
                        required
                      >
                        <StandardInput type="date" {...methods.register('date_start')} />
                      </StandardField>

                      <StandardField
                        label="Period End Date"
                        helpText="When did this scouting period end?"
                        required
                      >
                        <StandardInput type="date" {...methods.register('date_end')} />
                      </StandardField>
                    </SimpleGrid>

                    <StandardField
                      label="Number of Scouting Trips"
                      helpText="Total scouting trips during this period"
                      required
                    >
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
                        helpText="Combined area scouted across all trips"
                      >
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
                                <option value="ha">Hectares</option>
                                <option value="acres">Acres</option>
                              </StandardSelect>
                            )}
                          />
                        </HStack>
                      </StandardField>

                      {/* Standardized: Using fuel_consumed_total like other forms */}
                      <StandardField
                        label="Total Fuel Consumed"
                        helpText="Combined fuel consumed across all trips"
                      >
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
                                <option value="L">Liters</option>
                                <option value="gal">Gallons</option>
                                <option value="kg">Kilograms</option>
                                <option value="kWh">Kilowatt-hours</option>
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
                      label="Pest Species Observed"
                      helpText="List all pest species observed during the scouting period (comma-separated)"
                    >
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
                      helpText="Overall pest pressure during the scouting period"
                    >
                      <Controller
                        name="average_pest_pressure"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardSelect {...field}>
                            <option value="">Select pressure level</option>
                            <option value="none">None - No pests observed</option>
                            <option value="low">Low - Below treatment threshold</option>
                            <option value="moderate">Moderate - At treatment threshold</option>
                            <option value="high">High - Above treatment threshold</option>
                            <option value="severe">Severe - Immediate action required</option>
                          </StandardSelect>
                        )}
                      />
                    </StandardField>

                    {/* Removed: observations_summary textarea - redundant with "Farmer's Field Notes" section
                   which is now always visible (matching ChemicalTab pattern where aggregate sections
                   only contain quantitative fields). The observation field maps to description and
                   is auto-copied to observations_summary in onSubmit for ConsumerEventCard display. */}

                    {/* Zero Carbon Note */}
                    <Box
                      mt={4}
                      p={3}
                      bg="teal.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="teal.200"
                    >
                      <HStack spacing={2} mb={1}>
                        <Icon as={FaLeaf} color="teal.500" fontSize="sm" />
                        <Text fontSize="sm" fontWeight="semibold" color="teal.700">
                          Zero Carbon Impact
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="teal.600">
                        Pest scouting is observational and does not produce direct emissions.
                        <br />
                        {/* F38 fix (2026-06): removed unsourced "+30 points" figure and the
                            FAO attribution that did not substantiate it (compliance: no
                            fabricated statistics or unsourced claims). */}
                        <strong>Transparency Score Bonus:</strong> Comprehensive scouting
                        documentation improves your transparency score by demonstrating IPM best
                        practices.
                      </Text>
                    </Box>
                  </Box>
                )}

                {/* Agricultural Context Section - Critical for Carbon Calculations */}
                {/* Sprint 5: Hide individual fields when in Summary Mode for Scouting - aggregate fields replace them */}
                {!(isSummaryMode && pestType === 'SC') && (
                  <SectionBox variant="highlighted" borderColor="green.200">
                    <SectionHeader
                      icon={FaRulerHorizontal}
                      iconColor="green.600"
                      title="Field Area & Context"
                      badge="Carbon Calculation Required"
                      badgeColorScheme="green"
                    />

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {/* Sprint 2 Epic 2.2: Flexible units - user can select hectares or acres */}
                      <StandardField
                        label="Area Covered"
                        required
                        helpText="Area needed for carbon calculation (select your preferred unit)"
                      >
                        <HStack spacing={2}>
                          <StandardInput
                            flex={2}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="2.5"
                            {...methods.register('area_covered')}
                          />
                          <StandardSelect flex={1} {...methods.register('area_unit')}>
                            <option value="ha">Hectares</option>
                            <option value="acres">Acres</option>
                          </StandardSelect>
                        </HStack>
                      </StandardField>
                    </SimpleGrid>
                  </SectionBox>
                )}

                {/* Sprint 3 Epic 3.1: Fuel & Equipment Operations Section (aligned with Production/Soil forms) */}
                {!(isSummaryMode && pestType === 'SC') && (
                  <SectionBox variant="highlighted">
                    <SectionHeader
                      icon={FaSeedling}
                      iconColor="green.600"
                      title="Fuel Consumption & Equipment Data"
                      badge="Enhanced Carbon Accuracy"
                      badgeColorScheme="green"
                      description="Document your actual equipment usage and fuel consumption to build consumer trust through transparent farming practices. These details help consumers understand the real operational impact of your production operations."
                    />

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {/* Fuel Type Selector - for accurate EPA emission factor calculation */}
                      <StandardField
                        label="Fuel Type"
                        helpText="Select a fuel type only if powered equipment was used. Leave blank for hand/manual operations."
                      >
                        <StandardSelect
                          placeholder="Select fuel type..."
                          {...methods.register('fuel_type')}
                        >
                          {FUEL_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label} ({type.factor})
                            </option>
                          ))}
                        </StandardSelect>
                      </StandardField>

                      {/* Dynamic Fuel Consumed label based on fuel type */}
                      <StandardField
                        label={
                          watch('fuel_type') === 'electric'
                            ? 'Energy Amount (kWh)'
                            : 'Fuel Consumed'
                        }
                        helpText={
                          watch('fuel_type') === 'electric'
                            ? 'Energy consumption for carbon emission calculation'
                            : 'Fuel consumption for carbon emission calculation'
                        }
                      >
                        <HStack spacing={2}>
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
                          <StandardSelect flex={1} {...methods.register('fuel_unit')}>
                            <option value="L">Liters</option>
                            <option value="gal">Gallons</option>
                            <option value="kg">Kilograms</option>
                            <option value="kWh">Kilowatt-hours</option>
                          </StandardSelect>
                        </HStack>
                      </StandardField>

                      {/* Equipment Operating Hours */}
                      <StandardField
                        label="Equipment Operating Hours"
                        helpText="Used for calculating fuel efficiency and carbon per hour"
                      >
                        <StandardInput
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="e.g., 3.5"
                          {...methods.register('equipment_hours')}
                        />
                      </StandardField>

                      {/* Production Efficiency */}
                      <StandardField
                        label="Production Efficiency"
                        helpText="Equipment efficiency rating for carbon scoring"
                      >
                        <StandardSelect {...methods.register('production_efficiency')}>
                          <option value="">Select efficiency level</option>
                          <option value="high">High Efficiency</option>
                          <option value="normal">Normal Efficiency</option>
                          <option value="low">Low Efficiency</option>
                        </StandardSelect>
                      </StandardField>
                    </SimpleGrid>
                  </SectionBox>
                )}

                {/* Agricultural Decision Context */}
                <SectionBox variant="default">
                  <SectionHeader
                    icon={FaCloudSun}
                    iconColor="green.600"
                    title="Agricultural Context & Conditions"
                    badge="IPM Decision Support"
                    badgeColorScheme="green"
                  />

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <StandardField
                      label="Crop Growth Stage"
                      helpText="Current crop development stage"
                    >
                      <StandardSelect {...methods.register('crop_growth_stage')}>
                        <option value="">Select growth stage</option>
                        <option value="seedling">Seedling</option>
                        <option value="vegetative">Vegetative Growth</option>
                        <option value="flowering">Flowering</option>
                        <option value="fruit_development">Fruit Development</option>
                        <option value="maturity">Maturity</option>
                        <option value="harvest">Harvest</option>
                      </StandardSelect>
                    </StandardField>

                    {/* Sprint 2 Epic 2.2: Removed weather_conditions field - duplicates Weather event
                  Pest pressure is tracked via pest_pressure_level dropdown in the assessment section */}

                    <StandardField
                      label="Economic Threshold Status"
                      helpText="Has economic threshold been reached?"
                    >
                      <StandardSelect {...methods.register('economic_threshold_met')}>
                        <option value="">Select status</option>
                        <option value="true">
                          Yes - Economic threshold met, action recommended
                        </option>
                        <option value="false">No - Below economic threshold</option>
                      </StandardSelect>
                    </StandardField>

                    <StandardField
                      label="Action Recommended"
                      helpText="Next steps from this IPM activity"
                    >
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
                  <SectionBox variant="default">
                    <SectionHeader
                      icon={FaEye}
                      iconColor="green.600"
                      title="Pest Management Details"
                      badge="IPM Documentation"
                      badgeColorScheme="green"
                    />

                    {/* Universal Pest Context Fields - All Types */}
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={6}>
                      <StandardField
                        label={intl.formatMessage({ id: 'app.pestSpecies' }) || 'Pest Species'}
                        helpText="Help consumers understand what pests you're managing"
                      >
                        <StandardInput
                          {...methods.register('pest_species')}
                          placeholder="e.g., Aphids, Spider mites, Thrips"
                        />
                      </StandardField>

                      <StandardField
                        label={
                          intl.formatMessage({ id: 'app.damagePercentage' }) ||
                          'Crop Impact Level (%)'
                        }
                        helpText="Percentage of crop damage observed (for transparency)"
                      >
                        <StandardInput
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          {...methods.register('damage_percentage')}
                          placeholder="0.0"
                        />
                      </StandardField>
                    </SimpleGrid>

                    {/* Pest Pressure Assessment - Most Types */}
                    {(pestType === 'SC' ||
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
                          }
                        >
                          {/* F37 fix (2026-06): lowercase values to match the scouting
                              `average_pest_pressure` field and the registry/tests
                              (pestEvent.ts, pestEvent.test.ts use 'low'/'moderate').
                              Previously Capitalized ("Low"/"Critical"), giving two
                              casings for one concept and risking visibleWhen/normalizer
                              mismatches. Labels (i18n) unchanged; formatPestPressure
                              already lowercases on lookup so display is unaffected. */}
                          <StandardSelect {...methods.register('pest_pressure_level')}>
                            <option value="">Select pressure level</option>
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
                            }
                          >
                            <StandardSelect {...methods.register('action_threshold_met')}>
                              <option value="">Select status</option>
                              <option value="true">
                                {intl.formatMessage({ id: 'app.actionThresholdMet' }) ||
                                  'Yes - Economic threshold met, action required'}
                              </option>
                              <option value="false">No - Below action threshold</option>
                            </StandardSelect>
                          </StandardField>
                        )}
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
                          }
                        >
                          <StandardInput
                            {...methods.register('beneficial_species')}
                            placeholder="e.g., Ladybugs, Lacewings, Predatory mites"
                          />
                        </StandardField>

                        <StandardField
                          label={
                            intl.formatMessage({ id: 'app.releaseQuantity' }) || 'Release Quantity'
                          }
                          helpText={
                            pestType === 'BR'
                              ? 'Number and density of beneficials released'
                              : 'Quantity of beneficial organisms used (if applicable)'
                          }
                        >
                          <StandardInput
                            {...methods.register('release_quantity')}
                            placeholder="e.g., 1000 individuals per hectare"
                          />
                        </StandardField>
                      </SimpleGrid>
                    )}

                    {/* Trap Monitoring Details */}
                    {pestType === 'TM' && (
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={6}>
                        <StandardField
                          label={intl.formatMessage({ id: 'app.trapCount' }) || 'Number of Traps'}
                          helpText="Monitoring traps deployed for pest detection"
                        >
                          <StandardInput
                            type="number"
                            min="0"
                            {...methods.register('trap_count')}
                            placeholder="0"
                          />
                        </StandardField>
                      </SimpleGrid>
                    )}

                    {/* IPM Strategy Implementation */}
                    {pestType === 'IP' && (
                      <StandardField
                        label={
                          intl.formatMessage({ id: 'app.impStrategy' }) ||
                          'IPM Strategy Description'
                        }
                        helpText="Describe the comprehensive integrated pest management approach implemented"
                      >
                        <StandardTextarea
                          {...methods.register('ipm_strategy')}
                          placeholder={
                            intl.formatMessage({ id: 'app.enterImpStrategy' }) ||
                            'Describe your integrated pest management strategy: cultural practices, biological controls, targeted treatments, monitoring methods, prevention measures...'
                          }
                          rows={4}
                        />
                      </StandardField>
                    )}
                  </SectionBox>
                )}

                {/* Sprint 3 Epic 3.2: Consumer Trust & Transparency Fields */}
                <SectionBox variant="highlighted">
                  <SectionHeader
                    icon={FaSeedling}
                    iconColor="green.500"
                    title="Consumer Trust & Transparency"
                    badge="Builds Consumer Trust"
                    badgeColorScheme="green"
                    description="Document your sustainable pest management practices to help consumers understand your commitment to environmentally responsible farming."
                  />
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <StandardField
                      label="Beneficial Insects Used"
                      helpText="Are you using beneficial insects as part of your IPM strategy?"
                    >
                      <StandardSelect {...methods.register('beneficial_insects_used')}>
                        <option value="">Select status</option>
                        <option value="yes">Yes - Using beneficial insects</option>
                        <option value="no">No - Not currently using</option>
                        <option value="planning">Planning to introduce</option>
                      </StandardSelect>
                    </StandardField>

                    <StandardField
                      label="Chemical-Free Period (Days)"
                      helpText="Days since last synthetic chemical application (builds consumer trust)"
                    >
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

                {/* NOP Compliance: Pest ID & Threshold Documentation (7 CFR 205.206) */}
                {(pestType === 'SC' ||
                  pestType === 'PI' ||
                  pestType === 'TA' ||
                  pestType === 'IP') && (
                  <SectionBox variant="highlighted" borderColor="green.200">
                    <SectionHeader
                      icon={FaCheckCircle}
                      iconColor="green.600"
                      title="NOP Pest Identification & Threshold Traceability"
                      badge="Organic Compliance"
                      badgeColorScheme="green"
                      description="Required documentation for NOP organic certification: pest identification verification and action threshold rationale (7 CFR 205.206)."
                    />

                    {/* Identified By — PI, SC, TA subtypes */}
                    {(pestType === 'PI' || pestType === 'SC' || pestType === 'TA') && (
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                        <StandardField
                          label="Pest Identified By"
                          helpText="Who identified the pest species (NOP 7 CFR 205.206)"
                        >
                          <StandardSelect {...methods.register('identified_by')}>
                            <option value="">Select identifier</option>
                            <option value="farmer">Farmer</option>
                            <option value="agronomist">Agronomist</option>
                            <option value="entomologist">Entomologist</option>
                            <option value="extension_service">Extension Service</option>
                            <option value="crop_consultant">Crop Consultant</option>
                            <option value="lab">Laboratory Analysis</option>
                          </StandardSelect>
                        </StandardField>

                        {/* Identification Method — PI, SC subtypes */}
                        {(pestType === 'PI' || pestType === 'SC') && (
                          <StandardField
                            label="Identification Method"
                            helpText="How the pest was identified (NOP documentation)"
                          >
                            <StandardInput
                              {...methods.register('identification_method')}
                              placeholder="e.g., Visual inspection using 10x hand lens, UC Davis IPM field guide"
                            />
                          </StandardField>
                        )}
                      </SimpleGrid>
                    )}

                    {/* Threshold Rationale — SC, TA, IP subtypes */}
                    {(pestType === 'SC' || pestType === 'TA' || pestType === 'IP') && (
                      <StandardField
                        label="Threshold Rationale"
                        helpText="Explain why the action threshold was or was not met (NOP 7 CFR 205.206(e))"
                      >
                        <StandardTextarea
                          {...methods.register('threshold_rationale')}
                          placeholder="e.g., Avg 2.3 thrips/leaf on 20 sample trees, below 5/leaf economic threshold per UC Davis IPM guidelines..."
                          rows={3}
                        />
                      </StandardField>
                    )}
                  </SectionBox>
                )}

                {/* Phase 2: Universal Field Details - variety, block_id for traceability */}
                {/* NOTE: growth_stage omitted here — PestManagement already has crop_growth_stage */}
                {/* in "Agricultural Context & Conditions" with IPM-specific stage choices */}
                <SectionBox variant="default">
                  <SectionHeader
                    icon={FaSeedling}
                    iconColor="teal.500"
                    title={intl.formatMessage({ id: 'fieldDetails.title' })}
                    badge={intl.formatMessage({ id: 'fieldDetails.badge' })}
                    badgeColorScheme="teal"
                    description={intl.formatMessage({ id: 'fieldDetails.description' })}
                  />
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <StandardField
                      label={intl.formatMessage({ id: 'fieldDetails.variety' })}
                      helpText={intl.formatMessage({ id: 'fieldDetails.varietyHelp' })}
                    >
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

                    <StandardField
                      label={intl.formatMessage({ id: 'fieldDetails.blockId' })}
                      helpText={intl.formatMessage({ id: 'fieldDetails.blockIdHelp' })}
                    >
                      <Controller
                        name="block_id"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardInput
                            {...field}
                            placeholder={intl.formatMessage({
                              id: 'fieldDetails.blockIdPlaceholder'
                            })}
                          />
                        )}
                      />
                    </StandardField>
                  </SimpleGrid>
                </SectionBox>

                {/* Transparency Notes & Observations */}
                {/* Standardized: Always visible (matches ChemicalTab pattern - observations section stays visible in summary mode) */}
                <SectionBox variant="default">
                  <SectionHeader
                    icon={FaSeedling}
                    iconColor="green.500"
                    title="Farmer's Field Notes & Consumer Transparency"
                    badge="Consumer Transparency"
                    badgeColorScheme="green"
                  />

                  <StandardField
                    label={intl.formatMessage({ id: 'app.observations' }) || 'Observations & Notes'}
                    helpText="Share details about your pest management approach that help consumers understand your sustainable farming practices"
                  >
                    <StandardTextarea
                      {...methods.register('observation')}
                      placeholder="Optional: Describe your IPM approach, beneficial insect populations observed, organic methods used, sustainability goals, etc. These details help consumers understand your natural pest management methods."
                      rows={4}
                    />
                  </StandardField>
                </SectionBox>
              </>
            )}

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
                borderColor={borderColor}
              >
                <StandardButton
                  variant="outline"
                  onClick={onPrev}
                  leftIcon={<FaChevronLeft />}
                  size="lg"
                >
                  {intl.formatMessage({ id: 'app.previous' }) || 'Previous'}
                </StandardButton>
                <StandardButton
                  variant="primary"
                  type="submit"
                  rightIcon={<FaChevronRight />}
                  size="lg"
                >
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
