import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Icon,
  SimpleGrid,
  Progress,
  useColorModeValue,
  Button,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Flex,
  Circle,
  Divider,
  Alert,
  AlertIcon,
  Tooltip,
  useBreakpointValue
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaLeaf,
  FaTractor,
  FaRocket,
  FaTree,
  FaSeedling,
  FaSun,
  FaWater,
  FaRecycle,
  FaShieldAlt,
  FaCertificate,
  FaGlobeAmericas,
  FaArrowDown,
  FaArrowUp,
  FaCheckCircle,
  FaInfoCircle,
  FaLightbulb
} from 'react-icons/fa';

const MotionBox = motion(Box);
const MotionCard = motion(Card);
const MotionVStack = motion(VStack);

interface CarbonPhase {
  id: string;
  name: string;
  description: string;
  icon: any;
  co2e: number; // CO2e for this phase (can be negative)
  percentage: number; // Percentage of total impact
  practices: string[];
  consumerBenefit: string;
  color: string;
  isPositive: boolean; // true for carbon sequestration, false for emissions
}

interface CarbonJourneyData {
  productionId: string;
  productName: string;
  totalCO2e: number;
  netFootprint: number;
  isCarbonNegative: boolean;
  phases: CarbonPhase[];
  keyAchievements: string[];
  consumerMessage: string;
  verificationLevel: number; // 0-100
}

interface CarbonJourneyVisualizationProps {
  data: CarbonJourneyData;
  isLoading?: boolean;
  showDetailedView?: boolean;
}

export const CarbonJourneyVisualization: React.FC<CarbonJourneyVisualizationProps> = ({
  data,
  isLoading = false,
  showDetailedView = true
}) => {
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [visiblePhases, setVisiblePhases] = useState<string[]>([]);

  // Theme colors
  const bg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const positiveColor = useColorModeValue('green.500', 'green.400');
  const negativeColor = useColorModeValue('blue.500', 'blue.400');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Responsive values
  const cardSpacing = useBreakpointValue({ base: 4, md: 6 });
  const iconSize = useBreakpointValue({ base: 8, md: 12 });
  const headingSize = useBreakpointValue({ base: 'md', md: 'lg' });

  // Progressive reveal animation
  useEffect(() => {
    if (!isLoading && data?.phases?.length > 0) {
      const timer = setInterval(() => {
        setVisiblePhases((prev) => {
          if (prev.length < data.phases.length) {
            return [...prev, data.phases[prev.length].id];
          }
          clearInterval(timer);
          return prev;
        });
      }, 400);
      return () => clearInterval(timer);
    }
  }, [isLoading, data?.phases?.length]);

  if (isLoading) {
    return (
      <Card bg={bg}>
        <CardBody>
          <VStack spacing={4}>
            <Text>Loading carbon journey...</Text>
            <Progress size="lg" isIndeterminate colorScheme="green" />
          </VStack>
        </CardBody>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card bg={bg}>
        <CardBody>
          <Alert status="info">
            <AlertIcon />
            No carbon journey data available
          </Alert>
        </CardBody>
      </Card>
    );
  }

  const getPhaseDirection = (co2e: number) => (co2e >= 0 ? 'emission' : 'sequestration');

  const formatCO2e = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 1000) return `${(abs / 1000).toFixed(1)}t`;
    return `${abs.toFixed(0)}kg`;
  };

  const getNetImpactMessage = () => {
    if (data.isCarbonNegative) {
      return {
        title: '🌟 Carbon Negative Product!',
        subtitle: `Removes ${formatCO2e(Math.abs(data.netFootprint))} CO₂ from atmosphere`,
        description:
          'This product actually helps fight climate change by storing more carbon than it produces.',
        color: 'green'
      };
    } else if (data.netFootprint < 5) {
      return {
        title: '🌿 Ultra Low Carbon',
        subtitle: `Only ${formatCO2e(data.netFootprint)} CO₂ footprint`,
        description: 'Exceptionally low environmental impact for this type of product.',
        color: 'green'
      };
    } else {
      return {
        title: '🌱 Working Toward Carbon Neutral',
        subtitle: `${formatCO2e(data.netFootprint)} CO₂ footprint`,
        description: 'Continuous improvement in carbon reduction practices.',
        color: 'blue'
      };
    }
  };

  const impactMessage = getNetImpactMessage();

  return (
    <VStack spacing={cardSpacing} align="stretch">
      {/* Hero Impact Message */}
      <MotionCard
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        bg={`${impactMessage.color}.50`}
        borderColor={`${impactMessage.color}.200`}
        borderWidth="2px"
      >
        <CardBody>
          <VStack spacing={4} textAlign="center">
            <Heading size={headingSize} color={`${impactMessage.color}.700`}>
              {impactMessage.title}
            </Heading>
            <Text fontSize="lg" fontWeight="bold" color={`${impactMessage.color}.600`}>
              {impactMessage.subtitle}
            </Text>
            <Text color={mutedColor} maxW="lg">
              {impactMessage.description}
            </Text>
            <Box
              bg={`${impactMessage.color}.100`}
              px={4}
              py={2}
              borderRadius="full"
              borderLeft="4px solid"
              borderLeftColor={`${impactMessage.color}.500`}
            >
              <Text fontSize="sm" fontWeight="medium" color={`${impactMessage.color}.700`}>
                💡 {data.consumerMessage}
              </Text>
            </Box>
          </VStack>
        </CardBody>
      </MotionCard>

      {/* Carbon Journey Timeline */}
      <Card bg={bg}>
        <CardHeader>
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <Heading size={headingSize}>Carbon Journey</Heading>
              <Text fontSize="sm" color={mutedColor}>
                Complete transparency from farm to your table
              </Text>
            </VStack>
            <Badge colorScheme="green" variant="solid" px={3} py={1} borderRadius="full">
              {data.verificationLevel}% Verified
            </Badge>
          </HStack>
        </CardHeader>
        <CardBody pt={0}>
          <VStack spacing={6} align="stretch">
            {/* Net Impact Summary */}
            <Box
              bg={data.isCarbonNegative ? 'green.50' : 'blue.50'}
              p={4}
              borderRadius="lg"
              border="1px"
              borderColor={data.isCarbonNegative ? 'green.200' : 'blue.200'}
            >
              <HStack justify="space-between" align="center">
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" color={mutedColor}>
                    Net Carbon Impact
                  </Text>
                  <HStack spacing={2}>
                    <Text
                      fontSize="2xl"
                      fontWeight="bold"
                      color={data.isCarbonNegative ? 'green.600' : 'blue.600'}
                    >
                      {data.isCarbonNegative ? '-' : ''}
                      {formatCO2e(Math.abs(data.netFootprint))}
                    </Text>
                    <Text fontSize="lg" color={mutedColor}>
                      CO₂e
                    </Text>
                  </HStack>
                </VStack>
                <Circle size="60px" bg={data.isCarbonNegative ? 'green.100' : 'blue.100'}>
                  <Icon
                    as={data.isCarbonNegative ? FaRecycle : FaLeaf}
                    color={data.isCarbonNegative ? 'green.500' : 'blue.500'}
                    boxSize={6}
                  />
                </Circle>
              </HStack>
            </Box>

            {/* Phase Timeline */}
            <VStack spacing={4} align="stretch">
              <Heading size="sm" color={textColor}>
                Production Phases
              </Heading>

              <AnimatePresence>
                {data.phases.map((phase, index) => {
                  const isVisible = visiblePhases.includes(phase.id);
                  const isSelected = selectedPhase === phase.id;

                  if (!isVisible) return null;

                  return (
                    <MotionBox
                      key={phase.id}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.1,
                        type: 'spring',
                        damping: 25,
                        stiffness: 120
                      }}
                    >
                      <Card
                        cursor="pointer"
                        bg={isSelected ? `${phase.color}.50` : cardBg}
                        borderColor={isSelected ? `${phase.color}.300` : borderColor}
                        borderWidth={isSelected ? '2px' : '1px'}
                        _hover={{
                          borderColor: `${phase.color}.300`,
                          transform: 'translateY(-2px)',
                          shadow: 'lg'
                        }}
                        transition="all 0.2s"
                        onClick={() => setSelectedPhase(isSelected ? null : phase.id)}
                      >
                        <CardBody>
                          <HStack spacing={4} align="start">
                            {/* Phase Icon */}
                            <Circle size="50px" bg={`${phase.color}.100`} flexShrink={0}>
                              <Icon as={phase.icon} color={`${phase.color}.500`} boxSize={6} />
                            </Circle>

                            {/* Phase Content */}
                            <VStack align="start" spacing={2} flex={1} minW={0}>
                              <HStack justify="space-between" w="full">
                                <Text fontWeight="bold" color={textColor} noOfLines={1}>
                                  {phase.name}
                                </Text>
                                <HStack spacing={2}>
                                  {phase.isPositive ? (
                                    <Badge colorScheme="green" variant="solid">
                                      <HStack spacing={1}>
                                        <Icon as={FaArrowDown} boxSize={3} />
                                        <Text>{formatCO2e(Math.abs(phase.co2e))}</Text>
                                      </HStack>
                                    </Badge>
                                  ) : (
                                    <Badge colorScheme="orange" variant="solid">
                                      <HStack spacing={1}>
                                        <Icon as={FaArrowUp} boxSize={3} />
                                        <Text>{formatCO2e(phase.co2e)}</Text>
                                      </HStack>
                                    </Badge>
                                  )}
                                  <Text fontSize="xs" color={mutedColor}>
                                    {phase.percentage.toFixed(0)}%
                                  </Text>
                                </HStack>
                              </HStack>

                              <Text fontSize="sm" color={mutedColor} noOfLines={2}>
                                {phase.description}
                              </Text>

                              {/* Consumer Benefit */}
                              <Box
                                bg={`${phase.color}.100`}
                                px={3}
                                py={1}
                                borderRadius="md"
                                alignSelf="start"
                              >
                                <Text
                                  fontSize="xs"
                                  fontWeight="medium"
                                  color={`${phase.color}.700`}
                                >
                                  💡 {phase.consumerBenefit}
                                </Text>
                              </Box>
                            </VStack>
                          </HStack>

                          {/* Detailed View */}
                          <AnimatePresence>
                            {isSelected && showDetailedView && (
                              <MotionBox
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                overflow="hidden"
                              >
                                <Divider my={4} />
                                <VStack align="start" spacing={3}>
                                  <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                                    Sustainable Practices:
                                  </Text>
                                  <VStack align="start" spacing={2} pl={4}>
                                    {phase.practices.map((practice, idx) => (
                                      <HStack key={idx} align="start" spacing={2}>
                                        <Icon
                                          as={FaCheckCircle}
                                          color="green.500"
                                          boxSize={3}
                                          mt={0.5}
                                        />
                                        <Text fontSize="sm" color={mutedColor}>
                                          {practice}
                                        </Text>
                                      </HStack>
                                    ))}
                                  </VStack>
                                </VStack>
                              </MotionBox>
                            )}
                          </AnimatePresence>
                        </CardBody>
                      </Card>
                    </MotionBox>
                  );
                })}
              </AnimatePresence>
            </VStack>

            {/* Key Achievements */}
            {data.keyAchievements?.length > 0 && (
              <Box>
                <Heading size="sm" color={textColor} mb={3}>
                  Sustainability Achievements
                </Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                  {data.keyAchievements.map((achievement, index) => (
                    <HStack
                      key={index}
                      bg="green.50"
                      p={3}
                      borderRadius="md"
                      border="1px"
                      borderColor="green.200"
                    >
                      <Icon as={FaCertificate} color="green.500" boxSize={4} />
                      <Text fontSize="sm" fontWeight="medium" color="green.700">
                        {achievement}
                      </Text>
                    </HStack>
                  ))}
                </SimpleGrid>
              </Box>
            )}

            {/* Educational Call-to-Action */}
            <Box
              bg="blue.50"
              p={4}
              borderRadius="lg"
              border="1px"
              borderColor="blue.200"
              textAlign="center"
            >
              <VStack spacing={3}>
                <Icon as={FaLightbulb} color="blue.500" boxSize={6} />
                <Text fontSize="sm" fontWeight="bold" color="blue.700">
                  Understanding Carbon Impact
                </Text>
                <Text fontSize="xs" color="blue.600" maxW="md">
                  Every choice you make matters. By choosing products with transparent carbon data,
                  you're supporting farmers who prioritize environmental sustainability.
                </Text>
                <Button size="sm" colorScheme="blue" variant="outline">
                  Learn More About Carbon
                </Button>
              </VStack>
            </Box>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default CarbonJourneyVisualization;
