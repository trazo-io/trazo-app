/**
 * One traceback chain: sale -> harvest picks -> season -> inputs -> harvest and sales, or, anchored
 * on a harvest lot (`trace.anchor === 'pick'`, product in storage), the pick -> where it went (the
 * sales that name it) -> season -> inputs -> harvest and sales -> recorded harvested minus recorded
 * sold per storage location.
 *
 * Shared by the operation's own Traceback page and the certifier review link, so both read the
 * same chain the same way (backend: history/services/traceback.py builds it once).
 *
 * - The operation's page passes `fixPath`: each missing link then says how to close it and has a
 *   "Fix it here" button. Without it (the reviewer), a missing link is stated as a fact only.
 * - `fileHref` decides how a file opens on this surface; a file it returns null for is named as on
 *   file but not shared here (a reviewer whose link does not include source files).
 * - Never a total, percentage or pass badge: a COUNT of missing links, and each one named.
 * - ROWS, not boxes (2026-11-04). Each missing link was a cream slab with an orange edge and its
 *   own outline button, and each pick, input and sale a bordered box inside its card, so one
 *   trace was a stack of 20+ boxes. Gaps are StatusRows (the readiness card's shape: a tinted
 *   circle, what is missing, how to close it, a link); picks, inputs and sales are rows split by
 *   a hairline (StatusList for both). On the reviewer's link every tone is neutral: a certifier surface states what is
 *   missing, it does not grade it (the certifier review's own rule, #257).
 */
import React, { ReactNode } from 'react';
import { Badge, Box, HStack, Text, VStack, Wrap, WrapItem } from '@chakra-ui/react';
import { FaArrowDown, FaExclamationTriangle, FaInfoCircle, FaPaperclip } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import {
  StandardButton,
  StandardCard,
  StatusList,
  StatusRow,
  StatusRowLink
} from 'components/Design/StandardComponents';
import OnHandByLocation from './OnHandByLocation';

export type TraceGap = {
  hop: string;
  code: string;
  field: string;
  ref: number | null;
  kind: string;
};
export type TraceDoc = {
  id?: number;
  file_id?: string | null;
  title: string;
  kind: string;
  // The parcels whose records a receipt was filed on, when it reaches this record through the
  // same activity logged on several parcels (back record_receipts). Absent for its own files.
  filed_on?: string[];
};

// Sale source kinds reuse the sales row's own labels, so the two never name a file differently.
const DOC_KIND_KEYS: Record<string, string> = {
  invoice: 'sales.sources.kind.invoice',
  bill_of_lading: 'sales.sources.kind.billOfLading',
  packout: 'sales.sources.kind.packout',
  other: 'sales.sources.kind.other',
  receipt: 'traceback.docKind.receipt',
  supplier_certificate: 'traceback.docKind.supplierCertificate',
  attachment: 'traceback.docKind.attachment'
};

// A seed row's supplier certificate, by status (back history/services/supplier_certificates.py).
// `unresolved` has no line: the record's supplier text matches no supplier on file, and when the
// record claims certified organic stock its gap already says so.
const SUPPLIER_CERT_KEYS: Record<string, string> = {
  covering: 'traceback.supplierCert.covering',
  stale: 'traceback.supplierCert.stale',
  postdates_purchase: 'traceback.supplierCert.postdates',
  none_on_file: 'traceback.supplierCert.noneOnFile',
  not_certified: 'traceback.supplierCert.notCertified'
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

// A spray's recorded type: the row's `event_type`, which history/services/traceback.py fills from
// ChemicalEvent.type (FE/FU/HE/PE). A reviewer reads a fungicide or pesticide
// differently from a fertilizer (§ 205.206 governs pest-control materials), and the record knows
// which it is, so "Fertilizer or crop protection" is only the fallback for a type it does not.
const CHEMICAL_TYPE_KEYS: Record<string, string> = {
  FE: 'events.chemical.subtypes.fertilizer',
  FU: 'events.chemical.subtypes.fungicide',
  HE: 'events.chemical.subtypes.herbicide',
  PE: 'events.chemical.subtypes.pesticide'
};

// A missing input identifier, by gap code: which line of the row it belongs on and how to say it.
const MISSING_ON_ROW: Record<string, { label: string; value: string }> = {
  input_without_supplier: {
    label: 'traceback.field.supplier',
    value: 'traceback.missing.notRecorded'
  },
  input_without_invoice: {
    label: 'traceback.field.invoice',
    value: 'traceback.missing.notRecorded'
  },
  input_without_lot: { label: 'traceback.field.lot', value: 'traceback.missing.notRecorded' },
  input_without_document: {
    label: 'traceback.field.receipt',
    value: 'traceback.missing.notAttached'
  },
  supplier_certificate_missing: {
    label: 'traceback.field.supplierCertificate',
    value: 'traceback.missing.noCoveringCopy'
  }
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
  /** A lot trace only: open the trace of a sale that names the pick. */
  onOpenSale?: (saleId: number) => void;
}

/** One forward sale on a lot trace: a sale that names the pick, or one that names no pick. */
const SaleLine = ({
  sale,
  t,
  onOpenSale
}: {
  sale: any;
  t: (id: string, values?: Record<string, string | number>) => string;
  onOpenSale?: (saleId: number) => void;
}) => (
  <HStack justify="space-between" py={3} spacing={3}>
    <Box flex={1} minW={0}>
      <Text fontWeight="semibold" fontSize="sm">
        {[sale.date, sale.buyer, sale.quantity, sale.invoice].filter(Boolean).join(' · ')}
      </Text>
      <Text fontSize="sm" color="gray.600">
        {[
          t(
            sale.organic_on_invoice
              ? 'traceback.sale.organicOnInvoice'
              : 'traceback.sale.notOrganicOnInvoice'
          ),
          sale.picks_named > 1 && t('traceback.lotSales.alsoNames', { count: sale.picks_named - 1 })
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
    </Box>
    {onOpenSale && (
      <StandardButton size="sm" flexShrink={0} onClick={() => onOpenSale(sale.sale_id)}>
        {t('traceback.matches.trace')}
      </StandardButton>
    )}
  </HStack>
);

export const TraceChain = ({
  trace: tb,
  fileHref,
  fixPath,
  onNavigate,
  seasonAction,
  onOpenSale
}: TraceChainProps) => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);
  const forOperation = Boolean(fixPath);
  const season = tb.season;
  const isLot = tb.anchor === 'pick';

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

  const kindLabel = (r: any) =>
    t(
      (r.kind === 'chemical' && CHEMICAL_TYPE_KEYS[r.event_type]) || `traceback.inputKind.${r.kind}`
    );

  // The reviewer reads each input's missing identifiers ON its row (review on the production link,
  // 2026-10-21): a 17-line list above the rows had to be matched back to them by hand, and a row
  // with no invoice simply had no invoice line. The operation's page keeps the list, because each
  // entry there carries its "Fix it here".
  const missingOnRow = (r: any) =>
    forOperation
      ? []
      : (tb.gaps || []).filter(
          (g: TraceGap) =>
            g.hop === 'inputs' &&
            g.kind === r.kind &&
            g.ref === r.event_id &&
            MISSING_ON_ROW[g.code]
        );

  // What the operation holds of the supplier's organic certificate for this purchase: the
  // operation's own record, worded as such, never "verified".
  const supplierCertLine = (sc: any) => {
    const key = sc && SUPPLIER_CERT_KEYS[sc.status];
    if (!key) return null;
    const who = [
      sc.supplier?.certifier,
      sc.supplier?.nop_operation_id &&
        t('traceback.supplierCert.nopId', { id: sc.supplier.nop_operation_id })
    ]
      .filter(Boolean)
      .join(', ');
    const line = t(key, { date: sc.certificate?.issued_on ?? '' });
    return who ? `${line} (${who})` : line;
  };

  const supplierCertDocs = (sc: any): TraceDoc[] =>
    sc?.certificate?.document
      ? [
          {
            id: sc.certificate.document.id,
            title: sc.certificate.document.title,
            kind: 'supplier_certificate'
          }
        ]
      : [];

  const docLabel = (d: TraceDoc) =>
    `${t(DOC_KIND_KEYS[d.kind] ?? 'traceback.docKind.attachment')}: ${d.title}` +
    (d.filed_on?.length
      ? ` (${t('traceback.file.filedOn', { parcels: d.filed_on.join(', ') })})`
      : '');

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

  const gapsFor = (hop: string) => {
    const gaps = (tb.gaps || []).filter((g: TraceGap) => g.hop === hop);
    if (!gaps.length) return null;
    return (
      <StatusList>
        {gaps.map((g: TraceGap, i: number) => {
          const to = fixPath ? fixPath(g) : null;
          return (
            // The readiness card's finding shape: what is missing, how to close it, and a link to
            // where. A bare "Fix" sent the farmer to a season page with no hint that a sale cannot
            // be edited, only voided and entered again (MEASURED in the 2026-10-20 browser run).
            <StatusRow
              key={`${hop}-${g.code}-${g.ref}-${i}`}
              testId="trace-gap"
              tone={forOperation ? 'warn' : 'neutral'}
              icon={forOperation ? FaExclamationTriangle : FaInfoCircle}
              title={t(`traceback.gap.${g.code}`, { input: inputName(g) })}
              action={
                to && onNavigate ? (
                  <StatusRowLink onClick={() => onNavigate(to)}>
                    {t('traceback.gap.fix')}
                  </StatusRowLink>
                ) : undefined
              }>
              {forOperation && (
                <Text fontSize="sm" color="gray.600">
                  {t(`traceback.gapHow.${g.code}`)}
                </Text>
              )}
            </StatusRow>
          );
        })}
      </StatusList>
    );
  };

  // One pick's facts, the same card on a sale trace (every pick it names) and on a lot trace
  // (the anchored pick).
  const pickCard = (p: any, i: number) => (
    <Box key={p.id ?? `${p.lot_code}-${i}`} py={3}>
      <VStack align="start" spacing={0}>
        <Fact label={t('traceback.field.lotCode')} value={p.lot_code} />
        <Fact label={t('traceback.field.date')} value={p.date} />
        <Fact label={t('traceback.field.block')} value={p.block} />
        <Fact label={t('traceback.field.quantity')} value={p.quantity} />
        <Fact label={t('traceback.field.storage')} value={p.storage} />
        <Fact
          label={t('traceback.field.destination')}
          value={DESTINATION_KEYS[p.destination] ? t(DESTINATION_KEYS[p.destination]) : ''}
        />
        <Fact label={t('traceback.field.sentToHandler')} value={p.quantity_sent_to_handler} />
        <Fact
          label={t('traceback.field.returnedFromHandler')}
          value={p.quantity_returned_from_handler}
        />
        <Fact label={t('traceback.field.handlerDocument')} value={p.handler_document} />
        <Files docs={p.documents} />
      </VStack>
    </Box>
  );

  return (
    <Box>
      {/* A count of missing links, never a grade. The count rides a warning PILL, not orange text:
          STATUS_URGENCY_TOKENS.warn.text is 4.57:1 on white but MEASURED 4.19:1 on the page's
          gray canvas, under the 4.5 a 16px label owes; the warning badge is 7.62:1. */}
      <Box mb={4}>
        {tb.gaps.length ? (
          <Badge
            variant={forOperation ? 'warning' : 'neutral'}
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
          <Text fontSize="md" fontWeight="semibold" color={forOperation ? 'green.700' : 'gray.800'}>
            {t('traceback.summary.none')}
          </Text>
        )}
      </Box>
      {isLot ? (
        <>
          {/* The anchored pick, and where it went: forward to the sales that name it. Inside one
              card, so the chain below still reads lot -> season -> inputs. */}
          <StandardCard title={t('traceback.hop.lot')}>
            <Box mb={3}>{gapsFor('picks')}</Box>
            <StatusList>{(tb.picks || []).map(pickCard)}</StatusList>
            <Box mt={4}>
              <Text fontWeight="semibold">{t('traceback.hop.lotSales')}</Text>
              <Text fontSize="sm" color="gray.600" mb={2}>
                {t('traceback.lotSales.subtitle')}
              </Text>
              {(tb.sales || []).length === 0 ? (
                <Text fontSize="sm">{t('traceback.lotSales.none')}</Text>
              ) : (
                <StatusList>
                  {tb.sales.map((sale: any) => (
                    <SaleLine key={sale.sale_id} sale={sale} t={t} onOpenSale={onOpenSale} />
                  ))}
                </StatusList>
              )}
            </Box>
            {/* Sales that name no pick may hold this one; the records cannot say, so they are
                listed beside it, never counted as where it went. */}
            {(tb.sales_naming_no_pick || []).length > 0 && (
              <Box mt={4}>
                <Text fontWeight="semibold" fontSize="sm">
                  {t('traceback.lotSales.unlinkedTitle')}
                </Text>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  {t('traceback.lotSales.unlinkedHelp')}
                </Text>
                <StatusList>
                  {tb.sales_naming_no_pick.map((sale: any) => (
                    <SaleLine key={sale.sale_id} sale={sale} t={t} onOpenSale={onOpenSale} />
                  ))}
                </StatusList>
              </Box>
            )}
          </StandardCard>
        </>
      ) : (
        <>
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
              <StatusList>{tb.picks.map(pickCard)}</StatusList>
            )}
          </StandardCard>
        </>
      )}

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
        {forOperation && <Box mb={3}>{gapsFor('inputs')}</Box>}
        {tb.inputs.length === 0 ? (
          <Text fontSize="sm">{t('traceback.inputs.none')}</Text>
        ) : (
          <StatusList>
            {tb.inputs.map((r: any) => (
              <Box key={`${r.kind}-${r.event_id}`} py={3}>
                <Text fontWeight="semibold">
                  {[r.date, r.product || t(`traceback.inputKind.${r.kind}`)]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {[
                    kindLabel(r),
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
                      r.phi_days != null && r.phi_days !== ''
                        ? t('traceback.input.phiRecorded', { phi: Number(r.phi_days) })
                        : t('traceback.input.noPhi')
                    ].join(' · ')}
                  </Text>
                )}
                {r.inside_phi && (
                  <Badge variant={forOperation ? 'warning' : 'neutral'} mt={1} textTransform="none">
                    {t('traceback.input.insidePhi')}
                  </Badge>
                )}
                <Fact label={t('traceback.field.supplier')} value={r.supplier} />
                <Fact label={t('traceback.field.invoice')} value={r.invoice} />
                <Fact label={t('traceback.field.lot')} value={r.lot} />
                <Fact
                  label={t('traceback.field.supplierCertificate')}
                  value={supplierCertLine(r.supplier_certificate)}
                />
                <Files docs={supplierCertDocs(r.supplier_certificate)} />
                {missingOnRow(r).map((g: TraceGap) => (
                  <Text key={g.code} fontSize="sm">
                    <Text as="span" color="gray.600">
                      {t(MISSING_ON_ROW[g.code].label)}:{' '}
                    </Text>
                    <Badge variant="neutral" textTransform="none">
                      {t(MISSING_ON_ROW[g.code].value)}
                    </Badge>
                  </Text>
                ))}
                <Files docs={r.documents} />
              </Box>
            ))}
          </StatusList>
        )}
      </StandardCard>

      <StandardCard title={t('traceback.hop.balance')}>
        {/* A sale can be recorded before the season is finished. Its balance is then the picks
            and sales on file so far, not a season total, and the reader is told so first. */}
        {tb.balance.season_open && (
          <Text fontSize="sm" mb={2} color="gray.600">
            {t('traceback.balance.seasonOpen')}
          </Text>
        )}
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
        {/* Inside "sold", named: a sale whose invoice does not say organic still left the lot
            (overall review 2026-11, OV-FJ-C24: it was counted apart, and this card said the whole
            harvest was unsold while the dossier subtracted it). Only the buffer crop's sales are
            counted apart, on the line after. */}
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
        {tb.balance.buffer_sale_count > 0 && (
          <Text fontSize="sm" mt={2} color="gray.600" data-testid="trace-buffer-sold">
            {tb.balance.buffer_sold
              ? t('traceback.balance.bufferSold', {
                  quantity: tb.balance.buffer_sold,
                  count: tb.balance.buffer_sale_count
                })
              : t('traceback.balance.bufferSoldCount', { count: tb.balance.buffer_sale_count })}
          </Text>
        )}
      </StandardCard>

      {tb.on_hand && <OnHandByLocation onHand={tb.on_hand} />}
    </Box>
  );
};

export default TraceChain;
