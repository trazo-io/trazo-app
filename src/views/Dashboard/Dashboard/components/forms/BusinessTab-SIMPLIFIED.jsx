// BUSINESS TAB - TRANSPARENCY & TRUST BUILDING FOCUSED
// Tracks business activities that enhance agricultural transparency and consumer trust
// Phase 1 Enhanced: Trust indicators, progressive disclosure, consumer value messaging

import { HStack, Box, VStack, Text, SimpleGrid } from '@chakra-ui/react';
import {
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea,
  StandardAlert,
  CollapsibleSection,
  SectionHeader,
  SectionBox
} from 'components/Design/StandardComponents';
import { FaChevronLeft, FaChevronRight, FaLeaf, FaSeedling, FaClipboardList } from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { object, string, array } from 'zod';
import CustomFieldsForm from './CustomFieldsForm';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';
// Event Field Registry (Phase 5G — form integration)
import { useFormFields } from 'src/hooks/useFormFields';
import { RegistryFormField } from 'src/components/Forms/RegistryFormField';
// D3 — the stored subtype must follow the chosen activity, not the model default.
import { resolveBusinessSubtype } from 'src/config/events/businessSubtype';

// Business type display names for auto-generated event names
const BUSINESS_TYPE_NAMES = {
  certification: 'Certification Achievement',
  verification: 'Third-Party Verification',
  sustainability_audit: 'Sustainability Assessment',
  transparency: 'Transparency Initiative',
  compliance: 'Regulatory Compliance'
};

// TRANSPARENCY-FOCUSED BUSINESS SCHEMA - Activities that build consumer trust
const formSchemaMainInfo = object({
  business_type: string().min(1, 'Business activity type is required'),
  name: string().optional(),
  certification_type: string().optional(),
  verification_status: string().optional(),
  sustainability_practice: string().optional(),
  observation: string().optional(),
  // Sprint 3 Epic 3.2: Consumer Trust Field for transparency
  verified_certifier_name: string().optional(), // Name of the certifying organization
  certificate_number: string().optional(), // Certificate reference number
  performed_by: string().optional(), // Inspector / auditor / performer (NOP audit trail)
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
}).superRefine((data, ctx) => {
  // Mirrors the backend rule in history/serializers.py: a verification event may not be left
  // "pending" or "not applicable". The form offered both, so a farmer could pick an option the
  // API then refused — the round trip surfaced it, but only after they thought they were done.
  if (
    data.business_type === 'verification' &&
    ['pending', 'not_applicable'].includes(data.verification_status)
  ) {
    ctx.addIssue({
      path: ['verification_status'],
      code: 'custom',
      message: 'A verification event needs a definitive status: verified, in progress or failed'
    });
  }
  // Same shape again: the field renders with a required asterisk for certification events and
  // the API rejects a blank one, but the schema left it optional — so the step advanced, the
  // farmer uploaded photos, and only the POST failed, with a raw "certification_type: ..."
  // toast on a screen that no longer showed the field. Fail here, on the field, instead.
  if (data.business_type === 'certification' && !data.certification_type) {
    ctx.addIssue({
      path: ['certification_type'],
      code: 'custom',
      message: 'Select the certification obtained or renewed (e.g. USDA Organic)'
    });
  }
});

const BusinessTab = forwardRef(
  ({ onSubmitHandler, onDataChange, onPrev, initialValues = {}, hideActions = false }, ref) => {
    const intl = useIntl();

    const methods = useForm({
      resolver: zodResolver(formSchemaMainInfo),
      defaultValues: {
        business_type: initialValues.business_type || '',
        certification_type: initialValues.certification_type || '',
        name: initialValues.name || '',
        verification_status: initialValues.verification_status || 'pending', // F13: backend default; '' fails non-blank ChoiceField (400)
        sustainability_practice: initialValues.sustainability_practice || '',
        observation: initialValues.observation || '',
        // Sprint 3 Epic 3.2: Consumer Trust Field
        verified_certifier_name: initialValues.verified_certifier_name || '',
        certificate_number: initialValues.certificate_number || '',
        performed_by: initialValues.performed_by || '',
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
            const currentValues = methods.getValues();
            onDataChange(currentValues);
          }
        },
        submitForm: () =>
          new Promise((resolve, reject) => {
            methods.handleSubmit(
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [onDataChange]
    );

    // Custom fields state for Phase 2.3
    const [customFields, setCustomFields] = useState(initialValues.custom_fields || []);

    // Update form values when initialValues change
    useEffect(() => {
      if (Object.keys(initialValues).length > 0) {
        methods.reset({
          business_type: initialValues.business_type || '',
          name: initialValues.name || '',
          certification_type: initialValues.certification_type || '',
          verification_status: initialValues.verification_status || 'pending', // F13: backend default; '' fails non-blank ChoiceField (400)
          sustainability_practice: initialValues.sustainability_practice || '',
          observation: initialValues.observation || '',
          // Sprint 3 Epic 3.2: Consumer Trust Field
          verified_certifier_name: initialValues.verified_certifier_name || '',
          certificate_number: initialValues.certificate_number || '',
          performed_by: initialValues.performed_by || '',
          custom_fields: initialValues.custom_fields || []
        });
      }
    }, [initialValues, methods]);

    // Sync custom fields with form
    useEffect(() => {
      methods.setValue('custom_fields', customFields);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customFields]);

    // INFINITE LOOP FIX: Track last sent values to prevent duplicate onDataChange calls
    const lastSentValuesRef = useRef(null);

    const {
      handleSubmit,
      watch,
      formState: { errors }
    } = methods;

    const businessType = watch('business_type');

    // Auto-generate event name from business type (matches Production/Soil/Pest/Weather pattern)
    useEffect(() => {
      if (businessType && BUSINESS_TYPE_NAMES[businessType]) {
        const currentName = methods.getValues('name');
        const autoNames = Object.values(BUSINESS_TYPE_NAMES);
        if (!currentName || !currentName.trim() || autoNames.includes(currentName)) {
          methods.setValue('name', BUSINESS_TYPE_NAMES[businessType], { shouldDirty: false });
        }
      }
    }, [businessType, methods]);

    // Watch specific fields for real-time updates (NOT watch() which returns new ref every render)
    const watchedFields = watch([
      'business_type',
      'name',
      'certification_type',
      'verification_status',
      'sustainability_practice',
      'observation',
      'verified_certifier_name',
      'certificate_number',
      'performed_by'
    ]);

    // Call onDataChange whenever watched form values change (debounced)
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        if (onDataChange && typeof onDataChange === 'function') {
          const currentValues = methods.getValues();

          // INFINITE LOOP FIX: Check if values have actually changed
          const currentValuesString = JSON.stringify(currentValues);
          if (lastSentValuesRef.current === currentValuesString) {
            return;
          }

          onDataChange(currentValues);
          lastSentValuesRef.current = currentValuesString;
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    }, [watchedFields]); // Watch specific fields, not all values

    // Business events do NOT trigger carbon calculations
    // These are administrative/documentation events, not direct agricultural activities
    // Carbon calculations are only appropriate for: Equipment, Soil, Pest, Chemical, Production events

    // NOTE: Business events provide transparency value through:
    // - Certification badges on consumer QR pages
    // - Trust indicators for transparency scores
    // - Verification status for consumer confidence
    // - Documentation of sustainability practices
    //
    // They do NOT generate meaningful carbon emissions and should not call carbon APIs

    const onSubmit = (data) => {
      // Carbon credits are no longer an activity a farmer can log, so this form neither
      // renders nor writes `carbon_credits_earned` / `carbon_credits_unit`. Both keys are
      // absent from the payload rather than sent empty: the columns still hold values on
      // events recorded before the type was withdrawn, and a mutation that names a field its
      // UI does not render is how those get silently zeroed on the next edit.
      const processedData = {
        ...data,
        // D3 — BusinessEvent.type defaults to CE ("Certification Event"). This form never set
        // it, so an inspection, a compliance filing and a carbon-credit transaction all stored
        // and displayed as certifications on the audit PDF and the consumer page. Derive it
        // from the activity the farmer actually picked.
        type: resolveBusinessSubtype(data.business_type)
      };
      onSubmitHandler(processedData);
    };

    // Keep ref in sync with latest handler on every render (avoids stale closures)
    submitHandlerRef.current = onSubmit;

    return (
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ width: '100%' }}>
          <VStack spacing={6} align="stretch">
            {/* One callout, one message — see the note in ChemicalTab-ENHANCED. */}
            <StandardAlert
              status="info"
              title={intl.formatMessage({ id: 'events.callout.business.title' })}>
              <Text fontSize="sm">
                {intl.formatMessage({ id: 'events.callout.business.body' })}
              </Text>
            </StandardAlert>

            {/* Forms are hand-crafted by design: the NOP section grouping below is what
                makes the audit export complete, and the registry renderer flattens it.
                The field registry is the SSOT for DISPLAY surfaces (consumer card, modal,
                timeline) and is enforced here by src/config/events/__tests__/
                formConformance.test.ts, not by a runtime flag. */}
            <>
              {/* Section 1: Business Event Information */}
              <SectionBox>
                <SectionHeader
                  icon={FaClipboardList}
                  title={intl.formatMessage({
                    id: 'events.business.sections.trustBuildingBusinessActivity',
                    defaultMessage: 'Trust-Building Business Activity'
                  })}
                  badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                />{' '}
                <VStack spacing={4} align="stretch">
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.business.fields.businessActivityType',
                        defaultMessage: 'Business Activity Type'
                      })}
                      required
                      error={errors.business_type?.message}
                      helpText={intl.formatMessage({
                        id: 'events.business.help.selectActivitiesThatBuildConsumerTrustAndEnh',
                        defaultMessage:
                          'Certifications, inspections, audits and agreements — what your certifier asks for at renewal'
                      })}>
                      <Controller
                        name="business_type"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardSelect
                            {...field}
                            placeholder={intl.formatMessage({
                              id: 'events.business.placeholders.selectBusinessActivityType',
                              defaultMessage: 'Select business activity type...'
                            })}>
                            <option value="certification">
                              {intl.formatMessage({
                                id: 'events.business.options.certificationAchievementOrganicFairTradeEtc',
                                defaultMessage:
                                  'Certification Achievement (Organic, Fair Trade, etc.)'
                              })}
                            </option>
                            <option value="verification">
                              {intl.formatMessage({
                                id: 'events.business.options.thirdPartyVerificationCompleted',
                                defaultMessage: 'Third-Party Verification Completed'
                              })}
                            </option>
                            <option value="sustainability_audit">
                              {intl.formatMessage({
                                id: 'events.business.options.sustainabilityAssessmentPassed',
                                defaultMessage: 'Sustainability Assessment Passed'
                              })}
                            </option>
                            <option value="transparency">
                              {intl.formatMessage({
                                id: 'events.business.options.transparencyInitiativeLaunched',
                                defaultMessage: 'Transparency Initiative Launched'
                              })}
                            </option>
                            <option value="compliance">
                              {intl.formatMessage({
                                id: 'events.business.options.regulatoryComplianceAchieved',
                                defaultMessage: 'Regulatory Compliance Achieved'
                              })}
                            </option>
                          </StandardSelect>
                        )}
                      />
                    </StandardField>

                    {/* Event Name - Optional, auto-generated from business type if empty */}
                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.business.fields.eventName',
                        defaultMessage: 'Event Name'
                      })}
                      helpText={intl.formatMessage({
                        id: 'events.business.help.autoGeneratedFromActivityTypeCustomizeForSpe',
                        defaultMessage:
                          'Auto-generated from activity type. Customize for specific events.'
                      })}>
                      <StandardInput
                        type="text"
                        placeholder={`e.g., ${
                          BUSINESS_TYPE_NAMES[businessType] || 'Business Event'
                        } - Q1 2025`}
                        {...methods.register('name')}
                      />
                    </StandardField>

                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.business.fields.verificationStatus',
                        defaultMessage: 'Verification Status'
                      })}
                      required={businessType === 'verification'}
                      error={errors.verification_status?.message}
                      helpText={intl.formatMessage({
                        id: 'events.business.help.statusOfVerificationForConsumerTransparency',
                        defaultMessage:
                          'Where this verification stands — it appears in your certifier packet'
                      })}>
                      <Controller
                        name="verification_status"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardSelect {...field}>
                            <option value="pending">
                              {intl.formatMessage({
                                id: 'events.business.options.pendingVerification',
                                defaultMessage: 'Pending Verification'
                              })}
                            </option>
                            <option value="verified">
                              {intl.formatMessage({
                                id: 'events.business.options.verified',
                                defaultMessage: 'Verified'
                              })}
                            </option>
                            <option value="in_progress">
                              {intl.formatMessage({
                                id: 'events.business.options.verificationInProgress',
                                defaultMessage: 'Verification In Progress'
                              })}
                            </option>
                            <option value="failed">
                              {intl.formatMessage({
                                id: 'events.business.options.verificationFailed',
                                defaultMessage: 'Verification Failed'
                              })}
                            </option>
                            <option value="not_applicable">
                              {intl.formatMessage({
                                id: 'events.business.options.notApplicable',
                                defaultMessage: 'Not Applicable'
                              })}
                            </option>
                          </StandardSelect>
                        )}
                      />
                    </StandardField>
                  </SimpleGrid>

                  {/* Certification / verification / audit details.
                      `sustainability_audit` was NOT in this gate until 2026-08-21, yet the
                      certifier packet's business-record table prints a "Certifier / Auditor"
                      and a "Certificate #" column for EVERY business row — so a Real Organic
                      Project inspection printed as "Sustainability Audit … passed" with no
                      auditor and no report number, because the farmer had nowhere to type them.
                      An assessment nobody is named for is an unattributable claim; the render
                      gate has to match what the output prints.
                      Guard: `__tests__/businessCertifierFieldsRender.test.tsx`. */}
                  {(businessType === 'certification' ||
                    businessType === 'verification' ||
                    businessType === 'sustainability_audit') && (
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={
                          businessType === 'certification'
                            ? 'Certification Type'
                            : 'Standard / Audit Type'
                        }
                        required={businessType === 'certification'}
                        error={errors.certification_type?.message}
                        helpText={
                          businessType === 'certification'
                            ? 'Type of certification obtained or renewed'
                            : 'Standard or audit framework used for verification'
                        }>
                        <Controller
                          name="certification_type"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.business.placeholders.selectCertificationType',
                                defaultMessage: 'Select certification type...'
                              })}>
                              <option value="organic_usda">USDA Organic</option>
                              <option value="carbon_neutral">Carbon Neutral Certification</option>
                              <option value="rainforest_alliance">Rainforest Alliance</option>
                              <option value="fair_trade">Fair Trade Certified</option>
                              <option value="regenerative">Regenerative Organic Certified</option>
                              <option value="real_organic">
                                {intl.formatMessage({
                                  id: 'events.business.options.realOrganicProject',
                                  defaultMessage: 'Real Organic Project (ROP)'
                                })}
                              </option>
                              <option value="sustainable_agriculture">
                                {intl.formatMessage({
                                  id: 'events.business.options.sustainableAgricultureStandard',
                                  defaultMessage: 'Sustainable Agriculture Standard'
                                })}
                              </option>
                              <option value="water_stewardship">
                                {intl.formatMessage({
                                  id: 'events.business.options.waterStewardshipCertification',
                                  defaultMessage: 'Water Stewardship Certification'
                                })}
                              </option>
                              {/* Sprint 2 Epic 2.2: Additional certifications */}
                              <option value="global_gap">GlobalG.A.P. Certification</option>
                              <option value="non_gmo">Non-GMO Project Verified</option>
                              {/* F13 fix (2026-06): value must be "cng" to match the
                                    backend CERTIFICATION_TYPE_CHOICES — "certified_naturally_grown"
                                    is not a valid choice and returned a DRF 400 on submit. */}
                              <option value="cng">Certified Naturally Grown (CNG)</option>
                              <option value="food_safety">
                                {intl.formatMessage({
                                  id: 'events.business.options.foodSafetyPrimusGfsSqfBrc',
                                  defaultMessage: 'Food Safety (Primus GFS, SQF, BRC)'
                                })}
                              </option>
                            </StandardSelect>
                          )}
                        />
                      </StandardField>

                      {/* Sprint 3 Epic 3.2: Consumer Trust Field */}
                      <StandardField
                        label={
                          businessType === 'certification'
                            ? 'Certifier Organization Name'
                            : 'Auditing Organization'
                        }
                        error={errors.verified_certifier_name?.message}
                        helpText={
                          businessType === 'certification'
                            ? 'The accredited certifying agent that issued this — your certifier packet lists it beside the certificate number'
                            : 'Name of the auditing or verification body'
                        }>
                        <Controller
                          name="verified_certifier_name"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              placeholder={
                                businessType === 'certification'
                                  ? 'e.g., Oregon Tilth, CCOF, QCS'
                                  : 'e.g., Primus Auditing Ops, SCS Global'
                              }
                            />
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label={
                          businessType === 'certification'
                            ? 'Certificate Number'
                            : 'Report / Reference Number'
                        }
                        error={errors.certificate_number?.message}
                        helpText={
                          businessType === 'certification'
                            ? 'Reference number for the certification document'
                            : 'Audit report or verification reference number'
                        }>
                        <Controller
                          name="certificate_number"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              placeholder={
                                businessType === 'certification'
                                  ? 'Enter certificate reference number (e.g., GGN-123456)'
                                  : 'Enter report/reference number'
                              }
                            />
                          )}
                        />
                      </StandardField>
                    </SimpleGrid>
                  )}
                </VStack>
              </SectionBox>

              {/* Section 2: Sustainability Practice */}
              <SectionBox>
                <SectionHeader
                  icon={FaLeaf}
                  title={intl.formatMessage({
                    id: 'events.business.sections.sustainabilityPractice',
                    defaultMessage: 'Sustainability Practice'
                  })}
                  badge={intl.formatMessage({ id: 'events.section.badge.certifierRecordAndBuyer' })}
                />{' '}
                <StandardField
                  label={intl.formatMessage({
                    id: 'events.business.fields.sustainabilityPracticeImplemented',
                    defaultMessage: 'Sustainability Practice Implemented'
                  })}
                  error={errors.sustainability_practice?.message}
                  helpText={intl.formatMessage({
                    id: 'events.business.help.practiceThatEnhancesCarbonTransparencyOrEnvi',
                    defaultMessage:
                      'Optional — a sustainability practice noted against this activity, shown on your buyer page'
                  })}>
                  <Controller
                    name="sustainability_practice"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardSelect {...field}>
                        <option value="">Select practice...</option>
                        <option value="cover_cropping">
                          {intl.formatMessage({
                            id: 'events.business.options.coverCroppingImplementation',
                            defaultMessage: 'Cover Cropping Implementation'
                          })}
                        </option>
                        <option value="no_till">
                          {intl.formatMessage({
                            id: 'events.business.options.noTillFarmingAdoption',
                            defaultMessage: 'No-Till Farming Adoption'
                          })}
                        </option>
                        <option value="integrated_pest">
                          {intl.formatMessage({
                            id: 'events.business.options.integratedPestManagement',
                            defaultMessage: 'Integrated Pest Management'
                          })}
                        </option>
                        <option value="water_conservation">
                          {intl.formatMessage({
                            id: 'events.business.options.waterConservationMeasures',
                            defaultMessage: 'Water Conservation Measures'
                          })}
                        </option>
                        <option value="renewable_energy">
                          {intl.formatMessage({
                            id: 'events.business.options.renewableEnergyInstallation',
                            defaultMessage: 'Renewable Energy Installation'
                          })}
                        </option>
                        <option value="composting">
                          {intl.formatMessage({
                            id: 'events.business.options.onFarmCompostingProgram',
                            defaultMessage: 'On-Farm Composting Program'
                          })}
                        </option>
                        <option value="biodiversity">
                          {intl.formatMessage({
                            id: 'events.business.options.biodiversityConservation',
                            defaultMessage: 'Biodiversity Conservation'
                          })}
                        </option>
                        <option value="soil_health">
                          {intl.formatMessage({
                            id: 'events.business.options.soilHealthImprovement',
                            defaultMessage: 'Soil Health Improvement'
                          })}
                        </option>
                      </StandardSelect>
                    )}
                  />
                </StandardField>
              </SectionBox>

              {/* Section 3: Farmer's Field Notes & Consumer Transparency */}
              <SectionBox>
                <SectionHeader
                  icon={FaSeedling}
                  title={intl.formatMessage({
                    id: 'events.business.sections.farmerSFieldNotesConsumerTransparency',
                    defaultMessage: "Farmer's Field Notes & Consumer Transparency"
                  })}
                  badge={intl.formatMessage({ id: 'events.section.badge.certifierRecordAndBuyer' })}
                />
                <VStack spacing={4} align="stretch">
                  <StandardField
                    label={
                      businessType === 'certification' ? 'Inspector / Auditor Name' : 'Performed By'
                    }
                    error={errors.performed_by?.message}
                    helpText={
                      businessType === 'certification'
                        ? 'Name and role of the certifying inspector (e.g., Sarah Chen, CCOF Inspector). Required for NOP audit trail.'
                        : 'Name and role of the person who performed this activity'
                    }>
                    <Controller
                      name="performed_by"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput
                          {...field}
                          placeholder={
                            businessType === 'certification'
                              ? 'e.g., Sarah Chen (CCOF Inspector)'
                              : 'e.g., John Doe (Farm Manager)'
                          }
                        />
                      )}
                    />
                  </StandardField>

                  <StandardField
                    label={intl.formatMessage({ id: 'app.observations' }) || 'Observations & Notes'}
                    error={errors.observation?.message}
                    helpText={intl.formatMessage({ id: 'events.common.help.observationAudience' })}>
                    <Controller
                      name="observation"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardTextarea
                          {...field}
                          placeholder={intl.formatMessage({
                            id: 'events.business.placeholders.optionalDescribeHowThisCertificationOrBusine',
                            defaultMessage:
                              'Optional: Describe how this certification or business activity improves transparency, e.g., Certification process improved carbon tracking accuracy, new practice reduced emissions by 15%...'
                          })}
                          rows={4}
                        />
                      )}
                    />
                  </StandardField>
                </VStack>
              </SectionBox>
            </>

            {/* Phase 2.3: Custom Fields Section */}
            <CustomFieldsForm
              customFields={customFields}
              onCustomFieldsChange={setCustomFields}
              eventTypeId={7}
              disabled={false}
            />

            {/* Navigation - Hidden when hideActions is true */}
            {!hideActions && (
              <Box pt={4} mt={4} borderTop="1px" borderColor="gray.200">
                <HStack justify="space-between">
                  <StandardButton
                    variant="outline"
                    onClick={onPrev}
                    leftIcon={<FaChevronLeft />}
                    size="lg">
                    {intl.formatMessage({ id: 'app.previous' }) || 'Previous'}
                  </StandardButton>
                  <StandardButton
                    variant="primary"
                    type="submit"
                    rightIcon={<FaChevronRight />}
                    size="lg">
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
BusinessTab.displayName = 'BusinessTab';

export default BusinessTab;
