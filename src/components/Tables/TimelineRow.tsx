import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
  useDisclosure,
  HStack,
  VStack,
  Badge,
  Circle,
  Tooltip,
  Avatar,
  useBreakpointValue,
  Card,
  CardBody
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import {
  FaEllipsisH,
  FaWater,
  FaLeaf,
  FaTractor,
  FaFlask,
  FaSeedling,
  FaInfoCircle,
  FaDollarSign,
  FaChartLine,
  FaEye,
  FaCalendarAlt,
  FaUser,
  FaSun,
  FaRegCheckCircle,
  FaRegDotCircle,
  FaTint,
  FaEyeSlash,
  FaMinus
} from 'react-icons/fa';
import { MdEco } from 'react-icons/md';

// Real interfaces matching API data
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
  carbon_data?: CarbonCalculationResult;
}

interface TimelineRowProps {
  logo: any;
  title: string;
  date: string;
  color: string;
  isLast?: boolean;
  url: string;
  type?: string;
  event: Event;
  members: Member[];
  onEventClick?: (event: Event) => void;
}

// Real carbon calculation result from API
interface CarbonCalculationResult {
  co2e: number;
  efficiency_score: number;
  usda_factors_based?: boolean;
  verification_status?: string;
  data_source?: string;
  calculation_method: string;
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

// Get event configuration for UI display
const getEventConfig = (type: string, description: string) => {
  const desc = description.toLowerCase();

  if (desc.includes('riego') || desc.includes('irrigation') || type.includes('irrigation')) {
    return {
      icon: FaTint,
      color: 'blue.500',
      category: 'Water Management'
    };
  }

  if (type.includes('chemical') || desc.includes('fertilizer') || desc.includes('pesticide')) {
    return {
      icon: FaFlask,
      color: 'orange.500',
      category: 'Chemical Application'
    };
  }

  if (desc.includes('harvest') || desc.includes('cosecha') || desc.includes('production')) {
    return {
      icon: FaSeedling,
      color: 'green.500',
      category: 'Production'
    };
  }

  if (desc.includes('weather') || desc.includes('climate') || desc.includes('temperature')) {
    return {
      icon: FaSun,
      color: 'purple.500',
      category: 'Weather Event'
    };
  }

  // Default configuration
  return {
    icon: FaLeaf,
    color: 'green.500',
    category: 'Farm Activity'
  };
};

// Extract real data from event observation field
const extractEventData = (event: Event) => {
  const observation = event.observation || '';

  // Extract duration (hours)
  const durationMatch = observation.match(/(\d+)\s*hour/i);
  const duration = durationMatch ? parseInt(durationMatch[1]) : null;

  // Extract amounts (kg, lbs, liters)
  const amountMatch = observation.match(/(\d+)\s*(kg|lbs?|liters?|l)/i);
  const amount = amountMatch ? parseInt(amountMatch[1]) : null;
  const unit = amountMatch ? amountMatch[2] : null;

  return {
    duration,
    amount,
    unit,
    hasQuantifiableData: duration !== null || amount !== null
  };
};

// Get operator name from members array
const getOperatorName = (event: Event, members: Member[]) => {
  const operator = members.find((member) => member.id === event.created_by);
  return operator ? operator.full_name : 'Unknown Operator';
};

// Determine QR visibility based on event type (consumer relevance)
const getQRVisibility = (event: Event): 'high' | 'medium' | 'low' => {
  const desc = event.description.toLowerCase();
  const type = event.type.toLowerCase();

  // High visibility for consumer-relevant activities
  if (type.includes('chemical') || desc.includes('pesticide') || desc.includes('fertilizer')) {
    return 'high'; // Consumers care about chemical use
  }

  if (desc.includes('harvest') || desc.includes('cosecha') || desc.includes('organic')) {
    return 'high'; // Harvest and organic practices
  }

  if (desc.includes('irrigation') || desc.includes('riego')) {
    return 'medium'; // Water management
  }

  return 'low'; // Other activities
};

function TimelineRow(props: TimelineRowProps) {
  const { logo, title, date, color, isLast, url, type, event, members, onEventClick } = props;
  const menuButtonRef = useRef();
  const textColor = useColorModeValue('gray.700', 'white.300');
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const navigate = useNavigate();
  
  // State to handle timeline rendering after mount
  const [isMounted, setIsMounted] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Mobile responsiveness
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Use embedded carbon data instead of API calls
  const carbonData = event.carbon_data || null;
  const dataLoaded = !!event.carbon_data;

  // Get event configuration
  const eventConfig = getEventConfig(event.type, event.description);

  // Extract real data from event
  const eventData = extractEventData(event);
  const operatorName = getOperatorName(event, members);
  const qrVisibility = getQRVisibility(event);
  
  // Force re-render after mount to fix timeline positioning
  useEffect(() => {
    // Small delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 10);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box position="relative" mb={isMobile ? 3 : 4} w="100%" ref={timelineRef}>
      {/* Timeline Connector Line - Hide on mobile for cleaner look */}
      {!isLast && !isMobile && isMounted && (
        <Box
          position="absolute"
          left="19px"
          top="42px"  // Center of 40px circle + small offset
          w="3px"
          h={`calc(100% - 2px)`}  // Dynamic height calculation
          bg={useColorModeValue('gray.200', 'gray.600')}
          borderRadius="full"
          zIndex={0}
          opacity={isMounted ? 1 : 0}
          transition="opacity 0.2s ease-in-out"
        />
      )}
      
      <HStack spacing={isMobile ? 0 : 4} align="flex-start" w="100%">
        {/* Timeline Icon Column - Hidden on mobile to save space */}
        {!isMobile && (
          <VStack spacing={0} align="center" minW="40px" position="relative" zIndex={1} mt="2px">
            <Circle
              size="40px"
              bg={useColorModeValue('white', 'gray.800')}
              borderWidth="3px"
              borderColor={eventConfig.color}
              color={eventConfig.color}
              boxShadow="0 0 0 4px white, 0 0 0 5px #E2E8F0"
              _hover={{
                boxShadow: `0 0 0 4px white, 0 0 0 5px ${eventConfig.color}`
              }}
              transition="all 0.2s ease"
            >
              <Icon as={eventConfig.icon} boxSize={5} />
            </Circle>
          </VStack>
        )}

        {/* Event Card - Modern Clean Design */}
        <Card
          flex={1}
          bg={bgColor}
          borderRadius="xl"
          boxShadow="sm"
          border="1px solid"
          borderColor={borderColor}
          cursor="pointer"
          transition="all 0.2s ease"
          position="relative"
          _hover={{
            bg: hoverBg,
            transform: 'translateY(-1px)',
            boxShadow: 'md',
            borderColor: eventConfig.color
          }}
          onClick={() => (onEventClick ? onEventClick(event) : navigate(url))}
          className="trazo-card"
        >
        <CardBody p={isMobile ? 3 : 4}>
          <VStack align="stretch" spacing={isMobile ? 2 : 3}>
            {/* Header Row - Title and Date */}
            <HStack justify="space-between" align="flex-start">
              <HStack spacing={2} flex={1}>
                {/* Mobile: Compact icon indicator to replace left emoji */}
                {isMobile && (
                  <Circle
                    size="24px"
                    bg={eventConfig.color}
                    color="white"
                    flexShrink={0}
                  >
                    <Icon as={eventConfig.icon} boxSize={3} />
                  </Circle>
                )}
                <VStack align="flex-start" spacing={1} flex={1}>
                  <Text fontSize="sm" fontWeight="600" color={textColor} noOfLines={1}>
                    {title}
                  </Text>
                  <Badge
                    colorScheme={eventConfig.color.split('.')[0]}
                    variant="subtle"
                    fontSize="xs"
                    borderRadius="full"
                    px={2}
                    py={1}
                  >
                    {eventConfig.category}
                  </Badge>
                </VStack>
              </HStack>
              <Text fontSize="xs" color="gray.500" fontWeight="medium" minW="fit-content">
                {date}
              </Text>
            </HStack>

            {/* Description */}
            <Text fontSize="xs" color="gray.600" lineHeight="tall">
              {event.observation || 'No additional details'}
            </Text>

            {/* Operator Info */}
            <HStack spacing={2}>
              <Text fontSize="xs" color="gray.500" fontWeight="medium">
                Operator:
              </Text>
              <Text fontSize="xs" color="gray.600">
                {operatorName}
              </Text>
            </HStack>

            {/* Metrics Row - Consistent Layout */}
            <HStack spacing={isMobile ? 2 : 3} wrap="wrap" justify="flex-start">
              {/* Carbon Impact */}
              {carbonData && !carbonData.error ? (
                <Tooltip
                  label={`Carbon Impact: ${carbonData.co2e > 0 ? '+' : ''}${carbonData.co2e} kg CO₂e${
                    carbonData.verification_status === 'usda_certified'
                      ? ' (USDA Certified)'
                      : carbonData.usda_factors_based ||
                        carbonData.verification_status === 'factors_verified'
                      ? ' (USDA Factors)'
                      : ''
                  }`}
                >
                  <HStack spacing={1}>
                    <Badge
                      colorScheme={carbonData.co2e < 0 ? 'green' : 'orange'}
                      variant="subtle"
                      fontSize="xs"
                      borderRadius="md"
                      px={2}
                      py={1}
                    >
                      {carbonData.co2e > 0 ? '+' : ''}
                      {carbonData.co2e} kg CO₂
                    </Badge>
                    {(carbonData.verification_status === 'usda_certified' ||
                      carbonData.usda_factors_based ||
                      carbonData.verification_status === 'factors_verified') && (
                      <Badge
                        colorScheme={
                          carbonData.verification_status === 'usda_certified' ? 'green' : 'blue'
                        }
                        variant="solid"
                        fontSize="xs"
                        borderRadius="md"
                        px={2}
                        py={1}
                      >
                        {carbonData.verification_status === 'usda_certified'
                          ? 'USDA'
                          : 'USDA Factors'}
                      </Badge>
                    )}
                  </HStack>
                </Tooltip>
              ) : (
                <Badge 
                  variant="outline" 
                  fontSize="xs" 
                  colorScheme="gray"
                  borderRadius="md"
                  px={2}
                  py={1}
                >
                  No CO₂ data
                </Badge>
              )}

              {/* Cost Analysis */}
              {carbonData?.cost_analysis?.estimated_cost && (
                <Tooltip label={`Estimated Cost: $${carbonData.cost_analysis.estimated_cost}`}>
                  <Badge
                    colorScheme="purple"
                    variant="subtle"
                    fontSize="xs"
                    borderRadius="md"
                    px={2}
                    py={1}
                  >
                    ${carbonData.cost_analysis.estimated_cost}
                  </Badge>
                </Tooltip>
              )}

              {/* QR Visibility */}
              <Tooltip
                label={`QR Code Visibility: ${qrVisibility} - Consumer relevance level`}
              >
                <HStack spacing={1}>
                  <Icon
                    as={
                      qrVisibility === 'high'
                        ? FaEye
                        : qrVisibility === 'medium'
                        ? FaMinus
                        : FaEyeSlash
                    }
                    color={
                      qrVisibility === 'high'
                        ? 'green.500'
                        : qrVisibility === 'medium'
                        ? 'yellow.500'
                        : 'gray.400'
                    }
                    boxSize="10px"
                  />
                  <Text fontSize="xs" color="gray.500" textTransform="capitalize">
                    {qrVisibility}
                  </Text>
                </HStack>
              </Tooltip>

              {/* Efficiency Score */}
              {carbonData?.efficiency_score && carbonData.efficiency_score > 0 && (
                <Tooltip label={`Efficiency Score: ${carbonData.efficiency_score}/100`}>
                  <Badge
                    colorScheme={
                      carbonData.efficiency_score >= 70
                        ? 'green'
                        : carbonData.efficiency_score >= 50
                        ? 'yellow'
                        : 'red'
                    }
                    variant="subtle"
                    fontSize="xs"
                    borderRadius="md"
                    px={2}
                    py={1}
                  >
                    {carbonData.efficiency_score}/100
                  </Badge>
                </Tooltip>
              )}
            </HStack>

            {/* Data Source Footer */}
            {carbonData && (
              <HStack spacing={1} justify="flex-start">
                <Text fontSize="xs" color="gray.400">
                  {carbonData.verification_status === 'usda_certified'
                    ? '✓ USDA Certified Data'
                    : carbonData.verification_status === 'factors_verified' ||
                      carbonData.usda_factors_based
                    ? '📊 USDA Factors Used'
                    : carbonData.error
                    ? '⚠ Data Unavailable'
                    : '📈 Calculated Estimate'}
                </Text>
              </HStack>
            )}
          </VStack>
        </CardBody>
      </Card>
      </HStack>
    </Box>
  );
}

export default TimelineRow;