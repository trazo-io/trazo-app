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
import { FaBoxes, FaBarcode, FaUserTie, FaWeightHanging, FaInfoCircle } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
// Consumer-readable batch quantity — see utils/consumerDisplay.ts
import { formatHarvestQuantity } from 'utils/consumerDisplay';

interface HarvestDetails {
  amount?: number;
  unit?: string;
  lot_number?: string;
  // ⛔ `quality_grade` and `harvest_method` are deliberately NOT declared here.
  //
  // The season-close form collects both under a section whose own label reads "Printed in your
  // certifier packet alongside the lot number and yield. Not shown to consumers." They were on
  // the anonymous payload and rendered on this card, so the form was making a promise the page
  // broke. The server stopped sending them (`transparency_views.py`, harvestDetails); leaving
  // them off the type means adding a render branch back would not typecheck.
  farmer_notes?: string;
}

interface HarvestInfoCardProps {
  harvestDetails?: HarvestDetails;
}

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
  const hasFarmerNotes = harvestDetails.farmer_notes;
  // `production_method` is deliberately NOT on the type and NOT read (2026-11-04). This card
  // showed any value other than "conventional" in a green bordered box with a seedling
  // ("Prominent for organic/sustainable/regenerative"), and the owner-only summary labels the
  // farm's own dropdown "organic" as "Certified Organic". The public payload stopped sending it
  // (transparency_views.py: amount, unit and lot only), which left the box dormant but armed:
  // one payload change from printing a self-declared certification in green. Certification is
  // shown, database-gated, in the certifications card and nowhere else.

  // Don't render if no meaningful data
  if (!hasAmount && !hasLot && !hasFarmerNotes) {
    return null;
  }

  return (
    <Box
      bg={bgColor}
      borderRadius="xl"
      borderWidth="1px"
      borderColor={borderColor}
      p={{ base: 4, smd: 6 }}>
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack spacing={3}>
          <Flex w={10} h={10} borderRadius="lg" bg={accentBg} align="center" justify="center">
            <Icon as={FaBoxes} color="green.500" boxSize={5} />
          </Flex>
          <VStack align="start" spacing={0}>
            <Text as="h2" fontWeight="bold" color={textColor} fontSize="md">
              {intl.formatMessage({ id: 'app.batchDetails' })}
            </Text>
            <Text fontSize="xs" color={mutedColor}>
              {intl.formatMessage({ id: 'app.batchDetailsSubtitle' })}
            </Text>
          </VStack>
        </HStack>

        {/* Harvest Info Grid */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
          {/* Production Amount */}
          {hasAmount && (
            <Box
              bg={useColorModeValue('gray.50', 'gray.700')}
              p={3}
              borderRadius="lg"
              textAlign="center">
              <Icon as={FaWeightHanging} color="green.500" boxSize={4} mb={1} />
              {(() => {
                const formatted = formatHarvestQuantity(
                  harvestDetails.amount as number,
                  harvestDetails.unit,
                  intl.locale
                );
                return (
                  <>
                    <Text fontSize="lg" fontWeight="bold" color={textColor}>
                      {formatted.value}
                    </Text>
                    <Text fontSize="xs" color={mutedColor} textTransform="uppercase">
                      {formatted.unit}
                    </Text>
                  </>
                );
              })()}
            </Box>
          )}

          {/* Lot Number */}
          {hasLot && (
            <Box
              bg={useColorModeValue('gray.50', 'gray.700')}
              p={3}
              borderRadius="lg"
              textAlign="center">
              <Icon as={FaBarcode} color="green.500" boxSize={4} mb={1} />
              <Text fontSize="sm" fontWeight="bold" color={textColor} noOfLines={1}>
                {harvestDetails.lot_number}
              </Text>
              <Text fontSize="xs" color={mutedColor} textTransform="uppercase">
                {intl.formatMessage({ id: 'app.lotNumber' })}
              </Text>
            </Box>
          )}

          {/* Quality grade and harvest method are deliberately absent — see the note on the
              HarvestDetails type. The farmer was told they are not shown to consumers. */}
        </SimpleGrid>

        {/* Farmer Notes - Direct message from farmer to consumers */}
        {hasFarmerNotes && (
          <Box
            bg={useColorModeValue('blue.50', 'blue.900')}
            p={4}
            borderRadius="lg"
            borderLeft="4px solid"
            borderLeftColor="blue.400">
            <HStack spacing={3} align="flex-start">
              <Flex
                w={8}
                h={8}
                borderRadius="full"
                bg={useColorModeValue('blue.100', 'blue.800')}
                align="center"
                justify="center"
                flexShrink={0}>
                <Icon as={FaUserTie} color="blue.500" boxSize={4} />
              </Flex>
              <VStack align="start" spacing={1}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color={useColorModeValue('blue.600', 'blue.300')}
                  textTransform="uppercase">
                  {intl.formatMessage({ id: 'app.farmerNotes' })}
                </Text>
                <Text
                  fontSize="sm"
                  color={useColorModeValue('gray.700', 'gray.200')}
                  lineHeight="1.5">
                  {harvestDetails.farmer_notes}
                </Text>
              </VStack>
            </HStack>
          </Box>
        )}

        {/* Transparency Note */}
        {/* Neutral (2026-11-04): this note says the records are the FARM's, so it must not wear
            the green and the leaf that read as an endorsement. */}
        <Box bg={useColorModeValue('gray.50', 'gray.700')} p={3} borderRadius="md">
          <HStack spacing={2}>
            <Icon as={FaInfoCircle} color={mutedColor} boxSize={3} />
            <Text fontSize="xs" color={useColorModeValue('gray.700', 'gray.200')}>
              {intl.formatMessage({ id: 'app.batchTraceabilityNote' })}
            </Text>
          </HStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default HarvestInfoCard;
