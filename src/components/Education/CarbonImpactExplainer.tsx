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
  Tooltip,
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
  FaTruck,
  FaIndustry,
  FaChartLine
} from 'react-icons/fa';
import { MdEco } from 'react-icons/md';

interface CarbonImpactExplainerProps {
  carbonScore: number;
  totalCO2e: number;
  productName?: string;
  isCompact?: boolean;
  relatableFootprint?: string; // Backend-calculated relatable comparison
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
  relatableFootprint
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('green.50', 'green.900');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('green.500', 'green.400');

  // Generate relatable comparisons based on CO2e amount
  const generateComparisons = (co2eKg: number): CarbonComparison[] => {
    // Convert to different scales for better understanding
    const comparisons: CarbonComparison[] = [];

    // Driving comparison (1 kg CO2e ≈ 4 miles driving)
    const drivingMiles = Math.round(co2eKg * 4);
    if (drivingMiles > 0) {
      comparisons.push({
        icon: FaCar,
        label: 'Driving Distance',
        description: 'Miles in average car',
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
        label: 'Home Energy',
        description: days > 1 ? `${days} days electricity` : 'Less than 1 day',
        value: `${kwhEquivalent} kWh`,
        color: 'orange'
      });
    }

    // Tree absorption comparison (1 tree absorbs ~22kg CO2/year)
    const treesNeeded = Math.ceil(co2eKg / 22);
    if (treesNeeded > 0) {
      comparisons.push({
        icon: FaLeaf,
        label: 'Tree Impact',
        description: `${treesNeeded} tree${treesNeeded > 1 ? 's' : ''} for 1 year`,
        value: `${co2eKg.toFixed(1)}kg`,
        color: 'green'
      });
    }

    // Flight comparison for larger amounts
    if (co2eKg > 100) {
      const shortFlights = Math.round(co2eKg / 200); // ~200kg for short flight
      comparisons.push({
        icon: FaPlane,
        label: 'Flight Impact',
        description: `${shortFlights} short flight${shortFlights > 1 ? 's' : ''}`,
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
          label: 'Carbon Impact',
          description: relatableFootprint,
          value: `${Math.abs(totalCO2e).toFixed(1)}kg`,
          color: 'green'
        }
      ]
    : generateComparisons(Math.abs(totalCO2e));

  // Score interpretation
  const getScoreInterpretation = (score: number) => {
    if (score >= 90)
      return {
        label: 'Exceptional',
        color: 'green',
        description: 'Leading sustainability practices',
        advice: 'This product represents gold standard farming!'
      };
    if (score >= 70)
      return {
        label: 'Good',
        color: 'blue',
        description: 'Above average environmental performance',
        advice: 'Great choice for climate-conscious consumers'
      };
    if (score >= 50)
      return {
        label: 'Fair',
        color: 'yellow',
        description: 'Meeting basic sustainability standards',
        advice: 'Solid option with room for improvement'
      };
    return {
      label: 'Needs Improvement',
      color: 'red',
      description: 'High environmental impact',
      advice: 'Consider alternatives with higher scores'
    };
  };

  const scoreInfo = getScoreInterpretation(carbonScore);
  const isNegativeEmissions = totalCO2e < 0;

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
                  Carbon Negative
                </Badge>
              )}
            </HStack>
            <Text fontSize="sm" color={mutedColor}>
              {scoreInfo.description}
            </Text>
            <Text fontSize="xs" color="green.600" fontWeight="medium">
              💡 {scoreInfo.advice}
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
                Carbon Impact Explained
              </Text>
            </HStack>
            <Text fontSize="sm" color={mutedColor}>
              Understanding the environmental footprint of {productName}
            </Text>
          </VStack>

          <VStack align="end" spacing={1}>
            <HStack>
              <Text fontSize="2xl" fontWeight="bold" color={`${scoreInfo.color}.600`}>
                {Math.round(carbonScore)}
              </Text>
              <Text fontSize="sm" color={mutedColor}>
                /100
              </Text>
            </HStack>
            <Badge colorScheme={scoreInfo.color} variant="solid">
              {scoreInfo.label}
            </Badge>
          </VStack>
        </HStack>

        {/* Score Progress Bar */}
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
              Poor (0)
            </Text>
            <Text fontSize="xs" color={mutedColor}>
              Exceptional (100)
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
                Total Carbon Footprint
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
                    Carbon Stored
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
              💡 {scoreInfo.advice}
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
            {isExpanded ? 'Show Less' : 'What This Means in Real Life'}
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
                  🌍 What This Means in Real Life
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

            {/* Carbon Negative Explanation */}
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
                    Carbon Negative Farming 🎉
                  </Text>
                </HStack>
                <Text fontSize="sm" color="green.700">
                  Amazing! This product actually removes more CO₂ from the atmosphere than it
                  produces. The farming practices store carbon in soil, making this food
                  climate-positive.
                </Text>
              </Box>
            )}

            {/* Score Breakdown */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={3} color={textColor}>
                📊 How We Calculate This Score
              </Text>
              <VStack spacing={3} align="stretch">
                {[
                  {
                    label: 'Farm Operations',
                    percent: 40,
                    desc: 'Equipment, energy, soil management'
                  },
                  {
                    label: 'Transportation',
                    percent: 25,
                    desc: 'Distance and shipping efficiency'
                  },
                  { label: 'Processing', percent: 20, desc: 'Manufacturing and packaging' },
                  { label: 'Land Use', percent: 15, desc: 'Carbon storage and biodiversity' }
                ].map((item, idx) => (
                  <HStack key={idx} spacing={3}>
                    <Box minW="120px">
                      <Text fontSize="sm" fontWeight="medium">
                        {item.label}
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        {item.desc}
                      </Text>
                    </Box>
                    <Box flex="1">
                      <Progress
                        value={item.percent}
                        size="sm"
                        colorScheme="green"
                        borderRadius="full"
                      />
                    </Box>
                    <Text fontSize="sm" color={mutedColor} minW="30px">
                      {item.percent}%
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </Box>

            {/* Scientific Methodology Explanation */}
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
                  Scientific Methodologies Used
                </Text>
              </HStack>
              <VStack align="start" spacing={3}>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="purple.700">
                    IPCC 2006 Guidelines - Lime Application
                  </Text>
                  <Text fontSize="xs" color="purple.600">
                    When limestone (CaCO3) or dolomite is applied to soil for pH correction, CO2 is
                    released through chemical dissolution. We use IPCC Tier 1 emission factors:
                    limestone releases 0.44 kg CO2/kg, dolomite releases 0.477 kg CO2/kg.
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="purple.700">
                    Research-Based Tillage Emissions
                  </Text>
                  <Text fontSize="xs" color="purple.600">
                    Soil disturbance from tillage releases stored carbon. Based on peer-reviewed
                    research: shallow tillage (less than 10cm) releases ~50 kg CO2e/ha, medium depth
                    (10-25cm) releases ~150 kg CO2e/ha, and deep tillage (over 25cm) releases ~300 kg
                    CO2e/ha.
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="purple.700">
                    USDA NASS 2023 - Irrigation Water
                  </Text>
                  <Text fontSize="xs" color="purple.600">
                    Water usage is calculated using USDA National Agricultural Statistics Service
                    2023 data: approximately 27,154 gallons of water per acre per 1-inch of
                    irrigation depth. This helps estimate energy used for pumping and distribution.
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="purple.700">
                    EPA Emission Factors
                  </Text>
                  <Text fontSize="xs" color="purple.600">
                    Fuel combustion emissions use EPA verified factors: diesel releases 10.21 kg
                    CO2e per gallon, gasoline releases 8.78 kg CO2e per gallon. Grid electricity
                    emissions are based on EPA eGRID 2023 regional averages.
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
                  Why Carbon Scoring Matters
                </Text>
              </HStack>
              <Text fontSize="sm" color="blue.700" mb={2}>
                Food production accounts for 25% of global greenhouse gas emissions. By choosing
                products with higher carbon scores, you're supporting:
              </Text>
              <VStack align="start" spacing={1} pl={4}>
                <Text fontSize="sm" color="blue.700">
                  • Farmers using sustainable practices
                </Text>
                <Text fontSize="sm" color="blue.700">
                  • Soil that stores carbon long-term
                </Text>
                <Text fontSize="sm" color="blue.700">
                  • Reduced chemical inputs and waste
                </Text>
                <Text fontSize="sm" color="blue.700">
                  • Biodiversity and ecosystem health
                </Text>
              </VStack>
            </Box>
          </VStack>
        </Box>
      </Collapse>
    </Box>
  );
};

export default CarbonImpactExplainer;
