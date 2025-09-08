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
import defaultProductionImage from 'assets/img/BgMusicCard.png';
import TimelineRow from 'components/Tables/TimelineRow';
import { useGetPublicHistoryQuery } from 'store/api/historyApi';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  ModernProductHeader,
  CompanyEstablishmentInfo,
  UltraMobileProductionJourney
} from 'views/Scan/ProductDetail/components';

// Removed Carbon Economics - focusing on core transparency data

// Import Week 2 Voice & Mobile Components
import QuickAddEvent from 'views/Dashboard/Dashboard/Production/QuickAddEvent';

// Import StandardComponents for modern design
import { StandardCard, StandardButton } from 'components/Design/StandardComponents';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';

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
      if (!historyData?.qr_code && !historyData?.history_scan) {
        toast({
          title: 'QR Code Not Available',
          description: 'No QR code data found for this production.',
          status: 'warning',
          duration: 3000,
          isClosable: true,
          position: 'top-right'
        });
        return;
      }

      // Use the QR code URL from backend or fallback to generated URL
      const qrUrl =
        historyData?.qr_code ||
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/media/qr_codes/${
          historyData?.name || 'production'
        }-${historyData?.start_date?.split('T')[0] || 'date'}.png`;

      // Open QR code in new window for download
      window.open(qrUrl, '_blank');

      toast({
        title: 'QR Code Opened',
        description: 'QR code opened in new window. Right-click to save.',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right'
      });
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to open QR code. Please try again.',
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
        equipment: event.equipment || event.commercial_name
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
                  justifyContent="center">
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
    <Flex direction="column" alignSelf="center" justifySelf="center" overflow="hidden" w="100%" position="relative">
      {/* Clean Modern Header - Standardized */}
      <Box 
        bg="linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)" 
        pt={{ base: '140px', md: '100px' }}
        pb={{ base: '80px', md: '100px' }} 
        px={{ base: 3, sm: 4, md: 4 }}
        position="relative">
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
                    onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`)}
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
                  onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`)}
                  size="sm">
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
                noOfLines={{ base: 2, md: 3 }}>
                {historyData?.product?.name || historyData?.name || 'Loading...'}
              </Heading>
              <Text
                fontSize={{ base: 'lg', sm: 'xl', md: 'lg' }}
                color="gray.600"
                fontWeight="normal"
                maxW={{ base: '95%', sm: '85%', lg: '60%' }}
                lineHeight={{ base: '1.6', md: '1.7' }}
                textAlign="center"
                px={{ base: 2, sm: 0 }}>
                {`${formatDate(historyData?.start_date)} - ${formatDate(historyData?.finish_date)}`}
              </Text>
            </VStack>


            {/* Quick Stats - Standardized */}
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
                  <Icon as={FaSeedling} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: '2xl', sm: 'xl' }} fontWeight="bold" color="gray.800">
                    {historyData?.product?.name ? 'Organic' : 'General'}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Production Type
                  </Text>
                </VStack>
              </VStack>

              <VStack>
                <Circle size="60px" bg="blue.100" color="blue.600">
                  <Icon as={MdOutdoorGrill} boxSize={6} />
                </Circle>
                <VStack spacing={1}>
                  <Text fontSize="xl" fontWeight="bold" color="gray.800">
                    Outdoor
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Environment
                  </Text>
                </VStack>
              </VStack>

              <VStack spacing={{ base: 3, sm: 2 }}>
                <Circle 
                  size={{ base: '60px', sm: '50px' }} 
                  bg="purple.100" 
                  color="purple.600"
                  cursor="default">
                  <Icon as={FaClipboardList} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: '2xl', sm: 'xl' }} fontWeight="bold" color="gray.800">
                    {historyData?.events?.length || 0}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Events
                  </Text>
                </VStack>
              </VStack>

              <VStack spacing={{ base: 3, sm: 2 }}>
                <Circle 
                  size={{ base: '60px', sm: '50px' }} 
                  bg="orange.100" 
                  color="orange.600"
                  cursor="default">
                  <Icon as={FaFlag} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: '2xl', sm: 'xl' }} fontWeight="bold" color="gray.800">
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

      {/* Main Content Container - Standardized with Establishment */}
      <Flex
        alignItems="center"
        justifyContent="center"
        mb={{ base: '60px', md: '80px' }}
        mt="-60px"
        position="relative"
        zIndex={10}>
        <Card
          w={{ base: '100%', sm: '98%', md: '95%', lg: '90%', xl: '85%' }}
          p={{ base: 4, sm: 5, md: 6, lg: 8 }}
          boxShadow={{
            base: '0 8px 16px -4px rgba(0, 0, 0, 0.12)',
            md: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          borderRadius={{ base: 'xl', md: '2xl' }}
          bg={bgColor}
          mx={{ base: 1, sm: 'auto' }}
          position="relative">
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
                    minH={{ base: '44px', md: '40px' }}>
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
                    minH={{ base: '44px', md: '40px' }}>
                    <Text fontSize={{ base: 'md', md: 'sm' }} fontWeight="500">
                      {intl.formatMessage({ id: 'app.edit' }) || 'Edit'}
                    </Text>
                  </MenuItem>
                  <MenuItem icon={<FaQrcode />} onClick={downloadQRCode}
                    minH={{ base: '44px', md: '40px' }}>
                    <Text fontSize={{ base: 'md', md: 'sm' }} fontWeight="500">
                      Download QR Code
                    </Text>
                  </MenuItem>
                  <MenuItem icon={<FaShare />} onClick={handleShare}
                    minH={{ base: '44px', md: '40px' }}>
                    <Text fontSize={{ base: 'md', md: 'sm' }} fontWeight="500">
                      Share
                    </Text>
                  </MenuItem>
                  <MenuItem icon={<FaTrash />} color="red.500"
                    minH={{ base: '44px', md: '40px' }}>
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
                align="center">
                {/* Active Badge - Standardized */}
                <Badge 
                  variant="subtle"
                  colorScheme={historyData?.finish_date ? "gray" : "green"}
                  fontSize="sm" 
                  px={4} 
                  py={2} 
                  borderRadius="lg"
                  fontWeight="600"
                  textTransform="none"
                  bg={historyData?.finish_date ? "gray.50" : "green.50"}
                  color={historyData?.finish_date ? "gray.700" : "green.700"}
                  border="1px solid"
                  borderColor={historyData?.finish_date ? "gray.200" : "green.200"}>
                  <HStack spacing={2}>
                    <Circle size="8px" bg={historyData?.finish_date ? "gray.400" : "green.500"} />
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
                    borderColor="green.200">
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
                    borderColor="blue.200">
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
                gap={{ base: 3, md: 4 }}>
                <Heading 
                  color={textColor} 
                  fontSize={{ base: 'md', sm: 'lg', md: 'xl' }} 
                  fontWeight="bold"
                  textAlign={{ base: 'center', md: 'left' }}
                  flex="1">
                  Production Information
                </Heading>
              </Flex>
            </VStack>
          </CardHeader>

          <CardBody>
            {/* Main Content */}
            <Box position="relative">
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 6, md: 8 }} mb={{ base: 6, md: 8 }}>
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
                    fallbackImage={defaultProductionImage}
                    height={{ base: '200px', sm: '250px', md: '280px', lg: '300px' }}
                    showEmptyState={true}
                    maxDisplayImages={3}
                  />
                </Box>

                {/* Details */}
                <StandardCard title="Production Details" variant="flat">
                  <VStack spacing={4} align="stretch">
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        Product
                      </Text>
                      <Text fontWeight="medium">{historyData?.product?.name}</Text>
                    </Box>
                    {historyData?.lot_id && (
                      <Box>
                        <Text fontSize="sm" color="gray.500" mb={1}>
                          Lot ID
                        </Text>
                        <Text fontWeight="medium" fontFamily="mono" fontSize="sm">
                          {historyData.lot_id}
                        </Text>
                      </Box>
                    )}
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        Type
                      </Text>
                      <Badge colorScheme="green" variant="subtle" size="sm">
                        {historyData?.type === 'OR' ? 'Orchard' : historyData?.type === 'GA' ? 'Garden' : 'Sustainable Production'}
                      </Badge>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        Environment
                      </Text>
                      <Text fontWeight="medium">{historyData?.is_outdoor ? 'Outdoor' : 'Indoor'}</Text>
                    </Box>
                    {historyData?.production_amount && (
                      <Box>
                        <Text fontSize="sm" color="gray.500" mb={1}>
                          Production Amount
                        </Text>
                        <Text fontWeight="medium">{historyData.production_amount} units</Text>
                      </Box>
                    )}
                    {historyData?.earning && (
                      <Box>
                        <Text fontSize="sm" color="gray.500" mb={1}>
                          Revenue
                        </Text>
                        <Text fontWeight="medium" color="green.600">
                          ${historyData.earning.toLocaleString()}
                        </Text>
                      </Box>
                    )}
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        Duration
                      </Text>
                      <Text fontWeight="medium">
                        {formatDate(historyData?.start_date)} -{' '}
                        {formatDate(historyData?.finish_date) || 'In Progress'}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        Status
                      </Text>
                      <Badge 
                        colorScheme={historyData?.published ? 'green' : 'yellow'} 
                        variant="subtle" 
                        size="sm"
                      >
                        {historyData?.published ? 'Published' : 'Draft'}
                      </Badge>
                    </Box>
                  </VStack>
                </StandardCard>

                {/* Agricultural Information */}
                {(historyData?.age_of_plants || historyData?.number_of_plants || historyData?.soil_ph) && (
                  <StandardCard title="Agricultural Information" variant="flat">
                    <VStack spacing={4} align="stretch">
                      {historyData?.age_of_plants && (
                        <Box>
                          <Text fontSize="sm" color="gray.500" mb={1}>
                            Plant Age
                          </Text>
                          <Text fontWeight="medium">{historyData.age_of_plants}</Text>
                        </Box>
                      )}
                      {historyData?.number_of_plants && (
                        <Box>
                          <Text fontSize="sm" color="gray.500" mb={1}>
                            Number of Plants
                          </Text>
                          <Text fontWeight="medium">{historyData.number_of_plants}</Text>
                        </Box>
                      )}
                      {historyData?.soil_ph && (
                        <Box>
                          <Text fontSize="sm" color="gray.500" mb={1}>
                            Soil pH
                          </Text>
                          <Text fontWeight="medium">{historyData.soil_ph}</Text>
                        </Box>
                      )}
                      {historyData?.crop_type && (
                        <Box>
                          <Text fontSize="sm" color="gray.500" mb={1}>
                            Crop Type
                          </Text>
                          <Text fontWeight="medium">{historyData.crop_type}</Text>
                        </Box>
                      )}
                    </VStack>
                  </StandardCard>
                )}

                {/* Reputation & Operator */}
                <StandardCard title="Performance & Management" variant="flat">
                  <VStack spacing={4} align="stretch">
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
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
                        <Text fontSize="sm" color="gray.600">
                          ({safeReputation.toFixed(1)}/5.0)
                        </Text>
                      </HStack>
                    </Box>
                    {historyData?.operator && (
                      <Box>
                        <Text fontSize="sm" color="gray.500" mb={1}>
                          Operator
                        </Text>
                        <HStack spacing={2}>
                          <Avatar size="xs" name={historyData.operator.name || historyData.operator.email} />
                          <VStack spacing={0} align="start">
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
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
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
                </StandardCard>

                {/* Location */}
                <StandardCard title="Location" variant="flat">
                  <VStack spacing={4} align="stretch">
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        Establishment
                      </Text>
                      <Link
                        color="blue.600"
                        onClick={() =>
                          navigate(`/admin/dashboard/establishment/${establishmentId}`)
                        }
                        cursor="pointer"
                        _hover={{ textDecoration: 'underline' }}
                        fontWeight="medium">
                        {historyData?.parcel?.establishment?.name || 'Unknown'}
                      </Link>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        Parcel
                      </Text>
                      <Link
                        color="green.600"
                        onClick={() =>
                          navigate(
                            `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`
                          )
                        }
                        cursor="pointer"
                        _hover={{ textDecoration: 'underline' }}
                        fontWeight="medium">
                        {historyData?.parcel?.name || 'Unknown'}
                      </Link>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        Address
                      </Text>
                      <Text fontWeight="medium">
                        {historyData?.parcel?.establishment?.location || 'Not specified'}
                      </Text>
                    </Box>
                  </VStack>
                </StandardCard>
              </VStack>

              {/* Right Column */}
              <VStack spacing={{ base: 4, md: 6 }} align="stretch">
                {/* Performance & Management */}
                <StandardCard title="Performance & Management" variant="flat">
                  <VStack spacing={4} align="stretch">
                    {historyData?.reputation_score && (
                      <Box>
                        <Text fontSize="sm" color="gray.500" mb={2}>
                          Reputation Score
                        </Text>
                        <HStack spacing={2}>
                          <Text fontSize="lg" fontWeight="bold" color="green.600">
                            {(historyData.reputation_score * 20).toFixed(1)}/5.0
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            ({historyData.reputation_score}/5 stars)
                          </Text>
                        </HStack>
                      </Box>
                    )}
                    
                    {historyData?.quality_rating && (
                      <Box>
                        <Text fontSize="sm" color="gray.500" mb={2}>
                          Quality Rating
                        </Text>
                        <Text fontSize="lg" fontWeight="bold" color="blue.600">
                          {historyData.quality_rating}
                        </Text>
                      </Box>
                    )}

                    {/* QR Code Compact Section */}
                    {historyData?.qr_code && (
                      <Box>
                        <Text fontSize="sm" color="gray.500" mb={2}>
                          Consumer Access
                        </Text>
                        <HStack spacing={3} p={3} bg="blue.50" borderRadius="lg" border="1px solid" borderColor="blue.200">
                          <Box boxSize="40px" bg="white" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
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
                </StandardCard>

                {/* Producer Information */}
                {historyData?.parcel?.establishment && (
                  <CompanyEstablishmentInfo establishment={historyData.parcel.establishment} />
                )}
              </VStack>
            </SimpleGrid>

            {/* Timeline */}
            <Box mb={{ base: 4, md: 6 }}>
              <StandardCard title="Production Timeline" variant="flat">
              {historyData?.events && historyData.events.length > 0 ? (
                <UltraMobileProductionJourney events={mapEventsToTimeline(historyData.events)} />
              ) : (
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
                      mt={4}>
                      🎤 Add Your First Event
                    </Button>
                  )}
                  {historyData?.finish_date && (
                    <Text fontSize="sm" color="gray.500" mt={4} textAlign="center">
                      This production is finished. Events cannot be added to completed productions.
                    </Text>
                  )}
                </VStack>
              )}
              </StandardCard>
            </Box>

            {/* Description Section */}
            {historyData?.description && (
              <Box mb={{ base: 4, md: 6 }}>
                <StandardCard title="Production Description" variant="flat">
                <Box>
                  <Text fontSize="sm" color="gray.700" lineHeight="tall">
                    {historyData.description}
                  </Text>
                </Box>
                </StandardCard>
              </Box>
            )}

            {/* Production Summary - Core Information */}
            <Box mb={{ base: 4, md: 6 }}>
              <StandardCard title="Production Summary" variant="flat">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 6 }}>
                <VStack align="start" spacing={3}>
                  <Box>
                    <Text fontSize="sm" color="gray.500" mb={1}>
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
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        Duration
                      </Text>
                      <Text fontWeight="medium" fontSize="sm">
                        {Math.ceil((new Date(historyData.finish_date).getTime() - new Date(historyData.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                      </Text>
                    </Box>
                  )}
                </VStack>
                <VStack align="start" spacing={3}>
                  <Box>
                    <Text fontSize="sm" color="gray.500" mb={1}>
                      Events Recorded
                    </Text>
                    <Text fontWeight="medium" fontSize="sm" color="green.600">
                      {historyData?.events?.length || 0} Events
                    </Text>
                  </Box>
                  {historyData?.events && historyData.events.length > 0 && (
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
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
                        <Text fontSize="sm" color="gray.600">
                          {historyData.finish_date ? '100%' : '50%'}
                        </Text>
                      </HStack>
                    </Box>
                  )}
                </VStack>
              </SimpleGrid>
              </StandardCard>
            </Box>
          </Box>
          </CardBody>
        </Card>
      </Flex>

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
