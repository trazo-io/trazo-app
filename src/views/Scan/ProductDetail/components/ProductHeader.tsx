/**
 * Product Header Component
 * Displays welcome message and key metrics
 * Split from ProductDetail.tsx for better performance and maintainability
 */

import React from 'react';
import {
  Box,
  Container,
  SimpleGrid,
  VStack,
  HStack,
  Circle,
  Icon,
  Heading,
  Text,
  Badge,
  useColorModeValue
} from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { FaLeaf, FaCertificate, FaChartLine } from 'react-icons/fa';

interface ProductHeaderProps {
  completeData: any;
}

export const ProductHeader: React.FC<ProductHeaderProps> = ({ completeData }) => {
  const intl = useIntl();
  const textColor = useColorModeValue('gray.800', 'white');

  return (
    <Box
      bg="linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)"
      pt={{ base: '120px', md: '150px' }}
      pb={{ base: '80px', md: '120px' }}
      px={{ base: 3, md: 4 }}
    >
      <Container maxW={{ base: '100%', md: '6xl' }} mx="auto" px={{ base: 3, md: 8 }}>
        <VStack spacing={6} textAlign="center">
          {/* Trust Indicators - TRUST IN 3 SECONDS framework */}
          <HStack spacing={3} flexWrap="wrap" justify="center">
            <Badge
              colorScheme="green"
              variant="solid"
              fontSize="sm"
              px={3}
              py={1}
              borderRadius="full"
            >
              <HStack spacing={2}>
                <Icon as={FaLeaf} boxSize={3} />
                <Text fontWeight="600">USDA Verified</Text>
              </HStack>
            </Badge>
            <Badge
              colorScheme="blue"
              variant="solid"
              fontSize="sm"
              px={3}
              py={1}
              borderRadius="full"
            >
              <HStack spacing={2}>
                <Icon as={FaCertificate} boxSize={3} />
                <Text fontWeight="600">Blockchain Secured</Text>
              </HStack>
            </Badge>
            <Badge
              colorScheme="purple"
              variant="solid"
              fontSize="sm"
              px={3}
              py={1}
              borderRadius="full"
            >
              <HStack spacing={2}>
                <Icon as={FaChartLine} boxSize={3} />
                <Text fontWeight="600">Real Farm Data</Text>
              </HStack>
            </Badge>
          </HStack>

          {/* Welcome Message - Carbon-focused */}
          <Heading as="h1" size="2xl" fontWeight="bold" color="green.600" textAlign="center">
            Know Your Food's Climate Impact
          </Heading>

          <Text fontSize="lg" color="gray.600" maxW="2xl" textAlign="center">
            This product's verified carbon footprint and the farmer's sustainability story -
            transparency that drives climate-positive choices.
          </Text>

          {/* Metrics Cards */}
          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={6} w="full" maxW="600px" mt={8}>
            {/* Carbon Score */}
            <VStack spacing={3}>
              <Circle size="60px" bg="green.100">
                <Icon as={FaLeaf} color="green.600" boxSize={6} />
              </Circle>
              <Heading size="xl" color={textColor}>
                {(() => {
                  const score = completeData?.carbonScore || 50;
                  console.log('🔍 CARBON SCORE DEBUG - Raw value:', score);
                  const rounded = Math.round(score * 10) / 10;
                  console.log('🔍 CARBON SCORE DEBUG - Rounded value:', rounded);
                  return rounded;
                })()}
              </Heading>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                Carbon Score
              </Text>
            </VStack>

            {/* Verified Events */}
            <VStack spacing={3}>
              <Circle size="60px" bg="blue.100">
                <Icon as={FaCertificate} color="blue.600" boxSize={6} />
              </Circle>
              <Heading size="xl" color={textColor}>
                {(() => {
                  const events = completeData?.timeline || completeData?.events || [];
                  return Array.isArray(events) ? events.filter((e) => e.certified).length : 0;
                })()}
              </Heading>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                Verified Events
              </Text>
            </VStack>

            {/* Eco Ranking */}
            <VStack spacing={3}>
              <Circle size="60px" bg="purple.100">
                <Icon as={FaChartLine} color="purple.600" boxSize={6} />
              </Circle>
              <Heading size="xl" color={textColor}>
                {completeData?.industryPercentile || 45}%
              </Heading>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                Eco Ranking
              </Text>
            </VStack>
          </SimpleGrid>
        </VStack>
      </Container>
    </Box>
  );
};

export default ProductHeader;
