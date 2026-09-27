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
        {isLoading && <Text fontSize="sm">{intl.formatMessage({ id: 'app.loading' })}</Text>}

        {!isLoading && notes.length === 0 && (
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
          const ready = Boolean(farmId && parcelId);

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
                          when: new Date(note.received_at).toLocaleString()
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
      </VStack>
    </StandardPage>
  );
};

export default FieldNotesInbox;
