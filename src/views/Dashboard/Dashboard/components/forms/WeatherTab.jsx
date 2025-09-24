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
  Box
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

  // Extract extra_data fields if they exist
  const extraData = initialValues.extra_data || {};

  const mainInfoMethods = useForm({
    resolver: zodResolver(formSchemaMainInfo),
    defaultValues: {
      type: formType || '',
      lower_temperature: extraData.lower_temperature?.toString() || '',
      way_of_protection: extraData.way_of_protection || '',
      water_deficit: extraData.water_deficit?.toString() || '',
      weight: extraData.weight?.toString() || '',
      diameter: extraData.diameter?.toString() || '',
      duration: extraData.duration?.toString() || '',
      highest_temperature: extraData.highest_temperature?.toString() || '',
      start_date: extraData.start_date || '',
      end_date: extraData.end_date || '',
      observation: initialValues.observation || ''
    }
  });

  // Update form values when initialValues change (without mainInfoMethods in deps to prevent loops)
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      const extraData = initialValues.extra_data || {};
      const mappedType = mapApiTypeToFormType(initialValues.type);
      mainInfoMethods.reset({
        type: mappedType || '',
        lower_temperature: extraData.lower_temperature?.toString() || '',
        way_of_protection: extraData.way_of_protection || '',
        water_deficit: extraData.water_deficit?.toString() || '',
        weight: extraData.weight?.toString() || '',
        diameter: extraData.diameter?.toString() || '',
        duration: extraData.duration?.toString() || '',
        highest_temperature: extraData.highest_temperature?.toString() || '',
        start_date: extraData.start_date || '',
        end_date: extraData.end_date || '',
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
      const relevantFields = ['type', 'lower_temperature', 'highest_temperature', 'water_deficit', 'duration'];
      
      if (relevantFields.includes(name) || !name) { // !name means multiple fields changed
        // Clear previous timeout
        if (debounceTimeout) {
          clearTimeout(debounceTimeout);
        }
        
        // Debounce the callback
        debounceTimeout = setTimeout(() => {
          if (onDataChange && typeof onDataChange === 'function') {
            const currentValues = mainInfoMethods.getValues();

            // Only trigger if we have meaningful data
            if (currentValues.type) {
              try {
                onDataChange(currentValues);
              } catch (error) {
                console.error('[WeatherTab]: Error calling onDataChange:', error);
              }
            }
          }
        }, 500);
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
          <StandardField
            label={intl.formatMessage({ id: 'app.type' })}
            required
            error={errors.type?.message}
          >
            <Controller
              name="type"
              control={mainInfoMethods.control}
              render={({ field }) => (
                <StandardSelect
                  placeholder={intl.formatMessage({ id: 'app.selectOption' })}
                  {...field}
                >
                  <option value="FR">{intl.formatMessage({ id: 'app.frost' })}</option>
                  <option value="DR">{intl.formatMessage({ id: 'app.drought' })}</option>
                  <option value="HL">{intl.formatMessage({ id: 'app.hailstorms' })}</option>
                  <option value="HT">{intl.formatMessage({ id: 'app.highTemperatures' })}</option>
                  <option value="TS">{intl.formatMessage({ id: 'app.tropicalStorm' })}</option>
                  <option value="HW">{intl.formatMessage({ id: 'app.highWinds' })}</option>
                  <option value="HH">{intl.formatMessage({ id: 'app.highHumidity' })}</option>
                  <option value="LH">{intl.formatMessage({ id: 'app.lowHumidity' })}</option>
                </StandardSelect>
              )}
            />
          </StandardField>
          {type === 'FR' ? (
            <Flex gap={'20px'}>
              <StandardField label={intl.formatMessage({ id: 'app.lowerTemperature' })} flex={1}>
                <StandardInput
                  type="text"
                  placeholder={intl.formatMessage({ id: 'app.temperature' })}
                  {...register('lower_temperature')}
                />
              </StandardField>
              <StandardField label={intl.formatMessage({ id: 'app.wayOfProtection' })} flex={1}>
                <StandardInput
                  type="text"
                  placeholder={intl.formatMessage({ id: 'app.notNet' })}
                  {...register('way_of_protection')}
                />
              </StandardField>
            </Flex>
          ) : type === 'DR' ? (
            <StandardField label={intl.formatMessage({ id: 'app.accumulatedWaterDeficit' })}>
              <StandardInput
                type="text"
                placeholder={intl.formatMessage({ id: 'app.waterDeficit' })}
                {...register('water_deficit')}
              />
            </StandardField>
          ) : type === 'HL' ? (
            <>
              <Flex gap={'20px'}>
                <StandardField
                  label={intl.formatMessage({ id: 'app.averageWeightOfHailstones' })}
                  flex={1}
                >
                  <StandardInput
                    type="text"
                    placeholder={intl.formatMessage({ id: 'app.weight' })}
                    {...register('weight')}
                  />
                </StandardField>
                <StandardField
                  label={intl.formatMessage({ id: 'app.averageDiameterOfHailstones' })}
                  flex={1}
                >
                  <StandardInput
                    type="text"
                    placeholder={intl.formatMessage({ id: 'app.diameter' })}
                    {...register('diameter')}
                  />
                </StandardField>
              </Flex>
              <Flex gap={'20px'}>
                <StandardField label={intl.formatMessage({ id: 'app.duration' })} flex={1}>
                  <StandardInput
                    type="text"
                    placeholder={intl.formatMessage({ id: 'app.duration' })}
                    {...register('duration')}
                  />
                </StandardField>
                <StandardField label={intl.formatMessage({ id: 'app.wayOfProtection' })} flex={1}>
                  <StandardInput
                    type="text"
                    placeholder={intl.formatMessage({ id: 'app.wayOfProtection' })}
                    {...register('way_of_protection')}
                  />
                </StandardField>
              </Flex>
            </>
          ) : type === 'HT' ? (
            <Flex gap={'20px'} direction={'column'}>
              <StandardField label={intl.formatMessage({ id: 'app.highestTemperature' })}>
                <StandardInput
                  type="text"
                  placeholder={intl.formatMessage({ id: 'app.temperature' })}
                  {...register('highest_temperature')}
                />
              </StandardField>
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={4}>
                  {intl.formatMessage({ id: 'app.timePeriod' })}
                </Text>
                <Flex flexDir={'row'} width={'100%'} gap={'20px'}>
                  <StandardField label={intl.formatMessage({ id: 'app.from' })} flex={1}>
                    <StandardInput
                      type="datetime-local"
                      placeholder={intl.formatMessage({ id: 'app.selectDateAndTime' })}
                      {...register('start_date')}
                    />
                  </StandardField>
                  <StandardField label={intl.formatMessage({ id: 'app.to' })} flex={1}>
                    <StandardInput
                      type="datetime-local"
                      placeholder={intl.formatMessage({ id: 'app.selectDateAndTime' })}
                      {...register('end_date')}
                    />
                  </StandardField>
                </Flex>
              </Box>
            </Flex>
          ) : type === 'TS' ? (
            <Flex gap={'20px'} direction={'column'}>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                {intl.formatMessage({ id: 'app.tropicalStorm' })} Details
              </Text>
              <Flex gap={'20px'}>
                <StandardField label={intl.formatMessage({ id: 'app.windSpeed' })} flex={1}>
                  <StandardInput
                    type="number"
                    placeholder={intl.formatMessage({ id: 'app.windSpeedPlaceholder' })}
                    {...register('wind_speed')}
                  />
                </StandardField>
                <StandardField label={intl.formatMessage({ id: 'app.precipitationAmount' })} flex={1}>
                  <StandardInput
                    type="number"
                    step="0.1"
                    placeholder={intl.formatMessage({ id: 'app.precipitationPlaceholder' })}
                    {...register('precipitation_amount')}
                  />
                </StandardField>
              </Flex>
              <Flex gap={'20px'}>
                <StandardField label={intl.formatMessage({ id: 'app.duration' })} flex={1}>
                  <StandardInput
                    type="number"
                    step="0.5"
                    placeholder={intl.formatMessage({ id: 'app.duration' })}
                    {...register('duration')}
                  />
                </StandardField>
                <StandardField label={intl.formatMessage({ id: 'app.damageAssessment' })} flex={1}>
                  <StandardInput
                    type="text"
                    placeholder={intl.formatMessage({ id: 'app.damageAssessmentPlaceholder' })}
                    {...register('damage_assessment')}
                  />
                </StandardField>
              </Flex>
            </Flex>
          ) : type === 'HW' ? (
            <Flex gap={'20px'} direction={'column'}>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                {intl.formatMessage({ id: 'app.highWinds' })} Details
              </Text>
              <Flex gap={'20px'}>
                <StandardField label={intl.formatMessage({ id: 'app.windSpeed' })} flex={1}>
                  <StandardInput
                    type="number"
                    placeholder={intl.formatMessage({ id: 'app.windSpeedPlaceholder' })}
                    {...register('wind_speed')}
                  />
                </StandardField>
                <StandardField label={intl.formatMessage({ id: 'app.duration' })} flex={1}>
                  <StandardInput
                    type="number"
                    step="0.5"
                    placeholder={intl.formatMessage({ id: 'app.duration' })}
                    {...register('duration')}
                  />
                </StandardField>
              </Flex>
              <StandardField label={intl.formatMessage({ id: 'app.protectionMeasures' })}>
                <StandardInput
                  type="text"
                  placeholder={intl.formatMessage({ id: 'app.protectionMeasuresPlaceholder' })}
                  {...register('protection_measures')}
                />
              </StandardField>
            </Flex>
          ) : type === 'HH' ? (
            <Flex gap={'20px'} direction={'column'}>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                {intl.formatMessage({ id: 'app.highHumidity' })} Details
              </Text>
              <Flex gap={'20px'}>
                <StandardField label={intl.formatMessage({ id: 'app.humidityLevel' })} flex={1}>
                  <StandardInput
                    type="number"
                    min="0"
                    max="100"
                    placeholder={intl.formatMessage({ id: 'app.humidityLevelPlaceholder' })}
                    {...register('humidity_level')}
                  />
                </StandardField>
                <StandardField label={intl.formatMessage({ id: 'app.duration' })} flex={1}>
                  <StandardInput
                    type="number"
                    step="0.5"
                    placeholder={intl.formatMessage({ id: 'app.duration' })}
                    {...register('duration')}
                  />
                </StandardField>
              </Flex>
              <StandardField label={intl.formatMessage({ id: 'app.cropImpact' })}>
                <StandardInput
                  type="text"
                  placeholder={intl.formatMessage({ id: 'app.cropImpactPlaceholder' })}
                  {...register('crop_impact')}
                />
              </StandardField>
            </Flex>
          ) : type === 'LH' ? (
            <Flex gap={'20px'} direction={'column'}>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                {intl.formatMessage({ id: 'app.lowHumidity' })} Details
              </Text>
              <Flex gap={'20px'}>
                <StandardField label={intl.formatMessage({ id: 'app.humidityLevel' })} flex={1}>
                  <StandardInput
                    type="number"
                    min="0"
                    max="100"
                    placeholder={intl.formatMessage({ id: 'app.humidityLevelPlaceholder' })}
                    {...register('humidity_level')}
                  />
                </StandardField>
                <StandardField label={intl.formatMessage({ id: 'app.duration' })} flex={1}>
                  <StandardInput
                    type="number"
                    step="0.5"
                    placeholder={intl.formatMessage({ id: 'app.duration' })}
                    {...register('duration')}
                  />
                </StandardField>
              </Flex>
              <StandardField label={intl.formatMessage({ id: 'app.cropImpact' })}>
                <StandardInput
                  type="text"
                  placeholder={intl.formatMessage({ id: 'app.cropImpactPlaceholder' })}
                  {...register('crop_impact')}
                />
              </StandardField>
            </Flex>
          ) : (
            <></>
          )}

          <StandardField label={intl.formatMessage({ id: 'app.observations' })}>
            <StandardTextarea
              placeholder={intl.formatMessage({ id: 'app.description' })}
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

export default WeatherTab;
