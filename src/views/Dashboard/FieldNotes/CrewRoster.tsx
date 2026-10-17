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

import { Badge, Box, Checkbox, HStack, Stack, Text, VStack, useToast } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import {
  STATUS_URGENCY_TOKENS,
  StandardButton,
  StandardCard,
  StandardInput,
  StandardSelect
} from 'components/Design/StandardComponents';
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
        isClosable: true
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
  /**
   * Whether the person has actually been told what Trazo does with their messages.
   *
   * WHY THIS IS ON THE PAGE AT ALL. Adding the roster requires ticking a box that says "I told this
   * person". Trazo then sends them the notice itself, on the operator's behalf, the first time they
   * message. Until this was rendered, `first_contact_at` was served to this component and read by
   * nothing and `consented_at` was not serialized at all, so the one thing the operator could not
   * find out was whether the promise made under their own name had been kept.
   *
   * THE FAILURE CASE IS THE POINT. A person who has sent a message and has no `first_contact_at`
   * is somebody whose notice did NOT go out: the send failed, or this deployment has no sender
   * configured. That is the row worth flagging, because the operator has attested to something
   * that did not happen and only they can chase it.
   *
   * NOTE: `consented_at` is stated as WHAT HAPPENED, never as a verdict. It records that they carried
   * on messaging after being told. The copy says that; it does not say "consented", because this
   * channel cannot observe agreement, only continuation.
   */
  const noticeState = (sender: CrewSender) => {
    if (sender.consented_at) {
      return {
        tone: 'gray.600',
        text: intl.formatMessage(
          { id: 'fieldNotes.roster.noticeAnswered' },
          {
            when: new Date(sender.first_contact_at ?? sender.consented_at).toLocaleDateString(
              intl.locale
            )
          }
        )
      };
    }
    if (sender.first_contact_at) {
      return {
        tone: 'gray.600',
        text: intl.formatMessage(
          { id: 'fieldNotes.roster.noticeSent' },
          { when: new Date(sender.first_contact_at).toLocaleDateString(intl.locale) }
        )
      };
    }
    // Only once they have actually sent something. Before that there is nothing to have failed:
    // the notice is triggered by their first message and cannot be sent ahead of it.
    if (sender.last_note_at) {
      return {
        /*
         * From review of #49, which flagged the literal `orange.600` as a foreign palette.
         *
         * It is one, and it is also the RIGHT hue: `STATUS_URGENCY_TOKENS` in the design system is
         * Chakra's orange on purpose, because the theme's own amber cannot carry text. MEASURED
         * there: amber.500 is 2.16:1 on white and even amber.900 reaches only 3.79, under the 4.5
         * small text owes. Amber is a fill ramp. So the fix is not a different colour, it is
         * taking the token the design system exports instead of writing the step out by hand,
         * which is how a literal drifts from the scale it was copied from.
         *
         * CRIT, changed from WARN on the second review of #49, which argued it better than the
         * first version of this comment did.
         *
         * The rule in CLAUDE.md keys the status colour off MEANING, not off how bad the
         * consequence is: error maps to `danger`. This row is not an in-progress condition. It
         * says the operator attested something under their own name and it did not happen, which
         * is a broken promise rather than a step still running. And on a long roster, amber
         * sitting beside a routine gray "last note" line reads as routine; this is the one row
         * that has to be chased, so it has to be the one that stands out.
         *
         * MEASURED in the token table: `crit.text` is red.700 at 4.98:1 on white, clearing the
         * 4.5 small text owes. The step is taken from the design system rather than written out.
         */
        tone: STATUS_URGENCY_TOKENS.crit.text,
        text: intl.formatMessage({ id: 'fieldNotes.roster.noticeFailed' })
      };
    }
    return null;
  };

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
            <Box
              key={sender.id}
              /*
               * A stable hook for the end-to-end suite, which otherwise has to find this row by
               * filtering `div` on its text. Every ANCESTOR div matches such a filter too, so a
               * page with several rows resolved to eleven elements and the assertion could not say
               * which row it was about. `data-testid` is already the convention here.
               */
              data-testid="crew-sender-row"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="md"
              p={3}>
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
                  {(() => {
                    const notice = noticeState(sender);
                    if (!notice) return null;
                    return (
                      <Text fontSize="xs" color={notice.tone}>
                        {notice.text}
                      </Text>
                    );
                  })()}
                </VStack>

                {sender.is_active ? (
                  <StandardButton
                    size="xs"
                    variant="outline"
                    onClick={() => deactivateSender(sender.id)}>
                    {intl.formatMessage({ id: 'fieldNotes.roster.deactivate' })}
                  </StandardButton>
                ) : (
                  <StandardButton
                    size="xs"
                    variant="outline"
                    onClick={() => updateSender({ id: sender.id, is_active: true })}>
                    {intl.formatMessage({ id: 'fieldNotes.roster.reactivate' })}
                  </StandardButton>
                )}
              </Stack>
            </Box>
          );
        })}

        {!adding && (
          <StandardButton
            size="sm"
            variant="outline"
            alignSelf="start"
            isDisabled={!companyId}
            onClick={() => setAdding(true)}>
            {intl.formatMessage({ id: 'fieldNotes.roster.add' })}
          </StandardButton>
        )}

        {adding && (
          <VStack align="stretch" spacing={2}>
            <StandardInput
              /*
                16px, because iOS Safari auto-zooms the page when a focused field is under it.
                MEASURED: Chakra's fontSizes.sm is 0.875rem and `src/` overrides no typography
                token, so CONTROL_FIELD_SX's `fontSize: 'sm'` computes to 14px. `{...props}` is
                the last spread in StandardInput, so this wins. NOTE: this is an exception to the
                app's 14px controls, kept because a crew roster is filled in on a phone. The
                app-wide fix belongs in CONTROL_FIELD_SX, not at four call sites.
              */
              fontSize="md"
              value={phone}
              placeholder={intl.formatMessage({ id: 'fieldNotes.roster.phone' })}
              aria-label={intl.formatMessage({ id: 'fieldNotes.roster.phone' })}
              onChange={(event) => setPhone(event.target.value)}
            />
            <Text fontSize="xs" color="gray.600">
              {intl.formatMessage({ id: 'fieldNotes.roster.phoneHelp' })}
            </Text>

            <StandardInput
              fontSize="md"
              value={name}
              placeholder={intl.formatMessage({ id: 'fieldNotes.roster.name' })}
              aria-label={intl.formatMessage({ id: 'fieldNotes.roster.name' })}
              onChange={(event) => setName(event.target.value)}
            />
            <Text fontSize="xs" color="gray.600">
              {intl.formatMessage({ id: 'fieldNotes.roster.nameHelp' })}
            </Text>

            <StandardSelect
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
            </StandardSelect>

            <StandardSelect
              fontSize="md"
              value={language}
              aria-label={intl.formatMessage({ id: 'fieldNotes.roster.language' })}
              onChange={(event) => setLanguage(event.target.value as CrewSenderLanguage)}>
              {LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {intl.formatMessage({ id: `fieldNotes.roster.language.${code}` })}
                </option>
              ))}
            </StandardSelect>

            {/*
              A plain checkbox with the attestation written out, not a tick-to-continue. The person
              reading it is asserting something about somebody else, and the number cannot send until
              they do.
            */}
            <Checkbox
              id="crew-consent"
              isChecked={attested}
              alignItems="flex-start"
              colorScheme="green"
              onChange={(event) => setAttested(event.target.checked)}
              /* The control keeps its own line height while the sentence wraps beside it. */
              sx={{ '.chakra-checkbox__control': { marginTop: '2px' } }}>
              <Text fontSize="xs" color="gray.800">
                {intl.formatMessage({ id: 'fieldNotes.roster.consent' })}
              </Text>
            </Checkbox>

            {error && (
              <Text fontSize="xs" color="red.600">
                {error}
              </Text>
            )}

            <HStack spacing={2} flexWrap="wrap">
              <StandardButton
                size="sm"
                isLoading={isCreating}
                isDisabled={!phone.trim() || !attested}
                onClick={save}>
                {intl.formatMessage({ id: 'fieldNotes.roster.save' })}
              </StandardButton>
              <StandardButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  reset();
                }}>
                {intl.formatMessage({ id: 'app.cancel' })}
              </StandardButton>
            </HStack>
          </VStack>
        )}
      </VStack>
    </StandardCard>
  );
};

export default CrewRoster;
