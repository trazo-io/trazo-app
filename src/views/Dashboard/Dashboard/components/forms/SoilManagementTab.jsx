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
  area_covered: string()
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
  // Standardized fuel consumption fields (matching ProductionEvent pattern)
  name: string().optional(),
  fuel_consumed: string().optional(),
  fuel_unit: string().optional(),
  equipment_hours: string().optional(),
  production_efficiency: string().optional(),
  transportation_distance: string().optional(),
  transportation_unit: string().optional(),
  // Tillage-specific fields for carbon calculations
  tillage_type: string().optional(),
  tillage_intensity: string().optional(),
  tillage_direction: string().optional(),
  residue_management: string().optional(),
  equipment_used: string().optional(),
  weather_conditions: string().optional(),
  temperature_range: string().optional(),
  observation: string().optional()
});

const getSoilManagementDefaults = (soilType) => {
  const defaults = {
    ST: {
      area_covered: '2.0',
      area_unit: 'ha',
      soil_ph: '6.5',
      organic_matter_percentage: '3.5',
      soil_texture: 'loam',
      soil_moisture: 'moderate',
      depth: '30',
      depth_unit: 'cm',
      weather_conditions: 'dry conditions',
      temperature_range: '20-25°C'
    },
    PA: {
      area_covered: '2.0',
      area_unit: 'ha',
      soil_ph: '6.8',
      organic_matter_percentage: '4.0',
      soil_texture: 'clay loam',
      soil_moisture: 'moist',
      depth: '20',
      depth_unit: 'cm',
      weather_conditions: 'optimal planting conditions',
      temperature_range: '18-22°C'
    },
    TI: {
      area_covered: '2.0',
      area_unit: 'ha',
      soil_ph: '7.0',
      organic_matter_percentage: '3.0',
      soil_texture: 'sandy loam',
      soil_moisture: 'moderate',
      depth: '25',
      depth_unit: 'cm',
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
  hideActions = false
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
      area_covered: initialValues.area_covered || '',
      area_unit: initialValues.area_unit || 'ha',
      soil_ph: initialValues.soil_ph || '',
      organic_matter_percentage: initialValues.organic_matter_percentage || '',
      soil_texture: initialValues.soil_texture || '',
      soil_moisture: initialValues.soil_moisture || '',
      depth: initialValues.depth || '',
      depth_unit: initialValues.depth_unit || 'cm',
      // Standardized fuel consumption fields (matching ProductionEvent pattern)
      name: initialValues.name || '',
      fuel_consumed: initialValues.fuel_consumed || '',
      fuel_unit: initialValues.fuel_unit || 'L',
      equipment_hours: initialValues.equipment_hours || '',
      production_efficiency: initialValues.production_efficiency || '',
      transportation_distance: initialValues.transportation_distance || '',
      transportation_unit: initialValues.transportation_unit || 'km',
      // Tillage-specific fields for carbon calculations
      tillage_type: initialValues.tillage_type || '',
      tillage_intensity: initialValues.tillage_intensity || '',
      tillage_direction: initialValues.tillage_direction || '',
      residue_management: initialValues.residue_management || '',
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

  // Watch fields that impact carbon calculations (for carbon API efficiency)
  // Core calculation fields (directly impact emissions):
  const watchedType = watch('type'); // Determines emission factor
  const watchedArea = watch('area_covered'); // Area-based emissions
  const watchedAreaUnit = watch('area_unit'); // Area conversion
  const watchedFuelConsumed = watch('fuel_consumed'); // Direct fuel emissions
  const watchedFuelUnit = watch('fuel_unit'); // Fuel conversion
  const watchedEquipmentHours = watch('equipment_hours'); // Fuel estimation

  // Confidence bonus fields (affect confidence score but not core calculation):
  const watchedSoilPh = watch('soil_ph'); // +5 confidence
  const watchedOrganicMatter = watch('organic_matter_percentage'); // +5 confidence

  // Watch non-calculation fields to ensure they get sent to backend (but don't trigger carbon API)
  const watchedTransportationDistance = watch('transportation_distance'); // For form data completeness
  const watchedObservation = watch('observation'); // For backend description field
  const watchedDepth = watch('depth'); // For preview display
  const watchedDepthUnit = watch('depth_unit'); // For preview display
  const watchedEquipmentUsed = watch('equipment_used'); // For preview display

  // Note: transportation_distance, observation, depth, depth_unit, and equipment_used are watched to ensure form data updates
  // but are NOT included in the carbon calculation useEffect dependencies

  // Carbon calculation trigger - ONLY for calculation-relevant fields
  useEffect(() => {
    // Only trigger when fields that actually impact carbon calculations change
    const timeoutId = setTimeout(() => {
      if (onDataChange && typeof onDataChange === 'function') {
        const currentValues = methods.getValues();
        console.log(
          '🌱 SoilManagementTab carbon calculation triggered for:',
          Object.keys(currentValues)
        );

        // Check if we have calculation-relevant data
        if (
          watchedType ||
          watchedArea ||
          watchedFuelConsumed ||
          watchedEquipmentHours ||
          watchedSoilPh
        ) {
          try {
            onDataChange(currentValues);
            console.log('🌱 SoilManagementTab: ✅ Carbon calculation onDataChange called');
          } catch (error) {
            console.error(
              '🌱 SoilManagementTab: ❌ Error in carbon calculation onDataChange:',
              error
            );
          }
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    // ONLY carbon calculation fields to prevent unnecessary API calls
    watchedType, // Determines emission factor
    watchedArea, // Area-based emissions
    watchedAreaUnit, // Area conversion
    watchedFuelConsumed, // Direct fuel emissions
    watchedFuelUnit, // Fuel conversion
    watchedEquipmentHours, // Fuel estimation
    watchedSoilPh, // +5 confidence
    watchedOrganicMatter, // +5 confidence
    onDataChange
  ]); // OPTIMIZED: Only trigger carbon calculations for relevant field changes

  // Form data completeness - for ALL fields including non-calculation ones
  useEffect(() => {
    // Always update form data to ensure transportation_distance and observation are captured
    const timeoutId = setTimeout(() => {
      if (onDataChange && typeof onDataChange === 'function') {
        const currentValues = methods.getValues();
        console.log('🌱 SoilManagementTab form completeness update for non-calculation fields');

        // Always send complete form data when non-calculation fields change
        try {
          onDataChange(currentValues);
          console.log('🌱 SoilManagementTab: ✅ Form data completeness onDataChange called');
        } catch (error) {
          console.error('🌱 SoilManagementTab: ❌ Error in form completeness onDataChange:', error);
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    // Non-calculation fields to ensure they get captured in form data
    watchedTransportationDistance, // Ensures transportation_distance gets sent
    watchedObservation, // Ensures observation gets mapped to description
    watchedDepth, // Ensures working depth appears in preview
    watchedDepthUnit, // Ensures depth unit appears in preview
    watchedEquipmentUsed, // Ensures equipment_used appears in preview
    onDataChange
  ]); // ENSURES: All form data including non-calculation fields gets sent to backend

  useEffect(() => {
    if (watchedType && watchedType !== selectedSoilType && watchedType !== '') {
      setSelectedSoilType(watchedType);

      const newDefaults = getSoilManagementDefaults(watchedType);

      // Only apply defaults for non-critical carbon calculation fields
      // Area must be user-provided to ensure meaningful carbon calculations
      Object.keys(newDefaults).forEach((field) => {
        // Skip area field - user must provide this for valid carbon calculation
        if (field === 'area_covered') return;

        const currentValue = watch(field);
        if (!currentValue || currentValue === '' || currentValue === intelligentDefaults[field]) {
          setValue(field, newDefaults[field]);
        }
      });
    }
  }, [watchedType, selectedSoilType, setValue, watch, intelligentDefaults]);

  const handleEnhancedSubmit = (data) => {
    // 🔍 Debug: Check if observation field is being captured
    console.log('🔍 [SoilManagement] Form submission data:', {
      observation: data.observation,
      observationType: typeof data.observation,
      observationLength: data.observation?.length,
      allKeys: Object.keys(data)
    });

    const requiredFields = ['type', 'area_covered', 'area_unit'];

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

    // Extract tillage fields for extra_data storage
    const { tillage_type, tillage_intensity, tillage_direction, residue_management, ...coreData } =
      data;

    // Process data for backend compatibility
    // Ensure all numeric fields are strings (not Decimal objects)
    const cleanedCoreData = Object.entries(coreData).reduce((acc, [key, value]) => {
      // Convert any numeric values to strings to avoid Decimal serialization issues
      acc[key] = value !== null && value !== undefined ? String(value) : value;
      return acc;
    }, {});

    // 🔍 Debug: Check observation value before mapping to description
    console.log('🔍 [SoilManagement] Before description mapping:', {
      'cleanedCoreData.observation': cleanedCoreData.observation,
      'observation type': typeof cleanedCoreData.observation,
      'observation length': cleanedCoreData.observation?.length,
      'is falsy?': !cleanedCoreData.observation,
      'fallback name': cleanedCoreData.name
    });

    const processedData = {
      ...cleanedCoreData,
      // Map observation field to description (required by backend CommonEvent model)
      // Backend requires non-empty description, so provide fallback if observation is empty
      description:
        cleanedCoreData.observation ||
        `Soil management event: ${cleanedCoreData.name || 'Soil Testing'}`,
      // Store tillage-specific fields in extra_data for backend compatibility
      // Ensure all values are JSON-serializable (convert any potential Decimal objects to strings)
      extra_data: {
        tillage_type: tillage_type || '',
        tillage_intensity: tillage_intensity || '',
        tillage_direction: tillage_direction || '',
        residue_management: residue_management || '',
        // Include any existing extra data, ensuring JSON serialization
        ...(data.extra_data ? JSON.parse(JSON.stringify(data.extra_data)) : {})
      }
    };

    console.log('[SoilManagementTab] Submitting with standardized fuel fields:', {
      fuel_consumed: processedData.fuel_consumed,
      fuel_unit: processedData.fuel_unit,
      equipment_hours: processedData.equipment_hours
    });

    console.log('[SoilManagementTab] Submitting processed data:', {
      ...processedData,
      extra_data: JSON.stringify(processedData.extra_data, null, 2)
    });
    onSubmitHandler(processedData);
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
                transparency documentation. Soil management practices help build consumer trust
                through documented sustainable farming methods.
              </AlertDescription>
            </Box>
          </Alert>

          <Box mb={6} p={4} border="1px" borderColor="gray.200" borderRadius="lg">
            <HStack justify="space-between" align="center" mb={4}>
              <Text fontSize="md" fontWeight="bold" color="green.600">
                <Icon as={FaSeedling} mr={2} />
                Soil Management Information
              </Text>
              <Badge colorScheme="green" fontSize="xs">
                Transparency Tracking
              </Badge>
            </HStack>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <StandardField
                label={`${
                  intl.formatMessage({ id: 'app.soilManagementType' }) || 'Soil Management Type'
                }`}
                required
                error={errors.type?.message}>
                <StandardSelect placeholder="Select soil management type" {...register('type')}>
                  <option value="ST">Soil Testing</option>
                  <option value="PA">Planting/Amendment</option>
                  <option value="TI">Tillage</option>
                </StandardSelect>
              </StandardField>

              <StandardField
                label="Event Name"
                helpText="Descriptive name for this soil management operation">
                <StandardInput
                  type="text"
                  placeholder="e.g., Spring Tillage - North Field"
                  {...register('name')}
                />
              </StandardField>
            </SimpleGrid>
          </Box>

          <Box mb={6} p={4} border="1px" borderColor="green.200" borderRadius="lg" bg="green.50">
            <HStack justify="space-between" align="center" mb={4}>
              <Text fontSize="md" fontWeight="bold" color="green.600">
                <Icon as={FaRulerHorizontal} mr={2} />
                Area and Physical Measurements
              </Text>
              <Badge colorScheme="green" fontSize="xs">
                Carbon Calculation Required
              </Badge>
            </HStack>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <StandardField label="Area Covered" required error={errors.area_covered?.message}>
                <HStack spacing={2}>
                  <StandardInput
                    flex={2}
                    type="number"
                    step="0.1"
                    placeholder="2.0"
                    bg="white"
                    {...register('area_covered')}
                  />
                  <StandardSelect flex={1} bg="white" {...register('area_unit')}>
                    <option value="ha">Hectares</option>
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
                    bg="white"
                    {...register('depth')}
                  />
                  <StandardSelect flex={1} bg="white" {...register('depth_unit')}>
                    <option value="cm">Centimeters</option>
                    <option value="inches">Inches</option>
                  </StandardSelect>
                </HStack>
              </StandardField>
            </SimpleGrid>
          </Box>

          {/* Fuel Consumption Fields - Standardized across all event types */}
          <Box mb={6} p={4} border="1px" borderColor="green.200" borderRadius="lg" bg="green.50">
            <HStack justify="space-between" align="center" mb={4}>
              <Text fontSize="md" fontWeight="bold" color="green.600">
                <Icon as={FaSeedling} mr={2} />
                Fuel Consumption & Equipment Data
              </Text>
              <Badge colorScheme="green" fontSize="xs">
                Enhanced Carbon Accuracy
              </Badge>
            </HStack>

            <Text fontSize="sm" color="gray.600" mb={4}>
              Document your actual equipment usage and fuel consumption to build consumer trust
              through transparent farming practices. These details help consumers understand the
              real operational impact of your soil management.
            </Text>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <StandardField
                label="Fuel Consumed"
                helpText="Total fuel used for soil management equipment">
                <HStack spacing={2}>
                  <StandardInput
                    flex={2}
                    type="number"
                    step="0.1"
                    placeholder="15.5"
                    {...register('fuel_consumed')}
                  />
                  <StandardSelect flex={1} {...register('fuel_unit')}>
                    <option value="L">Liters</option>
                    <option value="gal">Gallons</option>
                  </StandardSelect>
                </HStack>
              </StandardField>

              <StandardField label="Equipment Hours" helpText="Total equipment operating time">
                <StandardInput
                  type="number"
                  step="0.1"
                  placeholder="3.5"
                  {...register('equipment_hours')}
                />
              </StandardField>

              <StandardField
                label="Production Efficiency"
                helpText="Equipment efficiency rating for carbon scoring">
                <StandardSelect {...register('production_efficiency')}>
                  <option value="">Select efficiency level</option>
                  <option value="high">High Efficiency</option>
                  <option value="normal">Normal Efficiency</option>
                  <option value="low">Low Efficiency</option>
                </StandardSelect>
              </StandardField>

              <StandardField
                label="Transportation Distance"
                helpText="Distance traveled to/from field">
                <HStack spacing={2}>
                  <StandardInput
                    flex={2}
                    type="number"
                    step="0.1"
                    placeholder="5.0"
                    {...register('transportation_distance')}
                  />
                  <StandardSelect flex={1} {...register('transportation_unit')}>
                    <option value="km">Kilometers</option>
                    <option value="miles">Miles</option>
                  </StandardSelect>
                </HStack>
              </StandardField>
            </SimpleGrid>

            <Box
              bg="blue.50"
              p={3}
              borderRadius="md"
              borderLeft="4px"
              borderLeftColor="blue.400"
              mt={4}>
              <HStack spacing={2} mb={1}>
                <Icon as={FaSeedling} color="blue.500" fontSize="sm" />
                <Text fontSize="sm" fontWeight="semibold" color="blue.700">
                  Building Consumer Trust
                </Text>
              </HStack>
              <Text fontSize="xs" color="blue.600">
                Documenting actual fuel consumption and equipment usage provides consumers with
                complete transparency into your farming operations, building trust through detailed
                agricultural practices.
              </Text>
            </Box>
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
                  helpText="pH affects nutrient availability">
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
                  label={
                    intl.formatMessage({ id: 'app.organicMatterPercentage' }) ||
                    'Organic Matter (%)'
                  }
                  helpText="Higher organic matter improves soil carbon">
                  <StandardInput
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="3.5"
                    {...register('organic_matter_percentage')}
                  />
                </StandardField>

                <StandardField label="Soil Texture" helpText="Soil type affects carbon retention">
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

          {/* Tillage-Specific Fields - Only for Tillage Operations */}
          {watch('type') === 'TI' && (
            <Box
              mb={6}
              p={4}
              border="1px"
              borderColor="orange.200"
              borderRadius="lg"
              bg="orange.50">
              <HStack justify="space-between" align="center" mb={4}>
                <Text fontSize="md" fontWeight="bold" color="orange.600">
                  <Icon as={FaSeedling} mr={2} />
                  Tillage Operation Details
                </Text>
                <Badge colorScheme="orange" fontSize="xs">
                  Carbon Impact Calculation
                </Badge>
              </HStack>

              <Text fontSize="sm" color="gray.600" mb={4}>
                Provide specific tillage details for accurate carbon impact assessment. Tillage
                practices significantly affect soil carbon sequestration and emissions.
              </Text>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <StandardField label="Tillage Type" helpText="Primary tillage operation performed">
                  <StandardSelect placeholder="Select tillage type" {...register('tillage_type')}>
                    <option value="conventional_plow">🚜 Conventional Plow - Deep inversion</option>
                    <option value="chisel_plow">⚡ Chisel Plow - Reduced tillage</option>
                    <option value="disk_harrow">💿 Disk Harrow - Surface cultivation</option>
                    <option value="no_till">🌱 No-Till - Direct seeding</option>
                    <option value="strip_till">📏 Strip Till - Zonal tillage</option>
                    <option value="minimum_till">🔄 Minimum Till - Conservation</option>
                    <option value="subsoiling">🔧 Subsoiling - Deep loosening</option>
                    <option value="cultivator">🌾 Cultivator - Shallow cultivation</option>
                  </StandardSelect>
                </StandardField>

                <StandardField
                  label="Tillage Intensity"
                  helpText="Intensity affects carbon emissions">
                  <StandardSelect placeholder="Select intensity" {...register('tillage_intensity')}>
                    <option value="high">High - Heavy disturbance</option>
                    <option value="medium">Medium - Moderate disturbance</option>
                    <option value="low">Low - Minimal disturbance</option>
                    <option value="conservation">Conservation - Protective tillage</option>
                  </StandardSelect>
                </StandardField>

                <StandardField
                  label="Tillage Direction"
                  helpText="Direction affects soil erosion and carbon retention">
                  <StandardSelect placeholder="Select direction" {...register('tillage_direction')}>
                    <option value="across_slope">🏔️ Across Slope - Erosion control</option>
                    <option value="up_down_slope">⬇️ Up/Down Slope - Standard</option>
                    <option value="contour">🌀 Contour - Following natural lines</option>
                    <option value="random">🔀 Random - Variable direction</option>
                  </StandardSelect>
                </StandardField>

                <StandardField
                  label="Residue Management"
                  helpText="Crop residue handling affects carbon sequestration">
                  <StandardSelect
                    placeholder="Select residue management"
                    {...register('residue_management')}>
                    <option value="incorporated">♻️ Incorporated - Mixed into soil</option>
                    <option value="surface_left">🌾 Surface Left - Protective cover</option>
                    <option value="removed">🚛 Removed - Harvested/burned</option>
                    <option value="mulched">🍂 Mulched - Chopped in place</option>
                    <option value="partial_removal">📏 Partial Removal - Mixed approach</option>
                  </StandardSelect>
                </StandardField>
              </SimpleGrid>

              <Box
                bg="green.50"
                p={3}
                borderRadius="md"
                borderLeft="4px"
                borderLeftColor="green.400"
                mt={4}>
                <HStack spacing={2} mb={1}>
                  <Icon as={FaSeedling} color="green.500" fontSize="sm" />
                  <Text fontSize="sm" fontWeight="semibold" color="green.700">
                    Carbon Impact Tip
                  </Text>
                </HStack>
                <Text fontSize="xs" color="green.600">
                  No-till and conservation tillage practices typically sequester more carbon and
                  reduce emissions compared to conventional tillage. Leaving crop residues
                  incorporated or on the surface also improves carbon retention.
                </Text>
              </Box>
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
                  rightIcon={<Icon as={isAdvancedOpen ? FaChevronUp : FaChevronDown} />}>
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
                  helpText="Weather during soil management affects carbon impact">
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
              label={intl.formatMessage({ id: 'app.observations' }) || 'Observations & Notes'}
              helpText="Share details about your soil management approach that help consumers understand your sustainable farming practices">
              <StandardTextarea
                placeholder="Optional: Describe your soil management approach, goals for soil health, organic practices used, sustainability goals, etc. These details help consumers understand your farming methods."
                rows={4}
                {...register('observation')}
              />
            </StandardField>
          </Box>

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
                  size="lg">
                  {intl.formatMessage({ id: 'app.continue' }) || 'Continue'}
                </StandardButton>
              </HStack>
            </Box>
          )}
        </Flex>
      </form>
    </FormProvider>
  );
};

export default SoilManagementTab;
