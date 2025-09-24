// Chakra imports
import {
  Flex,
  HStack,
  Box
} from '@chakra-ui/react';
import {
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea
} from 'components/Design/StandardComponents';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import React, { useEffect, useRef } from 'react';
import { object, string } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';

// Simple activity types for general farming activities
// These are low-impact activities that don't fit in specialized categories
const GENERAL_ACTIVITY_TYPES = [
  { value: 'maintenance', label: 'Farm Maintenance' },
  { value: 'planning', label: 'Planning Activity' },
  { value: 'training', label: 'Training/Education' },
  { value: 'documentation', label: 'Record Keeping' },
  { value: 'inspection', label: 'Inspection/Audit' },
  { value: 'other', label: 'Other General Activity' }
];

const formSchemaMainInfo = object({
  name: string().min(1, 'Event name is required'),
  type: string().min(1, 'Activity type is required'),
  description: string().optional()
});

const GeneralTab = ({ onSubmitHandler, onDataChange, onPrev, initialValues = {} }) => {
  const intl = useIntl();

  const mainInfoMethods = useForm({
    resolver: zodResolver(formSchemaMainInfo),
    defaultValues: {
      name: initialValues.name || '',
      type: initialValues.type || '',
      description: initialValues.description || initialValues.observation || ''
    }
  });

  // Update form values when initialValues change
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      mainInfoMethods.reset({
        name: initialValues.name || '',
        type: initialValues.type || '',
        description: initialValues.description || initialValues.observation || ''
      });
    }
  }, [initialValues, mainInfoMethods]);

  const {
    handleSubmit: mainInfoSubmit,
    watch,
    formState: { errors }
  } = mainInfoMethods;

  // Real-time field watching for data change updates
  const watchedFields = watch(['name', 'type', 'description']);
  const previousValuesRef = useRef({});

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onDataChange && typeof onDataChange === 'function') {
        const currentValues = mainInfoMethods.getValues();
        
        // Only trigger if we have meaningful data
        if (currentValues.name && currentValues.name.trim().length > 0) {
          const relevantFields = ['name', 'type', 'description'];
          const currentRelevantValues = {};
          relevantFields.forEach((field) => {
            currentRelevantValues[field] = currentValues[field];
          });

          // Check if values have actually changed
          const hasChanged = JSON.stringify(currentRelevantValues) !== JSON.stringify(previousValuesRef.current);

          if (hasChanged) {
            previousValuesRef.current = currentRelevantValues;
            try {
              onDataChange(currentValues);
            } catch (error) {
              console.error('[GeneralTab]: Error calling onDataChange:', error);
            }
          }
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedFields, onDataChange, mainInfoMethods]);

  const onSubmit = (data) => {
    onSubmitHandler(data);
  };

  return (
    <FormProvider {...mainInfoMethods}>
      <form onSubmit={mainInfoSubmit(onSubmit)} style={{ width: '100%' }}>
        <Flex direction="column" w="100%">
          {/* Activity Type Field */}
          <StandardField
            label="Activity Type"
            required
            error={errors.type?.message}
            helpText="What type of general farming activity?"
          >
            <Controller
              name="type"
              control={mainInfoMethods.control}
              render={({ field }) => (
                <StandardSelect
                  {...field}
                  placeholder="Select activity type"
                >
                  {GENERAL_ACTIVITY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </StandardSelect>
              )}
            />
          </StandardField>

          {/* Event Name Field */}
          <StandardField
            label={intl.formatMessage({ id: 'app.name' })}
            required
            error={errors.name?.message}
            helpText="Brief name for this farming event"
          >
            <Controller
              name="name"
              control={mainInfoMethods.control}
              render={({ field }) => (
                <StandardInput
                  {...field}
                  placeholder={intl.formatMessage({ id: 'app.nameOfTheEvent' })}
                />
              )}
            />
          </StandardField>

          {/* Description Field */}
          <StandardField 
            label={intl.formatMessage({ id: 'app.observations' })}
            error={errors.description?.message}
            helpText="Optional notes about conditions, outcomes, or relevant details"
          >
            <Controller
              name="description"
              control={mainInfoMethods.control}
              render={({ field }) => (
                <StandardTextarea
                  {...field}
                  placeholder={intl.formatMessage({ id: 'app.descriptionOfTheEvent' })}
                  rows={4}
                />
              )}
            />
          </StandardField>

          {/* Navigation Buttons */}
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

export default GeneralTab;