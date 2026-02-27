import React, { useEffect } from 'react';
import { useIntl } from 'react-intl';

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
  const intl = useIntl();
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
        title: !currentlyPublished ? intl.formatMessage({ id: 'transparency.productionActivated' }) : intl.formatMessage({ id: 'transparency.productionDeactivated' }),
        description: !currentlyPublished
          ? intl.formatMessage({ id: 'transparency.productionVisibleToConsumers' })
          : intl.formatMessage({ id: 'transparency.productionNotVisibleToConsumers' }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Error updating production:', error);
      toast({
        title: intl.formatMessage({ id: 'transparency.error' }),
        description: intl.formatMessage({ id: 'transparency.failedToUpdateVisibility' }),
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
                  {intl.formatMessage({ id: 'transparency.loadingTitle' })}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {intl.formatMessage({ id: 'transparency.loadingDescription' })}
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
                  <Text fontWeight="bold">{intl.formatMessage({ id: 'transparency.failedToLoad' })}</Text>
                  <Button size="sm" colorScheme="green" onClick={() => refetch()}>
                    {intl.formatMessage({ id: 'transparency.tryAgain' })}
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
    if (score < 60) return { target: 60, label: intl.formatMessage({ id: 'transparency.milestoneIndustryMinimum' }) };
    if (score < 80) return { target: 80, label: intl.formatMessage({ id: 'transparency.milestoneGoodPractice' }) };
    if (score < 90) return { target: 90, label: intl.formatMessage({ id: 'transparency.milestoneCertificationStandard' }) };
    if (score < 95) return { target: 95, label: intl.formatMessage({ id: 'transparency.milestoneExcellence' }) };
    return null; // Already excellent
  };

  // Consumer-friendly category names (matching backend transparency_calculator.py:515-556)
  const CATEGORY_CONSUMER_NAMES: Record<string, string> = {
    production: intl.formatMessage({ id: 'transparency.categoryGrowingPractices' }),
    chemical: intl.formatMessage({ id: 'transparency.categoryTreatmentDetails' }),
    soil: intl.formatMessage({ id: 'transparency.categorySoilCare' }),
    pest: intl.formatMessage({ id: 'transparency.categoryPestManagement' }),
    weather: intl.formatMessage({ id: 'transparency.categoryWeatherConditions' }),
    business: intl.formatMessage({ id: 'transparency.categoryCertifications' }),
    general: intl.formatMessage({ id: 'transparency.categoryAdditionalDetails' })
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
          <Text fontSize="sm" color="gray.500">{intl.formatMessage({ id: 'transparency.loadingDetails' })}</Text>
        </VStack>
      );
    }

    if (prodError || !prodData) {
      return (
        <Alert status="error" borderRadius="md" size="sm">
          <AlertIcon />
          <Text fontSize="sm">{intl.formatMessage({ id: 'transparency.failedToLoadDetails' })}</Text>
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
            {intl.formatMessage({ id: 'transparency.expectedEvents' }, { actual: actualEvents, expected: expectedEvents })}
          </Text>
          <Text fontSize="sm" color="gray.600">
            {intl.formatMessage({ id: 'transparency.farmingApproach' }, { approach: farmingApproach })}
          </Text>
          <Text fontSize="sm" fontWeight="medium" color={eventsWithPhotos > 0 ? 'green.600' : 'orange.600'}>
            {intl.formatMessage({ id: 'transparency.eventsHavePhotos' }, { withPhotos: eventsWithPhotos, total: totalTimelineEvents })}
          </Text>
        </HStack>

        {/* Per-production photo alert */}
        {eventsWithPhotos === 0 && categoriesNeedingPhotos.length > 0 && (
          <Alert status="warning" borderRadius="md" py={2}>
            <AlertIcon />
            <Text fontSize="sm" color="orange.700">
              {intl.formatMessage({ id: 'transparency.noPhotosAlert' }, { count: categoriesNeedingPhotos.length })}
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
                      {intl.formatMessage({ id: 'transparency.eventCount' }, { count: cat.actual_count })}
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
                      ? intl.formatMessage({ id: 'transparency.fullyDocumented' })
                      : isEmpty
                      ? intl.formatMessage({ id: 'transparency.logEventsForScore' }, { weight })
                      : (() => {
                          const tierSummary = cat.photo_tier_summary;
                          if (tierSummary) {
                            const essentialMissing = tierSummary.essential.total - tierSummary.essential.verified;
                            const recommendedMissing = tierSummary.recommended.total - tierSummary.recommended.verified;
                            if (essentialMissing > 0) {
                              return intl.formatMessage({ id: 'transparency.eventsRequirePhotos' }, { count: essentialMissing });
                            }
                            if (recommendedMissing > 0) {
                              return intl.formatMessage({ id: 'transparency.photosRecommended' }, { count: recommendedMissing });
                            }
                          } else if (needsPhotos) {
                            return intl.formatMessage({ id: 'transparency.eventsNeedPhotos' }, { count: eventsWithoutPhotos, weight });
                          }
                          return intl.formatMessage({ id: 'transparency.percentComplete' }, { percent: Math.round(completeness) });
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
              {intl.formatMessage({ id: 'transparency.addEvent' })}
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
              {intl.formatMessage({ id: 'transparency.addPhotos' })}
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
                {intl.formatMessage({ id: 'transparency.back' })}
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
                  {intl.formatMessage({ id: 'transparency.dashboardTitle' })}
                </Heading>

                <Text
                  fontSize="lg"
                  color="gray.600"
                  fontWeight="normal"
                  maxW="600px"
                  textAlign="center"
                >
                  {intl.formatMessage({ id: 'transparency.dashboardSubtitle' }, { name: establishment?.name || intl.formatMessage({ id: 'transparency.loading' }) })}
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
                  {intl.formatMessage({ id: 'transparency.overview' })}
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
                          {intl.formatMessage({ id: 'transparency.transparencyScore' })}
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
                          {intl.formatMessage({ id: 'transparency.eventsLogged' })}
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
                          {intl.formatMessage({ id: 'transparency.photosAdded' })}
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
                            <Text fontSize="xs" color="green.500">{intl.formatMessage({ id: 'transparency.statusActive' })}</Text>
                          </VStack>
                          <Text color="gray.300">|</Text>
                          <VStack spacing={0}>
                            <Text fontSize="lg" fontWeight="bold" color="orange.600">
                              {completedProductions}
                            </Text>
                            <Text fontSize="xs" color="orange.500">{intl.formatMessage({ id: 'transparency.statusCompleted' })}</Text>
                          </VStack>
                        </HStack>
                        <Text fontSize="sm" color="orange.600">
                          {intl.formatMessage({ id: 'transparency.productions' })}
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
                              {intl.formatMessage({ id: 'transparency.outstandingTitle' })}
                            </Text>
                            <Text fontSize="xs" color="green.600">
                              {intl.formatMessage({ id: 'transparency.outstandingDescription' })}
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
                  bottleneckText = intl.formatMessage({ id: 'transparency.addPhotosToEvents' }, { count: criticalCategories.length });
                } else if (emptyCategories.length > 0) {
                  const names = emptyCategories.map(([key]: [string, any]) => CATEGORY_CONSUMER_NAMES[key] || key).join(', ');
                  bottleneckText = intl.formatMessage({ id: 'transparency.startDocumenting' }, { names });
                }

                return (
                  <Card bg="blue.50" border="1px solid" borderColor="blue.200" borderRadius="xl">
                    <CardBody p={4}>
                      <VStack spacing={3} align="stretch">
                        <HStack spacing={3}>
                          <Icon as={FaBullseye} color="blue.500" boxSize={5} />
                          <VStack align="start" spacing={0} flex={1}>
                            <Text fontWeight="bold" color="blue.700" fontSize="sm">
                              {intl.formatMessage({ id: 'transparency.nextGoal' }, { label: milestone.label })}
                            </Text>
                            <Text fontSize="xs" color="blue.600">
                              {intl.formatMessage({ id: 'transparency.pointsToReach' }, { points: pointsNeeded, target: milestone.target })}
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
                            {intl.formatMessage({ id: 'transparency.topOpportunity' }, { text: bottleneckText })}
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
                      {intl.formatMessage({ id: 'transparency.noPhotosTitle' })}
                    </Text>
                    <Text fontSize="xs" color="orange.700" lineHeight="1.5">
                      {intl.formatMessage({ id: 'transparency.noPhotosDescription' }, { count: totalEvents })}
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
                    {intl.formatMessage({ id: 'transparency.addPhotos' })}
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
                          {intl.formatMessage({ id: 'transparency.blockchainVerified' })}
                        </Text>
                        <Text fontSize="xs" color="green.600">
                          {intl.formatMessage({ id: 'transparency.blockchainVerifiedCount' }, { count: blockchainVerified })}
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
                          {intl.formatMessage({ id: 'transparency.blockchainAvailable' })}
                        </Text>
                        <Text fontSize="xs" color="purple.600">
                          {intl.formatMessage({ id: 'transparency.blockchainAvailableDescription' })}
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
                        {intl.formatMessage({ id: 'transparency.learnMore' })}
                      </Button>
                    </HStack>
                  </CardBody>
                </Card>
              )}

              {/* Your Productions - Expandable Cards with Per-Production Breakdown */}
              <Box>
                <Heading size="md" color={titleColor} mb={2} fontSize={{ base: 'lg', md: 'xl' }}>
                  {intl.formatMessage({ id: 'transparency.yourProductions' })}
                </Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  {intl.formatMessage({ id: 'transparency.productionsHelp' })}
                </Text>

                {isProductionsLoading ? (
                  <VStack spacing={4} py={8}>
                    <Spinner size="lg" color="green.500" />
                    <Text fontSize="sm" color="gray.600">{intl.formatMessage({ id: 'transparency.loadingProductions' })}</Text>
                  </VStack>
                ) : productionsError ? (
                  <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm" fontWeight="semibold">{intl.formatMessage({ id: 'transparency.failedToLoadProductions' })}</Text>
                  </Alert>
                ) : productions.length === 0 ? (
                  <VStack spacing={4} py={8}>
                    <Icon as={FaLeaf} boxSize={12} color="gray.400" />
                    <Text fontSize="md" fontWeight="semibold" color="gray.600">{intl.formatMessage({ id: 'transparency.noProductionsFound' })}</Text>
                    <Text fontSize="sm" color="gray.500">{intl.formatMessage({ id: 'transparency.noProductionsHelp' })}</Text>
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
                                          {isActive ? intl.formatMessage({ id: 'transparency.statusActive' }) : intl.formatMessage({ id: 'transparency.statusCompleted' })}
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
                                        {intl.formatMessage({ id: 'transparency.started' }, { date: new Date(production.start_date).toLocaleDateString() })}
                                      </Text>
                                      {production.finish_date && (
                                        <Text>
                                          {intl.formatMessage({ id: 'transparency.ended' }, { date: new Date(production.finish_date).toLocaleDateString() })}
                                        </Text>
                                      )}
                                      <Text fontWeight="medium" color={`${scoreColor}.600`}>
                                        {score >= 80 ? intl.formatMessage({ id: 'transparency.levelExcellent' }) : score >= 60 ? intl.formatMessage({ id: 'transparency.levelGood' }) : score > 0 ? intl.formatMessage({ id: 'transparency.levelNeedsImprovement' }) : intl.formatMessage({ id: 'transparency.levelNoData' })}
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
                                      <Text fontSize="xs" color="gray.500">{intl.formatMessage({ id: 'transparency.consumerVisible' })}</Text>
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
                                                  `http://consumer.localhost:3000/production/${production.public_id || production.id}`,
                                                  '_blank'
                                                )
                                              }
                                            >
                                              {intl.formatMessage({ id: 'transparency.viewQR' })}
                                            </Button>
                                          )}
                                        </>
                                      ) : (
                                        <Text fontSize="xs" color="orange.500" fontWeight="medium">
                                          {intl.formatMessage({ id: 'transparency.completeProductionFirst' })}
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
                    {intl.formatMessage({ id: 'transparency.documentationCoverage' })}
                  </Heading>
                  <Text fontSize="sm" color="gray.500" mb={4}>
                    {intl.formatMessage({ id: 'transparency.documentationCoverageHelp' })}
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
                                  {CATEGORY_CONSUMER_NAMES[key] || key}
                                </Text>
                                <Badge
                                  fontSize="2xs"
                                  colorScheme="gray"
                                  variant="outline"
                                  borderRadius="full"
                                >
                                  {intl.formatMessage({ id: 'transparency.weightLabel' }, { weight })}
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
                                {intl.formatMessage({ id: 'transparency.eventCount' }, { count: cat.actual_count })}
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
                                ? intl.formatMessage({ id: 'transparency.fullyDocumented' })
                                : isEmpty
                                ? intl.formatMessage({ id: 'transparency.logEventsForScoreEstablishment' }, { weight })
                                : needsPhotos
                                ? intl.formatMessage({ id: 'transparency.addPhotosForContribution' }, { weight })
                                : (() => {
                                    const levelMap: Record<string, string> = {
                                      'Fully documented': 'transparency.levelFullyDocumented',
                                      'Well documented': 'transparency.levelWellDocumented',
                                      'Partially documented': 'transparency.levelPartiallyDocumented',
                                      'Limited documentation': 'transparency.levelLimitedDocumentation'
                                    };
                                    const levelKey = levelMap[cat.transparency_level];
                                    return levelKey ? intl.formatMessage({ id: levelKey }) : intl.formatMessage({ id: 'transparency.documented' });
                                  })()}
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
                      {intl.formatMessage({ id: 'transparency.improvementActions' })}
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
                            {intl.formatMessage({ id: 'transparency.scoreProjection' }, { current: currentScore, projected: projectedScore })}
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
                                  ? intl.formatMessage({ id: 'transparency.priorityUrgent' })
                                  : (opportunity.priority || 'medium') === 'medium'
                                  ? intl.formatMessage({ id: 'transparency.priorityImportant' })
                                  : intl.formatMessage({ id: 'transparency.prioritySuggested' })}
                              </Badge>
                              <Text fontSize="xs" color="gray.500" textTransform="uppercase">
                                {opportunity.type === 'photo_validation'
                                  ? intl.formatMessage({ id: 'transparency.typeAddPhotos' })
                                  : opportunity.type === 'usda_verification'
                                  ? intl.formatMessage({ id: 'transparency.typeVerifyProducts' })
                                  : opportunity.type === 'blockchain_verification'
                                  ? intl.formatMessage({ id: 'transparency.typeUltimateTrust' })
                                  : intl.formatMessage({ id: 'transparency.typeImproveTransparency' })}
                              </Text>
                            </HStack>

                            <Text fontWeight="bold" fontSize="sm" color={textColor}>
                              {(() => {
                                if (opportunity.type === 'production_specific' && opportunity.production_id) {
                                  // Extract crop type from backend title "Production #ID - CropType"
                                  const cropMatch = (opportunity.title || '').match(/- (.+)$/);
                                  const cropType = cropMatch ? cropMatch[1] : '';
                                  return intl.formatMessage({ id: 'transparency.opportunityProductionTitle' }, { id: opportunity.production_id, cropType });
                                }
                                if (opportunity.type === 'create_production') return intl.formatMessage({ id: 'transparency.opportunityStartFirst' });
                                if (opportunity.type === 'create_new_production') return intl.formatMessage({ id: 'transparency.opportunityNewSeason' });
                                if (opportunity.type === 'continuous_improvement') return intl.formatMessage({ id: 'transparency.opportunityExcellent' });
                                if (opportunity.type === 'photo_validation') return intl.formatMessage({ id: 'transparency.defaultTitlePhotos' });
                                if (opportunity.type === 'usda_verification') return intl.formatMessage({ id: 'transparency.defaultTitleVerify' });
                                return intl.formatMessage({ id: 'transparency.defaultTitleImprove' });
                              })()}
                            </Text>

                            <Text fontSize="xs" color="gray.600" lineHeight="1.4">
                              {(() => {
                                if (opportunity.type === 'create_production') return intl.formatMessage({ id: 'transparency.opportunityStartFirstDesc' });
                                if (opportunity.type === 'create_new_production') return intl.formatMessage({ id: 'transparency.opportunityNewSeasonDesc' });
                                if (opportunity.type === 'continuous_improvement') return intl.formatMessage({ id: 'transparency.opportunityExcellentDesc' });
                                if (!opportunity.description) {
                                  if (opportunity.type === 'photo_validation') return intl.formatMessage({ id: 'transparency.defaultDescPhotos' });
                                  if (opportunity.type === 'usda_verification') return intl.formatMessage({ id: 'transparency.defaultDescVerify' });
                                  return intl.formatMessage({ id: 'transparency.defaultDescImprove' });
                                }
                                // For production_specific, translate "Missing:" prefix
                                const desc = opportunity.description || '';
                                if (desc.startsWith('Missing: ')) {
                                  return intl.formatMessage({ id: 'transparency.opportunityMissingPrefix' }, { details: desc.replace('Missing: ', '') });
                                }
                                return desc;
                              })()}
                            </Text>

                            <HStack justify="space-between" mt={2}>
                              <Text fontSize="xs" color="green.600" fontWeight="medium">
                                💡 {(() => {
                                  const imp = opportunity.potential_improvement || '';
                                  // Translate "+N% transparency" pattern
                                  const match = imp.match(/\+(\d+)%\s*transparency/);
                                  if (match) {
                                    return `+${match[1]}% ${intl.formatMessage({ id: 'transparency.opportunityImprovementSuffix' })}`;
                                  }
                                  return imp || intl.formatMessage({ id: 'transparency.defaultImprovement' });
                                })()}
                              </Text>
                              <Button
                                size="xs"
                                colorScheme="orange"
                                variant="solid"
                                leftIcon={<FaEdit />}
                                onClick={() => navigate(generateEditUrl(opportunity))}
                              >
                                {intl.formatMessage({ id: 'transparency.edit' })}
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
                          {intl.formatMessage({ id: 'transparency.environmentalImpact' })}
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
                              <Text fontSize="sm" color="green.600">{intl.formatMessage({ id: 'transparency.co2ePerProduction' })}</Text>
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
                              <Text fontSize="sm" color="blue.600">{intl.formatMessage({ id: 'transparency.co2ePerHectare' })}</Text>
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
                              <Text fontSize="sm" color="purple.600">{intl.formatMessage({ id: 'transparency.netCarbonImpact' })}</Text>
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
                    {intl.formatMessage({ id: 'transparency.footerBold' })}
                  </Text>{' '}
                  {intl.formatMessage({ id: 'transparency.footerText' })}
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
