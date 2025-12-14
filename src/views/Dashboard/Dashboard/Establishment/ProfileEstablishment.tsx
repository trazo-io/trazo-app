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
import { useGetEstablishmentQuery } from 'store/api/companyApi';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import { StandardButton, StandardPage } from 'components/Design/StandardComponents';

// Import new ProfileSections shared components for modern UI
import {
  ProfileHeader,
  ProfileSection,
  ProfileDataGrid,
  ProfileImageGallery,
  TransparencyScoreCard
} from 'components/ProfileSections';

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
                  size={{ base: '56px', md: '48px' }}
                  bg="green.100"
                  color="green.600"
                  cursor="default"
                >
                  <Icon as={FaTractor} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.800">
                    {establishmentData?.total_acreage || 0}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Acres
                  </Text>
                </VStack>
              </VStack>

              <VStack spacing={{ base: 3, sm: 2 }}>
                <Circle
                  size={{ base: '56px', md: '48px' }}
                  bg="blue.100"
                  color="blue.600"
                  cursor="default"
                >
                  <Icon as={FaUsers} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.800">
                    {establishmentData?.employee_count || 0}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Employees
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
                  <Icon as={FaCalendar} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.800">
                    {establishmentData?.year_established || '--'}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Founded
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
                  <Icon as={FaSeedling} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.800">
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

      {/* Main Content Container - Matching TransparencyDashboard layout */}
      <Box
        maxW="full"
        px={6}
        mt="-60px"
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
                        height={{ base: '200px', sm: '250px', md: '280px', lg: '300px' }}
                        maxDisplayImages={3}
                      />
                    </Box>

                    {/* Contact Information - Refactored with ProfileDataGrid */}
                    <ProfileSection
                      title="Contact Information"
                      icon={FaPhone}
                    >
                      <ProfileDataGrid
                        data={[
                          {
                            label: 'Email',
                            value: establishmentData?.email,
                            type: 'link',
                            href: establishmentData?.email ? `mailto:${establishmentData.email}` : undefined,
                            conditional: !!establishmentData?.email
                          },
                          {
                            label: 'Phone',
                            value: establishmentData?.phone,
                            type: 'link',
                            href: establishmentData?.phone ? `tel:${establishmentData.phone}` : undefined,
                            conditional: !!establishmentData?.phone
                          },
                          {
                            label: 'Contact Person',
                            value: establishmentData?.contact_person,
                            type: 'text',
                            conditional: !!establishmentData?.contact_person
                          },
                          {
                            label: 'Alternative Email',
                            value: establishmentData?.contact_email,
                            type: 'link',
                            href: establishmentData?.contact_email ? `mailto:${establishmentData.contact_email}` : undefined,
                            conditional: !!(establishmentData?.contact_email && establishmentData.contact_email !== establishmentData.email)
                          },
                          {
                            label: 'Alternative Phone',
                            value: establishmentData?.contact_phone,
                            type: 'link',
                            href: establishmentData?.contact_phone ? `tel:${establishmentData.contact_phone}` : undefined,
                            conditional: !!(establishmentData?.contact_phone && establishmentData.contact_phone !== establishmentData.phone)
                          }
                        ].filter((item) => item.conditional !== false && item.value !== undefined && item.value !== null)}
                        columns={{ base: 1, md: 1 }}
                      />
                    </ProfileSection>

                    {/* Social Media & Web Presence */}
                    {(establishmentData?.company?.website ||
                      establishmentData?.company?.facebook ||
                      establishmentData?.company?.instagram) && (
                      <ProfileSection title="Web Presence" icon={FaGlobe}>
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
                      </ProfileSection>
                    )}
                  </VStack>
                )}

                {/* Main Content Column */}
                <Box>
                  {/* Compact Empty Photos State - Only show when no photos */}
                  {(!establishmentData?.images || establishmentData.images.length === 0) && (
                    <Box mb={{ base: 4, sm: 5 }}>
                      <ProfileSection title="Establishment Photos" icon={FaBuilding}>
                        <VStack spacing={3} py={2} align="center">
                          <Circle size="40px" bg="gray.100" color="gray.400">
                            <Icon as={FaBuilding} boxSize={4} />
                          </Circle>
                          <VStack spacing={1} align="center">
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
                      </ProfileSection>
                    </Box>
                  )}

                  {/* Contact Information - Only show when no photos */}
                  {(!establishmentData?.images || establishmentData.images.length === 0) && (
                    <Box mb={{ base: 4, sm: 5 }}>
                      <ProfileSection
                        title="Contact Information"
                        icon={FaPhone}
                      >
                        <ProfileDataGrid
                          data={[
                            {
                              label: 'Email',
                              value: establishmentData?.email,
                              type: 'link',
                              href: establishmentData?.email ? `mailto:${establishmentData.email}` : undefined,
                              conditional: !!establishmentData?.email
                            },
                            {
                              label: 'Phone',
                              value: establishmentData?.phone,
                              type: 'link',
                              href: establishmentData?.phone ? `tel:${establishmentData.phone}` : undefined,
                              conditional: !!establishmentData?.phone
                            },
                            {
                              label: 'Contact Person',
                              value: establishmentData?.contact_person,
                              type: 'text',
                              conditional: !!establishmentData?.contact_person
                            },
                            {
                              label: 'Alternative Email',
                              value: establishmentData?.contact_email,
                              type: 'link',
                              href: establishmentData?.contact_email ? `mailto:${establishmentData.contact_email}` : undefined,
                              conditional: !!(establishmentData?.contact_email && establishmentData.contact_email !== establishmentData.email)
                            },
                            {
                              label: 'Alternative Phone',
                              value: establishmentData?.contact_phone,
                              type: 'link',
                              href: establishmentData?.contact_phone ? `tel:${establishmentData.contact_phone}` : undefined,
                              conditional: !!(establishmentData?.contact_phone && establishmentData.contact_phone !== establishmentData.phone)
                            }
                          ].filter((item) => item.conditional !== false && item.value !== undefined && item.value !== null)}
                          columns={{ base: 1, md: 1 }}
                        />
                      </ProfileSection>
                    </Box>
                  )}

                  {/* Social Media & Web Presence - Only show when no photos */}
                  {(!establishmentData?.images || establishmentData.images.length === 0) &&
                    (establishmentData?.company?.website ||
                      establishmentData?.company?.facebook ||
                      establishmentData?.company?.instagram) && (
                      <Box mb={{ base: 4, sm: 5 }}>
                        <ProfileSection title="Web Presence" icon={FaGlobe}>
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
                        </ProfileSection>
                      </Box>
                    )}
                </Box>
              </SimpleGrid>

              {/* Full Width Content Sections */}
              <VStack spacing={{ base: 4, md: 5 }} align="stretch">
                {/* Location and Operations Grid */}
                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 4, md: 6 }}>
                  {/* Location Column */}
                  <ProfileSection title="Location Details" icon={MdLocationOn}>
                    <ProfileDataGrid
                      data={[
                        { label: 'Address', value: establishmentData?.address, type: 'text', conditional: !!establishmentData?.address },
                        { label: 'City', value: establishmentData?.city, type: 'text', conditional: !!establishmentData?.city },
                        { label: 'State', value: establishmentData?.state, type: 'text', conditional: !!establishmentData?.state },
                        { label: 'Country', value: establishmentData?.country, type: 'text', conditional: !!establishmentData?.country },
                        { label: 'ZIP Code', value: establishmentData?.zip_code, type: 'text', conditional: !!establishmentData?.zip_code },
                        { label: 'Zone', value: establishmentData?.zone, type: 'text', conditional: !!establishmentData?.zone },
                        {
                          label: 'Coordinates',
                          value:
                            typeof establishmentData?.latitude === 'number' &&
                            typeof establishmentData?.longitude === 'number' &&
                            !isNaN(establishmentData.latitude) &&
                            !isNaN(establishmentData.longitude)
                              ? `${establishmentData.latitude.toFixed(6)}, ${establishmentData.longitude.toFixed(6)}`
                              : undefined,
                          type: 'text',
                          conditional:
                            typeof establishmentData?.latitude === 'number' &&
                            typeof establishmentData?.longitude === 'number' &&
                            !isNaN(establishmentData.latitude) &&
                            !isNaN(establishmentData.longitude)
                        }
                      ].filter((item) => item.conditional !== false && item.value !== undefined && item.value !== null)}
                      columns={{ base: 1, md: 1 }}
                    />
                  </ProfileSection>

                  {/* Operations and Company Combined Column */}
                  <VStack spacing={{ base: 4, md: 5 }} align="stretch">
                    {/* Operations Information */}
                    <ProfileSection title="Operations" icon={FaTractor}>
                      <ProfileDataGrid
                        data={[
                          { label: 'Farming Method', value: establishmentData?.farming_method, type: 'badge', colorScheme: 'green', conditional: !!establishmentData?.farming_method },
                          { label: 'Total Acreage', value: establishmentData?.total_acreage ? `${establishmentData.total_acreage} acres` : undefined, type: 'text', conditional: !!establishmentData?.total_acreage },
                          { label: 'Employees', value: establishmentData?.employee_count, type: 'text', conditional: !!establishmentData?.employee_count },
                          { label: 'Year Established', value: establishmentData?.year_established, type: 'text', conditional: !!establishmentData?.year_established }
                        ].filter((item) => item.conditional !== false && item.value !== undefined && item.value !== null)}
                        columns={{ base: 1, md: 2 }}
                      />
                    </ProfileSection>

                    {/* Company Information */}
                    <ProfileSection title="Company Details" icon={FaBuilding}>
                      <ProfileDataGrid
                        data={[
                          { label: 'Company', value: establishmentData?.company?.name, type: 'text', conditional: !!establishmentData?.company?.name },
                          {
                            label: 'Trade Name',
                            value: establishmentData?.company?.tradename,
                            type: 'text',
                            conditional: !!(establishmentData?.company?.tradename && establishmentData.company.tradename !== establishmentData.company.name)
                          },
                          { label: 'Industry', value: establishmentData?.company?.industry, type: 'text', conditional: !!establishmentData?.company?.industry },
                          { label: 'Legal Structure', value: establishmentData?.company?.legal_structure, type: 'text', conditional: !!establishmentData?.company?.legal_structure },
                          { label: 'Primary Commodities', value: establishmentData?.company?.primary_commodities, type: 'text', conditional: !!establishmentData?.company?.primary_commodities },
                          { label: 'Sustainability Commitment', value: establishmentData?.company?.sustainability_commitment, type: 'text', conditional: !!establishmentData?.company?.sustainability_commitment }
                        ].filter((item) => item.conditional !== false && item.value !== undefined && item.value !== null)}
                        columns={{ base: 1, md: 1 }}
                      />
                    </ProfileSection>
                  </VStack>
                </SimpleGrid>

                {/* Agricultural Operations - Full Width */}
                {(getWaterSources().length > 0 ||
                  establishmentData?.climate_zone ||
                  getSoilTypes().length > 0 ||
                  getConservationPractices().length > 0 ||
                  getIrrigationMethods().length > 0) && (
                  <ProfileSection title="Agricultural Operations" icon={FaLeaf}>
                    <VStack spacing={4} align="stretch">
                      {/* Climate Zone */}
                      {establishmentData?.climate_zone && (
                        <Box
                          p={3}
                          bg="green.50"
                          borderRadius="lg"
                          border="1px solid"
                          borderColor="green.200"
                        >
                          <HStack spacing={2} mb={2}>
                            <Icon as={MdEco} color="green.600" boxSize={5} />
                            <Text fontSize="sm" color="green.600" fontWeight="medium">
                              Climate Zone
                            </Text>
                          </HStack>
                          <Text fontWeight="600" color="green.800" ml={7}>
                            {establishmentData.climate_zone}
                          </Text>
                        </Box>
                      )}

                      {/* Water & Irrigation Summary */}
                      {(getWaterSources().length > 0 || getIrrigationMethods().length > 0) && (
                        <Box
                          p={3}
                          bg="blue.50"
                          borderRadius="lg"
                          border="1px solid"
                          borderColor="blue.200"
                        >
                          <HStack spacing={2} mb={2}>
                            <Icon as={FaTint} color="blue.600" boxSize={4} />
                            <Text fontSize="sm" fontWeight="600" color="blue.800">
                              Water & Irrigation
                            </Text>
                          </HStack>
                          <VStack spacing={1} align="start" ml={6}>
                            {getWaterSources().length > 0 && (
                              <Text fontSize="sm" color="blue.700">
                                <Text as="span" fontWeight="medium">Sources:</Text> {getWaterSources().join(', ')}
                              </Text>
                            )}
                            {getIrrigationMethods().length > 0 && (
                              <Text fontSize="sm" color="blue.700">
                                <Text as="span" fontWeight="medium">Methods:</Text> {getIrrigationMethods().join(', ')}
                              </Text>
                            )}
                          </VStack>
                        </Box>
                      )}

                      {/* Soil & Conservation Summary */}
                      {(getSoilTypes().length > 0 || getConservationPractices().length > 0) && (
                        <Box
                          p={3}
                          bg="green.50"
                          borderRadius="lg"
                          border="1px solid"
                          borderColor="green.200"
                        >
                          <HStack spacing={2} mb={2}>
                            <Icon as={MdEco} color="green.600" boxSize={4} />
                            <Text fontSize="sm" fontWeight="600" color="green.800">
                              Soil & Conservation
                            </Text>
                          </HStack>
                          <VStack spacing={1} align="start" ml={6}>
                            {getSoilTypes().length > 0 && (
                              <Text fontSize="sm" color="green.700">
                                <Text as="span" fontWeight="medium">Soil Types:</Text> {getSoilTypes().join(', ')}
                              </Text>
                            )}
                            {getConservationPractices().length > 0 && (
                              <Text fontSize="sm" color="green.700">
                                <Text as="span" fontWeight="medium">Practices:</Text> {getConservationPractices().join(', ')}
                              </Text>
                            )}
                          </VStack>
                        </Box>
                      )}
                    </VStack>
                  </ProfileSection>
                )}

                {/* Crops, Certifications, and Sustainability Section */}
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 4, md: 5 }}>
                  {/* Crops Grown */}
                  {getCropsGrown().length > 0 && (
                    <ProfileSection title="Crops Grown" icon={FaSeedling}>
                      <Flex gap={3} flexWrap="wrap" justify="flex-start" align="flex-start">
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
                    </ProfileSection>
                  )}

                  {/* Certifications */}
                  {getCertifications().length > 0 && (
                    <ProfileSection title="Certifications" icon={FaCertificate}>
                      <Flex gap={3} flexWrap="wrap" justify="flex-start" align="flex-start">
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
                    </ProfileSection>
                  )}

                  {/* Sustainability Practices */}
                  {getSustainabilityPractices().length > 0 && (
                    <ProfileSection title="Sustainability Practices" icon={MdEco}>
                      <Flex gap={3} flexWrap="wrap" justify="flex-start" align="flex-start">
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
                    </ProfileSection>
                  )}
                </SimpleGrid>

                {/* About and Information Sections */}
                <VStack spacing={{ base: 4, md: 4 }} align="stretch">
                  {/* About Section */}
                  {establishmentData?.about && (
                    <ProfileSection title="About This Establishment" icon={FaRegCommentDots}>
                      <Text lineHeight="relaxed" textAlign="left" color="gray.700">
                        {establishmentData.about}
                      </Text>
                    </ProfileSection>
                  )}

                  {/* Main Activities */}
                  {establishmentData?.main_activities && (
                    <ProfileSection title="Main Activities & Services" icon={FaRegListAlt}>
                      <Text lineHeight="relaxed" textAlign="left" color="gray.700">
                        {establishmentData.main_activities}
                      </Text>
                    </ProfileSection>
                  )}

                  {/* Location Highlights */}
                  {establishmentData?.location_highlights && (
                    <ProfileSection title="Location Highlights" icon={FaRegLightbulb}>
                      <Text lineHeight="relaxed" textAlign="left" color="gray.700">
                        {establishmentData.location_highlights}
                      </Text>
                    </ProfileSection>
                  )}

                  {/* Custom Message */}
                  {establishmentData?.custom_message && (
                    <ProfileSection title="Special Message" icon={FaRegCommentDots}>
                      <Text
                        lineHeight="relaxed"
                        textAlign="left"
                        color="gray.700"
                        fontStyle="italic"
                      >
                        "{establishmentData.custom_message}"
                      </Text>
                    </ProfileSection>
                  )}
                </VStack>
              </VStack>
            </Box>
          </CardBody>
        </Card>
      </Box>
    </Flex>
  );
}

export default ProfileEstablishment;
