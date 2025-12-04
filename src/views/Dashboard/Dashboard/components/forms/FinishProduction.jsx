import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  SimpleGrid,
  Box,
  Text,
  Icon,
  Badge,
  useToast,
  useColorModeValue
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
} from '../../../../../components/Design/StandardComponents';
import {
  FaLeaf,
  FaCalendarAlt,
  FaCamera,
  FaBoxes,
  FaClipboardCheck
} from 'react-icons/fa';
import { MdDescription, MdInventory, MdNumbers } from 'react-icons/md';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TrazoImageUpload } from 'components/Upload';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { useFinishCurrentHistoryMutation } from 'store/api/historyApi.js';

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
  { value: 'premium', label: 'Premium Grade' },
  { value: 'grade_a', label: 'Grade A' },
  { value: 'grade_b', label: 'Grade B' },
  { value: 'standard', label: 'Standard' },
  { value: 'processing', label: 'Processing Grade' }
];

// Harvest method options
const HARVEST_METHOD_OPTIONS = [
  { value: 'manual', label: 'Manual Harvest' },
  { value: 'mechanical', label: 'Mechanical Harvest' },
  { value: 'mixed', label: 'Mixed (Manual + Mechanical)' }
];

// Enhanced form schema with new fields
const finishProductionSchema = z.object({
  production_amount: z
    .string()
    .min(1, 'Production amount is required')
    .transform((val) => Number(val))
    .refine((val) => val > 0, 'Production amount must be greater than 0'),
  production_unit: z.string().min(1, 'Unit is required'),
  lot_id: z.string().min(1, 'Lot number is required').max(50, 'Lot number is too long'),
  finish_date: z.string().min(1, 'Finish date is required'),
  quality_grade: z.string().optional(),
  harvest_method: z.string().optional(),
  observation: z.string().optional()
});

function FinishProduction() {
  // DEBUG: Version check - if you see this, new form is loaded
  console.log('🚀🚀🚀 FINISH PRODUCTION v2.0 - NEW DESIGN LOADED 🚀🚀🚀');
  console.log('📦 Features: Unit selector, Quality Grade, Harvest Method');

  const [uploadedImages, setUploadedImages] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const intl = useIntl();
  const toast = useToast();
  const navigate = useNavigate();
  const { parcelId, establishmentId } = useParams();
  const currentCompany = useSelector((state) => state.company.currentCompany);

  // Color mode values
  const borderColor = useColorModeValue('gray.200', 'gray.600');

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

  const [finishCurrentHistory, { isLoading, isSuccess }] = useFinishCurrentHistoryMutation();

  const methods = useForm({
    resolver: zodResolver(finishProductionSchema),
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
    control,
    formState: { errors }
  } = methods;

  // Form submission handler
  const onSubmitForm = (data) => {
    try {
      const finalData = {
        ...data,
        production_amount: Number(data.production_amount),
        album: { images: uploadedImages }
      };

      finishCurrentHistory({
        companyId: currentCompany?.id,
        establishmentId,
        parcelId: parcelId,
        historyData: finalData
      });

      toast({
        title: 'Production Completed',
        description: 'Production has been finished successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true
      });
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save production. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleCancel = () => {
    navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/`);
  };

  // Handle successful submission
  useEffect(() => {
    if (isSuccess) {
      navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/`);
    }
  }, [isSuccess, navigate, establishmentId, parcelId]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Step progression logic
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

  const goToStep = (step) => {
    setCurrentStep(step);
  };

  // Check if current step is valid
  const isStepValid = (step) => {
    if (step === 0) {
      const formData = methods.getValues();
      return (
        formData.production_amount &&
        formData.lot_id &&
        formData.finish_date &&
        formData.production_unit
      );
    }
    if (step === 1) {
      return true;
    }
    return false;
  };

  // Get completed steps
  const getCompletedSteps = () => {
    const completed = [];
    for (let i = 0; i < currentStep; i++) {
      if (isStepValid(i)) {
        completed.push(i);
      }
    }
    return completed;
  };

  return (
    <StandardPage
      title="Finish Production"
      description="Complete the production cycle by entering final details and uploading documentation"
      showBackButton
      onBack={handleCancel}
      rightAction={
        <Badge colorScheme="green" variant="subtle" px={3} py={1} borderRadius="full">
          <HStack spacing={1}>
            <Icon as={FaLeaf} boxSize={3} />
            <Text fontSize="sm">Final Step</Text>
          </HStack>
        </Badge>
      }>
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
                {/* Core Harvest Information Section */}
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
                          required>
                          <StandardInput
                            {...methods.register('production_amount')}
                            placeholder="Enter amount harvested"
                            leftElement={<Icon as={MdInventory} color="gray.400" />}
                            type="number"
                            min="0"
                            step="0.01"
                          />
                        </StandardField>
                      </Box>
                      <Box flex={1}>
                        <StandardField
                          label="Unit"
                          error={errors.production_unit?.message}
                          required>
                          <Controller
                            name="production_unit"
                            control={control}
                            render={({ field }) => (
                              <StandardSelect {...field}>
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
                    </HStack>

                    {/* Lot Number */}
                    <StandardField
                      label={intl.formatMessage({ id: 'app.lotNumber' }) || 'Lot Number'}
                      error={errors.lot_id?.message}
                      helpText="Unique identifier for traceability"
                      required>
                      <StandardInput
                        {...methods.register('lot_id')}
                        placeholder="Enter lot number (e.g., LOT-2025-001)"
                        leftElement={<Icon as={MdNumbers} color="gray.400" />}
                        maxLength={50}
                      />
                    </StandardField>

                    {/* Finish Date */}
                    <StandardField
                      label={intl.formatMessage({ id: 'app.finishDate' }) || 'Completion Date'}
                      error={errors.finish_date?.message}
                      helpText="When was this harvest completed?"
                      required>
                      <StandardInput
                        {...methods.register('finish_date')}
                        placeholder="Select completion date and time"
                        leftElement={<Icon as={FaCalendarAlt} color="gray.400" />}
                        type="datetime-local"
                      />
                    </StandardField>
                  </VStack>
                </SectionBox>

                {/* Quality & Method Section */}
                <SectionBox variant="highlighted">
                  <SectionHeader
                    icon={FaClipboardCheck}
                    iconColor="blue.500"
                    title="Quality & Harvest Details"
                    badge="Consumer Transparency"
                    badgeColorScheme="blue"
                  />
                  <VStack spacing={4} align="stretch">
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      This information helps consumers understand the quality of your product
                    </Text>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {/* Quality Grade */}
                      <StandardField
                        label="Quality Grade"
                        error={errors.quality_grade?.message}
                        helpText="Quality classification of harvest">
                        <Controller
                          name="quality_grade"
                          control={control}
                          render={({ field }) => (
                            <StandardSelect {...field} placeholder="Select quality grade">
                              <option value="">Select quality grade</option>
                              {QUALITY_GRADE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </StandardSelect>
                          )}
                        />
                      </StandardField>

                      {/* Harvest Method */}
                      <StandardField
                        label="Harvest Method"
                        error={errors.harvest_method?.message}
                        helpText="How was this harvest performed?">
                        <Controller
                          name="harvest_method"
                          control={control}
                          render={({ field }) => (
                            <StandardSelect {...field} placeholder="Select harvest method">
                              <option value="">Select harvest method</option>
                              {HARVEST_METHOD_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </StandardSelect>
                          )}
                        />
                      </StandardField>
                    </SimpleGrid>

                    {/* Info box about transparency */}
                    <Box
                      bg="blue.50"
                      p={4}
                      borderRadius="lg"
                      borderLeft="4px solid"
                      borderLeftColor="blue.400">
                      <HStack spacing={3} align="flex-start">
                        <Icon as={FaLeaf} color="blue.500" boxSize={5} mt={0.5} />
                        <Box>
                          <Text fontWeight="medium" color="blue.700" fontSize="sm">
                            Consumer Transparency Tip
                          </Text>
                          <Text fontSize="sm" color="blue.600">
                            Sharing quality grade and harvest method helps build trust with
                            consumers who want to know how their food was produced.
                          </Text>
                        </Box>
                      </HStack>
                    </Box>
                  </VStack>
                </SectionBox>

                {/* Observations Section */}
                <SectionBox variant="default">
                  <SectionHeader
                    icon={MdDescription}
                    iconColor="gray.500"
                    title="Notes & Observations"
                    badge="Optional"
                    badgeColorScheme="gray"
                  />
                  <VStack spacing={4} align="stretch">
                    <StandardField
                      label={intl.formatMessage({ id: 'app.observations' }) || 'Observations'}
                      error={errors.observation?.message}
                      helpText="Additional notes about this harvest (optional)">
                      <StandardTextarea
                        {...methods.register('observation')}
                        placeholder="Enter any observations, challenges, or special notes about this harvest cycle..."
                        rows={4}
                      />
                    </StandardField>
                  </VStack>
                </SectionBox>

                {/* Step Navigation */}
                <Box pt={4} mt={2} borderTop="1px" borderColor={borderColor}>
                  <HStack spacing={4} justify="flex-end">
                    <StandardButton variant="outline" onClick={handleCancel} isDisabled={isLoading}>
                      Cancel
                    </StandardButton>

                    <StandardButton onClick={nextStep} isDisabled={!isStepValid(0)}>
                      Continue to Media
                    </StandardButton>
                  </HStack>
                </Box>
              </VStack>
            )}

            {/* Step 2: Media Upload */}
            {currentStep === 1 && (
              <VStack spacing={6} align="stretch">
                <SectionBox variant="default">
                  <SectionHeader
                    icon={FaCamera}
                    iconColor="purple.500"
                    title="Production Images"
                    badge="Documentation"
                    badgeColorScheme="purple"
                  />
                  <VStack spacing={4} align="stretch">
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      Upload photos documenting the completed harvest for consumer transparency
                    </Text>

                    {/* Image Upload */}
                    <StandardField
                      label={
                        intl.formatMessage({ id: 'app.productionImages' }) || 'Production Images'
                      }
                      helpText="Upload up to 5 high-quality images (JPG, PNG, GIF - max 5MB each)">
                      <TrazoImageUpload
                        maxFiles={5}
                        maxSize={5 * 1024 * 1024}
                        existingImages={uploadedImages.map((img) => img.url).filter(Boolean)}
                        onImagesChange={(urls) => {
                          const imageObjects = urls.map((url) => ({ url }));
                          setUploadedImages(imageObjects);
                        }}
                      />
                    </StandardField>

                    {/* Upload Limit Notice */}
                    {uploadedImages.length >= 5 && (
                      <StandardAlert
                        status="info"
                        title="Upload Limit Reached"
                        description="Maximum of 5 images allowed. Remove an image to add a new one."
                      />
                    )}

                    {/* Info box about images for transparency */}
                    <Box
                      bg="purple.50"
                      p={4}
                      borderRadius="lg"
                      borderLeft="4px solid"
                      borderLeftColor="purple.400">
                      <HStack spacing={3} align="flex-start">
                        <Icon as={FaCamera} color="purple.500" boxSize={5} mt={0.5} />
                        <Box>
                          <Text fontWeight="medium" color="purple.700" fontSize="sm">
                            Photo Documentation
                          </Text>
                          <Text fontSize="sm" color="purple.600">
                            Images of your harvest help verify quality and build consumer trust
                            through transparency.
                          </Text>
                        </Box>
                      </HStack>
                    </Box>
                  </VStack>
                </SectionBox>

                {/* Step Navigation */}
                <Box pt={4} mt={2} borderTop="1px" borderColor={borderColor}>
                  <HStack spacing={4} justify="space-between">
                    <StandardButton variant="outline" onClick={previousStep}>
                      Back to Production Info
                    </StandardButton>

                    <StandardButton
                      type="submit"
                      isLoading={isLoading}
                      loadingText="Finishing Production..."
                      size="lg"
                      px={8}>
                      {intl.formatMessage({ id: 'app.finishProduction' }) || 'Finish Production'}
                    </StandardButton>
                  </HStack>
                </Box>
              </VStack>
            )}
          </VStack>
        </form>
      </FormProvider>
    </StandardPage>
  );
}

export default FinishProduction;
