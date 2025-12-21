// ENHANCED PRODUCTION TAB - CARBON CALCULATION OPTIMIZED
// Focuses on production data critical for carbon footprint calculations
// Sprint 2 Epic 2.1: Equipment Maintenance merged as subtype (EQ)

import {
  HStack,
  Box,
  VStack,
  Text,
  Icon,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useColorModeValue,
  SimpleGrid
} from '@chakra-ui/react';
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
import {
  FaChevronLeft,
  FaChevronRight,
  FaSeedling,
  FaBalanceScale,
  FaTruck,
  FaTools,
  FaBolt
} from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import React, { useEffect, useRef, useState } from 'react';
import { object, string, array } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';
import CustomFieldsForm from './CustomFieldsForm';

// Sprint 2 Epic 2.1: Equipment operation types (merged from EquipmentTab)
const EQUIPMENT_OPERATION_TYPES = [
  { value: 'FC', label: '⛽ Fuel Consumption - Regular operation' },
  { value: 'MN', label: '🔧 Maintenance - Routine maintenance' },
  { value: 'RE', label: '🔩 Repair - Equipment repair' },
  { value: 'CA', label: '📐 Calibration - Equipment calibration' },
  { value: 'BD', label: '⚠️ Breakdown - Equipment failure' },
  { value: 'EI', label: '🔍 Inspection - Equipment inspection' }
];

// Sprint 2 Epic 2.1: Equipment types (merged from EquipmentTab)
const EQUIPMENT_TYPES = [
  { value: 'tractor', label: '🚜 Tractor' },
  { value: 'harvester', label: '🌾 Harvester/Combine' },
  { value: 'sprayer', label: '💨 Sprayer' },
  { value: 'truck', label: '🚛 Truck/Transport' },
  { value: 'generator', label: '⚡ Generator' },
  { value: 'pump', label: '💧 Irrigation Pump' },
  { value: 'other', label: '🔧 Other Equipment' }
];

// Sprint 2 Epic 2.1: Fuel types with EPA-verified emission factors (merged from EquipmentTab)
// UPDATED 2025-12-14: Electric factor corrected to EPA eGRID 2023 value (0.39 kg CO₂e/kWh)
const FUEL_TYPES = [
  { value: 'diesel', label: '⛽ Diesel', factor: '2.68 kg CO₂e/L' },
  { value: 'gasoline', label: '⛽ Gasoline', factor: '2.31 kg CO₂e/L' },
  { value: 'natural_gas', label: '💨 Natural Gas', factor: '2.03 kg CO₂e/m³' },
  { value: 'lpg', label: '🔥 LPG', factor: '1.70 kg CO₂e/L' },
  { value: 'electric', label: '⚡ Electric', factor: '0.39 kg CO₂e/kWh' }
];

// Sprint 2: Production type display names for auto-generated event names
// Removes farmer burden of manually typing event names (~20 sec saved per event)
// CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model
const PRODUCTION_TYPE_NAMES = {
  PL: 'Planting',
  HA: 'Harvesting',
  IR: 'Irrigation',
  PR: 'Pruning/Trimming',
  TR: 'Transplanting',
  CU: 'Cultivation',
  TH: 'Thinning',
  EM: 'Equipment Maintenance' // ✅ FIXED: Was EQ, now EM (Production subtype)
};

// ENHANCED SCHEMA - Carbon calculation focused with Phase 1.3 validation
// Sprint 2 Epic 2.1: Added equipment fields, made area_covered optional for EM type
// Sprint 2: Event name is now auto-generated from production type (removes farmer burden)
// CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model
const formSchemaMainInfo = object({
  type: string().min(1, 'Production type is required'),
  name: string().optional(), // Auto-generated from production type - no manual input needed
  // Sprint 2 Epic 2.1: Area is optional for Equipment Maintenance (EM) type
  area_covered: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Area covered cannot be negative'),
  area_unit: string().optional(),
  yield_quantity: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Yield quantity cannot be negative'),
  yield_unit: string().optional(),
  fuel_consumed: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Fuel consumed cannot be negative'),
  fuel_unit: string().optional(),
  // Sprint 2 Epic 2.1: Fuel type for EPA-verified emission factors (merged from Equipment)
  fuel_type: string().optional(),
  equipment_hours: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Equipment hours cannot be negative'),
  // Sprint 2 Epic 2.1: Equipment-specific fields (merged from EquipmentTab)
  equipment_type: string().optional(),
  equipment_operation_type: string().optional(),
  operation_efficiency: string().optional(),
  transportation_distance: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Transportation distance cannot be negative'),
  transportation_unit: string().optional(),
  production_efficiency: string().optional(),
  observation: string().optional(),
  // Sprint 3 Epic 3.2: Consumer Trust Fields for transparency
  seeds_source: string().optional(), // Where seeds/seedlings came from
  water_source: string().optional(), // Water source for irrigation
  // ENHANCED: USDA NASS 2023 irrigation water estimation fields
  irrigation_method: string().optional(), // drip, sprinkler, flood, etc.
  irrigation_depth: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Irrigation depth cannot be negative'),
  irrigation_depth_unit: string().optional(), // inches, cm
  // Phase 2.3: Custom fields for additional farmer-created information
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

const ProductionTab = ({
  onSubmitHandler,
  onDataChange,
  onPrev,
  initialValues = {},
  hideActions = false
}) => {
  const intl = useIntl();
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const [customFields, setCustomFields] = useState(initialValues.custom_fields || []);

  const methods = useForm({
    resolver: zodResolver(formSchemaMainInfo),
    defaultValues: {
      type: initialValues.type || 'PL',
      // Sprint 2: Auto-generate name from type - fallback to initial name if provided
      name: initialValues.name || PRODUCTION_TYPE_NAMES[initialValues.type || 'PL'] || '',
      area_covered: initialValues.area_covered?.toString() || '',
      area_unit: initialValues.area_unit || 'ha',
      yield_quantity: initialValues.yield_quantity?.toString() || '',
      yield_unit: initialValues.yield_unit || 'kg',
      fuel_consumed: initialValues.fuel_consumed?.toString() || '',
      fuel_unit: initialValues.fuel_unit || 'L',
      // Sprint 2 Epic 2.1: Fuel type for Equipment Maintenance
      fuel_type: initialValues.fuel_type || '',
      equipment_hours: initialValues.equipment_hours?.toString() || '',
      // Sprint 2 Epic 2.1: Equipment-specific fields (merged from EquipmentTab)
      equipment_type: initialValues.equipment_type || '',
      equipment_operation_type: initialValues.equipment_operation_type || 'FC',
      operation_efficiency: initialValues.operation_efficiency || 'normal',
      transportation_distance: initialValues.transportation_distance?.toString() || '',
      transportation_unit: initialValues.transportation_unit || 'km',
      production_efficiency: initialValues.production_efficiency || 'normal',
      observation: initialValues.observation || '',
      // Sprint 3 Epic 3.2: Consumer Trust Fields
      seeds_source: initialValues.seeds_source || '',
      water_source: initialValues.water_source || '',
      // ENHANCED: USDA NASS 2023 irrigation water estimation fields
      irrigation_method: initialValues.irrigation_method || '',
      irrigation_depth: initialValues.irrigation_depth?.toString() || '',
      irrigation_depth_unit: initialValues.irrigation_depth_unit || 'inches',
      // Phase 2.3: Custom fields initialization
      custom_fields: initialValues.custom_fields || []
    }
  });

  // Update form values when initialValues change
  useEffect(() => {
    // Better condition check: ensure we have actual form data, not just an empty object
    if (
      initialValues &&
      (Object.keys(initialValues).length > 2 || initialValues.name || initialValues.area_covered)
    ) {
      const resetData = {
        type: initialValues.type || 'PL',
        // Sprint 2: Auto-generate name from type - fallback to initial name if provided
        name: initialValues.name || PRODUCTION_TYPE_NAMES[initialValues.type || 'PL'] || '',
        area_covered: initialValues.area_covered?.toString() || '',
        area_unit: initialValues.area_unit || 'ha',
        yield_quantity: initialValues.yield_quantity?.toString() || '',
        yield_unit: initialValues.yield_unit || 'kg',
        fuel_consumed: initialValues.fuel_consumed?.toString() || '',
        fuel_unit: initialValues.fuel_unit || 'L',
        // Sprint 2 Epic 2.1: Fuel type for Equipment Maintenance
        fuel_type: initialValues.fuel_type || '',
        equipment_hours: initialValues.equipment_hours?.toString() || '',
        // Sprint 2 Epic 2.1: Equipment-specific fields (merged from EquipmentTab)
        equipment_type: initialValues.equipment_type || '',
        equipment_operation_type: initialValues.equipment_operation_type || 'FC',
        operation_efficiency: initialValues.operation_efficiency || 'normal',
        transportation_distance: initialValues.transportation_distance?.toString() || '',
        transportation_unit: initialValues.transportation_unit || 'km',
        production_efficiency: initialValues.production_efficiency || 'normal',
        observation: initialValues.observation || '',
        // Sprint 3 Epic 3.2: Consumer Trust Fields
        seeds_source: initialValues.seeds_source || '',
        water_source: initialValues.water_source || '',
        // ENHANCED: USDA NASS 2023 irrigation water estimation fields
        irrigation_method: initialValues.irrigation_method || '',
        irrigation_depth: initialValues.irrigation_depth?.toString() || '',
        irrigation_depth_unit: initialValues.irrigation_depth_unit || 'inches',
        // Phase 2.3: Custom fields reset
        custom_fields: initialValues.custom_fields || []
      };

      console.log('🔧 ProductionTab: Resetting form with data:', resetData);
      methods.reset(resetData);
    }
  }, [initialValues, methods.reset]); // Use methods.reset instead of entire methods object

  const {
    handleSubmit,
    watch,
    formState: { errors }
  } = methods;

  const productionType = watch('type');

  // Sprint 2: Auto-generate event name from production type (removes farmer burden ~20 sec per event)
  useEffect(() => {
    if (productionType && PRODUCTION_TYPE_NAMES[productionType]) {
      const autoGeneratedName = PRODUCTION_TYPE_NAMES[productionType];
      methods.setValue('name', autoGeneratedName, { shouldDirty: false });
    }
  }, [productionType, methods]);

  // ELECTRIC EQUIPMENT FIX (2025-12-14): Auto-switch fuel unit based on fuel type
  // - Electric → kWh (only valid unit for electricity)
  // - Diesel/Gasoline/etc → L (default for liquid fuels)
  const fuelType = watch('fuel_type');
  useEffect(() => {
    if (fuelType === 'electric') {
      methods.setValue('fuel_unit', 'kWh', { shouldDirty: false });
    } else if (fuelType && fuelType !== 'electric') {
      // Only reset to L if switching FROM electric TO another fuel type
      const currentUnit = methods.getValues('fuel_unit');
      if (currentUnit === 'kWh') {
        methods.setValue('fuel_unit', 'L', { shouldDirty: false });
      }
    }
  }, [fuelType, methods]);

  // Phase 2.3: Sync custom fields with form state
  useEffect(() => {
    methods.setValue('custom_fields', customFields);
  }, [customFields, methods]);

  // Production events carbon calculation - LIMITED SCOPE to avoid double-counting
  //
  // CRITICAL ISSUE IDENTIFIED: Production events were double-counting emissions
  // that should be tracked in specialized event types:
  // - Fertilization → Use Chemical Events
  // - Soil Cultivation → Use Soil Management Events
  // - Weed Management → Use Pest Management Events
  // - Equipment fuel → Use Equipment Events
  //
  // SOLUTION: Focus Production events only on production-specific activities:
  // - Yield documentation (no direct emissions)
  // - Harvest transportation (separate from field equipment)
  // - Post-harvest processing (if applicable)

  // Sprint 2 Epic 2.1: Added equipment-specific fields to watched fields
  // FIXED: Added unit fields (area_unit, yield_unit, fuel_unit, transportation_unit) so unit changes trigger onDataChange
  const watchedFields = watch([
    'type',
    'name',
    'area_covered',
    'area_unit',
    'yield_quantity',
    'yield_unit',
    'transportation_distance',
    'transportation_unit',
    'fuel_consumed',
    'fuel_unit',
    'fuel_type',
    'equipment_type',
    'equipment_operation_type',
    'operation_efficiency',
    'equipment_hours',
    'observation',
    // Sprint 3 Epic 3.2: Consumer Trust Fields for preview
    'seeds_source'
  ]);
  const previousValuesRef = useRef({});
  const isInitialMountRef = useRef(true);

  // Real-time field watching for carbon calculation updates (following ChemicalTab.jsx pattern)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onDataChange && typeof onDataChange === 'function') {
        const currentValues = methods.getValues();

        const relevantFields = [
          'type',
          'name',
          'area_covered',
          'area_unit',
          'yield_quantity',
          'yield_unit',
          'fuel_consumed',
          'fuel_unit',
          // Sprint 2 Epic 2.1: Added equipment-specific fields
          'fuel_type',
          'equipment_type',
          'equipment_operation_type',
          'operation_efficiency',
          'equipment_hours',
          'transportation_distance',
          'transportation_unit',
          'observation',
          // Phase 2.3: Added custom fields for farmer-created data
          'custom_fields',
          // Sprint 3 Epic 3.2: Consumer Trust Fields for preview
          'seeds_source'
        ];
        const currentRelevantValues = {};
        relevantFields.forEach((field) => {
          currentRelevantValues[field] = currentValues[field];
        });

        const previousValuesStr = JSON.stringify(previousValuesRef.current);
        const currentValuesStr = JSON.stringify(currentRelevantValues);
        const hasChanged = previousValuesStr !== currentValuesStr;

        // Sprint 2 Epic 2.1: Equipment Maintenance (EM) doesn't require area_covered
        // CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model
        const hasMeaningfulData =
          currentValues.type &&
          // For EM type, require equipment_type and fuel_consumed instead of area
          ((currentValues.type === 'EM' &&
            currentValues.equipment_type &&
            currentValues.fuel_consumed) ||
            // For other types, require area_covered
            (currentValues.type !== 'EM' &&
              currentValues.area_covered &&
              parseFloat(currentValues.area_covered) > 0));

        const shouldTrigger = hasMeaningfulData && (hasChanged || isInitialMountRef.current);

        if (shouldTrigger) {
          if (import.meta.env.MODE === 'development') {
            console.log('[ProductionTab]: ✅ Triggering carbon calculation', {
              type: currentValues.type,
              area_covered: currentValues.area_covered,
              area_unit: currentValues.area_unit, // DEBUG: Added to verify unit is passed
              fuel_consumed: currentValues.fuel_consumed,
              transportation_distance: currentValues.transportation_distance
            });
          }
          previousValuesRef.current = currentRelevantValues;
          isInitialMountRef.current = false;
          try {
            onDataChange(currentValues);
          } catch (error) {
            console.error('[ProductionTab]: ❌ Error calling onDataChange:', error);
          }
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedFields]); // FIXED: Removed onDataChange to prevent infinite loop

  const onSubmit = (data) => {
    // Convert string numbers to numbers for backend carbon calculations
    // Sprint 2 Epic 2.1: Handle Equipment Maintenance (EM) type with equipment-specific fields
    // CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model

    // CRITICAL FIX: Extract yield_quantity from custom_fields if main field is empty
    // This handles cases where users add "Yield Quantity" as a custom field instead of using the main form field
    let yieldQuantityValue = data.yield_quantity;
    if (!yieldQuantityValue && data.custom_fields && data.custom_fields.length > 0) {
      const yieldCustomField = data.custom_fields.find(
        (field) => field.label?.toLowerCase() === 'yield quantity' || field.label?.toLowerCase() === 'quantity'
      );
      if (yieldCustomField && yieldCustomField.value) {
        // Extract numeric value from "50 trees" format
        const numericValue = parseFloat(yieldCustomField.value.toString().split(' ')[0]);
        if (!isNaN(numericValue)) {
          yieldQuantityValue = numericValue;
        }
      }
    }

    const processedData = {
      ...data,
      area_covered: data.area_covered ? parseFloat(data.area_covered) : undefined,
      yield_quantity: yieldQuantityValue ? parseFloat(yieldQuantityValue) : undefined,
      fuel_consumed: data.fuel_consumed ? parseFloat(data.fuel_consumed) : undefined,
      equipment_hours: data.equipment_hours ? parseFloat(data.equipment_hours) : undefined,
      transportation_distance: data.transportation_distance
        ? parseFloat(data.transportation_distance)
        : undefined,
      // Sprint 2 Epic 2.1: Include equipment-specific data when type is EM
      // CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model
      ...(data.type === 'EM' && {
        equipment_type: data.equipment_type,
        equipment_operation_type: data.equipment_operation_type,
        fuel_type: data.fuel_type,
        operation_efficiency: data.operation_efficiency
      })
    };
    onSubmitHandler(processedData);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
        <VStack spacing={6} align="stretch">
          {/* Transparency Focus Alert */}
          <StandardAlert status="success" title="Agricultural Production Transparency">
            <HStack spacing={2} mb={2}>
              <Icon as={FaSeedling} color="green.500" />
              <Text fontSize="sm" fontWeight="bold">
                Yield & Transportation Documentation
              </Text>
            </HStack>
            <Text fontSize="sm">
              Document production activities and yields to complete your agricultural transparency
              story. Transportation emissions from harvest to storage are calculated to avoid
              double-counting with field equipment.
            </Text>
          </StandardAlert>

          {/* Basic Production Information */}
          <SectionBox variant="default">
            <SectionHeader
              icon={FaSeedling}
              iconColor="green.500"
              title="Production Activity"
              badge="Carbon Critical"
              badgeColorScheme="green"
            />
            <VStack spacing={4} align="stretch">
              {/* Production Type - Structured for carbon calculations */}
              <StandardField
                label="Production Type"
                required
                error={errors.type?.message}
                helpText="Production type determines carbon calculation method"
              >
                <Controller
                  name="type"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect {...field} placeholder="Select production activity...">
                      <option value="PL">🌱 Planting - Crop establishment</option>
                      <option value="HA">🚜 Harvesting - Crop collection & transport</option>
                      <option value="IR">💧 Irrigation - Water application</option>
                      <option value="PR">✂️ Pruning/Trimming - Plant maintenance</option>
                      <option value="TR">🌿 Transplanting - Plant relocation</option>
                      {/* Sprint 2 Epic 2.2: Added CU and TH production types */}
                      <option value="CU">🌾 Cultivation - Soil cultivation & weed control</option>
                      <option value="TH">✂️ Thinning - Plant spacing optimization</option>
                      {/* Sprint 2 Epic 2.1: Equipment Operations merged from Equipment tab */}
                      {/* CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model */}
                      <option value="EM">
                        🔧 Equipment Maintenance - Equipment usage & maintenance
                      </option>
                    </StandardSelect>
                  )}
                />
              </StandardField>

              {/* Area Covered - Critical for all carbon calculations */}
              <HStack spacing={4} align="stretch">
                <Box flex={2}>
                  <StandardField
                    label="Area Covered"
                    required
                    error={errors.area_covered?.message}
                    helpText="Essential for calculating carbon emissions per hectare"
                  >
                    <Controller
                      name="area_covered"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          min={0}
                          precision={2}
                          step={0.01}
                          value={field.value || ''}
                          onChange={(valueString) => field.onChange(valueString)}
                        >
                          <NumberInputField placeholder="0.00" />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      )}
                    />
                  </StandardField>
                </Box>

                <Box flex={1}>
                  <StandardField label="Unit" required error={errors.area_unit?.message}>
                    <Controller
                      name="area_unit"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardSelect {...field}>
                          <option value="ha">Hectares</option>
                          <option value="acres">Acres</option>
                          <option value="m2">Square Meters</option>
                          <option value="km2">Square Kilometers</option>
                        </StandardSelect>
                      )}
                    />
                  </StandardField>
                </Box>
              </HStack>
            </VStack>
          </SectionBox>

          {/* Sprint 2 Epic 2.1: Equipment Operations Section - Only for EM type */}
          {/* CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model */}
          {productionType === 'EM' && (
            <SectionBox variant="highlighted">
              <SectionHeader
                icon={FaTools}
                iconColor="orange.500"
                title="Equipment Details"
                badge="Equipment Operations"
                badgeColorScheme="orange"
                description="Specify equipment operation type and equipment used for accurate carbon emission calculations."
              />
              <VStack spacing={4} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <StandardField
                    label="Operation Type"
                    required
                    error={errors.equipment_operation_type?.message}
                    helpText="What type of equipment operation?"
                  >
                    <Controller
                      name="equipment_operation_type"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardSelect {...field} placeholder="Select operation type...">
                          {EQUIPMENT_OPERATION_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </StandardSelect>
                      )}
                    />
                  </StandardField>

                  <StandardField
                    label="Equipment Type"
                    required
                    error={errors.equipment_type?.message}
                    helpText="Select the type of equipment used"
                  >
                    <Controller
                      name="equipment_type"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardSelect {...field} placeholder="Select equipment type...">
                          {EQUIPMENT_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </StandardSelect>
                      )}
                    />
                  </StandardField>
                </SimpleGrid>

                <StandardField
                  label="Operation Efficiency"
                  error={errors.operation_efficiency?.message}
                  helpText="Equipment condition and performance rating"
                >
                  <Controller
                    name="operation_efficiency"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardSelect {...field}>
                        <option value="high">
                          High Efficiency (well-maintained, optimal conditions)
                        </option>
                        <option value="normal">Normal Efficiency (standard operation)</option>
                        <option value="low">
                          Low Efficiency (needs maintenance, suboptimal conditions)
                        </option>
                      </StandardSelect>
                    )}
                  />
                </StandardField>
              </VStack>
            </SectionBox>
          )}

          {/* Yield & Output - For carbon efficiency calculation */}
          {(productionType === 'HA' || productionType === 'PL') && (
            <SectionBox variant="default">
              <SectionHeader
                icon={FaBalanceScale}
                iconColor="blue.500"
                title="Yield & Output"
                badge="Efficiency Calculation"
                badgeColorScheme="blue"
              />
              <VStack spacing={4} align="stretch">
                <HStack spacing={4} align="stretch">
                  <Box flex={2}>
                    <StandardField
                      label={productionType === 'HA' ? 'Quantity Harvested' : 'Quantity Planted'}
                      error={errors.yield_quantity?.message}
                      helpText="Used to calculate carbon efficiency per unit of production"
                    >
                      <Controller
                        name="yield_quantity"
                        control={methods.control}
                        render={({ field }) => (
                          <NumberInput
                            min={0}
                            precision={1}
                            step={0.1}
                            value={field.value || ''}
                            onChange={(valueString) => field.onChange(valueString)}
                          >
                            <NumberInputField placeholder="0.0" />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        )}
                      />
                    </StandardField>
                  </Box>

                  <Box flex={1}>
                    <StandardField label="Unit">
                      <Controller
                        name="yield_unit"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardSelect {...field}>
                            <option value="kg">Kilograms</option>
                            <option value="tons">Tonnes</option>
                            <option value="lbs">Pounds</option>
                            <option value="boxes">Boxes</option>
                            <option value="plants">Plants</option>
                            <option value="seeds">Seeds</option>
                          </StandardSelect>
                        )}
                      />
                    </StandardField>
                  </Box>
                </HStack>
              </VStack>
            </SectionBox>
          )}

          {/* Equipment & Fuel Usage */}
          <SectionBox variant="highlighted">
            <SectionHeader
              icon={FaSeedling}
              iconColor="green.600"
              title="Fuel Consumption & Equipment Data"
              badge="Enhanced Carbon Accuracy"
              badgeColorScheme="green"
              description="Document your actual equipment usage and fuel consumption to build consumer trust through transparent farming practices. These details help consumers understand the real operational impact of your production operations."
            />

            <VStack spacing={4} align="stretch">
              {/* Fuel Type - Only for fuel-consuming operations */}
              {/* CRITICAL FIX (2025-01-21): Removed EQ (standalone Equipment type 4), kept EM (Production subtype) */}
              {/* ELECTRIC EQUIPMENT FIX (2025-12-14): Added IR for electric irrigation pumps, PR/TH for powered pruning/thinning */}
              {['PL', 'HA', 'IR', 'PR', 'TR', 'CU', 'TH', 'EM'].includes(productionType) && (
                <StandardField
                  label="Fuel Type"
                  required
                  error={errors.fuel_type?.message}
                  helpText="Select fuel type for accurate EPA emission factor calculation"
                >
                  <Controller
                    name="fuel_type"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardSelect {...field} placeholder="Select fuel type...">
                        {FUEL_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label} ({type.factor})
                          </option>
                        ))}
                      </StandardSelect>
                    )}
                  />
                </StandardField>
              )}

              {/* Fuel Consumption - Only for fuel-consuming operations */}
              {/* CRITICAL FIX (2025-01-21): Removed EQ (standalone Equipment type 4), kept EM (Production subtype) */}
              {/* ELECTRIC EQUIPMENT FIX (2025-12-14): Added IR for electric irrigation pumps, PR/TH for powered pruning/thinning */}
              {['PL', 'HA', 'IR', 'PR', 'TR', 'CU', 'TH', 'EM'].includes(productionType) && (
                <>
                  <HStack spacing={4} align="stretch">
                    <Box flex={2}>
                      <StandardField
                        label={watch('fuel_type') === 'electric' ? 'Energy Amount (kWh)' : 'Fuel Consumed'}
                        error={errors.fuel_consumed?.message}
                        helpText={watch('fuel_type') === 'electric' ? 'Energy consumption for carbon emission calculation' : 'Fuel consumption for carbon emission calculation'}
                      >
                        <Controller
                          name="fuel_consumed"
                          control={methods.control}
                          render={({ field }) => (
                            <NumberInput
                              min={0}
                              precision={1}
                              step={0.1}
                              value={field.value || ''}
                              onChange={(valueString) => field.onChange(valueString)}
                            >
                              <NumberInputField placeholder={watch('fuel_type') === 'electric' ? 'e.g., 50 kWh' : 'Optional'} />
                              <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                              </NumberInputStepper>
                            </NumberInput>
                          )}
                        />
                      </StandardField>
                    </Box>

                    <Box flex={1}>
                      <StandardField label="Unit">
                        <Controller
                          name="fuel_unit"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect {...field}>
                              {/* ELECTRIC EQUIPMENT FIX (2025-12-14): Show only relevant units based on fuel type */}
                              {watch('fuel_type') === 'electric' ? (
                                <option value="kWh">Kilowatt-hours</option>
                              ) : (
                                <>
                                  <option value="L">Liters</option>
                                  <option value="gal">Gallons</option>
                                  <option value="kg">Kilograms</option>
                                </>
                              )}
                            </StandardSelect>
                          )}
                        />
                      </StandardField>
                    </Box>
                  </HStack>

                  {/* Electric Equipment Info Box */}
                  {watch('fuel_type') === 'electric' && (
                    <Box p={3} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
                      <Text fontSize="sm" color="blue.700">
                        <Icon as={FaBolt} mr={2} color="blue.600" />
                        <Text as="span" fontWeight="semibold">Electric Equipment:</Text> Enter energy consumption in kilowatt-hours (kWh). Grid electricity uses 0.39 kg CO₂/kWh. Solar/wind powered equipment has zero emissions.
                      </Text>
                    </Box>
                  )}
                </>
              )}

              {/* Equipment Hours */}
              <StandardField
                label="Equipment Operating Hours"
                error={errors.equipment_hours?.message}
                helpText="Used for calculating fuel efficiency and carbon per hour"
              >
                <Controller
                  name="equipment_hours"
                  control={methods.control}
                  render={({ field }) => (
                    <NumberInput
                      min={0}
                      precision={1}
                      step={0.1}
                      value={field.value || ''}
                      onChange={(valueString) => field.onChange(valueString)}
                    >
                      <NumberInputField placeholder="Optional" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  )}
                />
              </StandardField>
            </VStack>
          </SectionBox>

          {/* Transportation - For logistics emissions */}
          {productionType === 'HA' && (
            <SectionBox variant="default">
              <SectionHeader
                icon={FaTruck}
                iconColor="purple.500"
                title="Transportation"
                badge="Logistics Emissions"
                badgeColorScheme="purple"
              />
              <VStack spacing={4} align="stretch">
                <HStack spacing={4} align="stretch">
                  <Box flex={2}>
                    <StandardField
                      label="Transportation Distance"
                      error={errors.transportation_distance?.message}
                      helpText="Distance for transporting harvest affects carbon footprint"
                    >
                      <Controller
                        name="transportation_distance"
                        control={methods.control}
                        render={({ field }) => (
                          <NumberInput
                            min={0}
                            precision={1}
                            step={0.1}
                            value={field.value || ''}
                            onChange={(valueString) => field.onChange(valueString)}
                          >
                            <NumberInputField placeholder="Optional" />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        )}
                      />
                    </StandardField>
                  </Box>

                  <Box flex={1}>
                    <StandardField label="Unit">
                      <Controller
                        name="transportation_unit"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardSelect {...field}>
                            <option value="km">Kilometers</option>
                            <option value="miles">Miles</option>
                            <option value="m">Meters</option>
                          </StandardSelect>
                        )}
                      />
                    </StandardField>
                  </Box>
                </HStack>

                {/* Production Efficiency Rating */}
                <StandardField
                  label="Production Efficiency"
                  error={errors.production_efficiency?.message}
                  helpText="Rate the efficiency of this production activity for carbon scoring"
                >
                  <Controller
                    name="production_efficiency"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardSelect {...field}>
                        <option value="high">
                          High Efficiency (optimal conditions, planned operations)
                        </option>
                        <option value="normal">Normal Efficiency (standard operation)</option>
                        <option value="low">
                          Low Efficiency (adverse conditions, unplanned operations)
                        </option>
                      </StandardSelect>
                    )}
                  />
                </StandardField>
              </VStack>
            </SectionBox>
          )}

          {/* Sprint 3 Epic 3.2: Consumer Trust & Transparency Fields */}
          {(productionType === 'PL' || productionType === 'TR' || productionType === 'IR') && (
            <SectionBox variant="highlighted">
              <SectionHeader
                icon={FaSeedling}
                iconColor="teal.500"
                title="Consumer Trust & Transparency"
                badge="Builds Consumer Trust"
                badgeColorScheme="teal"
                description="Document your sourcing practices to help consumers understand the origins and quality of your farming inputs."
              />
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {(productionType === 'PL' || productionType === 'TR') && (
                  <StandardField
                    label="Seed/Seedling Source"
                    helpText="Where did your seeds or seedlings come from?"
                  >
                    <Controller
                      name="seeds_source"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardSelect {...field} placeholder="Select seed source...">
                          <option value="certified_organic">🌱 Certified Organic Seeds</option>
                          <option value="farm_saved">♻️ Farm-Saved Seeds</option>
                          <option value="local">🏡 Local Nursery/Supplier</option>
                          <option value="cooperative">🤝 Farmer Cooperative</option>
                          <option value="commercial">🏭 Commercial Supplier</option>
                          <option value="other">📝 Other (specify in notes)</option>
                        </StandardSelect>
                      )}
                    />
                  </StandardField>
                )}

                {productionType === 'IR' && (
                  <>
                    <StandardField
                      label="Water Source"
                      helpText="Primary water source for this irrigation"
                    >
                      <Controller
                        name="water_source"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardSelect {...field} placeholder="Select water source...">
                            <option value="well_groundwater">Well/Groundwater</option>
                            <option value="municipal">Municipal Water Supply</option>
                            <option value="rainwater_harvesting">Rainwater Harvesting</option>
                            <option value="irrigation_canal">Irrigation Canal/District</option>
                            <option value="river_stream">River/Stream</option>
                            <option value="pond_reservoir">Pond/Reservoir</option>
                            <option value="recycled_water">Recycled/Reclaimed Water</option>
                            <option value="other">Other (specify in notes)</option>
                          </StandardSelect>
                        )}
                      />
                    </StandardField>

                    {/* ENHANCED: USDA NASS 2023 irrigation method for water estimation */}
                    <StandardField
                      label="Irrigation Method"
                      helpText="Type of irrigation system used (affects water usage calculation)"
                    >
                      <Controller
                        name="irrigation_method"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardSelect {...field} placeholder="Select irrigation method...">
                            <option value="drip">Drip/Micro-irrigation (most efficient)</option>
                            <option value="sprinkler">Sprinkler System</option>
                            <option value="center_pivot">Center Pivot</option>
                            <option value="flood">Flood/Furrow Irrigation</option>
                            <option value="subsurface">Subsurface Drip</option>
                            <option value="hand_watering">Hand Watering</option>
                            <option value="other">Other Method</option>
                          </StandardSelect>
                        )}
                      />
                    </StandardField>

                    {/* ENHANCED: Irrigation depth for USDA NASS 2023 water volume calculation */}
                    <StandardField
                      label="Irrigation Depth"
                      helpText="Water depth applied (USDA: 27,154 gal/acre per inch)"
                    >
                      <HStack spacing={2}>
                        <Controller
                          name="irrigation_depth"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              flex={2}
                              type="number"
                              step="0.1"
                              placeholder="1.0"
                            />
                          )}
                        />
                        <Controller
                          name="irrigation_depth_unit"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect {...field} flex={1}>
                              <option value="inches">Inches</option>
                              <option value="cm">Centimeters</option>
                            </StandardSelect>
                          )}
                        />
                      </HStack>
                    </StandardField>
                  </>
                )}
              </SimpleGrid>

              <Box
                bg="teal.50"
                p={3}
                borderRadius="md"
                borderLeft="4px"
                borderLeftColor="teal.400"
                mt={4}
              >
                <HStack spacing={2} mb={1}>
                  <Icon as={FaSeedling} color="teal.500" fontSize="sm" />
                  <Text fontSize="sm" fontWeight="semibold" color="teal.700">
                    Why This Matters to Consumers
                  </Text>
                </HStack>
                <Text fontSize="xs" color="teal.600">
                  Consumers increasingly want to know where their food comes from and how it was
                  produced. Documenting your input sources builds trust and demonstrates your
                  commitment to sustainable, transparent farming practices.
                </Text>
              </Box>
            </SectionBox>
          )}

          {/* Observations */}
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
              error={errors.observation?.message}
              helpText="Share details about this production activity that help consumers understand your farming practices"
            >
              <Controller
                name="observation"
                control={methods.control}
                render={({ field }) => (
                  <StandardTextarea
                    {...field}
                    placeholder="Optional: Describe the conditions that affected this production activity, efficiency measures taken, or any observations that consumers might find valuable."
                    rows={4}
                  />
                )}
              />
            </StandardField>
          </SectionBox>

          {/* Phase 2.3: Custom Fields Section */}
          <CustomFieldsForm
            customFields={customFields}
            onCustomFieldsChange={setCustomFields}
            eventTypeId={1}
            disabled={false}
          />

          {/* Navigation */}
          {!hideActions && (
            <Box pt={4} mt={4} borderTop="1px" borderColor={borderColor}>
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
        </VStack>
      </form>
    </FormProvider>
  );
};

export default ProductionTab;
