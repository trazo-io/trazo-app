import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Progress,
  SimpleGrid,
  useColorModeValue
} from '@chakra-ui/react';
import { FaUniversity, FaTrophy, FaEye } from 'react-icons/fa';
import { BsShieldCheck } from 'react-icons/bs';

interface TrustIndicatorsCardProps {
  usda: boolean;
  blockchain: boolean;
  ranking?: string;
  transparencyScore?: number;
  industryPercentile?: number;
  isLoading?: boolean;
}

export const TrustIndicatorsCard: React.FC<TrustIndicatorsCardProps> = ({
  usda,
  blockchain,
  ranking = 'Top 25% sustainability',
  transparencyScore = 0,
  industryPercentile = 0,
  isLoading = false
}) => {
  const bg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  // Calculate trust score based on verification methods
  const getTrustScore = () => {
    let score = 0;
    if (usda) score += 40; // USDA verification is high value
    if (blockchain) score += 30; // Blockchain provides immutability
    if (transparencyScore > 0) score += Math.min(30, transparencyScore * 0.3); // Up to 30 points from transparency
    return Math.min(100, score);
  };

  const trustScore = getTrustScore();

  const getTrustLevel = (score: number) => {
    if (score >= 90) return { level: 'Exceptional', color: 'green' };
    if (score >= 75) return { level: 'High', color: 'green' };
    if (score >= 60) return { level: 'Good', color: 'blue' };
    if (score >= 40) return { level: 'Basic', color: 'yellow' };
    return { level: 'Limited', color: 'orange' };
  };

  const trustLevel = getTrustLevel(trustScore);

  if (isLoading) {
    return (
      <Box bg={bg} p={6} borderRadius="xl" border="1px" borderColor="gray.200" boxShadow="sm">
        <Text fontSize="sm" color={mutedColor}>
          Loading trust indicators...
        </Text>
      </Box>
    );
  }

  return (
    <Box
      bg={bg}
      p={6}
      borderRadius="xl"
      border="1px"
      borderColor={`${trustLevel.color}.200`}
      boxShadow="sm"
    >
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <VStack align="start" spacing={0}>
            <Text fontSize="md" fontWeight="semibold" color={textColor}>
              Trust & Verification
            </Text>
            <Text fontSize="xs" color={mutedColor}>
              Independent verification status
            </Text>
          </VStack>

          <Badge colorScheme={trustLevel.color} variant="solid">
            {trustLevel.level} Trust
          </Badge>
        </HStack>

        {/* Trust Score */}
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="sm" fontWeight="medium" color={textColor}>
              Overall Trust Score
            </Text>
            <Text fontSize="sm" color={`${trustLevel.color}.600`} fontWeight="bold">
              {trustScore}/100
            </Text>
          </HStack>
          <Progress
            value={trustScore}
            colorScheme={trustLevel.color}
            size="sm"
            borderRadius="full"
          />
        </VStack>

        {/* Verification Methods */}
        <SimpleGrid columns={2} spacing={3}>
          {/* USDA Verification */}
          <VStack
            p={3}
            bg={usda ? 'blue.50' : 'gray.50'}
            borderRadius="lg"
            border="1px"
            borderColor={usda ? 'blue.200' : 'gray.200'}
            spacing={2}
          >
            <Icon as={FaUniversity} color={usda ? 'blue.500' : 'gray.400'} boxSize={5} />
            <Text fontSize="xs" fontWeight="medium" textAlign="center" color={textColor}>
              USDA Verified
            </Text>
            <Badge
              colorScheme={usda ? 'blue' : 'gray'}
              size="sm"
              variant={usda ? 'solid' : 'outline'}
            >
              {usda ? 'Active' : 'Pending'}
            </Badge>
          </VStack>

          {/* Blockchain Verification */}
          <VStack
            p={3}
            bg={blockchain ? 'green.50' : 'gray.50'}
            borderRadius="lg"
            border="1px"
            borderColor={blockchain ? 'green.200' : 'gray.200'}
            spacing={2}
          >
            <Icon as={BsShieldCheck} color={blockchain ? 'green.500' : 'gray.400'} boxSize={5} />
            <Text fontSize="xs" fontWeight="medium" textAlign="center" color={textColor}>
              Blockchain
            </Text>
            <Badge
              colorScheme={blockchain ? 'green' : 'gray'}
              size="sm"
              variant={blockchain ? 'solid' : 'outline'}
            >
              {blockchain ? 'Secured' : 'Not Available'}
            </Badge>
          </VStack>
        </SimpleGrid>

        {/* Industry Comparison */}
        {industryPercentile > 0 && (
          <Box bg="blue.50" p={3} borderRadius="md" border="1px" borderColor="blue.200">
            <HStack justify="space-between" align="center">
              <HStack spacing={2}>
                <Icon as={FaTrophy} color="blue.500" boxSize={4} />
                <Text fontSize="sm" fontWeight="medium" color="blue.700">
                  Industry Ranking
                </Text>
              </HStack>
              <Text fontSize="sm" color="blue.600" fontWeight="bold">
                {ranking}
              </Text>
            </HStack>
          </Box>
        )}

        {/* Transparency Note */}
        <Box bg="green.50" p={3} borderRadius="md" border="1px" borderColor="green.200">
          <HStack spacing={2}>
            <Icon as={FaEye} color="green.500" boxSize={4} />
            <Text fontSize="sm" color="green.700">
              Full transparency available - all production data is accessible and verified
            </Text>
          </HStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default TrustIndicatorsCard;
