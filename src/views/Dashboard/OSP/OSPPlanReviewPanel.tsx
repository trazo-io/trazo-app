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

import React from 'react';
import { Badge, Box, HStack, Icon, List, ListItem, Skeleton, Stack, Text } from '@chakra-ui/react';
import { FaClipboardCheck } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardAlert, StandardCard } from 'components/Design/StandardComponents';
import { useGetOSPReviewQuery } from 'store/api/ospApi';
import { formatDateFromTimestamp } from 'utils/dateOnly';
interface OSPPlanReviewPanelProps {
  companyId: string | number;
  farmId: string | number;
  /** Only the id is read — the review is derived server-side. Typed as the minimum so the
   *  panel takes an `OSPSummary` from the module list as readily as a full `OSP` from the
   *  narrative view, rather than forcing a cast at one call site. */
  osp: { id: string | number };
}

const MAX_DETAILS = 6;

const OSPPlanReviewPanel: React.FC<OSPPlanReviewPanelProps> = ({ companyId, farmId, osp }) => {
  const intl = useIntl();
  const { data, isLoading, isError } = useGetOSPReviewQuery({
    companyId: String(companyId),
    farmId: String(farmId),
    ospId: osp.id
  });

  const title = intl.formatMessage({
    id: 'osp.review.title',
    defaultMessage: 'Plan review — what changed after these answers'
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

  return (
    <StandardCard
      title={title}
      titleIcon={<Icon as={FaClipboardCheck} color="green.700" />}
      headerAction={
        <Badge variant={data.is_clean ? 'solid' : 'warning'}>
          {data.is_clean
            ? intl.formatMessage({ id: 'osp.review.clean', defaultMessage: 'Nothing to revisit' })
            : intl.formatMessage(
                { id: 'osp.review.count', defaultMessage: '{count} to confirm' },
                { count: total }
              )}
        </Badge>
      }>
      <Stack spacing={4}>
        <Text fontSize="sm" color="gray.600">
          {data.answers_as_of
            ? intl.formatMessage(
                {
                  id: 'osp.review.asOf',
                  defaultMessage:
                    'The newest answer in this plan was written {date}. Everything below happened in your records after that. None of it is wrong by itself — each item is something to confirm is still described correctly, or to add to the change summary.'
                },
                // A calendar date, read in UTC so it never shifts a day; was printed raw ("2026-08-29").
                {
                  date:
                    formatDateFromTimestamp(data.answers_as_of, intl.locale) ?? data.answers_as_of
                }
              )
            : intl.formatMessage({
                id: 'osp.review.noAnswers',
                defaultMessage:
                  'This plan has no dated answers yet, so there is nothing to compare its records against.'
              })}
        </Text>

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
          <Box key={f.code} data-testid={`osp-review-${f.code}`}>
            <HStack justify="space-between" align="flex-start">
              <Text fontSize="sm" fontWeight="600">
                {/* Codes are stable; the backend message is the English fallback so an unknown
                    code still reads as a sentence rather than a key. */}
                {intl.formatMessage({
                  id: `osp.review.finding.${f.code}`,
                  defaultMessage: f.message
                })}
              </Text>
              <Badge variant="neutral">{f.count}</Badge>
            </HStack>
            {f.details.length > 0 && (
              <List spacing={0.5} mt={1} pl={3} fontSize="xs" color="gray.600">
                {f.details.slice(0, MAX_DETAILS).map((d) => (
                  <ListItem key={d}>• {d}</ListItem>
                ))}
                {f.details.length > MAX_DETAILS && (
                  <ListItem>
                    {intl.formatMessage(
                      { id: 'osp.review.more', defaultMessage: '… and {n} more' },
                      { n: f.details.length - MAX_DETAILS }
                    )}
                  </ListItem>
                )}
              </List>
            )}
          </Box>
        ))}

        {data.parcels_not_named.length > 0 && (
          <Box data-testid="osp-review-parcels-not-named">
            <Text fontSize="sm" fontWeight="600">
              {intl.formatMessage({
                id: 'osp.review.parcelsNotNamed',
                defaultMessage: 'Parcels this plan never names'
              })}
            </Text>
            <Text fontSize="xs" color="gray.600" pl={3} mt={1}>
              {data.parcels_not_named.join(', ')}
            </Text>
          </Box>
        )}

        {data.stale_modules.length > 0 && (
          <Box data-testid="osp-review-stale">
            <Text fontSize="sm" fontWeight="600">
              {intl.formatMessage({
                id: 'osp.review.staleModules',
                defaultMessage: 'Modules not revisited in the last year'
              })}
            </Text>
            <List spacing={0.5} mt={1} pl={3} fontSize="xs" color="gray.600">
              {data.stale_modules.map((m) => (
                <ListItem key={m.module_key}>
                  {intl.formatMessage(
                    {
                      id: 'osp.review.staleLine',
                      defaultMessage: '• {module} — last answered {date}'
                    },
                    {
                      module: m.module,
                      date: formatDateFromTimestamp(m.answered_at, intl.locale) ?? m.answered_at
                    }
                  )}
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Stack>
    </StandardCard>
  );
};

export default OSPPlanReviewPanel;
