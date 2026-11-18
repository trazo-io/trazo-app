/**
 * "Picked sooner than the interval" on the record itself, after the save toast has closed.
 *
 * Until 2026-11-17 a pick logged 40 days after raw manure on a 120-day crop was named once, in a
 * toast, and then nowhere: its detail and its timeline row read like any other pick
 * (recordkeeping checklist run 2026-11-16, VID-03). PHI conflicts had the same gap.
 *
 * Reads `manure_conflicts` and `phi_conflicts` from the record's detail (trazo-back
 * `EventViewSet._with_harvest_intervals`) through the cached query the other detail notices
 * use. The server computes them on every read and stores nothing, so a corrected date clears
 * this. Shown on the pick and on the manure or spray record it pairs with. Renders nothing when
 * there is no conflict.
 *
 * Rows, not boxes (2026-11-17): one warn StatusRow per kind, returned bare so they sit in the
 * sheet's `record-notices` StatusList with its hairlines. The facts stay open; the rule and what
 * to do fold behind a link. Drawn first as two StandardAlert boxes with the regulation always
 * open, two of which filled a phone screen before the record began; Oscar picked this row from
 * rendered options.
 */
import React from 'react';
import { Text } from '@chakra-ui/react';
import { MdWarning } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import { StatusRow } from 'components/Design/StandardComponents';
import { useGetEventQuery } from 'store/api/historyApi';
import type { RootState } from 'store/index';
import {
  manureConflictLine,
  phiConflictLine,
  type ManureConflict,
  type PhiConflict
} from 'utils/harvestIntervalConflicts';

export interface HarvestIntervalNoticeProps {
  farmId: string | number | undefined;
  eventId: string | number | undefined;
  eventType: string | number | undefined;
}

export const HarvestIntervalNotice = ({
  farmId,
  eventId,
  eventType
}: HarvestIntervalNoticeProps) => {
  const intl = useIntl();
  const companyId = useSelector((s: RootState) => s.company.currentCompany?.id);
  const { data } = useGetEventQuery(
    { companyId, farmId, eventId: String(eventId ?? ''), eventType },
    { skip: !companyId || !farmId || !eventId || eventType == null || eventType === '' }
  );
  const detail = data as
    | { manure_conflicts?: ManureConflict[]; phi_conflicts?: PhiConflict[] }
    | undefined;
  const manure = Array.isArray(detail?.manure_conflicts) ? detail.manure_conflicts : [];
  const phi = Array.isArray(detail?.phi_conflicts) ? detail.phi_conflicts : [];
  if (manure.length === 0 && phi.length === 0) return null;

  const why = {
    showDetailsLabel: intl.formatMessage({ id: 'harvestInterval.showWhy' }),
    hideDetailsLabel: intl.formatMessage({ id: 'harvestInterval.hideWhy' })
  };
  return (
    <>
      {manure.length > 0 && (
        <StatusRow
          tone="warn"
          icon={MdWarning}
          title={intl.formatMessage({ id: 'harvestInterval.manure.title' })}
          details={intl.formatMessage({ id: 'harvestInterval.manure.body' })}
          {...why}
          testId="harvest-interval-manure">
          {manure.map((c) => (
            <Text key={`m-${c.application_id}-${c.pick_id}`} fontSize="sm" color="gray.600">
              {manureConflictLine(c, intl)}
            </Text>
          ))}
        </StatusRow>
      )}
      {phi.length > 0 && (
        <StatusRow
          tone="warn"
          icon={MdWarning}
          title={intl.formatMessage({ id: 'harvestInterval.phi.title' })}
          details={intl.formatMessage({ id: 'harvestInterval.phi.body' })}
          {...why}
          testId="harvest-interval-phi">
          {phi.map((c) => (
            <Text key={`p-${c.application_id}-${c.pick_id}`} fontSize="sm" color="gray.600">
              {phiConflictLine(c, intl)}
            </Text>
          ))}
        </StatusRow>
      )}
    </>
  );
};

export default HarvestIntervalNotice;
