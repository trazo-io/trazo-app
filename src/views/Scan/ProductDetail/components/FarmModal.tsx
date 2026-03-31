import React from 'react';
import { useSwipeToDismiss } from 'hooks/useSwipeToDismiss';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Icon,
  Image,
  Divider,
  SimpleGrid,
  useColorModeValue,
  Flex,
  Link,
  Tooltip,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Avatar,
  Button,
  useBreakpointValue,
  Wrap,
  WrapItem,
  Progress,
  Tag,
  TagLabel,
  TagLeftIcon
} from '@chakra-ui/react';
import {
  FaIndustry,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaFacebook,
  FaInstagram,
  FaUsers,
  FaCalendarAlt,
  FaCertificate,
  FaLeaf,
  FaSeedling,
  FaTractor,
  FaRuler,
  FaAward,
  FaGlobe,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaTree,
  FaWater,
  FaRecycle,
  FaShieldAlt
} from 'react-icons/fa';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';

interface FarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  establishmentData: {
    id: string | number;
    name: string;
    description?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zone?: string;
    latitude?: number;
    longitude?: number;
    contact_person?: string;
    contact_phone?: string;
    contact_email?: string;
    email?: string;
    phone?: string;
    zip_code?: string;
    facebook?: string;
    instagram?: string;
    certifications?: string;
    // Operational agricultural fields - updated for transparency-first approach
    water_sources?: string[];
    // climate_zone removed (not consumer-relevant)
    soil_health_practices?: string[]; // replaces soil_types
    // conservation_practices merged into sustainability_practices
    irrigation_methods?: string[];
    about?: string;
    main_activities?: string;
    location_highlights?: string;
    custom_message?: string;
    is_active?: boolean;
    crops_grown?: string[] | string;
    sustainability_practices?: string[] | string;
    employee_count?: number;
    total_acreage?: number;
    year_established?: number;
    establishment_type?: string;
    farming_method?: string;
    images?: string[];
    parcels?: Array<{
      id: string | number;
      name: string;
      area: number;
    }>;
  };
}

// Known acronyms that should stay uppercase
const ACRONYMS = new Set(['ipm', 'npk', 'gmo', 'usda', 'epa']);

// Helper function to format values to Title Case (handles both snake_case and space-separated)
const formatLabel = (value: string | undefined): string => {
  if (!value) return '';
  return value
    .split(/[_\s]+/)
    .map((word) =>
      ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');
};

export const FarmModal: React.FC<FarmModalProps> = ({
  isOpen,
  onClose,
  establishmentData
}) => {
  const swipeHandlers = useSwipeToDismiss({ onClose });
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const accentColor = useColorModeValue('green.500', 'green.400');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const iconBg = useColorModeValue('green.50', 'green.900');
  const messageBg = useColorModeValue('blue.50', 'blue.900');
  const parcelItemBg = useColorModeValue('white', 'gray.800');
  const isMobile = useBreakpointValue({ base: true, md: false });

  const getEstablishmentTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'organic':
        return FaLeaf;
      case 'conventional':
        return FaTractor;
      case 'regenerative':
        return FaRecycle;
      default:
        return FaIndustry;
    }
  };

  const getFarmingMethodColor = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'organic':
        return 'green';
      case 'conventional':
        return 'blue';
      case 'regenerative':
        return 'purple';
      default:
        return 'gray';
    }
  };

  const headerContent = (
    <HStack spacing={4}>
      <Box p={3} borderRadius="lg" bg={iconBg}>
        <Icon
          as={getEstablishmentTypeIcon(establishmentData.establishment_type || '')}
          boxSize={6}
          color={accentColor}
        />
      </Box>
      <VStack align="start" spacing={1}>
        <Heading size={{ base: 'md', md: 'lg' }} color={textColor}>
          {establishmentData.name}
        </Heading>
        <HStack spacing={2} flexWrap="wrap">
          {establishmentData.establishment_type && (
            <Badge
              colorScheme={getFarmingMethodColor(establishmentData.establishment_type)}
              variant="subtle"
              fontSize="xs"
              px={2}
              py={1}
              borderRadius="full"
              textTransform="none"
            >
              {formatLabel(establishmentData.establishment_type)}
            </Badge>
          )}
          {establishmentData.farming_method && (
            <Badge
              colorScheme={getFarmingMethodColor(establishmentData.farming_method)}
              variant="outline"
              fontSize="xs"
              px={2}
              py={1}
              borderRadius="full"
              textTransform="none"
            >
              {formatLabel(establishmentData.farming_method)}
            </Badge>
          )}
          {/* is_active badge removed: consumer API filters by is_active=True,
             so if the consumer can see this page, it's always active — the badge adds no info */}
        </HStack>
      </VStack>
    </HStack>
  );

  const bodyContent = (
    <VStack spacing={6} align="stretch" pb={{ base: 6, md: 0 }}>
      {/* Hero Image and Description */}
      {(establishmentData.images?.length ||
        establishmentData.description ||
        establishmentData.about) && (
        <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
          <CardBody p={6}>
            <VStack spacing={4} align="stretch">
              {establishmentData.images && establishmentData.images.length > 0 && (
                <Box borderRadius="lg" overflow="hidden" maxH="200px">
                  <Image
                    src={establishmentData.images[0]}
                    alt={establishmentData.name}
                    w="full"
                    h="200px"
                    objectFit="cover"
                  />
                </Box>
              )}
              {establishmentData.description && (
                <Text color={textColor} lineHeight="tall">
                  {establishmentData.description}
                </Text>
              )}
              {establishmentData.about &&
                establishmentData.about !== establishmentData.description && (
                  <Box>
                    <Heading size="sm" color={textColor} mb={2}>
                      About
                    </Heading>
                    <Text color={textColor} lineHeight="tall" fontSize="sm">
                      {establishmentData.about}
                    </Text>
                  </Box>
                )}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Key Statistics */}
      <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
        <CardBody p={6}>
          <Heading size="md" color={textColor} mb={4}>
            Farm Overview
          </Heading>
          <StatGroup>
            {establishmentData.total_acreage && (
              <Stat>
                <StatLabel color="gray.500">Total Area</StatLabel>
                <StatNumber color={accentColor}>
                  {establishmentData.total_acreage} acres
                </StatNumber>
              </Stat>
            )}
            {establishmentData.parcels && (
              <Stat>
                <StatLabel color="gray.500">Parcels</StatLabel>
                <StatNumber color={accentColor}>
                  {establishmentData.parcels.length}
                </StatNumber>
              </Stat>
            )}
            {establishmentData.year_established && (
              <Stat>
                <StatLabel color="gray.500">Established</StatLabel>
                <StatNumber color={accentColor}>
                  {establishmentData.year_established}
                </StatNumber>
              </Stat>
            )}
          </StatGroup>
        </CardBody>
      </Card>

      {/* Location Information */}
      <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
        <CardBody p={6}>
          <Heading size="md" color={textColor} mb={4}>
            Location & Contact
          </Heading>
          <VStack spacing={4} align="stretch">
            {establishmentData.address && (
              <HStack spacing={3}>
                <Icon as={FaMapMarkerAlt} color={accentColor} flexShrink={0} />
                <Text color={textColor}>
                  {establishmentData.address}
                  {establishmentData.city && `, ${establishmentData.city}`}
                  {establishmentData.state && `, ${establishmentData.state}`}
                  {establishmentData.country && `, ${establishmentData.country}`}
                  {establishmentData.zip_code && ` ${establishmentData.zip_code}`}
                </Text>
              </HStack>
            )}
            {establishmentData.zone && (
              <HStack spacing={3}>
                <Icon as={FaGlobe} color={accentColor} flexShrink={0} />
                <Text color={textColor}>Zone: {establishmentData.zone}</Text>
              </HStack>
            )}
            {establishmentData.latitude && establishmentData.longitude && (
              <HStack spacing={3}>
                <Icon as={FaMapMarkerAlt} color={accentColor} flexShrink={0} />
                <Text color="gray.500" fontSize="sm">
                  {establishmentData.latitude.toFixed(4)},{' '}
                  {establishmentData.longitude.toFixed(4)}
                </Text>
              </HStack>
            )}

            <Divider />

            {establishmentData.contact_person && (
              <HStack spacing={3}>
                <Icon as={FaUsers} color={accentColor} flexShrink={0} />
                <Text color={textColor}>Contact: {establishmentData.contact_person}</Text>
              </HStack>
            )}
            {(establishmentData.phone || establishmentData.contact_phone) && (
              <HStack spacing={3}>
                <Icon as={FaPhone} color={accentColor} flexShrink={0} />
                <Link
                  href={`tel:${establishmentData.phone || establishmentData.contact_phone}`}
                  color={textColor}
                >
                  {establishmentData.phone || establishmentData.contact_phone}
                </Link>
              </HStack>
            )}
            {(establishmentData.email || establishmentData.contact_email) && (
              <HStack spacing={3}>
                <Icon as={FaEnvelope} color={accentColor} flexShrink={0} />
                <Link
                  href={`mailto:${
                    establishmentData.email || establishmentData.contact_email
                  }`}
                  color={textColor}
                >
                  {establishmentData.email || establishmentData.contact_email}
                </Link>
              </HStack>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Crops and Practices */}
      {(establishmentData.crops_grown?.length ||
        establishmentData.sustainability_practices?.length) && (
        <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
          <CardBody p={6}>
            <Heading size="md" color={textColor} mb={4}>
              Agricultural Practices
            </Heading>
            <VStack spacing={4} align="stretch">
              {establishmentData.crops_grown && (
                <Box>
                  <HStack mb={3}>
                    <Icon as={FaSeedling} color={accentColor} />
                    <Text fontWeight="semibold" color={textColor}>
                      Crops Grown
                    </Text>
                  </HStack>
                  <Wrap spacing={2}>
                    {(() => {
                      let crops: string[] = [];

                      if (Array.isArray(establishmentData.crops_grown)) {
                        crops = establishmentData.crops_grown;
                      } else if (typeof establishmentData.crops_grown === 'string') {
                        try {
                          crops = JSON.parse(establishmentData.crops_grown);
                        } catch {
                          crops = establishmentData.crops_grown
                            .split(',')
                            .map((crop) => crop.trim())
                            .filter((crop) => crop);
                        }
                      }

                      return crops.map((crop: string, index: number) => (
                        <WrapItem key={index}>
                          <Tag
                            colorScheme="green"
                            variant="subtle"
                            borderRadius="full"
                            size="md"
                          >
                            <TagLeftIcon as={FaSeedling} />
                            <TagLabel>{crop}</TagLabel>
                          </Tag>
                        </WrapItem>
                      ));
                    })()}
                  </Wrap>
                </Box>
              )}

              {establishmentData.sustainability_practices && (
                <Box>
                  <HStack mb={3}>
                    <Icon as={FaLeaf} color={accentColor} />
                    <Text fontWeight="semibold" color={textColor}>
                      Sustainability Practices
                    </Text>
                  </HStack>
                  <Wrap spacing={2}>
                    {(() => {
                      let practices: string[] = [];

                      if (Array.isArray(establishmentData.sustainability_practices)) {
                        practices = establishmentData.sustainability_practices;
                      } else if (
                        typeof establishmentData.sustainability_practices === 'string'
                      ) {
                        try {
                          practices = JSON.parse(establishmentData.sustainability_practices);
                        } catch {
                          practices = establishmentData.sustainability_practices
                            .split(',')
                            .map((practice) => practice.trim())
                            .filter((practice) => practice);
                        }
                      }

                      return practices.map((practice: string, index: number) => (
                        <WrapItem key={index}>
                          <Tag
                            colorScheme="green"
                            variant="subtle"
                            borderRadius="full"
                            size="md"
                          >
                            <TagLeftIcon as={FaLeaf} />
                            <TagLabel>{practice}</TagLabel>
                          </Tag>
                        </WrapItem>
                      ));
                    })()}
                  </Wrap>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Activities and Highlights */}
      {(establishmentData.main_activities || establishmentData.location_highlights) && (
        <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
          <CardBody p={6}>
            <Heading size="md" color={textColor} mb={4}>
              Farm Details
            </Heading>
            <VStack spacing={4} align="stretch">
              {establishmentData.main_activities && (
                <Box>
                  <HStack mb={2}>
                    <Icon as={FaTractor} color={accentColor} />
                    <Text fontWeight="semibold" color={textColor}>
                      Main Activities
                    </Text>
                  </HStack>
                  <Text color={textColor} fontSize="sm" lineHeight="tall">
                    {establishmentData.main_activities}
                  </Text>
                </Box>
              )}

              {establishmentData.location_highlights && (
                <Box>
                  <HStack mb={2}>
                    <Icon as={FaMapMarkerAlt} color={accentColor} />
                    <Text fontWeight="semibold" color={textColor}>
                      Location Highlights
                    </Text>
                  </HStack>
                  <Text color={textColor} fontSize="sm" lineHeight="tall">
                    {establishmentData.location_highlights}
                  </Text>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Consumer Message */}
      {establishmentData.custom_message && (
        <Card
          bg={messageBg}
          borderRadius="lg"
          border="1px"
          borderColor="blue.200"
        >
          <CardBody p={6}>
            <HStack mb={3}>
              <Icon as={FaCheckCircle} color="blue.500" />
              <Heading size="md" color="blue.700">
                Message to Consumers
              </Heading>
            </HStack>
            <Text color="blue.600" lineHeight="tall" fontStyle="italic">
              "{establishmentData.custom_message}"
            </Text>
          </CardBody>
        </Card>
      )}

      {/* Operational Details */}
      {(establishmentData.water_sources?.length ||
        establishmentData.soil_health_practices?.length ||
        establishmentData.irrigation_methods?.length) && (
        <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
          <CardBody p={6}>
            <Heading size="md" color={textColor} mb={4}>
              <HStack>
                <Icon as={FaTractor} color={accentColor} />
                <Text>Operational Details</Text>
              </HStack>
            </Heading>
            <VStack spacing={4} align="stretch">
              {establishmentData.water_sources?.length > 0 && (
                <Box>
                  <Text fontWeight="semibold" color={textColor} fontSize="sm" mb={2}>
                    Water Sources
                  </Text>
                  <Wrap spacing={2}>
                    {establishmentData.water_sources.map((source, index) => (
                      <Badge key={index} colorScheme="green" p={2} borderRadius="md">
                        {source}
                      </Badge>
                    ))}
                  </Wrap>
                </Box>
              )}

              {establishmentData.soil_health_practices?.length > 0 && (
                <Box>
                  <Text fontWeight="semibold" color={textColor} fontSize="sm" mb={2}>
                    Soil Health Practices
                  </Text>
                  <Wrap spacing={2}>
                    {establishmentData.soil_health_practices.map((practice, index) => (
                      <Badge key={index} colorScheme="orange" p={2} borderRadius="md">
                        {practice}
                      </Badge>
                    ))}
                  </Wrap>
                </Box>
              )}

              {establishmentData.irrigation_methods?.length > 0 && (
                <Box>
                  <Text fontWeight="semibold" color={textColor} fontSize="sm" mb={2}>
                    Irrigation Methods
                  </Text>
                  <Wrap spacing={2}>
                    {establishmentData.irrigation_methods.map((method, index) => (
                      <Badge key={index} colorScheme="blue" p={2} borderRadius="md">
                        {method}
                      </Badge>
                    ))}
                  </Wrap>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Certifications */}
      {establishmentData.certifications && (
        <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
          <CardBody p={6}>
            <Heading size="md" color={textColor} mb={4}>
              <HStack>
                <Icon as={FaCertificate} color={accentColor} />
                <Text>Certifications & Standards</Text>
              </HStack>
            </Heading>
            <Text color={textColor} lineHeight="tall">
              {typeof establishmentData.certifications === 'object' && establishmentData.certifications !== null
                ? Array.isArray(establishmentData.certifications)
                  ? (establishmentData.certifications as any[]).map((c: any) => typeof c === 'object' ? c.display_name || c.name : c).join(', ')
                  : (establishmentData.certifications as any).display_name || String(establishmentData.certifications)
                : establishmentData.certifications}
            </Text>
          </CardBody>
        </Card>
      )}

      {/* Parcels Overview */}
      {establishmentData.parcels && establishmentData.parcels.length > 0 && (
        <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
          <CardBody p={6}>
            <Heading size="md" color={textColor} mb={4}>
              <HStack>
                <Icon as={FaRuler} color={accentColor} />
                <Text>Parcels ({establishmentData.parcels.length})</Text>
              </HStack>
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              {establishmentData.parcels.map((parcel) => (
                <Box
                  key={parcel.id}
                  p={3}
                  border="1px"
                  borderColor={borderColor}
                  borderRadius="md"
                  bg={parcelItemBg}
                >
                  <HStack justify="space-between">
                    <Text fontWeight="medium" color={textColor}>
                      {parcel.name}
                    </Text>
                    <Badge colorScheme="green" variant="subtle">
                      {parcel.area} ha
                    </Badge>
                  </HStack>
                </Box>
              ))}
            </SimpleGrid>
          </CardBody>
        </Card>
      )}
    </VStack>
  );

  // Mobile: Bottom sheet (Drawer)
  if (isMobile) {
    return (
      <Drawer isOpen={isOpen} onClose={onClose} placement="bottom">
        <DrawerOverlay bg="blackAlpha.400" />
        <DrawerContent
          bg={bgColor}
          borderTopRadius="2xl"
          maxH="82vh"
          containerProps={{ style: { zIndex: 10000 } }}
        >
          {/* Drag handle - swipe down to dismiss */}
          <Box
            pt={3} pb={1}
            display="flex" justifyContent="center"
            cursor="grab"
            {...swipeHandlers}
          >
            <Box w="36px" h="4px" borderRadius="full" bg="gray.300" />
          </Box>
          <DrawerCloseButton top={4} />
          <DrawerHeader px={5} pt={2} pb={4} borderBottomWidth="1px" borderColor={borderColor}>
            {headerContent}
          </DrawerHeader>
          <DrawerBody px={5} py={4} overflowY="auto">
            {bodyContent}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Centered modal
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent bg={bgColor} borderRadius="xl" maxH="90vh" mx={4}>
        <ModalHeader p={6} pb={4} borderBottom="1px" borderColor={borderColor}>
          {headerContent}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody p={6} overflowY="auto">
          {bodyContent}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default FarmModal;
