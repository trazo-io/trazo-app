// Sprint 3 Epic 3.1: Cleaned unused Chakra imports - using StandardComponents only
import React, { useEffect, useRef, useState } from 'react';
import {
  VStack,
  HStack,
  Checkbox,
  useColorModeValue,
  Text,
  Icon,
  SimpleGrid
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
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, boolean, array } from 'zod';
import CustomFieldsForm from './CustomFieldsForm';
import {
  FaChevronLeft,
  FaChevronRight,
  FaBug,
  FaRulerHorizontal,
  FaCloudSun,
  FaEye,
  FaSeedling
} from 'react-icons/fa';
import { useIntl } from 'react-intl';

const pestSchema = object({
  type: string().min(1, 'Pest management event type is required'),
  name: string().min(1, 'Event name is required'),
  // Agricultural context fields (critical for carbon calculations)
  // Sprint 2 Epic 2.2: Flexible units - user can select hectares/acres and km/miles
  field_area: string().optional(),
  area_unit: string().optional(), // 'hectares' | 'acres'
  travel_distance: string().optional(),
  distance_unit: string().optional(), // 'km' | 'miles'
  time_spent_hours: string().optional(),
  // Agricultural decision fields
  crop_growth_stage: string().optional(),
  weather_conditions: string().optional(),
  economic_threshold_met: boolean().optional(),
  action_recommended: string().optional(),
  // Existing pest management fields
  pest_species: string().optional(),
  pest_pressure_level: string().optional(),
  beneficial_species: string().optional(),
  release_quantity: string().optional(),
  trap_count: string().optional(),
  damage_percentage: string().optional(),
  action_threshold_met: boolean().optional(),
  imp_strategy: string().optional(),
  observation: string().optional(),
  // Sprint 3 Epic 3.2: Consumer Trust Fields for transparency
  beneficial_insects_used: string().optional(), // Whether beneficial insects are being used
  chemical_free_period_days: string().optional(), // Days since last chemical application
  custom_fields: array(object({
    id: string().optional(),
    label: string(),
    value: string(),
    field_type: string(),
    visibility: string(),
    link_url: string().optional(),
    verification: string().optional(),
    created_at: string().optional(),
    photo_id: string().optional()
  })).optional()
});

const PestManagementTab = ({
  onSubmitHandler,
  onDataChange,
  onPrev,
  initialValues = {},
  hideActions = false
}) => {
  const intl = useIntl();
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // INFINITE LOOP FIX: Track last sent values to prevent duplicate onDataChange calls
  const lastSentValuesRef = useRef(null);

  const methods = useForm({
    resolver: zodResolver(pestSchema),
    defaultValues: {
      type: initialValues.type || 'SC',
      name: initialValues.name || '',
      // Agricultural context fields - require user input for accurate carbon calculations
      // Sprint 2 Epic 2.2: Flexible units - user can select hectares/acres and km/miles
      field_area: initialValues.field_area || initialValues.field_area_hectares || '',
      area_unit: initialValues.area_unit || 'acres', // Default to acres for US farmers
      travel_distance: initialValues.travel_distance || initialValues.travel_distance_km || '',
      distance_unit: initialValues.distance_unit || 'miles', // Default to miles for US farmers
      time_spent_hours: initialValues.time_spent_hours || '',
      // Agricultural decision fields
      crop_growth_stage: initialValues.crop_growth_stage || '',
      weather_conditions: initialValues.weather_conditions || '',
      economic_threshold_met: initialValues.economic_threshold_met || false,
      action_recommended: initialValues.action_recommended || '',
      // Existing pest management fields
      pest_species: initialValues.pest_species || '',
      pest_pressure_level: initialValues.pest_pressure_level || '',
      beneficial_species: initialValues.beneficial_species || '',
      release_quantity: initialValues.release_quantity || '',
      trap_count: initialValues.trap_count?.toString() || '',
      damage_percentage: initialValues.damage_percentage?.toString() || '',
      action_threshold_met: initialValues.action_threshold_met || false,
      imp_strategy: initialValues.imp_strategy || '',
      observation: initialValues.observation || '',
      // Sprint 3 Epic 3.2: Consumer Trust Fields
      beneficial_insects_used: initialValues.beneficial_insects_used || '',
      chemical_free_period_days: initialValues.chemical_free_period_days?.toString() || '',
      custom_fields: initialValues.custom_fields || []
    }
  });

  // Custom fields state for Phase 2.3
  const [customFields, setCustomFields] = useState(initialValues.custom_fields || []);

  // Update form values when initialValues change
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      methods.reset({
        type: initialValues.type || 'SC',
        name: initialValues.name || '',
        // Agricultural context fields
        // Sprint 2 Epic 2.2: Flexible units - user can select hectares/acres and km/miles
        field_area: initialValues.field_area || initialValues.field_area_hectares || '',
        area_unit: initialValues.area_unit || 'acres',
        travel_distance: initialValues.travel_distance || initialValues.travel_distance_km || '',
        distance_unit: initialValues.distance_unit || 'miles',
        time_spent_hours: initialValues.time_spent_hours || '',
        // Agricultural decision fields
        crop_growth_stage: initialValues.crop_growth_stage || '',
        weather_conditions: initialValues.weather_conditions || '',
        economic_threshold_met: initialValues.economic_threshold_met || false,
        action_recommended: initialValues.action_recommended || '',
        // Existing pest management fields
        pest_species: initialValues.pest_species || '',
        pest_pressure_level: initialValues.pest_pressure_level || '',
        beneficial_species: initialValues.beneficial_species || '',
        release_quantity: initialValues.release_quantity || '',
        trap_count: initialValues.trap_count?.toString() || '',
        damage_percentage: initialValues.damage_percentage?.toString() || '',
        action_threshold_met: initialValues.action_threshold_met || false,
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

  // Watch critical fields for real-time carbon calculation updates
  // Sprint 2 Epic 2.2: Updated to use flexible unit fields
  const watchedFields = watch([
    'type',
    'field_area',
    'area_unit',
    'travel_distance',
    'distance_unit',
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
          // For field activities, require area and travel distance for meaningful carbon calculation
          // Sprint 2 Epic 2.2: Updated to use flexible unit fields
          const hasValidArea = currentValues.field_area && parseFloat(currentValues.field_area) > 0;
          const hasValidTravel =
            currentValues.travel_distance && parseFloat(currentValues.travel_distance) >= 0;

          if (hasValidType && hasValidArea && hasValidTravel) {
            console.log('[PestManagementTab]: Triggering onDataChange with values', currentValues);
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
    // Convert string numbers to proper format
    const processedData = {
      ...data,
      // REMOVED: observation → description mapping now handled universally in cleanEventData
      trap_count: data.trap_count ? parseInt(data.trap_count) : null,
      damage_percentage: data.damage_percentage ? parseFloat(data.damage_percentage) : null
    };
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
              <StandardField
                label={intl.formatMessage({ id: 'app.eventName' }) || 'Event Name *'}
                required
                error={errors.name?.message}>
                <StandardInput
                  {...methods.register('name')}
                  placeholder="e.g., Pest Scouting, Beneficial Release"
                />
              </StandardField>

              <StandardField
                label={
                  intl.formatMessage({ id: 'app.pestManagementEventType' }) ||
                  'Pest Management Event Type *'
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
                    {intl.formatMessage({ id: 'app.pestIdentification' }) || 'Pest Identification'}
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
            </SimpleGrid>
          </SectionBox>

          {/* Agricultural Context Section - Critical for Carbon Calculations */}
          <SectionBox variant="highlighted" borderColor="green.200">
            <SectionHeader
              icon={FaRulerHorizontal}
              iconColor="green.600"
              title="Field Area & Context"
              badge="Carbon Calculation Required"
              badgeColorScheme="green"
            />

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              {/* Sprint 2 Epic 2.2: Flexible units - user can select hectares or acres */}
              <StandardField
                label="Field Area Treated"
                required
                helpText="Area needed for carbon calculation (select your preferred unit)">
                <HStack spacing={2}>
                  <StandardInput
                    flex={2}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="2.5"
                    {...methods.register('field_area')}
                  />
                  <StandardSelect flex={1} {...methods.register('area_unit')}>
                    <option value="acres">Acres</option>
                    <option value="hectares">Hectares</option>
                  </StandardSelect>
                </HStack>
              </StandardField>

              {/* Sprint 2 Epic 2.2: Flexible units - user can select km or miles */}
              <StandardField
                label="Travel Distance"
                required
                helpText="Distance to field for carbon calculation (select your preferred unit)">
                <HStack spacing={2}>
                  <StandardInput
                    flex={2}
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="2.0"
                    {...methods.register('travel_distance')}
                  />
                  <StandardSelect flex={1} {...methods.register('distance_unit')}>
                    <option value="miles">Miles</option>
                    <option value="km">Kilometers</option>
                  </StandardSelect>
                </HStack>
              </StandardField>

              <StandardField label="Time Spent" helpText="Hours spent on this activity">
                <HStack spacing={2}>
                  <StandardInput
                    flex={2}
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="1.5"
                    {...methods.register('time_spent_hours')}
                  />
                  <StandardSelect flex={1} value="hours" isReadOnly>
                    <option value="hours">Hours</option>
                  </StandardSelect>
                </HStack>
              </StandardField>
            </SimpleGrid>
          </SectionBox>

          {/* Agricultural Decision Context */}
          <SectionBox variant="default">
            <SectionHeader
              icon={FaCloudSun}
              iconColor="purple.600"
              title="Agricultural Context & Conditions"
              badge="IPM Decision Support"
              badgeColorScheme="purple"
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
                <Checkbox {...methods.register('economic_threshold_met')}>
                  Economic threshold met - action recommended
                </Checkbox>
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
              iconColor="orange.600"
              title="Pest Management Details"
              badge="IPM Documentation"
              badgeColorScheme="orange"
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
                    <option value="High">{intl.formatMessage({ id: 'app.high' }) || 'High'}</option>
                    <option value="Critical">
                      {intl.formatMessage({ id: 'app.critical' }) || 'Critical'}
                    </option>
                  </StandardSelect>
                </StandardField>

                {/* Economic Threshold Assessment - Relevant for Assessment and IPM Types */}
                {(pestType === 'TA' || pestType === 'IP') && (
                  <StandardField
                    label="Economic Threshold Status"
                    helpText={
                      pestType === 'TA'
                        ? 'Main threshold assessment decision'
                        : 'Was IPM triggered by reaching economic threshold?'
                    }>
                    <Checkbox {...methods.register('action_threshold_met')}>
                      {intl.formatMessage({ id: 'app.actionThresholdMet' }) ||
                        'Economic threshold has been met - action required'}
                    </Checkbox>
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
                label={intl.formatMessage({ id: 'app.impStrategy' }) || 'IPM Strategy Description'}
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
              iconColor="teal.500"
              title="Consumer Trust & Transparency"
              badge="Builds Consumer Trust"
              badgeColorScheme="teal"
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
            <HStack justify="space-between" pt={6} mt={4} borderTop="1px" borderColor={borderColor}>
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
};

export default PestManagementTab;
