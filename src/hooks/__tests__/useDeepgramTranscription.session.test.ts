/**
 * A voice SESSION, end to end, against a scripted Deepgram.
 *
 * MEASURED 2026-09-10 through the running app, with a real English clip played into a fake
 * microphone: "Oh, [1.8s pause] we sprayed Entrust at six ounces per acre…" came back as "Oh,"
 * and nothing else. Recognition was fine. The hook ended the session on the FIRST UtteranceEnd —
 * which Deepgram sends for a pause, "even if it determines that speech is continuing after the
 * gap" — then tore the socket down on a fixed 500ms timer, before the resumed words were ever
 * finalised. "Oh," was three characters, the panel dropped it as too short, and the farmer was
 * back at "Start voice input" with no word said. Reported as "it does not recognise English".
 *
 * Until this file the hook had no behavioural test at all: the codec picker is a pure function
 * and `voiceMounted.test.ts` greps source text. The message sequences below are the ones the
 * reproduction recorded from Deepgram, replayed through a fake socket.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FLUSH_TIMEOUT_MS,
  NO_SPEECH_STOP_MS,
  UTTERANCE_END_MS,
  dominantSpokenLanguage,
  isEndOfDictation,
  useDeepgramTranscription
} from '../useDeepgramTranscription';

// ── Platform fakes ───────────────────────────────────────────────────────────────────────────

class FakeSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeSocket[] = [];

  readyState = FakeSocket.CONNECTING;
  sent: unknown[] = [];
  onopen: ((e: unknown) => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onclose: ((e: { code: number; reason: string; wasClean: boolean }) => void) | null = null;

  constructor(public url: string, public protocols?: string[]) {
    FakeSocket.instances.push(this);
  }

  send(data: unknown) {
    this.sent.push(data);
  }

  // A close WE initiate. The browser fires `close` later; the hook detaches its handlers before
  // calling this, which is exactly what the tests below check.
  close() {
    this.readyState = FakeSocket.CLOSED;
  }

  // ── what the server does ──
  open() {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.({});
  }

  receive(message: object) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  serverClose(code = 1000) {
    this.readyState = FakeSocket.CLOSED;
    this.onclose?.({ code, reason: '', wasClean: code === 1000 });
  }

  sentCloseStream() {
    return this.sent.some((m) => typeof m === 'string' && JSON.parse(m).type === 'CloseStream');
  }
}

class FakeRecorder extends EventTarget {
  static instances: FakeRecorder[] = [];
  static isTypeSupported = (type: string) => type === 'audio/webm;codecs=opus';

  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;

  constructor() {
    super();
    FakeRecorder.instances.push(this);
  }

  start() {
    this.state = 'recording';
  }

  // A timeslice elapsing: one chunk of recorded audio.
  emit(chunk: Blob) {
    this.ondataavailable?.({ data: chunk });
  }

  // Per the MediaRecorder spec: the buffered remainder arrives as one last `dataavailable`,
  // THEN `stop` fires — asynchronously.
  stop() {
    this.state = 'inactive';
    queueMicrotask(() => {
      this.ondataavailable?.({ data: new Blob(['last-chunk']) });
      this.dispatchEvent(new Event('stop'));
    });
  }
}

const track = { stop: vi.fn() };
const getUserMedia = vi.fn();

// ── Deepgram messages, in the shape the live endpoint sends them ───────────────────────────────

/**
 * A Results message. `langs` gives each word a `language` tag, as `language=multi` does — one
 * word per tag, the last ending at `end`.
 */
const results = (transcript: string, opts: { final: boolean; end?: number; langs?: string[] }) => {
  const end = opts.end;
  const words =
    end === undefined
      ? []
      : (opts.langs ?? [undefined]).map((language, i, all) => ({
          word: 'w',
          start: end - 0.3 * (all.length - i),
          end: end - 0.3 * (all.length - i - 1),
          ...(language ? { language } : {})
        }));
  return {
    type: 'Results',
    is_final: opts.final,
    channel: { alternatives: [{ transcript, words }] }
  };
};

const utteranceEnd = (lastWordEnd: number) => ({
  type: 'UtteranceEnd',
  last_word_end: lastWordEnd
});

const flushMicrotasks = () => act(async () => {});

async function startSession(
  onTranscriptComplete = vi.fn(),
  fetchToken = async () => 'tok',
  languages: { language: string; keytermLanguage?: string } = { language: 'en-US' }
) {
  const hook = renderHook(() =>
    useDeepgramTranscription({ ...languages, onTranscriptComplete, fetchToken })
  );
  await act(async () => {
    await hook.result.current.startListening();
  });
  const ws = FakeSocket.instances[FakeSocket.instances.length - 1];
  act(() => ws.open());
  const recorder = FakeRecorder.instances[FakeRecorder.instances.length - 1];
  return { ...hook, ws, recorder, onTranscriptComplete };
}

beforeEach(() => {
  FakeSocket.instances = [];
  FakeRecorder.instances = [];
  track.stop.mockClear();
  getUserMedia.mockReset();
  getUserMedia.mockResolvedValue({ getTracks: () => [track] });
  vi.stubGlobal('WebSocket', FakeSocket);
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── The reported bug ────────────────────────────────────────────────────────────────────────

describe('a pause is not the end of the note', () => {
  it('keeps listening when the farmer resumes after "Oh," — the 2026-09-10 reproduction', async () => {
    const { ws, recorder, result, onTranscriptComplete } = await startSession();

    // Exactly what Deepgram sent: "Oh," finalised, the resumed words as an interim, then the
    // UtteranceEnd for the gap AFTER "Oh," — which arrives with the farmer mid-sentence.
    act(() => ws.receive(results('Oh,', { final: true, end: 1.92 })));
    act(() => ws.receive(results('We sprayed and', { final: false, end: 4.1 })));
    act(() => ws.receive(utteranceEnd(1.92)));
    await flushMicrotasks();

    expect(ws.sentCloseStream(), 'the session was cut mid-sentence').toBe(false);
    expect(recorder.state).toBe('recording');
    expect(result.current.isListening).toBe(true);
    // The whole running text is on screen, not just the segment in progress.
    expect(`${result.current.transcript} ${result.current.interimTranscript}`).toBe(
      'Oh, We sprayed and'
    );

    // The real end of the note.
    act(() =>
      ws.receive(results('We sprayed Entrust at six ounces per acre.', { final: true, end: 7.4 }))
    );
    act(() => ws.receive(utteranceEnd(7.4)));
    await flushMicrotasks();

    expect(ws.sentCloseStream()).toBe(true);
    act(() => ws.serverClose());

    expect(onTranscriptComplete).toHaveBeenCalledTimes(1);
    expect(onTranscriptComplete).toHaveBeenCalledWith(
      'Oh, We sprayed Entrust at six ounces per acre.',
      null
    );
    expect(result.current.isListening).toBe(false);
  });

  it('does not end on the pause after "Oh," even before the resumed words arrive (Safari path)', async () => {
    // On the raw-linear16 transport the UtteranceEnd for the gap lands DURING the pause, with
    // no resumed word yet to compare timings with — "Oh," was the handoff 5 runs in 5.
    const { ws, recorder, onTranscriptComplete } = await startSession();
    act(() => ws.receive(results('Oh,', { final: true, end: 1.28 })));
    act(() => ws.receive(utteranceEnd(1.28)));
    await flushMicrotasks();

    expect(ws.sentCloseStream(), 'a throat-clear ended the note').toBe(false);
    expect(recorder.state).toBe('recording');

    act(() =>
      ws.receive(results('We irrigated block four for three hours.', { final: true, end: 6.2 }))
    );
    act(() => ws.receive(utteranceEnd(6.2)));
    await flushMicrotasks();
    act(() => ws.serverClose());
    expect(onTranscriptComplete).toHaveBeenCalledWith(
      'Oh, We irrigated block four for three hours.',
      null
    );
  });

  it('outlasts a pause longer than UTTERANCE_END_MS after "Okay."', async () => {
    // "Okay, [3.5s] sprayed kaolin clay…" — the measured case a longer threshold alone missed.
    const { ws, onTranscriptComplete } = await startSession();
    act(() => ws.receive(results('Okay.', { final: true, end: 1.44 })));
    act(() => ws.receive(utteranceEnd(1.44)));
    await flushMicrotasks();
    expect(ws.sentCloseStream()).toBe(false);

    act(() =>
      ws.receive(
        results('Sprayed kaolin clay on the east block this morning.', { final: true, end: 8 })
      )
    );
    act(() => ws.receive(utteranceEnd(8)));
    await flushMicrotasks();
    act(() => ws.serverClose());
    expect(onTranscriptComplete).toHaveBeenCalledWith(
      'Okay. Sprayed kaolin clay on the east block this morning.',
      null
    );
  });

  it('asks Deepgram for a dictation-length pause, not a breath', async () => {
    const { ws } = await startSession();
    expect(new URL(ws.url).searchParams.get('utterance_end_ms')).toBe(String(UTTERANCE_END_MS));
    expect(UTTERANCE_END_MS).toBeGreaterThanOrEqual(2500);
    expect(UTTERANCE_END_MS).toBeLessThanOrEqual(5000); // Deepgram's documented maximum
  });

  it('asks for digits without smart_format, which deleted words from finals', async () => {
    // MEASURED 2026-09-10: smart_format turned "…on the east block this morning, about forty
    // pounds per acre" into "…on the 40 pounds per acre" in the FINAL — the block gone from a
    // spray record, 3 runs in 3, keyterms on or off. `numerals` alone deleted nothing.
    const { ws } = await startSession();
    const params = new URL(ws.url).searchParams;
    expect(params.get('smart_format')).toBeNull();
    expect(params.get('numerals')).toBe('true');
    expect(params.get('punctuate')).toBe('true'); // smart_format used to imply it
  });

  it('does not run the browser noise filter over the speech', async () => {
    // Deepgram: noise suppression "clips the first words of utterances and disproportionately
    // affects short responses" — and "No" for streaming transcription.
    await startSession();
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: expect.objectContaining({ noiseSuppression: false })
    });
  });
});

// ── Stopping without losing the tail ────────────────────────────────────────────────────────

describe('stopping flushes, it does not cut', () => {
  it('sends the last buffered audio BEFORE CloseStream', async () => {
    const { ws, result } = await startSession();
    act(() => result.current.stopListening());
    await flushMicrotasks();

    const closeAt = ws.sent.findIndex(
      (m) => typeof m === 'string' && JSON.parse(m).type === 'CloseStream'
    );
    expect(closeAt).toBeGreaterThan(0);
    expect(ws.sent[closeAt - 1], 'CloseStream overtook the last chunk').toBeInstanceOf(Blob);
  });

  it('keeps a final that arrives well after CloseStream — the old code dropped it at 500ms', async () => {
    vi.useFakeTimers();
    const { ws, onTranscriptComplete } = await startSession();

    act(() => ws.receive(results('Sprayed Entrust on the north block', { final: true, end: 2.5 })));
    act(() => ws.receive(utteranceEnd(2.5))); // nothing heard after the gap yet: accepted
    await flushMicrotasks();
    expect(ws.sentCloseStream()).toBe(true);

    act(() => vi.advanceTimersByTime(1500));
    expect(onTranscriptComplete).not.toHaveBeenCalled();

    // Deepgram finalises the audio it still held, then closes the socket itself.
    act(() => ws.receive(results('at six ounces per acre', { final: true, end: 5.1 })));
    act(() => ws.serverClose());

    expect(onTranscriptComplete).toHaveBeenCalledWith(
      'Sprayed Entrust on the north block at six ounces per acre',
      null
    );
  });

  it('keeps the unfinalised tail when the stream closes on an interim', async () => {
    const { ws, result, onTranscriptComplete } = await startSession();
    act(() => ws.receive(results('Sprayed Entrust', { final: true, end: 1.5 })));
    act(() => ws.receive(results('on the north block', { final: false, end: 3.0 })));

    act(() => result.current.stopListening());
    await flushMicrotasks();
    act(() => ws.serverClose());

    expect(onTranscriptComplete).toHaveBeenCalledWith('Sprayed Entrust on the north block', null);
  });

  it('gives up waiting at the ceiling, with what was heard', async () => {
    vi.useFakeTimers();
    const { ws, result, onTranscriptComplete } = await startSession();
    act(() => ws.receive(results('Irrigated block four', { final: true, end: 2 })));

    act(() => result.current.stopListening());
    await flushMicrotasks();
    act(() => vi.advanceTimersByTime(FLUSH_TIMEOUT_MS)); // server never closes

    expect(onTranscriptComplete).toHaveBeenCalledWith('Irrigated block four', null);
    expect(result.current.isListening).toBe(false);
    expect(track.stop).toHaveBeenCalled();
  });

  it('hands over an EMPTY session too — the caller explains it, the hook never swallows it', async () => {
    const { ws, result, onTranscriptComplete } = await startSession();
    act(() => result.current.stopListening());
    await flushMicrotasks();
    act(() => ws.serverClose());
    expect(onTranscriptComplete).toHaveBeenCalledWith('', null);
  });

  it('does not report its own close as unexpected', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { ws, result } = await startSession();
    act(() => result.current.stopListening());
    await flushMicrotasks();
    act(() => ws.serverClose());

    // The browser's own `close` event, after our teardown, lands on no handler.
    expect(ws.onclose).toBeNull();
    expect(consoleError).not.toHaveBeenCalledWith(
      '[voice] Deepgram socket closed unexpectedly',
      expect.anything()
    );
  });
});

// ── What the farmer sees ─────────────────────────────────────────────────────────────────────

describe('display', () => {
  it('withdraws a guess when Deepgram finalises it as nothing', async () => {
    // An empty final used to `return` before the interim was cleared, so a withdrawn "Oh,"
    // stayed on screen as though it had been heard — for up to the 90-second cap.
    const { ws, result } = await startSession();
    act(() => ws.receive(results('Oh,', { final: false, end: 0.5 })));
    expect(result.current.interimTranscript).toBe('Oh,');

    act(() => ws.receive(results('', { final: true })));
    expect(result.current.interimTranscript).toBe('');
    expect(result.current.transcript).toBe('');
  });
});

// ── A session that hears nothing usable ──────────────────────────────────────────────────────

describe('no recognised speech', () => {
  it('ends after NO_SPEECH_STOP_MS instead of running to the 90-second cap', async () => {
    // English spoken into the Spanish model came back as EMPTY finals and never produced an
    // UtteranceEnd, so the session ran the full 90 seconds with nothing to show for it.
    vi.useFakeTimers();
    const { ws, result, onTranscriptComplete } = await startSession();
    act(() => ws.receive(results('', { final: true })));
    act(() => vi.advanceTimersByTime(NO_SPEECH_STOP_MS - 1));
    expect(ws.sentCloseStream()).toBe(false);

    act(() => vi.advanceTimersByTime(1));
    await flushMicrotasks();
    expect(ws.sentCloseStream()).toBe(true);
    act(() => ws.serverClose());
    expect(onTranscriptComplete).toHaveBeenCalledWith('', null);
    expect(result.current.isListening).toBe(false);
  });

  it('ends a lone "Okay." once nothing follows it', async () => {
    vi.useFakeTimers();
    const { ws, onTranscriptComplete } = await startSession();
    act(() => ws.receive(results('Okay.', { final: true, end: 1.44 })));
    act(() => ws.receive(utteranceEnd(1.44))); // declined: not a note yet
    act(() => vi.advanceTimersByTime(NO_SPEECH_STOP_MS));
    await flushMicrotasks();
    act(() => ws.serverClose());
    expect(onTranscriptComplete).toHaveBeenCalledWith('Okay.', null);
  });

  it('is not held off by the same interim repeated under noise', async () => {
    // Deepgram re-sends a pending interim while it waits to finalise; with a tractor idling,
    // endpointing may never fire and "Oh," keeps arriving with the SAME word timings. Only a new
    // word may restart the clock, or the repetition runs the session to the 90-second cap.
    vi.useFakeTimers();
    const { ws, onTranscriptComplete } = await startSession();
    for (let tick = 0; tick < NO_SPEECH_STOP_MS / 1000; tick += 1) {
      act(() => ws.receive(results('Oh,', { final: false, end: 0.9 })));
      act(() => vi.advanceTimersByTime(1000));
    }
    await flushMicrotasks();
    expect(ws.sentCloseStream()).toBe(true);
    act(() => ws.serverClose());
    expect(onTranscriptComplete).toHaveBeenCalledWith('Oh,', null);
  });

  it('never cuts someone who is still talking', async () => {
    vi.useFakeTimers();
    const { ws } = await startSession();
    for (let second = 1; second <= 25; second += 1) {
      act(() => vi.advanceTimersByTime(1000));
      act(() => ws.receive(results(`word ${second}`, { final: false, end: second })));
    }
    await flushMicrotasks();
    expect(ws.sentCloseStream()).toBe(false);
  });
});

// ── Failure paths ────────────────────────────────────────────────────────────────────────────

describe('when the socket ends on its own', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('reports a dropped connection only when nothing was heard', async () => {
    const { ws, result, onTranscriptComplete } = await startSession();
    act(() => ws.serverClose(1011));
    expect(result.current.error).toBe('voice.connectionFailed');
    expect(onTranscriptComplete).not.toHaveBeenCalled();
    expect(result.current.isListening).toBe(false);
  });

  it('keeps what WAS heard instead of discarding it', async () => {
    const { ws, result, onTranscriptComplete } = await startSession();
    act(() => ws.receive(results('Sprayed Entrust on the north block', { final: true, end: 2 })));
    act(() => ws.serverClose(1011));
    expect(onTranscriptComplete).toHaveBeenCalledWith('Sprayed Entrust on the north block', null);
    expect(result.current.error).toBeNull();
  });
});

// ── Before the socket is open ────────────────────────────────────────────────────────────────

/** Start a session whose token has NOT arrived yet; resolve it when the test says so. */
function startWithPendingToken(language = 'en-US') {
  let resolveToken: (token: string) => void = () => {};
  let rejectToken: (err: Error) => void = () => {};
  const fetchToken = vi.fn(
    () =>
      new Promise<string>((resolve, reject) => {
        resolveToken = resolve;
        rejectToken = reject;
      })
  );
  const onTranscriptComplete = vi.fn();
  const hook = renderHook(() =>
    useDeepgramTranscription({ language, onTranscriptComplete, fetchToken })
  );
  let starting: Promise<void> = Promise.resolve();
  act(() => {
    starting = hook.result.current.startListening();
  });
  return {
    ...hook,
    fetchToken,
    onTranscriptComplete,
    resolveToken: (token = 'tok') => resolveToken(token),
    rejectToken: () => rejectToken(new Error('token')),
    finished: () => starting
  };
}

describe('before the socket is open', () => {
  it('keeps what was said while the token was fetched — the lost "Aplicamos"', async () => {
    // MEASURED 2026-09-10: "Aplicamos azufre en el bloque norte…" arrived as "Azufre en el
    // bloque norte…". The mic was live 2.5-3.5s before the recorder started with the socket.
    const session = startWithPendingToken('es-419');
    await flushMicrotasks(); // microphone granted, token in flight

    const recorder = FakeRecorder.instances[0];
    expect(recorder.state, 'nothing is recorded until the socket opens').toBe('recording');
    const header = new Blob(['webm-header+Aplicamos']);
    act(() => recorder.emit(header));

    session.resolveToken();
    await act(async () => {
      await session.finished();
    });
    const ws = FakeSocket.instances[0];
    const duringHandshake = new Blob(['azufre']);
    act(() => recorder.emit(duringHandshake));
    expect(ws.sent, 'audio went out before the socket was open').toHaveLength(0);

    act(() => ws.open());
    expect(ws.sent, 'the pre-roll must go first, in order').toEqual([header, duringHandshake]);

    const live = new Blob(['en el bloque norte']);
    act(() => recorder.emit(live));
    expect(ws.sent[2]).toBe(live);
  });

  it('releases the recorder and the mic when the token cannot be fetched', async () => {
    const session = startWithPendingToken();
    await flushMicrotasks();
    session.rejectToken();
    await act(async () => {
      await session.finished();
    });

    expect(session.result.current.error).toBe('voice.tokenFailed');
    expect(FakeRecorder.instances[0].state).toBe('inactive');
    expect(track.stop).toHaveBeenCalled();
    expect(FakeSocket.instances).toHaveLength(0);
  });

  it('refuses before minting a key when the browser will not record', async () => {
    const refuse = vi.spyOn(FakeRecorder.prototype, 'start').mockImplementation(() => {
      throw new Error('NotSupportedError');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const session = startWithPendingToken();
    await act(async () => {
      await session.finished();
    });

    expect(session.result.current.error).toBe('voice.recorderUnsupported');
    expect(session.fetchToken).not.toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
    refuse.mockRestore();
  });
});

describe('cancelling — the farmer switched language mid-recording', () => {
  it('ends the session and hands NOTHING over', async () => {
    // What was said went to the wrong model; parsing it would put wrong-language guesses
    // into field values.
    const { ws, recorder, result, onTranscriptComplete } = await startSession();
    act(() => ws.receive(results('Aplica muso sufre', { final: true, end: 2 })));
    act(() => result.current.cancelListening());
    await flushMicrotasks();

    expect(onTranscriptComplete).not.toHaveBeenCalled();
    expect(ws.sentCloseStream(), 'a cancel is not a flush').toBe(false);
    expect(recorder.state).toBe('inactive');
    expect(track.stop).toHaveBeenCalled();
    expect(result.current.isListening).toBe(false);
    expect(result.current.transcript).toBe('');
  });

  it('lets the new-language session start while the cancelled one is still starting', async () => {
    // The panel auto-starts, so a switch often lands while the first start awaits its token.
    // A boolean "starting" flag would still be set by the cancelled start and would swallow the
    // restart — the farmer would tap Español and nothing would record.
    const pending: Array<(token: string) => void> = [];
    const fetchToken = vi.fn(() => new Promise<string>((resolve) => pending.push(resolve)));
    const { result } = renderHook(() =>
      useDeepgramTranscription({ language: 'en-US', onTranscriptComplete: vi.fn(), fetchToken })
    );

    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.startListening();
    });
    await flushMicrotasks(); // mic granted, token in flight
    expect(result.current.isStarting).toBe(true);

    act(() => result.current.cancelListening());
    let second: Promise<void> = Promise.resolve();
    act(() => {
      second = result.current.startListening(); // the restart, in the new language
    });
    await flushMicrotasks();
    expect(pending, 'the restart never asked for a token').toHaveLength(2);

    // The cancelled start gets its token late: it must not open a socket, nor clear the new
    // start's claim.
    pending[0]('stale');
    await act(async () => {
      await first;
    });
    expect(FakeSocket.instances).toHaveLength(0);
    expect(result.current.isStarting, 'the restart is still in flight').toBe(true);

    // The restart completes normally.
    pending[1]('fresh');
    await act(async () => {
      await second;
    });
    expect(FakeSocket.instances).toHaveLength(1);
    expect(result.current.isStarting).toBe(false);
  });
});

describe('closing the panel while voice is still starting', () => {
  it('opens no socket and releases the microphone', async () => {
    const session = startWithPendingToken();
    await flushMicrotasks(); // microphone granted, recorder running, token still in flight
    session.unmount();

    session.resolveToken();
    await act(async () => {
      await session.finished();
    });

    expect(FakeSocket.instances).toHaveLength(0);
    expect(FakeRecorder.instances[0].state).toBe('inactive');
    expect(track.stop).toHaveBeenCalled();
  });
});

// ── Which language was spoken (language=multi) ───────────────────────────────────────────────

describe('spoken language', () => {
  const multi = (keytermLanguage: string) => ({ language: 'multi', keytermLanguage });

  it('asks Deepgram to detect, keeping the app locale as the keyterm prior', async () => {
    const { ws } = await startSession(vi.fn(), async () => 'tok', multi('es-419'));
    const params = new URL(ws.url).searchParams;
    expect(params.get('language')).toBe('multi');
    // A Spanish-only term: the Spanish app's vocabulary is still boosted under detection.
    expect(params.getAll('keyterm')).toContain('riego por goteo');
  });

  it('reports Spanish spoken into the English app — the case pinning returned EMPTY', async () => {
    const { ws, result, onTranscriptComplete } = await startSession(
      vi.fn(),
      async () => 'tok',
      multi('en-US')
    );
    const es = (n: number) => Array(n).fill('es');
    act(() =>
      ws.receive(
        results('Aplicamos azufre en el bloque norte', { final: true, end: 2.5, langs: es(6) })
      )
    );
    // The tail is still an interim when the stream closes: its tags count too.
    act(() =>
      ws.receive(
        results('esta mañana, 5 libras por acre.', { final: false, end: 4.5, langs: es(6) })
      )
    );
    act(() => result.current.stopListening());
    await flushMicrotasks();
    act(() => ws.serverClose());

    expect(onTranscriptComplete).toHaveBeenCalledWith(
      'Aplicamos azufre en el bloque norte esta mañana, 5 libras por acre.',
      'es'
    );
  });

  it('flags words detected mostly outside English and Spanish', async () => {
    // MEASURED: heavily accented English came back tagged Italian 9 words in 11.
    const { ws, result, onTranscriptComplete } = await startSession(
      vi.fn(),
      async () => 'tok',
      multi('en-US')
    );
    act(() =>
      ws.receive(
        results('We appuie en sul forum de Nordblock, filme ponds per acre.', {
          final: true,
          end: 4,
          langs: ['en', 'it', 'it', 'it', 'it', 'it', 'it', 'it', 'it', 'it', 'nl']
        })
      )
    );
    act(() => result.current.stopListening());
    await flushMicrotasks();
    act(() => ws.serverClose());

    expect(onTranscriptComplete).toHaveBeenCalledWith(
      'We appuie en sul forum de Nordblock, filme ponds per acre.',
      'other'
    );
  });

  it('forgets the last session’s languages', async () => {
    const { ws, result, onTranscriptComplete } = await startSession(
      vi.fn(),
      async () => 'tok',
      multi('en-US')
    );
    act(() =>
      ws.receive(results('Regamos el bloque cuatro', { final: true, end: 2, langs: ['es', 'es'] }))
    );
    act(() => result.current.stopListening());
    await flushMicrotasks();
    act(() => ws.serverClose());

    await act(async () => {
      await result.current.startListening();
    });
    const second = FakeSocket.instances[FakeSocket.instances.length - 1];
    act(() => second.open());
    act(() =>
      second.receive(
        results('Irrigated block four for six hours', { final: true, end: 3, langs: ['en', 'en'] })
      )
    );
    act(() => result.current.stopListening());
    await flushMicrotasks();
    act(() => second.serverClose());

    expect(onTranscriptComplete).toHaveBeenLastCalledWith(
      'Irrigated block four for six hours',
      'en'
    );
  });
});

describe('dominantSpokenLanguage', () => {
  it('takes the majority of English and Spanish words, tolerating stray tags', () => {
    // A real Spanish sentence came back es:7 pt:2 en:1.
    expect(dominantSpokenLanguage({ es: 7, pt: 2, en: 1 })).toBe('es');
    expect(dominantSpokenLanguage({ en: 11 })).toBe('en');
  });

  it('calls it "other" when most words are in a language the app does not serve', () => {
    expect(dominantSpokenLanguage({ en: 1, it: 9, nl: 1 })).toBe('other');
  });

  it('reads regional tags by family', () => {
    expect(dominantSpokenLanguage({ 'es-419': 4, 'en-US': 1 })).toBe('es');
  });

  it('has no answer without tags or in a dead heat — the caller falls back to the app locale', () => {
    expect(dominantSpokenLanguage({})).toBeNull();
    expect(dominantSpokenLanguage({ en: 3, es: 3 })).toBeNull();
  });
});

// ── The decision itself ─────────────────────────────────────────────────────────────────────

describe('isEndOfDictation', () => {
  it('is a pause, not an end, when a word was heard after the gap', () => {
    expect(isEndOfDictation(1.92, 4.1, 'We sprayed and')).toBe(false);
  });

  it('is the end when nothing was heard after the gap', () => {
    expect(isEndOfDictation(7.4, 7.4, '')).toBe(true);
    // Word timings shift a little between an interim and its final; that is not new speech.
    expect(isEndOfDictation(7.4, 7.5, '')).toBe(true);
  });

  it('falls back to the interim when Deepgram gives no usable timing (last_word_end -1)', () => {
    expect(isEndOfDictation(-1, 0, 'still talking')).toBe(false);
    expect(isEndOfDictation(-1, 0, '')).toBe(true);
    expect(isEndOfDictation(undefined, 0, '')).toBe(true);
  });
});
