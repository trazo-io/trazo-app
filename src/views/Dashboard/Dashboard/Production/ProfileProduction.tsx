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
  Flex,
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
  FaEllipsisV,
  FaExchangeAlt,
  FaLock
} from 'react-icons/fa';
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
  StandardPageLoading,
  StandardSection
} from 'components/Design/StandardComponents';
import { InfoRow, PageHeaderMeta } from 'components/Design/ProfileField';
import { CorrectRecordModal } from 'components/Modals/CorrectRecordModal';
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
import { SalesDeliverySection } from 'views/Dashboard/Dashboard/Production/SalesDeliverySection';
import { SalesRecordsSection } from 'views/Dashboard/Dashboard/Production/SalesRecordsSection';
import { PostHarvestHandlerSection } from 'views/Dashboard/Dashboard/Production/PostHarvestHandlerSection';
import { SeasonPlanSection } from 'views/Dashboard/Dashboard/Production/SeasonPlanSection';
import AuditExportModal from 'components/AuditExport/AuditExportModal';
import DriftFindingsBanner from 'components/Compliance/DriftFindingsBanner';
import { formatDateFromTimestamp } from 'utils/dateOnly';

// Type definitions
interface RootState {
  company: {
    currentCompany: {
      id?: number | string;
      establishments: any[];
    };
  };
}

// `InfoRow` and `StatCard` were defined here and copy-pasted into three other profile
// pages. They now live once in components/Design/ProfileField.tsx; `StatCard` had no
// remaining caller after the Quick Stats card was removed.

function ProfileProduction() {
  const intl = useIntl();
  const navigate = useNavigate();
  // Which filed record the farmer asked to correct. Only ever set on a finished season.
  // F7 — the lot header's own correction sheet. Separate from `correctTarget` because the
  // header is not an event: it has no id/eventType pair, and the modal routes on that.
  const [isCorrectingHeader, setIsCorrectingHeader] = useState(false);
  const [correctTarget, setCorrectTarget] = useState<{ id: number; eventType: number } | null>(
    null
  );
  const toast = useToast();
  const { canWrite } = useUserRole();
  const { farmId, productionId, parcelId } = useParams();
  const [establishment, setEstablishment] = useState<any>(null);
  const [updateProduction, { isLoading: isSavingCover }] = useUpdateProductionMutation();

  const { isOpen: isExportOpen, onOpen: onExportOpen, onClose: onExportClose } = useDisclosure();

  const establishments = useSelector(
    (state: RootState) => state.company.currentCompany?.establishments
  );
  const companyId = useSelector((state: RootState) => state.company.currentCompany?.id);

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

  // Format dates.
  //
  // Every value this renders (`start_date`, `finish_date`) is a DateTimeField holding a
  // CALENDAR DATE — midnight UTC — so a local formatter prints the previous day for every
  // timezone west of UTC. Delegates to the shared helper so this file cannot drift from the
  // other nine copies of `formatDate` in the app, or from the server-rendered packet.
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not available';
    return formatDateFromTimestamp(dateString) ?? 'Invalid date';
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
          defaultMessage:
            'See the documented production journey for this lot on Trazo. #Trazo #Traceability'
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

  if (isLoading || isUninitialized) {
    return (
      <StandardPage
        showBackButton
        onBack={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`)}>
        <StandardPageLoading />
      </StandardPage>
    );
  }

  if (isError || !historyData) {
    return (
      <StandardPage
        showBackButton
        onBack={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`)}>
        <Box py={8} textAlign="center">
          <Text color="red.700">Error loading production data. Please try again.</Text>
        </Box>
      </StandardPage>
    );
  }

  /**
   * Consumer-visibility markers, mirroring ProfileFarm.
   *
   * Ground truth (verified 2026-08-07):
   *  PUBLISHED — product, start_date, finish_date, production_amount + unit, lot_id, type,
   *    is_outdoor, parcel and the establishment name/city/state. `PublicHistorySerializer`
   *    lists them and `transparency_views.py` ships harvestDetails{amount, unit, lot_number}.
   *    Duration is marked public too: it is derived from two published dates.
   *  WITHHELD — `operator` is stripped by `_OWNER_ONLY_FIELDS` (it carries the grower's
   *    email and phone) and `earning` is not in the public serializer's field list at all.
   *
   * Those two are why this disclosure earns its space: a farmer can see at a glance that
   * their revenue and their own contact details do NOT travel with the QR code.
   */
  const publicLabel = intl.formatMessage({
    id: 'farm.details.publicMarker',
    defaultMessage: 'Shoppers see this when they scan a QR code from this farm'
  });

  const timelineEvents = getUnifiedTimelineEvents();
  const transparencyScore = getTransparencyScore();

  return (
    <StandardPage
      showBackButton
      onBack={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`)}>
      <VStack spacing={{ base: 4, md: 8 }} w="100%">
        {/* ── PAGE HEADER — not a card ─────────────────────────────────────────
            Matches ProfileFarm and ProfileParcel. Was an elevated card wrapping an initials
            Avatar (a green circle showing "O" for "Orange") plus a duplicated layout. The
            actions stay exactly as they were — Export for audit is the wedge action on this
            page and keeps its primary weight. */}
        <Box w="100%">
          {/*
            Column on mobile, row from `md`.
        
            `direction` was hard-coded to "row". The title column already carried `minW={0}`
            and the action Wrap already carried `flexShrink={0}`, which is the correct pairing
            — but only if the row can actually fit. It cannot: Export + Finish + Copy link +
            the overflow menu demand roughly 330px and refuse to shrink, so on a 430px screen
            (~370px of content) the heading was left about 40px and rendered one word per
            line, with the buttons sitting on top of it.

            `flexShrink={0}` is kept: in a column it is inert, and from `md` up it is still
            what stops the buttons collapsing.
          */}
          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify="space-between"
            align={{ base: 'stretch', md: 'flex-start' }}
            gap={3}>
            <VStack align="flex-start" gap={1} minW={0}>
              <Heading as="h1" size={{ base: 'lg', md: 'xl' }} color="gray.800">
                {historyData?.product?.name || historyData?.name}
              </Heading>
              {historyData?.lot_id && (
                <Text fontSize="sm" color="gray.500">
                  {intl.formatMessage(
                    { id: 'production.lotIdLabel', defaultMessage: 'Lot ID: {id}' },
                    { id: historyData.lot_id }
                  )}
                </Text>
              )}
              {/* Replaces the "Quick Stats" card. Event count was its only non-duplicated
                  tile; environment and status are badges just below. */}
              <PageHeaderMeta
                items={[
                  historyData?.parcel?.name || null,
                  timelineEvents.length
                    ? intl.formatMessage(
                        {
                          id: 'production.meta.events',
                          defaultMessage: '{count, plural, one {# event} other {# events}}'
                        },
                        { count: timelineEvents.length }
                      )
                    : null,
                  // formatDateFromTimestamp, not toLocaleDateString: `start_date` is a
                  // DateTimeField holding a CALENDAR DATE, so it arrives as midnight UTC and a
                  // local formatter prints the day before for every timezone west of UTC —
                  // which is every US farm. The certifier packet renders the same value
                  // server-side in UTC, so the dashboard and the packet were disagreeing by a
                  // day about the same record.
                  historyData?.start_date
                    ? formatDateFromTimestamp(historyData.start_date, undefined, {
                        dateStyle: 'medium'
                      })
                    : null
                ]}
              />
              <Wrap spacing={1.5} pt={1}>
                <WrapItem>
                  <Badge
                    variant={historyData?.finish_date ? 'neutral' : 'subtle'}
                    borderRadius="full"
                    fontSize="xs">
                    {historyData?.finish_date
                      ? intl.formatMessage({
                          id: 'production.status.finished',
                          defaultMessage: 'Finished'
                        })
                      : intl.formatMessage({
                          id: 'production.status.active',
                          defaultMessage: 'Active'
                        })}
                  </Badge>
                </WrapItem>
                {/* `neutral`, not colorScheme — every Badge variant in the theme hardcodes
                    green and ignores colorScheme, so the old blue/purple chips all rendered
                    the same green as the status badge. These are classifications. */}
                {historyData?.is_outdoor !== undefined && (
                  <WrapItem>
                    <Badge variant="neutral" borderRadius="full" fontSize="xs">
                      {historyData.is_outdoor
                        ? intl.formatMessage({ id: 'production.outdoor' })
                        : intl.formatMessage({ id: 'production.indoor' })}
                    </Badge>
                  </WrapItem>
                )}
                {historyData?.qr_code && (
                  <WrapItem>
                    <Badge variant="neutral" borderRadius="full" fontSize="xs">
                      <HStack gap={1}>
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
                    <Badge variant="neutral" borderRadius="full" fontSize="xs">
                      {intl.formatMessage({
                        id: 'production.badge.published',
                        defaultMessage: 'Published'
                      })}
                    </Badge>
                  </WrapItem>
                )}
              </Wrap>
            </VStack>
            {/* spacing={2} (8px), not 1. At 4px the three buttons abutted and read as a
                segmented control — which promises "pick one of these". Export, copy-link and
                the overflow menu are unrelated actions. */}
            <Wrap spacing={2} justify={{ base: 'flex-start', md: 'flex-end' }} flexShrink={0}>
              {/* Primary wedge action + the buyer handoff stay visible; secondary
                  actions collapse into an overflow menu to reduce header clutter. */}
              <WrapItem>
                <StandardButton
                  variant="primary"
                  size="sm"
                  leftIcon={<Icon as={FiDownload} />}
                  onClick={onExportOpen}>
                  {intl.formatMessage({ id: 'app.exportForAudit' })}
                </StandardButton>
              </WrapItem>
              {/* 🔴 F29 (2026-08-21) — Finish, on the season's own page.
                  The ONLY finish affordance in the app was a PARCEL-level button
                  (`Parcel/components/TrackList.jsx`) that navigates with
                  `currentHistory?.id` — whichever season on that parcel started LAST. So on
                  the routine case the server-side comment describes, a perennial block
                  carrying a 2025 and a 2026 cycle, the older season had no link at all and
                  the farmer's only route was to type the URL. The parcel button stays as the
                  shortcut for the common single-season case; this one names the season it is
                  closing, which is the whole point. */}
              {canWrite && !historyData?.finish_date && (
                <WrapItem>
                  <StandardButton
                    variant="outline"
                    size="sm"
                    leftIcon={<Icon as={FaSeedling} />}
                    onClick={() =>
                      navigate(
                        `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/production/${productionId}/finish`
                      )
                    }>
                    {intl.formatMessage({ id: 'app.finishProduction' })}
                  </StandardButton>
                </WrapItem>
              )}
              <WrapItem>
                <StandardButton
                  variant="outline"
                  size="sm"
                  leftIcon={<Icon as={FaLink} />}
                  onClick={handleCopyBuyerLink}>
                  {intl.formatMessage({ id: 'production.copyBuyerLink.button' })}
                </StandardButton>
              </WrapItem>
              <WrapItem>
                <Menu placement="bottom-end" autoSelect={false}>
                  <MenuButton
                    as={IconButton}
                    variant="outline"
                    size="sm"
                    /* 44px square, matching the buttons beside it. It was 24x32 — visually
                       inset in the row, and under the 44px touch-target floor on the one
                       control that hides four actions (including Edit) behind it. */
                    minH="44px"
                    minW="44px"
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
                      isDisabled={!historyData?.lot_id}>
                      {intl.formatMessage({ id: 'production.lotTag.button' })}
                    </MenuItem>
                    {canWrite && !historyData?.finish_date && (
                      <MenuItem
                        icon={<Icon as={FaEdit} />}
                        onClick={() =>
                          navigate(
                            `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/production/${productionId}/change`
                          )
                        }>
                        {intl.formatMessage({ id: 'app.edit' })}
                      </MenuItem>
                    )}
                  </MenuList>
                </Menu>
              </WrapItem>
            </Wrap>
          </Flex>
          {historyData?.description && (
            <Text mt={3} color="gray.600" fontSize="sm" lineHeight="1.7">
              {historyData.description}
            </Text>
          )}
        </Box>

        {/* Photo Gallery Section */}
        {historyData?.images && historyData.images.length > 0 && (
          <StandardCard
            title={intl.formatMessage({
              id: 'production.section.photoGallery',
              defaultMessage: 'Photo Gallery'
            })}
            variant="elevated"
            padding={{ base: 0, md: 4 }}>
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

        {/* ── YOUR PUBLIC PAGE ─────────────────────────────────────────────────
            Cover photo and QR access side by side, because they configure the SAME artifact:
            the cover IS the hero of the QR page, and this is the link to it. Splitting them
            into two stacked full-width cards also left the cover card ~1,200px of dead space
            beside a 420px column on desktop. */}
        <StandardSection
          title={intl.formatMessage({
            id: 'production.section.publicPage',
            defaultMessage: 'Your public page'
          })}
          description={intl.formatMessage({
            id: 'production.section.publicPageHelp',
            defaultMessage: 'What a shopper sees when they scan this lot.'
          })}>
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 4, md: 6 }} alignItems="start">
            {/* Cover Photo Section (consumer QR hero) — write access only */}
            {canWrite && (
              <StandardCard
                title={intl.formatMessage({
                  id: 'production.cover.title',
                  defaultMessage: 'Cover Photo'
                })}
                variant="elevated"
                padding={{ base: 0, md: 4 }}>
                <VStack align="stretch" spacing={4}>
                  <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                    {intl.formatMessage({
                      id: 'production.cover.help',
                      defaultMessage:
                        'Shown as the hero image at the top of the public QR page. Upload a photo to set it; leave it empty to auto-pick the first timeline photo.'
                    })}
                  </Text>

                  {/* The CURRENT COVER is the thing being configured, so it leads and it is
                  large. Before, a 140px thumbnail sat beside a ~600px dropzone — the action
                  dwarfed the state, and "Reset to auto-pick" floated below, detached from the
                  image it resets. The uploader is now a compact strip underneath. */}
                  <VStack align="stretch" spacing={3}>
                    <Box>
                      <Text fontSize="xs" color="gray.500" mb={2}>
                        {intl.formatMessage({
                          id: 'production.cover.current',
                          defaultMessage: 'Current cover'
                        })}
                      </Text>
                      {historyData?.cover_image_url ? (
                        <Box position="relative" w="100%">
                          <Image
                            src={historyData.cover_image_url}
                            alt={intl.formatMessage({
                              id: 'production.cover.title',
                              defaultMessage: 'Cover Photo'
                            })}
                            borderRadius="lg"
                            objectFit="cover"
                            w="100%"
                            aspectRatio="16/9"
                            border="1px solid"
                            borderColor="gray.200"
                          />
                          {/* Attached to the image it acts on, not stranded below the card. */}
                          <StandardButton
                            variant="outline"
                            size="xs"
                            onClick={handleClearCover}
                            isLoading={isSavingCover}
                            position="absolute"
                            top={2}
                            right={2}
                            bg="white">
                            {intl.formatMessage({
                              id: 'production.cover.reset',
                              defaultMessage: 'Reset to auto-pick'
                            })}
                          </StandardButton>
                        </Box>
                      ) : (
                        <Box
                          w="100%"
                          aspectRatio="16/9"
                          borderRadius="lg"
                          border="1px dashed"
                          borderColor="gray.300"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          bg="gray.50">
                          <Text fontSize="sm" color="gray.500" textAlign="center" px={3}>
                            {intl.formatMessage({
                              id: 'production.cover.auto',
                              defaultMessage: 'Auto (first photo)'
                            })}
                          </Text>
                        </Box>
                      )}
                    </Box>

                    {/* Compact, and captioned for THIS job — the defaults read "Add your farm
                    photos", which is not what a single hero image is. */}
                    <Box w="100%">
                      <TrazoImageUpload
                        maxFiles={1}
                        maxSize={5 * 1024 * 1024}
                        existingImages={[]}
                        onImagesChange={handleSetCover}
                        isLoading={isSavingCover}
                        compact
                        title={intl.formatMessage({
                          id: 'production.cover.uploadTitle',
                          defaultMessage: 'Replace cover photo'
                        })}
                        subtitle={intl.formatMessage({
                          id: 'production.cover.uploadSubtitle',
                          defaultMessage: 'Sets the hero image on the public QR page'
                        })}
                      />
                    </Box>
                  </VStack>
                </VStack>
              </StandardCard>
            )}
            {/* QR Code & Consumer Access - Prominent position for packaging workflow */}
            {historyData?.qr_code && (
              <StandardCard
                title={intl.formatMessage({
                  id: 'production.section.qrAccess',
                  defaultMessage: 'QR Code & Consumer Access'
                })}
                variant="elevated"
                padding={{ base: 0, md: 4 }}>
                <VStack spacing={{ base: 3, md: 5 }} align="center">
                  {/* Live / not-live, stated. VERIFIED 2026-08-19 by scanning anonymously:
                      an unpublished lot answers 404 on both `public_history` and the
                      transparency endpoint, so this QR resolves for NOBODY but the owner —
                      and `handleViewPublicPage` works for the owner, which is exactly how a
                      farmer concludes it is live. The card said "Your QR code is ready.
                      Consumers can scan it" in precisely this state and told them to print it.
                      Printing a lot's labels off that is a real, expensive mistake.
                      `HistoryViewSet.update` refuses `published=True` while `finish_date` is
                      null ("Active productions cannot be made visible to consumers"), so the
                      way out is to finish the season — say so rather than imply it is live. */}
                  {historyData?.finish_date ? (
                    <Box
                      w="full"
                      p={{ base: 2, md: 3 }}
                      bg="green.50"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="green.200"
                      textAlign="center">
                      <Text
                        fontSize={{ base: 'xs', md: 'sm' }}
                        fontWeight="semibold"
                        color="green.700">
                        {intl.formatMessage({
                          id: 'production.qr.completeBanner',
                          defaultMessage:
                            'Your production is complete! Print this QR code and attach it to your packaging.'
                        })}
                      </Text>
                    </Box>
                  ) : (
                    <Box
                      w="full"
                      p={{ base: 2, md: 3 }}
                      bg="orange.50"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="orange.200">
                      <HStack spacing={2} align="flex-start" justify="center">
                        <Icon as={FaLock} color="orange.800" boxSize={3} mt="2px" />
                        <VStack spacing={1} align="center">
                          <Text
                            fontSize={{ base: 'xs', md: 'sm' }}
                            fontWeight="semibold"
                            color="orange.800"
                            textAlign="center">
                            {intl.formatMessage({ id: 'production.qr.notLiveTitle' })}
                          </Text>
                          <Text fontSize="xs" color="gray.700" textAlign="center">
                            {intl.formatMessage({ id: 'production.qr.notLiveBody' })}
                          </Text>
                        </VStack>
                      </HStack>
                    </Box>
                  )}

                  {/* QR Image Preview */}
                  <Box
                    p={{ base: 3, md: 4 }}
                    bg="gray.50"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="gray.200">
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
                    maxW="400px">
                    {historyData?.finish_date
                      ? intl.formatMessage({
                          id: 'production.qr.instruction',
                          defaultMessage:
                            "Print this QR and attach it to your packaging so consumers can see your production's transparency journey."
                        })
                      : intl.formatMessage({ id: 'production.qr.instructionActive' })}
                  </Text>

                  {/* Action buttons */}
                  <HStack spacing={2} flexWrap="wrap" justify="center">
                    <StandardButton
                      variant="primary"
                      size={{ base: 'xs', md: 'sm' }}
                      leftIcon={<Icon as={FaDownload} />}
                      onClick={downloadQRCode}>
                      {intl.formatMessage({
                        id: 'production.qr.download',
                        defaultMessage: 'Download QR'
                      })}
                    </StandardButton>
                    <StandardButton
                      variant="outline"
                      size={{ base: 'xs', md: 'sm' }}
                      leftIcon={<Icon as={FaEye} />}
                      onClick={handleViewPublicPage}>
                      {/* Owner preview until the season is finished: `public_history`'s
                          queryset lets a producer read their OWN unpublished production, and
                          nobody else. Calling it "Public page" here is what convinces a farmer
                          the lot is already live. */}
                      {intl.formatMessage({
                        id: historyData?.finish_date
                          ? 'app.viewPublicPage'
                          : 'production.qr.previewPublicPage'
                      })}
                    </StandardButton>
                  </HStack>

                  {/* Print tip — only once the QR actually resolves for a shopper. Telling
                      someone the right size to print a code that answers 404 is the worst
                      possible moment to be helpful about print quality. */}
                  {historyData?.finish_date && (
                    <Box
                      w="full"
                      p={{ base: 2, md: 3 }}
                      bg="blue.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="blue.100">
                      <Text fontSize="xs" color="blue.700" textAlign="center">
                        {intl.formatMessage({
                          id: 'production.qr.tip',
                          defaultMessage:
                            'Tip: Print at minimum 2.5cm (1 inch) for best scanning results. Download the high-resolution PNG for print quality.'
                        })}
                      </Text>
                    </Box>
                  )}
                </VStack>
              </StandardCard>
            )}
          </SimpleGrid>
        </StandardSection>

        {/* Sprint 5.1 — OSP ↔ events drift summary (only renders if findings present).
            Surfaced high (above Quick Stats) so any compliance action is seen first. */}
        <DriftFindingsBanner events={timelineEvents as any[]} />

        {/* Quick Stats Section */}
        {/* "Quick Stats" DELETED 2026-08-07. Four tiles, three of them redundant:
            - Transparency % — the October plan §10.4 names this exact tile as "the 4th
              duplicate of one number". Cut from the farm home 2026-08-04 and from the parcel
              profile 2026-08-07. This note used to add that "the score's home is /transparency
              (Farm Records)" — that page was never routed and was deleted 2026-08-11, when the
              score came off producer UI entirely. It is a backend KPI with no screen.
            - Environment (indoor/outdoor) and Status (active/finished) — both already render
              as badges in the header above.
            Only the event count was unique, and it now sits in the header meta line. */}

        {/* ── PRODUCTION RECORD ────────────────────────────────────────────────
            A StandardSection heading, matching ProfileFarm and ProfileParcel. Those two
            group their cards under h2 section headings; this page had none, so its cards
            floated with no hierarchy above them.

            The cards stay in a 2-col grid rather than merging into one like farm/parcel:
            they are already short and the grid uses the horizontal space a merged column
            would waste on desktop. */}
        <StandardSection
          title={intl.formatMessage({
            id: 'production.section.record',
            defaultMessage: 'Production record'
          })}>
          {/* TWO EXPLICIT COLUMNS, not a flat grid.
              A flat `columns={2}` grid flows children in order, so three cards of very uneven
              height produced [tall Production details | short Location] and then
              [Recorded by | EMPTY] — a gap under Location and another beside Recorded by.
              Pairing the tall card against a stack of the short ones fills the row, and it
              still collapses to a single column below `lg`. */}
          <SimpleGrid
            columns={{ base: 1, lg: 2 }}
            spacing={{ base: 4, md: 6 }}
            w="100%"
            alignItems="start">
            <VStack align="stretch" spacing={{ base: 4, md: 6 }}>
              {/* Production Details Section */}
              <StandardCard
                title={intl.formatMessage({
                  id: 'production.section.details',
                  defaultMessage: 'Production Details'
                })}
                variant="elevated"
                padding={{ base: 0, md: 4 }}>
                <VStack align="stretch" gap={4}>
                  <Text fontSize="xs" color="gray.500" lineHeight="1.7">
                    <Icon as={FaEye} boxSize={3} color="gray.400" mr={2} verticalAlign="-1px" />
                    {intl.formatMessage({
                      id: 'production.details.publicLegend',
                      defaultMessage:
                        'Marked fields appear on this lot\u2019s public page when a shopper scans its QR code. Revenue and operator details stay private.'
                    })}
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 3, md: 6 }}>
                    <InfoRow
                      icon={FaSeedling}
                      label={intl.formatMessage({
                        id: 'production.field.product',
                        defaultMessage: 'Product'
                      })}
                      value={historyData?.product?.name}
                      isPublic
                      publicLabel={publicLabel}
                    />
                    <InfoRow
                      icon={FaTractor}
                      label={intl.formatMessage({
                        id: 'production.field.type',
                        defaultMessage: 'Type'
                      })}
                      value={
                        historyData?.type === 'OR'
                          ? 'Orchard'
                          : historyData?.type === 'GA'
                          ? 'Garden'
                          : historyData?.type
                          ? historyData.type
                          : intl.formatMessage({ id: 'production.agriculturalProduction' })
                      }
                      isPublic
                      publicLabel={publicLabel}
                    />
                    <InfoRow
                      icon={FaCalendarAlt}
                      label={intl.formatMessage({
                        id: 'production.field.startDate',
                        defaultMessage: 'Start Date'
                      })}
                      value={formatDate(historyData?.start_date)}
                      isPublic
                      publicLabel={publicLabel}
                    />
                    <InfoRow
                      icon={FaCalendarAlt}
                      label={intl.formatMessage({
                        id: 'production.field.endDate',
                        defaultMessage: 'End Date'
                      })}
                      value={
                        historyData?.finish_date
                          ? formatDate(historyData.finish_date)
                          : intl.formatMessage({
                              id: 'production.status.inProgress',
                              defaultMessage: 'In Progress'
                            })
                      }
                      isPublic
                      publicLabel={publicLabel}
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
                        isPublic
                        publicLabel={publicLabel}
                      />
                    )}
                    {historyData?.production_amount && (
                      <InfoRow
                        icon={FaClipboardList}
                        label={intl.formatMessage({
                          id: 'production.field.amount',
                          defaultMessage: 'Production Amount'
                        })}
                        value={`${intl.formatNumber(Number(historyData.production_amount))} ${
                          historyData.production_unit || 'units'
                        }`}
                        isPublic
                        publicLabel={publicLabel}
                      />
                    )}
                    {/* 🔴 F7 (2026-08-21) — the lot header is FROZEN once a season is
                        finished, and until now that was the end of it: the API answers 423
                        and there was no amendment path, so a farmer who finished with the
                        wrong yield had no way to fix it and no way to explain it. The events
                        underneath this header have had a correction sheet all along. */}
                    {historyData?.finish_date && canWrite && (
                      <StandardButton
                        variant="ghost"
                        size="sm"
                        alignSelf="flex-start"
                        leftIcon={<Icon as={FaExchangeAlt} />}
                        onClick={() => setIsCorrectingHeader(true)}>
                        {intl.formatMessage({ id: 'correct.season.action' })}
                      </StandardButton>
                    )}
                    {historyData?.earning && (
                      <InfoRow
                        icon={FaChartLine}
                        label={intl.formatMessage({
                          id: 'production.field.revenue',
                          defaultMessage: 'Revenue'
                        })}
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
                      isPublic
                      publicLabel={publicLabel}
                    />
                  </SimpleGrid>
                </VStack>
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
                  padding={{ base: 0, md: 4 }}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 3, md: 6 }}>
                    {historyData?.age_of_plants && (
                      <InfoRow
                        icon={FaSeedling}
                        label={intl.formatMessage({
                          id: 'production.field.plantAge',
                          defaultMessage: 'Plant Age'
                        })}
                        value={historyData.age_of_plants}
                      />
                    )}
                    {historyData?.number_of_plants && (
                      <InfoRow
                        icon={FaSeedling}
                        label={intl.formatMessage({
                          id: 'production.field.plantCount',
                          defaultMessage: 'Number of Plants'
                        })}
                        value={historyData.number_of_plants.toLocaleString()}
                      />
                    )}
                    {historyData?.soil_ph && (
                      <InfoRow
                        icon={FaLeaf}
                        label={intl.formatMessage({
                          id: 'production.field.soilPh',
                          defaultMessage: 'Soil pH'
                        })}
                        value={historyData.soil_ph}
                      />
                    )}
                    {historyData?.crop_type && (
                      <InfoRow
                        icon={FaSeedling}
                        label={intl.formatMessage({
                          id: 'production.field.cropType',
                          defaultMessage: 'Crop Type'
                        })}
                        value={historyData.crop_type}
                      />
                    )}
                  </SimpleGrid>
                </StandardCard>
              )}
            </VStack>

            <VStack align="stretch" spacing={{ base: 4, md: 6 }}>
              {/* Location Section */}
              <StandardCard
                title={intl.formatMessage({
                  id: 'production.section.location',
                  defaultMessage: 'Location'
                })}
                variant="elevated"
                padding={{ base: 0, md: 4 }}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 3, md: 6 }}>
                  <InfoRow
                    icon={FaBuilding}
                    label={intl.formatMessage({
                      // Key stays `…establishment` (the model name); the LABEL is "Farm".
                      // Establishment is internal vocabulary — see app.establishment,
                      // which has read "Farm" all along.
                      id: 'production.field.establishment',
                      defaultMessage: 'Farm'
                    })}
                    value={historyData?.parcel?.establishment?.name || 'Unknown'}
                    onClick={() => navigate(`/admin/dashboard/farm/${farmId}`)}
                    isPublic
                    publicLabel={publicLabel}
                  />
                  <InfoRow
                    icon={MdLocationOn}
                    label={intl.formatMessage({
                      id: 'production.field.parcel',
                      defaultMessage: 'Parcel'
                    })}
                    value={historyData?.parcel?.name || 'Unknown'}
                    onClick={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`)}
                    isPublic
                    publicLabel={publicLabel}
                  />
                  {historyData?.parcel?.establishment?.location && (
                    <InfoRow
                      icon={FaMapMarkerAlt}
                      label={intl.formatMessage({
                        id: 'production.field.address',
                        defaultMessage: 'Address'
                      })}
                      value={historyData.parcel.establishment.location}
                      isPublic
                      publicLabel={publicLabel}
                    />
                  )}
                </SimpleGrid>
              </StandardCard>

              {/* The 5-star "Reputation Score" was removed here 2026-08-07.
            `History.reputation` is the average of `self.reviews` — and consumer reviews went
            away with the logged-in shopper product (TRAZO-OCTOBER-2026-PLAN §10.5). The
            equivalent `renderStars` was deleted from the consumer farm surface on 2026-08-06
            for exactly this reason: "a farm rating on this page would have no source behind
            it". On demo data it renders a seeded number; on a real pilot farm it renders 0.0
            forever. Same class as the transparency score — a KPI with no live input.
            `History.operator` STAYS, retitled "Recorded by": it is set to `request.user` on
            create (history/views.py:627), so it identifies the ACCOUNT that owns the record —
            not whoever did the field work. Field workers are `performed_by` per event. It is
            withheld from consumers by `_OWNER_ONLY_FIELDS` because it carries an email. */}
              <StandardCard
                title={intl.formatMessage({
                  id: 'production.section.recordedBy',
                  defaultMessage: 'Recorded by'
                })}
                variant="elevated"
                padding={{ base: 0, md: 4 }}>
                <VStack spacing={{ base: 3, md: 6 }} align="stretch">
                  {historyData?.operator && (
                    <Box p={{ base: 3, md: 4 }} bg="gray.50" borderRadius="lg">
                      {/* The inner "Operator" label was removed 2026-08-08. The card is titled
                        "Recorded by", so this printed the same idea twice — and the two used
                        DIFFERENT i18n keys, which Spanish translated inconsistently:
                        "Operario" (a manual labourer) as the card title and "Operador" as the
                        field label. Neither was right: `History.operator` is set to
                        `request.user` on create (history/views.py:627), so it is the ACCOUNT
                        that owns the record, not whoever did the field work. Field workers are
                        `performed_by` on each event. */}
                      <HStack spacing={2}>
                        <Avatar
                          size="sm"
                          name={historyData.operator.full_name || historyData.operator.email}
                        />
                        <VStack spacing={0} align="start" minW={0}>
                          <Text
                            fontWeight="medium"
                            fontSize={{ base: 'sm', md: 'md' }}
                            noOfLines={1}>
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
            </VStack>
          </SimpleGrid>
        </StandardSection>

        {/* Season plan BEFORE the timeline: the plan is what to do next, the timeline is what
            happened. Same ordering as farm home (deadlines → readiness → records). Renders
            nothing when the production was started without a crop template. */}
        <VStack spacing={{ base: 4, md: 6 }} align="stretch" w="100%" mb={{ base: 4, md: 6 }}>
          <SeasonPlanSection
            productionId={historyData?.public_id || productionId || ''}
            farmId={farmId}
            parcelId={parcelId}
            canWrite={canWrite}
            isFinished={Boolean(historyData?.finish_date)}
          />
        </VStack>

        {/* Production Timeline Section */}

        {timelineEvents.length > 0 ? (
          <UltraMobileProductionJourney
            events={timelineEvents}
            // Producer preview of the consumer journey. The buyer-facing CTAs
            // ("Buyer or retailer? …", the doc-request form) are suppressed here:
            // this route carries the production PUBLIC UUID, so the CTA's old
            // UUID-shape guard did not exclude it and the farm was shown a form
            // for requesting documentation from itself. The producer's path to a
            // buyer is the "Copy buyer link" action above.
            audience="producer"
            // The farmer's door into their own record. A filed season opens the correction
            // sheet (the original is kept beside the correction); an open season goes to the
            // ordinary editor. Without this the page rendered every event and offered no way
            // to act on any of them — season-plan rows had a control, an input logged outside
            // the plan had none.
            onCorrectEvent={(recordId, eventType) => {
              if (historyData?.finish_date || historyData?.published) {
                setCorrectTarget({ id: recordId, eventType });
                return;
              }
              navigate(
                `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/event/${recordId}/change` +
                  `?event_type=${eventType}`
              );
            }}
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
                onClick={() =>
                  // `?production=` is load-bearing: without it the server derives the season
                  // from `parcel.current_history`, and a block with two open seasons files the
                  // record against the wrong one. Logged from THIS season's page, it belongs to
                  // THIS season.
                  navigate(
                    `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/event/add?production=${productionId}`
                  )
                }
                mt={4}>
                {intl.formatMessage({ id: 'production.addFirstActivity' })}
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

      {/* Off-farm handler — CCOF G6.1 / 7 CFR 205.272. Deliberately NOT gated on
          finish_date like the sales block below: a lot goes to the huller during
          harvest, weeks before the season closes, and that is exactly when the
          grower has the handler's certificate in hand. */}
      <VStack spacing={{ base: 4, md: 6 }} align="stretch" w="100%" mt={{ base: 4, md: 6 }}>
        <PostHarvestHandlerSection
          productionId={historyData?.public_id || productionId || ''}
          companyId={companyId}
          farmId={farmId}
          canWrite={canWrite}
        />
      </VStack>

      {/* Sales & Buyer Handoff (post-finish only). The itemized Sales Records
          ledger is THE sales editor (SalesRecord rows win in audit exports).
          SalesDeliverySection renders only as a read-only summary of legacy
          single-sale data on pre-merge productions (export fallback). */}
      {historyData?.finish_date && (
        <VStack spacing={{ base: 4, md: 6 }} align="stretch" w="100%" mt={{ base: 4, md: 6 }}>
          <Heading as="h2" size={{ base: 'sm', md: 'md' }} color="gray.700" px={1}>
            {intl.formatMessage({
              id: 'production.salesSection.title',
              defaultMessage: 'Sales & Buyer Handoff'
            })}
          </Heading>
          <SalesRecordsSection
            productionId={historyData?.public_id || productionId || ''}
            canWrite={canWrite}
            establishmentId={farmId}
            // Seeds the sale unit from the lot's own harvest unit. The audit export prints the
            // mass-balance Balance line and the "sold exceeds harvest" review flag only when the
            // two unit strings match, so a mismatched default silently deleted § 205.103(b)(2)
            // reconciliation from the certifier packet.
            harvestUnit={historyData?.production_unit}
          />
          <SalesDeliverySection historyData={historyData} />
        </VStack>
      )}

      {/* Audit Export Modal */}
      <AuditExportModal
        isOpen={isExportOpen}
        onClose={onExportClose}
        productionId={historyData?.public_id || productionId || ''}
        productionName={historyData?.product?.name || historyData?.name || ''}
      />

      {/* Correction sheet for one filed record. Mounted only once a row asks for it. */}
      <CorrectRecordModal
        isOpen={correctTarget !== null}
        onClose={() => setCorrectTarget(null)}
        eventId={correctTarget?.id}
        eventType={correctTarget?.eventType}
        onCorrected={() => setCorrectTarget(null)}
      />

      {/* Same sheet, season-header mode (F7). Kept as a second mount rather than one piece
          of state carrying both shapes: a header target has no event id, and collapsing the
          two would mean encoding "not an event" as a null inside the event target. */}
      <CorrectRecordModal
        isOpen={isCorrectingHeader}
        onClose={() => setIsCorrectingHeader(false)}
        productionId={historyData?.public_id || productionId || ''}
        onCorrected={() => setIsCorrectingHeader(false)}
      />
    </StandardPage>
  );
}

export default ProfileProduction;
