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
  useDisclosure,
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
  Tooltip
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
  FaExternalLinkAlt
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import { useGetEstablishmentComprehensiveDashboardQuery } from 'store/api/dashboardMetricsApi';

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
  const { establishmentId } = useParams();
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

  // Basic responsive utilities - exact same as ProfileEstablishment
  const touchTargetSize = useBreakpointValue({ base: '48px', sm: '44px', md: '40px' });
  const isMobile = useBreakpointValue({ base: true, md: false });

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
      <Flex direction="column" alignSelf="center" justifySelf="center" overflow="hidden" w="100%" position="relative">
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
      <Flex direction="column" alignSelf="center" justifySelf="center" overflow="hidden" w="100%" position="relative">
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

  // FIX BACKEND DATA PROCESSING - Match actual API response structure
  // The transparency score is in transparencyMetrics, but metrics are in comprehensiveData
  const actualTransparencyScore = (transparencyMetrics?.overall_transparency_score || comprehensiveData?.transparency_percentage || 0) / 100;
  const totalVerifiedEvents = comprehensiveData?.total_verified_events || 0;
  const totalPhotos = comprehensiveData?.total_photos || 0;
  const totalProductions = comprehensiveData?.total_productions || 0;

  // Process event validation opportunities - Fix data source location
  const eventOpportunities = dashboardData?.missing_data_opportunities || comprehensiveData?.missing_data_opportunities || [];
  
  // DEBUG: Log the actual data structure with all levels
  console.log('🔍 DEBUG - eventOpportunities:', eventOpportunities);
  console.log('🔍 DEBUG - dashboardData keys:', Object.keys(dashboardData || {}));
  console.log('🔍 DEBUG - comprehensiveData keys:', Object.keys(comprehensiveData || {}));
  console.log('🔍 DEBUG - transparencyMetrics keys:', Object.keys(transparencyMetrics || {}));
  console.log('🔍 DEBUG - actualTransparencyScore:', actualTransparencyScore);
  console.log('🔍 DEBUG - totalProductions:', totalProductions);
  
  const priorityGroups = eventOpportunities.reduce((acc, opportunity) => {
    const priority = opportunity.priority || 'medium';
    if (!acc[priority]) {
      acc[priority] = [];
    }
    acc[priority].push(opportunity);
    return acc;
  }, {} as Record<string, typeof eventOpportunities>);

  const sortedOpportunities = ['high', 'medium', 'low'].flatMap(priority => 
    priorityGroups[priority] || []
  ).slice(0, 6); // Show top 6 opportunities

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
    <Flex direction="column" alignSelf="center" justifySelf="center" overflow="hidden" w="100%" position="relative">
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
                  <Card border="1px solid" borderColor="purple.100" bg="purple.25" borderRadius="xl">
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
                          value={(comprehensiveData?.verification_status?.blockchain_verified || 0) * 10} 
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
                  <Card border="1px solid" borderColor="orange.100" bg="orange.25" borderRadius="xl">
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
                        _hover={{ bg: 'orange.75', borderLeftColor: 'orange.500' }}
                      >
                        <CardBody p={4}>
                          <VStack align="stretch" spacing={3}>
                            <HStack justify="space-between">
                              <Badge 
                                colorScheme={
                                  (opportunity.priority || 'medium') === 'high' ? 'red' : 
                                  (opportunity.priority || 'medium') === 'medium' ? 'orange' : 'yellow'
                                }
                                variant="solid">
                                {(opportunity.priority || 'medium') === 'high' ? 'URGENT' :
                                 (opportunity.priority || 'medium') === 'medium' ? 'IMPORTANT' : 'SUGGESTED'}
                              </Badge>
                              <Text fontSize="xs" color="gray.500" textTransform="uppercase">
                                {opportunity.type === 'photo_validation' ? 'Add Photos' :
                                 opportunity.type === 'usda_verification' ? 'Verify Products' :
                                 opportunity.type === 'blockchain_verification' ? 'Ultimate Trust' :
                                 'Improve Transparency'}
                              </Text>
                            </HStack>
                            
                            <Text fontWeight="bold" fontSize="sm" color={textColor}>
                              {opportunity.title || 
                               (opportunity.type === 'photo_validation' ? 'Add Photos to Your Events' :
                                opportunity.type === 'usda_verification' ? 'Verify Your Products' :
                                'Improve Your Farm Transparency')}
                            </Text>
                            
                            <Text fontSize="xs" color="gray.600" lineHeight="1.4">
                              {opportunity.description || 
                               (opportunity.type === 'photo_validation' ? 'Photos show consumers how you grow their food and build trust in your farming practices.' :
                                opportunity.type === 'usda_verification' ? 'USDA verification proves your products are officially recognized and increases consumer confidence.' :
                                'More transparency helps consumers trust your farming methods and choose your products.')}
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

              {/* Carbon Impact Summary */}
              {carbonSummary && (
                <Box>
                  <Heading size="md" color={titleColor} mb={4} fontSize={{ base: 'lg', md: 'xl' }}>
                    Environmental Impact
                  </Heading>
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
                </Box>
              )}

              <Divider />

              {/* Action Center - Primary Actions */}
              <Box>
                <Heading size="lg" color={titleColor} mb={4} fontSize={{ base: 'xl', md: '2xl' }}>
                  <Icon as={FaRocket} mr={3} />
                  Take Action - Improve Your Transparency
                </Heading>
                
                <Text fontSize="md" color={textColor} mb={6} lineHeight="1.6">
                  Based on your current {Math.round(actualTransparencyScore * 100)}% transparency score, 
                  here are specific actions you can take to build more consumer trust.
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  
                  {/* Primary Action - Add Production */}
                  <Card bg="green.50" border="2px solid" borderColor="green.200" borderRadius="xl">
                    <CardBody p={6}>
                      <VStack spacing={4}>
                        <Circle size="60px" bg="green.500" color="white">
                          <Icon as={FaPlus} boxSize={6} />
                        </Circle>
                        <VStack spacing={2} textAlign="center">
                          <Text fontSize="lg" fontWeight="bold" color="green.700">
                            Add New Production
                          </Text>
                          <Text fontSize="sm" color="green.600">
                            Document more farming activities
                          </Text>
                          <Button 
                            colorScheme="green" 
                            size="sm"
                            rightIcon={<FaArrowRight />}
                            onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}/production/add`)}
                          >
                            Create Production
                          </Button>
                        </VStack>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Primary Action - Add Photos */}
                  <Card bg="blue.50" border="2px solid" borderColor="blue.200" borderRadius="xl">
                    <CardBody p={6}>
                      <VStack spacing={4}>
                        <Circle size="60px" bg="blue.500" color="white">
                          <Icon as={FaPhotoVideo} boxSize={6} />
                        </Circle>
                        <VStack spacing={2} textAlign="center">
                          <Text fontSize="lg" fontWeight="bold" color="blue.700">
                            Add Event Photos
                          </Text>
                          <Text fontSize="sm" color="blue.600">
                            Visual evidence builds trust
                          </Text>
                          <Button 
                            colorScheme="blue" 
                            size="sm"
                            rightIcon={<FaArrowRight />}
                            onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}/production`)}
                          >
                            Add Photos
                          </Button>
                        </VStack>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Primary Action - USDA Verification */}
                  <Card bg="purple.50" border="2px solid" borderColor="purple.200" borderRadius="xl">
                    <CardBody p={6}>
                      <VStack spacing={4}>
                        <Circle size="60px" bg="purple.500" color="white">
                          <Icon as={FaCertificate} boxSize={6} />
                        </Circle>
                        <VStack spacing={2} textAlign="center">
                          <Text fontSize="lg" fontWeight="bold" color="purple.700">
                            USDA Verification
                          </Text>
                          <Text fontSize="sm" color="purple.600">
                            Official product verification
                          </Text>
                          <Button 
                            colorScheme="purple" 
                            size="sm"
                            rightIcon={<FaArrowRight />}
                            onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}/change`)}
                          >
                            Get Verified
                          </Button>
                        </VStack>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Secondary Actions */}
                  <Card border="1px solid" borderColor="gray.200" borderRadius="xl">
                    <CardBody p={4}>
                      <VStack spacing={3}>
                        <HStack w="full" justify="space-between">
                          <HStack spacing={3}>
                            <Icon as={FaEye} color="teal.500" boxSize={5} />
                            <Text fontWeight="semibold" fontSize="sm">View Public Profile</Text>
                          </HStack>
                          <Button 
                            size="xs" 
                            variant="outline" 
                            colorScheme="teal"
                            rightIcon={<FaExternalLinkAlt />}
                            onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}`)}
                          >
                            View
                          </Button>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card border="1px solid" borderColor="gray.200" borderRadius="xl">
                    <CardBody p={4}>
                      <VStack spacing={3}>
                        <HStack w="full" justify="space-between">
                          <HStack spacing={3}>
                            <Icon as={FaShieldAlt} color="orange.500" boxSize={5} />
                            <Text fontWeight="semibold" fontSize="sm">Blockchain Verification</Text>
                          </HStack>
                          <Button 
                            size="xs" 
                            variant="outline" 
                            colorScheme="orange"
                            rightIcon={<FaArrowRight />}
                            isDisabled={!establishment?.company}
                            onClick={() => navigate(`/admin/dashboard/subscription`)}
                          >
                            Upgrade
                          </Button>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card border="1px solid" borderColor="gray.200" borderRadius="xl">
                    <CardBody p={4}>
                      <VStack spacing={3}>
                        <HStack w="full" justify="space-between">
                          <HStack spacing={3}>
                            <Icon as={FaChartLine} color="gray.500" boxSize={5} />
                            <Text fontWeight="semibold" fontSize="sm">Detailed Analytics</Text>
                          </HStack>
                          <Button 
                            size="xs" 
                            variant="outline" 
                            colorScheme="gray"
                            rightIcon={<FaArrowRight />}
                            onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}/analytics`)}
                          >
                            View
                          </Button>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>

                </SimpleGrid>
              </Box>

            </VStack>
          </CardBody>
        </Card>
      </Flex>
    </Flex>
  );
}

export default TransparencyDashboard;