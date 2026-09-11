/**
 * The voice panel's "Speak in: English | Español" switch.
 *
 * Recognition listens in ONE language. Detecting it instead cost accuracy — MEASURED 2026-09-10
 * in the real app, Deepgram's `multi` dropped the block from Spanish notes 5 runs in 5 — but the
 * app a farmer reads and the language they speak are different facts: Spanish spoken into the
 * English model comes back EMPTY. So the farmer says which, once, and it is remembered.
 *
 * These tests mount the real panel with the transport mocked, and read what it asks the
 * transcription hook for — the language is only fixed if the REQUEST carries it.
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import SpeechRecognition from 'react-speech-recognition';
import { VoiceEventCapture } from '../VoiceEventCapture';

type HookOptions = {
  language: string;
  keytermLanguage?: string;
  onTranscriptComplete: (text: string, spokenLanguage: unknown) => void;
};

const mocks = vi.hoisted(() => ({
  voiceConfig: { provider: 'deepgram', language_mode: 'locale' } as Record<string, string>,
  hookCalls: [] as HookOptions[],
  hookState: { isListening: false, isStarting: false },
  webListening: false,
  languageAtStart: [] as string[],
  start: null as unknown as ReturnType<typeof vi.fn>,
  cancel: null as unknown as ReturnType<typeof vi.fn>,
  process: null as unknown as ReturnType<typeof vi.fn>
}));

vi.mock('store/api/carbonApi', () => ({
  useGetVoiceConfigQuery: () => ({ data: mocks.voiceConfig, isLoading: false }),
  useProcessVoiceEventWithAIMutation: () => [mocks.process, { isLoading: false }],
  useGetDeepgramTokenMutation: () => [vi.fn()]
}));

vi.mock('react-speech-recognition', () => ({
  default: { startListening: vi.fn(), stopListening: vi.fn(), abortListening: vi.fn() },
  useSpeechRecognition: () => ({
    transcript: '',
    listening: mocks.webListening,
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
        isListening: mocks.hookState.isListening,
        isStarting: mocks.hookState.isStarting,
        stoppedAtLimit: false,
        transcript: '',
        interimTranscript: '',
        error: null,
        startListening: mocks.start,
        stopListening: vi.fn(),
        cancelListening: mocks.cancel,
        resetTranscript: vi.fn()
      };
    }
  };
});

const lastHookCall = () => mocks.hookCalls[mocks.hookCalls.length - 1];

const renderPanel = ({ locale = 'en-US', userId = 42 } = {}) =>
  render(
    <Provider store={configureStore({ reducer: { userState: () => ({ user: { id: userId } }) } })}>
      <ChakraProvider>
        <IntlProvider
          locale={locale}
          messages={(locale === 'es-419' ? es419 : enUS) as unknown as Record<string, string>}
          onError={() => undefined}>
          <VoiceEventCapture onEventDetected={vi.fn()} isActive cropType="walnut" />
        </IntlProvider>
      </ChakraProvider>
    </Provider>
  );

beforeEach(() => {
  mocks.voiceConfig = { provider: 'deepgram', language_mode: 'locale' };
  mocks.hookCalls = [];
  mocks.hookState = { isListening: false, isStarting: false };
  mocks.webListening = false;
  vi.mocked(SpeechRecognition.startListening).mockClear();
  vi.mocked(SpeechRecognition.abortListening).mockClear();
  mocks.languageAtStart = [];
  mocks.start = vi.fn(async () => {
    mocks.languageAtStart.push(lastHookCall().language);
  });
  mocks.cancel = vi.fn();
  mocks.process = vi.fn(() => ({ unwrap: () => new Promise(() => undefined) }));
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('the language voice listens in', () => {
  it('is the app language until the farmer picks another', () => {
    renderPanel();
    expect(lastHookCall().language).toBe('en-US');
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('is Spanish — recognition AND keyterms — once Español is picked in the English app', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Español' }));

    expect(lastHookCall().language).toBe('es-419');
    expect(lastHookCall().keytermLanguage).toBe('es-419');
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('is remembered for the same person on the next visit', () => {
    const first = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Español' }));
    first.unmount();

    renderPanel();
    expect(lastHookCall().language).toBe('es-419');
  });

  it('is remembered per person — a shared crew tablet', () => {
    const first = renderPanel({ userId: 7 });
    fireEvent.click(screen.getByRole('button', { name: 'Español' }));
    first.unmount();

    renderPanel({ userId: 42 });
    expect(lastHookCall().language).toBe('en-US');
  });

  it('is read as the language of the words when they are parsed', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Español' }));
    act(() =>
      lastHookCall().onTranscriptComplete(
        'Aplicamos azufre en el bloque norte esta mañana, 5 libras por acre.',
        null
      )
    );
    // Pinned recognition tags no languages — the parser still has to be told Spanish, or it
    // reads the sentence with the English prompt and loses mappings like "nebulizadora".
    // (The panel shows a processing stage for 300ms before it calls the parser.)
    await waitFor(() =>
      expect(mocks.process).toHaveBeenCalledWith(expect.objectContaining({ language: 'es-419' }))
    );
  });
});

describe('switching mid-recording', () => {
  it('starts over in the new language, discarding what the wrong model heard', () => {
    mocks.hookState.isListening = true;
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Español' }));

    expect(mocks.cancel).toHaveBeenCalledTimes(1);
    expect(mocks.start).toHaveBeenCalledTimes(1);
    // Restarted AFTER the hook re-rendered with Spanish — not with the language it was leaving.
    expect(mocks.languageAtStart).toEqual(['es-419']);
  });

  it('restarts a recording that was still connecting, too', () => {
    mocks.hookState.isStarting = true;
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Español' }));
    expect(mocks.cancel).toHaveBeenCalledTimes(1);
    expect(mocks.languageAtStart).toEqual(['es-419']);
  });

  it('does not start recording when nothing was recording', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Español' }));
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
  });
});

describe('the browser fallback (Web Speech)', () => {
  it('switches the browser recogniser too, restarting it in the new language', () => {
    mocks.voiceConfig = { provider: 'web_speech_api' };
    mocks.webListening = true;
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Español' }));

    expect(SpeechRecognition.abortListening).toHaveBeenCalledTimes(1);
    // Chrome's recogniser has no 419 region — the Spanish it is given is es-US.
    expect(SpeechRecognition.startListening).toHaveBeenLastCalledWith({
      continuous: false,
      language: 'es-US'
    });
  });
});

describe('when nothing was heard', () => {
  it('names the language it listened for and points at the switch', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Español' }));
    act(() => lastHookCall().onTranscriptComplete('', null));
    expect(
      screen.getByText(/didn't catch any words in Spanish.*switch it above/)
    ).toBeInTheDocument();
  });

  it('says it in the app language, naming the language in that language', () => {
    renderPanel({ locale: 'es-419' });
    act(() => lastHookCall().onTranscriptComplete('', null));
    expect(screen.getByText(/ninguna palabra en español.*cámbialo arriba/)).toBeInTheDocument();
  });
});

describe('when the server has recognition detect the language', () => {
  it('shows no switch and asks Deepgram to detect', () => {
    mocks.voiceConfig = { provider: 'deepgram', language_mode: 'multi' };
    renderPanel();
    expect(screen.queryByRole('button', { name: 'Español' })).toBeNull();
    expect(lastHookCall().language).toBe('multi');
    // The app language stays the keyterm prior.
    expect(lastHookCall().keytermLanguage).toBe('en-US');
  });
});
