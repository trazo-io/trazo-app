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
import { StandardCard, StandardPage } from 'components/Design/StandardComponents';
import { useGetParcelQuery } from 'store/api/productApi';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { formatAreaWithBothUnits } from '../../../../utils/areaUnits';
import defaultParcelImage from 'assets/img/BgMusicCard.png';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import { ParcelTransparencyScoreBreakdown } from 'components/Transparency/ParcelTransparencyScoreBreakdown';
// Note: Main container still uses legacy Card, internal cards migrated to StandardCard

// Simplified loading - matching ProfileEstablishment pattern

function ProfileParcel() {
  const intl = useIntl();
  const titleColor = useColorModeValue('green.500', 'green.400');
  const textColor = useColorModeValue('gray.700', 'white');
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const navigate = useNavigate();
  const toast = useToast();
  const { establishmentId, parcelId } = useParams();
  const [establishment, setEstablishment] = useState(null);

  // Simplified loading - matching ProfileEstablishment pattern

  // Mobile-first responsive design
  const containerPadding = useBreakpointValue({ base: 4, md: 8 });
  const cardSpacing = useBreakpointValue({ base: 4, md: 6 });
  const headerFontSize = useBreakpointValue({ base: 'xl', md: '2xl' });

  const establishments = useSelector((state) => state.company.currentCompany?.establishments);
  const currentCompany = useSelector((state) => state.company.currentCompany);
  const currentParcel = useSelector((state) => state.product.currentParcel);

  const {
    data: parcelData,
    error,
    isLoading: isParcelLoading,
    isFetching,
    refetch
  } = useGetParcelQuery(
    { companyId: currentCompany?.id, establishmentId, parcelId },
    {
      skip:
        parcelId === undefined ||
        currentParcel?.id === parcelId ||
        currentCompany?.id === undefined ||
        !establishmentId
    }
  );

  useEffect(() => {
    let establishment;
    if (establishments) {
      establishment = establishments.filter(
        (establishment) => establishment.id.toString() === establishmentId
      )[0];
      setEstablishment(establishment);
    }
  }, [establishmentId, establishments]);

  // Removed progressive loading useEffect - using simple loading like ProfileEstablishment

  // Move useBreakpointValue to top level to avoid hooks rule violation
  const isMobile = useBreakpointValue({ base: true, md: false });

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `${parcelData?.name} - Parcel Profile`,
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
    } catch (error) {
      console.error('Error sharing:', error);
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

  if (error || !parcelData) {
    return (
      <Flex direction="column" alignSelf="center" justifySelf="center" overflow="hidden" w="100%">
        <Container maxW="6xl" mx="auto" py={20}>
          <Card bg={bgColor} p={6}>
            <Text color="red.500" textAlign="center">
              Error loading parcel data. Please try again.
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

      {/* Main Content Container - Standardized with Establishment */}
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
                    fallbackImage={defaultParcelImage}
                    height={{ base: '200px', sm: '250px', md: '280px', lg: '300px' }}
                    showEmptyState={true}
                    maxDisplayImages={3}
                  />
                </Box>

                {/* Basic Information */}
                <StandardCard
                  title="Basic Information"
                  variant="flat"
                  icon={FaBuilding}
                  mb={{ base: 4, md: 6 }}
                >
                  <VStack spacing={3} align="stretch">
                    <HStack>
                      <Icon as={FaTractor} color="green.600" />
                      <Text fontWeight="medium">Name:</Text>
                      <Text>{parcelData?.name}</Text>
                    </HStack>
                    <HStack>
                      <Icon as={FaMapMarkedAlt} color="blue.500" />
                      <Text fontWeight="medium">Area:</Text>
                      <Text>
                        {parcelData?.area
                          ? formatAreaWithBothUnits(parcelData.area, 'METRIC')
                          : '--'}
                      </Text>
                    </HStack>
                    {parcelData?.unique_code && (
                      <HStack>
                        <Icon as={FaRegListAlt} color="purple.500" />
                        <Text fontWeight="medium">Code:</Text>
                        <Text>{parcelData.unique_code}</Text>
                      </HStack>
                    )}
                    {(parcelData?.crop_type || parcelData?.primary_crop) && (
                      <HStack>
                        <Icon as={FaSeedling} color="green.600" />
                        <Text fontWeight="medium">Primary Crop:</Text>
                        <Text>{parcelData?.primary_crop || parcelData?.crop_type}</Text>
                      </HStack>
                    )}
                    {parcelData?.soil_type && (
                      <HStack>
                        <Icon as={MdEco} color="green.600" />
                        <Text fontWeight="medium">Soil Type:</Text>
                        <Text>{parcelData.soil_type}</Text>
                      </HStack>
                    )}
                  </VStack>
                </StandardCard>

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
                  <StandardCard
                    title="Consumer Transparency"
                    variant="flat"
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
                  </StandardCard>
                )}

                {/* Technology & Features Card - CRITICAL for trust building */}
                <StandardCard
                  title="Technology & Features"
                  variant="flat"
                  icon={FaLeaf}
                  mb={{ base: 4, md: 6 }}
                >
                  <VStack spacing={4} align="stretch">
                    {/* Carbon Calculation Status */}
                    <HStack justify="space-between">
                      <HStack>
                        <Icon as={FaLeaf} color="green.600" />
                        <Text fontWeight="medium">Carbon Calculation:</Text>
                      </HStack>
                      <Badge
                        variant="subtle"
                        colorScheme={parcelData?.carbon_calculation_enabled ? 'green' : 'gray'}
                        px={3}
                        py={1}
                        borderRadius="full"
                      >
                        <HStack spacing={2}>
                          <Circle
                            size="8px"
                            bg={parcelData?.carbon_calculation_enabled ? 'green.500' : 'gray.400'}
                          />
                          <Text>
                            {parcelData?.carbon_calculation_enabled ? 'Enabled' : 'Disabled'}
                          </Text>
                        </HStack>
                      </Badge>
                    </HStack>

                    {/* USDA Compliance Status */}
                    <HStack justify="space-between">
                      <HStack>
                        <Icon as={FaCertificate} color="blue.600" />
                        <Text fontWeight="medium">USDA Compliance:</Text>
                      </HStack>
                      <Badge
                        variant="subtle"
                        colorScheme={parcelData?.usda_compliance_eligible ? 'blue' : 'gray'}
                        px={3}
                        py={1}
                        borderRadius="full"
                      >
                        <HStack spacing={2}>
                          <Circle
                            size="8px"
                            bg={parcelData?.usda_compliance_eligible ? 'blue.500' : 'gray.400'}
                          />
                          <Text>
                            {parcelData?.usda_compliance_eligible ? 'Eligible' : 'Not Eligible'}
                          </Text>
                        </HStack>
                      </Badge>
                    </HStack>
                  </VStack>
                </StandardCard>

                {/* Agricultural Data Section */}
                {parcelData?.agricultural_details &&
                  Object.keys(parcelData.agricultural_details).length > 0 && (
                    <StandardCard
                      title="Agricultural Practices"
                      variant="flat"
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
                    </StandardCard>
                  )}

                {/* Contact Information */}
                {(parcelData?.contact_person ||
                  parcelData?.contact_email ||
                  parcelData?.contact_phone) && (
                  <StandardCard
                    title="Contact Information"
                    variant="flat"
                    icon={FaPhone}
                    mb={{ base: 4, md: 6 }}
                  >
                    <VStack spacing={3} align="stretch">
                      {parcelData?.contact_person && (
                        <HStack>
                          <Icon as={FaUsers} color="purple.500" />
                          <Text fontWeight="medium">Contact Person:</Text>
                          <Text>{parcelData.contact_person}</Text>
                        </HStack>
                      )}
                      {parcelData?.contact_email && (
                        <HStack>
                          <Icon as={FaEnvelope} color="blue.500" />
                          <Text fontWeight="medium">Email:</Text>
                          <Link color="blue.500" href={`mailto:${parcelData.contact_email}`}>
                            {parcelData.contact_email}
                          </Link>
                        </HStack>
                      )}
                      {parcelData?.contact_phone && (
                        <HStack>
                          <Icon as={FaPhone} color="green.500" />
                          <Text fontWeight="medium">Phone:</Text>
                          <Link color="green.500" href={`tel:${parcelData.contact_phone}`}>
                            {parcelData.contact_phone}
                          </Link>
                        </HStack>
                      )}
                    </VStack>
                  </StandardCard>
                )}
              </Box>

              {/* Right Column */}
              <Box>
                {/* Enhanced Location Information */}
                <StandardCard
                  title="Location Details"
                  variant="flat"
                  icon={MdLocationOn}
                  mb={{ base: 4, md: 6 }}
                >
                  <VStack spacing={3} align="stretch">
                    {/* Complete Address */}
                    {parcelData?.address && (
                      <HStack>
                        <Icon as={FaMapMarkerAlt} color="green.600" />
                        <Text fontWeight="medium">Address:</Text>
                        <Text>{parcelData.address}</Text>
                      </HStack>
                    )}
                    {establishment?.city && (
                      <HStack>
                        <Icon as={MdBusiness} color="green.600" />
                        <Text fontWeight="medium">City:</Text>
                        <Text>{establishment.city}</Text>
                      </HStack>
                    )}
                    {establishment?.state && (
                      <HStack>
                        <Icon as={MdBusiness} color="green.600" />
                        <Text fontWeight="medium">State:</Text>
                        <Text>{establishment.state}</Text>
                      </HStack>
                    )}
                    {establishment?.country && (
                      <HStack>
                        <Icon as={FaGlobe} color="green.600" />
                        <Text fontWeight="medium">Country:</Text>
                        <Text>{establishment.country}</Text>
                      </HStack>
                    )}
                    {establishment?.zone && (
                      <HStack>
                        <Icon as={MdLocationOn} color="green.600" />
                        <Text fontWeight="medium">Zone:</Text>
                        <Text>{establishment.zone}</Text>
                      </HStack>
                    )}

                    {/* Add Coordinates if available */}
                    {parcelData?.latitude && parcelData?.longitude && (
                      <HStack>
                        <Icon as={FaGlobe} color="blue.600" />
                        <Text fontWeight="medium">Coordinates:</Text>
                        <Text>
                          {parseFloat(parcelData.latitude).toFixed(6)},{' '}
                          {parseFloat(parcelData.longitude).toFixed(6)}
                        </Text>
                      </HStack>
                    )}

                    {/* Add Elevation if available */}
                    {parcelData?.elevation && (
                      <HStack>
                        <Icon as={FaMapMarkerAlt} color="gray.600" />
                        <Text fontWeight="medium">Elevation:</Text>
                        <Text>{parcelData.elevation} ft</Text>
                      </HStack>
                    )}
                  </VStack>
                </StandardCard>

                {/* Certification Information */}
                {(parcelData?.certified || parcelData?.certification_type) && (
                  <StandardCard
                    title="Certification"
                    variant="flat"
                    icon={FaCertificate}
                    mb={{ base: 4, md: 6 }}
                  >
                    <VStack spacing={3} align="stretch">
                      <HStack>
                        <Icon
                          as={FaCertificate}
                          color={parcelData?.certified ? 'green.600' : 'gray.500'}
                        />
                        <Text fontWeight="medium">Status:</Text>
                        <Badge colorScheme={parcelData?.certified ? 'green' : 'gray'}>
                          {parcelData?.certified ? 'Certified' : 'Not Certified'}
                        </Badge>
                      </HStack>
                      {parcelData?.certification_type && (
                        <HStack>
                          <Icon as={FaCertificate} color="green.600" />
                          <Text fontWeight="medium">Type:</Text>
                          <Text>{parcelData.certification_type}</Text>
                        </HStack>
                      )}
                    </VStack>
                  </StandardCard>
                )}

                {/* Company Information */}
                <StandardCard
                  title="Company & Establishment"
                  variant="flat"
                  icon={FaBuilding}
                  mb={{ base: 4, md: 6 }}
                >
                  <VStack spacing={3} align="stretch">
                    <HStack>
                      <Icon as={FaBuilding} color="green.600" />
                      <Text fontWeight="medium">Company:</Text>
                      <Text>{currentCompany?.name}</Text>
                    </HStack>
                    <HStack>
                      <Icon as={FaTractor} color="green.600" />
                      <Text fontWeight="medium">Establishment:</Text>
                      <Text>{establishment?.name}</Text>
                    </HStack>
                  </VStack>
                </StandardCard>
              </Box>
            </SimpleGrid>

            {/* About This Parcel Section */}
            {parcelData?.description && (
              <VStack spacing={{ base: 4, md: 6 }} align="stretch">
                <StandardCard title="About This Parcel" variant="flat" icon={FaRegCommentDots}>
                  <Box>
                    <HTMLRenderer htmlString={parcelData.description} />
                  </Box>
                </StandardCard>
              </VStack>
            )}
          </CardBody>
        </Card>
      </Flex>
    </Flex>
  );
}

export default ProfileParcel;
