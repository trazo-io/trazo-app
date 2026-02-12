// Chakra imports
import { Flex, HStack, Box, VStack, Text, Icon, Badge, SimpleGrid } from '@chakra-ui/react';
import {
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea,
  StandardAlert,
  StandardCard,
  SectionHeader,
  SectionBox
} from 'components/Design/StandardComponents';
import {
  FaChevronLeft,
  FaChevronRight,
  FaFileAlt,
  FaClipboardList,
  FaCalculator,
  FaSeedling
} from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { object, string, array } from 'zod';
import CustomFieldsForm from './CustomFieldsForm';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';

// Sprint 2 Epic 2.1: Renamed from "General" to "Other Farm Activities"
// Activity types for farm activities that don't fit specialized categories
// Examples: administrative tasks, team coordination, facility maintenance
const OTHER_FARM_ACTIVITY_TYPES = [
  {
    value: 'maintenance',
    label: '🔧 Farm Maintenance',
    description: 'Facility repairs, cleaning, organization'
  },
  {
    value: 'planning',
    label: '📋 Planning Activity',
    description: 'Crop planning, scheduling, strategy meetings'
  },
  {
    value: 'training',
    label: '📚 Training/Education',
    description: 'Staff training, certifications, learning'
  },
  {
    value: 'documentation',
    label: '📝 Record Keeping',
    description: 'Documentation, filing, data entry'
  },
  {
    value: 'inspection',
    label: '🔍 Inspection/Audit',
    description: 'Quality checks, audits, compliance reviews'
  },
  {
    value: 'meeting',
    label: '👥 Team Meeting',
    description: 'Staff coordination, planning sessions'
  },
  {
    value: 'community',
    label: '🤝 Community Engagement',
    description: 'Farm tours, community events, outreach'
  },
  {
    value: 'other',
    label: '📌 Other Activity',
    description: 'Activities not covered by other categories'
  }
];

const formSchemaMainInfo = object({
  name: string().min(1, 'Event name is required'),
  type: string().min(1, 'Activity type is required'),
  duration_hours: string().optional(),
  participants: string().optional(),
  observation: string().optional(),
  custom_fields: array(
    object({
      id: string().optional(),
      label: string(),
      value: string(),
      field_type: string(),
      visibility: string(),
      link_url: string().optional(),
      verification: string().optional(),
      created_at: string().optional(),
      photo_id: string().optional()
    })
  ).optional()
});

const GeneralTab = forwardRef(
  ({ onSubmitHandler, onDataChange, onPrev, initialValues = {}, hideActions = false }, ref) => {
    const intl = useIntl();

    const mainInfoMethods = useForm({
      resolver: zodResolver(formSchemaMainInfo),
      defaultValues: {
        name: initialValues.name || '',
        type: initialValues.type || '',
        duration_hours: initialValues.duration_hours || '',
        participants: initialValues.participants || '',
        observation: initialValues.observation || initialValues.description || '',
        custom_fields: initialValues.custom_fields || []
      }
    });

    // DEBOUNCE FIX: Expose flushData method to parent via ref
    // This allows NewEvent.jsx to force-sync form data before step change
    useImperativeHandle(
      ref,
      () => ({
        flushData: () => {
          if (onDataChange) {
            const currentValues = mainInfoMethods.getValues();
            console.log('[GeneralTab] 🔄 flushData called - syncing form data immediately');
            onDataChange(currentValues);
          }
        }
      }),
      [onDataChange, mainInfoMethods]
    );

    // Custom fields state for Phase 2.3
    const [customFields, setCustomFields] = useState(initialValues.custom_fields || []);

    // Update form values when initialValues change
    useEffect(() => {
      if (Object.keys(initialValues).length > 0) {
        mainInfoMethods.reset({
          name: initialValues.name || '',
          type: initialValues.type || '',
          duration_hours: initialValues.duration_hours || '',
          participants: initialValues.participants || '',
          observation: initialValues.observation || initialValues.description || '',
          custom_fields: initialValues.custom_fields || []
        });
      }
    }, [initialValues, mainInfoMethods]);

    // Sync custom fields with form
    useEffect(() => {
      mainInfoMethods.setValue('custom_fields', customFields);
    }, [customFields, mainInfoMethods]);

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
            const relevantFields = [
              'name',
              'type',
              'duration_hours',
              'participants',
              'observation',
              'custom_fields'
            ];
            const currentRelevantValues = {};
            relevantFields.forEach((field) => {
              currentRelevantValues[field] = currentValues[field];
            });

            // Check if values have actually changed
            const hasChanged =
              JSON.stringify(currentRelevantValues) !== JSON.stringify(previousValuesRef.current);

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
            {/* Sprint 2: Renamed to "Other Farm Activities" with better guidance */}
            <StandardAlert status="info" title="Other Farm Activities & Transparency Documentation">
              <HStack spacing={2} mb={2}>
                <Icon as={FaClipboardList} color="blue.500" />
                <Text fontSize="sm" fontWeight="bold">
                  📌 When to use this category:
                </Text>
              </HStack>
              <Text fontSize="sm">
                Use "Other Farm Activities" for activities that don't fit in specialized event types
                like Production, Chemical Application, Soil Management, etc. Examples include:
                administrative tasks, team meetings, farm tours, facility maintenance, record
                keeping, and community engagement. These activities contribute to your farm's
                transparency story.
              </Text>
            </StandardAlert>

            {/* Section 1: Activity Information */}
            <SectionBox variant="default">
              <SectionHeader
                icon={FaClipboardList}
                iconColor="green.500"
                title="Other Farm Activity Information"
                badge="Activity Tracking"
                badgeColorScheme="green"
              />
              <VStack spacing={4} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <StandardField
                    label="Activity Type"
                    required
                    error={errors.type?.message}
                    helpText="What type of farm activity?"
                  >
                    <Controller
                      name="type"
                      control={mainInfoMethods.control}
                      render={({ field }) => (
                        <StandardSelect {...field} placeholder="Select activity type...">
                          {OTHER_FARM_ACTIVITY_TYPES.map((type) => (
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
            </SectionBox>

            {/* Section 2: Activity Details & Context */}
            <SectionBox variant="default">
              <SectionHeader
                icon={FaCalculator}
                iconColor="blue.500"
                title="Activity Details & Context"
                badge="Operational Documentation"
                badgeColorScheme="blue"
              />
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
                        <StandardInput {...field} type="number" placeholder="e.g., 2" />
                      )}
                    />
                  </StandardField>
                </SimpleGrid>
              </VStack>
            </SectionBox>

            {/* Section 3: Farmer's Field Notes & Consumer Transparency */}
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
            </SectionBox>

            {/* Phase 2.3: Custom Fields Section */}
            <CustomFieldsForm
              customFields={customFields}
              onCustomFieldsChange={setCustomFields}
              eventTypeId={3}
              disabled={false}
            />

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
  }
);

// Add display name for better debugging
GeneralTab.displayName = 'GeneralTab';

export default GeneralTab;
