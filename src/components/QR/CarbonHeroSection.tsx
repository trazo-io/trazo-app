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
  FaTachometerAlt,
  FaEye
} from 'react-icons/fa';
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
  reputation?: number; // 0-5 scale from consumer reviews
}

interface CarbonHeroSectionProps {
  carbonData?: CarbonScoreData;
  trustData?: TrustIndicatorData;
  productData?: ProductBasicData;
  isLoading?: boolean;
  onLearnMore?: () => void;
}

export const CarbonHeroSection: React.FC<CarbonHeroSectionProps> = ({
  carbonData,
  trustData,
  productData,
  isLoading = false,
  onLearnMore
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

  const getTransparencyMessage = (score: number) => {
    if (score >= 95) {
      return {
        primary: '🌟 Open Book Farm',
        secondary:
          'This farmer shares their complete growing story - from seed to harvest, you can see it all',
        action: 'Discover every step of how your food was grown'
      };
    }
    if (score >= 85) {
      return {
        primary: '👨‍🌾 Farm Storyteller',
        secondary: 'This farmer takes pride in sharing their growing practices and field stories',
        action: 'See the farming journey behind your food'
      };
    }
    if (score >= 70) {
      return {
        primary: '🚜 Working Farm',
        secondary: 'This farmer shares key details about how they care for their crops and land',
        action: 'Learn about real farming practices'
      };
    }
    if (score >= 50) {
      return {
        primary: '🌾 Growing Story',
        secondary: 'This farmer is building their story, sharing the essentials of how they farm',
        action: 'Supporting farmers who share their work'
      };
    }
    return {
      primary: '🌱 Farm Beginnings',
      secondary: 'This farmer is starting to share their growing practices with you',
      action: 'Encouraging farming transparency, one story at a time'
    };
  };

  const getConsumerMessage = (score: number, footprint: number) => {
    // Use transparency messaging when in transparency mode
    if (carbonData?.level === 'transparency') {
      return getTransparencyMessage(score);
    }

    // Informative carbon messaging (not competitive)
    const grade = getScoreGrade(score);
    const impact = getImpactLevel(footprint);

    if (score >= 80) {
      return {
        primary: '🌱 Sustainable Farming Practices',
        secondary:
          'This farm demonstrates excellent environmental stewardship with documented sustainable practices',
        action: 'Learn about the specific farming methods used'
      };
    }
    if (score >= 60) {
      return {
        primary: '🌿 Environmentally Conscious Farming',
        secondary: 'This farm follows good environmental practices and tracks their impact',
        action: 'See the environmental practices used'
      };
    }
    if (score >= 40) {
      return {
        primary: '🌾 Standard Environmental Practices',
        secondary:
          'This farm meets environmental standards and provides transparency about their methods',
        action: 'Explore the farming methods documented'
      };
    }
    return {
      primary: '🌱 Developing Sustainable Practices',
      secondary: 'This farm is working to improve their environmental practices and transparency',
      action: 'Support farmers improving their sustainability'
    };
  };

  const getRelatableComparison = (footprint: number) => {
    // In transparency mode, show transparency-related information instead of carbon comparisons
    if (carbonData?.level === 'transparency') {
      const score = carbonData.score || 0;
      const eventCount = Math.round((score / 100) * 15); // Approximate events based on score

      if (score >= 95) {
        return {
          icon: BsShieldCheck,
          text: `Complete farm story from planting to harvest`,
          color: 'green.600',
          emphasis: 'Every farming step shared with you'
        };
      } else if (score >= 85) {
        return {
          icon: FaCheckCircle,
          text: `Rich story of how your food was grown`,
          color: 'green.500',
          emphasis: 'Detailed farming journey available'
        };
      } else if (score >= 70) {
        return {
          icon: FaInfoCircle,
          text: `Key farming moments shared with care`,
          color: 'blue.500',
          emphasis: 'Important growing steps documented'
        };
      } else {
        return {
          icon: FaEye,
          text: `Essential farming practices revealed`,
          color: 'orange.500',
          emphasis: 'Basic farm story building'
        };
      }
    }

    // Original carbon comparison for carbon mode
    const absFootprint = Math.abs(footprint);

    if (footprint <= 0) {
      return {
        icon: FaRecycle,
        text: `Removes ${(absFootprint / 0.35548).toFixed(1)} miles worth of CO₂`,
        color: 'green.500',
        emphasis: 'Actually helps the environment!'
      };
    }

    return {
      icon: FaCarSide,
      text: `Like driving ${(absFootprint / 0.35548).toFixed(1)} miles`,
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
        position="relative"
      >
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
        justifyContent="center"
      >
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
  return (
    <Box
      minH={heroHeight}
      bg={`linear-gradient(135deg, ${getScoreColor(score)}15 0%, ${getScoreColor(score)}05 100%)`}
      position="relative"
      pt="145px"
      overflow="hidden"
    >
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
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* Product name and company */}
            {productData && (
              <MotionVStack
                spacing={2}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: visibleElements >= 1 ? 1 : 0, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
              >
                <Text fontSize={fontSize} fontWeight="bold" color={textColor}>
                  {productData.name}
                </Text>
                <Text fontSize="md" color={mutedColor} fontWeight="medium">
                  by {productData.company.name}
                </Text>
                {/* Production reputation stars */}
                {productData.reputation !== undefined && productData.reputation > 0 && (
                  <HStack spacing={1} justify="center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Icon
                        key={star}
                        as={FaStar}
                        boxSize={4}
                        color={
                          star <= Math.round(productData.reputation!) ? 'yellow.400' : 'gray.300'
                        }
                      />
                    ))}
                    <Text fontSize="sm" color={mutedColor} ml={1}>
                      ({productData.reputation!.toFixed(1)})
                    </Text>
                  </HStack>
                )}
              </MotionVStack>
            )}

            {/* Main Carbon Score Display */}
            <MotionBox
              pt="20px"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: visibleElements >= 2 ? 1 : 0,
                scale: visibleElements >= 2 ? 1 : 0.8
              }}
              transition={{ delay: 0.2, duration: 0.8, type: 'spring', bounce: 0.3 }}
              position="relative"
            >
              <Circle
                size={scoreSize}
                bg={bgColor}
                borderWidth="8px"
                borderColor={getScoreColor(score)}
                boxShadow="xl"
                animation={`${scoreGlow} 3s ease-in-out infinite`}
                position="relative"
              >
                <VStack spacing={0}>
                  <Text
                    fontSize={{ base: '3xl', md: '4xl' }}
                    fontWeight="black"
                    color={getScoreColor(score)}
                    lineHeight="1"
                  >
                    {Math.round(score)}
                  </Text>
                  <Text
                    fontSize={{ base: 'sm', md: 'md' }}
                    fontWeight="bold"
                    color={textColor}
                    lineHeight="1"
                  >
                    Transparency Score
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
                  boxShadow="md"
                >
                  {grade.grade}
                </Badge>
              </Circle>
            </MotionBox>

            {/* Transparency score disclaimer */}
            <Text
              fontSize="xs"
              color="gray.500"
              mt={1}
              textAlign="center"
            >
              Based on farmer-reported documentation. Not independently audited.{' '}
              <Text
                as="a"
                href="https://www.trazo.io/methodology"
                target="_blank"
                rel="noopener noreferrer"
                color="green.500"
                _hover={{ textDecoration: 'underline' }}
              >
                How we calculate this
              </Text>
            </Text>

            {/* Consumer-friendly message */}
            <MotionVStack
              spacing={3}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: visibleElements >= 3 ? 1 : 0, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              maxW="md"
            >
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
              animate={{
                opacity: visibleElements >= 4 ? 1 : 0,
                scale: visibleElements >= 4 ? 1 : 0.9
              }}
              transition={{ delay: 0.4, duration: 0.6 }}
              bg={cardBg}
              p={4}
              borderRadius="xl"
              borderWidth="1px"
              borderColor={borderColor}
              maxW="sm"
              w="full"
            >
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
                justify="center"
              >
                {trustData.isBlockchainVerified && (
                  <Badge
                    colorScheme="blue"
                    variant="subtle"
                    px={3}
                    py={2}
                    borderRadius="full"
                    fontSize="xs"
                    animation={`${trustPulse} 2.5s ease-in-out infinite`}
                  >
                    <HStack spacing={1}>
                      <Icon as={BsShieldCheck} boxSize={3} />
                      <Text>Blockchain-Recorded</Text>
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
                    fontSize="xs"
                  >
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
              pt={2}
            >
              <Button
                colorScheme="green"
                size="md"
                minH="44px"
                leftIcon={<Icon as={FaInfoCircle} />}
                onClick={onLearnMore}
                borderRadius="full"
                px={6}
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg'
                }}
                transition="all 0.2s"
              >
                Learn More
              </Button>
            </MotionHStack>
          </MotionVStack>
        </AnimatePresence>
      </Container>
    </Box>
  );
};

export default CarbonHeroSection;
