/**
 * "Ready for your certifier" — the farm dashboard headline.
 *
 * Shows what a certifier would query, at BOTH levels, in one count:
 *
 *   1. OPERATION blockers/warnings — `OperationReadinessService` (7 CFR 205.201 OSP content,
 *      the fraud-prevention plan, whether any records exist). These gate certifier sharing.
 *   2. SEASON findings — `AuditExportService.compliance_snapshot_rows()` for the most recent
 *      season, the same rows page 1 of the NOP audit PDF prints.
 *
 * The two levels were previously rendered by two different cards on two different pages:
 * this one on the farm dashboard (which read "3") and `OperationReadinessPanel` on the farm
 * profile (which read "1 to fix"). Same farm, same day, two numbers, and nothing on either
 * page explained that they were counting different things. That is the same defect as the
 * transparency score appearing five times with two different values — a farmer who notices
 * stops trusting every number in the product, including these, which are the ones that matter.
 * One card, one count, both scopes labelled.
 *
 * Why this leads the dashboard rather than the transparency score: the score is Trazo's own
 * completeness metric, measured against a baseline Trazo authored, with no external deadline
 * and no audience outside its own page. An outstanding § 205.406 filing has both. As of
 * 2026-08-04 the score is not on the farm dashboard at all; it lives at
 * /admin/dashboard/farm/:farmId/transparency.
 *
 * Deliberately NOT a compliance verdict — every string says what is missing from the RECORD.
 * The certifying agent decides compliance; wording here must never imply Trazo does.
 *
 * `compact` (added 2026-08-04, for the /transparency page reframe): header + count + the single
 * highest-priority open item + a link back to this same card on farm home. Deliberately does NOT
 * duplicate the full findings list, the close-out links or the disclaimer — two independent
 * partial copies of the same list is exactly the "two cards, two counts" defect this card was
 * built to remove. One full render of the truth (farm home), one pointer to it.
 */
import React from 'react';
import { useIntl } from 'react-intl';
import { Link as RouterLink } from 'react-router-dom';

import {
  Badge,
  Box,
  Divider,
  Heading,
  HStack,
  Icon,
  Link,
  Skeleton,
  Text,
  VStack,
  useColorModeValue
} from '@chakra-ui/react';
import { FaClipboardCheck, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import {
  CertifierReadinessFinding,
  useGetCertifierReadinessQuery
} from 'store/api/dashboardMetricsApi';
import { useGetOperationReadinessQuery, type ReadinessItem } from 'store/api/certifierLinkApi';

const MAX_VISIBLE_FINDINGS = 5;

/** FAIL = a required record appears missing; REVIEW = present but needs attention. */
function statusStyle(status: CertifierReadinessFinding['status']) {
  return status === 'FAIL'
    ? { colorScheme: 'red', icon: FaExclamationCircle, iconColor: 'red.500' }
    : { colorScheme: 'orange', icon: FaInfoCircle, iconColor: 'orange.400' };
}

export default function CertifierReadinessCard({
  companyId,
  farmId,
  compact = false
}: {
  companyId: number | string;
  farmId: number;
  /** Header + count + top item + a link to the full card on farm home. See file header. */
  compact?: boolean;
}) {
  const intl = useIntl();
  const titleColor = useColorModeValue('green.600', 'green.400');
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const rowBg = useColorModeValue('gray.50', 'gray.700');
  const rowBorder = useColorModeValue('gray.200', 'gray.600');
  const clearBg = useColorModeValue('green.50', 'green.900');
  const clearBorder = useColorModeValue('green.200', 'green.700');

  const { data, isLoading, isError } = useGetCertifierReadinessQuery(
    { companyId, farmId },
    { skip: !companyId || !farmId }
  );

  // Operation-level readiness. Non-blocking on purpose: if this endpoint fails or the
  // operation is not NOP-scoped (`applicable === false`, e.g. a conventional farm), the card
  // still renders the season findings rather than disappearing.
  const { data: operation, isLoading: operationLoading } = useGetOperationReadinessQuery(
    { companyId: String(companyId), farmId: String(farmId) },
    { skip: !companyId || !farmId }
  );

  const operationItems: ReadinessItem[] =
    operation?.applicable ? [...operation.blockers, ...operation.warnings] : [];
  const hasOperationBlockers = Boolean(operation?.applicable && operation.blockers.length > 0);

  // Same rule as ConsumerEngagementRoiCard: the dashboard must not break if this endpoint fails —
  // render nothing rather than an error box in the headline slot.
  //
  // Qualified on the operation items (2026-08-04): `isError` refers only to the SEASON query, and
  // since this card absorbed operation readiness, a bare `if (isError) return null` would hide
  // live blockers — "your OSP has no content", which gates certifier sharing — just because the
  // per-season endpoint happened to fail. Only go silent when there is genuinely nothing to say.
  if (isError && operationItems.length === 0) return null;

  // Wait for BOTH scopes before rendering. The headline count and the empty state are both
  // computed from the two together, so showing the card as soon as the season query lands
  // paints a wrong answer and then corrects it: a farm whose only outstanding items are
  // operation blockers would flash "Start a production to see what your certifier will ask
  // for" — the opposite of the truth — before the blockers arrive. RTK clears isLoading on
  // error too, so a failing operation endpoint cannot wedge this.
  if (isLoading || operationLoading) {
    return (
      <Card>
        <CardBody>
          <Box w="100%">
            <Skeleton height="22px" width="260px" mb={2} />
            <Skeleton height="14px" width="180px" mb={compact ? 0 : 4} />
            {!compact && (
              <VStack spacing={2} align="stretch">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} height="52px" borderRadius="md" />
                ))}
              </VStack>
            )}
          </Box>
        </CardBody>
      </Card>
    );
  }

  const findings = data?.production ? data.findings || [] : [];
  const visible = findings.slice(0, MAX_VISIBLE_FINDINGS);
  const hidden = findings.length - visible.length;

  // ONE number, both scopes. Operation blockers used to be counted on a different page.
  const totalOpen = operationItems.length + findings.length;

  // No season yet AND nothing outstanding at the operation level — the checks have nothing to
  // run against. Say so rather than implying a clean bill of health.
  if (!data?.production && operationItems.length === 0) {
    return (
      <Card>
        <CardBody>
          <HStack spacing={3} align="start" w="100%">
            <Icon as={FaClipboardCheck} color={titleColor} boxSize={5} mt={1} />
            <VStack align="start" spacing={0}>
              <Heading as="h3" size="sm" color={titleColor}>
                {intl.formatMessage({ id: 'certifierReadiness.title' })}
              </Heading>
              <Text fontSize="sm" color={mutedColor}>
                {intl.formatMessage({ id: 'certifierReadiness.noProduction' })}
              </Text>
            </VStack>
          </HStack>
        </CardBody>
      </Card>
    );
  }

  if (compact) {
    // Priority for the single item shown: an operation blocker/warning outranks any season
    // finding (it gates certifier sharing outright — see the file header); among season findings,
    // a FAIL outranks a REVIEW, since `compliance_snapshot_rows()` emits them in check order, not
    // severity order.
    // Resolved into plain strings up front — deliberately not left as a
    // `ReadinessItem | CertifierReadinessFinding` union carried into the render, which is
    // reachable through two differently-shaped, differently-named status fields
    // ('blocker'|'warning'|'ok' vs 'FAIL'|'REVIEW') and gives TypeScript's narrowing nothing
    // reliable to discriminate on.
    const topOperationItem: ReadinessItem | undefined = operationItems[0];
    const topFinding: CertifierReadinessFinding | undefined =
      findings.find((f) => f.status === 'FAIL') ?? findings[0];

    const topLabel = topOperationItem?.title ?? topFinding?.label ?? null;
    const topIsUrgent = topOperationItem
      ? topOperationItem.status === 'blocker'
      : topFinding?.status === 'FAIL';

    return (
      <Card>
        <CardBody>
          <VStack align="stretch" spacing={3} w="100%">
            <HStack spacing={3} align="start">
              <Icon as={FaClipboardCheck} color={titleColor} boxSize={5} mt={1} />
              <VStack align="start" spacing={0} flex={1}>
                <Heading as="h3" size="sm" color={titleColor}>
                  {intl.formatMessage({ id: 'certifierReadiness.title' })}
                </Heading>
              </VStack>
              <Text fontSize="xl" fontWeight="bold" color={totalOpen ? 'orange.500' : titleColor}>
                {totalOpen}
              </Text>
            </HStack>

            {topLabel ? (
              <Box
                bg={rowBg}
                border="1px solid"
                borderColor={rowBorder}
                borderLeft="4px solid"
                borderLeftColor={topIsUrgent ? 'red.400' : 'orange.400'}
                borderRadius="md"
                p={3}
              >
                <HStack spacing={2} align="start">
                  <Icon
                    as={topIsUrgent ? FaExclamationCircle : FaInfoCircle}
                    color={topIsUrgent ? 'red.500' : 'orange.400'}
                    boxSize={4}
                    mt={0.5}
                    flexShrink={0}
                  />
                  <Text fontSize="sm" fontWeight="semibold" color={textColor} noOfLines={2}>
                    {topLabel}
                  </Text>
                </HStack>
              </Box>
            ) : (
              <Text fontSize="sm" fontWeight="semibold" color={titleColor}>
                {intl.formatMessage({ id: 'certifierReadiness.allClearTitle' })}
              </Text>
            )}

            <Link
              as={RouterLink}
              to={`/admin/dashboard/farm/${farmId}`}
              fontSize="xs"
              fontWeight="semibold"
              color={titleColor}
            >
              {intl.formatMessage({
                id:
                  totalOpen > 1
                    ? 'certifierReadiness.viewAllItems'
                    : 'certifierReadiness.viewOnFarmHome'
              })}
            </Link>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <VStack align="stretch" spacing={4} w="100%">
          <HStack spacing={3} align="start">
            <Icon as={FaClipboardCheck} color={titleColor} boxSize={5} mt={1} />
            <VStack align="start" spacing={0} flex={1}>
              <Heading as="h3" size="sm" color={titleColor}>
                {intl.formatMessage({ id: 'certifierReadiness.title' })}
              </Heading>
              {data?.production && (
                <Text fontSize="xs" color={mutedColor}>
                  {intl.formatMessage(
                    { id: 'certifierReadiness.subtitle' },
                    {
                      season:
                        data.production.name ||
                        intl.formatMessage({ id: 'certifierReadiness.untitledSeason' }),
                      checked: data.checked_count
                    }
                  )}
                </Text>
              )}
            </VStack>
            <Text fontSize="2xl" fontWeight="bold" color={totalOpen ? 'orange.500' : titleColor}>
              {totalOpen}
            </Text>
          </HStack>

          {/* OPERATION scope first — these block certifier sharing outright, so they outrank
              anything found in a single season. Each carries its own concrete fix. */}
          {operationItems.length > 0 && (
            <VStack align="stretch" spacing={2}>
              <HStack spacing={2}>
                <Text fontSize="xs" fontWeight="bold" color={mutedColor} textTransform="uppercase">
                  {intl.formatMessage({ id: 'certifierReadiness.operationScope' })}
                </Text>
                {hasOperationBlockers && (
                  <Badge colorScheme="red" variant="subtle" fontSize="xs" borderRadius="full">
                    {intl.formatMessage({ id: 'certifierReadiness.sharingBlocked' })}
                  </Badge>
                )}
              </HStack>
              {operationItems.map((item) => (
                <Box
                  key={item.key}
                  bg={rowBg}
                  border="1px solid"
                  borderColor={rowBorder}
                  borderLeft="4px solid"
                  borderLeftColor={item.status === 'blocker' ? 'red.400' : 'orange.400'}
                  borderRadius="md"
                  p={3}
                >
                  <HStack spacing={2} align="start">
                    <Icon
                      as={item.status === 'blocker' ? FaExclamationCircle : FaInfoCircle}
                      color={item.status === 'blocker' ? 'red.500' : 'orange.400'}
                      boxSize={4}
                      mt={0.5}
                      flexShrink={0}
                    />
                    <VStack align="start" spacing={1} flex={1} minW={0}>
                      <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                        {item.title}
                      </Text>
                      {item.detail && (
                        <Text fontSize="xs" color={mutedColor} lineHeight="1.5">
                          {item.detail}
                        </Text>
                      )}
                      {item.fix && (
                        <Text fontSize="xs" color="green.700" fontWeight="medium">
                          {item.fix}
                        </Text>
                      )}
                    </VStack>
                  </HStack>
                </Box>
              ))}
            </VStack>
          )}

          {/* Scope label whenever both scopes are on screen — not only when the season also has
              findings, otherwise a clean season under a blocked operation reads as unlabelled. */}
          {data?.production && operationItems.length > 0 && (
            <Text fontSize="xs" fontWeight="bold" color={mutedColor} textTransform="uppercase">
              {intl.formatMessage({ id: 'certifierReadiness.seasonScope' })}
            </Text>
          )}

          {/* The green "Nothing outstanding" panel requires BOTH scopes clear (`totalOpen === 0`).
              Gating it on `findings.length` alone put a reassuring green box directly beneath a red
              "a certifier will not accept this operation until these are resolved" — the card
              contradicting itself, which is the exact defect this consolidation set out to remove.
              A clean season under a blocked operation gets a plain line instead. */}
          {!data?.production ? null : findings.length === 0 ? (
            totalOpen === 0 ? (
              <Box bg={clearBg} border="1px solid" borderColor={clearBorder} borderRadius="lg" p={4}>
                <Text fontSize="sm" fontWeight="semibold" color={titleColor}>
                  {intl.formatMessage({ id: 'certifierReadiness.allClearTitle' })}
                </Text>
                <Text fontSize="xs" color={mutedColor} mt={1}>
                  {intl.formatMessage(
                    { id: 'certifierReadiness.allClearHelp' },
                    { checked: data.checked_count }
                  )}
                </Text>
              </Box>
            ) : (
              <Text fontSize="xs" color={mutedColor}>
                {intl.formatMessage(
                  { id: 'certifierReadiness.seasonClear' },
                  { checked: data.checked_count }
                )}
              </Text>
            )
          ) : (
            <VStack align="stretch" spacing={2} divider={<Divider borderColor={rowBorder} />}>
              {visible.map((finding) => {
                const style = statusStyle(finding.status);
                return (
                  <Box
                    key={finding.label}
                    bg={rowBg}
                    border="1px solid"
                    borderColor={rowBorder}
                    borderLeft="4px solid"
                    borderLeftColor={`${style.colorScheme}.400`}
                    borderRadius="md"
                    p={3}
                  >
                    <HStack spacing={2} align="start">
                      <Icon as={style.icon} color={style.iconColor} boxSize={4} mt={0.5} flexShrink={0} />
                      <VStack align="start" spacing={1} flex={1} minW={0}>
                        <HStack spacing={2} flexWrap="wrap">
                          <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                            {finding.label}
                          </Text>
                          <Badge
                            colorScheme={style.colorScheme}
                            variant="subtle"
                            fontSize="xs"
                            borderRadius="full"
                          >
                            {intl.formatMessage({
                              id:
                                finding.status === 'FAIL'
                                  ? 'certifierReadiness.statusMissing'
                                  : 'certifierReadiness.statusNeedsAttention'
                            })}
                          </Badge>
                        </HStack>
                        <Text fontSize="xs" color={mutedColor} lineHeight="1.5">
                          {finding.detail}
                        </Text>
                        {finding.section_hint && (
                          <Text fontSize="xs" color={mutedColor} fontStyle="italic">
                            {intl.formatMessage(
                              { id: 'certifierReadiness.seeSection' },
                              { section: finding.section_hint }
                            )}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                  </Box>
                );
              })}
              {hidden > 0 && (
                <Text fontSize="xs" color={mutedColor}>
                  {intl.formatMessage({ id: 'certifierReadiness.moreItems' }, { count: hidden })}
                </Text>
              )}
            </VStack>
          )}

          {/* Season close-out path. The three steps a grower takes in the postharvest window —
              review what is outstanding, send the certifier a link / generate the operation
              dossier, file the § 205.406 annual update — each already had a page, and none of
              them linked to the next. A farmer had to know the product's information
              architecture to walk their own annual cycle. These are links to existing screens,
              not new surfaces. */}
          <HStack spacing={4} flexWrap="wrap" pt={1}>
            <Link
              as={RouterLink}
              to={`/admin/dashboard/farm/${farmId}/profile`}
              fontSize="xs"
              fontWeight="semibold"
              color={titleColor}
            >
              {intl.formatMessage({ id: 'certifierReadiness.shareAndDossier' })}
            </Link>
            <Link
              as={RouterLink}
              to={`/admin/dashboard/farm/${farmId}/osp`}
              fontSize="xs"
              fontWeight="semibold"
              color={titleColor}
            >
              {intl.formatMessage({ id: 'certifierReadiness.goToOsp' })}
            </Link>
          </HStack>

          {/* Trazo documents; the certifying agent decides. This line is not optional. */}
          <Text fontSize="xs" color={mutedColor}>
            {intl.formatMessage({ id: 'certifierReadiness.disclaimer' })}
          </Text>
        </VStack>
      </CardBody>
    </Card>
  );
}
