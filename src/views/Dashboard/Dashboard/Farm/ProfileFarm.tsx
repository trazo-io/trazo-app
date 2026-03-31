import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  SimpleGrid,
  Icon,
  Badge,
  Link,
  useToast,
  Center
} from '@chakra-ui/react';
import {
  FaBuilding,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaFacebook,
  FaInstagram,
  FaUsers,
  FaLeaf,
  FaEdit,
  FaTractor,
  FaCalendar,
  FaCertificate,
  FaSeedling,
  FaTint,
  FaShare
} from 'react-icons/fa';
// MdEco removed - climate_zone display removed for transparency-first approach
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useUserRole } from 'hooks/useUserRole';
import { useIntl } from 'react-intl';
import { StandardCard, StandardButton, StandardPage, StandardPageLoading } from 'components/Design/StandardComponents';
import { useGetFarmQuery } from 'store/api/companyApi';
import { StandardImageGallery } from 'components/ImageGallery';
import CertificationManager from 'components/Certifications/CertificationManager';

// Type definitions
interface RootState {
  company: {
    currentCompany: {
      id: string;
      name: string;
    };
  };
}

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value?: string | number | null;
  type?: 'text' | 'link' | 'email' | 'phone';
}

// InfoRow component - matching CompanyInfoTab pattern exactly
const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value, type = 'text' }) => {
  if (!value) return null;

  const renderValue = () => {
    switch (type) {
      case 'link':
        return (
          <Link href={value as string} isExternal color="green.600" fontWeight="medium" fontSize={{ base: 'sm', md: 'md' }}>
            {value}
          </Link>
        );
      case 'email':
        return (
          <Link href={`mailto:${value}`} color="green.600" fontWeight="medium" fontSize={{ base: 'sm', md: 'md' }}>
            {value}
          </Link>
        );
      case 'phone':
        return (
          <Link href={`tel:${value}`} color="green.600" fontWeight="medium" fontSize={{ base: 'sm', md: 'md' }}>
            {value}
          </Link>
        );
      default:
        return (
          <Text fontWeight="medium" color="gray.800" fontSize={{ base: 'sm', md: 'md' }}>
            {value}
          </Text>
        );
    }
  };

  return (
    <HStack spacing={2} align="flex-start">
      <Icon as={icon} color="green.500" boxSize={{ base: 3.5, md: 4 }} mt={1} flexShrink={0} />
      <Box>
        <Text fontSize="xs" color="gray.500" textTransform="uppercase" fontWeight="semibold" letterSpacing="0.05em">
          {label}
        </Text>
        {renderValue()}
      </Box>
    </HStack>
  );
};

// Utility function to format snake_case values to Title Case
const formatDisplayValue = (value: string | undefined | null): string => {
  if (!value) return '';
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

function ProfileFarm() {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();
  const { canWrite } = useUserRole();
  const { farmId } = useParams();

  const currentCompany = useSelector((state: RootState) => state.company.currentCompany);

  const {
    data: establishmentData,
    error,
    isLoading,
    isUninitialized
  } = useGetFarmQuery(
    {
      companyId: currentCompany?.id,
      farmId
    },
    {
      skip: !farmId || currentCompany?.id === undefined
    }
  );

  // Helper functions
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

  const getCropsGrown = () => {
    if (!establishmentData?.crops_grown) return [];
    if (Array.isArray(establishmentData.crops_grown)) {
      return establishmentData.crops_grown;
    }
    return [];
  };

  const getSustainabilityPractices = () => {
    if (!establishmentData?.sustainability_practices) return [];
    if (Array.isArray(establishmentData.sustainability_practices)) {
      return establishmentData.sustainability_practices;
    }
    return [];
  };

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

  // Updated: getSoilHealthPractices replaces getSoilTypes for transparency-first approach
  // Includes backward compatibility with old soil_types field
  const getSoilHealthPractices = () => {
    // Try new field first
    if (establishmentData?.soil_health_practices) {
      if (Array.isArray(establishmentData.soil_health_practices)) {
        return establishmentData.soil_health_practices;
      }
      try {
        const parsed = JSON.parse(establishmentData.soil_health_practices);
        if (parsed.length > 0) return parsed;
      } catch {}
    }
    // Fall back to old soil_types field for backward compatibility
    if (establishmentData?.soil_types) {
      if (Array.isArray(establishmentData.soil_types)) {
        return establishmentData.soil_types;
      }
      try {
        return JSON.parse(establishmentData.soil_types);
      } catch {
        return [];
      }
    }
    return [];
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

  const formatAddress = () => {
    const parts = [
      establishmentData?.address,
      establishmentData?.city,
      establishmentData?.state,
      establishmentData?.country
    ].filter(Boolean);
    return parts.join(', ');
  };

  const formatCoordinates = () => {
    if (
      typeof establishmentData?.latitude === 'number' &&
      typeof establishmentData?.longitude === 'number' &&
      !isNaN(establishmentData.latitude) &&
      !isNaN(establishmentData.longitude)
    ) {
      return `${establishmentData.latitude.toFixed(6)}, ${establishmentData.longitude.toFixed(6)}`;
    }
    return null;
  };

  // Handle sharing
  const handleShare = async () => {
    try {
      const baseUrl = window.location.hostname.includes('localhost')
        ? 'http://localhost:3000'
        : `https://consumer.${import.meta.env.VITE_APP_BASE_DOMAIN}`;

      const publicProfileUrl = `${baseUrl}/farm/${farmId}`;

      if (navigator.share) {
        await navigator.share({
          title: `${establishmentData?.name} - ${intl.formatMessage({ id: 'establishment.shareTitle' })}`,
          text: `${intl.formatMessage({ id: 'establishment.shareText' })} ${establishmentData?.description || ''}`,
          url: publicProfileUrl
        });
      } else {
        await navigator.clipboard.writeText(publicProfileUrl);
        toast({
          title: intl.formatMessage({ id: 'establishment.linkCopied' }),
          description: intl.formatMessage({ id: 'establishment.linkCopiedDescription' }),
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (isLoading || isUninitialized) {
    return (
      <StandardPage showBackButton onBack={() => navigate('/admin/dashboard')}>
        <StandardPageLoading />
      </StandardPage>
    );
  }

  if (error || !establishmentData) {
    return (
      <StandardPage showBackButton onBack={() => navigate('/admin/dashboard')}>
        <Center py={20}>
          <Text color="red.500">{intl.formatMessage({ id: 'establishment.errorLoading' })}</Text>
        </Center>
      </StandardPage>
    );
  }

  return (
    <StandardPage showBackButton onBack={() => navigate('/admin/dashboard')}>
      <VStack spacing={{ base: 4, md: 8 }} w="100%">
        {/* Identity Section */}
        <StandardCard
          title={intl.formatMessage({ id: 'app.establishmentInformation' })}
          variant="elevated"
          padding={{ base: 3, md: 4 }}
          headerAction={
            <HStack spacing={1}>
              <StandardButton
                variant="ghost"
                size="sm"
                leftIcon={<Icon as={FaShare} />}
                onClick={handleShare}
              >
                {intl.formatMessage({ id: 'app.share' })}
              </StandardButton>
              {canWrite && (
                <StandardButton
                  variant="outline"
                  size="sm"
                  leftIcon={<Icon as={FaEdit} />}
                  onClick={() => navigate(`/admin/dashboard/farm/${farmId}/change`)}
                >
                  {intl.formatMessage({ id: 'app.edit' })}
                </StandardButton>
              )}
            </HStack>
          }
        >
          {/* Mobile: vertical centered layout, Desktop: horizontal */}
          <VStack spacing={3} align="center" display={{ base: 'flex', md: 'none' }}>
            <Avatar
              size="xl"
              src={establishmentData.images?.[0]?.url || establishmentData.images?.[0]}
              name={establishmentData.name}
              bg="green.500"
              color="white"
              icon={<Icon as={FaBuilding} boxSize={8} />}
            />
            <VStack align="center" spacing={1}>
              <Text fontSize="lg" fontWeight="bold" color="gray.800" textAlign="center">
                {establishmentData.name}
              </Text>
              {establishmentData.company?.name && (
                <Text fontSize="sm" color="gray.500">
                  {establishmentData.company.name}
                </Text>
              )}
              {establishmentData.description && (
                <Text color="gray.600" fontSize="xs" lineHeight="1.6" textAlign="center">
                  {establishmentData.description}
                </Text>
              )}
              <HStack spacing={2} flexWrap="wrap" justify="center">
                {establishmentData.is_active !== false && (
                  <Badge colorScheme="green" variant="subtle" px={2} py={0.5} borderRadius="full" fontSize="xs">
                    {intl.formatMessage({ id: 'app.active' })}
                  </Badge>
                )}
                {(establishmentData.establishment_type || establishmentData.type) && (
                  <Badge colorScheme="blue" variant="subtle" px={2} py={0.5} borderRadius="full" fontSize="xs">
                    {formatDisplayValue(
                      establishmentData.establishment_type || establishmentData.type
                    )}
                  </Badge>
                )}
                {establishmentData.farming_method && (
                  <Badge colorScheme="purple" variant="subtle" px={2} py={0.5} borderRadius="full" fontSize="xs">
                    {formatDisplayValue(establishmentData.farming_method)}
                  </Badge>
                )}
              </HStack>
            </VStack>
          </VStack>
          {/* Desktop: horizontal layout */}
          <HStack spacing={6} align="flex-start" display={{ base: 'none', md: 'flex' }}>
            <Avatar
              size="2xl"
              src={establishmentData.images?.[0]?.url || establishmentData.images?.[0]}
              name={establishmentData.name}
              bg="green.500"
              color="white"
              icon={<Icon as={FaBuilding} boxSize={10} />}
            />
            <VStack align="start" spacing={3} flex={1}>
              <Box>
                <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                  {establishmentData.name}
                </Text>
                {establishmentData.company?.name && (
                  <Text fontSize="md" color="gray.500">
                    {establishmentData.company.name}
                  </Text>
                )}
              </Box>
              {establishmentData.description && (
                <Text color="gray.600" fontSize="sm" lineHeight="1.6">
                  {establishmentData.description}
                </Text>
              )}
              <HStack spacing={2} flexWrap="wrap">
                {establishmentData.is_active !== false && (
                  <Badge colorScheme="green" variant="subtle" px={2} py={0.5} borderRadius="full" fontSize="sm">
                    {intl.formatMessage({ id: 'app.active' })}
                  </Badge>
                )}
                {(establishmentData.establishment_type || establishmentData.type) && (
                  <Badge colorScheme="blue" variant="subtle" px={2} py={0.5} borderRadius="full" fontSize="sm">
                    {formatDisplayValue(
                      establishmentData.establishment_type || establishmentData.type
                    )}
                  </Badge>
                )}
                {establishmentData.farming_method && (
                  <Badge colorScheme="purple" variant="subtle" px={2} py={0.5} borderRadius="full" fontSize="sm">
                    {formatDisplayValue(establishmentData.farming_method)}
                  </Badge>
                )}
              </HStack>
            </VStack>
          </HStack>
        </StandardCard>

        {/* Photo Gallery */}
        {establishmentData.images && establishmentData.images.length > 0 && (
          <StandardCard title={intl.formatMessage({ id: 'establishment.photoGallery' })} variant="elevated" padding={{ base: 3, md: 4 }}>
            <StandardImageGallery
              images={establishmentData.images}
              title={intl.formatMessage({ id: 'establishment.establishmentPhotos' })}
              variant="default"
              enablePreview={true}
              showImageCount={true}
              height={{ base: '200px', md: '280px' }}
              maxDisplayImages={4}
            />
          </StandardCard>
        )}

        {/* Quick Stats - Updated: Removed employee_count (not consumer-relevant) */}
        <StandardCard title={intl.formatMessage({ id: 'establishment.quickStats' })} variant="elevated" padding={{ base: 3, md: 4 }}>
          <SimpleGrid columns={{ base: 2, md: 3 }} spacing={{ base: 3, md: 6 }}>
            <VStack spacing={0.5} align="center" p={{ base: 3, md: 4 }} bg="green.50" borderRadius="lg">
              <Icon as={FaTractor} color="green.500" boxSize={{ base: 5, md: 6 }} />
              <Text fontSize={{ base: 'lg', md: '2xl' }} fontWeight="bold" color="gray.800">
                {establishmentData.total_acreage || 0}
              </Text>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                {intl.formatMessage({ id: 'app.acres' })}
              </Text>
            </VStack>
            <VStack spacing={0.5} align="center" p={{ base: 3, md: 4 }} bg="purple.50" borderRadius="lg">
              <Icon as={FaCalendar} color="purple.500" boxSize={{ base: 5, md: 6 }} />
              <Text fontSize={{ base: 'lg', md: '2xl' }} fontWeight="bold" color="gray.800">
                {establishmentData.year_established || '--'}
              </Text>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                {intl.formatMessage({ id: 'establishment.founded' })}
              </Text>
            </VStack>
            <VStack spacing={0.5} align="center" p={{ base: 3, md: 4 }} bg="orange.50" borderRadius="lg">
              <Icon as={FaSeedling} color="orange.500" boxSize={{ base: 5, md: 6 }} />
              <Text fontSize={{ base: 'lg', md: '2xl' }} fontWeight="bold" color="gray.800">
                {getCropsGrown().length}
              </Text>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                {intl.formatMessage({ id: 'establishment.crops' })}
              </Text>
            </VStack>
          </SimpleGrid>
        </StandardCard>

        {/* Contact Information */}
        <StandardCard title={intl.formatMessage({ id: 'app.contactInformation' })} variant="elevated" padding={{ base: 3, md: 4 }}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 6 }}>
            <InfoRow
              icon={FaEnvelope}
              label={intl.formatMessage({ id: 'establishment.emailAddress' })}
              value={establishmentData.email || establishmentData.contact_email}
              type="email"
            />
            <InfoRow
              icon={FaPhone}
              label={intl.formatMessage({ id: 'app.phone' })}
              value={establishmentData.phone || establishmentData.contact_phone}
              type="phone"
            />
            <InfoRow
              icon={FaUsers}
              label={intl.formatMessage({ id: 'establishment.contactPerson' })}
              value={establishmentData.contact_person}
            />
            <InfoRow
              icon={FaGlobe}
              label={intl.formatMessage({ id: 'app.website' })}
              value={establishmentData.company?.website}
              type="link"
            />
          </SimpleGrid>
        </StandardCard>

        {/* Location Details */}
        <StandardCard title={intl.formatMessage({ id: 'app.location' })} variant="elevated" padding={{ base: 3, md: 4 }}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 6 }}>
            <InfoRow icon={FaMapMarkerAlt} label={intl.formatMessage({ id: 'app.address' })} value={formatAddress()} />
            <InfoRow
              icon={FaMapMarkerAlt}
              label={intl.formatMessage({ id: 'establishment.zipCode' })}
              value={establishmentData.zip_code}
            />
            <InfoRow icon={FaMapMarkerAlt} label={intl.formatMessage({ id: 'app.zone' })} value={establishmentData.zone} />
            <InfoRow icon={FaMapMarkerAlt} label={intl.formatMessage({ id: 'app.coordinates' })} value={formatCoordinates()} />
          </SimpleGrid>
        </StandardCard>

        {/* Operations - Updated: Removed employee_count (not consumer-relevant) */}
        <StandardCard title={intl.formatMessage({ id: 'establishment.operations' })} variant="elevated" padding={{ base: 3, md: 4 }}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 6 }}>
            <InfoRow
              icon={FaTractor}
              label={intl.formatMessage({ id: 'establishment.farmingMethod' })}
              value={establishmentData.farming_method}
            />
            <InfoRow
              icon={FaTractor}
              label={intl.formatMessage({ id: 'establishment.totalArea' })}
              value={
                establishmentData.total_acreage ? `${establishmentData.total_acreage} acres` : null
              }
            />
            <InfoRow
              icon={FaCalendar}
              label={intl.formatMessage({ id: 'establishment.yearEstablished' })}
              value={establishmentData.year_established}
            />
          </SimpleGrid>
        </StandardCard>

        {/* Agricultural Information - Updated: Removed climate_zone, updated soil types to soil health practices */}
        {(getWaterSources().length > 0 ||
          getSoilHealthPractices().length > 0 ||
          getIrrigationMethods().length > 0) && (
          <StandardCard title={intl.formatMessage({ id: 'app.agriculturalInformation' })} variant="elevated" padding={{ base: 3, md: 4 }}>
            <VStack spacing={6} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                {getWaterSources().length > 0 && (
                  <InfoRow
                    icon={FaTint}
                    label={intl.formatMessage({ id: 'establishment.waterSources' })}
                    value={getWaterSources().join(', ')}
                  />
                )}
                {getSoilHealthPractices().length > 0 && (
                  <InfoRow
                    icon={FaLeaf}
                    label={intl.formatMessage({ id: 'establishment.soilHealthPractices' })}
                    value={getSoilHealthPractices().join(', ')}
                  />
                )}
                {getIrrigationMethods().length > 0 && (
                  <InfoRow
                    icon={FaTint}
                    label={intl.formatMessage({ id: 'establishment.irrigationMethods' })}
                    value={getIrrigationMethods().join(', ')}
                  />
                )}
              </SimpleGrid>
            </VStack>
          </StandardCard>
        )}

        {/* Crops Grown */}
        {getCropsGrown().length > 0 && (
          <StandardCard title={intl.formatMessage({ id: 'establishment.crops' })} variant="elevated" padding={{ base: 3, md: 4 }}>
            <HStack spacing={2} flexWrap="wrap">
              {getCropsGrown().map((crop: string, index: number) => (
                <Badge
                  key={index}
                  colorScheme="green"
                  variant="subtle"
                  px={{ base: 2, md: 3 }}
                  py={0.5}
                  borderRadius="full"
                  fontSize={{ base: 'xs', md: 'sm' }}
                >
                  {crop}
                </Badge>
              ))}
            </HStack>
          </StandardCard>
        )}

        {/* Verified Certifications — Structured data with USDA verification */}
        <StandardCard title={intl.formatMessage({ id: 'certification.manage.title' })} variant="elevated" padding={{ base: 3, md: 4 }}>
          <CertificationManager
            companyId={currentCompany?.id}
            farmId={farmId}
          />
        </StandardCard>

        {/* Sustainability Practices */}
        {getSustainabilityPractices().length > 0 && (
          <StandardCard title={intl.formatMessage({ id: 'establishment.sustainabilityPractices' })} variant="elevated" padding={{ base: 3, md: 4 }}>
            <HStack spacing={2} flexWrap="wrap">
              {getSustainabilityPractices().map((practice: string, index: number) => (
                <Badge
                  key={index}
                  colorScheme="green"
                  variant="subtle"
                  px={{ base: 2, md: 3 }}
                  py={0.5}
                  borderRadius="full"
                  fontSize={{ base: 'xs', md: 'sm' }}
                >
                  <HStack spacing={1}>
                    <Icon as={FaLeaf} boxSize={3} />
                    <Text>{practice}</Text>
                  </HStack>
                </Badge>
              ))}
            </HStack>
          </StandardCard>
        )}

        {/* Social Media */}
        {(establishmentData.company?.facebook || establishmentData.company?.instagram) && (
          <StandardCard title={intl.formatMessage({ id: 'establishment.socialMedia' })} variant="elevated" padding={{ base: 3, md: 4 }}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              {establishmentData.company?.facebook && (
                <InfoRow
                  icon={FaFacebook}
                  label="Facebook"
                  value={establishmentData.company.facebook}
                  type="link"
                />
              )}
              {establishmentData.company?.instagram && (
                <InfoRow
                  icon={FaInstagram}
                  label="Instagram"
                  value={establishmentData.company.instagram}
                  type="link"
                />
              )}
            </SimpleGrid>
          </StandardCard>
        )}

        {/* About Section */}
        {(establishmentData.about ||
          establishmentData.main_activities ||
          establishmentData.location_highlights) && (
          <StandardCard title={intl.formatMessage({ id: 'establishment.aboutEstablishment' })} variant="elevated" padding={{ base: 3, md: 4 }}>
            <VStack spacing={{ base: 3, md: 4 }} align="stretch">
              {establishmentData.about && (
                <Box>
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    textTransform="uppercase"
                    fontWeight="semibold"
                    mb={1}
                  >
                    {intl.formatMessage({ id: 'app.description' })}
                  </Text>
                  <Text color="gray.700" lineHeight="1.7" fontSize={{ base: 'sm', md: 'md' }}>
                    {establishmentData.about}
                  </Text>
                </Box>
              )}
              {establishmentData.main_activities && (
                <Box>
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    textTransform="uppercase"
                    fontWeight="semibold"
                    mb={1}
                  >
                    {intl.formatMessage({ id: 'establishment.mainActivities' })}
                  </Text>
                  <Text color="gray.700" lineHeight="1.7" fontSize={{ base: 'sm', md: 'md' }}>
                    {establishmentData.main_activities}
                  </Text>
                </Box>
              )}
              {establishmentData.location_highlights && (
                <Box>
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    textTransform="uppercase"
                    fontWeight="semibold"
                    mb={1}
                  >
                    {intl.formatMessage({ id: 'establishment.locationHighlights' })}
                  </Text>
                  <Text color="gray.700" lineHeight="1.7" fontSize={{ base: 'sm', md: 'md' }}>
                    {establishmentData.location_highlights}
                  </Text>
                </Box>
              )}
            </VStack>
          </StandardCard>
        )}

      </VStack>
    </StandardPage>
  );
}

export default ProfileFarm;
