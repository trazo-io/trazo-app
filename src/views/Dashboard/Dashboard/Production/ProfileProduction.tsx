import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Icon,
  Badge,
  useDisclosure,
  useToast,
  Heading,
  Flex,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton
} from '@chakra-ui/react';
import { FaEdit, FaShare, FaLink, FaTag, FaEllipsisV, FaPlus } from 'react-icons/fa';
import { FiDownload } from 'react-icons/fi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useUserRole } from 'hooks/useUserRole';
import { useIntl } from 'react-intl';

import {
  StandardCard,
  StandardButton,
  StandardPage,
  StandardPageLoading,
  StandardSectionTabs,
  PAGE_TITLE
} from 'components/Design/StandardComponents';
import SeasonActivitiesCard, {
  titleOf
} from 'views/Dashboard/Dashboard/Production/SeasonActivitiesCard';
import PublicPageCard from 'views/Dashboard/Dashboard/Production/PublicPageCard';
import SeasonDetailsCard from 'views/Dashboard/Dashboard/Production/SeasonDetailsCard';
import { PageHeaderMeta } from 'components/Design/ProfileField';
import { CorrectRecordModal } from 'components/Modals/CorrectRecordModal';
import { ActivityDetailModal } from 'views/Dashboard/Activities/ActivityDetailModal';
import type { ActivityRow } from 'store/api/activityFeedApi';
import { StandardImageGallery } from 'components/ImageGallery';
import {
  useGetPublicHistoryQuery,
  useGetSalesRecordsQuery,
  useUpdateProductionMutation
} from 'store/api/historyApi';
import { useGetTransparencyDetailsQuery } from 'store/api/transparencyQrApi';
import { useGetCompleteSummaryQuery } from 'store/api/carbonApi';
import { config } from 'config/environment';

// Data normalization imports
import { normalizeBackendEventData } from 'utils/eventDataNormalizer';
import { StandardizedEvent } from 'types/standardizedEvents';

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
  // Full field-by-field record view (with buyer-page visibility marked).
  const [viewTarget, setViewTarget] = useState<ActivityRow | null>(null);
  const location = useLocation();
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

  // Same argument as SalesRecordsSection, so RTK serves both from one request. Feeds the
  // Sales tab's dot.
  const salesProductionId = historyData?.public_id || productionId || '';
  const { data: salesRecords = [], isSuccess: salesLoaded } = useGetSalesRecordsQuery(
    { productionId: salesProductionId },
    { skip: !salesProductionId }
  );

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
        defaultMessage: 'Cover cleared. Using the first photo automatically'
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
          title: intl.formatMessage({ id: 'app.error' }),
          description: intl.formatMessage({ id: 'production.toast.idNotFound' }),
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
        throw new Error(
          errorData.error || intl.formatMessage({ id: 'production.toast.downloadUrlFailed' })
        );
      }

      const data = await response.json();
      window.open(data.download_url, '_blank');

      toast({
        title: intl.formatMessage({ id: 'production.toast.qrReady.title' }),
        description: intl.formatMessage(
          { id: 'production.toast.qrReady.body' },
          { filename: data.filename }
        ),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast({
        title: intl.formatMessage({ id: 'production.toast.downloadFailed' }),
        description:
          error instanceof Error
            ? error.message
            : intl.formatMessage({ id: 'production.toast.downloadUrlFailed' }),
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
          title: intl.formatMessage({ id: 'app.error' }),
          description: intl.formatMessage({ id: 'production.toast.idNotFound' }),
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
          { id: 'production.share.title' },
          {
            name:
              historyData?.product?.name ||
              historyData?.name ||
              intl.formatMessage({ id: 'farmHome.seasons.untitled' })
          }
        ),
        text: intl.formatMessage({ id: 'production.share.text' }),
        url: window.location.href
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // View public page - use public_id (UUID) for consumer-facing URLs
  const handleViewPublicPage = () => {
    const publicId = historyData?.public_id || productionId;
    // An unpublished lot is "Product Not Found" on the consumer page, owner included, unless
    // the page is opened as an explicit preview (2026-10-08).
    const preview = historyData?.published ? '' : '?preview=1';
    window.open(`${config.CONSUMER_BASE_URL}/production/${publicId}${preview}`, '_blank');
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
          <Text color="red.700">{intl.formatMessage({ id: 'production.error.load' })}</Text>
        </Box>
      </StandardPage>
    );
  }

  const timelineEvents = getUnifiedTimelineEvents();

  const isFinished = Boolean(historyData?.finish_date);
  const parcelPath = `/admin/dashboard/farm/${farmId}/parcel/${parcelId}`;
  const logActivity = () => navigate(`${parcelPath}/event/add?production=${productionId}`);

  // Opens the field-by-field detail modal: Edit on an open season, the correction sheet on a
  // closed one (EventDetailsModal reads `production_finished`).
  const openEvent = (event: any) =>
    setViewTarget({
      event_type: Number(event?.event_type),
      event_id: Number(event?.record_id ?? event?.id),
      subtype: (event?.production_type || event?.type || null) as string | null,
      name: titleOf(event, intl) || null,
      date: (event?.date as string) || null,
      description: (event?.observation as string) || (event?.description as string) || '',
      parcel_id: Number(parcelId) || 0,
      parcel_name: historyData?.parcel?.name || '',
      history_id: Number(historyData?.id) || 0,
      production_finished: Boolean(historyData?.finish_date || historyData?.published),
      performed_by: (event?.performed_by as string) || '',
      detail: undefined
    });

  // The list reads the RAW season events: the normalizer rewrites `type` to the family name and
  // drops the farmer's title on general activities ("Farm Activity" for every one of them).
  const rawSeasonEvents: any[] =
    (completeData?.timeline?.length ? completeData.timeline : null) ||
    ((transparencyApiData as any)?.timeline_events?.length
      ? (transparencyApiData as any).timeline_events
      : null) ||
    (completeData?.events?.length ? completeData.events : null) ||
    // The same legacy fallback as getUnifiedTimelineEvents, so the header count and this list
    // never disagree (review of #299).
    (historyData?.events?.length ? historyData.events : null) ||
    [];

  // ── HEADER ACTIONS: one primary (2026-11-06) ─────────────────────────────────────
  // An open season's job is logging, so Log activity leads; Finish season is the one other
  // decision a farmer makes here. A closed season's job is the certifier, so Export leads.
  // Everything else is one menu: the public-page actions also live on the public page card.
  const primaryIsLog = canWrite && !isFinished;
  const headerActions = (
    <HStack spacing={2} flexShrink={0}>
      {primaryIsLog ? (
        <StandardButton
          variant="primary"
          size="sm"
          leftIcon={<Icon as={FaPlus} />}
          onClick={logActivity}>
          {intl.formatMessage({ id: 'production.addActivity' })}
        </StandardButton>
      ) : (
        <StandardButton
          variant="primary"
          size="sm"
          leftIcon={<Icon as={FiDownload} />}
          onClick={onExportOpen}>
          {intl.formatMessage({ id: 'app.exportForAudit' })}
        </StandardButton>
      )}
      {canWrite && !isFinished && (
        // F29: the season's own finish door. The parcel-level button finishes whichever season
        // started last, so an older open season had no other route.
        <StandardButton
          variant="outline"
          size="sm"
          onClick={() => navigate(`${parcelPath}/production/${productionId}/finish`)}>
          {intl.formatMessage({ id: 'season.finish', defaultMessage: 'Finish season' })}
        </StandardButton>
      )}
      <Menu placement="bottom-end" autoSelect={false}>
        <MenuButton
          as={IconButton}
          variant="outline"
          size="sm"
          minH="44px"
          minW="44px"
          aria-label={intl.formatMessage({
            id: 'production.moreActions',
            defaultMessage: 'More actions'
          })}
          icon={<Icon as={FaEllipsisV} />}
        />
        <MenuList>
          {primaryIsLog && (
            <MenuItem icon={<Icon as={FiDownload} />} onClick={onExportOpen}>
              {intl.formatMessage({ id: 'app.exportForAudit' })}
            </MenuItem>
          )}
          {canWrite && isFinished && (
            <MenuItem icon={<Icon as={FaPlus} />} onClick={logActivity}>
              {intl.formatMessage({ id: 'production.addPostHarvestActivity' })}
            </MenuItem>
          )}
          <MenuItem icon={<Icon as={FaLink} />} onClick={handleCopyBuyerLink}>
            {intl.formatMessage({ id: 'production.copyBuyerLink.button' })}
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
          {canWrite && !isFinished && (
            <MenuItem
              icon={<Icon as={FaEdit} />}
              onClick={() => navigate(`${parcelPath}/production/${productionId}/change`)}>
              {intl.formatMessage({ id: 'season.edit', defaultMessage: 'Edit season' })}
            </MenuItem>
          )}
        </MenuList>
      </Menu>
    </HStack>
  );

  const header = (
    <Box w="100%">
      <Flex
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        align={{ base: 'stretch', md: 'flex-start' }}
        gap={3}>
        <VStack align="flex-start" gap={1} minW={0}>
          <Heading as="h1" {...PAGE_TITLE}>
            {historyData?.product?.name || historyData?.name}
          </Heading>
          <PageHeaderMeta
            items={[
              historyData?.parcel?.name || null,
              historyData?.lot_id
                ? intl.formatMessage(
                    { id: 'season.meta.lot', defaultMessage: 'Lot {id}' },
                    { id: historyData.lot_id }
                  )
                : null,
              rawSeasonEvents.length
                ? intl.formatMessage(
                    {
                      id: 'season.activities.count',
                      defaultMessage: '{count, plural, one {# activity} other {# activities}}'
                    },
                    { count: rawSeasonEvents.length }
                  )
                : null,
              // formatDateFromTimestamp: start_date is a calendar date stored as midnight UTC.
              historyData?.start_date
                ? isFinished
                  ? `${formatDateFromTimestamp(historyData.start_date, undefined, {
                      dateStyle: 'medium'
                    })} – ${formatDateFromTimestamp(historyData.finish_date, undefined, {
                      dateStyle: 'medium'
                    })}`
                  : intl.formatMessage(
                      { id: 'season.meta.since', defaultMessage: 'since {date}' },
                      {
                        date: formatDateFromTimestamp(historyData.start_date, undefined, {
                          dateStyle: 'medium'
                        })
                      }
                    )
                : null
            ]}
          />
          <HStack spacing={1.5} pt={1}>
            <Badge
              variant={isFinished ? 'neutral' : 'subtle'}
              borderRadius="full"
              fontSize="xs"
              textTransform="none">
              {intl.formatMessage({
                id: isFinished ? 'season.status.finished' : 'season.status.underway',
                defaultMessage: isFinished ? 'Finished' : 'Underway'
              })}
            </Badge>
            {historyData?.published && (
              <Badge variant="neutral" borderRadius="full" fontSize="xs" textTransform="none">
                {intl.formatMessage({
                  id: 'production.badge.published',
                  defaultMessage: 'Published'
                })}
              </Badge>
            )}
          </HStack>
        </VStack>
        {headerActions}
      </Flex>
      {historyData?.description && (
        <Text mt={3} color="gray.600" fontSize="sm" lineHeight="1.7" maxW="100ch">
          {historyData.description}
        </Text>
      )}
    </Box>
  );

  const finishedHint = isFinished
    ? intl.formatMessage(
        { id: 'production.finishedLoggingHint' },
        { date: formatDate(historyData.finish_date) }
      )
    : undefined;

  // The wrapper hides itself when the plan renders nothing (no template, or a finished season
  // with nothing logged against it), so it takes no gap.
  const plan = (
    <Box w="full" sx={{ '&:empty': { display: 'none' } }}>
      <SeasonPlanSection
        productionId={historyData?.public_id || productionId || ''}
        farmId={farmId}
        parcelId={parcelId}
        canWrite={canWrite}
        isFinished={isFinished}
      />
    </Box>
  );

  const activities = (
    <SeasonActivitiesCard
      events={rawSeasonEvents}
      onOpen={openEvent}
      onLog={canWrite ? logActivity : undefined}
      isFinished={isFinished}
      finishedHint={finishedHint}
    />
  );

  const photos =
    historyData?.images && historyData.images.length > 0 ? (
      <StandardCard
        mb={0}
        title={intl.formatMessage({ id: 'season.photos.title', defaultMessage: 'Photos' })}>
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
    ) : null;

  // Not gated on qr_code: the cover photo and the preview do not need one, and the card hides
  // the QR and its download when there is none (review of #299).
  const publicPage = (
    <PublicPageCard
      qrCode={historyData?.qr_code}
      coverImageUrl={historyData.cover_image_url}
      isFinished={isFinished}
      isPublished={Boolean(historyData.published)}
      canWrite={canWrite}
      isSavingCover={isSavingCover}
      onDownloadQr={downloadQRCode}
      onPreview={handleViewPublicPage}
      onCopyBuyerLink={handleCopyBuyerLink}
      onSetCover={handleSetCover}
      onClearCover={handleClearCover}
    />
  );

  const details = (
    <SeasonDetailsCard
      history={historyData}
      canWrite={canWrite}
      onOpenFarm={() => navigate(`/admin/dashboard/farm/${farmId}`)}
      onOpenParcel={() => navigate(parcelPath)}
      onCorrectHeader={() => setIsCorrectingHeader(true)}
    />
  );

  // Off-farm handler (CCOF G6.1 / 7 CFR 205.272): not gated on finish_date, a lot goes to the
  // huller during harvest. Sales: not gated either, berries sell all summer (2026-10-26).
  const handler = (
    <PostHarvestHandlerSection
      productionId={historyData?.public_id || productionId || ''}
      companyId={companyId}
      farmId={farmId}
      canWrite={canWrite}
    />
  );
  const sales = (
    <VStack spacing={{ base: 4, md: 6 }} align="stretch" w="100%">
      <SalesRecordsSection
        productionId={historyData?.public_id || productionId || ''}
        canWrite={canWrite}
        establishmentId={farmId}
        // Seeds the sale unit from the lot's harvest unit: the export's mass-balance line
        // prints only when the two unit strings match.
        harvestUnit={historyData?.production_unit}
        // Closed season: the server refuses DELETE on a sale (205.103(b)(4)); void instead.
        isFinished={isFinished}
        companyId={companyId}
        historyId={Number(historyData?.id) || null}
      />
      <SalesDeliverySection historyData={historyData} />
    </VStack>
  );

  const drift = <DriftFindingsBanner events={timelineEvents as any[]} />;

  // Three tabs (2026-11-06). The page held nine sections in one 8,259px column; the farmer comes
  // here to log, to sell, or to hand over the QR, one at a time. Whatever must never hide stays
  // above the tabs: the season's state, the primary action and any drift finding.
  // The tab lives in the URL (?tab=sales) so a link can land on it and Back returns to it.
  const TAB_KEYS = ['activities', 'sales', 'details'] as const;
  const tabIndex = Math.max(
    0,
    TAB_KEYS.indexOf(new URLSearchParams(location.search).get('tab') as (typeof TAB_KEYS)[number])
  );
  const selectTab = (index: number) => {
    const params = new URLSearchParams(location.search);
    if (index === 0) params.delete('tab');
    else params.set('tab', TAB_KEYS[index]);
    const query = params.toString();
    navigate({ search: query ? `?${query}` : '' }, { replace: true });
  };

  // One amber dot, on one fact: a finished lot with no sale on it. The certifier traces each lot
  // to its buyer, and the export's mass-balance line needs the sale. An open season with no sale
  // is normal, so it gets no dot. No green check on any tab, ever: a tick on "Activities" would
  // read as "fully documented", the self-graded verdict the record never carries.
  const activeSales = salesRecords.filter((r: { is_voided?: boolean }) => !r.is_voided).length;
  const salesOutstanding = isFinished && salesLoaded && activeSales === 0;

  const tabs = [
    {
      key: 'activities',
      label: intl.formatMessage({ id: 'season.activities.title', defaultMessage: 'Activities' }),
      status: 'none' as const
    },
    {
      key: 'sales',
      label: intl.formatMessage({ id: 'season.tab.sales', defaultMessage: 'Sales and handling' }),
      status: salesOutstanding ? ('incomplete' as const) : ('none' as const),
      statusLabel: salesOutstanding
        ? intl.formatMessage({
            id: 'season.tab.salesOutstanding',
            defaultMessage: 'No sale recorded yet'
          })
        : undefined
    },
    {
      key: 'details',
      label: intl.formatMessage({ id: 'season.tab.details', defaultMessage: 'QR and details' }),
      status: 'none' as const
    }
  ];

  const body = (
    <StandardSectionTabs
      tabs={tabs}
      activeIndex={tabIndex}
      onChange={selectTab}
      ariaLabel={intl.formatMessage({ id: 'season.tab.aria', defaultMessage: 'Season sections' })}>
      <VStack spacing={{ base: 4, md: 6 }} align="stretch" w="100%" pt={2}>
        {tabIndex === 0 && (
          <>
            {plan}
            {activities}
            {photos}
          </>
        )}
        {tabIndex === 1 && (
          <>
            {sales}
            {handler}
          </>
        )}
        {tabIndex === 2 && (
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 4, md: 6 }} alignItems="start">
            {publicPage}
            {details}
          </SimpleGrid>
        )}
      </VStack>
    </StandardSectionTabs>
  );

  return (
    <StandardPage showBackButton onBack={() => navigate(parcelPath)}>
      <VStack spacing={{ base: 4, md: 6 }} w="100%" align="stretch">
        {header}
        {drift}
        {body}
      </VStack>

      <AuditExportModal
        isOpen={isExportOpen}
        onClose={onExportClose}
        productionId={historyData?.public_id || productionId || ''}
        productionName={historyData?.product?.name || historyData?.name || ''}
      />

      {/* The field-by-field record, with the buyer-page marks; Edit or Correct from there. */}
      <ActivityDetailModal
        row={viewTarget}
        onClose={() => setViewTarget(null)}
        farmId={farmId || ''}
        // AC-15: this page holds the season, so the buyer-page hint can say "appears" when it
        // is published.
        isSeasonPublished={!!historyData?.published}
      />

      <CorrectRecordModal
        isOpen={correctTarget !== null}
        onClose={() => setCorrectTarget(null)}
        eventId={correctTarget?.id}
        eventType={correctTarget?.eventType}
        onCorrected={() => setCorrectTarget(null)}
      />

      {/* F7: season-header correction. A second mount: a header target has no event id. */}
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
