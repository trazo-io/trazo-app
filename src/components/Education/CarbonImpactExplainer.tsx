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
  Progress,
  Divider,
  useColorModeValue,
  Circle,
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
  documentationScore: number;
  totalCO2e: number;
  productName?: string;
  isCompact?: boolean;
  relatableFootprint?: string;
  backendComparisons?: BackendComparisons;
  consumerContext?: ConsumerContext;
}

export const CarbonImpactExplainer: React.FC<CarbonImpactExplainerProps> = ({
  documentationScore,
  totalCO2e,
  productName = 'this product',
  isCompact = false,
  consumerContext
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const intl = useIntl();

  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('green.50', 'green.900');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('green.500', 'green.400');

  // Score interpretation — TRANSPARENCY score (documentation completeness)
  const getScoreInterpretation = (score: number) => {
    if (score >= 100)
      return {
        label: intl.formatMessage({ id: 'app.carbonExplainer.scoreFullyDocumented' }),
        color: 'green',
        description: intl.formatMessage({ id: 'app.carbonExplainer.scoreFullyDocumentedDesc' }),
        advice: intl.formatMessage({
          id: 'app.carbonExplainer.scoreAllDocumentedAdvice',
          defaultMessage: 'This farm documents all agricultural practices.'
        })
      };
    if (score >= 90)
      return {
        label: intl.formatMessage({ id: 'app.carbonExplainer.scoreFullyDocumented' }),
        color: 'green',
        description: intl.formatMessage({ id: 'app.carbonExplainer.scoreFullyDocumentedDesc' }),
        advice: intl.formatMessage({ id: 'app.carbonExplainer.scoreFullyDocumentedAdvice' })
      };
    if (score >= 70)
      return {
        label: intl.formatMessage({ id: 'app.carbonExplainer.scoreWellDocumented' }),
        color: 'blue',
        description: intl.formatMessage({ id: 'app.carbonExplainer.scoreWellDocumentedDesc' }),
        advice: intl.formatMessage({ id: 'app.carbonExplainer.scoreWellDocumentedAdvice' })
      };
    if (score >= 50)
      return {
        label: intl.formatMessage({ id: 'app.carbonExplainer.scorePartiallyDocumented' }),
        color: 'yellow',
        description: intl.formatMessage({
          id: 'app.carbonExplainer.scorePartiallyDocumentedDesc'
        }),
        advice: intl.formatMessage({ id: 'app.carbonExplainer.scorePartiallyDocumentedAdvice' })
      };
    return {
      label: intl.formatMessage({ id: 'app.carbonExplainer.scoreEarlyStage' }),
      color: 'orange',
      description: intl.formatMessage({ id: 'app.carbonExplainer.scoreEarlyStageDesc' }),
      advice: intl.formatMessage({ id: 'app.carbonExplainer.scoreEarlyStageAdvice' })
    };
  };

  const scoreInfo = getScoreInterpretation(documentationScore);
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

  if (isCompact) {
    return (
      <Box
        bg={cardBg}
        p={4}
        borderRadius="xl"
        border="1px solid"
        borderColor={useColorModeValue('green.200', 'green.700')}
      >
        <HStack spacing={4} align="center">
          <Circle size="50px" bg={`${scoreInfo.color}.500`} color="white">
            <Text fontSize="lg" fontWeight="bold">
              {documentationScore}
            </Text>
          </Circle>

          <VStack align="start" spacing={1} flex="1">
            <Badge colorScheme={scoreInfo.color} variant="solid" fontSize="xs">
              {scoreInfo.label}
            </Badge>
            <Text fontSize="sm" color={mutedColor}>
              {scoreInfo.description}
            </Text>
            <Text fontSize="xs" color="green.600" fontWeight="medium">
              {scoreInfo.advice}
            </Text>
          </VStack>
        </HStack>
      </Box>
    );
  }

  return (
    <Box
      bg={bgColor}
      borderRadius="xl"
      border="1px solid"
      borderColor={useColorModeValue('gray.200', 'gray.600')}
      overflow="hidden"
    >
      {/* Header — Transparency Documentation Score */}
      <Box p={4} bg={cardBg}>
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={2}>
            <HStack>
              <Icon as={FaGlobeAmericas} color={accentColor} boxSize={5} />
              <Text
                fontSize={{ base: 'md', smd: 'lg', lg: 'xl' }}
                fontWeight="bold"
                color={textColor}
              >
                {intl.formatMessage({ id: 'app.carbonExplainer.title' })}
              </Text>
            </HStack>
            <Text fontSize="sm" color={mutedColor}>
              {intl.formatMessage({ id: 'app.carbonExplainer.subtitle' }, { productName })}
            </Text>
          </VStack>

          <VStack align="end" spacing={1}>
            <Text
              fontSize={{ base: 'xl', smd: '2xl', lg: '3xl' }}
              fontWeight="bold"
              color={`${scoreInfo.color}.600`}
            >
              {Math.round(documentationScore)}%
            </Text>
            <Badge colorScheme={scoreInfo.color} variant="solid">
              {scoreInfo.label}
            </Badge>
          </VStack>
        </HStack>

        {/* Transparency Documentation Bar — slim minimalist */}
        <Box mt={3}>
          <Progress
            value={documentationScore}
            colorScheme={scoreInfo.color}
            size="xs"
            borderRadius="full"
            bg={useColorModeValue('gray.100', 'gray.700')}
          />
        </Box>
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
              borderColor={useColorModeValue('green.200', 'green.700')}
            >
              <HStack mb={2}>
                <Icon as={FaRecycle} color="green.500" boxSize={5} />
                <Text fontSize="md" fontWeight="bold" color="green.600">
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
              borderColor={useColorModeValue('gray.200', 'gray.600')}
            >
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

          {/* Transparency advice */}
          <Box
            bg={useColorModeValue(`${scoreInfo.color}.50`, `${scoreInfo.color}.900`)}
            p={3}
            borderRadius="lg"
            borderLeft="3px solid"
            borderLeftColor={`${scoreInfo.color}.500`}
          >
            <Text fontSize="sm" color={`${scoreInfo.color}.700`} fontWeight="medium">
              {scoreInfo.advice}
            </Text>
          </Box>

          {/* Expand Button */}
          <Button
            size="sm"
            variant="ghost"
            colorScheme="green"
            onClick={() => setIsExpanded(!isExpanded)}
            rightIcon={isExpanded ? <FaChevronUp /> : <FaChevronDown />}
          >
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
              color="green.600"
              _hover={{ color: 'green.500' }}
              display="inline-flex"
              alignItems="center"
              minH="44px"
              alignSelf="flex-start"
            >
              Read the full methodology →
            </Link>
          </VStack>
        </Box>
      </Collapse>
    </Box>
  );
};

export default CarbonImpactExplainer;
