import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  useColorModeValue,
  SimpleGrid
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

// Trazo shimmer animation
const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

interface TrazoShimmerProps {
  height?: string;
  width?: string;
  borderRadius?: string;
  isAnimated?: boolean;
}

// Base Trazo shimmer component with consistent styling
export const TrazoShimmer: React.FC<TrazoShimmerProps> = ({
  height = '16px',
  width = '100%',
  borderRadius = 'md',
  isAnimated = true
}) => {
  return (
    <Skeleton
      height={height}
      width={width}
      borderRadius={borderRadius}
      startColor={useColorModeValue('gray.100', 'gray.700')}
      endColor={useColorModeValue('gray.300', 'gray.600')}
      isLoaded={false}
      speed={isAnimated ? 0.8 : 0}
    />
  );
};

// Hero section shimmer with proper padding and containment
export const HeroShimmer: React.FC = () => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <Box
      bg={`linear-gradient(135deg, ${useColorModeValue(
        'green.50',
        'green.900'
      )}15 0%, ${useColorModeValue('green.50', 'green.900')}05 100%)`}
      minH="60vh"
      position="relative"
      pt="145px"
      px={{ base: 4, md: 8 }} // Add horizontal padding
      pb={8}
      overflow="hidden"
      w="full"
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
        color="green.500"
      />

      {/* Container with max width */}
      <Box maxW="container.md" mx="auto" position="relative" zIndex={1}>
        <VStack spacing={6} align="center" textAlign="center">
          {/* Product name area */}
          <VStack spacing={2}>
            <TrazoShimmer height="36px" width="60%" />
            <TrazoShimmer height="20px" width="40%" />
          </VStack>

          {/* Main Carbon Score Area */}
          <Box pt="20px">
            <VStack spacing={3}>
              <TrazoShimmer height="48px" width="120px" borderRadius="xl" />
              <TrazoShimmer height="20px" width="90px" borderRadius="md" />
              <TrazoShimmer height="6px" width="80px" borderRadius="full" />
            </VStack>
          </Box>

          {/* Consumer message */}
          <VStack spacing={3} maxW="md">
            <TrazoShimmer height="28px" width="80%" />
            <TrazoShimmer height="24px" width="90%" />
            <TrazoShimmer height="16px" width="70%" />
          </VStack>

          {/* Impact comparison card */}
          <Box
            bg={cardBg}
            p={4}
            borderRadius="xl"
            borderWidth="1px"
            borderColor={borderColor}
            maxW="sm"
            w="full"
          >
            <HStack justify="center" spacing={3}>
              <SkeletonCircle size="10" />
              <VStack align="start" spacing={1} flex={1}>
                <TrazoShimmer height="16px" width="80%" />
                <TrazoShimmer height="12px" width="60%" />
              </VStack>
            </HStack>
          </Box>

          {/* Trust badges */}
          <HStack spacing={4} wrap="wrap" justify="center">
            <TrazoShimmer height="32px" width="120px" borderRadius="full" />
            <TrazoShimmer height="32px" width="140px" borderRadius="full" />
            <TrazoShimmer height="32px" width="100px" borderRadius="full" />
          </HStack>

          {/* Action buttons */}
          <HStack spacing={4} pt={2}>
            <TrazoShimmer height="44px" width="120px" borderRadius="full" />
            <TrazoShimmer height="44px" width="140px" borderRadius="full" />
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
};

// Journey/Timeline shimmer
export const JourneyShimmer: React.FC = () => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <Box bg={cardBg} borderRadius="xl" border="1px solid" borderColor={borderColor} p={6} w="full">
      <VStack spacing={6}>
        {/* Header */}
        <HStack justify="space-between" w="full">
          <VStack align="start" spacing={2}>
            <TrazoShimmer height="24px" width="250px" />
            <TrazoShimmer height="16px" width="300px" />
          </VStack>
          <TrazoShimmer height="32px" width="120px" borderRadius="full" />
        </HStack>

        {/* Journey phases */}
        <VStack spacing={4} w="full">
          {[1, 2, 3, 4].map((i) => (
            <Box
              key={i}
              bg={useColorModeValue('gray.50', 'gray.700')}
              p={5}
              borderRadius="xl"
              border="1px solid"
              borderColor={borderColor}
              w="full"
              overflow="hidden" // Prevent content from spilling out
            >
              <HStack spacing={4} align="start" w="full">
                <SkeletonCircle size="14" flexShrink={0} />
                <VStack align="start" spacing={3} flex={1} minW={0}>
                  <HStack justify="space-between" w="full">
                    <TrazoShimmer height="20px" width="60%" />
                    <HStack spacing={3} flexShrink={0}>
                      <TrazoShimmer height="24px" width="60px" borderRadius="full" />
                      <TrazoShimmer height="16px" width="30px" />
                    </HStack>
                  </HStack>
                  <TrazoShimmer height="16px" width="90%" />
                  <TrazoShimmer height="28px" width="70%" borderRadius="md" />
                </VStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      </VStack>
    </Box>
  );
};

// Transparency/Analytics shimmer
export const TransparencyShimmer: React.FC = () => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <Box bg={cardBg} borderRadius="xl" border="1px solid" borderColor={borderColor} p={6} w="full">
      <VStack spacing={6}>
        {/* Header with score */}
        <HStack justify="space-between" w="full" align="start">
          <VStack align="start" spacing={4}>
            <HStack spacing={4}>
              <SkeletonCircle size="12" />
              <VStack align="start" spacing={2}>
                <TrazoShimmer height="18px" width="150px" />
                <HStack spacing={3}>
                  <TrazoShimmer height="36px" width="100px" borderRadius="lg" />
                  <TrazoShimmer height="28px" width="80px" borderRadius="full" />
                </HStack>
                <TrazoShimmer height="16px" width="200px" />
              </VStack>
            </HStack>
          </VStack>
          {/* Progress circle placeholder */}
          <Box position="relative">
            <SkeletonCircle size="24" />
            <Box position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)">
              <TrazoShimmer height="12px" width="30px" />
            </Box>
          </Box>
        </HStack>

        {/* Trust indicators grid */}
        <SimpleGrid columns={3} spacing={4} w="full">
          {[1, 2, 3].map((i) => (
            <Box
              key={i}
              bg={useColorModeValue('gray.50', 'gray.700')}
              p={4}
              borderRadius="lg"
              border="1px solid"
              borderColor={borderColor}
            >
              <VStack spacing={3}>
                <SkeletonCircle size="10" />
                <TrazoShimmer height="14px" width="90%" />
                <TrazoShimmer height="24px" width="70px" borderRadius="full" />
              </VStack>
            </Box>
          ))}
        </SimpleGrid>

        {/* Data sources */}
        <VStack spacing={4} w="full">
          {[1, 2].map((i) => (
            <Box
              key={i}
              bg={useColorModeValue('gray.50', 'gray.700')}
              p={4}
              borderRadius="lg"
              border="1px solid"
              borderColor={borderColor}
              w="full"
              overflow="hidden" // Prevent content overflow
            >
              <HStack spacing={4} align="start" w="full">
                <SkeletonCircle size="12" flexShrink={0} />
                <VStack align="start" spacing={2} flex={1} minW={0}>
                  <HStack spacing={3} w="full">
                    <TrazoShimmer height="18px" width="50%" />
                    <TrazoShimmer height="22px" width="70px" borderRadius="full" />
                  </HStack>
                  <TrazoShimmer height="14px" width="90%" />
                  <HStack spacing={6} w="full">
                    <TrazoShimmer height="12px" width="30%" />
                    <TrazoShimmer height="12px" width="25%" />
                  </HStack>
                </VStack>
                <VStack align="end" spacing={1} flexShrink={0}>
                  <TrazoShimmer height="24px" width="50px" borderRadius="md" />
                  <TrazoShimmer height="12px" width="60px" />
                </VStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      </VStack>
    </Box>
  );
};

// Sidebar shimmer
export const SidebarShimmer: React.FC = () => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <VStack spacing={4}>
      {/* Profile card */}
      <Box
        bg={cardBg}
        borderRadius="xl"
        border="1px solid"
        borderColor={borderColor}
        p={6}
        w="full"
      >
        <VStack spacing={4}>
          <SkeletonCircle size="16" />
          <TrazoShimmer height="20px" width="80%" />
          <TrazoShimmer height="14px" width="60%" />
          <TrazoShimmer height="40px" width="full" borderRadius="lg" />
        </VStack>
      </Box>

      {/* Quick stats */}
      <Box
        bg={cardBg}
        borderRadius="xl"
        border="1px solid"
        borderColor={borderColor}
        p={5}
        w="full"
      >
        <VStack spacing={4}>
          <TrazoShimmer height="18px" width="70%" />
          <SimpleGrid columns={2} spacing={3} w="full">
            {[1, 2, 3, 4].map((i) => (
              <VStack key={i} spacing={2}>
                <TrazoShimmer height="24px" width="40px" />
                <TrazoShimmer height="12px" width="80%" />
              </VStack>
            ))}
          </SimpleGrid>
        </VStack>
      </Box>
    </VStack>
  );
};

// Simple card shimmer for various use cases
export const CardShimmer: React.FC<{ height?: string }> = ({ height = '200px' }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <Box
      bg={cardBg}
      borderRadius="xl"
      border="1px solid"
      borderColor={borderColor}
      p={6}
      w="full"
      height={height}
    >
      <VStack spacing={4}>
        <HStack justify="space-between" w="full">
          <TrazoShimmer height="20px" width="60%" />
          <TrazoShimmer height="24px" width="80px" borderRadius="full" />
        </HStack>
        <TrazoShimmer height="100px" width="full" borderRadius="lg" />
        <HStack spacing={3} w="full">
          <TrazoShimmer height="36px" width="120px" borderRadius="md" />
          <TrazoShimmer height="36px" width="100px" borderRadius="md" />
        </HStack>
      </VStack>
    </Box>
  );
};

export default {
  TrazoShimmer,
  HeroShimmer,
  JourneyShimmer,
  TransparencyShimmer,
  SidebarShimmer,
  CardShimmer
};
