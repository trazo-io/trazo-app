/**
 * Field notes: what the crew sent, waiting for somebody to turn it into a record.
 *
 * THIS PAGE NEVER WRITES A RECORD. "Log this" navigates to the activity wizard, which is the only
 * place a record is authored, and the confirming user is its author. § 205.201(a) makes the producer
 * the author, so a crew member who sends a message is the source of the words and not the author of
 * anything.
 *
 * THE PARCEL IS CHOSEN HERE, BY A PERSON. A note carries a farm at most, never a lot, because the
 * block a certifier traces is not something software should pick from a phone number. The selects
 * below are required for exactly that reason, and they are prefilled only when there is genuinely
 * one answer.
 *
 * The words are shown VERBATIM and are never editable. They are evidence of what somebody reported;
 * a surface that could edit them would let one person change what another is recorded as saying.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { Badge, Box, HStack, Stack, Text, VStack, useToast } from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import {
  StandardButton,
  StandardCard,
  StandardField,
  StandardPage,
  StandardSelect,
  StandardTextarea
} from 'components/Design/StandardComponents';

import CrewChannel from './CrewChannel';
import CrewRoster from './CrewRoster';
import type { RootState } from 'store/index';
import {
  useDiscardFieldNoteMutation,
  useGetFieldNotesQuery,
  fieldNoteAudioUrl,
  type FieldNote
} from 'store/api/fieldNoteApi';

/**
 * When a message arrived, to the minute.
 *
 * `toLocaleString` was here and carries SECONDS in most locales ("9/28/2026, 11:11:17 PM"). On a
 * queue of messages the second is noise: nothing on this page is ordered or decided by it, and it
 * makes a one-line header read as a log entry. The app's locale, not the browser's, for the reason
 * given at the call site.
 */
const receivedAtLabel = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

/**
 * The refusal reasons that have copy, mirroring the three literals `fieldnotes/views.py` writes.
 *
 * An allowlist rather than interpolating `refusal_reason` straight into a message id, because the
 * column is a plain CharField with no choices: a value added on the server before its copy ships
 * would otherwise render react-intl's fallback, which is the raw key, and `voice_not_enabled` is
 * not something to show a farmer.
 */
const REFUSAL_KEYS = [
  'voice_not_enabled',
  'unsupported_media',
  'empty_message',
  // Added with server-side transcription. Each one is a different thing to tell the crew, which is
  // the whole reason they are separate values rather than one "could not read it".
  'media_unavailable',
  'nothing_heard',
  'language_not_supported',
  'transcription_failed',
  'voice_daily_limit',
  'media_auth_unconfigured'
];

/** A farm the caller can file against, with the lots it contains. */
interface FarmOption {
  id: number;
  name: string;
  parcels: { id: number; name: string }[];
}

const FieldNotesInbox = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();

  /**
   * Notes whose words do not exist yet. DECLARED FIRST because the pending query below polls only
   * while this one has something in it.
   *
   * Its own query rather than widening one to `status: 'all'`, which would return confirmed and
   * discarded notes into a list whose cards carry a "Log this", and the pending arg has to stay
   * byte-identical so anything that later wants a waiting-note count shares its cache entry.
   *
   * Shown because the alternative is worse than a spinner: a supervisor who sees an empty queue
   * thirty seconds after a crew member sent a voice note concludes it was lost.
   */
  const {
    data: transcribing = [],
    isLoading: transcribingLoading,
    isError: transcribingFailed
  } = useGetFieldNotesQuery(
    { status: 'transcribing' },
    {
      /**
       * POLLED, because the copy promises the note appears once the words are ready and nothing else
       * would deliver that: the transition is server-side only, so no mutation invalidates
       * 'FieldNote' when a transcript lands, and the slice sets no refetchOnFocus. Same pattern as
       * exportJobsApi. Live only while this query has a subscriber, so it stops when the page closes.
       */
      pollingInterval: 15000
    }
  );

  /**
   * The queue, polled ONLY while something is being read.
   *
   * Polling this too is not belt and braces, it is the other half of the same fix and leaving it out
   * was worse than not polling at all. With only the transcribing query polling, a finished note
   * dropped out of the "being read" strip and the queue never learned to refetch it, so it vanished
   * from the page entirely until a manual reload. The note was more lost than before.
   *
   * Conditional so a page with nothing in flight makes no requests it has no reason to make, and 0
   * disables polling in RTK Query. The ARG is untouched: `pollingInterval` is an option, so the cache
   * key stays byte-identical and anything that later wants a waiting-note count still shares it.
   */
  const {
    data: notes = [],
    isLoading,
    refetch: refetchQueue
  } = useGetFieldNotesQuery({
    status: 'pending'
  });

  /**
   * REFUSED notes, fetched separately for the same two reasons as above.
   *
   * Why they must be visible: a refusal is the one outcome the sender cannot discover for themselves.
   * A voice note Trazo could not read, a message in a language the parser does not serve, a photo with
   * no caption: each lands here with a reason, and `fieldnotes/models.py` promises these rows stay
   * visible rather than vanishing.
   *
   * Its loading AND error states are both read, because an empty array is indistinguishable from "not
   * answered yet" and from "the request failed". The requests settle independently, so on a cold load
   * an empty queue used to render "Nothing waiting" while the refusals were still arriving, and on a
   * FAILED refusals request it said so permanently.
   */
  const {
    data: refused = [],
    isLoading: refusedLoading,
    isError: refusedFailed,
    refetch: refetchRefused
  } = useGetFieldNotesQuery({ status: 'refused' });

  /**
   * When a note LEAVES the transcribing list, refetch the lists it could have landed in.
   *
   * From review of #47. The first version made the pending query poll while `transcribing.length > 0`,
   * which depended on two independent poll timers lining up: if the transcribing poll observed the
   * list emptying in the same tick that flipped pending's interval back to 0, it could cancel a
   * pending poll that had not fired yet, and nothing else would refetch. Narrower than the original
   * bug, and the same symptom, which is the worst kind of fix.
   *
   * Watching ids DROP OUT is deterministic: it does not care about timer phase, and it refetches BOTH
   * destinations because a finished note becomes `pending` OR `refused` (an unreadable language,
   * silence) and only one of those is the happy path.
   */
  const stillReading = useRef<string[]>([]);
  useEffect(() => {
    const current = transcribing.map((note) => note.public_id);
    const finished = stillReading.current.filter((id) => !current.includes(id));
    stillReading.current = current;
    if (finished.length > 0) {
      refetchQueue();
      refetchRefused();
    }
  }, [transcribing, refetchQueue, refetchRefused]);
  const [discardNote, { isLoading: isDiscarding }] = useDiscardFieldNoteMutation();

  // The same slice the sidebar reads, so this page needs no query of its own and cannot disagree
  // with the farm list already on screen.
  const establishments = useSelector(
    (state: RootState) => state.company.currentCompany?.establishments
  );
  // The roster is company-scoped, and a row belongs to exactly one company, so the id is not
  // optional the way the farm is. Taken from the same slice for the same reason.
  const companyId = useSelector((state: RootState) => state.company.currentCompany?.id);

  const farms: FarmOption[] = useMemo(
    () =>
      (establishments ?? []).map((e: any) => ({
        id: e.id,
        name: e.name,
        parcels: (e.parcels ?? []).map((p: any) => ({ id: p.id, name: p.name }))
      })),
    [establishments]
  );

  // Per-note, because two notes in the queue can belong to different blocks.
  const [choice, setChoice] = useState<Record<string, { farmId?: string; parcelId?: string }>>({});
  /**
   * WHICH notes' players failed, as a set rather than one slot.
   *
   * From review of #47, and it is the same asymmetry #55 caught: a single `string | null` was
   * rendered per note, so a second failure silently erased the first note's indicator while that
   * recording was still just as broken. The reader then had no way to tell the first problem had not
   * been fixed, which is the silent-drop class this whole surface exists to end.
   */
  const [playbackFailed, setPlaybackFailed] = useState<Set<string>>(new Set());
  const [discardFor, setDiscardFor] = useState<string | null>(null);
  const [discardReason, setDiscardReason] = useState('');

  /** The farm to preselect: the one the note names, and only if the caller can see it. */
  const defaultFarmFor = (note: FieldNote) => {
    if (!note.establishment) return undefined;
    return farms.some((f) => f.id === note.establishment) ? String(note.establishment) : undefined;
  };

  const farmIdFor = (note: FieldNote) => choice[note.public_id]?.farmId ?? defaultFarmFor(note);

  /**
   * NOT FILTERED BY WHETHER THE LOT HAS AN OPEN SEASON, and that is deliberate.
   *
   * A parcel with no season in progress is not a dead end: the wizard's own door offers two real
   * ways forward (start the next production, or log post-harvest work against the season that
   * finished). It also tells the operator their message is still waiting here.
   *
   * NEVER: do not "improve" this with `Parcel.has_current_production`. It is
   * `current_history_id is not None` (product/serializers.py:123), and `current_history` is a
   * SINGLE pointer to the most recently STARTED season. A perennial block routinely has two open
   * at once, and closing the pointer's season clears the pointer while the other stays open
   * (product/models.py:372-389). So a false value there does not mean "no open season", and
   * greying a lot out on it would refuse a parcel that genuinely has one. The accurate answer
   * lives in that parcel's histories, which is a query per lot from a list page.
   */
  const parcelIdFor = (note: FieldNote) => {
    const explicit = choice[note.public_id]?.parcelId;
    if (explicit) return explicit;
    // Prefilled ONLY when the farm has exactly one lot, i.e. when there is nothing to choose.
    // Anything else and a person picks, because this is the block a certifier will trace.
    const farm = farms.find((f) => String(f.id) === farmIdFor(note));
    return farm && farm.parcels.length === 1 ? String(farm.parcels[0].id) : undefined;
  };

  const openWizard = (note: FieldNote) => {
    const farmId = farmIdFor(note);
    const parcelId = parcelIdFor(note);
    if (!farmId || !parcelId) return;
    // The note travels as its UUID and nothing else. The wizard re-fetches it, so a hand-edited
    // link cannot invent words, and the transcript never touches browser history or an access log.
    navigate(
      `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/event/add?field_note=${note.public_id}`
    );
  };

  const confirmDiscard = async (note: FieldNote) => {
    try {
      await discardNote({ publicId: note.public_id, reason: discardReason.trim() }).unwrap();
      setDiscardFor(null);
      setDiscardReason('');
      toast({
        title: intl.formatMessage({ id: 'fieldNotes.discarded' }),
        status: 'success',
        duration: 4000,
        isClosable: true,
        position: 'top'
      });
    } catch {
      toast({
        title: intl.formatMessage({ id: 'fieldNotes.discardFailed' }),
        status: 'error',
        duration: 6000,
        isClosable: true,
        position: 'top'
      });
    }
  };

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'fieldNotes.title' })}
      description={intl.formatMessage({ id: 'fieldNotes.description' })}>
      <VStack align="stretch" spacing={4}>
        {(isLoading || refusedLoading || transcribingLoading) && (
          <Text fontSize="sm">{intl.formatMessage({ id: 'app.loading' })}</Text>
        )}

        {/*
          Said out loud rather than folded into the empty state. A refusals request that failed means
          the page cannot account for what arrived, and "nothing waiting" would be a claim it has no
          basis for. The queue above still renders: one list failing is no reason to withhold the
          other.
        */}
        {(refusedFailed || transcribingFailed) && (
          <StandardCard>
            <Text fontSize="sm" color="gray.800" p={2}>
              {intl.formatMessage({ id: 'fieldNotes.refused.loadFailed' })}
            </Text>
          </StandardCard>
        )}

        {/*
          Both lists, and both of the refused query's unsettled states, so "Nothing waiting" cannot
          sit above a refusal the operator needs to read.
        */}
        {!isLoading &&
          !refusedLoading &&
          !refusedFailed &&
          !transcribingLoading &&
          !transcribingFailed &&
          notes.length === 0 &&
          refused.length === 0 &&
          transcribing.length === 0 && (
            <StandardCard>
              <VStack align="start" spacing={1} p={2}>
                <Text fontSize="sm" fontWeight="semibold" color="green.700">
                  {intl.formatMessage({ id: 'fieldNotes.empty' })}
                </Text>
                <Text fontSize="xs" color="gray.700">
                  {intl.formatMessage({ id: 'fieldNotes.emptyHelp' })}
                </Text>
              </VStack>
            </StandardCard>
          )}

        {notes.map((note) => {
          const farmId = farmIdFor(note);
          const parcelId = parcelIdFor(note);
          const farm = farms.find((f) => String(f.id) === farmId);
          // The block choice AND the status. The query above asks for pending notes, so the status
          // half is redundant today and is what holds if this list is ever widened: a "Log this"
          // offered on a note already spent writes a second record for one message, and
          // `_resolve_field_note` filters status=PENDING so the server declines the link silently.
          const ready = Boolean(farmId && parcelId) && note.status === 'pending';

          return (
            <StandardCard key={note.public_id}>
              <VStack align="stretch" spacing={3} p={2}>
                <HStack justify="space-between" align="start" flexWrap="wrap" spacing={2}>
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="semibold" color="green.700">
                      {note.sender.display_name ||
                        intl.formatMessage({ id: 'fieldNotes.unknownSender' })}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      {intl.formatMessage(
                        { id: 'fieldNotes.sentBy' },
                        {
                          last4: note.sender.phone_last4,
                          // The APP's locale, not the browser's. A grower running Trazo in
                          // Spanish on an English-locale machine got an English timestamp
                          // inside a Spanish sentence.
                          when: receivedAtLabel(note.received_at, intl.locale)
                        }
                      )}
                    </Text>
                  </VStack>
                  {/* Neutral, because this is a plain fact about the message and not a status. */}
                  <Badge variant="neutral">
                    {intl.formatMessage({ id: `fieldNotes.kind.${note.kind}` })}
                  </Badge>
                </HStack>

                {/* Verbatim, quoted, and never an input. These are somebody else's words. */}
                <Box bg="gray.50" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}>
                  {/*
                    THE WORDS OUTRANK EVERYTHING BESIDE THEM. At `sm`/gray.800 they sat at the same
                    weight as the machine-transcript qualifier under them, which is a full sentence
                    and runs the whole width, so the disclaimer read as the louder of the two. The
                    qualifier still sits next to its claim; it is now visibly secondary to it.
                  */}
                  <Text
                    fontSize="md"
                    fontWeight="medium"
                    color="gray.900"
                    whiteSpace="pre-wrap"
                    lineHeight="tall">
                    {`“${note.words}”`}
                  </Text>

                  {/*
                    A VOICE NOTE'S WORDS ARE A MACHINE'S GUESS, and the surface says so beside them.
                    For typed text the sender wrote the words; here an ASR system did, and the
                    difference decides what the reader should trust. The qualifier sits next to the
                    claim rather than once per page, which is this project's rule for qualifiers.
                  */}
                  {note.kind === 'voice' && (
                    <VStack align="stretch" spacing={2} mt={3}>
                      <Text fontSize="xs" color="gray.600">
                        {intl.formatMessage({ id: 'fieldNotes.machineTranscript' })}
                      </Text>

                      {/*
                        LISTENING IS THE POINT, not a nicety. ASR dropping a negation ("I applied
                        nothing in block 4") is undetectable by anyone who was not the speaker, and on
                        this channel the speaker is never the person confirming. The source is an
                        authenticated Trazo endpoint that proxies the bytes; the recording is never in
                        Trazo's storage and is deleted at the provider once this note is logged or
                        discarded, which is why the deleted case renders a line instead of a player.
                      */}
                      {playbackFailed.has(note.public_id) && (
                        <Text fontSize="xs" color="red.600">
                          {intl.formatMessage({ id: 'fieldNotes.audioFailed' })}
                        </Text>
                      )}

                      {note.audio_deleted_at ? (
                        <Text fontSize="xs" color="gray.600">
                          {intl.formatMessage({ id: 'fieldNotes.audioDeleted' })}
                        </Text>
                      ) : (
                        <audio
                          controls
                          preload="none"
                          src={fieldNoteAudioUrl(note.public_id)}
                          style={{ width: '100%' }}
                          /*
                            A failed load is SAID, not left as a player that does nothing when
                            pressed. Everything that can go wrong here goes wrong invisibly: the
                            recording was deleted at the provider, the CSP blocks the origin, the
                            cookie did not travel. The element's fallback content only covers a
                            browser with no audio support, which is the one case that will not happen.
                          */
                          onError={() =>
                            setPlaybackFailed((prev) => new Set(prev).add(note.public_id))
                          }>
                          {intl.formatMessage({ id: 'fieldNotes.audioUnsupported' })}
                        </audio>
                      )}
                    </VStack>
                  )}
                </Box>

                {/*
                  LABELLED, not placeholder-labelled. Both selects carried their question only as
                  the empty option, so the moment a farm was chosen the row became two unlabelled
                  dropdowns reading "Calapooia Bend Farm" and "Choose the block", and which of the
                  two was still outstanding had to be inferred. `required` is honest here: the
                  server refuses the link without a parcel.
                */}
                <Stack direction={{ base: 'column', smd: 'row' }} spacing={3}>
                  <StandardField
                    label={intl.formatMessage({ id: 'fieldNotes.farmLabel' })}
                    required
                    flex="1"
                    minW={0}>
                    <StandardSelect
                      placeholder={intl.formatMessage({ id: 'fieldNotes.chooseFarm' })}
                      value={farmId ?? ''}
                      onChange={(event) =>
                        setChoice((prev) => ({
                          ...prev,
                          // The parcel is cleared with the farm: a lot from the previous farm would
                          // be a record filed against a block on a different property.
                          [note.public_id]: { farmId: event.target.value, parcelId: undefined }
                        }))
                      }>
                      {farms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </StandardSelect>
                  </StandardField>

                  <StandardField
                    label={intl.formatMessage({ id: 'fieldNotes.parcelLabel' })}
                    required
                    flex="1"
                    minW={0}>
                    <StandardSelect
                      placeholder={intl.formatMessage({ id: 'fieldNotes.chooseParcel' })}
                      value={parcelId ?? ''}
                      isDisabled={!farm}
                      onChange={(event) =>
                        setChoice((prev) => ({
                          ...prev,
                          [note.public_id]: { farmId, parcelId: event.target.value }
                        }))
                      }>
                      {(farm?.parcels ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </StandardSelect>
                  </StandardField>
                </Stack>

                {/*
                  WHY THE BUTTON IS DEAD, BEFORE THE BUTTON. This line used to sit UNDER the two
                  buttons, so the reading order was: a greyed "Log this", then hunt below it for the
                  reason. It is the same sentence; it is now read before the control it explains and
                  is named by `aria-describedby`, which is the only way a screen-reader user gets it
                  at all (a disabled button announces no reason of its own).
                */}
                {!ready && (
                  <Text id={`why-${note.public_id}`} fontSize="xs" color="gray.700">
                    {intl.formatMessage({ id: 'fieldNotes.pickTheBlockFirst' })}
                  </Text>
                )}

                <Stack direction={{ base: 'column', smd: 'row' }} spacing={2}>
                  <StandardButton
                    size="sm"
                    isDisabled={!ready}
                    aria-describedby={ready ? undefined : `why-${note.public_id}`}
                    onClick={() => openWizard(note)}>
                    {intl.formatMessage({ id: 'fieldNotes.logThis' })}
                  </StandardButton>
                  <StandardButton
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDiscardFor(discardFor === note.public_id ? null : note.public_id);
                      setDiscardReason('');
                    }}>
                    {intl.formatMessage({ id: 'fieldNotes.discard' })}
                  </StandardButton>
                </Stack>

                {discardFor === note.public_id && (
                  <VStack align="stretch" spacing={2}>
                    <Text fontSize="xs" color="gray.700">
                      {intl.formatMessage({ id: 'fieldNotes.discardKeepsIt' })}
                    </Text>
                    <StandardTextarea
                      rows={2}
                      // StandardTextarea defaults to 120px, which is a lot of box for one optional
                      // line of reason inside an already-open panel.
                      minH="80px"
                      value={discardReason}
                      placeholder={intl.formatMessage({ id: 'fieldNotes.discardReason' })}
                      aria-label={intl.formatMessage({ id: 'fieldNotes.discardReason' })}
                      onChange={(event) => setDiscardReason(event.target.value)}
                    />
                    <HStack spacing={2} flexWrap="wrap">
                      <StandardButton
                        size="xs"
                        variant="outline"
                        isLoading={isDiscarding}
                        onClick={() => confirmDiscard(note)}>
                        {intl.formatMessage({ id: 'fieldNotes.discardConfirm' })}
                      </StandardButton>
                      <StandardButton size="xs" variant="ghost" onClick={() => setDiscardFor(null)}>
                        {intl.formatMessage({ id: 'app.cancel' })}
                      </StandardButton>
                    </HStack>
                  </VStack>
                )}
              </VStack>
            </StandardCard>
          );
        })}

        {/*
          BEING READ. A strip rather than cards, because there is nothing to do with these yet: no
          farm select, no block select, no "Log this". It exists so a supervisor who looks thirty
          seconds after a crew member sent a voice note does not conclude it was lost.
        */}
        {transcribing.length > 0 && (
          <StandardCard>
            <VStack align="start" spacing={1} p={2}>
              <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                {intl.formatMessage(
                  { id: 'fieldNotes.transcribing.heading' },
                  { count: transcribing.length }
                )}
              </Text>
              <Text fontSize="xs" color="gray.700">
                {intl.formatMessage({ id: 'fieldNotes.transcribing.help' })}
              </Text>
            </VStack>
          </StandardCard>
        )}

        {/*
          REFUSED notes: what arrived and could not be read. No farm select, no block select and no
          "Log this", because there is nothing here to log. A refusal is not a queue item; it is the
          answer to "why did Miguel's message never turn up", which was previously answerable
          nowhere in the product.

          No Discard button either, deliberately: `discard` returns 409 for a note that is not
          pending (fieldnotes/views.py), and the page's only failure toast is the generic
          `discardFailed`, so offering it would produce a button that always fails and never says
          why. The row is already terminal.
        */}
        {refused.length > 0 && (
          <StandardCard>
            <VStack align="stretch" spacing={3} p={2}>
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                  {intl.formatMessage({ id: 'fieldNotes.refused.heading' })}
                </Text>
                <Text fontSize="xs" color="gray.700">
                  {intl.formatMessage({ id: 'fieldNotes.refused.help' })}
                </Text>
              </VStack>

              {refused.map((note) => (
                <Box
                  key={note.public_id}
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  p={3}>
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between" align="start" flexWrap="wrap" spacing={2}>
                      <Text fontSize="xs" color="gray.600">
                        {intl.formatMessage(
                          { id: 'fieldNotes.sentBy' },
                          {
                            last4: note.sender.phone_last4,
                            when: receivedAtLabel(note.received_at, intl.locale)
                          }
                        )}
                      </Text>
                      <Badge variant="neutral">
                        {intl.formatMessage({ id: `fieldNotes.kind.${note.kind}` })}
                      </Badge>
                    </HStack>

                    {/*
                      `refusal_reason` is a plain CharField with no choices on the model, written
                      from three literals in the webhook. An unrecognised value therefore has to
                      render as SOMETHING rather than as a raw key or an empty line, so a reason
                      added server-side before its copy lands reads as "could not be read" instead
                      of leaking `voice_not_enabled` at a farmer.
                    */}
                    <Text fontSize="sm" color="gray.800">
                      {intl.formatMessage({
                        id: REFUSAL_KEYS.includes(note.refusal_reason)
                          ? `fieldNotes.refused.${note.refusal_reason}`
                          : 'fieldNotes.refused.unknown'
                      })}
                    </Text>

                    {/* Only when there is something to show: a voice note carries no text. */}
                    {note.words ? (
                      <Box bg="gray.50" borderRadius="md" p={2}>
                        <Text fontSize="xs" color="gray.700" whiteSpace="pre-wrap">
                          {`“${note.words}”`}
                        </Text>
                      </Box>
                    ) : null}
                  </VStack>
                </Box>
              ))}
            </VStack>
          </StandardCard>
        )}

        {/*
          LAST, because the queue is the job and these two are the setup. It is also the reason the
          empty state above no longer tells a first-time user to wait for a message: until these
          sections existed nobody outside Trazo could register a number or find out where their crew
          should send, so waiting was all they could do.

          THE CHANNEL COMES FIRST OF THE TWO. Registering a number is useless until somebody knows
          the address, and on the Twilio sandbox a crew member who messages before sending the join
          phrase is not delivered at all, which produces no note, no refusal row and nothing on any
          screen. It is also the one card that renders without waiting for the company slice, since
          one deployment has one inbound number and it belongs to no company.
        */}
        <CrewChannel />
        <CrewRoster companyId={companyId} farms={farms} />
      </VStack>
    </StandardPage>
  );
};

export default FieldNotesInbox;
