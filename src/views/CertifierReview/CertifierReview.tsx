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
  Spinner,
  Text,
  VStack,
  useColorModeValue
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
import { formatDateOnly } from 'utils/dateOnly';

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
  status: 'FAIL' | 'REVIEW';
  detail: string;
  section_hint: string | null;
}

interface ReadinessProduction {
  production_id: number;
  production_name: string;
  finish_date: string | null;
  findings: ReadinessFinding[];
}

interface ReadinessResponse {
  productions: ReadinessProduction[];
  total_findings: number;
  total_productions: number;
}

// This page is read by a CERTIFIER. `period_start` / `period_end` are DateFields arriving as
// "2025-01-01", and `new Date("2025-01-01")` is UTC midnight in JS, so the review window was
// shown as starting Dec 31, 2024. The dossier PDF linked from this same page prints the
// correct day, so the two disagreed in front of the certifier.
const formatDate = (value?: string | null) => formatDateOnly(value) ?? null;

function findingStyle(status: ReadinessFinding['status']) {
  return status === 'FAIL'
    ? { colorScheme: 'red', icon: FaExclamationCircle, iconColor: 'red.500' }
    : { colorScheme: 'orange', icon: FaInfoCircle, iconColor: 'orange.400' };
}

const CertifierReview: React.FC = () => {
  const intl = useIntl();
  const { token } = useParams<{ token: string }>();
  const [meta, setMeta] = useState<ReviewMetadata | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

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
    const metaRequest = fetch(`${apiRoot}/certifier-review/${token}/`).then((res) => {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    });
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
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiRoot, token]);

  const handleDownload = useCallback(() => {
    window.location.href = `${apiRoot}/certifier-review/${token}/dossier/`;
  }, [apiRoot, token]);

  if (loading) {
    return (
      <Center minH="60vh">
        <Spinner size="lg" color="green.700" />
      </Center>
    );
  }

  if (notFound || !meta) {
    return (
      <Center minH="60vh" px={4}>
        <Alert status="warning" maxW="lg">
          <AlertIcon />
          <Box>
            <Text fontWeight="semibold">
              {intl.formatMessage({
                id: 'certifierReview.unavailable.title',
                defaultMessage: 'This link is no longer available'
              })}
            </Text>
            <Text fontSize="sm">
              {/* Expired and revoked are deliberately indistinguishable here — the
                  farmer can tell them apart on their own dashboard, an anonymous
                  visitor should not be able to. */}
              {intl.formatMessage({
                id: 'certifierReview.unavailable.body',
                defaultMessage:
                  'It may have expired or been withdrawn. Ask the operation for a new link.'
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

              {productionsWithFindings.length === 0 ? (
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
                            borderLeftColor={`${style.colorScheme}.400`}
                            borderRadius="md"
                            p={3}>
                            <HStack spacing={2} align="start">
                              <Icon
                                as={style.icon}
                                color={style.iconColor}
                                boxSize={4}
                                mt={0.5}
                                flexShrink={0}
                              />
                              <VStack align="start" spacing={1} flex={1} minW={0}>
                                <HStack spacing={2} flexWrap="wrap">
                                  <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                                    {finding.label}
                                  </Text>
                                  <Badge
                                    colorScheme={style.colorScheme}
                                    variant="subtle"
                                    fontSize="xs"
                                    borderRadius="full">
                                    {finding.status}
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

              {/* Same posture as the farmer-facing readiness card: Trazo documents, the
                  certifying agent decides. Not optional. */}
              <Text fontSize="xs" color={mutedColor}>
                {intl.formatMessage({
                  id: 'certifierReview.readinessDisclaimer',
                  defaultMessage:
                    'These are documentation checks on the records in Trazo, not a compliance decision.'
                })}
              </Text>
            </VStack>
            <Divider />
          </>
        )}

        <StandardButton leftIcon={<FaDownload />} onClick={handleDownload}>
          {intl.formatMessage({
            id: 'certifierReview.download',
            defaultMessage: 'Download audit dossier (PDF)'
          })}
        </StandardButton>

        <Text fontSize="xs" color="gray.500">
          {intl.formatMessage(
            {
              id: 'certifierReview.freshness',
              defaultMessage:
                'Generated from the operation’s current records each time it is downloaded. This link expires {date}.'
            },
            { date: formatDate(meta.expires_at) }
          )}
        </Text>
      </VStack>
    </Center>
  );
};

export default CertifierReview;
