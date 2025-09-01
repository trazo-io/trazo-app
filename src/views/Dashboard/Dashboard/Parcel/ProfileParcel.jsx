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
  IconButton
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
  FaTint
} from 'react-icons/fa';
import { MdLocationOn, MdBusiness, MdEco, MdMoreVert } from 'react-icons/md';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import HTMLRenderer from 'components/Utils/HTMLRenderer';
import { StandardImageGallery } from 'components/ImageGallery';
import { StandardCard } from 'components/Design/StandardComponents';
import { useGetParcelQuery } from 'store/api/productApi';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import defaultParcelImage from 'assets/img/BgMusicCard.png';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
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
    <Flex direction="column" alignSelf="center" justifySelf="center" overflow="hidden" w="100%">
      {/* Clean Modern Header */}
      <Box bg="linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)" pt="80px" pb="100px" px={4}>
        <Container maxW="6xl" mx="auto">
          <VStack spacing={6} textAlign="center">
            {/* Parcel Badge */}
            <Badge
              colorScheme="green"
              variant="subtle"
              fontSize="sm"
              px={4}
              py={2}
              borderRadius="full"
              textTransform="none">
              <HStack spacing={2}>
                <Icon as={FaTractor} boxSize={4} />
                <Text fontWeight="medium">
                  {intl.formatMessage({ id: 'app.parcelProfile' }) || 'Parcel Profile'}
                </Text>
              </HStack>
            </Badge>

            {/* Main Title */}
            <VStack spacing={3}>
              <Heading
                as="h1"
                size="2xl"
                color={titleColor}
                fontWeight="bold"
                textAlign="center"
                letterSpacing="-0.02em">
                {parcelData?.name || 'Loading...'}
              </Heading>
              <Text
                fontSize="lg"
                color="gray.600"
                fontWeight="normal"
                maxW={{ base: '90%', sm: '70%', lg: '60%' }}
                lineHeight="1.7"
                textAlign="center">
                {establishment?.name || 'Sustainable Agriculture'}
              </Text>
            </VStack>

            {/* Quick Stats */}
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6} w="full" maxW="2xl">
              <VStack>
                <Circle size="50px" bg="green.100" color="green.600">
                  <Icon as={FaTractor} boxSize={6} />
                </Circle>
                <VStack spacing={1}>
                  <Text fontSize="xl" fontWeight="bold" color="gray.800">
                    {parcelData?.area || '--'}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Acres
                  </Text>
                </VStack>
              </VStack>

              <VStack>
                <Circle size="50px" bg="blue.100" color="blue.600">
                  <Icon as={FaSeedling} boxSize={6} />
                </Circle>
                <VStack spacing={1}>
                  <Text fontSize="xl" fontWeight="bold" color="gray.800">
                    {parcelData?.crop_type || '--'}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Crop Type
                  </Text>
                </VStack>
              </VStack>

              <VStack>
                <Circle size="50px" bg="purple.100" color="purple.600">
                  <Icon as={MdEco} boxSize={6} />
                </Circle>
                <VStack spacing={1}>
                  <Text fontSize="xl" fontWeight="bold" color="gray.800">
                    {parcelData?.soil_type || '--'}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Soil Type
                  </Text>
                </VStack>
              </VStack>

              <VStack>
                <Circle size="50px" bg="orange.100" color="orange.600">
                  <Icon as={FaCertificate} boxSize={6} />
                </Circle>
                <VStack spacing={1}>
                  <Text fontSize="xl" fontWeight="bold" color="gray.800">
                    {parcelData?.certified ? 'Yes' : 'No'}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Certified
                  </Text>
                </VStack>
              </VStack>
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Main Content Container - Overlapping Card */}
      <Flex
        alignItems="center"
        justifyContent="center"
        mb="80px"
        mt="-60px"
        position="relative"
        zIndex={10}>
        <Card
          w={{ base: '95%', md: '90%', lg: '85%' }}
          p={{ base: '20px', md: '32px', lg: '40px' }}
          boxShadow="0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          borderRadius="2xl"
          bg={bgColor}>
          {/* Header with Actions */}
          <CardHeader mb="24px">
            <HStack spacing={3} mb={4}>
              {/* Active Badge - Match Establishment Profile Standard */}
              <Badge 
                variant="subtle"
                colorScheme="green"
                fontSize="sm" 
                px={4} py={2} 
                borderRadius="lg"
                fontWeight="600"
                textTransform="none"
                bg="green.50"
                color="green.700"
                border="1px solid"
                borderColor="green.200">
                <HStack spacing={2}>
                  <Circle size="8px" bg="green.500" />
                  <Text>Active</Text>
                </HStack>
              </Badge>
              
              {parcelData?.certified && (
                <Badge 
                  variant="subtle"
                  colorScheme="green"
                  fontSize="sm" 
                  px={4} py={2} 
                  borderRadius="lg"
                  fontWeight="600"
                  textTransform="none"
                  bg="green.50"
                  color="green.700"
                  border="1px solid"
                  borderColor="green.200">
                  <HStack spacing={2}>
                    <Circle size="8px" bg="green.500" />
                    <Text>Certified</Text>
                  </HStack>
                </Badge>
              )}
              
              {parcelData?.carbon_calculation_enabled && (
                <Badge 
                  variant="subtle"
                  colorScheme="purple"
                  fontSize="sm" 
                  px={4} py={2} 
                  borderRadius="lg"
                  fontWeight="600"
                  textTransform="none"
                  bg="purple.50"
                  color="purple.700"
                  border="1px solid"
                  borderColor="purple.200">
                  <HStack spacing={2}>
                    <Circle size="8px" bg="purple.500" />
                    <Text>Carbon Tracking</Text>
                  </HStack>
                </Badge>
              )}
              
              {parcelData?.usda_compliance_eligible && (
                <Badge 
                  variant="subtle"
                  colorScheme="orange"
                  fontSize="sm" 
                  px={4} py={2} 
                  borderRadius="lg"
                  fontWeight="600"
                  textTransform="none"
                  bg="orange.50"
                  color="orange.700"
                  border="1px solid"
                  borderColor="orange.200">
                  <HStack spacing={2}>
                    <Circle size="8px" bg="orange.500" />
                    <Text>USDA Eligible</Text>
                  </HStack>
                </Badge>
              )}
            </HStack>
            <HStack mt={4} spacing={4} align="center" justify="space-between">
              {/* Fixed: Removed translation key app.parcelInformation */}
              <Heading color={textColor} fontSize={headerFontSize} fontWeight="bold">
                Parcel Information
              </Heading>
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<Icon as={MdMoreVert} />}
                  variant="ghost"
                  colorScheme="gray"
                  size="md"
                  h="40px"
                  w="40px"
                  color="gray.500"
                  _hover={{ 
                    bg: "gray.100",
                    color: "gray.700"
                  }}
                  aria-label="Open parcel menu"
                />
                <MenuList>
                  <MenuItem
                    onClick={() =>
                      navigate(
                        `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/change`
                      )
                    }
                    icon={<FaEdit />}>
                    <Text fontSize="sm" fontWeight="500">
                      {intl.formatMessage({ id: 'app.edit' }) || 'Edit'}
                    </Text>
                  </MenuItem>
                  <MenuItem icon={<FaShare />} onClick={handleShare}>
                    <Text fontSize="sm" fontWeight="500">
                      Share
                    </Text>
                  </MenuItem>
                  <MenuItem icon={<FaTrash />} color="red.500">
                    <Text fontSize="sm" fontWeight="500">
                      {intl.formatMessage({ id: 'app.delete' }) || 'Delete'}
                    </Text>
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </CardHeader>

          <CardBody>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 6, md: 8 }} mb={{ base: 6, md: 10 }}>
              {/* Left Column */}
              <Box>
                {/* Image Gallery */}
                <Box mb={{ base: 4, md: 6 }}>
                  <StandardImageGallery
                    images={parcelData?.images || []}
                    title="Parcel Photos"
                    variant="parcel"
                    enablePreview={true}
                    showImageCount={true}
                    fallbackImage={defaultParcelImage}
                    height="300px"
                    showEmptyState={true}
                    maxDisplayImages={3}
                  />
                </Box>

                {/* Basic Information */}
                <StandardCard title="Basic Information" variant="flat" icon={FaBuilding} mb={{ base: 4, md: 6 }}>
                  <VStack spacing={3} align="stretch">
                    <HStack>
                      <Icon as={FaTractor} color="green.600" />
                      <Text fontWeight="medium">Name:</Text>
                      <Text>{parcelData?.name}</Text>
                    </HStack>
                    <HStack>
                      <Icon as={FaMapMarkedAlt} color="blue.500" />
                      <Text fontWeight="medium">Area:</Text>
                      <Text>{parcelData?.area} acres</Text>
                    </HStack>
                    {parcelData?.unique_code && (
                      <HStack>
                        <Icon as={FaRegListAlt} color="purple.500" />
                        <Text fontWeight="medium">Code:</Text>
                        <Text>{parcelData.unique_code}</Text>
                      </HStack>
                    )}
                    {parcelData?.crop_type && (
                      <HStack>
                        <Icon as={FaSeedling} color="green.600" />
                        <Text fontWeight="medium">Crop Type:</Text>
                        <Text>{parcelData.crop_type}</Text>
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

                {/* Technology & Features Card - CRITICAL for trust building */}
                <StandardCard title="Technology & Features" variant="flat" icon={FaLeaf} mb={{ base: 4, md: 6 }}>
                  <VStack spacing={4} align="stretch">
                    {/* Carbon Calculation Status */}
                    <HStack justify="space-between">
                      <HStack>
                        <Icon as={FaLeaf} color="green.600" />
                        <Text fontWeight="medium">Carbon Calculation:</Text>
                      </HStack>
                      <Badge 
                        variant="subtle" 
                        colorScheme={parcelData?.carbon_calculation_enabled ? "green" : "gray"}
                        px={3} py={1} borderRadius="full"
                      >
                        <HStack spacing={2}>
                          <Circle size="8px" bg={parcelData?.carbon_calculation_enabled ? "green.500" : "gray.400"} />
                          <Text>{parcelData?.carbon_calculation_enabled ? 'Enabled' : 'Disabled'}</Text>
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
                        colorScheme={parcelData?.usda_compliance_eligible ? "blue" : "gray"}
                        px={3} py={1} borderRadius="full"
                      >
                        <HStack spacing={2}>
                          <Circle size="8px" bg={parcelData?.usda_compliance_eligible ? "blue.500" : "gray.400"} />
                          <Text>{parcelData?.usda_compliance_eligible ? 'Eligible' : 'Not Eligible'}</Text>
                        </HStack>
                      </Badge>
                    </HStack>
                  </VStack>
                </StandardCard>

                {/* Agricultural Data Section */}
                {parcelData?.agricultural_details && Object.keys(parcelData.agricultural_details).length > 0 && (
                  <StandardCard title="Agricultural Practices" variant="flat" icon={FaSeedling} mb={{ base: 4, md: 6 }}>
                    
                    <VStack spacing={6} align="stretch">
                      {/* Soil Health Section */}
                      {(parcelData.agricultural_details.soil_ph || parcelData.agricultural_details.soil_organic_matter || 
                        parcelData.agricultural_details.soil_nitrogen || parcelData.agricultural_details.soil_phosphorus) && (
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
                              <VStack spacing={1} p={3} bg="orange.50" borderRadius="md" border="1px" borderColor="orange.200">
                                <Text fontSize="lg" fontWeight="bold" color="gray.800">
                                  {parseFloat(parcelData.agricultural_details.soil_ph).toFixed(1)}
                                </Text>
                                <Text fontSize="xs" color="gray.600">pH Level</Text>
                              </VStack>
                            )}
                            {parcelData.agricultural_details.soil_organic_matter && (
                              <VStack spacing={1} p={3} bg="green.50" borderRadius="md" border="1px" borderColor="green.200">
                                <Text fontSize="lg" fontWeight="bold" color="gray.800">
                                  {parseFloat(parcelData.agricultural_details.soil_organic_matter).toFixed(1)}%
                                </Text>
                                <Text fontSize="xs" color="gray.600">Organic Matter</Text>
                              </VStack>
                            )}
                            {parcelData.agricultural_details.soil_nitrogen && (
                              <VStack spacing={1} p={3} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
                                <Text fontSize="lg" fontWeight="bold" color="gray.800">
                                  {parseFloat(parcelData.agricultural_details.soil_nitrogen).toFixed(0)}
                                </Text>
                                <Text fontSize="xs" color="gray.600">Nitrogen (ppm)</Text>
                              </VStack>
                            )}
                            {parcelData.agricultural_details.soil_phosphorus && (
                              <VStack spacing={1} p={3} bg="purple.50" borderRadius="md" border="1px" borderColor="purple.200">
                                <Text fontSize="lg" fontWeight="bold" color="gray.800">
                                  {parseFloat(parcelData.agricultural_details.soil_phosphorus).toFixed(0)}
                                </Text>
                                <Text fontSize="xs" color="gray.600">Phosphorus (ppm)</Text>
                              </VStack>
                            )}
                          </SimpleGrid>
                        </Box>
                      )}

                      {/* Water Management Section */}
                      {(parcelData.agricultural_details.irrigation_efficiency || parcelData.agricultural_details.water_source_type || 
                        parcelData.agricultural_details.water_quality_ph || parcelData.agricultural_details.water_allocation_acre_feet) && (
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
                              <HStack spacing={3} p={3} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
                                <VStack spacing={0}>
                                  <Text fontSize="lg" fontWeight="bold" color="gray.800">
                                    {parseFloat(parcelData.agricultural_details.irrigation_efficiency).toFixed(0)}%
                                  </Text>
                                  <Text fontSize="xs" color="gray.600">Irrigation Efficiency</Text>
                                </VStack>
                              </HStack>
                            )}
                            {parcelData.agricultural_details.water_source_type && (
                              <HStack spacing={3} p={3} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
                                <VStack spacing={0} align="start">
                                  <Text fontSize="sm" fontWeight="bold" color="gray.800">
                                    {parcelData.agricultural_details.water_source_type.replace(/([A-Z])/g, ' $1').trim()}
                                  </Text>
                                  <Text fontSize="xs" color="gray.600">Water Source</Text>
                                </VStack>
                              </HStack>
                            )}
                            {parcelData.agricultural_details.water_quality_ph && (
                              <HStack spacing={3} p={3} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
                                <VStack spacing={0}>
                                  <Text fontSize="lg" fontWeight="bold" color="gray.800">
                                    {parseFloat(parcelData.agricultural_details.water_quality_ph).toFixed(1)}
                                  </Text>
                                  <Text fontSize="xs" color="gray.600">Water pH</Text>
                                </VStack>
                              </HStack>
                            )}
                            {parcelData.agricultural_details.water_allocation_acre_feet && (
                              <HStack spacing={3} p={3} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
                                <VStack spacing={0}>
                                  <Text fontSize="lg" fontWeight="bold" color="gray.800">
                                    {parseFloat(parcelData.agricultural_details.water_allocation_acre_feet).toFixed(1)}
                                  </Text>
                                  <Text fontSize="xs" color="gray.600">Acre-Feet Allocated</Text>
                                </VStack>
                              </HStack>
                            )}
                          </SimpleGrid>
                        </Box>
                      )}

                      {/* Conservation Practices Section */}
                      {(parcelData.agricultural_details.cover_crop_management || parcelData.agricultural_details.crop_rotation_pattern || 
                        parcelData.agricultural_details.pest_management_strategy || parcelData.agricultural_details.fertilization_program) && (
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
                              <HStack spacing={3} p={3} bg="green.50" borderRadius="md" border="1px" borderColor="green.200">
                                <Icon as={FaSeedling} color="green.600" />
                                <VStack spacing={0} align="start">
                                  <Text fontSize="sm" fontWeight="medium" color="gray.700">Cover Crops</Text>
                                  <Text fontSize="xs" color="gray.600">{parcelData.agricultural_details.cover_crop_management}</Text>
                                </VStack>
                              </HStack>
                            )}
                            {parcelData.agricultural_details.crop_rotation_pattern && (
                              <HStack spacing={3} p={3} bg="green.50" borderRadius="md" border="1px" borderColor="green.200">
                                <Icon as={FaLeaf} color="green.500" />
                                <VStack spacing={0} align="start">
                                  <Text fontSize="sm" fontWeight="medium" color="gray.700">Crop Rotation</Text>
                                  <Text fontSize="xs" color="gray.600">{parcelData.agricultural_details.crop_rotation_pattern}</Text>
                                </VStack>
                              </HStack>
                            )}
                            {parcelData.agricultural_details.pest_management_strategy && (
                              <HStack spacing={3} p={3} bg="yellow.50" borderRadius="md" border="1px" borderColor="yellow.200">
                                <Icon as={FaUsers} color="yellow.600" />
                                <VStack spacing={0} align="start">
                                  <Text fontSize="sm" fontWeight="medium" color="gray.700">Pest Management</Text>
                                  <Text fontSize="xs" color="gray.600">{parcelData.agricultural_details.pest_management_strategy}</Text>
                                </VStack>
                              </HStack>
                            )}
                            {parcelData.agricultural_details.fertilization_program && (
                              <HStack spacing={3} p={3} bg="purple.50" borderRadius="md" border="1px" borderColor="purple.200">
                                <Icon as={MdEco} color="purple.500" />
                                <VStack spacing={0} align="start">
                                  <Text fontSize="sm" fontWeight="medium" color="gray.700">Fertilization Program</Text>
                                  <Text fontSize="xs" color="gray.600">{parcelData.agricultural_details.fertilization_program}</Text>
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
                  <StandardCard title="Contact Information" variant="flat" icon={FaPhone} mb={{ base: 4, md: 6 }}>
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
                <StandardCard title="Location Details" variant="flat" icon={MdLocationOn} mb={{ base: 4, md: 6 }}>
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
                    {(parcelData?.latitude && parcelData?.longitude) && (
                      <HStack>
                        <Icon as={FaGlobe} color="blue.600" />
                        <Text fontWeight="medium">Coordinates:</Text>
                        <Text>{parseFloat(parcelData.latitude).toFixed(6)}, {parseFloat(parcelData.longitude).toFixed(6)}</Text>
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
                  <StandardCard title="Certification" variant="flat" icon={FaCertificate} mb={{ base: 4, md: 6 }}>
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
                <StandardCard title="Company & Establishment" variant="flat" icon={FaBuilding} mb={{ base: 4, md: 6 }}>
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
