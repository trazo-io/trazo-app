/**
 * The season's activities on the season page: the same month timeline the parcel page and the
 * Activities list use (components/Events/ActivityTimeline), newest first.
 *
 * Replaces UltraMobileProductionJourney here (2026-11-06). That component is the SHOPPER's
 * journey (category cards, a "26 Events" tile, "Transparent farming timeline"), rendered on the
 * farmer's own page as a preview. The farmer reads their record as rows; the shopper's view is
 * one click away through the public page card's Preview button, which shows the real page.
 *
 * A row opens the activity detail modal, which carries Edit on an open season and the
 * correction sheet on a closed one.
 */
import React, { useMemo, useState } from 'react';
import { HStack, Icon, Text, VStack } from '@chakra-ui/react';
import { FaPlus } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { ActivityTimelineRow, MonthTimeline } from 'components/Events/ActivityTimeline';
import { StandardButton, StandardCard, TOUCH_TARGET } from 'components/Design/StandardComponents';
import { getTimelineEventTitle } from 'utils/eventDescriptions';

export interface SeasonTimelineEvent {
  event_type?: number | string;
  record_id?: number | string;
  id?: number | string;
  date?: string;
  description?: string;
  type?: string;
  production_type?: string;
  [key: string]: unknown;
}

interface Props {
  events: SeasonTimelineEvent[];
  onOpen: (event: SeasonTimelineEvent) => void;
  /** Log a new activity against THIS season. Absent for read-only roles. */
  onLog?: () => void;
  isFinished: boolean;
  /** Shown under the header on a finished season: what can still be logged, and how. */
  finishedHint?: string;
  /** How many of the latest show before "Show all". */
  initial?: number;
}

const firstLine = (text?: unknown) =>
  typeof text === 'string' && text ? text.split('\n')[0].trim() : '';

/**
 * The season endpoints do not agree on where the title lives. Measured on the demo farm
 * (2026-11-06): a record has the farmer's `name` ("Cultivation pass 2"), or no name and a short
 * `description` with the notes in `observation` ("Carrot lift 1 of 2"), or neither, with the
 * notes copied into both. So: the name, else a description that is not just the notes again,
 * else the category title the parcel page shows ("Pest & scouting").
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const titleOf = (e: SeasonTimelineEvent, intl: any): string => {
  const name = firstLine(e.name);
  if (name) return name;
  const description = firstLine(e.description);
  if (description && description !== firstLine(e.observation)) return description;
  return getTimelineEventTitle({ ...e, name: undefined, event_type: Number(e.event_type) }, intl);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const metaOf = (e: SeasonTimelineEvent, intl: any): string => {
  const notes = firstLine(e.observation) || firstLine(e.description);
  return notes && notes !== titleOf(e, intl) ? notes : '';
};

export default function SeasonActivitiesCard({
  events,
  onOpen,
  onLog,
  isFinished,
  finishedHint,
  initial = 10
}: Props) {
  const intl = useIntl();
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(
    () => [...events].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? ''))),
    [events]
  );
  const visible = showAll ? sorted : sorted.slice(0, initial);

  const logLabel = intl.formatMessage({
    id: isFinished ? 'production.addPostHarvestActivity' : 'production.addActivity'
  });

  return (
    <StandardCard
      mb={0}
      title={intl.formatMessage({ id: 'season.activities.title', defaultMessage: 'Activities' })}
      subtitle={intl.formatMessage(
        {
          id: 'season.activities.count',
          defaultMessage: '{count, plural, one {# activity} other {# activities}}'
        },
        { count: events.length }
      )}
      headerAction={
        // Open season: the page header already leads with Log activity; a second copy here was
        // the same button twice in one viewport. A finished season's header leads with Export.
        onLog && isFinished && events.length > 0 ? (
          <StandardButton
            size="sm"
            variant="outline"
            leftIcon={<Icon as={FaPlus} />}
            onClick={onLog}>
            {logLabel}
          </StandardButton>
        ) : undefined
      }>
      {finishedHint && events.length > 0 && (
        <Text fontSize="xs" color="gray.600" mb={4} maxW="72ch">
          {finishedHint}
        </Text>
      )}
      {events.length === 0 ? (
        <VStack align="flex-start" spacing={3} py={2}>
          <Text fontSize="sm" color="gray.600">
            {intl.formatMessage({
              id: 'season.activities.empty',
              defaultMessage: 'Nothing logged on this season yet.'
            })}
          </Text>
          {onLog && (
            <StandardButton size="sm" leftIcon={<Icon as={FaPlus} />} onClick={onLog}>
              {intl.formatMessage({
                id: isFinished ? 'production.addPostHarvestActivity' : 'production.addFirstActivity'
              })}
            </StandardButton>
          )}
          {finishedHint && (
            <Text fontSize="xs" color="gray.600" maxW="72ch">
              {finishedHint}
            </Text>
          )}
        </VStack>
      ) : (
        <VStack align="stretch" spacing={4}>
          <MonthTimeline
            items={visible}
            dateOf={(e) => (e.date as string) || null}
            // Type AND id: each event model numbers its own rows (review of #291).
            keyOf={(e) => `${e.event_type}-${e.record_id ?? e.id}`}
            renderRow={(e) => (
              <ActivityTimelineRow
                date={(e.date as string) || null}
                eventType={Number(e.event_type)}
                title={titleOf(e, intl)}
                subtype={(e.production_type || e.type || null) as string | null}
                meta={metaOf(e, intl)}
                timeNotRecorded={e.time_not_recorded === true}
                onClick={() => onOpen(e)}
              />
            )}
          />
          {sorted.length > initial && (
            <HStack>
              <StandardButton
                variant="ghost"
                size="sm"
                {...TOUCH_TARGET}
                onClick={() => setShowAll((v) => !v)}>
                {showAll
                  ? intl.formatMessage({
                      id: 'season.activities.showFewer',
                      defaultMessage: 'Show fewer'
                    })
                  : intl.formatMessage(
                      { id: 'season.activities.showAll', defaultMessage: 'Show all {count}' },
                      { count: sorted.length }
                    )}
              </StandardButton>
            </HStack>
          )}
        </VStack>
      )}
    </StandardCard>
  );
}
