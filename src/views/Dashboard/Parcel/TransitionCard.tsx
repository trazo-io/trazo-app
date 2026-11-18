/**
 * The parcel's computed § 205.202(b) transition status: what the records show, never a
 * determination (eligibility is the certifying agent's call; see `transitionState`).
 *
 * Lived inside the Parcel Application wizard only, so the 36-month window and the days remaining
 * were one level down from the parcel profile, where the field history it is computed from is
 * kept (recordkeeping checklist run 2026-11-16, VID-06). Shared now by both. The completion date
 * is printed in the reader's language.
 */
import React from 'react';
import { Badge, Box, HStack, Text } from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import type { IntlShape } from 'react-intl';

import { useGetParcelTransitionStatusQuery } from 'store/api/parcelApplicationApi';
import { formatDateOnly } from 'utils/dateOnly';
import { transitionState } from './transitionState';

type Finding = { date?: string; description?: string };
type TransitionPayload = {
  note?: string;
  note_code?: string;
  last_prohibited_date?: string | null;
  unclassified?: Finding[];
  unconfirmed?: Finding[];
};

/** "Product (12 ago 2026); Other (3 sep 2026)", five at most, the rest counted. */
const namedFindings = (rows: Finding[], locale: string): string => {
  const shown = rows.slice(0, 5).map((f) => {
    const label =
      (f.description || '').split(' — ').slice(0, -1).join(' — ') || f.description || '';
    const day = f.date ? formatDateOnly(f.date, locale) ?? f.date : '';
    return day ? `${label} (${day})` : label;
  });
  const rest = rows.length - shown.length;
  return rest > 0 ? `${shown.join('; ')} (+${rest})` : shown.join('; ');
};

export const transitionNoteLines = (data: TransitionPayload, intl: IntlShape): string[] => {
  const code = data.note_code;
  if (!code) return data.note ? [data.note] : [];
  const lines: string[] = [];
  if (code === 'none_recorded') {
    lines.push(intl.formatMessage({ id: 'parcelApp.transition.note.none_recorded' }));
  } else if (code === 'elapsed') {
    lines.push(
      intl.formatMessage(
        { id: 'parcelApp.transition.note.elapsed' },
        {
          date: data.last_prohibited_date
            ? formatDateOnly(data.last_prohibited_date, intl.locale) ?? data.last_prohibited_date
            : ''
        }
      )
    );
  }
  // in_transition: the days remaining are already on the card.
  for (const kind of ['unclassified', 'unconfirmed'] as const) {
    const rows = data[kind] || [];
    if (rows.length) {
      lines.push(
        intl.formatMessage(
          { id: `parcelApp.transition.note.${kind}` },
          { count: rows.length, names: namedFindings(rows, intl.locale) }
        )
      );
    }
  }
  return lines;
};

export const TransitionCard = ({
  companyId,
  farmId,
  parcelId
}: {
  companyId: string;
  farmId: string;
  parcelId: string;
}) => {
  const intl = useIntl();
  const { data, isLoading } = useGetParcelTransitionStatusQuery({ companyId, farmId, parcelId });
  if (isLoading) return null;
  if (!data) return null;
  // 🔴 2026-08-21 — this read `data.status` and `data.earliest_organic_harvest_date`, neither
  // of which the endpoint has ever emitted (`TransitionStatus.to_dict` sends `is_eligible`,
  // `transition_complete_date`, `days_remaining`, `note`). A farm certified continuously for
  // twenty years opened its Parcel Application and saw its § 205.202(b) status rendered as a
  // bare "—". Wrong in both directions: an eligible parcel looked unassessed, and a parcel
  // genuinely in transition would have shown the same dash with no date. Read what is sent.
  const state = transitionState(data);
  const eligible = state === 'eligible';
  const completeDate = data.transition_complete_date;
  const daysRemaining = data.days_remaining;
  // The server's `note` is an English sentence; `note_code` and the two lists say the same in the
  // reader's language (VID-06/VID-07). An older payload with no code keeps its sentence.
  const noteLines = transitionNoteLines(data, intl);
  // 🔴 2026-09-30 (OSP alignment audit, T21): `is_eligible` is true by ABSENCE of a prohibited
  // record, so the badge said "Eligible" in green over a parcel with no history and no
  // declaration. It now states the record, in a neutral colour; eligibility under § 205.202(b)
  // is the certifying agent's determination, never a Trazo badge. 2026-10-01: "In transition"
  // needs a running clock (see transitionState).
  const badgeId = `parcelApp.transition.status.${state}`;
  return (
    <Box
      p={4}
      bg={eligible ? 'gray.50' : 'amber.50'}
      borderWidth="1px"
      borderColor={eligible ? 'gray.200' : 'amber.200'}
      borderRadius="md">
      <HStack justify="space-between" mb={2}>
        <Text fontWeight="semibold" fontSize="sm">
          {intl.formatMessage({ id: 'parcelApp.transition.computed' })}
        </Text>
        <Badge variant={eligible ? 'neutral' : 'warning'} fontSize="11px">
          {intl.formatMessage({ id: badgeId })}
        </Badge>
      </HStack>
      {/* The recorded completion date shows whenever the server has one, whatever the badge
          says: a date on record is a fact, and hiding it behind "Not established" lost it. */}
      {completeDate ? (
        <Text fontSize="sm" color="gray.700">
          {intl.formatMessage(
            { id: 'parcelApp.transition.earliest' },
            { date: formatDateOnly(completeDate, intl.locale) }
          )}
          {typeof daysRemaining === 'number' && daysRemaining > 0
            ? ` · ${intl.formatMessage(
                { id: 'parcelApp.transition.daysRemaining' },
                { days: daysRemaining }
              )}`
            : ''}
        </Text>
      ) : null}
      {noteLines.map((line) => (
        <Text key={line} fontSize="sm" color="gray.700">
          {line}
        </Text>
      ))}
      <Text fontSize="xs" color="gray.600" mt={1}>
        {intl.formatMessage({ id: 'parcelApp.transition.liveNote' })}
      </Text>
    </Box>
  );
};

export default TransitionCard;
