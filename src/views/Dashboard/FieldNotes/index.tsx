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
import { useMemo, useState } from 'react';

import {
  Badge,
  Box,
  Button,
  HStack,
  Select,
  Stack,
  Text,
  Textarea,
  VStack,
  useToast
} from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { StandardCard, StandardPage } from 'components/Design/StandardComponents';
import type { RootState } from 'store/index';
import {
  useDiscardFieldNoteMutation,
  useGetFieldNotesQuery,
  type FieldNote
} from 'store/api/fieldNoteApi';

/**
 * The refusal reasons that have copy, mirroring the three literals `fieldnotes/views.py` writes.
 *
 * An allowlist rather than interpolating `refusal_reason` straight into a message id, because the
 * column is a plain CharField with no choices: a value added on the server before its copy ships
 * would otherwise render react-intl's fallback, which is the raw key, and `voice_not_enabled` is
 * not something to show a farmer.
 */
const REFUSAL_KEYS = ['voice_not_enabled', 'unsupported_media', 'empty_message'];

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

  const { data: notes = [], isLoading } = useGetFieldNotesQuery({ status: 'pending' });
  /**
   * REFUSED notes, fetched separately rather than by widening the query above to `status: 'all'`.
   *
   * Two reasons, both measured. (1) `'all'` returns confirmed and discarded notes too, and the
   * card below gates "Log this" on whether a block is picked, not on status, so an already-logged
   * note would render a live button: a second record for one message, which is the bug the queue
   * invalidation in historyApi was just fixed for. (2) The pending arg is a cache key. Anything
   * else that ever wants a waiting-note count has to pass the byte-identical `{ status: 'pending' }`
   * to share this entry, and two surfaces printing two different numbers for one subject is what
   * got the standalone readiness panel deleted on 2026-08-04.
   *
   * Why they must be visible at all: EVERY voice note is refused today. `providers/twilio.py`
   * classifies any audio as `kind="voice"` and `fieldnotes/views.py` writes a non-text note as
   * REFUSED with `voice_not_enabled`, because ASR is not wired yet. The page showed pending notes
   * only, nothing creates a notification, and no copy for a refusal existed, so a crew member's
   * voice note landed in the database and appeared on no surface at all. They believe they filed
   * something. `fieldnotes/models.py` already promises these rows stay visible.
   */
  /**
   * Its loading AND error states are both read, because `refused` defaults to `[]` and an empty
   * array is indistinguishable from "not answered yet" and from "the request failed". Two separate
   * requests settle independently, so the pending one (dispatched first) normally answers first: on
   * a cold load that showed "Nothing waiting" for as long as the refusals were in flight, and on a
   * FAILED refusals request it showed it permanently, since `refused` never becomes anything else.
   * Claiming nothing arrived while a refusal is sitting unread is the exact silent drop this section
   * was added to end.
   */
  const {
    data: refused = [],
    isLoading: refusedLoading,
    isError: refusedFailed
  } = useGetFieldNotesQuery({ status: 'refused' });
  const [discardNote, { isLoading: isDiscarding }] = useDiscardFieldNoteMutation();

  // The same slice the sidebar reads, so this page needs no query of its own and cannot disagree
  // with the farm list already on screen.
  const establishments = useSelector(
    (state: RootState) => state.company.currentCompany?.establishments
  );

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
        {(isLoading || refusedLoading) && (
          <Text fontSize="sm">{intl.formatMessage({ id: 'app.loading' })}</Text>
        )}

        {/*
          Said out loud rather than folded into the empty state. A refusals request that failed means
          the page cannot account for what arrived, and "nothing waiting" would be a claim it has no
          basis for. The queue above still renders: one list failing is no reason to withhold the
          other.
        */}
        {refusedFailed && (
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
          notes.length === 0 &&
          refused.length === 0 && (
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
                          when: new Date(note.received_at).toLocaleString(intl.locale)
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
                  <Text fontSize="sm" color="gray.800" whiteSpace="pre-wrap">
                    {`“${note.words}”`}
                  </Text>
                </Box>

                <Stack direction={{ base: 'column', smd: 'row' }} spacing={2}>
                  <Select
                    size="sm"
                    minH="44px"
                    aria-label={intl.formatMessage({ id: 'fieldNotes.chooseFarm' })}
                    placeholder={intl.formatMessage({ id: 'fieldNotes.chooseFarm' })}
                    value={farmId ?? ''}
                    onChange={(event) =>
                      setChoice((prev) => ({
                        ...prev,
                        // The parcel is cleared with the farm: a lot from the previous farm would be
                        // a record filed against a block on a different property.
                        [note.public_id]: { farmId: event.target.value, parcelId: undefined }
                      }))
                    }>
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </Select>

                  <Select
                    size="sm"
                    minH="44px"
                    aria-label={intl.formatMessage({ id: 'fieldNotes.chooseParcel' })}
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
                  </Select>
                </Stack>

                <Stack direction={{ base: 'column', smd: 'row' }} spacing={2}>
                  <Button
                    size="sm"
                    minH="44px"
                    colorScheme="green"
                    isDisabled={!ready}
                    onClick={() => openWizard(note)}>
                    {intl.formatMessage({ id: 'fieldNotes.logThis' })}
                  </Button>
                  <Button
                    size="sm"
                    minH="44px"
                    variant="ghost"
                    onClick={() => {
                      setDiscardFor(discardFor === note.public_id ? null : note.public_id);
                      setDiscardReason('');
                    }}>
                    {intl.formatMessage({ id: 'fieldNotes.discard' })}
                  </Button>
                </Stack>

                {!ready && (
                  <Text fontSize="xs" color="gray.700">
                    {intl.formatMessage({ id: 'fieldNotes.pickTheBlockFirst' })}
                  </Text>
                )}

                {discardFor === note.public_id && (
                  <VStack align="stretch" spacing={2}>
                    <Text fontSize="xs" color="gray.700">
                      {intl.formatMessage({ id: 'fieldNotes.discardKeepsIt' })}
                    </Text>
                    <Textarea
                      size="sm"
                      rows={2}
                      value={discardReason}
                      placeholder={intl.formatMessage({ id: 'fieldNotes.discardReason' })}
                      onChange={(event) => setDiscardReason(event.target.value)}
                    />
                    <HStack spacing={2} flexWrap="wrap">
                      <Button
                        size="xs"
                        minH="44px"
                        variant="outline"
                        isLoading={isDiscarding}
                        onClick={() => confirmDiscard(note)}>
                        {intl.formatMessage({ id: 'fieldNotes.discardConfirm' })}
                      </Button>
                      <Button
                        size="xs"
                        minH="44px"
                        variant="ghost"
                        onClick={() => setDiscardFor(null)}>
                        {intl.formatMessage({ id: 'app.cancel' })}
                      </Button>
                    </HStack>
                  </VStack>
                )}
              </VStack>
            </StandardCard>
          );
        })}

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
                            when: new Date(note.received_at).toLocaleString(intl.locale)
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
      </VStack>
    </StandardPage>
  );
};

export default FieldNotesInbox;
