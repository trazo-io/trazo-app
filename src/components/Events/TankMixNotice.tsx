/**
 * "One tank, N products" on a record that is one product of a tank mix.
 *
 * Each product of a tank is its own record (trazo-back `history/services/tank_mix.py`), edited and
 * corrected on its own. Without this a grower opening one cannot tell it shared a tank, and an
 * edit to it can be taken for an edit to the whole tank. The detail names the tank's other
 * products on the same parcel; the edit form says the change is this product's only, and where
 * the pass's fuel is recorded when it is on another line.
 *
 * Reads the event detail (`tank_mix`, trazo-back `EventViewSet.retrieve`) through the same cached
 * query as ApplicationGroupNotice. Renders nothing outside a tank.
 */
import React from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import { StandardAlert } from 'components/Design/StandardComponents';
import { useGetEventQuery } from 'store/api/historyApi';
import type { RootState } from 'store/index';

export interface TankMixLine {
  id: number;
  line: number;
  role: 'product' | 'adjuvant' | '';
  commercial_name: string;
}

export interface TankMixDetail {
  group: string;
  line: number;
  role: 'product' | 'adjuvant' | '';
  carries_pass: boolean;
  pass_line: number | null;
  lines: TankMixLine[];
}

export interface TankMixNoticeProps {
  farmId: string | number | undefined;
  eventId: string | number | undefined;
  eventType: string | number | undefined;
  /** `detail`: the tank's other products. `edit`: what saving here changes. */
  variant: 'detail' | 'edit';
}

/** "Kocide 3000-O, Dyne-Amic (adjuvant)": the other lines, as the records name them. */
export const tankLineNames = (lines: TankMixLine[], intl: ReturnType<typeof useIntl>): string =>
  lines
    .map((line) => {
      const name =
        line.commercial_name.trim() ||
        intl.formatMessage({ id: 'events.tankMix.unnamedLine' }, { line: line.line });
      return line.role === 'adjuvant'
        ? intl.formatMessage({ id: 'events.tankMix.adjuvantName' }, { name })
        : name;
    })
    .join(', ');

export const TankMixNotice = ({ farmId, eventId, eventType, variant }: TankMixNoticeProps) => {
  const intl = useIntl();
  const companyId = useSelector((s: RootState) => s.company.currentCompany?.id);
  const { data } = useGetEventQuery(
    { companyId, farmId, eventId: String(eventId ?? ''), eventType },
    { skip: !companyId || !farmId || !eventId || eventType == null || eventType === '' }
  );
  const tank = (data as { tank_mix?: TankMixDetail | null } | undefined)?.tank_mix;
  if (!tank) return null;

  const names = tankLineNames(tank.lines, intl);
  const carrier = tank.lines.find((line) => line.line === tank.pass_line);
  const passElsewhere =
    !tank.carries_pass && tank.pass_line != null
      ? intl.formatMessage(
          { id: 'events.tankMix.passElsewhere' },
          {
            product:
              carrier?.commercial_name.trim() ||
              intl.formatMessage({ id: 'events.tankMix.unnamedLine' }, { line: tank.pass_line }),
            line: tank.pass_line
          }
        )
      : '';
  const body = intl.formatMessage(
    {
      id:
        tank.lines.length === 0
          ? 'events.tankMix.aloneBody'
          : variant === 'edit'
          ? 'events.tankMix.editBody'
          : 'events.tankMix.detailBody'
    },
    { names, line: tank.line }
  );
  return (
    <StandardAlert
      status="info"
      title={intl.formatMessage({ id: 'events.tankMix.title' }, { count: tank.lines.length + 1 })}
      description={passElsewhere ? `${body} ${passElsewhere}` : body}
    />
  );
};

export default TankMixNotice;
