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
  FaBug
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
  EducationalTooltip,
  CO2eTooltip,
  USDATooltip,
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
  usda_verified: boolean;
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
  carbon_data?: CarbonCalculation;
  blockchain_verified?: boolean;
  blockchain_transaction?: string;
  blockchain_block_number?: number;
  blockchain_explorer_url?: string;
  blockchain_network?: string;
  verification_confidence?: number;
  verification_timestamp?: string;
  data_integrity_score?: number;
  usda_verified?: boolean;
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
}

export const UltraMobileProductionJourney: React.FC<UltraMobileProductionJourneyProps> = ({
  events,
  productionId,
  transparencyScore
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

    // Weather Events - Check event_type, type string, type codes, then description
    if (
      (event as any)?.event_type === 0 ||  // Direct event_type check
      type === 'weather' ||  // String type check
      ['fr', 'dr', 'hl', 'ht', 'ts', 'hw', 'hh', 'lh'].includes(type) ||  // Weather type codes
      type.includes('weather') ||
      description.includes('weather') ||
      description.includes('drought') ||
      description.includes('frost') ||
      description.includes('climate') ||
      description.includes('hail') ||
      description.includes('wind') ||
      description.includes('humidity') ||
      description.includes('temperature')
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
      (event as any)?.event_type === 2 ||  // Direct event_type check
      type === 'chemical' ||  // String type check
      ['fe', 'pe', 'fu', 'he'].includes(type) ||  // Chemical type codes
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
      (event as any)?.event_type === 1 ||  // Direct event_type check
      type === 'production' ||  // String type check
      ['pl', 'ha', 'ir', 'pr'].includes(type) ||  // Production type codes
      type.includes('production') ||
      description.includes('harvest') ||
      description.includes('planting') ||
      description.includes('bee') ||
      description.includes('irrigation') ||
      description.includes('pruning')
    ) {
      return {
        icon: MdAgriculture,
        color: 'green.500',
        bgColor: 'green.50',
        category: 'Production',
        categoryColor: 'green'
      };
    }

    // Equipment Events (event_type: 3) - Check event_type first, then type string, then type codes, then description
    if (
      (event as any)?.event_type === 3 ||  // Direct event_type check
      type === 'equipment' ||  // String type check
      ['mn', 're', 'ca', 'fc', 'bd', 'ei'].includes(type) ||  // Equipment type codes
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

    // Soil Management Events (event_type: 4) - Check event_type first, then type string, then type codes, then description
    if (
      (event as any)?.event_type === 4 ||  // Direct event_type check
      type === 'soil_management' ||  // String type check
      type === 'soil' ||  // Alternative string type check
      ['st', 'pa', 'om', 'cc', 'ti', 'co'].includes(type) ||  // Soil type codes
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

    // Pest Management Events (event_type: 5) - Check event_type first, then type string, then type codes, then description
    if (
      (event as any)?.event_type === 5 ||  // Direct event_type check
      type === 'pest_management' ||  // String type check
      type === 'pest' ||  // Alternative string type check
      ['sc', 'br', 'tm', 'pi', 'ta', 'ip'].includes(type) ||  // Pest type codes
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

    // Business Events (event_type: 6) - Check event_type first, then type string, then type codes, then description
    if (
      (event as any)?.event_type === 6 ||  // Direct event_type check
      type === 'business' ||  // String type check
      ['ce', 'cm', 'in'].includes(type) ||  // Business type codes
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
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() // Most recent first
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

  const displayedEvents = showAll ? filteredEvents : filteredEvents.slice(0, 3);
  const categories = [
    'all',
    ...new Set(
      events
        .map((event) => getEventConfig(event).category)
        .filter((cat) => cat && typeof cat === 'string')
    )
  ];

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
      borderColor={useColorModeValue('gray.100', 'gray.700')}>
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
                fontWeight="600">
                <HStack spacing={1}>
                  <Icon as={MdVerified} boxSize={3} />
                  <Text>
                    {filteredEvents.filter((e) => e.certified).length}/{filteredEvents.length}
                  </Text>
                </HStack>
              </Badge>
            </HStack>

            {/* Enhanced Carbon Stats Dashboard */}
            <SimpleGrid columns={4} spacing={2} w="full">
              <VStack
                spacing={1}
                bg={useColorModeValue('blue.50', 'blue.900')}
                borderRadius="lg"
                p={3}
                border="1px solid"
                borderColor={useColorModeValue('blue.200', 'blue.700')}>
                <Text fontSize="lg" fontWeight="bold" color="blue.600">
                  {filteredEvents.length}
                </Text>
                <Text fontSize="xs" color={mutedColor} textAlign="center" fontWeight="500">
                  Events
                </Text>
              </VStack>

              <VStack
                spacing={1}
                bg={useColorModeValue('green.50', 'green.900')}
                borderRadius="lg"
                p={3}
                border="1px solid"
                borderColor={useColorModeValue('green.200', 'green.700')}>
                <Text fontSize="lg" fontWeight="bold" color="green.600">
                  {(() => {
                    const totalCO2 = filteredEvents.reduce(
                      (sum, e) => sum + (e.carbon_data?.co2e || 0),
                      0
                    );
                    return formatCO2e(totalCO2).replace(/[+-]/, '');
                  })()}
                </Text>
                <CO2eTooltip>
                  <Text fontSize="xs" color={mutedColor} textAlign="center" fontWeight="500">
                    CO₂e
                  </Text>
                </CO2eTooltip>
              </VStack>

              <VStack
                spacing={1}
                bg={useColorModeValue('purple.50', 'purple.900')}
                borderRadius="lg"
                p={3}
                border="1px solid"
                borderColor={useColorModeValue('purple.200', 'purple.700')}>
                <Text fontSize="lg" fontWeight="bold" color="purple.600">
                  {(() => {
                    const verifiedEvents = filteredEvents.filter(
                      (e) => e.carbon_data?.usda_verified
                    );
                    return Math.round((verifiedEvents.length / filteredEvents.length) * 100) || 0;
                  })()}
                  %
                </Text>
                <USDATooltip>
                  <Text fontSize="xs" color={mutedColor} textAlign="center" fontWeight="500">
                    USDA
                  </Text>
                </USDATooltip>
              </VStack>

              <VStack
                spacing={1}
                bg={useColorModeValue('orange.50', 'orange.900')}
                borderRadius="lg"
                p={3}
                border="1px solid"
                borderColor={useColorModeValue('orange.200', 'orange.700')}>
                <Text fontSize="lg" fontWeight="bold" color="orange.600">
                  {transparencyScore || 0}
                </Text>
                <CarbonScoreTooltip>
                  <Text fontSize="xs" color={mutedColor} textAlign="center" fontWeight="500">
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
                w="full">
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
                      h="32px">
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
        {/* Consumer-Friendly Event Cards */}
        <VStack spacing={{ base: 2, md: 4 }} align="stretch">
          {displayedEvents.map((event, index) => {
            // Debug: Log the raw event data for blockchain events
            if (
              event.description.includes('no-till') ||
              event.description.includes('Zero-Disturbance')
            ) {
              console.log('🔍 RAW EVENT DATA:', {
                eventDescription: event.description,
                blockchain_verified: event.blockchain_verified,
                blockchain_transaction: event.blockchain_transaction,
                verification_confidence: event.verification_confidence,
                extra_data: event.extra_data,
                fullEvent: event
              });
            }

            // 🔧 FIX: Normalize event ID for photo lookups
            // Consumer API returns "chemical_152", producer API returns "152"
            // Strip type prefix to ensure consistent photo lookup
            const normalizedEventId = event.id.toString().includes('_') 
              ? event.id.toString().split('_')[1] 
              : event.id.toString();
            
            console.log('🔧 EVENT ID NORMALIZATION:', {
              originalId: event.id,
              normalizedId: normalizedEventId,
              hasAlbum: !!event.album
            });

            // DEBUG: Deep transparency fields analysis
            if (event.type?.includes('production')) {
              console.log('🔧 TRANSPARENCY FIELDS DEBUG - Raw API Event:', {
                eventId: event.id,
                eventType: event.type,
                area_covered: event.area_covered,
                yield_quantity: event.yield_quantity,
                fuel_consumed: event.fuel_consumed,
                equipment_hours: event.equipment_hours,
                hasAreaCovered: event.hasOwnProperty('area_covered'),
                hasYieldQuantity: event.hasOwnProperty('yield_quantity'),
                hasFuelConsumed: event.hasOwnProperty('fuel_consumed'),
                hasEquipmentHours: event.hasOwnProperty('equipment_hours'),
                fieldTypes: {
                  area_covered: typeof event.area_covered,
                  yield_quantity: typeof event.yield_quantity,
                  fuel_consumed: typeof event.fuel_consumed,
                  equipment_hours: typeof event.equipment_hours
                },
                allFields: Object.keys(event),
                fullEvent: event
              });
              
              // Also check if fields are being passed as different property names
              console.log('🔧 ALTERNATIVE FIELD NAMES CHECK:', {
                areaCovered: (event as any).areaCovered,
                yieldQuantity: (event as any).yieldQuantity,
                fuelConsumed: (event as any).fuelConsumed,
                equipmentHours: (event as any).equipmentHours,
                production_data: (event as any).production_data,
                transparency_data: (event as any).transparency_data,
                fields: (event as any).fields,
                metadata: (event as any).metadata,
                extra_data: event.extra_data
              });
            }

            // Enhanced event with comprehensive blockchain verification data
            const enhancedEvent = {
              ...event,
              // Use normalized ID for consistent photo lookups
              id: normalizedEventId,
              // Blockchain verification from extra_data or direct fields
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
              // USDA verification from carbon_data or direct field
              usda_verified: event.carbon_data?.usda_verified || event.usda_verified || false,
              // Carbon impact
              carbon_impact: event.carbon_data?.co2e,
              // Keep certification separate from blockchain verification
              certified: event.certified || false,
              // 🔧 TRANSPARENCY FIELDS: Preserve transparency fields from API
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
              // 📸 ALBUM FIX: Convert albums array to album object format
              // Backend TimelineService returns 'albums' array, frontend expects 'album' object
              album: (() => {
                console.log('📸 ALBUM MAPPING DEBUG:', {
                  eventId: event.id,
                  hasAlbumsField: 'albums' in event,
                  albumsValue: event.albums,
                  albumsLength: event.albums ? event.albums.length : 0
                });
                
                return event.albums && event.albums.length > 0 ? {
                  id: 'album_' + normalizedEventId, // Create consistent album ID
                  images: event.albums.map(albumImage => ({
                    id: albumImage.id.toString(),
                    image: albumImage.image_url, // Use image_url from TimelineService
                    caption: albumImage.title || `Image ${albumImage.id}`,
                    created_at: new Date().toISOString() // Fallback date
                  }))
                } : undefined;
              })()
            };


            // Debug: Log the enhanced event for blockchain events
            if (
              event.description.includes('no-till') ||
              event.description.includes('Zero-Disturbance')
            ) {
              console.log('🔍 ENHANCED EVENT DATA:', {
                eventDescription: enhancedEvent.description,
                blockchain_verified: enhancedEvent.blockchain_verified,
                blockchain_transaction: enhancedEvent.blockchain_transaction,
                verification_confidence: enhancedEvent.verification_confidence,
                extra_data: enhancedEvent.extra_data
              });
            }

            return (
              <ConsumerEventCard
                key={event.id}
                event={enhancedEvent}
                isFirst={index === 0}
                isLast={index === displayedEvents.length - 1}
              />
            );
          })}
        </VStack>

        {/* Show More Button - Keep original implementation */}
        {filteredEvents.length > 3 && (
          <Box mt={4} textAlign="center">
            <Button
              size="sm"
              variant="ghost"
              colorScheme="green"
              onClick={() => setShowAll(!showAll)}
              rightIcon={showAll ? <FaChevronUp /> : <FaChevronDown />}>
              {showAll ? 'Show Less' : `Show ${filteredEvents.length - 3} More Events`}
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
