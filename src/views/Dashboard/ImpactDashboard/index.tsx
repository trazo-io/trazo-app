import React from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  SimpleGrid,
  Heading,
  Text,
  Icon,
  Badge,
  useColorModeValue,
  useBreakpointValue,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Spinner,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import {
  FaLeaf,
  FaQrcode,
  FaCheckCircle,
  FaChartLine,
  FaMapMarkerAlt,
  FaHeart
} from 'react-icons/fa';
import { MdTrendingUp } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useGetImpactDashboardQuery } from '../../../store/api/consumerApi';
import {
  StandardMetricCard,
  StandardButton,
  StandardPage,
  StandardCard,
  ConsumerTooltip
} from '../../../components/Design/StandardComponents';

// Simple Impact Dashboard for US consumers
export default function ImpactDashboard() {
  const navigate = useNavigate();
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Fetch dynamic impact dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useGetImpactDashboardQuery();

  // Handle loading state
  if (isLoading) {
    return (
      <Box bg={bgColor} minH="100vh">
        <Container maxW="7xl" mx="auto" pt={{ base: '120px', md: '80px' }} pb={8}>
          <VStack spacing={8} align="center">
            <Spinner size="xl" color="green.500" />
            <Text>Loading your impact data...</Text>
          </VStack>
        </Container>
      </Box>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Box bg={bgColor} minH="100vh">
        <Container maxW="7xl" mx="auto" pt={{ base: '120px', md: '80px' }} pb={8}>
          <Alert status="error">
            <AlertIcon />
            Unable to load your impact data. Please try again.
            <StandardButton size="sm" onClick={() => refetch()}>
              Retry
            </StandardButton>
          </Alert>
        </Container>
      </Box>
    );
  }

  const impactMetrics = dashboardData?.impact_metrics;
  const recentScans = dashboardData?.recent_scans || [];
  const quickStats = dashboardData?.quick_stats;
  const recommendations = dashboardData?.recommendations || [];

  return (
    <StandardPage
      title="My Transparency Journey"
      description="Discover the story behind your food choices"
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
                value={Math.round(impactMetrics?.transparency_score_avg || 85)}
                label="Avg Transparency Score"
                subtitle="Farming practice visibility"
                size="lg"
                tooltip={{
                  label: 'Average Transparency Score',
                  explanation:
                    "This shows the average transparency level of products you've scanned. Transparency measures how well farms document their growing practices, from planting to harvest. Higher scores mean you can see exactly how your food was grown, giving you confidence in your food choices."
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

        {/* Three Core MVP Features */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <StandardCard variant="outline">
            <VStack spacing={4}>
              <Icon as={FaQrcode} boxSize={10} color="green.500" />
              <VStack spacing={2}>
                <Text fontWeight="bold" fontSize="lg" color={textColor}>
                  Transparency Discovery
                </Text>
                <Text fontSize="sm" color={mutedColor} textAlign="center">
                  See exactly how your food was grown
                </Text>
              </VStack>
              <StandardButton
                variant="primary"
                size="md"
                width="full"
                onClick={() => navigate('/admin/dashboard/consumer/education')}
              >
                Discover Products
              </StandardButton>
            </VStack>
          </StandardCard>

          <StandardCard variant="outline">
            <VStack spacing={4}>
              <Icon as={FaChartLine} boxSize={10} color="blue.500" />
              <VStack spacing={2}>
                <Text fontWeight="bold" fontSize="lg" color={textColor}>
                  Discover Products
                </Text>
                <Text fontSize="sm" color={mutedColor} textAlign="center">
                  Explore transparency options
                </Text>
              </VStack>
              <StandardButton
                variant="primary"
                size="md"
                width="full"
                onClick={() => navigate('/admin/dashboard/consumer/education')}
              >
                Compare Now
              </StandardButton>
            </VStack>
          </StandardCard>

          <StandardCard variant="outline">
            <VStack spacing={4}>
              <Icon as={FaMapMarkerAlt} boxSize={10} color="green.500" />
              <VStack spacing={2}>
                <Text fontWeight="bold" fontSize="lg" color={textColor}>
                  My History
                </Text>
                <Text fontSize="sm" color={mutedColor} textAlign="center">
                  See all your past scans
                </Text>
              </VStack>
              <StandardButton
                variant="primary"
                size="md"
                width="full"
                onClick={() => navigate('/admin/dashboard/journey')}
              >
                View History
              </StandardButton>
            </VStack>
          </StandardCard>
        </SimpleGrid>

        {/* Two Column Layout */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
          {/* Recent Product Scans */}
          <StandardCard
            title="Recent Transparency Discoveries"
            subtitle="Farms you've explored"
            variant="outline"
          >
            <VStack spacing={5}>
              {recentScans.map((scan) => (
                <Box
                  key={scan.id}
                  w="full"
                  p={5}
                  bg={scan.is_verified ? 'green.50' : 'gray.50'}
                  borderRadius="xl"
                  borderWidth="1px"
                  borderColor="gray.200"
                >
                  <VStack align="start" spacing={3}>
                    <HStack justify="space-between" w="full">
                      <VStack align="start" spacing={1}>
                        <HStack>
                          <Text fontWeight="bold" fontSize="md" color={textColor}>
                            {scan.product_name}
                          </Text>
                          <ConsumerTooltip
                            label="Transparency Score"
                            explanation="Transparency scores show how well farms document their growing practices, from planting to harvest. Scores range from 0-100%, with higher scores meaning you can see exactly how your food was grown through detailed farming records."
                          >
                            <Badge colorScheme="green" fontSize="xs" cursor="help">
                              {scan.transparency_score || '85'}%
                            </Badge>
                          </ConsumerTooltip>
                          {scan.is_verified && (
                            <ConsumerTooltip
                              label="Farm Practices Verified"
                              explanation="This farm has verified documentation of their growing practices, giving you confidence in the transparency and authenticity of their farming methods."
                            >
                              <Icon
                                as={FaCheckCircle}
                                color="green.500"
                                boxSize={4}
                                cursor="help"
                              />
                            </ConsumerTooltip>
                          )}
                          {scan.is_favorite && <Icon as={FaHeart} color="red.500" boxSize={4} />}
                        </HStack>
                        <HStack spacing={2}>
                          <Icon as={FaMapMarkerAlt} color="gray.500" boxSize={3} />
                          <Text fontSize="sm" color={mutedColor}>
                            {scan.farm_name} • {scan.location}
                          </Text>
                        </HStack>
                      </VStack>
                      <ConsumerTooltip
                        label="Farming Events Viewed"
                        explanation="This shows how many farming activities you explored for this product, from planting to harvest. Each event gives you insight into the care and attention that went into growing your food."
                      >
                        <Text fontSize="sm" color="green.600" fontWeight="bold" cursor="help">
                          {scan.events_viewed || '12'} events
                        </Text>
                      </ConsumerTooltip>
                    </HStack>

                    <HStack spacing={1}>
                      <Text fontSize="sm" color={mutedColor}>
                        Environmental impact:
                      </Text>
                      <ConsumerTooltip
                        label="Carbon Footprint"
                        explanation="Carbon footprint measures all greenhouse gases produced to grow, harvest, process, package, and transport this food to you. It's measured in kg CO₂e (carbon dioxide equivalent) per kg of product. Lower numbers are better for the environment."
                      >
                        <Text
                          fontSize="sm"
                          color={mutedColor}
                          cursor="help"
                          textDecoration="underline"
                          textDecorationStyle="dotted"
                        >
                          {scan.carbon_footprint}
                        </Text>
                      </ConsumerTooltip>
                    </HStack>

                    {scan.sustainability_practices.length > 0 && (
                      <HStack spacing={2} flexWrap="wrap">
                        {scan.sustainability_practices.slice(0, 2).map((practice, idx) => (
                          <Badge key={idx} variant="outline" colorScheme="green" fontSize="xs">
                            {practice}
                          </Badge>
                        ))}
                      </HStack>
                    )}
                  </VStack>
                </Box>
              ))}
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
                />

                <StandardMetricCard
                  icon={FaMapMarkerAlt}
                  iconColor="blue.600"
                  iconBg="blue.100"
                  value={quickStats?.local_farms || 0}
                  label="Local Farms"
                  size="sm"
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
