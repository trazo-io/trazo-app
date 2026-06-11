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
  Stack,
  Divider,
  Flex,
  Button,
  useDisclosure,
  Link
} from '@chakra-ui/react';
import {
  FaBuilding,
  FaMapMarkerAlt,
  FaCertificate,
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaStar,
  FaInfoCircle,
  FaTractor,
  FaLeaf,
  FaFacebook,
  FaInstagram
} from 'react-icons/fa';
import { BsStarFill, BsStarHalf, BsStar } from 'react-icons/bs';
import { CompanyModal } from './CompanyModal';
import { FarmModal } from './FarmModal';
import { ParcelMapInfo } from './ParcelMapInfo';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';

interface CompanyFarmInfoProps {
  companyData?: {
    name?: string;
    description?: string;
    website?: string;
    phone?: string;
    email?: string;
    location?: string;
    // Additional fields for modal
    id?: string;
    tradename?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    facebook?: string;
    instagram?: string;
    logo?: string;
    fiscal_id?: string;
    contact_email?: string;
    established_year?: number;
    employee_count?: number;
    total_establishments?: number;
    total_parcels?: number;
    certifications?: string[] | string;
    subscription_plan?: {
      name: string;
      tier: string;
    };
    // Sustainability data from company onboarding (transparency-first)
    sustainability_goals?: string[];
    crop_focus?: string;
    sustainability_commitment?: string;
  };
  establishmentData?: {
    name?: string;
    location?: string;
    rating?: number;
    certifications?: string[] | string;
    establishedYear?: number;
    size?: string;
    type?: string;
    // Additional fields for modal
    id?: string | number;
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
    about?: string;
    main_activities?: string;
    location_highlights?: string;
    custom_message?: string;
    is_active?: boolean;
    crops_grown?: string[];
    sustainability_practices?: string[];
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
    // Operational fields - updated for transparency-first approach
    // climate_zone removed from UI (not consumer-relevant)
    water_sources?: string[] | string;
    // soil_health_practices replaces soil_types (more consumer-friendly)
    soil_health_practices?: string[] | string;
    soil_types?: string[] | string; // kept for backward compatibility
    // conservation_practices merged into sustainability_practices
    irrigation_methods?: string[] | string;
  };
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
    description?: string;
    certification_type?: string;
    certified?: boolean;
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

export const CompanyFarmInfo: React.FC<CompanyFarmInfoProps> = ({
  companyData,
  establishmentData,
  parcelData
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const {
    isOpen: isCompanyModalOpen,
    onOpen: onCompanyModalOpen,
    onClose: onCompanyModalClose
  } = useDisclosure();

  const {
    isOpen: isEstablishmentModalOpen,
    onOpen: onEstablishmentModalOpen,
    onClose: onEstablishmentModalClose
  } = useDisclosure();

  const renderStars = (rating: number) => {
    return (
      <HStack spacing={1}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            as={rating >= star ? BsStarFill : rating >= star - 0.5 ? BsStarHalf : BsStar}
            color="orange.400"
            boxSize={4}
          />
        ))}
        <Text fontSize="sm" color={mutedColor} ml={2}>
          ({rating.toFixed(1)})
        </Text>
      </HStack>
    );
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Company Information */}
      {companyData && (
        <Box
          bg={bgColor}
          borderRadius="xl"
          border="1px solid"
          borderColor={useColorModeValue('gray.200', 'gray.600')}
          p={{ base: 4, smd: 6 }}
        >
          <VStack spacing={4} align="stretch">
            <Flex
              direction={{ base: 'column', smd: 'row' }}
              align={{ base: 'flex-start', smd: 'center' }}
              gap={3}
            >
              <HStack spacing={3} flex="1" minW={0} align="start">
                <Flex
                  w={10}
                  h={10}
                  borderRadius="lg"
                  bg="green.50"
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  <Icon as={FaBuilding} color="green.500" boxSize={5} />
                </Flex>
                <VStack align="start" spacing={0} flex={1} minW={0}>
                  <Text
                    fontWeight="bold"
                    fontSize={{ base: 'md', smd: 'lg', lg: 'xl' }}
                    color={textColor}
                    noOfLines={2}
                  >
                    {companyData.name || 'Company Name'}
                  </Text>
                  <Text fontSize="xs" color={mutedColor}>
                    Agricultural Producer
                  </Text>
                </VStack>
              </HStack>
              <Button
                size="sm"
                variant="outline"
                colorScheme="green"
                leftIcon={<FaInfoCircle />}
                onClick={onCompanyModalOpen}
                borderRadius="full"
                fontSize="xs"
                flexShrink={0}
                alignSelf={{ base: 'flex-start', smd: 'center' }}
              >
                More Info
              </Button>
            </Flex>

            {companyData.description && (
              <Text fontSize="sm" color={textColor} lineHeight="1.6">
                {companyData.description}
              </Text>
            )}

            {/* Sustainability Goals - From company onboarding (transparency-first) */}
            {companyData.sustainability_goals && companyData.sustainability_goals.length > 0 && (
              <VStack align="start" spacing={2}>
                <HStack spacing={2}>
                  <Icon as={FaLeaf} color="green.500" boxSize={4} />
                  <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                    Sustainability Commitment
                  </Text>
                </HStack>
                <HStack spacing={2} flexWrap="wrap">
                  {companyData.sustainability_goals.map((goal, index) => (
                    <Badge
                      key={index}
                      colorScheme="green"
                      borderRadius="full"
                      px={3}
                      py={1}
                      fontSize="xs"
                    >
                      {goal}
                    </Badge>
                  ))}
                </HStack>
              </VStack>
            )}

            <Divider />

            <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
              {companyData.location && (
                <HStack spacing={2}>
                  <Icon as={FaMapMarkerAlt} color="green.500" boxSize={4} />
                  <Text fontSize="sm" color={textColor}>
                    {companyData.location}
                  </Text>
                </HStack>
              )}

              {companyData.website && (
                <Link href={companyData.website} isExternal _hover={{ textDecoration: 'none' }}>
                  <HStack spacing={2}>
                    <Icon as={FaGlobe} color="green.500" boxSize={4} />
                    <Text fontSize="sm" color="green.500" _hover={{ color: 'green.600' }}>
                      Visit Website
                    </Text>
                  </HStack>
                </Link>
              )}

              {companyData.phone && (
                <Link href={`tel:${companyData.phone}`} _hover={{ textDecoration: 'none' }}>
                  <HStack spacing={2}>
                    <Icon as={FaPhone} color="green.500" boxSize={4} />
                    <Text fontSize="sm" color={textColor}>
                      {companyData.phone}
                    </Text>
                  </HStack>
                </Link>
              )}

              {companyData.email && (
                <Link href={`mailto:${companyData.email}`} _hover={{ textDecoration: 'none' }}>
                  <HStack spacing={2}>
                    <Icon as={FaEnvelope} color="green.500" boxSize={4} />
                    <Text fontSize="sm" color={textColor}>
                      {companyData.email}
                    </Text>
                  </HStack>
                </Link>
              )}

              {/* Social Media Links - Trust Builders */}
              {(companyData.facebook || companyData.instagram) && (
                <HStack spacing={3}>
                  {companyData.facebook && (
                    <Link href={companyData.facebook} isExternal>
                      <HStack spacing={1}>
                        <Icon
                          as={FaFacebook}
                          color="green.500"
                          boxSize={5}
                          _hover={{ color: 'green.600' }}
                        />
                        <Text
                          fontSize="xs"
                          color="green.500"
                          display={{ base: 'none', md: 'block' }}
                        >
                          Facebook
                        </Text>
                      </HStack>
                    </Link>
                  )}
                  {companyData.instagram && (
                    <Link href={companyData.instagram} isExternal>
                      <HStack spacing={1}>
                        <Icon
                          as={FaInstagram}
                          color="pink.500"
                          boxSize={5}
                          _hover={{ color: 'pink.600' }}
                        />
                        <Text
                          fontSize="xs"
                          color="pink.500"
                          display={{ base: 'none', md: 'block' }}
                        >
                          Instagram
                        </Text>
                      </HStack>
                    </Link>
                  )}
                </HStack>
              )}
            </Stack>
          </VStack>
        </Box>
      )}

      {/* Establishment Information */}
      {establishmentData && (
        <Box
          bg={bgColor}
          borderRadius="xl"
          border="1px solid"
          borderColor={useColorModeValue('gray.200', 'gray.600')}
          p={{ base: 4, smd: 6 }}
        >
          <VStack spacing={4} align="stretch">
            <Flex justify="space-between" align="flex-start" gap={3}>
              <HStack spacing={3} flex="1" minW={0} align="start">
                <Flex
                  w={10}
                  h={10}
                  borderRadius="lg"
                  bg="green.50"
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  <Icon as={FaMapMarkerAlt} color="green.500" boxSize={5} />
                </Flex>
                <VStack align="start" spacing={0} flex={1} minW={0}>
                  <Text
                    fontWeight="bold"
                    fontSize={{ base: 'md', smd: 'lg', lg: 'xl' }}
                    color={textColor}
                    noOfLines={2}
                  >
                    {establishmentData.name || 'Farm Name'}
                  </Text>
                  <Text fontSize="xs" color={mutedColor} noOfLines={1}>
                    {establishmentData.location || 'Farm Location'}
                  </Text>
                </VStack>
              </HStack>

              <Button
                size="sm"
                variant="outline"
                colorScheme="green"
                leftIcon={<FaInfoCircle />}
                onClick={onEstablishmentModalOpen}
                borderRadius="full"
                fontSize="xs"
                flexShrink={0}
              >
                More Info
              </Button>
            </Flex>

            <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
              {establishmentData.type && (
                <VStack align="start" spacing={1}>
                  <Text fontSize="xs" color={mutedColor} fontWeight="semibold">
                    TYPE
                  </Text>
                  <Badge colorScheme="green" borderRadius="full" px={3}>
                    {establishmentData.type}
                  </Badge>
                </VStack>
              )}

              {establishmentData.size && (
                <VStack align="start" spacing={1}>
                  <Text fontSize="xs" color={mutedColor} fontWeight="semibold">
                    SIZE
                  </Text>
                  <Text fontSize="sm" color={textColor}>
                    {establishmentData.size}
                  </Text>
                </VStack>
              )}

              {establishmentData.establishedYear && (
                <VStack align="start" spacing={1}>
                  <Text fontSize="xs" color={mutedColor} fontWeight="semibold">
                    ESTABLISHED
                  </Text>
                  <Text fontSize="sm" color={textColor}>
                    {establishmentData.establishedYear}
                  </Text>
                </VStack>
              )}
            </Stack>

            {/* Certifications displayed in Transparency Achievement section via CertificationBadge */}

            {/* Operational Details Summary - Updated: removed climate_zone, soil_types → soil_health_practices */}
            {((establishmentData.water_sources && establishmentData.water_sources.length > 0) ||
              (establishmentData.soil_health_practices &&
                establishmentData.soil_health_practices.length > 0) ||
              (establishmentData.soil_types && establishmentData.soil_types.length > 0) ||
              (establishmentData.irrigation_methods &&
                establishmentData.irrigation_methods.length > 0)) && (
              <>
                <Divider />
                <VStack align="start" spacing={3}>
                  <HStack spacing={2}>
                    <Icon as={FaTractor} color="green.500" boxSize={4} />
                    <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                      Operations & Practices
                    </Text>
                  </HStack>
                  <Stack direction={{ base: 'column', md: 'row' }} spacing={4} flexWrap="wrap">
                    {(() => {
                      // Parse water sources
                      const waterSources = Array.isArray(establishmentData.water_sources)
                        ? establishmentData.water_sources
                        : typeof establishmentData.water_sources === 'string'
                        ? (() => {
                            try {
                              return JSON.parse(establishmentData.water_sources);
                            } catch {
                              return [];
                            }
                          })()
                        : [];

                      if (waterSources.length > 0) {
                        return (
                          <VStack align="start" spacing={1}>
                            <Text fontSize="xs" color={mutedColor} fontWeight="semibold">
                              WATER ({waterSources.length})
                            </Text>
                            <Text fontSize="xs" color={textColor} noOfLines={1}>
                              {waterSources.slice(0, 2).join(', ')}
                              {waterSources.length > 2 && '...'}
                            </Text>
                          </VStack>
                        );
                      }
                      return null;
                    })()}

                    {(() => {
                      // Parse soil health practices - try new field first, fall back to old soil_types
                      let soilHealthPractices: string[] = [];

                      // Try new soil_health_practices field first
                      if (establishmentData.soil_health_practices) {
                        soilHealthPractices = Array.isArray(establishmentData.soil_health_practices)
                          ? establishmentData.soil_health_practices
                          : typeof establishmentData.soil_health_practices === 'string'
                          ? (() => {
                              try {
                                const parsed = JSON.parse(
                                  establishmentData.soil_health_practices as string
                                );
                                return parsed.length > 0 ? parsed : [];
                              } catch {
                                return [];
                              }
                            })()
                          : [];
                      }

                      // Fall back to old soil_types field for backward compatibility
                      if (soilHealthPractices.length === 0 && establishmentData.soil_types) {
                        soilHealthPractices = Array.isArray(establishmentData.soil_types)
                          ? establishmentData.soil_types
                          : typeof establishmentData.soil_types === 'string'
                          ? (() => {
                              try {
                                return JSON.parse(establishmentData.soil_types as string);
                              } catch {
                                return [];
                              }
                            })()
                          : [];
                      }

                      if (soilHealthPractices.length > 0) {
                        return (
                          <VStack align="start" spacing={1}>
                            <Text fontSize="xs" color={mutedColor} fontWeight="semibold">
                              SOIL HEALTH ({soilHealthPractices.length})
                            </Text>
                            <Text fontSize="xs" color={textColor} noOfLines={1}>
                              {soilHealthPractices.slice(0, 2).join(', ')}
                              {soilHealthPractices.length > 2 && '...'}
                            </Text>
                          </VStack>
                        );
                      }
                      return null;
                    })()}

                    {(() => {
                      // Parse irrigation methods
                      const irrigationMethods = Array.isArray(establishmentData.irrigation_methods)
                        ? establishmentData.irrigation_methods
                        : typeof establishmentData.irrigation_methods === 'string'
                        ? (() => {
                            try {
                              return JSON.parse(establishmentData.irrigation_methods);
                            } catch {
                              return [];
                            }
                          })()
                        : [];

                      if (irrigationMethods.length > 0) {
                        return (
                          <VStack align="start" spacing={1}>
                            <Text fontSize="xs" color={mutedColor} fontWeight="semibold">
                              IRRIGATION ({irrigationMethods.length})
                            </Text>
                            <Text fontSize="xs" color={textColor} noOfLines={1}>
                              {irrigationMethods.slice(0, 2).join(', ')}
                              {irrigationMethods.length > 2 && '...'}
                            </Text>
                          </VStack>
                        );
                      }
                      return null;
                    })()}
                  </Stack>
                </VStack>
              </>
            )}
          </VStack>
        </Box>
      )}

      {/* Company Detail Modal */}
      {companyData && (
        <CompanyModal
          isOpen={isCompanyModalOpen}
          onClose={onCompanyModalClose}
          companyData={{
            id: companyData.id || '1',
            name: companyData.name || 'Company Name',
            tradename: companyData.tradename,
            description: companyData.description,
            address: companyData.address,
            city: companyData.city,
            state: companyData.state,
            country: companyData.country,
            phone: companyData.phone,
            email: companyData.email,
            website: companyData.website,
            facebook: companyData.facebook,
            instagram: companyData.instagram,
            logo: companyData.logo,
            fiscal_id: companyData.fiscal_id,
            contact_email: companyData.contact_email,
            established_year: companyData.established_year,
            employee_count: companyData.employee_count,
            total_establishments: companyData.total_establishments,
            total_parcels: companyData.total_parcels,
            certifications: Array.isArray(companyData.certifications)
              ? companyData.certifications.map((cert: any) =>
                  typeof cert === 'object' && cert !== null
                    ? cert.display_name || cert.name || 'Certification'
                    : cert
                )
              : typeof companyData.certifications === 'string'
              ? companyData.certifications
                  .split(',')
                  .map((cert: string) => cert.trim())
                  .filter((cert: string) => cert)
              : undefined,
            subscription_plan: companyData.subscription_plan
          }}
        />
      )}

      {/* Establishment Detail Modal */}
      {establishmentData && (
        <FarmModal
          isOpen={isEstablishmentModalOpen}
          onClose={onEstablishmentModalClose}
          establishmentData={{
            id: establishmentData.id || '1',
            name: establishmentData.name || 'Farm Name',
            description: establishmentData.description,
            address: establishmentData.address,
            city: establishmentData.city,
            state: establishmentData.state,
            country: establishmentData.country,
            zone: establishmentData.zone,
            latitude: establishmentData.latitude,
            longitude: establishmentData.longitude,
            contact_person: establishmentData.contact_person,
            contact_phone: establishmentData.contact_phone,
            contact_email: establishmentData.contact_email,
            email: establishmentData.email,
            phone: establishmentData.phone,
            zip_code: establishmentData.zip_code,
            facebook: establishmentData.facebook,
            instagram: establishmentData.instagram,
            certifications:
              typeof establishmentData.certifications === 'string'
                ? establishmentData.certifications
                : Array.isArray(establishmentData.certifications)
                ? establishmentData.certifications
                    .map((cert: any) =>
                      typeof cert === 'object' && cert !== null
                        ? cert.display_name || cert.name || 'Certification'
                        : cert
                    )
                    .join(', ')
                : undefined,
            about: establishmentData.about,
            main_activities: establishmentData.main_activities,
            location_highlights: establishmentData.location_highlights,
            custom_message: establishmentData.custom_message,
            is_active: establishmentData.is_active,
            crops_grown: establishmentData.crops_grown,
            sustainability_practices: establishmentData.sustainability_practices,
            employee_count: establishmentData.employee_count,
            total_acreage: establishmentData.total_acreage,
            year_established:
              establishmentData.year_established || establishmentData.establishedYear,
            establishment_type: establishmentData.establishment_type || establishmentData.type,
            farming_method: establishmentData.farming_method,
            images: establishmentData.images,
            parcels: establishmentData.parcels,
            // Operational fields - handle both array and string formats
            // climate_zone removed (not consumer-relevant)
            water_sources: (() => {
              if (Array.isArray(establishmentData.water_sources)) {
                return establishmentData.water_sources;
              }
              if (typeof establishmentData.water_sources === 'string') {
                try {
                  return JSON.parse(establishmentData.water_sources);
                } catch {
                  return [];
                }
              }
              return [];
            })(),
            // soil_health_practices - try new field first, fall back to old soil_types
            soil_health_practices: (() => {
              // Try new field first
              if (establishmentData.soil_health_practices) {
                if (Array.isArray(establishmentData.soil_health_practices)) {
                  return establishmentData.soil_health_practices;
                }
                if (typeof establishmentData.soil_health_practices === 'string') {
                  try {
                    const parsed = JSON.parse(establishmentData.soil_health_practices);
                    if (parsed.length > 0) return parsed;
                  } catch {}
                }
              }
              // Fall back to old soil_types field
              if (Array.isArray(establishmentData.soil_types)) {
                return establishmentData.soil_types;
              }
              if (typeof establishmentData.soil_types === 'string') {
                try {
                  return JSON.parse(establishmentData.soil_types);
                } catch {
                  return [];
                }
              }
              return [];
            })(),
            // conservation_practices merged into sustainability_practices - pass empty
            irrigation_methods: (() => {
              if (Array.isArray(establishmentData.irrigation_methods)) {
                return establishmentData.irrigation_methods;
              }
              if (typeof establishmentData.irrigation_methods === 'string') {
                try {
                  return JSON.parse(establishmentData.irrigation_methods);
                } catch {
                  return [];
                }
              }
              return [];
            })()
          }}
        />
      )}

      {/* Parcel Information with Map */}
      {parcelData && <ParcelMapInfo parcelData={parcelData} />}
    </VStack>
  );
};
