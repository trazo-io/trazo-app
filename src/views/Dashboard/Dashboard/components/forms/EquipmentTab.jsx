// CARBON-FOCUSED EQUIPMENT TAB - TRAZO MISSION ALIGNED
// Focuses only on carbon-relevant equipment data: fuel consumption & efficiency

import React, { useEffect, useRef } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  HStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea,
  useColorModeValue,
  Box,
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
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string } from 'zod';
import { FaChevronLeft, FaChevronRight, FaGasPump, FaTractor, FaCalculator } from 'react-icons/fa';
import { useIntl } from 'react-intl';

// CARBON-FOCUSED SCHEMA - Updated with Phase 1.2 validation constraints
const equipmentSchema = object({
  type: string().min(1, 'Equipment event type is required'),
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
  operation_efficiency: string().optional(), // NEW: For carbon efficiency scoring
  observation: string().optional()
});

const EquipmentTab = ({ onSubmitHandler, onDataChange, onPrev, initialValues = {} }) => {
  const intl = useIntl();
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const methods = useForm({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      type: initialValues.type || 'FC', // Default to Fuel Consumption for carbon tracking
      name: initialValues.name || '',
      equipment_type: initialValues.equipment_type || 'tractor_medium',
      fuel_consumed: initialValues.fuel_consumed?.toString() || '',
      fuel_unit: initialValues.fuel_unit || 'L',
      fuel_type: initialValues.fuel_type || 'diesel',
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
        equipment_type: initialValues.equipment_type || 'tractor_medium',
        fuel_consumed: initialValues.fuel_consumed?.toString() || '',
        fuel_unit: initialValues.fuel_unit || 'L',
        fuel_type: initialValues.fuel_type || 'diesel',
        hours_operated: initialValues.hours_operated?.toString() || '',
        area_worked: initialValues.area_worked?.toString() || '',
        area_unit: initialValues.area_unit || 'ha',
        operation_efficiency: initialValues.operation_efficiency || 'normal',
        observation: initialValues.observation || ''
      });
    }
  }, [initialValues, methods]);

  const { watch } = methods;
  const equipmentType = watch('type');

  // Real-time carbon calculation updates - focused on fuel consumption
  const watchedFields = watch(['equipment_type', 'fuel_consumed', 'fuel_type', 'hours_operated']);
  const previousValuesRef = useRef({});

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onDataChange && typeof onDataChange === 'function') {
        const currentValues = methods.getValues();
        
        // Only trigger if we have carbon-relevant data
        if (currentValues.equipment_type && currentValues.fuel_consumed) {
          const relevantFields = ['equipment_type', 'fuel_consumed', 'fuel_type', 'hours_operated', 'area_worked'];
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
  }, [watchedFields, onDataChange, methods]);

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
      <form onSubmit={methods.handleSubmit(onSubmit)} style={{ width: '100%' }}>
        <VStack spacing={6} align="stretch">
          
          {/* Carbon Focus Alert */}
          <StandardAlert status="info" title="Carbon Tracking Focus">
            <Text fontSize="sm">
              🚜 This form tracks equipment fuel consumption for accurate carbon footprint calculations.
              All fields contribute to your transparency score.
            </Text>
          </StandardAlert>

          {/* Event Name */}
          <StandardField
            label={intl.formatMessage({ id: 'app.eventName' }) || 'Event Name'}
            required
            error={methods.formState.errors.name?.message}
          >
            <StandardInput
              {...methods.register('name')}
              placeholder="e.g., Tractor Operation, Harvester Fuel Use"
            />
          </StandardField>

          {/* Equipment Event Type - Simplified for carbon focus */}
          <StandardField
            label={intl.formatMessage({ id: 'app.equipmentEventType' }) || 'Equipment Event Type'}
            required
            error={methods.formState.errors.type?.message}
            helpText="Focus on fuel consumption events for carbon tracking"
          >
            <StandardSelect {...methods.register('type')}>
              <option value="FC">
                {intl.formatMessage({ id: 'app.fuelConsumption' }) || 'Fuel Consumption'}
              </option>
              <option value="MN">
                {intl.formatMessage({ id: 'app.maintenance' }) || 'Maintenance'}
              </option>
              <option value="RE">{intl.formatMessage({ id: 'app.repair' }) || 'Repair'}</option>
              <option value="CA">
                {intl.formatMessage({ id: 'app.calibration' }) || 'Calibration'}
              </option>
            </StandardSelect>
          </StandardField>

          {/* Equipment & Fuel Section */}
          <StandardCard
            title={
              <HStack>
                <Icon as={FaTractor} color="orange.500" />
                <Text>Equipment & Fuel Consumption</Text>
                <Badge colorScheme="orange" size="sm">Carbon Critical</Badge>
              </HStack>
            }
          >
            <VStack spacing={4} align="stretch">
              
              {/* Equipment Type - Structured for carbon calculations */}
              <StandardField
                label="Equipment Type"
                required
                error={methods.formState.errors.equipment_type?.message}
                helpText="Equipment type determines emission factors for calculation"
              >
                <Controller
                  name="equipment_type"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect
                      {...field}
                      placeholder="Select equipment type..."
                    >
                      <option value="tractor_small">Small Tractor (&lt;75 HP)</option>
                      <option value="tractor_medium">Medium Tractor (75-150 HP)</option>
                      <option value="tractor_large">Large Tractor (&gt;150 HP)</option>
                      <option value="irrigation_pump">Irrigation Pump</option>
                      <option value="harvester">Combine Harvester</option>
                      <option value="sprayer">Field Sprayer</option>
                      <option value="cultivator">Cultivator/Plow</option>
                      <option value="transport">Transport Vehicle</option>
                    </StandardSelect>
                  )}
                />
              </StandardField>

              {/* Fuel Consumption with Unit */}
              <HStack spacing={4} align="end">
                <StandardField
                  label="Fuel Consumed"
                  required
                  error={methods.formState.errors.fuel_consumed?.message}
                  helpText="Critical for carbon emission calculation"
                  flex={2}
                >
                  <Controller
                    name="fuel_consumed"
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
                  required
                  error={methods.formState.errors.fuel_unit?.message}
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

              {/* Fuel Type - Critical for emission factors */}
              <StandardField
                label="Fuel Type"
                required
                error={methods.formState.errors.fuel_type?.message}
                helpText="Different fuels have different carbon emission factors"
              >
                <Controller
                  name="fuel_type"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect {...field}>
                      <option value="diesel">Diesel</option>
                      <option value="gasoline">Gasoline</option>
                      <option value="biodiesel">Biodiesel (B20)</option>
                      <option value="electric">Electric (Grid)</option>
                      <option value="lng">Liquified Natural Gas</option>
                    </StandardSelect>
                  )}
                />
              </StandardField>
            </VStack>
          </StandardCard>

          {/* Operation Details Section */}
          <StandardCard
            title={
              <HStack>
                <Icon as={FaCalculator} color="blue.500" />
                <Text>Operation Details</Text>
                <Badge colorScheme="blue" size="sm">Efficiency Calculation</Badge>
              </HStack>
            }
          >
            <VStack spacing={4} align="stretch">

              {/* Operating Hours */}
              <StandardField
                label="Hours Operated"
                required
                error={methods.formState.errors.hours_operated?.message}
                helpText="Used to calculate fuel efficiency and carbon per hour"
              >
                <Controller
                  name="hours_operated"
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

              {/* Area Worked (Optional) */}
              <HStack spacing={4} align="end">
                <StandardField
                  label="Area Worked (Optional)"
                  error={methods.formState.errors.area_worked?.message}
                  helpText="For calculating emissions per hectare"
                  flex={2}
                >
                  <Controller
                    name="area_worked"
                    control={methods.control}
                    render={({ field }) => (
                      <NumberInput min={0} precision={2} step={0.1}>
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
                    name="area_unit"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardSelect {...field}>
                        <option value="ha">Hectares</option>
                        <option value="acres">Acres</option>
                        <option value="m2">Square Meters</option>
                      </StandardSelect>
                    )}
                  />
                </StandardField>
              </HStack>

              {/* Operation Efficiency - NEW for carbon scoring */}
              <StandardField
                label="Operation Efficiency"
                error={methods.formState.errors.operation_efficiency?.message}
                helpText="Rate the efficiency of this operation for carbon scoring"
              >
                <Controller
                  name="operation_efficiency"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect {...field}>
                      <option value="high">High Efficiency (optimized routes, well-maintained)</option>
                      <option value="normal">Normal Efficiency (standard operation)</option>
                      <option value="low">Low Efficiency (inefficient patterns, maintenance needed)</option>
                    </StandardSelect>
                  )}
                />
              </StandardField>
            </VStack>
          </StandardCard>

          {/* Observations */}
          <StandardField 
            label={intl.formatMessage({ id: 'app.observations' }) || 'Observations'}
            error={methods.formState.errors.observation?.message}
            helpText="Optional: Note conditions that affected fuel efficiency or carbon impact"
          >
            <Controller
              name="observation"
              control={methods.control}
              render={({ field }) => (
                <StandardTextarea
                  {...field}
                  placeholder="e.g., Heavy soil conditions increased fuel consumption, equipment running optimally..."
                  rows={3}
                />
              )}
            />
          </StandardField>

          {/* Navigation */}
          <HStack justify="space-between" pt={6} mt={4} borderTop="1px" borderColor={borderColor}>
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
        </VStack>
      </form>
    </FormProvider>
  );
};

export default EquipmentTab;