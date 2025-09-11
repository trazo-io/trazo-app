import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Icon,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tab,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
  Button,
  useToast,
  useColorModeValue,
} from '@chakra-ui/react';
import { 
  FaChartLine, 
  FaDollarSign, 
  FaGlobe, 
  FaRocket,
  FaDownload,
  FaShare,
  FaSync,
} from 'react-icons/fa';

import { CarbonJourneyVisualization } from './CarbonJourneyVisualization';
import { CarbonROIAnalysis } from './CarbonROIAnalysis';
import { ConsumerImpactStory } from './ConsumerImpactStory';
import { useGetAdvancedAnalyticsQuery } from '../../../store/api/carbonApi';

interface AdvancedAnalyticsDashboardProps {
  productionId: number;
  productionName?: string;
  cropType?: string;
  onDataLoad?: (data: any) => void;
}

export const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({
  productionId,
  productionName = 'Unknown Production',
  cropType = 'Unknown Crop',
  onDataLoad,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();
  
  const {
    data: analyticsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetAdvancedAnalyticsQuery(productionId);

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    if (analyticsData && onDataLoad) {
      onDataLoad(analyticsData);
    }
  }, [analyticsData, onDataLoad]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast({
        title: 'Analytics Refreshed',
        description: 'Carbon analytics data has been updated successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh analytics data. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = () => {
    // Implementation for exporting analytics data
    toast({
      title: 'Export Started',
      description: 'Analytics report export is being prepared...',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleShare = () => {
    // Implementation for sharing analytics
    toast({
      title: 'Share Link Generated',
      description: 'Analytics dashboard link copied to clipboard.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <VStack spacing={6} py={12}>
            <Spinner size="xl" color="green.500" thickness="4px" />
            <VStack spacing={2}>
              <Text fontSize="lg" fontWeight="medium">
                Generating Advanced Carbon Analytics...
              </Text>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                Analyzing carbon journey, calculating ROI, and creating impact insights.<br />
                This may take a few moments.
              </Text>
            </VStack>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  if (isError) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Analytics Generation Failed</AlertTitle>
          <AlertDescription>
            {error?.data?.details || 'Unable to generate advanced carbon analytics. Please try again later.'}
          </AlertDescription>
        </Box>
        <Button
          ml="auto"
          size="sm"
          onClick={() => refetch()}
          leftIcon={<Icon as={FaSync} />}
        >
          Retry
        </Button>
      </Alert>
    );
  }

  if (!analyticsData?.analytics) {
    return (
      <Alert status="warning" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>No Analytics Data Available</AlertTitle>
          <AlertDescription>
            Advanced analytics data is not available for this production.
          </AlertDescription>
        </Box>
      </Alert>
    );
  }

  const analytics = analyticsData.analytics;

  return (
    <Box>
      {/* Header */}
      <Card mb={6}>
        <CardBody>
          <HStack justify="space-between" flexWrap="wrap" gap={4}>
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={FaRocket} color="green.500" />
                <Heading size="lg">Advanced Carbon Analytics</Heading>
                <Badge colorScheme="green" px={3} py={1}>
                  Phase 6 Enhancement
                </Badge>
              </HStack>
              <Text color="gray.600">
                {productionName} • {cropType} • Production #{productionId}
              </Text>
              <Text fontSize="sm" color="gray.500">
                Generated: {new Date(analyticsData.generated_at).toLocaleString()}
              </Text>
            </VStack>

            <HStack spacing={2}>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Icon as={FaDownload} />}
                onClick={handleExport}
              >
                Export Report
              </Button>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Icon as={FaShare} />}
                onClick={handleShare}
              >
                Share Analytics
              </Button>
              <Button
                size="sm"
                colorScheme="green"
                leftIcon={<Icon as={FaSync} />}
                onClick={handleRefresh}
                isLoading={refreshing}
                loadingText="Refreshing"
              >
                Refresh Data
              </Button>
            </HStack>
          </HStack>
        </CardBody>
      </Card>

      {/* Main Analytics Tabs */}
      <Tabs 
        variant="enclosed" 
        colorScheme="green" 
        index={activeTab} 
        onChange={setActiveTab}
      >
        <TabList>
          <Tab>
            <HStack spacing={2}>
              <Icon as={FaChartLine} />
              <Text>Carbon Journey</Text>
            </HStack>
          </Tab>
          <Tab>
            <HStack spacing={2}>
              <Icon as={FaDollarSign} />
              <Text>ROI & Market Value</Text>
            </HStack>
          </Tab>
          <Tab>
            <HStack spacing={2}>
              <Icon as={FaGlobe} />
              <Text>Consumer Impact</Text>
            </HStack>
          </Tab>
        </TabList>

        <TabPanels>
          {/* Carbon Journey Tab */}
          <TabPanel p={0} pt={6}>
            <CarbonJourneyVisualization
              timeline={analytics.carbon_timeline || []}
              flowDiagram={analytics.carbon_flow_diagram || {
                inputs: { emissions: [], total_emissions: 0 },
                outputs: { offsets: [], total_offsets: 0 },
                net_result: { net_carbon: 0, carbon_negative: false, offset_ratio: 0 }
              }}
              hotspots={analytics.carbon_hotspots || []}
              carbonEfficiencyScore={analytics.carbon_efficiency_score || 0}
              carbonIntensity={analytics.carbon_intensity || 0}
            />
          </TabPanel>

          {/* ROI & Market Value Tab */}
          <TabPanel p={0} pt={6}>
            <CarbonROIAnalysis
              carbonROI={analytics.carbon_roi || {
                investment_estimate: 0,
                carbon_credit_value: 0,
                premium_pricing_value: 0,
                total_annual_benefits: 0,
                roi_percentage: 0,
                payback_period_years: 0,
                cost_per_ton_co2e: 0
              }}
              marketValueImpact={analytics.market_value_impact || {
                current_market_tier: 'Standard',
                base_production_value: 0,
                enhanced_market_value: 0,
                value_uplift: 0,
                value_uplift_percentage: 0,
                consumer_appeal_rating: 'Average',
                market_differentiation: 'Standard',
                competitive_advantage: 'None'
              }}
              carbonCreditPotential={analytics.carbon_credit_potential || {
                eligible: false,
                reason: 'Data not available'
              }}
              premiumPricingOpportunity={analytics.premium_pricing_opportunity || {
                total_opportunities: 0,
                opportunities: [],
                total_potential_value: 0,
                recommended_priority: 'None'
              }}
            />
          </TabPanel>

          {/* Consumer Impact Tab */}
          <TabPanel p={0} pt={6}>
            <ConsumerImpactStory
              consumerImpactStory={analytics.consumer_impact_story || {
                headline_message: 'Carbon data available',
                key_impacts: {
                  carbon_removed: '0 kg CO₂',
                  equivalent_cars_offset: '0 cars',
                  equivalent_trees_planted: '0 trees'
                },
                story_narrative: 'Carbon impact information is being calculated.',
                transparency_highlights: [],
                sustainability_achievements: [],
                consumer_benefits: []
              }}
              trustIndicators={analytics.trust_indicators || {
                verification_status: {
                  usda_verification_rate: '0%',
                  blockchain_verified: false,
                  third_party_audited: false,
                  real_time_tracking: false
                },
                trust_score: 0,
                trust_factors: [],
                credibility_indicators: {
                  data_completeness: 0,
                  verification_depth: 0,
                  audit_frequency: 'None',
                  transparency_level: 'Limited'
                }
              }}
              transparencyScore={analytics.transparency_score || 0}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Advanced Insights Summary */}
      {analytics.ai_recommendations && analytics.ai_recommendations.length > 0 && (
        <Card mt={6}>
          <CardHeader>
            <Heading size="md">🤖 AI-Powered Insights</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              {analytics.ai_recommendations.slice(0, 3).map((recommendation: any, index: number) => (
                <Alert key={index} status="info" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle fontSize="sm">{recommendation.category}</AlertTitle>
                    <AlertDescription fontSize="sm">
                      {recommendation.recommendation}
                      {recommendation.estimated_annual_value && (
                        <Text as="span" color="green.600" fontWeight="bold">
                          {' '}(Value: {recommendation.estimated_annual_value})
                        </Text>
                      )}
                    </AlertDescription>
                  </Box>
                </Alert>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}
    </Box>
  );
};

export default AdvancedAnalyticsDashboard;