import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  SimpleGrid,
  useColorModeValue,
} from '@chakra-ui/react';
import { 
  FaTractor, 
  FaSeedling, 
  FaWater, 
  FaRecycle, 
  FaBug, 
  FaLeaf,
  FaShieldAlt
} from 'react-icons/fa';

interface SustainablePractice {
  name: string;
  status: 'active' | 'verified' | 'implemented' | 'ongoing';
  impact: string;
  icon: any;
  color: string;
}

interface FarmPracticesCardProps {
  practices?: SustainablePractice[];
  farmName?: string;
  totalPractices?: number;
  isLoading?: boolean;
}

export const FarmPracticesCard: React.FC<FarmPracticesCardProps> = ({
  practices = [],
  farmName = 'This farm',
  totalPractices,
  isLoading = false
}) => {
  const bg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  // Default sustainable practices based on common agricultural sustainability measures
  const defaultPractices: SustainablePractice[] = [
    {
      name: 'Soil Health Management',
      status: 'verified',
      impact: 'Carbon sequestration',
      icon: FaSeedling,
      color: 'green'
    },
    {
      name: 'Water Conservation',
      status: 'active',
      impact: 'Resource efficiency',
      icon: FaWater,
      color: 'blue'
    },
    {
      name: 'Reduced Chemical Usage',
      status: 'implemented',
      impact: 'Biodiversity protection',
      icon: FaLeaf,
      color: 'green'
    },
    {
      name: 'Sustainable Equipment Use',
      status: 'ongoing',
      impact: 'Lower emissions',
      icon: FaTractor,
      color: 'orange'
    }
  ];

  const displayPractices = practices.length > 0 ? practices : defaultPractices;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'green';
      case 'active': return 'blue';
      case 'implemented': return 'teal';
      case 'ongoing': return 'orange';
      default: return 'gray';
    }
  };

  if (isLoading) {
    return (
      <Box
        bg={bg}
        p={6}
        borderRadius="xl"
        border="1px"
        borderColor="gray.200"
        boxShadow="sm"
      >
        <Text fontSize="sm" color={mutedColor}>
          Loading sustainable practices...
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
      borderColor="green.200"
      boxShadow="sm"
    >
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <VStack align="start" spacing={0}>
            <Text fontSize="md" fontWeight="semibold" color={textColor}>
              Sustainable Practices
            </Text>
            <Text fontSize="xs" color={mutedColor}>
              {farmName} implements verified sustainable methods
            </Text>
          </VStack>
          
          <Badge colorScheme="green" variant="outline">
            {totalPractices || displayPractices.length} practices
          </Badge>
        </HStack>

        {/* Practices Grid */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
          {displayPractices.slice(0, 4).map((practice, index) => (
            <HStack 
              key={index}
              p={3}
              bg={`${practice.color}.50`}
              borderRadius="lg"
              border="1px"
              borderColor={`${practice.color}.200`}
              spacing={3}
            >
              <Icon
                as={practice.icon}
                color={`${practice.color}.500`}
                boxSize={5}
                flexShrink={0}
              />
              
              <VStack align="start" spacing={0} flex={1} minW={0}>
                <HStack spacing={2} w="full">
                  <Text fontSize="sm" fontWeight="medium" color={textColor} noOfLines={1}>
                    {practice.name}
                  </Text>
                  <Badge 
                    colorScheme={getStatusColor(practice.status)} 
                    size="sm"
                    flexShrink={0}
                  >
                    {practice.status}
                  </Badge>
                </HStack>
                <Text fontSize="xs" color={mutedColor} noOfLines={1}>
                  {practice.impact}
                </Text>
              </VStack>
            </HStack>
          ))}
        </SimpleGrid>

        {/* Footer Message */}
        <Box bg="green.50" p={3} borderRadius="md" border="1px" borderColor="green.200">
          <HStack spacing={2}>
            <Icon as={FaShieldAlt} color="green.500" boxSize={4} />
            <Text fontSize="sm" color="green.700">
              These practices are verified through production tracking and USDA standards
            </Text>
          </HStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default FarmPracticesCard;