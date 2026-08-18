import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Button,
  Collapse,
  Divider,
  useColorModeValue,
  Link
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import {
  FaLeaf,
  FaCar,
  FaChevronDown,
  FaChevronUp,
  FaGlobeAmericas,
  FaRecycle,
  FaMobileAlt
} from 'react-icons/fa';
import { useIntl } from 'react-intl';
import USDACredibilityBadge from '../Carbon/USDACredibilityBadge';

interface BackendComparisons {
  driving_miles: number;
  trees_per_year: number;
  kwh_electricity: number;
}

interface ConsumerContext {
  kg_per_kg: number;
  per_kg_miles: number;
  per_kg_phone_charges: number;
  has_per_kg_data: boolean;
}

interface CarbonImpactExplainerProps {
  totalCO2e: number;
  productName?: string;
  relatableFootprint?: string;
  backendComparisons?: BackendComparisons;
  consumerContext?: ConsumerContext;
}

export const CarbonImpactExplainer: React.FC<CarbonImpactExplainerProps> = ({
  totalCO2e,
  productName = 'this product',
  consumerContext
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const intl = useIntl();

  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('green.50', 'green.900');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('green.700', 'green.300');

  // Self-graded transparency score removed from the consumer surface (2026-06 claim-safety):
  // a self-assigned "% documented / Fully Documented" verdict shown to shoppers is the
  // self-created sustainability-label class banned by EU ECGT 2024/825 (live 2026-09-27)
  // and an FTC 16 CFR 260.6 general-benefit risk. The score stays on the FARMER dashboard
  // as the engagement KPI; consumers see the factual evidence instead (hero practices count,
  // photos, third-party certs, timeline). This card now shows carbon facts only.
  const isNegativeEmissions = totalCO2e < 0;
  const hasPerKgData = consumerContext?.has_per_kg_data && consumerContext.kg_per_kg > 0;

  // Emission categories for methodology section
  const emissionCategories = [
    {
      label: intl.formatMessage({ id: 'app.carbonExplainer.fuelEquipment' }),
      desc: intl.formatMessage({ id: 'app.carbonExplainer.fuelEquipmentDesc' })
    },
    {
      label: intl.formatMessage({ id: 'app.carbonExplainer.fertilizer' }),
      desc: intl.formatMessage({ id: 'app.carbonExplainer.fertilizerDesc' })
    },
    {
      label: intl.formatMessage({ id: 'app.carbonExplainer.chemicals' }),
      desc: intl.formatMessage({ id: 'app.carbonExplainer.chemicalsDesc' })
    },
    {
      label: intl.formatMessage({ id: 'app.carbonExplainer.irrigationEnergy' }),
      desc: intl.formatMessage({ id: 'app.carbonExplainer.irrigationEnergyDesc' })
    }
  ];

  return (
    <Box
      bg={bgColor}
      borderRadius="xl"
      border="1px solid"
      borderColor={useColorModeValue('gray.200', 'gray.600')}
      overflow="hidden">
      {/* Header — carbon-impact card title. No self-graded documentation score:
          consumers see facts (counts/photos/certs), not a self-assigned grade. */}
      <Box p={4} bg={cardBg}>
        <VStack align="start" spacing={2}>
          <HStack>
            <Icon as={FaGlobeAmericas} color={accentColor} boxSize={5} />
            <Text
              as="h2"
              fontSize={{ base: 'md', smd: 'lg', lg: 'xl' }}
              fontWeight="bold"
              color={textColor}>
              {intl.formatMessage({ id: 'app.carbonExplainer.title' })}
            </Text>
          </HStack>
          <Text fontSize="sm" color={mutedColor}>
            {intl.formatMessage({ id: 'app.carbonExplainer.subtitle' }, { productName })}
          </Text>
        </VStack>
      </Box>

      {/* PRIMARY: Consumer-friendly impact summary */}
      <Box p={4}>
        <VStack spacing={3} align="stretch">
          {/* Carbon stored / negative emissions highlight */}
          {isNegativeEmissions ? (
            <Box
              bg={useColorModeValue('green.50', 'green.900')}
              p={4}
              borderRadius="lg"
              border="1px solid"
              borderColor={useColorModeValue('green.200', 'green.700')}>
              <HStack mb={2}>
                <Icon as={FaRecycle} color="green.500" boxSize={5} />
                <Text fontSize="md" fontWeight="bold" color="green.700">
                  {intl.formatMessage({ id: 'app.carbonExplainer.lowEmissionsTitle' })}
                </Text>
                <Badge colorScheme="green" variant="subtle">
                  {intl.formatMessage({ id: 'app.carbonExplainer.carbonStored' })}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="green.700">
                {intl.formatMessage({ id: 'app.carbonExplainer.lowEmissionsDesc' })}
              </Text>
            </Box>
          ) : hasPerKgData ? (
            /* Per-kg impact card — the only relatable metric for consumers */
            <Box
              bg={useColorModeValue('gray.50', 'gray.700')}
              p={4}
              borderRadius="lg"
              border="1px solid"
              borderColor={useColorModeValue('gray.200', 'gray.600')}>
              <Text fontSize="sm" fontWeight="semibold" color={textColor} mb={2}>
                {intl.formatMessage({ id: 'app.carbonExplainer.yourImpact' })}
              </Text>
              <Text fontSize="sm" color={mutedColor} mb={1}>
                {intl.formatMessage({ id: 'app.carbonExplainer.perKgNarrative' }, { productName })}
              </Text>
              <HStack spacing={2} align="baseline" mb={3}>
                <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                  {consumerContext!.kg_per_kg}
                </Text>
                <Text fontSize="sm" color={mutedColor}>
                  {intl.formatMessage({ id: 'app.carbonExplainer.directEmissionsUnit' })}
                </Text>
              </HStack>

              {/* Relatable comparisons */}
              <VStack spacing={1} align="stretch">
                {consumerContext!.per_kg_miles > 0 && (
                  <HStack spacing={2}>
                    <Icon as={FaCar} color="gray.500" boxSize={4} />
                    <Text fontSize="sm" color={mutedColor}>
                      {intl.formatMessage(
                        { id: 'app.carbonExplainer.perKgMiles' },
                        { miles: consumerContext!.per_kg_miles }
                      )}
                    </Text>
                  </HStack>
                )}
                {consumerContext!.per_kg_phone_charges > 0 && (
                  <HStack spacing={2}>
                    <Icon as={FaMobileAlt} color="gray.500" boxSize={4} />
                    <Text fontSize="sm" color={mutedColor}>
                      {intl.formatMessage(
                        { id: 'app.carbonExplainer.perKgPhoneCharges' },
                        { count: consumerContext!.per_kg_phone_charges }
                      )}
                    </Text>
                  </HStack>
                )}
              </VStack>

              {/* Methodology boundary — FTC Green Guides 260.7 requires the
                  calculation boundary to accompany the environmental claim,
                  in the same section, not behind the expander. */}
              <Text fontSize="xs" color={mutedColor} mt={3}>
                {intl.formatMessage({
                  id: 'app.carbonExplainer.scopeBoundary',
                  defaultMessage:
                    'Counts direct on-farm emissions only — fuel, fertilizer, and equipment use, based on EPA/USDA factors. Not a full life-cycle footprint: transport, packaging, and retail are not included.'
                })}
              </Text>
            </Box>
          ) : null}

          {/* Expand Button */}
          <Button
            size="sm"
            variant="ghost"
            colorScheme="green"
            onClick={() => setIsExpanded(!isExpanded)}
            rightIcon={isExpanded ? <FaChevronUp /> : <FaChevronDown />}>
            {isExpanded
              ? intl.formatMessage({ id: 'app.carbonExplainer.showLess' })
              : intl.formatMessage({ id: 'app.carbonExplainer.showMore' })}
          </Button>
        </VStack>
      </Box>

      {/* Expanded: Methodology + Trust */}
      <Collapse in={isExpanded}>
        <Divider />
        <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')}>
          <VStack spacing={6} align="stretch">
            {/* How We Calculate */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={1} color={textColor}>
                {intl.formatMessage({ id: 'app.carbonExplainer.howWeCalculateTitle' })}
              </Text>
              <Text fontSize="xs" color={mutedColor} mb={3}>
                {intl.formatMessage({ id: 'app.carbonExplainer.howWeCalculateDesc' })}
              </Text>
              <VStack spacing={3} align="stretch">
                {emissionCategories.map((item, idx) => (
                  <HStack key={idx} spacing={3}>
                    <Icon as={FaLeaf} color="green.400" boxSize={3} />
                    <Box>
                      <Text fontSize="sm" fontWeight="medium">
                        {item.label}
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        {item.desc}
                      </Text>
                    </Box>
                  </HStack>
                ))}
              </VStack>
              <Text fontSize="xs" color={mutedColor} mt={3} fontStyle="italic">
                {intl.formatMessage({ id: 'app.carbonExplainer.epaUsdaNote' })}
              </Text>
            </Box>

            {/* EPA/USDA Credibility Badge (clickable for detailed modal) */}
            <USDACredibilityBadge />

            {/* Methodology Scope Disclaimer (FTC compliance) */}
            <Box p={3} bg={useColorModeValue('gray.100', 'gray.600')} borderRadius="md">
              <Text fontSize="xs" color={mutedColor}>
                {intl.formatMessage({ id: 'app.carbonExplainer.disclaimer' })}
              </Text>
            </Box>

            {/* Full methodology disclosure page (ECGT/FTC substantiation) */}
            <Link
              as={RouterLink}
              to="/methodology#carbon"
              fontSize="sm"
              fontWeight="medium"
              color="green.700"
              _hover={{ color: 'green.500' }}
              display="inline-flex"
              alignItems="center"
              minH="44px"
              alignSelf="flex-start">
              Read the full methodology →
            </Link>
          </VStack>
        </Box>
      </Collapse>
    </Box>
  );
};

export default CarbonImpactExplainer;
