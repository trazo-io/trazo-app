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
  Text,
  Icon,
  Box,
  Tag,
  TagLabel,
  TagCloseButton,
  Input,
  Select,
  Textarea,
  useColorModeValue
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
} from '../Design';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, boolean, number, array } from 'zod';
import { useIntl } from 'react-intl';
import {
  FaBuilding,
  FaMapMarkedAlt,
  FaPhone,
  FaEnvelope,
  FaCertificate,
  FaLeaf,
  FaUsers,
  FaTractor,
  FaCheckCircle,
  FaChevronRight,
  FaChevronLeft,
  FaPlus,
  FaArrowLeft,
  FaArrowRight,
  FaGlobe,
  FaCloudUploadAlt,
  FaTrash
} from 'react-icons/fa';
import { MdCheck, MdLocationOn, MdDescription, MdSettings, MdImage } from 'react-icons/md';
import { TrazoImageUpload } from '../Upload';


// Form Schema
const establishmentSchema = object({
  name: string().min(1, 'Establishment name is required').max(100, 'Name too long'),
  email: string()
    .refine((val) => !val || val.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: 'Invalid email format'
    })
    .optional(),
  phone: string().optional(),
  address: string().optional(),
  country: string().optional(),
  state: string().optional(),
  city: string().optional(),
  zone: string().optional(),
  zipCode: string().optional(),
  description: string().optional(),
  about: string().optional(),
  main_activities: string().optional(),
  location_highlights: string().optional(),
  custom_message: string().optional(),
  establishmentType: string().optional(),
  farmingMethod: string().optional(),
  totalAcreage: number().min(0, 'Acreage must be positive').optional(),
  cropsGrown: array(string()).optional(),
  certifications: array(string()).optional(),
  employeeCount: number().optional(),
  yearEstablished: number()
    .min(1800, 'Invalid year')
    .max(new Date().getFullYear(), 'Year cannot be in the future')
    .optional(),
  sustainabilityPractices: array(string()).optional(),
  isActive: boolean().default(true),
  type: string().optional(),
  latitude: number().optional(),
  longitude: number().optional(),
  // Additional contact fields for backend compatibility
  contact_person: string().optional(),
  contact_phone: string().optional(),
  contact_email: string().optional(),
  images: array(string()).optional(),
  // New operational agricultural fields
  waterSources: array(string()).optional(),
  climateZone: string().optional(),
  soilTypes: array(string()).optional(),
  conservationPractices: array(string()).optional(),
  irrigationMethods: array(string()).optional()
});

interface EstablishmentFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  zone?: string;
  zipCode?: string;
  description?: string;
  about?: string;
  main_activities?: string;
  location_highlights?: string;
  custom_message?: string;
  establishmentType?: string;
  farmingMethod?: string;
  totalAcreage?: number;
  cropsGrown?: string[];
  certifications?: string[];
  employeeCount?: number;
  yearEstablished?: number;
  sustainabilityPractices?: string[];
  isActive: boolean;
  type?: string;
  latitude?: number;
  longitude?: number;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  images?: string[];
  // New operational agricultural fields
  waterSources?: string[];
  climateZone?: string;
  soilTypes?: string[];
  conservationPractices?: string[];
  irrigationMethods?: string[];
}

interface StandardEstablishmentFormProps {
  onSubmit: (data: EstablishmentFormData) => void;
  onCancel: () => void;
  initialData?: Partial<EstablishmentFormData>;
  isLoading?: boolean;
  isEdit?: boolean;
  companyName?: string;
}

export const StandardEstablishmentForm: React.FC<StandardEstablishmentFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  isEdit = false,
  companyName = ''
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [newCrop, setNewCrop] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [newPractice, setNewPractice] = useState('');
  // New operational field states
  const [newWaterSource, setNewWaterSource] = useState('');
  const [newSoilType, setNewSoilType] = useState('');
  const [newConservationPractice, setNewConservationPractice] = useState('');
  const [newIrrigationMethod, setNewIrrigationMethod] = useState('');
  const intl = useIntl();
  const toast = useToast();

  // Simplified image management for TrazoImageUpload
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Define steps for stepper - certifications moved to operations step
  const steps = [
    { title: 'Basic Info', description: 'Business details & contact', icon: FaBuilding },
    { title: 'Location', description: 'Address & coordinates', icon: FaMapMarkedAlt },
    { title: 'Operations', description: 'Farming, practices & certifications', icon: FaTractor },
    { title: 'Media', description: 'Images', icon: MdImage }
  ];

  const methods = useForm<EstablishmentFormData>({
    resolver: zodResolver(establishmentSchema),
    defaultValues: {
      isActive: true,
      cropsGrown: [],
      certifications: [],
      sustainabilityPractices: [],
      employeeCount: 0,
      totalAcreage: 0,
      // New operational field defaults
      waterSources: [],
      soilTypes: [],
      conservationPractices: [],
      irrigationMethods: [],
      ...initialData
    }
  });

  const {
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors }
  } = methods;

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({ ...methods.getValues(), ...initialData });
    }
  }, [initialData, reset, methods]);

  // Debug effect to monitor form values
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name) {
        console.log(
          `Form field changed: ${name} = ${value[name as keyof typeof value]} (type: ${type})`
        );
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Debug effect to log all form values on step change
  useEffect(() => {
    const allValues = methods.getValues();
    console.log(`Step ${currentStep} loaded. All form values:`, allValues);
  }, [currentStep, methods]);

  // Initialize existing images on edit mode for TrazoImageUpload
  useEffect(() => {
    if (isEdit && initialData?.images) {
      const imageUrls = Array.isArray(initialData.images)
        ? initialData.images.map((img: any) => 
            typeof img === 'string' ? img : img?.url || String(img)
          ).filter(Boolean)
        : [];
      setUploadedImageUrls(imageUrls);
    }
  }, [isEdit, initialData?.images]);

  const onSubmitForm = async (data: EstablishmentFormData) => {
    try {
      // Validate all form steps before submission
      const allStepsValid = await Promise.all([
        validateStep(0), // Basic Info
        validateStep(1), // Location  
        validateStep(2), // Operations
        validateStep(3)  // Media
      ]);

      const hasValidationErrors = allStepsValid.some(isValid => !isValid);
      
      if (hasValidationErrors) {
        toast({
          title: 'Validation Error',
          description: 'Please review and complete all required fields in previous steps.',
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        return;
      }

      // Include uploaded image URLs
      const formDataWithImages = {
        ...data,
        uploaded_image_urls: uploadedImageUrls,
        images: uploadedImageUrls
      };

      await onSubmit(formDataWithImages);
      
      // Only show success toast if onSubmit doesn't handle it
      // (Success and navigation are now handled in AddEstablishment)
    } catch (error) {
      // Enhanced error handling with more specific messages
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Failed to save establishment. Please try again.';
                          
      toast({
        title: 'Error Creating Establishment',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  // Step validation
  const isStepComplete = (step: number) => {
    const formData = watch();

    switch (step) {
      case 0:
        // Basic Info step: name is required and email must be valid if provided
        const hasName = !!formData.name?.trim();
        const emailError = errors.email;
        const nameError = errors.name;

        // Debug logging
        console.log('Step 0 validation:', {
          hasName,
          nameError,
          emailError,
          formData: {
            name: formData.name,
            email: formData.email
          },
          watchedName: watch('name'),
          formValues: methods.getValues()
        });

        return hasName && !nameError && !emailError;
      case 1:
        return true; // Location step has no required fields
      case 2:
        return true; // Operations step has no required fields
      case 3:
        return true; // Media step has no required fields
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

  // Helper functions for dynamic arrays
  const addCrop = () => {
    if (newCrop.trim()) {
      const currentCrops = watch('cropsGrown') || [];
      setValue('cropsGrown', [...currentCrops, newCrop.trim()]);
      setNewCrop('');
    }
  };

  const removeCrop = (index: number) => {
    const currentCrops = watch('cropsGrown') || [];
    setValue(
      'cropsGrown',
      currentCrops.filter((_, i) => i !== index)
    );
  };

  const addCertification = () => {
    if (newCertification.trim()) {
      const currentCerts = watch('certifications') || [];
      setValue('certifications', [...currentCerts, newCertification.trim()]);
      setNewCertification('');
    }
  };

  const removeCertification = (index: number) => {
    const currentCerts = watch('certifications') || [];
    setValue(
      'certifications',
      currentCerts.filter((_, i) => i !== index)
    );
  };

  const addPractice = () => {
    if (newPractice.trim()) {
      const currentPractices = watch('sustainabilityPractices') || [];
      setValue('sustainabilityPractices', [...currentPractices, newPractice.trim()]);
      setNewPractice('');
    }
  };

  const removePractice = (index: number) => {
    const currentPractices = watch('sustainabilityPractices') || [];
    setValue(
      'sustainabilityPractices',
      currentPractices.filter((_, i) => i !== index)
    );
  };

  // New operational field helpers
  const addWaterSource = () => {
    if (newWaterSource.trim()) {
      const currentSources = watch('waterSources') || [];
      setValue('waterSources', [...currentSources, newWaterSource.trim()]);
      setNewWaterSource('');
    }
  };

  const removeWaterSource = (index: number) => {
    const currentSources = watch('waterSources') || [];
    setValue(
      'waterSources',
      currentSources.filter((_, i) => i !== index)
    );
  };

  const addSoilType = () => {
    if (newSoilType.trim()) {
      const currentTypes = watch('soilTypes') || [];
      setValue('soilTypes', [...currentTypes, newSoilType.trim()]);
      setNewSoilType('');
    }
  };

  const removeSoilType = (index: number) => {
    const currentTypes = watch('soilTypes') || [];
    setValue(
      'soilTypes',
      currentTypes.filter((_, i) => i !== index)
    );
  };

  const addConservationPractice = () => {
    if (newConservationPractice.trim()) {
      const currentPractices = watch('conservationPractices') || [];
      setValue('conservationPractices', [...currentPractices, newConservationPractice.trim()]);
      setNewConservationPractice('');
    }
  };

  const removeConservationPractice = (index: number) => {
    const currentPractices = watch('conservationPractices') || [];
    setValue(
      'conservationPractices',
      currentPractices.filter((_, i) => i !== index)
    );
  };

  const addIrrigationMethod = () => {
    if (newIrrigationMethod.trim()) {
      const currentMethods = watch('irrigationMethods') || [];
      setValue('irrigationMethods', [...currentMethods, newIrrigationMethod.trim()]);
      setNewIrrigationMethod('');
    }
  };

  const removeIrrigationMethod = (index: number) => {
    const currentMethods = watch('irrigationMethods') || [];
    setValue(
      'irrigationMethods',
      currentMethods.filter((_, i) => i !== index)
    );
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);

    if (!isValid) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields correctly.',
        status: 'error',
        duration: 3000
      });
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      const formValues = methods.getValues();
      console.log(
        `Moving from step ${currentStep} to step ${currentStep - 1}. Current form values:`,
        formValues
      );
      setCurrentStep(currentStep - 1);
    }
  };


  // Step validation
  const validateStep = async (step: number): Promise<boolean> => {
    const fieldsToValidate = getFieldsForStep(step);
    const result = await methods.trigger(fieldsToValidate);
    return result;
  };

  const getFieldsForStep = (step: number): (keyof EstablishmentFormData)[] => {
    switch (step) {
      case 0:
        return ['name', 'email', 'phone'];
      case 1:
        return ['address', 'city', 'state', 'country'];
      case 2:
        return ['description'];
      case 3:
        return []; // Media step has no required validations
      default:
        return [];
    }
  };

  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const bgHover = useColorModeValue('gray.50', 'gray.700');

  return (
    <StandardPage
      title={isEdit ? 'Edit Establishment' : 'Add New Establishment'}
      description={`${isEdit ? 'Update' : 'Register'} your agricultural establishment${
        companyName ? ` under ${companyName}` : ''
      }`}
      showBackButton
      onBack={onCancel}
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
              title="Establishment Information"
              subtitle="Basic details, contact information, and social media presence"
            >
              <VStack spacing={6} align="stretch">
                {/* Name & Type */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Establishment Name"
                    required
                    error={errors.name?.message}
                    helpText="Farm, ranch, or facility name"
                  >
                    <Controller
                      name="name"
                      control={methods.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="e.g., Green Valley Farm"
                          borderRadius="lg"
                          borderColor="gray.300"
                          _hover={{ borderColor: 'green.400' }}
                          _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                          size="lg"
                        />
                      )}
                    />
                  </StandardField>

                  <StandardField
                    label="Establishment Type"
                    error={errors.establishmentType?.message}
                    helpText="Primary type of agricultural operation"
                  >
                    <Controller
                      name="establishmentType"
                      control={methods.control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          placeholder="Select type..."
                          borderRadius="lg"
                          borderColor="gray.300"
                          _hover={{ borderColor: 'green.400' }}
                          _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                          size="lg"
                        >
                          <option value="crop_farm">Crop Farm</option>
                          <option value="livestock_ranch">Livestock Ranch</option>
                          <option value="dairy_farm">Dairy Farm</option>
                          <option value="orchard">Orchard</option>
                          <option value="vineyard">Vineyard</option>
                          <option value="greenhouse">Greenhouse</option>
                          <option value="aquaculture">Aquaculture</option>
                          <option value="mixed_operation">Mixed Operation</option>
                        </Select>
                      )}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Contact Information */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Email Address"
                    error={errors.email?.message}
                    helpText="Primary contact email"
                  >
                    <Controller
                      name="email"
                      control={methods.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="email"
                          placeholder="contact@greenvalleyfarm.com"
                          borderRadius="lg"
                          borderColor="gray.300"
                          _hover={{ borderColor: 'green.400' }}
                          _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                          size="lg"
                        />
                      )}
                    />
                  </StandardField>

                  <StandardField
                    label="Phone Number"
                    error={errors.phone?.message}
                    helpText="Contact phone number"
                  >
                    <Controller
                      name="phone"
                      control={methods.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="tel"
                          placeholder="(555) 123-4567"
                          borderRadius="lg"
                          borderColor="gray.300"
                          _hover={{ borderColor: 'green.400' }}
                          _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                          size="lg"
                        />
                      )}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Description */}
                <StandardField
                  label="Description"
                  error={errors.description?.message}
                  helpText="Describe your establishment, its history, and mission"
                >
                  <Controller
                    name="description"
                    control={methods.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="Tell us about your establishment, what you produce, your farming philosophy, and what makes your operation unique..."
                        borderRadius="lg"
                        borderColor="gray.300"
                        _hover={{ borderColor: 'green.400' }}
                        _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                        minH="120px"
                        resize="vertical"
                      />
                    )}
                  />
                </StandardField>

                {/* Active Status */}
                <StandardField
                  label="Establishment Status"
                  helpText="Activate the establishment to start managing parcels and production"
                >
                  <Controller
                    name="isActive"
                    control={methods.control}
                    render={({ field }) => (
                      <HStack>
                        <Switch
                          isChecked={field.value}
                          onChange={field.onChange}
                          colorScheme="green"
                          size="md"
                        />
                        <Text fontSize="sm" color="gray.600">
                          {field.value ? 'Active' : 'Inactive'}
                        </Text>
                      </HStack>
                    )}
                  />
                </StandardField>

                {/* Mobile-First Navigation */}
                <Box pt={4}>
                  {/* Mobile Layout */}
                  <VStack spacing={3} w="100%" display={{ base: 'flex', md: 'none' }}>
                    <StandardButton
                      onClick={nextStep}
                      w="100%"
                      size="lg"
                      h="52px"
                      fontSize="md"
                      fontWeight="semibold"
                      rightIcon={<FaChevronRight />}
                      disabled={!isStepComplete(0)}
                      borderRadius="xl"
                      _hover={{ transform: 'translateY(-1px)' }}
                    >
                      Continue
                    </StandardButton>
                    <StandardButton 
                      variant="ghost" 
                      w="100%" 
                      size="md"
                      fontSize="sm"
                      onClick={onCancel}
                      borderRadius="xl"
                    >
                      Cancel
                    </StandardButton>
                  </VStack>

                  {/* Desktop Layout */}
                  <HStack spacing={3} justify="flex-end" display={{ base: 'none', md: 'flex' }}>
                    <StandardButton variant="outline" onClick={onCancel} borderRadius="xl">
                      Cancel
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      rightIcon={<FaChevronRight />}
                      disabled={!isStepComplete(0)}
                      borderRadius="xl"
                      _hover={{ transform: 'translateY(-1px)' }}
                    >
                      Continue to Location
                    </StandardButton>
                  </HStack>
                </Box>
              </VStack>
            </StandardCard>
          )}

          {/* Step 1: Location Information */}
          {currentStep === 1 && (
            <StandardCard
              title="Location Details"
              subtitle="Physical address and geographic coordinates"
            >
              <VStack spacing={6} align="stretch">
                {/* Address */}
                <StandardField
                  label="Street Address"
                  error={errors.address?.message}
                  helpText="Physical address of your establishment"
                >
                  <Controller
                    name="address"
                    control={methods.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="123 Farm Road"
                        borderRadius="lg"
                        borderColor="gray.300"
                        _hover={{ borderColor: 'green.400' }}
                        _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                        size="lg"
                      />
                    )}
                  />
                </StandardField>

                {/* City & State */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField label="City" error={errors.city?.message}>
                    <Controller
                      name="city"
                      control={methods.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="Farmington"
                          borderRadius="lg"
                          borderColor="gray.300"
                          _hover={{ borderColor: 'green.400' }}
                          _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                          size="lg"
                        />
                      )}
                    />
                  </StandardField>

                  <StandardField label="State/Province" error={errors.state?.message}>
                    <Controller
                      name="state"
                      control={methods.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="California"
                          borderRadius="lg"
                          borderColor="gray.300"
                          _hover={{ borderColor: 'green.400' }}
                          _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                          size="lg"
                        />
                      )}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Country & Zip */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField label="Country" error={errors.country?.message}>
                    <Controller
                      name="country"
                      control={methods.control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          placeholder="Select country..."
                          borderRadius="lg"
                          borderColor="gray.300"
                          _hover={{ borderColor: 'green.400' }}
                          _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                          size="lg"
                        >
                          <option value="US">United States</option>
                          <option value="CA">Canada</option>
                          <option value="MX">Mexico</option>
                          <option value="OTHER">Other</option>
                        </Select>
                      )}
                    />
                  </StandardField>

                  <StandardField label="ZIP/Postal Code" error={errors.zipCode?.message}>
                    <Controller
                      name="zipCode"
                      control={methods.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="12345"
                          borderRadius="lg"
                          borderColor="gray.300"
                          _hover={{ borderColor: 'green.400' }}
                          _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                          size="lg"
                        />
                      )}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Zone */}
                <StandardField
                  label="Zone/Area"
                  error={errors.zone?.message}
                  helpText="Geographic zone or area designation"
                >
                  <Controller
                    name="zone"
                    control={methods.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="e.g., North Valley, Agricultural Zone A"
                        borderRadius="lg"
                        borderColor="gray.300"
                        _hover={{ borderColor: 'green.400' }}
                        _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                        size="lg"
                      />
                    )}
                  />
                </StandardField>

                {/* Precise Coordinates Section */}
                <Box mt={8}>
                  <Text fontSize="lg" fontWeight="semibold" color="gray.700" mb={2}>
                    Precise Coordinates (Optional)
                  </Text>
                  <Text fontSize="sm" color="gray.600" mb={4}>
                    Add exact GPS coordinates for precise location mapping. You can get these from
                    Google Maps or GPS devices.
                  </Text>

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    <StandardField
                      label="Latitude"
                      error={errors.latitude?.message}
                      helpText="Decimal degrees (e.g., 40.7128)"
                    >
                      <Controller
                        name="latitude"
                        control={methods.control}
                        render={({ field }) => (
                          <NumberInput
                            value={field.value || ''}
                            onChange={(_, num) => field.onChange(num)}
                            precision={6}
                            allowMouseWheel={false}
                            clampValueOnBlur={false}
                            min={-90}
                            max={90}
                            step={0.000001}
                          >
                            <NumberInputField 
                              borderRadius="lg" 
                              placeholder="40.7128"
                              borderColor="gray.300"
                              _hover={{ borderColor: 'green.400' }}
                              _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                            />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        )}
                      />
                    </StandardField>

                    <StandardField
                      label="Longitude"
                      error={errors.longitude?.message}
                      helpText="Decimal degrees (e.g., -74.0060)"
                    >
                      <Controller
                        name="longitude"
                        control={methods.control}
                        render={({ field }) => (
                          <NumberInput
                            value={field.value || ''}
                            onChange={(_, num) => field.onChange(num)}
                            precision={6}
                            allowMouseWheel={false}
                            clampValueOnBlur={false}
                            min={-180}
                            max={180}
                            step={0.000001}
                          >
                            <NumberInputField 
                              borderRadius="lg" 
                              placeholder="-74.0060"
                              borderColor="gray.300"
                              _hover={{ borderColor: 'green.400' }}
                              _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                            />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        )}
                      />
                    </StandardField>
                  </SimpleGrid>
                </Box>

                {/* Mobile-First Navigation */}
                <Box pt={4}>
                  {/* Mobile Layout */}
                  <VStack spacing={3} w="100%" display={{ base: 'flex', md: 'none' }}>
                    <StandardButton
                      onClick={nextStep}
                      w="100%"
                      size="lg"
                      h="52px"
                      fontSize="md"
                      fontWeight="semibold"
                      rightIcon={<FaChevronRight />}
                      borderRadius="xl"
                      _hover={{ transform: 'translateY(-1px)' }}
                    >
                      Next: Operations
                    </StandardButton>
                    <HStack spacing={2} w="100%">
                      <StandardButton
                        variant="outline"
                        flex={1}
                        size="md"
                        fontSize="sm"
                        leftIcon={<FaChevronLeft />}
                        onClick={previousStep}
                        borderRadius="xl"
                      >
                        Back
                      </StandardButton>
                      <StandardButton
                        variant="ghost"
                        flex={1}
                        size="md"
                        fontSize="sm"
                        onClick={onCancel}
                        borderRadius="xl"
                      >
                        Cancel
                      </StandardButton>
                    </HStack>
                  </VStack>

                  {/* Desktop Layout */}
                  <HStack spacing={3} justify="space-between" display={{ base: 'none', md: 'flex' }}>
                    <StandardButton
                      variant="outline"
                      leftIcon={<FaChevronLeft />}
                      onClick={previousStep}
                      borderRadius="xl"
                    >
                      Back to Basic Info
                    </StandardButton>

                    <HStack spacing={3}>
                      <StandardButton variant="outline" onClick={onCancel} borderRadius="xl">
                        Cancel
                      </StandardButton>
                      <StandardButton 
                        onClick={nextStep} 
                        rightIcon={<FaChevronRight />}
                        borderRadius="xl"
                        _hover={{ transform: 'translateY(-1px)' }}
                      >
                        Next: Operations
                      </StandardButton>
                    </HStack>
                  </HStack>
                </Box>
              </VStack>
            </StandardCard>
          )}

          {/* Step 2: Operations Information */}
          {currentStep === 2 && (
            <StandardCard
              title="Operations & Practices"
              subtitle="Details about your farming operations"
            >
              <VStack spacing={6} align="stretch">
                {/* Farming Method & Acreage */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Farming Method"
                    error={errors.farmingMethod?.message}
                    helpText="Primary farming approach"
                  >
                    <Controller
                      name="farmingMethod"
                      control={methods.control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          placeholder="Select method..."
                          borderRadius="lg"
                          borderColor="gray.300"
                          _hover={{ borderColor: 'green.400' }}
                          _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                          size="lg"
                        >
                          <option value="conventional">Conventional</option>
                          <option value="organic">Organic</option>
                          <option value="sustainable">Sustainable</option>
                          <option value="biodynamic">Biodynamic</option>
                          <option value="permaculture">Permaculture</option>
                          <option value="regenerative">Regenerative</option>
                        </Select>
                      )}
                    />
                  </StandardField>

                  <StandardField
                    label="Total Area (Hectares)"
                    error={errors.totalAcreage?.message}
                    helpText="Total land area in hectares - used for agricultural reporting and carbon calculations"
                  >
                    <Controller
                      name="totalAcreage"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || 0}
                          onChange={(_, num) => field.onChange(num || 0)}
                        >
                          <NumberInputField borderRadius="lg" />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      )}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Employee Count & Year Established */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Employee Count"
                    error={errors.employeeCount?.message}
                    helpText="Number of employees"
                  >
                    <Controller
                      name="employeeCount"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || 0}
                          onChange={(_, num) => field.onChange(num || 0)}
                        >
                          <NumberInputField borderRadius="lg" />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      )}
                    />
                  </StandardField>

                  <StandardField
                    label="Year Established"
                    error={errors.yearEstablished?.message}
                    helpText="When was the establishment founded"
                  >
                    <Controller
                      name="yearEstablished"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={1800}
                          max={new Date().getFullYear()}
                        >
                          <NumberInputField borderRadius="lg" placeholder="e.g., 1995" />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      )}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Crops Grown */}
                <StandardField label="Crops Grown" helpText="Add crops that you produce">
                  <Controller
                    name="cropsGrown"
                    control={methods.control}
                    render={({ field }) => (
                      <VStack align="stretch" spacing={3}>
                        <HStack>
                          <Input
                            value={newCrop}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setNewCrop(e.target.value);
                            }}
                            placeholder="e.g., Tomatoes, Corn, Apples"
                            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newCrop.trim()) {
                                  field.onChange([...(field.value || []), newCrop.trim()]);
                                  setNewCrop('');
                                }
                              }
                            }}
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                            size="lg"
                          />
                          <StandardButton
                            onClick={() => {
                              if (newCrop.trim()) {
                                field.onChange([...(field.value || []), newCrop.trim()]);
                                setNewCrop('');
                              }
                            }}
                            leftIcon={<FaPlus />}
                            size="sm"
                          >
                            Add
                          </StandardButton>
                        </HStack>
                        {field.value?.length ? (
                          <HStack spacing={2} flexWrap="wrap">
                            {field.value.map((crop, index) => (
                              <Tag key={index} size="md" variant="solid" colorScheme="green">
                                <TagLabel>{crop}</TagLabel>
                                <TagCloseButton
                                  onClick={(e) => {
                                    e.preventDefault();
                                    field.onChange(field.value.filter((_, i) => i !== index));
                                  }}
                                />
                              </Tag>
                            ))}
                          </HStack>
                        ) : null}
                      </VStack>
                    )}
                  />
                </StandardField>

                {/* Sustainability Practices */}
                <StandardField
                  label="Sustainability Practices"
                  helpText="Environmental and sustainability practices you follow"
                >
                  <Controller
                    name="sustainabilityPractices"
                    control={methods.control}
                    render={({ field }) => (
                      <VStack align="stretch" spacing={3}>
                        <HStack>
                          <Input
                            value={newPractice}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setNewPractice(e.target.value);
                            }}
                            placeholder="e.g., Cover cropping, Water conservation, Solar power"
                            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newPractice.trim()) {
                                  field.onChange([...(field.value || []), newPractice.trim()]);
                                  setNewPractice('');
                                }
                              }
                            }}
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                            size="lg"
                          />
                          <StandardButton
                            onClick={(e) => {
                              e.preventDefault();
                              if (newPractice.trim()) {
                                field.onChange([...(field.value || []), newPractice.trim()]);
                                setNewPractice('');
                              }
                            }}
                            leftIcon={<FaPlus />}
                            size="sm"
                          >
                            Add
                          </StandardButton>
                        </HStack>
                        {field.value?.length ? (
                          <HStack spacing={2} flexWrap="wrap">
                            {field.value.map((practice, index) => (
                              <Tag key={index} size="md" variant="solid" colorScheme="orange">
                                <TagLabel>{practice}</TagLabel>
                                <TagCloseButton
                                  onClick={(e) => {
                                    e.preventDefault();
                                    field.onChange(field.value.filter((_, i) => i !== index));
                                  }}
                                />
                              </Tag>
                            ))}
                          </HStack>
                        ) : null}
                      </VStack>
                    )}
                  />
                </StandardField>

                {/* Certifications */}
                <StandardField
                  label="Certifications"
                  helpText="Agricultural certifications and standards"
                >
                  <Controller
                    name="certifications"
                    control={methods.control}
                    render={({ field }) => (
                      <VStack align="stretch" spacing={3}>
                        <HStack>
                          <Input
                            value={newCertification}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setNewCertification(e.target.value);
                            }}
                            placeholder="e.g., USDA Organic, Fair Trade, GAP"
                            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newCertification.trim()) {
                                  field.onChange([...(field.value || []), newCertification.trim()]);
                                  setNewCertification('');
                                }
                              }
                            }}
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                            size="lg"
                          />
                          <StandardButton
                            onClick={() => {
                              if (newCertification.trim()) {
                                field.onChange([...(field.value || []), newCertification.trim()]);
                                setNewCertification('');
                              }
                            }}
                            leftIcon={<FaPlus />}
                            size="sm"
                          >
                            Add
                          </StandardButton>
                        </HStack>
                        {field.value?.length ? (
                          <HStack spacing={2} flexWrap="wrap">
                            {field.value.map((cert: string, index: number) => (
                              <Tag key={index} size="md" variant="solid" colorScheme="blue">
                                <TagLabel>{cert}</TagLabel>
                                <TagCloseButton
                                  onClick={() => {
                                    field.onChange(
                                      (field.value || []).filter(
                                        (_: string, i: number) => i !== index
                                      )
                                    );
                                  }}
                                />
                              </Tag>
                            ))}
                          </HStack>
                        ) : null}
                      </VStack>
                    )}
                  />
                </StandardField>

                {/* Operational Details */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mt={6} mb={2}>
                  Operational Details
                </Text>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Provide details about your agricultural operations, resources, and methods.
                </Text>

                {/* Climate Zone */}
                <StandardField
                  label="Climate Zone"
                  error={errors.climateZone?.message}
                  helpText="Climate zone or growing region classification"
                >
                  <Controller
                    name="climateZone"
                    control={methods.control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        placeholder="Select climate zone..."
                        borderRadius="lg"
                        borderColor="gray.300"
                        _hover={{ borderColor: 'green.400' }}
                        _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                        size="lg"
                      >
                        <option value="temperate_oceanic">Temperate Oceanic</option>
                        <option value="mediterranean">Mediterranean</option>
                        <option value="humid_subtropical">Humid Subtropical</option>
                        <option value="semi_arid">Semi-Arid</option>
                        <option value="arid">Arid</option>
                        <option value="continental">Continental</option>
                        <option value="tropical">Tropical</option>
                        <option value="montane">Montane</option>
                      </Select>
                    )}
                  />
                </StandardField>

                {/* Water Sources */}
                <StandardField
                  label="Water Sources"
                  helpText="Primary water sources for your operations"
                >
                  <Controller
                    name="waterSources"
                    control={methods.control}
                    render={({ field }) => (
                      <VStack align="stretch" spacing={3}>
                        <HStack>
                          <Input
                            value={newWaterSource}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setNewWaterSource(e.target.value);
                            }}
                            placeholder="e.g., Well water, Surface water, Irrigation district"
                            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addWaterSource();
                              }
                            }}
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                            size="lg"
                          />
                          <StandardButton onClick={addWaterSource} leftIcon={<FaPlus />} size="sm">
                            Add
                          </StandardButton>
                        </HStack>
                        {field.value?.length ? (
                          <HStack spacing={2} flexWrap="wrap">
                            {field.value.map((source, index) => (
                              <Tag key={index} size="md" variant="solid" colorScheme="green">
                                <TagLabel>{source}</TagLabel>
                                <TagCloseButton onClick={() => removeWaterSource(index)} />
                              </Tag>
                            ))}
                          </HStack>
                        ) : null}
                      </VStack>
                    )}
                  />
                </StandardField>

                {/* Soil Types */}
                <StandardField
                  label="Soil Types"
                  helpText="Primary soil types present on your establishment"
                >
                  <Controller
                    name="soilTypes"
                    control={methods.control}
                    render={({ field }) => (
                      <VStack align="stretch" spacing={3}>
                        <HStack>
                          <Input
                            value={newSoilType}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setNewSoilType(e.target.value);
                            }}
                            placeholder="e.g., Clay loam, Sandy soil, Silt"
                            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addSoilType();
                              }
                            }}
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                            size="lg"
                          />
                          <StandardButton onClick={addSoilType} leftIcon={<FaPlus />} size="sm">
                            Add
                          </StandardButton>
                        </HStack>
                        {field.value?.length ? (
                          <HStack spacing={2} flexWrap="wrap">
                            {field.value.map((soil, index) => (
                              <Tag key={index} size="md" variant="solid" colorScheme="orange">
                                <TagLabel>{soil}</TagLabel>
                                <TagCloseButton onClick={() => removeSoilType(index)} />
                              </Tag>
                            ))}
                          </HStack>
                        ) : null}
                      </VStack>
                    )}
                  />
                </StandardField>

                {/* Conservation Practices */}
                <StandardField
                  label="Conservation Practices"
                  helpText="Conservation and environmental practices implemented"
                >
                  <Controller
                    name="conservationPractices"
                    control={methods.control}
                    render={({ field }) => (
                      <VStack align="stretch" spacing={3}>
                        <HStack>
                          <Input
                            value={newConservationPractice}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setNewConservationPractice(e.target.value);
                            }}
                            placeholder="e.g., Cover crops, Buffer strips, Contour farming"
                            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addConservationPractice();
                              }
                            }}
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                            size="lg"
                          />
                          <StandardButton
                            onClick={addConservationPractice}
                            leftIcon={<FaPlus />}
                            size="sm"
                          >
                            Add
                          </StandardButton>
                        </HStack>
                        {field.value?.length ? (
                          <HStack spacing={2} flexWrap="wrap">
                            {field.value.map((practice, index) => (
                              <Tag key={index} size="md" variant="solid" colorScheme="green">
                                <TagLabel>{practice}</TagLabel>
                                <TagCloseButton onClick={() => removeConservationPractice(index)} />
                              </Tag>
                            ))}
                          </HStack>
                        ) : null}
                      </VStack>
                    )}
                  />
                </StandardField>

                {/* Irrigation Methods */}
                <StandardField
                  label="Irrigation Methods"
                  helpText="Irrigation techniques and methods used"
                >
                  <Controller
                    name="irrigationMethods"
                    control={methods.control}
                    render={({ field }) => (
                      <VStack align="stretch" spacing={3}>
                        <HStack>
                          <Input
                            value={newIrrigationMethod}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setNewIrrigationMethod(e.target.value);
                            }}
                            placeholder="e.g., Drip irrigation, Sprinkler, Flood irrigation"
                            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addIrrigationMethod();
                              }
                            }}
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                            size="lg"
                          />
                          <StandardButton
                            onClick={addIrrigationMethod}
                            leftIcon={<FaPlus />}
                            size="sm"
                          >
                            Add
                          </StandardButton>
                        </HStack>
                        {field.value?.length ? (
                          <HStack spacing={2} flexWrap="wrap">
                            {field.value.map((method, index) => (
                              <Tag key={index} size="md" variant="solid" colorScheme="blue">
                                <TagLabel>{method}</TagLabel>
                                <TagCloseButton onClick={() => removeIrrigationMethod(index)} />
                              </Tag>
                            ))}
                          </HStack>
                        ) : null}
                      </VStack>
                    )}
                  />
                </StandardField>

                {/* Additional Information Fields */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mt={6} mb={2}>
                  Additional Information
                </Text>

                <StandardField
                  label="About the Establishment"
                  error={errors.about?.message}
                  helpText="General information about your establishment"
                >
                  <Controller
                    name="about"
                    control={methods.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="Share more about your establishment's history, mission, and what makes it special..."
                        borderRadius="lg"
                        borderColor="gray.300"
                        _hover={{ borderColor: 'green.400' }}
                        _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                        minH="120px"
                        resize="vertical"
                      />
                    )}
                  />
                </StandardField>

                <StandardField
                  label="Main Activities"
                  error={errors.main_activities?.message}
                  helpText="Primary activities and operations"
                >
                  <Controller
                    name="main_activities"
                    control={methods.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="Describe your main farming activities, products, and services..."
                        borderRadius="lg"
                        borderColor="gray.300"
                        _hover={{ borderColor: 'green.400' }}
                        _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                        minH="120px"
                        resize="vertical"
                      />
                    )}
                  />
                </StandardField>

                <StandardField
                  label="Location Highlights"
                  error={errors.location_highlights?.message}
                  helpText="Notable features of your location"
                >
                  <Controller
                    name="location_highlights"
                    control={methods.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="Describe unique features of your location, climate advantages, or geographical benefits..."
                        borderRadius="lg"
                        borderColor="gray.300"
                        _hover={{ borderColor: 'green.400' }}
                        _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                        minH="120px"
                        resize="vertical"
                      />
                    )}
                  />
                </StandardField>

                <StandardField
                  label="Custom Message"
                  error={errors.custom_message?.message}
                  helpText="Special message for customers or visitors"
                >
                  <Controller
                    name="custom_message"
                    control={methods.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="A personal message you'd like to share with customers or visitors..."
                        borderRadius="lg"
                        borderColor="gray.300"
                        _hover={{ borderColor: 'green.400' }}
                        _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                        minH="120px"
                        resize="vertical"
                      />
                    )}
                  />
                </StandardField>

                {/* Summary Alert */}
                <StandardAlert
                  status="info"
                  title="Ready to Submit"
                  description="Your establishment information is complete. You can always update these details later."
                />

                {/* Mobile-First Navigation */}
                <Box pt={4}>
                  {/* Mobile Layout */}
                  <VStack spacing={3} w="100%" display={{ base: 'flex', md: 'none' }}>
                    <StandardButton
                      onClick={nextStep}
                      w="100%"
                      size="lg"
                      h="52px"
                      fontSize="md"
                      fontWeight="semibold"
                      rightIcon={<FaChevronRight />}
                      borderRadius="xl"
                      _hover={{ transform: 'translateY(-1px)' }}
                    >
                      Add Photos
                    </StandardButton>
                    <HStack spacing={2} w="100%">
                      <StandardButton
                        variant="outline"
                        flex={1}
                        size="md"
                        fontSize="sm"
                        leftIcon={<FaChevronLeft />}
                        onClick={previousStep}
                        borderRadius="xl"
                      >
                        Back
                      </StandardButton>
                      <StandardButton
                        variant="ghost"
                        flex={1}
                        size="md"
                        fontSize="sm"
                        onClick={onCancel}
                        borderRadius="xl"
                      >
                        Cancel
                      </StandardButton>
                    </HStack>
                  </VStack>

                  {/* Desktop Layout */}
                  <HStack spacing={3} justify="space-between" display={{ base: 'none', md: 'flex' }}>
                    <StandardButton
                      variant="outline"
                      leftIcon={<FaChevronLeft />}
                      onClick={previousStep}
                      borderRadius="xl"
                    >
                      Back to Location
                    </StandardButton>

                    <HStack spacing={3}>
                      <StandardButton variant="outline" onClick={onCancel} borderRadius="xl">
                        Cancel
                      </StandardButton>
                      <StandardButton 
                        onClick={nextStep} 
                        rightIcon={<FaChevronRight />}
                        borderRadius="xl"
                        _hover={{ transform: 'translateY(-1px)' }}
                      >
                        Next: Media
                      </StandardButton>
                    </HStack>
                  </HStack>
                </Box>
              </VStack>
            </StandardCard>
          )}

          {/* Step 3: Media */}
          {currentStep === 3 && (
            <StandardCard
              title="Establishment Images"
              subtitle="Upload images to showcase your establishment"
            >
              <VStack spacing={8} align="stretch">
                {/* 2025 Modern Image Upload */}
                <StandardField
                  label="Images"
                  helpText="Upload up to 5 high-quality images (JPG, PNG, GIF, WEBP - max 5MB each)"
                >
                  <TrazoImageUpload
                    maxFiles={5}
                    maxSize={5 * 1024 * 1024} // 5MB
                    existingImages={uploadedImageUrls}
                    onImagesChange={setUploadedImageUrls}
                    isLoading={isUploading}
                  />
                </StandardField>

                {/* Mobile-First Navigation - 2025 Premium UX */}
                <Box pt={4}>
                  {/* Mobile Layout (Stacked) */}
                  <VStack spacing={3} w="100%" display={{ base: 'flex', md: 'none' }}>
                    {/* Primary Action - Full Width */}
                    <StandardButton
                      type="submit"
                      w="100%"
                      size="lg"
                      h="52px" // Extra height for mobile touch
                      fontSize="md"
                      fontWeight="semibold"
                      isLoading={isLoading}
                      loadingText={isEdit ? 'Updating...' : 'Creating...'}
                      leftIcon={<FaCheckCircle />}
                      borderRadius="xl"
                      _hover={{ transform: 'translateY(-1px)' }}
                    >
                      {isEdit ? 'Update Farm' : 'Create Farm'}
                    </StandardButton>
                    
                    {/* Secondary Actions Row */}
                    <HStack spacing={2} w="100%">
                      <StandardButton 
                        variant="outline" 
                        flex={1}
                        size="md"
                        fontSize="sm"
                        leftIcon={<FaChevronLeft />}
                        onClick={previousStep}
                        borderRadius="xl"
                      >
                        Back
                      </StandardButton>
                      <StandardButton 
                        variant="ghost" 
                        flex={1}
                        size="md"
                        fontSize="sm"
                        onClick={onCancel}
                        borderRadius="xl"
                      >
                        Cancel
                      </StandardButton>
                    </HStack>
                  </VStack>

                  {/* Desktop Layout (Horizontal) */}
                  <HStack spacing={3} justify="space-between" display={{ base: 'none', md: 'flex' }}>
                    <StandardButton
                      variant="outline"
                      leftIcon={<FaChevronLeft />}
                      onClick={previousStep}
                      borderRadius="xl"
                    >
                      Back to Operations
                    </StandardButton>

                    <HStack spacing={3}>
                      <StandardButton 
                        variant="outline" 
                        onClick={onCancel}
                        borderRadius="xl"
                      >
                        Cancel
                      </StandardButton>
                      <StandardButton
                        type="submit"
                        isLoading={isLoading}
                        loadingText={isEdit ? 'Updating...' : 'Creating...'}
                        leftIcon={<FaCheckCircle />}
                        borderRadius="xl"
                        _hover={{ transform: 'translateY(-1px)' }}
                      >
                        {isEdit ? 'Update Establishment' : 'Create Establishment'}
                      </StandardButton>
                    </HStack>
                  </HStack>
                </Box>
              </VStack>
            </StandardCard>
          )}
        </form>
      </FormProvider>
    </StandardPage>
  );
};

export default StandardEstablishmentForm;
