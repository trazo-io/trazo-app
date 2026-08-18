import React, { useState, useEffect, useRef } from 'react';
import {
  VStack,
  HStack,
  Stack,
  Box,
  Text,
  Icon,
  Badge,
  Checkbox,
  useToast,
  useDisclosure,
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
  StandardInput,
  StandardSelect,
  StandardTextarea,
  StandardButton,
  StandardAlert,
  StandardStepper,
  SectionBox,
  SectionHeader
} from '../Design/StandardComponents';
import { TrazoImageUpload } from '../Upload';
import { HeroPreviewCard } from '../QR/HeroPreviewCard';
import {
  FaLeaf,
  FaCamera,
  FaBoxes,
  FaClipboardCheck,
  FaLock,
  FaExclamationTriangle
} from 'react-icons/fa';
import { MdDescription, MdInventory } from 'react-icons/md';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useIntl } from 'react-intl';
// `hooks/*`, not `src/hooks/*`: vite resolves the latter through a `src` alias but tsconfig
// `paths` has no `src/*` entry, so tsc could not see the module and reported TS2307 — an error
// the build never surfaces (see frontend-typecheck-gate-dead). `hooks/*` resolves in both.
import { useDefaultUnits } from 'hooks/useMeasurementSystem';

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
  // Not a form field — the confirm dialog's publish checkbox is merged in at submit.
  // Optional because the form itself never sets it; only handleConfirmFinish does.
  published?: boolean;
};

interface StandardFinishProductionFormProps {
  onSubmit: (
    data: FinishProductionFormData & {
      uploaded_image_urls: string[];
      images: string[];
      // Absent when the confirm dialog did not run (isEdit) — see onSubmitForm.
      published?: boolean;
    }
  ) => void;
  onCancel: () => void;
  /** Prefill values, in the form's own string-shaped state — NOT the zod OUTPUT type.
      `FinishProductionFormData` has `production_amount: number` because the schema
      transforms it, but everything here is fed straight into HTML inputs and is read
      back with `.toString()`. Typing it as the output shape was simply wrong, and it
      is what made the caller's prefill unassignable. */
  initialData?: Partial<FormStateData>;
  isLoading?: boolean;
  isEdit?: boolean;
  productName?: string;
  parcelName?: string;
  farmName?: string;
  /** The farm this production belongs to. Drives the unit default: without it
      useDefaultUnits falls back to establishments[0], so a multi-farm company got
      farm #1's measurement system on every farm. */
  establishmentId?: string | number | null;
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
  establishmentId,
  previewScore,
  harvestDate,
  fallbackImageUrl
}) => {
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [savedFormData, setSavedFormData] = useState<Partial<FormStateData>>({});
  const intl = useIntl();
  // US-first unit default — see useMeasurementSystem. Walnuts, almonds and citrus are
  // sold by the pound in the US, but this form defaulted the FINAL production amount
  // (the number that reaches the consumer QR page and the certifier packet) to kg.
  const defaultUnits = useDefaultUnits(establishmentId);
  const toast = useToast();

  // Confirmation dialog for finishing production (immutability warning)
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
  // Publishing the buyer page defaults ON — it is the point of the product — but it is
  // the one consequence of finishing that is REVERSIBLE (unpublish from the Buyer Page),
  // so it is offered as a choice here instead of being listed with the permanent locks.
  const [publishBuyerPage, setPublishBuyerPage] = useState(true);
  const confirmCancelRef = useRef<HTMLButtonElement>(null);
  const [pendingFormData, setPendingFormData] = useState<FormStateData | null>(null);

  // Define steps for the finish production process
  const steps = [
    {
      title: intl.formatMessage({ id: 'finishProduction.step.info.title' }),
      description: intl.formatMessage({ id: 'finishProduction.step.info.description' }),
      icon: MdInventory
    },
    {
      title: intl.formatMessage({ id: 'finishProduction.step.media.title' }),
      description: intl.formatMessage({ id: 'finishProduction.step.media.description' }),
      icon: FaCamera
    }
  ];

  const methods = useForm<FormStateData>({
    resolver: zodResolver(finishProductionSchema),
    mode: 'onChange',
    defaultValues: {
      production_amount: '',
      production_unit: defaultUnits.mass,
      lot_id: '',
      finish_date: '',
      quality_grade: '',
      harvest_method: '',
      observation: ''
    }
  });

  // No `handleSubmit`: submission is routed through handleManualSubmit so the
  // confirmation dialog cannot be bypassed. See the <form onSubmit> below.
  const {
    reset,
    watch,
    setValue,
    getValues,
    control,
    formState: { errors }
  } = methods;

  // Hydrate from the harvest prefill EXACTLY ONCE.
  //
  // `reset()` here replaces every field, including the ones the prefill has nothing to say
  // about (lot number, completion date, observations). Re-running it after the farmer has
  // started typing is destructive, and `initialData` arrives asynchronously — it is undefined
  // on first render and only becomes an object once the production query settles — so the
  // effect cannot simply be pinned to mount. The latch fires on the first TRUTHY prefill and
  // never again, which is the whole contract: a suggestion is offered once, and after that the
  // form belongs to the operator. (The parent also memoises the prefill; this is the half that
  // survives a genuine refetch.)
  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (initialData && !hasHydratedRef.current) {
      hasHydratedRef.current = true;
      const formDefaults: FormStateData = {
        production_amount: initialData.production_amount?.toString() || '',
        production_unit: initialData.production_unit || defaultUnits.mass,
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
        production_unit: mergedData.production_unit || defaultUnits.mass,
        lot_id: mergedData.lot_id || '',
        finish_date: mergedData.finish_date || '',
        quality_grade: mergedData.quality_grade,
        harvest_method: mergedData.harvest_method,
        observation: mergedData.observation
      };

      // `finalFormData` above is an explicit allowlist built from the zod schema, so
      // anything not named there is dropped. `published` is not a schema field (it is
      // the dialog's checkbox, not a validated input), so it has to be carried here
      // explicitly — omitting it sends no key, which the backend reads as "publish".
      //
      // Carried ONLY when the dialog actually set it. `onSubmitForm` is also reached by
      // the isEdit branch of handleManualSubmit, which never opens the dialog and so
      // never renders the checkbox — coercing `undefined` to `true` there would let an
      // edit of a deliberately-unpublished season silently publish it. A payload does
      // not get to assert a field its UI did not render; absent means "leave it alone",
      // and the backend's absent-key default (publish) is the pre-checkbox behaviour.
      const finalData = {
        ...finalFormData,
        ...(mergedData.published === undefined ? {} : { published: mergedData.published }),
        uploaded_image_urls: uploadedImageUrls,
        images: uploadedImageUrls
      };

      onSubmit(finalData);
    } catch (error) {
      console.error('❌ Submit error:', error);
      toast({
        title: intl.formatMessage({ id: 'finishProduction.error.prepareTitle' }),
        description: intl.formatMessage({ id: 'finishProduction.error.prepareDescription' }),
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
        title: intl.formatMessage({ id: 'finishProduction.error.validationTitle' }),
        description: intl.formatMessage({ id: 'finishProduction.error.validationDescription' }),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  // Confirmed finish — actually submit the form
  const handleConfirmFinish = () => {
    if (pendingFormData) {
      // The checkbox lives on the dialog, not the form, so it is merged in here.
      // Always sent explicitly — the backend defaults an ABSENT key to publish, so
      // omitting it when unchecked would publish the page the farmer just declined.
      onSubmitForm({ ...pendingFormData, published: publishBuyerPage });
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
      title={intl.formatMessage({
        id: isEdit ? 'finishProduction.page.titleEdit' : 'finishProduction.page.title'
      })}
      description={`${isEdit ? 'Update' : 'Complete'} the production cycle${
        productName ? ` for ${productName}` : ''
      }${parcelName ? ` in ${parcelName}` : ''}`}
      showBackButton
      onBack={onCancel}
      rightAction={
        <Badge colorScheme="green" variant="subtle" px={3} py={1} borderRadius="full">
          <HStack spacing={1}>
            <Icon as={FaLeaf} boxSize={3} />
            <Text fontSize="sm">
              {intl.formatMessage({ id: 'finishProduction.badge.finalStep' })}
            </Text>
          </HStack>
        </Badge>
      }>
      <FormProvider {...methods}>
        {/*
          Routed through handleManualSubmit, NOT straight to onSubmitForm. Every button
          here is type="button", so the only way to reach a native submit is implicit
          submission — Enter pressed on a step that renders a single field. That used to
          call onSubmitForm directly, which finishes the production while skipping the
          immutability confirmation entirely (and now the publish checkbox with it).
          Finishing is irreversible; it must not be reachable by an Enter keypress.
        */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleManualSubmit();
          }}>
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
                  shadow="sm">
                  {/* Parent Header - matching Event Details style */}
                  <Box px={6} py={5} borderBottom="1px solid" borderColor="gray.100">
                    <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                      {intl.formatMessage({ id: 'finishProduction.card.title' })}
                    </Text>
                  </Box>

                  {/* Section Cards Container */}
                  <VStack spacing={4} p={6} align="stretch">
                    {/* Harvest Output Section */}
                    <SectionBox variant="default">
                      <SectionHeader
                        icon={FaBoxes}
                        iconColor="green.500"
                        title={intl.formatMessage({ id: 'finishProduction.section.harvestOutput' })}
                        badge={intl.formatMessage({ id: 'finishProduction.badge.required' })}
                        badgeColorScheme="green"
                      />
                      <VStack spacing={4} align="stretch">
                        {/* Production Amount with Unit Selector */}
                        <Stack
                          direction={{ base: 'column', smd: 'row' }}
                          spacing={4}
                          align="flex-start">
                          <Box flex={2} w="full">
                            <StandardField
                              label={intl.formatMessage({ id: 'app.productionAmount' })}
                              error={errors.production_amount?.message}
                              helpText={intl.formatMessage({ id: 'finishProduction.amount.help' })}
                              required>
                              <StandardInput
                                {...methods.register('production_amount')}
                                placeholder={intl.formatMessage({
                                  id: 'finishProduction.amount.placeholder'
                                })}
                                type="number"
                                min="0"
                                step="0.01"
                                size="lg"
                              />
                            </StandardField>
                          </Box>
                          <Box flex={1}>
                            {/*
                              The harvest unit is one half of the § 205.103(b)(2) mass
                              balance; SalesRecord.quantity_unit is the other. The audit
                              export prints the Balance line and the "sold exceeds harvest"
                              flag ONLY when the two strings are equal — when they differ the
                              reconciliation silently vanishes from the packet with nothing
                              printed to say it had. Both dropdowns are declared from
                              History.UNIT_CHOICES (guarded cross-repo), so the vocabularies
                              cannot drift; what the farmer still controls is picking the same
                              one twice, which is what this line is for.
                            */}
                            <StandardField
                              label={intl.formatMessage({ id: 'finishProduction.unit.label' })}
                              error={errors.production_unit?.message}
                              helpText={intl.formatMessage({ id: 'finishProduction.unit.help' })}
                              required>
                              <Controller
                                name="production_unit"
                                control={control}
                                render={({ field }) => (
                                  <StandardSelect {...field} size="lg">
                                    {UNIT_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </StandardSelect>
                                )}
                              />
                            </StandardField>
                          </Box>
                        </Stack>

                        {/* Lot Number */}
                        <StandardField
                          label={intl.formatMessage({ id: 'app.lotNumber' })}
                          error={errors.lot_id?.message}
                          helpText={intl.formatMessage({ id: 'finishProduction.lot.help' })}
                          required>
                          <StandardInput
                            {...methods.register('lot_id')}
                            placeholder={intl.formatMessage({
                              id: 'finishProduction.lot.placeholder'
                            })}
                            type="text"
                            maxLength={50}
                            size="lg"
                          />
                        </StandardField>

                        {/* Finish Date */}
                        <StandardField
                          label={intl.formatMessage({ id: 'app.finishDate' })}
                          error={errors.finish_date?.message}
                          helpText={intl.formatMessage({ id: 'finishProduction.finishDate.help' })}
                          required>
                          <StandardInput
                            {...methods.register('finish_date')}
                            placeholder={intl.formatMessage({
                              id: 'finishProduction.finishDate.placeholder'
                            })}
                            type="datetime-local"
                            size="lg"
                          />
                        </StandardField>
                      </VStack>
                    </SectionBox>

                    {/* Quality & Harvest Details Section */}
                    <SectionBox variant="highlighted">
                      <SectionHeader
                        icon={FaClipboardCheck}
                        iconColor="green.500"
                        title={intl.formatMessage({
                          id: 'finishProduction.section.qualityHarvest'
                        })}
                        badge={intl.formatMessage({ id: 'finishProduction.badge.optional' })}
                        badgeColorScheme="gray"
                      />
                      {/*
                        This said "helps consumers understand your product better". It does
                        not: neither `quality_grade` nor `harvest_method` is in
                        PublicHistorySerializer.fields, so neither reaches a consumer at all.
                        Both print in the CERTIFIER packet (audit_export_service, Production
                        Summary), next to Lot ID and yield. Naming the real destination is the
                        whole "one entry, two outputs" story on the one screen that collects
                        the packet's harvest payload — and a self-declared "Premium Grade" on
                        a consumer surface would be a self-reported trust signal anyway.
                      */}
                      <Text fontSize="sm" color="gray.600" mb={4}>
                        Printed in your certifier packet alongside the lot number and yield. Not
                        shown to consumers.
                      </Text>
                      <VStack spacing={4} align="stretch">
                        <Stack
                          direction={{ base: 'column', smd: 'row' }}
                          spacing={4}
                          align="flex-start">
                          <Box flex={1} w="full">
                            <StandardField
                              label={intl.formatMessage({
                                id: 'finishProduction.qualityGrade.label'
                              })}
                              helpText={intl.formatMessage({
                                id: 'finishProduction.qualityGrade.help'
                              })}>
                              <Controller
                                name="quality_grade"
                                control={control}
                                render={({ field }) => (
                                  <StandardSelect {...field} size="lg">
                                    {QUALITY_GRADE_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </StandardSelect>
                                )}
                              />
                            </StandardField>
                          </Box>
                          <Box flex={1} w="full">
                            <StandardField
                              label={intl.formatMessage({
                                id: 'finishProduction.harvestMethod.label'
                              })}
                              helpText={intl.formatMessage({
                                id: 'finishProduction.harvestMethod.help'
                              })}>
                              <Controller
                                name="harvest_method"
                                control={control}
                                render={({ field }) => (
                                  <StandardSelect {...field} size="lg">
                                    {HARVEST_METHOD_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </StandardSelect>
                                )}
                              />
                            </StandardField>
                          </Box>
                        </Stack>
                      </VStack>
                    </SectionBox>

                    {/* Notes Section */}
                    <SectionBox variant="default">
                      <SectionHeader
                        icon={MdDescription}
                        iconColor="green.500"
                        title={intl.formatMessage({ id: 'finishProduction.section.notes' })}
                        badge={intl.formatMessage({ id: 'finishProduction.badge.optional' })}
                        badgeColorScheme="gray"
                      />
                      <StandardField
                        label={intl.formatMessage({ id: 'app.observations' })}
                        error={errors.observation?.message}
                        helpText={intl.formatMessage({ id: 'finishProduction.observation.help' })}>
                        <StandardTextarea
                          {...methods.register('observation')}
                          placeholder={intl.formatMessage({
                            id: 'finishProduction.observation.placeholder'
                          })}
                          rows={4}
                        />
                      </StandardField>
                    </SectionBox>
                  </VStack>
                </Box>

                {/* Step Navigation */}
                <HStack spacing={4} justify="flex-end" pt={4}>
                  <StandardButton variant="outline" onClick={onCancel} disabled={isLoading}>
                    {intl.formatMessage({ id: 'app.cancel' })}
                  </StandardButton>

                  <StandardButton onClick={nextStep} disabled={!isStep0Valid}>
                    {intl.formatMessage({ id: 'finishProduction.nav.continue' })}
                  </StandardButton>
                </HStack>
              </VStack>
            )}

            {/* Step 2: Media Upload */}
            {currentStep === 1 && (
              <SectionBox variant="default">
                <SectionHeader
                  icon={FaCamera}
                  iconColor="green.500"
                  title={intl.formatMessage({ id: 'finishProduction.section.photos' })}
                  badge={intl.formatMessage({ id: 'finishProduction.badge.optional' })}
                  badgeColorScheme="gray"
                />
                <Text fontSize="sm" color="gray.600" mb={1}>
                  {intl.formatMessage({ id: 'finishProduction.photos.help' })}
                </Text>
                <Text fontSize="xs" color="gray.500" mb={5}>
                  {intl.formatMessage({ id: 'finishProduction.photos.fallbackNote' })}
                </Text>
                <VStack spacing={6} align="stretch">
                  <Box
                    display="grid"
                    gap={8}
                    alignItems="start"
                    gridTemplateColumns={{ base: '1fr', lg: '1fr 320px' }}>
                    {/* Upload column — gets the wider track since this is
                        the active task surface. */}
                    <StandardField label={intl.formatMessage({ id: 'app.productionImages' })}>
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
                      alignSelf="start">
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
                      title={intl.formatMessage({ id: 'finishProduction.photos.limitTitle' })}
                      description={intl.formatMessage({
                        id: 'finishProduction.photos.limitDescription'
                      })}
                    />
                  )}

                  {/* Step Navigation */}
                  <HStack spacing={4} justify="space-between" pt={4}>
                    <StandardButton variant="outline" onClick={previousStep}>
                      {intl.formatMessage({ id: 'finishProduction.nav.back' })}
                    </StandardButton>

                    <StandardButton
                      isLoading={isLoading}
                      loadingText={intl.formatMessage({ id: 'finishProduction.loading' })}
                      onClick={handleManualSubmit}
                      size="lg">
                      {intl.formatMessage({ id: 'app.finishProduction' })}
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
        isCentered>
        <AlertDialogOverlay bg="blackAlpha.300" backdropFilter="blur(10px)">
          <AlertDialogContent borderRadius="xl" p={2} mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" pb={4}>
              <HStack spacing={3}>
                <Box p={2} borderRadius="lg" bg="orange.50">
                  <Icon as={FaExclamationTriangle} boxSize={5} color="orange.500" />
                </Box>
                <Text>{intl.formatMessage({ id: 'finishProduction.page.title' })}</Text>
              </HStack>
            </AlertDialogHeader>

            <AlertDialogBody pb={6}>
              <VStack align="start" spacing={3}>
                <Text color="gray.600">
                  {intl.formatMessage({ id: 'finishProduction.confirm.intro' })}
                </Text>
                <Box p={3} bg="orange.50" borderRadius="lg" w="full">
                  <Text fontSize="sm" color="orange.700" fontWeight="medium">
                    {intl.formatMessage({ id: 'finishProduction.confirm.heading' })}
                  </Text>
                  <VStack align="start" spacing={1} mt={2} fontSize="sm" color="orange.600">
                    <HStack spacing={2}>
                      <Icon as={FaLock} boxSize={3} />
                      <Text>
                        {intl.formatMessage({ id: 'finishProduction.confirm.lockEvents' })}
                      </Text>
                    </HStack>
                    <HStack spacing={2}>
                      <Icon as={FaLock} boxSize={3} />
                      {/*
                        This bullet advertised the blockchain add-on, which was WITHDRAWN
                        2026-08-03 (`blockchain-verification` seeded is_active=False,
                        BLOCKCHAIN_ENABLED False) — pitching something no farmer can buy, at
                        the moment of commitment. It was then briefly reworded to say the
                        finalization fingerprint appears in the certifier packet. That is
                        ALSO untrue: `finalization_hash` is written by _store_finalization_hash
                        and read back only by the (disabled) blockchain submission path and
                        the verify_blockchain endpoint. No packet or export generator prints
                        it, so nothing the farmer receives shows it.

                        Replaced with the retention fact, which is the only claim in this
                        dialog that organic certification actually imposes: 7 CFR 205.103(b)(4)
                        requires records be kept at least 5 years, History.delete() enforces
                        it against `retention_until`, and finish() is what stamps that date.
                        ((b)(4), not (b)(3) — the Strengthening Organic Enforcement rule
                        restructured 205.103(b) into five subsections and retention moved.)
                      */}
                      <Text>
                        {intl.formatMessage({ id: 'finishProduction.confirm.retention' })}
                      </Text>
                    </HStack>
                    {/*
                      The other output. This dialog listed three consequences and all three
                      were consumer- or blockchain-facing, on the screen that finalises the
                      lot number, yield, grade and harvest method the certifier packet is
                      built from — the half of "one entry, two outputs" that Compliance is
                      actually sold on went unmentioned at the moment of commitment.
                    */}
                    <HStack spacing={2}>
                      <Icon as={FaLock} boxSize={3} />
                      <Text>
                        {intl.formatMessage({ id: 'finishProduction.confirm.certifierPacket' })}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
                {/*
                  OUTSIDE the orange box on purpose. Everything in that box is permanent;
                  this is the one thing the farmer can undo, and filing a reversible choice
                  under a list of irreversible locks misrepresents both.
                */}
                <Box
                  p={3}
                  bg="gray.50"
                  borderRadius="lg"
                  w="full"
                  borderWidth="1px"
                  borderColor="gray.200">
                  <Checkbox
                    colorScheme="green"
                    isChecked={publishBuyerPage}
                    onChange={(e) => setPublishBuyerPage(e.target.checked)}
                    minH="44px"
                    alignItems="center">
                    <Text fontSize="sm" fontWeight="medium" color="gray.700">
                      {intl.formatMessage({ id: 'finishProduction.confirm.publishLabel' })}
                    </Text>
                  </Checkbox>
                  <Text fontSize="xs" color="gray.500" mt={1} ml={6}>
                    {intl.formatMessage({
                      id: publishBuyerPage
                        ? 'finishProduction.confirm.publishHelpOn'
                        : 'finishProduction.confirm.publishHelpOff'
                    })}
                  </Text>
                </Box>
                <Text fontSize="xs" color="gray.500">
                  {intl.formatMessage({ id: 'finishProduction.confirm.footnote' })}
                </Text>
              </VStack>
            </AlertDialogBody>

            <AlertDialogFooter pt={4}>
              <HStack spacing={3} w="full" justify="flex-end">
                <StandardButton ref={confirmCancelRef} variant="outline" onClick={onConfirmClose}>
                  {intl.formatMessage({ id: 'finishProduction.confirm.review' })}
                </StandardButton>
                <StandardButton
                  onClick={handleConfirmFinish}
                  isLoading={isLoading}
                  loadingText={intl.formatMessage({ id: 'finishProduction.confirm.loading' })}>
                  {intl.formatMessage({ id: 'finishProduction.confirm.submit' })}
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
