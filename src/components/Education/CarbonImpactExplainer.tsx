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
  SimpleGrid,
  Divider,
  useColorModeValue,
  Circle
} from '@chakra-ui/react';
import {
  FaLeaf,
  FaCar,
  FaHome,
  FaPlane,
  FaChevronDown,
  FaChevronUp,
  FaGlobeAmericas,
  FaRecycle,
  FaIndustry,
  FaChartLine
} from 'react-icons/fa';
import { useIntl } from 'react-intl';
import USDACredibilityBadge from '../Carbon/USDACredibilityBadge';

interface CarbonImpactExplainerProps {
  carbonScore: number;
  totalCO2e: number;
  productName?: string;
  isCompact?: boolean;
  relatableFootprint?: string; // Backend-calculated relatable comparison
  establishmentId?: number; // For EPA/USDA credibility badge
}

interface CarbonComparison {
  icon: any;
  label: string;
  description: string;
  value: string;
  color: string;
}

export const CarbonImpactExplainer: React.FC<CarbonImpactExplainerProps> = ({
  carbonScore,
  totalCO2e,
  productName = 'this product',
  isCompact = false,
  relatableFootprint,
  establishmentId
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const intl = useIntl();

  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('green.50', 'green.900');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('green.500', 'green.400');

  // Generate relatable comparisons based on CO2e amount
  const generateComparisons = (co2eKg: number): CarbonComparison[] => {
    const comparisons: CarbonComparison[] = [];

    // Driving comparison (1 kg CO2e ≈ 4 miles driving)
    const drivingMiles = Math.round(co2eKg * 4);
    if (drivingMiles > 0) {
      comparisons.push({
        icon: FaCar,
        label: intl.formatMessage({ id: 'app.carbonExplainer.drivingDistance' }),
        description: intl.formatMessage({ id: 'app.carbonExplainer.milesInCar' }),
        value:
          drivingMiles > 1000 ? `${(drivingMiles / 1000).toFixed(1)}K mi` : `${drivingMiles} mi`,
        color: 'blue'
      });
    }

    // Home energy comparison (1 kg CO2e ≈ 2.56 kWh electricity)
    // Based on EPA eGRID 2023: 0.39 kg CO2/kWh → 1/0.39 = 2.56 kWh per kg CO2
    const kwhEquivalent = Math.round(co2eKg * 2.56);
    if (kwhEquivalent > 0) {
      const days = Math.round(kwhEquivalent / 30); // Average 30 kWh/day per home
      comparisons.push({
        icon: FaHome,
        label: intl.formatMessage({ id: 'app.carbonExplainer.homeEnergy' }),
        description:
          days > 1
            ? intl.formatMessage({ id: 'app.carbonExplainer.daysElectricity' }, { days })
            : intl.formatMessage({ id: 'app.carbonExplainer.lessThanOneDay' }),
        value: `${kwhEquivalent} kWh`,
        color: 'orange'
      });
    }

    // Tree absorption comparison (1 tree absorbs ~22kg CO2/year)
    const treesNeeded = Math.ceil(co2eKg / 22);
    if (treesNeeded > 0) {
      comparisons.push({
        icon: FaLeaf,
        label: intl.formatMessage({ id: 'app.carbonExplainer.treeImpact' }),
        description: intl.formatMessage(
          { id: 'app.carbonExplainer.treesForYear' },
          { count: treesNeeded }
        ),
        value: `${co2eKg.toFixed(1)}kg`,
        color: 'green'
      });
    }

    // Flight comparison for larger amounts
    if (co2eKg > 100) {
      const shortFlights = Math.round(co2eKg / 200); // ~200kg for short flight
      comparisons.push({
        icon: FaPlane,
        label: intl.formatMessage({ id: 'app.carbonExplainer.flightImpact' }),
        description: intl.formatMessage(
          { id: 'app.carbonExplainer.shortFlights' },
          { count: shortFlights }
        ),
        value: `${(co2eKg / 1000).toFixed(1)}t`,
        color: 'red'
      });
    }

    return comparisons.slice(0, 3); // Show top 3 most relevant
  };

  // Use backend relatableFootprint if available, otherwise fall back to frontend calculations
  const comparisons = relatableFootprint
    ? [
        {
          icon: FaCar,
          label: intl.formatMessage({ id: 'app.carbonExplainer.carbonImpact' }),
          description: relatableFootprint,
          value: `${Math.abs(totalCO2e).toFixed(1)}kg`,
          color: 'green'
        }
      ]
    : generateComparisons(Math.abs(totalCO2e));

  // Score interpretation — this receives the TRANSPARENCY score, not a carbon score
  // Higher score = more documented practices, NOT lower emissions
  const getScoreInterpretation = (score: number) => {
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

  const scoreInfo = getScoreInterpretation(carbonScore);
  const isNegativeEmissions = totalCO2e < 0;

  // Emission category data with i18n
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
              {carbonScore}
            </Text>
          </Circle>

          <VStack align="start" spacing={1} flex="1">
            <HStack>
              <Badge colorScheme={scoreInfo.color} variant="solid" fontSize="xs">
                {scoreInfo.label}
              </Badge>
              {isNegativeEmissions && (
                <Badge colorScheme="green" variant="solid" fontSize="xs">
                  {intl.formatMessage({ id: 'app.carbonExplainer.lowEmissions' })}
                </Badge>
              )}
            </HStack>
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
      {/* Header */}
      <Box p={4} bg={cardBg}>
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={2}>
            <HStack>
              <Icon as={FaGlobeAmericas} color={accentColor} boxSize={5} />
              <Text fontSize="lg" fontWeight="bold" color={textColor}>
                {intl.formatMessage({ id: 'app.carbonExplainer.title' })}
              </Text>
            </HStack>
            <Text fontSize="sm" color={mutedColor}>
              {intl.formatMessage({ id: 'app.carbonExplainer.subtitle' }, { productName })}
            </Text>
          </VStack>

          <VStack align="end" spacing={1}>
            <HStack>
              <Text fontSize="2xl" fontWeight="bold" color={`${scoreInfo.color}.600`}>
                {Math.round(carbonScore)}%
              </Text>
            </HStack>
            <Badge colorScheme={scoreInfo.color} variant="solid">
              {scoreInfo.label}
            </Badge>
          </VStack>
        </HStack>

        {/* Transparency Documentation Bar */}
        <Box mt={4}>
          <Progress
            value={carbonScore}
            colorScheme={scoreInfo.color}
            size="lg"
            borderRadius="full"
            bg={useColorModeValue('gray.200', 'gray.600')}
          />
          <HStack justify="space-between" mt={1}>
            <Text fontSize="xs" color={mutedColor}>
              {intl.formatMessage({ id: 'app.carbonExplainer.lessDocumented' })}
            </Text>
            <Text fontSize="xs" color={mutedColor}>
              {intl.formatMessage({ id: 'app.carbonExplainer.fullyDocumented' })}
            </Text>
          </HStack>
        </Box>
      </Box>

      {/* Quick Impact Summary */}
      <Box p={4}>
        <VStack spacing={3} align="stretch">
          {/* Carbon Footprint Display */}
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={0}>
              <Text fontSize="sm" color={mutedColor}>
                {intl.formatMessage({ id: 'app.carbonExplainer.totalFootprint' })}
              </Text>
              <HStack>
                <Text fontSize="xl" fontWeight="bold" color={textColor}>
                  {Math.abs(totalCO2e).toFixed(1)}
                </Text>
                <Text fontSize="sm" color={mutedColor}>
                  kg CO₂e
                </Text>
                {isNegativeEmissions && (
                  <Badge colorScheme="green" variant="subtle">
                    {intl.formatMessage({ id: 'app.carbonExplainer.carbonStored' })}
                  </Badge>
                )}
              </HStack>
            </VStack>

            {/* Most relevant comparison */}
            {comparisons[0] && (
              <VStack align="end" spacing={0}>
                <HStack>
                  <Icon
                    as={comparisons[0].icon}
                    color={`${comparisons[0].color}.500`}
                    boxSize={4}
                  />
                  <Text fontSize="sm" fontWeight="semibold">
                    {comparisons[0].value}
                  </Text>
                </HStack>
                <Text fontSize="xs" color={mutedColor} textAlign="right">
                  {comparisons[0].description}
                </Text>
              </VStack>
            )}
          </HStack>

          {/* Quick Advice */}
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

      {/* Expanded Educational Content */}
      <Collapse in={isExpanded}>
        <Divider />
        <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')}>
          <VStack spacing={6} align="stretch">
            {/* Real-World Comparisons */}
            {comparisons.length > 0 && (
              <Box>
                <Text fontSize="md" fontWeight="semibold" mb={3} color={textColor}>
                  {intl.formatMessage({ id: 'app.carbonExplainer.realLifeTitle' })}
                </Text>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                  {comparisons.map((comp, idx) => (
                    <Box
                      key={idx}
                      p={3}
                      bg={useColorModeValue(`${comp.color}.50`, `${comp.color}.900`)}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor={useColorModeValue(`${comp.color}.200`, `${comp.color}.700`)}
                    >
                      <VStack spacing={2}>
                        <Circle size="40px" bg={`${comp.color}.500`} color="white">
                          <Icon as={comp.icon} boxSize={5} />
                        </Circle>
                        <Text fontSize="sm" fontWeight="semibold" textAlign="center">
                          {comp.label}
                        </Text>
                        <Text fontSize="lg" fontWeight="bold" color={`${comp.color}.600`}>
                          {comp.value}
                        </Text>
                        <Text fontSize="xs" color={mutedColor} textAlign="center">
                          {comp.description}
                        </Text>
                      </VStack>
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>
            )}

            {/* Low Direct Emissions Note */}
            {isNegativeEmissions && (
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
                </HStack>
                <Text fontSize="sm" color="green.700">
                  {intl.formatMessage({ id: 'app.carbonExplainer.lowEmissionsDesc' })}
                </Text>
                <Text fontSize="xs" color="green.600" mt={1}>
                  {intl.formatMessage({ id: 'app.carbonExplainer.lowEmissionsNote' })}
                </Text>
              </Box>
            )}

            {/* Carbon Emission Categories */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={2} color={textColor}>
                {intl.formatMessage({ id: 'app.carbonExplainer.directEmissionsTitle' })}
              </Text>
              <Text fontSize="xs" color={mutedColor} mb={3}>
                {intl.formatMessage({ id: 'app.carbonExplainer.directEmissionsDesc' })}
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
            </Box>

            {/* EPA/USDA Credibility Badge */}
            {establishmentId && <USDACredibilityBadge establishmentId={establishmentId} />}

            {/* Calculation Data Sources */}
            <Box
              bg={useColorModeValue('purple.50', 'purple.900')}
              p={4}
              borderRadius="lg"
              border="1px solid"
              borderColor={useColorModeValue('purple.200', 'purple.700')}
            >
              <HStack mb={3}>
                <Icon as={FaIndustry} color="purple.500" boxSize={5} />
                <Text fontSize="md" fontWeight="bold" color="purple.600">
                  {intl.formatMessage({ id: 'app.carbonExplainer.dataSourcesTitle' })}
                </Text>
              </HStack>
              <VStack align="start" spacing={3}>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="purple.700">
                    {intl.formatMessage({ id: 'app.carbonExplainer.ipccTitle' })}
                  </Text>
                  <Text fontSize="xs" color="purple.600">
                    {intl.formatMessage({ id: 'app.carbonExplainer.ipccDesc' })}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="purple.700">
                    {intl.formatMessage({ id: 'app.carbonExplainer.tillageTitle' })}
                  </Text>
                  <Text fontSize="xs" color="purple.600">
                    {intl.formatMessage({ id: 'app.carbonExplainer.tillageDesc' })}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="purple.700">
                    {intl.formatMessage({ id: 'app.carbonExplainer.usdaNassTitle' })}
                  </Text>
                  <Text fontSize="xs" color="purple.600">
                    {intl.formatMessage({ id: 'app.carbonExplainer.usdaNassDesc' })}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="purple.700">
                    {intl.formatMessage({ id: 'app.carbonExplainer.epaTitle' })}
                  </Text>
                  <Text fontSize="xs" color="purple.600">
                    {intl.formatMessage({ id: 'app.carbonExplainer.epaDesc' })}
                  </Text>
                </Box>
              </VStack>
            </Box>

            {/* Why This Matters */}
            <Box
              bg={useColorModeValue('blue.50', 'blue.900')}
              p={4}
              borderRadius="lg"
              border="1px solid"
              borderColor={useColorModeValue('blue.200', 'blue.700')}
            >
              <HStack mb={2}>
                <Icon as={FaChartLine} color="blue.500" boxSize={5} />
                <Text fontSize="md" fontWeight="bold" color="blue.600">
                  {intl.formatMessage({ id: 'app.carbonExplainer.whyTransparencyTitle' })}
                </Text>
              </HStack>
              <Text fontSize="sm" color="blue.700" mb={2}>
                {intl.formatMessage({ id: 'app.carbonExplainer.whyTransparencyDesc' })}
              </Text>
              <VStack align="start" spacing={1} pl={4}>
                <Text fontSize="sm" color="blue.700">
                  • {intl.formatMessage({ id: 'app.carbonExplainer.whyPoint1' })}
                </Text>
                <Text fontSize="sm" color="blue.700">
                  • {intl.formatMessage({ id: 'app.carbonExplainer.whyPoint2' })}
                </Text>
                <Text fontSize="sm" color="blue.700">
                  • {intl.formatMessage({ id: 'app.carbonExplainer.whyPoint3' })}
                </Text>
                <Text fontSize="sm" color="blue.700">
                  • {intl.formatMessage({ id: 'app.carbonExplainer.whyPoint4' })}
                </Text>
              </VStack>
            </Box>

            {/* Methodology Scope Disclaimer */}
            <Box p={3} bg={useColorModeValue('gray.100', 'gray.600')} borderRadius="md">
              <Text fontSize="xs" color={mutedColor}>
                {intl.formatMessage({ id: 'app.carbonExplainer.disclaimer' })}
              </Text>
            </Box>
          </VStack>
        </Box>
      </Collapse>
    </Box>
  );
};

export default CarbonImpactExplainer;
