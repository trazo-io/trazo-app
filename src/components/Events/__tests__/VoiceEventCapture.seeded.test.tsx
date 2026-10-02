/**
 * A SEEDED parse: text the farmer pasted rather than spoke.
 *
 * The panel exists to turn speech into a suggestion. Handing it typed text reuses the whole
 * extraction: the same closed enums, the same catalogue matchers, the same null-rather-than-guess
 * prompt, and changes exactly one thing that matters: the person who said the words is no longer
 * the person who will confirm them.
 *
 * That matters because every echo gate downstream asks "do these words appear in the transcript",
 * and voiceDataMapper.ts:1199 states the reason in its own comment: if the words are absent the
 * answer came from somewhere other than the FARMER. Those gates were built against a MODEL
 * inventing a value. They cannot see a SENDER who is wrong. So a seeded result travels with
 * `seeded: true`, and the wizard holds it instead of merging it.
 *
 * These tests pin the two halves the panel owns: it must never open a mic over text it was given,
 * and it must label what it emits.
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import enUS from '../../../i18n/lang/en-US.json';
import SpeechRecognition from 'react-speech-recognition';
import { VoiceEventCapture } from '../VoiceEventCapture';

type HookOptions = { language: string; onTranscriptComplete: (t: string, l: unknown) => void };

const mocks = vi.hoisted(() => ({
  hookCalls: [] as HookOptions[],
  start: null as unknown as ReturnType<typeof vi.fn>,
  process: null as unknown as ReturnType<typeof vi.fn>
}));

vi.mock('store/api/carbonApi', () => ({
  useGetVoiceConfigQuery: () => ({
    data: { provider: 'deepgram', language_mode: 'locale' },
    isLoading: false
  }),
  useProcessVoiceEventWithAIMutation: () => [mocks.process, { isLoading: false }],
  useGetDeepgramTokenMutation: () => [vi.fn()]
}));

vi.mock('react-speech-recognition', () => ({
  default: { startListening: vi.fn(), stopListening: vi.fn(), abortListening: vi.fn() },
  useSpeechRecognition: () => ({
    transcript: '',
    listening: false,
    resetTranscript: vi.fn(),
    browserSupportsSpeechRecognition: true,
    isMicrophoneAvailable: true
  })
}));

vi.mock('hooks/useDeepgramTranscription', async (importOriginal) => {
  const actual = await importOriginal<typeof import('hooks/useDeepgramTranscription')>();
  return {
    ...actual,
    useDeepgramTranscription: (options: HookOptions) => {
      mocks.hookCalls.push(options);
      return {
        isListening: false,
        isStarting: false,
        stoppedAtLimit: false,
        transcript: '',
        interimTranscript: '',
        error: null,
        startListening: mocks.start,
        stopListening: vi.fn(),
        cancelListening: vi.fn(),
        resetTranscript: vi.fn()
      };
    }
  };
});

const PARSE_RESULT = {
  type: 'irrigation',
  description: 'Ran drip on block 4',
  detected_amounts: [],
  detected_products: [],
  detected_systems: [],
  confidence: 90,
  activity_fields: {},
  original_transcript: 'regamos el bloque 4 por goteo'
};

const NOTE = 'regamos el bloque 4 por goteo';

const renderPanel = (props: Record<string, unknown> = {}) => {
  const onEventDetected = vi.fn();
  const view = render(
    <Provider store={configureStore({ reducer: { userState: () => ({ user: { id: 1 } }) } })}>
      <ChakraProvider>
        <IntlProvider
          locale="en-US"
          messages={enUS as unknown as Record<string, string>}
          onError={() => undefined}>
          <VoiceEventCapture
            onEventDetected={onEventDetected}
            isActive
            cropType="walnut"
            autoStart
            {...props}
          />
        </IntlProvider>
      </ChakraProvider>
    </Provider>
  );
  return { ...view, onEventDetected };
};

beforeEach(() => {
  mocks.hookCalls = [];
  mocks.start = vi.fn();
  mocks.process = vi.fn(() => ({ unwrap: () => Promise.resolve(PARSE_RESULT) }));
  vi.mocked(SpeechRecognition.startListening).mockClear();
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('a pasted note is parsed, never recorded over', () => {
  it('never opens a mic, even with autoStart set the way the wizard sets it', async () => {
    renderPanel({ seedTranscript: NOTE });

    await waitFor(() => expect(mocks.process).toHaveBeenCalledTimes(1));
    // The autoStart timer is 300ms; give it room to misbehave before asserting it did not.
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(mocks.start).not.toHaveBeenCalled();
    expect(vi.mocked(SpeechRecognition.startListening)).not.toHaveBeenCalled();
  });

  it('sends the pasted words to the same extraction the mic uses', async () => {
    renderPanel({ seedTranscript: NOTE });

    await waitFor(() => expect(mocks.process).toHaveBeenCalledTimes(1));
    expect(mocks.process.mock.calls[0][0]).toMatchObject({ transcript: NOTE, crop_type: 'walnut' });
  });

  it('parses once per note, not once per render', async () => {
    const { rerender, ...rest } = renderPanel({ seedTranscript: NOTE });
    await waitFor(() => expect(mocks.process).toHaveBeenCalledTimes(1));

    rerender(
      <Provider store={configureStore({ reducer: { userState: () => ({ user: { id: 1 } }) } })}>
        <ChakraProvider>
          <IntlProvider
            locale="en-US"
            messages={enUS as unknown as Record<string, string>}
            onError={() => undefined}>
            <VoiceEventCapture
              onEventDetected={rest.onEventDetected}
              isActive
              cropType="walnut"
              autoStart
              seedTranscript={NOTE}
            />
          </IntlProvider>
        </ChakraProvider>
      </Provider>
    );

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mocks.process).toHaveBeenCalledTimes(1);
  });

  it('quotes the pasted note back, so the farmer confirms against words they can see', async () => {
    renderPanel({ seedTranscript: NOTE });
    await waitFor(() => expect(screen.getByText(`“${NOTE}”`)).toBeInTheDocument());
  });

  it('labels what it emits `seeded`, which is what makes the wizard hold it', async () => {
    const { onEventDetected } = renderPanel({ seedTranscript: NOTE });

    await waitFor(() => expect(mocks.process).toHaveBeenCalledTimes(1));
    const useThese = await screen.findByRole('button', { name: 'Use these details' });
    fireEvent.click(useThese);

    expect(onEventDetected).toHaveBeenCalledTimes(1);
    expect(onEventDetected.mock.calls[0][0]).toMatchObject({ seeded: true });
  });

  it('never opens a mic from "Try again" either: the retry is a different note', async () => {
    const onClose = vi.fn();
    renderPanel({ seedTranscript: NOTE, onClose });

    await waitFor(() => expect(mocks.process).toHaveBeenCalledTimes(1));
    // The label itself must not promise a recording.
    const retry = await screen.findByRole('button', { name: 'Paste a different note' });
    fireEvent.click(retry);

    expect(mocks.start).not.toHaveBeenCalled();
    expect(vi.mocked(SpeechRecognition.startListening)).not.toHaveBeenCalled();
    // Closing is what clears the seed in the parent, so the paste box comes back empty
    // instead of re-parsing the note that was just refused.
    expect(onClose).toHaveBeenCalled();
    // And it must not spend a second call answering the identical question.
    expect(mocks.process).toHaveBeenCalledTimes(1);
  });

  it("does not offer to publish a pasted note as the farmer's own field notes", async () => {
    renderPanel({ seedTranscript: NOTE });
    await waitFor(() => expect(mocks.process).toHaveBeenCalledTimes(1));
    await screen.findByRole('button', { name: 'Use these details' });

    // `observation` reaches the anonymous buyer page in quotation marks under "Farmer's Field
    // Notes". On a pasted note those are a crew member's words, unredacted, and the grower
    // cannot consent on their behalf, so the tick is withheld, not relabelled.
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('DOES offer it on a spoken parse: the farmer owns their own words', async () => {
    renderPanel();
    const onComplete = mocks.hookCalls[mocks.hookCalls.length - 1].onTranscriptComplete;
    onComplete(NOTE, null);

    await waitFor(() => expect(mocks.process).toHaveBeenCalledTimes(1));
    await screen.findByRole('button', { name: 'Use these details' });
    expect(screen.queryByRole('checkbox')).not.toBeNull();
  });

  it('does NOT label a spoken parse seeded: the spoken path must keep merging', async () => {
    const { onEventDetected } = renderPanel();

    // No seed, so drive the panel the way speech does: hand the hook a completed transcript.
    const onComplete = mocks.hookCalls[mocks.hookCalls.length - 1].onTranscriptComplete;
    onComplete(NOTE, null);

    await waitFor(() => expect(mocks.process).toHaveBeenCalledTimes(1));
    const useThese = await screen.findByRole('button', { name: 'Use these details' });
    fireEvent.click(useThese);

    expect(onEventDetected.mock.calls[0][0]).toMatchObject({ seeded: false });
  });
});

describe('a crew note is parsed in its own language and never by the local fallback (audit T29)', () => {
  it('sends the note language, not the app language', async () => {
    renderPanel({ seedTranscript: NOTE, seedLanguage: 'es-419', seedNoteId: 'note-uuid' });
    await waitFor(() => expect(mocks.process).toHaveBeenCalled());
    const body = (mocks.process.mock.calls[0] as any[])[0];
    expect(body.language).toBe('es-419');
    // The server keeps its own reading of the note (review of back #88).
    expect(body.field_note).toBe('note-uuid');
  });

  it('offers nothing when the parse fails, rather than reading the note with local keywords', async () => {
    mocks.process = vi.fn(() => ({ unwrap: () => Promise.reject(new Error('down')) }));
    renderPanel({ seedTranscript: 'sprayed 2 gallons of copper on block 4' });
    await waitFor(() => expect(screen.queryByTestId('voice-manual-review')).not.toBeNull());
  });

  it('says a negated message needs a person', async () => {
    mocks.process = vi.fn(() => ({
      unwrap: () =>
        Promise.resolve({
          ...PARSE_RESULT,
          manual_review: true,
          negation: 'all',
          detected_amounts: []
        })
    }));
    renderPanel({ seedTranscript: 'no apliqué nada hoy', seedLanguage: 'es-419' });
    await waitFor(() => expect(screen.queryByTestId('voice-manual-review')).not.toBeNull());
  });
});
