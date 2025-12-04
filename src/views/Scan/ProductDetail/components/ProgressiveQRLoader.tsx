import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Progress,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  useColorModeValue,
  Badge,
  Icon,
  Fade,
  ScaleFade,
  Container,
  Heading,
  Circle,
  SimpleGrid
} from '@chakra-ui/react';
import {
  FaLeaf,
  FaQrcode,
  FaMobile,
  FaCheckCircle,
  FaChartLine,
  FaTree,
  FaSeedling
} from 'react-icons/fa';
import { MdVerified, MdTimeline } from 'react-icons/md';

interface ProgressiveQRLoaderProps {
  loadingStage: 'scanning' | 'transparency' | 'details' | 'complete';
  transparencyScore?: number;
  productName?: string;
  isVerified?: boolean;
  onStageComplete?: (stage: string) => void;
}

export const ProgressiveQRLoader: React.FC<ProgressiveQRLoaderProps> = ({
  loadingStage,
  transparencyScore,
  productName,
  isVerified = false,
  onStageComplete
}) => {
  const [currentTip, setCurrentTip] = useState(0);
  const [showTransparencyScore, setShowTransparencyScore] = useState(false);
  const hasCalledStageComplete = useRef(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const accentColor = useColorModeValue('green.500', 'green.400');

  // Transparency-focused tips that rotate during loading
  const ecoTips = [
    '💡 Every scan reveals farm transparency and sustainable practices',
    '🌱 Supporting honest farmers who share their complete story',
    '🌍 Complete transparency builds trust in sustainable farming',
    '♻️ Your support rewards farmers for transparency',
    '🌿 Discover the complete story behind your food'
  ];

  // Rotate tips every 2 seconds during loading
  useEffect(() => {
    if (loadingStage !== 'complete') {
      const interval = setInterval(() => {
        setCurrentTip((prev) => (prev + 1) % ecoTips.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [loadingStage, ecoTips.length]);

  // Reset the callback flag when starting a new scan
  useEffect(() => {
    if (loadingStage === 'scanning') {
      hasCalledStageComplete.current = false;
      setShowTransparencyScore(false);
    }
  }, [loadingStage]);

  // Show transparency score with animation when available
  useEffect(() => {
    if (
      loadingStage === 'transparency' &&
      transparencyScore !== undefined &&
      !hasCalledStageComplete.current
    ) {
      setTimeout(() => setShowTransparencyScore(true), 500);
      hasCalledStageComplete.current = true;
      onStageComplete?.('transparency');
    }
  }, [loadingStage, transparencyScore, onStageComplete]);

  const getProgressValue = () => {
    switch (loadingStage) {
      case 'scanning':
        return 25;
      case 'transparency':
        return 60;
      case 'details':
        return 85;
      case 'complete':
        return 100;
      default:
        return 0;
    }
  };

  const getStageMessage = () => {
    switch (loadingStage) {
      case 'scanning':
        return 'Scanning product...';
      case 'transparency':
        return 'Loading transparency data...';
      case 'details':
        return 'Loading complete story...';
      case 'complete':
        return 'Ready!';
      default:
        return 'Loading...';
    }
  };

  const getTransparencyScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'orange';
  };

  return (
    <Container maxW="lg" py={8}>
      <VStack spacing={8} align="center">
        {/* Header with QR Icon */}
        <VStack spacing={4} textAlign="center">
          <Circle size="80px" bg="green.100" color="green.600">
            <Icon as={FaQrcode} boxSize={10} />
          </Circle>

          <VStack spacing={2}>
            <Heading size="lg" color={textColor}>
              {loadingStage === 'complete' ? 'Scan Complete!' : 'Scanning Product'}
            </Heading>
            <Text color="gray.600" fontSize="md">
              {getStageMessage()}
            </Text>
          </VStack>
        </VStack>

        {/* Progress Bar */}
        <Box w="full" maxW="md">
          <Progress
            value={getProgressValue()}
            colorScheme="green"
            size="lg"
            borderRadius="full"
            bg="gray.100"
            hasStripe
            isAnimated={loadingStage !== 'complete'}
          />
          <HStack justify="space-between" mt={2} fontSize="sm" color="gray.500">
            <Text>0%</Text>
            <Text fontWeight="medium">{getProgressValue()}%</Text>
            <Text>100%</Text>
          </HStack>
        </Box>

        {/* Transparency Score Preview (Phase 2 Enhancement) */}
        {showTransparencyScore && transparencyScore !== undefined && (
          <ScaleFade initialScale={0.8} in={showTransparencyScore}>
            <Box
              bg={bgColor}
              p={6}
              borderRadius="xl"
              boxShadow="lg"
              border="2px solid"
              borderColor={`${getTransparencyScoreColor(transparencyScore)}.200`}
              textAlign="center"
              minW="280px"
            >
              <VStack spacing={3}>
                <Badge
                  colorScheme={getTransparencyScoreColor(transparencyScore)}
                  fontSize="lg"
                  px={4}
                  py={2}
                  borderRadius="full"
                >
                  Transparency: {Math.round(transparencyScore)}%
                </Badge>

                {productName && (
                  <Text fontWeight="bold" fontSize="lg" color={textColor}>
                    {productName}
                  </Text>
                )}

                {isVerified && (
                  <HStack spacing={2}>
                    <Icon as={MdVerified} color="blue.500" />
                    <Text fontSize="sm" color="blue.600" fontWeight="medium">
                      Transparency Verified
                    </Text>
                  </HStack>
                )}
              </VStack>
            </Box>
          </ScaleFade>
        )}

        {/* Loading Skeletons for Different Stages */}
        {loadingStage === 'details' && (
          <VStack spacing={4} w="full" maxW="md">
            <Box bg={bgColor} p={4} borderRadius="lg" w="full">
              <HStack spacing={3} mb={3}>
                <SkeletonCircle size="12" />
                <VStack align="start" flex={1} spacing={2}>
                  <Skeleton height="20px" width="60%" />
                  <Skeleton height="16px" width="40%" />
                </VStack>
              </HStack>
              <SkeletonText mt={3} noOfLines={2} spacing={2} />
            </Box>

            <SimpleGrid columns={2} spacing={3} w="full">
              <Box bg={bgColor} p={3} borderRadius="lg">
                <SkeletonCircle size="8" mb={2} />
                <Skeleton height="16px" width="80%" />
              </Box>
              <Box bg={bgColor} p={3} borderRadius="lg">
                <SkeletonCircle size="8" mb={2} />
                <Skeleton height="16px" width="80%" />
              </Box>
            </SimpleGrid>
          </VStack>
        )}

        {/* Rotating Eco Tips */}
        {loadingStage !== 'complete' && (
          <Box
            bg="green.50"
            p={4}
            borderRadius="lg"
            border="1px solid"
            borderColor="green.200"
            maxW="md"
            textAlign="center"
          >
            <Fade key={currentTip} in={true}>
              <Text fontSize="sm" color="green.700" fontWeight="medium">
                {ecoTips[currentTip]}
              </Text>
            </Fade>
          </Box>
        )}

        {/* Mobile Optimization Badge */}
        <HStack spacing={4} fontSize="xs" color="gray.500">
          <HStack spacing={1}>
            <Icon as={FaMobile} />
            <Text>Mobile Optimized</Text>
          </HStack>
          <HStack spacing={1}>
            <Icon as={FaLeaf} />
            <Text>Eco Tracking</Text>
          </HStack>
          <HStack spacing={1}>
            <Icon as={FaCheckCircle} />
            <Text>Verified Data</Text>
          </HStack>
        </HStack>
      </VStack>
    </Container>
  );
};
