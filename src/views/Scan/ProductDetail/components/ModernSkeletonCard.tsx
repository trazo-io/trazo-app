import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  useColorModeValue,
  SimpleGrid,
  Progress
} from '@chakra-ui/react';

interface ModernSkeletonCardProps {
  type: 'hero' | 'journey' | 'transparency' | 'analytics' | 'chart' | 'timeline' | 'card';
  height?: string;
  isAnimated?: boolean;
}

export const ModernSkeletonCard: React.FC<ModernSkeletonCardProps> = ({
  type,
  height,
  isAnimated = true
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const commonProps = {
    startColor: useColorModeValue('gray.100', 'gray.700'),
    endColor: useColorModeValue('gray.300', 'gray.600'),
    borderRadius: 'md',
    isLoaded: false
  };

  const renderSkeletonContent = () => {
    switch (type) {
      case 'hero':
        return (
          <VStack spacing={6}>
            {/* Main hero section */}
            <HStack spacing={6} w="full" align="start">
              <SkeletonCircle size="20" {...commonProps} />
              <VStack align="start" spacing={3} flex={1}>
                <Skeleton height="32px" width="70%" {...commonProps} />
                <Skeleton height="20px" width="50%" {...commonProps} />
                <HStack spacing={3}>
                  <Skeleton height="24px" width="80px" {...commonProps} borderRadius="full" />
                  <Skeleton height="24px" width="80px" {...commonProps} borderRadius="full" />
                </HStack>
              </VStack>
              <VStack align="end" spacing={2}>
                <Skeleton height="36px" width="60px" {...commonProps} />
                <Skeleton height="16px" width="40px" {...commonProps} />
              </VStack>
            </HStack>

            {/* Progress bar */}
            <VStack spacing={2} w="full">
              <Progress size="lg" isIndeterminate colorScheme="green" borderRadius="full" />
              <HStack justify="space-between" w="full">
                <Skeleton height="12px" width="30px" {...commonProps} />
                <Skeleton height="12px" width="30px" {...commonProps} />
              </HStack>
            </VStack>

            {/* Action buttons */}
            <HStack spacing={3}>
              <Skeleton height="40px" width="120px" {...commonProps} borderRadius="md" />
              <Skeleton height="40px" width="120px" {...commonProps} borderRadius="md" />
            </HStack>
          </VStack>
        );

      case 'journey':
        return (
          <VStack spacing={6}>
            {/* Header */}
            <HStack justify="space-between" w="full">
              <VStack align="start" spacing={1}>
                <Skeleton height="24px" width="200px" {...commonProps} />
                <Skeleton height="16px" width="300px" {...commonProps} />
              </VStack>
              <Skeleton height="28px" width="100px" {...commonProps} borderRadius="full" />
            </HStack>

            {/* Journey phases */}
            <VStack spacing={4} w="full">
              {[1, 2, 3, 4].map((i) => (
                <Box
                  key={i}
                  bg={cardBg}
                  p={4}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor={borderColor}
                  w="full">
                  <HStack spacing={4} align="start">
                    <SkeletonCircle size="12" {...commonProps} />
                    <VStack align="start" spacing={3} flex={1}>
                      <HStack justify="space-between" w="full">
                        <Skeleton height="18px" width="150px" {...commonProps} />
                        <HStack spacing={2}>
                          <Skeleton
                            height="20px"
                            width="60px"
                            {...commonProps}
                            borderRadius="full"
                          />
                          <Skeleton height="14px" width="30px" {...commonProps} />
                        </HStack>
                      </HStack>
                      <Skeleton height="16px" width="80%" {...commonProps} />
                      <Skeleton height="24px" width="200px" {...commonProps} borderRadius="md" />
                    </VStack>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </VStack>
        );

      case 'transparency':
        return (
          <VStack spacing={6}>
            {/* Header */}
            <HStack justify="space-between" w="full" align="start">
              <VStack align="start" spacing={3}>
                <HStack spacing={3}>
                  <SkeletonCircle size="12" {...commonProps} />
                  <VStack align="start" spacing={1}>
                    <Skeleton height="16px" width="120px" {...commonProps} />
                    <HStack spacing={2}>
                      <Skeleton height="32px" width="80px" {...commonProps} />
                      <Skeleton height="24px" width="60px" {...commonProps} borderRadius="full" />
                    </HStack>
                    <Skeleton height="16px" width="150px" {...commonProps} />
                  </VStack>
                </HStack>
              </VStack>
              {/* Progress ring skeleton */}
              <SkeletonCircle size="30" {...commonProps} />
            </HStack>

            {/* Trust indicators */}
            <SimpleGrid columns={3} spacing={4} w="full">
              {[1, 2, 3].map((i) => (
                <Box
                  key={i}
                  bg={cardBg}
                  p={4}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor={borderColor}>
                  <VStack spacing={3}>
                    <SkeletonCircle size="8" {...commonProps} />
                    <Skeleton height="14px" width="80%" {...commonProps} />
                    <Skeleton height="20px" width="60px" {...commonProps} borderRadius="full" />
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>

            {/* Data sources */}
            <VStack spacing={3} w="full">
              {[1, 2].map((i) => (
                <Box
                  key={i}
                  bg={cardBg}
                  p={4}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor={borderColor}
                  w="full">
                  <HStack spacing={4} align="start">
                    <SkeletonCircle size="10" {...commonProps} />
                    <VStack align="start" spacing={2} flex={1}>
                      <HStack spacing={2}>
                        <Skeleton height="16px" width="120px" {...commonProps} />
                        <Skeleton height="20px" width="70px" {...commonProps} borderRadius="full" />
                      </HStack>
                      <Skeleton height="14px" width="90%" {...commonProps} />
                      <HStack spacing={4}>
                        <Skeleton height="12px" width="80px" {...commonProps} />
                        <Skeleton height="12px" width="60px" {...commonProps} />
                      </HStack>
                    </VStack>
                    <VStack align="end" spacing={1}>
                      <Skeleton height="20px" width="50px" {...commonProps} />
                      <Skeleton height="12px" width="60px" {...commonProps} />
                    </VStack>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </VStack>
        );

      case 'timeline':
        return (
          <VStack spacing={4}>
            {[1, 2, 3].map((i) => (
              <HStack key={i} spacing={4} w="full" align="start">
                <SkeletonCircle size="10" {...commonProps} />
                <VStack align="start" spacing={2} flex={1}>
                  <Skeleton height="18px" width="200px" {...commonProps} />
                  <Skeleton height="14px" width="150px" {...commonProps} />
                  <Skeleton height="12px" width="100px" {...commonProps} />
                </VStack>
                <Skeleton height="16px" width="60px" {...commonProps} />
              </HStack>
            ))}
          </VStack>
        );

      case 'chart':
        return (
          <VStack spacing={4}>
            <HStack justify="space-between" w="full">
              <Skeleton height="20px" width="150px" {...commonProps} />
              <Skeleton height="16px" width="80px" {...commonProps} />
            </HStack>
            <Box w="full" h="200px" position="relative">
              <Skeleton height="full" width="full" {...commonProps} borderRadius="lg" />
              {/* Chart elements overlay */}
              <VStack spacing={2} position="absolute" bottom={4} left={4}>
                <Skeleton height="12px" width="60px" {...commonProps} />
                <Skeleton height="12px" width="80px" {...commonProps} />
              </VStack>
            </Box>
          </VStack>
        );

      case 'card':
      default:
        return (
          <VStack spacing={4}>
            <HStack justify="space-between" w="full">
              <Skeleton height="20px" width="150px" {...commonProps} />
              <Skeleton height="24px" width="80px" {...commonProps} borderRadius="full" />
            </HStack>
            <SkeletonText mt={4} noOfLines={3} spacing={3} {...commonProps} />
            <HStack spacing={3} w="full">
              <Skeleton height="40px" width="120px" {...commonProps} borderRadius="md" />
              <Skeleton height="40px" width="120px" {...commonProps} borderRadius="md" />
            </HStack>
          </VStack>
        );
    }
  };

  return (
    <Box
      bg={bgColor}
      p={6}
      borderRadius="xl"
      border="1px solid"
      borderColor={borderColor}
      w="full"
      height={height}
      boxShadow="sm">
      {renderSkeletonContent()}
    </Box>
  );
};

export default ModernSkeletonCard;
