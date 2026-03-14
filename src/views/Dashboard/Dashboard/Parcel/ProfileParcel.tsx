import React, { useEffect, useState } from 'react';
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
  Wrap,
  WrapItem
} from '@chakra-ui/react';
import {
  FaMapMarkedAlt,
  FaTractor,
  FaEdit,
  FaShare,
  FaSeedling,
  FaCertificate,
  FaPhone,
  FaEnvelope,
  FaUser,
  FaMapMarkerAlt,
  FaBuilding,
  FaLeaf,
  FaTint,
  FaRulerCombined,
  FaHashtag,
  FaGlobeAmericas,
  FaMountain,
  FaEye,
  FaCheckCircle,
  FaChartLine,
  FaUsers
} from 'react-icons/fa';
import { MdEco, MdLocationOn } from 'react-icons/md';
import { useNavigate, useParams } from 'react-router-dom';
import { useUserRole } from 'hooks/useUserRole';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';

import { StandardCard, StandardButton, StandardPage, StandardPageLoading } from 'components/Design/StandardComponents';
import { StandardImageGallery } from 'components/ImageGallery';
import { useGetParcelQuery } from 'store/api/productApi';
import { formatAreaWithBothUnits } from '../../../../utils/areaUnits';

// Type definitions
interface Company {
  id: string;
  name: string;
  establishments?: Establishment[];
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
  [key: string]: string | undefined;
}

interface ParcelData {
  id: string;
  name: string;
  area?: number;
  primary_crop?: string;
  crop_type?: string;
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

// Utility functions
const formatDisplayValue = (value: string | undefined | null): string => {
  if (!value) return '';
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

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
  if (!value) return '';
  return CERTIFICATION_DISPLAY_NAMES[value] || formatDisplayValue(value);
};

// InfoRow component - matches CompanyInfoTab pattern
interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value?: string | number | null;
  type?: 'text' | 'link' | 'email' | 'phone';
}

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
        <Text fontSize="xs" color="gray.500" textTransform="uppercase" fontWeight="semibold">
          {label}
        </Text>
        {renderValue()}
      </Box>
    </HStack>
  );
};

// Stat card for quick stats section
interface StatCardProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
  subLabel?: string;
  colorScheme: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, subLabel, colorScheme }) => (
  <VStack
    spacing={{ base: 0.5, md: 2 }}
    p={{ base: 3, md: 4 }}
    bg={`${colorScheme}.50`}
    borderRadius="xl"
    border="1px solid"
    borderColor={`${colorScheme}.200`}
    align="center"
  >
    <Icon as={icon} boxSize={{ base: 5, md: 6 }} color={`${colorScheme}.500`} />
    <Text fontSize={{ base: 'md', md: 'xl' }} fontWeight="bold" color="gray.800" textAlign="center">
      {value}
    </Text>
    <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" textAlign="center">
      {label}
    </Text>
    {subLabel && (
      <Text fontSize="xs" color="gray.500" textAlign="center">
        {subLabel}
      </Text>
    )}
  </VStack>
);

function ProfileParcel(): React.ReactElement {
  const intl = useIntl();
  const navigate = useNavigate();
  const { canWrite } = useUserRole();
  const { establishmentId, parcelId } = useParams<{ establishmentId: string; parcelId: string }>();
  const [establishment, setEstablishment] = useState<Establishment | null>(null);

  const currentCompany = useSelector((state: RootState) => state.company.currentCompany);
  const establishments = currentCompany?.establishments || [];
  const currentParcel = useSelector((state: RootState) => state.product.currentParcel);

  const { data: parcelData, isLoading: isParcelLoading } = useGetParcelQuery(
    {
      companyId: currentCompany?.id || '',
      establishmentId: establishmentId || '',
      parcelId: parcelId || ''
    },
    {
      skip:
        parcelId === undefined ||
        currentParcel?.id === parcelId ||
        currentCompany?.id === undefined ||
        !establishmentId
    }
  );

  useEffect(() => {
    if (establishments && establishments.length > 0 && establishmentId) {
      const foundEstablishment = establishments.find(
        (est: Establishment) => est.id.toString() === establishmentId
      );
      if (foundEstablishment) {
        setEstablishment(foundEstablishment);
      }
    }
  }, [establishmentId, establishments]);

  const handleShare = async (): Promise<void> => {
    try {
      if (navigator.share && parcelData?.name) {
        await navigator.share({
          title: `${parcelData.name} - ${intl.formatMessage({ id: 'parcel.shareTitle' })}`,
          text: `${intl.formatMessage({ id: 'parcel.shareText' })} #Trazo`,
          url: window.location.href
        });
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  if (isParcelLoading) {
    return (
      <StandardPage
        showBackButton
        onBack={() => navigate(`/admin/dashboard/establishment/${establishmentId}`)}
      >
        <StandardPageLoading />
      </StandardPage>
    );
  }

  // Format location string
  const formatLocation = () => {
    const parts = [
      parcelData?.address,
      establishment?.city,
      establishment?.state,
      establishment?.country
    ].filter(Boolean);
    return parts.join(', ');
  };

  // Check if agricultural details exist
  const hasAgriculturalDetails =
    parcelData?.agricultural_details &&
    Object.values(parcelData.agricultural_details).some(
      (v) => v !== undefined && v !== null && v !== ''
    );

  // Check for soil data
  const hasSoilData =
    parcelData?.agricultural_details &&
    (parcelData.agricultural_details.soil_ph ||
      parcelData.agricultural_details.soil_organic_matter ||
      parcelData.agricultural_details.soil_nitrogen ||
      parcelData.agricultural_details.soil_phosphorus);

  // Check for water management data
  const hasWaterData =
    parcelData?.agricultural_details &&
    (parcelData.agricultural_details.irrigation_efficiency ||
      parcelData.agricultural_details.water_source_type ||
      parcelData.agricultural_details.water_quality_ph ||
      parcelData.agricultural_details.water_allocation_acre_feet);

  // Check for conservation practices
  const hasConservationData =
    parcelData?.agricultural_details &&
    (parcelData.agricultural_details.cover_crop_management ||
      parcelData.agricultural_details.crop_rotation_pattern ||
      parcelData.agricultural_details.pest_management_strategy ||
      parcelData.agricultural_details.fertilization_program);

  return (
    <StandardPage
      showBackButton
      onBack={() => navigate(`/admin/dashboard/establishment/${establishmentId}`)}
    >
      <VStack spacing={{ base: 4, md: 8 }} w="100%">
        {/* Identity Section */}
        <StandardCard
          title={intl.formatMessage({ id: 'app.parcel' })}
          variant="elevated"
          padding={{ base: 3, md: 4 }}
          headerAction={
            <HStack spacing={1}>
              <StandardButton
                variant="outline"
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
                  onClick={() =>
                    navigate(
                      `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/change`
                    )
                  }
                >
                  {intl.formatMessage({ id: 'app.edit' })}
                </StandardButton>
              )}
            </HStack>
          }
        >
          {/* Mobile: vertical centered layout */}
          <VStack spacing={3} align="center" display={{ base: 'flex', md: 'none' }}>
            <Avatar
              size="xl"
              src={parcelData?.images?.[0]?.url}
              name={parcelData?.name}
              bg="green.500"
              color="white"
              icon={<Icon as={FaMapMarkedAlt} boxSize={8} />}
            />
            <VStack align="center" spacing={1}>
              <Text fontSize="lg" fontWeight="bold" color="gray.800" textAlign="center">
                {parcelData?.name}
              </Text>
              {parcelData?.unique_code && (
                <Text fontSize="sm" color="gray.500">
                  {intl.formatMessage({ id: 'parcel.code' })}: {parcelData.unique_code}
                </Text>
              )}
              {parcelData?.description && (
                <Text color="gray.600" fontSize="xs" lineHeight="1.6" textAlign="center">
                  {parcelData.description}
                </Text>
              )}
              <Wrap spacing={2} justify="center">
                <WrapItem>
                  <Badge colorScheme="green" variant="subtle" px={2} py={0.5} borderRadius="full" fontSize="xs">
                    {intl.formatMessage({ id: 'app.active' })}
                  </Badge>
                </WrapItem>
                {parcelData?.certified && (
                  <WrapItem>
                    <Badge colorScheme="blue" variant="subtle" px={2} py={0.5} borderRadius="full" fontSize="xs">
                      <HStack spacing={1}>
                        <Icon as={FaCertificate} boxSize={3} />
                        <Text>{intl.formatMessage({ id: 'app.certified' })}</Text>
                      </HStack>
                    </Badge>
                  </WrapItem>
                )}
                {parcelData?.carbon_calculation_enabled && (
                  <WrapItem>
                    <Badge colorScheme="purple" variant="subtle" px={2} py={0.5} borderRadius="full" fontSize="xs">
                      <HStack spacing={1}>
                        <Icon as={FaLeaf} boxSize={3} />
                        <Text>{intl.formatMessage({ id: 'parcel.carbonTracking' })}</Text>
                      </HStack>
                    </Badge>
                  </WrapItem>
                )}
                {parcelData?.usda_compliance_eligible && (
                  <WrapItem>
                    <Badge colorScheme="orange" variant="subtle" px={2} py={0.5} borderRadius="full" fontSize="xs">
                      <HStack spacing={1}>
                        <Icon as={FaCheckCircle} boxSize={3} />
                        <Text>{intl.formatMessage({ id: 'parcel.usdaCompliant' })}</Text>
                      </HStack>
                    </Badge>
                  </WrapItem>
                )}
                {parcelData?.transparency_ready && (
                  <WrapItem>
                    <Badge colorScheme="cyan" variant="subtle" px={2} py={0.5} borderRadius="full" fontSize="xs">
                      <HStack spacing={1}>
                        <Icon as={FaEye} boxSize={3} />
                        <Text>{intl.formatMessage({ id: 'parcel.consumerReady' })}</Text>
                      </HStack>
                    </Badge>
                  </WrapItem>
                )}
                {parcelData?.transparency_score && parcelData.transparency_score > 0 && (
                  <WrapItem>
                    <Badge colorScheme="teal" variant="subtle" px={2} py={0.5} borderRadius="full" fontSize="xs">
                      {intl.formatMessage({ id: 'parcel.transparencyScore' }, { score: parcelData.transparency_score })}
                    </Badge>
                  </WrapItem>
                )}
              </Wrap>
            </VStack>
          </VStack>
          {/* Desktop: horizontal layout */}
          <HStack spacing={6} align="flex-start" display={{ base: 'none', md: 'flex' }}>
            <Avatar
              size="2xl"
              src={parcelData?.images?.[0]?.url}
              name={parcelData?.name}
              bg="green.500"
              color="white"
              icon={<Icon as={FaMapMarkedAlt} boxSize={10} />}
            />
            <VStack align="start" spacing={3} flex={1}>
              <Box>
                <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                  {parcelData?.name}
                </Text>
                {parcelData?.unique_code && (
                  <Text fontSize="md" color="gray.500">
                    {intl.formatMessage({ id: 'parcel.code' })}: {parcelData.unique_code}
                  </Text>
                )}
              </Box>
              {parcelData?.description && (
                <Text color="gray.600" fontSize="sm" lineHeight="1.6">
                  {parcelData.description}
                </Text>
              )}
              <Wrap spacing={2}>
                <WrapItem>
                  <Badge colorScheme="green" variant="subtle" px={2} py={1} borderRadius="full">
                    {intl.formatMessage({ id: 'app.active' })}
                  </Badge>
                </WrapItem>
                {parcelData?.certified && (
                  <WrapItem>
                    <Badge colorScheme="blue" variant="subtle" px={2} py={1} borderRadius="full">
                      <HStack spacing={1}>
                        <Icon as={FaCertificate} boxSize={3} />
                        <Text>{intl.formatMessage({ id: 'app.certified' })}</Text>
                      </HStack>
                    </Badge>
                  </WrapItem>
                )}
                {parcelData?.carbon_calculation_enabled && (
                  <WrapItem>
                    <Badge colorScheme="purple" variant="subtle" px={2} py={1} borderRadius="full">
                      <HStack spacing={1}>
                        <Icon as={FaLeaf} boxSize={3} />
                        <Text>{intl.formatMessage({ id: 'parcel.carbonTracking' })}</Text>
                      </HStack>
                    </Badge>
                  </WrapItem>
                )}
                {parcelData?.usda_compliance_eligible && (
                  <WrapItem>
                    <Badge colorScheme="orange" variant="subtle" px={2} py={1} borderRadius="full">
                      <HStack spacing={1}>
                        <Icon as={FaCheckCircle} boxSize={3} />
                        <Text>{intl.formatMessage({ id: 'parcel.usdaCompliant' })}</Text>
                      </HStack>
                    </Badge>
                  </WrapItem>
                )}
                {parcelData?.transparency_ready && (
                  <WrapItem>
                    <Badge colorScheme="cyan" variant="subtle" px={2} py={1} borderRadius="full">
                      <HStack spacing={1}>
                        <Icon as={FaEye} boxSize={3} />
                        <Text>{intl.formatMessage({ id: 'parcel.consumerReady' })}</Text>
                      </HStack>
                    </Badge>
                  </WrapItem>
                )}
                {parcelData?.transparency_score && parcelData.transparency_score > 0 && (
                  <WrapItem>
                    <Badge colorScheme="teal" variant="subtle" px={2} py={1} borderRadius="full">
                      {intl.formatMessage({ id: 'parcel.transparencyScore' }, { score: parcelData.transparency_score })}
                    </Badge>
                  </WrapItem>
                )}
              </Wrap>
            </VStack>
          </HStack>
        </StandardCard>

        {/* Photo Gallery Section */}
        {parcelData?.images && parcelData.images.length > 0 && (
          <StandardCard title={intl.formatMessage({ id: 'parcel.photoGallery' })} variant="elevated" padding={{ base: 3, md: 4 }}>
            <StandardImageGallery
              images={parcelData.images}
              title=""
              variant="default"
              enablePreview={true}
              showImageCount={true}
              height={{ base: '200px', sm: '250px', md: '280px' }}
              showEmptyState={false}
              maxDisplayImages={4}
            />
          </StandardCard>
        )}

        {/* Quick Stats Section */}
        <StandardCard title={intl.formatMessage({ id: 'parcel.quickStats' })} variant="elevated" padding={{ base: 3, md: 4 }}>
          <SimpleGrid columns={{ base: 2, md: 3 }} spacing={{ base: 3, md: 4 }}>
            <StatCard
              icon={FaTractor}
              value={parcelData?.area ? parcelData.area.toFixed(2) : '--'}
              label={intl.formatMessage({ id: 'app.hectares' })}
              subLabel={
                parcelData?.area ? `(${(parcelData.area * 2.47105).toFixed(1)} ${intl.formatMessage({ id: 'app.acres' })})` : undefined
              }
              colorScheme="green"
            />
            <StatCard
              icon={FaSeedling}
              value={formatDisplayValue(parcelData?.primary_crop || parcelData?.crop_type) || '--'}
              label={intl.formatMessage({ id: 'parcel.primaryCrop' })}
              colorScheme="blue"
            />
            <StatCard
              icon={FaCertificate}
              value={
                parcelData?.certified && parcelData?.certification_type
                  ? formatCertificationType(parcelData.certification_type)
                  : parcelData?.certified
                  ? intl.formatMessage({ id: 'parcel.yes' })
                  : intl.formatMessage({ id: 'parcel.no' })
              }
              label={intl.formatMessage({ id: 'parcel.certification' })}
              colorScheme="orange"
            />
          </SimpleGrid>
          <HStack justify="flex-end" mt={{ base: 2, md: 3 }}>
            <StandardButton
              variant="ghost"
              size="sm"
              leftIcon={<Icon as={FaChartLine} />}
              onClick={() =>
                navigate(`/admin/dashboard/establishment/${establishmentId}/transparency`)
              }
            >
              {intl.formatMessage({ id: 'parcel.viewTransparencyDetails' })}
            </StandardButton>
          </HStack>
        </StandardCard>

        {/* Consumer Transparency Section */}
        {(parcelData?.transparency_description ||
          parcelData?.sustainability_practices ||
          parcelData?.consumer_story) && (
          <StandardCard title={intl.formatMessage({ id: 'app.consumerTransparency' })} variant="elevated" padding={{ base: 3, md: 4 }}>
            <VStack spacing={{ base: 3, md: 4 }} align="stretch">
              {parcelData?.transparency_description && (
                <Box p={{ base: 3, md: 4 }} bg="green.50" borderRadius="lg" border="1px" borderColor="green.200">
                  <HStack spacing={2} mb={{ base: 1, md: 2 }}>
                    <Icon as={FaLeaf} color="green.600" boxSize={{ base: 3.5, md: 4 }} />
                    <Text fontWeight="bold" color="green.700" fontSize={{ base: 'xs', md: 'sm' }} textTransform="uppercase">
                      {intl.formatMessage({ id: 'parcel.whatMakesSpecial' })}
                    </Text>
                  </HStack>
                  <Text color="gray.700" lineHeight="tall" fontSize={{ base: 'sm', md: 'md' }}>
                    {parcelData.transparency_description}
                  </Text>
                </Box>
              )}

              {parcelData?.sustainability_practices && (
                <Box p={{ base: 3, md: 4 }} bg="blue.50" borderRadius="lg" border="1px" borderColor="blue.200">
                  <HStack spacing={2} mb={{ base: 1, md: 2 }}>
                    <Icon as={FaSeedling} color="blue.600" boxSize={{ base: 3.5, md: 4 }} />
                    <Text fontWeight="bold" color="blue.700" fontSize={{ base: 'xs', md: 'sm' }} textTransform="uppercase">
                      {intl.formatMessage({ id: 'parcel.keySustainabilityPractices' })}
                    </Text>
                  </HStack>
                  <Text color="gray.700" lineHeight="tall" fontSize={{ base: 'sm', md: 'md' }}>
                    {parcelData.sustainability_practices}
                  </Text>
                </Box>
              )}

              {parcelData?.consumer_story && (
                <Box p={{ base: 3, md: 4 }} bg="purple.50" borderRadius="lg" border="1px" borderColor="purple.200">
                  <HStack spacing={2} mb={{ base: 1, md: 2 }}>
                    <Icon as={FaUsers} color="purple.600" boxSize={{ base: 3.5, md: 4 }} />
                    <Text fontWeight="bold" color="purple.700" fontSize={{ base: 'xs', md: 'sm' }} textTransform="uppercase">
                      {intl.formatMessage({ id: 'parcel.whyConsumersShouldCare' })}
                    </Text>
                  </HStack>
                  <Text color="gray.700" lineHeight="tall" fontSize={{ base: 'sm', md: 'md' }}>
                    {parcelData.consumer_story}
                  </Text>
                </Box>
              )}
            </VStack>
          </StandardCard>
        )}

        {/* Basic Information Section */}
        <StandardCard title={intl.formatMessage({ id: 'parcel.basicInformation' })} variant="elevated" padding={{ base: 3, md: 4 }}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 6 }}>
            <InfoRow icon={FaMapMarkedAlt} label={intl.formatMessage({ id: 'app.parcelName' })} value={parcelData?.name} />
            <InfoRow
              icon={FaRulerCombined}
              label={intl.formatMessage({ id: 'app.area' })}
              value={
                parcelData?.area ? formatAreaWithBothUnits(parcelData.area, 'METRIC') : undefined
              }
            />
            <InfoRow icon={FaHashtag} label={intl.formatMessage({ id: 'parcel.uniqueCode' })} value={parcelData?.unique_code} />
            <InfoRow
              icon={FaSeedling}
              label={intl.formatMessage({ id: 'parcel.primaryCrop' })}
              value={formatDisplayValue(parcelData?.primary_crop || parcelData?.crop_type)}
            />
          </SimpleGrid>
        </StandardCard>

        {/* Location Section */}
        <StandardCard title={intl.formatMessage({ id: 'parcel.locationDetails' })} variant="elevated" padding={{ base: 3, md: 4 }}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 6 }}>
            <InfoRow icon={FaMapMarkerAlt} label={intl.formatMessage({ id: 'app.address' })} value={formatLocation()} />
            <InfoRow
              icon={FaGlobeAmericas}
              label={intl.formatMessage({ id: 'app.coordinates' })}
              value={
                parcelData?.latitude && parcelData?.longitude
                  ? `${parseFloat(parcelData.latitude.toString()).toFixed(6)}, ${parseFloat(
                      parcelData.longitude.toString()
                    ).toFixed(6)}`
                  : undefined
              }
            />
            <InfoRow
              icon={FaMountain}
              label={intl.formatMessage({ id: 'parcel.elevation' })}
              value={parcelData?.elevation ? `${parcelData.elevation} ft` : undefined}
            />
            {establishment?.zone && (
              <InfoRow icon={MdLocationOn} label={intl.formatMessage({ id: 'app.zone' })} value={establishment.zone} />
            )}
          </SimpleGrid>
        </StandardCard>

        {/* Contact Information Section */}
        {(parcelData?.contact_person || parcelData?.contact_email || parcelData?.contact_phone) && (
          <StandardCard title={intl.formatMessage({ id: 'app.contactInformation' })} variant="elevated" padding={{ base: 3, md: 4 }}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 6 }}>
              <InfoRow icon={FaUser} label={intl.formatMessage({ id: 'parcel.contactPerson' })} value={parcelData?.contact_person} />
              <InfoRow
                icon={FaEnvelope}
                label={intl.formatMessage({ id: 'app.email' })}
                value={parcelData?.contact_email}
                type="email"
              />
              <InfoRow
                icon={FaPhone}
                label={intl.formatMessage({ id: 'app.phone' })}
                value={parcelData?.contact_phone}
                type="phone"
              />
            </SimpleGrid>
          </StandardCard>
        )}

        {/* Certification Section */}
        {(parcelData?.certified || parcelData?.certification_type) && (
          <StandardCard title={intl.formatMessage({ id: 'parcel.certification' })} variant="elevated" padding={{ base: 3, md: 4 }}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 6 }}>
              <HStack spacing={2} align="flex-start">
                <Icon as={FaCertificate} color="green.500" boxSize={{ base: 3.5, md: 4 }} mt={1} flexShrink={0} />
                <Box>
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    textTransform="uppercase"
                    fontWeight="semibold"
                  >
                    {intl.formatMessage({ id: 'parcel.certificationStatus' })}
                  </Text>
                  <Badge
                    colorScheme={parcelData?.certified ? 'green' : 'gray'}
                    variant="subtle"
                    px={2}
                    py={1}
                    borderRadius="full"
                  >
                    {parcelData?.certified ? intl.formatMessage({ id: 'app.certified' }) : intl.formatMessage({ id: 'parcel.notCertified' })}
                  </Badge>
                </Box>
              </HStack>
              {parcelData?.certification_type && (
                <InfoRow
                  icon={FaCheckCircle}
                  label={intl.formatMessage({ id: 'parcel.certificationType' })}
                  value={formatCertificationType(parcelData.certification_type)}
                />
              )}
            </SimpleGrid>
          </StandardCard>
        )}

        {/* Soil Health Section */}
        {hasSoilData && (
          <StandardCard title={intl.formatMessage({ id: 'parcel.soilHealth' })} variant="elevated" padding={{ base: 3, md: 4 }}>
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 3, md: 4 }}>
              {parcelData?.agricultural_details?.soil_ph && (
                <VStack
                  spacing={0.5}
                  p={{ base: 3, md: 4 }}
                  bg="orange.50"
                  borderRadius="lg"
                  border="1px"
                  borderColor="orange.200"
                >
                  <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.800">
                    {parseFloat(parcelData.agricultural_details.soil_ph).toFixed(1)}
                  </Text>
                  <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                    {intl.formatMessage({ id: 'parcel.phLevel' })}
                  </Text>
                </VStack>
              )}
              {parcelData?.agricultural_details?.soil_organic_matter && (
                <VStack
                  spacing={0.5}
                  p={{ base: 3, md: 4 }}
                  bg="green.50"
                  borderRadius="lg"
                  border="1px"
                  borderColor="green.200"
                >
                  <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.800">
                    {parseFloat(parcelData.agricultural_details.soil_organic_matter).toFixed(1)}%
                  </Text>
                  <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                    {intl.formatMessage({ id: 'parcel.organicMatter' })}
                  </Text>
                </VStack>
              )}
              {parcelData?.agricultural_details?.soil_nitrogen && (
                <VStack
                  spacing={0.5}
                  p={{ base: 3, md: 4 }}
                  bg="blue.50"
                  borderRadius="lg"
                  border="1px"
                  borderColor="blue.200"
                >
                  <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.800">
                    {parseFloat(parcelData.agricultural_details.soil_nitrogen).toFixed(0)}
                  </Text>
                  <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                    {intl.formatMessage({ id: 'parcel.nitrogenPpm' })}
                  </Text>
                </VStack>
              )}
              {parcelData?.agricultural_details?.soil_phosphorus && (
                <VStack
                  spacing={0.5}
                  p={{ base: 3, md: 4 }}
                  bg="purple.50"
                  borderRadius="lg"
                  border="1px"
                  borderColor="purple.200"
                >
                  <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.800">
                    {parseFloat(parcelData.agricultural_details.soil_phosphorus).toFixed(0)}
                  </Text>
                  <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                    {intl.formatMessage({ id: 'parcel.phosphorusPpm' })}
                  </Text>
                </VStack>
              )}
            </SimpleGrid>
          </StandardCard>
        )}

        {/* Water Management Section */}
        {hasWaterData && (
          <StandardCard title={intl.formatMessage({ id: 'parcel.waterManagement' })} variant="elevated" padding={{ base: 3, md: 4 }}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 6 }}>
              {parcelData?.agricultural_details?.irrigation_efficiency && (
                <InfoRow
                  icon={FaTint}
                  label={intl.formatMessage({ id: 'parcel.irrigationEfficiency' })}
                  value={`${parseFloat(
                    parcelData.agricultural_details.irrigation_efficiency
                  ).toFixed(0)}%`}
                />
              )}
              {parcelData?.agricultural_details?.water_source_type && (
                <InfoRow
                  icon={FaTint}
                  label={intl.formatMessage({ id: 'parcel.waterSource' })}
                  value={formatDisplayValue(parcelData.agricultural_details.water_source_type)}
                />
              )}
              {parcelData?.agricultural_details?.water_quality_ph && (
                <InfoRow
                  icon={FaTint}
                  label={intl.formatMessage({ id: 'parcel.waterPh' })}
                  value={parseFloat(parcelData.agricultural_details.water_quality_ph).toFixed(1)}
                />
              )}
              {parcelData?.agricultural_details?.water_allocation_acre_feet && (
                <InfoRow
                  icon={FaTint}
                  label={intl.formatMessage({ id: 'parcel.waterAllocation' })}
                  value={`${parseFloat(
                    parcelData.agricultural_details.water_allocation_acre_feet
                  ).toFixed(1)} acre-feet`}
                />
              )}
            </SimpleGrid>
          </StandardCard>
        )}

        {/* Conservation Practices Section */}
        {hasConservationData && (
          <StandardCard title={intl.formatMessage({ id: 'parcel.conservationPractices' })} variant="elevated" padding={{ base: 3, md: 4 }}>
            <VStack spacing={{ base: 3, md: 4 }} align="stretch">
              {parcelData?.agricultural_details?.cover_crop_management && (
                <HStack
                  spacing={2}
                  p={{ base: 3, md: 4 }}
                  bg="green.50"
                  borderRadius="lg"
                  border="1px"
                  borderColor="green.200"
                  align="flex-start"
                >
                  <Icon as={FaSeedling} color="green.600" mt={1} boxSize={{ base: 3.5, md: 4 }} />
                  <Box>
                    <Text fontWeight="semibold" color="gray.800" fontSize={{ base: 'sm', md: 'md' }}>
                      {intl.formatMessage({ id: 'parcel.coverCrops' })}
                    </Text>
                    <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                      {parcelData.agricultural_details.cover_crop_management}
                    </Text>
                  </Box>
                </HStack>
              )}
              {parcelData?.agricultural_details?.crop_rotation_pattern && (
                <HStack
                  spacing={2}
                  p={{ base: 3, md: 4 }}
                  bg="green.50"
                  borderRadius="lg"
                  border="1px"
                  borderColor="green.200"
                  align="flex-start"
                >
                  <Icon as={FaLeaf} color="green.500" mt={1} boxSize={{ base: 3.5, md: 4 }} />
                  <Box>
                    <Text fontWeight="semibold" color="gray.800" fontSize={{ base: 'sm', md: 'md' }}>
                      {intl.formatMessage({ id: 'parcel.cropRotation' })}
                    </Text>
                    <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                      {parcelData.agricultural_details.crop_rotation_pattern}
                    </Text>
                  </Box>
                </HStack>
              )}
              {parcelData?.agricultural_details?.pest_management_strategy && (
                <HStack
                  spacing={2}
                  p={{ base: 3, md: 4 }}
                  bg="yellow.50"
                  borderRadius="lg"
                  border="1px"
                  borderColor="yellow.200"
                  align="flex-start"
                >
                  <Icon as={FaChartLine} color="yellow.600" mt={1} boxSize={{ base: 3.5, md: 4 }} />
                  <Box>
                    <Text fontWeight="semibold" color="gray.800" fontSize={{ base: 'sm', md: 'md' }}>
                      {intl.formatMessage({ id: 'parcel.pestManagement' })}
                    </Text>
                    <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                      {parcelData.agricultural_details.pest_management_strategy}
                    </Text>
                  </Box>
                </HStack>
              )}
              {parcelData?.agricultural_details?.fertilization_program && (
                <HStack
                  spacing={2}
                  p={{ base: 3, md: 4 }}
                  bg="purple.50"
                  borderRadius="lg"
                  border="1px"
                  borderColor="purple.200"
                  align="flex-start"
                >
                  <Icon as={MdEco} color="purple.500" mt={1} boxSize={{ base: 3.5, md: 4 }} />
                  <Box>
                    <Text fontWeight="semibold" color="gray.800" fontSize={{ base: 'sm', md: 'md' }}>
                      {intl.formatMessage({ id: 'parcel.fertilizationProgram' })}
                    </Text>
                    <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                      {parcelData.agricultural_details.fertilization_program}
                    </Text>
                  </Box>
                </HStack>
              )}
            </VStack>
          </StandardCard>
        )}

        {/* Company & Establishment Section */}
        <StandardCard title={intl.formatMessage({ id: 'parcel.companyAndEstablishment' })} variant="elevated" padding={{ base: 3, md: 4 }}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 6 }}>
            <InfoRow icon={FaBuilding} label={intl.formatMessage({ id: 'app.company' })} value={currentCompany?.name} />
            <InfoRow icon={FaBuilding} label={intl.formatMessage({ id: 'app.establishment' })} value={establishment?.name} />
          </SimpleGrid>
        </StandardCard>
      </VStack>
    </StandardPage>
  );
}

export default ProfileParcel;
