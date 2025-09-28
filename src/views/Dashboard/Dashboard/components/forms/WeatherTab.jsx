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
  SimpleGrid,
  Badge
} from '@chakra-ui/react';
import {
  StandardCard,
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea,
  StandardAlert
} from 'components/Design/StandardComponents';
import {
  FaChevronLeft,
  FaChevronRight,
  FaCloud,
  FaThermometerHalf,
  FaEye,
  FaSeedling
} from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
// Custom components
import React, { useState, useEffect, useCallback } from 'react';
import { number, object, string } from 'zod';

import { FaPlus } from 'react-icons/fa';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';

const formSchemaMainInfo = object({
  type: string().min(1, 'Name is required'),
  lower_temperature: string()
    .optional()
    .transform((val) => Number(val)),
  way_of_protection: string().optional(),
  water_deficit: string()
    .optional()
    .transform((val) => Number(val)),
  weight: string()
    .optional()
    .transform((val) => Number(val)),
  diameter: string()
    .optional()
    .transform((val) => Number(val)),
  duration: string()
    .optional()
    .transform((val) => Number(val)),
  highest_temperature: string()
    .optional()
    .transform((val) => Number(val)),
  start_date: string().optional(),
  end_date: string().optional(),
  // Tropical Storm fields
  wind_speed: string()
    .optional()
    .transform((val) => Number(val)),
  precipitation_amount: string()
    .optional()
    .transform((val) => Number(val)),
  damage_assessment: string().optional(),
  // High Winds fields
  protection_measures: string().optional(),
  // Humidity fields (both high and low)
  humidity_level: string()
    .optional()
    .transform((val) => Number(val)),
  crop_impact: string().optional(),
  observation: string().optional()
});

const WeatherTab = ({ onSubmitHandler, onDataChange, onPrev, initialValues = {} }) => {
  const intl = useIntl();
  const bgPrevButton = useColorModeValue('gray.100', 'gray.100');
  const textColor = useColorModeValue('gray.700', 'white');
  const iconColor = useColorModeValue('gray.300', 'gray.700');

  // Map API format to form format
  const mapApiTypeToFormType = (apiType) => {
    if (!apiType) return '';

    const typeMapping = {
      'event.weather.frost': 'FR',
      'event.weather.drought': 'DR',
      'event.weather.hailstorm': 'HL',
      'event.weather.high_temperature': 'HT',
      'event.weather.tropical_storm': 'TS',
      'event.weather.high_winds': 'HW',
      'event.weather.high_humidity': 'HH',
      'event.weather.low_humidity': 'LH'
    };

    return typeMapping[apiType] || apiType;
  };

  const formType = mapApiTypeToFormType(initialValues.type);

  // Backend serializer returns weather-specific fields FLAT (not in extra_data)
  // Read fields directly from initialValues
  const mainInfoMethods = useForm({
    resolver: zodResolver(formSchemaMainInfo),
    defaultValues: {
      type: formType || '',
      lower_temperature: initialValues.lower_temperature?.toString() || '',
      way_of_protection: initialValues.way_of_protection || '',
      water_deficit: initialValues.water_deficit?.toString() || '',
      weight: initialValues.weight?.toString() || '',
      diameter: initialValues.diameter?.toString() || '',
      duration: initialValues.duration?.toString() || '',
      highest_temperature: initialValues.highest_temperature?.toString() || '',
      start_date: initialValues.start_date || '',
      end_date: initialValues.end_date || '',
      // Tropical Storm fields
      wind_speed: initialValues.wind_speed?.toString() || '',
      precipitation_amount: initialValues.precipitation_amount?.toString() || '',
      damage_assessment: initialValues.damage_assessment || '',
      // High Winds fields
      protection_measures: initialValues.protection_measures || '',
      // Humidity fields
      humidity_level: initialValues.humidity_level?.toString() || '',
      crop_impact: initialValues.crop_impact || '',
      observation: initialValues.observation || ''
    }
  });

  // Update form values when initialValues change (without mainInfoMethods in deps to prevent loops)
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      const mappedType = mapApiTypeToFormType(initialValues.type);
      mainInfoMethods.reset({
        type: mappedType || '',
        lower_temperature: initialValues.lower_temperature?.toString() || '',
        way_of_protection: initialValues.way_of_protection || '',
        water_deficit: initialValues.water_deficit?.toString() || '',
        weight: initialValues.weight?.toString() || '',
        diameter: initialValues.diameter?.toString() || '',
        duration: initialValues.duration?.toString() || '',
        highest_temperature: initialValues.highest_temperature?.toString() || '',
        start_date: initialValues.start_date || '',
        end_date: initialValues.end_date || '',
        // Tropical Storm fields
        wind_speed: initialValues.wind_speed?.toString() || '',
        precipitation_amount: initialValues.precipitation_amount?.toString() || '',
        damage_assessment: initialValues.damage_assessment || '',
        // High Winds fields
        protection_measures: initialValues.protection_measures || '',
        // Humidity fields
        humidity_level: initialValues.humidity_level?.toString() || '',
        crop_impact: initialValues.crop_impact || '',
        observation: initialValues.observation || ''
      });
    }
  }, [initialValues]); // Removed mainInfoMethods to prevent render loops

  const {
    reset: mainInfoReset,
    handleSubmit: mainInfoSubmit,
    watch,
    errors: mainInfoErrors,
    formState: { errors, isSubmitSuccessful },
    register
  } = mainInfoMethods;

  const type = watch('type', '');

  // Debug logging for form state (commented out to prevent render loops)
  // console.log('🔍 WeatherTab Debug:', { type, formType, initialValues, errors });

  // Real-time field watching for carbon calculation updates with proper dependency management
  useEffect(() => {
    let debounceTimeout;

    // Watch specific fields without causing re-render loops
    const subscription = watch((value, { name }) => {
      // Only trigger on relevant field changes
      const relevantFields = [
        'type',
        'lower_temperature',
        'highest_temperature',
        'water_deficit',
        'duration'
      ];

      if (relevantFields.includes(name) || !name) {
        // !name means multiple fields changed
        // Clear previous timeout
        if (debounceTimeout) {
          clearTimeout(debounceTimeout);
        }

        // Weather events do NOT trigger carbon calculations
        // Weather data is environmental context, not a source of carbon emissions
        // These are documentation events, similar to Business Events

        // NOTE: Weather events provide transparency value through:
        // - Environmental context for other agricultural activities
        // - Climate documentation for consumer understanding
        // - Weather impact tracking for agricultural transparency
        //
        // They do NOT generate carbon emissions and should not call carbon APIs

        // DISABLED: Previously called onDataChange(currentValues) inappropriately
      }
    });

    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - subscription handles changes internally

  const onSubmit = (data) => {
    switch (type) {
      case 'FR':
        data = {
          type: data.type,
          lower_temperature: data.lower_temperature,
          way_of_protection: data.way_of_protection,
          observation: data.observation
        };
        break;
      case 'DR':
        data = {
          type: data.type,
          water_deficit: data.water_deficit,
          observation: data.observation
        };
        break;
      case 'HL':
        data = {
          type: data.type,
          weight: data.weight,
          diameter: data.diameter,
          duration: data.duration,
          way_of_protection: data.way_of_protection,
          observation: data.observation
        };
        break;
      case 'HT':
        data = {
          type: data.type,
          highest_temperature: data.highest_temperature,
          start_date: data.start_date,
          end_date: data.end_date,
          observation: data.observation
        };
        break;
      case 'TS':
        data = {
          type: data.type,
          wind_speed: data.wind_speed,
          precipitation_amount: data.precipitation_amount,
          duration: data.duration,
          damage_assessment: data.damage_assessment,
          observation: data.observation
        };
        break;
      case 'HW':
        data = {
          type: data.type,
          wind_speed: data.wind_speed,
          duration: data.duration,
          protection_measures: data.protection_measures,
          observation: data.observation
        };
        break;
      case 'HH':
      case 'LH':
        data = {
          type: data.type,
          humidity_level: data.humidity_level,
          duration: data.duration,
          crop_impact: data.crop_impact,
          observation: data.observation
        };
        break;
      default:
        data = {
          type: data.type,
          observation: data.observation
        };
        break;
    }

    onSubmitHandler(data);
  };

  return (
    <FormProvider {...mainInfoMethods}>
      <form onSubmit={mainInfoSubmit(onSubmit)} style={{ width: '100%' }}>
        <Flex direction="column" w="100%">
          {/* Transparency Focus Alert */}
          <StandardAlert status="info" title="Weather Event & Transparency Documentation">
            <HStack spacing={2} mb={2}>
              <Icon as={FaCloud} color="blue.500" />
              <Text fontSize="sm" fontWeight="bold">
                Agricultural Climate Transparency
              </Text>
            </HStack>
            <Text fontSize="sm">
              Document weather conditions that affect your agricultural operations. This
              environmental context helps consumers understand the challenges and conditions that
              impact farming practices.
            </Text>
          </StandardAlert>

          {/* Section 1: Weather Event Information */}
          <Box mb={6} p={4} border="1px" borderColor="gray.200" borderRadius="lg">
            <HStack justify="space-between" align="center" mb={4}>
              <Text fontSize="md" fontWeight="bold" color="green.600">
                <Icon as={FaCloud} mr={2} />
                Weather Event Information
              </Text>
              <Badge colorScheme="green" fontSize="xs">
                Environmental Documentation
              </Badge>
            </HStack>

            <SimpleGrid columns={{ base: 1, md: 1 }} spacing={4}>
              <StandardField
                label="Weather Event Type *"
                required
                error={errors.type?.message}
                helpText="Document weather conditions that affect your agricultural operations">
                <Controller
                  name="type"
                  control={mainInfoMethods.control}
                  render={({ field }) => (
                    <StandardSelect placeholder="Select weather event type" {...field}>
                      <option value="FR">Frost</option>
                      <option value="DR">Drought</option>
                      <option value="HL">Hailstorms</option>
                      <option value="HT">High Temperatures</option>
                      <option value="TS">Tropical Storm</option>
                      <option value="HW">High Winds</option>
                      <option value="HH">High Humidity</option>
                      <option value="LH">Low Humidity</option>
                    </StandardSelect>
                  )}
                />
              </StandardField>
            </SimpleGrid>
          </Box>

          {/* Section 2: Weather Details & Measurements (Dynamic based on type) */}
          {type && (
            <Box mb={6} p={4} border="1px" borderColor="gray.200" borderRadius="lg">
              <HStack justify="space-between" align="center" mb={4}>
                <Text fontSize="md" fontWeight="bold" color="blue.600">
                  <Icon as={FaThermometerHalf} mr={2} />
                  Weather Details & Measurements
                </Text>
                <Badge colorScheme="blue" fontSize="xs">
                  Climate Context
                </Badge>
              </HStack>

              {type === 'FR' ? (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <StandardField
                    label="Lower Temperature"
                    helpText="Minimum temperature recorded during frost event">
                    <StandardInput
                      type="text"
                      placeholder="e.g., -2°C or 28°F"
                      {...register('lower_temperature')}
                    />
                  </StandardField>
                  <StandardField
                    label="Protection Method"
                    helpText="Measures taken to protect crops">
                    <StandardInput
                      type="text"
                      placeholder="e.g., frost blankets, irrigation"
                      {...register('way_of_protection')}
                    />
                  </StandardField>
                </SimpleGrid>
              ) : type === 'DR' ? (
                <SimpleGrid columns={{ base: 1, md: 1 }} spacing={4}>
                  <StandardField
                    label="Water Deficit"
                    helpText="Accumulated water deficit during drought period">
                    <StandardInput
                      type="text"
                      placeholder="e.g., 50mm below average"
                      {...register('water_deficit')}
                    />
                  </StandardField>
                </SimpleGrid>
              ) : type === 'HL' ? (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <StandardField
                    label="Average Hailstone Weight"
                    helpText="Weight of individual hailstones">
                    <StandardInput type="text" placeholder="e.g., 5g" {...register('weight')} />
                  </StandardField>
                  <StandardField label="Average Hailstone Diameter" helpText="Size of hailstones">
                    <StandardInput type="text" placeholder="e.g., 2cm" {...register('diameter')} />
                  </StandardField>
                  <StandardField label="Duration" helpText="How long the hailstorm lasted">
                    <StandardInput
                      type="text"
                      placeholder="e.g., 15 minutes"
                      {...register('duration')}
                    />
                  </StandardField>
                  <StandardField
                    label="Protection Method"
                    helpText="Measures taken to protect crops">
                    <StandardInput
                      type="text"
                      placeholder="e.g., hail nets, covered structures"
                      {...register('way_of_protection')}
                    />
                  </StandardField>
                </SimpleGrid>
              ) : type === 'HT' ? (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <StandardField
                    label="Highest Temperature"
                    helpText="Peak temperature during heat event">
                    <StandardInput
                      type="text"
                      placeholder="e.g., 42°C or 108°F"
                      {...register('highest_temperature')}
                    />
                  </StandardField>
                  <StandardField
                    label="Start Date"
                    helpText="When the high temperature period began">
                    <StandardInput type="datetime-local" {...register('start_date')} />
                  </StandardField>
                  <StandardField label="End Date" helpText="When the high temperature period ended">
                    <StandardInput type="datetime-local" {...register('end_date')} />
                  </StandardField>
                </SimpleGrid>
              ) : type === 'TS' ? (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <StandardField label="Wind Speed" helpText="Maximum wind speed recorded">
                    <StandardInput
                      type="number"
                      placeholder="e.g., 120 km/h"
                      {...register('wind_speed')}
                    />
                  </StandardField>
                  <StandardField
                    label="Precipitation Amount"
                    helpText="Total rainfall during storm">
                    <StandardInput
                      type="number"
                      step="0.1"
                      placeholder="e.g., 150mm"
                      {...register('precipitation_amount')}
                    />
                  </StandardField>
                  <StandardField label="Duration" helpText="Storm duration in hours">
                    <StandardInput
                      type="number"
                      step="0.5"
                      placeholder="e.g., 6 hours"
                      {...register('duration')}
                    />
                  </StandardField>
                  <StandardField
                    label="Damage Assessment"
                    helpText="Description of damage to crops/infrastructure">
                    <StandardInput
                      type="text"
                      placeholder="e.g., minor leaf damage, no structural damage"
                      {...register('damage_assessment')}
                    />
                  </StandardField>
                </SimpleGrid>
              ) : type === 'HW' ? (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <StandardField label="Wind Speed" helpText="Maximum wind speed recorded">
                    <StandardInput
                      type="number"
                      placeholder="e.g., 80 km/h"
                      {...register('wind_speed')}
                    />
                  </StandardField>
                  <StandardField label="Duration" helpText="High wind period duration">
                    <StandardInput
                      type="number"
                      step="0.5"
                      placeholder="e.g., 3 hours"
                      {...register('duration')}
                    />
                  </StandardField>
                  <StandardField
                    label="Protection Measures"
                    helpText="Actions taken to protect crops">
                    <StandardInput
                      type="text"
                      placeholder="e.g., secured equipment, protected young plants"
                      {...register('protection_measures')}
                    />
                  </StandardField>
                </SimpleGrid>
              ) : type === 'HH' || type === 'LH' ? (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <StandardField label="Humidity Level" helpText="Humidity percentage recorded">
                    <StandardInput
                      type="number"
                      min="0"
                      max="100"
                      placeholder="e.g., 85%"
                      {...register('humidity_level')}
                    />
                  </StandardField>
                  <StandardField label="Duration" helpText="How long unusual humidity lasted">
                    <StandardInput
                      type="number"
                      step="0.5"
                      placeholder="e.g., 48 hours"
                      {...register('duration')}
                    />
                  </StandardField>
                  <StandardField label="Crop Impact" helpText="Effects on crop health and growth">
                    <StandardInput
                      type="text"
                      placeholder="e.g., increased disease pressure, slower growth"
                      {...register('crop_impact')}
                    />
                  </StandardField>
                </SimpleGrid>
              ) : null}
            </Box>
          )}

          {/* Section 3: Transparency Notes */}
          <Box mb={6} p={4} border="1px" borderColor="gray.200" borderRadius="lg">
            <HStack justify="space-between" align="center" mb={4}>
              <Text fontSize="md" fontWeight="bold" color="green.600">
                <Icon as={FaSeedling} mr={2} />
                Environmental Context & Transparency Notes
              </Text>
              <Badge colorScheme="green" fontSize="xs">
                Consumer Transparency
              </Badge>
            </HStack>

            <StandardField
              label="Observations"
              helpText="Share additional details about weather impact and farming response that help consumers understand your practices">
              <StandardTextarea
                placeholder="Optional: Describe how this weather event affected your farming operations, what measures you took, and how it impacts the quality or safety of your produce."
                rows={4}
                {...register('observation')}
              />
            </StandardField>
          </Box>
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
        </Flex>
      </form>
    </FormProvider>
  );
};

export default WeatherTab;
