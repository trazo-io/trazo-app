import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Circle,
  useColorModeValue
} from '@chakra-ui/react';
import { FaLeaf, FaCheckCircle, FaUniversity } from 'react-icons/fa';
import { BsShieldCheck } from 'react-icons/bs';

interface CarbonVerificationCardProps {
  co2e: number; // CO2e per unit
  verified: boolean;
  source: string;
  isLoading?: boolean;
}

export const CarbonVerificationCard: React.FC<CarbonVerificationCardProps> = ({
  co2e,
  verified,
  source,
  isLoading = false
}) => {
  const bg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  // Determine carbon impact level
  const getImpactLevel = (co2eValue: number) => {
    const absValue = Math.abs(co2eValue);
    if (co2eValue < 0) return { level: 'Carbon Negative', color: 'green', icon: FaLeaf };
    if (absValue <= 2) return { level: 'Very Low Impact', color: 'green', icon: FaLeaf };
    if (absValue <= 5) return { level: 'Low Impact', color: 'blue', icon: FaLeaf };
    if (absValue <= 10) return { level: 'Moderate Impact', color: 'yellow', icon: FaLeaf };
    return { level: 'High Impact', color: 'orange', icon: FaLeaf };
  };

  const impactData = getImpactLevel(co2e);

  if (isLoading) {
    return (
      <Box bg={bg} p={6} borderRadius="xl" border="1px" borderColor="gray.200" boxShadow="sm">
        <Text fontSize="sm" color={mutedColor}>
          Loading carbon verification...
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
      borderColor={verified ? `${impactData.color}.200` : 'gray.200'}
      boxShadow="sm"
    >
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack spacing={3}>
            <Circle size="40px" bg={`${impactData.color}.100`}>
              <Icon as={impactData.icon} color={`${impactData.color}.500`} boxSize={5} />
            </Circle>
            <VStack align="start" spacing={0}>
              <Text fontSize="md" fontWeight="semibold" color={textColor}>
                Carbon Footprint
              </Text>
              <Text fontSize="xs" color={mutedColor}>
                Verified agricultural data
              </Text>
            </VStack>
          </HStack>

          {verified && (
            <Badge colorScheme="green" variant="subtle">
              <HStack spacing={1}>
                <Icon as={FaCheckCircle} boxSize={3} />
                <Text>Verified</Text>
              </HStack>
            </Badge>
          )}
        </HStack>

        {/* Carbon Data */}
        <HStack justify="space-between" align="center">
          <VStack align="start" spacing={1}>
            <Text fontSize="2xl" fontWeight="bold" color={`${impactData.color}.600`}>
              {co2e < 0 ? '-' : ''}
              {Math.abs(co2e).toFixed(1)} kg CO₂e
            </Text>
            <Badge colorScheme={impactData.color} variant="outline">
              {impactData.level}
            </Badge>
          </VStack>

          <VStack align="end" spacing={1}>
            <HStack spacing={2}>
              <Icon as={FaUniversity} color="blue.500" boxSize={4} />
              <Text fontSize="sm" color={textColor}>
                {source}
              </Text>
            </HStack>
            {verified && (
              <HStack spacing={2}>
                <Icon as={BsShieldCheck} color="green.500" boxSize={4} />
                <Text fontSize="sm" color="green.600">
                  Blockchain secured
                </Text>
              </HStack>
            )}
          </VStack>
        </HStack>

        {/* Impact Message */}
        {co2e < 0 ? (
          <Box bg="green.50" p={3} borderRadius="md" border="1px" borderColor="green.200">
            <Text fontSize="sm" color="green.700" fontWeight="medium">
              🌱 This product actually removes CO₂ from the atmosphere!
            </Text>
          </Box>
        ) : (
          <Text fontSize="sm" color={mutedColor}>
            Lower carbon footprint compared to {Math.round((1 - co2e / 15) * 100)}% of similar
            products
          </Text>
        )}
      </VStack>
    </Box>
  );
};

export default CarbonVerificationCard;
