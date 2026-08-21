/**
 * 2026-08-10 onboarding trim — removed June-era marketing/transparency asks.
 *
 * - "Sustainability & Conservation Practices" input CUT: it wrote
 *   `sustainability_practices`, a self-reported-claim field killed on the wire
 *   2026-08-07 (see consumerVisibility.ts). Nothing live reads it anymore.
 * - Certifications free-text entry stays CUT (guidance box only): the legacy
 *   comma-string is a data-migration source (certifications/constants.py
 *   LEGACY_TEXT_MAP); structured records live in CertificationManager.
 * - Schema/payload no longer carry never-collected round-trip fields (about,
 *   main_activities, location_highlights, employee_count, climate_zone,
 *   conservation_practices, email/phone/contact_*, country). AddFarm PATCHes,
 *   so omission preserves any existing DB values.
 * - Kept water/soil/irrigation inputs (live readers: ProfileFarm + consumer QR
 *   page) but reframed their copy from consumer-trust marketing to operational
 *   recordkeeping language.
 */
import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  SimpleGrid,
  Switch,
  useToast,
  Text,
  Icon,
  Box,
  Tag,
  TagLabel,
  TagCloseButton,
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
import { StandardNumberInput } from 'components/Design/StandardComponents';

// US States - 2-letter codes used for regional agricultural context
// Must match EditCompanyModal.tsx for consistency
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

// Form Schema
/**
 * How this farm operates. Feeds three places, which is why the vocabulary matters:
 *
 *  1. The certifier packet — `audit_export_service._farming_method_phrase` prints it in the
 *     Operation Profile.
 *  2. Production defaults — QuickStartProduction seeds `production_method` from this value,
 *     but only when the term exists in History.PRODUCTION_METHOD_CHOICES.
 *  3. The consumer QR page (CONSUMER_VISIBLE_FARM_FIELDS).
 *
 * `sustainable` and `permaculture` were removed 2026-08-17.
 *
 * "Sustainable" has no definition under 7 CFR 205 and is the unqualified
 * general-environmental-benefit claim FTC 16 CFR 260.6 targets. The packet already had to
 * DEFEND against it: `_farming_method_phrase` carries an `UNSUBSTANTIATED` set and, on a
 * match, prints "not a term defined under 7 CFR 205 and not substantiated by this export"
 * instead of the value. Suppressing a claim at print time is a patch; not offering it at the
 * point of entry is the fix — the same call made for `production_method` on 2026-08-16.
 *
 * Neither term is a production method either, so a farm set to one of them silently fell
 * through QuickStartProduction's filter and every production defaulted to conventional with
 * no explanation. The four that remain all map straight through.
 *
 * ⚠️ `Establishment.farming_method` is a choice-less CharField, so this list is the ONLY
 * vocabulary — nothing downstream will reject a bad value.
 */
const FARMING_METHOD_OPTIONS = [
  { value: 'conventional', label: 'Conventional' },
  { value: 'organic', label: 'Organic' },
  { value: 'biodynamic', label: 'Biodynamic' },
  { value: 'regenerative', label: 'Regenerative' }
] as const;

const establishmentSchema = object({
  // required_error matters as much as min(1): these fields have no defaultValue,
  // so an untouched field is `undefined` and zod falls back to a bare "Required"
  // instead of the message written below.
  name: string({ required_error: 'Farm name is required' })
    .min(1, 'Farm name is required')
    .max(100, 'Farm name must be 100 characters or less'),
  address: string().optional(),
  state: string({ required_error: 'State is required for regional agricultural context' }).min(
    1,
    'State is required for regional agricultural context'
  ),
  city: string().optional(),
  zone: string().optional(),
  zipCode: string().optional(),
  description: string().optional(),
  custom_message: string().optional(),
  establishmentType: string().optional(),
  farmingMethod: string().optional(),
  totalAcreage: number().min(0, 'Acreage must be positive').optional(),
  cropsGrown: array(string()).optional(),
  yearEstablished: number()
    .min(1800, 'Invalid year')
    .max(new Date().getFullYear(), 'Year cannot be in the future')
    .optional(),
  isActive: boolean().default(true),
  type: string().optional(),
  latitude: number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional(),
  longitude: number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional(),
  images: array(string()).optional(),
  // Operational agricultural fields
  waterSources: array(string()).optional(),
  soilHealthPractices: array(string()).optional(),
  irrigationMethods: array(string()).optional()
});

interface EstablishmentFormData {
  name: string;
  address?: string;
  state?: string;
  city?: string;
  zone?: string;
  zipCode?: string;
  description?: string;
  custom_message?: string;
  establishmentType?: string;
  farmingMethod?: string;
  totalAcreage?: number;
  cropsGrown?: string[];
  yearEstablished?: number;
  isActive: boolean;
  type?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  // Operational agricultural fields
  waterSources?: string[];
  soilHealthPractices?: string[];
  irrigationMethods?: string[];
}

interface StandardFarmFormProps {
  onSubmit: (data: EstablishmentFormData) => void;
  onCancel: () => void;
  initialData?: Partial<EstablishmentFormData>;
  isLoading?: boolean;
  isEdit?: boolean;
  companyName?: string;
  /** Optional informational content (e.g. a plan-limit warning) rendered above the stepper.
      Mirrors StandardParcelForm_Transparency — the form stays fully usable; the backend is
      what enforces the limit. */
  preFormAlert?: React.ReactNode;
}

export const StandardFarmForm: React.FC<StandardFarmFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  isEdit = false,
  companyName = '',
  preFormAlert
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [newCrop, setNewCrop] = useState('');
  // Operational field states
  const [newWaterSource, setNewWaterSource] = useState('');
  const [newSoilHealthPractice, setNewSoilHealthPractice] = useState('');
  const [newIrrigationMethod, setNewIrrigationMethod] = useState('');
  const intl = useIntl();
  // Shorthand for the many plain-string labels on this form. Anything taking a value goes
  // through `intl.formatMessage` directly so the placeholder stays visible at the call site.
  const t = (id: string) => intl.formatMessage({ id });
  const toast = useToast();

  // Simplified image management for TrazoImageUpload
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Define steps for stepper - certifications moved to operations step
  const steps = [
    {
      title: t('farm.form.step.basicInfo'),
      description: t('farm.form.step.basicInfo.desc'),
      icon: FaBuilding
    },
    {
      title: t('farm.form.step.location'),
      description: t('farm.form.step.location.desc'),
      icon: FaMapMarkedAlt
    },
    {
      title: t('farm.form.step.operations'),
      description: t('farm.form.step.operations.desc'),
      icon: FaTractor
    },
    { title: t('farm.form.step.media'), description: t('farm.form.step.media.desc'), icon: MdImage }
  ];

  const methods = useForm<EstablishmentFormData>({
    resolver: zodResolver(establishmentSchema),
    defaultValues: {
      isActive: true,
      cropsGrown: [],
      totalAcreage: 0,
      // Operational field defaults
      waterSources: [],
      soilHealthPractices: [],
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

  // 🔴 2026-08-19: two debug effects lived here — one logging every keystroke as
  // `Form field changed: <name> = <value>`, one dumping every form value on each step change.
  // Creating a single farm emitted ~90 console entries, put the grower's farm data into the
  // browser console, and buried the real warnings in the noise. Removed; the watch() import
  // stays because the wizard uses it for conditional rendering.

  // Initialize existing images on edit mode for TrazoImageUpload
  useEffect(() => {
    if (isEdit && initialData?.images) {
      const imageUrls = Array.isArray(initialData.images)
        ? initialData.images
            .map((img: any) => (typeof img === 'string' ? img : img?.url || String(img)))
            .filter(Boolean)
        : [];
      setUploadedImageUrls(imageUrls);
    }
  }, [isEdit, initialData?.images]);

  // The resolver rejected the submit. Send the farmer back to the step holding
  // the first bad field and name it, instead of leaving "Create Farm" looking
  // like a button that does nothing.
  const onInvalidSubmit = (formErrors: Record<string, { message?: string }>) => {
    const badField = Object.keys(formErrors)[0];
    const stepIndex = [0, 1, 2, 3].find((step) =>
      (getFieldsForStep(step) as string[]).includes(badField)
    );

    if (stepIndex !== undefined && stepIndex !== currentStep) {
      setCurrentStep(stepIndex);
    }

    toast({
      title: t('farm.form.toast.checkDetails'),
      description:
        formErrors[badField]?.message || 'Some required information is missing or invalid.',
      status: 'error',
      duration: 5000,
      isClosable: true
    });
  };

  const onSubmitForm = async (data: EstablishmentFormData) => {
    try {
      // Validate all form steps before submission
      const allStepsValid = await Promise.all([
        validateStep(0), // Basic Info
        validateStep(1), // Location
        validateStep(2), // Operations
        validateStep(3) // Media
      ]);

      const hasValidationErrors = allStepsValid.some((isValid) => !isValid);

      if (hasValidationErrors) {
        toast({
          title: t('farm.form.toast.validationError'),
          description: t('farm.form.toast.completePrevious'),
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

      // Success and navigation are handled in AddEstablishment
    } catch {
      // Error toasts are handled in AddEstablishment's catch block
    }
  };

  // Step validation
  const isStepComplete = (step: number) => {
    const formData = watch();

    switch (step) {
      case 0:
        // Basic Info step: only name is required
        const hasName = !!formData.name?.trim();
        const nameError = errors.name;
        return hasName && !nameError;
      case 1:
        // Location step: state is required (used in regional carbon calculations)
        return !!formData.state;
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

  // Operational field helpers
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

  const addSoilHealthPractice = () => {
    if (newSoilHealthPractice.trim()) {
      const currentPractices = watch('soilHealthPractices') || [];
      setValue('soilHealthPractices', [...currentPractices, newSoilHealthPractice.trim()]);
      setNewSoilHealthPractice('');
    }
  };

  const removeSoilHealthPractice = (index: number) => {
    const currentPractices = watch('soilHealthPractices') || [];
    setValue(
      'soilHealthPractices',
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
        title: t('farm.form.toast.validationError'),
        description: t('farm.form.toast.fillRequired'),
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
        return ['name', 'establishmentType', 'description'];
      case 1:
        // zipCode/latitude/longitude live on this step too — omitting them meant an
        // out-of-range coordinate sailed past Next and only failed (silently) at
        // final submit, on a step the farmer could no longer see.
        return ['address', 'city', 'state', 'zipCode', 'latitude', 'longitude'];
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
      title={isEdit ? t('farm.form.page.editTitle') : t('farm.form.page.addTitle')}
      description={
        // Two messages, not a concatenated template: Spanish does not put the company
        // name where English does ("Registre su finca de X" vs "Register your farm under
        // X"), so the sentence has to be translatable as a whole rather than assembled
        // from an English-ordered stem plus a suffix.
        companyName
          ? intl.formatMessage(
              { id: isEdit ? 'farm.form.page.editUnder' : 'farm.form.page.addUnder' },
              { company: companyName }
            )
          : t(isEdit ? 'farm.form.page.edit' : 'farm.form.page.add')
      }
      showBackButton
      onBack={onCancel}>
      {/* Optional pre-flight alert (e.g., subscription limit warning) */}
      {preFormAlert}

      {/* Modern Progress Stepper */}
      <StandardStepper
        steps={steps}
        currentStep={currentStep}
        completedSteps={getCompletedSteps()}
        allowStepClick={true}
        onStepClick={(step) => setCurrentStep(step)}
      />

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmitForm, onInvalidSubmit)}>
          {/* Step 0: Basic Information */}
          {currentStep === 0 && (
            <StandardCard
              title={t('farm.form.card.identity')}
              subtitle={t('farm.form.card.identity.sub')}>
              <VStack spacing={6} align="stretch">
                {/* Name & Type */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label={intl.formatMessage({ id: 'farm.form.farmName.label' })}
                    required
                    error={errors.name?.message}
                    helpText={t('farm.form.farmName.helpText')}>
                    <Controller
                      name="name"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput
                          {...field}
                          placeholder={t('farm.form.farmName.placeholder')}
                        />
                      )}
                    />
                  </StandardField>

                  <StandardField
                    label={intl.formatMessage({ id: 'farm.form.farmType.label' })}
                    error={errors.establishmentType?.message}
                    helpText={t('farm.form.farmType.helpText')}>
                    <Controller
                      name="establishmentType"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardSelect
                          {...field}
                          placeholder={t('farm.form.farmType.placeholder')}>
                          <option value="crop_farm">{t('farm.form.farmType.crop_farm')}</option>
                          <option value="livestock_ranch">
                            {t('farm.form.farmType.livestock_ranch')}
                          </option>
                          <option value="dairy_farm">{t('farm.form.farmType.dairy_farm')}</option>
                          <option value="orchard">{t('farm.form.farmType.orchard')}</option>
                          <option value="vineyard">{t('farm.form.farmType.vineyard')}</option>
                          <option value="greenhouse">{t('farm.form.farmType.greenhouse')}</option>
                          <option value="aquaculture">{t('farm.form.farmType.aquaculture')}</option>
                          <option value="mixed_operation">
                            {t('farm.form.farmType.mixed_operation')}
                          </option>
                        </StandardSelect>
                      )}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Description */}
                <StandardField
                  label={intl.formatMessage({ id: 'farm.form.description.label' })}
                  error={errors.description?.message}
                  helpText={t('farm.form.description.helpText')}>
                  <Controller
                    name="description"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardTextarea
                        {...field}
                        placeholder={t('farm.form.description.placeholder')}
                        minH="120px"
                        resize="vertical"
                      />
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
                      borderRadius="xl"
                      _hover={{ transform: 'translateY(-1px)' }}>
                      {t('farm.form.btn.continue')}
                    </StandardButton>
                  </VStack>

                  {/* Desktop Layout */}
                  <HStack spacing={3} justify="flex-end" display={{ base: 'none', md: 'flex' }}>
                    <StandardButton variant="outline" onClick={onCancel} borderRadius="xl">
                      {t('farm.form.btn.cancel')}
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      rightIcon={<FaChevronRight />}
                      borderRadius="xl"
                      _hover={{ transform: 'translateY(-1px)' }}>
                      {t('app.continue')}
                    </StandardButton>
                  </HStack>
                </Box>
              </VStack>
            </StandardCard>
          )}

          {/* Step 1: Location Information */}
          {currentStep === 1 && (
            <StandardCard
              title={t('farm.form.card.location')}
              subtitle={t('farm.form.card.location.sub')}>
              <VStack spacing={6} align="stretch">
                {/* Address */}
                <StandardField
                  label={intl.formatMessage({ id: 'farm.form.streetAddress.label' })}
                  error={errors.address?.message}
                  helpText={t('farm.form.streetAddress.helpText')}>
                  <Controller
                    name="address"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardInput
                        {...field}
                        placeholder={t('farm.form.streetAddress.placeholder')}
                      />
                    )}
                  />
                </StandardField>

                {/* City & State */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label={intl.formatMessage({ id: 'farm.form.city.label' })}
                    error={errors.city?.message}>
                    <Controller
                      name="city"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput {...field} placeholder={t('farm.form.city.placeholder')} />
                      )}
                    />
                  </StandardField>

                  <StandardField
                    label={intl.formatMessage({ id: 'farm.form.state.label' })}
                    required
                    error={errors.state?.message}
                    helpText={t('farm.form.state.helpText')}>
                    <Controller
                      name="state"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardSelect {...field} placeholder={t('farm.form.state.placeholder')}>
                          {US_STATES.map((state) => (
                            <option key={state.code} value={state.code}>
                              {state.name}
                            </option>
                          ))}
                        </StandardSelect>
                      )}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* ZIP Code */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label={intl.formatMessage({ id: 'farm.form.zipCode.label' })}
                    error={errors.zipCode?.message}>
                    <Controller
                      name="zipCode"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput
                          {...field}
                          placeholder={t('farm.form.zipCode.placeholder')}
                        />
                      )}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Zone */}
                <StandardField
                  label={intl.formatMessage({ id: 'farm.form.zone.label' })}
                  error={errors.zone?.message}
                  helpText={t('farm.form.zone.helpText')}>
                  <Controller
                    name="zone"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardInput {...field} placeholder={t('farm.form.zone.placeholder')} />
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
                      label={intl.formatMessage({ id: 'farm.form.latitude.label' })}
                      error={errors.latitude?.message}
                      helpText={t('farm.form.latitude.helpText')}>
                      <Controller
                        name="latitude"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardInput
                            value={
                              field.value !== undefined && field.value !== null
                                ? String(field.value)
                                : ''
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              // Allow empty, minus sign, decimal point, and valid number patterns
                              if (
                                val === '' ||
                                val === '-' ||
                                val === '.' ||
                                val === '-.' ||
                                /^-?\d*\.?\d*$/.test(val)
                              ) {
                                // Store as string during typing, parse on blur
                                field.onChange(val === '' ? undefined : val);
                              }
                            }}
                            onBlur={(e) => {
                              const val = e.target.value;
                              if (val && val !== '-' && val !== '.' && val !== '-.') {
                                const num = parseFloat(val);
                                if (!isNaN(num)) {
                                  // Parse to number, zod validates the range
                                  field.onChange(num);
                                } else {
                                  // Invalid number format
                                  field.onChange(undefined);
                                }
                              } else {
                                // Empty or incomplete input
                                field.onChange(undefined);
                              }
                              // Trigger validation
                              field.onBlur();
                            }}
                            inputMode="decimal"
                            placeholder={t('farm.form.latitude.placeholder')}
                          />
                        )}
                      />
                    </StandardField>

                    <StandardField
                      label={intl.formatMessage({ id: 'farm.form.longitude.label' })}
                      error={errors.longitude?.message}
                      helpText={t('farm.form.longitude.helpText')}>
                      <Controller
                        name="longitude"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardInput
                            value={
                              field.value !== undefined && field.value !== null
                                ? String(field.value)
                                : ''
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              // Allow empty, minus sign, decimal point, and valid number patterns
                              if (
                                val === '' ||
                                val === '-' ||
                                val === '.' ||
                                val === '-.' ||
                                /^-?\d*\.?\d*$/.test(val)
                              ) {
                                // Store as string during typing, parse on blur
                                field.onChange(val === '' ? undefined : val);
                              }
                            }}
                            onBlur={(e) => {
                              const val = e.target.value;
                              if (val && val !== '-' && val !== '.' && val !== '-.') {
                                const num = parseFloat(val);
                                if (!isNaN(num)) {
                                  // Parse to number, zod validates the range
                                  field.onChange(num);
                                } else {
                                  // Invalid number format
                                  field.onChange(undefined);
                                }
                              } else {
                                // Empty or incomplete input
                                field.onChange(undefined);
                              }
                              // Trigger validation
                              field.onBlur();
                            }}
                            inputMode="decimal"
                            placeholder={t('farm.form.longitude.placeholder')}
                          />
                        )}
                      />
                    </StandardField>
                  </SimpleGrid>
                </Box>

                {/* Mobile-First Navigation */}
                <Box pt={4}>
                  {/* Mobile Layout */}
                  <HStack
                    spacing={3}
                    justify="space-between"
                    w="100%"
                    display={{ base: 'flex', md: 'none' }}>
                    <StandardButton
                      variant="outline"
                      size="md"
                      leftIcon={<FaChevronLeft />}
                      onClick={previousStep}
                      borderRadius="xl">
                      {t('common.back')}
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      size="md"
                      rightIcon={<FaChevronRight />}
                      borderRadius="xl"
                      _hover={{ transform: 'translateY(-1px)' }}>
                      {t('farm.form.btn.continue')}
                    </StandardButton>
                  </HStack>

                  {/* Desktop Layout */}
                  <HStack
                    spacing={3}
                    justify="space-between"
                    display={{ base: 'none', md: 'flex' }}>
                    <StandardButton
                      variant="outline"
                      leftIcon={<FaChevronLeft />}
                      onClick={previousStep}
                      borderRadius="xl">
                      {t('common.back')}
                    </StandardButton>

                    <HStack spacing={3}>
                      <StandardButton variant="outline" onClick={onCancel} borderRadius="xl">
                        {t('farm.form.btn.cancel')}
                      </StandardButton>
                      <StandardButton
                        onClick={nextStep}
                        rightIcon={<FaChevronRight />}
                        borderRadius="xl"
                        _hover={{ transform: 'translateY(-1px)' }}>
                        {intl.formatMessage({ id: 'app.continue' })}
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
              title={t('farm.form.card.operations')}
              subtitle={t('farm.form.card.operations.sub')}>
              <VStack spacing={6} align="stretch">
                {/* Farming Method & Acreage */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label={intl.formatMessage({ id: 'farm.form.farmingMethod.label' })}
                    error={errors.farmingMethod?.message}
                    helpText={t('farm.form.farmingMethod.helpText')}>
                    <Controller
                      name="farmingMethod"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardSelect
                          {...field}
                          placeholder={t('farm.form.farmingMethod.placeholder')}>
                          {FARMING_METHOD_OPTIONS.map(({ value, label }) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </StandardSelect>
                      )}
                    />
                  </StandardField>

                  {/*
                    ACRES, not hectares. `Establishment.total_acreage` is documented
                    and stored as acres, and every read path renders it as acres
                    (ProfileFarm, the consumer FarmModal). This input alone used to be
                    labelled "Hectares", so a grower who dutifully converted 320 acres
                    to 129.5 stored 129.5 *acres* — a silent 2.47x understatement that
                    surfaced on the consumer page.
                  */}
                  <StandardField
                    label={intl.formatMessage({ id: 'farm.form.totalArea.label' })}
                    error={errors.totalAcreage?.message}
                    helpText={t('farm.form.totalArea.helpText')}>
                    <Controller
                      name="totalAcreage"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardNumberInput
                          value={field.value || 0}
                          onChange={(_, num) => field.onChange(num || 0)}
                          min={0}
                          placeholder={t('farm.form.totalArea.placeholder')}
                        />
                      )}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Year Established */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label={intl.formatMessage({ id: 'farm.form.yearEstablished.label' })}
                    error={errors.yearEstablished?.message}
                    helpText={t('farm.form.yearEstablished.helpText')}>
                    <Controller
                      name="yearEstablished"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardNumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={1800}
                          max={new Date().getFullYear()}
                          placeholder={t('farm.form.yearEstablished.placeholder')}
                        />
                      )}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Crops Grown */}
                <StandardField
                  label={intl.formatMessage({ id: 'farm.form.cropsGrown.label' })}
                  helpText={intl.formatMessage({ id: 'farm.form.cropsGrown.helpText' })}>
                  <Controller
                    name="cropsGrown"
                    control={methods.control}
                    render={({ field }) => (
                      <VStack align="stretch" spacing={3}>
                        <HStack>
                          <StandardInput
                            value={newCrop}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setNewCrop(e.target.value);
                            }}
                            placeholder={t('farm.form.cropsGrown.placeholder')}
                            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newCrop.trim()) {
                                  field.onChange([...(field.value || []), newCrop.trim()]);
                                  setNewCrop('');
                                }
                              }
                            }}
                          />
                          <StandardButton
                            onClick={() => {
                              if (newCrop.trim()) {
                                field.onChange([...(field.value || []), newCrop.trim()]);
                                setNewCrop('');
                              }
                            }}
                            leftIcon={<FaPlus />}
                            size="sm">
                            {t('farm.form.btn.add')}
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

                {/* Certifications — managed via CertificationManager in Establishment Profile */}
                <StandardField
                  label={intl.formatMessage({ id: 'certification.manage.title' })}
                  helpText={intl.formatMessage({ id: 'certification.form.helpText' })}>
                  <Box
                    p={4}
                    bg="blue.50"
                    borderRadius="lg"
                    border="1px solid"
                    borderColor="blue.200">
                    <HStack spacing={2}>
                      <Icon as={FaCertificate} color="blue.500" boxSize={4} flexShrink={0} />
                      <Text fontSize="sm" color="blue.700">
                        {intl.formatMessage({ id: 'certification.form.guidance' })}
                      </Text>
                    </HStack>
                  </Box>
                </StandardField>

                {/* Water & Soil — operational facts shown on the farm profile */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mt={6} mb={2}>
                  {intl.formatMessage({
                    id: 'farm.form.waterSoil.title',
                    defaultMessage: 'Water & Soil'
                  })}
                </Text>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  {intl.formatMessage({
                    id: 'farm.form.waterSoil.subtitle',
                    defaultMessage:
                      'Operational details about your water, soil, and irrigation. Shown on your farm profile.'
                  })}
                </Text>

                {/* Water Sources */}
                <StandardField
                  label={intl.formatMessage({ id: 'farm.form.waterSources.label' })}
                  helpText={intl.formatMessage({
                    id: 'farm.form.waterSources.helpText',
                    defaultMessage:
                      'Where your operation gets its water (e.g., well, irrigation district, surface water)'
                  })}>
                  <Controller
                    name="waterSources"
                    control={methods.control}
                    render={({ field }) => (
                      <VStack align="stretch" spacing={3}>
                        <HStack>
                          <StandardInput
                            value={newWaterSource}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setNewWaterSource(e.target.value);
                            }}
                            placeholder={t('farm.form.waterSources.placeholder')}
                            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addWaterSource();
                              }
                            }}
                          />
                          <StandardButton onClick={addWaterSource} leftIcon={<FaPlus />} size="sm">
                            {t('farm.form.btn.add')}
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

                {/* Soil Health Practices — stored in the legacy `soil_types` column */}
                <StandardField
                  label={intl.formatMessage({ id: 'farm.form.soilHealthPractices.label' })}
                  helpText={intl.formatMessage({
                    id: 'farm.form.soilHealthPractices.helpText',
                    defaultMessage:
                      'Practices you use to maintain and improve soil health (e.g., cover cropping, compost)'
                  })}>
                  <Controller
                    name="soilHealthPractices"
                    control={methods.control}
                    render={({ field }) => (
                      <VStack align="stretch" spacing={3}>
                        <HStack>
                          <StandardInput
                            value={newSoilHealthPractice}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setNewSoilHealthPractice(e.target.value);
                            }}
                            placeholder={t('farm.form.soilHealthPractices.placeholder')}
                            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addSoilHealthPractice();
                              }
                            }}
                          />
                          <StandardButton
                            onClick={addSoilHealthPractice}
                            leftIcon={<FaPlus />}
                            size="sm">
                            {t('farm.form.btn.add')}
                          </StandardButton>
                        </HStack>
                        {field.value?.length ? (
                          <HStack spacing={2} flexWrap="wrap">
                            {field.value.map((practice, index) => (
                              <Tag key={index} size="md" variant="solid" colorScheme="orange">
                                <TagLabel>{practice}</TagLabel>
                                <TagCloseButton onClick={() => removeSoilHealthPractice(index)} />
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
                  label={intl.formatMessage({ id: 'farm.form.irrigationMethods.label' })}
                  helpText={intl.formatMessage({
                    id: 'farm.form.irrigationMethods.helpText',
                    defaultMessage: 'Irrigation systems used on your operation'
                  })}>
                  <Controller
                    name="irrigationMethods"
                    control={methods.control}
                    render={({ field }) => (
                      <VStack align="stretch" spacing={3}>
                        <HStack>
                          <StandardInput
                            value={newIrrigationMethod}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setNewIrrigationMethod(e.target.value);
                            }}
                            placeholder={t('farm.form.irrigationMethods.placeholder')}
                            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addIrrigationMethod();
                              }
                            }}
                          />
                          <StandardButton
                            onClick={addIrrigationMethod}
                            leftIcon={<FaPlus />}
                            size="sm">
                            {t('farm.form.btn.add')}
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

                {/* Personal Message to Consumers */}
                <StandardField
                  label={intl.formatMessage({ id: 'farm.form.customMessage.label' })}
                  error={errors.custom_message?.message}
                  helpText={t('farm.form.customMessage.helpText')}>
                  <Controller
                    name="custom_message"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardTextarea
                        {...field}
                        placeholder={intl.formatMessage({
                          id: 'farm.form.customMessage.placeholder',
                          defaultMessage:
                            'Thank you for choosing our farm! We are happy to answer questions about how we grow...'
                        })}
                        minH="100px"
                        resize="vertical"
                      />
                    )}
                  />
                </StandardField>

                {/* Mobile-First Navigation */}
                <Box pt={4}>
                  {/* Mobile Layout */}
                  <HStack
                    spacing={3}
                    justify="space-between"
                    w="100%"
                    display={{ base: 'flex', md: 'none' }}>
                    <StandardButton
                      variant="outline"
                      size="md"
                      leftIcon={<FaChevronLeft />}
                      onClick={previousStep}
                      borderRadius="xl">
                      {t('common.back')}
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      size="md"
                      rightIcon={<FaChevronRight />}
                      borderRadius="xl"
                      _hover={{ transform: 'translateY(-1px)' }}>
                      {t('farm.form.btn.continue')}
                    </StandardButton>
                  </HStack>

                  {/* Desktop Layout */}
                  <HStack
                    spacing={3}
                    justify="space-between"
                    display={{ base: 'none', md: 'flex' }}>
                    <StandardButton
                      variant="outline"
                      leftIcon={<FaChevronLeft />}
                      onClick={previousStep}
                      borderRadius="xl">
                      {t('common.back')}
                    </StandardButton>

                    <HStack spacing={3}>
                      <StandardButton variant="outline" onClick={onCancel} borderRadius="xl">
                        {t('farm.form.btn.cancel')}
                      </StandardButton>
                      <StandardButton
                        onClick={nextStep}
                        rightIcon={<FaChevronRight />}
                        borderRadius="xl"
                        _hover={{ transform: 'translateY(-1px)' }}>
                        {intl.formatMessage({ id: 'app.continue' })}
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
              title={t('farm.form.card.images')}
              subtitle={t('farm.form.card.images.sub')}>
              <VStack spacing={8} align="stretch">
                {/* 2025 Modern Image Upload */}
                <StandardField
                  label={intl.formatMessage({ id: 'farm.form.images.label' })}
                  helpText={t('farm.form.images.helpText')}>
                  <TrazoImageUpload
                    maxFiles={5}
                    maxSize={5 * 1024 * 1024} // 5MB
                    existingImages={uploadedImageUrls}
                    onImagesChange={setUploadedImageUrls}
                    isLoading={isUploading}
                  />
                </StandardField>

                {/* Mobile-First Navigation */}
                <Box pt={4}>
                  {/* Mobile Layout */}
                  <HStack
                    spacing={3}
                    justify="space-between"
                    w="100%"
                    display={{ base: 'flex', md: 'none' }}>
                    <StandardButton
                      variant="outline"
                      size="md"
                      leftIcon={<FaChevronLeft />}
                      onClick={previousStep}
                      borderRadius="xl">
                      {t('common.back')}
                    </StandardButton>
                    <StandardButton
                      type="submit"
                      size="md"
                      isLoading={isLoading}
                      loadingText={
                        isEdit ? t('farm.form.btn.updating') : t('farm.form.btn.creating')
                      }
                      leftIcon={<FaCheckCircle />}
                      borderRadius="xl"
                      _hover={{ transform: 'translateY(-1px)' }}>
                      {isEdit ? t('farm.form.btn.update') : t('farm.form.btn.create')}
                    </StandardButton>
                  </HStack>

                  {/* Desktop Layout */}
                  <HStack
                    spacing={3}
                    justify="space-between"
                    display={{ base: 'none', md: 'flex' }}>
                    <StandardButton
                      variant="outline"
                      leftIcon={<FaChevronLeft />}
                      onClick={previousStep}
                      borderRadius="xl">
                      {t('common.back')}
                    </StandardButton>

                    <HStack spacing={3}>
                      <StandardButton variant="outline" onClick={onCancel} borderRadius="xl">
                        {t('farm.form.btn.cancel')}
                      </StandardButton>
                      <StandardButton
                        type="submit"
                        isLoading={isLoading}
                        loadingText={isEdit ? 'Updating...' : 'Creating...'}
                        leftIcon={<FaCheckCircle />}
                        borderRadius="xl"
                        _hover={{ transform: 'translateY(-1px)' }}>
                        {isEdit ? t('farm.form.btn.updateFarm') : t('farm.form.btn.createFarm')}
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

export default StandardFarmForm;
