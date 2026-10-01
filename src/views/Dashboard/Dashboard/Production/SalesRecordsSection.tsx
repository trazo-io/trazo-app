import React, { useRef, useState } from 'react';
import {
  Badge,
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Checkbox,
  Icon,
  IconButton,
  Tooltip,
  Divider,
  Button,
  useToast,
  useColorModeValue,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay
} from '@chakra-ui/react';
import { FaBan, FaCheckCircle, FaFileInvoiceDollar, FaTrashAlt, FaTruck } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import {
  StandardButton,
  StandardCard,
  StandardField,
  StandardInput,
  StandardSelect
} from 'components/Design/StandardComponents';
import {
  useGetSalesRecordsQuery,
  useGetHarvestLotsQuery,
  useCreateSalesRecordMutation,
  useDeleteSalesRecordMutation,
  useVoidSalesRecordMutation
} from 'store/api/historyApi';
import { useDefaultUnits } from 'hooks/useMeasurementSystem';
import SaleSourceDocuments from './SaleSourceDocuments';

interface SalesRecord {
  id: number;
  sale_date: string;
  buyer_name: string;
  quantity: number | string;
  quantity_unit: string;
  invoice_number?: string | null;
  /** Amount received, USD. `null` = not recorded — never render it as 0. */
  sale_amount?: string | number | null;
  organic_on_invoice: boolean;
  organic_label_category?: string;
  bill_of_lading?: string;
  carrier_name?: string;
  vehicle_id?: string;
  destination?: string;
  clean_transport_method?: string;
  transport_cleaning_method?: string;
  prior_products_transported?: string;
  transport_inspected_free_of?: string[];
  transport_notes?: string;
  /**
   * Void state. A voided sale is KEPT on the record (7 CFR 205.103(b)(4)) and stops counting
   * as a sale; it is not a deleted row and must still render, marked.
   */
  is_voided?: boolean;
  void_reason?: string;
  voided_at?: string | null;
  voided_by_name?: string;
  /** Lot codes of the harvest passes this sale drew from, read-only from the API. */
  harvest_lot_codes?: string[];
  harvest_events?: number[];
  created_at?: string;
}

/** A harvest pass a sale can be linked to. */
export interface HarvestLotOption {
  id: number;
  lot_code: string;
  date?: string | null;
  yield_quantity?: number | string | null;
  yield_unit?: string | null;
}

interface SalesRecordsSectionProps {
  /** Production public UUID (History.public_id) */
  productionId: string;
  canWrite: boolean;
  /** Establishment (farm) id, so the unit default resolves against THIS farm's country. */
  establishmentId?: string | number | null;
  /** The production's own harvest unit (History.production_unit), when it has finished. */
  harvestUnit?: string | null;
  /**
   * Whether the season is closed. Once it is, the server refuses to DELETE a sale
   * (7 CFR 205.103(b)(4) — the sale is the far end of the audit trail), so the correction
   * offered here becomes Void rather than Delete. The server enforces it either way; this
   * only decides which control the operator is shown.
   */
  isFinished?: boolean;
  /** Company id, for the per-sale source documents (the DMS is scoped by company and farm). */
  companyId?: string | number | null;
  /** The production's numeric id, so a sale's source document is also filed with its lot. */
  historyId?: number | null;
}

// MUST stay identical to the harvest form's UNIT_OPTIONS (StandardFinishProductionForm) and to
// History.UNIT_CHOICES on the backend. Harvest amount and sale quantity are the two halves of
// the mass balance, and the audit export prints the Balance line and the "sold exceeds harvest"
// review flag ONLY when the two unit strings match. This list used to read kg / lb / tonnes /
// boxes: `tonnes` was a unit the harvest form could not produce, `tons` / `crates` / `bushels` /
// `units` were units it could produce and a sale could not record, and either way
// § 205.103(b)(2) reconciliation vanished from the certifier packet with nothing printed to say
// so. Adding a unit here means adding it in all three places, in one change.
const UNIT_CHOICES = [
  { value: 'kg', labelId: 'sales.records.unit.kg' },
  { value: 'lb', labelId: 'sales.records.unit.lb' },
  { value: 'boxes', labelId: 'sales.records.unit.boxes' },
  { value: 'crates', labelId: 'sales.records.unit.crates' },
  { value: 'tons', labelId: 'sales.records.unit.tons' },
  { value: 'bushels', labelId: 'sales.records.unit.bushels' },
  { value: 'units', labelId: 'sales.records.unit.units' }
];

const UNIT_VALUES = UNIT_CHOICES.map((u) => u.value);

const EMPTY_FORM = {
  sale_date: '',
  buyer_name: '',
  quantity: '',
  quantity_unit: '',
  invoice_number: '',
  // CCOF item 7 asks what you sold, how much, to whom AND how much money you received.
  // Optional: blank stays NULL server-side, which is "not recorded", not zero.
  sale_amount: '',
  // NOT pre-ticked. This is an attestation that the shipping document identifies the product as
  // organic (§ 205.307, SOE 88 FR 3622), the packet prints it as "Organic on Invoice: Yes", and
  // resolve_sales_disclosure promotes it to a lot-level claim. The backend models it as
  // `default=False` for that reason. A default-true checkbox files the claim on behalf of a
  // grower who never read the line — the same "parse what the operator wrote, never infer" rule
  // the PUR export and the label category already follow.
  organic_on_invoice: false,
  harvest_events: [] as number[],
  organic_label_category: '',
  bill_of_lading: '',
  carrier_name: '',
  vehicle_id: '',
  destination: '',
  clean_transport_method: '',
  transport_cleaning_method: '',
  prior_products_transported: '',
  transport_inspected_free_of: [] as string[],
  transport_notes: ''
};

// § 205.272(a) — how this load's organic integrity was protected in transit.
// Values mirror SalesRecord.CLEAN_TRANSPORT_CHOICES on the backend.
const CLEAN_TRANSPORT_CHOICES = [
  { value: 'affidavit', labelId: 'sales.records.cleanTransport.affidavit' },
  { value: 'inspected', labelId: 'sales.records.cleanTransport.inspected' },
  { value: 'dedicated_organic', labelId: 'sales.records.cleanTransport.dedicatedOrganic' }
];

// § 205.301 label categories. Values mirror ORGANIC_LABEL_CATEGORY_CHOICES in history/models.py.
// § 205.103(b)(3) requires records to identify product by its labeling category, which the
// organic-on-invoice boolean cannot express. The certifier packet has printed this row since
// migration 0195 — until now no form could answer it.
const ORGANIC_LABEL_CATEGORIES = [
  { value: '100_percent_organic', labelId: 'sales.records.labelCategory.hundredPercent' },
  { value: 'organic', labelId: 'sales.records.labelCategory.organic' },
  { value: 'made_with_organic', labelId: 'sales.records.labelCategory.madeWith' }
];

// USDA Clean Transport Affidavit (form #22) — how the unit was CLEANED, which is a different
// axis from CLEAN_TRANSPORT_CHOICES above (how integrity was assured).
// Values mirror SalesRecord.TRANSPORT_CLEANING_CHOICES on the backend.
const TRANSPORT_CLEANING_CHOICES = [
  { value: 'swept', labelId: 'sales.records.cleaning.swept' },
  { value: 'vacuum', labelId: 'sales.records.cleaning.vacuum' },
  { value: 'air_blown', labelId: 'sales.records.cleaning.airBlown' },
  { value: 'washed', labelId: 'sales.records.cleaning.washed' },
  { value: 'other', labelId: 'sales.records.cleaning.other' },
  { value: 'not_required', labelId: 'sales.records.cleaning.notRequired' }
];

//: Mirrors the SalesRecord.clean() contradiction guard on the backend.
const NON_DEDICATED_METHODS = ['affidavit', 'inspected'];

// "Inspected and found free of" — conjunctive and multi-valued, so checkboxes rather than a
// select. An empty set means NO inspection was recorded; it must never read as "found clean".
const TRANSPORT_INSPECTION_CODES = [
  { value: 'foreign_odors', labelId: 'sales.records.inspection.foreignOdors' },
  { value: 'residues', labelId: 'sales.records.inspection.residues' },
  { value: 'conventional_products', labelId: 'sales.records.inspection.conventionalProducts' },
  { value: 'other', labelId: 'sales.records.inspection.other' }
];

/**
 * A `YYYY-MM-DD` string as a LOCAL-time Date, or null.
 *
 * `new Date('2026-08-01')` parses as UTC and renders as July 31 everywhere west of Greenwich —
 * on a compliance record that is simply the wrong sale date. The component formats through
 * `intl.formatDate` so the month name follows the user's locale; formatting here with a
 * hardcoded 'en-US' would print English months on the Spanish dashboard.
 */
const parseLocalDate = (value?: string): Date | null => {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/** Local calendar date as YYYY-MM-DD — `toISOString()` is UTC and reads a day ahead in CA. */
const localTodayIso = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/**
 * DRF returns `{field: ["message"]}` (or `{detail: "..."}`); RTK Query wraps it as
 * `{status, data}`. Pull out the messages so a 400 explains itself.
 */
const describeApiError = (err: unknown): string | undefined => {
  const data = (err as { data?: unknown })?.data;
  if (typeof data === 'string') return data;
  if (!data || typeof data !== 'object') return undefined;
  // A DRF `detail` is the whole sentence; the retention refusal (423) also carries
  // `production_id` and `retention_until`, and joining every string value would append a UUID
  // to the message the farmer reads. Prefer the sentence when there is one.
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  const messages = Object.values(data as Record<string, unknown>)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === 'string');
  return messages.length ? messages.join(' ') : undefined;
};

export function SalesRecordsSection({
  productionId,
  canWrite,
  establishmentId,
  harvestUnit,
  isFinished = false,
  companyId,
  historyId
}: SalesRecordsSectionProps) {
  const intl = useIntl();
  const toast = useToast();
  const labelFg = useColorModeValue('gray.500', 'gray.400');
  const rowBg = useColorModeValue('gray.50', 'gray.700');

  // The lot's own harvest unit wins: matching it is what makes the packet's mass-balance
  // reconciliation render at all, and a grower who harvested in boxes sells in boxes. Only when
  // the production has not finished (no harvest unit yet) does this fall back to the farm's
  // measurement system — US farms get `lb`, which is how almonds and citrus are actually sold.
  // The old hardcoded 'kg' was neither.
  const defaultUnits = useDefaultUnits(establishmentId);
  const resolvedUnit =
    harvestUnit && UNIT_VALUES.includes(harvestUnit) ? harvestUnit : defaultUnits.mass;

  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  // Empty state means "grower has not chosen", so the default is resolved at RENDER rather than
  // seeded into useState: `harvestUnit` arrives with an async fetch, and a useState initialiser
  // runs once — it would have locked in the fallback before the harvest unit ever landed.
  const effectiveUnit = formData.quantity_unit || resolvedUnit;

  const unitLabel = (value: string) => {
    const choice = UNIT_CHOICES.find((u) => u.value === value);
    return choice ? intl.formatMessage({ id: choice.labelId }) : value;
  };

  // Says which of the two states the grower is in, rather than asserting the happy one. A flat
  // "matches your harvest unit" went on claiming that after they picked a different unit from
  // the dropdown beside it — false on its face, and it hid the one thing this field exists to
  // prevent: a mismatch silently removes the Balance line and the excess-sale flag from the
  // certifier packet. Both ids are written out in full so the i18n used-key gate can see them;
  // a `{ id: cond ? a : b }` reads as a dynamic id and is skipped by that scanner.
  let unitHelpText: string | undefined;
  if (harvestUnit) {
    unitHelpText =
      effectiveUnit === harvestUnit
        ? intl.formatMessage(
            { id: 'sales.records.field.unit.matchesHarvest' },
            { unit: unitLabel(harvestUnit) }
          )
        : intl.formatMessage(
            { id: 'sales.records.field.unit.differsFromHarvest' },
            { unit: unitLabel(harvestUnit) }
          );
  }
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);

  const { data: records = [] } = useGetSalesRecordsQuery({ productionId }, { skip: !productionId });
  // Fetched here rather than passed down: the lot code is owner-side (§ 205.103(b)(2)) and is
  // deliberately absent from the public history payload the parent page loads, so the parent
  // has nothing to hand over. `harvest_lots` reuses the sales list's own CA/FM company gate.
  const { data: harvestLotsData } = useGetHarvestLotsQuery(
    { productionId },
    { skip: !productionId || !canWrite }
  );
  const harvestLots: HarvestLotOption[] = Array.isArray(harvestLotsData) ? harvestLotsData : [];

  const [createSalesRecord, { isLoading: isCreating }] = useCreateSalesRecordMutation();
  const [deleteSalesRecord, { isLoading: isDeleting }] = useDeleteSalesRecordMutation();
  const [voidSalesRecord, { isLoading: isVoiding }] = useVoidSalesRecordMutation();
  // Void, not delete: once the season is finished the server refuses a DELETE under
  // 7 CFR 205.103(b)(4). The row has to stay on the record, so the correction is a void with
  // a stated reason — which is also why the reason is required before the button enables.
  const [pendingVoidId, setPendingVoidId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const cancelVoidRef = useRef<HTMLButtonElement>(null);

  // Which conditional fields the form is actually RENDERING. Derived once and used for both the
  // render and the payload, because a field the grower cannot see must not be able to submit —
  // the repo's mutation-payload rule. Both of these hide on a state change that leaves their old
  // value sitting in `formData`, and the packet prints those values as fact: a prior load on a
  // unit the grower has since marked dedicated, or a description of an "Other" they no longer
  // selected. Invisible on screen, authoritative on paper.
  const showPriorProducts = formData.clean_transport_method !== 'dedicated_organic';
  // Affidavit and pre-load inspection both DESCRIBE a non-dedicated unit. Blank is not in this
  // set on purpose: it means "not documented", not "not dedicated".
  const nonDedicatedUnit = NON_DEDICATED_METHODS.includes(formData.clean_transport_method);
  const needsTransportNotes =
    formData.transport_cleaning_method === 'other' ||
    formData.transport_inspected_free_of.includes('other');

  // The backend refuses "other" with no description (SalesRecord.clean). Gate Save here too, so
  // the grower sees a disabled button next to the field rather than a 400 that this component
  // currently flattens into a generic toast.

  // ONE source of truth for "can this be saved", named rather than boolean, so the disabled
  // button and the text explaining it cannot drift apart.
  const missingRequired = [
    !formData.sale_date && 'sales.records.field.date',
    !formData.buyer_name.trim() && 'sales.records.field.buyer',
    !(Number(formData.quantity) > 0) && 'sales.records.field.quantity',
    !effectiveUnit && 'sales.records.field.unit',
    needsTransportNotes && !formData.transport_notes.trim() && 'sales.records.field.transportNotes'
  ]
    .filter((id): id is string => Boolean(id))
    .map((id) => intl.formatMessage({ id }));

  const canSave = missingRequired.length === 0;
  // Only explain the disabled button once they have started. On a pristine form the list is just
  // the required markers restated as an accusation.
  const isDirty = Object.keys(EMPTY_FORM).some((key) => {
    const value = (formData as Record<string, unknown>)[key];
    const initial = (EMPTY_FORM as Record<string, unknown>)[key];
    return Array.isArray(value) ? value.length > 0 : value !== initial;
  });

  const handleCreate = async () => {
    try {
      const payload: Record<string, unknown> = {
        production_id: productionId,
        sale_date: formData.sale_date,
        buyer_name: formData.buyer_name.trim(),
        quantity: Number(formData.quantity),
        quantity_unit: effectiveUnit,
        organic_on_invoice: formData.organic_on_invoice
      };
      // Omitted entirely when nothing is selected: sending [] would clear links on a PATCH and
      // reads as "recorded: drew from no harvest", which is not the same as "not recorded".
      if (formData.harvest_events.length > 0) {
        payload.harvest_events = formData.harvest_events;
      }
      if (formData.invoice_number.trim()) {
        payload.invoice_number = formData.invoice_number.trim();
      }
      // Sent only when typed. `Number('')` is 0, and a posted 0 would record "sold for
      // nothing" on a regulatory document for a grower who simply skipped the field.
      if (formData.sale_amount.trim() !== '') {
        payload.sale_amount = Number(formData.sale_amount);
      }
      (['bill_of_lading', 'carrier_name', 'vehicle_id', 'destination'] as const).forEach((key) => {
        if (formData[key].trim()) payload[key] = formData[key].trim();
      });
      // The backend rejects a label category on a sale whose invoice does not identify it as
      // organic (SalesRecord.clean()). Only send it when the box is ticked, so the grower sees
      // the field disabled rather than a 400.
      if (formData.organic_label_category && formData.organic_on_invoice) {
        payload.organic_label_category = formData.organic_label_category;
      }
      if (formData.clean_transport_method) {
        payload.clean_transport_method = formData.clean_transport_method;
      }
      // USDA form #22 content. Sent only when set — an empty inspection list means "not
      // recorded", and posting [] would be indistinguishable from a recorded empty finding.
      if (formData.transport_cleaning_method) {
        payload.transport_cleaning_method = formData.transport_cleaning_method;
      }
      if (showPriorProducts && formData.prior_products_transported.trim()) {
        payload.prior_products_transported = formData.prior_products_transported.trim();
      }
      if (formData.transport_inspected_free_of.length) {
        payload.transport_inspected_free_of = formData.transport_inspected_free_of;
      }
      if (needsTransportNotes && formData.transport_notes.trim()) {
        payload.transport_notes = formData.transport_notes.trim();
      }
      await createSalesRecord(payload).unwrap();
      setFormData({ ...EMPTY_FORM });
      toast({
        title: intl.formatMessage({ id: 'sales.records.toast.created' }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (err) {
      // The backend refuses two specific contradictions on this model — a § 205.301 category on
      // a sale not marked organic-on-invoice, and an "Other" with no description — and says
      // exactly which field and why. Swallowing that into "Could not save sales record" left the
      // grower with an unexplained failure they had no way to act on.
      toast({
        title: intl.formatMessage({ id: 'sales.records.toast.error' }),
        description: describeApiError(err),
        status: 'error',
        duration: 8000,
        isClosable: true
      });
    }
  };

  const handleVoid = async () => {
    if (pendingVoidId === null) return;
    try {
      await voidSalesRecord({
        recordId: pendingVoidId,
        productionId,
        voidReason: voidReason.trim()
      }).unwrap();
      toast({
        title: intl.formatMessage({ id: 'sales.records.toast.voided' }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (err) {
      toast({
        title: intl.formatMessage({ id: 'sales.records.toast.error' }),
        description: describeApiError(err),
        status: 'error',
        duration: 9000,
        isClosable: true
      });
    } finally {
      setPendingVoidId(null);
      setVoidReason('');
    }
  };

  const handleDelete = async () => {
    if (pendingDeleteId === null) return;
    try {
      await deleteSalesRecord({ recordId: pendingDeleteId, productionId }).unwrap();
      toast({
        title: intl.formatMessage({ id: 'sales.records.toast.deleted' }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (err) {
      // A 423 here is not a failure the farmer can retry — it is the § 205.103(b)(4)
      // retention rule, and the server sends the reason. Showing "something went wrong"
      // instead teaches them the app is broken rather than that the record is kept.
      const detail = describeApiError(err);
      toast({
        title: intl.formatMessage({ id: 'sales.records.toast.error' }),
        description: detail,
        status: 'error',
        duration: detail ? 9000 : 3000,
        isClosable: true
      });
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <StandardCard
      title={intl.formatMessage({ id: 'sales.records.title' })}
      variant="elevated"
      padding={{ base: 0, md: 4 }}>
      <VStack spacing={3} align="stretch">
        <Text fontSize="xs" color={labelFg}>
          {intl.formatMessage({ id: 'sales.records.subtitle' })}
        </Text>

        {/* Existing records */}
        {records.length > 0 ? (
          <VStack spacing={2} align="stretch">
            {records.map((record: SalesRecord) => (
              <HStack
                key={record.id}
                p={{ base: 2, md: 3 }}
                bg={rowBg}
                borderRadius="md"
                justify="space-between"
                align="flex-start"
                spacing={2}>
                <Box minW={0}>
                  <HStack spacing={2} flexWrap="wrap">
                    <Text
                      fontSize="sm"
                      fontWeight="semibold"
                      noOfLines={1}
                      textDecoration={record.is_voided ? 'line-through' : undefined}
                      color={record.is_voided ? labelFg : undefined}>
                      {record.buyer_name}
                    </Text>
                    {/* A voided sale stays on the record (7 CFR 205.103(b)(4)) and must READ as
                        retracted, not merely look faded — strike-through alone is a colour-ish
                        signal, so the state is also said in words. */}
                    {record.is_voided && (
                      <Badge variant="neutral" fontSize="xs" flexShrink={0}>
                        {intl.formatMessage({ id: 'sales.records.voided.badge' })}
                      </Badge>
                    )}
                    {record.organic_on_invoice && (
                      <Tooltip
                        hasArrow
                        fontSize="xs"
                        label={intl.formatMessage({ id: 'sales.records.organicTooltip' })}>
                        <Box as="span" display="inline-flex">
                          <Icon as={FaCheckCircle} color="green.500" boxSize={3.5} />
                        </Box>
                      </Tooltip>
                    )}
                  </HStack>
                  <HStack spacing={3} flexWrap="wrap" mt={0.5}>
                    <Text fontSize="xs" color={labelFg}>
                      {(() => {
                        const parsed = parseLocalDate(record.sale_date);
                        return parsed
                          ? intl.formatDate(parsed, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : '';
                      })()}
                    </Text>
                    <Text fontSize="xs" color={labelFg}>
                      {record.quantity} {record.quantity_unit}
                    </Text>
                    {/* `!= null`, not truthiness: a recorded 0.00 is a fact (a donation, a
                        rejected load) and must not disappear the way a blank does. */}
                    {record.sale_amount != null && (
                      <Text fontSize="xs" color={labelFg}>
                        {intl.formatNumber(Number(record.sale_amount), {
                          style: 'currency',
                          currency: 'USD'
                        })}
                      </Text>
                    )}
                    {/* The reason is the half that makes a voided row readable instead of just
                        missing — the same thing the certifier dossier prints beside it. */}
                    {record.is_voided && record.void_reason && (
                      <Text fontSize="xs" color={labelFg} noOfLines={2}>
                        {intl.formatMessage(
                          { id: 'sales.records.voided.reason' },
                          { reason: record.void_reason }
                        )}
                      </Text>
                    )}
                    {(record.harvest_lot_codes?.length ?? 0) > 0 && (
                      <Text fontSize="xs" color={labelFg} noOfLines={1}>
                        {intl.formatMessage(
                          { id: 'sales.records.display.lots' },
                          { lots: (record.harvest_lot_codes || []).join(', ') }
                        )}
                      </Text>
                    )}
                    {record.invoice_number && (
                      <HStack spacing={1}>
                        <Icon as={FaFileInvoiceDollar} color={labelFg} boxSize={3} />
                        <Text fontSize="xs" color={labelFg} noOfLines={1}>
                          {intl.formatMessage(
                            { id: 'sales.records.display.invoice' },
                            { number: record.invoice_number }
                          )}
                        </Text>
                      </HStack>
                    )}
                  </HStack>
                  {(record.bill_of_lading ||
                    record.carrier_name ||
                    record.vehicle_id ||
                    record.destination ||
                    record.clean_transport_method) && (
                    <HStack spacing={1} mt={0.5} align="flex-start">
                      <Icon as={FaTruck} color={labelFg} boxSize={3} mt={0.5} />
                      <Text fontSize="xs" color={labelFg}>
                        {[
                          record.bill_of_lading &&
                            intl.formatMessage(
                              { id: 'sales.records.display.bol' },
                              { number: record.bill_of_lading }
                            ),
                          record.carrier_name,
                          record.vehicle_id,
                          record.destination,
                          record.clean_transport_method &&
                            intl.formatMessage({
                              id: `sales.records.cleanTransport.${
                                record.clean_transport_method === 'dedicated_organic'
                                  ? 'dedicatedOrganic'
                                  : record.clean_transport_method
                              }`
                            })
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </HStack>
                  )}
                  {companyId && establishmentId && !record.is_voided && (
                    <SaleSourceDocuments
                      companyId={String(companyId)}
                      farmId={String(establishmentId)}
                      saleId={record.id}
                      historyId={historyId}
                      canWrite={canWrite}
                    />
                  )}
                </Box>
                {canWrite && !record.is_voided && (
                  <IconButton
                    aria-label={intl.formatMessage({
                      id: isFinished ? 'sales.records.action.void' : 'sales.records.action.delete'
                    })}
                    icon={isFinished ? <FaBan /> : <FaTrashAlt />}
                    size="sm"
                    variant="ghost"
                    colorScheme={isFinished ? 'gray' : 'red'}
                    onClick={() =>
                      isFinished ? setPendingVoidId(record.id) : setPendingDeleteId(record.id)
                    }
                  />
                )}
              </HStack>
            ))}
          </VStack>
        ) : (
          <Text fontSize="sm" color={labelFg} textAlign="center" py={2}>
            {intl.formatMessage({ id: 'sales.records.empty' })}
          </Text>
        )}

        {/* Inline "Record a sale" form */}
        {canWrite && (
          <>
            <Divider />
            <Text fontSize="sm" fontWeight="semibold">
              {intl.formatMessage({ id: 'sales.records.addTitle' })}
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              <StandardField
                label={intl.formatMessage({ id: 'sales.records.field.date' })}
                required>
                <StandardInput
                  type="date"
                  value={formData.sale_date}
                  // Product cannot be sold before it exists. The packet already flags a sale
                  // dated before harvest, but only at export — by which point the record is
                  // filed. Stopping a FUTURE date at entry is the same rule, enforced where the
                  // grower can still fix it with one click.
                  max={localTodayIso()}
                  onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                />
              </StandardField>
              <StandardField
                label={intl.formatMessage({ id: 'sales.records.field.buyer' })}
                required>
                <StandardInput
                  value={formData.buyer_name}
                  maxLength={160}
                  onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                  placeholder={intl.formatMessage({
                    id: 'sales.records.field.buyer.placeholder'
                  })}
                />
              </StandardField>
              <StandardField
                label={intl.formatMessage({ id: 'sales.records.field.quantity' })}
                required>
                <StandardInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </StandardField>
              <StandardField
                label={intl.formatMessage({ id: 'sales.records.field.unit' })}
                helpText={unitHelpText}
                required>
                <StandardSelect
                  value={effectiveUnit}
                  onChange={(e) => setFormData({ ...formData, quantity_unit: e.target.value })}>
                  {UNIT_CHOICES.map((u) => (
                    <option key={u.value} value={u.value}>
                      {intl.formatMessage({ id: u.labelId })}
                    </option>
                  ))}
                </StandardSelect>
              </StandardField>
              <StandardField label={intl.formatMessage({ id: 'sales.records.field.invoice' })}>
                <StandardInput
                  value={formData.invoice_number}
                  maxLength={80}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                />
              </StandardField>
              {/* CCOF item 7's fourth part. Optional on purpose — a grower who does not want
                  prices in Trazo leaves it blank and the packet prints an em-dash, not a zero. */}
              <StandardField
                label={intl.formatMessage({ id: 'sales.records.field.amount' })}
                helpText={intl.formatMessage({ id: 'sales.records.field.amountHelp' })}>
                <StandardInput
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={formData.sale_amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, sale_amount: e.target.value })
                  }
                />
              </StandardField>
            </SimpleGrid>

            {/* Which pick(s) this sale drew from — § 205.103(b)(2) trace-back. Renders only
                when there is something to link: an empty picker on a production with no
                harvest recorded yet is a control that cannot be used. */}
            {harvestLots.length > 0 && (
              <StandardField
                label={intl.formatMessage({ id: 'sales.records.field.harvestLots' })}
                helpText={intl.formatMessage({ id: 'sales.records.field.harvestLots.help' })}>
                <VStack align="stretch" spacing={1.5}>
                  {harvestLots.map((lot) => (
                    <Checkbox
                      key={lot.id}
                      size="sm"
                      isChecked={formData.harvest_events.includes(lot.id)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          harvest_events: e.target.checked
                            ? [...formData.harvest_events, lot.id]
                            : formData.harvest_events.filter((id) => id !== lot.id)
                        })
                      }>
                      <HStack spacing={2} flexWrap="wrap">
                        <Text fontSize="sm" fontWeight="medium">
                          {lot.lot_code}
                        </Text>
                        {(() => {
                          const parsed = lot.date ? parseLocalDate(lot.date) : null;
                          return parsed ? (
                            <Text fontSize="xs" color={labelFg}>
                              {intl.formatDate(parsed, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </Text>
                          ) : null;
                        })()}
                        {lot.yield_quantity ? (
                          <Text fontSize="xs" color={labelFg}>
                            {lot.yield_quantity} {lot.yield_unit || ''}
                          </Text>
                        ) : null}
                      </HStack>
                    </Checkbox>
                  ))}
                </VStack>
              </StandardField>
            )}

            {/* Per-shipment transport (§ 205.272) — optional, but a shipped load with
                no clean-transport documentation gets flagged in the audit PDF. */}
            <Text fontSize="xs" fontWeight="semibold" color={labelFg} mt={1}>
              {intl.formatMessage({ id: 'sales.records.shipment.title' })}
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              <StandardField label={intl.formatMessage({ id: 'sales.records.field.bol' })}>
                <StandardInput
                  value={formData.bill_of_lading}
                  maxLength={80}
                  onChange={(e) => setFormData({ ...formData, bill_of_lading: e.target.value })}
                />
              </StandardField>
              <StandardField label={intl.formatMessage({ id: 'sales.records.field.carrier' })}>
                <StandardInput
                  value={formData.carrier_name}
                  maxLength={120}
                  onChange={(e) => setFormData({ ...formData, carrier_name: e.target.value })}
                  placeholder={intl.formatMessage({
                    id: 'sales.records.field.carrier.placeholder'
                  })}
                />
              </StandardField>
              <StandardField label={intl.formatMessage({ id: 'sales.records.field.vehicle' })}>
                <StandardInput
                  value={formData.vehicle_id}
                  maxLength={60}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                  placeholder={intl.formatMessage({
                    id: 'sales.records.field.vehicle.placeholder'
                  })}
                />
              </StandardField>
              <StandardField label={intl.formatMessage({ id: 'sales.records.field.destination' })}>
                <StandardInput
                  value={formData.destination}
                  maxLength={160}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  placeholder={intl.formatMessage({
                    id: 'sales.records.field.destination.placeholder'
                  })}
                />
              </StandardField>
              <StandardField
                label={intl.formatMessage({ id: 'sales.records.field.cleanTransport' })}>
                <StandardSelect
                  value={formData.clean_transport_method}
                  onChange={(e) =>
                    // Marking the unit dedicated hides "Previously carried", so drop whatever was
                    // typed there. A dedicated organic unit has no prior conventional load, and
                    // keeping the text would put one in the packet with no field left to show it.
                    setFormData({
                      ...formData,
                      clean_transport_method: e.target.value,
                      prior_products_transported:
                        e.target.value === 'dedicated_organic'
                          ? ''
                          : formData.prior_products_transported,
                      // Leaving dedicated also removes "Not required — dedicated organic unit"
                      // from the cleaning list. Drop the value with the option, or the form
                      // holds an answer it no longer offers and the backend rejects the save.
                      transport_cleaning_method:
                        formData.transport_cleaning_method === 'not_required' &&
                        NON_DEDICATED_METHODS.includes(e.target.value)
                          ? ''
                          : formData.transport_cleaning_method
                    })
                  }
                  placeholder={intl.formatMessage({
                    id: 'sales.records.field.cleanTransport.placeholder'
                  })}>
                  {CLEAN_TRANSPORT_CHOICES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {intl.formatMessage({ id: c.labelId })}
                    </option>
                  ))}
                </StandardSelect>
              </StandardField>
              {/* USDA's Clean Transport Affidavit asks what the affidavit SAYS, not just that
                  one exists: how the unit was cleaned, and what it carried before. */}
              <StandardField
                label={intl.formatMessage({ id: 'sales.records.field.cleaningMethod' })}>
                <StandardSelect
                  value={formData.transport_cleaning_method}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      transport_cleaning_method: e.target.value,
                      // Notes describe an "Other" answer. Once neither the cleaning method nor
                      // the inspection is "other" the field is gone from the form, and a
                      // description of an answer nobody gave must not survive into the packet.
                      transport_notes:
                        e.target.value === 'other' ||
                        formData.transport_inspected_free_of.includes('other')
                          ? formData.transport_notes
                          : ''
                    })
                  }
                  placeholder={intl.formatMessage({
                    id: 'sales.records.field.cleaningMethod.placeholder'
                  })}>
                  {TRANSPORT_CLEANING_CHOICES.filter(
                    // "Not required — dedicated organic unit" describes a DEDICATED unit, so it
                    // contradicts affidavit/inspected (both of which describe a non-dedicated
                    // one). The backend refuses exactly that pair; mirror it exactly rather than
                    // keying off `showPriorProducts`, which also excludes an UNANSWERED clean
                    // transport — blank is "not documented", which the backend deliberately
                    // allows, and hiding it there made the form unable to produce a legal record.
                    (c) => c.value !== 'not_required' || !nonDedicatedUnit
                  ).map((c) => (
                    <option key={c.value} value={c.value}>
                      {intl.formatMessage({ id: c.labelId })}
                    </option>
                  ))}
                </StandardSelect>
              </StandardField>
              {/* Only meaningful for a non-dedicated unit — a dedicated organic vehicle has no
                  prior conventional load, and asking would be inventing a requirement. */}
              {showPriorProducts && (
                <StandardField
                  label={intl.formatMessage({ id: 'sales.records.field.priorProducts' })}>
                  <StandardInput
                    value={formData.prior_products_transported}
                    maxLength={200}
                    onChange={(e) =>
                      setFormData({ ...formData, prior_products_transported: e.target.value })
                    }
                    placeholder={intl.formatMessage({
                      id: 'sales.records.field.priorProducts.placeholder'
                    })}
                  />
                </StandardField>
              )}
            </SimpleGrid>
            {/* Conjunctive: an inspector ticks everything the unit was found free of. Leaving
                all unticked means no inspection was recorded, not a clean finding. */}
            {/* A real fieldset, NOT a StandardField. Chakra's FormControl pushes its own `id`
                into every child (use-form-control: `id: id ?? field?.id`), so wrapping four
                Checkboxes in one gave all four inputs the SAME DOM id — invalid HTML, and the
                FormLabel's htmlFor bound to whichever came first, leaving the group unnamed. A
                fieldset/legend names the group the way the platform intends. */}
            <Box as="fieldset" border="none" p={0} m={0}>
              <Text as="legend" fontWeight="semibold" color="gray.700" fontSize="sm" mb={2}>
                {intl.formatMessage({ id: 'sales.records.field.inspectedFreeOf' })}
              </Text>
              <HStack flexWrap="wrap" gap={3}>
                {TRANSPORT_INSPECTION_CODES.map((c) => (
                  <Checkbox
                    key={c.value}
                    size="sm"
                    colorScheme="green"
                    isChecked={formData.transport_inspected_free_of.includes(c.value)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...formData.transport_inspected_free_of, c.value]
                        : formData.transport_inspected_free_of.filter((v) => v !== c.value);
                      setFormData({
                        ...formData,
                        transport_inspected_free_of: next,
                        // Same reason as the cleaning select: unticking the last "other" removes
                        // the notes field, and its text with it.
                        transport_notes:
                          next.includes('other') || formData.transport_cleaning_method === 'other'
                            ? formData.transport_notes
                            : ''
                      });
                    }}>
                    <Text fontSize="xs">{intl.formatMessage({ id: c.labelId })}</Text>
                  </Checkbox>
                ))}
              </HStack>
            </Box>
            {/* "Other" is the only answer on this form that carries no information by itself,
                and BOTH labels that produce it print as "see notes" in the certifier packet.
                Until this field existed the packet pointed a certifier at a description that had
                nowhere to live. Shown only when it is owed, and the backend refuses the pair. */}
            {needsTransportNotes && (
              <StandardField
                label={intl.formatMessage({ id: 'sales.records.field.transportNotes' })}
                helpText={intl.formatMessage({
                  id: 'sales.records.field.transportNotes.helpText'
                })}
                required>
                <StandardInput
                  value={formData.transport_notes}
                  maxLength={300}
                  onChange={(e) => setFormData({ ...formData, transport_notes: e.target.value })}
                  placeholder={intl.formatMessage({
                    id: 'sales.records.field.transportNotes.placeholder'
                  })}
                />
              </StandardField>
            )}
            {/* One row per idea. These three used to share a `justify="space-between"` HStack:
                a bare checkbox, a LABELLED field and the submit button on one line, which wrapped
                into three ragged rows the moment the select needed its width — label stranded
                above a full-bleed input, button orphaned underneath. The attestation and its
                § 205.301 category belong together; the button is not a peer of either. */}
            <VStack align="stretch" spacing={3}>
              <Checkbox
                size="sm"
                colorScheme="green"
                isChecked={formData.organic_on_invoice}
                onChange={(e) =>
                  // Clear the label category when the box is unticked. Leaving a stale value
                  // in a disabled select shows the grower a category that will not be saved —
                  // and on a compliance form, a visible answer that is silently dropped is
                  // worse than no answer.
                  setFormData({
                    ...formData,
                    organic_on_invoice: e.target.checked,
                    organic_label_category: e.target.checked ? formData.organic_label_category : ''
                  })
                }>
                <Text fontSize="xs">
                  {intl.formatMessage({ id: 'sales.records.field.organicOnInvoice' })}
                </Text>
              </Checkbox>
              {/* § 205.103(b)(3): records must identify product by its § 205.301 labeling
                  category. Disabled until the invoice identifies the product as organic,
                  because SalesRecord.clean() rejects that combination — showing it disabled
                  explains the rule; letting them pick it would just return a 400. */}
              <StandardField
                label={intl.formatMessage({ id: 'sales.records.field.labelCategory' })}
                helpText={
                  formData.organic_on_invoice
                    ? undefined
                    : intl.formatMessage({ id: 'sales.records.field.labelCategory.locked' })
                }>
                <StandardSelect
                  value={formData.organic_label_category}
                  isDisabled={!formData.organic_on_invoice}
                  onChange={(e) =>
                    setFormData({ ...formData, organic_label_category: e.target.value })
                  }
                  placeholder={intl.formatMessage({
                    id: 'sales.records.field.labelCategory.placeholder'
                  })}>
                  {ORGANIC_LABEL_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {intl.formatMessage({ id: c.labelId })}
                    </option>
                  ))}
                </StandardSelect>
              </StandardField>
            </VStack>
            {/* A greyed-out button with no explanation is a dead end: the grower cannot tell
                whether the form is broken or they missed a field, and the missing field may be
                scrolled off screen. Name what is outstanding. */}
            <HStack justify="flex-end" align="center" flexWrap="wrap" gap={2}>
              {!canSave && isDirty && (
                <Text fontSize="xs" color={labelFg}>
                  {intl.formatMessage(
                    { id: 'sales.records.action.save.blocked' },
                    { fields: missingRequired.join(', ') }
                  )}
                </Text>
              )}
              <StandardButton
                size="sm"
                onClick={handleCreate}
                isLoading={isCreating}
                isDisabled={!canSave}>
                {intl.formatMessage({ id: 'sales.records.action.save' })}
              </StandardButton>
            </HStack>
          </>
        )}
      </VStack>

      {/* Void confirmation — a reason is required, because a void with no reason is a
          deletion with extra steps: the row survives but the record stops saying what
          happened. */}
      <AlertDialog
        isOpen={pendingVoidId !== null}
        leastDestructiveRef={cancelVoidRef}
        onClose={() => {
          setPendingVoidId(null);
          setVoidReason('');
        }}
        isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="md" fontWeight="bold">
              {intl.formatMessage({ id: 'sales.records.voidConfirm.title' })}
            </AlertDialogHeader>
            <AlertDialogBody fontSize="sm">
              <Text mb={3}>{intl.formatMessage({ id: 'sales.records.voidConfirm.body' })}</Text>
              <StandardField
                label={intl.formatMessage({ id: 'sales.records.voidConfirm.reasonLabel' })}
                required>
                <StandardInput
                  value={voidReason}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setVoidReason(e.target.value)
                  }
                  placeholder={intl.formatMessage({
                    id: 'sales.records.voidConfirm.reasonPlaceholder'
                  })}
                />
              </StandardField>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={cancelVoidRef}
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPendingVoidId(null);
                  setVoidReason('');
                }}>
                {intl.formatMessage({ id: 'sales.records.voidConfirm.cancel' })}
              </Button>
              <StandardButton
                size="sm"
                onClick={handleVoid}
                isLoading={isVoiding}
                isDisabled={!voidReason.trim()}
                ml={2}>
                {intl.formatMessage({ id: 'sales.records.voidConfirm.confirm' })}
              </StandardButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog
        isOpen={pendingDeleteId !== null}
        leastDestructiveRef={cancelDeleteRef}
        onClose={() => setPendingDeleteId(null)}
        isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="md" fontWeight="bold">
              {intl.formatMessage({ id: 'sales.records.deleteConfirm.title' })}
            </AlertDialogHeader>
            <AlertDialogBody fontSize="sm">
              {intl.formatMessage({ id: 'sales.records.deleteConfirm.body' })}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={cancelDeleteRef}
                variant="ghost"
                size="sm"
                onClick={() => setPendingDeleteId(null)}>
                {intl.formatMessage({ id: 'sales.records.deleteConfirm.cancel' })}
              </Button>
              <Button
                size="sm"
                colorScheme="red"
                onClick={handleDelete}
                isLoading={isDeleting}
                ml={2}>
                {intl.formatMessage({ id: 'sales.records.deleteConfirm.confirm' })}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </StandardCard>
  );
}

export default SalesRecordsSection;
