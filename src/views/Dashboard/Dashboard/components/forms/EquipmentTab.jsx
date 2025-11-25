// EQUIPMENT TAB - ENHANCED FOLLOWING TRAZO STANDARDIZED PATTERN
// Transparency-first approach with accurate carbon calculations for equipment operations

import React, { useEffect, useRef } from 'react';
import {
  HStack,
  Box,
  VStack,
  Text,
  Icon,
  Badge,
  SimpleGrid,
  Flex,
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
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea,
  StandardAlert,
  StandardCard
} from 'components/Design/StandardComponents';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string } from 'zod';
import { FaChevronLeft, FaChevronRight, FaTractor, FaCalculator, FaSeedling, FaTools, FaLeaf } from 'react-icons/fa';
import { useIntl } from 'react-intl';

// ENHANCED SCHEMA - Following Trazo standardized patterns
const equipmentSchema = object({
  type: string().min(1, 'Equipment operation type is required'),
  name: string().min(1, 'Event name is required'),
  equipment_type: string().min(1, 'Equipment type is required for carbon calculation'),
  fuel_consumed: string().min(1, 'Fuel amount is required for emissions calculation').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Fuel consumed cannot be negative'),
  fuel_unit: string().min(1, 'Fuel unit is required'),
  fuel_type: string().min(1, 'Fuel type affects emission factors'),
  hours_operated: string().min(1, 'Operating hours affect efficiency calculation').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Hours operated cannot be negative'),
  area_worked: string().optional().refine((val) => {
    if (!val || val === '') return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Area worked cannot be negative'),
  area_unit: string().optional(),
  operation_efficiency: string().optional(),
  observation: string().optional()
});

// Equipment operation types for transparency tracking - MUST match backend EquipmentEvent model choices
const EQUIPMENT_OPERATION_TYPES = [
  { value: 'FC', label: 'Fuel Consumption' },
  { value: 'MN', label: 'Maintenance' },
  { value: 'RE', label: 'Repair' },
  { value: 'CA', label: 'Calibration' },
  { value: 'BD', label: 'Breakdown' },
  { value: 'EI', label: 'Inspection' }
];

// Equipment types for carbon calculation
const EQUIPMENT_TYPES = [
  { value: 'tractor', label: '🚜 Tractor' },
  { value: 'harvester', label: '🌾 Harvester/Combine' },
  { value: 'sprayer', label: '💨 Sprayer' },
  { value: 'truck', label: '🚛 Truck/Transport' },
  { value: 'generator', label: '⚡ Generator' },
  { value: 'pump', label: '💧 Irrigation Pump' },
  { value: 'other', label: '🔧 Other Equipment' }
];

// Fuel types with backend emission factors (EPA-verified)
const FUEL_TYPES = [
  { value: 'diesel', label: '⛽ Diesel', factor: '2.68 kg CO₂e/L' },
  { value: 'gasoline', label: '⛽ Gasoline', factor: '2.31 kg CO₂e/L' },
  { value: 'natural_gas', label: '💨 Natural Gas', factor: '2.03 kg CO₂e/m³' },
  { value: 'lpg', label: '🔥 LPG', factor: '1.70 kg CO₂e/L' }
];

const EquipmentTab = ({ onSubmitHandler, onDataChange, onPrev, initialValues = {}, hideActions = false }) => {
  const intl = useIntl();

  const methods = useForm({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      type: initialValues.type || 'FC', // Default to Fuel Consumption for carbon tracking
      name: initialValues.name || '',
      equipment_type: initialValues.equipment_type || '', // ✅ No default - user must select
      fuel_consumed: initialValues.fuel_consumed?.toString() || '',
      fuel_unit: initialValues.fuel_unit || 'L',
      fuel_type: initialValues.fuel_type || '', // ✅ No default - user must select
      hours_operated: initialValues.hours_operated?.toString() || '',
      area_worked: initialValues.area_worked?.toString() || '',
      area_unit: initialValues.area_unit || 'ha',
      operation_efficiency: initialValues.operation_efficiency || 'normal',
      observation: initialValues.observation || ''
    }
  });

  // Update form values when initialValues change
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      methods.reset({
        type: initialValues.type || 'FC',
        name: initialValues.name || '',
        equipment_type: initialValues.equipment_type || '', // ✅ No default - user must select
        fuel_consumed: initialValues.fuel_consumed?.toString() || '',
        fuel_unit: initialValues.fuel_unit || 'L',
        fuel_type: initialValues.fuel_type || '', // ✅ No default - user must select
        hours_operated: initialValues.hours_operated?.toString() || '',
        area_worked: initialValues.area_worked?.toString() || '',
        area_unit: initialValues.area_unit || 'ha',
        operation_efficiency: initialValues.operation_efficiency || 'normal',
        observation: initialValues.observation || ''
      });
    }
  }, [initialValues, methods]);

  const { watch, handleSubmit, formState: { errors } } = methods;
  const equipmentType = watch('type');

  // Real-time preview updates - focused on transparency and carbon data
  const watchedFields = watch(['type', 'name', 'equipment_type', 'fuel_consumed', 'fuel_type', 'hours_operated', 'area_worked', 'observation']);
  const previousValuesRef = useRef({});

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onDataChange && typeof onDataChange === 'function') {
        const currentValues = methods.getValues();
        
        // Trigger for basic equipment info OR meaningful carbon-relevant data
        const hasBasicEquipmentInfo = currentValues.type && currentValues.name && currentValues.equipment_type;
        const hasCarbonData = currentValues.equipment_type && 
                             currentValues.fuel_consumed && 
                             parseFloat(currentValues.fuel_consumed) > 0 &&
                             currentValues.fuel_type;
        
        if (hasBasicEquipmentInfo || hasCarbonData) {
          const relevantFields = ['type', 'name', 'equipment_type', 'fuel_consumed', 'fuel_type', 'hours_operated', 'area_worked', 'operation_efficiency', 'observation'];
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
              console.error('[EquipmentTab]: Error calling onDataChange:', error);
            }
          }
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedFields]); // FIXED: Removed onDataChange to prevent infinite loop

  const onSubmit = (data) => {
    // Convert string numbers to numbers for backend carbon calculations
    const processedData = {
      ...data,
      fuel_consumed: parseFloat(data.fuel_consumed) || 0,
      hours_operated: parseFloat(data.hours_operated) || 0,
      area_worked: data.area_worked ? parseFloat(data.area_worked) : undefined
    };
    onSubmitHandler(processedData);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
        <VStack spacing={6} align="stretch">
          
          {/* Transparency Focus Alert */}
          <StandardAlert status="info" title="Equipment Operations & Carbon Transparency">
            <HStack spacing={2} mb={2}>
              <Icon as={FaTools} color="blue.500" />
              <Text fontSize="sm" fontWeight="bold">
                Equipment Carbon & Transparency Documentation
              </Text>
            </HStack>
            <Text fontSize="sm">
              Document equipment operations with accurate fuel consumption and carbon impact calculations. 
              This information builds consumer trust through transparent farming practices and equipment efficiency.
            </Text>
          </StandardAlert>

          {/* Section 1: Equipment Information */}
          <StandardCard
            title={
              <HStack>
                <Icon as={FaTractor} color="orange.500" />
                <Text>Equipment Information</Text>
                <Badge colorScheme="orange" size="sm">Equipment Tracking</Badge>
              </HStack>
            }
          >
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <StandardField
                  label="Operation Type"
                  required
                  error={errors.type?.message}
                  helpText="What type of equipment operation?"
                >
                  <Controller
                    name="type"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardSelect
                        {...field}
                        placeholder="Select operation type..."
                      >
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
                  label="Operation Name"
                  required
                  error={errors.name?.message}
                  helpText="Brief descriptive name for this operation"
                >
                  <Controller
                    name="name"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardInput
                        {...field}
                        placeholder="e.g., Field plowing with tractor"
                      />
                    )}
                  />
                </StandardField>
              </SimpleGrid>

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
                    <StandardSelect
                      {...field}
                      placeholder="Select equipment type..."
                    >
                      {EQUIPMENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </StandardSelect>
                  )}
                />
              </StandardField>
            </VStack>
          </StandardCard>

          {/* Section 2: Fuel & Operation Data */}
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
              Document your actual equipment usage and fuel consumption to build consumer trust through transparent farming practices. 
              These details help consumers understand the real operational impact of your equipment operations.
            </Text>
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <StandardField
                  label="Fuel Consumed"
                  required
                  error={errors.fuel_consumed?.message}
                  helpText="Amount of fuel used for this operation"
                >
                  <HStack spacing={2}>
                    <Controller
                      name="fuel_consumed"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput
                          {...field}
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          flex="2"
                          bg="white"
                        />
                      )}
                    />
                    <Controller
                      name="fuel_unit"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardSelect {...field} flex="1" bg="white">
                          <option value="L">L</option>
                          <option value="gal">gal</option>
                          <option value="kg">kg</option>
                          <option value="kWh">kWh</option>
                        </StandardSelect>
                      )}
                    />
                  </HStack>
                </StandardField>

                <StandardField
                  label="Fuel Type"
                  required
                  error={errors.fuel_type?.message}
                  helpText="Type of fuel affects emission factors"
                >
                  <Controller
                    name="fuel_type"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardSelect
                        {...field}
                        placeholder="Select fuel type..."
                        bg="white"
                      >
                        {FUEL_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </StandardSelect>
                    )}
                  />
                </StandardField>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <StandardField
                  label="Hours Operated"
                  required
                  error={errors.hours_operated?.message}
                  helpText="Operating time for efficiency calculation"
                >
                  <Controller
                    name="hours_operated"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardInput
                        {...field}
                        type="number"
                        step="0.5"
                        placeholder="0.0"
                        bg="white"
                      />
                    )}
                  />
                </StandardField>

                <StandardField
                  label="Area Worked"
                  error={errors.area_worked?.message}
                  helpText="Area covered (optional)"
                >
                  <HStack spacing={2}>
                    <Controller
                      name="area_worked"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput
                          {...field}
                          type="number"
                          step="0.1"
                          placeholder="Optional"
                          flex="2"
                          bg="white"
                        />
                      )}
                    />
                    <Controller
                      name="area_unit"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardSelect {...field} flex="1" bg="white">
                          <option value="ha">ha</option>
                          <option value="ac">ac</option>
                          <option value="m2">m²</option>
                        </StandardSelect>
                      )}
                    />
                  </HStack>
                </StandardField>

                <StandardField
                  label="Operation Efficiency"
                  error={errors.operation_efficiency?.message}
                  helpText="Equipment condition and performance"
                >
                  <Controller
                    name="operation_efficiency"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardSelect {...field} bg="white">
                        <option value="high">High</option>
                        <option value="normal">Normal</option>
                        <option value="low">Low</option>
                      </StandardSelect>
                    )}
                  />
                </StandardField>
              </SimpleGrid>
            </VStack>
          </Box>

          {/* Section 3: Transparency Notes */}
          <StandardCard
            title={
              <HStack>
                <Icon as={FaSeedling} color="green.500" />
                <Text>Operation Notes & Consumer Transparency</Text>
                <Badge colorScheme="green" size="sm">Consumer Transparency</Badge>
              </HStack>
            }
          >
            <StandardField 
              label="Operation Notes & Observations"
              error={errors.observation?.message}
              helpText="Share details about this equipment operation that help consumers understand your farming practices"
            >
              <Controller
                name="observation"
                control={methods.control}
                render={({ field }) => (
                  <StandardTextarea
                    {...field}
                    placeholder="Optional: Describe the purpose of this operation, equipment condition, fuel efficiency measures taken, or any interesting observations that consumers might find valuable."
                    rows={4}
                  />
                )}
              />
            </StandardField>
          </StandardCard>

          {/* Navigation Buttons */}
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
        </VStack>
      </form>
    </FormProvider>
  );
};

export default EquipmentTab;