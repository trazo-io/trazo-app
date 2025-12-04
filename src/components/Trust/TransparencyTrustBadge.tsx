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
  Flex,
  useColorModeValue,
  useBreakpointValue,
  Skeleton,
  Button,
  SimpleGrid
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import {
  FaShieldAlt,
  FaCertificate,
  FaLeaf,
  FaEye,
  FaLock,
  FaClipboardList,
  FaUsers,
  FaCamera,
  FaAward,
  FaCheck,
  FaStar,
  FaInfoCircle,
  FaCalendarAlt,
  FaChartLine
} from 'react-icons/fa';
import {
  MdVerified,
  MdScience,
  MdSecurity,
  MdTrendingUp,
  MdPublic,
  MdTimer,
  MdEco
} from 'react-icons/md';
import { BsShieldCheck, BsStarFill } from 'react-icons/bs';

// Animation for trust elements appearing
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 10px rgba(72, 187, 120, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(72, 187, 120, 0.6);
  }
`;

export interface TransparencyTrustData {
  // PRIMARY: Transparency metrics
  transparencyScore: number;
  eventsDocumented: number;
  photoCount: number;
  verificationCount: number;
  isTrazoVerified: boolean;

  // SECONDARY: Traditional trust indicators
  isUSDAVerified: boolean;
  isBlockchainVerified: boolean;
  confidenceScore: number;

  // SOCIAL: Community engagement
  scansCount: number;
  reviewsCount: number;
  averageRating: number;

  // META: Farm credibility
  farmHistory: number; // Years
  certifications: string[];
  verificationDate: string;
  industryPercentile: number;
}

export interface TransparencyTrustBadgeProps {
  trustData: TransparencyTrustData;
  isLoading?: boolean;
  variant?: 'hero' | 'compact' | 'mini';
  showAnimation?: boolean;
}

export const TransparencyTrustBadge: React.FC<TransparencyTrustBadgeProps> = ({
  trustData,
  isLoading = false,
  variant = 'hero',
  showAnimation = true
}) => {
  const [visibleElements, setVisibleElements] = useState(0);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('green.200', 'green.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  const isMobile = useBreakpointValue({ base: true, md: false });
  const spacing = useBreakpointValue({ base: 2, md: 3 });
  const iconSize = useBreakpointValue({ base: 4, md: 5 });

  // Progressive loading animation
  useEffect(() => {
    if (!isLoading && showAnimation) {
      const timer = setInterval(() => {
        setVisibleElements((prev) => {
          if (prev < 4) return prev + 1;
          clearInterval(timer);
          return prev;
        });
      }, 200);
      return () => clearInterval(timer);
    } else if (!showAnimation) {
      setVisibleElements(4);
    }
  }, [isLoading, showAnimation]);

  // Calculate transparency trust score (transparency-first algorithm)
  const calculateTransparencyTrust = () => {
    let score = 0;

    // PRIMARY: Transparency documentation (60 points)
    score += (trustData.transparencyScore / 100) * 35; // Core transparency
    if (trustData.eventsDocumented >= 10) score += 10; // Documentation depth
    if (trustData.photoCount >= 5) score += 8; // Visual evidence
    if (trustData.verificationCount >= 3) score += 7; // Verification count

    // SECONDARY: Technical verification (25 points)
    if (trustData.isUSDAVerified) score += 12;
    if (trustData.isBlockchainVerified) score += 13;

    // SOCIAL: Community validation (15 points)
    if (trustData.scansCount > 50) score += 5;
    if (trustData.reviewsCount > 5) score += 5;
    if (trustData.averageRating >= 4.5) score += 5;

    return Math.min(Math.round(score), 100);
  };

  const trustScore = calculateTransparencyTrust();

  // Transparency-first trust levels
  const getTransparencyLevel = () => {
    if (trustScore >= 95)
      return {
        level: 'Transparencia Certificada',
        color: 'green',
        icon: MdVerified,
        badge: 'CERTIFICADO'
      };
    if (trustScore >= 85)
      return {
        level: 'Transparencia Excelente',
        color: 'green',
        icon: BsShieldCheck,
        badge: 'VERIFICADO'
      };
    if (trustScore >= 70)
      return {
        level: 'Buena Transparencia',
        color: 'blue',
        icon: FaShieldAlt,
        badge: 'CONFIABLE'
      };
    if (trustScore >= 50)
      return {
        level: 'Transparencia Básica',
        color: 'yellow',
        icon: FaClipboardList,
        badge: 'BÁSICO'
      };
    return {
      level: 'Construyendo Transparencia',
      color: 'gray',
      icon: FaInfoCircle,
      badge: 'EN PROGRESO'
    };
  };

  const trustLevel = getTransparencyLevel();

  if (isLoading) {
    return (
      <Box p={spacing} bg={bgColor} borderRadius="xl" boxShadow="lg">
        <VStack spacing={spacing}>
          <Skeleton height="60px" width="100%" borderRadius="lg" />
          <HStack spacing={spacing} width="100%">
            <Skeleton height="40px" flex={1} borderRadius="md" />
            <Skeleton height="40px" flex={1} borderRadius="md" />
            <Skeleton height="40px" flex={1} borderRadius="md" />
          </HStack>
        </VStack>
      </Box>
    );
  }

  // Mini variant for inline use
  if (variant === 'mini') {
    return (
      <HStack spacing={2} align="center">
        <Circle size={8} bg={`${trustLevel.color}.100`} color={`${trustLevel.color}.600`}>
          <Icon as={trustLevel.icon} boxSize={4} />
        </Circle>
        <VStack spacing={0} align="start">
          <Text fontSize="sm" fontWeight="bold" color={textColor}>
            {trustScore}% Transparente
          </Text>
          <Text fontSize="xs" color={mutedColor}>
            {trustData.eventsDocumented} eventos documentados
          </Text>
        </VStack>
        <Badge
          colorScheme={trustLevel.color}
          variant="solid"
          px={2}
          py={1}
          borderRadius="full"
          fontSize="xs"
        >
          {trustLevel.badge}
        </Badge>
      </HStack>
    );
  }

  // Compact variant for mobile or sidebar
  if (variant === 'compact') {
    return (
      <Box
        bg={bgColor}
        p={4}
        borderRadius="xl"
        boxShadow="md"
        border="2px solid"
        borderColor={borderColor}
      >
        <VStack spacing={3}>
          {/* Header with transparency score */}
          <HStack justify="space-between" w="full">
            <HStack spacing={2}>
              <Circle size={10} bg={`${trustLevel.color}.100`} color={`${trustLevel.color}.600`}>
                <Icon as={trustLevel.icon} boxSize={5} />
              </Circle>
              <VStack align="start" spacing={0}>
                <Text fontSize="md" fontWeight="bold" color={textColor}>
                  {trustScore}% Transparente
                </Text>
                <Text fontSize="xs" color={mutedColor}>
                  {trustLevel.level}
                </Text>
              </VStack>
            </HStack>
            <Badge
              colorScheme={trustLevel.color}
              variant="solid"
              px={3}
              py={2}
              borderRadius="full"
              fontSize="sm"
            >
              {trustLevel.badge}
            </Badge>
          </HStack>

          {/* Key metrics */}
          <SimpleGrid columns={2} spacing={3} w="full">
            <VStack spacing={1}>
              <Icon as={FaClipboardList} color="green.500" boxSize={4} />
              <Text fontSize="sm" fontWeight="medium" color={textColor}>
                {trustData.eventsDocumented}
              </Text>
              <Text fontSize="xs" color={mutedColor} textAlign="center">
                Eventos
              </Text>
            </VStack>
            <VStack spacing={1}>
              <Icon as={FaCamera} color="blue.500" boxSize={4} />
              <Text fontSize="sm" fontWeight="medium" color={textColor}>
                {trustData.photoCount}
              </Text>
              <Text fontSize="xs" color={mutedColor} textAlign="center">
                Fotos
              </Text>
            </VStack>
          </SimpleGrid>

          {/* Trust indicators */}
          <HStack spacing={2} justify="center" flexWrap="wrap">
            {trustData.isUSDAVerified && (
              <Badge colorScheme="green" variant="outline" fontSize="xs">
                <HStack spacing={1}>
                  <Icon as={FaCertificate} boxSize={3} />
                  <Text>USDA</Text>
                </HStack>
              </Badge>
            )}
            {trustData.isBlockchainVerified && (
              <Badge colorScheme="blue" variant="outline" fontSize="xs">
                <HStack spacing={1}>
                  <Icon as={FaLock} boxSize={3} />
                  <Text>Blockchain</Text>
                </HStack>
              </Badge>
            )}
            {trustData.isTrazoVerified && (
              <Badge colorScheme="green" variant="solid" fontSize="xs">
                <HStack spacing={1}>
                  <Icon as={MdVerified} boxSize={3} />
                  <Text>Trazo</Text>
                </HStack>
              </Badge>
            )}
          </HStack>
        </VStack>
      </Box>
    );
  }

  // Hero variant for main product page
  return (
    <Box
      bg={bgColor}
      p={6}
      borderRadius="2xl"
      boxShadow="xl"
      border="2px solid"
      borderColor={borderColor}
      position="relative"
      overflow="hidden"
    >
      {/* Trust level glow effect for high transparency */}
      {trustScore >= 90 && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          borderRadius="2xl"
          animation={`${pulseGlow} 3s ease-in-out infinite`}
          pointerEvents="none"
        />
      )}

      <VStack spacing={spacing + 1} align="stretch">
        {/* Header with transparency score */}
        <Box
          opacity={visibleElements >= 1 ? 1 : 0}
          animation={visibleElements >= 1 ? `${fadeInUp} 0.6s ease-out` : undefined}
        >
          <HStack justify="space-between" align="center" mb={4}>
            <HStack spacing={3}>
              <Circle size={14} bg={`${trustLevel.color}.100`} color={`${trustLevel.color}.600`}>
                <Icon as={trustLevel.icon} boxSize={7} />
              </Circle>
              <VStack align="start" spacing={0}>
                <Text fontSize="xl" fontWeight="bold" color={textColor}>
                  {trustLevel.level}
                </Text>
                <Text fontSize="sm" color={mutedColor}>
                  Puntuación: {trustScore}/100
                </Text>
              </VStack>
            </HStack>

            <Badge
              colorScheme={trustLevel.color}
              variant="solid"
              px={4}
              py={2}
              borderRadius="full"
              fontSize="md"
              fontWeight="bold"
            >
              {trustLevel.badge}
            </Badge>
          </HStack>

          <Progress
            value={trustScore}
            colorScheme={trustLevel.color}
            size="lg"
            borderRadius="full"
            bg="gray.100"
          />
        </Box>

        {/* Transparency indicators grid */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={spacing} mt={2}>
          {/* Documentation Events */}
          <Box
            textAlign="center"
            opacity={visibleElements >= 2 ? 1 : 0}
            animation={visibleElements >= 2 ? `${fadeInUp} 0.6s ease-out 0.2s both` : undefined}
          >
            <VStack spacing={2}>
              <Circle size={10} bg="green.100" color="green.600">
                <Icon as={FaClipboardList} boxSize={iconSize} />
              </Circle>
              <VStack spacing={0}>
                <Text fontSize="lg" fontWeight="bold" color={textColor}>
                  {trustData.eventsDocumented}
                </Text>
                <Text fontSize="xs" color={mutedColor} textAlign="center">
                  Eventos Documentados
                </Text>
              </VStack>
            </VStack>
          </Box>

          {/* Photo Evidence */}
          <Box
            textAlign="center"
            opacity={visibleElements >= 2 ? 1 : 0}
            animation={visibleElements >= 2 ? `${fadeInUp} 0.6s ease-out 0.3s both` : undefined}
          >
            <VStack spacing={2}>
              <Circle size={10} bg="blue.100" color="blue.600">
                <Icon as={FaCamera} boxSize={iconSize} />
              </Circle>
              <VStack spacing={0}>
                <Text fontSize="lg" fontWeight="bold" color={textColor}>
                  {trustData.photoCount}
                </Text>
                <Text fontSize="xs" color={mutedColor} textAlign="center">
                  Fotos de Evidencia
                </Text>
              </VStack>
            </VStack>
          </Box>

          {/* Verifications */}
          <Box
            textAlign="center"
            opacity={visibleElements >= 3 ? 1 : 0}
            animation={visibleElements >= 3 ? `${fadeInUp} 0.6s ease-out 0.4s both` : undefined}
          >
            <VStack spacing={2}>
              <Circle size={10} bg="purple.100" color="purple.600">
                <Icon as={MdVerified} boxSize={iconSize} />
              </Circle>
              <VStack spacing={0}>
                <Text fontSize="lg" fontWeight="bold" color={textColor}>
                  {trustData.verificationCount}
                </Text>
                <Text fontSize="xs" color={mutedColor} textAlign="center">
                  Verificaciones
                </Text>
              </VStack>
            </VStack>
          </Box>

          {/* Consumer Trust */}
          <Box
            textAlign="center"
            opacity={visibleElements >= 4 ? 1 : 0}
            animation={visibleElements >= 4 ? `${fadeInUp} 0.6s ease-out 0.5s both` : undefined}
          >
            <VStack spacing={2}>
              <Circle size={10} bg="orange.100" color="orange.600">
                <Icon as={FaUsers} boxSize={iconSize} />
              </Circle>
              <VStack spacing={0}>
                <Text fontSize="lg" fontWeight="bold" color={textColor}>
                  {trustData.scansCount}
                </Text>
                <Text fontSize="xs" color={mutedColor} textAlign="center">
                  Escaneos QR
                </Text>
              </VStack>
            </VStack>
          </Box>
        </SimpleGrid>

        {/* Trust badges row */}
        <Flex justify="center" flexWrap="wrap" gap={2} mt={3}>
          {trustData.isTrazoVerified && (
            <Badge
              colorScheme="green"
              variant="solid"
              px={3}
              py={2}
              borderRadius="full"
              fontSize="sm"
            >
              <HStack spacing={1}>
                <Icon as={MdVerified} boxSize={4} />
                <Text>Trazo Certificado</Text>
              </HStack>
            </Badge>
          )}
          {trustData.isUSDAVerified && (
            <Badge
              colorScheme="green"
              variant="outline"
              px={3}
              py={2}
              borderRadius="full"
              fontSize="sm"
            >
              <HStack spacing={1}>
                <Icon as={FaCertificate} boxSize={4} />
                <Text>USDA Verificado</Text>
              </HStack>
            </Badge>
          )}
          {trustData.isBlockchainVerified && (
            <Badge
              colorScheme="blue"
              variant="outline"
              px={3}
              py={2}
              borderRadius="full"
              fontSize="sm"
            >
              <HStack spacing={1}>
                <Icon as={FaLock} boxSize={4} />
                <Text>Blockchain Seguro</Text>
              </HStack>
            </Badge>
          )}
        </Flex>

        {/* Transparency message */}
        <Box textAlign="center" pt={2}>
          <Text fontSize="sm" color={mutedColor} fontStyle="italic">
            {trustScore >= 95 &&
              '¡Transparencia certificada! Este productor documenta completamente sus prácticas agrícolas.'}
            {trustScore >= 85 &&
              trustScore < 95 &&
              'Excelente transparencia. La mayoría de eventos están documentados con evidencia.'}
            {trustScore >= 70 &&
              trustScore < 85 &&
              'Buena transparencia. Se documentan regularmente las prácticas agrícolas.'}
            {trustScore >= 50 &&
              trustScore < 70 &&
              'Transparencia básica. Algunos eventos están documentados.'}
            {trustScore < 50 &&
              'Construyendo transparencia. Más documentación mejoraría la confianza del consumidor.'}
          </Text>
        </Box>
      </VStack>
    </Box>
  );
};

export default TransparencyTrustBadge;
