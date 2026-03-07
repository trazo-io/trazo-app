import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  SimpleGrid,
  Switch,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useToast,
  useBreakpointValue,
  Text,
  Icon
} from '@chakra-ui/react';
import {
  StandardPage,
  StandardCard,
  StandardField,
  StandardInput,
  StandardTextarea,
  StandardSelect,
  StandardButton,
  StandardAlert,
  StandardStepper
} from '../../../../../components/Design';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, boolean, number } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  FaBuilding,
  FaMapMarkedAlt,
  FaPhone,
  FaEnvelope,
  FaChevronRight,
  FaChevronLeft
} from 'react-icons/fa';

// Form Schema
const companySchema = object({
  name: string().min(1, 'Company name is required').max(100, 'Name too long'),
  email: string().email('Invalid email format'),
  phone: string().optional(),
  address: string().optional(),
  country: string().optional(),
  state: string().optional(),
  city: string().optional(),
  zipCode: string().optional(),
  website: string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.length === 0) return true;
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Invalid website URL' }
    ),
  description: string().optional(),
  employeeCount: number().optional(),
  isActive: boolean().default(true),
  industry: string().optional(),
  // New required fields for agricultural compliance
  legalStructure: string().min(1, 'Legal structure is required'),
  primaryCommodities: string().min(1, 'Primary agricultural focus is required'),
  sustainabilityCommitment: string().optional(),
  // Social media fields moved from establishment level
  facebook: string().optional(),
  instagram: string().optional()
});

interface CompanyFormData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  website?: string;
  description?: string;
  employeeCount?: number;
  isActive: boolean;
  industry?: string;
  // New required fields for agricultural compliance
  legalStructure: string;
  primaryCommodities: string;
  sustainabilityCommitment?: string;
  // Social media fields moved from establishment level
  facebook?: string;
  instagram?: string;
}

interface StandardizedCompanyFormProps {
  onSubmit: (data: CompanyFormData) => void;
  onCancel: () => void;
  initialData?: Partial<CompanyFormData>;
  isLoading?: boolean;
  isEdit?: boolean;
}

export const StandardizedCompanyForm: React.FC<StandardizedCompanyFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  isEdit = false
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const intl = useIntl();
  const toast = useToast();
  const navigate = useNavigate();
  const isMobile = useBreakpointValue({ base: true, smd: false });

  // Define steps for stepper
  const steps = [
    { title: 'Company Info', description: 'Basic company details', icon: FaBuilding },
    { title: 'Location', description: 'Address & contact', icon: FaMapMarkedAlt }
  ];

  const methods = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      isActive: true,
      employeeCount: 0,
      ...initialData
    }
  });

  const {
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid }
  } = methods;

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({ ...methods.getValues(), ...initialData });
    }
  }, [initialData, reset, methods]);

  const onSubmitForm = (data: CompanyFormData) => {
    console.log('📝 StandardizedCompanyForm: onSubmitForm called with data:', data);
    console.log('📝 StandardizedCompanyForm: Calling parent onSubmit...');

    try {
      onSubmit(data);
      console.log('📝 StandardizedCompanyForm: Parent onSubmit succeeded');
      toast({
        title: isEdit ? 'Company Updated' : 'Company Created',
        description: `Company "${data.name}" has been ${
          isEdit ? 'updated' : 'created'
        } successfully.`,
        status: 'success',
        duration: 5000,
        isClosable: true
      });
    } catch (error) {
      console.error('📝 StandardizedCompanyForm: Parent onSubmit failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to save company. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  // Step validation
  const isStepComplete = (step: number) => {
    const name = watch('name');
    const email = watch('email');
    const legalStructure = watch('legalStructure');
    const primaryCommodities = watch('primaryCommodities');
    const hasErrors = Object.keys(errors).length > 0;

    // Debug logging
    console.log('Step validation debug:', {
      step,
      name,
      email,
      legalStructure,
      primaryCommodities,
      hasErrors,
      errors
    });

    switch (step) {
      case 0:
        const isComplete =
          !!name && !!email && !!legalStructure && !!primaryCommodities && !hasErrors;
        console.log('Step 0 validation:', {
          name: !!name,
          email: !!email,
          legalStructure: !!legalStructure,
          primaryCommodities: !!primaryCommodities,
          hasErrors,
          isComplete
        });
        return isComplete;
      case 1:
        return true; // Location and additional details are optional
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

  return (
    <StandardPage
      title={isEdit ? 'Edit Company' : 'Add New Company'}
      description={
        isEdit ? 'Update company information' : 'Register your agricultural company with Trazo'
      }
      showBackButton
      onBack={onCancel}
      rightAction={
        <StandardButton variant="outline" onClick={() => navigate('/dashboard/companies')}>
          View All Companies
        </StandardButton>
      }
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
        <form onSubmit={handleSubmit(onSubmitForm)}>
          {/* Step 0: Basic Information */}
          {currentStep === 0 && (
            <StandardCard
              title="Company Information"
              subtitle="Basic details about your agricultural company"
            >
              <VStack spacing={6} align="stretch">
                {/* Company Name & Email */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Company Name"
                    required
                    error={errors.name?.message}
                    helpText="Enter your company's legal name"
                  >
                    <StandardInput
                      {...methods.register('name')}
                      placeholder="e.g., Green Valley Farms LLC"
                      leftElement={<Icon as={FaBuilding} color="gray.400" />}
                    />
                  </StandardField>

                  <StandardField
                    label="Email Address"
                    required
                    error={errors.email?.message}
                    helpText="Primary contact email for the company"
                  >
                    <StandardInput
                      {...methods.register('email')}
                      type="email"
                      placeholder="contact@greenvalleyfarms.com"
                      leftElement={<Icon as={FaEnvelope} color="gray.400" />}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Phone & Website */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Phone Number"
                    error={errors.phone?.message}
                    helpText="Company contact phone number"
                  >
                    <StandardInput
                      {...methods.register('phone')}
                      type="tel"
                      placeholder="(555) 123-4567"
                      leftElement={<Icon as={FaPhone} color="gray.400" />}
                    />
                  </StandardField>

                  <StandardField
                    label="Website"
                    error={errors.website?.message}
                    helpText="Company website URL"
                  >
                    <StandardInput
                      {...methods.register('website')}
                      type="url"
                      placeholder="https://www.greenvalleyfarms.com"
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Legal Structure & Primary Commodities */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Legal Structure"
                    required
                    error={errors.legalStructure?.message}
                    helpText="Business legal structure for compliance"
                  >
                    <StandardSelect {...methods.register('legalStructure')}>
                      <option value="">Select legal structure...</option>
                      <option value="sole_proprietorship">Sole Proprietorship</option>
                      <option value="partnership">Partnership</option>
                      <option value="llc">Limited Liability Company (LLC)</option>
                      <option value="corporation">Corporation</option>
                      <option value="s_corporation">S Corporation</option>
                      <option value="cooperative">Agricultural Cooperative</option>
                      <option value="family_farm">Family Farm Corporation</option>
                    </StandardSelect>
                  </StandardField>

                  <StandardField
                    label="Primary Agricultural Focus"
                    required
                    error={errors.primaryCommodities?.message}
                    helpText="Main crops or agricultural commodities"
                  >
                    <StandardSelect {...methods.register('primaryCommodities')}>
                      <option value="">Select primary focus...</option>
                      <option value="fruits_tree">Tree Fruits (Apples, Citrus, etc.)</option>
                      <option value="fruits_berry">
                        Berry Fruits (Strawberries, Grapes, etc.)
                      </option>
                      <option value="vegetables_field">
                        Field Vegetables (Lettuce, Carrots, etc.)
                      </option>
                      <option value="vegetables_greenhouse">Greenhouse Vegetables</option>
                      <option value="grains_cereal">Grain & Cereal Crops</option>
                      <option value="nuts">Tree Nuts (Almonds, Walnuts, etc.)</option>
                      <option value="livestock_cattle">Cattle & Beef</option>
                      <option value="livestock_dairy">Dairy Operations</option>
                      <option value="livestock_poultry">Poultry & Eggs</option>
                      <option value="mixed_diversified">Diversified Agriculture</option>
                    </StandardSelect>
                  </StandardField>
                </SimpleGrid>

                {/* Industry & Employee Count */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Industry Classification"
                    error={errors.industry?.message}
                    helpText="General agricultural industry category"
                  >
                    <StandardSelect {...methods.register('industry')}>
                      <option value="">Select classification...</option>
                      <option value="crop_production">Crop Production</option>
                      <option value="animal_production">Animal Production</option>
                      <option value="forestry_logging">Forestry & Logging</option>
                      <option value="aquaculture">Aquaculture</option>
                      <option value="agricultural_services">Agricultural Services</option>
                      <option value="organic_certified">Certified Organic</option>
                      <option value="sustainable_agriculture">Sustainable Agriculture</option>
                    </StandardSelect>
                  </StandardField>

                  <StandardField
                    label="Employee Count"
                    error={errors.employeeCount?.message}
                    helpText="Approximate number of employees"
                  >
                    <NumberInput
                      value={watch('employeeCount') || 0}
                      onChange={(_, num) => methods.setValue('employeeCount', num || 0)}
                    >
                      <NumberInputField borderRadius="lg" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </StandardField>
                </SimpleGrid>

                {/* Sustainability Commitment */}
                <StandardField
                  label="Sustainability Commitment"
                  error={errors.sustainabilityCommitment?.message}
                  helpText="Your company's approach to sustainable agriculture"
                >
                  <StandardSelect {...methods.register('sustainabilityCommitment')}>
                    <option value="">Select commitment level...</option>
                    <option value="carbon_neutral">Carbon Neutral Goals</option>
                    <option value="regenerative">Regenerative Agriculture</option>
                    <option value="organic_transition">Transitioning to Organic</option>
                    <option value="water_conservation">Water Conservation Focus</option>
                    <option value="biodiversity">Biodiversity Enhancement</option>
                    <option value="soil_health">Soil Health Priority</option>
                    <option value="integrated_pest">Integrated Pest Management</option>
                    <option value="climate_smart">Climate-Smart Agriculture</option>
                    <option value="conventional">Conventional with Efficiency</option>
                  </StandardSelect>
                </StandardField>

                {/* Company Description */}
                <StandardField
                  label="Company Description"
                  error={errors.description?.message}
                  helpText="Describe your agricultural operations, products, and mission"
                >
                  <StandardTextarea
                    {...methods.register('description')}
                    placeholder="Tell us about your agricultural company, what you produce, your farming practices, and your sustainability goals..."
                  />
                </StandardField>

                {/* Active Status */}
                <StandardField
                  label="Company Status"
                  helpText="Activate the company to start using Trazo services"
                >
                  <HStack>
                    <Switch {...methods.register('isActive')} colorScheme="green" size="md" />
                    <Text fontSize="sm" color="gray.600">
                      {watch('isActive') ? 'Active' : 'Inactive'}
                    </Text>
                  </HStack>
                </StandardField>

                {/* Navigation */}
                <HStack spacing={3} justify="flex-end" pt={4}>
                  <StandardButton variant="outline" onClick={onCancel}>
                    Cancel
                  </StandardButton>
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

          {/* Step 1: Location Information */}
          {currentStep === 1 && (
            <StandardCard
              title="Location Details"
              subtitle="Where is your agricultural operation based?"
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
                    leftElement={<Icon as={FaMapMarkedAlt} color="gray.400" />}
                  />
                </StandardField>

                {/* City & State */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField label="City" error={errors.city?.message}>
                    <StandardInput {...methods.register('city')} placeholder="Farmington" />
                  </StandardField>

                  <StandardField label="State/Province" error={errors.state?.message}>
                    <StandardInput {...methods.register('state')} placeholder="California" />
                  </StandardField>
                </SimpleGrid>

                {/* Country & Zip */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField label="Country" error={errors.country?.message}>
                    <StandardSelect {...methods.register('country')}>
                      <option value="">Select country...</option>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="MX">Mexico</option>
                      <option value="OTHER">Other</option>
                    </StandardSelect>
                  </StandardField>

                  <StandardField label="ZIP/Postal Code" error={errors.zipCode?.message}>
                    <StandardInput {...methods.register('zipCode')} placeholder="12345" />
                  </StandardField>
                </SimpleGrid>

                {/* Social Media & Online Presence */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mt={6} mb={2}>
                  Online Presence (Optional)
                </Text>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Social media presence helps consumers connect with your agricultural story and
                  sustainability efforts.
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Facebook Page"
                    error={errors.facebook?.message}
                    helpText="Company Facebook page URL"
                  >
                    <StandardInput
                      {...methods.register('facebook')}
                      placeholder="https://facebook.com/yourfarm"
                    />
                  </StandardField>

                  <StandardField
                    label="Instagram Profile"
                    error={errors.instagram?.message}
                    helpText="Company Instagram profile URL"
                  >
                    <StandardInput
                      {...methods.register('instagram')}
                      placeholder="https://instagram.com/yourfarm"
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Location Info Alert */}
                <StandardAlert
                  status="info"
                  title="Location & Online Presence Benefits"
                  description="Providing location information helps us offer region-specific sustainability insights and regulatory compliance assistance. Social media presence helps consumers connect with your agricultural story."
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
                      <StandardButton variant="outline" onClick={onCancel}>
                        Cancel
                      </StandardButton>
                    )}
                    <StandardButton
                      type="submit"
                      isLoading={isLoading}
                      loadingText={isEdit ? 'Updating...' : 'Creating...'}
                    >
                      {isEdit ? (isMobile ? 'Update' : 'Update Company') : (isMobile ? 'Create' : 'Create Company')}
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
};

export default StandardizedCompanyForm;
