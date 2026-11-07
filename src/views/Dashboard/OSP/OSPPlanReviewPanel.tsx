/**
 * Plan review — what the operation's records did AFTER this plan's answers were written.
 *
 * "Start new version" copies every answer across, and that is right: a renewal starts from
 * last year's plan. But nothing then said which of those answers the records had overtaken. A
 * pilot's renewal went to the certifier reading "our own six parcels" and "86.9 acres" with seven
 * and 96.7 on file, every section stamped eighteen months before submission; the rotation
 * narrative named a crop for a year the season records contradicted. A certifier reads that as a
 * plan nobody reviewed — and § 205.406(a)(1) asks for exactly the changes it failed to mention.
 *
 * 🔴 THE RULE THIS COMPONENT EXISTS TO HOLD
 *
 * This is a LIST, never a verdict. The backend builds it from dated records only — ground begun,
 * seasons, § 205.400(f) notices, materials, certificates, affidavits, incidents — plus two
 * interpretation-free checks (a parcel whose name appears nowhere in the plan; a module not
 * revisited in a year). It never reads the prose and never says an answer is wrong. The operator
 * may well have re-read a section and decided it still holds; so it never blocks Submit. It is
 * shown here, before the button, and printed on the packet cover, so the decision is made with
 * the list in view.
 */

import React, { useState } from 'react';
import { Badge, Box, Flex, Icon, Skeleton, Stack, Text, VStack } from '@chakra-ui/react';
import { FaClipboardCheck } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardAlert, StandardButton, StandardCard } from 'components/Design/StandardComponents';
import { useGetOSPReviewQuery } from 'store/api/ospApi';
import type { OSPReviewFinding } from 'types/osp';
import { formatDateFromTimestamp } from 'utils/dateOnly';

interface OSPPlanReviewPanelProps {
  companyId: string | number;
  farmId: string | number;
  /** Only the id is read — the review is derived server-side. Typed as the minimum so the
   *  panel takes an `OSPSummary` from the module list as readily as a full `OSP` from the
   *  narrative view, rather than forcing a cast at one call site. */
  osp: { id: string | number };
  /**
   * Where a finding is fixed. Each finding names its module (`module_key`); with these, its
   * group carries "Open Record Keeping" (2026-11-07). Without them the card said "22 to
   * confirm" and offered nothing to click: the fix was a module the card never named.
   */
  onOpenModule?: (moduleKey: string) => void;
  moduleName?: (moduleKey: string) => string | undefined;
}

/** Items shown before "Show all": enough to recognise the group, short enough to scan. */
const PREVIEW_ITEMS = 4;

/** One rule between rows, keyed on an attribute so it holds whatever each row's own props. */
const ITEM_RULE = {
  '& > [data-review-item] + [data-review-item]': {
    borderTopWidth: '1px',
    borderTopColor: 'gray.100'
  }
};

/**
 * A server detail reads "Shared equipment cleaning log — 8 equipment cleaning log entries
 * logged": the record type, then the evidence. Shown as a label and a quieter line, so the
 * name is what the eye lands on.
 */
const splitDetail = (detail: string): [string, string] => {
  const at = detail.indexOf(' — ');
  return at > 0 ? [detail.slice(0, at), detail.slice(at + 3)] : [detail, ''];
};

const FindingGroup = ({
  finding,
  onOpenModule,
  moduleName
}: {
  finding: OSPReviewFinding;
  onOpenModule?: (moduleKey: string) => void;
  moduleName?: (moduleKey: string) => string | undefined;
}) => {
  const intl = useIntl();
  const [showAll, setShowAll] = useState(false);
  const name = finding.module_key ? moduleName?.(finding.module_key) : undefined;
  const items = showAll ? finding.details : finding.details.slice(0, PREVIEW_ITEMS);

  return (
    <Box data-testid={`osp-review-${finding.code}`}>
      <Flex
        justify="space-between"
        align={{ base: 'stretch', md: 'flex-start' }}
        direction={{ base: 'column', md: 'row' }}
        gap={2}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.800">
          {/* Codes are stable; the backend message is the English fallback so an unknown
              code still reads as a sentence rather than a key. */}
          {intl.formatMessage({
            id: `osp.review.finding.${finding.code}`,
            defaultMessage: finding.message
          })}
          <Text as="span" fontWeight="normal" color="gray.600">
            {` · ${finding.count}`}
          </Text>
        </Text>
        {finding.module_key && onOpenModule && name ? (
          <StandardButton
            size="sm"
            variant="outline"
            flexShrink={0}
            alignSelf={{ base: 'flex-start', md: 'auto' }}
            onClick={() => onOpenModule(finding.module_key as string)}>
            {intl.formatMessage(
              { id: 'osp.review.openModule', defaultMessage: 'Open {module}' },
              { module: name }
            )}
          </StandardButton>
        ) : null}
      </Flex>
      {finding.details.length > 0 && (
        <VStack align="stretch" spacing={0} mt={1} sx={ITEM_RULE}>
          {items.map((detail) => {
            const [label, basis] = splitDetail(detail);
            return (
              <Box key={detail} data-review-item py={2}>
                <Text fontSize="sm" color="gray.800">
                  {label}
                </Text>
                {basis ? (
                  <Text fontSize="xs" color="gray.600">
                    {basis}
                  </Text>
                ) : null}
              </Box>
            );
          })}
        </VStack>
      )}
      {finding.details.length > PREVIEW_ITEMS ? (
        <StandardButton size="sm" variant="ghost" ml={-3} onClick={() => setShowAll((v) => !v)}>
          {showAll
            ? intl.formatMessage({ id: 'osp.review.showFewer', defaultMessage: 'Show fewer' })
            : intl.formatMessage(
                { id: 'osp.review.showAll', defaultMessage: 'Show all {count}' },
                { count: finding.details.length }
              )}
        </StandardButton>
      ) : null}
    </Box>
  );
};

const OSPPlanReviewPanel: React.FC<OSPPlanReviewPanelProps> = ({
  companyId,
  farmId,
  osp,
  onOpenModule,
  moduleName
}) => {
  const intl = useIntl();
  const { data, isLoading, isError } = useGetOSPReviewQuery({
    companyId: String(companyId),
    farmId: String(farmId),
    ospId: osp.id
  });

  // Says the job, not the mechanism. Was "Plan review — what changed after these answers".
  const title = intl.formatMessage({
    id: 'osp.review.title',
    defaultMessage: 'Check the plan against your records'
  });

  if (isLoading) {
    return (
      <StandardCard title={title} titleIcon={<Icon as={FaClipboardCheck} color="green.700" />}>
        <Skeleton height="72px" />
      </StandardCard>
    );
  }
  if (isError || !data) {
    return null;
  }

  // Items, not groups (recordkeeping review F-22, 2026-10-07): "2 to confirm" sat over two groups
  // holding 22 and 9 records. Each finding carries the count of records behind it.
  const total =
    data.findings.reduce((sum, f) => sum + Math.max(1, (f as { count?: number }).count ?? 1), 0) +
    data.stale_modules.length +
    data.parcels_not_named.length;

  // With one group, the corner badge only repeated the count in that group's heading.
  const groups =
    data.findings.length +
    (data.parcels_not_named.length > 0 ? 1 : 0) +
    (data.stale_modules.length > 0 ? 1 : 0);

  return (
    <StandardCard
      mb={0}
      title={title}
      titleIcon={<Icon as={FaClipboardCheck} color="green.700" />}
      subtitle={
        data.answers_as_of
          ? intl.formatMessage(
              {
                id: 'osp.review.asOf',
                defaultMessage:
                  'What your records show since the plan was last answered, on {date}. Each item is something to confirm or add to the plan, not a problem by itself.'
              },
              // A calendar date, read in UTC so it never shifts a day; was printed raw.
              {
                date: formatDateFromTimestamp(data.answers_as_of, intl.locale) ?? data.answers_as_of
              }
            )
          : intl.formatMessage({
              id: 'osp.review.noAnswers',
              defaultMessage:
                'This plan has no dated answers yet, so there is nothing to compare its records against.'
            })
      }
      headerAction={
        !data.is_clean && groups < 2 ? undefined : (
          // Neutral, not amber: the subtitle says none of this is a problem by itself, and an
          // amber count said the opposite. The count is how many items, nothing more.
          <Badge variant={data.is_clean ? 'solid' : 'neutral'}>
            {data.is_clean
              ? intl.formatMessage({ id: 'osp.review.clean', defaultMessage: 'Nothing to revisit' })
              : intl.formatMessage(
                  { id: 'osp.review.count', defaultMessage: '{count} to confirm' },
                  { count: total }
                )}
          </Badge>
        )
      }>
      <Stack spacing={5}>
        {data.is_clean && (
          <StandardAlert
            status="success"
            mb={0}
            description={intl.formatMessage({
              id: 'osp.review.cleanBody',
              defaultMessage: "No operation changes are recorded after the plan's newest answer."
            })}
          />
        )}

        {data.findings.map((f) => (
          <FindingGroup
            key={f.code}
            finding={f}
            onOpenModule={onOpenModule}
            moduleName={moduleName}
          />
        ))}

        {data.parcels_not_named.length > 0 && (
          <Box data-testid="osp-review-parcels-not-named">
            <Text fontSize="sm" fontWeight="semibold" color="gray.800">
              {intl.formatMessage({
                id: 'osp.review.parcelsNotNamed',
                defaultMessage: 'Parcels this plan never names'
              })}
            </Text>
            <Text fontSize="sm" color="gray.700" mt={1}>
              {data.parcels_not_named.join(', ')}
            </Text>
          </Box>
        )}

        {data.stale_modules.length > 0 && (
          <Box data-testid="osp-review-stale">
            <Text fontSize="sm" fontWeight="semibold" color="gray.800">
              {intl.formatMessage({
                id: 'osp.review.staleModules',
                defaultMessage: 'Modules not revisited in the last year'
              })}
            </Text>
            <VStack align="stretch" spacing={0} mt={1} sx={ITEM_RULE}>
              {data.stale_modules.map((m) => (
                <Flex
                  key={m.module_key}
                  data-review-item
                  py={2}
                  justify="space-between"
                  align="center"
                  gap={2}>
                  <Box>
                    <Text fontSize="sm" color="gray.800">
                      {m.module}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      {intl.formatMessage(
                        { id: 'osp.review.lastAnswered', defaultMessage: 'Last answered {date}' },
                        {
                          date: formatDateFromTimestamp(m.answered_at, intl.locale) ?? m.answered_at
                        }
                      )}
                    </Text>
                  </Box>
                  {onOpenModule ? (
                    <StandardButton
                      size="sm"
                      variant="ghost"
                      onClick={() => onOpenModule(m.module_key)}>
                      {intl.formatMessage({ id: 'osp.review.open', defaultMessage: 'Open' })}
                    </StandardButton>
                  ) : null}
                </Flex>
              ))}
            </VStack>
          </Box>
        )}
      </Stack>
    </StandardCard>
  );
};

export default OSPPlanReviewPanel;
