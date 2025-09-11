import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Button,
  Circle,
  Progress,
  Flex,
  useColorModeValue,
  useDisclosure,
  Container,
  Grid,
  GridItem,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  useBreakpointValue
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaLeaf,
  FaShieldAlt,
  FaCertificate,
  FaUsers,
  FaStar,
  FaCheckCircle,
  FaCarSide,
  FaTree,
  FaGlobeAmericas,
  FaChartLine,
  FaInfoCircle,
  FaBolt,
  FaAward,
  FaRecycle,
  FaTachometerAlt
} from 'react-icons/fa';
import { MdVerified, MdScience, MdEco } from 'react-icons/md';
import { BsShieldCheck } from 'react-icons/bs';

const MotionBox = motion(Box);
const MotionVStack = motion(VStack);
const MotionHStack = motion(HStack);

// Enhanced animations for hero impact
const scoreGlow = keyframes`
  0% { box-shadow: 0 0 20px rgba(76, 175, 80, 0.3); }
  50% { box-shadow: 0 0 40px rgba(76, 175, 80, 0.6), 0 0 60px rgba(76, 175, 80, 0.3); }
  100% { box-shadow: 0 0 20px rgba(76, 175, 80, 0.3); }
`;

const trustPulse = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

interface CarbonScoreData {
  score: number;
  footprint: number;
  relatableFootprint?: string;
  industryPercentile?: number;
  grade?: string;
  level?: string;
}

interface TrustIndicatorData {
  confidenceScore: number;
  isUSDAVerified: boolean;
  isBlockchainVerified: boolean;
  reviewsCount: number;
  averageRating: number;
  scansCount: number;
  transparencyScore: number;
}

interface ProductBasicData {
  name: string;
  company: {
    name: string;
  };
}

interface CarbonHeroSectionProps {
  carbonData?: CarbonScoreData;
  trustData?: TrustIndicatorData;
  productData?: ProductBasicData;
  isLoading?: boolean;
  onLearnMore?: () => void;
  onTrustDetails?: () => void;
}

export const CarbonHeroSection: React.FC<CarbonHeroSectionProps> = ({
  carbonData,
  trustData,
  productData,
  isLoading = false,
  onLearnMore,
  onTrustDetails
}) => {
  const [visibleElements, setVisibleElements] = useState(0);
  const [showDetailedComparison, setShowDetailedComparison] = useState(false);

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const successColor = useColorModeValue('green.600', 'green.400');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Responsive values
  const heroHeight = useBreakpointValue({ base: 'auto', md: '60vh' });
  const scoreSize = useBreakpointValue({ base: '140px', md: '180px' });
  const fontSize = useBreakpointValue({ base: 'xl', md: '2xl' });
  const spacing = useBreakpointValue({ base: 4, md: 6 });

  // 2025 Best Practice: Reserve space and fade in simultaneously to prevent layout shift
  useEffect(() => {
    if (!isLoading && carbonData) {
      // Show all elements at once with staggered animation delays
      // This prevents layout shift by reserving all space upfront
      setVisibleElements(5);
    }
  }, [isLoading, carbonData]);

  // Score calculations and display logic
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'green.500';
    if (score >= 60) return 'green.400';
    if (score >= 40) return 'yellow.400';
    if (score >= 20) return 'orange.400';
    return 'red.500';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return { grade: 'A+', text: 'Outstanding', color: 'green' };
    if (score >= 80) return { grade: 'A', text: 'Excellent', color: 'green' };
    if (score >= 70) return { grade: 'B', text: 'Good', color: 'green' };
    if (score >= 60) return { grade: 'C', text: 'Average', color: 'yellow' };
    if (score >= 40) return { grade: 'D', text: 'Below Average', color: 'orange' };
    return { grade: 'F', text: 'Needs Improvement', color: 'red' };
  };

  const getImpactLevel = (footprint: number) => {
    if (footprint <= 0)
      return {
        level: 'Carbon Negative',
        color: 'green',
        icon: FaRecycle,
        description: 'Actually removes carbon from the atmosphere'
      };
    if (footprint < 1)
      return {
        level: 'Ultra Low Impact',
        color: 'green',
        icon: FaLeaf,
        description: 'Minimal environmental footprint'
      };
    if (footprint < 5)
      return {
        level: 'Low Impact',
        color: 'green',
        icon: FaTree,
        description: 'Environmentally conscious choice'
      };
    if (footprint < 15)
      return {
        level: 'Moderate Impact',
        color: 'yellow',
        icon: FaGlobeAmericas,
        description: 'Average environmental impact'
      };
    if (footprint < 30)
      return {
        level: 'High Impact',
        color: 'orange',
        icon: FaCarSide,
        description: 'Consider offsetting this impact'
      };
    return {
      level: 'Very High Impact',
      color: 'red',
      icon: FaBolt,
      description: 'Significant environmental consideration'
    };
  };

  const getConsumerMessage = (score: number, footprint: number) => {
    const grade = getScoreGrade(score);
    const impact = getImpactLevel(footprint);

    if (score >= 80) {
      return {
        primary: '🌟 Exceptional Choice!',
        secondary: 'This product represents outstanding sustainability practices',
        action: 'Feel great about this choice'
      };
    }
    if (score >= 60) {
      return {
        primary: '🌿 Great Choice!',
        secondary: 'This product shows strong environmental responsibility',
        action: 'A responsible choice you can trust'
      };
    }
    if (score >= 40) {
      return {
        primary: '✅ Good Choice',
        secondary: 'This product meets solid environmental standards',
        action: 'A balanced choice for conscious consumers'
      };
    }
    return {
      primary: '🔄 Room for Improvement',
      secondary: 'This product is working towards better sustainability',
      action: 'Consider offsetting to make it carbon neutral'
    };
  };

  const getTrustScore = () => {
    if (!trustData) return 0;

    let score = 0;
    const maxScore = 100;

    // Carbon score contribution (40%)
    score += (carbonData?.score || 0) * 0.4;

    // Verification contribution (30%)
    if (trustData.isUSDAVerified) score += 15;
    if (trustData.isBlockchainVerified) score += 15;

    // Social proof contribution (20%)
    if (trustData.reviewsCount > 0) {
      score += Math.min(trustData.averageRating * 4, 15);
      score += Math.min(trustData.reviewsCount / 10, 5);
    }

    // Transparency contribution (10%)
    score += Math.min(trustData.transparencyScore * 0.1, 10);

    return Math.min(Math.round(score), maxScore);
  };

  const getRelatableComparison = (footprint: number) => {
    const absFootprint = Math.abs(footprint);

    if (footprint <= 0) {
      return {
        icon: FaRecycle,
        text: `Removes ${(absFootprint * 2.31).toFixed(1)} miles worth of CO₂`,
        color: 'green.500',
        emphasis: 'Actually helps the environment!'
      };
    }

    return {
      icon: FaCarSide,
      text: `Like driving ${(absFootprint * 2.31).toFixed(1)} miles`,
      color: getScoreColor(carbonData?.score || 0),
      emphasis:
        footprint < 5
          ? 'Very low impact'
          : footprint < 15
          ? 'Moderate impact'
          : 'Consider offsetting'
    };
  };

  if (isLoading) {
    return (
      <Box
        minH={heroHeight}
        bg={`linear-gradient(135deg, ${successColor}15 0%, ${successColor}05 100%)`}
        p={spacing}
        position="relative">
        <Container maxW="container.md" py={spacing}>
          <VStack spacing={6} align="center" textAlign="center">
            <SkeletonCircle size={scoreSize} />
            <VStack spacing={3}>
              <SkeletonText noOfLines={1} width="200px" />
              <SkeletonText noOfLines={2} width="300px" />
            </VStack>
            <HStack spacing={4}>
              <Skeleton height="40px" width="120px" borderRadius="md" />
              <Skeleton height="40px" width="120px" borderRadius="md" />
            </HStack>
          </VStack>
        </Container>
      </Box>
    );
  }

  if (!carbonData) {
    return (
      <Box
        minH={heroHeight}
        bg={cardBg}
        p={spacing}
        display="flex"
        alignItems="center"
        justifyContent="center">
        <VStack spacing={4} textAlign="center">
          <Icon as={FaInfoCircle} boxSize={12} color={mutedColor} />
          <Text fontSize="lg" color={mutedColor}>
            Loading carbon data...
          </Text>
        </VStack>
      </Box>
    );
  }

  const score = carbonData.score || 0;
  const footprint = carbonData.footprint || 0;
  const grade = getScoreGrade(score);
  const impact = getImpactLevel(footprint);
  const comparison = getRelatableComparison(footprint);
  const message = getConsumerMessage(score, footprint);
  const trustScore = getTrustScore();

  return (
    <Box
      minH={heroHeight}
      bg={`linear-gradient(135deg, ${getScoreColor(score)}15 0%, ${getScoreColor(score)}05 100%)`}
      position="relative"
      pt="145px"
      overflow="hidden">
      {/* Background pattern */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        opacity={0.03}
        bgImage="radial-gradient(circle at 50% 50%, currentColor 1px, transparent 1px)"
        bgSize="20px 20px"
        color={getScoreColor(score)}
      />

      <Container maxW="container.md" py={spacing} position="relative" zIndex={1}>
        <AnimatePresence>
          <MotionVStack
            spacing={spacing}
            align="center"
            textAlign="center"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}>
            {/* Product name and company */}
            {productData && (
              <MotionVStack
                spacing={2}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: visibleElements >= 1 ? 1 : 0, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}>
                <Text fontSize={fontSize} fontWeight="bold" color={textColor}>
                  {productData.name}
                </Text>
                <Text fontSize="md" color={mutedColor} fontWeight="medium">
                  by {productData.company.name}
                </Text>
              </MotionVStack>
            )}

            {/* Main Carbon Score Display */}
            <MotionBox
              pt="20px"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: visibleElements >= 2 ? 1 : 0, scale: visibleElements >= 2 ? 1 : 0.8 }}
              transition={{ delay: 0.2, duration: 0.8, type: 'spring', bounce: 0.3 }}
              position="relative">
                <Circle
                  size={scoreSize}
                  bg={bgColor}
                  borderWidth="8px"
                  borderColor={getScoreColor(score)}
                  boxShadow="xl"
                  animation={`${scoreGlow} 3s ease-in-out infinite`}
                  position="relative">
                  <VStack spacing={0}>
                    <Text
                      fontSize={{ base: '3xl', md: '4xl' }}
                      fontWeight="black"
                      color={getScoreColor(score)}
                      lineHeight="1">
                      {Math.round(score)}
                    </Text>
                    <Text
                      fontSize={{ base: 'sm', md: 'md' }}
                      fontWeight="bold"
                      color={textColor}
                      lineHeight="1">
                      Carbon Score
                    </Text>
                  </VStack>

                  {/* Grade badge */}
                  <Badge
                    position="absolute"
                    top="-3"
                    right="-3"
                    colorScheme={grade.color}
                    variant="solid"
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontSize="sm"
                    fontWeight="bold"
                    boxShadow="md">
                    {grade.grade}
                  </Badge>
                </Circle>
              </MotionBox>

            {/* Consumer-friendly message */}
            <MotionVStack
              spacing={3}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: visibleElements >= 3 ? 1 : 0, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              maxW="md">
              <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color={successColor}>
                {message.primary}
              </Text>
              <Text fontSize={{ base: 'md', md: 'lg' }} color={textColor} fontWeight="medium">
                {message.secondary}
              </Text>
              <Text fontSize="sm" color={mutedColor} fontStyle="italic">
                {message.action}
              </Text>
            </MotionVStack>

            {/* Impact comparison */}
            <MotionBox
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: visibleElements >= 4 ? 1 : 0, scale: visibleElements >= 4 ? 1 : 0.9 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              bg={cardBg}
              p={4}
              borderRadius="xl"
              borderWidth="1px"
              borderColor={borderColor}
              maxW="sm"
              w="full">
              <HStack justify="center" spacing={3}>
                <Circle size="40px" bg={`${comparison.color}20`}>
                  <Icon as={comparison.icon} color={comparison.color} boxSize={5} />
                </Circle>
                <VStack align="start" spacing={0} flex={1}>
                  <Text fontSize="sm" fontWeight="bold" color={textColor}>
                    {comparison.text}
                  </Text>
                  <Text fontSize="xs" color={mutedColor}>
                    {comparison.emphasis}
                  </Text>
                </VStack>
              </HStack>
            </MotionBox>

            {/* Trust indicators */}
            {trustData && (
              <MotionHStack
                spacing={4}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: visibleElements >= 5 ? 1 : 0, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                wrap="wrap"
                justify="center">
                {trustData.isUSDAVerified && (
                  <Badge
                    colorScheme="green"
                    variant="subtle"
                    px={3}
                    py={2}
                    borderRadius="full"
                    fontSize="xs"
                    animation={`${trustPulse} 2s ease-in-out infinite`}>
                    <HStack spacing={1}>
                      <Icon as={MdVerified} boxSize={3} />
                      <Text>USDA Verified</Text>
                    </HStack>
                  </Badge>
                )}

                {trustData.isBlockchainVerified && (
                  <Badge
                    colorScheme="blue"
                    variant="subtle"
                    px={3}
                    py={2}
                    borderRadius="full"
                    fontSize="xs"
                    animation={`${trustPulse} 2.5s ease-in-out infinite`}>
                    <HStack spacing={1}>
                      <Icon as={BsShieldCheck} boxSize={3} />
                      <Text>Blockchain Verified</Text>
                    </HStack>
                  </Badge>
                )}

                {trustData.scansCount > 0 && (
                  <Badge
                    colorScheme="purple"
                    variant="subtle"
                    px={3}
                    py={2}
                    borderRadius="full"
                    fontSize="xs">
                    <HStack spacing={1}>
                      <Icon as={FaUsers} boxSize={3} />
                      <Text>{trustData.scansCount}+ scans</Text>
                    </HStack>
                  </Badge>
                )}
              </MotionHStack>
            )}

            {/* Action buttons */}
            <MotionHStack
              spacing={4}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: visibleElements >= 5 ? 1 : 0, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              pt={2}>
              <Button
                colorScheme="green"
                size="md"
                leftIcon={<Icon as={FaInfoCircle} />}
                onClick={onLearnMore}
                borderRadius="full"
                px={6}
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg'
                }}
                transition="all 0.2s">
                Learn More
              </Button>

              {trustData && (
                <Button
                  variant="outline"
                  colorScheme="green"
                  size="md"
                  leftIcon={<Icon as={FaShieldAlt} />}
                  onClick={onTrustDetails}
                  borderRadius="full"
                  px={6}
                  _hover={{
                    transform: 'translateY(-2px)',
                    boxShadow: 'lg'
                  }}
                  transition="all 0.2s">
                  Trust Score: {trustScore}%
                </Button>
              )}
            </MotionHStack>
          </MotionVStack>
        </AnimatePresence>
      </Container>
    </Box>
  );
};

export default CarbonHeroSection;
