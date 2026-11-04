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
 * 2026-11-04 layout: built on `StandardNotice` (it was a hand-rolled cream Box with an orange
 * bar and a top-right toggle that squeezed the text on a phone).
 * Collapsed it shows the title, the inputs by name and date, and the action that clears the
 * finding. The explanation, the CFR cite and the per-finding reasons sit behind "Show details".
 *
 * Props:
 *   events: array of any shape that may include { id, date, drift_warning }.
 *   cfrReference: overrides the displayed CFR cite (default: 7 CFR 205.400(f)(1)).
 */

import React, { useMemo } from 'react';
import { Badge, Box, Flex, Icon, Link, Text, useColorModeValue, VStack } from '@chakra-ui/react';
import { FaExternalLinkAlt } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { StandardButton, StandardNotice } from 'components/Design/StandardComponents';
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

// How the input was matched is a FACT about the lookup, so the catalogue matches and the
// no-match case read neutral: "unresolved" means unconfirmed, and unknown is not prohibited (it
// was red). Urgency colour is kept for the seed findings that do carry it. These are the
// theme's semantic Badge variants; the old `yellow`/`orange` colorSchemes are not Trazo palettes.
const RESOLUTION_BADGE_VARIANT: Record<DriftWarning['resolved_via'], string> = {
  omri: 'neutral',
  wsda: 'neutral',
  national_list: 'neutral',
  unresolved: 'neutral',
  seed_certification_missing: 'warning',
  seed_search_incomplete: 'warning',
  seed_treated_prohibited: 'danger'
};

const DriftFindingsBanner: React.FC<DriftFindingsBannerProps> = ({ events }) => {
  const intl = useIntl();
  // The identity panel lives in the materials module of the plan; the banner is rendered under
  // the farm route, so the farm id is in the URL. No id, no link (the copy still names the panel).
  const { farmId } = useParams<{ farmId?: string }>();
  const identityPanelHref = farmId
    ? `/admin/dashboard/farm/${farmId}/osp/module/materials_application#logged-names`
    : null;

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
    // Recordkeeping review F-01 (2026-10-07): the detector stores the closest listing it found
    // (`possibleMatches`); the row used to say "did not match any product … in the reference
    // catalogs" and drop it. Name it, and say it is not confirmed as the same product.
    const candidates = Array.isArray(params.possibleMatches)
      ? (params.possibleMatches as string[])
      : [];
    if (code === 'unresolved' && !dw.provisional && candidates.length > 0) {
      const candidateId = 'drift.reason.unresolved_candidate';
      if ((intl.messages as Record<string, unknown>)[candidateId]) {
        return intl.formatMessage(
          { id: candidateId },
          { input: String(params.input ?? dw.input_label ?? ''), candidates: candidates.join('; ') }
        );
      }
    }
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

  const labelFg = useColorModeValue('gray.600', 'gray.400');
  const reasonFg = useColorModeValue('gray.700', 'gray.300');
  const ruleColor = useColorModeValue('gray.100', 'gray.700');

  const findings = useMemo(() => {
    if (!Array.isArray(events)) return [] as EventLike[];
    return events.filter((e) => e && e.drift_warning);
  }, [events]);

  if (findings.length === 0) return null;

  // Only when EVERY finding is provisional. One filed-plan finding in the set means a real
  // § 205.400(f)(2) obligation is present, and the whole banner keeps the warning register —
  // softening it would bury the one that matters.
  //
  // ⛔ A PROVISIONAL set gets the INFO register, not the warning one. `.claude/rules/frontend.md`:
  // status colour = meaning, never decoration. A first-renewal grower is WRITING their plan;
  // every material they log before adding it to the draft is an ordinary step in that work, not
  // a fault. Painting it amber tells the cohort least able to judge severity that they are
  // failing, and the predictable response is to stop logging, which costs them the records the
  // plan is made from.
  const allProvisional = findings.every((e) => e.drift_warning?.provisional === true);

  // The event date, as the page prints every other date ("May 20, 2026"), not the raw ISO
  // slice. UTC, because the stored value is a UTC instant and `slice(0, 10)` (what this used to
  // print) is its UTC calendar day: a local-zone format would move a midnight record a day back.
  const formatDay = (raw?: string) => {
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
    return intl.formatDate(d, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  };

  // Collapsed, the banner names WHICH inputs (the thing the grower has to act on), not a
  // paragraph about how name matching works. Grouped by input: the same jug logged on three
  // days is ONE thing to confirm on the plan, and listing it three times read as three problems.
  // The title counts the same unit, so "2 inputs" sits over two rows. Three rows is what fits a
  // phone without pushing the record off screen; the details list every record.
  const groups: Array<{ label: string; records: EventLike[] }> = [];
  findings.forEach((event) => {
    const label = (event.drift_warning as DriftWarning).input_label || '—';
    const key = label.trim().toLowerCase();
    const found = groups.find((g) => g.label.trim().toLowerCase() === key);
    if (found) found.records.push(event);
    else groups.push({ label, records: [event] });
  });
  const inputCount = groups.length;
  const SUMMARY_LIMIT = 3;
  const summary = groups.slice(0, SUMMARY_LIMIT);
  const hiddenCount = inputCount - summary.length;

  return (
    <StandardNotice
      status={allProvisional ? 'info' : 'warning'}
      title={intl.formatMessage(
        { id: allProvisional ? 'drift.banner.provisional.title' : 'drift.banner.title' },
        { count: inputCount }
      )}
      mb={{ base: 4, md: 6 }}
      showDetailsLabel={intl.formatMessage({ id: 'drift.banner.show' })}
      hideDetailsLabel={intl.formatMessage({ id: 'drift.banner.hide' })}
      action={
        // The action that CLEARS the finding leads. It used to sit at the bottom of the
        // expanded section as a small link, while the top-right button only toggled text.
        !allProvisional && identityPanelHref ? (
          <StandardButton
            size="sm"
            variant="primary"
            as={RouterLink}
            {...({ to: identityPanelHref } as Record<string, string>)}
            data-testid="drift-confirm-identities-link">
            {intl.formatMessage({ id: 'drift.banner.confirmLink' })}
          </StandardButton>
        ) : undefined
      }
      details={
        /* ONE surface. The details used to nest a white card per finding inside the amber
           box, then a blue info alert inside that, then yellow badges: four grounds and three
           hues for one finding. Now the rows sit on the notice itself, split by a hairline. */
        <VStack align="stretch" spacing={0} w="full">
          <Text fontSize="sm" pb={3}>
            {intl.formatMessage({
              id: allProvisional ? 'drift.banner.provisional.body' : 'drift.banner.body'
            })}
          </Text>
          {findings.map((event, idx) => {
            const dw = event.drift_warning as DriftWarning;
            const resolutionKey = RESOLUTION_LABEL_KEY[dw.resolved_via];
            const day = formatDay(event.date);
            return (
              <Box
                key={event.id ?? idx}
                py={3}
                borderTopWidth="1px"
                borderColor={ruleColor}
                data-testid="drift-finding-row">
                <Text fontSize="sm" fontWeight="semibold" noOfLines={2}>
                  {dw.input_label || '—'}
                </Text>
                <Text fontSize="xs" color={labelFg}>
                  {intl.formatMessage({ id: 'drift.detail.date' })}: {day ?? '—'}
                </Text>
                <Text fontSize="sm" color={reasonFg} mt={1}>
                  {localizedReason(dw)}
                </Text>
                <Flex gap={2} wrap="wrap" align="center" mt={2}>
                  <Text fontSize="xs" color={labelFg}>
                    {intl.formatMessage({ id: 'drift.detail.resolution' })}
                  </Text>
                  <Badge variant={RESOLUTION_BADGE_VARIANT[dw.resolved_via] ?? 'neutral'}>
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
                      fontWeight="semibold"
                      // green.700, the app's link token: blue is reserved for Alert status="info"
                      // (frontend.md), and this link no longer sits inside one.
                      color="green.700"
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
                </Flex>
              </Box>
            );
          })}
          {!allProvisional && (
            <Text fontSize="sm" pt={3} borderTopWidth="1px" borderColor={ruleColor}>
              {intl.formatMessage({ id: 'drift.banner.nextStep' })}
            </Text>
          )}
        </VStack>
      }>
      <Box as="ul" listStyleType="none" m={0} p={0} w="full" data-testid="drift-summary">
        {summary.map((group) => {
          // One record: its date. Several: how many, since a run of dates says less than the
          // count and would not fit. The name truncates, never the date or the count.
          const meta =
            group.records.length === 1
              ? formatDay(group.records[0].date)
              : intl.formatMessage({ id: 'drift.banner.records' }, { count: group.records.length });
          return (
            <Flex as="li" key={group.label} fontSize="sm" gap={1} minW={0}>
              <Text as="span" fontWeight="medium" color="gray.700" noOfLines={1} minW={0}>
                {group.label}
              </Text>
              {meta && (
                <Text as="span" color={labelFg} flexShrink={0} whiteSpace="nowrap">
                  {'· '}
                  {meta}
                </Text>
              )}
            </Flex>
          );
        })}
        {hiddenCount > 0 && (
          <Text as="li" fontSize="sm" color={labelFg}>
            {intl.formatMessage({ id: 'drift.banner.more' }, { count: hiddenCount })}
          </Text>
        )}
      </Box>
    </StandardNotice>
  );
};

export default DriftFindingsBanner;
