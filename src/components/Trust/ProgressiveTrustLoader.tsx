import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Circle,
  Skeleton,
  useColorModeValue,
  useBreakpointValue
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FaCertificate, FaLock, FaUsers, FaLeaf, FaChartLine } from 'react-icons/fa';
import { MdVerified, MdScience } from 'react-icons/md';

// Animation for elements appearing
const fadeInScale = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

interface TrustMetric {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  verified: boolean;
  priority: number; // 1 = highest priority (loads first)
}

interface ProgressiveTrustData {
  carbonScore?: number;
  isUSDAVerified?: boolean;
  isBlockchainVerified?: boolean;
  confidenceScore?: number;
  reviewsCount?: number;
  averageRating?: number;
  scansCount?: number;
}

interface ProgressiveTrustLoaderProps {
  data: ProgressiveTrustData;
  isLoading?: boolean;
  loadingPriority?: 'carbon-first' | 'trust-first' | 'balanced';
  showSkeleton?: boolean;
  compact?: boolean;
}

export const ProgressiveTrustLoader: React.FC<ProgressiveTrustLoaderProps> = ({
  data,
  isLoading = false,
  loadingPriority = 'carbon-first',
  showSkeleton = true,
  compact = false
}) => {
  const [loadedMetrics, setLoadedMetrics] = useState<Set<number>>(new Set());
  const [loadingStage, setLoadingStage] = useState(0);

  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  const isMobile = useBreakpointValue({ base: true, md: false });
  const iconSize = useBreakpointValue({ base: 3, md: 4 });
  const circleSize = useBreakpointValue({ base: 8, md: 10 });

  // Define trust metrics with loading priorities
  const getTrustMetrics = useCallback((): TrustMetric[] => {
    const metrics: TrustMetric[] = [
      {
        icon: FaLeaf,
        label: 'Carbon Score',
        value: data.carbonScore && data.carbonScore > 0 ? data.carbonScore : '--',
        color: 'green',
        verified: Boolean(data.carbonScore && data.carbonScore > 0),
        priority: loadingPriority === 'carbon-first' ? 1 : 3
      },
      {
        icon: FaCertificate,
        label: 'USDA Verified',
        value: data.isUSDAVerified ? 'Verified' : 'Pending',
        color: 'green',
        verified: Boolean(data.isUSDAVerified),
        priority: loadingPriority === 'trust-first' ? 1 : 2
      },
      {
        icon: FaLock,
        label: 'Blockchain',
        value: data.isBlockchainVerified ? 'Secured' : 'Pending',
        color: 'blue',
        verified: Boolean(data.isBlockchainVerified),
        priority: loadingPriority === 'trust-first' ? 2 : 4
      },
      {
        icon: MdScience,
        label: 'Accuracy',
        value:
          data.confidenceScore && data.confidenceScore > 0
            ? `${Math.round(data.confidenceScore)}%`
            : '--',
        color: 'purple',
        verified: Boolean(
          data.confidenceScore && data.confidenceScore > 0 && data.confidenceScore > 70
        ),
        priority: 3
      },
      {
        icon: FaUsers,
        label: 'Community',
        value:
          data.reviewsCount && data.reviewsCount > 0 ? `${data.averageRating?.toFixed(1)}★` : '--',
        color: 'orange',
        verified: Boolean(
          data.reviewsCount && data.reviewsCount > 0 && data.averageRating && data.averageRating > 0
        ),
        priority: 5
      }
    ];

    return metrics.sort((a, b) => a.priority - b.priority);
  }, [data, loadingPriority]);

  const trustMetrics = getTrustMetrics();

  // Progressive loading simulation
  useEffect(() => {
    if (!isLoading && Object.keys(data).length > 0) {
      // Simulate progressive loading based on priority
      const loadMetrics = async () => {
        for (let i = 0; i < trustMetrics.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, i === 0 ? 100 : 300));
          setLoadedMetrics((prev) => new Set([...prev, i]));
          setLoadingStage(i + 1);
        }
      };

      loadMetrics();
    }
  }, [isLoading, data, trustMetrics.length]);

  // Reset when loading starts
  useEffect(() => {
    if (isLoading) {
      setLoadedMetrics(new Set());
      setLoadingStage(0);
    }
  }, [isLoading]);

  // Calculate overall trust indication
  const getTrustIndication = () => {
    const verifiedCount = trustMetrics.filter((m) => m.verified).length;
    const percentage = (verifiedCount / trustMetrics.length) * 100;

    if (percentage >= 80) return { level: 'High Trust', color: 'green' };
    if (percentage >= 60) return { level: 'Good Trust', color: 'blue' };
    if (percentage >= 40) return { level: 'Moderate Trust', color: 'yellow' };
    return { level: 'Building Trust', color: 'gray' };
  };

  const trustIndication = getTrustIndication();

  if (compact) {
    return (
      <HStack spacing={2} justify="center" flexWrap="wrap">
        {trustMetrics.slice(0, 3).map((metric, index) => {
          const isLoaded = loadedMetrics.has(index);

          if (isLoading && showSkeleton && !isLoaded) {
            return (
              <Skeleton
                key={index}
                height="32px"
                width="80px"
                borderRadius="full"
                startColor="gray.200"
                endColor="gray.300"
              />
            );
          }

          if (!isLoaded) return null;

          return (
            <Badge
              key={index}
              colorScheme={metric.verified ? metric.color : 'gray'}
              variant={metric.verified ? 'solid' : 'outline'}
              px={3}
              py={1}
              borderRadius="full"
              fontSize="xs"
              display="flex"
              alignItems="center"
              gap={1}
              animation={`${fadeInScale} 0.5s ease-out`}
            >
              <Icon as={metric.icon} boxSize={3} />
              <Text>{typeof metric.value === 'string' ? metric.value : metric.label}</Text>
            </Badge>
          );
        })}
      </HStack>
    );
  }

  return (
    <Box
      bg={bgColor}
      p={isMobile ? 4 : 6}
      borderRadius="xl"
      boxShadow="md"
      border="1px solid"
      borderColor={useColorModeValue(
        `${trustIndication.color}.200`,
        `${trustIndication.color}.600`
      )}
    >
      <VStack spacing={4} align="stretch">
        {/* Trust level header */}
        <HStack justify="space-between" align="center">
          <VStack align="start" spacing={1}>
            <Text fontSize="lg" fontWeight="bold" color={textColor}>
              Product Transparency
            </Text>
            <Text fontSize="sm" color={mutedColor}>
              Verified agricultural data
            </Text>
          </VStack>

          {loadingStage > 0 && (
            <Badge
              colorScheme={trustIndication.color}
              variant="solid"
              px={3}
              py={1}
              borderRadius="full"
              fontSize="sm"
              animation={`${fadeInScale} 0.6s ease-out`}
            >
              {trustIndication.level}
            </Badge>
          )}
        </HStack>

        {/* Trust metrics grid */}
        <HStack spacing={isMobile ? 2 : 4} justify="space-between" flexWrap="wrap">
          {trustMetrics.map((metric, index) => {
            const isLoaded = loadedMetrics.has(index);

            if (isLoading && showSkeleton && !isLoaded) {
              return (
                <VStack key={index} spacing={2} minW="60px">
                  <Skeleton
                    height={`${circleSize * 4}px`}
                    width={`${circleSize * 4}px`}
                    borderRadius="full"
                    startColor="gray.200"
                    endColor="gray.300"
                  />
                  <Skeleton height="16px" width="50px" borderRadius="md" />
                  <Skeleton height="20px" width="60px" borderRadius="full" />
                </VStack>
              );
            }

            if (!isLoaded) {
              return <Box key={index} minW="60px" />; // Placeholder to maintain layout
            }

            return (
              <VStack
                key={index}
                spacing={2}
                minW="60px"
                opacity={isLoaded ? 1 : 0}
                animation={isLoaded ? `${fadeInScale} 0.5s ease-out` : undefined}
              >
                <Circle
                  size={circleSize}
                  bg={metric.verified ? `${metric.color}.100` : 'gray.100'}
                  color={metric.verified ? `${metric.color}.600` : 'gray.500'}
                >
                  <Icon as={metric.icon} boxSize={iconSize} />
                </Circle>

                <VStack spacing={1}>
                  <Text
                    fontSize="xs"
                    color={mutedColor}
                    textAlign="center"
                    fontWeight="medium"
                    lineHeight="1.2"
                  >
                    {metric.label}
                  </Text>

                  <Badge
                    colorScheme={metric.verified ? metric.color : 'gray'}
                    variant={metric.verified ? 'solid' : 'outline'}
                    fontSize="xs"
                    px={2}
                    py={0.5}
                    borderRadius="full"
                    textAlign="center"
                    minW="50px"
                  >
                    {metric.value}
                  </Badge>
                </VStack>
              </VStack>
            );
          })}
        </HStack>

        {/* Quick summary */}
        {loadingStage >= trustMetrics.length && (
          <Box
            p={3}
            bg={useColorModeValue('gray.50', 'gray.700')}
            borderRadius="lg"
            animation={`${fadeInScale} 0.6s ease-out`}
          >
            <HStack justify="space-between" fontSize="xs">
              <Text color={mutedColor}>
                {trustMetrics.filter((m) => m.verified).length} of {trustMetrics.length}{' '}
                verifications complete
              </Text>
              <Text color={`${trustIndication.color}.600`} fontWeight="medium">
                {(
                  (trustMetrics.filter((m) => m.verified).length / trustMetrics.length) *
                  100
                ).toFixed(0)}
                % verified
              </Text>
            </HStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default ProgressiveTrustLoader;
