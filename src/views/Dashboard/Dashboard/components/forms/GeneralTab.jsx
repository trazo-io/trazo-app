// Chakra imports
import { Flex, HStack, Box, VStack, Text, Icon, Badge, SimpleGrid, Switch } from '@chakra-ui/react';
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
  FaSeedling,
  FaExclamationTriangle,
  FaShieldAlt
} from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle
} from 'react';
import { object, string, array } from 'zod';
import CustomFieldsForm from './CustomFieldsForm';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';
// Event Field Registry (Phase 5F — form integration)
import { useFormFields } from 'src/hooks/useFormFields';
import { RegistryFormField } from 'src/components/Forms/RegistryFormField';

// Forms keep their rich hand-crafted rendering. Registry drives display surfaces only.
const USE_FIELD_REGISTRY = false;

// NOP Compliance: Contamination source options (7 CFR 205.272 — commingling
// / contact-with-prohibited-substance prevention). Values must match
// GeneralEvent.CONTAMINATION_SOURCE_CHOICES in trazo-back/history/models.py.
const CONTAMINATION_SOURCE_OPTIONS = [
  { value: 'spray_drift', label: 'Spray Drift from Adjacent Land' },
  { value: 'equipment', label: 'Equipment Contamination' },
  { value: 'storage', label: 'Storage Commingling' },
  { value: 'water', label: 'Water Contamination' },
  { value: 'soil', label: 'Soil Contamination' },
  { value: 'other', label: 'Other' }
];

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
    value: 'precision_ag',
    label: '🛰️ Precision Agriculture',
    description: 'Drone surveys, sensor readings, GPS mapping'
  },
  {
    value: 'emergency',
    label: '⚠️ Emergency/Storm Response',
    description: 'Storm cleanup, damage repair, emergency actions'
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
  // NOP Compliance: Contamination Incident Reporting (7 CFR 205.272).
  // Booleans are stored as 'true'/'false' strings to match the Switch
  // controller pattern used in ChemicalTab; NewEvent.jsx converts to real
  // booleans before submit.
  is_contamination_incident: string().optional(),
  contamination_source: string().optional(),
  contamination_affected_area: string().optional(),
  corrective_action_taken: string().optional(),
  corrective_action_date: string().optional(),
  certifier_notified: string().optional(),
  certifier_notification_date: string().optional(),
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

    // NOP contamination fields arrive from the backend as real booleans/strings;
    // the Switch controllers need the 'true'/'false' string shape.
    const boolToString = (v) => {
      if (v === true || v === 'true') return 'true';
      if (v === false || v === 'false') return 'false';
      return '';
    };

    const mainInfoMethods = useForm({
      resolver: zodResolver(formSchemaMainInfo),
      defaultValues: {
        name: initialValues.name || '',
        type: initialValues.type || '',
        duration_hours: initialValues.duration_hours || '',
        participants: initialValues.participants || '',
        observation: initialValues.observation || initialValues.description || '',
        // NOP contamination incident fields
        is_contamination_incident: boolToString(initialValues.is_contamination_incident),
        contamination_source: initialValues.contamination_source || '',
        contamination_affected_area:
          initialValues.contamination_affected_area != null
            ? String(initialValues.contamination_affected_area)
            : '',
        corrective_action_taken: initialValues.corrective_action_taken || '',
        corrective_action_date: initialValues.corrective_action_date || '',
        certifier_notified: boolToString(initialValues.certifier_notified),
        certifier_notification_date: initialValues.certifier_notification_date || '',
        custom_fields: initialValues.custom_fields || []
      }
    });

    // Ref to always hold the latest submit handler, avoiding stale closures in useImperativeHandle
    const submitHandlerRef = useRef(null);

    // Expose flushData and submitForm methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        flushData: () => {
          if (onDataChange) {
            const currentValues = mainInfoMethods.getValues();
            onDataChange(currentValues);
          }
        },
        submitForm: () =>
          new Promise((resolve, reject) => {
            mainInfoMethods.handleSubmit(
              (data) => {
                submitHandlerRef.current(data);
                resolve();
              },
              (errors) => {
                reject(errors);
              }
            )();
          })
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
          is_contamination_incident: boolToString(initialValues.is_contamination_incident),
          contamination_source: initialValues.contamination_source || '',
          contamination_affected_area:
            initialValues.contamination_affected_area != null
              ? String(initialValues.contamination_affected_area)
              : '',
          corrective_action_taken: initialValues.corrective_action_taken || '',
          corrective_action_date: initialValues.corrective_action_date || '',
          certifier_notified: boolToString(initialValues.certifier_notified),
          certifier_notification_date: initialValues.certifier_notification_date || '',
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
    const watchedFields = watch([
      'name',
      'type',
      'duration_hours',
      'participants',
      'observation',
      'is_contamination_incident',
      'contamination_source',
      'contamination_affected_area',
      'corrective_action_taken',
      'corrective_action_date',
      'certifier_notified',
      'certifier_notification_date',
      'custom_fields'
    ]);
    const isContaminationIncident = watchedFields[5] === 'true';
    const isCertifierNotified = watchedFields[10] === 'true';
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
              'is_contamination_incident',
              'contamination_source',
              'contamination_affected_area',
              'corrective_action_taken',
              'corrective_action_date',
              'certifier_notified',
              'certifier_notification_date',
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
      // F39 fix (2026-06): guard the contamination-incident toggle.
      const isIncident = data.is_contamination_incident === 'true';
      if (isIncident && !data.contamination_source) {
        // The "required" marker on contamination_source was cosmetic — enforce it.
        mainInfoMethods.setError('contamination_source', {
          type: 'manual',
          message: 'Contamination source is required when logging an incident'
        });
        return;
      }
      if (!isIncident) {
        // Don't persist orphaned contamination columns when the toggle is OFF
        // (e.g. fields filled, then toggled off) — they'd save with the incident
        // flag false but populated source/area.
        data.contamination_source = '';
        data.contamination_affected_area = '';
      }
      onSubmitHandler(data);
    };

    // Keep ref in sync with latest handler on every render (avoids stale closures)
    submitHandlerRef.current = onSubmit;

    // Registry-driven form fields (Phase 5F)
    // When VITE_USE_FIELD_REGISTRY=true, fields are rendered from the registry
    // instead of hardcoded JSX. This makes "add a field" a 2-file operation.
    const registryFormFields = useFormFields({
      eventType: 'general',
      subtype: undefined,
      surface: 'form'
    });

    // Group registry fields by tier for section organization
    const immediateFields = useMemo(
      () => registryFormFields.fields.filter((f) => f.surfaces?.form === 'immediate'),
      [registryFormFields.fields]
    );
    const secondaryFields = useMemo(
      () => registryFormFields.fields.filter((f) => f.surfaces?.form === 'secondary'),
      [registryFormFields.fields]
    );
    const detailFields = useMemo(
      () => registryFormFields.fields.filter((f) => f.surfaces?.form === 'details'),
      [registryFormFields.fields]
    );

    const watchedValues = mainInfoMethods.watch();

    return (
      <FormProvider {...mainInfoMethods}>
        <form onSubmit={mainInfoSubmit(onSubmit)} noValidate style={{ width: '100%' }}>
          <VStack spacing={6} align="stretch">
            {/* Sprint 2: Renamed to "Other Farm Activities" with better guidance */}
            <StandardAlert status="info" title="Other Farm Activities & Transparency Documentation">
              <HStack spacing={2} mb={2}>
                <Icon as={FaClipboardList} color="blue.500" />
                <Text fontSize="sm" fontWeight="bold">
                  When to use this category:
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

            {USE_FIELD_REGISTRY ? (
              <>
                {/* === REGISTRY-DRIVEN FORM (Phase 5F) === */}
                {/* Section 1: Immediate tier fields (Activity Info) */}
                {immediateFields.length > 0 && (
                  <SectionBox variant="default">
                    <SectionHeader
                      icon={FaClipboardList}
                      iconColor="green.500"
                      title="Other Farm Activity Information"
                      badge="Activity Tracking"
                      badgeColorScheme="green"
                    />
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {immediateFields.map((field) => (
                        <RegistryFormField
                          key={field.name}
                          field={field}
                          control={mainInfoMethods.control}
                          eventData={watchedValues}
                          errors={errors}
                        />
                      ))}
                    </SimpleGrid>
                  </SectionBox>
                )}

                {/* Section 2: Secondary tier fields (Notes & Transparency) */}
                {secondaryFields.length > 0 && (
                  <SectionBox variant="default">
                    <SectionHeader
                      icon={FaSeedling}
                      iconColor="green.500"
                      title="Farmer's Field Notes & Consumer Transparency"
                      badge="Consumer Transparency"
                      badgeColorScheme="green"
                    />
                    <VStack spacing={4} align="stretch">
                      {secondaryFields.map((field) => (
                        <RegistryFormField
                          key={field.name}
                          field={field}
                          control={mainInfoMethods.control}
                          eventData={watchedValues}
                          errors={errors}
                        />
                      ))}
                    </VStack>
                  </SectionBox>
                )}

                {/* Section 3: Details tier fields (Additional context) */}
                {detailFields.length > 0 && (
                  <SectionBox variant="default">
                    <SectionHeader
                      icon={FaCalculator}
                      iconColor="blue.500"
                      title="Additional Context"
                      badge="Optional"
                      badgeColorScheme="gray"
                    />
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {detailFields.map((field) => (
                        <RegistryFormField
                          key={field.name}
                          field={field}
                          control={mainInfoMethods.control}
                          eventData={watchedValues}
                          errors={errors}
                        />
                      ))}
                    </SimpleGrid>
                  </SectionBox>
                )}
              </>
            ) : (
              <>
                {/* === LEGACY FORM (unchanged, used when flag is OFF) === */}

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

                {/*
                  Section 4: NOP Compliance — Contamination Incident Reporting.
                  7 CFR 205.272 (commingling / prohibited-substance contact
                  prevention). Only the toggle is always visible; incident
                  details unfold when the operator confirms an incident, and
                  the certifier-notification date unfolds when notification is
                  confirmed. Without this UI, farmers have no way to create
                  the records the "Contamination Incident Log" section of the
                  audit PDF renders — so the PDF would always be empty even
                  when drift/commingling happened.
                */}
                <SectionBox variant="default">
                  <SectionHeader
                    icon={FaShieldAlt}
                    iconColor="orange.500"
                    title="NOP Contamination Incident"
                    badge="7 CFR 205.272"
                    badgeColorScheme="orange"
                  />
                  <VStack spacing={4} align="stretch">
                    <HStack
                      justify="space-between"
                      p={3}
                      bg="orange.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="orange.200"
                    >
                      <Box>
                        <HStack spacing={2} mb={1}>
                          <Icon as={FaExclamationTriangle} color="orange.500" />
                          <Text fontSize="sm" fontWeight="bold">
                            Is this event documenting a contamination incident?
                          </Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.600">
                          Toggle ON for spray drift, commingling, or any contact with a prohibited
                          substance. Leave OFF for routine general activity.
                        </Text>
                      </Box>
                      <Controller
                        name="is_contamination_incident"
                        control={mainInfoMethods.control}
                        render={({ field }) => (
                          <Switch
                            isChecked={field.value === 'true'}
                            onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                            colorScheme="orange"
                            size="lg"
                          />
                        )}
                      />
                    </HStack>

                    {isContaminationIncident && (
                      <VStack spacing={4} align="stretch">
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          <StandardField
                            label="Contamination Source"
                            required
                            error={errors.contamination_source?.message}
                            helpText="Origin of the prohibited-substance contact"
                          >
                            <Controller
                              name="contamination_source"
                              control={mainInfoMethods.control}
                              render={({ field }) => (
                                <StandardSelect {...field} placeholder="Select source...">
                                  {CONTAMINATION_SOURCE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </StandardSelect>
                              )}
                            />
                          </StandardField>

                          <StandardField
                            label="Affected Area (acres)"
                            error={errors.contamination_affected_area?.message}
                            helpText="Approximate acreage impacted"
                          >
                            <Controller
                              name="contamination_affected_area"
                              control={mainInfoMethods.control}
                              render={({ field }) => (
                                <StandardInput
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="e.g., 3.5"
                                />
                              )}
                            />
                          </StandardField>
                        </SimpleGrid>

                        <StandardField
                          label="Corrective Action Taken"
                          error={errors.corrective_action_taken?.message}
                          helpText="Document what was done to remediate (buffer, quarantine, sampling, etc.)"
                        >
                          <Controller
                            name="corrective_action_taken"
                            control={mainInfoMethods.control}
                            render={({ field }) => (
                              <StandardTextarea
                                {...field}
                                placeholder="Describe the corrective actions taken in response to this incident."
                                rows={4}
                              />
                            )}
                          />
                        </StandardField>

                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          <StandardField
                            label="Corrective Action Date"
                            error={errors.corrective_action_date?.message}
                            helpText="Date the corrective action was completed"
                          >
                            <Controller
                              name="corrective_action_date"
                              control={mainInfoMethods.control}
                              render={({ field }) => <StandardInput {...field} type="date" />}
                            />
                          </StandardField>
                        </SimpleGrid>

                        <HStack
                          justify="space-between"
                          p={3}
                          bg="blue.50"
                          borderRadius="md"
                          border="1px solid"
                          borderColor="blue.200"
                        >
                          <Box>
                            <Text fontSize="sm" fontWeight="bold">
                              Certifier Notified?
                            </Text>
                            <Text fontSize="xs" color="gray.600">
                              NOP requires notifying the certifying agent of contamination events.
                            </Text>
                          </Box>
                          <Controller
                            name="certifier_notified"
                            control={mainInfoMethods.control}
                            render={({ field }) => (
                              <Switch
                                isChecked={field.value === 'true'}
                                onChange={(e) =>
                                  field.onChange(e.target.checked ? 'true' : 'false')
                                }
                                colorScheme="blue"
                                size="lg"
                              />
                            )}
                          />
                        </HStack>

                        {isCertifierNotified && (
                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                            <StandardField
                              label="Certifier Notification Date"
                              error={errors.certifier_notification_date?.message}
                              helpText="Date the certifier was notified"
                            >
                              <Controller
                                name="certifier_notification_date"
                                control={mainInfoMethods.control}
                                render={({ field }) => <StandardInput {...field} type="date" />}
                              />
                            </StandardField>
                          </SimpleGrid>
                        )}
                      </VStack>
                    )}
                  </VStack>
                </SectionBox>
              </>
            )}

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
