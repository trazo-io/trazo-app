/**
 * Traceback: the inspector's § 205.103(b)(2) exercise, run by the operation before the inspection.
 *
 * The inspector reads a number off a sales document (invoice, bill of lading, a lot code) and
 * walks it back: sale -> harvest pick -> season -> inputs. This page does the same walk on the
 * farm's own records and names every hop where the link is missing, with a way to the record
 * that fixes it.
 *
 * It can also start from a HARVEST LOT (product in storage, not yet sold): the pick walks back to
 * its season and inputs the same way, and forward to the sales that name it, with the season's
 * recorded harvested minus recorded sold per storage location.
 *
 * Rules (backend: history/services/traceback.py):
 * - Several matches are LISTED, never resolved for the operator: lot codes are not unique across
 *   seasons, and picking one would trace the wrong lot with full confidence.
 * - Gaps are named, one per missing field. There is no total, percentage or pass badge.
 * - An input with no classification reads "not classified", never "prohibited".
 *
 * Route: /admin/dashboard/farm/:farmId/traceback[?sale=<id> | ?pick=<id>]
 */

import React, { useEffect, useState } from 'react';
import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import { FaRandom, FaRoute, FaSearch } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  StandardAlert,
  StandardButton,
  StandardCard,
  StandardEmptyState,
  StandardPage,
  StandardPageLoading,
  StandardQueryError,
  StandardSearchInput,
  StandardSegmentedControl,
  StatusList
} from 'components/Design/StandardComponents';
import {
  useGetLotTracebackQuery,
  useGetSaleTracebackQuery,
  useSearchTracebackLotsQuery,
  useSearchTracebackSalesQuery
} from 'store/api/historyApi';
import TraceChain, { type TraceDoc, type TraceGap } from 'components/Traceback/TraceChain';
import { DOCUMENT_DOWNLOAD_URL } from 'config';
import { env } from 'config/environment';

type Gap = TraceGap;
type SearchArgs = { q?: string; random?: number; establishmentId?: string };
type Mode = 'sale' | 'lot';

// Backend event families, as the activity edit route takes them (`?event_type=`).
const EVENT_TYPE_BY_KIND: Record<string, number> = {
  pick: 1,
  seed: 1,
  chemical: 2,
  amendment: 5,
  beneficial: 6
};

/**
 * Input kinds whose record carries a purchase invoice and so takes a receipt. A seed row is a
 * planting or transplanting that names a purchase; the server raises its receipt gap only then.
 */
const RECEIPT_KINDS = new Set(['chemical', 'amendment', 'seed']);

export const TracebackPage = () => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);
  const { farmId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const saleId = searchParams.get('sale');
  // A trace started from a harvest lot. Only one anchor is ever open: `pick` wins over `sale`
  // only if both were typed by hand, and the page never writes both.
  const pickId = saleId ? null : searchParams.get('pick');

  const [mode, setMode] = useState<Mode>(pickId ? 'lot' : 'sale');
  const [text, setText] = useState('');
  const [args, setArgs] = useState<SearchArgs | null>(null);
  const [lotArgs, setLotArgs] = useState<SearchArgs | null>(null);

  const search = useSearchTracebackSalesQuery(args, { skip: !args });
  const trace = useGetSaleTracebackQuery(
    { saleId, establishmentId: farmId },
    { skip: !saleId || !farmId }
  );
  const lotSearch = useSearchTracebackLotsQuery(lotArgs, { skip: !lotArgs });
  const lotTrace = useGetLotTracebackQuery(
    { pickId, establishmentId: farmId },
    { skip: !pickId || !farmId }
  );

  // The open trace decides the mode (Back from a sale opened off a lot returns to the lot).
  useEffect(() => {
    if (pickId) setMode('lot');
    else if (saleId) setMode('sale');
  }, [pickId, saleId]);

  // `currentData`, never `data`: RTK keeps `data` from the LAST success for any args, so a failed
  // search or a 404 trace would render the previous answer under the new question.
  const matches: any[] | undefined = search.currentData?.results;
  const truncated = Boolean(search.currentData?.truncated);
  const recall =
    Boolean(matches?.length) && matches!.every((m) => m.matched_on.startsWith('input_'));

  // One match is the sale: open it once, when that answer arrives. Several are a choice the
  // operator makes, never this page. Keyed on the response time, so Back (or re-submitting the
  // same code, which reuses the cached answer) shows the one-row list instead of a blank page.
  useEffect(() => {
    if (search.currentData?.results?.length === 1) {
      setSearchParams({ sale: String(search.currentData.results[0].sale_id) });
    }
  }, [search.fulfilledTimeStamp]);

  // The same rule for a harvest lot: one matching pick opens; several are a choice.
  const lotMatches: any[] | undefined = lotSearch.currentData?.results;
  useEffect(() => {
    if (lotSearch.currentData?.results?.length === 1) {
      setSearchParams({ pick: String(lotSearch.currentData.results[0].pick_id) });
    }
  }, [lotSearch.fulfilledTimeStamp]);

  const runSearch = (next: SearchArgs) => {
    setSearchParams({});
    if (mode === 'lot') setLotArgs({ ...next, establishmentId: farmId });
    else setArgs({ ...next, establishmentId: farmId });
  };

  const anchored = pickId ? lotTrace : trace;
  const tb = anchored.isError ? undefined : anchored.currentData;
  const traceNotFound = (anchored.error as { status?: number } | undefined)?.status === 404;
  const open = Boolean(saleId || pickId);
  const season = tb?.season;
  const productionPath =
    season?.establishment_id && season?.parcel_id
      ? `/admin/dashboard/farm/${season.establishment_id}/parcel/${season.parcel_id}/production/${season.public_id}`
      : null;

  const fixPath = (gap: Gap) => {
    if (!season?.establishment_id || !season?.parcel_id) return null;
    const kind = gap.hop === 'picks' && gap.field === 'harvest_lot_code' ? 'pick' : gap.kind;
    const back = encodeURIComponent(
      `/admin/dashboard/farm/${farmId}/traceback?${pickId ? `pick=${pickId}` : `sale=${saleId}`}`
    );
    // Only a spray, amendment or seed purchase record takes a purchase receipt (the server raises
    // this gap for those only, and Documents asks "What is this file?" for those only, review of
    // #175).
    if (gap.code === 'input_without_document' && gap.ref && RECEIPT_KINDS.has(kind)) {
      // A receipt is FILED against the record from Documents, which works on a finished season
      // too (a correction cannot set a file link). The filing dialog opens pre-filed to this
      // season and record, and the upload returns here.
      return `/admin/dashboard/farm/${season.establishment_id}/documents?production=${season.id}&record=${EVENT_TYPE_BY_KIND[kind]}:${gap.ref}&kind=receipt&next=${back}`;
    }
    if (gap.code === 'supplier_certificate_missing' && gap.ref) {
      // A supplier's certificate is filed once on the supplier, on the farm page, never on the
      // record: it covers every purchase from that supplier. The page opens at the supplier the
      // record resolves to, or with the record's spelling ready to attach or add.
      const row = (tb?.inputs || []).find((r: any) => r.kind === 'seed' && r.event_id === gap.ref);
      const resolved = row?.supplier_certificate?.supplier?.id;
      const query = resolved
        ? `supplier=${resolved}`
        : `supplierSpelling=${encodeURIComponent(row?.supplier ?? '')}`;
      return `/admin/dashboard/farm/${season.establishment_id}/profile?${query}#suppliers`;
    }
    if (gap.ref && EVENT_TYPE_BY_KIND[kind]) {
      // `next` brings the farmer back to this trace once the record is saved (NewEvent accepts
      // only this farm's traceback path there, nothing else).
      return `/admin/dashboard/farm/${season.establishment_id}/parcel/${season.parcel_id}/event/${gap.ref}/change?event_type=${EVENT_TYPE_BY_KIND[kind]}&next=${back}`;
    }
    return productionPath;
  };

  return (
    // A drill-down (no sidebar entry), so it has a Back button. Two entry points (Documents and a
    // season's sales row), so Back returns to whichever one opened it; opened cold from a link,
    // it falls back to the farm's Documents page rather than leaving the app.
    <StandardPage
      title={t('traceback.pageTitle')}
      description={t('traceback.pageDescription')}
      showBackButton
      onBack={() =>
        (window.history.state?.idx ?? 0) > 0
          ? navigate(-1)
          : navigate(`/admin/dashboard/farm/${farmId}/documents`)
      }>
      <StandardCard>
        <Box mb={3}>
          <StandardSegmentedControl<Mode>
            ariaLabel={t('traceback.mode.label')}
            value={mode}
            onChange={setMode}
            options={[
              { key: 'sale', label: t('traceback.mode.sale') },
              { key: 'lot', label: t('traceback.mode.lot') }
            ]}
          />
        </Box>
        <Box
          as="form"
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            if (text.trim()) runSearch({ q: text.trim() });
          }}>
          <Stack direction={{ base: 'column', md: 'row' }} spacing={3}>
            <StandardSearchInput
              flex={1}
              value={text}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
              placeholder={t(
                mode === 'lot' ? 'traceback.lot.search.placeholder' : 'traceback.search.placeholder'
              )}
            />
            <StandardButton type="submit" leftIcon={<FaSearch />} isDisabled={!text.trim()}>
              {t('traceback.search.submit')}
            </StandardButton>
            {/* An inspector draws a random SALE; product in storage is pointed at, not drawn. */}
            {mode === 'sale' && (
              <StandardButton
                variant="outline"
                leftIcon={<FaRandom />}
                onClick={() => runSearch({ random: Date.now() })}>
                {t('traceback.search.random')}
              </StandardButton>
            )}
          </Stack>
        </Box>
        <Text fontSize="sm" color="gray.600" mt={3}>
          {t(mode === 'lot' ? 'traceback.lot.search.help' : 'traceback.search.help')}
        </Text>
      </StandardCard>

      {mode === 'lot' && lotSearch.isFetching && <StandardPageLoading />}
      {mode === 'lot' && lotSearch.isError && <StandardQueryError onRetry={lotSearch.refetch} />}
      {mode === 'lot' && !open && lotMatches?.length === 0 && (
        <StandardCard>
          <StandardEmptyState icon={FaRoute} title={t('traceback.lot.search.noMatch')} />
        </StandardCard>
      )}
      {mode === 'lot' && !open && (lotMatches?.length ?? 0) > 0 && (
        <StandardCard
          title={t('traceback.lot.matches.title', { count: lotMatches!.length })}
          subtitle={t('traceback.lot.matches.subtitle')}>
          {lotSearch.currentData?.truncated && (
            <StandardAlert status="info" mb={3} description={t('traceback.matches.truncated')} />
          )}
          <StatusList>
            {lotMatches!.map((m: any) => (
              <HStack key={m.pick_id} justify="space-between" py={3} spacing={3}>
                <Box flex={1} minW={0}>
                  <Text fontWeight="semibold">
                    {[m.date, m.lot_code, m.quantity, m.storage].filter(Boolean).join(' · ')}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {[m.crop, m.parcel, m.season].filter(Boolean).join(' · ')} ·{' '}
                    {t(`traceback.matchedOn.${m.matched_on}`)}
                  </Text>
                </Box>
                <StandardButton
                  size="sm"
                  flexShrink={0}
                  onClick={() => setSearchParams({ pick: String(m.pick_id) })}>
                  {t('traceback.lot.matches.trace')}
                </StandardButton>
              </HStack>
            ))}
          </StatusList>
        </StandardCard>
      )}

      {mode === 'sale' && search.isFetching && <StandardPageLoading />}
      {mode === 'sale' && search.isError && <StandardQueryError onRetry={search.refetch} />}
      {mode === 'sale' && !open && matches?.length === 0 && (
        <StandardCard>
          <StandardEmptyState
            icon={FaRoute}
            title={t(args?.random ? 'traceback.search.noRecentSale' : 'traceback.search.noMatch')}
          />
        </StandardCard>
      )}
      {mode === 'sale' && !open && (matches?.length ?? 0) > 0 && (
        <StandardCard
          title={t('traceback.matches.title', { count: matches!.length })}
          subtitle={t(
            // An input's lot or invoice is a recall: every row is the answer, none is "the" sale.
            // A capped recall list must never claim to be the whole list (review of app #170).
            !recall
              ? 'traceback.matches.subtitle'
              : truncated
              ? 'traceback.matches.subtitleRecallPartial'
              : 'traceback.matches.subtitleRecall'
          )}>
          {truncated && (
            <StandardAlert
              status={recall ? 'warning' : 'info'}
              mb={3}
              description={t(
                recall ? 'traceback.matches.truncatedRecall' : 'traceback.matches.truncated'
              )}
            />
          )}
          <StatusList>
            {matches!.map((m: any) => (
              <HStack key={m.sale_id} justify="space-between" py={3} spacing={3}>
                {/* minW 0 lets a long match label wrap instead of squeezing the button
                    (MEASURED in the E2E run: "matched on a harvest lot code of the season"
                    pushed the label into the button edge). */}
                <Box flex={1} minW={0}>
                  <Text fontWeight="semibold">
                    {[m.date, m.buyer, m.quantity, m.invoice].filter(Boolean).join(' · ')}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {[m.crop, m.parcel, m.season].filter(Boolean).join(' · ')} ·{' '}
                    {t(`traceback.matchedOn.${m.matched_on}`)}
                  </Text>
                </Box>
                <StandardButton
                  size="sm"
                  flexShrink={0}
                  onClick={() => setSearchParams({ sale: String(m.sale_id) })}>
                  {t('traceback.matches.trace')}
                </StandardButton>
              </HStack>
            ))}
          </StatusList>
        </StandardCard>
      )}

      {open && anchored.isFetching && <StandardPageLoading />}
      {open && anchored.isError && traceNotFound && (
        <StandardAlert
          status="error"
          description={t(pickId ? 'traceback.lot.notFound' : 'traceback.notFound')}
        />
      )}
      {open && anchored.isError && !traceNotFound && (
        <StandardQueryError onRetry={anchored.refetch} />
      )}
      {tb && !anchored.isFetching && (
        <TraceChain
          trace={tb}
          fixPath={fixPath}
          onNavigate={navigate}
          // From a lot, a sale that names it opens its own trace; Back returns to the lot.
          onOpenSale={(id: number) => setSearchParams({ sale: String(id) })}
          // The files behind a hop, opened through the farm's own documents route
          // (company-checked server-side), with the company from the trace itself: opened from
          // a link, the app has none loaded yet.
          fileHref={(d: TraceDoc) =>
            d.id != null && season?.establishment_id && season?.company_id != null
              ? env.getApiUrl(
                  DOCUMENT_DOWNLOAD_URL(
                    String(season.company_id),
                    String(season.establishment_id),
                    d.id
                  )
                )
              : null
          }
          seasonAction={
            productionPath && (
              <StandardButton onClick={() => navigate(productionPath)} size="sm" variant="outline">
                {t('traceback.season.open')}
              </StandardButton>
            )
          }
        />
      )}
    </StandardPage>
  );
};

export default TracebackPage;
