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
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Grid,
  GridItem,
  Divider,
  SimpleGrid,
  Progress,
  Tag,
  TagLabel,
  TagLeftIcon
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
  FaMinus,
  FaCamera,
  FaRulerCombined,
  FaClock,
  FaWeightHanging,
  FaThermometerHalf,
  FaCloudRain,
  FaGasPump,
  FaCog,
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaCertificate,
  FaStar,
  FaCircle
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
  // Type-specific fields
  [key: string]: any;
}

interface EnhancedTimelineRowProps {
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
  usda_verified?: boolean;
}

// Enhanced event configuration for better categorization
const getEventConfig = (eventType: number, type: string, description: string) => {
  switch (eventType) {
    case 0: // Weather Event
      return {
        icon: FaSun,
        color: 'purple.500',
        category: 'Weather Event',
        bgGradient: 'linear(to-r, purple.50, purple.100)',
        borderColor: 'purple.200'
      };
    case 1: // Production Event
      return {
        icon: FaSeedling,
        color: 'green.500',
        category: 'Production Activity',
        bgGradient: 'linear(to-r, green.50, green.100)',
        borderColor: 'green.200'
      };
    case 2: // Chemical Event
      return {
        icon: FaFlask,
        color: 'orange.500',
        category: 'Chemical Application',
        bgGradient: 'linear(to-r, orange.50, orange.100)',
        borderColor: 'orange.200'
      };
    case 3: // Other Farm Activities (Sprint 2: renamed from General Event)
      return {
        icon: FaLeaf,
        color: 'gray.500',
        category: 'Other Farm Activity',
        bgGradient: 'linear(to-r, gray.50, gray.100)',
        borderColor: 'gray.200'
      };
    case 4: // Equipment Event
      return {
        icon: FaTractor,
        color: 'blue.500',
        category: 'Equipment Operation',
        bgGradient: 'linear(to-r, blue.50, blue.100)',
        borderColor: 'blue.200'
      };
    case 5: // Soil Management
      return {
        icon: FaMapMarkerAlt,
        color: 'brown.500',
        category: 'Soil Management',
        bgGradient: 'linear(to-r, yellow.50, yellow.100)',
        borderColor: 'yellow.300'
      };
    case 6: // Pest Management
      return {
        icon: FaLeaf,
        color: 'red.500',
        category: 'Pest Management',
        bgGradient: 'linear(to-r, red.50, red.100)',
        borderColor: 'red.200'
      };
    case 7: // Business Event
      return {
        icon: FaDollarSign,
        color: 'cyan.500',
        category: 'Business Activity',
        bgGradient: 'linear(to-r, cyan.50, cyan.100)',
        borderColor: 'cyan.200'
      };
    default:
      return {
        icon: FaLeaf,
        color: 'gray.500',
        category: 'Farm Activity',
        bgGradient: 'linear(to-r, gray.50, gray.100)',
        borderColor: 'gray.200'
      };
  }
};

// Enhanced field extraction based on event type
const extractEventFields = (event: Event) => {
  const fields: Array<{ label: string; value: string; icon?: any; color?: string }> = [];

  // DEBUG: Log the entire event object
  console.log('🐛 DEBUG: Full event object:', event);
  console.log(
    '🐛 DEBUG: Event ID:',
    event.id,
    'Event Type:',
    event.event_type,
    'Description:',
    event.description
  );

  // Weather events now extract data from extra_data field

  switch (event.event_type) {
    case 0: // Weather Event
      // First check extra_data for weather fields
      const extraData = event.extra_data || {};
      console.log('🌦️ DEBUG Weather Event: extra_data contents:', extraData);
      console.log('🌦️ DEBUG Weather Event: Direct event fields available:', {
        highest_temperature: event.highest_temperature,
        lower_temperature: event.lower_temperature,
        water_deficit: event.water_deficit,
        diameter: event.diameter,
        weight: event.weight,
        duration: event.duration,
        way_of_protection: event.way_of_protection
      });

      // Temperature fields
      if (event.highest_temperature || extraData.highest_temperature) {
        fields.push({
          label: 'High Temp',
          value: `${event.highest_temperature || extraData.highest_temperature}°C`,
          icon: FaThermometerHalf,
          color: 'red.500'
        });
      }
      if (event.lower_temperature || extraData.lower_temperature) {
        fields.push({
          label: 'Low Temp',
          value: `${event.lower_temperature || extraData.lower_temperature}°C`,
          icon: FaThermometerHalf,
          color: 'blue.500'
        });
      }

      // Water-related fields
      const waterDeficit = event.water_deficit || extraData.water_deficit;
      console.log('💧 DEBUG Water Deficit search:', {
        eventWaterDeficit: event.water_deficit,
        extraDataWaterDeficit: extraData.water_deficit,
        finalValue: waterDeficit
      });

      if (waterDeficit) {
        console.log('✅ Adding Water Deficit field:', waterDeficit);
        fields.push({
          label: 'Water Deficit',
          value: `${waterDeficit}mm`,
          icon: FaTint,
          color: 'blue.600'
        });
      }
      if (event.precipitation_amount || extraData.precipitation_amount) {
        fields.push({
          label: 'Precipitation',
          value: `${event.precipitation_amount || extraData.precipitation_amount}mm`,
          icon: FaCloudRain,
          color: 'blue.400'
        });
      }
      if (event.wind_speed || extraData.wind_speed) {
        fields.push({
          label: 'Wind Speed',
          value: `${event.wind_speed || extraData.wind_speed} km/h`,
          icon: FaLeaf,
          color: 'gray.500'
        });
      }

      // Hailstorm specific fields - check multiple possible field names
      const hailDiameter =
        event.diameter || extraData.diameter || extraData.average_hailstone_diameter;
      console.log('🌨️ DEBUG Hail Diameter search:', {
        eventDiameter: event.diameter,
        extraDataDiameter: extraData.diameter,
        extraDataAvgDiameter: extraData.average_hailstone_diameter,
        finalValue: hailDiameter
      });
      if (hailDiameter) {
        console.log('✅ Adding Hail Diameter field:', hailDiameter);
        fields.push({
          label: 'Hail Diameter',
          value: `${hailDiameter} ${hailDiameter.toString().includes('cm') ? '' : 'mm'}`,
          icon: FaCircle,
          color: 'gray.600'
        });
      }

      const hailWeight = event.weight || extraData.weight || extraData.average_hailstone_weight;
      console.log('⚖️ DEBUG Hail Weight search:', {
        eventWeight: event.weight,
        extraDataWeight: extraData.weight,
        extraDataAvgWeight: extraData.average_hailstone_weight,
        finalValue: hailWeight
      });
      if (hailWeight) {
        console.log('✅ Adding Hail Weight field:', hailWeight);
        fields.push({
          label: 'Hail Weight',
          value: `${hailWeight} ${hailWeight.toString().includes('g') ? '' : 'g'}`,
          icon: FaWeightHanging,
          color: 'gray.700'
        });
      }

      const weatherDuration = event.duration || extraData.duration || extraData.event_duration;
      console.log('⏱️ DEBUG Duration search:', {
        eventDuration: event.duration,
        extraDataDuration: extraData.duration,
        extraDataEventDuration: extraData.event_duration,
        finalValue: weatherDuration
      });
      if (weatherDuration) {
        console.log('✅ Adding Duration field:', weatherDuration);
        // Weather event duration is stored in hours (from WeatherTab.jsx form)
        const durationStr = weatherDuration.toString().toLowerCase();
        const hasUnit = durationStr.includes('hour') || durationStr.includes('hr') || durationStr.includes('min');
        fields.push({
          label: 'Duration',
          value: `${weatherDuration}${hasUnit ? '' : ' hours'}`,
          icon: FaClock,
          color: 'purple.500'
        });
      }

      const protectionMethod =
        event.way_of_protection || extraData.way_of_protection || extraData.protection_method;
      console.log('🛡️ DEBUG Protection search:', {
        eventProtection: event.way_of_protection,
        extraDataProtection: extraData.way_of_protection,
        extraDataProtectionMethod: extraData.protection_method,
        finalValue: protectionMethod
      });
      if (protectionMethod) {
        console.log('✅ Adding Protection field:', protectionMethod);
        fields.push({
          label: 'Protection',
          value: protectionMethod,
          icon: FaCheckCircle,
          color: 'green.500'
        });
      }

      if (event.humidity_level || extraData.humidity_level) {
        fields.push({
          label: 'Humidity',
          value: `${event.humidity_level || extraData.humidity_level}%`,
          icon: FaTint,
          color: 'cyan.500'
        });
      }
      if (event.damage_assessment || extraData.damage_assessment) {
        fields.push({
          label: 'Damage Level',
          value: event.damage_assessment || extraData.damage_assessment,
          icon: FaExclamationTriangle,
          color: 'red.500'
        });
      }

      // If no weather-specific fields are found, show a message
      if (fields.length === 0) {
        fields.push({
          label: 'Weather Data',
          value: 'Technical details not available',
          icon: FaInfoCircle,
          color: 'gray.500'
        });
      }
      break;

    case 1: // Production Event
      if (event.area_covered && event.area_covered > 0) {
        fields.push({
          label: 'Area Covered',
          value: `${event.area_covered} ${event.area_unit || 'ha'}`,
          icon: FaRulerCombined,
          color: 'green.500'
        });
      }
      if (event.yield_quantity && event.yield_quantity > 0) {
        fields.push({
          label: 'Quantity',
          value: `${event.yield_quantity} ${event.yield_unit || 'units'}`,
          icon: FaWeightHanging,
          color: 'green.600'
        });
      }
      if (event.fuel_consumed && event.fuel_consumed > 0) {
        fields.push({
          label: 'Fuel Used',
          value: `${event.fuel_consumed} ${event.fuel_unit || 'L'}`,
          icon: FaGasPump,
          color: 'orange.500'
        });
      }
      if (event.equipment_hours && event.equipment_hours > 0) {
        fields.push({
          label: 'Equipment Time',
          value: `${event.equipment_hours} hours`,
          icon: FaClock,
          color: 'blue.500'
        });
      }
      break;

    case 2: // Chemical Event
      if (event.commercial_name) {
        fields.push({
          label: 'Product',
          value: event.commercial_name,
          icon: FaFlask,
          color: 'orange.500'
        });
      }
      if (event.area_treated && event.area_treated > 0) {
        fields.push({
          label: 'Area Treated',
          value: `${event.area_treated} ${event.area_unit || 'ha'}`,
          icon: FaRulerCombined,
          color: 'orange.600'
        });
      }
      if (event.volume_applied && event.volume_applied > 0) {
        fields.push({
          label: 'Volume Applied',
          value: `${event.volume_applied} ${event.volume_unit || 'L'}`,
          icon: FaTint,
          color: 'blue.500'
        });
      }
      if (event.npk_ratio) {
        fields.push({
          label: 'NPK Ratio',
          value: event.npk_ratio,
          icon: FaLeaf,
          color: 'green.500'
        });
      }
      break;

    case 4: // Equipment Event
      if (event.fuel_consumed) {
        fields.push({
          label: 'Fuel Used',
          value: `${event.fuel_consumed} L`,
          icon: FaGasPump,
          color: 'orange.500'
        });
      }
      if (event.hours_operated) {
        fields.push({
          label: 'Operating Hours',
          value: `${event.hours_operated} hours`,
          icon: FaClock,
          color: 'blue.500'
        });
      }
      if (event.area_worked) {
        fields.push({
          label: 'Area Worked',
          value: `${event.area_worked} ha`,
          icon: FaRulerCombined,
          color: 'green.500'
        });
      }
      break;

    case 3: // Other Farm Activity (Sprint 2: renamed from General Event)
      if (event.duration) {
        fields.push({
          label: 'Duration',
          value: `${event.duration} hours`,
          icon: FaClock,
          color: 'gray.500'
        });
      }
      if (event.people_involved) {
        fields.push({
          label: 'Participants',
          value: `${event.people_involved} people`,
          icon: FaUser,
          color: 'blue.500'
        });
      }
      if (event.activity_name) {
        fields.push({
          label: 'Activity',
          value: event.activity_name,
          icon: FaLeaf,
          color: 'green.500'
        });
      }
      break;

    case 5: // Soil Management
      // Use actual database field names from soil management events
      if (event.area_covered) {
        fields.push({
          label: 'Area Covered',
          value: `${event.area_covered} ${event.area_unit || 'ha'}`,
          icon: FaRulerCombined,
          color: 'yellow.600'
        });
      }
      if (event.fuel_consumed) {
        fields.push({
          label: 'Fuel Used',
          value: `${event.fuel_consumed} ${event.fuel_unit || 'L'}`,
          icon: FaGasPump,
          color: 'orange.500'
        });
      }
      if (event.equipment_hours) {
        fields.push({
          label: 'Equipment Hours',
          value: `${event.equipment_hours} hours`,
          icon: FaClock,
          color: 'blue.500'
        });
      }
      if (event.soil_ph) {
        fields.push({
          label: 'Soil pH',
          value: event.soil_ph,
          icon: FaFlask,
          color: 'purple.500'
        });
      }
      break;

    case 6: // Pest Management
      if (event.pest_species) {
        fields.push({
          label: 'Target Pest',
          value: event.pest_species,
          icon: FaLeaf,
          color: 'red.500'
        });
      }
      if (event.field_area_hectares) {
        fields.push({
          label: 'Field Area',
          value: `${event.field_area_hectares} ha`,
          icon: FaRulerCombined,
          color: 'red.600'
        });
      }
      if (event.damage_percentage) {
        fields.push({
          label: 'Damage Level',
          value: `${event.damage_percentage}%`,
          icon: FaExclamationTriangle,
          color: 'orange.500'
        });
      }
      if (event.action_recommended) {
        fields.push({
          label: 'Action',
          value: event.action_recommended,
          icon: FaCheckCircle,
          color: 'green.500'
        });
      }
      break;

    case 7: // Business Event
      if (event.carbon_credits_earned) {
        fields.push({
          label: 'Carbon Credits',
          value: `${event.carbon_credits_earned} ${event.carbon_credits_unit || 'tons'}`,
          icon: FaLeaf,
          color: 'green.500'
        });
      }
      if (event.certification_type) {
        fields.push({
          label: 'Certification',
          value: event.certification_type,
          icon: FaCertificate,
          color: 'blue.500'
        });
      }
      if (event.trust_impact) {
        fields.push({
          label: 'Trust Impact',
          value: event.trust_impact,
          icon: FaStar,
          color: 'yellow.500'
        });
      }
      if (event.verification_status) {
        fields.push({
          label: 'Status',
          value: event.verification_status,
          icon: FaCheckCircle,
          color: 'cyan.500'
        });
      }
      break;
  }

  console.log('📊 DEBUG: Final fields array for event', event.id, ':', fields);
  console.log('📊 DEBUG: Returning fields (max 4):', fields.slice(0, 4));

  return fields.slice(0, 4); // Limit to 4 most important fields
};

// Get operator name from members array
const getOperatorName = (event: Event, members: Member[]) => {
  const operator = members.find((member) => member.id === event.created_by);
  return operator ? operator.full_name : 'Unknown Operator';
};

// Enhanced description generation
const getEnhancedDescription = (event: Event) => {
  // Use the observation field if it contains meaningful content
  if (
    event.observation &&
    event.observation.trim() &&
    !event.observation.toLowerCase().includes('no additional details')
  ) {
    return event.observation;
  }

  // Generate smart description based on event type and data
  switch (event.event_type) {
    case 0: // Weather
      if (event.water_deficit) {
        return `Drought conditions with ${event.water_deficit}mm water deficit recorded`;
      }
      if (event.precipitation_amount) {
        return `Rainfall event with ${event.precipitation_amount}mm precipitation`;
      }
      return 'Weather event recorded for agricultural monitoring';

    case 1: // Production
      const productionDetails = [];
      if (event.area_covered)
        productionDetails.push(`${event.area_covered} ${event.area_unit || 'ha'}`);
      if (event.yield_quantity)
        productionDetails.push(`${event.yield_quantity} ${event.yield_unit || 'units'}`);

      if (productionDetails.length > 0) {
        return `Agricultural production activity covering ${productionDetails.join(' • ')}`;
      }
      return 'Production activity completed as part of sustainable farming';

    case 2: // Chemical
      if (event.commercial_name && event.area_treated) {
        return `Applied ${event.commercial_name} to ${event.area_treated} ${
          event.area_unit || 'ha'
        }`;
      }
      return 'Chemical application for crop management';

    case 3: // General
      if (event.activity_name) {
        return `${event.activity_name} completed with ${
          event.people_involved || '1'
        } participant(s)`;
      }
      return 'General farm activity completed';

    case 4: // Equipment
      if (event.hours_operated && event.area_worked) {
        return `Equipment operation for ${event.hours_operated} hours covering ${event.area_worked} ha`;
      }
      return 'Equipment operation completed';

    case 5: // Soil Management
      if (event.area_covered) {
        return `Soil management activities covering ${event.area_covered} ${
          event.area_unit || 'ha'
        }`;
      }
      return 'Soil management activities completed';

    case 6: // Pest Management
      if (event.pest_species && event.damage_percentage) {
        return `${event.pest_species} management with ${event.damage_percentage}% damage level`;
      }
      if (event.pest_species) {
        return `Pest management targeting ${event.pest_species}`;
      }
      return 'Integrated pest management activities';

    case 7: // Business
      if (event.carbon_credits_earned) {
        return `Earned ${event.carbon_credits_earned} ${
          event.carbon_credits_unit || 'tons'
        } carbon credits`;
      }
      if (event.certification_type) {
        return `${event.certification_type} certification activities`;
      }
      return 'Business sustainability activities completed';

    default:
      return event.observation || 'Agricultural activity completed';
  }
};

function EnhancedTimelineRow(props: EnhancedTimelineRowProps) {
  const { logo, title, date, color, isLast, url, type, event, members, onEventClick } = props;
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

  // Use embedded carbon data
  const carbonData = event.carbon_data || null;

  // Get enhanced event configuration
  const eventConfig = getEventConfig(event.event_type, event.type, event.description);

  // Extract event-specific fields
  const eventFields = extractEventFields(event);
  const operatorName = getOperatorName(event, members);
  const enhancedDescription = getEnhancedDescription(event);

  // Force re-render after mount to fix timeline positioning
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 10);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Box position="relative" mb={4} w="100%" ref={timelineRef}>
      {/* Timeline Connector Line */}
      {!isLast && !isMobile && isMounted && (
        <Box
          position="absolute"
          left="20px"
          top="56px"
          w="2px"
          h="calc(100% + 8px)"
          bg={useColorModeValue('gray.200', 'gray.600')}
          borderRadius="full"
          zIndex={0}
          opacity={isMounted ? 1 : 0}
          transition="all 0.3s ease-in-out"
        />
      )}

      <HStack spacing={isMobile ? 0 : 4} align="flex-start" w="100%">
        {/* Minimal Timeline Icon */}
        {!isMobile && (
          <VStack spacing={0} align="center" minW="42px" position="relative" zIndex={1} mt="8px">
            <Circle
              size="42px"
              bg="white"
              borderWidth="3px"
              borderColor={eventConfig.color}
              color={eventConfig.color}
              boxShadow="0 2px 8px rgba(0,0,0,0.1)"
              _hover={{
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transform: 'translateY(-1px)'
              }}
              transition="all 0.2s ease"
            >
              <Icon as={eventConfig.icon} boxSize={5} />
            </Circle>
          </VStack>
        )}

        {/* Clean Modern Card */}
        <Card
          flex={1}
          bg={bgColor}
          borderRadius="12px"
          border="1px solid"
          borderColor={borderColor}
          cursor="pointer"
          transition="all 0.2s ease"
          position="relative"
          overflow="hidden"
          _hover={{
            borderColor: eventConfig.color,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transform: 'translateY(-2px)'
          }}
          onClick={() => (onEventClick ? onEventClick(event) : navigate(url))}
          className="trazo-card"
        >
          <CardBody p={4}>
            <VStack align="stretch" spacing={4}>
              {/* Clean Header */}
              <Flex justify="space-between" align="flex-start" w="100%">
                <HStack spacing={3} flex={1} minW={0}>
                  {/* Mobile icon */}
                  {isMobile && (
                    <Circle size="32px" bg={eventConfig.color} color="white" flexShrink={0}>
                      <Icon as={eventConfig.icon} boxSize={4} />
                    </Circle>
                  )}
                  <VStack align="flex-start" spacing={1} flex={1} minW={0}>
                    <Text
                      fontSize="lg"
                      fontWeight="600"
                      color={textColor}
                      noOfLines={1}
                      letterSpacing="-0.02em"
                    >
                      {title}
                    </Text>
                    <HStack spacing={2} wrap="wrap">
                      <Badge
                        colorScheme={eventConfig.color.split('.')[0]}
                        variant="subtle"
                        fontSize="xs"
                        px={2}
                        py={1}
                        fontWeight="500"
                        borderRadius="6px"
                      >
                        {eventConfig.category}
                      </Badge>
                      {carbonData?.usda_factors_based && (
                        <Badge
                          colorScheme="blue"
                          variant="solid"
                          fontSize="xs"
                          px={2}
                          py={1}
                          borderRadius="6px"
                        >
                          USDA
                        </Badge>
                      )}
                      {event.image && (
                        <Badge
                          colorScheme="green"
                          variant="solid"
                          fontSize="xs"
                          px={2}
                          py={1}
                          borderRadius="6px"
                        >
                          📷 VERIFIED
                        </Badge>
                      )}
                    </HStack>
                  </VStack>
                </HStack>

                {/* Clean Date Display */}
                <VStack align="flex-end" spacing={0} flexShrink={0} ml={4}>
                  <Text fontSize="sm" fontWeight="600" color="gray.700">
                    {new Date(event.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {new Date(event.date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </VStack>
              </Flex>

              {/* Clean Description */}
              <Text fontSize="sm" color="gray.600" lineHeight="relaxed" noOfLines={2}>
                {enhancedDescription}
              </Text>

              {/* Simplified Key Details */}
              {eventFields.length > 0 && (
                <Grid templateColumns="repeat(auto-fit, minmax(120px, 1fr))" gap={3} w="100%">
                  {eventFields.slice(0, 3).map((field, index) => (
                    <VStack key={index} align="flex-start" spacing={1} minW={0}>
                      <Text fontSize="xs" color="gray.500" fontWeight="500" noOfLines={1}>
                        {field.label}
                      </Text>
                      <HStack spacing={1}>
                        {field.icon && <Icon as={field.icon} color={field.color} boxSize={3} />}
                        <Text fontSize="sm" fontWeight="600" color="gray.700" noOfLines={1}>
                          {field.value}
                        </Text>
                      </HStack>
                    </VStack>
                  ))}
                </Grid>
              )}

              {/* Clean Metrics Section */}
              <Divider />

              <HStack justify="space-between" align="center" spacing={4}>
                {/* Carbon Impact */}
                {carbonData && !carbonData.error ? (
                  <Tooltip
                    label={`Environmental Impact: ${carbonData.co2e > 0 ? '+' : ''}${
                      carbonData.co2e
                    } kg CO₂e ${
                      carbonData.co2e < 0
                        ? '(carbon absorbed from atmosphere)'
                        : carbonData.co2e > 0
                        ? '(carbon released to atmosphere)'
                        : '(carbon neutral activity)'
                    }`}
                    placement="top"
                    hasArrow
                    bg="gray.700"
                    color="white"
                    fontSize="sm"
                    borderRadius="md"
                    px={3}
                    py={2}
                  >
                    <HStack spacing={2} flex={1} cursor="help">
                      <Circle size="24px" bg={carbonData.co2e < 0 ? 'green.100' : 'orange.100'}>
                        <Icon
                          as={MdEco}
                          color={carbonData.co2e < 0 ? 'green.600' : 'orange.600'}
                          boxSize={3}
                        />
                      </Circle>
                      <VStack spacing={0} align="flex-start" flex={1} minW={0}>
                        <Text
                          fontSize="sm"
                          fontWeight="600"
                          color={carbonData.co2e < 0 ? 'green.700' : 'orange.700'}
                          noOfLines={1}
                        >
                          {carbonData.co2e > 0 ? '+' : ''}
                          {carbonData.co2e} kg CO₂
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {carbonData.co2e < 0
                            ? 'Reduced'
                            : carbonData.co2e > 0
                            ? 'Added'
                            : 'Neutral'}
                        </Text>
                      </VStack>
                    </HStack>
                  </Tooltip>
                ) : (
                  <HStack spacing={2} flex={1}>
                    <Circle size="24px" bg="gray.100">
                      <Icon as={MdEco} color="gray.400" boxSize={3} />
                    </Circle>
                    <Text fontSize="sm" color="gray.500">
                      No CO₂ data
                    </Text>
                  </HStack>
                )}

                {/* Efficiency Score */}
                {carbonData?.efficiency_score && carbonData.efficiency_score > 0 && (
                  <HStack spacing={2} justify="flex-end">
                    <VStack spacing={0} align="flex-end">
                      <Text fontSize="xs" color="gray.500">
                        Efficiency
                      </Text>
                      <Text
                        fontSize="sm"
                        fontWeight="600"
                        color={
                          carbonData.efficiency_score >= 70
                            ? 'green.600'
                            : carbonData.efficiency_score >= 50
                            ? 'yellow.600'
                            : 'red.600'
                        }
                      >
                        {carbonData.efficiency_score}/100
                      </Text>
                    </VStack>
                  </HStack>
                )}

                {/* Operator & Photo Status */}
                <HStack spacing={3} justify="flex-end">
                  <Text fontSize="xs" color="gray.500" textAlign="right">
                    {operatorName}
                  </Text>
                  {!event.image && (
                    <Circle size="20px" bg="orange.100">
                      <Icon as={FaCamera} color="orange.500" boxSize={2.5} />
                    </Circle>
                  )}
                </HStack>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </HStack>
    </Box>
  );
}

export default EnhancedTimelineRow;
