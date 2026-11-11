/**
 * Where a record came from, when it was confirmed from a crew message (OSP alignment audit T29).
 * Private, scoped like the record itself; `crew_note` is null for a record that did not come from a
 * message. Served as structured fields so the dashboard words them in the reader's language.
 */
import baseApi from './baseApi';

export interface CrewNoteProvenance {
  sender: { display_name: string; phone_last4: string };
  kind: 'text' | 'voice' | string;
  received_at: string | null;
  words: string;
  words_are_transcript: boolean;
  language: string;
  confirmed_by: string;
  confirmed_at: string | null;
  machine_values_applied: string[];
  machine_values_offered: number;
  negation: string;
  /** The server's own finding: did it keep a reading of the message, and which input values of
   * the record match it. Separate from what the confirming app reported. */
  server_reading_recorded: boolean;
  server_matched: string[];
  earlier_confirmations: Array<{
    confirmed_at: string;
    confirmed_by: string;
    voided_at: string | null;
    void_reason: string;
  }>;
  occurred_at: string | null;
  /** The spray's source record shows no clock time: `occurred_at` holds a noon placeholder. */
  time_not_recorded?: boolean;
  performer: string;
  applicator: string;
  review: { reviewed: boolean; reviewer_name: string; review_date: string | null };
  from_history: boolean;
}

const crewNoteApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCrewNote: build.query<
      { crew_note: CrewNoteProvenance | null },
      { eventId: number; eventType: number }
    >({
      query: ({ eventId, eventType }) => ({
        url: `events/${eventId}/crew-note/?event_type=${eventType}`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, { eventId }) => [{ type: 'Event', id: eventId }]
    })
  })
});

export const { useGetCrewNoteQuery } = crewNoteApi;
export default crewNoteApi;
