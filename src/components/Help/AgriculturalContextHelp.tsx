import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Text,
  VStack,
  HStack,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Alert,
  AlertIcon,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  List,
  ListItem,
  ListIcon,
  Tooltip,
  useColorModeValue,
  Card,
  CardBody,
  CardHeader,
  Heading,
  SimpleGrid,
  Circle,
  Flex
} from '@chakra-ui/react';
import {
  FaQuestionCircle,
  FaLeaf,
  FaSeedling,
  FaBug,
  FaTractor,
  FaCloudRain,
  FaRocket,
  FaLightbulb,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaClock,
  FaThermometerHalf,
  FaWind,
  FaEye,
  FaCalculator
} from 'react-icons/fa';
import { SlChemistry } from 'react-icons/sl';
import { useIntl } from 'react-intl';

interface AgriculturalContextHelpProps {
  isOpen: boolean;
  onClose: () => void;
  eventType?: string;
  cropType?: string;
  showFloatingButton?: boolean;
}

// Agricultural guidance database
const AGRICULTURAL_GUIDANCE = {
  fertilizer_application: {
    title: 'Fertilizer Application Best Practices',
    icon: FaSeedling,
    color: 'green',
    overview:
      'Proper fertilizer application ensures optimal nutrient uptake while minimizing environmental impact.',
    timing: {
      best_time: 'Early morning (6-10 AM) or late afternoon (4-6 PM)',
      avoid: 'Midday heat, windy conditions, before rain',
      seasonal: 'Spring: Higher nitrogen needs, Fall: Phosphorus and potassium focus'
    },
    weather_conditions: {
      ideal: 'Calm winds (<10 mph), moderate temperature (60-75°F), high humidity',
      avoid: 'Strong winds, extreme temperatures, impending rain within 6 hours'
    },
    application_tips: [
      'Calibrate equipment before each use',
      'Apply when soil moisture is adequate',
      'Use buffer zones near water sources',
      'Follow the 4R principle: Right source, Right rate, Right time, Right place'
    ],
    carbon_impact: {
      factors: 'Nitrogen fertilizers have the highest carbon footprint',
      reduction_tips: [
        'Use precision application techniques',
        'Consider organic alternatives when possible',
        'Split applications to improve efficiency',
        'Use soil testing to determine exact needs'
      ]
    },
    common_mistakes: [
      'Over-application leading to nutrient runoff',
      'Applying during unfavorable weather',
      'Not calibrating equipment properly',
      'Ignoring soil test recommendations'
    ]
  },
  irrigation: {
    title: 'Irrigation Management',
    icon: FaCloudRain,
    color: 'blue',
    overview: 'Efficient irrigation maximizes water use while maintaining optimal crop hydration.',
    timing: {
      best_time: 'Early morning (4-8 AM) to minimize evaporation',
      avoid: 'Midday heat, evening (promotes disease)',
      seasonal: 'Adjust frequency based on crop growth stage and weather'
    },
    weather_conditions: {
      ideal: 'Low wind, moderate temperatures, low evapotranspiration',
      avoid: 'High winds, extreme heat, during or before rain'
    },
    application_tips: [
      'Monitor soil moisture at root depth',
      'Use weather data to adjust schedules',
      'Maintain uniform water distribution',
      'Check system pressure and flow rates regularly'
    ],
    carbon_impact: {
      factors: 'Energy use for pumping and system operation',
      reduction_tips: [
        'Optimize irrigation scheduling',
        'Use solar-powered pumps when possible',
        'Implement drip irrigation for efficiency',
        'Regular maintenance to prevent energy waste'
      ]
    },
    common_mistakes: [
      'Overwatering leading to nutrient leaching',
      'Irregular irrigation schedules',
      'Poor system maintenance',
      'Not adjusting for rainfall'
    ]
  },
  pest_control: {
    title: 'Integrated Pest Management (IPM)',
    icon: FaBug,
    color: 'red',
    overview:
      'IPM combines biological, cultural, and chemical controls for sustainable pest management.',
    timing: {
      best_time: 'Early morning or late evening when beneficial insects are less active',
      avoid: 'During bloom when pollinators are active, windy conditions',
      seasonal: 'Monitor pest lifecycle and apply at vulnerable stages'
    },
    weather_conditions: {
      ideal: 'Calm winds, moderate temperature, no rain expected for 4-6 hours',
      avoid: 'Strong winds, extreme temperatures, imminent precipitation'
    },
    application_tips: [
      'Identify pests accurately before treatment',
      'Use economic thresholds to determine need',
      'Rotate pesticide modes of action',
      'Protect beneficial insects and pollinators'
    ],
    carbon_impact: {
      factors: 'Manufacturing and transportation of pesticides',
      reduction_tips: [
        'Use biological controls when possible',
        'Implement cultural practices to prevent pests',
        'Use targeted applications vs. broadcast',
        'Consider biopesticides as alternatives'
      ]
    },
    common_mistakes: [
      'Applying pesticides preventively without need',
      'Not rotating modes of action',
      'Ignoring beneficial insect populations',
      'Poor spray coverage or timing'
    ]
  },
  equipment_operation: {
    title: 'Equipment Operation & Fuel Efficiency',
    icon: FaTractor,
    color: 'orange',
    overview: 'Efficient equipment operation reduces fuel consumption and carbon emissions.',
    timing: {
      best_time: 'When soil conditions are optimal for the operation',
      avoid: 'Muddy conditions, extreme weather',
      seasonal: 'Plan operations during suitable weather windows'
    },
    weather_conditions: {
      ideal: 'Appropriate soil moisture, stable weather patterns',
      avoid: 'Wet soils, frozen ground, severe weather'
    },
    application_tips: [
      'Maintain proper tire pressure',
      'Use GPS guidance to minimize overlap',
      'Combine operations when possible',
      'Keep equipment well-maintained'
    ],
    carbon_impact: {
      factors: 'Fuel consumption and equipment manufacturing',
      reduction_tips: [
        'Minimize field passes through combined operations',
        'Use precision guidance systems',
        'Maintain optimal engine performance',
        'Right-size equipment for operations'
      ]
    },
    common_mistakes: [
      'Operating in poor soil conditions',
      'Excessive overlapping of passes',
      'Poor maintenance leading to inefficiency',
      'Using oversized equipment for small operations'
    ]
  },
  soil_management: {
    title: 'Soil Health & Management',
    icon: FaSeedling,
    color: 'brown',
    overview:
      'Healthy soils are the foundation of sustainable agriculture and carbon sequestration.',
    timing: {
      best_time: 'When soil moisture is at field capacity (not too wet or dry)',
      avoid: 'Saturated soils, frozen ground',
      seasonal: 'Fall applications often preferred for organic matter'
    },
    weather_conditions: {
      ideal: 'Moderate moisture, stable temperatures',
      avoid: 'Waterlogged soils, extreme temperatures'
    },
    application_tips: [
      'Test soil regularly for nutrient and pH levels',
      'Add organic matter to improve structure',
      'Minimize compaction through controlled traffic',
      'Use cover crops to protect and improve soil'
    ],
    carbon_impact: {
      factors: 'Soil can be a carbon sink or source',
      reduction_tips: [
        'Increase organic matter through cover crops',
        'Minimize tillage to preserve soil structure',
        'Use precision nutrient management',
        'Implement rotational grazing if applicable'
      ]
    },
    common_mistakes: [
      'Working soils when too wet (compaction)',
      'Over-tillage destroying soil structure',
      'Not testing soil regularly',
      'Ignoring organic matter content'
    ]
  },
  harvest: {
    title: 'Harvest Operations',
    icon: FaRocket,
    color: 'yellow',
    overview: 'Timely and efficient harvest maximizes quality while minimizing losses.',
    timing: {
      best_time: 'When crops reach optimal maturity and weather permits',
      avoid: 'During wet weather, extreme heat',
      seasonal: 'Monitor maturity indicators specific to each crop'
    },
    weather_conditions: {
      ideal: 'Dry conditions, moderate temperatures, stable weather forecast',
      avoid: 'Rain, high humidity, strong winds'
    },
    application_tips: [
      'Monitor crop maturity indicators',
      'Ensure equipment is properly calibrated',
      'Minimize field traffic to reduce compaction',
      'Handle crops gently to maintain quality'
    ],
    carbon_impact: {
      factors: 'Fuel use, transportation, and post-harvest handling',
      reduction_tips: [
        'Optimize harvest routes and logistics',
        'Use efficient equipment settings',
        'Minimize handling and transportation',
        'Plan for proper storage to reduce waste'
      ]
    },
    common_mistakes: [
      'Harvesting too early or too late',
      'Poor equipment maintenance affecting efficiency',
      'Not adjusting equipment for conditions',
      'Excessive field traffic causing compaction'
    ]
  }
};

// Weather condition indicators
const WEATHER_INDICATORS = [
  {
    icon: FaThermometerHalf,
    label: 'Temperature',
    good: '60-75°F',
    caution: '45-60°F or 75-85°F',
    avoid: '<45°F or >85°F'
  },
  {
    icon: FaWind,
    label: 'Wind Speed',
    good: '<5 mph',
    caution: '5-15 mph',
    avoid: '>15 mph'
  },
  {
    icon: FaCloudRain,
    label: 'Precipitation',
    good: 'None expected 6+ hours',
    caution: 'Light rain 3-6 hours',
    avoid: 'Rain within 3 hours'
  }
];

export const AgriculturalContextHelp: React.FC<AgriculturalContextHelpProps> = ({
  isOpen,
  onClose,
  eventType = 'fertilizer_application',
  cropType = 'Mixed Crops',
  showFloatingButton = true
}) => {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState(0);

  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const guidance = useMemo(() => {
    return (
      AGRICULTURAL_GUIDANCE[eventType as keyof typeof AGRICULTURAL_GUIDANCE] ||
      AGRICULTURAL_GUIDANCE.fertilizer_application
    );
  }, [eventType]);

  const renderBestPracticesTab = () => (
    <VStack spacing={6} align="stretch">
      {/* Overview */}
      <Card>
        <CardHeader>
          <HStack>
            <Circle size="40px" bg={`${guidance.color}.100`} color={`${guidance.color}.600`}>
              <Icon as={guidance.icon} boxSize={5} />
            </Circle>
            <VStack align="start" spacing={0}>
              <Heading size="md">{guidance.title}</Heading>
              <Text fontSize="sm" color="gray.500">
                Evidence-based agricultural practices
              </Text>
            </VStack>
          </HStack>
        </CardHeader>
        <CardBody>
          <Text>{guidance.overview}</Text>
        </CardBody>
      </Card>

      {/* Timing Guidelines */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FaClock} color="blue.500" boxSize={5} />
            <Heading size="sm">Optimal Timing</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={3} align="stretch">
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="semibold">
                  Best Time:
                </Text>
                <Text fontSize="sm">{guidance.timing.best_time}</Text>
              </VStack>
            </Alert>

            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="semibold">
                  Avoid:
                </Text>
                <Text fontSize="sm">{guidance.timing.avoid}</Text>
              </VStack>
            </Alert>

            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="semibold">
                  Seasonal Considerations:
                </Text>
                <Text fontSize="sm">{guidance.timing.seasonal}</Text>
              </VStack>
            </Alert>
          </VStack>
        </CardBody>
      </Card>

      {/* Application Tips */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FaLightbulb} color="yellow.500" boxSize={5} />
            <Heading size="sm">Pro Tips</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <List spacing={2}>
            {guidance.application_tips.map((tip, index) => (
              <ListItem key={index}>
                <ListIcon as={FaCheckCircle} color="green.500" />
                <Text fontSize="sm">{tip}</Text>
              </ListItem>
            ))}
          </List>
        </CardBody>
      </Card>

      {/* Common Mistakes */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FaExclamationTriangle} color="red.500" boxSize={5} />
            <Heading size="sm">Common Mistakes to Avoid</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <List spacing={2}>
            {guidance.common_mistakes.map((mistake, index) => (
              <ListItem key={index}>
                <ListIcon as={FaExclamationTriangle} color="red.500" />
                <Text fontSize="sm">{mistake}</Text>
              </ListItem>
            ))}
          </List>
        </CardBody>
      </Card>
    </VStack>
  );

  const renderWeatherTab = () => (
    <VStack spacing={6} align="stretch">
      {/* Weather Overview */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FaCloudRain} color="blue.500" boxSize={5} />
            <Heading size="sm">Weather Conditions Guide</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <Text fontSize="sm" mb={4}>
            Weather significantly impacts the effectiveness and safety of agricultural operations.
          </Text>

          <SimpleGrid columns={1} spacing={3}>
            {WEATHER_INDICATORS.map((indicator, index) => (
              <Box key={index} p={3} borderWidth="1px" borderRadius="md">
                <HStack mb={2}>
                  <Icon as={indicator.icon} color="blue.500" boxSize={4} />
                  <Text fontWeight="semibold" fontSize="sm">
                    {indicator.label}
                  </Text>
                </HStack>
                <VStack spacing={1} align="stretch">
                  <HStack justify="space-between">
                    <Badge colorScheme="green" size="sm">
                      Good
                    </Badge>
                    <Text fontSize="xs">{indicator.good}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Badge colorScheme="yellow" size="sm">
                      Caution
                    </Badge>
                    <Text fontSize="xs">{indicator.caution}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Badge colorScheme="red" size="sm">
                      Avoid
                    </Badge>
                    <Text fontSize="xs">{indicator.avoid}</Text>
                  </HStack>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Ideal Conditions */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FaCheckCircle} color="green.500" boxSize={5} />
            <Heading size="sm">Ideal Conditions</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            <Text fontSize="sm">{guidance.weather_conditions.ideal}</Text>
          </Alert>
        </CardBody>
      </Card>

      {/* Conditions to Avoid */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FaExclamationTriangle} color="red.500" boxSize={5} />
            <Heading size="sm">Conditions to Avoid</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Text fontSize="sm">{guidance.weather_conditions.avoid}</Text>
          </Alert>
        </CardBody>
      </Card>
    </VStack>
  );

  const renderCarbonTab = () => (
    <VStack spacing={6} align="stretch">
      {/* Carbon Impact Overview */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FaLeaf} color="green.500" boxSize={5} />
            <Heading size="sm">Carbon Impact Understanding</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={3} align="stretch">
            <Text fontSize="sm">{guidance.carbon_impact.factors}</Text>

            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="semibold">
                  Why Carbon Tracking Matters:
                </Text>
                <Text fontSize="sm">
                  Understanding your farm's carbon footprint helps identify opportunities for both
                  environmental improvement and cost savings.
                </Text>
              </VStack>
            </Alert>
          </VStack>
        </CardBody>
      </Card>

      {/* Reduction Strategies */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FaCalculator} color="blue.500" boxSize={5} />
            <Heading size="sm">Carbon Reduction Strategies</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <List spacing={2}>
            {guidance.carbon_impact.reduction_tips.map((tip, index) => (
              <ListItem key={index}>
                <ListIcon as={FaLeaf} color="green.500" />
                <Text fontSize="sm">{tip}</Text>
              </ListItem>
            ))}
          </List>
        </CardBody>
      </Card>

      {/* Carbon Benefits */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FaRocket} color="purple.500" boxSize={5} />
            <Heading size="sm">Benefits of Carbon Management</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={1} spacing={3}>
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="semibold">
                  Cost Savings
                </Text>
                <Text fontSize="sm">Improved efficiency reduces input costs</Text>
              </VStack>
            </Alert>

            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="semibold">
                  Market Access
                </Text>
                <Text fontSize="sm">Sustainability credentials open new markets</Text>
              </VStack>
            </Alert>

            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="semibold">
                  Future Compliance
                </Text>
                <Text fontSize="sm">Stay ahead of evolving regulations</Text>
              </VStack>
            </Alert>
          </SimpleGrid>
        </CardBody>
      </Card>
    </VStack>
  );

  return (
    <>
      {/* Floating Help Button */}
      {showFloatingButton && !isOpen && (
        <Tooltip label="Agricultural guidance and best practices" placement="left">
          <Button
            position="fixed"
            bottom="20px"
            right="20px"
            colorScheme="green"
            borderRadius="full"
            size="lg"
            boxShadow="lg"
            zIndex={1000}
            onClick={() => {
              /* This would trigger opening the help modal */
            }}
          >
            <Icon as={FaQuestionCircle} boxSize={6} />
          </Button>
        </Tooltip>
      )}

      {/* Help Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Icon as={FaInfoCircle} color="blue.500" boxSize={5} />
              <VStack align="start" spacing={0}>
                <Text>Agricultural Context Help</Text>
                <Text fontSize="sm" color="gray.500" fontWeight="normal">
                  {guidance.title} • {cropType}
                </Text>
              </VStack>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody pb={6}>
            <Tabs index={activeTab} onChange={setActiveTab} colorScheme="green">
              <TabList>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaLightbulb} boxSize={4} />
                    <Text>Best Practices</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaCloudRain} boxSize={4} />
                    <Text>Weather Guide</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaLeaf} boxSize={4} />
                    <Text>Carbon Impact</Text>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels>
                <TabPanel px={0}>{renderBestPracticesTab()}</TabPanel>
                <TabPanel px={0}>{renderWeatherTab()}</TabPanel>
                <TabPanel px={0}>{renderCarbonTab()}</TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default AgriculturalContextHelp;
