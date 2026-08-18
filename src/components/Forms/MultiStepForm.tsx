import React, { useState, ReactNode } from 'react';
import {
  VStack,
  HStack,
  Progress,
  Text,
  Box,
  Circle,
  Icon,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import { StandardPage, StandardCard, StandardButton, StandardStepper } from '../Design';
import {
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle
} from 'react-icons/fa';
import { FormProvider, UseFormReturn } from 'react-hook-form';

// ✅ REUSABLE MULTI-STEP FORM COMPONENT
// Based on patterns from StandardParcelForm refactoring

export interface StepConfig {
  stepNumber: number;
  name: string;
  title: string;
  description: string;
  icon: React.ComponentType;
  requiredFields: string[];
  optionalFields: string[];
  canSkip: boolean;
  customValidation?: string | ((data: any) => boolean);
}

export interface MultiStepFormProps<T = any> {
  // Form configuration
  title: string;
  description?: string;
  steps: StepConfig[];

  // Form state
  formMethods: UseFormReturn<T>;
  onSubmit: (data: T) => void;
  onCancel: () => void;

  // Form content
  children: ReactNode[];

  // Optional props
  isEdit?: boolean;
  isLoading?: boolean;
  showBackButton?: boolean;

  // Custom validation
  customValidators?: Record<string, (data: any) => boolean>;
}

export const MultiStepForm = <T extends Record<string, any>>({
  title,
  description,
  steps,
  formMethods,
  onSubmit,
  onCancel,
  children,
  isEdit = false,
  isLoading = false,
  showBackButton = true,
  customValidators = {}
}: MultiStepFormProps<T>) => {
  const [currentStep, setCurrentStep] = useState(0);
  const toast = useToast();

  const { handleSubmit, watch } = formMethods;

  // ✅ REUSABLE STEP VALIDATION
  const validateStep = (stepNumber: number, formData: any): boolean => {
    const stepConfig = steps[stepNumber];
    if (!stepConfig) return true;

    // Check required fields
    for (const field of stepConfig.requiredFields) {
      const value = formData[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return false;
      }
    }

    // Custom validation
    if (stepConfig.customValidation) {
      if (typeof stepConfig.customValidation === 'string') {
        const validator = customValidators[stepConfig.customValidation];
        if (validator && !validator(formData)) {
          return false;
        }
      } else if (typeof stepConfig.customValidation === 'function') {
        if (!stepConfig.customValidation(formData)) {
          return false;
        }
      }
    }

    return true;
  };

  // ✅ REUSABLE NAVIGATION LOGIC
  const canNavigateToStep = (targetStep: number): boolean => {
    const formData = watch();

    // Always allow navigation backwards
    if (targetStep <= currentStep) return true;

    // For forward navigation, validate all intermediate steps
    for (let step = currentStep; step < targetStep; step++) {
      const stepConfig = steps[step];
      if (!stepConfig?.canSkip && !validateStep(step, formData)) {
        return false;
      }
    }

    return true;
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      const formData = watch();

      // Validate current step before proceeding
      if (!validateStep(currentStep, formData)) {
        toast({
          title: 'Required Fields Missing',
          description: `Please complete all required fields in ${steps[currentStep].title} before continuing.`,
          status: 'warning',
          duration: 4000,
          isClosable: true
        });
        return;
      }

      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepNumber: number) => {
    if (canNavigateToStep(stepNumber)) {
      setCurrentStep(stepNumber);
    } else {
      toast({
        title: 'Complete Required Steps',
        description: 'Please complete all required fields in previous steps before skipping ahead.',
        status: 'warning',
        duration: 4000,
        isClosable: true
      });
    }
  };

  // ✅ STEP STATUS CALCULATION
  const getStepStatus = (
    stepNumber: number
  ): 'completed' | 'current' | 'incomplete' | 'disabled' => {
    if (stepNumber < currentStep) {
      return validateStep(stepNumber, watch()) ? 'completed' : 'incomplete';
    }
    if (stepNumber === currentStep) return 'current';
    return canNavigateToStep(stepNumber) ? 'disabled' : 'disabled';
  };

  // ✅ PROGRESS CALCULATION
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <StandardPage
      title={title}
      description={description}
      showBackButton={showBackButton}
      onBack={onCancel}>
      {/* ✅ PROGRESS INDICATOR */}
      <VStack spacing={6} align="stretch" mb={8}>
        <Box>
          <Text fontSize="sm" color="gray.600" mb={2}>
            Step {currentStep + 1} of {steps.length}: {steps[currentStep]?.title}
          </Text>
          <Progress
            value={progressPercentage}
            colorScheme="green"
            borderRadius="full"
            size="lg"
            bg="gray.100"
          />
        </Box>

        {/* ✅ STEP INDICATOR */}
        <StandardStepper
          currentStep={currentStep}
          steps={steps.map((step, index) => ({
            title: step.title,
            description: step.description,
            icon: step.icon,
            status: getStepStatus(index),
            required: !step.canSkip,
            onClick: () => goToStep(index)
          }))}
        />
      </VStack>

      {/* ✅ FORM CONTENT */}
      <FormProvider {...formMethods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Render current step content */}
          {children[currentStep]}
        </form>
      </FormProvider>
    </StandardPage>
  );
};

// ✅ REUSABLE STEP WRAPPER COMPONENT
export interface StepWrapperProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
  isLastStep?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  onCancel?: () => void;
  onSubmit?: () => void;
  nextDisabled?: boolean;
  nextText?: string;
  previousText?: string;
  submitText?: string;
  isLoading?: boolean;
}

export const StepWrapper: React.FC<StepWrapperProps> = ({
  title,
  subtitle,
  children,
  currentStep,
  totalSteps,
  isLastStep = false,
  onNext,
  onPrevious,
  onCancel,
  onSubmit,
  nextDisabled = false,
  nextText = 'Continue',
  previousText = 'Back',
  submitText = 'Submit',
  isLoading = false
}) => {
  return (
    <StandardCard title={title} subtitle={subtitle}>
      <VStack spacing={6} align="stretch">
        {children}

        {/* ✅ STANDARDIZED NAVIGATION */}
        <HStack spacing={3} justify="space-between" pt={4}>
          {currentStep > 0 ? (
            <StandardButton variant="outline" leftIcon={<FaChevronLeft />} onClick={onPrevious}>
              {previousText}
            </StandardButton>
          ) : (
            <Box /> // Empty space for alignment
          )}

          <HStack spacing={3}>
            <StandardButton variant="outline" onClick={onCancel}>
              Cancel
            </StandardButton>

            {isLastStep ? (
              <StandardButton
                type="submit"
                isLoading={isLoading}
                loadingText="Submitting..."
                leftIcon={<FaCheckCircle />}
                onClick={onSubmit}>
                {submitText}
              </StandardButton>
            ) : (
              <StandardButton
                rightIcon={<FaChevronRight />}
                onClick={onNext}
                isDisabled={nextDisabled}>
                {nextText}
              </StandardButton>
            )}
          </HStack>
        </HStack>
      </VStack>
    </StandardCard>
  );
};

// ✅ UTILITY FUNCTIONS
export const createStepConfig = (
  stepNumber: number,
  name: string,
  title: string,
  description: string,
  icon: React.ComponentType,
  requiredFields: string[] = [],
  optionalFields: string[] = [],
  canSkip: boolean = true,
  customValidation?: string | ((data: any) => boolean)
): StepConfig => ({
  stepNumber,
  name,
  title,
  description,
  icon,
  requiredFields,
  optionalFields,
  canSkip,
  customValidation
});

export const validateFormFields = (
  data: Record<string, any>,
  requiredFields: string[]
): boolean => {
  return requiredFields.every((field) => {
    const value = data[field];
    return (
      value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '')
    );
  });
};

export default MultiStepForm;
