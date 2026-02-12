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
  Spinner,
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
import { MdEco, MdVerified, MdLocationOn } from 'react-icons/md';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';

import { StandardCard, StandardButton, StandardPage } from 'components/Design/StandardComponents';
import { StandardImageGallery } from 'components/ImageGallery';
import { useGetParcelQuery } from 'store/api/productApi';
import { formatAreaWithBothUnits } from '../../../../utils/areaUnits';
import { ParcelTransparencyScoreBreakdown } from 'components/Transparency/ParcelTransparencyScoreBreakdown';

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
          <Link href={value as string} isExternal color="green.600" fontWeight="medium">
            {value}
          </Link>
        );
      case 'email':
        return (
          <Link href={`mailto:${value}`} color="green.600" fontWeight="medium">
            {value}
          </Link>
        );
      case 'phone':
        return (
          <Link href={`tel:${value}`} color="green.600" fontWeight="medium">
            {value}
          </Link>
        );
      default:
        return (
          <Text fontWeight="medium" color="gray.800">
            {value}
          </Text>
        );
    }
  };

  return (
    <HStack spacing={3} align="flex-start">
      <Icon as={icon} color="green.500" boxSize={4} mt={1} flexShrink={0} />
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
    spacing={2}
    p={4}
    bg={`${colorScheme}.50`}
    borderRadius="xl"
    border="1px solid"
    borderColor={`${colorScheme}.200`}
    align="center"
  >
    <Icon as={icon} boxSize={6} color={`${colorScheme}.500`} />
    <Text fontSize="xl" fontWeight="bold" color="gray.800" textAlign="center">
      {value}
    </Text>
    <Text fontSize="sm" color="gray.600" textAlign="center">
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
          title: `${parcelData.name} - Parcel Profile`,
          text: 'Check out this sustainable parcel! #Trazo #SustainableAgriculture',
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
        <Box py={8} textAlign="center">
          <Spinner size="lg" color="green.500" />
        </Box>
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
      <VStack spacing={8} w="100%">
        {/* Identity Section */}
        <StandardCard
          title={intl.formatMessage({ id: 'app.parcel' })}
          variant="elevated"
          headerAction={
            <HStack spacing={2}>
              <StandardButton
                variant="outline"
                size="sm"
                leftIcon={<Icon as={FaShare} />}
                onClick={handleShare}
              >
                {intl.formatMessage({ id: 'app.share' })}
              </StandardButton>
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
            </HStack>
          }
        >
          <HStack spacing={6} align="flex-start" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
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
                    Code: {parcelData.unique_code}
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
                    Active
                  </Badge>
                </WrapItem>
                {parcelData?.certified && (
                  <WrapItem>
                    <Badge colorScheme="blue" variant="subtle" px={2} py={1} borderRadius="full">
                      <HStack spacing={1}>
                        <Icon as={FaCertificate} boxSize={3} />
                        <Text>Certified</Text>
                      </HStack>
                    </Badge>
                  </WrapItem>
                )}
                {parcelData?.carbon_calculation_enabled && (
                  <WrapItem>
                    <Badge colorScheme="purple" variant="subtle" px={2} py={1} borderRadius="full">
                      <HStack spacing={1}>
                        <Icon as={FaLeaf} boxSize={3} />
                        <Text>Carbon Tracking</Text>
                      </HStack>
                    </Badge>
                  </WrapItem>
                )}
                {parcelData?.usda_compliance_eligible && (
                  <WrapItem>
                    <Badge colorScheme="orange" variant="subtle" px={2} py={1} borderRadius="full">
                      <HStack spacing={1}>
                        <Icon as={MdVerified} boxSize={3} />
                        <Text>USDA Eligible</Text>
                      </HStack>
                    </Badge>
                  </WrapItem>
                )}
                {parcelData?.transparency_ready && (
                  <WrapItem>
                    <Badge colorScheme="cyan" variant="subtle" px={2} py={1} borderRadius="full">
                      <HStack spacing={1}>
                        <Icon as={FaEye} boxSize={3} />
                        <Text>Consumer Ready</Text>
                      </HStack>
                    </Badge>
                  </WrapItem>
                )}
                {parcelData?.transparency_score && parcelData.transparency_score > 0 && (
                  <WrapItem>
                    <Badge colorScheme="teal" variant="subtle" px={2} py={1} borderRadius="full">
                      Transparency: {parcelData.transparency_score}%
                    </Badge>
                  </WrapItem>
                )}
              </Wrap>
            </VStack>
          </HStack>
        </StandardCard>

        {/* Photo Gallery Section */}
        {parcelData?.images && parcelData.images.length > 0 && (
          <StandardCard title="Photo Gallery" variant="elevated">
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
        <StandardCard title="Quick Stats" variant="elevated">
          <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
            <StatCard
              icon={FaTractor}
              value={parcelData?.area ? parcelData.area.toFixed(2) : '--'}
              label="Hectares"
              subLabel={
                parcelData?.area ? `(${(parcelData.area * 2.47105).toFixed(1)} acres)` : undefined
              }
              colorScheme="green"
            />
            <StatCard
              icon={FaSeedling}
              value={formatDisplayValue(parcelData?.primary_crop || parcelData?.crop_type) || '--'}
              label="Primary Crop"
              colorScheme="blue"
            />
            <StatCard
              icon={FaCertificate}
              value={
                parcelData?.certified && parcelData?.certification_type
                  ? formatCertificationType(parcelData.certification_type)
                  : parcelData?.certified
                  ? 'Yes'
                  : 'No'
              }
              label="Certification"
              colorScheme="orange"
            />
          </SimpleGrid>
        </StandardCard>

        {/* Transparency Score Breakdown */}
        {(parcelData?.transparency_score ||
          parcelData?.transparency_description ||
          parcelData?.sustainability_practices ||
          parcelData?.consumer_story) && (
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
        )}

        {/* Consumer Transparency Section */}
        {(parcelData?.transparency_description ||
          parcelData?.sustainability_practices ||
          parcelData?.consumer_story) && (
          <StandardCard title="Consumer Transparency" variant="elevated">
            <VStack spacing={4} align="stretch">
              {parcelData?.transparency_description && (
                <Box p={4} bg="green.50" borderRadius="lg" border="1px" borderColor="green.200">
                  <HStack spacing={2} mb={2}>
                    <Icon as={FaLeaf} color="green.600" />
                    <Text fontWeight="bold" color="green.700" fontSize="sm">
                      WHAT MAKES THIS PARCEL SPECIAL
                    </Text>
                  </HStack>
                  <Text color="gray.700" lineHeight="tall">
                    {parcelData.transparency_description}
                  </Text>
                </Box>
              )}

              {parcelData?.sustainability_practices && (
                <Box p={4} bg="blue.50" borderRadius="lg" border="1px" borderColor="blue.200">
                  <HStack spacing={2} mb={2}>
                    <Icon as={FaSeedling} color="blue.600" />
                    <Text fontWeight="bold" color="blue.700" fontSize="sm">
                      KEY SUSTAINABILITY PRACTICES
                    </Text>
                  </HStack>
                  <Text color="gray.700" lineHeight="tall">
                    {parcelData.sustainability_practices}
                  </Text>
                </Box>
              )}

              {parcelData?.consumer_story && (
                <Box p={4} bg="purple.50" borderRadius="lg" border="1px" borderColor="purple.200">
                  <HStack spacing={2} mb={2}>
                    <Icon as={FaUsers} color="purple.600" />
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">
                      WHY CONSUMERS SHOULD CARE
                    </Text>
                  </HStack>
                  <Text color="gray.700" lineHeight="tall">
                    {parcelData.consumer_story}
                  </Text>
                </Box>
              )}
            </VStack>
          </StandardCard>
        )}

        {/* Basic Information Section */}
        <StandardCard title="Basic Information" variant="elevated">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <InfoRow icon={FaMapMarkedAlt} label="Parcel Name" value={parcelData?.name} />
            <InfoRow
              icon={FaRulerCombined}
              label="Area"
              value={
                parcelData?.area ? formatAreaWithBothUnits(parcelData.area, 'METRIC') : undefined
              }
            />
            <InfoRow icon={FaHashtag} label="Unique Code" value={parcelData?.unique_code} />
            <InfoRow
              icon={FaSeedling}
              label="Primary Crop"
              value={formatDisplayValue(parcelData?.primary_crop || parcelData?.crop_type)}
            />
          </SimpleGrid>
        </StandardCard>

        {/* Location Section */}
        <StandardCard title="Location Details" variant="elevated">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <InfoRow icon={FaMapMarkerAlt} label="Address" value={formatLocation()} />
            <InfoRow
              icon={FaGlobeAmericas}
              label="Coordinates"
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
              label="Elevation"
              value={parcelData?.elevation ? `${parcelData.elevation} ft` : undefined}
            />
            {establishment?.zone && (
              <InfoRow icon={MdLocationOn} label="Zone" value={establishment.zone} />
            )}
          </SimpleGrid>
        </StandardCard>

        {/* Contact Information Section */}
        {(parcelData?.contact_person || parcelData?.contact_email || parcelData?.contact_phone) && (
          <StandardCard title="Contact Information" variant="elevated">
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <InfoRow icon={FaUser} label="Contact Person" value={parcelData?.contact_person} />
              <InfoRow
                icon={FaEnvelope}
                label="Email"
                value={parcelData?.contact_email}
                type="email"
              />
              <InfoRow
                icon={FaPhone}
                label="Phone"
                value={parcelData?.contact_phone}
                type="phone"
              />
            </SimpleGrid>
          </StandardCard>
        )}

        {/* Certification Section */}
        {(parcelData?.certified || parcelData?.certification_type) && (
          <StandardCard title="Certification" variant="elevated">
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <HStack spacing={3} align="flex-start">
                <Icon as={FaCertificate} color="green.500" boxSize={4} mt={1} flexShrink={0} />
                <Box>
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    textTransform="uppercase"
                    fontWeight="semibold"
                  >
                    Status
                  </Text>
                  <Badge
                    colorScheme={parcelData?.certified ? 'green' : 'gray'}
                    variant="subtle"
                    px={2}
                    py={1}
                    borderRadius="full"
                  >
                    {parcelData?.certified ? 'Certified' : 'Not Certified'}
                  </Badge>
                </Box>
              </HStack>
              {parcelData?.certification_type && (
                <InfoRow
                  icon={FaCheckCircle}
                  label="Certification Type"
                  value={formatCertificationType(parcelData.certification_type)}
                />
              )}
            </SimpleGrid>
          </StandardCard>
        )}

        {/* Soil Health Section */}
        {hasSoilData && (
          <StandardCard title="Soil Health" variant="elevated">
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
              {parcelData?.agricultural_details?.soil_ph && (
                <VStack
                  spacing={1}
                  p={4}
                  bg="orange.50"
                  borderRadius="lg"
                  border="1px"
                  borderColor="orange.200"
                >
                  <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                    {parseFloat(parcelData.agricultural_details.soil_ph).toFixed(1)}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    pH Level
                  </Text>
                </VStack>
              )}
              {parcelData?.agricultural_details?.soil_organic_matter && (
                <VStack
                  spacing={1}
                  p={4}
                  bg="green.50"
                  borderRadius="lg"
                  border="1px"
                  borderColor="green.200"
                >
                  <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                    {parseFloat(parcelData.agricultural_details.soil_organic_matter).toFixed(1)}%
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Organic Matter
                  </Text>
                </VStack>
              )}
              {parcelData?.agricultural_details?.soil_nitrogen && (
                <VStack
                  spacing={1}
                  p={4}
                  bg="blue.50"
                  borderRadius="lg"
                  border="1px"
                  borderColor="blue.200"
                >
                  <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                    {parseFloat(parcelData.agricultural_details.soil_nitrogen).toFixed(0)}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Nitrogen (ppm)
                  </Text>
                </VStack>
              )}
              {parcelData?.agricultural_details?.soil_phosphorus && (
                <VStack
                  spacing={1}
                  p={4}
                  bg="purple.50"
                  borderRadius="lg"
                  border="1px"
                  borderColor="purple.200"
                >
                  <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                    {parseFloat(parcelData.agricultural_details.soil_phosphorus).toFixed(0)}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Phosphorus (ppm)
                  </Text>
                </VStack>
              )}
            </SimpleGrid>
          </StandardCard>
        )}

        {/* Water Management Section */}
        {hasWaterData && (
          <StandardCard title="Water Management" variant="elevated">
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              {parcelData?.agricultural_details?.irrigation_efficiency && (
                <InfoRow
                  icon={FaTint}
                  label="Irrigation Efficiency"
                  value={`${parseFloat(
                    parcelData.agricultural_details.irrigation_efficiency
                  ).toFixed(0)}%`}
                />
              )}
              {parcelData?.agricultural_details?.water_source_type && (
                <InfoRow
                  icon={FaTint}
                  label="Water Source"
                  value={formatDisplayValue(parcelData.agricultural_details.water_source_type)}
                />
              )}
              {parcelData?.agricultural_details?.water_quality_ph && (
                <InfoRow
                  icon={FaTint}
                  label="Water pH"
                  value={parseFloat(parcelData.agricultural_details.water_quality_ph).toFixed(1)}
                />
              )}
              {parcelData?.agricultural_details?.water_allocation_acre_feet && (
                <InfoRow
                  icon={FaTint}
                  label="Water Allocation"
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
          <StandardCard title="Conservation Practices" variant="elevated">
            <VStack spacing={4} align="stretch">
              {parcelData?.agricultural_details?.cover_crop_management && (
                <HStack
                  spacing={3}
                  p={4}
                  bg="green.50"
                  borderRadius="lg"
                  border="1px"
                  borderColor="green.200"
                  align="flex-start"
                >
                  <Icon as={FaSeedling} color="green.600" mt={1} />
                  <Box>
                    <Text fontWeight="semibold" color="gray.800">
                      Cover Crops
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {parcelData.agricultural_details.cover_crop_management}
                    </Text>
                  </Box>
                </HStack>
              )}
              {parcelData?.agricultural_details?.crop_rotation_pattern && (
                <HStack
                  spacing={3}
                  p={4}
                  bg="green.50"
                  borderRadius="lg"
                  border="1px"
                  borderColor="green.200"
                  align="flex-start"
                >
                  <Icon as={FaLeaf} color="green.500" mt={1} />
                  <Box>
                    <Text fontWeight="semibold" color="gray.800">
                      Crop Rotation
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {parcelData.agricultural_details.crop_rotation_pattern}
                    </Text>
                  </Box>
                </HStack>
              )}
              {parcelData?.agricultural_details?.pest_management_strategy && (
                <HStack
                  spacing={3}
                  p={4}
                  bg="yellow.50"
                  borderRadius="lg"
                  border="1px"
                  borderColor="yellow.200"
                  align="flex-start"
                >
                  <Icon as={FaChartLine} color="yellow.600" mt={1} />
                  <Box>
                    <Text fontWeight="semibold" color="gray.800">
                      Pest Management
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {parcelData.agricultural_details.pest_management_strategy}
                    </Text>
                  </Box>
                </HStack>
              )}
              {parcelData?.agricultural_details?.fertilization_program && (
                <HStack
                  spacing={3}
                  p={4}
                  bg="purple.50"
                  borderRadius="lg"
                  border="1px"
                  borderColor="purple.200"
                  align="flex-start"
                >
                  <Icon as={MdEco} color="purple.500" mt={1} />
                  <Box>
                    <Text fontWeight="semibold" color="gray.800">
                      Fertilization Program
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {parcelData.agricultural_details.fertilization_program}
                    </Text>
                  </Box>
                </HStack>
              )}
            </VStack>
          </StandardCard>
        )}

        {/* Company & Establishment Section */}
        <StandardCard title="Company & Establishment" variant="elevated">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <InfoRow icon={FaBuilding} label="Company" value={currentCompany?.name} />
            <InfoRow icon={FaBuilding} label="Establishment" value={establishment?.name} />
          </SimpleGrid>
        </StandardCard>
      </VStack>
    </StandardPage>
  );
}

export default ProfileParcel;
