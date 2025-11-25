// Chakra imports
import {
  Flex,
  HStack,
  Box,
  VStack,
  Text,
  Icon,
  Badge,
  SimpleGrid
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
import { FaChevronLeft, FaChevronRight, FaFileAlt, FaClipboardList, FaCalculator, FaSeedling } from 'react-icons/fa';
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
  duration_hours: string().optional(),
  participants: string().optional(),
  observation: string().optional()
});

const GeneralTab = ({ onSubmitHandler, onDataChange, onPrev, initialValues = {}, hideActions = false }) => {
  const intl = useIntl();

  const mainInfoMethods = useForm({
    resolver: zodResolver(formSchemaMainInfo),
    defaultValues: {
      name: initialValues.name || '',
      type: initialValues.type || '',
      duration_hours: initialValues.duration_hours || '',
      participants: initialValues.participants || '',
      observation: initialValues.observation || initialValues.description || ''
    }
  });

  // Update form values when initialValues change
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      mainInfoMethods.reset({
        name: initialValues.name || '',
        type: initialValues.type || '',
        duration_hours: initialValues.duration_hours || '',
        participants: initialValues.participants || '',
        observation: initialValues.observation || initialValues.description || ''
      });
    }
  }, [initialValues, mainInfoMethods]);

  const {
    handleSubmit: mainInfoSubmit,
    watch,
    formState: { errors }
  } = mainInfoMethods;

  // Real-time field watching for data change updates
  const watchedFields = watch(['name', 'type', 'duration_hours', 'participants', 'observation']);
  const previousValuesRef = useRef({});

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onDataChange && typeof onDataChange === 'function') {
        const currentValues = mainInfoMethods.getValues();
        
        // Only trigger if we have meaningful data
        if (currentValues.name && currentValues.name.trim().length > 0) {
          const relevantFields = ['name', 'type', 'duration_hours', 'participants', 'observation'];
          const currentRelevantValues = {};
          relevantFields.forEach((field) => {
            currentRelevantValues[field] = currentValues[field];
          });

          // Check if values have actually changed
          const hasChanged = JSON.stringify(currentRelevantValues) !== JSON.stringify(previousValuesRef.current);
          
          if (hasChanged) {
            previousValuesRef.current = currentRelevantValues;
            // General events have minimal carbon impact but still call onDataChange for transparency tracking
            onDataChange(currentValues);
          }
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedFields]); // FIXED: Removed onDataChange to prevent infinite loop

  const onSubmit = (data) => {
    onSubmitHandler(data);
  };

  return (
    <FormProvider {...mainInfoMethods}>
      <form onSubmit={mainInfoSubmit(onSubmit)} style={{ width: '100%' }}>
        <VStack spacing={6} align="stretch">
          
          {/* Transparency Focus Alert */}
          <StandardAlert status="info" title="General Farming Activity & Transparency Documentation">
            <HStack spacing={2} mb={2}>
              <Icon as={FaClipboardList} color="blue.500" />
              <Text fontSize="sm" fontWeight="bold">
                Agricultural Activity Transparency
              </Text>
            </HStack>
            <Text fontSize="sm">
              Document general farming activities that contribute to operational transparency. These activities 
              enhance your farm's transparency score and provide valuable context for consumers about daily 
              farming operations and management practices.
            </Text>
          </StandardAlert>

          {/* Section 1: Activity Information */}
          <StandardCard
            title={
              <HStack>
                <Icon as={FaClipboardList} color="green.500" />
                <Text>Activity Information</Text>
                <Badge colorScheme="green" size="sm">Activity Tracking</Badge>
              </HStack>
            }
          >
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
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
                        placeholder="Select activity type..."
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

                <StandardField
                  label="Activity Name"
                  required
                  error={errors.name?.message}
                  helpText="Brief descriptive name for this activity"
                >
                  <Controller
                    name="name"
                    control={mainInfoMethods.control}
                    render={({ field }) => (
                      <StandardInput
                        {...field}
                        placeholder="e.g., Weekly equipment maintenance"
                      />
                    )}
                  />
                </StandardField>
              </SimpleGrid>
            </VStack>
          </StandardCard>

          {/* Section 2: Activity Details & Context */}
          <StandardCard
            title={
              <HStack>
                <Icon as={FaCalculator} color="blue.500" />
                <Text>Activity Details & Context</Text>
                <Badge colorScheme="blue" size="sm">Operational Documentation</Badge>
              </HStack>
            }
          >
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <StandardField
                  label="Duration (hours)"
                  error={errors.duration_hours?.message}
                  helpText="Approximate time spent on this activity"
                >
                  <Controller
                    name="duration_hours"
                    control={mainInfoMethods.control}
                    render={({ field }) => (
                      <StandardInput
                        {...field}
                        type="number"
                        step="0.5"
                        placeholder="e.g., 2.5"
                      />
                    )}
                  />
                </StandardField>

                <StandardField
                  label="People Involved"
                  error={errors.participants?.message}
                  helpText="Number of people who participated"
                >
                  <Controller
                    name="participants"
                    control={mainInfoMethods.control}
                    render={({ field }) => (
                      <StandardInput
                        {...field}
                        type="number"
                        placeholder="e.g., 2"
                      />
                    )}
                  />
                </StandardField>
              </SimpleGrid>
            </VStack>
          </StandardCard>

          {/* Section 3: Transparency Notes */}
          <StandardCard
            title={
              <HStack>
                <Icon as={FaSeedling} color="green.500" />
                <Text>Activity Notes & Consumer Transparency</Text>
                <Badge colorScheme="green" size="sm">Consumer Transparency</Badge>
              </HStack>
            }
          >
            <StandardField 
              label="Activity Notes & Observations"
              error={errors.observation?.message}
              helpText="Share details about this activity that help consumers understand your farming operations"
            >
              <Controller
                name="observation"
                control={mainInfoMethods.control}
                render={({ field }) => (
                  <StandardTextarea
                    {...field}
                    placeholder="Optional: Describe the purpose of this activity, how it contributes to farm operations, quality improvements made, or any interesting observations that consumers might find valuable."
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

export default GeneralTab;