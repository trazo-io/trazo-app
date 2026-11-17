/**
 * "One application on N parcels" on a record that belongs to one.
 *
 * An activity logged on several parcels is one record per parcel sharing an
 * `application_group`. Each record stands alone (its own area, amounts and edits), so without
 * this a grower opening one cannot tell the others exist, and an edit to it can be taken for an
 * edit to all. The record detail names the other parcels; the edit form says the change applies
 * to this parcel only.
 *
 * Reads the event detail (`group_records`, trazo-back `EventViewSet.retrieve`) through the same
 * cached query the Activities page and the edit form already make, so the parcel timeline, which
 * opens the record from list data, gets it too. Renders nothing for a single-parcel record.
 *
 * Two shapes (2026-11-17). On the record (`detail`) it is a neutral StatusRow: the activity sheet
 * opens on one list of facts and findings about the record, rows with hairlines, never a stack of
 * tinted boxes. In the edit form it stays a StandardAlert, the form's own message.
 */
import React from 'react';
import { Text } from '@chakra-ui/react';
import { MdInfo } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import { StandardAlert, StatusRow } from 'components/Design/StandardComponents';
import { useGetEventQuery } from 'store/api/historyApi';
import type { RootState } from 'store/index';

interface GroupRecord {
  id: number;
  parcel: number;
  parcel_name: string;
}

export interface ApplicationGroupNoticeProps {
  farmId: string | number | undefined;
  eventId: string | number | undefined;
  eventType: string | number | undefined;
  /** This record's parcel, named in the detail sentence. */
  parcelName?: string;
  /** `detail`: where else it was applied. `edit`: what saving here changes. */
  variant: 'detail' | 'edit';
}

export const ApplicationGroupNotice = ({
  farmId,
  eventId,
  eventType,
  parcelName,
  variant
}: ApplicationGroupNoticeProps) => {
  const intl = useIntl();
  const companyId = useSelector((s: RootState) => s.company.currentCompany?.id);
  const { data } = useGetEventQuery(
    { companyId, farmId, eventId: String(eventId ?? ''), eventType },
    { skip: !companyId || !farmId || !eventId || eventType == null || eventType === '' }
  );
  const others: GroupRecord[] =
    (data as { group_records?: GroupRecord[] } | undefined)?.group_records ?? [];
  if (others.length === 0) return null;

  const names = others.map((record) => record.parcel_name).join(', ');
  const title = intl.formatMessage({ id: 'events.group.title' }, { count: others.length + 1 });
  const body = intl.formatMessage(
    { id: variant === 'edit' ? 'events.group.editBody' : 'events.group.detailBody' },
    { names, parcel: parcelName ?? '' }
  );
  if (variant === 'detail') {
    return (
      <StatusRow tone="neutral" icon={MdInfo} title={title} testId="record-notice-group">
        <Text fontSize="sm" color="gray.600">
          {body}
        </Text>
      </StatusRow>
    );
  }
  return <StandardAlert status="info" title={title} description={body} />;
};

export default ApplicationGroupNotice;
