import React, { useState, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Collapse,
  Button,
  SimpleGrid,
  Progress,
  Badge,
  useColorModeValue,
  Flex,
  Divider,
  Icon,
  Skeleton,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';
import {
  FaChevronDown,
  FaChevronUp,
  FaIndustry,
  FaLeaf,
  FaTruck,
  FaChartPie,
  FaLightbulb,
  FaDollarSign
} from 'react-icons/fa';
import { MdFactCheck, MdTrendingUp } from 'react-icons/md';
import { StandardMetricCard, ConsumerTooltip } from '../Design/StandardComponents';

interface CarbonAnalysisExpandableProps {
  carbonScopeData:
    | {
        establishment_id: string;
        scope_breakdown: {
          scope_1: {
            total: number;
            categories: Record<string, number>;
            percentage: number;
          };
          scope_2: {
            total: number;
            categories: Record<string, number>;
            percentage: number;
          };
          scope_3: {
            total: number;
            categories: Record<string, number>;
            percentage: number;
          };
        };
        carbon_intensity_metrics: {
          per_hectare: number;
          per_kg_product: number;
          industry_comparison: {
            percentile: number;
            benchmark: number;
          };
        };
        improvement_opportunities: Array<{
          scope: 'scope_1' | 'scope_2' | 'scope_3';
          category: string;
          potential_reduction: number;
          implementation_cost: 'low' | 'medium' | 'high';
          roi_estimate: string;
        }>;
        generated_at: string;
      }
    | null
    | undefined;
  carbonSummary:
    | {
        total_emissions: number;
        total_offsets: number;
        net_carbon: number;
        carbon_intensity: number;
      }
    | undefined;
  isLoading?: boolean;
  isMobile?: boolean;
}

export const CarbonAnalysisExpandable: React.FC<CarbonAnalysisExpandableProps> = ({
  carbonScopeData,
  carbonSummary,
  isLoading = false,
  isMobile = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('green.500', 'green.400');

  // Memoized processed data
  const processedData = useMemo(() => {
    if (!carbonScopeData || !carbonSummary) return null;

    const scopes = carbonScopeData.scope_breakdown;
    const totalEmissions = scopes.scope_1.total + scopes.scope_2.total + scopes.scope_3.total;

    return {
      totalEmissions,
      scopeData: [
        {
          id: 'scope_1',
          name: 'Direct Emissions',
          description: 'On-farm fuel, equipment, and livestock',
          total: scopes.scope_1.total,
          percentage: (scopes.scope_1.total / totalEmissions) * 100,
          categories: scopes.scope_1.categories,
          color: 'red',
          icon: FaIndustry
        },
        {
          id: 'scope_2',
          name: 'Energy Emissions',
          description: 'Purchased electricity and heating',
          total: scopes.scope_2.total,
          percentage: (scopes.scope_2.total / totalEmissions) * 100,
          categories: scopes.scope_2.categories,
          color: 'orange',
          icon: FaLightbulb
        },
        {
          id: 'scope_3',
          name: 'Indirect Emissions',
          description: 'Supply chain, transport, and waste',
          total: scopes.scope_3.total,
          percentage: (scopes.scope_3.total / totalEmissions) * 100,
          categories: scopes.scope_3.categories,
          color: 'blue',
          icon: FaTruck
        }
      ],
      industryComparison: carbonScopeData.carbon_intensity_metrics.industry_comparison,
      improvements: carbonScopeData.improvement_opportunities.slice(0, 3), // Show top 3
      carbonIntensity: carbonScopeData.carbon_intensity_metrics
    };
  }, [carbonScopeData, carbonSummary]);

  const formatCarbonValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}t CO2e`;
    }
    return `${value.toFixed(1)} kg CO2e`;
  };

  const getCostColor = (cost: 'low' | 'medium' | 'high') => {
    switch (cost) {
      case 'low':
        return 'green';
      case 'medium':
        return 'yellow';
      case 'high':
        return 'red';
      default:
        return 'gray';
    }
  };

  if (isLoading) {
    return (
      <VStack spacing={4}>
        <Skeleton height="60px" borderRadius="lg" />
        <Skeleton height="40px" borderRadius="lg" />
      </VStack>
    );
  }

  if (!processedData) {
    return (
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Text fontSize="sm">
          Carbon analysis data will be available once more agricultural events are logged.
        </Text>
      </Alert>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {/* Summary View - Always Visible */}
      <SimpleGrid columns={isMobile ? 2 : 3} spacing={4}>
        <StandardMetricCard
          icon={FaChartPie}
          iconColor="red.600"
          iconBg="red.100"
          value={formatCarbonValue(processedData.totalEmissions)}
          label="Total Emissions"
          size={isMobile ? 'sm' : 'md'}
          tooltip={{
            label: 'Total Carbon Footprint',
            explanation: 'Combined emissions from all sources across your operations'
          }}
        />

        <StandardMetricCard
          icon={MdFactCheck}
          iconColor="blue.600"
          iconBg="blue.100"
          value={`${processedData.industryComparison.percentile}th`}
          label="Industry Percentile"
          subtitle="Lower is better"
          size={isMobile ? 'sm' : 'md'}
          colorScheme={
            processedData.industryComparison.percentile <= 25
              ? 'green'
              : processedData.industryComparison.percentile <= 50
              ? 'yellow'
              : 'red'
          }
        />

        <StandardMetricCard
          icon={FaLeaf}
          iconColor="green.600"
          iconBg="green.100"
          value={processedData.improvements.length}
          label="Improvement Opportunities"
          subtitle="Click to expand"
          size={isMobile ? 'sm' : 'md'}
        />
      </SimpleGrid>

      {/* Expand/Collapse Button - Enhanced for mobile touch */}
      <Flex justify="center">
        <Button
          variant="outline"
          colorScheme="green"
          onClick={() => setIsExpanded(!isExpanded)}
          leftIcon={<Icon as={isExpanded ? FaChevronUp : FaChevronDown} />}
          size={isMobile ? 'md' : 'md'} // Ensure adequate touch target
          minHeight={isMobile ? '44px' : 'auto'} // 44px minimum touch target
          px={isMobile ? 6 : 4} // More horizontal padding on mobile
          borderRadius="full"
          _hover={{
            transform: isMobile ? 'none' : 'translateY(-1px)',
            boxShadow: isMobile ? 'none' : 'md'
          }}
          _active={{
            transform: 'scale(0.98)' // Better mobile feedback
          }}
        >
          {isExpanded
            ? isMobile
              ? 'Hide Details'
              : 'Hide Details'
            : isMobile
            ? 'View Analysis'
            : 'View Carbon Analysis'}
        </Button>
      </Flex>

      {/* Detailed Analysis - Progressive Disclosure */}
      <Collapse in={isExpanded} animateOpacity>
        <VStack spacing={6} align="stretch">
          <Divider />

          <Tabs index={activeTab} onChange={setActiveTab} colorScheme="green" isFitted={isMobile}>
            <TabList>
              <Tab
                fontSize={isMobile ? 'xs' : 'sm'}
                minHeight={isMobile ? '44px' : 'auto'} // Touch target
                px={isMobile ? 2 : 4}
              >
                {isMobile ? 'Scopes' : 'Scope Breakdown'}
              </Tab>
              <Tab
                fontSize={isMobile ? 'xs' : 'sm'}
                minHeight={isMobile ? '44px' : 'auto'}
                px={isMobile ? 2 : 4}
              >
                {isMobile ? 'Industry' : 'Industry Comparison'}
              </Tab>
              <Tab
                fontSize={isMobile ? 'xs' : 'sm'}
                minHeight={isMobile ? '44px' : 'auto'}
                px={isMobile ? 2 : 4}
              >
                Improvements
              </Tab>
            </TabList>

            <TabPanels>
              {/* Scope Breakdown Tab */}
              <TabPanel px={0}>
                <VStack spacing={4} align="stretch">
                  {processedData.scopeData.map((scope) => (
                    <Box
                      key={scope.id}
                      p={4}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor={borderColor}
                    >
                      <VStack spacing={3} align="stretch">
                        <HStack justify="space-between">
                          <HStack spacing={3}>
                            <Icon as={scope.icon} color={`${scope.color}.500`} boxSize={5} />
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="semibold" color={textColor}>
                                {scope.name}
                              </Text>
                              <Text fontSize="sm" color={mutedColor}>
                                {scope.description}
                              </Text>
                            </VStack>
                          </HStack>
                          <VStack align="end" spacing={0}>
                            <Text fontWeight="bold" color={`${scope.color}.500`}>
                              {formatCarbonValue(scope.total)}
                            </Text>
                            <Text fontSize="sm" color={mutedColor}>
                              {scope.percentage.toFixed(1)}%
                            </Text>
                          </VStack>
                        </HStack>

                        <Progress
                          value={scope.percentage}
                          colorScheme={scope.color}
                          borderRadius="full"
                          bg="gray.100"
                        />

                        {/* Category Breakdown */}
                        {Object.keys(scope.categories).length > 0 && (
                          <SimpleGrid columns={isMobile ? 1 : 2} spacing={2}>
                            {Object.entries(scope.categories).map(([category, value]) => (
                              <HStack key={category} justify="space-between" fontSize="sm">
                                <Text color={mutedColor} textTransform="capitalize">
                                  {category.replace('_', ' ')}
                                </Text>
                                <Text fontWeight="medium" color={textColor}>
                                  {formatCarbonValue(value)}
                                </Text>
                              </HStack>
                            ))}
                          </SimpleGrid>
                        )}
                      </VStack>
                    </Box>
                  ))}
                </VStack>
              </TabPanel>

              {/* Industry Comparison Tab */}
              <TabPanel px={0}>
                <VStack spacing={4} align="stretch">
                  <Box
                    p={4}
                    borderRadius="lg"
                    bg={useColorModeValue('blue.50', 'blue.900')}
                    border="1px solid"
                    borderColor="blue.200"
                  >
                    <VStack spacing={3}>
                      <Icon as={MdTrendingUp} color="blue.500" boxSize={8} />
                      <VStack spacing={1}>
                        <Heading size="md" color="blue.700">
                          {processedData.industryComparison.percentile}th Percentile
                        </Heading>
                        <Text fontSize="sm" color="blue.600" textAlign="center">
                          Your farm performs better than{' '}
                          {100 - processedData.industryComparison.percentile}% of similar operations
                        </Text>
                      </VStack>
                    </VStack>
                  </Box>

                  <SimpleGrid columns={isMobile ? 1 : 2} spacing={4}>
                    <StandardMetricCard
                      icon={FaChartPie}
                      iconColor="blue.600"
                      iconBg="blue.100"
                      value={processedData.carbonIntensity.per_hectare.toFixed(1)}
                      label="CO2e per Hectare"
                      subtitle={`Benchmark: ${processedData.industryComparison.benchmark.toFixed(
                        1
                      )}`}
                      size="md"
                    />

                    <StandardMetricCard
                      icon={FaLeaf}
                      iconColor="green.600"
                      iconBg="green.100"
                      value={processedData.carbonIntensity.per_kg_product.toFixed(2)}
                      label="CO2e per kg Product"
                      subtitle="Industry average: 2.1"
                      size="md"
                    />
                  </SimpleGrid>
                </VStack>
              </TabPanel>

              {/* Improvements Tab */}
              <TabPanel px={0}>
                <VStack spacing={4} align="stretch">
                  {processedData.improvements.map((improvement, index) => (
                    <Box
                      key={index}
                      p={4}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor={borderColor}
                    >
                      <HStack justify="space-between" align="start" spacing={4}>
                        <VStack align="start" spacing={2} flex={1}>
                          <HStack spacing={2}>
                            <Badge
                              colorScheme={getCostColor(improvement.implementation_cost)}
                              variant="solid"
                            >
                              {improvement.implementation_cost} cost
                            </Badge>
                            <Badge variant="outline">{improvement.scope.replace('_', ' ')}</Badge>
                          </HStack>

                          <Text fontWeight="semibold" color={textColor}>
                            {improvement.category
                              .replace('_', ' ')
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Text>

                          <HStack spacing={4}>
                            <ConsumerTooltip
                              label="Potential Reduction"
                              explanation="Estimated annual carbon emissions that could be reduced"
                            >
                              <HStack spacing={1} cursor="help">
                                <Icon as={FaLeaf} color="green.500" boxSize={3} />
                                <Text fontSize="sm" color="green.500" fontWeight="medium">
                                  -{formatCarbonValue(improvement.potential_reduction)}
                                </Text>
                              </HStack>
                            </ConsumerTooltip>

                            <ConsumerTooltip
                              label="ROI Estimate"
                              explanation="Expected return on investment timeline"
                            >
                              <HStack spacing={1} cursor="help">
                                <Icon as={FaDollarSign} color="blue.500" boxSize={3} />
                                <Text fontSize="sm" color="blue.500" fontWeight="medium">
                                  {improvement.roi_estimate}
                                </Text>
                              </HStack>
                            </ConsumerTooltip>
                          </HStack>
                        </VStack>
                      </HStack>
                    </Box>
                  ))}

                  {processedData.improvements.length === 0 && (
                    <Box textAlign="center" py={8}>
                      <Icon as={FaLeaf} color="green.500" boxSize={8} mb={2} />
                      <Text color={mutedColor}>
                        Great job! No immediate improvement opportunities identified.
                      </Text>
                    </Box>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Collapse>
    </VStack>
  );
};

export default CarbonAnalysisExpandable;
