import React from 'react';
import {
  Box,
  VStack,
  HStack,
  SimpleGrid,
  Text,
  Icon,
  Badge,
  useColorModeValue,
  Alert,
  AlertIcon,
  Flex,
  Circle
} from '@chakra-ui/react';
import {
  FaLeaf,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaHeart,
  FaChevronRight,
  FaQrcode
} from 'react-icons/fa';
import { MdTrendingUp } from 'react-icons/md';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useGetImpactDashboardQuery } from '../../../store/api/consumerApi';
import {
  StandardMetricCard,
  StandardButton,
  StandardPage,
  StandardCard,
  ConsumerTooltip
} from '../../../components/Design/StandardComponents';

// Consumer Discover Dashboard - Main hub for transparency journey
export default function ImpactDashboard() {
  const navigate = useNavigate();
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const cardBorder = useColorModeValue('gray.200', 'gray.600');

  // Fetch dynamic impact dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useGetImpactDashboardQuery();

  // Return null while loading - keeps app-level loading visible
  if (isLoading) {
    return null;
  }

  // Handle error state
  if (error) {
    return (
      <StandardPage title="Discover" description="" showBackButton onBack={() => navigate(-1)}>
        <Alert status="error" borderRadius="xl">
          <AlertIcon />
          <Text flex={1}>Unable to load your transparency data.</Text>
          <StandardButton size="sm" onClick={() => refetch()}>
            Retry
          </StandardButton>
        </Alert>
      </StandardPage>
    );
  }

  const impactMetrics = dashboardData?.impact_metrics;
  const recentScans = dashboardData?.recent_scans || [];
  const quickStats = dashboardData?.quick_stats;
  const recommendations = dashboardData?.recommendations || [];

  return (
    <StandardPage
      title="Discover"
      description="Your transparency journey at a glance"
      showBackButton
      onBack={() => navigate(-1)}
    >
      <VStack spacing={8} align="stretch">
        {/* Hero Section with Stats */}
        <StandardCard variant="elevated">
          <VStack spacing={6}>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} w="full">
              <StandardMetricCard
                icon={MdTrendingUp}
                iconColor="green.600"
                iconBg="green.100"
                value={
                  impactMetrics?.transparency_score_avg
                    ? Math.round(impactMetrics.transparency_score_avg)
                    : impactMetrics?.total_scans || 0
                }
                label={
                  impactMetrics?.transparency_score_avg
                    ? 'Avg Transparency Score'
                    : 'Products Scanned'
                }
                subtitle={
                  impactMetrics?.transparency_score_avg
                    ? 'Farming practice visibility'
                    : 'Start scanning to see scores'
                }
                size="lg"
                tooltip={{
                  label: 'Transparency Score',
                  explanation:
                    "This shows the average transparency level of products you've scanned. Transparency measures how many farming activities are documented - from planting to harvest. Higher scores mean you can see exactly how your food was grown, giving you confidence in your food choices."
                }}
              />

              <StandardMetricCard
                icon={FaCheckCircle}
                iconColor="blue.600"
                iconBg="blue.100"
                value={impactMetrics?.verified_farms_scanned || 0}
                label="Verified Transparent Farms"
                subtitle="Documented farming practices"
                size="lg"
                tooltip={{
                  label: 'Verified Transparent Farms',
                  explanation:
                    "These are farms you've discovered that have comprehensive documentation of their farming practices. This includes detailed records of planting, growing, and harvesting activities, giving you complete visibility into how your food was produced."
                }}
              />

              <StandardMetricCard
                icon={FaLeaf}
                iconColor="teal.600"
                iconBg="teal.100"
                value={impactMetrics?.farming_events_viewed || 0}
                label="Farming Events Viewed"
                subtitle="Complete farm story access"
                size="lg"
                tooltip={{
                  label: 'Farming Events Viewed',
                  explanation:
                    "This shows how many individual farming activities you've explored - from planting and watering to harvesting and pest management. Each event gives you insight into the care and attention farmers put into growing your food."
                }}
              />
            </SimpleGrid>
          </VStack>
        </StandardCard>

        {/* Two Column Layout */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
          {/* Recent Product Scans - Mobile-First Compact Cards */}
          <StandardCard
            title="Recent Discoveries"
            subtitle="Farms you've explored"
            variant="outline"
          >
            <VStack spacing={3}>
              {recentScans.length === 0 ? (
                <VStack py={8} spacing={3}>
                  <Circle size="60px" bg="gray.100">
                    <Icon as={FaQrcode} color="gray.400" boxSize={6} />
                  </Circle>
                  <Text color={mutedColor} fontSize="sm" textAlign="center">
                    No scans yet. Start exploring!
                  </Text>
                </VStack>
              ) : (
                recentScans.map((scan) => (
                  <Box
                    as={RouterLink}
                    to={`/production/${scan.production_id || scan.id}`}
                    key={scan.id}
                    w="full"
                    bg="white"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="gray.200"
                    p={4}
                    _hover={{
                      borderColor: 'green.300',
                      shadow: 'md',
                      transform: 'translateY(-1px)'
                    }}
                    transition="all 0.2s"
                    textDecoration="none"
                  >
                    <Flex gap={3} align="center">
                      {/* Product Icon/Placeholder */}
                      <Circle size="50px" bg="green.50" flexShrink={0}>
                        <Icon as={FaLeaf} color="green.500" boxSize={5} />
                      </Circle>

                      {/* Content */}
                      <Box flex={1} minW={0}>
                        <HStack justify="space-between" align="start" mb={1}>
                          <Text fontWeight="semibold" fontSize="md" color={textColor} noOfLines={1}>
                            {scan.product_name}
                          </Text>
                          <Icon as={FaChevronRight} color="gray.400" boxSize={4} flexShrink={0} />
                        </HStack>

                        <HStack spacing={1} mb={2}>
                          <Icon as={FaMapMarkerAlt} color="gray.400" boxSize={3} />
                          <Text fontSize="sm" color={mutedColor} noOfLines={1}>
                            {scan.farm_name}
                          </Text>
                        </HStack>

                        {/* Compact Badges Row */}
                        <HStack spacing={2} flexWrap="wrap">
                          {scan.transparency_score && (
                            <Badge
                              colorScheme="green"
                              variant="subtle"
                              fontSize="xs"
                              px={2}
                              py={0.5}
                              borderRadius="full"
                            >
                              {scan.transparency_score}%
                            </Badge>
                          )}
                          {scan.events_viewed > 0 && (
                            <Badge
                              colorScheme="blue"
                              variant="subtle"
                              fontSize="xs"
                              px={2}
                              py={0.5}
                              borderRadius="full"
                            >
                              {scan.events_viewed} events
                            </Badge>
                          )}
                          {scan.is_verified && (
                            <Badge
                              colorScheme="green"
                              variant="outline"
                              fontSize="xs"
                              px={2}
                              py={0.5}
                              borderRadius="full"
                            >
                              <HStack spacing={1}>
                                <Icon as={FaCheckCircle} boxSize={3} />
                                <Text>Verified</Text>
                              </HStack>
                            </Badge>
                          )}
                        </HStack>
                      </Box>
                    </Flex>
                  </Box>
                ))
              )}
            </VStack>
          </StandardCard>

          {/* Quick Stats */}
          <StandardCard title="Quick Stats" subtitle="Your impact at a glance" variant="outline">
            <VStack spacing={4}>
              <SimpleGrid columns={2} spacing={4} w="full">
                <StandardMetricCard
                  icon={FaLeaf}
                  iconColor="green.600"
                  iconBg="green.100"
                  value={quickStats?.better_choices || 0}
                  label="Sustainable Items"
                  size="sm"
                  tooltip={{
                    label: 'Sustainable Items',
                    explanation:
                      "Products you've scanned that meet high transparency and sustainability standards, showing comprehensive documentation of farming practices."
                  }}
                />

                <StandardMetricCard
                  icon={FaMapMarkerAlt}
                  iconColor="blue.600"
                  iconBg="blue.100"
                  value={impactMetrics?.verified_farms_scanned || 0}
                  label="Farms Discovered"
                  size="sm"
                  tooltip={{
                    label: 'Farms Discovered',
                    explanation:
                      "The number of unique farms you've explored through product scans, each with documented farming practices and transparency records."
                  }}
                />
              </SimpleGrid>

              <StandardButton
                variant="outline"
                size="sm"
                w="full"
                onClick={() => navigate('/admin/dashboard/journey')}
              >
                View Full History
              </StandardButton>
            </VStack>
          </StandardCard>
        </SimpleGrid>
      </VStack>
    </StandardPage>
  );
}
