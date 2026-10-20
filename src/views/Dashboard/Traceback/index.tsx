/**
 * Traceback: the inspector's § 205.103(b)(2) exercise, run by the operation before the inspection.
 *
 * The inspector reads a number off a sales document (invoice, bill of lading, a lot code) and
 * walks it back: sale -> harvest pick -> season -> inputs. This page does the same walk on the
 * farm's own records and names every hop where the link is missing, with a way to the record
 * that fixes it.
 *
 * Rules (backend: history/services/traceback.py):
 * - Several matches are LISTED, never resolved for the operator: lot codes are not unique across
 *   seasons, and picking one would trace the wrong lot with full confidence.
 * - Gaps are named, one per missing field. There is no total, percentage or pass badge.
 * - An input with no classification reads "not classified", never "prohibited".
 *
 * Route: /admin/dashboard/farm/:farmId/traceback[?sale=<id>]
 */

import React, { useEffect, useState } from 'react';
import { Box, HStack, Stack, Text, VStack, Wrap, WrapItem } from '@chakra-ui/react';
import { FaArrowDown, FaRandom, FaRoute, FaSearch } from 'react-icons/fa';
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
  StandardSearchInput
} from 'components/Design/StandardComponents';
import { useGetSaleTracebackQuery, useSearchTracebackSalesQuery } from 'store/api/historyApi';

type Gap = { hop: string; code: string; field: string; ref: number | null; kind: string };
type SearchArgs = { q?: string; random?: number; establishmentId?: string };

// Backend event families, as the activity edit route takes them (`?event_type=`).
const EVENT_TYPE_BY_KIND: Record<string, number> = {
  pick: 1,
  seed: 1,
  chemical: 2,
  amendment: 5,
  beneficial: 6
};

const LABEL_CATEGORY_KEYS: Record<string, string> = {
  '100_percent_organic': 'sales.records.labelCategory.hundredPercent',
  organic: 'sales.records.labelCategory.organic',
  made_with_organic: 'sales.records.labelCategory.madeWith'
};

const DESTINATION_KEYS: Record<string, string> = {
  stored: 'events.harvestDestination.stored',
  sold_direct: 'events.harvestDestination.soldDirect',
  handler: 'events.harvestDestination.handler',
  livestock_feed: 'events.harvestDestination.livestockFeed',
  other: 'events.harvestDestination.other'
};

const Fact = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <Text fontSize="sm">
      <Text as="span" color="gray.600">
        {label}:{' '}
      </Text>
      {value}
    </Text>
  ) : null;

const Link = ({ label }: { label: string }) => (
  <HStack justify="center" color="gray.600" py={1} spacing={2} aria-hidden>
    <FaArrowDown />
    <Text fontSize="xs">{label}</Text>
  </HStack>
);

export const TracebackPage = () => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);
  const { farmId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const saleId = searchParams.get('sale');

  const [text, setText] = useState('');
  const [args, setArgs] = useState<SearchArgs | null>(null);

  const search = useSearchTracebackSalesQuery(args, { skip: !args });
  const trace = useGetSaleTracebackQuery({ saleId }, { skip: !saleId });

  // `currentData`, never `data`: RTK keeps `data` from the LAST success for any args, so a failed
  // search or a 404 trace would render the previous answer under the new question.
  const matches: any[] | undefined = search.currentData?.results;
  const truncated = Boolean(search.currentData?.truncated);

  // One match is the sale: open it once, when that answer arrives. Several are a choice the
  // operator makes, never this page. Keyed on the response time, so Back (or re-submitting the
  // same code, which reuses the cached answer) shows the one-row list instead of a blank page.
  useEffect(() => {
    if (search.currentData?.results?.length === 1) {
      setSearchParams({ sale: String(search.currentData.results[0].sale_id) });
    }
  }, [search.fulfilledTimeStamp]);

  const runSearch = (next: SearchArgs) => {
    setSearchParams({});
    setArgs({ ...next, establishmentId: farmId });
  };

  const tb = trace.isError ? undefined : trace.currentData;
  const traceNotFound = (trace.error as { status?: number } | undefined)?.status === 404;
  const season = tb?.season;
  const productionPath =
    season?.establishment_id && season?.parcel_id
      ? `/admin/dashboard/farm/${season.establishment_id}/parcel/${season.parcel_id}/production/${season.public_id}`
      : null;

  const fixPath = (gap: Gap) => {
    if (!season?.establishment_id || !season?.parcel_id) return null;
    const kind = gap.hop === 'picks' && gap.field === 'harvest_lot_code' ? 'pick' : gap.kind;
    if (gap.ref && EVENT_TYPE_BY_KIND[kind]) {
      return `/admin/dashboard/farm/${season.establishment_id}/parcel/${season.parcel_id}/event/${gap.ref}/change?event_type=${EVENT_TYPE_BY_KIND[kind]}`;
    }
    return productionPath;
  };

  // An input gap names its input: "an input has no supplier" sends the operator hunting
  // through every row (MEASURED on the walnut showcase: 8 inputs, the gap was the 1st).
  const inputName = (g: Gap) => {
    const row = (tb?.inputs || []).find((r: any) => r.kind === g.kind && r.event_id === g.ref);
    if (!row) return '';
    return [row.date, row.product || t(`traceback.inputKind.${row.kind}`)]
      .filter(Boolean)
      .join(' · ');
  };

  const gapsFor = (hop: string) =>
    (tb?.gaps || [])
      .filter((g: Gap) => g.hop === hop)
      .map((g: Gap, i: number) => {
        const to = fixPath(g);
        return (
          <StandardAlert key={`${hop}-${g.code}-${g.ref}-${i}`} status="warning" mb={2}>
            <Stack
              direction={{ base: 'column', md: 'row' }}
              justify="space-between"
              w="full"
              spacing={2}>
              <Text fontSize="sm">{t(`traceback.gap.${g.code}`, { input: inputName(g) })}</Text>
              {to && (
                <StandardButton onClick={() => navigate(to)} size="sm" variant="outline">
                  {t('traceback.gap.fix')}
                </StandardButton>
              )}
            </Stack>
          </StandardAlert>
        );
      });

  return (
    <StandardPage title={t('traceback.pageTitle')} description={t('traceback.pageDescription')}>
      <StandardCard>
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
              placeholder={t('traceback.search.placeholder')}
            />
            <StandardButton type="submit" leftIcon={<FaSearch />} isDisabled={!text.trim()}>
              {t('traceback.search.submit')}
            </StandardButton>
            <StandardButton
              variant="outline"
              leftIcon={<FaRandom />}
              onClick={() => runSearch({ random: Date.now() })}>
              {t('traceback.search.random')}
            </StandardButton>
          </Stack>
        </Box>
        <Text fontSize="sm" color="gray.600" mt={3}>
          {t('traceback.search.help')}
        </Text>
      </StandardCard>

      {search.isFetching && <StandardPageLoading />}
      {search.isError && <StandardQueryError onRetry={search.refetch} />}
      {!saleId && matches?.length === 0 && (
        <StandardCard>
          <StandardEmptyState
            icon={FaRoute}
            title={t(args?.random ? 'traceback.search.noRecentSale' : 'traceback.search.noMatch')}
          />
        </StandardCard>
      )}
      {!saleId && (matches?.length ?? 0) > 0 && (
        <StandardCard
          title={t('traceback.matches.title', { count: matches!.length })}
          subtitle={t('traceback.matches.subtitle')}>
          {truncated && (
            <StandardAlert status="info" mb={3} description={t('traceback.matches.truncated')} />
          )}
          <VStack align="stretch" spacing={2}>
            {matches!.map((m: any) => (
              <HStack
                key={m.sale_id}
                justify="space-between"
                borderWidth="1px"
                borderRadius="md"
                p={3}>
                <Box>
                  <Text fontWeight="semibold">
                    {[m.date, m.buyer, m.invoice].filter(Boolean).join(' · ')}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {[m.crop, m.parcel, m.season].filter(Boolean).join(' · ')} ·{' '}
                    {t(`traceback.matchedOn.${m.matched_on}`)}
                  </Text>
                </Box>
                <StandardButton
                  size="sm"
                  onClick={() => setSearchParams({ sale: String(m.sale_id) })}>
                  {t('traceback.matches.trace')}
                </StandardButton>
              </HStack>
            ))}
          </VStack>
        </StandardCard>
      )}

      {saleId && trace.isFetching && <StandardPageLoading />}
      {saleId && trace.isError && traceNotFound && (
        <StandardAlert status="error" description={t('traceback.notFound')} />
      )}
      {saleId && trace.isError && !traceNotFound && <StandardQueryError onRetry={trace.refetch} />}
      {tb && !trace.isFetching && (
        <Box>
          <StandardCard title={t('traceback.hop.sale')}>
            <Fact label={t('traceback.field.date')} value={tb.sale.date} />
            <Fact label={t('traceback.field.buyer')} value={tb.sale.buyer} />
            <Fact label={t('traceback.field.quantity')} value={tb.sale.quantity} />
            <Fact label={t('traceback.field.invoice')} value={tb.sale.invoice} />
            <Fact label={t('traceback.field.bol')} value={tb.sale.bol} />
            <Text fontSize="sm">
              {t(
                tb.sale.organic_on_invoice
                  ? 'traceback.sale.organicOnInvoice'
                  : 'traceback.sale.notOrganicOnInvoice'
              )}
              {tb.sale.label_category && LABEL_CATEGORY_KEYS[tb.sale.label_category]
                ? ` · ${t(LABEL_CATEGORY_KEYS[tb.sale.label_category])}`
                : ''}
            </Text>
            <Box mt={3}>{gapsFor('sale')}</Box>
          </StandardCard>

          <Link
            label={t(
              tb.picks_linked ? 'traceback.link.saleToPick' : 'traceback.link.saleToPickMissing'
            )}
          />

          <StandardCard
            title={t('traceback.hop.picks')}
            subtitle={tb.picks_linked ? undefined : t('traceback.picks.unlinkedSubtitle')}>
            <Box mb={3}>{gapsFor('picks')}</Box>
            {tb.picks.length === 0 ? (
              <Text fontSize="sm">{t('traceback.picks.none')}</Text>
            ) : (
              <Wrap spacing={3}>
                {tb.picks.map((p: any) => (
                  <WrapItem key={p.id} borderWidth="1px" borderRadius="md" p={3} minW="220px">
                    <VStack align="start" spacing={0}>
                      <Fact label={t('traceback.field.lotCode')} value={p.lot_code} />
                      <Fact label={t('traceback.field.date')} value={p.date} />
                      <Fact label={t('traceback.field.block')} value={p.block} />
                      <Fact label={t('traceback.field.quantity')} value={p.quantity} />
                      <Fact label={t('traceback.field.storage')} value={p.storage} />
                      <Fact
                        label={t('traceback.field.destination')}
                        value={
                          DESTINATION_KEYS[p.destination] ? t(DESTINATION_KEYS[p.destination]) : ''
                        }
                      />
                      <Fact
                        label={t('traceback.field.sentToHandler')}
                        value={p.quantity_sent_to_handler}
                      />
                      <Fact
                        label={t('traceback.field.returnedFromHandler')}
                        value={p.quantity_returned_from_handler}
                      />
                      <Fact
                        label={t('traceback.field.handlerDocument')}
                        value={p.handler_document}
                      />
                    </VStack>
                  </WrapItem>
                ))}
              </Wrap>
            )}
          </StandardCard>

          <Link label={t('traceback.link.pickToSeason')} />

          <StandardCard
            title={t('traceback.hop.season')}
            headerAction={
              productionPath && (
                <StandardButton
                  onClick={() => navigate(productionPath)}
                  size="sm"
                  variant="outline">
                  {t('traceback.season.open')}
                </StandardButton>
              )
            }>
            <Fact label={t('traceback.field.season')} value={season.name} />
            <Fact label={t('traceback.field.crop')} value={season.crop} />
            <Fact label={t('traceback.field.parcel')} value={season.parcel} />
            <Fact label={t('traceback.field.lotId')} value={season.lot_id} />
            <Box mt={3}>{gapsFor('season')}</Box>
          </StandardCard>

          <Link label={t('traceback.link.seasonToInputs')} />

          <StandardCard title={t('traceback.hop.inputs')} subtitle={t('traceback.inputs.subtitle')}>
            <Box mb={3}>{gapsFor('inputs')}</Box>
            {tb.inputs.length === 0 ? (
              <Text fontSize="sm">{t('traceback.inputs.none')}</Text>
            ) : (
              <VStack align="stretch" spacing={2}>
                {tb.inputs.map((r: any) => (
                  <Box key={`${r.kind}-${r.event_id}`} borderWidth="1px" borderRadius="md" p={3}>
                    <Text fontWeight="semibold">
                      {[r.date, r.product || t(`traceback.inputKind.${r.kind}`)]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {[
                        t(`traceback.inputKind.${r.kind}`),
                        r.block && t('traceback.input.block', { block: r.block }),
                        r.other_block && t('traceback.input.otherBlock'),
                        t(`traceback.listing.${r.listing}`)
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    <Fact label={t('traceback.field.supplier')} value={r.supplier} />
                    <Fact label={t('traceback.field.invoice')} value={r.invoice} />
                    <Fact label={t('traceback.field.lot')} value={r.lot} />
                  </Box>
                ))}
              </VStack>
            )}
          </StandardCard>

          <StandardCard title={t('traceback.hop.balance')}>
            {tb.balance.not_computed ? (
              <Text fontSize="sm">{t('traceback.balance.notComputed')}</Text>
            ) : (
              <>
                <Fact label={t('traceback.balance.harvested')} value={tb.balance.harvested} />
                <Fact label={t('traceback.balance.packedOut')} value={tb.balance.packed_out} />
                <Fact label={t('traceback.balance.sold')} value={tb.balance.sold} />
                <Fact label={t('traceback.balance.difference')} value={tb.balance.difference} />
              </>
            )}
          </StandardCard>
        </Box>
      )}
    </StandardPage>
  );
};

export default TracebackPage;
