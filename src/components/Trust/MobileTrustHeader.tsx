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
  Flex,
  useColorModeValue,
  Button,
  useDisclosure
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import {
  FaShieldAlt,
  FaCertificate,
  FaLock,
  FaUsers,
  FaInfoCircle,
  FaLeaf,
  FaChartLine
} from 'react-icons/fa';
import {
  MdVerified,
  MdScience,
  MdSecurity
} from 'react-icons/md';
import { BsShieldCheck, BsStarFill } from 'react-icons/bs';

// Animation for progressive loading
const slideInLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const countUp = keyframes`
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
`;

interface MobileTrustData {
  carbonScore: number;
  confidenceScore: number;
  isUSDAVerified: boolean;
  isBlockchainVerified: boolean;
  reviewsCount: number;
  averageRating: number;
  transparencyScore: number;
  scansCount: number;
}

interface MobileTrustHeaderProps {
  trustData: MobileTrustData;
  isLoading?: boolean;
  onDetailClick?: () => void;
}

export const MobileTrustHeader: React.FC<MobileTrustHeaderProps> = ({
  trustData,
  isLoading = false,
  onDetailClick
}) => {
  const [visibleElements, setVisibleElements] = useState(0);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const successColor = useColorModeValue('green.600', 'green.400');

  // Progressive reveal animation
  useEffect(() => {
    if (!isLoading) {
      const timer = setInterval(() => {
        setVisibleElements(prev => {
          if (prev < 4) return prev + 1;
          clearInterval(timer);
          return prev;
        });
      }, 200);
      return () => clearInterval(timer);
    }
  }, [isLoading]);

  // Calculate trust score
  const calculateTrustScore = () => {
    let score = 0;
    let possibleScore = 0;
    
    // Only add to score if data is actually available
    if (trustData.isUSDAVerified) score += 25;
    possibleScore += 25;
    
    if (trustData.isBlockchainVerified) score += 25;
    possibleScore += 25;
    
    if (trustData.confidenceScore > 0) {
      score += (trustData.confidenceScore / 100) * 20;
      possibleScore += 20;
    }
    
    if (trustData.transparencyScore > 0) {
      score += (trustData.transparencyScore / 100) * 15;
      possibleScore += 15;
    }
    
    if (trustData.reviewsCount > 0) {
      if (trustData.reviewsCount > 5) score += 10;
      possibleScore += 10;
    }
    
    if (trustData.averageRating > 0) {
      if (trustData.averageRating >= 4.0) score += 5;
      possibleScore += 5;
    }
    
    // If no data is available, return 0
    if (possibleScore === 0) return 0;
    
    // Calculate percentage based on available data
    return Math.min(Math.round((score / possibleScore) * 100), 100);
  };

  const trustScore = calculateTrustScore();

  // Trust level based on score
  const getTrustLevel = () => {
    if (trustScore === 0) return { level: 'Pending Verification', color: 'gray', icon: FaInfoCircle };
    if (trustScore >= 90) return { level: 'Exceptional', color: 'green', icon: MdSecurity };
    if (trustScore >= 80) return { level: 'Excellent', color: 'green', icon: BsShieldCheck };
    if (trustScore >= 70) return { level: 'Very Good', color: 'blue', icon: MdVerified };
    if (trustScore >= 60) return { level: 'Good', color: 'blue', icon: FaShieldAlt };
    return { level: 'Developing', color: 'yellow', icon: FaInfoCircle };
  };

  const trustLevel = getTrustLevel();

  if (isLoading) {
    return (
      <Box
        bg={bgColor}
        p={4}
        borderRadius="xl"
        boxShadow="lg"
        mx={4}
        mt={4}
      >
        <VStack spacing={3}>
          <Box h="60px" w="100%" bg="gray.200" borderRadius="lg" />
          <HStack spacing={2} w="100%">
            <Box h="40px" flex={1} bg="gray.200" borderRadius="md" />
            <Box h="40px" flex={1} bg="gray.200" borderRadius="md" />
            <Box h="40px" flex={1} bg="gray.200" borderRadius="md" />
          </HStack>
        </VStack>
      </Box>
    );
  }

  return (
    <Box
      bg={bgColor}
      p={4}
      borderRadius="xl"
      boxShadow="lg"
      mx={4}
      mt={4}
      border="1px solid"
      borderColor={useColorModeValue('green.200', 'green.600')}
      position="relative"
    >
      {/* Premium glow for high trust scores */}
      {trustScore >= 90 && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          borderRadius="xl"
          boxShadow="0 0 20px rgba(72, 187, 120, 0.3)"
          pointerEvents="none"
        />
      )}

      <VStack spacing={4} align="stretch">
        {/* Trust score header */}
        <Box
          opacity={visibleElements >= 1 ? 1 : 0}
          animation={visibleElements >= 1 ? `${slideInLeft} 0.5s ease-out` : undefined}
        >
          <HStack justify="space-between" align="center">
            <HStack spacing={3}>
              <Circle
                size={10}
                bg={`${trustLevel.color}.100`}
                color={`${trustLevel.color}.600`}
              >
                <Icon as={trustLevel.icon} boxSize={5} />
              </Circle>
              <VStack align="start" spacing={0}>
                <Text fontSize="md" fontWeight="bold" color={textColor}>
                  {trustLevel.level}
                </Text>
                <Text fontSize="xs" color={mutedColor}>
                  Trust Score
                </Text>
              </VStack>
            </HStack>
            
            <VStack spacing={0} align="end">
              <Text
                fontSize="2xl"
                fontWeight="bold"
                color={`${trustLevel.color}.600`}
                opacity={visibleElements >= 1 ? 1 : 0}
                animation={visibleElements >= 1 ? `${countUp} 0.6s ease-out 0.3s both` : undefined}
              >
                {trustScore}
              </Text>
              <Text fontSize="xs" color={mutedColor}>
                out of 100
              </Text>
            </VStack>
          </HStack>

          <Progress
            value={trustScore}
            colorScheme={trustLevel.color}
            size="md"
            borderRadius="full"
            mt={3}
            opacity={visibleElements >= 1 ? 1 : 0}
            animation={visibleElements >= 1 ? `${slideInLeft} 0.7s ease-out 0.5s both` : undefined}
          />
        </Box>

        {/* Trust indicators grid - Mobile optimized */}
        <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
          {/* USDA Verification */}
          <VStack
            spacing={1}
            opacity={visibleElements >= 2 ? 1 : 0}
            animation={visibleElements >= 2 ? `${slideInLeft} 0.5s ease-out 0.2s both` : undefined}
            minW="60px"
          >
            <Circle
              size={8}
              bg={trustData.isUSDAVerified ? 'green.100' : 'gray.100'}
              color={trustData.isUSDAVerified ? 'green.600' : 'gray.500'}
            >
              <Icon as={FaCertificate} boxSize={3} />
            </Circle>
            <Text fontSize="2xs" color={mutedColor} textAlign="center" fontWeight="medium">
              USDA
            </Text>
            <Badge
              colorScheme={trustData.isUSDAVerified ? 'green' : 'gray'}
              variant="solid"
              fontSize="2xs"
              px={2}
              py={0.5}
              borderRadius="full"
            >
              {trustData.isUSDAVerified ? 'Verified' : 'Pending'}
            </Badge>
          </VStack>

          {/* Blockchain Security */}
          <VStack
            spacing={1}
            opacity={visibleElements >= 2 ? 1 : 0}
            animation={visibleElements >= 2 ? `${slideInLeft} 0.5s ease-out 0.3s both` : undefined}
            minW="60px"
          >
            <Circle
              size={8}
              bg={trustData.isBlockchainVerified ? 'blue.100' : 'gray.100'}
              color={trustData.isBlockchainVerified ? 'blue.600' : 'gray.500'}
            >
              <Icon as={FaLock} boxSize={3} />
            </Circle>
            <Text fontSize="2xs" color={mutedColor} textAlign="center" fontWeight="medium">
              Blockchain
            </Text>
            <Badge
              colorScheme={trustData.isBlockchainVerified ? 'blue' : 'gray'}
              variant="solid"
              fontSize="2xs"
              px={2}
              py={0.5}
              borderRadius="full"
            >
              {trustData.isBlockchainVerified ? 'Secured' : 'Pending'}
            </Badge>
          </VStack>

          {/* Data Accuracy */}
          <VStack
            spacing={1}
            opacity={visibleElements >= 3 ? 1 : 0}
            animation={visibleElements >= 3 ? `${slideInLeft} 0.5s ease-out 0.4s both` : undefined}
            minW="60px"
          >
            <Circle
              size={8}
              bg="purple.100"
              color="purple.600"
            >
              <Icon as={MdScience} boxSize={3} />
            </Circle>
            <Text fontSize="2xs" color={mutedColor} textAlign="center" fontWeight="medium">
              Accuracy
            </Text>
            <Badge
              colorScheme="purple"
              variant="solid"
              fontSize="2xs"
              px={2}
              py={0.5}
              borderRadius="full"
            >
              {trustData.confidenceScore > 0 ? `${Math.round(trustData.confidenceScore)}%` : '--'}
            </Badge>
          </VStack>

          {/* Community Rating */}
          <VStack
            spacing={1}
            opacity={visibleElements >= 3 ? 1 : 0}
            animation={visibleElements >= 3 ? `${slideInLeft} 0.5s ease-out 0.5s both` : undefined}
            minW="60px"
          >
            <Circle
              size={8}
              bg="orange.100"
              color="orange.600"
            >
              <Icon as={FaUsers} boxSize={3} />
            </Circle>
            <Text fontSize="2xs" color={mutedColor} textAlign="center" fontWeight="medium">
              Rating
            </Text>
            <HStack spacing={1} justify="center">
              <Icon as={BsStarFill} color="orange.400" boxSize={2} />
              <Text fontSize="2xs" fontWeight="bold" color={textColor}>
                {trustData.averageRating > 0 ? trustData.averageRating.toFixed(1) : '--'}
              </Text>
            </HStack>
          </VStack>
        </Flex>

        {/* Quick stats bar */}
        <Box
          opacity={visibleElements >= 4 ? 1 : 0}
          animation={visibleElements >= 4 ? `${slideInLeft} 0.5s ease-out 0.6s both` : undefined}
        >
          <HStack
            justify="space-between"
            p={3}
            bg={useColorModeValue('gray.50', 'gray.700')}
            borderRadius="lg"
            fontSize="xs"
          >
            <VStack spacing={0}>
              <Text fontWeight="bold" color={textColor}>
                {trustData.scansCount > 0 ? trustData.scansCount.toLocaleString() : '--'}
              </Text>
              <Text color={mutedColor}>Scans</Text>
            </VStack>
            <VStack spacing={0}>
              <Text fontWeight="bold" color={textColor}>
                {trustData.reviewsCount > 0 ? trustData.reviewsCount : '--'}
              </Text>
              <Text color={mutedColor}>Reviews</Text>
            </VStack>
            <VStack spacing={0}>
              <Text fontWeight="bold" color={successColor}>
                {trustData.carbonScore > 0 ? trustData.carbonScore : '--'}
              </Text>
              <Text color={mutedColor}>Carbon Score</Text>
            </VStack>
          </HStack>
        </Box>

        {/* View details button */}
        {onDetailClick && (
          <Button
            onClick={onDetailClick}
            variant="ghost"
            colorScheme={trustLevel.color}
            size="sm"
            leftIcon={<Icon as={FaInfoCircle} />}
            fontSize="xs"
            opacity={visibleElements >= 4 ? 1 : 0}
            animation={visibleElements >= 4 ? `${slideInLeft} 0.5s ease-out 0.7s both` : undefined}
          >
            View Full Verification Report
          </Button>
        )}
      </VStack>
    </Box>
  );
};

export default MobileTrustHeader;