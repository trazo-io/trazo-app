// Chakra imports
import 'leaflet/dist/leaflet.css';
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Icon,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  SimpleGrid,
  Tag,
  TagLabel,
  Text,
  VStack,
  useColorModeValue,
  useDisclosure,
  Heading,
  Circle,
  useToast,
  useBreakpointValue
} from '@chakra-ui/react';
import {
  FaFacebook,
  FaInstagram,
  FaTwitter,
  FaMapMarkerAlt,
  FaRegIdBadge,
  FaRegCommentDots,
  FaRegListAlt,
  FaRegLightbulb,
  FaBuilding,
  FaPhone,
  FaEnvelope,
  FaLeaf,
  FaUsers,
  FaTractor,
  FaCalendar,
  FaCertificate,
  FaEdit,
  FaTrash,
  FaSeedling,
  FaGlobe,
  FaChartLine,
  FaShare,
  FaTint,
  FaChevronLeft
} from 'react-icons/fa';
import { MdLocationOn, MdBusiness, MdEco, MdCalendarToday, MdVerified } from 'react-icons/md';
import { useNavigate, useParams } from 'react-router-dom';

import HTMLRenderer from 'components/Utils/HTMLRenderer';
import { StandardImageGallery } from 'components/ImageGallery';
import { IoEllipsisVerticalSharp } from 'react-icons/io5';
import establishmentImage from 'assets/img/basic-auth.png';
import { useGetEstablishmentQuery } from 'store/api/companyApi';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import { StandardCard, StandardButton, StandardPage } from 'components/Design/StandardComponents';

// Add type for Redux state
interface RootState {
  company: {
    currentCompany: {
      id: string;
      name: string;
    };
  };
}

function ProfileEstablishment() {
  const intl = useIntl();
  const navigate = useNavigate();
  const { establishmentId } = useParams();
  const { isOpen: isOpen1, onOpen: onOpen1, onClose: onClose1 } = useDisclosure();
  const toast = useToast();

  const currentCompany = useSelector((state: RootState) => state.company.currentCompany);

  const {
    data: establishmentData,
    error,
    isLoading
  } = useGetEstablishmentQuery(
    {
      companyId: currentCompany?.id,
      establishmentId
    },
    {
      skip: !establishmentId || currentCompany?.id === undefined
    }
  );

  // Basic responsive utilities for components
  const touchTargetSize = useBreakpointValue({ base: '48px', sm: '44px', md: '40px' });

  // Color mode values for theme consistency
  const titleColor = useColorModeValue('green.600', 'green.400');
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const bgColor = useColorModeValue('white', 'gray.800');
  const cardPadding = { base: 4, sm: 5, md: 6, lg: 8 };
  const mobileCardRadius = { base: 'xl', md: '2xl' };
  const headingSize = { base: 'md', sm: 'lg', md: 'xl' };

  // Helper function to parse certifications
  const getCertifications = () => {
    if (!establishmentData?.certifications) return [];
    if (typeof establishmentData.certifications === 'string') {
      return establishmentData.certifications
        .split(',')
        .map((cert: string) => cert.trim())
        .filter(Boolean);
    }
    if (Array.isArray(establishmentData.certifications)) {
      return establishmentData.certifications;
    }
    return [];
  };

  // Helper function to get crops grown
  const getCropsGrown = () => {
    if (!establishmentData?.crops_grown) return [];
    if (Array.isArray(establishmentData.crops_grown)) {
      return establishmentData.crops_grown;
    }
    return [];
  };

  // Helper function to get sustainability practices
  const getSustainabilityPractices = () => {
    if (!establishmentData?.sustainability_practices) return [];
    if (Array.isArray(establishmentData.sustainability_practices)) {
      return establishmentData.sustainability_practices;
    }
    return [];
  };

  // Helper functions for new operational fields
  const getWaterSources = () => {
    if (!establishmentData?.water_sources) return [];
    if (Array.isArray(establishmentData.water_sources)) {
      return establishmentData.water_sources;
    }
    try {
      return JSON.parse(establishmentData.water_sources);
    } catch {
      return [];
    }
  };

  const getSoilTypes = () => {
    if (!establishmentData?.soil_types) return [];
    if (Array.isArray(establishmentData.soil_types)) {
      return establishmentData.soil_types;
    }
    try {
      return JSON.parse(establishmentData.soil_types);
    } catch {
      return [];
    }
  };

  const getConservationPractices = () => {
    if (!establishmentData?.conservation_practices) return [];
    if (Array.isArray(establishmentData.conservation_practices)) {
      return establishmentData.conservation_practices;
    }
    try {
      return JSON.parse(establishmentData.conservation_practices);
    } catch {
      return [];
    }
  };

  const getIrrigationMethods = () => {
    if (!establishmentData?.irrigation_methods) return [];
    if (Array.isArray(establishmentData.irrigation_methods)) {
      return establishmentData.irrigation_methods;
    }
    try {
      return JSON.parse(establishmentData.irrigation_methods);
    } catch {
      return [];
    }
  };

  // Handle sharing establishment
  const handleShare = async () => {
    try {
      const baseUrl = window.location.hostname.includes('localhost')
        ? 'http://localhost:3000'
        : `https://consumer.${import.meta.env.VITE_APP_BASE_DOMAIN}`;

      const publicProfileUrl = `${baseUrl}/establishment/${establishmentId}`;

      // Try native sharing first
      if (navigator.share) {
        await navigator.share({
          title: `${establishmentData?.name} - Sustainable Agriculture`,
          text: `Check out this sustainable farm! ${establishmentData?.description || ''}`,
          url: publicProfileUrl
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(publicProfileUrl);
        toast({
          title: 'Link Copied',
          description: 'The public profile link has been copied to your clipboard.',
          status: 'success',
          duration: 3000,
          isClosable: true,
          position: 'top-right'
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: 'Error',
        description: 'Failed to share. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top-right'
      });
    }
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
      {/* Clean Modern Header */}
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
            {useBreakpointValue({ base: true, md: false }) ? (
              // Mobile: Back button above title with full width
              <VStack spacing={4} w="full" align="center">
                <Flex w="full" justify="flex-start">
                  <Button
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={() => navigate('/admin/dashboard')}
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
                  onClick={() => navigate('/admin/dashboard')}
                  size="sm"
                >
                  Back
                </Button>
              </Flex>
            )}

            {/* Main Title */}
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
                noOfLines={{ base: 2, md: 3 }}
              >
                {establishmentData?.name || 'Loading...'}
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
                {establishmentData?.description || establishmentData?.company?.name}
              </Text>
            </VStack>

            {/* Quick Stats - Mobile Enhanced */}
            <SimpleGrid
              columns={{ base: 2, md: 4 }}
              spacing={{ base: 4, sm: 6, md: 6 }}
              w="full"
              maxW="2xl"
              px={{ base: 2, sm: 0 }}
            >
              <VStack spacing={{ base: 3, sm: 2 }}>
                <Circle
                  size={{ base: '60px', sm: '50px' }}
                  bg="green.100"
                  color="green.600"
                  cursor="default"
                >
                  <Icon as={FaTractor} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: '2xl', sm: 'xl' }} fontWeight="bold" color="gray.800">
                    {establishmentData?.total_acreage || 0}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Acres
                  </Text>
                </VStack>
              </VStack>

              <VStack spacing={{ base: 3, sm: 2 }}>
                <Circle
                  size={{ base: '60px', sm: '50px' }}
                  bg="blue.100"
                  color="blue.600"
                  cursor="default"
                >
                  <Icon as={FaUsers} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: '2xl', sm: 'xl' }} fontWeight="bold" color="gray.800">
                    {establishmentData?.employee_count || 0}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Employees
                  </Text>
                </VStack>
              </VStack>

              <VStack spacing={{ base: 3, sm: 2 }}>
                <Circle
                  size={{ base: '60px', sm: '50px' }}
                  bg="purple.100"
                  color="purple.600"
                  cursor="default"
                >
                  <Icon as={FaCalendar} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: '2xl', sm: 'xl' }} fontWeight="bold" color="gray.800">
                    {establishmentData?.year_established || '--'}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Founded
                  </Text>
                </VStack>
              </VStack>

              <VStack spacing={{ base: 3, sm: 2 }}>
                <Circle
                  size={{ base: '60px', sm: '50px' }}
                  bg="orange.100"
                  color="orange.600"
                  cursor="default"
                >
                  <Icon as={FaSeedling} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: '2xl', sm: 'xl' }} fontWeight="bold" color="gray.800">
                    {getCropsGrown().length}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Crops
                  </Text>
                </VStack>
              </VStack>
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Main Content Container - Mobile Enhanced */}
      <Flex
        alignItems="center"
        justifyContent="center"
        mb={{ base: '60px', md: '80px' }}
        mt="-60px"
        position="relative"
        zIndex={10}
      >
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
          position="relative"
        >
          {/* Header with Actions - Mobile Enhanced */}
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
                  aria-label="Open establishment menu"
                  _hover={{ bg: 'gray.50' }}
                  _active={{ bg: 'gray.100' }}
                />
                <MenuList fontSize={{ base: 'md', md: 'sm' }} minW={{ base: '200px', md: '180px' }}>
                  <MenuItem
                    onClick={() =>
                      navigate(`/admin/dashboard/establishment/${establishmentId}/change`)
                    }
                    icon={<FaEdit />}
                    minH={{ base: '44px', md: '40px' }}
                  >
                    <Text fontSize={{ base: 'md', md: 'sm' }} fontWeight="500">
                      {intl.formatMessage({ id: 'app.edit' }) || 'Edit'}
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
              {/* Status Badges - Subtle Trazo Design */}
              <Flex
                wrap="wrap"
                gap={{ base: 3, sm: 4 }}
                justify={{ base: 'center', md: 'flex-start' }}
                align="center"
              >
                {/* Status Badge - Green theme for active status */}
                <Badge
                  variant="subtle"
                  colorScheme={establishmentData?.is_active !== false ? 'green' : 'gray'}
                  fontSize="sm"
                  px={4}
                  py={2}
                  borderRadius="lg"
                  fontWeight="600"
                  textTransform="none"
                  bg={establishmentData?.is_active !== false ? 'green.50' : 'gray.100'}
                  color={establishmentData?.is_active !== false ? 'green.700' : 'gray.600'}
                  border="1px solid"
                  borderColor={establishmentData?.is_active !== false ? 'green.200' : 'gray.200'}
                >
                  <HStack spacing={2}>
                    <Circle
                      size="8px"
                      bg={establishmentData?.is_active !== false ? 'green.500' : 'gray.400'}
                    />
                    <Text>{establishmentData?.is_active !== false ? 'Active' : 'Inactive'}</Text>
                  </HStack>
                </Badge>

                {/* Establishment Type Badge - Use both possible fields */}
                {(establishmentData?.establishment_type || establishmentData?.type) && (
                  <Badge
                    variant="subtle"
                    colorScheme="gray"
                    fontSize="sm"
                    px={4}
                    py={2}
                    borderRadius="lg"
                    fontWeight="500"
                    textTransform="none"
                    bg="gray.50"
                    color="gray.700"
                    border="1px solid"
                    borderColor="gray.200"
                  >
                    <HStack spacing={2}>
                      <Icon as={FaBuilding} boxSize={3} color="gray.500" />
                      <Text>{establishmentData.establishment_type || establishmentData.type}</Text>
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
                  fontSize={headingSize}
                  fontWeight="bold"
                  textAlign={{ base: 'center', md: 'left' }}
                  flex="1"
                >
                  {intl.formatMessage({ id: 'app.establishmentInformation' }) ||
                    'Establishment Information'}
                </Heading>
              </Flex>
            </VStack>
          </CardHeader>

          <CardBody>
            {/* Main Content */}
            <Box position="relative">
              {/* Adaptive Layout Based on Photos */}
              <SimpleGrid
                columns={{
                  base: 1,
                  lg: establishmentData?.images?.length > 0 ? 2 : 1
                }}
                spacing={{ base: 4, sm: 5, md: 6, lg: 8 }}
                mb={{ base: 4, sm: 5, md: 6 }}
              >
                {/* Dynamic Left Column - Only show if there are photos */}
                {establishmentData?.images?.length > 0 && (
                  <VStack spacing={{ base: 4, md: 5 }} align="stretch">
                    {/* Image Gallery */}
                    <Box>
                      <StandardImageGallery
                        images={establishmentData.images}
                        title="Establishment Photos"
                        variant="default"
                        enablePreview={true}
                        showImageCount={true}
                        fallbackImage={establishmentImage}
                        height={{ base: '200px', sm: '250px', md: '280px', lg: '300px' }}
                        maxDisplayImages={3}
                      />
                    </Box>

                    {/* Contact Information - Move to left column for better balance */}
                    <StandardCard title="Contact Information" variant="flat" icon={FaPhone}>
                      <VStack spacing={{ base: 4, sm: 3 }} align="stretch">
                        {establishmentData?.email && (
                          <HStack
                            spacing={{ base: 3, sm: 3 }}
                            minH={touchTargetSize}
                            align="center"
                            p={{ base: 2, sm: 1 }}
                            borderRadius="md"
                            _hover={{ bg: 'gray.50' }}
                            cursor="pointer"
                            onClick={() => window.open(`mailto:${establishmentData.email}`)}
                          >
                            <Icon
                              as={FaEnvelope}
                              color="blue.500"
                              boxSize={{ base: 5, sm: 5 }}
                              flexShrink={0}
                            />
                            <VStack spacing={0} align="start" flex={1}>
                              <Text
                                fontSize={{ base: 'sm', sm: 'sm' }}
                                color="gray.500"
                                fontWeight="medium"
                              >
                                Email
                              </Text>
                              <Text
                                color="blue.500"
                                fontSize={{ base: 'md', sm: 'md' }}
                                fontWeight="medium"
                                isTruncated
                                maxW="full"
                              >
                                {establishmentData.email}
                              </Text>
                            </VStack>
                          </HStack>
                        )}
                        {establishmentData?.phone && (
                          <HStack
                            spacing={{ base: 3, sm: 3 }}
                            minH={touchTargetSize}
                            align="center"
                            p={{ base: 2, sm: 1 }}
                            borderRadius="md"
                            _hover={{ bg: 'gray.50' }}
                            cursor="pointer"
                            onClick={() => window.open(`tel:${establishmentData.phone}`)}
                          >
                            <Icon
                              as={FaPhone}
                              color="green.500"
                              boxSize={{ base: 5, sm: 5 }}
                              flexShrink={0}
                            />
                            <VStack spacing={0} align="start" flex={1}>
                              <Text
                                fontSize={{ base: 'sm', sm: 'sm' }}
                                color="gray.500"
                                fontWeight="medium"
                              >
                                Phone
                              </Text>
                              <Text
                                color="green.500"
                                fontSize={{ base: 'md', sm: 'md' }}
                                fontWeight="medium"
                              >
                                {establishmentData.phone}
                              </Text>
                            </VStack>
                          </HStack>
                        )}
                        {establishmentData?.contact_person && (
                          <HStack
                            spacing={{ base: 3, sm: 3 }}
                            minH={touchTargetSize}
                            align="center"
                            p={{ base: 2, sm: 1 }}
                            borderRadius="md"
                          >
                            <Icon
                              as={FaUsers}
                              color="purple.500"
                              boxSize={{ base: 5, sm: 5 }}
                              flexShrink={0}
                            />
                            <VStack spacing={0} align="start" flex={1}>
                              <Text
                                fontSize={{ base: 'sm', sm: 'sm' }}
                                color="gray.500"
                                fontWeight="medium"
                              >
                                Contact Person
                              </Text>
                              <Text
                                fontSize={{ base: 'md', sm: 'md' }}
                                fontWeight="medium"
                                color="gray.700"
                              >
                                {establishmentData.contact_person}
                              </Text>
                            </VStack>
                          </HStack>
                        )}
                        {establishmentData?.contact_email &&
                          establishmentData.contact_email !== establishmentData.email && (
                            <HStack>
                              <Icon as={FaEnvelope} color="blue.500" />
                              <Text fontWeight="medium">Alt Email:</Text>
                              <Link
                                color="blue.500"
                                href={`mailto:${establishmentData.contact_email}`}
                              >
                                {establishmentData.contact_email}
                              </Link>
                            </HStack>
                          )}
                        {establishmentData?.contact_phone &&
                          establishmentData.contact_phone !== establishmentData.phone && (
                            <HStack>
                              <Icon as={FaPhone} color="green.500" />
                              <Text fontWeight="medium">Alt Phone:</Text>
                              <Link
                                color="green.500"
                                href={`tel:${establishmentData.contact_phone}`}
                              >
                                {establishmentData.contact_phone}
                              </Link>
                            </HStack>
                          )}
                      </VStack>
                    </StandardCard>

                    {/* Social Media & Web Presence - Enhanced with Website */}
                    {(establishmentData?.company?.website ||
                      establishmentData?.company?.facebook ||
                      establishmentData?.company?.instagram) && (
                      <StandardCard title="Web Presence" variant="flat" icon={FaGlobe}>
                        <HStack spacing={4} justify="center" flexWrap="wrap">
                          {establishmentData?.company?.website && (
                            <Link
                              href={establishmentData.company.website}
                              isExternal
                              _hover={{ transform: 'scale(1.05)' }}
                              transition="all 0.2s"
                            >
                              <Circle
                                size="50px"
                                bg="green.50"
                                color="green.600"
                                border="2px solid"
                                borderColor="green.200"
                              >
                                <Icon as={FaGlobe} boxSize={5} />
                              </Circle>
                            </Link>
                          )}
                          {establishmentData?.company?.facebook && (
                            <Link
                              href={establishmentData.company.facebook}
                              isExternal
                              _hover={{ transform: 'scale(1.05)' }}
                              transition="all 0.2s"
                            >
                              <Circle
                                size="50px"
                                bg="blue.50"
                                color="blue.600"
                                border="2px solid"
                                borderColor="blue.200"
                              >
                                <Icon as={FaFacebook} boxSize={5} />
                              </Circle>
                            </Link>
                          )}
                          {establishmentData?.company?.instagram && (
                            <Link
                              href={establishmentData.company.instagram}
                              isExternal
                              _hover={{ transform: 'scale(1.05)' }}
                              transition="all 0.2s"
                            >
                              <Circle
                                size="50px"
                                bg="pink.50"
                                color="pink.600"
                                border="2px solid"
                                borderColor="pink.200"
                              >
                                <Icon as={FaInstagram} boxSize={5} />
                              </Circle>
                            </Link>
                          )}
                        </HStack>
                      </StandardCard>
                    )}
                  </VStack>
                )}

                {/* Main Content Column */}
                <Box>
                  {/* Compact Empty Photos State - Only show when no photos */}
                  {(!establishmentData?.images || establishmentData.images.length === 0) && (
                    <Box mb={{ base: 4, sm: 5 }}>
                      <StandardCard title="Establishment Photos" variant="flat" icon={FaBuilding}>
                        <VStack spacing={3} py={2}>
                          <Circle size="40px" bg="gray.100" color="gray.400">
                            <Icon as={FaBuilding} boxSize={4} />
                          </Circle>
                          <VStack spacing={1}>
                            <Text
                              fontSize="sm"
                              color="gray.600"
                              fontWeight="500"
                              textAlign="center"
                            >
                              No photos available
                            </Text>
                            <Text fontSize="xs" color="gray.500" textAlign="center">
                              Add photos to showcase your agricultural facility
                            </Text>
                          </VStack>
                        </VStack>
                      </StandardCard>
                    </Box>
                  )}

                  {/* Contact Information - Only show when no photos (moved to left column when photos exist) */}
                  {(!establishmentData?.images || establishmentData.images.length === 0) && (
                    <StandardCard title="Contact Information" variant="flat" icon={FaPhone}>
                      <VStack spacing={{ base: 4, sm: 3 }} align="stretch">
                        {establishmentData?.email && (
                          <HStack
                            spacing={{ base: 3, sm: 3 }}
                            minH={touchTargetSize}
                            align="center"
                            p={{ base: 2, sm: 1 }}
                            borderRadius="md"
                            _hover={{ bg: 'gray.50' }}
                            cursor="pointer"
                            onClick={() => window.open(`mailto:${establishmentData.email}`)}
                          >
                            <Icon
                              as={FaEnvelope}
                              color="blue.500"
                              boxSize={{ base: 5, sm: 5 }}
                              flexShrink={0}
                            />
                            <VStack spacing={0} align="start" flex={1}>
                              <Text
                                fontSize={{ base: 'sm', sm: 'sm' }}
                                color="gray.500"
                                fontWeight="medium"
                              >
                                Email
                              </Text>
                              <Text
                                color="blue.500"
                                fontSize={{ base: 'md', sm: 'md' }}
                                fontWeight="medium"
                                isTruncated
                                maxW="full"
                              >
                                {establishmentData.email}
                              </Text>
                            </VStack>
                          </HStack>
                        )}
                        {establishmentData?.phone && (
                          <HStack
                            spacing={{ base: 3, sm: 3 }}
                            minH={touchTargetSize}
                            align="center"
                            p={{ base: 2, sm: 1 }}
                            borderRadius="md"
                            _hover={{ bg: 'gray.50' }}
                            cursor="pointer"
                            onClick={() => window.open(`tel:${establishmentData.phone}`)}
                          >
                            <Icon
                              as={FaPhone}
                              color="green.500"
                              boxSize={{ base: 5, sm: 5 }}
                              flexShrink={0}
                            />
                            <VStack spacing={0} align="start" flex={1}>
                              <Text
                                fontSize={{ base: 'sm', sm: 'sm' }}
                                color="gray.500"
                                fontWeight="medium"
                              >
                                Phone
                              </Text>
                              <Text
                                color="green.500"
                                fontSize={{ base: 'md', sm: 'md' }}
                                fontWeight="medium"
                              >
                                {establishmentData.phone}
                              </Text>
                            </VStack>
                          </HStack>
                        )}
                        {establishmentData?.contact_person && (
                          <HStack
                            spacing={{ base: 3, sm: 3 }}
                            minH={touchTargetSize}
                            align="center"
                            p={{ base: 2, sm: 1 }}
                            borderRadius="md"
                          >
                            <Icon
                              as={FaUsers}
                              color="purple.500"
                              boxSize={{ base: 5, sm: 5 }}
                              flexShrink={0}
                            />
                            <VStack spacing={0} align="start" flex={1}>
                              <Text
                                fontSize={{ base: 'sm', sm: 'sm' }}
                                color="gray.500"
                                fontWeight="medium"
                              >
                                Contact Person
                              </Text>
                              <Text
                                fontSize={{ base: 'md', sm: 'md' }}
                                fontWeight="medium"
                                color="gray.700"
                              >
                                {establishmentData.contact_person}
                              </Text>
                            </VStack>
                          </HStack>
                        )}
                        {establishmentData?.contact_email &&
                          establishmentData.contact_email !== establishmentData.email && (
                            <HStack>
                              <Icon as={FaEnvelope} color="blue.500" />
                              <Text fontWeight="medium">Alt Email:</Text>
                              <Link
                                color="blue.500"
                                href={`mailto:${establishmentData.contact_email}`}
                              >
                                {establishmentData.contact_email}
                              </Link>
                            </HStack>
                          )}
                        {establishmentData?.contact_phone &&
                          establishmentData.contact_phone !== establishmentData.phone && (
                            <HStack>
                              <Icon as={FaPhone} color="green.500" />
                              <Text fontWeight="medium">Alt Phone:</Text>
                              <Link
                                color="green.500"
                                href={`tel:${establishmentData.contact_phone}`}
                              >
                                {establishmentData.contact_phone}
                              </Link>
                            </HStack>
                          )}
                      </VStack>
                    </StandardCard>
                  )}

                  {/* Social Media & Web Presence - Only show when no photos */}
                  {(!establishmentData?.images || establishmentData.images.length === 0) &&
                    (establishmentData?.company?.website ||
                      establishmentData?.company?.facebook ||
                      establishmentData?.company?.instagram) && (
                      <StandardCard title="Web Presence" variant="flat" icon={FaGlobe}>
                        <HStack spacing={4} justify="center" flexWrap="wrap">
                          {establishmentData?.company?.website && (
                            <Link
                              href={establishmentData.company.website}
                              isExternal
                              _hover={{ transform: 'scale(1.05)' }}
                              transition="all 0.2s"
                            >
                              <Circle
                                size="50px"
                                bg="green.50"
                                color="green.600"
                                border="2px solid"
                                borderColor="green.200"
                              >
                                <Icon as={FaGlobe} boxSize={5} />
                              </Circle>
                            </Link>
                          )}
                          {establishmentData?.company?.facebook && (
                            <Link
                              href={establishmentData.company.facebook}
                              isExternal
                              _hover={{ transform: 'scale(1.05)' }}
                              transition="all 0.2s"
                            >
                              <Circle
                                size="50px"
                                bg="blue.50"
                                color="blue.600"
                                border="2px solid"
                                borderColor="blue.200"
                              >
                                <Icon as={FaFacebook} boxSize={5} />
                              </Circle>
                            </Link>
                          )}
                          {establishmentData?.company?.instagram && (
                            <Link
                              href={establishmentData.company.instagram}
                              isExternal
                              _hover={{ transform: 'scale(1.05)' }}
                              transition="all 0.2s"
                            >
                              <Circle
                                size="50px"
                                bg="pink.50"
                                color="pink.600"
                                border="2px solid"
                                borderColor="pink.200"
                              >
                                <Icon as={FaInstagram} boxSize={5} />
                              </Circle>
                            </Link>
                          )}
                        </HStack>
                      </StandardCard>
                    )}
                </Box>
              </SimpleGrid>

              {/* Full Width Content Sections */}
              <VStack spacing={{ base: 4, md: 5 }} align="stretch">
                {/* Location and Operations Grid */}
                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 4, md: 6 }}>
                  {/* Location Column */}
                  <StandardCard title="Location Details" variant="flat" icon={MdLocationOn}>
                    <VStack spacing={3} align="stretch">
                      {establishmentData?.address && (
                        <HStack>
                          <Icon as={FaMapMarkerAlt} color="green.600" />
                          <Text fontWeight="medium">Address:</Text>
                          <Text>{establishmentData.address}</Text>
                        </HStack>
                      )}
                      {establishmentData?.city && (
                        <HStack>
                          <Icon as={MdBusiness} color="green.600" />
                          <Text fontWeight="medium">City:</Text>
                          <Text>{establishmentData.city}</Text>
                        </HStack>
                      )}
                      {establishmentData?.state && (
                        <HStack>
                          <Icon as={MdBusiness} color="green.600" />
                          <Text fontWeight="medium">State:</Text>
                          <Text>{establishmentData.state}</Text>
                        </HStack>
                      )}
                      {establishmentData?.country && (
                        <HStack>
                          <Icon as={FaGlobe} color="green.600" />
                          <Text fontWeight="medium">Country:</Text>
                          <Text>{establishmentData.country}</Text>
                        </HStack>
                      )}
                      {establishmentData?.zip_code && (
                        <HStack>
                          <Icon as={FaMapMarkerAlt} color="green.600" />
                          <Text fontWeight="medium">ZIP Code:</Text>
                          <Text>{establishmentData.zip_code}</Text>
                        </HStack>
                      )}
                      {establishmentData?.zone && (
                        <HStack>
                          <Icon as={MdLocationOn} color="green.600" />
                          <Text fontWeight="medium">Zone:</Text>
                          <Text>{establishmentData.zone}</Text>
                        </HStack>
                      )}
                      {typeof establishmentData?.latitude === 'number' &&
                        typeof establishmentData?.longitude === 'number' &&
                        !isNaN(establishmentData.latitude) &&
                        !isNaN(establishmentData.longitude) && (
                          <HStack>
                            <Icon as={FaMapMarkerAlt} color="green.600" />
                            <Text fontWeight="medium">Coordinates:</Text>
                            <Text>{`${establishmentData.latitude.toFixed(
                              6
                            )}, ${establishmentData.longitude.toFixed(6)}`}</Text>
                          </HStack>
                        )}
                    </VStack>
                  </StandardCard>

                  {/* Operations and Company Combined Column */}
                  <VStack spacing={{ base: 4, md: 5 }} align="stretch">
                    {/* Operations Information */}
                    <StandardCard title="Operations" variant="flat" icon={FaTractor}>
                      <VStack spacing={4} align="stretch">
                        {establishmentData?.farming_method && (
                          <HStack spacing={3} p={2} borderRadius="md">
                            <Icon as={MdEco} color="green.600" boxSize={5} />
                            <VStack spacing={0} align="start" flex={1}>
                              <Text fontSize="sm" color="green.600" fontWeight="medium">
                                Farming Method
                              </Text>
                              <Text fontWeight="600" color="green.800">
                                {establishmentData.farming_method}
                              </Text>
                            </VStack>
                          </HStack>
                        )}
                        {establishmentData?.total_acreage && (
                          <HStack>
                            <Icon as={FaTractor} color="green.600" />
                            <Text fontWeight="medium">Total Acreage:</Text>
                            <Text>{establishmentData.total_acreage} acres</Text>
                          </HStack>
                        )}
                        {establishmentData?.employee_count && (
                          <HStack>
                            <Icon as={FaUsers} color="green.600" />
                            <Text fontWeight="medium">Employees:</Text>
                            <Text>{establishmentData.employee_count}</Text>
                          </HStack>
                        )}
                        {establishmentData?.year_established && (
                          <HStack>
                            <Icon as={FaCalendar} color="green.600" />
                            <Text fontWeight="medium">Established:</Text>
                            <Text>{establishmentData.year_established}</Text>
                          </HStack>
                        )}
                      </VStack>
                    </StandardCard>

                    {/* Company Information - Enhanced with Missing Fields */}
                    <StandardCard title="Company Details" variant="flat" icon={FaBuilding}>
                      <VStack spacing={3} align="stretch">
                        <HStack>
                          <Icon as={FaBuilding} color="green.600" />
                          <Text fontWeight="medium">Company:</Text>
                          <Text>{establishmentData?.company?.name || 'Not specified'}</Text>
                        </HStack>
                        {/* Trade Name (DBA) if different from company name */}
                        {establishmentData?.company?.tradename &&
                          establishmentData.company.tradename !==
                            establishmentData.company.name && (
                            <HStack>
                              <Icon as={FaRegIdBadge} color="blue.600" />
                              <Text fontWeight="medium">Trade Name:</Text>
                              <Text>{establishmentData.company.tradename}</Text>
                            </HStack>
                          )}
                        {/* Industry - Critical business context */}
                        {establishmentData?.company?.industry && (
                          <HStack>
                            <Icon as={FaLeaf} color="green.600" />
                            <Text fontWeight="medium">Industry:</Text>
                            <Text>{establishmentData.company.industry}</Text>
                          </HStack>
                        )}
                        {/* Legal Structure - Important for business transparency */}
                        {establishmentData?.company?.legal_structure && (
                          <HStack>
                            <Icon as={FaCertificate} color="purple.600" />
                            <Text fontWeight="medium">Legal Structure:</Text>
                            <Text>{establishmentData.company.legal_structure}</Text>
                          </HStack>
                        )}
                        {/* Primary Commodities - What they produce */}
                        {establishmentData?.company?.primary_commodities && (
                          <HStack>
                            <Icon as={FaSeedling} color="orange.600" />
                            <Text fontWeight="medium">Primary Commodities:</Text>
                            <Text>{establishmentData.company.primary_commodities}</Text>
                          </HStack>
                        )}
                        {/* Sustainability Commitment - Valuable for transparency */}
                        {establishmentData?.company?.sustainability_commitment && (
                          <HStack>
                            <Icon as={MdEco} color="green.600" />
                            <Text fontWeight="medium">Sustainability Commitment:</Text>
                            <Text>{establishmentData.company.sustainability_commitment}</Text>
                          </HStack>
                        )}
                      </VStack>
                    </StandardCard>
                  </VStack>
                </SimpleGrid>

                {/* Agricultural Operations - Full Width */}
                {(getWaterSources().length > 0 ||
                  establishmentData?.climate_zone ||
                  getSoilTypes().length > 0 ||
                  getConservationPractices().length > 0 ||
                  getIrrigationMethods().length > 0) && (
                  <StandardCard title="Agricultural Operations" variant="flat" icon={FaLeaf}>
                    <VStack spacing={4} align="stretch">
                      {/* Climate Zone - Key Information */}
                      {establishmentData?.climate_zone && (
                        <HStack
                          spacing={3}
                          p={3}
                          bg="green.50"
                          borderRadius="lg"
                          border="1px solid"
                          borderColor="green.200"
                        >
                          <Icon as={MdEco} color="green.600" boxSize={5} />
                          <VStack spacing={1} align="start" flex={1}>
                            <Text fontSize="sm" color="green.600" fontWeight="medium">
                              Climate Zone
                            </Text>
                            <Text fontWeight="600" color="green.800">
                              {establishmentData.climate_zone}
                            </Text>
                          </VStack>
                        </HStack>
                      )}

                      {/* Operational Details - Condensed View */}
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                        {/* Water & Irrigation */}
                        {(getWaterSources().length > 0 || getIrrigationMethods().length > 0) && (
                          <Box
                            p={4}
                            bg="blue.50"
                            borderRadius="lg"
                            border="1px solid"
                            borderColor="blue.200"
                          >
                            <HStack spacing={2} mb={3}>
                              <Icon as={FaTint} color="blue.600" boxSize={4} />
                              <Text fontSize="sm" fontWeight="600" color="blue.800">
                                Water & Irrigation
                              </Text>
                            </HStack>
                            <VStack spacing={2} align="start">
                              {getWaterSources().length > 0 && (
                                <Text fontSize="sm" color="blue.700">
                                  <Text as="span" fontWeight="medium">
                                    Sources:
                                  </Text>{' '}
                                  {getWaterSources().slice(0, 2).join(', ')}
                                  {getWaterSources().length > 2 &&
                                    ` +${getWaterSources().length - 2} more`}
                                </Text>
                              )}
                              {getIrrigationMethods().length > 0 && (
                                <Text fontSize="sm" color="blue.700">
                                  <Text as="span" fontWeight="medium">
                                    Methods:
                                  </Text>{' '}
                                  {getIrrigationMethods().slice(0, 2).join(', ')}
                                  {getIrrigationMethods().length > 2 &&
                                    ` +${getIrrigationMethods().length - 2} more`}
                                </Text>
                              )}
                            </VStack>
                          </Box>
                        )}

                        {/* Soil & Conservation */}
                        {(getSoilTypes().length > 0 || getConservationPractices().length > 0) && (
                          <Box
                            p={4}
                            bg="green.50"
                            borderRadius="lg"
                            border="1px solid"
                            borderColor="green.200"
                          >
                            <HStack spacing={2} mb={3}>
                              <Icon as={MdEco} color="green.600" boxSize={4} />
                              <Text fontSize="sm" fontWeight="600" color="green.800">
                                Soil & Conservation
                              </Text>
                            </HStack>
                            <VStack spacing={2} align="start">
                              {getSoilTypes().length > 0 && (
                                <Text fontSize="sm" color="green.700">
                                  <Text as="span" fontWeight="medium">
                                    Soil:
                                  </Text>{' '}
                                  {getSoilTypes().slice(0, 2).join(', ')}
                                  {getSoilTypes().length > 2 &&
                                    ` +${getSoilTypes().length - 2} more`}
                                </Text>
                              )}
                              {getConservationPractices().length > 0 && (
                                <Text fontSize="sm" color="green.700">
                                  <Text as="span" fontWeight="medium">
                                    Practices:
                                  </Text>{' '}
                                  {getConservationPractices().slice(0, 2).join(', ')}
                                  {getConservationPractices().length > 2 &&
                                    ` +${getConservationPractices().length - 2} more`}
                                </Text>
                              )}
                            </VStack>
                          </Box>
                        )}
                      </SimpleGrid>
                    </VStack>
                  </StandardCard>
                )}

                {/* Crops, Certifications, and Sustainability Section - Compact */}
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 4, md: 5 }}>
                  {/* Crops Grown */}
                  {getCropsGrown().length > 0 && (
                    <StandardCard title="Crops Grown" variant="flat" icon={FaSeedling}>
                      <Flex gap={3} flexWrap="wrap" justify="center" align="flex-start">
                        {getCropsGrown().map((crop: string, index: number) => (
                          <Tag
                            key={index}
                            size="md"
                            variant="subtle"
                            colorScheme="green"
                            borderRadius="full"
                            px={4}
                            py={2}
                            fontWeight="500"
                          >
                            <TagLabel>{crop}</TagLabel>
                          </Tag>
                        ))}
                      </Flex>
                    </StandardCard>
                  )}

                  {/* Certifications */}
                  {getCertifications().length > 0 && (
                    <StandardCard title="Certifications" variant="flat" icon={FaCertificate}>
                      <Flex gap={3} flexWrap="wrap" justify="center" align="flex-start">
                        {getCertifications().map((cert: string, index: number) => (
                          <Tag
                            key={index}
                            size="md"
                            variant="subtle"
                            colorScheme="blue"
                            borderRadius="full"
                            px={4}
                            py={2}
                            fontWeight="500"
                          >
                            <TagLabel>{cert}</TagLabel>
                          </Tag>
                        ))}
                      </Flex>
                    </StandardCard>
                  )}

                  {/* Sustainability Practices */}
                  {getSustainabilityPractices().length > 0 && (
                    <StandardCard title="Sustainability Practices" variant="flat" icon={MdEco}>
                      <Flex gap={3} flexWrap="wrap" justify="center" align="flex-start">
                        {getSustainabilityPractices().map((practice: string, index: number) => (
                          <Tag
                            key={index}
                            size="md"
                            variant="subtle"
                            colorScheme="green"
                            borderRadius="full"
                            px={4}
                            py={2}
                            fontWeight="500"
                          >
                            <TagLabel>{practice}</TagLabel>
                          </Tag>
                        ))}
                      </Flex>
                    </StandardCard>
                  )}
                </SimpleGrid>

                {/* About and Information Sections - Compact */}
                <VStack spacing={{ base: 4, md: 4 }} align="stretch">
                  {/* About Section */}
                  {establishmentData?.about && (
                    <StandardCard
                      title="About This Establishment"
                      variant="flat"
                      icon={FaRegCommentDots}
                    >
                      <Text lineHeight="relaxed" textAlign="left" color="gray.700">
                        {establishmentData.about}
                      </Text>
                    </StandardCard>
                  )}

                  {/* Main Activities */}
                  {establishmentData?.main_activities && (
                    <StandardCard
                      title="Main Activities & Services"
                      variant="flat"
                      icon={FaRegListAlt}
                    >
                      <Text lineHeight="relaxed" textAlign="left" color="gray.700">
                        {establishmentData.main_activities}
                      </Text>
                    </StandardCard>
                  )}

                  {/* Location Highlights */}
                  {establishmentData?.location_highlights && (
                    <StandardCard title="Location Highlights" variant="flat" icon={FaRegLightbulb}>
                      <Text lineHeight="relaxed" textAlign="left" color="gray.700">
                        {establishmentData.location_highlights}
                      </Text>
                    </StandardCard>
                  )}

                  {/* Custom Message */}
                  {establishmentData?.custom_message && (
                    <StandardCard title="Special Message" variant="flat" icon={FaRegCommentDots}>
                      <Text
                        lineHeight="relaxed"
                        textAlign="left"
                        color="gray.700"
                        fontStyle="italic"
                      >
                        "{establishmentData.custom_message}"
                      </Text>
                    </StandardCard>
                  )}
                </VStack>
              </VStack>
            </Box>
          </CardBody>
        </Card>
      </Flex>
    </Flex>
  );
}

export default ProfileEstablishment;
