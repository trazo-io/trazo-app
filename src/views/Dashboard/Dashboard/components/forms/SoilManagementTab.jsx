import React, { useEffect, useState } from 'react';
import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  Icon,
  Input,
  Text,
  Textarea,
  useColorModeValue,
  HStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select as ChakraSelect,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  SimpleGrid,
  Badge,
  Tooltip,
  FormErrorMessage,
  Collapse,
  useDisclosure
} from '@chakra-ui/react';
import {
  StandardCard,
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea
} from 'components/Design/StandardComponents';
import {
  FaChevronLeft,
  FaChevronRight,
  FaSeedling,
  FaRulerHorizontal,
  FaThermometerHalf,
  FaInfoCircle,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, number } from 'zod';
import { FaPlus } from 'react-icons/fa';
import { useIntl } from 'react-intl';

const formSchemaSoilManagement = object({
  type: string().min(1, 'Soil management type is required'),
  area: string()
    .min(1, 'Area is required')
    .refine((val) => val !== '' && parseFloat(val) > 0, {
      message: 'Area must be greater than 0'
    }),
  area_unit: string().min(1, 'Area unit is required'),
  soil_ph: string().optional(),
  organic_matter_percentage: string().optional(),
  soil_texture: string().optional(),
  soil_moisture: string().optional(),
  depth: string().optional(),
  depth_unit: string().optional(),
  equipment_used: string().optional(),
  weather_conditions: string().optional(),
  temperature_range: string().optional(),
  observation: string().optional()
});

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

const getSoilManagementDefaults = (soilType) => {
  const defaults = {
    ST: {
      area: '2.0',
      area_unit: 'hectares',
      soil_ph: '6.5',
      organic_matter_percentage: '3.5',
      soil_texture: 'loam',
      soil_moisture: 'moderate',
      depth: '30',
      depth_unit: 'cm',
      equipment_used: 'soil auger',
      weather_conditions: 'dry conditions',
      temperature_range: '20-25°C'
    },
    PA: {
      area: '2.0',
      area_unit: 'hectares',
      soil_ph: '6.8',
      organic_matter_percentage: '4.0',
      soil_texture: 'clay loam',
      soil_moisture: 'moist',
      depth: '20',
      depth_unit: 'cm',
      equipment_used: 'tractor with disc harrow',
      weather_conditions: 'optimal planting conditions',
      temperature_range: '18-22°C'
    },
    TI: {
      area: '2.0',
      area_unit: 'hectares',
      soil_ph: '7.0',
      organic_matter_percentage: '3.0',
      soil_texture: 'sandy loam',
      soil_moisture: 'moderate',
      depth: '25',
      depth_unit: 'cm',
      equipment_used: 'cultivator',
      weather_conditions: 'dry, workable conditions',
      temperature_range: '15-25°C'
    }
  };

  return defaults[soilType] || defaults.ST;
};

const SoilManagementTab = ({
  onSubmitHandler,
  onDataChange,
  onPrev,
  initialValues = {},
  cropType = 'citrus'
}) => {
  const intl = useIntl();
  const bgPrevButton = useColorModeValue('gray.100', 'gray.100');
  const textColor = useColorModeValue('gray.700', 'white');
  const iconColor = useColorModeValue('gray.300', 'gray.700');
  const [selectedSoilType, setSelectedSoilType] = useState('');
  
  // Progressive disclosure for advanced options
  const { isOpen: isAdvancedOpen, onToggle: onAdvancedToggle } = useDisclosure();

  const mapApiTypeToFormType = (apiType) => {
    if (!apiType) return '';

    const typeMapping = {
      'event.soil.testing': 'ST',
      'event.soil.planting': 'PA',
      'event.soil.tillage': 'TI'
    };

    return typeMapping[apiType] || apiType;
  };

  const formType = mapApiTypeToFormType(initialValues.type);

  const intelligentDefaults = getSoilManagementDefaults(formType || 'ST');

  const methods = useForm({
    resolver: zodResolver(formSchemaSoilManagement),
    defaultValues: {
      type: formType || '',
      // Only use existing values, not intelligent defaults for carbon calculation fields
      area: initialValues.area || '',
      area_unit: initialValues.area_unit || 'hectares',
      soil_ph: initialValues.soil_ph || '',
      organic_matter_percentage: initialValues.organic_matter_percentage || '',
      soil_texture: initialValues.soil_texture || '',
      soil_moisture: initialValues.soil_moisture || '',
      depth: initialValues.depth || '',
      depth_unit: initialValues.depth_unit || 'cm',
      equipment_used: initialValues.equipment_used || '',
      weather_conditions: initialValues.weather_conditions || '',
      temperature_range: initialValues.temperature_range || '',
      observation: initialValues.observation || ''
    }
  });

  const {
    reset,
    handleSubmit,
    formState: { errors },
    register,
    setValue,
    watch
  } = methods;

  const watchedType = watch('type');

  // Watch critical fields for real-time carbon calculation updates
  const watchedFields = watch([
    'type',
    'area',
    'area_unit',
    'soil_ph',
    'organic_matter_percentage',
    'depth'
  ]);

  // Real-time field watching for carbon calculation updates
  useEffect(() => {

    // Always check if callback exists inside the timeout to avoid stale closures
    const timeoutId = setTimeout(() => {
      if (onDataChange && typeof onDataChange === 'function') {
        const currentValues = methods.getValues();

        // Only trigger if we have meaningful user-provided data
        const hasValidType = currentValues.type && currentValues.type !== '';
        const hasValidArea = currentValues.area && 
          parseFloat(currentValues.area) > 0 && 
          currentValues.area !== '';
        const hasValidAreaUnit = currentValues.area_unit && currentValues.area_unit !== '';

        if (hasValidType && hasValidArea && hasValidAreaUnit) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[SoilManagementTab]: ✅ Triggering carbon calculation');
          }
          try {
            onDataChange(currentValues);
          } catch (error) {
            console.error('[SoilManagementTab]: Error calling onDataChange:', error);
          }
        } else {
          console.log('[SoilManagementTab]: Not triggering - insufficient meaningful data', {
            hasValidType,
            hasValidArea,
            hasValidAreaUnit,
            areaValue: currentValues.area,
            typeValue: currentValues.type
          });
        }
      } else {
      }
    }, 500); // Debounced to prevent excessive API calls

    return () => clearTimeout(timeoutId);
  }, [watchedFields, onDataChange, methods]);

  useEffect(() => {
    if (watchedType && watchedType !== selectedSoilType && watchedType !== '') {
      setSelectedSoilType(watchedType);

      const newDefaults = getSoilManagementDefaults(watchedType);

      // Only apply defaults for non-critical carbon calculation fields
      // Area must be user-provided to ensure meaningful carbon calculations
      Object.keys(newDefaults).forEach((field) => {
        // Skip area field - user must provide this for valid carbon calculation
        if (field === 'area') return;
        
        const currentValue = watch(field);
        if (!currentValue || currentValue === '' || currentValue === intelligentDefaults[field]) {
          setValue(field, newDefaults[field]);
        }
      });
    }
  }, [watchedType, selectedSoilType, setValue, watch, intelligentDefaults]);

  const handleEnhancedSubmit = (data) => {
    const requiredFields = ['type', 'area', 'area_unit'];

    const invalidFields = requiredFields.filter((field) => {
      const value = data[field]?.toString().toLowerCase();
      return (
        !value || value === 'unknown' || value === 'n/a' || value === 'na' || value.trim() === ''
      );
    });

    if (invalidFields.length > 0) {
      const defaults = getSoilManagementDefaults(data.type);
      invalidFields.forEach((field) => {
        if (defaults[field]) {
          data[field] = defaults[field];
          setValue(field, defaults[field]);
        }
      });
    }

    // Note: Crop type is inherited from production context via event.history.crop_type.name
    // USDA API mapping happens in backend based on production's crop type

    onSubmitHandler(data);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleEnhancedSubmit)} style={{ width: '100%' }}>
        <Flex direction="column" w="100%">
          <Alert status="info" mb={4} borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle fontSize="sm">Soil Management & Transparency Documentation</AlertTitle>
              <AlertDescription fontSize="xs">
                All fields marked with * are required for accurate carbon footprint calculations and
                transparency documentation. Soil management practices help build consumer trust through
                documented sustainable farming methods.
              </AlertDescription>
            </Box>
          </Alert>

          <Box mb={6} p={4} border="1px" borderColor="gray.200" borderRadius="lg">
            <HStack justify="space-between" align="center" mb={4}>
              <Text fontSize="md" fontWeight="bold" color="green.600">
                <Icon as={FaSeedling} mr={2} />
                Soil Management & Crop Information
              </Text>
              <Badge colorScheme="green" fontSize="xs">
                Transparency Tracking
              </Badge>
            </HStack>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <StandardField
                label={`${
                  intl.formatMessage({ id: 'app.soilManagementType' }) || 'Soil Management Type'
                } *`}
                required
                error={errors.type?.message}
              >
                <StandardSelect placeholder="Select soil management type" {...register('type')}>
                  <option value="ST">Soil Testing</option>
                  <option value="PA">Planting/Amendment</option>
                  <option value="TI">Tillage</option>
                </StandardSelect>
              </StandardField>

              <FormControl>
                <FormLabel ms="4px" fontSize="xs" fontWeight="bold">
                  Crop Type
                  <Tooltip label="Crop type is inherited from production - no need to select again">
                    <Icon as={FaInfoCircle} ml={1} color="green.400" />
                  </Tooltip>
                </FormLabel>
                <Box
                  ml="4px"
                  height={'40px'}
                  borderRadius={'15px'}
                  fontSize={'0.875rem'}
                  mb="24px"
                  p={2}
                  bg="green.50"
                  border="1px solid"
                  borderColor="green.200"
                  display="flex"
                  alignItems="center"
                >
                  <Text color="green.700" fontWeight="medium">
                    {cropType
                      ? USDA_CROP_TYPES.find((crop) => crop.value === cropType.toLowerCase())
                          ?.label || `${cropType} (inherited from production)`
                      : 'Inherited from production'}
                  </Text>
                </Box>
              </FormControl>
            </SimpleGrid>
          </Box>

          <Box mb={6} p={4} border="1px" borderColor="gray.200" borderRadius="lg">
            <HStack justify="space-between" align="center" mb={4}>
              <Text fontSize="md" fontWeight="bold" color="blue.600">
                <Icon as={FaRulerHorizontal} mr={2} />
                Area and Physical Measurements
              </Text>
              <Badge colorScheme="blue" fontSize="xs">
                Carbon Calculation Required
              </Badge>
            </HStack>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <StandardField label="Area Managed *" required error={errors.area?.message}>
                <HStack spacing={2}>
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

              <StandardField label="Working Depth">
                <HStack spacing={2}>
                  <StandardInput
                    flex={2}
                    type="number"
                    step="1"
                    placeholder="30"
                    {...register('depth')}
                  />
                  <StandardSelect flex={1} {...register('depth_unit')}>
                    <option value="cm">Centimeters</option>
                    <option value="inches">Inches</option>
                  </StandardSelect>
                </HStack>
              </StandardField>
            </SimpleGrid>
          </Box>

          {(watch('type') === 'ST' || watch('type') === 'PA') && (
            <Box mb={6} p={4} border="1px" borderColor="gray.200" borderRadius="lg">
              <HStack justify="space-between" align="center" mb={4}>
                <Text fontSize="md" fontWeight="bold" color="orange.600">
                  <Icon as={FaThermometerHalf} mr={2} />
                  Soil Properties
                </Text>
                <Badge colorScheme="orange" fontSize="xs">
                  Improves Carbon Accuracy
                </Badge>
              </HStack>

              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <StandardField 
                  label={intl.formatMessage({ id: 'app.soilPH' }) || 'Soil pH'}
                  helpText="pH affects nutrient availability"
                >
                  <StandardInput
                    type="number"
                    min="0"
                    max="14"
                    step="0.1"
                    placeholder="6.5"
                    {...register('soil_ph')}
                  />
                </StandardField>

                <StandardField 
                  label={intl.formatMessage({ id: 'app.organicMatterPercentage' }) || 'Organic Matter (%)'}
                  helpText="Higher organic matter improves soil carbon"
                >
                  <StandardInput
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="3.5"
                    {...register('organic_matter_percentage')}
                  />
                </StandardField>

                <StandardField 
                  label="Soil Texture"
                  helpText="Soil type affects carbon retention"
                >
                  <StandardSelect placeholder="Select soil texture" {...register('soil_texture')}>
                    <option value="clay">Clay</option>
                    <option value="clay_loam">Clay Loam</option>
                    <option value="loam">Loam</option>
                    <option value="sandy_loam">Sandy Loam</option>
                    <option value="sand">Sand</option>
                    <option value="silt">Silt</option>
                    <option value="silt_loam">Silt Loam</option>
                  </StandardSelect>
                </StandardField>
              </SimpleGrid>
            </Box>
          )}

          <Box mb={6} p={4} border="1px" borderColor="gray.200" borderRadius="lg">
            <HStack justify="space-between" align="center" mb={4}>
              <HStack>
                <Text fontSize="md" fontWeight="bold" color="purple.600">
                  <Icon as={FaThermometerHalf} mr={2} />
                  Environmental Conditions & Equipment
                </Text>
                <StandardButton
                  variant="ghost"
                  size="sm"
                  onClick={onAdvancedToggle}
                  rightIcon={<Icon as={isAdvancedOpen ? FaChevronUp : FaChevronDown} />}
                >
                  {isAdvancedOpen ? 'Hide Details' : 'Show Details'}
                </StandardButton>
              </HStack>
              <Badge colorScheme="purple" fontSize="xs">
                Context for Transparency
              </Badge>
            </HStack>

            <Collapse in={isAdvancedOpen} animateOpacity>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <StandardField
                label="Weather Conditions"
                helpText="Weather during soil management affects carbon impact"
              >
                <StandardInput
                  type="text"
                  placeholder="e.g., dry, workable conditions"
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

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <StandardField label="Soil Moisture">
                <StandardSelect placeholder="Select soil moisture" {...register('soil_moisture')}>
                  <option value="dry">Dry</option>
                  <option value="moderate">Moderate</option>
                  <option value="moist">Moist</option>
                  <option value="wet">Wet</option>
                </StandardSelect>
              </StandardField>

              <StandardField label="Equipment Used">
                <StandardInput
                  type="text"
                  placeholder="e.g., tractor with disc harrow, soil auger"
                  {...register('equipment_used')}
                />
              </StandardField>
            </SimpleGrid>
            </Collapse>
          </Box>

          <Box mb={6} p={4} border="1px" borderColor="gray.200" borderRadius="lg">
            <HStack justify="space-between" align="center" mb={4}>
              <Text fontSize="md" fontWeight="bold" color="green.600">
                <Icon as={FaSeedling} mr={2} />
                Additional Notes & Transparency Details
              </Text>
              <Badge colorScheme="green" fontSize="xs">
                Consumer Transparency
              </Badge>
            </HStack>
            <StandardField 
              label={intl.formatMessage({ id: 'app.observations' }) || 'Observations'}
              helpText="Share additional details about your soil management practices that help build consumer trust"
            >
              <StandardTextarea
                placeholder="Optional: Describe your soil management approach, goals for soil health, organic practices used, etc. These details help consumers understand your farming methods."
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

export default SoilManagementTab;
