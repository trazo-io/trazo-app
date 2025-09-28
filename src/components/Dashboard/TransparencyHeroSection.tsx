import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  SimpleGrid,
  Progress,
  Badge,
  Circle,
  Icon,
  useColorModeValue,
  Flex,
  Divider,
  Tooltip
} from '@chakra-ui/react';
import {
  FaLeaf,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
  FaEye,
  FaChartLine,
  FaAward,
  FaClock
} from 'react-icons/fa';
import { MdVerified, MdTrendingFlat } from 'react-icons/md';
import { StandardMetricCard, ConsumerTooltip } from '../Design/StandardComponents';

interface TransparencyHeroSectionProps {
  transparencyScore: number;
  carbonSummary: {
    total_emissions: number;
    total_offsets: number;
    net_carbon: number;
    carbon_intensity: number;
  };
  trends: {
    transparency_trend: 'up' | 'down' | 'stable';
    carbon_trend: 'up' | 'down' | 'stable';
    engagement_trend: 'up' | 'down' | 'stable';
  };
  recentActivity: Array<{
    id: number;
    type: string;
    description: string;
    date: string;
    carbon_impact: number;
  }>;
  isMobile?: boolean;
}

export const TransparencyHeroSection: React.FC<TransparencyHeroSectionProps> = React.memo(({
  transparencyScore,
  carbonSummary,
  trends,
  recentActivity,
  isMobile = false
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('green.500', 'green.400');

  // Helper functions
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return FaArrowUp;
      case 'down':
        return FaArrowDown;
      default:
        return MdTrendingFlat;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', isGoodTrend = true) => {
    if (trend === 'stable') return 'gray.500';
    const isPositive = isGoodTrend ? trend === 'up' : trend === 'down';
    return isPositive ? 'green.500' : 'red.500';
  };

  const formatCarbonValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}t CO2e`;
    }
    return `${value.toFixed(1)} kg CO2e`;
  };

  const getTransparencyLevel = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'green' };
    if (score >= 75) return { label: 'Good', color: 'green' };
    if (score >= 60) return { label: 'Fair', color: 'yellow' };
    return { label: 'Needs Improvement', color: 'red' };
  };

  const transparencyLevel = getTransparencyLevel(transparencyScore);

  return (
    <VStack spacing={6} align="stretch">
      {/* Primary Transparency Score Display - ALWAYS FIRST */}
      <Box>
        <VStack spacing={4}>
          <Circle size={isMobile ? '120px' : '140px'} bg="green.100" position="relative">
            {/* Progress ring */}
            <Box
              position="absolute"
              inset={2}
              borderRadius="full"
              background={`conic-gradient(${accentColor} ${transparencyScore * 3.6}deg, ${borderColor} 0deg)`}
              _before={{
                content: '""',
                position: 'absolute',
                inset: 3,
                borderRadius: 'full',
                background: bgColor
              }}
            />
            
            {/* Score content */}
            <VStack spacing={1} position="relative" zIndex={1}>
              <Text fontSize={isMobile ? '3xl' : '4xl'} fontWeight="bold" color={accentColor}>
                {transparencyScore}%
              </Text>
              <Text fontSize="sm" color={mutedColor} textAlign="center">
                Transparency
              </Text>
            </VStack>
          </Circle>

          <VStack spacing={2}>
            <HStack spacing={2}>
              <Badge colorScheme={transparencyLevel.color} variant="solid" fontSize="sm" px={3} py={1}>
                {transparencyLevel.label}
              </Badge>
              <HStack spacing={1}>
                <Icon 
                  as={getTrendIcon(trends.transparency_trend)} 
                  color={getTrendColor(trends.transparency_trend)} 
                  boxSize={4} 
                />
                <Text fontSize="sm" color={getTrendColor(trends.transparency_trend)}>
                  {trends.transparency_trend === 'up' ? 'Improving' : 
                   trends.transparency_trend === 'down' ? 'Declining' : 'Stable'}
                </Text>
              </HStack>
            </HStack>

            <ConsumerTooltip
              label="Transparency Score"
              explanation="Shows how much of your agricultural practices have been documented and verified. Higher scores mean more transparency for consumers."
            >
              <Text fontSize="sm" color={mutedColor} textAlign="center" cursor="help">
                Based on {recentActivity.length} documented agricultural events
              </Text>
            </ConsumerTooltip>
          </VStack>
        </VStack>
      </Box>

      <Divider />

      {/* Secondary Metrics Grid - Mobile Responsive */}
      <SimpleGrid columns={isMobile ? 2 : 4} spacing={4}>
        <StandardMetricCard
          icon={FaEye}
          iconColor="blue.600"
          iconBg="blue.100"
          value={recentActivity.length}
          label="Events Logged"
          size={isMobile ? 'sm' : 'md'}
          minHeight={isMobile ? "44px" : "auto"} // Ensure 44px touch target
          tooltip={{
            label: "Agricultural Events",
            explanation: "Number of farming activities documented for transparency"
          }}
        />

        <StandardMetricCard
          icon={MdVerified}
          iconColor="green.600"
          iconBg="green.100"
          value={Math.round((recentActivity.filter(a => a.carbon_impact > 0).length / recentActivity.length) * 100) + '%'}
          label="Verified"
          size={isMobile ? 'sm' : 'md'}
          minHeight={isMobile ? "44px" : "auto"}
          tooltip={{
            label: "Verification Rate",
            explanation: "Percentage of activities with carbon impact calculations"
          }}
        />

        <StandardMetricCard
          icon={FaAward}
          iconColor="purple.600"
          iconBg="purple.100"
          value={formatCarbonValue(Math.abs(carbonSummary.net_carbon))}
          label={carbonSummary.net_carbon > 0 ? "Net Emissions" : "Net Offset"}
          subtitle={isMobile ? "Tap for details" : "Click to expand"}
          size={isMobile ? 'sm' : 'md'}
          minHeight={isMobile ? "44px" : "auto"}
          colorScheme={carbonSummary.net_carbon > 0 ? 'red' : 'green'}
        />

        <StandardMetricCard
          icon={FaChartLine}
          iconColor="teal.600"
          iconBg="teal.100"
          value={carbonSummary.carbon_intensity.toFixed(1)}
          label={isMobile ? "CO2e/kg" : "CO2e per kg"}
          subtitle="Industry avg: 2.1"
          size={isMobile ? 'sm' : 'md'}
          minHeight={isMobile ? "44px" : "auto"}
        />
      </SimpleGrid>

      {/* Recent Activity Preview - Mobile Optimized */}
      {recentActivity.length > 0 && (
        <>
          <Divider />
          <Box>
            <HStack justify="space-between" mb={3}>
              <Text fontWeight="semibold" color={textColor}>
                Recent Transparency Activity
              </Text>
              <HStack spacing={1}>
                <Icon as={FaClock} color={mutedColor} boxSize={3} />
                <Text fontSize="xs" color={mutedColor}>
                  Last 30 days
                </Text>
              </HStack>
            </HStack>

            <VStack spacing={2} align="stretch">
              {recentActivity.slice(0, isMobile ? 3 : 5).map((activity) => (
                <Flex 
                  key={activity.id}
                  justify="space-between" 
                  align="center" 
                  p={3} 
                  borderRadius="md" 
                  bg={useColorModeValue('gray.50', 'gray.700')}
                  border="1px solid"
                  borderColor={borderColor}
                >
                  <VStack align="start" spacing={0} flex={1}>
                    <Text fontSize={isMobile ? 'xs' : 'sm'} fontWeight="medium" color={textColor}>
                      {activity.description}
                    </Text>
                    <Text fontSize="xs" color={mutedColor}>
                      {new Date(activity.date).toLocaleDateString()}
                    </Text>
                  </VStack>

                  {activity.carbon_impact !== 0 && (
                    <Badge 
                      colorScheme={activity.carbon_impact > 0 ? 'red' : 'green'} 
                      variant="subtle"
                      fontSize="xs"
                    >
                      {activity.carbon_impact > 0 ? '+' : ''}{activity.carbon_impact.toFixed(1)} kg CO2e
                    </Badge>
                  )}
                </Flex>
              ))}

              {recentActivity.length > (isMobile ? 3 : 5) && (
                <Text fontSize="xs" color={mutedColor} textAlign="center">
                  +{recentActivity.length - (isMobile ? 3 : 5)} more activities
                </Text>
              )}
            </VStack>
          </Box>
        </>
      )}
    </VStack>
  );
});

TransparencyHeroSection.displayName = 'TransparencyHeroSection';

export default TransparencyHeroSection;