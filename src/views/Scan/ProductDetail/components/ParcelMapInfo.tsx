import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Icon,
  useColorModeValue,
  Button,
  Stack,
  Divider,
  Flex,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useDisclosure
} from '@chakra-ui/react';
import {
  FaMapMarkerAlt,
  FaRuler,
  FaSeedling,
  FaExpand,
  FaCompress,
  FaLeaf,
  FaInfoCircle,
  FaUsers,
  FaCertificate
} from 'react-icons/fa';
import { MdLocationOn, MdTerrain } from 'react-icons/md';
import { ParcelModal } from './ParcelModal';
// @ts-ignore - CardWithMap is a JSX component without TypeScript declarations
import CardWithMap from 'components/Map/CardWithMap';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';

// 🎯 Utility to format field values as Title Case (e.g., "loam" → "Loam", "sandy_loam" → "Sandy Loam")
const formatDisplayValue = (value: string | undefined | null): string => {
  if (!value) return '--';
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

interface ParcelMapInfoProps {
  parcelData?: {
    id?: string;
    name?: string;
    location?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    area?: number;
    areaUnit?: string;
    soilType?: string;
    cropType?: string;
    plantingDate?: string;
    harvestDate?: string;
    elevation?: number;
    slope?: string;
    irrigationType?: string;
    polygon?: Array<{
      lat: number;
      lng: number;
    }>;
    map_metadata?: {
      center?: {
        lat: number;
        lng: number;
      };
      zoom?: number;
    };
    // Additional fields for modal
    description?: string;
    unique_code?: string;
    contact_person?: string;
    contact_phone?: string;
    contact_email?: string;
    establishment?: {
      id?: string | number;
      name: string;
      description?: string;
      location: string;
      photo?: string;
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
    // Transparency fields from new parcel form
    transparency_description?: string;
    sustainability_practices?: string;
    consumer_story?: string;
    primary_crop?: string;
    transparency_score?: number;
    transparency_ready?: boolean;
  };
}

export const ParcelMapInfo: React.FC<ParcelMapInfoProps> = ({ parcelData }) => {
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  const {
    isOpen: isParcelModalOpen,
    onOpen: onParcelModalOpen,
    onClose: onParcelModalClose
  } = useDisclosure();

  return (
    <Box
      bg={bgColor}
      borderRadius="xl"
      border="1px solid"
      borderColor={useColorModeValue('gray.200', 'gray.600')}
      p={{ base: 4, smd: 6 }}
      w="full"
    >
      <VStack spacing={4} align="stretch">
        <HStack spacing={3}>
          <Flex w={10} h={10} borderRadius="lg" bg="green.50" align="center" justify="center">
            <Icon as={FaMapMarkerAlt} color="green.500" boxSize={5} />
          </Flex>
          <VStack align="start" spacing={0} flex={1}>
            <Text fontWeight="bold" fontSize={{ base: 'md', smd: 'lg' }} color={textColor}>
              Parcel Information
            </Text>
            <Text fontSize="xs" color={mutedColor}>
              Field map and cultivation details
            </Text>
          </VStack>
          <Badge colorScheme="green" borderRadius="full" fontSize="xs">
            Field Map
          </Badge>
        </HStack>

        <VStack spacing={6} align="stretch">
          {/* Interactive Map */}
          <Box position="relative">
            <CardWithMap
              polygon={parcelData?.polygon}
              center={parcelData?.map_metadata?.center}
              zoom={parcelData?.map_metadata?.zoom}
            />
          </Box>

          {/* Parcel Details */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <VStack align="start" spacing={4}>
              <Box>
                <Text fontSize="xs" color={mutedColor} fontWeight="semibold" mb={1}>
                  PARCEL NAME
                </Text>
                <Text fontSize={{ base: 'md', smd: 'lg' }} fontWeight="semibold" color={textColor}>
                  {parcelData?.name || 'Field'}
                </Text>
              </Box>

              <Box>
                <Text fontSize="xs" color={mutedColor} fontWeight="semibold" mb={1}>
                  LOCATION
                </Text>
                <HStack spacing={2}>
                  <Icon as={MdLocationOn} color="green.500" />
                  <Text fontSize="md" color={textColor}>
                    {parcelData?.location || 'Location not specified'}
                  </Text>
                </HStack>
              </Box>

              {parcelData?.coordinates && (
                <Box>
                  <Text fontSize="xs" color={mutedColor} fontWeight="semibold" mb={1}>
                    COORDINATES
                  </Text>
                  <Text fontSize="sm" color={textColor} fontFamily="mono">
                    {parcelData.coordinates.latitude.toFixed(6)},{' '}
                    {parcelData.coordinates.longitude.toFixed(6)}
                  </Text>
                </Box>
              )}
            </VStack>

            <VStack align="start" spacing={4}>
              {parcelData?.area && (
                <Stat>
                  <StatLabel fontSize="xs" color={mutedColor}>
                    AREA
                  </StatLabel>
                  <StatNumber fontSize={{ base: 'md', smd: 'lg' }} color={textColor}>
                    {parcelData.area} {parcelData.areaUnit || 'hectares'}
                  </StatNumber>
                  <StatHelpText fontSize="xs">Total cultivation area</StatHelpText>
                </Stat>
              )}

              {parcelData?.soilType && (
                <Box>
                  <Text fontSize="xs" color={mutedColor} fontWeight="semibold" mb={1}>
                    SOIL TYPE
                  </Text>
                  <HStack spacing={2}>
                    <Icon as={MdTerrain} color="green.500" />
                    <Text fontSize="md" color={textColor}>
                      {formatDisplayValue(parcelData.soilType)}
                    </Text>
                  </HStack>
                </Box>
              )}

              {parcelData?.elevation && (
                <Box>
                  <Text fontSize="xs" color={mutedColor} fontWeight="semibold" mb={1}>
                    ELEVATION
                  </Text>
                  <Text fontSize="md" color={textColor}>
                    {parcelData.elevation}m above sea level
                  </Text>
                </Box>
              )}
            </VStack>
          </SimpleGrid>

          <Divider />

          {/* Cultivation Details */}
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color={textColor} mb={3}>
              Cultivation Details
            </Text>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              {/* Display primary_crop if available, otherwise fall back to cropType */}
              {(parcelData?.primary_crop || parcelData?.cropType) && (
                <VStack align="start" spacing={1}>
                  <HStack spacing={2}>
                    <Icon as={FaSeedling} color="green.500" boxSize={4} />
                    <Text fontSize="xs" color={mutedColor} fontWeight="semibold">
                      PRIMARY CROP
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color={textColor}>
                    {formatDisplayValue(parcelData.primary_crop || parcelData.cropType)}
                  </Text>
                </VStack>
              )}

              {parcelData?.irrigationType && (
                <VStack align="start" spacing={1}>
                  <HStack spacing={2}>
                    <Icon as={FaLeaf} color="green.500" boxSize={4} />
                    <Text fontSize="xs" color={mutedColor} fontWeight="semibold">
                      IRRIGATION
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color={textColor}>
                    {parcelData.irrigationType}
                  </Text>
                </VStack>
              )}

              {parcelData?.slope && (
                <VStack align="start" spacing={1}>
                  <HStack spacing={2}>
                    <Icon as={FaRuler} color="green.500" boxSize={4} />
                    <Text fontSize="xs" color={mutedColor} fontWeight="semibold">
                      SLOPE
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color={textColor}>
                    {parcelData.slope}
                  </Text>
                </VStack>
              )}
            </SimpleGrid>
          </Box>

          {/* 🎯 CONSUMER TRANSPARENCY SECTION - Parcel story for consumers */}
          {(parcelData?.transparency_description ||
            parcelData?.sustainability_practices ||
            parcelData?.consumer_story) && (
            <>
              <Divider />
              <Box>
                <VStack spacing={4} align="stretch">
                  {/* What makes this parcel special */}
                  {parcelData?.transparency_description && (
                    <Box p={4} bg="green.50" borderRadius="lg" border="1px" borderColor="green.200">
                      <VStack spacing={2} align="stretch">
                        <HStack>
                          <Icon as={FaLeaf} color="green.600" boxSize={4} />
                          <Text fontWeight="bold" color="green.700" fontSize="xs">
                            WHAT MAKES THIS PARCEL SPECIAL
                          </Text>
                        </HStack>
                        <Text color="gray.700" fontSize="sm" lineHeight="tall">
                          {parcelData.transparency_description}
                        </Text>
                      </VStack>
                    </Box>
                  )}

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {/* Key sustainability practices */}
                    {parcelData?.sustainability_practices && (
                      <Box p={4} bg="gray.50" borderRadius="lg" border="1px" borderColor="gray.200">
                        <VStack spacing={2} align="stretch">
                          <HStack>
                            <Icon as={FaSeedling} color="green.500" boxSize={4} />
                            <Text fontWeight="bold" color="gray.700" fontSize="xs">
                              SUSTAINABILITY PRACTICES
                            </Text>
                          </HStack>
                          <Text color="gray.700" fontSize="sm" lineHeight="tall">
                            {parcelData.sustainability_practices}
                          </Text>
                        </VStack>
                      </Box>
                    )}

                    {/* Why consumers should care */}
                    {parcelData?.consumer_story && (
                      <Box p={4} bg="gray.50" borderRadius="lg" border="1px" borderColor="gray.200">
                        <VStack spacing={2} align="stretch">
                          <HStack>
                            <Icon as={FaUsers} color="green.500" boxSize={4} />
                            <Text fontWeight="bold" color="gray.700" fontSize="xs">
                              WHY CONSUMERS SHOULD CARE
                            </Text>
                          </HStack>
                          <Text color="gray.700" fontSize="sm" lineHeight="tall">
                            {parcelData.consumer_story}
                          </Text>
                        </VStack>
                      </Box>
                    )}
                  </SimpleGrid>
                </VStack>
              </Box>
            </>
          )}

          {/* Planting and Harvest Dates */}
          {(parcelData?.plantingDate || parcelData?.harvestDate) && (
            <>
              <Divider />
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {parcelData?.plantingDate && (
                  <Box>
                    <Text fontSize="xs" color={mutedColor} fontWeight="semibold" mb={1}>
                      PLANTING DATE
                    </Text>
                    <Text fontSize="md" color={textColor}>
                      {new Date(parcelData.plantingDate).toLocaleDateString()}
                    </Text>
                  </Box>
                )}

                {parcelData?.harvestDate && (
                  <Box>
                    <Text fontSize="xs" color={mutedColor} fontWeight="semibold" mb={1}>
                      HARVEST DATE
                    </Text>
                    <Text fontSize="md" color={textColor}>
                      {new Date(parcelData.harvestDate).toLocaleDateString()}
                    </Text>
                  </Box>
                )}
              </SimpleGrid>
            </>
          )}
        </VStack>
      </VStack>

      {/* Parcel Detail Modal */}
      {parcelData && (
        <ParcelModal
          isOpen={isParcelModalOpen}
          onClose={onParcelModalClose}
          parcelData={{
            id: parcelData.id || '1',
            name: parcelData.name || 'Parcel',
            description: parcelData.description,
            area: parcelData.area || 0,
            polygon: parcelData.polygon,
            map_metadata: parcelData.map_metadata
              ? {
                  center: parcelData.map_metadata.center
                    ? ([parcelData.map_metadata.center.lat, parcelData.map_metadata.center.lng] as [
                        number,
                        number
                      ])
                    : undefined,
                  zoom: parcelData.map_metadata.zoom
                }
              : undefined,
            soil_type: parcelData.soilType,
            unique_code: parcelData.unique_code,
            contact_person: parcelData.contact_person,
            contact_phone: parcelData.contact_phone,
            contact_email: parcelData.contact_email,
            establishment: parcelData.establishment,
            current_history: parcelData.current_history
              ? {
                  ...parcelData.current_history,
                  crop_type: parcelData.cropType
                }
              : undefined,
            productions_completed: parcelData.productions_completed,
            total_productions: parcelData.total_productions,
            images: parcelData.images
          }}
        />
      )}
    </Box>
  );
};
