import { useCallback, useEffect, useRef, useState } from 'react';
import { getKeytermsForLanguage } from 'config/agriculturalKeyterms';

/**
 * Hard ceiling on a single recording, in milliseconds.
 *
 * Until 2026-08-26 nothing bounded a session's LENGTH. The only stop conditions were the
 * farmer pressing stop and Deepgram's `UtteranceEnd` firing after 1.5s of silence — and
 * silence is the assumption that does not hold on a farm. With a tractor idling, wind in the
 * mic or a radio on, endpointing may never trigger: MediaRecorder keeps pushing 250ms chunks
 * and the 8s KeepAlive keeps the socket open, so one forgotten session streams (and bills)
 * until the page is closed.
 *
 * That is the real cost tail, not the number of sessions. A single stuck mic can out-spend a
 * whole day of honest logging, which is why the daily session ceiling alone was never a
 * bound on minutes. With this cap it becomes one: sessions x MAX_SESSION_MS is a provable
 * worst case.
 *
 * 90s is far past any field note — the examples the UI suggests run 5-10 seconds — and short
 * enough that a stuck mic costs pennies rather than a morning.
 */
export const MAX_SESSION_MS = 90_000;

/**
 * The audio container this browser can actually produce.
 *
 * ⛔ NOT "webm, or webm". MEASURED 2026-09-01 on an iPhone against app.trazo.io: this asked for
 * `audio/webm;codecs=opus`, found it unsupported, and fell back to `audio/webm` — which iOS
 * Safari does not support either. `new MediaRecorder(stream, { mimeType: 'audio/webm' })` throws
 * NotSupportedError there, and it threw inside `ws.onopen`, so the socket stayed open with
 * nothing ever sent down it until Deepgram closed it for silence. The farmer allowed the
 * microphone and was told "the connection to the transcription service dropped" — a message
 * about the one thing that had not gone wrong.
 *
 * Safari records `audio/mp4` (AAC). The list is ordered by what Deepgram handles most happily,
 * and ends with `''` meaning "no mimeType option at all", which asks the browser for its own
 * default rather than asserting a format nobody supports.
 */
/**
 * Does this browser need the raw-PCM path?
 *
 * Opus-in-WebM (or Ogg) is what Deepgram's live endpoint parses most happily, and MediaRecorder
 * produces it on Chrome and Android. Anything else — Safari's `audio/mp4`, or a platform default
 * we cannot name — goes down the Web Audio path instead of gambling on the container.
 */
export function shouldUseRawPcm(mimeType: string | null): boolean {
  return !mimeType || !/webm|ogg/.test(mimeType);
}

export function pickRecorderMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4'
  ];
  const supported = candidates.find((type) => MediaRecorder.isTypeSupported(type));
  // `''` is meaningful: MediaRecorder accepts being constructed with no mimeType and picks the
  // platform default. `null` is the genuinely hopeless case — no MediaRecorder at all.
  return supported ?? '';
}

interface UseDeepgramTranscriptionOptions {
  language: string;
  onTranscriptComplete: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  fetchToken: () => Promise<string>;
}

/**
 * Errors this hook can surface, as i18n message ids.
 *
 * A closed union, not free prose: the caller both TRANSLATES these and branches on them
 * (a blocked microphone gets a persistent Alert, everything else a toast). When they were
 * English sentences the caller had to sniff `.includes('microphone')` to tell them apart,
 * which is a contract no compiler checks and no reader can see.
 */
export type DeepgramErrorId =
  | 'voice.tokenFailed'
  | 'voice.microphoneBlocked'
  | 'voice.recorderUnsupported'
  | 'voice.connectionFailed';

interface UseDeepgramTranscriptionReturn {
  isListening: boolean;
  /** The last recording was cut short by MAX_SESSION_MS rather than by silence or the user. */
  stoppedAtLimit: boolean;
  transcript: string;
  interimTranscript: string;
  error: DeepgramErrorId | null;
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
  const [error, setError] = useState<DeepgramErrorId | null>(null);
  const [stoppedAtLimit, setStoppedAtLimit] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  // The Safari/iOS path — see startListening. Kept in refs for the same reason the recorder is:
  // cleanup has to be able to tear them down from anywhere, including an unmount mid-recording.
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxDurationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef('');
  const stoppingRef = useRef(false);

  const cleanup = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    if (maxDurationRef.current) {
      clearTimeout(maxDurationRef.current);
      maxDurationRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    // PCM path: disconnect before closing, or Safari keeps the mic indicator lit.
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') void audioContextRef.current.close();
      audioContextRef.current = null;
    }
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
    setStoppedAtLimit(false);
    setTranscript('');
    setInterimTranscript('');
    transcriptRef.current = '';

    // 1. Get temporary token
    let token: string;
    try {
      token = await fetchToken();
    } catch {
      setError('voice.tokenFailed');
      return;
    }

    // 2. Can this browser record at all? Checked BEFORE the socket and before the microphone
    // prompt, so a browser that cannot record never asks the farmer for permission it has no use
    // for — and never reports the failure as a dropped connection.
    const mimeType = pickRecorderMimeType();

    // WHICH TRANSPORT, and why there are two.
    //
    // MEASURED 2026-09-01 on an iPhone against app.trazo.io, twice. First the recorder itself
    // threw, because the code only ever asked for webm. Fixing that got Safari as far as
    // recording `audio/mp4` — and the socket then closed anyway: Deepgram's live endpoint does
    // not take Safari's fragmented-MP4 chunks, so the farmer saw "the connection dropped" for a
    // second, different reason.
    //
    // Containers are the problem, so the iOS path stops using one. Web Audio gives raw samples,
    // which we send as `linear16` with the sample rate spelled out in the query string — the
    // format Deepgram documents for exactly this case, and the one that cannot be misparsed.
    // Chrome and Android keep MediaRecorder + Opus: it is proven here, and it is far cheaper on
    // battery and bandwidth than shipping uncompressed audio.
    const useRawPcm = shouldUseRawPcm(mimeType);
    if (mimeType === null && typeof AudioContext === 'undefined') {
      setError('voice.recorderUnsupported');
      return;
    }

    // 3. Get microphone
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });
    } catch {
      setError('voice.microphoneBlocked');
      return;
    }
    streamRef.current = stream;

    // 4. Build WebSocket URL with Deepgram params
    // The context is created here, inside the click that started this, because iOS only allows
    // an AudioContext to start from a user gesture — and because its sample rate (48k on iPhone,
    // 44.1k elsewhere) has to go in the URL below. Resampling to a fixed 16k would be another
    // place to be subtly wrong; Deepgram accepts whatever rate we declare.
    let audioContext: AudioContext | null = null;
    if (useRawPcm) {
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioContext = new Ctor();
        if (audioContext.state === 'suspended') await audioContext.resume();
      } catch {
        setError('voice.recorderUnsupported');
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      audioContextRef.current = audioContext;
    }

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
    // Raw samples carry no header saying what they are, so the stream has to be described.
    if (useRawPcm && audioContext) {
      params.set('encoding', 'linear16');
      params.set('sample_rate', String(Math.round(audioContext.sampleRate)));
      params.set('channels', '1');
    }

    // Keyterms must be single words or short phrases without special chars
    keyterms.forEach((term) => params.append('keyterm', term));

    const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

    // 5. Open WebSocket — authenticate via subprotocol ['token', key]
    const ws = new WebSocket(wsUrl, ['token', token]);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsListening(true);

      if (useRawPcm && audioContext) {
        // ── Safari / iOS: raw linear16, no container ─────────────────────────────────────
        //
        // ScriptProcessorNode is deprecated in favour of AudioWorklet, and it is still the right
        // choice here: a worklet needs its processor loaded from a separate module URL, which on
        // iOS means a Blob URL and a second thing to get wrong on the one platform this exists to
        // rescue. This runs on the main thread for at most 90 seconds (MAX_SESSION_MS) while the
        // farmer is looking at a recording indicator, not in a background tab.
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        sourceRef.current = source;
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const input = event.inputBuffer.getChannelData(0);
          // Float32 [-1,1] → Int16 little-endian, which is what `linear16` means. Clamped
          // because a sample slightly outside the range wraps to the opposite sign and lands as
          // a click in the audio.
          const pcm = new Int16Array(input.length);
          for (let i = 0; i < input.length; i += 1) {
            const clamped = Math.max(-1, Math.min(1, input[i]));
            pcm[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
          }
          ws.send(pcm.buffer);
        };

        source.connect(processor);
        // ⚠️ The processor MUST reach the destination or Safari never fires onaudioprocess. It is
        // connected through a muted gain node so the farmer does not hear themselves echoed back.
        const mute = audioContext.createGain();
        mute.gain.value = 0;
        processor.connect(mute);
        mute.connect(audioContext.destination);
      } else {
        // ── Chrome / Android: Opus in WebM, via MediaRecorder ────────────────────────────
        //
        // Wrapped because this runs inside an event handler: a throw here does not reject
        // anything the caller awaits, it just leaves a live socket and a silent microphone —
        // which is exactly how the iOS failure looked like a network fault.
        let recorder: MediaRecorder;
        try {
          recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[voice] MediaRecorder rejected', mimeType, err);
          setError('voice.recorderUnsupported');
          cleanup();
          return;
        }
        recorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };

        recorder.start(250); // 250ms chunks
      }

      // Keep-alive every 8 seconds. Deepgram closes a socket that has gone 10s without
      // audio, so this interval is deliberately under that.
      keepAliveRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'KeepAlive' }));
        }
      }, 8000);

      // Hard stop. Ends the stream the same way the farmer would, so whatever was said so
      // far is still flushed, transcribed and handed to onTranscriptComplete — a cap that
      // threw the work away would be worse than the runaway it prevents.
      maxDurationRef.current = setTimeout(() => {
        setStoppedAtLimit(true);
        stopListening();
      }, MAX_SESSION_MS);
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
      // Said "Falling back to browser speech recognition" until 2026-08-25, and then did
      // not: this handler tears the socket down and stops. Nothing re-routes to the Web
      // Speech API, so the farmer waited for a recovery that was never coming. The caller
      // surfaces this string verbatim in a toast, so it has to describe what happened.
      setError('voice.connectionFailed');
      cleanup();
      setIsListening(false);
    };

    ws.onclose = (event) => {
      // Log the close FRAME, not just the fact of it. Deepgram states its reason there — an
      // unsupported encoding, a bad rate, an auth problem all arrive as different codes — and
      // without it every failure on a phone looks identical: "the connection dropped". Two days
      // of this bug were spent unable to tell a thrown MediaRecorder from a rejected container.
      if (!stoppingRef.current) {
        // eslint-disable-next-line no-console
        console.error(
          '[voice] Deepgram socket closed unexpectedly',
          JSON.stringify({
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            transport: useRawPcm ? `linear16@${audioContext?.sampleRate ?? '?'}` : mimeType
          })
        );
        cleanup();
        setIsListening(false);
      }
    };
  }, [language, fetchToken, onInterimTranscript, stopListening, cleanup]);

  // Release the microphone and the socket if this unmounts mid-recording.
  //
  // `cleanup` was only ever reached through stopListening / onerror / onclose, so a component
  // that went away while listening — the wizard step changing, a navigation, the farmer
  // closing the panel — left the MediaStream tracks live and the Deepgram socket open. The
  // browser keeps showing the recording indicator, and audio keeps being billed and streamed
  // from a page nobody is on. `cleanup` is a useCallback with no deps, so this runs on
  // unmount and not between renders.
  useEffect(() => cleanup, [cleanup]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    transcriptRef.current = '';
  }, []);

  return {
    isListening,
    stoppedAtLimit,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript
  };
}
