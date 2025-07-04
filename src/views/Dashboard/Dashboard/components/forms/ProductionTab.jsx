// Chakra imports
import {
  Button,
  Select as ChakraSelect,
  CircularProgress,
  Flex,
  FormControl,
  FormLabel,
  Icon,
  Input,
  Select,
  Text,
  Textarea,
  useColorModeValue,
  HStack,
  Box,
  FormErrorMessage,
  InputGroup,
  InputRightAddon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper
} from '@chakra-ui/react';
import {
  StandardCard,
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea
} from 'components/Design/StandardComponents';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { FormProvider, useForm } from 'react-hook-form';
import React, { useState, useEffect, useRef } from 'react';
import { number, object, string } from 'zod';

import { FaPlus } from 'react-icons/fa';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';

// Enhanced form schema with proper validation to prevent "Unknown" values
const formSchemaMainInfo = object({
  type: string().min(1, 'Production type is required'),
  duration: string().optional(),
  area_covered: string().optional(),
  equipment_used: string().optional(),
  observation: string().optional()
});

// Intelligent defaults based on production type and crop
const getProductionDefaults = (productionType, cropType = 'general') => {
  const defaults = {
    PL: {
      // Planting
      duration: '4 hours',
      area_covered: '1.0 hectares',
      equipment_used: 'Tractor, Planter',
      observation: 'Planting completed under optimal conditions'
    },
    HA: {
      // Harvesting
      duration: '6 hours',
      area_covered: '1.5 hectares',
      equipment_used: 'Harvester, Transport truck',
      observation: 'Harvest completed, good yield quality'
    },
    IR: {
      // Irrigation
      duration: '2 hours',
      area_covered: '2.0 hectares',
      equipment_used: 'Irrigation system, Pumps',
      observation: 'Irrigation cycle completed'
    },
    PR: {
      // Pruning
      duration: '3 hours',
      area_covered: '0.5 hectares',
      equipment_used: 'Pruning shears, Ladder',
      observation: 'Pruning completed for optimal growth'
    }
  };

  // Crop-specific adjustments
  const cropAdjustments = {
    citrus: { durationMultiplier: 1.5, areaMultiplier: 2.0 },
    corn: { durationMultiplier: 1.2, areaMultiplier: 3.0 },
    tomato: { durationMultiplier: 0.8, areaMultiplier: 0.3 },
    lettuce: { durationMultiplier: 0.6, areaMultiplier: 0.2 }
  };

  const baseDefaults = defaults[productionType] || defaults.PL;
  const adjustment = cropAdjustments[cropType?.toLowerCase()] || {
    durationMultiplier: 1,
    areaMultiplier: 1
  };

  return {
    ...baseDefaults,
    duration: `${Math.round(
      parseFloat(baseDefaults.duration) * adjustment.durationMultiplier
    )} hours`,
    area_covered: `${(parseFloat(baseDefaults.area_covered) * adjustment.areaMultiplier).toFixed(
      1
    )} hectares`
  };
};

const ProductionTab = ({
  onSubmitHandler,
  onDataChange,
  onPrev,
  initialValues = {},
  cropType = 'general'
}) => {
  const intl = useIntl();
  const bgPrevButton = useColorModeValue('gray.100', 'gray.100');
  const textColor = useColorModeValue('gray.700', 'white');
  const iconColor = useColorModeValue('gray.300', 'gray.700');
  const [selectedProductionType, setSelectedProductionType] = useState('');

  // Map API format to form format
  const mapApiTypeToFormType = (apiType) => {
    if (!apiType) return '';

    const typeMapping = {
      'event.production.planting': 'PL',
      'event.production.harvesting': 'HA',
      'event.production.irrigation': 'IR',
      'event.production.pruning': 'PR'
    };

    return typeMapping[apiType] || apiType;
  };

  const formType = mapApiTypeToFormType(initialValues.type);

  // Get intelligent defaults for the current production type
  const intelligentDefaults = getProductionDefaults(formType || 'PL', cropType);

  const mainInfoMethods = useForm({
    resolver: zodResolver(formSchemaMainInfo),
    defaultValues: {
      type: formType || '',
      duration: initialValues.duration || intelligentDefaults.duration,
      area_covered: initialValues.area_covered || intelligentDefaults.area_covered,
      equipment_used: initialValues.equipment_used || intelligentDefaults.equipment_used,
      observation: initialValues.observation || intelligentDefaults.observation
    }
  });

  const {
    reset: mainInfoReset,
    handleSubmit: mainInfoSubmit,
    errors: mainInfoErrors,
    formState: { errors, isSubmitSuccessful },
    register,
    setValue,
    watch
  } = mainInfoMethods;

  // Watch the production type to update defaults
  const watchedType = watch('type');

  // Watch critical fields for real-time carbon calculation updates
  const watchedFields = watch(['type', 'duration', 'area_covered', 'equipment_used']);

  // Update defaults when production type changes
  useEffect(() => {
    if (watchedType && watchedType !== selectedProductionType) {
      setSelectedProductionType(watchedType);
      const newDefaults = getProductionDefaults(watchedType, cropType);

      // Only update if current values are empty or default
      const currentDuration = watch('duration');
      const currentArea = watch('area_covered');
      const currentEquipment = watch('equipment_used');
      const currentObservation = watch('observation');

      if (!currentDuration || currentDuration === intelligentDefaults.duration) {
        setValue('duration', newDefaults.duration);
      }
      if (!currentArea || currentArea === intelligentDefaults.area_covered) {
        setValue('area_covered', newDefaults.area_covered);
      }
      if (!currentEquipment || currentEquipment === intelligentDefaults.equipment_used) {
        setValue('equipment_used', newDefaults.equipment_used);
      }
      if (!currentObservation || currentObservation === intelligentDefaults.observation) {
        setValue('observation', newDefaults.observation);
      }
    }
  }, [watchedType, selectedProductionType, cropType, setValue, watch]);

  // Track previous values to prevent unnecessary API calls
  const previousValuesRef = useRef({});

  // Real-time field watching for carbon calculation updates
  useEffect(() => {
    console.log('[ProductionTab]: Field watching triggered', {
      hasOnDataChange: !!onDataChange,
      watchedFields,
      firstField: watchedFields[0]
    });

    // Always check if callback exists inside the timeout to avoid stale closures
    const timeoutId = setTimeout(() => {
      if (onDataChange && typeof onDataChange === 'function') {
        const currentValues = mainInfoMethods.getValues();

        // Compare with previous values to avoid unnecessary calls
        const relevantFields = ['type', 'duration', 'area_covered', 'equipment_used'];
        const currentRelevantValues = {};
        relevantFields.forEach((field) => {
          currentRelevantValues[field] = currentValues[field];
        });

        const hasChanged =
          JSON.stringify(currentRelevantValues) !== JSON.stringify(previousValuesRef.current);

        console.log('[ProductionTab]: Value comparison', {
          currentValues: currentRelevantValues,
          previousValues: previousValuesRef.current,
          hasChanged
        });

        // Only trigger if we have meaningful data AND values have actually changed
        if (
          hasChanged &&
          currentValues.type &&
          (currentValues.duration || currentValues.area_covered)
        ) {
          console.log('[ProductionTab]: Triggering onDataChange with values', currentValues);
          previousValuesRef.current = currentRelevantValues;
          try {
            onDataChange(currentValues);
          } catch (error) {
            console.error('[ProductionTab]: Error calling onDataChange:', error);
          }
        } else {
          console.log('[ProductionTab]: Not triggering', {
            hasChanged,
            hasType: !!currentValues.type,
            hasDurationOrArea: !!(currentValues.duration || currentValues.area_covered)
          });
        }
      } else {
        console.log('[ProductionTab]: onDataChange not available in timeout');
      }
    }, 500); // Debounced to prevent excessive API calls

    return () => clearTimeout(timeoutId);
  }, [watchedFields, onDataChange]);

  // Update form values when initialValues change
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      const mappedType = mapApiTypeToFormType(initialValues.type);
      const defaults = getProductionDefaults(mappedType || 'PL', cropType);

      mainInfoMethods.reset({
        type: mappedType || '',
        duration: initialValues.duration || defaults.duration,
        area_covered: initialValues.area_covered || defaults.area_covered,
        equipment_used: initialValues.equipment_used || defaults.equipment_used,
        observation: initialValues.observation || defaults.observation
      });
    }
  }, [initialValues, mainInfoMethods, cropType]);

  // Enhanced submit handler with validation
  const handleEnhancedSubmit = (data) => {
    // Validate that no field contains "Unknown" or empty values for required fields
    const requiredFields = ['type'];
    const optionalFields = ['duration', 'area_covered', 'equipment_used', 'observation'];

    const invalidFields = requiredFields.filter((field) => {
      const value = data[field]?.toString().toLowerCase();
      return (
        !value || value === 'unknown' || value === 'n/a' || value === 'na' || value.trim() === ''
      );
    });

    if (invalidFields.length > 0) {
      // Auto-fill missing fields with intelligent defaults
      const defaults = getProductionDefaults(data.type || 'PL', cropType);
      invalidFields.forEach((field) => {
        if (defaults[field]) {
          data[field] = defaults[field];
          setValue(field, defaults[field]);
        }
      });
    }

    // Auto-fill optional fields if they're empty to prevent "Unknown" values
    optionalFields.forEach((field) => {
      const value = data[field]?.toString().toLowerCase();
      if (
        !value ||
        value === 'unknown' ||
        value === 'n/a' ||
        value === 'na' ||
        value.trim() === ''
      ) {
        const defaults = getProductionDefaults(data.type || 'PL', cropType);
        if (defaults[field]) {
          data[field] = defaults[field];
        }
      }
    });

    // Call the original submit handler
    onSubmitHandler(data);
  };

  console.log('initialValues', initialValues);
  console.log('formType', formType);

  return (
    <FormProvider {...mainInfoMethods}>
      <form onSubmit={mainInfoSubmit(handleEnhancedSubmit)} style={{ width: '100%' }}>
        <Flex direction="column" w="100%">
          {/* Information Alert */}
          <Alert status="info" mb={4} borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle fontSize="sm">Production Event Details</AlertTitle>
              <AlertDescription fontSize="xs">
                Provide detailed information about your production activities for accurate carbon
                tracking and operational insights.
              </AlertDescription>
            </Box>
          </Alert>

          <StandardField
            label={`${intl.formatMessage({ id: 'app.type' })} *`}
            required
            error={errors.type?.message}
          >
            <StandardSelect
              placeholder={intl.formatMessage({ id: 'app.selectOption' })}
              defaultValue={formType || ''}
              {...register('type')}
            >
              <option value="PL">{intl.formatMessage({ id: 'app.planting' })}</option>
              <option value="HA">{intl.formatMessage({ id: 'app.harvesting' })}</option>
              <option value="IR">{intl.formatMessage({ id: 'app.irrigation' })}</option>
              <option value="PR">{intl.formatMessage({ id: 'app.pruning' })}</option>
            </StandardSelect>
          </StandardField>

          <Flex gap={'20px'} mb={4}>
            <StandardField label="Duration" helpText="How long did this activity take?" flex={1}>
              <InputGroup>
                <StandardInput
                  type="text"
                  placeholder="e.g., 4 hours, 2 days"
                  {...register('duration')}
                />
                <InputRightAddon children="hrs" borderRadius="lg" />
              </InputGroup>
            </StandardField>

            <StandardField
              label="Area Covered"
              helpText="Area where activity was performed"
              flex={1}
            >
              <InputGroup>
                <StandardInput
                  type="text"
                  placeholder="e.g., 1.5 hectares, 3 acres"
                  {...register('area_covered')}
                />
                <InputRightAddon children="ha" borderRadius="lg" />
              </InputGroup>
            </StandardField>
          </Flex>

          <StandardField label="Equipment Used" helpText="List the main equipment or tools used">
            <StandardInput
              type="text"
              placeholder="e.g., Tractor, Harvester, Irrigation system"
              {...register('equipment_used')}
            />
          </StandardField>

          <StandardField
            label={intl.formatMessage({ id: 'app.observations' })}
            helpText="Include details about weather conditions, yield quality, equipment performance, etc."
          >
            <StandardTextarea
              placeholder="Detailed notes about conditions, results, challenges, or observations during this production activity"
              defaultValue={initialValues.observation || ''}
              {...register('observation')}
            />
          </StandardField>

          <Box pt={6} mt={4} borderTop="1px" borderColor="gray.200">
            <HStack justify="space-between">
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
          </Box>
        </Flex>
      </form>
    </FormProvider>
  );
};

export default ProductionTab;
