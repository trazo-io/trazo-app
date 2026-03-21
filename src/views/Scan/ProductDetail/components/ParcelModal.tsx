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
  Progress,
  Tag,
  TagLabel,
  TagLeftIcon,
  Wrap,
  WrapItem,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { StandardImageGallery } from '../../../../components/ImageGallery';
import {
  FaRuler,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaUsers,
  FaCalendarAlt,
  FaCertificate,
  FaLeaf,
  FaSeedling,
  FaTractor,
  FaAward,
  FaGlobe,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaTree,
  FaWater,
  FaRecycle,
  FaShieldAlt,
  FaLayerGroup,
  FaCompass,
  FaExpand,
  FaMapSigns,
  FaFlask,
  FaThermometerHalf,
  FaEye
} from 'react-icons/fa';
// @ts-ignore - CardWithMap is a JSX component without TypeScript declarations
import CardWithMap from 'components/Map/CardWithMap';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';

// 🎯 Utility to format field values as Title Case (e.g., "organic" → "Organic", "fair_trade" → "Fair Trade")
const formatDisplayValue = (value: string | undefined | null): string => {
  if (!value) return '--';
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// 🏅 Certification type mapping for proper display names
const CERTIFICATION_DISPLAY_NAMES: Record<string, string> = {
  organic: 'USDA Organic',
  eu_organic: 'EU Organic',
  regenerative: 'Regenerative Organic (ROC)',
  cng: 'Certified Naturally Grown',
  global_gap: 'GlobalG.A.P.',
  fair_trade: 'Fair Trade Certified',
  rainforest_alliance: 'Rainforest Alliance',
  carbon_neutral: 'Carbon Neutral',
  biodynamic: 'Demeter Biodynamic',
  non_gmo: 'Non-GMO Project Verified'
};

const formatCertificationType = (value: string | undefined | null): string => {
  if (!value) return '--';
  return CERTIFICATION_DISPLAY_NAMES[value] || formatDisplayValue(value);
};

interface ParcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcelData: {
    id: string | number;
    name: string;
    description?: string;
    area: number;
    certified?: boolean;
    polygon?: any;
    map_metadata?: {
      center?: [number, number];
      zoom?: number;
    };
    soil_type?: string;
    unique_code?: string;
    certification_type?: string;
    contact_person?: string;
    contact_phone?: string;
    contact_email?: string;
    establishment?: {
      name: string;
      location: string;
    };
    current_history?: {
      id: string | number;
      name: string;
      start_date: string;
      finish_date?: string;
      crop_type?: string;
    };
    productions_completed?: number;
    total_productions?: number;
    images?: string[];
  };
}

export const ParcelModal: React.FC<ParcelModalProps> = ({ isOpen, onClose, parcelData }) => {
  const swipeHandlers = useSwipeToDismiss({ onClose });
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const accentColor = useColorModeValue('green.500', 'green.400');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const iconBg = useColorModeValue('green.50', 'green.900');
  const currentProdBg = useColorModeValue('blue.50', 'blue.900');
  const isMobile = useBreakpointValue({ base: true, md: false });

  const getCertificationColor = (certified: boolean) => {
    return certified ? 'green' : 'gray';
  };

  const getSoilTypeIcon = (soilType: string) => {
    switch (soilType?.toLowerCase()) {
      case 'clay':
        return FaFlask;
      case 'sandy':
        return FaLayerGroup;
      case 'loam':
        return FaSeedling;
      default:
        return FaLayerGroup;
    }
  };

  const headerContent = (
    <HStack spacing={4}>
      <Box p={3} borderRadius="lg" bg={iconBg}>
        <Icon as={FaRuler} boxSize={6} color={accentColor} />
      </Box>
      <VStack align="start" spacing={1}>
        <Heading size={{ base: 'md', md: 'lg' }} color={textColor}>
          {parcelData.name}
        </Heading>
        <HStack spacing={2} flexWrap="wrap">
          <Badge
            colorScheme="blue"
            variant="subtle"
            fontSize="xs"
            px={2}
            py={1}
            borderRadius="full"
          >
            {parcelData.area} hectares
          </Badge>
          {parcelData.certified && (
            <Badge
              colorScheme={getCertificationColor(parcelData.certified)}
              variant="solid"
              fontSize="xs"
              px={2}
              py={1}
              borderRadius="full"
            >
              <Icon as={FaCheckCircle} mr={1} boxSize={2} />
              Certified
            </Badge>
          )}
        </HStack>
      </VStack>
    </HStack>
  );

  const bodyContent = (
    <VStack spacing={6} align="stretch" pb={{ base: 6, md: 0 }}>
      {/* Description */}
      {parcelData.description && (
        <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
          <CardBody p={6}>
            <Text color={textColor} lineHeight="tall">
              {parcelData.description}
            </Text>
          </CardBody>
        </Card>
      )}

      {/* Key Statistics */}
      <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
        <CardBody p={6}>
          <Heading size="md" color={textColor} mb={4}>
            Parcel Overview
          </Heading>
          <StatGroup>
            <Stat>
              <StatLabel color="gray.500">Area</StatLabel>
              <StatNumber color={accentColor}>{parcelData.area} ha</StatNumber>
            </Stat>
            {parcelData.productions_completed !== undefined && (
              <Stat>
                <StatLabel color="gray.500">Completed Productions</StatLabel>
                <StatNumber color={accentColor}>
                  {parcelData.productions_completed}
                </StatNumber>
              </Stat>
            )}
            {parcelData.total_productions !== undefined && (
              <Stat>
                <StatLabel color="gray.500">Total Productions</StatLabel>
                <StatNumber color={accentColor}>{parcelData.total_productions}</StatNumber>
              </Stat>
            )}
            {parcelData.establishment && (
              <Stat>
                <StatLabel color="gray.500">Establishment</StatLabel>
                <StatNumber color={accentColor} fontSize="md">
                  {parcelData.establishment.name}
                </StatNumber>
              </Stat>
            )}
          </StatGroup>
        </CardBody>
      </Card>

      {/* Interactive Map */}
      {(parcelData.polygon || parcelData.map_metadata) && (
        <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
          <CardBody p={6}>
            <Heading size="md" color={textColor} mb={4}>
              <HStack>
                <Icon as={FaMapMarkerAlt} color={accentColor} />
                <Text>Location & Boundaries</Text>
              </HStack>
            </Heading>
            <Box borderRadius="lg" overflow="hidden" minH={{ base: '250px', md: '400px' }}>
              <CardWithMap
                parcel={{
                  polygon: parcelData.polygon,
                  map_metadata: parcelData.map_metadata,
                  name: parcelData.name,
                  area: parcelData.area
                }}
              />
            </Box>
            {parcelData.map_metadata?.center && (
              <HStack mt={3} spacing={4} fontSize="sm" color="gray.500" flexWrap="wrap">
                <HStack>
                  <Icon as={FaCompass} />
                  <Text>
                    Center: {parcelData.map_metadata.center[0].toFixed(4)},{' '}
                    {parcelData.map_metadata.center[1].toFixed(4)}
                  </Text>
                </HStack>
                {parcelData.map_metadata.zoom && (
                  <HStack>
                    <Icon as={FaExpand} />
                    <Text>Zoom: {parcelData.map_metadata.zoom}</Text>
                  </HStack>
                )}
              </HStack>
            )}
          </CardBody>
        </Card>
      )}

      {/* Current Production */}
      {parcelData.current_history && (
        <Card
          bg={currentProdBg}
          borderRadius="lg"
          border="1px"
          borderColor="blue.200"
        >
          <CardBody p={6}>
            <HStack mb={3}>
              <Icon as={FaSeedling} color="blue.500" />
              <Heading size="md" color="blue.700">
                Current Production
              </Heading>
            </HStack>
            <VStack spacing={3} align="stretch">
              <HStack justify="space-between">
                <Text color="blue.600" fontWeight="medium">
                  {parcelData.current_history.name}
                </Text>
                <Badge colorScheme="blue" variant="subtle">
                  Active
                </Badge>
              </HStack>
              {parcelData.current_history.crop_type && (
                <HStack>
                  <Icon as={FaSeedling} color="blue.500" />
                  <Text color="blue.600" fontSize="sm">
                    Crop: {parcelData.current_history.crop_type}
                  </Text>
                </HStack>
              )}
              <HStack>
                <Icon as={FaCalendarAlt} color="blue.500" />
                <Text color="blue.600" fontSize="sm">
                  Started:{' '}
                  {new Date(parcelData.current_history.start_date).toLocaleDateString()}
                </Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Soil and Environmental Data */}
      {parcelData.soil_type && (
        <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
          <CardBody p={6}>
            <Heading size="md" color={textColor} mb={4}>
              <HStack>
                <Icon as={getSoilTypeIcon(parcelData.soil_type)} color={accentColor} />
                <Text>Soil & Environment</Text>
              </HStack>
            </Heading>
            <VStack spacing={4} align="stretch">
              <HStack spacing={3}>
                <Icon as={FaLayerGroup} color={accentColor} flexShrink={0} />
                <Text color={textColor}>
                  <Text as="span" fontWeight="medium">
                    Soil Type:
                  </Text>{' '}
                  {formatDisplayValue(parcelData.soil_type)}
                </Text>
              </HStack>
              {parcelData.establishment?.location && (
                <HStack spacing={3}>
                  <Icon as={FaMapMarkerAlt} color={accentColor} flexShrink={0} />
                  <Text color={textColor}>
                    <Text as="span" fontWeight="medium">
                      Location:
                    </Text>{' '}
                    {parcelData.establishment.location}
                  </Text>
                </HStack>
              )}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Certification Information */}
      {(parcelData.certified || parcelData.certification_type) && (
        <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
          <CardBody p={6}>
            <Heading size="md" color={textColor} mb={4}>
              <HStack>
                <Icon as={FaCertificate} color={accentColor} />
                <Text>Certification Status</Text>
              </HStack>
            </Heading>
            <VStack spacing={4} align="stretch">
              <HStack spacing={3}>
                <Icon
                  as={parcelData.certified ? FaCheckCircle : FaEye}
                  color={parcelData.certified ? 'green.500' : 'gray.400'}
                />
                <Text color={textColor}>
                  <Text as="span" fontWeight="medium">
                    Status:
                  </Text>{' '}
                  {parcelData.certified ? 'Certified' : 'Not Certified'}
                </Text>
              </HStack>
              {parcelData.certification_type && (
                <HStack spacing={3}>
                  <Icon as={FaAward} color={accentColor} />
                  <Text color={textColor}>
                    <Text as="span" fontWeight="medium">
                      Type:
                    </Text>{' '}
                    {formatCertificationType(parcelData.certification_type)}
                  </Text>
                </HStack>
              )}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Contact Information - Removed for privacy protection */}
      {/* Personal contact information (contact_person, contact_phone, contact_email)
          has been removed from public display to protect farmer privacy.
          This information should only be available to authenticated users with proper permissions. */}

      {/* Production History Summary */}
      {parcelData.productions_completed !== undefined &&
        parcelData.productions_completed > 0 && (
          <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
            <CardBody p={6}>
              <Heading size="md" color={textColor} mb={4}>
                <HStack>
                  <Icon as={FaTree} color={accentColor} />
                  <Text>Production History</Text>
                </HStack>
              </Heading>
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between">
                  <Text color="gray.500">Completed Productions This Year:</Text>
                  <Badge colorScheme="green" variant="subtle" px={3} py={1}>
                    {parcelData.productions_completed}
                  </Badge>
                </HStack>
                {parcelData.total_productions !== undefined && (
                  <HStack justify="space-between">
                    <Text color="gray.500">Total Productions:</Text>
                    <Badge colorScheme="blue" variant="subtle" px={3} py={1}>
                      {parcelData.total_productions}
                    </Badge>
                  </HStack>
                )}
                <Progress
                  value={
                    (parcelData.productions_completed / (parcelData.total_productions || 1)) *
                    100
                  }
                  colorScheme="green"
                  size="sm"
                  borderRadius="full"
                />
                <Text color="gray.500" fontSize="sm" textAlign="center">
                  Production Activity Level
                </Text>
              </VStack>
            </CardBody>
          </Card>
        )}

      {/* Images Gallery */}
      <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
        <CardBody p={6}>
          <StandardImageGallery
            images={parcelData.images || []}
            title="Parcel Gallery"
            variant="parcel"
            enablePreview={true}
            showImageCount={true}
            height="200px"
            showEmptyState={true}
            maxDisplayImages={4}
            aspectRatio="4/3"
          />
        </CardBody>
      </Card>
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
          maxH="92vh"
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
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
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

export default ParcelModal;
