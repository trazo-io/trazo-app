// CARBON-FOCUSED EQUIPMENT TAB - TRAZO MISSION ALIGNED
// Focuses only on carbon-relevant equipment data: fuel consumption & efficiency

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
import { FaChevronLeft, FaChevronRight, FaGasPump, FaTractor, FaCalculator } from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import React, { useEffect, useRef } from 'react';
import { object, string } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';

// CARBON-FOCUSED SCHEMA - Only fields that impact carbon calculations
const formSchemaMainInfo = object({
  equipment_type: string().min(1, 'Equipment type is required for carbon calculation'),
  fuel_consumed: string().min(1, 'Fuel amount is required for emissions calculation'),
  fuel_unit: string().min(1, 'Fuel unit is required'),
  fuel_type: string().min(1, 'Fuel type affects emission factors'),
  hours_operated: string().min(1, 'Operating hours affect efficiency calculation'),
  area_worked: string().optional(),
  area_unit: string().optional(),
  operation_efficiency: string().optional(), // NEW: For carbon efficiency scoring
  observation: string().optional()
});

const EquipmentTab = ({ onSubmitHandler, onDataChange, onPrev, initialValues = {} }) => {
  const intl = useIntl();

  const methods = useForm({
    resolver: zodResolver(formSchemaMainInfo),
    defaultValues: {
      equipment_type: initialValues.equipment_type || '',
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
        equipment_type: initialValues.equipment_type || '',
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

  const {
    handleSubmit,
    watch,
    formState: { errors }
  } = methods;

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
  }, [watchedFields]); // FIXED: Removed onDataChange to prevent infinite loop

  const onSubmit = (data) => {
    // Convert string numbers to numbers for backend
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
          
          {/* Carbon Focus Alert */}
          <StandardAlert status="info" title="Carbon Tracking Focus">
            <Text fontSize="sm">
              This form tracks equipment fuel consumption for accurate carbon footprint calculations.
              All fields contribute to your transparency score.
            </Text>
          </StandardAlert>

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
                error={errors.equipment_type?.message}
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
                  error={errors.fuel_consumed?.message}
                  helpText="Critical for carbon emission calculation"
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
                        placeholder="0.0"
                      />
                    )}
                  />
                </StandardField>

                <StandardField
                  label="Unit"
                  required
                  error={errors.fuel_unit?.message}
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
                error={errors.fuel_type?.message}
                helpText="Different fuels have different carbon emission factors"
              >
                <Controller
                  name="fuel_type"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect {...field}>
                      <option value="diesel">Diesel (2.68 kg CO₂e/L)</option>
                      <option value="gasoline">Gasoline (2.31 kg CO₂e/L)</option>
                      <option value="natural_gas">Natural Gas (2.03 kg CO₂e/m³)</option>
                      <option value="lpg">LPG (1.70 kg CO₂e/L)</option>
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
                error={errors.hours_operated?.message}
                helpText="Used to calculate fuel efficiency and carbon per hour"
              >
                <Controller
                  name="hours_operated"
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

              {/* Area Worked (Optional) */}
              <HStack spacing={4} align="end">
                <StandardField
                  label="Area Worked (Optional)"
                  error={errors.area_worked?.message}
                  helpText="For calculating emissions per hectare"
                  flex={2}
                >
                  <Controller
                    name="area_worked"
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
                error={errors.operation_efficiency?.message}
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
            label={intl.formatMessage({ id: 'app.observations' })}
            error={errors.observation?.message}
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

export default EquipmentTab;