/**
 * Washington pesticide application records (WAC 16-228-1320) export modal.
 *
 * Establishment + period scoped. Backend:
 *   GET /api/productions/wa-spray-records-export/?establishment_id=&year=   (a calendar year)
 *   GET /api/productions/wa-spray-records-export/?establishment_id=&start=&end=   (a month)
 *   &export_format=json|pdf|csv   (`export_format`, NOT `format`: DRF reserves that param.)
 *
 * Built like PURExportModal on the design system (ResponsiveModal, StandardField,
 * StandardSelect, GuidanceNote). The preview lists each application pass and the item letters
 * its record leaves blank, labelled here in the farmer's locale; the PDF and CSV carry the
 * English wording a Washington State Department of Agriculture reader gets.
 *
 * The copy never says the document satisfies the rule: whether the department accepts the form
 * is its decision (WAC 16-228-1320(5)), and the note says only that.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Box, HStack, Icon, Stack, Text, VStack, useToast } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiDownload, FiEdit2, FiFileText } from 'react-icons/fi';
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

interface WASprayPass {
  number: number;
  event_id: number;
  event_type: number;
  event_ids: number[];
  parcel_id: number | null;
  parcel_name: string;
  block: string;
  /** YYYY-MM-DD, the application's day; "" when the lines of a tank hold different days. */
  event_date: string;
  /** Each distinct day of the lines, when they differ (empty otherwise). */
  event_days?: string[];
  products: string[];
  /** Item letters of WAC 16-228-1320(1) the record leaves blank, in rule order. */
  blank_items: string[];
}

interface WASpraySummary {
  pass_count: number;
  /** What was logged as one application: a spray on several blocks prints once per block. */
  job_count?: number;
  product_line_count: number;
  passes_with_blank_items: number;
  parcels_without_map: string[];
  period_start: string;
  period_end: string;
  passes: WASprayPass[];
}

interface WASprayExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  establishmentId: number | string;
  establishmentName?: string;
}

/** Item letter -> i18n id. Every id is a literal so the used-keys gate can see it. */
const ITEM_LABEL_IDS: Record<string, string> = {
  a: 'app.waSpray.item.a',
  b: 'app.waSpray.item.b',
  c: 'app.waSpray.item.c',
  d: 'app.waSpray.item.d',
  e: 'app.waSpray.item.e',
  f: 'app.waSpray.item.f',
  g: 'app.waSpray.item.g',
  h: 'app.waSpray.item.h',
  i: 'app.waSpray.item.i',
  j: 'app.waSpray.item.j',
  k: 'app.waSpray.item.k',
  l: 'app.waSpray.item.l',
  m: 'app.waSpray.item.m',
  n: 'app.waSpray.item.n'
};

const WHOLE_YEAR = 0;

/** The query a period asks for: the whole calendar year, or one month as a date range. */
export const periodParams = (year: number, month: number): string => {
  if (month === WHOLE_YEAR) return `year=${year}`;
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, '0');
  return `start=${year}-${mm}-01&end=${year}-${mm}-${String(lastDay).padStart(2, '0')}`;
};

interface Period {
  year: number;
  month: number;
}

const exportUrl = (establishmentId: number | string, period: Period, exportFormat: string) =>
  `${config.API_BASE_URL}/productions/wa-spray-records-export/` +
  `?establishment_id=${establishmentId}&${periodParams(period.year, period.month)}` +
  `&export_format=${exportFormat}`;

/** The server's sentence for a refused request: `detail` (the plan refusal) before `error`. */
const errorMessage = async (response: Response, fallback: string) => {
  try {
    const err = await response.json();
    return err?.detail || err?.error || fallback;
  } catch {
    return fallback;
  }
};

const WASprayExportModal: React.FC<WASprayExportModalProps> = ({
  isOpen,
  onClose,
  establishmentId,
  establishmentName
}) => {
  const intl = useIntl();
  const toast = useToast();
  const navigate = useNavigate();

  // A calendar year by default: the period the records are kept and asked for in.
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(WHOLE_YEAR);
  const [summary, setSummary] = useState<WASpraySummary | null>(null);
  // The period the summary on screen was built for. Download asks for THIS period, never the
  // live selection, so the file is the one the preview showed.
  const [previewed, setPreviewed] = useState<Period | null>(null);
  // Each preview request takes the next number; a response that is not the latest is dropped,
  // so a slow answer for an earlier period never overwrites the one picked after it.
  const requestSeq = useRef(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [downloading, setDownloading] = useState<'pdf' | 'csv' | null>(null);

  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    intl.formatDate(new Date(2000, i, 1), { month: 'long' })
  );

  const loadPreview = useCallback(async () => {
    if (!establishmentId || !isOpen) return;
    const seq = ++requestSeq.current;
    const period = { year, month };
    const isLatest = () => seq === requestSeq.current;
    setIsPreviewing(true);
    setSummary(null);
    setPreviewed(null);
    setPreviewError(null);
    try {
      const response = await fetch(exportUrl(establishmentId, period, 'json'), {
        credentials: 'include'
      });
      if (!response.ok) {
        const message = await errorMessage(
          response,
          intl.formatMessage({ id: 'app.waSpray.previewFailed' })
        );
        if (isLatest()) setPreviewError(message);
        return;
      }
      const body = await response.json();
      if (!isLatest()) return;
      setSummary(body);
      setPreviewed(period);
    } catch (error) {
      if (isLatest()) setPreviewError(error instanceof Error ? error.message : '');
    } finally {
      if (isLatest()) setIsPreviewing(false);
    }
  }, [establishmentId, year, month, isOpen, intl]);

  useEffect(() => {
    if (isOpen) loadPreview();
  }, [isOpen, loadPreview]);

  const handleDownload = async (exportFormat: 'pdf' | 'csv') => {
    if (!previewed) return;
    setDownloading(exportFormat);
    try {
      const response = await fetch(exportUrl(establishmentId, previewed, exportFormat), {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(
          await errorMessage(response, intl.formatMessage({ id: 'app.exportFailed' }))
        );
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const period =
        previewed.month === WHOLE_YEAR
          ? `${previewed.year}`
          : `${previewed.year}-${String(previewed.month).padStart(2, '0')}`;
      link.download = `trazo-wa-spray-records-${establishmentId}-${period}.${exportFormat}`;
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
      setDownloading(null);
    }
  };

  const handleClose = () => {
    if (!downloading) onClose();
  };

  const openEvent = (pass: WASprayPass) => {
    if (pass.parcel_id == null) return;
    onClose();
    navigate(
      `/admin/dashboard/farm/${establishmentId}/parcel/${pass.parcel_id}/event/${pass.event_id}/change?event_type=${pass.event_type}`
    );
  };

  // A date-only string: formatted in UTC so it never prints as the previous day west of Greenwich.
  const formatDay = (iso: string) =>
    iso
      ? intl.formatDate(`${iso}T00:00:00Z`, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC'
        })
      : '';

  const labelForItem = (letter: string) =>
    ITEM_LABEL_IDS[letter] ? intl.formatMessage({ id: ITEM_LABEL_IDS[letter] }) : `(${letter})`;

  const hasPasses = !!summary && summary.pass_count > 0;
  const warn = STATUS_URGENCY_TOKENS.warn;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      isCloseDisabled={!!downloading}
      header={
        <HStack spacing={3} align="flex-start">
          <Icon as={FiFileText} color="green.700" boxSize={5} mt="3px" aria-hidden="true" />
          <Box>
            <Text fontSize="lg" fontWeight="bold" color="gray.800" lineHeight="short">
              {intl.formatMessage({ id: 'app.waSpray.title' })}
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
            isDisabled={!!downloading}
            w={{ base: 'full', smd: 'auto' }}>
            {intl.formatMessage({ id: 'app.cancel' })}
          </StandardButton>
          <StandardButton
            variant="outline"
            size="md"
            leftIcon={<Icon as={FiDownload} />}
            onClick={() => handleDownload('csv')}
            isLoading={downloading === 'csv'}
            loadingText={intl.formatMessage({ id: 'app.exportDownloading' })}
            isDisabled={!hasPasses || !previewed || isPreviewing || !!downloading}
            w={{ base: 'full', smd: 'auto' }}>
            {intl.formatMessage({ id: 'app.waSpray.downloadCsv' })}
          </StandardButton>
          <StandardButton
            variant="primary"
            size="md"
            leftIcon={<Icon as={FiDownload} />}
            onClick={() => handleDownload('pdf')}
            isLoading={downloading === 'pdf'}
            loadingText={intl.formatMessage({ id: 'app.exportDownloading' })}
            isDisabled={!hasPasses || !previewed || isPreviewing || !!downloading}
            w={{ base: 'full', smd: 'auto' }}>
            {intl.formatMessage({ id: 'app.waSpray.downloadPdf' })}
          </StandardButton>
        </Stack>
      }>
      <VStack spacing={5} align="stretch">
        <Text fontSize="sm" color="gray.700">
          {intl.formatMessage({ id: 'app.waSpray.subtitle' })}
        </Text>

        <Stack direction={{ base: 'column', smd: 'row' }} spacing={3}>
          <Box flex={1}>
            <StandardField label={intl.formatMessage({ id: 'app.waSpray.year' })}>
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
          <Box flex={2}>
            <StandardField label={intl.formatMessage({ id: 'app.waSpray.period' })}>
              <StandardSelect
                value={month}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setMonth(Number(e.target.value))
                }>
                <option value={WHOLE_YEAR}>
                  {intl.formatMessage({ id: 'app.waSpray.period.wholeYear' })}
                </option>
                {monthNames.map((label, idx) => (
                  <option key={idx} value={idx + 1}>
                    {label}
                  </option>
                ))}
              </StandardSelect>
            </StandardField>
          </Box>
        </Stack>

        {isPreviewing ? (
          <StandardSpinner label={intl.formatMessage({ id: 'app.waSpray.loadingPreview' })} />
        ) : previewError !== null ? (
          <StandardQueryError
            title={intl.formatMessage({ id: 'app.waSpray.previewFailed' })}
            description={previewError || undefined}
            onRetry={loadPreview}
            isRetrying={isPreviewing}
          />
        ) : summary ? (
          <VStack spacing={4} align="stretch">
            <HStack spacing={2} wrap="wrap">
              <Badge variant="neutral">
                {summary.job_count !== undefined && summary.job_count < summary.pass_count
                  ? intl.formatMessage(
                      { id: 'app.waSpray.jobsPrintedAs' },
                      { jobs: summary.job_count, count: summary.pass_count }
                    )
                  : intl.formatMessage(
                      { id: 'app.waSpray.applications' },
                      { count: summary.pass_count }
                    )}
              </Badge>
              {summary.passes_with_blank_items > 0 && (
                <Badge variant="warning">
                  <HStack as="span" spacing={1}>
                    <Icon as={FiAlertTriangle} boxSize={3} aria-hidden="true" />
                    <Text as="span">
                      {intl.formatMessage(
                        { id: 'app.waSpray.withBlanks' },
                        { count: summary.passes_with_blank_items }
                      )}
                    </Text>
                  </HStack>
                </Badge>
              )}
            </HStack>

            {hasPasses ? (
              <VStack spacing={2} align="stretch">
                {summary.passes.map((pass) => {
                  const blank = pass.blank_items.length > 0;
                  return (
                    <Box
                      key={pass.number}
                      p={3}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="gray.200"
                      borderLeft="4px solid"
                      borderLeftColor={blank ? warn.bar : 'green.600'}
                      bg="white">
                      <Stack
                        direction={{ base: 'column', smd: 'row' }}
                        justify="space-between"
                        align={{ base: 'stretch', smd: 'flex-start' }}
                        spacing={2}>
                        <Box minW={0}>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                            {pass.products.join(', ')}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            {[
                              pass.event_date
                                ? formatDay(pass.event_date)
                                : intl.formatMessage(
                                    { id: 'app.waSpray.daysDiffer' },
                                    { days: (pass.event_days ?? []).map(formatDay).join(', ') }
                                  ),
                              [pass.parcel_name, pass.block].filter(Boolean).join(', '),
                              pass.products.length > 1
                                ? intl.formatMessage(
                                    { id: 'app.waSpray.tank' },
                                    { count: pass.products.length }
                                  )
                                : ''
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                        </Box>
                        {pass.parcel_id != null && (
                          <StandardButton
                            variant="outline"
                            size="sm"
                            leftIcon={<Icon as={FiEdit2} />}
                            onClick={() => openEvent(pass)}
                            flexShrink={0}
                            alignSelf={{ base: 'flex-start', smd: 'auto' }}>
                            {intl.formatMessage({ id: 'app.waSpray.openEvent' })}
                          </StandardButton>
                        )}
                      </Stack>
                      <Text fontSize="xs" color={blank ? warn.text : 'gray.600'} mt={2}>
                        {blank
                          ? intl.formatMessage(
                              { id: 'app.waSpray.blankItems' },
                              { items: pass.blank_items.map(labelForItem).join(', ') }
                            )
                          : intl.formatMessage({ id: 'app.waSpray.noBlankItems' })}
                      </Text>
                    </Box>
                  );
                })}
              </VStack>
            ) : (
              <StandardEmptyState
                icon={FiFileText}
                size="sm"
                title={intl.formatMessage({ id: 'app.waSpray.noApplicationsTitle' })}
                description={intl.formatMessage({ id: 'app.waSpray.noApplications' })}
              />
            )}

            {hasPasses && summary.parcels_without_map.length > 0 && (
              <Text fontSize="xs" color="gray.600">
                {intl.formatMessage(
                  { id: 'app.waSpray.noMap' },
                  { parcels: summary.parcels_without_map.join(', ') }
                )}
              </Text>
            )}

            <GuidanceNote>{intl.formatMessage({ id: 'app.waSpray.decisionNote' })}</GuidanceNote>
          </VStack>
        ) : null}
      </VStack>
    </ResponsiveModal>
  );
};

export default WASprayExportModal;
