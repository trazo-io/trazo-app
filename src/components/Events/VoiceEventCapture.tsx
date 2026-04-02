import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Text,
  VStack,
  HStack,
  Icon,
  Alert,
  AlertIcon,
  Spinner,
  Badge,
  Progress,
  List,
  ListItem,
  ListIcon,
  useToast,
  Tooltip,
  Select,
  Flex,
  useColorModeValue
} from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaCheckCircle,
  FaExclamationTriangle,
  FaGlobe,
  FaArrowRight,
  FaBolt,
  FaRedo
} from 'react-icons/fa';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import {
  useProcessVoiceEventWithAIMutation,
  useGetVoiceConfigQuery,
  useGetDeepgramTokenMutation
} from 'store/api/carbonApi';
import { postProcessTranscript, mapVoiceTypeToTemplate } from 'utils/voiceDataMapper';
import { useDeepgramTranscription } from 'hooks/useDeepgramTranscription';

interface VoiceEventCaptureProps {
  onEventDetected: (eventData: any) => void;
  isActive: boolean;
  cropType: string;
  onClose?: () => void;
}

export const VoiceEventCapture: React.FC<VoiceEventCaptureProps> = ({
  onEventDetected,
  isActive,
  cropType,
  onClose
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState('');
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [processingStage, setProcessingStage] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'en-US' | 'es-ES' | 'pt-BR'>('en-US');
  const [processingTime, setProcessingTime] = useState(0);
  const toast = useToast();

  // Determine which voice provider to use (deepgram vs web speech API)
  const { data: voiceConfig } = useGetVoiceConfigQuery();
  const useDeepgram = voiceConfig?.provider === 'deepgram';

  // RTK Query mutation hooks
  const [processVoiceEventWithAI, { isLoading: isProcessingVoice }] =
    useProcessVoiceEventWithAIMutation();
  const [getDeepgramToken] = useGetDeepgramTokenMutation();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // ── Web Speech API (fallback) ──
  const {
    transcript: webSpeechTranscript,
    listening: webSpeechListening,
    resetTranscript: webSpeechResetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // ── Deepgram Nova-3 ──
  const fetchToken = useCallback(async () => {
    const result = await getDeepgramToken().unwrap();
    return result.token;
  }, [getDeepgramToken]);

  const handleDeepgramComplete = useCallback(
    (text: string) => {
      if (text && text.length > 10) {
        processVoiceInput(text);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cropType, selectedLanguage]
  );

  const {
    isListening: deepgramListening,
    transcript: deepgramTranscript,
    interimTranscript: deepgramInterim,
    error: deepgramError,
    startListening: deepgramStart,
    stopListening: deepgramStop,
    resetTranscript: deepgramReset
  } = useDeepgramTranscription({
    language: selectedLanguage,
    onTranscriptComplete: handleDeepgramComplete,
    fetchToken
  });

  // ── Unified state ──
  const listening = useDeepgram ? deepgramListening : webSpeechListening;
  const currentTranscript = useDeepgram
    ? deepgramTranscript
    : webSpeechTranscript;
  const displayTranscript = useDeepgram
    ? deepgramInterim || deepgramTranscript
    : webSpeechTranscript;

  const languageOptions = [
    { value: 'en-US', label: 'English', flag: 'US' },
    { value: 'es-ES', label: 'Espanol', flag: 'ES' },
    { value: 'pt-BR', label: 'Portugues', flag: 'BR' }
  ];

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

  // Show Deepgram errors as toast
  useEffect(() => {
    if (deepgramError) {
      toast({
        title: 'Voice Connection Error',
        description: deepgramError,
        status: 'warning',
        duration: 5000,
        isClosable: true
      });
    }
  }, [deepgramError, toast]);

  const startListening = async () => {
    setParsedData(null);
    setProcessingTime(0);

    if (useDeepgram) {
      deepgramReset();
      await deepgramStart();
    } else {
      webSpeechResetTranscript();
      SpeechRecognition.startListening({
        continuous: false,
        language: selectedLanguage
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
    setProcessingStage('Processing with AI...');

    try {
      // Post-process transcript to fix common speech-to-text errors (NPK, etc.)
      const processedText = postProcessTranscript(text);

      setProcessingStage('Analyzing your voice input...');
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Use RTK Query mutation for voice processing
      const result = await processVoiceEventWithAI({
        transcript: processedText,
        crop_type: cropType,
        language: selectedLanguage,
        timestamp: new Date().toISOString()
      }).unwrap();

      setProcessingStage('Organizing event details...');
      await new Promise((resolve) => setTimeout(resolve, 300));

      const endTime = Date.now();
      const processingTimeMs = endTime - startTime;
      setProcessingTime(processingTimeMs);

      // Store the raw AI response - parent component handles mapping
      setParsedData({
        ...result,
        processing_time: processingTimeMs,
        original_transcript: processedText
      });
    } catch (error) {
      console.error('AI voice processing error:', error);

      // Fallback to local processing if AI fails
      setProcessingStage('Using fallback processing...');
      const fallbackEvent = parseVoiceWithFallback(text, selectedLanguage);

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
    setProcessingTime(0);
  };

  /**
   * Fallback local pattern matching when AI is unavailable.
   */
  const parseVoiceWithFallback = (text: string, language: string): any => {
    const lowerText = text.toLowerCase();

    const patterns: Record<string, string[]> = {
      fertilization: ['fertilizer', 'fertilize', 'npk', 'nitrogen', 'phosphorus', 'potassium', 'urea', 'compost', 'manure'],
      irrigation: ['irrigate', 'irrigation', 'water', 'watered', 'sprinkler', 'drip', 'flood'],
      herbicide: ['herbicide', 'weed', 'weeds'],
      fungicide: ['fungicide', 'fungus', 'mildew', 'blight', 'rot', 'copper', 'anthracnose', 'kocide', 'mancozeb', 'phytophthora'],
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
    const amountRegex = /(\d+(?:\.\d+)?)\s*(pounds?|lbs?|kg|gallons?|liters?|hours?|acres?|hectares?)/gi;
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

  // Show unsupported message only when Web Speech API is the provider AND browser doesn't support it
  if (!useDeepgram && !browserSupportsSpeechRecognition) {
    return (
      <Alert status="warning" borderRadius="md">
        <AlertIcon />
        <VStack align="start" spacing={2}>
          <Text fontWeight="bold">Voice input not supported</Text>
          <Text fontSize="sm">
            Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.
          </Text>
        </VStack>
      </Alert>
    );
  }

  const mapping = parsedData ? mapVoiceTypeToTemplate(parsedData.type) : null;

  return (
    <Card bg={bgColor} borderColor={borderColor}>
      <CardHeader>
        <HStack justify="space-between">
          <VStack align="start" spacing={1}>
            <Text fontSize="lg" fontWeight="bold" color="green.600">
              Voice Event Capture
            </Text>
            <Text fontSize="sm" color="gray.600">
              Describe your farming activity and we'll fill in the form for you
            </Text>
          </VStack>

          {/* Language selector hidden for MVP — English only */}
        </HStack>
      </CardHeader>

      <CardBody>
        <VStack spacing={4} align="stretch" pt={4}>
          {/* Provider indicator */}
          {useDeepgram && (
            <Badge colorScheme="purple" alignSelf="center" px={2} py={1} fontSize="xs" mt={2}>
              Deepgram Nova-3 — Enhanced Agricultural Vocabulary
            </Badge>
          )}

          {/* Recording Button */}
          <HStack justify="center" spacing={4}>
            <Tooltip
              label={listening ? 'Stop recording' : `Start voice input in ${selectedLanguage}`}
            >
              <Button
                leftIcon={<Icon as={listening ? FaMicrophoneSlash : FaMicrophone} />}
                colorScheme={listening ? 'red' : 'green'}
                onClick={listening ? stopListening : startListening}
                isDisabled={!isActive || isProcessing || isProcessingVoice}
                size="lg"
                variant={listening ? 'solid' : 'outline'}
                _hover={{
                  transform: 'scale(1.05)',
                  boxShadow: 'lg'
                }}
                transition="all 0.2s"
              >
                {listening ? 'Stop Recording' : 'Start Voice Input'}
              </Button>
            </Tooltip>
          </HStack>

          {/* Processing indicator */}
          {(isProcessing || isProcessingVoice) && (
            <Box p={3} bg="green.50" borderRadius="md">
              <VStack spacing={2}>
                <Progress value={75} colorScheme="green" size="sm" w="full" isIndeterminate />
                <Text fontSize="sm" color="green.600">
                  {processingStage ||
                    (isProcessingVoice ? 'Processing with AI...' : 'Processing...')}
                </Text>
              </VStack>
            </Box>
          )}

          {/* Listening indicator */}
          {listening && (
            <Box p={3} bg="red.50" borderRadius="md" borderWidth="2px" borderColor="red.200">
              <VStack spacing={2}>
                <Badge colorScheme="red" p={2} borderRadius="md">
                  Listening in {languageOptions.find((l) => l.value === selectedLanguage)?.flag}{' '}
                  {selectedLanguage}...
                </Badge>
                {displayTranscript && (
                  <Text fontSize="sm" fontStyle="italic" color="gray.700">
                    "{displayTranscript}"
                  </Text>
                )}
                {useDeepgram && (
                  <Text fontSize="xs" color="gray.500">
                    Auto-stops after 1.5s pause
                  </Text>
                )}
              </VStack>
            </Box>
          )}

          {/* Results Card - Simplified, farmer-friendly */}
          {parsedData && mapping && (
            <Box p={4} bg="green.50" borderRadius="md" borderWidth="2px" borderColor="green.200">
              <VStack spacing={3} align="stretch">
                {/* Event type header with confidence indicator */}
                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Icon
                      as={FaCheckCircle}
                      color={parsedData.confidence >= 70 ? 'green.500' : 'yellow.500'}
                      boxSize={5}
                    />
                    <Text fontWeight="bold" color="green.700" fontSize="md">
                      I understood: {mapping.displayName}
                    </Text>
                  </HStack>
                  {processingTime > 0 && (
                    <Badge colorScheme="green" size="sm">
                      <HStack spacing={1}>
                        <Icon as={FaBolt} boxSize={3} />
                        <Text>{processingTime}ms</Text>
                      </HStack>
                    </Badge>
                  )}
                </HStack>

                {/* Original transcript */}
                <Text fontSize="sm" color="gray.600" fontStyle="italic">
                  "{parsedData.original_transcript || parsedData.description}"
                </Text>

                {/* Detected values - inline badges */}
                {(formatAmountsForDisplay(parsedData.detected_amounts).length > 0 ||
                  parsedData.detected_products?.length > 0 ||
                  parsedData.npk_ratio) && (
                  <Flex flexWrap="wrap" gap={2}>
                    {formatAmountsForDisplay(parsedData.detected_amounts).map(
                      (amount: string, index: number) => (
                        <Badge key={`amt-${index}`} colorScheme="green" px={3} py={1} borderRadius="full" fontSize="sm">
                          {amount}
                        </Badge>
                      )
                    )}
                    {parsedData.detected_products
                      ?.filter((product: string) =>
                        !(parsedData.npk_ratio && /^NPK[\s\d\-]*$/i.test(product.replace(/with values|values|fertilizer/gi, '').trim()))
                      )
                      .map((product: string, index: number) => (
                        <Badge key={`prod-${index}`} colorScheme="blue" px={3} py={1} borderRadius="full" fontSize="sm">
                          {product}
                        </Badge>
                      ))}
                    {parsedData.npk_ratio && (
                      <Badge colorScheme="purple" px={3} py={1} borderRadius="full" fontSize="sm">
                        NPK {parsedData.npk_ratio}
                      </Badge>
                    )}
                    {parsedData.application_method && (
                      <Badge colorScheme="teal" px={3} py={1} borderRadius="full" fontSize="sm">
                        {parsedData.application_method}
                      </Badge>
                    )}
                    {parsedData.water_source && (
                      <Badge colorScheme="cyan" px={3} py={1} borderRadius="full" fontSize="sm">
                        {parsedData.water_source}
                      </Badge>
                    )}
                    {parsedData.commercial_name && !parsedData.detected_products?.some(
                      (p: string) => p.toLowerCase() === parsedData.commercial_name?.toLowerCase()
                    ) && (
                      <Badge colorScheme="orange" px={3} py={1} borderRadius="full" fontSize="sm">
                        {parsedData.commercial_name}
                      </Badge>
                    )}
                    {parsedData.detected_systems
                      ?.filter((system: string) => {
                        const sysLower = system.toLowerCase();
                        const methodLower = (parsedData.application_method || '').toLowerCase();
                        // Skip if it overlaps with application_method (e.g., "drip irrigation" vs "drip")
                        if (methodLower && (sysLower.includes(methodLower) || methodLower.includes(sysLower))) return false;
                        // Skip generic low-value systems
                        if (['pump', 'engine', 'motor', 'hose'].includes(sysLower)) return false;
                        return true;
                      })
                      .map((system: string, index: number) => (
                        <Badge key={`sys-${index}`} colorScheme="teal" px={3} py={1} borderRadius="full" fontSize="sm">
                          {system}
                        </Badge>
                      ))}
                  </Flex>
                )}

                {/* Confidence banner */}
                {parsedData.confidence >= 70 ? (
                  <Box p={2} bg="green.100" borderRadius="md">
                    <Text fontSize="sm" color="green.700" textAlign="center">
                      {parsedData.confidence}% confidence - Review and confirm the details below
                    </Text>
                  </Box>
                ) : (
                  <Box p={2} bg="yellow.100" borderRadius="md">
                    <Text fontSize="sm" color="yellow.700" textAlign="center">
                      {parsedData.confidence}% confidence - Please review and complete the missing
                      fields
                    </Text>
                  </Box>
                )}

                {/* Action buttons */}
                <HStack spacing={3}>
                  <Button
                    leftIcon={<FaArrowRight />}
                    colorScheme="green"
                    onClick={handleContinueToReview}
                    size="md"
                    flex={1}
                  >
                    Continue to Review
                  </Button>
                  <Button
                    leftIcon={<FaRedo />}
                    variant="outline"
                    colorScheme="gray"
                    onClick={handleTryAgain}
                    size="md"
                  >
                    Try Again
                  </Button>
                </HStack>
              </VStack>
            </Box>
          )}

          {/* Voice command examples */}
          <Box p={3} bg="gray.50" borderRadius="md">
            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
              Example voice commands:
            </Text>
            <List spacing={1} fontSize="xs" color="gray.600">
              <ListItem>
                <ListIcon as={FaExclamationTriangle} color="green.500" />
                "Applied fertilizer today, 200 pounds per acre, NPK 10-10-10"
              </ListItem>
              <ListItem>
                <ListIcon as={FaExclamationTriangle} color="green.500" />
                "Irrigated field for 6 hours with drip system"
              </ListItem>
              <ListItem>
                <ListIcon as={FaExclamationTriangle} color="green.500" />
                "Used tractor for 3 hours, consumed 15 gallons of diesel"
              </ListItem>
            </List>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
};
