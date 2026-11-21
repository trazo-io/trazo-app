/**
 * "Check before you save": the last thing the farmer reads in the activity wizard, right above
 * Save (2026-11-07).
 *
 * The wizard used to end on the photo upload, so the last screen before a record went into the
 * certifier file was a dropzone. A record is signed by the person who saves it (7 CFR
 * 205.201(a)), it prints in the packet, and once its season is finished it changes only by a
 * correction with a reason, so the farmer reads it whole once before it is kept.
 *
 * The details come from the same registry the saved record's detail view uses (`useEventFields`,
 * the same fields, labels and formatted values), from the values just entered, so this list and
 * the record afterwards cannot disagree. They are drawn as inline rows (`RegistryRows`), the
 * product name first. The fields a shopper would get carry the buyer-page mark
 * (`buyerVisibleFieldNames`, the consumer pipeline's own rules).
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
import { RegistryRows } from 'components/Events/RegistryFieldRenderer';
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
  /**
   * What the save writes beyond this record's own fields, drawn at the end of Details: a spray's
   * other tank products and each parcel's amounts (SprayReview). The registry reads one record's
   * values, so without this a tank of three on three blocks was reviewed as one product.
   */
  children?: React.ReactNode;
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
  onChange,
  children
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
  // The main fields, product name included: the record's detail view shows the product as its
  // title, so its renderer leaves `commercial_name` out, and the review has no title. A spray's
  // review without the product named was the one thing the certifier reads first, missing.
  const primaryRows = hasFields ? [...registryFields.hero, ...registryFields.immediate] : [];
  const additionalTitle = intl.formatMessage({
    id: 'eventDetails.additionalDetails',
    defaultMessage: 'Additional Details'
  });
  const technicalTitle = intl.formatMessage({
    id: 'eventDetails.technicalDetails',
    defaultMessage: 'Technical Details'
  });

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
          {/* One list, one set of dividers: the name, the record's main fields (the product name
              first for an input), then the notes. Rows, like every profile and record page since
              the 2026-11 polish: the registry's grey boxes made a spray's review a stack of
              cards under a row-built first section (Oscar, 2026-11-07). */}
          {name || publicNote || privateNote || primaryRows.length > 0 ? (
            <FieldList>
              {name && (
                <InfoRow
                  icon={FaPen}
                  layout="inline"
                  label={intl.formatMessage({ id: 'app.name' })}
                  value={name}
                />
              )}
              <RegistryRows fields={primaryRows} buyerVisibleFields={buyerVisible} />
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
          {[
            { key: 'secondary', title: additionalTitle, rows: registryFields.secondary },
            { key: 'details', title: technicalTitle, rows: registryFields.details }
          ]
            .filter((group) => group.rows.length > 0)
            .map((group) => (
              <Box key={group.key} mt={4}>
                <Text fontSize="sm" fontWeight="semibold" color="gray.800" mb={1}>
                  {group.title}
                </Text>
                <FieldList>
                  <RegistryRows fields={group.rows} buyerVisibleFields={buyerVisible} />
                </FieldList>
              </Box>
            ))}
          {!registryHasFields && !name && !publicNote && !privateNote ? (
            <Text fontSize="sm" color="gray.600">
              {intl.formatMessage({
                id: 'events.review.noDetails',
                defaultMessage: 'No details entered.'
              })}
            </Text>
          ) : null}
          {children}
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
