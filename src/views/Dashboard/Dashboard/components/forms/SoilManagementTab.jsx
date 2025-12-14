// Sprint 3 Epic 3.1: Cleaned unused Chakra imports - using StandardComponents only
import React, { useEffect, useState } from 'react';
import { Icon, Text, useColorModeValue, HStack, Box, SimpleGrid, Flex } from '@chakra-ui/react';
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
// Sprint 3 Epic 3.1: Cleaned unused icon imports
import { FaChevronLeft, FaChevronRight, FaSeedling, FaThermometerHalf, FaBolt } from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, array } from 'zod';
import CustomFieldsForm from './CustomFieldsForm';
import { useIntl } from 'react-intl';

// Phase 3: Fuel types with EPA-verified emission factors (matching ProductionTab pattern)
const FUEL_TYPES = [
  { value: 'diesel', label: '⛽ Diesel', factor: '2.68 kg CO₂e/L' },
  { value: 'gasoline', label: '⛽ Gasoline', factor: '2.31 kg CO₂e/L' },
  { value: 'natural_gas', label: '💨 Natural Gas', factor: '2.03 kg CO₂e/m³' },
  { value: 'lpg', label: '🔥 LPG', factor: '1.70 kg CO₂e/L' },
  { value: 'electric', label: '⚡ Electric', factor: '0.39 kg CO₂e/kWh' }
];

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
  // Sprint 2 Epic 2.1.3: Removed soil_moisture (duplicates Weather event)
  depth: string().optional(),
  depth_unit: string().optional(),
  // Standardized fuel consumption fields (matching ProductionEvent pattern)
  name: string().optional(),
  fuel_type: string().optional(), // Phase 3: Fuel type for EPA emission factor selection
  fuel_consumed: string().optional(),
  fuel_unit: string().optional(),
  equipment_hours: string().optional(),
  production_efficiency: string().optional(),
  // Sprint 2 Epic 2.1.3: Removed transportation_distance (duplicates Production event)
  // Tillage-specific fields for carbon calculations
  tillage_type: string().optional(),
  tillage_intensity: string().optional(),
  tillage_direction: string().optional(),
  residue_management: string().optional(),
  equipment_used: string().optional(),
  // Sprint 2 Epic 2.1.3: Removed weather_conditions (duplicates Weather event)
  // ENHANCED: Soil Amendment (PA) fields for IPCC 2006 lime dissolution calculations
  amendment_amount: string().optional(),
  amendment_unit: string().optional(),
  amendment_type: string().optional(),
  observation: string().optional(),
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

// Sprint 2 Epic 2.1.3: Removed soil_moisture, weather_conditions, temperature_range from defaults
const getSoilManagementDefaults = (soilType) => {
  const defaults = {
    ST: {
      area_covered: '2.0',
      area_unit: 'ha',
      soil_ph: '6.5',
      organic_matter_percentage: '3.5',
      soil_texture: 'loam',
      depth: '30',
      depth_unit: 'cm'
    },
    // Sprint 2 Epic 2.1.3: PA (Planting/Amendment) kept but simplified - overlaps with Production "Planting"
    // ENHANCED: Added amendment fields for IPCC 2006 lime dissolution calculations
    PA: {
      area_covered: '2.0',
      area_unit: 'ha',
      soil_ph: '6.8',
      organic_matter_percentage: '4.0',
      soil_texture: 'clay loam',
      depth: '20',
      depth_unit: 'cm',
      // Amendment fields for carbon calculation (IPCC 2006 lime dissolution)
      amendment_amount: '',
      amendment_unit: 'kg',
      amendment_type: ''
    },
    TI: {
      area_covered: '2.0',
      area_unit: 'ha',
      soil_ph: '7.0',
      organic_matter_percentage: '3.0',
      soil_texture: 'sandy loam',
      depth: '25',
      depth_unit: 'cm'
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

  // Sprint 3 Epic 3.1: Removed progressive disclosure - consolidated sections

  const mapApiTypeToFormType = (apiType) => {
    if (!apiType) return '';

    // Sprint 2 Epic 2.1.3: PA renamed from "Planting/Amendment" to "Soil Amendment" to reduce overlap with Production
    const typeMapping = {
      'event.soil.testing': 'ST',
      'event.soil.planting': 'PA', // Legacy - now "Soil Amendment"
      'event.soil.amendment': 'PA', // New mapping
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
      // Sprint 2 Epic 2.1.3: Removed soil_moisture
      depth: initialValues.depth || '',
      depth_unit: initialValues.depth_unit || 'cm',
      // Standardized fuel consumption fields (matching ProductionEvent pattern)
      name: initialValues.name || '',
      fuel_type: initialValues.fuel_type || '', // Phase 3: Fuel type for EPA emission factor selection
      fuel_consumed: initialValues.fuel_consumed || '',
      fuel_unit: initialValues.fuel_unit || 'L',
      equipment_hours: initialValues.equipment_hours || '',
      production_efficiency: initialValues.production_efficiency || '',
      // Sprint 2 Epic 2.1.3: Removed transportation_distance
      // Tillage-specific fields for carbon calculations
      tillage_type: initialValues.tillage_type || '',
      tillage_intensity: initialValues.tillage_intensity || '',
      tillage_direction: initialValues.tillage_direction || '',
      residue_management: initialValues.residue_management || '',
      equipment_used: initialValues.equipment_used || '',
      // Sprint 2 Epic 2.1.3: Removed weather_conditions, temperature_range
      // ENHANCED: Amendment fields for IPCC 2006 lime dissolution calculations
      amendment_amount: initialValues.amendment_amount || '',
      amendment_unit: initialValues.amendment_unit || 'kg',
      amendment_type: initialValues.amendment_type || '',
      observation: initialValues.observation || '',
      custom_fields: initialValues.custom_fields || []
    }
  });

  // Custom fields state for Phase 2.3
  const [customFields, setCustomFields] = useState(initialValues.custom_fields || []);

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

  // ENHANCED: Amendment fields for IPCC 2006 lime dissolution calculations (PA events)
  const watchedAmendmentAmount = watch('amendment_amount'); // Required for lime CO2 calculation
  const watchedAmendmentUnit = watch('amendment_unit'); // Unit conversion for lime amount
  const watchedAmendmentType = watch('amendment_type'); // Determines emission factor (limestone vs dolomite)

  // Watch non-calculation fields to ensure they get sent to backend (but don't trigger carbon API)
  // Sprint 2 Epic 2.1.3: Removed watchedTransportationDistance
  const watchedObservation = watch('observation'); // For backend description field
  const watchedDepth = watch('depth'); // For preview display
  const watchedDepthUnit = watch('depth_unit'); // For preview display
  const watchedEquipmentUsed = watch('equipment_used'); // For preview display

  // Note: observation, depth, depth_unit, and equipment_used are watched to ensure form data updates
  // but are NOT included in the carbon calculation useEffect dependencies

  // Sync custom fields with form
  useEffect(() => {
    methods.setValue('custom_fields', customFields);
  }, [customFields, methods]);

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
    // ENHANCED: Amendment fields for IPCC 2006 lime dissolution calculations
    watchedAmendmentAmount, // Required for lime CO2 calculation
    watchedAmendmentUnit, // Unit conversion
    watchedAmendmentType, // Determines emission factor
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
    // Sprint 2 Epic 2.1.3: Removed watchedTransportationDistance
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
    // ENHANCED: For TI (Tillage) events, map depth → tillage_depth for backend carbon calculation
    const { tillage_type, tillage_intensity, tillage_direction, residue_management, depth, depth_unit, ...coreData } =
      data;

    // For Tillage events, rename depth to tillage_depth for backend compatibility
    const tillageDepthData = data.type === 'TI' ? {
      tillage_depth: depth || '',
      tillage_depth_unit: depth_unit || 'cm'
    } : {
      depth: depth || '',
      depth_unit: depth_unit || 'cm'
    };

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
      // ENHANCED: Include depth data with proper field naming for backend
      ...tillageDepthData,
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

    // ENHANCED: Log amendment and tillage fields for carbon calculation debugging
    console.log('[SoilManagementTab] Carbon calculation fields:', {
      type: data.type,
      // Amendment fields (PA events - IPCC 2006 lime dissolution)
      amendment_amount: processedData.amendment_amount,
      amendment_unit: processedData.amendment_unit,
      amendment_type: processedData.amendment_type,
      // Tillage depth fields (TI events - soil CO2 flux)
      tillage_depth: processedData.tillage_depth,
      tillage_depth_unit: processedData.tillage_depth_unit,
      depth: processedData.depth,
      depth_unit: processedData.depth_unit
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
          <StandardAlert status="info" title="Soil Management & Transparency Documentation">
            <Text fontSize="sm">
              All fields marked with * are required for accurate carbon footprint calculations and
              transparency documentation. Soil management practices help build consumer trust
              through documented sustainable farming methods.
            </Text>
          </StandardAlert>

          {/* Sprint 3 Epic 3.1: Consolidated Section 1 - Soil Management Details (merged Info + Area) */}
          <SectionBox variant="highlighted" mt={4}>
            <SectionHeader
              icon={FaSeedling}
              iconColor="green.600"
              title="Soil Management Details"
              badge="Carbon Calculation Required"
              badgeColorScheme="green"
            />

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <StandardField
                label={`${
                  intl.formatMessage({ id: 'app.soilManagementType' }) || 'Soil Management Type'
                }`}
                required
                error={errors.type?.message}
              >
                <StandardSelect placeholder="Select soil management type" {...register('type')}>
                  <option value="ST">Soil Testing</option>
                  <option value="PA">Soil Amendment</option>
                  <option value="TI">Tillage</option>
                </StandardSelect>
              </StandardField>

              <StandardField
                label="Event Name"
                helpText="Descriptive name for this soil management operation"
              >
                <StandardInput
                  type="text"
                  placeholder="e.g., Spring Tillage - North Field"
                  {...register('name')}
                />
              </StandardField>

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
          </SectionBox>

          {/* Sprint 3 Epic 3.1: Consolidated Section 2 - Fuel & Equipment Operations (merged Fuel + Environmental) */}
          <SectionBox variant="highlighted">
            <SectionHeader
              icon={FaSeedling}
              iconColor="green.600"
              title="Fuel & Equipment Operations"
              badge="Enhanced Carbon Accuracy"
              badgeColorScheme="green"
              description="Document your equipment usage, fuel consumption, and operational details to build consumer trust through transparent farming practices."
            />

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {/* Phase 3: Fuel Type Selector */}
              <StandardField
                label="Fuel Type"
                helpText="Select fuel type for accurate EPA emission factor calculation"
              >
                <StandardSelect placeholder="Select fuel type..." {...register('fuel_type')}>
                  {FUEL_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} ({type.factor})
                    </option>
                  ))}
                </StandardSelect>
              </StandardField>

              <StandardField
                label={watch('fuel_type') === 'electric' ? 'Energy Amount (kWh)' : 'Fuel Consumed'}
                helpText={watch('fuel_type') === 'electric' ? 'Energy consumption for carbon emission calculation' : 'Total fuel used for soil management equipment'}
              >
                <HStack spacing={2}>
                  <StandardInput
                    flex={2}
                    type="number"
                    step="0.1"
                    placeholder={watch('fuel_type') === 'electric' ? 'e.g., 15 kWh' : '15.5'}
                    {...register('fuel_consumed')}
                  />
                  <StandardSelect flex={1} {...register('fuel_unit')}>
                    <option value="L">Liters</option>
                    <option value="gal">Gallons</option>
                    <option value="kg">Kilograms</option>
                    <option value="kWh">Kilowatt-hours</option>
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
                helpText="Equipment efficiency rating for carbon scoring"
              >
                <StandardSelect {...register('production_efficiency')}>
                  <option value="">Select efficiency level</option>
                  <option value="high">High Efficiency</option>
                  <option value="normal">Normal Efficiency</option>
                  <option value="low">Low Efficiency</option>
                </StandardSelect>
              </StandardField>

              <StandardField label="Equipment Used" helpText="Equipment used for this operation">
                <StandardInput
                  type="text"
                  placeholder="e.g., tractor with disc harrow, soil auger"
                  {...register('equipment_used')}
                />
              </StandardField>
            </SimpleGrid>

            {/* Phase 3: Electric Equipment Info Box */}
            {watch('fuel_type') === 'electric' && (
              <Box p={3} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200" mt={4}>
                <Text fontSize="sm" color="blue.700">
                  <Icon as={FaBolt} mr={2} color="blue.600" />
                  <Text as="span" fontWeight="semibold">Electric Equipment:</Text> Enter energy consumption in kilowatt-hours (kWh). Grid electricity uses 0.39 kg CO₂/kWh. Solar/wind powered equipment has zero emissions.
                </Text>
              </Box>
            )}

            <Box
              bg="blue.50"
              p={3}
              borderRadius="md"
              borderLeft="4px"
              borderLeftColor="blue.400"
              mt={4}
            >
              <HStack spacing={2} mb={1}>
                <Icon as={FaSeedling} color="blue.500" fontSize="sm" />
                <Text fontSize="sm" fontWeight="semibold" color="blue.700">
                  Building Consumer Trust
                </Text>
              </HStack>
              <Text fontSize="xs" color="blue.600">
                Documenting actual fuel consumption and equipment usage provides consumers with
                complete transparency into your farming operations.
              </Text>
            </Box>
          </SectionBox>

          {/* ENHANCED: Soil Amendment (PA) specific fields for IPCC 2006 lime dissolution */}
          {watch('type') === 'PA' && (
            <SectionBox variant="highlighted" borderColor="green.200">
              <SectionHeader
                icon={FaSeedling}
                iconColor="green.600"
                title="Soil Amendment Details"
                badge="IPCC 2006 Carbon Calculation"
                badgeColorScheme="green"
                description="Document lime or soil amendment application for accurate carbon emissions calculation using IPCC 2006 methodology."
              />

              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <StandardField
                  label="Amendment Type"
                  helpText="Type of soil amendment applied"
                >
                  <StandardSelect
                    placeholder="Select amendment type"
                    {...register('amendment_type')}
                  >
                    <option value="limestone">Limestone (CaCO3) - 0.44 kg CO2/kg</option>
                    <option value="dolomite">Dolomite (CaMg(CO3)2) - 0.477 kg CO2/kg</option>
                    <option value="calcium_oxide">Quick Lime (CaO) - High reactivity</option>
                    <option value="calcium_hydroxide">Hydrated Lime (Ca(OH)2)</option>
                    <option value="gypsum">Gypsum (CaSO4) - No CO2 emissions</option>
                    <option value="compost">Compost - Organic amendment</option>
                    <option value="manure">Manure - Organic fertilizer</option>
                    <option value="other">Other Amendment</option>
                  </StandardSelect>
                </StandardField>

                <StandardField
                  label="Amendment Amount"
                  helpText="Total quantity of amendment applied"
                >
                  <HStack spacing={2}>
                    <StandardInput
                      flex={2}
                      type="number"
                      step="0.1"
                      placeholder="500"
                      {...register('amendment_amount')}
                    />
                    <StandardSelect flex={1} {...register('amendment_unit')}>
                      <option value="kg">kg</option>
                      <option value="tons">Metric Tons</option>
                      <option value="lbs">Pounds</option>
                      <option value="short_tons">Short Tons (US)</option>
                    </StandardSelect>
                  </HStack>
                </StandardField>

                <StandardField
                  label="Application Depth"
                  helpText="Depth of amendment incorporation"
                >
                  <HStack spacing={2}>
                    <StandardInput
                      flex={2}
                      type="number"
                      step="1"
                      placeholder="15"
                      {...register('depth')}
                    />
                    <StandardSelect flex={1} {...register('depth_unit')}>
                      <option value="cm">cm</option>
                      <option value="inches">inches</option>
                    </StandardSelect>
                  </HStack>
                </StandardField>
              </SimpleGrid>

              <Box
                bg="green.50"
                p={3}
                borderRadius="md"
                borderLeft="4px"
                borderLeftColor="green.400"
                mt={4}
              >
                <HStack spacing={2} mb={1}>
                  <Icon as={FaSeedling} color="green.500" fontSize="sm" />
                  <Text fontSize="sm" fontWeight="semibold" color="green.700">
                    IPCC 2006 Lime Dissolution Methodology
                  </Text>
                </HStack>
                <Text fontSize="xs" color="green.600">
                  Carbon emissions from lime application are calculated using IPCC 2006 guidelines.
                  Limestone (CaCO₃) releases 0.44 kg CO₂ per kg applied, while dolomite releases
                  0.477 kg CO₂ per kg. Gypsum and organic amendments do not directly release CO₂.
                </Text>
              </Box>
            </SectionBox>
          )}

          {(watch('type') === 'ST' || watch('type') === 'PA') && (
            <SectionBox variant="default">
              <SectionHeader
                icon={FaThermometerHalf}
                iconColor="orange.600"
                title="Soil Properties"
                badge="Improves Carbon Accuracy"
                badgeColorScheme="orange"
              />

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
                  label={
                    intl.formatMessage({ id: 'app.organicMatterPercentage' }) ||
                    'Organic Matter (%)'
                  }
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
            </SectionBox>
          )}

          {/* Tillage-Specific Fields - Only for Tillage Operations */}
          {watch('type') === 'TI' && (
            <SectionBox variant="highlighted" borderColor="orange.200">
              <SectionHeader
                icon={FaSeedling}
                iconColor="orange.600"
                title="Tillage Operation Details"
                badge="Carbon Impact Calculation"
                badgeColorScheme="orange"
                description="Provide specific tillage details for accurate carbon impact assessment. Tillage practices significantly affect soil carbon sequestration and emissions."
              />

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
                  helpText="Intensity affects carbon emissions"
                >
                  <StandardSelect placeholder="Select intensity" {...register('tillage_intensity')}>
                    <option value="high">High - Heavy disturbance</option>
                    <option value="medium">Medium - Moderate disturbance</option>
                    <option value="low">Low - Minimal disturbance</option>
                    <option value="conservation">Conservation - Protective tillage</option>
                  </StandardSelect>
                </StandardField>

                <StandardField
                  label="Tillage Direction"
                  helpText="Direction affects soil erosion and carbon retention"
                >
                  <StandardSelect placeholder="Select direction" {...register('tillage_direction')}>
                    <option value="across_slope">🏔️ Across Slope - Erosion control</option>
                    <option value="up_down_slope">⬇️ Up/Down Slope - Standard</option>
                    <option value="contour">🌀 Contour - Following natural lines</option>
                    <option value="random">🔀 Random - Variable direction</option>
                  </StandardSelect>
                </StandardField>

                <StandardField
                  label="Residue Management"
                  helpText="Crop residue handling affects carbon sequestration"
                >
                  <StandardSelect
                    placeholder="Select residue management"
                    {...register('residue_management')}
                  >
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
                mt={4}
              >
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
            </SectionBox>
          )}

          {/* Sprint 3 Epic 3.1: Removed "Environmental Conditions & Equipment" section - merged into "Fuel & Equipment Operations" above */}

          <SectionBox variant="default">
            <SectionHeader
              icon={FaSeedling}
              iconColor="green.500"
              title="Farmer's Field Notes & Consumer Transparency"
              badge="Consumer Transparency"
              badgeColorScheme="green"
            />
            <StandardField
              label="Observations & Notes"
              helpText="Share details about your soil management approach that help consumers understand your sustainable farming practices"
            >
              <StandardTextarea
                placeholder="Optional: Describe your soil management approach, goals for soil health, organic practices used, sustainability goals, etc. These details help consumers understand your farming methods."
                rows={4}
                {...register('observation')}
              />
            </StandardField>
          </SectionBox>

          {/* Phase 2.3: Custom Fields Section */}
          <CustomFieldsForm
            customFields={customFields}
            onCustomFieldsChange={setCustomFields}
            eventTypeId={5}
            disabled={false}
          />

          {!hideActions && (
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
          )}
        </Flex>
      </form>
    </FormProvider>
  );
};

export default SoilManagementTab;
