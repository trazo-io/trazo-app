import React, { useState, useEffect, useRef } from 'react';
import {
  VStack,
  HStack,
  Box,
  Text,
  Icon,
  Badge,
  useToast,
  useDisclosure,
  Input,
  Select,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter
} from '@chakra-ui/react';
import {
  StandardPage,
  StandardField,
  StandardTextarea,
  StandardButton,
  StandardAlert,
  StandardStepper,
  SectionBox,
  SectionHeader
} from '../Design/StandardComponents';
import { TrazoImageUpload } from '../Upload';
import { HeroPreviewCard } from '../QR/HeroPreviewCard';
import { FaLeaf, FaCamera, FaBoxes, FaClipboardCheck, FaLock, FaExclamationTriangle } from 'react-icons/fa';
import { MdDescription, MdInventory } from 'react-icons/md';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useIntl } from 'react-intl';

// Unit options for production amount
const UNIT_OPTIONS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'lb', label: 'Pounds (lb)' },
  { value: 'boxes', label: 'Boxes' },
  { value: 'crates', label: 'Crates' },
  { value: 'tons', label: 'Tons' },
  { value: 'bushels', label: 'Bushels' },
  { value: 'units', label: 'Units' }
];

// Quality grade options
const QUALITY_GRADE_OPTIONS = [
  { value: '', label: 'Select quality grade...' },
  { value: 'premium', label: 'Premium Grade' },
  { value: 'grade_a', label: 'Grade A' },
  { value: 'grade_b', label: 'Grade B' },
  { value: 'standard', label: 'Standard' },
  { value: 'processing', label: 'Processing Grade' }
];

// Harvest method options
const HARVEST_METHOD_OPTIONS = [
  { value: '', label: 'Select harvest method...' },
  { value: 'manual', label: 'Manual Harvest' },
  { value: 'mechanical', label: 'Mechanical Harvest' },
  { value: 'mixed', label: 'Mixed (Manual + Mechanical)' }
];

// Enhanced form schema with new fields
const finishProductionSchema = z.object({
  production_amount: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, 'Production amount must be a number greater than 0'),
  production_unit: z.string().min(1, 'Unit is required'),
  lot_id: z.string().min(1, 'Lot number is required').max(50, 'Lot number is too long'),
  finish_date: z.string().min(1, 'Finish date is required'),
  quality_grade: z.string().optional(),
  harvest_method: z.string().optional(),
  observation: z.string().optional()
});

type FinishProductionFormData = z.infer<typeof finishProductionSchema>;

// Internal form state type that matches HTML form fields
type FormStateData = {
  production_amount: string;
  production_unit: string;
  lot_id: string;
  finish_date: string;
  quality_grade: string;
  harvest_method: string;
  observation: string;
};

interface StandardFinishProductionFormProps {
  onSubmit: (
    data: FinishProductionFormData & { uploaded_image_urls: string[]; images: string[] }
  ) => void;
  onCancel: () => void;
  initialData?: Partial<FinishProductionFormData>;
  isLoading?: boolean;
  isEdit?: boolean;
  productName?: string;
  parcelName?: string;
  farmName?: string;
  /** Real transparency score (0-100) for the live consumer preview. */
  previewScore?: number;
  /** Harvest date ISO string for the live consumer preview. */
  harvestDate?: string;
  /** First event-timeline photo. When the farmer uploads no production
      photos, the consumer page falls back to this image. We pass it
      through so the preview can show the same fallback the shopper
      will see. */
  fallbackImageUrl?: string;
}

export const StandardFinishProductionForm: React.FC<StandardFinishProductionFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  isEdit = false,
  productName = '',
  parcelName = '',
  farmName = '',
  previewScore,
  harvestDate,
  fallbackImageUrl
}) => {
  // DEBUG log on component mount
  console.log('📦 StandardFinishProductionForm v2.0 rendered');

  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [savedFormData, setSavedFormData] = useState<Partial<FormStateData>>({});
  const intl = useIntl();
  const toast = useToast();

  // Confirmation dialog for finishing production (immutability warning)
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
  const confirmCancelRef = useRef<HTMLButtonElement>(null);
  const [pendingFormData, setPendingFormData] = useState<FormStateData | null>(null);

  // Define steps for the finish production process
  const steps = [
    {
      title: 'Production Info',
      description: 'Final details',
      icon: MdInventory
    },
    {
      title: 'Media Upload',
      description: 'Documentation',
      icon: FaCamera
    }
  ];

  const methods = useForm<FormStateData>({
    resolver: zodResolver(finishProductionSchema),
    mode: 'onChange',
    defaultValues: {
      production_amount: '',
      production_unit: 'kg',
      lot_id: '',
      finish_date: '',
      quality_grade: '',
      harvest_method: '',
      observation: ''
    }
  });

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    control,
    formState: { errors }
  } = methods;

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      const formDefaults: FormStateData = {
        production_amount: initialData.production_amount?.toString() || '',
        production_unit: initialData.production_unit || 'kg',
        lot_id: initialData.lot_id || '',
        finish_date: initialData.finish_date || '',
        quality_grade: initialData.quality_grade || '',
        harvest_method: initialData.harvest_method || '',
        observation: initialData.observation || ''
      };
      reset(formDefaults);
      setSavedFormData(formDefaults);
    }
  }, [initialData, reset]);

  // Restore saved form data when returning to step 1
  useEffect(() => {
    if (currentStep === 0 && Object.keys(savedFormData).length > 0) {
      Object.entries(savedFormData).forEach(([key, value]) => {
        setValue(key as keyof FormStateData, value);
      });
    }
  }, [currentStep, savedFormData, setValue]);

  // Enhanced form submission handler
  const onSubmitForm = (data: FormStateData) => {
    try {
      const mergedData = {
        ...savedFormData,
        ...data
      };

      const finalFormData: FinishProductionFormData = {
        production_amount: Number(mergedData.production_amount || 0),
        production_unit: mergedData.production_unit || 'kg',
        lot_id: mergedData.lot_id || '',
        finish_date: mergedData.finish_date || '',
        quality_grade: mergedData.quality_grade,
        harvest_method: mergedData.harvest_method,
        observation: mergedData.observation
      };

      const finalData = {
        ...finalFormData,
        uploaded_image_urls: uploadedImageUrls,
        images: uploadedImageUrls
      };

      console.log('📦 Final data to submit:', finalData);
      onSubmit(finalData);
    } catch (error) {
      console.error('❌ Submit error:', error);
      toast({
        title: 'Error',
        description: 'Failed to prepare production data. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  // Manual submit function — validates then opens confirmation dialog
  const handleManualSubmit = () => {
    const currentValues = getValues();
    const allFormData = {
      ...savedFormData,
      ...currentValues
    };

    try {
      finishProductionSchema.parse(allFormData);
      // Validation passed — show confirmation dialog before submitting
      if (isEdit) {
        // For edits, submit directly (production already finished)
        onSubmitForm(allFormData);
      } else {
        setPendingFormData(allFormData);
        onConfirmOpen();
      }
    } catch (validationError) {
      console.error('❌ Data validation failed:', validationError);
      toast({
        title: 'Validation Error',
        description: 'Please check all required fields are filled correctly.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  // Confirmed finish — actually submit the form
  const handleConfirmFinish = () => {
    if (pendingFormData) {
      onSubmitForm(pendingFormData);
      setPendingFormData(null);
    }
    onConfirmClose();
  };

  // Step progression logic
  const nextStep = () => {
    if (currentStep === 0) {
      const currentValues = getValues();
      setSavedFormData(currentValues);
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      const currentValues = getValues();
      setSavedFormData((prev) => ({ ...prev, ...currentValues }));
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    const currentValues = getValues();
    setSavedFormData((prev) => ({ ...prev, ...currentValues }));
    setCurrentStep(step);
  };

  // Watch form values for reactive validation
  const watchedValues = watch(['production_amount', 'production_unit', 'lot_id', 'finish_date']);

  // Step validation
  const isStep0Valid = React.useMemo(() => {
    const currentValues = getValues();
    const effectiveValues = { ...savedFormData, ...currentValues };

    const amount = effectiveValues.production_amount;
    const unit = effectiveValues.production_unit;
    const lotId = effectiveValues.lot_id;
    const finishDate = effectiveValues.finish_date;

    return !!(
      amount &&
      unit &&
      lotId &&
      finishDate &&
      String(amount).trim() !== '' &&
      String(unit).trim() !== '' &&
      String(lotId).trim() !== '' &&
      String(finishDate).trim() !== ''
    );
  }, [watchedValues, savedFormData]);

  // Get completed steps
  const getCompletedSteps = () => {
    const completed = [];
    for (let i = 0; i < currentStep; i++) {
      completed.push(i);
    }
    return completed;
  };

  return (
    <StandardPage
      title={isEdit ? 'Edit Production Completion' : 'Finish Production'}
      description={`${isEdit ? 'Update' : 'Complete'} the production cycle${
        productName ? ` for ${productName}` : ''
      }${parcelName ? ` in ${parcelName}` : ''}`}
      showBackButton
      onBack={onCancel}
      rightAction={
        <Badge colorScheme="green" variant="subtle" px={3} py={1} borderRadius="full">
          <HStack spacing={1}>
            <Icon as={FaLeaf} boxSize={3} />
            <Text fontSize="sm">Final Step</Text>
          </HStack>
        </Badge>
      }
    >
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmitForm)}>
          <VStack spacing={8} align="stretch">
            {/* Progress Stepper */}
            <StandardStepper
              steps={steps}
              currentStep={currentStep}
              completedSteps={getCompletedSteps()}
              allowStepClick={true}
              onStepClick={goToStep}
            />

            {/* Step 1: Production Information */}
            {currentStep === 0 && (
              <VStack spacing={6} align="stretch">
                {/* Parent Card Container - like Add Event form */}
                <Box
                  bg="white"
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="gray.200"
                  overflow="hidden"
                  shadow="sm"
                >
                  {/* Parent Header - matching Event Details style */}
                  <Box px={6} py={5} borderBottom="1px solid" borderColor="gray.100">
                    <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                      Production Information
                    </Text>
                  </Box>

                  {/* Section Cards Container */}
                  <VStack spacing={4} p={6} align="stretch">
                    {/* Harvest Output Section */}
                    <SectionBox variant="default">
                      <SectionHeader
                        icon={FaBoxes}
                        iconColor="green.500"
                        title="Harvest Output"
                        badge="Required"
                        badgeColorScheme="green"
                      />
                      <VStack spacing={4} align="stretch">
                        {/* Production Amount with Unit Selector */}
                        <HStack spacing={4} align="flex-start">
                          <Box flex={2}>
                            <StandardField
                              label={
                                intl.formatMessage({ id: 'app.productionAmount' }) ||
                                'Production Amount'
                              }
                              error={errors.production_amount?.message}
                              helpText="Total volume or quantity harvested"
                              required
                            >
                              <Input
                                {...methods.register('production_amount')}
                                placeholder="Enter amount harvested"
                                type="number"
                                min="0"
                                step="0.01"
                                borderRadius="lg"
                                borderColor="gray.300"
                                _hover={{ borderColor: 'green.400' }}
                                _focus={{
                                  borderColor: 'green.500',
                                  boxShadow: '0 0 0 1px #38A169'
                                }}
                                size="lg"
                              />
                            </StandardField>
                          </Box>
                          <Box flex={1}>
                            <StandardField
                              label="Unit"
                              error={errors.production_unit?.message}
                              required
                            >
                              <Controller
                                name="production_unit"
                                control={control}
                                render={({ field }) => (
                                  <Select
                                    {...field}
                                    borderRadius="lg"
                                    borderColor="gray.300"
                                    _hover={{ borderColor: 'green.400' }}
                                    _focus={{
                                      borderColor: 'green.500',
                                      boxShadow: '0 0 0 1px #38A169'
                                    }}
                                    size="lg"
                                  >
                                    {UNIT_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </Select>
                                )}
                              />
                            </StandardField>
                          </Box>
                        </HStack>

                        {/* Lot Number */}
                        <StandardField
                          label={intl.formatMessage({ id: 'app.lotNumber' }) || 'Lot Number'}
                          error={errors.lot_id?.message}
                          helpText="Unique identifier for this batch"
                          required
                        >
                          <Input
                            {...methods.register('lot_id')}
                            placeholder="Enter lot number"
                            type="text"
                            maxLength={50}
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                            size="lg"
                          />
                        </StandardField>

                        {/* Finish Date */}
                        <StandardField
                          label={intl.formatMessage({ id: 'app.finishDate' }) || 'Completion Date'}
                          error={errors.finish_date?.message}
                          helpText="When was this production cycle completed?"
                          required
                        >
                          <Input
                            {...methods.register('finish_date')}
                            placeholder="Select completion date and time"
                            type="datetime-local"
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                            size="lg"
                          />
                        </StandardField>
                      </VStack>
                    </SectionBox>

                    {/* Quality & Harvest Details Section */}
                    <SectionBox variant="highlighted">
                      <SectionHeader
                        icon={FaClipboardCheck}
                        iconColor="purple.500"
                        title="Quality & Harvest Details"
                        badge="Optional"
                        badgeColorScheme="purple"
                      />
                      <Text fontSize="sm" color="gray.600" mb={4}>
                        This information helps consumers understand your product better
                      </Text>
                      <VStack spacing={4} align="stretch">
                        <HStack spacing={4} align="flex-start">
                          <Box flex={1}>
                            <StandardField
                              label="Quality Grade"
                              helpText="Quality classification of harvest"
                            >
                              <Controller
                                name="quality_grade"
                                control={control}
                                render={({ field }) => (
                                  <Select
                                    {...field}
                                    borderRadius="lg"
                                    borderColor="gray.300"
                                    _hover={{ borderColor: 'green.400' }}
                                    _focus={{
                                      borderColor: 'green.500',
                                      boxShadow: '0 0 0 1px #38A169'
                                    }}
                                    size="lg"
                                  >
                                    {QUALITY_GRADE_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </Select>
                                )}
                              />
                            </StandardField>
                          </Box>
                          <Box flex={1}>
                            <StandardField
                              label="Harvest Method"
                              helpText="How was the crop harvested?"
                            >
                              <Controller
                                name="harvest_method"
                                control={control}
                                render={({ field }) => (
                                  <Select
                                    {...field}
                                    borderRadius="lg"
                                    borderColor="gray.300"
                                    _hover={{ borderColor: 'green.400' }}
                                    _focus={{
                                      borderColor: 'green.500',
                                      boxShadow: '0 0 0 1px #38A169'
                                    }}
                                    size="lg"
                                  >
                                    {HARVEST_METHOD_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </Select>
                                )}
                              />
                            </StandardField>
                          </Box>
                        </HStack>
                      </VStack>
                    </SectionBox>

                    {/* Notes Section */}
                    <SectionBox variant="default">
                      <SectionHeader
                        icon={MdDescription}
                        iconColor="blue.500"
                        title="Notes & Observations"
                        badge="Optional"
                        badgeColorScheme="gray"
                      />
                      <StandardField
                        label={intl.formatMessage({ id: 'app.observations' }) || 'Observations'}
                        error={errors.observation?.message}
                        helpText="Additional notes about this production cycle"
                      >
                        <StandardTextarea
                          {...methods.register('observation')}
                          placeholder="Enter any observations or notes about the harvest..."
                          rows={4}
                        />
                      </StandardField>
                    </SectionBox>
                  </VStack>
                </Box>

                {/* Step Navigation */}
                <HStack spacing={4} justify="flex-end" pt={4}>
                  <StandardButton variant="outline" onClick={onCancel} disabled={isLoading}>
                    Cancel
                  </StandardButton>

                  <StandardButton onClick={nextStep} disabled={!isStep0Valid}>
                    Continue to Media
                  </StandardButton>
                </HStack>
              </VStack>
            )}

            {/* Step 2: Media Upload */}
            {currentStep === 1 && (
              <SectionBox variant="default">
                <SectionHeader
                  icon={FaCamera}
                  iconColor="orange.500"
                  title="Production photos"
                  badge="Optional"
                  badgeColorScheme="orange"
                />
                <Text fontSize="sm" color="gray.600" mb={1}>
                  Upload up to 5 photos. The first is shown as the cover on the public consumer QR page.
                </Text>
                <Text fontSize="xs" color="gray.500" mb={5}>
                  No upload? We&apos;ll auto-pick the first photo from your timeline events. Upload here for full control.
                </Text>
                <VStack spacing={6} align="stretch">
                  <Box
                    display="grid"
                    gap={8}
                    alignItems="start"
                    gridTemplateColumns={{ base: '1fr', lg: '1fr 320px' }}
                  >
                    {/* Upload column — gets the wider track since this is
                        the active task surface. */}
                    <StandardField
                      label={
                        intl.formatMessage({ id: 'app.productionImages' }) || 'Production photos'
                      }
                    >
                      <TrazoImageUpload
                        maxFiles={5}
                        maxSize={5 * 1024 * 1024}
                        existingImages={uploadedImageUrls}
                        onImagesChange={setUploadedImageUrls}
                        isLoading={false}
                      />
                    </StandardField>

                    {/* Preview column — fixed 320px on desktop, stacks
                        below on mobile. `position: sticky` keeps the
                        preview visible while the farmer scrolls inside
                        the upload list. Top offset clears the page hero
                        so the card never collides with the stepper. */}
                    <Box
                      position={{ base: 'static', lg: 'sticky' }}
                      top={{ lg: 6 }}
                      alignSelf="start"
                    >
                      <HeroPreviewCard
                        imageUrl={uploadedImageUrls[0]}
                        imageCount={uploadedImageUrls.length}
                        farmName={farmName}
                        productName={productName}
                        score={previewScore}
                        harvestDate={harvestDate}
                        fallbackImageUrl={fallbackImageUrl}
                      />
                    </Box>
                  </Box>

                  {uploadedImageUrls.length >= 5 && (
                    <StandardAlert
                      status="info"
                      title="Upload Limit Reached"
                      description="Maximum of 5 images allowed. Remove an image to add a new one."
                    />
                  )}

                  {/* Step Navigation */}
                  <HStack spacing={4} justify="space-between" pt={4}>
                    <StandardButton variant="outline" onClick={previousStep}>
                      Back to Production Info
                    </StandardButton>

                    <StandardButton
                      isLoading={isLoading}
                      loadingText="Finishing Production..."
                      onClick={handleManualSubmit}
                      size="lg"
                    >
                      {intl.formatMessage({ id: 'app.finishProduction' }) || 'Finish Production'}
                    </StandardButton>
                  </HStack>
                </VStack>
              </SectionBox>
            )}
          </VStack>
        </form>
      </FormProvider>

      {/* Immutability Confirmation Dialog */}
      <AlertDialog
        isOpen={isConfirmOpen}
        leastDestructiveRef={confirmCancelRef}
        onClose={onConfirmClose}
        isCentered
      >
        <AlertDialogOverlay bg="blackAlpha.300" backdropFilter="blur(10px)">
          <AlertDialogContent borderRadius="xl" p={2} mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" pb={4}>
              <HStack spacing={3}>
                <Box p={2} borderRadius="lg" bg="orange.50">
                  <Icon as={FaExclamationTriangle} boxSize={5} color="orange.500" />
                </Box>
                <Text>Finish Production</Text>
              </HStack>
            </AlertDialogHeader>

            <AlertDialogBody pb={6}>
              <VStack align="start" spacing={3}>
                <Text color="gray.600">
                  Are you sure you want to finish this production? This action is permanent and cannot be undone.
                </Text>
                <Box p={3} bg="orange.50" borderRadius="lg" w="full">
                  <Text fontSize="sm" color="orange.700" fontWeight="medium">
                    Once you finish this production:
                  </Text>
                  <VStack align="start" spacing={1} mt={2} fontSize="sm" color="orange.600">
                    <HStack spacing={2}>
                      <Icon as={FaLock} boxSize={3} />
                      <Text>All events will be permanently locked and cannot be edited or deleted</Text>
                    </HStack>
                    <HStack spacing={2}>
                      <Icon as={FaLock} boxSize={3} />
                      <Text>Event data will be secured for blockchain verification</Text>
                    </HStack>
                    <HStack spacing={2}>
                      <Icon as={FaLock} boxSize={3} />
                      <Text>The production will become visible to consumers via QR code</Text>
                    </HStack>
                  </VStack>
                </Box>
                <Text fontSize="xs" color="gray.500">
                  Please review all events carefully before proceeding. This ensures the integrity
                  of your transparency data for consumer trust.
                </Text>
              </VStack>
            </AlertDialogBody>

            <AlertDialogFooter pt={4}>
              <HStack spacing={3} w="full" justify="flex-end">
                <StandardButton
                  ref={confirmCancelRef}
                  variant="outline"
                  onClick={onConfirmClose}
                >
                  Review Events
                </StandardButton>
                <StandardButton
                  onClick={handleConfirmFinish}
                  isLoading={isLoading}
                  loadingText="Finishing..."
                >
                  Confirm & Finish Production
                </StandardButton>
              </HStack>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </StandardPage>
  );
};

export default StandardFinishProductionForm;
