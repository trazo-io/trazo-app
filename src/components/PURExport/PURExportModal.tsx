/**
 * CA Pesticide Use Report (PUR / DPR-PML-017C) export modal.
 *
 * Establishment + month scoped. Backend:
 *   GET /api/histories/pur-export/?establishment_id=&month=&year=&export_format=json|csv
 * (`export_format`, NOT `format` — DRF reserves that query param; ?format=csv 404s.)
 *
 * Rebuilt 2026-09-01 on the design system instead of on its sibling. The first version
 * "mirrored AuditExportModal's standards" and so inherited that modal's hand-rolled Chakra
 * <Modal>, its blue.700-on-blue.50 note box (4.03:1) and its green.500 link (2.43:1), then
 * added its own: an English month array, an ISO deadline in prose, orange.500 gap text
 * (3.39:1), a nested 220px scroll region that clipped rows, and two identical rows with no
 * date and no way to open the event the copy told the farmer to open. A sibling is a
 * precedent, not a standard — the standard is ResponsiveModal / StandardField /
 * GuidanceNote / STATUS_URGENCY_TOKENS, and every contrast number is measured, not assumed.
 *
 * Gaps arrive as DPR box KEYS (`missing`) and coded findings (`flags`) and are labelled
 * here in the farmer's locale. The CSV keeps its English `notes` column for the county
 * commissioner; that sentence is deliberately never rendered in the preview.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Box, HStack, Icon, Link, Stack, Text, VStack, useToast } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiDownload,
  FiEdit2,
  FiExternalLink,
  FiFileText
} from 'react-icons/fi';
import { useIntl } from 'react-intl';
import { ResponsiveModal } from 'components/Design/ResponsiveModal';
import {
  GuidanceNote,
  STATUS_URGENCY_TOKENS,
  StandardButton,
  StandardEmptyState,
  StandardField,
  StandardQueryError,
  StandardSelect,
  StandardSpinner
} from 'components/Design/StandardComponents';
import { config } from 'config/environment';

interface PURFlag {
  code: string;
  county?: string;
  partners?: string;
  primary?: string;
  from?: string;
  /** schoolsite_method_code_required: the logged application method, and the one DPR code it
   *  can only be — `null` when the method spans several and the grower must pick. */
  method?: string;
  suggested?: string | null;
  /** quantity_rate_mismatch: box 24 as logged, what the declared rate implies, and how many
   *  times apart they are. Strings: the server formats them so both agree on rounding. */
  logged?: string;
  expected?: string;
  unit?: string;
  factor?: string;
}

/** A hired application: listed, never exported — the business files it (3 CCR 6626(b)). */
interface PURExcluded {
  event_id: number;
  event_type: number;
  parcel_id: number | null;
  event_date: string;
  product: string;
  pcb_name: string;
}

interface PURCounty {
  /** DPR 2-digit county code, '' when the row has no recognised county. */
  code: string;
  name: string;
  count: number;
}

interface PURRow {
  event_id: number;
  event_type: number;
  parcel_id: number | null;
  /** ISO datetime of the event's own `date` — always present, unlike box 17. */
  event_date: string;
  product_and_manufacturer?: string;
  application_method?: string;
  /** DPR box keys still blank (server REQUIRED_KEYS + ffm_code). */
  missing: string[];
  flags: PURFlag[];
}

interface PURSummary {
  application_count: number;
  complete_count: number;
  incomplete_count: number;
  /** YYYY-MM-DD — the 10th of the following month (3 CCR 6626). */
  filing_deadline: string;
  form: string;
  /** Per-county row counts; more than one means more than one filing (3 CCR 6626(a)). */
  counties?: PURCounty[];
  pcb_excluded_count?: number;
  pcb_excluded?: PURExcluded[];
  rows: PURRow[];
}

interface PURExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  establishmentId: number | string;
  establishmentName?: string;
}

/**
 * DPR box key → i18n id. Keys mirror PUR_COLUMNS in pur_export_service.py. A key the server
 * adds that is not listed here renders as its raw key — visible and honest — rather than as
 * nothing. Every id is a literal so the used-keys gate can see it.
 */
const BOX_LABEL_IDS: Record<string, string> = {
  operator_id: 'app.pur.box.operator_id',
  operator_name: 'app.pur.box.operator_name',
  address: 'app.pur.box.address',
  city: 'app.pur.box.city',
  zip_code: 'app.pur.box.zip_code',
  site_id: 'app.pur.box.site_id',
  planted_area: 'app.pur.box.planted_area',
  county: 'app.pur.box.county',
  section: 'app.pur.box.section',
  township: 'app.pur.box.township',
  range: 'app.pur.box.range',
  base_meridian: 'app.pur.box.base_meridian',
  commodity: 'app.pur.box.commodity',
  field_location: 'app.pur.box.field_location',
  application_start: 'app.pur.box.application_start',
  application_end: 'app.pur.box.application_end',
  acreage_treated: 'app.pur.box.acreage_treated',
  application_method: 'app.pur.box.application_method',
  ffm_code: 'app.pur.box.ffm_code',
  epa_registration_number: 'app.pur.box.epa_registration_number',
  total_product_used: 'app.pur.box.total_product_used',
  product_and_manufacturer: 'app.pur.box.product_and_manufacturer'
};

const FLAG_LABEL_IDS: Record<string, string> = {
  county_unrecognized: 'app.pur.flag.county_unrecognized',
  tank_mix_unexported: 'app.pur.flag.tank_mix_unexported',
  aggregate_event: 'app.pur.flag.aggregate_event',
  adjuvant_line: 'app.pur.flag.adjuvant_line',
  area_converted_from_ha: 'app.pur.flag.area_converted_from_ha',
  // 3 CCR 6691 via 6434(6)(A) and 6626(c); DPR ENF 25-16, effective 2026-01-01.
  // NEVER add a flag code server-side without its entry here AND in both locales:
  // `labelForFlag` falls back to `flag.code`, so a missing key renders the raw identifier
  // ("schoolsite_method_code_required") to the farmer in place of a sentence.
  schoolsite_method_code_required: 'app.pur.flag.schoolsite_method_code_required',
  schoolsite_proximity_unknown: 'app.pur.flag.schoolsite_proximity_unknown',
  quantity_rate_mismatch: 'app.pur.flag.quantity_rate_mismatch'
};

/**
 * `YYYY-MM-DD` → local Date at midnight. `new Date('2026-05-10')` parses a date-only string
 * as UTC, which prints as the 9th anywhere west of Greenwich — i.e. all of California.
 */
const parseISODate = (value: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

const PURExportModal: React.FC<PURExportModalProps> = ({
  isOpen,
  onClose,
  establishmentId,
  establishmentName
}) => {
  const intl = useIntl();
  const toast = useToast();
  const navigate = useNavigate();

  // Default to LAST month. A month's PUR is due by the 10th of the following month
  // (3 CCR 6626), so the month a farmer can actually file is the one that just closed; the
  // current one is still being logged. Opening on the current month showed "0 applications"
  // for the first week of every month.
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [month, setMonth] = useState<number>(lastMonth.getMonth() + 1);
  const [year, setYear] = useState<number>(lastMonth.getFullYear());
  const [summary, setSummary] = useState<PURSummary | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  // Locale month names. The previous hardcoded English array showed "April" under es-419.
  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        intl.formatDate(new Date(2000, i, 1), { month: 'long' })
      ),
    [intl]
  );

  const baseUrl = useCallback(
    (exportFormat: string) =>
      `${config.API_BASE_URL}/histories/pur-export/` +
      `?establishment_id=${establishmentId}&month=${month}&year=${year}&export_format=${exportFormat}`,
    [establishmentId, month, year]
  );

  const loadPreview = useCallback(async () => {
    if (!establishmentId || !isOpen) return;
    setIsPreviewing(true);
    setSummary(null);
    setPreviewError(null);
    try {
      const response = await fetch(baseUrl('json'), { credentials: 'include' });
      if (!response.ok) {
        let msg = intl.formatMessage({ id: 'app.pur.previewFailed' });
        try {
          const err = await response.json();
          // `detail` is the human sentence, `error` the machine slug — same order as
          // AuditExportModal, where farmers were shown the slug because it was reversed.
          msg = err?.detail || err?.error || msg;
        } catch {
          // not JSON
        }
        throw new Error(msg);
      }
      setSummary(await response.json());
    } catch (error) {
      // Inline, not a toast: a failed preview is a STATE of this dialog, and the download
      // button stays disabled because of it — the reason has to be on screen with it.
      setPreviewError(error instanceof Error ? error.message : '');
    } finally {
      setIsPreviewing(false);
    }
  }, [baseUrl, establishmentId, isOpen, intl]);

  // Auto-load preview when opened or when month/year changes.
  useEffect(() => {
    if (isOpen) loadPreview();
  }, [isOpen, loadPreview]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(baseUrl('csv'), { credentials: 'include' });
      if (!response.ok) {
        let msg = intl.formatMessage({ id: 'app.exportFailed' });
        try {
          const err = await response.json();
          msg = err?.detail || err?.error || msg;
        } catch {
          // not JSON
        }
        throw new Error(msg);
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `trazo-pur-${establishmentId}-${year}-${String(month).padStart(2, '0')}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast({
        title: intl.formatMessage({ id: 'app.exportSuccess' }),
        status: 'success',
        duration: 4000,
        isClosable: true
      });
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'app.exportFailed' }),
        description: error instanceof Error ? error.message : '',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClose = () => {
    if (!isDownloading) onClose();
  };

  /** "Open the event to complete them" — the row now carries what that needs. */
  const openEvent = (row: PURRow) => {
    if (row.parcel_id == null) return;
    onClose();
    navigate(
      `/admin/dashboard/farm/${establishmentId}/parcel/${row.parcel_id}/event/${row.event_id}/change?event_type=${row.event_type}`
    );
  };

  // Stored datetimes are the farmer's wall clock labelled UTC (system-wide, 2026-08-31), so
  // format in UTC or a 6 a.m. spray anywhere west of Greenwich prints on the previous day.
  const formatEventDate = (iso: string) =>
    iso
      ? intl.formatDate(iso, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
      : '';

  const labelForBox = (key: string) =>
    BOX_LABEL_IDS[key] ? intl.formatMessage({ id: BOX_LABEL_IDS[key] }) : key;

  const labelForFlag = (flag: PURFlag) =>
    FLAG_LABEL_IDS[flag.code]
      ? intl.formatMessage(
          { id: FLAG_LABEL_IDS[flag.code] },
          {
            county: flag.county,
            partners: flag.partners,
            primary: flag.primary,
            from: flag.from,
            method: flag.method,
            suggested: flag.suggested ?? 'none',
            logged: flag.logged,
            expected: flag.expected,
            unit: flag.unit,
            factor: flag.factor
          }
        )
      : flag.code;

  /** Row identity for a hired application — same navigation as a reported row. */
  const openExcluded = (item: PURExcluded) => {
    if (item.parcel_id == null) return;
    onClose();
    navigate(
      `/admin/dashboard/farm/${establishmentId}/parcel/${item.parcel_id}/event/${item.event_id}/change?event_type=${item.event_type}`
    );
  };

  const counties = summary?.counties ?? [];
  const multiCounty = counties.length > 1;
  const excluded = summary?.pcb_excluded ?? [];

  const hasApps = !!summary && summary.application_count > 0;

  const deadline = summary ? parseISODate(summary.filing_deadline) : null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlinePassed = !!deadline && deadline < today;
  const deadlineText = deadline
    ? intl.formatDate(deadline, { year: 'numeric', month: 'long', day: 'numeric' })
    : summary?.filing_deadline ?? '';

  const warn = STATUS_URGENCY_TOKENS.warn;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      isCloseDisabled={isDownloading}
      header={
        <HStack spacing={3} align="flex-start">
          <Icon as={FiFileText} color="green.700" boxSize={5} mt="3px" aria-hidden="true" />
          <Box>
            <Text fontSize="lg" fontWeight="bold" color="gray.800" lineHeight="short">
              {intl.formatMessage({ id: 'app.pur.title' })}
            </Text>
            {establishmentName && (
              <Text fontSize="sm" fontWeight="normal" color="gray.600" mt={0.5}>
                {establishmentName}
              </Text>
            )}
          </Box>
        </HStack>
      }
      footer={
        <Stack
          direction={{ base: 'column', smd: 'row' }}
          spacing={3}
          w={{ base: 'full', smd: 'auto' }}>
          <StandardButton
            variant="outline"
            size="md"
            onClick={handleClose}
            isDisabled={isDownloading}
            w={{ base: 'full', smd: 'auto' }}>
            {intl.formatMessage({ id: 'app.cancel' })}
          </StandardButton>
          <StandardButton
            variant="primary"
            size="md"
            leftIcon={<Icon as={FiDownload} />}
            onClick={handleDownload}
            isLoading={isDownloading}
            loadingText={intl.formatMessage({ id: 'app.exportDownloading' })}
            isDisabled={!hasApps || isPreviewing}
            w={{ base: 'full', smd: 'auto' }}>
            {intl.formatMessage({ id: 'app.pur.downloadCsv' })}
          </StandardButton>
        </Stack>
      }>
      <VStack spacing={5} align="stretch">
        <Text fontSize="sm" color="gray.700">
          {intl.formatMessage({ id: 'app.pur.subtitle' })}
        </Text>

        {/* Month + year. StandardField binds the label to the control — the previous bare
            <Text> labels left both selects without an accessible name. */}
        <Stack direction={{ base: 'column', smd: 'row' }} spacing={3}>
          <Box flex={2}>
            <StandardField label={intl.formatMessage({ id: 'app.pur.month' })}>
              <StandardSelect
                value={month}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setMonth(Number(e.target.value))
                }>
                {monthNames.map((label, idx) => (
                  <option key={idx} value={idx + 1}>
                    {label}
                  </option>
                ))}
              </StandardSelect>
            </StandardField>
          </Box>
          <Box flex={1}>
            <StandardField label={intl.formatMessage({ id: 'app.pur.year' })}>
              <StandardSelect
                value={year}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setYear(Number(e.target.value))
                }>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </StandardSelect>
            </StandardField>
          </Box>
        </Stack>

        {isPreviewing ? (
          <StandardSpinner label={intl.formatMessage({ id: 'app.pur.loadingPreview' })} />
        ) : previewError !== null ? (
          <StandardQueryError
            title={intl.formatMessage({ id: 'app.pur.previewFailed' })}
            description={previewError || undefined}
            onRetry={loadPreview}
            isRetrying={isPreviewing}
          />
        ) : summary ? (
          <VStack spacing={4} align="stretch">
            {/* Counts. A count is a fact (neutral); "need details" is a warning state. */}
            <HStack spacing={2} wrap="wrap">
              <Badge variant="neutral">
                {intl.formatMessage(
                  { id: 'app.pur.applications' },
                  { count: summary.application_count }
                )}
              </Badge>
              {summary.complete_count > 0 && (
                <Badge>
                  <HStack as="span" spacing={1}>
                    <Icon as={FiCheckCircle} boxSize={3} aria-hidden="true" />
                    <Text as="span">
                      {intl.formatMessage(
                        { id: 'app.pur.complete' },
                        { count: summary.complete_count }
                      )}
                    </Text>
                  </HStack>
                </Badge>
              )}
              {summary.incomplete_count > 0 && (
                <Badge variant="warning">
                  <HStack as="span" spacing={1}>
                    <Icon as={FiAlertTriangle} boxSize={3} aria-hidden="true" />
                    <Text as="span">
                      {intl.formatMessage(
                        { id: 'app.pur.incomplete' },
                        { count: summary.incomplete_count }
                      )}
                    </Text>
                  </HStack>
                </Badge>
              )}
            </HStack>

            {/* Deadline: a fact about this month, in the farmer's date format. Once it has
                passed it is an urgency, and says so in words — not only in colour. */}
            <HStack spacing={2} align="flex-start">
              {deadlinePassed && (
                <Icon
                  as={FiAlertTriangle}
                  color={warn.icon}
                  boxSize={4}
                  mt="2px"
                  flexShrink={0}
                  aria-hidden="true"
                />
              )}
              <Text fontSize="sm" color={deadlinePassed ? warn.text : 'gray.700'}>
                {deadlinePassed
                  ? intl.formatMessage({ id: 'app.pur.deadlinePassed' }, { date: deadlineText })
                  : intl.formatMessage({ id: 'app.pur.dueBy' }, { date: deadlineText })}
              </Text>
            </HStack>

            {/* One filing per county (3 CCR 6626(a)). Said in words with the list, not only
                by the grouping of the rows below, which is invisible in a two-row month. */}
            {multiCounty && (
              <HStack spacing={2} align="flex-start">
                <Icon
                  as={FiAlertTriangle}
                  color={warn.icon}
                  boxSize={4}
                  mt="2px"
                  flexShrink={0}
                  aria-hidden="true"
                />
                <Text fontSize="sm" color={warn.text}>
                  {intl.formatMessage(
                    { id: 'app.pur.counties.multi' },
                    {
                      count: counties.length,
                      list: counties
                        .map(
                          (c) =>
                            `${c.code ? `${c.code} ` : ''}${
                              c.name || intl.formatMessage({ id: 'app.pur.counties.unknown' })
                            } (${c.count})`
                        )
                        .join(', ')
                    }
                  )}
                </Text>
              </HStack>
            )}

            {hasApps ? (
              // No inner maxH/overflow: the dialog body already scrolls, and the nested
              // 220px region clipped the second row mid-sentence with no affordance.
              <VStack spacing={2} align="stretch">
                {summary.rows.map((row, idx) => {
                  const incomplete = row.missing.length > 0;
                  return (
                    <Box
                      key={`${row.event_id}-${idx}`}
                      p={3}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="gray.200"
                      borderLeft="4px solid"
                      borderLeftColor={incomplete ? warn.bar : 'green.600'}
                      bg="white">
                      <Stack
                        direction={{ base: 'column', smd: 'row' }}
                        justify="space-between"
                        align={{ base: 'stretch', smd: 'flex-start' }}
                        spacing={2}>
                        <Box minW={0}>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                            {row.product_and_manufacturer || '—'}
                          </Text>
                          {/* The event's own date, always — box 17 is one of the boxes that
                              can be blank, and two "Kocide 3000-O" rows with no date were
                              indistinguishable. */}
                          <Text fontSize="xs" color="gray.600">
                            {[formatEventDate(row.event_date), row.application_method]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                        </Box>
                        {row.parcel_id != null && (
                          <StandardButton
                            variant="outline"
                            size="sm"
                            leftIcon={<Icon as={FiEdit2} />}
                            onClick={() => openEvent(row)}
                            flexShrink={0}
                            alignSelf={{ base: 'flex-start', smd: 'auto' }}>
                            {intl.formatMessage({ id: 'app.pur.openEvent' })}
                          </StandardButton>
                        )}
                      </Stack>
                      <HStack spacing={1.5} align="flex-start" mt={2}>
                        <Icon
                          as={incomplete ? FiAlertTriangle : FiCheckCircle}
                          color={incomplete ? warn.icon : 'green.700'}
                          boxSize={3.5}
                          mt="2px"
                          flexShrink={0}
                          aria-hidden="true"
                        />
                        <Text fontSize="xs" color={incomplete ? warn.text : 'gray.600'}>
                          {incomplete
                            ? `${intl.formatMessage({ id: 'app.pur.missingBoxes' })}: ${row.missing
                                .map(labelForBox)
                                .join(', ')}`
                            : intl.formatMessage({ id: 'app.pur.rowComplete' })}
                        </Text>
                      </HStack>
                      {row.flags.map((flag, i) => (
                        <Text key={`${flag.code}-${i}`} fontSize="xs" color="gray.600" mt={1}>
                          {labelForFlag(flag)}
                        </Text>
                      ))}
                    </Box>
                  );
                })}
              </VStack>
            ) : (
              <StandardEmptyState
                icon={FiFileText}
                size="sm"
                title={intl.formatMessage({ id: 'app.pur.noApplicationsTitle' })}
                description={intl.formatMessage({ id: 'app.pur.noApplications' })}
              />
            )}

            {/* Hired applications: NOT the grower's to report (PUE Compendium Vol. 1 Ch. 4 p. 4-8).
                Listed so the absence from the rows above reads as a decision, not a missing
                spray, and openable so a wrong flag can be corrected on the record. */}
            {excluded.length > 0 && (
              <VStack spacing={2} align="stretch">
                <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                  {intl.formatMessage({ id: 'app.pur.pcbExcluded.title' })}
                </Text>
                <Text fontSize="xs" color="gray.600">
                  {intl.formatMessage({ id: 'app.pur.pcbExcluded.help' })}
                </Text>
                {excluded.map((item, idx) => (
                  <Box
                    key={`${item.event_id}-${idx}`}
                    p={3}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor="gray.200"
                    borderLeft="4px solid"
                    borderLeftColor="gray.300"
                    bg="white">
                    <Stack
                      direction={{ base: 'column', smd: 'row' }}
                      justify="space-between"
                      align={{ base: 'stretch', smd: 'flex-start' }}
                      spacing={2}>
                      <Box minW={0}>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                          {item.product || '—'}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          {[
                            formatEventDate(item.event_date),
                            item.pcb_name
                              ? intl.formatMessage(
                                  { id: 'app.pur.pcbExcluded.by' },
                                  { name: item.pcb_name }
                                )
                              : intl.formatMessage({ id: 'app.pur.pcbExcluded.byUnknown' })
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </Box>
                      {item.parcel_id != null && (
                        <StandardButton
                          variant="outline"
                          size="sm"
                          leftIcon={<Icon as={FiEdit2} />}
                          onClick={() => openExcluded(item)}
                          flexShrink={0}
                          alignSelf={{ base: 'flex-start', smd: 'auto' }}>
                          {intl.formatMessage({ id: 'app.pur.openEvent' })}
                        </StandardButton>
                      )}
                    </Stack>
                  </Box>
                ))}
              </VStack>
            )}

            {/* Static filing guidance — neutral, not a tinted "info" box. green.700 on the
                note's gray.50 ground is 4.91:1; the old green.500 on blue.50 was 2.43. */}
            <GuidanceNote>
              {summary.incomplete_count > 0 && (
                <>{intl.formatMessage({ id: 'app.pur.needDetailsHelp' })} </>
              )}
              {intl.formatMessage({ id: 'app.pur.filingHelp' })}{' '}
              <Link
                href="https://www.calagpermits.org/"
                isExternal
                color="green.700"
                fontWeight="semibold"
                textDecoration="underline">
                calagpermits.org
                <Icon
                  as={FiExternalLink}
                  boxSize={3}
                  ml={1}
                  verticalAlign="middle"
                  aria-hidden="true"
                />
              </Link>
            </GuidanceNote>
          </VStack>
        ) : null}
      </VStack>
    </ResponsiveModal>
  );
};

export default PURExportModal;
