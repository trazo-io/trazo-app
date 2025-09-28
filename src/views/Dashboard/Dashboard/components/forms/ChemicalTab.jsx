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
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  InputGroup,
  InputRightAddon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  VStack,
  Divider,
  Badge,
  Tooltip,
  SimpleGrid
} from '@chakra-ui/react';
import {
  StandardCard,
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea
} from 'components/Design/StandardComponents';
import { SmartProductInput } from 'components/SmartProductInput';
import {
  FaChevronLeft,
  FaChevronRight,
  FaInfoCircle,
  FaThermometerHalf,
  FaLeaf,
  FaRulerHorizontal
} from 'react-icons/fa';
import { FormProvider, useForm } from 'react-hook-form';
import React, { useState, useEffect, useRef } from 'react';
import { number, object, string } from 'zod';

import { FaPlus } from 'react-icons/fa';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';

// Enhanced form schema with USDA-compliant validation AND NPK percentage validation
const formSchemaMainInfo = object({
  type: string().min(1, 'Chemical type is required'),
  commercial_name: string().min(2, 'Commercial name must be at least 2 characters'),
  volume: string().min(1, 'Volume is required'),
  volume_unit: string().min(1, 'Volume unit is required'),
  area: string().min(1, 'Area is required'),
  area_unit: string().min(1, 'Area unit is required'),
  concentration: string().min(1, 'Concentration is required'),
  way_of_application: string().min(1, 'Application method is required'),
  // NPK percentage validation fields (Phase 1.1 validation)
  nitrogen_percentage: string().optional(),
  phosphorus_percentage: string().optional(),
  potassium_percentage: string().optional(),
  weather_conditions: string().optional(),
  soil_moisture: string().optional(),
  temperature_range: string().optional(),
  wind_speed: string().optional(),
  time_period: string().optional(),
  observation: string().optional()
}).refine((data) => {
  // NPK percentage validation - total cannot exceed 100%
  const nitrogen = parseFloat(data.nitrogen_percentage) || 0;
  const phosphorus = parseFloat(data.phosphorus_percentage) || 0;
  const potassium = parseFloat(data.potassium_percentage) || 0;
  const total = nitrogen + phosphorus + potassium;
  
  if (total > 100) {
    return false;
  }
  return true;
}, {
  message: 'NPK percentages cannot total more than 100%',
  path: ['nitrogen_percentage']
}).refine((data) => {
  // Individual percentage validation - cannot be negative
  const nitrogen = parseFloat(data.nitrogen_percentage) || 0;
  const phosphorus = parseFloat(data.phosphorus_percentage) || 0;
  const potassium = parseFloat(data.potassium_percentage) || 0;
  
  if (nitrogen < 0 || phosphorus < 0 || potassium < 0) {
    return false;
  }
  return true;
}, {
  message: 'NPK percentages cannot be negative',
  path: ['nitrogen_percentage']
});

// USDA-compliant crop types for reference (crop type is inherited from production, not selected per event)
const USDA_CROP_TYPES = [
  { value: 'citrus', label: 'Citrus (Oranges, Lemons, Limes)', usdaName: 'ORANGES' },
  { value: 'corn', label: 'Corn (Field Corn)', usdaName: 'CORN' },
  { value: 'soybeans', label: 'Soybeans', usdaName: 'SOYBEANS' },
  { value: 'wheat', label: 'Wheat', usdaName: 'WHEAT' },
  { value: 'cotton', label: 'Cotton', usdaName: 'COTTON' },
  { value: 'rice', label: 'Rice', usdaName: 'RICE' },
  { value: 'tomatoes', label: 'Tomatoes', usdaName: 'TOMATOES' },
  { value: 'potatoes', label: 'Potatoes', usdaName: 'POTATOES' },
  { value: 'lettuce', label: 'Lettuce', usdaName: 'LETTUCE' },
  { value: 'carrots', label: 'Carrots', usdaName: 'CARROTS' },
  { value: 'onions', label: 'Onions', usdaName: 'ONIONS' },
  { value: 'apples', label: 'Apples', usdaName: 'APPLES' },
  { value: 'grapes', label: 'Grapes', usdaName: 'GRAPES' },
  { value: 'strawberries', label: 'Strawberries', usdaName: 'STRAWBERRIES' },
  { value: 'almonds', label: 'Almonds', usdaName: 'ALMONDS' },
  { value: 'avocados', label: 'Avocados', usdaName: 'AVOCADOS' }
];

// Enhanced intelligent defaults with crop-specific optimization (crop type is inherited from production context)
const getIntelligentDefaults = (chemicalType, cropType = 'citrus') => {
  const cropSpecificDefaults = {
    citrus: {
      FE: { volume: '75', area: '1.5', concentration: '8-8-8', way_of_application: 'drip_irrigation' },
      PE: { volume: '25', area: '1.0', concentration: '1.5%', way_of_application: 'spray' },
      FU: { volume: '20', area: '1.0', concentration: '2.0%', way_of_application: 'foliar' },
      HE: { volume: '15', area: '1.0', concentration: '2.5%', way_of_application: 'spray' }
    },
    corn: {
      FE: { volume: '100', area: '4.0', concentration: '32-0-0', way_of_application: 'sidedress' },
      PE: { volume: '30', area: '2.0', concentration: '2.0%', way_of_application: 'spray' },
      FU: { volume: '25', area: '2.0', concentration: '1.8%', way_of_application: 'foliar' },
      HE: { volume: '40', area: '2.0', concentration: '3.5%', way_of_application: 'broadcast' }
    },
    soybeans: {
      FE: { volume: '30', area: '3.0', concentration: '0-20-20', way_of_application: 'starter' },
      PE: { volume: '20', area: '2.0', concentration: '1.2%', way_of_application: 'spray' },
      FU: { volume: '18', area: '2.0', concentration: '1.5%', way_of_application: 'foliar' },
      HE: { volume: '35', area: '2.0', concentration: '3.0%', way_of_application: 'broadcast' }
    },
    tomatoes: {
      FE: {
        volume: '60',
        area: '1.0',
        concentration: '15-15-15',
        way_of_application: 'drip_irrigation'
      },
      PE: { volume: '15', area: '0.5', concentration: '1.0%', way_of_application: 'spray' },
      FU: { volume: '12', area: '0.5', concentration: '1.8%', way_of_application: 'foliar' },
      HE: { volume: '10', area: '0.5', concentration: '2.0%', way_of_application: 'directed' }
    }
  };

  const defaults = {
    FE: {
      // Fertilizer
      volume: '50',
      volume_unit: 'liters',
      area: '2.0',
      area_unit: 'hectares',
      concentration: '16-16-16',
      way_of_application: 'broadcast',
      time_period: 'morning',
      weather_conditions: 'calm, dry conditions',
      soil_moisture: 'moderate',
      temperature_range: '18-25°C'
    },
    PE: {
      // Pesticide
      volume: '20',
      volume_unit: 'liters',
      area: '1.0',
      area_unit: 'hectares',
      concentration: '2.5%',
      way_of_application: 'spray',
      time_period: 'early_morning',
      weather_conditions: 'low wind, dry conditions',
      soil_moisture: 'moderate',
      temperature_range: '15-22°C'
    },
    FU: {
      // Fungicide
      volume: '15',
      volume_unit: 'liters',
      area: '1.0',
      area_unit: 'hectares',
      concentration: '1.5%',
      way_of_application: 'foliar',
      time_period: 'evening',
      weather_conditions: 'calm, humid conditions',
      soil_moisture: 'high',
      temperature_range: '20-28°C'
    },
    HE: {
      // Herbicide
      volume: '25',
      volume_unit: 'liters',
      area: '1.0',
      area_unit: 'hectares',
      concentration: '3.0%',
      way_of_application: 'spray',
      time_period: 'morning',
      weather_conditions: 'low wind, dry conditions',
      soil_moisture: 'moderate',
      temperature_range: '18-25°C'
    }
  };

  // Apply crop-specific overrides
  const baseDefaults = defaults[chemicalType] || defaults.FE;
  const cropSpecific = cropSpecificDefaults[cropType.toLowerCase()]?.[chemicalType];

  if (cropSpecific) {
    return {
      ...baseDefaults,
      ...cropSpecific
    };
  }

  return baseDefaults;
};

const ChemicalTab = ({
  onSubmitHandler,
  onDataChange,
  onPrev,
  initialValues = {},
  cropType = 'citrus'
}) => {

  const intl = useIntl();

  useEffect(() => {
    console.log('ChemicalTab: Component mounted with props:', {
      hasOnSubmitHandler: !!onSubmitHandler,
      hasOnDataChange: !!onDataChange,
      onDataChangeType: typeof onDataChange,
      hasOnPrev: !!onPrev,
      cropType
    });
  }, []);
  const bgPrevButton = useColorModeValue('gray.100', 'gray.100');
  const textColor = useColorModeValue('gray.700', 'white');
  const iconColor = useColorModeValue('gray.300', 'gray.700');
  const [selectedChemicalType, setSelectedChemicalType] = useState('');
  
  // Smart Product Input state
  const [smartProductValidation, setSmartProductValidation] = useState(null);
  const [autoFilledNPK, setAutoFilledNPK] = useState(null);

  // Map API format to form format
  const mapApiTypeToFormType = (apiType) => {
    if (!apiType) return '';

    const typeMapping = {
      'event.chemical.fertilizer': 'FE',
      'event.chemical.pesticide': 'PE',
      'event.chemical.fungicide': 'FU',
      'event.chemical.herbicide': 'HE'
    };

    return typeMapping[apiType] || apiType;
  };

  const formType = mapApiTypeToFormType(initialValues.type);

  console.log('🔍 ChemicalTab: Form initialization debug:', {
    initialValues,
    'initialValues.type': initialValues.type,
    formType,
    'formType || empty': formType || ''
  });

  // Get intelligent defaults for the current chemical type (crop type inherited from production)
  const intelligentDefaults = getIntelligentDefaults(formType || 'FE', cropType);

  const mainInfoMethods = useForm({
    resolver: zodResolver(formSchemaMainInfo),
    defaultValues: {
      type: formType || '',
      commercial_name: initialValues.commercial_name || '',
      volume: initialValues.volume || intelligentDefaults.volume,
      volume_unit: initialValues.volume_unit || intelligentDefaults.volume_unit,
      area: initialValues.area || intelligentDefaults.area,
      area_unit: initialValues.area_unit || intelligentDefaults.area_unit,
      concentration: initialValues.concentration || intelligentDefaults.concentration,
      way_of_application:
        initialValues.way_of_application || intelligentDefaults.way_of_application,
      weather_conditions:
        initialValues.weather_conditions || intelligentDefaults.weather_conditions,
      soil_moisture: initialValues.soil_moisture || intelligentDefaults.soil_moisture,
      temperature_range: initialValues.temperature_range || intelligentDefaults.temperature_range,
      wind_speed: initialValues.wind_speed || '',
      time_period: initialValues.time_period || intelligentDefaults.time_period,
      observation: initialValues.observation || '',
      // NPK percentage fields (Phase 1.1 validation)
      nitrogen_percentage: initialValues.nitrogen_percentage?.toString() || '',
      phosphorus_percentage: initialValues.phosphorus_percentage?.toString() || '',
      potassium_percentage: initialValues.potassium_percentage?.toString() || ''
    }
  });

  const {
    reset: mainInfoReset,
    handleSubmit: mainInfoSubmit,
    errors: mainInfoErrors,
    formState: { errors, isSubmitSuccessful },
    register,
    setValue,
    watch,
    getValues
  } = mainInfoMethods;

  // Watch the chemical type to update defaults
  const watchedType = watch('type');

  // Watch critical fields for real-time carbon calculation updates
  const watchedFields = watch([
    'type',
    'commercial_name',
    'volume',
    'volume_unit',
    'area',
    'area_unit',
    'concentration',
    'way_of_application'
  ]);


  // Update defaults when chemical type changes
  useEffect(() => {
    if (watchedType && watchedType !== selectedChemicalType) {
      setSelectedChemicalType(watchedType);

      const newDefaults = getIntelligentDefaults(watchedType, cropType);

      // Update fields with intelligent defaults
      Object.keys(newDefaults).forEach((field) => {
        const currentValue = watch(field);
        if (!currentValue || currentValue === intelligentDefaults[field]) {
          setValue(field, newDefaults[field]);
        }
      });
    }
  }, [watchedType, selectedChemicalType, setValue, watch]);

  // Track previous values to prevent unnecessary API calls
  const previousValuesRef = useRef({});
  const isInitialMountRef = useRef(true);

  // Real-time field watching for carbon calculation updates
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onDataChange && typeof onDataChange === 'function') {
        const currentValues = getValues();

        const relevantFields = [
          'type',
          'commercial_name',
          'volume',
          'volume_unit',
          'area',
          'area_unit',
          'concentration',
          'way_of_application'
        ];
        const currentRelevantValues = {};
        relevantFields.forEach((field) => {
          currentRelevantValues[field] = currentValues[field];
        });

        const previousValuesStr = JSON.stringify(previousValuesRef.current);
        const currentValuesStr = JSON.stringify(currentRelevantValues);
        const hasChanged = previousValuesStr !== currentValuesStr;

        const hasMeaningfulData = 
          currentValues.type && 
          currentValues.volume && 
          parseFloat(currentValues.volume) > 0 &&
          currentValues.area && 
          parseFloat(currentValues.area) > 0;

        const shouldTrigger = hasMeaningfulData && (hasChanged || isInitialMountRef.current);

        if (shouldTrigger) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ChemicalTab]: ✅ Triggering carbon calculation', {
              type: currentValues.type,
              volume: currentValues.volume,
              area: currentValues.area
            });
          }
          previousValuesRef.current = currentRelevantValues;
          isInitialMountRef.current = false;
          try {
            onDataChange(currentValues);
          } catch (error) {
            console.error('[ChemicalTab]: ❌ Error calling onDataChange:', error);
          }
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedFields, onDataChange, getValues]);

  // Update form values when initialValues change
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      const mappedType = mapApiTypeToFormType(initialValues.type);
      const defaults = getIntelligentDefaults(mappedType || 'FE', cropType);

      mainInfoMethods.reset({
        type: mappedType || '',
        commercial_name: initialValues.commercial_name || '',
        volume: initialValues.volume || defaults.volume,
        volume_unit: initialValues.volume_unit || defaults.volume_unit,
        area: initialValues.area || defaults.area,
        area_unit: initialValues.area_unit || defaults.area_unit,
        concentration: initialValues.concentration || defaults.concentration,
        way_of_application: initialValues.way_of_application || defaults.way_of_application,
        weather_conditions: initialValues.weather_conditions || defaults.weather_conditions,
        soil_moisture: initialValues.soil_moisture || defaults.soil_moisture,
        temperature_range: initialValues.temperature_range || defaults.temperature_range,
        wind_speed: initialValues.wind_speed || '',
        time_period: initialValues.time_period || defaults.time_period,
        observation: initialValues.observation || '',
        // NPK percentage fields (Phase 1.1 validation)
        nitrogen_percentage: initialValues.nitrogen_percentage?.toString() || '',
        phosphorus_percentage: initialValues.phosphorus_percentage?.toString() || '',
        potassium_percentage: initialValues.potassium_percentage?.toString() || ''
      });
    }
  }, [initialValues, mainInfoMethods]);

  // Smart Product Input handlers
  const handleSmartProductChange = (value, additionalData) => {
    setValue('commercial_name', value);
    
    if (additionalData) {
      // Handle auto-fill data from smart validation
      if (additionalData.auto_fill_npk) {
        setAutoFilledNPK(additionalData.auto_fill_npk);
        // Auto-fill concentration field with NPK ratio
        setValue('concentration', additionalData.auto_fill_npk);
        
        // Also auto-fill the individual NPK percentage fields
        const npkParts = additionalData.auto_fill_npk.split('-');
        if (npkParts.length === 3) {
          setValue('nitrogen_percentage', npkParts[0]);
          setValue('phosphorus_percentage', npkParts[1]);
          setValue('potassium_percentage', npkParts[2]);
        }
      }
      
      // Set recommended type if different from selected
      if (additionalData.recommended_type && additionalData.recommended_type !== selectedChemicalType) {
        console.log('Smart Product: Type recommendation', {
          current: selectedChemicalType,
          recommended: additionalData.recommended_type
        });
      }
    }
  };

  const handleSmartProductValidation = (validationResult) => {
    setSmartProductValidation(validationResult);
    
    if (validationResult) {
      // Handle auto-fill for fertilizers - use correct_type_code for comparison
      const typeCode = validationResult.correct_type_code || validationResult.correct_type;
      if ((typeCode === 'FE' || validationResult.correct_type === 'Fertilizer') && validationResult.npk_ratio) {
        setAutoFilledNPK(validationResult.npk_ratio);
        
        // Auto-fill NPK percentage fields if available
        const npkParts = validationResult.npk_ratio.split('-');
        if (npkParts.length === 3) {
          setValue('nitrogen_percentage', npkParts[0]);
          setValue('phosphorus_percentage', npkParts[1]);  
          setValue('potassium_percentage', npkParts[2]);
          // Also update the concentration field with the NPK ratio
          setValue('concentration', validationResult.npk_ratio);
        }
      }
      
      // Show validation warnings if type mismatch
      if (validationResult.requires_correction) {
        console.warn('Smart Product: Type mismatch detected', {
          product: validationResult.commercial_name,
          detected: validationResult.correct_type,
          selected: selectedChemicalType
        });
      }
    }
  };

  // Enhanced submit handler with validation (crop type inherited from production)
  const handleEnhancedSubmit = (data) => {
    // Validate that no field contains "Unknown" or empty values
    const requiredFields = [
      'type',
      'commercial_name',
      'volume',
      'volume_unit',
      'area',
      'area_unit',
      'concentration',
      'way_of_application'
    ];

    const invalidFields = requiredFields.filter((field) => {
      const value = data[field]?.toString().toLowerCase();
      return (
        !value || value === 'unknown' || value === 'n/a' || value === 'na' || value.trim() === ''
      );
    });

    if (invalidFields.length > 0) {
      // Auto-fill missing fields with intelligent defaults
      const defaults = getIntelligentDefaults(data.type, cropType);
      invalidFields.forEach((field) => {
        if (defaults[field]) {
          data[field] = defaults[field];
          setValue(field, defaults[field]);
        }
      });
    }

    // Note: Crop type is inherited from production context via event.history.crop_type.name
    // USDA API mapping happens in backend based on production's crop type

    // Call the original submit handler
    onSubmitHandler(data);
  };

  return (
    <FormProvider {...mainInfoMethods}>
      <form onSubmit={mainInfoSubmit(handleEnhancedSubmit)} style={{ width: '100%' }}>
        <Flex direction="column" w="100%">
          {/* Enhanced Information Alert */}
          <Alert status="info" mb={4} borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle fontSize="sm">USDA Compliance & Carbon Calculation</AlertTitle>
              <AlertDescription fontSize="xs">
                All fields marked with * are required for accurate carbon footprint calculations and
                USDA compliance verification. Smart defaults are provided based on your crop type (
                {cropType}) and chemical type.
              </AlertDescription>
            </Box>
          </Alert>

          {/* Section 1: Chemical Information */}
          <Box mb={6} p={4} border="1px" borderColor="gray.200" borderRadius="lg">
            <Text fontSize="md" fontWeight="bold" mb={4} color="blue.600">
              <Icon as={FaLeaf} mr={2} />
              Chemical Information
            </Text>

            <Box>
              <StandardField
                label={`${intl.formatMessage({ id: 'app.type' })} *`}
                required
                error={errors.type?.message}
              >
                <StandardSelect
                  placeholder="Select chemical type"
                  {...register('type')}
                  onChange={(e) => {
                    console.log(
                      '🔥 ChemicalTab: Select onChange triggered with value:',
                      e.target.value
                    );

                    // First, call the original onChange from register to update the form
                    const registerProps = register('type');
                    if (registerProps.onChange) {
                      registerProps.onChange(e);
                    }

                    // Also manually set the value to ensure it's registered
                    setValue('type', e.target.value);

                    // Check what happened to the form state
                    setTimeout(() => {
                      const currentValues = getValues();
                      console.log('🔥 ChemicalTab: Form state after onChange:', currentValues);

                      // Manually trigger carbon calculation for testing
                      if (onDataChange && e.target.value) {
                        console.log('🔥 ChemicalTab: Manually triggering onDataChange');
                        currentValues.type = e.target.value; // Ensure type is set
                        onDataChange(currentValues);
                      }
                    }, 100);
                  }}
                >
                  <option value="FE">Fertilizer</option>
                  <option value="PE">Pesticide</option>
                  <option value="FU">Fungicide</option>
                  <option value="HE">Herbicide</option>
                </StandardSelect>
              </StandardField>
            </Box>

            {/* Smart Product Input - Implements Smart Bag UX */}
            <Box mt={6}>
              <SmartProductInput
              value={watch('commercial_name') || ''}
              onChange={handleSmartProductChange}
              onValidation={handleSmartProductValidation}
              selectedChemicalType={watchedType || selectedChemicalType || 'FE'}
              label={`${intl.formatMessage({ id: 'app.commercialName' })} *`}
              placeholder="e.g., Miracle-Gro All Purpose, Roundup WeatherMAX"
              required
              error={errors.commercial_name?.message}
              helpText="Enter the product name from the container label for automatic NPK detection"
              showEducationalTips={true}
              enableAutoFill={true}
              enableRealtimeSearch={true}
              />
            </Box>
          </Box>

          {/* Section 2: Application Details */}
          <Box mb={6} p={4} border="1px" borderColor="gray.200" borderRadius="lg">
            <Text fontSize="md" fontWeight="bold" mb={4} color="green.600">
              <Icon as={FaRulerHorizontal} mr={2} />
              Application Measurements
            </Text>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <StandardField label="Volume Applied *" required error={errors.volume?.message}>
                <HStack spacing={3}>
                  <StandardInput
                    flex={2}
                    type="number"
                    step="0.1"
                    placeholder="50.0"
                    {...register('volume')}
                  />
                  <StandardSelect flex={1} {...register('volume_unit')}>
                    <option value="liters">Liters</option>
                    <option value="gallons">Gallons</option>
                    <option value="kg">Kilograms</option>
                    <option value="pounds">Pounds</option>
                  </StandardSelect>
                </HStack>
              </StandardField>

              <StandardField label="Area Treated *" required error={errors.area?.message}>
                <HStack spacing={3}>
                  <StandardInput
                    flex={2}
                    type="number"
                    step="0.1"
                    placeholder="2.0"
                    {...register('area')}
                  />
                  <StandardSelect flex={1} {...register('area_unit')}>
                    <option value="hectares">Hectares</option>
                    <option value="acres">Acres</option>
                  </StandardSelect>
                </HStack>
              </StandardField>
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mt={4}>
              <StandardField
                label="Concentration/NPK *"
                required
                error={errors.concentration?.message}
                helpText="For fertilizers: NPK ratio (e.g., 16-16-16). For pesticides: concentration (e.g., 2.5%)"
              >
                <StandardInput
                  type="text"
                  placeholder="e.g., 16-16-16, 2.5%, 1000 ppm"
                  {...register('concentration')}
                />
                {/* Smart Auto-Fill Indicator */}
                {autoFilledNPK && (
                  <Alert status="success" variant="left-accent" mt={2} borderRadius="md">
                    <AlertIcon />
                    <VStack align="start" spacing={0}>
                      <Text fontSize="xs" fontWeight="bold">Smart Auto-Fill Active</Text>
                      <Text fontSize="xs">NPK ratio {autoFilledNPK} detected and applied</Text>
                    </VStack>
                  </Alert>
                )}
              </StandardField>

              <StandardField
                label={`${intl.formatMessage({ id: 'app.wayOfApplication' })} *`}
                required
                error={errors.way_of_application?.message}
              >
                <StandardSelect
                  placeholder="Select application method"
                  {...register('way_of_application')}
                >
                  <option value="broadcast">Broadcast</option>
                  <option value="spray">Spray</option>
                  <option value="foliar">Foliar</option>
                  <option value="drip_irrigation">Drip Irrigation</option>
                  <option value="injection">Injection</option>
                  <option value="banded">Banded</option>
                  <option value="aerial">Aerial Application</option>
                  <option value="variable_rate">Variable Rate Application</option>
                  <option value="sidedress">Sidedress Application</option>
                  <option value="starter">Starter/Pop-up Placement</option>
                  <option value="strip_till">Strip-till Application</option>
                  <option value="anhydrous">Anhydrous Ammonia Injection</option>
                </StandardSelect>
              </StandardField>
            </SimpleGrid>
              
              {/* NPK Percentage Fields (Phase 1.1 Validation) - Show only for fertilizers */}
              {watchedType === 'FE' && (
                <Box gridColumn={{ base: "span 1", md: "span 2" }}>
                  <VStack spacing={4} align="stretch" p={5} bg="green.50" borderRadius="md" border="1px solid" borderColor="green.200">
                  <HStack justify="space-between" align="center">
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="bold" color="green.700">
                        📊 NPK Percentage Breakdown
                      </Text>
                      <Text fontSize="xs" color="green.600">
                        {autoFilledNPK ? 'Auto-filled from product recognition' : 'Optional - for precise calculations'}
                      </Text>
                    </VStack>
                    {autoFilledNPK && (
                      <Badge colorScheme="green" variant="solid" fontSize="xs">
                        Smart Auto-Fill ✨
                      </Badge>
                    )}
                  </HStack>
                  {!autoFilledNPK && (
                    <Text fontSize="xs" color="green.600">
                      Enter individual NPK percentages if known. Total cannot exceed 100%.
                    </Text>
                  )}
                  
                  <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
                    <StandardField 
                      label="Nitrogen %" 
                      error={errors.nitrogen_percentage?.message}
                      helpText="N percentage (0-100)"
                    >
                      <StandardInput
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="e.g., 16"
                        {...register('nitrogen_percentage')}
                      />
                    </StandardField>
                    
                    <StandardField 
                      label="Phosphorus %" 
                      error={errors.phosphorus_percentage?.message}
                      helpText="P percentage (0-100)"
                    >
                      <StandardInput
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="e.g., 16"
                        {...register('phosphorus_percentage')}
                      />
                    </StandardField>
                    
                    <StandardField 
                      label="Potassium %" 
                      error={errors.potassium_percentage?.message}
                      helpText="K percentage (0-100)"
                    >
                      <StandardInput
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="e.g., 16"
                        {...register('potassium_percentage')}
                      />
                    </StandardField>
                  </SimpleGrid>
                  
                  {/* Real-time NPK total display */}
                  <Box p={2} bg="white" borderRadius="md" borderColor="green.300" borderWidth="1px">
                    <Text fontSize="xs" color="gray.600">
                      Total NPK: {(
                        (parseFloat(watch('nitrogen_percentage')) || 0) +
                        (parseFloat(watch('phosphorus_percentage')) || 0) +
                        (parseFloat(watch('potassium_percentage')) || 0)
                      ).toFixed(1)}% 
                      {((
                        (parseFloat(watch('nitrogen_percentage')) || 0) +
                        (parseFloat(watch('phosphorus_percentage')) || 0) +
                        (parseFloat(watch('potassium_percentage')) || 0)
                      ) > 100) && (
                        <Text as="span" color="red.500" fontWeight="bold"> - Exceeds 100%!</Text>
                      )}
                    </Text>
                  </Box>
                  </VStack>
                </Box>
              )}
          </Box>

          {/* Section 3: Environmental Conditions */}
          <Box mb={6} p={4} border="1px" borderColor="gray.200" borderRadius="lg">
            <Text fontSize="md" fontWeight="bold" mb={4} color="orange.600">
              <Icon as={FaThermometerHalf} mr={2} />
              Environmental Conditions
              <Badge ml={2} colorScheme="blue" fontSize="xs">
                Improves Carbon Accuracy
              </Badge>
            </Text>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <StandardField
                label="Weather Conditions"
                helpText="Weather during application affects chemical effectiveness and carbon impact"
              >
                <StandardInput
                  type="text"
                  placeholder="e.g., calm, dry conditions, 65% humidity"
                  {...register('weather_conditions')}
                />
              </StandardField>

              <StandardField label="Temperature Range">
                <StandardInput
                  type="text"
                  placeholder="e.g., 18-25°C or 65-77°F"
                  {...register('temperature_range')}
                />
              </StandardField>
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <StandardField label="Soil Moisture">
                <StandardSelect placeholder="Select soil moisture" {...register('soil_moisture')}>
                  <option value="dry">Dry</option>
                  <option value="moderate">Moderate</option>
                  <option value="moist">Moist</option>
                  <option value="wet">Wet</option>
                </StandardSelect>
              </StandardField>

              <StandardField label="Wind Speed">
                <StandardInput
                  type="text"
                  placeholder="e.g., 5-10 mph, calm"
                  {...register('wind_speed')}
                />
              </StandardField>

              <StandardField label="Application Time">
                <StandardSelect placeholder="Select application time" {...register('time_period')}>
                  <option value="early_morning">Early Morning (6-9 AM)</option>
                  <option value="morning">Morning (9-12 PM)</option>
                  <option value="afternoon">Afternoon (12-3 PM)</option>
                  <option value="evening">Evening (3-6 PM)</option>
                  <option value="night">Night Application</option>
                </StandardSelect>
              </StandardField>
            </SimpleGrid>
          </Box>

          {/* Section 4: Additional Notes */}
          <Box mb={6} p={4} border="1px" borderColor="gray.200" borderRadius="lg">
            <StandardField label={intl.formatMessage({ id: 'app.observations' })}>
              <StandardTextarea
                placeholder="Optional: Additional notes about application conditions, target pests, equipment used, etc."
                rows={3}
                {...register('observation')}
              />
            </StandardField>
          </Box>

          {/* Enhanced Navigation */}
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

export default ChemicalTab;
