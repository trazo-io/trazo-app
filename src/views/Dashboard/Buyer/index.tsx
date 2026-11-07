/**
 * Buyer Page (WS-6) — the SECOND output, gathered in one place.
 *
 * Aggregation only, no new consumer-side build: per-production publish state +
 * QR / lot-tag downloads + public-page preview, the scan-count card (the one
 * analytics survivor), and the buyer documentation-request inbox. The consumer
 * ProductDetail page itself stays exactly as shipped (claim-safe).
 *
 * Route: /admin/dashboard/farm/:farmId/buyer
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Flex,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  SimpleGrid,
  Switch,
  Text,
  Tooltip,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaChevronDown, FaExternalLinkAlt, FaPrint, FaQrcode, FaTags } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import type { IntlShape } from 'react-intl';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import {
  StandardButton,
  StandardCard,
  StandardPage,
  StandardPageLoading,
  StandardPagination,
  StandardSelect
} from 'components/Design/StandardComponents';
import { formatDateFromTimestamp } from 'utils/dateOnly';
import { config, env } from 'config/environment';
import { useUserRole } from 'hooks/useUserRole';
import {
  useGetBuyerPageDocRequestsQuery,
  useGetBuyerFarmProductionsQuery,
  useSetBuyerDocRequestStatusMutation,
  useSetProductionPublishedMutation
} from 'store/api/buyerPageApi';
import type { BuyerDocRequestRow } from 'store/api/buyerPageApi';
import { useGetFarmScansPaginatedQuery } from 'store/api/historyApi';
import BuyerReviewLinkCard from 'components/Certifications/BuyerReviewLinkCard';
import type { RootState } from 'store/index';
import { useTour } from 'hooks/useTour';
import { apiErrorMessage } from 'utils/apiErrorMessage';

/** Rows per page. Scans page on the server; productions page in the client (one fetch). */
const SCAN_PAGE_SIZE = 8;
const PRODUCTION_PAGE_SIZE = 10;

const REQUEST_BADGE: Record<string, string> = {
  new: 'warning',
  contacted: 'brand',
  closed: 'neutral'
};

/**
 * Server-side scan filters. Keys are the endpoint's own query parameters, and each value is the
 * id the endpoint hands back on every row (`production_id`, `product_id`, `parcel_id`) — the
 * client filters with keys it was given, never ones it derived.
 *
 * `''` means "all": `getFarmScansPaginated` drops empty values before building the query string,
 * so an unset filter never reaches the URL.
 */
interface ScanFilters {
  production_id: string;
  product_id: string;
  parcel_id: string;
}
const EMPTY_SCAN_FILTERS: ScanFilters = { production_id: '', product_id: '', parcel_id: '' };

/** The options the endpoint reports for this establishment — only values that have scans. */
interface ScanFilterOption {
  id: number;
  name: string | null;
}

/**
 * A scan's location, or null when there isn't one.
 *
 * `establishment_scans_paginated` sends `get_location_display() or "-"`, so "absent" arrives as a
 * literal ASCII hyphen. Left alone that renders as a second, different placeholder next to the
 * em dashes every other column uses.
 *
 * `XX` / `Unknown` are the CURRENT sentinels, not legacy ones: `process_scan_consent` writes them
 * whenever consent is absent or the IP does not resolve, because `country_code`/`region` are
 * NOT NULL. `get_location_display()` already maps them to null, but they are matched here too so
 * that a row reaching this table through any other serializer cannot render "Unknown, XX" as if
 * it were a place. The legacy `city`/`country` branch is also still covered — rows written before
 * the two scan writers were unified (2026-08-16) carry those instead.
 */
const LOCATION_PLACEHOLDERS = new Set(['-', '—', '', 'XX', 'Unknown', 'Unknown, XX']);
const locationOf = (location: string | null | undefined): string | null => {
  const trimmed = (location ?? '').trim();
  return LOCATION_PLACEHOLDERS.has(trimmed) ? null : trimmed;
};

const labelOf = (value: unknown): string => {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  const named = value as { name?: string };
  return named.name ?? '—';
};

/**
 * A scan's time, in the reader's own clock and language ("Oct 8, 2026, 6:48 PM").
 *
 * The endpoint sends `"YYYY-MM-DD HH:MM:SS"` in UTC (TIME_ZONE = "UTC"). It printed as that raw
 * string: an ISO timestamp three hours ahead of a farmer in Oregon. A scan is an instant, unlike
 * an activity date, so it is shown in local time.
 */
const formatScanTime = (value: string | null | undefined, intl: IntlShape): string => {
  if (!value) return '—';
  const instant = new Date(`${value.replace(' ', 'T')}Z`);
  return Number.isNaN(instant.getTime())
    ? value
    : intl.formatDate(instant, { dateStyle: 'medium', timeStyle: 'short' });
};

/** One rule between rows, none above the first. */
const ROW_RULE = { '& + &': { borderTopWidth: '1px', borderTopColor: 'gray.100' } };

const BuyerPage = () => {
  const intl = useIntl();
  const toast = useToast();
  const { farmId } = useParams();
  const { canWrite } = useUserRole();
  const currentCompany = useSelector((s: RootState) => s.company.currentCompany);
  const companyId = currentCompany?.id != null ? String(currentCompany.id) : '';

  useTour('buyer-page', { enabled: !!companyId && !!farmId });

  const {
    data: productions,
    isLoading,
    isUninitialized
  } = useGetBuyerFarmProductionsQuery(
    { companyId, farmId: farmId || '' },
    { skip: !companyId || !farmId }
  );
  // Server-side: the endpoint already returns {count, results}; only the page was hardcoded.
  const [scanPageIndex, setScanPageIndex] = useState(1);
  // Scan filters. Server-side, because the list is server-paged: filtering the eight rows already
  // in the client would only ever hide rows from the current page and leave the count lying.
  const [scanFilters, setScanFilters] = useState<ScanFilters>(EMPTY_SCAN_FILTERS);
  const { data: scanPage } = useGetFarmScansPaginatedQuery(
    {
      establishment_id: farmId || '',
      company_id: companyId,
      page: scanPageIndex,
      page_size: SCAN_PAGE_SIZE,
      ...scanFilters
    },
    { skip: !companyId || !farmId }
  );
  // The same endpoint, one row deep, purely to read `count` for a 30-day window. Without it the
  // card showed a single all-time total with no timeframe, which answers neither "is anything
  // happening" nor "how much has ever happened".
  const thirtyDaysAgo = useMemo(
    () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    []
  );
  const { data: recentScanPage } = useGetFarmScansPaginatedQuery(
    {
      establishment_id: farmId || '',
      company_id: companyId,
      page: 1,
      page_size: 1,
      date_from: thirtyDaysAgo
    },
    { skip: !companyId || !farmId }
  );

  const { data: requests } = useGetBuyerPageDocRequestsQuery(
    { farmId: farmId || '' },
    { skip: !farmId }
  );
  const [setPublished, { isLoading: toggling }] = useSetProductionPublishedMutation();
  const [setRequestStatus] = useSetBuyerDocRequestStatusMutation();

  const scanCount = (scanPage as { count?: number } | undefined)?.count;
  const recentScanCount = (recentScanPage as { count?: number } | undefined)?.count;

  // Facts the farmer can act on, all from data this page already has. `published of total` is the
  // one that changes behaviour: an unpublished season is invisible to a buyer, and that is the
  // whole job of this page.
  const publishedCount = (productions ?? []).filter((p) => p.published).length;
  const openRequestCount = (requests ?? []).filter((r) => r.status === 'new').length;

  // The scan page is SERVER-side, so it cannot be derived-and-clamped the way the client-side
  // production page is: the count that bounds it only arrives with the response for the page
  // being requested. If the total shrinks under a viewer sitting on the last page, the request
  // returns an empty page and the list falls through to "No scans yet" — a correction effect is
  // the honest fix here, and it re-queries the page that does exist.
  useEffect(() => {
    if (scanCount == null) return;
    const pageCount = Math.max(1, Math.ceil(scanCount / SCAN_PAGE_SIZE));
    if (scanPageIndex > pageCount) setScanPageIndex(pageCount);
  }, [scanCount, scanPageIndex]);

  // A narrowed list almost never has the page you were on. Without this, filtering from page 4
  // requests page 4 of a 1-page result and the correction effect above has to bounce it back —
  // one wasted round trip and a visible flash of "No scans yet".
  useEffect(() => {
    setScanPageIndex(1);
  }, [scanFilters]);

  // Options come from the RESPONSE, not from the productions list: `getBuyerFarmProductions` returns
  // `parcel` as a bare name with no id, so there is nothing to filter by, and it would offer every
  // parcel on the farm rather than the ones that have scans. The endpoint reports both.
  const scanFilterOptions = (
    scanPage as { filter_options?: Record<string, ScanFilterOption[]> } | undefined
  )?.filter_options;
  // A select with one option is a label wearing a chevron: it can only ever re-select what is
  // already shown. Rendered only where there is a choice to make.
  const filterSelects = useMemo(
    () =>
      (
        [
          {
            key: 'production_id',
            labelId: 'buyer.filter.production',
            options: scanFilterOptions?.productions
          },
          { key: 'product_id', labelId: 'buyer.filter.crop', options: scanFilterOptions?.products },
          { key: 'parcel_id', labelId: 'buyer.filter.parcel', options: scanFilterOptions?.parcels }
        ] as const
      ).filter((f) => (f.options?.length ?? 0) > 1),
    [scanFilterOptions]
  );
  const hasActiveScanFilter = Object.values(scanFilters).some(Boolean);

  // Client-side: `getBuyerFarmProductions` returns the whole list in one response, so paging here is
  // pure presentation — it stops a 166-season farm from rendering 166 table rows at once.
  //
  // CLAMPED, not just stored. If the list shrinks under a viewer sitting on a later page (a
  // refetch, a deletion elsewhere), an unclamped index slices past the end and paints an empty
  // table under a pager reading "Page 3 of 1". Deriving the effective page instead of correcting
  // it in an effect keeps it to one render and needs no extra state.
  const [productionPage, setProductionPage] = useState(1);
  const productionPageCount = Math.max(
    1,
    Math.ceil((productions?.length ?? 0) / PRODUCTION_PAGE_SIZE)
  );
  const safeProductionPage = Math.min(productionPage, productionPageCount);
  const visibleProductions = useMemo(
    () =>
      (productions ?? []).slice(
        (safeProductionPage - 1) * PRODUCTION_PAGE_SIZE,
        safeProductionPage * PRODUCTION_PAGE_SIZE
      ),
    [productions, safeProductionPage]
  );

  const handleToggle = async (productionId: number, next: boolean) => {
    try {
      await setPublished({
        companyId,
        farmId: farmId || '',
        productionId,
        published: next
      }).unwrap();
      toast({
        title: intl.formatMessage({ id: next ? 'buyer.published' : 'buyer.unpublished' }),
        status: 'success',
        duration: 2500,
        isClosable: true
      });
    } catch (err) {
      toast({
        title: intl.formatMessage({ id: 'app.error' }),
        description: (err as { data?: { error?: string } })?.data?.error,
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  // download_qr_code returns JSON {download_url} (S3 presign in prod, local file
  // URL in dev) — resolve it, then open the actual image.
  const handleQrDownload = async (productionId: number) => {
    let reason: string | null = null;
    try {
      const res = await fetch(env.getApiUrl(`histories/${productionId}/download_qr_code/`), {
        credentials: 'include'
      });
      const data = (await res.json()) as { download_url?: string; error?: string };
      if (!res.ok || !data.download_url) {
        // `apiErrorMessage` reads an RTK error; this is a raw fetch, so hand it the same shape.
        reason = apiErrorMessage({ data });
        throw new Error('no download url');
      }
      window.open(data.download_url, '_blank', 'noopener');
    } catch {
      toast({
        title: intl.formatMessage({ id: 'buyer.qrFailed' }),
        description: reason ?? undefined,
        status: 'error',
        duration: 4000
      });
    }
  };

  const handleRequestStatus = async (
    row: BuyerDocRequestRow,
    status: BuyerDocRequestRow['status']
  ) => {
    try {
      await setRequestStatus({ farmId: farmId || '', requestId: row.id, status }).unwrap();
    } catch (err: unknown) {
      toast({
        title: intl.formatMessage({ id: 'buyer.requestUpdateFailed' }),
        description: apiErrorMessage(err) ?? undefined,
        status: 'error',
        duration: 4000
      });
    }
  };

  // `isUninitialized`: `companyId` hydrates async, so this query is skipped on a cold load
  // and reports `isLoading: false` with no productions — rendering the buyer page as though
  // the farm has published nothing. This page exists to be shown to a BUYER; an empty one is
  // the worst possible first impression to paint from a request that never ran.
  if (isLoading || isUninitialized) {
    return (
      <StandardPage title={intl.formatMessage({ id: 'buyer.pageTitle' })}>
        <StandardPageLoading />
      </StandardPage>
    );
  }

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'buyer.pageTitle' })}
      description={intl.formatMessage({ id: 'buyer.pageDescription' })}>
      <VStack align="stretch" spacing={6}>
        {/* Was ONE number and a floating "All Productions" badge in a full-width card: a stat on
            the left, a pill stranded on the right, and a wide empty band between them. The badge
            was a scope note dressed as a status, and the number had no timeframe — 35 scans over
            what period? Four facts now, each of which answers a question a grower would ask, and
            none of which needed new data:
              · all-time scans        (the total that was already here)
              · last 30 days          (is anything happening NOW)
              · published of total    (the only one that changes what they should DO)
              · open requests         (work waiting on them, mirrored by the inbox below) */}
        <Box data-tour="buyer-stats" w="full">
          <StandardCard>
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
              <VStack align="flex-start" spacing={0}>
                <Text fontSize="xs" color="gray.600">
                  {intl.formatMessage({ id: 'buyer.scanCount' })}
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="green.700" lineHeight="1.2">
                  {scanCount ?? '—'}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {intl.formatMessage({ id: 'buyer.scanCountHint' })}
                </Text>
              </VStack>

              <VStack align="flex-start" spacing={0}>
                <Text fontSize="xs" color="gray.600">
                  {intl.formatMessage({ id: 'buyer.scansRecent' })}
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="green.700" lineHeight="1.2">
                  {recentScanCount ?? '—'}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {intl.formatMessage({ id: 'buyer.scansRecentHint' })}
                </Text>
              </VStack>

              <VStack align="flex-start" spacing={0}>
                <Text fontSize="xs" color="gray.600">
                  {intl.formatMessage({ id: 'buyer.publishedStat' })}
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="green.700" lineHeight="1.2">
                  {intl.formatMessage(
                    { id: 'buyer.publishedOf' },
                    { published: publishedCount, total: (productions ?? []).length }
                  )}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {intl.formatMessage({ id: 'buyer.publishedStatHint' })}
                </Text>
              </VStack>

              <VStack align="flex-start" spacing={0}>
                <Text fontSize="xs" color="gray.600">
                  {intl.formatMessage({ id: 'buyer.openRequestsStat' })}
                </Text>
                <Text
                  fontSize="2xl"
                  fontWeight="bold"
                  lineHeight="1.2"
                  color={openRequestCount > 0 ? 'orange.500' : 'green.600'}>
                  {openRequestCount}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {intl.formatMessage({ id: 'buyer.openRequestsStatHint' })}
                </Text>
              </VStack>
            </SimpleGrid>
          </StandardCard>
        </Box>

        {/* The in-season output (2026-08-25): the QR page serves the SHOPPER after
            harvest; a wholesale buyer decides before it. The buyer review link is the
            producer-consented way to open in-season records — same claim-safe policy
            as the public page, private token, revocable, opens logged. */}
        <Box data-tour="buyer-review-link" w="full">
          <BuyerReviewLinkCard companyId={companyId} farmId={farmId || ''} canWrite={canWrite} />
        </Box>

        {/* Seasons as rows (2026-11-07). The table carried three bordered buttons per season
            (Preview, QR, Lot tags) beside the switch: thirty buttons for ten seasons, and on a
            phone the switch and every button sat off the right edge behind a sideways scroll.
            Now a row: the season, the switch that publishes it, Preview as a link, and the two
            printables in one Print menu. The same row on every width. */}
        <Box data-tour="buyer-productions" w="full">
          <StandardCard
            mb={0}
            title={intl.formatMessage({ id: 'buyer.productions' })}
            subtitle={intl.formatMessage({ id: 'buyer.productionsHint' })}>
            {!productions?.length ? (
              <Text py={6} textAlign="center" color="gray.500" fontSize="sm">
                {intl.formatMessage({ id: 'buyer.noProductions' })}
              </Text>
            ) : (
              <VStack align="stretch" spacing={0}>
                {visibleProductions.map((row) => {
                  const finished = Boolean(row.finish_date);
                  const previewUrl = `${config.CONSUMER_BASE_URL}/production/${row.public_id}`;
                  const name = row.name || labelOf(row.product);
                  const start = formatDateFromTimestamp(row.start_date, intl.locale);
                  const end = formatDateFromTimestamp(row.finish_date, intl.locale);
                  return (
                    <Flex
                      key={row.id}
                      sx={ROW_RULE}
                      py={3}
                      gap={{ base: 2, md: 4 }}
                      direction={{ base: 'column', md: 'row' }}
                      align={{ base: 'stretch', md: 'center' }}>
                      <Box flex="1" minW={0}>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                          {name}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          {/* No start date is possible on legacy rows; then the range is
                              left out rather than printing "null" (review of #307). */}
                          {[
                            labelOf(row.parcel),
                            start && end
                              ? `${start} – ${end}`
                              : start
                              ? intl.formatMessage({ id: 'buyer.since' }, { date: start })
                              : end
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </Box>
                      <HStack spacing={2} flexShrink={0} justify="space-between">
                        {/* The switch is labelled in words beside it: "Public" or "Not public".
                            An unlabelled toggle in a table column only said so through the
                            column header, which a phone never showed. */}
                        <Tooltip
                          isDisabled={finished}
                          label={intl.formatMessage({ id: 'buyer.finishFirst' })}>
                          <HStack as="label" spacing={2} minH="44px" cursor="pointer" pr={2}>
                            <Switch
                              colorScheme="green"
                              isChecked={row.published}
                              isDisabled={!canWrite || toggling || (!finished && !row.published)}
                              onChange={(e) => handleToggle(row.id, e.target.checked)}
                            />
                            <Text fontSize="sm" color="gray.700" minW="80px">
                              {intl.formatMessage({
                                id: row.published ? 'buyer.isPublic' : 'buyer.isNotPublic'
                              })}
                            </Text>
                          </HStack>
                        </Tooltip>
                        <HStack spacing={1}>
                          {/* Only a published season has a page to open. The slot keeps its
                              width when empty, so Print lines up down the list. */}
                          <Box minW={{ base: 0, md: '128px' }} textAlign="right">
                            {row.published && (
                              <StandardButton
                                as="a"
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                size="sm"
                                variant="ghost"
                                leftIcon={<Icon as={FaExternalLinkAlt} />}>
                                {intl.formatMessage({ id: 'buyer.openPage' })}
                              </StandardButton>
                            )}
                          </Box>
                          <Menu placement="bottom-end" autoSelect={false}>
                            <MenuButton
                              as={StandardButton}
                              size="sm"
                              variant="outline"
                              leftIcon={<Icon as={FaPrint} />}
                              rightIcon={<Icon as={FaChevronDown} boxSize={3} />}
                              aria-label={intl.formatMessage({ id: 'buyer.printFor' }, { name })}>
                              {intl.formatMessage({ id: 'buyer.print' })}
                            </MenuButton>
                            <MenuList>
                              <MenuItem
                                icon={<Icon as={FaQrcode} />}
                                onClick={() => handleQrDownload(row.id)}>
                                {intl.formatMessage({ id: 'buyer.qr' })}
                              </MenuItem>
                              <MenuItem
                                as="a"
                                href={env.getApiUrl(`histories/${row.id}/lot-tag/`)}
                                icon={<Icon as={FaTags} />}>
                                {intl.formatMessage({ id: 'buyer.lotTags' })}
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </HStack>
                      </HStack>
                    </Flex>
                  );
                })}
                <StandardPagination
                  page={safeProductionPage}
                  total={productions.length}
                  pageSize={PRODUCTION_PAGE_SIZE}
                  onChange={setProductionPage}
                  itemLabel={intl.formatMessage({ id: 'buyer.productionsItem' })}
                />
              </VStack>
            )}
          </StandardCard>
        </Box>

        <StandardCard
          mb={0}
          title={intl.formatMessage({ id: 'buyer.recentScans' })}
          subtitle={intl.formatMessage({ id: 'buyer.recentScansHint' })}>
          {/* Filters sit ABOVE the empty/table branch on purpose: filter down to nothing and the
                controls have to still be there to undo it. */}
          {filterSelects.length ? (
            <Flex
              gap={3}
              mb={4}
              align={{ base: 'stretch', smd: 'flex-end' }}
              direction={{ base: 'column', smd: 'row' }}
              wrap="wrap">
              {filterSelects.map((filter) => (
                <Box key={filter.key} minW={{ base: 'full', smd: '200px' }}>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    {intl.formatMessage({ id: filter.labelId })}
                  </Text>
                  <StandardSelect
                    size="sm"
                    value={scanFilters[filter.key]}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setScanFilters((prev) => ({ ...prev, [filter.key]: e.target.value }))
                    }
                    aria-label={intl.formatMessage({ id: filter.labelId })}>
                    <option value="">{intl.formatMessage({ id: 'buyer.filter.all' })}</option>
                    {(filter.options ?? []).map((option) => (
                      <option key={option.id} value={String(option.id)}>
                        {option.name || `#${option.id}`}
                      </option>
                    ))}
                  </StandardSelect>
                </Box>
              ))}
              {hasActiveScanFilter ? (
                <StandardButton
                  size="sm"
                  variant="outline"
                  minH="44px"
                  onClick={() => setScanFilters(EMPTY_SCAN_FILTERS)}>
                  {intl.formatMessage({ id: 'buyer.filter.clear' })}
                </StandardButton>
              ) : null}
            </Flex>
          ) : null}
          {/* The match count IS the answer to "how many scans did this block get" — and
                StandardPagination, correctly, hides itself when the result fits one page, taking
                its "of N" with it. So the total is stated here whenever a filter is narrowing. */}
          {hasActiveScanFilter && scanCount != null ? (
            <Text fontSize="sm" color="gray.600" mb={3}>
              {intl.formatMessage({ id: 'buyer.filter.matchCount' }, { count: scanCount })}
            </Text>
          ) : null}
          {!(scanPage as { results?: unknown[] })?.results?.length ? (
            <Text py={6} textAlign="center" color="gray.500" fontSize="sm">
              {intl.formatMessage({
                // "No scans yet" is wrong under an active filter — the farm HAS scans, this
                // slice of it does not, and the fix is to widen the filter, not to wait.
                id: hasActiveScanFilter ? 'buyer.noScansForFilter' : 'buyer.noScans'
              })}
            </Text>
          ) : (
            // A TABLE, matching the Productions table above. Columns are chosen from the WRITE
            // PATHS, not from row counts in the dev DB — that database is fixtures, so counting
            // it tells you about the seeder.
            //
            // The shopper's path is: `views/Scan/ProductDetail` -> `useCreateScanMutation` ->
            // POST `public_scans/`. (`public_history` also creates a scan, but only
            // `ModernProductReview` and the producer's own `ProfileProduction` call it, and the
            // latter is skipped by the `is_owner` guard.)
            //
            // LOCATION is real on that path. `PublicHistoryScanViewSet.create` spreads
            // `PrivacyService.process_scan_consent(request)`, which resolves the client IP
            // against the LOCAL GeoLite2 database (`history/services/geoip_service.py`) and
            // stores the privacy-safe pair `country_code` + `region` — an ISO 3166-1 alpha-2
            // code plus the state/province, never the city. The legacy `city`/`country`
            // columns are deliberately nulled (GDPR data minimisation), and the payload's
            // `location` is `get_location_display()`, which prefers that pair.
            //
            // 2026-08-16: this used to call ipapi.co, which answers 429/403 from the
            // DigitalOcean egress and had been failing SILENTLY on every scan in production
            // — the column was empty for every row. Do not reintroduce an HTTP geolocation
            // call; `test_scan_geolocation.py` fails if a lookup touches the network.
            //
            // It is CONSENT-GATED: without the `trazo-analytics-consent` cookie the service
            // returns country_code "XX" / region "Unknown", which `get_location_display()`
            // maps to null. The scan itself is still recorded — the count is not gated, only
            // what the row carries. Because the scan POSTs on mount and the banner renders
            // after it, a first-time visitor's row is written anonymous and then UPGRADED in
            // place by `public_scans/consent/` when they accept; there is never a second row.
            // So an em dash here means "declined, ignored the banner, or the IP did not
            // resolve" — never "the scan was not counted".
            // Locally it is ALWAYS an em dash: a private/loopback IP has no location to find.
            //
            // COMMENT dropped. The endpoint accepts one, but NOTHING IN THE APP EVER SENDS ONE:
            // `useCommentHistoryMutation` and `recordTransparencyScan` both have zero call
            // sites, and no consumer surface has a comment input. An endpoint that accepts a
            // field is not a writer. It also made the UI worse — `w="100%"` on a column whose
            // every cell was an em dash left half the card blank.
            //
            // `scan_type` is not shown at all (badge removed 2026-09-02). `public_history`
            // leaves it at the model default "qr" for every page view; the "review"/"feedback"
            // values came only from the consumer reviews product retired 2026-08-06, and
            // "transparency_api" from a legacy write path. Nothing writes a non-"qr" value
            // today, so a "Review" badge on a live farm could only ever be seeded data.
            /* Rows, not a four-column table (2026-11-07): on a phone the table ran off the
                 right edge, and its Location column read "—" on every row, because a location
                 is only stored when the shopper consented to it. It shows where there is one. */
            <VStack align="stretch" spacing={0}>
              {(
                scanPage as {
                  results: Array<{
                    id: number;
                    date: string | null;
                    product: string | null;
                    parcel: string | null;
                    scan_type?: string | null;
                    repeat_count?: number;
                    production?: string | null;
                    location?: string | null;
                  }>;
                }
              ).results.map((scan) => {
                const place = locationOf(scan.location);
                return (
                  <Flex
                    key={scan.id}
                    sx={ROW_RULE}
                    py={3}
                    gap={{ base: 1, md: 4 }}
                    direction={{ base: 'column', md: 'row' }}
                    align={{ base: 'stretch', md: 'center' }}>
                    <Box flex="1" minW={0}>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                        {scan.production || scan.product || '—'}
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        {/* Product under the season name, not instead of it: the season
                              identifies the page that was scanned. */}
                        {[scan.production ? scan.product : null, scan.parcel, place]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </Box>
                    <HStack spacing={2} flexShrink={0}>
                      <Text fontSize="sm" color="gray.700" whiteSpace="nowrap">
                        {formatScanTime(scan.date, intl)}
                      </Text>
                      {/* A COUNTED visit; `repeat_count` is how many scans deduplication
                            folded into it. The match is a device-class signature inside a
                            15-minute window, not a person, so the rule is spelled out on hover
                            and never called a "repeat" visitor. */}
                      {(scan.repeat_count ?? 0) > 0 ? (
                        <Tooltip
                          hasArrow
                          label={intl.formatMessage(
                            { id: 'buyer.scanRepeatHint' },
                            { count: scan.repeat_count }
                          )}
                          placement="top">
                          <Badge variant="neutral" fontSize="11px" tabIndex={0} cursor="help">
                            {intl.formatMessage(
                              { id: 'buyer.scanRepeat' },
                              { count: scan.repeat_count }
                            )}
                          </Badge>
                        </Tooltip>
                      ) : null}
                    </HStack>
                  </Flex>
                );
              })}
            </VStack>
          )}
          <StandardPagination
            page={scanPageIndex}
            total={scanCount ?? 0}
            pageSize={SCAN_PAGE_SIZE}
            onChange={setScanPageIndex}
            itemLabel={intl.formatMessage({ id: 'buyer.scansItem' })}
          />
        </StandardCard>

        {/* "Latest comments" REMOVED 2026-08-11.
            It read the `Review` model — the consumer-account/reviews product retired 2026-08-06
            (§10.5) and already on the November demolition list. Newest row in the whole database
            is 2026-03-06, five months stale, and `scan_type='review'` has exactly 1 occurrence in
            2,332 scans: nothing can populate this section any more, so it was a permanent empty
            state on the page that sells the second output.
            `HistoryScan.comment` is not a replacement: the column has rows, but they are seeder
            output — no surface in the app sends a comment (see the note on the scans table). The
            Review model, its endpoint and the reviews app are left untouched for the November
            cut. */}
        <Box data-tour="buyer-requests" w="full">
          <StandardCard
            mb={0}
            title={intl.formatMessage({ id: 'buyer.requests' })}
            subtitle={intl.formatMessage({ id: 'buyer.requestsHint' })}>
            {!requests?.length ? (
              <Text py={6} textAlign="center" color="gray.500" fontSize="sm">
                {intl.formatMessage({ id: 'buyer.noRequests' })}
              </Text>
            ) : (
              <VStack align="stretch" spacing={0}>
                {requests.map((row) => (
                  <Flex
                    key={row.id}
                    sx={ROW_RULE}
                    py={3}
                    justify="space-between"
                    align={{ base: 'stretch', smd: 'center' }}
                    direction={{ base: 'column', smd: 'row' }}
                    gap={3}>
                    <VStack align="flex-start" spacing={0} minW={0}>
                      <HStack spacing={2}>
                        <Text fontSize="sm" fontWeight="semibold">
                          {row.requester_name}
                        </Text>
                        <Badge variant={REQUEST_BADGE[row.status]} fontSize="11px">
                          {intl.formatMessage({ id: `buyer.requestStatus.${row.status}` })}
                        </Badge>
                      </HStack>
                      <Text fontSize="xs" color="gray.600">
                        {row.requester_email}
                        {row.organization ? ` · ${row.organization}` : ''}
                      </Text>
                      {row.message ? (
                        <Text fontSize="xs" color="gray.500" noOfLines={2}>
                          {row.message}
                        </Text>
                      ) : null}
                    </VStack>
                    {canWrite && (
                      <StandardSelect
                        value={row.status}
                        maxW="180px"
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          handleRequestStatus(row, e.target.value as BuyerDocRequestRow['status'])
                        }>
                        <option value="new">
                          {intl.formatMessage({ id: 'buyer.requestStatus.new' })}
                        </option>
                        <option value="contacted">
                          {intl.formatMessage({ id: 'buyer.requestStatus.contacted' })}
                        </option>
                        <option value="closed">
                          {intl.formatMessage({ id: 'buyer.requestStatus.closed' })}
                        </option>
                      </StandardSelect>
                    )}
                  </Flex>
                ))}
              </VStack>
            )}
          </StandardCard>
        </Box>
      </VStack>
    </StandardPage>
  );
};

export default BuyerPage;
