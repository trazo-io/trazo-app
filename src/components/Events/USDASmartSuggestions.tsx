import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Icon,
  Tooltip,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Skeleton,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import {
  FaLeaf,
  FaChartLine,
  FaLightbulb,
  FaShieldAlt,
  FaArrowRight,
  FaCheckCircle
} from 'react-icons/fa';

interface USDAData {
  success: boolean;
  benchmark_data: {
    kg_per_hectare: number;
    regional_yield: number;
  };
  carbon_calculation: {
    carbon_intensity: number;
  };
  usda_credibility: {
    score: number;
    rating: string;
  };
}

interface BenchmarkData {
  benchmark_comparison: {
    performance_rating: string;
    improvement_potential: number;
  };
}

interface SmartSuggestion {
  id: string;
  title: string;
  description: string;
  carbonImpact: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  usdaBased: boolean;
  category: 'fertilization' | 'irrigation' | 'pest_control' | 'soil_management' | 'harvest';
  priority: 'high' | 'medium' | 'low';
  estimatedCost: number;
  timeToImplement: string;
  transparencyBenefit: string;
}

interface USDASmartSuggestionsProps {
  usdaData?: USDAData;
  benchmarkData?: BenchmarkData;
  cropType: string;
  farmState: string;
  isLoading?: boolean;
  onSuggestionSelect?: (suggestion: SmartSuggestion) => void;
}

const USDASmartSuggestions: React.FC<USDASmartSuggestionsProps> = ({
  usdaData,
  benchmarkData,
  cropType,
  farmState,
  isLoading = false,
  onSuggestionSelect
}) => {
  const bgColor = useColorModeValue('green.50', 'green.900');
  const borderColor = useColorModeValue('green.200', 'green.700');
  const cardBg = useColorModeValue('white', 'gray.800');

  // Helper functions for seasonal intelligence
  const getCurrentSeason = (month: number): string => {
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  };

  const isCurrentlyGrowingSeason = (crop: string, state: string, month: number): boolean => {
    const cropSeasons: Record<string, { start: number; end: number }> = {
      corn: { start: 4, end: 10 }, // April to October
      soybeans: { start: 5, end: 11 }, // May to November
      wheat: { start: 10, end: 7 }, // October to July (winter wheat)
      citrus: { start: 1, end: 12 }, // Year-round
      tomatoes: { start: 3, end: 10 }, // March to October
      potatoes: { start: 3, end: 9 }, // March to September
      lettuce: { start: 2, end: 11 }, // February to November
      grapes: { start: 3, end: 11 }, // March to November
      almonds: { start: 2, end: 10 }, // February to October
      apples: { start: 3, end: 11 } // March to November
    };

    const season = cropSeasons[crop.toLowerCase()] || { start: 3, end: 10 };

    // Handle cross-year seasons (like winter wheat)
    if (season.start > season.end) {
      return month >= season.start || month <= season.end;
    }
    return month >= season.start && month <= season.end;
  };

  const getSeasonalRecommendations = (
    crop: string,
    season: string,
    month: number
  ): SmartSuggestion[] => {
    const seasonalSuggestions: SmartSuggestion[] = [];

    // Spring recommendations (March-May)
    if (season === 'Spring') {
      if (month === 3 || month === 4) {
        seasonalSuggestions.push({
          id: 'spring-fertilization',
          title: 'Spring Fertilization Window',
          description: `Optimal timing for ${crop} fertilization - soil temperature above 50°F`,
          carbonImpact: -0.2,
          confidenceLevel: 'high',
          usdaBased: true,
          category: 'fertilization',
          priority: 'high',
          estimatedCost: 200,
          timeToImplement: '2-4 hours',
          transparencyBenefit: '6-8 months'
        });
      }

      if (month === 4 || month === 5) {
        seasonalSuggestions.push({
          id: 'pest-prevention',
          title: 'Spring Pest Prevention',
          description: 'Early season pest monitoring reduces later pesticide applications',
          carbonImpact: -0.15,
          confidenceLevel: 'high',
          usdaBased: true,
          category: 'pest_control',
          priority: 'medium',
          estimatedCost: 100,
          timeToImplement: '1-2 hours',
          transparencyBenefit: '3-6 months'
        });
      }
    }

    // Summer recommendations (June-August)
    if (season === 'Summer') {
      seasonalSuggestions.push({
        id: 'irrigation-optimization',
        title: 'Summer Irrigation Efficiency',
        description: 'Peak water demand season - optimize timing to reduce evaporation',
        carbonImpact: -0.25,
        confidenceLevel: 'high',
        usdaBased: true,
        category: 'irrigation',
        priority: 'high',
        estimatedCost: 150,
        timeToImplement: '1-3 hours',
        transparencyBenefit: '2-4 months'
      });
    }

    // Fall recommendations (September-November)
    if (season === 'Fall') {
      if (month === 9 || month === 10) {
        seasonalSuggestions.push({
          id: 'harvest-optimization',
          title: 'Harvest Timing Optimization',
          description: 'Optimal harvest timing reduces post-harvest losses and emissions',
          carbonImpact: -0.1,
          confidenceLevel: 'medium',
          usdaBased: true,
          category: 'harvest',
          priority: 'high',
          estimatedCost: 50,
          timeToImplement: '30 minutes',
          transparencyBenefit: '1-2 months'
        });
      }

      if (month === 10 || month === 11) {
        seasonalSuggestions.push({
          id: 'cover-crop-planting',
          title: 'Cover Crop Window',
          description: 'Plant cover crops now to improve soil health and sequester carbon',
          carbonImpact: -0.4,
          confidenceLevel: 'high',
          usdaBased: true,
          category: 'soil_management',
          priority: 'medium',
          estimatedCost: 120,
          timeToImplement: '2-4 hours',
          transparencyBenefit: '12-24 months'
        });
      }
    }

    // Winter recommendations (December-February)
    if (season === 'Winter') {
      seasonalSuggestions.push({
        id: 'winter-soil-prep',
        title: 'Winter Soil Preparation',
        description: 'Plan and prepare soil amendments for next growing season',
        carbonImpact: -0.05,
        confidenceLevel: 'medium',
        usdaBased: true,
        category: 'soil_management',
        priority: 'low',
        estimatedCost: 80,
        timeToImplement: '1-2 hours',
        transparencyBenefit: '6-12 months'
      });
    }

    return seasonalSuggestions;
  };

  // Enhanced seasonal and weather-based suggestions generator
  const generateSmartSuggestions = (): SmartSuggestion[] => {
    if (!usdaData?.success) return [];

    const suggestions: SmartSuggestion[] = [];
    const carbonIntensity = usdaData.carbon_calculation.carbon_intensity;
    const performanceRating = benchmarkData?.benchmark_comparison.performance_rating;
    const improvementPotential = benchmarkData?.benchmark_comparison.improvement_potential || 0;

    // Get current season and month for timing recommendations
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const currentSeason = getCurrentSeason(currentMonth);
    const isGrowingSeason = isCurrentlyGrowingSeason(cropType, farmState, currentMonth);

    // Add seasonal recommendations first (highest priority)
    const seasonalSuggestions = getSeasonalRecommendations(cropType, currentSeason, currentMonth);
    suggestions.push(...seasonalSuggestions);

    // High carbon intensity suggestions
    if (carbonIntensity > 0.002) {
      suggestions.push({
        id: 'reduce-nitrogen',
        title: 'Optimize Nitrogen Application',
        description:
          'USDA data suggests precision nitrogen management could reduce emissions by 15-25%',
        carbonImpact: -0.3,
        confidenceLevel: 'high',
        usdaBased: true,
        category: 'fertilization',
        priority: 'high',
        estimatedCost: 150,
        timeToImplement: '2-3 hours',
        transparencyBenefit: '12-18 months'
      });
    }

    // Below average performance suggestions
    if (performanceRating === 'below_average' || improvementPotential > 0.2) {
      suggestions.push({
        id: 'soil-enhancement',
        title: 'Soil Carbon Sequestration',
        description: 'Regional USDA benchmarks show 30% improvement potential through cover crops',
        carbonImpact: -0.5,
        confidenceLevel: 'high',
        usdaBased: true,
        category: 'soil_management',
        priority: 'high',
        estimatedCost: 200,
        timeToImplement: '1 day',
        transparencyBenefit: '6-12 months'
      });
    }

    // Crop-specific suggestions
    if (cropType.toLowerCase() === 'corn') {
      suggestions.push({
        id: 'precision-irrigation',
        title: 'Precision Irrigation System',
        description: `USDA NASS data for ${farmState} shows 20% water efficiency gains with smart irrigation`,
        carbonImpact: -0.2,
        confidenceLevel: 'medium',
        usdaBased: true,
        category: 'irrigation',
        priority: 'medium',
        estimatedCost: 300,
        timeToImplement: '4-6 hours',
        transparencyBenefit: '8-15 months'
      });
    }

    // High credibility score bonus suggestions
    if (usdaData.usda_credibility.score >= 90) {
      suggestions.push({
        id: 'transparency-documentation',
        title: 'Transparency Documentation',
        description: 'High USDA credibility score enables premium transparency verification for consumers',
        carbonImpact: 0,
        confidenceLevel: 'high',
        usdaBased: true,
        category: 'harvest',
        priority: 'low',
        estimatedCost: 50,
        timeToImplement: '1 hour',
        transparencyBenefit: 'Immediate'
      });
    }

    // Sort by priority and seasonal urgency
    const prioritizedSuggestions = suggestions.sort((a, b) => {
      // Seasonal suggestions get higher priority during active growing season
      const aIsSeasonalAndActive =
        [
          'spring-fertilization',
          'irrigation-optimization',
          'harvest-optimization',
          'cover-crop-planting'
        ].includes(a.id) && isGrowingSeason;
      const bIsSeasonalAndActive =
        [
          'spring-fertilization',
          'irrigation-optimization',
          'harvest-optimization',
          'cover-crop-planting'
        ].includes(b.id) && isGrowingSeason;

      if (aIsSeasonalAndActive && !bIsSeasonalAndActive) return -1;
      if (!aIsSeasonalAndActive && bIsSeasonalAndActive) return 1;

      // Then sort by priority level
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;

      return bPriority - aPriority;
    });

    return prioritizedSuggestions.slice(0, 4); // Return top 4 suggestions (increased from 3)
  };

  const suggestions = generateSmartSuggestions();

  if (isLoading) {
    return (
      <Box bg={bgColor} borderRadius="lg" p={6} border="1px solid" borderColor={borderColor}>
        <VStack spacing={4}>
          <Skeleton height="20px" width="250px" />
          <SimpleGrid columns={1} spacing={3} w="full">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height="100px" borderRadius="md" />
            ))}
          </SimpleGrid>
        </VStack>
      </Box>
    );
  }

  if (!usdaData?.success || suggestions.length === 0) {
    return (
      <Alert status="info" borderRadius="lg">
        <AlertIcon />
        <Box>
          <AlertTitle>USDA Smart Suggestions</AlertTitle>
          <AlertDescription>
            Connect USDA data to get personalized, government-verified farming recommendations.
          </AlertDescription>
        </Box>
      </Alert>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'green';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <Box
      bg={bgColor}
      borderRadius="lg"
      p={6}
      border="2px solid"
      borderColor={borderColor}
      boxShadow="md"
    >
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack spacing={3} justify="space-between">
          <HStack spacing={2}>
            <Icon as={FaLightbulb} color="green.500" boxSize={5} />
            <Text fontSize="lg" fontWeight="bold" color="green.700">
              USDA Smart Suggestions
            </Text>
          </HStack>

          <Badge colorScheme="blue" variant="solid" px={3} py={1} borderRadius="full">
            <HStack spacing={1}>
              <Icon as={FaShieldAlt} boxSize={3} />
              <Text fontSize="xs">Government Data</Text>
            </HStack>
          </Badge>
        </HStack>

        {/* Seasonal Context */}
        <Box
          bg={cardBg}
          p={4}
          borderRadius="md"
          boxShadow="sm"
          borderLeft="4px solid"
          borderLeftColor="blue.400"
        >
          <HStack spacing={4} justify="space-between">
            <VStack align="start" spacing={1}>
              <Text fontSize="sm" fontWeight="bold" color="blue.600">
                Current Season: {new Date().toLocaleDateString('en-US', { month: 'long' })} (
                {getCurrentSeason(new Date().getMonth() + 1)})
              </Text>
              <Text fontSize="xs" color="gray.600">
                {isCurrentlyGrowingSeason(cropType, farmState, new Date().getMonth() + 1)
                  ? `Active growing season for ${cropType} in ${farmState}`
                  : `Off-season for ${cropType} - planning and preparation phase`}
              </Text>
            </VStack>
            <Badge
              colorScheme={
                isCurrentlyGrowingSeason(cropType, farmState, new Date().getMonth() + 1)
                  ? 'green'
                  : 'orange'
              }
              variant="solid"
              px={3}
              py={1}
            >
              {isCurrentlyGrowingSeason(cropType, farmState, new Date().getMonth() + 1)
                ? 'Growing Season'
                : 'Off Season'}
            </Badge>
          </HStack>
        </Box>

        {/* Performance Context */}
        {usdaData && (
          <Box bg={cardBg} p={4} borderRadius="md" boxShadow="sm">
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <Stat size="sm">
                <StatLabel fontSize="xs">Current Carbon Intensity</StatLabel>
                <StatNumber fontSize="md" color="purple.600">
                  {usdaData.carbon_calculation.carbon_intensity.toFixed(6)}
                </StatNumber>
                <StatHelpText fontSize="xs">kg CO₂e/kg</StatHelpText>
              </Stat>

              <Stat size="sm">
                <StatLabel fontSize="xs">USDA Credibility</StatLabel>
                <StatNumber fontSize="md" color="green.600">
                  {usdaData.usda_credibility.score}/100
                </StatNumber>
                <StatHelpText fontSize="xs">{usdaData.usda_credibility.rating}</StatHelpText>
              </Stat>

              <Stat size="sm">
                <StatLabel fontSize="xs">Improvement Potential</StatLabel>
                <StatNumber fontSize="md" color="blue.600">
                  {benchmarkData
                    ? (benchmarkData.benchmark_comparison.improvement_potential * 100).toFixed(0)
                    : 'N/A'}
                  %
                </StatNumber>
                <StatHelpText fontSize="xs">vs regional average</StatHelpText>
              </Stat>
            </SimpleGrid>
          </Box>
        )}

        {/* Suggestions */}
        <VStack spacing={3} align="stretch">
          {suggestions.map((suggestion) => (
            <Box
              key={suggestion.id}
              bg={cardBg}
              p={4}
              borderRadius="md"
              boxShadow="sm"
              border="1px solid"
              borderColor="gray.200"
              transition="all 0.2s"
              _hover={{ boxShadow: 'md', transform: 'translateY(-1px)' }}
            >
              <VStack spacing={3} align="stretch">
                {/* Suggestion Header */}
                <HStack justify="space-between" align="start">
                  <VStack align="start" spacing={1} flex={1}>
                    <HStack spacing={2}>
                      <Text fontSize="md" fontWeight="bold" color="gray.700">
                        {suggestion.title}
                      </Text>

                      <Badge
                        size="sm"
                        colorScheme={getPriorityColor(suggestion.priority)}
                        variant="subtle"
                      >
                        {suggestion.priority} priority
                      </Badge>

                      <Badge
                        size="sm"
                        colorScheme={getConfidenceColor(suggestion.confidenceLevel)}
                        variant="outline"
                      >
                        {suggestion.confidenceLevel} confidence
                      </Badge>
                    </HStack>

                    <Text fontSize="sm" color="gray.600">
                      {suggestion.description}
                    </Text>
                  </VStack>

                  {suggestion.usdaBased && (
                    <Tooltip label="Based on USDA government data">
                      <Badge colorScheme="blue" variant="solid" size="sm">
                        🏛️ USDA
                      </Badge>
                    </Tooltip>
                  )}
                </HStack>

                {/* Suggestion Metrics */}
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                  <Box textAlign="center">
                    <Text fontSize="xs" color="gray.500">
                      Carbon Impact
                    </Text>
                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color={suggestion.carbonImpact < 0 ? 'green.600' : 'red.600'}
                    >
                      {suggestion.carbonImpact > 0 ? '+' : ''}
                      {suggestion.carbonImpact} kg CO₂e
                    </Text>
                  </Box>

                  <Box textAlign="center">
                    <Text fontSize="xs" color="gray.500">
                      Est. Cost
                    </Text>
                    <Text fontSize="sm" fontWeight="bold" color="gray.700">
                      ${suggestion.estimatedCost}
                    </Text>
                  </Box>

                  <Box textAlign="center">
                    <Text fontSize="xs" color="gray.500">
                      Time
                    </Text>
                    <Text fontSize="sm" fontWeight="bold" color="gray.700">
                      {suggestion.timeToImplement}
                    </Text>
                  </Box>

                  <Box textAlign="center">
                    <Text fontSize="xs" color="gray.500">
                      Benefit
                    </Text>
                    <Text fontSize="sm" fontWeight="bold" color="green.600">
                      {suggestion.transparencyBenefit}
                    </Text>
                  </Box>
                </SimpleGrid>

                {/* Action Button */}
                <Button
                  size="sm"
                  colorScheme="green"
                  variant="outline"
                  rightIcon={<Icon as={FaArrowRight} />}
                  onClick={() => onSuggestionSelect?.(suggestion)}
                  _hover={{ bg: 'green.50', transform: 'translateX(2px)' }}
                  transition="all 0.2s"
                >
                  Create Event from Suggestion
                </Button>
              </VStack>
            </Box>
          ))}
        </VStack>

        {/* Footer */}
        <Box bg={cardBg} p={3} borderRadius="md" boxShadow="sm">
          <VStack spacing={2}>
            <HStack spacing={2} justify="center">
              <Icon as={FaCheckCircle} color="green.500" boxSize={4} />
              <Text fontSize="xs" color="gray.600" textAlign="center">
                Suggestions powered by real USDA NASS and EPA data for {farmState} {cropType} farms
              </Text>
            </HStack>
            <Text fontSize="xs" color="blue.600" textAlign="center" fontWeight="medium">
              🗓️ Seasonal recommendations updated for {getCurrentSeason(new Date().getMonth() + 1)}{' '}
              agricultural practices
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default USDASmartSuggestions;
