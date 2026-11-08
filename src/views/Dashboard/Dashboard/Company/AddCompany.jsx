import React, { useEffect, useState } from 'react';
import { useFurthestStep } from 'hooks/useFurthestStep';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
// NOTE: Crop selection removed - belongs at Establishment/Parcel level, not Company level
import { VStack, Icon, SimpleGrid, useToast } from '@chakra-ui/react';
import { FaBuilding, FaMapMarkerAlt, FaPhone, FaEnvelope, FaStore } from 'react-icons/fa';
import {
  StandardPage,
  StandardCard,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardAlert,
  StandardStepper
} from '../../../../components/Design';
import WizardActions from 'components/Design/WizardActions';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, literal } from 'zod';
// @ts-ignore: JS module in TS file
import { useCreateCompanyMutation } from 'store/api/companyApi';
import { setCompany } from 'store/features/companySlice';
// @ts-ignore: JS module in TS file
import { setUserCompany } from 'store/features/userSlice';
// Unused imports removed: Card, CardBody, NewCompany (legacy crop selection components)

// US States - 2-letter codes for company headquarters location
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
];

// Company validation schema - Streamlined for transparency-first onboarding
// Fields removed: website, industry, employeeCount, description, facebook, instagram, certifications, isActive, fiscalId
// These fields either exist at Establishment level, are not essential for transparency, or are in Settings
// See CLAUDE.md "Strategic Architecture Transformation" for rationale
// Mirrors common/validators.py `validate_us_phone` on the backend. Normalize to
// digits rather than matching a punctuation pattern — growers write US numbers
// every possible way ("(559) 555-0142", "+1-559-555-0987", "559.555.0142"), and a
// format regex rejects real numbers. Keep this in step with the server rule so the
// client is never stricter than what the API would accept.
const isValidUsPhone = (value) => {
  let digits = (value || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length !== 10) return false;
  // NANP: area code and exchange code both start 2-9, so "000-000-0000" fails.
  return !'01'.includes(digits[0]) && !'01'.includes(digits[3]);
};

const US_ZIP_PATTERN = /^\d{5}(-\d{4})?$/;

/**
 * ⛔ `value` is a WIRE VALUE — posted as `legal_structure` and stored by
 * `company/models.py`. Only `labelId` is translated. Changing a `value` migrates data.
 */
const LEGAL_STRUCTURES = [
  { value: 'sole_proprietorship', labelId: 'company.form.legalStructure.soleProprietorship' },
  { value: 'partnership', labelId: 'company.form.legalStructure.partnership' },
  { value: 'llc', labelId: 'company.form.legalStructure.llc' },
  { value: 'corporation', labelId: 'company.form.legalStructure.corporation' },
  { value: 'cooperative', labelId: 'company.form.legalStructure.cooperative' },
  { value: 'family_farm', labelId: 'company.form.legalStructure.familyFarm' }
];

/**
 * ⛔ A FUNCTION of `intl`, not a module-level constant.
 *
 * Zod carries its own English message strings, and a schema built at module scope cannot see
 * the locale — so every validation message this form can produce ("Company name is required",
 * "Enter a 5-digit ZIP code…") reached a Spanish-locale farmer in English, no matter what the
 * rest of the page did. The schema is therefore built inside the component, memoised on
 * `intl`, so a locale switch re-derives the messages with it.
 */
const buildCompanySchema = (intl) =>
  object({
    // Essential Company Identity
    // max lengths mirror company/models.py so the client never posts what the
    // serializer will reject (name 150, address 200, phone 20).
    name: string()
      .min(1, intl.formatMessage({ id: 'company.validation.name.required' }))
      .max(150, intl.formatMessage({ id: 'company.validation.name.tooLong' })),
    tradename: string()
      .max(150, intl.formatMessage({ id: 'company.validation.tradename.tooLong' }))
      .optional(),
    email: string()
      .min(1, intl.formatMessage({ id: 'company.validation.email.required' }))
      .email(intl.formatMessage({ id: 'company.validation.email.invalid' })),
    phone: string()
      .min(1, intl.formatMessage({ id: 'company.validation.phone.required' }))
      .max(20, intl.formatMessage({ id: 'company.validation.phone.tooLong' }))
      .refine(isValidUsPhone, intl.formatMessage({ id: 'company.validation.phone.pattern' })),
    legalStructure: string().optional(),
    // Location fields (Step 1) - Company headquarters address
    address: string()
      .max(200, intl.formatMessage({ id: 'company.validation.address.tooLong' }))
      .optional(),
    city: string()
      .max(100, intl.formatMessage({ id: 'company.validation.city.tooLong' }))
      .optional(),
    state: string().min(1, intl.formatMessage({ id: 'company.validation.state.required' })),
    zipCode: string()
      .regex(US_ZIP_PATTERN, intl.formatMessage({ id: 'company.validation.zip.pattern' }))
      .optional()
      .or(literal(''))
  });

// Which schema fields belong to which wizard step. `nextStep` validates only the
// current step's fields, so a farmer is told about a bad value on the step where
// they can actually see and fix it — see FIELDS_BY_STEP usage below.
const FIELDS_BY_STEP = [
  ['name', 'tradename', 'email', 'phone', 'legalStructure'],
  ['address', 'city', 'state', 'zipCode']
];

// CompanyFormData interface (for reference):
// Essential: name, tradename, email, phone, legalStructure
// Location: address, state (2-letter US code), city, zipCode
// NOTE: country defaults to 'US' (US-only focus), fiscalId moved to Settings
// website, industry, employeeCount, description, facebook, instagram, certifications, isActive
// removed from onboarding - exist at Establishment level or not essential for transparency

// The "Sustainability Goals" step was removed by the recordkeeping review (F-11, 2026-10-07):
// a checkbox ticked at sign-up became a public list of environmental-benefit claims with no
// record behind any of them. The stored `sustainability_metadata.sustainability_goals` field is
// kept as it is (no migration, nothing deleted); the wizard simply stopped asking for it, and the
// buyer page stopped printing it.

function AddCompany({ isEdit = false }) {
  const intl = useIntl();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.userState.user);
  const [currentStep, setCurrentStep] = useState(0);
  const furthestStep = useFurthestStep(currentStep);
  const toast = useToast();

  console.log('🏢 AddCompany: Component rendered', { isEdit, currentUser: currentUser?.id });

  // @ts-ignore: Mutation hook
  const [
    createCompany,
    { data: dataCompany, isSuccess: isSuccessCompany, isLoading, error: mutationError }
  ] = useCreateCompanyMutation();

  console.log('🏢 AddCompany: Mutation state', {
    isSuccessCompany,
    isLoading,
    hasData: !!dataCompany,
    dataCompany,
    mutationError
  });

  // Define steps for stepper (Crop selection removed - belongs at Establishment/Parcel level)
  const steps = [
    {
      title: intl.formatMessage({ id: 'company.form.step.identity.title' }),
      shortTitle: intl.formatMessage({ id: 'company.form.step.identity.short' }),
      description: intl.formatMessage({ id: 'company.form.step.identity.description' }),
      icon: FaBuilding
    },
    {
      title: intl.formatMessage({ id: 'company.form.step.location.title' }),
      description: intl.formatMessage({ id: 'company.form.step.location.description' }),
      icon: FaMapMarkerAlt
    }
  ];

  const methods = useForm({
    // Memoised on `intl` so switching locale re-derives every validation message with it.
    resolver: zodResolver(React.useMemo(() => buildCompanySchema(intl), [intl])),
    // Validate a field once it has been touched, and re-check on every keystroke
    // afterwards, so a corrected value clears its error immediately instead of
    // leaving the step gate stuck on a stale failure.
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      state: '',
      legalStructure: '' // Business entity type
    }
  });

  const {
    handleSubmit,
    watch,
    reset,
    trigger,
    formState: { errors, isValid }
  } = methods;

  // Submit was rejected by the resolver. Jump to the step holding the first bad
  // field and say so, rather than leaving the farmer on a button that appears to
  // do nothing at all.
  const handleInvalidSubmit = (formErrors) => {
    const badField = Object.keys(formErrors)[0];
    const stepIndex = FIELDS_BY_STEP.findIndex((fields) => fields.includes(badField));

    if (stepIndex >= 0 && stepIndex !== currentStep) {
      setCurrentStep(stepIndex);
    }

    toast({
      title: intl.formatMessage({ id: 'company.form.toast.invalid.title' }),
      // `formErrors[badField].message` is already localised — the zod schema is built from
      // `intl` above, so it is a translated sentence, not an English one.
      description:
        formErrors[badField]?.message ||
        intl.formatMessage({ id: 'company.form.toast.invalid.body' }),
      status: 'error',
      duration: 5000,
      isClosable: true
    });
  };

  const handleFormSubmit = async (data) => {
    console.log('🏢 AddCompany: handleSubmit called with data:', data);

    if (!currentUser || !currentUser.id) {
      console.error('🏢 AddCompany: No authenticated user found!');
      return;
    }

    // Transform form data to match backend API field names
    // Streamlined for transparency-first onboarding - only essential fields
    const submitData = {
      // Essential Company Identity
      name: data.name,
      tradename: data.tradename || '',
      contact_email: data.email,
      contact_phone: data.phone,
      legal_structure: data.legalStructure || '',
      // Location fields
      address: data.address || '',
      city: data.city || '',
      state: data.state,
      country: 'US', // US-only focus for now
      zip_code: data.zipCode || '',
      // Status
      is_active: true
    };

    console.log('🏢 AddCompany: Submitting company data:', submitData);

    try {
      const result = await createCompany(submitData).unwrap();
      console.log('🏢 AddCompany: Company created successfully:', result);
    } catch (error) {
      console.error('🏢 AddCompany: Failed to create company:', error);

      // Parse DRF field-level validation errors into readable message
      let description = intl.formatMessage({ id: 'company.form.toast.error.body' });
      if (error?.data && typeof error.data === 'object') {
        if (error.data.detail) {
          description = error.data.detail;
        } else if (error.data.message) {
          description = error.data.message;
        } else {
          const fieldErrors = Object.entries(error.data)
            .filter(([, msgs]) => Array.isArray(msgs))
            .map(([field, msgs]) => {
              const label = field.replace(/_/g, ' ');
              return `${label}: ${msgs.join(', ')}`;
            });
          if (fieldErrors.length > 0) {
            description = fieldErrors.join(' | ');
          }
        }
      } else if (error?.message) {
        description = error.message;
      }

      toast({
        title: intl.formatMessage({ id: 'company.form.toast.error.title' }),
        // ⚠️ `description` may still be a SERVER sentence (DRF field errors), which the API
        // returns in English only. It is the last-resort branch: better a true English line
        // than a generic one that hides which field the serializer rejected.
        description,
        status: 'error',
        duration: 6000,
        isClosable: true
      });
    }
  };

  // Handle successful company creation - redirect to establishment form
  useEffect(() => {
    if (isSuccessCompany && dataCompany) {
      dispatch(setCompany(dataCompany));
      const { id, name } = dataCompany;
      // Creator is always Company Admin — include role so WriteAccessGuard works immediately
      dispatch(setUserCompany({ id, name, role: 'Company Admin' }));
      // Trial auto-started on backend — go straight to establishment creation
      toast({
        title: intl.formatMessage({ id: 'app.companyCreatedSuccessTitle' }),
        description: intl.formatMessage({ id: 'app.trialStartedDescription' }),
        status: 'success',
        duration: 5000,
        isClosable: true
      });
      navigate(`/admin/dashboard/farm/add`);
    }
  }, [isSuccessCompany, dataCompany, dispatch, navigate]);

  const handleCancel = () => {
    console.log('🏢 AddCompany: handleCancel called');
    navigate('/admin/dashboard');
  };

  // Step validation - Essential fields only for transparency-first onboarding
  // Drives the stepper's "completed" ticks only. Errors are scoped to the step's
  // own fields — a problem on the Location step must not mark Company Identity
  // incomplete.
  const isStepComplete = (step) => {
    const name = watch('name');
    const email = watch('email');
    const phone = watch('phone');
    const state = watch('state');
    const stepHasErrors = (FIELDS_BY_STEP[step] || []).some((field) => errors[field]);

    switch (step) {
      case 0: // Company Info - name, email, phone required
        return !!name && !!email && !!phone && !stepHasErrors;
      case 1: // Location - state required for company address
        return !!state && !stepHasErrors;
      case 2: // Sustainability - optional
        return true;
      default:
        return false;
    }
  };

  // Get completed steps
  const getCompletedSteps = () => {
    const completed = [];
    for (let i = 0; i < currentStep; i++) {
      if (isStepComplete(i)) {
        completed.push(i);
      }
    }
    return completed;
  };

  // Validate the current step before advancing. Without this, an invalid value on
  // an earlier step (e.g. a malformed email) let the farmer walk to the end and
  // then hit a submit button that silently did nothing, because the resolver
  // rejected the form while the offending field was on a step they could no
  // longer see.
  const nextStep = async () => {
    if (currentStep >= steps.length - 1) return;
    const valid = await trigger(FIELDS_BY_STEP[currentStep]);
    if (!valid) return;
    setCurrentStep(currentStep + 1);
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // handleCropSelect removed - crop selection now happens at Establishment/Parcel level

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'company.form.page.title' })}
      description={intl.formatMessage({ id: 'company.form.page.description' })}
      showBackButton
      onBack={handleCancel}
      // Names where handleCancel goes: the footer has its own previous-step control.
      backLabel={intl.formatMessage({ id: 'common.backToHome' })}>
      {/* Modern Progress Stepper */}
      <StandardStepper
        steps={steps}
        currentStep={currentStep}
        completedSteps={getCompletedSteps()}
        allowStepClick={true}
        furthestStep={furthestStep}
        onStepClick={(step) => (step < currentStep ? setCurrentStep(step) : nextStep())}
      />

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(handleFormSubmit, handleInvalidSubmit)}>
          {/* Step 0: Company Identity - Essential fields only for transparency-first onboarding */}
          {currentStep === 0 && (
            <StandardCard
              title={intl.formatMessage({ id: 'company.form.card.identity' })}
              subtitle={intl.formatMessage({ id: 'company.form.card.identity.sub' })}>
              <VStack spacing={6} align="stretch">
                {/* Company Name & Trade Name */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label={intl.formatMessage({ id: 'company.form.name.label' })}
                    required
                    error={errors.name?.message}
                    helpText={intl.formatMessage({ id: 'company.form.name.help' })}>
                    <StandardInput
                      {...methods.register('name')}
                      placeholder={intl.formatMessage({ id: 'company.form.name.placeholder' })}
                      leftElement={<Icon as={FaBuilding} color="gray.400" />}
                    />
                  </StandardField>

                  <StandardField
                    label={intl.formatMessage({ id: 'company.form.tradename.label' })}
                    error={errors.tradename?.message}
                    helpText={intl.formatMessage({ id: 'company.form.tradename.help' })}>
                    <StandardInput
                      {...methods.register('tradename')}
                      placeholder={intl.formatMessage({ id: 'company.form.tradename.placeholder' })}
                      leftElement={<Icon as={FaStore} color="gray.400" />}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Email & Phone */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label={intl.formatMessage({ id: 'company.form.email.label' })}
                    required
                    error={errors.email?.message}
                    helpText={intl.formatMessage({ id: 'company.form.email.help' })}>
                    <StandardInput
                      {...methods.register('email')}
                      type="email"
                      placeholder={intl.formatMessage({ id: 'company.form.email.placeholder' })}
                      leftElement={<Icon as={FaEnvelope} color="gray.400" />}
                    />
                  </StandardField>

                  <StandardField
                    label={intl.formatMessage({ id: 'company.form.phone.label' })}
                    required
                    error={errors.phone?.message}
                    helpText={intl.formatMessage({ id: 'company.form.phone.help' })}>
                    <StandardInput
                      {...methods.register('phone')}
                      type="tel"
                      placeholder={intl.formatMessage({ id: 'company.form.phone.placeholder' })}
                      leftElement={<Icon as={FaPhone} color="gray.400" />}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Legal Structure */}
                <StandardField
                  label={intl.formatMessage({ id: 'company.form.legalStructure.label' })}
                  error={errors.legalStructure?.message}
                  helpText={intl.formatMessage({ id: 'company.form.legalStructure.help' })}>
                  <StandardSelect
                    {...methods.register('legalStructure')}
                    value={watch('legalStructure') || ''}>
                    {/* ⛔ The `value`s are WIRE VALUES posted as `legal_structure`; only the
                        labels are translated. */}
                    <option value="">
                      {intl.formatMessage({ id: 'company.form.legalStructure.placeholder' })}
                    </option>
                    {LEGAL_STRUCTURES.map(({ value, labelId }) => (
                      <option key={value} value={value}>
                        {intl.formatMessage({ id: labelId })}
                      </option>
                    ))}
                  </StandardSelect>
                </StandardField>

                {/* Info Alert */}
                <StandardAlert
                  status="info"
                  title={intl.formatMessage({ id: 'company.form.alert.quickSetup.title' })}
                  description={intl.formatMessage({ id: 'company.form.alert.quickSetup.body' })}
                />

                <WizardActions
                  primaryLabel={intl.formatMessage({ id: 'app.continue' })}
                  onPrimary={nextStep}
                />
              </VStack>
            </StandardCard>
          )}

          {/* Step 1: Location Information - Company headquarters */}
          {currentStep === 1 && (
            <StandardCard
              title={intl.formatMessage({ id: 'company.form.card.location' })}
              subtitle={intl.formatMessage({ id: 'company.form.card.location.sub' })}>
              <VStack spacing={6} align="stretch">
                {/* Address */}
                <StandardField
                  label={intl.formatMessage({ id: 'company.form.address.label' })}
                  error={errors.address?.message}
                  helpText={intl.formatMessage({ id: 'company.form.address.help' })}>
                  <StandardInput
                    {...methods.register('address')}
                    placeholder={intl.formatMessage({ id: 'company.form.address.placeholder' })}
                    leftElement={<Icon as={FaMapMarkerAlt} color="gray.400" />}
                  />
                </StandardField>

                {/* City & State */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label={intl.formatMessage({ id: 'company.form.city.label' })}
                    error={errors.city?.message}>
                    <StandardInput
                      {...methods.register('city')}
                      placeholder={intl.formatMessage({ id: 'company.form.city.placeholder' })}
                    />
                  </StandardField>

                  <StandardField
                    label={intl.formatMessage({ id: 'company.form.state.label' })}
                    required
                    error={errors.state?.message}
                    helpText={intl.formatMessage({ id: 'company.form.state.help' })}>
                    <StandardSelect {...methods.register('state')} value={watch('state') || ''}>
                      {/* US state names are postal/legal identifiers and stay as they are;
                          only the prompt is translated. */}
                      <option value="">
                        {intl.formatMessage({ id: 'company.form.state.placeholder' })}
                      </option>
                      {US_STATES.map((state) => (
                        <option key={state.code} value={state.code}>
                          {state.name}
                        </option>
                      ))}
                    </StandardSelect>
                  </StandardField>
                </SimpleGrid>

                {/* ZIP Code - single field since US only */}
                <StandardField
                  label={intl.formatMessage({ id: 'company.form.zip.label' })}
                  error={errors.zipCode?.message}
                  helpText={intl.formatMessage({ id: 'company.form.zip.help' })}>
                  <StandardInput
                    {...methods.register('zipCode')}
                    placeholder={intl.formatMessage({ id: 'company.form.zip.placeholder' })}
                    maxLength={5}
                  />
                </StandardField>

                {/* Location Info Alert */}
                <StandardAlert
                  status="info"
                  title={intl.formatMessage({ id: 'company.form.alert.location.title' })}
                  description={intl.formatMessage({ id: 'company.form.alert.location.body' })}
                />

                <WizardActions
                  onBack={previousStep}
                  backLabel={intl.formatMessage({ id: 'common.previousStep' })}
                  backShortLabel={intl.formatMessage({ id: 'app.previous' })}
                  primaryLabel={intl.formatMessage({ id: 'company.form.btn.createCompany' })}
                  primaryLeadsOn={false}
                  isLoading={isLoading}
                  loadingText={intl.formatMessage({ id: 'company.form.btn.creatingCompany' })}
                />
              </VStack>
            </StandardCard>
          )}
        </form>
      </FormProvider>
    </StandardPage>
  );
}

export default AddCompany;
