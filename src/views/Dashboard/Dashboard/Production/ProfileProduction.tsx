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
  Button,
  Heading,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton
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
  FaEye,
  FaLink,
  FaTag,
  FaEllipsisV
} from 'react-icons/fa';
import { BsStar, BsStarFill } from 'react-icons/bs';
import { MdTimeline, MdLocationOn } from 'react-icons/md';
import { FiDownload } from 'react-icons/fi';
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
import { StandardImageGallery } from 'components/ImageGallery';
import { useGetPublicHistoryQuery, useUpdateProductionMutation } from 'store/api/historyApi';
import { TrazoImageUpload } from 'components/Upload';
import { useGetTransparencyDetailsQuery } from 'store/api/transparencyQrApi';
import { useGetCompleteSummaryQuery } from 'store/api/carbonApi';
import { config } from 'config/environment';

// Data normalization imports
import { normalizeBackendEventData } from 'utils/eventDataNormalizer';
import { StandardizedEvent } from 'types/standardizedEvents';
import { UltraMobileProductionJourney } from 'views/Scan/ProductDetail/components';

// Week 2 Voice & Mobile Components
import QuickAddEvent from 'views/Dashboard/Dashboard/Production/QuickAddEvent';
import { SalesDeliverySection } from 'views/Dashboard/Dashboard/Production/SalesDeliverySection';
import { SalesRecordsSection } from 'views/Dashboard/Dashboard/Production/SalesRecordsSection';
import AuditExportModal from 'components/AuditExport/AuditExportModal';
import DriftFindingsBanner from 'components/Compliance/DriftFindingsBanner';

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
        <Button
          variant="link"
          fontWeight="medium"
          fontSize={{ base: 'sm', md: 'md' }}
          color="green.700"
          px={0}
          minW={0}
          height="auto"
          whiteSpace="normal"
          textAlign="left"
          justifyContent="flex-start"
          _hover={{ textDecoration: 'underline' }}
          onClick={onClick}
        >
          {value}
        </Button>
      );
    }
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
  const { farmId, productionId, parcelId } = useParams();
  const [establishment, setEstablishment] = useState<any>(null);
  const [updateProduction, { isLoading: isSavingCover }] = useUpdateProductionMutation();
  const {
    isOpen: isQuickAddOpen,
    onOpen: onQuickAddOpen,
    onClose: onQuickAddClose
  } = useDisclosure();

  const { isOpen: isExportOpen, onOpen: onExportOpen, onClose: onExportClose } = useDisclosure();

  const establishments = useSelector(
    (state: RootState) => state.company.currentCompany?.establishments
  );

  const {
    data: historyData,
    isLoading,
    isError,
    isUninitialized,
    refetch: refetchHistory
  } = useGetPublicHistoryQuery(productionId || '', {
    skip: !productionId
  });

  // Transparency API - uses public_id (UUID) as backend expects UUID, not numeric ID
  const {
    data: transparencyApiData,
    isLoading: transparencyLoading,
    refetch: refetchTransparency
  } = useGetTransparencyDetailsQuery(historyData?.public_id || '', {
    skip: !historyData?.public_id,
    refetchOnMountOrArgChange: true
  });

  // Complete API for timeline data
  const { data: completeData, refetch: refetchComplete } = useGetCompleteSummaryQuery(
    productionId || '',
    {
      skip: !productionId,
      refetchOnMountOrArgChange: true
    }
  );

  // Consumer QR hero/cover photo. Persists History.cover_image_url, which the
  // public serializer surfaces first in `images` (-> the hero background + lead
  // gallery photo). PATCH resolves the production by public_id (HistoryViewSet
  // .get_object accepts the UUID). Pass null to clear and fall back to auto-pick.
  const persistCover = async (coverUrl: string | null, successMessage: string) => {
    const historyId = historyData?.public_id || productionId;
    if (!historyId) return;
    try {
      await updateProduction({ historyId, cover_image_url: coverUrl }).unwrap();
      toast({ title: successMessage, status: 'success', duration: 3000, isClosable: true });
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'app.errorUpdating', defaultMessage: 'Update failed' }),
        description: intl.formatMessage({
          id: 'production.cover.error',
          defaultMessage: 'Could not update the cover photo. Please try again.'
        }),
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    }
  };

  const handleSetCover = (urls: string[]) => {
    const url = urls?.[0];
    if (!url) return;
    persistCover(
      url,
      intl.formatMessage({ id: 'production.cover.updated', defaultMessage: 'Cover photo updated' })
    );
  };

  const handleClearCover = () =>
    persistCover(
      null,
      intl.formatMessage({
        id: 'production.cover.cleared',
        defaultMessage: 'Cover cleared — using the first photo automatically'
      })
    );

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
      const averageCO2ePerEvent =
        normalizedEvents.length > 0 ? totalCO2e / normalizedEvents.length : 0;

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
      const found = establishments.filter((est: any) => est.id.toString() === farmId)[0];
      setEstablishment(found);
    }
  }, [farmId, establishments]);

  // Get transparency score — freshly calculated only.
  //
  // The `historyData.transparency_score` fallback was removed: that DB column is only
  // refreshed by update_trust_metrics() on event CRUD and drifts from the calculator
  // (production 543 in dev stored 75.0 while the calculator returned 74). Falling back to it
  // meant this page could quietly disagree with the transparency dashboard by a point or two.
  //
  // Returns null rather than 0 when the score has not loaded or does not exist yet, so the
  // caller can say "not started" instead of rendering a 0% that reads as a failing grade.
  const getTransparencyScore = (): number | null => {
    const percentage = transparencyApiData?.quick_view?.transparency_score?.percentage;
    return percentage === undefined || percentage === null ? null : percentage;
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
      const downloadId = historyData?.public_id || productionId;
      if (!downloadId) {
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
        `${config.API_BASE_URL}/histories/${downloadId}/download_qr_code/`,
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

  // Download printable lot tags PDF (SOE § 205.307 nonretail container labels).
  // Same authenticated-fetch pattern as downloadQRCode, but the endpoint streams
  // the PDF directly (Content-Disposition: attachment), so we save it as a blob.
  const handleDownloadLotTag = async () => {
    try {
      const downloadId = historyData?.public_id || productionId;
      if (!downloadId) {
        toast({
          title: 'Error',
          description: 'Production ID not found.',
          status: 'error',
          duration: 3000,
          isClosable: true
        });
        return;
      }

      const response = await fetch(`${config.API_BASE_URL}/histories/${downloadId}/lot-tag/`, {
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        let message = 'Failed to generate lot tag PDF';
        try {
          const errorData = await response.json();
          message = errorData.error || message;
        } catch {
          // Non-JSON error body — keep the default message
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `lot-tags-${historyData?.lot_id || downloadId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: intl.formatMessage({ id: 'production.lotTag.toastSuccessTitle' }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Error downloading lot tag:', error);
      toast({
        title: intl.formatMessage({ id: 'production.lotTag.toastErrorTitle' }),
        description: error instanceof Error ? error.message : undefined,
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
        title: intl.formatMessage(
          { id: 'production.share.title', defaultMessage: '{name} — Trazo production record' },
          { name: historyData?.product?.name || historyData?.name || 'Production' }
        ),
        text: intl.formatMessage({
          id: 'production.share.text',
          defaultMessage: 'See the documented production journey for this lot on Trazo. #Trazo #Traceability'
        }),
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

  // Copy buyer link - proof view of the same public page for buyers/retailers
  const handleCopyBuyerLink = async () => {
    const publicId = historyData?.public_id || productionId;
    const url = `${config.CONSUMER_BASE_URL}/production/${publicId}?view=proof`;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(url);
      toast({
        title: intl.formatMessage({ id: 'production.copyBuyerLink.toastTitle' }),
        description: intl.formatMessage({ id: 'production.copyBuyerLink.toastDescription' }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      // Insecure context or denied permission - let the user copy manually
      window.prompt('Copy this link', url);
    }
  };

  // Helper for reputation
  const safeReputation = historyData?.reputation || 0;

  if (isLoading || isUninitialized) {
    return (
      <StandardPage
        showBackButton
        onBack={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`)}
      >
        <StandardPageLoading />
      </StandardPage>
    );
  }

  if (isError || !historyData) {
    return (
      <StandardPage
        showBackButton
        onBack={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`)}
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
      onBack={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`)}
    >
      <VStack spacing={{ base: 4, md: 8 }} w="100%">
        {/* Identity Section */}
        <StandardCard
          variant="elevated"
          padding={{ base: 3, md: 4 }}
          headerAction={
            <Wrap spacing={1} justify={{ base: 'flex-start', md: 'flex-end' }}>
              {/* Primary wedge action + the buyer handoff stay visible; secondary
                  actions collapse into an overflow menu to reduce header clutter. */}
              <WrapItem>
                <StandardButton
                  variant="primary"
                  size="xs"
                  leftIcon={<Icon as={FiDownload} />}
                  onClick={onExportOpen}
                >
                  {intl.formatMessage({ id: 'app.exportForAudit' })}
                </StandardButton>
              </WrapItem>
              <WrapItem>
                <StandardButton
                  variant="outline"
                  size="xs"
                  leftIcon={<Icon as={FaLink} />}
                  onClick={handleCopyBuyerLink}
                >
                  {intl.formatMessage({ id: 'production.copyBuyerLink.button' })}
                </StandardButton>
              </WrapItem>
              <WrapItem>
                <Menu placement="bottom-end" autoSelect={false}>
                  <MenuButton
                    as={IconButton}
                    variant="outline"
                    size="xs"
                    minH="32px"
                    aria-label={intl.formatMessage({
                      id: 'production.moreActions',
                      defaultMessage: 'More actions'
                    })}
                    icon={<Icon as={FaEllipsisV} />}
                  />
                  <MenuList>
                    <MenuItem icon={<Icon as={FaEye} />} onClick={handleViewPublicPage}>
                      {intl.formatMessage({ id: 'app.viewPublicPage' })}
                    </MenuItem>
                    <MenuItem icon={<Icon as={FaShare} />} onClick={handleShare}>
                      {intl.formatMessage({ id: 'app.share' })}
                    </MenuItem>
                    <MenuItem
                      icon={<Icon as={FaTag} />}
                      onClick={handleDownloadLotTag}
                      isDisabled={!historyData?.lot_id}
                    >
                      {intl.formatMessage({ id: 'production.lotTag.button' })}
                    </MenuItem>
                    {canWrite && !historyData?.finish_date && (
                      <MenuItem
                        icon={<Icon as={FaEdit} />}
                        onClick={() =>
                          navigate(
                            `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/production/${productionId}/change`
                          )
                        }
                      >
                        {intl.formatMessage({ id: 'app.edit' })}
                      </MenuItem>
                    )}
                  </MenuList>
                </Menu>
              </WrapItem>
            </Wrap>
          }
        >
          <HStack
            spacing={{ base: 3, md: 6 }}
            align="flex-start"
            flexWrap={{ base: 'wrap', md: 'nowrap' }}
          >
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
                <Heading
                  as="h1"
                  fontSize={{ base: 'lg', md: '2xl' }}
                  fontWeight="bold"
                  color="gray.800"
                >
                  {historyData?.product?.name || historyData?.name}
                </Heading>
                {historyData?.lot_id && (
                  <Text fontSize={{ base: 'xs', md: 'md' }} color="gray.500">
                    Lot ID: {historyData.lot_id}
                  </Text>
                )}
              </Box>
              {historyData?.description && (
                <Text
                  color="gray.600"
                  fontSize={{ base: 'xs', md: 'sm' }}
                  lineHeight="1.6"
                  noOfLines={3}
                >
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
                    {historyData?.finish_date
                      ? intl.formatMessage({ id: 'production.status.finished', defaultMessage: 'Finished' })
                      : intl.formatMessage({ id: 'production.status.active', defaultMessage: 'Active' })}
                  </Badge>
                </WrapItem>
                {historyData?.is_outdoor !== undefined && (
                  <WrapItem>
                    <Badge
                      colorScheme="green"
                      variant="subtle"
                      px={2}
                      py={0.5}
                      borderRadius="full"
                      fontSize="xs"
                    >
                      <HStack spacing={1}>
                        <Icon as={FaSeedling} boxSize={2.5} />
                        <Text>
                          {historyData.is_outdoor
                            ? intl.formatMessage({ id: 'production.outdoor' })
                            : intl.formatMessage({ id: 'production.indoor' })}
                        </Text>
                      </HStack>
                    </Badge>
                  </WrapItem>
                )}
                {historyData?.qr_code && (
                  <WrapItem>
                    <Badge
                      colorScheme="blue"
                      variant="subtle"
                      px={2}
                      py={0.5}
                      borderRadius="full"
                      fontSize="xs"
                    >
                      <HStack spacing={1}>
                        <Icon as={FaQrcode} boxSize={2.5} />
                        <Text>
                          {intl.formatMessage({
                            id: 'production.badge.qrAvailable',
                            defaultMessage: 'QR Available'
                          })}
                        </Text>
                      </HStack>
                    </Badge>
                  </WrapItem>
                )}
                {historyData?.published && (
                  <WrapItem>
                    <Badge
                      colorScheme="purple"
                      variant="subtle"
                      px={2}
                      py={0.5}
                      borderRadius="full"
                      fontSize="xs"
                    >
                      {intl.formatMessage({
                        id: 'production.badge.published',
                        defaultMessage: 'Published'
                      })}
                    </Badge>
                  </WrapItem>
                )}
              </Wrap>
            </VStack>
          </HStack>
        </StandardCard>

        {/* Photo Gallery Section */}
        {historyData?.images && historyData.images.length > 0 && (
          <StandardCard
            title={intl.formatMessage({
              id: 'production.section.photoGallery',
              defaultMessage: 'Photo Gallery'
            })}
            variant="elevated"
            padding={{ base: 3, md: 4 }}
          >
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

        {/* Cover Photo Section (consumer QR hero) — write access only */}
        {canWrite && (
          <StandardCard
            title={intl.formatMessage({
              id: 'production.cover.title',
              defaultMessage: 'Cover Photo'
            })}
            variant="elevated"
            padding={{ base: 3, md: 4 }}
          >
            <VStack align="stretch" spacing={4}>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                {intl.formatMessage({
                  id: 'production.cover.help',
                  defaultMessage:
                    'Shown as the hero image at the top of the public QR page. Upload a photo to set it; leave it empty to auto-pick the first timeline photo.'
                })}
              </Text>

              <HStack spacing={4} align="start" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
                {/* Current cover preview */}
                <Box flexShrink={0}>
                  <Text fontSize="xs" color="gray.500" mb={1}>
                    {intl.formatMessage({
                      id: 'production.cover.current',
                      defaultMessage: 'Current cover'
                    })}
                  </Text>
                  {historyData?.cover_image_url ? (
                    <Image
                      src={historyData.cover_image_url}
                      alt={intl.formatMessage({
                        id: 'production.cover.title',
                        defaultMessage: 'Cover Photo'
                      })}
                      borderRadius="lg"
                      objectFit="cover"
                      boxSize={{ base: '120px', md: '140px' }}
                      border="1px solid"
                      borderColor="gray.200"
                    />
                  ) : (
                    <Box
                      boxSize={{ base: '120px', md: '140px' }}
                      borderRadius="lg"
                      border="1px dashed"
                      borderColor="gray.300"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      bg="gray.50"
                    >
                      <Text fontSize="xs" color="gray.500" textAlign="center" px={2}>
                        {intl.formatMessage({
                          id: 'production.cover.auto',
                          defaultMessage: 'Auto (first photo)'
                        })}
                      </Text>
                    </Box>
                  )}
                </Box>

                {/* Uploader — emits a permanent S3 URL, persisted as the cover */}
                <Box flex={1} minW={{ base: '100%', md: '240px' }}>
                  <TrazoImageUpload
                    maxFiles={1}
                    maxSize={5 * 1024 * 1024}
                    existingImages={[]}
                    onImagesChange={handleSetCover}
                    isLoading={isSavingCover}
                  />
                </Box>
              </HStack>

              {historyData?.cover_image_url && (
                <HStack>
                  <StandardButton
                    variant="outline"
                    size="sm"
                    onClick={handleClearCover}
                    isLoading={isSavingCover}
                  >
                    {intl.formatMessage({
                      id: 'production.cover.reset',
                      defaultMessage: 'Reset to auto-pick'
                    })}
                  </StandardButton>
                </HStack>
              )}
            </VStack>
          </StandardCard>
        )}

        {/* Sprint 5.1 — OSP ↔ events drift summary (only renders if findings present).
            Surfaced high (above Quick Stats) so any compliance action is seen first. */}
        <DriftFindingsBanner events={timelineEvents as any[]} />

        {/* Quick Stats Section */}
        <StandardCard
          title={intl.formatMessage({
            id: 'production.section.quickStats',
            defaultMessage: 'Quick Stats'
          })}
          variant="elevated"
          padding={{ base: 3, md: 4 }}
        >
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 2, md: 4 }}>
            <StatCard
              icon={FaSeedling}
              value={
                historyData?.is_outdoor
                  ? intl.formatMessage({ id: 'production.outdoor' })
                  : historyData?.is_outdoor === false
                  ? intl.formatMessage({ id: 'production.indoor' })
                  : intl.formatMessage({ id: 'production.general' })
              }
              label={intl.formatMessage({ id: 'production.environment' })}
              colorScheme="green"
            />
            <StatCard
              icon={FaLeaf}
              value={
                transparencyLoading
                  ? '...'
                  : transparencyScore === null
                  ? intl.formatMessage({
                      id: 'dashboard.trustScore.notStarted',
                      defaultMessage: 'Not started'
                    })
                  : `${Math.round(transparencyScore)}%`
              }
              label={intl.formatMessage({ id: 'production.stat.transparency', defaultMessage: 'Transparency' })}
              colorScheme="green"
            />
            <StatCard
              icon={FaClipboardList}
              value={timelineEvents.length || 0}
              label={intl.formatMessage({ id: 'production.stat.events', defaultMessage: 'Events' })}
              colorScheme="purple"
            />
            <StatCard
              icon={FaFlag}
              value={historyData?.finish_date
                      ? intl.formatMessage({ id: 'production.status.finished', defaultMessage: 'Finished' })
                      : intl.formatMessage({ id: 'production.status.active', defaultMessage: 'Active' })}
              label={intl.formatMessage({ id: 'production.stat.status', defaultMessage: 'Status' })}
              colorScheme="orange"
            />
          </SimpleGrid>
          <HStack justify="flex-end" mt={{ base: 2, md: 3 }}>
            <StandardButton
              variant="ghost"
              size="sm"
              leftIcon={<Icon as={FaChartLine} />}
              onClick={() => navigate(`/admin/dashboard/farm/${farmId}/transparency`)}
            >
              {intl.formatMessage({ id: 'production.viewTransparencyDetails' })}
            </StandardButton>
          </HStack>
        </StandardCard>

        {/* QR Code & Consumer Access - Prominent position for packaging workflow */}
        {historyData?.qr_code && (
          <StandardCard
            title={intl.formatMessage({
              id: 'production.section.qrAccess',
              defaultMessage: 'QR Code & Consumer Access'
            })}
            variant="elevated"
            padding={{ base: 3, md: 4 }}
          >
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
                    {intl.formatMessage({
                      id: 'production.qr.completeBanner',
                      defaultMessage:
                        'Your production is complete! Print this QR code and attach it to your packaging.'
                    })}
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
                      <Text fontSize="sm" color="gray.500">
                        {intl.formatMessage({
                          id: 'production.qr.loading',
                          defaultMessage: 'Loading QR...'
                        })}
                      </Text>
                    </VStack>
                  }
                />
              </Box>

              {/* Description */}
              <Text
                fontSize={{ base: 'xs', md: 'sm' }}
                color="gray.600"
                textAlign="center"
                maxW="400px"
              >
                {historyData?.finish_date
                  ? intl.formatMessage({
                      id: 'production.qr.instruction',
                      defaultMessage:
                        "Print this QR and attach it to your packaging so consumers can see your production's transparency journey."
                    })
                  : intl.formatMessage({
                      id: 'production.qr.instructionActive',
                      defaultMessage:
                        "Your QR code is ready. Consumers can scan it to view your production's transparency details."
                    })}
              </Text>

              {/* Action buttons */}
              <HStack spacing={2} flexWrap="wrap" justify="center">
                <StandardButton
                  variant="primary"
                  size={{ base: 'xs', md: 'sm' }}
                  leftIcon={<Icon as={FaDownload} />}
                  onClick={downloadQRCode}
                >
                  {intl.formatMessage({
                    id: 'production.qr.download',
                    defaultMessage: 'Download QR'
                  })}
                </StandardButton>
                <StandardButton
                  variant="outline"
                  size={{ base: 'xs', md: 'sm' }}
                  leftIcon={<Icon as={FaEye} />}
                  onClick={handleViewPublicPage}
                >
                  {intl.formatMessage({ id: 'app.viewPublicPage' })}
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
                  {intl.formatMessage({
                    id: 'production.qr.tip',
                    defaultMessage:
                      'Tip: Print at minimum 2.5cm (1 inch) for best scanning results. Download the high-resolution PNG for print quality.'
                  })}
                </Text>
              </Box>
            </VStack>
          </StandardCard>
        )}

        {/* Static metadata cards — 2-col on desktop, single column mobile-first.
            alignItems start so uneven-height cards align to the top, no stretch. */}
        <SimpleGrid
          columns={{ base: 1, lg: 2 }}
          spacing={{ base: 4, md: 6 }}
          w="100%"
          alignItems="start"
        >
          {/* Production Details Section */}
          <StandardCard
            title={intl.formatMessage({
              id: 'production.section.details',
              defaultMessage: 'Production Details'
            })}
            variant="elevated"
            padding={{ base: 3, md: 4 }}
          >
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 3, md: 6 }}>
            <InfoRow
              icon={FaSeedling}
              label={intl.formatMessage({ id: 'production.field.product', defaultMessage: 'Product' })}
              value={historyData?.product?.name}
            />
            <InfoRow
              icon={FaTractor}
              label={intl.formatMessage({ id: 'production.field.type', defaultMessage: 'Type' })}
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
              label={intl.formatMessage({ id: 'production.field.startDate', defaultMessage: 'Start Date' })}
              value={formatDate(historyData?.start_date)}
            />
            <InfoRow
              icon={FaCalendarAlt}
              label={intl.formatMessage({ id: 'production.field.endDate', defaultMessage: 'End Date' })}
              value={
                historyData?.finish_date
                  ? formatDate(historyData.finish_date)
                  : intl.formatMessage({
                      id: 'production.status.inProgress',
                      defaultMessage: 'In Progress'
                    })
              }
            />
            {historyData?.start_date && historyData?.finish_date && (
              <InfoRow
                icon={FaCalendarAlt}
                label={intl.formatMessage({
                  id: 'production.field.duration',
                  defaultMessage: 'Duration'
                })}
                value={intl.formatMessage(
                  { id: 'production.field.durationDays', defaultMessage: '{days} days' },
                  {
                    days: Math.ceil(
                      (new Date(historyData.finish_date).getTime() -
                        new Date(historyData.start_date).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  }
                )}
              />
            )}
            {historyData?.production_amount && (
              <InfoRow
                icon={FaClipboardList}
                label={intl.formatMessage({ id: 'production.field.amount', defaultMessage: 'Production Amount' })}
                value={`${intl.formatNumber(Number(historyData.production_amount))} ${
                  historyData.production_unit || 'units'
                }`}
              />
            )}
            {historyData?.earning && (
              <InfoRow
                icon={FaChartLine}
                label={intl.formatMessage({ id: 'production.field.revenue', defaultMessage: 'Revenue' })}
                value={`$${historyData.earning.toLocaleString()}`}
              />
            )}
            <InfoRow
              icon={FaLeaf}
              label={intl.formatMessage({ id: 'production.environment' })}
              value={
                historyData?.is_outdoor
                  ? intl.formatMessage({ id: 'production.outdoor' })
                  : intl.formatMessage({ id: 'production.indoor' })
              }
            />
          </SimpleGrid>
        </StandardCard>

        {/* Agricultural Information Section */}
        {(historyData?.age_of_plants ||
          historyData?.number_of_plants ||
          historyData?.soil_ph ||
          historyData?.crop_type) && (
          <StandardCard
            title={intl.formatMessage({
              id: 'production.section.agInfo',
              defaultMessage: 'Agricultural Information'
            })}
            variant="elevated"
            padding={{ base: 3, md: 4 }}
          >
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 3, md: 6 }}>
              {historyData?.age_of_plants && (
                <InfoRow
                  icon={FaSeedling}
                  label={intl.formatMessage({ id: 'production.field.plantAge', defaultMessage: 'Plant Age' })}
                  value={historyData.age_of_plants}
                />
              )}
              {historyData?.number_of_plants && (
                <InfoRow
                  icon={FaSeedling}
                  label={intl.formatMessage({ id: 'production.field.plantCount', defaultMessage: 'Number of Plants' })}
                  value={historyData.number_of_plants.toLocaleString()}
                />
              )}
              {historyData?.soil_ph && (
                <InfoRow
                  icon={FaLeaf}
                  label={intl.formatMessage({ id: 'production.field.soilPh', defaultMessage: 'Soil pH' })}
                  value={historyData.soil_ph}
                />
              )}
              {historyData?.crop_type && (
                <InfoRow
                  icon={FaSeedling}
                  label={intl.formatMessage({ id: 'production.field.cropType', defaultMessage: 'Crop Type' })}
                  value={historyData.crop_type}
                />
              )}
            </SimpleGrid>
          </StandardCard>
        )}

        {/* Location Section */}
        <StandardCard
          title={intl.formatMessage({
            id: 'production.section.location',
            defaultMessage: 'Location'
          })}
          variant="elevated"
          padding={{ base: 3, md: 4 }}
        >
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 3, md: 6 }}>
            <InfoRow
              icon={FaBuilding}
              label={intl.formatMessage({ id: 'production.field.establishment', defaultMessage: 'Establishment' })}
              value={historyData?.parcel?.establishment?.name || 'Unknown'}
              onClick={() => navigate(`/admin/dashboard/farm/${farmId}`)}
            />
            <InfoRow
              icon={MdLocationOn}
              label={intl.formatMessage({ id: 'production.field.parcel', defaultMessage: 'Parcel' })}
              value={historyData?.parcel?.name || 'Unknown'}
              onClick={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`)}
            />
            {historyData?.parcel?.establishment?.location && (
              <InfoRow
                icon={FaMapMarkerAlt}
                label={intl.formatMessage({ id: 'production.field.address', defaultMessage: 'Address' })}
                value={historyData.parcel.establishment.location}
              />
            )}
          </SimpleGrid>
        </StandardCard>

        {/* Reputation & Operator Section */}
        <StandardCard
          title={intl.formatMessage({
            id: 'production.section.reputation',
            defaultMessage: 'Reputation & Operator'
          })}
          variant="elevated"
          padding={{ base: 3, md: 4 }}
        >
          <VStack spacing={{ base: 3, md: 6 }} align="stretch">
            <Box>
              <Text
                fontSize="xs"
                color="gray.500"
                textTransform="uppercase"
                fontWeight="semibold"
                mb={1}
              >
                {intl.formatMessage({
                  id: 'production.reputation.score',
                  defaultMessage: 'Reputation Score'
                })}
              </Text>
              {safeReputation > 0 ? (
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
              ) : (
                <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500" fontStyle="italic">
                  {intl.formatMessage({
                    id: 'production.reputation.notRated',
                    defaultMessage: 'Not yet rated'
                  })}
                </Text>
              )}
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
                  {intl.formatMessage({
                    id: 'production.reputation.operator',
                    defaultMessage: 'Operator'
                  })}
                </Text>
                <HStack spacing={2}>
                  <Avatar
                    size="sm"
                    name={historyData.operator.full_name || historyData.operator.email}
                  />
                  <VStack spacing={0} align="start" minW={0}>
                    <Text fontWeight="medium" fontSize={{ base: 'sm', md: 'md' }} noOfLines={1}>
                      {historyData.operator.full_name ||
                        intl.formatMessage({
                          id: 'production.reputation.unnamedOperator',
                          defaultMessage: 'Unnamed Operator'
                        })}
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
        </SimpleGrid>

        {/* Production Timeline Section */}

        {timelineEvents.length > 0 ? (
          <UltraMobileProductionJourney
            events={timelineEvents}
            transparencyScore={transparencyScore === null ? 0 : Math.round(transparencyScore)}
            // This is the producer's preview of the CONSUMER journey, so it must be fed the
            // same backend-computed organic classification the consumer page uses. Without
            // it the "All inputs organic-approved" chip silently never renders here — and
            // more importantly the producer would not see the claim their shoppers see.
            organicSummary={(transparencyApiData as any)?.standard_view?.organic_summary}
          />
        ) : (
          <VStack spacing={{ base: 2, md: 4 }} py={{ base: 4, md: 8 }}>
            <Icon as={MdTimeline} boxSize={{ base: 10, md: 16 }} color="gray.400" />
            <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="medium" color="gray.600">
              {intl.formatMessage({
                id: 'production.timeline.empty',
                defaultMessage: 'No events recorded yet'
              })}
            </Text>
            <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500" textAlign="center">
              {intl.formatMessage({
                id: 'production.timeline.emptyHint',
                defaultMessage: 'Events will appear here as the production progresses'
              })}
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

      </VStack>

      {/* Sales & Buyer Handoff (post-finish only) — one section grouping the two
          complementary sales surfaces: the aggregate Shipment Summary and the
          per-buyer Sales Records ledger. */}
      {historyData?.finish_date && (
        <VStack spacing={{ base: 4, md: 6 }} align="stretch" w="100%" mt={{ base: 4, md: 6 }}>
          <Heading as="h2" size={{ base: 'sm', md: 'md' }} color="gray.700" px={1}>
            {intl.formatMessage({
              id: 'production.salesSection.title',
              defaultMessage: 'Sales & Buyer Handoff'
            })}
          </Heading>
          <SalesDeliverySection
            historyId={productionId || ''}
            historyData={historyData}
            canWrite={canWrite}
          />
          <SalesRecordsSection
            productionId={historyData?.public_id || productionId || ''}
            canWrite={canWrite}
          />
        </VStack>
      )}

      {/* Quick Add Event Modal */}
      <QuickAddEvent
        isOpen={isQuickAddOpen}
        onClose={onQuickAddClose}
        cropType={historyData?.product?.name || 'citrus'}
        productionMethod={historyData?.production_method}
        onEventAdded={() => {
          // Refetch the queries that drive this page instead of a full reload —
          // keeps scroll position and the SPA feel (was window.location.reload()).
          refetchHistory();
          refetchComplete();
          refetchTransparency();
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
