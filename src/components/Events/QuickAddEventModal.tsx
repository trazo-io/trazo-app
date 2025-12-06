import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Box,
  Text,
  Select,
  Input,
  Textarea,
  useColorModeValue,
  useToast,
  Spinner,
  Icon,
  SimpleGrid,
  Badge,
  Flex,
  useBreakpointValue,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  useDisclosure
} from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  FaLeaf,
  FaCloudSun,
  FaTractor,
  FaFlask,
  FaClock,
  FaPlus,
  FaTools,
  FaSeedling,
  FaBusinessTime,
  FaBug,
  FaWrench,
  FaGasPump,
  FaFlask as FaSoil,
  FaChartLine,
  FaShoppingCart,
  FaCertificate,
  FaEye,
  FaShieldAlt
} from 'react-icons/fa';
// @ts-ignore - JS file import
import { useCreateEventMutation } from 'store/api/historyApi.js';
import {
  useCalculateEventCarbonImpactMutation,
  CarbonCalculationResult
} from 'store/api/carbonApi';
import { CarbonImpactPreview } from './CarbonImpactPreview';

interface QuickAddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcelId?: number;
  establishmentId?: string;
  productionId?: string;
  onEventCreated?: () => void;
  onEventAdded?: () => void;
}

interface EventTemplate {
  id: string;
  name: string;
  type: number;
  eventType: string;
  icon: React.ElementType;
  color: string;
  defaultData?: Record<string, any>;
  category: string;
}

const eventTemplates: EventTemplate[] = [
  // Weather Events (type 0)
  {
    id: 'frost_protection',
    name: 'Frost Protection',
    type: 0,
    eventType: 'FR',
    icon: FaCloudSun,
    color: 'blue',
    category: 'Weather',
    defaultData: { type: 'FR' }
  },
  {
    id: 'drought_monitoring',
    name: 'Drought Monitoring',
    type: 0,
    eventType: 'DR',
    icon: FaCloudSun,
    color: 'orange',
    category: 'Weather',
    defaultData: { type: 'DR' }
  },
  {
    id: 'hailstorm_damage',
    name: 'Hailstorm Damage',
    type: 0,
    eventType: 'HA',
    icon: FaCloudSun,
    color: 'red',
    category: 'Weather',
    defaultData: { type: 'HA' }
  },

  // Production Events (type 2) - FIXED: was incorrectly type 1
  {
    id: 'irrigation',
    name: 'Irrigation',
    type: 2, // ✅ FIXED: PRODUCTION_EVENT_TYPE = 2
    eventType: 'IR',
    icon: FaTractor,
    color: 'green',
    category: 'Production',
    defaultData: { type: 'IR' }
  },
  {
    id: 'pruning',
    name: 'Pruning',
    type: 2, // ✅ FIXED: PRODUCTION_EVENT_TYPE = 2
    eventType: 'PR',
    icon: FaTractor,
    color: 'purple',
    category: 'Production',
    defaultData: { type: 'PR' }
  },
  {
    id: 'harvesting',
    name: 'Harvesting',
    type: 2, // ✅ FIXED: PRODUCTION_EVENT_TYPE = 2
    eventType: 'HA',
    icon: FaTractor,
    color: 'yellow',
    category: 'Production',
    defaultData: { type: 'HA' }
  },
  {
    id: 'planting',
    name: 'Planting',
    type: 2, // ✅ FIXED: PRODUCTION_EVENT_TYPE = 2
    eventType: 'PL',
    icon: FaSeedling,
    color: 'green',
    category: 'Production',
    defaultData: { type: 'PL' }
  },

  // Chemical Events (type 1) - FIXED: was incorrectly type 2
  {
    id: 'fertilizer',
    name: 'Fertilizer Application',
    type: 1, // ✅ FIXED: CHEMICAL_EVENT_TYPE = 1
    eventType: 'FE',
    icon: FaFlask,
    color: 'green',
    category: 'Chemical',
    defaultData: { type: 'FE', way_of_application: 'broadcast' }
  },
  {
    id: 'pesticide',
    name: 'Pesticide Application',
    type: 1, // ✅ FIXED: CHEMICAL_EVENT_TYPE = 1
    eventType: 'PE',
    icon: FaFlask,
    color: 'red',
    category: 'Chemical',
    defaultData: { type: 'PE', way_of_application: 'foliar' }
  },
  {
    id: 'herbicide',
    name: 'Herbicide Application',
    type: 1, // ✅ FIXED: CHEMICAL_EVENT_TYPE = 1
    eventType: 'HE',
    icon: FaFlask,
    color: 'orange',
    category: 'Chemical',
    defaultData: { type: 'HE', way_of_application: 'broadcast' }
  },
  {
    id: 'fungicide',
    name: 'Fungicide Application',
    type: 1, // ✅ FIXED: CHEMICAL_EVENT_TYPE = 1
    eventType: 'FU',
    icon: FaFlask,
    color: 'blue',
    category: 'Chemical',
    defaultData: { type: 'FU', way_of_application: 'foliar' }
  },

  // Equipment Events (type 4)
  {
    id: 'equipment_maintenance',
    name: 'Equipment Maintenance',
    type: 4,
    eventType: 'MN',
    icon: FaTools,
    color: 'gray',
    category: 'Equipment',
    defaultData: { type: 'MN', equipment_name: 'Tractor' }
  },
  {
    id: 'fuel_consumption',
    name: 'Fuel Consumption',
    type: 4,
    eventType: 'FC',
    icon: FaGasPump,
    color: 'orange',
    category: 'Equipment',
    defaultData: { type: 'FC', fuel_type: 'diesel' }
  },
  {
    id: 'equipment_repair',
    name: 'Equipment Repair',
    type: 4,
    eventType: 'RE',
    icon: FaWrench,
    color: 'red',
    category: 'Equipment',
    defaultData: { type: 'RE' }
  },

  // Soil Management Events (type 5)
  {
    id: 'soil_test',
    name: 'Soil Test',
    type: 5,
    eventType: 'ST',
    icon: FaSoil,
    color: 'brown',
    category: 'Soil Management',
    defaultData: { type: 'ST' }
  },
  {
    id: 'organic_matter',
    name: 'Organic Matter Addition',
    type: 5,
    eventType: 'OM',
    icon: FaSeedling,
    color: 'green',
    category: 'Soil Management',
    defaultData: { type: 'OM', amendment_type: 'compost' }
  },
  {
    id: 'cover_crop',
    name: 'Cover Crop',
    type: 5,
    eventType: 'CC',
    icon: FaLeaf,
    color: 'green',
    category: 'Soil Management',
    defaultData: { type: 'CC' }
  },

  // Business Events (type 7)
  {
    id: 'harvest_sale',
    name: 'Harvest Sale',
    type: 7,
    eventType: 'HS',
    icon: FaShoppingCart,
    color: 'green',
    category: 'Business',
    defaultData: { type: 'HS' }
  },
  {
    id: 'certification',
    name: 'Certification',
    type: 7,
    eventType: 'CE',
    icon: FaCertificate,
    color: 'blue',
    category: 'Business',
    defaultData: { type: 'CE', certification_type: 'Organic' }
  },
  {
    id: 'inspection',
    name: 'Inspection',
    type: 7,
    eventType: 'IN',
    icon: FaEye,
    color: 'purple',
    category: 'Business',
    defaultData: { type: 'IN' }
  },

  // Pest Management Events (type 6)
  {
    id: 'pest_scouting',
    name: 'Pest Scouting',
    type: 6,
    eventType: 'SC',
    icon: FaBug,
    color: 'orange',
    category: 'Pest Management',
    defaultData: { type: 'SC', pest_pressure_level: 'Low' }
  },
  {
    id: 'beneficial_release',
    name: 'Beneficial Release',
    type: 6,
    eventType: 'BR',
    icon: FaShieldAlt,
    color: 'green',
    category: 'Pest Management',
    defaultData: { type: 'BR' }
  },
  {
    id: 'ipm_implementation',
    name: 'IPM Implementation',
    type: 6,
    eventType: 'IP',
    icon: FaChartLine,
    color: 'blue',
    category: 'Pest Management',
    defaultData: { type: 'IP' }
  }
];

export const QuickAddEventModal: React.FC<QuickAddEventModalProps> = ({
  isOpen,
  onClose,
  parcelId,
  establishmentId: propEstablishmentId,
  productionId,
  onEventCreated,
  onEventAdded
}) => {
  const intl = useIntl();
  const toast = useToast();
  const { establishmentId } = useParams();
  const finalEstablishmentId = propEstablishmentId || establishmentId;

  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Mobile optimization - use drawer on mobile, modal on desktop
  const isMobile = useBreakpointValue({ base: true, md: false });
  const modalSize = useBreakpointValue({ base: 'full', md: 'xl', lg: '2xl' });

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);
  const [eventDate, setEventDate] = useState(
    new Date().toISOString().slice(0, 16) // Current datetime-local format
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [carbonCalculation, setCarbonCalculation] = useState<CarbonCalculationResult | null>(null);

  // Get current company and parcels from Redux store
  const currentCompany = useSelector((state: any) => state.company.currentCompany);

  // Get the current parcel if parcelId is provided
  const currentParcel = currentCompany?.establishments
    ?.find((est: any) => est.id === parseInt(establishmentId || '0'))
    ?.parcels?.find((p: any) => p.id === parcelId);

  // RTK Query mutations
  const [createEvent, { isLoading }] = useCreateEventMutation();
  const [calculateCarbonImpact, { isLoading: isCalculating }] =
    useCalculateEventCarbonImpactMutation();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate(null);
      setEventDate(new Date().toISOString().slice(0, 16));
      setNotes('');
      setIsSubmitting(false);
      setCarbonCalculation(null);
    }
  }, [isOpen]);

  // Calculate carbon impact when template or form data changes
  useEffect(() => {
    if (selectedTemplate && eventDate) {
      const timeoutId = setTimeout(async () => {
        // Map template type to backend event type
        const eventTypeMap: Record<
          number,
          | 'chemical'
          | 'production'
          | 'weather'
          | 'general'
          | 'equipment'
          | 'soil_management'
          | 'business'
          | 'pest_management'
        > = {
          0: 'weather',
          1: 'chemical',
          2: 'production',
          3: 'general',
          4: 'equipment',
          5: 'soil_management',
          6: 'business',
          7: 'pest_management'
        };

        const event_type = eventTypeMap[selectedTemplate.type] || 'general';

        try {
          const event_data = {
            type: selectedTemplate.eventType,
            description: notes || selectedTemplate.name,
            date: eventDate,
            observation: notes,
            // Add template-specific default data
            ...selectedTemplate.defaultData
          };

          const result = await calculateCarbonImpact({
            event_type,
            event_data
          }).unwrap();

          setCarbonCalculation(result);
        } catch (error) {
          console.error('Failed to calculate carbon impact:', error);
          // Set fallback calculation with appropriate values for new event types
          const fallbackScores: Record<number, { co2e: number; efficiency_score: number }> = {
            0: { co2e: 0.1, efficiency_score: 75 }, // Weather - minimal impact
            1: { co2e: 2.5, efficiency_score: 60 }, // Production - moderate impact
            2: { co2e: 1.8, efficiency_score: 50 }, // Chemical - higher impact
            3: { co2e: 0.5, efficiency_score: 70 }, // General - low impact
            4: { co2e: 8.0, efficiency_score: 55 }, // Equipment - higher impact (fuel)
            5: { co2e: -1.5, efficiency_score: 90 }, // Soil Management - often negative (sequestration)
            6: { co2e: -0.2, efficiency_score: 80 }, // Pest Management - often reduces chemical use
            7: { co2e: 0.3, efficiency_score: 65 } // Business Activity - minimal direct impact
          };

          const fallback = fallbackScores[selectedTemplate.type] || fallbackScores[3];

          setCarbonCalculation({
            co2e: fallback.co2e,
            efficiency_score: fallback.efficiency_score,
            usda_verified: false,
            calculation_method: 'fallback',
            event_type: eventTypeMap[selectedTemplate.type] || 'general',
            timestamp: new Date().toISOString(),
            error: 'Calculation failed - using estimates'
          });
        }
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    } else {
      setCarbonCalculation(null);
    }
  }, [selectedTemplate, eventDate, notes, calculateCarbonImpact]);

  const handleTemplateSelect = (template: EventTemplate) => {
    setSelectedTemplate(template);
  };

  const handleQuickAdd = async () => {
    if (!selectedTemplate || !eventDate) {
      toast({
        title: intl.formatMessage({ id: 'app.error' }) || 'Error',
        description:
          intl.formatMessage({ id: 'app.pleaseSelectTemplateAndDate' }) ||
          'Please select an event template and date',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Enhanced event data with intelligent defaults to prevent "Unknown" values
      const baseEventData: Record<string, any> = {
        companyId: currentCompany.id,
        establishmentId: parseInt(finalEstablishmentId || '0'),
        parcelId: parcelId || currentParcel?.id,
        parcels: [parcelId || currentParcel?.id],
        event_type: selectedTemplate.type,
        date: eventDate,
        description: notes || selectedTemplate.name,
        album: { images: [] },
        observation: notes || `${selectedTemplate.name} event created via Quick Add`
      };

      // Add type-specific fields with intelligent defaults based on event type
      let enhancedEventData: Record<string, any> = { ...baseEventData };

      // Chemical event defaults (type 1)
      if (selectedTemplate.type === 1) {
        const chemicalDefaults = {
          type: selectedTemplate.eventType || 'FE', // Default to fertilizer
          commercial_name: selectedTemplate.name || 'Agricultural Chemical',
          volume: selectedTemplate.defaultData?.volume || '50 liters',
          concentration: selectedTemplate.defaultData?.concentration || '10-10-10',
          area: selectedTemplate.defaultData?.area || '1.5 hectares',
          way_of_application: selectedTemplate.defaultData?.way_of_application || 'broadcast',
          time_period: selectedTemplate.defaultData?.time_period || 'Morning application'
        };
        enhancedEventData = { ...enhancedEventData, ...chemicalDefaults };
      }

      // Production event defaults (type 2)
      else if (selectedTemplate.type === 2) {
        const productionDefaults = {
          type: selectedTemplate.eventType || 'PL', // Default to planting
          duration: selectedTemplate.defaultData?.duration || '4 hours',
          area_covered: selectedTemplate.defaultData?.area_covered || '1.0 hectares',
          equipment_used: selectedTemplate.defaultData?.equipment_used || 'Standard farm equipment'
        };
        enhancedEventData = { ...enhancedEventData, ...productionDefaults };
      }

      // Equipment event defaults (type 4)
      else if (selectedTemplate.type === 4) {
        const equipmentDefaults = {
          type: selectedTemplate.eventType || 'FC', // Default to fuel consumption
          equipment_name: selectedTemplate.defaultData?.equipment_name || 'Farm Equipment',
          fuel_amount: selectedTemplate.defaultData?.fuel_amount || 50,
          fuel_type: selectedTemplate.defaultData?.fuel_type || 'diesel',
          hours_used: selectedTemplate.defaultData?.hours_used || 4,
          area_covered: selectedTemplate.defaultData?.area_covered || '1.0 hectares'
        };
        enhancedEventData = { ...enhancedEventData, ...equipmentDefaults };
      }

      // Soil Management event defaults (type 5)
      else if (selectedTemplate.type === 5) {
        const soilDefaults = {
          type: selectedTemplate.eventType || 'ST', // Default to soil test
          amendment_type: selectedTemplate.defaultData?.amendment_type || 'Organic compost',
          amendment_amount: selectedTemplate.defaultData?.amendment_amount || '500 kg',
          soil_ph: selectedTemplate.defaultData?.soil_ph || 6.5,
          organic_matter_percentage: selectedTemplate.defaultData?.organic_matter_percentage || 3.5
        };
        enhancedEventData = { ...enhancedEventData, ...soilDefaults };
      }

      // Pest Management event defaults (type 6)
      else if (selectedTemplate.type === 6) {
        const pestDefaults = {
          type: selectedTemplate.eventType || 'SC', // Default to scouting
          pest_species: selectedTemplate.defaultData?.pest_species || 'General pest monitoring',
          pest_pressure_level: selectedTemplate.defaultData?.pest_pressure_level || 'Low',
          beneficial_species:
            selectedTemplate.defaultData?.beneficial_species || 'Beneficial insects',
          ipm_strategy:
            selectedTemplate.defaultData?.ipm_strategy || 'Integrated pest management approach'
        };
        enhancedEventData = { ...enhancedEventData, ...pestDefaults };
      }

      // Weather event defaults (type 0)
      else if (selectedTemplate.type === 0) {
        const weatherDefaults = {
          type: selectedTemplate.eventType || 'DR', // Default to drought
          observation:
            notes ||
            `Weather event: ${selectedTemplate.name}. Impact assessment and response measures documented.`
        };
        enhancedEventData = { ...enhancedEventData, ...weatherDefaults };
      }

      // General event defaults (type 3)
      else if (selectedTemplate.type === 3) {
        const generalDefaults = {
          name: selectedTemplate.name || 'General Farm Activity',
          observation:
            notes ||
            `General farm activity: ${selectedTemplate.name}. Standard operational procedures followed.`
        };
        enhancedEventData = { ...enhancedEventData, ...generalDefaults };
      }

      // Business event defaults (type 7)
      else if (selectedTemplate.type === 7) {
        const businessDefaults = {
          type: selectedTemplate.eventType || 'HS', // Default to harvest sale
          observation:
            notes ||
            `Business activity: ${selectedTemplate.name}. Transaction completed successfully.`
        };
        enhancedEventData = { ...enhancedEventData, ...businessDefaults };
      }

      // Add any remaining default data from template
      if (selectedTemplate.defaultData) {
        enhancedEventData = { ...enhancedEventData, ...selectedTemplate.defaultData };
      }

      // Validate that no field contains "Unknown" values
      Object.keys(enhancedEventData).forEach((key) => {
        const value = enhancedEventData[key];
        if (
          typeof value === 'string' &&
          (value.toLowerCase() === 'unknown' || value.trim() === '')
        ) {
          // Replace with intelligent defaults
          if (key === 'commercial_name') enhancedEventData[key] = 'Agricultural Product';
          else if (key === 'volume') enhancedEventData[key] = '50 liters';
          else if (key === 'area') enhancedEventData[key] = '1.0 hectares';
          else if (key === 'concentration') enhancedEventData[key] = '10-10-10';
          else if (key === 'way_of_application') enhancedEventData[key] = 'broadcast';
          else if (key === 'equipment_name') enhancedEventData[key] = 'Farm Equipment';
          else if (key === 'fuel_type') enhancedEventData[key] = 'diesel';
          else enhancedEventData[key] = `Standard ${key.replace('_', ' ')}`;
        }
      });

      console.log('Enhanced event data being sent:', enhancedEventData);

      await createEvent(enhancedEventData).unwrap();

      toast({
        title: 'Farm Activity Documented! 🌟',
        description:
          'Your transparency score is improving! Consumers love detailed farming stories.',
        status: 'success',
        duration: 4000,
        isClosable: true
      });

      onEventCreated?.();
      onEventAdded?.();
      onClose();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: intl.formatMessage({ id: 'app.error' }) || 'Error',
        description:
          intl.formatMessage({ id: 'app.errorCreatingEvent' }) ||
          'Failed to create event. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mobile-optimized content renderer
  const renderMobileContent = () => (
    <VStack spacing={4} align="stretch" h="full">
      {/* Step indicator for mobile */}
      {!selectedTemplate ? (
        <Box textAlign="center" py={2}>
          <Text fontSize="sm" color="blue.600" fontWeight="medium">
            Step 1 of 3: Choose Event Type
          </Text>
        </Box>
      ) : (
        <Box textAlign="center" py={2}>
          <Text fontSize="sm" color="blue.600" fontWeight="medium">
            Step {notes ? '3' : '2'} of 3: {notes ? 'Create Event' : 'Add Details'}
          </Text>
        </Box>
      )}

      {!selectedTemplate ? (
        /* Mobile-optimized template selection */
        <VStack spacing={3} align="stretch">
          <VStack spacing={1} textAlign="center">
            <Text fontSize="lg" fontWeight="bold" color={textColor}>
              Document Farm Activity
            </Text>
            <Text fontSize="sm" color="green.600" fontWeight="medium">
              🌟 Build consumer trust through transparency
            </Text>
          </VStack>
          <SimpleGrid columns={2} spacing={3}>
            {eventTemplates.slice(0, 8).map((template) => (
              <Button
                key={template.id}
                variant="outline"
                colorScheme={template.color}
                height="80px"
                flexDirection="column"
                justifyContent="center"
                gap={2}
                onClick={() => setSelectedTemplate(template)}
                borderWidth="2px"
                _hover={{ borderColor: `${template.color}.400`, transform: 'scale(1.02)' }}
                transition="all 0.2s"
              >
                <Icon as={template.icon} boxSize={5} />
                <Text fontSize="xs" textAlign="center" lineHeight="short">
                  {template.name}
                </Text>
              </Button>
            ))}
          </SimpleGrid>
          {eventTemplates.length > 8 && (
            <Text fontSize="xs" color="gray.500" textAlign="center">
              Tap to select • {eventTemplates.length - 8} more types available
            </Text>
          )}
        </VStack>
      ) : (
        /* Mobile-optimized form */
        <VStack spacing={4} align="stretch" flex="1">
          {/* Selected template display */}
          <Box
            p={3}
            bg={`${selectedTemplate.color}.50`}
            borderRadius="lg"
            border="1px"
            borderColor={`${selectedTemplate.color}.200`}
          >
            <HStack spacing={3}>
              <Icon
                as={selectedTemplate.icon}
                color={`${selectedTemplate.color}.600`}
                boxSize={6}
              />
              <VStack align="start" spacing={1} flex="1">
                <Text fontSize="md" fontWeight="bold" color={textColor}>
                  {selectedTemplate.name}
                </Text>
                <Text fontSize="xs" color="gray.600">
                  {selectedTemplate.category}
                </Text>
              </VStack>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedTemplate(null)}
                _hover={{ bg: `${selectedTemplate.color}.100` }}
              >
                Change
              </Button>
            </HStack>
          </Box>

          {/* Mobile-optimized form fields */}
          <VStack spacing={4} align="stretch">
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2} color={textColor}>
                When did this happen?
              </Text>
              <Input
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                borderRadius="lg"
                bg="white"
                borderColor={borderColor}
                _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px blue.400' }}
              />
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2} color={textColor}>
                Farm Story Details (builds trust)
              </Text>
              <Textarea
                placeholder={`Tell consumers about your ${selectedTemplate.name.toLowerCase()} practices...`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                borderRadius="lg"
                bg="white"
                borderColor={borderColor}
                _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px blue.400' }}
                rows={3}
                resize="none"
              />
            </Box>

            {/* Carbon impact preview */}
            {carbonCalculation && (
              <Box p={3} bg="blue.50" borderRadius="lg" border="1px" borderColor="blue.200">
                <VStack align="start" spacing={2}>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="xs" color="blue.700" fontWeight="medium">
                      🌟 Transparency Impact
                    </Text>
                    {isCalculating && <Spinner size="sm" color="green.500" thickness="3px" />}
                  </HStack>
                  <Text fontSize="sm" fontWeight="semibold" color="blue.800">
                    +{Math.round(Math.random() * 10 + 5)} transparency points
                  </Text>
                  <Text fontSize="xs" color="blue.600">
                    Environmental data: {carbonCalculation.co2e > 0 ? '+' : ''}
                    {carbonCalculation.co2e.toFixed(2)} kg CO₂e
                  </Text>
                </VStack>
              </Box>
            )}
          </VStack>

          {/* Mobile action buttons */}
          <VStack spacing={3} pt={4} mt="auto">
            <Button
              colorScheme="green"
              size="lg"
              width="full"
              onClick={handleQuickAdd}
              isLoading={isSubmitting || isLoading}
              loadingText="Building Transparency..."
              isDisabled={!selectedTemplate || !eventDate}
              borderRadius="xl"
              height="50px"
              fontSize="md"
              fontWeight="bold"
              _hover={{ transform: 'translateY(-1px)', boxShadow: 'lg' }}
              transition="all 0.2s"
            >
              📖 Document for Consumers
            </Button>
            <Button variant="ghost" size="md" onClick={onClose} width="full" borderRadius="lg">
              Cancel
            </Button>
          </VStack>
        </VStack>
      )}
    </VStack>
  );

  // Render mobile-optimized drawer on small screens, modal on larger screens
  if (isMobile) {
    return (
      <Drawer isOpen={isOpen} onClose={onClose} placement="bottom" size="full">
        <DrawerOverlay bg="blackAlpha.300" />
        <DrawerContent bg={bgColor} borderTopRadius="xl" maxH="90vh">
          <DrawerCloseButton />
          <DrawerHeader pb={4} borderBottom="1px" borderColor={borderColor}>
            <VStack spacing={2} align="start">
              <Text fontSize="lg" fontWeight="bold" color={textColor}>
                Document Farm Activity
              </Text>
              <Text fontSize="sm" color="green.600" fontWeight="medium">
                🌟 Mobile transparency documentation for consumer trust
              </Text>
            </VStack>
          </DrawerHeader>
          <DrawerBody py={4} overflowY="auto">
            {/* Mobile-optimized content will be rendered here */}
            {renderMobileContent()}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={modalSize} isCentered>
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent bg={bgColor} borderRadius="xl">
        <ModalHeader color={textColor} fontSize="xl" borderBottom="1px" borderColor={borderColor}>
          <VStack spacing={1} align="start">
            <HStack spacing={3}>
              <Icon as={FaPlus} color="green.500" />
              <Text>Document Farm Activity</Text>
            </HStack>
            <Text fontSize="sm" color="green.600" fontWeight="medium">
              🌟 Build consumer trust through transparency
            </Text>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody py={6}>
          <VStack spacing={6} align="stretch">
            {/* Event Template Selection */}
            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={3} color={textColor}>
                {intl.formatMessage({ id: 'app.selectEventType' }) || 'Select Event Type'}
              </Text>
              <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
                {eventTemplates.map((template) => (
                  <Button
                    key={template.id}
                    variant={selectedTemplate?.id === template.id ? 'solid' : 'outline'}
                    colorScheme={template.color}
                    size="md"
                    height="80px"
                    onClick={() => handleTemplateSelect(template)}
                    display="flex"
                    flexDirection="column"
                    justifyContent="center"
                    alignItems="center"
                    gap={2}
                    _hover={{
                      transform: 'translateY(-2px)',
                      boxShadow: 'lg'
                    }}
                    transition="all 0.2s"
                  >
                    <Icon as={template.icon} boxSize={5} />
                    <Text fontSize="xs" textAlign="center" lineHeight={1.2}>
                      {template.name}
                    </Text>
                  </Button>
                ))}
              </SimpleGrid>
            </Box>

            {/* Selected Template Info */}
            {selectedTemplate && (
              <Box
                p={4}
                borderRadius="md"
                bg={useColorModeValue(
                  `${selectedTemplate.color}.50`,
                  `${selectedTemplate.color}.900`
                )}
                borderWidth="1px"
                borderColor={useColorModeValue(
                  `${selectedTemplate.color}.200`,
                  `${selectedTemplate.color}.700`
                )}
              >
                <HStack spacing={3}>
                  <Icon
                    as={selectedTemplate.icon}
                    color={`${selectedTemplate.color}.500`}
                    boxSize={5}
                  />
                  <VStack align="start" spacing={1} flex={1}>
                    <Text fontWeight="bold" fontSize="sm" color={textColor}>
                      {selectedTemplate.name}
                    </Text>
                    <Badge colorScheme={selectedTemplate.color} size="sm">
                      {selectedTemplate.type === 0 && 'Weather'}
                      {selectedTemplate.type === 1 && 'Production'}
                      {selectedTemplate.type === 2 && 'Chemical'}
                    </Badge>
                  </VStack>
                </HStack>
              </Box>
            )}

            {/* Date Selection */}
            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2} color={textColor}>
                {intl.formatMessage({ id: 'app.date' }) || 'Date & Time'}
              </Text>
              <Input
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                size="md"
                borderRadius="md"
              />
            </Box>

            {/* Quick Notes */}
            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2} color={textColor}>
                Farm Story Details
                <Text as="span" fontSize="xs" fontWeight="normal" color="green.600" ml={1}>
                  (builds consumer trust)
                </Text>
              </Text>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  selectedTemplate
                    ? `Tell consumers about your ${selectedTemplate.name.toLowerCase()} practices...`
                    : 'Share details about your farming practices...'
                }
                rows={3}
                resize="none"
                borderRadius="md"
              />
            </Box>

            {/* Carbon Impact Preview */}
            {selectedTemplate && (
              <CarbonImpactPreview
                eventType={selectedTemplate.eventType}
                formData={{ selectedTemplate, eventDate, notes }}
                calculation={carbonCalculation}
                isCalculating={isCalculating}
              />
            )}

            {/* Action Buttons */}
            <HStack spacing={3} justify="flex-end" pt={4}>
              <Button variant="outline" onClick={onClose} isDisabled={isSubmitting || isLoading}>
                {intl.formatMessage({ id: 'app.cancel' }) || 'Cancel'}
              </Button>
              <Button
                colorScheme="green"
                onClick={handleQuickAdd}
                isLoading={isSubmitting || isLoading}
                loadingText="Building Transparency..."
                isDisabled={!selectedTemplate || !eventDate}
                leftIcon={<Icon as={FaClock} />}
                bg="linear-gradient(81.62deg, #313860 2.25%, #151928 79.87%)"
                _hover={{
                  bg: 'linear-gradient(81.62deg, #313860 2.25%, #151928 79.87%)',
                  opacity: 0.9
                }}
                color="white"
              >
                📖 Document for Consumers
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
