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
  mapVoiceTypeToTemplate,
  voiceActivityLabelKey
} from 'utils/voiceDataMapper';
import { useDeepgramTranscription } from 'hooks/useDeepgramTranscription';
import { voiceLanguageFor } from 'config/voiceLanguages';

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
  autoStart?: boolean;
  onClose?: () => void;
}

export const VoiceEventCapture: React.FC<VoiceEventCaptureProps> = ({
  onEventDetected,
  isActive,
  cropType,
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
      onEventDetected(parsedData);
      if (useDeepgram) {
        deepgramReset();
      } else {
        webSpeechResetTranscript();
      }
      setParsedData(null);
    }
  };

  const handleTryAgain = () => {
    setParsedData(null);
    if (useDeepgram) {
      deepgramReset();
    } else {
      webSpeechResetTranscript();
    }
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
    return amounts.map((a) => {
      if (typeof a === 'string') return a;
      if (a.value && a.unit) return `${a.value} ${a.unit}`;
      return String(a);
    });
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
            <Text fontSize="sm" color="gray.600">
              {intl.formatMessage({ id: 'voice.subtitle' })}
            </Text>
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

        {/* The one action. It was `variant="outline"` while idle and solid only once
            recording, i.e. the panel's primary control looked secondary exactly when it was
            the only thing to do. No `_hover` scale either — the theme owns hover, and
            frontend.md requires it to DARKEN rather than grow. */}
        <StandardButton
          variant={listening ? 'secondary' : 'primary'}
          leftIcon={<Icon as={listening ? FaMicrophoneSlash : FaMicrophone} />}
          onClick={listening ? stopListening : startListening}
          isDisabled={
            !isActive || isProcessing || isProcessingVoice || isLoadingConfig || micBlocked
          }
          size="lg"
          w="full"
          animation={listening ? `${pulseRing} 1.5s ease-out infinite` : undefined}>
          {intl.formatMessage({ id: listening ? 'voice.stop' : 'voice.start' })}
        </StandardButton>

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
            <Text fontWeight="semibold" color="gray.800" fontSize="md">
              {intl.formatMessage(
                { id: 'voice.understood' },
                { activity: intl.formatMessage({ id: voiceActivityLabelKey(mapping) }) }
              )}
            </Text>

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
                Chakra's yellow, a palette this theme does not define. */}
            {parsedData.confidence >= 70 ? (
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
            <HStack spacing={3}>
              <StandardButton
                variant="primary"
                rightIcon={<Icon as={FaArrowRight} />}
                onClick={handleContinueToReview}
                flex={1}>
                {intl.formatMessage({ id: 'events.voice.continueToReview' })}
              </StandardButton>
              <StandardButton
                variant="outline"
                leftIcon={<Icon as={FaRedo} />}
                onClick={handleTryAgain}>
                {intl.formatMessage({ id: 'voice.tryAgain' })}
              </StandardButton>
            </HStack>
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
