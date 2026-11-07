/**
 * "Check before you save": the last thing the farmer reads in the activity wizard, right above
 * Save (2026-11-07).
 *
 * The wizard used to end on the photo upload, so the last screen before a record went into the
 * certifier file was a dropzone. A record is signed by the person who saves it (7 CFR
 * 205.201(a)), it prints in the packet, and once its season is finished it changes only by a
 * correction with a reason, so the farmer reads it whole once before it is kept.
 *
 * The details are drawn by the same registry the saved record's detail view uses
 * (`useEventFields` + `RegistryFieldRenderer`), from the values just entered, so this list and
 * the record afterwards cannot disagree. The fields a shopper would get carry the same
 * buyer-page mark (`buyerVisibleFieldNames`, the consumer pipeline's own rules).
 *
 * Not a fourth step: it shares the photo step, so logging costs no extra tap.
 */
import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Box, Flex, Text, VStack } from '@chakra-ui/react';
import {
  FaCalendarAlt,
  FaLock,
  FaMapMarkerAlt,
  FaPen,
  FaStickyNote,
  FaTasks,
  FaUser
} from 'react-icons/fa';

import { StandardButton } from 'components/Design/StandardComponents';
import { FieldList, InfoRow } from 'components/Design/ProfileField';
import { RegistryFieldRenderer } from 'components/Events/RegistryFieldRenderer';
import { useEventFields } from 'hooks/useEventFields';
import { subtypeOf } from 'config/events/narrative';
import { buyerVisibleFieldNames } from 'utils/buyerPageVisibility';

interface Props {
  eventType: number;
  /** The values entered on the details step, in the record's own field names. */
  record: Record<string, unknown>;
  activityLabel: string;
  dateLabel: string;
  doneBy?: string;
  parcelsLabel: string;
  photoCount: number;
  /** Go back to a step to change something (0: activity and date, 1: details). */
  onChange: (step: number) => void;
}

const ChangeWord = () => {
  const intl = useIntl();
  return <>{intl.formatMessage({ id: 'events.review.changeShort', defaultMessage: 'Change' })}</>;
};

// Drawn in their own rows above the registry's list, so the registry must not repeat them.
const DRAWN_ABOVE = new Set(['performed_by', 'name', 'observation', 'private_note']);

const SectionHead = ({
  title,
  changeLabel,
  onChange
}: {
  title: string;
  changeLabel: string;
  onChange: () => void;
}) => (
  <Flex justify="space-between" align="center" gap={3} mb={2}>
    <Text fontSize="sm" fontWeight="semibold" color="gray.800">
      {title}
    </Text>
    <StandardButton size="sm" variant="ghost" onClick={onChange} aria-label={changeLabel}>
      <ChangeWord />
    </StandardButton>
  </Flex>
);

export default function ActivityReview({
  eventType,
  record,
  activityLabel,
  dateLabel,
  doneBy,
  parcelsLabel,
  photoCount,
  onChange
}: Props) {
  const intl = useIntl();
  const event = useMemo(() => ({ ...record, event_type: eventType }), [record, eventType]);
  const subtype = subtypeOf(event);
  const { fields, hasFields } = useEventFields({
    eventType: eventType as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subtype: subtype as any,
    surface: 'modal',
    event
  });
  const buyerVisible = useMemo(
    () => buyerVisibleFieldNames(eventType, subtype, event),
    [eventType, subtype, event]
  );

  // The registry leaves the record's name and notes out (the detail view shows them as its title
  // and its own notes block), and "Done by" is already in the first section. Drawn here instead.
  const text = (key: string) =>
    typeof record[key] === 'string' ? (record[key] as string).trim() : '';
  const name = text('name');
  const publicNote = text('observation');
  const privateNote = text('private_note');
  const registryFields = useMemo(() => {
    const drop = (list: typeof fields.hero) =>
      list.filter((f: { name: string }) => !DRAWN_ABOVE.has(f.name));
    return {
      ...fields,
      hero: drop(fields.hero),
      immediate: drop(fields.immediate),
      secondary: drop(fields.secondary),
      details: drop(fields.details)
    };
  }, [fields]);
  const registryHasFields =
    hasFields &&
    registryFields.hero.length +
      registryFields.immediate.length +
      registryFields.secondary.length +
      registryFields.details.length >
      0;
  const buyerPageLabel = intl.formatMessage({ id: 'producer.event.buyerPageBadge' });

  const change = (section: string) =>
    intl.formatMessage(
      { id: 'events.review.change', defaultMessage: 'Change: {section}' },
      { section }
    );
  const activityTitle = intl.formatMessage({
    id: 'events.wizard.step.basic',
    defaultMessage: 'Activity and date'
  });
  const detailsTitle = intl.formatMessage({
    id: 'events.wizard.step.details',
    defaultMessage: 'Details'
  });

  return (
    <Box as="section" aria-labelledby="activity-review-title">
      <Text id="activity-review-title" fontSize="md" fontWeight="semibold" color="gray.800" mb={1}>
        {intl.formatMessage({ id: 'events.review.title', defaultMessage: 'Check before you save' })}
      </Text>
      <Text fontSize="sm" color="gray.600" mb={4}>
        {intl.formatMessage({
          id: 'events.review.body',
          defaultMessage:
            'This is the record your certifier will read. Fields marked for the buyer page also show on the lot’s public page.'
        })}
      </Text>

      <VStack align="stretch" spacing={5}>
        <Box>
          <SectionHead
            title={activityTitle}
            changeLabel={change(activityTitle)}
            onChange={() => onChange(0)}
          />
          <FieldList>
            <InfoRow
              icon={FaTasks}
              layout="inline"
              label={intl.formatMessage({
                id: 'events.review.activity',
                defaultMessage: 'Activity'
              })}
              value={activityLabel}
            />
            <InfoRow
              icon={FaCalendarAlt}
              layout="inline"
              label={intl.formatMessage({ id: 'app.eventDateTime' })}
              value={dateLabel}
            />
            <InfoRow
              icon={FaUser}
              layout="inline"
              label={intl.formatMessage({ id: 'events.wizard.performedBy' })}
              value={
                doneBy ||
                intl.formatMessage({ id: 'events.review.notGiven', defaultMessage: 'Not given' })
              }
            />
            <InfoRow
              icon={FaMapMarkerAlt}
              layout="inline"
              label={intl.formatMessage({ id: 'events.review.parcels', defaultMessage: 'Parcels' })}
              value={parcelsLabel}
            />
          </FieldList>
        </Box>

        <Box>
          <SectionHead
            title={detailsTitle}
            changeLabel={change(detailsTitle)}
            onChange={() => onChange(1)}
          />
          {name || publicNote || privateNote ? (
            <FieldList>
              {name && (
                <InfoRow
                  icon={FaPen}
                  layout="inline"
                  label={intl.formatMessage({ id: 'app.name' })}
                  value={name}
                />
              )}
              {publicNote && (
                <InfoRow
                  icon={FaStickyNote}
                  layout="inline"
                  label={intl.formatMessage({ id: 'events.common.fields.observation' })}
                  value={publicNote}
                  isPublic={buyerVisible.has('observation')}
                  publicLabel={buyerPageLabel}
                />
              )}
              {privateNote && (
                <InfoRow
                  icon={FaLock}
                  layout="inline"
                  label={intl.formatMessage({ id: 'events.common.fields.privateNote' })}
                  value={privateNote}
                />
              )}
            </FieldList>
          ) : null}
          {registryHasFields ? (
            <Box mt={4}>
              <RegistryFieldRenderer
                fields={registryFields}
                variant="modal"
                cardBg="gray.50"
                buyerVisibleFields={buyerVisible}
              />
            </Box>
          ) : !name && !publicNote && !privateNote ? (
            <Text fontSize="sm" color="gray.600">
              {intl.formatMessage({
                id: 'events.review.noDetails',
                defaultMessage: 'No details entered.'
              })}
            </Text>
          ) : null}
        </Box>

        <Text fontSize="sm" color="gray.700">
          {intl.formatMessage(
            {
              id: 'events.review.photos',
              defaultMessage:
                '{count, plural, =0 {No photos} one {# photo} other {# photos}} attached.'
            },
            { count: photoCount }
          )}
        </Text>
      </VStack>
    </Box>
  );
}
