import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Button,
  Divider,
  Box,
  SimpleGrid,
  useColorModeValue,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Tooltip,
  Progress,
  Flex,
  Image,
  useBreakpointValue,
  Grid,
  AspectRatio,
  Center,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import {
  FaEdit,
  FaTrash,
  FaCalendarAlt,
  FaUser,
  FaLeaf,
  FaTint,
  FaFlask,
  FaSeedling,
  FaSun,
  FaCertificate,
  FaShieldAlt,
  FaWrench,
  FaCheckCircle,
  FaLayerGroup,
  FaLock
} from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';
import { useDeleteEventMutation } from 'store/api/historyApi';
import { getEventFieldDisplay } from '../../utils/fieldDisplayUtils';
import { formatCO2e, getImpactLevel, getCarbonScoreColor } from '../../utils/carbonDisplayUtils';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import { useUserRole } from 'hooks/useUserRole';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

// Types
interface Member {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  image?: string;
}

interface Event {
  id: number;
  type: string;
  event_type: number;
  description: string;
  date: string;
  observation?: string;
  created_by: number;
  image?: string;
  name?: string;
  certified?: boolean;
  carbon_data?: CarbonCalculationResult;
  album?: {
    id: number;
    images: Array<{
      id: number;
      image: string; // Note: this is 'image' not 'image_url'
      caption?: string;
      created_at?: string;
    }>;
  };
  // Chemical event fields (stored directly on event object)
  commercial_name?: string;
  volume?: string;
  concentration?: string;
  area?: string;
  way_of_application?: string;
  weather_conditions?: string;
  application_timing?: string;
  target_pest_disease?: string;
  pre_harvest_interval?: number;
  active_ingredient?: string;
  // Production event fields (first-class fields from backend)
  area_covered?: number;
  area_unit?: string;
  yield_quantity?: number;
  yield_unit?: string;
  fuel_consumed?: number;
  fuel_unit?: string;
  equipment_hours?: number;
  transportation_distance?: number;
  transportation_unit?: string;
  production_type?: string;
  production_efficiency?: string;
  // Sprint 3 Epic 3.2: Consumer Trust Fields
  seeds_source?: string;
  water_source?: string;
  extra_data?: {
    // Weather Event specific fields
    lower_temperature?: number;
    way_of_protection?: string;
    highest_temperature?: number;
    duration?: number;
    damage_assessment?: string;
    protection_measures?: string;
    wind_speed?: number;
    precipitation_amount?: number;
    humidity_level?: number;
    crop_impact?: string;
    // Chemical Event specific fields
    commercial_name?: string;
    active_ingredient?: string;
    target_pest_disease?: string;
    application_method?: string;
    area_treated?: number;
    area_unit?: string;
    volume_applied?: number;
    volume_unit?: string;
    weather_conditions?: string;
    application_timing?: string;
    pre_harvest_interval?: number;
    concentration?: string;
    // Production Event specific fields
    area?: number;
    planting_density?: number;
    seed_variety?: string;
    quantityHarvested?: number;
    quality_grade?: string;
    harvest_method?: string;
    waterAmount?: number;
    irrigation_method?: string;
    water_efficiency?: number;
    soil_moisture?: number;
    pruning_type?: string;
    trees_pruned?: number;
    // Equipment Event specific fields
    equipment_type?: string;
    fuel_consumed?: number;
    fuel_unit?: string;
    fuel_type?: string;
    hours_operated?: number;
    area_worked?: number;
    fuel_efficiency?: number;
    operation_efficiency?: string;
    maintenance_type?: string;
    cost?: number;
    next_service?: string;
    // Soil Management specific fields
    ph_value?: number;
    organic_matter?: number;
    nitrogen_level?: number;
    phosphorus_level?: number;
    potassium_level?: number;
    test_laboratory?: string;
    recommendations?: string;
    lime_type?: string;
    application_rate?: number;
    target_ph?: number;
    material_type?: string;
    organic_content?: number;
    carbon_sequestered?: number;
    // Pest Management specific fields
    pests_found?: string;
    pest_count?: number;
    threshold_level?: number;
    action_taken?: string;
    beneficial_species?: string;
    target_pest?: string;
    release_rate?: number;
    effectiveness?: string;
    trap_type?: string;
    threshold?: number;
    action?: string;
    control_agent?: string;
    // Business Event specific fields
    certification_type?: string;
    certifying_body?: string;
    expiry_date?: string;
    certificate_number?: string;
    audit_type?: string;
    auditor?: string;
    result?: string;
    training_topic?: string;
    provider?: string;
    participants?: number;
    skills_gained?: string;
    [key: string]: any; // Allow for other fields
  };
}

interface CarbonCalculationResult {
  co2e: number;
  efficiency_score: number;
  usda_factors_based?: boolean;
  verification_status?: string;
  data_source?: string;
  calculation_method?: string; // Make optional since it can be undefined
  event_type: string;
  timestamp: string;
  cost_analysis?: {
    estimated_cost: number;
    cost_per_co2e: number;
  };
  error?: string;
  // Keep old field for backward compatibility during transition
  usda_verified?: boolean;
}

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  members: Member[];
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
  isProductionFinished?: boolean;
}

// Helper functions
const getEventConfig = (type: string, description: string, eventType?: number) => {
  // 🚨 PRIORITY 1: Check numeric event_type FIRST (definitive source of truth)
  // This prevents description keywords from overriding the actual event type
  if (eventType !== undefined) {
    switch (eventType) {
      case 0: // Weather Event
        return {
          icon: FaSun,
          color: 'purple.500',
          category: 'Weather Event',
          bgGradient: 'linear(to-r, purple.400, indigo.400)'
        };
      case 1: // Production Activity
        return {
          icon: FaSeedling,
          color: 'green.500',
          category: 'Production',
          bgGradient: 'linear(to-r, green.400, emerald.400)'
        };
      case 2: // Chemical Application
        return {
          icon: FaFlask,
          color: 'orange.500',
          category: 'Chemical Application',
          bgGradient: 'linear(to-r, orange.400, yellow.400)'
        };
      case 3: // General Activity
        return {
          icon: FaLeaf,
          color: 'green.500',
          category: 'Farm Activity',
          bgGradient: 'linear(to-r, green.400, emerald.400)'
        };
      case 4: // Equipment Operation
        return {
          icon: FaWrench,
          color: 'blue.500',
          category: 'Equipment Operation',
          bgGradient: 'linear(to-r, blue.400, cyan.400)'
        };
      case 5: // Soil Management
        return {
          icon: FaLeaf,
          color: 'amber.600',
          category: 'Soil Management',
          bgGradient: 'linear(to-r, amber.500, yellow.500)'
        };
      case 6: // Pest Management
        return {
          icon: FaShieldAlt,
          color: 'red.500',
          category: 'Pest Management',
          bgGradient: 'linear(to-r, red.400, orange.400)'
        };
      case 7: // Business Activity
        return {
          icon: FaCheckCircle,
          color: 'blue.600',
          category: 'Business Activity',
          bgGradient: 'linear(to-r, blue.500, purple.500)'
        };
    }
  }

  // 🔄 PRIORITY 2: Fallback to description keywords only if event_type is unknown
  const desc = description.toLowerCase();

  if (desc.includes('riego') || desc.includes('irrigation') || type.includes('irrigation')) {
    return {
      icon: FaTint,
      color: 'blue.500',
      category: 'Water Management',
      bgGradient: 'linear(to-r, blue.400, cyan.400)'
    };
  }

  if (type.includes('chemical') || desc.includes('fertilizer') || desc.includes('pesticide')) {
    return {
      icon: FaFlask,
      color: 'orange.500',
      category: 'Chemical Application',
      bgGradient: 'linear(to-r, orange.400, yellow.400)'
    };
  }

  if (desc.includes('harvest') || desc.includes('cosecha') || desc.includes('production')) {
    return {
      icon: FaSeedling,
      color: 'green.500',
      category: 'Production',
      bgGradient: 'linear(to-r, green.400, emerald.400)'
    };
  }

  if (desc.includes('weather') || desc.includes('climate') || desc.includes('temperature')) {
    return {
      icon: FaSun,
      color: 'purple.500',
      category: 'Weather Event',
      bgGradient: 'linear(to-r, purple.400, indigo.400)'
    };
  }

  return {
    icon: FaLeaf,
    color: 'green.500',
    category: 'Farm Activity',
    bgGradient: 'linear(to-r, green.400, emerald.400)'
  };
};

// Helper function to get human-readable event names
const getEventDisplayName = (event: Event, intl: any): string => {
  // If the event has a custom name set, use it for ALL event types
  // Check both top-level name and extra_data (weather uses event_name, pest uses name)
  if (event.name) {
    return event.name;
  }
  if (event.extra_data?.event_name) {
    return event.extra_data.event_name;
  }
  if (event.extra_data?.name) {
    return event.extra_data.name;
  }

  // For chemical events (Type 2), prioritize commercial name from direct field or extra_data
  if (event.event_type === 2) {
    if ((event as any).commercial_name) {
      return (event as any).commercial_name;
    }
    if (event.extra_data?.commercial_name) {
      return event.extra_data.commercial_name;
    }
  }

  // For other event types, map the type to a human-readable name
  const eventTypeMap: Record<string, string> = {
    // Chemical events
    'event.chemical.fertilizer':
      intl.formatMessage({ id: 'event.chemical.fertilizer' }) || 'Fertilizer Application',
    'event.chemical.pesticide':
      intl.formatMessage({ id: 'event.chemical.pesticide' }) || 'Pesticide Application',
    'event.chemical.herbicide':
      intl.formatMessage({ id: 'event.chemical.herbicide' }) || 'Herbicide Application',
    'event.chemical.fungicide':
      intl.formatMessage({ id: 'event.chemical.fungicide' }) || 'Fungicide Application',
    'event.chemical.insecticide':
      intl.formatMessage({ id: 'event.chemical.insecticide' }) || 'Insecticide Application',

    // Weather events
    'event.weather.frost': intl.formatMessage({ id: 'event.weather.frost' }) || 'Frost Event',
    'event.weather.drought': intl.formatMessage({ id: 'event.weather.drought' }) || 'Drought Event',
    'event.weather.hailstorm': intl.formatMessage({ id: 'event.weather.hailstorm' }) || 'Hailstorm',
    'event.weather.high_temperature':
      intl.formatMessage({ id: 'event.weather.high_temperature' }) || 'High Temperature',

    // Equipment events
    'event.equipment.fuel_consumption':
      intl.formatMessage({ id: 'event.equipment.fuel_consumption' }) || 'Fuel Consumption',
    'event.equipment.tractor':
      intl.formatMessage({ id: 'event.equipment.tractor' }) || 'Tractor Operation',
    'event.equipment.harvester':
      intl.formatMessage({ id: 'event.equipment.harvester' }) || 'Harvester Operation',
    'event.equipment.pump': intl.formatMessage({ id: 'event.equipment.pump' }) || 'Pump Operation',
    'event.equipment.other':
      intl.formatMessage({ id: 'event.equipment.other' }) || 'Equipment Operation',

    // Production events
    'event.production.harvest': intl.formatMessage({ id: 'event.production.harvest' }) || 'Harvest',
    'event.production.pruning': intl.formatMessage({ id: 'event.production.pruning' }) || 'Pruning',
    'event.production.planting':
      intl.formatMessage({ id: 'event.production.planting' }) || 'Planting',
    'event.production.irrigation':
      intl.formatMessage({ id: 'event.production.irrigation' }) || 'Irrigation',
    'event.production.harvesting':
      intl.formatMessage({ id: 'event.production.harvesting' }) || 'Harvesting',

    // Soil events
    'event.soil.soil_test': intl.formatMessage({ id: 'event.soil.soil_test' }) || 'Soil Testing',
    'event.soil.preparation':
      intl.formatMessage({ id: 'event.soil.preparation' }) || 'Soil Preparation',
    'event.soil.amendment': intl.formatMessage({ id: 'event.soil.amendment' }) || 'Soil Amendment',
    'event.soil.management':
      intl.formatMessage({ id: 'event.soil.management' }) || 'Soil Management',

    // Soil events (additional)
    'event.soil.organic_matter_addition':
      intl.formatMessage({ id: 'event.soil.organic_matter_addition' }) || 'Organic Matter Addition',
    'event.soil.cover_crop': intl.formatMessage({ id: 'event.soil.cover_crop' }) || 'Cover Crop',
    'event.soil.composting': intl.formatMessage({ id: 'event.soil.composting' }) || 'Composting',

    // Pest events
    'event.pest.monitoring':
      intl.formatMessage({ id: 'event.pest.monitoring' }) || 'Pest Monitoring',
    'event.pest.control': intl.formatMessage({ id: 'event.pest.control' }) || 'Pest Control',
    'event.pest.prevention':
      intl.formatMessage({ id: 'event.pest.prevention' }) || 'Pest Prevention',
    'event.pest.scouting': intl.formatMessage({ id: 'event.pest.scouting' }) || 'Pest Scouting',
    'event.pest.beneficial_release':
      intl.formatMessage({ id: 'event.pest.beneficial_release' }) || 'Beneficial Insect Release',
    'event.pest.trap_monitoring':
      intl.formatMessage({ id: 'event.pest.trap_monitoring' }) || 'Trap Monitoring',
    'event.pest.pest_identification':
      intl.formatMessage({ id: 'event.pest.pest_identification' }) || 'Pest Identification',
    'event.pest.threshold_assessment':
      intl.formatMessage({ id: 'event.pest.threshold_assessment' }) || 'Threshold Assessment',
    'event.pest.ipm_implementation':
      intl.formatMessage({ id: 'event.pest.ipm_implementation' }) || 'IPM Implementation',

    // Business events
    'event.business.certification':
      intl.formatMessage({ id: 'event.business.certification' }) || 'Business Certification',
    'event.business.compliance':
      intl.formatMessage({ id: 'event.business.compliance' }) || 'Compliance Review',
    'event.business.inspection':
      intl.formatMessage({ id: 'event.business.inspection' }) || 'Business Inspection',

    // Certification events
    'event.certification.inspection':
      intl.formatMessage({ id: 'event.certification.inspection' }) || 'Certification Inspection',
    'event.certification.organic':
      intl.formatMessage({ id: 'event.certification.organic' }) || 'Organic Certification',

    // Cover crop events
    'event.cover_crop.establishment':
      intl.formatMessage({ id: 'event.cover_crop.establishment' }) || 'Cover Crop Establishment',
    'event.cover_crop.termination':
      intl.formatMessage({ id: 'event.cover_crop.termination' }) || 'Cover Crop Termination',

    // Tree/plant events
    'event.tree.planting': intl.formatMessage({ id: 'event.tree.planting' }) || 'Tree Planting',
    'event.plant.establishment':
      intl.formatMessage({ id: 'event.plant.establishment' }) || 'Plant Establishment',

    // Site preparation
    'event.site.preparation':
      intl.formatMessage({ id: 'event.site.preparation' }) || 'Site Preparation',
    'event.site.design': intl.formatMessage({ id: 'event.site.design' }) || 'Site Design',

    // Fertilization programs
    'event.fertilization.program':
      intl.formatMessage({ id: 'event.fertilization.program' }) || 'Fertilization Program',
    'event.fertilization.application':
      intl.formatMessage({ id: 'event.fertilization.application' }) || 'Fertilizer Application',

    // Seeding events
    'event.seeding.wheat': intl.formatMessage({ id: 'event.seeding.wheat' }) || 'Wheat Seeding',
    'event.seeding.cotton': intl.formatMessage({ id: 'event.seeding.cotton' }) || 'Cotton Seeding',

    // Nitrogen application
    'event.nitrogen.application':
      intl.formatMessage({ id: 'event.nitrogen.application' }) || 'Nitrogen Application',

    // Beneficial insect release
    'event.beneficial.insect_release':
      intl.formatMessage({ id: 'event.beneficial.insect_release' }) || 'Beneficial Insect Release',

    // Orchard establishment
    'event.orchard.establishment':
      intl.formatMessage({ id: 'event.orchard.establishment' }) || 'Orchard Establishment',

    // Irrigation management
    'event.irrigation.management':
      intl.formatMessage({ id: 'event.irrigation.management' }) || 'Irrigation Management',

    // Cover crop system
    'event.cover_crop.system':
      intl.formatMessage({ id: 'event.cover_crop.system' }) || 'Cover Crop System',

    // Winter cover crop
    'event.winter.cover_crop':
      intl.formatMessage({ id: 'event.winter.cover_crop' }) || 'Winter Cover Crop',

    // High-density site design
    'event.high_density.site_design':
      intl.formatMessage({ id: 'event.high_density.site_design' }) || 'High-Density Site Design',

    // Organic soil preparation
    'event.organic.soil_preparation':
      intl.formatMessage({ id: 'event.organic.soil_preparation' }) || 'Organic Soil Preparation'
  };

  // Try to get mapped name first
  if (eventTypeMap[event.type]) {
    return eventTypeMap[event.type];
  }

  // Fallback: try direct translation
  const directTranslation = intl.formatMessage({ id: event.type });
  if (directTranslation && directTranslation !== event.type) {
    return directTranslation;
  }

  // Last fallback: use description or a cleaned-up version of the type
  if (event.description) {
    return event.description;
  }

  // Clean up the type string for display
  return event.type
    .replace(/^event\./, '')
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const extractEventData = (event: Event) => {
  const eventData = event as any;
  const extraData = eventData.extra_data || {};

  const observation = event.observation || '';
  const durationMatch = observation.match(/(\d+)\s*hour/i);
  const duration = durationMatch ? parseInt(durationMatch[1]) : null;

  let amount: number | null = null;
  let unit: string | null = null;

  // For chemical events (event_type === 2), use structured volume fields
  // instead of regex parsing from description text
  if (event.event_type === 2) {
    const rawAmount =
      eventData.volume_applied ?? eventData.volume ?? extraData.volume_applied ?? null;
    amount = rawAmount !== null && rawAmount !== '' ? parseFloat(rawAmount) : null;
    unit = eventData.volume_unit || extraData.volume_unit || 'L';
  } else {
    // For other event types, fall back to regex parsing from observation
    const amountMatch = observation.match(/(\d+)\s*(kg|lbs?|liters?|l)/i);
    amount = amountMatch ? parseInt(amountMatch[1]) : null;
    unit = amountMatch ? amountMatch[2] : null;
  }

  return {
    duration,
    amount,
    unit,
    hasQuantifiableData: duration !== null || amount !== null
  };
};

/**
 * Render event-specific fields using the shared getEventFieldDisplay() utility.
 * This ensures the modal shows exactly the same fields as ConsumerEventCard.
 */
const renderSharedEventFields = (event: Event, cardBg: string, textColor: string) => {
  const { immediate, secondary, details } = getEventFieldDisplay(event as any);

  const allFields = [...immediate, ...secondary, ...details];
  if (allFields.length === 0) return null;

  return (
    <VStack spacing={4} align="stretch">
      {/* Immediate Fields - Primary information */}
      {immediate.length > 0 && (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {immediate.map((field, index) => (
            <Box key={`imm-${index}`} p={4} bg={cardBg} borderRadius="lg">
              <Text fontSize="sm" color="gray.500" mb={1}>
                {field.label}
              </Text>
              <Text fontWeight="medium" color={textColor}>
                {field.value}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      )}

      {/* Secondary Fields */}
      {secondary.length > 0 && (
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={3} color={textColor}>
            Additional Details
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {secondary.map((field, index) => (
              <Box key={`sec-${index}`} p={4} bg={cardBg} borderRadius="lg">
                <Text fontSize="sm" color="gray.500" mb={1}>
                  {field.label}
                </Text>
                <Text fontWeight="medium" color={textColor}>
                  {field.value}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Details Fields - Technical details */}
      {details.length > 0 && (
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={3} color={textColor}>
            Technical Details
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {details.map((field, index) => (
              <Box key={`det-${index}`} p={4} bg={cardBg} borderRadius="lg">
                <Text fontSize="sm" color="gray.500" mb={1}>
                  {field.label}
                </Text>
                <Text fontWeight="medium" color={textColor}>
                  {field.value}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}
    </VStack>
  );
};

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  onClose,
  event,
  members,
  onEventUpdated,
  onEventDeleted,
  isProductionFinished = false
}) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();
  const { canWrite } = useUserRole();
  const { currentCompany } = useSelector((state: RootState) => state.company);

  // Get URL parameters
  const { establishmentId, parcelId } = useParams<{
    establishmentId: string;
    parcelId: string;
  }>();

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  // Modal size based on screen
  const modalSize = useBreakpointValue({ base: 'full', md: '4xl' });

  // State for carbon data - now using embedded data
  const [carbonData, setCarbonData] = useState<CarbonCalculationResult | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Delete confirmation modal
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  // API hooks - only need delete now
  const [deleteEvent, { isLoading: isDeleting }] = useDeleteEventMutation();

  // Load carbon data when modal opens - now uses embedded data
  useEffect(() => {
    if (isOpen && event) {
      // Zero-emission event types: Weather (0), General/Other Farm Activity (3), Business (7)
      // These are observational/administrative events that produce no direct emissions
      const isZeroEmissionType = event.event_type === 0 || event.event_type === 3 || event.event_type === 7;
      if (isZeroEmissionType) {
        const typeLabels: Record<number, string> = { 0: 'weather', 3: 'general', 7: 'business' };
        setCarbonData({
          co2e: 0,
          efficiency_score: 100,
          usda_factors_based: false,
          verification_status: 'verified',
          data_source: `${typeLabels[event.event_type]}_transparency`,
          calculation_method: `${typeLabels[event.event_type]}_transparency`,
          event_type: typeLabels[event.event_type] || 'general',
          timestamp: new Date().toISOString(),
        });
        setDataLoaded(true);
      } else if (event.carbon_data) {
        setCarbonData(event.carbon_data);
        setDataLoaded(true);
      } else {
        // Fallback for events without embedded carbon data
        setCarbonData({
          co2e: 0,
          efficiency_score: 50.0,
          usda_factors_based: false,
          verification_status: 'estimated',
          data_source: 'Unknown',
          calculation_method: 'embedded_data_unavailable',
          event_type: 'unknown',
          timestamp: new Date().toISOString(),
          error: 'Carbon data not available in event response'
        });
        setDataLoaded(true);
      }
    }
  }, [isOpen, event]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCarbonData(null);
      setDataLoaded(false);
    }
  }, [isOpen]);

  if (!event) return null;

  const eventConfig = getEventConfig(event.type, event.description, event.event_type);
  const eventData = extractEventData(event);
  const operator = members.find((member) => member.id === event.created_by);

  const handleEdit = () => {
    navigate(
      `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/event/${event.id}/change?event_type=${event.event_type}`
    );
    onClose();
  };

  const handleDelete = () => {
    if (!currentCompany || !establishmentId || !event) return;

    deleteEvent({
      companyId: currentCompany.id.toString(),
      establishmentId: establishmentId,
      eventId: event.id.toString(),
      eventType: event.event_type.toString()
    })
      .unwrap()
      .then(() => {
        toast({
          title: 'Event Deleted',
          description: 'The event has been successfully deleted.',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
        onDeleteClose();
        onClose();
        onEventDeleted?.();
      })
      .catch((error: any) => {
        console.error('Failed to delete event:', error);
        toast({
          title: 'Error Deleting Event',
          description: 'An error occurred while deleting the event.',
          status: 'error',
          duration: 3000,
          isClosable: true
        });
      });
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size={modalSize} isCentered>
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent
          bg={bgColor}
          borderRadius="xl"
          maxH="90vh"
          display="flex"
          flexDirection="column"
        >
          {/* Modern Minimalist Header */}
          <ModalHeader p={6} pb={4} borderBottom="1px" borderColor={borderColor} flexShrink={0}>
            <HStack justify="space-between" align="start">
              <VStack align="start" spacing={3} flex={1}>
                <HStack spacing={3}>
                  <Box
                    p={3}
                    borderRadius="lg"
                    bg={useColorModeValue(
                      `${eventConfig.color.split('.')[0]}.50`,
                      `${eventConfig.color.split('.')[0]}.900`
                    )}
                  >
                    <Icon as={eventConfig.icon} boxSize={6} color={eventConfig.color} />
                  </Box>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="xl" fontWeight="bold" color={textColor}>
                      {getEventDisplayName(event, intl)}
                    </Text>
                    <HStack spacing={2}>
                      <Badge
                        colorScheme={eventConfig.color.split('.')[0]}
                        variant="subtle"
                        fontSize="sm"
                        px={3}
                        py={1}
                        borderRadius="full"
                      >
                        {eventConfig.category}
                      </Badge>
                      {(event.is_summary === true ||
                        event.extra_data?.is_summary === true ||
                        event.extra_data?.is_summary === 'true') && (
                        <Badge
                          colorScheme="purple"
                          variant="subtle"
                          fontSize="sm"
                          px={3}
                          py={1}
                          borderRadius="full"
                          display="flex"
                          alignItems="center"
                          gap={1}
                        >
                          <Icon as={FaLayerGroup} boxSize={3} />
                          {event.event_count || event.extra_data?.event_count || 'Summary'}
                          {' events'}
                        </Badge>
                      )}
                    </HStack>
                  </VStack>
                </HStack>

                <HStack spacing={6} color="gray.500" fontSize="sm">
                  <HStack spacing={2}>
                    <Icon as={FaCalendarAlt} boxSize={4} />
                    <Text>
                      {event.extra_data?.date_start && event.extra_data?.date_end
                        ? `${new Date(
                            event.extra_data.date_start
                          ).toLocaleDateString()} - ${new Date(
                            event.extra_data.date_end
                          ).toLocaleDateString()}`
                        : new Date(event.date).toLocaleDateString()}
                    </Text>
                  </HStack>
                  {operator && (
                    <HStack spacing={2}>
                      <Icon as={FaUser} boxSize={4} />
                      <Text>{operator.full_name}</Text>
                    </HStack>
                  )}
                  {event.certified && (
                    <HStack spacing={2}>
                      <Icon as={MdVerified} boxSize={4} color="green.500" />
                      <Text color="green.500" fontWeight="medium">
                        Certified
                      </Text>
                    </HStack>
                  )}
                </HStack>
              </VStack>

              <ModalCloseButton position="static" size="lg" />
            </HStack>
          </ModalHeader>

          <ModalBody p={6} overflowY="auto" flex={1}>
            <VStack spacing={6} align="stretch">
              {/* Event Details Section */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={4} color={textColor}>
                  Event Details
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <Box p={4} bg={cardBg} borderRadius="lg">
                    <Text fontSize="sm" color="gray.500" mb={1}>
                      Description
                    </Text>
                    <Text fontWeight="medium">{event.description}</Text>
                  </Box>

                  {eventData.duration && (
                    <Box p={4} bg={cardBg} borderRadius="lg">
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        Duration
                      </Text>
                      <Text fontWeight="medium">{eventData.duration} hours</Text>
                    </Box>
                  )}

                  {eventData.amount != null && (
                    <Box p={4} bg={cardBg} borderRadius="lg">
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        Volume Applied
                      </Text>
                      <Text fontWeight="medium">
                        {eventData.amount} {eventData.unit}
                      </Text>
                    </Box>
                  )}
                </SimpleGrid>
              </Box>

              {/* Album Images Section */}
              {event.album && event.album.images && event.album.images.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" mb={4} color={textColor}>
                      Event Photos
                    </Text>
                    <Grid
                      templateColumns={{
                        base: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)',
                        lg: 'repeat(4, 1fr)'
                      }}
                      gap={4}
                    >
                      {event.album.images.map((image, index) => (
                        <Box key={image.id || index}>
                          <AspectRatio ratio={1}>
                            <Image
                              src={image.image}
                              alt={`Event photo ${index + 1}`}
                              borderRadius="lg"
                              objectFit="cover"
                              border="1px"
                              borderColor={borderColor}
                              cursor="pointer"
                              transition="all 0.2s"
                              _hover={{
                                transform: 'scale(1.05)',
                                boxShadow: 'lg'
                              }}
                              onError={(e) => {
                                console.error('Image failed to load:', image.image, e);
                              }}
                              fallback={
                                <Center
                                  h="100%"
                                  bg={cardBg}
                                  borderRadius="lg"
                                  border="1px"
                                  borderColor={borderColor}
                                  flexDirection="column"
                                  gap={2}
                                >
                                  <Box fontSize="2xl">📷</Box>
                                  <Text fontSize="xs" color="gray.500" textAlign="center">
                                    Image not available
                                  </Text>
                                </Center>
                              }
                            />
                          </AspectRatio>
                        </Box>
                      ))}
                    </Grid>
                  </Box>
                </>
              )}

              {/* Specific Event Fields Section */}
              {renderSharedEventFields(event, cardBg, textColor) && (
                <>
                  <Divider />
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" mb={4} color={textColor}>
                      Detailed Information
                    </Text>
                    {renderSharedEventFields(event, cardBg, textColor)}
                  </Box>
                </>
              )}

              <Divider />

              {/* Carbon Impact Section - matches CarbonImpactPreview format */}
              {carbonData && !carbonData.error && (
                <Box p={4} bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
                  <HStack justify="space-between" align="center" mb={3}>
                    <HStack spacing={2}>
                      <Icon as={FaLeaf} color="green.500" boxSize={4} />
                      <Text fontSize="lg" fontWeight="bold" color={textColor}>
                        Carbon Impact
                      </Text>
                    </HStack>
                    {(carbonData.usda_factors_based || carbonData.usda_verified) && (
                      <Tooltip label="Calculated using USDA published emission factors">
                        <Badge colorScheme="green" fontSize="xs">
                          <HStack spacing={1}>
                            <Icon as={FaCertificate} boxSize={3} />
                            <Text>Science-Based</Text>
                          </HStack>
                        </Badge>
                      </Tooltip>
                    )}
                  </HStack>

                  {/* Weather/zero-emission events: transparency message */}
                  {(carbonData.co2e === 0 || carbonData.calculation_method?.includes('weather')) ? (
                    <VStack spacing={3} align="stretch">
                      <HStack justify="space-between" align="center">
                        <VStack spacing={0} align="start">
                          <HStack spacing={2}>
                            <Text fontSize="2xl" fontWeight="bold" color={textColor}>0</Text>
                            <Text fontSize="sm" color="gray.500">kg CO₂e</Text>
                            <Badge colorScheme="gray" size="sm">None</Badge>
                          </HStack>
                          <Text fontSize="xs" color="gray.500">No direct emissions</Text>
                        </VStack>
                        <VStack spacing={0} align="end">
                          <HStack spacing={1}>
                            <Text fontSize="lg" fontWeight="bold" color="green.500">100</Text>
                            <Text fontSize="sm" color="gray.500">/100</Text>
                          </HStack>
                          <Text fontSize="xs" color="gray.500">Efficiency Score</Text>
                        </VStack>
                      </HStack>
                      <Alert status="info" size="sm" borderRadius="md">
                        <AlertIcon boxSize={3} />
                        <Box>
                          <AlertTitle fontSize="xs">Transparency Value</AlertTitle>
                          <AlertDescription fontSize="xs">
                            {event.event_type === 7
                              ? 'Business activities like certifications and audits build consumer trust. They generate no direct emissions but strengthen your transparency score.'
                              : event.event_type === 3
                                ? 'General farm activities document agricultural practices. They generate no direct emissions but build your transparency score and enrich the consumer story.'
                                : 'This event generates no direct emissions but builds your transparency score and enriches the consumer story.'}
                          </AlertDescription>
                        </Box>
                      </Alert>
                    </VStack>
                  ) : (
                  <>
                  <HStack justify="space-between" align="center">
                    <VStack spacing={0} align="start">
                      <HStack spacing={2}>
                        <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                          {formatCO2e(carbonData.co2e)}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          kg CO₂e
                        </Text>
                        <Badge colorScheme={getImpactLevel(carbonData.co2e).color} size="sm">
                          {getImpactLevel(carbonData.co2e).level}
                        </Badge>
                      </HStack>
                      <Text fontSize="xs" color="gray.500">
                        Carbon footprint estimate
                      </Text>
                    </VStack>

                    {carbonData.efficiency_score > 0 && (
                      <VStack spacing={0} align="end">
                        <HStack spacing={1}>
                          <Text
                            fontSize="lg"
                            fontWeight="bold"
                            color={`${getCarbonScoreColor(carbonData.efficiency_score)}.500`}
                          >
                            {Math.round(carbonData.efficiency_score)}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            /100
                          </Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.500">
                          Efficiency Score
                        </Text>
                      </VStack>
                    )}
                  </HStack>

                  {/* Efficiency Progress Bar */}
                  {carbonData.efficiency_score > 0 && (
                    <Box mt={3}>
                      <Progress
                        value={carbonData.efficiency_score}
                        colorScheme={getCarbonScoreColor(carbonData.efficiency_score)}
                        size="sm"
                        borderRadius="md"
                      />
                    </Box>
                  )}
                  </>
                  )}
                </Box>
              )}
            </VStack>
          </ModalBody>

          {/* Fixed Footer */}
          <ModalFooter
            borderTop="1px"
            borderColor={borderColor}
            p={6}
            flexShrink={0}
            bg={useColorModeValue('white', 'gray.800')}
            borderBottomRadius="xl"
          >
            <Flex w="full" justify="space-between" align="center">
              <Button
                variant="ghost"
                onClick={onClose}
                size="lg"
                color="gray.600"
                _hover={{ bg: 'gray.100' }}
                borderRadius="lg"
              >
                Close
              </Button>

              {isProductionFinished ? (
                <HStack spacing={2} bg="gray.50" px={4} py={2} borderRadius="lg">
                  <Icon as={FaLock} boxSize={4} color="gray.500" />
                  <Text fontSize="sm" color="gray.600" fontWeight="medium">
                    Event locked — production completed
                  </Text>
                </HStack>
              ) : canWrite ? (
                <HStack spacing={3}>
                  <Button
                    leftIcon={<FaTrash />}
                    colorScheme="red"
                    variant="outline"
                    onClick={onDeleteOpen}
                    size="lg"
                    borderRadius="lg"
                    fontWeight="semibold"
                    isLoading={isDeleting}
                    loadingText="Deleting..."
                    _hover={{
                      bg: 'red.50',
                      color: 'red.600',
                      borderColor: 'red.600'
                    }}
                    transition="all 0.2s"
                  >
                    Delete
                  </Button>

                  <Button
                    leftIcon={<FaEdit />}
                    colorScheme="blue"
                    variant="solid"
                    onClick={handleEdit}
                    size="lg"
                    borderRadius="lg"
                    fontWeight="semibold"
                    _hover={{
                      transform: 'translateY(-1px)',
                      boxShadow: 'lg'
                    }}
                    transition="all 0.2s"
                  >
                    Edit Event
                  </Button>
                </HStack>
              ) : null}
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modern Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
        isCentered
      >
        <AlertDialogOverlay bg="blackAlpha.300" backdropFilter="blur(10px)">
          <AlertDialogContent borderRadius="xl" p={2}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" pb={4}>
              <HStack spacing={3}>
                <Box p={2} borderRadius="lg" bg="red.50">
                  <Icon as={FaTrash} boxSize={5} color="red.500" />
                </Box>
                <Text>Delete Event</Text>
              </HStack>
            </AlertDialogHeader>

            <AlertDialogBody pb={6}>
              <VStack align="start" spacing={3}>
                <Text color="gray.600">
                  Are you sure you want to delete this event? This action cannot be undone.
                </Text>
                <Box p={3} bg="red.50" borderRadius="lg" w="full">
                  <Text fontSize="sm" color="red.700" fontWeight="medium">
                    ⚠️ This will permanently remove:
                  </Text>
                  <VStack align="start" spacing={1} mt={2} fontSize="sm" color="red.600">
                    <Text>• Event details and observations</Text>
                    <Text>• Associated carbon impact data</Text>
                    <Text>• Consumer QR code visibility</Text>
                  </VStack>
                </Box>
              </VStack>
            </AlertDialogBody>

            <AlertDialogFooter pt={4}>
              <HStack spacing={3} w="full" justify="flex-end">
                <Button
                  ref={cancelRef}
                  onClick={onDeleteClose}
                  variant="ghost"
                  size="lg"
                  borderRadius="lg"
                >
                  Cancel
                </Button>
                <Button
                  colorScheme="red"
                  onClick={handleDelete}
                  size="lg"
                  borderRadius="lg"
                  fontWeight="semibold"
                  isLoading={isDeleting}
                  loadingText="Deleting..."
                  _hover={{
                    transform: 'translateY(-1px)',
                    boxShadow: 'lg'
                  }}
                  transition="all 0.2s"
                >
                  Delete Event
                </Button>
              </HStack>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};
