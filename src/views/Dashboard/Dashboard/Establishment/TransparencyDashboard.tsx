import React, { useEffect } from 'react';

// Chakra imports
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  VStack,
  useColorModeValue,
  Heading,
  useToast,
  useBreakpointValue,
  Spinner,
  Alert,
  AlertIcon,
  Progress,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Tooltip,
  Switch
} from '@chakra-ui/react';
import {
  FaLeaf,
  FaChartLine,
  FaShieldAlt,
  FaChevronLeft,
  FaExclamationTriangle,
  FaPhotoVideo,
  FaDatabase,
  FaCloudUploadAlt,
  FaEdit,
  FaArrowRight,
  FaExternalLinkAlt,
  FaSeedling,
  FaCamera,
  FaBullseye,
  FaTrophy
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import { useGetEstablishmentComprehensiveDashboardQuery } from 'store/api/dashboardMetricsApi';
import { useGetTransparencyDetailsQuery } from 'store/api/transparencyQrApi';
import transparencyQrApi from 'store/api/transparencyQrApi';
import { useGetProductionsByEstablishmentQuery } from 'store/api/companyApi';
import { useUpdateProductionMutation } from 'store/api/historyApi.js';

function TransparencyDashboard() {
  const navigate = useNavigate();
  const { establishmentId, parcelId, productionId } = useParams();
  const toast = useToast();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentCompany = useSelector((state: any) => state.company.currentCompany);

  // Comprehensive dashboard data with fixed backend integration
  const {
    data: dashboardData,
    error,
    isLoading,
    refetch
  } = useGetEstablishmentComprehensiveDashboardQuery(
    {
      companyId: Number(currentCompany?.id),
      establishmentId: Number(establishmentId)
    },
    {
      skip: !establishmentId || currentCompany?.id === undefined,
      refetchOnMountOrArgChange: true
    }
  );

  // 🎯 2025 BEST PRACTICE: Use unified transparency API for consistency
  // ONLY fetch production-specific transparency when we have a productionId
  // For ESTABLISHMENT dashboards, use the dashboard_comprehensive API data instead
  const {
    data: transparencyApiData,
    error: transparencyError,
    isLoading: transparencyLoading
  } = useGetTransparencyDetailsQuery(
    productionId || '', // Only use actual productionId, no hardcoded fallback
    {
      skip: !productionId, // Skip when no productionId - this is an establishment dashboard
      refetchOnMountOrArgChange: true
    }
  );

  // Basic responsive utilities - exact same as ProfileEstablishment
  const touchTargetSize = useBreakpointValue({ base: '48px', sm: '44px', md: '40px' });
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Get productions data for this establishment
  const {
    data: productions = [],
    isLoading: isProductionsLoading,
    error: productionsError,
    refetch: refetchProductions
  } = useGetProductionsByEstablishmentQuery(
    { establishmentId: Number(establishmentId) },
    {
      skip: !establishmentId,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true
    }
  );

  // Production update mutation
  const [updateProduction] = useUpdateProductionMutation();


  // Force refetch productions data to ensure we get the latest enhanced data
  useEffect(() => {
    if (establishmentId && refetchProductions) {
      refetchProductions();
    }
  }, [establishmentId, refetchProductions]);

  // Toggle production visibility function
  const handleToggleProduction = async (productionId: number, currentlyPublished: boolean) => {
    try {
      await updateProduction({
        historyId: productionId,
        published: !currentlyPublished
      }).unwrap();

      // Refetch productions to get updated data
      refetchProductions();

      toast({
        title: !currentlyPublished ? 'Production Activated' : 'Production Deactivated',
        description: !currentlyPublished
          ? 'Production is now visible to consumers'
          : 'Production is no longer visible to consumers',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Error updating production:', error);
      toast({
        title: 'Error',
        description: 'Failed to update production visibility',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  // Color mode values - exact same as ProfileEstablishment
  const titleColor = useColorModeValue('green.600', 'green.400');
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const bgColor = useColorModeValue('white', 'gray.800');
  const cardPadding = { base: 4, sm: 5, md: 6, lg: 8 };
  const mobileCardRadius = { base: 'xl', md: '2xl' };
  const headingSize = { base: 'md', sm: 'lg', md: 'xl' };

  // Loading state - exact same as ProfileEstablishment pattern
  if (isLoading) {
    return (
      <Flex
        direction="column"
        alignSelf="center"
        justifySelf="center"
        overflow="hidden"
        w="100%"
        position="relative"
      >
        <Box
          bg="linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)"
          pt={{ base: '140px', md: '100px' }}
          pb={{ base: '80px', md: '100px' }}
          px={6}
          position="relative"
        >
          <Box maxW="full" mx="auto">
            <VStack spacing={8} align="center" justify="center" minH="40vh">
              <Spinner size="xl" color="green.500" thickness="4px" />
              <VStack spacing={2}>
                <Text fontSize="lg" fontWeight="bold" color={textColor}>
                  Loading Transparency Dashboard
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Analyzing your transparency data...
                </Text>
              </VStack>
            </VStack>
          </Box>
        </Box>
      </Flex>
    );
  }

  // Error state - exact same as ProfileEstablishment pattern
  if (error) {
    return (
      <Flex
        direction="column"
        alignSelf="center"
        justifySelf="center"
        overflow="hidden"
        w="100%"
        position="relative"
      >
        <Box
          bg="linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)"
          pt={{ base: '140px', md: '100px' }}
          pb={{ base: '80px', md: '100px' }}
          px={6}
          position="relative"
        >
          <Box maxW="full" mx="auto">
            <VStack spacing={6} align="center" justify="center" minH="40vh">
              <Alert status="error" borderRadius="lg" maxW="md">
                <AlertIcon />
                <VStack align="start" spacing={2}>
                  <Text fontWeight="bold">Failed to load transparency data</Text>
                  <Button size="sm" colorScheme="green" onClick={() => refetch()}>
                    Try Again
                  </Button>
                </VStack>
              </Alert>
            </VStack>
          </Box>
        </Box>
      </Flex>
    );
  }

  const establishment = dashboardData?.establishment;
  const transparencyMetrics = dashboardData?.transparency_metrics;
  const comprehensiveData = dashboardData?.comprehensive_data;
  const carbonSummary = dashboardData?.carbon_summary;

  // Transparency score: event-based ratio (consistent with consumer QR page)
  // Documentation Coverage section provides per-category photo guidance separately
  const getTransparencyScore = (): number => {
    if (transparencyMetrics?.overall_transparency_score !== undefined && transparencyMetrics?.overall_transparency_score !== null) {
      return transparencyMetrics.overall_transparency_score;
    }
    if (comprehensiveData?.transparency_percentage !== undefined && comprehensiveData?.transparency_percentage !== null) {
      return comprehensiveData.transparency_percentage;
    }
    if (productionId && transparencyApiData?.quick_view?.transparency_score?.percentage) {
      return transparencyApiData.quick_view.transparency_score.percentage;
    }
    return 0;
  };

  const actualTransparencyScore = getTransparencyScore() / 100;

  // Category weights matching backend TransparencyCalculator._calculate_completeness_score
  const CATEGORY_WEIGHTS: Record<string, number> = {
    production: 30, chemical: 20, soil: 18,
    pest: 12, weather: 5, business: 10, general: 5
  };

  // Benchmark thresholds (matching backend compare_with_benchmarks)
  const getNextMilestone = (score: number) => {
    if (score < 60) return { target: 60, label: 'Industry Minimum' };
    if (score < 80) return { target: 80, label: 'Good Practice' };
    if (score < 90) return { target: 90, label: 'Certification Standard' };
    if (score < 95) return { target: 95, label: 'Excellence' };
    return null; // Already excellent
  };

  // Consumer-friendly category names (matching backend transparency_calculator.py:515-556)
  const CATEGORY_CONSUMER_NAMES: Record<string, string> = {
    production: 'Growing Practices',
    chemical: 'Treatment Details',
    soil: 'Soil Care',
    pest: 'Pest Management',
    weather: 'Weather Conditions',
    business: 'Certifications',
    general: 'Additional Details'
  };

  // Photo-required categories (matching backend anti-gaming logic)
  const PHOTO_REQUIRED_CATEGORIES = ['production', 'chemical', 'soil', 'pest'];

  // Inline sub-component: Per-production transparency detail (lazy-loaded on expand)
  const ProductionTransparencyDetail = ({ prodId, prodName, isActive }: { prodId: number; prodName: string; isActive: boolean }) => {
    const [fetchTransparency, { data: prodData, isLoading: prodLoading, error: prodError }] =
      transparencyQrApi.endpoints.getTransparencyDetails.useLazyQuery();

    useEffect(() => {
      fetchTransparency(String(prodId));
    }, [prodId, fetchTransparency]);

    if (prodLoading) {
      return (
        <VStack py={6} spacing={3}>
          <Spinner size="md" color="green.500" />
          <Text fontSize="sm" color="gray.500">Loading transparency details...</Text>
        </VStack>
      );
    }

    if (prodError || !prodData) {
      return (
        <Alert status="error" borderRadius="md" size="sm">
          <AlertIcon />
          <Text fontSize="sm">Failed to load transparency details for this production.</Text>
        </Alert>
      );
    }

    const details = prodData?.standard_view?.transparency_details;
    const categoryBreakdown = details?.category_breakdown || {};
    const actualEvents = details?.actual_events || 0;
    const expectedEvents = details?.expected_events || 0;
    const farmingApproach = details?.farming_approach || 'conventional';
    const prodParcelId = (prodData as any)?.parcel?.id;

    // Calculate photo stats for this production
    const timeline = prodData?.timeline || [];
    const eventsWithPhotos = timeline.filter((e: any) => e.photo_count > 0 || e.album).length;
    const totalTimelineEvents = timeline.length;
    const categoriesNeedingPhotos = Object.entries(categoryBreakdown)
      .filter(([key, cat]: [string, any]) =>
        PHOTO_REQUIRED_CATEGORIES.includes(key) && cat.actual_count > 0 && (cat.photo_verification_rate || 0) < 80
      );

    return (
      <VStack spacing={4} align="stretch" pt={3}>
        {/* Production summary stats */}
        <HStack spacing={4} flexWrap="wrap">
          <Text fontSize="sm" color="gray.600">
            {actualEvents}/{expectedEvents} expected events
          </Text>
          <Text fontSize="sm" color="gray.600">
            Farming: {farmingApproach}
          </Text>
          <Text fontSize="sm" fontWeight="medium" color={eventsWithPhotos > 0 ? 'green.600' : 'orange.600'}>
            {eventsWithPhotos}/{totalTimelineEvents} events have photos
          </Text>
        </HStack>

        {/* Per-production photo alert */}
        {eventsWithPhotos === 0 && categoriesNeedingPhotos.length > 0 && (
          <Alert status="warning" borderRadius="md" py={2}>
            <AlertIcon />
            <Text fontSize="sm" color="orange.700">
              No events have photos — {categoriesNeedingPhotos.length} categories have their score halved.
              Add at least 1 photo per event to improve.
            </Text>
          </Alert>
        )}

        {/* Category breakdown grid */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
          {Object.entries(categoryBreakdown)
            .sort(([a]: [string, any], [b]: [string, any]) =>
              (CATEGORY_WEIGHTS[b] || 0) - (CATEGORY_WEIGHTS[a] || 0)
            )
            .map(([key, cat]: [string, any]) => {
              const weight = CATEGORY_WEIGHTS[key] || 5;
              const consumerName = CATEGORY_CONSUMER_NAMES[key] || key;
              const isEmpty = cat.actual_count === 0;
              const needsPhotos = PHOTO_REQUIRED_CATEGORIES.includes(key) &&
                cat.actual_count > 0 && (cat.photo_verification_rate || 0) < 80;
              const completeness = cat.completeness_percentage || 0;
              const photoRate = cat.photo_verification_rate || 0;
              const eventsWithoutPhotos = needsPhotos
                ? Math.max(0, cat.actual_count - Math.round(cat.actual_count * photoRate / 100))
                : 0;

              return (
                <Box
                  key={key}
                  p={3}
                  bg="gray.50"
                  borderRadius="lg"
                  border="1px solid"
                  borderColor={
                    completeness >= 80 ? 'green.200' :
                    completeness >= 50 ? 'yellow.200' :
                    cat.actual_count > 0 ? 'orange.200' : 'gray.200'
                  }
                >
                  <HStack justify="space-between" mb={1}>
                    <HStack spacing={2}>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                        {consumerName}
                      </Text>
                      <Badge fontSize="xs" colorScheme="gray" variant="outline" borderRadius="full">
                        {weight}%
                      </Badge>
                    </HStack>
                    <Text fontSize="xs" color="gray.500" fontWeight="medium">
                      {cat.actual_count} event{cat.actual_count !== 1 ? 's' : ''}
                    </Text>
                  </HStack>
                  <Progress
                    value={completeness}
                    colorScheme={
                      completeness >= 80 ? 'green' :
                      completeness >= 50 ? 'yellow' :
                      cat.actual_count > 0 ? 'orange' : 'gray'
                    }
                    borderRadius="full"
                    size="sm"
                    mb={1}
                  />
                  <Text fontSize="xs" color="gray.500">
                    {completeness >= 90
                      ? 'Fully documented'
                      : isEmpty
                      ? `Log 1+ events here for up to +${weight}%`
                      : (() => {
                          const tierSummary = cat.photo_tier_summary;
                          if (tierSummary) {
                            const essentialMissing = tierSummary.essential.total - tierSummary.essential.verified;
                            const recommendedMissing = tierSummary.recommended.total - tierSummary.recommended.verified;
                            if (essentialMissing > 0) {
                              return `${essentialMissing} event${essentialMissing !== 1 ? 's' : ''} require photos for full score`;
                            }
                            if (recommendedMissing > 0) {
                              return `Photos recommended for ${recommendedMissing} event${recommendedMissing !== 1 ? 's' : ''}`;
                            }
                          } else if (needsPhotos) {
                            return `${eventsWithoutPhotos} event${eventsWithoutPhotos !== 1 ? 's need' : ' needs'} photos — add 1+ photo each to unlock full +${weight}%`;
                          }
                          return `${Math.round(completeness)}% complete`;
                        })()}
                  </Text>
                </Box>
              );
            })}
        </SimpleGrid>

        {/* Action buttons — only for active productions */}
        {isActive && (
          <HStack spacing={3} pt={2}>
            <Button
              size="sm"
              colorScheme="green"
              variant="outline"
              leftIcon={<FaEdit />}
              onClick={() => {
                if (prodParcelId) {
                  navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${prodParcelId}/event/add`);
                } else {
                  navigate(`/admin/dashboard/establishment/${establishmentId}/production`);
                }
              }}
            >
              Add Event
            </Button>
            <Button
              size="sm"
              colorScheme="orange"
              variant="outline"
              leftIcon={<FaCamera />}
              onClick={() => {
                if (prodParcelId) {
                  navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${prodParcelId}`);
                } else {
                  navigate(`/admin/dashboard/establishment/${establishmentId}/production`);
                }
              }}
            >
              Add Photos
            </Button>
          </HStack>
        )}
      </VStack>
    );
  };

  const totalPhotos = comprehensiveData?.total_photos || 0;
  const totalEvents = comprehensiveData?.total_events || 0;
  const blockchainVerified = comprehensiveData?.verification_status?.blockchain_verified || 0;

  // Production counts by status
  const activeProductions = comprehensiveData?.active_productions || 0;
  const completedProductions = comprehensiveData?.completed_productions || 0;

  // Process event validation opportunities - Fix data source location
  const eventOpportunities =
    dashboardData?.missing_data_opportunities ||
    comprehensiveData?.missing_data_opportunities ||
    [];


  const priorityGroups = eventOpportunities.reduce((acc, opportunity) => {
    const priority = opportunity.priority || 'medium';
    if (!acc[priority]) {
      acc[priority] = [];
    }
    acc[priority].push(opportunity);
    return acc;
  }, {} as Record<string, typeof eventOpportunities>);

  const sortedOpportunities = ['high', 'medium', 'low']
    .flatMap((priority) => priorityGroups[priority] || [])
    .slice(0, 6); // Show top 6 opportunities

  // Generate specific edit URLs for transparency improvement actions
  const generateEditUrl = (opportunity: any) => {
    // PRIORITY 1: Use backend-provided action_url if available (for production-specific opportunities)
    if (opportunity.action_url) {
      return opportunity.action_url;
    }

    // FALLBACK: Route farmers to specific actionable pages based on opportunity type
    if (opportunity.type === 'photo_validation') {
      // Direct farmers to production list where they can add photos to existing events
      return `/admin/dashboard/establishment/${establishmentId}/production`;
    }
    if (opportunity.type === 'usda_verification') {
      // Direct farmers to production list where they can add USDA verification to chemical events
      return `/admin/dashboard/establishment/${establishmentId}/production`;
    }
    if (opportunity.type === 'blockchain_verification') {
      // Direct farmers to subscription page for blockchain features
      return `/admin/dashboard/subscription`;
    }
    if (opportunity.type === 'production_documentation') {
      // Direct farmers to add new production
      return `/admin/dashboard/establishment/${establishmentId}/production/add`;
    }
    if (opportunity.type === 'event_verification') {
      // Direct farmers to production list where they can verify events
      return `/admin/dashboard/establishment/${establishmentId}/production`;
    }
    // Default fallback to production list
    return `/admin/dashboard/establishment/${establishmentId}/production`;
  };

  return (
    <Flex
      direction="column"
      alignSelf="center"
      justifySelf="center"
      overflow="hidden"
      w="100%"
      position="relative"
    >
      {/* Clean Modern Header - Matching Commercial Dashboard layout */}
      <Box
        bg="linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)"
        pt={{ base: '140px', md: '100px' }}
        pb={{ base: '80px', md: '100px' }}
        px={6}
        position="relative"
      >
        <Box maxW="6xl" mx="auto">
          <VStack spacing={4} textAlign="center">
            {/* Back Button + Title Row - Matching StandardPage layout */}
            <Flex
              direction={{ base: 'column', md: 'row' }}
              align="center"
              gap={4}
              w="full"
              justify="space-between"
            >
              <Button
                variant="outline"
                leftIcon={<FaChevronLeft />}
                onClick={() => navigate(-1)}
                size="sm"
                bg="white"
                borderColor="green.500"
                color="green.500"
                _hover={{ bg: 'green.50', borderColor: 'green.600' }}
              >
                Back
              </Button>

              <VStack spacing={2} flex={1}>
                <Heading
                  as="h1"
                  size="2xl"
                  color="green.600"
                  fontWeight="bold"
                  textAlign="center"
                  letterSpacing="-0.02em"
                >
                  Transparency Dashboard
                </Heading>

                <Text
                  fontSize="lg"
                  color="gray.600"
                  fontWeight="normal"
                  maxW="600px"
                  textAlign="center"
                >
                  Monitor and improve transparency for {establishment?.name || 'Loading...'}
                </Text>
              </VStack>

              {/* Empty box for balance on desktop */}
              <Box w={{ base: 0, md: '70px' }} display={{ base: 'none', md: 'block' }} />
            </Flex>
          </VStack>
        </Box>
      </Box>

      {/* Main Content Container - Matching Commercial Dashboard layout */}
      <Box
        maxW="full"
        mx="auto"
        px={6}
        mt="-40px"
        mb={{ base: '60px', md: '80px' }}
        position="relative"
        zIndex={10}
      >
        <Card
          w="100%"
          p={cardPadding}
          boxShadow={{
            base: '0 8px 16px -4px rgba(0, 0, 0, 0.12)',
            md: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          borderRadius={mobileCardRadius}
          bg={bgColor}
          position="relative"
        >
          <CardBody>
            <VStack spacing={{ base: 6, md: 8 }} align="stretch">
              {/* Transparency Quick Stats - Matching Environmental Impact pattern */}
              <Box>
                <Heading size="md" color={titleColor} mb={4} fontSize={{ base: 'lg', md: 'xl' }}>
                  Transparency Overview
                </Heading>
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                  <Card bg="green.50" border="1px solid" borderColor="green.100" borderRadius="xl">
                    <CardBody p={4} textAlign="center">
                      <VStack spacing={2}>
                        <Icon as={FaLeaf} color="green.500" boxSize={6} />
                        <Text fontSize="xl" fontWeight="bold" color="green.700">
                          {Math.round(actualTransparencyScore * 100)}%
                        </Text>
                        <Text fontSize="sm" color="green.600">
                          Transparency Score
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card bg="blue.50" border="1px solid" borderColor="blue.100" borderRadius="xl">
                    <CardBody p={4} textAlign="center">
                      <VStack spacing={2}>
                        <Icon as={FaCloudUploadAlt} color="blue.500" boxSize={6} />
                        <Text fontSize="xl" fontWeight="bold" color="blue.700">
                          {totalEvents}
                        </Text>
                        <Text fontSize="sm" color="blue.600">
                          Events Logged
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card
                    bg="purple.50"
                    border="1px solid"
                    borderColor="purple.100"
                    borderRadius="xl"
                  >
                    <CardBody p={4} textAlign="center">
                      <VStack spacing={2}>
                        <Icon as={FaPhotoVideo} color="purple.500" boxSize={6} />
                        <Text fontSize="xl" fontWeight="bold" color="purple.700">
                          {totalPhotos}
                        </Text>
                        <Text fontSize="sm" color="purple.600">
                          Photos Added
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card
                    bg="orange.50"
                    border="1px solid"
                    borderColor="orange.100"
                    borderRadius="xl"
                  >
                    <CardBody p={4} textAlign="center">
                      <VStack spacing={2}>
                        <Icon as={FaSeedling} color="orange.500" boxSize={6} />
                        <HStack spacing={3} justify="center">
                          <VStack spacing={0}>
                            <Text fontSize="lg" fontWeight="bold" color="green.600">
                              {activeProductions}
                            </Text>
                            <Text fontSize="xs" color="green.500">Active</Text>
                          </VStack>
                          <Text color="gray.300">|</Text>
                          <VStack spacing={0}>
                            <Text fontSize="lg" fontWeight="bold" color="orange.600">
                              {completedProductions}
                            </Text>
                            <Text fontSize="xs" color="orange.500">Completed</Text>
                          </VStack>
                        </HStack>
                        <Text fontSize="sm" color="orange.600">
                          Productions
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                </SimpleGrid>
              </Box>

              {/* Score Insight Banner - Next Milestone */}
              {(() => {
                const score = Math.round(actualTransparencyScore * 100);
                const milestone = getNextMilestone(score);

                if (!milestone) {
                  return (
                    <Card bg="green.50" border="1px solid" borderColor="green.200" borderRadius="xl">
                      <CardBody p={4}>
                        <HStack spacing={3}>
                          <Icon as={FaTrophy} color="green.500" boxSize={6} />
                          <VStack align="start" spacing={1} flex={1}>
                            <Text fontWeight="bold" color="green.700" fontSize="sm">
                              Outstanding Transparency!
                            </Text>
                            <Text fontSize="xs" color="green.600">
                              Your documentation exceeds industry excellence standards. Consumers can see exactly how their food was grown.
                            </Text>
                          </VStack>
                        </HStack>
                      </CardBody>
                    </Card>
                  );
                }

                const pointsNeeded = milestone.target - score;
                const progressPercent = (score / milestone.target) * 100;

                // Identify top bottleneck from category breakdown
                const breakdown = transparencyMetrics?.transparency_breakdown || {};
                const criticalCategories = Object.entries(breakdown)
                  .filter(([key, cat]: [string, any]) =>
                    cat.requires_photos && cat.actual_count > 0 && cat.photo_verification_rate < 80
                  );
                const hasPhotoBottleneck = criticalCategories.length > 0 && totalPhotos === 0;
                const emptyCategories = Object.entries(breakdown)
                  .filter(([, cat]: [string, any]) => cat.actual_count === 0);

                let bottleneckText = '';
                if (hasPhotoBottleneck) {
                  bottleneckText = `Add photos to your events — ${criticalCategories.length} critical categories need photo evidence to unlock full completeness.`;
                } else if (emptyCategories.length > 0) {
                  const names = emptyCategories.map(([, cat]: [string, any]) => cat.consumer_name || '').filter(Boolean).join(', ');
                  bottleneckText = `Start documenting: ${names} — these categories have no events yet.`;
                }

                return (
                  <Card bg="blue.50" border="1px solid" borderColor="blue.200" borderRadius="xl">
                    <CardBody p={4}>
                      <VStack spacing={3} align="stretch">
                        <HStack spacing={3}>
                          <Icon as={FaBullseye} color="blue.500" boxSize={5} />
                          <VStack align="start" spacing={0} flex={1}>
                            <Text fontWeight="bold" color="blue.700" fontSize="sm">
                              Next Goal: {milestone.label}
                            </Text>
                            <Text fontSize="xs" color="blue.600">
                              {pointsNeeded} more points to reach {milestone.target}%
                            </Text>
                          </VStack>
                          <Text fontWeight="bold" color="blue.700" fontSize="lg">
                            {score}%
                            <Text as="span" fontWeight="normal" fontSize="sm" color="blue.500">
                              {' '}/ {milestone.target}%
                            </Text>
                          </Text>
                        </HStack>
                        <Progress
                          value={progressPercent}
                          colorScheme="blue"
                          borderRadius="full"
                          size="sm"
                          bg="blue.100"
                        />
                        {bottleneckText && (
                          <Text fontSize="xs" color="blue.600">
                            Top opportunity: {bottleneckText}
                          </Text>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                );
              })()}

              {/* Critical Photo Alert - When 0 Photos Across Critical Categories */}
              {totalPhotos === 0 && totalEvents > 0 && (
                <Alert
                  status="warning"
                  variant="left-accent"
                  borderRadius="xl"
                  bg="orange.50"
                  borderLeftColor="orange.400"
                  borderLeftWidth="4px"
                >
                  <AlertIcon color="orange.500" boxSize={5} />
                  <VStack align="start" spacing={1} flex={1}>
                    <Text fontWeight="bold" color="orange.800" fontSize="sm">
                      No Photos Added — This Reduces Your Score by Up to 50%
                    </Text>
                    <Text fontSize="xs" color="orange.700" lineHeight="1.5">
                      Essential events (planting, harvesting, chemical applications, pest identification) require
                      photo evidence for full scores. Recommended events (pruning, soil tests, scouting) get a
                      lighter penalty. Adding photos to your existing {totalEvents} events could significantly raise your score.
                    </Text>
                  </VStack>
                  <Button
                    size="sm"
                    colorScheme="orange"
                    variant="solid"
                    leftIcon={<FaCamera />}
                    flexShrink={0}
                    onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}/production`)}
                  >
                    Add Photos
                  </Button>
                </Alert>
              )}

              {/* Blockchain Verification - Feature Awareness */}
              {blockchainVerified > 0 ? (
                <Card
                  border="1px solid"
                  borderColor="green.200"
                  bg="green.50"
                  borderRadius="xl"
                >
                  <CardBody p={4}>
                    <HStack spacing={3}>
                      <Icon as={FaShieldAlt} color="green.500" boxSize={6} />
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontWeight="semibold" color="green.700" fontSize="sm">
                          Blockchain Verified
                        </Text>
                        <Text fontSize="xs" color="green.600">
                          {blockchainVerified} production{blockchainVerified !== 1 ? 's' : ''} verified
                          with immutable on-chain records
                        </Text>
                      </VStack>
                      <Badge colorScheme="green" variant="solid">
                        {blockchainVerified}
                      </Badge>
                    </HStack>
                  </CardBody>
                </Card>
              ) : (
                <Card
                  border="1px dashed"
                  borderColor="purple.200"
                  bg="purple.50"
                  borderRadius="xl"
                  cursor="pointer"
                  onClick={() => navigate('/admin/dashboard/subscription')}
                  _hover={{ bg: 'purple.100', borderColor: 'purple.300' }}
                  transition="all 0.2s"
                >
                  <CardBody p={4}>
                    <HStack spacing={3}>
                      <Icon as={FaShieldAlt} color="purple.400" boxSize={6} />
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontWeight="semibold" color="purple.700" fontSize="sm">
                          Blockchain Verification Available
                        </Text>
                        <Text fontSize="xs" color="purple.600">
                          Add immutable proof of your farming practices for maximum consumer trust
                        </Text>
                      </VStack>
                      <Button
                        size="xs"
                        colorScheme="purple"
                        variant="outline"
                        rightIcon={<FaArrowRight />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/admin/dashboard/subscription');
                        }}
                      >
                        Learn More
                      </Button>
                    </HStack>
                  </CardBody>
                </Card>
              )}

              {/* Your Productions - Expandable Cards with Per-Production Breakdown */}
              <Box>
                <Heading size="md" color={titleColor} mb={2} fontSize={{ base: 'lg', md: 'xl' }}>
                  Your Productions
                </Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Click any production to see exactly why its score is what it is and how to improve it
                </Text>

                {isProductionsLoading ? (
                  <VStack spacing={4} py={8}>
                    <Spinner size="lg" color="green.500" />
                    <Text fontSize="sm" color="gray.600">Loading productions...</Text>
                  </VStack>
                ) : productionsError ? (
                  <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm" fontWeight="semibold">Failed to load productions</Text>
                  </Alert>
                ) : productions.length === 0 ? (
                  <VStack spacing={4} py={8}>
                    <Icon as={FaLeaf} boxSize={12} color="gray.400" />
                    <Text fontSize="md" fontWeight="semibold" color="gray.600">No productions found</Text>
                    <Text fontSize="sm" color="gray.500">Create your first production to start tracking transparency</Text>
                  </VStack>
                ) : (
                  <Accordion allowMultiple>
                    {[...productions]
                      .sort((a: any, b: any) => {
                        // Active productions first, then completed
                        if (!a.finish_date && b.finish_date) return -1;
                        if (a.finish_date && !b.finish_date) return 1;
                        return 0;
                      })
                      .map((production: any) => {
                        const isActive = !production.finish_date;
                        const score = production.transparency_score || 0;
                        const scoreColor = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';

                        return (
                          <AccordionItem
                            key={production.id}
                            border="2px solid"
                            borderColor={isActive ? 'green.200' : 'gray.200'}
                            borderRadius="xl"
                            mb={3}
                            overflow="hidden"
                          >
                            {({ isExpanded }) => (
                              <>
                                <AccordionButton
                                  py={4}
                                  px={4}
                                  bg={isActive ? 'green.50' : 'gray.50'}
                                  _hover={{ bg: isActive ? 'green.100' : 'gray.100' }}
                                  borderRadius={isExpanded ? 'none' : 'xl'}
                                >
                                  <VStack align="stretch" flex={1} spacing={2}>
                                    <HStack justify="space-between" w="full">
                                      <HStack spacing={2}>
                                        <Badge
                                          colorScheme={isActive ? 'green' : 'gray'}
                                          variant={isActive ? 'solid' : 'subtle'}
                                          fontSize="xs"
                                        >
                                          {isActive ? 'Active' : 'Completed'}
                                        </Badge>
                                        <Text fontWeight="bold" fontSize="sm" color="gray.800">
                                          {production.name}
                                        </Text>
                                        <Text fontSize="xs" color="gray.500">#{production.id}</Text>
                                      </HStack>
                                      <HStack spacing={3}>
                                        <HStack spacing={1}>
                                          <Text fontWeight="bold" fontSize="md" color={`${scoreColor}.600`}>
                                            {score}%
                                          </Text>
                                          <Icon as={FaLeaf} boxSize={3} color={`${scoreColor}.500`} />
                                        </HStack>
                                        <AccordionIcon />
                                      </HStack>
                                    </HStack>
                                    <HStack spacing={4} fontSize="xs" color="gray.500">
                                      <Text>
                                        Started: {new Date(production.start_date).toLocaleDateString()}
                                      </Text>
                                      {production.finish_date && (
                                        <Text>
                                          Ended: {new Date(production.finish_date).toLocaleDateString()}
                                        </Text>
                                      )}
                                      <Text fontWeight="medium" color={`${scoreColor}.600`}>
                                        {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score > 0 ? 'Needs Improvement' : 'No Data'}
                                      </Text>
                                    </HStack>
                                  </VStack>
                                </AccordionButton>

                                <AccordionPanel pb={4} px={4} bg="white">
                                  {isExpanded && (
                                    <ProductionTransparencyDetail prodId={production.id} prodName={production.name} isActive={isActive} />
                                  )}

                                  {/* Consumer visibility controls */}
                                  <HStack
                                    mt={4}
                                    pt={3}
                                    borderTop="1px solid"
                                    borderTopColor="gray.100"
                                    justify="space-between"
                                    flexWrap="wrap"
                                    gap={2}
                                  >
                                    <HStack spacing={2}>
                                      <Text fontSize="xs" color="gray.500">Consumer Visible:</Text>
                                      {production.finish_date ? (
                                        <>
                                          <Switch
                                            colorScheme="green"
                                            isChecked={production.published}
                                            onChange={() => handleToggleProduction(production.id, production.published)}
                                            size="sm"
                                          />
                                          {production.published && (
                                            <Button
                                              size="xs"
                                              colorScheme="blue"
                                              variant="ghost"
                                              leftIcon={<FaExternalLinkAlt />}
                                              onClick={() =>
                                                window.open(
                                                  `http://consumer.localhost:3000/production/${production.id}`,
                                                  '_blank'
                                                )
                                              }
                                            >
                                              View QR
                                            </Button>
                                          )}
                                        </>
                                      ) : (
                                        <Text fontSize="xs" color="orange.500" fontWeight="medium">
                                          Complete production first
                                        </Text>
                                      )}
                                    </HStack>
                                  </HStack>
                                </AccordionPanel>
                              </>
                            )}
                          </AccordionItem>
                        );
                      })}
                  </Accordion>
                )}
              </Box>

              {/* Documentation Coverage - Establishment Average */}
              {transparencyMetrics?.transparency_breakdown &&
                Object.keys(transparencyMetrics.transparency_breakdown).length > 0 && (
                <Box>
                  <Heading size="md" color={titleColor} mb={1} fontSize={{ base: 'lg', md: 'xl' }}>
                    Documentation Coverage
                  </Heading>
                  <Text fontSize="sm" color="gray.500" mb={4}>
                    Establishment average across all productions. Expand each production above for specific details.
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    {Object.entries(transparencyMetrics.transparency_breakdown as Record<string, any>)
                      .sort(([a]: [string, any], [b]: [string, any]) =>
                        (CATEGORY_WEIGHTS[b] || 0) - (CATEGORY_WEIGHTS[a] || 0)
                      )
                      .map(([key, cat]: [string, any]) => {
                        const weight = CATEGORY_WEIGHTS[key] || 5;
                        const needsPhotos = cat.requires_photos && cat.photo_verification_rate < 80 && cat.actual_count > 0;
                        const isEmpty = cat.actual_count === 0;

                        return (
                          <Box
                            key={key}
                            p={3}
                            bg="gray.50"
                            borderRadius="lg"
                            border="1px solid"
                            borderColor={
                              cat.completeness_percentage >= 80
                                ? 'green.200'
                                : cat.completeness_percentage >= 50
                                ? 'yellow.200'
                                : cat.actual_count > 0
                                ? 'orange.200'
                                : 'gray.200'
                            }
                          >
                            <HStack justify="space-between" mb={2}>
                              <HStack spacing={2}>
                                <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                                  {cat.consumer_name || key}
                                </Text>
                                <Badge
                                  fontSize="2xs"
                                  colorScheme="gray"
                                  variant="outline"
                                  borderRadius="full"
                                >
                                  {weight}% weight
                                </Badge>
                              </HStack>
                              <Badge
                                colorScheme={
                                  cat.completeness_percentage >= 80
                                    ? 'green'
                                    : cat.completeness_percentage >= 50
                                    ? 'yellow'
                                    : cat.actual_count > 0
                                    ? 'orange'
                                    : 'gray'
                                }
                                fontSize="xs"
                              >
                                {cat.actual_count} event{cat.actual_count !== 1 ? 's' : ''}
                              </Badge>
                            </HStack>
                            <Progress
                              value={cat.completeness_percentage || 0}
                              colorScheme={
                                cat.completeness_percentage >= 80
                                  ? 'green'
                                  : cat.completeness_percentage >= 50
                                  ? 'yellow'
                                  : cat.actual_count > 0
                                  ? 'orange'
                                  : 'gray'
                              }
                              borderRadius="full"
                              size="sm"
                              mb={1}
                            />
                            <Text fontSize="xs" color="gray.500">
                              {cat.completeness_percentage >= 90
                                ? 'Fully documented'
                                : isEmpty
                                ? `Log 1+ events here for up to +${weight}% score`
                                : needsPhotos
                                ? `Add photos to unlock full +${weight}% contribution`
                                : cat.transparency_level || 'Documented'}
                            </Text>
                          </Box>
                        );
                      })}
                  </SimpleGrid>
                </Box>
              )}

              {/* Event Validation Opportunities - Specific Edit Links */}
              {sortedOpportunities.length > 0 && (
                <Box>
                  <HStack justify="space-between" align="center" mb={4} flexWrap="wrap" gap={2}>
                    <Heading size="md" color="orange.600" fontSize={{ base: 'lg', md: 'xl' }}>
                      <Icon as={FaExclamationTriangle} mr={2} />
                      Transparency Improvement Actions
                    </Heading>
                    {(() => {
                      const currentScore = Math.round(actualTransparencyScore * 100);
                      const totalImprovement = sortedOpportunities.reduce((sum: number, opp: any) => {
                        const match = (opp.potential_improvement || '').match(/\+?(\d+)/);
                        return sum + (match ? parseInt(match[1], 10) : 0);
                      }, 0);
                      const projectedScore = Math.min(currentScore + totalImprovement, 100);

                      if (totalImprovement > 0) {
                        return (
                          <Badge colorScheme="green" fontSize="sm" px={3} py={1} borderRadius="full">
                            {currentScore}% → could reach ~{projectedScore}%
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                  </HStack>
                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                    {sortedOpportunities.map((opportunity, index) => (
                      <Card
                        key={`${opportunity.priority}-${index}`}
                        bg="orange.50"
                        borderLeft="4px solid"
                        borderLeftColor="orange.400"
                        borderRadius="lg"
                        transition="all 0.2s"
                        _hover={{ bg: 'orange.75', borderLeftColor: 'orange.500' }}
                      >
                        <CardBody p={4}>
                          <VStack align="stretch" spacing={3}>
                            <HStack justify="space-between">
                              <Badge
                                colorScheme={
                                  (opportunity.priority || 'medium') === 'high'
                                    ? 'red'
                                    : (opportunity.priority || 'medium') === 'medium'
                                    ? 'orange'
                                    : 'yellow'
                                }
                                variant="solid"
                              >
                                {(opportunity.priority || 'medium') === 'high'
                                  ? 'URGENT'
                                  : (opportunity.priority || 'medium') === 'medium'
                                  ? 'IMPORTANT'
                                  : 'SUGGESTED'}
                              </Badge>
                              <Text fontSize="xs" color="gray.500" textTransform="uppercase">
                                {opportunity.type === 'photo_validation'
                                  ? 'Add Photos'
                                  : opportunity.type === 'usda_verification'
                                  ? 'Verify Products'
                                  : opportunity.type === 'blockchain_verification'
                                  ? 'Ultimate Trust'
                                  : 'Improve Transparency'}
                              </Text>
                            </HStack>

                            <Text fontWeight="bold" fontSize="sm" color={textColor}>
                              {opportunity.title ||
                                (opportunity.type === 'photo_validation'
                                  ? 'Add Photos to Your Events'
                                  : opportunity.type === 'usda_verification'
                                  ? 'Verify Your Products'
                                  : 'Improve Your Farm Transparency')}
                            </Text>

                            <Text fontSize="xs" color="gray.600" lineHeight="1.4">
                              {opportunity.description ||
                                (opportunity.type === 'photo_validation'
                                  ? 'Photos show consumers how you grow their food and build trust in your farming practices.'
                                  : opportunity.type === 'usda_verification'
                                  ? 'Comprehensive documentation proves your products are transparently tracked and increases consumer confidence.'
                                  : 'More transparency helps consumers trust your farming methods and choose your products.')}
                            </Text>

                            <HStack justify="space-between" mt={2}>
                              <Text fontSize="xs" color="green.600" fontWeight="medium">
                                💡 {opportunity.potential_improvement || '+15% transparency'}
                              </Text>
                              <Button
                                size="xs"
                                colorScheme="orange"
                                variant="solid"
                                leftIcon={<FaEdit />}
                                onClick={() => navigate(generateEditUrl(opportunity))}
                              >
                                Edit
                              </Button>
                            </HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </Box>
              )}

              {/* Environmental Impact Details - Collapsed by default */}
              {carbonSummary && (
                <Accordion allowToggle>
                  <AccordionItem border="none">
                    <AccordionButton
                      px={0}
                      py={3}
                      _hover={{ bg: 'transparent' }}
                    >
                      <HStack flex="1" textAlign="left" spacing={2}>
                        <Icon as={FaLeaf} color="gray.500" boxSize={4} />
                        <Text fontSize="md" color="gray.600" fontWeight="medium">
                          Environmental Impact Details
                        </Text>
                      </HStack>
                      <AccordionIcon color="gray.500" />
                    </AccordionButton>
                    <AccordionPanel px={0} pb={4}>
                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                        <Card bg="green.50" border="1px solid" borderColor="green.100" borderRadius="xl">
                          <CardBody p={4} textAlign="center">
                            <VStack spacing={2}>
                              <Icon as={FaLeaf} color="green.500" boxSize={6} />
                              <Text fontSize="xl" fontWeight="bold" color="green.700">
                                {carbonSummary.per_production?.toFixed(1) || '0.0'} kg
                              </Text>
                              <Text fontSize="sm" color="green.600">CO₂e per production</Text>
                            </VStack>
                          </CardBody>
                        </Card>
                        <Card bg="blue.50" border="1px solid" borderColor="blue.100" borderRadius="xl">
                          <CardBody p={4} textAlign="center">
                            <VStack spacing={2}>
                              <Icon as={FaDatabase} color="blue.500" boxSize={6} />
                              <Text fontSize="xl" fontWeight="bold" color="blue.700">
                                {carbonSummary.per_hectare?.toFixed(1) || '0.0'} kg
                              </Text>
                              <Text fontSize="sm" color="blue.600">CO₂e per hectare</Text>
                            </VStack>
                          </CardBody>
                        </Card>
                        <Card bg="purple.50" border="1px solid" borderColor="purple.100" borderRadius="xl">
                          <CardBody p={4} textAlign="center">
                            <VStack spacing={2}>
                              <Icon as={FaChartLine} color="purple.500" boxSize={6} />
                              <Text fontSize="xl" fontWeight="bold" color="purple.700">
                                {carbonSummary.net_carbon?.toFixed(1) || '0.0'} kg
                              </Text>
                              <Text fontSize="sm" color="purple.600">Net carbon impact</Text>
                            </VStack>
                          </CardBody>
                        </Card>
                      </SimpleGrid>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              )}

              {/* Transparency Information */}
              <Box p={4} bg="gray.50" borderRadius="xl">
                <Text fontSize="sm" color="gray.700" lineHeight="1.6" textAlign="center">
                  <Text as="span" fontWeight="bold">
                    Trazo showcases your existing farming practices
                  </Text>{' '}
                  to help consumers understand how their food is grown. The transparency score
                  reflects how well your agricultural practices are documented for consumer
                  confidence.
                </Text>
              </Box>
            </VStack>
          </CardBody>
        </Card>
      </Box>
    </Flex>
  );
}

export default TransparencyDashboard;
