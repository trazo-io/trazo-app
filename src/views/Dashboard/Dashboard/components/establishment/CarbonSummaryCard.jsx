import React from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Button,
  useColorModeValue,
  Spinner,
  Progress,
  HStack,
  VStack,
  Icon,
  SimpleGrid,
  Divider
} from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import { FaClipboardList } from 'react-icons/fa';
import { MdEco } from 'react-icons/md';
import { useGetCarbonFootprintSummaryQuery } from 'store/api/companyApi';
import { useGetEstablishmentComprehensiveDashboardQuery } from 'store/api/dashboardMetricsApi';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';

const TransparencySummaryCard = ({ establishmentId }) => {
  const intl = useIntl();
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  // Get company from Redux state
  const activeCompany = useSelector((state) => state.company.currentCompany);
  const companyId = activeCompany?.id;

  // Get comprehensive transparency data (primary source)
  const {
    data: comprehensiveData,
    isLoading: isLoadingComprehensive,
    isFetching: isFetchingComprehensive,
    isError: isErrorComprehensive
  } = useGetEstablishmentComprehensiveDashboardQuery(
    { companyId, establishmentId },
    {
      refetchOnMountOrArgChange: true,
      skip: !companyId || !establishmentId
    }
  );

  // Get carbon data for environmental impact section (fallback)
  const {
    data: carbonData,
    isLoading: isLoadingCarbon,
    isFetching: isFetchingCarbon,
    isError: isErrorCarbon
  } = useGetCarbonFootprintSummaryQuery(
    { establishmentId, year },
    { refetchOnMountOrArgChange: true }
  );

  // Use comprehensive data as primary source, carbon data as fallback
  const data = comprehensiveData || carbonData;
  const isLoading = isLoadingComprehensive || isLoadingCarbon;
  const isFetching = isFetchingComprehensive || isFetchingCarbon;
  const isError = isErrorComprehensive && isErrorCarbon;

  // Skip transparency API call for establishment level
  // This API is for production-level transparency, not establishment-level
  // We'll use carbon data to estimate transparency at establishment level
  const transparencyData = null; // Placeholder - API needs production ID, not establishment ID

  // Calculate transparency metrics - PRIMARY FOCUS
  const getTransparencyScore = () => {
    // Use comprehensive dashboard data if available (nested structure)
    const compData = comprehensiveData?.comprehensive_data;
    if (compData?.transparency_percentage !== undefined) {

      return compData.transparency_percentage;
    }

    // Fallback to carbon data calculation
    const eventCount = data?.entries_count?.total || 0;
    const photoCount = getPhotoCount();
    const productionCount = getActiveProductionsCount();

    // Dynamic transparency calculation based on actual establishment activity
    const baseScore = Math.min(60, (eventCount / 10) * 60); // Events contribute up to 60%
    const photoBonus = Math.min(20, (photoCount / 5) * 20); // Photos contribute up to 20%
    const productionBonus = Math.min(20, (productionCount / 3) * 20); // Productions contribute up to 20%

    const calculated = Math.min(100, Math.round(baseScore + photoBonus + productionBonus));
    return calculated;
  };

  const getEventCount = () => {
    // Use comprehensive dashboard data if available (nested structure)
    const compData = comprehensiveData?.comprehensive_data;
    if (compData?.total_events !== undefined) {
      return compData.total_events;
    }
    // Fallback to carbon data
    return carbonData?.entries_count?.total || 0;
  };

  const getPhotoCount = () => {
    // Use comprehensive dashboard data if available (nested structure)
    const compData = comprehensiveData?.comprehensive_data;
    if (compData?.total_photos !== undefined) {

      return compData.total_photos;
    }

    // Try alternative field names in comprehensiveData root
    if (comprehensiveData) {
      const possiblePhotoFields = [
        'total_photos',
        'photos_count',
        'total_photo_count',
        'photo_count',
        'documented_photos'
      ];
      for (const field of possiblePhotoFields) {
        if (comprehensiveData[field] !== undefined) {
          return comprehensiveData[field];
        }
      }
    }

    // Fallback to carbon data
    return carbonData?.photos_count || 0;
  };

  const getActiveProductionsCount = () => {
    // Use comprehensive dashboard data if available (nested structure)
    const compData = comprehensiveData?.comprehensive_data;

    // FIX: Prioritize active_productions (only productions without finish_date)
    // The UI label says "Producciones Activas" so we should show active only
    if (compData?.active_productions !== undefined) {
      return compData.active_productions;
    }

    // Fallback to total_productions if active not available
    if (compData?.total_productions !== undefined) {
      return compData.total_productions;
    }

    // Fallback to carbon data
    return carbonData?.active_productions_count || 0;
  };

  const getVerificationStatus = () => {
    // Check comprehensive dashboard verification data (nested structure)
    let verificationData = comprehensiveData?.verification_breakdown;

    // If not found at root, check in transparency_metrics
    if (!verificationData && comprehensiveData?.transparency_metrics) {
      verificationData = comprehensiveData.transparency_metrics.verification_breakdown;
    }

    // Also check comprehensive_data.verification_status as fallback
    if (!verificationData && comprehensiveData?.comprehensive_data?.verification_status) {
      verificationData = comprehensiveData.comprehensive_data.verification_status;
    }

    // Transparency journey progression:
    // Blockchain = highest level (immutable, tamper-proof record)
    // Complete documentation = strong transparency
    // In progress = still building documentation
    if (verificationData?.blockchain_verified > 0 || data?.blockchain_verified) {
      return intl.formatMessage({ id: 'dashboard.verificationBlockchain' });
    }

    const score = getTransparencyScore();

    if (score >= 80) {
      return intl.formatMessage({ id: 'dashboard.verificationComplete' });
    }
    if (score >= 50) {
      return intl.formatMessage({ id: 'dashboard.verificationAdvanced' });
    }
    return intl.formatMessage({ id: 'dashboard.verificationInProgress' });
  };

  // Get carbon data (for environmental impact section)
  const getCarbonData = () => {
    // Try comprehensive data first (flat structure may not have carbon_summary)
    if (comprehensiveData?.carbon_summary?.net_carbon !== undefined) {
      return comprehensiveData.carbon_summary.net_carbon;
    }
    // Fallback to carbon endpoint data
    return carbonData?.net_carbon || 0;
  };

  const getTransparencyMessage = (score) => {
    if (score >= 95) return intl.formatMessage({ id: 'dashboard.transparencyComplete' });
    if (score >= 85) return intl.formatMessage({ id: 'dashboard.excellentDocumentation' });
    if (score >= 70) return intl.formatMessage({ id: 'dashboard.goodTransparency' });
    if (score >= 50) return intl.formatMessage({ id: 'dashboard.basicTransparency' });
    return intl.formatMessage({ id: 'dashboard.buildingTransparency' });
  };

  if (isLoading || isFetching) {
    return (
      <Card bg={bgColor} p={6} borderRadius="15px">
        <VStack spacing={4}>
          <Spinner size="sm" color="green.500" />
        </VStack>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card bg={bgColor} p={6} borderRadius="15px">
        <VStack spacing={4}>
          <Icon as={MdEco} color="red.500" boxSize={8} />
          <Text color="red.500" textAlign="center">
            {intl.formatMessage({ id: 'dashboard.errorLoadingTransparency' })}
          </Text>
          <Button
            size="sm"
            colorScheme="red"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            {intl.formatMessage({ id: 'app.retry' })}
          </Button>
        </VStack>
      </Card>
    );
  }

  return (
    <Card
      bg={bgColor}
      p={{ base: 4, md: 6 }}
      borderRadius="xl"
      className="trazo-card"
      boxShadow="md"
    >
      <CardHeader p={0} mb={{ base: 4, md: 4 }}>
        <Flex direction="column">
          <HStack spacing={2} align="center">
            <Icon as={FaClipboardList} color="green.500" boxSize={{ base: 5, md: 6 }} />
            <Text fontSize={{ base: 'xl', md: 'xl' }} color="gray.700" fontWeight="700">
              {getTransparencyMessage(getTransparencyScore())}
            </Text>
          </HStack>
          <Text fontSize={{ base: 'sm', md: 'sm' }} color="gray.500" fontWeight="400" ml={7}>
            {intl.formatMessage({ id: 'dashboard.establishmentDocumentation' })}
          </Text>
        </Flex>
      </CardHeader>
      <CardBody px={0}>
        {/* PRIMARY: Transparency Metrics - Mobile Optimized */}
        <SimpleGrid columns={{ base: 1, md: 5 }} spacing={{ base: 4, md: 3 }}>
          <Box
            textAlign="center"
            p={{ base: 4, md: 2 }}
            bg={{ base: 'green.50', md: 'transparent' }}
            borderRadius={{ base: 'lg', md: 'none' }}
            border={{ base: '1px solid', md: 'none' }}
            borderColor={{ base: 'green.200', md: 'transparent' }}
          >
            <Stat>
              <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                {intl.formatMessage({ id: 'dashboard.transparencyScore' })}
              </StatLabel>
              <StatNumber fontSize={{ base: 'lg', md: 'xl' }} color="green.500" fontWeight="bold">
                {getTransparencyScore()}%
              </StatNumber>
              <StatHelpText fontSize={{ base: 'sm', md: 'xs' }} mt={1}>
{intl.formatMessage({ id: 'dashboard.completeDocumentation' })}
              </StatHelpText>
            </Stat>
          </Box>
          <Box
            textAlign="center"
            p={{ base: 4, md: 2 }}
            bg={{ base: 'blue.50', md: 'transparent' }}
            borderRadius={{ base: 'lg', md: 'none' }}
            border={{ base: '1px solid', md: 'none' }}
            borderColor={{ base: 'blue.200', md: 'transparent' }}
          >
            <Stat>
              <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                {intl.formatMessage({ id: 'dashboard.documentedEvents' })}
              </StatLabel>
              <StatNumber fontSize={{ base: 'lg', md: 'xl' }} color="blue.500" fontWeight="bold">
                {getEventCount()}
              </StatNumber>
              <StatHelpText fontSize={{ base: 'sm', md: 'xs' }} mt={1}>
{intl.formatMessage({ id: 'dashboard.registeredActivities' })}
              </StatHelpText>
            </Stat>
          </Box>
          <Box
            textAlign="center"
            p={{ base: 4, md: 2 }}
            bg={{ base: 'orange.50', md: 'transparent' }}
            borderRadius={{ base: 'lg', md: 'none' }}
            border={{ base: '1px solid', md: 'none' }}
            borderColor={{ base: 'orange.200', md: 'transparent' }}
          >
            <Stat>
              <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                {intl.formatMessage({ id: 'dashboard.documentedPhotos' })}
              </StatLabel>
              <StatNumber fontSize={{ base: 'lg', md: 'xl' }} color="orange.500" fontWeight="bold">
                {getPhotoCount()}
              </StatNumber>
              <StatHelpText fontSize={{ base: 'sm', md: 'xs' }} mt={1}>
{intl.formatMessage({ id: 'dashboard.visualEvidence' })}
              </StatHelpText>
            </Stat>
          </Box>
          <Box
            textAlign="center"
            p={{ base: 4, md: 2 }}
            bg={{ base: 'teal.50', md: 'transparent' }}
            borderRadius={{ base: 'lg', md: 'none' }}
            border={{ base: '1px solid', md: 'none' }}
            borderColor={{ base: 'teal.200', md: 'transparent' }}
          >
            <Stat>
              <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                {intl.formatMessage({ id: 'dashboard.activeProductions' })}
              </StatLabel>
              <StatNumber fontSize={{ base: 'lg', md: 'xl' }} color="teal.500" fontWeight="bold">
                {getActiveProductionsCount()}
              </StatNumber>
              <StatHelpText fontSize={{ base: 'sm', md: 'xs' }} mt={1}>
{intl.formatMessage({ id: 'dashboard.transparencyCycles' })}
              </StatHelpText>
            </Stat>
          </Box>
          <Box
            textAlign="center"
            p={{ base: 4, md: 2 }}
            bg={{ base: 'purple.50', md: 'transparent' }}
            borderRadius={{ base: 'lg', md: 'none' }}
            border={{ base: '1px solid', md: 'none' }}
            borderColor={{ base: 'purple.200', md: 'transparent' }}
          >
            <Stat>
              <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                {intl.formatMessage({ id: 'dashboard.transparency' })}
              </StatLabel>
              <StatNumber fontSize={{ base: 'lg', md: 'xl' }} color="green.500" fontWeight="bold">
                {getVerificationStatus()}
              </StatNumber>
              <StatHelpText fontSize={{ base: 'sm', md: 'xs' }} mt={1}>
                <Icon as={FaClipboardList} /> {intl.formatMessage({ id: 'dashboard.documentationLevel' })}
              </StatHelpText>
            </Stat>
          </Box>
        </SimpleGrid>

        {/* Divider */}
        <Divider my={{ base: 3, md: 4 }} />

        {/* PRIMARY: Transparency Progress Section */}
        <Box mb={{ base: 2, md: 2 }}>
          <Heading
            size={{ base: 'xs', md: 'sm' }}
            mb={{ base: 2, md: 3 }}
            color="green.700"
            fontWeight="600"
          >
            {intl.formatMessage({ id: 'dashboard.transparencyProgress' })}
          </Heading>
          <Progress
            value={getTransparencyScore()}
            colorScheme={getTransparencyScore() >= 80 ? 'green' : 'blue'}
            size={{ base: 'md', md: 'lg' }}
            borderRadius="md"
            mb={{ base: 2, md: 3 }}
            height={{ base: '12px', md: '16px' }}
            bg="gray.100"
          />
          <Text
            textAlign="center"
            fontSize={{ base: 'xs', md: 'sm' }}
            color="gray.600"
            fontWeight="500"
          >
            {intl.formatMessage({ id: 'dashboard.documentationCompletePercent' }, { score: getTransparencyScore() })}
            {getTransparencyScore() >= 95 && (
              <Text as="span" color="green.500" fontWeight="bold">
                {intl.formatMessage({ id: 'dashboard.certifiedTransparency' })}
              </Text>
            )}
          </Text>
        </Box>

        {/* SECONDARY: Environmental Impact Section */}
        <Divider my={{ base: 3, md: 4 }} />

        <Box mb={{ base: 2, md: 2 }}>
          <Heading
            size={{ base: 'xs', md: 'sm' }}
            mb={{ base: 2, md: 3 }}
            color="gray.600"
            fontWeight="500"
          >
            {intl.formatMessage({ id: 'dashboard.environmentalImpactLabel' })}
          </Heading>
          <VStack spacing={2}>
            <HStack justify="space-between" w="full" fontSize="sm">
              <Text color="gray.600">{intl.formatMessage({ id: 'dashboard.netFootprint' })}</Text>
              <Text fontWeight="medium" color={getCarbonData() >= 0 ? 'orange.600' : 'green.600'}>
                {intl.formatMessage({ id: 'dashboard.kgCO2e' }, { value: getCarbonData().toFixed(2) })}
              </Text>
            </HStack>
          </VStack>
        </Box>

      </CardBody>
    </Card>
  );
};

export default TransparencySummaryCard;
