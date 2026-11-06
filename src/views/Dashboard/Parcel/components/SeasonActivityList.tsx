/**
 * The current season's activities on the parcel page: a month timeline, newest first
 * (2026-11-06).
 *
 * Replaces the EnhancedTimelineRow cards: a bordered box per activity with a 40px icon ring, two
 * chips, a description, an "Area covered" block and a carbon line, inside a 450px scroll box, so
 * about two activities were visible and the rest sat behind a second scrollbar.
 *
 * Rows and month groups come from components/Events/ActivityTimeline, shared with the Activities
 * list. The latest six show; "See all N activities" opens the Activities page filtered to this
 * parcel. Carbon and field details live in the detail modal the row opens.
 */
import React, { useMemo } from 'react';
import { Link, VStack } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useIntl } from 'react-intl';

import { ActivityTimelineRow, MonthTimeline } from 'components/Events/ActivityTimeline';
import { TOUCH_TARGET } from 'components/Design/StandardComponents';
import { getTimelineEventTitle } from 'utils/eventDescriptions';

export interface SeasonEvent {
  id: number;
  event_type: number;
  date: string;
  description?: string | null;
  [key: string]: unknown;
}

interface Props {
  events: SeasonEvent[];
  onOpen: (event: SeasonEvent) => void;
  /** The Activities page, filtered to this parcel: where the whole season lives. */
  allActivitiesPath: string;
  /** How many of the latest to show here. */
  initial?: number;
}

const firstLine = (text?: string | null) => (text ? text.split('\n')[0].trim() : '');

export default function SeasonActivityList({
  events,
  onOpen,
  allActivitiesPath,
  initial = 6
}: Props) {
  const intl = useIntl();

  const sorted = useMemo(
    () => [...events].sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [events]
  );
  // A summary, not the whole season: the latest few here, everything on the Activities page
  // (search, filters, calendar). Expanding in place grew the card to ~6,500px at 100
  // activities and pushed "Log activity" off the screen; an inner scroll box hid them instead.
  const visible = sorted.slice(0, initial);

  return (
    <VStack align="stretch" spacing={4}>
      <MonthTimeline
        items={visible}
        dateOf={(e) => e.date}
        // Type AND id: each of the eight event models numbers its own rows, so a weather and a
        // soil event can share an id in one month (review of #291; Activities keys the same way).
        keyOf={(e) => `${e.event_type}-${e.id}`}
        renderRow={(e) => (
          <ActivityTimelineRow
            date={e.date}
            eventType={e.event_type}
            title={getTimelineEventTitle(e, intl)}
            subtype={typeof e.type === 'string' ? e.type : null}
            meta={firstLine(e.description)}
            onClick={() => onOpen(e)}
          />
        )}
      />
      {sorted.length > initial && (
        <Link
          as={RouterLink}
          to={allActivitiesPath}
          alignSelf="flex-start"
          fontSize="sm"
          fontWeight="semibold"
          color="green.700"
          sx={{ '@media (hover: hover)': { '&:hover': { textDecoration: 'underline' } } }}
          {...TOUCH_TARGET}>
          {intl.formatMessage({ id: 'parcelPage.activities.seeAll' }, { count: sorted.length })}{' '}
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </VStack>
  );
}
