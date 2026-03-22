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
  Image,
  Link,
  Wrap,
  WrapItem,
  useDisclosure,
  useToast,
  Progress,
  Button
} from '@chakra-ui/react';
import {
  FaSeedling,
  FaCalendarAlt,
  FaEdit,
  FaShare,
  FaQrcode,
  FaDownload,
  FaUsers,
  FaLeaf,
  FaClipboardList,
  FaFlag,
  FaTractor,
  FaBuilding,
  FaMapMarkerAlt,
  FaChartLine,
  FaEye
} from 'react-icons/fa';
import { BsStar, BsStarFill } from 'react-icons/bs';
import { MdTimeline, MdLocationOn } from 'react-icons/md';
import { FiDownload } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useUserRole } from 'hooks/useUserRole';
import { useIntl } from 'react-intl';

import { StandardCard, StandardButton, StandardPage, StandardPageLoading } from 'components/Design/StandardComponents';
import { StandardImageGallery } from 'components/ImageGallery';
import { useGetPublicHistoryQuery } from 'store/api/historyApi';
import { useGetTransparencyDetailsQuery } from 'store/api/transparencyQrApi';
import { useGetCompleteSummaryQuery } from 'store/api/carbonApi';
import { config } from 'config/environment';

// Data normalization imports
import { normalizeBackendEventData } from 'utils/eventDataNormalizer';
import { StandardizedEvent } from 'types/standardizedEvents';
import {
  UltraMobileProductionJourney
} from 'views/Scan/ProductDetail/components';

// Week 2 Voice & Mobile Components
import QuickAddEvent from 'views/Dashboard/Dashboard/Production/QuickAddEvent';
import AuditExportModal from 'components/AuditExport/AuditExportModal';

// Type definitions
interface RootState {
  company: {
    currentCompany: {
      establishments: any[];
    };
  };
}

// InfoRow component - matches CompanyInfoTab pattern
interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value?: string | number | null;
  type?: 'text' | 'link' | 'email' | 'phone';
  onClick?: () => void;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value, type = 'text', onClick }) => {
  if (!value) return null;

  const renderValue = () => {
    if (onClick) {
      return (
        <Text
          fontWeight="medium"
          fontSize={{ base: 'sm', md: 'md' }}
          color="green.600"
          cursor="pointer"
          _hover={{ textDecoration: 'underline' }}
          onClick={onClick}
        >
          {value}
        </Text>
      );
    }
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
  colorScheme: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, colorScheme }) => (
  <VStack
    spacing={{ base: 1, md: 2 }}
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
  </VStack>
);

function ProfileProduction() {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();
  const { canWrite } = useUserRole();
  const { establishmentId, productionId, parcelId } = useParams();
  const [establishment, setEstablishment] = useState<any>(null);
  const {
    isOpen: isQuickAddOpen,
    onOpen: onQuickAddOpen,
    onClose: onQuickAddClose
  } = useDisclosure();

  const {
    isOpen: isExportOpen,
    onOpen: onExportOpen,
    onClose: onExportClose
  } = useDisclosure();

  const establishments = useSelector(
    (state: RootState) => state.company.currentCompany?.establishments
  );

  const {
    data: historyData,
    isLoading,
    isError,
    isUninitialized
  } = useGetPublicHistoryQuery(productionId || '', {
    skip: !productionId
  });

  // Transparency API - uses public_id (UUID) as backend expects UUID, not numeric ID
  const {
    data: transparencyApiData,
    isLoading: transparencyLoading
  } = useGetTransparencyDetailsQuery(historyData?.public_id || '', {
    skip: !historyData?.public_id,
    refetchOnMountOrArgChange: true
  });

  // Complete API for timeline data
  const { data: completeData } = useGetCompleteSummaryQuery(productionId || '', {
    skip: !productionId,
    refetchOnMountOrArgChange: true
  });

  // Backend type code to numeric event type mapping
  const mapBackendTypeToEventType = (backendType: string | number | undefined): number => {
    if (typeof backendType === 'number') return backendType;
    if (!backendType) return 3;

    const typeStr = String(backendType).toLowerCase();

    // Weather event subtypes
    if (['fr', 'dr', 'hl', 'ht', 'ts', 'hw', 'hh', 'lh'].includes(typeStr)) return 0;
    // Production event subtypes
    if (['pl', 'ha', 'ir', 'pr', 'tr', 'cu', 'th', 'em'].includes(typeStr)) return 1;
    // Chemical event subtypes
    if (['fe', 'pe', 'fu', 'he'].includes(typeStr)) return 2;

    // String-based type matching
    if (typeStr.includes('weather') || typeStr.includes('frost') || typeStr.includes('drought'))
      return 0;
    if (
      typeStr.includes('production') ||
      typeStr.includes('planting') ||
      typeStr.includes('harvest')
    )
      return 1;
    if (
      typeStr.includes('chemical') ||
      typeStr.includes('fertilizer') ||
      typeStr.includes('pesticide')
    )
      return 2;
    if (typeStr.includes('general')) return 3;
    if (typeStr.includes('equipment') || typeStr.includes('fuel') || typeStr.includes('machinery'))
      return 4;
    if (typeStr.includes('soil') || typeStr.includes('tillage') || typeStr.includes('compost'))
      return 5;
    if (typeStr.includes('pest') || typeStr.includes('beneficial') || typeStr.includes('ipm'))
      return 6;
    if (
      typeStr.includes('business') ||
      typeStr.includes('certification') ||
      typeStr.includes('audit')
    )
      return 7;

    return 3;
  };

  // Get normalized timeline events
  const getUnifiedTimelineEvents = () => {
    const rawEvents =
      completeData?.timeline && completeData.timeline.length > 0
        ? completeData.timeline
        : transparencyApiData?.timeline_events && transparencyApiData.timeline_events.length > 0
        ? transparencyApiData.timeline_events
        : completeData?.events && completeData.events.length > 0
        ? completeData.events
        : [];

    if (Array.isArray(rawEvents) && rawEvents.length > 0) {
      const normalizedEvents = rawEvents.map((event) => {
        const numericEventType = mapBackendTypeToEventType(event.event_type || event.type);
        return normalizeBackendEventData(numericEventType, event);
      });

      // Distribute production-level carbon total across events (CarbonEntry is source of truth)
      const totalCO2e = completeData?.totalEmissions || 0;
      const averageCO2ePerEvent = normalizedEvents.length > 0 ? totalCO2e / normalizedEvents.length : 0;

      const timelineEvents = normalizedEvents.map((event: any, index: number) => {
        const standardizedEvent = event as StandardizedEvent & {
          carbon_data?: any;
          index?: number;
          albums?: any;
        };
        return {
          ...standardizedEvent,
          index: index,
          albums:
            (event as any).albums || (event as any).album ? [(event as any).album] : undefined,
          carbon_data: {
            co2e: averageCO2ePerEvent,
            usda_factors_used: completeData?.isUsdaVerified || false,
            efficiency_score: completeData?.carbonScore || 0,
            total_emissions: totalCO2e,
            total_offsets: completeData?.totalOffsets || 0,
            net_footprint: transparencyApiData?.carbon_impact?.net_impact || 0,
            verification_confidence: ((event as any).verification_confidence ? 'high' : 'low') as
              | 'high'
              | 'medium'
              | 'low',
            cost_analysis: (event as any).cost_analysis || {}
          }
        };
      });

      return timelineEvents;
    }

    // Legacy fallback
    if (historyData?.events && historyData.events.length > 0) {
      return historyData.events.map((event: any, index: number) => ({
        id: event.id?.toString() || `event_${index}`,
        type: event.type || 'general',
        description: event.description || 'Farm Activity',
        observation: event.observation || '',
        date: event.date || new Date().toISOString(),
        certified: event.certified || false,
        index: index,
        blockchain_verified: event.blockchain_verified || false,
        album: event.album || null,
        carbon_data: event.carbon_data || null
      }));
    }

    return [];
  };

  useEffect(() => {
    if (establishments) {
      const found = establishments.filter((est: any) => est.id.toString() === establishmentId)[0];
      setEstablishment(found);
    }
  }, [establishmentId, establishments]);

  // Get transparency score
  const getTransparencyScore = (): number => {
    if (transparencyApiData?.quick_view?.transparency_score?.percentage !== undefined) {
      return transparencyApiData.quick_view.transparency_score.percentage;
    }
    if (historyData?.transparency_score !== undefined && historyData?.transparency_score !== null) {
      return historyData.transparency_score;
    }
    return 0;
  };

  // Format dates
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Download QR code
  const downloadQRCode = async () => {
    try {
      if (!historyData?.id) {
        toast({
          title: 'Error',
          description: 'Production ID not found.',
          status: 'error',
          duration: 3000,
          isClosable: true
        });
        return;
      }

      const response = await fetch(
        `${config.API_BASE_URL}/histories/${historyData.id}/download_qr_code/`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate download URL');
      }

      const data = await response.json();
      window.open(data.download_url, '_blank');

      toast({
        title: 'QR Code Ready',
        description: `Download URL generated. ${data.filename} will open shortly.`,
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to generate download URL.',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  // Share production
  const handleShare = async () => {
    try {
      await navigator.share({
        title: `${historyData?.product?.name || 'Production'} - Production Profile`,
        text: 'Check out this sustainable production! #Trazo #SustainableAgriculture',
        url: window.location.href
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // View public page - use public_id (UUID) for consumer-facing URLs
  const handleViewPublicPage = () => {
    const publicId = historyData?.public_id || productionId;
    window.open(`${config.CONSUMER_BASE_URL}/production/${publicId}`, '_blank');
  };

  // Helper for reputation
  const safeReputation = historyData?.reputation || 0;

  if (isLoading || isUninitialized) {
    return (
      <StandardPage
        showBackButton
        onBack={() =>
          navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`)
        }
      >
        <StandardPageLoading />
      </StandardPage>
    );
  }

  if (isError || !historyData) {
    return (
      <StandardPage
        showBackButton
        onBack={() =>
          navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`)
        }
      >
        <Box py={8} textAlign="center">
          <Text color="red.500">Error loading production data. Please try again.</Text>
        </Box>
      </StandardPage>
    );
  }

  const timelineEvents = getUnifiedTimelineEvents();
  const transparencyScore = getTransparencyScore();

  return (
    <StandardPage
      showBackButton
      onBack={() =>
        navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`)
      }
    >
      <VStack spacing={{ base: 4, md: 8 }} w="100%">
        {/* Identity Section */}
        <StandardCard
          title={intl.formatMessage({ id: 'app.production' })}
          variant="elevated"
          padding={{ base: 3, md: 4 }}
          headerAction={
            <Wrap spacing={1}>
              <WrapItem>
                <StandardButton
                  variant="outline"
                  size="xs"
                  leftIcon={<Icon as={FaEye} />}
                  onClick={handleViewPublicPage}
                >
                  {intl.formatMessage({ id: 'app.viewPublicPage' })}
                </StandardButton>
              </WrapItem>
              <WrapItem>
                <StandardButton
                  variant="outline"
                  size="xs"
                  leftIcon={<Icon as={FaShare} />}
                  onClick={handleShare}
                >
                  {intl.formatMessage({ id: 'app.share' })}
                </StandardButton>
              </WrapItem>
              {canWrite && !historyData?.finish_date && (
                <WrapItem>
                  <StandardButton
                    variant="outline"
                    size="xs"
                    leftIcon={<Icon as={FaEdit} />}
                    onClick={() =>
                      navigate(
                        `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/production/${productionId}/change`
                      )
                    }
                  >
                    {intl.formatMessage({ id: 'app.edit' })}
                  </StandardButton>
                </WrapItem>
              )}
              <WrapItem>
                <StandardButton
                  variant="outline"
                  size="xs"
                  leftIcon={<Icon as={FiDownload} />}
                  onClick={onExportOpen}
                >
                  {intl.formatMessage({ id: 'app.exportForAudit' })}
                </StandardButton>
              </WrapItem>
            </Wrap>
          }
        >
          <HStack spacing={{ base: 3, md: 6 }} align="flex-start" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
            <Avatar
              size={{ base: 'xl', md: '2xl' }}
              src={historyData?.images?.[0]?.url}
              name={historyData?.product?.name || historyData?.name}
              bg="green.500"
              color="white"
              icon={<Icon as={FaSeedling} boxSize={{ base: 7, md: 10 }} />}
            />
            <VStack align="start" spacing={{ base: 1, md: 3 }} flex={1}>
              <Box>
                <Text fontSize={{ base: 'lg', md: '2xl' }} fontWeight="bold" color="gray.800">
                  {historyData?.product?.name || historyData?.name}
                </Text>
                {historyData?.lot_id && (
                  <Text fontSize={{ base: 'xs', md: 'md' }} color="gray.500">
                    Lot ID: {historyData.lot_id}
                  </Text>
                )}
              </Box>
              {historyData?.description && (
                <Text color="gray.600" fontSize={{ base: 'xs', md: 'sm' }} lineHeight="1.6" noOfLines={3}>
                  {historyData.description}
                </Text>
              )}
              <Wrap spacing={1.5}>
                <WrapItem>
                  <Badge
                    colorScheme={historyData?.finish_date ? 'gray' : 'green'}
                    variant="subtle"
                    px={2}
                    py={0.5}
                    borderRadius="full"
                    fontSize="xs"
                  >
                    {historyData?.finish_date ? 'Finished' : 'Active'}
                  </Badge>
                </WrapItem>
                {historyData?.is_outdoor !== undefined && (
                  <WrapItem>
                    <Badge colorScheme="green" variant="subtle" px={2} py={0.5} borderRadius="full" fontSize="xs">
                      <HStack spacing={1}>
                        <Icon as={FaSeedling} boxSize={2.5} />
                        <Text>{historyData.is_outdoor ? intl.formatMessage({ id: 'production.outdoor' }) : intl.formatMessage({ id: 'production.indoor' })}</Text>
                      </HStack>
                    </Badge>
                  </WrapItem>
                )}
                {historyData?.qr_code && (
                  <WrapItem>
                    <Badge colorScheme="blue" variant="subtle" px={2} py={0.5} borderRadius="full" fontSize="xs">
                      <HStack spacing={1}>
                        <Icon as={FaQrcode} boxSize={2.5} />
                        <Text>QR Available</Text>
                      </HStack>
                    </Badge>
                  </WrapItem>
                )}
                {historyData?.published && (
                  <WrapItem>
                    <Badge colorScheme="purple" variant="subtle" px={2} py={0.5} borderRadius="full" fontSize="xs">
                      Published
                    </Badge>
                  </WrapItem>
                )}
              </Wrap>
            </VStack>
          </HStack>
        </StandardCard>

        {/* Photo Gallery Section */}
        {historyData?.images && historyData.images.length > 0 && (
          <StandardCard title="Photo Gallery" variant="elevated" padding={{ base: 3, md: 4 }}>
            <StandardImageGallery
              images={historyData.images}
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
        <StandardCard title="Quick Stats" variant="elevated" padding={{ base: 3, md: 4 }}>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 2, md: 4 }}>
            <StatCard
              icon={FaSeedling}
              value={historyData?.is_outdoor ? intl.formatMessage({ id: 'production.outdoor' }) : historyData?.is_outdoor === false ? intl.formatMessage({ id: 'production.indoor' }) : intl.formatMessage({ id: 'production.general' })}
              label={intl.formatMessage({ id: 'production.environment' })}
              colorScheme="green"
            />
            <StatCard
              icon={FaLeaf}
              value={
                transparencyScore > 0
                  ? `${Math.round(transparencyScore)}%`
                  : transparencyLoading
                  ? '...'
                  : '0%'
              }
              label="Transparency"
              colorScheme="green"
            />
            <StatCard
              icon={FaClipboardList}
              value={timelineEvents.length || 0}
              label="Events"
              colorScheme="purple"
            />
            <StatCard
              icon={FaFlag}
              value={historyData?.finish_date ? 'Finished' : 'Active'}
              label="Status"
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
              {intl.formatMessage({ id: 'production.viewTransparencyDetails' })}
            </StandardButton>
          </HStack>
        </StandardCard>

        {/* QR Code & Consumer Access - Prominent position for packaging workflow */}
        {historyData?.qr_code && (
          <StandardCard title="QR Code & Consumer Access" variant="elevated" padding={{ base: 3, md: 4 }}>
            <VStack spacing={{ base: 3, md: 5 }} align="center">
              {/* Finished production banner */}
              {historyData?.finish_date && (
                <Box
                  w="full"
                  p={{ base: 2, md: 3 }}
                  bg="green.50"
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="green.200"
                  textAlign="center"
                >
                  <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="semibold" color="green.700">
                    Your production is complete! Print this QR code and attach it to your
                    packaging.
                  </Text>
                </Box>
              )}

              {/* QR Image Preview */}
              <Box
                p={{ base: 3, md: 4 }}
                bg="gray.50"
                borderRadius="xl"
                border="1px solid"
                borderColor="gray.200"
              >
                <Image
                  src={historyData.qr_code}
                  alt={`QR Code for ${historyData?.product?.name || 'production'}`}
                  maxW={{ base: '180px', md: '280px' }}
                  borderRadius="md"
                  fallback={
                    <VStack spacing={2} p={8}>
                      <Icon as={FaQrcode} boxSize={12} color="gray.300" />
                      <Text fontSize="sm" color="gray.400">
                        Loading QR...
                      </Text>
                    </VStack>
                  }
                />
              </Box>

              {/* Description */}
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" textAlign="center" maxW="400px">
                {historyData?.finish_date
                  ? 'Print this QR and attach it to your packaging so consumers can see your production\'s transparency journey.'
                  : 'Your QR code is ready. Consumers can scan it to view your production\'s transparency details.'}
              </Text>

              {/* Action buttons */}
              <HStack spacing={2} flexWrap="wrap" justify="center">
                <StandardButton
                  variant="primary"
                  size={{ base: 'xs', md: 'sm' }}
                  leftIcon={<Icon as={FaDownload} />}
                  onClick={downloadQRCode}
                >
                  Download QR
                </StandardButton>
                <StandardButton
                  variant="outline"
                  size={{ base: 'xs', md: 'sm' }}
                  leftIcon={<Icon as={FaEye} />}
                  onClick={handleViewPublicPage}
                >
                  View Public Page
                </StandardButton>
              </HStack>

              {/* Print tip */}
              <Box
                w="full"
                p={{ base: 2, md: 3 }}
                bg="blue.50"
                borderRadius="md"
                border="1px solid"
                borderColor="blue.100"
              >
                <Text fontSize="xs" color="blue.700" textAlign="center">
                  Tip: Print at minimum 2.5cm (1 inch) for best scanning results. Download
                  the high-resolution PNG for print quality.
                </Text>
              </Box>
            </VStack>
          </StandardCard>
        )}

        {/* Production Details Section */}
        <StandardCard title="Production Details" variant="elevated" padding={{ base: 3, md: 4 }}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 3, md: 6 }}>
            <InfoRow icon={FaSeedling} label="Product" value={historyData?.product?.name} />
            <InfoRow
              icon={FaTractor}
              label="Type"
              value={
                historyData?.type === 'OR'
                  ? 'Orchard'
                  : historyData?.type === 'GA'
                  ? 'Garden'
                  : historyData?.type
                  ? historyData.type
                  : intl.formatMessage({ id: 'production.agriculturalProduction' })
              }
            />
            <InfoRow
              icon={FaCalendarAlt}
              label="Start Date"
              value={formatDate(historyData?.start_date)}
            />
            <InfoRow
              icon={FaCalendarAlt}
              label="End Date"
              value={historyData?.finish_date ? formatDate(historyData.finish_date) : 'In Progress'}
            />
            {historyData?.production_amount && (
              <InfoRow
                icon={FaClipboardList}
                label="Production Amount"
                value={`${historyData.production_amount} ${historyData.production_unit || 'units'}`}
              />
            )}
            {historyData?.earning && (
              <InfoRow
                icon={FaChartLine}
                label="Revenue"
                value={`$${historyData.earning.toLocaleString()}`}
              />
            )}
            <InfoRow
              icon={FaLeaf}
              label={intl.formatMessage({ id: 'production.environment' })}
              value={historyData?.is_outdoor ? intl.formatMessage({ id: 'production.outdoor' }) : intl.formatMessage({ id: 'production.indoor' })}
            />
          </SimpleGrid>
        </StandardCard>

        {/* Agricultural Information Section */}
        {(historyData?.age_of_plants ||
          historyData?.number_of_plants ||
          historyData?.soil_ph ||
          historyData?.crop_type) && (
          <StandardCard title="Agricultural Information" variant="elevated" padding={{ base: 3, md: 4 }}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 3, md: 6 }}>
              {historyData?.age_of_plants && (
                <InfoRow icon={FaSeedling} label="Plant Age" value={historyData.age_of_plants} />
              )}
              {historyData?.number_of_plants && (
                <InfoRow
                  icon={FaSeedling}
                  label="Number of Plants"
                  value={historyData.number_of_plants.toLocaleString()}
                />
              )}
              {historyData?.soil_ph && (
                <InfoRow icon={FaLeaf} label="Soil pH" value={historyData.soil_ph} />
              )}
              {historyData?.crop_type && (
                <InfoRow icon={FaSeedling} label="Crop Type" value={historyData.crop_type} />
              )}
            </SimpleGrid>
          </StandardCard>
        )}

        {/* Location Section */}
        <StandardCard title="Location" variant="elevated" padding={{ base: 3, md: 4 }}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 3, md: 6 }}>
            <InfoRow
              icon={FaBuilding}
              label="Establishment"
              value={historyData?.parcel?.establishment?.name || 'Unknown'}
              onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}`)}
            />
            <InfoRow
              icon={MdLocationOn}
              label="Parcel"
              value={historyData?.parcel?.name || 'Unknown'}
              onClick={() =>
                navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`)
              }
            />
            {historyData?.parcel?.establishment?.location && (
              <InfoRow
                icon={FaMapMarkerAlt}
                label="Address"
                value={historyData.parcel.establishment.location}
              />
            )}
          </SimpleGrid>
        </StandardCard>

        {/* Reputation & Operator Section */}
        <StandardCard title="Reputation & Operator" variant="elevated" padding={{ base: 3, md: 4 }}>
          <VStack spacing={{ base: 3, md: 6 }} align="stretch">
            <Box>
              <Text
                fontSize="xs"
                color="gray.500"
                textTransform="uppercase"
                fontWeight="semibold"
                mb={1}
              >
                Reputation Score
              </Text>
              <HStack spacing={2}>
                <HStack spacing={0.5}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Icon
                      key={star}
                      as={star <= safeReputation ? BsStarFill : BsStar}
                      color={star <= safeReputation ? 'yellow.400' : 'gray.300'}
                      boxSize={{ base: 4, md: 5 }}
                    />
                  ))}
                </HStack>
                <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" fontWeight="medium">
                  ({safeReputation.toFixed(1)}/5.0)
                </Text>
              </HStack>
            </Box>

            {historyData?.operator && (
              <Box p={{ base: 3, md: 4 }} bg="gray.50" borderRadius="lg">
                <Text
                  fontSize="xs"
                  color="gray.500"
                  textTransform="uppercase"
                  fontWeight="semibold"
                  mb={1}
                >
                  Operator
                </Text>
                <HStack spacing={2}>
                  <Avatar
                    size="sm"
                    name={historyData.operator.full_name || historyData.operator.email}
                  />
                  <VStack spacing={0} align="start" minW={0}>
                    <Text fontWeight="medium" fontSize={{ base: 'sm', md: 'md' }} noOfLines={1}>
                      {historyData.operator.full_name || 'Unnamed Operator'}
                    </Text>
                    <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500" noOfLines={1}>
                      {historyData.operator.email}
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            )}

          </VStack>
        </StandardCard>

        {/* Production Timeline Section */}

          {timelineEvents.length > 0 ? (
            <UltraMobileProductionJourney
              events={timelineEvents}
              transparencyScore={Math.round(transparencyScore)}
            />
          ) : (
            <VStack spacing={{ base: 2, md: 4 }} py={{ base: 4, md: 8 }}>
              <Icon as={MdTimeline} boxSize={{ base: 10, md: 16 }} color="gray.400" />
              <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="medium" color="gray.600">
                No events recorded yet
              </Text>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.400" textAlign="center">
                Events will appear here as the production progresses
              </Text>
              {canWrite && !historyData?.finish_date && (
                <Button
                  leftIcon={<Icon as={FaSeedling} />}
                  colorScheme="green"
                  size="lg"
                  onClick={onQuickAddOpen}
                  mt={4}
                >
                  Add Your First Event
                </Button>
              )}
              {historyData?.finish_date && (
                <Text fontSize="sm" color="gray.500" mt={4} textAlign="center">
                  This production is finished. Events cannot be added to completed productions.
                </Text>
              )}
            </VStack>
          )}

        {/* Production Summary Section */}
        <StandardCard title="Production Summary" variant="elevated" padding={{ base: 3, md: 4 }}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 3, md: 6 }}>
            <VStack align="start" spacing={{ base: 2, md: 4 }}>
              <Box w="full">
                <Text
                  fontSize="xs"
                  color="gray.500"
                  textTransform="uppercase"
                  fontWeight="semibold"
                  mb={1}
                >
                  Production Status
                </Text>
                <Badge
                  colorScheme={historyData?.finish_date ? 'green' : 'yellow'}
                  variant="subtle"
                  fontSize={{ base: 'xs', md: 'sm' }}
                  px={3}
                  py={0.5}
                  borderRadius="full"
                >
                  {historyData?.finish_date ? 'Completed' : 'In Progress'}
                </Badge>
              </Box>
              {historyData?.start_date && historyData?.finish_date && (
                <Box w="full">
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    textTransform="uppercase"
                    fontWeight="semibold"
                    mb={1}
                  >
                    Duration
                  </Text>
                  <Text fontWeight="medium" fontSize={{ base: 'sm', md: 'md' }}>
                    {Math.ceil(
                      (new Date(historyData.finish_date).getTime() -
                        new Date(historyData.start_date).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}{' '}
                    days
                  </Text>
                </Box>
              )}
            </VStack>
            <VStack align="start" spacing={{ base: 2, md: 4 }}>
              <Box w="full">
                <Text
                  fontSize="xs"
                  color="gray.500"
                  textTransform="uppercase"
                  fontWeight="semibold"
                  mb={1}
                >
                  Events Recorded
                </Text>
                <Text fontWeight="bold" fontSize={{ base: 'lg', md: 'xl' }} color="green.600">
                  {timelineEvents.length || 0} {(timelineEvents.length || 0) === 1 ? 'Event' : 'Events'}
                </Text>
              </Box>
              {timelineEvents.length > 0 && (
                <Box w="full">
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    textTransform="uppercase"
                    fontWeight="semibold"
                    mb={1}
                  >
                    Timeline Progress
                  </Text>
                  <HStack spacing={2}>
                    <Progress
                      value={historyData.finish_date ? 100 : 50}
                      colorScheme="green"
                      size={{ base: 'sm', md: 'md' }}
                      borderRadius="full"
                      flex={1}
                    />
                    <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" minW="40px">
                      {historyData.finish_date ? '100%' : '50%'}
                    </Text>
                  </HStack>
                </Box>
              )}
            </VStack>
          </SimpleGrid>
        </StandardCard>
      </VStack>

      {/* Quick Add Event Modal */}
      <QuickAddEvent
        isOpen={isQuickAddOpen}
        onClose={onQuickAddClose}
        cropType={historyData?.product?.name || 'citrus'}
        onEventAdded={(eventData) => {
          console.log('New event added:', eventData);
          window.location.reload();
        }}
      />

      {/* Audit Export Modal */}
      <AuditExportModal
        isOpen={isExportOpen}
        onClose={onExportClose}
        productionId={historyData?.public_id || productionId || ''}
        productionName={historyData?.product?.name || historyData?.name || ''}
      />
    </StandardPage>
  );
}

export default ProfileProduction;
