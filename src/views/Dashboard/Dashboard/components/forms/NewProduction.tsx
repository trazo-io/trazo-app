/*!

=========================================================
* Purity UI Dashboard PRO - v1.0.0
=========================================================

* Product Page: https://www.creative-tim.com/product/purity-ui-dashboard-pro
* Copyright 2021 Creative Tim (https://www.creative-tim.com/)

* Design by Creative Tim & Coded by Simmmple

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

import React, { useEffect, useState } from 'react';
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
  Badge,
  Divider,
  Input,
  InputGroup,
  InputLeftElement,
  Grid,
  Avatar,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  useColorModeValue,
  Flex
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
  StandardStepper,
  StandardSelectionGrid
} from 'components/Design/StandardComponents';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, boolean, number, date } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { clearForm } from 'store/features/formSlice';
import { setEstablishmentParcelHasProduction } from 'store/features/companySlice';
import { useCreateProductionMutation } from 'store/api/historyApi';
import { useGetEstablishmentProductsQuery } from 'store/api/productApi';
import { useIntl } from 'react-intl';
import CreatableSelect from 'react-select/creatable';
import {
  FaSeedling,
  FaCalendarAlt,
  FaInfoCircle,
  FaCheckCircle,
  FaChevronRight,
  FaChevronLeft,
  FaTractor,
  FaLeaf,
  FaWater,
  FaCut,
  FaWarehouse,
  FaSearch,
  FaAppleAlt,
  FaCarrot,
  FaGraduationCap,
  FaCoffee,
  FaTarget,
  FaChartLine,
  FaRecycle,
  FaAward,
  FaCalculator,
  FaLightbulb
} from 'react-icons/fa';
import {
  MdLocalFlorist,
  MdHome,
  MdGrass,
  MdFilterVintage,
  MdVerified,
  MdTrendingDown,
  MdEco
} from 'react-icons/md';
import {
  useGetUSDAEmissionFactorsQuery,
  useGetRegionalBenchmarkQuery,
  useGetCarbonImpactExamplesQuery
} from 'store/api/carbonApi';

// Production type options with carbon benefits
const productionTypeOptions = [
  {
    id: 'OR',
    title: 'Organic',
    description: 'Certified organic farming methods',
    icon: FaLeaf,
    color: 'green',
    value: 'OR',
    carbonBenefits: 'Enhanced consumer transparency and soil health tracking'
  },
  {
    id: 'GA',
    title: 'General Agriculture',
    description: 'Conventional farming with sustainability tracking',
    icon: FaTractor,
    color: 'blue',
    value: 'GA',
    carbonBenefits: 'Transparent supply chain verification'
  },
  {
    id: 'SU',
    title: 'Sustainable',
    description: 'Regenerative and sustainable practices',
    icon: FaSeedling,
    color: 'purple',
    value: 'SU',
    carbonBenefits: 'Premium transparency verification and ecosystem tracking'
  }
];

// NOTE: Irrigation method removed for MVP - already captured at establishment level
const irrigationMethodOptions = [
  // Kept for backwards compatibility but no longer shown in UI
  { value: 'drip', label: 'Drip Irrigation', efficiency: 'High', carbonImpact: 'Low' },
  { value: 'sprinkler', label: 'Sprinkler System', efficiency: 'Medium', carbonImpact: 'Medium' },
  { value: 'flood', label: 'Flood Irrigation', efficiency: 'Low', carbonImpact: 'High' },
  { value: 'micro_spray', label: 'Micro Spray', efficiency: 'High', carbonImpact: 'Low' },
  { value: 'rainwater', label: 'Rainwater Only', efficiency: 'Variable', carbonImpact: 'Very Low' }
];

// Production method options for sustainability scoring
const productionMethodOptions = [
  { value: 'conventional', label: 'Conventional', carbonScore: 'Standard' },
  { value: 'organic', label: 'Organic Certified', carbonScore: 'Enhanced' },
  { value: 'biodynamic', label: 'Biodynamic', carbonScore: 'Premium' },
  { value: 'regenerative', label: 'Regenerative', carbonScore: 'Premium' },
  { value: 'permaculture', label: 'Permaculture', carbonScore: 'Enhanced' }
];

// Growing environment options
const environmentOptions = [
  {
    id: 'outdoor',
    title: 'Outdoor',
    description: 'Open field cultivation',
    icon: MdLocalFlorist,
    color: 'green',
    value: 'outdoor'
  },
  {
    id: 'indoor',
    title: 'Indoor/Greenhouse',
    description: 'Controlled environment',
    icon: MdHome,
    color: 'blue',
    value: 'indoor'
  }
];

// Custom styles for CreatableSelect
const selectStyles = {
  control: (provided: any) => ({
    ...provided,
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    minHeight: '40px',
    fontSize: '14px'
  }),
  placeholder: (provided: any) => ({
    ...provided,
    color: '#A0AEC0'
  })
};

// Enhanced form schema with carbon goals
const productionSchema = object({
  productId: string().optional(),
  productName: string().optional(),
  date: string().min(1, 'Date is required'),
  type: string().min(1, 'Production type is required'),
  isOutdoor: boolean().default(true),
  ageOfPlants: number().optional(),
  numberOfPlants: number().optional(),
  soilPh: number().optional(),
  // Carbon Goals
  carbonReductionTarget: number().optional(),
  carbonBudget: number().optional(),
  sustainabilityScore: number().optional(),
  organicCertificationGoal: boolean().default(false),
  renewableEnergyTarget: number().optional(),
  waterEfficiencyGoal: number().optional(),
  soilHealthTarget: number().optional(),
  carbonOffsetPlanning: boolean().default(false),
  // Production Planning
  expectedHarvest: string().optional(),
  estimatedYield: number().optional(),
  productionMethod: string().optional(),
  qualityTargets: string().optional(),
  // Enhanced blockchain fields
  enableBlockchain: boolean().default(true)
});

interface ProductionFormData {
  productId?: string;
  productName?: string;
  date: string;
  type: string;
  isOutdoor: boolean;
  ageOfPlants?: number;
  numberOfPlants?: number;
  soilPh?: number;
  // Carbon Goals
  carbonReductionTarget?: number;
  carbonBudget?: number;
  sustainabilityScore?: number;
  organicCertificationGoal?: boolean;
  renewableEnergyTarget?: number;
  waterEfficiencyGoal?: number;
  soilHealthTarget?: number;
  carbonOffsetPlanning?: boolean;
  // Production Planning
  expectedHarvest?: string;
  estimatedYield?: number;
  productionMethod?: string;
  qualityTargets?: string;
  // Enhanced blockchain fields
  enableBlockchain?: boolean;
}

export const NewProduction: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productError, setProductError] = useState<string>('');
  const [productsOptions, setProductsOptions] = useState<Array<{ value: string; label: string }>>(
    []
  );
  const [navigateTo, setNavigateTo] = useState<string | null>(null);
  const [carbonPreview, setCarbonPreview] = useState<any>(null);
  const intl = useIntl();
  const toast = useToast();
  const dispatch = useDispatch();

  const navigate = useNavigate();
  const { parcelId, establishmentId } = useParams();
  const currentCompany = useSelector((state: any) => state.company.currentCompany);

  const [createProduction, { data, isSuccess: isSuccessProduction, isLoading }] =
    useCreateProductionMutation();

  // Define steps for stepper
  const steps = [
    { title: 'Product Selection', description: 'Choose product & type', icon: FaSeedling },
    { title: 'Carbon Goals', description: 'Set sustainability targets', icon: FaTarget },
    { title: 'Production Details', description: 'Date & environment', icon: FaCalendarAlt },
    { title: 'Review & Create', description: 'Finalize production', icon: FaCheckCircle }
  ];

  const methods = useForm<ProductionFormData>({
    resolver: zodResolver(productionSchema),
    defaultValues: {
      isOutdoor: true,
      type: 'OR',
      ageOfPlants: 0,
      numberOfPlants: 0,
      soilPh: 7.0,
      enableBlockchain: true,
      carbonReductionTarget: 15,
      sustainabilityScore: 75,
      organicCertificationGoal: false,
      renewableEnergyTarget: 25,
      waterEfficiencyGoal: 20,
      soilHealthTarget: 10,
      carbonOffsetPlanning: false,
      productionMethod: 'conventional'
    }
  });

  const {
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors }
  } = methods;

  const onSubmitForm = (data: ProductionFormData) => {
    console.log('Form submission started:', {
      data,
      selectedProduct,
      hasSelectedProduct: !!selectedProduct
    });

    // Validate product selection
    if (!selectedProduct) {
      setProductError('Product is required');
      return;
    }

    setProductError('');

    try {
      const finalData = {
        ...data,
        product: {
          id: selectedProduct.value,
          name: selectedProduct.label,
          isNew: selectedProduct.__isNew__
        },
        parcel: parcelId,
        is_outdoor: data.isOutdoor,
        // Convert form data to backend format
        age_of_plants: data.ageOfPlants?.toString() || '',
        number_of_plants: data.numberOfPlants?.toString() || '',
        soil_ph: data.soilPh?.toString() || ''
      };

      console.log('Final data to submit:', finalData);
      createProduction(finalData);

      toast({
        title: 'Production Created',
        description: `Production for "${selectedProduct.label}" has been created successfully with carbon goals.`,
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

  useEffect(() => {
    if (isSuccessProduction) {
      dispatch(clearForm());
      dispatch(
        setEstablishmentParcelHasProduction({
          establishmentId,
          parcelId
        })
      );
      // Navigate based on user choice or default to parcel view
      const defaultPath = `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/`;
      navigate(navigateTo || defaultPath);
      setNavigateTo(null);
    }
  }, [isSuccessProduction, dispatch, establishmentId, parcelId, navigate, navigateTo]);

  const { data: dataProducts, isSuccess: isSuccessProducts } = useGetEstablishmentProductsQuery(
    {
      companyId: currentCompany?.id,
      establishmentId
    },
    {
      skip: !establishmentId || !currentCompany || currentCompany?.id === undefined
    }
  );

  useEffect(() => {
    if (isSuccessProducts) {
      setProductsOptions(
        dataProducts.map((product) => ({
          value: product.id,
          label: product.name
        }))
      );
    }
  }, [isSuccessProducts]);

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'app.newProduction' })}
      subtitle="Create a new production cycle with carbon goals"
    >
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmitForm)}>
          {/* Step 0: Product Selection */}
          {currentStep === 0 && (
            <StandardCard
              title="Product & Production Type"
              subtitle="Select the product and farming method"
            >
              <VStack spacing={6} align="stretch">
                {/* Product Selection */}
                <StandardField
                  label="Product"
                  required
                  error={productError}
                  helpText="Search and select your crop or create a new one"
                >
                  <CreatableSelect
                    value={selectedProduct}
                    onChange={(newValue) => {
                      setSelectedProduct(newValue);
                      setProductError('');
                    }}
                    options={productsOptions}
                    styles={selectStyles}
                    placeholder="Select product or create new..."
                    isClearable
                  />
                </StandardField>

                {/* Production Type Selection */}
                <StandardField
                  label="Production Type"
                  required
                  error={errors.type?.message}
                  helpText="Choose your farming approach for carbon tracking"
                >
                  <StandardSelectionGrid
                    options={productionTypeOptions}
                    selectedValue={watch('type')}
                    onSelect={(value) => setValue('type', value)}
                    columns={{ base: 'repeat(1, 1fr)', md: 'repeat(3, 1fr)' }}
                    size="md"
                  />
                </StandardField>

                {/* Type Benefits */}
                {watch('type') && (
                  <Box p={4} bg="green.50" borderRadius="lg">
                    <HStack spacing={3} mb={2}>
                      <Icon as={FaLeaf} color="green.600" />
                      <Text fontWeight="semibold" color="green.700">
                        Carbon Benefits
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color="green.600">
                      {
                        productionTypeOptions.find((option) => option.value === watch('type'))
                          ?.carbonBenefits
                      }
                    </Text>
                  </Box>
                )}

                {/* Navigation */}
                <HStack spacing={3} justify="flex-end" pt={4}>
                  <StandardButton
                    variant="outline"
                    onClick={() =>
                      navigate(
                        `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/`
                      )
                    }
                  >
                    Cancel
                  </StandardButton>
                  <StandardButton
                    onClick={nextStep}
                    rightIcon={<FaChevronRight />}
                    disabled={!isStepComplete(0)}
                  >
                    Continue to Carbon Goals
                  </StandardButton>
                </HStack>
              </VStack>
            </StandardCard>
          )}
          {/* Step 1: Carbon Goals */}
          {currentStep === 1 && (
            <StandardCard
              title="Carbon Goals & Sustainability Targets"
              subtitle="Set your environmental objectives for this production cycle"
            >
              <VStack spacing={6} align="stretch">
                {/* Carbon Reduction Target */}
                <StandardField
                  label="Carbon Reduction Target (%)"
                  helpText="Percentage reduction compared to regional baseline"
                >
                  <NumberInput
                    value={watch('carbonReductionTarget') || 15}
                    onChange={(_, num) => setValue('carbonReductionTarget', num || 0)}
                    min={0}
                    max={100}
                  >
                    <NumberInputField borderRadius="lg" placeholder="15" />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </StandardField>

                {/* Carbon Budget */}
                <StandardField
                  label="Carbon Budget (kg CO2e)"
                  helpText="Maximum allowable emissions for this production"
                >
                  <NumberInput
                    value={watch('carbonBudget') || 0}
                    onChange={(_, num) => setValue('carbonBudget', num || 0)}
                    min={0}
                  >
                    <NumberInputField borderRadius="lg" placeholder="e.g., 5000" />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </StandardField>

                {/* Sustainability Goals Grid */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Sustainability Score Target"
                    helpText="Target sustainability rating (0-100)"
                  >
                    <NumberInput
                      value={watch('sustainabilityScore') || 75}
                      onChange={(_, num) => setValue('sustainabilityScore', num || 0)}
                      min={0}
                      max={100}
                    >
                      <NumberInputField borderRadius="lg" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </StandardField>

                  <StandardField
                    label="Renewable Energy Target (%)"
                    helpText="Percentage of operations powered by renewable energy"
                  >
                    <NumberInput
                      value={watch('renewableEnergyTarget') || 25}
                      onChange={(_, num) => setValue('renewableEnergyTarget', num || 0)}
                      min={0}
                      max={100}
                    >
                      <NumberInputField borderRadius="lg" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </StandardField>

                  <StandardField
                    label="Water Efficiency Improvement (%)"
                    helpText="Target reduction in water usage per unit"
                  >
                    <NumberInput
                      value={watch('waterEfficiencyGoal') || 20}
                      onChange={(_, num) => setValue('waterEfficiencyGoal', num || 0)}
                      min={0}
                      max={100}
                    >
                      <NumberInputField borderRadius="lg" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </StandardField>

                  <StandardField
                    label="Soil Health Improvement (%)"
                    helpText="Target improvement in soil organic matter"
                  >
                    <NumberInput
                      value={watch('soilHealthTarget') || 10}
                      onChange={(_, num) => setValue('soilHealthTarget', num || 0)}
                      min={0}
                      max={100}
                    >
                      <NumberInputField borderRadius="lg" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </StandardField>
                </SimpleGrid>

                {/* Certification Goals */}
                <Box p={6} bg="blue.50" borderRadius="xl" border="1px solid" borderColor="blue.200">
                  <HStack spacing={3} mb={4}>
                    <Icon as={FaAward} color="blue.600" boxSize={6} />
                    <Text fontWeight="bold" color="blue.700" fontSize="lg">
                      Certification & Compliance Goals
                    </Text>
                  </HStack>

                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium" color="blue.700">
                          Pursue Organic Certification
                        </Text>
                        <Text fontSize="sm" color="blue.600">
                          Meet USDA organic standards for premium transparency
                        </Text>
                      </VStack>
                      <Switch
                        isChecked={watch('organicCertificationGoal')}
                        onChange={(e) => setValue('organicCertificationGoal', e.target.checked)}
                        colorScheme="blue"
                        size="lg"
                      />
                    </HStack>

                    <HStack justify="space-between">
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium" color="blue.700">
                          Plan Carbon Offset Purchases
                        </Text>
                        <Text fontSize="sm" color="blue.600">
                          Budget for carbon offsets if targets are not met
                        </Text>
                      </VStack>
                      <Switch
                        isChecked={watch('carbonOffsetPlanning')}
                        onChange={(e) => setValue('carbonOffsetPlanning', e.target.checked)}
                        colorScheme="blue"
                        size="lg"
                      />
                    </HStack>
                  </VStack>
                </Box>

                {/* Carbon Impact Preview */}
                {(() => {
                  const preview = calculateCarbonPreview();
                  return preview ? (
                    <Box
                      p={6}
                      bg="green.50"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="green.200"
                    >
                      <HStack spacing={3} mb={4}>
                        <Icon as={FaChartLine} color="green.600" boxSize={6} />
                        <Text fontWeight="bold" color="green.700" fontSize="lg">
                          Carbon Impact Preview
                        </Text>
                      </HStack>
                      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                        <VStack>
                          <Text fontSize="2xl" fontWeight="bold" color="gray.700">
                            {Math.round(preview.baselineEmissions)}
                          </Text>
                          <Text fontSize="sm" color="gray.600" textAlign="center">
                            Baseline Emissions (kg CO2e)
                          </Text>
                        </VStack>
                        <VStack>
                          <Text fontSize="2xl" fontWeight="bold" color="green.600">
                            {Math.round(preview.projectedEmissions)}
                          </Text>
                          <Text fontSize="sm" color="gray.600" textAlign="center">
                            Projected Emissions (kg CO2e)
                          </Text>
                        </VStack>
                        <VStack>
                          <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                            {Math.round(preview.carbonSavings)}
                          </Text>
                          <Text fontSize="sm" color="gray.600" textAlign="center">
                            Carbon Savings (kg CO2e)
                          </Text>
                        </VStack>
                        <VStack>
                          <Text fontSize="2xl" fontWeight="bold" color="purple.600">
                            {preview.reductionPercentage}%
                          </Text>
                          <Text fontSize="sm" color="gray.600" textAlign="center">
                            Reduction Target
                          </Text>
                        </VStack>
                      </SimpleGrid>
                    </Box>
                  ) : null;
                })()}

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}
                  >
                    Back to Product
                  </StandardButton>
                  <HStack spacing={3}>
                    <StandardButton
                      variant="outline"
                      onClick={() =>
                        navigate(
                          `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/`
                        )
                      }
                    >
                      Cancel
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      rightIcon={<FaChevronRight />}
                      disabled={!isStepComplete(1)}
                    >
                      Continue to Details
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* Step 2: Production Details */}
          {currentStep === 2 && (
            <StandardCard
              title="Production Details"
              subtitle="Set the date, environment, and agricultural methods"
            >
              <VStack spacing={6} align="stretch">
                {/* Date Selection */}
                <StandardField
                  label="Production Date"
                  required
                  error={errors.date?.message}
                  helpText="When did this production start?"
                >
                  <Input
                    {...methods.register('date', {
                      required: 'Production date is required'
                    })}
                    type="datetime-local"
                    borderRadius="lg"
                    borderColor="gray.300"
                    _hover={{ borderColor: 'green.400' }}
                    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                    size="lg"
                  />
                </StandardField>

                {/* Environment Selection */}
                <StandardField label="Growing Environment" helpText="Indoor or outdoor cultivation">
                  <StandardSelectionGrid
                    options={environmentOptions}
                    selectedValue={watch('isOutdoor') ? 'outdoor' : 'indoor'}
                    onSelect={(value) => setValue('isOutdoor', value === 'outdoor')}
                    columns={{ base: 'repeat(2, 1fr)' }}
                    size="md"
                  />
                </StandardField>

                {/* Agricultural Methods */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Production Method"
                    helpText="Choose your agricultural approach"
                  >
                    <StandardSelect
                      value={watch('productionMethod')}
                      onChange={(e) => setValue('productionMethod', e.target.value)}
                      placeholder="Select method"
                    >
                      {productionMethodOptions.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </StandardSelect>
                  </StandardField>

                  {/* NOTE: Irrigation Method removed - already captured at establishment level */}
                </SimpleGrid>

                {/* Optional Plant Details */}
                <Box p={6} bg="gray.50" borderRadius="xl">
                  <Text fontWeight="semibold" mb={4} color="gray.700">
                    Optional Plant Details (can be updated later)
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <StandardField label="Age of Plants (days)" helpText="0 for new plantings">
                      <NumberInput
                        value={watch('ageOfPlants') || 0}
                        onChange={(_, num) => setValue('ageOfPlants', num || 0)}
                        min={0}
                      >
                        <NumberInputField borderRadius="lg" />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </StandardField>

                    <StandardField label="Number of Plants" helpText="Approximate count">
                      <NumberInput
                        value={watch('numberOfPlants') || 0}
                        onChange={(_, num) => setValue('numberOfPlants', num || 0)}
                        min={0}
                      >
                        <NumberInputField borderRadius="lg" />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </StandardField>

                    <StandardField label="Soil pH" helpText="7.0 is neutral">
                      <NumberInput
                        value={watch('soilPh') || 7.0}
                        onChange={(_, num) => setValue('soilPh', num || 7.0)}
                        min={1}
                        max={14}
                        step={0.1}
                        precision={1}
                      >
                        <NumberInputField borderRadius="lg" />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </StandardField>
                  </SimpleGrid>
                </Box>

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}
                  >
                    Back to Carbon Goals
                  </StandardButton>
                  <HStack spacing={3}>
                    <StandardButton
                      variant="outline"
                      onClick={() =>
                        navigate(
                          `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/`
                        )
                      }
                    >
                      Cancel
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      rightIcon={<FaChevronRight />}
                      disabled={!isStepComplete(2)}
                    >
                      Review & Create
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* Step 3: Review & Create */}
          {currentStep === 3 && (
            <StandardCard
              title="Review & Create Production"
              subtitle="Review your settings and create the production with carbon goals"
            >
              <VStack spacing={6} align="stretch">
                {/* Production Summary */}
                <Box
                  p={6}
                  bg="green.50"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor="green.200"
                >
                  <HStack spacing={3} mb={4}>
                    <Icon as={FaCheckCircle} color="green.500" boxSize={6} />
                    <Text fontWeight="bold" color="green.700" fontSize="lg">
                      Production Summary
                    </Text>
                  </HStack>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} fontSize="sm">
                    <HStack>
                      <Icon as={FaSeedling} color="green.600" />
                      <Text>
                        <Text as="span" fontWeight="semibold">
                          Crop:
                        </Text>{' '}
                        {selectedProduct?.label || 'Not selected'}
                      </Text>
                    </HStack>
                    <HStack>
                      <Icon as={watch('type') === 'OR' ? FaLeaf : FaTractor} color="green.600" />
                      <Text>
                        <Text as="span" fontWeight="semibold">
                          Method:
                        </Text>{' '}
                        {watch('type') === 'OR' ? 'Organic' : 'General Agriculture'}
                      </Text>
                    </HStack>
                    <HStack>
                      <Icon as={watch('isOutdoor') ? MdLocalFlorist : MdHome} color="green.600" />
                      <Text>
                        <Text as="span" fontWeight="semibold">
                          Environment:
                        </Text>{' '}
                        {watch('isOutdoor') ? 'Outdoor' : 'Indoor/Greenhouse'}
                      </Text>
                    </HStack>
                    <HStack>
                      <Icon as={FaCalendarAlt} color="green.600" />
                      <Text>
                        <Text as="span" fontWeight="semibold">
                          Start:
                        </Text>{' '}
                        {watch('date') ? new Date(watch('date')).toLocaleDateString() : 'Not set'}
                      </Text>
                    </HStack>
                  </SimpleGrid>
                </Box>

                {/* Carbon Goals Summary */}
                <Box p={6} bg="blue.50" borderRadius="xl" border="1px solid" borderColor="blue.200">
                  <HStack spacing={3} mb={4}>
                    <Icon as={FaTarget} color="blue.600" boxSize={6} />
                    <Text fontWeight="bold" color="blue.700" fontSize="lg">
                      Carbon Goals
                    </Text>
                  </HStack>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} fontSize="sm">
                    <HStack>
                      <Icon as={MdTrendingDown} color="blue.600" />
                      <Text>
                        <Text as="span" fontWeight="semibold">
                          Carbon Reduction:
                        </Text>{' '}
                        {watch('carbonReductionTarget') || 0}%
                      </Text>
                    </HStack>
                    <HStack>
                      <Icon as={FaCalculator} color="blue.600" />
                      <Text>
                        <Text as="span" fontWeight="semibold">
                          Sustainability Score:
                        </Text>{' '}
                        {watch('sustainabilityScore') || 0}/100
                      </Text>
                    </HStack>
                    <HStack>
                      <Icon as={MdEco} color="blue.600" />
                      <Text>
                        <Text as="span" fontWeight="semibold">
                          Renewable Energy:
                        </Text>{' '}
                        {watch('renewableEnergyTarget') || 0}%
                      </Text>
                    </HStack>
                    <HStack>
                      <Icon as={FaWater} color="blue.600" />
                      <Text>
                        <Text as="span" fontWeight="semibold">
                          Water Efficiency:
                        </Text>{' '}
                        {watch('waterEfficiencyGoal') || 0}% improvement
                      </Text>
                    </HStack>
                  </SimpleGrid>
                </Box>

                {/* Next Steps */}
                <StandardAlert
                  status="info"
                  title="Next Steps"
                  description="After creating this production, you can start adding events and tracking your progress toward these carbon goals."
                />

                {/* Final Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}
                  >
                    Back to Details
                  </StandardButton>
                  <HStack spacing={3}>
                    <StandardButton
                      variant="outline"
                      onClick={() =>
                        navigate(
                          `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/`
                        )
                      }
                    >
                      Cancel
                    </StandardButton>
                    <StandardButton
                      onClick={handleSaveOnly}
                      variant="secondary"
                      type="submit"
                      isLoading={isLoading}
                      loadingText="Creating..."
                    >
                      Save Production
                    </StandardButton>
                    <StandardButton
                      onClick={handleSaveAndAddEvent}
                      type="submit"
                      isLoading={isLoading}
                      loadingText="Creating..."
                      leftIcon={<FaCheckCircle />}
                    >
                      Save & Add Event
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

export default NewProduction;
