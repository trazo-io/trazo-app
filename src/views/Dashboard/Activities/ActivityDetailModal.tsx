/**
 * ActivityDetailModal — read before edit, on the Activities surface.
 *
 * Clicking an activity used to navigate straight into the edit wizard: the only route that
 * existed for a single event was `/event/:id/change` (the read-only `/event/:id` route is
 * commented out in App.tsx). So "let me look at what I logged" dropped a grower into a form
 * that can mutate a certifier record, and cost them their place in the calendar.
 *
 * This opens the SAME `EventDetailsModal` the parcel timeline uses — one detail UI for both
 * surfaces — and leaves Edit as a deliberate button inside it.
 *
 * The feed row is deliberately thin (`ActivityRow`: no album, no per-family fields), so the
 * event is fetched by (id, type) on open. The fetch is the same one the edit wizard already
 * performs, so this adds no new endpoint.
 */
import React, { useMemo } from 'react';
import { Center, Spinner, Text, VStack } from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import { ResponsiveModal } from 'components/Design/ResponsiveModal';
import { EventDetailsModal } from 'components/Modals/EventDetailsModal';
import { useGetEventQuery } from 'store/api/historyApi';
import type { ActivityRow } from 'store/api/activityFeedApi';
import type { RootState } from 'store/index';

interface ActivityDetailModalProps {
  /** The feed row that was clicked. `null` while nothing is open. */
  row: ActivityRow | null;
  onClose: () => void;
  farmId: string;
  /** Refetch the feed — deleting an event does not invalidate the activity-feed tag. */
  onDeleted?: () => void;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  row,
  onClose,
  farmId,
  onDeleted
}) => {
  const intl = useIntl();
  const currentCompany = useSelector((s: RootState) => s.company.currentCompany);
  const companyId = currentCompany?.id != null ? String(currentCompany.id) : '';

  const { data, isFetching, isError } = useGetEventQuery(
    {
      companyId,
      farmId,
      eventId: row ? String(row.event_id) : '',
      eventType: row ? row.event_type : ''
    },
    { skip: !row || !companyId || !farmId }
  );

  const event = useMemo(() => {
    if (!row || !data) return null;
    // The retrieve endpoint answers with the per-type UPDATE serializer (history/views.py
    // `EventViewSet.retrieve`), which flattens fields for the wizard and emits no
    // `event_type`. Without it the modal falls back to guessing the family from the
    // description — so re-attach the type the feed already knows for certain.
    return {
      ...data,
      id: data.id ?? row.event_id,
      event_type: row.event_type
    };
  }, [data, row]);

  return (
    <>
      {/* Loading and error live in their own shell: EventDetailsModal renders nothing
          without an event, so without this a click would look like a dead click. */}
      <ResponsiveModal
        isOpen={!!row && !event}
        onClose={onClose}
        size="md"
        header={
          <Text fontSize="lg" fontWeight="semibold">
            {intl.formatMessage({ id: 'activities.detail.title' })}
          </Text>
        }>
        {isError || (!isFetching && !event) ? (
          <VStack py={6} spacing={2}>
            <Text fontSize="sm" color="gray.600" textAlign="center">
              {intl.formatMessage({ id: 'activities.detail.error' })}
            </Text>
          </VStack>
        ) : (
          <Center py={8}>
            <VStack spacing={3}>
              <Spinner color="green.700" />
              <Text fontSize="sm" color="gray.600">
                {intl.formatMessage({ id: 'activities.detail.loading' })}
              </Text>
            </VStack>
          </Center>
        )}
      </ResponsiveModal>

      <EventDetailsModal
        isOpen={!!row && !!event}
        onClose={onClose}
        event={event}
        // The activity feed carries `performed_by` as a name, not a member record, and this
        // route has no history to read a member list from. Passing [] hides the operator
        // line rather than inventing one.
        members={[]}
        farmId={farmId}
        parcelId={row ? String(row.parcel_id) : undefined}
        parcelName={row?.parcel_name}
        onEventDeleted={onDeleted}
      />
    </>
  );
};

export default ActivityDetailModal;
