/**
 * The crew roster: which numbers may send field notes.
 *
 * WHY IT IS ON THIS PAGE. Until this shipped there was no way for a grower to register a number at
 * all: the webhook was live, the roster existed only in staff-only Django admin, and this page's own
 * empty state told a first-time user that messages would appear when someone on their crew sent one.
 * Nobody outside Trazo could make that happen. The setup step belongs on the surface whose emptiness
 * it explains.
 *
 * NOBODY IS NAMED AS AN APPLICATOR HERE. `display_name` is what the supervisor calls this person, for
 * the inbox list only, and it is never written to `performed_by`: the certifier packet prints that
 * field as the applicator of record, and shared handsets, recycled numbers and a mayordomo reporting
 * for a twelve-person crew all end with one name against everyone's work.
 *
 * CONSENT IS ASSERTED BY A PERSON, NOT BY THIS FORM. A crew member is not a Trazo user and cannot
 * agree here, so somebody at the farm ticks the box under their own name and the server stamps who
 * and when. Without that stamp the number cannot send at all, so a row saved without it is inert by
 * design rather than by accident.
 */
import { useState } from 'react';

import {
  Badge,
  Box,
  Button,
  HStack,
  Input,
  Select,
  Stack,
  Text,
  VStack,
  useToast
} from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import { StandardCard } from 'components/Design/StandardComponents';
import {
  useCreateCrewSenderMutation,
  useDeactivateCrewSenderMutation,
  useGetCrewSendersQuery,
  useUpdateCrewSenderMutation,
  type CrewSender,
  type CrewSenderLanguage
} from 'store/api/crewSenderApi';

interface FarmOption {
  id: number;
  name: string;
}

interface Props {
  /** A string at runtime: see the note on `CrewSenderDraft.company`. */
  companyId?: number | string;
  farms: FarmOption[];
}

const LANGUAGES: CrewSenderLanguage[] = ['en-US', 'es-419', 'pt-BR'];

const CrewRoster = ({ companyId, farms }: Props) => {
  const intl = useIntl();
  const toast = useToast();

  const { data: senders = [], isLoading } = useGetCrewSendersQuery(
    { company: companyId },
    {
      // Nothing to scope the roster to before the company is known, and asking anyway would return
      // every company the caller belongs to under this company's heading.
      skip: !companyId
    }
  );

  /**
   * Has the server actually been asked yet?
   *
   * `companyId` is undefined for the first few hundred milliseconds while the company slice hydrates
   * (the same window ProfileParcel.tsx:202 documents), so the query above is SKIPPED, and a skipped
   * RTK query reads as `isLoading: false` with `data` defaulting to `[]`. Rendering that as "no
   * numbers yet, so nothing can reach this inbox" states the roster is empty before anything has been
   * asked, which is a claim about the farm's setup made out of a loading state. `CLAUDE.md` names
   * this trap in as many words: "a SKIPPED RTK query reads as isLoading: false with no data, do not
   * render that as empty".
   */
  const answered = Boolean(companyId) && !isLoading;
  const [createSender, { isLoading: isCreating }] = useCreateCrewSenderMutation();
  const [updateSender] = useUpdateCrewSenderMutation();
  const [deactivateSender] = useDeactivateCrewSenderMutation();

  const [adding, setAdding] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [farmId, setFarmId] = useState('');
  const [language, setLanguage] = useState<CrewSenderLanguage>('es-419');
  const [attested, setAttested] = useState(false);
  /** The server's own message, shown verbatim: it is the one that knows why a number was refused. */
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPhone('');
    setName('');
    setFarmId('');
    setLanguage('es-419');
    setAttested(false);
    setError(null);
  };

  const save = async () => {
    // GUARDED HERE, not only by the button's `isDisabled`. From review of #44: the check that
    // matters, "did a person tick consent", lived entirely in JSX disabled-prop plumbing, so a second
    // call site or a re-render that briefly re-enabled the button would have walked straight past it.
    // The rule is about a claim made on somebody else's behalf; it belongs next to the call that
    // sends it.
    if (!companyId || !phone.trim() || !attested) return;
    setError(null);
    try {
      await createSender({
        company: companyId,
        establishment: farmId ? Number(farmId) : null,
        phone_e164: phone.trim(),
        display_name: name.trim(),
        language,
        consent_attested: attested
      }).unwrap();
      setAdding(false);
      reset();
      toast({
        title: intl.formatMessage({ id: 'fieldNotes.roster.saved' }),
        status: 'success',
        duration: 4000,
        isClosable: true,
        position: 'top'
      });
    } catch (caught: any) {
      // The server validates the number, the farm and the consent tick, and its message names which
      // one failed. A generic toast here would send the supervisor back to guess.
      const data = caught?.data;
      const first =
        data && typeof data === 'object'
          ? Object.values(data)
              .flat()
              .find((value) => typeof value === 'string')
          : null;
      setError((first as string) ?? intl.formatMessage({ id: 'fieldNotes.roster.saveFailed' }));
    }
  };

  /**
   * Why this number cannot send, when it cannot.
   *
   * WHETHER it is blocked comes from `may_send`, which is the SERVER's own computed answer. The three
   * columns below only choose which sentence to show. That split is the whole point, and it is the
   * mistake this component was already written to warn about one layer down: re-deriving the gate
   * here would mean that the day the backend grows a fourth input, the page shows a number as able to
   * send while every message it sends is refused, and nothing would catch the disagreement.
   *
   * The precedence is stopped, then off, then consent, and it is deliberate: STOP is the crew
   * member's own decision and outranks anything the farm did. The fallback matters for the same
   * reason the refusal copy has one: a blocked row with no matching column must still say something.
   */
  const blockedReason = (sender: CrewSender) => {
    if (sender.may_send) return null;
    if (sender.stopped_at) return intl.formatMessage({ id: 'fieldNotes.roster.stopped' });
    if (!sender.is_active) return intl.formatMessage({ id: 'fieldNotes.roster.inactive' });
    if (!sender.consent_attested_at)
      return intl.formatMessage({ id: 'fieldNotes.roster.noConsent' });
    return intl.formatMessage({ id: 'fieldNotes.roster.blocked' });
  };

  return (
    <StandardCard>
      <VStack align="stretch" spacing={3} p={2}>
        <VStack align="start" spacing={1}>
          <Text fontSize="sm" fontWeight="semibold" color="gray.800">
            {intl.formatMessage({ id: 'fieldNotes.roster.heading' })}
          </Text>
          <Text fontSize="xs" color="gray.700">
            {intl.formatMessage({ id: 'fieldNotes.roster.help' })}
          </Text>
        </VStack>

        {!answered && <Text fontSize="sm">{intl.formatMessage({ id: 'app.loading' })}</Text>}

        {answered && senders.length === 0 && (
          <Text fontSize="sm" color="gray.700">
            {intl.formatMessage({ id: 'fieldNotes.roster.none' })}
          </Text>
        )}

        {senders.map((sender) => {
          const blocked = blockedReason(sender);
          const farm = farms.find((f) => f.id === sender.establishment);
          return (
            <Box key={sender.id} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}>
              <Stack
                direction={{ base: 'column', smd: 'row' }}
                justify="space-between"
                align={{ base: 'stretch', smd: 'center' }}
                spacing={2}>
                <VStack align="start" spacing={0}>
                  <HStack spacing={2} flexWrap="wrap">
                    <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                      {sender.display_name ||
                        intl.formatMessage({ id: 'fieldNotes.unknownSender' })}
                    </Text>
                    {/* Neutral: a plain fact about the row, never a grade of anything. */}
                    {blocked ? <Badge variant="neutral">{blocked}</Badge> : null}
                  </HStack>
                  {/* The full number on purpose: this is the only screen that can fix a typo in it. */}
                  <Text fontSize="xs" color="gray.700">
                    {sender.phone_e164}
                    {farm ? ` · ${farm.name}` : ''}
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    {sender.last_note_at
                      ? intl.formatMessage(
                          { id: 'fieldNotes.roster.lastNote' },
                          { when: new Date(sender.last_note_at).toLocaleDateString(intl.locale) }
                        )
                      : intl.formatMessage({ id: 'fieldNotes.roster.neverSent' })}
                  </Text>
                </VStack>

                {sender.is_active ? (
                  <Button
                    size="xs"
                    minH="44px"
                    variant="outline"
                    onClick={() => deactivateSender(sender.id)}>
                    {intl.formatMessage({ id: 'fieldNotes.roster.deactivate' })}
                  </Button>
                ) : (
                  <Button
                    size="xs"
                    minH="44px"
                    variant="outline"
                    onClick={() => updateSender({ id: sender.id, is_active: true })}>
                    {intl.formatMessage({ id: 'fieldNotes.roster.reactivate' })}
                  </Button>
                )}
              </Stack>
            </Box>
          );
        })}

        {!adding && (
          <Button
            size="sm"
            minH="44px"
            variant="outline"
            alignSelf="start"
            isDisabled={!companyId}
            onClick={() => setAdding(true)}>
            {intl.formatMessage({ id: 'fieldNotes.roster.add' })}
          </Button>
        )}

        {adding && (
          <VStack align="stretch" spacing={2}>
            <Input
              size="sm"
              minH="44px"
              /* 16px, because Chakra's sm is 14px and iOS Safari zooms the page on focus below 16. */
              fontSize="md"
              value={phone}
              placeholder={intl.formatMessage({ id: 'fieldNotes.roster.phone' })}
              aria-label={intl.formatMessage({ id: 'fieldNotes.roster.phone' })}
              onChange={(event) => setPhone(event.target.value)}
            />
            <Text fontSize="xs" color="gray.600">
              {intl.formatMessage({ id: 'fieldNotes.roster.phoneHelp' })}
            </Text>

            <Input
              size="sm"
              minH="44px"
              fontSize="md"
              value={name}
              placeholder={intl.formatMessage({ id: 'fieldNotes.roster.name' })}
              aria-label={intl.formatMessage({ id: 'fieldNotes.roster.name' })}
              onChange={(event) => setName(event.target.value)}
            />
            <Text fontSize="xs" color="gray.600">
              {intl.formatMessage({ id: 'fieldNotes.roster.nameHelp' })}
            </Text>

            <Select
              size="sm"
              minH="44px"
              fontSize="md"
              value={farmId}
              placeholder={intl.formatMessage({ id: 'fieldNotes.roster.farm' })}
              aria-label={intl.formatMessage({ id: 'fieldNotes.roster.farm' })}
              onChange={(event) => setFarmId(event.target.value)}>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </Select>

            <Select
              size="sm"
              minH="44px"
              fontSize="md"
              value={language}
              aria-label={intl.formatMessage({ id: 'fieldNotes.roster.language' })}
              onChange={(event) => setLanguage(event.target.value as CrewSenderLanguage)}>
              {LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {intl.formatMessage({ id: `fieldNotes.roster.language.${code}` })}
                </option>
              ))}
            </Select>

            {/*
              A plain checkbox with the attestation written out, not a tick-to-continue. The person
              reading it is asserting something about somebody else, and the number cannot send until
              they do.
            */}
            <HStack align="start" spacing={2}>
              <input
                type="checkbox"
                id="crew-consent"
                checked={attested}
                style={{ marginTop: '4px', minWidth: '16px', minHeight: '16px' }}
                onChange={(event) => setAttested(event.target.checked)}
              />
              <Text as="label" htmlFor="crew-consent" fontSize="xs" color="gray.800">
                {intl.formatMessage({ id: 'fieldNotes.roster.consent' })}
              </Text>
            </HStack>

            {error && (
              <Text fontSize="xs" color="red.600">
                {error}
              </Text>
            )}

            <HStack spacing={2} flexWrap="wrap">
              <Button
                size="sm"
                minH="44px"
                colorScheme="green"
                isLoading={isCreating}
                isDisabled={!phone.trim() || !attested}
                onClick={save}>
                {intl.formatMessage({ id: 'fieldNotes.roster.save' })}
              </Button>
              <Button
                size="sm"
                minH="44px"
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  reset();
                }}>
                {intl.formatMessage({ id: 'app.cancel' })}
              </Button>
            </HStack>
          </VStack>
        )}
      </VStack>
    </StandardCard>
  );
};

export default CrewRoster;
