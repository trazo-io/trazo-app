// Sprint 3 Epic 3.1: Cleaned unused Chakra imports - using StandardComponents only
import { Icon, useColorModeValue, HStack, Box, SimpleGrid, VStack, Flex } from '@chakra-ui/react';
import {
  StandardCard,
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea,
  SectionHeader,
  SectionBox
} from 'components/Design/StandardComponents';
import {
  FaChevronLeft,
  FaChevronRight,
  FaCloud,
  FaThermometerHalf,
  FaEye,
  FaSeedling
} from 'react-icons/fa';
import { FormProvider, useForm, useWatch, Controller } from 'react-hook-form';
// Custom components
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle
} from 'react';
import { number, object, string, array } from 'zod';
import CustomFieldsForm from './CustomFieldsForm';

import { FaPlus } from 'react-icons/fa';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';
// Event Field Registry (Phase 5G — form integration)
import { useFormFields } from 'src/hooks/useFormFields';
import { RegistryFormField } from 'src/components/Forms/RegistryFormField';

// Weather type display names for auto-generated event names
const WEATHER_TYPE_NAMES = {
  FR: 'Frost Event',
  DR: 'Drought',
  HL: 'Hailstorm',
  HT: 'High Temperatures',
  TS: 'Tropical Storm',
  HW: 'High Winds',
  HH: 'High Humidity',
  LH: 'Low Humidity'
};

const formSchemaMainInfo = object({
  type: string().min(1, 'Weather event type is required'),
  name: string().optional(),
  // Companion unit for lower_temperature (FR) and highest_temperature (HT).
  // Default "F" in form defaults since Trazo's primary market is US farms.
  temperature_unit: string().optional(),
  lower_temperature: string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true; // Optional field
        const num = parseFloat(val);
        // Bounds widened to accept both Celsius (-58°C is unrealistic but safe)
        // and Fahrenheit (-58°F ≈ -50°C). Unit is validated separately below.
        return !isNaN(num) && num >= -58 && num <= 122;
      },
      { message: 'Lower temperature out of range (-58 to 122)' }
    )
    .transform((val) => (val ? Number(val) : undefined)),
  way_of_protection: string().optional(),
  water_deficit: string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true; // Optional field
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0 && num <= 500;
      },
      { message: 'Water deficit must be between 0 and 500 mm' }
    )
    .transform((val) => (val ? Number(val) : undefined)),
  // Sprint 2 Epic 2.1.3: Removed weight and diameter fields (excessive detail)
  // Duration: minutes for hailstorms (0-120), hours for other events (0-168 = 1 week)
  duration: string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true; // Optional field
        const num = parseFloat(val);
        // One shared field, two units: HL enters MINUTES (widget max 1440), the hour
        // variants cap at 720 — the old ceiling of 168 rejected values the widgets accept.
        return !isNaN(num) && num >= 0 && num <= 1440;
      },
      { message: 'Duration must be a positive number' }
    )
    .transform((val) => (val ? Number(val) : undefined)),
  highest_temperature: string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true; // Optional field
        const num = parseFloat(val);
        // Bounds accept both Celsius (up to 60°C) and Fahrenheit (up to 140°F).
        return !isNaN(num) && num >= -20 && num <= 140;
      },
      { message: 'Highest temperature out of range (-20 to 140)' }
    )
    .transform((val) => (val ? Number(val) : undefined)),
  start_date: string().optional(),
  end_date: string().optional(),
  // Tropical Storm fields
  wind_speed: string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0 && num <= 400; // Max 400 km/h (category 5+ hurricane)
      },
      { message: 'Wind speed must be between 0 and 400 km/h' }
    )
    .transform((val) => (val ? Number(val) : undefined)),
  precipitation_amount: string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0 && num <= 1000; // Max 1000mm (extreme rainfall)
      },
      { message: 'Precipitation must be between 0 and 1000 mm' }
    )
    .transform((val) => (val ? Number(val) : undefined)),
  damage_assessment: string().optional(),
  // High Winds fields
  protection_measures: string().optional(),
  // Humidity fields (both high and low)
  humidity_level: string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true; // Optional field
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0 && num <= 100;
      },
      { message: 'Humidity level must be between 0% and 100%' }
    )
    .transform((val) => (val ? Number(val) : undefined)),
  crop_impact: string().optional(),
  observation: string().optional(),
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

const WeatherTab = forwardRef(
  (
    {
      onSubmitHandler,
      onDataChange,
      onValidationChange,
      onPrev,
      initialValues = {},
      hideActions = false
    },
    ref
  ) => {
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
      mode: 'onBlur', // Validate when user leaves field - shows errors immediately
      defaultValues: {
        type: formType || '',
        // Default to Fahrenheit — Trazo's primary market is US farms.
        temperature_unit: initialValues.temperature_unit || 'F',
        lower_temperature: initialValues.lower_temperature?.toString() || '',
        way_of_protection: initialValues.way_of_protection || '',
        water_deficit: initialValues.water_deficit?.toString() || '',
        // Sprint 2 Epic 2.1.3: Removed weight and diameter fields
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
        observation: initialValues.observation || '',
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
            const currentValues = mainInfoMethods.getValues();
            onDataChange(currentValues);
          }
        },
        submitForm: () =>
          new Promise((resolve, reject) => {
            mainInfoMethods.handleSubmit(
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

    // Track if this is the initial mount - only reset form on first load, not on every onDataChange
    const isInitialMount = React.useRef(true);

    // Update form values only on initial mount (for loading existing event data)
    // Skip reset when changes come from user editing (via onDataChange)
    useEffect(() => {
      if (isInitialMount.current && Object.keys(initialValues).length > 0) {
        console.log('🔍 WeatherTab: Initial load - setting form values:', initialValues);
        const mappedType = mapApiTypeToFormType(initialValues.type);
        console.log('🔍 WeatherTab: mapped type:', mappedType, 'from:', initialValues.type);
        mainInfoMethods.reset({
          type: mappedType || '',
          name: initialValues.name || '',
          temperature_unit: initialValues.temperature_unit || 'F',
          lower_temperature: initialValues.lower_temperature?.toString() || '',
          way_of_protection: initialValues.way_of_protection || '',
          water_deficit: initialValues.water_deficit?.toString() || '',
          // Sprint 2 Epic 2.1.3: Removed weight and diameter fields
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
          observation: initialValues.observation || '',
          custom_fields: initialValues.custom_fields || []
        });
        isInitialMount.current = false; // Mark as initialized - skip future resets
      }
    }, [JSON.stringify(initialValues)]); // Use JSON.stringify to prevent render loops from object reference changes

    // Sync custom fields with form
    useEffect(() => {
      mainInfoMethods.setValue('custom_fields', customFields);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customFields]);

    const {
      reset: mainInfoReset,
      handleSubmit: mainInfoSubmit,
      watch,
      errors: mainInfoErrors,
      formState: { errors, isSubmitSuccessful, isValid },
      register
    } = mainInfoMethods;

    // 🔴 useWatch, NOT watch('type', ''). MEASURED 2026-08-16.
    //
    // Every detail section below is gated on this value. With `watch('type', '')` the gate
    // read '' on the first render and never recovered: `type` is supplied through
    // `defaultValues` (and re-applied by the mount `reset()` a few lines up), and neither is
    // a CHANGE, so the subscription that would re-render never fired. The section only
    // appeared once the user actively picked a different option.
    //
    // What that cost: opening an EXISTING weather event for editing showed the type as
    // "Frost" and none of its recorded fields — the temperature that triggered protection,
    // the protection method. The grower saw an empty form over data they had already
    // entered. Same class as the Planting defect where correcting a seed status hid the
    // grower's own search evidence.
    //
    // `useWatch` subscribes to the field itself, so it reflects defaultValues on the first
    // render and updates after `reset()`.
    const type = useWatch({
      control: mainInfoMethods.control,
      name: 'type',
      defaultValue: formType || ''
    });

    // Auto-generate event name from weather type (matches Production/Soil/Pest pattern)
    useEffect(() => {
      if (type && WEATHER_TYPE_NAMES[type]) {
        const currentName = mainInfoMethods.getValues('name');
        const autoNames = Object.values(WEATHER_TYPE_NAMES);
        if (!currentName || !currentName.trim() || autoNames.includes(currentName)) {
          mainInfoMethods.setValue('name', WEATHER_TYPE_NAMES[type], { shouldDirty: false });
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type]);

    // Report validation errors to parent component
    // NOTE: Use error count as dep instead of errors object (new reference every render)
    const errorCount = Object.keys(errors).length;
    useEffect(() => {
      if (onValidationChange) {
        onValidationChange(errorCount > 0);
      }
      return () => {
        if (onValidationChange) {
          onValidationChange(false);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [errorCount]);

    // Debug logging for form state (commented out to prevent render loops)
    // console.log('🔍 WeatherTab Debug:', { type, formType, initialValues, errors });

    // Real-time field watching for carbon calculation updates with proper dependency management
    useEffect(() => {
      let debounceTimeout;

      // Watch specific fields without causing re-render loops
      const subscription = watch((value, { name }) => {
        // Only trigger on relevant field changes - include ALL weather fields for proper persistence
        // Sprint 2 Epic 2.1.3: Removed weight and diameter from watched fields
        const relevantFields = [
          'type',
          'name',
          'lower_temperature',
          'temperature_unit',
          'way_of_protection',
          'highest_temperature',
          'water_deficit',
          'duration',
          'start_date',
          'end_date',
          'wind_speed',
          'precipitation_amount',
          'damage_assessment',
          'protection_measures',
          'humidity_level',
          'crop_impact',
          'observation',
          'custom_fields'
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

          // Debounce onDataChange to prevent re-renders while typing
          debounceTimeout = setTimeout(() => {
            onDataChange(value);
          }, 500); // 500ms debounce - waits for user to stop typing
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
      // Preserve name across all weather types (added before switch to avoid repetition)
      const eventName = data.name;
      switch (type) {
        case 'FR':
          data = {
            type: data.type,
            lower_temperature: data.lower_temperature,
            temperature_unit: data.temperature_unit || 'F',
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
          // Sprint 2 Epic 2.1.3: Removed weight and diameter fields (excessive detail)
          data = {
            type: data.type,
            duration: data.duration,
            way_of_protection: data.way_of_protection,
            observation: data.observation
          };
          break;
        case 'HT':
          data = {
            type: data.type,
            highest_temperature: data.highest_temperature,
            temperature_unit: data.temperature_unit || 'F',
            start_date: data.start_date || null,
            end_date: data.end_date || null,
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

      // Merge name back into the structured data
      if (eventName) {
        data.name = eventName;
      }
      onSubmitHandler(data);
    };

    // Keep ref in sync with latest handler on every render (avoids stale closures)
    submitHandlerRef.current = onSubmit;

    return (
      <FormProvider {...mainInfoMethods}>
        <form onSubmit={mainInfoSubmit(onSubmit)} noValidate style={{ width: '100%' }}>
          <Flex direction="column" w="100%">
            {/* Forms are hand-crafted by design: the NOP section grouping below is what
                makes the audit export complete, and the registry renderer flattens it.
                The field registry is the SSOT for DISPLAY surfaces (consumer card, modal,
                timeline) and is enforced here by src/config/events/__tests__/
                formConformance.test.ts, not by a runtime flag. */}
            <>
              {/* Section 1: activity basics */}
              <SectionBox>
                {/* Not "Weather Event Information" — EVENT_TYPE_NAMES[0]. Name and
                      subtype; the shared heading. */}
                <SectionHeader
                  icon={FaCloud}
                  title={intl.formatMessage({ id: 'events.section.activityBasics' })}
                  badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                />

                <SimpleGrid columns={{ base: 1, md: 1 }} spacing={4}>
                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.weather.fields.weatherEventType',
                      defaultMessage: 'Weather Event Type'
                    })}
                    required
                    error={errors.type?.message}
                    helpText={intl.formatMessage({
                      id: 'events.weather.help.documentWeatherConditionsThatAffectYourAgric',
                      defaultMessage:
                        'Document weather conditions that affect your agricultural operations'
                    })}>
                    <Controller
                      name="type"
                      control={mainInfoMethods.control}
                      render={({ field }) => (
                        <StandardSelect
                          placeholder={intl.formatMessage({
                            id: 'events.weather.placeholders.selectWeatherEventType',
                            defaultMessage: 'Select weather event type'
                          })}
                          {...field}>
                          <option value="FR">
                            {intl.formatMessage({
                              id: 'events.weather.options.frost',
                              defaultMessage: 'Frost'
                            })}
                          </option>
                          <option value="DR">
                            {intl.formatMessage({
                              id: 'events.weather.options.drought',
                              defaultMessage: 'Drought'
                            })}
                          </option>
                          <option value="HL">
                            {intl.formatMessage({
                              id: 'events.weather.options.hailstorms',
                              defaultMessage: 'Hailstorms'
                            })}
                          </option>
                          <option value="HT">
                            {intl.formatMessage({
                              id: 'events.weather.options.highTemperatures',
                              defaultMessage: 'High Temperatures'
                            })}
                          </option>
                          <option value="TS">
                            {intl.formatMessage({
                              id: 'events.weather.options.tropicalStorm',
                              defaultMessage: 'Tropical Storm'
                            })}
                          </option>
                          <option value="HW">
                            {intl.formatMessage({
                              id: 'events.weather.options.highWinds',
                              defaultMessage: 'High Winds'
                            })}
                          </option>
                          <option value="HH">
                            {intl.formatMessage({
                              id: 'events.weather.options.highHumidity',
                              defaultMessage: 'High Humidity'
                            })}
                          </option>
                          <option value="LH">
                            {intl.formatMessage({
                              id: 'events.weather.options.lowHumidity',
                              defaultMessage: 'Low Humidity'
                            })}
                          </option>
                        </StandardSelect>
                      )}
                    />
                  </StandardField>

                  {/* Event Name - Optional, auto-generated from weather type if empty */}
                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.weather.fields.eventName',
                      defaultMessage: 'Event Name'
                    })}
                    helpText={intl.formatMessage({
                      id: 'events.weather.help.autoGeneratedFromWeatherTypeCustomizeForSpec',
                      defaultMessage:
                        'Auto-generated from weather type. Customize for specific events.'
                    })}>
                    <StandardInput
                      type="text"
                      placeholder={`e.g., ${
                        WEATHER_TYPE_NAMES[type] || 'Weather Event'
                      } - North Field`}
                      {...register('name')}
                    />
                  </StandardField>
                </SimpleGrid>
              </SectionBox>

              {/* Section 2: Weather Details & Measurements (Dynamic based on type) */}
              {type && (
                <SectionBox>
                  <SectionHeader
                    icon={FaThermometerHalf}
                    title={intl.formatMessage({
                      id: 'events.weather.sections.weatherDetailsMeasurements',
                      defaultMessage: 'Weather Details & Measurements'
                    })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                  />

                  {type === 'FR' ? (
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.weather.fields.lowerTemperature',
                          defaultMessage: 'Lower Temperature'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.minimumTemperatureRecordedDuringFrostEvent',
                          defaultMessage: 'Minimum temperature recorded during frost event'
                        })}
                        error={errors.lower_temperature?.message}>
                        <HStack spacing={2} align="stretch">
                          <Box flex="1">
                            <StandardInput
                              type="number"
                              step="0.1"
                              min="-58"
                              max="122"
                              placeholder="e.g., 28 (°F) or -2 (°C)"
                              {...register('lower_temperature')}
                            />
                          </Box>
                          <Box w="90px" flexShrink={0}>
                            <StandardSelect {...register('temperature_unit')}>
                              <option value="F">
                                {intl.formatMessage({
                                  id: 'events.weather.options.f',
                                  defaultMessage: '°F'
                                })}
                              </option>
                              <option value="C">
                                {intl.formatMessage({
                                  id: 'events.weather.options.c',
                                  defaultMessage: '°C'
                                })}
                              </option>
                            </StandardSelect>
                          </Box>
                        </HStack>
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.weather.fields.protectionMethod',
                          defaultMessage: 'Protection Method'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.measuresTakenToProtectCrops',
                          defaultMessage: 'Measures taken to protect crops'
                        })}>
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
                        label={intl.formatMessage({
                          id: 'events.weather.fields.waterDeficitMm',
                          defaultMessage: 'Water Deficit (mm)'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.accumulatedWaterDeficitDuringDroughtPeriod',
                          defaultMessage: 'Accumulated water deficit during drought period'
                        })}
                        error={errors.water_deficit?.message}>
                        <StandardInput
                          type="number"
                          step="1"
                          min="0"
                          max="500"
                          placeholder="50"
                          {...register('water_deficit')}
                        />
                      </StandardField>
                    </SimpleGrid>
                  ) : type === 'HL' ? (
                    // Sprint 2 Epic 2.1.3: Removed weight and diameter fields (excessive detail, no consumer impact)
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.weather.fields.durationMinutes',
                          defaultMessage: 'Duration (minutes)'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.howLongTheHailstormLasted',
                          defaultMessage: 'How long the hailstorm lasted'
                        })}
                        error={errors.duration?.message}>
                        <StandardInput
                          type="number"
                          step="1"
                          min="0"
                          max="1440"
                          placeholder="15"
                          {...register('duration')}
                        />
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.weather.fields.protectionMethod',
                          defaultMessage: 'Protection Method'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.measuresTakenToProtectCrops',
                          defaultMessage: 'Measures taken to protect crops'
                        })}>
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
                        label={intl.formatMessage({
                          id: 'events.weather.fields.highestTemperature',
                          defaultMessage: 'Highest Temperature'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.peakTemperatureDuringHeatEvent',
                          defaultMessage: 'Peak temperature during heat event'
                        })}
                        error={errors.highest_temperature?.message}>
                        <HStack spacing={2} align="stretch">
                          <Box flex="1">
                            <StandardInput
                              type="number"
                              step="0.1"
                              min="-20"
                              max="140"
                              placeholder="e.g., 105 (°F) or 42 (°C)"
                              {...register('highest_temperature')}
                            />
                          </Box>
                          <Box w="90px" flexShrink={0}>
                            <StandardSelect {...register('temperature_unit')}>
                              <option value="F">
                                {intl.formatMessage({
                                  id: 'events.weather.options.f',
                                  defaultMessage: '°F'
                                })}
                              </option>
                              <option value="C">
                                {intl.formatMessage({
                                  id: 'events.weather.options.c',
                                  defaultMessage: '°C'
                                })}
                              </option>
                            </StandardSelect>
                          </Box>
                        </HStack>
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.weather.fields.startDate',
                          defaultMessage: 'Start Date'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.whenTheHighTemperaturePeriodBegan',
                          defaultMessage: 'When the high temperature period began'
                        })}>
                        <StandardInput type="datetime-local" {...register('start_date')} />
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.weather.fields.endDate',
                          defaultMessage: 'End Date'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.whenTheHighTemperaturePeriodEnded',
                          defaultMessage: 'When the high temperature period ended'
                        })}>
                        <StandardInput type="datetime-local" {...register('end_date')} />
                      </StandardField>
                    </SimpleGrid>
                  ) : type === 'TS' ? (
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.weather.fields.windSpeedKmH',
                          defaultMessage: 'Wind Speed (km/h)'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.maximumWindSpeedRecorded',
                          defaultMessage: 'Maximum wind speed recorded'
                        })}
                        error={errors.wind_speed?.message}>
                        <StandardInput
                          type="number"
                          step="1"
                          min="0"
                          max="400"
                          placeholder="120"
                          {...register('wind_speed')}
                        />
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.weather.fields.precipitationAmountMm',
                          defaultMessage: 'Precipitation Amount (mm)'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.totalRainfallDuringStorm',
                          defaultMessage: 'Total rainfall during storm'
                        })}
                        error={errors.precipitation_amount?.message}>
                        <StandardInput
                          type="number"
                          step="0.1"
                          min="0"
                          max="1000"
                          placeholder="150"
                          {...register('precipitation_amount')}
                        />
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.weather.fields.durationHours',
                          defaultMessage: 'Duration (hours)'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.stormDurationInHours',
                          defaultMessage: 'Storm duration in hours'
                        })}
                        error={errors.duration?.message}>
                        <StandardInput
                          type="number"
                          step="0.5"
                          min="0"
                          max="168"
                          placeholder="6"
                          {...register('duration')}
                        />
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.weather.fields.damageAssessment',
                          defaultMessage: 'Damage Assessment'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.descriptionOfDamageToCropsInfrastructure',
                          defaultMessage: 'Description of damage to crops/infrastructure'
                        })}>
                        <StandardInput
                          type="text"
                          placeholder="e.g., minor leaf damage, no structural damage"
                          {...register('damage_assessment')}
                        />
                      </StandardField>
                    </SimpleGrid>
                  ) : type === 'HW' ? (
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.weather.fields.windSpeedKmH',
                          defaultMessage: 'Wind Speed (km/h)'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.maximumWindSpeedRecorded',
                          defaultMessage: 'Maximum wind speed recorded'
                        })}
                        error={errors.wind_speed?.message}>
                        <StandardInput
                          type="number"
                          step="1"
                          min="0"
                          max="400"
                          placeholder="80"
                          {...register('wind_speed')}
                        />
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.weather.fields.durationHours',
                          defaultMessage: 'Duration (hours)'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.highWindPeriodDuration',
                          defaultMessage: 'High wind period duration'
                        })}
                        error={errors.duration?.message}>
                        <StandardInput
                          type="number"
                          step="0.5"
                          min="0"
                          max="168"
                          placeholder="3"
                          {...register('duration')}
                        />
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.weather.fields.protectionMeasures',
                          defaultMessage: 'Protection Measures'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.actionsTakenToProtectCrops',
                          defaultMessage: 'Actions taken to protect crops'
                        })}>
                        <StandardInput
                          type="text"
                          placeholder="e.g., secured equipment, protected young plants"
                          {...register('protection_measures')}
                        />
                      </StandardField>
                    </SimpleGrid>
                  ) : type === 'HH' || type === 'LH' ? (
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.weather.fields.humidityLevel',
                          defaultMessage: 'Humidity Level (%)'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.humidityPercentageRecorded0100',
                          defaultMessage: 'Humidity percentage recorded (0-100%)'
                        })}
                        error={errors.humidity_level?.message}>
                        <StandardInput
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          placeholder="85"
                          {...register('humidity_level')}
                        />
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.weather.fields.durationHours',
                          defaultMessage: 'Duration (hours)'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.howLongUnusualHumidityLasted',
                          defaultMessage: 'How long unusual humidity lasted'
                        })}
                        error={errors.duration?.message}>
                        <StandardInput
                          type="number"
                          step="0.5"
                          min="0"
                          max="720"
                          placeholder="48"
                          {...register('duration')}
                        />
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.weather.fields.cropImpact',
                          defaultMessage: 'Crop Impact'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.weather.help.effectsOnCropHealthAndGrowth',
                          defaultMessage: 'Effects on crop health and growth'
                        })}>
                        <StandardInput
                          type="text"
                          placeholder="e.g., increased disease pressure, slower growth"
                          {...register('crop_impact')}
                        />
                      </StandardField>
                    </SimpleGrid>
                  ) : null}
                </SectionBox>
              )}

              {/* Section 3: Farmer's Field Notes & Consumer Transparency */}
              <SectionBox>
                <SectionHeader
                  icon={FaSeedling}
                  title={intl.formatMessage({
                    id: 'events.weather.sections.farmerSFieldNotesConsumerTransparency',
                    defaultMessage: "Farmer's Field Notes & Consumer Transparency"
                  })}
                  badge={intl.formatMessage({ id: 'events.section.badge.certifierRecordAndBuyer' })}
                />

                <StandardField
                  label={intl.formatMessage({
                    id: 'events.weather.fields.observationsNotes',
                    defaultMessage: 'Observations & Notes'
                  })}
                  helpText={intl.formatMessage({ id: 'events.common.help.observationAudience' })}>
                  <StandardTextarea
                    placeholder={intl.formatMessage({
                      id: 'events.weather.placeholders.optionalDescribeHowThisWeatherEventAffectedY',
                      defaultMessage:
                        'Optional: Describe how this weather event affected your farming operations, what measures you took, and how it impacts the quality or safety of your produce.'
                    })}
                    rows={4}
                    {...register('observation')}
                  />
                </StandardField>
              </SectionBox>
            </>

            {/* Phase 2.3: Custom Fields Section */}
            <CustomFieldsForm
              customFields={customFields}
              onCustomFieldsChange={setCustomFields}
              eventTypeId={0}
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
                    size="lg"
                    isDisabled={Object.keys(errors).length > 0}>
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
WeatherTab.displayName = 'WeatherTab';

export default WeatherTab;
