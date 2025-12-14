// Chakra imports
import {
  Box,
  Container,
  Flex,
  HStack,
  Icon,
  Link,
  SimpleGrid,
  Tag,
  TagLabel,
  Text,
  VStack,
  useColorModeValue,
  useBreakpointValue,
  Heading,
  Divider,
  Circle,
  Badge,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  useToast,
  IconButton,
  Button
} from '@chakra-ui/react';
import {
  FaMapMarkedAlt,
  FaTractor,
  FaEdit,
  FaTrash,
  FaShare,
  FaEye,
  FaSeedling,
  FaCertificate,
  FaPhone,
  FaEnvelope,
  FaUsers,
  FaMapMarkerAlt,
  FaGlobe,
  FaBuilding,
  FaRegCommentDots,
  FaRegListAlt,
  FaCalendar,
  FaLeaf,
  FaTint,
  FaChevronLeft
} from 'react-icons/fa';
import { MdLocationOn, MdBusiness, MdEco, MdVerified } from 'react-icons/md';
import { IoEllipsisVerticalSharp } from 'react-icons/io5';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import HTMLRenderer from 'components/Utils/HTMLRenderer';
import { StandardImageGallery } from 'components/ImageGallery';
import { StandardPage } from 'components/Design/StandardComponents';
import { useGetParcelQuery } from 'store/api/productApi';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { formatAreaWithBothUnits } from '../../../../utils/areaUnits';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import { ParcelTransparencyScoreBreakdown } from 'components/Transparency/ParcelTransparencyScoreBreakdown';

// Import new ProfileSections shared components for modern UI
import {
  ProfileHeader,
  ProfileSection,
  ProfileDataGrid,
  ProfileImageGallery,
  TransparencyScoreCard
} from 'components/ProfileSections';

// Type definitions for Redux state
interface Company {
  id: string;
  name: string;
}

interface Establishment {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  zone?: string;
}

interface AgriculturalDetails {
  soil_ph?: string;
  soil_organic_matter?: string;
  soil_nitrogen?: string;
  soil_phosphorus?: string;
  irrigation_efficiency?: string;
  water_source_type?: string;
  water_quality_ph?: string;
  water_allocation_acre_feet?: string;
  cover_crop_management?: string;
  crop_rotation_pattern?: string;
  pest_management_strategy?: string;
  fertilization_program?: string;
  [key: string]: any;
}

interface ParcelData {
  id: string;
  name: string;
  area?: number;
  primary_crop?: string;
  crop_type?: string;
  soil_type?: string;
  certified?: boolean;
  certification_type?: string;
  images?: Array<{ url: string; caption?: string }>;
  unique_code?: string;
  carbon_calculation_enabled?: boolean;
  usda_compliance_eligible?: boolean;
  transparency_ready?: boolean;
  transparency_score?: number;
  transparency_description?: string;
  sustainability_practices?: string;
  consumer_story?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  elevation?: number;
  description?: string;
  agricultural_details?: AgriculturalDetails;
}

interface RootState {
  company: {
    currentCompany?: Company;
  };
  product: {
    currentParcel?: ParcelData;
  };
}

function ProfileParcel(): React.ReactElement {
  const intl = useIntl();
  const titleColor = useColorModeValue('green.500', 'green.400');
  const textColor = useColorModeValue('gray.700', 'white');
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const navigate = useNavigate();
  const toast = useToast();
  const { establishmentId, parcelId } = useParams<{ establishmentId: string; parcelId: string }>();
  const [establishment, setEstablishment] = useState<Establishment | null>(null);

  // Mobile-first responsive design
  const containerPadding = useBreakpointValue({ base: 4, md: 8 });
  const cardSpacing = useBreakpointValue({ base: 4, md: 6 });
  const headerFontSize = useBreakpointValue({ base: 'xl', md: '2xl' });

  const establishments = useSelector(
    (state: RootState) => state.company.currentCompany?.establishments || []
  );
  const currentCompany = useSelector((state: RootState) => state.company.currentCompany);
  const currentParcel = useSelector((state: RootState) => state.product.currentParcel);

  const {
    data: parcelData,
    error,
    isLoading: isParcelLoading,
    isFetching,
    refetch
  } = useGetParcelQuery(
    { companyId: currentCompany?.id || '', establishmentId: establishmentId || '', parcelId: parcelId || '' },
    {
      skip:
        parcelId === undefined ||
        currentParcel?.id === parcelId ||
        currentCompany?.id === undefined ||
        !establishmentId
    }
  );

  useEffect(() => {
    let foundEstablishment: Establishment | undefined;
    if (establishments && establishments.length > 0 && establishmentId) {
      foundEstablishment = establishments.find(
        (est: Establishment) => est.id.toString() === establishmentId
      );
      if (foundEstablishment) {
        setEstablishment(foundEstablishment);
      }
    }
  }, [establishmentId, establishments]);

  // Move useBreakpointValue to top level to avoid hooks rule violation
  const isMobile = useBreakpointValue({ base: true, md: false });

  const handleShare = async (): Promise<void> => {
    try {
      if (navigator.share && parcelData?.name) {
        await navigator.share({
          title: `${parcelData.name} - Parcel Profile`,
          text: `Check out this sustainable parcel! #Trazo #SustainableAgriculture`,
          url: window.location.href
        });
        toast({
          title: 'Shared Successfully',
          description: 'Parcel profile shared successfully.',
          status: 'success',
          duration: 3000,
          isClosable: true,
          position: 'top-right'
        });
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  // Simple loading state - matching ProfileEstablishment pattern
  if (isParcelLoading) {
    return (
      <Flex direction="column" alignSelf="center" justifySelf="center" overflow="hidden" w="100%">
        <Container maxW="6xl" mx="auto" py={20}>
          <Card bg={bgColor} p={6}>
            <Text textAlign="center" color={textColor}>
              Loading parcel data...
            </Text>
          </Card>
        </Container>
      </Flex>
    );
  }

  return (
    <Flex
      direction="column"
      alignSelf="center"
      justifySelf="center"
      overflow="hidden"
      w="100%"
      position="relative"
    >
      {/* Clean Modern Header - Standardized with Establishment */}
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
            {isMobile ? (
              // Mobile: Back button above title with full width
              <VStack spacing={4} w="full" align="center">
                <Flex w="full" justify="flex-start">
                  <Button
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}`)}
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
                  onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}`)}
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
                {parcelData?.name || 'Loading...'}
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
                {establishment?.name || 'Sustainable Agriculture'}
              </Text>
            </VStack>

            {/* Quick Stats - Standardized with Establishment */}
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
                    {parcelData?.area ? parcelData.area.toFixed(2) : '--'}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Hectares
                  </Text>
                  {parcelData?.area && (
                    <Text fontSize="xs" color="gray.500">
                      ({(parcelData.area * 2.47105).toFixed(1)} acres)
                    </Text>
                  )}
                </VStack>
              </VStack>

              <VStack spacing={{ base: 3, sm: 2 }}>
                <Circle
                  size={{ base: '60px', sm: '50px' }}
                  bg="blue.100"
                  color="blue.600"
                  cursor="default"
                >
                  <Icon as={FaSeedling} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: '2xl', sm: 'xl' }} fontWeight="bold" color="gray.800">
                    {parcelData?.primary_crop || parcelData?.crop_type || '--'}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Primary Crop
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
                  <Icon as={MdEco} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: '2xl', sm: 'xl' }} fontWeight="bold" color="gray.800">
                    {parcelData?.soil_type || '--'}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Soil Type
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
                  <Icon as={FaCertificate} boxSize={{ base: 7, sm: 6 }} />
                </Circle>
                <VStack spacing={{ base: 1, sm: 1 }}>
                  <Text fontSize={{ base: '2xl', sm: 'xl' }} fontWeight="bold" color="gray.800">
                    {parcelData?.certified ? 'Yes' : 'No'}
                  </Text>
                  <Text fontSize={{ base: 'md', sm: 'sm' }} color="gray.600" fontWeight="medium">
                    Certified
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
                  aria-label="Open parcel menu"
                  _hover={{ bg: 'gray.50' }}
                  _active={{ bg: 'gray.100' }}
                />
                <MenuList fontSize={{ base: 'md', md: 'sm' }} minW={{ base: '200px', md: '180px' }}>
                  <MenuItem
                    onClick={() =>
                      navigate(
                        `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/change`
                      )
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
                  colorScheme="green"
                  fontSize="sm"
                  px={4}
                  py={2}
                  borderRadius="lg"
                  fontWeight="600"
                  textTransform="none"
                  bg="green.50"
                  color="green.700"
                  border="1px solid"
                  borderColor="green.200"
                >
                  <HStack spacing={2}>
                    <Circle size="8px" bg="green.500" />
                    <Text>Active</Text>
                  </HStack>
                </Badge>

                {parcelData?.certified && (
                  <Badge
                    variant="subtle"
                    colorScheme="blue"
                    fontSize="sm"
                    px={4}
                    py={2}
                    borderRadius="lg"
                    fontWeight="600"
                    textTransform="none"
                    bg="blue.50"
                    color="blue.700"
                    border="1px solid"
                    borderColor="blue.200"
                  >
                    <HStack spacing={2}>
                      <Icon as={FaCertificate} boxSize={3} color="blue.500" />
                      <Text>Certified</Text>
                    </HStack>
                  </Badge>
                )}

                {parcelData?.carbon_calculation_enabled && (
                  <Badge
                    variant="subtle"
                    colorScheme="purple"
                    fontSize="sm"
                    px={4}
                    py={2}
                    borderRadius="lg"
                    fontWeight="500"
                    textTransform="none"
                    bg="purple.50"
                    color="purple.700"
                    border="1px solid"
                    borderColor="purple.200"
                  >
                    <HStack spacing={2}>
                      <Icon as={FaLeaf} boxSize={3} color="purple.500" />
                      <Text>Carbon Tracking</Text>
                    </HStack>
                  </Badge>
                )}

                {parcelData?.usda_compliance_eligible && (
                  <Badge
                    variant="subtle"
                    colorScheme="orange"
                    fontSize="sm"
                    px={4}
                    py={2}
                    borderRadius="lg"
                    fontWeight="500"
                    textTransform="none"
                    bg="orange.50"
                    color="orange.700"
                    border="1px solid"
                    borderColor="orange.200"
                  >
                    <HStack spacing={2}>
                      <Icon as={MdVerified} boxSize={3} color="orange.500" />
                      <Text>USDA Eligible</Text>
                    </HStack>
                  </Badge>
                )}

                {parcelData?.transparency_ready && (
                  <Badge
                    variant="subtle"
                    colorScheme="cyan"
                    fontSize="sm"
                    px={4}
                    py={2}
                    borderRadius="lg"
                    fontWeight="600"
                    textTransform="none"
                    bg="cyan.50"
                    color="cyan.700"
                    border="1px solid"
                    borderColor="cyan.200"
                  >
                    <HStack spacing={2}>
                      <Icon as={FaEye} boxSize={3} color="cyan.500" />
                      <Text>Consumer Ready</Text>
                    </HStack>
                  </Badge>
                )}

                {parcelData?.transparency_score && parcelData.transparency_score > 0 && (
                  <Badge
                    variant="subtle"
                    colorScheme="teal"
                    fontSize="sm"
                    px={4}
                    py={2}
                    borderRadius="lg"
                    fontWeight="600"
                    textTransform="none"
                    bg="teal.50"
                    color="teal.700"
                    border="1px solid"
                    borderColor="teal.200"
                  >
                    <HStack spacing={2}>
                      <Circle size="8px" bg="teal.500" />
                      <Text>Transparency: {parcelData.transparency_score}%</Text>
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
                  Parcel Information
                </Heading>
              </Flex>
            </VStack>
          </CardHeader>

          <CardBody>
            <SimpleGrid
              columns={{ base: 1, lg: 2 }}
              spacing={{ base: 6, md: 8 }}
              mb={{ base: 6, md: 10 }}
            >
              {/* Left Column */}
              <Box>
                {/* Image Gallery */}
                <Box mb={{ base: 4, md: 6 }}>
                  <StandardImageGallery
                    images={parcelData?.images || []}
                    title="Parcel Photos"
                    variant="default"
                    enablePreview={true}
                    showImageCount={true}
                    height={{ base: '200px', sm: '250px', md: '280px', lg: '300px' }}
                    showEmptyState={true}
                    maxDisplayImages={3}
                  />
                </Box>

                {/* Basic Information - Refactored with ProfileSection */}
                <ProfileSection
                  title="Basic Information"
                  icon={FaBuilding}
                  mb={{ base: 4, md: 6 }}
                >
                  <ProfileDataGrid
                    data={[
                      { label: 'Name', value: parcelData?.name, type: 'text', conditional: !!parcelData?.name },
                      {
                        label: 'Area',
                        value: parcelData?.area ? formatAreaWithBothUnits(parcelData.area, 'METRIC') : undefined,
                        type: 'text',
                        conditional: !!parcelData?.area
                      },
                      { label: 'Unique Code', value: parcelData?.unique_code, type: 'text', conditional: !!parcelData?.unique_code },
                      { label: 'Primary Crop', value: parcelData?.primary_crop || parcelData?.crop_type, type: 'text', conditional: !!(parcelData?.primary_crop || parcelData?.crop_type) },
                      { label: 'Soil Type', value: parcelData?.soil_type, type: 'text', conditional: !!parcelData?.soil_type }
                    ].filter((item) => item.conditional !== false && item.value !== undefined && item.value !== null)}
                    columns={{ base: 1, md: 2 }}
                  />
                </ProfileSection>

                {/* 🎯 TRANSPARENCY SCORE BREAKDOWN - Shows farmers how to improve */}
                <Box mb={{ base: 4, md: 6 }}>
                  <ParcelTransparencyScoreBreakdown
                    parcelData={{
                      transparency_score: parcelData?.transparency_score,
                      transparency_description: parcelData?.transparency_description,
                      sustainability_practices: parcelData?.sustainability_practices,
                      consumer_story: parcelData?.consumer_story,
                      images: parcelData?.images,
                      certified: parcelData?.certified,
                      certification_type: parcelData?.certification_type
                    }}
                    variant="full"
                    showEditButton={true}
                    onEditClick={() =>
                      navigate(
                        `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/change`
                      )
                    }
                  />
                </Box>

                {/* 🎯 TRANSPARENCY STORY SECTION - Consumer-Facing Narrative */}
                {(parcelData?.transparency_description ||
                  parcelData?.sustainability_practices ||
                  parcelData?.consumer_story) && (
                  <ProfileSection
                    title="Consumer Transparency"
                    icon={FaEye}
                    mb={{ base: 4, md: 6 }}
                  >
                    <VStack spacing={4} align="stretch">
                      {/* Main Transparency Description */}
                      {parcelData?.transparency_description && (
                        <Box
                          p={4}
                          bg="green.50"
                          borderRadius="lg"
                          border="1px"
                          borderColor="green.200"
                        >
                          <VStack spacing={2} align="stretch">
                            <HStack>
                              <Icon as={FaLeaf} color="green.600" />
                              <Text fontWeight="bold" color="green.700" fontSize="sm">
                                WHAT MAKES THIS PARCEL SPECIAL
                              </Text>
                            </HStack>
                            <Text color="gray.700" lineHeight="tall">
                              {parcelData.transparency_description}
                            </Text>
                          </VStack>
                        </Box>
                      )}

                      {/* Sustainability Practices */}
                      {parcelData?.sustainability_practices && (
                        <Box
                          p={4}
                          bg="blue.50"
                          borderRadius="lg"
                          border="1px"
                          borderColor="blue.200"
                        >
                          <VStack spacing={2} align="stretch">
                            <HStack>
                              <Icon as={FaSeedling} color="blue.600" />
                              <Text fontWeight="bold" color="blue.700" fontSize="sm">
                                KEY SUSTAINABILITY PRACTICES
                              </Text>
                            </HStack>
                            <Text color="gray.700" lineHeight="tall">
                              {parcelData.sustainability_practices}
                            </Text>
                          </VStack>
                        </Box>
                      )}

                      {/* Consumer Story */}
                      {parcelData?.consumer_story && (
                        <Box
                          p={4}
                          bg="purple.50"
                          borderRadius="lg"
                          border="1px"
                          borderColor="purple.200"
                        >
                          <VStack spacing={2} align="stretch">
                            <HStack>
                              <Icon as={FaUsers} color="purple.600" />
                              <Text fontWeight="bold" color="purple.700" fontSize="sm">
                                WHY CONSUMERS SHOULD CARE
                              </Text>
                            </HStack>
                            <Text color="gray.700" lineHeight="tall">
                              {parcelData.consumer_story}
                            </Text>
                          </VStack>
                        </Box>
                      )}
                    </VStack>
                  </ProfileSection>
                )}

                {/* Technology & Features Card - CRITICAL for trust building */}
                <ProfileSection
                  title="Technology & Features"
                  icon={FaLeaf}
                  mb={{ base: 4, md: 6 }}
                  borderLeft="4px solid"
                  borderLeftColor="green.500"
                  bg="green.50"
                >
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {/* Carbon Calculation Status */}
                    {parcelData?.carbon_calculation_enabled !== undefined && (
                      <HStack
                        spacing={3}
                        p={3}
                        bg={parcelData?.carbon_calculation_enabled ? 'green.50' : 'gray.50'}
                        borderRadius="xl"
                        border="1px"
                        borderColor={parcelData?.carbon_calculation_enabled ? 'green.200' : 'gray.200'}
                      >
                        <Icon as={FaLeaf} color={parcelData?.carbon_calculation_enabled ? 'green.600' : 'gray.500'} />
                        <VStack spacing={0} align="start" flex={1}>
                          <Text fontSize="sm" fontWeight="medium" color="gray.700">
                            Carbon Calculation
                          </Text>
                          <Badge
                            colorScheme={parcelData?.carbon_calculation_enabled ? 'green' : 'gray'}
                            variant="subtle"
                            size="sm"
                          >
                            {parcelData?.carbon_calculation_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </VStack>
                      </HStack>
                    )}

                    {/* USDA Compliance Status */}
                    {parcelData?.usda_compliance_eligible !== undefined && (
                      <HStack
                        spacing={3}
                        p={3}
                        bg={parcelData?.usda_compliance_eligible ? 'blue.50' : 'gray.50'}
                        borderRadius="xl"
                        border="1px"
                        borderColor={parcelData?.usda_compliance_eligible ? 'blue.200' : 'gray.200'}
                      >
                        <Icon as={FaCertificate} color={parcelData?.usda_compliance_eligible ? 'blue.600' : 'gray.500'} />
                        <VStack spacing={0} align="start" flex={1}>
                          <Text fontSize="sm" fontWeight="medium" color="gray.700">
                            USDA Compliance
                          </Text>
                          <Badge
                            colorScheme={parcelData?.usda_compliance_eligible ? 'blue' : 'gray'}
                            variant="subtle"
                            size="sm"
                          >
                            {parcelData?.usda_compliance_eligible ? 'Eligible' : 'Not Eligible'}
                          </Badge>
                        </VStack>
                      </HStack>
                    )}
                  </SimpleGrid>
                </ProfileSection>

                {/* Agricultural Data Section */}
                {parcelData?.agricultural_details &&
                  Object.keys(parcelData.agricultural_details).length > 0 && (
                    <ProfileSection
                      title="Agricultural Practices"
                      icon={FaSeedling}
                      mb={{ base: 4, md: 6 }}
                    >
                      <VStack spacing={6} align="stretch">
                        {/* Soil Health Section */}
                        {(parcelData.agricultural_details.soil_ph ||
                          parcelData.agricultural_details.soil_organic_matter ||
                          parcelData.agricultural_details.soil_nitrogen ||
                          parcelData.agricultural_details.soil_phosphorus) && (
                          <Box>
                            <HStack spacing={2} mb={3}>
                              <Circle size="20px" bg="orange.100">
                                <Icon as={FaLeaf} color="orange.500" boxSize={3} />
                              </Circle>
                              <Text fontWeight="bold" color="orange.600" fontSize="sm">
                                SOIL HEALTH
                              </Text>
                            </HStack>
                            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                              {parcelData.agricultural_details.soil_ph && (
                                <VStack
                                  spacing={1}
                                  p={3}
                                  bg="orange.50"
                                  borderRadius="md"
                                  border="1px"
                                  borderColor="orange.200"
                                >
                                  <Text fontSize="lg" fontWeight="bold" color="gray.800">
                                    {parseFloat(parcelData.agricultural_details.soil_ph).toFixed(1)}
                                  </Text>
                                  <Text fontSize="xs" color="gray.600">
                                    pH Level
                                  </Text>
                                </VStack>
                              )}
                              {parcelData.agricultural_details.soil_organic_matter && (
                                <VStack
                                  spacing={1}
                                  p={3}
                                  bg="green.50"
                                  borderRadius="md"
                                  border="1px"
                                  borderColor="green.200"
                                >
                                  <Text fontSize="lg" fontWeight="bold" color="gray.800">
                                    {parseFloat(
                                      parcelData.agricultural_details.soil_organic_matter
                                    ).toFixed(1)}
                                    %
                                  </Text>
                                  <Text fontSize="xs" color="gray.600">
                                    Organic Matter
                                  </Text>
                                </VStack>
                              )}
                              {parcelData.agricultural_details.soil_nitrogen && (
                                <VStack
                                  spacing={1}
                                  p={3}
                                  bg="blue.50"
                                  borderRadius="md"
                                  border="1px"
                                  borderColor="blue.200"
                                >
                                  <Text fontSize="lg" fontWeight="bold" color="gray.800">
                                    {parseFloat(
                                      parcelData.agricultural_details.soil_nitrogen
                                    ).toFixed(0)}
                                  </Text>
                                  <Text fontSize="xs" color="gray.600">
                                    Nitrogen (ppm)
                                  </Text>
                                </VStack>
                              )}
                              {parcelData.agricultural_details.soil_phosphorus && (
                                <VStack
                                  spacing={1}
                                  p={3}
                                  bg="purple.50"
                                  borderRadius="md"
                                  border="1px"
                                  borderColor="purple.200"
                                >
                                  <Text fontSize="lg" fontWeight="bold" color="gray.800">
                                    {parseFloat(
                                      parcelData.agricultural_details.soil_phosphorus
                                    ).toFixed(0)}
                                  </Text>
                                  <Text fontSize="xs" color="gray.600">
                                    Phosphorus (ppm)
                                  </Text>
                                </VStack>
                              )}
                            </SimpleGrid>
                          </Box>
                        )}

                        {/* Water Management Section */}
                        {(parcelData.agricultural_details.irrigation_efficiency ||
                          parcelData.agricultural_details.water_source_type ||
                          parcelData.agricultural_details.water_quality_ph ||
                          parcelData.agricultural_details.water_allocation_acre_feet) && (
                          <Box>
                            <HStack spacing={2} mb={3}>
                              <Circle size="20px" bg="blue.100">
                                <Icon as={FaTint} color="blue.500" boxSize={3} />
                              </Circle>
                              <Text fontWeight="bold" color="blue.600" fontSize="sm">
                                WATER MANAGEMENT
                              </Text>
                            </HStack>
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                              {parcelData.agricultural_details.irrigation_efficiency && (
                                <HStack
                                  spacing={3}
                                  p={3}
                                  bg="blue.50"
                                  borderRadius="md"
                                  border="1px"
                                  borderColor="blue.200"
                                >
                                  <VStack spacing={0}>
                                    <Text fontSize="lg" fontWeight="bold" color="gray.800">
                                      {parseFloat(
                                        parcelData.agricultural_details.irrigation_efficiency
                                      ).toFixed(0)}
                                      %
                                    </Text>
                                    <Text fontSize="xs" color="gray.600">
                                      Irrigation Efficiency
                                    </Text>
                                  </VStack>
                                </HStack>
                              )}
                              {parcelData.agricultural_details.water_source_type && (
                                <HStack
                                  spacing={3}
                                  p={3}
                                  bg="blue.50"
                                  borderRadius="md"
                                  border="1px"
                                  borderColor="blue.200"
                                >
                                  <VStack spacing={0} align="start">
                                    <Text fontSize="sm" fontWeight="bold" color="gray.800">
                                      {parcelData.agricultural_details.water_source_type
                                        .replace(/([A-Z])/g, ' $1')
                                        .trim()}
                                    </Text>
                                    <Text fontSize="xs" color="gray.600">
                                      Water Source
                                    </Text>
                                  </VStack>
                                </HStack>
                              )}
                              {parcelData.agricultural_details.water_quality_ph && (
                                <HStack
                                  spacing={3}
                                  p={3}
                                  bg="blue.50"
                                  borderRadius="md"
                                  border="1px"
                                  borderColor="blue.200"
                                >
                                  <VStack spacing={0}>
                                    <Text fontSize="lg" fontWeight="bold" color="gray.800">
                                      {parseFloat(
                                        parcelData.agricultural_details.water_quality_ph
                                      ).toFixed(1)}
                                    </Text>
                                    <Text fontSize="xs" color="gray.600">
                                      Water pH
                                    </Text>
                                  </VStack>
                                </HStack>
                              )}
                              {parcelData.agricultural_details.water_allocation_acre_feet && (
                                <HStack
                                  spacing={3}
                                  p={3}
                                  bg="blue.50"
                                  borderRadius="md"
                                  border="1px"
                                  borderColor="blue.200"
                                >
                                  <VStack spacing={0}>
                                    <Text fontSize="lg" fontWeight="bold" color="gray.800">
                                      {parseFloat(
                                        parcelData.agricultural_details.water_allocation_acre_feet
                                      ).toFixed(1)}
                                    </Text>
                                    <Text fontSize="xs" color="gray.600">
                                      Acre-Feet Allocated
                                    </Text>
                                  </VStack>
                                </HStack>
                              )}
                            </SimpleGrid>
                          </Box>
                        )}

                        {/* Conservation Practices Section */}
                        {(parcelData.agricultural_details.cover_crop_management ||
                          parcelData.agricultural_details.crop_rotation_pattern ||
                          parcelData.agricultural_details.pest_management_strategy ||
                          parcelData.agricultural_details.fertilization_program) && (
                          <Box>
                            <HStack spacing={2} mb={3}>
                              <Circle size="20px" bg="green.100">
                                <Icon as={MdEco} color="green.500" boxSize={3} />
                              </Circle>
                              <Text fontWeight="bold" color="green.600" fontSize="sm">
                                CONSERVATION PRACTICES
                              </Text>
                            </HStack>
                            <VStack spacing={2} align="stretch">
                              {parcelData.agricultural_details.cover_crop_management && (
                                <HStack
                                  spacing={3}
                                  p={3}
                                  bg="green.50"
                                  borderRadius="md"
                                  border="1px"
                                  borderColor="green.200"
                                >
                                  <Icon as={FaSeedling} color="green.600" />
                                  <VStack spacing={0} align="start">
                                    <Text fontSize="sm" fontWeight="medium" color="gray.700">
                                      Cover Crops
                                    </Text>
                                    <Text fontSize="xs" color="gray.600">
                                      {parcelData.agricultural_details.cover_crop_management}
                                    </Text>
                                  </VStack>
                                </HStack>
                              )}
                              {parcelData.agricultural_details.crop_rotation_pattern && (
                                <HStack
                                  spacing={3}
                                  p={3}
                                  bg="green.50"
                                  borderRadius="md"
                                  border="1px"
                                  borderColor="green.200"
                                >
                                  <Icon as={FaLeaf} color="green.500" />
                                  <VStack spacing={0} align="start">
                                    <Text fontSize="sm" fontWeight="medium" color="gray.700">
                                      Crop Rotation
                                    </Text>
                                    <Text fontSize="xs" color="gray.600">
                                      {parcelData.agricultural_details.crop_rotation_pattern}
                                    </Text>
                                  </VStack>
                                </HStack>
                              )}
                              {parcelData.agricultural_details.pest_management_strategy && (
                                <HStack
                                  spacing={3}
                                  p={3}
                                  bg="yellow.50"
                                  borderRadius="md"
                                  border="1px"
                                  borderColor="yellow.200"
                                >
                                  <Icon as={FaUsers} color="yellow.600" />
                                  <VStack spacing={0} align="start">
                                    <Text fontSize="sm" fontWeight="medium" color="gray.700">
                                      Pest Management
                                    </Text>
                                    <Text fontSize="xs" color="gray.600">
                                      {parcelData.agricultural_details.pest_management_strategy}
                                    </Text>
                                  </VStack>
                                </HStack>
                              )}
                              {parcelData.agricultural_details.fertilization_program && (
                                <HStack
                                  spacing={3}
                                  p={3}
                                  bg="purple.50"
                                  borderRadius="md"
                                  border="1px"
                                  borderColor="purple.200"
                                >
                                  <Icon as={MdEco} color="purple.500" />
                                  <VStack spacing={0} align="start">
                                    <Text fontSize="sm" fontWeight="medium" color="gray.700">
                                      Fertilization Program
                                    </Text>
                                    <Text fontSize="xs" color="gray.600">
                                      {parcelData.agricultural_details.fertilization_program}
                                    </Text>
                                  </VStack>
                                </HStack>
                              )}
                            </VStack>
                          </Box>
                        )}
                      </VStack>
                    </ProfileSection>
                  )}

                {/* Contact Information */}
                {(parcelData?.contact_person ||
                  parcelData?.contact_email ||
                  parcelData?.contact_phone) && (
                  <ProfileSection
                    title="Contact Information"
                    icon={FaPhone}
                    mb={{ base: 4, md: 6 }}
                  >
                    <ProfileDataGrid
                      data={[
                        {
                          label: 'Contact Person',
                          value: parcelData?.contact_person,
                          type: 'text',
                          conditional: !!parcelData?.contact_person
                        },
                        {
                          label: 'Email',
                          value: parcelData?.contact_email,
                          type: 'link',
                          href: parcelData?.contact_email ? `mailto:${parcelData.contact_email}` : undefined,
                          conditional: !!parcelData?.contact_email
                        },
                        {
                          label: 'Phone',
                          value: parcelData?.contact_phone,
                          type: 'link',
                          href: parcelData?.contact_phone ? `tel:${parcelData.contact_phone}` : undefined,
                          conditional: !!parcelData?.contact_phone
                        }
                      ].filter((item) => item.conditional !== false && item.value !== undefined && item.value !== null)}
                      columns={{ base: 1, md: 1 }}
                    />
                  </ProfileSection>
                )}
              </Box>

              {/* Right Column */}
              <Box>
                {/* Enhanced Location Information */}
                <ProfileSection
                  title="Location Details"
                  icon={MdLocationOn}
                  mb={{ base: 4, md: 6 }}
                >
                  <ProfileDataGrid
                    data={[
                      {
                        label: 'Address',
                        value: parcelData?.address,
                        type: 'text',
                        conditional: !!parcelData?.address
                      },
                      {
                        label: 'City',
                        value: establishment?.city,
                        type: 'text',
                        conditional: !!establishment?.city
                      },
                      {
                        label: 'State',
                        value: establishment?.state,
                        type: 'text',
                        conditional: !!establishment?.state
                      },
                      {
                        label: 'Country',
                        value: establishment?.country,
                        type: 'text',
                        conditional: !!establishment?.country
                      },
                      {
                        label: 'Zone',
                        value: establishment?.zone,
                        type: 'text',
                        conditional: !!establishment?.zone
                      },
                      {
                        label: 'Coordinates',
                        value:
                          parcelData?.latitude && parcelData?.longitude
                            ? `${parseFloat(parcelData.latitude.toString()).toFixed(6)}, ${parseFloat(parcelData.longitude.toString()).toFixed(6)}`
                            : undefined,
                        type: 'text',
                        conditional: !!(parcelData?.latitude && parcelData?.longitude)
                      },
                      {
                        label: 'Elevation',
                        value: parcelData?.elevation ? `${parcelData.elevation} ft` : undefined,
                        type: 'text',
                        conditional: !!parcelData?.elevation
                      }
                    ].filter((item) => item.conditional !== false && item.value !== undefined && item.value !== null)}
                    columns={{ base: 1, md: 2 }}
                  />
                </ProfileSection>

                {/* Certification Information */}
                {(parcelData?.certified || parcelData?.certification_type) && (
                  <ProfileSection
                    title="Certification"
                    icon={FaCertificate}
                    mb={{ base: 4, md: 6 }}
                  >
                    <ProfileDataGrid
                      data={[
                        {
                          label: 'Status',
                          value: parcelData?.certified ? 'Certified' : 'Not Certified',
                          type: 'badge',
                          colorScheme: parcelData?.certified ? 'green' : 'gray',
                          conditional: parcelData?.certified !== undefined
                        },
                        {
                          label: 'Type',
                          value: parcelData?.certification_type,
                          type: 'text',
                          conditional: !!parcelData?.certification_type
                        }
                      ].filter((item) => item.conditional !== false && item.value !== undefined && item.value !== null)}
                      columns={{ base: 1, md: 1 }}
                    />
                  </ProfileSection>
                )}

                {/* Company Information */}
                <ProfileSection
                  title="Company & Establishment"
                  icon={FaBuilding}
                  mb={{ base: 4, md: 6 }}
                >
                  <ProfileDataGrid
                    data={[
                      {
                        label: 'Company',
                        value: currentCompany?.name,
                        type: 'text',
                        conditional: !!currentCompany?.name
                      },
                      {
                        label: 'Establishment',
                        value: establishment?.name,
                        type: 'text',
                        conditional: !!establishment?.name
                      }
                    ].filter((item) => item.conditional !== false && item.value !== undefined && item.value !== null)}
                    columns={{ base: 1, md: 1 }}
                  />
                </ProfileSection>
              </Box>
            </SimpleGrid>

            {/* About This Parcel Section */}
            {parcelData?.description && (
              <ProfileSection title="About This Parcel" icon={FaRegCommentDots} mb={{ base: 4, md: 6 }}>
                <Box>
                  <HTMLRenderer htmlString={parcelData.description} />
                </Box>
              </ProfileSection>
            )}
          </CardBody>
        </Card>
      </Box>
    </Flex>
  );
}

export default ProfileParcel;
