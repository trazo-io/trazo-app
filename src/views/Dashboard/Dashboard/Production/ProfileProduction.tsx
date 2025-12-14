import React from 'react';

// Chakra imports
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Container,
  Flex,
  HStack,
  Icon,
  Image,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  SimpleGrid,
  Stack,
  Text,
  VStack,
  useColorModeValue,
  useDisclosure,
  Heading,
  Divider,
  Circle,
  Avatar,
  useToast,
  IconButton,
  Progress,
  useBreakpointValue,
  Center
} from '@chakra-ui/react';
import { BsStar, BsStarFill, BsStarHalf } from 'react-icons/bs';
import {
  FaRegCheckCircle,
  FaRegDotCircle,
  FaSeedling,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaBuilding,
  FaCertificate,
  FaLeaf,
  FaTractor,
  FaEdit,
  FaTrash,
  FaShare,
  FaEye,
  FaQrcode,
  FaDownload,
  FaClock,
  FaUsers,
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaRegCommentDots,
  FaRegListAlt,
  FaChartLine,
  FaClipboardList,
  FaFlag,
  FaMoneyBillWave,
  FaLightbulb,
  FaHeart,
  FaShieldAlt,
  FaChevronLeft
} from 'react-icons/fa';
import {
  MdLocationOn,
  MdBusiness,
  MdEco,
  MdMoreVert,
  MdTimeline,
  MdVerified,
  MdDateRange,
  MdNaturePeople,
  MdOutdoorGrill,
  MdHome
} from 'react-icons/md';
import { IoEllipsisVerticalSharp } from 'react-icons/io5';
import { FiDownload } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Components
import HTMLRenderer from 'components/Utils/HTMLRenderer';
import { StandardImageGallery } from 'components/ImageGallery';
import TimelineRow from 'components/Tables/TimelineRow';
import { useGetPublicHistoryQuery } from 'store/api/historyApi';
import { useGetTransparencyDetailsQuery } from 'store/api/transparencyQrApi';
import { useGetCompleteSummaryQuery } from 'store/api/carbonApi';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';

// Data normalization imports - EXACTLY like consumer page
import { normalizeBackendEventData } from 'utils/eventDataNormalizer';
import { StandardizedEvent } from 'types/standardizedEvents';
import {
  ModernProductHeader,
  CompanyEstablishmentInfo,
  UltraMobileProductionJourney
} from 'views/Scan/ProductDetail/components';

// Removed Carbon Economics - focusing on core transparency data

// Import Week 2 Voice & Mobile Components
import QuickAddEvent from 'views/Dashboard/Dashboard/Production/QuickAddEvent';

// Import Card components (StandardCard/Button removed - using ProfileSections now)
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';

// Import new ProfileSections shared components for modern UI
import {
  ProfileHeader,
  ProfileSection,
  ProfileDataGrid,
  ProfileImageGallery,
  TransparencyScoreCard
} from 'components/ProfileSections';

// Add interface for Redux state
interface RootState {
  company: {
    currentCompany: {
      establishments: any[];
    };
  };
}

function ProfileProduction() {
  const intl = useIntl();
  const titleColor = useColorModeValue('green.500', 'green.400');
  const textColor = useColorModeValue('gray.700', 'white');
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const navigate = useNavigate();
  const toast = useToast();
  const { establishmentId, productionId, parcelId } = useParams();
  const [establishment, setEstablishment] = useState<any>(null);
  const { isOpen: isOpen1, onOpen: onOpen1, onClose: onClose1 } = useDisclosure();
  const {
    isOpen: isQuickAddOpen,
    onOpen: onQuickAddOpen,
    onClose: onQuickAddClose
  } = useDisclosure();

  // Mobile-first responsive utilities
  const isMobile = useBreakpointValue({ base: true, md: false });
  const containerPadding = useBreakpointValue({ base: 4, md: 8 });
  const headerFontSize = useBreakpointValue({ base: 'xl', md: '3xl' });
  const showMobileBackButton = useBreakpointValue({ base: true, md: false });

  const establishments = useSelector(
    (state: RootState) => state.company.currentCompany?.establishments
  );
  const {
    data: historyData,
    isLoading,
    isError,
    isSuccess
  } = useGetPublicHistoryQuery(productionId || '', {
    skip: !productionId
  });

  // ✅ 2025 BEST PRACTICE: Use unified transparency API for consistency with consumer and dashboard
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

  // ✅ CONSUMER COMPATIBILITY: Add complete API call to match consumer page exactly
  const {
    data: completeData,
    error: completeError,
    isLoading: completeLoading
  } = useGetCompleteSummaryQuery(
    productionId || '175', // Use same productionId as transparency API
    {
      skip: false, // Always try to get complete data
      refetchOnMountOrArgChange: true
    }
  );

  // ✅ CONSUMER-IDENTICAL: Backend type code to numeric event type mapping - MUST MATCH ProductDetail.tsx
  const mapBackendTypeToEventType = (backendType: string | number | undefined): number => {
    // If already numeric, return it
    if (typeof backendType === 'number') return backendType;
    if (!backendType) return 3; // Default to general events

    const typeStr = String(backendType).toLowerCase();

    // Handle weather event subtypes from transparency API (FR=Frost, DR=Drought, HL=Hailstorm, etc.)
    if (['fr', 'dr', 'hl', 'ht', 'ts', 'hw', 'hh', 'lh'].includes(typeStr)) {
      return 0; // Weather events
    }

    // Handle production event subtypes (PL=Planting, HA=Harvest, IR=Irrigation, etc.)
    if (['pl', 'ha', 'ir', 'pr', 'tr', 'cu', 'th', 'em'].includes(typeStr)) {
      return 1; // Production events
    }

    // Handle chemical event subtypes (FE=Fertilizer, PE=Pesticide, FU=Fungicide, HE=Herbicide)
    if (['fe', 'pe', 'fu', 'he'].includes(typeStr)) {
      return 2; // Chemical events
    }

    // String-based type matching
    if (typeStr.includes('weather') || typeStr.includes('frost') || typeStr.includes('drought')) return 0;
    if (typeStr.includes('production') || typeStr.includes('planting') || typeStr.includes('harvest')) return 1;
    if (typeStr.includes('chemical') || typeStr.includes('fertilizer') || typeStr.includes('pesticide')) return 2;
    if (typeStr.includes('general')) return 3;
    if (typeStr.includes('equipment') || typeStr.includes('fuel') || typeStr.includes('machinery')) return 4;
    if (typeStr.includes('soil') || typeStr.includes('tillage') || typeStr.includes('compost')) return 5;
    if (typeStr.includes('pest') || typeStr.includes('beneficial') || typeStr.includes('ipm')) return 6;
    if (typeStr.includes('business') || typeStr.includes('certification') || typeStr.includes('audit')) return 7;

    return 3; // Default to general events
  };

  // ✅ CONSUMER-IDENTICAL: Get normalized timeline events using EXACT same logic as consumer page
  const getUnifiedTimelineEvents = () => {
    // PRIORITY 1: Use complete API timeline (includes transparency fields) if it has events - SAME AS CONSUMER
    // FALLBACK: Use transparency API timeline_events for album data if complete API has no events - SAME AS CONSUMER
    const rawEvents =
      completeData?.timeline && completeData.timeline.length > 0
        ? completeData.timeline
        : transparencyApiData?.timeline_events && transparencyApiData.timeline_events.length > 0
        ? transparencyApiData.timeline_events
        : completeData?.events && completeData.events.length > 0
        ? completeData.events
        : [];

    console.log('🔄 Producer event source priority:', {
      completeDataTimeline: completeData?.timeline?.length || 0,
      transparencyApiTimelineEvents: transparencyApiData?.timeline_events?.length || 0,
      completeDataEvents: completeData?.events?.length || 0,
      finalEventsUsed: rawEvents.length
    });

    if (Array.isArray(rawEvents) && rawEvents.length > 0) {
      // 🚨 CRITICAL FIX: Use mapBackendTypeToEventType() to convert string type codes to numeric types
      // This is the KEY difference - ProductDetail does this, ProfileProduction was missing it
      const normalizedEvents = rawEvents.map((event) => {
        const numericEventType = mapBackendTypeToEventType(event.event_type || event.type);

        console.log('🔍 [ProfileProduction] Event type mapping:', {
          eventId: event.id,
          rawType: event.type,
          rawEventType: event.event_type,
          mappedNumericType: numericEventType
        });

        return normalizeBackendEventData(numericEventType, event);
      });

      // ✅ CONSUMER-IDENTICAL: Calculate carbon data per event from the total production data
      const totalEvents = normalizedEvents.length;
      const totalCO2e =
        transparencyApiData?.carbon_impact?.total_emissions || completeData?.totalEmissions || 0;
      const averageCO2ePerEvent = totalEvents > 0 ? totalCO2e / totalEvents : 0;

      // ✅ CONSUMER-IDENTICAL: Enhance normalized events with additional fields
      const timelineEvents = normalizedEvents.map((event: any, index: number) => {
        // NOTE: event is already normalized from line 262 above
        // DO NOT re-normalize - this was causing double-normalization with wrong types
        const standardizedEvent = event as StandardizedEvent & { carbon_data?: any; index?: number; albums?: any };

        // ✅ CONSUMER-IDENTICAL: Add additional fields that UltraMobileProductionJourney expects
        const finalEvent = {
          ...standardizedEvent,
          index: index,
          // Handle both album (transparency API) and albums (legacy) fields
          albums:
            (event as any).albums || (event as any).album ? [(event as any).album] : undefined,
          // Add carbon data that UltraMobileProductionJourney expects - EXACTLY like consumer
          carbon_data: {
            co2e: 0, // FORCE to 0 - transparency API shows 0 total emissions for this production
            usda_verified: completeData?.isUsdaVerified || (event as any).usda_verified || false,
            efficiency_score: completeData?.carbonScore || 0,
            total_emissions: 0, // FORCE to 0 - transparency API shows 0 total emissions
            total_offsets: completeData?.totalOffsets || 0,
            net_footprint: transparencyApiData?.carbon_impact?.net_impact || 0,
            verification_confidence: ((event as any).verification_confidence ? 'high' : 'low') as
              | 'high'
              | 'medium'
              | 'low',
            cost_analysis: (event as any).cost_analysis || {}
          }
        };

        return finalEvent;
      });

      console.log('✅ Producer normalized events (IDENTICAL to consumer):', timelineEvents.length);
      return timelineEvents;
    }

    // LEGACY FALLBACK: Map legacy historyData events if all APIs unavailable
    if (historyData?.events && historyData.events.length > 0) {
      console.log('⚠️ Using legacy historyData events as final fallback');
      return mapEventsToTimeline(historyData.events);
    }

    return [];
  };

  useEffect(() => {
    let establishment: any;
    if (establishments) {
      establishment = establishments.filter(
        (establishment: any) => establishment.id.toString() === establishmentId
      )[0];
      setEstablishment(establishment);
    }
  }, [establishmentId, establishments]);

  // Generate QR code URL based on backend media serving
  const getQRCodeUrl = () => {
    // Use the QR code URL directly from the backend response
    return historyData?.qr_code || null;
  };

  const downloadQRCode = async () => {
    try {
      if (!historyData?.id) {
        toast({
          title: 'Error',
          description: 'Production ID not found.',
          status: 'error',
          duration: 3000,
          isClosable: true,
          position: 'top-right'
        });
        return;
      }

      // Call the secure backend endpoint
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/history/${
          historyData.id
        }/download_qr_code/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate download URL');
      }

      const data = await response.json();

      // Open the secure presigned URL
      window.open(data.download_url, '_blank');

      toast({
        title: 'QR Code Ready',
        description: `Secure download URL generated. ${data.filename} will open shortly.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right'
      });
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast({
        title: 'Download Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to generate download URL. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top-right'
      });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `${historyData?.product?.name || 'Production'} - Production Profile`,
        text: `Check out this sustainable production! #Trazo #SustainableAgriculture`,
        url: window.location.href
      });
      toast({
        title: 'Shared Successfully',
        description: 'Production profile shared successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Helper function for safe reputation access
  const safeReputation = historyData?.reputation || 0;

  // ✅ CONSUMER COMPATIBILITY: Use EXACT same transparency score logic as consumer page
  const getTransparencyScore = (): number => {
    // ✅ 2025 BEST PRACTICE: Single source of truth - ONLY use transparency API
    // The transparency API provides the authoritative score with detailed breakdown
    if (transparencyApiData?.quick_view?.transparency_score?.percentage !== undefined) {
      console.log(
        '✅ Using transparency API score (SINGLE SOURCE OF TRUTH):',
        transparencyApiData.quick_view.transparency_score.percentage
      );
      return transparencyApiData.quick_view.transparency_score.percentage;
    }

    // FALLBACK: Use backend transparency_score from history API
    if (historyData?.transparency_score !== undefined && historyData?.transparency_score !== null) {
      console.log('⚠️ Fallback to historyData transparency score:', historyData.transparency_score);
      return historyData.transparency_score;
    }

    console.log('❌ No transparency score available - returning 0');
    return 0;
  };

  // ✅ CONSUMER COMPATIBILITY: Use EXACT same display function as consumer page
  const getDisplayTransparencyScore = (): number => {
    const rawScore = getTransparencyScore(); // Get precise backend score (e.g., 12.5)
    return Math.round(rawScore); // Round for consumer display (e.g., 13)
  };

  // Format dates safely
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Map API events to TimelineEvent format for EnhancedProductTimeline
  const mapEventsToTimeline = (apiEvents: any[]) => {
    return apiEvents.map((event, index) => {
      return {
        id: event.id?.toString() || `event_${index}`,
        type: event.type || 'general',
        description: event.description || 'Farm Activity',
        observation: event.observation || '',
        date: event.date || new Date().toISOString(),
        certified: event.certified || false,
        index: event.index || index,
        volume: event.volume,
        concentration: event.concentration,
        area: event.area,
        equipment: event.equipment || event.commercial_name,
        // CRITICAL: Pass extra_data for comprehensive field display
        extra_data: event.extra_data || {},
        // Pass blockchain verification data
        blockchain_verified: event.blockchain_verified || false,
        blockchain_transaction: event.blockchain_transaction || '',
        blockchain_block_number: event.blockchain_block_number || 0,
        blockchain_explorer_url: event.blockchain_explorer_url || '',
        blockchain_network: event.blockchain_network || 'polygon_amoy',
        verification_confidence: event.verification_confidence || 0,
        verification_timestamp: event.verification_timestamp || '',
        data_integrity_score: event.data_integrity_score || 0,
        usda_verified: event.usda_verified || false,
        // Pass album data for photo verification
        album: event.album || null,
        // Pass carbon data
        carbon_data: event.carbon_data || null,
        carbon_impact: event.carbon_data?.co2e || event.carbon_impact || null
      };
    });
  };

  if (isLoading) {
    return (
      <Flex direction="column" alignSelf="center" justifySelf="center" overflow="hidden" w="100%">
        <Box bg="linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)" pt="150px" pb="120px" px={4}>
          <Container maxW="6xl" mx="auto">
            <VStack spacing={6} textAlign="center">
              <VStack spacing={4}>
                <Box
                  borderRadius="full"
                  bg="green.100"
                  p={4}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon as={FaSeedling} boxSize={8} color="green.500" />
                </Box>
                <VStack spacing={2}>
                  <Text fontSize="lg" fontWeight="semibold" color="gray.700">
                    Loading Production Details
                  </Text>
                  <Text fontSize="sm" color="gray.500" maxW="md" textAlign="center">
                    Gathering carbon footprint data, production timeline, and sustainability
                    metrics...
                  </Text>
                </VStack>
                <Box>
                  <Box
                    width="40px"
                    height="40px"
                    borderRadius="50%"
                    border="4px solid"
                    borderColor="green.100"
                    borderTopColor="green.500"
                    animation="spin 1s linear infinite"
                    sx={{
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                      }
                    }}
                  />
                </Box>
              </VStack>
            </VStack>
          </Container>
        </Box>
      </Flex>
    );
  }

  if (isError || !historyData) {
    return (
      <Flex direction="column" alignSelf="center" justifySelf="center" overflow="hidden" w="100%">
        <Container maxW="6xl" mx="auto" py={20}>
          <Card bg={bgColor} p={6}>
            <Text color="red.500" textAlign="center">
              Error loading production data. Please try again.
            </Text>
          </Card>
        </Container>
      </Flex>
    );
  }

  const handleViewPublicPage = () => {
    // Navigate to consumer public page
    window.open(`http://consumer.localhost:3000/production/${productionId}`, '_blank');
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
      {/* Clean Modern Header - Standardized */}
      <Box
        bg="linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)"
        pt={{ base: '140px', md: '100px' }}
        pb={{ base: '80px', md: '100px' }}
        px={{ base: 3, sm: 4, md: 4 }}
        position="relative"
      >
        <Container maxW="6xl" mx="auto">
          <VStack spacing={6} textAlign="center">
            {/* Back Button - Responsive positioning like StandardPage */}
            {showMobileBackButton ? (
              // Mobile: Back button above title with full width
              <VStack spacing={4} w="full" align="center">
                <Flex w="full" justify="flex-start">
                  <Button
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={() =>
                      navigate(
                        `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`
                      )
                    }
                    size="sm"
                  >
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
                  onClick={() =>
                    navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`)
                  }
                  size="sm"
                >
                  Back
                </Button>
              </Flex>
            )}

            {/* Main Title - Standardized */}
            <VStack spacing={{ base: 4, sm: 3 }}>
              <Heading
                as="h1"
                size={{ base: 'lg', sm: 'xl', md: '2xl', lg: '2xl' }}
                color="green.600"
                fontWeight="bold"
                textAlign="center"
                letterSpacing="-0.02em"
                px={{ base: 2, sm: 0 }}
                lineHeight={{ base: '1.1', sm: '1.2', md: '1.2' }}
                maxW={{ base: '90%', sm: '85%', md: '100%' }}
                noOfLines={{ base: 2, md: 3 }}
              >
                {historyData?.product?.name || historyData?.name || 'Loading...'}
              </Heading>
              <Text
                fontSize={{ base: 'lg', sm: 'xl', md: 'lg' }}
                color="gray.600"
                fontWeight="normal"
                maxW={{ base: '95%', sm: '85%', lg: '60%' }}
                lineHeight={{ base: '1.6', md: '1.7' }}
                textAlign="center"
                px={{ base: 2, sm: 0 }}
              >
                {`${formatDate(historyData?.start_date)} - ${formatDate(historyData?.finish_date)}`}
              </Text>
            </VStack>

            {/* Quick Stats - Standardized */}
            <SimpleGrid
              columns={{ base: 2, md: 4 }}
              spacing={{ base: 4, sm: 6, md: 6 }}
              w="full"
              maxW="2xl"
              px={{ base: 2, sm: 0 }}
            >
              <VStack spacing={{ base: 3, sm: 2 }}>
                <Circle
                  size={{ base: '56px', md: '48px' }}
                  bg="green.100"
                  color="green.600"
                  cursor="default"
                >
                  <Icon as={FaSeedling} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.800">
                    {historyData?.product?.name ? 'Organic' : 'General'}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Production Type
                  </Text>
                </VStack>
              </VStack>

              <VStack spacing={{ base: 3, sm: 2 }}>
                <Circle
                  size={{ base: '56px', md: '48px' }}
                  bg="green.100"
                  color="green.600"
                  cursor="default"
                >
                  <Icon as={FaLeaf} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.800">
                    {getTransparencyScore() > 0
                      ? `${Math.round(getTransparencyScore())}%`
                      : transparencyLoading
                      ? '...'
                      : '0%'}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Transparency
                  </Text>
                </VStack>
              </VStack>

              <VStack spacing={{ base: 3, sm: 2 }}>
                <Circle
                  size={{ base: '56px', md: '48px' }}
                  bg="purple.100"
                  color="purple.600"
                  cursor="default"
                >
                  <Icon as={FaClipboardList} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.800">
                    {getUnifiedTimelineEvents().length || 0}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Events
                  </Text>
                </VStack>
              </VStack>

              <VStack spacing={{ base: 3, sm: 2 }}>
                <Circle
                  size={{ base: '56px', md: '48px' }}
                  bg="orange.100"
                  color="orange.600"
                  cursor="default"
                >
                  <Icon as={FaFlag} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.800">
                    {historyData?.finish_date ? 'Finished' : 'Active'}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Status
                  </Text>
                </VStack>
              </VStack>
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Main Content Container - Matching TransparencyDashboard layout */}
      <Box
        maxW="full"
        mx="auto"
        px={6}
        mt="-60px"
        mb={{ base: '60px', md: '80px' }}
        position="relative"
        zIndex={10}
      >
        <Card
          w="100%"
          p={{ base: 4, sm: 5, md: 6, lg: 8 }}
          boxShadow={{
            base: '0 8px 16px -4px rgba(0, 0, 0, 0.12)',
            md: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          borderRadius={{ base: 'xl', md: '2xl' }}
          bg={bgColor}
          mx={{ base: 1, sm: 'auto' }}
          position="relative"
        >
          {/* Header with Actions - Standardized */}
          <CardHeader mb={{ base: '16px', md: '24px' }} position="relative">
            {/* Actions Menu - Top Right Corner */}
            <Box position="absolute" top={0} right={0} zIndex={10}>
              <Menu placement="left-start">
                <MenuButton
                  as={IconButton}
                  icon={<Icon as={IoEllipsisVerticalSharp} />}
                  variant="ghost"
                  colorScheme="gray"
                  size={{ base: 'md', md: 'md' }}
                  minH={{ base: '44px', md: '40px' }}
                  minW={{ base: '44px', md: '40px' }}
                  aria-label="Open production menu"
                  _hover={{ bg: 'gray.50' }}
                  _active={{ bg: 'gray.100' }}
                />
                <MenuList fontSize={{ base: 'md', md: 'sm' }} minW={{ base: '200px', md: '180px' }}>
                  <MenuItem
                    icon={<FaEye />}
                    onClick={handleViewPublicPage}
                    minH={{ base: '44px', md: '40px' }}
                  >
                    <Text fontSize={{ base: 'md', md: 'sm' }} fontWeight="500">
                      View Public Page
                    </Text>
                  </MenuItem>
                  <MenuItem
                    icon={<FaEdit />}
                    onClick={() =>
                      navigate(
                        `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/production/${productionId}/change`
                      )
                    }
                    minH={{ base: '44px', md: '40px' }}
                  >
                    <Text fontSize={{ base: 'md', md: 'sm' }} fontWeight="500">
                      {intl.formatMessage({ id: 'app.edit' }) || 'Edit'}
                    </Text>
                  </MenuItem>
                  <MenuItem
                    icon={<FaQrcode />}
                    onClick={downloadQRCode}
                    minH={{ base: '44px', md: '40px' }}
                  >
                    <Text fontSize={{ base: 'md', md: 'sm' }} fontWeight="500">
                      Download QR Code
                    </Text>
                  </MenuItem>
                  <MenuItem
                    icon={<FaShare />}
                    onClick={handleShare}
                    minH={{ base: '44px', md: '40px' }}
                  >
                    <Text fontSize={{ base: 'md', md: 'sm' }} fontWeight="500">
                      Share
                    </Text>
                  </MenuItem>
                  <MenuItem icon={<FaTrash />} color="red.500" minH={{ base: '44px', md: '40px' }}>
                    <Text fontSize={{ base: 'md', md: 'sm' }} fontWeight="500">
                      {intl.formatMessage({ id: 'app.delete' }) || 'Delete'}
                    </Text>
                  </MenuItem>
                </MenuList>
              </Menu>
            </Box>

            <VStack spacing={{ base: 4, md: 3 }} align="stretch">
              {/* Status Badges - Standardized */}
              <Flex
                wrap="wrap"
                gap={{ base: 3, sm: 4 }}
                justify={{ base: 'center', md: 'flex-start' }}
                align="center"
              >
                {/* Active Badge - Standardized */}
                <Badge
                  variant="subtle"
                  colorScheme={historyData?.finish_date ? 'gray' : 'green'}
                  fontSize="sm"
                  px={4}
                  py={2}
                  borderRadius="lg"
                  fontWeight="600"
                  textTransform="none"
                  bg={historyData?.finish_date ? 'gray.50' : 'green.50'}
                  color={historyData?.finish_date ? 'gray.700' : 'green.700'}
                  border="1px solid"
                  borderColor={historyData?.finish_date ? 'gray.200' : 'green.200'}
                >
                  <HStack spacing={2}>
                    <Circle size="8px" bg={historyData?.finish_date ? 'gray.400' : 'green.500'} />
                    <Text>{historyData?.finish_date ? 'Finished' : 'Active'}</Text>
                  </HStack>
                </Badge>

                {historyData?.product?.name && (
                  <Badge
                    variant="subtle"
                    colorScheme="green"
                    fontSize="sm"
                    px={4}
                    py={2}
                    borderRadius="lg"
                    fontWeight="500"
                    textTransform="none"
                    bg="green.50"
                    color="green.700"
                    border="1px solid"
                    borderColor="green.200"
                  >
                    <HStack spacing={2}>
                      <Icon as={FaSeedling} boxSize={3} color="green.500" />
                      <Text>Organic</Text>
                    </HStack>
                  </Badge>
                )}

                {historyData?.qr_code && (
                  <Badge
                    variant="subtle"
                    colorScheme="blue"
                    fontSize="sm"
                    px={4}
                    py={2}
                    borderRadius="lg"
                    fontWeight="500"
                    textTransform="none"
                    bg="blue.50"
                    color="blue.700"
                    border="1px solid"
                    borderColor="blue.200"
                  >
                    <HStack spacing={2}>
                      <Icon as={FaQrcode} boxSize={3} color="blue.500" />
                      <Text>QR Available</Text>
                    </HStack>
                  </Badge>
                )}
              </Flex>

              {/* Header Row */}
              <Flex
                align="center"
                justify="space-between"
                flexWrap={{ base: 'wrap', md: 'nowrap' }}
                gap={{ base: 3, md: 4 }}
              >
                <Heading
                  color={textColor}
                  fontSize={{ base: 'md', sm: 'lg', md: 'xl' }}
                  fontWeight="bold"
                  textAlign={{ base: 'center', md: 'left' }}
                  flex="1"
                >
                  Production Information
                </Heading>
              </Flex>
            </VStack>
          </CardHeader>

          <CardBody>
            {/* Main Content */}
            <Box position="relative">
              <SimpleGrid
                columns={{ base: 1, lg: 2 }}
                spacing={{ base: 6, md: 8 }}
                mb={{ base: 6, md: 8 }}
              >
                {/* Left Column */}
                <VStack spacing={{ base: 4, md: 6 }} align="stretch">
                  {/* Images */}
                  <Box mb={{ base: 4, md: 6 }}>
                    <StandardImageGallery
                      images={historyData?.images || []}
                      title="Production Photos"
                      variant="default"
                      enablePreview={true}
                      showImageCount={true}
                      height={{ base: '200px', sm: '250px', md: '280px', lg: '300px' }}
                      showEmptyState={true}
                      maxDisplayImages={3}
                    />
                  </Box>

                  {/* Production Details - Refactored with ProfileSections */}
                  <ProfileSection title="Production Details" icon={FaTractor}>
                    <ProfileDataGrid
                      data={[
                        {
                          label: 'Product',
                          value: historyData?.product?.name,
                          type: 'text'
                        },
                        {
                          label: 'Lot ID',
                          value: historyData?.lot_id,
                          type: 'text',
                          conditional: !!historyData?.lot_id
                        },
                        {
                          label: 'Type',
                          value:
                            historyData?.type === 'OR'
                              ? 'Orchard'
                              : historyData?.type === 'GA'
                              ? 'Garden'
                              : 'Sustainable Production',
                          type: 'badge',
                          colorScheme: 'green'
                        },
                        {
                          label: 'Environment',
                          value: historyData?.is_outdoor ? 'Outdoor' : 'Indoor',
                          type: 'text'
                        },
                        {
                          label: 'Production Amount',
                          value: historyData?.production_amount
                            ? `${historyData.production_amount} units`
                            : undefined,
                          type: 'text',
                          conditional: !!historyData?.production_amount
                        },
                        {
                          label: 'Revenue',
                          value: historyData?.earning ? `$${historyData.earning.toLocaleString()}` : undefined,
                          type: 'text',
                          conditional: !!historyData?.earning
                        },
                        {
                          label: 'Duration',
                          value: `${formatDate(historyData?.start_date)} - ${
                            formatDate(historyData?.finish_date) || 'In Progress'
                          }`,
                          type: 'date'
                        },
                        {
                          label: 'Status',
                          value: historyData?.published ? 'Published' : 'Draft',
                          type: 'status',
                          colorScheme: historyData?.published ? 'green' : 'yellow'
                        }
                      ].filter((item) => item.conditional !== false && item.value !== undefined && item.value !== null)}
                      columns={{ base: 1, md: 2 }}
                    />
                  </ProfileSection>

                  {/* Agricultural Information - Refactored with ProfileSections */}
                  {(historyData?.age_of_plants ||
                    historyData?.number_of_plants ||
                    historyData?.soil_ph ||
                    historyData?.crop_type) && (
                    <ProfileSection title="Agricultural Information" icon={FaLeaf}>
                      <ProfileDataGrid
                        data={[
                          {
                            label: 'Plant Age',
                            value: historyData?.age_of_plants,
                            type: 'text',
                            conditional: !!historyData?.age_of_plants
                          },
                          {
                            label: 'Number of Plants',
                            value: historyData?.number_of_plants,
                            type: 'number',
                            conditional: !!historyData?.number_of_plants
                          },
                          {
                            label: 'Soil pH',
                            value: historyData?.soil_ph,
                            type: 'text',
                            conditional: !!historyData?.soil_ph
                          },
                          {
                            label: 'Crop Type',
                            value: historyData?.crop_type,
                            type: 'text',
                            conditional: !!historyData?.crop_type
                          }
                        ].filter((item) => item.conditional !== false && item.value !== undefined && item.value !== null)}
                        columns={{ base: 1, md: 2 }}
                      />
                    </ProfileSection>
                  )}

                  {/* Reputation & Operator - Refactored with ProfileSections */}
                  <ProfileSection title="Reputation & Operator" icon={FaUsers}>
                    <VStack spacing={4} align="stretch">
                      <Box w="full">
                        <Text fontSize="sm" color="gray.500" mb={2}>
                          Reputation Score
                        </Text>
                        <HStack spacing={2}>
                          <HStack spacing={1}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Icon
                                key={star}
                                as={star <= safeReputation ? BsStarFill : BsStar}
                                color={star <= safeReputation ? 'yellow.400' : 'gray.300'}
                                boxSize={4}
                              />
                            ))}
                          </HStack>
                          <Text fontSize="sm" color="gray.600" fontWeight="medium">
                            ({safeReputation.toFixed(1)}/5.0)
                          </Text>
                        </HStack>
                      </Box>
                      {historyData?.operator && (
                        <Box w="full" p={3} bg="gray.50" borderRadius="lg">
                          <Text fontSize="sm" color="gray.500" mb={2}>
                            Operator
                          </Text>
                          <HStack spacing={2}>
                            <Avatar
                              size="sm"
                              name={historyData.operator.name || historyData.operator.email}
                            />
                            <VStack spacing={0} align="start" flex={1}>
                              <Text fontWeight="medium" fontSize="sm">
                                {historyData.operator.name || 'Unnamed Operator'}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                {historyData.operator.email}
                              </Text>
                            </VStack>
                          </HStack>
                        </Box>
                      )}
                      <Box w="full">
                        <Text fontSize="sm" color="gray.500" mb={2}>
                          Quality Rating
                        </Text>
                        <Progress
                          value={(safeReputation / 5) * 100}
                          colorScheme="green"
                          size="sm"
                          borderRadius="full"
                        />
                      </Box>
                    </VStack>
                  </ProfileSection>

                  {/* Location - Refactored with ProfileSections */}
                  <ProfileSection title="Location" icon={MdLocationOn}>
                    <ProfileDataGrid
                      data={[
                        {
                          label: 'Establishment',
                          value: historyData?.parcel?.establishment?.name || 'Unknown',
                          type: 'link',
                          onClick: () =>
                            navigate(`/admin/dashboard/establishment/${establishmentId}`)
                        },
                        {
                          label: 'Parcel',
                          value: historyData?.parcel?.name || 'Unknown',
                          type: 'link',
                          onClick: () =>
                            navigate(
                              `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`
                            )
                        },
                        {
                          label: 'Address',
                          value: historyData?.parcel?.establishment?.location || 'Not specified',
                          type: 'text'
                        }
                      ]}
                      columns={{ base: 1, md: 1 }}
                    />
                  </ProfileSection>
                </VStack>

                {/* Right Column */}
                <VStack spacing={{ base: 4, md: 6 }} align="stretch">
                  {/* Transparency Score - Refactored with ProfileSections */}
                  <Box css={{
                    '& [data-transparency-score]': {
                      fontSize: { base: '4xl', md: '5xl' }
                    }
                  }}>
                    <TransparencyScoreCard
                      score={getTransparencyScore()}
                      type="production"
                      label="Farm Transparency Score"
                      eventCount={getUnifiedTimelineEvents().length}
                      nextStepTitle="Increase Your Score"
                      nextSteps={
                        getTransparencyScore() < 90
                          ? [
                              getTransparencyScore() < 30
                                ? 'Document more farming activities like planting, irrigation, and harvesting'
                                : 'Add photos to your events and document specialized practices',
                              'Verify more events and add detailed descriptions'
                            ]
                          : []
                      }
                      showProgress={true}
                      compact={false}
                    />
                  </Box>
                  {transparencyError && (
                    <Box
                      p={3}
                      bg="yellow.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="yellow.200"
                    >
                      <Text fontSize="sm" color="yellow.800">
                        Transparency data temporarily unavailable. Using basic calculation.
                      </Text>
                    </Box>
                  )}

                  {/* Performance & Management - Refactored with ProfileSections */}
                  {(historyData?.reputation_score || historyData?.quality_rating || historyData?.qr_code) && (
                    <ProfileSection title="Performance & Management" icon={FaChartLine}>
                      <VStack spacing={4} align="stretch">
                        {/* Reputation & Quality Metrics */}
                        <ProfileDataGrid
                          data={[
                            {
                              label: 'Reputation Score',
                              value: historyData?.reputation_score ? `${(historyData.reputation_score * 20).toFixed(1)}/5.0` : undefined,
                              type: 'text',
                              conditional: !!historyData?.reputation_score
                            },
                            {
                              label: 'Quality Rating',
                              value: historyData?.quality_rating,
                              type: 'text',
                              conditional: !!historyData?.quality_rating
                            }
                          ].filter((item) => item.conditional !== false && item.value !== undefined)}
                          columns={{ base: 1, md: 2 }}
                        />

                        {/* QR Code Consumer Access */}
                        {historyData?.qr_code && (
                          <Box
                            spacing={3}
                            p={3}
                            bg="blue.50"
                            borderRadius="lg"
                            border="1px solid"
                            borderColor="blue.200"
                          >
                            <HStack spacing={3} justify="space-between">
                              <HStack spacing={3} flex={1}>
                                <Box
                                  boxSize="40px"
                                  bg="white"
                                  borderRadius="md"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                >
                                  <Icon as={FaQrcode} color="blue.500" />
                                </Box>
                                <VStack spacing={0} align="start" flex={1}>
                                  <Text fontSize="sm" fontWeight="medium" color="blue.800">
                                    QR Code Available
                                  </Text>
                                  <Text fontSize="xs" color="blue.600">
                                    Consumers can scan to view details
                                  </Text>
                                </VStack>
                              </HStack>
                              <IconButton
                                icon={<Icon as={FaDownload} />}
                                size="sm"
                                variant="outline"
                                colorScheme="blue"
                                onClick={downloadQRCode}
                                aria-label="Download QR Code"
                              />
                            </HStack>
                          </Box>
                        )}
                      </VStack>
                    </ProfileSection>
                  )}

                  {/* Producer Information */}
                  {historyData?.parcel?.establishment && (
                    <CompanyEstablishmentInfo establishment={historyData.parcel.establishment} />
                  )}
                </VStack>
              </SimpleGrid>

              {/* Timeline - ✅ 2025 UNIFIED ARCHITECTURE: Use same data source as consumer page */}
              <Box mb={{ base: 4, md: 6 }}>
                {(() => {
                  const unifiedEvents = getUnifiedTimelineEvents();

                  if (unifiedEvents.length > 0) {
                    console.log(
                      '🔄 Rendering producer timeline with unified events:',
                      unifiedEvents.length,
                      'events'
                    );

                    return (
                      <UltraMobileProductionJourney
                        events={unifiedEvents}
                        transparencyScore={getDisplayTransparencyScore()}
                      />
                    );
                  }

                  // No events available
                  return (
                    <VStack spacing={3} py={8}>
                      <Icon as={MdTimeline} boxSize={16} color="gray.400" />
                      <Heading as="h4" size="md" color="gray.600">
                        No events recorded yet
                      </Heading>
                      <Text fontSize="sm" color="gray.400" textAlign="center">
                        Events will appear here as the production progresses
                      </Text>
                      {!historyData?.finish_date && (
                        <Button
                          leftIcon={<Icon as={FaSeedling} />}
                          colorScheme="green"
                          size="lg"
                          onClick={onQuickAddOpen}
                          mt={4}
                        >
                          🎤 Add Your First Event
                        </Button>
                      )}
                      {historyData?.finish_date && (
                        <Text fontSize="sm" color="gray.500" mt={4} textAlign="center">
                          This production is finished. Events cannot be added to completed
                          productions.
                        </Text>
                      )}
                    </VStack>
                  );
                })()}
              </Box>

              {/* Description Section - Refactored with ProfileSections */}
              {historyData?.description && (
                <ProfileSection title="Production Description" icon={FaRegCommentDots}>
                  <Text fontSize="sm" color="gray.700" lineHeight="tall">
                    {historyData.description}
                  </Text>
                </ProfileSection>
              )}

              {/* Production Summary - Refactored with ProfileSections */}
              <ProfileSection title="Production Summary" icon={FaClipboardList}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 6 }}>
                  <VStack align="start" spacing={4}>
                    <Box w="full">
                      <Text fontSize="sm" color="gray.500" mb={2}>
                        Production Status
                      </Text>
                      <Badge
                        colorScheme={historyData?.finish_date ? 'green' : 'yellow'}
                        variant="subtle"
                        fontSize="sm"
                        px={3}
                        py={1}
                      >
                        {historyData?.finish_date ? 'Completed' : 'In Progress'}
                      </Badge>
                    </Box>
                    {historyData?.start_date && historyData?.finish_date && (
                      <Box w="full">
                        <Text fontSize="sm" color="gray.500" mb={1}>
                          Duration
                        </Text>
                        <Text fontWeight="medium" fontSize="sm">
                          {Math.ceil(
                            (new Date(historyData.finish_date).getTime() -
                              new Date(historyData.start_date).getTime()) /
                              (1000 * 60 * 60 * 24)
                          )}{' '}
                          days
                        </Text>
                      </Box>
                    )}
                  </VStack>
                  <VStack align="start" spacing={4}>
                    <Box w="full">
                      <Text fontSize="sm" color="gray.500" mb={2}>
                        Events Recorded
                      </Text>
                      <Text fontWeight="medium" fontSize="lg" color="green.600">
                        {getUnifiedTimelineEvents().length || 0} Events
                      </Text>
                    </Box>
                    {getUnifiedTimelineEvents().length > 0 && (
                      <Box w="full">
                        <Text fontSize="sm" color="gray.500" mb={2}>
                          Timeline Progress
                        </Text>
                        <HStack spacing={2}>
                          <Progress
                            value={historyData.finish_date ? 100 : 50}
                            colorScheme="green"
                            size="sm"
                            borderRadius="full"
                            flex={1}
                          />
                          <Text fontSize="sm" color="gray.600" minW="40px">
                            {historyData.finish_date ? '100%' : '50%'}
                          </Text>
                        </HStack>
                      </Box>
                    )}
                  </VStack>
                </SimpleGrid>
              </ProfileSection>
            </Box>
          </CardBody>
        </Card>
      </Box>

      {/* Week 2 Task 2.1: Voice-to-Event System Integration */}
      <QuickAddEvent
        isOpen={isQuickAddOpen}
        onClose={onQuickAddClose}
        cropType={historyData?.product?.name || 'citrus'}
        onEventAdded={(eventData) => {
          console.log('New event added:', eventData);
          // Refresh the timeline data
          window.location.reload();
        }}
      />
    </Flex>
  );
}

export default ProfileProduction;
