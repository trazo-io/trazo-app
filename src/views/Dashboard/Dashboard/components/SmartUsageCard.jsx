/**
 * SmartUsageCard - Transparency-first dashboard insights card
 *
 * Shows 3 key metrics aligned with Trazo's mission:
 * 1. Consumer Reach (unique consumers viewing farm transparency)
 * 2. Transparency Score (documentation completeness, A+ to D grade)
 * 3. Documented Events (total farming events logged)
 *
 * Dynamic insight header changes based on farm performance.
 * Monthly Impact section shows concrete, actionable numbers.
 */

import {
  Box,
  Button,
  CircularProgress,
  Flex,
  Icon,
  Text,
  VStack,
  HStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tooltip,
  SimpleGrid,
  Badge,
  Circle,
  useColorModeValue
} from '@chakra-ui/react';

import { BsShield, BsLightning } from 'react-icons/bs';
import {
  FaChartLine,
  FaCrown,
  FaLeaf,
  FaMedal
} from 'react-icons/fa';
import { MdTrendingUp } from 'react-icons/md';
import Card from 'components/Card/Card';
import React from 'react';
import { useIntl } from 'react-intl';
import { useGetFarmDashboardMetricsQuery } from 'store/api/dashboardMetricsApi';

const SmartUsageCard = ({
  companyId,
  farmId,
  onViewAnalytics = () => {},
  onUpgradeSubscription = () => {},
  onOptimizeCarbon = () => {},
  onShareTransparency = () => {}
}) => {
  const intl = useIntl();

  const {
    data: dashboardResponse,
    isLoading,
    error
  } = useGetFarmDashboardMetricsQuery(
    { companyId, farmId },
    {
      skip: !companyId || !farmId,
      pollingInterval: 10 * 60 * 1000, // 10 minutes
      refetchOnMountOrArgChange: 300 // 5 minutes
    }
  );

  const metrics = dashboardResponse?.metrics || null;

  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'white');
  const subtitleColor = useColorModeValue('gray.500', 'gray.300');
  const accentColor = useColorModeValue('green.500', 'green.400');
  const successColor = useColorModeValue('green.500', 'green.400');
  const premiumColor = useColorModeValue('green.600', 'green.500');
  const gradientBg = useColorModeValue(
    'linear(to-r, green.50, blue.50)',
    'linear(to-r, green.900, blue.900)'
  );
  const statBg = useColorModeValue('gray.50', 'gray.600');

  const getSmartInsights = () => {
    if (!metrics) return getDefaultInsight();

    const isHighEngagement = metrics.monthly_scans > 1000;
    const isTopPerformer = metrics.transparency_percentile > 75;
    const isGrowingFast = metrics.scan_growth_percentage > 25;

    if (isHighEngagement && isTopPerformer && isGrowingFast) {
      return {
        status: intl.formatMessage({ id: 'dashboard.exceptionalPerformance' }),
        insight: intl.formatMessage({ id: 'dashboard.exceptionalInsight' }),
        action: intl.formatMessage({ id: 'dashboard.viewConsumerImpact' }),
        actionIcon: FaChartLine,
        actionColor: successColor,
        priority: 'celebration'
      };
    }

    if (isHighEngagement && metrics.transparency_score < 70) {
      return {
        status: intl.formatMessage({ id: 'dashboard.highDemandOpportunity' }),
        insight: intl.formatMessage({ id: 'dashboard.highDemandInsight' }),
        action: intl.formatMessage({ id: 'dashboard.documentMoreEvents' }),
        actionIcon: FaLeaf,
        actionColor: successColor,
        priority: 'growth'
      };
    }

    if (metrics.subscription_usage_percentage > 80) {
      return {
        status: intl.formatMessage({ id: 'dashboard.readyToScale' }),
        insight: intl.formatMessage({ id: 'dashboard.readyToScaleInsight' }),
        action: intl.formatMessage({ id: 'dashboard.unlockPremium' }),
        actionIcon: FaCrown,
        actionColor: premiumColor,
        priority: 'upgrade'
      };
    }

    if (metrics.monthly_scans < 500) {
      return {
        status: intl.formatMessage({ id: 'dashboard.shareYourStory' }),
        insight: intl.formatMessage({ id: 'dashboard.shareStoryInsight' }),
        action: intl.formatMessage({ id: 'dashboard.shareQRCodes' }),
        actionIcon: FaChartLine,
        actionColor: accentColor,
        priority: 'marketing'
      };
    }

    return {
      status: intl.formatMessage({ id: 'dashboard.buildingTrust' }),
      insight: intl.formatMessage({ id: 'dashboard.buildingTrustInsight' }),
      action: intl.formatMessage({ id: 'dashboard.viewTransparencyImpact' }),
      actionIcon: FaChartLine,
      actionColor: accentColor,
      priority: 'standard'
    };
  };

  const getDefaultInsight = () => ({
    status: intl.formatMessage({ id: 'dashboard.loadingDashboard' }),
    insight: intl.formatMessage({ id: 'dashboard.calculatingMetrics' }),
    action: intl.formatMessage({ id: 'dashboard.viewAnalytics' }),
    actionIcon: FaChartLine,
    actionColor: accentColor,
    priority: 'standard'
  });

  const smartInsight = getSmartInsights();

  // Concrete, farmer-understandable values
  const trustScore = metrics ? Math.round(metrics.transparency_score) : 0;
  const marketReach = metrics
    ? metrics.consumer_reach > 10000
      ? `${Math.round(metrics.consumer_reach / 1000)}K`
      : metrics.consumer_reach.toLocaleString()
    : '0';
  const monthlyQRScans = metrics ? metrics.monthly_scans : 0;
  const qrScanGrowth = metrics ? metrics.scan_growth_percentage : 0;
  const documentedEvents = metrics ? metrics.total_documented_events : 0;
  const totalProductions = metrics ? metrics.total_productions : 0;
  const transparencyPercentile = metrics ? metrics.transparency_percentile : 50;

  const getLetterGrade = (score) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  };

  if (isLoading) {
    return (
      <Card
        h="290px"
        p={6}
        bg={cardBg}
        borderRadius="15px"
        boxShadow="0px 3.5px 5.5px rgba(0, 0, 0, 0.02)"
      >
        <Flex justify="center" align="center" h="full">
          <CircularProgress isIndeterminate color="green.500" size="40px" />
        </Flex>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        h="290px"
        p={6}
        bg={cardBg}
        borderRadius="15px"
        boxShadow="0px 3.5px 5.5px rgba(0, 0, 0, 0.02)"
      >
        <VStack spacing={4} align="center" justify="center" h="full">
          <Circle size="40px" bg="red.500" color="white">
            <Icon as={FaChartLine} w="20px" h="20px" />
          </Circle>
          <Text fontSize="md" color={textColor} fontWeight="600">
            {intl.formatMessage({ id: 'dashboard.unableLoadMetrics' })}
          </Text>
          <Text fontSize="sm" color={subtitleColor} textAlign="center">
            {intl.formatMessage({ id: 'dashboard.tryRefreshingPage' })}
          </Text>
        </VStack>
      </Card>
    );
  }

  return (
    <Card
      minH="290px"
      p={{ base: 4, md: 6 }}
      bg={cardBg}
      borderRadius="15px"
      boxShadow="0px 3.5px 5.5px rgba(0, 0, 0, 0.02)"
      position="relative"
      overflow="hidden"
    >
      {smartInsight.priority === 'celebration' && (
        <Box
          position="absolute"
          top="0"
          right="0"
          w="120px"
          h="120px"
          bgGradient="linear(to-br, green.200, green.300)"
          opacity="0.1"
          borderRadius="0 15px 0 100%"
        />
      )}

      <VStack spacing={3} align="stretch" h="full">
        {/* Header with Smart Status */}
        <Flex align="flex-start" justify="space-between">
          <Box flex="1">
            <HStack spacing={1} mb={0.5}>
              <Text
                fontSize={{ base: 'xs', md: 'sm' }}
                fontWeight="700"
                color={textColor}
                lineHeight="1.2"
              >
                {smartInsight.status}
              </Text>
              {transparencyPercentile > 50 && (
                <Tooltip
                  label={intl.formatMessage({ id: 'dashboard.tooltipTransparencyPercentile' }, {
                    percentile: 100 - transparencyPercentile
                  })}
                  fontSize="xs"
                  bg="gray.800"
                  color="white"
                  borderRadius="md"
                  px={3}
                  py={2}
                  hasArrow
                  placement="top"
                >
                  <Badge
                    colorScheme="green"
                    fontSize="xs"
                    px={2}
                    py={1}
                    borderRadius="full"
                    cursor="pointer"
                  >
                    <Icon as={FaMedal} w={2} h={2} mr={1} />
                    {intl.formatMessage({ id: 'dashboard.topPercentile' }, { percentile: 100 - transparencyPercentile })}
                  </Badge>
                </Tooltip>
              )}
            </HStack>
            <Text fontSize="xs" color={subtitleColor} lineHeight="1.3">
              {smartInsight.insight}
            </Text>
          </Box>
        </Flex>

        {/* Key Metrics Grid */}
        <SimpleGrid columns={3} spacing={1.5}>
          {/* Consumer Reach */}
          <Tooltip label={intl.formatMessage({ id: 'dashboard.tooltipConsumerReach' })} hasArrow>
            <Stat textAlign="center" bg={statBg} p={1} borderRadius="md">
              <StatLabel fontSize="xs" color={subtitleColor}>
                {intl.formatMessage({ id: 'dashboard.consumerReach' })}
              </StatLabel>
              <StatNumber fontSize="md" color={textColor} fontWeight="bold">
                {marketReach}
              </StatNumber>
              <StatHelpText fontSize="xs" color={successColor} m={0}>
                {qrScanGrowth > 0 && (
                  <HStack spacing={1} justify="center">
                    <Icon as={MdTrendingUp} w={2.5} h={2.5} />
                    <Text>{Math.round(qrScanGrowth)}%</Text>
                  </HStack>
                )}
              </StatHelpText>
            </Stat>
          </Tooltip>

          {/* Transparency Score */}
          <Tooltip label={intl.formatMessage({ id: 'dashboard.tooltipTrustScore' })} hasArrow>
            <Stat textAlign="center" bg={statBg} p={1} borderRadius="md">
              <StatLabel fontSize="xs" color={subtitleColor}>
                {intl.formatMessage({ id: 'dashboard.trustScore' })}
              </StatLabel>
              <StatNumber fontSize="sm" color={textColor} fontWeight="bold">
                {trustScore}%
              </StatNumber>
              <StatHelpText fontSize="xs" m={0}>
                <HStack spacing={1} justify="center">
                  <Icon as={BsShield} color={accentColor} w={2.5} h={2.5} />
                  <Text color={subtitleColor}>
                    {getLetterGrade(trustScore)}
                  </Text>
                </HStack>
              </StatHelpText>
            </Stat>
          </Tooltip>

          {/* Documented Events (replaces Blockchain) */}
          <Tooltip label={intl.formatMessage({ id: 'dashboard.tooltipDocumentedEvents' })} hasArrow>
            <Stat textAlign="center" bg={statBg} p={1} borderRadius="md">
              <StatLabel fontSize="xs" color={subtitleColor}>
                {intl.formatMessage({ id: 'dashboard.documentedEvents' })}
              </StatLabel>
              <StatNumber fontSize="sm" color={textColor} fontWeight="bold">
                {documentedEvents}
              </StatNumber>
              <StatHelpText fontSize="xs" m={0}>
                <HStack spacing={1} justify="center">
                  <Icon as={FaLeaf} color={accentColor} w={2.5} h={2.5} />
                  <Text color={subtitleColor}>
                    {intl.formatMessage({ id: 'dashboard.acrossProductions' }, { count: totalProductions })}
                  </Text>
                </HStack>
              </StatHelpText>
            </Stat>
          </Tooltip>
        </SimpleGrid>

        {/* Monthly Impact - concrete numbers */}
        <Box
          bg={gradientBg}
          p={3}
          borderRadius="md"
          border="1px solid"
          borderColor={useColorModeValue('green.100', 'green.700')}
        >
          <Flex align="center" justify="space-between">
            <HStack spacing={3}>
              <Circle size="32px" bg={accentColor} color="white">
                <Icon as={BsLightning} w="16px" h="16px" />
              </Circle>
              <Box>
                <Text fontSize="xs" color={textColor} fontWeight="600">
                  {intl.formatMessage({ id: 'dashboard.monthlyImpact' })}
                </Text>
                <HStack spacing={4}>
                  <Tooltip
                    label={intl.formatMessage({ id: 'dashboard.tooltipMonthlyScans' })}
                    hasArrow
                    placement="top"
                  >
                    <Text fontSize="sm" fontWeight="700" color={textColor} cursor="help">
                      {monthlyQRScans.toLocaleString()} {intl.formatMessage({ id: 'dashboard.qrScans' })}
                    </Text>
                  </Tooltip>
                  <Text fontSize="xs" color={subtitleColor}>
                    {marketReach} {intl.formatMessage({ id: 'dashboard.uniqueConsumers' })}
                  </Text>
                </HStack>
              </Box>
            </HStack>
          </Flex>
        </Box>

        {/* Smart Action Button */}
        <Box mt="auto">
          <Button
            bg={smartInsight.actionColor}
            color="white"
            size="md"
            fontSize="sm"
            fontWeight="600"
            borderRadius="xl"
            leftIcon={<Icon as={smartInsight.actionIcon} />}
            onClick={() => {
              switch (smartInsight.priority) {
                case 'celebration':
                case 'standard':
                  onViewAnalytics();
                  break;
                case 'upgrade':
                  onUpgradeSubscription();
                  break;
                case 'growth':
                  onOptimizeCarbon();
                  break;
                case 'marketing':
                  onShareTransparency();
                  break;
                default:
                  onViewAnalytics();
              }
            }}
            w="100%"
            _hover={{
              transform: 'translateY(-1px)',
              boxShadow: '0px 6px 20px rgba(76, 175, 80, 0.3)'
            }}
            _active={{
              transform: 'translateY(0px)'
            }}
            transition="all 0.2s ease"
          >
            {smartInsight.action}
          </Button>
        </Box>
      </VStack>
    </Card>
  );
};

export default SmartUsageCard;
