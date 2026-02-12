// Sprint 3 Epic 3.1: Cleaned unused Chakra imports - using StandardComponents only
// Standardized: Removed Checkbox, Switch, Input, Badge - now using StandardComponents
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
  VStack,
  HStack,
  useColorModeValue,
  Text,
  Icon,
  SimpleGrid,
  Box,
  Divider
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

// Sprint 3 Epic 3.1: Fuel types with EPA-verified emission factors (aligned with Production/Soil forms)
// UPDATED 2025-12-14: Electric factor corrected to EPA eGRID 2023 value (0.39 kg CO₂e/kWh)
const FUEL_TYPES = [
  { value: 'diesel', label: '⛽ Diesel', factor: '2.68 kg CO₂e/L' },
  { value: 'gasoline', label: '⛽ Gasoline', factor: '2.31 kg CO₂e/L' },
  { value: 'natural_gas', label: '💨 Natural Gas', factor: '2.03 kg CO₂e/m³' },
  { value: 'lpg', label: '🔥 LPG', factor: '1.70 kg CO₂e/L' },
  { value: 'electric', label: '⚡ Electric', factor: '0.39 kg CO₂e/kWh' }
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
  imp_strategy: string().optional(),
  observation: string().optional(),
  // Sprint 3 Epic 3.2: Consumer Trust Fields for transparency
  beneficial_insects_used: string().optional(), // Whether beneficial insects are being used
  chemical_free_period_days: string().optional(), // Days since last chemical application
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
        is_summary: initialValues.is_summary || 'false',
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
        pest_pressure_level: initialValues.pest_pressure_level || '',
        beneficial_species: initialValues.beneficial_species || '',
        release_quantity: initialValues.release_quantity || '',
        trap_count: initialValues.trap_count?.toString() || '',
        damage_percentage: initialValues.damage_percentage?.toString() || '',
        action_threshold_met: initialValues.action_threshold_met?.toString() || '',
        imp_strategy: initialValues.imp_strategy || '',
        observation: initialValues.observation || '',
        // Sprint 3 Epic 3.2: Consumer Trust Fields
        beneficial_insects_used: initialValues.beneficial_insects_used || '',
        chemical_free_period_days: initialValues.chemical_free_period_days?.toString() || '',
        custom_fields: initialValues.custom_fields || []
      }
    });

    // DEBOUNCE FIX: Expose flushData method to parent via ref
    // This allows NewEvent.jsx to force-sync form data before step change
    useImperativeHandle(
      ref,
      () => ({
        flushData: () => {
          if (onDataChange) {
            const currentValues = methods.getValues();
            console.log('[PestManagementTab] 🔄 flushData called - syncing form data immediately');
            onDataChange(currentValues);
          }
        }
      }),
      [onDataChange, methods]
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
          is_summary: initialValues.is_summary || 'false',
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
          pest_pressure_level: initialValues.pest_pressure_level || '',
          beneficial_species: initialValues.beneficial_species || '',
          release_quantity: initialValues.release_quantity || '',
          trap_count: initialValues.trap_count?.toString() || '',
          damage_percentage: initialValues.damage_percentage?.toString() || '',
          action_threshold_met: initialValues.action_threshold_met?.toString() || '',
          imp_strategy: initialValues.imp_strategy || '',
          observation: initialValues.observation || '',
          // Sprint 3 Epic 3.2: Consumer Trust Fields
          beneficial_insects_used: initialValues.beneficial_insects_used || '',
          chemical_free_period_days: initialValues.chemical_free_period_days?.toString() || '',
          custom_fields: initialValues.custom_fields || []
        });
      }
    }, [initialValues, methods]);

    // Sync custom fields with form
    useEffect(() => {
      methods.setValue('custom_fields', customFields);
    }, [customFields, methods]);

    const {
      watch,
      handleSubmit,
      formState: { errors }
    } = methods;
    const pestType = watch('type');

    // Sprint 5: Watch for summary mode toggle (Aggregate Pest Scouting Support)
    const isSummaryMode = watch('is_summary') === 'true';

    // Watch critical fields for real-time carbon calculation updates
    // Sprint 3 Epic 3.1: Aligned with Production/Soil forms (fuel_type, equipment_hours)
    const watchedFields = watch([
      'type',
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
      'trap_count'
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

          // Only trigger if we have meaningful user-provided data
          // Types that need area context for accurate carbon calculations
          const needsAreaValidation = ['SC', 'TM', 'BR', 'IP']; // Scouting, Trap Monitoring, Beneficial Release, IPM Implementation
          const hasValidType = currentValues.type && currentValues.type !== '';

          if (needsAreaValidation.includes(currentValues.type)) {
            // For field activities, require area for meaningful carbon calculation
            // Standardized: Using fuel_consumed (optional) like other forms - area is primary
            const hasValidArea =
              currentValues.area_covered && parseFloat(currentValues.area_covered) > 0;
            // Note: fuel_consumed is now optional - only required for IPM Implementation (IP)
            const hasValidFuel =
              currentValues.type === 'IP'
                ? currentValues.fuel_consumed && parseFloat(currentValues.fuel_consumed) >= 0
                : true; // Scouting activities don't require fuel (observational)

            if (hasValidType && hasValidArea && hasValidFuel) {
              console.log(
                '[PestManagementTab]: Triggering onDataChange with values',
                currentValues
              );
              try {
                onDataChange(currentValues);
                lastSentValuesRef.current = currentValuesString; // Store sent values
              } catch (error) {
                console.error('[PestManagementTab]: Error calling onDataChange:', error);
              }
            } else {
              console.log('[PestManagementTab]: Skipping calculation - missing required fields');
            }
          } else if (hasValidType) {
            // For non-field activities (PI, TA), just require type
            // eslint-disable-next-line no-undef
            if (process.env.NODE_ENV === 'development') {
              console.log('[PestManagementTab]: ✅ Triggering carbon calculation (non-field)');
            }
            try {
              onDataChange(currentValues);
              lastSentValuesRef.current = currentValuesString; // Store sent values
            } catch (error) {
              console.error('[PestManagementTab]: Error calling onDataChange:', error);
            }
          } else {
            console.log('[PestManagementTab]: No valid type, skipping calculation');
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
        // Sprint 5: Aggregate Pest Scouting Support
        extra_data: {
          // Existing extra_data fields (if any)
          ...(data.extra_data || {}),
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
            observations_summary: data.observations_summary || null,
            // Zero carbon marker for pest scouting
            carbon_impact: 'zero',
            carbon_notes: 'Pest scouting is observational and does not directly produce emissions'
          })
        }
      };

      console.log('[PestManagementTab] Submitting with processed data:', processedData);
      onSubmitHandler(processedData);
    };

    return (
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
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
                  error={errors.type?.message}>
                  <StandardSelect {...methods.register('type')}>
                    <option value="SC">
                      {intl.formatMessage({ id: 'app.scouting' }) || 'Scouting'}
                    </option>
                    <option value="BR">
                      {intl.formatMessage({ id: 'app.beneficialRelease' }) || 'Beneficial Release'}
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
                      {intl.formatMessage({ id: 'app.impImplementation' }) || 'IPM Implementation'}
                    </option>
                  </StandardSelect>
                </StandardField>

                {/* SECOND: Event Name (standardized order - matches other forms) */}
                <StandardField
                  label={intl.formatMessage({ id: 'app.eventName' }) || 'Event Name'}
                  required
                  error={errors.name?.message}>
                  <StandardInput
                    {...methods.register('name')}
                    placeholder="e.g., Pest Scouting, Beneficial Release"
                  />
                </StandardField>
              </SimpleGrid>
            </SectionBox>

            {/* Sprint 5: Aggregate Pest Scouting Support - Summary Mode Toggle */}
            {pestType === 'SC' && (
              <Box
                p={4}
                bg={isSummaryMode ? 'green.50' : 'gray.50'}
                borderRadius="md"
                border="1px solid"
                borderColor={isSummaryMode ? 'green.200' : 'gray.200'}
                mb={4}>
                <StandardField
                  label="Scouting Mode"
                  helpText={
                    isSummaryMode
                      ? 'Log multiple scouting trips as one summary (e.g., "24 weekly scouting trips")'
                      : 'Select how you want to log scouting activities'
                  }>
                  <StandardSelect {...methods.register('is_summary')}>
                    <option value="false">Single scouting trip</option>
                    <option value="true">Multiple scouting trips (summary)</option>
                  </StandardSelect>
                </StandardField>

                {/* Benefits of Summary Mode */}
                {isSummaryMode && (
                  <Box mt={3} p={2} bg="green.100" borderRadius="md">
                    <Text fontSize="xs" color="green.700">
                      <Icon as={FaCheckCircle} mr={1} />
                      <strong>93% time savings:</strong> Log multiple scouting trips with one entry.
                    </Text>
                    <Text fontSize="xs" color="green.600" mt={1}>
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

                <StandardField
                  label="Observations Summary"
                  helpText="Brief summary of scouting findings for the period">
                  <Controller
                    name="observations_summary"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardTextarea
                        {...field}
                        placeholder="e.g., Weekly scouting for 24 weeks. Primary pest pressure from aphids in May-June, successfully managed with beneficial releases. No chemical treatments required."
                        rows={3}
                      />
                    )}
                  />
                </StandardField>

                {/* Zero Carbon Note */}
                <Box
                  mt={4}
                  p={3}
                  bg="teal.50"
                  borderRadius="md"
                  border="1px solid"
                  borderColor="teal.200">
                  <HStack spacing={2} mb={1}>
                    <Icon as={FaLeaf} color="teal.500" fontSize="sm" />
                    <Text fontSize="sm" fontWeight="semibold" color="teal.700">
                      Zero Carbon Impact
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="teal.600">
                    Pest scouting is observational and does not produce direct emissions.
                    <br />
                    <strong>Transparency Score Bonus:</strong> Comprehensive scouting documentation
                    rewards up to +30 points for IPM best practices.
                    <br />
                    <strong>Source: FAO Integrated Pest Management Guidelines</strong>
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
                    helpText="Area needed for carbon calculation (select your preferred unit)">
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
                    helpText="Select fuel type for accurate EPA emission factor calculation">
                    <StandardSelect
                      placeholder="Select fuel type..."
                      {...methods.register('fuel_type')}>
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
                      watch('fuel_type') === 'electric' ? 'Energy Amount (kWh)' : 'Fuel Consumed'
                    }
                    helpText={
                      watch('fuel_type') === 'electric'
                        ? 'Energy consumption for carbon emission calculation'
                        : 'Fuel consumption for carbon emission calculation'
                    }>
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
                    helpText="Used for calculating fuel efficiency and carbon per hour">
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
                    helpText="Equipment efficiency rating for carbon scoring">
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
                <StandardField label="Crop Growth Stage" helpText="Current crop development stage">
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
                  helpText="Has economic threshold been reached?">
                  <StandardSelect {...methods.register('economic_threshold_met')}>
                    <option value="">Select status</option>
                    <option value="true">Yes - Economic threshold met, action recommended</option>
                    <option value="false">No - Below economic threshold</option>
                  </StandardSelect>
                </StandardField>

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
                  helpText="Help consumers understand what pests you're managing">
                  <StandardInput
                    {...methods.register('pest_species')}
                    placeholder="e.g., Aphids, Spider mites, Thrips"
                  />
                </StandardField>

                <StandardField
                  label={
                    intl.formatMessage({ id: 'app.damagePercentage' }) || 'Crop Impact Level (%)'
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
                      intl.formatMessage({ id: 'app.pestPressureLevel' }) || 'Pest Pressure Level'
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
                    <StandardSelect {...methods.register('pest_pressure_level')}>
                      <option value="">Select pressure level</option>
                      <option value="Low">{intl.formatMessage({ id: 'app.low' }) || 'Low'}</option>
                      <option value="Medium">
                        {intl.formatMessage({ id: 'app.medium' }) || 'Medium'}
                      </option>
                      <option value="High">
                        {intl.formatMessage({ id: 'app.high' }) || 'High'}
                      </option>
                      <option value="Critical">
                        {intl.formatMessage({ id: 'app.critical' }) || 'Critical'}
                      </option>
                    </StandardSelect>
                  </StandardField>

                  {/* Economic Threshold Assessment - Relevant for Assessment and IPM Types */}
                  {(pestType === 'TA' || pestType === 'IP') && (
                    <StandardField
                      label="Action Threshold Status"
                      helpText={
                        pestType === 'TA'
                          ? 'Main threshold assessment decision'
                          : 'Was IPM triggered by reaching economic threshold?'
                      }>
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
                      intl.formatMessage({ id: 'app.beneficialSpecies' }) || 'Beneficial Species'
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

                  <StandardField
                    label={intl.formatMessage({ id: 'app.releaseQuantity' }) || 'Release Quantity'}
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
                </SimpleGrid>
              )}

              {/* IPM Strategy Implementation */}
              {pestType === 'IP' && (
                <StandardField
                  label={
                    intl.formatMessage({ id: 'app.impStrategy' }) || 'IPM Strategy Description'
                  }
                  helpText="Describe the comprehensive integrated pest management approach implemented">
                  <StandardTextarea
                    {...methods.register('imp_strategy')}
                    placeholder={
                      intl.formatMessage({ id: 'app.enterImpStrategy' }) ||
                      'Describe your integrated pest management strategy: cultural practices, biological controls, targeted treatments, monitoring methods, prevention measures...'
                    }
                    rows={4}
                  />
                </StandardField>
              )}
            </SectionBox>

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
                  helpText="Are you using beneficial insects as part of your IPM strategy?">
                  <StandardSelect {...methods.register('beneficial_insects_used')}>
                    <option value="">Select status</option>
                    <option value="yes">Yes - Using beneficial insects</option>
                    <option value="no">No - Not currently using</option>
                    <option value="planning">Planning to introduce</option>
                  </StandardSelect>
                </StandardField>

                <StandardField
                  label="Chemical-Free Period (Days)"
                  helpText="Days since last synthetic chemical application (builds consumer trust)">
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

            {/* Transparency Notes & Observations */}
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
                helpText="Share details about your pest management approach that help consumers understand your sustainable farming practices">
                <StandardTextarea
                  {...methods.register('observation')}
                  placeholder="Optional: Describe your IPM approach, beneficial insect populations observed, organic methods used, sustainability goals, etc. These details help consumers understand your natural pest management methods."
                  rows={4}
                />
              </StandardField>
            </SectionBox>

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
