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
import { config } from 'config/environment';

import baseApi from './baseApi';

/**
 * `transcribing` is a voice note whose words do not exist yet.
 *
 * It is a different fact from `pending`: the inbox must not offer "Log this" on a note nobody can
 * read, and a supervisor looking at an empty queue deserves to know something is on its way rather
 * than that nothing arrived.
 */
export type FieldNoteStatus = 'transcribing' | 'pending' | 'confirmed' | 'discarded' | 'refused';

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
  /**
   * Set for a voice note, and it is NOT the same kind of thing as the sender's typed words: it is a
   * machine's guess at what somebody said. `words` already resolves to it, so the surface only needs
   * this to say so out loud.
   */
  transcript?: string;
  transcript_language?: string;
  /** Stamped when the recording was deleted at the provider, so there is nothing left to play. */
  audio_deleted_at?: string | null;
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
        // Encoded because this value arrives from `?field_note=` in the address bar, so a person
        // can put anything in it. Not a vulnerability today (same-origin GET with the caller's own
        // cookies, and the backend scopes every lookup to the caller's own companies, so the only
        // reachable data is already theirs), but an unencoded path segment lets a typed-in `../`
        // reshape which endpoint the request names, and that is not worth leaving to luck.
        url: `field-notes/${encodeURIComponent(publicId)}/`,
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

/**
 * Where to play a voice note from.
 *
 * An authenticated Trazo endpoint that proxies the bytes from the provider, NOT the provider's own
 * URL. The recording never enters Trazo's storage (the default bucket is publicly readable), and a
 * link straight to the provider would carry no Trazo authorisation for whoever it was forwarded to.
 *
 * WHY AN <audio src> IS AUTHENTICATED AT ALL, corrected: it is NOT `credentials: 'include'`, which
 * applies to this slice's fetches and has nothing to do with a media element. A media element issues a
 * no-cors request and attaches cookies by SameSite rules, and this one qualifies because the auth
 * cookie is set on domain `.trazo.io` with `SameSite=Lax`, which makes app.trazo.io to api.trazo.io
 * cross-ORIGIN but same-SITE.
 *
 * ⚠️ That is a real dependency, not a coincidence: if `AUTH_COOKIE_SAMESITE` becomes `Strict`, or the
 * cookie stops being shared across subdomains, or the API moves off `*.trazo.io`, the player starts
 * answering 401 and nothing in the test suite would notice, because jsdom sends no cookies either way.
 */
export const fieldNoteAudioUrl = (publicId: string) =>
  `${config.API_BASE_URL}/field-notes/${encodeURIComponent(publicId)}/audio/`;

export const { useGetFieldNotesQuery, useGetFieldNoteQuery, useDiscardFieldNoteMutation } =
  fieldNoteApi;
export default fieldNoteApi;
