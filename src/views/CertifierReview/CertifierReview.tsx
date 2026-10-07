/**
 * What a certifier sees when they open a farmer's review link.
 *
 * Deliberately unauthenticated and deliberately plain: the audience is a
 * certification reviewer or inspector who was sent a URL, not a Trazo user. They
 * get the operation's identity, the window the dossier covers, and a download —
 * nothing to sign up for and nothing to learn.
 *
 * Shows no marketing, no transparency score, and no call to action. A certifier
 * evaluating an operation should not be handed a self-graded number, and a page
 * that pitched at them would undermine the farmer whose records they came to read.
 *
 * Readiness findings added 2026-08-04 — until then this page's only offer was a PDF
 * download, which meant learning anything about the operation required leaving the
 * browser. Findings are the same CFR-cited rows `compliance_snapshot_rows()` puts in
 * the PDF and in the farmer's own dashboard card — read here, not recomputed — so the
 * page and the download can never disagree. Still no score, no grade, no verdict: every
 * row states what is missing from the RECORD, never a judgment about the operation.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Center,
  Divider,
  Heading,
  HStack,
  Icon,
  Progress,
  Spinner,
  Text,
  VStack,
  useColorModeValue,
  Link
} from '@chakra-ui/react';
import {
  FaCheckCircle,
  FaDownload,
  FaExclamationCircle,
  FaFileAlt,
  FaInfoCircle
} from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import { StandardButton } from 'components/Design/StandardComponents';
import { config } from 'config/environment';
import { formatDateOnly, formatDateFromTimestamp } from 'utils/dateOnly';
import {
  classifyReviewLinkFailure,
  parseReviewLinkResponse,
  type ReviewLinkFailure
} from 'utils/reviewLinkFailure';
import { awaitCertifierDossier, describeProgress, type ExportJob } from 'utils/exportJobs';

interface ReviewMetadata {
  operation_name: string;
  operation_city: string | null;
  operation_state: string | null;
  certification_type: string;
  period_start: string | null;
  period_end: string | null;
  expires_at: string;
  label: string;
}

interface ReadinessFinding {
  label: string;
  /** Stable per row; names the row in the reader's language (run 8, R8-27). */
  row_key?: string;
  status: string;
  detail: string;
  section_hint: string | null;
}

interface NotAssessedRow {
  label: string;
  row_key?: string;
  status: string;
}

interface ReadinessProduction {
  production_id: number;
  production_name: string;
  finish_date: string | null;
  findings: ReadinessFinding[];
  // Rows that are facts about scope (NA, INFO, NOT ASSESSED), not findings. Folded behind a
  // toggle (recordkeeping review S9, F-16: 25 such rows sat among 19 findings).
  not_assessed?: NotAssessedRow[];
}

interface ReadinessResponse {
  productions: ReadinessProduction[];
  total_findings: number;
  total_not_assessed?: number;
  total_productions: number;
}

// This page is read by a CERTIFIER. `period_start` / `period_end` are DateFields arriving as
// "2025-01-01", and `new Date("2025-01-01")` is UTC midnight in JS, so the review window was
// shown as starting Dec 31, 2024. The dossier PDF linked from this same page prints the
// correct day, so the two disagreed in front of the certifier.
const formatDate = (value?: string | null) => formatDateOnly(value) ?? null;

/**
 * Run 8 (R8-27, Astra 2026-10-05): this page showed red "FAIL" badges under an organic dossier
 * title, with the not-a-compliance-decision disclaimer at the very bottom. A readiness row
 * checks whether a record is present, so it says that: "Missing" or "For review", in neutral
 * colours. Nothing here reads as a certifier's verdict.
 */
function findingStyle(status: ReadinessFinding['status']) {
  if (status === 'FAIL') {
    return {
      tone: 'gray.500',
      icon: FaExclamationCircle,
      labelId: 'certifierReview.status.missing'
    };
  }
  if (status === 'REVIEW') {
    return { tone: 'gray.400', icon: FaInfoCircle, labelId: 'certifierReview.status.forReview' };
  }
  return { tone: 'gray.300', icon: FaInfoCircle, labelId: 'certifierReview.status.notAssessed' };
}

/** The row's name in the reader's language, or the server's English label if it has none. */
function findingLabel(intl: ReturnType<typeof useIntl>, finding: ReadinessFinding): string {
  const id = finding.row_key ? `certifierReview.row.${finding.row_key}` : '';
  return id && intl.messages[id] ? intl.formatMessage({ id }) : finding.label;
}

const CertifierReview: React.FC = () => {
  const intl = useIntl();
  const { token } = useParams<{ token: string }>();
  const [meta, setMeta] = useState<ReviewMetadata | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [showNotAssessed, setShowNotAssessed] = useState(false);
  const [failure, setFailure] = useState<ReviewLinkFailure | null>(null);
  const [loading, setLoading] = useState(true);
  // The dossier is built at most once per change of the records (backend:
  // certifier_review_dossier). When the filed build is current the click downloads at once;
  // otherwise the server answers 202 with a job and this page shows its progress.
  const [building, setBuilding] = useState(false);
  const [buildJob, setBuildJob] = useState<ExportJob | null>(null);
  const [buildError, setBuildError] = useState<'failed' | 'timeout' | null>(null);

  const rowBg = useColorModeValue('gray.50', 'gray.700');
  const rowBorder = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const clearBg = useColorModeValue('green.50', 'green.900');
  const clearBorder = useColorModeValue('green.200', 'green.700');
  const clearText = useColorModeValue('green.700', 'green.300');

  const apiRoot = `${config.API_ROOT_URL}/api`;

  useEffect(() => {
    let cancelled = false;
    // No credentials on either request: this page is anonymous by design, and sending
    // cookies would tie the certifier's view to whatever Trazo session their browser holds.
    const metaRequest = fetch(`${apiRoot}/certifier-review/${token}/`).then(
      (res) => parseReviewLinkResponse(res) as Promise<ReviewMetadata>
    );
    // Readiness is fetched independently and allowed to fail quietly (caught below): the
    // operation identity is the part that must render for the page to make sense at all;
    // a findings-fetch failure degrades to "no findings shown" rather than the whole page.
    const readinessRequest = fetch(`${apiRoot}/certifier-review/${token}/readiness/`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);

    Promise.all([metaRequest, readinessRequest])
      .then(([metaData, readinessData]) => {
        if (cancelled) return;
        setMeta(metaData);
        setReadiness(readinessData);
      })
      .catch((error) => {
        // Only a 404 may be reported as a link that is gone. Anything else — throttling, a
        // gateway error, a blocked preflight — is a condition on our side, and saying "no
        // longer available" for those tells the reviewer the operation withdrew it.
        if (!cancelled) setFailure(classifyReviewLinkFailure(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiRoot, token]);

  const handleDownload = useCallback(async () => {
    if (building) return;
    setBuilding(true);
    setBuildError(null);
    setBuildJob(null);
    const dossierUrl = `${apiRoot}/certifier-review/${token}/dossier/`;
    try {
      const outcome = await awaitCertifierDossier({
        dossierUrl,
        statusUrl: `${apiRoot}/certifier-review/${token}/dossier/status/`,
        onProgress: setBuildJob
      });
      if (outcome.kind === 'download') {
        // A navigation, not a fetch: the browser streams a possibly large PDF straight to disk.
        window.location.href = outcome.url;
      } else {
        setBuildError(outcome.kind);
      }
    } catch {
      setBuildError('failed');
    } finally {
      setBuilding(false);
    }
  }, [apiRoot, token, building]);

  if (loading) {
    return (
      <Center minH="60vh">
        <Spinner size="lg" color="green.700" />
      </Center>
    );
  }

  if (failure || !meta) {
    // `!meta` with no recorded failure means a 200 whose body did not parse: not evidence the
    // link is gone, so it degrades to the temporary message.
    const isGone = failure === 'gone';
    return (
      <Center minH="60vh" px={4}>
        <Alert status={isGone ? 'warning' : 'info'} maxW="lg">
          <AlertIcon />
          <Box>
            <Text fontWeight="semibold">
              {intl.formatMessage({
                id: isGone ? 'certifierReview.unavailable.title' : 'certifierReview.temporary.title'
              })}
            </Text>
            <Text fontSize="sm">
              {/* When the link IS gone, expired and revoked stay deliberately
                  indistinguishable: the farmer can tell them apart on their own dashboard, an
                  anonymous visitor should not be able to. */}
              {intl.formatMessage({
                id: isGone ? 'certifierReview.unavailable.body' : 'certifierReview.temporary.body'
              })}
            </Text>
          </Box>
        </Alert>
      </Center>
    );
  }

  const location = [meta.operation_city, meta.operation_state].filter(Boolean).join(', ');
  const period =
    formatDate(meta.period_start) && formatDate(meta.period_end)
      ? `${formatDate(meta.period_start)} – ${formatDate(meta.period_end)}`
      : null;

  const productionsWithFindings = (readiness?.productions ?? []).filter(
    (p) => p.findings.length > 0
  );
  const notAssessedTotal =
    readiness?.total_not_assessed ??
    (readiness?.productions ?? []).reduce((n, p) => n + (p.not_assessed?.length ?? 0), 0);

  return (
    <Center minH="60vh" px={4} py={10}>
      <VStack spacing={5} maxW="lg" align="stretch" w="100%">
        <VStack spacing={1} align="stretch">
          <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
            {intl.formatMessage({
              id: 'certifierReview.eyebrow',
              defaultMessage: 'Organic audit dossier'
            })}
          </Text>
          <Heading size="lg">{meta.operation_name}</Heading>
          {location && (
            <Text color="gray.600" fontSize="sm">
              {location}
            </Text>
          )}
        </VStack>

        {period && (
          <Text fontSize="sm" color="gray.700">
            {intl.formatMessage(
              { id: 'certifierReview.period', defaultMessage: 'Covering {period}' },
              { period }
            )}
          </Text>
        )}

        {/* Readiness findings — read in the browser, no download required. Absent entirely
            (rather than an empty section) when the readiness fetch failed, so a transient
            error on this secondary request never looks like "operation has no findings". */}
        {readiness && (
          <>
            <Divider />
            <VStack align="stretch" spacing={3}>
              <Text fontSize="xs" fontWeight="bold" color={mutedColor} textTransform="uppercase">
                {intl.formatMessage({
                  id: 'certifierReview.readinessTitle',
                  defaultMessage: 'Record readiness'
                })}
              </Text>
              {/* Run 8 (R8-27): the scope comes first, before any finding is read. Trazo
                  documents; the certifying agent decides. Not optional. */}
              <Text fontSize="xs" color={mutedColor}>
                {intl.formatMessage({
                  id: 'certifierReview.readinessDisclaimer',
                  defaultMessage:
                    'These are documentation checks on the records in Trazo, not a compliance decision.'
                })}
              </Text>

              {productionsWithFindings.length === 0 && notAssessedTotal > 0 ? (
                /* No finding, but rows were not assessed: a fact about scope, never the
                   green all-clear (review of app #95). The rows are listed by the toggle below. */
                <Box bg={rowBg} border="1px solid" borderColor={rowBorder} borderRadius="lg" p={4}>
                  <HStack spacing={2}>
                    <Icon as={FaInfoCircle} color={mutedColor} boxSize={4} />
                    <Text
                      fontSize="sm"
                      color={textColor}
                      data-testid="certifier-no-findings-some-not-assessed">
                      {intl.formatMessage(
                        {
                          id: 'certifierReview.readinessNoFindingsSomeNotAssessed',
                          defaultMessage:
                            'No finding across {count, plural, one {# season} other {# seasons}} in this window; {notAssessed, plural, one {# row was} other {# rows were}} not assessed'
                        },
                        { count: readiness.total_productions, notAssessed: notAssessedTotal }
                      )}
                    </Text>
                  </HStack>
                </Box>
              ) : productionsWithFindings.length === 0 ? (
                <Box
                  bg={clearBg}
                  border="1px solid"
                  borderColor={clearBorder}
                  borderRadius="lg"
                  p={4}>
                  <HStack spacing={2}>
                    <Icon as={FaCheckCircle} color={clearText} boxSize={4} />
                    <Text fontSize="sm" fontWeight="semibold" color={clearText}>
                      {intl.formatMessage(
                        {
                          id: 'certifierReview.readinessAllClear',
                          defaultMessage:
                            'No outstanding items across {count, plural, one {# season} other {# seasons}} in this window'
                        },
                        { count: readiness.total_productions }
                      )}
                    </Text>
                  </HStack>
                </Box>
              ) : (
                productionsWithFindings.map((production) => (
                  <Box key={production.production_id}>
                    <Text fontSize="sm" fontWeight="semibold" color={textColor} mb={2}>
                      {production.production_name}
                    </Text>
                    <VStack align="stretch" spacing={2}>
                      {production.findings.map((finding) => {
                        const style = findingStyle(finding.status);
                        return (
                          <Box
                            key={finding.label}
                            bg={rowBg}
                            border="1px solid"
                            borderColor={rowBorder}
                            borderLeft="4px solid"
                            borderLeftColor={style.tone}
                            borderRadius="md"
                            p={3}>
                            <HStack spacing={2} align="start">
                              <Icon
                                as={style.icon}
                                color={style.tone}
                                boxSize={4}
                                mt={0.5}
                                flexShrink={0}
                              />
                              <VStack align="start" spacing={1} flex={1} minW={0}>
                                <HStack spacing={2} flexWrap="wrap">
                                  <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                                    {findingLabel(intl, finding)}
                                  </Text>
                                  <Badge variant="neutral" fontSize="xs" borderRadius="full">
                                    {intl.formatMessage({ id: style.labelId })}
                                  </Badge>
                                </HStack>
                                <Text fontSize="xs" color={mutedColor} lineHeight="1.5">
                                  {finding.detail}
                                </Text>
                                {/* Where to look in the PDF dossier. This was on the wire and
                                    in the interface above but never rendered, so a reviewer got
                                    a finding with no way to find the underlying records short of
                                    reading a 900KB PDF end to end. */}
                                {finding.section_hint && (
                                  <HStack spacing={1} pt={0.5}>
                                    <Icon
                                      as={FaFileAlt}
                                      boxSize={2.5}
                                      color={mutedColor}
                                      aria-hidden="true"
                                    />
                                    <Text fontSize="xs" color={mutedColor}>
                                      {intl.formatMessage(
                                        {
                                          id: 'certifierReview.findingLocation',
                                          defaultMessage: 'In the dossier: {section}'
                                        },
                                        { section: finding.section_hint }
                                      )}
                                    </Text>
                                  </HStack>
                                )}
                              </VStack>
                            </HStack>
                          </Box>
                        );
                      })}
                    </VStack>
                  </Box>
                ))
              )}
              {notAssessedTotal > 0 && (
                <Box>
                  <Link
                    as="button"
                    type="button"
                    fontSize="xs"
                    color={mutedColor}
                    data-testid="certifier-not-assessed-toggle"
                    onClick={() => setShowNotAssessed((v) => !v)}>
                    {intl.formatMessage(
                      {
                        id: showNotAssessed
                          ? 'certifierReview.notAssessed.hide'
                          : 'certifierReview.notAssessed.show',
                        defaultMessage: showNotAssessed
                          ? 'Hide the {count} rows not assessed'
                          : 'Show the {count} rows not assessed'
                      },
                      { count: notAssessedTotal }
                    )}
                  </Link>
                  {showNotAssessed && (
                    <VStack
                      align="stretch"
                      spacing={1}
                      mt={2}
                      data-testid="certifier-not-assessed-rows">
                      {(readiness?.productions ?? []).map((production) =>
                        (production.not_assessed ?? []).map((row) => (
                          <Text
                            key={`${production.production_id}-${row.label}`}
                            fontSize="xs"
                            color={mutedColor}>
                            {production.production_name} ·{' '}
                            {findingLabel(intl, row as ReadinessFinding)} ·{' '}
                            {intl.formatMessage({ id: 'certifierReview.status.notAssessed' })}
                          </Text>
                        ))
                      )}
                    </VStack>
                  )}
                </Box>
              )}
            </VStack>
            <Divider />
          </>
        )}

        <StandardButton leftIcon={<FaDownload />} onClick={handleDownload} isLoading={building}>
          {intl.formatMessage({
            id: 'certifierReview.download',
            defaultMessage: 'Download audit dossier (PDF)'
          })}
        </StandardButton>

        {building && (
          <Box w="full" role="status" aria-live="polite">
            <Text fontSize="sm" color={textColor} mb={2}>
              {(() => {
                const p = describeProgress(buildJob);
                if (p.total > 0 && p.current >= p.total) {
                  return intl.formatMessage({
                    id: 'certifierReview.progressLayout',
                    defaultMessage: 'Laying out the pages…'
                  });
                }
                if (p.total > 0 && p.current > 0) {
                  return intl.formatMessage(
                    {
                      id: 'certifierReview.progressProduction',
                      defaultMessage: 'Production {current} of {total}'
                    },
                    { current: p.current, total: p.total }
                  );
                }
                return intl.formatMessage({
                  id: 'certifierReview.preparing',
                  defaultMessage: 'Preparing the dossier from the operation’s current records…'
                });
              })()}
            </Text>
            <Progress
              size="sm"
              colorScheme="green"
              borderRadius="full"
              isIndeterminate={describeProgress(buildJob).fraction === null}
              value={(describeProgress(buildJob).fraction ?? 0) * 100}
            />
          </Box>
        )}

        {buildError && (
          <Alert status={buildError === 'timeout' ? 'warning' : 'error'}>
            <AlertIcon />
            <Text fontSize="sm">
              {buildError === 'timeout'
                ? intl.formatMessage({
                    id: 'certifierReview.buildTimeout',
                    defaultMessage:
                      'This is taking longer than expected. Reload the page to try again.'
                  })
                : intl.formatMessage({
                    id: 'certifierReview.buildFailed',
                    defaultMessage:
                      'The dossier could not be generated right now. Please try again shortly.'
                  })}
            </Text>
          </Alert>
        )}

        <Text fontSize="xs" color="gray.500">
          {intl.formatMessage(
            {
              id: 'certifierReview.freshness',
              defaultMessage:
                'Built from the operation’s current records; a new copy is generated whenever the records change. This link expires {date}.'
            },
            { date: formatDateFromTimestamp(meta.expires_at) }
          )}
        </Text>
      </VStack>
    </Center>
  );
};

export default CertifierReview;
