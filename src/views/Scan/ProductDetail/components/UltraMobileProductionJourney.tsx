import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Button,
  Circle,
  Collapse,
  Heading,
  useColorModeValue,
  Flex,
  Stack,
  useBreakpointValue,
  Divider,
  Tooltip,
  StatGroup,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  SimpleGrid,
  Image,
  AspectRatio
} from '@chakra-ui/react';
import EnhancedEventDetailModal from 'components/Events/EnhancedEventDetailModal';
import {
  FaWater,
  FaBolt,
  FaSeedling,
  FaLeaf,
  FaTractor,
  FaChevronDown,
  FaChevronUp,
  FaCalendarAlt,
  FaCertificate,
  FaFlask,
  FaShieldAlt,
  FaRecycle,
  FaGlobeAmericas,
  FaDollarSign,
  FaCheckCircle,
  FaExclamationCircle,
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaBalanceScale,
  FaBug,
  FaClipboard
} from 'react-icons/fa';
import { MdTimeline, MdEco, MdVerified, MdAgriculture } from 'react-icons/md';
import { TransparencyIndicator } from 'components/Design';
import { useIntl } from 'react-intl';
import { format, parseISO } from 'date-fns';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import { ConsumerEventCard } from 'components/Events/ConsumerEventCard';
import {
  getSustainabilityImpact,
  getConsumerEventDescription
} from 'utils/eventDescriptions';
import {
  EducationalTooltip,
  CO2eTooltip,
  BlockchainTooltip,
  CarbonScoreTooltip
} from 'components/Education/EducationalTooltip';

interface AlbumImage {
  id: number;
  image: string;
  caption: string;
  created_at: string;
}

interface Album {
  id: number;
  images: AlbumImage[];
}

interface CarbonCalculation {
  co2e: number;
  efficiency_score: number;
  usda_factors_used: boolean;
  calculation_method?: string;
  verification_confidence?: 'high' | 'medium' | 'low';
  cost_analysis?: {
    estimated_cost: number;
    cost_per_co2e: number;
  };
}

interface TimelineEvent {
  id: string;
  type: string;
  description: string;
  observation?: string;
  date: string;
  certified: boolean;
  index?: number;
  volume?: string;
  concentration?: string;
  area?: string;
  equipment?: string;
  // NEW ACTIVITY FIELDS for complete transparency
  activity_type?: string;
  activity_name?: string;
  duration?: string;
  people_involved?: number;
  carbon_data?: CarbonCalculation;
  blockchain_verified?: boolean;
  blockchain_transaction?: string;
  blockchain_block_number?: number;
  blockchain_explorer_url?: string;
  blockchain_network?: string;
  verification_confidence?: number;
  verification_timestamp?: string;
  data_integrity_score?: number;
  usda_factors_used?: boolean;
  extra_data?: {
    blockchain_verified?: boolean;
    blockchain_transaction?: string;
    blockchain_block_number?: number;
    verification_confidence?: number;
    verification_timestamp?: string;
    data_integrity_score?: number;
    [key: string]: any;
  };
  album?: Album;
}

interface UltraMobileProductionJourneyProps {
  events: TimelineEvent[];
  productionId?: string;
  transparencyScore?: number;
  /** Production-level blockchain verification data */
  productionBlockchain?: {
    tx_hash?: string;
    verified?: boolean;
    block_number?: number;
    network?: string;
  };
}

export const UltraMobileProductionJourney: React.FC<UltraMobileProductionJourneyProps> = ({
  events,
  productionId,
  transparencyScore,
  productionBlockchain
}) => {
  const intl = useIntl();

  const [showAll, setShowAll] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Event detail modal handlers
  const handleEventClick = (event: TimelineEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  // Helper function to format CO2e values
  const formatCO2e = (co2e: number) => {
    const abs = Math.abs(co2e);
    const sign = co2e >= 0 ? '+' : '';

    if (abs >= 1000) {
      return `${sign}${(co2e / 1000).toFixed(1)}t`;
    }
    return `${sign}${co2e.toFixed(1)}kg`;
  };

  // Helper function to get carbon impact color
  const getCarbonImpactColor = (co2e: number) => {
    if (co2e < 0) return 'green'; // Negative emissions (good)
    if (co2e < 10) return 'yellow'; // Low emissions
    return 'red'; // High emissions
  };

  // Helper function to get efficiency color
  const getEfficiencyColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'orange';
  };

  // Helper function to get verification confidence icon
  const getConfidenceIcon = (confidence?: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return FaCheckCircle;
      case 'medium':
        return FaEye;
      case 'low':
        return FaExclamationCircle;
      default:
        return FaShieldAlt;
    }
  };

  // Get event configuration based on type - Enhanced for all 7 event types
  const getEventConfig = (event: TimelineEvent) => {
    const type = event.type.toLowerCase();
    const description = event.description.toLowerCase();

    // 🚨 CRITICAL: Check event_type field FIRST - it's the source of truth from backend
    // If event_type_field is explicitly set (0, 1, 2, etc.), use it directly without checking description
    const eventTypeField = (event as any)?.event_type;
    if (
      eventTypeField !== undefined &&
      eventTypeField !== null &&
      typeof eventTypeField === 'number'
    ) {
      // Use event_type_field as the primary classifier
      switch (eventTypeField) {
        case 0: // Weather
          return {
            icon: FaWater,
            color: 'cyan.500',
            bgColor: 'cyan.50',
            category: 'Weather',
            categoryColor: 'cyan'
          };
        case 1: // Production
          return {
            icon: MdAgriculture,
            color: 'green.500',
            bgColor: 'green.50',
            category: 'Production',
            categoryColor: 'green'
          };
        case 2: // Chemical
          return {
            icon: FaFlask,
            color: 'orange.500',
            bgColor: 'orange.50',
            category: 'Chemical',
            categoryColor: 'orange'
          };
        case 3: // General
          return {
            icon: FaClipboard,
            color: 'gray.500',
            bgColor: 'gray.50',
            category: 'General',
            categoryColor: 'gray'
          };
        case 4: // Equipment
          return {
            icon: FaTractor,
            color: 'blue.500',
            bgColor: 'blue.50',
            category: 'Equipment',
            categoryColor: 'blue'
          };
        case 5: // Soil Management
          return {
            icon: FaSeedling,
            color: 'teal.500',
            bgColor: 'teal.50',
            category: 'Soil Management',
            categoryColor: 'teal'
          };
        case 6: // Pest Management
          return {
            icon: FaBug,
            color: 'purple.500',
            bgColor: 'purple.50',
            category: 'Pest Management',
            categoryColor: 'purple'
          };
        case 7: // Business
          return {
            icon: FaCertificate,
            color: 'yellow.600',
            bgColor: 'yellow.50',
            category: 'Business',
            categoryColor: 'yellow'
          };
      }
    }

    // ⚠️ FALLBACK: Only check type strings and description keywords if event_type_field is missing
    // This ensures descriptions like "wind" in transplanting events don't override explicit event_type

    // Weather Events - Check type string and type codes ONLY (not description, which has false positives)
    if (
      type === 'weather' || // String type check
      ['fr', 'dr', 'hl', 'ht', 'ts', 'hw', 'hh', 'lh'].includes(type) || // Weather type codes
      type.includes('weather')
    ) {
      return {
        icon: FaWater,
        color: 'cyan.500',
        bgColor: 'cyan.50',
        category: 'Weather',
        categoryColor: 'cyan'
      };
    }

    // Chemical Events (event_type: 2) - Check event_type first, then type string, then type codes, then description
    if (
      (event as any)?.event_type === 2 || // Direct event_type check
      type === 'chemical' || // String type check
      ['fe', 'pe', 'fu', 'he'].includes(type) || // Chemical type codes
      type.includes('chemical') ||
      description.includes('fertilizer') ||
      description.includes('spray') ||
      description.includes('pesticide') ||
      description.includes('herbicide') ||
      description.includes('fungicide')
    ) {
      return {
        icon: FaFlask,
        color: 'orange.500',
        bgColor: 'orange.50',
        category: 'Chemical',
        categoryColor: 'orange'
      };
    }

    // Production Events (event_type: 1) - Check event_type first, then type string, then type codes, then description
    if (
      (event as any)?.event_type === 1 || // Direct event_type check
      type === 'production' || // String type check
      ['pl', 'ha', 'ir', 'pr', 'tr', 'cu', 'th', 'em'].includes(type) || // ✅ FIXED: Added 'tr', 'cu', 'th', 'em' (Equipment Maintenance)
      type.includes('production') ||
      description.includes('harvest') ||
      description.includes('planting') ||
      description.includes('bee') ||
      description.includes('irrigation') ||
      description.includes('pruning') ||
      description.includes('transplant') || // ✅ FIXED: Added keyword detection
      description.includes('cultivation') || // ✅ FIXED: Added keyword detection
      description.includes('thinning') || // ✅ FIXED: Added keyword detection
      description.includes('equipment maintenance') // ✅ FIXED: Added keyword detection for EM
    ) {
      return {
        icon: MdAgriculture,
        color: 'green.500',
        bgColor: 'green.50',
        category: 'Production',
        categoryColor: 'green'
      };
    }

    // Equipment Events (event_type: 4) - Check event_type first, then type string, then type codes, then description
    if (
      (event as any)?.event_type === 4 || // Direct event_type check
      type === 'equipment' || // String type check
      ['mn', 're', 'ca', 'fc', 'bd', 'ei'].includes(type) || // Equipment type codes
      type.includes('equipment') ||
      description.includes('tractor') ||
      description.includes('machinery') ||
      description.includes('fuel') ||
      description.includes('maintenance') ||
      description.includes('repair') ||
      description.includes('calibration')
    ) {
      return {
        icon: FaTractor,
        color: 'blue.500',
        bgColor: 'blue.50',
        category: 'Equipment',
        categoryColor: 'blue'
      };
    }

    // Soil Management Events (event_type: 5) - Check event_type first, then type string, then type codes, then description
    if (
      (event as any)?.event_type === 5 || // Direct event_type check
      type === 'soil_management' || // String type check
      type === 'soil' || // Alternative string type check
      ['st', 'pa', 'om', 'cc', 'ti', 'co'].includes(type) || // Soil type codes
      type.includes('soil') ||
      description.includes('soil') ||
      description.includes('organic matter') ||
      description.includes('carbon reserves') ||
      description.includes('amendment') ||
      description.includes('composting') ||
      description.includes('cover crop')
    ) {
      return {
        icon: FaSeedling,
        color: 'teal.500',
        bgColor: 'teal.50',
        category: 'Soil Management',
        categoryColor: 'teal'
      };
    }

    // Pest Management Events (event_type: 6) - Check event_type first, then type string, then type codes, then description
    if (
      (event as any)?.event_type === 6 || // Direct event_type check
      type === 'pest_management' || // String type check
      type === 'pest' || // Alternative string type check
      ['sc', 'br', 'tm', 'pi', 'ta', 'ip'].includes(type) || // Pest type codes
      type.includes('pest') ||
      description.includes('pest') ||
      description.includes('beneficial') ||
      description.includes('scouting') ||
      description.includes('ipm') ||
      description.includes('monitoring')
    ) {
      return {
        icon: FaBug,
        color: 'red.500',
        bgColor: 'red.50',
        category: 'Pest Management',
        categoryColor: 'red'
      };
    }

    // Business Events (event_type: 7) - Check event_type first, then type string, then type codes, then description
    if (
      (event as any)?.event_type === 7 || // Direct event_type check
      type === 'business' || // String type check
      ['ce', 'cm', 'in'].includes(type) || // Business type codes
      type.includes('business') ||
      description.includes('certification') ||
      description.includes('compliance') ||
      description.includes('audit') ||
      description.includes('inspection')
    ) {
      return {
        icon: FaCertificate,
        color: 'purple.500',
        bgColor: 'purple.50',
        category: 'Business',
        categoryColor: 'purple'
      };
    }

    // General Events (fallback)
    return {
      icon: MdEco,
      color: 'gray.500',
      bgColor: 'gray.50',
      category: 'General',
      categoryColor: 'gray'
    };
  };

  // Sort and filter events
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() // Oldest first
  );

  const filteredEvents =
    selectedCategory === 'all'
      ? sortedEvents
      : sortedEvents.filter((event) => {
          const config = getEventConfig(event);
          return (
            config.category &&
            typeof config.category === 'string' &&
            config.category.toLowerCase() === selectedCategory.toLowerCase()
          );
        });

  // Group same-subtype events for cleaner consumer display
  // Events with 3+ of the same type get grouped into a summary card
  type EventGroup = {
    kind: 'single';
    event: TimelineEvent;
  } | {
    kind: 'group';
    type: string;
    category: string;
    events: TimelineEvent[];
    dateRange: string;
  };

  const groupEvents = (evts: TimelineEvent[]): EventGroup[] => {
    if (evts.length === 0) return [];

    // Count events by type (using the subtype code like IR, PL, HA, etc.)
    const typeCounts: Record<string, TimelineEvent[]> = {};
    evts.forEach((event) => {
      const key = event.type || 'general';
      if (!typeCounts[key]) typeCounts[key] = [];
      typeCounts[key].push(event);
    });

    // Types that have 3+ events get grouped
    const groupableTypes = new Set(
      Object.entries(typeCounts)
        .filter(([, items]) => items.length >= 3)
        .map(([type]) => type)
    );

    const result: EventGroup[] = [];
    let i = 0;
    while (i < evts.length) {
      const event = evts[i];
      const eventType = event.type || 'general';

      if (groupableTypes.has(eventType)) {
        // Collect all consecutive events of this type
        const groupedEvents: TimelineEvent[] = [];
        // Collect ALL events of this type (not just consecutive)
        const allOfType = typeCounts[eventType];
        const config = getEventConfig(event);

        // Format date range
        const dates = allOfType.map((e) => new Date(e.date)).sort((a, b) => a.getTime() - b.getTime());
        const startMonth = dates[0].toLocaleDateString('en-US', { month: 'short' });
        const endMonth = dates[dates.length - 1].toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const dateRange = startMonth === endMonth ? endMonth : `${startMonth} - ${endMonth}`;

        // Only add group once (skip individual events of this type)
        if (!result.some((r) => r.kind === 'group' && r.type === eventType)) {
          result.push({
            kind: 'group',
            type: eventType,
            category: config.category,
            events: allOfType,
            dateRange
          });
        }
        i++;
      } else {
        result.push({ kind: 'single', event });
        i++;
      }
    }

    return result;
  };

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const toggleGroup = (type: string) => {
    setExpandedGroup((prev) => (prev === type ? null : type));
    setExpandedEventId(null);
  };

  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const toggleEventExpand = (eventId: string) => {
    setExpandedEventId((prev) => (prev === eventId ? null : eventId));
  };

  const displayedEvents = showAll ? filteredEvents : filteredEvents.slice(0, 3);
  const groupedDisplayEvents = groupEvents(showAll ? filteredEvents : displayedEvents);

  const categories = [
    'all',
    ...new Set(
      events
        .map((event) => getEventConfig(event).category)
        .filter((cat) => cat && typeof cat === 'string')
    )
  ];

  // Build enhanced event with blockchain verification, photo data, and transparency fields
  const buildEnhancedEvent = (event: TimelineEvent) => {
    const normalizedEventId = event.id.toString().includes('_')
      ? event.id.toString().split('_')[1]
      : event.id.toString();

    return {
      ...event,
      id: normalizedEventId,
      blockchain_verified:
        event.extra_data?.blockchain_verified || event.blockchain_verified || false,
      blockchain_transaction:
        event.extra_data?.blockchain_transaction || event.blockchain_transaction || '',
      blockchain_block_number:
        event.extra_data?.blockchain_block_number || event.blockchain_block_number || 0,
      verification_confidence:
        event.extra_data?.verification_confidence || event.verification_confidence || 0,
      verification_timestamp:
        event.extra_data?.verification_timestamp || event.verification_timestamp || '',
      data_integrity_score:
        event.extra_data?.data_integrity_score || event.data_integrity_score || 0,
      blockchain_network: event.blockchain_network || 'polygon_amoy',
      usda_factors_used:
        event.extra_data?.carbon_calculation?.usda_compliance || event.usda_factors_used || false,
      carbon_impact: event.extra_data?.carbon_calculation?.co2e || undefined,
      certified: event.certified || false,
      verification_level: event.verification_level || 'self_reported',
      photo_verified_count: event.photo_verified_count || 0,
      area_covered: event.area_covered,
      yield_quantity: event.yield_quantity,
      fuel_consumed: event.fuel_consumed,
      equipment_hours: event.equipment_hours,
      area_unit: event.area_unit,
      yield_unit: event.yield_unit,
      fuel_unit: event.fuel_unit,
      area_covered_numeric: event.area_covered_numeric,
      yield_quantity_numeric: event.yield_quantity_numeric,
      fuel_consumed_numeric: event.fuel_consumed_numeric,
      equipment_hours_numeric: event.equipment_hours_numeric,
      operation_type: event.operation_type,
      production_type: event.production_type,
      production_name: event.production_name,
      activity_type: event.activity_type,
      activity_name: event.activity_name,
      duration: event.duration,
      people_involved: event.people_involved,
      album: (() => {
        if (
          event.album &&
          event.album.images &&
          Array.isArray(event.album.images) &&
          event.album.images.length > 0
        ) {
          return {
            id: event.album.id ? event.album.id.toString() : 'album_' + normalizedEventId,
            images: event.album.images
              .filter((img: any) => img && (img.image || img.image_url))
              .map((img: any, index: number) => ({
                id: img.id ? img.id.toString() : `img_${index}`,
                image: img.image || img.image_url,
                caption: img.caption || `Image ${img.id || index + 1}`,
                created_at: img.created_at || new Date().toISOString()
              }))
          };
        }

        if (event.albums && Array.isArray(event.albums) && event.albums.length > 0) {
          const firstAlbum = event.albums[0];
          if (firstAlbum && firstAlbum.images && Array.isArray(firstAlbum.images)) {
            return {
              id: 'album_' + normalizedEventId,
              images: firstAlbum.images
                .filter((img: any) => img && (img.image || img.image_url))
                .map((img: any, index: number) => ({
                  id: img.id ? img.id.toString() : `img_${index}`,
                  image: img.image || img.image_url,
                  caption: img.caption || `Image ${img.id || index + 1}`,
                  created_at: img.created_at || new Date().toISOString()
                }))
            };
          }
          return {
            id: 'album_' + normalizedEventId,
            images: event.albums
              .filter((albumImage: any) => albumImage && (albumImage.image_url || albumImage.image))
              .map((albumImage: any, index: number) => ({
                id: albumImage.id ? albumImage.id.toString() : `album_${index}`,
                image: albumImage.image_url || albumImage.image,
                caption:
                  albumImage.title ||
                  albumImage.caption ||
                  `Image ${albumImage.id || index + 1}`,
                created_at: albumImage.created_at || new Date().toISOString()
              }))
          };
        }

        return undefined;
      })()
    };
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return {
        short: format(date, 'MMM dd'),
        time: format(date, 'h:mm a'),
        full: format(date, 'MMM dd, yyyy')
      };
    } catch (error) {
      return { short: 'Unknown', time: '', full: 'Date unknown' };
    }
  };

  return (
    <Card
      bg={bgColor}
      shadow="sm"
      borderRadius="xl"
      overflow="hidden"
      border="1px solid"
      borderColor={useColorModeValue('gray.100', 'gray.700')}
    >
      <CardBody p={{ base: 4, md: 6 }}>
        {/* Next-Level Mobile Header */}
        <VStack spacing={5} mb={6}>
          <VStack spacing={3} w="full">
            <HStack w="full" justify="space-between" align="start">
              <CardHeader pb={6}>
                <HStack spacing={3}>
                  <Circle size="40px" bg="blue.500" color="white">
                    <Icon as={MdTimeline} boxSize={5} />
                  </Circle>
                  <VStack spacing={0} align="start">
                    <Heading size="sm" color={textColor}>
                      Production Journey
                    </Heading>
                    <Text fontSize="sm" color={mutedColor}>
                      Transparent farming timeline
                    </Text>
                  </VStack>
                </HStack>
              </CardHeader>

              <Badge
                colorScheme="green"
                variant="subtle"
                fontSize="xs"
                px={3}
                py={1}
                borderRadius="full"
                fontWeight="600"
              >
                <HStack spacing={1}>
                  <Icon as={MdVerified} boxSize={3} />
                  <Text>
                    {filteredEvents.length} {filteredEvents.length === 1 ? 'Event' : 'Events'}
                  </Text>
                </HStack>
              </Badge>
            </HStack>

            {/* Enhanced Carbon Stats Dashboard */}
            <SimpleGrid columns={4} spacing={1.5} w="full">
              <VStack
                spacing={0.5}
                bg={useColorModeValue('blue.50', 'blue.900')}
                borderRadius="lg"
                py={2}
                px={1}
                border="1px solid"
                borderColor={useColorModeValue('blue.200', 'blue.700')}
                minW="0"
              >
                <Text fontSize="md" fontWeight="bold" color="blue.600">
                  {filteredEvents.length}
                </Text>
                <Text fontSize="2xs" color={mutedColor} textAlign="center" fontWeight="500" whiteSpace="nowrap">
                  Events
                </Text>
              </VStack>

              <VStack
                spacing={0.5}
                bg={useColorModeValue('green.50', 'green.900')}
                borderRadius="lg"
                py={2}
                px={1}
                border="1px solid"
                borderColor={useColorModeValue('green.200', 'green.700')}
                minW="0"
              >
                <Text fontSize="md" fontWeight="bold" color="green.600" whiteSpace="nowrap">
                  {(() => {
                    const totalCO2 = filteredEvents.reduce(
                      (sum, e) => sum + (e.carbon_data?.co2e || 0),
                      0
                    );

                    return formatCO2e(totalCO2).replace(/[+-]/, '');
                  })()}
                </Text>
                <CO2eTooltip>
                  <Text fontSize="2xs" color={mutedColor} textAlign="center" fontWeight="500" whiteSpace="nowrap">
                    CO₂e
                  </Text>
                </CO2eTooltip>
              </VStack>

              <VStack
                spacing={0.5}
                bg={useColorModeValue('purple.50', 'purple.900')}
                borderRadius="lg"
                py={2}
                px={1}
                border="1px solid"
                borderColor={useColorModeValue('purple.200', 'purple.700')}
                minW="0"
              >
                <Text fontSize="md" fontWeight="bold" color="purple.600" whiteSpace="nowrap">
                  {(() => {
                    const documentedEvents = filteredEvents.filter(
                      (e) =>
                        (e.album && e.album.images?.length > 0) ||
                        (e.albums && e.albums.length > 0) ||
                        e.extra_data?.photo_count > 0
                    );
                    return filteredEvents.length > 0
                      ? Math.round((documentedEvents.length / filteredEvents.length) * 100)
                      : 0;
                  })()}
                  %
                </Text>
                <BlockchainTooltip>
                  <Text fontSize="2xs" color={mutedColor} textAlign="center" fontWeight="500" whiteSpace="nowrap">
                    {intl.formatMessage({ id: 'transparency.withPhotos' })}
                  </Text>
                </BlockchainTooltip>
              </VStack>

              <VStack
                spacing={0.5}
                bg={useColorModeValue('orange.50', 'orange.900')}
                borderRadius="lg"
                py={2}
                px={1}
                border="1px solid"
                borderColor={useColorModeValue('orange.200', 'orange.700')}
                minW="0"
              >
                <Text fontSize="md" fontWeight="bold" color="orange.600">
                  {transparencyScore || 0}
                </Text>
                <CarbonScoreTooltip>
                  <Text fontSize="2xs" color={mutedColor} textAlign="center" fontWeight="500" whiteSpace="nowrap">
                    Score
                  </Text>
                </CarbonScoreTooltip>
              </VStack>
            </SimpleGrid>

            {/* Transparency Section */}
            {productionId && (
              <Box
                bg={useColorModeValue('green.50', 'green.900')}
                borderRadius="lg"
                p={4}
                border="1px solid"
                borderColor={useColorModeValue('green.200', 'green.700')}
                w="full"
              >
                <VStack spacing={3} align="stretch">
                  <Flex justify="space-between" align="center">
                    <Text fontSize="sm" fontWeight="semibold" color="green.800">
                      Documentation Transparency
                    </Text>
                    <Badge colorScheme="green" fontSize="xs" borderRadius="full">
                      {filteredEvents.length} Documented Events
                    </Badge>
                  </Flex>

                  <TransparencyIndicator
                    percentage={Math.min((filteredEvents.length / 15) * 100, 100)} // Assume 15 expected events
                    message={
                      filteredEvents.length >= 15
                        ? 'Complete transparency'
                        : filteredEvents.length >= 10
                        ? 'Good transparency'
                        : 'Basic transparency'
                    }
                    status={
                      filteredEvents.length >= 15
                        ? 'excellent'
                        : filteredEvents.length >= 10
                        ? 'good'
                        : 'minimum'
                    }
                    variant="compact"
                    size="sm"
                    showDetails={false}
                  />

                  <Text fontSize="xs" color="green.700">
                    Shows how completely this farm has documented their growing practices and
                    activities
                  </Text>
                </VStack>
              </Box>
            )}
          </VStack>

          {/* Minimalist Horizontal Event Type Filters */}
          {categories.length > 1 && (
            <Box w="full" overflowX="auto" pb={2}>
              <HStack spacing={2} minW="max-content" px={1}>
                {categories.map((category) => {
                  const getEventConfig = (cat: string) => {
                    if (!cat || typeof cat !== 'string') {
                      return { icon: MdTimeline, color: 'green.500' };
                    }
                    switch (cat.toLowerCase()) {
                      case 'all':
                        return { icon: MdTimeline, color: 'green.500' };
                      case 'weather':
                        return { icon: FaWater, color: 'cyan.500' };
                      case 'chemical':
                        return { icon: FaFlask, color: 'orange.500' };
                      case 'production':
                        return { icon: MdAgriculture, color: 'green.500' };
                      case 'equipment':
                        return { icon: FaTractor, color: 'blue.500' };
                      case 'soil management':
                        return { icon: FaSeedling, color: 'teal.500' };
                      case 'pest management':
                        return { icon: FaBug, color: 'red.500' };
                      case 'business':
                        return { icon: FaCertificate, color: 'yellow.600' };
                      default:
                        return { icon: MdEco, color: 'gray.500' };
                    }
                  };

                  const config = getEventConfig(category);
                  const isSelected =
                    selectedCategory === category ||
                    (category === 'all' && selectedCategory === 'all');

                  const categoryEvents =
                    category === 'all'
                      ? filteredEvents
                      : sortedEvents.filter((event) => {
                          const eventConfig = getEventConfig(event);
                          return (
                            eventConfig.category &&
                            typeof eventConfig.category === 'string' &&
                            category &&
                            typeof category === 'string' &&
                            eventConfig.category.toLowerCase() === category.toLowerCase()
                          );
                        });

                  const displayName = category === 'all' ? 'All' : category;
                  const eventCount = categoryEvents.length;

                  return (
                    <Button
                      key={category}
                      size="sm"
                      variant={isSelected ? 'solid' : 'outline'}
                      colorScheme={isSelected ? config.color.split('.')[0] : 'gray'}
                      bg={isSelected ? config.color : 'transparent'}
                      color={isSelected ? 'white' : useColorModeValue('gray.700', 'gray.300')}
                      borderColor={
                        isSelected ? config.color : useColorModeValue('gray.200', 'gray.600')
                      }
                      onClick={() => setSelectedCategory(category)}
                      transition="all 0.2s"
                      _hover={{
                        transform: 'translateY(-1px)',
                        shadow: 'sm',
                        bg: isSelected ? config.color : useColorModeValue('gray.50', 'gray.700')
                      }}
                      leftIcon={<Icon as={config.icon} boxSize={3} />}
                      minW="max-content"
                      fontSize="xs"
                      fontWeight="medium"
                      px={3}
                      py={2}
                      h="32px"
                    >
                      {displayName} {eventCount > 0 && `(${eventCount})`}
                    </Button>
                  );
                })}
              </HStack>
            </Box>
          )}
        </VStack>
      </CardBody>

      <CardBody pt={0} px={{ base: 0, md: 6 }} pb={{ base: 2, md: 6 }}>
        {/* Consumer-Friendly Event Cards - with grouping for repeated events */}
        <VStack spacing={{ base: 2, md: 4 }} align="stretch">
          {groupedDisplayEvents.map((item, groupIndex) => {
            if (item.kind === 'group') {
              const config = getEventConfig(item.events[0]);
              const isExpanded = expandedGroup === item.type;
              const totalEvents = item.events.length;

              // Compute summary metrics for the grouped events
              const subtypeNames = item.events.map((evt) => {
                const info = getConsumerEventDescription(evt.description, evt);
                return info.title;
              });
              // Deduplicate while preserving order
              const uniqueSubtypes = [...new Set(subtypeNames)];

              const blockchainCount = item.events.filter(
                (evt) =>
                  evt.blockchain_verified ||
                  evt.extra_data?.blockchain_verified
              ).length;

              const impactCounts = { high: 0, medium: 0, low: 0 };
              item.events.forEach((evt) => {
                const level = getSustainabilityImpact(evt.description, evt);
                impactCounts[level]++;
              });

              return (
                <Box key={`group-${item.type}`}>
                  <Box
                    bg={bgColor}
                    borderRadius="xl"
                    border="1px solid"
                    borderColor={isExpanded ? config.color : 'gray.200'}
                    overflow="hidden"
                    cursor="pointer"
                    onClick={() => toggleGroup(item.type)}
                    _hover={{ borderColor: config.color, shadow: 'md' }}
                    transition="all 0.2s"
                    shadow={isExpanded ? 'sm' : 'none'}
                  >
                    <Box p={4}>
                      {/* Row 1: Icon + Title + Date Range + Chevron */}
                      <HStack spacing={3}>
                        <Circle size="40px" bg={config.bgColor} flexShrink={0}>
                          <Icon as={config.icon} color={config.color} boxSize={4} />
                        </Circle>
                        <VStack align="start" spacing={0} flex={1}>
                          <HStack>
                            <Text fontWeight="bold" fontSize="sm" color={textColor}>
                              {totalEvents} {item.category} {totalEvents === 1 ? 'Event' : 'Events'}
                            </Text>
                            <Badge
                              colorScheme={config.categoryColor}
                              fontSize="2xs"
                              borderRadius="full"
                            >
                              {item.dateRange}
                            </Badge>
                          </HStack>
                        </VStack>
                        <Icon
                          as={isExpanded ? FaChevronUp : FaChevronDown}
                          color={mutedColor}
                          boxSize={3}
                          flexShrink={0}
                        />
                      </HStack>

                      {/* Row 2: Sub-event journey breadcrumb */}
                      <HStack mt={2} ml="52px" spacing={1} flexWrap="wrap">
                        {uniqueSubtypes.map((name, idx) => (
                          <React.Fragment key={name}>
                            <Text fontSize="xs" color={mutedColor} fontWeight="medium">
                              {name}
                            </Text>
                            {idx < uniqueSubtypes.length - 1 && (
                              <Text fontSize="xs" color="gray.400">›</Text>
                            )}
                          </React.Fragment>
                        ))}
                      </HStack>

                      {/* Row 3: Trust & Impact badges */}
                      <HStack mt={2} ml="52px" spacing={2} flexWrap="wrap">
                        {blockchainCount > 0 && (
                          <Badge
                            colorScheme="green"
                            fontSize="2xs"
                            borderRadius="full"
                            px={2}
                            py={0.5}
                          >
                            <HStack spacing={1}>
                              <Icon as={MdVerified} boxSize={2.5} />
                              <Text>
                                {blockchainCount === totalEvents
                                  ? 'ALL VERIFIED'
                                  : `${blockchainCount}/${totalEvents} VERIFIED`}
                              </Text>
                            </HStack>
                          </Badge>
                        )}
                        {impactCounts.high > 0 && (
                          <Badge
                            colorScheme="orange"
                            variant="subtle"
                            fontSize="2xs"
                            borderRadius="full"
                            px={2}
                            py={0.5}
                          >
                            {impactCounts.high} {intl.formatMessage({ id: 'transparency.corePractices' })}
                          </Badge>
                        )}
                        {impactCounts.medium > 0 && (
                          <Badge
                            colorScheme="blue"
                            variant="subtle"
                            fontSize="2xs"
                            borderRadius="full"
                            px={2}
                            py={0.5}
                          >
                            {impactCounts.medium} {intl.formatMessage({ id: 'transparency.standard' })}
                          </Badge>
                        )}
                        {impactCounts.low > 0 && impactCounts.high === 0 && impactCounts.medium === 0 && (
                          <Badge
                            colorScheme="green"
                            variant="subtle"
                            fontSize="2xs"
                            borderRadius="full"
                            px={2}
                            py={0.5}
                          >
                            {impactCounts.low} {intl.formatMessage({ id: 'transparency.supplementary' })}
                          </Badge>
                        )}
                      </HStack>

                      {/* Row 4: Expand hint */}
                      <Text fontSize="xs" color={mutedColor} mt={1.5} ml="52px">
                        {isExpanded ? 'Click to collapse' : `Click to see all ${totalEvents} events`}
                      </Text>
                    </Box>
                  </Box>

                  <Collapse in={isExpanded} animateOpacity>
                    <VStack
                      spacing={2}
                      mt={2}
                      ml={{ base: 0, md: 4 }}
                      pl={{ base: 2, md: 3 }}
                      borderLeft="3px solid"
                      borderColor={config.color}
                      align="stretch"
                    >
                      {item.events.map((event, eventIndex) => {
                        const enhancedEvent = buildEnhancedEvent(event);
                        return (
                          <ConsumerEventCard
                            key={event.id}
                            event={enhancedEvent}
                            isFirst={eventIndex === 0}
                            isLast={eventIndex === item.events.length - 1}
                            isGrouped
                            isExpanded={expandedEventId === event.id}
                            onToggleExpand={() => toggleEventExpand(event.id)}
                            productionBlockchain={productionBlockchain}
                          />
                        );
                      })}
                    </VStack>
                  </Collapse>
                </Box>
              );
            }

            // Single event rendering
            const event = item.event;
            const enhancedEvent = buildEnhancedEvent(event);
            return (
              <ConsumerEventCard
                key={event.id}
                event={enhancedEvent}
                isFirst={groupIndex === 0}
                isLast={groupIndex === groupedDisplayEvents.length - 1}
                isExpanded={expandedEventId === event.id}
                onToggleExpand={() => toggleEventExpand(event.id)}
                productionBlockchain={productionBlockchain}
              />
            );
          })}
        </VStack>

        {/* Show More Button */}
        {filteredEvents.length > 3 && (
          <Box mt={4} textAlign="center">
            <Button
              size="sm"
              variant="ghost"
              colorScheme="green"
              onClick={() => setShowAll(!showAll)}
              rightIcon={showAll ? <FaChevronUp /> : <FaChevronDown />}
            >
              {showAll ? 'Show Less' : `Show All ${filteredEvents.length} ${filteredEvents.length === 1 ? 'Event' : 'Events'}`}
            </Button>
          </Box>
        )}

        {/* Keep the original modal */}
        {selectedEvent && (
          <EnhancedEventDetailModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            event={{
              ...selectedEvent,
              carbon_data: selectedEvent.carbon_data
                ? {
                    ...selectedEvent.carbon_data,
                    calculation_method:
                      selectedEvent.carbon_data.calculation_method || 'USDA Standard Method',
                    verification_confidence:
                      selectedEvent.carbon_data.verification_confidence || 'medium'
                  }
                : undefined
            }}
          />
        )}
      </CardBody>
    </Card>
  );
};

export default UltraMobileProductionJourney;
