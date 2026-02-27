import { useCallback, useRef, useState } from 'react';
import { getKeytermsForLanguage } from 'config/agriculturalKeyterms';

interface UseDeepgramTranscriptionOptions {
  language: string;
  onTranscriptComplete: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  fetchToken: () => Promise<string>;
}

interface UseDeepgramTranscriptionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
}

/**
 * Hook for real-time speech-to-text via Deepgram Nova-3 WebSocket streaming.
 *
 * Flow:
 *  1. Fetch a temporary JWT from the backend
 *  2. Open WebSocket to Deepgram with keyterm boosting
 *  3. Stream microphone audio as 250ms webm/opus chunks
 *  4. Accumulate final transcript segments; display interim in real-time
 *  5. Auto-stop on UtteranceEnd (1.5s silence) or manual stop
 */
export function useDeepgramTranscription({
  language,
  onTranscriptComplete,
  onInterimTranscript,
  fetchToken
}: UseDeepgramTranscriptionOptions): UseDeepgramTranscriptionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef('');
  const stoppingRef = useRef(false);

  const cleanup = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    stoppingRef.current = false;
  }, []);

  const stopListening = useCallback(() => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    // Send close message to Deepgram so it flushes remaining audio
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CloseStream' }));
    }

    // Small delay to allow final results to arrive before tearing down
    setTimeout(() => {
      const finalText = transcriptRef.current.trim();
      cleanup();
      setIsListening(false);
      setInterimTranscript('');
      if (finalText) {
        onTranscriptComplete(finalText);
      }
    }, 500);
  }, [cleanup, onTranscriptComplete]);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    transcriptRef.current = '';

    // 1. Get temporary token
    let token: string;
    try {
      token = await fetchToken();
    } catch {
      setError('Failed to get Deepgram token. Please try again.');
      return;
    }

    // 2. Get microphone
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });
    } catch {
      setError('Microphone access denied. Please allow microphone permissions.');
      return;
    }
    streamRef.current = stream;

    // 3. Build WebSocket URL with Deepgram params
    const keyterms = getKeytermsForLanguage(language);
    const params = new URLSearchParams({
      model: 'nova-3',
      language: language,
      smart_format: 'true',
      interim_results: 'true',
      utterance_end_ms: '1500',
      endpointing: '300',
      punctuate: 'true'
    });
    // Keyterms must be single words or short phrases without special chars
    keyterms.forEach((term) => params.append('keyterm', term));

    const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

    // 4. Open WebSocket — authenticate via subprotocol ['token', key]
    const ws = new WebSocket(wsUrl, ['token', token]);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsListening(true);

      // Start MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data);
        }
      };

      recorder.start(250); // 250ms chunks

      // Keep-alive every 8 seconds
      keepAliveRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'KeepAlive' }));
        }
      }, 8000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'Results') {
          const alt = data.channel?.alternatives?.[0];
          if (!alt) return;

          const text = alt.transcript || '';
          if (!text) return;

          if (data.is_final) {
            // Append final segment to transcript
            transcriptRef.current = transcriptRef.current
              ? `${transcriptRef.current} ${text}`
              : text;
            setTranscript(transcriptRef.current);
            setInterimTranscript('');
            onInterimTranscript?.('');
          } else {
            // Update interim display
            setInterimTranscript(text);
            onInterimTranscript?.(text);
          }
        }

        if (data.type === 'UtteranceEnd') {
          // Speech pause detected — auto-stop
          stopListening();
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    ws.onerror = () => {
      setError('Connection to Deepgram failed. Falling back to browser speech recognition.');
      cleanup();
      setIsListening(false);
    };

    ws.onclose = () => {
      // If not manually stopping, this is unexpected
      if (!stoppingRef.current) {
        cleanup();
        setIsListening(false);
      }
    };
  }, [language, fetchToken, onInterimTranscript, stopListening, cleanup]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    transcriptRef.current = '';
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript
  };
}
