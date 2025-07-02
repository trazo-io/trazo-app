import React from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
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
import { StandardMetricCard, StandardButton, StandardPage, StandardCard, ConsumerTooltip } from '../../../components/Design/StandardComponents';

// Simple Impact Dashboard for US consumers
export default function ImpactDashboard() {
  const navigate = useNavigate();
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Fetch dynamic impact dashboard data
  const { 
    data: dashboardData, 
    isLoading, 
    error,
    refetch 
  } = useGetImpactDashboardQuery();

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
      title="My Impact"
      description="See how your food choices make a difference"
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
                    value={Math.round(impactMetrics?.miles_driving_offset || 0)}
                    label="Miles Carbon Equivalent"
                    subtitle="Carbon footprint awareness"
                    size="lg"
                    tooltip={{
                      label: "Miles Carbon Equivalent",
                      explanation: "This shows how many miles of car driving would produce the same amount of CO₂ as the carbon footprint you've discovered by scanning products. For example, 50 miles equals the carbon footprint of driving 50 miles in an average car. This helps you understand the environmental impact of your food choices in relatable terms."
                    }}
                  />
                  
                  <StandardMetricCard
                    icon={FaCheckCircle}
                    iconColor="blue.600"
                    iconBg="blue.100"
                    value={impactMetrics?.better_choices_made || 0}
                    label="Sustainable Products"
                    subtitle="Certified selections"
                    size="lg"
                    tooltip={{
                      label: "Sustainable Products",
                      explanation: "These are products you've scanned that have official certifications or verified low-carbon farming practices. This includes USDA Organic certified farms or products with verified carbon footprint data from sustainable agriculture practices."
                    }}
                  />
                  
                  <StandardMetricCard
                    icon={FaLeaf}
                    iconColor="teal.600"
                    iconBg="teal.100"
                    value={impactMetrics?.local_farms_found || 0}
                    label="Local Farms"
                    subtitle="Location-based tracking"
                    size="lg"
                    tooltip={{
                      label: "Local Farms",
                      explanation: "This counts farms within a reasonable distance from your location. Local farms typically have lower carbon footprints because the food doesn't need to travel as far to reach you, reducing transportation emissions. This feature will be enhanced as we add more location data."
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
                  Product Discovery
                </Text>
                <Text fontSize="sm" color={mutedColor} textAlign="center">
                  Discover sustainable products near you
                </Text>
              </VStack>
              <StandardButton 
                variant="primary" 
                size="md"
                width="full"
                onClick={() => navigate('/admin/dashboard/compare')}
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
                  Compare Products
                </Text>
                <Text fontSize="sm" color={mutedColor} textAlign="center">
                  Find better alternatives
                </Text>
              </VStack>
              <StandardButton 
                variant="primary" 
                size="md"
                width="full"
                onClick={() => navigate('/admin/dashboard/compare')}
              >
                Compare Now
              </StandardButton>
            </VStack>
          </StandardCard>
            
          <StandardCard variant="outline">
            <VStack spacing={4}>
              <Icon as={FaMapMarkerAlt} boxSize={10} color="teal.500" />
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
            title="Recent Scans" 
            subtitle="Products you've checked"
            variant="outline"
          >
                <VStack spacing={5}>
                  {recentScans.map((scan) => (
                    <Box 
                      key={scan.id} 
                      w="full" 
                      p={5} 
                      bg={scan.is_verified ? "green.50" : "gray.50"} 
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
                                label="Carbon Score"
                                explanation="Carbon scores rate products from A+ (very low environmental impact) to F (high environmental impact) based on greenhouse gas emissions from farming, processing, and transportation. A+ means under 0.5 kg CO₂ per kg of product."
                              >
                                <Badge colorScheme="green" fontSize="xs" cursor="help">
                                  {scan.carbon_score}
                                </Badge>
                              </ConsumerTooltip>
                              {scan.is_verified && (
                                <ConsumerTooltip
                                  label="USDA Verified"
                                  explanation="This product has carbon footprint data verified by the U.S. Department of Agriculture, ensuring the environmental claims are accurate and reliable."
                                >
                                  <Icon as={FaCheckCircle} color="green.500" boxSize={4} cursor="help" />
                                </ConsumerTooltip>
                              )}
                              {scan.is_favorite && (
                                <Icon as={FaHeart} color="red.500" boxSize={4} />
                              )}
                            </HStack>
                            <HStack spacing={2}>
                              <Icon as={FaMapMarkerAlt} color="gray.500" boxSize={3} />
                              <Text fontSize="sm" color={mutedColor}>
                                {scan.farm_name} • {scan.location}
                              </Text>
                            </HStack>
                          </VStack>
                          <ConsumerTooltip
                            label="Carbon Tracked"
                            explanation="This shows the amount of CO₂ emissions you've tracked by scanning this product. We're measuring the environmental impact to help you make informed choices, not claiming you've 'saved' this amount."
                          >
                            <Text fontSize="sm" color={scan.carbon_saved.includes('pending') ? 'gray.500' : 'green.600'} fontWeight="bold" cursor="help">
                              {scan.carbon_saved}
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
                            <Text fontSize="sm" color={mutedColor} cursor="help" textDecoration="underline" textDecorationStyle="dotted">
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
          <StandardCard 
            title="Quick Stats" 
            subtitle="Your impact at a glance"
            variant="outline"
          >
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