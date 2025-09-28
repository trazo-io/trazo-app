import React, { useEffect } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  HStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea,
  Checkbox,
  useColorModeValue,
  Box,
  Text,
  Icon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  SimpleGrid,
  Badge,
  Tooltip
} from '@chakra-ui/react';
import {
  StandardCard,
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea
} from 'components/Design/StandardComponents';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, number, boolean } from 'zod';
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
  field_area_hectares: string().optional(),
  travel_distance_km: string().optional(), 
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
  observation: string().optional()
});

const PestManagementTab = ({ onSubmitHandler, onDataChange, onPrev, initialValues = {} }) => {
  const intl = useIntl();
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const methods = useForm({
    resolver: zodResolver(pestSchema),
    defaultValues: {
      type: initialValues.type || 'SC',
      name: initialValues.name || '',
      // Agricultural context fields - require user input for accurate carbon calculations
      field_area_hectares: initialValues.field_area_hectares || '',
      travel_distance_km: initialValues.travel_distance_km || '',
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
      observation: initialValues.observation || ''
    }
  });

  // Update form values when initialValues change
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      methods.reset({
        type: initialValues.type || 'SC',
        name: initialValues.name || '',
        // Agricultural context fields
        field_area_hectares: initialValues.field_area_hectares || '',
        travel_distance_km: initialValues.travel_distance_km || '',
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
        observation: initialValues.observation || ''
      });
    }
  }, [initialValues, methods]);

  const { watch, handleSubmit, formState: { errors } } = methods;
  const pestType = watch('type');

  // Watch critical fields for real-time carbon calculation updates
  const watchedFields = watch([
    'type',
    'field_area_hectares',
    'travel_distance_km',
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

        // Only trigger if we have meaningful user-provided data
        // Types that need area context for accurate carbon calculations
        const needsAreaValidation = ['SC', 'TM', 'BR', 'IP']; // Scouting, Trap Monitoring, Beneficial Release, IPM Implementation
        const hasValidType = currentValues.type && currentValues.type !== '';
        
        if (needsAreaValidation.includes(currentValues.type)) {
          // For field activities, require area and travel distance for meaningful carbon calculation
          const hasValidArea = currentValues.field_area_hectares && 
            parseFloat(currentValues.field_area_hectares) > 0;
          const hasValidTravel = currentValues.travel_distance_km && 
            parseFloat(currentValues.travel_distance_km) >= 0;
            
          if (hasValidType && hasValidArea && hasValidTravel) {
            console.log('[PestManagementTab]: Triggering onDataChange with values', currentValues);
            try {
              onDataChange(currentValues);
            } catch (error) {
              console.error('[PestManagementTab]: Error calling onDataChange:', error);
            }
          } else {
          }
        } else if (hasValidType) {
          // For non-field activities (PI, TA), just require type
          if (process.env.NODE_ENV === 'development') {
            console.log('[PestManagementTab]: ✅ Triggering carbon calculation (non-field)');
          }
          try {
            onDataChange(currentValues);
          } catch (error) {
            console.error('[PestManagementTab]: Error calling onDataChange:', error);
          }
        } else {
        }
      } else {
        }
    }, 500); // Debounced to prevent excessive API calls

    return () => clearTimeout(timeoutId);
  }, [watchedFields, onDataChange, methods]);

  const onSubmit = (data) => {
    // Convert string numbers to proper format
    const processedData = {
      ...data,
      trap_count: data.trap_count ? parseInt(data.trap_count) : null,
      damage_percentage: data.damage_percentage ? parseFloat(data.damage_percentage) : null
    };
    onSubmitHandler(processedData);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
        <VStack spacing={6} align="stretch">
          {/* Transparency Alert */}
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle fontSize="sm">Integrated Pest Management & Transparency Documentation</AlertTitle>
              <AlertDescription fontSize="xs">
                All fields marked with * are required for accurate carbon footprint calculations and 
                transparency documentation. IPM practices help build consumer trust through documented 
                sustainable pest management methods.
              </AlertDescription>
            </Box>
          </Alert>

          {/* Basic Event Information */}
          <Box p={4} border="1px" borderColor="gray.200" borderRadius="lg">
            <HStack justify="space-between" align="center" mb={4}>
              <Text fontSize="md" fontWeight="bold" color="green.600">
                <Icon as={FaBug} mr={2} />
                Pest Management Event Information
              </Text>
              <Badge colorScheme="green" fontSize="xs">
                Transparency Tracking
              </Badge>
            </HStack>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <StandardField
                label={intl.formatMessage({ id: 'app.eventName' }) || 'Event Name *'}
                required
                error={errors.name?.message}
              >
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
                error={errors.type?.message}
              >
                <StandardSelect {...methods.register('type')}>
                  <option value="SC">{intl.formatMessage({ id: 'app.scouting' }) || 'Scouting'}</option>
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
                    {intl.formatMessage({ id: 'app.thresholdAssessment' }) || 'Threshold Assessment'}
                  </option>
                  <option value="IP">
                    {intl.formatMessage({ id: 'app.impImplementation' }) || 'IPM Implementation'}
                  </option>
                </StandardSelect>
              </StandardField>
            </SimpleGrid>
          </Box>

          {/* Agricultural Context Section - Critical for Carbon Calculations */}
          <Box p={4} border="1px" borderColor="gray.200" borderRadius="lg">
            <HStack justify="space-between" align="center" mb={4}>
              <Text fontSize="md" fontWeight="bold" color="blue.600">
                <Icon as={FaRulerHorizontal} mr={2} />
                Field Area & Context
              </Text>
              <Badge colorScheme="blue" fontSize="xs">
                Carbon Calculation Required
              </Badge>
            </HStack>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <StandardField 
                label="Field Area Treated *" 
                required 
                helpText="Area needed for accurate carbon calculation"
              >
                <HStack spacing={2}>
                  <StandardInput
                    flex={2}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="2.5"
                    {...methods.register('field_area_hectares')}
                  />
                  <StandardSelect flex={1} value="hectares" isReadOnly>
                    <option value="hectares">Hectares</option>
                  </StandardSelect>
                </HStack>
              </StandardField>

              <StandardField 
                label="Travel Distance *" 
                required 
                helpText="Distance to field for carbon calculation"
              >
                <HStack spacing={2}>
                  <StandardInput
                    flex={2}
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="2.0"
                    {...methods.register('travel_distance_km')}
                  />
                  <StandardSelect flex={1} value="km" isReadOnly>
                    <option value="km">Kilometers</option>
                  </StandardSelect>
                </HStack>
              </StandardField>

              <StandardField 
                label="Time Spent" 
                helpText="Hours spent on this activity"
              >
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
          </Box>

          {/* Agricultural Decision Context */}
          <Box p={4} border="1px" borderColor="gray.200" borderRadius="lg">
            <HStack justify="space-between" align="center" mb={4}>
              <Text fontSize="md" fontWeight="bold" color="purple.600">
                <Icon as={FaCloudSun} mr={2} />
                Agricultural Context & Conditions
              </Text>
              <Badge colorScheme="purple" fontSize="xs">
                IPM Decision Support
              </Badge>
            </HStack>

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

              <StandardField 
                label="Weather Conditions" 
                helpText="Weather affecting pest activity"
              >
                <StandardInput
                  {...methods.register('weather_conditions')}
                  placeholder="e.g., warm and humid, dry conditions"
                />
              </StandardField>

              <StandardField 
                label="Economic Threshold Status" 
                helpText="Has economic threshold been reached?"
              >
                <Checkbox {...methods.register('economic_threshold_met')}>
                  Economic threshold met - action recommended
                </Checkbox>
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
          </Box>

          {/* Pest-Specific Details Section */}
          <Box p={4} border="1px" borderColor="gray.200" borderRadius="lg">
            <HStack justify="space-between" align="center" mb={4}>
              <Text fontSize="md" fontWeight="bold" color="orange.600">
                <Icon as={FaEye} mr={2} />
                Pest Management Details
              </Text>
              <Badge colorScheme="orange" fontSize="xs">
                IPM Documentation
              </Badge>
            </HStack>

            {/* Pest Scouting, Identification, and Assessment Details */}
            {(pestType === 'SC' || pestType === 'PI' || pestType === 'TA') && (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <StandardField
                  label={intl.formatMessage({ id: 'app.pestSpecies' }) || 'Pest Species'}
                  helpText="Identify specific pest species found"
                >
                  <StandardInput
                    {...methods.register('pest_species')}
                    placeholder="e.g., Aphids, Spider mites, Thrips"
                  />
                </StandardField>

                <StandardField
                  label={intl.formatMessage({ id: 'app.pestPressureLevel' }) || 'Pest Pressure Level'}
                  helpText="Current pest population assessment"
                >
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

                <StandardField
                  label={intl.formatMessage({ id: 'app.damagePercentage' }) || 'Damage Percentage (%)'}
                  helpText="Percentage of crop damage observed"
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

                {pestType === 'TA' && (
                  <StandardField
                    label="Threshold Assessment"
                    helpText="Economic threshold decision"
                  >
                    <Checkbox {...methods.register('action_threshold_met')}>
                      {intl.formatMessage({ id: 'app.actionThresholdMet' }) ||
                        'Action threshold has been met'}
                    </Checkbox>
                  </StandardField>
                )}
              </SimpleGrid>
            )}

            {/* Beneficial Release Details */}
            {pestType === 'BR' && (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <StandardField
                  label={intl.formatMessage({ id: 'app.beneficialSpecies' }) || 'Beneficial Species'}
                  helpText="Natural pest control organisms released"
                >
                  <StandardInput
                    {...methods.register('beneficial_species')}
                    placeholder="e.g., Ladybugs, Lacewings, Predatory mites"
                  />
                </StandardField>

                <StandardField
                  label={intl.formatMessage({ id: 'app.releaseQuantity' }) || 'Release Quantity'}
                  helpText="Number and density of beneficials released"
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
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
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
                label={intl.formatMessage({ id: 'app.impStrategy' }) || 'IPM Strategy'}
                helpText="Describe integrated pest management practices implemented"
              >
                <StandardTextarea
                  {...methods.register('imp_strategy')}
                  placeholder={
                    intl.formatMessage({ id: 'app.enterImpStrategy' }) ||
                    'Describe the integrated pest management strategy implemented - cultural practices, biological controls, targeted treatments...'
                  }
                  rows={4}
                />
              </StandardField>
            )}
          </Box>

          {/* Transparency Notes & Observations */}
          <Box p={4} border="1px" borderColor="gray.200" borderRadius="lg">
            <HStack justify="space-between" align="center" mb={4}>
              <Text fontSize="md" fontWeight="bold" color="green.600">
                <Icon as={FaSeedling} mr={2} />
                IPM Notes & Consumer Transparency
              </Text>
              <Badge colorScheme="green" fontSize="xs">
                Consumer Trust Building
              </Badge>
            </HStack>

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
          </Box>

          {/* Action Buttons */}
          <HStack justify="space-between" pt={6} mt={4} borderTop="1px" borderColor={borderColor}>
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
        </VStack>
      </form>
    </FormProvider>
  );
};

export default PestManagementTab;
