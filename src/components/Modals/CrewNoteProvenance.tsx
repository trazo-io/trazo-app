/**
 * "From a crew message": sender, performer and confirmer, and three times, kept apart.
 *
 * OSP alignment audit 2026-10, T29. A record confirmed from a WhatsApp crew note showed only the
 * account that saved it. This block shows what the certifier dossier prints for the same record, from
 * the same private endpoint: who sent the message and when it arrived, the message as received
 * (marked when it is a machine transcript), the performer exactly as entered or "not recorded" (never
 * the sender), who confirmed it and when, the stated occurrence, and the review state. It renders
 * nothing for a record that did not come from a message. Private: never on the buyer page.
 */
import React from 'react';
import { Box, Stack, Text } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import { useGetCrewNoteQuery } from 'store/api/crewNoteApi';

const CrewNoteProvenance = ({ eventId, eventType }: { eventId?: number; eventType?: number }) => {
  const intl = useIntl();
  const { data } = useGetCrewNoteQuery(
    { eventId: Number(eventId), eventType: Number(eventType) },
    { skip: eventId == null || eventType == null }
  );
  const note = data?.crew_note;
  if (!note) return null;

  const when = (iso: string | null) =>
    iso
      ? intl.formatDate(new Date(iso), {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      : intl.formatMessage({ id: 'crewNote.notRecorded' });

  return (
    <Box
      p={4}
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="lg"
      data-testid="crew-note-provenance">
      <Stack spacing={1}>
        <Text fontWeight="semibold">{intl.formatMessage({ id: 'crewNote.heading' })}</Text>
        <Text fontSize="sm">
          {intl.formatMessage(
            { id: note.kind === 'voice' ? 'crewNote.sentVoice' : 'crewNote.sentText' },
            {
              sender:
                note.sender.display_name || intl.formatMessage({ id: 'crewNote.unnamedSender' }),
              last4: note.sender.phone_last4,
              received: when(note.received_at)
            }
          )}
        </Text>
        <Text fontSize="sm" color="gray.700">
          {intl.formatMessage({
            id: note.words_are_transcript ? 'crewNote.wordsTranscript' : 'crewNote.wordsTyped'
          })}
        </Text>
        <Text fontSize="sm" fontStyle="italic" whiteSpace="pre-wrap">
          “{note.words}”
        </Text>
        <Text fontSize="sm">
          {intl.formatMessage({ id: 'crewNote.occurred' }, { when: when(note.occurred_at) })}
        </Text>
        <Text fontSize="sm">
          {intl.formatMessage(
            { id: 'crewNote.confirmed' },
            {
              who: note.confirmed_by || intl.formatMessage({ id: 'crewNote.notRecorded' }),
              when: when(note.confirmed_at)
            }
          )}
        </Text>
        <Text fontSize="sm">
          {note.performer
            ? intl.formatMessage({ id: 'crewNote.performer' }, { name: note.performer })
            : intl.formatMessage({ id: 'crewNote.performerNotRecorded' })}
        </Text>
        <Text fontSize="sm">
          {note.review.reviewed
            ? intl.formatMessage(
                { id: 'crewNote.reviewed' },
                {
                  who:
                    note.review.reviewer_name || intl.formatMessage({ id: 'crewNote.notRecorded' }),
                  when: when(note.review.review_date)
                }
              )
            : intl.formatMessage({ id: 'crewNote.notReviewed' })}
        </Text>
        <Text fontSize="xs" color="gray.600">
          {note.server_reading_recorded
            ? note.server_matched.length
              ? intl.formatMessage(
                  { id: 'crewNote.serverMatched' },
                  { fields: note.server_matched.join(', ') }
                )
              : intl.formatMessage({ id: 'crewNote.serverNoMatch' })
            : intl.formatMessage({ id: 'crewNote.serverNoReading' })}
        </Text>
        <Text fontSize="xs" color="gray.600">
          {note.machine_values_applied.length
            ? intl.formatMessage(
                { id: 'crewNote.machineApplied' },
                { fields: note.machine_values_applied.join(', ') }
              )
            : intl.formatMessage({ id: 'crewNote.machineNone' })}
        </Text>
      </Stack>
    </Box>
  );
};

export default CrewNoteProvenance;
