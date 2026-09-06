/**
 * Operation-wide audit dossier — asked for, built in the background, filed in Documents.
 *
 * Until 2026-09-05 this card fetched the PDF inline: one GET that, on a 12-production farm,
 * ran ~2,750 queries and laid out ~400 pages — about a minute in production, against an edge
 * that drops requests at ~100 s, with a spinner and then a bare "Export failed". Now:
 *
 *   POST /companies/{c}/establishments/{f}/export-jobs/     → job (queued)
 *   GET  /companies/{c}/establishments/{f}/export-jobs/{id}/ → polled every 3 s until terminal
 *
 * The finished PDF is a DMS row under Documents › Exports, downloaded with cookies through the
 * ordinary document download route; the farmer also gets an in-app notification and an email
 * carrying a LINK (never the file — see documents/services/export_jobs.py). They can leave the
 * page mid-build.
 *
 * Audit window (2026-09-05): CCOF's inspection checklist asks for "input material applications
 * going back at least to the previous inspection", not every season ever. The two date fields
 * bound the productions included (active in the window); both blank = every season, which is
 * the old behaviour.
 *
 * Readiness guard (2026-08-10): the backend never refuses this build — a not-ready operation
 * gets its PDF stamped with a red "[NON-COMPLIANT DOSSIER — DO NOT SUBMIT TO CERTIFIER]" banner
 * instead. The same readiness query paints a warning with the blocker titles first, and the
 * build stays available — the farmer may legitimately want the stamped draft to see exactly
 * what the certifier would.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Box, HStack, Icon, Progress, Text, useToast } from '@chakra-ui/react';
import { FaDownload, FaExclamationTriangle, FaFilePdf, FaFolderOpen } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import {
  StandardAlert,
  StandardButton,
  StandardCard,
  StandardField,
  StandardInput
} from 'components/Design/StandardComponents';
import { DOCUMENT_DOWNLOAD_URL } from 'config';
import { env } from 'config/environment';
import baseApi from 'store/api/baseApi';
import { useGetOperationReadinessQuery } from 'store/api/certifierLinkApi';
import { useCreateExportJobMutation, useGetExportJobQuery } from 'store/api/exportJobsApi';
import { EXPORT_JOB_POLL_MS, describeProgress, isTerminal } from 'utils/exportJobs';

interface Props {
  companyId?: string;
  farmId?: string;
}

/**
 * ⛔ THE STANDARD PICKER WAS REMOVED 2026-08-29. This export is USDA Organic, always.
 *
 * Measured, not assumed: every non-organic set was a strict SUBSET of `organic`, except that
 * `roc`, `scs` and `all` each added exactly one section — `carbon` — and `fsma204` added
 * `traceability`. `globalgap` added nothing at all. So the picker offered LESS information under
 * a brand Trazo cannot substantiate, plus the one section the organic export deliberately omits
 * ("USDA inspectors do not grade on environmental footprint, and including emissions data in an
 * audit PDF risks greenwashing-by-association claims").
 *
 * The backend still accepts `certification_type` and the section sets are intact, so restoring a
 * standard is re-adding a control, not rebuilding a feature. Do not restore one without a named
 * grower asking for it.
 */
const CERTIFICATION = 'organic';

const OperationAuditExportButton: React.FC<Props> = ({ companyId, farmId }) => {
  const intl = useIntl();
  const toast = useToast();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  // Polling is a flag, not a derivation from the poll's own result (TypeScript would see the
  // query reference itself). Set when a build starts, cleared by the effect that sees it end.
  const [polling, setPolling] = useState(false);
  const announcedRef = useRef<string | null>(null);

  const { data: readiness } = useGetOperationReadinessQuery(
    { companyId: companyId || '', farmId: farmId || '' },
    { skip: !companyId || !farmId }
  );
  const blockers = readiness?.applicable ? readiness.blockers || [] : [];

  const [createJob, { isLoading: starting }] = useCreateExportJobMutation();
  const { data: job } = useGetExportJobQuery(
    { companyId: companyId || '', farmId: farmId || '', jobId: jobId || '' },
    {
      skip: !companyId || !farmId || !jobId,
      // Poll while the build runs; stop the moment it is terminal.
      pollingInterval: polling ? EXPORT_JOB_POLL_MS : 0
    }
  );

  const windowInvalid = Boolean(start && end && start > end);
  const building = starting || Boolean(jobId && job && !isTerminal(job)) || Boolean(jobId && !job);

  // One toast per finished build, and the Documents shelf refetches so the new row is there
  // when the farmer clicks through.
  useEffect(() => {
    if (!job || !isTerminal(job) || announcedRef.current === job.public_id) return;
    announcedRef.current = job.public_id;
    setPolling(false);
    if (job.status === 'succeeded') {
      dispatch(baseApi.util.invalidateTags([{ type: 'FarmDocuments', id: farmId || '' }]));
      toast({
        status: 'success',
        title: intl.formatMessage({
          id: 'operationAudit.success',
          defaultMessage: 'Operation audit dossier ready'
        })
      });
    }
  }, [job, dispatch, farmId, intl, toast]);

  const handlePrepare = async () => {
    if (!companyId || !farmId || windowInvalid) return;
    try {
      const created = await createJob({
        companyId,
        farmId,
        data: {
          kind: 'operation_dossier',
          certification: CERTIFICATION,
          ...(start ? { start } : {}),
          ...(end ? { end } : {})
        }
      }).unwrap();
      announcedRef.current = null;
      setJobId(created.public_id);
      setPolling(!isTerminal(created));
    } catch (error) {
      const data = (error as { data?: { detail?: string; error?: string } })?.data;
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'app.exportFailed', defaultMessage: 'Export failed' }),
        description: data?.detail || data?.error || undefined
      });
    }
  };

  const progress = describeProgress(job);
  const progressText = (() => {
    if (progress.total > 0 && progress.current >= progress.total) {
      return intl.formatMessage(
        {
          id: 'operationAudit.progressLayout',
          defaultMessage: 'Laying out the pages for {total} productions…'
        },
        { total: progress.total }
      );
    }
    if (progress.total > 0 && progress.current > 0) {
      return intl.formatMessage(
        {
          id: 'operationAudit.progressProduction',
          defaultMessage: 'Production {current} of {total}: {label}'
        },
        { current: progress.current, total: progress.total, label: progress.label }
      );
    }
    return intl.formatMessage({
      id: 'operationAudit.progressGathering',
      defaultMessage: 'Gathering operation-wide records…'
    });
  })();

  const documentsPath = `/admin/dashboard/farm/${farmId}/documents`;
  const sizeMb = job?.document_size_bytes
    ? (job.document_size_bytes / (1024 * 1024)).toFixed(1)
    : '0.0';

  return (
    // Title and subtitle come from StandardCard's own props. They used to be hand-rolled as
    // a bold <Text fontSize="lg"> inside the body, which made this the one card on the farm
    // profile whose header did not match its neighbours.
    <StandardCard
      variant="elevated"
      padding={{ base: 0, md: 4 }}
      mb={0}
      title={intl.formatMessage({
        id: 'operationAudit.title',
        defaultMessage: 'Operation Audit Dossier'
      })}
      subtitle={intl.formatMessage({
        id: 'operationAudit.subtitle',
        defaultMessage:
          'One combined NOP records PDF across every parcel and production — for your annual inspection.'
      })}>
      {blockers.length > 0 && (
        <HStack
          align="flex-start"
          spacing={2}
          mb={3}
          p={3}
          borderRadius="md"
          borderWidth="1px"
          borderColor="orange.200"
          bg="orange.50">
          <Icon as={FaExclamationTriangle} color="orange.500" mt="2px" flexShrink={0} />
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="orange.800">
              {intl.formatMessage({
                id: 'operationAudit.notReadyTitle',
                defaultMessage: 'This dossier will be stamped "DO NOT SUBMIT"'
              })}
            </Text>
            <Text fontSize="sm" color="orange.800">
              {intl.formatMessage(
                {
                  id: 'operationAudit.notReadyDetail',
                  defaultMessage:
                    'Open items: {items}. You can still download it as a working draft — fix these before sending anything to your certifier.'
                },
                { items: blockers.map((b) => b.title).join(' · ') }
              )}
            </Text>
          </Box>
        </HStack>
      )}

      {/* Audit window — both blank covers every season. */}
      <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={1}>
        {intl.formatMessage({ id: 'operationAudit.window.title' })}
      </Text>
      <Text fontSize="xs" color="gray.600" mb={2}>
        {intl.formatMessage({ id: 'operationAudit.window.help' })}
      </Text>
      <HStack gap={3} align="flex-start" flexDirection={{ base: 'column', smd: 'row' }} mb={3}>
        <StandardField
          label={intl.formatMessage({ id: 'operationAudit.window.start' })}
          w="full"
          maxW={{ base: 'full', smd: '260px' }}>
          <StandardInput
            type="date"
            value={start}
            max={end || undefined}
            onChange={(e) => setStart(e.target.value)}
            isDisabled={building}
          />
        </StandardField>
        <StandardField
          label={intl.formatMessage({ id: 'operationAudit.window.end' })}
          error={
            windowInvalid ? intl.formatMessage({ id: 'operationAudit.window.invalid' }) : undefined
          }
          w="full"
          maxW={{ base: 'full', smd: '260px' }}>
          <StandardInput
            type="date"
            value={end}
            min={start || undefined}
            onChange={(e) => setEnd(e.target.value)}
            isDisabled={building}
          />
        </StandardField>
      </HStack>

      {building && (
        <Box mb={3} role="status" aria-live="polite">
          <Text fontSize="sm" color="gray.700" mb={2}>
            {job ? progressText : intl.formatMessage({ id: 'operationAudit.preparing' })}
          </Text>
          <Progress
            size="sm"
            colorScheme="green"
            borderRadius="full"
            isIndeterminate={progress.fraction === null}
            value={(progress.fraction ?? 0) * 100}
          />
        </Box>
      )}

      {job?.status === 'succeeded' && job.document_id && companyId && farmId && (
        <StandardAlert
          status="success"
          mb={3}
          title={intl.formatMessage({ id: 'operationAudit.ready' })}
          description={intl.formatMessage(
            { id: 'operationAudit.readyDetail' },
            {
              title:
                job.document_title ||
                intl.formatMessage({
                  id: 'operationAudit.title',
                  defaultMessage: 'Operation Audit Dossier'
                }),
              size: sizeMb
            }
          )}>
          <HStack gap={2} flexWrap="wrap" pt={1}>
            {/* Plain anchor: cookie auth rides along and the browser streams the PDF to disk. */}
            <StandardButton
              as="a"
              href={env.getApiUrl(DOCUMENT_DOWNLOAD_URL(companyId, farmId, job.document_id))}
              size="sm"
              leftIcon={<FaDownload />}>
              {intl.formatMessage({
                id: 'operationAudit.download',
                defaultMessage: 'Download Operation Dossier'
              })}
            </StandardButton>
            <StandardButton
              size="sm"
              variant="outline"
              leftIcon={<FaFolderOpen />}
              onClick={() => navigate(documentsPath)}>
              {intl.formatMessage({ id: 'operationAudit.openDocuments' })}
            </StandardButton>
          </HStack>
        </StandardAlert>
      )}

      {job?.status === 'failed' && (
        <StandardAlert
          status="error"
          mb={3}
          title={intl.formatMessage({ id: 'operationAudit.failed' })}
          description={job.error || undefined}
        />
      )}

      <HStack
        gap={3}
        align={{ base: 'stretch', smd: 'flex-end' }}
        flexDirection={{ base: 'column', smd: 'row' }}>
        <StandardButton
          size="sm"
          // ONE primary action at a time: while a finished build sits above with its own
          // Download button, starting another is the secondary act.
          variant={job?.status === 'succeeded' ? 'outline' : undefined}
          leftIcon={<FaFilePdf />}
          onClick={handlePrepare}
          isLoading={building}
          isDisabled={!companyId || !farmId || windowInvalid}
          w={{ base: 'full', smd: 'auto' }}
          flexShrink={0}>
          {job && isTerminal(job)
            ? intl.formatMessage({ id: 'operationAudit.prepareAgain' })
            : intl.formatMessage({ id: 'operationAudit.prepare' })}
        </StandardButton>
      </HStack>
      {job?.status !== 'succeeded' && (
        <Text fontSize="xs" color="gray.600" mt={3}>
          {intl.formatMessage({ id: 'operationAudit.asyncNote' })}
        </Text>
      )}
      {/*
        What the chosen standard actually covers — and, for ROC and GlobalG.A.P., what it does
        NOT. The per-production modal has said this since 2026-08-22; this dropdown offered the
        same four standards as flat peers with no description at all, so choosing GlobalG.A.P.
        here produced a 9-section document where USDA Organic produces 27, with nothing on screen
        to say so. Same strings as the modal on purpose: two copies of one explanation is how
        they come to disagree.
      */}
      <Text fontSize="xs" color="gray.600" mt={3}>
        {intl.formatMessage({ id: 'app.exportInfoOrganic' })}
      </Text>
      {/* Which of the three certifier artifacts this is, so it is not mistaken for the others. */}
      <Text fontSize="xs" color="gray.600" mt={1}>
        {intl.formatMessage({ id: 'operationAudit.scopeNote' })}
      </Text>
    </StandardCard>
  );
};

export default OperationAuditExportButton;
