// ✅ EXAMPLE: How to use the new MultiStepForm component
// This shows how to refactor existing forms to use the reusable pattern

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, number, boolean } from 'zod';
import {
  VStack,
  SimpleGrid,
  Textarea,
  NumberInput,
  NumberInputField,
  Switch,
  HStack,
  Text
} from '@chakra-ui/react';
import {
  StandardField,
  StandardInput,
  StandardSelect
} from '../Design';
import {
  MultiStepForm,
  StepWrapper,
  createStepConfig,
  type StepConfig
} from './MultiStepForm';
import {
  FaBuilding,
  FaMapMarkedAlt,
  FaInfo,
  FaPhone,
  FaSeedling,
  FaCertificate
} from 'react-icons/fa';

// ✅ EXAMPLE: Simplified Parcel Form using MultiStepForm

// 1. Define your schema (only backend-supported fields)
const exampleParcelSchema = object({
  name: string().min(1, 'Parcel name is required').max(100, 'Name too long'),
  area: number().min(0.01, 'Area must be greater than 0'),
  description: string().min(1, 'Description is required'),
  contact_phone: string().optional(),
  contact_person: string().optional(),
  contact_email: string().email('Invalid email format').optional().or(string().length(0)),
  address: string().optional(),
  soil_type: string().optional(),
  unique_code: string().optional(),
  certified: boolean().default(false),
  certification_type: string().optional()
});

type ExampleParcelFormData = {
  name: string;
  area: number;
  description: string;
  contact_phone?: string;
  contact_person?: string;
  contact_email?: string;
  address?: string;
  soil_type?: string;
  unique_code?: string;
  certified: boolean;
  certification_type?: string;
};

// 2. Define your steps configuration
const EXAMPLE_STEPS: StepConfig[] = [
  createStepConfig(
    0,
    'basic-info',
    'Basic Info',
    'Name, area & location',
    FaBuilding,
    ['name', 'area'], // required fields
    [], // optional fields
    false // cannot skip
  ),
  createStepConfig(
    1,
    'location',
    'Location',
    'Map & boundaries',
    FaMapMarkedAlt,
    [], // polygon validated separately
    [],
    false,
    'polygon' // custom validation key
  ),
  createStepConfig(
    2,
    'description',
    'Description',
    'Details & characteristics',
    FaInfo,
    ['description'],
    [],
    false
  ),
  createStepConfig(
    3,
    'contact',
    'Contact Details',
    'Contact information',
    FaPhone,
    [],
    ['contact_phone', 'contact_person', 'contact_email', 'address'],
    true // can skip
  ),
  createStepConfig(
    4,
    'agricultural',
    'Agricultural Details',
    'Soil type & codes',
    FaSeedling,
    [],
    ['soil_type', 'unique_code'],
    true
  ),
  createStepConfig(
    5,
    'certification',
    'Certification & Media',
    'Images & certification',
    FaCertificate,
    [],
    ['certified', 'certification_type'],
    true
  )
];

interface ExampleParcelFormProps {
  onSubmit: (data: ExampleParcelFormData) => void;
  onCancel: () => void;
  initialData?: Partial<ExampleParcelFormData>;
  isEdit?: boolean;
  isLoading?: boolean;
}

const ExampleParcelForm: React.FC<ExampleParcelFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isEdit = false,
  isLoading = false
}) => {
  // 3. Set up form state
  const formMethods = useForm<ExampleParcelFormData>({
    resolver: zodResolver(exampleParcelSchema),
    defaultValues: {
      name: '',
      area: 0,
      description: '',
      contact_phone: '',
      contact_person: '',
      contact_email: '',
      address: '',
      soil_type: '',
      unique_code: '',
      certified: false,
      certification_type: '',
      ...initialData
    }
  });

  const { register, watch, setValue } = formMethods;

  // 4. Custom validators (if needed)
  const [polygon, setPolygon] = useState<Array<{ lat: number; lng: number }>>([]);
  
  const customValidators = {
    polygon: () => polygon && polygon.length > 0
  };

  // 5. Define step content as an array
  const stepContent = [
    // Step 0: Basic Info
    <StepWrapper
      key="step-0"
      title="Parcel Information"
      subtitle="Essential details about your parcel"
      currentStep={0}
      totalSteps={6}
      nextText="Continue to Location"
      nextDisabled={!watch('name') || !watch('area') || watch('area') <= 0}
    >
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        <StandardField
          label="Parcel Name"
          required
          error={formMethods.formState.errors.name?.message}
          helpText="Enter a descriptive name for this parcel">
          <StandardInput
            {...register('name')}
            placeholder="e.g., North Field, Orchard Block A"
            isInvalid={!!formMethods.formState.errors.name}
          />
        </StandardField>

        <StandardField
          label="Area (Hectares)"
          required
          error={formMethods.formState.errors.area?.message}
          helpText="Total area of the parcel in hectares">
          <NumberInput
            value={watch('area') || ''}
            onChange={(_, num) => setValue('area', num || 0)}
            min={0.01}
            step={0.01}
            precision={2}>
            <NumberInputField />
          </NumberInput>
        </StandardField>
      </SimpleGrid>
    </StepWrapper>,

    // Step 1: Location
    <StepWrapper
      key="step-1"
      title="Parcel Location"
      subtitle="Define the boundaries on the map"
      currentStep={1}
      totalSteps={6}
      previousText="Back to Basic Info"
      nextText="Continue to Description"
      nextDisabled={!polygon || polygon.length === 0}
    >
      {/* Map component would go here */}
      <Text>Map integration would be implemented here...</Text>
    </StepWrapper>,

    // Step 2: Description
    <StepWrapper
      key="step-2"
      title="Parcel Description"
      subtitle="Detailed information about the parcel"
      currentStep={2}
      totalSteps={6}
      previousText="Back to Location"
      nextText="Continue to Contact Details"
      nextDisabled={!watch('description')}
    >
      <StandardField
        label="Description"
        required
        error={formMethods.formState.errors.description?.message}
        helpText="Describe the parcel, its characteristics, soil type, drainage, etc.">
        <Textarea
          {...register('description')}
          placeholder="Describe the parcel including soil type, drainage, topography..."
          minH="120px"
        />
      </StandardField>
    </StepWrapper>,

    // Step 3: Contact Details
    <StepWrapper
      key="step-3"
      title="Contact Details"
      subtitle="Contact information for this parcel (optional)"
      currentStep={3}
      totalSteps={6}
      previousText="Back to Description"
      nextText="Continue to Agricultural Details"
    >
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        <StandardField label="Contact Person" helpText="Primary contact for this parcel">
          <StandardInput {...register('contact_person')} placeholder="e.g., Farm Manager Name" />
        </StandardField>

        <StandardField label="Contact Phone" helpText="Phone number for parcel contact">
          <StandardInput {...register('contact_phone')} placeholder="e.g., +1 555 123 4567" />
        </StandardField>

        <StandardField label="Contact Email" helpText="Email address for parcel contact">
          <StandardInput {...register('contact_email')} type="email" placeholder="e.g., manager@farm.com" />
        </StandardField>

        <StandardField label="Address" helpText="Specific address or location details">
          <StandardInput {...register('address')} placeholder="e.g., 123 Farm Road, County" />
        </StandardField>
      </SimpleGrid>
    </StepWrapper>,

    // Step 4: Agricultural Details
    <StepWrapper
      key="step-4"
      title="Agricultural Details"
      subtitle="Agricultural specifications and codes (optional)"
      currentStep={4}
      totalSteps={6}
      previousText="Back to Contact Details"
      nextText="Continue to Certification"
    >
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        <StandardField label="Soil Type" helpText="Primary soil classification">
          <StandardSelect {...register('soil_type')} placeholder="Select soil type">
            <option value="clay">Clay</option>
            <option value="loam">Loam</option>
            <option value="sand">Sand</option>
            <option value="silt">Silt</option>
            <option value="clay-loam">Clay Loam</option>
            <option value="sandy-loam">Sandy Loam</option>
            <option value="silty-loam">Silty Loam</option>
            <option value="other">Other</option>
          </StandardSelect>
        </StandardField>

        <StandardField label="Unique Code" helpText="Internal parcel code or identifier">
          <StandardInput {...register('unique_code')} placeholder="e.g., P001, FIELD-A, etc." />
        </StandardField>
      </SimpleGrid>
    </StepWrapper>,

    // Step 5: Certification & Media
    <StepWrapper
      key="step-5"
      title="Certification & Media"
      subtitle="Certification status and parcel images"
      currentStep={5}
      totalSteps={6}
      isLastStep={true}
      previousText="Back to Agricultural Details"
      submitText={isEdit ? 'Update Parcel' : 'Create Parcel'}
      isLoading={isLoading}
    >
      <VStack align="stretch" spacing={6}>
        <StandardField label="Certification" helpText="Mark this parcel as certified if it meets certification standards">
          <HStack>
            <Switch
              {...register('certified')}
              isChecked={watch('certified')}
              colorScheme="green"
              size="lg"
            />
            <VStack align="start" spacing={1}>
              <Text fontSize="md" fontWeight="medium">Certified Parcel</Text>
              <Text fontSize="sm" color="gray.500">This parcel meets professional certification standards</Text>
            </VStack>
          </HStack>
        </StandardField>

        {watch('certified') && (
          <StandardField label="Certification Type" helpText="Type of certification this parcel holds">
            <StandardSelect {...register('certification_type')} placeholder="Select certification type">
              <option value="organic">Organic</option>
              <option value="gmo-free">Non-GMO</option>
              <option value="sustainable">Sustainable Agriculture</option>
              <option value="fair-trade">Fair Trade</option>
              <option value="carbon-neutral">Carbon Neutral</option>
              <option value="other">Other</option>
            </StandardSelect>
          </StandardField>
        )}
      </VStack>
    </StepWrapper>
  ];

  // 6. Use the MultiStepForm component
  return (
    <MultiStepForm<ExampleParcelFormData>
      title={isEdit ? 'Edit Parcel' : 'Add New Parcel'}
      description="Create a comprehensive parcel profile with location mapping and agricultural details"
      steps={EXAMPLE_STEPS}
      formMethods={formMethods}
      onSubmit={onSubmit}
      onCancel={onCancel}
      isEdit={isEdit}
      isLoading={isLoading}
      customValidators={customValidators}
    >
      {stepContent}
    </MultiStepForm>
  );
};

export default ExampleParcelForm;

// ✅ USAGE PATTERNS FOR OTHER FORMS

/*
HOW TO APPLY THIS PATTERN TO OTHER FORMS:

1. ESTABLISHMENT FORM:
   - Follow same structure with establishment-specific fields
   - Steps: Basic Info, Location, Contact, Images
   - Use createStepConfig() for each step

2. EVENT FORM:
   - Steps: Event Details, Date/Time, Description, Images
   - Add custom validation for date ranges
   - Use voice recording integration

3. PRODUCTION FORM:
   - Steps: Basic Info, Crop Details, Methods, Timeline, Finish
   - Add production-specific validators
   - Handle start/finish production workflows

KEY BENEFITS:
✅ Consistent UX across all forms
✅ Reusable validation logic
✅ Standardized navigation
✅ Easy to maintain and extend
✅ Type-safe with TypeScript
✅ No data loss (only backend-supported fields)
✅ Mobile-responsive design
✅ Accessible with proper focus management

MIGRATION STRATEGY:
1. Start with one form (Parcel - already done)
2. Extract common patterns to MultiStepForm
3. Migrate other forms one by one
4. Remove old form implementations
5. Update all form usage throughout the app
*/