import React, { useEffect } from 'react';
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
  useColorModeValue
} from '@chakra-ui/react';
import {
  StandardCard,
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea
} from 'components/Design/StandardComponents';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, number } from 'zod';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useIntl } from 'react-intl';

const equipmentSchema = object({
  type: string().min(1, 'Equipment event type is required'),
  name: string().min(1, 'Event name is required'),
  equipment_name: string().optional(),
  fuel_amount: string().optional(),
  fuel_type: string().optional(),
  maintenance_cost: string().optional(),
  hours_used: string().optional(),
  area_covered: string().optional(),
  observation: string().optional()
});

const EquipmentTab = ({ onSubmitHandler, onDataChange, onPrev, initialValues = {} }) => {
  const intl = useIntl();
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const methods = useForm({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      type: initialValues.type || 'MN',
      name: initialValues.name || '',
      equipment_name: initialValues.equipment_name || '',
      fuel_amount: initialValues.fuel_amount?.toString() || '',
      fuel_type: initialValues.fuel_type || 'diesel',
      maintenance_cost: initialValues.maintenance_cost?.toString() || '',
      hours_used: initialValues.hours_used?.toString() || '',
      area_covered: initialValues.area_covered || '',
      observation: initialValues.observation || ''
    }
  });

  // Update form values when initialValues change
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      methods.reset({
        type: initialValues.type || 'MN',
        name: initialValues.name || '',
        equipment_name: initialValues.equipment_name || '',
        fuel_amount: initialValues.fuel_amount?.toString() || '',
        fuel_type: initialValues.fuel_type || 'diesel',
        maintenance_cost: initialValues.maintenance_cost?.toString() || '',
        hours_used: initialValues.hours_used?.toString() || '',
        area_covered: initialValues.area_covered || '',
        observation: initialValues.observation || ''
      });
    }
  }, [initialValues, methods]);

  const { watch } = methods;

  // Watch critical fields for real-time carbon calculation updates
  const watchedFields = watch([
    'type',
    'fuel_amount',
    'fuel_type',
    'hours_used',
    'area_covered'
  ]);

  // Real-time field watching for carbon calculation updates
  useEffect(() => {
    console.log('[EquipmentTab]: Field watching triggered', { 
      hasOnDataChange: !!onDataChange, 
      watchedFields, 
      firstField: watchedFields[0] 
    });
    
    // Always check if callback exists inside the timeout to avoid stale closures
    const timeoutId = setTimeout(() => {
      if (onDataChange && typeof onDataChange === 'function') {
        const currentValues = methods.getValues();
        console.log('[EquipmentTab]: Current values for carbon calculation', currentValues);
        
        // Only trigger if we have meaningful data
        if (currentValues.type && (currentValues.fuel_amount || currentValues.hours_used)) {
          console.log('[EquipmentTab]: Triggering onDataChange with values', currentValues);
          try {
            onDataChange(currentValues);
          } catch (error) {
            console.error('[EquipmentTab]: Error calling onDataChange:', error);
          }
        } else {
          console.log('[EquipmentTab]: Not triggering - insufficient data', {
            hasType: !!currentValues.type,
            hasFuelAmount: !!currentValues.fuel_amount,
            hasHoursUsed: !!currentValues.hours_used
          });
        }
      } else {
        console.log('[EquipmentTab]: onDataChange not available in timeout');
      }
    }, 500); // Debounced to prevent excessive API calls

    return () => clearTimeout(timeoutId);
  }, [watchedFields, onDataChange, methods]);
  const equipmentType = watch('type');

  const onSubmit = (data) => {
    console.log('Raw form data:', data); // Debug log

    // Helper function to safely parse numeric values
    const parseNumericField = (value) => {
      console.log('Parsing value:', value, 'Type:', typeof value); // Debug log

      // Handle various input types
      if (value === null || value === undefined) {
        return null;
      }

      // Convert to string and trim
      const stringValue = String(value).trim();

      // If empty string, return null
      if (stringValue === '') {
        return null;
      }

      // Try to parse as float
      const parsed = parseFloat(stringValue);

      // If parsing failed (NaN), return null
      if (isNaN(parsed)) {
        console.warn('Failed to parse numeric value:', value);
        return null;
      }

      return parsed;
    };

    // Convert string numbers to proper format and only include relevant fields
    const processedData = {
      ...data,
      // Only include fuel-related fields for Fuel Consumption events
      fuel_amount: equipmentType === 'FC' ? parseNumericField(data.fuel_amount) : undefined,
      fuel_type: equipmentType === 'FC' ? data.fuel_type : undefined,

      // Only include maintenance cost for relevant event types
      maintenance_cost: ['MN', 'RE', 'BD'].includes(equipmentType)
        ? parseNumericField(data.maintenance_cost)
        : undefined,

      // Hours used is optional for all types
      hours_used: parseNumericField(data.hours_used)
    };

    console.log('Processed data before cleanup:', processedData); // Debug log

    // Remove undefined fields to avoid sending them to the backend
    Object.keys(processedData).forEach((key) => {
      if (processedData[key] === undefined) {
        delete processedData[key];
      }
    });

    console.log('Final processed data:', processedData); // Debug log
    onSubmitHandler(processedData);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} style={{ width: '100%' }}>
        <VStack spacing={6} align="stretch">
          {/* Event Name */}
          <StandardField
            label={intl.formatMessage({ id: 'app.eventName' }) || 'Event Name'}
            required
            error={methods.formState.errors.name?.message}
          >
            <StandardInput
              {...methods.register('name')}
              placeholder="e.g., Tractor Maintenance, Fuel Consumption"
            />
          </StandardField>

          {/* Equipment Event Type */}
          <StandardField
            label={intl.formatMessage({ id: 'app.equipmentEventType' }) || 'Equipment Event Type'}
            required
            error={methods.formState.errors.type?.message}
          >
            <StandardSelect {...methods.register('type')}>
              <option value="MN">
                {intl.formatMessage({ id: 'app.maintenance' }) || 'Maintenance'}
              </option>
              <option value="RE">{intl.formatMessage({ id: 'app.repair' }) || 'Repair'}</option>
              <option value="CA">
                {intl.formatMessage({ id: 'app.calibration' }) || 'Calibration'}
              </option>
              <option value="FC">
                {intl.formatMessage({ id: 'app.fuelConsumption' }) || 'Fuel Consumption'}
              </option>
              <option value="BD">
                {intl.formatMessage({ id: 'app.breakdown' }) || 'Breakdown'}
              </option>
              <option value="EI">
                {intl.formatMessage({ id: 'app.inspection' }) || 'Inspection'}
              </option>
            </StandardSelect>
          </StandardField>

          {/* Equipment Name */}
          <StandardField
            label={intl.formatMessage({ id: 'app.equipmentName' }) || 'Equipment Name'}
          >
            <StandardInput
              {...methods.register('equipment_name')}
              placeholder="e.g., John Deere Tractor Model X"
            />
          </StandardField>

          {/* Fuel-specific fields */}
          {equipmentType === 'FC' && (
            <>
              <HStack spacing={4} align="end">
                <StandardField
                  label={intl.formatMessage({ id: 'app.fuelAmount' }) || 'Fuel Amount (L)'}
                  flex="2"
                >
                  <NumberInput min={0} precision={2} step={0.1}>
                    <NumberInputField {...methods.register('fuel_amount')} placeholder="0.0" />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </StandardField>

                <StandardField
                  label={intl.formatMessage({ id: 'app.fuelType' }) || 'Fuel Type'}
                  flex="2"
                >
                  <StandardSelect {...methods.register('fuel_type')}>
                    <option value="diesel">
                      {intl.formatMessage({ id: 'app.diesel' }) || 'Diesel'}
                    </option>
                    <option value="gasoline">
                      {intl.formatMessage({ id: 'app.gasoline' }) || 'Gasoline'}
                    </option>
                    <option value="natural_gas">
                      {intl.formatMessage({ id: 'app.naturalGas' }) || 'Natural Gas'}
                    </option>
                    <option value="biodiesel">
                      {intl.formatMessage({ id: 'app.biodiesel' }) || 'Biodiesel'}
                    </option>
                  </StandardSelect>
                </StandardField>
              </HStack>
            </>
          )}

          {/* Maintenance/Repair cost */}
          {(equipmentType === 'MN' || equipmentType === 'RE' || equipmentType === 'BD') && (
            <StandardField
              label={intl.formatMessage({ id: 'app.maintenanceCost' }) || 'Cost ($)'}
            >
              <NumberInput min={0} precision={2} step={0.01}>
                <NumberInputField {...methods.register('maintenance_cost')} placeholder="0.00" />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </StandardField>
          )}

          {/* Hours Used */}
          <HStack spacing={4} align="end">
            <StandardField
              label={intl.formatMessage({ id: 'app.hoursUsed' }) || 'Hours Used'}
            >
              <NumberInput min={0} precision={1} step={0.1}>
                <NumberInputField {...methods.register('hours_used')} placeholder="0.0" />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </StandardField>

            <StandardField
              label={intl.formatMessage({ id: 'app.areaCovered' }) || 'Area Covered'}
            >
              <StandardInput
                {...methods.register('area_covered')}
                placeholder="e.g., 10 hectares"
              />
            </StandardField>
          </HStack>

          {/* Observations */}
          <StandardField
            label={intl.formatMessage({ id: 'app.observations' }) || 'Observations'}
          >
            <StandardTextarea
              {...methods.register('observation')}
              placeholder={
                intl.formatMessage({ id: 'app.enterObservations' }) ||
                'Enter any additional observations...'
              }
              rows={3}
            />
          </StandardField>

          {/* Action Buttons */}
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
