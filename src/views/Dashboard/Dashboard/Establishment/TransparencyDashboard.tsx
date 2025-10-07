import React, { useEffect } from 'react';

// Chakra imports
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  VStack,
  useColorModeValue,
  Heading,
  Circle,
  useToast,
  useBreakpointValue,
  Spinner,
  Alert,
  AlertIcon,
  Progress,
  Divider,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Link,
  Tooltip,
  Switch,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer
} from '@chakra-ui/react';
import {
  FaLeaf,
  FaChartLine,
  FaEye,
  FaPlus,
  FaCertificate,
  FaShieldAlt,
  FaChevronLeft,
  FaExclamationTriangle,
  FaPhotoVideo,
  FaDatabase,
  FaCloudUploadAlt,
  FaEdit,
  FaRocket,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaArrowRight,
  FaExternalLinkAlt,
  FaTrophy,
  FaSeedling
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import { useGetEstablishmentComprehensiveDashboardQuery } from 'store/api/dashboardMetricsApi';
import { useGetTransparencyDetailsQuery } from 'store/api/transparencyQrApi';
import { useGetProductionsByEstablishmentQuery } from 'store/api/companyApi';
import { useUpdateProductionMutation } from 'store/api/historyApi.js';

// Add type for Redux state - exact same as ProfileEstablishment
interface RootState {
  company: {
    currentCompany: {
      id: string;
      name: string;
    };
  };
}

function TransparencyDashboard() {
  const navigate = useNavigate();
  const { establishmentId, parcelId, productionId } = useParams();
  const toast = useToast();

  const currentCompany = useSelector((state: RootState) => state.company.currentCompany);

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
  // This ensures producer dashboard shows SAME transparency score as consumer QR page
  const {
    data: transparencyApiData,
    error: transparencyError,
    isLoading: transparencyLoading
  } = useGetTransparencyDetailsQuery(
    productionId || '175', // Use productionId from URL params, or fallback to test production 175
    {
      skip: false, // Always try to get transparency data
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

  // Debug logging for productions data
  console.log('🔍 DEBUG - TransparencyDashboard Productions:', {
    establishmentId,
    establishmentIdNumber: Number(establishmentId),
    productions,
    isProductionsLoading,
    productionsError,
    productionsCount: productions?.length
  });

  // Force refetch productions data to ensure we get the latest enhanced data
  useEffect(() => {
    if (establishmentId && refetchProductions) {
      console.log('🔄 DEBUG - Forcing productions refetch for establishment:', establishmentId, 'Type:', typeof establishmentId);
      refetchProductions();
    }
  }, [establishmentId, refetchProductions]); // ✅ Fixed: Removed productions and isProductionsLoading from dependencies

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
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating production:', error);
      toast({
        title: 'Error',
        description: 'Failed to update production visibility',
        status: 'error',
        duration: 3000,
        isClosable: true,
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
        position="relative">
        <Box
          bg="linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)"
          pt={{ base: '140px', md: '100px' }}
          pb={{ base: '80px', md: '100px' }}
          px={{ base: 3, sm: 4, md: 4 }}
          position="relative">
          <Container maxW="6xl" mx="auto">
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
          </Container>
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
        position="relative">
        <Box
          bg="linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)"
          pt={{ base: '140px', md: '100px' }}
          pb={{ base: '80px', md: '100px' }}
          px={{ base: 3, sm: 4, md: 4 }}
          position="relative">
          <Container maxW="6xl" mx="auto">
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
          </Container>
        </Box>
      </Flex>
    );
  }

  const establishment = dashboardData?.establishment;
  const transparencyMetrics = dashboardData?.transparency_metrics;
  const comprehensiveData = dashboardData?.comprehensive_data;
  const carbonSummary = dashboardData?.carbon_summary;

  // ✅ 2025 BEST PRACTICE: Get transparency score using unified API (same as consumer page)
  const getTransparencyScore = (): number => {
    // PRIORITY 1: Use unified transparency API data (preferred for consistency)
    if (transparencyApiData?.quick_view?.transparency_score?.percentage) {
      return transparencyApiData.quick_view.transparency_score.percentage;
    }

    // PRIORITY 2: Use dashboard API transparency_metrics (secondary)
    if (
      transparencyMetrics?.overall_transparency_score !== undefined &&
      transparencyMetrics?.overall_transparency_score !== null
    ) {
      return transparencyMetrics.overall_transparency_score;
    }

    // PRIORITY 3: Use comprehensive dashboard API (fallback)
    if (
      comprehensiveData?.transparency_percentage !== undefined &&
      comprehensiveData?.transparency_percentage !== null
    ) {
      return comprehensiveData.transparency_percentage;
    }

    // NO CALCULATION FALLBACK - Return 0 to trigger loading state
    return 0;
  };

  const actualTransparencyScore = getTransparencyScore() / 100; // Convert to 0-1 range for display
  const totalVerifiedEvents = comprehensiveData?.total_verified_events || 0;
  const totalPhotos = comprehensiveData?.total_photos || 0;
  const totalProductions = comprehensiveData?.total_productions || 0;

  // Process event validation opportunities - Fix data source location
  const eventOpportunities =
    dashboardData?.missing_data_opportunities ||
    comprehensiveData?.missing_data_opportunities ||
    [];

  // DEBUG: Log the actual data structure with all levels + transparency API
  console.log('🔍 DEBUG - Producer Dashboard Transparency Resolution:');
  console.log(
    '📊 transparencyApiData?.quick_view?.transparency_score?.percentage:',
    transparencyApiData?.quick_view?.transparency_score?.percentage
  );
  console.log(
    '📊 transparencyMetrics?.overall_transparency_score:',
    transparencyMetrics?.overall_transparency_score
  );
  console.log(
    '📊 comprehensiveData?.transparency_percentage:',
    comprehensiveData?.transparency_percentage
  );
  console.log('✅ getTransparencyScore() result:', getTransparencyScore());
  console.log('🎯 actualTransparencyScore (display):', actualTransparencyScore);
  console.log('🔍 eventOpportunities:', eventOpportunities);
  console.log('🔍 dashboardData keys:', Object.keys(dashboardData || {}));
  console.log('🔍 transparencyApiData keys:', Object.keys(transparencyApiData || {}));
  console.log('🔍 totalProductions:', totalProductions);

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
      position="relative">
      {/* Clean Modern Header - EXACT SAME as ProfileEstablishment */}
      <Box
        bg="linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)"
        pt={{ base: '140px', md: '100px' }}
        pb={{ base: '80px', md: '100px' }}
        px={{ base: 3, sm: 4, md: 4 }}
        position="relative">
        <Container maxW="6xl" mx="auto">
          <VStack spacing={6} textAlign="center">
            {/* Back Button - EXACT SAME responsive positioning as ProfileEstablishment */}
            {isMobile ? (
              // Mobile: Back button above title with full width
              <VStack spacing={4} w="full" align="center">
                <Flex w="full" justify="flex-start">
                  <Button
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={() => navigate('/admin/dashboard')}
                    size="sm">
                    Back
                  </Button>
                </Flex>
              </VStack>
            ) : (
              // Desktop: Back button integrated with header
              <Flex w="full" justify="flex-start" mb={-4}>
                <Button
                  variant="outline"
                  leftIcon={<FaChevronLeft />}
                  onClick={() => navigate('/admin/dashboard')}
                  size="sm">
                  Back
                </Button>
              </Flex>
            )}

            {/* Main Title - EXACT SAME as ProfileEstablishment */}
            <VStack spacing={{ base: 4, sm: 3 }}>
              <Heading
                as="h1"
                size={{ base: 'lg', sm: 'xl', md: '2xl', lg: '2xl' }}
                color={titleColor}
                fontWeight="bold"
                textAlign="center"
                letterSpacing="-0.02em"
                px={{ base: 2, sm: 0 }}
                lineHeight={{ base: '1.1', sm: '1.2', md: '1.2' }}
                maxW={{ base: '90%', sm: '85%', md: '100%' }}
                noOfLines={{ base: 2, md: 3 }}>
                Transparency Dashboard
              </Heading>

              <Text
                fontSize={{ base: 'lg', sm: 'xl', md: 'lg' }}
                color="gray.600"
                fontWeight="normal"
                maxW={{ base: '95%', sm: '85%', lg: '60%' }}
                lineHeight={{ base: '1.6', md: '1.7' }}
                textAlign="center"
                px={{ base: 2, sm: 0 }}>
                Monitor and improve transparency for {establishment?.name || 'Loading...'}
              </Text>
            </VStack>

            {/* Quick Stats - EXACT SAME as ProfileEstablishment with Circle components */}
            <SimpleGrid
              columns={{ base: 2, md: 4 }}
              spacing={{ base: 4, sm: 6, md: 6 }}
              w="full"
              maxW="2xl"
              px={{ base: 2, sm: 0 }}>
              <VStack spacing={{ base: 3, sm: 2 }}>
                <Circle
                  size={{ base: '60px', sm: '50px' }}
                  bg="green.100"
                  color="green.600"
                  cursor="default">
                  <Icon as={FaLeaf} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: '2xl', sm: 'xl' }} fontWeight="bold" color="gray.800">
                    {Math.round(actualTransparencyScore * 100)}%
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Transparency
                  </Text>
                </VStack>
              </VStack>

              <VStack spacing={{ base: 3, sm: 2 }}>
                <Circle
                  size={{ base: '60px', sm: '50px' }}
                  bg="blue.100"
                  color="blue.600"
                  cursor="default">
                  <Icon as={FaCertificate} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: '2xl', sm: 'xl' }} fontWeight="bold" color="gray.800">
                    {totalVerifiedEvents}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Verified
                  </Text>
                </VStack>
              </VStack>

              <VStack spacing={{ base: 3, sm: 2 }}>
                <Circle
                  size={{ base: '60px', sm: '50px' }}
                  bg="purple.100"
                  color="purple.600"
                  cursor="default">
                  <Icon as={FaPhotoVideo} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: '2xl', sm: 'xl' }} fontWeight="bold" color="gray.800">
                    {totalPhotos}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Photos
                  </Text>
                </VStack>
              </VStack>

              <VStack spacing={{ base: 3, sm: 2 }}>
                <Circle
                  size={{ base: '60px', sm: '50px' }}
                  bg="orange.100"
                  color="orange.600"
                  cursor="default">
                  <Icon as={FaDatabase} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: '2xl', sm: 'xl' }} fontWeight="bold" color="gray.800">
                    {totalProductions}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Productions
                  </Text>
                </VStack>
              </VStack>
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Main Content Container - EXACT SAME as ProfileEstablishment */}
      <Flex
        alignItems="center"
        justifyContent="center"
        mb={{ base: '60px', md: '80px' }}
        mt="-60px"
        position="relative"
        zIndex={10}>
        <Card
          w={{ base: '100%', sm: '98%', md: '95%', lg: '90%', xl: '85%' }}
          p={cardPadding}
          boxShadow={{
            base: '0 8px 16px -4px rgba(0, 0, 0, 0.12)',
            md: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          borderRadius={mobileCardRadius}
          bg={bgColor}
          mx={{ base: 1, sm: 'auto' }}
          position="relative">
          {/* Header - EXACT SAME as ProfileEstablishment */}
          <CardHeader mb={{ base: '16px', md: '24px' }} position="relative">
            <VStack spacing={{ base: 4, md: 3 }} align="stretch">
              <Flex
                align="center"
                justify="space-between"
                flexWrap={{ base: 'wrap', md: 'nowrap' }}
                gap={{ base: 3, md: 4 }}>
                <Heading
                  color={textColor}
                  fontSize={headingSize}
                  fontWeight="bold"
                  textAlign={{ base: 'center', md: 'left' }}
                  flex="1">
                  Transparency Analytics & Action Center
                </Heading>
              </Flex>
            </VStack>
          </CardHeader>

          <CardBody>
            <VStack spacing={{ base: 6, md: 8 }} align="stretch">
              {/* Verification Status Overview */}
              <Box>
                <Heading size="md" color={titleColor} mb={4} fontSize={{ base: 'lg', md: 'xl' }}>
                  Verification Status
                </Heading>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                  {/* USDA Verification */}
                  <Card border="1px solid" borderColor="blue.100" bg="blue.25" borderRadius="xl">
                    <CardBody p={4}>
                      <VStack spacing={3} align="stretch">
                        <HStack justify="space-between">
                          <HStack spacing={2}>
                            <Icon as={FaCertificate} color="blue.500" boxSize={5} />
                            <Text fontWeight="semibold" color={textColor} fontSize="sm">
                              USDA Verified
                            </Text>
                          </HStack>
                          <Badge colorScheme="blue" variant="solid">
                            {comprehensiveData?.verification_status?.usda_verified || 0}
                          </Badge>
                        </HStack>
                        <Progress
                          value={(comprehensiveData?.verification_status?.usda_verified || 0) * 10}
                          colorScheme="blue"
                          borderRadius="full"
                          size="md"
                        />
                        {(comprehensiveData?.verification_status?.usda_verified || 0) === 0 ? (
                          <Text fontSize="xs" color="blue.600">
                            Add product verification to build consumer trust
                          </Text>
                        ) : (
                          <Text fontSize="xs" color="blue.600">
                            Your products are officially verified by USDA
                          </Text>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Blockchain Verification */}
                  <Card
                    border="1px solid"
                    borderColor="purple.100"
                    bg="purple.25"
                    borderRadius="xl">
                    <CardBody p={4}>
                      <VStack spacing={3} align="stretch">
                        <HStack justify="space-between">
                          <HStack spacing={2}>
                            <Icon as={FaShieldAlt} color="purple.500" boxSize={5} />
                            <Text fontWeight="semibold" color={textColor} fontSize="sm">
                              Blockchain
                            </Text>
                          </HStack>
                          <Badge colorScheme="purple" variant="solid">
                            {comprehensiveData?.verification_status?.blockchain_verified || 0}
                          </Badge>
                        </HStack>
                        <Progress
                          value={
                            (comprehensiveData?.verification_status?.blockchain_verified || 0) * 10
                          }
                          colorScheme="purple"
                          borderRadius="full"
                          size="md"
                        />
                        <Text fontSize="xs" color="purple.600">
                          Ultimate verification with subscription
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Photo Verification */}
                  <Card
                    border="1px solid"
                    borderColor="orange.100"
                    bg="orange.25"
                    borderRadius="xl">
                    <CardBody p={4}>
                      <VStack spacing={3} align="stretch">
                        <HStack justify="space-between">
                          <HStack spacing={2}>
                            <Icon as={FaPhotoVideo} color="orange.500" boxSize={5} />
                            <Text fontWeight="semibold" color={textColor} fontSize="sm">
                              Photo Verified
                            </Text>
                          </HStack>
                          <Badge colorScheme="orange" variant="solid">
                            {comprehensiveData?.verification_status?.photo_verified || 0}
                          </Badge>
                        </HStack>
                        <Progress
                          value={(comprehensiveData?.verification_status?.photo_verified || 0) * 2}
                          colorScheme="orange"
                          borderRadius="full"
                          size="md"
                        />
                        {(comprehensiveData?.verification_status?.photo_verified || 0) < 10 && (
                          <Text fontSize="xs" color="orange.600">
                            Add photos to build consumer trust
                          </Text>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                </SimpleGrid>
              </Box>

              {/* Event Validation Opportunities - Specific Edit Links */}
              {sortedOpportunities.length > 0 && (
                <Box>
                  <Heading size="md" color="orange.600" mb={4} fontSize={{ base: 'lg', md: 'xl' }}>
                    <Icon as={FaExclamationTriangle} mr={2} />
                    Transparency Improvement Actions
                  </Heading>
                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                    {sortedOpportunities.map((opportunity, index) => (
                      <Card
                        key={`${opportunity.priority}-${index}`}
                        bg="orange.50"
                        borderLeft="4px solid"
                        borderLeftColor="orange.400"
                        borderRadius="lg"
                        transition="all 0.2s"
                        _hover={{ bg: 'orange.75', borderLeftColor: 'orange.500' }}>
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
                                variant="solid">
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
                                  ? 'USDA verification proves your products are officially recognized and increases consumer confidence.'
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
                                onClick={() => navigate(generateEditUrl(opportunity))}>
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

              {/* Carbon Impact Summary */}
              {carbonSummary && (
                <Box>
                  <Heading size="md" color={titleColor} mb={4} fontSize={{ base: 'lg', md: 'xl' }}>
                    Environmental Impact
                  </Heading>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <Card
                      bg="green.50"
                      border="1px solid"
                      borderColor="green.100"
                      borderRadius="xl">
                      <CardBody p={4} textAlign="center">
                        <VStack spacing={2}>
                          <Icon as={FaLeaf} color="green.500" boxSize={6} />
                          <Text fontSize="xl" fontWeight="bold" color="green.700">
                            {carbonSummary.per_production?.toFixed(1) || '0.0'} kg
                          </Text>
                          <Text fontSize="sm" color="green.600">
                            CO₂e per production
                          </Text>
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
                          <Text fontSize="sm" color="blue.600">
                            CO₂e per hectare
                          </Text>
                        </VStack>
                      </CardBody>
                    </Card>

                    <Card
                      bg="purple.50"
                      border="1px solid"
                      borderColor="purple.100"
                      borderRadius="xl">
                      <CardBody p={4} textAlign="center">
                        <VStack spacing={2}>
                          <Icon as={FaChartLine} color="purple.500" boxSize={6} />
                          <Text fontSize="xl" fontWeight="bold" color="purple.700">
                            {carbonSummary.net_carbon?.toFixed(1) || '0.0'} kg
                          </Text>
                          <Text fontSize="sm" color="purple.600">
                            Net carbon impact
                          </Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  </SimpleGrid>
                </Box>
              )}

              <Divider />

              {/* Transparency Value Center - Focus on what Trazo actually provides */}
              <Box>
                <Heading size="lg" color={titleColor} mb={4} fontSize={{ base: 'xl', md: '2xl' }}>
                  <Icon as={FaTrophy} mr={3} />
                  Your Transparency Impact
                </Heading>

                <Text fontSize="md" color={textColor} mb={4} lineHeight="1.6">
                  Your {Math.round(actualTransparencyScore * 100)}% transparency score helps consumers understand your farming practices. 
                  Transparent farms see <Text as="span" fontWeight="bold" color="green.600">23% higher consumer engagement</Text> and 
                  <Text as="span" fontWeight="bold" color="green.600"> stronger market trust</Text>.
                </Text>
                
                <Text fontSize="sm" color="gray.600" mb={6} lineHeight="1.5">
                  Trazo showcases your existing farming practices to build consumer confidence in your agricultural methods.
                </Text>

                {/* Active Productions Section */}
                <Card bg="white" border="2px solid" borderColor="green.200" borderRadius="xl" mb={6}>
                  <CardHeader pb={4}>
                    <HStack spacing={3}>
                      <Icon as={FaEye} color="green.500" boxSize={6} />
                      <VStack align="start" spacing={0}>
                        <Text fontSize="lg" fontWeight="bold" color="green.700">
                          Active Production QR Pages
                        </Text>
                        <Text fontSize="sm" color="gray.600" fontWeight="normal">
                          Manage which productions are visible to consumers
                        </Text>
                      </VStack>
                    </HStack>
                  </CardHeader>
                  <CardBody pt={0}>
                    {isProductionsLoading ? (
                      <VStack spacing={4} py={8}>
                        <Spinner size="lg" color="green.500" />
                        <Text fontSize="sm" color="gray.600">Loading productions...</Text>
                      </VStack>
                    ) : productionsError ? (
                      <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        <VStack align="start" spacing={1}>
                          <Text fontSize="sm" fontWeight="semibold">Failed to load productions</Text>
                          <Text fontSize="xs" color="gray.600">Please try refreshing the page</Text>
                        </VStack>
                      </Alert>
                    ) : productions.length === 0 ? (
                      <VStack spacing={4} py={8}>
                        <Icon as={FaLeaf} boxSize={12} color="gray.400" />
                        <VStack spacing={2} textAlign="center">
                          <Text fontSize="md" fontWeight="semibold" color="gray.600">
                            No productions found
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            Create your first production to start tracking transparency
                          </Text>
                        </VStack>
                      </VStack>
                    ) : (
                      <TableContainer>
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr>
                              <Th>Production</Th>
                              <Th>Status</Th>
                              <Th>Transparency Score</Th>
                              <Th>Carbon Footprint</Th>
                              <Th>Start Date</Th>
                              <Th>Consumer Visible</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {productions.map((production: any) => (
                              <Tr 
                                key={production.id}
                                bg={production.finish_date ? "gray.50" : "green.50"}
                                borderLeft={production.finish_date ? "4px solid" : "4px solid"}
                                borderLeftColor={production.finish_date ? "gray.300" : "green.400"}
                                _hover={{
                                  bg: production.finish_date ? "gray.100" : "green.100"
                                }}
                              >
                                <Td>
                                  <VStack align="start" spacing={1}>
                                    <Text fontWeight="semibold" fontSize="sm">{production.name}</Text>
                                    <Text fontSize="xs" color="gray.500">ID: {production.id}</Text>
                                  </VStack>
                                </Td>
                                <Td>
                                  <VStack align="start" spacing={1}>
                                    <Badge 
                                      colorScheme={production.finish_date ? "gray" : "green"} 
                                      size="sm"
                                      variant={production.finish_date ? "subtle" : "solid"}
                                    >
                                      {production.finish_date ? "Completed" : "Active Production"}
                                    </Badge>
                                    {production.finish_date ? (
                                      <Text fontSize="xs" color="gray.500">
                                        Ended: {new Date(production.finish_date).toLocaleDateString()}
                                      </Text>
                                    ) : (
                                      <Text fontSize="xs" color="green.600" fontWeight="medium">
                                        In Progress
                                      </Text>
                                    )}
                                  </VStack>
                                </Td>
                                <Td>
                                  <VStack align="start" spacing={1}>
                                    <HStack spacing={1}>
                                      <Text fontSize="sm" fontWeight="semibold" color={
                                        production.transparency_score >= 80 ? "green.600" :
                                        production.transparency_score >= 60 ? "yellow.600" : "red.500"
                                      }>
                                        {production.transparency_score || 0}%
                                      </Text>
                                      <Icon as={FaLeaf} boxSize={3} color={
                                        production.transparency_score >= 80 ? "green.500" :
                                        production.transparency_score >= 60 ? "yellow.500" : "red.400"
                                      } />
                                    </HStack>
                                    <Text fontSize="xs" color="gray.500">
                                      {production.transparency_score >= 80 ? "Excellent" :
                                       production.transparency_score >= 60 ? "Good" : 
                                       production.transparency_score > 0 ? "Needs Improvement" : "No Data"}
                                    </Text>
                                  </VStack>
                                </Td>
                                <Td>
                                  <VStack align="start" spacing={1}>
                                    <HStack spacing={1}>
                                      <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                                        {production.carbon_footprint || 0}
                                      </Text>
                                      <Text fontSize="xs" color="gray.500">kg CO₂e</Text>
                                    </HStack>
                                    <Text fontSize="xs" color="gray.500">
                                      {production.carbon_footprint > 0 ? 
                                        (production.finish_date ? "Final" : "Estimated") : 
                                        "Calculating..."}
                                    </Text>
                                  </VStack>
                                </Td>
                                <Td>
                                  <Text fontSize="sm" color="gray.600">
                                    {new Date(production.start_date).toLocaleDateString()}
                                  </Text>
                                </Td>
                                <Td>
                                  <HStack spacing={2}>
                                    <Switch 
                                      colorScheme="green" 
                                      isChecked={production.published}
                                      onChange={() => handleToggleProduction(production.id, production.published)}
                                      size="sm" 
                                    />
                                    <Tooltip label="View Consumer Page">
                                      <Button
                                        size="xs"
                                        colorScheme="blue"
                                        variant="ghost"
                                        leftIcon={<FaExternalLinkAlt />}
                                        onClick={() => window.open(`http://consumer.localhost:3000/production/${production.id}`, '_blank')}
                                      >
                                        View QR
                                      </Button>
                                    </Tooltip>
                                  </HStack>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    )}
                  </CardBody>
                </Card>

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                  {/* Transparency Insights */}
                  <Card 
                    bg="gradient-to-br from-green.50 to-green.100" 
                    border="2px solid" 
                    borderColor="green.200" 
                    borderRadius="xl"
                    boxShadow="md"
                    position="relative"
                    overflow="hidden"
                  >
                    <CardBody p={6}>
                      <VStack spacing={4} align="stretch">
                        <HStack justify="space-between" align="start">
                          <VStack align="start" spacing={2} flex={1}>
                            <HStack spacing={2}>
                              <Icon as={FaChartLine} color="green.600" boxSize={5} />
                              <Text fontSize="md" fontWeight="bold" color="green.800">
                                Transparency Impact
                              </Text>
                            </HStack>
                            <Text fontSize="sm" color="green.700" lineHeight="1.5">
                              Your {Math.round(actualTransparencyScore * 100)}% transparency helps consumers see how their food is grown
                            </Text>
                          </VStack>
                          <Badge colorScheme="green" fontSize="xs" px={2} py={1}>
                            {Math.round(actualTransparencyScore * 100)}%
                          </Badge>
                        </HStack>
                        
                        <VStack spacing={3} align="stretch">
                          <Box bg="white" p={3} borderRadius="lg" border="1px solid" borderColor="green.200">
                            <HStack justify="space-between">
                              <Text fontSize="xs" color="gray.600">Consumer Engagement</Text>
                              <Text fontSize="xs" fontWeight="semibold" color="green.600">
                                +{(dashboardData?.transparency_metrics as any)?.transparency_analytics?.consumer_engagement_boost || 0}% higher
                              </Text>
                            </HStack>
                          </Box>
                          <Box bg="white" p={3} borderRadius="lg" border="1px solid" borderColor="green.200">
                            <HStack justify="space-between">
                              <Text fontSize="xs" color="gray.600">Market Trust Score</Text>
                              <Text fontSize="xs" fontWeight="semibold" color="green.600">
                                {(dashboardData?.transparency_metrics as any)?.transparency_analytics?.market_trust_score || 0}/100
                              </Text>
                            </HStack>
                          </Box>
                        </VStack>

                        <Button
                          size="sm"
                          colorScheme="green"
                          variant="solid"
                          rightIcon={<FaArrowRight />}
                          onClick={() => navigate(`/admin/dashboard/education`)}
                          _hover={{ transform: 'translateY(-1px)', boxShadow: 'lg' }}
                        >
                          Learn Best Practices
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Production Performance */}
                  <Card 
                    bg="gradient-to-br from-blue.50 to-blue.100" 
                    border="2px solid" 
                    borderColor="blue.200" 
                    borderRadius="xl"
                    boxShadow="md"
                    position="relative"
                    overflow="hidden"
                  >
                    <CardBody p={6}>
                      <VStack spacing={4} align="stretch">
                        <HStack justify="space-between" align="start">
                          <VStack align="start" spacing={2} flex={1}>
                            <HStack spacing={2}>
                              <Icon as={FaSeedling} color="blue.600" boxSize={5} />
                              <Text fontSize="md" fontWeight="bold" color="blue.800">
                                Production Insights
                              </Text>
                            </HStack>
                            <Text fontSize="sm" color="blue.700" lineHeight="1.5">
                              {totalProductions} production{totalProductions !== 1 ? 's' : ''} documented this season
                            </Text>
                          </VStack>
                          <Badge colorScheme="blue" fontSize="xs" px={2} py={1}>
                            {totalProductions} Total
                          </Badge>
                        </HStack>
                        
                        <VStack spacing={3} align="stretch">
                          <Box bg="white" p={3} borderRadius="lg" border="1px solid" borderColor="blue.200">
                            <HStack justify="space-between">
                              <Text fontSize="xs" color="gray.600">Average Carbon Score</Text>
                              <Text fontSize="xs" fontWeight="semibold" color="blue.600">
                                {productions.length > 0 ? 
                                  `${(productions.reduce((sum: number, p: any) => sum + (p.carbon_footprint || 0), 0) / productions.length).toFixed(1)} kg CO₂e` : 
                                  'Calculating...'
                                }
                              </Text>
                            </HStack>
                          </Box>
                          <Box bg="white" p={3} borderRadius="lg" border="1px solid" borderColor="blue.200">
                            <HStack justify="space-between">
                              <Text fontSize="xs" color="gray.600">Documentation Rate</Text>
                              <Text fontSize="xs" fontWeight="semibold" color="blue.600">
                                {Math.round(actualTransparencyScore * 100)}% Complete
                              </Text>
                            </HStack>
                          </Box>
                        </VStack>

                        <Button
                          size="sm"
                          colorScheme="blue"
                          variant="solid"
                          rightIcon={<FaArrowRight />}
                          onClick={() => window.open(`http://consumer.localhost:3000/production/${productions[0]?.id}`, '_blank')}
                          isDisabled={!productions.length}
                          _hover={{ transform: 'translateY(-1px)', boxShadow: 'lg' }}
                        >
                          View Consumer Page
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Next Steps */}
                  <Card 
                    bg="gradient-to-br from-purple.50 to-purple.100" 
                    border="2px solid" 
                    borderColor="purple.200" 
                    borderRadius="xl"
                    boxShadow="md"
                    position="relative"
                    overflow="hidden"
                  >
                    <CardBody p={6}>
                      <VStack spacing={4} align="stretch">
                        <HStack justify="space-between" align="start">
                          <VStack align="start" spacing={2} flex={1}>
                            <HStack spacing={2}>
                              <Icon as={FaRocket} color="purple.600" boxSize={5} />
                              <Text fontSize="md" fontWeight="bold" color="purple.800">
                                Next Steps
                              </Text>
                            </HStack>
                            <Text fontSize="sm" color="purple.700" lineHeight="1.5">
                              {actualTransparencyScore < 0.3 ? 
                                'Document more agricultural events to build trust' :
                                actualTransparencyScore < 0.7 ?
                                'Add photos and details to boost transparency' :
                                'Optimize consumer experience and market reach'
                              }
                            </Text>
                          </VStack>
                          <Badge 
                            colorScheme={actualTransparencyScore < 0.3 ? "red" : actualTransparencyScore < 0.7 ? "yellow" : "green"} 
                            fontSize="xs" px={2} py={1}
                          >
                            {actualTransparencyScore < 0.3 ? "Priority" : actualTransparencyScore < 0.7 ? "Medium" : "Optimized"}
                          </Badge>
                        </HStack>
                        
                        <VStack spacing={3} align="stretch">
                          <Box bg="white" p={3} borderRadius="lg" border="1px solid" borderColor="purple.200">
                            <HStack justify="space-between">
                              <Text fontSize="xs" color="gray.600">Recommended Action</Text>
                              <Text fontSize="xs" fontWeight="semibold" color="purple.600">
                                {(dashboardData?.transparency_metrics as any)?.transparency_analytics?.recommended_action || 
                                  (actualTransparencyScore < 0.3 ? 'Add 3+ events' : 
                                   actualTransparencyScore < 0.7 ? 'Upload photos' : 'Share QR codes')
                                }
                              </Text>
                            </HStack>
                          </Box>
                          <Box bg="white" p={3} borderRadius="lg" border="1px solid" borderColor="purple.200">
                            <HStack justify="space-between">
                              <Text fontSize="xs" color="gray.600">Potential Impact</Text>
                              <Text fontSize="xs" fontWeight="semibold" color="purple.600">
                                +{(dashboardData?.transparency_metrics as any)?.transparency_analytics?.potential_impact || 
                                   (actualTransparencyScore < 0.3 ? '30' : actualTransparencyScore < 0.7 ? '20' : '10')}% transparency
                              </Text>
                            </HStack>
                          </Box>
                        </VStack>

                        <Button
                          size="sm"
                          colorScheme="purple"
                          variant="solid"
                          rightIcon={<FaArrowRight />}
                          onClick={() => {
                            if (actualTransparencyScore < 0.7) {
                              navigate(`/admin/dashboard/establishment/${establishmentId}/change`);
                            } else {
                              navigate(`/admin/dashboard/subscription`);
                            }
                          }}
                          _hover={{ transform: 'translateY(-1px)', boxShadow: 'lg' }}
                        >
                          {actualTransparencyScore < 0.7 ? 'Improve Now' : 'Unlock Premium'}
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>
                </SimpleGrid>

                {/* Transparency Information */}
                <Box mt={6} p={4} bg="gray.50" borderRadius="xl">
                  <Text fontSize="sm" color="gray.700" lineHeight="1.6" textAlign="center">
                    <Text as="span" fontWeight="bold">Trazo showcases your existing farming practices</Text> to help consumers 
                    understand how their food is grown. The transparency score reflects how well your current agricultural 
                    information is documented and verified for consumer confidence.
                  </Text>
                </Box>
              </Box>
            </VStack>
          </CardBody>
        </Card>
      </Flex>

    </Flex>
  );
}

export default TransparencyDashboard;
