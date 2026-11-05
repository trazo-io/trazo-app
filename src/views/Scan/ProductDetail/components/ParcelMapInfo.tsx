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
  FaTint,
  FaInfoCircle,
  FaUsers,
  FaCertificate
} from 'react-icons/fa';
import { formatDateRangeForConsumer, formatHarvestDate } from 'utils/consumerDisplay';
import { useIntl } from 'react-intl';
import { MdLocationOn, MdTerrain } from 'react-icons/md';
import { ParcelModal } from './ParcelModal';
import { localizeFieldValue } from 'utils/fieldDisplayUtils';
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
  /** Buyer-only (proof view): gate the parcel contact details. Default false. P2-6. */
  showContactInfo?: boolean;
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
    /** LAST harvest record for the lot. ⛔ Never the season-close date — see `seasonClosedDate`. */
    harvestDate?: string;
    /** FIRST harvest record, set only when the passes span more than one local day. */
    harvestDateStart?: string;
    /**
     * The day the grower closed the season (`History.finish_date`).
     *
     * A different fact from the last pick and labelled as such. Passing it as `harvestDate` is
     * what put Aug 12 under "HARVEST DATE" on a lot whose records ended Aug 7, three inches
     * below the correct range.
     */
    seasonClosedDate?: string;
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
      // Phase 3 privacy: true when the backend rounded the center (~1 km)
      // because the farmer chose "approximate" location disclosure.
      approximate?: boolean;
    };
    location_disclosure_level?: 'exact' | 'approximate' | 'hidden';
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
    primary_crop?: string;
    // `transparency_score` / `transparency_ready` removed 2026-09-09 — see CompanyFarmInfo.
  };
}

export const ParcelMapInfo: React.FC<ParcelMapInfoProps> = ({
  parcelData,
  showContactInfo = false
}) => {
  const intl = useIntl();
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  // NOTE (2026-08-02): `onParcelModalOpen` is never called anywhere in this file, so
  // <ParcelModal> below is currently unreachable on the consumer page — there is no affordance
  // that opens it. Left in place (rather than deleted) because it is a built surface awaiting a
  // trigger, but it is NOT live: the unit labels and any other content inside it are unverified
  // against a real render. Wiring it up needs a leak review first — it renders the parcel
  // `description`, which is free-text the farmer never chose to publish.
  const {
    isOpen: isParcelModalOpen,
    onOpen: onParcelModalOpen,
    onClose: onParcelModalClose
  } = useDisclosure();

  // Phase 3 privacy: geo may be absent (disclosure level "hidden", or the
  // parcel was never mapped) — the header copy must not promise a map.
  const hasGeo = Boolean(parcelData?.polygon?.length || parcelData?.map_metadata?.center);

  return (
    <Box
      bg={bgColor}
      borderRadius="xl"
      border="1px solid"
      borderColor={useColorModeValue('gray.200', 'gray.600')}
      p={{ base: 4, smd: 6 }}
      w="full">
      <VStack spacing={4} align="stretch">
        <HStack spacing={3}>
          <Flex w={10} h={10} borderRadius="lg" bg="green.50" align="center" justify="center">
            <Icon as={FaMapMarkerAlt} color="green.500" boxSize={5} />
          </Flex>
          <VStack align="start" spacing={0} flex={1}>
            <Text
              fontWeight="bold"
              fontSize={{ base: 'md', smd: 'lg', lg: 'xl' }}
              color={textColor}>
              {intl.formatMessage({
                id: 'consumer.farm.parcelInformation',
                defaultMessage: 'Parcel Information'
              })}
            </Text>
            <Text fontSize="xs" color={mutedColor}>
              {hasGeo
                ? intl.formatMessage({
                    id: 'consumer.farm.fieldMapAndDetails',
                    defaultMessage: 'Field map and cultivation details'
                  })
                : intl.formatMessage({
                    id: 'consumer.farm.cultivationDetailsSubtitle',
                    defaultMessage: 'Cultivation details'
                  })}
            </Text>
          </VStack>
          {hasGeo && (
            <Badge variant="neutral" borderRadius="full" fontSize="xs">
              {intl.formatMessage({
                id: 'consumer.farm.fieldMap',
                defaultMessage: 'Field Map'
              })}
            </Badge>
          )}
        </HStack>

        <VStack spacing={6} align="stretch">
          {/* Interactive Map — gated by the farmer's location disclosure
              level (Phase 3 privacy). "hidden" ships no geodata at all;
              "approximate" ships a ~1 km rounded center and no boundary. */}
          {hasGeo && (
            <Box position="relative">
              <CardWithMap
                polygon={parcelData?.polygon}
                center={parcelData?.map_metadata?.center}
                zoom={parcelData?.map_metadata?.zoom}
              />
              {parcelData?.map_metadata?.approximate && (
                <Text fontSize="xs" color={mutedColor} mt={2}>
                  {intl.formatMessage({
                    id: 'consumer.farm.approximateAreaNote',
                    // ⛔ NOT "the farmer chose not to share". `location_disclosure_level`
                    // DEFAULTS to 'approximate' (product/models.py), so this line was
                    // attributing a deliberate decision to a grower who never made one — on a
                    // public page, about their own conduct. State the fact instead.
                    defaultMessage:
                      'Approximate area. The exact field boundary is not shown publicly.'
                  })}
                </Text>
              )}
            </Box>
          )}

          {/* Parcel Details */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <VStack align="start" spacing={4}>
              <Box>
                <Text fontSize="xs" color={mutedColor} fontWeight="semibold" mb={1}>
                  {intl.formatMessage({
                    id: 'consumer.farm.parcelName',
                    defaultMessage: 'PARCEL NAME'
                  })}
                </Text>
                <Text
                  fontSize={{ base: 'md', smd: 'lg', lg: 'xl' }}
                  fontWeight="semibold"
                  color={textColor}>
                  {parcelData?.name ||
                    intl.formatMessage({
                      id: 'consumer.farm.fieldFallback',
                      defaultMessage: 'Field'
                    })}
                </Text>
              </Box>

              <Box>
                <Text fontSize="xs" color={mutedColor} fontWeight="semibold" mb={1}>
                  {intl.formatMessage({
                    id: 'consumer.farm.location',
                    defaultMessage: 'LOCATION'
                  })}
                </Text>
                <HStack spacing={2}>
                  <Icon as={MdLocationOn} color="green.500" />
                  <Text fontSize="md" color={textColor}>
                    {parcelData?.location ||
                      intl.formatMessage({
                        id: 'consumer.farm.locationNotSpecified',
                        defaultMessage: 'Location not specified'
                      })}
                  </Text>
                </HStack>
              </Box>

              {/* Printed GPS coordinates removed (2026-06): exact coordinates
                  in text + farm name on a public page is a security/privacy
                  exposure (scouting, theft targeting). The satellite map
                  remains — it communicates place without handing out a
                  6-decimal waypoint. Farmer-controlled disclosure levels
                  arrive with `parcel_location_disclosure_level` (Phase 3). */}
            </VStack>

            <VStack align="start" spacing={4}>
              {parcelData?.area && (
                <Stat>
                  <StatLabel fontSize="xs" color={mutedColor}>
                    {intl.formatMessage({
                      id: 'consumer.farm.area',
                      defaultMessage: 'AREA'
                    })}
                  </StatLabel>
                  <StatNumber fontSize={{ base: 'md', smd: 'lg', lg: 'xl' }} color={textColor}>
                    {parcelData.area}{' '}
                    {parcelData.areaUnit ||
                      intl.formatMessage({
                        id: 'consumer.farm.hectares',
                        defaultMessage: 'hectares'
                      })}
                  </StatNumber>
                  <StatHelpText fontSize="xs">
                    {intl.formatMessage({
                      id: 'consumer.farm.totalCultivationArea',
                      defaultMessage: 'Total cultivation area'
                    })}
                  </StatHelpText>
                </Stat>
              )}

              {parcelData?.soilType && (
                <Box>
                  <Text fontSize="xs" color={mutedColor} fontWeight="semibold" mb={1}>
                    {intl.formatMessage({
                      id: 'consumer.farm.soilType',
                      defaultMessage: 'SOIL TYPE'
                    })}
                  </Text>
                  <HStack spacing={2}>
                    <Icon as={MdTerrain} color="green.500" />
                    <Text fontSize="md" color={textColor}>
                      {formatDisplayValue(parcelData.soilType)
                        .split(',')
                        .map((s) => localizeFieldValue(s.trim(), intl.locale))
                        .join(', ')}
                    </Text>
                  </HStack>
                </Box>
              )}

              {parcelData?.elevation && (
                <Box>
                  <Text fontSize="xs" color={mutedColor} fontWeight="semibold" mb={1}>
                    {intl.formatMessage({
                      id: 'consumer.farm.elevation',
                      defaultMessage: 'ELEVATION'
                    })}
                  </Text>
                  <Text fontSize="md" color={textColor}>
                    {intl.formatMessage(
                      {
                        id: 'consumer.farm.metersAboveSeaLevel',
                        defaultMessage: '{value}m above sea level'
                      },
                      { value: parcelData.elevation }
                    )}
                  </Text>
                </Box>
              )}
            </VStack>
          </SimpleGrid>

          <Divider />

          {/* Cultivation Details */}
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color={textColor} mb={3}>
              {intl.formatMessage({
                id: 'consumer.farm.cultivationDetails',
                defaultMessage: 'Cultivation Details'
              })}
            </Text>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              {/* Display primary_crop if available, otherwise fall back to cropType */}
              {(parcelData?.primary_crop || parcelData?.cropType) && (
                <VStack align="start" spacing={1}>
                  <HStack spacing={2}>
                    <Icon as={FaSeedling} color="green.500" boxSize={4} />
                    <Text fontSize="xs" color={mutedColor} fontWeight="semibold">
                      {intl.formatMessage({
                        id: 'consumer.farm.primaryCrop',
                        defaultMessage: 'PRIMARY CROP'
                      })}
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
                    <Icon as={FaTint} color="green.500" boxSize={4} />
                    <Text fontSize="xs" color={mutedColor} fontWeight="semibold">
                      {intl.formatMessage({
                        id: 'consumer.farm.irrigation',
                        defaultMessage: 'IRRIGATION'
                      })}
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
                      {intl.formatMessage({
                        id: 'consumer.farm.slope',
                        defaultMessage: 'SLOPE'
                      })}
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
          {/* `consumer_story` dropped from this guard 2026-08-07 along with the field —
              `_build_public_parcel` never put it on the wire, so it was always undefined. */}
          {(parcelData?.transparency_description || parcelData?.sustainability_practices) && (
            <>
              <Divider />
              <Box>
                <VStack spacing={4} align="stretch">
                  {/* The farm's own description of the parcel. It was headed "WHAT MAKES THIS
                      PARCEL SPECIAL" in a green box with a leaf: Trazo vouching for the farm's
                      marketing copy. It is the farm's words, so it says so, neutrally
                      (2026-11-04). Not on the public payload today (_build_public_parcel). */}
                  {parcelData?.transparency_description && (
                    <Box p={4} bg="gray.50" borderRadius="lg" border="1px" borderColor="gray.200">
                      <VStack spacing={2} align="stretch">
                        <HStack>
                          <Text fontWeight="bold" color="gray.600" fontSize="xs">
                            {intl.formatMessage({
                              id: 'consumer.farm.parcelInFarmWords',
                              defaultMessage: "IN THE FARM'S WORDS"
                            })}
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
                              {intl.formatMessage({
                                id: 'consumer.farm.sustainabilityPractices',
                                defaultMessage: 'SUSTAINABILITY PRACTICES'
                              })}
                            </Text>
                          </HStack>
                          <Text color="gray.700" fontSize="sm" lineHeight="tall">
                            {parcelData.sustainability_practices}
                          </Text>
                        </VStack>
                      </Box>
                    )}
                  </SimpleGrid>
                </VStack>
              </Box>
            </>
          )}

          {/* Planting, harvest and season-close dates.
              🔴 2026-09-16 — "HARVEST DATE" here used to render `finish_date`, the day the
              grower CLOSED the season, while the hero and the HARVEST pillar above rendered the
              actual harvest records. One page, one label, two different dates (Jul 20 - Aug 7
              vs Aug 12 on the audited blueberry lot). Harvest now comes from the same resolver
              as the hero, multi-pass picks print as the range they are, and season close gets
              its own row when it says something the harvest date does not. */}
          {(parcelData?.plantingDate ||
            parcelData?.harvestDate ||
            parcelData?.seasonClosedDate) && (
            <>
              <Divider />
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {parcelData?.plantingDate && (
                  <Box>
                    <Text fontSize="xs" color={mutedColor} fontWeight="semibold" mb={1}>
                      {intl.formatMessage({
                        id: 'consumer.farm.plantingDate',
                        defaultMessage: 'PLANTING DATE'
                      })}
                    </Text>
                    <Text fontSize="md" color={textColor}>
                      {new Date(parcelData.plantingDate).toLocaleDateString()}
                    </Text>
                  </Box>
                )}

                {parcelData?.harvestDate && (
                  <Box>
                    <Text fontSize="xs" color={mutedColor} fontWeight="semibold" mb={1}>
                      {intl.formatMessage({
                        id: 'consumer.farm.harvestDate',
                        defaultMessage: 'HARVEST DATE'
                      })}
                    </Text>
                    <Text fontSize="md" color={textColor}>
                      {(parcelData.harvestDateStart &&
                        formatDateRangeForConsumer(
                          parcelData.harvestDateStart,
                          parcelData.harvestDate,
                          intl.locale
                        )) ||
                        formatHarvestDate(parcelData.harvestDate, intl.locale) ||
                        new Date(parcelData.harvestDate).toLocaleDateString()}
                    </Text>
                  </Box>
                )}

                {parcelData?.seasonClosedDate && (
                  <Box>
                    <Text fontSize="xs" color={mutedColor} fontWeight="semibold" mb={1}>
                      {intl.formatMessage({
                        id: 'consumer.farm.seasonClosed',
                        defaultMessage: 'SEASON CLOSED'
                      })}
                    </Text>
                    <Text fontSize="md" color={textColor}>
                      {formatHarvestDate(parcelData.seasonClosedDate, intl.locale) ||
                        new Date(parcelData.seasonClosedDate).toLocaleDateString()}
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
            areaUnit: parcelData.areaUnit,
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
            // Contact details are buyer-only (proof view) — P2-6 defense-in-depth.
            contact_person: showContactInfo ? parcelData.contact_person : undefined,
            contact_phone: showContactInfo ? parcelData.contact_phone : undefined,
            contact_email: showContactInfo ? parcelData.contact_email : undefined,
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
