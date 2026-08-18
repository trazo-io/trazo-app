/**
 * Corrections to events on a finished season.
 *
 * Events on a closed production are locked (the API answers 423 to edit and delete) so
 * the certifier packet cannot drift. Corrections go through a separate path that keeps
 * the original value beside the new one, with a mandatory reason — the digital form of
 * the single strikethrough used on paper organic records.
 */
import baseApi from './baseApi';

export interface AmendableField {
  name: string;
  label: string;
  current_value: unknown;
}

export interface EventAmendment {
  id: number;
  field_name: string;
  field_label: string;
  original_value: string;
  corrected_value: string;
  reason: string;
  amended_by: string;
  created_at: string;
}

interface AmendOptions {
  event_type: number;
  /** Fields this record actually carries a value in — what the farmer is looking at. */
  fields: AmendableField[];
  /** Everything else that could be corrected. A harvest event has ~79 correctable
   *  columns and a real record fills a handful, so these are offered behind a toggle:
   *  recording something that was missed, rather than correcting something wrong. */
  blank_fields: AmendableField[];
  amendments: EventAmendment[];
}

const amendmentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getEventAmendments: build.query<AmendOptions, { eventId: number; eventType: number }>({
      query: ({ eventId, eventType }) => ({
        url: `events/${eventId}/amend/?event_type=${eventType}`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, { eventId }) => [{ type: 'Event', id: eventId }]
    }),
    amendEvent: build.mutation<
      EventAmendment,
      { eventId: number; eventType: number; field_name: string; new_value: string; reason: string }
    >({
      query: ({ eventId, eventType, ...body }) => ({
        url: `events/${eventId}/amend/?event_type=${eventType}`,
        method: 'POST',
        credentials: 'include',
        body
      }),
      // The event itself now carries the corrected value, so anything showing that event
      // is stale — including the activity feed and the production timeline.
      invalidatesTags: (result, error, { eventId }) => [
        { type: 'Event', id: eventId },
        'Event',
        'History'
      ]
    })
  })
});

export const { useGetEventAmendmentsQuery, useAmendEventMutation } = amendmentsApi;
export default amendmentsApi;
