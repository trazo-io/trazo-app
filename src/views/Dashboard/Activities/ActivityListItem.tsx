/**
 * ActivityListItem — one activity row, as a button.
 *
 * The same card shape serves the list view below `md` AND the day sheet the calendar opens
 * when a day holds more activities than a cell can show. It is one component rather than two
 * copies because those two surfaces answer the same question ("what happened, where?") and
 * would otherwise drift the moment either gets a new field.
 *
 * `as="button"` is not decoration: a `<Box onClick>` is invisible to the keyboard, and the
 * calendar chips shipped exactly that way.
 */
import React from 'react';
import { Badge, Box, HStack, Text } from '@chakra-ui/react';
import type { IntlShape } from 'react-intl';

import { activitySummary, activityTitle } from 'config/events/narrative';
import type { ActivityRow } from 'store/api/activityFeedApi';

// Moved to `config/events/eventTypeAppearance` so `EventDetailsModal` can share it without a
// shared component importing out of a route folder. Re-exported because this file's two
// existing consumers (index.tsx, and this component) already name it here.
export { TYPE_BADGE } from 'config/events/eventTypeAppearance';
import { TYPE_BADGE } from 'config/events/eventTypeAppearance';

interface ActivityListItemProps {
  row: ActivityRow;
  intl: IntlShape;
  onClick: () => void;
  /** Off inside a day sheet, where every row shares the heading's date. */
  showDate?: boolean;
}

export const ActivityListItem: React.FC<ActivityListItemProps> = ({
  row,
  intl,
  onClick,
  showDate = true
}) => {
  const summary = activitySummary(row, intl) || row.description;
  const title = activityTitle(row, intl);

  return (
    <Box
      as="button"
      type="button"
      textAlign="left"
      onClick={onClick}
      w="100%"
      minH="44px"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      p={3}
      _hover={{ bg: 'green.50', borderColor: 'green.200' }}
      _active={{ bg: 'green.50' }}>
      {/* Without a date the badge leads the row instead of floating against the right edge
          with a column of empty space beside it. */}
      <HStack justify={showDate ? 'space-between' : 'flex-start'} align="center" spacing={3} mb={1}>
        {showDate ? (
          <Text fontSize="xs" color="gray.600" whiteSpace="nowrap">
            {row.date?.slice(0, 10) ?? '—'}
          </Text>
        ) : null}
        <Badge variant={TYPE_BADGE[row.event_type]} fontSize="11px">
          {intl.formatMessage({ id: `activities.type.${row.event_type}` })}
        </Badge>
      </HStack>
      <Text fontSize="sm" fontWeight="medium" color="gray.700">
        {title}
      </Text>
      {summary ? (
        <Text fontSize="xs" color="gray.600" noOfLines={2} mt={0.5}>
          {summary}
        </Text>
      ) : null}
      {row.parcel_name ? (
        <Text fontSize="xs" color="gray.500" mt={1.5}>
          {row.parcel_name}
        </Text>
      ) : null}
    </Box>
  );
};

export default ActivityListItem;
