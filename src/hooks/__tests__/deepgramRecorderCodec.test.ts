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
import { pickRecorderMimeType, shouldUseRawPcm } from '../useDeepgramTranscription';

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

describe('shouldUseRawPcm', () => {
  // MEASURED 2026-09-01, the second failure on the same iPhone: with the codec picker in place
  // Safari recorded `audio/mp4` and the socket STILL closed — Deepgram's live endpoint does not
  // take Safari's fragmented-MP4 chunks. Containers are the problem, so Safari stops using one.
  it('keeps MediaRecorder where Opus works (Chrome, Android)', () => {
    expect(shouldUseRawPcm('audio/webm;codecs=opus')).toBe(false);
    expect(shouldUseRawPcm('audio/webm')).toBe(false);
    expect(shouldUseRawPcm('audio/ogg;codecs=opus')).toBe(false);
  });

  it('switches Safari to raw PCM rather than gambling on its container', () => {
    expect(shouldUseRawPcm('audio/mp4')).toBe(true);
    expect(shouldUseRawPcm('audio/mp4;codecs=mp4a.40.2')).toBe(true);
  });

  it('treats an unnameable platform default as raw PCM too', () => {
    // `''` means "MediaRecorder exists but named no supported type". Sending whatever it happens
    // to produce is the gamble this path exists to avoid.
    expect(shouldUseRawPcm('')).toBe(true);
    expect(shouldUseRawPcm(null)).toBe(true);
  });
});
