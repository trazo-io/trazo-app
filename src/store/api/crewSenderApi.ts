/**
 * The crew roster: which phone numbers may file field notes, and against which farm.
 *
 * WHY THIS EXISTS. The webhook shipped before any roster API, so the only way to register a number
 * was `manage.py shell` and later a staff-only Django admin page. The inbox meanwhile told a
 * first-time user that messages would appear when someone on their crew sent one, which no grower
 * could make happen: the channel was reachable and unusable at the same time.
 *
 * A SENDER IS NOT A NOTE, which is why this is its own module rather than more endpoints on
 * `fieldNoteApi`. A roster row outlives every note it ever accepted, and `FieldNote.sender` is
 * SET_NULL precisely so it can.
 *
 * NOTHING HERE ATTESTES CONSENT ON ITS OWN. `consent_attested` is a flag the PERSON ticks, and the
 * server stamps who and when. A crew member is not a Trazo user and cannot agree in this app, so the
 * assertion is made by a named human at the farm or the number cannot send at all
 * (`CrewSender.may_send` reads that stamp).
 */
import baseApi from './baseApi';

export type CrewSenderLanguage = 'en-US' | 'es-419' | 'pt-BR';

export interface CrewSender {
  id: number;
  company: number;
  establishment: number | null;
  /**
   * The FULL number, unlike a field note's sender, which serves only the last four digits.
   *
   * The asymmetry is deliberate: a note is read by anyone who opens the inbox and the number adds
   * nothing they need, while this is the form where somebody typed it and has to be able to read it
   * back to spot the typo. A mistyped number leaves a crew member told they are not registered
   * while their number is visibly on the list.
   */
  phone_e164: string;
  display_name: string;
  language: CrewSenderLanguage;
  is_active: boolean;
  /**
   * Whether this number can actually file anything. Three columns gate it (`is_active`, the consent
   * stamp, and not having sent STOP), so `is_active` alone would leave a supervisor looking at an
   * active row that silently refuses every message.
   */
  may_send: boolean;
  consent_attested_at: string | null;
  stopped_at: string | null;
  first_contact_at: string | null;
  /** They messaged again AFTER the notice: the only consent signal this channel can observe. */
  consented_at: string | null;
  last_note_at: string | null;
  created_at: string;
}

/**
 * Where the crew sends it. A property of the DEPLOYMENT, not of a company.
 *
 * One Trazo deployment has one inbound WhatsApp number and every operation's crew messages it; the
 * roster is what decides whose farm a given message belongs to. So there is nothing to scope this to
 * and no company id in the request.
 *
 * NOT COVERED BY `fieldNoteContractParity.test.ts`, deliberately: that guard compares an interface
 * against a ModelSerializer's `fields` tuple, and this endpoint has no serializer and no model
 * behind it. The three keys are pinned from the other side instead, by
 * `test_it_serves_exactly_the_three_keys_the_client_declares` in
 * `fieldnotes/tests/test_channel_details.py`.
 */
export interface CrewChannel {
  /**
   * Whether a crew member's message would reach this deployment at all.
   *
   * REQUIRES THE SENDER NUMBER, not only the provider credentials, and that asymmetry is the whole
   * reason the flag exists rather than the page inferring it from `number` being non-empty: the
   * backend also answers false when the credentials are missing but a number is set, which no
   * client-side check would notice.
   */
  configured: boolean;
  /** Bare E.164, with no `whatsapp:` prefix. Empty when the channel is not configured. */
  number: string;
  /**
   * The Twilio sandbox join phrase, e.g. `join pale-tiger`. EMPTY on a registered sender.
   *
   * Its presence is what tells this client the deployment is on the sandbox, which is what justifies
   * warning about the three-day session expiry. Nothing branches on the number itself.
   */
  join_phrase: string;
}

export interface CrewSenderDraft {
  /**
   * `number | string` because the company slice types `id` as a string and the whole app passes it
   * through unchanged, while the backend pk is an integer. DRF's PrimaryKeyRelatedField resolves a
   * numeric string, so passing it along is correct and `Number()` here would be worse: it turns a
   * malformed value into a silent NaN that serialises as null.
   */
  company: number | string;
  establishment?: number | null;
  phone_e164: string;
  display_name?: string;
  language?: CrewSenderLanguage;
  /** Required true on create. The server refuses without it and stamps the rest itself. */
  consent_attested: boolean;
}

const crewSenderApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * The number to hand the crew, and the sandbox join step when there is one.
     *
     * FIRST, because it is the question that comes before the roster. Registering a number is
     * useless until somebody knows where to send to, and until this endpoint existed the product
     * never said: the inbox's own empty state told a first-time user that messages sent to "your
     * Trazo number" would appear, and that number lived only in the deployment's environment.
     *
     * NO TAG. It is deployment configuration: nothing a client can do invalidates it, and giving it
     * a tag would invite a mutation somewhere to clear it for no reason. It refetches on mount,
     * which is often enough for a value that changes when Trazo changes providers.
     */
    getCrewChannel: build.query<CrewChannel, void>({
      query: () => ({
        url: 'field-notes/channel/',
        method: 'GET',
        credentials: 'include'
      })
    }),

    /**
     * `company` is part of the QUERY ARG, not just a server filter, and that is the point.
     *
     * From review of #44. RTK Query keys a cache entry by its serialized args, so a call with a
     * constant arg is one entry forever: `setCompany` is dispatched independently of navigation
     * (login, invitation, subscription), so a session's `currentCompany` can change while this page
     * is mounted, and the previous company's list was then served from cache with nothing
     * invalidating `'CrewSender'`. Every other company-scoped query in this app puts the id in the
     * arg for exactly this reason.
     *
     * The server intersects it with the caller's own scope rather than substituting for it, so this
     * narrows what is shown and never widens what is reachable.
     */
    getCrewSenders: build.query<
      CrewSender[],
      { company?: number | string; establishment?: number } | void
    >({
      query: (args) => ({
        url: 'crew-senders/',
        method: 'GET',
        credentials: 'include',
        params: {
          ...(args && args.company ? { company: args.company } : {}),
          ...(args && args.establishment ? { establishment: args.establishment } : {})
        }
      }),
      // Unpaginated today and could be paginated later; normalised here so no component has to know
      // which shape arrived. Same treatment as the notes list.
      transformResponse: (response: CrewSender[] | { results: CrewSender[] }) =>
        Array.isArray(response) ? response : response.results,
      providesTags: ['CrewSender']
    }),

    createCrewSender: build.mutation<CrewSender, CrewSenderDraft>({
      query: (body) => ({
        url: 'crew-senders/',
        method: 'POST',
        credentials: 'include',
        body
      }),
      invalidatesTags: ['CrewSender']
    }),

    /**
     * `is_active` is in the type because it is genuinely patchable: turning a number back on is a
     * PATCH. It used to be missing, and the call site cast the difference away with `as any`, which
     * is how a payload the server does not accept reaches it while the typecheck stays green.
     */
    updateCrewSender: build.mutation<
      CrewSender,
      { id: number; is_active?: boolean } & Partial<CrewSenderDraft>
    >({
      query: ({ id, ...body }) => ({
        url: `crew-senders/${id}/`,
        method: 'PATCH',
        credentials: 'include',
        body
      }),
      invalidatesTags: ['CrewSender']
    }),

    /**
     * DELETE deactivates; it does not destroy. The server answers 200 with the updated row rather
     * than 204, because the row is still there and a 204 would read as "it is gone".
     *
     * A roster row is the provenance of every note it accepted, so removing it would leave those
     * notes with a denormalised phone number and nothing explaining where they came from.
     */
    deactivateCrewSender: build.mutation<CrewSender, number>({
      query: (id) => ({
        url: `crew-senders/${id}/`,
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: ['CrewSender']
    })
  })
});

export const {
  useGetCrewChannelQuery,
  useGetCrewSendersQuery,
  useCreateCrewSenderMutation,
  useUpdateCrewSenderMutation,
  useDeactivateCrewSenderMutation
} = crewSenderApi;

export default crewSenderApi;
