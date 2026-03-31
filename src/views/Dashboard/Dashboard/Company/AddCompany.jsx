import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
// NOTE: Crop selection removed - belongs at Establishment/Parcel level, not Company level
import { Box, VStack, HStack, Text, Icon, SimpleGrid, useToast, useBreakpointValue } from '@chakra-ui/react';
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
import { object, string, array } from 'zod';
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
const companySchema = object({
  // Essential Company Identity
  name: string().min(1, 'Company name is required'),
  tradename: string().optional(),
  email: string().email('Invalid email address'),
  phone: string().min(1, 'Phone number is required'),
  legalStructure: string().optional(),
  // Location fields (Step 1) - Company headquarters address
  address: string().optional(),
  city: string().optional(),
  state: string().min(1, 'State is required'),
  zipCode: string().optional(),
  // Sustainability (Step 2)
  sustainabilityGoals: array(string()).optional()
});

// CompanyFormData interface (for reference):
// Essential: name, tradename, email, phone, legalStructure
// Location: address, state (2-letter US code), city, zipCode
// Sustainability: sustainabilityGoals
// NOTE: country defaults to 'US' (US-only focus), fiscalId moved to Settings
// website, industry, employeeCount, description, facebook, instagram, certifications, isActive
// removed from onboarding - exist at Establishment level or not essential for transparency

// Transparency Goals - What consumers care about seeing
const SUSTAINABILITY_GOALS = [
  {
    id: 'full_transparency',
    title: 'Full Farming Transparency',
    description: 'Document all agricultural practices',
    icon: FaLeaf,
    color: 'green'
  },
  {
    id: 'water_conservation',
    title: 'Water Conservation',
    description: 'Show water-efficient practices',
    icon: FaWater,
    color: 'blue'
  },
  {
    id: 'soil_health',
    title: 'Soil Health Practices',
    description: 'Document soil improvement methods',
    icon: FaSeedling,
    color: 'orange'
  },
  {
    id: 'biodiversity',
    title: 'Biodiversity Support',
    description: 'Share ecosystem-friendly practices',
    icon: FaBug,
    color: 'purple'
  },
  {
    id: 'waste_reduction',
    title: 'Waste Reduction',
    description: 'Track waste minimization efforts',
    icon: FaRecycle,
    color: 'teal'
  },
  {
    id: 'renewable_energy',
    title: 'Clean Energy Use',
    description: 'Document renewable energy adoption',
    icon: FaBolt,
    color: 'yellow'
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
    { title: 'Company Info', shortTitle: 'Company', description: 'Basic company details', icon: FaBuilding },
    { title: 'Location', description: 'Address & contact', icon: FaMapMarkerAlt },
    { title: 'Sustainability', shortTitle: 'Goals', description: 'Goals & practices', icon: FaLeaf }
  ];

  const methods = useForm({
    resolver: zodResolver(companySchema),
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
      let description = 'Please check all required fields and try again.';
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
        title: 'Error Creating Company',
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
        title: intl.formatMessage({ id: "app.companyCreatedSuccessTitle" }),
        description: intl.formatMessage({ id: "app.trialStartedDescription" }),
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      navigate(`/admin/dashboard/farm/add`);
    }
  }, [isSuccessCompany, dataCompany, dispatch, navigate]);

  const handleCancel = () => {
    console.log('🏢 AddCompany: handleCancel called');
    navigate('/admin/dashboard');
  };

  // Step validation - Essential fields only for transparency-first onboarding
  const isStepComplete = (step) => {
    const name = watch('name');
    const email = watch('email');
    const phone = watch('phone');
    const state = watch('state');
    const hasErrors = Object.keys(errors).length > 0;

    switch (step) {
      case 0: // Company Info - name, email, phone required
        return !!name && !!email && !!phone && !hasErrors;
      case 1: // Location - state required for company address
        return !!state;
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

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
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

  // Custom sustainability goal selection component
  const SustainabilityGoalCard = ({ goal, isSelected, onToggle }) => (
    <Box
      as="button"
      type="button"
      onClick={() => onToggle(goal.id)}
      p={4}
      borderRadius="lg"
      border="2px solid"
      borderColor={isSelected ? `${goal.color}.500` : 'gray.200'}
      bg={isSelected ? `${goal.color}.50` : 'white'}
      _hover={{
        borderColor: isSelected ? `${goal.color}.600` : `${goal.color}.300`,
        bg: isSelected ? `${goal.color}.100` : `${goal.color}.50`,
        transform: 'translateY(-2px)',
        shadow: 'md'
      }}
      transition="all 0.2s"
      cursor="pointer"
      position="relative"
      w="full"
    >
      {isSelected && (
        <Box
          position="absolute"
          top={2}
          right={2}
          bg={`${goal.color}.500`}
          color="white"
          borderRadius="full"
          p={1}
        >
          <Icon as={FaCheckCircle} boxSize={3} />
        </Box>
      )}

      <VStack spacing={3} align="center">
        <Box
          bg={isSelected ? `${goal.color}.500` : `${goal.color}.100`}
          color={isSelected ? 'white' : `${goal.color}.600`}
          p={3}
          borderRadius="full"
        >
          <Icon as={goal.icon} boxSize={6} />
        </Box>

        <VStack spacing={1} align="center">
          <Text
            fontWeight="bold"
            fontSize="sm"
            color={isSelected ? `${goal.color}.700` : 'gray.700'}
            textAlign="center"
          >
            {goal.title}
          </Text>
          <Text
            fontSize="xs"
            color={isSelected ? `${goal.color}.600` : 'gray.500'}
            textAlign="center"
          >
            {goal.description}
          </Text>
        </VStack>
      </VStack>
    </Box>
  );

  return (
    <StandardPage
      title="Set Up Your Agricultural Company"
      description="Create your company profile and start building consumer trust through transparency"
      showBackButton
      onBack={handleCancel}
    >
      {/* Modern Progress Stepper */}
      <StandardStepper
        steps={steps}
        currentStep={currentStep}
        completedSteps={getCompletedSteps()}
        allowStepClick={true}
        onStepClick={(step) => setCurrentStep(step)}
      />

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          {/* Step 0: Company Identity - Essential fields only for transparency-first onboarding */}
          {currentStep === 0 && (
            <StandardCard
              title="Company Identity"
              subtitle="Essential details to set up your agricultural company"
            >
              <VStack spacing={6} align="stretch">
                {/* Company Name & Trade Name */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Company Name"
                    required
                    error={errors.name?.message}
                    helpText="Your company's legal registered name"
                  >
                    <StandardInput
                      {...methods.register('name')}
                      placeholder="e.g., Green Valley Farms LLC"
                      leftElement={<Icon as={FaBuilding} color="gray.400" />}
                    />
                  </StandardField>

                  <StandardField
                    label="Trade Name"
                    error={errors.tradename?.message}
                    helpText="Business name if different from legal name (optional)"
                  >
                    <StandardInput
                      {...methods.register('tradename')}
                      placeholder="e.g., Green Valley Organics"
                      leftElement={<Icon as={FaStore} color="gray.400" />}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Email & Phone */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Email Address"
                    required
                    error={errors.email?.message}
                    helpText="Primary contact email for your company"
                  >
                    <StandardInput
                      {...methods.register('email')}
                      type="email"
                      placeholder="contact@greenvalleyfarms.com"
                      leftElement={<Icon as={FaEnvelope} color="gray.400" />}
                    />
                  </StandardField>

                  <StandardField
                    label="Phone Number"
                    required
                    error={errors.phone?.message}
                    helpText="Primary contact number for your farm"
                  >
                    <StandardInput
                      {...methods.register('phone')}
                      type="tel"
                      placeholder="(555) 123-4567"
                      leftElement={<Icon as={FaPhone} color="gray.400" />}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Legal Structure */}
                <StandardField
                  label="Legal Structure"
                  error={errors.legalStructure?.message}
                  helpText="Your business entity type (optional but recommended for B2B)"
                >
                  <StandardSelect
                    {...methods.register('legalStructure')}
                    value={watch('legalStructure') || ''}
                  >
                    <option value="">Select legal structure...</option>
                    <option value="sole_proprietorship">Sole Proprietorship</option>
                    <option value="partnership">Partnership</option>
                    <option value="llc">Limited Liability Company (LLC)</option>
                    <option value="corporation">Corporation</option>
                    <option value="cooperative">Cooperative</option>
                    <option value="family_farm">Family Farm</option>
                  </StandardSelect>
                </StandardField>

                {/* Info Alert */}
                <StandardAlert
                  status="info"
                  title="Quick Setup"
                  description="You can add more details like certifications, description, and social media later in your company settings."
                />

                {/* Navigation */}
                <HStack spacing={3} justify="flex-end" pt={4}>
                  {!isMobile && (
                    <StandardButton variant="outline" onClick={handleCancel}>
                      Cancel
                    </StandardButton>
                  )}
                  <StandardButton
                    onClick={nextStep}
                    rightIcon={<FaChevronRight />}
                    disabled={!isStepComplete(0)}
                  >
                    {isMobile ? 'Continue' : 'Continue to Location'}
                  </StandardButton>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* Step 1: Location Information - Company headquarters */}
          {currentStep === 1 && (
            <StandardCard
              title="Location Details"
              subtitle="Where is your agricultural operation based? (US farms only)"
            >
              <VStack spacing={6} align="stretch">
                {/* Address */}
                <StandardField
                  label="Street Address"
                  error={errors.address?.message}
                  helpText="Physical address of your main operation"
                >
                  <StandardInput
                    {...methods.register('address')}
                    placeholder="123 Farm Road"
                    leftElement={<Icon as={FaMapMarkerAlt} color="gray.400" />}
                  />
                </StandardField>

                {/* City & State */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField label="City" error={errors.city?.message}>
                    <StandardInput {...methods.register('city')} placeholder="Farmington" />
                  </StandardField>

                  <StandardField
                    label="State"
                    required
                    error={errors.state?.message}
                    helpText="Your company's headquarter state"
                  >
                    <StandardSelect {...methods.register('state')} value={watch('state') || ''}>
                      <option value="">Select your state...</option>
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
                  label="ZIP Code"
                  error={errors.zipCode?.message}
                  helpText="5-digit US postal code"
                >
                  <StandardInput
                    {...methods.register('zipCode')}
                    placeholder="12345"
                    maxLength={5}
                  />
                </StandardField>

                {/* Location Info Alert */}
                <StandardAlert
                  status="info"
                  title="Company Location"
                  description="This is your company's headquarters address. Your farm location will be set up in the next step when you create your establishment — that's where regional agricultural context is applied."
                />

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}
                  >
                    {isMobile ? 'Back' : 'Back to Company Info'}
                  </StandardButton>

                  <HStack spacing={3}>
                    {!isMobile && (
                      <StandardButton variant="outline" onClick={handleCancel}>
                        Cancel
                      </StandardButton>
                    )}
                    <StandardButton
                      onClick={nextStep}
                      rightIcon={<FaChevronRight />}
                      disabled={!isStepComplete(1)}
                    >
                      {isMobile ? 'Continue' : 'Continue to Sustainability'}
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* Step 2: Sustainability Goals (was Step 3) */}
          {currentStep === 2 && (
            <StandardCard
              title="Sustainability Goals"
              subtitle="Select your sustainability and transparency objectives"
            >
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
                    title={`${sustainabilityGoals.length} Goals Selected`}
                    description="These goals will be displayed on your consumer-facing product page, showing buyers your sustainability commitment."
                  />
                )}

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}
                  >
                    {isMobile ? 'Back' : 'Back to Location'}
                  </StandardButton>

                  <HStack spacing={3}>
                    {!isMobile && (
                      <StandardButton variant="outline" onClick={handleCancel}>
                        Cancel
                      </StandardButton>
                    )}
                    <StandardButton
                      type="submit"
                      isLoading={isLoading}
                      loadingText={isMobile ? 'Creating...' : 'Creating Company...'}
                      leftIcon={<FaRocket />}
                    >
                      {isMobile ? 'Create' : 'Create Company'}
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
