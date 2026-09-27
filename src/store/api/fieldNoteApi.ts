/**
 * Field notes: WhatsApp messages from the block, waiting for a supervisor to turn into records.
 *
 * A NOTE IS NOT A RECORD, and nothing here makes one. There is no `confirm` endpoint, on either
 * side: a note becomes an event through the activity wizard's normal save, and the backend writes the
 * link between the two inside that same request. § 205.201(a) makes the producer the author, and the
 * person who confirms is the author, never the crew member who sent the message.
 *
 * No mutation here writes to `words`. The sender's sentence is evidence of what they reported; a
 * surface that could edit it would let somebody change what a person is recorded as having said.
 *
 * See `fieldnotes/models.py` for the whole design and `fieldnotes/views.py` for the inbox.
 */
import baseApi from './baseApi';

export type FieldNoteStatus = 'pending' | 'confirmed' | 'discarded' | 'refused';

export interface FieldNoteSender {
  display_name: string;
  /**
   * The last four digits, and that is all the API sends.
   *
   * A supervisor knows their own crew, so a full number adds nothing and would put arbitrary phone
   * numbers into browser history, screenshots and every access log that records a response.
   */
  phone_last4: string;
}

export interface FieldNote {
  /** A UUID. The only id that appears in a URL, so a link cannot enumerate other operations. */
  public_id: string;
  /** What the sender wrote. One reader, so no caller has to choose between two columns. */
  words: string;
  sender: FieldNoteSender;
  kind: 'text' | 'voice';
  status: FieldNoteStatus;
  /** Why a note could not be accepted, e.g. `voice_not_enabled`. Empty when it is waiting. */
  refusal_reason: string;
  received_at: string;
  establishment: number | null;
  confirmed_at: string | null;
  fulfilled_by_event_type: number | null;
  fulfilled_by_id: number | null;
}

const fieldNoteApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * The queue. Defaults to waiting notes; pass `status: 'all'` for the rest.
     *
     * Refused notes stay reachable rather than hidden: that somebody tried to file something at
     * 14:02 is itself a record-keeping fact, and a note that vanishes is worse than one that says
     * why it could not be read.
     */
    getFieldNotes: build.query<
      FieldNote[],
      { status?: FieldNoteStatus | 'all'; establishment?: number } | void
    >({
      query: (args) => ({
        url: 'field-notes/',
        method: 'GET',
        credentials: 'include',
        params: {
          ...(args && args.status ? { status: args.status } : {}),
          ...(args && args.establishment ? { establishment: args.establishment } : {})
        }
      }),
      // The list endpoint is unpaginated today and could be paginated later; normalise here so no
      // component has to know which shape arrived.
      transformResponse: (response: FieldNote[] | { results: FieldNote[] }) =>
        Array.isArray(response) ? response : response.results,
      providesTags: ['FieldNote']
    }),

    getFieldNote: build.query<FieldNote, string>({
      query: (publicId) => ({
        url: `field-notes/${publicId}/`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, publicId) => [{ type: 'FieldNote', id: publicId }]
    }),

    /**
     * Refuse a note without making a record of it.
     *
     * The row is KEPT. A crew member reported something and the operation decided it was not an
     * event; deleting the row would make "we never received it" and "we looked and said no"
     * indistinguishable to anyone reading the trail later.
     */
    discardFieldNote: build.mutation<FieldNote, { publicId: string; reason?: string }>({
      query: ({ publicId, reason }) => ({
        url: `field-notes/${publicId}/discard/`,
        method: 'POST',
        credentials: 'include',
        body: reason ? { reason } : {}
      }),
      invalidatesTags: ['FieldNote']
    })
  })
});

export const { useGetFieldNotesQuery, useGetFieldNoteQuery, useDiscardFieldNoteMutation } =
  fieldNoteApi;
export default fieldNoteApi;
