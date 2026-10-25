import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Text,
  VStack,
  HStack,
  Icon,
  Badge,
  Progress,
  Stack,
  useToast,
  Flex,
  Checkbox
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import {
  StandardAlert,
  StandardButton,
  StandardSegmentedControl
} from 'components/Design/StandardComponents';
import { FaMicrophone, FaMicrophoneSlash, FaArrowRight, FaRedo } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import {
  useProcessVoiceEventWithAIMutation,
  useGetVoiceConfigQuery,
  useGetDeepgramTokenMutation
} from 'store/api/carbonApi';
import {
  amountsActuallySpoken,
  postProcessTranscript,
  isRecognizedVoiceType,
  mapVoiceTypeToTemplate,
  voiceActivityLabelKey,
  VOICE_TYPE_MAP
} from 'utils/voiceDataMapper';
import { MIN_NOTE_CHARS, useDeepgramTranscription } from 'hooks/useDeepgramTranscription';
import {
  DEEPGRAM_AUTO_LANGUAGE,
  LOCALE_FOR_SPOKEN,
  spokenLanguageFor,
  voiceLanguageFor,
  type SpokenLanguage
} from 'config/voiceLanguages';
import {
  readVoiceLanguagePreference,
  writeVoiceLanguagePreference
} from 'utils/voiceLanguagePreference';
import type { VoiceFieldRequest } from 'config/events/voiceFields';
import {
  IRRIGATION_METHODS,
  WATER_SOURCES,
  applicationMethodLabelKey,
  type EnumOption
} from 'config/events/enums';
import { isEventOnBuyerPage } from 'utils/consumerDisplay';

// Stable identity: a fresh `[]` default would be a new prop object on every render.
const EMPTY_FIELD_REQUESTS: VoiceFieldRequest[] = [];

// A language's name in the APP's language, for sentences ("…in Spanish"). The switch itself uses
// endonyms (`voice.languageEndonym.*`). Literal ids so a key search finds every use.
const LANGUAGE_NAME_ID: Readonly<Record<SpokenLanguage, string>> = {
  en: 'voice.languageName.en',
  es: 'voice.languageName.es'
};

// Pulse animation for recording state
const pulseRing = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
  70% { box-shadow: 0 0 0 12px rgba(76, 175, 80, 0); }
  100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
`;

const pulseDot = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

interface VoiceEventCaptureProps {
  onEventDetected: (eventData: any) => void;
  isActive: boolean;
  cropType: string;
  /**
   * The activity the farmer already picked, as a VOICE_TYPE_MAP slug ("frost_protection").
   *
   * The trigger for this panel lives inside step 2, which the farmer only reaches after
   * choosing a verb tile (and a production subtype) at step 1 — so the activity is known
   * before the microphone opens. Sending it turns the model's job from "work out what this
   * is" into "pull the fields this activity records out of these words".
   *
   * ⛔ Context, never the answer: the backend still asks what the words describe, so an
   * irrigation sentence spoken into a Frost Protection form is still caught and offered as
   * a switch instead of being quietly bent to fit.
   */
  knownActivity?: string | null;
  /**
   * Whether the record being logged reaches the buyer page, decided by the wizard from its own
   * (event type, subtype) through `isEventOnBuyerPage`. Buffer use, seed search, equipment
   * cleanout and transport are certifier-only, so the notes opt-in must not promise
   * publication for them. Omitted: derived from `knownActivity` when it maps, else unknown.
   */
  notesOnBuyerPage?: boolean;
  /**
   * The fields THIS activity records, built from the display registry
   * (`buildVoiceFieldRequests`). Sent with the request so the model is asked for
   * `low_temperature` and `protection_method` on a frost night instead of the same eight
   * generic keys it is asked for everywhere, and used again on the way back to validate the
   * answer before any of it reaches a form.
   */
  fieldRequests?: VoiceFieldRequest[];
  autoStart?: boolean;
  /**
   * Text the farmer did not speak into this panel: a note pasted from elsewhere (today a crew
   * WhatsApp message, by hand). When set, the mic NEVER opens and this text is parsed once.
   *
   * The consequence is not cosmetic. Every echo gate downstream (`wasSpoken`,
   * `VOICE_ENUMS_MUST_ECHO_WORDS`, `amountsActuallySpoken`) asks "do these words appear in the
   * transcript", and voiceDataMapper.ts:1199 states the reason in its own comment: if the words
   * are absent the answer came from somewhere other than the FARMER. Those gates were written
   * against a MODEL inventing things the accountable speaker did not say. On a seeded parse the
   * speaker and the confirmer are different people, so an echo proves only that the sender said
   * it, not that it is true. The result therefore travels with `seeded: true` and the wizard
   * holds it instead of merging it (see handleVoiceEventDetected in NewEvent.jsx).
   */
  seedTranscript?: string;
  /** The seed's own language (a crew note's `transcript_language`), so it is parsed with its own
   * prompt rather than the app's. Ignored for speech. */
  seedLanguage?: string;
  /** The crew note the seed came from, so the server keeps its reading of it (audit T29). */
  seedNoteId?: string;
  onClose?: () => void;
}

export const VoiceEventCapture: React.FC<VoiceEventCaptureProps> = ({
  onEventDetected,
  isActive,
  cropType,
  knownActivity = null,
  notesOnBuyerPage,
  fieldRequests = EMPTY_FIELD_REQUESTS,
  autoStart = false,
  seedTranscript,
  seedLanguage,
  seedNoteId,
  onClose
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState('');
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [processingStage, setProcessingStage] = useState('');
  // The operation spent its daily voice budget (HTTP 429 from the backend). Not an error the
  // farmer caused and not something retrying fixes, so it replaces the recorder rather than
  // flashing a toast.
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  /**
   * Does the farmer want what they said copied into the public field notes?
   *
   * Defaults OFF, and that default is the fix. `observation` is published VERBATIM on the buyer
   * page as "Farmer's Field Notes"; voice used to fill it with the whole utterance, so a rate
   * and a tank volume the record strips as structured fields walked onto the shopper's page in
   * prose. The transcript is quoted above either way — this decides only whether it is also
   * PUBLISHED. See the notes block in voiceDataMapper.mapVoiceDataToFieldValues.
   */
  const [addTranscriptToNotes, setAddTranscriptToNotes] = useState(false);
  /**
   * Why the last recording was not parsed, when it was not: nothing heard, too little to read, or
   * words in a language the app does not serve. `null` when there is nothing to say.
   *
   * ⛔ Until 2026-09-10 a short transcript was dropped with no word to the farmer. MEASURED that
   * day through the running app: "Oh, [pause] we sprayed Entrust…" came back as "Oh,", which the
   * length gate discarded, and the panel went back to "Start voice input" as though nothing had
   * happened — reported as "it does not recognise English". A gate may refuse to spend a parse
   * on three characters; it may not do so silently.
   */
  const [voiceNotice, setVoiceNotice] = useState<{
    kind: 'nothing' | 'tooLittle' | 'unclear';
    heard: string;
  } | null>(null);
  const hasAutoStarted = useRef(false);
  // One parse per seeded text, not one per render. `parsedData` cannot serve as the guard: the
  // farmer can clear it with "Try again", and re-parsing the same note on that tap would be a
  // second billed call that answers the identical question.
  const seededParsed = useRef<string | null>(null);
  const toast = useToast();
  const intl = useIntl();

  // Determine which voice provider to use (deepgram vs web speech API)
  const { data: voiceConfig, isLoading: isLoadingConfig } = useGetVoiceConfigQuery();
  const useDeepgram = voiceConfig?.provider === 'deepgram';
  // Recognition is pinned to ONE language unless the server opts in to detection
  // (DEEPGRAM_AUTO_LANGUAGE — see config/voiceLanguages.ts for why it is not the default). An older
  // backend sends no `language_mode`; that means pinned, the behaviour it was tested with.
  const detectSpokenLanguage = useDeepgram && voiceConfig?.language_mode === 'multi';

  /**
   * The language voice LISTENS for — the farmer's own choice, else the app's language.
   *
   * It used to be the app's language, full stop (and before 2026-08-25 a hard-coded `en-US`). But
   * the app a person reads and the language they speak are different facts: Spanish spoken into
   * the English app comes back EMPTY, 8 clips in 8. Detection could not replace the choice — it
   * dropped the block from Spanish notes in the real app — so the farmer states it once with the
   * switch below and it is remembered per user on this device (utils/voiceLanguagePreference).
   */
  const currentUserId = useSelector(
    (state: { userState?: { user?: { id?: number } | null } }) => state.userState?.user?.id
  );
  const [pickedLanguage, setPickedLanguage] = useState<SpokenLanguage | null>(null);
  const listenLanguage: SpokenLanguage =
    pickedLanguage ?? readVoiceLanguagePreference(currentUserId) ?? spokenLanguageFor(intl.locale);
  // The codes each backend wants for it, and for the app locale (the keyterm prior under detection).
  const listenCodes = voiceLanguageFor(LOCALE_FOR_SPOKEN[listenLanguage]);
  const appCodes = voiceLanguageFor(intl.locale);

  // RTK Query mutation hooks
  const [processVoiceEventWithAI, { isLoading: isProcessingVoice }] =
    useProcessVoiceEventWithAIMutation();
  const [getDeepgramToken] = useGetDeepgramTokenMutation();
  // Manual 375px pass (2026-10-06): with no signal the start button looked ready and pressing it
  // did nothing; the token request failed and nothing was said. Voice needs a connection, so
  // with none the button is disabled and the reason is shown.
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false
  );
  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // ── Web Speech API (fallback) ──
  const {
    transcript: webSpeechTranscript,
    listening: webSpeechListening,
    resetTranscript: webSpeechResetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable
  } = useSpeechRecognition();

  // ── Deepgram Nova-3 ──
  const fetchToken = useCallback(async () => {
    try {
      const result = await getDeepgramToken().unwrap();
      return result.token;
    } catch (err: any) {
      // Branch on the machine-readable `code`, not the server's sentence. Server prose opts
      // the client out of i18n, and a message that only exists in English is a message a
      // Spanish-speaking farmer cannot read.
      if (err?.status === 429 && err?.data?.code === 'voice_daily_limit') {
        setDailyLimitReached(true);
      }
      throw err;
    }
  }, [getDeepgramToken]);

  /**
   * One recording's worth of text, from either provider.
   *
   * Same threshold the hook uses to decide a pause cannot end the note yet — one number. Below
   * it the farmer is told what was caught instead of the panel silently resetting.
   *
   * ⛔ A plain function, NOT a useCallback. The Deepgram handler was memoised on
   * `[cropType, voiceLanguage]` with exhaustive-deps switched off, so it kept calling the
   * `processVoiceInput` of an old render — one that posted the `knownActivity` and
   * `fieldRequests` from before the farmer answered an in-tab subtype (soil, pest, business).
   * The hook reads its callback through a ref, so a fresh identity each render costs nothing.
   */
  const handleTranscript = (text: string, spokenLanguage?: SpokenLanguage | 'other' | null) => {
    if (!text || text.length <= MIN_NOTE_CHARS) {
      setVoiceNotice({ kind: text ? 'tooLittle' : 'nothing', heard: text });
      return;
    }
    // Most words came back in a language the app does not serve — the detector's miss, not the
    // farmer's words (a heavily accented English clip was tagged Italian). Parsing it would turn
    // gibberish into field values; saying so and offering the retry is the honest answer.
    if (spokenLanguage === 'other') {
      setVoiceNotice({ kind: 'unclear', heard: text });
      return;
    }
    // Pinned: the words are in the language we listened for. Detecting: in the one Deepgram
    // reported, or — when it could not tell — the app locale (processVoiceInput's fallback).
    processVoiceInput(text, spokenLanguage ?? (detectSpokenLanguage ? null : listenLanguage));
  };

  const {
    isListening: deepgramListening,
    isStarting: deepgramStarting,
    stoppedAtLimit: deepgramStoppedAtLimit,
    transcript: deepgramTranscript,
    interimTranscript: deepgramInterim,
    error: deepgramError,
    startListening: deepgramStart,
    stopListening: deepgramStop,
    cancelListening: deepgramCancel,
    resetTranscript: deepgramReset
  } = useDeepgramTranscription({
    language: detectSpokenLanguage ? DEEPGRAM_AUTO_LANGUAGE : listenCodes.deepgram,
    keytermLanguage: detectSpokenLanguage ? appCodes.deepgram : listenCodes.deepgram,
    onTranscriptComplete: handleTranscript,
    fetchToken
  });

  // ── Unified state ──
  const listening = useDeepgram ? deepgramListening : webSpeechListening;
  // Everything heard so far, not just the segment in progress. `interim || transcript` showed
  // only the current segment, so "Oh," was replaced on screen by "We sprayed and…" — the farmer
  // never saw the text that would actually be sent.
  // A seeded parse has no recorder state, so without this the panel would quote an empty string
  // while showing chips derived from text the farmer cannot see. Whatever is parsed is shown.
  // WHAT THIS PANEL IS READING, decided once.
  //
  // 🔴 MEASURED 2026-10-20 on a WhatsApp TEXT message: the panel was headed "Voice entry" and the
  // progress line read "Analyzing your voice input…". Nobody spoke; a crew member typed, and the
  // operator opening it is reading somebody else's words. The subtitle was worse: "Describe the
  // activity and we'll fill in what we can" instructs a person who has nothing left to do.
  //
  // A crew note may itself have been an audio note, and the wording still holds: what reaches
  // this panel is its TRANSCRIPT, and what the panel does with it is read it.
  const seedSource = seedTranscript ? (seedNoteId ? 'crewNote' : 'pastedNote') : 'voice';

  const displayTranscript = seedTranscript
    ? seedTranscript
    : useDeepgram
    ? [deepgramTranscript, deepgramInterim].filter(Boolean).join(' ')
    : webSpeechTranscript;

  // Graceful degradation: neither Deepgram configured nor Web Speech API supported
  // (e.g. Safari/iOS without Deepgram config) — show an info Alert instead of the recorder.
  const voiceUnavailable = !isLoadingConfig && !useDeepgram && !browserSupportsSpeechRecognition;
  // Run 8 (R8-24): which of the start button's disabled causes applies, in the order the farmer
  // can do something about it.
  const disabledReasonId = isOffline
    ? 'voice.disabled.offline'
    : isLoadingConfig
    ? 'voice.disabled.loading'
    : isProcessing || isProcessingVoice
    ? 'voice.disabled.processing'
    : !isActive
    ? 'voice.disabled.inactive'
    : null;
  const isHarvest = /harvest|^HA$|cosecha/i.test(knownActivity || '');
  // Microphone permission blocked: Web Speech exposes isMicrophoneAvailable;
  // Deepgram surfaces a getUserMedia denial through its error string.
  // Was `deepgramError.toLowerCase().includes('microphone')` — a substring sniff over an
  // English sentence, which silently decided whether the farmer saw a persistent Alert or a
  // disappearing toast. The hook now returns a closed union of message ids, so this is an
  // identity check that survives translation.
  const micBlocked = useDeepgram
    ? deepgramError === 'voice.microphoneBlocked'
    : !isMicrophoneAvailable;

  // Web Speech API: auto-process when speech stops. Short results go through the same notice as
  // Deepgram's — this fallback dropped them silently too (the voice-config endpoint failing, e.g.
  // a 403 for a company without the voice feature, is enough to land a farmer here).
  useEffect(() => {
    if (useDeepgram) return; // Deepgram handles this via onTranscriptComplete
    if (
      webSpeechTranscript &&
      webSpeechTranscript !== lastProcessedTranscript &&
      !webSpeechListening
    ) {
      setLastProcessedTranscript(webSpeechTranscript);
      handleTranscript(webSpeechTranscript);
    }
  }, [webSpeechTranscript, webSpeechListening, useDeepgram]);

  // Show Deepgram errors as toast (mic-permission errors get a persistent Alert instead).
  // `deepgramError` is a message id, so it is translated here rather than shown raw.
  useEffect(() => {
    if (deepgramError && deepgramError !== 'voice.microphoneBlocked') {
      toast({
        title: intl.formatMessage({ id: 'voice.errorTitle' }),
        description: intl.formatMessage({ id: deepgramError }),
        status: 'warning',
        duration: 5000,
        isClosable: true
      });
    }
  }, [deepgramError, toast, intl]);

  // Auto-start recording when component mounts with autoStart=true
  // Waits for voiceConfig to load so the correct provider (Deepgram vs Web Speech) is used
  useEffect(() => {
    if (
      autoStart &&
      // A seeded parse has its text already. Opening the mic would record the room over it.
      !seedTranscript &&
      isActive &&
      !isLoadingConfig &&
      !voiceUnavailable &&
      !hasAutoStarted.current &&
      !listening &&
      !isProcessing
    ) {
      hasAutoStarted.current = true;
      // Small delay to ensure component is fully mounted and mic permissions are ready
      const timer = setTimeout(() => {
        startListening();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoStart, seedTranscript, isActive, isLoadingConfig]);

  // A seeded parse: text the farmer pasted rather than spoke. Parses once, opens no mic.
  //
  // Deliberately NOT gated on `isLoadingConfig` or `voiceUnavailable`, which the autoStart effect
  // above must wait for: both are about the RECORDER (which provider, is a mic usable), and this
  // path has no recorder. The backend feature gate still applies, because
  // POST /api/carbon/process-voice-event/ checks `has_feature("voice_recording")` itself and the
  // daily budget is charged there, so a company without voice gets the same 403 either way,
  // rather than a second, weaker copy of that rule here.
  useEffect(() => {
    const seed = (seedTranscript ?? '').trim();
    if (!seed || !isActive) return;
    if (seededParsed.current === seed) return;
    seededParsed.current = seed;
    processVoiceInput(seed, null, seedLanguage || null);
  }, [seedTranscript, isActive]);

  const startListening = async () => {
    // Every start goes through here (the button, autoStart, a language switch), so this is the
    // one place that keeps an offline device from showing "Listening..." to nobody.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setIsOffline(true);
      return;
    }
    setParsedData(null);
    setVoiceNotice(null);

    if (useDeepgram) {
      deepgramReset();
      await deepgramStart();
    } else {
      webSpeechResetTranscript();
      SpeechRecognition.startListening({
        continuous: false,
        language: listenCodes.webSpeech
      });
    }
  };

  const stopListening = () => {
    if (useDeepgram) {
      deepgramStop();
    } else {
      SpeechRecognition.stopListening();
    }
  };

  // Set when a switch interrupted a live recording, so the effect below can start it again once
  // the hook has re-rendered with the new language (starting it here would reuse the old one).
  const restartAfterSwitchRef = useRef(false);

  /**
   * The farmer picked the language they will speak.
   *
   * Mid-recording it starts over in the new language: the panel auto-starts, so the natural
   * moment to notice "it's listening in English" is while it listens, and making the farmer stop,
   * wait for a result that cannot be right, and start again would be three taps for one intent.
   * What was said so far went to the wrong model, so it is discarded, never parsed.
   */
  const switchListenLanguage = (next: SpokenLanguage) => {
    if (next === listenLanguage) return;
    writeVoiceLanguagePreference(currentUserId, next);
    const recording = useDeepgram ? deepgramListening || deepgramStarting : webSpeechListening;
    if (recording) {
      if (useDeepgram) {
        deepgramCancel();
      } else {
        webSpeechResetTranscript();
        SpeechRecognition.abortListening();
      }
      restartAfterSwitchRef.current = true;
    }
    setVoiceNotice(null);
    setPickedLanguage(next);
  };

  useEffect(() => {
    if (!restartAfterSwitchRef.current) return;
    restartAfterSwitchRef.current = false;
    startListening();
  }, [listenLanguage]);

  const processVoiceInput = async (
    text: string,
    spokenLanguage: SpokenLanguage | null = null,
    localeOverride: string | null = null
  ) => {
    const startTime = Date.now();
    setIsProcessing(true);
    setProcessingStage(intl.formatMessage({ id: 'voice.stage.processing' }));

    try {
      // Post-process transcript to fix common speech-to-text errors (NPK, etc.)
      const processedText = postProcessTranscript(text);

      setProcessingStage(intl.formatMessage({ id: `voice.stage.analyzing.${seedSource}` }));
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Use RTK Query mutation for voice processing
      const result = await processVoiceEventWithAI({
        transcript: processedText,
        crop_type: cropType,
        known_activity: knownActivity || undefined,
        field_note: seedTranscript && seedNoteId ? seedNoteId : undefined,
        requested_fields: fieldRequests.length ? fieldRequests : undefined,
        // The language the words were SPOKEN in, when Deepgram could tell — the backend picks its
        // prompt, spoken-number table and fallback keywords by it (prompt_key_for, by language
        // FAMILY), and a Spanish sentence read with the English prompt loses mappings like
        // "nebulizadora" → air_blast. Otherwise the app locale, as before.
        language:
          localeOverride || (spokenLanguage ? LOCALE_FOR_SPOKEN[spokenLanguage] : intl.locale),
        timestamp: new Date().toISOString()
      }).unwrap();

      setProcessingStage(intl.formatMessage({ id: 'voice.stage.organizing' }));
      await new Promise((resolve) => setTimeout(resolve, 300));

      const endTime = Date.now();
      const processingTimeMs = endTime - startTime;

      // Store the raw AI response - parent component handles mapping
      setParsedData({
        ...result,
        processing_time: processingTimeMs,
        original_transcript: processedText
      });
    } catch (error) {
      console.error('AI voice processing error:', error);
      if ((error as any)?.status === 429 && (error as any)?.data?.code === 'voice_daily_limit') {
        setDailyLimitReached(true);
        setIsProcessing(false);
        setProcessingStage('');
        return;
      }

      // A crew message is never read by the local keyword parser: it has no negation guard, and the
      // words are somebody else's. Nothing is offered; the confirmer reads the message (audit T29).
      if (seedTranscript) {
        setParsedData({
          type: knownActivity || 'general',
          detected_amounts: [],
          detected_products: [],
          activity_fields: {},
          manual_review: true,
          negation: '',
          original_transcript: text
        } as any);
        return;
      }

      // Fallback to local processing if AI fails
      setProcessingStage(intl.formatMessage({ id: 'voice.stage.fallback' }));
      const fallbackEvent = parseVoiceWithFallback(text);
      // Same rule the backend fallback follows: when the keywords name nothing, defer to the
      // activity the farmer already chose rather than answering "general" and filling in
      // nothing at all — and flag that it came from the form, not from the words.
      if (fallbackEvent.type === 'general' && knownActivity) {
        fallbackEvent.type = knownActivity;
        fallbackEvent.activity_from_context = true;
      }

      const endTime = Date.now();
      fallbackEvent.processing_time = endTime - startTime;

      setParsedData(fallbackEvent);
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  /**
   * Pass raw parsed data to parent component.
   * Parent (QuickAddEvent) handles mapping to form fields via voiceDataMapper.
   */
  const handleContinueToReview = () => {
    if (parsedData) {
      // The request list travels WITH the result: the parent validates `activity_fields`
      // against what was actually asked for, and a value nobody asked for never reaches a
      // form. Recomputing it there would be a second source of truth for the same fact.
      onEventDetected({
        ...parsedData,
        requested_fields: fieldRequests,
        // The tick, carried with the result. The mapper writes `observation` on this and
        // nothing else — a transcript is never published because it exists.
        note_opt_in: addTranscriptToNotes,
        // Rides along the same way, and for a sharper reason: the wizard must not merge values
        // extracted from words the confirmer did not say. See the `seedTranscript` prop note.
        seeded: Boolean(seedTranscript),
        // A seed that IS a crew note (the wizard passes its id only then), as opposed to a note
        // pasted by hand. Decides the banner's wording and whether the result is the note's
        // proposal; `seeded` alone cannot tell the two apart.
        from_crew_note: Boolean(seedTranscript && seedNoteId)
      });
      if (useDeepgram) {
        deepgramReset();
      } else {
        webSpeechResetTranscript();
      }
      setParsedData(null);
      setAddTranscriptToNotes(false);
    }
  };

  // A SEEDED result goes straight to the wizard, with no "Use these details" tap.
  //
  // That tap was a second confirmation of the same thing. MEASURED 2026-10-08 on a crew note: the
  // panel quoted the message under "What we heard" with no values beside it (an irrigation note
  // carries no chip-shaped fact), the operator tapped "Use these details", and the wizard then
  // showed the SAME quote again with "Fill in 1 value". Nothing reaches the form on the first tap
  // anyway, because `seeded: true` makes the wizard hold the result as an offer; the decision the
  // operator actually makes is on that offer. So the panel hands over and the offer is the one
  // place to decide. The spoken path is unchanged: there the tap DOES write to the form.
  useEffect(() => {
    if (!seedTranscript || !parsedData) return;
    handleContinueToReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedData, seedTranscript]);

  const handleTryAgain = () => {
    // Clear AND start listening again. This used to only clear, which was half an action: the
    // farmer pressed "Try again", the result vanished, and the thing that actually re-records
    // was a second button ("Start voice input") sitting above it. Two controls for one
    // intention — and the panel is now down to one, so this has to complete the job.
    setParsedData(null);
    // A new utterance is a new decision. Carrying the tick over would publish a sentence the
    // farmer has not read yet.
    setAddTranscriptToNotes(false);
    if (useDeepgram) {
      deepgramReset();
    } else {
      webSpeechResetTranscript();
    }
    // Same guard the recorder button carries in `isDisabled`. Without it "Try again" would
    // open the microphone in the one state where the button itself refuses to — a blocked
    // mic — and the farmer would be left on a cleared panel with no recorder in sight.
    if (micBlocked || isLoadingConfig) return;
    startListening();
  };

  /**
   * Fallback local pattern matching when AI is unavailable.
   */
  // Local last resort when the backend call fails. Deliberately takes NO language: the
  // patterns below are English-only, so accepting a language argument and ignoring it would
  // claim a capability that is not here. Spanish speech still transcribes (Deepgram es-419)
  // and still parses server-side; only this offline keyword pass is English.
  const parseVoiceWithFallback = (text: string): any => {
    const lowerText = text.toLowerCase();

    const patterns: Record<string, string[]> = {
      fertilization: [
        'fertilizer',
        'fertilize',
        'npk',
        'nitrogen',
        'phosphorus',
        'potassium',
        'urea',
        'compost',
        'manure'
      ],
      irrigation: ['irrigate', 'irrigation', 'water', 'watered', 'sprinkler', 'drip', 'flood'],
      herbicide: ['herbicide', 'weed', 'weeds'],
      fungicide: [
        'fungicide',
        'fungus',
        'mildew',
        'blight',
        'rot',
        'copper',
        'anthracnose',
        'kocide',
        'mancozeb',
        'phytophthora'
      ],
      pesticide: ['spray', 'sprayed', 'pesticide', 'insecticide', 'pest'],
      pruning: ['prune', 'pruning', 'trim', 'trimming', 'cut branches'],
      equipment: ['tractor', 'equipment', 'machine', 'fuel', 'diesel', 'mowed', 'plowed'],
      harvest: ['harvest', 'harvested', 'picked', 'collected', 'yield']
    };

    let detectedType = 'general';
    let maxMatches = 0;

    for (const [eventType, keywords] of Object.entries(patterns)) {
      const matches = keywords.filter((keyword) => lowerText.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedType = eventType;
      }
    }

    const confidence = Math.min(30 + maxMatches * 15, 75);

    // Extract amounts
    const amountRegex =
      /(\d+(?:\.\d+)?)\s*(pounds?|lbs?|kg|gallons?|liters?|hours?|acres?|hectares?)/gi;
    const detected_amounts: Array<{ value: number; unit: string; category: string }> = [];
    let match;
    while ((match = amountRegex.exec(text)) !== null) {
      const value = parseFloat(match[1]);
      const rawUnit = match[2].toLowerCase();
      let category = 'unknown';
      if (['pound', 'pounds', 'lbs', 'lb', 'kg'].includes(rawUnit)) category = 'weight';
      else if (['gallon', 'gallons', 'liter', 'liters'].includes(rawUnit)) category = 'volume';
      else if (['hour', 'hours'].includes(rawUnit)) category = 'time';
      else if (['acre', 'acres', 'hectare', 'hectares'].includes(rawUnit)) category = 'area';
      detected_amounts.push({ value, unit: rawUnit, category });
    }

    // Extract NPK ratio
    const npkMatch = text.match(/(\d{1,2})-(\d{1,2})-(\d{1,2})/);
    const npk_ratio = npkMatch ? `${npkMatch[1]}-${npkMatch[2]}-${npkMatch[3]}` : null;

    return {
      type: detectedType,
      description: text.charAt(0).toUpperCase() + text.slice(1),
      detected_amounts,
      detected_products: [],
      detected_systems: [],
      confidence,
      npk_ratio,
      concentration: npk_ratio,
      commercial_name: null,
      application_method: null,
      water_source: null,
      area_covered: null,
      duration: null,
      fuel_amount: null,
      source: 'pattern_matching_fallback',
      original_transcript: text
    };
  };

  /** Format detected amounts for display */
  /**
   * The application method, in the farmer's language.
   *
   * 🔴 MEASURED 2026-09-03 on a Spanish record: the chip read **air_blast**. The farmer had said
   * "con nebulizadora"; this panel is headed "Esto es lo que escuchamos", and what it showed
   * them was our internal enum key. It looked fine until that morning only because the parser
   * used to answer free text — the farmer's own word — so there was never anything to translate.
   * Teaching it to answer catalogue values (so the method could actually reach the form) turned
   * a passthrough into a leak.
   *
   * Falls back to the raw string for anything outside the catalogue, which is legacy free text
   * and therefore already the grower's own wording.
   */
  const catalogueLabel = (
    value: string | null | undefined,
    options: readonly EnumOption[]
  ): string | null => {
    const option = options.find((o) => o.value === value);
    return option ? intl.formatMessage({ id: option.labelKey, defaultMessage: value ?? '' }) : null;
  };
  const applicationMethodLabel = (value: string | null | undefined): string => {
    if (!value) return '';
    const labelKey = applicationMethodLabelKey(value);
    return labelKey ? intl.formatMessage({ id: labelKey, defaultMessage: value }) : value;
  };
  /**
   * A detected system ("drip"), in the farmer's language when it is a catalogue value. It was
   * printed raw, so a Spanish page read "drip" under "Esto es lo que escuchamos" (2026-10-24).
   */
  const systemLabel = (value: string): string =>
    catalogueLabel(value, IRRIGATION_METHODS) ??
    (applicationMethodLabelKey(value) ? applicationMethodLabel(value) : value);
  const applicationMethodChip = applicationMethodLabel(parsedData?.application_method);

  const formatAmountsForDisplay = (amounts: any[]): string[] => {
    if (!amounts || amounts.length === 0) return [];
    // Same filter the form values go through: an amount whose UNIT was never spoken was
    // assembled, not heard. MEASURED 2026-09-01 — "Kocide three thousand dot o" (the product
    // name, as speech-to-text wrote "Kocide 3000-O") produced a "3000 gallons" chip beside the
    // real "3.5 lbs", from a sentence in which nobody said gallons.
    amounts = amountsActuallySpoken(amounts, parsedData?.original_transcript || '');
    // Deduplicated: "apply 200 pounds ... apply it, 200 pounds" is one fact said twice, and it
    // rendered as two identical "200 lbs" chips, which reads as two hundred-pound applications.
    return [
      ...new Set(
        amounts.map((a) => {
          if (typeof a === 'string') return a;
          if (a.value && a.unit) return `${a.value} ${a.unit}`;
          return String(a);
        })
      )
    ];
  };

  // The parser may answer the time ONLY in `duration` (MEASURED 2026-10-24: "around 3 hours"
  // filled the hours and showed no chip, while the same sentence a minute earlier had put it in
  // `detected_amounts` too). Shown once either way.
  const TIME_UNIT = /^(hours?|hrs?|horas?|minutes?|mins?|minutos?)$/i;
  const spokenDuration =
    parsedData?.duration &&
    typeof parsedData.duration === 'object' &&
    parsedData.duration.value != null &&
    !(parsedData.detected_amounts ?? []).some(
      (a: any) => typeof a === 'object' && TIME_UNIT.test(String(a?.unit ?? ''))
    )
      ? [parsedData.duration]
      : [];
  const amountChips = formatAmountsForDisplay([
    ...(parsedData?.detected_amounts ?? []),
    ...spokenDuration
  ]);

  // Spent for the day. Says what still works: voice is an accelerator, and the form and the
  // templates are always open — so this is a pause, not a wall.
  // Both dead ends below REPLACE the panel — and the panel itself replaced the "Fill by
  // voice" / "Use template" buttons in NewEvent. A bare Alert therefore strands the farmer
  // with no route back to the form, which is the same trap `onClose` was left in. Every exit
  // carries its own way out.
  const exitNotice = (status: 'warning' | 'info', messageId: string) => (
    <StandardAlert status={status} mb={0}>
      <Text fontSize="sm">{intl.formatMessage({ id: messageId })}</Text>
      {onClose && (
        <Button size="sm" variant="ghost" colorScheme="gray" minH="44px" onClick={onClose}>
          {intl.formatMessage({ id: 'voice.close' })}
        </Button>
      )}
    </StandardAlert>
  );

  if (dailyLimitReached) {
    return exitNotice('warning', 'voice.dailyLimitReached');
  }

  // Graceful degradation: replace the recorder with an info Alert when voice can't work here
  if (voiceUnavailable) {
    return exitNotice('info', 'voice.unavailableInBrowser');
  }

  const mapping = parsedData ? mapVoiceTypeToTemplate(parsedData.type) : null;
  // The backend could not place the words either, and answered with the activity the farmer
  // picked in step 1 rather than with "general". That is the honest default — the farmer did
  // tell us — but it is NOT a detection, and printing "Sounds like: Frost protection" over it
  // would credit the parser with something it never worked out.
  const activityFromContext = parsedData?.activity_from_context === true;
  // `general` is what the parser answers when it could not place the utterance at all — it
  // is ignorance, not a detection, and "Sounds like: Other activity" read as the latter.
  const recognized = !!parsedData && isRecognizedVoiceType(parsedData.type) && !activityFromContext;
  // The backend answers with keyword matching when OpenAI is unreachable (and the panel has
  // its own local fallback for a failed request). Both produce a real-looking result with no
  // structured fields — no amounts, no method, no duration — so a farmer comparing what they
  // said against what arrived has no way to tell a degraded parse from a bad one.
  const keywordFallback = parsedData?.source === 'pattern_matching_fallback';
  // Compared as (event type, subtype), never as slugs: `fertilization` and `fertilizer` are two
  // names for the same activity, and comparing the names would call that a disagreement.
  const chosenMapping = knownActivity ? VOICE_TYPE_MAP[knownActivity] : null;
  const disagreesWithChosenActivity =
    recognized &&
    !!mapping &&
    !!chosenMapping &&
    (mapping.backendEventType !== chosenMapping.backendEventType ||
      mapping.backendSubtype !== chosenMapping.backendSubtype);
  // Name the heard activity when it DISAGREES with the one being logged — or when there is
  // nothing to disagree with. Soil, pest and business ask their subtype inside the tab, so voice
  // can run before the activity is known; there "Sounds like: Compost application" is the only
  // statement of what was understood, and suppressing it as "something you already know" would
  // be suppressing something the farmer has not been told.
  const showHeardActivity = recognized && (!chosenMapping || disagreesWithChosenActivity);
  // Who reads the notes is decided by the record being SAVED, not by what the parser heard: a
  // Harvest misheard as a cleanout still publishes its notes. The certifier-only wording shows
  // only when the chosen record is withheld AND the parser did not recognise a published
  // activity the farmer could still switch to. In doubt, the buyer-page warning stays.
  const chosenOnBuyerPage =
    notesOnBuyerPage ??
    (chosenMapping
      ? isEventOnBuyerPage({
          event_type: chosenMapping.backendEventType,
          production_type: chosenMapping.backendSubtype
        })
      : undefined);
  const heardOnBuyerPage = mapping
    ? isEventOnBuyerPage({
        event_type: mapping.backendEventType,
        production_type: mapping.backendSubtype
      })
    : true;
  const notesCertifierOnly =
    chosenOnBuyerPage === undefined
      ? recognized && !heardOnBuyerPage
      : !chosenOnBuyerPage && !(recognized && heardOnBuyerPage);

  return (
    /*
      ONE container. This panel used to be a <Card> mounted inside the step-2 <Card>, with a
      green.50 result <Box> (2px border) inside that and a tinted confidence <Box> inside
      THAT — four nested surfaces for one interaction. Regions are separated by a rule now,
      not by another card.
    */
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="lg"
      bg="white"
      p={{ base: 4, md: 5 }}>
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between" align="start" spacing={3}>
          <VStack align="start" spacing={1}>
            {/* Not green. Sibling headings on this page ("Activity details", "Activity
                Basics") are gray.800; a green one here reads as a different hierarchy and
                spends the brand colour on a label instead of on an action. */}
            <Text fontSize="md" fontWeight="semibold" color="gray.800">
              {intl.formatMessage({ id: `voice.title.${seedSource}` })}
            </Text>
            {/* Instructions for the state before recording. Once a result is on screen the
                farmer has already done this, and leaving it up put "You review every field
                before saving" on the same panel as "review every field before saving" in the
                low-confidence warning — the same sentence twice, eight lines apart. */}
            {!parsedData && (
              <Text fontSize="sm" color="gray.600">
                {intl.formatMessage({ id: `voice.subtitle.${seedSource}` })}
              </Text>
            )}
          </VStack>

          {/* A close control DOES belong here. `onClose` was declared as a prop and passed
              by NewEvent, and nothing ever called it — so opening "Fill by voice" started
              the microphone with no way back to the form short of leaving the page.

              Grey, not green: green is for the actions in this panel, and a bare green word
              in the corner competes with the one button the farmer is meant to press. */}
          {onClose && (
            <Button
              size="sm"
              variant="ghost"
              colorScheme="gray"
              minH="44px"
              flexShrink={0}
              onClick={() => {
                if (listening) stopListening();
                onClose();
              }}
              aria-label={intl.formatMessage({ id: 'voice.close' })}>
              {intl.formatMessage({ id: 'voice.close' })}
            </Button>
          )}
        </HStack>

        {/* The language to SPEAK in (listenLanguage). Above the button because it decides what
            the button does, and visible while recording so the farmer can see what it is
            listening for — changing it then starts over in the new language.
            Names are ENDONYMS ("Español" in the English app too): a switch is for the person who
            cannot use the current language, so each option has to be readable to its speakers.
            Hidden when the server has recognition detect the language itself. */}
        {/* Not on a seeded parse: nobody is going to speak, and the note is read in its own
            language (`seedLanguage`), so the switch would change nothing it claims to. */}
        {!detectSpokenLanguage && !seedTranscript && (
          <HStack justify="center" spacing={3} flexWrap="wrap">
            <Text fontSize="sm" color="gray.700">
              {intl.formatMessage({ id: 'voice.speakIn' })}
            </Text>
            <StandardSegmentedControl<SpokenLanguage>
              options={[
                { key: 'en', label: intl.formatMessage({ id: 'voice.languageEndonym.en' }) },
                { key: 'es', label: intl.formatMessage({ id: 'voice.languageEndonym.es' }) }
              ]}
              value={listenLanguage}
              onChange={switchListenLanguage}
              ariaLabel={intl.formatMessage({ id: 'voice.speakIn' })}
              stretchOnMobile={false}
            />
          </HStack>
        )}

        {/* Microphone permission blocked */}
        {micBlocked && (
          <StandardAlert
            status="warning"
            mb={0}
            description={intl.formatMessage({ id: 'voice.microphoneBlocked' })}
          />
        )}

        {/* ONE primary per surface, and it moves.
            Before a result exists this IS the only thing to do, so it is the primary. Once a
            result arrives it is hidden: "Try again" below does the same job, and leaving both
            on screen put two full-width solid greens in one panel with the loud one attached
            to the action the farmer had already taken. The panel then has exactly one primary —
            "Continue to Review".

            Not full-width past mobile either. A 1500px button with a centred label is a phone
            pattern rendered on a laptop; the size of a control should track its importance,
            not the width of its container. */}
        {/* Never on a seeded parse: the panel is documented never to open a mic over text it was
            given, and a disabled "Start voice input" under a crew message read as broken. */}
        {!parsedData && !seedTranscript && (
          <Flex justify="center">
            <StandardButton
              variant={listening ? 'secondary' : 'primary'}
              leftIcon={<Icon as={listening ? FaMicrophoneSlash : FaMicrophone} />}
              onClick={listening ? stopListening : startListening}
              isDisabled={
                !isActive ||
                isProcessing ||
                isProcessingVoice ||
                isLoadingConfig ||
                micBlocked ||
                (isOffline && !listening)
              }
              size="lg"
              w={{ base: 'full', smd: 'auto' }}
              px={{ smd: 10 }}
              animation={listening ? `${pulseRing} 1.5s ease-out infinite` : undefined}>
              {intl.formatMessage({ id: listening ? 'voice.stop' : 'voice.start' })}
            </StandardButton>
          </Flex>
        )}

        {/* Run 8 (R8-24): a disabled start button said nothing about why. Each cause gets a
            line; a blocked microphone already has its own alert above. */}
        {/* Not while reading: the processing panel below already says so (review of app #80). */}
        {!parsedData &&
          !seedTranscript &&
          !listening &&
          !micBlocked &&
          !isProcessing &&
          !isProcessingVoice &&
          disabledReasonId && (
            <Text fontSize="sm" color="gray.600" textAlign="center" role="status">
              {intl.formatMessage({ id: disabledReasonId })}
            </Text>
          )}

        {/* Why the last recording was not read — said, never swallowed. Directly under the
            button that fixes it. "Nothing" names the language it listened for and points at the
            switch, because the likeliest cause is speaking the other one (Spanish into the
            English model comes back empty); under detection a mismatch cannot be the cause. */}
        {voiceNotice && !listening && !parsedData && !isProcessing && (
          <StandardAlert
            status="warning"
            mb={0}
            description={
              voiceNotice.kind === 'tooLittle'
                ? intl.formatMessage({ id: 'voice.heardTooLittle' }, { heard: voiceNotice.heard })
                : voiceNotice.kind === 'unclear'
                ? intl.formatMessage({ id: 'voice.heardUnclear' })
                : detectSpokenLanguage
                ? intl.formatMessage({ id: 'voice.heardNothingAuto' })
                : intl.formatMessage(
                    { id: 'voice.heardNothing' },
                    { language: intl.formatMessage({ id: LANGUAGE_NAME_ID[listenLanguage] }) }
                  )
            }
          />
        )}

        {/* Processing — a transient state, not a success. It was a green.50 panel, which is
            the colour this system reserves for done. */}
        {(isProcessing || isProcessingVoice) && (
          <VStack spacing={2} align="stretch">
            <Progress colorScheme="green" size="xs" isIndeterminate borderRadius="full" />
            <Text fontSize="sm" color="gray.700" textAlign="center">
              {processingStage ||
                intl.formatMessage({
                  id: isProcessingVoice ? 'voice.stage.processing' : 'voice.stage.generic'
                })}
            </Text>
          </VStack>
        )}

        {/* Listening — same reasoning: no green ground. The pulsing dot is green.600, which
            clears the 3:1 non-text floor; green.500 does not. */}
        {listening && (
          <VStack spacing={2} align="center">
            <HStack spacing={2}>
              <Box
                w="10px"
                h="10px"
                borderRadius="full"
                bg="green.600"
                animation={`${pulseDot} 1.2s ease-in-out infinite`}
              />
              <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                {intl.formatMessage({ id: 'voice.listening' })}
              </Text>
            </HStack>
            {displayTranscript && (
              <Text fontSize="sm" fontStyle="italic" color="gray.700" textAlign="center">
                “{displayTranscript}”
              </Text>
            )}
            <Text fontSize="xs" color="gray.500">
              {intl.formatMessage({ id: 'voice.speakNaturally' })}
            </Text>
          </VStack>
        )}

        {/* Result. Spoken only: a seeded result is handed to the wizard as soon as it exists
            (see the effect after handleContinueToReview), so it never waits here. */}
        {parsedData && mapping && !seedTranscript && (
          <VStack spacing={3} align="stretch" borderTopWidth="1px" borderColor="gray.200" pt={4}>
            {/* No check icon and no latency badge.
                - The check asserted CORRECTNESS the parser cannot claim; it was rendered in
                  green.500 at 70%+ and yellow.500 below, i.e. a success glyph tinted with a
                  warning, on a green ground that said the opposite of the copy under it.
                - "⚡ 5687ms" was developer telemetry in a farmer's field of view, dressed as
                  a green (= good) badge while reporting five and a half seconds. The number
                  is still measured and still posted to the backend as `processing_time`. */}
            {/* "Sounds like: Frost Protection" on a page titled "Log activity — Frost
                protection", at step 2 of 3, tells the farmer something they chose themselves
                one step ago. It is a leftover from when voice ran BEFORE the activity was
                known and its job was to announce the detection.
                It still earns its place in exactly one case: when the words describe a
                DIFFERENT activity than the one being logged. That is the case the switch offer
                exists for, and naming it here is the first the farmer hears of it. Otherwise
                the heading introduces what follows — the transcript and what was picked out of
                it — instead of restating the page title. */}
            <Text fontWeight="semibold" color="gray.800" fontSize="md">
              {!recognized
                ? intl.formatMessage({ id: 'voice.notUnderstood' })
                : showHeardActivity
                ? intl.formatMessage(
                    { id: 'voice.understood' },
                    { activity: intl.formatMessage({ id: voiceActivityLabelKey(mapping) }) }
                  )
                : intl.formatMessage({ id: 'voice.heardHeading' })}
            </Text>

            {/* Degraded parse. Named, because it changes what the farmer should expect: the
                keyword pass fills almost nothing, and silence here reads as "voice is bad"
                rather than "the assistant is down". */}
            {keywordFallback && (
              <Text fontSize="xs" color="gray.700">
                {intl.formatMessage({ id: 'voice.keywordFallbackNote' })}
              </Text>
            )}

            {/* We are using the farmer's own choice because the words did not name an
                activity. Said out loud, so "Frost Protection" on screen is never mistaken for
                something the microphone worked out. */}
            {activityFromContext && (
              <Text fontSize="xs" color="gray.700">
                {intl.formatMessage(
                  { id: 'voice.activityFromContext' },
                  { activity: intl.formatMessage({ id: voiceActivityLabelKey(mapping) }) }
                )}
              </Text>
            )}

            {/* Cut short by MAX_SESSION_MS rather than by a pause. Say so, or the
                farmer reads a half-captured note as a transcription failure. */}
            {deepgramStoppedAtLimit && (
              <Text fontSize="xs" color="gray.700">
                {intl.formatMessage({ id: 'voice.stoppedAtLimit' })}
              </Text>
            )}

            {/* Original transcript */}
            <Text fontSize="sm" color="gray.600" fontStyle="italic">
              “{parsedData.original_transcript || parsedData.description}”
            </Text>

            {/* Publishing the sentence is a SEPARATE act from saying it.
                The box is unticked, and it says what ticking it does: field notes are the one
                thing the buyer page prints in the grower's own words, verbatim. Voice used to
                do this silently, which is how a spray rate and a tank volume reached shoppers
                in prose on a record that strips both as columns.
                44px on the label row rather than a taller control: the touch target is the
                whole line, which is what a thumb finds in an orchard. */}
            {/* NEVER OFFERED ON A SEEDED PARSE (2026-09-24, fresh-eyes review).
                `observation` is the one box of farmer prose that reaches the ANONYMOUS buyer page,
                rendered in quotation marks under "Farmer's Field Notes", and on save it is copied
                into `description` too, a § 205.103(b)(2) record. On a pasted note those words
                belong to a crew member who never agreed to be published, are unredacted (names and
                phone numbers included), and are not the grower's own statement. The label even
                says "what I said". The grower cannot consent on the sender's behalf, so the tick
                is withheld rather than relabelled: there is no wording that makes publishing a
                third party's message under the farmer's byline correct. */}
            {(parsedData as any).manual_review && (
              <Text fontSize="sm" color="gray.800" data-testid="voice-manual-review">
                {intl.formatMessage({ id: 'voice.manualReview' })}
              </Text>
            )}
            {!seedTranscript && (parsedData.original_transcript || '').trim() && (
              <Checkbox
                isChecked={addTranscriptToNotes}
                onChange={(e) => setAddTranscriptToNotes(e.target.checked)}
                colorScheme="green"
                alignItems="flex-start"
                sx={{ '.chakra-checkbox__control': { marginTop: '2px' } }}
                minH="44px"
                py={1}>
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" color="gray.800">
                    {intl.formatMessage({ id: 'voice.notesOptIn.label' })}
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    {/* Certifier-only records (buffer use, seed search, cleanout, transport)
                        are withheld from the buyer page whole; see notesCertifierOnly. */}
                    {intl.formatMessage({
                      id: notesCertifierOnly
                        ? 'voice.notesOptIn.helpCertifierOnly'
                        : 'voice.notesOptIn.help'
                    })}
                  </Text>
                </VStack>
              </Checkbox>
            )}

            {/* What we heard, as facts. These were painted green / blue / purple / teal /
                cyan / orange BY CATEGORY — six hues carrying no meaning in a system where
                colour means status (frontend.md), and four of them from palettes this theme
                does not define. A heard value is a plain fact: `variant="neutral"`. */}
            {(amountChips.length > 0 ||
              parsedData.detected_products?.length > 0 ||
              parsedData.npk_ratio) && (
              <Flex flexWrap="wrap" gap={2}>
                {amountChips.map((amount: string, index: number) => (
                  <Badge key={`amt-${index}`} variant="neutral" px={3} py={1} borderRadius="full">
                    {amount}
                  </Badge>
                ))}
                {parsedData.detected_products
                  ?.filter(
                    (product: string) =>
                      !(
                        parsedData.npk_ratio &&
                        /^NPK[\s\d-]*$/i.test(
                          product.replace(/with values|values|fertilizer/gi, '').trim()
                        )
                      )
                  )
                  .map((product: string, index: number) => (
                    <Badge
                      key={`prod-${index}`}
                      variant="neutral"
                      px={3}
                      py={1}
                      borderRadius="full">
                      {product}
                    </Badge>
                  ))}
                {parsedData.npk_ratio && (
                  <Badge variant="neutral" px={3} py={1} borderRadius="full">
                    NPK {parsedData.npk_ratio}
                  </Badge>
                )}
                {applicationMethodChip && (
                  <Badge variant="neutral" px={3} py={1} borderRadius="full">
                    {applicationMethodChip}
                  </Badge>
                )}
                {parsedData.water_source && (
                  <Badge variant="neutral" px={3} py={1} borderRadius="full">
                    {/* A catalogue value ("well_groundwater") reads as its label; anything else
                        is the grower's own wording and stays as said. */}
                    {catalogueLabel(parsedData.water_source, WATER_SOURCES) ??
                      parsedData.water_source}
                  </Badge>
                )}
                {parsedData.commercial_name &&
                  !parsedData.detected_products?.some(
                    (p: string) => p.toLowerCase() === parsedData.commercial_name?.toLowerCase()
                  ) && (
                    <Badge variant="neutral" px={3} py={1} borderRadius="full">
                      {parsedData.commercial_name}
                    </Badge>
                  )}
                {parsedData.detected_systems
                  ?.map((system: string) => systemLabel(system))
                  .filter((system: string) => {
                    const sysLower = system.toLowerCase();
                    // Compare against the LABEL, not just the stored code. Since the parser
                    // started answering with catalogue values, `air_blast` no longer overlaps
                    // with the Spanish word the farmer used, so the same fact would print twice.
                    const methodLower = (applicationMethodChip || '').toLowerCase();
                    // Skip if it overlaps with application_method (e.g., "drip irrigation" vs "drip")
                    if (
                      methodLower &&
                      (sysLower.includes(methodLower) || methodLower.includes(sysLower))
                    )
                      return false;
                    // Skip generic low-value systems
                    if (['pump', 'engine', 'motor', 'hose'].includes(sysLower)) return false;
                    return true;
                  })
                  .map((system: string, index: number) => (
                    <Badge key={`sys-${index}`} variant="neutral" px={3} py={1} borderRadius="full">
                      {system}
                    </Badge>
                  ))}
              </Flex>
            )}

            {/*
              ⛔ NOTHING between the chips and the buttons. There used to be a confidence
              block here: a plain line at >= 70 ("Review and confirm the details below before
              saving") and an amber alert below it ("Some details may be wrong or missing —
              review every field before saving").

              Removed 2026-09-03, on the screen, because the two branches ASK FOR THE SAME
              THING. Both say review before saving, which is what this wizard is: voice
              suggests, the farmer confirms every field on the form, and nothing here is saved
              until they do. So the alert was not information about this parse — it was the
              product's own contract, restated in amber, and it changed nothing the farmer
              would do.

              It also cost the most on the screen it mattered least on. The panel already
              carries three real, specific notices for the states that DO change what to expect
              (`keywordFallbackNote`, `activityFromContext`, `stoppedAtLimit`), each one plain
              xs text. This one alone was a full alert box, and with the field-notes checkbox
              added above it the result panel had four stacked blocks of prose around two
              buttons. The file's own note two comments up is the rule being applied: "two
              warnings in three lines teaches people to read neither."

              `parsedData.confidence` is still parsed and still posted; it simply has no
              renderer. Bringing one back means finding a state where the farmer would act
              differently, and saying THAT.
            */}

            {/* Continue leads; the arrow trails the label, matching the wizard's own
                Continue button rather than pointing backwards into it. */}
            {/* `flex={1}` stretched Continue to ~1270px beside a 230px Try again — a 5:1 ratio
                that read as "the other one barely counts", on a panel whose own headline may be
                saying it could not tell what the farmer said. Natural widths; full width only
                on a phone, where a thumb needs the target. */}
            <Stack direction={{ base: 'column', smd: 'row' }} spacing={3}>
              <StandardButton
                variant="primary"
                rightIcon={<Icon as={FaArrowRight} />}
                onClick={handleContinueToReview}
                w={{ base: 'full', smd: 'auto' }}>
                {intl.formatMessage({ id: 'events.voice.useTheseDetails' })}
              </StandardButton>
              <StandardButton
                variant="outline"
                leftIcon={<Icon as={FaRedo} />}
                onClick={handleTryAgain}
                w={{ base: 'full', smd: 'auto' }}>
                {intl.formatMessage({ id: 'voice.tryAgain' })}
              </StandardButton>
            </Stack>
          </VStack>
        )}

        {/* Examples — three identical microphone bullets in green.400 (2.2:1) were decoration
            repeating the icon on the button above. The examples are the content; the quotes
            already mark them as speech. */}
        {!listening && !isProcessing && !isProcessingVoice && !parsedData && (
          <VStack align="stretch" spacing={1} borderTopWidth="1px" borderColor="gray.200" pt={4}>
            <Text fontSize="sm" fontWeight="semibold" color="gray.700">
              {intl.formatMessage({ id: 'voice.trySaying' })}
            </Text>
            {(isHarvest
              ? ['voice.example.harvest', 'voice.example.harvestMethod']
              : ['voice.example.fertilizer', 'voice.example.irrigation', 'voice.example.equipment']
            ).map((id) => (
              <Text key={id} fontSize="sm" color="gray.600" fontStyle="italic">
                {intl.formatMessage({ id })}
              </Text>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
};
