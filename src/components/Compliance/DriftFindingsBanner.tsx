/**
 * DriftFindingsBanner — Sprint 5.1 (OSP ↔ events drift detector).
 *
 * Farmer-facing warning surface that summarizes drift findings for the
 * current production cycle. Renders only when one or more events on the
 * timeline carry a `drift_warning` payload (stamped by the backend
 * post_save signal in certifications/services/drift_detector.py).
 *
 * The intent is a single, collapsible, yellow banner at the top of the
 * production page — NOT per-event badges on the consumer-facing timeline
 * cards, which would leak compliance noise to QR-code viewers.
 *
 * Props:
 *   events: array of any shape that may include { id, date, drift_warning }.
 *   cfrReference: overrides the displayed CFR cite (default: 7 CFR 205.400(f)(1)).
 */

import React, { useMemo, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Collapse,
  HStack,
  Icon,
  Link,
  Stack,
  Text,
  useColorModeValue,
  VStack
} from '@chakra-ui/react';
import { FaExclamationTriangle, FaExternalLinkAlt, FaInfoCircle } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import type { DriftWarning } from 'types/standardizedEvents';

interface EventLike {
  id?: string | number;
  date?: string;
  type?: string;
  event_type?: string | number;
  drift_warning?: DriftWarning | null;
}

interface DriftFindingsBannerProps {
  events: EventLike[] | null | undefined;
}

const RESOLUTION_LABEL_KEY: Record<DriftWarning['resolved_via'], string> = {
  omri: 'drift.resolution.omri',
  national_list: 'drift.resolution.national_list',
  wsda: 'drift.resolution.wsda',
  unresolved: 'drift.resolution.unresolved',
  // Phase 2 — seed source findings (§ 205.204 / NOP 5029).
  seed_certification_missing: 'drift.resolution.seed_certification_missing',
  seed_search_incomplete: 'drift.resolution.seed_search_incomplete',
  seed_treated_prohibited: 'drift.resolution.seed_treated_prohibited'
};

const RESOLUTION_COLOR_SCHEME: Record<DriftWarning['resolved_via'], string> = {
  omri: 'yellow',
  wsda: 'yellow',
  national_list: 'yellow',
  unresolved: 'red',
  seed_certification_missing: 'orange',
  seed_search_incomplete: 'orange',
  seed_treated_prohibited: 'red'
};

const DriftFindingsBanner: React.FC<DriftFindingsBannerProps> = ({ events }) => {
  const intl = useIntl();

  /**
   * Localize a finding's reason from its stable code (2026-08-25). The backend
   * used to send only English prose, which rendered verbatim on the Spanish
   * dashboard. Codes localize; the prose stays as the fallback for legacy
   * findings (no code) and for any code this bundle does not know yet —
   * checked via intl.messages so an unknown id degrades to prose instead of
   * printing the raw key.
   */
  const localizedReason = (dw: DriftWarning): string => {
    const code = dw.reason_code;
    if (!code) return dw.reason;
    // A finding against a draft plan says the same THING and prescribes a different ACTION:
    // add it to the plan you are writing, never "notify your certifier" about a plan nobody
    // has read. Prefer the provisional wording, fall back to the filed-plan wording, then to
    // the server prose for legacy findings written before either existed.
    const provisionalId = `drift.reason.provisional.${code}`;
    const id =
      dw.provisional && (intl.messages as Record<string, unknown>)[provisionalId]
        ? provisionalId
        : `drift.reason.${code}`;
    if (!(intl.messages as Record<string, unknown>)[id]) return dw.reason;
    const params: Record<string, unknown> = { ...(dw.reason_params ?? {}) };
    if (code === 'approved_with_issues') {
      const issueCodes = Array.isArray(params.issues) ? (params.issues as string[]) : [];
      params.issues = issueCodes
        .map((issue) => {
          const issueId = `drift.reason.issue.${issue}`;
          return (intl.messages as Record<string, unknown>)[issueId]
            ? intl.formatMessage({ id: issueId }, params as Record<string, string>)
            : issue;
        })
        .join('; ');
    }
    return intl.formatMessage({ id }, params as Record<string, string>);
  };
  const [open, setOpen] = useState(false);

  // Use Chakra `yellow.*` tokens — matches the existing compliance-warning
  // palette already used by the audit export "warning" style on the backend.
  const warnBg = useColorModeValue('yellow.50', 'yellow.900');
  const warnBorder = useColorModeValue('yellow.400', 'yellow.600');
  const warnHeaderFg = useColorModeValue('yellow.800', 'yellow.100');
  // ⛔ A PROVISIONAL set gets the NEUTRAL register, not the warning one.
  //
  // `.claude/rules/frontend.md`: status colour = meaning, never decoration. Warning means
  // "something needs attention" about a filed plan. A first-renewal grower is WRITING their
  // plan; every material they log before adding it to the draft is an ordinary step in that
  // work, not a fault. Painting it amber tells the cohort least able to judge severity that
  // they are failing, and the predictable response is to stop logging — which costs them the
  // records the plan is made from. Gray, an info glyph, and copy that names the next action.
  const neutralBg = useColorModeValue('gray.50', 'gray.700');
  const neutralBorder = useColorModeValue('gray.500', 'gray.400');
  const neutralHeaderFg = useColorModeValue('gray.800', 'gray.100');
  const bodyFg = useColorModeValue('gray.700', 'gray.200');
  const detailBg = useColorModeValue('white', 'gray.800');
  const labelFg = useColorModeValue('gray.500', 'gray.400');
  const reasonFg = useColorModeValue('gray.600', 'gray.300');

  const findings = useMemo(() => {
    if (!Array.isArray(events)) return [] as EventLike[];
    return events.filter((e) => e && e.drift_warning);
  }, [events]);

  if (findings.length === 0) return null;

  const count = findings.length;
  // Only when EVERY finding is provisional. One filed-plan finding in the set means a real
  // § 205.400(f)(2) obligation is present, and the whole banner keeps the warning register —
  // softening it would bury the one that matters.
  const allProvisional = findings.every((e) => e.drift_warning?.provisional === true);
  const bg = allProvisional ? neutralBg : warnBg;
  const border = allProvisional ? neutralBorder : warnBorder;
  const headerFg = allProvisional ? neutralHeaderFg : warnHeaderFg;

  return (
    <Box
      bg={bg}
      borderTopWidth="1px"
      borderRightWidth="1px"
      borderBottomWidth="1px"
      borderLeftWidth="4px"
      borderColor={border}
      borderRadius={{ base: 'xl', md: '2xl' }}
      boxShadow="0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      p={{ base: 3, md: 4 }}
      mb={{ base: 4, md: 6 }}
      w="full">
      <HStack align="start" justify="space-between" spacing={3} flexWrap="wrap">
        <HStack align="start" spacing={3} flex={1} minW={0}>
          <Icon
            as={allProvisional ? FaInfoCircle : FaExclamationTriangle}
            color={border}
            mt={1}
            boxSize={5}
          />
          <VStack align="start" spacing={1} flex={1} minW={0}>
            <Text fontWeight="bold" fontSize="sm" color={headerFg}>
              {intl.formatMessage(
                { id: allProvisional ? 'drift.banner.provisional.title' : 'drift.banner.title' },
                { count }
              )}
            </Text>
            <Text fontSize="xs" color={bodyFg}>
              {intl.formatMessage({
                id: allProvisional ? 'drift.banner.provisional.body' : 'drift.banner.body'
              })}
            </Text>
          </VStack>
        </HStack>
        <Button
          size="sm"
          variant="outline"
          colorScheme={allProvisional ? 'gray' : 'yellow'}
          onClick={() => setOpen((v) => !v)}>
          {intl.formatMessage({
            id: open ? 'drift.banner.hide' : 'drift.banner.show'
          })}
        </Button>
      </HStack>

      <Collapse in={open} animateOpacity>
        <VStack align="stretch" spacing={2} mt={4}>
          {findings.map((event, idx) => {
            const dw = event.drift_warning as DriftWarning;
            const resolutionKey = RESOLUTION_LABEL_KEY[dw.resolved_via];
            return (
              <Box
                key={event.id ?? idx}
                p={3}
                bg={detailBg}
                borderWidth="1px"
                borderColor={border}
                borderRadius="md">
                <Stack direction={{ base: 'column', md: 'row' }} spacing={3} align="start">
                  <VStack align="start" spacing={0} minW="120px">
                    <Text fontSize="xs" color={labelFg}>
                      {intl.formatMessage({ id: 'drift.detail.date' })}
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {event.date ? event.date.slice(0, 10) : '—'}
                    </Text>
                  </VStack>
                  <VStack align="start" spacing={0} flex={1} minW={0}>
                    <Text fontSize="xs" color={labelFg}>
                      {intl.formatMessage({ id: 'drift.detail.input' })}
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold" noOfLines={2}>
                      {dw.input_label || '—'}
                    </Text>
                    <Text fontSize="xs" color={reasonFg} noOfLines={3} mt={1}>
                      {localizedReason(dw)}
                    </Text>
                  </VStack>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="xs" color={labelFg}>
                      {intl.formatMessage({ id: 'drift.detail.resolution' })}
                    </Text>
                    <Badge
                      colorScheme={RESOLUTION_COLOR_SCHEME[dw.resolved_via] ?? 'red'}
                      fontSize="11px">
                      {resolutionKey ? intl.formatMessage({ id: resolutionKey }) : dw.resolved_via}
                    </Badge>
                    {/* CA-only: CDFA OIM registration sub-finding.

                        No registration NUMBER is rendered (2026-09-06). CDFA's published
                        Registered OIM Products list has three columns — Firm, Product Name,
                        Annotations — and carries no identifier, so every `CDFA-OIM-…` value
                        Trazo held was invented. A registered row says "registered" and stops.

                        And `unknown` is not `missing`: Trazo's CDFA reference set is a small
                        slice of that list, so a product absent from it is UNCHECKED, not
                        unregistered. Legacy findings written before this change carry the old
                        `missing` default and mean the same thing, so they render the same way —
                        neutral grey, because "we did not check" is a fact, not an error. */}
                    {dw.cdfa_oim_status &&
                      (dw.cdfa_oim_status.status === 'unknown' ||
                        dw.cdfa_oim_status.status === 'missing') && (
                        <Badge colorScheme="gray" fontSize="11px">
                          {intl.formatMessage({
                            id: 'drift.resolution.cdfa_oim_unknown',
                            defaultMessage: 'CDFA OIM not checked (CA)'
                          })}
                        </Badge>
                      )}
                    {dw.cdfa_oim_status && dw.cdfa_oim_status.status === 'registered' && (
                      <Badge colorScheme="green" fontSize="11px">
                        {intl.formatMessage({
                          id: 'drift.resolution.cdfa_oim_registered',
                          defaultMessage: 'CDFA OIM registered'
                        })}
                      </Badge>
                    )}
                    {/* CA-only: DPR Restricted Materials Permit sub-finding. */}
                    {dw.ca_dpr_permit_status && dw.ca_dpr_permit_status.status === 'missing' && (
                      <Badge colorScheme="red" fontSize="11px">
                        {intl.formatMessage({ id: 'drift.resolution.ca_dpr_missing' })}
                      </Badge>
                    )}
                    {dw.ca_dpr_permit_status && dw.ca_dpr_permit_status.status === 'expired' && (
                      <Badge colorScheme="red" fontSize="11px">
                        {intl.formatMessage(
                          { id: 'drift.resolution.ca_dpr_expired' },
                          {
                            num: dw.ca_dpr_permit_status.permit_number || '—',
                            expires: dw.ca_dpr_permit_status.expires || '—'
                          }
                        )}
                      </Badge>
                    )}
                    {dw.ca_dpr_permit_status && dw.ca_dpr_permit_status.status === 'present' && (
                      <Badge colorScheme="green" fontSize="11px">
                        {intl.formatMessage(
                          { id: 'drift.resolution.ca_dpr_present' },
                          {
                            num: dw.ca_dpr_permit_status.permit_number || '—',
                            county: dw.ca_dpr_permit_status.county || '—'
                          }
                        )}
                      </Badge>
                    )}
                    {/* External catalog deep-link. OMRI for commercial
                        inputs, AOSCA Organic Seed Finder for seed findings. */}
                    {dw.omri_search_url && (
                      <Link
                        href={dw.omri_search_url}
                        isExternal
                        fontSize="xs"
                        color="blue.600"
                        mt={1}
                        display="inline-flex"
                        alignItems="center"
                        gap={1}>
                        {intl.formatMessage({
                          id: dw.resolved_via.startsWith('seed_')
                            ? 'drift.detail.searchAosca'
                            : 'drift.detail.searchOmri'
                        })}
                        <Icon as={FaExternalLinkAlt} boxSize={2.5} />
                      </Link>
                    )}
                  </VStack>
                </Stack>
              </Box>
            );
          })}
          <Alert status="info" fontSize="xs">
            <AlertIcon />
            <Text>
              {intl.formatMessage({
                id: 'drift.banner.nextStep'
              })}
            </Text>
          </Alert>
        </VStack>
      </Collapse>
    </Box>
  );
};

export default DriftFindingsBanner;
