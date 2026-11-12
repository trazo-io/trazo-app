/**
 * One way to list activities (2026-11-06): month groups along a thin rule, one line per activity.
 *
 * Used by the parcel page's current season (SeasonActivityList) and the Activities list. Each row:
 * date and time, the category glyph in its wayfinding hue (categoryTone, palette B: no red or
 * orange), the title, then one muted line of context. Colour is never the only signal: the glyph
 * and the category word ride with it.
 */
import React from 'react';
import { Box, Circle, Flex, Icon, Text, VStack } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import { iconForActivity } from 'config/activityVerbs';
import { eventTypeTone } from 'components/Events/categoryTone';
import { StatusList } from 'components/Design/StandardComponents';
import { formatDateFromTimestamp, formatWallClockTime } from 'utils/dateOnly';

interface RowProps {
  date: string | null | undefined;
  eventType: number;
  /** The record's own subtype: picks the activity's icon (drop, box, scissors...). */
  subtype?: string | null;
  title: string;
  /** One muted line under the title: parcel, first line of the notes. */
  meta?: string;
  /**
   * The operator stated the source record shows no clock time (a spray's `time_not_recorded`).
   * The stored noon is a placeholder, so the row says so instead of printing it.
   */
  timeNotRecorded?: boolean;
  onClick: () => void;
}

export function ActivityTimelineRow({
  date,
  eventType,
  subtype,
  title,
  meta,
  timeNotRecorded = false,
  onClick
}: RowProps) {
  const intl = useIntl();
  const tone = eventTypeTone(eventType);
  return (
    <Flex
      as="button"
      type="button"
      onClick={onClick}
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
      data-testid="activity-timeline-row">
      {/* 64px: the widest time either locale prints at 12px is 62px ("05:30 a.m."). At 52px
          "AM" wrapped to a third line on every row (2026-11-11). */}
      <Box w="64px" flexShrink={0} pt={0.5}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.700" whiteSpace="nowrap">
          {formatDateFromTimestamp(date, intl.locale, { day: 'numeric', month: 'short' }) || '—'}
        </Text>
        {timeNotRecorded ? (
          <Text
            fontSize="xs"
            color="gray.600"
            whiteSpace="nowrap"
            title={intl.formatMessage({ id: 'events.time.notOnSourceRecord' })}
            aria-label={intl.formatMessage({ id: 'events.time.notOnSourceRecord' })}
            data-testid="activity-time-not-recorded">
            {intl.formatMessage({ id: 'events.time.notOnSourceRecordShort' })}
          </Text>
        ) : (
          <Text fontSize="xs" color="gray.600" whiteSpace="nowrap">
            {formatWallClockTime(date, intl.locale) || ''}
          </Text>
        )}
      </Box>
      <Circle size="28px" bg={tone.circle} flexShrink={0} mt={0.5}>
        <Icon
          as={iconForActivity(eventType, subtype)}
          boxSize={3.5}
          color={tone.glyph}
          aria-hidden
        />
      </Circle>
      <Box minW={0} flex={1}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.700" noOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text fontSize="xs" color="gray.600" noOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </Box>
    </Flex>
  );
}

interface MonthTimelineProps<T> {
  /** Already in the order to show (newest first). */
  items: T[];
  dateOf: (item: T) => string | null | undefined;
  keyOf: (item: T) => string;
  renderRow: (item: T) => React.ReactNode;
}

export function MonthTimeline<T>({ items, dateOf, keyOf, renderRow }: MonthTimelineProps<T>) {
  const intl = useIntl();
  const groups: Array<{ key: string; label: string; items: T[] }> = [];
  items.forEach((item) => {
    const d = dateOf(item);
    const key = String(d ?? '').slice(0, 7) || 'undated';
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = {
        key,
        label:
          formatDateFromTimestamp(d, intl.locale, { month: 'long', year: 'numeric' }) ||
          // A row with no date (ActivityRow.date is nullable) groups under a translated heading,
          // never the raw key (review of #294).
          intl.formatMessage({ id: 'activities.undated' }),
        items: []
      };
      groups.push(g);
    }
    g.items.push(item);
  });
  return (
    <VStack align="stretch" spacing={4} data-testid="activity-timeline">
      {groups.map((g) => (
        <Box key={g.key} data-testid="activity-timeline-month">
          <Text fontSize="xs" fontWeight="bold" color="gray.600" textTransform="uppercase" mb={1}>
            {g.label}
          </Text>
          <Box borderLeftWidth="2px" borderColor="gray.200" pl={4} ml={1}>
            <StatusList>
              {g.items.map((item) => (
                <React.Fragment key={keyOf(item)}>{renderRow(item)}</React.Fragment>
              ))}
            </StatusList>
          </Box>
        </Box>
      ))}
    </VStack>
  );
}
