import React, { useState, useEffect, ChangeEvent } from 'react';
import {
  HStack,
  VStack,
  SimpleGrid,
  Box,
  Text,
  IconButton,
  Badge,
  Checkbox,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Radio,
  RadioGroup,
  Stack,
  Divider,
  Icon,
  Flex,
  Circle,
  useToast
} from '@chakra-ui/react';
import {
  StandardPage,
  StandardCard,
  StandardForm,
  StandardField,
  StandardInput,
  StandardTextarea,
  StandardSelect,
  StandardButton,
  StandardAlert,
  StandardGrid
} from '../Design/StandardComponents';
import { TrazoImageUpload } from '../Upload';
import {
  FaCloud,
  FaSeedling,
  FaFlask,
  FaTractor,
  FaBug,
  FaMountain,
  FaCamera,
  FaCloudRain,
  FaLeaf,
  FaFire,
  FaWind,
  FaSnowflake,
  FaChevronRight,
  FaChevronLeft,
  FaCheck
} from 'react-icons/fa';
import { MdCheck, MdLocationOn } from 'react-icons/md';
import { useIntl } from 'react-intl';

// Event Type Configuration - Aligned with Backend Event Types
const EVENT_TYPES = [
  {
    id: 'weather',
    name: 'Weather Event',
    description: 'Record weather conditions affecting your crops',
    icon: FaCloud,
    color: 'blue',
    value: 0, // ✅ WEATHER_EVENT_TYPE = 0
    carbonRelevance: 'indirect',
    subtypes: [
      { id: 'frost', name: 'Frost', icon: FaSnowflake, carbonImpact: 'low' },
      { id: 'drought', name: 'Drought', icon: FaFire, carbonImpact: 'medium' },
      { id: 'heavy_rain', name: 'Heavy Rain', icon: FaCloudRain, carbonImpact: 'low' },
      { id: 'high_winds', name: 'High Winds', icon: FaWind, carbonImpact: 'low' },
      { id: 'hail', name: 'Hail Damage', icon: FaSnowflake, carbonImpact: 'medium' },
      { id: 'heat_stress', name: 'Heat Stress', icon: FaFire, carbonImpact: 'medium' }
    ]
  },
  {
    id: 'chemical',
    name: 'Chemical Application',
    description: 'Log fertilizers, pesticides, and treatments',
    icon: FaFlask,
    color: 'orange',
    value: 1, // ✅ CHEMICAL_EVENT_TYPE = 1
    carbonRelevance: 'direct',
    smartValidation: true, // Uses Smart Product validation system
    subtypes: [
      { id: 'fertilizer', name: 'Fertilizer', icon: FaFlask, carbonImpact: 'very_high' },
      { id: 'pesticide', name: 'Pesticide', icon: FaBug, carbonImpact: 'medium' },
      { id: 'herbicide', name: 'Herbicide', icon: FaLeaf, carbonImpact: 'medium' },
      { id: 'fungicide', name: 'Fungicide', icon: FaFlask, carbonImpact: 'medium' },
      { id: 'growth_regulator', name: 'Growth Regulator', icon: FaSeedling, carbonImpact: 'low' }
    ]
  },
  {
    id: 'production',
    name: 'Production Activity',
    description: 'Track planting, harvesting, and maintenance',
    icon: FaSeedling,
    color: 'green',
    value: 2, // ✅ PRODUCTION_EVENT_TYPE = 2
    carbonRelevance: 'direct',
    subtypes: [
      { id: 'planting', name: 'Planting', icon: FaSeedling, carbonImpact: 'medium' },
      { id: 'harvesting', name: 'Harvesting', icon: FaLeaf, carbonImpact: 'high' },
      { id: 'irrigation', name: 'Irrigation', icon: FaCloudRain, carbonImpact: 'high' },
      { id: 'pruning', name: 'Pruning', icon: FaLeaf, carbonImpact: 'low' },
      { id: 'grain_drying', name: 'Grain Drying', icon: FaFire, carbonImpact: 'very_high' },
      { id: 'storage', name: 'Storage Operations', icon: FaMountain, carbonImpact: 'medium' }
    ]
  },
  {
    id: 'general',
    name: 'General Activity',
    description: 'Other farming activities and observations',
    icon: FaSeedling,
    color: 'gray',
    value: 3, // ✅ GENERAL_EVENT_TYPE = 3
    carbonRelevance: 'variable',
    subtypes: [
      { id: 'tillage', name: 'Tillage Operations', icon: FaTractor, carbonImpact: 'high' },
      { id: 'cover_crops', name: 'Cover Crop Management', icon: FaSeedling, carbonImpact: 'negative' },
      { id: 'conservation', name: 'Conservation Practices', icon: FaLeaf, carbonImpact: 'negative' },
      { id: 'energy', name: 'Energy & Infrastructure', icon: FaFire, carbonImpact: 'high' },
      { id: 'verification', name: 'Carbon Verification', icon: FaCheck, carbonImpact: 'neutral' },
      { id: 'other', name: 'Other Activities', icon: FaSeedling, carbonImpact: 'low' }
    ]
  },
  {
    id: 'equipment',
    name: 'Equipment & Fuel',
    description: 'Track machinery usage and fuel consumption',
    icon: FaTractor,
    color: 'purple',
    value: 4, // ✅ EQUIPMENT_EVENT_TYPE = 4
    carbonRelevance: 'direct',
    subtypes: [
      { id: 'field_operations', name: 'Field Operations', icon: FaTractor, carbonImpact: 'high' },
      { id: 'fuel_consumption', name: 'Fuel Usage', icon: FaFire, carbonImpact: 'very_high' },
      { id: 'maintenance', name: 'Maintenance', icon: FaTractor, carbonImpact: 'low' },
      { id: 'repair', name: 'Repair', icon: FaTractor, carbonImpact: 'low' },
      { id: 'transport', name: 'Transportation', icon: FaTractor, carbonImpact: 'high' }
    ]
  },
  {
    id: 'soil',
    name: 'Soil Management',
    description: 'Monitor soil health and carbon amendments',
    icon: FaMountain,
    color: 'brown',
    value: 5, // ✅ SOIL_MANAGEMENT_EVENT_TYPE = 5
    carbonRelevance: 'direct',
    subtypes: [
      { id: 'soil_test', name: 'Soil Test', icon: FaFlask, carbonImpact: 'neutral' },
      { id: 'ph_adjustment', name: 'pH Adjustment/Lime', icon: FaMountain, carbonImpact: 'high' },
      { id: 'organic_matter', name: 'Organic Matter Addition', icon: FaLeaf, carbonImpact: 'negative' },
      { id: 'compost', name: 'Compost Application', icon: FaLeaf, carbonImpact: 'negative' },
      { id: 'biochar', name: 'Biochar Application', icon: FaFire, carbonImpact: 'very_negative' },
      { id: 'manure', name: 'Manure Application', icon: FaMountain, carbonImpact: 'neutral' }
    ]
  },
  {
    id: 'pest',
    name: 'Pest Management',
    description: 'IPM practices and beneficial releases',
    icon: FaBug,
    color: 'red',
    value: 6, // ✅ PEST_MANAGEMENT_EVENT_TYPE = 6
    carbonRelevance: 'indirect',
    subtypes: [
      { id: 'scouting', name: 'Scouting', icon: FaBug, carbonImpact: 'neutral' },
      { id: 'beneficial_release', name: 'Beneficial Release', icon: FaLeaf, carbonImpact: 'negative' },
      { id: 'trap_monitoring', name: 'Trap Monitoring', icon: FaBug, carbonImpact: 'neutral' },
      { id: 'biological_control', name: 'Biological Control', icon: FaLeaf, carbonImpact: 'negative' }
    ]
  },
  {
    id: 'business',
    name: 'Business Activity',
    description: 'Business operations and administrative tasks',
    icon: FaCheck,
    color: 'cyan',
    value: 7, // ✅ BUSINESS_EVENT_TYPE = 7
    carbonRelevance: 'indirect',
    subtypes: [
      { id: 'certification', name: 'Certification Activity', icon: FaCheck, carbonImpact: 'neutral' },
      { id: 'audit', name: 'Audit/Inspection', icon: FaFlask, carbonImpact: 'neutral' },
      { id: 'planning', name: 'Planning Activity', icon: FaSeedling, carbonImpact: 'neutral' },
      { id: 'training', name: 'Training/Education', icon: FaBug, carbonImpact: 'neutral' },
      { id: 'documentation', name: 'Documentation', icon: FaMountain, carbonImpact: 'neutral' }
    ]
  }
];

interface EventFormData {
  eventType: string;
  subtype: string;
  date: string;
  description: string;
  location?: string;
  // Dynamic fields based on event type
  [key: string]: any;
}

interface StandardEventFormProps {
  onSubmit: (data: EventFormData) => void;
  onCancel: () => void;
  initialData?: Partial<EventFormData>;
  isLoading?: boolean;
}

export const StandardEventForm: React.FC<StandardEventFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<EventFormData>({
    eventType: '',
    subtype: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    ...initialData
  });
  const [estimatedCarbonImpact, setEstimatedCarbonImpact] = useState<number | null>(null);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);

  const intl = useIntl();
  const toast = useToast();

  // Get current event type configuration
  const selectedEventType = EVENT_TYPES.find((type) => type.id === formData.eventType);
  const isStepComplete = (step: number) => {
    if (step === 1) return formData.eventType && formData.subtype && formData.date; // Step 1
    if (step === 2) return true; // Step 2 is optional details
    return false;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!isStepComplete(1)) {
      toast({
        title: 'Missing Information',
        description: 'Please complete all required fields in Step 1',
        status: 'warning',
        duration: 3000
      });
      return;
    }

    // Include uploaded images in form submission
    const finalData = {
      ...formData,
      uploaded_image_urls: uploadedImageUrls,
      images: uploadedImageUrls
    };

    onSubmit(finalData);
  };

  // Calculate estimated carbon impact based on event type and subtype
  useEffect(() => {
    if (formData.eventType && formData.subtype) {
      // Enhanced carbon impact estimation based on EPA/USDA factors
      // Values represent typical kg CO₂e per activity (order of magnitude estimates)
      const impacts: Record<string, Record<string, { value: number; confidence: string; note: string }>> = {
        // Chemical applications - redirect to precise calculation for chemicals
        chemical: { 
          fertilizer: { value: 50, confidence: 'Use Smart Product for precision', note: 'Varies greatly by NPK content' },
          pesticide: { value: 3, confidence: 'Medium', note: 'Manufacturing emissions primary' },
          herbicide: { value: 2, confidence: 'Medium', note: 'Application method dependent' },
          fungicide: { value: 3, confidence: 'Medium', note: 'Product-specific variations' },
          growth_regulator: { value: 1, confidence: 'Low', note: 'Minimal application rates' }
        },
        
        // General events - reorganized to include tillage, cover crops, etc.
        general: {
          tillage: { value: 8, confidence: 'High', note: 'Varies by method - conventional tillage releases soil carbon' },
          cover_crops: { value: -5, confidence: 'High', note: 'Carbon sequestration potential' },
          conservation: { value: -15, confidence: 'High', note: 'NRCS practices for carbon storage' },
          energy: { value: 20, confidence: 'High', note: 'Facility energy consumption' },
          verification: { value: 1, confidence: 'Low', note: 'Documentation and sampling activities' },
          other: { value: 2, confidence: 'Low', note: 'General farming activities' }
        },
        
        // Equipment and fuel - direct emissions
        equipment: { 
          field_operations: { value: 12, confidence: 'High', note: 'Diesel consumption primary' },
          fuel_consumption: { value: 25, confidence: 'High', note: '2.68 kg CO₂/L diesel' },
          maintenance: { value: 1, confidence: 'Low', note: 'Minimal emissions' },
          repair: { value: 2, confidence: 'Low', note: 'Parts manufacturing' },
          transport: { value: 15, confidence: 'Medium', note: 'Distance dependent' }
        },
        
        // Production activities
        production: { 
          planting: { value: 8, confidence: 'Medium', note: 'Equipment + seed transport' },
          harvesting: { value: 20, confidence: 'High', note: 'Heavy equipment intensive' },
          irrigation: { value: 12, confidence: 'High', note: 'Pump energy primary' },
          pruning: { value: 2, confidence: 'Low', note: 'Manual labor primarily' },
          grain_drying: { value: 45, confidence: 'High', note: 'Energy intensive process' },
          storage: { value: 5, confidence: 'Medium', note: 'Ventilation and handling' }
        },
        
        // Soil management
        soil: { 
          soil_test: { value: 0, confidence: 'Low', note: 'Minimal emissions' },
          ph_adjustment: { value: 12, confidence: 'High', note: 'Limestone decomposition' },
          organic_matter: { value: -8, confidence: 'High', note: 'Carbon sequestration' },
          compost: { value: -5, confidence: 'Medium', note: 'Soil carbon increase' },
          biochar: { value: -20, confidence: 'High', note: 'Long-term sequestration' },
          manure: { value: 3, confidence: 'Medium', note: 'Transport vs. soil benefit' }
        },
        
        // Pest management
        pest: { 
          scouting: { value: 1, confidence: 'Low', note: 'Travel emissions minimal' },
          beneficial_release: { value: -2, confidence: 'Medium', note: 'Reduces chemical need' },
          trap_monitoring: { value: 0, confidence: 'Low', note: 'Minimal emissions' },
          biological_control: { value: -3, confidence: 'Medium', note: 'Replaces chemicals' }
        },
        
        // Business activities
        business: {
          certification: { value: 2, confidence: 'Low', note: 'Travel and documentation' },
          audit: { value: 1, confidence: 'Low', note: 'Administrative activities' },
          planning: { value: 0, confidence: 'Low', note: 'Planning and strategy' },
          training: { value: 1, confidence: 'Low', note: 'Educational activities' },
          documentation: { value: 0, confidence: 'Low', note: 'Record keeping' }
        },
        
        // Weather events
        weather: { 
          frost: { value: 0, confidence: 'Low', note: 'No direct emissions' },
          drought: { value: 5, confidence: 'Medium', note: 'Increased irrigation needs' },
          heavy_rain: { value: 0, confidence: 'Low', note: 'No direct emissions' },
          high_winds: { value: 0, confidence: 'Low', note: 'No direct emissions' },
          hail: { value: 2, confidence: 'Low', note: 'Cleanup activities' },
          heat_stress: { value: 3, confidence: 'Medium', note: 'Additional cooling/irrigation' }
        }
      };

      const impactData = impacts[formData.eventType]?.[formData.subtype];
      if (impactData) {
        setEstimatedCarbonImpact(impactData.value);
        // Store additional metadata for display
        setFormData(prev => ({
          ...prev,
          carbonConfidence: impactData.confidence,
          carbonNote: impactData.note
        }));
      } else {
        setEstimatedCarbonImpact(0);
      }
    }
  }, [formData.eventType, formData.subtype]);

  // Debug logging
  console.log('🔍 StandardEventForm Debug:', {
    currentStep,
    formData,
    selectedEventType: selectedEventType?.name,
    isStep1Complete: isStepComplete(1),
    isStep2Complete: isStepComplete(2)
  });

  return (
    <StandardPage
      title="Add New Event"
      description="Record agricultural activities and environmental conditions"
      showBackButton
      onBack={onCancel}>
      {/* Progress Indicator */}
      <StandardCard>
        <HStack spacing={8} justify="center" mb={6}>
          <HStack spacing={2}>
            <Circle size="40px" bg={currentStep >= 1 ? 'green.500' : 'gray.300'} color="white">
              {isStepComplete(1) ? <Icon as={MdCheck} /> : <Text fontWeight="bold">1</Text>}
            </Circle>
            <VStack spacing={0} align="start">
              <Text fontWeight="semibold" fontSize="sm">
                Step 1
              </Text>
              <Text fontSize="xs" color="gray.500">
                Event Details
              </Text>
            </VStack>
          </HStack>

          <Box w="40px" h="2px" bg={currentStep >= 2 ? 'green.500' : 'gray.300'} />

          <HStack spacing={2}>
            <Circle size="40px" bg={currentStep >= 2 ? 'green.500' : 'gray.300'} color="white">
              <Text fontWeight="bold">2</Text>
            </Circle>
            <VStack spacing={0} align="start">
              <Text fontWeight="semibold" fontSize="sm">
                Step 2
              </Text>
              <Text fontSize="xs" color="gray.500">
                Additional Info
              </Text>
            </VStack>
          </HStack>
        </HStack>
      </StandardCard>

      {/* Step 1: Event Type & Basics */}
      {currentStep === 1 && (
        <StandardCard
          title="Step 1: What happened?"
          subtitle="Select the type of event you want to record">
          <VStack spacing={6} align="stretch">
            {/* Event Type Selection */}
            <StandardField label="Event Type" required>
              <StandardGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                {EVENT_TYPES.map((eventType) => (
                  <Box
                    key={eventType.id}
                    p={4}
                    borderRadius="xl"
                    border="2px solid"
                    borderColor={
                      formData.eventType === eventType.id ? `${eventType.color}.500` : 'gray.200'
                    }
                    bg={formData.eventType === eventType.id ? `${eventType.color}.50` : 'white'}
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{
                      borderColor: `${eventType.color}.300`,
                      transform: 'translateY(-2px)'
                    }}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, eventType: eventType.id, subtype: '' }))
                    }>
                    <VStack spacing={3}>
                      <Circle
                        size="50px"
                        bg={`${eventType.color}.100`}
                        color={`${eventType.color}.600`}>
                        <Icon as={eventType.icon} boxSize={6} />
                      </Circle>

                      <VStack spacing={1}>
                        <Text fontWeight="semibold" fontSize="md" textAlign="center">
                          {eventType.name}
                        </Text>
                        <Text fontSize="sm" color="gray.600" textAlign="center">
                          {eventType.description}
                        </Text>
                      </VStack>

                      {formData.eventType === eventType.id && (
                        <Badge colorScheme={eventType.color} variant="solid">
                          Selected
                        </Badge>
                      )}
                    </VStack>
                  </Box>
                ))}
              </StandardGrid>
            </StandardField>

            {/* Subtype Selection */}
            {selectedEventType && (
              <StandardField label={`${selectedEventType.name} Type`} required>
                <StandardGrid columns={{ base: 2, md: 4 }} spacing={3}>
                  {selectedEventType.subtypes.map((subtype) => (
                    <Box
                      key={subtype.id}
                      p={3}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor={
                        formData.subtype === subtype.id
                          ? `${selectedEventType.color}.500`
                          : 'gray.200'
                      }
                      bg={
                        formData.subtype === subtype.id ? `${selectedEventType.color}.50` : 'white'
                      }
                      cursor="pointer"
                      transition="all 0.2s"
                      _hover={{ borderColor: `${selectedEventType.color}.300` }}
                      onClick={() => setFormData((prev) => ({ ...prev, subtype: subtype.id }))}>
                      <HStack spacing={2}>
                        <Icon as={subtype.icon} color={`${selectedEventType.color}.600`} />
                        <Text
                          fontSize="sm"
                          fontWeight={formData.subtype === subtype.id ? 'semibold' : 'normal'}>
                          {subtype.name}
                        </Text>
                      </HStack>
                    </Box>
                  ))}
                </StandardGrid>
              </StandardField>
            )}

            {/* Date Selection */}
            <StandardField label="Date" required>
              <StandardInput
                type="date"
                value={formData.date}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </StandardField>

            {/* Dynamic Fields Based on Event Type */}
            {selectedEventType && formData.subtype && (
              <DynamicEventFields
                eventType={formData.eventType}
                subtype={formData.subtype}
                formData={formData}
                setFormData={setFormData}
              />
            )}

            {/* Enhanced Carbon Impact Preview */}
            {estimatedCarbonImpact !== null && (
              <Box
                p={4}
                borderRadius="xl"
                border="1px solid"
                borderColor={
                  estimatedCarbonImpact > 0
                    ? 'orange.200'
                    : estimatedCarbonImpact < 0
                    ? 'green.200'
                    : 'blue.200'
                }
                bg={
                  estimatedCarbonImpact > 0
                    ? 'orange.50'
                    : estimatedCarbonImpact < 0
                    ? 'green.50'
                    : 'blue.50'
                }>
                <VStack spacing={3} align="stretch">
                  <HStack spacing={3}>
                    <Circle
                      size="40px"
                      bg={
                        estimatedCarbonImpact > 0
                          ? 'orange.100'
                          : estimatedCarbonImpact < 0
                          ? 'green.100'
                          : 'blue.100'
                      }
                      color={
                        estimatedCarbonImpact > 0
                          ? 'orange.600'
                          : estimatedCarbonImpact < 0
                          ? 'green.600'
                          : 'blue.600'
                      }>
                      <Icon
                        as={
                          estimatedCarbonImpact > 0
                            ? FaFire
                            : estimatedCarbonImpact < 0
                            ? FaLeaf
                            : FaCloud
                        }
                        boxSize={5}
                      />
                    </Circle>

                    <VStack spacing={0} align="start" flex="1">
                      <Text fontWeight="bold" fontSize="md">
                        Carbon Impact Estimate
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color={
                        estimatedCarbonImpact > 0
                          ? 'orange.600'
                          : estimatedCarbonImpact < 0
                          ? 'green.600'
                          : 'blue.600'
                      }>
                        {estimatedCarbonImpact > 0 ? '+' : ''}
                        {estimatedCarbonImpact} kg CO₂e
                      </Text>
                    </VStack>

                    <Badge
                      colorScheme={
                        formData.carbonConfidence === 'High'
                          ? 'green'
                          : formData.carbonConfidence === 'Medium'
                          ? 'yellow'
                          : 'gray'
                      }
                      variant="solid">
                      {formData.carbonConfidence || 'Low'} Confidence
                    </Badge>
                  </HStack>

                  <Text fontSize="sm" color="gray.600">
                    {formData.carbonNote || 'Standard estimation method'}
                  </Text>

                  {/* Special message for chemical events */}
                  {formData.eventType === 'chemical' && formData.subtype === 'fertilizer' && (
                    <Box p={3} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
                      <Text fontSize="sm" color="blue.700" fontWeight="medium">
                        💡 For precise fertilizer calculations, use the Chemical Application event type with Smart Product validation
                      </Text>
                    </Box>
                  )}

                  {/* Carbon sequestration highlight */}
                  {estimatedCarbonImpact < 0 && (
                    <Box p={3} bg="green.50" borderRadius="md" border="1px solid" borderColor="green.200">
                      <Text fontSize="sm" color="green.700" fontWeight="medium">
                        🌱 This practice helps sequester carbon and may be eligible for carbon credit programs
                      </Text>
                    </Box>
                  )}

                  {/* High impact warning */}
                  {estimatedCarbonImpact > 20 && (
                    <Box p={3} bg="orange.50" borderRadius="md" border="1px solid" borderColor="orange.200">
                      <Text fontSize="sm" color="orange.700" fontWeight="medium">
                        ⚠️ High carbon impact activity - consider efficiency improvements or carbon offsets
                      </Text>
                    </Box>
                  )}
                </VStack>
              </Box>
            )}

            {/* Step 1 Actions */}
            <HStack spacing={3} justify="flex-end">
              <StandardButton variant="outline" onClick={onCancel}>
                Cancel
              </StandardButton>
              <StandardButton
                onClick={() => setCurrentStep(2)}
                rightIcon={<FaChevronRight />}
                disabled={!isStepComplete(1)}>
                Continue to Details
              </StandardButton>
            </HStack>
          </VStack>
        </StandardCard>
      )}

      {/* Step 2: Additional Details */}
      {currentStep === 2 && (
        <StandardCard
          title="Step 2: Additional Details"
          subtitle="Optional information to enhance your record">
          <VStack spacing={6} align="stretch">
            {/* Description */}
            <StandardField
              label="Description"
              helpText="Add any notes, observations, or additional context">
              <StandardTextarea
                value={formData.description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe what happened, conditions observed, or any other relevant details..."
              />
            </StandardField>

            {/* Location (if GPS available) */}
            <StandardField label="Location" helpText="Specific area within your operation">
              <StandardInput
                value={formData.location || ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="e.g., North Field Block A, Greenhouse #2"
                leftElement={<Icon as={MdLocationOn} color="gray.400" />}
              />
            </StandardField>

            {/* 2025 Modern Image Upload */}
            <StandardField
              label="Event Photos"
              helpText="Upload up to 5 high-quality images to document this event (JPG, PNG, GIF, WEBP - max 5MB each)">
              <TrazoImageUpload
                maxFiles={5}
                maxSize={5 * 1024 * 1024} // 5MB
                existingImages={uploadedImageUrls}
                onImagesChange={setUploadedImageUrls}
                isLoading={false}
              />
            </StandardField>

            {/* Step 2 Actions */}
            <HStack spacing={3} justify="space-between">
              <StandardButton
                variant="outline"
                leftIcon={<FaChevronLeft />}
                onClick={() => setCurrentStep(1)}>
                Back to Event Details
              </StandardButton>

              <HStack spacing={3}>
                <StandardButton variant="outline" onClick={onCancel}>
                  Cancel
                </StandardButton>
                <StandardButton onClick={handleSubmit} isLoading={isLoading} leftIcon={<FaCheck />}>
                  Save Event
                </StandardButton>
              </HStack>
            </HStack>
          </VStack>
        </StandardCard>
      )}
    </StandardPage>
  );
};

// Dynamic Fields Component - Enhanced with Validation
const DynamicEventFields: React.FC<{
  eventType: string;
  subtype: string;
  formData: EventFormData;
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
}> = ({ eventType, subtype, formData, setFormData }) => {
  
  // General Event Fields - Enhanced for multiple activity types
  if (eventType === 'general') {
    // Tillage-specific fields
    if (subtype === 'tillage') {
      return (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <StandardField label="Area Treated *" helpText="Total area for tillage operation">
            <StandardInput
              value={formData.areaTreated || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, areaTreated: e.target.value }))
              }
              placeholder="e.g., 25 acres, 10.2 hectares"
              required
            />
          </StandardField>

          <StandardField label="Tillage Method *">
            <StandardSelect
              value={formData.tillageMethod || ''}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setFormData((prev) => ({ ...prev, tillageMethod: e.target.value }))
              }>
              <option value="">Select method...</option>
              <option value="no_till">No-Till</option>
              <option value="minimum_till">Minimum Till</option>
              <option value="conventional_till">Conventional Till</option>
              <option value="deep_ripping">Deep Ripping</option>
              <option value="strip_till">Strip Till</option>
            </StandardSelect>
          </StandardField>

          <StandardField label="Equipment Used">
            <StandardInput
              value={formData.equipmentName || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, equipmentName: e.target.value }))
              }
              placeholder="e.g., John Deere 2730 Ripper"
            />
          </StandardField>

          <StandardField label="Fuel Consumption" helpText="Estimated fuel used">
            <StandardInput
              value={formData.fuelAmount || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, fuelAmount: e.target.value }))
              }
              placeholder="e.g., 15 gallons, 57 liters"
            />
          </StandardField>
        </SimpleGrid>
      );
    }

    // Cover crop-specific fields
    if (subtype === 'cover_crops') {
      return (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <StandardField label="Cover Crop Species *" helpText="Type of cover crop">
            <StandardInput
              value={formData.coverCropSpecies || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, coverCropSpecies: e.target.value }))
              }
              placeholder="e.g., Winter Rye, Crimson Clover"
              required
            />
          </StandardField>

          <StandardField label="Activity Type *">
            <StandardSelect
              value={formData.coverCropActivity || ''}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setFormData((prev) => ({ ...prev, coverCropActivity: e.target.value }))
              }>
              <option value="">Select activity...</option>
              <option value="establishment">Planting/Establishment</option>
              <option value="termination">Termination</option>
              <option value="management">Management/Maintenance</option>
              <option value="grazing">Grazing</option>
            </StandardSelect>
          </StandardField>

          <StandardField label="Area *">
            <StandardInput
              value={formData.areaTreated || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, areaTreated: e.target.value }))
              }
              placeholder="e.g., 50 acres, 20 hectares"
              required
            />
          </StandardField>

          <StandardField label="Seeding Rate" helpText="If planting">
            <StandardInput
              value={formData.seedingRate || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, seedingRate: e.target.value }))
              }
              placeholder="e.g., 90 lbs/acre, 100 kg/ha"
            />
          </StandardField>
        </SimpleGrid>
      );
    }

    // Energy-specific fields
    if (subtype === 'energy') {
      return (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <StandardField label="Energy Type *">
            <StandardSelect
              value={formData.energyType || ''}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setFormData((prev) => ({ ...prev, energyType: e.target.value }))
              }>
              <option value="">Select type...</option>
              <option value="electricity">Electricity</option>
              <option value="natural_gas">Natural Gas</option>
              <option value="renewable">Renewable Energy</option>
              <option value="propane">Propane</option>
              <option value="diesel_generator">Diesel Generator</option>
            </StandardSelect>
          </StandardField>

          <StandardField label="Amount Consumed *">
            <StandardInput
              value={formData.energyAmount || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, energyAmount: e.target.value }))
              }
              placeholder="e.g., 1,500 kWh, 500 cubic feet"
              required
            />
          </StandardField>

          <StandardField label="Facility/Equipment">
            <StandardInput
              value={formData.facilityName || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, facilityName: e.target.value }))
              }
              placeholder="e.g., Grain dryer, Irrigation pump"
            />
          </StandardField>

          <StandardField label="Cost" helpText="For ROI tracking">
            <StandardInput
              value={formData.energyCost || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, energyCost: e.target.value }))
              }
              placeholder="e.g., $185.50"
            />
          </StandardField>
        </SimpleGrid>
      );
    }

    // Conservation-specific fields
    if (subtype === 'conservation') {
      return (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <StandardField label="Practice Type *" helpText="NRCS practice if applicable">
            <StandardInput
              value={formData.practiceType || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, practiceType: e.target.value }))
              }
              placeholder="e.g., Buffer Strips, Terracing, Agroforestry"
              required
            />
          </StandardField>

          <StandardField label="Area Established *">
            <StandardInput
              value={formData.areaTreated || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, areaTreated: e.target.value }))
              }
              placeholder="e.g., 5 acres, 2 hectares"
              required
            />
          </StandardField>

          <StandardField label="Cost Investment">
            <StandardInput
              value={formData.establishmentCost || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, establishmentCost: e.target.value }))
              }
              placeholder="e.g., $2,500"
            />
          </StandardField>

          <StandardField label="Expected Lifespan">
            <StandardInput
              value={formData.expectedLifespan || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, expectedLifespan: e.target.value }))
              }
              placeholder="e.g., 10 years, Permanent"
            />
          </StandardField>
        </SimpleGrid>
      );
    }

    // Verification-specific fields
    if (subtype === 'verification') {
      return (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <StandardField label="Verification Type *">
            <StandardSelect
              value={formData.verificationType || ''}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setFormData((prev) => ({ ...prev, verificationType: e.target.value }))
              }>
              <option value="">Select type...</option>
              <option value="soil_sampling">Soil Carbon Sampling</option>
              <option value="biomass_measurement">Biomass Measurement</option>
              <option value="third_party_visit">Third-Party Verification</option>
              <option value="baseline_establishment">Baseline Establishment</option>
              <option value="monitoring_protocol">Monitoring Protocol</option>
            </StandardSelect>
          </StandardField>

          <StandardField label="Protocol/Standard">
            <StandardInput
              value={formData.verificationProtocol || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, verificationProtocol: e.target.value }))
              }
              placeholder="e.g., Verra VCS, CAR Protocol, USDA COMET"
            />
          </StandardField>

          <StandardField label="Sample Count" helpText="If sampling">
            <NumberInput
              value={formData.sampleCount || ''}
              onChange={(value) => setFormData((prev) => ({ ...prev, sampleCount: value }))}
              min={0}>
              <NumberInputField placeholder="e.g., 15" />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </StandardField>

          <StandardField label="Verifier/Lab">
            <StandardInput
              value={formData.verifierName || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, verifierName: e.target.value }))
              }
              placeholder="e.g., AgSource Laboratories"
            />
          </StandardField>
        </SimpleGrid>
      );
    }

    // Generic fields for 'other' subtype
    return (
      <StandardField label="Activity Details">
        <StandardTextarea
          value={formData.activityDetails || ''}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev) => ({ ...prev, activityDetails: e.target.value }))
          }
          placeholder="Describe the farming activity, quantities, methods, and any relevant details..."
        />
      </StandardField>
    );
  }

  // Chemical Application Fields - Enhanced with validation hints
  if (eventType === 'chemical') {
    return (
      <>
        <Box p={3} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
          <Text fontSize="sm" color="blue.700" fontWeight="medium">
            💡 For precise carbon calculations with Smart Product validation, use the dedicated Chemical Application event type
          </Text>
        </Box>
        
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <StandardField label="Product Name">
            <StandardInput
              value={formData.productName || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, productName: e.target.value }))
              }
              placeholder="e.g., Miracle-Gro All Purpose"
            />
          </StandardField>

          <StandardField label="Application Rate">
            <StandardInput
              value={formData.applicationRate || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, applicationRate: e.target.value }))
              }
              placeholder="e.g., 2 lbs per acre"
            />
          </StandardField>

          <StandardField label="Area Treated">
            <StandardInput
              value={formData.areaTreated || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, areaTreated: e.target.value }))
              }
              placeholder="e.g., 5 acres"
            />
          </StandardField>

          <StandardField label="Application Method">
            <StandardSelect
              value={formData.applicationMethod || ''}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setFormData((prev) => ({ ...prev, applicationMethod: e.target.value }))
              }>
              <option value="">Select method...</option>
              <option value="spray">Spray Application</option>
              <option value="granular">Granular Broadcast</option>
              <option value="injection">Soil Injection</option>
              <option value="drench">Soil Drench</option>
            </StandardSelect>
          </StandardField>
        </SimpleGrid>

        {/* NPK Percentage Fields (Phase 1.1 Validation) - Show only for fertilizers */}
        {subtype === 'fertilizer' && (
          <VStack
            spacing={4}
            align="stretch"
            p={4}
            bg="green.50"
            borderRadius="md"
            border="1px solid"
            borderColor="green.200"
            mt={4}>
            <Text fontSize="sm" fontWeight="bold" color="green.700">
              📊 NPK Percentage Breakdown (Optional - for precise calculations)
            </Text>
            <Text fontSize="xs" color="green.600">
              Enter individual NPK percentages if known. Total cannot exceed 100%.
            </Text>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <StandardField label="Nitrogen %" helpText="N percentage (0-100)">
                <NumberInput
                  value={formData.nitrogenPercentage || ''}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, nitrogenPercentage: value }))
                  }
                  min={0}
                  max={100}>
                  <NumberInputField placeholder="e.g., 16" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </StandardField>

              <StandardField label="Phosphorus %" helpText="P percentage (0-100)">
                <NumberInput
                  value={formData.phosphorusPercentage || ''}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, phosphorusPercentage: value }))
                  }
                  min={0}
                  max={100}>
                  <NumberInputField placeholder="e.g., 16" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </StandardField>

              <StandardField label="Potassium %" helpText="K percentage (0-100)">
                <NumberInput
                  value={formData.potassiumPercentage || ''}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, potassiumPercentage: value }))
                  }
                  min={0}
                  max={100}>
                  <NumberInputField placeholder="e.g., 16" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </StandardField>
            </SimpleGrid>

            {/* Real-time NPK total display */}
            <Box p={2} bg="white" borderRadius="md" borderColor="green.300" borderWidth="1px">
              <Text fontSize="xs" color="gray.600">
                Total NPK:{' '}
                {(
                  (parseFloat(formData.nitrogenPercentage as string) || 0) +
                  (parseFloat(formData.phosphorusPercentage as string) || 0) +
                  (parseFloat(formData.potassiumPercentage as string) || 0)
                ).toFixed(1)}
                %
                {(parseFloat(formData.nitrogenPercentage as string) || 0) +
                  (parseFloat(formData.phosphorusPercentage as string) || 0) +
                  (parseFloat(formData.potassiumPercentage as string) || 0) >
                  100 && (
                  <Text as="span" color="red.500" fontWeight="bold">
                    {' '}
                    - Exceeds 100%!
                  </Text>
                )}
              </Text>
            </Box>
          </VStack>
        )}
      </>
    );
  }

  // Equipment Fields
  if (eventType === 'equipment') {
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <StandardField label="Equipment Name">
          <StandardInput
            value={formData.equipmentName || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFormData((prev) => ({ ...prev, equipmentName: e.target.value }))
            }
            placeholder="e.g., John Deere 8320R"
          />
        </StandardField>

        {subtype === 'fuel_consumption' && (
          <>
            <StandardField label="Fuel Amount (Gallons)">
              <NumberInput
                value={formData.fuelAmount || ''}
                onChange={(value) => setFormData((prev) => ({ ...prev, fuelAmount: value }))}
                min={0}>
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </StandardField>

            <StandardField label="Fuel Type">
              <StandardSelect
                value={formData.fuelType || ''}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setFormData((prev) => ({ ...prev, fuelType: e.target.value }))
                }>
                <option value="">Select fuel type...</option>
                <option value="diesel">Diesel</option>
                <option value="gasoline">Gasoline</option>
                <option value="biodiesel">Biodiesel</option>
              </StandardSelect>
            </StandardField>
          </>
        )}

        <StandardField label="Hours Used">
          <NumberInput
            value={formData.hoursUsed || ''}
            onChange={(value) => setFormData((prev) => ({ ...prev, hoursUsed: value }))}
            min={0}>
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </StandardField>
      </SimpleGrid>
    );
  }

  // Production Fields
  if (eventType === 'production') {
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <StandardField label="Area">
          <StandardInput
            value={formData.area || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFormData((prev) => ({ ...prev, area: e.target.value }))
            }
            placeholder="e.g., 10 acres, Block A"
          />
        </StandardField>

        {subtype === 'harvesting' && (
          <StandardField label="Quantity Harvested">
            <StandardInput
              value={formData.quantityHarvested || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, quantityHarvested: e.target.value }))
              }
              placeholder="e.g., 2,500 lbs"
            />
          </StandardField>
        )}

        {subtype === 'irrigation' && (
          <StandardField label="Water Amount">
            <StandardInput
              value={formData.waterAmount || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, waterAmount: e.target.value }))
              }
              placeholder="e.g., 1,000 gallons"
            />
          </StandardField>
        )}
      </SimpleGrid>
    );
  }

  // Default: return basic observation field
  return (
    <StandardField label="Observation">
      <StandardTextarea
        value={formData.observation || ''}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
          setFormData((prev) => ({ ...prev, observation: e.target.value }))
        }
        placeholder="Record any specific observations about this event..."
      />
    </StandardField>
  );
};

export default StandardEventForm;
