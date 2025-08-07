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
  FaEye,
  FaShare,
  FaTint
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
// @ts-ignore: JSX component in TS file
import CarbonSummaryCard from '../components/establishment/CarbonSummaryCard';

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
  const titleColor = useColorModeValue('green.500', 'green.400');
  const textColor = useColorModeValue('gray.700', 'white');
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

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

  // 2025 Mobile-first responsive design
  const containerPadding = useBreakpointValue({ base: 3, sm: 4, md: 6, lg: 8 });
  const cardSpacing = useBreakpointValue({ base: 3, sm: 4, md: 5, lg: 6 });
  const headerFontSize = useBreakpointValue({ base: 'lg', sm: 'xl', md: '2xl', lg: '3xl' });
  const cardPadding = useBreakpointValue({ base: 3, sm: 4, md: 5, lg: 6 });
  const iconSize = useBreakpointValue({ base: 4, sm: 5, md: 5, lg: 6 });
  const headingSize = useBreakpointValue({ base: 'sm', sm: 'md', md: 'md', lg: 'lg' });

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

  // Handle opening public profile
  const handleViewPublicProfile = () => {
    try {
      // Construct the consumer domain URL
      const baseUrl = window.location.hostname.includes('localhost')
        ? 'http://localhost:3000'
        : `https://consumer.${import.meta.env.VITE_APP_BASE_DOMAIN}`;

      const publicProfileUrl = `${baseUrl}/establishment/${establishmentId}`;

      // Debug logging
      console.log('Opening public profile URL:', publicProfileUrl);
      console.log('Current hostname:', window.location.hostname);
      console.log('Base URL:', baseUrl);
      console.log('Establishment ID:', establishmentId);

      // Try to open in new tab
      const newWindow = window.open(publicProfileUrl, '_blank', 'noopener,noreferrer');

      // Check if window.open was blocked
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Pop-up was blocked
        console.error('Pop-up was blocked by browser');
        toast({
          title: 'Pop-up Blocked',
          description:
            'Please allow pop-ups for this site and try again, or copy the link manually.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
          position: 'top-right'
        });

        // Fallback: copy to clipboard
        if (navigator.clipboard) {
          navigator.clipboard.writeText(publicProfileUrl).then(() => {
            toast({
              title: 'Link Copied',
              description:
                'The public profile link has been copied to your clipboard since pop-ups are blocked.',
              status: 'info',
              duration: 5000,
              isClosable: true,
              position: 'top-right'
            });
          });
        }
        return;
      }

      // Show success feedback only if window opened successfully
      toast({
        title: 'Public Profile Opened',
        description: 'The public profile has been opened in a new tab.',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right'
      });
    } catch (error) {
      console.error('Error opening public profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to open public profile. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right'
      });
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
    <Flex direction="column" alignSelf="center" justifySelf="center" overflow="hidden" w="100%">
      {/* Clean Modern Header */}
      <Box bg="linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)" pt="80px" pb="100px" px={4}>
        <Container maxW="6xl" mx="auto">
          <VStack spacing={6} textAlign="center">
            {/* Establishment Badge */}
            <Badge
              colorScheme="green"
              variant="subtle"
              fontSize="sm"
              px={4}
              py={2}
              borderRadius="full"
              textTransform="none">
              <HStack spacing={2}>
                <Icon as={FaBuilding} boxSize={4} />
                <Text fontWeight="medium">
                  {intl.formatMessage({ id: 'app.establishment' }) || 'Establishment Profile'}
                </Text>
              </HStack>
            </Badge>

            {/* Main Title */}
            <VStack spacing={3}>
              <Heading
                as="h1"
                size={headerFontSize}
                color={titleColor}
                fontWeight="bold"
                textAlign="center"
                letterSpacing="-0.02em">
                {establishmentData?.name || 'Loading...'}
              </Heading>
              <Text
                fontSize="lg"
                color="gray.600"
                fontWeight="normal"
                maxW={{ base: '90%', sm: '70%', lg: '60%' }}
                lineHeight="1.7"
                textAlign="center">
                {establishmentData?.description || currentCompany?.name}
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
                    {establishmentData?.total_acreage || 0}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Acres
                  </Text>
                </VStack>
              </VStack>

              <VStack>
                <Circle size="50px" bg="blue.100" color="blue.600">
                  <Icon as={FaUsers} boxSize={6} />
                </Circle>
                <VStack spacing={1}>
                  <Text fontSize="xl" fontWeight="bold" color="gray.800">
                    {establishmentData?.employee_count || 0}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Employees
                  </Text>
                </VStack>
              </VStack>

              <VStack>
                <Circle size="50px" bg="purple.100" color="purple.600">
                  <Icon as={FaCalendar} boxSize={6} />
                </Circle>
                <VStack spacing={1}>
                  <Text fontSize="xl" fontWeight="bold" color="gray.800">
                    {establishmentData?.year_established || '--'}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Founded
                  </Text>
                </VStack>
              </VStack>

              <VStack>
                <Circle size="50px" bg="orange.100" color="orange.600">
                  <Icon as={FaSeedling} boxSize={6} />
                </Circle>
                <VStack spacing={1}>
                  <Text fontSize="xl" fontWeight="bold" color="gray.800">
                    {getCropsGrown().length}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Crops
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
          w={{ base: '100%', sm: '98%', md: '95%', lg: '90%', xl: '85%' }}
          p={{ base: 4, sm: 5, md: 6, lg: 8 }}
          boxShadow={{
            base: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            md: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          borderRadius={{ base: 'xl', md: '2xl' }}
          bg={bgColor}
          mx={{ base: 2, sm: 'auto' }}>
          {/* Header with Actions */}
          <CardHeader mb="24px">
            <HStack spacing={3} mb={4}>
              <Badge colorScheme="green" fontSize="md" px={3} py={1} borderRadius="full">
                {establishmentData?.is_active !== false ? 'Active' : 'Inactive'}
              </Badge>
              {establishmentData?.establishment_type && (
                <Badge colorScheme="blue" fontSize="md" px={3} py={1} borderRadius="full">
                  {establishmentData.establishment_type}
                </Badge>
              )}
            </HStack>
            <HStack mt={4} spacing={4} align="center" justify="space-between">
              <Heading color={textColor} fontSize={headerFontSize} fontWeight="bold">
                {intl.formatMessage({ id: 'app.establishmentInformation' }) || 'Establishment Information'}
              </Heading>
              <Menu placement="left-start">
                <MenuButton
                  as={IconButton}
                  icon={<Icon as={IoEllipsisVerticalSharp} />}
                  variant="ghost"
                  colorScheme="gray"
                  size="lg"
                  aria-label="Open establishment menu"
                />
                <MenuList>
                  <MenuItem
                    onClick={() =>
                      navigate(`/admin/dashboard/establishment/${establishmentId}/change`)
                    }
                    icon={<FaEdit />}>
                    <Text fontSize="sm" fontWeight="500">
                      {intl.formatMessage({ id: 'app.edit' }) || 'Edit'}
                    </Text>
                  </MenuItem>
                  <MenuItem onClick={handleViewPublicProfile} icon={<FaEye />}>
                    <Text fontSize="sm" fontWeight="500">
                      View Public Profile
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
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 3, sm: 4, md: 6, lg: 8 }} mb={{ base: 4, sm: 5, md: 6, lg: 8 }}>
              {/* Left Column */}
              <Box>
                {/* Image Gallery */}
                <Box mb={{ base: 3, sm: 4, md: 5, lg: 6 }}>
                  <StandardImageGallery
                    images={establishmentData?.images || []}
                    title="Establishment Photos"
                    variant="default"
                    enablePreview={true}
                    showImageCount={true}
                    fallbackImage={establishmentImage}
                    height={{ base: '200px', sm: '250px', md: '280px', lg: '300px' }}
                    emptyStateText="No establishment photos"
                    emptyStateSubtext="Add photos to showcase your agricultural facility"
                    showEmptyState={true}
                    maxDisplayImages={3}
                  />
                </Box>

                {/* Contact Information */}
                <Card bg={bgColor} borderRadius={{ base: 'lg', md: 'xl' }} boxShadow="sm" p={cardPadding} mb={{ base: 3, sm: 4, md: 5, lg: 6 }}>
                  <HStack spacing={{ base: 1, sm: 2 }} justify="center" mb={{ base: 3, md: 4 }}>
                    <Icon as={FaPhone} color="green.500" boxSize={iconSize} />
                    <Heading as="h3" size={headingSize} color={textColor}>
                      Contact Information
                    </Heading>
                  </HStack>
                  <VStack spacing={{ base: 2, sm: 3 }} align="stretch">
                    {establishmentData?.email && (
                      <HStack spacing={{ base: 2, sm: 3 }} minH="44px" align="center">
                        <Icon as={FaEnvelope} color="blue.500" boxSize={{ base: 4, sm: 5 }} flexShrink={0} />
                        <VStack spacing={0} align="start" flex={1}>
                          <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.500" fontWeight="medium">Email</Text>
                          <Link color="blue.500" href={`mailto:${establishmentData.email}`} fontSize={{ base: 'sm', sm: 'md' }} fontWeight="medium">
                            {establishmentData.email}
                          </Link>
                        </VStack>
                      </HStack>
                    )}
                    {establishmentData?.phone && (
                      <HStack spacing={{ base: 2, sm: 3 }} minH="44px" align="center">
                        <Icon as={FaPhone} color="green.500" boxSize={{ base: 4, sm: 5 }} flexShrink={0} />
                        <VStack spacing={0} align="start" flex={1}>
                          <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.500" fontWeight="medium">Phone</Text>
                          <Link color="green.500" href={`tel:${establishmentData.phone}`} fontSize={{ base: 'sm', sm: 'md' }} fontWeight="medium">
                            {establishmentData.phone}
                          </Link>
                        </VStack>
                      </HStack>
                    )}
                    {establishmentData?.contact_person && (
                      <HStack spacing={{ base: 2, sm: 3 }} minH="44px" align="center">
                        <Icon as={FaUsers} color="purple.500" boxSize={{ base: 4, sm: 5 }} flexShrink={0} />
                        <VStack spacing={0} align="start" flex={1}>
                          <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.500" fontWeight="medium">Contact Person</Text>
                          <Text fontSize={{ base: 'sm', sm: 'md' }} fontWeight="medium">{establishmentData.contact_person}</Text>
                        </VStack>
                      </HStack>
                    )}
                    {establishmentData?.contact_email &&
                      establishmentData.contact_email !== establishmentData.email && (
                        <HStack>
                          <Icon as={FaEnvelope} color="blue.500" />
                          <Text fontWeight="medium">Alt Email:</Text>
                          <Link color="blue.500" href={`mailto:${establishmentData.contact_email}`}>
                            {establishmentData.contact_email}
                          </Link>
                        </HStack>
                      )}
                    {establishmentData?.contact_phone &&
                      establishmentData.contact_phone !== establishmentData.phone && (
                        <HStack>
                          <Icon as={FaPhone} color="green.500" />
                          <Text fontWeight="medium">Alt Phone:</Text>
                          <Link color="green.500" href={`tel:${establishmentData.contact_phone}`}>
                            {establishmentData.contact_phone}
                          </Link>
                        </HStack>
                      )}
                  </VStack>
                </Card>

                {/* Social Media */}
                {(establishmentData?.facebook || establishmentData?.instagram) && (
                  <Card bg={bgColor} borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }} mb={{ base: 4, md: 6 }}>
                    <HStack spacing={2} justify="center" mb={4}>
                      <Icon as={FaGlobe} color="green.500" boxSize={5} />
                      <Heading as="h3" size="md" color={textColor}>
                        Social Media
                      </Heading>
                    </HStack>
                    <HStack spacing={4} justify="center">
                      {establishmentData?.facebook && (
                        <Link
                          href={establishmentData.facebook}
                          isExternal
                          _hover={{ transform: 'scale(1.1)' }}
                          transition="all 0.2s">
                          <Circle size="50px" bg="blue.100" color="blue.600">
                            <Icon as={FaFacebook} boxSize={6} />
                          </Circle>
                        </Link>
                      )}
                      {establishmentData?.instagram && (
                        <Link
                          href={establishmentData.instagram}
                          isExternal
                          _hover={{ transform: 'scale(1.1)' }}
                          transition="all 0.2s">
                          <Circle size="50px" bg="pink.100" color="pink.600">
                            <Icon as={FaInstagram} boxSize={6} />
                          </Circle>
                        </Link>
                      )}
                    </HStack>
                  </Card>
                )}
              </Box>

              {/* Right Column */}
              <Box>
                {/* Location Information */}
                <Card bg={bgColor} borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }} mb={{ base: 4, md: 6 }}>
                  <HStack spacing={2} justify="center" mb={4}>
                    <Icon as={MdLocationOn} color="green.500" boxSize={5} />
                    <Heading as="h3" size="md" color={textColor}>
                      Location Details
                    </Heading>
                  </HStack>
                  <VStack spacing={3} align="stretch">
                    {establishmentData?.address && (
                      <HStack>
                        <Icon as={FaMapMarkerAlt} color="red.500" />
                        <Text fontWeight="medium">Address:</Text>
                        <Text>{establishmentData.address}</Text>
                      </HStack>
                    )}
                    {establishmentData?.city && (
                      <HStack>
                        <Icon as={MdBusiness} color="blue.500" />
                        <Text fontWeight="medium">City:</Text>
                        <Text>{establishmentData.city}</Text>
                      </HStack>
                    )}
                    {establishmentData?.state && (
                      <HStack>
                        <Icon as={MdBusiness} color="blue.500" />
                        <Text fontWeight="medium">State:</Text>
                        <Text>{establishmentData.state}</Text>
                      </HStack>
                    )}
                    {establishmentData?.country && (
                      <HStack>
                        <Icon as={FaGlobe} color="green.500" />
                        <Text fontWeight="medium">Country:</Text>
                        <Text>{establishmentData.country}</Text>
                      </HStack>
                    )}
                    {establishmentData?.zip_code && (
                      <HStack>
                        <Icon as={FaMapMarkerAlt} color="red.500" />
                        <Text fontWeight="medium">ZIP Code:</Text>
                        <Text>{establishmentData.zip_code}</Text>
                      </HStack>
                    )}
                    {establishmentData?.zone && (
                      <HStack>
                        <Icon as={MdLocationOn} color="orange.500" />
                        <Text fontWeight="medium">Zone:</Text>
                        <Text>{establishmentData.zone}</Text>
                      </HStack>
                    )}
                    {typeof establishmentData?.latitude === 'number' &&
                      typeof establishmentData?.longitude === 'number' &&
                      !isNaN(establishmentData.latitude) &&
                      !isNaN(establishmentData.longitude) && (
                        <HStack>
                          <Icon as={FaMapMarkerAlt} color="red.500" />
                          <Text fontWeight="medium">Coordinates:</Text>
                          <Text>{`${establishmentData.latitude.toFixed(
                            6
                          )}, ${establishmentData.longitude.toFixed(6)}`}</Text>
                        </HStack>
                      )}
                  </VStack>
                </Card>

                {/* Operations Information */}
                <Card bg={bgColor} borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }} mb={{ base: 4, md: 6 }}>
                  <HStack spacing={2} justify="center" mb={4}>
                    <Icon as={FaTractor} color="green.500" boxSize={5} />
                    <Heading as="h3" size="md" color={textColor}>
                      Operations
                    </Heading>
                  </HStack>
                  <VStack spacing={4} align="stretch">
                    {establishmentData?.farming_method && (
                      <HStack>
                        <Icon as={MdEco} color="green.500" />
                        <Text fontWeight="medium">Farming Method:</Text>
                        <Badge colorScheme="green" variant="subtle">
                          {establishmentData.farming_method}
                        </Badge>
                      </HStack>
                    )}
                    {establishmentData?.total_acreage && (
                      <HStack>
                        <Icon as={FaTractor} color="brown.500" />
                        <Text fontWeight="medium">Total Acreage:</Text>
                        <Text>{establishmentData.total_acreage} acres</Text>
                      </HStack>
                    )}
                    {establishmentData?.employee_count && (
                      <HStack>
                        <Icon as={FaUsers} color="purple.500" />
                        <Text fontWeight="medium">Employees:</Text>
                        <Text>{establishmentData.employee_count}</Text>
                      </HStack>
                    )}
                    {establishmentData?.year_established && (
                      <HStack>
                        <Icon as={FaCalendar} color="blue.500" />
                        <Text fontWeight="medium">Established:</Text>
                        <Text>{establishmentData.year_established}</Text>
                      </HStack>
                    )}
                  </VStack>
                </Card>

                {/* Operational Agricultural Information */}
                {(establishmentData?.water_sources?.length > 0 ||
                  establishmentData?.climate_zone ||
                  establishmentData?.soil_types?.length > 0 ||
                  establishmentData?.conservation_practices?.length > 0 ||
                  establishmentData?.irrigation_methods?.length > 0) && (
                  <Card bg={bgColor} borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }} mb={{ base: 4, md: 6 }}>
                    <HStack spacing={2} justify="center" mb={4}>
                      <Icon as={FaLeaf} color="green.500" boxSize={5} />
                      <Heading as="h3" size="md" color={textColor}>
                        Agricultural Operations
                      </Heading>
                    </HStack>
                    <VStack spacing={4} align="stretch">
                      {establishmentData?.climate_zone && (
                        <HStack>
                          <Icon as={MdEco} color="blue.500" />
                          <Text fontWeight="medium">Climate Zone:</Text>
                          <Badge colorScheme="blue" variant="subtle">
                            {establishmentData.climate_zone}
                          </Badge>
                        </HStack>
                      )}
                      {establishmentData?.water_sources?.length > 0 && (
                        <VStack align="stretch" spacing={2}>
                          <HStack>
                            <Icon as={FaTint} color="blue.500" />
                            <Text fontWeight="medium">Water Sources:</Text>
                          </HStack>
                          <Flex gap={2} flexWrap="wrap" ml={6}>
                            {establishmentData.water_sources.map((source: string, index: number) => (
                              <Badge key={index} colorScheme="blue" variant="outline" size="sm">
                                {source}
                              </Badge>
                            ))}
                          </Flex>
                        </VStack>
                      )}
                      {establishmentData?.soil_types?.length > 0 && (
                        <VStack align="stretch" spacing={2}>
                          <HStack>
                            <Icon as={MdEco} color="orange.500" />
                            <Text fontWeight="medium">Soil Types:</Text>
                          </HStack>
                          <Flex gap={2} flexWrap="wrap" ml={6}>
                            {establishmentData.soil_types.map((soil: string, index: number) => (
                              <Badge key={index} colorScheme="orange" variant="outline" size="sm">
                                {soil}
                              </Badge>
                            ))}
                          </Flex>
                        </VStack>
                      )}
                      {establishmentData?.conservation_practices?.length > 0 && (
                        <VStack align="stretch" spacing={2}>
                          <HStack>
                            <Icon as={MdEco} color="green.500" />
                            <Text fontWeight="medium">Conservation Practices:</Text>
                          </HStack>
                          <Flex gap={2} flexWrap="wrap" ml={6}>
                            {establishmentData.conservation_practices.map((practice: string, index: number) => (
                              <Badge key={index} colorScheme="green" variant="outline" size="sm">
                                {practice}
                              </Badge>
                            ))}
                          </Flex>
                        </VStack>
                      )}
                      {establishmentData?.irrigation_methods?.length > 0 && (
                        <VStack align="stretch" spacing={2}>
                          <HStack>
                            <Icon as={FaTint} color="cyan.500" />
                            <Text fontWeight="medium">Irrigation Methods:</Text>
                          </HStack>
                          <Flex gap={2} flexWrap="wrap" ml={6}>
                            {establishmentData.irrigation_methods.map((method: string, index: number) => (
                              <Badge key={index} colorScheme="cyan" variant="outline" size="sm">
                                {method}
                              </Badge>
                            ))}
                          </Flex>
                        </VStack>
                      )}
                    </VStack>
                  </Card>
                )}

                {/* Company Information */}
                <Card bg={bgColor} borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }} mb={{ base: 4, md: 6 }}>
                  <HStack spacing={2} justify="center" mb={4}>
                    <Icon as={FaBuilding} color="green.500" boxSize={5} />
                    <Heading as="h3" size="md" color={textColor}>
                      Company Details
                    </Heading>
                  </HStack>
                  <VStack spacing={3} align="stretch">
                    <HStack>
                      <Icon as={FaBuilding} color="blue.500" />
                      <Text fontWeight="medium">Company:</Text>
                      <Text>{establishmentData?.company?.name || 'Not specified'}</Text>
                    </HStack>
                    {establishmentData?.company?.industry && (
                      <HStack>
                        <Icon as={FaLeaf} color="green.500" />
                        <Text fontWeight="medium">Industry:</Text>
                        <Text>{establishmentData.company.industry}</Text>
                      </HStack>
                    )}
                    {establishmentData?.company?.legal_structure && (
                      <HStack>
                        <Icon as={FaCertificate} color="purple.500" />
                        <Text fontWeight="medium">Legal Structure:</Text>
                        <Text>{establishmentData.company.legal_structure}</Text>
                      </HStack>
                    )}
                  </VStack>
                </Card>
              </Box>
            </SimpleGrid>

            {/* Crops, Certifications, and Sustainability Section */}
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 4, md: 6 }} mb={{ base: 6, md: 8 }}>
              {/* Crops Grown */}
              {getCropsGrown().length > 0 && (
                <Card bg={bgColor} borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }}>
                  <HStack spacing={2} justify="center" mb={4}>
                    <Icon as={FaSeedling} color="green.500" boxSize={5} />
                    <Heading as="h3" size="md" color={textColor}>
                      Crops Grown
                    </Heading>
                  </HStack>
                  <Flex gap={2} flexWrap="wrap" justify="center" align="flex-start">
                    {getCropsGrown().map((crop: string, index: number) => (
                      <Tag key={index} size="md" variant="solid" colorScheme="green">
                        <TagLabel>{crop}</TagLabel>
                      </Tag>
                    ))}
                  </Flex>
                </Card>
              )}

              {/* Certifications */}
              {getCertifications().length > 0 && (
                <Card bg={bgColor} borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }}>
                  <HStack spacing={2} justify="center" mb={4}>
                    <Icon as={FaCertificate} color="blue.500" boxSize={5} />
                    <Heading as="h3" size="md" color={textColor}>
                      Certifications
                    </Heading>
                  </HStack>
                  <Flex gap={2} flexWrap="wrap" justify="center" align="flex-start">
                    {getCertifications().map((cert: string, index: number) => (
                      <Tag key={index} size="md" variant="solid" colorScheme="blue">
                        <TagLabel>{cert}</TagLabel>
                      </Tag>
                    ))}
                  </Flex>
                </Card>
              )}

              {/* Sustainability Practices */}
              {getSustainabilityPractices().length > 0 && (
                <Card bg={bgColor} borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }}>
                  <HStack spacing={2} justify="center" mb={4}>
                    <Icon as={MdEco} color="green.500" boxSize={5} />
                    <Heading as="h3" size="md" color={textColor}>
                      Sustainability Practices
                    </Heading>
                  </HStack>
                  <Flex gap={2} flexWrap="wrap" justify="center" align="flex-start">
                    {getSustainabilityPractices().map((practice: string, index: number) => (
                      <Tag key={index} size="md" variant="solid" colorScheme="orange">
                        <TagLabel>{practice}</TagLabel>
                      </Tag>
                    ))}
                  </Flex>
                </Card>
              )}
            </SimpleGrid>

            {/* About and Information Sections */}
            <VStack spacing={{ base: 4, md: 6 }} align="stretch">
              {/* About Section */}
              {establishmentData?.about && (
                <Card bg={bgColor} borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }}>
                  <HStack spacing={2} justify="center" mb={4}>
                    <Icon as={FaRegCommentDots} color="green.500" boxSize={5} />
                    <Heading as="h3" size="md" color={textColor}>
                      About This Establishment
                    </Heading>
                  </HStack>
                  <Text lineHeight="tall" textAlign="center">
                    {establishmentData.about}
                  </Text>
                </Card>
              )}

              {/* Main Activities */}
              {establishmentData?.main_activities && (
                <Card bg={bgColor} borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }}>
                  <HStack spacing={2} justify="center" mb={4}>
                    <Icon as={FaRegListAlt} color="blue.500" boxSize={5} />
                    <Heading as="h3" size="md" color={textColor}>
                      Main Activities & Services
                    </Heading>
                  </HStack>
                  <Text lineHeight="tall" textAlign="center">
                    {establishmentData.main_activities}
                  </Text>
                </Card>
              )}

              {/* Location Highlights */}
              {establishmentData?.location_highlights && (
                <Card bg={bgColor} borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }}>
                  <HStack spacing={2} justify="center" mb={4}>
                    <Icon as={FaRegLightbulb} color="orange.500" boxSize={5} />
                    <Heading as="h3" size="md" color={textColor}>
                      Location Highlights
                    </Heading>
                  </HStack>
                  <Text lineHeight="tall" textAlign="center">
                    {establishmentData.location_highlights}
                  </Text>
                </Card>
              )}

              {/* Custom Message */}
              {establishmentData?.custom_message && (
                <Card bg={bgColor} borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }}>
                  <HStack spacing={2} justify="center" mb={4}>
                    <Icon as={FaRegCommentDots} color="purple.500" boxSize={5} />
                    <Heading as="h3" size="md" color={textColor}>
                      Special Message
                    </Heading>
                  </HStack>
                  <Text lineHeight="tall" textAlign="center" fontStyle="italic">
                    "{establishmentData.custom_message}"
                  </Text>
                </Card>
              )}
            </VStack>
          </CardBody>
        </Card>
      </Flex>
    </Flex>
  );
}

export default ProfileEstablishment;
