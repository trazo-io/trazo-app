import React, { useState, useEffect } from 'react';
import { VStack, HStack, SimpleGrid, useToast, Text, Icon, Badge, Box } from '@chakra-ui/react';
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
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, number } from 'zod';
import { useIntl } from 'react-intl';
import {
  FaFlask,
  FaLeaf,
  FaBug,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTractor,
  FaCalendarAlt,
  FaChevronRight,
  FaChevronLeft
} from 'react-icons/fa';
import { MdCheck } from 'react-icons/md';
import {
  validateConcentration,
  ConcentrationFeedback,
  getFormatExamples
} from './ConcentrationValidation';
import { StandardNumberInput, StandardDecimalInput } from 'components/Design/StandardComponents';

// Map form values to validation codes
const mapChemicalTypeToCode = (formType: string): string => {
  const mapping: Record<string, string> = {
    fertilizer: 'FE',
    pesticide: 'PE',
    herbicide: 'HE',
    fungicide: 'FU',
    insecticide: 'PE', // Insecticides use pesticide validation
    growth_regulator: 'PE' // Growth regulators use pesticide validation
  };
  return mapping[formType] || formType;
};

// Form Schema with Dynamic Concentration Validation
const chemicalSchema = object({
  type: string().min(1, 'Chemical type is required'),
  commercialName: string().min(1, 'Commercial name is required'),
  activeIngredient: string().optional(),
  concentration: string()
    .min(1, 'Concentration is required for carbon calculations')
    .refine(
      (value, context) => {
        // Safety checks for validation
        if (!value || typeof value !== 'string') return false;

        // Get chemical type from context with fallback
        const parent = context?.parent;
        const chemicalType = parent?.type;

        // Skip validation if no chemical type selected yet
        if (!chemicalType || typeof chemicalType !== 'string') return true;

        try {
          // Map form value to validation code
          const typeCode = mapChemicalTypeToCode(chemicalType);
          const validation = validateConcentration(value, typeCode);
          return validation.isValid;
        } catch (error) {
          console.error('Concentration validation error:', error);
          return false;
        }
      },
      {
        message: 'Invalid concentration format for selected chemical type'
      }
    ),
  volume: number().min(0, 'Volume must be positive'),
  applicationRate: string().min(1, 'Application rate is required'),
  area: number().min(0, 'Area must be positive'),
  wayOfApplication: string().min(1, 'Application method is required'),
  targetPest: string().optional(),
  weatherConditions: string().optional(),
  ppeUsed: string().optional(),
  applicatorName: string().optional(),
  preHarvestInterval: number().optional(),
  reentryInterval: number().optional(),
  observation: string().optional()
});

interface ChemicalFormData {
  type: string;
  commercialName: string;
  activeIngredient?: string;
  concentration: string; // Changed to string for dynamic validation
  volume: number;
  applicationRate: string;
  area: number;
  wayOfApplication: string;
  targetPest?: string;
  weatherConditions?: string;
  ppeUsed?: string;
  applicatorName?: string;
  preHarvestInterval?: number;
  reentryInterval?: number;
  observation?: string;
}

interface StandardChemicalFormProps {
  onSubmit: (data: ChemicalFormData) => void;
  onCancel: () => void;
  initialData?: Partial<ChemicalFormData>;
  isLoading?: boolean;
  parcelName?: string;
}

export const StandardChemicalForm: React.FC<StandardChemicalFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  parcelName = ''
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [estimatedCarbonImpact, setEstimatedCarbonImpact] = useState<number | null>(null);
  const intl = useIntl();
  const toast = useToast();

  // Define steps for stepper
  const steps = [
    { title: 'Chemical Info', description: 'Product details', icon: FaFlask },
    { title: 'Application', description: 'Method & conditions', icon: FaTractor },
    { title: 'Safety & Notes', description: 'Safety & observations', icon: FaExclamationTriangle }
  ];

  const methods = useForm<ChemicalFormData>({
    resolver: zodResolver(chemicalSchema),
    defaultValues: {
      volume: 0,
      area: 0,
      concentration: '',
      preHarvestInterval: 0,
      reentryInterval: 0,
      ...initialData
    }
  });

  const {
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = methods;

  // Watch form values for calculations and validation
  const watchedType = watch('type');
  const watchedVolume = watch('volume');
  const watchedArea = watch('area');
  const watchedConcentration = watch('concentration');

  // Real-time concentration validation
  const concentrationValidation =
    watchedType && watchedConcentration
      ? validateConcentration(watchedConcentration, mapChemicalTypeToCode(watchedType))
      : null;

  // Calculate carbon impact
  useEffect(() => {
    if (watchedType && watchedVolume && watchedArea) {
      // Simplified carbon impact calculation
      const impacts: Record<string, number> = {
        fertilizer: 2.5,
        pesticide: 1.2,
        herbicide: 0.8,
        fungicide: 1.0,
        insecticide: 1.3
      };

      const baseImpact = impacts[watchedType] || 1.0;
      const totalImpact = (watchedVolume * watchedArea * baseImpact) / 1000; // kg CO2e
      setEstimatedCarbonImpact(totalImpact);
    }
  }, [watchedType, watchedVolume, watchedArea]);

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({ ...methods.getValues(), ...initialData });
    }
  }, [initialData, reset, methods]);

  const onSubmitForm = (data: ChemicalFormData) => {
    try {
      onSubmit(data);
      toast({
        title: 'Chemical Application Recorded',
        description: `Applied ${data.commercialName} to ${data.area} hectares successfully recorded.`,
        status: 'success',
        duration: 5000,
        isClosable: true
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record chemical application. Please try again.',
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
        // Include concentration validation for step 0
        const hasBasicFields =
          formData.type &&
          formData.commercialName &&
          formData.volume &&
          formData.area &&
          formData.concentration;
        if (!hasBasicFields) return false;

        // Validate concentration format if all basic fields are present
        try {
          if (formData.type && formData.concentration) {
            const typeCode = mapChemicalTypeToCode(formData.type);
            const validation = validateConcentration(formData.concentration, typeCode);
            return validation && validation.isValid === true;
          }
          return false;
        } catch (error) {
          console.error('Step validation error:', error);
          return false;
        }
      case 1:
        return Boolean(formData.applicationRate && formData.wayOfApplication);
      case 2:
        return true; // Safety info is optional but recommended
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
    if (currentStep < 2) {
      // We have 3 steps (0, 1, 2)
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
      title="Chemical Application"
      description={`Record chemical application details${parcelName ? ` for ${parcelName}` : ''}`}
      showBackButton
      onBack={onCancel}>
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
          {/* Step 0: Chemical Information */}
          {currentStep === 0 && (
            <StandardCard
              title="Chemical Information"
              subtitle="What chemical product are you applying?">
              <VStack spacing={6} align="stretch">
                {/* Chemical Type */}
                <StandardField
                  label="Chemical Type"
                  required
                  error={errors.type?.message}
                  helpText="Select the primary category of chemical">
                  <StandardSelect {...methods.register('type')}>
                    <option value="">Select chemical type...</option>
                    <option value="fertilizer">Fertilizer</option>
                    <option value="pesticide">Pesticide</option>
                    <option value="herbicide">Herbicide</option>
                    <option value="fungicide">Fungicide</option>
                    <option value="insecticide">Insecticide</option>
                    <option value="growth_regulator">Growth Regulator</option>
                  </StandardSelect>
                </StandardField>

                {/* Commercial Name & Active Ingredient */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Commercial Name"
                    required
                    error={errors.commercialName?.message}
                    helpText="Brand name of the product">
                    <StandardInput
                      {...methods.register('commercialName')}
                      placeholder="e.g., Roundup WeatherMAX"
                      leftElement={<Icon as={FaFlask} color="gray.400" />}
                    />
                  </StandardField>

                  <StandardField
                    label="Active Ingredient"
                    error={errors.activeIngredient?.message}
                    helpText="Main active component">
                    <StandardInput
                      {...methods.register('activeIngredient')}
                      placeholder="e.g., Glyphosate"
                      leftElement={<Icon as={FaLeaf} color="gray.400" />}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Volume & Area */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Volume Applied"
                    required
                    error={errors.volume?.message}
                    helpText="Total volume of product used (gallons)">
                    {/* Gallons and acres are MEASUREMENTS — a number-controlled
                        NumberInput turns "2.5" into "25". See StandardDecimalInput. */}
                    <StandardDecimalInput
                      value={watch('volume')}
                      onChange={(num) => methods.setValue('volume', num ?? 0)}
                      min={0}
                      step={1}
                      hideStepper
                      borderRadius="lg"
                    />
                  </StandardField>

                  <StandardField
                    label="Area Treated"
                    required
                    error={errors.area?.message}
                    helpText="Acres treated with this application">
                    {/* Gallons and acres are MEASUREMENTS — a number-controlled
                        NumberInput turns "2.5" into "25". See StandardDecimalInput. */}
                    <StandardDecimalInput
                      value={watch('area')}
                      onChange={(num) => methods.setValue('area', num ?? 0)}
                      min={0}
                      step={1}
                      hideStepper
                      borderRadius="lg"
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Enhanced Concentration Field with Dynamic Validation */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label={
                      <HStack spacing={2}>
                        <Text>
                          {mapChemicalTypeToCode(watchedType || '') === 'FE'
                            ? 'NPK Ratio'
                            : mapChemicalTypeToCode(watchedType || '') === 'PE'
                            ? 'Pesticide Concentration'
                            : mapChemicalTypeToCode(watchedType || '') === 'HE'
                            ? 'Herbicide Concentration'
                            : mapChemicalTypeToCode(watchedType || '') === 'FU'
                            ? 'Fungicide Concentration'
                            : 'Concentration'}
                        </Text>
                        <Badge
                          size="sm"
                          colorScheme={concentrationValidation?.isValid ? 'green' : 'red'}
                          variant={concentrationValidation ? 'solid' : 'outline'}>
                          {mapChemicalTypeToCode(watchedType || '') === 'FE'
                            ? 'NPK'
                            : ['PE', 'HE', 'FU'].includes(mapChemicalTypeToCode(watchedType || ''))
                            ? '%'
                            : 'Required'}
                        </Badge>
                      </HStack>
                    }
                    required
                    error={errors.concentration?.message}
                    helpText={
                      watchedType
                        ? `Enter ${
                            mapChemicalTypeToCode(watchedType) === 'FE'
                              ? 'NPK format (e.g., "10-10-10")'
                              : 'percentage (e.g., "2.5%")'
                          } for accurate carbon calculations`
                        : 'Select chemical type first'
                    }>
                    <StandardInput
                      {...methods.register('concentration')}
                      placeholder={
                        watchedType
                          ? getFormatExamples(mapChemicalTypeToCode(watchedType))[0] ||
                            'Enter concentration...'
                          : 'Select chemical type first...'
                      }
                      isDisabled={!watchedType}
                      borderColor={
                        concentrationValidation?.isValid
                          ? 'green.300'
                          : concentrationValidation && !concentrationValidation.isValid
                          ? 'red.300'
                          : undefined
                      }
                    />

                    {/* Real-time Validation Feedback */}
                    {watchedType && (
                      <ConcentrationFeedback
                        validation={
                          concentrationValidation || {
                            isValid: false,
                            format: 'unknown',
                            errors: [],
                            suggestions: []
                          }
                        }
                        chemicalType={mapChemicalTypeToCode(watchedType)}
                        concentration={watchedConcentration || ''}
                      />
                    )}
                  </StandardField>

                  <StandardField
                    label="Target Pest/Weed"
                    error={errors.targetPest?.message}
                    helpText="What are you targeting?">
                    <StandardInput
                      {...methods.register('targetPest')}
                      placeholder="e.g., Aphids, Broadleaf weeds"
                      leftElement={<Icon as={FaBug} color="gray.400" />}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Carbon Impact Preview */}
                {estimatedCarbonImpact !== null && (
                  <StandardAlert
                    status={estimatedCarbonImpact > 5 ? 'warning' : 'info'}
                    title="Estimated Carbon Impact"
                    description={`This application may generate approximately ${estimatedCarbonImpact.toFixed(
                      2
                    )} kg CO₂e`}
                  />
                )}

                {/* Navigation */}
                <HStack spacing={3} justify="flex-end" pt={4}>
                  <StandardButton variant="outline" onClick={onCancel}>
                    {intl.formatMessage({ id: 'app.cancel' })}
                  </StandardButton>
                  <StandardButton
                    onClick={nextStep}
                    rightIcon={<FaChevronRight />}
                    disabled={!isStepComplete(0)}>
                    {intl.formatMessage({ id: 'app.continue' })}
                  </StandardButton>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* Step 1: Application Details */}
          {currentStep === 1 && (
            <StandardCard title="Application Method" subtitle="How was the chemical applied?">
              <VStack spacing={6} align="stretch">
                {/* Application Rate & Method */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Application Rate"
                    required
                    error={errors.applicationRate?.message}
                    helpText="Rate per acre (e.g., 2 gallons/acre)">
                    <StandardInput
                      {...methods.register('applicationRate')}
                      placeholder="e.g., 2 gallons/acre"
                    />
                  </StandardField>

                  <StandardField
                    label="Application Method"
                    required
                    error={errors.wayOfApplication?.message}
                    helpText="How was it applied?">
                    <StandardSelect {...methods.register('wayOfApplication')}>
                      <option value="">Select method...</option>
                      <option value="spray">Boom Sprayer (Field Crops)</option>
                      <option value="airblast">Airblast Sprayer (Orchards/Vineyards)</option>
                      <option value="broadcast">Broadcast Application</option>
                      <option value="granular">Granular Broadcast</option>
                      <option value="injection">Soil Injection</option>
                      <option value="drip_irrigation">Drip/Micro Irrigation System</option>
                      <option value="foliar_spray">Foliar Spray (Mist Blower)</option>
                      <option value="drench">Soil Drench</option>
                      <option value="aerial">Aerial Application (Aircraft)</option>
                      <option value="hand">Manual/Backpack Sprayer</option>
                      <option value="fumigation">Fumigation</option>
                    </StandardSelect>
                  </StandardField>
                </SimpleGrid>

                {/* Weather Conditions */}
                <StandardField
                  label="Weather Conditions"
                  error={errors.weatherConditions?.message}
                  helpText="Describe weather during application">
                  <StandardInput
                    {...methods.register('weatherConditions')}
                    placeholder="e.g., Calm, 70°F, 65% humidity, no wind"
                  />
                </StandardField>

                {/* Intervals */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Pre-Harvest Interval (days)"
                    error={errors.preHarvestInterval?.message}
                    helpText="Days before harvest allowed">
                    <StandardNumberInput
                      value={watch('preHarvestInterval') || 0}
                      onChange={(_, num) => methods.setValue('preHarvestInterval', num || 0)}
                      borderRadius="lg"
                    />
                  </StandardField>

                  <StandardField
                    label="Re-entry Interval (hours)"
                    error={errors.reentryInterval?.message}
                    helpText="Hours before safe re-entry">
                    <StandardNumberInput
                      value={watch('reentryInterval') || 0}
                      onChange={(_, num) => methods.setValue('reentryInterval', num || 0)}
                      borderRadius="lg"
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    {intl.formatMessage({ id: 'common.back' })}
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      {intl.formatMessage({ id: 'app.cancel' })}
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      rightIcon={<FaChevronRight />}
                      disabled={!isStepComplete(1)}>
                      {intl.formatMessage({ id: 'app.continue' })}
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* Step 2: Safety & Notes */}
          {currentStep === 2 && (
            <StandardCard
              title="Safety & Additional Notes"
              subtitle="Record safety measures and observations">
              <VStack spacing={6} align="stretch">
                {/* PPE & Applicator */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="PPE Used"
                    error={errors.ppeUsed?.message}
                    helpText="Personal protective equipment worn">
                    <StandardInput
                      {...methods.register('ppeUsed')}
                      placeholder="e.g., Gloves, goggles, respirator"
                    />
                  </StandardField>

                  <StandardField
                    label="Applicator Name"
                    error={errors.applicatorName?.message}
                    helpText="Person who applied the chemical">
                    <StandardInput
                      {...methods.register('applicatorName')}
                      placeholder="e.g., John Smith"
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Observations */}
                <StandardField
                  label="Observations & Notes"
                  error={errors.observation?.message}
                  helpText="Any additional notes, conditions, or observations">
                  <StandardTextarea
                    {...methods.register('observation')}
                    placeholder="Record any relevant observations, application challenges, or special conditions..."
                  />
                </StandardField>

                {/* Safety Reminder */}
                <StandardAlert
                  status="warning"
                  title="Safety Reminder"
                  description="Always follow label instructions, wear appropriate PPE, and maintain proper records for regulatory compliance."
                />

                {/* Final Summary */}
                <Box p={4} bg="gray.50" borderRadius="lg">
                  <Text fontWeight="semibold" mb={2}>
                    Application Summary:
                  </Text>
                  <SimpleGrid columns={2} spacing={2} fontSize="sm">
                    <Text>Chemical: {watch('commercialName') || 'Not specified'}</Text>
                    <Text>Volume: {watch('volume') || 0} gallons</Text>
                    <Text>Area: {watch('area') || 0} hectares</Text>
                    <Text>Method: {watch('wayOfApplication') || 'Not specified'}</Text>
                  </SimpleGrid>
                </Box>

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    {intl.formatMessage({ id: 'common.back' })}
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      {intl.formatMessage({ id: 'app.cancel' })}
                    </StandardButton>
                    <StandardButton
                      type="submit"
                      isLoading={isLoading}
                      loadingText="Recording..."
                      leftIcon={<FaCheckCircle />}>
                      Record Application
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

export default StandardChemicalForm;
