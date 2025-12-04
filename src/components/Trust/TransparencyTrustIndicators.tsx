import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Circle,
  Progress,
  Tooltip,
  useColorModeValue,
  useBreakpointValue,
  Skeleton,
  Flex,
  SimpleGrid,
  Card,
  CardBody
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaShieldAlt,
  FaCheckCircle,
  FaEye,
  FaChartLine,
  FaUsers,
  FaCalendarAlt,
  FaLeaf,
  FaRegGem,
  FaCertificate,
  FaInfoCircle
} from 'react-icons/fa';
import { MdVerified, MdSecurity, MdScience, MdTrendingUp, MdPublic } from 'react-icons/md';
import { BsShieldCheck, BsStarFill } from 'react-icons/bs';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

export interface TransparencyTrustData {
  transparencyScore: number;
  documentationCompleteness: number;
  verificationLevel: 'basic' | 'enhanced' | 'comprehensive' | 'certified';
  isUSDAVerified: boolean;
  isBlockchainVerified: boolean;
  publicViews: number;
  farmingHistoryYears: number;
  sustainabilityPractices: string[];
  lastUpdated: string;
  verificationDate?: string;
  consumerScans: number;
  trustIndicators: {
    dataAccuracy: number;
    practiceVerification: number;
    continuousTracking: number;
    thirdPartyValidation: number;
  };
}

export interface TransparencyTrustIndicatorsProps {
  trustData: TransparencyTrustData;
  isLoading?: boolean;
  variant?: 'hero' | 'compact' | 'detailed';
  showMetrics?: boolean;
}

export const TransparencyTrustIndicators: React.FC<TransparencyTrustIndicatorsProps> = ({
  trustData,
  isLoading = false,
  variant = 'hero',
  showMetrics = true
}) => {
  const [visibleElements, setVisibleElements] = useState(0);

  // Theme colors following Trazo patterns
  const bg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Responsive values following Trazo mobile-first approach
  const spacing = useBreakpointValue({ base: 3, md: 4 });
  const iconSize = useBreakpointValue({ base: 4, md: 5 });
  const cardSpacing = useBreakpointValue({ base: 4, md: 6 });

  // Progressive animation
  useEffect(() => {
    if (!isLoading) {
      const timer = setInterval(() => {
        setVisibleElements((prev) => {
          if (prev < 5) return prev + 1;
          clearInterval(timer);
          return prev;
        });
      }, 200);
      return () => clearInterval(timer);
    }
  }, [isLoading]);

  // Calculate comprehensive trust score based on transparency metrics
  const calculateTransparencyTrustScore = () => {
    let score = 0;

    // Core transparency data (50 points)
    score += (trustData.transparencyScore / 100) * 30;
    score += (trustData.documentationCompleteness / 100) * 20;

    // Verification quality (30 points)
    if (trustData.isUSDAVerified) score += 15;
    if (trustData.isBlockchainVerified) score += 15;

    // Trust indicators average (15 points)
    const avgTrustIndicator = Object.values(trustData.trustIndicators).reduce((a, b) => a + b) / 4;
    score += (avgTrustIndicator / 100) * 15;

    // Longevity and engagement (5 points)
    if (trustData.farmingHistoryYears >= 5) score += 2.5;
    if (trustData.consumerScans > 50) score += 2.5;

    return Math.min(Math.round(score), 100);
  };

  // Get transparency trust level and styling
  const getTrustLevel = (score: number) => {
    if (score >= 95)
      return {
        level: 'Transparency Champion',
        color: 'green',
        bgColor: 'green.500',
        icon: MdSecurity,
        description: 'Exceptional transparency with maximum verification'
      };
    if (score >= 85)
      return {
        level: 'Transparency Leader',
        color: 'green',
        bgColor: 'green.400',
        icon: BsShieldCheck,
        description: 'Outstanding transparency with comprehensive documentation'
      };
    if (score >= 75)
      return {
        level: 'Highly Transparent',
        color: 'blue',
        bgColor: 'blue.500',
        icon: MdVerified,
        description: 'Very good transparency with verified practices'
      };
    if (score >= 65)
      return {
        level: 'Good Transparency',
        color: 'blue',
        bgColor: 'blue.400',
        icon: FaShieldAlt,
        description: 'Good transparency with solid documentation'
      };
    return {
      level: 'Building Transparency',
      color: 'yellow',
      bgColor: 'yellow.500',
      icon: FaInfoCircle,
      description: 'Working towards better transparency practices'
    };
  };

  const trustScore = calculateTransparencyTrustScore();
  const trustLevel = getTrustLevel(trustScore);

  // Get verification level details
  const getVerificationDetails = (level: string) => {
    switch (level) {
      case 'certified':
        return {
          badge: 'CERTIFIED',
          color: 'green',
          icon: FaCertificate,
          description: 'Highest level of verification with third-party audits'
        };
      case 'comprehensive':
        return {
          badge: 'COMPREHENSIVE',
          color: 'blue',
          icon: MdScience,
          description: 'Thorough verification with multiple data sources'
        };
      case 'enhanced':
        return {
          badge: 'ENHANCED',
          color: 'purple',
          icon: FaRegGem,
          description: 'Enhanced verification with additional checks'
        };
      default:
        return {
          badge: 'BASIC',
          color: 'gray',
          icon: FaEye,
          description: 'Basic verification with standard documentation'
        };
    }
  };

  const verificationDetails = getVerificationDetails(trustData.verificationLevel);

  if (isLoading) {
    return (
      <Card bg={bg}>
        <CardBody p={cardSpacing}>
          <VStack spacing={spacing}>
            <Skeleton height="60px" width="100%" borderRadius="lg" />
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={spacing} width="100%">
              <Skeleton height="80px" borderRadius="md" />
              <Skeleton height="80px" borderRadius="md" />
              <Skeleton height="80px" borderRadius="md" />
              <Skeleton height="80px" borderRadius="md" />
            </SimpleGrid>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  // Hero variant for main transparency display
  if (variant === 'hero') {
    return (
      <Card
        bg={`${trustLevel.color}.50`}
        borderColor={`${trustLevel.color}.200`}
        borderWidth="2px"
        borderRadius="xl"
        boxShadow="xl"
      >
        <CardBody p={cardSpacing}>
          <VStack spacing={spacing} align="stretch">
            {/* Main Trust Score Header */}
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: visibleElements >= 1 ? 1 : 0, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <HStack justify="space-between" align="center" flexWrap="wrap">
                <HStack spacing={4}>
                  <Circle
                    size="60px"
                    bg={`${trustLevel.color}.100`}
                    borderWidth="3px"
                    borderColor={trustLevel.bgColor}
                  >
                    <Icon as={trustLevel.icon} color={trustLevel.bgColor} boxSize={7} />
                  </Circle>
                  <VStack align="start" spacing={1}>
                    <Text
                      fontSize={{ base: 'lg', md: 'xl' }}
                      fontWeight="bold"
                      color={`${trustLevel.color}.700`}
                    >
                      {trustLevel.level}
                    </Text>
                    <Text fontSize="sm" color={`${trustLevel.color}.600`}>
                      Trust Score: {trustScore}/100
                    </Text>
                    <Text fontSize="xs" color={mutedColor} maxW="200px">
                      {trustLevel.description}
                    </Text>
                  </VStack>
                </HStack>

                <VStack spacing={2} align="end">
                  <Badge
                    colorScheme={verificationDetails.color}
                    variant="solid"
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontSize="xs"
                    fontWeight="bold"
                  >
                    {verificationDetails.badge}
                  </Badge>
                  <HStack spacing={1}>
                    {trustData.isUSDAVerified && (
                      <Tooltip label="USDA Verified" hasArrow>
                        <Circle size="24px" bg="blue.100">
                          <Icon as={MdVerified} color="blue.500" boxSize={3} />
                        </Circle>
                      </Tooltip>
                    )}
                    {trustData.isBlockchainVerified && (
                      <Tooltip label="Blockchain Verified" hasArrow>
                        <Circle size="24px" bg="green.100">
                          <Icon as={BsShieldCheck} color="green.500" boxSize={3} />
                        </Circle>
                      </Tooltip>
                    )}
                  </HStack>
                </VStack>
              </HStack>
            </MotionBox>

            {/* Trust Score Progress */}
            <MotionBox
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{
                opacity: visibleElements >= 2 ? 1 : 0,
                scaleX: visibleElements >= 2 ? 1 : 0
              }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="sm" fontWeight="medium" color={textColor}>
                    Overall Trust Level
                  </Text>
                  <Text fontSize="sm" color={`${trustLevel.color}.600`} fontWeight="bold">
                    {trustScore}%
                  </Text>
                </HStack>
                <Progress
                  value={trustScore}
                  colorScheme={trustLevel.color}
                  size="lg"
                  borderRadius="full"
                  bg="gray.100"
                />
              </Box>
            </MotionBox>

            {/* Trust Metrics Grid */}
            {showMetrics && (
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: visibleElements >= 3 ? 1 : 0, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                  {/* Transparency Score */}
                  <Box
                    bg={cardBg}
                    p={3}
                    borderRadius="lg"
                    border="1px"
                    borderColor={borderColor}
                    textAlign="center"
                  >
                    <VStack spacing={1}>
                      <Icon as={FaEye} color="blue.500" boxSize={iconSize} />
                      <Text fontSize="lg" fontWeight="bold" color="blue.600">
                        {trustData.transparencyScore}%
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        Transparency
                      </Text>
                    </VStack>
                  </Box>

                  {/* Documentation */}
                  <Box
                    bg={cardBg}
                    p={3}
                    borderRadius="lg"
                    border="1px"
                    borderColor={borderColor}
                    textAlign="center"
                  >
                    <VStack spacing={1}>
                      <Icon as={FaChartLine} color="green.500" boxSize={iconSize} />
                      <Text fontSize="lg" fontWeight="bold" color="green.600">
                        {trustData.documentationCompleteness}%
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        Documentation
                      </Text>
                    </VStack>
                  </Box>

                  {/* Consumer Engagement */}
                  <Box
                    bg={cardBg}
                    p={3}
                    borderRadius="lg"
                    border="1px"
                    borderColor={borderColor}
                    textAlign="center"
                  >
                    <VStack spacing={1}>
                      <Icon as={FaUsers} color="purple.500" boxSize={iconSize} />
                      <Text fontSize="lg" fontWeight="bold" color="purple.600">
                        {trustData.consumerScans}
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        Consumer Scans
                      </Text>
                    </VStack>
                  </Box>

                  {/* Farm History */}
                  <Box
                    bg={cardBg}
                    p={3}
                    borderRadius="lg"
                    border="1px"
                    borderColor={borderColor}
                    textAlign="center"
                  >
                    <VStack spacing={1}>
                      <Icon as={FaCalendarAlt} color="orange.500" boxSize={iconSize} />
                      <Text fontSize="lg" fontWeight="bold" color="orange.600">
                        {trustData.farmingHistoryYears}y
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        Farm History
                      </Text>
                    </VStack>
                  </Box>
                </SimpleGrid>
              </MotionBox>
            )}

            {/* Detailed Trust Indicators */}
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: visibleElements >= 4 ? 1 : 0, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" fontWeight="bold" color={textColor}>
                  Trust Indicators Breakdown
                </Text>

                <VStack spacing={2} align="stretch">
                  {Object.entries(trustData.trustIndicators).map(([key, value], index) => {
                    const indicatorName = key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, (str) => str.toUpperCase());
                    const indicatorColor = value >= 80 ? 'green' : value >= 60 ? 'blue' : 'yellow';

                    return (
                      <Box key={key}>
                        <HStack justify="space-between" mb={1}>
                          <Text fontSize="xs" color={mutedColor}>
                            {indicatorName}
                          </Text>
                          <Text fontSize="xs" fontWeight="bold" color={`${indicatorColor}.600`}>
                            {value}%
                          </Text>
                        </HStack>
                        <Progress
                          value={value}
                          colorScheme={indicatorColor}
                          size="sm"
                          borderRadius="full"
                          bg="gray.100"
                        />
                      </Box>
                    );
                  })}
                </VStack>
              </VStack>
            </MotionBox>

            {/* Trust Building Message */}
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: visibleElements >= 5 ? 1 : 0, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <Box
                bg={`${trustLevel.color}.100`}
                p={4}
                borderRadius="lg"
                border="1px"
                borderColor={`${trustLevel.color}.200`}
                textAlign="center"
              >
                <VStack spacing={2}>
                  <Icon as={FaShieldAlt} color={`${trustLevel.color}.500`} boxSize={6} />
                  <Text fontSize="sm" fontWeight="bold" color={`${trustLevel.color}.700`}>
                    Transparency You Can Trust
                  </Text>
                  <Text fontSize="xs" color={`${trustLevel.color}.600`} maxW="sm">
                    This farm demonstrates commitment to open practices with verified documentation
                    and third-party validation, building genuine trust with consumers.
                  </Text>
                  <Text fontSize="xs" color={mutedColor} fontStyle="italic">
                    Last updated: {trustData.lastUpdated}
                  </Text>
                </VStack>
              </Box>
            </MotionBox>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  // Compact variant for quick reference
  if (variant === 'compact') {
    return (
      <Card bg={bg} borderRadius="lg" boxShadow="md">
        <CardBody p={4}>
          <HStack justify="space-between" align="center">
            <HStack spacing={3}>
              <Circle size="40px" bg={`${trustLevel.color}.100`}>
                <Icon as={trustLevel.icon} color={trustLevel.bgColor} boxSize={5} />
              </Circle>
              <VStack align="start" spacing={0}>
                <Text fontSize="md" fontWeight="bold" color={textColor}>
                  {trustLevel.level}
                </Text>
                <Text fontSize="xs" color={mutedColor}>
                  {trustScore}/100 Trust Score
                </Text>
              </VStack>
            </HStack>

            <Badge
              colorScheme={trustLevel.color}
              variant="solid"
              px={3}
              py={1}
              borderRadius="full"
              fontSize="xs"
            >
              VERIFIED
            </Badge>
          </HStack>
        </CardBody>
      </Card>
    );
  }

  // Default return for detailed variant
  return (
    <Card bg={bg} borderRadius="xl" boxShadow="lg">
      <CardBody p={cardSpacing}>
        <Text fontSize="lg" fontWeight="bold" color={textColor} mb={4}>
          Transparency Trust Indicators
        </Text>
        {/* Detailed implementation would go here */}
      </CardBody>
    </Card>
  );
};

export default TransparencyTrustIndicators;
