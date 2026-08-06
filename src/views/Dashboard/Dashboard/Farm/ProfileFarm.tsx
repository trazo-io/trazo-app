import React, { useState } from 'react';
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
  Input,
  FormLabel,
  useToast,
  useColorModeValue,
  Center,
  Switch,
  Textarea
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
  FaShare,
  FaFileAlt,
  FaShieldAlt,
  FaTrash
} from 'react-icons/fa';
// MdEco removed - climate_zone display removed for transparency-first approach
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useUserRole } from 'hooks/useUserRole';
import { useIntl } from 'react-intl';
import {
  StandardCard,
  StandardButton,
  StandardPage,
  StandardPageLoading
} from 'components/Design/StandardComponents';
import { useGetFarmQuery, useEditFarmMutation } from 'store/api/companyApi';
import { StandardImageGallery } from 'components/ImageGallery';
import CertificationManager from 'components/Certifications/CertificationManager';
import OperationAuditExportButton from './OperationAuditExportButton';
import PURExportModal from 'components/PURExport/PURExportModal';
import { normalizeState } from 'utils/usStates';
import CertifierLinkCard from 'components/Certifications/CertifierLinkCard';

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
          <Link
            href={value as string}
            isExternal
            color="green.600"
            fontWeight="medium"
            fontSize={{ base: 'sm', md: 'md' }}
          >
            {value}
          </Link>
        );
      case 'email':
        return (
          <Link
            href={`mailto:${value}`}
            color="green.600"
            fontWeight="medium"
            fontSize={{ base: 'sm', md: 'md' }}
          >
            {value}
          </Link>
        );
      case 'phone':
        return (
          <Link
            href={`tel:${value}`}
            color="green.600"
            fontWeight="medium"
            fontSize={{ base: 'sm', md: 'md' }}
          >
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
        <Text
          fontSize="xs"
          color="gray.500"
          textTransform="uppercase"
          fontWeight="semibold"
          letterSpacing="0.05em"
        >
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
  const [editFarm, { isLoading: isSavingOfpp }] = useEditFarmMutation();
  const [ofppEditMode, setOfppEditMode] = useState(false);
  const [ofppResponsible, setOfppResponsible] = useState('');
  const [ofppDate, setOfppDate] = useState('');
  const [ofppFile, setOfppFile] = useState<File | null>(null);
  const [isSavingSplit, setIsSavingSplit] = useState(false);
  const [splitPlanText, setSplitPlanText] = useState('');
  const [splitPlanEditMode, setSplitPlanEditMode] = useState(false);
  const [purModalOpen, setPurModalOpen] = useState(false);
  const infoBg = useColorModeValue('blue.50', 'blue.900');
  const infoColor = useColorModeValue('blue.700', 'blue.200');

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
          title: `${establishmentData?.name} - ${intl.formatMessage({
            id: 'establishment.shareTitle'
          })}`,
          text: `${intl.formatMessage({ id: 'establishment.shareText' })} ${
            establishmentData?.description || ''
          }`,
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

  const handleSaveOfpp = async () => {
    try {
      const formData = new FormData();
      formData.append('ofpp_responsible_person', ofppResponsible);
      if (ofppDate) formData.append('fraud_prevention_plan_date', ofppDate);
      if (ofppFile) {
        formData.append('fraud_prevention_plan_document', ofppFile);
        formData.append('fraud_prevention_plan_uploaded', 'true');
      }
      await editFarm({
        companyId: currentCompany?.id,
        farmId,
        establishmentData: formData
      }).unwrap();
      toast({
        title: 'SOE Compliance updated',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      setOfppEditMode(false);
      setOfppFile(null);
    } catch {
      toast({
        title: 'Failed to save compliance data',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleToggleSplitOperation = async (checked: boolean) => {
    setIsSavingSplit(true);
    try {
      const formData = new FormData();
      formData.append('has_split_operation', String(checked));
      if (!checked) {
        formData.append('split_operation_plan', '');
      }
      await editFarm({
        companyId: currentCompany?.id,
        farmId,
        establishmentData: formData
      }).unwrap();
      toast({
        title: intl.formatMessage({ id: 'farm.split.saved' }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch {
      toast({
        title: intl.formatMessage({ id: 'farm.split.saveFailed' }),
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsSavingSplit(false);
    }
  };

  const handleSaveSplitPlan = async () => {
    setIsSavingSplit(true);
    try {
      const formData = new FormData();
      formData.append('split_operation_plan', splitPlanText);
      await editFarm({
        companyId: currentCompany?.id,
        farmId,
        establishmentData: formData
      }).unwrap();
      toast({
        title: intl.formatMessage({ id: 'farm.split.saved' }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      setSplitPlanEditMode(false);
    } catch {
      toast({
        title: intl.formatMessage({ id: 'farm.split.saveFailed' }),
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsSavingSplit(false);
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
                  <Badge
                    colorScheme="green"
                    variant="subtle"
                    px={2}
                    py={0.5}
                    borderRadius="full"
                    fontSize="xs"
                  >
                    {intl.formatMessage({ id: 'app.active' })}
                  </Badge>
                )}
                {(establishmentData.establishment_type || establishmentData.type) && (
                  <Badge
                    colorScheme="blue"
                    variant="subtle"
                    px={2}
                    py={0.5}
                    borderRadius="full"
                    fontSize="xs"
                  >
                    {formatDisplayValue(
                      establishmentData.establishment_type || establishmentData.type
                    )}
                  </Badge>
                )}
                {establishmentData.farming_method && (
                  <Badge
                    colorScheme="purple"
                    variant="subtle"
                    px={2}
                    py={0.5}
                    borderRadius="full"
                    fontSize="xs"
                  >
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
                  <Badge
                    colorScheme="green"
                    variant="subtle"
                    px={2}
                    py={0.5}
                    borderRadius="full"
                    fontSize="sm"
                  >
                    {intl.formatMessage({ id: 'app.active' })}
                  </Badge>
                )}
                {(establishmentData.establishment_type || establishmentData.type) && (
                  <Badge
                    colorScheme="blue"
                    variant="subtle"
                    px={2}
                    py={0.5}
                    borderRadius="full"
                    fontSize="sm"
                  >
                    {formatDisplayValue(
                      establishmentData.establishment_type || establishmentData.type
                    )}
                  </Badge>
                )}
                {establishmentData.farming_method && (
                  <Badge
                    colorScheme="purple"
                    variant="subtle"
                    px={2}
                    py={0.5}
                    borderRadius="full"
                    fontSize="sm"
                  >
                    {formatDisplayValue(establishmentData.farming_method)}
                  </Badge>
                )}
              </HStack>
            </VStack>
          </HStack>
        </StandardCard>

        {/* The standalone "Inspection readiness" panel was removed here 2026-08-04.
            It rendered the operation blockers a second time: `CertifierLinkCard` below
            already shows them inline (variant="preshare") to explain why sharing is blocked,
            so this page listed the same finding twice, one card apart. Worse, its badge
            counted only `blockers` while the farm dashboard's "Ready for your certifier"
            counted season findings — the same farm read "1 to fix" here and "3" there, with
            nothing on either page explaining that they measured different scopes.

            Operation readiness now folds into `CertifierReadinessCard` on the farm dashboard,
            which reports ONE count across both scopes. This page keeps the ACTIONS — share a
            link, generate the dossier, file the PUR — which is what a farmer comes here to do. */}

        {/* Certifier review links — national, not state-gated: every certified
            operation has a certifier, whatever state it is in. */}
        {currentCompany?.id && farmId && (
          <CertifierLinkCard
            companyId={String(currentCompany.id)}
            farmId={String(farmId)}
            canWrite={canWrite}
          />
        )}

        {/* Compliance & Reports — establishment-level regulatory exports.
            CA-only: the PUR is a California filing (3 CCR 6626) and the export embeds
            CA county codes, so offering it to an out-of-state farm produced a CSV
            titled "California Pesticide Use Report" naming a non-CA county. The
            backend 404s for non-CA farms; this keeps the button off the page too. */}
        {canWrite && normalizeState(establishmentData?.state) === 'CA' && (
          <StandardCard
            title={intl.formatMessage({ id: 'app.pur.complianceReports' })}
            variant="elevated"
            padding={{ base: 3, md: 4 }}
          >
            <HStack
              justify="space-between"
              align={{ base: 'flex-start', smd: 'center' }}
              flexDirection={{ base: 'column', smd: 'row' }}
              spacing={3}
            >
              <VStack align="flex-start" spacing={0.5}>
                <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                  {intl.formatMessage({ id: 'app.pur.title' })}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {intl.formatMessage({ id: 'app.pur.cardSubtitle' })}
                </Text>
              </VStack>
              <StandardButton
                variant="outline"
                size="sm"
                leftIcon={<Icon as={FaFileAlt} />}
                onClick={() => setPurModalOpen(true)}
                w={{ base: 'full', smd: 'auto' }}
              >
                {intl.formatMessage({ id: 'app.pur.generate' })}
              </StandardButton>
            </HStack>
          </StandardCard>
        )}

        {/* Photo Gallery */}
        {establishmentData.images && establishmentData.images.length > 0 && (
          <StandardCard
            title={intl.formatMessage({ id: 'establishment.photoGallery' })}
            variant="elevated"
            padding={{ base: 3, md: 4 }}
          >
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
        <StandardCard
          title={intl.formatMessage({ id: 'establishment.quickStats' })}
          variant="elevated"
          padding={{ base: 3, md: 4 }}
        >
          <SimpleGrid columns={{ base: 2, md: 3 }} spacing={{ base: 3, md: 6 }}>
            <VStack
              spacing={0.5}
              align="center"
              p={{ base: 3, md: 4 }}
              bg="green.50"
              borderRadius="lg"
            >
              <Icon as={FaTractor} color="green.500" boxSize={{ base: 5, md: 6 }} />
              <Text fontSize={{ base: 'lg', md: '2xl' }} fontWeight="bold" color="gray.800">
                {establishmentData.total_acreage || 0}
              </Text>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                {intl.formatMessage({ id: 'app.acres' })}
              </Text>
            </VStack>
            <VStack
              spacing={0.5}
              align="center"
              p={{ base: 3, md: 4 }}
              bg="purple.50"
              borderRadius="lg"
            >
              <Icon as={FaCalendar} color="purple.500" boxSize={{ base: 5, md: 6 }} />
              <Text fontSize={{ base: 'lg', md: '2xl' }} fontWeight="bold" color="gray.800">
                {establishmentData.year_established || '--'}
              </Text>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                {intl.formatMessage({ id: 'establishment.founded' })}
              </Text>
            </VStack>
            <VStack
              spacing={0.5}
              align="center"
              p={{ base: 3, md: 4 }}
              bg="orange.50"
              borderRadius="lg"
            >
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
        <StandardCard
          title={intl.formatMessage({ id: 'app.contactInformation' })}
          variant="elevated"
          padding={{ base: 3, md: 4 }}
        >
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
        <StandardCard
          title={intl.formatMessage({ id: 'app.location' })}
          variant="elevated"
          padding={{ base: 3, md: 4 }}
        >
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 6 }}>
            <InfoRow
              icon={FaMapMarkerAlt}
              label={intl.formatMessage({ id: 'app.address' })}
              value={formatAddress()}
            />
            <InfoRow
              icon={FaMapMarkerAlt}
              label={intl.formatMessage({ id: 'establishment.zipCode' })}
              value={establishmentData.zip_code}
            />
            <InfoRow
              icon={FaMapMarkerAlt}
              label={intl.formatMessage({ id: 'app.zone' })}
              value={establishmentData.zone}
            />
            <InfoRow
              icon={FaMapMarkerAlt}
              label={intl.formatMessage({ id: 'app.coordinates' })}
              value={formatCoordinates()}
            />
          </SimpleGrid>
        </StandardCard>

        {/* Operations - Updated: Removed employee_count (not consumer-relevant) */}
        <StandardCard
          title={intl.formatMessage({ id: 'establishment.operations' })}
          variant="elevated"
          padding={{ base: 3, md: 4 }}
        >
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
          <StandardCard
            title={intl.formatMessage({ id: 'app.agriculturalInformation' })}
            variant="elevated"
            padding={{ base: 3, md: 4 }}
          >
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
          <StandardCard
            title={intl.formatMessage({ id: 'establishment.crops' })}
            variant="elevated"
            padding={{ base: 3, md: 4 }}
          >
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
        <Box data-tour="farm-certifications" w="full">
          <StandardCard
            title={intl.formatMessage({ id: 'certification.manage.title' })}
            variant="elevated"
            padding={{ base: 3, md: 4 }}
          >
            <CertificationManager companyId={currentCompany?.id} farmId={farmId} />
          </StandardCard>
        </Box>

        {/* Operation-wide audit dossier — one combined NOP PDF across all parcels × productions */}
        <Box w="full">
          <OperationAuditExportButton companyId={currentCompany?.id} farmId={farmId} />
        </Box>

        {/* Sustainability Practices */}
        {getSustainabilityPractices().length > 0 && (
          <StandardCard
            title={intl.formatMessage({ id: 'establishment.sustainabilityPractices' })}
            variant="elevated"
            padding={{ base: 3, md: 4 }}
          >
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
          <StandardCard
            title={intl.formatMessage({ id: 'establishment.socialMedia' })}
            variant="elevated"
            padding={{ base: 3, md: 4 }}
          >
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
          <StandardCard
            title={intl.formatMessage({ id: 'establishment.aboutEstablishment' })}
            variant="elevated"
            padding={{ base: 3, md: 4 }}
          >
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

        {/* SOE Compliance */}
        <Box data-tour="farm-soe-compliance" w="full">
          <StandardCard
            title={intl.formatMessage({ id: 'farm.soe.title' })}
            variant="elevated"
            padding={{ base: 3, md: 4 }}
            headerAction={
              canWrite && !ofppEditMode ? (
                <StandardButton
                  variant="outline"
                  size="sm"
                  leftIcon={<Icon as={FaEdit} />}
                  onClick={() => {
                    setOfppResponsible(establishmentData.ofpp_responsible_person || '');
                    setOfppDate(establishmentData.fraud_prevention_plan_date || '');
                    setOfppEditMode(true);
                  }}
                >
                  Edit
                </StandardButton>
              ) : undefined
            }
          >
            <VStack spacing={4} align="stretch">
              {/* Status badge row */}
              <HStack spacing={3} align="center">
                <Icon
                  as={FaShieldAlt}
                  color={
                    establishmentData.fraud_prevention_plan_uploaded ? 'green.500' : 'yellow.500'
                  }
                  boxSize={5}
                />
                <Badge
                  colorScheme={
                    establishmentData.fraud_prevention_plan_uploaded ? 'green' : 'yellow'
                  }
                  variant="subtle"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize={{ base: 'xs', md: 'sm' }}
                >
                  {establishmentData.fraud_prevention_plan_uploaded
                    ? intl.formatMessage({ id: 'farm.soe.planUploaded' })
                    : intl.formatMessage({ id: 'farm.soe.planMissing' })}
                </Badge>
              </HStack>

              {/* View mode */}
              {!ofppEditMode && (
                <VStack spacing={3} align="stretch">
                  {!establishmentData.fraud_prevention_plan_uploaded && canWrite && (
                    <Box
                      p={3}
                      bg="yellow.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="yellow.200"
                    >
                      <HStack spacing={3} align="center">
                        <Text fontSize="sm" color="yellow.800" flex={1}>
                          {intl.formatMessage({ id: 'farm.soe.uploadCta' })}
                        </Text>
                        <StandardButton
                          size="sm"
                          onClick={() => {
                            setOfppResponsible(establishmentData.ofpp_responsible_person || '');
                            setOfppDate(establishmentData.fraud_prevention_plan_date || '');
                            setOfppEditMode(true);
                          }}
                        >
                          {intl.formatMessage({ id: 'farm.soe.uploadButton' })}
                        </StandardButton>
                      </HStack>
                    </Box>
                  )}
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 3, md: 4 }}>
                    <InfoRow
                      icon={FaUsers}
                      label="Responsible Person"
                      value={establishmentData.ofpp_responsible_person}
                    />
                    <InfoRow
                      icon={FaCalendar}
                      label="Plan Date"
                      value={establishmentData.fraud_prevention_plan_date}
                    />
                    {establishmentData.fraud_prevention_plan_document && (
                      <HStack spacing={2} align="flex-start">
                        <Icon
                          as={FaFileAlt}
                          color="green.500"
                          boxSize={{ base: 3.5, md: 4 }}
                          mt={1}
                          flexShrink={0}
                        />
                        <Box>
                          <Text
                            fontSize="xs"
                            color="gray.500"
                            textTransform="uppercase"
                            fontWeight="semibold"
                            letterSpacing="0.05em"
                          >
                            {intl.formatMessage({ id: 'farm.soe.documentLabel' })}
                          </Text>
                          <Link
                            href={establishmentData.fraud_prevention_plan_document}
                            isExternal
                            color="green.600"
                            fontWeight="medium"
                            fontSize={{ base: 'sm', md: 'md' }}
                          >
                            {decodeURIComponent(
                              establishmentData.fraud_prevention_plan_document.split('/').pop() ||
                                'View Document'
                            )}
                          </Link>
                        </Box>
                      </HStack>
                    )}
                  </SimpleGrid>
                </VStack>
              )}

              {/* Edit mode */}
              {ofppEditMode && (
                <VStack spacing={3} align="stretch">
                  <Box>
                    <FormLabel
                      fontSize="xs"
                      color="gray.500"
                      textTransform="uppercase"
                      fontWeight="semibold"
                      mb={1}
                    >
                      {intl.formatMessage({ id: 'farm.soe.responsiblePerson' })}
                    </FormLabel>
                    <Input
                      size="sm"
                      value={ofppResponsible}
                      onChange={(e) => setOfppResponsible(e.target.value)}
                      placeholder={intl.formatMessage({
                        id: 'farm.soe.responsiblePersonPlaceholder'
                      })}
                    />
                  </Box>
                  <Box>
                    <FormLabel
                      fontSize="xs"
                      color="gray.500"
                      textTransform="uppercase"
                      fontWeight="semibold"
                      mb={1}
                    >
                      {intl.formatMessage({ id: 'farm.soe.planDate' })}
                    </FormLabel>
                    <Input
                      size="sm"
                      type="date"
                      value={ofppDate}
                      onChange={(e) => setOfppDate(e.target.value)}
                    />
                  </Box>
                  <Box>
                    <FormLabel
                      fontSize="xs"
                      color="gray.500"
                      textTransform="uppercase"
                      fontWeight="semibold"
                      mb={1}
                    >
                      {intl.formatMessage({ id: 'farm.soe.documentLabel' })}
                    </FormLabel>
                    <Box
                      border="2px dashed"
                      borderColor={ofppFile ? 'green.400' : 'gray.300'}
                      borderRadius="lg"
                      bg={ofppFile ? 'green.50' : 'gray.50'}
                      p={4}
                      textAlign="center"
                      cursor="pointer"
                      _hover={{ borderColor: 'green.400', bg: 'green.50' }}
                      transition="all 0.2s"
                      onClick={() => document.getElementById('ofpp-file-input')?.click()}
                    >
                      <input
                        id="ofpp-file-input"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        style={{ display: 'none' }}
                        onChange={(e) => setOfppFile(e.target.files?.[0] || null)}
                      />
                      {ofppFile ? (
                        <HStack justify="center" spacing={2}>
                          <Icon as={FaFileAlt} color="green.500" boxSize={4} />
                          <Text fontSize="sm" color="green.700" fontWeight="medium">
                            {ofppFile.name}
                          </Text>
                          <StandardButton
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              setOfppFile(null);
                            }}
                          >
                            <Icon as={FaTrash} boxSize={3} />
                          </StandardButton>
                        </HStack>
                      ) : (
                        <VStack spacing={1}>
                          <Icon as={FaFileAlt} color="gray.400" boxSize={6} />
                          <Text fontSize="sm" color="gray.500">
                            {intl.formatMessage({ id: 'farm.soe.documentPlaceholder' })}
                          </Text>
                          <Text fontSize="xs" color="gray.400">
                            PDF, DOC, DOCX (max 20MB)
                          </Text>
                        </VStack>
                      )}
                    </Box>
                    <Text fontSize="xs" color="gray.400" mt={1}>
                      {intl.formatMessage({ id: 'farm.soe.documentHelp' })}
                    </Text>
                  </Box>
                  <HStack spacing={2} justify="flex-end">
                    <StandardButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setOfppEditMode(false)}
                    >
                      Cancel
                    </StandardButton>
                    <StandardButton size="sm" isLoading={isSavingOfpp} onClick={handleSaveOfpp}>
                      Save
                    </StandardButton>
                  </HStack>
                </VStack>
              )}

              {/* Regulatory info note */}
              <Box p={3} bg={infoBg} borderRadius="md">
                <Text fontSize="xs" color={infoColor} lineHeight="1.6">
                  {intl.formatMessage({ id: 'farm.soe.regulatoryNote' })}
                </Text>
              </Box>
            </VStack>
          </StandardCard>
        </Box>

        {/* Split Operation (7 CFR 205.272) */}
        <StandardCard
          title={intl.formatMessage({ id: 'farm.split.title' })}
          variant="elevated"
          padding={{ base: 3, md: 4 }}
        >
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between" align="center">
              <Box>
                <Text fontSize="sm" fontWeight="medium" color="gray.700">
                  {intl.formatMessage({ id: 'farm.split.toggleLabel' })}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {intl.formatMessage({ id: 'farm.split.toggleHelp' })}
                </Text>
              </Box>
              <Switch
                colorScheme="green"
                isChecked={establishmentData.has_split_operation || false}
                isDisabled={!canWrite || isSavingSplit}
                onChange={(e) => handleToggleSplitOperation(e.target.checked)}
              />
            </HStack>

            {establishmentData.has_split_operation && (
              <Box>
                <FormLabel
                  fontSize="xs"
                  color="gray.500"
                  textTransform="uppercase"
                  fontWeight="semibold"
                  mb={1}
                >
                  {intl.formatMessage({ id: 'farm.split.planLabel' })}
                </FormLabel>
                {!splitPlanEditMode ? (
                  <VStack spacing={2} align="stretch">
                    {establishmentData.split_operation_plan ? (
                      <Box p={3} bg="gray.50" borderRadius="md">
                        <Text fontSize="sm" color="gray.700" whiteSpace="pre-wrap">
                          {establishmentData.split_operation_plan}
                        </Text>
                      </Box>
                    ) : (
                      <Text fontSize="sm" color="gray.400" fontStyle="italic">
                        {intl.formatMessage({ id: 'farm.split.noPlan' })}
                      </Text>
                    )}
                    {canWrite && (
                      <StandardButton
                        variant="outline"
                        size="sm"
                        leftIcon={<Icon as={FaEdit} />}
                        alignSelf="flex-start"
                        onClick={() => {
                          setSplitPlanText(establishmentData.split_operation_plan || '');
                          setSplitPlanEditMode(true);
                        }}
                      >
                        {establishmentData.split_operation_plan
                          ? intl.formatMessage({ id: 'farm.split.editPlan' })
                          : intl.formatMessage({ id: 'farm.split.addPlan' })}
                      </StandardButton>
                    )}
                  </VStack>
                ) : (
                  <VStack spacing={2} align="stretch">
                    <Textarea
                      size="sm"
                      value={splitPlanText}
                      onChange={(e) => setSplitPlanText(e.target.value)}
                      placeholder={intl.formatMessage({ id: 'farm.split.planPlaceholder' })}
                      rows={4}
                    />
                    <HStack spacing={2} justify="flex-end">
                      <StandardButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setSplitPlanEditMode(false)}
                      >
                        Cancel
                      </StandardButton>
                      <StandardButton
                        size="sm"
                        isLoading={isSavingSplit}
                        onClick={handleSaveSplitPlan}
                      >
                        Save
                      </StandardButton>
                    </HStack>
                  </VStack>
                )}
              </Box>
            )}

            {!establishmentData.has_split_operation && (
              <Box p={3} bg="green.50" borderRadius="md">
                <Text fontSize="xs" color="green.700">
                  {intl.formatMessage({ id: 'farm.split.singleOperation' })}
                </Text>
              </Box>
            )}

            {/* Regulatory info note */}
            <Box p={3} bg={infoBg} borderRadius="md">
              <Text fontSize="xs" color={infoColor} lineHeight="1.6">
                {intl.formatMessage({ id: 'farm.split.regulatoryNote' })}
              </Text>
            </Box>
          </VStack>
        </StandardCard>
      </VStack>

      {farmId && normalizeState(establishmentData?.state) === 'CA' && (
        <PURExportModal
          isOpen={purModalOpen}
          onClose={() => setPurModalOpen(false)}
          establishmentId={farmId}
          establishmentName={establishmentData?.name}
        />
      )}
    </StandardPage>
  );
}

export default ProfileFarm;
