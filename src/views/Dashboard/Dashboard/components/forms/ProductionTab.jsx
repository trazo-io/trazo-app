// ENHANCED PRODUCTION TAB - CARBON CALCULATION OPTIMIZED
// Focuses on production data critical for carbon footprint calculations

import {
  Flex,
  HStack,
  Box,
  VStack,
  Badge,
  Text,
  Icon,
  InputGroup,
  InputRightAddon,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useColorModeValue
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
import { FaChevronLeft, FaChevronRight, FaSeedling, FaTractor, FaBalanceScale, FaTruck } from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import React, { useEffect, useRef } from 'react';
import { object, string } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';

// ENHANCED SCHEMA - Carbon calculation focused with Phase 1.3 validation
const formSchemaMainInfo = object({
  type: string().min(1, 'Production type is required'),
  area_covered: string().min(1, 'Area is required for carbon calculation').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Area covered must be greater than 0'),
  area_unit: string().min(1, 'Area unit is required'),
  yield_quantity: string().optional().refine((val) => {
    if (!val || val === '') return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Yield quantity cannot be negative'),
  yield_unit: string().optional(),
  fuel_consumed: string().optional(),
  fuel_unit: string().optional(),
  equipment_hours: string().optional().refine((val) => {
    if (!val || val === '') return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Equipment hours cannot be negative'),
  transportation_distance: string().optional().refine((val) => {
    if (!val || val === '') return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Transportation distance cannot be negative'),
  transportation_unit: string().optional(),
  production_efficiency: string().optional(),
  observation: string().optional()
});

const ProductionTab = ({ onSubmitHandler, onDataChange, onPrev, initialValues = {} }) => {
  const intl = useIntl();
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const methods = useForm({
    resolver: zodResolver(formSchemaMainInfo),
    defaultValues: {
      type: initialValues.type || 'PL',
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
        type: initialValues.type || 'PL',
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

  const productionType = watch('type');

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
  
  const watchedFields = watch(['type', 'area_covered', 'yield_quantity', 'transportation_distance', 'fuel_consumed', 'equipment_hours']);
  const previousValuesRef = useRef({});
  const isInitialMountRef = useRef(true);

  // Real-time field watching for carbon calculation updates (following ChemicalTab.jsx pattern)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onDataChange && typeof onDataChange === 'function') {
        const currentValues = methods.getValues();

        const relevantFields = [
          'type',
          'area_covered',
          'area_unit',
          'yield_quantity',
          'yield_unit',
          'fuel_consumed',
          'fuel_unit',
          'equipment_hours',
          'transportation_distance',
          'transportation_unit'
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
          currentValues.area_covered && 
          parseFloat(currentValues.area_covered) > 0;

        const shouldTrigger = hasMeaningfulData && (hasChanged || isInitialMountRef.current);

        if (shouldTrigger) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ProductionTab]: ✅ Triggering carbon calculation', {
              type: currentValues.type,
              area_covered: currentValues.area_covered,
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
          
          {/* Transparency Focus Alert */}
          <StandardAlert status="success" title="Agricultural Production Transparency">
            <HStack spacing={2} mb={2}>
              <Icon as={FaSeedling} color="green.500" />
              <Text fontSize="sm" fontWeight="bold">Yield & Transportation Documentation</Text>
            </HStack>
            <Text fontSize="sm">
              Document production activities and yields to complete your agricultural transparency story.
              Transportation emissions from harvest to storage are calculated to avoid double-counting with field equipment.
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
                error={errors.type?.message}
                helpText="Production type determines carbon calculation method"
              >
                <Controller
                  name="type"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect
                      {...field}
                      placeholder="Select production activity..."
                    >
                      <option value="PL">🌱 Planting/Seeding - Crop establishment</option>
                      <option value="HA">🚜 Harvesting - Crop collection & transport</option>
                      <option value="IR">💧 Irrigation - Water application</option>
                      <option value="PR">✂️ Pruning/Trimming - Plant maintenance</option>
                      <option value="transplanting">🌿 Transplanting - Plant relocation</option>
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
                      <NumberInput min={0} precision={2} step={0.01}>
                        <NumberInputField 
                          {...field}
                          placeholder="0.00"
                        />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
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
          {(productionType === 'HA' || productionType === 'PL') && (
            <StandardCard
              title={
                <HStack>
                  <Icon as={FaBalanceScale} color="blue.500" />
                  <Text>Yield & Output</Text>
                  <Badge colorScheme="blue" size="sm">Efficiency Calculation</Badge>
                </HStack>
              }
            >
              <VStack spacing={4} align="stretch">
                
                <HStack spacing={4} align="end">
                  <StandardField
                    label={productionType === 'HA' ? "Quantity Harvested" : "Quantity Planted"}
                    error={errors.yield_quantity?.message}
                    helpText="Used to calculate carbon efficiency per unit of production"
                    flex={2}
                  >
                    <Controller
                      name="yield_quantity"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput min={0} precision={1} step={0.1}>
                          <NumberInputField 
                            {...field}
                            placeholder="0.0"
                          />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
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
                      <NumberInput min={0} precision={1} step={0.1}>
                        <NumberInputField 
                          {...field}
                          placeholder="Optional"
                        />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
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
                    <NumberInput min={0} precision={1} step={0.1}>
                      <NumberInputField 
                        {...field}
                        placeholder="Optional"
                      />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  )}
                />
              </StandardField>
            </VStack>
          </StandardCard>

          {/* Transportation - For logistics emissions */}
          {productionType === 'HA' && (
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
                        <NumberInput min={0} precision={1} step={0.1}>
                          <NumberInputField 
                            {...field}
                            placeholder="Optional"
                          />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
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
        </VStack>
      </form>
    </FormProvider>
  );
};

export default ProductionTab;