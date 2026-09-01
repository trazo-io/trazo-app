/**
 * Which audio container the recorder asks for.
 *
 * MEASURED 2026-09-01 on an iPhone against app.trazo.io. The picker asked for
 * `audio/webm;codecs=opus`, found it unsupported, and fell back to `audio/webm` — which iOS
 * Safari also does not support. `new MediaRecorder(stream, { mimeType: 'audio/webm' })` throws
 * NotSupportedError there, and it threw INSIDE `ws.onopen`, so the socket stayed open with
 * nothing sent until Deepgram closed it for silence. The farmer granted the microphone and was
 * told "the connection to the transcription service dropped" — the one thing that had not failed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickRecorderMimeType } from '../useDeepgramTranscription';

const install = (supported: string[] | null) => {
  if (supported === null) {
    // @ts-expect-error deliberately removing the global
    delete globalThis.MediaRecorder;
    return;
  }
  // @ts-expect-error minimal stand-in for the platform API
  globalThis.MediaRecorder = { isTypeSupported: (t: string) => supported.includes(t) };
};

afterEach(() => {
  // @ts-expect-error cleanup
  delete globalThis.MediaRecorder;
  vi.restoreAllMocks();
});

describe('pickRecorderMimeType', () => {
  it('prefers opus-in-webm where it exists (Chrome, Android)', () => {
    install(['audio/webm;codecs=opus', 'audio/webm']);
    expect(pickRecorderMimeType()).toBe('audio/webm;codecs=opus');
  });

  it('falls through to mp4 on iOS Safari instead of asserting webm', () => {
    // The exact platform shape that produced the bug: no webm at all, mp4 available.
    install(['audio/mp4', 'audio/mp4;codecs=mp4a.40.2']);
    expect(pickRecorderMimeType()).toBe('audio/mp4;codecs=mp4a.40.2');
  });

  it('asks for the platform default rather than a format nobody supports', () => {
    // `''` means "construct MediaRecorder with no mimeType option". The old code would have
    // handed the constructor 'audio/webm' here and thrown.
    install([]);
    expect(pickRecorderMimeType()).toBe('');
  });

  it('reports null only when the browser cannot record at all', () => {
    install(null);
    expect(pickRecorderMimeType()).toBeNull();
  });
});
