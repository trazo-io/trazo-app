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
  SimpleGrid
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
  FaBalanceScale
} from 'react-icons/fa';
import { MdTimeline, MdEco, MdVerified, MdAgriculture } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { format, parseISO } from 'date-fns';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';

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
}

interface UltraMobileProductionJourneyProps {
  events: TimelineEvent[];
}

export const UltraMobileProductionJourney: React.FC<UltraMobileProductionJourneyProps> = ({
  events
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

  // Get event configuration based on type
  const getEventConfig = (event: TimelineEvent) => {
    const type = event.type.toLowerCase();
    const description = event.description.toLowerCase();

    if (
      type.includes('chemical') ||
      description.includes('fertilizer') ||
      description.includes('spray')
    ) {
      return {
        icon: FaFlask,
        color: 'orange.500',
        bgColor: 'orange.50',
        category: 'Chemical',
        categoryColor: 'orange'
      };
    }

    if (
      type.includes('production') ||
      description.includes('harvest') ||
      description.includes('planting') ||
      description.includes('bee')
    ) {
      return {
        icon: MdAgriculture,
        color: 'green.500',
        bgColor: 'green.50',
        category: 'Production',
        categoryColor: 'green'
      };
    }

    if (
      type.includes('equipment') ||
      description.includes('tractor') ||
      description.includes('machinery')
    ) {
      return {
        icon: FaTractor,
        color: 'blue.500',
        bgColor: 'blue.50',
        category: 'Equipment',
        categoryColor: 'blue'
      };
    }

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
          return config.category.toLowerCase() === selectedCategory.toLowerCase();
        });

  const displayedEvents = showAll ? filteredEvents : filteredEvents.slice(0, 3);
  const categories = ['all', ...new Set(events.map((event) => getEventConfig(event).category))];

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
                <Text fontSize="xs" color={mutedColor} textAlign="center" fontWeight="500">
                  CO₂e
                </Text>
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
                <Text fontSize="xs" color={mutedColor} textAlign="center" fontWeight="500">
                  USDA
                </Text>
              </VStack>

              <VStack
                spacing={1}
                bg={useColorModeValue('orange.50', 'orange.900')}
                borderRadius="lg"
                p={3}
                border="1px solid"
                borderColor={useColorModeValue('orange.200', 'orange.700')}>
                <Text fontSize="lg" fontWeight="bold" color="orange.600">
                  {(() => {
                    const avgEfficiency =
                      filteredEvents.reduce(
                        (sum, e) => sum + (e.carbon_data?.efficiency_score || 0),
                        0
                      ) / filteredEvents.length;
                    return Math.round(avgEfficiency) || 0;
                  })()}
                </Text>
                <Text fontSize="xs" color={mutedColor} textAlign="center" fontWeight="500">
                  Score
                </Text>
              </VStack>
            </SimpleGrid>
          </VStack>

          {/* Modernized Category Pills */}
          {categories.length > 1 && (
            <HStack spacing={2} w="full" overflowX="auto" pb={1}>
              <Button
                size="sm"
                variant={selectedCategory === 'all' ? 'solid' : 'ghost'}
                colorScheme="blue"
                onClick={() => setSelectedCategory('all')}
                borderRadius="full"
                fontSize="xs"
                minW="fit-content"
                h="32px"
                px={4}
                _hover={{
                  transform: 'translateY(-1px)',
                  shadow: 'sm'
                }}
                transition="all 0.2s">
                All
              </Button>
              {categories.slice(1, 4).map((category) => (
                <Button
                  key={category}
                  size="sm"
                  variant={selectedCategory === category ? 'solid' : 'ghost'}
                  colorScheme="gray"
                  onClick={() => setSelectedCategory(category)}
                  borderRadius="full"
                  fontSize="xs"
                  minW="fit-content"
                  h="32px"
                  px={4}
                  _hover={{
                    transform: 'translateY(-1px)',
                    shadow: 'sm'
                  }}
                  transition="all 0.2s">
                  {category}
                </Button>
              ))}
            </HStack>
          )}
        </VStack>
      </CardBody>

      <CardBody pt={0}>
        {/* Next-Level Event Cards */}
        <VStack spacing={2} align="stretch">
          {displayedEvents.map((event, index) => {
            const config = getEventConfig(event);
            const dateInfo = formatDate(event.date);

            return (
              <Card
                // className="trazo-card-production-journey"
                key={event.id}
                bg={config.bgColor}
                borderLeft="4px solid"
                borderColor={config.color}
                shadow="xs"
                borderRadius="lg"
                overflow="hidden"
                cursor="pointer"
                position="relative"
                _hover={{
                  shadow: 'md',
                  transform: 'translateY(-2px)',
                  borderLeftWidth: '6px',
                  transition: 'all 0.3s ease'
                }}
                _active={{
                  transform: 'translateY(0px)',
                  transition: 'all 0.1s ease'
                }}
                onClick={() => handleEventClick(event)}>
                {/* Timeline connector */}
                {index < displayedEvents.length - 1 && (
                  <Box
                    position="absolute"
                    left="30px"
                    bottom="-10px"
                    width="2px"
                    height="10px"
                    bg="gray.300"
                    zIndex={1}
                  />
                )}

                <CardBody>
                  {/* Next-Level Carbon-Rich Layout */}
                  <VStack spacing={3} align="stretch">
                    {/* Header Row with Carbon Impact */}
                    <HStack spacing={3} align="start">
                      {/* Timeline Icon */}
                      <Circle
                        size="36px"
                        bg={config.color}
                        color="white"
                        flexShrink={0}
                        position="relative"
                        zIndex={2}>
                        <Icon as={config.icon} boxSize={4} />
                      </Circle>

                      {/* Main Content */}
                      <VStack align="start" spacing={1} flex="1" minW="0">
                        <HStack w="full" justify="space-between" align="start">
                          <VStack align="start" spacing={1} flex="1" minW="0">
                            <Text
                              fontSize="sm"
                              fontWeight="600"
                              color={textColor}
                              noOfLines={2}
                              lineHeight="1.3">
                              {event.description}
                            </Text>

                            {/* Enhanced badges with carbon info */}
                            <HStack spacing={1} flexWrap="wrap">
                              <Badge
                                colorScheme={config.categoryColor}
                                size="sm"
                                borderRadius="full"
                                fontSize="xs"
                                variant="subtle">
                                {config.category}
                              </Badge>
                              {event.carbon_data?.usda_verified && (
                                <Badge
                                  colorScheme="blue"
                                  size="sm"
                                  borderRadius="full"
                                  variant="solid">
                                  <HStack spacing={1}>
                                    <Icon as={FaShieldAlt} boxSize={2} />
                                    <Text fontSize="xs">USDA</Text>
                                  </HStack>
                                </Badge>
                              )}
                              {event.certified && (
                                <Badge
                                  colorScheme="green"
                                  size="sm"
                                  borderRadius="full"
                                  variant="solid">
                                  <HStack spacing={1}>
                                    <Icon as={MdVerified} boxSize={2} />
                                    <Text fontSize="xs">✓</Text>
                                  </HStack>
                                </Badge>
                              )}
                            </HStack>
                          </VStack>

                          {/* Carbon Impact Badge */}
                          {event.carbon_data?.co2e !== undefined && (
                            <VStack spacing={0} align="end" flexShrink={0}>
                              <HStack spacing={1}>
                                <Icon
                                  as={event.carbon_data.co2e < 0 ? FaArrowDown : FaArrowUp}
                                  boxSize={2.5}
                                  color={event.carbon_data.co2e < 0 ? 'green.500' : 'red.500'}
                                />
                                <Text
                                  fontSize="sm"
                                  fontWeight="bold"
                                  color={event.carbon_data.co2e < 0 ? 'green.600' : 'red.600'}>
                                  {formatCO2e(event.carbon_data.co2e)}
                                </Text>
                              </HStack>
                              <Text fontSize="xs" color={mutedColor}>
                                CO₂e
                              </Text>
                            </VStack>
                          )}
                        </HStack>

                        {/* Date and Time */}
                        <HStack spacing={2} w="full">
                          <Icon as={FaCalendarAlt} boxSize={2.5} color={mutedColor} />
                          <Text fontSize="xs" color={mutedColor} fontWeight="500">
                            {dateInfo.full}
                            {dateInfo.time && ` at ${dateInfo.time}`}
                          </Text>
                        </HStack>
                      </VStack>
                    </HStack>

                    {/* Carbon Metrics Row */}
                    {event.carbon_data && (
                      <VStack spacing={2} w="full">
                        {/* Efficiency and Verification */}
                        <HStack w="full" justify="space-between" align="center">
                          {/* Efficiency Score */}
                          {event.carbon_data.efficiency_score !== undefined && (
                            <HStack spacing={2} flex={1}>
                              <Circle
                                size="20px"
                                bg={`${getEfficiencyColor(
                                  event.carbon_data.efficiency_score
                                )}.100`}>
                                <Icon
                                  as={FaBalanceScale}
                                  boxSize={2.5}
                                  color={`${getEfficiencyColor(
                                    event.carbon_data.efficiency_score
                                  )}.600`}
                                />
                              </Circle>
                              <VStack spacing={0} align="start">
                                <Text fontSize="xs" color={mutedColor} fontWeight="500">
                                  Efficiency
                                </Text>
                                <Text
                                  fontSize="sm"
                                  fontWeight="bold"
                                  color={`${getEfficiencyColor(
                                    event.carbon_data.efficiency_score
                                  )}.600`}>
                                  {event.carbon_data.efficiency_score}%
                                </Text>
                              </VStack>
                            </HStack>
                          )}

                          {/* Verification Confidence */}
                          {event.carbon_data.verification_confidence && (
                            <HStack spacing={2} flex={1}>
                              <Circle size="20px" bg="purple.100">
                                <Icon
                                  as={getConfidenceIcon(event.carbon_data.verification_confidence)}
                                  boxSize={2.5}
                                  color="purple.600"
                                />
                              </Circle>
                              <VStack spacing={0} align="start">
                                <Text fontSize="xs" color={mutedColor} fontWeight="500">
                                  Confidence
                                </Text>
                                <Text
                                  fontSize="sm"
                                  fontWeight="bold"
                                  color="purple.600"
                                  textTransform="capitalize">
                                  {event.carbon_data.verification_confidence}
                                </Text>
                              </VStack>
                            </HStack>
                          )}
                        </HStack>

                        {/* Cost Analysis */}
                        {event.carbon_data.cost_analysis && (
                          <HStack
                            w="full"
                            justify="space-between"
                            align="center"
                            bg={useColorModeValue('gray.50', 'gray.700')}
                            borderRadius="md"
                            p={2}>
                            <VStack spacing={0} align="start" flex={1}>
                              <Text fontSize="xs" color={mutedColor} fontWeight="500">
                                Cost Impact
                              </Text>
                              <Text fontSize="sm" fontWeight="bold" color={textColor}>
                                ${event.carbon_data.cost_analysis.estimated_cost.toFixed(2)}
                              </Text>
                            </VStack>
                            <VStack spacing={0} align="end" flex={1}>
                              <Text fontSize="xs" color={mutedColor} fontWeight="500">
                                $/kg CO₂e
                              </Text>
                              <Text fontSize="sm" fontWeight="bold" color="orange.600">
                                ${event.carbon_data.cost_analysis.cost_per_co2e.toFixed(2)}
                              </Text>
                            </VStack>
                          </HStack>
                        )}

                        {/* Calculation Method */}
                        {event.carbon_data.calculation_method && (
                          <HStack spacing={2} w="full">
                            <Icon as={FaFlask} boxSize={2.5} color={mutedColor} />
                            <Text fontSize="xs" color={mutedColor} fontWeight="500">
                              Method: {event.carbon_data.calculation_method}
                            </Text>
                          </HStack>
                        )}
                      </VStack>
                    )}

                    {/* Description */}
                    {event.observation && (
                      <Text
                        fontSize="xs"
                        color={mutedColor}
                        noOfLines={2}
                        lineHeight="1.4"
                        bg={useColorModeValue('gray.50', 'gray.700')}
                        p={2}
                        borderRadius="md"
                        borderLeft="3px solid"
                        borderColor={config.color}>
                        {event.observation}
                      </Text>
                    )}

                    {/* Technical Metadata */}
                    {(event.volume || event.area || event.concentration || event.equipment) && (
                      <SimpleGrid columns={2} spacing={2} fontSize="xs" w="full">
                        {event.volume && (
                          <HStack spacing={1} justify="space-between">
                            <Text color={mutedColor} fontWeight="500">
                              Volume:
                            </Text>
                            <Text color={textColor} fontWeight="600">
                              {event.volume}
                            </Text>
                          </HStack>
                        )}
                        {event.area && (
                          <HStack spacing={1} justify="space-between">
                            <Text color={mutedColor} fontWeight="500">
                              Area:
                            </Text>
                            <Text color={textColor} fontWeight="600">
                              {event.area}
                            </Text>
                          </HStack>
                        )}
                        {event.concentration && (
                          <HStack spacing={1} justify="space-between">
                            <Text color={mutedColor} fontWeight="500">
                              Conc:
                            </Text>
                            <Text color={textColor} fontWeight="600">
                              {event.concentration}
                            </Text>
                          </HStack>
                        )}
                        {event.equipment && (
                          <HStack spacing={1} justify="space-between">
                            <Text color={mutedColor} fontWeight="500">
                              Equipment:
                            </Text>
                            <Text color={textColor} fontWeight="600" noOfLines={1}>
                              {event.equipment}
                            </Text>
                          </HStack>
                        )}
                      </SimpleGrid>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            );
          })}
        </VStack>

        {/* Enhanced Show More Button */}
        {filteredEvents.length > 3 && (
          <Flex justify="center" mt={4} px={4}>
            <Button
              variant="ghost"
              colorScheme="blue"
              leftIcon={<Icon as={showAll ? FaChevronUp : FaChevronDown} />}
              onClick={() => setShowAll(!showAll)}
              size="sm"
              borderRadius="full"
              px={6}
              fontSize="xs"
              fontWeight="500"
              _hover={{
                bg: 'blue.50',
                transform: 'translateY(-1px)'
              }}
              transition="all 0.2s">
              {showAll ? 'Show Less' : `View ${filteredEvents.length - 3} More`}
            </Button>
          </Flex>
        )}

        {/* Empty State */}
        {filteredEvents.length === 0 && (
          <VStack spacing={4} py={8} textAlign="center">
            <Circle size="60px" bg="gray.100">
              <Icon as={MdTimeline} boxSize={6} color="gray.400" />
            </Circle>
            <VStack spacing={1}>
              <Heading size="sm" color="gray.600">
                No activities found
              </Heading>
              <Text fontSize="xs" color="gray.500" maxW="200px">
                {selectedCategory === 'all'
                  ? 'No production activities recorded yet.'
                  : `No ${selectedCategory.toLowerCase()} activities found.`}
              </Text>
            </VStack>
          </VStack>
        )}
      </CardBody>

      {/* Enhanced Event Detail Modal */}
      {selectedEvent && (
        <EnhancedEventDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          event={selectedEvent}
        />
      )}
    </Card>
  );
};
