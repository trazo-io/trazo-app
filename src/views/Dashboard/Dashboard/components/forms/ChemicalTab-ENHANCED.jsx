// CHEMICAL TAB - ENHANCED FOLLOWING TRAZO BEST PRACTICES
// Transparency-first approach with accurate USDA/EPA carbon calculations
// Phase 1 Enhanced: StandardComponents, transparency messaging, credible emission factors

import {
  Flex,
  HStack,
  Box,
  VStack,
  Badge,
  Text,
  Icon,
  InputGroup,
  InputRightAddon
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
  FaFlask, 
  FaSeedling, 
  FaLeaf,
  FaShieldAlt,
  FaCalculator,
  FaCheckCircle
} from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import React, { useEffect, useRef, useState } from 'react';
import { object, string } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';

// ENHANCED SCHEMA - Following Equipment/Soil/Pest enhanced patterns
const formSchemaMainInfo = object({
  type: string().min(1, 'Chemical type is required'),
  commercial_name: string().min(2, 'Commercial name must be at least 2 characters'),
  active_ingredient: string().optional(),
  concentration: string().min(1, 'Concentration/application rate is required'),
  volume_applied: string().min(1, 'Volume applied is required').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Volume must be greater than 0'),
  volume_unit: string().min(1, 'Volume unit is required'),
  area_treated: string().min(1, 'Area treated is required for carbon calculation').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Area must be greater than 0'),
  area_unit: string().min(1, 'Area unit is required'),
  application_method: string().min(1, 'Application method is required'),
  weather_conditions: string().optional(),
  application_timing: string().optional(),
  target_pest_disease: string().optional(),
  observation: string().optional()
});

const ChemicalTab = ({ onSubmitHandler, onDataChange, onPrev, initialValues = {} }) => {
  const intl = useIntl();
  const [hasInitialized, setHasInitialized] = useState(false);

  const methods = useForm({
    resolver: zodResolver(formSchemaMainInfo),
    defaultValues: {
      type: initialValues.type || '',
      commercial_name: initialValues.commercial_name || '',
      active_ingredient: initialValues.active_ingredient || '',
      concentration: initialValues.concentration || '',
      volume_applied: initialValues.volume_applied?.toString() || '',
      volume_unit: initialValues.volume_unit || 'L',
      area_treated: initialValues.area_treated?.toString() || '',
      area_unit: initialValues.area_unit || 'ha',
      application_method: initialValues.application_method || '',
      weather_conditions: initialValues.weather_conditions || '',
      application_timing: initialValues.application_timing || '',
      target_pest_disease: initialValues.target_pest_disease || '',
      observation: initialValues.observation || ''
    }
  });

  // Helper function to map backend event types to frontend codes
  const mapBackendTypeToFrontendCode = (backendType) => {
    if (!backendType) return '';
    
    // Map verbose backend types to frontend codes
    const typeMap = {
      'event.chemical.fertilizer': 'FE',
      'event.chemical.pesticide': 'PE',
      'event.chemical.fungicide': 'FU',
      'event.chemical.herbicide': 'HE'
    };
    
    // If it's already a code (FE, PE, FU, HE), return it as is
    if (['FE', 'PE', 'FU', 'HE'].includes(backendType)) {
      return backendType;
    }
    
    // Otherwise, try to map it
    return typeMap[backendType] || '';
  };

  // Initialize form values when initialValues change - ONLY ONCE to prevent form clearing
  useEffect(() => {
    // Reset form when we have meaningful data AND haven't initialized yet
    const hasData = initialValues && (
      Object.keys(initialValues).length > 0 && 
      (initialValues.type || initialValues.commercial_name || initialValues.concentration)
    );
    
    if ((hasData || (initialValues && Object.keys(initialValues).length === 0)) && !hasInitialized) {
      console.log('[ChemicalTab] Resetting form with initialValues:', initialValues);
      console.log('[ChemicalTab] RAW initialValues.type:', initialValues.type, typeof initialValues.type);
      console.log('[ChemicalTab] RAW initialValues.volume (backend):', initialValues.volume, typeof initialValues.volume);
      console.log('[ChemicalTab] RAW initialValues.area (backend):', initialValues.area, typeof initialValues.area);
      console.log('[ChemicalTab] RAW initialValues.way_of_application (backend):', initialValues.way_of_application, typeof initialValues.way_of_application);
      
      // Map backend type to frontend code
      const mappedType = mapBackendTypeToFrontendCode(initialValues.type);
      console.log('[ChemicalTab] Mapped type from', initialValues.type, 'to', mappedType);
      
      const resetData = {
        type: mappedType,
        commercial_name: initialValues.commercial_name || initialValues.name || '',
        active_ingredient: initialValues.active_ingredient || '',
        concentration: initialValues.concentration || '',
        // FIXED: Use correct backend field names for form population
        volume_applied: initialValues.volume !== undefined && initialValues.volume !== null 
          ? initialValues.volume.toString() 
          : '',
        volume_unit: initialValues.volume_unit || 'L',
        area_treated: initialValues.area !== undefined && initialValues.area !== null
          ? initialValues.area.toString()
          : '',
        area_unit: initialValues.area_unit || 'ha',
        application_method: initialValues.way_of_application || '',
        // Environmental context fields for transparency
        weather_conditions: initialValues.weather_conditions || '',
        application_timing: initialValues.application_timing || '',
        target_pest_disease: initialValues.target_pest_disease || '',
        observation: initialValues.observation || ''
      };
      
      console.log('[ChemicalTab] Calling methods.reset() with:', resetData);
      console.log('[ChemicalTab] resetData.type:', resetData.type, typeof resetData.type);
      console.log('[ChemicalTab] resetData.volume_applied:', resetData.volume_applied, typeof resetData.volume_applied);
      console.log('[ChemicalTab] resetData.area_treated:', resetData.area_treated, typeof resetData.area_treated);
      
      methods.reset(resetData);
      setHasInitialized(true);
      
      console.log('[ChemicalTab] INITIAL SETUP COMPLETE - After reset, getValues():', methods.getValues());
    }
  }, [initialValues, hasInitialized]); // Only run when initialValues change or when not yet initialized

  const {
    handleSubmit,
    watch,
    formState: { errors }
  } = methods;

  const chemicalType = watch('type');
  const areaValue = watch('area_treated');
  const volumeValue = watch('volume_applied');

  // Real-time carbon calculation updates - only when sufficient data present
  const watchedFields = watch(['type', 'volume_applied', 'area_treated', 'concentration']);
  const previousValuesRef = useRef({});

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onDataChange && typeof onDataChange === 'function') {
        const currentValues = methods.getValues();
        
        // Only trigger carbon calculation when we have complete data
        if (currentValues.type && 
            currentValues.volume_applied && 
            currentValues.area_treated && 
            currentValues.concentration) {
          
          const relevantFields = ['type', 'volume_applied', 'area_treated', 'concentration', 'application_method'];
          const currentRelevantValues = {};
          relevantFields.forEach((field) => {
            currentRelevantValues[field] = currentValues[field];
          });

          const hasChanged = JSON.stringify(currentRelevantValues) !== JSON.stringify(previousValuesRef.current);

          if (hasChanged) {
            previousValuesRef.current = currentRelevantValues;
            try {
              onDataChange(currentValues);
            } catch (error) {
              console.error('[ChemicalTab]: Error calling onDataChange:', error);
            }
          }
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedFields, onDataChange, methods]);

  const onSubmit = (data) => {
    // Process numeric data and map frontend field names to backend field names
    const {
      // Remove frontend-only field names to avoid confusion
      volume_applied,
      area_treated,
      application_method,
      // Extract environmental context fields to include in backend submission
      weather_conditions,
      application_timing,
      target_pest_disease,
      ...filteredData
    } = data;
    
    const processedData = {
      ...filteredData,
      // Map frontend field names to backend field names
      volume: volume_applied ? parseFloat(volume_applied) : undefined,
      area: area_treated ? parseFloat(area_treated) : undefined,
      way_of_application: application_method || '',
      // Include environmental context fields for transparency
      weather_conditions: weather_conditions || '',
      application_timing: application_timing || '',
      target_pest_disease: target_pest_disease || '',
    };
    
    console.log('[ChemicalTab] Submitting with backend field names:', processedData);
    onSubmitHandler(processedData);
  };

  // Calculate application rate for validation
  const applicationRate = (volumeValue && areaValue) ? 
    (parseFloat(volumeValue) / parseFloat(areaValue)).toFixed(2) : null;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
        <VStack spacing={6} align="stretch">
          
          {/* Transparency Focus Alert */}
          <StandardAlert status="info" title="Chemical Application Transparency">
            <HStack spacing={2} mb={2}>
              <Icon as={FaShieldAlt} color="blue.500" />
              <Text fontSize="sm" fontWeight="bold">EPA-Verified Carbon Calculations</Text>
            </HStack>
            <Text fontSize="sm">
              Document chemical applications with accurate carbon impact calculations using EPA emission factors.
              This information builds consumer trust through transparent agricultural practices.
            </Text>
          </StandardAlert>

          {/* Section 1: Chemical Selection & Identification */}
          <StandardCard
            title={
              <HStack>
                <Icon as={FaFlask} color="purple.500" />
                <Text>Chemical Application Details</Text>
                <Badge colorScheme="purple" size="sm">EPA Verified</Badge>
                {chemicalType && (
                  <Badge colorScheme="green" size="sm" ml={2}>
                    <HStack spacing={1}>
                      <Icon as={FaCheckCircle} />
                      <Text>{chemicalType === 'FE' ? 'Fertilizer' : chemicalType === 'PE' ? 'Pesticide' : chemicalType === 'FU' ? 'Fungicide' : 'Herbicide'}</Text>
                    </HStack>
                  </Badge>
                )}
              </HStack>
            }
          >
            <VStack spacing={4} align="stretch">
              
              <StandardField
                label="Chemical Type"
                required
                error={errors.type?.message}
                helpText="Select the type of chemical for accurate carbon calculations"
              >
                <Controller
                  name="type"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect
                      {...field}
                      placeholder="Select chemical type..."
                    >
                      <option value="FE">🌱 Fertilizer - Nutrient application</option>
                      <option value="PE">🐛 Pesticide - Pest control</option>
                      <option value="FU">🍄 Fungicide - Disease prevention</option>
                      <option value="HE">🌿 Herbicide - Weed management</option>
                    </StandardSelect>
                  )}
                />
              </StandardField>

              <StandardField
                label="Commercial Name / Product"
                required
                error={errors.commercial_name?.message}
                helpText="Brand name or product name for transparency documentation"
              >
                <Controller
                  name="commercial_name"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardInput
                      {...field}
                      placeholder="e.g., Miracle-Gro All Purpose, Roundup WeatherMAX"
                    />
                  )}
                />
              </StandardField>

              <StandardField
                label="Active Ingredient (Optional)"
                error={errors.active_ingredient?.message}
                helpText="Main active ingredient for consumer transparency"
              >
                <Controller
                  name="active_ingredient"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardInput
                      {...field}
                      placeholder="e.g., Glyphosate, NPK 10-10-10"
                    />
                  )}
                />
              </StandardField>
            </VStack>
          </StandardCard>

          {/* Section 2: Application Details & Carbon Calculation Data */}
          <StandardCard
            title={
              <HStack>
                <Icon as={FaCalculator} color="green.500" />
                <Text>Application Rate & Coverage</Text>
                <Badge colorScheme="green" size="sm">Carbon Calculation</Badge>
                {applicationRate && (
                  <Badge colorScheme="blue" size="sm" ml={2}>
                    {applicationRate} L/ha
                  </Badge>
                )}
              </HStack>
            }
          >
            <VStack spacing={4} align="stretch">
              
              <HStack spacing={4} align="end">
                <StandardField
                  label="Volume Applied"
                  required
                  error={errors.volume_applied?.message}
                  helpText="Total volume applied for carbon calculation"
                  flex={2}
                >
                  <Controller
                    name="volume_applied"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardInput
                        {...field}
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
                      />
                    )}
                  />
                </StandardField>

                <StandardField
                  label="Unit"
                  flex={1}
                >
                  <Controller
                    name="volume_unit"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardSelect {...field}>
                        <option value="L">Liters (L)</option>
                        <option value="gal">Gallons</option>
                        <option value="kg">Kilograms</option>
                        <option value="lb">Pounds</option>
                      </StandardSelect>
                    )}
                  />
                </StandardField>
              </HStack>

              <HStack spacing={4} align="end">
                <StandardField
                  label="Area Treated"
                  required
                  error={errors.area_treated?.message}
                  helpText="Area coverage for accurate carbon calculation"
                  flex={2}
                >
                  <Controller
                    name="area_treated"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardInput
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                      />
                    )}
                  />
                </StandardField>

                <StandardField
                  label="Unit"
                  flex={1}
                >
                  <Controller
                    name="area_unit"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardSelect {...field}>
                        <option value="ha">Hectares (ha)</option>
                        <option value="acres">Acres</option>
                        <option value="m2">Square meters</option>
                      </StandardSelect>
                    )}
                  />
                </StandardField>
              </HStack>

              <StandardField
                label="Concentration / Application Rate"
                required
                error={errors.concentration?.message}
                helpText="Product concentration or application rate for carbon calculations"
              >
                <Controller
                  name="concentration"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardInput
                      {...field}
                      placeholder="e.g., 10-10-10, 2.5%, 1 kg/ha"
                    />
                  )}
                />
              </StandardField>

              <StandardField
                label="Application Method"
                required
                error={errors.application_method?.message}
                helpText="Method of application affects emission calculations"
              >
                <Controller
                  name="application_method"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect {...field}>
                      <option value="">Select application method...</option>
                      <option value="spray">🌊 Spray Application</option>
                      <option value="broadcast">📡 Broadcast Spreading</option>
                      <option value="drip">💧 Drip Irrigation</option>
                      <option value="foliar">🌿 Foliar Application</option>
                      <option value="soil_injection">💉 Soil Injection</option>
                      <option value="granular">🌾 Granular Application</option>
                    </StandardSelect>
                  )}
                />
              </StandardField>
            </VStack>
          </StandardCard>

          {/* Section 3: Environmental Context & Transparency */}
          <StandardCard
            title={
              <HStack>
                <Icon as={FaLeaf} color="green.500" />
                <Text>Environmental Context</Text>
                <Badge colorScheme="green" size="sm">Transparency</Badge>
              </HStack>
            }
          >
            <VStack spacing={4} align="stretch">
              
              <StandardField
                label="Weather Conditions"
                error={errors.weather_conditions?.message}
                helpText="Weather conditions during application for transparency"
              >
                <Controller
                  name="weather_conditions"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect {...field}>
                      <option value="">Select conditions...</option>
                      <option value="calm_dry">☀️ Calm & Dry - Ideal conditions</option>
                      <option value="light_wind">🌬️ Light Wind - Suitable conditions</option>
                      <option value="humid">💨 Humid - Acceptable conditions</option>
                      <option value="windy">🌪️ Windy - Challenging conditions</option>
                    </StandardSelect>
                  )}
                />
              </StandardField>

              <StandardField
                label="Application Timing"
                error={errors.application_timing?.message}
                helpText="When the application was made for consumer understanding"
              >
                <Controller
                  name="application_timing"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect {...field}>
                      <option value="">Select timing...</option>
                      <option value="pre_plant">🌱 Pre-Planting</option>
                      <option value="post_emergence">🌿 Post-Emergence</option>
                      <option value="flowering">🌸 Flowering Stage</option>
                      <option value="fruit_development">🍎 Fruit Development</option>
                      <option value="harvest">🚜 Pre-Harvest</option>
                    </StandardSelect>
                  )}
                />
              </StandardField>

              <StandardField
                label="Target Pest/Disease/Need"
                error={errors.target_pest_disease?.message}
                helpText="What problem this application addresses for transparency"
              >
                <Controller
                  name="target_pest_disease"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardInput
                      {...field}
                      placeholder="e.g., Aphid control, Nutrient deficiency, Weed suppression"
                    />
                  )}
                />
              </StandardField>
            </VStack>
          </StandardCard>

          {/* Section 4: Documentation & Notes */}
          <StandardField 
            label="Documentation & Consumer Context"
            error={errors.observation?.message}
            helpText="Additional details about this chemical application for transparency"
          >
            <Controller
              name="observation"
              control={methods.control}
              render={({ field }) => (
                <StandardTextarea
                  {...field}
                  placeholder="e.g., Organic-certified fertilizer applied following IPM guidelines, reduced application rate by 20% using precision agriculture..."
                  rows={3}
                />
              )}
            />
          </StandardField>

          {/* Navigation */}
          <Box pt={4} mt={4} borderTop="1px" borderColor="gray.200">
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
        </VStack>
      </form>
    </FormProvider>
  );
};

export default ChemicalTab;