/**
 * The voice "add what I said to my field notes" tick says who reads the notes (Run 8b, 8b-04).
 *
 * Its help line says field notes are published on the buyer page word for word. That is true
 * for a harvest or an irrigation, and false for an equipment cleanout (EM) or a transport (TP):
 * the backend withholds those production subtypes from every public serializer, so their note
 * reaches no buyer page. Voice maps "equipment" to EM and "transport" to TP.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import enUS from '../../../i18n/lang/en-US.json';
import { VoiceEventCapture } from '../VoiceEventCapture';

type HookOptions = { language: string; onTranscriptComplete: (t: string, l: unknown) => void };

const mocks = vi.hoisted(() => ({
  hookCalls: [] as HookOptions[],
  parseType: 'harvest',
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
        startListening: vi.fn(),
        stopListening: vi.fn(),
        cancelListening: vi.fn(),
        resetTranscript: vi.fn()
      };
    }
  };
});

const SAID = 'we cleaned out the huller line this morning before the organic run';
const m = enUS as unknown as Record<string, string>;

const speak = async (parseType: string) => {
  mocks.parseType = parseType;
  render(
    <Provider store={configureStore({ reducer: { userState: () => ({ user: { id: 1 } }) } })}>
      <ChakraProvider>
        <IntlProvider locale="en-US" messages={m} onError={() => undefined}>
          <VoiceEventCapture onEventDetected={vi.fn()} isActive cropType="walnut" />
        </IntlProvider>
      </ChakraProvider>
    </Provider>
  );
  act(() => mocks.hookCalls[mocks.hookCalls.length - 1].onTranscriptComplete(SAID, null));
  await waitFor(() => expect(screen.getByText(m['voice.notesOptIn.label'])).toBeTruthy());
};

beforeEach(() => {
  mocks.hookCalls = [];
  mocks.process = vi.fn(() => ({
    unwrap: () =>
      Promise.resolve({
        type: mocks.parseType,
        description: SAID,
        detected_amounts: [],
        detected_products: [],
        detected_systems: [],
        confidence: 90,
        activity_fields: {},
        original_transcript: SAID
      })
  }));
  window.localStorage.clear();
});

describe('voice notes opt-in: the help line matches the record audience', () => {
  for (const type of ['equipment', 'transport']) {
    it(`${type}: never says the notes are published on the buyer page`, async () => {
      await speak(type);
      expect(screen.queryByText(m['voice.notesOptIn.help'])).toBeNull();
      expect(screen.getByText(m['voice.notesOptIn.helpCertifierOnly'])).toBeTruthy();
    });
  }

  it('harvest: keeps the buyer-page warning', async () => {
    await speak('harvest');
    expect(screen.getByText(m['voice.notesOptIn.help'])).toBeTruthy();
    expect(screen.queryByText(m['voice.notesOptIn.helpCertifierOnly'])).toBeNull();
  });
});
