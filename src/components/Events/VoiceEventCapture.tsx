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
  Flex
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { StandardAlert, StandardButton } from 'components/Design/StandardComponents';
import { FaMicrophone, FaMicrophoneSlash, FaArrowRight, FaRedo } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import {
  useProcessVoiceEventWithAIMutation,
  useGetVoiceConfigQuery,
  useGetDeepgramTokenMutation
} from 'store/api/carbonApi';
import {
  postProcessTranscript,
  isRecognizedVoiceType,
  mapVoiceTypeToTemplate,
  voiceActivityLabelKey,
  VOICE_TYPE_MAP
} from 'utils/voiceDataMapper';
import { useDeepgramTranscription } from 'hooks/useDeepgramTranscription';
import { voiceLanguageFor } from 'config/voiceLanguages';
import type { VoiceFieldRequest } from 'config/events/voiceFields';

// Stable identity: a fresh `[]` default would be a new prop object on every render.
const EMPTY_FIELD_REQUESTS: VoiceFieldRequest[] = [];

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
   * The fields THIS activity records, built from the display registry
   * (`buildVoiceFieldRequests`). Sent with the request so the model is asked for
   * `low_temperature` and `protection_method` on a frost night instead of the same eight
   * generic keys it is asked for everywhere, and used again on the way back to validate the
   * answer before any of it reaches a form.
   */
  fieldRequests?: VoiceFieldRequest[];
  autoStart?: boolean;
  onClose?: () => void;
}

export const VoiceEventCapture: React.FC<VoiceEventCaptureProps> = ({
  onEventDetected,
  isActive,
  cropType,
  knownActivity = null,
  fieldRequests = EMPTY_FIELD_REQUESTS,
  autoStart = false,
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
  const hasAutoStarted = useRef(false);
  const toast = useToast();
  const intl = useIntl();

  // The farmer's own locale drives speech recognition. This used to be
  // `useState('en-US')` with a setter nothing ever called and a selector hidden behind
  // "English only" for MVP — so a Spanish-speaking crew got English transcription while
  // the landing site advertised "English and Spanish". See config/voiceLanguages.ts for
  // why Deepgram and the Web Speech API need different codes for the same locale.
  const voiceLanguage = voiceLanguageFor(intl.locale);

  // Determine which voice provider to use (deepgram vs web speech API)
  const { data: voiceConfig, isLoading: isLoadingConfig } = useGetVoiceConfigQuery();
  const useDeepgram = voiceConfig?.provider === 'deepgram';

  // RTK Query mutation hooks
  const [processVoiceEventWithAI, { isLoading: isProcessingVoice }] =
    useProcessVoiceEventWithAIMutation();
  const [getDeepgramToken] = useGetDeepgramTokenMutation();

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

  const handleDeepgramComplete = useCallback(
    (text: string) => {
      if (text && text.length > 10) {
        processVoiceInput(text);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cropType, voiceLanguage.deepgram]
  );

  const {
    isListening: deepgramListening,
    stoppedAtLimit: deepgramStoppedAtLimit,
    transcript: deepgramTranscript,
    interimTranscript: deepgramInterim,
    error: deepgramError,
    startListening: deepgramStart,
    stopListening: deepgramStop,
    resetTranscript: deepgramReset
  } = useDeepgramTranscription({
    language: voiceLanguage.deepgram,
    onTranscriptComplete: handleDeepgramComplete,
    fetchToken
  });

  // ── Unified state ──
  const listening = useDeepgram ? deepgramListening : webSpeechListening;
  const displayTranscript = useDeepgram
    ? deepgramInterim || deepgramTranscript
    : webSpeechTranscript;

  // Graceful degradation: neither Deepgram configured nor Web Speech API supported
  // (e.g. Safari/iOS without Deepgram config) — show an info Alert instead of the recorder.
  const voiceUnavailable = !isLoadingConfig && !useDeepgram && !browserSupportsSpeechRecognition;
  // Microphone permission blocked: Web Speech exposes isMicrophoneAvailable;
  // Deepgram surfaces a getUserMedia denial through its error string.
  // Was `deepgramError.toLowerCase().includes('microphone')` — a substring sniff over an
  // English sentence, which silently decided whether the farmer saw a persistent Alert or a
  // disappearing toast. The hook now returns a closed union of message ids, so this is an
  // identity check that survives translation.
  const micBlocked = useDeepgram
    ? deepgramError === 'voice.microphoneBlocked'
    : !isMicrophoneAvailable;

  // Web Speech API: auto-process when speech stops
  useEffect(() => {
    if (useDeepgram) return; // Deepgram handles this via onTranscriptComplete
    if (
      webSpeechTranscript &&
      webSpeechTranscript !== lastProcessedTranscript &&
      !webSpeechListening &&
      webSpeechTranscript.length > 10
    ) {
      processVoiceInput(webSpeechTranscript);
      setLastProcessedTranscript(webSpeechTranscript);
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
  }, [autoStart, isActive, isLoadingConfig]);

  const startListening = async () => {
    setParsedData(null);

    if (useDeepgram) {
      deepgramReset();
      await deepgramStart();
    } else {
      webSpeechResetTranscript();
      SpeechRecognition.startListening({
        continuous: false,
        language: voiceLanguage.webSpeech
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

  const processVoiceInput = async (text: string) => {
    const startTime = Date.now();
    setIsProcessing(true);
    setProcessingStage(intl.formatMessage({ id: 'voice.stage.processing' }));

    try {
      // Post-process transcript to fix common speech-to-text errors (NPK, etc.)
      const processedText = postProcessTranscript(text);

      setProcessingStage(intl.formatMessage({ id: 'voice.stage.analyzing' }));
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Use RTK Query mutation for voice processing
      const result = await processVoiceEventWithAI({
        transcript: processedText,
        crop_type: cropType,
        known_activity: knownActivity || undefined,
        requested_fields: fieldRequests.length ? fieldRequests : undefined,
        // The backend keys its GPT prompts by language FAMILY (prompt_key_for), so the raw
        // app locale is what it wants — no third code to keep in step.
        language: intl.locale,
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
      onEventDetected({ ...parsedData, requested_fields: fieldRequests });
      if (useDeepgram) {
        deepgramReset();
      } else {
        webSpeechResetTranscript();
      }
      setParsedData(null);
    }
  };

  const handleTryAgain = () => {
    // Clear AND start listening again. This used to only clear, which was half an action: the
    // farmer pressed "Try again", the result vanished, and the thing that actually re-records
    // was a second button ("Start voice input") sitting above it. Two controls for one
    // intention — and the panel is now down to one, so this has to complete the job.
    setParsedData(null);
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
      date: new Date().toISOString().split('T')[0],
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
  const formatAmountsForDisplay = (amounts: any[]): string[] => {
    if (!amounts || amounts.length === 0) return [];
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
              {intl.formatMessage({ id: 'voice.title' })}
            </Text>
            {/* Instructions for the state before recording. Once a result is on screen the
                farmer has already done this, and leaving it up put "You review every field
                before saving" on the same panel as "review every field before saving" in the
                low-confidence warning — the same sentence twice, eight lines apart. */}
            {!parsedData && (
              <Text fontSize="sm" color="gray.600">
                {intl.formatMessage({ id: 'voice.subtitle' })}
              </Text>
            )}
          </VStack>

          {/* No language selector by design: speech follows the app locale the farmer
              already chose, so there is no second place to set the same fact.

              A close control DOES belong here. `onClose` was declared as a prop and passed
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
        {!parsedData && (
          <Flex justify="center">
            <StandardButton
              variant={listening ? 'secondary' : 'primary'}
              leftIcon={<Icon as={listening ? FaMicrophoneSlash : FaMicrophone} />}
              onClick={listening ? stopListening : startListening}
              isDisabled={
                !isActive || isProcessing || isProcessingVoice || isLoadingConfig || micBlocked
              }
              size="lg"
              w={{ base: 'full', smd: 'auto' }}
              px={{ smd: 10 }}
              animation={listening ? `${pulseRing} 1.5s ease-out infinite` : undefined}>
              {intl.formatMessage({ id: listening ? 'voice.stop' : 'voice.start' })}
            </StandardButton>
          </Flex>
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

        {/* Result */}
        {parsedData && mapping && (
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

            {/* What we heard, as facts. These were painted green / blue / purple / teal /
                cyan / orange BY CATEGORY — six hues carrying no meaning in a system where
                colour means status (frontend.md), and four of them from palettes this theme
                does not define. A heard value is a plain fact: `variant="neutral"`. */}
            {(formatAmountsForDisplay(parsedData.detected_amounts).length > 0 ||
              parsedData.detected_products?.length > 0 ||
              parsedData.npk_ratio) && (
              <Flex flexWrap="wrap" gap={2}>
                {formatAmountsForDisplay(parsedData.detected_amounts).map(
                  (amount: string, index: number) => (
                    <Badge key={`amt-${index}`} variant="neutral" px={3} py={1} borderRadius="full">
                      {amount}
                    </Badge>
                  )
                )}
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
                {parsedData.application_method && (
                  <Badge variant="neutral" px={3} py={1} borderRadius="full">
                    {parsedData.application_method}
                  </Badge>
                )}
                {parsedData.water_source && (
                  <Badge variant="neutral" px={3} py={1} borderRadius="full">
                    {parsedData.water_source}
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
                  ?.filter((system: string) => {
                    const sysLower = system.toLowerCase();
                    const methodLower = (parsedData.application_method || '').toLowerCase();
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

            {/* What to do next.
                The percentage is gone from the farmer's screen. "30% confidence" is the
                model's internal number, it is not actionable, and false precision on a
                record a certifier will read is the wrong kind of confidence to display. The
                two states differ in what they ASK FOR, which is the part that changes what
                the farmer does.
                Low is a real warning and now looks like every other warning in the app
                (theme accent bar + amber ground). It used to be `yellow.100`/`yellow.700` —
                Chakra's yellow, a palette this theme does not define.

                ⛔ Nothing here during the keyword fallback. That path scores by counting
                matched keywords and caps at 75 against a 70 threshold, so the amber warning was
                effectively PERMANENT while OpenAI was unreachable — a caution the farmer cannot
                act on, sitting directly under a line that already told them what to expect
                ("matched on keywords alone — expect fewer fields filled"). Two warnings in
                three lines teaches people to read neither. */}
            {!recognized || keywordFallback ? null : parsedData.confidence >= 70 ? (
              <Text fontSize="sm" color="gray.700">
                {intl.formatMessage({ id: 'voice.confidenceHigh' })}
              </Text>
            ) : (
              <StandardAlert
                status="warning"
                mb={0}
                description={intl.formatMessage({ id: 'voice.confidenceLow' })}
              />
            )}

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
            {[
              'voice.example.fertilizer',
              'voice.example.irrigation',
              'voice.example.equipment'
            ].map((id) => (
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
