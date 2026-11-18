/**
 * "This photo looks like a stock image" on the record whose photo the Vision check flagged.
 *
 * Reads `photo_content_flag` from the record's DETAIL (trazo-back
 * `EventViewSet._with_photo_content_flag`; the key is present only when a photo is flagged)
 * through the cached query ApplicationGroupNotice and TankMixNotice already make, so the sheet
 * shows it whichever list opened the record. Until 2026-11-17 the sheet read it from the list row:
 * the Production Profile's season payload carried it for members, but the parcel timeline and the
 * Activities feed did not, so opened from those the warning never showed. The verdict stays off
 * the shared season payload a signed-in shopper can read.
 *
 * A warning row, like every other finding on the sheet (#416). Renders nothing for a clean photo.
 */
import React from 'react';
import { Text } from '@chakra-ui/react';
import { MdWarning } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import { StatusRow } from 'components/Design/StandardComponents';
import { useGetEventQuery } from 'store/api/historyApi';
import type { RootState } from 'store/index';

export type PhotoContentFlag = 'not_agricultural' | 'ai_generated' | 'stock_photo';

const TITLE_ID: Record<PhotoContentFlag, string> = {
  ai_generated: 'event.photoFlag.aiGenerated',
  stock_photo: 'event.photoFlag.stockPhoto',
  not_agricultural: 'event.photoFlag.notAgricultural'
};

export interface PhotoFlagNoticeProps {
  farmId: string | number | undefined;
  eventId: string | number | undefined;
  eventType: string | number | undefined;
}

export const PhotoFlagNotice = ({ farmId, eventId, eventType }: PhotoFlagNoticeProps) => {
  const intl = useIntl();
  const companyId = useSelector((s: RootState) => s.company.currentCompany?.id);
  const { data } = useGetEventQuery(
    { companyId, farmId, eventId: String(eventId ?? ''), eventType },
    { skip: !companyId || !farmId || !eventId || eventType == null || eventType === '' }
  );
  const flag = (data as { photo_content_flag?: PhotoContentFlag | null } | undefined)
    ?.photo_content_flag;
  if (!flag || !(flag in TITLE_ID)) return null;

  return (
    <StatusRow
      tone="warn"
      icon={MdWarning}
      title={intl.formatMessage({ id: TITLE_ID[flag] })}
      testId="record-notice-photo-flag">
      <Text fontSize="sm" color="gray.600">
        {intl.formatMessage({ id: 'event.photoFlag.replaceWithFieldPhoto' })}
      </Text>
    </StatusRow>
  );
};

export default PhotoFlagNotice;
