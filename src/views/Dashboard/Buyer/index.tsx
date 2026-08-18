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
  SimpleGrid,
  Switch,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaExternalLinkAlt, FaQrcode, FaTags } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import {
  StandardButton,
  StandardCard,
  StandardPage,
  StandardPageLoading,
  StandardPagination,
  StandardSection,
  StandardSelect
} from 'components/Design/StandardComponents';
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
import type { RootState } from 'store/index';
import { useTour } from 'hooks/useTour';

/** Rows per page. Scans page on the server; productions page in the client (one fetch). */
const SCAN_PAGE_SIZE = 8;
const PRODUCTION_PAGE_SIZE = 10;

const REQUEST_BADGE: Record<string, string> = {
  new: 'warning',
  contacted: 'brand',
  closed: 'neutral'
};

/**
 * `HistoryScan.scan_type` values that have a label.
 *
 * The model's own `choices` are qr / feedback / review / share — but the column also holds
 * **`transparency_api`** (945 of 2,332 rows), written by a path that never went through those
 * choices. So the set on screen is wider than the set in the model, and interpolating the raw
 * value into a message id (`buyer.scanType.${value}`) puts the literal string
 * "buyer.scanType.feedback" in a badge the moment one of the unlabelled values shows up —
 * `MISSING_TRANSLATION` is swallowed by design in `I18n.tsx`, so it fails silently and visibly.
 * Anything unrecognised falls back to a generic label rather than leaking a key.
 */
const SCAN_TYPE_KEYS = new Set(['qr', 'transparency_api', 'review', 'feedback', 'share']);
const scanTypeKey = (scanType: string): string =>
  SCAN_TYPE_KEYS.has(scanType) ? `buyer.scanType.${scanType}` : 'buyer.scanType.other';

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

const BuyerPage = () => {
  const intl = useIntl();
  const toast = useToast();
  const { farmId } = useParams();
  const { canWrite } = useUserRole();
  const currentCompany = useSelector((s: RootState) => s.company.currentCompany);
  const companyId = currentCompany?.id != null ? String(currentCompany.id) : '';

  useTour('buyer-page', { enabled: !!companyId && !!farmId });

  const { data: productions, isLoading } = useGetBuyerFarmProductionsQuery(
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
    try {
      const res = await fetch(env.getApiUrl(`histories/${productionId}/download_qr_code/`), {
        credentials: 'include'
      });
      const data = (await res.json()) as { download_url?: string; error?: string };
      if (!res.ok || !data.download_url) throw new Error(data.error || 'no url');
      window.open(data.download_url, '_blank', 'noopener');
    } catch {
      toast({ title: intl.formatMessage({ id: 'app.error' }), status: 'error', duration: 4000 });
    }
  };

  const handleRequestStatus = async (
    row: BuyerDocRequestRow,
    status: BuyerDocRequestRow['status']
  ) => {
    try {
      await setRequestStatus({ farmId: farmId || '', requestId: row.id, status }).unwrap();
    } catch {
      toast({ title: intl.formatMessage({ id: 'app.error' }), status: 'error', duration: 4000 });
    }
  };

  if (isLoading) {
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

        <Box data-tour="buyer-productions" w="full">
          <StandardSection
            title={intl.formatMessage({ id: 'buyer.productions' })}
            description={intl.formatMessage({ id: 'buyer.productionsHint' })}>
            <StandardCard>
              {!productions?.length ? (
                <Text py={6} textAlign="center" color="gray.500" fontSize="sm">
                  {intl.formatMessage({ id: 'buyer.noProductions' })}
                </Text>
              ) : (
                <Box overflowX="auto">
                  {/* The table element already fills the card, but every column sized to its own
                    content, so on a wide screen the four columns bunched against the left edge
                    with a band of dead space to the right of "Lot tags". Giving the first column
                    `width: 100%` makes it absorb the slack — the standard HTML-table idiom — and
                    pinning the action columns to `1%`/`whiteSpace: nowrap` keeps them tight to
                    their buttons instead of stretching. */}
                  {/* `minW` is what makes the wrapper above actually scroll. Without it the
                      table shrinks to the viewport instead, and `w="100%"` on the first column
                      — which absorbs slack on a wide screen — leaves that column near zero on a
                      phone, so both the header and the cell wrap one character per line
                      ("PRODUCTION" rendered as a vertical P-R-O-D-U-C-T-I-O-N stack at 430px).
                      The scans table below already had this right; this one did not. */}
                  <Table size="sm" w="full" minW="640px" sx={{ tableLayout: 'auto' }}>
                    <Thead>
                      <Tr>
                        {/* nowrap + a floor, so absorbing slack can never collapse the column. */}
                        <Th whiteSpace="nowrap" w="100%" minW="240px">
                          {intl.formatMessage({ id: 'buyer.col.production' })}
                        </Th>
                        <Th whiteSpace="nowrap">
                          {intl.formatMessage({ id: 'buyer.col.parcel' })}
                        </Th>
                        <Th w="1%" whiteSpace="nowrap">
                          {intl.formatMessage({ id: 'buyer.col.visible' })}
                        </Th>
                        <Th w="1%" whiteSpace="nowrap">
                          {intl.formatMessage({ id: 'buyer.col.tools' })}
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {visibleProductions.map((row) => {
                        const finished = Boolean(row.finish_date);
                        const previewUrl = `${config.CONSUMER_BASE_URL}/production/${row.public_id}`;
                        return (
                          <Tr key={row.id}>
                            <Td>
                              <Text fontSize="sm" fontWeight="medium">
                                {row.name || labelOf(row.product)}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                {row.start_date?.slice(0, 10)} →{' '}
                                {row.finish_date?.slice(0, 10) ??
                                  intl.formatMessage({ id: 'buyer.ongoing' })}
                              </Text>
                            </Td>
                            {/* nowrap on the cell as well as the header — with the Production
                              column absorbing the slack, "North Orchard" was breaking across two
                              lines in an 84px column while a third of the row sat empty. */}
                            <Td whiteSpace="nowrap">
                              <Text fontSize="sm">{labelOf(row.parcel)}</Text>
                            </Td>
                            <Td>
                              <Tooltip
                                isDisabled={finished}
                                label={intl.formatMessage({ id: 'buyer.finishFirst' })}>
                                <Box>
                                  <Switch
                                    colorScheme="green"
                                    isChecked={row.published}
                                    isDisabled={
                                      !canWrite || toggling || (!finished && !row.published)
                                    }
                                    onChange={(e) => handleToggle(row.id, e.target.checked)}
                                  />
                                </Box>
                              </Tooltip>
                            </Td>
                            <Td>
                              <HStack spacing={2}>
                                <StandardButton
                                  as="a"
                                  href={previewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  size="sm"
                                  minH="44px"
                                  variant="outline"
                                  leftIcon={<FaExternalLinkAlt />}
                                  isDisabled={!row.published}>
                                  {intl.formatMessage({ id: 'buyer.preview' })}
                                </StandardButton>
                                <StandardButton
                                  size="sm"
                                  minH="44px"
                                  variant="outline"
                                  leftIcon={<FaQrcode />}
                                  onClick={() => handleQrDownload(row.id)}>
                                  {intl.formatMessage({ id: 'buyer.qr' })}
                                </StandardButton>
                                <StandardButton
                                  as="a"
                                  href={env.getApiUrl(`histories/${row.id}/lot-tag/`)}
                                  size="sm"
                                  minH="44px"
                                  variant="outline"
                                  leftIcon={<FaTags />}>
                                  {intl.formatMessage({ id: 'buyer.lotTags' })}
                                </StandardButton>
                              </HStack>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                  <StandardPagination
                    page={safeProductionPage}
                    total={productions.length}
                    pageSize={PRODUCTION_PAGE_SIZE}
                    onChange={setProductionPage}
                    itemLabel={intl.formatMessage({ id: 'buyer.productionsItem' })}
                  />
                </Box>
              )}
            </StandardCard>
          </StandardSection>
        </Box>

        <StandardSection
          title={intl.formatMessage({ id: 'buyer.recentScans' })}
          description={intl.formatMessage({ id: 'buyer.recentScansHint' })}>
          <StandardCard>
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
              // `scan_type` is never shown as a fact: `public_history` leaves it at the model
              // default "qr" for every page view, and `_determine_scan_type` returns anything else
              // only when a comment or share flag is present — "qr" is its else-branch, not a
              // detection. Only a deliberately-set value earns a badge.
              <Box overflowX="auto">
                {/* nowrap on the headers stops them stacking, but only `minW` makes the
                    wrapper scroll rather than compress the row on a phone. */}
                <Table size="sm" w="full" minW="640px">
                  <Thead>
                    <Tr>
                      {/* Every header is nowrap: an uppercase, letter-spaced heading in a narrow
                          column wraps to one character per line otherwise. Production absorbs the
                          slack so the row has no dead band. */}
                      <Th whiteSpace="nowrap">{intl.formatMessage({ id: 'buyer.col.date' })}</Th>
                      <Th whiteSpace="nowrap" w="100%" minW="240px">
                        {intl.formatMessage({ id: 'buyer.col.production' })}
                      </Th>
                      <Th whiteSpace="nowrap">
                        {intl.formatMessage({ id: 'buyer.col.location' })}
                      </Th>
                      <Th whiteSpace="nowrap">{intl.formatMessage({ id: 'buyer.col.parcel' })}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
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
                    ).results.map((scan) => (
                      <Tr key={scan.id}>
                        <Td whiteSpace="nowrap">
                          <Text fontSize="sm">{scan.date?.slice(0, 16) ?? '—'}</Text>
                          {/* Sits with the timestamp because it qualifies the EVENT — the whole
                              signal is about timing.
                              This row is a COUNTED visit; `repeat_count` is how many scans
                              deduplication folded into it. It used to be `is_duplicate` on the
                              repeat row itself, labelled "Repeat" — which asserts a PERSON came
                              back, something the backend cannot know: the match is on
                              sha256(user-agent + Accept-Language + Accept-Encoding + screen)
                              inside a 15-minute window
                              (`DeduplicationService.DEFAULT_TIMEFRAME_MINUTES`). That is a
                              DEVICE-CLASS signature, not an identity — two shoppers on the same
                              phone model with the same language produce the same hash, and the
                              IP-hash fallback is coarser still (one shop's wifi is one hash).
                              Now the list only ever shows counted scans, so the honest statement
                              is how many were folded in, with the rule spelled out on hover. */}
                          {(scan.repeat_count ?? 0) > 0 ? (
                            <Tooltip
                              hasArrow
                              label={intl.formatMessage(
                                { id: 'buyer.scanRepeatHint' },
                                { count: scan.repeat_count }
                              )}
                              placement="top">
                              {/* tabIndex makes the tooltip reachable without a mouse — hover-only
                                  help is invisible on the phone this page is read on. */}
                              <Badge variant="neutral" fontSize="11px" tabIndex={0} cursor="help">
                                {intl.formatMessage(
                                  { id: 'buyer.scanRepeat' },
                                  { count: scan.repeat_count }
                                )}
                              </Badge>
                            </Tooltip>
                          ) : null}
                        </Td>
                        <Td>
                          <Text fontSize="sm" fontWeight="medium">
                            {scan.production || scan.product || '—'}
                          </Text>
                          {/* Product under the season name, not instead of it: the season
                              identifies the page that was scanned. */}
                          {scan.production && scan.product ? (
                            <Text fontSize="xs" color="gray.500">
                              {scan.product}
                            </Text>
                          ) : null}
                        </Td>
                        <Td whiteSpace="nowrap">
                          {/* The serializer already substitutes a literal "-" for an absent
                              location, so normalise it back rather than printing two different
                              placeholder glyphs in one table. */}
                          <Text
                            fontSize="sm"
                            color={locationOf(scan.location) ? undefined : 'gray.400'}>
                            {locationOf(scan.location) ?? '—'}
                          </Text>
                        </Td>
                        <Td whiteSpace="nowrap">
                          <Text fontSize="sm" as="span">
                            {scan.parcel || '—'}
                          </Text>
                          {scan.scan_type && scan.scan_type !== 'qr' ? (
                            <Badge variant="neutral" fontSize="11px" ml={2}>
                              {intl.formatMessage({ id: scanTypeKey(scan.scan_type) })}
                            </Badge>
                          ) : null}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
            <StandardPagination
              page={scanPageIndex}
              total={scanCount ?? 0}
              pageSize={SCAN_PAGE_SIZE}
              onChange={setScanPageIndex}
              itemLabel={intl.formatMessage({ id: 'buyer.scansItem' })}
            />
          </StandardCard>
        </StandardSection>

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
          <StandardSection
            title={intl.formatMessage({ id: 'buyer.requests' })}
            description={intl.formatMessage({ id: 'buyer.requestsHint' })}>
            <StandardCard>
              {!requests?.length ? (
                <Text py={6} textAlign="center" color="gray.500" fontSize="sm">
                  {intl.formatMessage({ id: 'buyer.noRequests' })}
                </Text>
              ) : (
                <VStack align="stretch" spacing={3}>
                  {requests.map((row) => (
                    <Flex
                      key={row.id}
                      p={3}
                      borderWidth="1px"
                      borderColor="gray.200"
                      borderRadius="md"
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
          </StandardSection>
        </Box>
      </VStack>
    </StandardPage>
  );
};

export default BuyerPage;
