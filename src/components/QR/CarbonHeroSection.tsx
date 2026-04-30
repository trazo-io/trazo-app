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
  Image,
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
  // 2026 hero redesign — optional photo + harvest context
  heroPhotoUrl?: string;
  harvestDate?: string;
}

export const CarbonHeroSection: React.FC<CarbonHeroSectionProps> = ({
  carbonData,
  trustData,
  productData,
  isLoading = false,
  onLearnMore,
  heroPhotoUrl,
  harvestDate
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
  const grade = getScoreGrade(score);
  const message = getConsumerMessage(score, carbonData.footprint || 0);

  // Format harvest date for hero overlay (e.g. "Harvested Mar 18, 2026").
  // Falls back to nothing when missing — never renders "Recently harvested"
  // placeholder which feels like a stand-in.
  const formattedHarvest = (() => {
    if (!harvestDate) return null;
    try {
      const d = new Date(harvestDate);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return null;
    }
  })();

  return (
    <Box position="relative" overflow="hidden" bg="white">
      {/* Hero photo + glassmorphism score badge.
          Photo extends to top:0 (behind the floating navbar) for a
          magazine-style edge-to-edge cover. Photo height is generous so
          the bottom-anchored overlays (farm name, score badge) sit well
          clear of the navbar pill. Falls back to score-tinted gradient
          when no photo exists for this production. */}
      <MotionBox
        position="relative"
        h={{ base: '60vh', md: '68vh' }}
        maxH={{ base: '560px', md: '680px' }}
        minH={{ base: '440px', md: '500px' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: visibleElements >= 1 ? 1 : 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {heroPhotoUrl ? (
          <>
            <Image
              src={heroPhotoUrl}
              alt={`${productData?.company.name ?? 'Farm'} growing ${
                productData?.name ?? 'this product'
              }`}
              objectFit="cover"
              objectPosition="center"
              position="absolute"
              inset={0}
              w="100%"
              h="100%"
              loading="eager"
              draggable={false}
            />
            {/* Bottom-up gradient for text legibility on the photo. */}
            <Box
              position="absolute"
              inset={0}
              bgGradient="linear(to-t, blackAlpha.800 0%, blackAlpha.500 30%, blackAlpha.100 60%, transparent 80%)"
              pointerEvents="none"
            />
          </>
        ) : (
          <Box
            position="absolute"
            inset={0}
            bgGradient={`linear(135deg, ${getScoreColor(score)}30 0%, ${getScoreColor(
              score
            )}10 100%)`}
          />
        )}

        {/* Overlay container — constrains farm name + score badge to the
            same maxW as the pillars below. Photo stays full-bleed, but the
            overlays align with the rest of the page content on desktop. */}
        <Container
          maxW="container.lg"
          position="absolute"
          inset={0}
          px={{ base: 4, md: 6, lg: 8 }}
          pointerEvents="none"
        >
          {/* Bottom-left text overlay — farm name + product/harvest line.
              Right-padded to leave room for the score badge. */}
          <VStack
            position="absolute"
            bottom={{ base: 5, md: 8 }}
            left={{ base: 4, md: 6, lg: 8 }}
            right={{ base: '120px', md: '180px' }}
            align="flex-start"
            spacing={1}
            color={heroPhotoUrl ? 'white' : 'gray.800'}
            pointerEvents="auto"
          >
            <Text
              fontSize={{ base: '2xl', md: '4xl' }}
              fontWeight="bold"
              lineHeight="1.1"
              letterSpacing="-0.02em"
              noOfLines={2}
              textShadow={heroPhotoUrl ? '0 2px 12px rgba(0,0,0,0.4)' : 'none'}
            >
              {productData?.company.name ?? 'Farm'}
            </Text>
            <Text
              fontSize={{ base: 'sm', md: 'md' }}
              fontWeight="medium"
              opacity={heroPhotoUrl ? 0.95 : 0.8}
              noOfLines={2}
              textShadow={heroPhotoUrl ? '0 1px 6px rgba(0,0,0,0.4)' : 'none'}
            >
              {productData?.name ?? 'Product'}
              {formattedHarvest ? ` · Harvested ${formattedHarvest}` : ''}
            </Text>
          </VStack>

          {/* Glassmorphism score badge — bottom-right corner.
              One verdict element. Frosted glass = 2024-2026 premium aesthetic.
              On gradient fallback: solid white card for legibility. */}
          <MotionBox
            position="absolute"
            bottom={{ base: 5, md: 8 }}
            right={{ base: 4, md: 6, lg: 8 }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{
              opacity: visibleElements >= 2 ? 1 : 0,
              scale: visibleElements >= 2 ? 1 : 0.85
            }}
            transition={{ delay: 0.2, duration: 0.6, type: 'spring', bounce: 0.3 }}
            style={{ pointerEvents: 'auto' }}
          >
          <VStack
            spacing={0.5}
            bg={heroPhotoUrl ? 'whiteAlpha.300' : 'white'}
            backdropFilter={heroPhotoUrl ? 'blur(20px)' : 'none'}
            borderWidth="1px"
            borderColor={heroPhotoUrl ? 'whiteAlpha.500' : 'gray.200'}
            borderRadius="2xl"
            px={{ base: 3.5, md: 4 }}
            py={{ base: 2.5, md: 3 }}
            minW={{ base: '92px', md: '108px' }}
            align="center"
            justify="center"
            boxShadow={
              heroPhotoUrl
                ? '0 8px 32px rgba(0, 0, 0, 0.18)'
                : '0 4px 16px rgba(0, 0, 0, 0.08)'
            }
          >
            <Text
              fontSize={{ base: '4xl', md: '5xl' }}
              fontWeight="black"
              color={heroPhotoUrl ? 'white' : getScoreColor(score)}
              lineHeight="1"
              letterSpacing="-0.04em"
              textShadow={heroPhotoUrl ? '0 1px 6px rgba(0,0,0,0.25)' : 'none'}
            >
              {Math.round(score)}
            </Text>
            <Badge
              bg={heroPhotoUrl ? 'whiteAlpha.900' : `${grade.color}.50`}
              color={`${grade.color}.700`}
              fontSize="xs"
              fontWeight="bold"
              px={2}
              py={0.5}
              borderRadius="md"
              mt={1}
            >
              {grade.grade}
            </Badge>
          </VStack>
        </MotionBox>
        </Container>
      </MotionBox>

      {/* Tier message strip — narrative voice carrying the verdict moment
          into a warm, plain-English sentence. Single line; expanded copy
          lives in `message.secondary` only when not redundant with the
          score badge above. */}
      <MotionVStack
        spacing={1}
        align="center"
        textAlign="center"
        bg="white"
        px={4}
        py={{ base: 4, md: 5 }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: visibleElements >= 3 ? 1 : 0, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <Text
          fontSize={{ base: 'lg', md: 'xl' }}
          fontWeight="bold"
          color={successColor}
          letterSpacing="-0.01em"
        >
          {message.primary}
        </Text>
        <Text
          fontSize={{ base: 'sm', md: 'md' }}
          color={mutedColor}
          maxW="2xl"
          lineHeight="1.5"
        >
          {message.secondary}
        </Text>
      </MotionVStack>
    </Box>
  );
};

export default CarbonHeroSection;
