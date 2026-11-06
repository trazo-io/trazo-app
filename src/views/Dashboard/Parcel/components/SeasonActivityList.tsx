/**
 * The current season's activities on the parcel page: a month timeline, newest first
 * (2026-11-06).
 *
 * Replaces the EnhancedTimelineRow cards: a bordered box per activity with a 40px icon ring, two
 * chips, a description, an "Area covered" block and a carbon line, inside a 450px scroll box, so
 * about two activities were visible and the rest sat behind a second scrollbar.
 *
 * Month groups along a thin rule; each activity is one line: date and time, category glyph,
 * title, then category · first line of the notes. Picked by Oscar from three renders (current
 * cards, flat rows, month timeline). The latest six show; "See all N activities" opens the
 * Activities page filtered to this parcel.
 *
 * Category colour is WAYFINDING (categoryTone, palette B: no red or orange), always paired with
 * its glyph and its word. Carbon and field details live in the detail modal the row opens.
 */
import React, { useMemo } from 'react';
import { Box, Circle, Flex, Icon, Link, Text, VStack } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useIntl } from 'react-intl';

import { TYPE_ICON } from 'config/events/eventTypeAppearance';
import { eventTypeTone } from 'components/Events/categoryTone';
import { StatusList, TOUCH_TARGET } from 'components/Design/StandardComponents';
import { formatDateFromTimestamp, formatWallClockTime } from 'utils/dateOnly';
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

  // Month groups, in order of first appearance (the list is already newest first).
  const groups = useMemo(() => {
    const out: Array<{ key: string; label: string; items: SeasonEvent[] }> = [];
    visible.forEach((e) => {
      const key = String(e.date).slice(0, 7);
      let g = out.find((x) => x.key === key);
      if (!g) {
        g = {
          key,
          label:
            formatDateFromTimestamp(e.date, intl.locale, { month: 'long', year: 'numeric' }) || key,
          items: []
        };
        out.push(g);
      }
      g.items.push(e);
    });
    return out;
  }, [visible, intl.locale]);

  const row = (e: SeasonEvent) => {
    const tone = eventTypeTone(e.event_type);
    const category = intl.formatMessage({ id: `activities.type.${e.event_type}` });
    return (
      <Flex
        key={e.id}
        as="button"
        type="button"
        onClick={() => onOpen(e)}
        w="100%"
        textAlign="left"
        gap={3}
        py={3}
        px={2}
        mx={-2}
        align="flex-start"
        borderRadius="md"
        _hover={{ bg: 'gray.50' }}
        _focusVisible={{ boxShadow: 'outline' }}
        data-testid="season-activity-row">
        <Box w="52px" flexShrink={0} pt={0.5}>
          <Text fontSize="sm" fontWeight="semibold" color="gray.700" whiteSpace="nowrap">
            {formatDateFromTimestamp(e.date, intl.locale, { day: 'numeric', month: 'short' })}
          </Text>
          <Text fontSize="xs" color="gray.600">
            {formatWallClockTime(e.date, intl.locale) || ''}
          </Text>
        </Box>
        <Circle size="28px" bg={tone.circle} flexShrink={0} mt={0.5}>
          <Icon as={TYPE_ICON[e.event_type]} boxSize={3.5} color={tone.glyph} aria-hidden />
        </Circle>
        <Box minW={0} flex={1}>
          <Text fontSize="sm" fontWeight="semibold" color="gray.700" noOfLines={1}>
            {getTimelineEventTitle(e, intl)}
          </Text>
          <Text fontSize="xs" color="gray.600" noOfLines={1}>
            {[category, firstLine(e.description)].filter(Boolean).join(' · ')}
          </Text>
        </Box>
      </Flex>
    );
  };

  return (
    <VStack align="stretch" spacing={4} data-testid="season-activity-timeline">
      {groups.map((g) => (
        <Box key={g.key} data-testid="season-activity-month">
          <Text fontSize="xs" fontWeight="bold" color="gray.600" textTransform="uppercase" mb={1}>
            {g.label}
          </Text>
          <Box borderLeftWidth="2px" borderColor="gray.200" pl={4} ml={1}>
            <StatusList>{g.items.map(row)}</StatusList>
          </Box>
        </Box>
      ))}
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
