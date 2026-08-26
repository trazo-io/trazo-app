import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
// NOTE: Crop selection removed - belongs at Establishment/Parcel level, not Company level
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  SimpleGrid,
  useToast,
  useBreakpointValue
} from '@chakra-ui/react';
import {
  FaRocket,
  FaCheckCircle,
  FaBuilding,
  FaMapMarkerAlt,
  FaLeaf,
  FaPhone,
  FaEnvelope,
  FaChevronRight,
  FaChevronLeft,
  FaSeedling, // Used for sustainability goals
  FaWater, // Used for sustainability goals
  FaRecycle, // Used for sustainability goals
  FaBolt, // Used for sustainability goals
  FaBug, // Used for sustainability goals
  FaStore
} from 'react-icons/fa';
import {
  StandardPage,
  StandardCard,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardButton,
  StandardAlert,
  StandardStepper
} from '../../../../components/Design';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, array, literal } from 'zod';
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
      .or(literal('')),
    // Sustainability (Step 2)
    sustainabilityGoals: array(string()).optional()
  });

// Which schema fields belong to which wizard step. `nextStep` validates only the
// current step's fields, so a farmer is told about a bad value on the step where
// they can actually see and fix it — see FIELDS_BY_STEP usage below.
const FIELDS_BY_STEP = [
  ['name', 'tradename', 'email', 'phone', 'legalStructure'],
  ['address', 'city', 'state', 'zipCode'],
  ['sustainabilityGoals']
];

// CompanyFormData interface (for reference):
// Essential: name, tradename, email, phone, legalStructure
// Location: address, state (2-letter US code), city, zipCode
// Sustainability: sustainabilityGoals
// NOTE: country defaults to 'US' (US-only focus), fiscalId moved to Settings
// website, industry, employeeCount, description, facebook, instagram, certifications, isActive
// removed from onboarding - exist at Establishment level or not essential for transparency

/**
 * Transparency goals — what a farmer states they are aiming at.
 *
 * `titleId` / `descriptionId`, not literals: this array is module-scope, so it cannot call
 * `intl` itself. The card resolves the ids at render, which is what stopped six goal names
 * and six descriptions rendering in English on a Spanish screen.
 *
 * ⛔ `id` is a WIRE VALUE. It is posted as `sustainability_metadata.sustainability_goals` and
 * read back by `history/services/transparency_response_formatter.py`, which maps it to a
 * consumer-facing label. Renaming one here silently changes what a shopper sees; that
 * formatter's map must move with it.
 *
 * ⛔ No per-goal `color`. Each entry used to carry one — green / blue / orange / purple /
 * teal / yellow — and three of those are not Trazo palettes at all (`.claude/rules/frontend.md`:
 * the theme defines `amber`, NOT orange; an `orange.*` token silently resolved to CHAKRA's).
 * MEASURED, the amber ramp cannot carry this tile at any step: it tops out at #E65100, so
 * amber.800 on amber.50 is 2.90:1 where text owes 4.5, and even white on amber.700 is 2.70:1
 * against a 3.0 non-text floor. More basic than the contrast: this is a MULTI-SELECT, and the
 * hue carried no meaning — "Status colour = meaning, never decoration". One brand green for
 * all six, with selection signalled by fill + weight + `aria-pressed`, not by hue.
 */
const SUSTAINABILITY_GOALS = [
  {
    id: 'full_transparency',
    titleId: 'company.form.goal.fullTransparency.title',
    descriptionId: 'company.form.goal.fullTransparency.description',
    icon: FaLeaf
  },
  {
    id: 'water_conservation',
    titleId: 'company.form.goal.waterConservation.title',
    descriptionId: 'company.form.goal.waterConservation.description',
    icon: FaWater
  },
  {
    id: 'soil_health',
    titleId: 'company.form.goal.soilHealth.title',
    descriptionId: 'company.form.goal.soilHealth.description',
    icon: FaSeedling
  },
  {
    id: 'biodiversity',
    titleId: 'company.form.goal.biodiversity.title',
    descriptionId: 'company.form.goal.biodiversity.description',
    icon: FaBug
  },
  {
    id: 'waste_reduction',
    titleId: 'company.form.goal.wasteReduction.title',
    descriptionId: 'company.form.goal.wasteReduction.description',
    icon: FaRecycle
  },
  {
    id: 'renewable_energy',
    titleId: 'company.form.goal.renewableEnergy.title',
    descriptionId: 'company.form.goal.renewableEnergy.description',
    icon: FaBolt
  }
];

function AddCompany({ isEdit = false }) {
  const intl = useIntl();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.userState.user);
  const [currentStep, setCurrentStep] = useState(0);
  const toast = useToast();

  const isMobile = useBreakpointValue({ base: true, smd: false });

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
    },
    {
      title: intl.formatMessage({ id: 'company.form.step.sustainability.title' }),
      shortTitle: intl.formatMessage({ id: 'company.form.step.sustainability.short' }),
      description: intl.formatMessage({ id: 'company.form.step.sustainability.description' }),
      icon: FaLeaf
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
      sustainabilityGoals: [],
      state: '',
      legalStructure: '' // Business entity type
    }
  });

  const {
    handleSubmit,
    watch,
    reset,
    setValue,
    trigger,
    formState: { errors, isValid }
  } = methods;

  const sustainabilityGoals = watch('sustainabilityGoals') || [];

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
      is_active: true,
      // Sustainability data (plain object — DRF JSONField handles serialization)
      sustainability_metadata: {
        sustainability_goals: data.sustainabilityGoals || []
      }
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

  // Only show cancel if user already has a company (not first-time onboarding)
  const userCompanies = useSelector((state) => state.userState.user?.companies || []);
  const hasExistingCompany = userCompanies.length > 0;

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

  const handleSustainabilityToggle = (goalId) => {
    const currentGoals = sustainabilityGoals || [];
    const newGoals = currentGoals.includes(goalId)
      ? currentGoals.filter((id) => id !== goalId)
      : [...currentGoals, goalId];
    setValue('sustainabilityGoals', newGoals);
  };

  /**
   * Sustainability goal tile.
   *
   * ⛔ Every colour here is a `.700` where it paints GLYPHS and a `.500`/`.600` only where it
   * paints a boundary. It used to put white on `${color}.500` (2.78:1 on the green ramp —
   * below even the 3.0 non-text floor) and use `${color}.600` as a text colour (4.12:1 where
   * 14px owes 4.5). Both are named in `.claude/rules/frontend.md` as the exact mistakes that
   * keep coming back, and both were here, on the onboarding screen every new farmer sees.
   *
   * `aria-pressed` because this is a toggle, not a link: the tile's selected state was
   * signalled by colour and a tick glyph alone, so a screen reader announced six identical
   * buttons with no way to tell which were on.
   */
  const SustainabilityGoalCard = ({ goal, isSelected, onToggle }) => (
    <Box
      as="button"
      type="button"
      aria-pressed={isSelected}
      onClick={() => onToggle(goal.id)}
      p={4}
      borderRadius="lg"
      border="2px solid"
      borderColor={isSelected ? 'green.600' : 'gray.200'}
      bg={isSelected ? 'green.50' : 'white'}
      _hover={{
        borderColor: isSelected ? 'green.700' : 'green.500',
        bg: isSelected ? 'green.100' : 'green.50',
        transform: 'translateY(-2px)',
        shadow: 'md'
      }}
      transition="all 0.2s"
      cursor="pointer"
      position="relative"
      w="full">
      {isSelected && (
        <Box
          position="absolute"
          top={2}
          right={2}
          bg="green.700"
          color="white"
          borderRadius="full"
          p={1}>
          <Icon as={FaCheckCircle} boxSize={3} />
        </Box>
      )}

      <VStack spacing={3} align="center">
        <Box
          bg={isSelected ? 'green.700' : 'green.100'}
          color={isSelected ? 'white' : 'green.700'}
          p={3}
          borderRadius="full">
          <Icon as={goal.icon} boxSize={6} />
        </Box>

        <VStack spacing={1} align="center">
          <Text
            fontWeight="bold"
            fontSize="sm"
            color={isSelected ? 'green.800' : 'gray.700'}
            textAlign="center">
            {intl.formatMessage({ id: goal.titleId })}
          </Text>
          <Text
            fontSize="xs"
            color={isSelected ? 'green.800' : 'gray.600'}
            textAlign="center">
            {intl.formatMessage({ id: goal.descriptionId })}
          </Text>
        </VStack>
      </VStack>
    </Box>
  );

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'company.form.page.title' })}
      description={intl.formatMessage({ id: 'company.form.page.description' })}
      showBackButton
      onBack={handleCancel}>
      {/* Modern Progress Stepper */}
      <StandardStepper
        steps={steps}
        currentStep={currentStep}
        completedSteps={getCompletedSteps()}
        allowStepClick={true}
        onStepClick={(step) => setCurrentStep(step)}
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

                {/* Navigation */}
                <HStack spacing={3} justify="flex-end" pt={4}>
                  {!isMobile && hasExistingCompany && (
                    <StandardButton variant="outline" onClick={handleCancel}>
                      {intl.formatMessage({ id: 'app.cancel' })}
                    </StandardButton>
                  )}
                  {/* Deliberately always enabled: nextStep() validates and shows
                      what is wrong. A disabled button gave the farmer a dead
                      control with no stated reason. */}
                  <StandardButton onClick={nextStep} rightIcon={<FaChevronRight />}>
                    {intl.formatMessage({
                      id: isMobile
                        ? 'company.form.btn.continue'
                        : 'company.form.btn.continueToLocation'
                    })}
                  </StandardButton>
                </HStack>
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

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    {intl.formatMessage({
                      id: isMobile ? 'company.form.btn.back' : 'company.form.btn.backToIdentity'
                    })}
                  </StandardButton>

                  <HStack spacing={3}>
                    {!isMobile && (
                      <StandardButton variant="outline" onClick={handleCancel}>
                        {intl.formatMessage({ id: 'app.cancel' })}
                      </StandardButton>
                    )}
                    <StandardButton onClick={nextStep} rightIcon={<FaChevronRight />}>
                      {intl.formatMessage({
                        id: isMobile
                          ? 'company.form.btn.continue'
                          : 'company.form.btn.continueToSustainability'
                      })}
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* Step 2: Sustainability Goals (was Step 3) */}
          {currentStep === 2 && (
            <StandardCard
              title={intl.formatMessage({ id: 'company.form.card.sustainability' })}
              subtitle={intl.formatMessage({ id: 'company.form.card.sustainability.sub' })}>
              <VStack spacing={6} align="stretch">
                {/* Sustainability Goals Grid */}
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {SUSTAINABILITY_GOALS.map((goal) => (
                    <SustainabilityGoalCard
                      key={goal.id}
                      goal={goal}
                      isSelected={sustainabilityGoals.includes(goal.id)}
                      onToggle={handleSustainabilityToggle}
                    />
                  ))}
                </SimpleGrid>

                {sustainabilityGoals.length > 0 && (
                  <StandardAlert
                    status="success"
                    // Pluralised through ICU rather than an "N Goals Selected" template —
                    // "1 Goals Selected" was reachable, and Spanish needs the agreement.
                    title={intl.formatMessage(
                      { id: 'company.form.alert.goalsSelected.title' },
                      { count: sustainabilityGoals.length }
                    )}
                    // ⚠️ Reworded from "showing buyers your sustainability commitment". These
                    // are goals a farmer TICKS during onboarding — nothing verifies them — so
                    // describing them to the farmer as a commitment shoppers will read
                    // overstates what the consumer page can honestly carry. See
                    // `.claude/rules/compliance.md` and the open question in the report.
                    description={intl.formatMessage({
                      id: 'company.form.alert.goalsSelected.body'
                    })}
                  />
                )}

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    {intl.formatMessage({
                      id: isMobile ? 'company.form.btn.back' : 'company.form.btn.backToLocation'
                    })}
                  </StandardButton>

                  <HStack spacing={3}>
                    {!isMobile && (
                      <StandardButton variant="outline" onClick={handleCancel}>
                        {intl.formatMessage({ id: 'app.cancel' })}
                      </StandardButton>
                    )}
                    <StandardButton
                      type="submit"
                      isLoading={isLoading}
                      loadingText={intl.formatMessage({
                        id: isMobile
                          ? 'company.form.btn.creating'
                          : 'company.form.btn.creatingCompany'
                      })}
                      leftIcon={<FaRocket />}>
                      {intl.formatMessage({
                        id: isMobile
                          ? 'company.form.btn.create'
                          : 'company.form.btn.createCompany'
                      })}
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}
        </form>
      </FormProvider>
    </StandardPage>
  );
}

export default AddCompany;
