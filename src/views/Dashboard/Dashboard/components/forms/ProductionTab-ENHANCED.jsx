// ENHANCED PRODUCTION TAB - CARBON CALCULATION OPTIMIZED
// Focuses on production data critical for carbon footprint calculations

import {
  Flex,
  HStack,
  Box,
  VStack,
  Badge,
  Text,
  Icon
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
import { FaChevronLeft, FaChevronRight, FaSeedling, FaTractor, FaScale, FaTruck } from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import React, { useEffect, useRef } from 'react';
import { object, string } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';

// ENHANCED SCHEMA - Carbon calculation focused
const formSchemaMainInfo = object({
  production_type: string().min(1, 'Production type is required'),
  area_covered: string().min(1, 'Area is required for carbon calculation'),
  area_unit: string().min(1, 'Area unit is required'),
  yield_quantity: string().optional(),
  yield_unit: string().optional(),
  fuel_consumed: string().optional(),
  fuel_unit: string().optional(),
  equipment_hours: string().optional(),
  transportation_distance: string().optional(),
  transportation_unit: string().optional(),
  production_efficiency: string().optional(),
  observation: string().optional()
});

const ProductionTab = ({ onSubmitHandler, onDataChange, onPrev, initialValues = {} }) => {
  const intl = useIntl();

  const methods = useForm({
    resolver: zodResolver(formSchemaMainInfo),
    defaultValues: {
      production_type: initialValues.production_type || '',
      area_covered: initialValues.area_covered?.toString() || '',
      area_unit: initialValues.area_unit || 'ha',
      yield_quantity: initialValues.yield_quantity?.toString() || '',
      yield_unit: initialValues.yield_unit || 'kg',
      fuel_consumed: initialValues.fuel_consumed?.toString() || '',
      fuel_unit: initialValues.fuel_unit || 'L',
      equipment_hours: initialValues.equipment_hours?.toString() || '',
      transportation_distance: initialValues.transportation_distance?.toString() || '',
      transportation_unit: initialValues.transportation_unit || 'km',
      production_efficiency: initialValues.production_efficiency || 'normal',
      observation: initialValues.observation || ''
    }
  });

  // Update form values when initialValues change
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      methods.reset({
        production_type: initialValues.production_type || '',
        area_covered: initialValues.area_covered?.toString() || '',
        area_unit: initialValues.area_unit || 'ha',
        yield_quantity: initialValues.yield_quantity?.toString() || '',
        yield_unit: initialValues.yield_unit || 'kg',
        fuel_consumed: initialValues.fuel_consumed?.toString() || '',
        fuel_unit: initialValues.fuel_unit || 'L',
        equipment_hours: initialValues.equipment_hours?.toString() || '',
        transportation_distance: initialValues.transportation_distance?.toString() || '',
        transportation_unit: initialValues.transportation_unit || 'km',
        production_efficiency: initialValues.production_efficiency || 'normal',
        observation: initialValues.observation || ''
      });
    }
  }, [initialValues, methods]);

  const {
    handleSubmit,
    watch,
    formState: { errors }
  } = methods;

  const productionType = watch('production_type');

  // Real-time carbon calculation updates
  const watchedFields = watch(['production_type', 'area_covered', 'yield_quantity', 'fuel_consumed']);
  const previousValuesRef = useRef({});

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onDataChange && typeof onDataChange === 'function') {
        const currentValues = methods.getValues();
        
        // Only trigger if we have carbon-relevant data
        if (currentValues.production_type && currentValues.area_covered) {
          const relevantFields = ['production_type', 'area_covered', 'yield_quantity', 'fuel_consumed', 'equipment_hours'];
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
              console.error('[ProductionTab]: Error calling onDataChange:', error);
            }
          }
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedFields, onDataChange, methods]);

  const onSubmit = (data) => {
    // Convert string numbers to numbers for backend carbon calculations
    const processedData = {
      ...data,
      area_covered: parseFloat(data.area_covered) || 0,
      yield_quantity: data.yield_quantity ? parseFloat(data.yield_quantity) : undefined,
      fuel_consumed: data.fuel_consumed ? parseFloat(data.fuel_consumed) : undefined,
      equipment_hours: data.equipment_hours ? parseFloat(data.equipment_hours) : undefined,
      transportation_distance: data.transportation_distance ? parseFloat(data.transportation_distance) : undefined
    };
    onSubmitHandler(processedData);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
        <VStack spacing={6} align="stretch">
          
          {/* Carbon Focus Alert */}
          <StandardAlert status="success" title="Production Carbon Tracking">
            <Text fontSize="sm">
              🌱 This form captures production data essential for accurate carbon footprint calculations.
              Area, yield, and equipment data all contribute to your environmental transparency.
            </Text>
          </StandardAlert>

          {/* Basic Production Information */}
          <StandardCard
            title={
              <HStack>
                <Icon as={FaSeedling} color="green.500" />
                <Text>Production Activity</Text>
                <Badge colorScheme="green" size="sm">Carbon Critical</Badge>
              </HStack>
            }
          >
            <VStack spacing={4} align="stretch">
              
              {/* Production Type - Structured for carbon calculations */}
              <StandardField
                label="Production Type"
                required
                error={errors.production_type?.message}
                helpText="Production type determines carbon calculation method"
              >
                <Controller
                  name="production_type"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect
                      {...field}
                      placeholder="Select production activity..."
                    >
                      <option value="planting">Planting/Seeding</option>
                      <option value="harvesting">Harvesting</option>
                      <option value="irrigation">Irrigation</option>
                      <option value="pruning">Pruning/Trimming</option>
                      <option value="cultivation">Soil Cultivation</option>
                      <option value="fertilization">Fertilizer Application</option>
                      <option value="weeding">Weed Management</option>
                      <option value="mulching">Mulching Application</option>
                      <option value="transplanting">Transplanting</option>
                    </StandardSelect>
                  )}
                />
              </StandardField>

              {/* Area Covered - Critical for all carbon calculations */}
              <HStack spacing={4} align="end">
                <StandardField
                  label="Area Covered"
                  required
                  error={errors.area_covered?.message}
                  helpText="Essential for calculating carbon emissions per hectare"
                  flex={2}
                >
                  <Controller
                    name="area_covered"
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
                  required
                  error={errors.area_unit?.message}
                  flex={1}
                >
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
              </HStack>
            </VStack>
          </StandardCard>

          {/* Yield & Output - For carbon efficiency calculation */}
          {(productionType === 'harvesting' || productionType === 'planting') && (
            <StandardCard
              title={
                <HStack>
                  <Icon as={FaScale} color="blue.500" />
                  <Text>Yield & Output</Text>
                  <Badge colorScheme="blue" size="sm">Efficiency Calculation</Badge>
                </HStack>
              }
            >
              <VStack spacing={4} align="stretch">
                
                <HStack spacing={4} align="end">
                  <StandardField
                    label={productionType === 'harvesting' ? "Quantity Harvested" : "Quantity Planted"}
                    error={errors.yield_quantity?.message}
                    helpText="Used to calculate carbon efficiency per unit of production"
                    flex={2}
                  >
                    <Controller
                      name="yield_quantity"
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
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* Equipment & Fuel Usage */}
          <StandardCard
            title={
              <HStack>
                <Icon as={FaTractor} color="orange.500" />
                <Text>Equipment & Fuel</Text>
                <Badge colorScheme="orange" size="sm">Emissions Source</Badge>
              </HStack>
            }
          >
            <VStack spacing={4} align="stretch">
              
              {/* Fuel Consumption */}
              <HStack spacing={4} align="end">
                <StandardField
                  label="Fuel Consumed"
                  error={errors.fuel_consumed?.message}
                  helpText="Fuel consumption for carbon emission calculation"
                  flex={2}
                >
                  <Controller
                    name="fuel_consumed"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardInput
                        {...field}
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Optional"
                      />
                    )}
                  />
                </StandardField>

                <StandardField
                  label="Unit"
                  flex={1}
                >
                  <Controller
                    name="fuel_unit"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardSelect {...field}>
                        <option value="L">Liters</option>
                        <option value="gal">Gallons</option>
                        <option value="kg">Kilograms</option>
                      </StandardSelect>
                    )}
                  />
                </StandardField>
              </HStack>

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
                    <StandardInput
                      {...field}
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Optional"
                    />
                  )}
                />
              </StandardField>
            </VStack>
          </StandardCard>

          {/* Transportation - For logistics emissions */}
          {productionType === 'harvesting' && (
            <StandardCard
              title={
                <HStack>
                  <Icon as={FaTruck} color="purple.500" />
                  <Text>Transportation</Text>
                  <Badge colorScheme="purple" size="sm">Logistics Emissions</Badge>
                </HStack>
              }
            >
              <VStack spacing={4} align="stretch">
                
                <HStack spacing={4} align="end">
                  <StandardField
                    label="Transportation Distance"
                    error={errors.transportation_distance?.message}
                    helpText="Distance for transporting harvest affects carbon footprint"
                    flex={2}
                  >
                    <Controller
                      name="transportation_distance"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput
                          {...field}
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="Optional"
                        />
                      )}
                    />
                  </StandardField>

                  <StandardField
                    label="Unit"
                    flex={1}
                  >
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
                        <option value="high">High Efficiency (optimal conditions, planned operations)</option>
                        <option value="normal">Normal Efficiency (standard operation)</option>
                        <option value="low">Low Efficiency (adverse conditions, unplanned operations)</option>
                      </StandardSelect>
                    )}
                  />
                </StandardField>
              </VStack>
            </StandardCard>
          )}

          {/* Observations */}
          <StandardField 
            label={intl.formatMessage({ id: 'app.observations' })}
            error={errors.observation?.message}
            helpText="Optional: Note conditions that affected production efficiency or carbon impact"
          >
            <Controller
              name="observation"
              control={methods.control}
              render={({ field }) => (
                <StandardTextarea
                  {...field}
                  placeholder="e.g., Perfect weather conditions for harvesting, equipment performed optimally, higher yield than expected..."
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

export default ProductionTab;