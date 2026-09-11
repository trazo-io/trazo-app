import { useCallback, useEffect, useRef, useState } from 'react';
import { getKeytermsForLanguage } from 'config/agriculturalKeyterms';
import type { SpokenLanguage } from 'config/voiceLanguages';

/**
 * Hard ceiling on a single recording, in milliseconds.
 *
 * Until 2026-08-26 nothing bounded a session's LENGTH. The only stop conditions were the
 * farmer pressing stop and Deepgram's `UtteranceEnd` firing after a pause (UTTERANCE_END_MS) — and
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
 * The pause that ends a recording, in ms (Deepgram `utterance_end_ms`, allowed 1000-5000).
 *
 * ⛔ Was 1500 until 2026-09-10, and 1.5 seconds is a breath, not the end of a thought. MEASURED
 * that day by playing a real English clip into the running app through a fake microphone:
 * "Oh, [1.8s pause] we sprayed Entrust at six ounces…" ended the session in the pause. The
 * sentence was spoken into a closed microphone, "Oh," was the entire transcript, the panel
 * dropped it as too short and went back to idle without a word — reported as "it does not
 * recognise English". Recognition was fine; the session was over before the sentence began.
 *
 * Three seconds lets a farmer stop to read a label or remember a block number. "Stop recording"
 * ends it sooner for anyone who does not want to wait.
 */
export const UTTERANCE_END_MS = 3000;

/**
 * Below this many characters a transcript is not a note yet ("Oh,", "Okay.") — the panel will
 * not spend a parse on it, and a pause after it does not end the recording.
 *
 * ⚠️ The threshold alone was not enough. Measured against Deepgram with the Safari/iOS
 * transport (raw linear16), the UtteranceEnd for "Oh, [1.8s]" arrives DURING the pause, before
 * a single resumed word exists to compare timings with; "Oh," was the handoff 5 runs in 5. And
 * "Okay, [3.5s] sprayed kaolin clay…" outlasts even the 3-second pause. Refusing to end on a
 * throat-clear fixed every clip on both transports (11 of 11).
 */
export const MIN_NOTE_CHARS = 10;

/**
 * Stop after this long without a single recognised word.
 *
 * UtteranceEnd needs words to measure a gap from, so a session that hears none never gets one:
 * English spoken into the Spanish model came back as empty finals for the full 90-second cap,
 * with a withdrawn guess frozen on screen. Same for a "Okay," that MIN_NOTE_CHARS declined to end
 * on and nothing after it. Every recognised word — interim or final — restarts the clock, so this
 * never cuts someone who is talking.
 */
export const NO_SPEECH_STOP_MS = 10_000;

/**
 * The longest to wait, after CloseStream, for Deepgram's last results.
 *
 * Deepgram answers CloseStream by finishing the audio it holds, sending those results and a
 * Metadata summary, and then closing the socket itself — so the server's close IS the "you
 * have everything" signal, and it normally arrives a few hundred ms later. This is only the
 * ceiling for a server that never closes. It used to be the whole mechanism: a fixed 500ms,
 * after which the hook closed the socket itself, and whatever Deepgram had not sent by then —
 * the end of the sentence — was lost.
 */
export const FLUSH_TIMEOUT_MS = 4000;

/** Audio-clock slack when comparing an UtteranceEnd's `last_word_end` with later word timings. */
const RESUMED_SPEECH_EPSILON_S = 0.25;

/**
 * Does this UtteranceEnd mean the farmer has finished — or only that they paused?
 *
 * Deepgram's own docs: UtteranceEnd "fires based on detecting a gap even if it determines that
 * speech is continuing after the gap". It reports a PAUSE, and the hook used to treat it as
 * the END: in the 2026-09-10 reproduction it arrived together with "We sprayed and…", the
 * farmer 1.8 seconds back into their sentence, and the session was cut there.
 *
 * `latestWordEnd` is where the last word heard in ANY result ended, interim included, on the
 * same audio clock as `last_word_end`. A word ending after the gap means they are talking again.
 * Without a usable `last_word_end` (Deepgram sends -1 when the words before the gap were already
 * finalised) there is no timing to compare, so an interim still on screen is the tell instead.
 */
export function isEndOfDictation(
  lastWordEnd: unknown,
  latestWordEnd: number,
  pendingInterim: string
): boolean {
  if (typeof lastWordEnd !== 'number' || lastWordEnd < 0) return !pendingInterim.trim();
  return latestWordEnd <= lastWordEnd + RESUMED_SPEECH_EPSILON_S;
}

/**
 * Which language the farmer actually spoke, from Deepgram's per-word `language` tags.
 *
 * - `null` — no decisive answer: a monolingual request (no tags), nothing heard, or a dead heat.
 *   The caller falls back to the app locale.
 * - `'other'` — most words were tagged as a language we do not serve. Nova-3 `multi` cannot be
 *   limited to English and Spanish (only Flux takes a language hint), and MEASURED 2026-09-10 a
 *   heavily accented English clip came back tagged Italian 9 words in 11 — "We appuie en sul forum
 *   de Nordblock". That is not a transcript to parse into a record.
 *
 * A majority, not unanimity: stray tags inside a real sentence are normal ("aplicamos cobre…" came
 * back es:7 pt:2 en:1).
 */
export function dominantSpokenLanguage(
  counts: Record<string, number>
): SpokenLanguage | 'other' | null {
  let total = 0;
  let en = 0;
  let es = 0;
  for (const [tag, n] of Object.entries(counts)) {
    total += n;
    const family = tag.split('-')[0].toLowerCase();
    if (family === 'en') en += n;
    else if (family === 'es') es += n;
  }
  if (total === 0) return null;
  if ((en + es) / total < 0.5) return 'other';
  if (en === es) return null;
  return es > en ? 'es' : 'en';
}

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
  /** Deepgram `language`: a locale code, or `'multi'` to detect the language word by word. */
  language: string;
  /**
   * Whose vocabulary to boost with keyterms. Defaults to `language`; under `'multi'` pass the app
   * locale, so the language the farmer chose for the app stays the prior.
   */
  keytermLanguage?: string;
  /**
   * Called once per session with everything that was heard — including `''` — and the language
   * it was spoken in (see dominantSpokenLanguage). An empty or near-empty result is the caller's
   * to explain to the farmer; this hook used to swallow it, which is how a session that caught
   * nothing ended in silence.
   */
  onTranscriptComplete: (text: string, spokenLanguage: SpokenLanguage | 'other' | null) => void;
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
  /** A start is in flight — the microphone prompt, the token fetch or the handshake. */
  isStarting: boolean;
  /** The last recording was cut short by MAX_SESSION_MS rather than by silence or the user. */
  stoppedAtLimit: boolean;
  transcript: string;
  interimTranscript: string;
  error: DeepgramErrorId | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  /** End the session and hand NOTHING over — see cancelListening. */
  cancelListening: () => void;
  resetTranscript: () => void;
}

/**
 * Hook for real-time speech-to-text via Deepgram Nova-3 WebSocket streaming.
 *
 * Flow:
 *  1. Fetch a short-lived Deepgram API key from the backend (`deepgram_token`, 60s TTL)
 *  2. Open WebSocket to Deepgram with keyterm boosting
 *  3. Stream microphone audio as 250ms webm/opus chunks
 *  4. Accumulate final transcript segments; display interim in real-time
 *  5. Auto-stop on an UtteranceEnd that is not followed by more speech, or on manual stop
 *  6. Stop = end the audio, CloseStream, and wait for Deepgram to close with the last results
 */
export function useDeepgramTranscription({
  language,
  keytermLanguage,
  onTranscriptComplete,
  onInterimTranscript,
  fetchToken
}: UseDeepgramTranscriptionOptions): UseDeepgramTranscriptionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<DeepgramErrorId | null>(null);
  const [stoppedAtLimit, setStoppedAtLimit] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  // The session number of a start still in flight, or null. A NUMBER, not a flag: after
  // cancelListening a new start must be let through while the cancelled one is still unwinding
  // its awaits, and the cancelled one's `finally` must not clear the new one's claim.
  const startingSessionRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  // The Safari/iOS path — see startListening. Kept in refs for the same reason the recorder is:
  // cleanup has to be able to tear them down from anywhere, including an unmount mid-recording.
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxDurationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Audio recorded before the socket opened — see "Record from NOW" in startListening.
  const pendingAudioRef = useRef<(Blob | ArrayBufferLike)[]>([]);
  const transcriptRef = useRef('');
  // The segment Deepgram has not finalised yet. Kept in a ref as well as state because the
  // stop path reads it after the socket closes: an interim still standing then was never
  // finalised, and it is the tail of what the farmer said.
  const interimRef = useRef('');
  // Where the last word heard so far ended, on Deepgram's audio clock — see isEndOfDictation.
  const latestWordEndRef = useRef(0);
  // Per-word language tags (only present under `language=multi`): counted over the finals, plus
  // the tags of the interim still standing, which is the tail of the sentence.
  const wordLangCountsRef = useRef<Record<string, number>>({});
  const interimWordLangsRef = useRef<string[]>([]);
  const stoppingRef = useRef(false);
  // Bumped by every cleanup. startListening awaits the microphone prompt and the token fetch;
  // if the panel is closed during either, the session it was building belongs to nobody and
  // must not open a socket or keep the microphone.
  const sessionRef = useRef(0);
  // The caller's latest callback. The socket handlers are created once per session, and one
  // that closed over the callback from the render that started it would hand the transcript to
  // a stale closure.
  const onTranscriptCompleteRef = useRef(onTranscriptComplete);
  onTranscriptCompleteRef.current = onTranscriptComplete;

  const cleanup = useCallback(() => {
    sessionRef.current += 1;
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    if (maxDurationRef.current) {
      clearTimeout(maxDurationRef.current);
      maxDurationRef.current = null;
    }
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (noSpeechTimerRef.current) {
      clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = null;
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
    pendingAudioRef.current = [];
    const ws = wsRef.current;
    if (ws) {
      // Detached BEFORE closing: a close we asked for is not news. Left attached, `onclose` ran
      // after `stoppingRef` had been reset below and logged every ordinary stop as "Deepgram
      // socket closed unexpectedly" — a false alarm in the one log line meant for real ones.
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState <= WebSocket.OPEN) ws.close();
    }
    wsRef.current = null;
    stoppingRef.current = false;
  }, []);

  /** Everything heard so far: the finalised segments, plus a tail Deepgram never finalised. */
  const heardSoFar = useCallback(
    () =>
      [transcriptRef.current, interimRef.current]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' '),
    []
  );

  /** Tear the session down and hand over what was heard. Runs once: cleanup detaches the rest. */
  const completeSession = useCallback(() => {
    const finalText = heardSoFar();
    const counts = { ...wordLangCountsRef.current };
    interimWordLangsRef.current.forEach((tag) => (counts[tag] = (counts[tag] || 0) + 1));
    cleanup();
    setIsListening(false);
    setInterimTranscript('');
    onTranscriptCompleteRef.current(finalText, dominantSpokenLanguage(counts));
  }, [cleanup, heardSoFar]);

  const stopListening = useCallback(() => {
    const ws = wsRef.current;
    if (stoppingRef.current || !ws) return;
    stoppingRef.current = true;

    // Nothing more goes into a stream that is ending.
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    if (maxDurationRef.current) {
      clearTimeout(maxDurationRef.current);
      maxDurationRef.current = null;
    }
    if (noSpeechTimerRef.current) {
      clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = null;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      completeSession();
      return;
    }

    // The server's close ends the wait (ws.onclose → completeSession); this is the ceiling.
    flushTimerRef.current = setTimeout(completeSession, FLUSH_TIMEOUT_MS);

    const closeStream = () => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'CloseStream' }));
    };

    // End the AUDIO first, then the stream. CloseStream used to go out while the recorder still
    // held up to 250ms of buffered speech, so the last words of every recording never reached
    // Deepgram at all. `stop()` emits that buffer as one final `dataavailable` and only then
    // fires `stop`, so CloseStream now follows the last chunk instead of overtaking it.
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.addEventListener('stop', closeStream, { once: true });
      recorder.stop();
    } else {
      // PCM path: no buffer to drain — silence the processor so no samples follow CloseStream.
      if (processorRef.current) processorRef.current.onaudioprocess = null;
      closeStream();
    }
  }, [completeSession]);

  const startListening = useCallback(async () => {
    // ⛔ One session at a time. The panel auto-starts 300 ms after it opens, and a tap on the
    // mic button inside that window used to open a SECOND socket on the same microphone. Both
    // sessions heard the same audio and both appended their finals to one transcript, so every
    // phrase came back twice ("Sprayed Entrust… Sprayed Entrust…") — seen on camera 2026-09-02.
    // `startingSessionRef` covers the token fetch and the permission prompt, before a socket
    // exists; `wsRef` covers an open one. A cleanup starts a new session number, which releases
    // both.
    if (startingSessionRef.current === sessionRef.current || wsRef.current) return;
    const session = sessionRef.current;
    startingSessionRef.current = session;
    setIsStarting(true);
    // Closed while we were awaiting? Then nothing below may open a socket or hold the mic.
    const abandoned = () => sessionRef.current !== session;
    try {
      setError(null);
      setStoppedAtLimit(false);
      setTranscript('');
      setInterimTranscript('');
      transcriptRef.current = '';
      interimRef.current = '';
      latestWordEndRef.current = 0;
      wordLangCountsRef.current = {};
      interimWordLangsRef.current = [];

      // 1. Can this browser record at all? Checked BEFORE the socket and before the microphone
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

      // 2. Get microphone
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          // `noiseSuppression: false` since 2026-09-10. Deepgram's preprocessing guide lists
          // noise suppression as "No" for streaming transcription: it "clips the first words of
          // utterances and disproportionately affects short responses" — and a field note opens
          // with the words that matter ("Sprayed Entrust…"). The model is trained on noisy audio;
          // the browser's filter removes what it listens for. Echo cancellation stays on.
          audio: { echoCancellation: true, noiseSuppression: false }
        });
      } catch {
        setError('voice.microphoneBlocked');
        return;
      }
      if (abandoned()) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      // 3. Record from NOW — before the token and the socket — into a pre-roll buffer.
      //
      // ⛔ MEASURED 2026-09-10 through the running app: "Aplicamos azufre en el bloque norte…"
      // arrived as "Azufre en el bloque norte…". The microphone opened at once, but the recorder
      // only started when the socket did — after the token fetch (two Deepgram calls on the
      // backend) and the handshake: 2.5-3.5 seconds with the browser showing a live mic, in which
      // a farmer who started talking lost their first words. Everything from the moment the mic
      // opens is now kept and sent, in order, the instant the socket is up; Deepgram takes a
      // backlog faster than real time. Order matters: a WebM stream's first chunk is its header.
      pendingAudioRef.current = [];
      const sendAudio = (chunk: Blob | ArrayBufferLike) => {
        if (abandoned()) return; // a straggler from a session that has been torn down
        const socket = wsRef.current;
        if (socket && socket.readyState === WebSocket.OPEN) socket.send(chunk);
        else pendingAudioRef.current.push(chunk);
      };

      // The AudioContext is created here, as close to the tap that started this as the permission
      // prompt allows: iOS only lets a context start from a user gesture, and its sample rate (48k
      // on iPhone, 44.1k elsewhere) has to go in the URL below. Resampling to a fixed 16k would be
      // another place to be subtly wrong; Deepgram accepts whatever rate we declare.
      let audioContext: AudioContext | null = null;
      if (useRawPcm) {
        try {
          const Ctor =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioContext = new Ctor();
          if (audioContext.state === 'suspended') await audioContext.resume();
        } catch {
          // A context that was created but would not resume is not in audioContextRef yet, so
          // cleanup cannot see it — close it here or it holds the audio hardware.
          audioContext?.close().catch(() => {});
          setError('voice.recorderUnsupported');
          cleanup();
          return;
        }
        if (abandoned()) {
          void audioContext.close();
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        audioContextRef.current = audioContext;

        // ── Safari / iOS: raw linear16, no container ─────────────────────────────────────────
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
          const input = event.inputBuffer.getChannelData(0);
          // Float32 [-1,1] → Int16 little-endian, which is what `linear16` means. Clamped
          // because a sample slightly outside the range wraps to the opposite sign and lands as
          // a click in the audio.
          const pcm = new Int16Array(input.length);
          for (let i = 0; i < input.length; i += 1) {
            const clamped = Math.max(-1, Math.min(1, input[i]));
            pcm[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
          }
          sendAudio(pcm.buffer);
        };

        source.connect(processor);
        // ⚠️ The processor MUST reach the destination or Safari never fires onaudioprocess. It is
        // connected through a muted gain node so the farmer does not hear themselves echoed back.
        const mute = audioContext.createGain();
        mute.gain.value = 0;
        processor.connect(mute);
        mute.connect(audioContext.destination);
      } else {
        // ── Chrome / Android: Opus in WebM, via MediaRecorder ────────────────────────────────
        //
        // Constructor AND `start()` in the try: both throw on the same platforms. A recorder the
        // browser refuses now fails HERE, before a key is minted or a socket opened — it used to
        // fail inside `ws.onopen`, where the iOS failure looked like a network fault.
        let recorder: MediaRecorder;
        try {
          recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) sendAudio(event.data);
          };
          recorder.start(250); // 250ms chunks
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[voice] MediaRecorder rejected', mimeType, err);
          setError('voice.recorderUnsupported');
          cleanup();
          return;
        }
        recorderRef.current = recorder;
      }

      // 4. ⛔ TOKEN LAST, and this order is load-bearing.
      //
      // The temporary Deepgram key lives for SIXTY SECONDS (`deepgram_token`, time_to_live_in_
      // seconds: 60). It used to be minted FIRST — before `getUserMedia` — so the clock started
      // ticking and then the farmer was shown a permission dialog and asked to read it. On a
      // desktop that already granted permission there is no dialog and no delay, which is exactly
      // why every test here passed; on a phone seeing the prompt for the first time, on a field
      // connection, the key can be dead before the socket is opened. Deepgram then refuses the
      // connection, and the farmer is told the transcription service dropped the call.
      //
      // Nothing is spent by asking for the microphone first: a farmer who declines costs us a
      // permission prompt, not an API key. And nothing said while the key is fetched is lost —
      // the recorder above is already filling the pre-roll.
      let token: string;
      try {
        token = await fetchToken();
      } catch {
        cleanup();
        setError('voice.tokenFailed');
        return;
      }
      // Closed while the token was in flight: cleanup has already released the mic and recorder.
      if (abandoned()) return;

      // 5. Build WebSocket URL with Deepgram params
      const keyterms = getKeytermsForLanguage(keytermLanguage ?? language);
      // ⛔ `numerals`, NOT `smart_format`. MEASURED 2026-09-10, 3 runs in 3 on every arm:
      // smart_format rewrote "sprayed kaolin clay on the east block this morning, about forty
      // pounds per acre" into "…on the 40 pounds per acre" — the BLOCK deleted from a spray
      // record, in the FINAL, after the interim had it right. Keyterms on or off made no
      // difference; dropping smart_format did. `numerals` keeps the one thing we wanted from it
      // (digits: "6 ounces", "200 gallons", "20 libras") and deleted nothing in either language.
      const params = new URLSearchParams({
        model: 'nova-3',
        language: language,
        numerals: 'true',
        interim_results: 'true',
        utterance_end_ms: String(UTTERANCE_END_MS),
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

      // 6. Open WebSocket — authenticate via subprotocol ['token', key]
      const ws = new WebSocket(wsUrl, ['token', token]);
      wsRef.current = ws;

      // See NO_SPEECH_STOP_MS. Armed when the socket opens, re-armed by every recognised word.
      const armNoSpeechStop = () => {
        if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);
        noSpeechTimerRef.current = setTimeout(stopListening, NO_SPEECH_STOP_MS);
      };

      ws.onopen = () => {
        // The pre-roll first, in the order it was recorded. From here on `sendAudio` sends live;
        // readyState turns OPEN in the same task that fires this event, so no live chunk can
        // overtake the backlog.
        pendingAudioRef.current.forEach((chunk) => ws.send(chunk));
        pendingAudioRef.current = [];
        setIsListening(true);

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

        armNoSpeechStop();
      };

      ws.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return; // Ignore non-JSON messages
        }

        if (data.type === 'Results') {
          const alt = data.channel?.alternatives?.[0];
          if (!alt) return;

          const text = (alt.transcript || '').trim();
          const words = Array.isArray(alt.words) ? alt.words : [];
          const lastWordEnd = words.length ? words[words.length - 1]?.end : undefined;
          // A NEW word, not a repeated one. Deepgram re-sends the pending interim while it waits
          // to finalise, and under steady noise (a tractor idling) endpointing may never fire, so
          // the same "Oh," can arrive every second indefinitely. Re-arming on any non-empty text
          // let that repetition hold the no-speech stop off until the 90-second cap. Word timings
          // only move forward when something new was said. (Without timings, text is the tell.)
          const heardNewWord =
            typeof lastWordEnd === 'number' ? lastWordEnd > latestWordEndRef.current : !!text;
          if (typeof lastWordEnd === 'number') {
            latestWordEndRef.current = Math.max(latestWordEndRef.current, lastWordEnd);
          }
          if (heardNewWord && !stoppingRef.current) armNoSpeechStop();
          const wordLangs: string[] = words
            .map((w: { language?: unknown }) => w?.language)
            .filter((tag: unknown): tag is string => typeof tag === 'string');

          if (data.is_final) {
            if (text) {
              transcriptRef.current = transcriptRef.current
                ? `${transcriptRef.current} ${text}`
                : text;
              setTranscript(transcriptRef.current);
              const counts = wordLangCountsRef.current;
              wordLangs.forEach((tag) => (counts[tag] = (counts[tag] || 0) + 1));
            }
            // A final CLOSES the segment its interim belonged to — an EMPTY final included,
            // which is Deepgram withdrawing its guess. This used to `return` on empty text
            // before reaching here, so a withdrawn guess stayed on screen as though it had
            // been heard, for as long as the session lasted.
            interimRef.current = '';
            interimWordLangsRef.current = [];
            setInterimTranscript('');
            onInterimTranscript?.('');
          } else {
            interimRef.current = text;
            interimWordLangsRef.current = wordLangs;
            setInterimTranscript(text);
            onInterimTranscript?.(text);
          }
          return;
        }

        // A pause ends the note only when it is not followed by more speech AND there is a note
        // to end — "Oh," or "Okay." followed by a pause is someone gathering their thoughts.
        if (
          data.type === 'UtteranceEnd' &&
          heardSoFar().length > MIN_NOTE_CHARS &&
          isEndOfDictation(data.last_word_end, latestWordEndRef.current, interimRef.current)
        ) {
          stopListening();
        }
      };

      // The socket ended on its own, not because we closed it. Whatever was already heard
      // still goes to the caller — both handlers used to discard it, and `onclose` did so
      // without telling the farmer anything. Only a session that caught nothing is reported
      // as a dropped connection, because only then is "nothing was recorded" true.
      const endUnexpectedly = () => {
        if (heardSoFar()) {
          completeSession();
          return;
        }
        setError('voice.connectionFailed');
        cleanup();
        setIsListening(false);
      };

      ws.onerror = () => {
        // Said "Falling back to browser speech recognition" until 2026-08-25, and then did
        // not: this handler tears the socket down and stops. Nothing re-routes to the Web
        // Speech API, so the farmer waited for a recovery that was never coming. The caller
        // surfaces this string verbatim in a toast, so it has to describe what happened.
        if (stoppingRef.current) {
          completeSession();
          return;
        }
        endUnexpectedly();
      };

      ws.onclose = (event) => {
        // The close we asked for with CloseStream: Deepgram has sent everything it had.
        if (stoppingRef.current) {
          completeSession();
          return;
        }
        // Log the close FRAME, not just the fact of it. Deepgram states its reason there — an
        // unsupported encoding, a bad rate, an auth problem all arrive as different codes — and
        // without it every failure on a phone looks identical: "the connection dropped". Two days
        // of this bug were spent unable to tell a thrown MediaRecorder from a rejected container.
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
        endUnexpectedly();
      };
    } finally {
      if (startingSessionRef.current === session) {
        startingSessionRef.current = null;
        setIsStarting(false);
      }
    }
  }, [
    language,
    keytermLanguage,
    fetchToken,
    onInterimTranscript,
    stopListening,
    cleanup,
    completeSession,
    heardSoFar
  ]);

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
    interimRef.current = '';
    wordLangCountsRef.current = {};
    interimWordLangsRef.current = [];
  }, []);

  /**
   * End the session WITHOUT handing anything over — running or still starting.
   *
   * For the farmer switching language mid-recording: what they said so far went to the wrong
   * model, so it is not a note to parse, and the panel starts over in the new language.
   * (stopListening is the other ending: it flushes and hands over.) Cleanup starts a new session
   * number, so a start still awaiting the mic or the token abandons itself.
   */
  const cancelListening = useCallback(() => {
    cleanup();
    resetTranscript();
    setIsListening(false);
  }, [cleanup, resetTranscript]);

  return {
    isListening,
    isStarting,
    stoppedAtLimit,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript
  };
}
