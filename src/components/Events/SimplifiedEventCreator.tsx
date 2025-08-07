import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  Select,
  Textarea,
  FormControl,
  FormLabel,
  FormHelperText,
  Badge,
  Icon,
  Alert,
  AlertIcon,
  useToast,
  Progress,
  SimpleGrid,
  Tooltip,
  useColorModeValue,
  Flex,
  Divider,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  Heading,
  Card,
  CardBody,
  CardHeader
} from '@chakra-ui/react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, number, optional } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FaLeaf,
  FaCamera,
  FaMicrophone,
  FaLightbulb,
  FaChevronRight,
  FaChevronLeft,
  FaCheckCircle,
  FaTools,
  FaSeedling,
  FaBug,
  FaBusinessTime,
  FaTractor,
  FaInfoCircle,
  FaCloudRain,
  FaRocket
} from 'react-icons/fa';
import { SlChemistry } from 'react-icons/sl';
import { useIntl } from 'react-intl';

// Import existing components
import { StandardButton, StandardField } from 'components/Design/StandardComponents';
import { CarbonImpactPreview } from './CarbonImpactPreview';
import { VoiceEventCapture } from './VoiceEventCapture';
import { TrazoImageUpload } from 'components/Upload';
import { 
  useCreateEventMutation,
  useGetEventQuery,
  useUpdateEventMutation 
} from 'store/api/historyApi';
import { useCalculateEventCarbonImpactMutation } from 'store/api/carbonApi';

// Validation schema for the simplified form
const simplifiedEventSchema = object({
  event_type: string().min(1, 'Please select an event type'),
  date: string().min(1, 'Date is required'),
  description: string().min(5, 'Please provide at least 5 characters of description'),
  duration: optional(string()),
  area: optional(string()),
  amount: optional(string()),
  notes: optional(string())
});

interface SimplifiedEventCreatorProps {
  isEdit?: boolean;
  eventId?: string | null;
  onClose?: () => void;
  onEventCreated?: (event: any) => void;
}

// Simplified event types with agricultural focus
const AGRICULTURAL_EVENT_TYPES = [
  {
    id: 'fertilizer_application',
    name: 'Fertilizer Application',
    icon: FaSeedling,
    color: 'green',
    description: 'Nutrient application to support crop growth',
    category: 'Nutrition',
    template: {
      duration: '2-4 hours',
      typical_area: '1-5 hectares',
      common_amounts: ['50 kg/ha', '100 kg/ha', '150 kg/ha'],
      best_practices: 'Apply during cool morning hours for best uptake'
    }
  },
  {
    id: 'irrigation',
    name: 'Irrigation',
    icon: FaCloudRain,
    color: 'blue',
    description: 'Water application to crops',
    category: 'Water Management',
    template: {
      duration: '1-6 hours',
      typical_area: '1-10 hectares',
      common_amounts: ['25 mm', '50 mm', '75 mm'],
      best_practices: 'Early morning irrigation reduces evaporation losses'
    }
  },
  {
    id: 'pest_control',
    name: 'Pest Control',
    icon: FaBug,
    color: 'red',
    description: 'Pest management and protection',
    category: 'Crop Protection',
    template: {
      duration: '1-3 hours',
      typical_area: '1-5 hectares',
      common_amounts: ['2-5 L/ha', '0.5-1 kg/ha'],
      best_practices: 'Apply during calm weather conditions'
    }
  },
  {
    id: 'equipment_operation',
    name: 'Equipment Operation',
    icon: FaTractor,
    color: 'orange',
    description: 'Machinery and equipment usage',
    category: 'Operations',
    template: {
      duration: '2-8 hours',
      typical_area: '1-20 hectares',
      common_amounts: ['5-15 L/ha fuel'],
      best_practices: 'Regular maintenance ensures optimal fuel efficiency'
    }
  },
  {
    id: 'soil_management',
    name: 'Soil Management',
    icon: FaSeedling,
    color: 'brown',
    description: 'Soil preparation and amendments',
    category: 'Soil Health',
    template: {
      duration: '3-6 hours',
      typical_area: '1-10 hectares',
      common_amounts: ['1-3 tons/ha'],
      best_practices: 'Apply organic matter when soil moisture is optimal'
    }
  },
  {
    id: 'harvest',
    name: 'Harvest',
    icon: FaRocket,
    color: 'yellow',
    description: 'Crop harvesting activities',
    category: 'Production',
    template: {
      duration: '4-12 hours',
      typical_area: '2-20 hectares',
      common_amounts: ['Variable by crop'],
      best_practices: 'Harvest at optimal maturity for best quality'
    }
  }
];

export const SimplifiedEventCreator: React.FC<SimplifiedEventCreatorProps> = ({
  isEdit = false,
  eventId = null,
  onClose,
  onEventCreated
}) => {
  const intl = useIntl();
  const toast = useToast();
  const navigate = useNavigate();
  const { parcelId, establishmentId } = useParams();

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'white');
  const accentBg = useColorModeValue('green.50', 'green.900');

  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [carbonCalculation, setCarbonCalculation] = useState(null);
  const [isCalculatingCarbon, setIsCalculatingCarbon] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);

  // Redux state
  const currentCompany = useSelector((state: any) => state.company.currentCompany);

  // Form setup
  const methods = useForm({
    resolver: zodResolver(simplifiedEventSchema),
    defaultValues: {
      event_type: '',
      date: new Date().toISOString().slice(0, 16),
      description: '',
      duration: '',
      area: '',
      amount: '',
      notes: ''
    }
  });

  const { watch, setValue, getValues, trigger } = methods;
  const watchedEventType = watch('event_type');
  const watchedData = watch();

  // API mutations
  const [createEvent, { isLoading: isCreatingEvent }] = useCreateEventMutation();
  const [updateEvent, { isLoading: isUpdatingEvent }] = useUpdateEventMutation();
  const [calculateCarbonImpact, { isLoading: isCalculating }] = useCalculateEventCarbonImpactMutation();

  // Load existing event if editing
  const {
    data: existingEvent,
    isLoading: isLoadingEvent
  } = useGetEventQuery(
    {
      companyId: currentCompany?.id,
      establishmentId: parseInt(establishmentId || '0'),
      eventId: parseInt(eventId || '0')
    },
    {
      skip: !isEdit || !currentCompany?.id || !eventId
    }
  );

  // Get selected event type configuration
  const selectedEventConfig = useMemo(() => {
    return AGRICULTURAL_EVENT_TYPES.find(type => type.id === selectedEventType);
  }, [selectedEventType]);

  // Auto-fill template data when event type changes
  useEffect(() => {
    if (selectedEventConfig && !isEdit) {
      setValue('duration', selectedEventConfig.template.duration);
      setValue('area', selectedEventConfig.template.typical_area);
      
      // Set a smart default description
      const smartDescription = `${selectedEventConfig.name} - ${new Date().toLocaleDateString()}`;
      setValue('description', smartDescription);
    }
  }, [selectedEventConfig, setValue, isEdit]);

  // Calculate carbon impact when form data changes
  const debouncedCarbonCalculation = useCallback(
    debounce(async (formData: any) => {
      if (!formData.event_type || !formData.description) return;

      setIsCalculatingCarbon(true);
      try {
        const result = await calculateCarbonImpact({
          event_type: formData.event_type,
          description: formData.description,
          duration: formData.duration,
          area: formData.area,
          amount: formData.amount,
          parcel_id: parcelId,
          establishment_id: establishmentId
        }).unwrap();

        setCarbonCalculation(result);
      } catch (error) {
        console.error('Carbon calculation error:', error);
      } finally {
        setIsCalculatingCarbon(false);
      }
    }, 800),
    [calculateCarbonImpact, parcelId, establishmentId]
  );

  useEffect(() => {
    if (watchedEventType && watchedData.description) {
      debouncedCarbonCalculation(watchedData);
    }
  }, [watchedData, debouncedCarbonCalculation]);

  // Handle voice event detection
  const handleVoiceEventDetected = useCallback((voiceEventData: any) => {
    // Map voice data to form fields
    setValue('event_type', voiceEventData.type || 'equipment_operation');
    setValue('description', voiceEventData.description);
    setValue('date', voiceEventData.date || new Date().toISOString().slice(0, 16));
    
    if (voiceEventData.detected_amounts?.length > 0) {
      setValue('amount', voiceEventData.detected_amounts[0]);
    }
    
    // Move to step 2 automatically
    setCurrentStep(2);
    setIsVoiceMode(false);
    
    toast({
      title: 'Voice Event Captured! 🎤',
      description: 'Event details filled automatically. Review and submit.',
      status: 'success',
      duration: 3000
    });
  }, [setValue, toast]);

  // Handle form submission
  const handleSubmit = async (data: any) => {
    try {
      const eventData = {
        ...data,
        parcel: parseInt(parcelId || '0'),
        establishment: parseInt(establishmentId || '0'),
        company: currentCompany?.id,
        images: uploadedImages,
        carbon_impact: carbonCalculation?.co2e || 0,
        source: 'simplified_creator'
      };

      if (isEdit && eventId) {
        await updateEvent({ eventId: parseInt(eventId), eventData }).unwrap();
        toast({
          title: 'Event Updated! ✅',
          description: 'Your agricultural event has been successfully updated.',
          status: 'success',
          duration: 3000
        });
      } else {
        const result = await createEvent(eventData).unwrap();
        toast({
          title: 'Event Created! ✅',
          description: 'Your agricultural event has been successfully recorded.',
          status: 'success',
          duration: 3000
        });
        
        if (onEventCreated) {
          onEventCreated(result);
        }
      }

      // Reset form or close modal
      if (onClose) {
        onClose();
      } else {
        navigate(-1);
      }
    } catch (error) {
      console.error('Event submission error:', error);
      toast({
        title: 'Error Creating Event',
        description: 'Please check your information and try again.',
        status: 'error',
        duration: 5000
      });
    }
  };

  // Handle step navigation
  const goToNextStep = async () => {
    const isValid = await trigger(['event_type', 'date', 'description']);
    if (isValid) {
      setCurrentStep(2);
    }
  };

  const goToPreviousStep = () => {
    setCurrentStep(1);
  };

  // Step 1: Event Type Selection
  const renderStep1 = () => (
    <VStack spacing={6} align="stretch">
      {/* Voice Input Toggle */}
      <Card>
        <CardBody>
          <Flex justify="space-between" align="center">
            <HStack>
              <Icon as={FaMicrophone} color="blue.500" boxSize={5} />
              <VStack align="start" spacing={0}>
                <Text fontWeight="semibold">Voice Input</Text>
                <Text fontSize="sm" color="gray.500">
                  Speak your event details naturally
                </Text>
              </VStack>
            </HStack>
            <Switch
              isChecked={isVoiceMode}
              onChange={(e) => setIsVoiceMode(e.target.checked)}
              colorScheme="blue"
              size="lg"
            />
          </Flex>
        </CardBody>
      </Card>

      {/* Voice Capture Component */}
      {isVoiceMode && (
        <VoiceEventCapture
          isActive={isVoiceMode}
          cropType="Mixed Crops"
          onEventDetected={handleVoiceEventDetected}
          onClose={() => setIsVoiceMode(false)}
        />
      )}

      {/* Event Type Selection */}
      {!isVoiceMode && (
        <>
          <Box>
            <Heading size="md" mb={2} color={textColor}>
              What farming activity did you perform?
            </Heading>
            <Text fontSize="sm" color="gray.500" mb={4}>
              Select the type of agricultural event to record
            </Text>
          </Box>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {AGRICULTURAL_EVENT_TYPES.map((eventType) => (
              <Card
                key={eventType.id}
                cursor="pointer"
                borderWidth="2px"
                borderColor={selectedEventType === eventType.id ? `${eventType.color}.500` : borderColor}
                bg={selectedEventType === eventType.id ? `${eventType.color}.50` : bgColor}
                _hover={{
                  borderColor: `${eventType.color}.400`,
                  transform: 'translateY(-2px)',
                  shadow: 'lg'
                }}
                transition="all 0.2s"
                onClick={() => {
                  setSelectedEventType(eventType.id);
                  setValue('event_type', eventType.id);
                }}
              >
                <CardBody>
                  <VStack spacing={3}>
                    <Circle
                      size="50px"
                      bg={`${eventType.color}.100`}
                      color={`${eventType.color}.600`}
                    >
                      <Icon as={eventType.icon} boxSize={6} />
                    </Circle>
                    <VStack spacing={1}>
                      <Text fontWeight="bold" textAlign="center">
                        {eventType.name}
                      </Text>
                      <Badge colorScheme={eventType.color} size="sm">
                        {eventType.category}
                      </Badge>
                      <Text fontSize="xs" color="gray.500" textAlign="center">
                        {eventType.description}
                      </Text>
                    </VStack>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>

          {/* Date and Quick Description */}
          {selectedEventType && (
            <Card bg={accentBg}>
              <CardBody>
                <VStack spacing={4}>
                  <Heading size="sm" color="green.700">
                    Quick Event Details
                  </Heading>
                  
                  <StandardField
                    name="date"
                    label="When did this happen?"
                    type="datetime-local"
                    isRequired
                  />
                  
                  <StandardField
                    name="description"
                    label="Brief description"
                    placeholder={`${selectedEventConfig?.name} on ${new Date().toLocaleDateString()}`}
                    as="textarea"
                    isRequired
                  />

                  {/* Smart Suggestions */}
                  {selectedEventConfig && (
                    <Alert status="info" borderRadius="md">
                      <AlertIcon />
                      <VStack align="start" spacing={1}>
                        <Text fontSize="sm" fontWeight="semibold">
                          💡 Best Practice Tip:
                        </Text>
                        <Text fontSize="sm">
                          {selectedEventConfig.template.best_practices}
                        </Text>
                      </VStack>
                    </Alert>
                  )}
                </VStack>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </VStack>
  );

  // Step 2: Details and Confirmation
  const renderStep2 = () => (
    <VStack spacing={6} align="stretch">
      {/* Event Summary */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={selectedEventConfig?.icon || FaLeaf} color={`${selectedEventConfig?.color || 'green'}.500`} boxSize={5} />
            <VStack align="start" spacing={0}>
              <Text fontWeight="bold">{selectedEventConfig?.name}</Text>
              <Text fontSize="sm" color="gray.500">
                {new Date(watchedData.date).toLocaleDateString()}
              </Text>
            </VStack>
          </HStack>
        </CardHeader>
        <CardBody>
          <Text fontSize="sm">{watchedData.description}</Text>
        </CardBody>
      </Card>

      {/* Carbon Impact Preview */}
      <CarbonImpactPreview
        eventType={selectedEventType}
        formData={watchedData}
        calculation={carbonCalculation}
        isCalculating={isCalculatingCarbon}
      />

      {/* Optional Details */}
      <Card>
        <CardHeader>
          <HStack justify="space-between">
            <Text fontWeight="semibold">Additional Details (Optional)</Text>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            >
              {showAdvancedOptions ? 'Hide' : 'Show'} Options
            </Button>
          </HStack>
        </CardHeader>
        
        {showAdvancedOptions && (
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <StandardField
                name="duration"
                label="Duration"
                placeholder={selectedEventConfig?.template.duration}
              />
              
              <StandardField
                name="area"
                label="Area Covered"
                placeholder={selectedEventConfig?.template.typical_area}
              />
              
              <StandardField
                name="amount"
                label="Amount/Quantity"
                placeholder={selectedEventConfig?.template.common_amounts[0]}
              />
              
              <StandardField
                name="notes"
                label="Additional Notes"
                placeholder="Any observations or special conditions..."
              />
            </SimpleGrid>
          </CardBody>
        )}
      </Card>

      {/* Photo Upload */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FaCamera} color="blue.500" boxSize={4} />
            <Text fontWeight="semibold">Photos (Optional)</Text>
          </HStack>
        </CardHeader>
        <CardBody>
          <TrazoImageUpload
            onFilesSelected={setUploadedImages}
            maxFiles={3}
            acceptedTypes={['image/jpeg', 'image/png']}
            maxSize={5 * 1024 * 1024} // 5MB
          />
        </CardBody>
      </Card>
    </VStack>
  );

  return (
    <FormProvider {...methods}>
      <Box p={6} bg={bgColor} minH="100vh">
        <VStack spacing={8} maxW="4xl" mx="auto">
          {/* Header */}
          <VStack spacing={2} textAlign="center">
            <Badge colorScheme="green" px={4} py={2} borderRadius="full">
              <HStack spacing={2}>
                <Icon as={FaLeaf} boxSize={4} />
                <Text>Simplified Event Creator</Text>
              </HStack>
            </Badge>
            <Heading size="lg" color={textColor}>
              {isEdit ? 'Update Agricultural Event' : 'Record Your Farming Activity'}
            </Heading>
            <Text color="gray.500">
              Quick 2-step process designed for field conditions
            </Text>
          </VStack>

          {/* Progress Indicator */}
          <Box w="full" maxW="md">
            <HStack justify="space-between" mb={2}>
              <Text fontSize="sm" color={currentStep >= 1 ? 'green.500' : 'gray.400'}>
                1. Select Activity
              </Text>
              <Text fontSize="sm" color={currentStep >= 2 ? 'green.500' : 'gray.400'}>
                2. Confirm Details
              </Text>
            </HStack>
            <Progress 
              value={(currentStep / 2) * 100} 
              colorScheme="green" 
              size="lg" 
              borderRadius="full" 
            />
          </Box>

          {/* Main Content */}
          <Box w="full">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
          </Box>

          {/* Navigation Buttons */}
          <HStack spacing={4} w="full" justify="space-between">
            <Box>
              {currentStep > 1 && (
                <Button
                  leftIcon={<FaChevronLeft />}
                  variant="outline"
                  onClick={goToPreviousStep}
                >
                  Back
                </Button>
              )}
            </Box>

            <HStack spacing={3}>
              {onClose && (
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
              )}
              
              {currentStep === 1 ? (
                <StandardButton
                  rightIcon={<FaChevronRight />}
                  onClick={goToNextStep}
                  isDisabled={!selectedEventType}
                  size="lg"
                >
                  Continue
                </StandardButton>
              ) : (
                <StandardButton
                  leftIcon={<FaCheckCircle />}
                  onClick={methods.handleSubmit(handleSubmit)}
                  isLoading={isCreatingEvent || isUpdatingEvent}
                  loadingText={isEdit ? 'Updating...' : 'Creating...'}
                  size="lg"
                >
                  {isEdit ? 'Update Event' : 'Create Event'}
                </StandardButton>
              )}
            </HStack>
          </HStack>
        </VStack>
      </Box>
    </FormProvider>
  );
};

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default SimplifiedEventCreator;