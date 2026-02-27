import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  SimpleGrid,
  useColorModeValue,
  Flex
} from '@chakra-ui/react';
import {
  FaBoxes,
  FaClipboardCheck,
  FaTractor,
  FaLeaf,
  FaBarcode,
  FaUserTie,
  FaSeedling
} from 'react-icons/fa';
import { useIntl } from 'react-intl';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';

interface HarvestDetails {
  amount?: number;
  unit?: string;
  lot_number?: string;
  quality_grade?: string;
  harvest_method?: string;
  farmer_notes?: string;
  production_method?: string;
}

interface HarvestInfoCardProps {
  harvestDetails?: HarvestDetails;
}

// Humanize snake_case values to Title Case
const humanize = (value: string): string => {
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const HarvestInfoCard: React.FC<HarvestInfoCardProps> = ({ harvestDetails }) => {
  const intl = useIntl();
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const accentBg = useColorModeValue('green.50', 'green.900');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Don't render if no harvest details
  if (!harvestDetails || Object.keys(harvestDetails).length === 0) {
    return null;
  }

  const hasAmount = harvestDetails.amount !== undefined && harvestDetails.amount > 0;
  const hasLot = harvestDetails.lot_number;
  const hasQuality = harvestDetails.quality_grade;
  const hasMethod = harvestDetails.harvest_method;
  const hasFarmerNotes = harvestDetails.farmer_notes;
  const hasProductionMethod = harvestDetails.production_method;

  // Check if production method is special (not conventional)
  const isSpecialMethod =
    hasProductionMethod &&
    !harvestDetails.production_method?.toLowerCase().includes('conventional');

  // Don't render if no meaningful data
  if (
    !hasAmount &&
    !hasLot &&
    !hasQuality &&
    !hasMethod &&
    !hasFarmerNotes &&
    !hasProductionMethod
  ) {
    return null;
  }

  return (
    <Card bg={bgColor} shadow="sm" borderRadius="xl" borderWidth="1px" borderColor={borderColor}>
      <CardBody p={4}>
        <VStack spacing={4} align="stretch">
          {/* Header */}
          <HStack spacing={3}>
            <Flex w={10} h={10} borderRadius="lg" bg={accentBg} align="center" justify="center">
              <Icon as={FaBoxes} color="green.500" boxSize={5} />
            </Flex>
            <VStack align="start" spacing={0}>
              <Text fontWeight="bold" color={textColor} fontSize="md">
                {intl.formatMessage({ id: 'app.batchDetails' })}
              </Text>
              <Text fontSize="xs" color={mutedColor}>
                {intl.formatMessage({ id: 'app.batchDetailsSubtitle' })}
              </Text>
            </VStack>
          </HStack>

          {/* Production Method Badge - Prominent for organic/sustainable/regenerative */}
          {isSpecialMethod && (
            <Box
              bg={useColorModeValue('green.50', 'green.900')}
              p={3}
              borderRadius="lg"
              borderWidth="2px"
              borderColor="green.400"
            >
              <HStack spacing={3} justify="center">
                <Icon as={FaSeedling} color="green.500" boxSize={5} />
                <Text
                  fontWeight="bold"
                  fontSize="md"
                  color={useColorModeValue('green.700', 'green.200')}
                >
                  {harvestDetails.production_method}
                </Text>
              </HStack>
            </Box>
          )}

          {/* Harvest Info Grid */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
            {/* Production Amount */}
            {hasAmount && (
              <Box
                bg={useColorModeValue('gray.50', 'gray.700')}
                p={3}
                borderRadius="lg"
                textAlign="center"
              >
                <Icon as={FaLeaf} color="green.500" boxSize={4} mb={1} />
                <Text fontSize="lg" fontWeight="bold" color={textColor}>
                  {harvestDetails.amount?.toLocaleString()}
                </Text>
                <Text fontSize="xs" color={mutedColor} textTransform="uppercase">
                  {harvestDetails.unit || 'kg'}
                </Text>
              </Box>
            )}

            {/* Lot Number */}
            {hasLot && (
              <Box
                bg={useColorModeValue('gray.50', 'gray.700')}
                p={3}
                borderRadius="lg"
                textAlign="center"
              >
                <Icon as={FaBarcode} color="green.500" boxSize={4} mb={1} />
                <Text fontSize="sm" fontWeight="bold" color={textColor} noOfLines={1}>
                  {harvestDetails.lot_number}
                </Text>
                <Text fontSize="xs" color={mutedColor} textTransform="uppercase">
                  {intl.formatMessage({ id: 'app.lotNumber' })}
                </Text>
              </Box>
            )}

            {/* Quality Grade */}
            {hasQuality && (
              <Box
                bg={useColorModeValue('gray.50', 'gray.700')}
                p={3}
                borderRadius="lg"
                textAlign="center"
              >
                <Icon as={FaClipboardCheck} color="green.500" boxSize={4} mb={1} />
                <Text fontSize="sm" fontWeight="bold" color="green.600">
                  {humanize(harvestDetails.quality_grade || '')}
                </Text>
                <Text fontSize="xs" color={mutedColor} textTransform="uppercase">
                  {intl.formatMessage({ id: 'app.quality' })}
                </Text>
              </Box>
            )}

            {/* Harvest Method */}
            {hasMethod && (
              <Box
                bg={useColorModeValue('gray.50', 'gray.700')}
                p={3}
                borderRadius="lg"
                textAlign="center"
              >
                <Icon as={FaTractor} color="green.500" boxSize={4} mb={1} />
                <Text fontSize="xs" fontWeight="medium" color={textColor}>
                  {humanize(harvestDetails.harvest_method || '')}
                </Text>
                <Text fontSize="xs" color={mutedColor} textTransform="uppercase">
                  {intl.formatMessage({ id: 'app.harvestMethod' })}
                </Text>
              </Box>
            )}
          </SimpleGrid>

          {/* Farmer Notes - Direct message from farmer to consumers */}
          {hasFarmerNotes && (
            <Box
              bg={useColorModeValue('blue.50', 'blue.900')}
              p={4}
              borderRadius="lg"
              borderLeft="4px solid"
              borderLeftColor="blue.400"
            >
              <HStack spacing={3} align="flex-start">
                <Flex
                  w={8}
                  h={8}
                  borderRadius="full"
                  bg={useColorModeValue('blue.100', 'blue.800')}
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  <Icon as={FaUserTie} color="blue.500" boxSize={4} />
                </Flex>
                <VStack align="start" spacing={1}>
                  <Text
                    fontSize="xs"
                    fontWeight="bold"
                    color={useColorModeValue('blue.600', 'blue.300')}
                    textTransform="uppercase"
                  >
                    {intl.formatMessage({ id: 'app.farmerNotes' })}
                  </Text>
                  <Text
                    fontSize="sm"
                    color={useColorModeValue('gray.700', 'gray.200')}
                    lineHeight="1.5"
                  >
                    {harvestDetails.farmer_notes}
                  </Text>
                </VStack>
              </HStack>
            </Box>
          )}

          {/* Transparency Note */}
          <Box
            bg={useColorModeValue('green.50', 'green.900')}
            p={3}
            borderRadius="md"
            borderLeft="3px solid"
            borderLeftColor="green.400"
          >
            <HStack spacing={2}>
              <Icon as={FaLeaf} color="green.500" boxSize={3} />
              <Text fontSize="xs" color={useColorModeValue('green.700', 'green.200')}>
                {intl.formatMessage({ id: 'app.batchTraceabilityNote' })}
              </Text>
            </HStack>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default HarvestInfoCard;
