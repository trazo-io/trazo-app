/**
 * One sale's traceback chain: sale -> harvest picks -> season -> inputs -> harvest and sales.
 *
 * Shared by the operation's own Traceback page and the certifier review link, so both read the
 * same chain the same way (backend: history/services/traceback.py builds it once).
 *
 * - The operation's page passes `fixPath`: each missing link then says how to close it and has a
 *   "Fix it here" button. Without it (the reviewer), a missing link is stated as a fact only.
 * - `fileHref` decides how a file opens on this surface; a file it returns null for is named as on
 *   file but not shared here (a reviewer whose link does not include source files).
 * - Never a total, percentage or pass badge: a COUNT of missing links, and each one named.
 */
import React, { ReactNode } from 'react';
import { Badge, Box, HStack, Text, VStack, Wrap, WrapItem } from '@chakra-ui/react';
import { FaArrowDown, FaPaperclip } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardAlert, StandardButton, StandardCard } from 'components/Design/StandardComponents';

export type TraceGap = {
  hop: string;
  code: string;
  field: string;
  ref: number | null;
  kind: string;
};
export type TraceDoc = { id?: number; file_id?: string | null; title: string; kind: string };

// Sale source kinds reuse the sales row's own labels, so the two never name a file differently.
const DOC_KIND_KEYS: Record<string, string> = {
  invoice: 'sales.sources.kind.invoice',
  bill_of_lading: 'sales.sources.kind.billOfLading',
  packout: 'sales.sources.kind.packout',
  other: 'sales.sources.kind.other',
  receipt: 'traceback.docKind.receipt',
  attachment: 'traceback.docKind.attachment'
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

// The identifier that joins two hops. Its words carry meaning ("no harvest pick named on the
// sale"), so only the arrow is hidden from assistive tech.
const Connector = ({ label }: { label: string }) => (
  <HStack justify="center" color="gray.600" py={1} spacing={2}>
    <FaArrowDown aria-hidden />
    <Text fontSize="xs">{label}</Text>
  </HStack>
);

interface TraceChainProps {
  trace: any;
  /** Where a file opens on this surface, or null when it is not shared here. */
  fileHref: (doc: TraceDoc) => string | null;
  /** The operation's page only: where each missing link is closed. */
  fixPath?: (gap: TraceGap) => string | null;
  onNavigate?: (path: string) => void;
  /** Rendered in the season card's header (the operation's "Open the season"). */
  seasonAction?: ReactNode;
}

export const TraceChain = ({
  trace: tb,
  fileHref,
  fixPath,
  onNavigate,
  seasonAction
}: TraceChainProps) => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);
  const forOperation = Boolean(fixPath);
  const season = tb.season;

  // A gap names its record: "an input has no supplier" sent the reader hunting through every
  // row (MEASURED on the walnut showcase: 8 inputs, the gap was the 1st), and two picks without a
  // lot code read as the same line (review of back #193). A pick is named by date, block, quantity.
  const inputName = (g: TraceGap) => {
    if (g.hop === 'picks') {
      const pick = (tb.picks || []).find((p: any) => p.id === g.ref);
      if (!pick) return '';
      return [
        pick.date,
        pick.block && t('traceback.input.block', { block: pick.block }),
        pick.quantity
      ]
        .filter(Boolean)
        .join(' · ');
    }
    const row = (tb.inputs || []).find((r: any) => r.kind === g.kind && r.event_id === g.ref);
    if (!row) return '';
    return [row.date, row.product || t(`traceback.inputKind.${row.kind}`)]
      .filter(Boolean)
      .join(' · ');
  };

  const docLabel = (d: TraceDoc) =>
    `${t(DOC_KIND_KEYS[d.kind] ?? 'traceback.docKind.attachment')}: ${d.title}`;

  // 44px buttons: on a phone at inspection this is the tap that matters. A file this surface
  // cannot open is still named, so the reader knows it exists.
  const Files = ({ docs }: { docs?: TraceDoc[] }) =>
    docs && docs.length ? (
      <Wrap spacing={2} mt={1}>
        {docs.map((d, i) => {
          const href = fileHref(d);
          return (
            <WrapItem key={`${d.id ?? d.file_id ?? d.title}-${i}`}>
              {href ? (
                <StandardButton
                  as="a"
                  href={href}
                  size="sm"
                  variant="ghost"
                  leftIcon={<FaPaperclip />}>
                  {docLabel(d)}
                </StandardButton>
              ) : (
                <HStack spacing={2} fontSize="sm" color="gray.700" py={2}>
                  <FaPaperclip aria-hidden />
                  <Text>{t('traceback.file.notShared', { file: docLabel(d) })}</Text>
                </HStack>
              )}
            </WrapItem>
          );
        })}
      </Wrap>
    ) : null;

  const gapsFor = (hop: string) =>
    (tb.gaps || [])
      .filter((g: TraceGap) => g.hop === hop)
      .map((g: TraceGap, i: number) => {
        const to = fixPath ? fixPath(g) : null;
        return (
          // The readiness card's finding shape: what is missing, how to close it, and a link to
          // where. A bare "Fix" sent the farmer to a season page with no hint that a sale cannot
          // be edited, only voided and entered again (MEASURED in the 2026-10-20 browser run).
          <StandardAlert key={`${hop}-${g.code}-${g.ref}-${i}`} status="warning" mb={2}>
            <Text fontSize="sm" fontWeight="semibold">
              {t(`traceback.gap.${g.code}`, { input: inputName(g) })}
            </Text>
            {forOperation && <Text fontSize="sm">{t(`traceback.gapHow.${g.code}`)}</Text>}
            {/* A button, not a text link: MEASURED at 768px the link was 21px tall, under the
                44px touch floor, and this is the one tap the page exists for. */}
            {to && onNavigate && (
              <StandardButton size="sm" variant="outline" mt={1} onClick={() => onNavigate(to)}>
                {t('traceback.gap.fix')}
              </StandardButton>
            )}
          </StandardAlert>
        );
      });

  return (
    <Box>
      {/* A count of missing links, never a grade. The count rides a warning PILL, not orange text:
          STATUS_URGENCY_TOKENS.warn.text is 4.57:1 on white but MEASURED 4.19:1 on the page's
          gray canvas, under the 4.5 a 16px label owes; the warning badge is 7.62:1. */}
      <Box mb={4}>
        {tb.gaps.length ? (
          <Badge
            variant="warning"
            fontSize="sm"
            px={3}
            py={1}
            borderRadius="full"
            textTransform="none">
            {t(forOperation ? 'traceback.summary.gaps' : 'traceback.review.summary.gaps', {
              count: tb.gaps.length
            })}
          </Badge>
        ) : (
          <Text fontSize="md" fontWeight="semibold" color="green.700">
            {t('traceback.summary.none')}
          </Text>
        )}
      </Box>
      <StandardCard title={t('traceback.hop.sale')}>
        <Fact label={t('traceback.field.date')} value={tb.sale.date} />
        <Fact label={t('traceback.field.buyer')} value={tb.sale.buyer} />
        <Fact label={t('traceback.field.quantity')} value={tb.sale.quantity} />
        <Fact label={t('traceback.field.invoice')} value={tb.sale.invoice} />
        <Fact label={t('traceback.field.bol')} value={tb.sale.bol} />
        <Files docs={tb.sale.documents} />
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

      <Connector
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
            {tb.picks.map((p: any, i: number) => (
              <WrapItem
                key={p.id ?? `${p.lot_code}-${i}`}
                borderWidth="1px"
                borderRadius="md"
                p={3}
                minW="220px">
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
                  <Fact label={t('traceback.field.handlerDocument')} value={p.handler_document} />
                  <Files docs={p.documents} />
                </VStack>
              </WrapItem>
            ))}
          </Wrap>
        )}
      </StandardCard>

      <Connector label={t('traceback.link.pickToSeason')} />

      <StandardCard title={t('traceback.hop.season')} headerAction={seasonAction}>
        <Fact label={t('traceback.field.season')} value={season.name} />
        <Fact label={t('traceback.field.crop')} value={season.crop} />
        <Fact label={t('traceback.field.parcel')} value={season.parcel} />
        <Fact label={t('traceback.field.lotId')} value={season.lot_id} />
        <Box mt={3}>{gapsFor('season')}</Box>
      </StandardCard>

      <Connector label={t('traceback.link.seasonToInputs')} />

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
                {/* Sprays only: days to the next pick in this chain beside the PHI the operation
                    recorded. Arithmetic on its own dates, the first thing a residue finding asks. */}
                {r.days_to_pick != null && (
                  <Text fontSize="sm" color="gray.600">
                    {[
                      t('traceback.input.daysToPick', { days: r.days_to_pick }),
                      r.phi_days
                        ? t('traceback.input.phiRecorded', { phi: r.phi_days })
                        : t('traceback.input.noPhi')
                    ].join(' · ')}
                  </Text>
                )}
                {r.inside_phi && (
                  <Badge variant="warning" mt={1} textTransform="none">
                    {t('traceback.input.insidePhi')}
                  </Badge>
                )}
                <Fact label={t('traceback.field.supplier')} value={r.supplier} />
                <Fact label={t('traceback.field.invoice')} value={r.invoice} />
                <Fact label={t('traceback.field.lot')} value={r.lot} />
                <Files docs={r.documents} />
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
        {/* Counted apart, never dropped: without this line a conventional (buffer) sale made
            "sold" read short with nothing to say why. */}
        {tb.balance.sold_not_organic_count > 0 && (
          <Text fontSize="sm" mt={2} color="gray.600">
            {tb.balance.sold_not_organic
              ? t('traceback.balance.soldNotOrganic', {
                  quantity: tb.balance.sold_not_organic,
                  count: tb.balance.sold_not_organic_count
                })
              : t('traceback.balance.soldNotOrganicCount', {
                  count: tb.balance.sold_not_organic_count
                })}
          </Text>
        )}
      </StandardCard>
    </Box>
  );
};

export default TraceChain;
