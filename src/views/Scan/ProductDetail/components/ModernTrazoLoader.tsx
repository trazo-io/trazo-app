import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  useColorModeValue,
  Icon,
  Fade,
  ScaleFade,
  Container,
  Circle,
  SimpleGrid,
  Progress,
  Badge,
  Divider
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import {
  FaLeaf,
  FaQrcode,
  FaCheckCircle,
  FaShieldAlt,
  FaChartLine,
  FaCertificate,
  FaTractor
} from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';
import { ModernSkeletonCard } from './ModernSkeletonCard';

interface ModernTrazoLoaderProps {
  loadingStage: 'scanning' | 'carbon' | 'transparency' | 'journey' | 'complete';
  carbonPreview?: {
    score?: number;
    productName?: string;
    isVerified?: boolean;
  };
  progressPercent?: number;
}

// Pulse animation for icons
const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

// Shimmer animation for skeletons
const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

export const ModernTrazoLoader: React.FC<ModernTrazoLoaderProps> = ({
  loadingStage,
  carbonPreview,
  progressPercent
}) => {
  const [currentTip, setCurrentTip] = useState(0);
  const [visibleSkeletons, setVisibleSkeletons] = useState<string[]>([]);

  // Trazo design system colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = 'green.500';
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Progressive sustainability messages aligned with Trazo's mission
  const sustainabilityMessages = [
    'Verifying carbon transparency...',
    'Loading sustainability data...',
    'Analyzing agricultural practices...',
    'Building trust through transparency...',
    'Connecting you to the farm story...'
  ];

  // Rotate messages every 2.5 seconds
  useEffect(() => {
    if (loadingStage !== 'complete') {
      const interval = setInterval(() => {
        setCurrentTip((prev) => (prev + 1) % sustainabilityMessages.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [loadingStage, sustainabilityMessages.length]);

  // Progressive skeleton reveal based on loading stage
  useEffect(() => {
    const revealSkeletons = () => {
      const stages = {
        scanning: ['hero'],
        carbon: ['hero', 'score'],
        transparency: ['hero', 'score', 'trust'],
        journey: ['hero', 'score', 'trust', 'timeline'],
        complete: ['hero', 'score', 'trust', 'timeline', 'details']
      };
      setVisibleSkeletons(stages[loadingStage] || []);
    };

    const timer = setTimeout(revealSkeletons, 300);
    return () => clearTimeout(timer);
  }, [loadingStage]);

  const getStageInfo = () => {
    const stages = {
      scanning: {
        icon: FaQrcode,
        title: 'Scanning Product',
        subtitle: 'Verifying QR authenticity...',
        color: 'blue.500',
        progress: 20
      },
      carbon: {
        icon: FaLeaf,
        title: 'Loading Carbon Data',
        subtitle: 'Calculating sustainability metrics...',
        color: 'green.500',
        progress: 45
      },
      transparency: {
        icon: FaShieldAlt,
        title: '',
        subtitle: '',
        color: 'purple.500',
        progress: 70
      },
      journey: {
        icon: FaTractor,
        title: 'Loading Farm Journey',
        subtitle: 'Connecting to production story...',
        color: 'orange.500',
        progress: 90
      },
      complete: {
        icon: FaCheckCircle,
        title: 'Ready!',
        subtitle: 'Complete transparency loaded',
        color: 'green.500',
        progress: 100
      }
    };
    return stages[loadingStage];
  };

  const stageInfo = getStageInfo();

  // Carbon Score Preview (when available)
  const CarbonScorePreview = () => {
    if (!carbonPreview?.score || loadingStage !== 'carbon') return null;

    return (
      <ScaleFade in={true} initialScale={0.95}>
        <Box
          bg={bgColor}
          p={6}
          borderRadius="xl"
          border="2px solid"
          borderColor="green.200"
          boxShadow="lg"
          maxW="sm"
          mx="auto"
        >
          <VStack spacing={4}>
            <Circle size="60px" bg="green.100">
              <Text fontSize="xl" fontWeight="bold" color="green.600">
                {carbonPreview.score}
              </Text>
            </Circle>

            <VStack spacing={2} textAlign="center">
              <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                {carbonPreview.productName || 'Product'}
              </Text>
              <Badge colorScheme="green" fontSize="sm" px={3} py={1} borderRadius="full">
                Carbon Score: {carbonPreview.score}/100
              </Badge>
              {carbonPreview.isVerified && (
                <HStack spacing={2}>
                  <Icon as={MdVerified} color="blue.500" boxSize={4} />
                  <Text fontSize="sm" color="blue.600">
                    USDA Verified
                  </Text>
                </HStack>
              )}
            </VStack>

            <Progress
              value={75}
              colorScheme="green"
              size="sm"
              borderRadius="full"
              w="full"
              hasStripe
              isAnimated
            />
            <Text fontSize="xs" color={mutedColor}>
              Loading complete transparency data...
            </Text>
          </VStack>
        </Box>
      </ScaleFade>
    );
  };

  // Content Structure Skeletons
  const ContentSkeletons = () => (
    <VStack spacing={6} w="full" maxW="4xl" mx="auto">
      {/* Hero Section Skeleton */}
      {visibleSkeletons.includes('hero') && (
        <Fade in={true}>
          <ModernSkeletonCard type="hero" />
        </Fade>
      )}

      {/* Carbon Score Skeleton - Only show after carbon stage */}
      {visibleSkeletons.includes('score') && (
        <Fade in={true}>
          <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6} w="full">
            {/* Main content area skeleton */}
            <Box gridColumn={{ base: '1', lg: '1 / 3' }}>
              <VStack spacing={6}>
                <ModernSkeletonCard type="journey" />
                <ModernSkeletonCard type="chart" />
              </VStack>
            </Box>

            {/* Sidebar skeleton */}
            <Box>
              <VStack spacing={4}>
                <ModernSkeletonCard type="card" />
                <ModernSkeletonCard type="timeline" />
              </VStack>
            </Box>
          </SimpleGrid>
        </Fade>
      )}

      {/* Trust & Transparency Skeleton */}
      {visibleSkeletons.includes('trust') && (
        <Fade in={true}>
          <ModernSkeletonCard type="transparency" />
        </Fade>
      )}

      {/* Journey Details Skeleton */}
      {visibleSkeletons.includes('timeline') && (
        <Fade in={true}>
          <VStack spacing={4} w="full">
            <ModernSkeletonCard type="timeline" />
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
              <ModernSkeletonCard type="card" />
              <ModernSkeletonCard type="card" />
            </SimpleGrid>
          </VStack>
        </Fade>
      )}
    </VStack>
  );

  return (
    <Container maxW="4xl" py={{ base: 6, md: 8 }} px={{ base: 4, md: 6 }}>
      <VStack spacing={8} textAlign="center">
        {/* Main Loading State */}
        <VStack spacing={6}>
          {/* Icon with Animation */}
          <Circle size="80px" bg={`${stageInfo.color.split('.')[0]}.100`} position="relative">
            <Icon
              as={stageInfo.icon}
              boxSize={8}
              color={stageInfo.color}
              animation={loadingStage !== 'complete' ? `${pulse} 2s infinite` : undefined}
            />
          </Circle>

          {/* Stage Information - Only show when title exists */}
          {stageInfo.title && (
            <VStack spacing={2}>
              <Text fontSize="xl" fontWeight="bold" color={textColor}>
                {stageInfo.title}
              </Text>
              {stageInfo.subtitle && (
                <Text fontSize="md" color={mutedColor}>
                  {stageInfo.subtitle}
                </Text>
              )}
            </VStack>
          )}

          {/* Progress Bar */}
          <Box w="full" maxW="md">
            <Progress
              value={progressPercent || stageInfo.progress}
              colorScheme={stageInfo.color.split('.')[0]}
              size="lg"
              borderRadius="full"
              bg={useColorModeValue('gray.100', 'gray.700')}
              hasStripe={loadingStage !== 'complete'}
              isAnimated={loadingStage !== 'complete'}
            />
            <HStack justify="space-between" mt={2} fontSize="sm" color={mutedColor}>
              <Text>0%</Text>
              <Text fontWeight="medium">{progressPercent || stageInfo.progress}%</Text>
              <Text>100%</Text>
            </HStack>
          </Box>
        </VStack>

        {/* Carbon Score Preview */}
        <CarbonScorePreview />

        {/* Progressive Content Skeletons */}
        {loadingStage !== 'scanning' && <ContentSkeletons />}

        {/* Sustainability Message */}
        {loadingStage !== 'complete' && (
          <Box
            bg="green.50"
            border="1px solid"
            borderColor="green.200"
            borderLeft="4px solid"
            borderLeftColor="green.500"
            p={4}
            borderRadius="lg"
            maxW="lg"
          >
            <Fade key={currentTip} in={true}>
              <HStack spacing={3}>
                <Icon as={FaLeaf} color="green.600" boxSize={5} />
                <Text fontSize="sm" color="green.700" fontWeight="medium">
                  {sustainabilityMessages[currentTip]}
                </Text>
              </HStack>
            </Fade>
          </Box>
        )}

        {/* Trazo Branding */}
        <VStack spacing={2}>
          <HStack spacing={4} fontSize="xs" color={mutedColor} opacity={0.8}>
            <HStack spacing={1}>
              <Icon as={FaShieldAlt} />
              <Text>Verified Data</Text>
            </HStack>
            <HStack spacing={1}>
              <Icon as={FaCertificate} />
              <Text>USDA Compliant</Text>
            </HStack>
            <HStack spacing={1}>
              <Icon as={FaLeaf} />
              <Text>Sustainable</Text>
            </HStack>
          </HStack>
          <Divider maxW="xs" />
          <Text fontSize="xs" color={mutedColor} opacity={0.6}>
            Powered by Trazo Agricultural Transparency
          </Text>
        </VStack>
      </VStack>
    </Container>
  );
};

export default ModernTrazoLoader;
