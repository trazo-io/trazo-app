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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Divider
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import {
  FaShieldAlt,
  FaCertificate,
  FaLeaf,
  FaEye,
  FaLock,
  FaChartLine,
  FaUsers,
  FaGlobe,
  FaAward,
  FaCheck,
  FaStar,
  FaInfoCircle,
  FaCalendarAlt
} from 'react-icons/fa';
import {
  MdVerified,
  MdScience,
  MdSecurity,
  MdTrendingUp,
  MdPublic,
  MdTimer
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

export interface TrustData {
  carbonScore: number;
  confidenceScore: number;
  isUSDAVerified: boolean;
  isBlockchainVerified: boolean;
  scansCount: number;
  reviewsCount: number;
  averageRating: number;
  verificationDate: string;
  farmHistory: number; // Years
  certifications: string[];
  transparencyScore: number;
  industryPercentile: number;
  sustainabilityBadges: string[];
  publicViews: number;
  uniqueVisitors: number;
}

export interface EnhancedTrustIndicatorsProps {
  trustData: TrustData;
  isLoading?: boolean;
  variant?: 'hero' | 'compact' | 'detailed';
  showDetails?: boolean;
}

export const EnhancedTrustIndicators: React.FC<EnhancedTrustIndicatorsProps> = ({
  trustData,
  isLoading = false,
  variant = 'hero',
  showDetails = false
}) => {
  const [visibleElements, setVisibleElements] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('green.200', 'green.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const successColor = useColorModeValue('green.600', 'green.400');
  const accentColor = useColorModeValue('blue.600', 'blue.400');

  const isMobile = useBreakpointValue({ base: true, md: false });
  const spacing = useBreakpointValue({ base: 2, md: 4 });
  const iconSize = useBreakpointValue({ base: 4, md: 5 });

  // Progressive loading animation
  useEffect(() => {
    if (!isLoading) {
      const timer = setInterval(() => {
        setVisibleElements(prev => {
          if (prev < 6) return prev + 1;
          clearInterval(timer);
          return prev;
        });
      }, 300);
      return () => clearInterval(timer);
    }
  }, [isLoading]);

  // Calculate overall trust score (0-100)
  const calculateTrustScore = () => {
    let score = 0;
    
    // Core verification (40 points)
    if (trustData.isUSDAVerified) score += 20;
    if (trustData.isBlockchainVerified) score += 20;
    
    // Data quality (30 points)
    score += (trustData.confidenceScore / 100) * 15;
    score += (trustData.transparencyScore / 100) * 15;
    
    // Social proof (20 points)
    if (trustData.reviewsCount > 10) score += 10;
    if (trustData.averageRating >= 4.5) score += 5;
    if (trustData.scansCount > 100) score += 5;
    
    // Longevity (10 points)
    if (trustData.farmHistory >= 5) score += 5;
    if (trustData.certifications.length >= 2) score += 5;
    
    return Math.min(Math.round(score), 100);
  };

  const trustScore = calculateTrustScore();

  // Trust level based on score
  const getTrustLevel = () => {
    if (trustScore >= 90) return { level: 'Exceptional', color: 'green', icon: MdSecurity };
    if (trustScore >= 80) return { level: 'Excellent', color: 'green', icon: BsShieldCheck };
    if (trustScore >= 70) return { level: 'Very Good', color: 'blue', icon: MdVerified };
    if (trustScore >= 60) return { level: 'Good', color: 'blue', icon: FaShieldAlt };
    return { level: 'Developing', color: 'yellow', icon: FaInfoCircle };
  };

  const trustLevel = getTrustLevel();

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

  // Hero variant for main product page
  if (variant === 'hero') {
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
        {/* Trust level glow effect */}
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

        <VStack spacing={spacing} align="stretch">
          {/* Header with overall trust score */}
          <Box
            opacity={visibleElements >= 1 ? 1 : 0}
            animation={visibleElements >= 1 ? `${fadeInUp} 0.6s ease-out` : undefined}
          >
            <HStack justify="space-between" align="center" mb={4}>
              <HStack spacing={3}>
                <Circle
                  size={12}
                  bg={`${trustLevel.color}.100`}
                  color={`${trustLevel.color}.600`}
                >
                  <Icon as={trustLevel.icon} boxSize={6} />
                </Circle>
                <VStack align="start" spacing={0}>
                  <Text fontSize="xl" fontWeight="bold" color={textColor}>
                    {trustLevel.level} Transparency
                  </Text>
                  <Text fontSize="sm" color={mutedColor}>
                    Trust Score: {trustScore}/100
                  </Text>
                </VStack>
              </HStack>
              
              <Badge
                colorScheme={trustLevel.color}
                variant="solid"
                px={4}
                py={2}
                borderRadius="full"
                fontSize="sm"
                fontWeight="bold"
              >
                {trustScore >= 90 ? 'CERTIFIED' : 'VERIFIED'}
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

          {/* Key trust indicators grid */}
          <HStack spacing={spacing} justify="space-between">
            {/* USDA Verification */}
            <Box
              flex={1}
              opacity={visibleElements >= 2 ? 1 : 0}
              animation={visibleElements >= 2 ? `${fadeInUp} 0.6s ease-out 0.2s both` : undefined}
            >
              <VStack spacing={2}>
                <Circle
                  size={10}
                  bg={trustData.isUSDAVerified ? 'green.100' : 'gray.100'}
                  color={trustData.isUSDAVerified ? 'green.600' : 'gray.500'}
                >
                  <Icon as={FaCertificate} boxSize={iconSize} />
                </Circle>
                <VStack spacing={0}>
                  <Text fontSize="sm" fontWeight="bold" color={textColor} textAlign="center">
                    USDA Standards
                  </Text>
                  <Text fontSize="xs" color={mutedColor} textAlign="center">
                    {trustData.isUSDAVerified ? 'Verified' : 'Pending'}
                  </Text>
                </VStack>
              </VStack>
            </Box>

            {/* Blockchain Security */}
            <Box
              flex={1}
              opacity={visibleElements >= 3 ? 1 : 0}
              animation={visibleElements >= 3 ? `${fadeInUp} 0.6s ease-out 0.4s both` : undefined}
            >
              <VStack spacing={2}>
                <Circle
                  size={10}
                  bg={trustData.isBlockchainVerified ? 'blue.100' : 'gray.100'}
                  color={trustData.isBlockchainVerified ? 'blue.600' : 'gray.500'}
                >
                  <Icon as={FaLock} boxSize={iconSize} />
                </Circle>
                <VStack spacing={0}>
                  <Text fontSize="sm" fontWeight="bold" color={textColor} textAlign="center">
                    Blockchain Secured
                  </Text>
                  <Text fontSize="xs" color={mutedColor} textAlign="center">
                    {trustData.isBlockchainVerified ? 'Immutable' : 'Pending'}
                  </Text>
                </VStack>
              </VStack>
            </Box>

            {/* Data Accuracy */}
            <Box
              flex={1}
              opacity={visibleElements >= 4 ? 1 : 0}
              animation={visibleElements >= 4 ? `${fadeInUp} 0.6s ease-out 0.6s both` : undefined}
            >
              <VStack spacing={2}>
                <Circle
                  size={10}
                  bg="purple.100"
                  color="purple.600"
                >
                  <Icon as={MdScience} boxSize={iconSize} />
                </Circle>
                <VStack spacing={0}>
                  <Text fontSize="sm" fontWeight="bold" color={textColor} textAlign="center">
                    Data Accuracy
                  </Text>
                  <Text fontSize="xs" color={mutedColor} textAlign="center">
                    {Math.round(trustData.confidenceScore)}%
                  </Text>
                </VStack>
              </VStack>
            </Box>

            {/* Social Proof */}
            <Box
              flex={1}
              opacity={visibleElements >= 5 ? 1 : 0}
              animation={visibleElements >= 5 ? `${fadeInUp} 0.6s ease-out 0.8s both` : undefined}
            >
              <VStack spacing={2}>
                <Circle
                  size={10}
                  bg="orange.100"
                  color="orange.600"
                >
                  <Icon as={FaUsers} boxSize={iconSize} />
                </Circle>
                <VStack spacing={0}>
                  <Text fontSize="sm" fontWeight="bold" color={textColor} textAlign="center">
                    Community Trust
                  </Text>
                  <HStack spacing={1}>
                    <Icon as={BsStarFill} color="orange.400" boxSize={3} />
                    <Text fontSize="xs" color={mutedColor}>
                      {trustData.averageRating > 0 ? trustData.averageRating.toFixed(1) : '--'} ({trustData.reviewsCount})
                    </Text>
                  </HStack>
                </VStack>
              </VStack>
            </Box>
          </HStack>

          {/* Call to action */}
          <Box
            opacity={visibleElements >= 6 ? 1 : 0}
            animation={visibleElements >= 6 ? `${fadeInUp} 0.6s ease-out 1s both` : undefined}
          >
            <Button
              onClick={onOpen}
              variant="ghost"
              colorScheme={trustLevel.color}
              size="sm"
              leftIcon={<Icon as={FaInfoCircle} />}
              width="full"
            >
              View Detailed Verification Report
            </Button>
          </Box>
        </VStack>

        {/* Detailed modal */}
        <DetailedTrustModal
          isOpen={isOpen}
          onClose={onClose}
          trustData={trustData}
          trustScore={trustScore}
          trustLevel={trustLevel}
        />
      </Box>
    );
  }

  // Compact variant for mobile or sidebar
  if (variant === 'compact') {
    return (
      <HStack spacing={3} justify="center" flexWrap="wrap">
        {/* Trust score badge */}
        <Badge
          colorScheme={trustLevel.color}
          variant="solid"
          px={3}
          py={2}
          borderRadius="full"
          fontSize="sm"
          display="flex"
          alignItems="center"
          gap={2}
        >
          <Icon as={trustLevel.icon} boxSize={3} />
          <Text>{trustScore}% Trusted</Text>
        </Badge>

        {/* Key verifications */}
        {trustData.isUSDAVerified && (
          <Badge
            colorScheme="green"
            variant="outline"
            px={2}
            py={1}
            borderRadius="full"
            fontSize="xs"
          >
            <HStack spacing={1}>
              <Icon as={FaCertificate} boxSize={3} />
              <Text>USDA</Text>
            </HStack>
          </Badge>
        )}

        {trustData.isBlockchainVerified && (
          <Badge
            colorScheme="blue"
            variant="outline"
            px={2}
            py={1}
            borderRadius="full"
            fontSize="xs"
          >
            <HStack spacing={1}>
              <Icon as={FaLock} boxSize={3} />
              <Text>Secured</Text>
            </HStack>
          </Badge>
        )}
      </HStack>
    );
  }

  return null;
};

// Detailed trust information modal
const DetailedTrustModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  trustData: TrustData;
  trustScore: number;
  trustLevel: any;
}> = ({ isOpen, onClose, trustData, trustScore, trustLevel }) => {
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack spacing={3}>
            <Icon as={trustLevel.icon} color={`${trustLevel.color}.600`} boxSize={6} />
            <VStack align="start" spacing={0}>
              <Text>Verification Report</Text>
              <Text fontSize="sm" fontWeight="normal" color={mutedColor}>
                Complete transparency breakdown
              </Text>
            </VStack>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={6} align="stretch">
            {/* Overall score */}
            <Box p={4} bg="gray.50" borderRadius="lg">
              <VStack spacing={3}>
                <Circle size={16} bg={`${trustLevel.color}.100`} color={`${trustLevel.color}.600`}>
                  <Text fontSize="2xl" fontWeight="bold">{trustScore}</Text>
                </Circle>
                <VStack spacing={1}>
                  <Text fontSize="lg" fontWeight="bold" color={textColor}>
                    {trustLevel.level} Transparency Level
                  </Text>
                  <Text fontSize="sm" color={mutedColor} textAlign="center">
                    This farm demonstrates exceptional commitment to carbon transparency and sustainable practices.
                  </Text>
                </VStack>
                <Progress
                  value={trustScore}
                  colorScheme={trustLevel.color}
                  size="lg"
                  borderRadius="full"
                  width="100%"
                />
              </VStack>
            </Box>

            {/* Verification details */}
            <VStack spacing={4} align="stretch">
              <Text fontSize="lg" fontWeight="bold" color={textColor}>
                Verification Details
              </Text>

              {/* USDA Compliance */}
              <Box p={4} border="1px solid" borderColor="green.200" borderRadius="lg">
                <HStack justify="space-between" mb={2}>
                  <HStack spacing={2}>
                    <Icon as={FaCertificate} color="green.600" boxSize={5} />
                    <Text fontWeight="medium">USDA Standards Compliance</Text>
                  </HStack>
                  <Badge colorScheme={trustData.isUSDAVerified ? 'green' : 'gray'} variant="solid">
                    {trustData.isUSDAVerified ? 'Verified' : 'Pending'}
                  </Badge>
                </HStack>
                <Text fontSize="sm" color={mutedColor}>
                  {trustData.isUSDAVerified 
                    ? 'Carbon calculations verified against official USDA emission factors and agricultural standards.'
                    : 'USDA verification in progress. Calculations use best available emission factors.'
                  }
                </Text>
              </Box>

              {/* Blockchain Security */}
              <Box p={4} border="1px solid" borderColor="blue.200" borderRadius="lg">
                <HStack justify="space-between" mb={2}>
                  <HStack spacing={2}>
                    <Icon as={FaLock} color="blue.600" boxSize={5} />
                    <Text fontWeight="medium">Blockchain Security</Text>
                  </HStack>
                  <Badge colorScheme={trustData.isBlockchainVerified ? 'blue' : 'gray'} variant="solid">
                    {trustData.isBlockchainVerified ? 'Secured' : 'Pending'}
                  </Badge>
                </HStack>
                <Text fontSize="sm" color={mutedColor}>
                  {trustData.isBlockchainVerified
                    ? 'All carbon data is cryptographically secured on the blockchain, ensuring immutability and transparency.'
                    : 'Blockchain verification in progress. Data integrity maintained through secure databases.'
                  }
                </Text>
                {trustData.verificationDate && (
                  <Text fontSize="xs" color="blue.600" mt={2}>
                    Secured on: {new Date(trustData.verificationDate).toLocaleDateString()}
                  </Text>
                )}
              </Box>

              {/* Data Quality */}
              <Box p={4} border="1px solid" borderColor="purple.200" borderRadius="lg">
                <HStack justify="space-between" mb={2}>
                  <HStack spacing={2}>
                    <Icon as={MdScience} color="purple.600" boxSize={5} />
                    <Text fontWeight="medium">Data Accuracy</Text>
                  </HStack>
                  <Badge colorScheme="purple" variant="solid">
                    {Math.round(trustData.confidenceScore)}%
                  </Badge>
                </HStack>
                <Progress
                  value={trustData.confidenceScore}
                  colorScheme="purple"
                  size="sm"
                  borderRadius="full"
                  mb={2}
                />
                <Text fontSize="sm" color={mutedColor}>
                  Statistical confidence in carbon calculations based on data completeness, measurement precision, and verification checks.
                </Text>
              </Box>

              {/* Social Proof */}
              <Box p={4} border="1px solid" borderColor="orange.200" borderRadius="lg">
                <HStack justify="space-between" mb={2}>
                  <HStack spacing={2}>
                    <Icon as={FaUsers} color="orange.600" boxSize={5} />
                    <Text fontWeight="medium">Community Trust</Text>
                  </HStack>
                  <HStack spacing={2}>
                    <HStack spacing={1}>
                      {[...Array(5)].map((_, i) => (
                        <Icon
                          key={i}
                          as={BsStarFill}
                          color={i < Math.floor(trustData.averageRating) ? 'orange.400' : 'gray.300'}
                          boxSize={3}
                        />
                      ))}
                    </HStack>
                    <Text fontSize="sm" color={mutedColor}>
                      {trustData.averageRating > 0 ? trustData.averageRating.toFixed(1) : '--'}
                    </Text>
                  </HStack>
                </HStack>
                <VStack spacing={2} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="sm" color={mutedColor}>Consumer Reviews</Text>
                    <Text fontSize="sm" fontWeight="medium">{trustData.reviewsCount > 0 ? trustData.reviewsCount : 0} reviews</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color={mutedColor}>QR Code Scans</Text>
                    <Text fontSize="sm" fontWeight="medium">{trustData.scansCount > 0 ? trustData.scansCount.toLocaleString() : 0} scans</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color={mutedColor}>Industry Ranking</Text>
                    <Text fontSize="sm" fontWeight="medium">Top {100 - trustData.industryPercentile}%</Text>
                  </HStack>
                </VStack>
              </Box>
            </VStack>

            {/* Additional metrics */}
            {trustData.farmHistory && (
              <Box p={4} bg="gray.50" borderRadius="lg">
                <Text fontSize="md" fontWeight="bold" color={textColor} mb={3}>
                  Farm Credentials
                </Text>
                <VStack spacing={2} align="stretch">
                  <HStack justify="space-between">
                    <HStack spacing={2}>
                      <Icon as={FaCalendarAlt} color={mutedColor} boxSize={4} />
                      <Text fontSize="sm" color={mutedColor}>Farm History</Text>
                    </HStack>
                    <Text fontSize="sm" fontWeight="medium">{trustData.farmHistory > 0 ? trustData.farmHistory : 0} years</Text>
                  </HStack>
                  {trustData.certifications.length > 0 && (
                    <HStack justify="space-between">
                      <HStack spacing={2}>
                        <Icon as={FaAward} color={mutedColor} boxSize={4} />
                        <Text fontSize="sm" color={mutedColor}>Certifications</Text>
                      </HStack>
                      <Text fontSize="sm" fontWeight="medium">{trustData.certifications && trustData.certifications.length > 0 ? trustData.certifications.length : 0} active</Text>
                    </HStack>
                  )}
                  <HStack justify="space-between">
                    <HStack spacing={2}>
                      <Icon as={FaGlobe} color={mutedColor} boxSize={4} />
                      <Text fontSize="sm" color={mutedColor}>Public Views</Text>
                    </HStack>
                    <Text fontSize="sm" fontWeight="medium">{trustData.publicViews > 0 ? trustData.publicViews.toLocaleString() : 0}</Text>
                  </HStack>
                </VStack>
              </Box>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default EnhancedTrustIndicators;