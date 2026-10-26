/**
 * The chips under "Esto es lo que escuchamos" print what the parser resolved, in the page's
 * language. MEASURED 2026-10-25 against the live parser: it answers with the grower's wording in
 * `detected_systems` ("drip irrigation", "airblast") next to the catalogue code it resolved
 * (`irrigation_method: drip`, `application_method: air_blast`), and those systems printed as raw
 * English chips on a Spanish page, the spray one beside its own method chip.
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import es419 from '../../../i18n/lang/es-419.json';
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

const BASE = {
  description: '',
  // The chip row renders only when something was measured, as on every real reply.
  detected_amounts: [{ value: 3, unit: 'hours', category: 'time' }],
  detected_products: [],
  confidence: 90,
  activity_fields: {}
};

const renderPanel = () =>
  render(
    <Provider store={configureStore({ reducer: { userState: () => ({ user: { id: 1 } }) } })}>
      <ChakraProvider>
        <IntlProvider
          locale="es-419"
          messages={es419 as unknown as Record<string, string>}
          onError={() => undefined}>
          <VoiceEventCapture onEventDetected={vi.fn()} isActive cropType="walnut" />
        </IntlProvider>
      </ChakraProvider>
    </Provider>
  );

const hear = async (result: Record<string, unknown>) => {
  mocks.process = vi.fn(() => ({ unwrap: () => Promise.resolve({ ...BASE, ...result }) }));
  renderPanel();
  await act(async () => {
    mocks.hookCalls.at(-1)!.onTranscriptComplete(String(result.original_transcript), 'en');
  });
  await screen.findByText('Usar estos datos');
};

beforeEach(() => {
  mocks.hookCalls = [];
  mocks.start = vi.fn();
  window.localStorage.clear();
});

afterEach(() => window.localStorage.clear());

describe('a system the grower named reads as the method it resolved to', () => {
  it('irrigation: "drip irrigation" chips as the drip label', async () => {
    await hear({
      type: 'irrigation',
      original_transcript: 'Drip irrigation this morning, both blocks around 3 hours.',
      detected_systems: ['drip irrigation'],
      irrigation_method: 'drip'
    });
    expect(screen.getByText(es419['events.irrigationMethods.drip'])).toBeTruthy();
    expect(screen.queryByText('drip irrigation')).toBeNull();
  });

  it('spray: "airblast" is the method chip already, so it is not printed twice', async () => {
    await hear({
      type: 'fungicide',
      original_transcript: 'Sprayed copper on both blocks, airblast sprayer, 3 hours.',
      detected_systems: ['airblast'],
      application_method: 'air_blast'
    });
    expect(screen.getAllByText(es419['events.applicationMethods.airBlast'])).toHaveLength(1);
    expect(screen.queryByText('airblast')).toBeNull();
  });

  it('a system that names no resolved method stays as the grower said it', async () => {
    await hear({
      type: 'mowing',
      original_transcript: 'Mowed both blocks with the flail mower, 3 hours.',
      detected_systems: ['flail mower']
    });
    expect(screen.getByText('flail mower')).toBeTruthy();
  });

  it('two wordings of the resolved method print its label once', async () => {
    await hear({
      type: 'irrigation',
      original_transcript: 'Ran the drip, drip tape on both blocks, 3 hours.',
      detected_systems: ['drip irrigation', 'drip tape'],
      irrigation_method: 'drip'
    });
    expect(screen.getAllByText(es419['events.irrigationMethods.drip'])).toHaveLength(1);
  });

  it('wording that names a longer method than the one resolved stays as said', async () => {
    // "micro sprinkler" contains `sprinkler`; relabelling it would hide the parser's mismatch.
    await hear({
      type: 'irrigation',
      original_transcript: 'Micro sprinkler on both blocks, 3 hours.',
      detected_systems: ['micro sprinkler'],
      irrigation_method: 'sprinkler'
    });
    expect(screen.getByText('micro sprinkler')).toBeTruthy();
    expect(screen.queryByText(es419['events.irrigationMethods.sprinkler'])).toBeNull();
  });
});
